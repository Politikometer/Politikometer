# Lizenz der Datei `plz-wahlkreis.json`

Die Datei `plz-wahlkreis.json` in diesem Ordner (Zuordnung Postleitzahl → Bundestagswahlkreis) ist eine
**abgeleitete Datenbank**. Sie steht **nicht** unter der MIT-Lizenz des übrigen Quellcodes, sondern unter der

**Open Database License (ODbL) 1.0** – <https://opendatacommons.org/licenses/odbl/1-0/>

Die einzelnen Inhalte der Datenbank stehen unter der Database Contents License (DbCL) 1.0 –
<https://opendatacommons.org/licenses/dbcl/1-0/>.

Bereitgestellt von Lima Projects (Politikometer). Du darfst die Datenbank unter den Bedingungen der ODbL
nutzen, verändern und weitergeben. Wenn du sie öffentlich nutzt oder eine abgeleitete Datenbank weitergibst,
musst du auf diese Lizenz hinweisen, die Quellen nennen und abgeleitete Datenbanken ebenfalls unter der ODbL
bereitstellen.

## Quellen (Namensnennung)

- **Postleitzahlgebiete:** © OpenStreetMap-Mitwirkende, verfügbar unter der ODbL 1.0 –
  <https://www.openstreetmap.org/copyright>
- **Wahlkreisgrenzen:** © Die Bundeswahlleiterin, Statistisches Bundesamt, Wiesbaden 2024, Wahlkreiskarte für
  die Wahl zum 21. Deutschen Bundestag, Grundlage der Geoinformationen © Geobasis-DE / BKG 2024.
  Lizenz: Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0) –
  <https://www.govdata.de/dl-de/by-2-0>.
  Datensatz: <https://www.bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html>
  (Datei `btw25_geometrie_wahlkreise_vg250_shp_geo.zip`).
  **Verändert:** Die Wahlkreisgrenzen wurden mit den Postleitzahlgebieten verschnitten; gespeichert ist nur,
  welche Wahlkreise mindestens 1 % der Fläche einer Postleitzahl abdecken.

## Herkunft und Erzeugung

- Erzeugt mit dem Skript `tools/plz-wahlkreis/build.py` (Python) im Quellcode dieses Projekts.
  Verfahren: Flächenverschneidung der PLZ-Gebiete (OpenStreetMap, über die Overpass-API) mit den
  Wahlkreisgrenzen; Mindestanteil 1 %. Stand und Quellenangaben stehen auch im Feld `meta` der Datei.
- Die Datei ist in maschinenlesbarer Form Teil des Quellcodes (`app/assets/data/plz-wahlkreis.json`) und
  wird mit der App ausgeliefert. Der Quellcode wird mit der Veröffentlichung der App öffentlich bereitgestellt;
  bis dahin auf Anfrage bei Lima Projects (siehe Impressum der App).

Siehe auch `docs/datenquellen.md`.
