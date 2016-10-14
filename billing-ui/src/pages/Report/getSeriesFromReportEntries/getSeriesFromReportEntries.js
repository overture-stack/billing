import moment from 'moment';
import _ from 'lodash';

export function getSeriesFromReportEntries(entries) {
  const aggregatedEntries = _(entries)
    .groupBy('fromDate')
    .values()
    .map(items => items.reduce((acc = {cpu: 0, volume: 0, image: 0}, a) => ({
      ...acc,
      ...a,
      cpu: acc.cpu + (a.cpu || 0),
      volume: acc.volume + (a.volume || 0),
      image: acc.image + (a.image || 0),
    })))
    .value();
  return ['cpu', 'image', 'volume']
    .map(metric => ({
      name: metric,
      data: aggregatedEntries.map(entry => ({
        x: moment(entry.fromDate, moment.ISO_8601).unix(),
        y: entry[metric] || 0,
      }))
    }))
}
