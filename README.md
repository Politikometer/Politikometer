# Politikometer

Eine unabhängige, werbefreie und quelloffene App, die Bürgerinnen und Bürgern in Deutschland zeigt, wer sie politisch vertritt und was diese Menschen im Mandat tun. Alle Angaben stammen aus offiziellen, öffentlichen Daten – mit Quelle und Abrufdatum. Keine Bewertungen, kein Tracking, kein Nutzerkonto.

Vorbild: [Politicômetro](https://politicometro.org) (Brasilien).

## Stand

**Meilenstein 1:** Postleitzahl eingeben → Bundestagswahlkreis → Bundestagsabgeordnete des Wahlkreises → Profil. Daten live von abgeordnetenwatch.de, offline aus dem Zwischenspeicher. Alle weiteren Schritte stehen in [docs/PLAN.md](docs/PLAN.md).

## Ordner

```
app/      Expo-App (React Native, TypeScript, Expo Router)
  src/app/          Screens (jede Datei = eine Route)
  src/domain/       internes Datenmodell, quellenunabhängig
  src/data/http/    HTTP-Client mit Drosselung und Neuversuchen
  src/data/sources/ ein Adapter pro Datenquelle (abgeordnetenwatch, lokale PLZ-Tabelle, …)
  src/data/repositories/  setzt Quellen zum Datenmodell zusammen
  src/state/        Zwischenspeicher (TanStack Query, auf dem Gerät gespeichert)
  src/ui/           Farben, Schrift, barrierearme Bausteine
  __tests__/        Tests der Datenschicht (mit echten API-Antworten als Testdaten)
tools/    Build-Skripte (Python), z. B. die Tabelle PLZ → Wahlkreis
docs/     Plan, Datenquellen und Lizenzen, Konzepte
```

## Entwickeln

Voraussetzungen: [Node.js LTS](https://nodejs.org) und ein Android-Gerät mit der App **Expo Go** oder der Android-Emulator aus [Android Studio](https://developer.android.com/studio).

```bash
cd app
npm install
npm start          # startet den Entwicklungsserver; QR-Code mit Expo Go scannen
npm run android    # öffnet direkt im Android-Emulator
```

Prüfen vor jedem Commit:

```bash
npm run check      # Typprüfung + Lint + Tests
```

## Tabelle PLZ → Wahlkreis neu erzeugen

Nur nötig, wenn sich Wahlkreise oder Postleitzahlen ändern. Das Skript lädt die amtlichen Wahlkreisgrenzen und die PLZ-Gebiete aus OpenStreetMap und verschneidet sie. Die Downloads werden in `tools/plz-wahlkreis/cache/` gespeichert. Ein erneuter Lauf belastet die Server deshalb nicht noch einmal.

```bash
python -m venv tools/.venv
tools/.venv/Scripts/pip install -r tools/plz-wahlkreis/requirements.txt   # Windows
tools/.venv/Scripts/python tools/plz-wahlkreis/build.py
```

Ergebnis: `app/assets/data/plz-wahlkreis.json`. Methodik und Grenzen: [docs/datenquellen.md](docs/datenquellen.md).

## Grundsätze

- Jede angezeigte Information verlinkt auf ihre Quelle und zeigt das Abrufdatum.
- Neutral: alphabetische Reihenfolge, keine Parteifarben, keine Wertungen.
- Barrierearm: skaliert mit der Systemschrift, hoher Kontrast, Screenreader-Beschriftungen, große Tippflächen.
- Datensparsam: Postleitzahl und Zwischenspeicher bleiben auf dem Gerät.
- Rate-Limits der Quellen werden eingehalten (abgeordnetenwatch: max. 20 statt erlaubter 30 Anfragen pro Minute).

## Lizenzen

- Code: [MIT](LICENSE)
- Tabelle PLZ → Wahlkreis: ODbL 1.0 (abgeleitet aus OpenStreetMap), Wahlkreisgrenzen © Die Bundeswahlleiterin (dl-de/by-2-0)
- Daten von abgeordnetenwatch.de: CC0 1.0
