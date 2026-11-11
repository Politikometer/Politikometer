#!/usr/bin/env node
/**
 * Erzeugt app/assets/data/licenses.json: Lizenzen aller Pakete, die in der App ausgeliefert werden.
 *
 * „Ausgeliefert“ heißt:
 * 1. JavaScript-Pakete, die tatsächlich im App-Bundle stecken – ermittelt aus den Source-Maps eines
 *    `expo export` für Android und iOS (Build-Werkzeuge wie Babel oder Metro-CLI fehlen dort zu Recht),
 * 2. Pakete mit nativem Code (Android/iOS), die beim Build automatisch eingebunden werden – ermittelt
 *    aus dem Produktions-Abhängigkeitsbaum in package-lock.json (ohne devDependencies).
 *
 * Gleiche Lizenztexte werden nur einmal gespeichert: Copyright-Zeilen stehen je Paket, der übrige
 * Text (z. B. der MIT-Wortlaut) einmal unter `texts`.
 *
 * Aufruf (im Ordner app):  npm run licenses
 *   Optionen:  --dist <ordner>   vorhandenen Export (mit Source-Maps) verwenden statt neu zu exportieren
 *              --out <datei>     Ausgabedatei (Standard: assets/data/licenses.json)
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '../../app');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const outFile = path.resolve(APP, arg('--out') ?? 'assets/data/licenses.json');
let distDir = arg('--dist') ? path.resolve(arg('--dist')) : null;
let tempDir = null;

// ---------------------------------------------------------------- 1. Bundle-Pakete (Source-Maps)

function exportBundles() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'politikometer-licenses-'));
  console.log(`Exportiere App-Bundles nach ${tempDir} …`);
  // Ein fester Befehl (Zielordner selbst erzeugt, in Anführungszeichen) – keine Fremdeingaben.
  const command = `npx expo export --platform android --platform ios --source-maps external --output-dir "${tempDir}"`;
  const res = spawnSync(command, { cwd: APP, stdio: 'inherit', shell: true, env: { ...process.env, CI: '1' } });
  if (res.status !== 0) throw new Error('expo export ist fehlgeschlagen.');
  return tempDir;
}

function findMaps(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findMaps(p));
    else if (entry.name.endsWith('.map')) out.push(p);
  }
  return out;
}

/** „/node_modules/metro/node_modules/metro-runtime/src/x.js“ → „node_modules/metro/node_modules/metro-runtime“. */
function packageDirOfSource(source) {
  const s = source.replace(/\\/g, '/');
  const i = s.lastIndexOf('node_modules/');
  if (i < 0) return null;
  const rest = s.slice(i + 'node_modules/'.length).split('/');
  const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  if (!name || name.startsWith('.')) return null;
  const prefix = s.slice(0, i).replace(/^.*?(?=node_modules\/|$)/, '').replace(/^\//, '');
  return `${prefix}node_modules/${name}`;
}

function bundlePackageDirs(dist) {
  const maps = findMaps(dist);
  if (maps.length === 0) throw new Error(`Keine Source-Maps in ${dist} gefunden.`);
  const dirs = new Set();
  for (const file of maps) {
    const map = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const src of map.sources ?? []) {
      const dir = packageDirOfSource(src);
      if (dir) dirs.add(dir);
    }
  }
  return dirs;
}

// ---------------------------------------------------------------- 2. Native Pakete (Produktionsbaum)

function nativePackageDirs() {
  const lock = JSON.parse(fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'));
  const dirs = new Set();
  for (const [key, info] of Object.entries(lock.packages ?? {})) {
    if (!key || info.dev) continue; // Wurzel und reine Entwicklungswerkzeuge überspringen
    const abs = path.join(APP, key);
    if (!fs.existsSync(path.join(abs, 'package.json'))) continue; // optional, nicht installiert
    const hasNative =
      fs.existsSync(path.join(abs, 'expo-module.config.json')) ||
      fs.existsSync(path.join(abs, 'android', 'build.gradle')) ||
      fs.existsSync(path.join(abs, 'android', 'build.gradle.kts')) ||
      fs.readdirSync(abs).some((f) => f.endsWith('.podspec'));
    if (hasNative) dirs.add(key.replace(/\\/g, '/'));
  }
  return dirs;
}

// ---------------------------------------------------------------- 3. Lizenzangaben je Paket

const LICENSE_FILE = /^(licen[cs]e|copying|unlicen[cs]e)([-._].*)?$/i;

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) {
    const types = pkg.licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    if (types.length) return types.length === 1 ? types[0] : `(${types.join(' OR ')})`;
  }
  return 'UNKNOWN';
}

function httpsUrl(pkg) {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const candidates = [pkg.homepage, repo];
  for (let c of candidates) {
    if (typeof c !== 'string' || !c) continue;
    c = c.trim().replace(/#.*$/, '');
    if (/^github:/.test(c)) c = `https://github.com/${c.slice(7)}`;
    else if (/^[\w.-]+\/[\w.-]+$/.test(c)) c = `https://github.com/${c}`;
    c = c.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/^ssh:\/\/git@/, 'https://');
    c = c.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
    if (/^https:\/\//.test(c)) return c;
  }
  return null;
}

function authorOf(pkg) {
  const a = pkg.author;
  if (!a) return null;
  if (typeof a === 'string') return a.replace(/\s*[<(].*$/, '').trim() || null;
  return a.name ?? null;
}

/** „Copyright (c) 2020 Expo“, „(c) Meta“, „© …“ – nicht aber „copyright notice and …“ aus dem Lizenzwortlaut. */
const COPYRIGHT_LINE = /^\s*((Copyright|COPYRIGHT)\b(?!\s+(notice|holders?|owners?|and|law|status|license|NOTICE|HOLDERS?|OWNERS?|AND|LAW|STATUS|LICENSE)\b)|\([cC]\)\s|©)/;

/** Lizenzdatei → Copyright-Zeilen und übriger Text (Absätze, Leerraum vereinheitlicht). */
function splitLicense(text) {
  const copyright = [];
  const rest = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (COPYRIGHT_LINE.test(line) && line.trim().length < 300) copyright.push(line.trim().replace(/\s+/g, ' '));
    else rest.push(line);
  }
  const body = rest
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    // Überschrift „MIT License“ o. Ä. gehört zur Lizenzart, nicht zum Text.
    .filter((p, i) => !(i === 0 && /^(the )?[\w .-]{0,40}licen[cs]e( \(\w+\))?:?$/i.test(p)))
    .join('\n\n');
  return { copyright, body };
}

function readLicenseFile(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const match = files.filter((f) => LICENSE_FILE.test(f)).sort((a, b) => a.length - b.length);
  for (const f of match) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) return fs.readFileSync(p, 'utf8');
  }
  return null;
}

// ---------------------------------------------------------------- 4. Native Bestandteile ohne npm-Paket

/**
 * Bibliotheken, die React Native und Expo beim Build als native Abhängigkeiten (Gradle/CocoaPods)
 * mitbringen und die nicht als eigenes npm-Paket erscheinen. Auswahl der wichtigsten; eine
 * vollständige Liste liefert erst ein Lizenz-Plugin im nativen Build (offener Punkt).
 */
const NATIVE_COMPONENTS = [
  { name: 'Hermes (JavaScript-Engine)', holder: 'Meta Platforms, Inc. and affiliates', license: 'MIT', url: 'https://github.com/facebook/hermes' },
  { name: 'Yoga (Layout)', holder: 'Meta Platforms, Inc. and affiliates', license: 'MIT', url: 'https://github.com/facebook/yoga' },
  { name: 'OkHttp und Okio (Netzwerk, Android)', holder: 'Square, Inc.', license: 'Apache-2.0', url: 'https://square.github.io/okhttp/' },
  { name: 'AndroidX / Android Jetpack', holder: 'The Android Open Source Project', license: 'Apache-2.0', url: 'https://developer.android.com/jetpack/androidx' },
  { name: 'Kotlin-Standardbibliothek (Android)', holder: 'JetBrains s.r.o. and Kotlin Programming Language contributors', license: 'Apache-2.0', url: 'https://github.com/JetBrains/kotlin' },
  { name: 'SoLoader und fbjni (Android)', holder: 'Meta Platforms, Inc. and affiliates', license: 'Apache-2.0', url: 'https://github.com/facebook/SoLoader' },
  { name: 'Folly', holder: 'Meta Platforms, Inc. and affiliates', license: 'Apache-2.0', url: 'https://github.com/facebook/folly' },
  { name: 'Boost', holder: 'Boost-Mitwirkende', license: 'BSL-1.0', url: 'https://www.boost.org/users/license.html' },
  { name: 'double-conversion', holder: 'Google Inc.', license: 'BSD-3-Clause', url: 'https://github.com/google/double-conversion' },
  { name: 'glog', holder: 'Google Inc.', license: 'BSD-3-Clause', url: 'https://github.com/google/glog' },
  { name: 'fmt', holder: 'Victor Zverovich und Mitwirkende', license: 'MIT', url: 'https://github.com/fmtlib/fmt' },
];

/** Sucht den Wortlaut der Apache-Lizenz 2.0 in einem installierten Paket. */
function findApacheText() {
  const lock = JSON.parse(fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'));
  const marker = 'END OF TERMS AND CONDITIONS';
  for (const [key, info] of Object.entries(lock.packages ?? {})) {
    if (!key || info.license !== 'Apache-2.0') continue;
    const raw = readLicenseFile(path.join(APP, key));
    if (!raw || !raw.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION')) continue;
    const start = raw.indexOf('Apache License');
    const end = raw.indexOf(marker);
    if (start < 0 || end < 0) continue;
    return raw
      .slice(start, end + marker.length)
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return null;
}

// ---------------------------------------------------------------- Hauptablauf

try {
  if (!distDir) distDir = exportBundles();
  const bundleDirs = bundlePackageDirs(distDir);
  const nativeDirs = nativePackageDirs();
  const allDirs = new Set([...bundleDirs, ...nativeDirs]);

  const textIds = new Map(); // Hash des Texts → ID
  const texts = {};
  const byLicenseType = new Map(); // Lizenzart → Text-ID (für Pakete ohne Lizenzdatei)
  const packages = new Map(); // name@version → Eintrag
  const missingFile = [];

  const sortedDirs = [...allDirs].sort();
  // Erst Pakete mit Lizenzdatei, damit Standardtexte für die übrigen bekannt sind.
  const entries = [];
  for (const rel of sortedDirs) {
    const dir = path.join(APP, rel);
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (!pkg.name || !pkg.version || pkg.name === 'politikometer') continue;
    entries.push({ rel, dir, pkg, raw: readLicenseFile(dir) });
  }

  function textIdFor(body) {
    const hash = createHash('sha1').update(body).digest('hex').slice(0, 10);
    if (!textIds.has(hash)) {
      textIds.set(hash, hash);
      texts[hash] = body;
    }
    return hash;
  }

  for (const e of entries.filter((x) => x.raw)) {
    const { copyright, body } = splitLicense(e.raw);
    const license = licenseOf(e.pkg);
    const id = body ? textIdFor(body) : null;
    if (id && !byLicenseType.has(license)) byLicenseType.set(license, id);
    e.result = { copyright, text: id };
  }
  // Copyright für Pakete ohne Lizenzdatei: aus einem Paket desselben Repositorys, sonst derselben
  // Organisation (z. B. @react-native/* ↔ react-native, beide github.com/react/…).
  const repoOf = (pkg) => {
    const m = /github\.com\/([^/]+)\/([^/#]+)/.exec(httpsUrl({ repository: pkg.repository }) ?? '');
    return m ? { repo: `${m[1]}/${m[2]}`.toLowerCase(), owner: m[1].toLowerCase() } : null;
  };
  const copyrightByRepo = new Map();
  const copyrightByOwner = new Map();
  for (const e of entries.filter((x) => x.raw && x.result.copyright.length)) {
    const r = repoOf(e.pkg);
    if (!r) continue;
    if (!copyrightByRepo.has(r.repo)) copyrightByRepo.set(r.repo, e.result.copyright);
    if (!copyrightByOwner.has(r.owner)) copyrightByOwner.set(r.owner, e.result.copyright);
  }
  for (const e of entries.filter((x) => !x.raw)) {
    const license = licenseOf(e.pkg);
    const author = authorOf(e.pkg);
    const r = repoOf(e.pkg);
    missingFile.push(`${e.pkg.name}@${e.pkg.version} (${license})`);
    e.result = {
      copyright: author
        ? [`Copyright (c) ${author}`]
        : (r && (copyrightByRepo.get(r.repo) ?? copyrightByOwner.get(r.owner))) || [],
      // Ohne eigene Lizenzdatei: Standardwortlaut derselben Lizenzart aus einem anderen Paket.
      text: byLicenseType.get(license) ?? null,
      standardText: true,
    };
  }

  for (const e of entries) {
    const key = `${e.pkg.name}@${e.pkg.version}`;
    const prev = packages.get(key);
    const native = nativeDirs.has(e.rel);
    if (prev) {
      prev.native = prev.native || native;
      continue;
    }
    packages.set(key, {
      name: e.pkg.name,
      version: e.pkg.version,
      license: licenseOf(e.pkg),
      copyright: [...new Set(e.result.copyright)],
      text: e.result.text,
      ...(e.result.standardText ? { standardText: true } : {}),
      url: httpsUrl(e.pkg),
      ...(native ? { native: true } : {}),
    });
  }

  const list = [...packages.values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'en') || a.version.localeCompare(b.version, 'en'),
  );
  // Vollständiger Wortlaut der Apache-Lizenz 2.0 für native Bestandteile (OkHttp, AndroidX …).
  const apache = findApacheText();
  if (apache) texts['apache-2.0'] = apache;
  else console.warn('WARNUNG – Wortlaut der Apache-Lizenz 2.0 nicht gefunden.');
  const mitText = byLicenseType.get('MIT') ?? null;
  const nativeComponents = NATIVE_COMPONENTS.map((c) => ({
    ...c,
    text: c.license === 'Apache-2.0' ? (apache ? 'apache-2.0' : null) : c.license === 'MIT' ? mitText : null,
  }));

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    note:
      'Erzeugt von tools/licenses/build.mjs aus den App-Bundles (Android, iOS) und den nativen ' +
      'Paketen des Produktionsbaums. Nicht von Hand bearbeiten.',
    texts,
    packages: list,
    nativeComponents,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const json = JSON.stringify(out);
  fs.writeFileSync(outFile, `${json}\n`);

  const unknown = list.filter((p) => p.license === 'UNKNOWN').map((p) => `${p.name}@${p.version}`);
  const withoutText = list.filter((p) => !p.text).map((p) => `${p.name}@${p.version} (${p.license})`);
  console.log(
    `${list.length} Pakete (${bundleDirs.size} Bundle-Pfade, ${nativeDirs.size} native), ` +
      `${Object.keys(texts).length} verschiedene Lizenztexte, ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB → ${path.relative(APP, outFile)}`,
  );
  const types = {};
  for (const p of list) types[p.license] = (types[p.license] ?? 0) + 1;
  console.log('Lizenzarten:', types);
  if (missingFile.length) console.log(`Ohne eigene Lizenzdatei (Standardwortlaut verwendet): ${missingFile.join(', ')}`);
  if (unknown.length) console.warn(`WARNUNG – Lizenz unbekannt: ${unknown.join(', ')}`);
  if (withoutText.length) console.warn(`WARNUNG – kein Lizenztext: ${withoutText.join(', ')}`);
} finally {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
}
