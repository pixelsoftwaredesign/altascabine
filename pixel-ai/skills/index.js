const registry = {
  climate: require('./climateSkill'),
  maintenance: require('./maintenanceSkill'),
  translate: require('./translateSkill'),
  compliance: require('./complianceSkill'),
  accounting: require('./accountingSkill'),
  coding: require('./codingSkill'),
  data_science: require('./dataScienceSkill'),
  chart: require('./chartSkill'),
  export: require('./exportSkill')
};

function list() {
  return Object.keys(registry).map(name => ({ name, description: DESCRIPTIONS[name] || '' }));
}

const DESCRIPTIONS = {
  climate: 'Gestion climatique selon l’occupant (Néo, Enfant, Adulte) — actions matériel cabine.',
  maintenance: 'Guide de dépannage simple (online/offline) pour les cabines Atlas.',
  translate: 'PixelTranslate — détection et traduction FR / Arabe / Darja / TR / EN.',
  compliance: 'Standards tunisiens : CERT/ANCE, INPDP.',
  accounting: 'Comptabilité tunisienne : TVA 19% + timbre, charges CNSS.',
  coding: 'Génération de squelettes de code (JS/TS, Python/Django, Flutter/Dart) pour développeurs.',
  data_science: 'Analyse statistique (moyenne, médiane, min/max, écart-type) des datasets.',
  chart: 'Génération de graphiques aux couleurs Pixel (QuickChart).',
  export: 'Export de rapports PDF et Word aux normes de la charte Pixel.'
};

async function execute(name, params) {
  const skill = registry[name];
  if (!skill) return { skill: name, status: 'error', message: 'Skill inconnu ou non enregistré.' };
  try {
    return await skill.execute(params || {});
  } catch (error) {
    return { skill: name, status: 'error', message: error.message };
  }
}

module.exports = { execute, list, registry };