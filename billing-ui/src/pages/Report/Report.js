import React, { Component } from 'react';
import {observable, computed} from 'mobx';
import {observer} from 'mobx-react';

import ReactHighcharts from 'react-highcharts';

import CHART_SETTINGS from './CHART_SETTINGS';

import { DatePicker, Select, Radio, Button } from 'antd';
const RangePicker = DatePicker.RangePicker;
const Option = Select.Option;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;

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

  @observable projects = [
    {
      name: 'project 1',
    },
    {
      name: 'project 2'
    },
    {
      name: 'project 3'
    }
  ];
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

  handleProjectsSelect(e) {
    console.log(e);
  }

  handleProjectDeselect(e) {
    console.log(e);
  }

  async componentDidMount() {
    const series = await fetchSeries();
    const chart = this.refs.chart.getChart();
    series.forEach( serie => chart.addSeries(serie), false)
    chart.redraw(); 
  }


  render () {
    return (
      <div className="Report">
        <h1 className="page-heading">Billing Report</h1>

        <div className="form-controls">
          <div className="project-select">
            <div className="project-select__selector">
              <label>
                Projects
              </label>
              <Select
                multiple
                style={{ width: '100%' }}
                placeholder="Select Projects"
                onSelect={this.handleProjectsSelect}
                onDeselect={this.handleProjectsDeselect}
              >
                {this.projectSelectOptions}
              </Select>
            </div>
            <Button className="project-select__select-all" type="ghost" size="small">Select all</Button>
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
        
      </div>
    );
  }
}
