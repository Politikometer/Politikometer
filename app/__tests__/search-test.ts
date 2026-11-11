import { createSearch, matchesSearch, normalizeForSearch, searchKeys } from '@/domain/search';

const names = [
  'Thomas Müller',
  'Otto Strauß',
  'Cansın Köktürk',
  'Aydan Özoğuz',
  'Jan van Aken',
  'Michael „Moses“ Arndt',
  'Ursula Groden-Kranich',
  'René Springer',
];
const find = createSearch(names, (n) => n);

describe('Namenssuche', () => {
  it('ignoriert Groß- und Kleinschreibung', () => {
    expect(find('MÜLLER')).toEqual(['Thomas Müller']);
    expect(find('thomas')).toEqual(['Thomas Müller']);
  });

  it('findet Umlaute ohne Punkte und in der Schreibweise mit e', () => {
    expect(find('muller')).toEqual(['Thomas Müller']);
    expect(find('mueller')).toEqual(['Thomas Müller']);
    expect(find('müller')).toEqual(['Thomas Müller']);
    expect(find('kokturk')).toEqual(['Cansın Köktürk']);
    expect(find('koektuerk')).toEqual(['Cansın Köktürk']);
  });

  it('behandelt ß wie ss – in beide Richtungen', () => {
    expect(find('strauss')).toEqual(['Otto Strauß']);
    expect(find('Strauß')).toEqual(['Otto Strauß']);
    expect(searchKeys('Strauss')).toEqual(searchKeys('Strauß'));
  });

  it('ignoriert Akzente und Sonderbuchstaben', () => {
    expect(find('rene')).toEqual(['René Springer']);
    expect(find('cansin')).toEqual(['Cansın Köktürk']);
    expect(find('ozoguz')).toEqual(['Aydan Özoğuz']);
  });

  it('findet Teile in beliebiger Reihenfolge, Satzzeichen zählen nicht', () => {
    expect(find('aken jan')).toEqual(['Jan van Aken']);
    expect(find('moses')).toEqual(['Michael „Moses“ Arndt']);
    expect(find('groden kranich')).toEqual(['Ursula Groden-Kranich']);
    expect(find('groden-kranich')).toEqual(['Ursula Groden-Kranich']);
  });

  it('leere Eingabe liefert die ganze Liste in unveränderter Reihenfolge', () => {
    expect(find('')).toEqual(names);
    expect(find('   ')).toEqual(names);
    expect(find('xyz')).toEqual([]);
  });

  it('entfernt weiche Trennzeichen (z. B. in „BÜNDNIS 90/DIE GRÜNEN“)', () => {
    expect(normalizeForSearch('BÜNDNIS 90/­DIE GRÜNEN')).toBe('bundnis 90 die grunen');
    expect(matchesSearch(searchKeys('BÜNDNIS 90/­DIE GRÜNEN'), 'gruene')).toBe(true);
  });
});
