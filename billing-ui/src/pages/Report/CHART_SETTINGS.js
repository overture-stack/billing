import {Highcharts} from 'react-highcharts';
import {getSeriesFromReportEntries} from './getSeriesFromReportEntries';

export default {
  chart: {
    type: 'area',
    alignTicks: true
  },
  credits: {
      enabled: false
  },
  title: {
    text: ''
  },
  xAxis: {
    type: 'datetime',
    title: {
      enabled: false
    },
    dateTimeLabelFormats: {
      hour: '%l:%M %p'
    },
    labels: {
      formatter: function () {
        return Highcharts.dateFormat('%a %d %b', this.value);
      }
    },
  },
  yAxis: {
    title: {
      text: 'Cost ($)'
    },
  },
  tooltip: {
    split: false,
    valueDecimals: 2,
  },
  plotOptions: {
    area: {
      stacking: 'normal',
      lineColor: '#666666',
      lineWidth: 0,
      marker: {
        lineWidth: 0,
        lineColor: '#666666'
      }
    }
  },
  series: getSeriesFromReportEntries([])
};