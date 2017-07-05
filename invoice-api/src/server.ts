"use strict";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as fs from 'fs';
import {FreshbooksService} from "./service/freshbooks";
import * as cors from 'cors';

let app: express.Application;
let config : any;
let freshbooksService : FreshbooksService;



app = express();

// bodyParser will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

let port = process.env.PORT || 4000;

let args = process.argv;
let configPath = args[2];
config = JSON.parse(fs.readFileSync(configPath).toString());
// TODO: refactor authentication so that all requests are not using same Freshbooks instance
freshbooksService = new FreshbooksService(config['freshbooksConfig']);

//configure routes
routes();
app.listen(port);
console.log("Application started");


/**
 * Configure routes
 */
function routes() {

    //get router
    let router: express.Router;
    router = express.Router();

    //create routes
    // create and email new invoice
    router.post("/emailNewInvoice", function(req, res){
        let email = req.body['email'];
        let report = req.body['report'];
        let price = req.body['price'];
        freshbooksService.sendInvoice(email, report, price).then(() => {
            res.send("Invoice generated.");
        }).catch(err => {
            res.status(500).send(err);
        });

    });

    // get list of all invoices
    router.get("/getAllInvoices", function(req, res){
        if(req.query.hasOwnProperty("date")){
            // get all invoices generated on a specific date
            let queryDate = req.query.date;
            // validate date string
            let matcher = /^(\d{4})[-](0[1-9]|1[0-2])[-](0[1-9]|[12]\d|30|31)$/.exec(queryDate);
            if (matcher == null){
                res.status(500).send({ error: 'Invalid date format. Please use YYYY-MM-DD' });
                return;
            }
            freshbooksService.getInvoicesSummaryData(queryDate).then(invoicesData => {
                res.json(invoicesData);
            }).catch(err => {
                res.status(500).send(err);
            });
        } else {
            // get all invoices generated till date
            freshbooksService.getInvoicesSummaryData(null).then(invoicesData => {
                res.json(invoicesData);
            }).catch(err => {
                res.status(500).send(err);
            });
        }
    });

    //use router middleware
    app.use('/invoice', router);
}
