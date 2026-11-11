import { Share } from 'react-native';

import { buildShareText, cleanShareUrl, shareContent } from '@/ui/share';

describe('cleanShareUrl', () => {
  it('lässt saubere Links unverändert', () => {
    expect(cleanShareUrl('https://www.abgeordnetenwatch.de/profile/friedrich-merz')).toBe(
      'https://www.abgeordnetenwatch.de/profile/friedrich-merz',
    );
    expect(cleanShareUrl('https://dip.bundestag.de/vorgang/x/321456?f.typ=Vorgang')).toBe(
      'https://dip.bundestag.de/vorgang/x/321456?f.typ=Vorgang',
    );
  });

  it('entfernt Tracking-Parameter (wie in den Teilen-Links von abgeordnetenwatch)', () => {
    expect(
      cleanShareUrl(
        'https://www.abgeordnetenwatch.de/profile/friedrich-merz/fragen-antworten/wann-endlich-afd-verbot?pk_campaign=share-bluesky&pk_source=bluesky',
      ),
    ).toBe('https://www.abgeordnetenwatch.de/profile/friedrich-merz/fragen-antworten/wann-endlich-afd-verbot');
    expect(
      cleanShareUrl('https://example.org/a?utm_source=x&id=5&fbclid=abc&mtm_campaign=y&gclid=1#teil'),
    ).toBe('https://example.org/a?id=5#teil');
  });

  it('teilt nur https-Links', () => {
    expect(cleanShareUrl('http://www.abgeordnetenwatch.de/profile/x')).toBeNull();
    expect(cleanShareUrl('javascript:alert(1)')).toBeNull();
    expect(cleanShareUrl('politikometer://politiker/1')).toBeNull();
    expect(cleanShareUrl('')).toBeNull();
  });
});

describe('buildShareText', () => {
  it('enthält Titel, Zusatzzeile, Quelle und Original-Link ohne Tracking', () => {
    const text = buildShareText({
      title: 'Friedrich Merz',
      subtitle: 'CDU · Mitglied des Bundestages',
      url: 'https://www.abgeordnetenwatch.de/profile/friedrich-merz?utm_medium=app',
      publisher: 'abgeordnetenwatch.de',
    });
    expect(text).toBe(
      'Friedrich Merz\nCDU · Mitglied des Bundestages\n\nQuelle: abgeordnetenwatch.de\nhttps://www.abgeordnetenwatch.de/profile/friedrich-merz',
    );
    expect(text).not.toMatch(/utm_|pk_|politikometer:/);
  });

  it('ohne sicheren Link oder Titel: nichts', () => {
    expect(buildShareText({ title: 'X', url: 'http://a.de' })).toBeNull();
    expect(buildShareText({ title: ' ', url: 'https://a.de' })).toBeNull();
  });
});

describe('shareContent', () => {
  it('übergibt nur Text (Link im Text, kein separates url-Feld)', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await expect(
      shareContent({ title: 'Abstimmung', url: 'https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen/x' }),
    ).resolves.toBe('shared');
    const [content] = spy.mock.calls[0];
    expect(content).not.toHaveProperty('url');
    expect((content as { message: string }).message).toContain('https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen/x');
    spy.mockRestore();
  });

  it('meldet Abbruch und Fehler ohne zu werfen', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValueOnce({ action: Share.dismissedAction, activityType: undefined });
    await expect(shareContent({ title: 'A', url: 'https://a.de' })).resolves.toBe('dismissed');
    spy.mockRejectedValueOnce(new Error('kein Teilen'));
    await expect(shareContent({ title: 'A', url: 'https://a.de' })).resolves.toBe('unavailable');
    spy.mockRestore();
  });
});
