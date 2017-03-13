import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';

interface SMTPConfig {

    host: string;
    port: string;
    secure: boolean;
    auth: any;

}

interface EmailConfig {

  fromAddress: string;
  subject: string;
  replyTo: string;

}

interface MailerConfig {
  
  smtpConfig: SMTPConfig;
  emailConfig: EmailConfig;

}

class Mailer {

  /**
   * Dependencies
   */
  private config: MailerConfig;
  private emailPath: string;

  /**
   * State
   */
  private transport: nodemailer.Transporter;

  constructor(config: MailerConfig, emailPath: string) {
    this.config = config;
    this.emailPath = emailPath;
    this.transport = nodemailer.createTransport(this.config.smtpConfig);
  }

  public sendEmail(email: string, report: string) {

    let emailTemplate = fs.readFileSync(this.emailPath).toString();
    let html = handlebars.compile(emailTemplate)(report);
    let message = {
      from: this.config.emailConfig.fromAddress,
      replyTo: this.config.emailConfig.replyTo,
      to: email,
      subject: this.config.emailConfig.subject,
      headers: {
        'Reply-To': this.config.emailConfig.replyTo
      },
      text: report,
      html: html
    };
    this.transport.sendMail(message, function(err) {
      if(err) {
        console.log(err);
      }  
    }); 
  }

}

export { Mailer };