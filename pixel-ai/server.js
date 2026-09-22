const express = require('express');
const path = require('path');
const fs = require('fs');

const skills = require('./skills');
const modules = require('./marketplace/moduleLoader');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const DATA = path.join(__dirname, 'data');
const REPORTS = path.join(__dirname, 'reports');

function storeFile(name, obj) {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  const p = path.join(DATA, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}
function readFile(name, fallback) {
  const p = path.join(DATA, name);
  try {
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
  } catch (e) { return fallback; }
}

const leadsStore = { pending: () => readFile('leads.json', []), flush: (leads) => storeFile('leads.json', leads) };

const CAST_DIR = path.join(__dirname, 'data', 'cast');
const castRooms = {};
function castPath(n) { return path.join(CAST_DIR, n); }
if (!fs.existsSync(CAST_DIR)) fs.mkdirSync(CAST_DIR, { recursive: true });

function castCleanup() {
  const now = Date.now();
  for (const r in castRooms) {
    const c = castRooms[r];
    if (now - c.created > 30 * 60 * 1000) {
      try { fs.unlinkSync(castPath(c.file)); } catch (e) {}
      delete castRooms[r];
    }
  }
}

setInterval(castCleanup, 60 * 1000).unref();

app.post('/api/cast/room', (req, res) => {
  const cabin = String((req.body && req.body.cabin) || 'Cabine N°01').slice(0, 40);
  const room = String(Math.floor(100000 + Math.random() * 900000));
  castRooms[room] = { cabin, created: Date.now(), ready: false, url: null, name: null, type: null, size: 0 };
  res.json({ status: 'success', room, expiresIn: 1800 });
});

app.post('/api/cast/:room', express.raw({ type: () => true, limit: '600mb' }), (req, res) => {
  const c = castRooms[req.params.room];
  if (!c) return res.status(404).json({ status: 'error', message: 'Salle inconnue.' });
  const name = String((req.query && req.query.name) || 'media').slice(0, 120).replace(/[^\w.\- ]+/g, '');
  const type = String((req.query && req.query.type) || '').slice(0, 80);
  const ext = path.extname(name) || (type.startsWith('video') ? '.mp4' : '.mp3');
  const fname = req.params.room + '-c' + Math.floor(Date.now() / 1000) + ext;
  fs.writeFileSync(castPath(fname), req.body);
  c.file = fname;
  c.ready = true;
  c.url = '/cast/' + fname;
  c.name = name;
  c.type = type || 'audio';
  c.size = req.body.length;
  res.json({ status: 'success', room: req.params.room, url: c.url, size: c.size });
});

app.get('/api/cast/:room', (req, res) => {
  const c = castRooms[req.params.room];
  if (!c) return res.status(404).json({ status: 'error', message: 'Salle inconnue ou expirée.' });
  res.json({ status: 'success', room: req.params.room, cabin: c.cabin, ready: c.ready, url: c.url, name: c.name, type: c.type, size: c.size });
});

app.delete('/api/cast/:room', (req, res) => {
  const c = castRooms[req.params.room];
  if (c) {
    try { fs.unlinkSync(castPath(c.file)); } catch (e) {}
    delete castRooms[req.params.room];
  }
  res.json({ status: 'success' });
});

app.use('/cast', express.static(CAST_DIR, { setHeaders: (res) => setImmediate(() => {
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
}) }));

app.use(express.static(path.join(__dirname, 'public')));
if (fs.existsSync(REPORTS)) app.use('/reports', express.static(REPORTS));

app.get('/api/skills', (req, res) => res.json({ status: 'success', count: skills.list().length, skills: skills.list() }));

app.post('/api/pixel-ai/execute', async (req, res) => {
  try {
    const { skillName, parameters } = req.body || {};
    const result = await skills.execute(skillName, parameters);
    if (result.status === 'error' && !skills.list().some(s => s.name === skillName)) {
      return res.status(400).json(result);
    }
    res.json({ status: 'success', data: result });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.get('/api/modules', (req, res) => res.json({ status: 'success', count: modules.listModules().length, modules: modules.listModules() }));

app.post('/api/modules/execute', (req, res) => {
  const { moduleId, parameters } = req.body || {};
  const result = modules.executeModuleSkill(moduleId, parameters);
  if (result.status === 'error' && !modules.moduleManifest(moduleId)) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/modules/:id', (req, res) => {
  const manifest = modules.moduleManifest(req.params.id);
  if (!manifest) return res.status(404).json({ status: 'error', message: 'Module inconnu.' });
  res.json({ status: 'success', manifest });
});

app.get('/api/modules/:id/code', (req, res) => {
  const code = modules.moduleCode(req.params.id);
  if (!code) return res.status(404).json({ status: 'error', message: 'Module inconnu.' });
  res.type('text/plain').send(code);
});

app.post('/api/generate-report', async (req, res) => {
  try {
    const { title, dataset, format } = req.body || {};
    const result = await skills.execute('export', { title, dataset, format });
    if (result.status === 'error') return res.status(400).json(result);
    res.json({ status: 'success', data: result, statistics: result.statistics, chartPreviewUrl: undefined });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.post('/api/sync', (req, res) => {
  try {
    const incoming = Array.isArray(req.body) ? req.body : (req.body && req.body.leads) || [];
    const combined = leadsStore.pending().concat(incoming.map(l => ({
      name: l.name, email: l.email, phone: l.phone, ts: l.ts || new Date().toISOString()
    })));
    const dedup = [...new Map(combined.map(l => [l.email + '|' + l.phone, l])).values()];
    const file = leadsStore.flush(dedup);
    res.json({ status: 'success', stored: dedup.length, file });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.get('/api/leads', (req, res) => res.json({ status: 'success', leads: leadsStore.pending() }));

app.get('/api/system/status', async (req, res) => {
  const compliance = await skills.execute('compliance');
  res.json({
    status: 'success',
    system: 'Pixel AI',
    skills: skills.list().length,
    modules: modules.listModules().map(m => m.moduleId),
    leads: leadsStore.pending().length,
    compliance: compliance.data || compliance
  });
});

app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route inconnue : ' + req.method + ' ' + req.path }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pixel AI — Architecture Skills (MCP-ready) en écoute sur http://localhost:${PORT}`);
  console.log(`Skills : ${skills.list().map(s => s.name).join(', ')}`);
  console.log(`Modules métiers : ${modules.listModules().map(m => m.moduleId).join(', ')}`);
});