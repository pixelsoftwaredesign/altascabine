function execute(params) {
  const action = (params && params.action || 'accueil').toLowerCase();
  let output;
  if (action === 'accueil') {
    output = {
      message: 'Accueil et conciergerie des clients.',
      client: params && params.client ? `Bienvenue ${params.client} ! Réservation, services, excursions.` : 'Message d’accueil multilingue AR/FR/EN prêt.'
    };
  } else if (action === 'menage') {
    output = { message: 'Planification ménage / disponibilité des chambres.', occupation: null };
  } else if (action === 'devis') {
    output = {
      message: 'Devis séjours et packs excursion.',
      tva: 'TVA touristique applicable — taux en cours.'
    };
  } else {
    output = { message: 'Pixel Hotel Concierge actif. Accueil, ménage, devis.' };
  }
  return output;
}

module.exports = { execute };