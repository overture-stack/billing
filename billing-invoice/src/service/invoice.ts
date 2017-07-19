/**
 * Created by rverma on 6/22/17.
 */
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as json2csv from 'json2csv';
/*
* REDUNTANT CODE
* */
class InvoiceServiceClient {

    /**
     * Dependencies
     */
    private apiRootURL: string;


    constructor(config: any) {
        this.apiRootURL = config.api;

    }

    public async sendInvoice(projectEmails: any, report: any, price: any) {
        let invoicePayload = {
            'emails':projectEmails,
            'report' : report,
            'price' : price
        };
        return axios.post(`${ this.apiRootURL }/emailNewInvoice`, invoicePayload)
            .then( response => {
                console.log(response.data);
                //return response.data.response.result.invoice.id;
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
        let currentDate = new Date();
        let dateText = currentDate.toISOString().slice(0,10);
        return axios.get(`${ this.apiRootURL }/getAllInvoices?date=${ dateText }`)
            .then( response => {
                //console.log(response.data);
                return response.data;
            });
    }


}

//export { InvoiceServiceClient };