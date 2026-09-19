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

// ---- configuration (voir .env) ----
const MQTT_URL    = process.env.MQTT_URL || 'mqtt://localhost:1883';
const PORT        = process.env.PORT || 3000;
const CABINE_ID   = process.env.CABINE_ID || 'CAB-TUN-01';
const SITE_ROOT   = process.env.SITE_ROOT || path.join(__dirname, '..', '..', '..');
const DATA_DIR    = path.join(__dirname, 'data');
const BASE        = 'atlas';
const UNIT        = CABINE_ID;

fs.mkdirSync(DATA_DIR, { recursive: true });

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

app.get('/api/health', (req, res) => res.json({ ok: true, unit: UNIT, online: state.online, hardware: state.hardware, caps: state.caps, uptime: process.uptime() }));

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
  log(`[WS]   temps réel     : ws://<ip>:${PORT}/ws`);
  log('[HARDWARE] profil :', state.hardware || require('os').arch());
});