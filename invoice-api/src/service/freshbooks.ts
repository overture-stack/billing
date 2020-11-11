/**
 * /**
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
 *
 * BECAUSE OF THE WAY FRESHBOOKS AUTHENTICATION WORKS; IF WE PLAN TO RUN MULTIPLE INSTANCES OF THIS SERVICE IN PARALLEL
 * WE WILL HAVE TO IMPLEMENT A SYNCHRONISATION MECHANISM AMONG THESE SERVICES AS THE SERVICES WILL BE USING THE SAME
 * FRESHBOOKS APP CREDENTIALS
 */


import axios from 'axios';
import * as https from 'https';
import * as _ from 'lodash';

import {
    formatCurrency,
    formatNumber,
} from '../utils/formats';

const INVOICE_TEXT = 'This is a statement for your usage of the Cancer Genome Collaboratory (Collab) resources during the month of <month>, <year> for the project: "';

interface InvoiceLineItem {
    amount :{
        amount :number;
        code :string;
    };
    description :string;
    taxName1 :string;
    taxAmount1 :number;
    name :string;
    qty :number;
    taxName2 :string;
    taxAmount2 :number;
    type :number;
    unit_cost :{
        amount :number;
        code :string;
    },
    taxNumber1 :string;
}

interface BillingLineItem {
    name :string;
    unit_cost :number;
    qty :number;
    total_cost :number;
    desc :string;
}

interface InvoicePresentation {
    id :number;
    theme_font_name :string;
    theme_primary_color :string;
    theme_layout :string;
    date_format :string;
    image_banner_position_y :number;
    image_logo_src :string;
    image_banner_src :any;
}

interface Invoice {
    invoice :{
        create_date :string;
        currency_code :string;
        discount_value :number;
        notes :string;
        invoice_number :string;
        template :string;
        terms :string;
        customerid :number;
        due_offset_days :number;
        lines :Array<InvoiceLineItem>;
        presentation :InvoicePresentation;
        allowed_gatewayids :Array<any>;
    }
}

interface FreshbooksInvoiceDefaults {
    terms :string;
    notesprefix :string;
    notessuffix :string;
    cash_only_accounts :Array<string>;
    invoice_due_days :number;
    code :string;
    template :string;
    presentation :InvoicePresentation;
    taxNumber1 :string;
    taxName1 :string;
    taxAmount1 :number;
    allowed_gatewayids :Array<any>;
}

interface FreshbooksConfig {
    api :string;
    grant_type :string;
    client_secret :string;
    refresh_token :string;
    client_id :string;
    redirect_uri :string;
    account_id :string;
    oicr_finance_email :string;
    rejectInsecure :boolean;
    invoiceDefaults :FreshbooksInvoiceDefaults;
}

class FreshbooksService {
    /**
     * Dependencies
     */
    private apiConfig :FreshbooksConfig;

    private extras :any;

    private logger :any;

    /**
     * State
     */
    private token :string;

    private authenticator :any;

    private agent :https.Agent;

    private headers = {
        'Api-Version': 'alpha',
        Authorization: null,
        'Content-Type': 'application/json',
    };

    private invoiceSummary :string;

    constructor(
        config :FreshbooksConfig,
        authenticator :any,
        logger :any = console,
        extras :any = {},
    ) {
        this.apiConfig = config;
        this.agent = new https.Agent({
            rejectUnauthorized: config.rejectInsecure,
        });
        this.authenticator = authenticator;
        this.logger = logger;
        this.extras = extras;
    }


    private authenticate = async (triggeredBy = 'do something undetermined') => {
        if (this.authenticator) {
            this.logger.info(`Authenticating to ${triggeredBy}...`);
            this.token = await this.authenticator.getLatestAccessToken();
            this.headers.Authorization = `Bearer ${this.token}`;
        } else {
            this.logger.error('Authentication failure\nNo Authenticator provided');
            throw new Error('error: No authenticator provided.');
        }
    }


    // utils for sendInvoice

    /* Method commented out as it is unused.
    private stripAdminEmails(emails :Array<any>, adminEmails :Array<any>) :Array<string> {
        const output = [];
        // any email that is not an oicr admin is a valid customer email
        for (const idx in emails) {
            if (adminEmails.indexOf(emails[idx].toLowerCase()) < 0) {
                output.push(emails[idx]);
            }
        }
        return output;
    }
    */

    private getCustomerID = async (email :string) :Promise<any> =>
        axios.get(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/users/clients`,
            {
                headers: this.headers,
                httpsAgent: this.agent,
                params: {
                    'search[email]': email,
                },
            },
        )
            .then(response => response.data.response.result.clients)
            .catch(error => {
                this.logger.error('at freshbooks/getCustomerID:', error.response.statusText);
                throw new Error(error.response);
            });

    /**
     * Gets customer IDs belonging to each email and returns
     * a customer ID that is common to all/any email addresses.
     */
    private findCustomerIDParallel = async (customerEmails :any) :Promise<any> => {
        const responses :Array<any> = await Promise.all(
            customerEmails.map(email => this.getCustomerID(email)),
        );
        const filteredResponses = _.filter(responses, (item) => item.length !== 0);
        const flattenedChunks = _.flatten(_.chunk(_.flatten(filteredResponses), 1));

        return _.intersectionBy(flattenedChunks, 'id');
    }

    private createInvoiceLineItem = (
        lineItem :BillingLineItem,
        projectTax :any = {},
    ) :InvoiceLineItem => ({
        ...{
            amount: {
                amount: lineItem.total_cost,
                code: this.apiConfig.invoiceDefaults.code,
            },
            description: lineItem.desc,
            name: lineItem.name,
            qty: lineItem.qty,
            taxAmount1: projectTax.taxAmount1 || 0,
            taxAmount2: projectTax.taxAmount2 || 0,
            taxName1: projectTax.taxName1 || '',
            taxName2: projectTax.taxName2 || '',
            type: 0,
            unit_cost: {
                amount: lineItem.unit_cost,
                code: this.apiConfig.invoiceDefaults.code,
            },
        },
        ...Object.keys(projectTax).length && {
            taxNumber1: this.apiConfig.invoiceDefaults.taxNumber1,
        },
    });

    private createCPUCostItem(report :any, price :any, projectTax :any) :InvoiceLineItem {
        return this.createInvoiceLineItem({
            desc: '',
            name: 'CPU (Core) / Hour:',
            qty: report.cpu,
            total_cost: report.cpuCost,
            unit_cost: price.cpuPrice,
        }, projectTax);
    }

    private createImageCostItem(report :any, price :any, projectTax :any) :InvoiceLineItem {
        return this.createInvoiceLineItem({
            desc: `Total usage of ${
                formatNumber(report.image)
            } GB hour charged at ${
                formatCurrency(
                    price.imagePrice,
                    this.apiConfig.invoiceDefaults.code,
            )} per GB hour`,
            name: 'Image Storage:',
            qty: +(report.image > 0), // Because of floating precision limit in Freshbooks; qty is always 1 and unit cost reflects total amount
            total_cost: report.imageCost,
            unit_cost: report.imageCost,
        }, projectTax);
    }

    private createObjectsCostItem(report :any, price :any, projectTax :any) :InvoiceLineItem {
        return this.createInvoiceLineItem({
            desc: `Total usage of ${
                formatNumber(report.objects)
            } GB hour charged at ${
                formatCurrency(
                    price.objectsPrice,
                    this.apiConfig.invoiceDefaults.code,
            )} per GB hour`,
            name: 'Object Storage:',
            qty: +(report.objects > 0), // Because of floating precision limit in Freshbooks; qty is always 1 and unit cost reflects total amount
            total_cost: report.objectsCost,
            unit_cost: report.objectsCost,

        }, projectTax);
    }

    private createVolumeCostItem(report :any, price :any, projectTax :any) :InvoiceLineItem {
        return this.createInvoiceLineItem({
            desc: `Total usage of ${
                formatNumber(report.volume)
            } GB hour charged at ${
                formatCurrency(
                    price.volumePrice,
                    this.apiConfig.invoiceDefaults.code,
            )} per GB hour`,
            name: 'Volume Storage:',
            qty: +(report.volume > 0), // Because of floating precision limit in Freshbooks; qty is always 1 and unit cost reflects total amount
            total_cost: report.volumeCost,
            unit_cost: report.volumeCost,

        }, projectTax);
    }

    private createExtraBillingItems = (projectName :string, projectTax :any) => (
        typeof this.extras[projectName] === 'undefined'
            ? []
            : this.extras[projectName].map(item => this.createInvoiceLineItem(item, projectTax)));

    private createInvoicePayLoad = (
        report :any,
        price :any,
        customerID :number,
        invoiceNumber :string,
        cashOnly :boolean,
        taxes :any,
    ) :Invoice => {
        const projectTax = taxes[report.project_name];

        // create line items for cpu, volume and image
        const cpuCostItem = this.createCPUCostItem(report, price, projectTax);
        const imageCostItem = this.createImageCostItem(report, price, projectTax);
        const objectsCostItem = this.createObjectsCostItem(report, price, projectTax);
        const volumeCostItem = this.createVolumeCostItem(report, price, projectTax);

        const invoiceLines = [
            cpuCostItem,
            imageCostItem,
            objectsCostItem,
            volumeCostItem,
        ].concat(
            // check if there are extra billing items for this project
            this.createExtraBillingItems(report.project_name, projectTax),
        );

        this.invoiceSummary = `${
            this.apiConfig.invoiceDefaults.notesprefix}\n${
            `${INVOICE_TEXT}${report.project_name}".`
                .replace('<month>', report.month)
                .replace('<year>', report.year)}\n${
            this.apiConfig.invoiceDefaults.notessuffix
        }`;

        return {
            invoice: {
                allowed_gatewayids: cashOnly // allow credit cards if customer is not cash only
                    ? []
                    : this.apiConfig.invoiceDefaults.allowed_gatewayids,
                create_date: new Date().toISOString().slice(0, 10),
                currency_code: this.apiConfig.invoiceDefaults.code,
                customerid: customerID,
                discount_value: price.discount,
                due_offset_days: this.apiConfig.invoiceDefaults.invoice_due_days,
                invoice_number: invoiceNumber,
                lines: invoiceLines,
                notes: this.invoiceSummary,
                presentation: this.apiConfig.invoiceDefaults.presentation,
                template: this.apiConfig.invoiceDefaults.template,
                terms: this.apiConfig.invoiceDefaults.terms,
            },
        };
    }

    private createInvoice = async (
        report :any,
        price :any,
        customerID :number,
        invoiceNumber :string,
        cashOnly :boolean,
        taxes :any,
    ) :Promise<string> => {
        const invoicePayload = this.createInvoicePayLoad(
            report,
            price,
            customerID,
            invoiceNumber,
            cashOnly,
            taxes,
        );

        return axios.post(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/invoices/invoices`,
            invoicePayload,
            {
                headers: this.headers,
                httpsAgent: this.agent,
            },
        )
            .then(response => {
                this.logger.info('Invoice created successfully for customerID');
                return response.data.response.result.invoice.id;
            })
            .catch(error => {
                // TODO: handle deleted invoices by reusing them?
                // https://www.freshbooks.com/api/active_deleted
                this.logger.error(`at freshbooks/createInvoice: FreshbooksAPI request failure, creating invoice for client ${customerID}`, error.response.statusText);
                throw new Error(error.response);
            });
    }

    private getNewInvoiceEmailInfo = (
        report :any,
        customerEmails :Array<string>,
        emailRecipients :any,
    ) => ({
        invoice: {
            action_email: true,
            email_body: this.invoiceSummary,
            email_recipients: emailRecipients.oicr_finance_email
                .concat(customerEmails)
                .concat(emailRecipients.invoice_recipients),
            email_subject: `OICR Collaboratory sent an invoice for project "${report.project_name}"`,
        },
    });

    private emailInvoice = async (
        invoiceID :string,
        json :any,
    ) :Promise<any> => axios.put(
        `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/invoices/invoices/${invoiceID}`,
        json,
        {
            headers: this.headers,
            httpsAgent: this.agent,
        },
    )
        .then(({ data }) => data.response.result.invoice)
        .catch(error => {
            this.logger.error('at freshbooks/emailInvoice:', error.response.statusText);
            throw new Error(error.response);
        });

    /*
     * Steps to send Invoice:
     *   1. Get bearer token using the refresh token (lasts 12 hours)
     *   2. Get customer id using the email address from project
     *   3. Create Freshbooks Invoice using the data received
     *   4. Send Invoice using Freshbooks API
     */
    sendInvoice = async (
        customerEmails :any,
        report :any,
        price :any,
        invoiceNumber :string,
        adminUsers :Array<any> = [], // Used by commented out function. Remove?
        emailRecipients :any = [],
        taxes :any = {},
    ) :Promise<any> => {
        await this.authenticate('send invoice');
        // no need to strip off admin emails as some projEcts might have them as PIs
        // let nonOICREmails = this.stripAdminEmails(customerEmails,adminUsers);

        /*
         * Collab has PI and PI's admin staff listed for each project
         * but only PI is primary contact in Freshbooks. We need to
         * iterate over all project emails to get customer id as
         * only one email will belong to the PI.
         */
        const [customerInfo] = await this.findCustomerIDParallel(customerEmails);

        if (customerInfo) {
            const {
                email: customerEmail,
                id: customerID,
            } = customerInfo;

            this.logger.info(`Creating new Invoice in FreshBooks for ${customerEmail}`);

            /**
             * customer is cash only if email domain name is mentioned in the cash only
             * configuration; else, it allows both cash and credit.
             */
            const isCashOnly = customerEmail.includes('@') && (
                this.apiConfig.invoiceDefaults.cash_only_accounts.includes(
                    customerEmail.substring(customerEmail.indexOf('@') + 1).toLowerCase(),
                ));

            const newInvoiceID = await this.createInvoice(
                report,
                price,
                customerID,
                invoiceNumber,
                isCashOnly,
                taxes,
            );

            const emailInfoJson = this.getNewInvoiceEmailInfo(
                report,
                customerEmails,
                emailRecipients,
            );

            this.logger.info(`Emailing Invoice:${invoiceNumber}.`, emailInfoJson);

            return this.emailInvoice(newInvoiceID, emailInfoJson);
        }

        // abort if no customer id could be found
        const errorMessage = `Customer account not found: ${customerEmails.join(', ')}`;

        this.logger.error('at freshbooks/sendInvoice:', errorMessage);
        throw new Error(errorMessage);
    }


    // utils for getInvoicesSummaryData
    private getAllCustomersPaged = async (
        pageNumber :number,
        email :string,
    ) :Promise<any> => axios.get(
        `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/users/clients`,
        {
            headers: this.headers,
            httpsAgent: this.agent,
            params: {
                'include[]': 'recent_contacts',
                page: pageNumber,
                per_page: 100,
                'search[email_like]': email,
            },
        },
    )
        .then(response => response.data.response.result)
        .catch(error => {
            this.logger.error('at freshbooks/getAllCustomersPaged:', error.response.statusText);
            throw new Error(error.response);
        });

    private async getAllCustomersParallel(userEmail :string) :Promise<any> {
        const customers = await this.getAllCustomersPaged(1, userEmail || '');

        if (customers.pages > 1) {
            const responses = await Promise.all(_.range(1, customers.pages).map(i =>
                this.getAllCustomersPaged(i, userEmail || '')));

            customers.clients = customers.customers
                .concat(_.flatten(responses.map(item => item.clients)));
        }

        this.logger.info('Fetched all customers.');

        return customers.clients;
    }

    private getCustomerIDs(customersInfo :any) :any {
        const output = [];
        customersInfo.forEach((customerInfo) => { output.push(customerInfo.id); }, customersInfo);
        return output;
    }

    private getInvoicesListPaged = async (
        pageNumber :number,
        minDate :string, // optional
        maxDate :string, // always expected
        customerIDs :Array<string>,
    ) :Promise<any> => {
        // form the search string
        // use only one of min or max dates : if min date is provided then use it else use max date
        let searchStr = '';
        if (minDate != null) searchStr = `search[date_min]=${minDate}`;
        else searchStr = `search[date_max]=${maxDate}`;
        if (customerIDs != null) {
            // form search string for customer ids
            for (const idx in customerIDs) {
                searchStr += `&search[customerids][]=${customerIDs[idx]}`;
            }
        }

        // Freshbooks limits the max number of responses to 100 per page; hence requesting 100
        return axios.get(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/invoices/invoices?${searchStr}&page=${pageNumber}&include[]=lines&per_page=100`,
            {
                headers: this.headers,
                httpsAgent: this.agent,
            },
        )
            .then(response => response.data.response.result)
            .catch(error => {
                this.logger.error('at freshbooks/getInvoicesListPaged:', error.response.statusText);
                throw new Error(error.response);
            });
    }

    private async getAllInvoicesParallel(date :string, allCustomerIDs :Array<any>) :Promise<any> {
        const minDate = date;
        const maxDate = new Date().toISOString().slice(0, 10);
        const invoices = await this.getInvoicesListPaged(1, minDate, maxDate, allCustomerIDs);

        if (invoices.pages > 1) {
            const pagedInvoices = await Promise.all(_.range(1, invoices.pages)
                .map(i => this.getInvoicesListPaged(i, minDate, maxDate, allCustomerIDs)));

            this.logger.info('Fetched all invoices.');

            return _.flatten(pagedInvoices.map(item => item.invoices));
        }

        this.logger.info('Fetched all invoices.');
        return invoices.invoices;
    }

    private getLineItemValue(value :string, list :Array<any>) {
        const output = _.filter(list, r => r.name.indexOf(value) >= 0);

        return (output.length > 0) ? output[0].amount.amount : '0.00';
    }

    getInvoicesSummaryData = async (date :string, user :any, admin :boolean) => {
        // assumes date is : null or in 'YYYY-MM-DD' format
        await this.authenticate('get invoices summary data');
        let allCustomerIDs = null;

        if (!admin) {
            this.logger.info('Getting customers details from Freshbooks...');
            const customersInfo = await this.getAllCustomersParallel(user.email);
            allCustomerIDs = this.getCustomerIDs(customersInfo);

            if (allCustomerIDs.length === 0) throw Error(`error: No account found for this user account: ${user.email}`);
        }

        // currently we have decided to pull all the invoices and ship it to front end in one go
        const allInvoicesForThisPeriod = await this.getAllInvoicesParallel(date, allCustomerIDs);

        return allInvoicesForThisPeriod.map(item => ({
            costs: {
                cpu: this.getLineItemValue('CPU', item.lines),
                image: this.getLineItemValue('Image', item.lines),
                objects: this.getLineItemValue('Object', item.lines),
                volume: this.getLineItemValue('Volume', item.lines),
                total: item.amount.amount,
            },
            current_organization: item.current_organization,
            date: item.create_date,
            discount: item.discount_value,
            invoice_number: item.invoice_number,
            invoice_status: item.v3_status,
            payment_status: item.payment_status,
        }));
    }


    // utils for emailExistingInvoice
    private async findInvoice(invoiceNumber :string) :Promise<any> {
        return axios.get(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/invoices/invoices`,
            {
                headers: this.headers,
                httpsAgent: this.agent,
                params: { 'search[invoice_number]': invoiceNumber },
            },
        )
            .then(response => {
                return response.data.response.result.invoices[0];
            }).catch(error => {
                throw new Error(error.response);
            });
    }

    private async getCustomerInfo(customerId :string) {
        return axios.get(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/users/clients`,
            {
                headers: this.headers,
                httpsAgent: this.agent,
                params: {
                    'include[]': 'recent_contacts',
                    'search[userid]': customerId,
                },
            },
        )
            .then(response => response.data.response.result.clients[0])
            .catch(error => {
                this.logger.error('at freshbooks/getCustomerInfo', error.response.statusText);
                throw new Error(error.response);
            });
    }

    private validEmailForCustomer = (email :string, customerInfo :any) :boolean => {
        const lowerCasedEmail = email.toLowerCase();
        return _.every([
            email !== '',
            customerInfo.email.toLowerCase() === lowerCasedEmail ||
            !!_.find(
                customerInfo.recent_contacts,
                (contact :any) => contact.email && contact.email.toLowerCase() === lowerCasedEmail,
            ),
        ]);
    }

    private getExistingInvoiceEmailInfo = (customerEmail :string, invoiceNumber :string) => ({
        invoice: {
            action_email: true,
            email_recipients: [customerEmail],
            email_subject: `OICR Collaboratory sent requested invoice: "${invoiceNumber}"`,
        },
    });


    emailExistingInvoice = async (
        customerEmail :string,
        invoiceNumber :string,
        admin :boolean,
    ) :Promise<any> => {
        await this.authenticate('email existing invoice');

        const invoiceInfo = await this.findInvoice(invoiceNumber);
        const customerInfo = await this.getCustomerInfo(invoiceInfo.customerid);

        // email if customerEmail exists in one of the contacts or user is admin
        return (admin || this.validEmailForCustomer(customerEmail, customerInfo))
            ? this.emailInvoice(
                invoiceInfo.id,
                this.getExistingInvoiceEmailInfo(customerEmail, invoiceNumber),
            )
            : Error(`error: User account: ${customerEmail} does not have access to this Invoice: ${invoiceNumber}`);
    }


    getAccessToken = async (refreshToken :string) :Promise<any> => {
        // TODO: if refreshToken (from file) exists... else?
        this.logger.info('Requesting Access Token from FreshBooks...');
        const json = {
            client_id: this.apiConfig.client_id,
            client_secret: this.apiConfig.client_secret,
            grant_type: this.apiConfig.grant_type,
            redirect_uri: this.apiConfig.redirect_uri,
            refresh_token: refreshToken,
        };

        return axios.post(
            `${this.apiConfig.api}/auth/oauth/token`,
            json,
            {
                headers: this.headers,
                httpsAgent: this.agent,
            },
        )
            .then(response => {
                return response.data;
            }).catch(error => {
                throw new Error(error.response);
            });
    }


    getLastInvoiceNumber = async (invoicePrefix = '') :Promise<any> => {
        await this.authenticate('get latest invoice number');

        this.logger.info(`Requesting latest invoice number...${invoicePrefix}`);
        return axios.get(
            `${this.apiConfig.api}/accounting/account/${this.apiConfig.account_id}/invoices/invoices`,
            {
                headers: this.headers,
                httpsAgent: this.agent,
                params: {
                    per_page: 1,
                    'search[invoice_number_like]': invoicePrefix
                        ? invoicePrefix.split('-').shift()
                        : null,
                    sort: 'invoice_number_desc',
                },
            },
        ) // TODO: this doesn't handle deleted/archived invoices.
            .then(({ data }) => data.response.result.invoices[0].invoice_number)
            .catch(error => {
                this.logger.error('at freshbooks/getLastInvoiceNumber', error.response.statusText);
                throw new Error(error.response);
            });
    }
}

export { FreshbooksService, FreshbooksConfig };
