/*
 * ATLAS CABINE — door-arduino.ino
 * Modèle ARDUINO : contrôleur cabine sur plateforme Arduino classique.
 *
 *  - ARDUINO_LINK = 1 : shield Ethernet (W5100/W5500) + MQTT privé
 *    → mêmes comportements que l'ESP32 (scan, urgence, caps), sans WiFi.
 *  - ARDUINO_LINK = 2 : pont UART vers le Raspberry Pi (le Pi pilote et
 *    remonte la télémetrie ; l'Arduino ne voit que les commandes série).
 *
 * Détection matériel au boot (mode dev) + rapport MQTT retained.
 * Commandes : open | close | scan | emergency:open|close|partial|end
 */

#include "ArduinoCabineConfig.h"

#if ARDUINO_LINK == 1
#include <SPI.h>
#include <Ethernet.h>
#include <PubSubClient.h>
EthernetClient ethClient;
PubSubClient mqtt(ethClient);
String builtinCaps = "door,reed,sensor,light,ac,co2";
#else
#include <SoftwareSerial.h>
#endif

// ---------- Capteurs / actionneurs ----------
bool relayActive() { return digitalRead(GPIO_RELAY) == HIGH; }
bool doorOpen()    { return digitalRead(GPIO_DOOR) == HIGH; }
bool presence()    { return digitalRead(GPIO_PIR) == HIGH; }

// ---------- Détection matériel (scan) ----------
struct Cap { const char* name; int pin; bool enabled; int read; };
const int NCAPS = 6;
Cap gCaps[NCAPS] = {
  { "door",   GPIO_RELAY, true, 0 },
  { "reed",   GPIO_DOOR,  true, 0 },
  { "sensor", GPIO_PIR,   true, 0 },
  { "light",  -1,         true, 0 },
  { "ac",     GPIO_AC,    true, 0 },
  { "co2",    GPIO_CO2_A, true, 0 },
};

void scanHardware() {
#if ARDUINO_MODE_DEV
  Serial.println("[SCAN] Détection matériel…");
#endif
  gCaps[0].enabled = (GPIO_RELAY >= 0); gCaps[0].read = digitalRead(GPIO_RELAY);
  gCaps[1].enabled = (GPIO_DOOR  >= 0); gCaps[1].read = digitalRead(GPIO_DOOR);
  gCaps[2].enabled = (GPIO_PIR   >= 0); gCaps[2].read = digitalRead(GPIO_PIR);
  gCaps[3].enabled = false;   // (LED gérée par le hub/tablette sur ce modèle)
  gCaps[4].enabled = (GPIO_AC   >= 0); gCaps[4].read = analogRead(GPIO_AC) < 512 ? 0 : digitalRead(GPIO_AC);
  gCaps[5].enabled = false;
  if (GPIO_CO2_A >= 0) {
    int adc = analogRead(GPIO_CO2_A);
    gCaps[5].read = adc;
    gCaps[5].enabled = (adc >= 10);
  }
#if ARDUINO_MODE_DEV
  for (int i = 0; i < NCAPS; i++)
    Serial.printf("[SCAN] %-8s pin=%3d  %-10s lecture=%d\n", gCaps[i].name, gCaps[i].pin, gCaps[i].enabled ? "DÉTECTÉ" : "absent", gCaps[i].read);
#endif
}

String capsJson() {
  String s;
  for (int i = 0; i < NCAPS; i++) if (gCaps[i].enabled) { if (s.length()) s += ","; s += gCaps[i].name; }
  return s;
}

// ---------- État & MQTT ----------
#if ARDUINO_LINK == 1
void publishState() {
  String p = String("{\"unit\":\"") + CABINE_ID + "\",\"caps\":[\"" + capsJson() +
             "\"],\"hw\":\"Arduino\",\"sw\":\"" ARDUINO_SW "\",\"mode\":\"" +
             (ARDUINO_MODE_DEV ? "dev" : "prod") +
             "\",\"emergency\":" + String(emergencyKind) +
             ",\"locked\":" + String(relayActive() ? "false" : "true") +
             ",\"open\":" + String(doorOpen() ? "true" : "false") +
             ",\"presence\":" + String(presence() ? "true" : "false") + "}";
  mqtt.publish(String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/state", p.c_str(), true);
#if CABINE_USE_LEGACY
  mqtt.publish("atlas/door/state", p.c_str(), true);
#endif
#if ARDUINO_MODE_DEV
  Serial.println("[MQTT] pub -> " + p);
#endif
}
void publishMaterial() {
  String s = String("{\"unit\":\"") + CABINE_ID + "\",\"hw\":\"Arduino\",\"sw\":\"" ARDUINO_SW "\",\"modules\":[";
  for (int i = 0; i < NCAPS; i++) {
    if (i) s += ",";
    s += String("{\"name\":\"") + gCaps[i].name + "\",\"pin\":" + gCaps[i].pin + ",\"present\":" +
         (gCaps[i].enabled ? "true" : "false") + ",\"read\":" + gCaps[i].read + "}";
  }
  s += "]}";
  mqtt.publish(String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/material", s.c_str(), true);
  Serial.println("[MQTT] material -> " + s);
}
#endif

// ---------- Urgence ----------
int emergencyKind = 0;
void setEmergency(int k) { emergencyKind = k; }

// ---------- Commandes ----------
bool execCommand(String cmd) {
  cmd.toLowerCase();
  if (cmd == "open" || cmd == "unlock")       { digitalWrite(GPIO_RELAY, HIGH); emergencyKind = 0; return true; }
  if (cmd == "close" || cmd == "lock")        { digitalWrite(GPIO_RELAY, LOW);  return true; }
  if (cmd == "scan")                          { scanHardware(); return true; }
  if (cmd == "emergency:open")                { digitalWrite(GPIO_RELAY, HIGH); setEmergency(1);
    Serial.println("[URGENCE] danger interne → porte OUVERTE"); return true; }
  if (cmd == "emergency:close")               { digitalWrite(GPIO_RELAY, LOW); setEmergency(2);
    Serial.println("[URGENCE] danger extérieur → porte FERMÉE"); return true; }
  if (cmd == "emergency:partial")             { digitalWrite(GPIO_RELAY, HIGH); setEmergency(3);
    Serial.println("[URGENCE] danger catastrophique → ouverture PARTIELLE"); return true; }
  if (cmd == "emergency:end")                 { digitalWrite(GPIO_RELAY, LOW); setEmergency(0);
    Serial.println("[URGENCE] fin"); return true; }
  return false;
}

#if ARDUINO_LINK == 1
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String cmd;
  for (unsigned int i = 0; i < len; i++) cmd += (char)payload[i];
  Serial.printf("[MQTT] %s -> %s\n", topic, cmd.c_str());
  if (String(topic).endsWith("/cmd")) { if (execCommand(cmd)) publishState(); }
}
void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] connexion…");
    String clientId = String(CABINE_ID) + "-" + String(millis() % 100000);
    String will = String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/status";
    if (mqtt.connect(clientId.c_str(), will.c_str(), 1, true, "offline")) {
      mqtt.publish(will.c_str(), "online", true);
      mqtt.subscribe((String(CABINE_MQTT_BASE) + "/" + CABINE_ID + "/cmd").c_str());
      publishState();
    } else { Serial.printf(" échec (rc=%d), 3s\n", mqtt.state()); delay(3000); }
  }
}
#endif

// ---------- configuration des broches ----------
void setupPins() {
  pinMode(GPIO_RELAY, OUTPUT); digitalWrite(GPIO_RELAY, LOW);
  pinMode(GPIO_DOOR, INPUT_PULLUP);
  pinMode(GPIO_PIR, INPUT);
  if (GPIO_AC >= 0)   { pinMode(GPIO_AC, OUTPUT); digitalWrite(GPIO_AC, LOW); }
  if (GPIO_URG >= 0)  pinMode(GPIO_URG, INPUT_PULLUP);
  if (GPIO_BUZZER >= 0) pinMode(GPIO_BUZZER, OUTPUT);
}

// ---------- setup / loop ----------
void setup() {
  Serial.begin(9600);
  delay(300);
  Serial.println(F("\nATLAS CABINE " ARDUINO_SW));
  setupPins();
  scanHardware();

#if ARDUINO_LINK == 1
  if (ARD_IP[0] == 0) Ethernet.begin(ARD_MAC);
  else Ethernet.begin(ARD_MAC, ARD_IP, ARD_DNS);
  delay(1000);
  Serial.print("[NET] IP = ");
  Serial.println(Ethernet.localIP());
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  connectMqtt();
  publishMaterial();
#else
  Serial.println(F("[SERIE] Pont UART vers Raspberry Pi — attente commandes…"));
#endif
}

void loop() {
#if ARDUINO_LINK == 1
  if (!mqtt.connected()) connectMqtt();
  else mqtt.loop();
  static unsigned long lastP = 0;
  static bool lastDoor = false, lastPres = false;
  if (doorOpen() != lastDoor || presence() != lastPres) { lastDoor = doorOpen(); lastPres = presence(); publishState(); }
  if (millis() - lastP >= PUBLISH_INTERVAL) { lastP = millis(); publishState(); }
#else
  // Pont série : chaque ligne reçue du Pi est une commande
  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length()) {
      Serial.print("[SERIE] >> " + cmd + "\n");
      if (execCommand(cmd)) Serial.print("OK\n");
    }
  }
  static unsigned long lastP = 0;
  if (millis() - lastP >= PUBLISH_INTERVAL) { lastP = millis();
    Serial.print("STATE {" + String("\"locked\":") + (relayActive() ? "false" : "true") + "}\n"); }
#endif

  // bouton urgence (danger interne)
  static int lastUrg = HIGH;
  int u = GPIO_URG >= 0 ? digitalRead(GPIO_URG) : HIGH;
  if (u != lastUrg) {
    lastUrg = u;
    if (u == LOW) { digitalWrite(GPIO_RELAY, HIGH); setEmergency(1);
      if (GPIO_BUZZER >= 0) digitalWrite(GPIO_BUZZER, HIGH);
      Serial.println("[URGENCE] bouton actionné → porte ouverte"); }
    else { if (GPIO_BUZZER >= 0) digitalWrite(GPIO_BUZZER, LOW); }
  }
  delay(10);
}