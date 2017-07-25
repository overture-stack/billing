/**
 * /**
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
 *
 * BECAUSE OF THE WAY FRESHBOOKS AUTHENTICATION WORKS; IF WE PLAN TO RUN MULTIPLE INSTANCES OF THIS SERVICE IN PARALLEL
 * WE WILL HAVE TO IMPLEMENT A SYNCHRONISATION MECHANISM AMONG THESE SERVICES AS OF ALL THE SERVICES WILL USE THE SAME
 * FRESHBOOKS APP CREDENTIALS
 */
import axios from 'axios';
import * as https from 'https';
import * as _ from 'lodash';

const INVOICE_TEXT = 'This is a statement for your usage of the Cancer Genome Collaboratory (Collab) ' +
    'resources during the month of ${month}, ${year} for the project : "';

interface InvoiceLineItem {

    amount: {
        amount: number;
        code: string;
    };
    description: string;
    taxName1: string;
    taxAmount1: number;
    name: string;
    qty: number;
    taxName2: string;
    taxAmount2: number;
    type: number;
    unit_cost: {
        amount: number;
        code: string;
    },
    taxNumber1:string

}

interface InvoicePresentation {
    id: number;
    theme_font_name: string;
    theme_primary_color: string;
    theme_layout: string;
    date_format: string;
    image_banner_position_y: number;
    image_logo_src: string;
    image_banner_src: any;
}


interface Invoice {
    "invoice": {
        create_date: string;
        currency_code: string;
        discount_value: number;
        notes: string;
        invoice_number: string;
        template: string;
        terms: string;
        customerid: string;
        due_offset_days: number;
        lines: Array<InvoiceLineItem>;
        presentation: InvoicePresentation;
    }
}

interface FreshbooksInvoiceDefaults {
    terms: string;
    invoice_due_days: number;
    code: string;
    template: string;
    presentation:InvoicePresentation;
    taxNumber1:string;
    taxName1:string;
    taxAmount1:number;
}

interface FreshbooksConfig {

    api: string;
    grant_type: string;
    client_secret: string;
    refresh_token: string;
    client_id: string;
    redirect_uri: string;
    account_id:string;
    oicr_finance_email:string;
    rejectInsecure: boolean;
    invoiceDefaults:FreshbooksInvoiceDefaults;
}


class FreshbooksService {

    /**
     * Dependencies
     */
    private apiConfig: FreshbooksConfig;
    private logger:any;

    /**
     * State
     */
    private token: string;
    private authenticator: any;
    private agent: https.Agent;
    private headers = {
        "Api-Version": `alpha`,
        "Content-Type":`application/json`
    };
    private invoiceSummary :string;

    constructor(config: FreshbooksConfig, authenticator:any, logger:any) {
        this.apiConfig = config;
        this.agent = new https.Agent({
            rejectUnauthorized: config.rejectInsecure
        });
        this.authenticator = authenticator;
        logger != null? this.logger = logger : this.logger = console;
    }


    /*
    Steps to send Invoice:
        1. Get bearer token using the refresh token
        2. Get customer id using the email address from project
        3. Create Freshbooks Invoice using the data received
        4. Send Invoice using Freshbooks API
     */
    public async sendInvoice(customerEmails: any, report: any, price: any, invoiceNumber:string, adminUsers:Array<any>, emailRecipients:any): Promise<any> {
        this.logger.info("Authenticating...");
        await this.authenticate();
        // no need to strip off admin emails as some projcts might have them as PIs
        //let nonOICREmails = this.stripAdminEmails(customerEmails,adminUsers);
        let customerID : number;
        // collab has PI and PI's admin staff listed for each project but only PI is primary contact in Freshbooks
        // we need to iterate over all project emails to get customer id as only one email will belong to PI
        for(var idx in customerEmails){
            let output : any;
            this.logger.info("Requesting customerID from FreshBooks...");
            output = await this.getCustomerID(customerEmails[idx]);
            if(output.length != 0) {
                customerID = output[0].id;
                break;
            }
        }
        // abort if no customer id could be found
        if(customerID == null || typeof customerID == 'undefined' ){
            let flatEmailString = "";
            customerEmails.forEach((email) => flatEmailString = flatEmailString + email + ",");
            throw Error("error: Customer account not found:" + flatEmailString);
        }
        this.logger.info("Creating new Invoice in FreshBooks...");
        let newInvoiceID = await this.createInvoice(report,price,customerID, invoiceNumber);
        let emailInfoJson = this.getNewInvoiceEmailInfo(newInvoiceID,report,customerEmails,emailRecipients);
        this.logger.info("Emailing Invoice:%s ..." , invoiceNumber, emailInfoJson );
        return this.emailInvoice(newInvoiceID,emailInfoJson);
    };

    private stripAdminEmails(emails:Array<any>, adminEmails:Array<any>): Array<string> {
        let output = [];
        // any email that is not an oicr admin is a valid customer email
        for(var idx in emails){
            if(adminEmails.indexOf(emails[idx].toLowerCase()) <0){
                output.push(emails[idx]);
            }
        }
        return output;
    }

    /*
     assumes date is : null or in 'YYYY-MM-DD' format
      */
    public async getInvoicesSummaryData(date:string, user:any, admin:boolean) {
        this.logger.info("Authenticating...");
        await this.authenticate();
        let allCustomerIDs = null;
        if(!admin){
            this.logger.info('Getting customers details from Freshbooks...');
            let customersInfo = await this.getAllCustomersParallel(user.email);
            allCustomerIDs = this.getCustomerIDs(customersInfo);
            if(allCustomerIDs.length == 0) throw Error("error: No account found for this user account: "+ user.email)
        }

        // currently we have decided to pull all the invoices and ship it to front end in one go
        let allInvoicesForThisPeriod = await this.getAllInvoicesParallel(date, allCustomerIDs);
        let flattenedInovicesJson = allInvoicesForThisPeriod.map(item => ({
                'current_organization' : item.current_organization,
                'date' : item.create_date,
                'invoice_number' : item.invoice_number,
                'payment_status' : item.payment_status,
                'invoice_status' : item.v3_status,
                'cpu_cost' : this.getLineItemValue("CPU",item.lines),
                'image_cost' : this.getLineItemValue("Image",item.lines),
                'volume_cost' : this.getLineItemValue("Volume",item.lines),
                'discount' : item.discount_value,
                'total' : item.amount.amount
            })
        );
        return flattenedInovicesJson;
    };

    public async getLastInvoiceNumber(): Promise<any>{
        this.logger.info("Authenticating...");
        await this.authenticate();
        this.logger.info("Requesting last invoice number...");
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices?sort=invoice_date_desc&per_page=1`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result.invoices[0].invoice_number;
            }).catch(err => {
                throw new Error(err.response.statusText);
            })
    }

    private async getAllInvoicesParallel(date:string, allCustomerIDs:Array<any>): Promise<any>{
        let minDate = date;
        let maxDate = new Date().toISOString().slice(0,10);
        let invoices = await this.getInvoicesListPaged(1,minDate, maxDate, allCustomerIDs);
        if (invoices.pages > 1) {
             let responses = await Promise.all(_.range(1, invoices.pages).map(i =>
                    this.getInvoicesListPaged(i, minDate, maxDate, allCustomerIDs)))
             invoices.invoices = invoices.invoices.concat(_.flatten(responses.map(item => item.invoices)));
        }
        this.logger.info("Fetched all invoices.");

        return invoices.invoices;
    }

    private async getAllCustomersParallel(userEmail:string): Promise<any>{
        let customers = await this.getAllCustomersPaged(1, userEmail || "");
        if (customers.pages > 1) {
            let responses = await Promise.all(_.range(1, customers.pages).map(i =>
                    this.getAllCustomersPaged(i, userEmail || "")));

            customers.clients = customers.customers.concat(_.flatten(responses.map(item => item.clients)))
        }

        this.logger.info("Fetched all customers.");

        return customers.clients;
    }

    private async getAllCustomersPaged(pageNumber: number, email:string): Promise<any> {
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/users/clients?include[]=recent_contacts&search[email_like]=${ email }&page=${ pageNumber }&per_page=100`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    }

    private getCustomerIDs(customersInfo:any): any{
        let output = [];
        customersInfo.forEach((customerInfo) => {output.push(customerInfo.id)}, customersInfo);
        return output;
    }

    public async emailExistingInvoice(customerEmail:string, invoiceNumber: string): Promise<any> {
        await this.authenticate();
        let invoiceInfo = await this.findInvoice(invoiceNumber);
        let customerInfo = await this.getCustomerInfo(invoiceInfo.customerid);
        // email if customerEmail exists in one of the contacts
        if(!this.validEmailForCustomer(customerEmail,customerInfo))
            throw Error("error: User account: "+ customerEmail +" does not have access to this Invoice: "+invoiceNumber );
        let emailInfoJson = this.getExistingInvoiceEmailInfo(customerEmail,invoiceNumber);
        return this.emailInvoice(invoiceInfo.id,emailInfoJson);
    }

    private validEmailForCustomer(email:string, customerInfo:any): boolean{
        let lowerCasedEmail = email.toLowerCase();
        return _.every([
            email !== '',
            customerInfo.email.toLowerCase() == lowerCasedEmail ||
            !!_.find(customerInfo.recent_contacts, (contact:any) =>  contact.email && contact.email.toLowerCase() == lowerCasedEmail)
        ]);
    }

    private async findInvoice(invoiceNumber:string): Promise<any> {
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices?search[invoice_number]=${invoiceNumber}`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result.invoices[0];
            }).catch(err => {
                throw new Error(err.response.statusText);
            })
    }

    private async getCustomerInfo(customerId:string){
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/users/clients?search[userid]=${customerId}&include[]=recent_contacts`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result.clients[0];
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    }

    private getLineItemValue(value : string, list:Array<any>) {
        let output = _.filter(list, r => r['name'].indexOf(value) >= 0);
        if(output.length > 0)
            return output[0]['amount']['amount'];
        else return 0.0;
    }

    /*
     uses either minDate or maxDate
     assumes: minDate is optional; maxDate is always provided
      */
    private async getInvoicesListPaged(pageNumber: number, minDate: string, maxDate: string, customerIDs:Array<string>) : Promise<any> {
        // form the search string
        // use only one of min or max dates : if min date is provided then use it else use max date
        let searchStr = '';
        if(minDate != null )
            searchStr = 'search[date_min]='+minDate;
        else
            searchStr = 'search[date_max]='+maxDate;
        if(customerIDs != null){
            // form search string for customer ids
            for(let idx in customerIDs){
                searchStr += '&search[customerids][]='+customerIDs[idx]
            }
        }
        // Freshbooks limits the max number of responses to 100 per page; hence requesting 100
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices?${ searchStr }&page=${ pageNumber }&include[]=lines&per_page=100`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    };


    private async authenticate(){
        if(this.authenticator != null){
            this.token =  await this.authenticator.getLatestAccessToken();
            this.headers["Authorization"] = "Bearer " + this.token;
        } else {
            throw new Error("error: No authenticator provided.");
        }
    };

    public async getAccessToken(refreshToken:string) : Promise<any> {
        this.logger.info("Requesting Access Token from FreshBooks...");
        let json = {
            "grant_type": this.apiConfig.grant_type,
            "client_secret": this.apiConfig.client_secret,
            "refresh_token": refreshToken,
            "client_id": this.apiConfig.client_id,
            "redirect_uri": this.apiConfig.redirect_uri
        };
        return axios.post(`${ this.apiConfig.api }/auth/oauth/token`, json,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    };

    private async getCustomerID(email:string) : Promise<any> {
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/users/clients?search[email]=${email}`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result.clients;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });

    }

    private async createInvoice(report: any, price:any, customerID:number, invoiceNumber:string): Promise<string> {
        let invoicePayload = this.createInvoicePayLoad(report,price,customerID, invoiceNumber);
        return axios.post(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices`,
            invoicePayload,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data.response.result.invoice.id;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    }

    private getNewInvoiceEmailInfo(invoiceID:string, report:any, customerEmails:Array<string>,emailRecipients:any){
        let json = {
            "invoice": {
                "email_subject": 'OICR Collaboratory sent an invoice for project "' + report.project_name+ '"',
                "email_body": this.invoiceSummary,
                "email_recipients":emailRecipients.oicr_finance_email.concat(customerEmails).concat(emailRecipients.invoice_recipients),
                "action_email": true
            }
        };
        return json;
    }

    private getExistingInvoiceEmailInfo(customerEmail:string, invoiceNumber:string){
        let json = {
            "invoice": {
                "email_subject": 'OICR Collaboratory sent requested invoice: "' + invoiceNumber+ '"',
                "email_recipients":[customerEmail],
                "action_email": true
            }
        };
        return json;
    }

    private async emailInvoice(invoiceID:string, json:any): Promise<any> {
        return axios.put(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices/${ invoiceID }`,
            json,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                return response.data;
            }).catch(err => {
                throw new Error(err.response.statusText);
            });
    }

    private createInvoicePayLoad(report: any, price:any, customerID:number, invoiceNumber:string) : Invoice {

        // create line items for cpu, volume and image
        let cpuCostItem = this.createCPUCostItem(report, price);
        let volumeCostItem = this.createVolumeCostItem(report, price);
        let imageCostItem = this.createImageCostItem(report, price);
        let creationDate = new Date();
        let creationDateText = creationDate.toISOString().slice(0,10);
        this.invoiceSummary = INVOICE_TEXT;
        this.invoiceSummary = this.invoiceSummary.replace("${month}", report.month);
        this.invoiceSummary = this.invoiceSummary.replace("${year}", report.year);
        this.invoiceSummary += report.project_name + '".';
        return {"invoice": {
            create_date: creationDateText,
            currency_code: this.apiConfig.invoiceDefaults.code,
            discount_value: price.discount,
            notes: this.invoiceSummary,
            invoice_number: invoiceNumber,
            template: this.apiConfig.invoiceDefaults.template,
            terms: this.apiConfig.invoiceDefaults.terms,
            customerid: customerID+"",
            due_offset_days:this.apiConfig.invoiceDefaults.invoice_due_days,
            lines: [cpuCostItem,volumeCostItem,imageCostItem],
            presentation:this.apiConfig.invoiceDefaults.presentation
            }
        }

    };

    private createCPUCostItem(report:any, price:any): InvoiceLineItem {
        return  {

            amount: {
                amount: report.cpuCost,
                code: this.apiConfig.invoiceDefaults.code
            },
            description: "",
            taxName1: this.apiConfig.invoiceDefaults.taxName1,
            taxAmount1: this.apiConfig.invoiceDefaults.taxAmount1,
            name: "CPU (Core) / Hour:",
            qty: report.cpu,
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: price.cpuPrice,
                code: this.apiConfig.invoiceDefaults.code
            },
            taxNumber1:this.apiConfig.invoiceDefaults.taxNumber1
        };
    }

    private createVolumeCostItem(report:any, price:any): InvoiceLineItem {
        return  {

            amount: {
                amount: report.volumeCost,
                code: this.apiConfig.invoiceDefaults.code
            },
            description: `Calculated based on: Total Usage/Hour this month: ${report.volume} x ${price.volumePrice} ${this.apiConfig.invoiceDefaults.code} per GB hour of storage`,
            taxName1: this.apiConfig.invoiceDefaults.taxName1,
            taxAmount1: this.apiConfig.invoiceDefaults.taxAmount1,
            name: "Volume Storage:",
            qty: 1,//report.volume : Because of floating precision limit in Freshbooks; qty is always 1 and unit cost reflects total amount
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: report.volumeCost,//price.volumePrice,
                code: this.apiConfig.invoiceDefaults.code
            },
            taxNumber1:this.apiConfig.invoiceDefaults.taxNumber1

        };
    }

    private createImageCostItem(report:any, price:any): InvoiceLineItem {
        return  {

            amount: {
                amount: report.imageCost,
                code: this.apiConfig.invoiceDefaults.code
            },
            description: `Calculated based on: Total Usage/Hour this month: ${report.image} x ${price.imagePrice} ${this.apiConfig.invoiceDefaults.code} per GB hour of storage`,            taxName1: this.apiConfig.invoiceDefaults.taxName1,
            taxAmount1: this.apiConfig.invoiceDefaults.taxAmount1,
            name: "Image Storage:",
            qty: 1,// Because of floating precision limit in Freshbooks; qty is always 1 and unit cost reflects total amount
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: report.imageCost,//price.imagePrice,
                code: this.apiConfig.invoiceDefaults.code
            },
            taxNumber1:this.apiConfig.invoiceDefaults.taxNumber1

        };
    }

}

export { FreshbooksService, FreshbooksConfig };