function analyzeData(dataset) {
  if (!Array.isArray(dataset) || dataset.length === 0) {
    return { error: 'Aucune donnée fournie' };
  }
  const nums = dataset.map(Number).filter(n => !isNaN(n));
  if (nums.length === 0) return { error: 'Données non numériques' };
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return {
    count: nums.length,
    sum: parseFloat(sum.toFixed(2)),
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: parseFloat(Math.sqrt(variance).toFixed(2))
  };
}

function execute(params) {
  return { skill: 'dataScienceSkill', status: 'success', statistics: analyzeData(params && params.dataset) };
}

module.exports = { analyzeData, execute };