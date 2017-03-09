import { BillingApi } from './service/billing';
import { Mailer } from './service/email';


/**
 * Config
 */
let config = {
  smtpConfig: {
    host: '',
    port: '25',
    secure: false,
    auth: null
  },
  emailConfig: {
    fromAddress: 'billing@cancercollaboratory.org',
    subject: 'Collaboratory Usage Report'
  }
};


console.log(process.argv);

/**
 * Run this stuff here
 */
let billing = new BillingApi();
let mailer = new Mailer(config);

let projects = billing.login().then(() => billing.projects());

projects.then( p => p.map(project => billing.monthlyReport(project.project_id).then(
  report => mailer.sendEmail(project.extra.email, JSON.stringify(report))
)));

