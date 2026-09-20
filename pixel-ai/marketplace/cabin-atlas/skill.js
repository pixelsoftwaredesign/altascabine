function execute(params) {
  const action = (params && params.action || 'etat').toLowerCase();
  let output;
  if (action === 'etat') {
    output = {
      message: 'État de la cabine Atlas (porte, climatisation, éclairage, IoT).',
      cabine: params && params.cabine || 'A-01',
      telemetrie: 'Température, humidité, consommation, connectivité routeur local.'
    };
  } else if (action === 'climat') {
    const occupant = params && params.occupant || 'adulte';
    const cfg = occupant === 'neo' || occupant === 'nourrisson'
      ? { temperature: 23, fanSpeed: 1, mode: 'Néo / zéro courant d\'air' }
      : occupant === 'enfant'
        ? { temperature: 22, fanSpeed: 2, mode: 'Confort enfant' }
        : { temperature: 21.5, fanSpeed: 2, mode: 'Standard adulte' };
    output = { message: `Climat adapté au profil ${occupant}.`, config: cfg };
  } else if (action === 'maintenance') {
    output = {
      message: 'Procédure de réinitialisation simple.',
      steps: ['Couper l\'alimentation 10 s', 'Rallumer (initialisation IoT ~20 s)', 'Si besoin : +216 52 675 027']
    };
  } else if (action === 'lead') {
    output = {
      message: 'Capture d\'un prospect visiteur de la cabine.',
      offline: 'Enregistré localement, synchronisé sur /api/sync au retour du réseau.'
    };
  } else {
    output = { message: 'Pixel Atlas Cabin Manager actif. État, climat, maintenance, leads.' };
  }
  return output;
}

module.exports = { execute };