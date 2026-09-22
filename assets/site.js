(function () {
    'use strict';
    var KEY_THEME = 'atlasTheme', KEY_CHARTE = 'atlasCharte';
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function isDark() { return document.documentElement.classList.contains('atlas-dark'); }
    function isBlue() { return document.documentElement.classList.contains('atlas-blue'); }

    function applyTheme(dark) { document.documentElement.classList.toggle('atlas-dark', dark); set(KEY_THEME, dark ? 'dark' : 'light'); }
    function applyCharte(blue) { document.documentElement.classList.toggle('atlas-blue', blue); set(KEY_CHARTE, blue ? 'bleu' : 'vert'); }

    function buildDock() {
        var dock = document.getElementById('theme-dock');
        if (dock) return;
        dock = document.createElement('div');
        dock.id = 'theme-dock';
        var themeBtn = document.createElement('button');
        themeBtn.id = 'td-theme';
        themeBtn.type = 'button';
        themeBtn.setAttribute('aria-label', 'Thème sombre / clair');
        themeBtn.title = 'Thème sombre / clair';
        var charteBtn = document.createElement('button');
        charteBtn.id = 'td-charte';
        charteBtn.type = 'button';
        charteBtn.setAttribute('aria-label', 'Charte graphique vert / bleu');
        charteBtn.title = 'Charte graphique : vert / bleu';
        themeBtn.addEventListener('click', function () { applyTheme(!isDark()); refresh(); });
        charteBtn.addEventListener('click', function () { applyCharte(!isBlue()); refresh(); });
        dock.appendChild(themeBtn);
        dock.appendChild(charteBtn);
        document.body.appendChild(dock);
        if (get(KEY_THEME) === 'dark') applyTheme(true);
        if (get(KEY_CHARTE) === 'bleu') applyCharte(true);
    }
    function refresh() {
        var t = document.getElementById('td-theme');
        if (t) { t.textContent = isDark() ? '☀️' : '🌓'; t.classList.toggle('act', isDark()); }
        var c = document.getElementById('td-charte');
        if (c) { c.textContent = isBlue() ? '🧿' : '🎨'; c.classList.toggle('act', isBlue()); }
    }
    function init() {
        buildDock();
        refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();