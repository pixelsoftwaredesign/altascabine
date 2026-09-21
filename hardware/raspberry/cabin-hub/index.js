// ============================================================================
// ATLAS CABINE — cabin-hub (Raspberry Pi) — edge brain de la cabine
// S'adapte au matériel détecté :
//   MQTT atlas/<cab>/material (publié par l'ESP32) -> caps réelles.
// Sert le kiosque web, stream WS :3000, commandes REST, télémétrie .jsonl.
// ============================================================================
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mqtt = require('mqtt');
const { WebSocketServer } = require('ws');

// ---- Assistante Atlas : IA privée ON-BOARD (aucune requête externe) ----
let ASSISTANT_KB = { intents: [], suggestions: [] };
try {
  ASSISTANT_KB = JSON.parse(fs.readFileSync(path.join(__dirname, 'assistant-kb.json'), 'utf8'));
  log('[IA]', 'Assistante privée prête :', ASSISTANT_KB.intents.length, 'intents');
} catch (e) { log('[IA]', 'base de connaissances absente', e.message); }

function normText(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
async function assistantReply(q, ctx) {
  ctx = ctx || {};
  const tokens = normText(q).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOPWORDS.has(t));
  let best = null, bs = 0;
  for (const e of ASSISTANT_KB.intents) {
    let s = 0;
    for (const t of tokens) if (e.kw.some(k => normText(k).includes(t))) s++;
    if (s > bs && s >= 1) { bs = s; best = e; }
  }
  const now = new Date();
  const fmt = (v) => (v || '').replace('{time}', now.toLocaleTimeString('fr-FR'))
    .replace('{dateF}', now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    .replace('{ok}', state.caps.filter(() => true).length).replace('{total}', 10)
    .replace('{hw}', state.hardware || 'PI').replace('{mode}', state.mode || 'prod');
  if (best) return { ok: true, reponse: fmt(best.a), suggestions: [] };

  if (PAI) {
    try {
      const m = normText(q);
      if (/(bebe|bébé|nourrisson|neo|رضيع|enfant|طفل|adulte|baddel|climat)/.test(m)) {
        const prof = /(bebe|bébé|nourrisson|neo|رضيع)/.test(m) ? 'neo' : /(enfant|طفل)/.test(m) ? 'enfant' : 'adulte';
        const r = await PAI.execute('climate', { occupant: prof });
        telemetry('pixelai climate ' + prof);
        return { ok: true, reponse: r.message + ' | config : ' + JSON.stringify(r.hardwareAction), suggestions: [] };
      }
      const lang = await PAI.execute('translate', { text: q });
      if (lang && lang.response && lang.response !== "Bonjour ! Comment puis-je vous assister ?") {
        telemetry('pixelai translate :' + q.slice(0, 24));
        return { ok: true, reponse: lang.response, suggestions: [] };
      }
    } catch {}
  }

  // ---- PixelNeural : détection d'intent à bord (pour le contexte + la relance LLM) ----
  let intent = null;
  if (PNEURAL && PMODEL) {
    try {
      const p = PNEURAL.predict(PMODEL, q);
      const top = p && p.top && p.top[0];
      if (top && top.s >= 0.45) intent = top.intent + ' (' + top.s.toFixed(2) + ')';
    } catch {}
  }

  // ---- LLM libre (génération libre), si configuré ----
  if (LLM_BASE) {
    const langLabel = (ctx.lang || 'fr') === 'fr' ? 'français' : ctx.lang === 'ar' ? 'arabe' : ctx.lang === 'en' ? 'anglais' : ctx.lang === 'tr' ? 'turc' : ctx.lang === 'darja' ? 'darija tunisienne' : ctx.lang;
    const sys = {
      role: 'system',
      content: 'Tu es ✴️ Pixel, l\'assistante neuronale privée de la cabine ATLAS de PixelSoftware Design (Gabès, Tunisie).' +
        (ctx.name ? ' Tu t\'adresses à ' + ctx.name + '.' : '') +
        ' Réponds en ' + langLabel + ', de façon concise et chaleureuse (moins de 3 phrases, émojis sobres).' +
        ' N\'écris pas de raisonnement intermédiaire : réponds directement à l\'utilisateur.' +
        (intent ? ' Intent détecté à bord : ' + intent + '.' : '') +
        ' Faits à respecter : cabine fabriquée en Tunisie (matricule 1969711pam000) ; prix indicatifs DT HT : S 18 500, M 32 900, L 58 500 ;' +
        ' TVA 19 % ; contact +216 52 675 027, pixelsoftwaredesign@gmail.com ; données des invités 100 % privées, tout tourne en local.' +
        ' Si l\'utilisateur veut un devis/achat, demande un email puis un nom et un téléphone. Ne donne jamais d\'informations de sécurité fausses :' +
        ' si tu ne connais pas un paramètre de la cabine, propose de contacter le centre technique.' +
        ' Affiche cette signature à la fin de toute réponse où tu parles de la cabine ou du fabricant : "© PixelSoftwareDesign — +216 52 675 027 — pixelsoftwaredesign@gmail.com".' +
        ' Ne jamais oublier : PixelSoftwareDesign détient tous les droits (copyright) sur la cabine ATLAS et le modèle Pixel.'
    };
    const hist = (ctx.history || []).slice(-8).map(h => ({ role: 'user', content: '[' + (h.intent || '?') + '] ' + String(h.q || '').slice(0, 120) }));
    const messages = [sys, ...hist, { role: 'user', content: String(q).slice(0, 400) }];
    const reponse = await llmReply(messages);
    if (reponse) {
      telemetry('assistant:llm:' + q.slice(0, 24).replace(/\s+/g, '_'));
      return { ok: true, reponse, suggestions: [] };
    }
  }

  return {
    ok: false,
    reponse: 'Désolé, je n\'ai pas trouvé dans ma base privée. Essayez : « ' + (ASSISTANT_KB.suggestions || []).slice(0, 2).join(' » ou « ') + ' ».',
    suggestions: (ASSISTANT_KB.suggestions || [])
  };
}

// ---- configuration (voir .env) ----
const MQTT_URL    = process.env.MQTT_URL || 'mqtt://localhost:1883';
const PORT        = process.env.PORT || 3000;
const CABINE_ID   = process.env.CABINE_ID || 'CAB-TUN-01';
const SITE_ROOT   = process.env.SITE_ROOT || path.join(__dirname, '..', '..', '..');
const DATA_DIR    = path.join(__dirname, 'data');
const BASE        = 'atlas';
const UNIT        = CABINE_ID;

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- PixelNeural : algorithme Pixel embarqué (inference on-board, partagé avec le kiosque) ----
let PNEURAL = null, PMODEL = null;
try { PNEURAL = require(path.join(SITE_ROOT, 'pixel-ai', 'neural', 'pixelNeural.js')); } catch {}
try { PMODEL = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, 'pixel-ai', 'neural', 'model.json'), 'utf8')); } catch {}
if (PNEURAL && PMODEL) log('[IA]', 'PixelNeural prêt :', PMODEL.intents.length, 'intents');

// ---- LLM libre (optionnel) : Ollama ou API compatible OpenAI (voir .env) ----
const LLM_BASE  = process.env.LLM_BASE  || process.env.OLLAMA_BASE  || '';
const LLM_KEY   = process.env.LLM_KEY   || '';
const LLM_MODEL = process.env.LLM_MODEL || (process.env.OLLAMA_BASE ? process.env.OLLAMA_MODEL || 'llama3.1' : '');
const LLM_STYLE = process.env.LLM_STYLE || (process.env.OLLAMA_BASE ? 'ollama' : 'openai');
const LLM_TIMEOUT = (process.env.LLM_TIMEOUT || 180) * 1000;
if (LLM_BASE) log('[IA]', 'LLM libre :', LLM_STYLE, '/', LLM_MODEL || '(défaut du serveur)');

async function llmReply(messages) {
  try {
    let url, payload;
    const maxTokens = Number(process.env.LLM_MAX_TOKENS || 600);
    if (LLM_STYLE === 'ollama') {
      url = LLM_BASE.replace(/\/+$/, '') + '/api/chat';
      payload = { model: LLM_MODEL, messages, stream: false, options: { num_predict: maxTokens, temperature: 0.3 } };
    } else {
      const base = LLM_BASE.replace(/\/+$/, '');
      url = base + (base.endsWith('/v1') ? '' : '/v1') + '/chat/completions';
      payload = { model: LLM_MODEL, messages, temperature: 0.3, max_tokens: maxTokens };
    }
    const headers = { 'Content-Type': 'application/json' };
    if (LLM_KEY) headers.Authorization = 'Bearer ' + LLM_KEY;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), LLM_TIMEOUT);
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(to);
    if (!resp.ok) { log('[LLM]', 'status', resp.status); return null; }
    const j = await resp.json();
    let txt = LLM_STYLE === 'ollama'
      ? (j.message && j.message.content)
      : (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
    if (!txt && j.message && j.message.thinking) txt = j.message.thinking; // modèles « reasoning » (gemma4)
    return txt ? String(txt).replace(/<\/?think>/g, '').trim() : null;
  } catch (e) { log('[LLM]', 'échec :', e.message); return null; }
}

// ---- état consolidé (dépend du matériel détecté) ----
const state = {
  unit: UNIT,
  caps: [],
  hardware: null,           // 'ESP32' | 'PI'
  mode: 'prod',
  locked: null,
  open: null,
  presence: null,
  online: false,
  wifi: null,
  lastUpdate: null,
};

const TOPIC_CMD    = `${BASE}/${UNIT}/cmd`;
const TOPIC_STATE  = `${BASE}/${UNIT}/state`;
const TOPIC_MAT    = `${BASE}/${UNIT}/material`;
const TOPIC_LWT    = `${BASE}/${UNIT}/status`;

function log(...a) { const t = new Date().toISOString().replace('T', ' ').slice(0, 19); console.log(`[${t}]`, ...a); }

// ---- stopwords multilingue (ignore au scoring KB) ----
const STOPWORDS = new Set([
  'est', 'esr', 'etre', 'avec', 'pour', 'par', 'sur', 'dans', 'que', 'qui', 'quoi', 'quel', 'quelle',
  'comment', 'combien', 'votre', 'notre', 'vous', 'nous', 'moi', 'toi', 'une', 'dune', 'etre',
  'cest', 'cette', 'celui', 'aussi', 'tres', 'mais', 'donc', 'quand',
  'the', 'and', 'what', 'how', 'who', 'why', 'for',
  'with', 'from', 'have', 'has', 'your', 'this', 'that', 'there', 'are', 'you', 'can', 'please',
  'bu', 'gün', 'nasıl', 'ne', 'kaç', 'var', 'bir', 've', 'ile', 'için',
  'ما', 'هو', 'هي', 'كيف', 'متى', 'من' // arabe (tokens désaccentués vs norm)
]);

// ---- Pixel AI (Skills) : chargement optionnel depuis le dépôt (si présent sur site) ----
let PAI = null;
try {
  PAI = require(path.join(SITE_ROOT, 'pixel-ai', 'skills'));
  log('[IA] Pixel AI skills embarqués :', PAI.list().length);
} catch { PAI = null; }

// ---- télémétrie locale (compteur d'activité pour l'usine) ----
function telemetry(evt) {
  const line = JSON.stringify({ at: new Date().toISOString(), unit: UNIT, evt, state: { locked: state.locked, open: state.open, presence: state.presence } });
  fs.appendFile(path.join(DATA_DIR, 'telemetry.jsonl'), line + '\n', () => {});
}

const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: 'cabin-hub-' + UNIT.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(16).slice(2, 8),
  reconnectPeriod: 2000,
});

mqttClient.on('connect', () => {
  log('[MQTT] connecté', MQTT_URL);
  mqttClient.subscribe([TOPIC_STATE, TOPIC_MAT, TOPIC_LWT]);
});

mqttClient.on('message', (topic, payload) => {
  const raw = payload.toString();
  if (topic === TOPIC_STATE) {
    try {
      const s = JSON.parse(raw);
      state.locked = s.locked; state.open = s.open; state.presence = s.presence;
      state.wifi = s.rssi; state.mode = s.mode || state.mode;
      if (s.hw) state.hardware = s.hw;
      state.online = true; state.lastUpdate = new Date().toISOString();
      if (s.caps) state.caps = Array.isArray(s.caps) ? s.caps : state.caps;
      log('[MQTT] état:', raw);
    } catch { log('[MQTT] état illisible:', raw); }
  } else if (topic === TOPIC_MAT) {
    try { const m = JSON.parse(raw); state.hardware = m.hw || state.hardware; state.mode = m.mode || state.mode; log('[MQTT] rapport matériel:', raw); } catch {}
  } else if (topic === TOPIC_LWT) {
    state.online = raw === 'online';
    log('[MQTT] cabine', state.online ? 'en ligne' : 'hors ligne');
  }
  broadcast({ type: 'state', state });
});

function publishDoor(action) {
  mqttClient.publish(TOPIC_CMD, action, { qos: 1 });
  telemetry(action);
  log('[CMD]', action);
  broadcast({ type: 'cmd-ack', action });
}

const app = express();
app.use(express.json());

app.post('/api/door/open', (req, res) => { publishDoor('open'); res.json({ ok: true }); });
app.post('/api/door/close', (req, res) => { publishDoor('close'); res.json({ ok: true }); });
app.get('/api/door/state', (req, res) => res.json(state));

// scan → relance la détection matériel sur l'ESP32 (mode dev)
app.post('/api/scan', (req, res) => { publishDoor('scan'); res.json({ ok: true }); });

app.get('/api/health', (req, res) => res.json({ ok: true, unit: UNIT, online: state.online, hardware: state.hardware, caps: state.caps, pixelai: !!PAI, uptime: process.uptime() }));

// ---- capacité (liste) : supprime la route assistant greffée après, restaure les leads ----

// ---- Assistante Atlas privée (réponses à bord, sans cloud) ----
app.get('/api/assistant', (req, res) => res.json({ ok: true, nom: ASSISTANT_KB.nom || 'Assistante Atlas', intents: (ASSISTANT_KB.intents || []).length, privé: true, pixelai: !!PAI, neural: !!(PNEURAL && PMODEL), llm: !!LLM_BASE }));
app.post('/api/assistant', async (req, res) => {
  const q = (req.body && req.body.q) || '';
  const ctx = { name: (req.body && req.body.name) || null, lang: (req.body && req.body.lang) || null, history: (req.body && req.body.history) || [] };
  if (!q.trim()) return res.status(400).json({ ok: false, reponse: 'Posez une question.' });
  try {
    const r = await assistantReply(q, ctx);
    telemetry('assistant:q=' + normText(q).slice(0, 40));
    res.json(r);
  } catch (e) { res.status(500).json({ ok: false, reponse: 'Erreur interne.', err: e.message }); }
});

// ---- Pixel AI : Skills embarqués en bord de cabine ----
app.post('/api/pixel-ai/execute', async (req, res) => {
  if (!PAI) return res.status(503).json({ ok: false, message: 'pixel-ai non embarqué sur ce hub.' });
  const { skillName, parameters } = req.body || {};
  const r = await PAI.execute(skillName, parameters);
  telemetry('pixelai:' + skillName);
  res.json(r);
});

// ---- Leads : stockage local offline (kiosque → hub) ----
function leadsLoad() { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'leads.json'), 'utf8')); } catch { return []; } }
function leadsSave(list) { fs.writeFileSync(path.join(DATA_DIR, 'leads.json'), JSON.stringify(list, null, 2)); telemetry('leads:' + list.length); }
app.get('/api/leads', (req, res) => res.json({ ok: true, leads: leadsLoad() }));
app.post('/api/sync', (req, res) => {
  try {
    const incoming = Array.isArray(req.body) ? req.body : (req.body && req.body.leads) || [];
    const list = leadsLoad().concat(incoming.map(l => ({ name: l.name, email: l.email, phone: l.phone, ts: l.ts || new Date().toISOString() })));
    const dedup = [...new Map(list.map(l => [l.email + '|' + l.phone, l])).values()];
    leadsSave(dedup);
    res.json({ ok: true, status: 'success', stored: dedup.length });
  } catch (e) { res.status(500).json({ ok: false, message: e.message }); }
});

app.use(express.static(SITE_ROOT));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => { if (client.readyState === client.OPEN) client.send(data); });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', state }));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'cmd' && (msg.action === 'open' || msg.action === 'close' || msg.action === 'scan')) publishDoor(msg.action);
    } catch {}
  });
  log('[WS] client connecté');
});

server.listen(PORT, () => {
  log(`[HTTP] kiosque        : http://<ip>:${PORT}/`);
  log(`[HTTP] REST           : http://<ip>:${PORT}/api/door/state`);
  log(`[HTTP] Pixel AI       : ${PAI ? 'sécurité:Skills actifs' : 'pixel-ai absent'} — /api/pixel-ai/execute`);
  log('[WS]   temps réel     : ws://<ip>:${PORT}/ws');
  log('[HARDWARE] profil :', state.hardware || require('os').arch());
});