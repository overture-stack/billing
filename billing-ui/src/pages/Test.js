import React, { Component } from 'react';

import { DatePicker, Select, Radio } from 'antd';
const RangePicker = DatePicker.RangePicker;
const Option = Select.Option;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;


const TIME_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

export default 
class extends Component {

  handleProjectsSelect(e) {
    console.log(e);
  }

  handlePeriodChange(e) {
    console.log(e);
  }
  render () {
    return (
      <div className="Test">
          <RadioGroup
            defaultValue="a"
          >
            <RadioButton value="a">Daily</RadioButton>
            <RadioButton value="b">Weekly</RadioButton>
          </RadioGroup>
      </div>
    );
  }
}
