/**
 * Zugang zur DIP-API des Deutschen Bundestages.
 * Hilfe und Schlüssel: https://dip.bundestag.de/über-dip/hilfe/api
 */

/**
 * Öffentlicher API-Schlüssel aus der DIP-Hilfe („zunächst bis Ende Mai 2027 gültig“,
 * abgerufen am 30.10.2026). Er kann bei Missbrauch kurzfristig getauscht werden.
 * Gültig bis Ende 05/2027 – eigener, dauerhafter Schlüssel ist bei
 * parlamentsdokumentation@bundestag.de zu beantragen (vor dem Release), dann hier ersetzen.
 */
export const DIP_API_KEY = 'R2BZaee.DjdCyihKZMf8AOjtScubP2EVydegzjmBIQ';

export const DIP_API_URL = 'https://search.dip.bundestag.de/api/v1';
export const DIP_PORTAL_URL = 'https://dip.bundestag.de';

/** Pflichtangabe laut DIP-Nutzungsbedingungen. */
export const DIP_PUBLISHER = 'Deutscher Bundestag/Bundesrat – DIP';
export const DIP_LICENSE = 'Nutzung frei gemäß DIP-Nutzungsbedingungen';
export const DIP_TERMS_URL = 'https://dip.bundestag.de/%C3%BCber-dip/nutzungsbedingungen';
