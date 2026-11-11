/**
 * „Fehler melden“: öffnet das E-Mail-Programm mit vorausgefülltem Betreff an die Kontaktadresse
 * aus `config/provider.ts`. Es wird nichts automatisch gesendet und es werden keine Gerätedaten
 * angehängt.
 *
 * Bewusst getrennt von `openLink` (nur https): Hier wird ausschließlich ein selbst gebautes
 * `mailto:` mit fester Adresse geöffnet – nie eine Adresse aus Daten der Quellen.
 */
import { Alert, Linking } from 'react-native';

import { PROVIDER } from '@/config/provider';

/** Zu welcher Seite die Meldung gehört. */
export type ReportContext =
  | { page: 'allgemein' }
  | { page: 'profil'; id: string | number; name?: string | null }
  | { page: 'regierung'; id: string; name?: string | null }
  | { page: 'gesetz'; id: string; name?: string | null };

const PAGE_LABEL: Record<ReportContext['page'], string> = {
  allgemein: 'Allgemein',
  profil: 'Abgeordnetenprofil',
  regierung: 'Mitglied der Bundesregierung',
  gesetz: 'Gesetzgebungsvorgang',
};

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAX_NAME = 80;

/** Steuerzeichen entfernen, Leerraum zusammenfassen, kürzen. */
function clean(text: string, max: number): string {
  const t = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function reportSubject(ctx: ReportContext): string {
  const parts = [`Politikometer – Fehler melden: ${PAGE_LABEL[ctx.page]}`];
  if (ctx.page !== 'allgemein') {
    const id = clean(String(ctx.id), 40);
    const name = ctx.name ? clean(ctx.name, MAX_NAME) : '';
    parts.push([name, id ? `(ID ${id})` : ''].filter(Boolean).join(' '));
  }
  return parts.filter(Boolean).join(' – ');
}

const BODY =
  'Was ist falsch oder fehlt? Bitte möglichst mit Quelle (Link).\n\n\n' +
  '---\nDiese Nachricht enthält nur, was du selbst hineinschreibst. Die App fügt keine Gerätedaten hinzu.';

/** Baut die mailto-Adresse. null, wenn die hinterlegte Adresse ungültig ist. */
export function buildReportMailto(ctx: ReportContext, email: string = PROVIDER.email): string | null {
  if (!EMAIL_PATTERN.test(email)) return null;
  const query = `subject=${encodeURIComponent(reportSubject(ctx))}&body=${encodeURIComponent(BODY)}`;
  return `mailto:${email}?${query}`;
}

/** Öffnet das E-Mail-Programm; ohne E-Mail-Programm erscheint die Adresse zum Abschreiben. */
export async function openReportMail(ctx: ReportContext): Promise<void> {
  const url = buildReportMailto(ctx);
  const fallback = () =>
    Alert.alert(
      'Kein E-Mail-Programm gefunden',
      `Bitte schreib uns an ${PROVIDER.email}. Betreff: ${reportSubject(ctx)}`,
    );
  if (!url) return fallback();
  try {
    await Linking.openURL(url);
  } catch {
    fallback();
  }
}
