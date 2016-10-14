import {fetchHeaders} from '~/utils';
import _ from 'lodash';
import encodeUriSegment from 'encode-uri-query';

export async function fetchReport ({projects, bucketSize, fromDate, toDate}) {
  const query = _.map(Object.assign({
    bucket: bucketSize,
    fromDate,
    toDate,
  }, projects.length ? { projects: projects.map(p => p.id).join(',') } : {}), (value, key) => `${key}=${encodeUriSegment(value)}`).join('&');

  const response = await fetch(`/api/reports?${query}`, {
    method: 'GET',
    headers: fetchHeaders.get(),
  });

  const data = await response.json();

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
