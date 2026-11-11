/**
 * Impressum und Datenschutzerklärung als typisierte Inhalte – Grundlage: Entwürfe in
 * `docs/recht/` (rechtspruefer 31.10.2026, Korrekturen nach anwaltlicher Prüfung 05.11.2026).
 * Beide Fassungen werden gleich gehalten. Bearbeitungshinweise der Entwürfe sind nicht
 * übernommen. Angaben zum Anbieter kommen aus `config/provider.ts`; fehlt eine Angabe, steht an
 * ihrer Stelle ein gut sichtbarer Platzhalter „[noch offen: …]“.
 *
 * Solange Pflichtangaben fehlen (`isLegalDraft`), sind beide Texte ENTWURF und müssen vor der
 * Veröffentlichung vervollständigt und anwaltlich geprüft werden.
 */
import {
  isLegalDraft,
  PRIVACY_POLICY_URL,
  PROVIDER,
  SOURCE_CODE_URL,
  type ProviderAddress,
  type SupervisoryAuthority,
} from '@/config/provider';
import { AW_MODERATION_CODEX_URL, AW_PRIVACY_URL } from '@/data/sources/abgeordnetenwatch/links';
import { DIP_TERMS_URL } from '@/data/sources/dip/config';
import { USER_AGENT } from '@/data/http/user-agent';

/** Teil eines Absatzes: Text oder fehlende Angabe. */
export type LegalSegment = string | { missing: string };
export type LegalParagraph = LegalSegment[];

export type LegalLink = { url: string; label: string };

export type LegalItem = { term: string; text: LegalParagraph; links?: LegalLink[] };

export type LegalSection = {
  heading: string;
  paragraphs?: LegalParagraph[];
  bullets?: LegalParagraph[];
  items?: LegalItem[];
  links?: LegalLink[];
};

export type LegalDocument = {
  title: string;
  /** true, solange Pflichtangaben fehlen – der Screen zeigt dann einen deutlichen Entwurfshinweis. */
  draft: boolean;
  /** Zeile unter dem Titel (Stand, Geltungsbereich). */
  intro?: LegalParagraph;
  sections: LegalSection[];
};

export type ProviderInfo = {
  name: string;
  /** Vollständiger bürgerlicher Name des Inhabers. */
  legalName: string;
  /** false → Platzhalter „vollständiger amtlicher Name bestätigen“ hinter dem Namen. */
  legalNameConfirmed: boolean;
  email: string;
  phone: string | null;
  address: ProviderAddress | null;
  emailHost: string | null;
  supervisoryAuthority: SupervisoryAuthority | null;
};

export type LegalOptions = {
  provider?: ProviderInfo;
  sourceCodeUrl?: string | null;
  privacyPolicyUrl?: string | null;
  appVersion?: string | null;
  /** Datum, ab dem der Text gilt (z. B. „1. Dezember 2026“); fehlt bis zur Veröffentlichung. */
  validFrom?: string | null;
};

/** Platzhalter als Text, z. B. für Screenreader und Tests. */
export function missingText(label: string): string {
  return `[noch offen: ${label}]`;
}

/** Absatz als reiner Text (Platzhalter ausgeschrieben). */
export function paragraphText(p: LegalParagraph): string {
  return p.map((s) => (typeof s === 'string' ? s : missingText(s.missing))).join('');
}

/** Alle fehlenden Angaben eines Dokuments (ohne Wiederholungen). */
export function missingLabels(doc: LegalDocument): string[] {
  const out = new Set<string>();
  const visit = (p: LegalParagraph | undefined) =>
    p?.forEach((s) => {
      if (typeof s !== 'string') out.add(s.missing);
    });
  visit(doc.intro);
  for (const s of doc.sections) {
    s.paragraphs?.forEach(visit);
    s.bullets?.forEach(visit);
    s.items?.forEach((i) => visit(i.text));
  }
  return [...out];
}

const MISSING_ADDRESS = 'Anschrift (Straße, Hausnummer, PLZ, Ort)';
export const MISSING_LEGAL_NAME = 'vollständiger amtlicher Name bestätigen';

function addressLines(address: ProviderAddress | null): LegalParagraph[] {
  if (!address) return [[{ missing: MISSING_ADDRESS }]];
  return [[address.street], [`${address.postalCode} ${address.city}`], [address.country]];
}

/** Anschrift in einer Zeile: „Straße 1, 12345 Ort, Deutschland“. */
function addressInline(address: ProviderAddress | null): LegalSegment {
  if (!address) return { missing: MISSING_ADDRESS };
  return `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`;
}

/** Name des Inhabers; solange nicht bestätigt, mit sichtbarem Platzhalter dahinter. */
function legalNameSegments(provider: ProviderInfo): LegalSegment[] {
  return provider.legalNameConfirmed ? [provider.legalName] : [provider.legalName, ' ', { missing: MISSING_LEGAL_NAME }];
}

/** Entwurf, solange die Anschrift fehlt oder sonst eine Angabe offen ist. */
function markDraft(draftByProvider: boolean, doc: Omit<LegalDocument, 'draft'>): LegalDocument {
  const full: LegalDocument = { ...doc, draft: false };
  return { ...full, draft: draftByProvider || missingLabels(full).length > 0 };
}

function resolve(opts: LegalOptions) {
  const provider = opts.provider ?? PROVIDER;
  return {
    provider,
    sourceCodeUrl: opts.sourceCodeUrl === undefined ? SOURCE_CODE_URL : opts.sourceCodeUrl,
    privacyPolicyUrl: opts.privacyPolicyUrl === undefined ? PRIVACY_POLICY_URL : opts.privacyPolicyUrl,
    appVersion: opts.appVersion ?? null,
    validFrom: opts.validFrom ?? null,
    draft: isLegalDraft(provider),
  };
}

/** Impressum (§ 5 DDG, § 18 Abs. 2 MStV) – Entwurf vom 31.10.2026, korrigiert 05.11.2026. */
export function buildImprint(opts: LegalOptions = {}): LegalDocument {
  const { provider, draft } = resolve(opts);
  const address = addressLines(provider.address);
  return markDraft(draft, {
    title: 'Impressum',
    sections: [
      {
        heading: 'Angaben gemäß § 5 DDG',
        paragraphs: [[provider.name], ['Inhaber: ', ...legalNameSegments(provider)], ...address],
      },
      {
        heading: 'Kontakt',
        // Ohne Telefonnummer entfällt die Zeile (Entscheidung des Nutzers vom 11.11.2026).
        paragraphs: [[`E-Mail: ${provider.email}`], ...(provider.phone ? [[`Telefon: ${provider.phone}`]] : [])],
      },
      {
        heading: 'Verantwortlich nach § 18 Abs. 2 MStV',
        paragraphs: [[...legalNameSegments(provider), ', ', addressInline(provider.address)]],
      },
      {
        heading: 'Hinweis zu den Daten',
        paragraphs: [
          [
            'Politikometer zeigt Angaben aus öffentlichen Quellen (abgeordnetenwatch.de, Deutscher ' +
              'Bundestag/Bundesrat – DIP, Wikidata, Die Bundeswahlleiterin, OpenStreetMap). Quelle, ' +
              'Lizenz und Abrufzeitpunkt stehen bei jeder Angabe. Für die Richtigkeit der Daten der ' +
              `Quellen übernehmen wir keine Gewähr. Hinweise auf Fehler bitte an ${provider.email}.`,
          ],
        ],
      },
      {
        heading: 'Verbraucherstreitbeilegung',
        paragraphs: [
          [
            'Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer ' +
              'Verbraucherschlichtungsstelle teilzunehmen.',
          ],
        ],
      },
    ],
  });
}

/**
 * Datenschutzerklärung – Entwurf vom 31.10.2026, korrigiert nach anwaltlicher Prüfung 05.11.2026.
 * Stand der App: `allowBackup: false`, Berechtigungen nur INTERNET und ACCESS_NETWORK_STATE,
 * Bundesregierung aus mitgelieferter Datei (keine Anfragen an Wikidata).
 */
export function buildPrivacyPolicy(opts: LegalOptions = {}): LegalDocument {
  const { provider, sourceCodeUrl, privacyPolicyUrl, appVersion, validFrom, draft } = resolve(opts);
  const address = addressLines(provider.address);

  return markDraft(draft, {
    title: 'Datenschutzerklärung',
    intro: [
      'Stand: ',
      validFrom ?? { missing: 'Datum' },
      ' · gilt für Politikometer',
      appVersion ? ` ab Version ${appVersion}` : '',
      ' für Android und iOS',
    ],
    sections: [
      {
        heading: 'Kurz gesagt',
        bullets: [
          ['Du brauchst kein Nutzerkonto. Wir haben keinen eigenen Server.'],
          ['Wir verwenden kein Tracking, keine Analyse-Werkzeuge und keine Werbung. Die App selbst sendet keine Absturzberichte.'],
          ['Deine Postleitzahl und deine Merkliste bleiben auf deinem Gerät. Wir bekommen sie nie zu sehen.'],
          [
            'Um Daten über Politikerinnen und Politiker anzuzeigen, fragt die App direkt bei öffentlichen ' +
              'Datenquellen an (abgeordnetenwatch.de, Deutscher Bundestag). Dabei erhalten diese ' +
              'Stellen – wie bei jedem Webseitenaufruf – die IP-Adresse deines Geräts. Wir selbst erhalten ' +
              'diese Daten nicht. Die Angaben zur Bundesregierung aus Wikidata sind in der App enthalten; ' +
              'dafür fragt die App nicht bei Wikidata an.',
          ],
        ],
      },
      {
        heading: '1. Wer ist verantwortlich?',
        paragraphs: [
          [provider.name],
          ['Inhaber: ', ...legalNameSegments(provider)],
          ...address,
          [`E-Mail: ${provider.email}`],
          ['Wir sind nicht verpflichtet, eine Datenschutzbeauftragte oder einen Datenschutzbeauftragten zu benennen.'],
        ],
      },
      {
        heading: '2.1 Daten, die nur auf deinem Gerät gespeichert werden',
        paragraphs: [
          [
            'Diese Daten speichert die App im App-Speicher deines Geräts. Sie werden nicht an uns und ' +
              'nicht an Dritte übertragen.',
          ],
        ],
        items: [
          {
            term: 'Zuletzt gesuchte Postleitzahl',
            text: [
              'Damit du sie beim nächsten Öffnen mit einem Tipp wieder aufrufen kannst. Gespeichert, bis ' +
                'du eine andere PLZ suchst, die gespeicherten Daten löschst oder die App deinstallierst.',
            ],
          },
          {
            term: 'Merkliste („Gemerkt“)',
            text: [
              'Art des Eintrags, Kennung der Quelle, Name, eine Zusatzzeile (z. B. Partei und Amt) und ' +
                'Zeitpunkt des Merkens – damit du Abgeordnete, Regierungsmitglieder und Gesetze ' +
                'wiederfindest. Gespeichert, bis du den Eintrag entfernst, die gespeicherten Daten löschst ' +
                'oder die App deinstallierst.',
            ],
          },
          {
            term: 'Zwischenspeicher der abgerufenen öffentlichen Daten',
            text: [
              'Zum Beispiel Abgeordnetenlisten und Abstimmungen – damit Inhalte schneller laden und auch ' +
                'ohne Internet sichtbar bleiben. Höchstens 7 Tage, danach automatisch verworfen.',
            ],
          },
        ],
      },
      {
        heading: 'Postleitzahl, Merkliste und Datensicherung',
        paragraphs: [
          [
            'Die PLZ wird auf dem Gerät einem Bundestagswahlkreis zugeordnet. Die PLZ selbst verlässt ' +
              'das Gerät nicht.',
          ],
          [
            'Bitte beachte: Deine Merkliste kann erkennen lassen, für welche Politikerinnen, Politiker ' +
              'oder Gesetze du dich interessierst. Sie liegt nur auf deinem Gerät. Wer Zugriff auf dein ' +
              'entsperrtes Gerät hat, kann sie sehen.',
          ],
          [
            'Rechtsgrundlage: Das Speichern auf deinem Gerät ist nötig, damit die von dir genutzten ' +
              'Funktionen (Merkliste, zuletzt gesuchte PLZ, Anzeige ohne Internet) funktionieren ' +
              '(§ 25 Abs. 2 Nr. 2 TDDDG). Wir selbst erheben diese Daten nicht.',
          ],
          [
            'Datensicherung: Auf Android ist die automatische Datensicherung der App abgeschaltet. Auf dem ' +
              'iPhone können die genannten Daten Teil deiner iCloud-Sicherung oder der Sicherung über den ' +
              'Computer werden, wenn du sie eingeschaltet hast. Dafür gelten die Bedingungen von Apple. Wir ' +
              'haben darauf keinen Zugriff.',
          ],
          [
            'Löschen: Einträge der Merkliste entfernst du mit „Gemerkt“ antippen. Alle gespeicherten Daten ' +
              '(PLZ, Merkliste, Zwischenspeicher) löschst du in der App unter „Über & Quellen“ → ' +
              '„Gespeicherte Daten löschen“ oder über die Einstellungen deines Geräts („Speicher löschen“ ' +
              'bzw. App löschen).',
          ],
        ],
      },
      {
        heading: '2.2 Abruf öffentlicher Daten bei Datenquellen',
        paragraphs: [
          ['Die App hat keinen eigenen Server. Sie ruft die angezeigten Informationen direkt bei diesen Stellen ab:'],
        ],
        items: [
          {
            term: 'abgeordnetenwatch.de (Schnittstelle API v2)',
            text: [
              'Abgeordnete, Mandate, Kandidaturen, Abstimmungen, Zahl der Bürgerfragen. Verantwortlich dort: ' +
                'Parlamentwatch e. V., Nernstweg 32–34, 22765 Hamburg.',
            ],
            links: [{ url: AW_PRIVACY_URL, label: 'Datenschutzerklärung von abgeordnetenwatch.de' }],
          },
          {
            term: 'DIP – Dokumentations- und Informationssystem für Parlamentsmaterialien (search.dip.bundestag.de)',
            text: [
              'Gesetzgebungsvorgänge, Drucksachen, Plenarprotokolle, Reden und andere Aktivitäten. ' +
                'Verantwortlich dort: Deutscher Bundestag (gemeinsames System von Bundestag und Bundesrat).',
            ],
            links: [
              { url: 'https://www.bundestag.de/datenschutz', label: 'Datenschutz beim Deutschen Bundestag' },
              { url: DIP_TERMS_URL, label: 'DIP-Nutzungsbedingungen' },
            ],
          },
        ],
      },
      {
        heading: 'Welche Daten dabei übertragen werden',
        bullets: [
          ['die IP-Adresse deines Geräts (technisch nötig, damit die Antwort bei dir ankommt),'],
          ['Datum und Uhrzeit der Anfrage,'],
          [
            'die abgefragte Adresse – sie enthält, wonach gefragt wird, z. B. die Nummer des ' +
              'Bundestagswahlkreises, die Kennung einer Abgeordneten oder eines Gesetzes. Aus der Nummer ' +
              'des Wahlkreises lässt sich grob ableiten, für welche Region du dich interessierst,',
          ],
          [
            `eine Kennung der App („${USER_AGENT}“). Sie enthält keine Angaben über dich, sondern nur über ` +
              'die App und wie man uns erreicht.',
          ],
        ],
        paragraphs: [
          ['Es werden keine Werbe-ID, Gerätekennung, Standortdaten, Namen oder Kontaktdaten von dir übertragen.'],
          [
            'Was die Datenquellen damit tun: Nach eigenen Angaben speichern die Stellen Zugriffsdaten ' +
              'zeitlich begrenzt für Betrieb und Sicherheit, z. B. abgeordnetenwatch.de Server-Logs 14 Tage, ' +
              'der Bundestag für seine Webseiten 60 Tage. Einzelheiten stehen in den verlinkten ' +
              'Datenschutzerklärungen.',
          ],
          [
            'Wir selbst erhalten bei diesen Abrufen keine Daten. Wir sehen nicht, wer die App nutzt oder ' +
              'was angezeigt wird.',
          ],
          [
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist, dir die von dir ' +
              'aufgerufenen öffentlichen Informationen anzuzeigen; ohne die Übertragung der IP-Adresse ist ' +
              'das technisch nicht möglich. Wir haben die App so gebaut, dass so wenig wie möglich ' +
              'übertragen wird (keine PLZ, keine Kennungen deines Geräts, Zwischenspeicher, gedrosselte Anfragen).',
          ],
          [
            'Netzwerkstatus: Die App fragt beim Betriebssystem ab, ob eine Internetverbindung besteht, ' +
              'damit sie ohne Netz keine Anfragen stellt und danach automatisch aktualisiert. Diese Angabe ' +
              'bleibt auf dem Gerät.',
          ],
        ],
      },
      {
        heading: 'Angaben aus Wikidata',
        paragraphs: [
          [
            'Wer der Bundesregierung angehört (Bundeskanzlerin oder Bundeskanzler, Ministerinnen und Minister), seit wann und ' +
              'mit welcher Partei, stammt aus Wikidata (Lizenz CC0). Diese Angaben sind als Datei in der App ' +
              'enthalten und werden mit Updates der App aktualisiert. Die App stellt dafür keine Anfragen an ' +
              'Wikidata; es werden dabei keine Daten von dir übertragen. Erst wenn du selbst auf einen Link ' +
              'wie „Eintrag bei Wikidata ansehen“ tippst, öffnet sich die Seite im Browser (siehe 2.3).',
          ],
        ],
      },
      {
        heading: '2.3 Links und Browser',
        paragraphs: [
          [
            'Wenn du auf einen Link tippst (z. B. „Original ansehen“, Drucksachen, Erklärseiten), öffnet ' +
              'sich die Seite in einem Browserfenster innerhalb der App. Dabei handelt es sich um den Browser ' +
              'deines Geräts (Android: Chrome Custom Tabs bzw. dein Standardbrowser; iPhone: Safari). Er kann ' +
              'Cookies und Einstellungen mit diesem Browser teilen. Die App selbst kann nicht sehen, was du ' +
              'dort tust.',
          ],
          [
            'Für die aufgerufenen Webseiten sind deren Betreiber verantwortlich. Manche dieser Seiten messen ' +
              'Besuche statistisch, z. B. abgeordnetenwatch.de und der Deutsche Bundestag mit dem Werkzeug ' +
              'Matomo. Einzelheiten stehen in den Datenschutzerklärungen der jeweiligen Seiten.',
          ],
          [
            'Häufig verlinkte Seiten: abgeordnetenwatch.de, dip.bundestag.de, bundestag.de, bundesrat.de, ' +
              'bundesregierung.de, bundeswahlleiterin.de, bundesverfassungsgericht.de, ' +
              'gesetze-im-internet.de, wikidata.org, openstreetmap.org.',
          ],
        ],
      },
      {
        heading: '2.4 „Frage stellen“ bei abgeordnetenwatch.de',
        paragraphs: [
          [
            'Die App bietet selbst kein Formular für Fragen an Abgeordnete. Der Knopf „Frage stellen bei ' +
              'abgeordnetenwatch.de“ öffnet die Profilseite bei abgeordnetenwatch.de im Browser. Was du dort ' +
              'eingibst (nach Angaben von abgeordnetenwatch.de: Vor- und Nachname, Wohnort, E-Mail-Adresse ' +
              'und deine Frage), verarbeitet allein Parlamentwatch e. V. Name und Wohnort werden mit der Frage ' +
              'an die Abgeordnete oder den Abgeordneten weitergegeben; Vorname, erster Buchstabe des ' +
              'Nachnamens und die Frage werden veröffentlicht. Wir erhalten davon nichts.',
          ],
        ],
        links: [
          { url: AW_PRIVACY_URL, label: 'Datenschutzerklärung von abgeordnetenwatch.de' },
          { url: AW_MODERATION_CODEX_URL, label: 'Moderations-Codex von abgeordnetenwatch.de' },
        ],
      },
      {
        heading: '2.5 Teilen',
        paragraphs: [
          [
            'Mit „Teilen“ öffnet die App das Teilen-Menü deines Geräts. Geteilt wird nur Text: Titel, eine ' +
              'Zusatzzeile und der Link zur Originalquelle (ohne Tracking-Zusätze). Du entscheidest, mit ' +
              'welcher App und mit wem du teilst; dort gelten deren Bedingungen. Wir erhalten davon nichts.',
          ],
        ],
      },
      {
        heading: '2.6 Kontakt per E-Mail',
        paragraphs: [
          [
            'Wenn du uns eine E-Mail schreibst – auch über „Fehler melden“ –, verarbeiten wir deine ' +
              'E-Mail-Adresse und den Inhalt, um dir zu antworten (Art. 6 Abs. 1 lit. f DSGVO; bei Fragen zu ' +
              'einem Vertrag lit. b). „Fehler melden“ öffnet nur dein E-Mail-Programm mit vorausgefülltem ' +
              'Betreff; die App sendet selbst nichts und fügt keine Gerätedaten hinzu. Wir löschen die ' +
              'Nachricht, wenn sie erledigt ist und keine gesetzlichen Aufbewahrungspflichten bestehen. ' +
              'Unser E-Mail-Postfach wird betrieben von: ',
            provider.emailHost ?? { missing: 'E-Mail-Anbieter' },
            '.',
          ],
        ],
      },
      {
        heading: '2.7 App-Stores',
        paragraphs: [
          [
            'Wenn du die App über Google Play oder den App Store von Apple lädst, verarbeiten Google bzw. ' +
              'Apple Daten (z. B. dein Konto, Gerät, Zeitpunkt des Downloads) in eigener Verantwortung. Wir ' +
              'erhalten von den Stores nur zusammengefasste Zahlen ohne Personenbezug (z. B. Anzahl der ' +
              'Installationen).',
          ],
          [
            'Die App selbst sendet keine Absturzberichte. Google Play bzw. Apple stellen Entwicklern ' +
              'gegebenenfalls zusammengefasste, anonyme Absturz- und Nutzungsstatistiken ihrer Plattform ' +
              'bereit, sofern du dem in den Einstellungen deines Geräts zugestimmt hast. Diese Statistiken ' +
              'erheben Google bzw. Apple in eigener Verantwortung; wir können daraus keine einzelnen Personen ' +
              'erkennen.',
          ],
        ],
      },
      {
        heading: '3. Was wir nicht tun',
        bullets: [
          ['Kein Nutzerkonto, keine Anmeldung.'],
          ['Keine Analyse- oder Tracking-Werkzeuge, keine Werbung, keine Werbe-ID.'],
          [
            'Die App selbst sendet keine Absturz- oder Fehlerberichte – weder an uns noch an Dritte (zu den ' +
              'Statistiken der App-Stores siehe 2.7).',
          ],
          [
            'Kein Zugriff auf Standort, Kontakte, Kamera, Mikrofon, Fotos oder Dateien. Die App benötigt nur ' +
              'zwei Berechtigungen: den Zugang zum Internet (INTERNET) und die Abfrage des Netzwerkstatus ' +
              '(ACCESS_NETWORK_STATE).',
          ],
          ['Keine Bewertung oder Profilbildung, keine automatisierten Entscheidungen.'],
          ['Keine Weitergabe oder kein Verkauf von Daten.'],
        ],
      },
      {
        heading: '4. Deine Rechte',
        paragraphs: [
          [
            'Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), ' +
              'Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen ' +
              `Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Schreib uns dazu an ${provider.email}.`,
          ],
          [
            'Bitte beachte: Da wir keine Daten über dich auf einem Server speichern, haben wir in der Regel ' +
              'nichts, worüber wir Auskunft geben oder was wir löschen könnten. Die Daten auf deinem Gerät ' +
              'kannst du jederzeit selbst löschen (siehe 2.1). Für die Daten bei den Datenquellen wende dich ' +
              'bitte direkt an diese Stellen (Links in 2.2).',
          ],
          [
            'Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), z. B. bei der ' +
              'Behörde deines Wohnorts oder der für uns zuständigen Behörde: ',
            provider.supervisoryAuthority
              ? `${provider.supervisoryAuthority.name}, ${provider.supervisoryAuthority.url}`
              : { missing: 'Aufsichtsbehörde (Bundesland der Geschäftsadresse)' },
            '.',
          ],
        ],
        links: provider.supervisoryAuthority
          ? [{ url: provider.supervisoryAuthority.url, label: provider.supervisoryAuthority.name }]
          : undefined,
      },
      {
        heading: '5. Daten über Politikerinnen und Politiker',
        paragraphs: [
          [
            'Dieser Abschnitt dient der Information der betroffenen Politikerinnen und Politiker nach ' +
              'Art. 14 DSGVO (Daten, die nicht bei ihnen selbst erhoben werden).',
          ],
          [
            'Die App zeigt öffentliche Angaben über Mandatsträgerinnen und Mandatsträger sowie Mitglieder ' +
              'der Bundesregierung (z. B. Name, Partei, Fraktion, Mandat, Amt, Abstimmungsverhalten, Reden). ' +
              'Diese Angaben stammen aus den genannten öffentlichen Quellen (abgeordnetenwatch.de, DIP von ' +
              'Bundestag und Bundesrat, Wikidata) und werden auf dem Gerät der Nutzenden angezeigt; wir ' +
              'speichern sie nicht auf einem eigenen Server. Wir bewerten nicht.',
          ],
          [
            'Parteizugehörigkeit und Abstimmungsverhalten sind politische Meinungen und damit besondere ' +
              'Kategorien personenbezogener Daten (Art. 9 Abs. 1 DSGVO). Die betroffenen Personen haben diese ' +
              'Daten offensichtlich öffentlich gemacht – etwa durch Kandidatur und Mandat für eine Partei, ' +
              'Mitgliedschaft in einer Fraktion und namentliche Abstimmungen im Parlament (Art. 9 Abs. 2 lit. e ' +
              'DSGVO). Rechtsgrundlage der Darstellung ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes ' +
              'Interesse ist es, die öffentliche Tätigkeit im Mandat nachvollziehbar zu machen.',
          ],
          [
            'Wenn du als betroffene Person eine Angabe für falsch hältst, schreib uns an ' +
              `${provider.email} (oder tippe auf „Fehler in diesen Angaben melden“). Wir prüfen die ` +
              'Darstellung in der App; Berichtigungen der Daten selbst nimmt die jeweilige Quelle vor. Deine ' +
              'Rechte nach Abschnitt 4 gelten auch für dich.',
          ],
        ],
      },
      {
        heading: '6. Quellcode',
        paragraphs: [
          sourceCodeUrl
            ? [`Der Quellcode der App ist offen (MIT-Lizenz): ${sourceCodeUrl}. Jede und jeder kann nachprüfen, was die App tut.`]
            : [
                'Der Quellcode der App ist offen (MIT-Lizenz). Er wird mit der Veröffentlichung der App ' +
                  'bereitgestellt; dann kann jede und jeder nachprüfen, was die App tut.',
              ],
        ],
        links: sourceCodeUrl ? [{ url: sourceCodeUrl, label: 'Quellcode ansehen' }] : undefined,
      },
      {
        heading: '7. Änderungen',
        paragraphs: [
          [
            'Wenn sich die App ändert (z. B. neue Datenquellen), passen wir diese Erklärung an. Die jeweils ' +
              'aktuelle Fassung steht in der App unter „Über & Quellen“ und unter ',
            privacyPolicyUrl ?? { missing: 'Webadresse der Datenschutzerklärung' },
            '.',
          ],
        ],
      },
    ],
  });
}
