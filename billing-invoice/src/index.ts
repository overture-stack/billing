import { BillingApi } from './service/billing';
import { Mailer } from './service/email';
import * as fs from 'fs';
import * as _ from 'lodash';

console.log("*** Starting Email Reporting ***")

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Argument Parsing for Config Path
 */
let args = process.argv;
if (args.length < 3) {
  console.log('Missing arguments');
  process.exit(1);
}
let configPath = args[2];
let config = JSON.parse(fs.readFileSync(configPath).toString());
//let emailPath = args[3];


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
  month = MONTH_NAMES[reportMonth];
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

/**
 * Generate reports from billing api and email them to billing users
 */
let billing = new BillingApi(config['billingConfig']);
// generate invoices for each project
let invoiceGeneration = new Promise((resolve, reject) => {
  let projectsPromise = billing.login().then(() => billing.projects());
  projectsPromise.then(results => {
    let projects : any;
    projects = _.filter(results, r => (allProjects || projectList.indexOf(r.project_name) >= 0) && typeof  r.extra.email !== 'undefined');
    projects = combineProjectUsers(projects);
    let pricePromise = billing.price(reportYear, reportMonth, projects);
    pricePromise.then(perProjectPrices => {
      let totalProjectCount = projects.length;
      let invoicesProcessed = 0;
      projects.map(project => billing.monthlyReport(project, reportYear, reportMonth).then(report => {
        //console.log(`Sending email to ${project.extra.email} for project ${project.project_name}`);
        report.month = month;
        report.year = reportYear;
        report.project_name = project.project_name;
        let price = perProjectPrices[project.project_name];
        if(typeof price == 'undefined') price = perProjectPrices[0];// for backward compatiblity
        _.each(price, (value, key) => {
          if(key == 'discount')
            price[key] = (value*100).toFixed(4);

        });
        // handle invoice emailing through separate objects as each invoice email can be truly asynch then
        //let freshbooksServiceClient = new InvoiceServiceClient(config['invoiceConfig']);
          billing.sendInvoice(project.emails, report, price).then(() => {
          invoicesProcessed++;
          if(invoicesProcessed == totalProjectCount) resolve();
        }).catch(err =>{
          console.log("Error while processing Inovice:", err);
          // we increment the counter regardless of an error; this makes sure that promise is always resolved
          // and summary generation happens
          invoicesProcessed++;
          if(invoicesProcessed == totalProjectCount) resolve();
        });
      }).catch(err =>{
        console.log("Error while processing Inovice:", err);
      }));
    });
  });
});

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

// wait till all invoices are generated and then generate the summary .csv file
invoiceGeneration.then(() => {
  //let freshbooksServiceClient = new InvoiceServiceClient(config['invoiceConfig']);
    billing.generateInvoicesSummary(month)
});