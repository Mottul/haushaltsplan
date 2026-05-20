# haushaltsplan
Mein persönlicher Haushaltsplan / Expense Tracker made with Claude

# Haushaltsplan über GitHub Pages veröffentlichen

Diese Anleitung bringt die App kostenlos und mit HTTPS online, damit du sie auf dem
Handy installieren und offline nutzen kannst.

> **Bleiben meine Daten privat?** Ja. Veröffentlicht wird nur der *App-Code*
> (HTML/CSS/JS). Deine Einträge werden ausschließlich lokal im Browser deines Handys
> gespeichert und landen **nie** auf GitHub. Ein öffentliches Repository ist daher
> unbedenklich – es enthält keine persönlichen Daten.

---

## Voraussetzungen

- Ein kostenloser **GitHub-Account** → https://github.com/signup
- Diese 6 Dateien aus dem Projektordner:
  `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.json`, `icon.svg`
  *(Der Ordner `.claude` wird **nicht** benötigt.)*

---

## Weg A: Über die GitHub-Website (ohne Vorkenntnisse, empfohlen)

### 1. Repository anlegen
1. Oben rechts auf **+** → **New repository**.
2. **Repository name:** z.B. `haushaltsplan`
3. Sichtbarkeit **Public** lassen (für kostenloses Pages nötig; siehe Datenschutz-Hinweis oben).
4. **Create repository** klicken.

### 2. Dateien hochladen
1. Im neuen Repo auf **Add file** → **Upload files**.
2. Die **6 Dateien** ins Fenster ziehen (nicht den Ordner, sondern die Dateien direkt).
3. Unten **Commit changes** klicken.

### 3. GitHub Pages aktivieren
1. Im Repo auf **Settings** (oben) → links **Pages**.
2. Unter **Build and deployment**:
   - **Source:** „Deploy from a branch"
   - **Branch:** `main`, Ordner `/ (root)` → **Save**.
3. Nach ca. 1 Minute erscheint oben die Adresse:
   `https://DEIN-NAME.github.io/haushaltsplan/`

### 4. Fertig
Diese URL aufrufen – die App läuft. Lege dir die Adresse als Lesezeichen an.

---

## Weg B: Über die Kommandozeile (falls du Git nutzt)

```bash
cd "D:\00_Megasound\CODE\claude\Claude Code\Haushaltsplan"
git init
git add index.html styles.css app.js sw.js manifest.json icon.svg
git commit -m "Haushaltsplan PWA"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/haushaltsplan.git
git push -u origin main
```

Danach **GitHub Pages aktivieren** wie in Weg A, Schritt 3.

---

## Am Handy installieren (Android / Chrome)

1. Die `…github.io/haushaltsplan/`-Adresse in **Chrome** öffnen.
2. Menü **⋮** (oben rechts) → **App installieren** (oder „Zum Startbildschirm hinzufügen").
3. Das Haushaltsplan-Symbol liegt nun auf dem Startbildschirm und öffnet sich wie eine
   normale App – **auch ohne Internet**.

> Beim ersten Öffnen kurz online sein, damit der Offline-Speicher (Service Worker)
> die Dateien laden kann. Danach funktioniert alles offline.

---

## App später aktualisieren

- **Website-Weg:** Im Repo **Add file → Upload files** die geänderten Dateien erneut
  hochladen und committen. Nach ~1 Minute ist die neue Version live.
- **Git-Weg:** Änderungen committen und `git push`.

Die installierte App aktualisiert sich beim nächsten Start automatisch (der Service
Worker holt die neue Version). Wird etwas nicht aktualisiert: App einmal schließen und
neu öffnen, oder in den Chrome-Einstellungen den Seiten-Cache leeren.

---

## Wenn etwas klemmt

| Problem | Lösung |
|---|---|
| Seite bleibt leer / 404 | 1–2 Minuten nach dem Aktivieren warten; URL muss auf `/` enden. |
| „Installieren" fehlt im Menü | Es muss die `https://…github.io/…`-Adresse sein, keine lokale Datei. |
| Offline geht nicht | App einmal **online** öffnen, damit der Service Worker cachen kann. |
| Icon/Style fehlt | Prüfen, ob wirklich **alle 6 Dateien** hochgeladen wurden. |

---

## Datensicherung nicht vergessen

Da alle Einträge nur auf dem Handy liegen: in der App regelmäßig unter
**Einstellungen → JSON-Backup exportieren** ein Backup erstellen und über das
Teilen-Menü in deiner Cloud (OneDrive/Drive) ablegen. Dieses Backup ist gleichzeitig
das, was du am Laptop über **Importieren** öffnest, um den Überblick auf großem
Bildschirm zu haben.
