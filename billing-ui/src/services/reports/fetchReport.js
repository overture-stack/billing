import {fetchHeaders} from '~/utils';
import _ from 'lodash';

export async function fetchReport ({projects, bucketSize, fromDate, toDate}) {
  // const response = await fetch('/api/reports/', {
  //   method: 'GET',
  //   headers: fetchHeaders.get(),
  // });
  const data = require('./makeDummyReport')({number: 500, bucketSize, fromDate, toDate});

  return Promise.resolve(Object.assign(
    {},
    data,
    {
      entries: data.entries.map((x => Object.assign(
        {}, x, {
          key: _.uniqueId()
        }
      )))
    }
    ));
}
