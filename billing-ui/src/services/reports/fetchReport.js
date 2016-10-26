import {fetchHeaders} from '~/utils';
import _ from 'lodash';
import encodeUriSegment from 'encode-uri-query';
import user from '~/user';

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
  user.token = response.headers.get('authorization');
  if (response.status === 401) user.logout();

  return data;
}
