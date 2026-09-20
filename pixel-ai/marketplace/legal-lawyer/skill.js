function execute(params) {
  const action = (params && params.action || 'consultation').toLowerCase();
  let output;
  if (action === 'agenda') {
    output = {
      message: 'Gestion du planning des plaidoiries et des rendez-vous clients.',
      nextAudiences: ['Affaire 402 - Tribunal de Gabès (Demain 09:00)']
    };
  } else if (action === 'legal_fee') {
    output = {
      message: 'Calcul des honoraires selon le barème indicatif.',
      honorairesBase: 'Conformément aux réglementations en vigueur en Tunisie.'
    };
  } else if (action === 'dossier') {
    output = {
      message: 'Classement de dossier : pièces, calendrier procédural, échéances.',
      template: 'note' + '.txt — Client/Contre-partie/Objet/Pièces/Prochaine audience.'
    };
  } else {
    output = { message: 'Pixel Legal Assistant actif. Prêt à rédiger des notes ou classer vos dossiers.' };
  }
  return output;
}

module.exports = { execute };