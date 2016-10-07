import React, { Component } from 'react';

import Header from './Header/Header';

import './Base.scss';

export default
class extends Component {
  render () {
    return (
      <div className="Base" style={{height: '100%'}}>
        <Header/>
        {this.props.children}
      </div>
    );
  }
}
