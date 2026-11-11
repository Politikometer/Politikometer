import { useRouter } from 'expo-router';

import { ListButton } from '@/ui/components/ListButton';

/**
 * Ziel für die Seite „Gesetz verfolgen“. Verwendung:
 *   router.push(legislationHref(vorgangId))
 * `id` ist die DIP-Vorgangs-ID (z. B. „338357“).
 */
export function legislationHref(id: string) {
  return { pathname: '/gesetz/[id]', params: { id } } as const;
}

/** Ganze Zeile, die die Seite „Gesetz verfolgen“ öffnet. */
export function LegislationLink({
  id,
  title,
  subtitle,
  detail,
}: {
  id: string;
  title: string;
  subtitle?: string | null;
  detail?: string | null;
}) {
  const router = useRouter();
  return (
    <ListButton
      title={title}
      subtitle={subtitle}
      detail={detail}
      hint="Öffnet den Ablauf dieses Gesetzgebungsvorgangs"
      onPress={() => router.push(legislationHref(id))}
    />
  );
}
