import React, { Component } from 'react';
import {findDOMNode} from 'react-dom';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import animate from 'gsap-promise';
import user from '~/user';

import './Login.scss';

const animationStates = {
  beforeEnter: {
    opacity: 0,
    y: -10
  },
  idle: {
    opacity: 1,
    y: 0,
  },
  afterLeave: {
    opacity: 0,
    y: -10
  }
};

export default @observer
class extends Component {

  @observable username = '';
  @observable password = '';
  @observable errorMessage = '';

  handleSubmit = async (e) => {
    e.preventDefault();
    this.errorMessage = '';
    try {
      await user.login(this.username, this.password);
    } catch (e) {
      this.errorMessage = e.message;
    }
  }

  async componentWillAppear(callback) {
    this.animateIn({delay: 1})
      .then(callback);
  }

  componentWillEnter(callback) {
    this.animateIn().then(callback);
  }

  componentWillLeave(callback) {
    this.animateOut().then(callback);
  }

  animateIn({delay} = {delay: 0}) {
    const elements = [
      this.refs.logo,
      this.refs.usernameInput,
      this.refs.passwordInput,
      this.refs.loginButton,
    ];
    return animate.staggerFromTo(
      elements,
      0.25,
      animationStates.beforeEnter,
      Object.assign({}, animationStates.idle, { delay, clearProps: 'all' }),
      0.1
    );
  }

  animateOut() {
    const elements = [
      this.refs.logo,
      this.refs.usernameInput,
      this.refs.passwordInput,
      this.refs.loginButton,
    ];
    return animate.staggerTo(
      elements,
      0.25,
      Object.assign(animationStates.afterLeave),
      0.1
    );
  }

  render () {
    return (
      <div className="Login" ref="container">
        <div className="login-inner">
          <img
            ref="logo"
            alt="Cancer Genome COLLABORATORY"
            className="logo"
            src={require('~/assets/images/logo-full.png')}
          />
          
          {this.errorMessage && (
            <div className="alert alert-danger">
              {this.errorMessage}
            </div>
          )}

          <form
            id="login-form"
            className="form-horizontal col-sm-3"
            onSubmit={this.handleSubmit}
          >
            <div className="form-group">
              <input
                ref="usernameInput"
                id="username"
                autoFocus={true}
                className="form-control"
                name="username"
                placeholder="Username"
                onChange={e => {this.username = e.target.value}}
              />
            </div>
            <div className="form-group">
              <input
                ref="passwordInput"
                id="password"
                type="password"
                className="form-control"
                name="password"
                placeholder="Password"
                onChange={e => {this.password = e.target.value}}
              />
            </div>
            <div className="form-group">
                <button ref="loginButton" type="submit" className="dcc form-control btn btn-primary">
                  Login
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}