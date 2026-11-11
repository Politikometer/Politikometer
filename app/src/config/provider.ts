/**
 * Angaben zum Anbieter der App – EINE Stelle für Impressum, Datenschutz, „Fehler melden“
 * und die Kennung bei Anfragen (User-Agent). Fehlende Angaben sind `null`; die Screens zeigen
 * dann gut sichtbar „[noch offen: …]“ und kennzeichnen Impressum/Datenschutz als Entwurf.
 */

export type ProviderAddress = {
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export type SupervisoryAuthority = { name: string; url: string };

export const PROVIDER = {
  /** Name des Einzelunternehmens (Entscheidung des Nutzers, 27.10.2026). */
  name: 'Lima Projects',
  /**
   * Vollständiger bürgerlicher Name des Inhabers wie in Ausweis bzw. Gewerbeanmeldung – Pflicht im
   * Impressum eines Einzelunternehmens (§ 5 DDG) und für § 18 Abs. 2 MStV.
   */
  legalName: 'Luiz Augusto de Oliveira Lima',
  /**
   * Vom Nutzer am 11.11.2026 als vollständiger Name angegeben. Bei false stünde im Impressum der
   * Platzhalter „[noch offen: vollständiger amtlicher Name bestätigen]“.
   */
  legalNameConfirmed: true as boolean,
  /**
   * Kontakt-E-Mail des Projekts (vom Nutzer angelegt 05.11.2026). Impressum, Datenschutz,
   * „Fehler melden“ und die Kennung (User-Agent) übernehmen sie automatisch.
   * Hinweis Anwalt: Für geschäftliche Zwecke ein Anbieter mit Auftragsverarbeitungsvertrag (AVV);
   * ein kostenloses Gmail-Konto bietet keinen AVV – siehe PROTOKOLL 05.11.2026.
   */
  email: 'politikometer@gmail.com',
  /**
   * Telefon im Impressum: Entscheidung des Nutzers vom 11.11.2026 – KEINE Telefonnummer. Bei null
   * entfällt die Zeile. Hinweis: Neben der E-Mail verlangt § 5 DDG einen zweiten schnellen Kontaktweg;
   * ohne Telefon bleibt ein Abmahnrisiko (siehe ROADMAP, Frage an den Anwalt).
   */
  phone: null as string | null,
  /**
   * Ladungsfähige Anschrift (kein Postfach). Wohnadresse mit eigenem Briefkasten für Lima Projects –
   * bewusste Entscheidung des Nutzers vom 05.11.2026 (wird im Impressum und bei Apple öffentlich).
   */
  address: {
    street: 'Am Mühlenberg 25',
    postalCode: '51465',
    city: 'Bergisch Gladbach',
    country: 'Deutschland',
  } as ProviderAddress | null,
  /**
   * Für das Kontakt-Postfach zuständiger E-Mail-Anbieter (Datenschutzerklärung 2.6). Wird mit der
   * geschäftlichen E-Mail (Anbieter in der EU) zusammen mit `email` geändert.
   */
  emailHost: 'Google (Gmail)' as string | null,
  /** Zuständige Datenschutz-Aufsichtsbehörde (Bundesland der Niederlassung: Nordrhein-Westfalen). */
  supervisoryAuthority: {
    name: 'Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)',
    url: 'https://www.ldi.nrw.de',
  } as SupervisoryAuthority | null,
};

/**
 * Öffentliche Adresse des Quellcodes (Repository). Veröffentlicht am 11.11.2026.
 * Wird u. a. für den ODbL-Hinweis gebraucht (wo Tabelle und Erzeugungsskript erhältlich sind).
 */
export const SOURCE_CODE_URL: string | null = 'https://github.com/Politikometer/Politikometer';

/** Öffentliche Adresse der Datenschutzerklärung (Store-Pflicht), GitHub Pages. */
export const PRIVACY_POLICY_URL: string | null = 'https://politikometer.github.io/Politikometer/datenschutz.html';

/** Impressum und Datenschutzerklärung gelten als Entwurf, solange Pflichtangaben fehlen. */
export function isLegalDraft(provider: { address: ProviderAddress | null } = PROVIDER): boolean {
  return provider.address === null;
}
