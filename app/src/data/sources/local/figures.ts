import { z } from 'zod';

import type { SourceRef } from '@/domain/model';
import type { MemberFigures } from '@/domain/ranking';

/**
 * Mitgelieferte Kennzahlen (`assets/data/kennzahlen.json`), erzeugt mit `npm run abgeordnete`.
 * Die App fragt dafür nichts im Netz ab; der Stand der Datei wird angezeigt.
 */
const schema = z.object({
  retrievedAt: z.string(),
  period: z.string(),
  pollCount: z.number(),
  source: z.object({ publisher: z.string(), url: z.string(), license: z.string() }),
  members: z.array(
    z.object({
      id: z.number(),
      mandateId: z.number(),
      name: z.string(),
      lastName: z.string(),
      fraction: z.string().nullable(),
      votesEligible: z.number(),
      votesCast: z.number(),
      questions: z.number(),
      answered: z.number(),
    }),
  ),
});

export type FiguresSnapshot = {
  period: string;
  pollCount: number;
  members: MemberFigures[];
  byId: Map<number, MemberFigures>;
  source: SourceRef;
};

let cached: FiguresSnapshot | null = null;

export function getFigures(): FiguresSnapshot {
  if (cached) return cached;
  const raw = schema.parse(require('../../../../assets/data/kennzahlen.json'));
  cached = {
    period: raw.period,
    pollCount: raw.pollCount,
    members: raw.members,
    byId: new Map(raw.members.map((m) => [m.id, m])),
    source: { ...raw.source, retrievedAt: raw.retrievedAt, snapshot: true },
  };
  return cached;
}
