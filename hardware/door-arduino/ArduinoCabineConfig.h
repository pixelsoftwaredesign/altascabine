// ============================================================================
// ATLAS CABINE — ArduinoCabineConfig.h
// Modèle ARDUINO (ATmega328/2560) : contrôleur cabine sur plateforme Arduino.
//
// L'Arduino n'a PAS de WiFi natif → deux branches (selon le matériel) :
//   ARDUINO_LINK = 1  → shield Ethernet (WIZnet W5100/W5500) + MQTT réseau privé
//   ARDUINO_LINK = 2  → pont série (UART) vers le Raspberry Pi (cabine conforme)
//
// PIN = -1  ⇒  module absent (détection automatique)
// ============================================================================

#define CABINE_ID          "CAB-ARD-01"
#define ARDUINO_SW         "v2.1-arduino"
#define ARDUINO_MODE_DEV   1     // développement : scan matériel + logs

// ---------- Mode de communication ----------
#define ARDUINO_LINK       1     // 1 = Ethernet/MQTT · 2 = pont série vers Pi

#if ARDUINO_LINK == 1
  // Réseau privé câblé (802.1X non supporté sur W5100 — VPN/VLAN au niveau routeur)
  byte ARD_MAC[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02 };
  // Adresses si DHCP indisponible (laissez 0.0.0.0 pour utiliser DHCP)
  IPAddress ARD_IP  (10, 0, 1, 32);
  IPAddress ARD_DNS (10, 0, 1, 1);
  const char* MQTT_HOST = "10.0.1.10";   // broker local (Pi) ou usine
  const int   MQTT_PORT = 1883;
#else
  #define PI_BAUD 9600
#endif

#define CABINE_MQTT_BASE   "atlas"
#define CABINE_USE_LEGACY  0     // publier aussi atlas/door/* (compat)

// ---------- Cœur cabine ----------
#define GPIO_RELAY      4     // relais porte (active HIGH)
#define GPIO_DOOR       2     // reed switch (HIGH = ouverte)
#define GPIO_PIR        3     // présence
#define GPIO_URG        5     // bouton urgence (LOW = actionné)
#define GPIO_BUZZER     6     // buzzer d'avertissement (option)

// ---------- Modules optionnels ----------
#define GPIO_AC         A1    // relais clim
#define GPIO_CO2_A      A0    // capteur CO2 analogique

// ---------- Sécurité ----------
#define UNLOCK_MS       15000UL
#define RELAY_TEST_MS    200UL
#define PUBLISH_INTERVAL 30000UL