import * as nodemailer from 'nodemailer';

interface SMTPConfig {

    host: string;
    port: string;
    secure: boolean;
    auth: any;

}

interface EmailConfig {

  fromAddress: string;
  subject: string;

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

  /**
   * State
   */
  private transport: nodemailer.Transporter;

  constructor(config: MailerConfig) {
    this.config = config;
    this.transport = nodemailer.createTransport(this.config.smtpConfig);
  }

  public sendEmail(email: string, report: string) {
    let message = {
      from: this.config.emailConfig.fromAddress,
      to: email,
      subject: this.config.emailConfig.subject,
      text: report
    };
    this.transport.sendMail(message, function(err) {
      if(err) {
        console.log(err);
      }  
    }); 
  }

}

export { Mailer };