import React, { Component } from 'react';
import {observable, autorun, computed} from 'mobx';
import {observer} from 'mobx-react';
import _ from 'lodash';
import {aggregateEntries} from './aggregateEntries';

import moment from 'moment';

import CHART_SETTINGS from './CHART_SETTINGS';

import { Button, DatePicker, Radio } from 'antd';
const RangePicker = DatePicker.RangePicker;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;

import Select from 'react-select';
import 'react-select/dist/react-select.css';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';

import {fetchReport} from '~/services/reports'; 
import {fetchProjects} from '~/services/projects'; 
import {getSeriesFromReportEntries} from './getSeriesFromReportEntries';

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
    fromDate: moment().subtract('months', 1),
    toDate: moment(),
    bucketSize: TIME_PERIODS.DAILY,
  };
  @observable isLoading = false;

  @observable aggregationFields = defaultAggregationFields;
  @computed get entriesToDisplay() {
    return aggregateEntries(this.report.entries, x => _(x).pick(this.aggregationFields.slice()).values().value().join(',') );
  }

  @computed get reportSummary() {
    return aggregateEntries(this.report.entries, "" );
  }

  handleProjectsChange = (option) => {
    this.filters.projects = option.map(x => x.value);
  }

  handleRangeFilterChange = (dates) => {
    this.filters.fromDate = dates[0];
    this.filters.toDate = dates[1];
  }

  async componentDidMount() {
    this.projects = await fetchProjects();
    this.updateChart();
    autorun(this.redrawChart);
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
    const newSeries = getSeriesFromReportEntries(this.report.entries, {shouldShowCost:this.shouldShowCost}).slice();
    console.log(newSeries);
    const chart = this.refs.chart.getChart();
    console.log(this.report.fromDate);
    const subtitle = new Date(this.report.fromDate || this.filters.fromDate.toISOString()).toDateString().concat(
        ' - ',
        new Date(this.report.toDate || this.filters.toDate.toISOString()).toDateString());
    chart.setTitle(
        { text: `Collaboratory ${this.shouldShowCost ? 'Cost' : 'Usage'} Summary` },
        { text: subtitle });
    chart.yAxis[0].update({title: {text: `${this.shouldShowCost ? 'Cost ($)' : 'Usage (hrs)'}`}})
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

  render () {
    return (
      <div className="Report">
        <h1 className="page-heading">Billing Report</h1>
        <label>
          Projects
        </label>
        <div className="form-controls flex-row">
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

          <div className="range-select">
            <RangePicker
              format="YYYY-MM-DD"
              onChange={this.handleRangeFilterChange}
              defaultValue={[this.filters.fromDate, this.filters.toDate]}
            />
          </div>

          <div className="interval-select">
            <RadioGroup>
              <RadioButton
                checked={this.filters.bucketSize === TIME_PERIODS.DAILY}
                onClick={() => this.filters.bucketSize = TIME_PERIODS.DAILY}
                value={TIME_PERIODS.DAILY}
              >Daily</RadioButton>
              <RadioButton
                checked={this.filters.bucketSize === TIME_PERIODS.WEEKLY}
                onClick={() => this.filters.bucketSize = TIME_PERIODS.WEEKLY}
                value={TIME_PERIODS.WEEKLY}
              >Weekly</RadioButton>
              <RadioButton
                checked={this.filters.bucketSize === TIME_PERIODS.MONTHLY}
                onClick={() => this.filters.bucketSize = TIME_PERIODS.MONTHLY}
                value={TIME_PERIODS.MONTHLY}
              >Monthly</RadioButton>
              <RadioButton
                checked={this.filters.bucketSize === TIME_PERIODS.YEARLY}
                onClick={() => this.filters.bucketSize = TIME_PERIODS.YEARLY}
                value={TIME_PERIODS.YEARLY}
              >Yearly</RadioButton>
            </RadioGroup>
          </div>

          <div>
            <Button
              type='primary'
              loading={this.isLoading}
              onClick={this.updateChart}
             >Generate Report</Button>
          </div>

        </div>

        <h2 className="section-heading">Summary</h2>
        <div className="summary">
          <RadioGroup>
            <RadioButton
              checked={this.shouldShowCost}
              onClick={() => this.shouldShowCost = true}
              value={true}
            >Cost</RadioButton>
            <RadioButton
              checked={!this.shouldShowCost}
              onClick={() => this.shouldShowCost = false}
              value={false}
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
                dataFormat={x => x ? x.toLocaleString() : ''}
                dataAlign="right"
              >CPU (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="volume"
                hidden={this.shouldShowCost}
                dataFormat={x => x ? x.toLocaleString() : ''}
                dataAlign="right"
              >Volume (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="image"
                hidden={this.shouldShowCost}
                dataFormat={x => x ? x.toLocaleString() : ''}
                dataAlign="right"
              >Image (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataField="cpuCost"
                dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >CPU Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataField="volumeCost"
                dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >Volume Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataField="imageCost"
                dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
                hidden={!this.shouldShowCost}
                dataAlign="right"
              >Image Cost</TableHeaderColumn>
              <TableHeaderColumn
                dataFormat={(cell, row) => _.sum([row.cpu, row.volume, row.image])}
                dataAlign="right"
                hidden={this.shouldShowCost}
              >Total (hrs)</TableHeaderColumn>
              <TableHeaderColumn
                dataFormat={(cell, row) => `$${_.sum([row.cpuCost, row.volumeCost, row.imageCost]).toFixed(2)}`}
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
          <div>
            <div>
              <RadioGroup>
                <RadioButton
                  checked={ _.isEqual(this.aggregationFields.slice(), defaultAggregationFields.slice()) }
                  onClick={() => this.aggregationFields = defaultAggregationFields}
                  value={defaultAggregationFields}
                >Total</RadioButton>
                <RadioButton
                  checked={ !this.aggregationFields.includes(AGGREGATION_FIELDS.USER) }
                  onClick={() => this.aggregationFields = _.without(defaultAggregationFields, AGGREGATION_FIELDS.USER)}
                  value={AGGREGATION_FIELDS.PROJECT}
                >Projects</RadioButton>
                <RadioButton
                  checked={ !this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT) }
                  onClick={() => this.aggregationFields = _.without(defaultAggregationFields, AGGREGATION_FIELDS.PROJECT)}
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
              dataFormat={(cell, entry) => `${moment(entry.fromDate, moment.ISO_8601).format('YYYY-MM-DD')} - ${moment(entry.toDate, moment.ISO_8601).format('YYYY-MM-DD')}`}
              dataSort={true}
            >Period</TableHeaderColumn>
            <TableHeaderColumn
              dataField="toDate"
              hidden={true}
              export={true}
            >Period</TableHeaderColumn>
            <TableHeaderColumn
              dataField="projectId"
              hidden={true}
              dataSort={true}
              export={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
            >Project ID</TableHeaderColumn>
            <TableHeaderColumn
              dataField="projectId"
              filterFormatted={true}
              dataFormat={id => _.find(this.projects, {id}).name}
              csvFormat={(id) => _.find(this.projects, {id}).name}
              csvHeader="projectName"
              hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
              dataSort={true}
            >Project</TableHeaderColumn>
            <TableHeaderColumn
              dataField="username"
              dataFormat={(cell, row) => cell ? cell : `(Project) ${_.find(this.projects, {'id':row.projectId}).name}`}
              hidden={!this.aggregationFields.includes(AGGREGATION_FIELDS.USER)}
              dataSort={true}
            >User</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpu"
              dataFormat={x => x ? x.toLocaleString() : ''}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >CPU (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpuCost"
              dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >CPU Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volume"
              dataFormat={x => x ? x.toLocaleString() : ''}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Volume (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volumeCost"
              dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >Volume Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="image"
              dataFormat={x => x ? x.toLocaleString() : ''}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Image (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataField="imageCost"
              dataFormat={x => x ? `$${x.toFixed(2).toLocaleString()}` : ''}
              dataAlign="right"
              dataSort={true}
              hidden={!this.shouldShowCost}
            >Image Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataFormat={(cell, row) => _.sum([row.cpu, row.volume, row.image]).toLocaleString()}
              dataAlign="right"
              dataSort={true}
              hidden={this.shouldShowCost}
            >Total (hrs)</TableHeaderColumn>
            <TableHeaderColumn
              dataFormat={(cell, row) => `$${_.sum([row.cpuCost, row.volumeCost, row.imageCost]).toFixed(2).toLocaleString()}`}
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
