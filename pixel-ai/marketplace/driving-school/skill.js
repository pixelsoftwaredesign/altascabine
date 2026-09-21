function execute(params) {
  const action = (params && params.action || 'eleve').toLowerCase();
  let output;
  if (action === 'eleve') {
    output = {
      message: 'Gestion des élèves et progression des leçons.',
      cours: params && params.eleve ? `${params.eleve} — suivi leçons prêt.` : 'Liste des élèves en attente de planification.'
    };
  } else if (action === 'examen') {
    output = {
      message: 'Préparation présentation permis (conduite / code).',
      simulation: 'Quizz code de la route + grille d’évaluation conduite.'
    };
  } else if (action === 'facture') {
    output = {
      message: 'Facturation des forfaits de formation (GestiActiv).',
      tva: 'TVA 19% applicable sur la formation.'
    };
  } else {
    output = { message: 'Pixel Driving Assistant actif (GestiActiv). Élèves, examens, facturation.' };
  }
  return output;
}

module.exports = { execute };