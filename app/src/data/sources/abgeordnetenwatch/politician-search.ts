/**
 * Personensuche bei abgeordnetenwatch.de nach Vor- und Nachname.
 * Eigene Datei, damit der gemeinsam genutzte Client unverändert bleibt.
 * Nutzt denselben Limiter wie der Client (20 Anfragen/Minute).
 */
import { fetchJson, type FetchJsonOptions } from '@/data/http/fetch-json';

import { awLimiter, BASE_URL } from './client';
import { listResponse, politicianSchema, type AwPolitician } from './schemas';

export async function searchPoliticiansByName(
  firstName: string,
  lastName: string,
  http: FetchJsonOptions = { limiter: awLimiter },
): Promise<AwPolitician[]> {
  const query = new URLSearchParams({ first_name: firstName, last_name: lastName, range_end: '20' });
  const json = await fetchJson(`${BASE_URL}/politicians?${query.toString()}`, http);
  const parsed = listResponse(politicianSchema).parse(json);
  if (parsed.meta.status !== 'ok') {
    throw new Error(`abgeordnetenwatch: ${parsed.meta.status_message ?? 'Fehler'}`);
  }
  return parsed.data;
}
