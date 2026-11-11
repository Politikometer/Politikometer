/**
 * Lizenzen der in der App ausgelieferten Open-Source-Bestandteile.
 * Daten: `assets/data/licenses.json`, erzeugt mit `npm run licenses` (tools/licenses/build.mjs).
 */

export type OssPackage = {
  name: string;
  version: string;
  /** SPDX-Ausdruck aus package.json, z. B. „MIT“. */
  license: string;
  copyright: string[];
  /** Schlüssel in `texts`; null, wenn kein Wortlaut vorliegt. */
  text: string | null;
  /** true: Paket ohne eigene Lizenzdatei, Standardwortlaut der Lizenzart. */
  standardText?: boolean;
  url: string | null;
  /** Enthält nativen Code (Android/iOS). */
  native?: boolean;
};

export type NativeComponent = {
  name: string;
  holder: string;
  license: string;
  url: string;
  text: string | null;
};

export type LicenseData = {
  generatedAt: string;
  texts: Record<string, string>;
  packages: OssPackage[];
  nativeComponents: NativeComponent[];
};

export const licenseData: LicenseData = require('../../../../assets/data/licenses.json');

/** Offizieller Lizenztext zum Nachlesen (SPDX), z. B. für BSD-3-Clause ohne mitgelieferten Wortlaut. */
export function spdxUrl(license: string): string | null {
  const id = license.replace(/[()]/g, '').split(/\s+(?:AND|OR|WITH)\s+/)[0]?.trim();
  return id && /^[A-Za-z0-9.+-]+$/.test(id) ? `https://spdx.org/licenses/${id}.html` : null;
}

function normalize(s: string): string {
  return s.toLocaleLowerCase('de');
}

/** Filtert nach Paketname oder Lizenzart; alphabetisch nach Name. */
export function filterPackages(packages: OssPackage[], query: string): OssPackage[] {
  const q = normalize(query.trim());
  const list = q
    ? packages.filter((p) => normalize(p.name).includes(q) || normalize(p.license).includes(q))
    : packages;
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
