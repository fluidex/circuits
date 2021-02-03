var dom = document.getElementById('container');
var myChart = echarts.init(dom);
var app = {};
const labelRotate = 0; //'tangential';
var option = {
  series: {
    type: 'sunburst',
    label: {
      rotate: labelRotate,
      //      show: false,
    },
    select: {
      label: {
        show: true,
      },
    },

    data: data,
    radius: [0, '95%'],
    sort: 'desc',

    emphasis: {
      focus: 'ancestor',
      label: {
        show: true,
        rotate: labelRotate,
      },
    },

    levels: [],
  },
};

myChart.setOption(option);
