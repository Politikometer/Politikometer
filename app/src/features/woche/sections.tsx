import { View } from 'react-native';

import type { PlenarySession, PollSummary, WeekOverview, WeekProceeding, WeekWindow } from '@/domain/legislation';
import { LegislationLink } from '@/features/gesetze/LegislationLink';
import { PollLink } from '@/features/gesetze/PollLink';
import { stepHeading } from '@/features/gesetze/StepTimeline';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

export function rangeText(w: Pick<WeekWindow, 'start' | 'end'>): string {
  return `${formatDate(w.start)} bis ${formatDate(w.end)}`;
}

/** Zeitraum und wie er gewählt wurde. */
export function WindowCard({ window }: { window: WeekWindow }) {
  return (
    <Card>
      <AppText variant="heading">Zeitraum: {rangeText(window)}</AppText>
      {window.kind === 'recentSittingWeek' ? (
        <AppText>
          Vom Montag der letzten Sitzungswoche des Bundestages bis heute – so fehlt kein Sitzungstag.
        </AppText>
      ) : null}
      {window.kind === 'lastSittingWeek' ? (
        <AppText>
          In den letzten 7 Tagen hat der Bundestag laut Parlamentsdokumentation nicht getagt – zum
          Beispiel wegen einer sitzungsfreien Woche, oder das Protokoll ist noch nicht erfasst.
          Gezeigt wird deshalb die letzte Woche mit einer Sitzung des Bundestages.
        </AppText>
      ) : null}
      {window.kind === 'noSessionFound' ? (
        <AppText>
          In den letzten Monaten ist keine Sitzung des Bundestages erfasst. Gezeigt werden die
          letzten 7 Tage.
        </AppText>
      ) : null}
      <AppText variant="small">
        Alle Einträge stammen aus amtlichen Quellen, werden nicht ausgewählt oder bewertet und stehen
        in zeitlicher Reihenfolge.
      </AppText>
    </Card>
  );
}

export function PollsSection({ polls }: { polls: PollSummary[] }) {
  if (polls.length === 0) {
    return (
      <Card>
        <AppText>In diesem Zeitraum gab es keine namentliche Abstimmung im Bundestag.</AppText>
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {polls.map((p) => (
        <PollLink key={p.id} poll={p} />
      ))}
    </View>
  );
}

function SessionItem({ s }: { s: PlenarySession }) {
  return (
    <Card>
      <View accessible accessibilityLabel={[formatDate(s.date), s.body, s.title, s.remark].filter(Boolean).join(', ')}>
        <AppText variant="small">{[formatDate(s.date), s.body].filter(Boolean).join(' · ')}</AppText>
        <AppText style={{ fontWeight: '600' }}>{s.title}</AppText>
        {s.remark ? <AppText variant="small">{s.remark}</AppText> : null}
      </View>
      {s.document.url ? (
        <ExternalLink small url={s.document.url} label={`${s.document.label} (PDF) öffnen`} />
      ) : (
        <AppText variant="small">{s.document.label}</AppText>
      )}
      <ExternalLink small url={s.source.url} label="Eintrag im DIP ansehen" />
    </Card>
  );
}

export function SessionsSection({ sessions }: { sessions: PlenarySession[] }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <AppText>Für diesen Zeitraum ist noch kein Plenarprotokoll erfasst.</AppText>
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {sessions.map((s) => (
        <SessionItem key={s.id} s={s} />
      ))}
    </View>
  );
}

function stepsText(p: WeekProceeding): string | null {
  if (p.steps.length === 0) return null;
  const parts = p.steps.map((s) => [stepHeading(s), s.body, formatDate(s.date)].filter(Boolean).join(', '));
  return `Im Zeitraum: ${[...new Set(parts)].join(' · ')}`;
}

/** Anzahl der Vorgänge; nennt nur dann eine Gesamtzahl, wenn tatsächlich Vorgänge fehlen. */
export function legislationCountText(
  data: Pick<WeekOverview, 'legislationGroups' | 'legislationTotal' | 'truncated' | 'stepsTruncated'>,
): string {
  const shown = data.legislationGroups.reduce((n, g) => n + g.items.length, 0);
  const parts = [`${shown} ${shown === 1 ? 'Vorgang' : 'Vorgänge'}`];
  if (data.truncated && data.legislationTotal > shown) {
    parts[0] += ` (von ${data.legislationTotal}; sehr viele Einträge – vollständig im DIP)`;
  }
  parts[0] += '.';
  if (data.stepsTruncated) {
    parts.push(
      'Wegen sehr vieler Einträge sind bei einzelnen Vorgängen nicht alle Schritte im Zeitraum aufgeführt – vollständig auf der Seite des Vorgangs bzw. im DIP.',
    );
  }
  parts.push('Gruppiert nach dem heutigen amtlichen Beratungsstand, Gruppen alphabetisch.');
  return parts.join(' ');
}

export function LegislationSection({ data }: { data: WeekOverview }) {
  if (data.legislationGroups.length === 0) {
    return (
      <Card>
        <AppText>In diesem Zeitraum sind keine Dokumente zu Gesetzgebungsvorgängen erfasst.</AppText>
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="small">{legislationCountText(data)}</AppText>
      {data.legislationGroups.map((g) => (
        <View key={g.status} style={{ gap: spacing.sm }}>
          <AppText variant="heading">
            {g.status} ({g.items.length})
          </AppText>
          {g.items.map((p) => (
            <LegislationLink
              key={p.id}
              id={p.id}
              title={p.title}
              subtitle={p.initiative.length ? `Initiative: ${p.initiative.join(', ')}` : null}
              detail={stepsText(p)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
