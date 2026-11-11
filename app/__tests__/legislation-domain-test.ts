import {
  addDays,
  billDrucksachen,
  drucksacheFromUrl,
  groupByStatus,
  localIsoDate,
  matchPolls,
  mondayOf,
  pollsInWindow,
  UNKNOWN_STATUS,
  weekWindow,
  type LegislationStep,
  type PollSummary,
  type WeekProceeding,
} from '@/domain/legislation';

const SRC = { publisher: 'x', url: 'https://example.org', license: 'x', retrievedAt: '2026-10-31T10:00:00Z' };

function step(partial: Partial<LegislationStep>): LegislationStep {
  return {
    id: '1',
    proceedingId: '1',
    date: '2026-10-01',
    title: 'Gesetzentwurf',
    body: 'Bundestag',
    note: null,
    authors: [],
    committees: [],
    decisions: [],
    summary: null,
    document: null,
    ...partial,
  };
}

function poll(id: number, date: string, drucksachen: string[]): PollSummary {
  return { id, title: `Abstimmung ${id}`, date, accepted: true, drucksachen, source: SRC };
}

describe('drucksacheFromUrl', () => {
  it('liest die Nummer aus Links auf dserver.bundestag.de', () => {
    expect(drucksacheFromUrl('https://dserver.bundestag.de/btd/21/078/2107869.pdf')).toBe('21/7869');
    expect(drucksacheFromUrl('https://dserver.bundestag.de/btd/21/086/2108626.pdf')).toBe('21/8626');
    expect(drucksacheFromUrl('https://dserver.bundestag.de/btd/20/100/2010012.pdf')).toBe('20/10012');
  });
  it('ignoriert andere Links (Bundesrat, Protokolle, fremde Seiten)', () => {
    expect(drucksacheFromUrl('https://dserver.bundestag.de/brd/2026/0462-26.pdf')).toBeNull();
    expect(drucksacheFromUrl('https://dserver.bundestag.de/btp/21/21102.pdf')).toBeNull();
    expect(drucksacheFromUrl('https://www.abgeordnetenwatch.de/bundestag/21/ausschuesse/x')).toBeNull();
  });
});

describe('matchPolls', () => {
  const doc = (number: string, publisher = 'Bundestag') => ({
    kind: 'Drucksache' as const,
    label: `BT-Drs. ${number}`,
    number,
    publisher,
    documentType: null,
    url: null,
  });
  const steps = [
    step({ id: '1', title: 'Gesetzentwurf', document: doc('462/26', 'Bundesrat'), body: 'Bundesrat' }),
    step({ id: '2', title: 'Gesetzentwurf', document: doc('21/7869') }),
    step({ id: '3', title: 'Beschlussempfehlung und Bericht', document: doc('21/8626') }),
  ];

  it('nimmt nur Bundestagsdrucksachen „Gesetzentwurf“ als Schlüssel', () => {
    expect(billDrucksachen({ steps })).toEqual(['21/7869']);
  });

  it('verknüpft Abstimmungen über die Drucksache des Gesetzentwurfs, chronologisch', () => {
    const polls = [
      poll(3, '2026-10-16', ['21/7869', '21/8626']),
      poll(1, '2026-10-15', ['21/7869']),
      // Nur Beschlussempfehlung: nicht eindeutig (kann mehrere Vorlagen umfassen).
      poll(2, '2026-10-15', ['21/8626']),
      poll(4, '2026-10-15', ['21/1']),
    ];
    expect(matchPolls({ steps }, polls).map((p) => p.id)).toEqual([1, 3]);
  });

  it('ohne Gesetzentwurf im Bundestag gibt es keine Zuordnung', () => {
    expect(matchPolls({ steps: [steps[0], steps[2]] }, [poll(1, '2026-10-15', ['21/8626'])])).toEqual([]);
  });
});

describe('Zeitraum', () => {
  it('rechnet Datumsangaben ohne Zeitzonen-Effekte', () => {
    expect(addDays('2026-10-31', -6)).toBe('2026-10-25');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(mondayOf('2026-10-16')).toBe('2026-10-12'); // Freitag → Montag
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // Sonntag gehört zur Woche davor
    expect(localIsoDate(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
  });

  it('zeigt ab Montag der Sitzungswoche bis heute, wenn der Bundestag in den letzten 7 Tagen getagt hat', () => {
    expect(weekWindow('2026-10-16', ['2026-10-14', '2026-10-15', '2026-10-16'])).toEqual({
      start: '2026-10-12',
      end: '2026-10-16',
      kind: 'recentSittingWeek',
    });
    // Eine Woche später: Sitzungstage 14.–15.10. bleiben im Zeitraum.
    expect(weekWindow('2026-10-22', ['2026-10-14', '2026-10-15', '2026-10-16'])).toEqual({
      start: '2026-10-12',
      end: '2026-10-22',
      kind: 'recentSittingWeek',
    });
    // Zwei Sitzungswochen hintereinander: die frühere wird nicht abgeschnitten.
    expect(weekWindow('2026-10-21', ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20'])).toEqual({
      start: '2026-10-12',
      end: '2026-10-21',
      kind: 'recentSittingWeek',
    });
  });

  it('nimmt sonst die Kalenderwoche der letzten Sitzung', () => {
    expect(weekWindow('2026-10-31', ['2026-10-09', '2026-10-16', '2026-10-14'])).toEqual({
      start: '2026-10-12',
      end: '2026-10-18',
      kind: 'lastSittingWeek',
    });
  });

  it('kennzeichnet, wenn keine Sitzung bekannt ist', () => {
    expect(weekWindow('2026-10-31', [])).toEqual({ start: '2026-10-25', end: '2026-10-31', kind: 'noSessionFound' });
  });

  it('filtert Abstimmungen auf den Zeitraum, älteste zuerst', () => {
    const w = { start: '2026-10-12', end: '2026-10-18' };
    const res = pollsInWindow(
      [poll(5, '2026-10-16', []), poll(4, '2026-10-08', []), poll(6, '2026-10-15', []), poll(7, '2026-10-19', [])],
      w,
    );
    expect(res.map((p) => p.id)).toEqual([6, 5]);
  });
});

describe('groupByStatus', () => {
  const item = (id: string, status: string | null, date: string, title = id): WeekProceeding => ({
    id,
    title,
    status,
    initiative: [],
    steps: [step({ id, date })],
    source: SRC,
  });

  it('gruppiert nach amtlichem Beratungsstand (alphabetisch), darin chronologisch', () => {
    const groups = groupByStatus([
      item('a', 'Verkündet', '2026-10-16'),
      item('b', 'Überwiesen', '2026-10-15'),
      item('c', 'Abgelehnt', '2026-10-15'),
      item('d', 'Überwiesen', '2026-10-14'),
      item('e', null, '2026-10-14'),
    ]);
    expect(groups.map((g) => g.status)).toEqual(['Abgelehnt', UNKNOWN_STATUS, 'Überwiesen', 'Verkündet']);
    expect(groups[2].items.map((i) => i.id)).toEqual(['d', 'b']);
  });
});
