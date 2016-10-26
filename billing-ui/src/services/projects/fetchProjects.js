import {fetchHeaders} from '~/utils';
import user from '~/user';

export async function fetchProjects () {
  const response = await fetch('/api/projects', {
    method: 'GET',
    headers: fetchHeaders.get(),
  });
  const responseData = await response.json();
  user.token = response.headers.get('authorization');
  if (response.status === 401) user.logout();
  return Promise.resolve(responseData);
}
