import React, { Component } from 'react';
import {observable} from 'mobx';
import {observer} from 'mobx-react';

import user from '~/user';

import './Login.scss';

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

  render () {
    return (
      <div className="Login">
        <div className="login-inner">
          <img
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
                id="password"
                type="password"
                className="form-control"
                name="password"
                placeholder="Password"
                onChange={e => {this.password = e.target.value}}
              />
            </div>
            <div className="form-group">
                <button type="submit" className="dcc form-control btn btn-primary">
                  Login
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}