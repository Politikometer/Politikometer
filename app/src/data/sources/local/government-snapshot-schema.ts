/**
 * Format der mitgelieferten Datei `assets/data/regierung.json` (Bundesregierung laut Wikidata).
 * Das Build-Skript prüft vor dem Schreiben, die App beim Laden und ein Test bei jedem
 * `npm run check` gegen dieses Schema.
 */
import { z } from 'zod';

import type { GovernmentSnapshot } from '@/domain/government';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const httpsUrl = z.string().regex(/^https:\/\//);

const sourceRefSchema = z.object({
  publisher: z.string().min(1),
  url: httpsUrl,
  license: z.string().min(1),
  retrievedAt: z.string().min(1),
  snapshot: z.boolean().optional(),
});

const partySchema = z.object({ name: z.string().min(1), shortName: z.string().nullable() }).nullable();

const officeSchema = z.object({
  title: z.string().min(1),
  wikidataId: z.string().regex(/^Q\d+$/),
  name: z.string().min(1),
  inOfficeSince: isoDate.nullable(),
  party: partySchema,
  source: sourceRefSchema,
});

const memberSchema = z.object({
  kind: z.literal('member'),
  wikidataId: z.string().regex(/^Q\d+$/),
  name: z.string().min(1),
  offices: z.array(
    z.object({
      title: z.string().min(1),
      wikidataId: z.string().regex(/^Q\d+$/),
      ministry: z.string().nullable(),
      since: isoDate.nullable(),
    }),
  ),
  isHeadOfGovernment: z.boolean(),
  party: partySchema,
  source: sourceRefSchema,
});

const unclearSchema = z.object({
  kind: z.literal('unclear'),
  title: z.string().min(1),
  wikidataId: z.string().min(1),
  reason: z.string().min(1),
  source: sourceRefSchema,
});

export const governmentSnapshotSchema = z.object({
  format: z.literal(1),
  retrievedAt: z.iso.datetime(),
  evaluatedFor: isoDate,
  source: z.object({ publisher: z.literal('Wikidata'), url: httpsUrl, license: z.literal('CC0 1.0') }),
  chancellor: officeSchema,
  cabinet: z.object({
    wikidataId: z.string().regex(/^Q\d+$/),
    name: z.string().nullable(),
    since: isoDate.nullable(),
    entries: z.array(z.discriminatedUnion('kind', [memberSchema, unclearSchema])),
    source: sourceRefSchema,
  }),
});

/** Prüft die Datei; wirft bei falschem Format. */
export function parseGovernmentSnapshot(json: unknown): GovernmentSnapshot {
  // Typ-Abgleich: Schema und Domänentyp müssen zusammenpassen (Fehler beim Typprüfen, wenn nicht).
  const parsed: GovernmentSnapshot = governmentSnapshotSchema.parse(json);
  return parsed;
}

/** Ab diesem Alter zeigt die App „Stand möglicherweise veraltet“. */
export const SNAPSHOT_STALE_DAYS = 60;

/** Alter des Stands in ganzen Tagen. */
export function snapshotAgeDays(snapshot: Pick<GovernmentSnapshot, 'retrievedAt'>, now: Date): number {
  const ms = now.getTime() - new Date(snapshot.retrievedAt).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function isSnapshotStale(snapshot: Pick<GovernmentSnapshot, 'retrievedAt'>, now: Date): boolean {
  return snapshotAgeDays(snapshot, now) > SNAPSHOT_STALE_DAYS;
}
