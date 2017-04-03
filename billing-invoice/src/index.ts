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
let month: string;
if (args.length >= 5) {
  reportMonth = Number(args[4]);
  month = MONTH_NAMES[reportMonth];
} else {
  let monthIndex = (new Date()).getMonth();
  reportMonth = monthIndex - 1 < 0 ? 11 : monthIndex - 1;
  month = MONTH_NAMES[reportMonth];
}
var allProjects = true;
var projectList : Array<string>;
if(args.length === 6) {
  allProjects = false;
  projectList = args[5].split(",")
}

/**
 * Generate reports from billing api and email them to billing users
 */
let billing = new BillingApi(config['billingConfig']);
let mailer = new Mailer({ emailConfig: config['emailConfig'], smtpConfig: config['smtpConfig'] }, emailPath);

let pricePromise = billing.price(reportMonth);
let projectsPromise = billing.login().then(() => billing.projects());
Promise.all([pricePromise, projectsPromise]).then(results => {
  let price = results[0];
  let projects = _.filter(results[1], r => allProjects || projectList.indexOf(r.project_name) >= 0);
  return projects.map(project => billing.monthlyReport(project, reportMonth).then(report => {
    console.log(`Sending email to ${project.extra.email} for project ${project.project_name}`);
    report.month = month;
    report.project_name = project.project_name;
    mailer.sendEmail(project.extra.email, report, price);
  }));
});