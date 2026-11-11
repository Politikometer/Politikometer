#!/usr/bin/env node
/**
 * Erzeugt die statische Webseite in site/ (für GitHub Pages).
 *
 * Datenschutzerklärung und Impressum kommen aus DERSELBEN Quelle wie in der App:
 * app/src/content/recht.ts (mit den Anbieterangaben aus app/src/config/provider.ts),
 * direkt aus TypeScript geladen über tools/regierung/ts-hooks.mjs. So können App und Webseite
 * nicht auseinanderlaufen. Fehlende Angaben erscheinen als „[noch offen: …]“ (rot markiert),
 * und solange etwas offen ist, steht oben ein Entwurfshinweis – genau wie in der App.
 *
 * Weitere Seiten: Start und Hilfe (Inhalte in tools/site/inhalte/*.html), Lizenzen (aus
 * app/assets/data/licenses.json, erzeugt von `npm run licenses`).
 *
 * Die Seiten sind reines HTML/CSS: kein JavaScript, keine Cookies, keine Schriftarten oder Inhalte
 * von Dritten. Eine Content-Security-Policy im Kopf jeder Seite erlaubt nur eigene Dateien.
 *
 * Aufruf (im Ordner app):  npm run site
 *   oder direkt:           node tools/site/build.mjs
 *   Optionen:  --gilt-ab "<Datum>"   Datum, ab dem die Datenschutzerklärung gilt (z. B. „1. Dezember 2026“)
 *              --out <ordner>        Ausgabeordner (Standard: site/ im Projektwurzelordner)
 *
 * Die Ausgabe ist reproduzierbar (kein Erzeugungszeitpunkt in den Seiten). Dateien in site/ nicht
 * von Hand bearbeiten – Änderungen in recht.ts, provider.ts oder tools/site/ vornehmen und neu erzeugen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { APP_DIR, registerTsHooks } from '../regierung/ts-hooks.mjs';

registerTsHooks();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(APP_DIR, '..');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

const OUT_DIR = path.resolve(arg('--out') ?? path.join(ROOT, 'site'));
const VALID_FROM = arg('--gilt-ab');

const src = (p) => pathToFileURL(path.join(APP_DIR, 'src', p)).href;
const recht = await import(src('content/recht.ts'));
const { PROVIDER } = await import(src('config/provider.ts'));

const appJson = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'app.json'), 'utf8'));
const APP_VERSION = appJson.expo?.version ?? null;

// ---------------------------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------------------------

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Text maskieren und Webadressen sowie E-Mail-Adressen als Links ausgeben. */
function linkify(text) {
  const re = /(https:\/\/[^\s,;)]+[^\s,;).:])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    if (m[1]) out += `<a href="${esc(m[1])}">${esc(m[1])}</a>`;
    else out += `<a href="mailto:${esc(m[2])}">${esc(m[2])}</a>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

function segmentHtml(seg) {
  if (typeof seg === 'string') return linkify(seg);
  return `<mark class="missing">${esc(recht.missingText(seg.missing))}</mark>`;
}

const paragraphHtml = (p) => p.map(segmentHtml).join('');

function linksHtml(links) {
  if (!links?.length) return '';
  return `<ul>\n${links.map((l) => `  <li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join('\n')}\n</ul>\n`;
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mailto(subject) {
  return `mailto:${PROVIDER.email}?subject=${encodeURIComponent(subject)}`;
}

function fragment(name) {
  const raw = fs.readFileSync(path.join(HERE, 'inhalte', name), 'utf8');
  return raw
    .replace(/^<!--[\s\S]*?-->\s*/, '')
    .replaceAll('{{EMAIL}}', esc(PROVIDER.email))
    .replaceAll('{{MAILTO_FEHLER}}', esc(mailto('Politikometer – Fehler melden (Webseite)')))
    .replaceAll('{{MAILTO_FRAGE}}', esc(mailto('Politikometer – Frage')));
}

// ---------------------------------------------------------------------------------------------
// Rechtstexte aus recht.ts
// ---------------------------------------------------------------------------------------------

/** Entwurfshinweis – gleicher Wortlaut wie in der App (features/recht/LegalDocumentView.tsx). */
function draftBanner(doc) {
  if (!doc.draft) return '';
  const missing = recht.missingLabels(doc);
  return (
    '<div class="draft" role="note">\n' +
    '  <p><strong>Entwurf – noch nicht gültig</strong>\n' +
    '  Dieser Text ist ein Entwurf und wird vor der Veröffentlichung der App vervollständigt und geprüft.' +
    (missing.length ? ` Noch offen: ${esc(missing.join(', '))}.` : '') +
    '</p>\n</div>\n'
  );
}

function legalHtml(doc, { extra = '', meta = '' } = {}) {
  let html = `<h1>${esc(doc.title)}</h1>\n`;
  if (doc.intro) html += `<p class="meta">${paragraphHtml(doc.intro)}</p>\n`;
  if (meta) html += meta;
  html += draftBanner(doc);
  const seen = new Set();
  for (const s of doc.sections) {
    let id = slug(s.heading) || 'abschnitt';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    html += `\n<h2 id="${id}">${esc(s.heading)}</h2>\n`;
    for (const p of s.paragraphs ?? []) html += `<p>${paragraphHtml(p)}</p>\n`;
    if (s.bullets?.length) html += `<ul>\n${s.bullets.map((b) => `  <li>${paragraphHtml(b)}</li>`).join('\n')}\n</ul>\n`;
    if (s.items?.length) {
      html += '<dl>\n';
      for (const it of s.items) {
        html += `  <dt>${esc(it.term)}</dt>\n  <dd>${paragraphHtml(it.text)}`;
        if (it.links?.length) html += `\n${linksHtml(it.links)}`;
        html += '</dd>\n';
      }
      html += '</dl>\n';
    }
    html += linksHtml(s.links);
  }
  return html + extra;
}

// ---------------------------------------------------------------------------------------------
// Lizenzen aus licenses.json
// ---------------------------------------------------------------------------------------------

function licensesHtml() {
  const file = path.join(APP_DIR, 'assets', 'data', 'licenses.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  /** Lizenztext-Kennung → Lizenzbezeichnung (für die Überschrift des Textes). */
  const used = new Map();
  /** Verweis auf den Lizenztext (jeder Wortlaut steht nur einmal am Ende der Seite). */
  const textBlock = (id, license) => {
    if (!id || !data.texts[id]) return '';
    if (!used.has(id)) used.set(id, license);
    return ` · <a href="#text-${esc(id)}">Lizenztext</a>`;
  };
  let html =
    '<h1>Open-Source-Lizenzen</h1>\n' +
    '<p>Politikometer baut auf freier Software auf. Hier stehen alle Bestandteile, die in der App ' +
    'ausgeliefert werden, mit ihrer Lizenz – dieselbe Liste wie in der App unter „Über &amp; Quellen“ → ' +
    '„Open-Source-Lizenzen“. Der Quellcode von Politikometer selbst steht unter der MIT-Lizenz.</p>\n' +
    `<p class="meta">Stand der Liste: ${esc(data.generatedAt)} · ${data.packages.length} Pakete · ` +
    'Lizenzen der Datenquellen: siehe <a href="index.html#quellen">Datenquellen</a>.</p>\n';
  html += '\n<h2 id="native">Native Bestandteile (Auswahl)</h2>\n<ul class="pkg">\n';
  for (const c of data.nativeComponents ?? []) {
    html +=
      `  <li><strong>${esc(c.name)}</strong><br><span class="meta">Lizenz: ${esc(c.license)} · © ${esc(c.holder)}` +
      (c.url ? ` · <a href="${esc(c.url)}">Projektseite</a>` : '') +
      `${textBlock(c.text, c.license)}</span></li>\n`;
  }
  html += '</ul>\n\n<h2 id="pakete">JavaScript-Pakete</h2>\n<ul class="pkg">\n';
  for (const p of data.packages) {
    const copy = p.copyright?.length ? ` · ${esc(p.copyright.join('; '))}` : '';
    html +=
      `  <li><strong>${esc(p.name)}</strong> ${esc(p.version)}<br><span class="meta">Lizenz: ${esc(p.license)}${copy}` +
      (p.url ? ` · <a href="${esc(p.url)}">Projektseite</a>` : '') +
      `${textBlock(p.text, p.license)}</span></li>\n`;
  }
  html += '</ul>\n\n<h2 id="texte">Lizenztexte</h2>\n';
  [...used].forEach(([id, license], i) => {
    html += `<details id="text-${esc(id)}"><summary>Lizenztext ${i + 1}: ${esc(license)}</summary><pre>${esc(data.texts[id])}</pre></details>\n`;
  });
  return html;
}

// ---------------------------------------------------------------------------------------------
// Seitenrahmen
// ---------------------------------------------------------------------------------------------

const NAV = [
  ['index.html', 'Start'],
  ['support.html', 'Hilfe'],
  ['datenschutz.html', 'Datenschutz'],
  ['impressum.html', 'Impressum'],
];

const CSP = "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'";

function page({ file, title, description, body, noindex = false }) {
  const nav = NAV.map(
    ([href, label]) => `      <li><a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a></li>`,
  ).join('\n');
  const fullTitle = file === 'index.html' ? 'Politikometer' : `${title} – Politikometer`;
  return `<!doctype html>
<!-- Erzeugt von tools/site/build.mjs – nicht von Hand bearbeiten. -->
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#1B2E52">
  <meta name="description" content="${esc(description)}">${noindex ? '\n  <meta name="robots" content="noindex">' : ''}
  <title>${esc(fullTitle)}</title>
  <link rel="icon" type="image/png" href="favicon.png">
  <link rel="apple-touch-icon" href="favicon.png">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
  <header class="site-header">
    <div class="inner">
      <a class="brand" href="index.html"><img src="favicon.png" alt="" width="40" height="40">Politikometer</a>
      <nav class="site-nav" aria-label="Hauptnavigation">
        <ul>
${nav}
        </ul>
      </nav>
    </div>
  </header>
  <main id="inhalt" class="inner">
${body.trim()}
  </main>
  <footer class="site-footer">
    <div class="inner">
      <nav aria-label="Rechtliches">
        <ul>
          <li><a href="impressum.html">Impressum</a></li>
          <li><a href="datenschutz.html">Datenschutz</a></li>
          <li><a href="lizenzen.html">Lizenzen</a></li>
          <li><a href="support.html">Hilfe und Kontakt</a></li>
        </ul>
      </nav>
      <p>${esc(PROVIDER.name)} · Politikometer ist keine offizielle App des Deutschen Bundestages, des Bundesrates oder der Bundesregierung. Diese Webseite verwendet keine Cookies und kein Tracking.</p>
    </div>
  </footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------------------------
// Prüfungen
// ---------------------------------------------------------------------------------------------

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Einfache Strukturprüfung: jedes geöffnete Element wird in richtiger Reihenfolge geschlossen. */
function checkTags(html, file) {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<pre>[\s\S]*?<\/pre>/g, '<pre></pre>');
  const stack = [];
  for (const m of stripped.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
    const tag = m[1].toLowerCase();
    if (m[0].startsWith('<!')) continue;
    if (m[0].startsWith('</')) {
      const open = stack.pop();
      if (open !== tag) throw new Error(`${file}: </${tag}> schließt <${open ?? '–'}>`);
    } else if (!VOID.has(tag) && !m[0].endsWith('/>')) {
      stack.push(tag);
    }
  }
  if (stack.length) throw new Error(`${file}: nicht geschlossen: ${stack.join(', ')}`);
  const ids = [...stripped.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`${file}: doppelte id="${dup}"`);
  if (/<script\b/i.test(stripped)) throw new Error(`${file}: <script> ist nicht erlaubt`);
  for (const m of stripped.matchAll(/<(?:link|img)\b[^>]*\s(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:)?\/\//.test(m[1])) throw new Error(`${file}: externe Ressource ${m[1]}`);
  }
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Prüft die Farbpaare des Stylesheets (hell und dunkel) auf WCAG AA (Text ≥ 4,5:1, Rahmen/Fokus ≥ 3:1). */
function checkContrast(css) {
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) =>
    Object.fromEntries([...m[1].matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((v) => [v[1], v[2]])),
  );
  if (blocks.length < 2) throw new Error('style.css: Farbblöcke hell/dunkel nicht gefunden');
  const pairs = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['muted', 'bg', 4.5], ['muted', 'surface', 4.5],
    ['link', 'bg', 4.5], ['link', 'surface', 4.5], ['header-text', 'header-bg', 4.5],
    ['on-primary', 'primary', 4.5], ['error', 'error-surface', 4.5], ['text', 'error-surface', 4.5],
    ['focus', 'bg', 3], ['focus', 'surface', 3], ['error', 'surface', 3],
  ];
  const report = [];
  blocks.forEach((vars, i) => {
    const mode = i === 0 ? 'hell' : 'dunkel';
    const full = { ...blocks[0], ...vars };
    for (const [fg, bg, min] of pairs) {
      const r = contrast(full[fg], full[bg]);
      if (r < min) throw new Error(`Kontrast ${mode} ${fg}/${bg} = ${r.toFixed(2)} < ${min}`);
      report.push(r);
    }
  });
  return Math.min(...report);
}

// ---------------------------------------------------------------------------------------------
// Erzeugen
// ---------------------------------------------------------------------------------------------

const privacy = recht.buildPrivacyPolicy({ appVersion: APP_VERSION, validFrom: VALID_FROM });
const imprint = recht.buildImprint();

const privacyMeta =
  '<p class="meta">Gleicher Wortlaut wie in der App unter „Über &amp; Quellen“ → „Datenschutz“' +
  (APP_VERSION ? ` (Fassung für App-Version ${esc(APP_VERSION)})` : '') +
  '. Für die Webseite selbst gilt zusätzlich der <a href="#webseite">Abschnitt am Ende</a>.</p>\n';

const pages = [
  {
    file: 'index.html',
    title: 'Politikometer',
    description:
      'Politikometer zeigt, wer dich im Bundestag vertritt und was diese Menschen im Mandat tun – mit Angaben aus offiziellen, öffentlichen Quellen. Kostenlos, ohne Werbung und ohne Tracking.',
    body: fragment('index.html'),
  },
  {
    file: 'support.html',
    title: 'Hilfe und Kontakt',
    description: 'Hilfe zu Politikometer: Kontakt, häufige Fragen und Fehler melden.',
    body: fragment('support.html'),
  },
  {
    file: 'datenschutz.html',
    title: 'Datenschutzerklärung',
    description: 'Datenschutzerklärung der App Politikometer und dieser Webseite.',
    body: legalHtml(privacy, { meta: privacyMeta, extra: '\n' + fragment('datenschutz-webseite.html') }),
    noindex: privacy.draft,
  },
  {
    file: 'impressum.html',
    title: 'Impressum',
    description: 'Impressum der App Politikometer und dieser Webseite.',
    body: legalHtml(imprint),
    noindex: imprint.draft,
  },
  {
    file: 'lizenzen.html',
    title: 'Open-Source-Lizenzen',
    description: 'Open-Source-Lizenzen der Bestandteile der App Politikometer.',
    body: licensesHtml(),
  },
];

const css = fs.readFileSync(path.join(HERE, 'style.css'), 'utf8');
const minContrast = checkContrast(css);

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const p of pages) {
  const html = page(p);
  checkTags(html, p.file);
  fs.writeFileSync(path.join(OUT_DIR, p.file), html, 'utf8');
}
fs.writeFileSync(path.join(OUT_DIR, 'style.css'), css, 'utf8');
fs.copyFileSync(path.join(APP_DIR, 'assets', 'images', 'favicon.png'), path.join(OUT_DIR, 'favicon.png'));
// GitHub Pages: kein Jekyll-Umbau, Dateien unverändert ausliefern.
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '', 'utf8');

const open = [...new Set([...recht.missingLabels(privacy), ...recht.missingLabels(imprint)])];
console.log(`Webseite erzeugt in ${path.relative(ROOT, OUT_DIR) || '.'}/: ${pages.map((p) => p.file).join(', ')}, style.css, favicon.png`);
console.log(`Kleinster Farbkontrast (hell/dunkel): ${minContrast.toFixed(2)}:1`);
console.log(
  privacy.draft || imprint.draft
    ? `ENTWURF – noch offen: ${open.join(', ') || '(Anbieterangaben)'}`
    : 'Datenschutz und Impressum vollständig (kein Entwurfshinweis).',
);
