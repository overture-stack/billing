import moment from 'moment';

export function getSeriesFromReportEntries(entries) {
  return ['cpu', 'image', 'volume']
    .map(metric => ({
      name: metric,
      data: entries.map(entry => ({
        x: moment(entry.fromDate, 'YYYY-MM-DD').toDate(),
        y: entry[metric],
      }))
    }))
}
