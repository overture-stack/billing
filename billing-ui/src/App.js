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

import { hot } from 'react-hot-loader/root';
import { observe } from 'mobx';
import { observer } from 'mobx-react';
import {
    Router,
} from 'react-router';
import {
    Redirect,
    Route,
    Switch,
    // useLocation,
} from 'react-router-dom';
import { createBrowserHistory } from 'history';
import 'whatwg-fetch';

import Login from 'pages/Login/Login';
import Report from 'pages/Report/Report.js';
import Base from 'layouts/Base/Base';
import Invoices from 'pages/Invoices/Invoices.js';

import user from './user';
import Providers from './Providers';
import './main.scss';

const history = createBrowserHistory();

const postLoginRoute = '/';

observe(user, change => {
    if (change.name === 'isLoggedIn' && change.oldValue === false && change.newValue === true) {
        setTimeout(() => history.push(postLoginRoute));
    }
    if (change.name === 'isLoggedIn' && change.oldValue === true && change.newValue === false) {
        window.location.href = '/login';
    }
});

const App = () => {
    return (
        <Router history={history}>
            {user.isLoggedIn
                ? (
                    <Providers>
                        <Base>
                            <Switch>
                                <Route component={Report} path="/report" />
                                <Route component={Invoices} path="/invoices" />
                                <Redirect from="*" to="/report" />
                            </Switch>
                        </Base>
                    </Providers>
                )
            : (
                <Switch>
                    <Route component={Login} path="/login" />
                    <Redirect to="/login" />
                </Switch>
            )}
        </Router>
    );
};

/// <Route component={} onEnter={requireAuth}>

export default hot(observer(App));
