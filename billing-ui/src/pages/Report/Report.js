import React, { Component } from 'react';
import {observable, computed, autorun, reaction} from 'mobx';
import {observer} from 'mobx-react';

import moment from 'moment';
import ReactHighcharts from 'react-highcharts';

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

import './Report.scss';

const TIME_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

const DATE_FORMAT = 'YYYY-MM-DD';

export default @observer
class extends Component {

  @observable projects = [];
  @observable chartSettings = CHART_SETTINGS;
  @observable filters = {
    projects: [],
    fromDate: moment(),
    toDate: moment().subtract(1, 'y'),
    bucketSize: TIME_PERIODS.MONTHLY,
  };

  handleProjectsChange = (option) => {
    this.filters.projects = option.map(x => x.value);
  }

  handleRangeFilterChange = (dates, dateStrings) => {
    console.log('handleRangeFilterChange', dates, dateStrings);
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
        bucketSize: this.filters.bucketSize,
        fromDate: this.filters.fromDate.format(DATE_FORMAT),
        toDate: this.filters.toDate.format(DATE_FORMAT),
      });
      this.redrawChart();
  }

  redrawChart = () => {
    const series = getSeriesFromReportEntries(this.report.entries);
    const chart = this.refs.chart.getChart();
    chart.series.forEach(serie => serie.remove());
    series.forEach(serie => chart.addSeries(serie), false)
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
        <pre>
          {JSON.stringify(this.filters, null, '  ')}
        </pre>
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
            <RangePicker format="YYYY-MM-DD" onChange={this.handleRangeFilterChange}/>
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
          <TableHeaderColumn dataField="projectId">Project</TableHeaderColumn>
          <TableHeaderColumn
            dataField="fromDate"
            dataFormat={(cell, entry) => `${entry.fromDate} - ${entry.toDate}`}
          >Period</TableHeaderColumn>
          <TableHeaderColumn dataField="cpu">CPU (hrs)</TableHeaderColumn>
          <TableHeaderColumn dataField="volume">Volume (hrs)</TableHeaderColumn>
          <TableHeaderColumn dataField="image">Image (hrs)</TableHeaderColumn>
          <TableHeaderColumn dataFormat={(cell, row) => (row.cpu + row.volume + row.image)}>
            Total (hrs)
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}
