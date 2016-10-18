import {Highcharts} from 'react-highcharts';
import {getSeriesFromReportEntries} from './getSeriesFromReportEntries';

export default {
  chart: {
    type: 'area'
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
        console.log(this.value)
        return Highcharts.dateFormat('%a %d %b', this.value);
      }
    },
  },
  yAxis: {
    title: {
      text: 'Usage'
    },
  },
  tooltip: {
    split: false,
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