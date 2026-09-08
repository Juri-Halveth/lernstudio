/* =========================================================
   LERNSTUDIO, Grundlagen-Katalog
   „Wie ein Computer wirklich funktioniert"
   Tiefe, anschauliche Artikel (window.BASICS).
   Hinweis: Fließtext-Felder nutzen Backticks (`), damit
   deutsche Anführungszeichen „ " niemals den Code brechen.
   sections[].demo: "binary" | "hover" | "hash" | "chokepoint"
   ========================================================= */

const BASICS = {
  articles: [

    /* 1 */ {
      id: "bin", icon: "🔢",
      title: `Nullen & Einsen, die Ursprache`,
      teaser: `Warum ein Computer nur zwei Zeichen kennt, und wie daraus alles wird.`,
      lead: `Ein Computer kennt keine Buchstaben, keine Bilder, keine Musik. Er kennt genau zwei Zustände: Strom an oder Strom aus. 1 oder 0. Alles andere wird daraus zusammengebaut.`,
      sections: [
        { h: "Das Bild dazu", html: `
          <div class="analogy"><b>Stell dir Millionen winziger Lichtschalter vor.</b> Jeder kann nur an (1) oder aus (0) sein. Ein einzelner Schalter sagt fast nichts, aber viele Schalter in einer Reihe ergeben ein Muster, und Muster können alles bedeuten.</div>
          <p>Warum nur zwei Zustände? Weil „an oder aus" die sicherste Sache der Welt ist, die man mit Strom bauen kann. Ein winziges Bauteil, der <b>Transistor</b>, ist genau so ein Schalter. „Ein bisschen Strom" wäre störanfällig, „an oder aus" ist eindeutig.</p>` },
        { h: "Wie aus Schaltern Zahlen werden", html: `
          <p>Ein einzelner Schalter heißt <b>Bit</b>. Acht Bits zusammen sind ein <b>Byte</b>. Und jetzt kommt der Trick: Jede Stelle hat einen festen <i>Wert</i> und man addiert einfach die Stellen, die „an" sind.</p>
          <div class="mathex">Stelle:   128  64  32  16   8   4   2   1
Schalter:   0   0   1   0   1   0   1   0
                    32      +8      +2       = 42</div>
          <p>Deshalb hat ein Byte genau <b>256</b> mögliche Muster (2 hoch 8 = 256), also die Zahlen 0 bis 255. Buchstaben, Farben, Töne, alles bekommt am Ende so eine Zahl. Der Buchstabe „A" ist zum Beispiel die 65 (in Binär: 0100 0001).</p>`, demo: "binary" }
      ],
      terms: [{ de: "Bit", en: "binary digit" }, { de: "Byte (8 Bit) / Oktett", en: "byte / octet" }, { de: "Binärsystem / Dualsystem", en: "binary" }, { de: "Transistor (Schalter)", en: "transistor" }],
      misconception: `„Binär ist eine komplizierte Geheimschrift." Nein, es ist einfach Zählen mit nur zwei Ziffern statt zehn. Dieselbe Zahl, nur anders geschrieben. (Und: der Computer speichert nicht wirklich „1" und „0", sondern physische Zustände wie Spannung an/aus, die wir als 1 und 0 lesen.)`,
      takeaway: `Alles im Computer ist am Ende eine Reihe von An/Aus-Schaltern. Zahlen, Text, Bilder, nur Muster aus 0 und 1.`
    },

    /* 2 */ {
      id: "logic", icon: "⚡",
      title: `Vom Strom zum „Wenn-Dann"`,
      teaser: `Wie tote Schalter plötzlich rechnen und entscheiden können.`,
      lead: `Die spannendste Frage: Wie kann ein Haufen Schalter etwas „entscheiden"? Die Antwort sind Logik-Gatter, winzige Schaltungen, die genau eine Wenn-Dann-Regel sind.`,
      sections: [
        { h: "Drei Bausteine, aus denen alles entsteht", html: `
          <p>Verbindet man Transistoren geschickt, entstehen <b>Logik-Gatter</b>. Es gibt nur eine Handvoll, und schon drei reichen, um damit theoretisch <i>jeden</i> Computer zu bauen:</p>
          <div class="mathex">UND : nur wenn A=1 UND B=1  → 1   (sonst 0)
ODER: wenn A=1 ODER B=1     → 1   (sonst 0)
NICHT: dreht um: aus 1 wird 0, aus 0 wird 1</div>
          <div class="analogy"><b>Ein UND-Gatter ist wie zwei Schalter hintereinander</b> in einer Taschenlampe: Das Licht geht nur an, wenn <i>beide</i> gedrückt sind. Das ist schon ein „Wenn beide, dann Licht", eine echte Entscheidung, ganz ohne Nachdenken.</div>` },
        { h: "So entsteht Rechnen", html: `
          <p>Kombiniert man solche Gatter, kann die Maschine addieren. „1 + 1" in Binär ist „10" (also 2). Ein kleines Schaltbild namens <b>Halbaddierer</b> erzeugt genau das mit zwei Gattern: die Ergebnis-Stelle (<b>XOR</b>: 1, wenn die Eingaben verschieden sind) und den Übertrag (<b>UND</b>: 1, wenn beide 1 sind). Stapelt man viele davon, addiert der Computer große Zahlen in Millionstel-Sekunden.</p>
          <p>Und dein <code>if</code> im Programm? Das ist am Ende genau so ein Gatter-Muster: <b>Wenn</b> Bedingung wahr (1), <b>dann</b> nimm diesen Weg. Die „Intelligenz" des Computers ist in Wahrheit sehr viele sehr einfache Ja/Nein-Entscheidungen, unfassbar schnell hintereinander.</p>` }
      ],
      terms: [{ de: "Logik-Gatter", en: "logic gate" }, { de: "UND / ODER / NICHT", en: "AND / OR / NOT" }, { de: "Exklusiv-ODER", en: "XOR" }, { de: "Halbaddierer", en: "half adder" }, { de: "Rechenwerk", en: "ALU" }],
      misconception: `„Der Computer denkt." Er entscheidet nichts im menschlichen Sinn, er folgt blitzschnell festen Wenn-Dann-Regeln aus Gattern. Kein Funke Absicht, nur Logik.`,
      takeaway: `Rechnen und Entscheiden sind nichts Magisches: Sie entstehen aus winzigen Wenn-Dann-Schaltungen (Gattern), millionenfach kombiniert.`
    },

    /* 3 */ {
      id: "process", icon: "⚙️",
      title: `Was ein Programm zum Laufen bringt`,
      teaser: `Prozesse, Fäden und der blitzschnelle Jongleur im Inneren.`,
      lead: `Ein Programm auf der Festplatte ist nur ein totes Rezept. Erst wenn es geladen wird und läuft, wird ein lebendiger Prozess daraus. Dieses Verwalten ist die Hauptaufgabe des Betriebssystems.`,
      sections: [
        { h: "Programm vs. Prozess", html: `
          <div class="analogy"><b>Das Programm ist das Kochrezept, der Prozess ist das tatsächliche Kochen</b> mit echtem Herd, echten Zutaten und einem Zettel, wo du gerade im Rezept stehst.</div>
          <p>Ein <b>Prozess</b> bekommt vom System einen eigenen Speicherbereich (damit Programme sich nicht gegenseitig ins Handwerk pfuschen) und läuft in kleinen Untereinheiten, den <b>Threads</b> („Fäden"). Ein Thread ist ein einzelner Handlungsstrang innerhalb des Programms.</p>` },
        { h: "Der Trick mit dem „gleichzeitig\"", html: `
          <p>Ein Prozessor-Kern kann in Wahrheit immer nur <b>einen</b> Faden zur Zeit abarbeiten. Warum fühlt sich alles gleichzeitig an, Musik, Browser, Download? Weil ein Teil des Systems, der <b>Scheduler</b> („Einteiler"), jedem Programm winzige Zeitscheiben gibt und blitzschnell umschaltet.</p>
          <div class="mathex">Kern:  [Browser 3ms][Musik 3ms][Download 3ms][Browser 3ms] …
        so schnell, dass es für dich gleichzeitig aussieht.</div>
          <p>Dieses Umschalten heißt <b>Kontextwechsel</b>: Das System merkt sich, wo Programm A stehengeblieben ist, legt es zur Seite und holt Programm B hervor. Ein einzelner Koch, der so schnell zwischen zehn Töpfen springt, dass alle zu köcheln scheinen.</p>` }
      ],
      terms: [{ de: "Prozess", en: "process" }, { de: "Thread / Faden", en: "thread" }, { de: "Scheduler / Einteiler", en: "scheduler" }, { de: "Kontextwechsel", en: "context switch" }, { de: "Nebenläufigkeit vs. Parallelität", en: "concurrency vs. parallelism" }],
      misconception: `„Viele Programme offen = alles läuft echt gleichzeitig." Auf einem Kern läuft nichts wirklich parallel, es wird nur extrem schnell umgeschaltet (Nebenläufigkeit). Erst mehrere Kerne rechnen wirklich gleichzeitig (Parallelität).`,
      takeaway: `Ein Prozess ist ein laufendes Programm mit eigenem Speicher. Das System teilt die Rechenzeit in winzige Scheiben, „gleichzeitig" ist meist nur ein blitzschneller Wechsel.`
    },

    /* 4 */ {
      id: "kernel", icon: "🌱",
      title: `Der Urpunkt: Kernel & Start`,
      teaser: `Was ganz zuerst passiert, und wer im System das Sagen hat.`,
      lead: `Du fragst nach dem absoluten Ursprung rund ums Betriebssystem. Den gibt es wirklich, es ist eine Kette vom ersten Stromstoß bis zum fertigen Desktop, und in ihrer Mitte sitzt der Chef: der Kernel.`,
      sections: [
        { h: "Die Startkette (Boot)", html: `
          <p>Wenn du den Knopf drückst, passiert das hier der Reihe nach:</p>
          <div class="mathex">Strom an
   → Firmware (BIOS/UEFI), der eingebaute Erst-Code im Chip
   → Bootloader, sucht das Betriebssystem
   → Kernel, der Kern des Systems startet
   → Benutzer-Bereich, Desktop, Programme, du</div>
          <p>Das nennt man <b>booten</b> (von „sich an den eigenen Stiefeln hochziehen"). Jede Stufe startet die nächste.</p>
          <p><b>Der allertiefste Urpunkt</b> ist noch eine Ebene darunter: Der Prozessor ist fest verdrahtet, seine <i>allererste</i> Anweisung an einer festen Adresse im Firmware-Chip zu holen, der Fachbegriff ist <b>Reset-Vektor</b>. Das ist der einzige Schritt, den niemand „lädt": Er ist in die Hardware eingebrannt. Ab da lädt jede Stufe die nächste.</p>` },
        { h: "Der Kernel, der eigentliche Chef", html: `
          <div class="analogy"><b>Der Kernel ist der Hausmeister mit dem Generalschlüssel.</b> Kein Programm redet direkt mit Prozessor, Speicher oder Festplatte, alles geht über ihn.</div>
          <p>Deshalb gibt es zwei Welten: den <b>Kernel-Modus</b> (voller Zugriff auf alles, „Ring 0") und den <b>Benutzer-Modus</b> (eingesperrt, „Ring 3"), in dem deine Programme laufen. Will ein normales Programm etwas Heikles, eine Datei schreiben, ins Netz, muss es <i>höflich beim Kernel anfragen</i>. Diese Trennung ist der wichtigste Schutz überhaupt: Ein abstürzendes Programm kann so nicht das ganze System mitreißen.</p>
          <p>Und der „Urpunkt" der Ordnerstruktur? Auch der existiert: die <b>Wurzel</b>, geschrieben <code>/</code> (unter Windows z.B. <code>C:\\</code>). Von dort zweigt <i>alles</i> ab.</p>` }
      ],
      terms: [{ de: "Kernel / Systemkern", en: "kernel" }, { de: "Firmware (BIOS/UEFI)", en: "firmware" }, { de: "Bootloader / Startprogramm", en: "bootloader" }, { de: "Reset-Vektor", en: "reset vector" }, { de: "Kernel- vs. Benutzer-Modus", en: "kernel/user mode (ring 0/3)" }],
      misconception: `„Das Betriebssystem ist ein einziges großes Programm." Der Kern (Kernel) ist nur ein, besonders mächtiger, Teil. Drumherum liegen viele Programme im abgesicherten Benutzer-Modus.`,
      takeaway: `Vom Stromstoß bis zum Desktop läuft eine feste Startkette. In der Mitte sitzt der Kernel: der einzige mit vollem Zugriff, deshalb muss jedes Programm ihn um heikle Dinge bitten.`
    },

    /* 5 */ {
      id: "files", icon: "🌳",
      title: `Der Datei-Baum & die Übergänge`,
      teaser: `Wie Ordner aufgebaut sind, und wie man es fachlich nennt, wenn Daten eine Grenze überqueren.`,
      lead: `Du hast genau ins Schwarze gefragt: Was passiert, wenn Daten einen Ordner „verlassen"? Und wie heißt das in der Fachsprache? Hier ist beides.`,
      sections: [
        { h: "Der Baum", html: `
          <div class="analogy"><b>Das Dateisystem ist ein Stammbaum</b>, der oben an der <b>Wurzel</b> (<code>/</code> bzw. <code>C:\\</code>) beginnt und sich in Ordner und Unter-Ordner verzweigt, wie Äste. Ein <b>Pfad</b> wie <code>C:\\Nutzer\\Jarvis\\brief.txt</code> ist einfach die Wegbeschreibung von der Wurzel bis zur Datei.</div>
          <p>Wichtig zu wissen: Ein Dateiname ist <i>nicht</i> die Datei. Der Name ist nur ein Schildchen, das auf den echten Datensatz zeigt (den <b>Inode</b>). Wenn du eine Datei innerhalb derselben Festplatte in einen anderen Ordner <b>verschiebst</b>, wandern die Daten deshalb gar nicht! Es wird nur das Schildchen umgehängt, blitzschnell. Erst über verschiedene Festplatten hinweg wird wirklich kopiert und dann gelöscht.</p>` },
        { h: "Die Fachsprache für „Grenze überqueren\"", html: `
          <p>Jetzt der Kern deiner Frage. Wenn Daten oder ein Befehl eine Grenze überqueren, hat das je nach Grenze einen eigenen Namen:</p>
          <div class="mathex">Programm  → will Datei lesen/schreiben →  Kernel
   Fachbegriff:  SYSTEMAUFRUF (system call)
   = die höfliche Anfrage vom Benutzer- in den Kernel-Modus

Programm A  → schickt Daten →  Programm B
   Fachbegriff:  INTERPROZESS-KOMMUNIKATION (IPC),
                 z.B. über eine „Pipe" (Rohr)

Daten  → verlassen den Computer ins Netz
   Fachbegriff:  Sie werden in PAKETE zerlegt (packets)</div>
          <p>Ein <b>Systemaufruf</b> ist also der offizielle „Grenzübergang" vom eigenen Programm hinein zum Kernel. Genau dort, an dieser engen Stelle, prüft das System: Darfst du das überhaupt? (Merk dir das, es kommt beim Thema Sicherheit wieder.)</p>` }
      ],
      terms: [{ de: "Pfad", en: "path" }, { de: "Inode / Datei-Datensatz", en: "inode" }, { de: "Verschieben = umbenennen", en: "rename()" }, { de: "Systemaufruf", en: "system call" }, { de: "Interprozess-Kommunikation", en: "IPC / pipe" }],
      misconception: `„Eine Datei verschieben trägt die Daten physisch von A nach B." Auf derselben Platte wird nur das Namens-Schildchen umgehängt (der Inode bleibt), die Daten bleiben liegen. Deshalb geht Verschieben viel schneller als Kopieren.`,
      takeaway: `Der Ordner-Baum ist eine Wegbeschreibung ab der Wurzel. Überquert etwas eine Grenze, hat das einen Namen: zum Kernel = Systemaufruf, zwischen Programmen = IPC, ins Netz = Pakete.`
    },

    /* 6 */ {
      id: "events", icon: "🖱️",
      title: `Die Maus, die reagiert, ohne Klick`,
      teaser: `Dein Lieblingsrätsel: Wieso reagiert ein Feld schon, wenn man nur drüberfährt?`,
      lead: `Du hast es genau gespürt: Du bewegst nur die Maus über ein Feld, kein Klick, und es reagiert schon. Da muss eine Verbindung sein. Es gibt sie. Es ist eine ganze Kette, und sie ist wunderschön logisch.`,
      sections: [
        { h: "Die Kette, Glied für Glied", html: `
          <p>In dem Moment, in dem du die Maus bewegst, passiert das hier, viele Male pro Sekunde:</p>
          <div class="mathex">1. Maus meldet Bewegung  →  HARDWARE-INTERRUPT
   („Unterbrich mal kurz, ich hab was!")
2. Der TREIBER übersetzt das Signal in Zahlen (x, y)
3. Das System macht daraus ein EREIGNIS (event): „mousemove x=… y=…"
4. Die EREIGNISSCHLEIFE (event loop) verteilt es
5. Das Programm prüft: welches Feld liegt an dieser Stelle?
   → das nennt man HIT-TESTING (Treffer-Ermittlung)
6. Der EREIGNIS-HANDLER dieses Feldes feuert
7. Das Feld wird NEU GEZEICHNET (z.B. leuchtet auf)</div>
          <div class="analogy"><b>Wie ein Kellner mit Funkgerät:</b> Die Maus funkt „ich bin jetzt hier", die Zentrale (System) ruft aus „Bewegung bei Punkt x,y!", und der zuständige Tisch (das Feld) hört seinen Namen und reagiert.</div>
          <p><b>Ein Profi-Detail, das kaum jemand kennt:</b> Eine moderne USB-Maus „ruft" den Computer gar nicht von selbst an. Der Computer <b>fragt sie viele Male pro Sekunde ab</b> (das heißt <b>Polling</b>, z.B. 125-mal pro Sekunde), und erst wenn die Abfrage Bewegung meldet, löst er den Interrupt aus. Kurios und schön: <b>unten am Kabel wird abgefragt, oben in der Software wird auf Ereignisse gewartet</b> beides zugleich.</p>` },
        { h: "Probier es selbst", html: `
          <p>Genau dieses <code>mousemove</code>-Ereignis kannst du hier <b>live</b> feuern sehen. Beweg die Maus über das Feld, ganz ohne Klick, und schau der Kette beim Arbeiten zu:</p>`, demo: "hover" }
      ],
      terms: [{ de: "Interrupt / Unterbrechung", en: "interrupt" }, { de: "Treiber", en: "device driver" }, { de: "Ereignis", en: "event" }, { de: "Ereignisschleife", en: "event loop" }, { de: "Ereignis-Handler", en: "event listener/handler" }, { de: "Abfrage", en: "polling" }],
      misconception: `„Ohne Klick passiert nichts." Doch, schon reine Bewegung erzeugt laufend Ereignisse (mousemove, mouseover). Das Programm entscheidet nur, ob es darauf reagiert.`,
      takeaway: `„Reagieren beim Drüberfahren" ist kein Zauber, sondern eine Kette: Interrupt → Treiber → Ereignis → Ereignisschleife → Handler → Neuzeichnen. Software hört ständig zu.`
    },

    /* 7 */ {
      id: "network", icon: "🌐",
      title: `Wie eine Verbindung entsteht`,
      teaser: `Was wirklich passiert, wenn zwei Computer anfangen zu reden.`,
      lead: `Wenn du eine Seite öffnest, „verbinden" sich zwei Computer. Aber was heißt das? Es gibt einen erstaunlich höflichen Handschlag, und deine Daten reisen zerhackt in kleinen Päckchen.`,
      sections: [
        { h: "Alles reist in Paketen", html: `
          <div class="analogy"><b>Ein großes Buch passt nicht durch den Briefschlitz</b> also zerlegst du es in nummerierte Seiten, steckst jede in einen Umschlag und schickst sie los. Der Empfänger sortiert sie wieder zusammen.</div>
          <p>Genau so reisen Daten: in <b>Paketen</b>. Jedes Paket trägt eine <b>Ziel-Adresse</b> (die <b>IP-Adresse</b>, wie eine Hausnummer im Internet) und einen <b>Port</b> (wie die Wohnungsnummer / das richtige Programm im Zielrechner). Unterwegs sorgen Router dafür, dass jedes Päckchen seinen Weg findet, das nennt man <b>Routing</b>.</p>` },
        { h: "Der Handschlag (TCP)", html: `
          <p>Bevor ernsthaft Daten fließen, machen die zwei Computer einen kurzen, dreistufigen Gruß, den <b>Drei-Wege-Handschlag</b>:</p>
          <div class="mathex">Du     → Server:  „Hallo, bist du bereit?"   (SYN)
Server → Du:      „Ja, und du auch?"         (SYN-ACK)
Du     → Server:  „Ja! Los geht's."           (ACK)
        ─────────  ab jetzt steht die Verbindung  ─────────</div>
          <p>Ein feines Detail: Die mittlere Antwort ist <b>eine einzige</b> Nachricht mit zwei „Häkchen" gleichzeitig (SYN <i>und</i> ACK), genau deshalb heißt es <b>Drei</b>-Wege-Handschlag und nicht Vier-Wege.</p>
          <p>Dieser Handschlag (<b>TCP</b>) sorgt dafür, dass beide Seiten wirklich verbunden sind und kein Päckchen verloren geht, fehlt eins, wird es neu geschickt. Darüber liegt dann die eigentliche Sprache der Webseiten (<b>HTTP/HTTPS</b>). Man stapelt das in <b>Schichten</b>: unten die Leitung, dann IP (Adresse), dann TCP (Zuverlässigkeit), oben die Anwendung.</p>` }
      ],
      terms: [{ de: "Paket", en: "packet" }, { de: "IP-Adresse", en: "IP address" }, { de: "Port", en: "port" }, { de: "Drei-Wege-Handschlag", en: "three-way handshake" }, { de: "Schichtenmodell", en: "network layers" }],
      misconception: `„Eine Verbindung ist eine durchgehende Leitung wie ein Wasserschlauch." Es gibt keinen festen Schlauch, nur viele einzelne Pakete, die getrennt reisen und beim Empfänger wieder sortiert werden. Die „Verbindung" ist nur ein abgestimmter Zustand in beiden Rechnern.`,
      takeaway: `Daten reisen als nummerierte Pakete an eine IP-Adresse + Port. Ein dreistufiger Handschlag (SYN, SYN-ACK, ACK) baut vorher eine zuverlässige Verbindung auf.`
    },

    /* 8 */ {
      id: "hash", icon: "🔒",
      title: `Wie ein Hash aufgebaut ist`,
      teaser: `Der Fingerabdruck für Daten, eine Einbahnstraße mit Lawineneffekt.`,
      lead: `Du hast Hashes im Security-Teil schon benutzt. Jetzt schauen wir, wie sie innen ticken: eine Rechnung, die man nur vorwärts gehen kann, und die bei der kleinsten Änderung komplett umkippt.`,
      sections: [
        { h: "Die Einbahnstraße", html: `
          <div class="analogy"><b>Wie Pürieren:</b> Aus Obst wird Smoothie, leicht. Aus dem Smoothie wieder das ganze Obst? Unmöglich. Ein Hash ist so eine Einbahnstraße für Daten.</div>
          <p>Ein <b>Hash</b> nimmt <i>beliebig</i> viel Text und macht daraus einen <b>immer gleich langen</b> Code (bei SHA-256 immer 64 Zeichen). Egal ob ein Buchstabe oder ein ganzes Buch reingeht, heraus kommt derselbe kompakte Fingerabdruck. Und aus dem Fingerabdruck kann man das Original <b>nicht</b> zurückrechnen.</p>` },
        { h: "Der Lawineneffekt, live", html: `
          <p>Das Zweite ist fast unheimlich: Änderst du auch nur <b>ein einziges Zeichen</b>, kippt fast der ganze Hash um. Probier es aus, tippe deinen Namen, dann ändere einen Buchstaben:</p>`, demo: "hash" },
        { h: "Wie das innen entsteht (grob)", html: `
          <p>SHA-256 zerhackt die Eingabe in feste Blöcke und mischt sie in vielen Runden mit sich selbst durch, mit genau den Bit-Operationen aus den ersten Kapiteln (verschieben, UND/ODER, Addieren mit Überlauf). Winzige Eingabe-Änderung → anderer Startpunkt → nach Dutzenden Runden ein völlig anderes Ergebnis. Ein kleines Spielzeug-Beispiel für die <i>Idee</i> (nicht sicher!):</p>
          <div class="mathex">Mini-Hash = (Summe der Zeichen-Werte) mod 7
„Hi"  →  (72 + 105) mod 7  =  177 mod 7  =  2</div>
          <p>Deshalb speichern gute Dienste dein Passwort <b>nie im Klartext</b>, sondern nur einen (gesalzenen) Hash, und für Passwörter sogar extra <i>langsame</i> Hash-Verfahren, damit Raten teuer wird. Selbst bei einem Datenleck bleibt dein echtes Passwort so geschützt.</p>` }
      ],
      terms: [{ de: "Hash / Streuwert", en: "hash" }, { de: "Einwegfunktion", en: "one-way function" }, { de: "Lawineneffekt", en: "avalanche effect" }, { de: "Kollision", en: "collision" }, { de: "Salz (öffentlich!)", en: "salt" }],
      misconception: `„Ein Hash ist Verschlüsselung." Nein, Verschlüsseltes kann man mit Schlüssel wieder lesbar machen, einen Hash nicht. Wer einen Hash „knackt", rechnet ihn nicht zurück, sondern rät Eingaben und hasht jede, bis eine passt.`,
      takeaway: `Ein Hash ist ein Einweg-Fingerabdruck: beliebige Eingabe → feste Länge, nicht umkehrbar, bei kleinster Änderung völlig anders. Perfekt, um Passwörter und Echtheit zu prüfen.`
    },

    /* 9 */ {
      id: "surface", icon: "🛡️",
      title: `Die engste Schnittstelle`,
      teaser: `Dein eigener Gedanke: Wo man am wenigsten Angriffsfläche hat, schützt man am besten.`,
      lead: `Du hast selbst das Bild vom Astbaum gebracht, wo jeder Knoten seine Schnittstellen hat, und an der engsten Stelle kann man am meisten schützen. Das ist keine Anfänger-Idee. Das ist ein Grundprinzip der ganzen IT-Sicherheit.`,
      sections: [
        { h: "Angriffsfläche & Flaschenhals", html: `
          <p>Jede Stelle, an der ein System mit der Außenwelt in Kontakt kommt, ein Eingabefeld, ein Port, ein Systemaufruf, ist eine mögliche Tür. Alle Türen zusammen nennt man die <b>Angriffsfläche</b>. Regel eins: <b>Je kleiner die Angriffsfläche, desto sicherer.</b> Was es nicht gibt, kann nicht angegriffen werden.</p>
          <div class="analogy"><b>Eine Burg mit hundert Fenstern ist schwer zu bewachen. Eine Burg mit einem einzigen Tor ist leicht zu bewachen.</b> Deshalb baut man Systeme absichtlich so, dass alles durch wenige, kontrollierte Stellen muss, den <b>Flaschenhals</b> (engste Schnittstelle).</div>` },
        { h: "Warum die enge Stelle Gold wert ist", html: `
          <p>An so einem Flaschenhals, einer <b>Vertrauensgrenze</b> kannst du <i>jeden</i> Übergang prüfen: Erinnerst du dich an den <b>Systemaufruf</b>, die enge Tür zum Kernel? Genau dort fragt das System: „Darfst du das?" Ein Wächter an einer Tür schlägt tausend Wächter an tausend Fenstern.</p>
          <p>Daraus folgen zwei goldene Regeln der Profis:</p>
          <div class="mathex">Geringste Rechte  (least privilege):
   Jeder bekommt nur so viel Macht, wie er WIRKLICH braucht.
Mehrschichtige Verteidigung  (defense in depth):
   Fällt eine Mauer, steht dahinter die nächste.</div>`, demo: "chokepoint" }
      ],
      terms: [{ de: "Angriffsfläche", en: "attack surface" }, { de: "Vertrauensgrenze", en: "trust boundary" }, { de: "Flaschenhals / enge Stelle", en: "chokepoint" }, { de: "Prinzip der geringsten Rechte", en: "least privilege" }, { de: "Mehrschichtige Verteidigung", en: "defense in depth" }],
      misconception: `„Mehr Sicherheitstechnik = sicherer." Nicht unbedingt. Oft ist Weglassen stärker: weniger offene Türen (kleinere Angriffsfläche) schützt besser als viele Wächter überall. Einfachheit ist eine Sicherheitseigenschaft.`,
      takeaway: `Sicherheit heißt: Türen reduzieren und den einen unvermeidlichen Durchgang streng bewachen. An der engsten Schnittstelle schützt du mit dem wenigsten Aufwand am meisten, genau dein Gedanke.`
    },

    /* 10 */ {
      id: "zeroday", icon: "🕳️",
      title: `Zero-Day: die Lücke, die keiner kennt`,
      teaser: `Was die „Zero-Lücke" ist, und warum sie so gefürchtet wird.`,
      lead: `Du hast nach der „Zero-Lücke" gefragt. Gemeint ist der Zero-Day (fachlich: Zero-Day-Lücke), und der Name erklärt schon fast alles: null Tage Vorwarnung.`,
      sections: [
        { h: "Warum „null Tage\"?", html: `
          <p>Zuerst zwei Wörter sauber trennen: Eine <b>Schwachstelle</b> (vulnerability) ist ein Fehler, ein offenes Fensterchen in einem Programm. Ein <b>Exploit</b> ist der fertige Trick, der dieses Fenster tatsächlich ausnutzt.</p>
          <div class="analogy"><b>Ein Zero-Day ist ein geheimer Ersatzschlüssel für ein Schloss, von dem der Hersteller nichts weiß.</b> Es gibt noch keinen ausgetauschten Zylinder, keine Warnung, null Tage Zeit zum Reagieren.</div>
          <p>„Zero-Day" heißt: Am Tag, an dem der Angriff auffliegt (oder zuschlägt), hatten die Verteidiger <b>null Tage</b>, um ihn vorher zu schließen. Es gibt noch keinen <b>Patch</b> (keine Reparatur).</p>` },
        { h: "Der Lebenslauf einer Lücke", html: `
          <div class="mathex">1. Jemand ENTDECKT die Schwachstelle
2. Solange nur ER sie kennt = „Zero-Day"  (am gefährlichsten)
3. Sie wird gemeldet oder ausgenutzt
4. Hersteller baut einen PATCH (Reparatur)
5. Alle updaten → die Lücke ist geschlossen</div>
          <p>Wichtig: <b>Sobald ein Patch existiert, ist es kein Zero-Day mehr</b> dann wird es zur „bekannten Lücke" (im Fachjargon <i>n-Day</i>). Gefährlich bleibt sie trotzdem, denn viele updaten zu spät. Deshalb sind Updates so wichtig: Jedes Update schließt Lücken, die inzwischen bekannt wurden. Und deshalb ist verantwortungsvolles Melden (<b>Responsible Disclosure</b>, aus dem Security-Teil) so wertvoll, es gibt den Verteidigern die Tage zurück, die der Zero-Day ihnen nimmt.</p>` }
      ],
      terms: [{ de: "Schwachstelle", en: "vulnerability" }, { de: "Exploit / Ausnutzung", en: "exploit" }, { de: "Zero-Day-Lücke", en: "zero-day" }, { de: "Patch / Reparatur", en: "patch" }, { de: "bekannte Lücke", en: "n-day" }],
      misconception: `„Zero-Day heißt, der Angriff dauert null Tage." Nein, es heißt, die Verteidiger hatten null Tage Vorwarnung, weil noch niemand die Lücke kannte oder ein Patch existierte. Ausgenutzt wird sie oft monatelang.`,
      takeaway: `Ein Zero-Day ist eine Lücke, für die es noch keine Reparatur gibt, null Tage Vorsprung für die Verteidigung. Darum: schnell updaten und Lücken verantwortungsvoll melden.`
    }

  ]
};

window.BASICS = BASICS;
