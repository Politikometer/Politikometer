import { View } from 'react-native';

import { AppText } from '@/ui/components/AppText';

/** Beschriftung und Wert; Screenreader lesen beides zusammen vor. */
export function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="small">{label}</AppText>
      <AppText>{String(value)}</AppText>
    </View>
  );
}
