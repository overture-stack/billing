export function getSeriesFromReportEntries(entries) {
  return ['cpu', 'image', 'volume']
    .map(metric => ({
      name: metric,
      data: entries.map(entry => entry[metric])
    }))
}
