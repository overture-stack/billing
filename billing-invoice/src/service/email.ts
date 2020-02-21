/**
 *
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved.
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


import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import { each } from 'lodash';

interface SMTPConfig {

    host :string;
    port :string;
    secure :boolean;
    ignoreTLS :boolean;
    auth :any;

}

interface EmailConfig {
  fromAddress :string;
  subject :string;
  replyTo :string;
  text :string;
}

interface EmailRecipients {
  'summaryRecipients' :Array<string>
}

interface MailerConfig {
  emailConfig :EmailConfig;
  emailRecipients :EmailRecipients
  smtpConfig :SMTPConfig;
}

class Mailer {
    /**
     * Dependencies
     */
    private config :MailerConfig;

    private emailPath :string;

    private logger :any;

    /**
     * State
     */
    private transport :nodemailer.Transporter;

    constructor(config :MailerConfig, emailPath :string, logger :any = console) {
        this.config = config;
        this.emailPath = emailPath;
        this.transport = nodemailer.createTransport(this.config.smtpConfig);
        this.logger = logger;
    }


    private finishReport = (report :any, price :any) => {
        const finalReport = Object.assign(report, price);
        finalReport.total = (
            Number(report.cpuCost) +
            Number(report.volumeCost) +
            Number(report.imageCost)
        ).toFixed(2);

        each(finalReport, (value, key :string) => {
            if (key !== 'year') finalReport[key] = value.toLocaleString().replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
        });

        return finalReport;
    }

    sendEmail(email :string, report :any, price :any) {
        const that = this;
        const emailTemplate = fs.readFileSync(this.emailPath).toString();
        const html = handlebars.compile(emailTemplate)(this.finishReport(report, price));
        const message = {
            from: this.config.emailConfig.fromAddress,
            replyTo: this.config.emailConfig.replyTo,
            to: email,
            subject: `${this.config.emailConfig.subject} - ${report.project_name}`,
            headers: {
                'Reply-To': this.config.emailConfig.replyTo,
            },
            text: JSON.stringify(report),
            html,
        };
        this.transport.sendMail(message, (err) => {
            if (err) {
                that.logger.error(err);
            }
        });
    }

    sendSummaryCSVEmail = (summaryCSVFilePath :string, month :string, year :number) => {
        const that = this;

        const message = {
            // filename and content type are derived from path
            attachments: [{ path: summaryCSVFilePath }],
            from: this.config.emailConfig.fromAddress,
            headers: {
                'Reply-To': this.config.emailConfig.replyTo,
            },
            replyTo: this.config.emailConfig.replyTo,
            subject: `${this.config.emailConfig.subject} ${month} ${year}`,
            text: this.config.emailConfig.text,
            to: this.config.emailRecipients.summaryRecipients,
        };

        this.transport.sendMail(message, (err) => {
            if (err) {
                that.logger.error(err);
            }
        });
    }
}

export default Mailer;
