import { PROVIDER } from '@/config/provider';

/**
 * Kennung, die bei jeder Anfrage mitgeht. Wikimedia (Wikidata) lehnt die Android-Standardkennung
 * „okhttp/…“ mit HTTP 403 ab und verlangt eine Kontaktangabe. Enthält keine Daten der Nutzenden.
 * Name und E-Mail kommen aus `config/provider.ts`.
 */
export const USER_AGENT = `Politikometer/0.1 (${PROVIDER.name}; ${PROVIDER.email})`;
