import {Highcharts} from 'react-highcharts';
import {getSeriesFromReportEntries} from './getSeriesFromReportEntries';

export default {
    colors: [
        '#3498DB',
        '#E74C3C',
        '#2C3E50',
    ],
        chart: {
            type: 'area'
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
              formatter: function() {
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
            split: true,
            // valueSuffix: ' millions'
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