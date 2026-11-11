/**
 * Anzeige von Impressum und Datenschutzerklärung (Inhalte: `content/recht.ts`).
 * Fehlende Angaben erscheinen gut sichtbar als „[noch offen: …]“; solange etwas fehlt, steht oben
 * ein deutlicher Entwurfshinweis.
 */
import { Fragment } from 'react';
import { View } from 'react-native';

import {
  missingLabels,
  missingText,
  paragraphText,
  type LegalDocument,
  type LegalParagraph,
} from '@/content/recht';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { spacing, useTheme } from '@/ui/theme';

function Paragraph({ p, variant = 'body' }: { p: LegalParagraph; variant?: 'body' | 'small' }) {
  const { colors } = useTheme();
  return (
    <AppText variant={variant} accessibilityLabel={paragraphText(p)}>
      {p.map((s, i) =>
        typeof s === 'string' ? (
          <Fragment key={i}>{s}</Fragment>
        ) : (
          <AppText
            key={i}
            variant={variant}
            style={{ color: colors.error, backgroundColor: colors.errorSurface, fontWeight: '700' }}>
            {missingText(s.missing)}
          </AppText>
        ),
      )}
    </AppText>
  );
}

function DraftBanner({ doc }: { doc: LegalDocument }) {
  const { colors } = useTheme();
  const missing = missingLabels(doc);
  return (
    <Card style={{ backgroundColor: colors.errorSurface, borderColor: colors.error }} accessibilityRole="alert">
      <AppText variant="heading" style={{ color: colors.error }}>
        Entwurf – noch nicht gültig
      </AppText>
      <AppText>
        Dieser Text ist ein Entwurf und wird vor der Veröffentlichung der App vervollständigt und
        geprüft.
        {missing.length > 0 ? ` Noch offen: ${missing.join(', ')}.` : ''}
      </AppText>
    </Card>
  );
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <>
      <AppText variant="title">{doc.title}</AppText>
      {doc.draft ? <DraftBanner doc={doc} /> : null}
      {doc.intro ? <Paragraph p={doc.intro} variant="small" /> : null}
      {doc.sections.map((s) => (
        <Card key={s.heading}>
          <AppText variant="heading">{s.heading}</AppText>
          {s.paragraphs?.map((p, i) => <Paragraph key={`p${i}`} p={p} />)}
          {s.bullets?.map((b, i) => (
            <View key={`b${i}`} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppText importantForAccessibility="no" accessibilityElementsHidden>
                •
              </AppText>
              <View style={{ flex: 1 }}>
                <Paragraph p={b} />
              </View>
            </View>
          ))}
          {s.items?.map((item) => (
            <View key={item.term} style={{ gap: spacing.xs }}>
              <AppText style={{ fontWeight: '700' }}>{item.term}</AppText>
              <Paragraph p={item.text} />
              {item.links?.map((l) => <ExternalLink key={l.url} small url={l.url} label={l.label} />)}
            </View>
          ))}
          {s.links?.map((l) => <ExternalLink key={l.url} small url={l.url} label={l.label} />)}
        </Card>
      ))}
    </>
  );
}
