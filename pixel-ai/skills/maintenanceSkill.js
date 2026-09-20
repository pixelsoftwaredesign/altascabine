function execute(params) {
  const issue = (params && params.issue || '').toLowerCase();
  const network = /(reseau|network|wifi|internet|iot|routeur)/.test(issue);
  const power = /(alimentation|power|electricite|panne|electricite)/.test(issue);
  const guide = [
    "1. Coupez l'alimentation électrique principale pendant 10 secondes.",
    "2. Vérifiez le voyant d'état du boîtier IoT / routeur local."
  ];
  if (network) {
    guide.push("3. Testez le lien Wi-Fi / Ethernet : reboot du routeur recommandé (10 s).");
    guide.push("4. Si le réseau ne revient pas : support Pixel Software Design +216 52 675 027.");
  } else if (power) {
    guide.push("3. Rallumez : le boîtier IoT s'initialise en ~20 s.");
    guide.push("4. En cas de persistance : disjoncteur / support +216 52 675 027.");
  } else {
    guide.push("3. En cas de persistance, contactez le support technique de Pixel Software Design au +216 52 675 027.");
  }
  return {
    skill: 'maintenanceSkill',
    status: 'success',
    guide: guide,
    online: (params && params.online !== undefined) ? !!params.online : false
  };
}

module.exports = { execute };