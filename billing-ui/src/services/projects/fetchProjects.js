import {fetchHeaders} from '~/utils';
const dummyData = require('./dummyProjects');

export default async function fetchProjects () {
  // const response = await fetch('/api/projects/', {
  //   method: 'GET',
  //   headers: fetchHeaders.get(),
  // });
  return Promise.resolve(dummyData);
}
