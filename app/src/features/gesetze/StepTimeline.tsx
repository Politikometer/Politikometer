import { View } from 'react-native';

import type { LegislationStep, StepDecision } from '@/domain/legislation';
import { AppText } from '@/ui/components/AppText';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { formatDate } from '@/ui/format';
import { spacing, useTheme } from '@/ui/theme';

export function stepHeading(step: LegislationStep): string {
  return step.note ? `${step.title} (${step.note})` : step.title;
}

function decisionText(d: StepDecision): string {
  return [d.text, d.method, d.majority, d.result ? `Ergebnis laut Protokoll: ${d.result}` : null]
    .filter(Boolean)
    .join(' · ');
}

/** Ein Schritt: Datum, amtliche Bezeichnung, Gremium, Beschluss, Dokument. */
export function StepEntry({ step, compact }: { step: LegislationStep; compact?: boolean }) {
  const { colors } = useTheme();
  const date = formatDate(step.date);
  const lead = step.committees.filter((c) => c.lead).map((c) => c.name);
  const others = step.committees.filter((c) => !c.lead).map((c) => c.name);
  const authors = step.authors.filter((a) => a !== step.body);
  const label = [
    stepHeading(step),
    date,
    step.body,
    authors.length ? `Urheber: ${authors.join(', ')}` : null,
    ...step.decisions.map((d) => `Beschluss: ${decisionText(d)}`),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: spacing.md,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
      }}>
      <View accessible accessibilityLabel={label} style={{ gap: 2 }}>
        <AppText variant="small">{[date, step.body].filter(Boolean).join(' · ')}</AppText>
        <AppText style={{ fontWeight: '600' }}>{stepHeading(step)}</AppText>
        {authors.length ? <AppText variant="small">Urheber: {authors.join(', ')}</AppText> : null}
        {!compact && lead.length ? (
          <AppText variant="small">Federführender Ausschuss: {lead.join(', ')}</AppText>
        ) : null}
        {!compact && others.length ? (
          <AppText variant="small">Mitberatend: {others.join(', ')}</AppText>
        ) : null}
        {!compact && step.summary ? <AppText variant="small">{step.summary}</AppText> : null}
        {step.decisions.map((d, i) => (
          <AppText key={i} variant="small">
            Beschluss: {decisionText(d)}
          </AppText>
        ))}
      </View>
      {step.document?.url ? (
        <ExternalLink small url={step.document.url} label={`${step.document.label} (PDF) öffnen`} />
      ) : step.document ? (
        <AppText variant="small">{step.document.label}</AppText>
      ) : null}
    </View>
  );
}

/** Alle Schritte untereinander, chronologisch (wie geliefert). */
export function StepTimeline({ steps }: { steps: LegislationStep[] }) {
  return (
    <View style={{ gap: spacing.md }}>
      {steps.map((s) => (
        <StepEntry key={s.id} step={s} />
      ))}
    </View>
  );
}
