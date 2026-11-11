import type { GovernmentOffice } from '@/domain/government';

/** „Christlich Demokratische Union Deutschlands (CDU)“ – Partei nur als Angabe, ohne Wertung. */
export function formatParty(party: GovernmentOffice['party']): string | null {
  if (!party) return null;
  return party.shortName && party.shortName !== party.name ? `${party.name} (${party.shortName})` : party.name;
}
