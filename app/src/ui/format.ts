/** Datumsformate auf Deutsch, unabhängig von der Gerätesprache. */

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function toDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Reines Kalenderdatum „JJJJ-MM-TT“ – ohne Zeitzonenumrechnung, sonst wäre es westlich von UTC einen Tag früher. */
const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const plain = PLAIN_DATE.exec(value);
  if (plain) {
    const [, y, m, day] = plain;
    const month = Number(m);
    const dd = Number(day);
    if (month < 1 || month > 12 || dd < 1 || dd > 31) return null;
    return `${day}.${m}.${y}`;
  }
  const d = toDate(value);
  return d ? dateFmt.format(d) : null;
}

export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = toDate(value);
  return d ? `${dateTimeFmt.format(d)} Uhr` : null;
}
