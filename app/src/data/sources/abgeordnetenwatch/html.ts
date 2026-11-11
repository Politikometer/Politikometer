/**
 * Einfache Umwandlung der HTML-Beschreibungen von abgeordnetenwatch in reinen Text.
 * Kein HTML-Rendering in der App: sicherer und für Screenreader besser.
 */
import type { DocumentLink } from '@/domain/model';

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(nbsp|amp|quot|#039|apos|lt|gt);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (m, n) => {
      // Ungültige Angaben (zu groß, Steuerzeichen) unverändert lassen statt mit einem Fehler abzubrechen.
      const code = Number(n);
      const valid = code >= 0x20 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return valid ? String.fromCodePoint(code) : m;
    });
}

export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

/** Hosts mit offiziellen Parlamentsdokumenten. */
const OFFICIAL_HOSTS = ['dserver.bundestag.de', 'dip.bundestag.de', 'www.bundestag.de', 'bundestag.de'];

/** Links auf offizielle Dokumente (Drucksachen, Protokolle) aus der Beschreibung. */
export function extractOfficialLinks(html: string | null | undefined): DocumentLink[] {
  if (!html) return [];
  const links: DocumentLink[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const url = decodeEntities(m[1]);
    let host: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') continue; // nur verschlüsselte Adressen
      host = parsed.host;
    } catch {
      continue;
    }
    if (!OFFICIAL_HOSTS.includes(host) || seen.has(url)) continue;
    seen.add(url);
    links.push({ label: htmlToText(m[2]) || url, url });
  }
  return links;
}
