/**
 * Created by rverma on 6/22/17.
 *
 * BECAUSE OF THE WAY FRESHBOOKS AUTHENTICATION WORKS; IF WE PLAN TO RUN MULTIPLE INSTANCES OF THIS SERVICE IN PARALLEL
 * WE WILL HAVE TO IMPLEMENT A SYNCHRONISATION MECHANISM AMONG THESE SERVICES AS OF ALL THE SERVICES WILL USE THE SAME
 * FRESHBOOKS APP CREDENTIALS
 */
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
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
    }
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
    code: string;
    template: string;
    presentation:InvoicePresentation;
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

    /**
     * State
     */
    private token: string;
    private agent: https.Agent;
    private headers = {
        "Api-Version": `alpha`,
        "Content-Type":`application/json`
    };
    private invoiceSummary :string;

    constructor(config: FreshbooksConfig) {
        this.apiConfig = config;
        this.agent = new https.Agent({
            rejectUnauthorized: config.rejectInsecure
        });
    }


    /*
    Steps to send Invoice:
        1. Get bearer token using the refresh token//TODO: where to store refresh token
        2. Get customer id using the email address from project //TODO
        3. Create Freshbooks Invoice using the data received
        4. Send Invoice using Freshbooks API
     */
    public async sendInvoice(collabProject: any, report: any, price: any) {
        if(this.token == null)
            await this.authenticate()
        console.log("Sending request to FreshBooks for: Customer ID");
        //TODO: hard coding value as of now as test collab doesn't have any email address
        let customerID = await this.getCustomerID("ra.vrma@gmail.com");
        console.log("Sending request to FreshBooks for: Create new Invoice");
        let newInvoiceID = await this.createInvoice(report,price,customerID);
        console.log("Sending request to FreshBooks for: Send Invoice:" + newInvoiceID);
        this.emailInvoice(newInvoiceID,report);


    };

    public async getInvoicesSummaryData() {
        if(this.token == null)
            await this.authenticate()
        let currentDate = new Date();
        let pageCount = 1; let pageIdx = 1;
        let allInvoicesForThisPeriod = [];
        //TODO: how we want to do pagination
        while(pageCount  >= pageIdx){
            let invoiceResults = await this.getInvoicesListPaged(pageIdx,currentDate.toISOString().slice(0,10));
            allInvoicesForThisPeriod = allInvoicesForThisPeriod.concat(invoiceResults.invoices);
            //update page count as the first result tells total count of pages
            if(pageCount == 1) pageCount = invoiceResults.pages;
            pageIdx++;
        }// while loop ends here
        let flattenedInovicesJson = [];
        _.each(allInvoicesForThisPeriod, (item) => {
            flattenedInovicesJson.push({
                'current_organization' : item.current_organization,
                'date' : item.create_date,
                'cpu_cost' : this.getLineItemValue("CPU",item.lines),
                'image_cost' : this.getLineItemValue("Image",item.lines),
                'volume_cost' : this.getLineItemValue("Volume",item.lines),
                'discount' : item.discount_value,
                'total' : item.amount.amount
            });
        });
        return flattenedInovicesJson;
    };

    private getLineItemValue(value : string, list:Array<any>) {
        let output = _.filter(list, r => r['name'].indexOf(value) >= 0);
        if(output.length > 0)
            return output[0]['amount']['amount'];
        else return 0.0;
    }
    private async getInvoicesListPaged(pageNumber: number, dateString: string) : Promise<any> {
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices?search[date_max]=${ dateString }&page=${ pageNumber }&include[]=lines&per_page=100`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                console.log(response.data);
                return response.data.response.result;
            });
    };

    private async authenticate(){
        console.log("Sending request to FreshBooks for: Access Token");
        //let bearerTokenResponse = await this.getAccessToken();
        this.token = "b35c7dd1af1b35761bd621c86fa5ad2669ed9dae06cb7a061471a5afa325cb8a";
        this.headers["Authorization"] = "Bearer " + this.token;


    };

    private async getAccessToken() : Promise<any> {
        let json = {
            "grant_type": "refresh_token",
            "client_secret": "7ac2208c9df4486869a25685623c1125c38707984e05cee546a233b0d12b3469",
            "refresh_token": "39386d6d8963c01736c118439a12d456d1c6209dcf4d336bda080d5358079a86",
            "client_id": "56eedeed6a08385e1ff3414c5dcce50c03b7eb68a095c8172b0a5cf1974b9374",
            "redirect_uri": "https://testpaymenturlforPIs.com"
        };
        return axios.post(`${ this.apiConfig.api }/auth/oauth/token`, json,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                this.token = response.data.access_token;
                console.log("NEW TOKEN:  " + response.data.access_token);
                console.log("NEW REFRESH TOKEN:  " + response.data.refresh_token);
                let accessTokenText = "Access token: " + this.token + "\r\n" +
                    "Refresh token: " + response.data.refresh_token;
                fs.writeFile('freshbooks-tokens.txt', accessTokenText, function(err) {
                    if (err) throw err;
                    console.log('freshbooks-tokens.txt saved');
                });
                return response.data;
            });
    };

    private async getCustomerID(email:string) : Promise<number> {
        return axios.get(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/users/clients?search[email]=${email}`,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                console.log(response.data);
                return response.data.response.result.clients[0].id;
            });

    }

    private async createInvoice(report: any, price:any, customerID:number): Promise<string> {
        let invoicePayload = this.createInvoicePayLoad(report,price,customerID);
        return axios.post(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices`,
            invoicePayload,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                console.log(response.data);
                return response.data.response.result.invoice.id;
            });
    }

    private async emailInvoice(invoiceID:string, report:any): Promise<any> {
        let json = {
            "invoice": {
                "email_subject": 'OICR Collaboratory sent an invoice for project "' + report.project_name+ '"',
                "email_body": this.invoiceSummary,
                "email_recipients":[this.apiConfig.oicr_finance_email,
                                    "ra.v.r.ma@gmail.com"],
                "action_email": true
            }
        };
        return axios.put(`${ this.apiConfig.api }/accounting/account/${ this.apiConfig.account_id }/invoices/invoices/${ invoiceID }`,
            json,
            {headers: this.headers, httpsAgent: this.agent })
            .then( response => {
                console.log(response.data);
                return response.data;
            });
    }
    private createInvoicePayLoad(report: any, price:any, customerID:number) : Invoice {

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
            invoice_number: Math.floor((Math.random() * 1000000) + 1)+"",//TODO: Invoice id generation
            template: this.apiConfig.invoiceDefaults.template,
            terms: this.apiConfig.invoiceDefaults.terms,
            customerid: customerID+"",
            due_offset_days:60,//TODO: check how many days later invoice is due
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
            taxName1: "",
            taxAmount1: null,
            name: "CPU (Core):",
            qty: report.cpu,
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: price.cpuPrice,
                code: this.apiConfig.invoiceDefaults.code
            }
        };
    }
    private createVolumeCostItem(report:any, price:any): InvoiceLineItem {
        return  {

            amount: {
                amount: report.volumeCost,
                code: this.apiConfig.invoiceDefaults.code
            },
            description: "",
            taxName1: "",
            taxAmount1: null,
            name: "Volume (GB):",
            qty: report.volume,
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: price.volumePrice,
                code: this.apiConfig.invoiceDefaults.code
            }
        };
    }
    private createImageCostItem(report:any, price:any): InvoiceLineItem {
        return  {

            amount: {
                amount: report.imageCost,
                code: this.apiConfig.invoiceDefaults.code
            },
            description: "",
            taxName1: "",
            taxAmount1: null,
            name: "Image (GB):",
            qty: report.image,
            taxName2: null,
            taxAmount2: null,
            type: 0,
            unit_cost: {
                amount: price.imagePrice,
                code: this.apiConfig.invoiceDefaults.code
            }
        };
    }

}

export { FreshbooksService };