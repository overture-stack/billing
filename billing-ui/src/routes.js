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

import React from 'react';
import {
    Router, Route, browserHistory, IndexRedirect,
} from 'react-router';

import user from './user';
import App from './App';
import Login from './pages/Login/Login';
import Report from './pages/Report/Report.js';
import Base from './layouts/Base/Base';
import Invoices from './pages/Invoices/Invoices.js';

function requireAuth(nextState, replace) {
    if (!user.isLoggedIn) {
        replace({
            pathname: '/login',
            state: { nextPathname: nextState.location.pathname },
        });
    }
}
const Routes = () => (
    <Router history={browserHistory}>
        <Route component={App} name="App" path="/">
            <IndexRedirect to="/report" />
            <Route component={Login} name="Login" path="login" />
            <Route component={Base} name="BaseLayout" onEnter={requireAuth}>
                <Route component={Report} name="Report" path="report" />
                <Route component={Invoices} name="Invoices" path="invoices" />
            </Route>
        </Route>
    </Router>
);

export default Routes;
