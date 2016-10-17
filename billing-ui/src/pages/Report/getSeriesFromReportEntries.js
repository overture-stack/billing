import moment from 'moment';
import _ from 'lodash';
import {aggregateEntries} from './aggregateEntries';

export function getSeriesFromReportEntries(entries) {
  const aggregatedEntries = aggregateEntries(entries, 'fromDate');
  return ['cpu', 'image', 'volume']
    .map(metric => ({
      name: metric,
      data: aggregatedEntries.map(entry => ({
        x: moment(entry.fromDate, moment.ISO_8601).unix(),
        y: entry[metric] || 0,
      }))
    }))
}
