/**
 * Schemas für die Wikidata-Action-API (wbgetclaims, wbgetentities).
 * Nur die Felder, die wir nutzen; unbekannte Felder werden ignoriert.
 * Doku: Wikidata-Action-API, Hilfe zu „wbgetclaims“ (Abfrage nur im Build-Skript tools/regierung).
 */
import { z } from 'zod';

/** Formen von datavalue.value, die wir auswerten (geprüft in den Mappern). */
export const entityIdValue = z.object({ id: z.string() });
export const timeValue = z.object({ time: z.string(), precision: z.number().optional() });
export const monolingualValue = z.object({ text: z.string(), language: z.string() });

/** Ein Wert-Baustein („snak“). Ohne Wert (`novalue`/`somevalue`) fehlt `datavalue`. */
export const snakSchema = z.object({
  snaktype: z.string(),
  property: z.string(),
  datavalue: z
    .object({
      value: z.unknown(),
      type: z.string(),
    })
    .optional(),
});

export const claimSchema = z.object({
  mainsnak: snakSchema,
  rank: z.enum(['preferred', 'normal', 'deprecated']),
  qualifiers: z.record(z.string(), z.array(snakSchema)).optional(),
});

export const claimsResponseSchema = z.object({
  claims: z.record(z.string(), z.array(claimSchema)),
});

export const labelsResponseSchema = z.object({
  entities: z.record(
    z.string(),
    z.object({
      id: z.string(),
      labels: z.record(z.string(), z.object({ language: z.string(), value: z.string() })).optional(),
    }),
  ),
});

export type WdSnak = z.infer<typeof snakSchema>;
export type WdClaim = z.infer<typeof claimSchema>;
export type WdClaimsResponse = z.infer<typeof claimsResponseSchema>;
export type WdLabelsResponse = z.infer<typeof labelsResponseSchema>;
