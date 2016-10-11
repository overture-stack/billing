import {fetchHeaders} from '~/utils';
import _ from 'lodash';
const dummyData = require('./dummyReport');

export async function fetchReport () {
  // const response = await fetch('/api/reports/', {
  //   method: 'GET',
  //   headers: fetchHeaders.get(),
  // });
  return Promise.resolve(Object.assign(
    {},
    dummyData,
    {
      entries: dummyData.entries.map((x => Object.assign(
        {}, x, {
          key: _.uniqueId()
        }
      )))
    }
    ));
}
