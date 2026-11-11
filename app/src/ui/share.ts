/**
 * Teilen über das Teilen-Menü des Geräts (React Native `Share`, kein Zusatzpaket).
 * Geteilt wird nur Text: Titel, optional eine Zusatzzeile und der öffentliche Link zur
 * Originalquelle – ohne Tracking-Parameter und ohne Links in die App.
 */
import { Share } from 'react-native';

import { isSafeUrl } from '@/ui/open-link';

export type ShareContent = {
  title: string;
  /** Öffentliche Original-URL, z. B. abgeordnetenwatch-Profil oder DIP-Vorgang. */
  url: string;
  /** Optionale Zusatzzeile, z. B. Datum oder Partei. */
  subtitle?: string | null;
  /** Herausgeber der Quelle, z. B. „abgeordnetenwatch.de“. */
  publisher?: string | null;
};

/** Parameter, die nur der Reichweitenmessung dienen (utm_, Matomo/Piwik, Klick-IDs). */
const TRACKING_PARAM = /^(utm_|pk_|mtm_|matomo_|piwik_|hsa_)|^(fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src)$/i;

/**
 * Entfernt Tracking-Parameter. Bewusst ohne `URL.searchParams`, weil React Native
 * `URL`/`URLSearchParams` nur teilweise umsetzt. Nur https-Adressen; sonst null.
 */
export function cleanShareUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!isSafeUrl(trimmed)) return null;
  const hashIndex = trimmed.indexOf('#');
  const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const queryIndex = beforeHash.indexOf('?');
  if (queryIndex < 0) return trimmed;
  const base = beforeHash.slice(0, queryIndex);
  const kept = beforeHash
    .slice(queryIndex + 1)
    .split('&')
    .filter((part) => {
      if (!part) return false;
      const rawName = part.split('=')[0];
      let name = rawName;
      try {
        name = decodeURIComponent(rawName);
      } catch {
        // unlesbarer Name: unverändert prüfen
      }
      return !TRACKING_PARAM.test(name);
    });
  return `${base}${kept.length ? `?${kept.join('&')}` : ''}${hash}`;
}

/** Text zum Teilen; null, wenn kein sicherer Link vorhanden ist. */
export function buildShareText(content: ShareContent): string | null {
  const url = cleanShareUrl(content.url);
  const title = content.title.trim();
  if (!url || !title) return null;
  const lines = [title];
  if (content.subtitle?.trim()) lines.push(content.subtitle.trim());
  lines.push('');
  lines.push(content.publisher?.trim() ? `Quelle: ${content.publisher.trim()}` : 'Quelle:');
  lines.push(url);
  return lines.join('\n');
}

export type ShareOutcome = 'shared' | 'dismissed' | 'unavailable';

/**
 * Öffnet das Teilen-Menü. Die URL steckt im Text (Android teilt nur `message`;
 * ein zusätzliches `url` würde auf iOS den Link doppelt einfügen).
 */
export async function shareContent(content: ShareContent): Promise<ShareOutcome> {
  const message = buildShareText(content);
  if (!message) return 'unavailable';
  try {
    const result = await Share.share(
      { message, title: content.title },
      { dialogTitle: 'Teilen', subject: content.title },
    );
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
