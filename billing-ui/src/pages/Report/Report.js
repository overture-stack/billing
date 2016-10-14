import React, { Component } from 'react';
import {observable, computed, autorun, reaction} from 'mobx';
import {observer} from 'mobx-react';
import _ from 'lodash';

import moment from 'moment';

import CHART_SETTINGS from './CHART_SETTINGS';

import { DatePicker, Radio } from 'antd';
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

export default @observer
class extends Component {

  @observable projects = [];
  @observable chartSettings = CHART_SETTINGS;
  @observable filters = {
    projects: [],
    fromDate: moment().subtract(1, 'y'),
    toDate: moment(),
    bucketSize: TIME_PERIODS.MONTHLY,
  };

  handleProjectsChange = (option) => {
    this.filters.projects = option.map(x => x.value);
  }

  handleRangeFilterChange = (dates) => {
    console.log('handleRangeFilterChange', dates);
    this.filters.fromDate = dates[0];
    this.filters.toDate = dates[1];
  }

  async componentDidMount() {
    this.projects = await fetchProjects();
    autorun(this.updateChart);
  }

  updateChart = async () => {
      this.report = await fetchReport({
        projects: this.filters.projects.slice(),
        bucketSize: this.filters.bucketSize.toLowerCase(),
        fromDate: this.filters.fromDate.toISOString(),
        toDate: this.filters.toDate.toISOString(),
      });

      console.log(this.filters.projects.slice());
      this.redrawChart();
  }

  redrawChart = () => {
    const newSeries = getSeriesFromReportEntries(this.report.entries).slice();
    const chart = this.refs.chart.getChart();
    chart.series.forEach(serie => serie.setData(newSeries.find(newSerie => newSerie.name === serie.name).data, false, false));
    chart.redraw();
  }

  projectsToSelectOptions = (projects) => {
    return projects.map(x => ({
      value: x,
      label: x.name
    }));
  }

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

        </div>

        <h2 className="section-heading">Summary</h2>

        <div>
          <ReactHighcharts config={this.chartSettings} ref="chart" isPureConfig={true}></ReactHighcharts>
        </div>

        <h2 className="section-heading">Details</h2>
        
        <div className="usage-table">
          <BootstrapTable
            data={this.report ? this.report.entries : []}
            pagination
            ignoreSinglePage
            keyField="key"
            options={{
              hideSizePerPage: true,
              sizePerPage: 10,
              sizePerPageList: [10, 50, 100]
            }}
            >
            <TableHeaderColumn
              dataField="projectId"
              dataFormat={id => _.find(this.projects, {id}).name}
            >Project</TableHeaderColumn>
            <TableHeaderColumn
              dataField="fromDate"
              dataFormat={(cell, entry) => `${moment(entry.fromDate, moment.ISO_8601).format('YYYY-MM-DD')} - ${moment(entry.toDate, moment.ISO_8601).format('YYYY-MM-DD')}`}
            >Period</TableHeaderColumn>
            <TableHeaderColumn dataField="user">User</TableHeaderColumn>
            <TableHeaderColumn dataField="cpu">CPU (hrs)</TableHeaderColumn>
            <TableHeaderColumn dataField="volume">Volume (hrs)</TableHeaderColumn>
            <TableHeaderColumn dataField="image">Image (hrs)</TableHeaderColumn>
            <TableHeaderColumn dataFormat={(cell, row) => _.sum([row.cpu, row.volume, row.image])}>
              Total (hrs)
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
      </div>
    );
  }
}
