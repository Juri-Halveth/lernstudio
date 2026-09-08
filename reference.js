/* =========================================================
   LERNSTUDIO, Wissens-Datenbank
   Glossar (Lexikon) + Spickzettel (Cheat-Sheets).
   Wird von app.js als window.REFERENCE genutzt.
   ========================================================= */

const REFERENCE = {

  /* ---------------- GLOSSAR ---------------- */
  glossary: [
    { term: "Algorithmus", def: "Eine Schritt-für-Schritt-Anleitung, um ein Problem zu lösen, wie ein Kochrezept für den Computer." },
    { term: "API", def: "Application Programming Interface. Eine festgelegte Schnittstelle, über die zwei Programme miteinander reden (z.B. deine App fragt einen Wetter-Server nach Daten)." },
    { term: "Argument", def: "Der konkrete Wert, den du einer Funktion mitgibst. Bei print(\"Hi\") ist \"Hi\" das Argument." },
    { term: "Array / Liste", def: "Eine geordnete Sammlung mehrerer Werte in einer Variable, z.B. [1, 2, 3]. In Python heißt sie Liste, in JavaScript Array." },
    { term: "Attribut", def: "Eine Zusatz-Information in einem HTML-Tag, geschrieben als name=\"wert\", z.B. href=\"...\" bei einem Link." },
    { term: "Base64", def: "Eine Methode, um Daten (Text, Bilder) als harmlose Buchstaben/Zahlen darzustellen. Keine echte Verschlüsselung, nur eine Umkodierung, leicht rückgängig zu machen." },
    { term: "Boolean", def: "Ein Wahrheitswert: entweder wahr (true) oder falsch (false). Basis jeder Entscheidung im Code." },
    { term: "Browser", def: "Das Programm, mit dem du Webseiten öffnest (Chrome, Edge, Firefox). Er versteht HTML, CSS und JavaScript." },
    { term: "Bug", def: "Ein Fehler im Programm, der zu falschem Verhalten führt. Das Beheben nennt man Debugging." },
    { term: "Bedingung (if)", def: "Code, der nur dann läuft, wenn etwas zutrifft: „WENN es regnet, DANN nimm einen Schirm.“" },
    { term: "CSS", def: "Cascading Style Sheets. Bestimmt das Aussehen einer Webseite: Farben, Schriften, Abstände, Layout." },
    { term: "DOM", def: "Document Object Model. Die vom Browser erzeugte Baum-Struktur einer Seite. JavaScript verändert über das DOM, was du siehst." },
    { term: "Debugging", def: "Das Suchen und Beheben von Fehlern (Bugs), ein völlig normaler, großer Teil des Programmierens." },
    { term: "Dictionary", def: "Eine Sammlung von Schlüssel→Wert-Paaren, z.B. {\"name\": \"Jarvis\", \"alter\": 25}. Ideal zum Nachschlagen." },
    { term: "Editor", def: "Das Programm, in dem man Code schreibt (z.B. VS Code). Im Lernstudio ist das Code-Feld dein Editor." },
    { term: "Element", def: "Ein vollständiger HTML-Baustein aus Start-Tag, Inhalt und End-Tag, z.B. <p>Text</p>." },
    { term: "Flag (CTF)", def: "Bei Hacking-Übungen (Capture the Flag) ein geheimer Text, den man durch Knobeln findet, meist im Format FLAG{...}. Der Beweis, dass man die Aufgabe gelöst hat." },
    { term: "Framework / Bibliothek", def: "Fertige Bausteine, die andere geschrieben haben und die du wiederverwendest, statt alles selbst zu bauen (z.B. React, Django)." },
    { term: "Funktion", def: "Ein benannter Block Code, den man beliebig oft aufrufen kann. Bekommt oft Eingaben (Parameter) und liefert ein Ergebnis (return)." },
    { term: "Hash", def: "Ein Einweg-Fingerabdruck von Daten. Aus dem Hash kann man das Original nicht zurückrechnen, deshalb werden Passwörter als Hash gespeichert, nie im Klartext." },
    { term: "HTML", def: "HyperText Markup Language. Beschreibt den Inhalt und die Struktur einer Webseite über Tags." },
    { term: "HTTP / HTTPS", def: "Die Sprache, in der Browser und Server reden. Bei HTTPS ist die Verbindung verschlüsselt (das Schloss-Symbol im Browser)." },
    { term: "Index", def: "Die Positionsnummer in einer Liste. Achtung: gezählt wird ab 0, das erste Element hat Index 0." },
    { term: "Interpreter", def: "Ein Programm, das deinen Code Zeile für Zeile ausführt. Python ist eine interpretierte Sprache." },
    { term: "JavaScript", def: "Die Programmiersprache des Browsers. Macht Webseiten interaktiv (Klicks, Animationen, Live-Updates)." },
    { term: "Kommentar", def: "Eine Notiz im Code für Menschen, die der Computer ignoriert. In Python mit #, in JavaScript mit //." },
    { term: "Konsole", def: "Ein Textfenster, in dem Ausgaben und Fehlermeldungen erscheinen. console.log() bzw. print() schreiben dorthin." },
    { term: "Loop / Schleife", def: "Wiederholt Code automatisch mehrfach, statt ihn zu kopieren, z.B. „für jeden Eintrag in der Liste…“." },
    { term: "Operator", def: "Ein Zeichen, das etwas tut: + addiert, * multipliziert, == vergleicht, = weist zu." },
    { term: "Parameter", def: "Ein Platzhalter in der Definition einer Funktion. Beim Aufruf wird er mit einem echten Wert (Argument) gefüllt." },
    { term: "Python", def: "Eine besonders gut lesbare Programmiersprache, ideal zum Einstieg und stark in Daten, KI und Automatisierung." },
    { term: "return", def: "Das Ergebnis, das eine Funktion zurückgibt, damit der restliche Code damit weiterarbeiten kann." },
    { term: "ROT13", def: "Eine simple Verschiebe-Verschlüsselung: jeder Buchstabe wird um 13 Stellen im Alphabet verschoben. Zweimal angewendet ergibt wieder das Original." },
    { term: "Server", def: "Ein Computer, der ständig läuft und auf Anfragen antwortet, z.B. liefert er Webseiten oder speichert Daten." },
    { term: "String", def: "Text im Code, immer in Anführungszeichen: \"Hallo\". String = Zeichenkette." },
    { term: "Syntax", def: "Die Grammatik einer Programmiersprache. Ein Syntaxfehler heißt: die Regeln der Schreibweise wurden verletzt." },
    { term: "Tag", def: "Ein HTML-Baustein in spitzen Klammern, z.B. <p>. Die meisten Tags haben ein Ende mit / (</p>)." },
    { term: "Variable", def: "Eine beschriftete Schublade, in der du einen Wert speicherst und über den Namen wieder abrufst." },
    { term: "XSS", def: "Cross-Site Scripting. Eine Sicherheitslücke, bei der fremder Schadcode in eine Webseite eingeschleust wird. Schutz: Eingaben immer prüfen/entschärfen." },
    { term: "SQL-Injection", def: "Angriff, bei dem Eingaben in eine Datenbank-Abfrage geschmuggelt werden und deren Sinn verändern (Login umgehen, oder mit UNION SELECT ganze Tabellen auslesen). Schutz: vorbereitete Abfragen." },
    { term: "Injection", def: "Oberbegriff für Angriffe, bei denen Eingaben zu Befehlen werden (SQL, Befehlszeile, HTML/JavaScript). Die Grundregel dagegen: Code und Daten strikt trennen." },
    { term: "CSP", def: "Content-Security-Policy. Eine Regel, die der Server mitschickt und die dem Browser sagt, welche Skripte laufen dürfen. Ein starkes Sicherheitsnetz gegen XSS." },
    { term: "Prepared Statement", def: "Vorbereitete/parametrisierte Abfrage. Struktur und Daten gehen getrennt an die Datenbank, Eingaben werden nie als Befehl ausgeführt. Der wirksamste Schutz gegen SQL-Injection." },
    { term: "HttpOnly", def: "Markierung für einen Cookie, die verhindert, dass JavaScript ihn lesen kann. Erschwert den Diebstahl von Sitzungs-Cookies bei einem XSS-Treffer." }
  ],

  /* ---------------- SPICKZETTEL ---------------- */
  cheatsheets: [
    {
      id: "cs-html", title: "HTML, wichtigste Tags", icon: "🌐", color: "#e34f26",
      rows: [
        { code: "<h1>…</h1> … <h6>", desc: "Überschriften, h1 am größten" },
        { code: "<p>…</p>", desc: "Absatz / normaler Text" },
        { code: "<a href=\"url\">…</a>", desc: "Link zu einer anderen Seite" },
        { code: "<img src=\"bild.jpg\" alt=\"…\">", desc: "Bild einbinden (alt = Beschreibung)" },
        { code: "<ul> <li>…</li> </ul>", desc: "Punkt-Liste mit Einträgen" },
        { code: "<ol> <li>…</li> </ol>", desc: "Nummerierte Liste" },
        { code: "<strong>…</strong>", desc: "Fett (wichtig)" },
        { code: "<em>…</em>", desc: "Kursiv (betont)" },
        { code: "<br>", desc: "Zeilenumbruch (ohne Ende-Tag)" },
        { code: "<div>…</div>", desc: "Container / Kiste zum Gruppieren" },
        { code: "<span>…</span>", desc: "Kleiner Inline-Container im Text" },
        { code: "<!-- … -->", desc: "Kommentar (wird nicht angezeigt)" }
      ]
    },
    {
      id: "cs-python", title: "Python, Grundbefehle", icon: "🐍", color: "#3d7bb0",
      rows: [
        { code: "print(\"Hi\")", desc: "Etwas anzeigen" },
        { code: "name = \"Jarvis\"", desc: "Variable setzen (Text)" },
        { code: "alter = 25", desc: "Variable setzen (Zahl)" },
        { code: "# Kommentar", desc: "Notiz, wird ignoriert" },
        { code: "+  -  *  /", desc: "Rechnen: plus, minus, mal, geteilt" },
        { code: "if x > 10:", desc: "Bedingung (Doppelpunkt + Einrückung!)" },
        { code: "else:", desc: "Sonst-Fall" },
        { code: "for i in range(5):", desc: "Schleife: 0,1,2,3,4" },
        { code: "while x < 10:", desc: "Schleife, solange Bedingung gilt" },
        { code: "len(\"abc\")", desc: "Länge (hier 3)" },
        { code: "str(42) / int(\"42\")", desc: "Umwandeln Text↔Zahl" },
        { code: "liste = [1, 2, 3]", desc: "Liste anlegen" }
      ]
    },
    {
      id: "cs-js", title: "JavaScript, Grundbefehle", icon: "⚡", color: "#e6b800",
      rows: [
        { code: "console.log(\"Hi\")", desc: "Etwas anzeigen" },
        { code: "let x = 5;", desc: "Variable (änderbar)" },
        { code: "const name = \"Jarvis\";", desc: "Variable (fest)" },
        { code: "// Kommentar", desc: "Notiz, wird ignoriert" },
        { code: "+  -  *  /", desc: "Rechnen" },
        { code: "if (x > 10) { … }", desc: "Bedingung (geschweifte Klammern)" },
        { code: "else { … }", desc: "Sonst-Fall" },
        { code: "for (let i=0; i<5; i++) { … }", desc: "Zähl-Schleife" },
        { code: "function gruss(n) { … }", desc: "Funktion definieren" },
        { code: "const a = [1, 2, 3];", desc: "Array anlegen" },
        { code: "a.length", desc: "Länge eines Arrays" },
        { code: "document.querySelector(\"#id\")", desc: "Element auf der Seite holen (DOM)" }
      ]
    },
    {
      id: "cs-errors", title: "Häufige Fehler & Lösung", icon: "🩹", color: "#c0562f",
      rows: [
        { code: "SyntaxError", desc: "Schreibfehler, oft fehlt eine Klammer, ein Anführungszeichen oder Doppelpunkt." },
        { code: "IndentationError (Python)", desc: "Falsche Einrückung. Nach : muss eingerückt werden (2 oder 4 Leerzeichen)." },
        { code: "ReferenceError: x is not defined", desc: "Variable benutzt, die es (noch) nicht gibt, oder Tippfehler im Namen." },
        { code: "= vs ==", desc: "= weist zu, == vergleicht. In Bedingungen brauchst du ==." },
        { code: "Text ohne Anführungszeichen", desc: "Text muss immer in \"...\", sonst hält der Computer es für einen Befehl." },
        { code: "Groß-/Kleinschreibung", desc: "Print ≠ print, MyVar ≠ myvar. Der Computer ist da streng." },
        { code: "Vergessenes End-Tag (HTML)", desc: "Zu <p> gehört </p>. Fehlt es, „rutscht“ das Layout." }
      ]
    },
    {
      id: "cs-security", title: "Sicherheit, sichere Muster", icon: "🛡️", color: "#2ea043",
      rows: [
        { code: "cursor.execute(\"... WHERE id = ?\", (id,))", desc: "SQL sicher (Python): parametrisierte Abfrage. Trennt Daten vom Befehl, killt SQL-Injection." },
        { code: "$stmt = $pdo->prepare(\"... WHERE id = ?\"); $stmt->execute([$id]);", desc: "SQL sicher (PHP/PDO): Prepared Statement. Nie Eingaben in den Query-String kleben." },
        { code: "db.query(\"... WHERE id = $1\", [id])", desc: "SQL sicher (Node/Postgres): Platzhalter statt Zusammenkleben." },
        { code: "element.textContent = eingabe", desc: "XSS-Schutz: Text sicher setzen statt innerHTML. Rendert nie HTML." },
        { code: "s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')", desc: "XSS-Schutz: HTML maskieren, bevor man Eingaben anzeigt." },
        { code: "Content-Security-Policy: default-src 'self'", desc: "XSS-Netz (HTTP-Header): verbietet fremde und inline Skripte." },
        { code: "Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax", desc: "Cookie-Schutz: JavaScript kommt nicht dran (HttpOnly), nur per HTTPS (Secure)." },
        { code: "bcrypt / argon2 (mit Salt)", desc: "Passwörter: langsam hashen. NIEMALS Klartext, nie MD5/SHA1." },
        { code: "if wert not in erlaubte: ablehnen", desc: "Eingaben nach WEISSER Liste prüfen (erlauben), nicht nach schwarzer (verbieten)." },
        { code: "least privilege", desc: "Jeder Dienst und DB-Nutzer bekommt nur die Rechte, die er WIRKLICH braucht." }
      ]
    }
  ]
};

window.REFERENCE = REFERENCE;
