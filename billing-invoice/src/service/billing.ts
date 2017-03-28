import axios from 'axios';
import * as _ from 'lodash';

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

  constructor(config: BillingConfig) {
    this.config = config;
  }

  public async login() : Promise<string> {
    let json = {
      username: this.config.username,
      password: this.config.password
    };
    
    return axios.post(`${ this.config.api }/login`, json)
      .then( response => {
        this.token = response.headers.authorization;
        return this.token;
      });
  }

  public async price() : Promise<Price> {
    let date = new Date(), y = date.getFullYear(), m = date.getMonth();
    let firstDay = new Date(y, m-1, 1);

    // Bill based on first price at first day of the month
    let isoDate = firstDay.toISOString();
    console.log(isoDate);
    return axios.get(`${ this.config.api }/price?date=${ isoDate }`)
      .then( response => {
        return response.data;
      });
  }

  public async projects() : Promise<Array<BillableProject>> {
    let headers = {
      authorization: `Bearer ${this.token}`
    };

    return axios.get(`${ this.config.api }/billingprojects`, {headers: headers})
      .then( response => {
        let projects: Array<BillableProject> = response.data;
        return projects;
      });
  }

  public async monthlyReport(projectId: string) : Promise<any> {
    let headers = {
      authorization: `Bearer ${this.token}`
    };

    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = (new Date(y, m - 1, 1)).toISOString();
    var lastDay = (new Date(y, m, 0)).toISOString();

    return axios.get(
      `${ this.config.api }/reports?bucket=monthly&fromDate=${firstDay}&toDate=${lastDay}&projects=${projectId}`,
      {headers: headers})
      .then( response => {
        if (response.data['entries'].length > 0) {
          console.log(response.data['entries']);
          var report = this.aggregateEntries(response.data['entries'], 'fromDate');
          return report;
        } else {
          return [{
            cpu: 0,
            volume: 0,
            image: 0,
            cpuCost: 0,
            volumeCost: 0,
            imageCost: 0,
          }];
        }
      });
  }

  private aggregateEntries(entries, groupByIteratee) {
    return _(entries)
      .groupBy(groupByIteratee)
      .map((items, key) => items.reduce((acc, entry) => ({
        ...acc,
        ...entry,
        cpu: (acc.cpu || 0) + (entry.cpu || 0),
        volume: (acc.volume || 0) + (entry.volume || 0),
        image: (acc.image || 0) + (entry.image || 0),
        cpuCost: (acc.cpuCost || 0) + (entry.cpuCost || 0),
        volumeCost: (acc.volumeCost || 0) + (entry.volumeCost || 0),
        imageCost: (acc.imageCost || 0) + (entry.imageCost || 0),
        key,
      })))
      .value();
  }

}

export { BillingApi };
