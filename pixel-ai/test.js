const assert = require('assert');
const skills = require('./skills');
const modules = require('./marketplace/moduleLoader');

(async () => {
  console.log('== Skills ==');
  console.log('listed:', skills.list().map(s => s.name).join(', '));

  const climate = await skills.execute('climate', { occupant: 'neo' });
  assert.strictEqual(climate.hardwareAction.temperature, 23);
  console.log('climate(neo):', JSON.stringify(climate.hardwareAction));

  const child = await skills.execute('climate', { occupant: 'enfant' });
  assert.strictEqual(child.hardwareAction.temperature, 22);

  const maint = await skills.execute('maintenance', { issue: 'réseau wifi' });
  assert.ok(maint.guide.length >= 3);
  console.log('maintenance:', maint.guide[0]);

  const conj = await skills.execute('translate', { text: 'salam labes' });
  assert.strictEqual(conj.lang, 'tunisian');
  console.log('translate:lang=', conj.lang);

  const conv = await skills.execute('translate', { text: 'Bonjour', target: 'ar' });
  console.log('translate(Bonjour->ar):', conv.translation);

  const tr = await skills.execute('translate', { text: 'مرحبا' });
  assert.strictEqual(tr.lang, 'arabic');

  const compliance = await skills.execute('compliance');
  assert.strictEqual(compliance.taxId, '1969711pam000');
  console.log('compliance.taxId:', compliance.taxId);

  const tva = await skills.execute('accounting', { action: 'calculate_tva', amountHT: 150 });
  console.log('tva 150HT:', tva.data.totalTTC);

  const cnss = await skills.execute('accounting', { action: 'social_contributions', salary: 1000 });
  console.log('cnss 1000:', cnss.data.retenueSalariale);

  const code = await skills.execute('coding', { language: 'flutter', name: 'CabinCard' });
  assert.ok(code.generatedCode.includes('CabinCard'));
  console.log('coding flutter: ok');

  const ds = await skills.execute('data_science', { dataset: [10, 25, 30, 45, 60] });
  assert.strictEqual(ds.statistics.mean, 34);
  console.log('data_science.mean:', ds.statistics.mean);

  const chart = await skills.execute('chart', { title: 'Ventes', data: [1, 2] });
  assert.ok(chart.chartUrl.startsWith('https://quickchart.io'));
  console.log('chart url: ok');

  const pdf = await skills.execute('export', { title: 'Test Atlas', dataset: [10, 25, 30, 45, 60], format: 'pdf' });
  const fs = require('fs');
  assert.ok(fs.existsSync(pdf.filePath));
  console.log('export pdf:', pdf.url);

  const docx = await skills.execute('export', { title: 'Test Atlas', dataset: [10, 25, 30, 45, 60], format: 'word' });
  assert.ok(fs.existsSync(docx.filePath));
  console.log('export docx: ok');

  const unknown = await skills.execute('nonexistent');
  assert.strictEqual(unknown.status, 'error');
  console.log('unknown skill -> error');

  console.log('\n== Marketplace ==');
  console.log('modules:', modules.listModules().map(m => m.moduleId).join(', '));
  const legal = modules.executeModuleSkill('legal-lawyer', { action: 'agenda' });
  console.log('legal.agenda:', legal.data.nextAudiences[0]);
  const cabin = modules.executeModuleSkill('cabin-atlas', { action: 'climat', occupant: 'enfant' });
  assert.strictEqual(cabin.data.config.temperature, 22);
  console.log('cabin.climat enfant:', JSON.stringify(cabin.data.config));
  const hotel = modules.executeModuleSkill('hotel-hotel', { action: 'accueil', client: 'Amira' });
  assert.ok(hotel.data.client.includes('Amira'));
  const bad = modules.executeModuleSkill('ghost-mod');
  assert.strictEqual(bad.status, 'error');
  console.log('unknown module -> error');

  console.log('\nTous les tests passent ✔');
  process.exit(0);
})().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1); });