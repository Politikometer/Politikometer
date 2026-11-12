/**
 * Erzeugt zwei mitgelieferte Dateien für die App:
 *
 * 1. app/assets/data/kennzahlen.json – je Bundestagsmitglied: Teilnahme an namentlichen
 *    Abstimmungen und beantwortete Bürgerfragen (Quelle: abgeordnetenwatch.de, CC0).
 * 2. app/assets/images/abgeordnete/<id>.jpg + app/assets/data/fotos.json +
 *    app/src/data/sources/local/photo-index.ts – Porträts von Wikimedia Commons, nur mit
 *    freier Lizenz, samt Urheber, Lizenz und Link für den Bildnachweis.
 *
 * Aufruf (im Ordner app):  npm run abgeordnete            (alles)
 *                          npm run abgeordnete -- --ohne-fotos
 *                          npm run abgeordnete -- --nur-fotos
 *
 * Bewusst ohne Abhängigkeiten zur App: Das Skript läuft nur beim Entwickeln.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = path.join(ROOT, 'app');
const AW = 'https://www.abgeordnetenwatch.de/api/v2/';
const UA = 'Politikometer/0.1 (https://politikometer.github.io/Politikometer/; politikometer@gmail.com)';
// Geladen wird größer als nötig, damit der Zuschnitt auf das Gesicht scharf bleibt.
const THUMB_WIDTH = 480;
const PHOTO_SIZE = 192;
// sharp liegt als Entwicklungs-Abhängigkeit im Ordner app.
const sharp = createRequire(path.join(APP, 'package.json'))('sharp');
const SKIP_PHOTOS = process.argv.includes('--ohne-fotos');
const ONLY_PHOTOS = process.argv.includes('--nur-fotos');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { binary = false, tries = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: binary ? '*/*' : 'application/json' } });
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      const wait = Math.min(60, Number(res.headers.get('retry-after')) || 5 * attempt);
      console.log(`  … ${res.status}, warte ${wait} s`);
      await sleep(wait * 1000);
      continue;
    }
    throw new Error(`${res.status} bei ${url}`);
  }
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Fraktionsname ohne den Zusatz „(Bundestag 2025 - 2029)“. */
const cleanFraction = (label) => (label ? label.replace(/\u00AD/g, '').replace(/\s*\(.*\)\s*$/, '') : null);

async function main() {
  const now = new Date().toISOString();

  // --- Wahlperiode, Mandate, Personen -------------------------------------------------------
  const periods = await get(
    `${AW}parliament-periods?parliament=5&type=legislature&sort_by=start_date_period&sort_direction=desc&range_end=1`,
  );
  const period = periods.data[0];
  console.log(`Wahlperiode: ${period.label} (${period.id})`);

  const mandatesRes = await get(`${AW}candidacies-mandates?parliament_period=${period.id}&type=mandate&range_end=1000`);
  // Nur laufende Mandate.
  const mandates = mandatesRes.data.filter((m) => !m.end_date);
  console.log(`Mandate: ${mandates.length} laufend (${mandatesRes.data.length} insgesamt)`);

  const byMandate = new Map();
  const members = new Map();
  for (const m of mandates) {
    const memberships = m.fraction_membership ?? [];
    const current = memberships.find((f) => !f.valid_until) ?? memberships[memberships.length - 1];
    const member = {
      id: m.politician.id,
      mandateId: m.id,
      name: m.politician.label,
      fraction: cleanFraction(current?.fraction?.label ?? null),
      mandateStart: m.start_date ?? null,
      votesEligible: 0,
      votesCast: 0,
      questions: 0,
      answered: 0,
      qid: null,
    };
    members.set(member.id, member);
    byMandate.set(m.id, member);
  }

  for (const group of chunks([...members.keys()], 50)) {
    const res = await get(`${AW}politicians?id%5Bin%5D=%5B${group.join(',')}%5D&range_end=100`);
    for (const p of res.data) {
      const member = members.get(p.id);
      if (!member) continue;
      member.questions = p.statistic_questions ?? 0;
      member.answered = p.statistic_questions_answered ?? 0;
      member.qid = p.qid_wikidata ?? null;
      member.lastName = p.last_name ?? member.name;
    }
    await sleep(600);
  }

  if (ONLY_PHOTOS) {
    await photos([...members.values()], now);
    return;
  }

  // --- Namentliche Abstimmungen -------------------------------------------------------------
  const polls = await get(`${AW}polls?field_legislature=${period.id}&range_end=1000`);
  console.log(`Namentliche Abstimmungen: ${polls.data.length}`);
  let done = 0;
  for (const poll of polls.data) {
    const votes = await get(`${AW}votes?poll=${poll.id}&range_end=1000`);
    for (const v of votes.data) {
      const member = byMandate.get(v.mandate?.id);
      if (!member) continue;
      member.votesEligible += 1;
      if (v.vote !== 'no_show') member.votesCast += 1;
    }
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${polls.data.length}`);
    await sleep(700);
  }

  const kennzahlen = {
    retrievedAt: now,
    period: period.label,
    pollCount: polls.data.length,
    source: {
      publisher: 'abgeordnetenwatch.de',
      url: 'https://www.abgeordnetenwatch.de/bundestag',
      license: 'CC0 1.0',
    },
    members: [...members.values()]
      .sort((a, b) => a.id - b.id)
      .map((m) => ({
        id: m.id,
        mandateId: m.mandateId,
        name: m.name,
        lastName: m.lastName ?? m.name,
        fraction: m.fraction,
        mandateStart: m.mandateStart,
        votesEligible: m.votesEligible,
        votesCast: m.votesCast,
        questions: m.questions,
        answered: m.answered,
      })),
  };
  if (kennzahlen.members.length < 500) throw new Error('Unplausibel wenige Mitglieder – nichts geschrieben.');
  if (!kennzahlen.members.some((m) => m.votesEligible > 0)) throw new Error('Keine Abstimmungsdaten – nichts geschrieben.');
  fs.writeFileSync(path.join(APP, 'assets', 'data', 'kennzahlen.json'), JSON.stringify(kennzahlen) + '\n');
  console.log(`kennzahlen.json geschrieben (${kennzahlen.members.length} Mitglieder).`);

  if (SKIP_PHOTOS) return;
  await photos([...members.values()], now);
}

// --- Fotos ----------------------------------------------------------------------------------

/** Nur Lizenzen, die Weitergabe mit Namensnennung erlauben. */
function acceptLicense(short) {
  const s = (short ?? '').toLowerCase().trim();
  if (!s) return false;
  if (s.includes('nc') || s.includes('nd')) return false;
  return s.startsWith('cc by') || s.startsWith('cc-by') || s.startsWith('cc0') || s === 'public domain' || s.startsWith('pd');
}

/** Mitglieder der Bundesregierung aus dem mitgelieferten Schnappschuss (Schlüssel: Wikidata-Kennung). */
function governmentPeople() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(APP, 'assets', 'data', 'regierung.json'), 'utf8'));
    return (data.cabinet?.entries ?? [])
      .filter((e) => e.kind === 'member' && /^Q\d+$/.test(e.wikidataId ?? ''))
      .map((e) => ({ qid: e.wikidataId, name: e.name }));
  } catch {
    return [];
  }
}

/**
 * Quadratischer Ausschnitt, bei dem das Gesicht im Bild bleibt:
 * Hochformat – oberer Teil (der Kopf sitzt oben); Querformat – sharp sucht den auffälligsten Bildteil.
 */
async function cropSquare(buffer) {
  const upright = await sharp(buffer).rotate().toBuffer();
  const { width, height } = await sharp(upright).metadata();
  const position = height > width * 1.05 ? 'top' : sharp.strategy.attention;
  return sharp(upright)
    .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'cover', position })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

async function photos(members, now) {
  // Abgeordnete heißen wie ihre abgeordnetenwatch-Kennung, Regierungsmitglieder ohne Mandat wie ihre Wikidata-Kennung.
  const people = members.filter((m) => m.qid).map((m) => ({ key: String(m.id), qid: m.qid, name: m.name }));
  const known = new Set(people.map((p) => p.qid));
  for (const g of governmentPeople()) if (!known.has(g.qid)) people.push({ key: g.qid, qid: g.qid, name: g.name });
  const withQid = people;
  console.log(`Fotos: ${withQid.length} Personen mit Wikidata-Kennung`);

  // 1. Wikidata: Bilddatei (P18) je Person.
  const fileByQid = new Map();
  for (const group of chunks(withQid, 200)) {
    const query = `SELECT ?p ?img WHERE { VALUES ?p { ${group.map((m) => `wd:${m.qid}`).join(' ')} } ?p wdt:P18 ?img }`;
    const res = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
    for (const row of res.results.bindings) {
      const qid = row.p.value.split('/').pop();
      if (fileByQid.has(qid)) continue; // erstes Bild genügt
      fileByQid.set(qid, decodeURIComponent(row.img.value.split('/Special:FilePath/')[1]));
    }
    await sleep(1500);
  }
  console.log(`  mit Bild auf Wikidata: ${fileByQid.size}`);

  // 2. Commons: Lizenz, Urheber, Vorschaubild.
  const infoByFile = new Map();
  for (const group of chunks([...new Set(fileByQid.values())], 40)) {
    const titles = group.map((f) => `File:${f}`).join('|');
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo' +
      `&iiprop=url|extmetadata|mime&iiurlwidth=${THUMB_WIDTH}&titles=${encodeURIComponent(titles)}`;
    const res = await get(url);
    const normalized = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of res.query.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const original = (normalized.get(page.title) ?? page.title).replace(/^File:/, '');
      infoByFile.set(original, info);
      infoByFile.set(page.title.replace(/^File:/, ''), info);
    }
    await sleep(1000);
  }

  // 3. Herunterladen.
  const dir = path.join(APP, 'assets', 'images', 'abgeordnete');
  fs.mkdirSync(dir, { recursive: true });
  const credits = {};
  const keyByQid = {};
  let skippedLicense = 0;
  let failed = 0;
  for (const m of withQid) {
    const file = fileByQid.get(m.qid);
    if (!file) continue;
    const info = infoByFile.get(file) ?? infoByFile.get(file.replace(/_/g, ' '));
    if (!info?.thumburl) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value);
    if (!acceptLicense(license)) {
      skippedLicense += 1;
      continue;
    }
    if (!/jpe?g|png/i.test(info.thumbmime ?? info.mime ?? 'image/jpeg')) continue;
    const target = path.join(dir, `${m.key}.jpg`);
    try {
      if (!fs.existsSync(target)) {
        fs.writeFileSync(target, await cropSquare(await get(info.thumburl, { binary: true })));
        await sleep(250);
      }
    } catch (e) {
      failed += 1;
      console.log(`  Bild fehlgeschlagen: ${m.name} (${e.message})`);
      continue;
    }
    keyByQid[m.qid] = m.key;
    credits[m.key] = {
      name: m.name,
      author: stripHtml(meta.Artist?.value).slice(0, 120) || 'unbekannt',
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      page: info.descriptionurl,
    };
  }

  // Bilder von Personen entfernen, die nicht mehr dabei sind oder deren Lizenz nicht mehr passt.
  for (const f of fs.readdirSync(dir)) {
    const id = f.replace(/\.jpg$/, '');
    if (!credits[id]) fs.unlinkSync(path.join(dir, f));
  }

  const ids = Object.keys(credits).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
  const qids = Object.keys(keyByQid).sort();
  const extraKeys = Object.keys(credits).filter((k) => /^Q\d+$/.test(k)).sort();
  if (ids.length < 100) throw new Error(`Unplausibel wenige Fotos (${ids.length}) – Index nicht geschrieben.`);
  fs.writeFileSync(
    path.join(APP, 'assets', 'data', 'fotos.json'),
    JSON.stringify({ retrievedAt: now, source: 'Wikimedia Commons', credits }) + '\n',
  );
  const index =
    '// Automatisch erzeugt von tools/abgeordnete/build.mjs – nicht von Hand ändern.\n' +
    'export const PHOTO_INDEX: Record<number, number> = {\n' +
    ids.map((id) => `  ${id}: require('../../../../assets/images/abgeordnete/${id}.jpg'),`).join('\n') +
    '\n};\n\n' +
    '/** Dieselben Bilder nach Wikidata-Kennung – für die Bundesregierung. Wert: Dateischlüssel. */\n' +
    'export const PHOTO_KEY_BY_QID: Record<string, string> = {\n' +
    qids.map((q) => `  ${q}: '${keyByQid[q]}',`).join('\n') +
    '\n};\n\n' +
    '/** Porträts von Regierungsmitgliedern ohne Bundestagsmandat. */\n' +
    'export const PHOTO_EXTRA: Record<string, number> = {\n' +
    extraKeys.map((k) => `  ${k}: require('../../../../assets/images/abgeordnete/${k}.jpg'),`).join('\n') +
    '\n};\n';
  fs.writeFileSync(path.join(APP, 'src', 'data', 'sources', 'local', 'photo-index.ts'), index);
  console.log(`Fotos: ${ids.length} übernommen, ${skippedLicense} wegen Lizenz ausgelassen, ${failed} fehlgeschlagen.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
