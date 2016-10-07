import React, { Component } from 'react';
import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

export default
class extends Component {
  render () {
    return (
      <div className="App" style={{height: '100%'}}>
        <LocaleProvider locale={enUS}>
          {this.props.children}
        </LocaleProvider>
      </div>
    );
  }
}
