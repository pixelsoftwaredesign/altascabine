// ============================================================================
// ATLAS CABINE — CabineWifi8021x.h
// Cabine AVANCÉE : WiFi entreprise (WPA2-Enterprise / 802.1X) sur le réseau
// WiFi PRIVÉ de la cabine.
//
// Tous les contrôleurs (ESP32 porte, hub Pi, tablettes) et accessoires
// (clim, LED, caméra, CO2...) rejoignent le même SSID privé protégé par un
// RADIUS. Chaque appareil possède une identité dédiée :
//        <device>@cabin.atlas.tn
//
// Active dans CabineConfig.h :  #define CABINE_WIFI_MODE  1
// ============================================================================

#ifndef CABINE_WIFI_8021X_H
#define CABINE_WIFI_8021X_H

// SSID du réseau privé de la cabine (802.1X → mot de passe PAS utilisé)
#define CABINE_WIFI_SSID_ENT   "CAB-NET-01"        // réseau privé de la cabine
#define CABINE_WIFI_EAP_IDENT  "esp32-door@cabin.atlas.tn"   // identité interne (EAP)
#define CABINE_WIFI_EAP_USER   "esp32-door"        // nom d'utilisateur RADIUS
#define CABINE_WIFI_EAP_PASS   "cabinX_kd92!q"     // secret RADIUS (unicité par cabine)

// Méthode EAP (PEAP/MSCHAPv2 par défaut — compatible RADIUS) :
//   1 = PEAP/MSCHAPv2 · 2 = EAP-TLS (nécessite un certificat côté appareil)
#define CABINE_WIFI_EAP_METHOD 1

// Option : racine CA (PEM) si EAP-TLS ou vérification serveur — voir README.
// #define CABINE_WIFI_CA_CERT       "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

#endif