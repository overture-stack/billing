import {observable, action} from 'mobx';
import {fetchHeaders} from '~/utils';

const user = observable({
  username: '',
  isLoggedIn: false,
  isLoggingIn: false,
  token: '',
  
  login: action(async function (username, password) {
    this.isLoggingIn = true;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: fetchHeaders.get(),
        body: JSON.stringify({
          username,
          password,
        })
      });
    if (response.status === 200) {
      this.isLoggingIn = false;
      this.username = username;
      this.token = response.headers.get('authorization');
      this.isLoggedIn = true;
    } else if (response.status === 401) {
      throw new Error('Incorrect username or password');
    } else if (response.status === 403) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    } else {
      throw new Error('Login failed');
    }
  }),

  logout: action(async function () {
    console.log('logout');
    this.isLoggedIn = false;
    return await Promise.resolve();
  })
});

window.user = user;

export default user;
