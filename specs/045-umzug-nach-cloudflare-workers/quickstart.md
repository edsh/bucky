# Quickstart — Abnahme und Umstellung

**Feature**: 045 | Ergänzt [plan.md](./plan.md)

Diese Anleitung beschreibt, **wie man prüft**, dass der Umzug gelungen ist, und
in welcher Reihenfolge umgestellt wird. Sie ersetzt keine Aufgabenliste
(`tasks.md`), sondern beschreibt die Abnahme.

---

## Einmalig von Hand (nicht automatisierbar)

Beides passiert außerhalb des Repositories und ist bewusst Handarbeit.

1. **Zugangsschlüssel anlegen** — Cloudflare → Profil → API-Token → Vorlage
   *Edit Cloudflare Workers*. Ergebnis als Geheimnis im Repository hinterlegen:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (Konto-Übersicht)

   Das Recht, DNS zu ändern, bekommt dieser Schlüssel **nicht**. Er liegt
   täglich in der Ablaufsteuerung; er soll nur veröffentlichen dürfen.

2. **`workers.dev`-Subdomain des Kontos** — einmalig kontoweit, nicht je Worker.
   Cloudflare → Compute (Workers) → in der Übersicht *Subdomain* ändern. Ohne sie
   verweigert `wrangler deploy` die Arbeit; der von Wrangler genannte
   `…/workers/onboarding`-Link führt allerdings ins Leere. Ob eine Subdomain
   besteht, verrät zuverlässiger die Schnittstelle:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.cloudflare.com/client/v4/accounts/<konto>/workers/subdomain
   ```

   Sie wurde auf `edsh` gesetzt, die Adressen lauten also `bucky.edsh.workers.dev`.
   Nach einer Änderung dauert es einige Minuten, bis das Zertifikat steht — in
   der Zwischenzeit antwortet weder der alte noch der neue Name.

3. **Erstmaliger Deploy von Hand** — `npx wrangler login`, dann:

   ```bash
   npm run build
   npx wrangler deploy --config apps/web/wrangler.jsonc
   ```

   Das ist einmalig nötig, weil `wrangler versions upload` (der Vorschau-Weg)
   einen bereits bestehenden Worker voraussetzt: *„You cannot upload a new
   version of a Worker that does not yet exist."* Die Ablaufsteuerung kann diese
   Henne-Ei-Lage nicht selbst auflösen, solange noch nichts auf `main` liegt.

4. **Domain anhängen** (erst nach dem Merge, siehe unten).

---

## Vor dem Umzug: den Sollzustand festhalten

Ohne diesen Schritt ist SC-001 nicht prüfbar — hinterher weiß niemand mehr, was
vorher dastand.

```bash
BASE=https://bucky.edsh.de node tests/ui/klickpfad.mjs
```

Den festen Eingabesatz nimmt inzwischen ein Skript ab, statt ihn abzuschreiben:

```bash
BASE=https://bucky.edsh.de        node tests/ui/sollzustand.mjs > /tmp/alt.txt
BASE=https://bucky.edsh.workers.dev node tests/ui/sollzustand.mjs > /tmp/neu.txt
diff <(tail -n +2 /tmp/alt.txt) <(tail -n +2 /tmp/neu.txt)
```

Vier Eingabesätze, alle angezeigten Werte samt Quellenangaben. Die erste Zeile
nennt die Adresse und wird deshalb vom Vergleich ausgenommen. Der Abzug vom
bisherigen Ort liegt als `sollzustand-github-pages.txt` in diesem Ordner.

---

## Örtlich prüfen (Schritt 1)

```bash
npm run build
npx wrangler dev --config apps/web/wrangler.jsonc
BASE=http://localhost:8787 node tests/ui/klickpfad.mjs
```

**Erwartet**: 97 Prüfungen, 0 durchgefallen. Jede Seite auch beim unmittelbaren
Aufruf erreichbar, nicht nur über die Startseite.

---

## Auf `workers.dev` prüfen (Schritt 3)

Nachdem die Ablaufsteuerung zum ersten Mal veröffentlicht hat — die Domain hängt
noch am alten Ort, hier passiert also nichts Öffentliches:

```bash
BASE=https://bucky.<konto>.workers.dev node tests/ui/klickpfad.mjs
```

Dazu von Hand:

- Der feste Satz Eingaben von oben ergibt **dieselben** Werte (SC-001).
- Ein Änderungsvorschlag trägt eine Vorschau-Adresse, die von einem Telefon aus
  aufgeht (SC-004).
- Ein Zweig mit absichtlich gebrochener Prüfung veröffentlicht **nicht**
  (SC-005). Danach zurücknehmen.

---

## Umstellen (Schritt 4)

Reihenfolge einhalten — der mittlere Teil ist die Lücke.

1. Ansagen, dass die Seite kurz nicht erreichbar ist.
2. Cloudflare → DNS: den Eintrag `bucky` (auf `edsh.github.io`) **löschen**.
3. Cloudflare → Worker `bucky` → Settings → Domains & Routes → **Custom Domain**
   `bucky.edsh.de` hinzufügen. Cloudflare legt Eintrag und Zertifikat selbst an.
4. Warten, bis das Zertifikat ausgestellt ist (wenige Minuten).
5. Abnehmen:

```bash
BASE=https://bucky.edsh.de node tests/ui/klickpfad.mjs
```

6. Von Hand: einmal hart neu laden; prüfen, dass die vor dem Umzug gesicherten
   **Einstellungen noch da sind** (FR-004).
7. GitHub Pages abschalten (Repository → Settings → Pages → Source: None), damit
   kein zweiter, veraltender Stand erreichbar bleibt (FR-017).

---

## Rückweg

Wenn nach der Umstellung etwas nicht stimmt:

```bash
npx wrangler rollback                    # auf die vorige Fassung
npx wrangler versions list               # oder gezielt:
npx wrangler versions deploy <version-id>
```

Gilt sofort und baut nichts neu; die letzten 100 Fassungen bleiben verfügbar
(SC-006).

**Wenn der neue Ort ganz aufgegeben werden soll**: den DNS-Eintrag wieder auf
`edsh.github.io` setzen und GitHub Pages erneut einschalten. Der alte Workflow
liegt in der Versionsgeschichte und ist wiederherstellbar. Wichtig: **erst** die
Pages-Veröffentlichung wieder laufen lassen, dann DNS umstellen — sonst zeigt
der Eintrag auf einen Ort, an dem nichts liegt.
