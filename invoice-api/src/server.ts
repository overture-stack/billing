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
 */

"use strict";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as fs from 'fs';
import {FreshbooksService} from "./service/freshbooks";
import {FreshBooksAuth} from "./global/freshbooks-auth";
import * as cors from 'cors';
import * as morgan from 'morgan';
import * as winston from 'winston';

let app: express.Application;
let config : any;
let freshbooksAuth : FreshBooksAuth;

app = express();

// bodyParser will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());


let port = process.env.PORT || 4000;


/**
 * Argument Parsing for Config Path and auth file path
 */
let args = process.argv;
if (args.length < 4) {
    console.log('Missing arguments');
    process.exit(1);
}
let configPath = args[2];
config = JSON.parse(fs.readFileSync(configPath).toString());
/*
 Configure logger
 */
const tsFormat = () => ( new Date() ).toLocaleDateString() + '  ' + ( new Date() ).toLocaleTimeString();
let logFolder = config['logs'];
let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({filename: logFolder + 'invoice.log', 'timestamp':tsFormat,colorize: true})
    ]
});


// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(logFolder + 'invoiceAccess.log', {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));

let authFilePath = args[3];

// create freshbooks authentication module instance;
// this instance will be used for authentication with freshbooks throughout application lifecycle
freshbooksAuth = new FreshBooksAuth(config['freshbooksConfig'], authFilePath, logger);

// make authenticator available globally
app.set('settings', {authenticator: freshbooksAuth});

//configure routes
routes();
app.listen(port);
logger.info("Invoice Service started");

function isAdminUser(user:any, adminUsers:Array<any>): boolean {
    let userEmail = (user.email == null || user.email == "") ?  "":user.email.toLowerCase();
    let username = (user.username == null || user.username == "") ?  "":user.username.toLowerCase();
    let lowerCaseList = listLowerCase(adminUsers);
    return (lowerCaseList.indexOf(userEmail) >= 0 || lowerCaseList.indexOf(username) >= 0);

};

function listLowerCase(list: Array<any>){
    let lowerCaseList = [];
    list.forEach((item) => {
        let output = (item == null || item == "") ?  "":item.toLowerCase();
        lowerCaseList.push(output);}
    );
    return lowerCaseList;
}
/**
 * Configure routes
 */
function routes() {

    //get router
    let router: express.Router;
    router = express.Router();

    // create routes
    // create and email new invoice
    router.post("/emailNewInvoice", function(req, res){
        // only admin user can email a new invoice
        if(req.body.hasOwnProperty("user")){
            if(!isAdminUser(req.body['user'],config['oicr_admins'])) {
                res.status(500).send({error: 'This user is not authorized to create a new invoice'});
                return;
            }
        } else {
            res.status(500).send({ error: 'Only admin user can create a new invoice' });
            return;
        }

        let emails = req.body['emails'];
        let report = req.body['report'];
        let price = req.body['price'];
        let invoiceNumber = req.body['invoiceNumber'];
        let fbService = new FreshbooksService(config['freshbooksConfig'], req.app.get('settings').authenticator, logger);
        fbService.sendInvoice(emails, report, price,invoiceNumber,listLowerCase(config['oicr_admins']), config['emailRecipients']).then(() => {
            res.send("Invoice generated.");
        }).catch(err => {
            res.status(500).send(err);
        });

    });

    // get list of all invoices
    router.post("/getAllInvoices", function(req, res){
        let fbService = new FreshbooksService(config['freshbooksConfig'], req.app.get('settings').authenticator, logger);
        if(req.query.hasOwnProperty("date")){
            // get all invoices generated on a specific date
            let queryDate = req.query.date;
            // validate date string
            let matcher = /^(\d{4})[-](0[1-9]|1[0-2])[-](0[1-9]|[12]\d|30|31)$/.exec(queryDate);
            if (matcher == null){
                res.status(500).send({ error: 'Invalid date format. Please use YYYY-MM-DD' });
                return;
            }
            fbService.getInvoicesSummaryData(queryDate, req.body['user'],
                isAdminUser(req.body['user'],config['oicr_admins'])).then(invoicesData => {
                res.json(invoicesData);
            }).catch(err => {
                res.status(500).send(err);
            });
        } else {
            // get all invoices generated till date
            fbService.getInvoicesSummaryData(null, req.body['user'],
                isAdminUser(req.body['user'],config['oicr_admins'])).then(invoicesData => {
                res.json(invoicesData);
            }).catch(err => {
                res.status(500).send(err);
            });
        }
    });

    // email an invoice to logged in user
    router.get("/emailInvoice", function(req, res){

        let email = req.query.email;
        let invoiceNumber = req.query.invoice;
        if(email == null || email == ''){
            res.status(500).send({error: 'Invalid user email.'});
            return;
        }
        if(invoiceNumber == null || invoiceNumber == ''){
            res.status(500).send({error: 'Invalid Invoice number'});
            return;
        }
        try{
             Number(invoiceNumber)
        } catch(ex){
            res.status(500).send({error: 'Invalid Invoice number.'});
            return;
        }
        let fbService = new FreshbooksService(config['freshbooksConfig'], req.app.get('settings').authenticator, logger);
        fbService.emailExistingInvoice(email,invoiceNumber).then(() => {
            res.send("Invoice emailed.");
        }).catch(err => {
            res.status(500).send(err);
        });
    });

    // get inovice number of last created invoice
    router.get("/getLastInvoiceNumber", function(req, res){
        // only admin user can lookup all invoices details
        if(req.query.hasOwnProperty("username") || req.query.hasOwnProperty("email")){
            if(!isAdminUser({"username": req.query['username'], "email":req.query['email']},config['oicr_admins'])) {
                res.status(500).send({error: 'This user is not authorized to perform this function'});
                return;
            }
        } else {
            res.status(500).send({ error: 'Only admin user can lookup last invoice details' });
            return;
        }

        let fbService = new FreshbooksService(config['freshbooksConfig'], req.app.get('settings').authenticator, logger);
        fbService.getLastInvoiceNumber().then((invoiceNumber) => {
            res.send(invoiceNumber);
        }).catch(err => {
            res.status(500).send(err);
        });
    });
    //use router middleware
    app.use('/invoice', router);
}
