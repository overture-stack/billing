import { BillingApi } from './service/billing';
import { Mailer } from './service/email';
import * as fs from 'fs';
import * as _ from 'lodash';
import {InvoiceServiceClient} from "./service/invoice";

console.log("*** Starting Email Reporting ***")

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Argument Parsing for Config Path
 */
let args = process.argv;
if (args.length < 4) {
  console.log('Missing arguments');
  process.exit(1);
}
let configPath = args[2];
let config = JSON.parse(fs.readFileSync(configPath).toString());
let emailPath = args[3];


/**
 * Extra params for specific months/projects
 */
let reportMonth : number;
let reportYear : number;
let month: string;
if (args.length >= 5) {
  let dateArgs = args[4].split('-');
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
if(args.length === 6) {
  if (args[5] !== 'ALL') {
    allProjects = false;
    projectList = args[5].split(",")
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
    let projects = _.filter(results, r => (allProjects || projectList.indexOf(r.project_name) >= 0) && typeof  r.extra.email !== 'undefined');
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
        _.each(price, (value, key) => {
          if(key == 'discount')
            price[key] = (value*100).toFixed(4);

        });
        // handle invoice emailing through separate objects as each invoice email can be truly asynch then
        let freshbooksServiceClient = new InvoiceServiceClient(config['invoiceConfig']);
        freshbooksServiceClient.sendInvoice(project.extra.email, report, price).then(() => {
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

// wait till all invoices are generated and then generate the summary .csv file
invoiceGeneration.then(() => {
  let freshbooksServiceClient = new InvoiceServiceClient(config['invoiceConfig']);
  freshbooksServiceClient.generateInvoicesSummary(month)
});