# Specification Quality Checklist: Reservieren-Sheet v2 — vollständiger Zeitwähler

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-20
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

### Zu den offenen Fragen des Gestalter-Entwurfs

Der mitgelieferte `spec.md` des Handoffs trug sieben `[NEEDS CLARIFICATION]`.
Fünf davon sind seit Feature 052/054 beantwortet und stehen in der Spec als
Tabelle, nicht mehr als Frage. Zwei wurden am 20.08.2026 entschieden:

- **Warteliste** → Absprung nach Vereinsflieger statt lokaler Quittung. Der Text
  des Handoffs („Bucky meldet sich") hätte etwas zugesagt, das diese Anwendung
  nicht halten kann — sie kennt niemanden und schreibt nirgends hin.
- **POH-Verweis** → entfällt ersatzlos; der Weg steht im Flugzeugmenü.

### Grenzfälle der Prüfbarkeit

FR-045 („Nacht sichtbar") und FR-047 („feine gestrichelte Nadel") sind
Gestaltungsvorgaben und in dieser Spec bewusst ohne Pixelwerte formuliert. Die
verbindlichen Werte stehen im Handoff `docs/design_handoff_reservierung_v2/README.md`
und gehören in den Plan, nicht in die Spec.

Zwei Kriterien lassen sich nur am Gerät prüfen, nicht im Test: SC-005
(Sprungfreiheit) und NFR-002 (Flüssigkeit des Ziehens). Sie gehören in die
Vorschau vor dem Merge, nicht in die Testliste.
