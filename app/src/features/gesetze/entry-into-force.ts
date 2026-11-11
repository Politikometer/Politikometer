import type { EntryIntoForce } from '@/domain/legislation';
import { formatDate } from '@/ui/format';

/**
 * Eine Zeile je Datum, nach Datum: „09.12.2026 (im Übrigen)“.
 * Mehrere Erläuterungen am selben Tag werden zusammengefasst („Artikel 1, Artikel 3“).
 */
export function entryIntoForceLines(entries: EntryIntoForce[]): string[] {
  const byDate = new Map<string, string[]>();
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const notes = byDate.get(e.date) ?? [];
    if (e.note && !notes.includes(e.note)) notes.push(e.note);
    byDate.set(e.date, notes);
  }
  const lines: string[] = [];
  for (const [date, notes] of byDate) {
    const d = formatDate(date);
    if (!d) continue;
    lines.push(notes.length ? `${d} (${notes.join(', ')})` : d);
  }
  return lines;
}
