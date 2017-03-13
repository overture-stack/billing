import { BillingApi } from './service/billing';
import { Mailer } from './service/email';
import * as fs from 'fs';

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
let mailer = new Mailer({emailConfig: config['emailConfig'], smtpConfig: config['smtpConfig']}, emailPath);
let projects = billing.login().then(() => billing.projects());
projects.then( p => p.map(project => billing.monthlyReport(project.project_id).then(
  report => mailer.sendEmail(project.extra.email, JSON.stringify(report))
)));

