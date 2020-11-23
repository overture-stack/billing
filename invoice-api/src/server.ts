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
 */


import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as cors from 'cors';
import * as morgan from 'morgan';
import * as winston from 'winston';
import { format } from 'logform';
import { FreshBooksAuth } from './global/freshbooks-auth';
import { FreshbooksService } from './service/freshbooks';

const app :express.Application = express();

// bodyParser will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());


const port = process.env.PORT || 4000;

/**
 * Argument Parsing for Config Path and auth file path
 * The auth file carries a refresh token, result of the initial
 */
const [
    ,
    ,
    configPath = 'config.js',
    authFilePath = 'freshbooks.auth',
] = process.argv;

const config :any = configPath.endsWith('.js')
    ? module.require(`${['/', '.'].includes(configPath[0]) ? '' : '../'}${configPath}`)
    // ? module.require(`${['/', '.'].includes(configPath[0]) ? '' : './'}${configPath}`)
    : JSON.parse(fs.readFileSync(configPath).toString());
/*
 Configure logger
 */
const tsFormat = () => (new Date()).toLocaleDateString('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    year: 'numeric',
});
const logFolder = config.logs || '';

const logger = winston.createLogger({
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: tsFormat() }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: `${logFolder}invoice.log` })],
});


// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(`${logFolder}invoiceAccess.log`, { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));


// create freshbooks authentication module instance;
// this instance will be used for authentication with freshbooks throughout application lifecycle
const freshbooksAuth :FreshBooksAuth = new FreshBooksAuth(
    config.freshbooksConfig,
    authFilePath,
    logger,
);

// make authenticator available globally
app.set('settings', { authenticator: freshbooksAuth });

const listLowerCase = (list :Array<any>) => list.map(
    (adminUser = '') => (typeof adminUser === 'string' ? adminUser.toLowerCase() : ''),
);

const isAdminUser = (
    {
        email = '',
        username = '',
    },
    adminUsers :Array<any> = [],
) :boolean => {
    const lowerCaseList = listLowerCase(adminUsers);
    return (
        lowerCaseList.includes(email.toLowerCase()) ||
        lowerCaseList.includes(username.toLowerCase())
    );
};

const createFBServiceObject = (settings :any) :FreshbooksService => new FreshbooksService(
    config.freshbooksConfig,
    settings.authenticator,
    logger,
    config.extra_billing_items,
);


/**
 * Configure routes
 */
const router :express.Router = express.Router();

// create and email new invoice
router.post('/emailNewInvoice', ({
    app: reqApp,
    body: {
        emails = [],
        invoiceNumber = '',
        price = '',
        report,
        user = {},
    },
}, res) => {
    if (user) {
        // only admin user can email a new invoice
        if (isAdminUser(user, config.oicr_admins)) {
            const fbService = createFBServiceObject(reqApp.get('settings'));
            return fbService.sendInvoice(
                emails,
                report,
                price,
                invoiceNumber,
                listLowerCase(config.oicr_admins),
                config.emailRecipients,
                config.taxes,
            )
                .then(response => {
                    logger.info('Invoice generated.');
                    return res.send(response);
                })
                .catch(error => {
                    logger.error('500 from /emailNewInvoice: ', error);
                    return res.status(500).send(error);
                });
        }

        logger.error(`500 from /emailNewInvoice: ${user} is not authorized to create a new invoice`);
        return res.status(500).send({ error: 'This user is not authorized to create a new invoice' });
    }

    logger.error('500 from /emailNewInvoice: No user was given to this request');
    return res.status(500).send({ error: 'No user was given to this request' });
});

// get list of all invoices
router.post('/getAllInvoices', ({
    app: reqApp,
    body: {
        user = {},
    },
    query: {
        date: queryDate = '',
    },
}, res) => {
    const fbService = createFBServiceObject(reqApp.get('settings'));
    const isAdmin = isAdminUser(user, config.oicr_admins);

    if (queryDate) {
        // get all invoices generated on a specific date
        // validate date string
        const matcher = /^(\d{4})[-](0[1-9]|1[0-2])[-](0[1-9]|[12]\d|30|31)$/.exec(queryDate);

        if (matcher == null) {
            logger.error('500 from /getAllInvoices: Invalid date format.');
            return res.status(500).send({ error: 'Invalid date format. Please use YYYY-MM-DD' });
        }

        return fbService.getInvoicesSummaryData(
            queryDate,
            user,
            isAdmin,
        )
            .then(invoicesData => res.status(200).json(invoicesData))
            .catch(error => {
                logger.error('500 from /getAllInvoices');
                res.status(500).send(error);
            });
    }

    // get all invoices generated till date
    return fbService.getInvoicesSummaryData(
        null,
        user,
        isAdmin,
    )
        .then(invoicesData => res.status(200).json(invoicesData))
        .catch(error => {
            logger.error('500 from /getAllInvoices');
            res.status(500).send(error);
        });
});

// email an invoice to logged in user
router.get('/emailInvoice', ({
    app: reqApp,
    query: {
        email = '',
        invoice:invoiceNumber = '',
        username,
    },
}, res) => {
    if (email === '') {
        logger.error('500 from /emailInvoice: Invalid user email');
        return res.status(500).send({ error: 'Invalid user email.' });
    }

    if (invoiceNumber === '') {
        logger.error('500 from /emailInvoice: Invalid Invoice number');
        return res.status(500).send({ error: 'Invalid Invoice number' });
    }

    const fbService = createFBServiceObject(reqApp.get('settings'));
    return fbService.emailExistingInvoice(
        email,
        invoiceNumber,
        isAdminUser({
            email,
            username,
        }, config.oicr_admins),
    )
        .then(() => res.status(200).send('Invoice emailed.'))
        .catch(error => {
            logger.error(`500 from /emailInvoice', ${error}`);
            res.status(500).send(error);
        });
});

// get inovice number of last created invoice
router.get('/getLastInvoiceNumber', ({ query }, res) => (
    (query.username || query.email) &&
        isAdminUser({
            email: query.email,
            username: query.username,
        }, config.oicr_admins)
    ? createFBServiceObject(app.get('settings'))
        .getLastInvoiceNumber(query.invoicePrefix)
        .then(response => res.status(200).send(response))
        .catch(error => {
            logger.info(`500 from /getLastInvoiceNumber -> freshbooks service error?: ${error}`);
            return res.status(500).send(error);
        })
    : (
        logger.info('500 from /getLastInvoiceNumber -> Only admin users can lookup invoice details'),
        res.status(500)
            .send({ error: 'Only admin user can lookup last invoice details' }))));


// use router middleware
app.use('/invoice', router);
app.listen(port);

logger.info('>>---------------------');
logger.info('Invoice Service started');
