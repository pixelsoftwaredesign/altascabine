function generateChartUrl(title, labels, data, type) {
  const palette = {
    primary: 'rgba(0, 123, 255, 0.7)',
    border: 'rgba(0, 123, 255, 1)'
  };
  const chartConfig = {
    type: type || 'bar',
    data: {
      labels: labels || [],
      datasets: [{
        label: title || 'Données',
        data: data || [],
        backgroundColor: palette.primary,
        borderColor: palette.border,
        borderWidth: 1
      }]
    },
    options: {
      legend: { display: !!title },
      title: { display: !!title, text: title || '' },
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?w=800&h=400&c=${encodedConfig}`;
}

function execute(params) {
  return {
    skill: 'chartSkill',
    status: 'success',
    chartUrl: generateChartUrl(params && params.title, params && params.labels, params && params.data, params && params.type)
  };
}

module.exports = { generateChartUrl, execute };