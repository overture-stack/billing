import axios from 'axios';
import * as _ from 'lodash';
import * as https from 'https';

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

  public async price(year: number, month: number) : Promise<Price> {
    let firstDay = new Date(year, month - 1, 1);

    // Bill based on first price at first day of the month
    let isoDate = firstDay.toISOString();
    console.log(`Getting Price for Date: ${ isoDate }`);
    return axios.get(`${ this.config.api }/price?date=${ isoDate }`, { httpsAgent: this.agent })
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

  private getTotals(entries: Array<any>) {
    return {
      cpu: _.sumBy(entries, e => e.cpu) || 0,
      volume: _.sumBy(entries, e => e.volume) || 0,
      image: _.sumBy(entries, e => e.image) || 0,
      cpuCost: _.sumBy(entries, e => e.cpuCost).toFixed(2) || '0.00',
      volumeCost: _.sumBy(entries, e => e.volumeCost).toFixed(2) || '0.00',
      imageCost: _.sumBy(entries, e => e.imageCost).toFixed(2) || '0.00'
    };    
  }

}

export { BillingApi };
