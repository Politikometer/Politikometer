import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * `createTask: false`: Auf Android öffnet der Link in derselben Task wie die App,
 * damit „Zurück“ wieder in die App führt.
 */
export const BROWSER_OPTIONS: WebBrowser.WebBrowserOpenOptions = { createTask: false };

/**
 * Nur verschlüsselte Webadressen werden geöffnet. Links stammen teils aus
 * Antworten externer Schnittstellen; andere Schemata (z. B. `intent:`, `tel:`,
 * `javascript:`) könnten sonst andere Apps auslösen.
 */
export function isSafeUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Öffnet einen Link im In-App-Browser, ersatzweise im Systembrowser. */
export async function openLink(url: string): Promise<void> {
  if (!isSafeUrl(url)) return;
  try {
    await WebBrowser.openBrowserAsync(url, BROWSER_OPTIONS);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      // bewusst still: Ein nicht zu öffnender Link soll die App nicht stören.
    }
  }
}
