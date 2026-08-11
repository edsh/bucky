# Specification Quality Checklist: Außentemperatur statt ISA-Abweichung

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Zwei Punkte waren bewusst dem Plan überlassen. Beide sind inzwischen in
[research.md](../research.md) entschieden:

1. **Wertebereich der Außentemperatur** → R1: ein **mitwandernder** Bereich aus
   der neuen Kernfunktion `getOutsideAirTemperatureRange(pressureAltitudeFt)`.
   Ein fester Bereich hätte den Regler bei niedriger Platzhöhe zu eng und bei
   großer zu weit gemacht. `ISA_DEVIATION_RANGE` bleibt die einzige Wahrheit
   und wird nur verschoben.

2. **Berührte Prüfungen im Klickpfad** → R5: Betroffen sind Prüfung 44 sowie
   alle Kennungen mit `isa`. Die Anordnungsprüfungen 30, 33, 36, 56 und 57
   sprechen die Regler über ihre Kennung an, nicht über ihre Stelle im Baum —
   sie bleiben unberührt.

Hinzu kam beim Planen eine dritte Entscheidung (R2): Die abgeleitete
ISA-Abweichung geht **ungerundet** in die Rechnung und wird mit **einer
Nachkommastelle** angezeigt. Sie ist der Beleg, mit dem der Pilot die Zeile im
Handbuch findet — die angezeigte Zahl sollte deshalb die sein, mit der
gerechnet wurde (Prinzip I).

Die Klärung zum Bezugspunkt der Temperatur (**am Platz**, abgeleitete
Abweichung gilt weiter auch für die Reiseflughöhe) wurde vor dem Schreiben der
Spec eingeholt und ist unter Assumptions festgehalten.
