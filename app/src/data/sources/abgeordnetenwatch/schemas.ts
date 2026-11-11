/**
 * Schemas für die Antworten der abgeordnetenwatch.de API v2.
 * Nur die Felder, die wir nutzen. Unbekannte Felder werden ignoriert,
 * damit neue API-Felder die App nicht brechen.
 * Doku: https://www.abgeordnetenwatch.de/api
 */
import { z } from 'zod';

const ref = z.object({
  id: z.number(),
  label: z.string(),
});

export const parliamentSchema = z.object({
  id: z.number(),
  label: z.string(),
  abgeordnetenwatch_url: z.string().nullish(),
  current_project: ref.nullish(),
});

export const electoralDataSchema = z.object({
  electoral_list: ref.nullish(),
  list_position: z.number().nullish(),
  constituency: ref.nullish(),
  mandate_won: z.string().nullish(),
});

export const fractionMembershipSchema = z.object({
  fraction: ref,
  valid_from: z.string().nullish(),
  valid_until: z.string().nullish(),
});

export const mandateSchema = z.object({
  id: z.number(),
  type: z.string(),
  parliament_period: ref.extend({ abgeordnetenwatch_url: z.string().nullish() }),
  politician: ref.extend({ abgeordnetenwatch_url: z.string().nullish() }),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  info: z.string().nullish(),
  party: ref.nullish(),
  electoral_data: electoralDataSchema.nullish(),
  fraction_membership: z.array(fractionMembershipSchema).nullish(),
});

export const politicianSchema = z.object({
  id: z.number(),
  label: z.string(),
  abgeordnetenwatch_url: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  field_title: z.string().nullish(),
  year_of_birth: z.number().nullish(),
  party: ref.nullish(),
  education: z.string().nullish(),
  residence: z.string().nullish(),
  occupation: z.string().nullish(),
  statistic_questions: z.number().nullish(),
  statistic_questions_answered: z.number().nullish(),
  qid_wikidata: z.string().nullish(),
});

export const parliamentPeriodSchema = z.object({
  id: z.number(),
  label: z.string(),
  type: z.string().nullish(),
  previous_period: ref.nullish(),
});

export const pollSchema = z.object({
  id: z.number(),
  label: z.string(),
  abgeordnetenwatch_url: z.string().nullish(),
  field_accepted: z.boolean().nullish(),
  field_poll_date: z.string().nullish(),
  field_intro: z.string().nullish(),
  field_topics: z.array(ref).nullish(),
});

export const voteSchema = z.object({
  id: z.number(),
  mandate: ref,
  poll: ref.extend({ abgeordnetenwatch_url: z.string().nullish() }).nullish(),
  vote: z.string(),
  reason_no_show: z.string().nullish(),
  reason_no_show_other: z.string().nullish(),
  fraction: ref.nullish(),
});

const meta = z.object({
  abgeordnetenwatch_api: z.object({ licence: z.string().nullish() }).nullish(),
  status: z.string(),
  status_message: z.string().nullish(),
  /** Bei Listen: Gesamtzahl und Ausschnitt (range_end = Anzahl, nicht Endposition). */
  result: z
    .object({
      count: z.number().nullish(),
      total: z.number().nullish(),
      range_start: z.number().nullish(),
    })
    .nullish(),
});

export const listResponse = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ meta, data: z.array(item) });

export const entityResponse = <T extends z.ZodTypeAny>(item: T) => z.object({ meta, data: item });

export type AwEnvelope<D> = { meta: z.infer<typeof meta>; data: D };
export type AwParliament = z.infer<typeof parliamentSchema>;
export type AwMandate = z.infer<typeof mandateSchema>;
export type AwPolitician = z.infer<typeof politicianSchema>;
export type AwParliamentPeriod = z.infer<typeof parliamentPeriodSchema>;
export type AwPoll = z.infer<typeof pollSchema>;
export type AwVote = z.infer<typeof voteSchema>;
