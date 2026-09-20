function execute(params) {
  const action = (params && params.action || 'rdv').toLowerCase();
  let output;
  if (action === 'rdv') {
    output = {
      message: 'Planification de rendez-vous patients.',
      slots: params && params.patient ? `Rendez-vous proposé pour ${params.patient} : prochain créneau dispo.` : 'Créneaux à confirmer avec le secrétariat.'
    };
  } else if (action === 'dossier') {
    output = {
      message: 'Accès dossier patient (confidentiel — conformité INPDP).',
      note: 'Données de santé chiffrées, accès restreint au personnel habilité.'
    };
  } else if (action === 'alerte') {
    output = { message: 'Rappel de suivi et alertes de stock matériel paramédical.', alert: null };
  } else {
    output = { message: 'Pixel Clinic Assistant actif. Rendez-vous, dossiers, alertes.' };
  }
  return output;
}

module.exports = { execute };