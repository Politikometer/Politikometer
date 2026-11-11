#!/usr/bin/env node
/**
 * Wöchentliche Prüfung der Datenquellen (läuft über GitHub Actions, siehe .github/workflows/quellen.yml).
 *
 * Fragt die Quellen mit DERSELBEN Logik ab wie die App (Repositories und Schemas aus app/src, geladen
 * über tools/regierung/ts-hooks.mjs). Schlägt eine Abfrage fehl oder passt eine Antwort nicht mehr zum
 * erwarteten Format, endet das Skript mit Fehler – GitHub schickt dann eine E-Mail.
 *
 * Zusätzlich: Stimmt die mit der App ausgelieferte Regierungsliste (assets/data/regierung.json) noch
 * mit Wikidata überein?
 *
 * Schonend: rund 30 Anfragen, über die Limiter der App gedrosselt, einmal pro Woche.
 *
 * Aufruf (im Ordner app):  npm run quellencheck
 *   Option:  --ohne-regierung   Vergleich mit Wikidata auslassen
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { APP_DIR, registerTsHooks } from '../regierung/ts-hooks.mjs';

registerTsHooks();

const src = (p) => pathToFileURL(path.join(APP_DIR, 'src', p)).href;
const { BundestagRepository } = await import(src('data/repositories/bundestag-repository.ts'));
const { LegislationRepository } = await import(src('data/repositories/legislation-repository.ts'));
const { GovernmentRepository } = await import(src('data/repositories/government-repository.ts'));

const results = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Führt einen Prüfschritt aus und merkt sich das Ergebnis; ein Fehler bricht die übrigen nicht ab.
 * Bittet die Quelle um eine Pause („zu viele Anfragen“), wird gewartet und einmal wiederholt –
 * das ist kein Fehler der Quelle und soll keinen Fehlalarm auslösen.
 */
async function step(name, fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      const note = await fn();
      results.push({ name, ok: true, note });
      console.log(`ok      ${name}${note ? ` – ${note}` : ''}`);
      await sleep(2000);
      return true;
    } catch (err) {
      if (attempt === 0 && err?.name === 'RateLimitedError') {
        const seconds = Math.min(Math.max(Number(err.retryAfterSeconds) || 60, 30), 300);
        console.log(`warte   ${name} – Quelle bittet um Pause, neuer Versuch in ${seconds} s`);
        await sleep(seconds * 1000);
        continue;
      }
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      results.push({ name, ok: false, note: message });
      console.log(`FEHLER  ${name}`);
      for (const line of message.split(String.fromCharCode(10)).slice(0, 12)) console.log('        ' + line);
      return false;
    }
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const bundestag = new BundestagRepository();
const legislation = new LegislationRepository();
const government = new GovernmentRepository();

let mandateId = null;
let politicianId = null;
let pollId = null;

await step('abgeordnetenwatch: alle Abgeordneten', async () => {
  const { members } = await bundestag.getAllMembers();
  expect(members.length >= 500, `nur ${members.length} Abgeordnete – erwartet werden rund 630`);
  mandateId = members[0].mandateId;
  politicianId = members[0].politicianId;
  return `${members.length} Abgeordnete`;
});

await step('abgeordnetenwatch: Wahlkreis 1', async () => {
  const result = await bundestag.getRepresentatives(1);
  expect(result.representatives.length > 0, 'keine Abgeordneten für Wahlkreis 1');
  return `${result.representatives.length} Abgeordnete`;
});

await step('abgeordnetenwatch: Kandidierende Wahlkreis 1', async () => {
  const result = await bundestag.getCandidates(1);
  expect(result.candidates.length > 0, 'keine Kandidierenden für Wahlkreis 1');
  return `${result.candidates.length} Kandidierende`;
});

await step('abgeordnetenwatch: Profil', async () => {
  expect(politicianId !== null, 'kein Profil zum Prüfen (Abgeordnetenliste fehlgeschlagen)');
  const result = await bundestag.getProfile(politicianId);
  expect(Boolean(result.politician?.fullName), 'Profil ohne Namen');
  return `Person ${politicianId}`;
});

await step('abgeordnetenwatch: Abstimmungsverhalten', async () => {
  expect(mandateId !== null, 'kein Mandat zum Prüfen (Abgeordnetenliste fehlgeschlagen)');
  const result = await bundestag.getVotes(mandateId);
  expect(result.votes.length > 0, `keine Stimmen für Mandat ${mandateId}`);
  expect(Boolean(result.personName), 'Name der Person fehlt in den Abstimmungsdaten');
  pollId = result.votes[0].poll.id;
  return `${result.votes.length} Stimmen`;
});

await step('abgeordnetenwatch: Ergebnis einer Abstimmung', async () => {
  expect(pollId !== null, 'keine Abstimmung zum Prüfen');
  const result = await bundestag.getPollResult(pollId);
  const sum = Object.values(result.totals).reduce((a, b) => a + b, 0);
  expect(sum > 0, 'Abstimmung ohne Stimmen');
  return `${sum} Stimmen gezählt`;
});

await step('DIP + abgeordnetenwatch: Letzte Sitzungswoche', async () => {
  const week = await legislation.getWeek();
  expect(week && typeof week === 'object', 'keine Wochenübersicht');
  return Object.entries(week)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(', ');
});

let proceedingId = null;
await step('DIP: Gesetzentwürfe der Bundesregierung', async () => {
  const page = await government.getGovernmentBills(null, null);
  expect(page.items.length > 0, 'keine Gesetzentwürfe');
  proceedingId = page.items[0].id;
  return `${page.items.length} auf der ersten Seite`;
});

await step('DIP: Gesetz verfolgen', async () => {
  expect(proceedingId !== null, 'kein Vorgang zum Prüfen');
  const law = await legislation.getLegislation(String(proceedingId));
  expect(Boolean(law), 'Vorgang leer');
  return `Vorgang ${proceedingId}`;
});

await step('DIP: Bundesregierung (Gegenprüfung der mitgelieferten Liste)', async () => {
  const cabinet = await government.getVerifiedCabinet();
  const lists = Object.entries(cabinet).filter(([, v]) => Array.isArray(v));
  const count = lists.reduce((n, [, v]) => n + v.length, 0);
  expect(count > 0, 'kein Mitglied der Bundesregierung bestätigt');
  return lists.map(([k, v]) => `${k}: ${v.length}`).join(', ');
});

if (!process.argv.includes('--ohne-regierung')) {
  await step('Wikidata: mitgelieferte Regierungsliste noch aktuell', async () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'quellencheck-')), 'regierung.json');
    execFileSync(process.execPath, [path.join(APP_DIR, '../tools/regierung/build.mjs'), '--out', tmp], {
      cwd: APP_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    // Abrufzeitpunkt und Auswertungstag ändern sich bei jedem Lauf und zählen nicht als Unterschied.
    const normalise = (file) =>
      JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')), (key, value) => (key === 'retrievedAt' || key === 'evaluatedFor' ? undefined : value));
    const shipped = normalise(path.join(APP_DIR, 'assets/data/regierung.json'));
    const fresh = normalise(tmp);
    expect(
      shipped === fresh,
      'Die Regierungsliste bei Wikidata weicht von der mitgelieferten ab. Bitte „npm run regierung“ ausführen, ' +
        'die Änderung prüfen und ein App-Update veröffentlichen.',
    );
    return 'unverändert';
  });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} von ${results.length} Prüfungen in Ordnung.`);
if (failed.length) {
  console.log('Fehlgeschlagen: ' + failed.map((r) => r.name).join('; '));
  process.exit(1);
}
