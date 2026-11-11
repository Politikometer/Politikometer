/**
 * Verbindet TanStack Query mit dem App-Zustand:
 * – Kommt die App in den Vordergrund, werden veraltete Daten der offenen Bildschirme neu geladen.
 * – Ohne Netz werden keine Anfragen gestellt (gespeicherte Daten bleiben sichtbar);
 *   sobald das Netz zurück ist, werden veraltete Daten automatisch aktualisiert.
 * Kein Intervall-Abruf: Neu geladen wird nur, was veraltet ist (siehe STALE_TIME).
 */
import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform, type AppStateStatus } from 'react-native';

let connected = false;

export function connectQueryToAppLifecycle(): void {
  if (connected || Platform.OS === 'web') return; // Web: TanStack nutzt Browser-Ereignisse.
  connected = true;

  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      setFocused(status === 'active');
    });
    return () => sub.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    // Nur „sicher offline“ zählt als offline; unbekannter Zustand blockiert keine Abrufe.
    const apply = (state: Network.NetworkState) => setOnline(state?.isConnected !== false);
    Network.getNetworkStateAsync().then(apply, () => undefined);
    const sub = Network.addNetworkStateListener(apply);
    return () => sub.remove();
  });
}
