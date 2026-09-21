// ════════════════════════════════════════════════════════════════════════════
// Build PixelNeural — entraîne l'algorithme Pixel sur le corpus multilingue,
// évalue, quantifie, puis injecte le moteur + poids dans index.html
// (bloc compris entre /* PIXELNEURAL-START */ et /* PIXELNEURAL-END */).
//   node pixel-ai/neural/build.js
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const PixelNeural = require('./pixelNeural.js');
const HOLDOUT = require('./holdout.js');

const INTENTS = [
    'greeting', 'smalltalk', 'status_ok', 'thanks', 'goodbye',
    'who_are_you', 'capabilities',
    'door_open', 'door_close', 'door_state',
    'lights_on', 'lights_off',
    'climate_neo', 'climate_child', 'climate_adult',
    'maintenance_power', 'maintenance_network',
    'lead', 'compliance', 'tva', 'schedule',
    'time', 'date', 'price', 'contact', 'security'
];
const LANGS = ['fr', 'ar', 'tun', 'en', 'tr'];

const where = (p) => path.join(__dirname, p);
function loadJsonl(p) {
    const out = [];
    try {
        for (const line of fs.readFileSync(where(p), 'utf8').split('\n')) {
            const t = line.trim();
            if (!t) continue;
            try { out.push(JSON.parse(t)); } catch (e) {}
        }
    } catch (e) { console.error('impossible de lire', p, e.message); }
    return out;
}

function seeds() {
    const map = {};
    for (const i of INTENTS) map[i] = { fr: [], ar: [], tun: [], en: [], tr: [] };
    for (const row of loadJsonl('corpus.jsonl')) {
        if (!map[row.intent]) continue;
        for (const l of LANGS) {
            const arr = row[l] || [];
            for (const s of arr) if (s && s.trim()) map[row.intent][l].push(s.trim().toLowerCase());
        }
    }
    // fusionne le corpus original (pixel_dataset.jsonl)
    for (const row of loadJsonl('../pixel_dataset.jsonl')) {
        if (!map[row.intent]) continue;
        for (const l of LANGS) {
            const f = 'text_' + (l === 'tun' ? 'tun' : l === 'ar' ? 'ar' : l === 'en' ? 'en' : l === 'tr' ? 'tr' : 'fr');
            const s = row[('text_' + l)] || row[f];
            if (s && typeof s === 'string' && s.trim()) map[row.intent][l].push(s.trim().toLowerCase());
        }
    }
    return map;
}

// Cadres génératifs : {v} verbe, {o} objet, {s} sujet/complément — couvre les variantes
const GEN = {
    greeting: ['{s}, bonjour', 'hey {s}', 'bonsoir {s}', 'salutation', 'hello !', 'coucou'],
    smalltalk: ['comment va {o}', 'ça va {o} ?', 'comment tu te sens', 'la forme ?', 'tu vas bien'],
    status_ok: ['{s} vais bien', 'tout va {p}', 'rien à signaler', 'ça passe', 'au top {p}'],
    thanks: ['merci {p}', 'merci pour {o}', 'je remercie {s}', 'respect {p}', 'trop gentil'],
    goodbye: ['au revoir {s}', 'à plus', 'à la prochaine {s}', 'bonne nuit', 'tchao'],
    who_are_you: ['tu es qui ?', 'qui es-tu {s} ?', 'c\'est quoi ton nom ?', 'tu viens d\'où ?', 'présente-toi'],
    capabilities: ['que peux-tu faire {s} ?', 'tu sais faire quoi ?', 'tes capacités ?', 'tu peux m\'aider à {o} ?', 'quelles tâches sais-tu faire'],
    door_open: ['{v} {o}', 'je veux {v} {o}', 'tu peux {v} {o} ?', 'est-ce que tu peux {v} {o}', '{v} {o} {p}', 'je voudrais {v} {o}'],
    door_close: ['{v} {o}', 'il faut {v} {o}', 'je veux {v} {o}', '{v} {o} {p}', 'pourrais-tu {v} {o}'],
    door_state: ['{o} est ouverte ?', '{o} est fermée ?', 'état de {o}', 'la porte comment ?', 'statut {o}'],
    lights_on: ['{v} {o}', 'je veux {v} {o}', '{v} {o} {p}', 'tu peux {v} {o} ?', 'allume vite'],
    lights_off: ['{v} {o}', 'je veux {v} {o}', '{v} {o} {p}', 'éteins tout', 'on peut {v} {o} ?'],
    climate_neo: ['règle pour {s}', 'climat pour {s}', 'température pour {s}', 'il y a {s} ici', '{s} a besoin de douceur'],
    climate_child: ['règle pour {s}', 'climat pour {s}', 'température pour {s}', 'il y a {s} ici', 'rafraîchis pour {s}'],
    climate_adult: ['règle pour {s}', 'climat pour {s}', 'température standard', 'réglage {s}', 'confort {s}'],
    maintenance_power: ['{o} ne {v} pas', '{o} est en panne', 'plus de {o}', 'elle ne répond {p}', '{o} morte'],
    maintenance_network: ['{o} ne {v} pas', '{o} coupé', 'pas de {o}', 'perte de {o}', '{o} hors ligne'],
    lead: ['je veux {o}', 'je voudrais {o}', 'un {o} pour ma société', 'parlons de {o}', 'demande de {o}'],
    compliance: ['vos {o} ?', 'vous êtes {o} ?', 'références de {o}', 'quels {o} avez-vous', 'certification {o}'],
    tva: ['{o} sur un montant', 'calcule {o}', 'le taux de {o}', 'pour {o} combien', '{o} 19 pour cent'],
    schedule: ['prends {o}', 'réserve {o}', 'je veux {o}', 'un {o} avec un expert', 'planifie {o}'],
    time: ['quelle heure est-il', 'il est quelle heure', 'l\'heure actuelle', 'donne-moi l\'heure', 'heure ?'],
    date: ['la date du jour', 'on est quel jour', 'le numéro du jour', 'date d\'aujourd\'hui', 'quelle date'],
    price: ['combien coûte {o}', 'le prix {o}', 'quel prix pour {o}', 'budget {o}', 'tarif {o}'],
    contact: ['je veux {o}', 'votre {o}', 'le numéro de {o}', 'comment {o}', 'vos coordonnées'],
    security: ['mes données sont-elles {o}', 'vous protégez {o}', 'c\'est {o} ?', 'confidentialité {o}', 'vie privée {o}']
};
const SLOT = {
    door_open: { v: ['ouvre', 'ouvrir', 'déverrouille', 'débloque'], o: ['la porte', 'la cabine', 'le sas', 'l\'entrée'], p: ['s\'il te plaît', 's\'il vous plaît', 'stp', 'pour moi'] },
    door_close: { v: ['ferme', 'fermer', 'verrouille', 'boucle', 'referme'], o: ['la porte', 'la cabine', 'le sas'], p: ['s\'il te plaît', 'stp', 'derrière moi'] },
    door_state: { o: ['la porte', 'la cabine', 'le sas', 'l\'entrée'] },
    lights_on: { v: ['allume', 'allumer', 'enclenche', 'mets', 'active'], o: ['la lumière', 'les lumières', 'l\'éclairage', 'le plafonnier'], p: ['s\'il te plaît', 'stp', 'pour moi'] },
    lights_off: { v: ['éteins', 'éteindre', 'coupe', 'arrête'], o: ['la lumière', 'les lumières', 'l\'éclairage'], p: ['s\'il te plaît', 'stp'] },
    climate_neo: { s: ['un bébé', 'un nourrisson', 'un nouveau-né', 'le bébé', 'bébée', 'un nourrison'] },
    climate_child: { s: ['un enfant', 'un enfant', 'ma fille', 'mon fils', 'les enfants', 'l\'enfant'] },
    climate_adult: { s: ['un adulte', 'une adulte', 'standard', 'normal', 'homme', 'femme'] },
    maintenance_power: { o: ['la cabine', 'le boîtier', 'la machine', 'le système', 'l\'écran'], v: ['démarre', 's\'allume', 's\'active', 'répond', 'marche'] },
    maintenance_network: { o: ['le réseau', 'le routeur', 'le wifi', 'la liaison', 'internet'], v: ['répond', 'marche', 'connecte', 'passe', 'fonctionne'] },
    lead: { o: ['une proposition', 'un devis', 'un projet', 'une estimation', 'un accompagnement commercial'] },
    compliance: { o: ['certificats', 'références', 'normes', 'agréments'], s: [''],
        _extra: ['cert ance', 'inpdp', 'tej', 'matricule fiscal'] },
    tva: { o: ['la tva', 'l\'adju', 'la taxe', 'l\'impôt'] },
    schedule: { o: ['un créneau technique', 'un rendez-vous', 'une visite', 'une installation'] },
    price: { o: ['une cabine', 'le modèle', 'une cabine atlas', 'votre cabine', 'le solaire'] },
    contact: { o: ['vous contacter', 'contact', 'téléphone', 'mail', 'adresse email'] },
    security: { o: ['protégées', 'en sécurité', 'protégée'] },
    greeting: { s: ['Pixel', 'cabine', 'la cabine'] },
    smalltalk: { o: ['toi', 'vous'] },
    status_ok: { s: ['je', 'on'], p: ['merci', 'alhamdoulilah'] },
    thanks: { s: ['vous', 'toi'], o: ['tout', 'l\'aide', 'l\'accueil'], p: ['beaucoup', 'bien', 'milles fois'] },
    goodbye: { s: ['Pixel', 'tout le monde'] },
    who_are_you: { s: ['Pixel'] },
    capabilities: { o: ['piloter la cabine', 'gérer le climat', 'répondre'] },
    maintenance_network_lead: {},
    climate_extra: {}
};

function fillFrames(intent, genslot) {
    const out = [];
    const frames = GEN[intent] || [];
    for (const f of frames) {
        const slots = Object.keys(SLOT[intent] || {}).filter(k => f.indexOf('{' + k + '}') >= 0);
        let opts = [[]];
        for (const s of slots) {
            const vals = (SLOT[intent] && SLOT[intent][s]) || [''];
            const nxt = [];
            for (const o of opts) for (const v of vals) nxt.push(o.concat([[s, v]]));
            opts = nxt;
        }
        for (const o of opts) {
            let t = f;
            for (const [s, v] of o) t = t.replace('{' + s + '}', v);
            if (t.indexOf('{') < 0 && t.trim()) out.push(t.toLowerCase());
        }
        if ((SLOT[intent] || {})._extra) for (const e of SLOT[intent]._extra) out.push(e.toLowerCase());
    }
    return out;
}

function expand(map) {
    const exemples = [];
    const seen = new Set();
    const polite = { fr: [' s&#039;il vous plaît', ' s&#039;il te plaît', ' stp'], ar: ['', ' من فضلك'], tun: ['', ' aafak'], en: [' please'], tr: [' lütfen', ''] };
    const ACTION = new Set(['door_open', 'door_close', 'lights_on', 'lights_off', 'climate_neo', 'climate_child', 'climate_adult', 'schedule', 'lead']);
    const GREET = { fr: ['bonjour ', 'salut '], ar: ['مرحبا ', 'أهلاً '], tun: ['salam ', 'ahla bik '], en: ['hello ', 'hi '], tr: ['merhaba ', 'selam '] };
    const add = (intent, l, s) => { const k = intent + '|' + (l + ':' + s); if (!seen.has(k) && s.length >= 2) { seen.add(k); exemples.push({ inp: s, label: intent }); } };
    for (const intent of INTENTS) {
        // graines
        for (const l of LANGS) for (const b of (map[intent][l] || [])) {
            add(intent, l, b);
            if (ACTION.has(intent)) for (const suf of polite[l]) add(intent, l, b + suf);
            for (const g of GREET[l]) add(intent, l, g + b);
        }
        // cadres génératifs (français)
        for (const f of fillFrames(intent)) {
            add(intent, 'fr', f);
            add(intent, 'en', f);
        }
    }
    return exemples;
}


function evalSplit(model, rows) {
    let n = 0, ok = 0;
    const per = {};
    for (const e of rows) {
        const p = PixelNeural.predict(model, e.inp);
        const hit = p.top[0].intent === e.label;
        n++; if (hit) ok++;
        per[e.label] = per[e.label] || { n: 0, ok: 0 };
        per[e.label].n++; if (hit) per[e.label].ok++;
    }
    return { ok, n, per };
}

function main() {
    const map = seeds();
    const exemples = expand(map);
    console.log('Exemples entraînés :', exemples.length, '· intents :', INTENTS.length);

    const model = PixelNeural.train(exemples, { dw: 192, dc: 96, hid: 28, epochs: 1400, lr: 0.1, seed: 42 });

    const tr = evalSplit(model, exemples);
    console.log('Précision train :', tr.ok + '/' + tr.n, '(' + (100 * tr.ok / tr.n).toFixed(1) + '%)');
    const worst = Object.keys(tr.per).filter(k => tr.per[k].ok * 100 / tr.per[k].n < 90);
    if (worst.length) {
        console.log('⚠️  intents <90% :', worst.map(k => k + '=' + tr.per[k].ok + '/' + tr.per[k].n).join(', '));
    }
    for (const w of worst) { for (const s of map[w].fr) { const p = PixelNeural.predict(model, s).top[0]; if (p.intent !== w) console.log('   ex fr:', JSON.stringify(s), '→', p.intent, p.s.toFixed(3), 'attendu', w); } }

    const hold = [];
    for (const i of INTENTS) for (const s of (HOLDOUT[i] || [])) hold.push({ inp: s, label: i });
    const ho = evalSplit(model, hold);
    console.log('Précision hors-corpus :', ho.ok + '/' + ho.n, '(' + (100 * ho.ok / ho.n).toFixed(1) + '%)');
    for (const k of Object.keys(ho.per)) {
        if (ho.per[k].ok !== ho.per[k].n) console.log('   holdout FAUX', k, '→', ho.per[k].ok + '/' + ho.per[k].n);
    }

    const modelQ = PixelNeural.quantize(model, 3);
    const engine = fs.readFileSync(where('pixelNeural.js'), 'utf8');
    const json = JSON.stringify(modelQ);
    const snippet = '/* PixelNeural — algorithme Pixel (moteur + poids). Uniquement chargé par le kiosque et le hub. */\n(function () {\nif (typeof window !== \'undefined\' && !window.PixelNeuralModel) window.PixelNeuralModel = ' + json + ';\n})();\n' + engine;
    const pkg = path.join(__dirname, '..', '..', 'pixelneural.js');
    fs.writeFileSync(pkg, snippet);
    console.log('Fichier modèle écrit :', pkg, '(' + Math.round(snippet.length / 1024) + ' Ko)');
    const mj = path.join(__dirname, 'model.json');
    fs.writeFileSync(mj, json + '\n');
    console.log('Modèle JSON écrit :', mj);
}

main();