import { BillingApi } from './service/billing';
import { Mailer } from './service/email';
import * as fs from 'fs';

console.log("*** Starting Email Reporting ***")

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
var lastMonth = (new Date()).getMonth();
var monthIndex = lastMonth - 1 < 0 ? 12 : lastMonth - 1;
var month = MONTH_NAMES[monthIndex];

/**
 * Argument Parsing for Config Path
 */
let args = process.argv;
if (args.length < 4) {
  console.log('Missing arguments');
  process.exit(-1);
}
let configPath = args[2];
let config = JSON.parse(fs.readFileSync(configPath).toString());
let emailPath = args[3];

/**
 * Generate reports from billing api and email them to billing users
 */
let billing = new BillingApi(config['billingConfig']);
let mailer = new Mailer({ emailConfig: config['emailConfig'], smtpConfig: config['smtpConfig'] }, emailPath);

let pricePromise = billing.price();
let projectsPromise = billing.login().then(() => billing.projects());
Promise.all([pricePromise, projectsPromise]).then(results => {
  let price = results[0];
  let projects = results[1];
  return projects.map(project => billing.monthlyReport(project).then(report => {
    console.log(`Sending email to ${project.extra.email} for project ${project.project_name}`);
    report.month = month;
    report.project_name = project.project_name;
    mailer.sendEmail(project.extra.email, report, price);
  }));
});
