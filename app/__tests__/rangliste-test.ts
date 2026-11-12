import { fractionColor, NEUTRAL_FRACTION_COLOR, normalizeFraction } from '@/domain/fractions';
import {
  answerRate,
  belowParticipationFloor,
  formatMetric,
  type MemberFigures,
  participation,
  rank,
  score,
} from '@/domain/ranking';
import { getFigures } from '@/data/sources/local/figures';
import { allPhotoCredits, photoCredit, photoCreditByQid, photoSource, photoSourceByQid } from '@/data/sources/local/photos';
import { initials } from '@/ui/components/Avatar';

function member(over: Partial<MemberFigures>): MemberFigures {
  return {
    id: 1,
    mandateId: 1,
    name: 'Anna Beispiel',
    lastName: 'Beispiel',
    fraction: 'SPD',
    votesEligible: 80,
    votesCast: 80,
    questions: 10,
    answered: 10,
    ...over,
  };
}

describe('Kennzahlen', () => {
  it('rechnet Teilnahme und Antwortquote als Anteil', () => {
    expect(participation(member({ votesCast: 60 }))).toBeCloseTo(0.75);
    expect(answerRate(member({ answered: 5 }))).toBeCloseTo(0.5);
  });

  it('gibt bei zu kleinen Fallzahlen keinen Anteil aus', () => {
    expect(participation(member({ votesEligible: 9, votesCast: 9 }))).toBeNull();
    expect(answerRate(member({ questions: 4, answered: 4 }))).toBeNull();
  });

  it('bildet die Gesamtnote aus 70 % Teilnahme und 30 % Antworten', () => {
    expect(score(member({}))).toBe(10);
    expect(score(member({ votesCast: 40, answered: 5 }))).toBe(5);
    expect(score(member({ votesCast: 80, answered: 0 }))).toBe(7);
  });

  it('vergibt keine Gesamtnote, wenn eine Kennzahl fehlt', () => {
    expect(score(member({ questions: 2, answered: 2 }))).toBeNull();
  });

  it('vergibt unter 50 % Teilnahme weder Note noch Platz', () => {
    const low = member({ id: 9, votesCast: 39 });
    expect(belowParticipationFloor(low)).toBe(true);
    expect(score(low)).toBeNull();
    expect(participation(low)).toBeCloseTo(39 / 80);
    expect(rank([member({}), low], 'participation').map((r) => r.member.id)).toEqual([1]);
    expect(rank([member({}), low], 'answers')).toHaveLength(2);
    expect(belowParticipationFloor(member({ votesCast: 40 }))).toBe(false);
  });

  it('formatiert deutsch', () => {
    expect(formatMetric(9.1, 'score')).toBe('9,1');
    expect(formatMetric(0.954, 'participation')).toBe('95 %');
    expect(formatMetric(null, 'answers')).toBe('–');
  });
});

describe('Rangliste', () => {
  const a = member({ id: 1, lastName: 'Zett', votesCast: 80 });
  const b = member({ id: 2, lastName: 'Alpha', votesCast: 80 });
  const c = member({ id: 3, lastName: 'Mitte', votesCast: 40 });
  const d = member({ id: 4, lastName: 'Ohne', questions: 0, answered: 0 });

  it('sortiert absteigend, gleiche Werte teilen sich den Platz und stehen alphabetisch', () => {
    const rows = rank([a, c, b, d], 'score');
    expect(rows.map((r) => [r.member.id, r.rank])).toEqual([
      [2, 1],
      [1, 1],
      [3, 3],
    ]);
  });

  it('lässt Personen ohne Wert aus – sie landen nicht auf dem letzten Platz', () => {
    expect(rank([a, d], 'score').some((r) => r.member.id === 4)).toBe(false);
    expect(rank([a, d], 'participation').some((r) => r.member.id === 4)).toBe(true);
  });
});

describe('Mitgelieferte Daten', () => {
  it('Kennzahlen sind plausibel', () => {
    const figures = getFigures();
    expect(figures.members.length).toBeGreaterThan(500);
    expect(figures.source.snapshot).toBe(true);
    for (const m of figures.members) {
      expect(m.votesCast).toBeLessThanOrEqual(m.votesEligible);
      expect(m.answered).toBeLessThanOrEqual(m.questions);
      // Unsichtbare Trennzeichen würden Filter und Farben stören.
      expect(m.fraction ?? '').not.toMatch(/­/);
    }
  });

  it('jedes Foto hat einen Bildnachweis mit freier Lizenz', () => {
    const credits = allPhotoCredits();
    expect(credits.length).toBeGreaterThan(100);
    for (const { key, credit } of credits) {
      expect(/^Q/.test(key) ? photoSourceByQid(key) : photoSource(Number(key))).not.toBeNull();
      expect(credit.name).toBeTruthy();
      expect(credit.author).not.toBe('');
      expect(credit.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(credit.license).toMatch(/^(CC BY|CC0|Public domain|PD)/i);
      expect(credit.license).not.toMatch(/NC|ND/);
    }
    expect(photoCredit(-1)).toBeNull();
  });

  it('findet Porträts der Bundesregierung über die Wikidata-Kennung', () => {
    // Friedrich Merz: Bundeskanzler mit Bundestagsmandat.
    expect(photoSourceByQid('Q566257')).not.toBeNull();
    expect(photoCreditByQid('Q566257')?.page).toMatch(/commons.wikimedia.org/);
    expect(photoSourceByQid('Q0')).toBeNull();
    expect(photoCreditByQid('Q0')).toBeNull();
  });
});

describe('Fraktionsfarben und Initialen', () => {
  it('kennt die Fraktionen des Bundestags und fällt sonst auf Grau zurück', () => {
    expect(fractionColor('SPD')).toBe('#E3000F');
    expect(fractionColor('BÜNDNIS 90/­DIE GRÜNEN')).toBe('#1AA037');
    expect(fractionColor('fraktionslos')).toBe(NEUTRAL_FRACTION_COLOR);
    expect(fractionColor(null)).toBe(NEUTRAL_FRACTION_COLOR);
    expect(normalizeFraction('BÜNDNIS 90/­DIE GRÜNEN')).toBe('BÜNDNIS 90/DIE GRÜNEN');
  });

  it('bildet Initialen ohne Titel', () => {
    expect(initials('Dr. Anna Maria Beispiel')).toBe('AB');
    expect(initials('Cher')).toBe('C');
  });
});
