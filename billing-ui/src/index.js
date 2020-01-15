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
import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router';
import './index.scss';

import { observe } from 'mobx';
import { AppContainer } from 'react-hot-loader';
import 'whatwg-fetch';

import user from '../src/user';

import Routes from './routes';

const postLoginRoute = '/';

observe(user, change => {
  if (change.name === 'isLoggedIn' && change.oldValue === false && change.newValue === true) {
    console.log('user just logged in. redirecting to ', postLoginRoute);
    setTimeout(() => browserHistory.push(postLoginRoute));
  }
  if (change.name === 'isLoggedIn' && change.oldValue === true && change.newValue === false) {
    console.log('user logged out. redirecting to /login');
    window.location.href = '/login';
  }
})

const rootEl = document.getElementById('root');

ReactDOM.render((
  <AppContainer>
    <Routes />
  </AppContainer>
), rootEl
);

if (module.hot) {
  module.hot.accept('./routes', () => {
    // If you use Webpack 2 in ES modules mode, you can
    // use <App /> here rather than require() a <NextApp />.
    const nextRoutes = require('./routes');
    ReactDOM.render(
      <AppContainer>
        {nextRoutes}
      </AppContainer>,
      rootEl
    );
  });
}
