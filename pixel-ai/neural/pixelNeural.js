// ════════════════════════════════════════════════════════════════════════════
// PixelNeural — « Algorithme Pixel » : moteur neuronal de langage léger.
// MLP 2 couches (entrées sparse n-gram hashées → softsign → softmax) en pure JS,
// sans dépendance. Tourne identiquement : navigateur (kiosque, inference) et
// Node (hub / serveur Pixel AI : entraînement + inference).
//
//   model = { f:{ D, H, seedA, seedB }, intents:[...], W1, b1, W2, b2 }
//   PixelNeural.train(exemples, opts) -> model
//   PixelNeural.predict(model, texte)  -> { scores, top:[{intent, s}] }
//   PixelNeural.quantize(model)        -> poids arrondis (JSON compact)
// ════════════════════════════════════════════════════════════════════════════
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PixelNeural = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---- RNG déterministe (mulberry32) ----
    function rng(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---- Hash FNV-1a (déterministe, indépendant de la plateforme) ----
    function fnv1a(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return h >>> 0;
    }
    function hash(s, seed) { return fnv1a(String(s) + '~' + (seed >>> 0).toString(16)); }

    // ---- Normalisation : minuscules, accents ôtés, arabe gardé, espaces ----
    const NBSP = /[\u00A0\u2007\u202F\u200B]/g;
    function norm(s) {
        return String(s || '').replace(NBSP, ' ')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\u0600-\u06ff\s.'\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ---- Tokénisation en n-grammes de caractères (1..3, script agnostique) ----
    function grams(q, minLen) {
        const n = norm(q);
        const out = [], seen = {};
        const lim = 3;
        const base = minLen || 1;
        for (let i = 0; i < n.length; i++) {
            for (let L = base; L <= lim && i + L <= n.length; L++) {
                const g = n.substr(i, L);
                if (g.indexOf(' ') >= 0 || g.indexOf('.') >= 0 || g.indexOf("'") >= 0 || g.indexOf('-') >= 0) continue;
                if (!seen[g]) { seen[g] = 1; out.push(g); }
            }
        }
        return out;
    }

    // ---- Tokens de mots (unigramme + bigramme) pour l'ancrage lexical ----
    function wordTokens(q) {
        const n = norm(q);
        const words = n.split(/ +/).filter(w => w.length >= 2);
        const out = [], seen = {};
        for (const w of words) if (!seen[w]) { seen[w] = 1; out.push({ g: w, w: 3 }); }
        for (let i = 0; i + 1 < words.length; i++) {
            const bg = words[i] + ' ' + words[i + 1];
            if (!seen[bg]) { seen[bg] = 1; out.push({ g: bg, w: 2 }); }
        }
        return out;
    }

    // ---- Features sparse : double hachage (LSH), buckets dissociés ----
    // Mots (décalage Dw..Dw+Dc) surpondérés (3/2) vs caractères (1) : pas de
    // collision croisée mot/caractère.
    function features(q, D, Dw, Dc, seedA, seedB, seedC, seedD) {
        const gs = grams(q, 2);
        const ws = wordTokens(q);
        const buf = new Float64Array(D);
        const addGram = (g, w, s1, s2, off, span) => {
            const a = off + hash(g, s1) % span;
            const b = off + hash(g, s2) % span;
            buf[a] += w;
            if (b !== a) buf[b] += w;
        };
        for (const g of gs) addGram(g, 1, seedA, seedB, 0, Dc);
        for (const w of ws) addGram(w.g, w.w, seedC, seedD, Dc, Dw);
        const out = [];
        for (let i = 0; i < D; i++) if (buf[i] !== 0) out.push({ i, w: buf[i] });
        return { sparse: out, count: gs.length + ws.length };
    }

    // ---- Divisions sécurisées ----
    function softsign(x) { return x / (1 + Math.abs(x)); }
    function matMulOut(model, fx) {
        const H = model.f.H, K = model.intents.length;
        const z = new Float64Array(H), a = new Float64Array(H);
        // W1 : [D][H]
        for (const f of fx) {
            const rowOff = f.i * H;
            for (let j = 0; j < H; j++) z[j] += model.W1[rowOff + j] * f.w;
        }
        for (let j = 0; j < H; j++) { z[j] += model.b1[j]; a[j] = softsign(z[j]); }
        const o = new Float64Array(K);
        for (let j = 0; j < H; j++) {
            const wrow = j * K;
            for (let k = 0; k < K; k++) o[k] += a[j] * model.W2[wrow + k];
        }
        for (let k = 0; k < K; k++) o[k] += model.b2[k];
        return o;
    }
    function softmax(o) {
        let m = -Infinity; for (let k = 0; k < o.length; k++) if (o[k] > m) m = o[k];
        const e = o.map(v => Math.exp(v - m));
        let s = 0; for (const v of e) s += v;
        return e.map(v => v / s);
    }
    function softmaxInto(o, out) {
        let m = -Infinity; for (let k = 0; k < o.length; k++) if (o[k] > m) m = o[k];
        let s = 0; for (let k = 0; k < o.length; k++) { out[k] = Math.exp(o[k] - m); s += out[k]; }
        for (let k = 0; k < o.length; k++) out[k] /= s;
    }
    function logits(model, fx) {
        const o = matMulOut(model, fx);
        return softmax(o);
    }

    // ---- Entraînement : SGD + momentum, cross-entropie softmax ----
    function train(exemples, opts) {
        opts = opts || {};
        const dw = opts.dw || 192, dc = opts.dc || 96, D = dw + dc, H = opts.hid || 28;
        const seedA = opts.seedA != null ? opts.seedA : 0x51DE;
        const seedB = opts.seedB != null ? opts.seedB : 0xA11CE;
        const seedC = opts.seedC != null ? opts.seedC : 0x74A95;
        const seedD = opts.seedD != null ? opts.seedD : 0xC0DE5;
        const epochs = opts.epochs || 3000;
        const lr0 = opts.lr != null ? opts.lr : 0.15;
        const momentum = opts.momentum != null ? opts.momentum : 0.9;
        const rndSeed = opts.seed != null ? opts.seed : 42;

        const intents = [];
        const labelId = {};
        for (const e of exemples) {
            if (!(e.label in labelId)) { labelId[e.label] = intents.length; intents.push(e.label); }
        }
        const K = intents.length;

        // Initialisation déterministe (Xavier-like)
        const r = rng(rndSeed);
        const W1 = new Float64Array(D * H), b1 = new Float64Array(H);
        const W2 = new Float64Array(H * K), b2 = new Float64Array(K);
        const s1 = Math.sqrt(2 / (D + H)), s2 = Math.sqrt(2 / (H + K));
        for (let i = 0; i < W1.length; i++) W1[i] = (r() * 2 - 1) * s1;
        for (let i = 0; i < W2.length; i++) W2[i] = (r() * 2 - 1) * s2;

        // Représentations pré-calculées
        const feats = exemples.map(e => features(e.inp, D, dw, dc, seedA, seedB, seedC, seedD).sparse);
        const ys = exemples.map(e => labelId[e.label]);

        // Momentum buffers
        const vW1 = new Float64Array(D * H), vW2 = new Float64Array(H * K);
        const vb1 = new Float64Array(H), vb2 = new Float64Array(K);
        // Buffers réutilisés (zéro allocation dans la boucle)
        const gW1 = new Float64Array(D * H), gW2 = new Float64Array(H * K);
        const gb1 = new Float64Array(H), gb2 = new Float64Array(K);
        const zB = new Float64Array(H), aB = new Float64Array(H);
        const oB = new Float64Array(K), pB = new Float64Array(K);
        const doB = new Float64Array(K), dzB = new Float64Array(H);

        function step(eta) {
            gW1.fill(0); gW2.fill(0); gb1.fill(0); gb2.fill(0);
            for (let t = 0; t < exemples.length; t++) {
                const fx = feats[t], yt = ys[t];
                // Forward
                zB.fill(0);
                for (const f of fx) {
                    const ro = f.i * H;
                    for (let j = 0; j < H; j++) zB[j] += W1[ro + j] * f.w;
                }
                oB.fill(0);
                for (let j = 0; j < H; j++) { zB[j] += b1[j]; aB[j] = softsign(zB[j]); }
                for (let j = 0; j < H; j++) {
                    const wrow = j * K;
                    for (let k = 0; k < K; k++) oB[k] += aB[j] * W2[wrow + k];
                }
                for (let k = 0; k < K; k++) oB[k] += b2[k];

                // Softmax + grad out
                softmaxInto(oB, pB);
                for (let k = 0; k < K; k++) doB[k] = pB[k] - (k === yt ? 1 : 0);

                // W2 / b2
                for (let j = 0; j < H; j++) {
                    for (let k = 0; k < K; k++) gW2[j * K + k] += doB[k] * aB[j];
                }
                for (let k = 0; k < K; k++) gb2[k] += doB[k];

                // Backprop hidden — softsign : da/dz = 1/(1+|z|)^2
                for (let j = 0; j < H; j++) {
                    let g = 0;
                    for (let k = 0; k < K; k++) g += doB[k] * W2[j * K + k];
                    const inv = 1 / (1 + Math.abs(zB[j]));
                    dzB[j] = g * inv * inv;
                }
                for (const f of fx) {
                    const ro = f.i * H;
                    for (let j = 0; j < H; j++) gW1[ro + j] += dzB[j] * f.w;
                }
                for (let j = 0; j < H; j++) gb1[j] += dzB[j];
            }
            // Update (momentum)
            const inv = 1 / exemples.length;
            for (let i = 0; i < W1.length; i++) { vW1[i] = momentum * vW1[i] - eta * gW1[i] * inv; W1[i] += vW1[i]; }
            for (let i = 0; i < W2.length; i++) { vW2[i] = momentum * vW2[i] - eta * gW2[i] * inv; W2[i] += vW2[i]; }
            for (let j = 0; j < H; j++) { vb1[j] = momentum * vb1[j] - eta * gb1[j] * inv; b1[j] += vb1[j]; vb2[j] = momentum * vb2[j] - eta * gb2[j] * inv; b2[j] += vb2[j]; }
        }

        for (let ep = 0; ep < epochs; ep++) {
            const eta = lr0 * (1 - ep / epochs);
            step(eta);
        }

        // Modèle sérialisable
        const model = { f: { D, dw, dc, H, seedA, seedB, seedC, seedD, epochs }, intents: intents.slice(), W1: Array.from(W1), b1: Array.from(b1), W2: Array.from(W2), b2: Array.from(b2) };
        return model;
    }

    function predict(model, q) {
        const fx = features(q, model.f.D, model.f.dw, model.f.dc, model.f.seedA, model.f.seedB, model.f.seedC, model.f.seedD).sparse;
        const px = Array.from(logits(model, fx));
        const top = px.map((s, i) => ({ intent: model.intents[i], s })).sort((a, b) => b.s - a.s);
        const scores = {};
        for (const t of top) scores[t.intent] = t.s;
        return { scores, top };
    }

    function quantize(model, d) {
        const dec = d != null ? d : 3;
        const r = (x) => x === 0 ? 0 : Number(x.toFixed(dec));
        return {
            f: model.f,
            intents: model.intents.slice(),
            W1: model.W1.map(r), b1: model.b1.map(r),
            W2: model.W2.map(r), b2: model.b2.map(r)
        };
    }

    // ---- Démo auto (node pixelNeural.js) ----
    function demo() {
        const data = [
            ['bonjour', 'greeting'], ['bonsoir', 'greeting'], ['salut', 'greeting'],
            ['merci', 'thanks'], ['merci beaucoup', 'thanks'], ['de rien', 'thanks'],
            ['au revoir', 'goodbye'], ['a bientôt', 'goodbye'],
            ['ouvre la porte', 'door_open'], ['ferme la porte', 'door_close'], ['la porte', 'door_state'],
            ['allume la lumière', 'lights_on'], ['éteins les lumières', 'lights_off'],
            ['quelle heure', 'time'], ['la date', 'date'],
            ['combien ça coûte', 'price'], ['contactez moi', 'contact']
        ];
        for (let i = 0; i < 3; i++) {
            data.push(['مرحبا', 'greeting'], ['شكرا', 'thanks'], ['مع السلامة', 'goodbye'], ['افتح الباب', 'door_open'], ['أغلق الباب', 'door_close'], ['الوقت', 'time']);
        }
        const exemples = data.map(([inp, label]) => ({ inp, label }));
        const model = train(exemples, { epochs: 800 });
        let ok = 0;
        for (const e of exemples) { const p = predict(model, e.inp).top[0]; if (p.intent === e.label) ok++; }
        console.log('PixelNeural demo — précision train :', ok + '/' + exemples.length, '(' + (100 * ok / exemples.length).toFixed(1) + '%)');
        console.log(predict(model, 'مرحبا').top.slice(0, 2));
        console.log(predict(model, 'ferme la porte').top.slice(0, 2));
    }

    return { norm, grams, features, train, predict, quantize, hash, demo };
}));

if (typeof module !== 'undefined' && typeof require !== 'undefined' && require.main === module && typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('pixelNeural.js')) {
    module.exports.demo();
}