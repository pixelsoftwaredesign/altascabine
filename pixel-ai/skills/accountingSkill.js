function execute(params) {
  const action = (params && params.action || 'calculate_tva').toLowerCase();
  const amountHT = parseFloat(params && params.amountHT) || 0;
  const tvaRate = parseFloat(params && params.tvaRate) || 19;
  let result;

  switch (action) {
    case 'calculate_tva': {
      const tvaAmount = amountHT * (tvaRate / 100);
      const timbreFiscal = 1.000;
      const totalTTC = amountHT + tvaAmount + timbreFiscal;
      result = {
        operation: 'Calcul TVA & Facturation',
        montantHT: amountHT.toFixed(3) + ' TND',
        tauxTVA: tvaRate + '%',
        montantTVA: tvaAmount.toFixed(3) + ' TND',
        timbreFiscal: timbreFiscal.toFixed(3) + ' TND',
        totalTTC: totalTTC.toFixed(3) + ' TND',
        entreprise: 'Pixel Software Design'
      };
      break;
    }
    case 'social_contributions': {
      const baseSalary = parseFloat(params && params.salary) || 0;
      const cnssEmployee = baseSalary * 0.0918;
      const cnssEmployer = baseSalary * 0.1657;
      result = {
        operation: 'Simulation CNSS (Tunisie)',
        salaireBrut: baseSalary.toFixed(3) + ' TND',
        retenueSalariale: cnssEmployee.toFixed(3) + ' TND',
        chargePatronale: cnssEmployer.toFixed(3) + ' TND'
      };
      break;
    }
    default:
      result = { error: 'Action comptable non reconnue.' };
  }

  return { skill: 'accountingSkill', status: 'success', data: result };
}

module.exports = { execute };