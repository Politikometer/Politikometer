"""Erzeugt die Zuordnung Postleitzahl -> Bundestagswahlkreis(e).

Quellen (siehe docs/datenquellen.md):
- Wahlkreisgrenzen: Die Bundeswahlleiterin (dl-de/by-2-0)
- PLZ-Gebiete: OpenStreetMap über Overpass (ODbL 1.0)

Eine PLZ gehört zu jedem Wahlkreis, der mindestens MIN_SHARE ihrer Fläche abdeckt.
Ergebnis: app/assets/data/plz-wahlkreis.json

Aufruf:  tools/.venv/Scripts/python tools/plz-wahlkreis/build.py
Overpass-Antworten werden in cache/ gespeichert, damit erneute Läufe den Server nicht belasten.
"""

from __future__ import annotations

import io
import json
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

import shapefile
from shapely.geometry import LineString, shape
from shapely.ops import polygonize, unary_union
from shapely.strtree import STRtree

HERE = Path(__file__).parent
CACHE = HERE / "cache"
OUT = HERE.parent.parent / "app" / "assets" / "data" / "plz-wahlkreis.json"

USER_AGENT = "Politikometer-Build/0.1 (Lima Projects; politikometer@gmail.com)"
WK_URL = (
    "https://www.bundeswahlleiterin.de/dam/jcr/a3b60aa9-8fa5-4223-9fb4-0a3a3cebd7d1/"
    "btw25_geometrie_wahlkreise_vg250_shp_geo.zip"
)
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
STATES = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"]
MIN_SHARE = 0.01
PAUSE_SECONDS = 15  # Rücksicht auf den öffentlichen Overpass-Server

ATTRIBUTION = {
    "wahlkreise": (
        "© Die Bundeswahlleiterin, Statistisches Bundesamt, Wiesbaden 2024, "
        "Wahlkreiskarte für die Wahl zum 21. Deutschen Bundestag, "
        "Grundlage der Geoinformationen © Geobasis-DE / BKG 2024 "
        "(Datenlizenz Deutschland – Namensnennung 2.0)"
    ),
    "plz": "© OpenStreetMap-Mitwirkende (ODbL 1.0)",
    "lizenz": "Diese abgeleitete Datenbank steht unter der Open Database License (ODbL) 1.0.",
}


def http_get(url: str, data: bytes | None = None, timeout: int = 400) -> bytes:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def load_wahlkreise() -> list[dict]:
    CACHE.mkdir(exist_ok=True)
    zpath = CACHE / "wahlkreise.zip"
    if not zpath.exists():
        print("Lade Wahlkreisgrenzen …")
        zpath.write_bytes(http_get(WK_URL))
    with zipfile.ZipFile(zpath) as z:
        names = z.namelist()
        base = next(n[:-4] for n in names if n.lower().endswith(".shp"))
        reader = shapefile.Reader(
            shp=io.BytesIO(z.read(base + ".shp")),
            dbf=io.BytesIO(z.read(base + ".dbf")),
            shx=io.BytesIO(z.read(base + ".shx")),
            encoding="utf-8",
        )
        result = []
        for sr in reader.shapeRecords():
            rec = sr.record.as_dict()
            result.append(
                {
                    "nr": int(rec["WKR_NR"]),
                    "name": rec["WKR_NAME"],
                    "land": rec["LAND_NAME"],
                    "geom": shape(sr.shape.__geo_interface__).buffer(0),
                }
            )
    print(f"{len(result)} Wahlkreise geladen")
    return result


def load_postal_relations(state: str) -> list[dict]:
    path = CACHE / f"plz-{state}.json"
    if not path.exists():
        print(f"Lade PLZ-Gebiete für {state} von Overpass …")
        query = (
            f'[out:json][timeout:300];area["ISO3166-2"="DE-{state}"][admin_level=4]->.a;'
            "rel(area.a)[boundary=postal_code][postal_code];out geom;"
        )
        body = urllib.parse.urlencode({"data": query}).encode()
        last_error: Exception | None = None
        for attempt in range(6):
            url = OVERPASS_URLS[attempt % len(OVERPASS_URLS)]
            try:
                raw = http_get(url, data=body)
                # Nur gültige, nicht leere Antworten speichern. Ein Spiegelserver mit
                # veralteter Gebietsdatenbank liefert sonst stillschweigend 0 Ergebnisse.
                if not json.loads(raw).get("elements"):
                    raise ValueError("leere Antwort")
                path.write_bytes(raw)
                break
            except Exception as err:  # Overpass ist öffentlich und manchmal überlastet
                last_error = err
                wait = 30 * (attempt + 1)
                print(f"  Fehler bei {url}: {err} – neuer Versuch in {wait} s")
                time.sleep(wait)
        else:
            raise RuntimeError(f"Overpass für {state} nicht erreichbar") from last_error
        time.sleep(PAUSE_SECONDS)
    return json.loads(path.read_text(encoding="utf-8"))["elements"]


def relation_to_polygon(rel: dict):
    outer, inner = [], []
    for m in rel.get("members", []):
        if m.get("type") != "way" or "geometry" not in m:
            continue
        coords = [(p["lon"], p["lat"]) for p in m["geometry"]]
        if len(coords) < 2:
            continue
        (inner if m.get("role") == "inner" else outer).append(LineString(coords))
    if not outer:
        return None
    poly = unary_union(list(polygonize(unary_union(outer))))
    if inner:
        poly = poly.difference(unary_union(list(polygonize(unary_union(inner)))))
    return poly if not poly.is_empty else None


def main() -> int:
    wks = load_wahlkreise()
    tree = STRtree([w["geom"] for w in wks])

    plz_geoms: dict[str, list] = {}
    seen: set[int] = set()
    for state in STATES:
        for rel in load_postal_relations(state):
            if rel["id"] in seen:
                continue
            seen.add(rel["id"])
            code = rel.get("tags", {}).get("postal_code", "").strip()
            if len(code) != 5 or not code.isdigit():
                continue
            poly = relation_to_polygon(rel)
            if poly is not None:
                plz_geoms.setdefault(code, []).append(poly)

    mapping: dict[str, list[int]] = {}
    unmatched = []
    for code, polys in sorted(plz_geoms.items()):
        geom = unary_union(polys).buffer(0)
        total = geom.area
        if total == 0:
            continue
        shares = []
        for idx in tree.query(geom):
            w = wks[int(idx)]
            share = geom.intersection(w["geom"]).area / total
            if share > 0:
                shares.append((share, w["nr"]))
        shares.sort(reverse=True)
        chosen = [nr for s, nr in shares if s >= MIN_SHARE] or [nr for _, nr in shares[:1]]
        if chosen:
            mapping[code] = sorted(chosen)
        else:
            unmatched.append(code)

    out = {
        "meta": {
            "erzeugt": date.today().isoformat(),
            "methode": f"Flächenverschneidung, Mindestanteil {int(MIN_SHARE * 100)} %",
            "quellen": ATTRIBUTION,
        },
        "wahlkreise": {str(w["nr"]): {"name": w["name"], "land": w["land"]} for w in sorted(wks, key=lambda w: w["nr"])},
        "plz": mapping,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    multi = sum(1 for v in mapping.values() if len(v) > 1)
    covered = {nr for v in mapping.values() for nr in v}
    print(f"{len(mapping)} PLZ zugeordnet, davon {multi} mit mehreren Wahlkreisen")
    print(f"{len(covered)} von {len(wks)} Wahlkreisen abgedeckt; ohne Treffer: {unmatched[:20]}")
    print(f"Geschrieben: {OUT} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
