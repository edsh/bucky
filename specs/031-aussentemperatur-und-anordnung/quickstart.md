# Quickstart: Feature 031 prüfen

**Feature**: 031 | **Phase**: 1

Wie sich nachweisen lässt, dass das Feature tut, was die Spezifikation verlangt.

---

## Voraussetzungen

```bash
cd /Users/UH60UCQ/Code/edsh/bucky
npm install          # nur beim ersten Mal
```

---

## Die Prüfläufe

```bash
# Kern und Adapter
npx vitest run

# Regeln der Auszeichnung
npm run lint

# Typen der Oberfläche
npm exec --workspace @edsh-bucky/web -- svelte-kit sync \
  && npm run check --workspace @edsh-bucky/web

# Übersetzen
npm run build

# Klickpfad
python3 -m http.server 8899 --directory apps/web/build &
node tests/ui/klickpfad.mjs
# danach: lsof -ti :8899 | xargs kill
```

Ausgangsstand vor dem Feature: 492 Tests grün, Klickpfad 63 Prüfungen, 0
durchgefallen.

---

## Prüfszenarien

### S1 — Der Rollentausch ändert kein Ergebnis (SC-001)

1. Seite öffnen. Platzhöhe auf 971 ft, QNH auf 1023 hPa.
2. Die Temperatur so einstellen, dass die Folgezeile ISA +10,0 °C zeigt.
3. Startstrecke, Kraftstoffbedarf und Reiseleistung notieren.
4. Gegen die Werte halten, die dieselbe Eingabe vor dem Feature ergab
   (`git stash` oder ein Lauf auf `main`).

**Erwartet**: identische Zahlen. Weicht etwas ab, wird irgendwo gerundet, wo
nicht gerundet werden darf (R2, C-03).

### S2 — Die Ableitung folgt der Höhe (FR-003)

1. Eine Temperatur einstellen, die Folgezeile ablesen.
2. Die Platzhöhe verstellen, ohne die Temperatur anzufassen.

**Erwartet**: Die Temperatur bleibt stehen, die abgeleitete Abweichung ändert
sich. Ändert sich die Temperatur mit, ist irgendwo ein `$effect`, der dort nicht
hingehört (R3).

### S3 — Die Anschläge wandern (R1)

1. Platzhöhe auf 0 ft — Anschläge des Temperaturreglers ablesen.
2. Platzhöhe auf 10 000 ft — erneut ablesen.

**Erwartet**: Der Bereich verschiebt sich um rund 20 °C nach unten. An beiden
Anschlägen muss sich rechnen lassen, ohne dass eine Meldung erscheint.

### S4 — Die Grenze nach dem Einstellen (FR-005)

1. Platzhöhe auf 0 ft, Temperatur an den oberen Anschlag.
2. Platzhöhe hochziehen.

**Erwartet**: Irgendwann erscheint die Meldung des Kerns zur ISA-Abweichung —
wörtlich, ohne Umformulierung (C-02). Die Temperatur wird **nicht** stillschweigend
zurechtgerückt.

### S5 — Drei Wege, ein Dialog (SC-003)

Für jeden der drei Knöpfe „EDSH" (Luftdruck, Außentemperatur, Pistenwind):

1. Knopf drücken.
2. Prüfen: derselbe Dialog, dieselben drei Zeilen, dasselbe Ladeverhalten.
3. Übernehmen und prüfen, dass **alle** angehakten Größen gesetzt werden.

**Erwartet**: kein Unterschied zwischen den drei Wegen (FR-008/FR-009).

### S6 — Die Temperaturzeile im Dialog (FR-010)

Mit der bekannten Prüfantwort (`temperature_2m: 29,2 °C` bei Platzhöhe 971 ft,
QNH-Ergebnis 1023 hPa):

**Erwartet**: Die Zeile heißt „Außentemperatur" und schlägt **29 °C** vor —
nicht mehr 16 °C. Die Erläuterung darf die abgeleitete Abweichung nennen.

### S7 — Die Bahnwahl an ihrem Platz (FR-011, FR-012)

1. Dialog mit vollständiger Antwort öffnen: Bahnwahl steht **innerhalb** der
   Windzeile.
2. Dialog mit einer Antwort ohne Wind öffnen: Windzeile gesperrt, **keine**
   Bahnwahl.
3. Bahn wechseln: Nur der Windvorschlag ändert sich; kein neuer Abruf, keine
   zurückgesetzten Kästchen (FR-014).

### S8 — Der Gegenwindhinweis (FR-013)

**Erwartet**: Die Windzeile des Dialogs nennt „positiv = Gegenwind", in derselben
Schreibweise wie der Regler.

### S9 — Die Anordnung (FR-015 bis FR-018)

Auf einem breiten Bildschirm im Querformat (≥ 40 rem):

1. Beide Bereiche stehen nebeneinander.
2. In beiden steht der Windregler an erster Stelle.
3. Die beiden Windregler liegen auf einer Höhe.
4. Im Kraftstoffbereich stehen Streckenwind und Streckenlänge **untereinander**,
   auch wenn Platz für zwei Spalten wäre.

Im Hochformat: Reihenfolge unverändert, Bereiche untereinander.

### S10 — Die Grenzfälle des Pistenwinds bleiben (Feature 027)

Der bekannte Fall −10,06 kt rundet auf −10 kt und liegt genau auf der
Reglergrenze; er muss weiterhin übernehmbar sein. Bei 20 kt aus 250° auf Bahn 10
(−17 kt) muss die Zeile weiterhin gesperrt sein.

---

## Was bei einem Fehlschlag zuerst zu prüfen ist

| Beobachtung | Wahrscheinliche Ursache |
|---|---|
| Ergebnisse weichen minimal ab (S1) | Die gerundete statt der ungerundeten Abweichung geht in die Rechnung (R2) |
| Der Regler springt beim Verstellen der Höhe | Ein `$effect` koppelt Temperatur an Höhe (R3) |
| Übersetzung schlägt fehl mit Ringschlussmeldung | `ISA_DEVIATION_RANGE` ist nicht nach `atmosphere/` gewandert |
| C-05 schlägt an | Ein Adapter hat eine Temperaturgrenze selbst hingeschrieben |
| C-09 schlägt an | Sollte nicht — dieses Feature führt keine Trigonometrie in Adapter ein |
