/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
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
import { aggregateEntries } from './aggregateEntries';

import moment from 'moment';

import CHART_SETTINGS from './CHART_SETTINGS';
import user from '../../user';

import { Button, DatePicker, Radio } from 'antd';
const { MonthPicker } = DatePicker;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;

import { Select as AntdSelect } from 'antd';
const Option = AntdSelect.Option;

import Select from 'react-select';
import 'react-select/dist/react-select.css';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';

import fetchReport from '../../services/reports/fetchReport';
import fetchProjects from '../../services/projects/fetchProjects';
import { getSeriesFromReportEntries } from './getSeriesFromReportEntries';

const ReactHighcharts = require('react-highcharts').withHighcharts(require('highcharts'));

import './Report.scss';

const TIME_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

const AGGREGATION_FIELDS = {
  PROJECT: 'projectId',
  USER: 'user',
  PERIOD: 'fromDate',
};

const defaultAggregationFields = [
  AGGREGATION_FIELDS.PROJECT,
  AGGREGATION_FIELDS.USER,
  AGGREGATION_FIELDS.PERIOD
];

const START_YEAR = 2013;
const currentYear = new Date().getUTCFullYear();
const getYearsSinceStart = () => _.range(currentYear - START_YEAR).map(x => x + START_YEAR);

export default @observer
class extends Component {

  @observable report = {
    entries: []
  };
  @observable shouldShowCost = true;
  @observable projects = [];
  @observable chartSettings = CHART_SETTINGS;
  @observable filters = {
    projects: [],
    fromDate: moment().utc().subtract('months', 1).startOf('day'),
    toDate: moment().utc().startOf('day'),
    bucketSize: TIME_PERIODS.DAILY,
  };
  @observable isLoading = false;

  @observable aggregationFields = defaultAggregationFields;
  @computed get entriesToDisplay() {
    return aggregateEntries(this.report.entries, x => _(x).pick(this.aggregationFields.slice()).values().value().join(','));
  }

  @computed get reportSummary() {
    return aggregateEntries(this.report.entries, "");
  }

  @computed get isEmpty() {
    return this.report.entries.length === 0;
  }

  handleProjectsChange = (option) => {
    this.filters.projects = option.map(x => x.value);
  }

  handleFromDateFilterChange = (date) => {
    this.filters.fromDate = date;
  }

  handleToDateFilterChange = (date) => {
    this.filters.toDate = date;
  }

  constructor(props) {
    super(props);
    if (!user.roles.report && user.roles.invoices) {
      browserHistory.push('/invoices');
    } else if (!user.roles.report && !user.roles.invoices) {
      user.logout();
    }
  }

  async componentDidMount() {
    this.projects = await fetchProjects();
    this.updateChart();
    autorun(this.redrawChart);
  }

  formatDateRange = (cell, entry) => {
    const bucket = this.report ? this.report.bucket.toUpperCase() : this.filters.bucketSize;
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

  formatNumber = (n) => {
    return n ? n.toLocaleString() : '';
  }

  formatCurrency = (n) => {
    return n ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '';
  }

  updatePeriod = (period) => {
    this.filters.bucketSize = period;
    if (period === TIME_PERIODS.MONTHLY) {
      this.handleFromDateFilterChange(moment(this.filters.fromDate).startOf('month'));
      this.handleToDateFilterChange(moment(this.filters.toDate).endOf('month'));
    } else if (period === TIME_PERIODS.YEARLY) {
      this.handleFromDateFilterChange(moment(this.filters.fromDate).startOf('year'));
      this.handleToDateFilterChange(moment(this.filters.toDate).endOf('year'));
    } else {
      this.handleFromDateFilterChange(this.filters.fromDate);
      this.handleToDateFilterChange(this.filters.toDate);
    }
  }

  updateChart = async () => {
    this.isLoading = true;
    const report = await fetchReport({
      projects: this.filters.projects.slice(),
      bucketSize: this.filters.bucketSize.toLowerCase(),
      fromDate: this.filters.fromDate.toISOString(),
      toDate: this.filters.toDate.toISOString(),
    });
    this.report = report;
    this.isLoading = false;
  }

  redrawChart = () => {
    const newSeries = getSeriesFromReportEntries(this.report.entries, { shouldShowCost: this.shouldShowCost }).slice();
    const chart = this.refs.chart.getChart();
    const subtitle = new Date(this.report.fromDate || this.filters.fromDate.toISOString()).toDateString().concat(
      ' - ',
      new Date(this.report.toDate || this.filters.toDate.toISOString()).toDateString());
    chart.setTitle(
      { text: `Collaboratory ${this.shouldShowCost ? 'Cost' : 'Usage'} Summary` },
      { text: `<div style="text-align:center;">${subtitle}<br/><br/>Toggle Chart Area</div>` });
    chart.yAxis[0].update({ title: { text: `${this.shouldShowCost ? 'Cost ($)' : 'Usage (hrs)'}` } })
    chart.series.forEach(serie => serie.setData(newSeries.find(newSerie => newSerie.name === serie.name).data, false, false));
    chart.update({
      colors: [
        '#3498DB',
        '#E74C3C',
        '#2C3E50',
      ]
    });
    chart.reflow();

    window.chart = chart;
  }

  projectsToSelectOptions = projects => projects.map(x => ({
    value: x,
    label: x.name
  }))

  render() {
    return (
      <div className="Report">
        <h1 className="page-heading">
          {
            this.isLoading
              ? 'Loading Usage Report...'
              : 'Usage Report'
          }
        </h1>
        <div className="form-controls">
          <div className="form-item">
            <label>
              Projects
            </label>
            <div className="project-select">
              <Select
                multi
                placeholder="Showing all projects. Click to filter."
                options={this.projectsToSelectOptions(this.projects.slice())}
                value={this.projectsToSelectOptions(this.filters.projects.slice())}
                onChange={this.handleProjectsChange}
              >
              </Select>
            </div>
          </div>

          <div className="form-item">
            <label>
              From
            </label>
            <div className="range-select">
              {
                _.includes([TIME_PERIODS.DAILY, TIME_PERIODS.WEEKLY], this.filters.bucketSize) && <DatePicker
                  format="YYYY-MM-DD"
                  onChange={this.handleFromDateFilterChange}
                  defaultValue={this.filters.fromDate}
                />
              }

              {
                this.filters.bucketSize === TIME_PERIODS.MONTHLY && <MonthPicker
                  format="MMMM, YYYY"
                  onChange={this.handleFromDateFilterChange}
                  defaultValue={moment(this.filters.fromDate).startOf('month')}
                />
              }

              {
                this.filters.bucketSize === TIME_PERIODS.YEARLY && <AntdSelect
                  defaultValue={moment(this.filters.fromDate).format('YYYY')}
                  showSearch={false}
                  onChange={this.handleFromDateFilterChange}
                >
                  {
                    getYearsSinceStart().map(year => (
                      <Option key={year} value={moment(year, 'YYYY')}>{year}</Option>
                    ))
                  }
                </AntdSelect>
              }
            </div>
          </div>
          <div className="form-item">
            <label>
              To
            </label>
            <div className="range-select">
              {
                _.includes([TIME_PERIODS.DAILY, TIME_PERIODS.WEEKLY], this.filters.bucketSize) && <DatePicker
                  format="YYYY-MM-DD"
                  onChange={this.handleToDateFilterChange}
                  defaultValue={this.filters.toDate}
                />
              }

              {
                this.filters.bucketSize === TIME_PERIODS.MONTHLY && <MonthPicker
                  format="MMMM, YYYY"
                  onChange={this.handleToDateFilterChange}
                  defaultValue={moment(this.filters.toDate).endOf('month')}
                />
              }

              {
                this.filters.bucketSize === TIME_PERIODS.YEARLY && <AntdSelect
                  showSearch={false}
                  defaultValue={moment(this.filters.toDate).endOf('year').format('YYYY')}
                  onChange={this.handleToDateFilterChange}
                >
                  {
                    getYearsSinceStart().map(year => (
                      <Option key={year} value={moment(year, 'YYYY').endOf('year')}>{year}</Option>
                    ))
                  }
                </AntdSelect>
              }
            </div>
          </div>

          <div className="form-item">
            <label>
              Period Grouping
            </label>
            <div className="interval-select">
              <RadioGroup>
                <RadioButton
                  checked={this.filters.bucketSize === TIME_PERIODS.DAILY}
                  onClick={() => this.updatePeriod(TIME_PERIODS.DAILY)}
                  value={TIME_PERIODS.DAILY}
                >Daily</RadioButton>
                <RadioButton
                  checked={this.filters.bucketSize === TIME_PERIODS.WEEKLY}
                  onClick={() => this.updatePeriod(TIME_PERIODS.WEEKLY)}
                  value={TIME_PERIODS.WEEKLY}
                >Weekly</RadioButton>
                <RadioButton
                  checked={this.filters.bucketSize === TIME_PERIODS.MONTHLY}
                  onClick={() => this.updatePeriod(TIME_PERIODS.MONTHLY)}
                  value={TIME_PERIODS.MONTHLY}
                >Monthly</RadioButton>
                <RadioButton
                  checked={this.filters.bucketSize === TIME_PERIODS.YEARLY}
                  onClick={() => this.updatePeriod(TIME_PERIODS.YEARLY)}
                  value={TIME_PERIODS.YEARLY}
                >Yearly</RadioButton>
              </RadioGroup>
            </div>
          </div>

          <div className="form-item">
            <div>
              <Button
                type='primary'
                loading={this.isLoading}
                onClick={this.updateChart}
              >Generate Report</Button>
            </div>
          </div>

        </div>
        <h2 className="section-heading">Summary</h2>
        <div className="summary">
          <RadioGroup>
            <RadioButton
              checked={this.shouldShowCost}
              onClick={() => { this.shouldShowCost = true }}
              value={true}
              key="RadioButton1"
            >Cost</RadioButton>
            <RadioButton
              checked={!this.shouldShowCost}
              onClick={() => { this.shouldShowCost = false }}
              value={false}
              key="RadioButton2"
            >Usage</RadioButton>
          </RadioGroup>
          <div
            className="summary-table">
            <BootstrapTable
              data={this.reportSummary}
              striped={true}
              keyField="key"
              width="200px"
            >
              <TableHeaderColumn
                dataField="cpu"
                hidden={this.shouldShowCost}
                dataFormat={this.formatNumber}
                dataAlign="right"
              >CPU (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="volume"
                hidden={this.shouldShowCost}
                dataFormat={this.formatNumber}
                dataAlign="right"
              >Volume (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="image"
                hidden={this.shouldShowCost}
                dataFormat={this.formatNumber}
                dataAlign="right"
              >Image (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="cpuCost"
                dataFormat={this.formatCurrency}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >CPU Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataField="volumeCost"
                dataFormat={this.formatCurrency}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >Volume Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataField="imageCost"
                dataFormat={this.formatCurrency}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >Image Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataFormat={(cell, row) => this.formatNumber(_.sum([row.cpu, row.volume, row.image]))}
                dataAlign="right"
                hidden={this.shouldShowCost}
              >Total (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataFormat={(cell, row) => this.formatCurrency(_.sum([row.cpuCost, row.volumeCost, row.imageCost]))}
                dataAlign="right"
                hidden={!this.shouldShowCost}
              >Total Cost</TableHeaderColumn>
            </BootstrapTable>
          </div>
        </div>

        <div className={`chart-container ${this.isLoading ? 'is-loading' : 'not-loading'}`}>
          <ReactHighcharts config={this.chartSettings} ref="chart" isPureConfig={true}></ReactHighcharts>
        </div>

        <h2 className="section-heading">Details</h2>

        <div className={`usage-table ${this.isLoading ? 'is-loading' : 'not-loading'}`}>
          <div className="form-item">
            <label>
              Group By
            </label>
            <div>
              <RadioGroup>
                <RadioButton
                  checked={this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                  onClick={() => { this.aggregationFields = _.xor(this.aggregationFields, [AGGREGATION_FIELDS.PERIOD]) }}
                  value={AGGREGATION_FIELDS.PERIOD}
                >Period</RadioButton>
                <RadioButton
                  checked={this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                  onClick={() => { this.aggregationFields = _.xor(this.aggregationFields, [AGGREGATION_FIELDS.PROJECT]) }}
                  value={AGGREGATION_FIELDS.PROJECT}
                >Projects</RadioButton>
                <RadioButton
                  checked={this.aggregationFields.includes(AGGREGATION_FIELDS.USER)}
                  onClick={() => { this.aggregationFields = _.xor(this.aggregationFields, [AGGREGATION_FIELDS.USER]) }}
                  value={AGGREGATION_FIELDS.USER}
                >Users</RadioButton>
              </RadioGroup>
            </div>
          </div>
          <BootstrapTable
            data={this.entriesToDisplay}
            striped={true}
            condensed={true}
            search={true}
            exportCSV={true}
            hover={true}
            pagination={true}
            ignoreSinglePage
            keyField="key"
            options={{
              hideSizePerPage: true,
              sizePerPage: 25,
              sizePerPageList: [10, 50, 100]
            }}
          >
            <TableHeaderColumn
              dataField="fromDate"
              dataFormat={this.formatDateRange}
              hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
              export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
              dataSort={true}
            >Period</TableHeaderColumn>
            <TableHeaderColumn
              dataField="toDate"
              hidden={true}
              export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
            >Period</TableHeaderColumn>
            <TableHeaderColumn
              dataField="projectId"
              hidden={true}
              dataSort={true}
              // isKey={true}
              export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
            >Project ID</TableHeaderColumn>
            <TableHeaderColumn
              dataField="projectId"
              filterFormatted={true}
              dataFormat={id => _.find(this.projects, { id }).name}
              csvFormat={(id) => _.find(this.projects, { id }).name}
              csvHeader="projectName"
              hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
              dataSort={true}
            >Project</TableHeaderColumn>
            <TableHeaderColumn
              dataField="username"
              dataFormat={(cell, row) => cell ? cell : `(Project) ${_.find(this.projects, { 'id': row.projectId }).name}`}
              hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.USER)}
              width="320px"
              dataSort={true}
            >User</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpu"
              dataFormat={this.formatNumber}
              dataAlign="right"
              dataSort={true}
              sortFunc={(a, b, order) => ((a.cpu === '') ? 0 : a.cpu) - ((b.cpu === '') ? 0 : b.cpu)}
              hidden={this.shouldShowCost}
            >CPU (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpuCost"
              dataFormat={this.formatCurrency}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >CPU Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volume"
              dataFormat={this.formatNumber}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Volume (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volumeCost"
              dataFormat={this.formatCurrency}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >Volume Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="image"
              dataFormat={this.formatNumber}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Image (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="imageCost"
              dataFormat={this.formatCurrency}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >Image Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataFormat={(cell, row) => this.formatNumber(_.sum([row.cpu, row.volume, row.image]))}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Total (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataFormat={(cell, row) => this.formatCurrency(_.sum([row.cpuCost, row.volumeCost, row.imageCost]))}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >Total Cost</TableHeaderColumn>
          </BootstrapTable>
        </div>
      </div>
    );
  }
}
