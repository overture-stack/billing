/**
 * Created by rverma on 6/22/17.
 */
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as json2csv from 'json2csv';

class InvoiceServiceClient {

    /**
     * Dependencies
     */
    private apiConfig: any;
    private apiRootURL: string;


    constructor(config: any) {
        this.apiRootURL = config.api;

    }

    public async sendInvoice(projectEmail: any, report: any, price: any) {
        let invoicePayload = {
            'email':projectEmail,
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
        return axios.get(`${ this.apiRootURL }/getAllInvoices`)
            .then( response => {
                console.log(response.data);
                return response.data;
            });
    }


}

export { InvoiceServiceClient };