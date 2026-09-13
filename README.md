# Lernstudio — Wissen gehört allen

Kostenlose Lernplattform mit interaktiven Lektionen, einem eigenen KI-Lernpfad, Marketing ohne Werbebudget und selbst gestaltbaren Tier-Avataren. Ein E-Mail-Konto genügt: Alle veröffentlichten Lerninhalte sind ohne Kauf, Abonnement oder Zahlungsdaten verfügbar. Bestehende Lernstudio-Konten werden weiterverwendet.

**HALVETH authorship and participation:** Juri Halveth (Juri Janovski) claims the rights in original platform design, lesson selection and arrangement, original prose, models, diagrams and new code contributions. Evidence or teaching boundaries are not rights waivers. Historical ISC permissions remain effective; protected new HALVETH contributions require a written commercial license and participation agreement.

- [Lernstudio öffnen](https://www.mein-lernstudio.com/)
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

HTML, CSS und JavaScript mit dem bestehenden Supabase-Kontodienst. `account-auth.js` verbindet die E-Mail-Anmeldung, Registrierung, Passwortwiederherstellung und Abmeldung. `account-progress.js` synchronisiert Profil, Abschlüsse und Marketingübungen mit der eigenen Kontozelle. Die Oberfläche bestätigt erfolgreiche Speicherung; bei Verbindungsproblemen bleibt der nach Konto getrennte Gerätecache erhalten. Eine zusätzliche Sicherung lässt sich herunterladen und ausdrücklich mit dem Konto zusammenführen. Die Lerninhalte selbst werden vollständig aus `curriculum.js` ausgeliefert. Eine Kaufberechtigung ist dafür nicht erforderlich.

GitHub Discussions speichert Community-Beiträge außerhalb dieser Website; zum Schreiben gelten GitHubs Konto- und Datenschutzregeln. Die Website selbst hat kein Chat- oder Beitragsbackend. Ein Entwurf auf der Community-Seite wird erst durch die Person kopiert und extern veröffentlicht.

Die optionale Wallet-Anbindung zeigt ausschließlich freigegebene Adresse und Chain über einen injizierten EIP-1193-Provider. Sie fordert keine Signatur, Überweisung oder Netzwerkumschaltung an. Lernpunkte sind veränderbare Motivationseinheiten und keine Token. Das getrennte EVE-Vertragsprojekt ist ein lokal getesteter Forschungskandidat, ohne Live-Adresse und ohne Verbindung zu echtem Vermögen.

Python-Übungen laden Pyodide von jsDelivr erst bei Ausführung. Vollständiger Offlinebetrieb wird nicht zugesichert. Ein alter Service Worker wird nur für den eigenen bekannten Scope abgemeldet.

## Prüfung und Grenzen

Die aktuellen Prüfungen umfassen öffentliche Links und Metadaten, E-Mail-Kontoabläufe mit lokalen Testdoppeln, Kontowechsel, Fortschrittssynchronisierung, Profile und Sicherungen, Mehrtab-Verhalten, Wallet-Ereignisse, Lektionen-DOM, Navigation, Mathematikplots und lokale Simulatoren. jsdom prüft Funktionen; es ersetzt keine Prüfung der Darstellung in echten Browsern oder mit assistiven Technologien. EVE besitzt eine eigene Testsuite und eigene Abhängigkeiten.

Dies ist eine neu zusammengestellte öffentliche Quellfassung. Private Forschungsarchive, Altsysteme, persönliche Dokumente, Zugangsdaten und deren Git-Historie sind nicht enthalten.

## Veröffentlichung und eigenes Hosting

Die Ausgabe dieses Quellstands ist für **www.mein-lernstudio.com** vorbereitet. Ein GitHub-Commit allein ändert die Domain nicht. Den konkreten Ablauf und die ausstehenden Live-Kontoprüfungen beschreibt [deploy/README.md](deploy/README.md). Für einen Fork ein eigenes Supabase-Projekt konfigurieren; keine Testregistrierungen am bestehenden Produktivdienst vornehmen.

## Mitmachen und Lizenz

Siehe [CONTRIBUTING.md](CONTRIBUTING.md), [LICENSES.md](LICENSES.md), [HALVETH-RIGHTS.md](HALVETH-RIGHTS.md) und [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Der historische Stand bis `48db86421040d47cc066953df53b61a23be7342e` bleibt unter ISC. Unterscheidbare neue HALVETH-Beiträge stehen unter der [HALVETH Public-Interest Research License 2.0](LICENSE-HALVETH-PIRL-2.0.md); ihre kommerzielle Nutzung erfordert eine vorherige schriftliche Lizenz und Beteiligungsvereinbarung. Die Lerninhalte bleiben für Lernende ohne Kauf, Abo oder Zahlungsdaten frei zugänglich. EVE und Drittbestandteile behalten ihren eigenen Geltungsbereich.
