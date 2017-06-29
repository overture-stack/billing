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
import { Router, Route, browserHistory, IndexRedirect } from 'react-router'

import user from '~/user.js';

function requireAuth(nextState, replace) {
  if (!user.isLoggedIn) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

const routes = (
    <Router history={browserHistory}>
      <Route name="App" path="/" component={require('./App.js')}>
        <IndexRedirect to="/report"/>
        <Route name="Login" path="login" component={require('./pages/Login/Login.js')} />
        <Route name="BaseLayout" component={require('./layouts/Base/Base')} onEnter={requireAuth}>
          <Route name="Report" path="report" component={require('./pages/Report/Report.js')}/>
          <Route name="Invoices" path="invoices" component={require('./pages/Invoices/Invoices.js')}/>
        </Route>
        <Route name="Test" path="test" component={require('./pages/Test.js')} />
      </Route>
    </Router>
)

export default routes;