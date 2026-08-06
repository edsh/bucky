#!/usr/bin/env python3
"""Deterministische Digitalisierung der POH-Leistungstabellen von D-EELK.

Quelle: "Anhang Flughandbuch (Reims) Cessna (F)172 N&P mit TAE 125-02-114
Installation", Ausgabe 2 (Technify Motors GmbH, EASA STC 10014287).

WICHTIG — Abschnittswahl: Das Handbuch enthaelt die Leistungsdaten doppelt,
einmal je Propellertyp:
  * Abschnitt 5a  -> Propeller MTV-6-A/187-129   (NICHT fuer D-EELK)
  * Abschnitt 5b  -> Propeller MTV-6-A/190-69    (D-EELK)
Digitalisiert wird ausschliesslich Abschnitt 5b. Jede erzeugte Tabelle traegt
den Abschnitt, den Propellertyp und die POH-Seitenzahl explizit mit.

Das Skript liest das Original-PDF, extrahiert den Text seitenweise mit
`pdftotext -layout` und parst daraus die Leistungstabellen. Jede Tabelle wird
als eigene JSON-Datei abgelegt und traegt eine vollstaendige Quellenreferenz
(POH-Seitenzahl, PDF-Seitenzahl, Abbildungsnummer, Tabellenname, Ausgabe/
Aenderung) — siehe Constitution Prinzip I.

Aufruf:
    python3 tools/poh/extract_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf

Das Skript ist idempotent: gleiches PDF => bitgleiche Ausgabe.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "data" / "poh" / "d-eelk"
TABLES_DIR = OUT_DIR / "tables"

EXPECTED_PDF_SHA256 = (
    "ac12813c0e1ecca1e406607dc5b2beb2ec1dc3a0150d54af808c909de6d0d598"
)

DOCUMENT = {
    "id": "tae125-02-114-anhang-fhb-ausgabe-2",
    "title": (
        "Anhang Flughandbuch fuer (Reims) Cessna (F)172 N&P "
        "mit TAE 125-02-114 Installation"
    ),
    "kind": "Flughandbuch-Anhang (Motorumruestung)",
    "publisher": "Technify Motors GmbH, St. Egidien",
    "issue": "Ausgabe 2",
    "approval": "EASA STC 10014287",
    "language": "de",
    "file_name": "FHB-C-172N-P-2-7.pdf",
    "sha256": EXPECTED_PDF_SHA256,
    "note": (
        "Dieser Anhang ersetzt/ergaenzt das EASA-anerkannte Original-Flughandbuch "
        "nur im hier beschriebenen Umfang. Nicht beruehrte Betriebsgrenzen, "
        "Verfahren, Leistungen und Beladungsanweisungen des Original-Flughandbuchs "
        "bleiben gueltig (z. B. Landestrecke, siehe Seite 5-6)."
    ),
}

# Nur der fuer D-EELK gueltige Abschnitt wird digitalisiert.
SECTION = "5b"
SECTION_FIRST_PDF_PAGE = 127  # PDF-Seite von "Seite 5b-1"
PROPELLER = "MTV-6-A/190-69"
PROPELLER_NOTE = (
    "Abschnitt 5b gilt laut POH (Seite 5b-1) nur fuer Flugzeuge mit Propeller "
    "MTV-6-A/190-69. D-EELK hat diesen Propeller. Der parallele Abschnitt 5a "
    "(Propeller MTV-6-A/187-129) ist fuer D-EELK NICHT anwendbar und wurde "
    "bewusst nicht digitalisiert."
)

# Tabellendefinitionen, relativ zur Abschnittsseite (5b-N).
# cond_page: Seite mit Bedingungen/Anmerkungen, data_pages: Seiten mit Zahlenwerten.
TABLE_DEFS = [
    {
        "key": "takeoff-distance-m-1043kg",
        "figure": "Abb. 5-1a",
        "name": "Roll- und Startstrecke [m] bei Abfluggewicht 1043 kg (2300 lbs)",
        "kind": "takeoff_distance",
        "cond_page": 2,
        "data_pages": [3],
        "unit": "m",
        "obstacle_label": "15 m Hindernis",
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "takeoff-distance-ft-1043kg",
        "figure": "Abb. 5-1b",
        "name": "Roll- und Startstrecke [ft] bei Abfluggewicht 1043 kg (2300 lbs)",
        "kind": "takeoff_distance",
        "cond_page": 2,
        "data_pages": [4],
        "unit": "ft",
        "obstacle_label": "50 ft Hindernis",
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "takeoff-distance-m-1089kg",
        "figure": "Abb. 5-1c",
        "name": (
            "Roll- und Startstrecke [m] bei Abfluggewicht 1089 kg (2400 lbs) "
            "(nur Cessna 172P)"
        ),
        "kind": "takeoff_distance",
        "cond_page": 5,
        "data_pages": [6],
        "unit": "m",
        "obstacle_label": "15 m Hindernis",
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "models": ["F172P"],
    },
    {
        "key": "takeoff-distance-ft-1089kg",
        "figure": "Abb. 5-1d",
        "name": (
            "Roll- und Startstrecke [ft] bei Abfluggewicht 1089 kg (2400 lbs) "
            "(nur Cessna 172P)"
        ),
        "kind": "takeoff_distance",
        "cond_page": 5,
        "data_pages": [7],
        "unit": "ft",
        "obstacle_label": "50 ft Hindernis",
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "models": ["F172P"],
    },
    {
        "key": "climb-rate-1043kg",
        "figure": "Abb. 5-2a",
        "name": "Maximale Steigrate bei Abfluggewicht 1043 kg (2300 lbs)",
        "kind": "climb_rate",
        "cond_page": 8,
        "data_pages": [8],
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "climb-rate-1089kg",
        "figure": "Abb. 5-2b",
        "name": "Maximale Steigrate bei 1089 kg (2400 lbs) (nur Cessna 172P)",
        "kind": "climb_rate",
        "cond_page": 9,
        "data_pages": [9],
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "models": ["F172P"],
    },
    {
        "key": "climb-time-dist-fuel-1043kg",
        "figure": "Abb. 5-3a",
        "name": (
            "Zeit, Strecke und Kraftstoffmenge fuer den Steigflug, "
            "Abfluggewicht 1043 kg (2300 lbs)"
        ),
        "kind": "climb_time_distance_fuel",
        "cond_page": 10,
        "data_pages": [11],
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "climb-time-dist-fuel-1089kg",
        "figure": "Abb. 5-3b",
        "name": (
            "Zeit, Strecke und Kraftstoffmenge fuer den Steigflug, "
            "Abfluggewicht 1089 kg (2400 lbs) (nur Cessna 172P)"
        ),
        "kind": "climb_time_distance_fuel",
        "cond_page": 12,
        "data_pages": [13],
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "models": ["F172P"],
    },
    {
        "key": "cruise-standard-1043kg",
        "figure": "Abb. 5-4a",
        "name": (
            "Reiseleistung, Reichweite und Flugdauer mit Standardtanks, "
            "Fluggewicht 1043 kg (2300 lbs)"
        ),
        "kind": "cruise_performance",
        "cond_page": 14,
        "data_pages": [15, 16],
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "tank": "standard",
        "usable_fuel_l": 127.4,
        "usable_fuel_usgal": 33.6,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "cruise-longrange-1043kg",
        "figure": "Abb. 5-4b",
        "name": (
            "Reiseleistung, Reichweite und Flugdauer mit Langstreckentanks, "
            "Fluggewicht 1043 kg (2300 lbs)"
        ),
        "kind": "cruise_performance",
        "cond_page": 17,
        "data_pages": [18, 19],
        "weight_kg": 1043,
        "weight_lbs": 2300,
        "tank": "long_range",
        "usable_fuel_l": 158.6,
        "usable_fuel_usgal": 41.9,
        "models": ["F172N", "F172P"],
    },
    {
        "key": "cruise-standard-1089kg",
        "figure": "Abb. 5-4c",
        "name": (
            "Reiseleistung, Reichweite und Flugdauer mit Standardtanks, "
            "Fluggewicht 1089 kg (2400 lbs) (nur Cessna 172P)"
        ),
        "kind": "cruise_performance",
        "cond_page": 20,
        "data_pages": [21, 22],
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "tank": "standard",
        "usable_fuel_l": 127.4,
        "usable_fuel_usgal": 33.6,
        "models": ["F172P"],
    },
    {
        "key": "cruise-longrange-1089kg",
        "figure": "Abb. 5-4d",
        "name": (
            "Reiseleistung, Reichweite und Flugdauer mit Langstreckentanks, "
            "Fluggewicht 1089 kg (2400 lbs) (nur Cessna 172P)"
        ),
        "kind": "cruise_performance",
        "cond_page": 23,
        "data_pages": [24, 25],
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "tank": "long_range",
        "usable_fuel_l": 158.6,
        "usable_fuel_usgal": 41.9,
        "models": ["F172P"],
    },
    {
        "key": "cruise-integral-1089kg",
        "figure": "Abb. 5-4e",
        "name": (
            "Reiseleistung, Reichweite und Flugdauer mit Integraltanks, "
            "Fluggewicht 1089 kg (2400 lbs) (nur Cessna 172P)"
        ),
        "kind": "cruise_performance",
        "cond_page": 26,
        "data_pages": [27, 28],
        "weight_kg": 1089,
        "weight_lbs": 2400,
        "tank": "integral",
        "usable_fuel_l": 196.8,
        "usable_fuel_usgal": 52.0,
        "models": ["F172P"],
    },
]

COLUMNS = {
    "takeoff_distance": [
        {"key": "pressure_altitude_ft", "label": "Druckhoehe", "unit": "ft"},
        {"key": "oat_c", "label": "Umgebungstemperatur", "unit": "degC"},
        {"key": "ground_roll", "label": "Startlauf (Gnd Roll)", "unit": None},
        {"key": "over_obstacle", "label": "Strecke ueber Hindernis", "unit": None},
    ],
    "climb_rate": [
        {"key": "pressure_altitude_ft", "label": "Druckhoehe", "unit": "ft"},
        {"key": "vy_kias", "label": "Vy", "unit": "KIAS"},
        {"key": "oat_c", "label": "Umgebungstemperatur", "unit": "degC"},
        {"key": "rate_of_climb_fpm", "label": "Steiggeschwindigkeit", "unit": "ft/min"},
    ],
    "climb_time_distance_fuel": [
        {"key": "pressure_altitude_ft", "label": "Druckhoehe", "unit": "ft"},
        {"key": "oat_c", "label": "OAT (ISA)", "unit": "degC"},
        {"key": "vy_kias", "label": "Vy", "unit": "KIAS"},
        {"key": "rate_of_climb_fpm", "label": "Steigrate", "unit": "ft/min"},
        {"key": "time_min", "label": "Zeit", "unit": "min"},
        {"key": "distance_nm", "label": "Strecke", "unit": "NM"},
        {"key": "fuel_l", "label": "Verbrauchter Kraftstoff", "unit": "l"},
        {"key": "fuel_usgal", "label": "Verbrauchter Kraftstoff", "unit": "US gal"},
    ],
    "cruise_performance": [
        {"key": "pressure_altitude_ft", "label": "Druckhoehe", "unit": "ft"},
        {"key": "power_setting_pct", "label": "Last", "unit": "%"},
        {"key": "ktas", "label": "Geschwindigkeit", "unit": "KTAS"},
        {"key": "mph", "label": "Geschwindigkeit", "unit": "mph"},
        {"key": "fuel_flow_lph", "label": "Kraftstoffverbrauch", "unit": "l/h"},
        {"key": "fuel_flow_usgph", "label": "Kraftstoffverbrauch", "unit": "US gal/h"},
        {"key": "range_nm", "label": "Strecke", "unit": "NM"},
        {"key": "endurance_h", "label": "Zeit", "unit": "h"},
    ],
}

TAKEOFF_TEMPS = [-20, 0, 10, 20, 30, 40, 50]
CLIMB_TEMPS = [-20, 0, 20, 40, 50]
TAKEOFF_ALTITUDES = list(range(0, 11000, 1000))
CLIMB_ALTITUDES = list(range(0, 19000, 1000))


def de_num(token: str) -> float:
    """Zahl aus dem POH lesen.

    Im Original werden Dezimalstellen ueberwiegend mit Komma geschrieben,
    vereinzelt (z. B. letzte Zeile Abb. 5-4e) mit Punkt. Tausendertrenner
    kommen in den Tabellen nicht vor, daher gelten beide Zeichen als
    Dezimaltrenner.
    """
    return float(token.replace(",", "."))


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def pdf_pages(pdf: Path) -> list[str]:
    if shutil.which("pdftotext") is None:
        sys.exit("pdftotext (poppler) wird benoetigt: brew install poppler")
    cmd = ["pdftotext", "-layout", str(pdf), "-"]
    text = subprocess.run(cmd, check=True, capture_output=True).stdout.decode(
        "utf-8", "replace"
    )
    return text.split("\f")


def poh_page_label(page_text: str) -> str | None:
    m = re.search(r"Seite\s+([0-9]+[ab]?-[0-9]+)", page_text)
    return m.group(1) if m else None


def revision_label(page_text: str) -> str | None:
    m = re.search(r"(Änderung\s+[^\n]+)", page_text)
    return m.group(1).strip() if m else None


def extract_conditions_and_notes(page_text: str) -> tuple[list[str], list[str]]:
    conditions: list[str] = []
    notes: list[str] = []
    mode = None
    for raw in page_text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith(
            ("Anhang FHB", "Reims/Cessna", "mit TAE", "Seite ", "Ausgabe", "Änderung")
        ):
            continue
        if re.match(r"^Bedingungen:?$", line):
            mode = "cond"
            continue
        if re.match(r"^Anmerkung(en)?:?$", line):
            mode = "note"
            continue
        if re.match(r"^(Druck-|höhe|\[ft\]|\[FT\]|Abb\.?\s*5-)", line):
            mode = None
            continue
        if mode == "cond":
            conditions.append(line)
        elif mode == "note":
            if re.match(r"^\d+\.", line):
                notes.append(line)
            elif notes:
                notes[-1] = notes[-1] + " " + line
    notes = [re.sub(r"\s+", " ", n).replace("- ", "").strip() for n in notes]
    conditions = [re.sub(r"\s+", " ", c).strip() for c in conditions]
    return conditions, notes


def parse_takeoff(pages_text: list[str], tdef: dict) -> list[dict]:
    altitudes: list[int] = []
    ground: list[list[float]] = []
    obstacle: list[list[float]] = []
    for raw in "\n".join(pages_text).split("\n"):
        line = raw.strip()
        if not line:
            continue
        if re.match(r"^Gnd\s*Roll\b", line, re.I):
            nums = re.findall(r"\d+", line)
            if len(nums) == len(TAKEOFF_TEMPS):
                ground.append([int(n) for n in nums])
            continue
        if re.match(r"^(15\s*m|50\s*ft)\s*Hind", line, re.I):
            nums = re.findall(r"\d+", line)[1:]  # erste Zahl ist 15 bzw. 50
            if len(nums) == len(TAKEOFF_TEMPS):
                obstacle.append([int(n) for n in nums])
            continue
        if re.fullmatch(r"\d{1,5}", line):
            altitudes.append(int(line))
    if not (len(altitudes) == len(ground) == len(obstacle) == len(TAKEOFF_ALTITUDES)):
        raise ValueError(
            f"{tdef['figure']}: unerwartete Zeilenzahl "
            f"(alt={len(altitudes)}, gnd={len(ground)}, obst={len(obstacle)})"
        )
    if altitudes != TAKEOFF_ALTITUDES:
        raise ValueError(f"{tdef['figure']}: Druckhoehen weichen ab: {altitudes}")
    rows = []
    for alt, g, o in zip(altitudes, ground, obstacle):
        for i, temp in enumerate(TAKEOFF_TEMPS):
            rows.append(
                {
                    "pressure_altitude_ft": alt,
                    "oat_c": temp,
                    "ground_roll": g[i],
                    "over_obstacle": o[i],
                }
            )
    return rows


def parse_climb_rate(pages_text: list[str], tdef: dict) -> list[dict]:
    rows: list[dict] = []
    altitudes: list[int] = []
    pat = re.compile(
        r"\s*(\d{1,5})\s+(\d{2})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*"
    )
    for raw in "\n".join(pages_text).split("\n"):
        m = pat.fullmatch(raw)
        if not m:
            continue
        alt, vy = int(m.group(1)), int(m.group(2))
        altitudes.append(alt)
        for i, temp in enumerate(CLIMB_TEMPS):
            rows.append(
                {
                    "pressure_altitude_ft": alt,
                    "vy_kias": vy,
                    "oat_c": temp,
                    "rate_of_climb_fpm": int(m.group(3 + i)),
                }
            )
    if altitudes != CLIMB_ALTITUDES:
        raise ValueError(f"{tdef['figure']}: Druckhoehen weichen ab: {altitudes}")
    return rows


def parse_climb_tdf(pages_text: list[str], tdef: dict) -> list[dict]:
    rows: list[dict] = []
    altitudes: list[int] = []
    pat = re.compile(
        r"\s*(\d{1,5})\s+(-?\d{1,2})\s+(\d{2})\s+(\d+)\s+"
        r"([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*"
    )
    for raw in "\n".join(pages_text).split("\n"):
        m = pat.fullmatch(raw)
        if not m:
            continue
        altitudes.append(int(m.group(1)))
        rows.append(
            {
                "pressure_altitude_ft": int(m.group(1)),
                "oat_c": int(m.group(2)),
                "vy_kias": int(m.group(3)),
                "rate_of_climb_fpm": int(m.group(4)),
                "time_min": de_num(m.group(5)),
                "distance_nm": de_num(m.group(6)),
                "fuel_l": de_num(m.group(7)),
                "fuel_usgal": de_num(m.group(8)),
            }
        )
    if altitudes != CLIMB_ALTITUDES:
        raise ValueError(f"{tdef['figure']}: Druckhoehen weichen ab: {altitudes}")
    return rows


def parse_cruise(pages_text: list[str], tdef: dict) -> list[dict]:
    rows: list[dict] = []
    pat = re.compile(
        r"\s*(SL|\d{1,5})\s+(\d{2,3})\s+(\d+)\s+(\d+)\s+"
        r"([\d.,]+)\s+([\d.,]+)\s+(\d+)\s+([\d.,]+)\s*"
    )
    for raw in "\n".join(pages_text).split("\n"):
        m = pat.fullmatch(raw)
        if not m:
            continue
        rows.append(
            {
                "pressure_altitude_ft": 0 if m.group(1) == "SL" else int(m.group(1)),
                "power_setting_pct": int(m.group(2)),
                "ktas": int(m.group(3)),
                "mph": int(m.group(4)),
                "fuel_flow_lph": de_num(m.group(5)),
                "fuel_flow_usgph": de_num(m.group(6)),
                "range_nm": int(m.group(7)),
                "endurance_h": de_num(m.group(8)),
            }
        )
    if not rows:
        raise ValueError(f"{tdef['figure']}: keine Zeilen erkannt")
    return rows


PARSERS = {
    "takeoff_distance": parse_takeoff,
    "climb_rate": parse_climb_rate,
    "climb_time_distance_fuel": parse_climb_tdf,
    "cruise_performance": parse_cruise,
}


def detect_source_anomalies(table: dict) -> list[dict]:
    """Widersprueche im Originaldokument erkennen und dokumentieren.

    Solche Widersprueche werden bewusst NICHT stillschweigend aufgeloest: die
    digitalisierten Werte bleiben exakt die der Tabelle, die Abweichung wird
    aber mitgeliefert, damit sie bei der Vorflug-Pruefung auffaellt.
    """
    anomalies: list[dict] = []
    table_vy = {r["vy_kias"] for r in table["rows"] if "vy_kias" in r}
    if table_vy:
        text_vy = set()
        for cond in table["conditions"]:
            for m in re.finditer(r"vy\s*=\s*(\d{2})\s*KIAS", cond, re.I):
                text_vy.add(int(m.group(1)))
        if text_vy and text_vy != table_vy:
            anomalies.append(
                {
                    "kind": "vy_mismatch",
                    "description": (
                        f"Widerspruch im Original: die Bedingungen auf Seite "
                        f"{table['source']['pages'][0]['poh_page']} nennen "
                        f"vy = {sorted(text_vy)[0]} KIAS, die Spalte 'Vy' der "
                        f"Tabelle {table['figure']} auf Seite "
                        f"{table['source']['pages'][-1]['poh_page']} nennt "
                        f"{sorted(table_vy)[0]} KIAS."
                    ),
                    "digitized_value": (
                        f"Uebernommen wurde der Spaltenwert der Tabelle "
                        f"({sorted(table_vy)[0]} KIAS)."
                    ),
                    "action": (
                        "Geklaert am 2026-08-06: es gilt der Spaltenwert der "
                        "Tabelle. Der Widerspruch wird weiterhin mitgeliefert, "
                        "damit er beim Abgleich mit dem Original nicht als "
                        "Digitalisierungsfehler missverstanden wird."
                    ),
                    "resolution": {
                        "date": "2026-08-06",
                        "decided_by": "afoeder",
                        "decision": (
                            f"Massgeblich ist der Spaltenwert "
                            f"{sorted(table_vy)[0]} KIAS."
                        ),
                    },
                }
            )
    return anomalies


def is_applicable_to_d_eelk(tdef: dict) -> bool:
    """D-EELK ist eine 172N mit Standardtanks (max. Abflugmasse 1043 kg).

    Tabellen fuer 1089 kg gelten laut POH nur fuer die 172P; Tabellen fuer
    Langstrecken- und Integraltank gelten fuer eine andere Tankkonfiguration.
    Beide bleiben digitalisiert, duerfen aber nicht zur Berechnung fuer D-EELK
    herangezogen werden.
    """
    if "F172N" not in tdef["models"]:
        return False
    if tdef.get("tank") not in (None, "standard"):
        return False
    return True


def not_applicable_reason(tdef: dict) -> str:
    reasons = []
    if "F172N" not in tdef["models"]:
        reasons.append(
            f"Gilt laut POH nur fuer die Cessna 172P (Abfluggewicht "
            f"{tdef['weight_kg']} kg); D-EELK ist eine 172N."
        )
    if tdef.get("tank") not in (None, "standard"):
        reasons.append(
            f"Gilt fuer die Tankvariante '{tdef['tank']}'; D-EELK hat Standardtanks."
        )
    return " ".join(reasons)


def build_table(pages: list[str], tdef: dict) -> dict:
    base = SECTION_FIRST_PDF_PAGE
    cond_pdf = base + tdef["cond_page"] - 1
    data_pdfs = [base + n - 1 for n in tdef["data_pages"]]

    conditions, notes = extract_conditions_and_notes(pages[cond_pdf - 1])
    rows = PARSERS[tdef["kind"]]([pages[p - 1] for p in data_pdfs], tdef)

    pages_ref = []
    for pdf_page in sorted({cond_pdf, *data_pdfs}):
        label = poh_page_label(pages[pdf_page - 1])
        if label is None or not label.startswith(SECTION + "-"):
            raise ValueError(
                f"{tdef['figure']}: Seitenzuordnung falsch "
                f"(PDF {pdf_page} -> '{label}', erwartet Abschnitt {SECTION})"
            )
        role = []
        if pdf_page == cond_pdf:
            role.append("Bedingungen/Anmerkungen")
        if pdf_page in data_pdfs:
            role.append("Tabellenwerte")
        pages_ref.append(
            {"poh_page": label, "pdf_page": pdf_page, "role": ", ".join(role)}
        )

    caption_page = pages[data_pdfs[-1] - 1]
    fig_no = tdef["figure"].replace("Abb. ", "")
    if not re.search(r"Abb\.?\s*" + re.escape(fig_no), caption_page):
        raise ValueError(
            f"{tdef['figure']}: Bildunterschrift nicht auf PDF-Seite "
            f"{data_pdfs[-1]} gefunden"
        )

    applicability = {
        "aircraft_registration": "D-EELK",
        "engine": "TAE 125-02-114 (Technify/Continental Diesel)",
        "propeller": PROPELLER,
        "propeller_note": PROPELLER_NOTE,
        "models": tdef["models"],
        "weight_kg": tdef["weight_kg"],
        "weight_lbs": tdef["weight_lbs"],
    }
    for opt in ("tank", "usable_fuel_l", "usable_fuel_usgal"):
        if opt in tdef:
            applicability[opt] = tdef[opt]

    applicability["applicable_to_d_eelk"] = is_applicable_to_d_eelk(tdef)
    if not applicability["applicable_to_d_eelk"]:
        applicability["not_applicable_reason"] = not_applicable_reason(tdef)

    columns = COLUMNS[tdef["kind"]]
    if tdef["kind"] == "takeoff_distance":
        columns = [
            dict(c, unit=tdef["unit"])
            if c["key"] in ("ground_roll", "over_obstacle")
            else c
            for c in columns
        ]

    table = {
        "id": f"{SECTION}-{tdef['key']}",
        "kind": tdef["kind"],
        "figure": tdef["figure"],
        "table_name": tdef["name"],
        "source": {
            "document_id": DOCUMENT["id"],
            "document_title": DOCUMENT["title"],
            "issue": DOCUMENT["issue"],
            "revision": revision_label(caption_page),
            "section": f"Abschnitt {SECTION} LEISTUNGEN",
            "section_applicability": PROPELLER_NOTE,
            "poh_pages": [p["poh_page"] for p in pages_ref],
            "pages": pages_ref,
            "citation": (
                f"{DOCUMENT['title']}, {DOCUMENT['issue']}, Abschnitt {SECTION} "
                f"(Propeller {PROPELLER}), Seite "
                f"{'/'.join(p['poh_page'] for p in pages_ref)}, "
                f"{tdef['figure']} \u2013 {tdef['name']}"
            ),
        },
        "applicability": applicability,
        "conditions": conditions,
        "notes": notes,
        "columns": columns,
        "row_count": len(rows),
        "rows": rows,
    }
    if tdef["kind"] == "takeoff_distance":
        table["obstacle_label"] = tdef["obstacle_label"]
    anomalies = detect_source_anomalies(table)
    if anomalies:
        table["source_anomalies"] = anomalies
    return table


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--allow-hash-mismatch", action="store_true")
    args = ap.parse_args()

    pdf = args.pdf.expanduser()
    if not pdf.is_file():
        sys.exit(f"PDF nicht gefunden: {pdf}")
    digest = sha256_of(pdf)
    if digest != EXPECTED_PDF_SHA256 and not args.allow_hash_mismatch:
        sys.exit(
            "SHA256 des PDF weicht ab — die Seitenzuordnung waere nicht mehr "
            f"garantiert.\n  erwartet: {EXPECTED_PDF_SHA256}\n  gefunden: {digest}"
        )

    pages = pdf_pages(pdf)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    index_entries = []
    for tdef in TABLE_DEFS:
        table = build_table(pages, tdef)
        out = TABLES_DIR / f"{table['id']}.json"
        out.write_text(
            json.dumps(table, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        index_entries.append(
            {
                "id": table["id"],
                "file": f"tables/{out.name}",
                "kind": table["kind"],
                "figure": table["figure"],
                "table_name": table["table_name"],
                "section": SECTION,
                "propeller": PROPELLER,
                "models": table["applicability"]["models"],
                "applicable_to_d_eelk": table["applicability"]["applicable_to_d_eelk"],
                "weight_kg": table["applicability"]["weight_kg"],
                "tank": table["applicability"].get("tank"),
                "poh_pages": table["source"]["poh_pages"],
                "row_count": table["row_count"],
                "source_anomalies": len(table.get("source_anomalies", [])),
            }
        )
        print(
            f"  {table['id']:44s} {table['row_count']:4d} Zeilen  "
            f"Seite {'/'.join(table['source']['poh_pages'])}"
        )

    index = {
        "aircraft": {
            "registration": "D-EELK",
            "type": "Reims/Cessna F172N mit TAE 125-02-114 (EASA STC 10014287)",
            "model": "172N",
            "propeller": PROPELLER,
            "applicable_section": SECTION,
            "section_choice_rationale": PROPELLER_NOTE,
            "max_takeoff_mass_kg": 1043,
            "max_takeoff_mass_lbs": 2300,
            "tank": "standard",
            "usable_fuel_l": 127.4,
            "usable_fuel_usgal": 33.6,
            "applicable_tables": [
                "5b-takeoff-distance-m-1043kg",
                "5b-takeoff-distance-ft-1043kg",
                "5b-climb-rate-1043kg",
                "5b-climb-time-dist-fuel-1043kg",
                "5b-cruise-standard-1043kg",
            ],
            "not_applicable_rationale": (
                "D-EELK ist eine 172N mit Standardtanks. Die Tabellen fuer 1089 kg "
                "(2400 lbs) gelten laut POH nur fuer die Cessna 172P und sind daher "
                "nicht anwendbar. Die Tabellen fuer Langstrecken- und Integraltank "
                "sind ebenfalls nicht anwendbar. Sie bleiben digitalisiert, weil sie "
                "zum selben Abschnitt 5b gehoeren und ihre Auslassung die "
                "Vollstaendigkeitspruefung gegen das Original erschweren wuerde; sie "
                "duerfen fuer D-EELK aber nicht zur Berechnung herangezogen werden."
            ),
            "open_questions": [],
        },
        "document": DOCUMENT,
        "not_digitized": [
            {
                "figure": "Abb. 5-1",
                "table_name": "Dichtehoehe",
                "poh_page": "5-7",
                "reason": "Diagramm (Kurvenschar), keine Tabelle",
            },
            {
                "figure": "Abb. 5-2",
                "table_name": "Leistung ueber Hoehe (Centurion 2.0 - 155 hp)",
                "poh_page": "5-8",
                "reason": "Diagramm (Kurvenschar), keine Tabelle",
            },
            {
                "figure": None,
                "table_name": "Landestrecke",
                "poh_page": "5-6",
                "reason": (
                    "Nicht im Anhang enthalten: 'Berechnung siehe Flughandbuch' "
                    "(Original-Flughandbuch der Zelle)"
                ),
            },
            {
                "figure": "Abschnitt 5a (Abb. 5-1a bis 5-4e)",
                "table_name": "Leistungen fuer Propeller MTV-6-A/187-129",
                "poh_page": "5a-1 bis 5a-28",
                "reason": (
                    "Anderer Propellertyp — fuer D-EELK nicht anwendbar "
                    "(D-EELK: MTV-6-A/190-69, Abschnitt 5b)"
                ),
            },
        ],
        "tables": index_entries,
    }
    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\n{len(index_entries)} Tabellen geschrieben nach {TABLES_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
