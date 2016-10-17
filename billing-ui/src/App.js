import React, { Component } from 'react';
import TransitionGroup from 'react-transition-group-plus';
import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

export default
class extends Component {
  render () {
    const { pathname } = this.props.location;
    const key = pathname.split('/')[1] || 'root';

    return (
        <LocaleProvider locale={enUS}>
          <TransitionGroup transitionMode="out-in" className="App" style={{height: '100%', position: 'relative'}} component="div">
            {React.cloneElement(this.props.children || <div />, { key })}
          </TransitionGroup>
        </LocaleProvider>
    );
  }
}
