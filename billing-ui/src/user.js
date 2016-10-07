import {observable, action} from 'mobx';

const user = observable({
  username: '',
  roles: [],
  isLoggedIn: false,
  isLoggingIn: false,
  
  login: action(async function (username, password) {
    this.isLoggedIn = true;
    return await Promise.resolve();
  }),

  logout: action(async function () {
    console.log('logout');
    this.isLoggedIn = false;
    return await Promise.resolve();
  })
});

window.user = user;

export default user;
