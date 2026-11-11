#!/usr/bin/env node
/**
 * Erzeugt app/assets/data/regierung.json: Bundeskanzler/in und Bundeskabinett laut Wikidata (CC0).
 *
 * Warum eine Datei? Die App soll zur Laufzeit KEINE Anfragen an Wikidata (Wikimedia Foundation,
 * USA) stellen – so gehen keine IP-Adressen der Nutzenden dorthin. Die Abfragen laufen nur hier,
 * beim Entwickeln; die App liest die Datei offline. Die Gegenprüfung in DIP bleibt live in der App.
 *
 * Auswertung: dieselben Funktionen wie in den Tests (app/src/data/sources/wikidata/snapshot.ts,
 * cabinet.ts, mappers.ts), über ts-hooks.mjs direkt aus den TypeScript-Quellen geladen.
 *
 * Schonend: 8 kleine Anfragen nacheinander, höchstens 10 pro Minute, eigene Kennung
 * (User-Agent und Api-User-Agent aus app/src/data/http/user-agent.ts, wie von Wikimedia verlangt).
 * Ist das Ergebnis nicht eindeutig oder passt es nicht zum Schema, bleibt die bisherige Datei
 * unverändert und das Skript endet mit Fehler.
 *
 * Aufruf (im Ordner app):  npm run regierung
 *   Optionen:  --out <datei>   Ausgabedatei (Standard: assets/data/regierung.json)
 *              --dry-run       nur abrufen und prüfen, nichts schreiben
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { APP_DIR, registerTsHooks } from './ts-hooks.mjs';

registerTsHooks();

const src = (p) => pathToFileURL(path.join(APP_DIR, 'src', p)).href;
const { fetchJson } = await import(src('data/http/fetch-json.ts'));
const { RateLimiter } = await import(src('data/http/rate-limiter.ts'));
const { USER_AGENT } = await import(src('data/http/user-agent.ts'));
const { buildGovernmentSnapshot } = await import(src('data/sources/wikidata/snapshot.ts'));
const { claimsResponseSchema, labelsResponseSchema } = await import(src('data/sources/wikidata/schemas.ts'));
const { sparqlResponseSchema } = await import(src('data/sources/wikidata/sparql.ts'));
const { parseGovernmentSnapshot } = await import(src('data/sources/local/government-snapshot-schema.ts'));

/** Abfrage-Endpunkte – stehen bewusst NUR hier, nicht im App-Code. */
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const outFile = path.resolve(APP_DIR, arg('--out') ?? 'assets/data/regierung.json');
const dryRun = process.argv.includes('--dry-run');

const limiter = new RateLimiter(10, 60_000);
const headers = { 'Api-User-Agent': USER_AGENT };
let requests = 0;

async function actionApi(params, schema) {
  const query = new URLSearchParams({ ...params, format: 'json' }).toString();
  requests++;
  return schema.parse(await fetchJson(`${WIKIDATA_API}?${query}`, { limiter, headers }));
}

/** @type {import('../../app/src/data/sources/wikidata/snapshot').WikidataReader} */
const reader = {
  async select(query) {
    const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
    requests++;
    const json = await fetchJson(url, {
      limiter,
      timeoutMs: 60_000,
      headers: { ...headers, Accept: 'application/sparql-results+json' },
    });
    return sparqlResponseSchema.parse(json).results.bindings;
  },
  async getClaims(entityId, property) {
    const res = await actionApi({ action: 'wbgetclaims', entity: entityId, property }, claimsResponseSchema);
    return res.claims[property] ?? [];
  },
  getLabels(ids) {
    return actionApi(
      { action: 'wbgetentities', ids: ids.join('|'), props: 'labels', languages: 'de' },
      labelsResponseSchema,
    );
  },
};

const snapshot = parseGovernmentSnapshot(await buildGovernmentSnapshot(reader, new Date()));
const members = snapshot.cabinet.entries.filter((e) => e.kind === 'member');
const unclear = snapshot.cabinet.entries.filter((e) => e.kind === 'unclear');
const text = `${JSON.stringify(snapshot, null, 2)}\n`;

console.log(`Wikidata: ${requests} Anfragen, Kennung „${USER_AGENT}“`);
console.log(`${snapshot.chancellor.title}: ${snapshot.chancellor.name} (${snapshot.chancellor.wikidataId})`);
console.log(`${snapshot.cabinet.name ?? snapshot.cabinet.wikidataId} seit ${snapshot.cabinet.since}`);
console.log(`Mitglieder: ${members.length}, ohne eindeutige Angabe: ${unclear.length}`);
for (const e of snapshot.cabinet.entries) {
  console.log(
    e.kind === 'member'
      ? `  ${e.name} – ${e.offices.map((o) => o.title).join(' · ')}`
      : `  [keine eindeutige Angabe] ${e.title}`,
  );
}

if (dryRun) {
  console.log('--dry-run: nichts geschrieben.');
} else {
  fs.writeFileSync(outFile, text, 'utf8');
  console.log(`Geschrieben: ${path.relative(process.cwd(), outFile)} (${Buffer.byteLength(text)} Bytes)`);
}
