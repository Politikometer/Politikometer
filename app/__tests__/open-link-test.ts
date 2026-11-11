import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { openLink } from '@/ui/open-link';

jest.mock('expo-web-browser');

const openBrowser = WebBrowser.openBrowserAsync as jest.MockedFunction<
  typeof WebBrowser.openBrowserAsync
>;

describe('openLink', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openBrowser.mockReset();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('öffnet den In-App-Browser in derselben Android-Task (createTask: false)', async () => {
    openBrowser.mockResolvedValue({ type: WebBrowser.WebBrowserResultType.OPENED });
    await openLink('https://www.abgeordnetenwatch.de/');
    expect(openBrowser).toHaveBeenCalledTimes(1);
    expect(openBrowser).toHaveBeenCalledWith(
      'https://www.abgeordnetenwatch.de/',
      expect.objectContaining({ createTask: false }),
    );
    expect(openURL).not.toHaveBeenCalled();
  });

  it('fängt einen Fehler ab und weicht auf den Systembrowser aus', async () => {
    openBrowser.mockRejectedValue(new Error('kein Custom-Tabs-Browser'));
    await expect(openLink('https://example.org/')).resolves.toBeUndefined();
    expect(openURL).toHaveBeenCalledWith('https://example.org/');
  });

  it.each(['http://example.org/', 'intent://scan#Intent;end', 'javascript:alert(1)', 'tel:110', 'kein link'])(
    'öffnet keine unsicheren Adressen: %s',
    async (url) => {
      await openLink(url);
      expect(openBrowser).not.toHaveBeenCalled();
      expect(openURL).not.toHaveBeenCalled();
    },
  );

  it('stürzt nicht ab, wenn auch der Systembrowser scheitert', async () => {
    openBrowser.mockRejectedValue(new Error('kaputt'));
    openURL.mockRejectedValue(new Error('auch kaputt'));
    await expect(openLink('https://example.org/')).resolves.toBeUndefined();
  });
});
