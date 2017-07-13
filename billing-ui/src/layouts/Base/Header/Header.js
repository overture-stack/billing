/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public
 * License v3.0. You should have received a copy of the GNU General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import React, {Component} from 'react';
import { Link } from 'react-router'
import animate from 'gsap-promise';
import user from '~/user';
import {fetchProjects} from '~/services/projects';
import _ from 'lodash';


import './Header.scss';

const containerAnimationStates = {
  beforeEnter: {
    xPercent: '100%'
  },
  idle: {
    xPercent: '0'
  },
};

const elementAnimationStates = {
  beforeEnter: {
    opacity: 0,
    x: 20
  },
  idle: {
    opacity: 1,
    x: 0,
  },
};

export default class extends Component {
  state = { roles: {} }

  componentDidMount () {
    this.initUIState();  
    this.setRoles();
  }

  async setRoles() {
    const projects = await fetchProjects();
    const report = !!_.find(projects, (project) => _.includes(project.roles, 'billing_test'));
    const invoices = !!_.find(projects, (project) => _.includes(project.roles, 'invoice_test'));
    this.setState({
      roles: {
        report,
        invoices
      }
    });
  }

  initUIState() {
    const elements = [this.refs.logo, this.refs.logout];
    return Promise.all([
      animate.set(this.refs.container, containerAnimationStates.beforeEnter),
      animate.set(elements, elementAnimationStates.beforeEnter),
    ]);
  }

  async animateIn() {
    const elements = [this.refs.logo, this.refs.logout];
    await animate.to(this.refs.container, 0.1, containerAnimationStates.idle);
    await animate.staggerTo(elements, 0.2, Object.assign(elementAnimationStates.idle, {clearProps: 'all'}), 0.1);
  }

  render() {
    return (
      <header>
        <div
          ref="topbar"
          className="topbar">
            <div
              className="link-container">
              <a
                  ref="website-link"
                  className="links"
                  href="http://www.cancercollaboratory.org"
                  target="_blank"
              >Collaboratory Website</a>
              <span className="links"> | </span>
              <a
                  ref="console-link"
                  className="links"
                  href="https://console.cancercollaboratory.org/horizon/auth/login/?next=/"
                  target="_blank"
              >Collaboratory Console</a>
            </div>
            <div
              className="user-container"
            >
              <span
                className="glyphicon glyphicon-user user-icon">
              </span>
              <span
                className="user-logout"
                onClick={() => user.logout()}
              >Logout</span>
            </div>
        </div>
        <div className="Header">
          <div>
            <img
              className="logo"
              src={require('~/assets/images/logo.svg')}
              alt="Cancer Genome COLLABORATORY"
            />
          </div>
          <div>
            <ul
              className="menu">
              {this.state.roles.report && 
                <li>
                  <Link
                    to="/report"
                    activeClassName="active"
                  >
                    Report
                  </Link>
                </li>
              }
              {this.state.roles.invoices &&
                <li>
                  <Link 
                    to="/invoices"
                    activeClassName="active"
                  >
                    Invoices
                  </Link>
                </li>
              }
            </ul>
          </div>
        </div>
      </header>
    );
  }
}