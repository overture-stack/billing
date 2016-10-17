import _ from 'lodash';

export function aggregateEntries(entries, groupByIteratee) {
  console.log(_.groupBy(entries, groupByIteratee));
  return _(entries)
    .groupBy(groupByIteratee)
    .map((items, key) => items.reduce((acc, entry) => ({
      ...acc,
      ...entry,
      cpu: (acc.cpu || 0) + (entry.cpu || 0),
      volume: (acc.volume || 0) + (entry.volume || 0),
      image: (acc.image || 0) + (entry.image || 0),
      key,
    })))
    .value();
}