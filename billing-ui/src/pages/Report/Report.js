import React, { Component } from 'react';
import {observable, computed} from 'mobx';
import {observer} from 'mobx-react';

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

const dummySeries = require('./dummySeries');

import './Report.scss';

const TIME_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

function fetchSeries() {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(dummySeries), 1000);
  });
}

export default @observer
class extends Component {

  @observable projects = [];
  @computed get projectSelectOptions() {
    return this.projects.map(x => (
      <Option key={x.name} value={x.name}>
        {x.name}
      </Option>
    ));
  }

  @observable selectedProjects = [];
  @observable timePeriod = TIME_PERIODS.DAILY;

  @observable chartSettings = CHART_SETTINGS;

  handleProjectsChange = (projects) => {
    this.selectedProjects = projects;
  }

  async componentDidMount() {
    this.fetchChart();
  }

  fetchChart = async () => {
    const series = await fetchSeries();
    const chart = this.refs.chart.getChart();
    series.forEach( serie => chart.addSeries(serie), false)
    chart.redraw(); 
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
              options={this.projects.slice()}
              value={this.selectedProjects.slice()}
              onChange={this.handleProjectsChange}
            >
            </Select>
          </div>


          <div className="range-select">
            <RangePicker/>
          </div>

          <div className="interval-select">
            <RadioGroup>
              <RadioButton
                checked={this.timePeriod === TIME_PERIODS.DAILY}
                onClick={() => this.timePeriod = TIME_PERIODS.DAILY}
                value={TIME_PERIODS.DAILY}
              >Daily</RadioButton>
              <RadioButton
                checked={this.timePeriod === TIME_PERIODS.WEEKLY}
                onClick={() => this.timePeriod = TIME_PERIODS.WEEKLY}
                value={TIME_PERIODS.WEEKLY}
              >Weekly</RadioButton>
              <RadioButton
                checked={this.timePeriod === TIME_PERIODS.MONTHLY}
                onClick={() => this.timePeriod = TIME_PERIODS.MONTHLY}
                value={TIME_PERIODS.MONTHLY}
              >Monthly</RadioButton>
              <RadioButton
                checked={this.timePeriod === TIME_PERIODS.YEARLY}
                onClick={() => this.timePeriod = TIME_PERIODS.YEARLY}
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
        
        <BootstrapTable data={dummySeries}>
          <TableHeaderColumn dataField="name" isKey={true}>Name</TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}
