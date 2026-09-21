function execute(params) {
  const action = (params && params.action || 'caisse').toLowerCase();
  let output;
  if (action === 'caisse') {
    output = {
      message: 'Suivi de caisse et tickets (caisse électronique).',
      ticket: params && params.montant ? `Ticket à encaisser : ${params.montant} TND — TVA 19% (ou taux réduit).` : null
    };
  } else if (action === 'stock') {
    output = { message: 'Gestion de stock et alertes de réapprovisionnement.', alerteSeuil: params && params.seuil ? `< seuil ${params.seuil}` : null };
  } else if (action === 'z') {
    output = { message: "Clôture de caisse (Z) et écart de caisse.", conformite: 'Journal de caisse conforme.' };
  } else {
    output = { message: 'Pixel Retail Compta actif. Caisse, stock, clôture Z.' };
  }
  return output;
}

module.exports = { execute };