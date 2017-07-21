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
    billing.generateInvoicesSummary(month)
});