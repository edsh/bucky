#!/usr/bin/env python3
"""Doppelte Pruefung der digitalisierten POH-Tabellen von D-EELK.

Constitution Prinzip I / Spec FR-002 verlangen, dass die digitalisierten Werte
gegen das Original doppelt geprueft werden, bevor sie fuer Berechnungen
verwendet werden. Dieses Skript leistet das maschinell auf drei Wegen:

1. UNABHAENGIGE ZWEITEXTRAKTION
   Die JSON-Dateien entstehen aus `pdftotext -layout` (spaltenerhaltend).
   Hier wird das PDF erneut gelesen, diesmal mit `pdftotext -raw`
   (voellig anderer Textordnungs-Algorithmus). Jeder einzelne Wert muss in
   beiden Pfaden identisch sein.

2. SEITEN-/QUELLENPRUEFUNG
   Fuer jede Tabelle wird geprueft, dass die referenzierte POH-Seitenzahl und
   die Abbildungsnummer tatsaechlich auf der referenzierten PDF-Seite stehen
   und dass die Seite zu Abschnitt 5b (Propeller MTV-6-A/190-69) gehoert.

3. PLAUSIBILITAETS-/KONSISTENZPRUEFUNG
   Physikalische bzw. dokumentinterne Invarianten, u. a.:
   - l/h zu US gal/h passt zur Umrechnung 1 US gal = 3,785411784 l
   - Vy ist ueber die gesamte Steigtabelle konstant
   - Druckhoehen-, Temperatur- und Lastraster sind vollstaendig/monoton
   - Strecke ueber Hindernis > Startlauf
   - Reichweite ~ KTAS * Flugdauer, Flugdauer ~ ausfliegbarer Kraftstoff / Verbrauch

Aufruf:
    python3 tools/poh/verify_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf

Exit-Code 0 = alle Pruefungen bestanden.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_d_eelk as ex  # noqa: E402

USGAL_IN_L = 3.785411784


class Report:
    def __init__(self) -> None:
        self.checks = 0
        self.failures: list[str] = []

    def check(self, ok: bool, msg: str) -> None:
        self.checks += 1
        if not ok:
            self.failures.append(msg)


def raw_pages(pdf: Path) -> list[str]:
    if shutil.which("pdftotext") is None:
        sys.exit("pdftotext (poppler) wird benoetigt: brew install poppler")
    out = subprocess.run(
        ["pdftotext", "-raw", str(pdf), "-"], check=True, capture_output=True
    ).stdout.decode("utf-8", "replace")
    return out.split("\f")


def verify_second_extraction(table: dict, pages: list[str], rep: Report) -> None:
    data_pages = [
        p["pdf_page"] for p in table["source"]["pages"] if "Tabellenwerte" in p["role"]
    ]
    texts = [pages[p - 1] for p in data_pages]
    tdef = {"figure": table["figure"]}
    try:
        rows = ex.PARSERS[table["kind"]](texts, tdef)
    except Exception as exc:  # noqa: BLE001
        rep.check(False, f"{table['id']}: Zweitextraktion fehlgeschlagen: {exc}")
        return
    rep.check(
        len(rows) == len(table["rows"]),
        f"{table['id']}: Zeilenzahl weicht ab "
        f"(layout={len(table['rows'])}, raw={len(rows)})",
    )
    for i, (a, b) in enumerate(zip(table["rows"], rows)):
        if a != b:
            rep.check(False, f"{table['id']}: Zeile {i} weicht ab\n  layout={a}\n  raw  ={b}")
            return
    rep.check(True, "")


def verify_source_reference(table: dict, pages: list[str], rep: Report) -> None:
    import re

    for page in table["source"]["pages"]:
        text = pages[page["pdf_page"] - 1]
        label = ex.poh_page_label(text)
        rep.check(
            label == page["poh_page"],
            f"{table['id']}: POH-Seite {page['poh_page']} steht nicht auf "
            f"PDF-Seite {page['pdf_page']} (gefunden: {label})",
        )
        rep.check(
            (label or "").startswith("5b-"),
            f"{table['id']}: Seite {label} gehoert nicht zu Abschnitt 5b",
        )
    caption_pdf = [
        p["pdf_page"] for p in table["source"]["pages"] if "Tabellenwerte" in p["role"]
    ][-1]
    fig = table["figure"].replace("Abb. ", "")
    rep.check(
        bool(re.search(r"Abb\.?\s*" + re.escape(fig), pages[caption_pdf - 1])),
        f"{table['id']}: {table['figure']} nicht auf PDF-Seite {caption_pdf} gefunden",
    )
    rep.check(
        table["applicability"]["propeller"] == "MTV-6-A/190-69",
        f"{table['id']}: falscher Propeller in applicability",
    )
    rep.check(
        bool(table["source"]["citation"]) and bool(table["table_name"]),
        f"{table['id']}: Quellenangabe/Tabellenname fehlt",
    )


def verify_consistency(table: dict, rep: Report) -> None:
    rows = table["rows"]
    tid = table["id"]
    alts = sorted({r["pressure_altitude_ft"] for r in rows})
    rep.check(alts == sorted(alts), f"{tid}: Druckhoehen nicht sortierbar")

    if table["kind"] == "takeoff_distance":
        rep.check(
            alts == ex.TAKEOFF_ALTITUDES,
            f"{tid}: Druckhoehenraster unvollstaendig: {alts}",
        )
        temps = sorted({r["oat_c"] for r in rows})
        rep.check(
            temps == sorted(ex.TAKEOFF_TEMPS),
            f"{tid}: Temperaturraster unvollstaendig: {temps}",
        )
        rep.check(
            len(rows) == len(alts) * len(temps),
            f"{tid}: Raster nicht vollstaendig gefuellt ({len(rows)} Zeilen)",
        )
        for r in rows:
            rep.check(
                r["over_obstacle"] > r["ground_roll"] > 0,
                f"{tid}: unplausibel bei {r['pressure_altitude_ft']} ft / "
                f"{r['oat_c']} degC: {r}",
            )
        # Steigende Hoehe und steigende Temperatur verlaengern die Strecke.
        for temp in temps:
            series = [
                r for r in sorted(rows, key=lambda x: x["pressure_altitude_ft"])
                if r["oat_c"] == temp
            ]
            for a, b in zip(series, series[1:]):
                rep.check(
                    b["ground_roll"] > a["ground_roll"],
                    f"{tid}: Startlauf faellt mit der Hoehe bei {temp} degC",
                )
        for alt in alts:
            series = [r for r in sorted(rows, key=lambda x: x["oat_c"]) if r["pressure_altitude_ft"] == alt]
            for a, b in zip(series, series[1:]):
                rep.check(
                    b["ground_roll"] > a["ground_roll"],
                    f"{tid}: Startlauf faellt mit der Temperatur bei {alt} ft",
                )

    elif table["kind"] == "climb_rate":
        rep.check(
            alts == ex.CLIMB_ALTITUDES, f"{tid}: Druckhoehenraster unvollstaendig: {alts}"
        )
        temps = sorted({r["oat_c"] for r in rows})
        rep.check(
            temps == sorted(ex.CLIMB_TEMPS),
            f"{tid}: Temperaturraster unvollstaendig: {temps}",
        )
        vys = {r["vy_kias"] for r in rows}
        rep.check(len(vys) == 1, f"{tid}: Vy nicht konstant: {sorted(vys)}")
        rep.check(
            all(60 <= v <= 80 for v in vys), f"{tid}: Vy unplausibel: {sorted(vys)}"
        )
        for temp in temps:
            series = [
                r for r in sorted(rows, key=lambda x: x["pressure_altitude_ft"])
                if r["oat_c"] == temp
            ]
            for a, b in zip(series, series[1:]):
                rep.check(
                    b["rate_of_climb_fpm"] < a["rate_of_climb_fpm"],
                    f"{tid}: Steigrate steigt mit der Hoehe bei {temp} degC",
                )

    elif table["kind"] == "climb_time_distance_fuel":
        rep.check(
            alts == ex.CLIMB_ALTITUDES, f"{tid}: Druckhoehenraster unvollstaendig: {alts}"
        )
        vys = {r["vy_kias"] for r in rows}
        rep.check(len(vys) == 1, f"{tid}: Vy nicht konstant: {sorted(vys)}")
        ordered = sorted(rows, key=lambda r: r["pressure_altitude_ft"])
        rep.check(
            ordered[0]["time_min"] == 0.0
            and ordered[0]["distance_nm"] == 0.0
            and ordered[0]["fuel_l"] == 0.0,
            f"{tid}: Startwerte auf 0 ft sind nicht null",
        )
        for a, b in zip(ordered, ordered[1:]):
            rep.check(
                b["time_min"] >= a["time_min"]
                and b["distance_nm"] >= a["distance_nm"]
                and b["fuel_l"] >= a["fuel_l"],
                f"{tid}: kumulative Werte fallen bei {b['pressure_altitude_ft']} ft",
            )
            rep.check(
                b["oat_c"] == a["oat_c"] - 2,
                f"{tid}: ISA-Temperaturreihe (-2 degC/1000 ft) verletzt bei "
                f"{b['pressure_altitude_ft']} ft",
            )
        for r in rows:
            expect = round(r["fuel_l"] / USGAL_IN_L, 1)
            rep.check(
                abs(expect - r["fuel_usgal"]) <= 0.15,
                f"{tid}: {r['fuel_l']} l != {r['fuel_usgal']} US gal "
                f"(erwartet ca. {expect}) bei {r['pressure_altitude_ft']} ft",
            )

    elif table["kind"] == "cruise_performance":
        loads = sorted({r["power_setting_pct"] for r in rows}, reverse=True)
        rep.check(
            loads == [100, 90, 80, 70, 60, 50],
            f"{tid}: Lastraster unerwartet: {loads}",
        )
        rep.check(
            alts == [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000],
            f"{tid}: Druckhoehenraster unerwartet: {alts}",
        )
        # Verbrauch haengt im POH nur von der Lasteinstellung ab, nicht von der Hoehe.
        by_load: dict[int, set[float]] = {}
        for r in rows:
            by_load.setdefault(r["power_setting_pct"], set()).add(r["fuel_flow_lph"])
        for load, values in by_load.items():
            rep.check(
                len(values) == 1,
                f"{tid}: Verbrauch bei {load}% nicht eindeutig: {sorted(values)}",
            )
        for r in rows:
            expect = round(r["fuel_flow_lph"] / USGAL_IN_L, 1)
            rep.check(
                abs(expect - r["fuel_flow_usgph"]) <= 0.15,
                f"{tid}: {r['fuel_flow_lph']} l/h != {r['fuel_flow_usgph']} US gal/h "
                f"(erwartet ca. {expect})",
            )
            rep.check(
                r["ktas"] < r["mph"] < r["ktas"] * 1.2,
                f"{tid}: KTAS/mph unplausibel: {r}",
            )
            # Reichweite und Flugdauer sind laut Anmerkung 2 der Tabelle keine
            # reinen Reiseflugwerte: die Reichweite enthaelt zusaetzlich die
            # Steigflugstrecke, die Flugdauer beruecksichtigt 4 l fuer Start/
            # Rollen, den Steigflug und 45 min Reserve. Geprueft wird daher nur
            # der belastbare Rahmen, nicht die POH-interne Rechenformel.
            # Untergrenze unter Beruecksichtigung der Tabellenrundung
            # (KTAS auf 1 kt, Flugdauer auf 0,1 h gerundet).
            lower_nm = (r["ktas"] - 0.5) * (r["endurance_h"] - 0.05)
            upper_nm = 1.35 * r["ktas"] * r["endurance_h"]
            rep.check(
                lower_nm <= r["range_nm"] <= upper_nm,
                f"{tid}: Reichweite {r['range_nm']} NM ausserhalb des Rahmens "
                f"[{lower_nm:.0f}; {upper_nm:.0f}] NM "
                f"({r['ktas']} KTAS x {r['endurance_h']} h)",
            )
            usable = table["applicability"]["usable_fuel_l"]
            gross_h = usable / r["fuel_flow_lph"]
            rep.check(
                0.55 * gross_h <= r["endurance_h"] < gross_h,
                f"{tid}: Flugdauer {r['endurance_h']} h unplausibel zu "
                f"{usable} l / {r['fuel_flow_lph']} l/h (= {gross_h:.1f} h brutto)",
            )
        # Hoehere Last => hoeherer Verbrauch, kuerzere Reichweite.
        for alt in alts:
            series = sorted(
                [r for r in rows if r["pressure_altitude_ft"] == alt],
                key=lambda r: r["power_setting_pct"],
            )
            for a, b in zip(series, series[1:]):
                rep.check(
                    b["fuel_flow_lph"] > a["fuel_flow_lph"]
                    and b["range_nm"] < a["range_nm"],
                    f"{tid}: Last/Verbrauch/Reichweite inkonsistent bei {alt} ft",
                )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    args = ap.parse_args()

    pdf = args.pdf.expanduser()
    if not pdf.is_file():
        sys.exit(f"PDF nicht gefunden: {pdf}")
    digest = ex.sha256_of(pdf)
    if digest != ex.EXPECTED_PDF_SHA256:
        sys.exit(
            f"SHA256 des PDF weicht ab.\n  erwartet: {ex.EXPECTED_PDF_SHA256}\n"
            f"  gefunden: {digest}"
        )

    index = json.loads((ex.OUT_DIR / "index.json").read_text(encoding="utf-8"))
    pages_layout = ex.pdf_pages(pdf)
    pages_raw = raw_pages(pdf)

    rep = Report()
    print(f"PDF-SHA256 ok: {digest}")
    print(f"Pruefe {len(index['tables'])} Tabellen (Abschnitt 5b, "
          f"Propeller {index['aircraft']['propeller']})\n")

    for entry in index["tables"]:
        table = json.loads(
            (ex.OUT_DIR / entry["file"]).read_text(encoding="utf-8")
        )
        before = len(rep.failures)
        verify_source_reference(table, pages_layout, rep)
        verify_second_extraction(table, pages_raw, rep)
        verify_consistency(table, rep)
        status = "OK  " if len(rep.failures) == before else "FEHL"
        print(
            f"  [{status}] {table['id']:42s} {table['row_count']:4d} Zeilen  "
            f"Seite {'/'.join(table['source']['poh_pages'])}  {table['figure']}"
        )

    print(f"\n{rep.checks} Einzelpruefungen, {len(rep.failures)} Abweichungen")
    for f in rep.failures:
        print("  ! " + f)
    return 1 if rep.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
