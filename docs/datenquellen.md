# Datenquellen

Geprüft am 26.10.2026. Vor jedem Release erneut prüfen.

## abgeordnetenwatch.de API v2

- **URL:** https://www.abgeordnetenwatch.de/api/v2/ · Doku: https://www.abgeordnetenwatch.de/api
- **Inhalt:** Parlamente (Bundestag, alle 16 Landtage, EU-Parlament), Wahlperioden, Politiker, Mandate/Kandidaturen, Wahlkreise, Wahllisten, Fraktionen, Ausschüsse, Abstimmungen, Stimmen, Nebentätigkeiten, Bürgerfragen.
- **Lizenz:** CC0 1.0 (wird in jeder Antwort unter `meta.abgeordnetenwatch_api.licence` mitgeliefert). Keine Namensnennung nötig – wir nennen die Quelle trotzdem, das schafft Vertrauen.
- **Bedingungen:** „Fair Use“.
- **Rate-Limit:** 30 Anfragen pro Minute pro IP-Adresse, bei Überschreitung HTTP 429. Massenabfragen nachts (22–6 Uhr) mit Pausen.
- **Umsetzung:** Drosselung im Client (max. 20/min), Retry nach 60 s bei 429, Cache: Abgeordnetenliste 24 h, Profile 24 h.
- **Hinweise aus Tests:**
  - Bundestag = `parliament` 5, aktuelle Wahlperiode 2025–2029 = `parliament_period` 161 (über `parliaments/5 → current_project` ermitteln, nicht fest einbauen).
  - Mandate verweisen teils auf Wahlkreis-IDs der Wahl-Periode (160), teils der Legislatur (161). **Abgleich deshalb über die Wahlkreisnummer**, nicht über die ID.
  - `electoral_data.mandate_won`: `constituency` (direkt), `list`, `moved_up` (nachgerückt).
  - Kein PLZ-Filter vorhanden → eigene PLZ-Zuordnung nötig (siehe unten).

## PLZ → Bundestagswahlkreis (eigene Tabelle)

Keine offizielle Quelle ordnet Postleitzahlen den Wahlkreisen zu. Wir berechnen das einmalig beim Build:

1. **Wahlkreisgrenzen:** Die Bundeswahlleiterin, Wahlkreiseinteilung BTW 2025, Shapefile WGS84.
   https://www.bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html
   Lizenz: Datenlizenz Deutschland – Namensnennung 2.0. Pflichtvermerk (wörtlich):
   „© Die Bundeswahlleiterin, Statistisches Bundesamt, Wiesbaden 2024, Wahlkreiskarte für die Wahl zum 21. Deutschen Bundestag, Grundlage der Geoinformationen © Geobasis-DE / BKG 2024“
2. **PLZ-Gebiete:** OpenStreetMap (`boundary=postal_code`), über die Overpass-API einmalig je Bundesland abgefragt.
   Lizenz: ODbL 1.0, Namensnennung „© OpenStreetMap-Mitwirkende“. Die abgeleitete Tabelle steht deshalb ebenfalls unter ODbL (Share-Alike) – das passt zu Open Source.
   (Die früher übliche Quelle suche-postleitzahl.org ist nicht mehr erreichbar.)
3. **Verschneidung:** Eine PLZ gehört zu jedem Wahlkreis, der mindestens 1 % ihrer Fläche abdeckt. Ergebnis: `plz → [Wahlkreisnummern]`. Liegt eine PLZ in mehreren Wahlkreisen, wählt die Person in der App aus.
- **Grenzen der Methode:** PLZ-Gebiete in OSM sind nicht amtlich; Fehler an Rändern sind möglich. Das erklärt die App offen auf der Seite „Methodik“.

## DIP – Dokumentations- und Informationssystem des Bundestags

- **URL:** https://search.dip.bundestag.de/api/v1/ · Hilfe: https://dip.bundestag.de/über-dip/hilfe/api
- **Inhalt:** Vorgänge, Drucksachen, Plenarprotokolle, Aktivitäten (Reden, Anfragen) mit Personenbezug.
- **Schlüssel:** Öffentlicher API-Key (gültig bis Ende 05/2027, kann bei Missbrauch kurzfristig getauscht werden). Eigener, dauerhafter Key formlos per E-Mail an parlamentsdokumentation@bundestag.de → **vor dem Release beantragen**.
- **Nutzungsbedingungen** (Stand 27.02.2023): Nutzung und Weiterverarbeitung frei. Pflichten:
  - Quelle angeben: **„Deutscher Bundestag/Bundesrat – DIP“**, bei Drucksachen/Protokollen zusätzlich „BT-Drs. <Nr.>“ bzw. „BT-PlPr. <Nr.>“.
  - Änderungen kenntlich machen; PDF-Originale nicht verändern.
  - **Keine Nutzung in sinnentstellendem Zusammenhang oder zur Herabwürdigung von Personen** – deckt sich mit unserem Neutralitätsprinzip.
- **Rate-Limit:** nicht beziffert; schonend nutzen, cachen.

## OParl (kommunale Ratsinformationssysteme)

- **Standard:** OParl 1.1, https://oparl.org · Spezifikation: https://dev.oparl.org
- **Inhalt:** Gremien, Personen, Sitzungen, Tagesordnungen, Vorlagen, Beschlüsse.
- **Verbreitung:** nur ein Teil der Kommunen bietet OParl an; kein zentrales, gepflegtes Verzeichnis. Liste der Endpunkte muss von uns gepflegt werden.
- **Lizenz:** je Kommune verschieden (im `System`/`Body`-Objekt oft als `license` angegeben) → pro Endpunkt prüfen und speichern.
- **Rate-Limits:** je Kommune verschieden, Server oft langsam → Grund für ein späteres Backend.

## Wikidata (Regierungen, Bürgermeister, Landräte)

- **URL:** https://query.wikidata.org/ (SPARQL)
- **Lizenz:** CC0 1.0.
- **Bedingungen:** User-Agent mit Kontakt gemäß Wikimedia-Richtlinie; Abfragen max. 60 s; keine parallelen Massenabfragen.
- **Qualität:** Bundes- und Landesregierungen gut gepflegt; Bürgermeister kleiner Gemeinden lückenhaft oder veraltet. Daher immer mit Stand und Link auf den Wikidata-Eintrag anzeigen und auf Lücken hinweisen.

## Landtage (eigene offene Daten)

Abgeordnete, Wahlkreise und Abstimmungen aller Landtage liefert bereits abgeordnetenwatch. Für die **Zuordnung PLZ → Landtagswahlkreis** brauchen wir pro Land die Wahlkreisgeometrie der jeweiligen Landeswahlleitung. Das wird in M4 je Land recherchiert und hier dokumentiert (Tabelle: Land, Quelle, Lizenz, Stand).

## Ergänzungen 30.10.2026

- **DIP:** höchstens 25 gleichzeitige Anfragen (Kurzdoku); weitere Limits nicht veröffentlicht – App drosselt auf 15/min. Schlüssel im Header `Authorization: ApiKey …`. Das Feld `funktion` der Person ist in echten Antworten eine Liste, laut OpenAPI ein Text. Personendaten enthalten keinen Amtszeitraum.
- **Wikidata (CC0):** amtierender Regierungschef über Q183, Eigenschaft P6 (Aussage ohne Endzeitpunkt). Drosselung 10/min, eigener `Api-User-Agent`.
- **abgeordnetenwatch:** `range_end` ist eine Anzahl (max. 1000 erprobt); ausgeschiedene Mandate werden nicht mehr ausgeliefert.

## Ergänzungen 05.11.2026

- **Wikidata – SPARQL-Endpunkt:** Das Bundeskabinett kommt aus `https://query.wikidata.org/sparql` (drei kleine Abfragen: amtierendes Kabinett Q183/P208, Mitglieder P527 mit Rolle und Ämter P39/P5054, Amtsaussagen seit Kabinettsbeginn; siehe `app/src/data/sources/wikidata/sparql.ts`). Zusätzlich die Wikibase-API `https://www.wikidata.org/w/api.php` (Kanzler/in, Labels). Bedingungen WDQS: 60 s Laufzeit je Abfrage, 5 parallele Abfragen je IP, 60 s Rechenzeit pro Minute je Client, 30 Fehler pro Minute. **Seit 05.11.2026 (anwaltliche Prüfung) ruft die App diese Endpunkte NICHT mehr auf** (keine Nutzer-IPs an die Wikimedia Foundation, USA): Das Build-Skript `tools/regierung/build.mjs` (`npm run regierung` im Ordner app) fragt sie beim Entwickeln ab (8 Anfragen, eigene Kennung, höchstens 10/min), wertet mit derselben Logik aus (`app/src/data/sources/wikidata/snapshot.ts`, `cabinet.ts`) und schreibt `app/assets/data/regierung.json` (Kanzler/in, Kabinett, Stand, CC0). Die App liest die Datei offline; Anzeige „Quelle: Wikidata (CC0 1.0), Stand: …“, ab 60 Tagen Hinweis „Stand möglicherweise veraltet“. Vor jedem Release neu erzeugen. DIP-Gegenprüfung, Aktivitäten, Gesetzentwürfe und abgeordnetenwatch-Profil-Links bleiben live.
- **DIP – Filter `f.ressort_fdf`:** Vorgänge lassen sich nach federführendem Ressort filtern (OpenAPI 1.5), z. B. `f.ressort_fdf=Bundeskanzleramt`. Genutzt für „Gesetzentwürfe aus dem Ressort“ zusammen mit `f.initiative=Bundesregierung` und `f.vorgangstyp=Gesetzgebung`.
- **DIP – mehrere Einträge pro Person:** DIP führt eine Person oft mehrfach – je Regierungsamt (Funktion „Bundesmin.“ mit `ressort`) und als Abgeordnete/r („MdB“); Aktivitäten als Ministerin/Minister hängen teils am MdB-Eintrag. Die App fragt deshalb alle Einträge gemeinsam ab (`f.person_id` mehrfach = ODER). Es gibt aber auch **verschiedene Personen gleichen Namens** (echtes Beispiel: „Alois Rainer“, MdB WP 5–9, und „Alois Rainer“, Bundesminister WP 18–21). Zusammengeführt wird nur bei gleichem Namen, gleichem ersten Vornamen, Eintrag in der aktuellen Wahlperiode und höchstens einem Eintrag ohne Regierungsfunktion; sonst „keine eindeutige Angabe“ (`app/src/data/sources/dip/government.ts`).
- **DIP – Gegenprüfung der Regierungsmitglieder:** Ein Kabinettsmitglied laut Wikidata wird nur angezeigt, wenn DIP für dieselbe Person die passende Funktion führt. Echte Werte (05.11.2026): „Bundeskanzl.“ (Merz), „Bundesmin.“ (Regelfall), „Bundesmin. f. besondere Aufgaben“ (Chef des Bundeskanzleramtes, Frei), „Bundesmin. f. besondere Aufgaben und Ch. des Bundeskanzleramtes“ (zweiter Eintrag Warken), „Staatsmin.“ (Staatsminister/innen). **Ausnahme Stand 05.11.2026:** Verena Hubertz ist in DIP nur als „MdB“ geführt (Ressort nur in `person_roles`) → in der App „keine eindeutige Angabe“, bis DIP den Eintrag ergänzt. Abfrage für das ganze Kabinett in **einer** Anfrage: `f.person` mehrfach = ODER (live geprüft; 18 Nachnamen → 74 Treffer auf einer Seite).
- **expo-network – Berechtigungen:** Das Paket bringt beim Android-Build `ACCESS_NETWORK_STATE` **und** `ACCESS_WIFI_STATE` mit (`node_modules/expo-network/android/src/main/AndroidManifest.xml`), zusätzlich zu `INTERNET`. Beides sind „normale“ Berechtigungen ohne Abfrage bei den Nutzenden; die App liest nur, ob eine Verbindung besteht. (Korrektur zum Protokoll vom 30.10.2026, dort stand „nur INTERNET“.) Ob `ACCESS_WIFI_STATE` per `blockedPermissions` entfernt werden kann, ist am Gerät zu prüfen.
- **Lizenzen der Abhängigkeiten:** `app/assets/data/licenses.json`, erzeugt mit `npm run licenses` (`tools/licenses/build.mjs`) aus den Source-Maps der App-Bundles und den nativen Paketen des Produktionsbaums. Vor jedem Release neu erzeugen.
