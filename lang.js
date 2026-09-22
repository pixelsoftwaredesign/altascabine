(function () {
    var LANGS = ["fr", "ar", "en", "it", "de", "es", "zh", "ko", "ja", "ru", "fi", "tr", "fa"];
    var RTL = ["ar", "fa"];
    var NAMES = {
        fr: ["Français", "Français"], ar: ["العربية", "العربية"], en: ["English", "English"],
        it: ["Italiano", "Italiano"], de: ["Deutsch", "Deutsch"], es: ["Español", "Español"],
        zh: ["中文", "中文"], ko: ["한국어", "한국어"], ja: ["日本語", "日本語"],
        ru: ["Русский", "Русский"], fi: ["Suomi", "Suomi"],
        tr: ["Türkçe", "Türkçe"], fa: ["فارسی", "فارسی"]
    };
    var KBDS = {
        azerty: { low: ["azertyuiop", "qsdfghjklm", "wxcvbn"], up: ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"] },
        qwerty: { low: ["qwertyuiop", "asdfghjkl", "zxcvbnm"], up: ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] },
        ru: { low: ["йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"], up: ["ЙЦУКЕНГШЩЗХЪ", "ФЫВАПРОЛДЖЭ", "ЯЧСМИТЬБЮ"] },
        tr: { low: ["qwertyuıopğü", "asdfghjklşi", "zxcvbnmöç"], up: ["QWERTYUIĞÜ", "ASDFGHJKLŞİ", "ZXCVBNMÖÇ"] },
        ar: { low: ["ضصثقفغعهخحجد", "شسيبلاتنمكط", "ئءؤرلاىةوزظ"], up: ["1234567890", "»«،؛؟!…", "()«»ًٌٍ"] },
        fa: { low: ["ضصثقفغعهخحجد", "شسیبلاتنمکگ", "ظهرذدپو،."], up: ["1234567890", "»«؛،؟!…", "()«»ٔ‌"] }
    };
    var KBDLABELS = { azerty: "AZERTY", qwerty: "QWERTY", ru: "Русская", ar: "عربية", fa: "فارسی", tr: "Türkçe" };
    var EXTRA = {
        fr: { 'Interface Cabine': 'Interface Cabine', 'Passer la commande': 'Passer la commande', '📘 Fiche': '📘 Fiche', "Commande envoyée à l'usine !": "Commande envoyée à l'usine !", 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Votre panier est vide. Ajoutez une cabine ci-dessus.', '→ Catalogue': '→ Catalogue' },
        en: { 'Interface Cabine': 'Cabin Interface', 'Passer la commande': 'Place order', '📘 Fiche': '📘 Spec sheet', "Commande envoyée à l'usine !": 'Order sent to factory!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Your cart is empty. Add a cabin above.', '→ Catalogue': '→ Catalogue' },
        ar: { 'Interface Cabine': 'واجهة الكابينة', 'Passer la commande': 'أكمل الطلب', '📘 Fiche': '📘 بطاقة المواصفات', "Commande envoyée à l'usine !": 'تم إرسال الطلب إلى المصنع!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'سلة التسوق فارغة. أضف كابينة أعلاه.', '→ Catalogue': '→ الكتالوج' },
        tr: { 'Interface Cabine': 'Kabin Arayüzü', 'Passer la commande': 'Siparişi tamamla', '📘 Fiche': '📘 Teknik dosya', "Commande envoyée à l'usine !": 'Sipariş fabrikaya gönderildi!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Sepetiniz boş. Yukarıya bir kabin ekleyin.', '→ Catalogue': '→ Katalog' },
        es: { 'Interface Cabine': 'Interfaz de la cabina', 'Passer la commande': 'Realizar pedido', '📘 Fiche': '📘 Ficha técnica', "Commande envoyée à l'usine !": '¡Pedido enviado a la fábrica!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Tu carrito está vacío. Añade una cabina arriba.', '→ Catalogue': '→ Catálogo' },
        it: { 'Interface Cabine': 'Interfaccia cabina', 'Passer la commande': 'Inoltra ordine', '📘 Fiche': '📘 Scheda tecnica', "Commande envoyée à l'usine !": 'Ordine inviato alla fabbrica!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Il carrello è vuoto. Aggiungi una cabina sopra.', '→ Catalogue': '→ Catalogo' },
        de: { 'Interface Cabine': 'Kabinenoberfläche', 'Passer la commande': 'Bestellung aufgeben', '📘 Fiche': '📘 Datenblatt', "Commande envoyée à l'usine !": 'Bestellung an die Fabrik gesendet!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Ihr Warenkorb ist leer. Fügen Sie oben eine Kabine hinzu.', '→ Catalogue': '→ Katalog' },
        zh: { 'Interface Cabine': '舱房界面', 'Passer la commande': '提交订单', '📘 Fiche': '📘 参数表', "Commande envoyée à l'usine !": '订单已发送至工厂！', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': '购物车为空，请在上方添加舱房。', '→ Catalogue': '→ 目录' },
        ko: { 'Interface Cabine': '부스 인터페이스', 'Passer la commande': '주문 완료', '📘 Fiche': '📘 상세사양', "Commande envoyée à l'usine !": '주문이 공장으로 전송되었습니다!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': '장바구니가 비어 있습니다. 위에서 부스를 추가하세요.', '→ Catalogue': '→ 카탈로그' },
        ja: { 'Interface Cabine': 'ブースインターフェース', 'Passer la commande': '注文を確定', '📘 Fiche': '📘 スペック表', "Commande envoyée à l'usine !": '注文が工場に送信されました！', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'カートは空です。上でブースを追加してください。', '→ Catalogue': '→ カタログ' },
        ru: { 'Interface Cabine': 'Интерфейс кабины', 'Passer la commande': 'Оформить заказ', '📘 Fiche': '📘 Технический лист', "Commande envoyée à l'usine !": 'Заказ отправлен на завод!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Корзина пуста. Добавьте кабину выше.', '→ Catalogue': '→ Каталог' },
        fi: { 'Interface Cabine': 'Kopin käyttöliittymä', 'Passer la commande': 'Tilaa', '📘 Fiche': '📘 Tekniset tiedot', "Commande envoyée à l'usine !": 'Tilaus lähetetty tehtaalle!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'Ostoskorisi on tyhjä. Lisää koppi yllä.', '→ Catalogue': '→ Luettelo' },
        fa: { 'Interface Cabine': 'رابطه‌ی کابین', 'Passer la commande': 'ثبت سفارش', '📘 Fiche': '📘 برگه مشخصات', "Commande envoyée à l'usine !": 'سفارش به کارخانه ارسال شد!', 'Votre panier est vide. Ajoutez une cabine ci-dessus.': 'سبد خرید شما خالی است. یک کابین اضافه کنید.', '→ Catalogue': '→ کاتالوگ' }
    };
    var saved = new Map();
    var DICS = {};
    var cur = localStorage.getItem("atlasLang");
    if (LANGS.indexOf(cur) < 0) cur = "fr";
    var kbd = localStorage.getItem("atlasKbd");
    var isKiosk = function () {
        var p = location.pathname;
        return p == null || p.length === 0 || p.charAt(p.length - 1) === "/" || /(^|\/)index\.html?$/.test(p);
    }();
    function defaultKbd(lang) {
        return { ar: "ar", fa: "fa", ru: "ru", tr: "tr", fr: "azerty" }[lang] || "qwerty";
    }
    if (!KBDS[kbd]) kbd = defaultKbd(cur);
    function norm(s) { return s.replace(/\s+/g, " ").trim(); }
    function loadDict(lang) {
        if (DICS[lang]) return Promise.resolve();
        if (window.__DIC && window.__DIC[lang]) { DICS[lang] = Object.assign({}, window.__DIC[lang], EXTRA[lang]); return Promise.resolve(); }
        return new Promise(function (res) {
            var s = document.createElement("script");
            s.src = "/lang-" + lang + ".js";
            s.onload = function () { DICS[lang] = Object.assign({}, (window.__DIC && window.__DIC[lang]) || {}, EXTRA[lang]); res(); };
            s.onerror = function () { DICS[lang] = Object.assign({}, EXTRA[lang]); res(); };
            document.head.appendChild(s);
        });
    }
    function allowedTextNode(n) {
        var p = n.parentNode;
        if (!p) return false;
        var tag = p.tagName;
        return tag !== "SCRIPT" && tag !== "STYLE" && tag !== "TEXTAREA" && tag !== "TITLE";
    }
    function apply(lang) {
        var dict = DICS[lang];
        if (!dict) return;
        var candidates = [];
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = w.nextNode())) {
            if (!allowedTextNode(n)) continue;
            if (saved.has(n)) continue;
            var t = n.textContent;
            if (!t || !t.trim()) continue;
            var v = dict[t] || dict[norm(t)];
            if (v) candidates.push([n, t, v]);
        }
        for (var i = 0; i < candidates.length; i++) {
            saved.set(candidates[i][0], candidates[i][1]);
            candidates[i][0].textContent = candidates[i][2];
        }
    }
    function restore() {
        saved.forEach(function (orig, node) { node.textContent = orig; });
        saved.clear();
    }
    function translateNode(n) {
        if (!DICS[cur] || saved.has(n)) return;
        var t = n.textContent;
        var v = DICS[cur][t] || DICS[cur][norm(t)];
        if (v) { saved.set(n, t); n.textContent = v; }
    }
    var panel = null;
    function buildPanel() {
        if (panel) return;
        panel = document.createElement("div");
        panel.id = "lang-panel";
        panel.style.cssText = "display:none;position:fixed;top:64px;right:14px;z-index:999998;background:#fff;border-radius:16px;box-shadow:0 12px 34px rgba(0,0,0,.3);border:1px solid rgba(45,90,39,.16);padding:10px 0;min-width:210px;max-height:78vh;overflow:auto;font-family:'Plus Jakarta Sans',sans-serif;";
        var head = document.createElement("div");
        head.textContent = "⚙ Réglages · Settings";
        head.style.cssText = "padding:8px 16px;font-weight:800;font-size:11px;text-transform:uppercase;color:#2D5A27;border-bottom:1px solid rgba(45,90,39,.12);";
        panel.appendChild(head);
        var lt = document.createElement("div");
        lt.textContent = "🌐 Langue";
        lt.style.cssText = "padding:8px 16px 2px;font-weight:800;font-size:11px;color:#6b7280;";
        panel.appendChild(lt);
        for (var i = 0; i < LANGS.length; i++) {
            (function (l) {
                var it = document.createElement("div");
                it.dataset.lang = l;
                it.textContent = NAMES[l][1] + " · " + NAMES[l][0];
                it.style.cssText = "padding:6px 16px;cursor:pointer;color:#1f2937;";
                it.onmouseenter = function () { it.style.background = "rgba(45,90,39,.08)"; };
                it.onmouseleave = function () { setMarks(); };
                it.onclick = function () { setLang(l); };
                panel.appendChild(it);
            })(LANGS[i]);
        }
        var kt = document.createElement("div");
        kt.textContent = "⌨️ Clavier";
        kt.style.cssText = "padding:12px 16px 2px;font-weight:800;font-size:11px;color:#6b7280;";
        panel.appendChild(kt);
        var kl = Object.keys(KBDS);
        for (var j = 0; j < kl.length; j++) {
            (function (l) {
                var it = document.createElement("div");
                it.dataset.kbd = l;
                it.textContent = KBDLABELS[l];
                it.style.cssText = "padding:6px 16px;cursor:pointer;color:#1f2937;";
                it.onmouseenter = function () { it.style.background = "rgba(45,90,39,.08)"; };
                it.onmouseleave = function () { setMarks(); };
                it.onclick = function () { setKbd(l); };
                panel.appendChild(it);
            })(kl[j]);
        }
        var sep = document.createElement("div");
        sep.style.cssText = "border-top:1px solid rgba(45,90,39,.12);margin:8px 0;";
        panel.appendChild(sep);
        var osk = document.createElement("button");
        osk.textContent = "⌨️ Afficher le clavier";
        osk.style.cssText = "display:block;margin:0 16px 8px;padding:8px 12px;border:none;border-radius:10px;background:#2D5A27;color:#fff;font-weight:800;font-size:12px;cursor:pointer;";
        osk.onclick = function (e) { e.stopPropagation(); toggleOSK(); };
        panel.appendChild(osk);
        document.body.appendChild(panel);
    }
    function setMarks() {
        if (panel) {
            var lis = panel.querySelectorAll("[data-lang]");
            for (var i = 0; i < lis.length; i++) {
                var ll = lis[i].dataset.lang;
                lis[i].style.background = ll === cur ? "rgba(45,90,39,.16)" : "transparent";
                lis[i].style.fontWeight = ll === cur ? "800" : "400";
                lis[i].textContent = NAMES[ll][1] + " · " + NAMES[ll][0] + (ll === cur ? " ✓" : "");
            }
            var kbt = panel.querySelectorAll("[data-kbd]");
            for (var j = 0; j < kbt.length; j++) {
                var kk = kbt[j].dataset.kbd;
                kbt[j].style.background = kk === kbd ? "rgba(45,90,39,.16)" : "transparent";
                kbt[j].style.fontWeight = kk === kbd ? "800" : "400";
                kbt[j].textContent = KBDLABELS[kk] + (kk === kbd ? " ✓" : "");
            }
        }
        var bar = document.getElementById("lang-bar");
        if (bar) {
            var pills = bar.querySelectorAll("[data-lang]");
            for (var m = 0; m < pills.length; m++) {
                var pl = pills[m].dataset.lang;
                pills[m].style.background = pl === cur ? "#fff" : "#2D5A27";
                pills[m].style.color = pl === cur ? "#2D5A27" : "#fff";
                pills[m].style.boxShadow = pl === cur ? "0 0 0 2px #2D5A27" : "none";
            }
        }
    }
    function posPanels() {
        var rtl = RTL.indexOf(cur) >= 0;
        if (panel) {
            panel.style.left = rtl ? "14px" : "auto";
            panel.style.right = rtl ? "auto" : "14px";
        }
        var bar = document.getElementById("lang-bar");
        if (bar) {
            bar.style.left = rtl ? "12px" : "auto";
            bar.style.right = rtl ? "auto" : "12px";
        }
    }
    function closePanel() { if (panel) panel.style.display = "none"; }
    function togglePanel() {
        buildPanel();
        setMarks();
        posPanels();
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    }
    function refreshUI(lang) {
        var h = document.documentElement;
        var rtl = RTL.indexOf(lang) >= 0;
        if (rtl) { h.dir = "rtl"; h.lang = lang; }
        else { h.dir = "ltr"; h.lang = lang === "fr" ? "fr" : lang; }
        setMarks();
        posPanels();
        var b = document.getElementById("langBtn");
        if (b) { b.textContent = NAMES[cur][1] + " ▾"; b.title = "Réglages · Langue & Clavier"; }
    }
    function buildBar() {
        if (document.getElementById("lang-bar")) return;
        var bar = document.createElement("div");
        bar.id = "lang-bar";
        bar.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:999999;display:flex;align-items:center;max-width:calc(100vw - 24px);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior:contain;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(45,90,39,.18);border-radius:999px;padding:6px 10px;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);";
        bar.style.webkitOverflowScrolling = "touch";
        for (var i = 0; i < LANGS.length; i++) {
            (function (l) {
                var pill = document.createElement("button");
                pill.dataset.lang = l;
                pill.textContent = NAMES[l][1];
                pill.type = "button";
                pill.style.cssText = "border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:800;padding:5px 9px;border-radius:999px;background:#2D5A27;color:#fff;transition:background .15s;";
                pill.onclick = function () { setLang(l); };
                bar.appendChild(pill);
            })(LANGS[i]);
        }
        document.body.appendChild(bar);
        setMarks();
        posPanels();
    }
    var osk = null, oskShift = false;
    function buildOSK() {
        if (osk) return;
        osk = document.createElement("div");
        osk.id = "lang-osk";
        osk.style.cssText = "display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:6px;z-index:999997;background:rgba(20,28,18,.94);border-radius:16px;padding:8px 10px;box-shadow:0 14px 40px rgba(0,0,0,.5);font-family:'Plus Jakarta Sans',sans-serif;";
        osk.onmousedown = function (e) { e.preventDefault(); };
        var top = document.createElement("div");
        top.id = "osk-top";
        top.style.cssText = "color:#9ACD32;font-size:11px;font-weight:800;padding:2px 6px 6px;";
        var keys = document.createElement("div");
        keys.id = "osk-keys";
        osk.appendChild(top);
        osk.appendChild(keys);
        document.body.appendChild(osk);
        renderKeys();
    }
    function renderKeys() {
        if (!osk) return;
        document.getElementById("osk-top").textContent = "⌨️ " + KBDLABELS[kbd] + " · " + NAMES[cur][1];
        var box = document.getElementById("osk-keys");
        box.textContent = "";
        var layer = oskShift ? KBDS[kbd].up : KBDS[kbd].low;
        function mk(ch, cls) {
            var b = document.createElement("button");
            b.textContent = ch;
            b.type = "button";
            b.style.cssText = "min-width:" + (cls === "ctl" ? 0 : 34) + "px;padding:" + (cls === "ctl" ? "9px 10px" : "9px 6px") + ";margin:2px;border:none;border-radius:8px;background:" + (cls === "ctl" ? "#2D5A27" : "#3a4732") + ";color:#fff;font-weight:700;font-size:14px;cursor:pointer;line-height:1;";
            return b;
        }
        var num = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
        var r0 = document.createElement("div");
        r0.style.cssText = "display:flex;justify-content:center;";
        for (var i = 0; i < num.length; i++) { (function (ch) { var b = mk(ch); b.onclick = function () { type(ch); }; r0.appendChild(b); })(num[i]); }
        box.appendChild(r0);
        for (var r = 0; r < layer.length; r++) {
            var row = document.createElement("div");
            row.style.cssText = "display:flex;justify-content:center;";
            for (var j = 0; j < layer[r].length; j++) {
                (function (ch) {
                    var b = mk(ch);
                    b.onclick = function () { type(ch); oskShift = false; renderKeys(); };
                    row.appendChild(b);
                })(layer[r].charAt(j));
            }
            box.appendChild(row);
        }
        var ctl = document.createElement("div");
        ctl.style.cssText = "display:flex;justify-content:center;";
        function cbtn(txt, fn) {
            var b = mk("", "ctl");
            b.textContent = txt;
            b.onclick = fn;
            ctl.appendChild(b);
        }
        cbtn("⇧", function () { oskShift = !oskShift; renderKeys(); });
        cbtn("⌫", function () { del(); });
        cbtn("␣", function () { type(" "); });
        cbtn("⏎", function () { enter(); });
        cbtn("✕", function () { toggleOSK(); });
        box.appendChild(ctl);
    }
    function active() {
        var el = document.activeElement;
        if (el && el.tagName === "INPUT") return el;
        if (el && el.tagName === "TEXTAREA") return el;
        return null;
    }
    function type(ch) {
        var el = active();
        if (!el) { var f = document.querySelector("input,textarea"); if (f) f.focus(); }
        if (el) {
            var s = el.selectionStart || 0, e = el.selectionEnd || 0;
            el.focus();
            if (document.execCommand("insertText", false, ch)) return;
            el.value = el.value.slice(0, s) + ch + el.value.slice(e);
            var p = s + 1;
            el.setSelectionRange(p, p);
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }
    function del() {
        var el = active();
        if (!el) return;
        var s = el.selectionStart || 0, e = el.selectionEnd || 0;
        if (s === e && s > 0) { s--; }
        if (document.execCommand("delete")) return;
        el.value = el.value.slice(0, s) + el.value.slice(e);
        el.setSelectionRange(s, s);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function enter() {
        var el = active();
        if (!el) return;
        if (el.form) { try { el.form.requestSubmit(); } catch (e) { el.form.submit(); } }
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
    }
    function toggleOSK() {
        buildOSK();
        renderKeys();
        osk.style.display = osk.style.display === "block" ? "none" : "block";
    }
    function setLang(lang) {
        if (lang === cur && DICS[lang]) { refreshUI(lang); return; }
        cur = lang;
        localStorage.setItem("atlasLang", lang);
        restore();
        if (lang === "fr") { refreshUI(lang); return; }
        loadDict(lang).then(function () { apply(lang); refreshUI(lang); });
    }
    function setKbd(l) {
        kbd = l;
        localStorage.setItem("atlasKbd", l);
        setMarks();
    }
    function cycle(btn) {
        var i = LANGS.indexOf(cur);
        setLang(LANGS[(i + 1) % LANGS.length]);
    }
    function init() {
        restore();
        var want = null;
        try { var p = new URLSearchParams(location.search).get("lang"); if (p && LANGS.indexOf(p) >= 0) want = p; } catch (e) {}
        if (want) { cur = want; localStorage.setItem("atlasLang", want); kbd = KBDS[kbd] ? kbd : defaultKbd(cur); }
        if (isKiosk) {
            buildPanel();
            document.addEventListener("click", function (e) {
                if (e.target.id !== "langBtn" && panel && !panel.contains(e.target)) panel.style.display = "none";
            });
            var b = document.getElementById("langBtn");
            if (b) {
                b.textContent = NAMES[cur][1] + " ▾";
                b.title = "Réglages · Langue & Clavier";
                b.onclick = function (e) { e.stopPropagation(); togglePanel(); };
            }
            try { localStorage.getItem("atlasKbd"); } catch (e) {}
            kbd = KBDS[kbd] ? kbd : defaultKbd(cur);
            buildOSK();
            toggleOSK(); toggleOSK();
        } else {
            buildBar();
            var lh = document.getElementById("langBtn");
            if (lh) lh.style.display = "none";
        }
        if (cur !== "fr" && DICS[cur]) { apply(cur); refreshUI(cur); }
        else if (cur !== "fr") { loadDict(cur).then(function () { apply(cur); refreshUI(cur); }); }
        else refreshUI("fr");
    }
    window.ML = {
        setLang: setLang, cycle: cycle, setKbd: setKbd,
        get lang() { return cur; }, get kbd() { return kbd; },
        t: function (s) { var d = DICS[cur]; if (d && d[s]) return d[s]; return s; }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
    setInterval(function () {
        if (cur !== "fr" && DICS[cur]) {
            var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            var n;
            while ((n = w.nextNode())) { if (allowedTextNode(n)) translateNode(n); }
        }
    }, 900);
    if (window.MutationObserver) {
        function setupObserver() {
            if (!document.body) { document.addEventListener("DOMContentLoaded", setupObserver); return; }
            new MutationObserver(function (ms) {
            if (cur === "fr" || !DICS[cur]) return;
            for (var i = 0; i < ms.length; i++) {
                var added = ms[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (node.nodeType === 3) { if (allowedTextNode(node)) translateNode(node); }
                    else if (node.nodeType === 1 && node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
                        var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
                        var n;
                        while ((n = w.nextNode())) { if (allowedTextNode(n)) translateNode(n); }
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
        }
    }
    setupObserver();
})();