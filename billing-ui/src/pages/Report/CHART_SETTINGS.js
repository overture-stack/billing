export default {
      chart: {
          type: 'column'
      },
      title: {
          text: 'Stacked column chart'
      },
      xAxis: {
          categories: ['Apples', 'Oranges', 'Pears', 'Grapes', 'Bananas']
      },
      yAxis: {
          min: 0,
          title: {
              text: 'Total fruit consumption'
          },
          stackLabels: {
              enabled: true,
              style: {
                  fontWeight: 'bold',
                  color: 'gray'
              }
          }
      },
      legend: {
          align: 'right',
          x: -30,
          verticalAlign: 'top',
          y: 25,
          floating: true,
          backgroundColor: 'white',
          borderColor: '#CCC',
          borderWidth: 1,
          shadow: false,
      },
      tooltip: {
          headerFormat: '<b>{point.x}</b><br/>',
          pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
      },
      plotOptions: {
          column: {
              stacking: 'normal',
              dataLabels: {
                  enabled: true,
                  color: 'white'
              }
          }
      },
      series: []
  };