# ALL-INKL-Veröffentlichung

Ziel ist **https://www.mein-lernstudio.com/**, WebFTP-Verzeichnis `/mein-lernstudio.com/`.
Die Ausgabe `dist/` enthält die freigegebenen öffentlichen Dateien. `deploy/all-inkl.htaccess`
kommt im Ziel als `.htaccess` hinzu. Der Paketbauer ergänzt `index.htm` mit derselben
Startseite, damit auch ein alter DirectoryIndex die aktuelle Fassung erreicht.

## Vorbereiten

```sh
npm ci --ignore-scripts
npm run build
node werkzeug/all-inkl-paket.js
```

Das Paketverzeichnis `artifacts/lernstudio-all-inkl-2.1.0/` enthält ausschließlich öffentliche
Dateien, `.htaccess` und `index.htm`. Der Hashbeleg liegt daneben, nicht im Webroot.
Das Werkzeug prüft jede Quelle gegen `werkzeug/public-files.js`; es liest keine Zugangsdaten.

## Veröffentlichen

1. Den bisherigen Webroot einschließlich versteckter Dateien als Rückrollkopie sichern.
   Die `.htaccess` im am 10.09.2026 geöffneten WebFTP-Verzeichnis war laut Dateiliste leer.
   Vor einem Upload erneut prüfen, falls zwischenzeitlich jemand daran gearbeitet hat.
2. Neue Skripte, Stylesheets, Inhalte und Medien zuerst hochladen. Danach die HTML-Dateien;
   `index.html`, `index.htm` und `.htaccess` zuletzt. Die aktuelle Version benötigt
   `account-auth.js`, `account-progress.js`, `learning-profile.js` und `curriculum.js` gemeinsam.
3. Öffentliche Startseite, `studio.html`, KI-Pfad, Anmelden, Registrieren und
   Passwort-zurücksetzen-Oberfläche auf Hauptdomain und Smartphone prüfen.
4. Mit einem dafür vorgesehenen eigenen Konto Anmeldung, E-Mail-Bestätigung,
   Passwortwiederherstellung und mindestens einen gespeicherten Lernabschluss prüfen.
   Anschließend in einer zweiten Sitzung denselben Lernstand nachweisen.
5. Alle ausgelieferten Dateien mit dem Paketmanifest vergleichen. Bei Abweichungen oder
   Fehlern die gebundene Rückrollkopie wiederherstellen, nicht alte und neue Appmodule mischen.

## Vorhandener Kontodienst

Die Fassung verwendet die bisherigen Supabase-E-Mail-Konten, `user_progress` und
`sync_user_progress`. Kontoidentität wird über `/auth/v1/user` bestätigt. Die Bereitstellung
der Lerninhalte erfolgt jetzt vollständig aus dem öffentlichen `curriculum.js`.
Eine Zahlungsberechtigung wird dafür nicht abgefragt. Bestehende Konten oder Fortschrittszeilen
werden beim Wechsel nicht gelöscht. Nicht eindeutig einem Konto zugeordnete alte Browserprofile
werden nur durch einen ausdrücklich gewählten Sicherungsimport übernommen.

Es ist für diese Umstellung keine Lockerung der RLS für persönliche Lernstände erforderlich.
Die bestehenden E-Mail-Absender- und Redirect-Einstellungen müssen weiterhin funktionieren;
das Rücksprungziel lautet `https://www.mein-lernstudio.com/studio.html`. Der neue Code verwendet
keinen zusätzlichen KI-API-Dienst und setzt kein bezahltes KI-Abonnement voraus.

Die aktuellen lokalen Tests verwenden Dienst-Testdoppel. Sie beweisen weder Mailzustellung noch
den installierten Produktionsstand. Eine Veröffentlichung der Domain benötigt die Freigabe
des Betreibers. Alte Payment Links, Abos, Webhooks und frühere Verträge sind eigenständige
Betreiberobjekte: Das Entfernen der Kasse aus dieser Website deaktiviert sie nicht beim Anbieter.
Eine gewünschte Deaktivierung ist gesondert und ohne Löschen von Vertragsbelegen auszuführen.

## Eigenes Hosting

Für einen Fork zuerst ein eigenes Supabase-Projekt einrichten. URL und Publishable Key in
`account-auth.js` sowie das feste E-Mail-Rücksprungziel ersetzen. Niemals Service-Role-,
SMTP- oder Datenbankgeheimnisse in Browserdateien eintragen. Das vorhandene Lernstudio-Backend
ist kein gemeinsamer Testdienst für fremde Installationen.

`account-schema.sql` ist der aus der bestehenden Implementierung abgeleitete reine
Fortschrittsteil für ein neues Supabase-Projekt. Er enthält die Kontogrenzen und RPCs ohne
Verkaufstabellen. `functions/delete-account/index.ts` enthält die zugehörige Funktion für
die ausdrücklich bestätigte Löschung des eigenen Kontos. Mailversand, Redirect-Allowlist,
Datenverarbeitungsvertrag und die Installation dieser Funktion gehören zum eigenen Betrieb.
Die SQL-Datei ist eine Vorlage; in diesem Lauf wurde sie nicht auf einer Datenbank ausgeführt.
