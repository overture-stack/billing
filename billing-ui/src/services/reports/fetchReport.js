import {fetchHeaders} from '~/utils';
const dummyData = require('./dummyReport');

export default async function fetchReport () {
  // const response = await fetch('/api/reports/', {
  //   method: 'GET',
  //   headers: fetchHeaders.get(),
  // });
  return Promise.resolve(dummyData);
}
