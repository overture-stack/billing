import {fetchHeaders} from '~/utils';
const dummyData = require('./dummyProjects');

export async function fetchProjects () {
  return Promise.resolve(dummyData);
}
