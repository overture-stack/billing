import _ from 'lodash';

export function aggregateEntries(entries, groupByIteratee) {
  return _(entries)
    .groupBy(groupByIteratee)
    .values()
    .map(items => items.reduce((acc, entry) => ({
      ...acc,
      ...entry,
      cpu: (acc.cpu || 0) + (entry.cpu || 0),
      volume: (acc.volume || 0) + (entry.volume || 0),
      image: (acc.image || 0) + (entry.image || 0),
    })))
    .value();
}