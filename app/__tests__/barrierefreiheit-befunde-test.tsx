import { fireEvent, render, screen } from '@testing-library/react-native';

import { EXPLAIN_TOPIC_IDS } from '@/content/erklaerungen';
import { howElectedExplainLabel } from '@/domain/representatives';
import { AppPressable } from '@/ui/components/AppPressable';
import { Button } from '@/ui/components/Button';
import { EXPLAIN_LINK_LABELS } from '@/ui/components/ExplainLink';
import { darkTheme, lightTheme } from '@/ui/theme';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('Befund designpruefer: Kontraste', () => {
  it.each([
    ['hell', lightTheme],
    ['dunkel', darkTheme],
  ])('Eingaberahmen ≥ 3:1, Fokus ≥ 3:1, gedämpfte Texte ≥ 4,5:1 (%s)', (_name, theme) => {
    const c = theme.colors;
    for (const bg of [c.background, c.surface]) {
      expect(contrast(c.inputBorder, bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.focus, bg)).toBeGreaterThanOrEqual(3);
      // Text deaktivierter Knöpfe
      expect(contrast(c.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    }
    // Gedrückte Listenzeile: Fläche in Rahmenfarbe
    expect(contrast(c.text, c.border)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.border)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.primary, c.border)).toBeGreaterThanOrEqual(3);
  });
});

describe('Befund designpruefer: sichtbarer Fokus', () => {
  it('zeigt den Fokusrahmen nur bei Fokus, ohne Layoutänderung', async () => {
    await render(
      <AppPressable accessibilityRole="button" accessibilityLabel="Test" onPress={() => {}}>
        {null}
      </AppPressable>,
    );
    const ring = () => screen.getByTestId('focus-ring', { includeHiddenElements: true });
    expect(ring()).toHaveStyle({ borderColor: 'transparent', position: 'absolute' });
    await fireEvent(screen.getByRole('button'), 'focus');
    expect(ring()).toHaveStyle({ borderColor: lightTheme.colors.focus, borderWidth: 3 });
    await fireEvent(screen.getByRole('button'), 'blur');
    expect(ring()).toHaveStyle({ borderColor: 'transparent' });
  });

  it('deaktivierter Knopf wird nicht über Transparenz abgedunkelt', async () => {
    await render(<Button label="Weiter" onPress={() => {}} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).not.toHaveStyle({ opacity: 0.5 });
    expect(screen.getByText('Weiter')).toHaveStyle({ color: lightTheme.colors.textMuted });
  });
});

describe('Befund designpruefer: konkrete Erklärlinks', () => {
  it('jedes Thema hat einen eigenen Standardtext statt „Was bedeutet das?“', () => {
    for (const id of EXPLAIN_TOPIC_IDS) {
      expect(EXPLAIN_LINK_LABELS[id]).toMatch(/\?$/);
      expect(EXPLAIN_LINK_LABELS[id]).not.toBe('Was bedeutet das?');
    }
    expect(howElectedExplainLabel('direct')).toBe('Was heißt Direktmandat?');
  });
});
