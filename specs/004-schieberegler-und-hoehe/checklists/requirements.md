# Specification Quality Checklist: Schieberegler und Höhe ASL statt Druckhöhe

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-06
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

- FR-005 nennt die ICAO-Standardatmosphäre. Das ist eine fachliche Festlegung,
  keine technische: sie unterscheidet sich in der Zahl vom verbreiteten
  Überschlag und muss deshalb in der Spec stehen, nicht erst im Plan.
- FR-006 und FR-006a sind der sicherheitsrelevanteste Punkt dieses Features.
  Eine Druckhöhe unter 0 ft entsteht an einem gewöhnlichen Hochdrucktag, nicht
  in einem Randfall: bei QNH 1030 und Platzhöhe 85 ft sind es −369 ft. Das
  naheliegende Anheben auf 0 ft wurde geprüft und verworfen — weil die
  Steigflugtabelle kumulativ ist, verkleinert es die Differenz und weist
  weniger Kraftstoff aus als nötig. Die Begründung steht in FR-006a, damit sie
  nicht später erneut durchdacht werden muss.
- Der zulässige QNH-Bereich (FR-010) ist absichtlich als Anforderung an die
  Abdeckung formuliert, nicht als Zahlenpaar — die konkreten Grenzen gehören
  in den Plan.
