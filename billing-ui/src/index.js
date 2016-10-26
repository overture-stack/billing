import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router';
import './index.scss';

import {observe} from 'mobx';
import { AppContainer } from 'react-hot-loader';
import 'whatwg-fetch';


import user from '~/user';

import routes from './routes';

const postLoginRoute = '/';

observe(user, change => {
  if (change.name === 'isLoggedIn' && change.oldValue === false && change.newValue === true) {
    console.log('user just logged in. redirecting to ', postLoginRoute);
    setTimeout(() => browserHistory.push(postLoginRoute));
  }
  if (change.name === 'isLoggedIn' && change.oldValue === true && change.newValue === false) {
    console.log('user logged out. redirecting to /login');
    browserHistory.push('/login');
  }
})

const rootEl = document.getElementById('root');

ReactDOM.render((
  <AppContainer>
    {routes}
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
