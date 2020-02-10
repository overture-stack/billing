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


import * as fs from 'fs';
import * as winston from 'winston';
import { format } from 'logform';
import {
    clamp,
    values,
} from 'lodash';
import Big from 'big.js';
import BillingApi from './service/billing';
import Mailer from './service/email';

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const EMAIL_MODE = 'email';

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

const logger = winston.createLogger({
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: tsFormat() }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [new winston.transports.Console()],
});

logger.info('*** Starting Invoice Reporting ***');

/**
 * Argument Parsing for Config Path
 */
const args = process.argv;
if (args.length < 3) {
    logger.error('Missing arguments');
    process.exit(1);
}
const configPath = args[2] || 'config.js';
const config :any = configPath.endsWith('.js')
    ? module.require(`${['/', '.'].includes(configPath[0]) ? '' : '../'}${configPath}`)
    : JSON.parse(fs.readFileSync(configPath).toString());

/**
 * Extra params for specific months/projects
 */
let reportMonth :number;
let reportYear :number;
let month :string;
if (args.length >= 4) {
    const dateArgs = args[3].split('-');
    reportMonth = Number(dateArgs[1]);
    reportYear = Number(dateArgs[0]);
    month = MONTH_NAMES[reportMonth - 1];
} else {
    const monthIndex = (new Date()).getMonth();
    reportMonth = monthIndex - 1 < 0 ? 11 : monthIndex - 1;
    reportYear = monthIndex - 1 < 0 ? (new Date()).getFullYear() - 1 : (new Date()).getFullYear();
    month = MONTH_NAMES[reportMonth];
}

// TODO: deal with args if lowercase.
const allProjects = args[4] === 'ALL';
const projectList :Array<string> = args[4] && args[4] !== 'ALL' ? args[4].split(',') : [];

// default mode is to generate a csv
const mode = config.mode?.toLowerCase() || 'csv';

logger.info(`Reporting mode: ${mode}`);
logger.info(`Reporting for the month of: ${month} ${reportYear}`);

// used only if mode is csv
const aggregatedInvoices = [];

/**
 * Generate reports from billing api and email them to billing users
 */
const billing = new BillingApi(config.billingConfig, logger);

// generate invoices for each project
const invoiceGeneration = new Promise((resolve, reject) => {
    billing.login()
        .then(response => billing.projects(response))
        .then(results => {
            const projects :any = combineProjectUsers(results.filter(
                project => project.extra.email && (
                    (allProjects || (
                        ['DEV-', 'LAB-'].includes(config.invoiceNumberPrefix) && (
                            config.testUser
                                ? project.extra.email.toLowerCase() === config.testUser
                                : project.extra.email.toLowerCase().includes('oicr.on.ca')))) ||
                    projectList.includes(project.project_name)),
            ));

            billing.getLastInvoiceNumber(config.invoiceNumberPrefix)
                .then(lastInvoiceNumber => {
                    // TODO: relocate this after checking if user is valid in freshbooks
                    setInvoiceNumbersForProject(projects, lastInvoiceNumber);
                    logger.info(`Invoice number of last generated invoice: ${lastInvoiceNumber}`);

                    const pricePromise = billing.price(reportYear, reportMonth, projects);
                    pricePromise.then(perProjectPrices => {
                        // TODO: refactor this imperative thing into a Promise.all
                        // and log any failed invoices separately.
                        const totalProjectCount = projects.length;
                        let invoicesProcessed = 0;
                        logger.info(`Retrieved price information for ${totalProjectCount} projects`);

                        projects.map(project =>
                            billing.monthlyReport(
                                project,
                                reportYear,
                                reportMonth,
                            )
                                .then(report => {
                                    logger.info(`Retrieved this month's data for project ${project.project_name}`);

                                    const aggregatedReport = {
                                        ...report,
                                        month,
                                        year: reportYear,
                                        project_name: project.project_name,
                                    };

                                    const price = perProjectPrices[project.project_name] || perProjectPrices[0]; // for backward compatiblity

                                    /**
                                     * Add discount if there is a difference in total cost
                                     * vs itemQty * itemRate. This is applicable for scenarios
                                     * such as when collab offers discounts for usage that was
                                     * during the maintenance window
                                     */
                                    addDiscountsToReflectActualUsage(price, aggregatedReport);
                                    price.discount = price.discount ? (price.discount * 100).toFixed(4) : 0.0000;

                                    if (mode === EMAIL_MODE) {
                                        logger.info(`Attempting to send invoice ${project.invoiceNumber} for project: ${project.project_name}`);

                                        billing.sendInvoice(
                                            project.emails,
                                            aggregatedReport,
                                            price,
                                            project.invoiceNumber,
                                        )
                                            .then(newInvoice => {
                                                logger.info(
                                                    `Finished processing Invoice for project:${
                                                        project.project_name} ${
                                                        newInvoice ? 'succesfully.' : 'incorrectly.'
                                                    }`,
                                                );
                                                invoicesProcessed++;
                                                invoicesProcessed === totalProjectCount &&
                                                    resolve();
                                            })
                                            .catch(error => {
                                                console.log('failed', error);
                                                logger.error(`Error while processing Invoice for project: ${project.project_name}`);
                                                // we increment the counter regardless of an
                                                // error, to makes sure that promise is always
                                                // resolved, and summary generation happens
                                                invoicesProcessed++;
                                                invoicesProcessed === totalProjectCount &&
                                                    resolve();
                                            });
                                    } else { // CSV mode
                                        logger.info(`Generating Invoice data for invoice: ${project.invoiceNumber} for project: ${project.project_name}`);

                                        generateInvoiceDataJSON(
                                            project.emails,
                                            project.project_name,
                                            project.invoiceNumber,
                                            aggregatedReport,
                                            price,
                                            aggregatedInvoices,
                                        );

                                        invoicesProcessed++;
                                        invoicesProcessed === totalProjectCount &&
                                            resolve();
                                    }
                                })
                                .catch(error => {
                                    logger.info(`Error processing invoice for ${project.project_name}`);
                                    invoicesProcessed++;
                                }));
                    });
                });
        })
        .catch(error => reject(error));
});

// wait till all invoices are generated and then generate the summary .csv file
invoiceGeneration
    .then(() => {
        if (mode === EMAIL_MODE) {
            logger.info('Email Mode. Generating Summary CSV file that will be emailed...');

            billing.generateInvoicesSummary(month, config.outputDir)
                .then(() => {
                    const mailer = new Mailer(
                        {
                            emailConfig: config.emailConfig,
                            smtpConfig: config.smtpConfig,
                            emailRecipients: config.emailRecipients,
                        },
                        null,
                        logger,
                    );

                    logger.info('Emailing summary csv file...');
                    mailer.sendSummaryCSVEmail(
                        `${config.outputDir + month}.csv`,
                        month,
                        reportYear,
                    );

                    logger.info('Finished Processing Invoices.');
                })
                .catch(error => logger.error(error));
        } else {
            logger.info('CSV Mode. Generating Summary CSV file...');

            generatePreInvoiceSummaryCSV(aggregatedInvoices)
                .then(() => logger.info('Finished Processing Invoices.'));
        }
    })
    .catch(({
        code,
        description = '',
        message,
    }) => {
        logger.error(
            'App failed:',
            `${message}. ${description}` ||
            code,
        );
    });

/*
    Helper functions
 */
function combineProjectUsers(projects :Array<any>) :Array<any> {
    const output = {};
    projects.map(project => {
        if (output.hasOwnProperty(project.project_id)) {
            if (project.extra.hasOwnProperty('email')) output[project.project_id].emails.push(project.extra.email);
        } else {
            output[project.project_id] = {
                project_id: project.project_id,
                project_name: project.project_name,
                user_id: project.user_id,
                emails: project.extra.email ? [project.extra.email.toLowerCase()] : [],
            };
        }
    });// project iteration ends here
    return values(output);
}

function buildInvoiceNumber(prefix :string, projectSequence :number, maxChars :number) :string {
    const numCharsInSequence = projectSequence.toString().length;
    const numLeadingZeros = maxChars - numCharsInSequence - prefix.length;

  // Check for errors
    if (numLeadingZeros < 0) {
    // how do you handle the case where you cannot make anymore invoices?
    }

  // Build the output
    let output = prefix;
    let i;
    for (i = 0; i < numLeadingZeros; i++) {
        output += '0';
    }
    output += projectSequence;
    return output;
}

function setInvoiceNumbersForProject(projects :any, lastInvoiceNumber :string = '') {
    let increment = 1;
    const maxCharsInInvoiceNumber = 10;
    const { invoiceNumberPrefix } = config;
    const lastSequence = Number(lastInvoiceNumber.split('-').pop()) || 0;

    // TODO: generate only if freshbook client ID exists.
    projects.map((item) => {
        const projectSequence = lastSequence + increment;
        increment++;
        item.invoiceNumber = buildInvoiceNumber(invoiceNumberPrefix, projectSequence, maxCharsInInvoiceNumber);
    });
}

function addDiscountsToReflectActualUsage(price, report) {
  // ignore if usage is already 100% discounted
    if (price.discount && price.discount >= 1) return;

  // effective total cost from report
    const effectiveTotalCost =
    Big(report.cpuCost).plus(report.imageCost).plus(report.volumeCost);
  // total cost based on price and usage
    const totalCost =
    Big(report.cpu).times(price.cpuPrice)
        .plus(Big(report.image).times(price.imagePrice))
        .plus(Big(report.volume).times(price.volumePrice));
    const diff =
    totalCost.minus(effectiveTotalCost);
  // adjust for javascript float precision
    if (diff.gt(0.01) && totalCost.gt(0.00)) {
        const effectiveDiscount = diff.div(totalCost);

    // max discount should be 100%
        price.discount =
      price.discount ? clamp(Number(effectiveDiscount.plus(price.discount).toPrecision(3)), 1)
        : clamp(Number(effectiveDiscount.toPrecision(3)), 1);
    }
}

function generateInvoiceDataJSON(
    projectEmails :Array<string>,
    projectName :string,
    invoiceNumber :string,
    report :any, price :any,
    invoicesAggregator :Array<any>,
) {
    const creationDate = new Date();
    const creationDateText = creationDate.toISOString().slice(0, 10);
    let projectEmail = '';
    projectEmails.map((item) => projectEmail = `${projectEmail + item},`);
  // generate invoice data
    const invoiceData = {
        pi_email: projectEmail.substring(0, projectEmail.lastIndexOf(',')),
        project_name: projectName,
        invoice_number: invoiceNumber,
        date: creationDateText,
        cpu_cost: report.cpuCost,
        cpu_qty: report.cpu,
        cpu_unit_cost: price.cpuPrice,
        image_cost: report.imageCost,
        image_qty: report.image,
        image_unit_cost: price.imagePrice,
        volume_cost: report.volumeCost,
        volume_qty: report.volume,
        volume_unit_cost: price.volumePrice,
        discount: price.discount,
    };
    invoicesAggregator.push(invoiceData);
}

function generatePreInvoiceSummaryCSV(invoicesData :Array<any>) :Promise<any> {
    const fields = [
        {
            label: 'Project Name',
            value: 'project_name',
        },
        {
            label: 'Email',
            value: 'pi_email',
        },
        {
            label: 'Target Invoice Number',
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
            label: 'CPU Qty',
            value: 'cpu_qty',
        },
        {
            label: 'CPU Unit Cost',
            value: 'cpu_unit_cost',
        },
        {
            label: 'Image Cost',
            value: 'image_cost',
        },
        {
            label: 'Image Qty',
            value: 'image_qty',
        },
        {
            label: 'Image Unit Cost',
            value: 'image_unit_cost',
        },
        {
            label: 'Volume Cost',
            value: 'volume_cost',
        },
        {
            label: 'Volume Qty',
            value: 'volume_qty',
        },
        {
            label: 'Volume Unit Cost',
            value: 'volume_unit_cost',
        },
        {
            label: 'Discount',
            value: 'discount',
        },

    ];
    return billing.writeCSVDataToFile(invoicesData, fields, `${config.outputDir}InvoicesSummary.csv`);
}
