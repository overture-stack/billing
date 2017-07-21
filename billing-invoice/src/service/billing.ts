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
import axios from 'axios';
import * as _ from 'lodash';
import * as https from 'https';
import * as fs from 'fs';
import * as json2csv from 'json2csv';

interface BillableProject {

  project_name: string;
  project_id: string;
  user_id: string; // this is the billing user
  extra: any;

}

interface BillingConfig {

  api: string;
  username: string;
  password: string;
  rejectInsecure: boolean;

}


interface Price {

  cpuPrice: number;
  volumePrice: number;
  imagePrice: number;

}

class BillingApi {

  /**
   * Dependencies
   */
  private config: BillingConfig;

  /**
   * State
   */
  private token: string;
  private agent: https.Agent;

  constructor(config: BillingConfig) {
    this.config = config;
    this.agent = new https.Agent({  
      rejectUnauthorized: config.rejectInsecure
    });
  }

  public async login() : Promise<string> {
    let json = {
      username: this.config.username,
      password: this.config.password
    };
    
    console.log('Logging in...')

    return axios.post(`${ this.config.api }/login`, json, { httpsAgent: this.agent })
      .then( response => {
        this.token = response.headers.authorization;
        return this.token;
      });
  }

  public async price(year: number, month: number, projects : Array<any>) : Promise<Price> {
    let firstDay = new Date(year, month - 1, 1);

    // Bill based on first price at first day of the month
    let isoDate = firstDay.toISOString();
    let projectNames = [];
    _.each(projects, (project) => {
      projectNames.push(project.project_name);
    });
    console.log(`Getting Price for Date: ${ isoDate }`);
    return axios.get(`${ this.config.api }/price?date=${ isoDate }&projects=${ projectNames }`, { httpsAgent: this.agent })
      .then( response => {
        return response.data;
      });
  }

  public async projects() : Promise<Array<BillableProject>> {
    let headers = {
      authorization: `Bearer ${this.token}`
    };

    console.log('Searching for billable projects...')
    return axios.get(`${ this.config.api }/billingprojects`, {headers: headers, httpsAgent: this.agent})
      .then( response => {
        let projects: Array<BillableProject> = response.data;
        return projects;
      });
  }

  public async monthlyReport(project: any, year:number, month: number) : Promise<any> {
    let headers = {
      authorization: `Bearer ${this.token}`
    };

    console.log(`Generating report for projectId: ${ project.project_name }`)

    var date = new Date();
    var firstDay = (new Date(year, month - 1, 1)).toISOString();
    var lastDay = (new Date(year, month, 0)).toISOString();

    return await axios.get(
      `${ this.config.api }/reports?bucket=monthly&fromDate=${firstDay}&toDate=${lastDay}&projects=${project.project_id}`,
      {headers: headers, httpsAgent: this.agent})
      .then( response => {
        if (response.data.entries.length > 0) {
          var report = this.getTotals(response.data['entries']);
          return report;
        } else {
          return {
            cpu: 0,
            volume: 0,
            image: 0,
            cpuCost: 0,
            volumeCost: 0,
            imageCost: 0,
          };
        }
      });
  }
  public async sendInvoice(projectEmails: any, report: any, price: any) {
    let headers = {
      authorization: `Bearer ${this.token}`
    };

    let invoicePayload = {
      'emails':projectEmails,
      'report' : report,
      'price' : price
    };
    return axios.post(`${ this.config.api }/emailNewInvoice`,invoicePayload,{headers: headers, httpsAgent: this.agent})
        .then( response => {
          console.log(response.data);
        });

  };

  // generates invoices summary table for invoices created on current date
  public async generateInvoicesSummary(month:string)  {

    let flattenedInovicesJson = await this.getInvoicesSummaryData();
    let fields = [
      {
        label: 'Project Name',
        value: 'current_organization'
      },
      {
        label: 'Invoice Number',
        value: 'invoice_number'
      },
      {
        label: 'Date',
        value: 'date'
      },
      {
        label: 'CPU Cost',
        value: 'cpu_cost'
      },
      {
        label: 'Image Cost',
        value: 'image_cost'
      },
      {
        label: 'Volume Cost',
        value: 'volume_cost'
      },
      {
        label: 'Discount',
        value: 'discount'
      },
      {
        label: 'Total',
        value: 'total'
      },
    ]

    var invoicesCSV = json2csv({ data: flattenedInovicesJson, fields: fields });
    fs.writeFile(month + '.csv', invoicesCSV, function(err) {
      if (err) throw err;
      console.log(month + '.csv saved');
    });

  };

  private async getInvoicesSummaryData(){
    let headers = {
      authorization: `Bearer ${this.token}`
    };
    let currentDate = new Date();
    let dateText = currentDate.toISOString().slice(0,10);
    return axios.get(`${ this.config.api }/getAllInvoices?date=${ dateText }`,
        {headers: headers, httpsAgent: this.agent})
        .then( response => {
          //console.log(response.data);
          return response.data;
        });
  }

  private getTotals(entries: Array<any>) {
    return {
      cpu: _.sumBy(entries, e => e.cpu) || 0,
      volume: _.sumBy(entries, e => e.volume) || 0,
      image: _.sumBy(entries, e => e.image) || 0,
      cpuCost: (_.sumBy(entries, e => e.cpuCost) || 0).toFixed(2) || '0.00',
      volumeCost: (_.sumBy(entries, e => e.volumeCost) || 0).toFixed(2) || '0.00',
      imageCost: (_.sumBy(entries, e => e.imageCost) || 0).toFixed(2) || '0.00'
    };
  }

}

export { BillingApi };
