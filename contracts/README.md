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

Voraussetzungen: Node.js 22 bis 24 und npm. Lokale Läufe verwenden Node.js 24.

```sh
npm ci --ignore-scripts
npm test
```

Die Installation lädt npm-Abhängigkeiten. Der anschließende Testlauf verwendet
ausschließlich Ganache im selben Prozess. Er startet keinen RPC-Server, nutzt
keinen Fork und sendet nichts an eine öffentliche Blockchain. Es gibt kein
Deploymentskript und keine Mainnet-Konfiguration. Vorhandene Wallets oder
Schlüssel werden nicht benötigt. Der Test erzeugt synthetische Accounts und
Signierschlüssel nur für diesen Lauf; der Harness schreibt keine privaten
Schlüssel in Dateien.

Exakte direkte Abhängigkeiten:

| Paket | Version |
| --- | --- |
| `@openzeppelin/contracts` | `4.9.6` |
| `ethers` | `6.15.0` |
| `ganache` | `7.9.2` |
| `solc` | `0.8.26` |

Compiler und lokale EVM verwenden Shanghai. Direkte Versionen und transitive
Abhängigkeiten sind im mitgelieferten npm-Lockfile gebunden. Am 08.09.2026 wurde
dieser Bestand frisch mit deaktivierten Installationsskripten installiert.
Frühere lokale Läufe verwendeten vorhandene Pakete über die optionalen Overrides.

Der npm-Audit dieser Entwicklungsabhängigkeiten meldete am 08.09.2026 insgesamt
36 Befunde (2 niedrig, 6 mittel, 23 hoch, 5 kritisch). Die alte lokale EVM-Werkzeugkette
ist deshalb ausschließlich für die beschriebenen synthetischen, netzgesperrten
Tests gebunden und keine Empfehlung für einen erreichbaren Dienst. Diese
Abhängigkeiten gelangen nicht in die veröffentlichte Browseranwendung. Vor einer
öffentlichen Blockchain-Ausgabe sind eine aktuelle Werkzeugkette und ein eigener
Abhängigkeitsreview nötig; ein Testpass beseitigt diese Befunde nicht.

Wer bereits passende Pakete installiert hat, kann `EVE_DEPENDENCY_ROOT` auf deren
Projektverzeichnis setzen. Normalerweise wird vollständig aus diesem Paket
aufgelöst. `EVE_OPENZEPPELIN_ROOT` kann zusätzlich auf das Verzeichnis zeigen,
das die `package.json` von `@openzeppelin/contracts` und dessen Solidity-Ordner
enthält. Die Overrides ändern die erwarteten Versionen nicht. Ihre absoluten
Werte erscheinen nicht in den erzeugten JSON-Receipts.

Unter Node 24 kann Ganache melden, dass sein optionales natives µWS-Modul nicht
passt. Es verwendet dann den ausgewiesenen JavaScript-Fallback. Dieser lokale
Testpfad benötigt keinen WebSocket-Server. Das ist eine Laufzeitbeobachtung,
keine Behauptung über aktuelle Produktversionen oder Produktionskompatibilität.

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
Compiler-Input, ABI/Bytecode, Quellhashes, Ergebnis und der synthetische lokale
Ganache-Chainzustand. `latest-receipt.json` enthält den relativen Pfad zum jüngsten
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
