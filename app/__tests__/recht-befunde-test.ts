/**
 * Befunde des Rechtsprüfers (31.10.2026): Anbieterangaben, Impressum/Datenschutz, Fehler melden,
 * gespeicherte Daten löschen, Open-Source-Lizenzen.
 */
import { isLegalDraft, PROVIDER } from '@/config/provider';
import { buildImprint, buildPrivacyPolicy, missingLabels, paragraphText, type LegalDocument } from '@/content/recht';
import { USER_AGENT } from '@/data/http/user-agent';
import { filterPackages, licenseData, spdxUrl } from '@/data/sources/local/licenses';
import { clearAllLocalData } from '@/state/clear-local-data';
import { createFavoritesStore, FAVORITES_STORAGE_KEY, serializeFavorites } from '@/state/favorites';
import { clearLastPlz, LAST_PLZ_STORAGE_KEY } from '@/state/last-plz';
import { buildReportMailto, reportSubject } from '@/ui/report-error';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function allText(doc: LegalDocument): string {
  const parts: string[] = [];
  if (doc.intro) parts.push(paragraphText(doc.intro));
  for (const s of doc.sections) {
    parts.push(s.heading);
    s.paragraphs?.forEach((p) => parts.push(paragraphText(p)));
    s.bullets?.forEach((p) => parts.push(paragraphText(p)));
    s.items?.forEach((i) => parts.push(i.term, paragraphText(i.text)));
  }
  return parts.join('\n');
}

const ADDRESS = { street: 'Musterstraße 1', postalCode: '12345', city: 'Musterstadt', country: 'Deutschland' };

describe('Anbieterangaben', () => {
  it('User-Agent nutzt Name und E-Mail aus provider.ts', () => {
    expect(USER_AGENT).toBe(`Politikometer/0.1 (${PROVIDER.name}; ${PROVIDER.email})`);
    expect(PROVIDER.name).toBe('Lima Projects');
  });

  it('gilt als Entwurf, solange die Anschrift fehlt', () => {
    expect(isLegalDraft({ address: null })).toBe(true);
    expect(isLegalDraft({ address: ADDRESS })).toBe(false);
  });
});

describe('Impressum', () => {
  it('zeigt fehlende Anschrift als Platzhalter und ist Entwurf', () => {
    // Fall „Anschrift fehlt“ unabhängig von den echten Anbieterdaten prüfen.
    const doc = buildImprint({ provider: { ...PROVIDER, address: null, phone: null, legalNameConfirmed: false } });
    expect(doc.draft).toBe(true);
    const text = allText(doc);
    expect(text).toContain('[noch offen: Anschrift (Straße, Hausnummer, PLZ, Ort)]');
    expect(text).toContain('Lima Projects');
    expect(text).toContain('Inhaber: Luiz Augusto de Oliveira Lima [noch offen: vollständiger amtlicher Name bestätigen]');
    expect(text).toContain(`E-Mail: ${PROVIDER.email}`);
    expect(text).not.toContain('Telefon');
    expect(text).toContain(
      'Verantwortlich nach § 18 Abs. 2 MStV\nLuiz Augusto de Oliveira Lima [noch offen: vollständiger amtlicher Name bestätigen], ' +
        '[noch offen: Anschrift (Straße, Hausnummer, PLZ, Ort)]',
    );
    expect(text).toContain('Verbraucherschlichtungsstelle');
    expect(text).not.toMatch(/OS-Plattform|Haftung für Links|Disclaimer/);
  });

  it('ist kein Entwurf mehr, wenn alle Angaben vorliegen', () => {
    const provider = { ...PROVIDER, address: ADDRESS, phone: '+49 221 000000', legalNameConfirmed: true };
    const doc = buildImprint({ provider });
    expect(doc.draft).toBe(false);
    expect(missingLabels(doc)).toEqual([]);
    const text = allText(doc);
    expect(text).toContain('12345 Musterstadt');
    expect(text).toContain('Telefon: +49 221 000000');
    expect(text).toContain('Luiz Augusto de Oliveira Lima, Musterstraße 1, 12345 Musterstadt, Deutschland');
  });
});

describe('Datenschutzerklärung', () => {
  it('nennt die Datenquellen und die Kontakt-E-Mail', () => {
    const text = allText(buildPrivacyPolicy());
    expect(text).toContain('abgeordnetenwatch.de');
    expect(text).toContain('DIP');
    expect(text).toContain(USER_AGENT);
    expect(text).toContain('Gespeicherte Daten löschen');
    expect(text).toContain('Auf Android ist die automatische Datensicherung der App abgeschaltet');
    // keine Bearbeitungshinweise aus dem Entwurf
    expect(text).not.toMatch(/Variante [AB]|\[\[|Prüfbericht/);
  });

  it('Wikidata nur als Quelle der mitgelieferten Datei – keine Übermittlung in die USA', () => {
    const doc = buildPrivacyPolicy();
    const text = allText(doc);
    expect(text).toContain('Wikidata');
    expect(text).toContain('Die App stellt dafür keine Anfragen an Wikidata');
    expect(text).not.toMatch(/Wikimedia|USA|Data Privacy Framework|query\.wikidata/);
    const recipients = doc.sections.find((s) => s.heading.startsWith('2.2'))!;
    expect(recipients.items!.map((i) => i.term).join(' ')).not.toContain('Wikidata');
  });

  it('Absturzberichte widerspruchsfrei: App sendet keine, Stores ggf. anonyme Statistiken', () => {
    const doc = buildPrivacyPolicy();
    const text = allText(doc);
    expect(text).not.toContain('keine Werbung und keine Absturzberichte');
    expect(text).not.toContain('Keine Absturz- oder Fehlerberichte an uns oder Dritte');
    expect(text).toContain('Die App selbst sendet keine Absturzberichte');
    expect(text).toContain('sofern du dem in den Einstellungen deines Geräts zugestimmt hast');
  });

  it('nennt nur die Berechtigungen INTERNET und ACCESS_NETWORK_STATE', () => {
    const text = allText(buildPrivacyPolicy());
    expect(text).toContain('INTERNET');
    expect(text).toContain('ACCESS_NETWORK_STATE');
    expect(text).not.toContain('WIFI');
  });

  it('nennt die LDI NRW als Aufsichtsbehörde (https)', () => {
    const doc = buildPrivacyPolicy();
    expect(allText(doc)).toContain('Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen');
    expect(missingLabels(doc).join()).not.toContain('Aufsichtsbehörde');
    const rights = doc.sections.find((s) => s.heading.startsWith('4.'))!;
    expect(rights.links).toEqual([expect.objectContaining({ url: 'https://www.ldi.nrw.de' })]);
  });

  it('Politikerdaten: Art. 9 Abs. 2 lit. e und Information nach Art. 14 DSGVO', () => {
    const text = allText(buildPrivacyPolicy());
    expect(text).toContain('Art. 9 Abs. 1 DSGVO');
    expect(text).toContain('offensichtlich öffentlich gemacht');
    expect(text).toContain('Art. 9 Abs. 2 lit. e');
    expect(text).toContain('Art. 14 DSGVO');
  });

  it('listet offene Angaben und den Hinweis zum Quellcode', () => {
    const doc = buildPrivacyPolicy({ provider: { ...PROVIDER, address: null }, sourceCodeUrl: null, privacyPolicyUrl: null });
    expect(doc.draft).toBe(true);
    expect(missingLabels(doc)).toEqual(
      expect.arrayContaining(['Anschrift (Straße, Hausnummer, PLZ, Ort)', 'Datum', 'Webadresse der Datenschutzerklärung']),
    );
    expect(allText(doc)).toContain('wird mit der Veröffentlichung der App bereitgestellt');
    const withUrl = allText(buildPrivacyPolicy({ sourceCodeUrl: 'https://example.org/code' }));
    expect(withUrl).toContain('https://example.org/code');
  });
});

describe('Fehler melden', () => {
  it('baut ein mailto mit fester Adresse und vorausgefülltem Betreff', () => {
    const url = buildReportMailto({ page: 'profil', id: 118559, name: 'Friedrich Merz' })!;
    expect(url.startsWith(`mailto:${PROVIDER.email}?subject=`)).toBe(true);
    const subject = decodeURIComponent(/subject=([^&]*)/.exec(url)![1]);
    expect(subject).toBe('Politikometer – Fehler melden: Abgeordnetenprofil – Friedrich Merz (ID 118559)');
    expect(decodeURIComponent(url)).toContain('keine Gerätedaten');
  });

  it('entfernt Steuerzeichen und kann keine weiteren Kopfzeilen einschleusen', () => {
    const url = buildReportMailto({ page: 'gesetz', id: '1&cc=x@y.de', name: 'Titel\r\nBcc: a@b.de' })!;
    expect(url.match(/&/g)).toHaveLength(1); // nur zwischen subject und body
    expect(reportSubject({ page: 'gesetz', id: '1', name: 'A\nB' })).not.toMatch(/\n/);
  });

  it('lehnt ungültige Empfängeradressen ab', () => {
    expect(buildReportMailto({ page: 'allgemein' }, 'javascript:alert(1)')).toBeNull();
    expect(buildReportMailto({ page: 'allgemein' }, 'a@b.de?bcc=c@d.de')).toBeNull();
  });
});

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial) data.set(FAVORITES_STORAGE_KEY, initial);
  return {
    data,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: async (k: string) => {
      data.delete(k);
    },
  };
}

describe('Gespeicherte Daten löschen', () => {
  const merz = { type: 'politician' as const, id: '118559', title: 'Friedrich Merz', subtitle: 'CDU' };

  it('löscht die ganze Merkliste, auch wenn sie von einer neueren Version stammt', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 99, items: [] }));
    const store = createFavoritesStore(storage);
    await store.load();
    expect(store.getSnapshot().problem).toBe('unsupportedVersion');
    await store.clear();
    expect(storage.data.has(FAVORITES_STORAGE_KEY)).toBe(false);
    expect(store.getSnapshot()).toEqual({ loaded: true, items: [], problem: null });
    // danach wieder normal nutzbar
    expect(await store.add(merz)).toBe(true);
  });

  it('wartet laufende Schreibvorgänge ab, damit sie die Liste nicht wiederherstellen', async () => {
    const storage = memoryStorage(serializeFavorites([]));
    const store = createFavoritesStore(storage);
    const adding = store.add(merz);
    await store.clear();
    await adding;
    expect(storage.data.has(FAVORITES_STORAGE_KEY)).toBe(false);
    expect(store.getSnapshot().items).toEqual([]);
  });

  it('löscht die PLZ', async () => {
    const removeItem = jest.fn(async () => undefined);
    await clearLastPlz({ removeItem });
    expect(removeItem).toHaveBeenCalledWith(LAST_PLZ_STORAGE_KEY);
  });

  it('löscht PLZ, Merkliste und Cache und meldet Teilfehler', async () => {
    const calls: string[] = [];
    const ok = await clearAllLocalData({
      clearLastPlz: async () => void calls.push('plz'),
      clearFavorites: async () => void calls.push('favorites'),
      clearQueryCache: () => void calls.push('memory'),
      removePersistedCache: async () => void calls.push('persisted'),
    });
    expect(ok.failed).toEqual([]);
    expect(calls).toEqual(['plz', 'favorites', 'memory', 'persisted']);

    const partial = await clearAllLocalData({
      clearLastPlz: async () => undefined,
      clearFavorites: async () => {
        throw new Error('Speicher');
      },
      clearQueryCache: () => undefined,
      removePersistedCache: async () => undefined,
    });
    expect(partial.failed).toEqual(['favorites']);
  });
});

describe('Open-Source-Lizenzen', () => {
  const pkg: { devDependencies: Record<string, string> } = require('../package.json');

  it('enthält die ausgelieferten Abhängigkeiten mit Lizenz und Text', () => {
    const names = new Set(licenseData.packages.map((p) => p.name));
    for (const dep of ['react', 'react-native', 'expo', 'zod', '@tanstack/react-query', 'expo-router']) {
      expect(names.has(dep)).toBe(true);
    }
    for (const p of licenseData.packages) {
      expect(p.license).not.toBe('UNKNOWN');
      expect(p.text === null || p.text in licenseData.texts).toBe(true);
    }
    expect(licenseData.nativeComponents.map((c) => c.name).join(' ')).toMatch(/Hermes.*OkHttp.*AndroidX/);
  });

  it('enthält keine reinen Entwicklungswerkzeuge', () => {
    const names = new Set(licenseData.packages.map((p) => p.name));
    for (const dev of Object.keys(pkg.devDependencies)) expect(names.has(dev)).toBe(false);
  });

  it('speichert gleiche Lizenztexte nur einmal und bleibt klein', () => {
    const texts = Object.values(licenseData.texts);
    expect(new Set(texts).size).toBe(texts.length);
    expect(JSON.stringify(licenseData).length).toBeLessThan(150 * 1024);
  });

  it('sucht nach Name oder Lizenz und verlinkt SPDX', () => {
    expect(filterPackages(licenseData.packages, 'REACT-NATIVE').some((p) => p.name === 'react-native')).toBe(true);
    expect(filterPackages(licenseData.packages, 'isc').every((p) => p.license.toLowerCase().includes('isc') || p.name.includes('isc'))).toBe(true);
    expect(spdxUrl('BSD-3-Clause')).toBe('https://spdx.org/licenses/BSD-3-Clause.html');
    expect(spdxUrl('(MIT OR Apache-2.0)')).toBe('https://spdx.org/licenses/MIT.html');
  });
});
