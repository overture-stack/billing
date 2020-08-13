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

import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import * as json2csv from 'json2csv';
import * as _ from 'lodash';

interface BillableProject {
    extra :any;
    project_id :string;
    project_name :string;
    user_id :string; // this is the billing user
}

interface BillingConfig {
    api :string;
    username :string;
    password :string;
    rejectInsecure :boolean;
}

interface Price {
    cpuPrice :number;
    volumePrice :number;
    imagePrice :number;
}

class BillingApi {
    /**
    * Dependencies
    */
    private config :BillingConfig;

    private logger :any;

    /**
    * State
    */
    private token :string;

    private agent :https.Agent;


    constructor(config :BillingConfig, logger :any = console) {
        this.config = config;
        this.agent = new https.Agent({
            rejectUnauthorized: config.rejectInsecure,
        });
        this.logger = logger;
    }


    login = async () :Promise<string> => {
        this.logger.info('Logging in...');

        return axios.post(
            `${this.config.api}/login`,
            {
                password: this.config.password,
                username: this.config.username,
            },
            { httpsAgent: this.agent },
        )
            .then(response => {
                this.logger.info('Logged in successfully');
                this.token = response.headers.authorization;
                return response;
            })
            .catch(error => {
                this.logger.error('Failure logging in');
                return error.toJSON();
            });
    }


    price = async (
        year :number,
        month :number,
        projects :Array<any>,
    ) :Promise<Price> => {
        const firstDay = new Date(year, month - 1, 1);

        // Bill based on first price at first day of the month
        const isoDate = firstDay.toISOString();
        const projectNames = [];
        _.each(projects, project => {
            projectNames.push(project.project_name);
        });

        this.logger.info(`Getting Price for Date: ${isoDate}`);
        return axios.get(`${this.config.api}/price?date=${isoDate}&projects=${projectNames}`, { httpsAgent: this.agent })
            .then(({ data: prices }) => prices);
    }


    projects = async (loginResponse) :Promise<Array<BillableProject>> => (
        loginResponse.status === 200
            ? (
                this.logger.info('Searching for billable projects...'),
                axios.get(
                    `${this.config.api}/billingprojects`,
                    {
                        headers: { authorization: `Bearer ${this.token}` },
                        httpsAgent: this.agent,
                    },
                )
                    .then(({ data: projects } :{ data :Array<BillableProject> }) => projects)
                    .catch(error => {
                        this.logger.error(`Project search error: ${error.response.status}, ${error.response.statusText}`);
                        return error;
                    })
            )
            : new Promise((resolve, reject) => reject(loginResponse))
    );


    private getTotals = (entries :Array<any>) => ({
        cpu: _.sumBy(entries, e => e.cpu) || 0,
        cpuCost: (_.sumBy(entries, e => e.cpuCost) || 0).toFixed(2) || '0.00',
        image: _.sumBy(entries, e => e.image) || 0,
        imageCost: (_.sumBy(entries, e => e.imageCost) || 0).toFixed(2) || '0.00',
        objects: _.sumBy(entries, e => e.objects) || 0,
        objectsCost: (_.sumBy(entries, e => e.objectsCost) || 0).toFixed(2) || '0.00',
        volume: _.sumBy(entries, e => e.volume) || 0,
        volumeCost: (_.sumBy(entries, e => e.volumeCost) || 0).toFixed(2) || '0.00',
    });

    monthlyReport = async (
        project :any,
        year :number,
        month :number,
    ) :Promise<any> => {
        this.logger.info(`Generating monthly report for projectId: ${project.project_name}`);

        return axios.get(
            `${this.config.api}/reports`,
            {
                headers: { authorization: `Bearer ${this.token}` },
                httpsAgent: this.agent,
                params: {
                    bucket: 'monthly',
                    fromDate: (new Date(year, month - 1, 1))
                        .toISOString(), // first day
                    projects: project.project_id,
                    toDate: (new Date(year, month, 0, 20))
                        .toISOString(), // last day.
                },
            },
        )
            .then(response => (
                response.data.entries.length > 0
                    ? this.getTotals(response.data.entries)
                    : {
                        cpu: 0,
                        cpuCost: '0.00',
                        image: 0,
                        imageCost: '0.00',
                        objects: 0,
                        objectsCost: '0.00',
                        volume: 0,
                        volumeCost: '0.00',
                    }
            )).catch(err => {
                this.logger.error(`Error fetching report data for: ${project.project_name}, ${project.project_id}`);
                this.logger.error(err);
            });
    }


    getLastInvoiceNumber = async (invoicePrefix) => axios.get(
        `${this.config.api}/getLastInvoiceNumber`,
        {
            headers: { authorization: `Bearer ${this.token}` },
            httpsAgent: this.agent,
            params: { invoicePrefix },
        },
    )
        .then(response => response.data)
        .catch(error => {
            this.logger.error(`at billing/getLastInvoiceNumber: ${error}`);
            throw new Error(error);
        });


    sendInvoice = async (
        projectEmails :any,
        report :any,
        price :any,
        invoiceNumber :string,
    ) => axios.post(
        `${this.config.api}/emailNewInvoice`,
        {
            emails: projectEmails,
            invoiceNumber,
            price,
            report,
        },
        {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
            httpsAgent: this.agent,
        },
    )
        .then(response => response.data);

    private getInvoicesSummaryData = async () =>
        axios.get(
            `${this.config.api}/getAllInvoices`,
            {
                headers: { authorization: `Bearer ${this.token}` },
                httpsAgent: this.agent,
                params: {
                    date: new Date().toISOString().slice(0, 10), // current date, YYYY-MM-DD
                },
            },
        )
            .then(({ data: invoices }) => {
                if (invoices.length) { return invoices; }

                throw new Error('No invoices were actually generated?');
            });


    writeCSVDataToFile = async (data :any, fields :any, fileName :string) => {
        const that = this;
        const invoicesCSV = json2csv.parse(data, {
            fields,
        });

        this.logger.info(`Saving file: ${fileName}`);

        return fs.writeFile(fileName, invoicesCSV, (err) => {
            if (err) throw err;
            that.logger.info(`${fileName} saved`);
        });
    }

    generateInvoicesSummary = async (
        month :string,
        year :number,
        outputFolder :string,
    ) :Promise<any> => {
        const flattenedInvoicesJson = await this.getInvoicesSummaryData();
        const fields = [
            {
                label: 'Organization',
                value: 'current_organization',
            },
            // {
            //     label: 'PI Email',
            //     value: 'pi_email',
            // },
            // {
            //     label: 'Project Name',
            //     value: 'project_name',
            // },
            {
                label: 'Invoice Number',
                value: 'invoice_number',
            },
            {
                label: 'Date',
                value: 'date',
            },
            {
                label: 'CPU Cost',
                value: 'cpu_cost',
            },
            {
                label: 'Image Cost',
                value: 'image_cost',
            },
            {
                label: 'Objects Cost',
                value: 'objects_cost',
            },
            {
                label: 'Volume Cost',
                value: 'volume_cost',
            },
            {
                label: 'Discount %',
                value: 'discount',
            },
            {
                label: 'Total',
                value: 'total',
            },
        ];

        return this.writeCSVDataToFile(flattenedInvoicesJson, fields, `${outputFolder + month}-${year}.csv`);
    }
}

export default BillingApi;
