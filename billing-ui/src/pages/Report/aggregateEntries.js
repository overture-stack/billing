import _ from 'lodash';

export function aggregateEntries(entries, fieldToGroupBy) {
  return _(entries)
    .groupBy(fieldToGroupBy)
    .values()
    .map(items => items.reduce((acc = {cpu: 0, volume: 0, image: 0}, entry) => ({
      ...acc,
      ...entry,
      cpu: acc.cpu + (entry.cpu || 0),
      volume: acc.volume + (entry.volume || 0),
      image: acc.image + (entry.image || 0),
    })))
    .value();
}