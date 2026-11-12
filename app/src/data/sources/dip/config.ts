/**
 * Zugang zur DIP-API des Deutschen Bundestages.
 * Hilfe und Schlüssel: https://dip.bundestag.de/über-dip/hilfe/api
 */

/**
 * Öffentlicher API-Schlüssel aus der DIP-Hilfe („zunächst bis Ende Mai 2027 gültig“,
 * abgerufen am 30.10.2026). Nur Rückfall für Entwicklung und Tests ohne eigenen Schlüssel.
 */
const PUBLIC_DIP_API_KEY = 'R2BZaee.DjdCyihKZMf8AOjtScubP2EVydegzjmBIQ';

/**
 * Der eigene Schlüssel von Lima Projects (erteilt am 12.11.2026, zehn Jahre gültig) steht bewusst
 * nicht im Quelltext. Er kommt beim Bauen über die Umgebungsvariable EXPO_PUBLIC_DIP_API_KEY hinein:
 * lokal aus app/.env.local (nicht im Repo), für Store-Builds aus den EAS-Umgebungsvariablen.
 */
export const DIP_API_KEY = process.env.EXPO_PUBLIC_DIP_API_KEY?.trim() || PUBLIC_DIP_API_KEY;

export const DIP_API_URL = 'https://search.dip.bundestag.de/api/v1';
export const DIP_PORTAL_URL = 'https://dip.bundestag.de';

/** Pflichtangabe laut DIP-Nutzungsbedingungen. */
export const DIP_PUBLISHER = 'Deutscher Bundestag/Bundesrat – DIP';
export const DIP_LICENSE = 'Nutzung frei gemäß DIP-Nutzungsbedingungen';
export const DIP_TERMS_URL = 'https://dip.bundestag.de/%C3%BCber-dip/nutzungsbedingungen';
