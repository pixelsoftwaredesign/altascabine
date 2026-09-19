/*
 * ATLAS CABINE — door-esp32.ino  (v2)
 * App ESP32 de la cabine.
 *
 * « L'app s'adapte au matériel réellement branché » :
 *  - DÉTECTION MATÉRIEL au démarrage (scanHardware) : chaque GPIO configuré est
 *    vérifié, les modules manquants (PIN=-1 ou signal absent) sont désactivés.
 *  - MODE DÉVELOPPEMENT (CABINE_MODE_DEV) : re-scan interactif, page web de
 *    diagnostic, test relais, logs verbeux.
 *
 * MQTT :
 *   sub atlas/<unit>/cmd          open|close|scan|testrelay|light|ac ou JSON {"cmd":...}
 *   pub atlas/<unit>/state        retained JSON {unit,caps,locked,open,presence,...}
 *   pub atlas/<unit>/material     retained JSON (rapport de détection matériel)
 *   pub atlas/<unit>/status       LWT online/offline
 *   (compat) atlas/door/* si CABINE_USE_LEGACY
 *
 * Web (rôle 1 = STANDALONE) : http://<esp32>/  → page d'état + scan + test
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include "CabineConfig.h"

#if CABINE_WIFI_MODE == 1
// Réseau privé 802.1X (modèle avancé) — identité RADIUS
#include "esp_wpa2.h"
#include "../wifi/CabineWifi8021x.h"
#endif

#if CABINE_LED_KIND == 1
#include <Adafruit_NeoPixel.h>
#endif

#if CABINE_ROLE == 1
#include <WebServer.h>
#endif

// ---------------------------------------------------------------------------
// Modules & capacités
// ---------------------------------------------------------------------------
#define MAX_CAPS 6
struct Cap {
  const char* name;
  int  pin;
  bool present;
  bool enabled;   // pin valide + signal ok
  int  read;      // dernière lecture (diag)
};
Cap gCaps[MAX_CAPS] = {
  { "door",   GPIO_RELAY,   true, true, 0 },
  { "reed",   GPIO_DOOR,    true, true, 0 },
  { "sensor", GPIO_PIR,     true, true, 0 },
  { "light",  GPIO_LED_PIN, true, true, 0 },
  { "ac",     GPIO_AC,      true, true, 0 },
  { "co2",    GPIO_CO2_A,   true, true, 0 },
};
bool gScanDone = false;

#if CABINE_LED_KIND == 1
Adafruit_NeoPixel strip(NEO_PIXELS, GPIO_NEO, NEO_GRB + NEO_KHZ800);
#endif

WiFiClient espClient;
PubSubClient mqtt(espClient);
#if CABINE_ROLE == 1
WebServer web(80);
#endif

unsigned long unlockUntil = 0;
unsigned long lastPublish = 0;
bool lastDoorOpen = false;
bool lastPresence = false;
int  lastUrg = LOW;

// ---------------------------------------------------------------------------
// Helpers matériel
// ---------------------------------------------------------------------------
bool relayActive() { return digitalRead(GPIO_RELAY) == HIGH; }
bool doorOpen()    { return digitalRead(GPIO_DOOR) == HIGH; }
bool presence()    { return digitalRead(GPIO_PIR) == HIGH; }

const char* capsJson() {
  static char out[96];
  String s;
  for (int i = 0; i < MAX_CAPS; i++) if (gCaps[i].enabled) { if (s.length()) s += ","; s += gCaps[i].name; }
  s.toCharArray(out, sizeof(out));
  return out;
}

const char* modeStr() { return CABINE_MODE_DEV ? "dev" : "prod"; }

// ---------------------------------------------------------------------------
// SCAN / DÉTECTION MATÉRIEL
// ---------------------------------------------------------------------------
/*
 * scanHardware() — détection réelle du matériel branché.
 *  - pin = -1                     → module non configuré (absent) : désactivé
 *  - GPIO numérique               → lecture pull-up/down prévue
 *  - GPIO analogique (CO2, AC_FB) → valeur ADC : brute < seuil = absent
 * Mode dev : re-scannable via MQTT (cmd scan) ou web (/api/scan).
 */
void scanHardware() {
#if CABINE_MODE_DEV
  Serial.println("\n[SCAN] Détection matériel...");
#endif

  // door (relais) : on ne déclenche JAMAIS le relais pendant la détection —
  // présence confirmée si la broche est configurée et stable.
  gCaps[0].enabled = (GPIO_RELAY >= 0);
  gCaps[0].read = digitalRead(GPIO_RELAY);

  // reed & PIR
  gCaps[1].enabled = (GPIO_DOOR >= 0); gCaps[1].read = digitalRead(GPIO_DOOR);
  gCaps[2].enabled = (GPIO_PIR  >= 0); gCaps[2].read = digitalRead(GPIO_PIR);

  // éclairage : kind 0 = PWM (3 broches) · kind 1 = NeoPixel (1 broche)
  if (CABINE_LED_KIND == 0) gCaps[3].enabled = (GPIO_LED_R >= 0 || GPIO_LED_G >= 0 || GPIO_LED_B >= 0);
  else                      gCaps[3].enabled = (GPIO_NEO >= 0);
  gCaps[3].read = (GPIO_NEO >= 0 ? digitalRead(GPIO_NEO) : GPIO_LED_PIN);

  // clim : relais (+ retour analogique si présent)
  gCaps[4].enabled = (GPIO_AC >= 0);
  gCaps[4].read = (GPIO_AC >= 0) ? digitalRead(GPIO_AC) : -1;

  // CO2 analogique
  gCaps[5].enabled = false;
  if (GPIO_CO2_A >= 0) {
    int adc = analogRead(GPIO_CO2_A);
    gCaps[5].read = adc;
    gCaps[5].enabled = (adc >= ADC_ABSENT_THRESHOLD);
  }

#if CABINE_MODE_DEV
  Serial.println("[SCAN] ----------------------------");
  for (int i = 0; i < MAX_CAPS; i++) {
    Serial.printf("[SCAN] %-8s pin=%3d  %-9s  lecture=%d\n",
      gCaps[i].name, gCaps[i].pin,
      gCaps[i].enabled ? "DÉTECTÉ" : "absent",
      gCaps[i].read);
  }
  Serial.printf("[SCAN] CAPS := %s  | mode=%s\n", capsJson(), modeStr());
  Serial.println("[SCAN] ----------------------------");
#endif
  gScanDone = true;
}

void publishMaterial() {
  char payload[256];
  String list;
  for (int i = 0; i < MAX_CAPS; i++) list += (i ? "," : "") + String(gCaps[i].name) + "=" + (gCaps[i].enabled ? "ok" : "off");
  snprintf(payload, sizeof(payload),
    "{\"unit\":\"%s\",\"mode\":\"%s\",\"hw\":\"ESP32\",\"sw\":\"%s\",\"modules\":[%s]}",
    CABINE_ID, modeStr(), CABINE_SW, list.c_str());
  mqtt.publish((String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/material").c_str(), payload, true);
#if CABINE_MODE_DEV
  Serial.printf("[MQTT] material -> %s\n", payload);
#endif
}

// ---------------------------------------------------------------------------
// État & MQTT
// ---------------------------------------------------------------------------
void publishState() {
  char payload[220];
  int  co2 = (gCaps[5].enabled ? gCaps[5].read : -1);
  snprintf(payload, sizeof(payload),
    "{\"unit\":\"%s\",\"caps\":[\"%s\"],\"hw\":\"ESP32\",\"sw\":\"%s\",\"mode\":\"%s\","
    "\"emergency\":%d,\"locked\":%s,\"open\":%s,\"presence\":%s,\"co2\":%d,\"rssi\":%d}",
    CABINE_ID, capsJson(), CABINE_SW, modeStr(),
    emergencyKind,
    relayActive() ? "false" : "true",
    doorOpen() ? "true" : "false",
    presence() ? "true" : "false",
    co2, WiFi.RSSI());
  mqtt.publish((String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/state").c_str(), payload, true);
#if CABINE_USE_LEGACY
  mqtt.publish("atlas/door/state", payload, true);
#endif
#if CABINE_MODE_DEV
  Serial.printf("[MQTT] pub -> %s\n", payload);
#endif
}

void unlockDoor() { digitalWrite(GPIO_RELAY, HIGH); unlockUntil = millis() + UNLOCK_MS; publishState(); }
void lockDoor()   { digitalWrite(GPIO_RELAY, LOW);  unlockUntil = 0; publishState(); }

void testRelay() {   // impulsion très courte, mode dev uniquement
  digitalWrite(GPIO_RELAY, HIGH);
  delay(RELAY_TEST_MS);
  digitalWrite(GPIO_RELAY, LOW);
  unlockUntil = 0;
  publishState();
#if CABINE_MODE_DEV
  Serial.println("[DEV] test relais : impulsion 200 ms");
#endif
}

void setLight(int level) {
#if CABINE_LED_KIND == 1
  uint8_t b = constrain(level, 0, 255);
  strip.fill(strip.Color(b, b, b), 0, strip.numPixels());
  strip.show();
#else
  uint8_t b = constrain(level, 0, 255);
  if (GPIO_LED_R >= 0) ledcWrite(0, b);
  if (GPIO_LED_G >= 0) ledcWrite(1, b);
  if (GPIO_LED_B >= 0) ledcWrite(2, b);
#endif
  publishState();
}

void setAc(bool on) {
  if (GPIO_AC < 0) return;                 // matériel absent
  digitalWrite(GPIO_AC, on ? HIGH : LOW);
  publishState();
}

// ---------------------------------------------------------------------------
// Commandes (MQTT et Web partagent le même parseur → même comportement partout)
// ---------------------------------------------------------------------------
String lastCmdDesc = "";
bool emergencyKind = 0;   // 0=aucune · 1=interne(open) · 2=externe(close) · 3=catastrophique(partial)

void setEmergency(int kind) {
  emergencyKind = kind;
  publishState();
}

bool execCommand(const String& input, bool viaWeb) {
  if (input.equalsIgnoreCase("open") || input.equalsIgnoreCase("unlock")) { unlockDoor(); return true; }
  if (input.equalsIgnoreCase("close") || input.equalsIgnoreCase("lock"))   { lockDoor();   return true; }
  if (input.equalsIgnoreCase("scan"))   { scanHardware(); publishMaterial(); publishState(); return true; }
  if (input.equalsIgnoreCase("testrelay")) { if (CABINE_MODE_DEV) testRelay(); return true; }
  if (input.equalsIgnoreCase("ac:on"))  { setAc(true);  return true; }
  if (input.equalsIgnoreCase("ac:off")) { setAc(false); return true; }
  if (input.startsWith("light")) {        // light, light:40, light:255
    int v = 80;
    int i = input.indexOf(':');
    if (i >= 0) v = input.substring(i + 1).toInt();
    setLight(v); return true;
  }
  // ---- MODE URGENCE (danger interne / extérieur / catastrophique) ----
  if (input.equalsIgnoreCase("emergency:open")) {              // danger INTERNE → évacuer
    unlockDoor(); setEmergency(1);
#if CABINE_MODE_DEV
    Serial.println("[URGENCE] danger interne → porte OUVERTE (évacuation)");
#endif
    return true;
  }
  if (input.equalsIgnoreCase("emergency:close")) {             // danger EXTÉRIEUR → contenir
    lockDoor(); setEmergency(2);
#if CABINE_MODE_DEV
    Serial.println("[URGENCE] danger extérieur → porte FERMÉE (confinement)");
#endif
    return true;
  }
  if (input.equalsIgnoreCase("emergency:partial")) {           // danger CATASTROPHIQUE → entre-ouverte
    unlockDoor(); setEmergency(3);
    unlockUntil = millis() + 8000UL;   // issue de secours temporaire, puis re-verrouillage
#if CABINE_MODE_DEV
    Serial.println("[URGENCE] danger catastrophique → ouverture PARTIELLE (8 s)");
#endif
    return true;
  }
  if (input.equalsIgnoreCase("emergency:end")) {               // fin d'urgence
    lockDoor(); setEmergency(0);
#if CABINE_MODE_DEV
    Serial.println("[URGENCE] fin — retour mode normal");
#endif
    return true;
  }
  return false;
}

void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String cmd;
  for (unsigned int i = 0; i < len; i++) cmd += (char)payload[i];
  cmd.toLowerCase();
  Serial.printf("[MQTT] %s -> %s\n", topic, cmd.c_str());
  if (String(topic).endsWith("/cmd")) execCommand(cmd, false);
}

// ---------------------------------------------------------------------------
// Web (rôle 1 : ESP32 seul)
// ---------------------------------------------------------------------------
void webHandleState() {
  scanHardware();       // toujours frais
  String s = "{";
  s += "\"unit\":\"" CABINE_ID "\",\"mode\":\"" + String(modeStr()) + "\",";
  s += "\"caps\":[\"" + String(capsJson()) + "\"],\"locked\":" + String(!relayActive()) +
       ",\"open\":" + String(doorOpen()) + ",\"presence\":" + String(presence()) + "}";
  web.send(200, "application/json", s);
}
void webHandleMaterial() {
  String s = "{\"mode\":\"" + String(modeStr()) + "\",\"modules\":[";
  for (int i = 0; i < MAX_CAPS; i++) {
    if (i) s += ",";
    s += "{\"name\":\"" + String(gCaps[i].name) + "\",\"pin\":" + String(gCaps[i].pin) +
         ",\"present\":" + String(gCaps[i].enabled ? "true" : "false") +
         ",\"read\":" + String(gCaps[i].read) + "}";
  }
  s += "]}";
  web.send(200, "application/json", s);
}
void webHandleCmd() {      // POST /api/cmd   body: {"cmd":"open"}
  String body = web.arg("plain");
  String cmd;
  int i = body.indexOf("\"cmd\"");
  if (i >= 0) {
    int b = body.indexOf(':', i) + 1;
    int e = body.indexOf('"', b + 1);
    cmd = body.substring(b, e);
    cmd.replace("\"", "");
  }
  if (!cmd.length() && web.hasArg("cmd")) cmd = web.arg("cmd");
  bool ok = execCommand(cmd, true);
  web.send(ok ? 200 : 400, "application/json", ok ? "{\"ok\":true}" : "{\"ok\":false}");
#if CABINE_MODE_DEV
  if (ok) Serial.printf("[WEB] cmd -> %s\n", cmd.c_str());
#endif
}
void webRoot() {
  String h = String("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">") +
    "<style>body{font-family:system-ui;background:#F4F6F0;color:#2D3748;margin:0;padding:16px}"
    "h1{color:#2D5A27}button{background:#2D5A27;color:#fff;border:0;padding:10px 14px;border-radius:10px;margin:4px;font-weight:600}"
    ".badge{margin:6px;padding:8px 12px;border-radius:12px;border:1px solid #99cd32;background:#fff}"
    "table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #ddd;padding:6px;font-size:12px}"
    "th{background:#2D5A27;color:#fff}.dark{background:#2D3748;color:#fff;padding:10px;border-radius:12px}</style>" +
    "<h1>ATLAS CABINE — " CABINE_ID "</h1>" +
    "<div class='badge'>Mode: <b>" + String(modeStr()) + "</b> · SW: " CABINE_SW "</div>" +
    "<div class='dark' id='st'>chargement…</div>" +
    "<button onclick=\"fetch('/api/open')\">🔓 Ouvrir</button>" +
    "<button onclick=\"fetch('/api/close')\">🔒 Fermer</button>" +
    (CABINE_MODE_DEV ?
      "<button onclick=\"fetch('/api/scan').then(()=>load())\">🧪 Scanner matériel</button>" +
      "<button onclick=\"fetch('/api/cmd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:'testrelay'})})\">🔌 Test relais</button>" : "") +
    "<div style='border-top:2px solid #99cd32;margin-top:20px'></div>" +
    "<h2>🔍 Détection matériel</h2><table id='mat'><tbody></tbody></table>" +
    "<script>" +
    "function load(){fetch('/api/state').then(r=>r.json()).then(s=>{document.getElementById('st').innerHTML=" +
    "\"Cabine <b>\"+s.caps.join(',')+\"</b> · \"+(s.locked?'🔒 Verrouillée':'🔓 Déverrouillée')+\" · \"+(s.presence?'👤 occupée':'Libre')+" +
    "\" · mode <b>\"+s.mode+'</b>');}).catch(()=>st.innerHTML='hors ligne');" +
    "fetch('/api/material').then(r=>r.json()).then(s=>{const t=document.getElementById('mat');t.innerHTML='';" +
    "s.modules.forEach(m=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+m.name+'</td><td>GPIO '+m.pin+'</td><td>'" +
    "+ (m.present?'<td style=\'color:#2D5A27\'>✅ DÉTECTÉ</td>':'<td style=\'color:#B45309\'>⛔ absent</td>')+'<td>'+m.read+'</td>';t.appendChild(tr)});});}" +
    "setInterval(load,3000);load();</script>";
  web.send(200, "text/html", h);
}

// ---------------------------------------------------------------------------
// WiFi / MQTT
// ---------------------------------------------------------------------------
bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);
#if CABINE_WIFI_MODE == 1
  // — WiFi Privé 802.1X (WPA2-Entreprise / RADIUS) —
  Serial.printf("[WiFi] 802.1X → %s\n", CABINE_WIFI_SSID_ENT);
  esp_wifi_sta_wpa2_ent_set_identity((uint8_t*)CABINE_WIFI_EAP_IDENT, strlen(CABINE_WIFI_EAP_IDENT));
  esp_wifi_sta_wpa2_ent_set_username((uint8_t*)CABINE_WIFI_EAP_USER, strlen(CABINE_WIFI_EAP_USER));
  esp_wifi_sta_wpa2_ent_set_password((uint8_t*)CABINE_WIFI_EAP_PASS, strlen(CABINE_WIFI_EAP_PASS));
  esp_wifi_sta_wpa2_ent_enable();
  WiFi.begin(CABINE_WIFI_SSID_ENT);
#else
  // — WiFi privé classique (WPA2-PSK) —
  WiFi.begin(WIFI_SSID, WIFI_PASS);
#endif
  Serial.print("[WiFi] connexion…");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " ÉCHEC");
  return WiFi.status() == WL_CONNECTED;
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] connexion...");
    String clientId = String(CABINE_ID) + "-" + String((uint32_t)ESP.getEfuseMac() & 0xFFFFFF, HEX);
    String will = String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/status";
    if (mqtt.connect(clientId.c_str(), will.c_str(), 1, true, "offline")) {
      Serial.println(" OK");
      mqtt.publish(will.c_str(), "online", true);
      mqtt.subscribe((String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/cmd").c_str());
      publishState();
    } else {
      Serial.printf(" échec (rc=%d), 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nATLAS CABINE " CABINE_SW "  (mode " + String(modeStr()) + ")");

  pinMode(GPIO_RELAY, OUTPUT); digitalWrite(GPIO_RELAY, LOW);
  pinMode(GPIO_DOOR, INPUT_PULLUP);
  pinMode(GPIO_PIR, INPUT);
  if (GPIO_AC >= 0)  { pinMode(GPIO_AC, OUTPUT);  digitalWrite(GPIO_AC, LOW); }
  if (GPIO_URG >= 0) pinMode(GPIO_URG, INPUT_PULLUP);

#if CABINE_LED_KIND == 1
  if (GPIO_NEO >= 0) { strip.begin(); strip.setBrightness(40); strip.show(); }
#else
  if (GPIO_LED_R >= 0) ledcSetup(0, 5000, 8); ledcAttachPin(GPIO_LED_R, 0);
  if (GPIO_LED_G >= 0) { ledcSetup(1, 5000, 8); ledcAttachPin(GPIO_LED_G, 1); }
  if (GPIO_LED_B >= 0) { ledcSetup(2, 5000, 8); ledcAttachPin(GPIO_LED_B, 2); }
#endif

#if SCAN_ON_BOOT
  scanHardware();
#endif

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  connectWifi();
  connectMqtt();
  publishMaterial();

#if CABINE_ROLE == 1
  web.on("/", HTTP_GET, webRoot);
  web.on("/api/state", HTTP_GET, webHandleState);
  web.on("/api/material", HTTP_GET, webHandleMaterial);
  web.on("/api/scan", HTTP_GET, []() { scanHardware(); publishMaterial(); publishState(); web.send(200, "application/json", "{\"ok\":true}"); });
  web.on("/api/open", HTTP_GET, []() { unlockDoor(); web.send(200, "application/json", "{\"ok\":true}"); });
  web.on("/api/close", HTTP_GET, []() { lockDoor(); web.send(200, "application/json", "{\"ok\":true}"); });
  web.on("/api/cmd", HTTP_POST, webHandleCmd);
  web.begin();
  Serial.printf("[WEB] UI sur http://%s/\n", WiFi.localIP().toString().c_str());
#endif
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
#if CABINE_ROLE == 1
  web.handleClient();
#endif

  if (!mqtt.connected()) connectMqtt();
  else {
    mqtt.loop();

    // Relock auto (prolongé si présence)
    if (relayActive()) {
      if (presence()) unlockUntil = millis() + UNLOCK_MS;
      else if (millis() >= unlockUntil) lockDoor();
    }

    // Publication si changement détecté
    if (doorOpen() != lastDoorOpen || presence() != lastPresence) {
      lastDoorOpen = doorOpen();
      lastPresence = presence();
      publishState();
    }
    if (GPIO_URG >= 0) {
      int u = digitalRead(GPIO_URG);
      if (u != lastUrg) {
        lastUrg = u;
        if (u == LOW) {                 // bouton urgence = danger interne automatique
          unlockDoor(); setEmergency(1);
          Serial.println("[URGENCE] bouton d'urgence actionné → porte ouverte (évacuation)");
        } else { lockDoor(); setEmergency(0); publishState(); }
      }
    }

    // Heartbeat
    if (millis() - lastPublish >= PUBLISH_INTERVAL) { lastPublish = millis(); publishState(); }
  }
  delay(10);
}