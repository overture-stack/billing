/**
 *
 * Copyright (c) 2017 The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public License v3.0.
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */
import { BillingApi } from './service/billing';
import { Mailer } from './service/email';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as winston from 'winston';
import Big from 'big.js';


/*
Configure logger
 */
const tsFormat = () => ( new Date() ).toLocaleDateString() + '  ' + ( new Date() ).toLocaleTimeString();

let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':tsFormat,colorize: true})
    ]
});

logger.info("*** Starting Invoice Reporting ***");

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EMAIL_MODE = "email";
const DICOUNT_TEXT = "discount";

/**
 * Argument Parsing for Config Path
 */
let args = process.argv;
if (args.length < 3) {
  logger.error('Missing arguments');
  process.exit(1);
}
let configPath = args[2];
let config = JSON.parse(fs.readFileSync(configPath).toString());


/**
 * Extra params for specific months/projects
 */
let reportMonth : number;
let reportYear : number;
let month: string;
if (args.length >= 4) {
  let dateArgs = args[3].split('-');
  reportMonth = Number(dateArgs[1]);
  reportYear = Number(dateArgs[0]);
  month = MONTH_NAMES[reportMonth - 1];
} else {
  let monthIndex = (new Date()).getMonth();
  reportMonth = monthIndex - 1 < 0 ? 11 : monthIndex-1;
  reportYear = monthIndex - 1 < 0 ? (new Date()).getFullYear() - 1 : (new Date()).getFullYear();
  month = MONTH_NAMES[reportMonth];
}
var allProjects = true;
var projectList : Array<string>;
if(args.length === 5) {
  if (args[4] !== 'ALL') {
    allProjects = false;
    projectList = args[4].split(",")
  }
}

// default mode is to generate a csv
let mode = config['mode'] || 'csv';

logger.info("Reporting mode: %s",mode);
logger.info("Reporting for the month of: %s", month + " " + reportYear);

// used only if mode is csv
let aggregatedInvoices = [];

/**
 * Generate reports from billing api and email them to billing users
 */
let billing = new BillingApi(config['billingConfig'], logger);
// generate invoices for each project
let invoiceGeneration = new Promise((resolve, reject) => {
  let projectsPromise = billing.login().then(() => billing.projects());
  projectsPromise.then(results => {
    let projects : any;
    projects = _.filter(results, r => (allProjects || projectList.indexOf(r.project_name) >= 0) && typeof  r.extra.email !== 'undefined');
    logger.info("Target list of projects:%j", projects);
    // get last invoice number
    billing.getLastInvoiceNumber().then((lastInvoiceNumber) => {
        if(lastInvoiceNumber.indexOf("error") >=0) throw Error(lastInvoiceNumber);
        projects = combineProjectUsers(projects);
        setInvoiceNumbersForProject(projects, lastInvoiceNumber);
        logger.info("Invoice number of last generated invoice:%s", lastInvoiceNumber);
        let pricePromise = billing.price(reportYear, reportMonth, projects);
        pricePromise.then(perProjectPrices => {
          let totalProjectCount = projects.length;
          let invoicesProcessed = 0;
          logger.info("Retrieved price information for each project");
          projects.map(project => billing.monthlyReport(project, reportYear, reportMonth).then(report => {
            logger.info(`Retrieved data for project ${project.project_name}`);
            report.month = month;
            report.year = reportYear;
            report.project_name = project.project_name;
            let price = perProjectPrices[project.project_name];
            if(typeof price == 'undefined') price = perProjectPrices[0];// for backward compatiblity
						// add discount if there is a difference in total cost vs itemQty * itemRate
						// this is applicable for scenarios such as when collab offers discounts for usage that was
						// during the maintenance window
						addDiscountsToReflectActualUsage(price, report);
						price["discount"] = price["discount"] ? (price["discount"]*100).toFixed(4) : 0.0000;
            if(mode != EMAIL_MODE){
                  logger.info(`Generating Invoice data for invoice: ${ project.invoiceNumber } for project: ${ project.project_name }`);
                  generateInvoiceDataJSON(project.emails,project.project_name, project.invoiceNumber,report, price, aggregatedInvoices);
                  invoicesProcessed++;
                  if(invoicesProcessed == totalProjectCount) resolve();
              } else {
                  logger.info(`Sending Invoice: ${ project.invoiceNumber } for project: ${ project.project_name }`);
                  billing.sendInvoice(project.emails, report, price, project.invoiceNumber).then(() => {
                      invoicesProcessed++;
                      if (invoicesProcessed == totalProjectCount) resolve();
                  }).catch(err => {
                      logger.error(`Error while processing Inovice for project: ${project.project_name}`, err);
                      // we increment the counter regardless of an error; this makes sure that promise is always resolved
                      // and summary generation happens
                      invoicesProcessed++;
                      if (invoicesProcessed == totalProjectCount) resolve();
                  });
              }
          }).catch(err =>{
            logger.error("Error while processing Inovice:", err);
            invoicesProcessed++;
          }));
        });
     });
  });
});

// wait till all invoices are generated and then generate the summary .csv file
invoiceGeneration.then(() => {

    if(mode != EMAIL_MODE) {
        logger.info("CSV Mode. Generating Summary CSV file...");
        generatePreInvoiceSummaryCSV(aggregatedInvoices).then(() =>logger.info("Finished Processing Invoices."));
    } else {
        logger.info("Email Mode. Generating Summary CSV file that will be emailed...");
        billing.generateInvoicesSummary(month,config['outputDir']).then(() => {
            let mailer = new Mailer({
                emailConfig: config['emailConfig'],
                smtpConfig: config['smtpConfig'],
                emailRecipients: config['emailRecipients']
            }, null, logger);
            logger.info("Emailing summary csv file...");
            mailer.sendSummaryCSVEmail( config['outputDir'] + month + ".csv", month, reportYear);
            logger.info("Finished Processing Invoices.");
        })
    }
});

/*
    Helper functions
 */
function combineProjectUsers(projects:Array<any>): Array<any> {
    let output = {};
    projects.map(project => {
        if (output.hasOwnProperty(project.project_id)) {
            if (project.extra.hasOwnProperty("email"))
                output[project.project_id].emails.push(project.extra.email);
        } else {
            output[project.project_id] = {
                "project_id": project.project_id,
                "project_name": project.project_name,
                "user_id": project.user_id,
                "emails": project.extra.hasOwnProperty("email") ? [project.extra.email] : []
            };
        }

    });// project iteration ends here
    return _.values(output);
}

function buildInvoiceNumber(prefix:string, projectSequence:number, maxChars:number) : string {
  let numCharsInSequence = projectSequence.toString().length;
  let numLeadingZeros = maxChars - numCharsInSequence - prefix.length;

  // Check for errors
  if (numLeadingZeros < 0){
    // how do you handle the case where you cannot make anymore invoices?
  }

  // Build the output
  let output = prefix;
  var i;
  for (i =0 ; i < numLeadingZeros ; i++){
    output += '0';
  }
  output += projectSequence;
  return output;
}

function setInvoiceNumbersForProject(projects:any, lastInvoiceNumber:string){
    let increment = 1;
    let maxCharsInInvoiceNumber = 10;
    let invoiceNumberPrefix = config['invoiceNumberPrefix'];
    lastInvoiceNumber = lastInvoiceNumber.replace(invoiceNumberPrefix,"");
    let lastSequence = Number(lastInvoiceNumber);
    projects.map((item) => {
        let projectSequence = lastSequence + increment;
        increment++;
        item["invoiceNumber"] = buildInvoiceNumber(invoiceNumberPrefix, projectSequence, maxCharsInInvoiceNumber);
    });
}

function addDiscountsToReflectActualUsage(price, report){
  // ignore if usage is already 100% discounted
  if(price.discount && price.discount >= 1) return;

  // effective total cost from report
  let effectiveTotalCost =
    Big(report.cpuCost).plus(report.imageCost).plus(report.volumeCost);
  // total cost based on price and usage
  let totalCost =
    Big(report.cpu).times(price.cpuPrice)
      .plus(Big(report.image).times(price.imagePrice))
      .plus(Big(report.volume).times(price.volumePrice));
  let diff =
    totalCost.minus(effectiveTotalCost);
  // adjust for javascript float precision
  if(diff.gt(0.01) && totalCost.gt(0.00)){
    let effectiveDiscount = diff.div(totalCost);

		// max discount should be 100%
    price["discount"] =
      price["discount"] ? _.clamp(Number(effectiveDiscount.plus(price["discount"]).toPrecision(3)), 1) :
                          _.clamp(Number(effectiveDiscount.toPrecision(3)), 1);
	}
}

function generateInvoiceDataJSON(projectEmails:Array<string>, projectName:string, invoiceNumber:string, report:any, price:any, invoicesAggregator:Array<any>){
    let creationDate = new Date();
    let creationDateText = creationDate.toISOString().slice(0,10);
    let projectEmail = "";
    projectEmails.map((item) => projectEmail = projectEmail + item + ",");
    // generate invoice data
    let invoiceData = {
        'pi_email': projectEmail.substring(0,projectEmail.lastIndexOf(",")),
        'project_name':projectName,
        'invoice_number':invoiceNumber,
        'date' : creationDateText,
        'cpu_cost' : report.cpuCost,
        'cpu_qty' : report.cpu,
        'cpu_unit_cost' : price.cpuPrice,
        'image_cost' : report.imageCost,
        'image_qty' : report.image,
        'image_unit_cost' : price.imagePrice,
        'volume_cost' : report.volumeCost,
        'volume_qty' : report.volume,
        'volume_unit_cost' : price.volumePrice,
        'discount' : price.discount
    };
    invoicesAggregator.push(invoiceData);

}

function generatePreInvoiceSummaryCSV(invoicesData:Array<any>): Promise<any>{
    let fields = [
        {
            label: 'Project Name',
            value: 'project_name'
        },
        {
            label: 'Email',
            value: 'pi_email'
        },
        {
            label: 'Target Invoice Number',
            value: 'invoice_number'
        },
        {
            label: 'Date',
            value: 'date'
        },
        {
            label: 'CPU Cost',
            value: 'cpu_cost'
        },
        {
            label: 'CPU Qty',
            value: 'cpu_qty'
        },
        {
            label: 'CPU Unit Cost',
            value: 'cpu_unit_cost'
        },
        {
            label: 'Image Cost',
            value: 'image_cost'
        },
        {
            label: 'Image Qty',
            value: 'image_qty'
        },
        {
            label: 'Image Unit Cost',
            value: 'image_unit_cost'
        },
        {
            label: 'Volume Cost',
            value: 'volume_cost'
        },
        {
            label: 'Volume Qty',
            value: 'volume_qty'
        },
        {
            label: 'Volume Unit Cost',
            value: 'volume_unit_cost'
        },
        {
            label: 'Discount',
            value: 'discount'
        },

    ];
    return billing.writeCSVDataToFile(invoicesData,fields, config['outputDir'] + 'InvoicesSummary.csv');

}
