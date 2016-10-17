import {computed} from 'mobx';
import user from '~/user.js';

export const fetchHeaders = computed(() => ({
  Authorization: `Bearer ${user.token}`,
  Accept: 'application/json',
  'content-type': 'application/json',
}));