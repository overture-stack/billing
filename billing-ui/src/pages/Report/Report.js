/*
* Copyright 2020(c) The Ontario Institute for Cancer Research. All rights reserved.
*
* This program and the accompanying materials are made available under the terms of the GNU Public
* License v3.0. You should have received a copy of the GNU General Public License along with this
* program. If not, see <http://www.gnu.org/licenses/>.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
* IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
* FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
* CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
* DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
* DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
* WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import React, { Component } from 'react';
import { browserHistory } from 'react-router';
import { observable, autorun, computed } from 'mobx';
import { observer } from 'mobx-react';
import _ from 'lodash';

import moment from 'moment';

import {
    Button, DatePicker, Radio, Select as AntdSelect,
} from 'antd';


import Select from 'react-select';
import 'react-select/dist/react-select.css';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import user from '../../user';
import CHART_SETTINGS from './CHART_SETTINGS';
import aggregateEntries from './aggregateEntries';
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';

import fetchReport from '../../services/reports/fetchReport';
import fetchProjects from '../../services/projects/fetchProjects';
import getSeriesFromReportEntries from './getSeriesFromReportEntries';
import {
    formatCurrency,
    formatNumber,
} from '../../utils/formats';

import './Report.scss';

const { MonthPicker } = DatePicker;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
const { Option } = AntdSelect;

const ReactHighcharts = require('react-highcharts').withHighcharts(require('highcharts'));

const TIME_PERIODS = {
    DAILY: 'DAILY',
    MONTHLY: 'MONTHLY',
    WEEKLY: 'WEEKLY',
    YEARLY: 'YEARLY',
};

const AGGREGATION_FIELDS = {
    PERIOD: 'fromDate',
    PROJECT: 'projectId',
    USER: 'user',
};

const defaultAggregationFields = [
    AGGREGATION_FIELDS.PROJECT,
    AGGREGATION_FIELDS.USER,
    AGGREGATION_FIELDS.PERIOD,
];

const START_YEAR = 2013;
const currentYear = new Date().getUTCFullYear();
const getYearsSinceStart = () => _.range(currentYear - START_YEAR).map(x => x + START_YEAR);

@observer
class Report extends Component {
    @observable report = {
        entries: [],
    };

    @observable shouldShowCost = true;

    @observable projects = [];

    @observable chartSettings = CHART_SETTINGS;

    @observable filters = {
        bucketSize: TIME_PERIODS.DAILY,
        fromDate: moment().subtract('months', 1).startOf('day'),
        projects: [],
        toDate: moment().startOf('day'),
    };

    @observable isLoading = false;

    @observable aggregationFields = defaultAggregationFields;

    constructor(props) {
        super(props);

        if (!user.roles.report && user.roles.invoices) {
            browserHistory.push('/invoices');
        } else if (!user.roles.report && !user.roles.invoices) {
            user.logout();
        }
    }

    @computed get entriesToDisplay() {
        return aggregateEntries(
            this.report.entries,
            x => _(x)
                .pick(this.aggregationFields.slice())
                .values()
                .value()
                .join(','),
        );
    }

    @computed get reportSummary() {
        return aggregateEntries(this.report.entries, '');
    }

    @computed get isEmpty() {
        return this.report.entries.length === 0;
    }

    handleProjectsChange = (option) => {
        this.filters.projects = option.map(x => x.value);
    }

    handleFromDateFilterChange = (date) => {
        // console.log('handleFromDateFilterChange', this.filters.fromDate, date);
        this.filters.fromDate = date;
    }

    handleToDateFilterChange = (date) => {
        // console.log('handleToDateFilterChange', this.filters.toDate, date);
        this.filters.toDate = date;
    }

    componentDidMount = async () => {
        this.projects = await fetchProjects();
        this.updateChart();
        autorun(this.redrawChart);
    }

    formatDateRange = (cell, entry) => {
        const bucket = this.report ? this.report.bucket.toUpperCase() : this.filters.bucketSize;
        // console.log('formatDateRange', cell, entry);

        switch (bucket) {
            case TIME_PERIODS.DAILY:
                return moment(entry.fromDate, moment.ISO_8601).format('DD MMM YYYY');

            case TIME_PERIODS.WEEKLY:
                return `${moment(entry.fromDate, moment.ISO_8601).format('MMM DD YYYY')} - ${moment(entry.toDate, moment.ISO_8601).subtract('days', 1).format('MMM DD YYYY')}`;

            case TIME_PERIODS.MONTHLY:
                return moment(entry.fromDate, moment.ISO_8601).format('MMMM YYYY');

            case TIME_PERIODS.YEARLY:
                return moment(entry.fromDate, moment.ISO_8601).format('YYYY');

            default:
                return moment(entry.fromDate, moment.ISO_8601).format('YYYY-MM-DD');
        }
    }

    updatePeriod = period => {
        this.filters.bucketSize = period;

        if (period === TIME_PERIODS.MONTHLY) {
            this.handleFromDateFilterChange(
                moment(this.filters.fromDate).startOf('month'),
            );
            this.handleToDateFilterChange(
                moment(this.filters.toDate).endOf('month'),
            );
        } else if (period === TIME_PERIODS.YEARLY) {
            this.handleFromDateFilterChange(
                moment(this.filters.fromDate).startOf('year'),
            );
            this.handleToDateFilterChange(
                moment(this.filters.toDate).endOf('year'),
            );
        } else {
            this.handleFromDateFilterChange(this.filters.fromDate);
            this.handleToDateFilterChange(this.filters.toDate);
        }
    }

    updateChart = async () => {
        this.isLoading = true;

        // console.log(
        //     'updateChart',
        //     this.filters.fromDate.millisecond(0).toISOString('keepOffset'),
        //     this.filters.toDate.millisecond(0).toISOString('keepOffset'),
        // );

        const report = await fetchReport({
            bucketSize: this.filters.bucketSize.toLowerCase(),
            fromDate: this.filters.fromDate.millisecond(0).toISOString(),
            projects: this.filters.projects.slice(),
            toDate: this.filters.toDate.millisecond(0).toISOString(),
        });

        this.report = report;
        this.isLoading = false;
    }

    redrawChart = () => {
        const chart = this.refs.chart.getChart();
        const newSeries = getSeriesFromReportEntries(
            this.report.entries,
            { shouldShowCost: this.shouldShowCost },
        ).slice();
        const subtitle = new Date(
            this.report.fromDate ||
            this.filters.fromDate.toISOString(),
        )
            .toDateString()
            .concat(
                ' - ',
                new Date(this.report.toDate || this.filters.toDate.toISOString()).toDateString(),
            );

        chart.setTitle(
            { text: `Collaboratory ${this.shouldShowCost ? 'Cost' : 'Usage'} Summary` },
            { text: `<div style="text-align:center;">${subtitle}<br/><br/>Toggle Chart Area</div>` },
        );

        chart.yAxis[0].update({
            title: {
                text: `${this.shouldShowCost ? 'Cost ($)' : 'Usage (hrs)'}`,
            },
        });

        chart.series.forEach(serie => serie.setData(
            newSeries
                .find(newSerie => newSerie.name === serie.name)
                .data,
            false,
            false,
        ));

        chart.update({
            colors: [
                '#2C3E50',
                '#E5D55B',
                '#E74C3C',
                '#3498DB',
            ],
        });

        chart.reflow();
        window.chart = chart;
    };

    projectsToSelectOptions = projects => projects.map(x => ({
        label: x.name,
        value: x,
    }));

    render = () => (
        <div className="Report">
            <h1 className="page-heading">
                {this.isLoading ? 'Loading Usage Report...' : 'Usage Report'}
            </h1>

            <div className="form-controls">
                <div className="form-item">
                    <label>Projects</label>

                    <div className="project-select">
                        <Select
                            multi
                            onChange={this.handleProjectsChange}
                            options={this.projectsToSelectOptions(this.projects.slice())}
                            placeholder="Showing all projects. Click to filter."
                            value={this.projectsToSelectOptions(this.filters.projects.slice())}
                            />
                    </div>
                </div>

                <div className="form-item">
                    <label>From</label>

                    <div className="range-select">
                        {_.includes([TIME_PERIODS.DAILY, TIME_PERIODS.WEEKLY], this.filters.bucketSize) && (
                            <DatePicker
                                defaultValue={this.filters.fromDate}
                                format="YYYY-MM-DD"
                                onChange={this.handleFromDateFilterChange}
                                />
                        )}

                        {this.filters.bucketSize === TIME_PERIODS.MONTHLY && (
                            <MonthPicker
                                defaultValue={moment(this.filters.fromDate).startOf('month')}
                                format="MMMM, YYYY"
                                onChange={this.handleFromDateFilterChange}
                                />
                        )}

                        {this.filters.bucketSize === TIME_PERIODS.YEARLY && (
                            <AntdSelect
                                defaultValue={moment(this.filters.fromDate).format('YYYY')}
                                onChange={this.handleFromDateFilterChange}
                                showSearch={false}
                                >
                                {getYearsSinceStart().map(year => (
                                    <Option
                                        key={year}
                                        value={moment(year, 'YYYY')}
                                        >
                                        {year}
                                    </Option>
                                ))}
                            </AntdSelect>
                        )}
                    </div>
                </div>

                <div className="form-item">
                    <label>To</label>

                    <div className="range-select">
                        {_.includes(
                            [TIME_PERIODS.DAILY, TIME_PERIODS.WEEKLY],
                            this.filters.bucketSize,
                        ) && (
                            <DatePicker
                                defaultValue={this.filters.toDate}
                                format="YYYY-MM-DD"
                                onChange={this.handleToDateFilterChange}
                                />
                        )}

                        {this.filters.bucketSize === TIME_PERIODS.MONTHLY && (
                            <MonthPicker
                                defaultValue={moment(this.filters.toDate).endOf('month')}
                                format="MMMM, YYYY"
                                onChange={this.handleToDateFilterChange}
                                />
                        )}

                        {this.filters.bucketSize === TIME_PERIODS.YEARLY && (
                            <AntdSelect
                                defaultValue={moment(this.filters.toDate).endOf('year').format('YYYY')}
                                onChange={this.handleToDateFilterChange}
                                showSearch={false}
                                >
                                {getYearsSinceStart().map(year => (
                                    <Option key={year} value={moment(year, 'YYYY').endOf('year')}>{year}</Option>
                                ))}
                            </AntdSelect>
                        )}
                    </div>
                </div>

                <div className="form-item">
                    <label>Period Grouping</label>

                    <div className="interval-select">
                        <RadioGroup>
                            <RadioButton
                                checked={this.filters.bucketSize === TIME_PERIODS.DAILY}
                                onClick={() => this.updatePeriod(TIME_PERIODS.DAILY)}
                                value={TIME_PERIODS.DAILY}
                                >
                                Daily
                            </RadioButton>

                            <RadioButton
                                checked={this.filters.bucketSize === TIME_PERIODS.WEEKLY}
                                onClick={() => this.updatePeriod(TIME_PERIODS.WEEKLY)}
                                value={TIME_PERIODS.WEEKLY}
                                >
                                Weekly
                            </RadioButton>

                            <RadioButton
                                checked={this.filters.bucketSize === TIME_PERIODS.MONTHLY}
                                onClick={() => this.updatePeriod(TIME_PERIODS.MONTHLY)}
                                value={TIME_PERIODS.MONTHLY}
                                >
                                Monthly
                            </RadioButton>

                            <RadioButton
                                checked={this.filters.bucketSize === TIME_PERIODS.YEARLY}
                                onClick={() => this.updatePeriod(TIME_PERIODS.YEARLY)}
                                value={TIME_PERIODS.YEARLY}
                                >
                                Yearly
                            </RadioButton>
                        </RadioGroup>
                    </div>
                </div>

                <div className="form-item">
                    <div>
                        <Button
                            loading={this.isLoading}
                            onClick={this.updateChart}
                            type="primary"
                            >
                            Generate Report
                        </Button>
                    </div>
                </div>
            </div>

            <h2 className="section-heading">Summary</h2>

            <div className="summary">
                <RadioGroup>
                    <RadioButton
                        checked={this.shouldShowCost}
                        key="RadioButton1"
                        onClick={() => { this.shouldShowCost = true; }}
                        value
                        >
                        Cost
                    </RadioButton>

                    <RadioButton
                        checked={!this.shouldShowCost}
                        key="RadioButton2"
                        onClick={() => { this.shouldShowCost = false; }}
                        value={false}
                        >
                        Usage
                    </RadioButton>
                </RadioGroup>

                <div className="summary-table">
                    <BootstrapTable
                        data={this.reportSummary}
                        keyField="key"
                        striped
                        width="200px"
                        >
                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="cpu"
                            dataFormat={formatNumber}
                            hidden={this.shouldShowCost}
                            >
                            CPU (hrs)
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="image"
                            dataFormat={formatNumber}
                            hidden={this.shouldShowCost}
                            >
                            Image (hrs)
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="objects"
                            dataFormat={formatNumber}
                            hidden={this.shouldShowCost}
                            >
                            Objects (hrs)
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="volume"
                            dataFormat={formatNumber}
                            hidden={this.shouldShowCost}
                            >
                            Volume (hrs)
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="cpuCost"
                            dataFormat={formatCurrency}
                            hidden={!this.shouldShowCost}
                            >
                            CPU Cost
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="imageCost"
                            dataFormat={formatCurrency}
                            hidden={!this.shouldShowCost}
                            >
                            Image Cost
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="objectsCost"
                            dataFormat={formatCurrency}
                            hidden={!this.shouldShowCost}
                            >
                            Objects Cost
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataField="volumeCost"
                            dataFormat={formatCurrency}
                            hidden={!this.shouldShowCost}
                            >
                            Volume Cost
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataFormat={(cell, row) => formatNumber(_.sum([
                                row.cpu,
                                row.image,
                                row.objects,
                                row.volume,
                            ]))}
                            hidden={this.shouldShowCost}
                            >
                            Total (hrs)
                        </TableHeaderColumn>

                        <TableHeaderColumn
                            dataAlign="right"
                            dataFormat={(cell, row) => formatCurrency(_.sum([
                                row.cpuCost,
                                row.imageCost,
                                row.objectsCost,
                                row.volumeCost,
                            ]))}
                            hidden={!this.shouldShowCost}
                            >
                            Total Cost
                        </TableHeaderColumn>
                    </BootstrapTable>
                </div>
            </div>

            <div className={`chart-container ${this.isLoading ? 'is-loading' : 'not-loading'}`}>
                <ReactHighcharts config={this.chartSettings} isPureConfig ref="chart" />
            </div>

            <h2 className="section-heading">Details</h2>

            <div className={`usage-table ${this.isLoading ? 'is-loading' : 'not-loading'}`}>

                <div className="form-item">
                    <label>Group By</label>

                    <div>
                        <RadioGroup>
                            <RadioButton
                                checked={this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                                onClick={() => {
                                    this.aggregationFields = _.xor(
                                        this.aggregationFields,
                                        [AGGREGATION_FIELDS.PERIOD],
                                    );
                                }}
                                value={AGGREGATION_FIELDS.PERIOD}
                                >
                                Period
                            </RadioButton>

                            <RadioButton
                                checked={this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                                onClick={() => {
                                    this.aggregationFields = _.xor(
                                        this.aggregationFields,
                                        [AGGREGATION_FIELDS.PROJECT],
                                    );
                                }}
                                value={AGGREGATION_FIELDS.PROJECT}
                                >
                                Projects
                            </RadioButton>

                            <RadioButton
                                checked={this.aggregationFields.includes(AGGREGATION_FIELDS.USER)}
                                onClick={() => {
                                    this.aggregationFields = _.xor(
                                        this.aggregationFields,
                                        [AGGREGATION_FIELDS.USER],
                                    );
                                }}
                                value={AGGREGATION_FIELDS.USER}
                                >
                                Users
                            </RadioButton>
                        </RadioGroup>
                    </div>
                </div>

                <BootstrapTable
                    condensed
                    data={this.entriesToDisplay}
                    exportCSV
                    hover
                    ignoreSinglePage
                    keyField="key"
                    options={{
                        hideSizePerPage: true,
                        sizePerPage: 25,
                        sizePerPageList: [
                            10,
                            50,
                            100,
                        ],
                    }}
                    pagination
                    search
                    striped
                    >
                    <TableHeaderColumn
                        dataField="fromDate"
                        dataFormat={this.formatDateRange}
                        dataSort
                        export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        >
                        Period
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="toDate"
                        export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        hidden
                        >
                        Period
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="projectId"
                        dataSort
                        export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                        // isKey={true}
                        hidden
                        >
                        Project ID
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        csvFormat={(id) => _.find(this.projects, { id }).name}
                        csvHeader="projectName"
                        dataField="projectId"
                        dataFormat={id => _.find(this.projects, { id }).name}
                        dataSort
                        filterFormatted
                        hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                        >
                        Project
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="username"
                        dataFormat={(cell, row) => cell ||
                            `(Project) ${_.find(this.projects, { id: row.projectId }).name}`}
                        dataSort
                        hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.USER)}
                        width="320px"
                        >
                        User
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="cpu"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={this.shouldShowCost}
                        sortFunc={(a, b) => (
                            (a.cpu || 0) - (b.cpu || 0)
                        )}
                        >
                        CPU (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="cpuCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!this.shouldShowCost}
                        >
                        CPU Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="image"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={this.shouldShowCost}
                        >
                        Image (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="imageCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!this.shouldShowCost}
                        >
                        Image Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="objects"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={this.shouldShowCost}
                        >
                        Objects (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="objectsCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!this.shouldShowCost}
                        >
                        Objects Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="volume"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={this.shouldShowCost}
                        >
                        Volume (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="volumeCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!this.shouldShowCost}
                        >
                        Volume Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataFormat={(cell, row) => formatNumber(_.sum([
                            row.cpu,
                            row.image,
                            row.objects,
                            row.volume,
                        ]))}
                        dataSort
                        hidden={this.shouldShowCost}
                        >
                        Total (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataFormat={(cell, row) => formatCurrency(_.sum([
                            row.cpuCost,
                            row.imageCost,
                            row.objectsCost,
                            row.volumeCost,
                        ]))}
                        dataSort
                        hidden={!this.shouldShowCost}
                        >
                        Total Cost
                    </TableHeaderColumn>
                </BootstrapTable>
            </div>
        </div>
    );
}

export default Report;
