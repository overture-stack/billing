import React, { Component } from 'react';
import {findDOMNode} from 'react-dom';
import animate from 'gsap-promise';
import TransitionGroup from 'react-transition-group-plus';

import Header from './Header/Header';

import './Base.scss';

const animationStates = {
  beforeEnter: {
    opacity: 0,
    // x: 50
  },
  idle: {
    opacity: 1,
    // x: 0,
  },
  afterLeave: {
    opacity: 0,
    // x: -50
  }
};

export default
class extends Component {
  componentDidMount() {
    animate.set(this.refs.container, {position: 'absolute', left: 0, top: 0});
    animate.set(findDOMNode(this.refs.childContainer), animationStates.beforeEnter);
  }

  componentWillEnter(callback) {
    this.animateIn().then(callback);
  }

  componentWillAppear(callback) {
    this.animateIn().then(callback);
  }

  componentWillLeave(callback) {
    this.animateOut().then(callback);
  }

  animateIn({delay} = {delay: 0}) {
    this.refs.header.animateIn();
    return animate.to(
      findDOMNode(this.refs.childContainer),
      0.2,
      Object.assign(animationStates.idle, {
        clearProps: 'all',
        delay: delay + 0.4
      })
    ).then(() => animate.set(this.refs.container, {clearProps: 'all'}) );
  }

  animateOut() {
    return Promise.resolve();
  }

  render () {
    const { pathname } = this.props.location;
    const key = pathname.split('/')[2] || 'root';

    return (
      <div ref="container" className="Base" style={{height: '100%'}}>
        <Header ref="header"/>
        <TransitionGroup ref="childContainer" transitionMode="out-in" className="BaseChildContainer" style={{position: 'relative'}} component="div">
          {React.cloneElement(this.props.children || <div />, { key: key })}
        </TransitionGroup>
      </div>
    );
  }
}
