function execute(params) {
  const occupant = (params && params.occupant || 'adulte').toLowerCase();
  let config;

  if (occupant === 'neo' || occupant === 'nourrisson' || occupant === 'newborn') {
    config = { temperature: 23, fanSpeed: 1, mode: 'Néo / Zéro courant d\'air' };
  } else if (occupant === 'enfant' || occupant === 'child') {
    config = { temperature: 22, fanSpeed: 2, mode: 'Confort Enfant' };
  } else {
    config = { temperature: 21.5, fanSpeed: 2, mode: 'Standard Adulte' };
  }

  return {
    skill: 'climateSkill',
    status: 'success',
    hardwareAction: config,
    occupant: occupant,
    message: `Climatisation ajustée avec succès pour le profil : ${occupant}.`
  };
}

module.exports = { execute };