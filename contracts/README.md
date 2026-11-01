# EVE: lokaler Forschungsprototyp für Lernbelohnungen

Dieses Paket enthält einen ERC20-Forschungsprototyp und 18 lokale Prüfungen.
Es ist kein veröffentlichter Token, kein geprüftes Produktionssystem und keine
Zusage über eine spätere Ausgabe, einen Wert oder einen finanziellen Anspruch.

Ein berechtigter Aussteller signiert einen EIP-712-Nachweis mit Lernwallet,
Lektions-ID, Nonce und Ablaufzeit. Die genannte Wallet kann damit einmal pro
Lektion die festgelegte Testmenge beanspruchen. Zusätzlich wird ihre Nonce
verbraucht. Signaturen sind an Chain, Contract, Domainnamen und Version gebunden.
Die anfängliche Tokenmenge ist null; das bei der Erstellung gesetzte Limit und
die Menge je erfolgreichem Nachweis bleiben unveränderlich.

Die Übertragungsfunktion stammt aus ERC20 und erhebt keine Token-Transfersteuer.
Es gibt keine zahlbare Kauf-/Verkaufsfunktion. Mögliche Gasgebühren einer realen
Blockchain sind davon getrennt; das Paket enthält keine Gasfinanzierung.

## Lokal ausführen

Voraussetzungen: Node.js ab 22.13 bis unter 25 und npm. Lokale Läufe verwenden Node.js 24.

```sh
npm ci --ignore-scripts
npm run test:tooling
npm test
npm run verify:receipt
```

Die Installation lädt npm-Abhängigkeiten. Der anschließende Testlauf verwendet
ausschließlich Hardhats EDR als simuliertes In-Process-Netz. Er startet keinen RPC-Server, nutzt
keinen Fork und sendet nichts an eine öffentliche Blockchain. Es gibt kein
Deploymentskript und keine Mainnet-Konfiguration. Vorhandene Wallets oder
Schlüssel werden nicht benötigt. Der Test erzeugt synthetische Accounts und
Signierschlüssel nur für diesen Lauf; der Harness schreibt keine privaten
Schlüssel in Dateien.

Exakte direkte Abhängigkeiten:

| Paket | Version |
| --- | --- |
| `@openzeppelin/contracts` | `4.9.6` |
| `ethers` | `6.17.0` |
| `hardhat` | `3.21.2` |
| `solc` | `0.8.26` |

Der [aktuelle EDR-Adapterreview](DEPENDENCY_REVIEW_20261101.md) bindet Ersatz und Tests; der [Ganache-Review vom 24.10.](DEPENDENCY_REVIEW_20261024.md) bleibt als historischer Beleg erhalten. `npm run test:tooling` prüft Compiler, Signaturpfad und die EVM-Root-Grenze; die 18 Transaktionstests bleiben eine getrennte Abnahme. Die Compiler-Helfer `tmp` und `follow-redirects` sind auf 0.2.7 und 1.16.2 gebunden. Hardhats `zod` wird wegen [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) auf 4.6.7 überschrieben; dieser Major-Override ist nur für den benannten Harness-Pfad geprüft.

Compiler und lokale EVM verwenden Shanghai. Direkte Versionen und transitive
Abhängigkeiten sind im mitgelieferten npm-Lockfile gebunden. Die EDR-Konfiguration
enthält nur `eveLocal` mit Chain-ID 31337, drei frisch generierten Testkonten,
keinem Fork und keiner HTTP-URL. Fehlgeschlagene Transaktionen liefern einen
Status-0-Receipt, damit der bestehende Rollback-Test denselben Oracle behält.

Der frühere Ganache-Auditstand ist im historischen Review dokumentiert. Ein frischer
lokaler `npm audit` für den neuen Lockfile meldete am 01.11.2026 keine Befunde.
Das bindet den geprüften Registry- und Lockfile-Stand, nicht sämtliche künftigen
Advisories oder jede Laufzeitwirkung. Diese Entwicklungsabhängigkeiten gelangen
nicht in die veröffentlichte Browseranwendung. Vor einer öffentlichen
Blockchain-Ausgabe bleiben ein eigener Abhängigkeitsreview und ein vollständiger
Sicherheitsprozess nötig.

Der EVM-Test lädt EDR und seine Konfiguration ausschließlich aus diesem Paket;
ein fremder `EVE_DEPENDENCY_ROOT` wird vor dem Providerstart abgelehnt. Für den
reinen Compiler-/Signaturtest kann ein passender `EVE_DEPENDENCY_ROOT` weiter
verwendet werden. `EVE_OPENZEPPELIN_ROOT` kann auf das Verzeichnis zeigen,
das die `package.json` von `@openzeppelin/contracts` und dessen Solidity-Ordner
enthält. Die Overrides ändern die erwarteten Versionen nicht. Ihre absoluten
Werte erscheinen nicht in den erzeugten JSON-Receipts. Ein fremder
`EVE_OPENZEPPELIN_ROOT` bindet Name, Version und gelesene Quellhashes, aber
beweist keine Herkunft aus dem npm-Lockfile-Tarball; der Standardlauf nutzt
den lokalen Paketroot.

EDR benötigt eine passende native Plattformkomponente. Der lokale Windows-Lauf
und der separate Linux-Contracts-CI-Lauf prüfen ihre jeweilige Installation;
ein Erfolg auf einer Plattform belegt nicht alle anderen Architekturen.

## Illustrative Testwerte

Die Fixtures verwenden 10 EVE je Nachweis, gewöhnlich ein Limit von 100 EVE und
für die Limitprüfung 20 EVE. Diese Zahlen testen das Verhalten. Sie sind keine
vereinbarte Tokenökonomie und kein Vorschlag für die öffentliche Gesamtmenge.

Geprüft werden berechtigte Ausgabe, doppelte Lektions-/Nonce-Nutzung, falscher
Aussteller und Empfänger, Ablaufzeit, anderer Contract und andere Signaturdomain,
Mengenlimit einschließlich Zustandsrücknahme, Rollenwechsel und gewöhnliche
steuerfreie Übertragung. Außerdem werden ungültige Konfigurationen und das
Fehlen einer zahlbaren Kaufoberfläche geprüft.

## Aussagegrenzen

- Eine gültige Ausstellersignatur beweist die gebundene Freigabe dieses
  Ausstellers. Sie beweist nicht, dass ein Mensch etwas gelernt oder verstanden hat.
- Eine Person kann mehrere Wallets führen. Personeneindeutigkeit wird nicht geprüft.
- Ein weiterhin berechtigter Aussteller kann inhaltlich falsche Nachweise ausgeben.
  Die lokale Quizauswertung eines Browsers erhält keine Mintberechtigung.
- Der Administrator kann Aussteller und weitere Administratoren verwalten.
  Schlüsselverwaltung, Verantwortlichkeiten und reale Lernprüfung bleiben offen.
- Lektions-IDs stammen vom Aussteller; es gibt kein geprüftes Curriculumregister.
- ERC1271-Contract-Aussteller, Brücken, mehrere Chains, Pause-/Recovery-Funktionen
  und eine Sperre einzelner Nachweise sind nicht implementiert.
- Offene Fragen zu Datenschutz, rechtlicher Einordnung, Fairness, Gebühren und
  tatsächlicher Ausgabe werden durch den Testpass nicht beantwortet.

Jeder Lauf schreibt in einen eigenen Ordner unter `evidence/`. Dort liegen
Compiler-Input, ABI/Bytecode, Quellhashes und Ergebnis. Der synthetische EDR-
Chainzustand verbleibt im Prozessspeicher. `latest-receipt.json` enthält den relativen Pfad zum jüngsten
Ergebnis. Diese Laufdateien und `node_modules/` sind von Git ausgeschlossen.
Die eingebauten Socket-/TLS-/Fetch-Sperren begrenzen den Testpfad; sie sind kein
vollständiger Nachweis sämtlicher Betriebssystemaktivität.

Die Contract-Quelle bleibt gegenüber dem vorherigen lokalen Forschungsstand
bytegleich. Ein Testpass gilt für die 18 benannten lokalen Beispiele. Vor einer
Integration folgen Auswahl und Review; vor realer Ausgabe wären zusätzliche
Entscheidungen und Prüfungen erforderlich.

## Lizenz

Der eigene Paketcode steht unter MIT; die Solidity-Datei behält ihren
`SPDX-License-Identifier: MIT`. OpenZeppelin wird als eigene npm-Abhängigkeit
bezogen und behält seine Lizenz und Hinweise. Im Paket sind keine Abhängigkeiten,
vorhandenen Wallets oder privaten Schlüssel enthalten.
