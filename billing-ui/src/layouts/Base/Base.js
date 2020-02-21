/*
 * Copyright 2020(c) The Ontario Institute for Cancer Research. All rights reserved.
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
import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import animate from '@jam3/gsap-promise';
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
    animate.set(this.refs.container, { position: 'absolute', left: 0, top: 0 });
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

  animateIn({ delay } = { delay: 0 }) {
    this.refs.header.animateIn();
    return animate.to(
      findDOMNode(this.refs.childContainer),
      0.2,
      Object.assign(animationStates.idle, {
        clearProps: 'all',
        delay: delay + 0.4
      })
    ).then(() => animate.set(this.refs.container, { clearProps: 'all' }));
  }

  animateOut() {
    return Promise.resolve();
  }

  render() {
    const { pathname } = this.props.location;
    const key = pathname.split('/')[2] || 'root';

    return (
      <div ref="container" className="Base" style={{ height: '100%' }}>
        <Header ref="header" />
        <TransitionGroup ref="childContainer" transitionMode="out-in" className="BaseChildContainer" style={{ position: 'relative' }} component="div">
          {React.cloneElement(this.props.children || <div />, { key: key })}
        </TransitionGroup>
      </div>
    );
  }
}
