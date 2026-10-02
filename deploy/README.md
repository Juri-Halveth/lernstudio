# GitHub Pages

Öffentliche Website: https://juri-halveth.github.io/lernstudio/
Quellcode: https://github.com/Juri-Halveth/lernstudio

Keine eigene Domain, kein CNAME und kein FTP-Upload sind erforderlich.
GitHub Pages veröffentlicht die statischen Dateien. Python läuft im Browser.

## Ablauf

1. `npm ci --ignore-scripts` und `npm run build`.
2. Die zwölf Prüfsuiten müssen bestehen. Der Build nimmt nur
   `werkzeug/public-files.js` in `website/` und `dist/` auf.
3. Der Pages-Workflow erstellt einen öffentlichen Quellstand- und Dateibeleg
   in `build-info.json` mit Commit und SHA-256 pro Datei.
4. Ein freigegebener Push nach `main` startet den Workflow
   `.github/workflows/pages.yml`. GitHub Pages muss als GitHub Actions
   konfiguriert sein.
5. Erst nach erfolgreichem Deployment die Live-Adresse, die Hashes und die
   Browserfunktionen prüfen. Ein grüner Build ist noch keine Live-Bestätigung.

## Browserprüfung

`werkzeug/browser-learning-space.cjs` prüft fünf Bildschirmbreiten,
Gastzugang, Suche, Denkmodelle, JavaScript, Python, Abbruch und Zeitlimit.
Dazu wird das optionale Entwicklungspaket Playwright mit einem installierten
Chromium benötigt. `LERNSTUDIO_CHROME` kann den Pfad zu Chrome angeben.
`LERNSTUDIO_LIVE_BASE` wählt die Live-Adresse statt des temporären lokalen
Testservers. Screenshots und Ergebnisse landen ausschließlich lokal unter
`research/2026-10-02-learning-space/browser/`.

## Vorhandene E-Mail-Konten

Der Zugang zu Lektionen benötigt kein Konto. Bestehende Konten und deren
Fortschritte bleiben getrennt vom Gastprofil. Der vorhandene Supabase-Dienst
wurde nicht gelöscht oder umkonfiguriert.

Für Registrierung, Bestätigung und Passwortwiederherstellung muss der Betreiber
`https://juri-halveth.github.io/lernstudio/studio.html` in der Redirect-Allowlist
des Kontodienstes zulassen. Diese externe Konfiguration und echte
Mailzustellung sind getrennt zu prüfen. Lokale Konto-Testdoppel beweisen sie nicht.

Für einen Fork ein eigenes Supabase-Projekt verwenden. Keine Service-Role-,
SMTP- oder Datenbankgeheimnisse in Browserdateien eintragen. Die SQL-Vorlage und
die Funktion zur Kontolöschung sind keine automatisch installierten Backends.
Die Änderung der Website beendet keine bestehenden Domain- oder Hostingverträge.

## Erhaltener Altbestand

`all-inkl-paket.js` und `all-inkl.htaccess` bleiben als historische
Apache-Exportwerkzeuge erhalten, sind nicht Teil des Pages-Deployments und
tragen kein festes externes Ziel mehr. Git-Historie wird nicht umgeschrieben.
