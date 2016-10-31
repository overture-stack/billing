import moment from 'moment';
import _ from 'lodash';
import {aggregateEntries} from './aggregateEntries';

// Note: Chang's idea  - chang
const metricNameMap = {
    'cpuCost': 'cpu',
    'imageCost': 'image',
    'volumeCost': 'volume',
};

export function getSeriesFromReportEntries(entries, {shouldShowCost}={shouldShowCost: false}) {
  const aggregatedEntries = aggregateEntries(entries, 'fromDate');
  const metrics = shouldShowCost? ['cpuCost', 'imageCost', 'volumeCost']: ['cpu', 'image', 'volume'];
  return metrics
    .map(metric => ({
      name: metricNameMap[metric] || metric,
      data: aggregatedEntries.map(entry => ({
        x: moment(entry.fromDate, moment.ISO_8601).valueOf(),
        y: entry[metric] || 0,
      }))
    }))
}
