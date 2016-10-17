import {fetchHeaders} from '~/utils';

export async function fetchProjects () {
  const response = await fetch('/api/projects', {
    method: 'GET',
    headers: fetchHeaders.get(),
  });
  const responseData = await response.json();
  return Promise.resolve(responseData);
}
