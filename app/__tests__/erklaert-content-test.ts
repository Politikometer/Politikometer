import {
  EXPLAIN_STAND,
  EXPLAIN_TOPIC_IDS,
  EXPLAIN_TOPICS,
  countWords,
  getExplainTopic,
  isExplainTopicId,
} from '@/content/erklaerungen';
import { isSafeUrl } from '@/ui/open-link';

/** Parteinamen und Kürzel, die in neutralen Erklärtexten nicht vorkommen sollen. */
const PARTY_WORDS =
  /\b(CDU|CSU|SPD|FDP|AfD|BSW|Grünen?|Linke|Die Linke|Freie Wähler|SSW)\b/;

/** Wertende Wörter, die laut Projektregeln vermieden werden. */
const LOADED_WORDS = /\b(gefehlt|schwänz\w*|leider|immerhin|skandal\w*)\b|!/i;

function allText(id: string): string {
  const t = getExplainTopic(id)!;
  return [
    t.title,
    t.summary,
    ...t.sections.flatMap((s) => [
      s.heading,
      ...(s.paragraphs ?? []),
      ...(s.items ?? []).flatMap((i) => [i.term ?? '', i.text]),
    ]),
  ].join('\n');
}

describe('Erklärseiten – Inhalte', () => {
  it('jede Themen-ID hat genau ein Thema und umgekehrt', () => {
    expect(EXPLAIN_TOPICS.map((t) => t.id)).toEqual([...EXPLAIN_TOPIC_IDS]);
    expect(new Set(EXPLAIN_TOPIC_IDS).size).toBe(EXPLAIN_TOPIC_IDS.length);
    for (const id of EXPLAIN_TOPIC_IDS) {
      expect(getExplainTopic(id)?.id).toBe(id);
      expect(isExplainTopicId(id)).toBe(true);
    }
  });

  it('unbekannte IDs liefern kein Thema', () => {
    expect(getExplainTopic('gibt-es-nicht')).toBeUndefined();
    expect(getExplainTopic(undefined)).toBeUndefined();
    expect(isExplainTopicId('gibt-es-nicht')).toBe(false);
  });

  it('IDs eignen sich als Pfadteil', () => {
    for (const id of EXPLAIN_TOPIC_IDS) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('jeder Querverweis zeigt auf ein anderes, existierendes Thema', () => {
    for (const t of EXPLAIN_TOPICS) {
      for (const r of t.related) {
        expect(isExplainTopicId(r)).toBe(true);
        expect(r).not.toBe(t.id);
      }
      expect(new Set(t.related).size).toBe(t.related.length);
    }
  });

  it('jedes Thema hat 1–3 Quellen, alle über https', () => {
    for (const t of EXPLAIN_TOPICS) {
      expect(t.sources.length).toBeGreaterThanOrEqual(1);
      expect(t.sources.length).toBeLessThanOrEqual(3);
      for (const s of t.sources) {
        expect(isSafeUrl(s.url)).toBe(true);
        expect(s.label.trim()).not.toBe('');
      }
    }
  });

  it('kein Thema ist leer; jeder Abschnitt hat Text', () => {
    for (const t of EXPLAIN_TOPICS) {
      expect(t.title.trim()).not.toBe('');
      expect(t.shortTitle.trim()).not.toBe('');
      expect(t.summary.trim()).not.toBe('');
      expect(t.sections.length).toBeGreaterThan(0);
      for (const s of t.sections) {
        expect(s.heading.trim()).not.toBe('');
        const texts = [...(s.paragraphs ?? []), ...(s.items ?? []).map((i) => i.text)];
        expect(texts.length).toBeGreaterThan(0);
        for (const x of texts) expect(x.trim()).not.toBe('');
      }
      // Eindeutige Überschriften (werden als React-Schlüssel genutzt).
      const headings = t.sections.map((s) => s.heading);
      expect(new Set(headings).size).toBe(headings.length);
    }
  });

  it('jedes Thema hat 150–350 Wörter', () => {
    for (const t of EXPLAIN_TOPICS) {
      const n = countWords(t);
      expect({ id: t.id, ok: n >= 150 && n <= 350, n }).toEqual({ id: t.id, ok: true, n });
    }
  });

  it('keine Parteinamen und keine wertenden Wörter', () => {
    for (const id of EXPLAIN_TOPIC_IDS) {
      expect({ id, match: allText(id).match(PARTY_WORDS)?.[0] }).toEqual({ id, match: undefined });
      expect({ id, match: allText(id).match(LOADED_WORDS)?.[0] }).toEqual({ id, match: undefined });
    }
  });

  it('Sätze bleiben kurz (höchstens 30 Wörter)', () => {
    for (const id of EXPLAIN_TOPIC_IDS) {
      for (const sentence of allText(id).split(/[.?:\n]\s/)) {
        const n = sentence.split(/\s+/).filter(Boolean).length;
        expect({ id, sentence, long: n > 30 }).toEqual({ id, sentence, long: false });
      }
    }
  });

  it('Faktenstand ist angegeben', () => {
    expect(EXPLAIN_STAND).toMatch(/^[A-ZÄÖÜ][a-zäöü]+ \d{4}$/);
  });

  it('enthält die geforderten Kernfakten', () => {
    expect(allText('bundestag')).toContain('630');
    expect(allText('wahlrecht-2023')).toContain('Grundmandatsklausel');
    expect(allText('wahlrecht-2023')).toContain('2024');
    expect(allText('gesetzgebung')).toMatch(/Einspruchsgesetz[\s\S]*Zustimmungsgesetz/);
    const steps = getExplainTopic('gesetzgebung')!.sections.find((s) => s.ordered)!.items!;
    expect(steps.map((s) => s.term)).toEqual([
      'Kabinett',
      'Bundesrat, 1. Durchgang',
      '1. Lesung',
      'Ausschüsse',
      '2. Lesung',
      '3. Lesung',
      'Bundesrat',
      'Ausfertigung und Verkündung',
    ]);
  });
});
