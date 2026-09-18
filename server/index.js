const express = require('express');
const http = require('http');
const path = require('path');
const mqtt = require('mqtt');
const { WebSocketServer } = require('ws');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://192.168.1.50:1883';
const PORT = process.env.PORT || 3000;

const TOPIC_CMD = 'atlas/door/cmd';
const TOPIC_STATE = 'atlas/door/state';
const TOPIC_LWT = 'atlas/door/status';

const state = {
  unit: null,
  locked: null,
  open: null,
  presence: null,
  online: false,
  lastUpdate: null,
};

const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: 'atlas-ui-' + Math.random().toString(16).slice(2, 10),
  reconnectPeriod: 2000,
});

mqttClient.on('connect', () => {
  console.log('[MQTT] connecté à', MQTT_URL);
  mqttClient.subscribe([TOPIC_STATE, TOPIC_LWT]);
});

mqttClient.on('message', (topic, payload) => {
  const raw = payload.toString();
  if (topic === TOPIC_STATE) {
    try {
      Object.assign(state, JSON.parse(raw));
      state.online = state.online !== false ? state.online : false;
      state.lastUpdate = new Date().toISOString();
      console.log('[MQTT] état:', raw);
    } catch {
      console.warn('[MQTT] état illisible:', raw);
    }
  } else if (topic === TOPIC_LWT) {
    state.online = raw === 'online';
    console.log('[MQTT] cabine', state.online ? 'en ligne' : 'hors ligne');
  }
  broadcast({ type: 'state', state });
});

function publishDoor(action) {
  mqttClient.publish(TOPIC_CMD, action, { qos: 1 });
  console.log('[CMD]', action);
  broadcast({ type: 'cmd-ack', action });
}

const app = express();
app.use(express.json());

app.post('/api/door/open', (req, res) => publishDoor('open') && res.json({ ok: true }));
app.post('/api/door/close', (req, res) => publishDoor('close') && res.json({ ok: true }));
app.get('/api/door/state', (req, res) => res.json(state));

app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(data);
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', state }));
  console.log('[WS] client connecté');
});

server.listen(PORT, () => {
  console.log(`[HTTP] UI disponible sur http://localhost:${PORT}`);
});