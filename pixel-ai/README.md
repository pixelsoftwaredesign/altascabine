# Pixel AI — Assistant Multilingue & MCP

Assistant léger de **Pixel Software Design** (Gabès, Tunisie — Matricule fiscal `1969711pam000`). Architecture modulaire **Skills + Marketplace métiers** pour piloter les cabines **Atlas** (tablette Android 4–6 Go ou PC gaming), traduire via **PixelTranslate** (FR / Arabe / Darja / TR / EN) et rester conforme aux standards tunisiens (**CERT/ANCE, INPDP, Facturation électronique TEJ**).

## Structure

```
pixel-ai/
├── skills/                  # Compétences autonomes (chacune expose execute(params))
│   ├── climateSkill.js      #   Climat par occupant : Néo 23°C/vent1, Enfant 22°C/vent2, Adulte 21.5°C
│   ├── maintenanceSkill.js  #   Guide de dépannage simple (online/offline)
│   ├── translateSkill.js    #   PixelTranslate : détection + lexique FR/AR/Darja/TR/EN
│   ├── complianceSkill.js   #   Matricule fiscal, CERT/ANCE, INPDP, TEJ
│   ├── accountingSkill.js   #   TVA 19% + timbre 1 TND, charges CNSS (9.18% / 16.57%)
│   ├── codingSkill.js       #   Boilerplates JS/TS, Python/Django, Flutter/Dart
│   ├── dataScienceSkill.js  #   moyenne, médiane, min/max, écart-type
│   ├── chartSkill.js        #   Graphiques QuickChart aux couleurs Pixel
│   ├── exportSkill.js       #   Rapports PDF (pdfkit) et Word (docx) aux normes
│   └── index.js             #   Registre central : list() / execute(name, params)
├── marketplace/             # Modules métiers téléchargeables (add-ons)
│   ├── moduleLoader.js      #   Chargement dynamique (initMarketplace, executeModuleSkill)
│   ├── legal-lawyer/        #   Assistant juridique
│   ├── clinic-health/       #   Assistante clinique / santé
│   ├── driving-school/      #   GestiActiv auto-école
│   ├── hotel-hotel/         #   Conciergerie hôtelière
│   ├── retail-shop/         #   Caisse & stock commerce
│   └── cabin-atlas/         #   Gestion cabine Atlas
├── public/index.html        #   Console web de démonstration
├── data/                    #   Persistance offline (leads.json)
├── reports/                 #   PDF/DOCX générés (gitignoré)
├── pixel_dataset.jsonl      #   Corpus d'entraînement PixelTranslate
├── mcp-server.js            #   Serveur MCP (stdio) — SDK @modelcontextprotocol
└── server.js                #   API REST orchestratrice
```

## Installation

```bash
cd pixel-ai
npm install
npm start          # http://localhost:3000  (console : / )
```

## API REST

| Méthode | Route                        | Description |
|---|---|---|
| GET  | `/api/skills`               | Liste des skills |
| POST | `/api/pixel-ai/execute`     | `{ skillName, parameters }` → exécute un skill |
| GET  | `/api/modules`              | Modules métiers installés |
| POST | `/api/modules/execute`      | `{ moduleId, parameters }` → exécute un module |
| GET  | `/api/modules/:id`          | Manifeste du module (téléchargeable) |
| GET  | `/api/modules/:id/code`     | Code source du module |
| POST | `/api/generate-report`      | `{ title, dataset, format: pdf\|word }` → rapport |
| POST | `/api/sync`                 | Synchronisation des leads offline → local JSON |
| GET  | `/api/leads`                | Leads enregistrés |
| GET  | `/api/system/status`        | Statut global (skills, modules, conformité) |

Exemple :

```bash
curl -X POST localhost:3000/api/pixel-ai/execute \
  -H 'Content-Type: application/json' \
  -d '{"skillName":"climate","parameters":{"occupant":"neo"}}'
```

## MCP (Model Context Protocol)

```bash
npm run mcp         # serveur stdio partagé avec n'importe quel client MCP (Claude, etc.)
```

Tools exposés : `climate`, `maintenance`, `translate`, `compliance`, `accounting`, `coding`, `data_science`, `module`.

## Ajouter un skill

1. Créer `skills/monSkill.js` exportant `execute(params) → object`.
2. L'enregistrer dans `skills/index.js` (+ description).
3. (Optionnel) l'exposer dans `mcp-server.js` avec un schéma zod.

## Ajouter un module métier (marketplace)

1. Créer `marketplace/mon-metier/manifest.json` (moduleId, name, targetIndustry, entryPoint).
2. Créer `marketplace/mon-metier/skill.js` exportant `execute(params)`.
3. Redémarrer le serveur : le module est **chargé dynamiquement** (chargement à chaud via `loadModule()`).

Le client ne télécharge que le module de son secteur (auto-école → `driving-school`, clinique → `clinic-health`, etc.).

---

© Pixel Software Design — Gabès, Tunisie · Matricule fiscal 1969711pam000 · +216 52 675 027 · pixelsoftwaredesign@gmail.com