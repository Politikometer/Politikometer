/**
 * Öffentliche Seiten von abgeordnetenwatch.de (keine API).
 *
 * Fragen und Antworten liefert die API v2 nicht (geprüft 31.10.2026, Version 2.10.0:
 * keine Entität „question“, `related_data` an Person und Mandat ohne Fragen; nur die
 * Zahlen `statistic_questions` / `statistic_questions_answered`). Deshalb verlinken wir
 * auf die Seite „Fragen & Antworten“ des Profils; dort steht oben „Frage stellen“.
 * Das Formular selbst (`/question-form/<id>`) ist nur als Einblendung erreichbar
 * (direkt aufgerufen HTTP 404) und wird daher nicht direkt verlinkt.
 */

export const AW_PRIVACY_URL = 'https://www.abgeordnetenwatch.de/datenschutzerklaerung';
export const AW_MODERATION_CODEX_URL = 'https://www.abgeordnetenwatch.de/ueber-uns/mehr/moderations-codex';

const PROFILE_URL = /^https:\/\/www\.abgeordnetenwatch\.de\/profile\/[a-z0-9-]+\/?$/i;

/** „…/profile/friedrich-merz“ → „…/profile/friedrich-merz/fragen-antworten“; sonst null. */
export function questionsPageUrl(profileUrl: string | null | undefined): string | null {
  if (!profileUrl) return null;
  const url = profileUrl.trim();
  if (!PROFILE_URL.test(url)) return null;
  return `${url.replace(/\/$/, '')}/fragen-antworten`;
}
