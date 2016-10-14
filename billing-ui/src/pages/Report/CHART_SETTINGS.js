import {Highcharts} from 'react-highcharts';

export default {
        chart: {
            type: 'area'
        },
        // title: {
        //     text: ''
        // },
        // subtitle: {
        //     text: ''
        // },
        xAxis: {
            type: 'datetime',
            // tickmarkPlacement: 'on',
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
            // labels: {
            //     formatter: function () {
            //         return this.value / 1000;
            //     }
            // }
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