# Lernstudio — Wissen gehört allen

Kostenlose Lernplattform mit interaktiven Lektionen, selbst gestaltbaren Tier-Avataren und lokalem Lernfortschritt. Der gesamte veröffentlichte Lerninhalt ist ohne Kauf, Konto oder Wallet zugänglich.

- [Lernstudio öffnen](https://lernstudio-wissen-fuer-alle.juri-janovski.chatgpt.site/)
- [Community](https://github.com/Juri-Halveth/lernstudio/discussions)
- [EVE-Forschung](contracts/README.md)

## Lokal starten

Node.js 24 verwenden. Im Projektverzeichnis:

```sh
npm ci --ignore-scripts
npm start
```

Die Konsole zeigt eine lokale Adresse. Der Server bindet nur die Loopback-Adresse und liefert ausschließlich die veröffentlichten Dateien aus.

```sh
npm test
npm run build
```

Der Build erzeugt `dist/` und `website/` aus einer expliziten Dateiliste. `curriculum.js` ist die Quelle für Inhalte und automatisch abgeleitete Mengenangaben. Neue Zahlenstellen gehören in `werkzeug/zahlen-aktualisieren.js`.

## Wie es funktioniert

HTML, CSS und JavaScript ohne eigenen Datenbank- oder Anmeldedienst. Spitzname, Avatar und Fortschritt bleiben im Browser. Export und Import übertragen eine lokale JSON-Sicherung. Gerätewechsel übernimmt Fortschritt nicht automatisch; beim Löschen der Browserdaten kann er verloren gehen. Parallel geöffnete Tabs führen abgeschlossene Lektionen zusammen. Eine neue Import-/Reset-Generation verhindert das Zurückschreiben alter Tabs.

GitHub Discussions speichert Community-Beiträge außerhalb dieser Website; zum Schreiben gelten GitHubs Konto- und Datenschutzregeln. Die Website selbst hat kein Chat- oder Beitragsbackend. Ein Entwurf auf der Community-Seite wird erst durch die Person kopiert und extern veröffentlicht.

Die optionale Wallet-Anbindung zeigt ausschließlich freigegebene Adresse und Chain über einen injizierten EIP-1193-Provider. Sie fordert keine Signatur, Überweisung oder Netzwerkumschaltung an. Lernpunkte sind lokale, veränderbare Motivationseinheiten und keine Token. Das getrennte EVE-Vertragsprojekt ist ein lokal getesteter Forschungskandidat, ohne Live-Adresse und ohne Verbindung zu echtem Vermögen.

Python-Übungen laden Pyodide von jsDelivr erst bei Ausführung. Vollständiger Offlinebetrieb wird nicht zugesichert. Ein alter Service Worker wird nur für den eigenen bekannten Scope abgemeldet.

## Prüfung und Grenzen

Die aktuellen Prüfungen umfassen öffentliche Links und Metadaten, Profile und Sicherungen, Mehrtab-Verhalten, Wallet-Ereignisse, Lektionen-DOM, Navigation, Mathematikplots und lokale Simulatoren. jsdom prüft Funktionen; es ersetzt keine Prüfung der Darstellung in echten Browsern oder mit assistiven Technologien. EVE besitzt eine eigene Testsuite und eigene Abhängigkeiten.

Dies ist eine neu zusammengestellte öffentliche Quellfassung. Private Forschungsarchive, Altsysteme, persönliche Dokumente, Zugangsdaten und deren Git-Historie sind nicht enthalten.

## Mitmachen und Lizenz

Siehe [CONTRIBUTING.md](CONTRIBUTING.md), [LICENSE.txt](LICENSE.txt) und [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Originale Plattformquellen und eigene veröffentlichte Lerninhalte stehen unter ISC. Abweichende Lizenzen, insbesondere das EVE-Forschungsmodul und Drittbestandteile, behalten ihren eigenen Geltungsbereich.
