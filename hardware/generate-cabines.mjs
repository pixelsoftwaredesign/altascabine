#!/usr/bin/env node
// ============================================================================
// ATLAS CABINE — generate-cabines.mjs
// © 2026 Atlas Working — Made in Tunisia 🇹🇳
// Logiciel & R&D : PixelSoftware Design
// Générateur natif des projets de firmware par CABINE (S / M / L).
//
// Source de vérité : hardware/profiles/cabines.json
// → produit, pour chaque cabine :
//   hardware/generated/<CABINE>/esp32/{CabineConfig.h, door-esp32.ino}
//   hardware/generated/<CABINE>/arduino/{ArduinoCabineConfig.h, door-arduino.ino}
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = __dirname; // hardware/
const PROFILES = path.join(ROOT, 'profiles', 'cabines.json');
const SRC_ESP32 = path.join(ROOT, 'door-esp32', 'door-esp32.ino');
const SRC_ARDUINO = path.join(ROOT, 'door-arduino', 'door-arduino.ino');
const OUT = path.join(ROOT, 'generated');

const CREDIT =
  '// © 2026 Atlas Working — Made in Tunisia \u{1F1F9}\u{1F1F3}\n' +
  '// Logiciel & R&D : PixelSoftware Design\n' +
  '// Design cabine & standard acoustique : Atlas Working (développement / idée)\n';

const P = JSON.parse(fs.readFileSync(PROFILES, 'utf8'));

// ---------- gabarit CabineConfig.h (Modèle ESP32) ----------
function cabineConfigHeader(c) {
  const p = c.pins_esp32;
  const role = c.modele === 'esp32' ? 1 : 2;
  return [
    '// ============================================================================',
    '// ATLAS CABINE — CabineConfig.h  (GÉNÉRÉ — ne pas éditer)',
    CREDIT.split('\n').map((l) => l.trimEnd()).join('\n'),
    '// CABINE : ' + c.id + ' — ' + c.nom + ' · prix ' + c.prix_ht_dt + ' DT HT',
    '// Capacités natives : ' + c.caps.join(', '),
    '// ============================================================================',
    '',
    '#define CABINE_ID            "' + c.id + '"',
    '#define CABINE_NOM           "' + c.nom + '"',
    '#define CABINE_ROLE          ' + role + '   // 1 = STANDALONE · 2 = ESCLAVE (Pi câblé)',
    '#define CABINE_MODE_DEV      0   // 0 = production (surcharger en dev)',
    '#define CABINE_SW            "v2.1-' + c.id.toLowerCase() + '"',
    '',
    '// ---------- Réseau ----------',
    'const char* WIFI_SSID = "ATLAS_CABINE";',
    'const char* WIFI_PASS = "atlaschange";',
    'const char* MQTT_HOST = "192.168.1.50";',
    'const int   MQTT_PORT = 1883;',
    '#define CABINE_WIFI_MODE  0',
    '',
    '// ---------- Thèmes MQTT ----------',
    '#define CABINE_MQTT_BASE    "atlas"',
    '#define CABINE_USE_LEGACY   1',
    '',
    '// ---------- Cœur cabine ----------',
    '#define GPIO_RELAY          ' + p.RELAY + '  // relais gâche (HIGH = déverrouillé)',
    '#define GPIO_DOOR           ' + p.DOOR + '  // reed switch (HIGH = ouverte)',
    '#define GPIO_PIR            ' + p.PIR + '   // présence',
    '',
    '// ---------- Éclairage RGBW ----------',
    '#define CABINE_LED_KIND     ' + p.LED.kind + '   // 0 = PWM · 1 = NeoPixel',
    '#define GPIO_LED_PIN        ' + p.LED.pin + '   // PWM blanc',
    '#define GPIO_LED_R          ' + p.LED.r + '   // PWM rouge',
    '#define GPIO_LED_G          ' + p.LED.g + '   // PWM vert',
    '#define GPIO_LED_B          ' + p.LED.b + '   // PWM bleu',
    '#define GPIO_NEO            ' + p.LED.neo + '   // data NeoPixel',
    '#define NEO_PIXELS          ' + p.LED.pixels,
    '',
    '// ---------- Modules optionnels (PIN = -1 ⇒ absent) ----------',
    '#define GPIO_AC             ' + p.AC,
    '#define GPIO_AC_FB          ' + p.AC_FB,
    '#define GPIO_CO2_A          ' + p.CO2_A,
    '#define GPIO_URG            ' + p.URG,
    '',
    '// ---------- Liaison Raspberry Pi (rôle 2) ----------',
    '#define GPIO_PI_TX           1',
    '#define GPIO_PI_RX           3',
    '#define PI_BAUD           9600',
    '',
    '// ---------- Sécurité & cadence ----------',
    '#define UNLOCK_MS          15000UL',
    '#define RELAY_TEST_MS       200UL',
    '#define PUBLISH_INTERVAL   30000UL',
    '#define SCAN_ON_BOOT          1',
    '#define ADC_ABSENT_THRESHOLD  10',
    '',
  ].join('\n');
}

// ---------- gabarit ArduinoCabineConfig.h (Modèle Arduino) ----------
function arduinoConfigHeader(c) {
  const p = c.pins_arduino;
  const link = c.modele === 'pi' ? 2 : 1;
  const ac = typeof p.AC === 'number' ? p.AC : '"' + p.AC + '"';
  const co2 = typeof p.CO2_A === 'number' ? p.CO2_A : '"' + p.CO2_A + '"';
  const caps = c.caps.includes('ac') ? ' // relais clim' : '    // absent';
  return [
    '// ============================================================================',
    '// ATLAS CABINE — ArduinoCabineConfig.h  (GÉNÉRÉ — ne pas éditer)',
    CREDIT.split('\n').map((l) => l.trimEnd()).join('\n'),
    '// CABINE : ' + c.id + ' — ' + c.nom + ' · prix ' + c.prix_ht_dt + ' DT HT',
    '// ARDUINO_LINK = ' + link + ' (' + (link === 1 ? 'Ethernet/MQTT' : 'pont série vers Pi') + ')',
    '// ============================================================================',
    '',
    '#define CABINE_ID          "' + c.id + '"',
    '#define ARDUINO_SW         "v2.1-arduino-' + c.id.toLowerCase() + '"',
    '#define ARDUINO_MODE_DEV   0     // 0 = production (surcharger en dev)',
    '',
    '// ---------- Mode de communication ----------',
    '#define ARDUINO_LINK       ' + link + '     // 1 = Ethernet/MQTT · 2 = pont série Pi',
    '',
    '#if ARDUINO_LINK == 1',
    '  byte ARD_MAC[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x' + ('0' + cabNum(c)).slice(-2) + ' };',
    '  IPAddress ARD_IP  (10, 0, 1, ' + (30 + cabNum(c)) + ');',
    '  IPAddress ARD_DNS (10, 0, 1, 1);',
    '  const char* MQTT_HOST = "10.0.1.10";   // broker local (Pi) ou usine',
    '  const int   MQTT_PORT = 1883;',
    '#else',
    '  #define PI_BAUD 9600',
    '#endif',
    '',
    '#define CABINE_MQTT_BASE   "atlas"',
    '#define CABINE_USE_LEGACY  0',
    '',
    '// ---------- Cœur cabine ----------',
    '#define GPIO_RELAY      ' + p.RELAY + '   // relais porte (HIGH = déverrouillé)',
    '#define GPIO_DOOR       ' + p.DOOR + '   // reed switch',
    '#define GPIO_PIR        ' + p.PIR + '    // présence',
    '#define GPIO_URG        ' + p.URG + '    // bouton urgence',
    '#define GPIO_BUZZER     ' + p.BUZZER + '    // buzzer (option)',
    '',
    '// ---------- Modules optionnels ----------',
    '#define GPIO_AC         ' + ac + caps,
    '#define GPIO_CO2_A      ' + co2 + ' // CO2 analogique',
    '',
    '// ---------- Sécurité ----------',
    '#define UNLOCK_MS       15000UL',
    '#define RELAY_TEST_MS    200UL',
    '#define PUBLISH_INTERVAL 30000UL',
    '',
  ].join('\n');
}

function cabNum(c) { return ['AT-S90', 'AT-M240', 'AT-L350'].indexOf(c.id) + 1; }

// ---------- écriture ----------
function write(rel, content) {
  fs.mkdirSync(path.dirname(rel), { recursive: true });
  fs.writeFileSync(rel, content);
  console.log('✓ ' + path.relative(ROOT, rel));
}

const manifest = [];
for (const c of P.cabines) {
  const dir = path.join(OUT, c.id);
  write(path.join(dir, 'esp32', 'CabineConfig.h'), cabineConfigHeader(c));
  write(path.join(dir, 'esp32', 'door-esp32.ino'), fs.readFileSync(SRC_ESP32, 'utf8'));
  write(path.join(dir, 'arduino', 'ArduinoCabineConfig.h'), arduinoConfigHeader(c));
  write(path.join(dir, 'arduino', 'door-arduino.ino'), fs.readFileSync(SRC_ARDUINO, 'utf8'));
  manifest.push({ cabine: c.id, nom: c.nom, prix_ht_dt: c.prix_ht_dt, modele: c.modele, caps: c.caps,
    esp32: 'hardware/generated/' + c.id + '/esp32/', arduino: 'hardware/generated/' + c.id + '/arduino/' });
}
write(path.join(OUT, 'MANIFEST.json'), JSON.stringify({ generateur: 'hardware/generate-cabines.mjs', cree_le: new Date().toISOString(), cabines: manifest }, null, 2) + '\n');
write(path.join(OUT, 'README.md'),
  '# ATLAS CABINE — Firmware GÉNÉRÉS par cabine\n\n' +
  'Générés par `node hardware/generate-cabines.mjs` (source : `hardware/profiles/cabines.json`).\n\n' +
  'Chaque dossier est un **projet Arduino complet** (config + firmware) prêt à flasher :\n\n' +
  manifest.map((m) => '### ' + m.cabine + ' — ' + m.nom + '\n' +
    '- ' + m.esp32 + ' (Modèle ESP32, rôle ' + (m.modele === 'esp32' ? '1 standalone' : '2 esclave Pi') + ', caps : ' + m.caps.join(', ') + ')\n' +
    '- ' + m.arduino + ' (Modèle Arduino)\n').join('\n') +
  '\n---\n© 2026 Atlas Working — Made in Tunisia 🇹🇳 · Logiciel & R&D : PixelSoftware Design\n');
console.log('\nGénération terminée : ' + manifest.length + ' cabine(s).');