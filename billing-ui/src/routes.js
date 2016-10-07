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
        </Route>
        <Route name="Test" path="test" component={require('./pages/Test.js')} />
      </Route>
    </Router>
)

export default routes;