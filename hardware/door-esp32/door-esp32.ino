/*
 * ATLAS CABINE - Contrôle de porte (MVP)
 * ESP32 + relais (verrou magnétique / gâche électrique)
 * Capteurs : reed switch (porte), PIR (présence)
 *
 * MQTT :
 *   sub atlas/door/cmd        (open | close)
 *   pub atlas/door/state      (JSON retained)
 *   LWT atlas/door/status     (online | offline)
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ---------- Configuration réseau ----------
const char* WIFI_SSID = "ATLAS_CABINE";
const char* WIFI_PASS = "atlaschange";

const char* MQTT_HOST = "192.168.1.50";
const int   MQTT_PORT = 1883;

#define DEVICE_ID "cabin-A01"

// ---------- Thèmes MQTT ----------
const char* TOPIC_CMD   = "atlas/door/cmd";
const char* TOPIC_STATE = "atlas/door/state";
const char* TOPIC_LWT   = "atlas/door/status";

// ---------- Broches ----------
#define RELAY_PIN         23  // Active HIGH -> déverrouille la porte
#define DOOR_SENSOR_PIN   4   // Reed switch (LOW = porte fermée)
#define PIR_PIN           18  // Capteur de présence

// ---------- Sécurité ----------
#define UNLOCK_MS         15000UL // maintien max en position déverrouillée
#define PUBLISH_INTERVAL  30000UL // heartbeat périodique

unsigned long unlockUntil = 0;
unsigned long lastPublish = 0;
bool lastDoorOpen = false;
bool lastPresence = false;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool relayActive() { return digitalRead(RELAY_PIN) == HIGH; }
bool doorOpen()    { return digitalRead(DOOR_SENSOR_PIN) == HIGH; }

void publishState() {
  char payload[128];
  bool presence = digitalRead(PIR_PIN) == HIGH;
  snprintf(payload, sizeof(payload),
    "{\"unit\":\"%s\",\"locked\":%s,\"open\":%s,\"presence\":%s}",
    DEVICE_ID,
    relayActive() ? "false" : "true",
    doorOpen() ? "true" : "false",
    presence ? "true" : "false");
  mqttClient.publish(TOPIC_STATE, payload, true);
  Serial.printf("[MQTT] pub %s -> %s\n", TOPIC_STATE, payload);
}

void unlockDoor() {
  digitalWrite(RELAY_PIN, HIGH);
  unlockUntil = millis() + UNLOCK_MS;
  publishState();
}

void lockDoor() {
  digitalWrite(RELAY_PIN, LOW);
  unlockUntil = 0;
  publishState();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String cmd;
  for (unsigned int i = 0; i < length; i++) cmd += (char)payload[i];
  cmd.toLowerCase();
  Serial.printf("[MQTT] %s -> %s\n", topic, cmd.c_str());

  if (String(topic) == TOPIC_CMD) {
    if (cmd == "open" || cmd == "unlock") unlockDoor();
    else if (cmd == "close" || cmd == "lock") lockDoor();
  }
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[WiFi] connexion à %s", WIFI_SSID);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  return WiFi.status() == WL_CONNECTED;
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] connexion au broker...");
    String clientId = String(DEVICE_ID) + "-" + String((uint32_t)ESP.getEfuseMac() & 0xFFFFFF, HEX);
    if (mqttClient.connect(clientId.c_str(), TOPIC_LWT, 1, true, "offline")) {
      Serial.println(" OK");
      mqttClient.publish(TOPIC_LWT, "online", true);
      mqttClient.subscribe(TOPIC_CMD);
      publishState();
    } else {
      Serial.printf(" échec (rc=%d), nouvel essai dans 3s\n", mqttClient.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(PIR_PIN, INPUT);
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectWifi();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt();
  } else {
    mqttClient.loop();

    // Relock automatique après délai (prolongé tant qu'une présence est détectée)
    if (relayActive()) {
      if (digitalRead(PIR_PIN) == HIGH) {
        unlockUntil = millis() + UNLOCK_MS;
      } else if (millis() >= unlockUntil) {
        lockDoor();
      }
    }

    // Publication si un capteur change d'état
    bool presence = digitalRead(PIR_PIN) == HIGH;
    if (doorOpen() != lastDoorOpen || presence != lastPresence) {
      lastDoorOpen = doorOpen();
      lastPresence = presence;
      publishState();
    }

    // Heartbeat périodique
    if (millis() - lastPublish >= PUBLISH_INTERVAL) {
      lastPublish = millis();
      publishState();
    }
  }

  delay(10);
}