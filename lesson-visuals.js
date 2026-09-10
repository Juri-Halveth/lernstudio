/* =========================================================
   LERNSTUDIO — Bildliche Denkmodelle für jede Lektion
   ---------------------------------------------------------
   Erzeugt aus Lernpfad, Stufe und Lektion ein deterministisches,
   interaktives SVG-Modell. Die Grafik ist eine Lernbrücke, kein
   Ersatz für die fachlich genauere Erklärung der Lektion.
   ========================================================= */
(function (root) {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const tidy = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const low = (value) => tidy(value).toLocaleLowerCase("de-DE");
  const includes = (text, words) => words.some((word) => text.includes(word));
  const node = (label, detail) => ({ label: tidy(label), detail: tidy(detail) });
  const edgeChain = (count) => Array.from({ length: Math.max(0, count - 1) }, (_, i) => [i, i + 1]);
  const model = (kind, name, intro, nodes, question, edges) => ({
    kind,
    name,
    intro,
    nodes,
    edges: edges || edgeChain(nodes.length),
    question,
    note: "Vereinfachtes Denkmodell. Die Lektion erklärt Voraussetzungen, Ausnahmen und Fachdetails."
  });

  const BEGINNER_SCENES = {
    ki: "Du schreibst einem Helfer eine klare Bitte. Du schaust dir seinen Vorschlag an und prüfst selbst, ob er zu deiner Frage und deinen Quellen passt.",
    einstieg: "Du möchtest am Handy oder Computer etwas tun. Wir gehen dabei nur einen Klick, eine Taste oder eine Entscheidung nach der anderen.",
    machine: "Stell dir eine winzige Werkstatt vor: Ein Zettel kommt hinein, wird gelesen und löst genau eine kleine Handlung aus.",
    html: "Eine Webseite ist wie ein Blatt mit Überschrift, Bildern und Kästen. HTML sagt dem Browser zuerst nur, was davon was ist.",
    python: "Du erklärst einem sehr wörtlichen Helfer eine Aufgabe in kleinen Sätzen. Er rät nichts dazu, sondern folgt deiner Reihenfolge.",
    js: "Du erklärst einer Webseite in kleinen Sätzen, was nach einem Klick oder einer Eingabe geschehen soll.",
    sec: "Denk an eine Haustür: Bevor jemand hinein darf, schaust du, wer dort steht und was wirklich erlaubt ist.",
    math: "Mathematik beginnt nicht mit einer schweren Formel. Sie beginnt mit Dingen, die du vergleichen kannst: mehr, weniger, gleich, vorher und nachher.",
    mktg: "Ein Mensch sucht Hilfe. Du hörst zu, erklärst verständlich, was du anbieten kannst, und schaust danach, ob es wirklich geholfen hat.",
    seo: "Jemand tippt eine Frage in eine Suche. Eine gute Seite antwortet so klar, dass sie gefunden und verstanden werden kann.",
    proj: "Denk an ein Brettspiel: Erst siehst du, wie alles liegt. Dann geschieht ein Zug, eine Regel greift und danach sieht es anders aus.",
    srv: "Ein Server ist erst einmal nur ein anderer Computer. Er wartet auf eine Aufgabe, erledigt sie und meldet zurück, was passiert ist.",
    matheanfassen: "Zahlen beschreiben etwas, das du sehen oder vergleichen kannst. Wir verändern eine Sache und beobachten gemeinsam, was dadurch anders wird."
  };

  function describeBeginnerLayer(context) {
    const track = context && context.track || {};
    const stage = context && context.stage || {};
    const lesson = context && context.lesson || {};
    const text = low([lesson.title, stage.name, track.name].join(" "));
    const id = tidy(track.id);
    const make = (scene, steps) => ({
      scene,
      invitation: "Für den Anfang reicht eine Frage: Was ist danach anders als vorher?",
      steps: steps || ["Erst anschauen", "Eine Sache verändern", "Die Wirkung bemerken"],
      bridge: "Den Fachbegriff zeigen wir dir danach. Dann hat das neue Wort schon ein Bild, an dem es festhalten kann."
    });

    if (lesson.type === "quiz" || text.startsWith("quiz")) {
      return make("Das hier ist keine Prüfung über deinen Wert. Du holst eine Idee kurz aus dem Gedächtnis, vergleichst sie mit der Erklärung und darfst es danach noch einmal versuchen.", ["In Ruhe erinnern", "Eine Antwort wählen", "Aus der Erklärung lernen"]);
    }
    if ((id === "python" || id === "js") && includes(text, ["schleife", "loop", "while", "wiederhol"])) {
      return make("Stell dir einen Stapel Teller vor. Solange noch ein Teller da ist, nimmst du einen herunter und machst denselben kleinen Handgriff noch einmal.", ["Schauen, ob noch etwas da ist", "Einen Schritt machen", "Noch einmal nachsehen"]);
    }
    if ((id === "python" || id === "js") && includes(text, ["variable", "let ", "const ", "wert", "speicher"])) {
      return make("Stell dir ein beschriftetes Glas vor. Auf dem Aufkleber steht zum Beispiel „Anzahl“. Was im Glas liegt, darf später ausgetauscht werden; der Aufkleber hilft dir, es wiederzufinden.", ["Aufkleber lesen", "Inhalt hineinlegen", "Inhalt später benutzen"]);
    }
    if ((id === "python" || id === "js") && includes(text, ["funktion", "parameter", "argument", "return", "rückgabe"])) {
      return make("Denk an eine Küchenmaschine: Du gibst etwas hinein, drückst auf Start und bekommst nach einer festen Arbeitsweise etwas zurück. Du musst nicht jedes Zahnrad einzeln bedienen.", ["Etwas hineingeben", "Die Arbeit laufen lassen", "Das Ergebnis nehmen"]);
    }
    if ((id === "python" || id === "js") && includes(text, ["if", "else", "beding", "entscheidung", "boolean", "wahr", "falsch"])) {
      return make("Du kennst das aus dem Alltag: Wenn es regnet, nimmst du einen Schirm. Wenn nicht, lässt du ihn zu Hause. Eine klare Frage führt zu einem von zwei Wegen.", ["Eine Frage stellen", "Ja oder Nein erkennen", "Den passenden Weg nehmen"]);
    }
    if ((id === "python" || id === "js") && includes(text, ["array", "liste", "objekt", "index", "element"])) {
      return make("Stell dir einen Eierkarton oder ein beschriftetes Regal vor. Mehrere Dinge gehören zusammen, und jeder Platz hilft dir, genau das richtige wiederzufinden.", ["Das Ganze ansehen", "Den passenden Platz finden", "Ein Ding lesen oder ändern"]);
    }
    if (id === "machine" && includes(text, ["bit", "binär", "null", "eins", "zwei"])) {
      return make("Ein Lichtschalter kennt zunächst nur zwei klar unterscheidbare Lagen: aus oder an. Viele solcher kleinen Entscheidungen zusammen können später Zahlen, Bilder oder Wörter darstellen.", ["Zwei Lagen unterscheiden", "Mehrere Schalter verbinden", "Dem Muster eine Bedeutung geben"]);
    }
    if (id === "html" && includes(text, ["link", "href", "url", "adresse", "navigation"])) {
      return make("Ein Link ist wie ein Schild an einer Tür. Der sichtbare Text sagt dir, wohin es gehen soll; dahinter ist die genaue Adresse befestigt, die der Browser öffnet.", ["Schild lesen", "Adresse dahinter prüfen", "Zum Ziel gehen"]);
    }
    if (id === "html" && includes(text, ["flex", "grid", "layout", "zentrier", "position", "responsive"])) {
      return make("Stell dir einen Esstisch vor. Erst legst du fest, wie viel Platz vorhanden ist. Danach ordnest du Teller und Gläser so an, dass alles auch auf einem kleineren Tisch noch passt.", ["Verfügbaren Platz sehen", "Dinge anordnen", "Auf kleinerem Platz prüfen"]);
    }
    if (id === "sec" && includes(text, ["hash", "passwort", "verschlüssel", "base64", "rot13", "hex"])) {
      return make("Nicht alles, was geheimnisvoll aussieht, ist auch geschützt. Eine Geschenkverpackung, ein Schloss und ein Fingerabdruck erfüllen drei ganz verschiedene Aufgaben.", ["Aussehen und Schutz trennen", "Nach Schlüssel oder Rückweg fragen", "Prüfen, wofür es gedacht ist"]);
    }
    if ((id === "math" || id === "matheanfassen") && includes(text, ["gleichung", "gleichheit", "waage", "lösen", "nullstelle"])) {
      return make("Stell dir eine Waage mit zwei Schalen vor. Nimmst du auf beiden Seiten dasselbe weg oder legst dasselbe dazu, bleibt die Waage im Gleichgewicht.", ["Beide Seiten ansehen", "Auf beiden Seiten gleich handeln", "Gleichgewicht erneut prüfen"]);
    }
    if ((id === "math" || id === "matheanfassen") && includes(text, ["funktion", "graph", "steigung", "parabel", "ableitung", "kurve", "sinus", "cosinus"])) {
      return make("Denk an einen Spazierweg auf einer Karte. Jeder Schritt nach rechts führt dich zu einer bestimmten Höhe. Viele einzelne Stellen zusammen lassen die Form des Weges erkennen.", ["Eine Stelle wählen", "Die zugehörige Höhe finden", "Viele Stellen als Weg sehen"]);
    }
    if (id === "srv" && includes(text, ["http", "api", "request", "response", "webhook", "zahlung"])) {
      return make("Stell dir einen Briefwechsel vor. Du schickst eine klare Bitte an die richtige Adresse. Dort wird sie geprüft, bearbeitet und mit einer verständlichen Antwort zurückgeschickt.", ["Bitte und Adresse prüfen", "Bearbeitung abwarten", "Antwort richtig lesen"]);
    }
    return {
      scene: BEGINNER_SCENES[id] || "Du musst noch nichts auswendig wissen. Wir schauen zuerst gemeinsam hin, verändern eine kleine Sache und beobachten, was passiert.",
      invitation: "Für den Anfang reicht eine Frage: Was ist danach anders als vorher?",
      steps: ["Erst anschauen", "Eine Sache verändern", "Die Wirkung bemerken"],
      bridge: "Den Fachbegriff zeigen wir dir danach. Dann hat das neue Wort schon ein Bild, an dem es festhalten kann."
    };
  }

  function codeModel(text, language) {
    if (includes(text, ["schleife", "loop", "while", " for ", "wiederhol"])) {
      return model("cycle", "Wiederholung als Kreislauf", "Eine Schleife ist kein Springen ins Nichts. Sie prüft einen Zustand und führt einen Weg erneut aus.", [
        node("Startzustand", "Welche Werte gelten vor dem ersten Durchlauf?"),
        node("Bedingung", "Darf ein weiterer Durchlauf stattfinden?"),
        node("Aktion", "Was verändert dieser Durchlauf?"),
        node("Neuer Zustand", "Mit welchem Wert beginnt die nächste Prüfung?")
      ], "Welche Veränderung verhindert eine Endlosschleife?", [[0,1],[1,2],[2,3],[3,1]]);
    }
    if (includes(text, ["if", "else", "beding", "entscheidung", "boolean", "wahr", "falsch"])) {
      return model("branch", "Entscheidung als zwei Wege", "Ein Programm wählt nicht aus Gefühl. Eine überprüfbare Bedingung öffnet genau den passenden Zweig.", [
        node("Eingabe", "Welcher Zustand wird geprüft?"),
        node("Bedingung", "Ist der Ausdruck wahr oder falsch?"),
        node("Wahr-Zweig", "Diese Handlung läuft nur bei wahr."),
        node("Falsch-Zweig", "Diese Handlung läuft sonst.")
      ], "Welche einzige Eingabe würde den anderen Weg öffnen?", [[0,1],[1,2],[1,3]]);
    }
    if (includes(text, ["funktion", "parameter", "argument", "return", "rückgabe"])) {
      return model("sequence", "Funktion als kleine Maschine", "Eine Funktion erhält etwas, verarbeitet es nach einer Regel und gibt ein Ergebnis oder eine Wirkung zurück.", [
        node("Eingabe", "Argumente oder ein auslösender Zustand kommen hinein."),
        node("Parameter", "Namen machen die Eingaben im Inneren ansprechbar."),
        node("Regel", "Der Funktionskörper verarbeitet den Zustand."),
        node("Ergebnis", "Rückgabewert oder sichtbare Wirkung kommt heraus.")
      ], "Was ändert sich am Ergebnis, wenn du nur eine Eingabe veränderst?");
    }
    if (includes(text, ["variable", "let ", "const ", "wert", "speicher"])) {
      return model("layers", "Variable als gebundener Name", "Der Name ist nicht der Wert. Er hilft dem Programm, einen gespeicherten Zustand wiederzufinden.", [
        node("Name", "So sprichst du die Stelle im Code an."),
        node("Bindung", "Der Name wird mit einem Zustand verbunden."),
        node("Wert", "Das ist die gerade gespeicherte Information."),
        node("Verwendung", "Eine spätere Anweisung liest oder verändert sie.")
      ], "Was bleibt gleich, wenn der Wert wechselt?");
    }
    if (includes(text, ["array", "liste", "objekt", "dictionary", "index", "element"])) {
      return model("nest", "Viele Werte mit einer Ordnung", "Eine Sammlung wird verständlich, wenn jeder Teil über Position oder Namen erreichbar bleibt.", [
        node("Sammlung", "Der äußere Behälter hält zusammengehörige Werte."),
        node("Adresse", "Index oder Schlüssel zeigt auf einen Teil."),
        node("Element", "Hier liegt der einzelne Wert."),
        node("Operation", "Lesen, ändern, ergänzen oder entfernen.")
      ], "Welche Adresse führt genau zu dem Wert, den du brauchst?");
    }
    return model("sequence", `${language} von Text zu Wirkung`, "Code ist zuerst Text. Erst eine Verarbeitungskette macht daraus beobachtbares Verhalten.", [
      node("Quelltext", "Menschen schreiben Zeichen nach Regeln."),
      node("Lesen", "Die Laufzeit erkennt Struktur und Bedeutung."),
      node("Ausführen", "Anweisungen verändern einen Zustand."),
      node("Ausgabe", "Die Wirkung wird sichtbar oder weitergegeben.")
    ], "An welcher Stelle würde ein einzelner Fehler die Wirkung verändern?");
  }

  function describeModel(context) {
    const track = context && context.track || {};
    const stage = context && context.stage || {};
    const lesson = context && context.lesson || {};
    const title = tidy(lesson.title) || "Diese Lektion";
    const text = low([title, stage.name, track.name].join(" "));
    const id = tidy(track.id);

    if (lesson.type === "quiz" || title.toLocaleLowerCase("de-DE").startsWith("quiz")) {
      return model("cycle", "Quiz als Lernschleife", `„${title}“ macht Wissen abrufbar und zeigt, welche Verbindung noch Aufmerksamkeit braucht.`, [
        node("Erinnern", "Rufe die Idee ohne sichtbare Lösung ab."),
        node("Entscheiden", "Wähle anhand deiner Begründung."),
        node("Rückmeldung", "Vergleiche Antwort und Erklärung."),
        node("Neu erklären", "Formuliere den Zusammenhang mit eigenen Worten.")
      ], "Kannst du auch erklären, warum die anderen Möglichkeiten nicht tragen?", [[0,1],[1,2],[2,3],[3,0]]);
    }

    if (id === "ki") {
      return model("sequence", "Vom Auftrag zur geprüften Antwort", "Ein Modellvorschlag wird erst durch eine passende Prüfung zur brauchbaren Grundlage für deine eigene Entscheidung.", [
        node("Auftrag", "Beschreibe die konkrete Aufgabe und das erlaubte Material."),
        node("Vorschlag", "Das Modell erzeugt einen noch zu prüfenden Antwortkandidaten."),
        node("Prüfung", "Vergleiche die Aussage mit Quellen und vorher festgelegten Kriterien."),
        node("Entscheidung", "Übernimm belegte Teile und halte offene Fragen sichtbar.")
      ], "Welche konkrete Prüfung würde einen Fehler in diesem Vorschlag sichtbar machen?");
    }

    if (id === "machine") {
      if (includes(text, ["bit", "binär", "null", "eins", "zwei"])) {
        return model("layers", "Vom Schalter zur Bedeutung", "Ein Bit ist keine winzige Zahl mit eingebautem Sinn. Bedeutung entsteht durch die vereinbarte Lesart eines Zustands.", [
          node("Physischer Zustand", "Zum Beispiel niedrige oder hohe Spannung."),
          node("Bit", "Wir lesen die Zustände als 0 oder 1."),
          node("Muster", "Mehrere Bits bilden unterscheidbare Kombinationen."),
          node("Bedeutung", "Ein Format sagt, ob das Muster Zahl, Zeichen oder Befehl meint.")
        ], "Welche Bedeutung hätte dasselbe Bitmuster unter einem anderen Format?");
      }
      return model("cycle", "Fetch, Decode, Execute", "Ein Prozessor arbeitet als Zustandsmaschine: holen, deuten, ausführen und den nächsten Zustand vorbereiten.", [
        node("Speicher", "Hier liegt die nächste Anweisung als Bitmuster."),
        node("Fetch", "Der Prozessor holt die Anweisung."),
        node("Decode", "Die Steuereinheit deutet das Muster."),
        node("Execute", "Register, Rechenwerk oder Speicher werden verändert.")
      ], "Welcher Zustand bestimmt, welche Anweisung als Nächstes geholt wird?", [[0,1],[1,2],[2,3],[3,0]]);
    }

    if (id === "html") {
      if (includes(text, ["flex", "grid", "layout", "zentrier", "position", "responsive"])) {
        return model("nest", "Layout vom Container zur Anordnung", "Der äußere Container gibt Regeln vor. Seine direkten Kinder reagieren darauf und der Browser berechnet die sichtbare Position.", [
          node("Container", "Der gemeinsame Elternbereich definiert den Raum."),
          node("Layout-Regel", "Flex, Grid oder Positionierung ordnet die Kinder."),
          node("Elemente", "Größe und Reihenfolge liefern weitere Bedingungen."),
          node("Bildschirm", "Der Browser berechnet die endgültigen Rechtecke.")
        ], "Welche Regel gehört zum Container und welche zum einzelnen Element?");
      }
      if (includes(text, ["link", "href", "url", "adresse", "navigation"])) {
        return model("sequence", "Vom sichtbaren Link zum Ziel", "Ein Link verbindet sichtbaren Inhalt mit einer Adresse. Erst der Klick löst die Navigation aus.", [
          node("Linktext", "Das sieht und versteht der Mensch."),
          node("href", "Das Attribut bindet die Zieladresse."),
          node("Klick", "Die Handlung startet die Navigation."),
          node("Ziel", "Der Browser fordert die neue Ressource an.")
        ], "Würde derselbe Linktext auch auf eine andere Adresse zeigen können?");
      }
      return model("layers", "HTML wird zum Dokumentbaum", "HTML beschreibt verschachtelte Elemente. Der Browser formt daraus einen Baum und rendert die sichtbare Seite.", [
        node("Zeichen", "Tags und Text stehen in der Datei."),
        node("Elemente", "Start, Inhalt und Ende bilden Einheiten."),
        node("DOM-Baum", "Eltern und Kinder machen Beziehungen sichtbar."),
        node("Darstellung", "CSS und Browserlayout erzeugen Pixel.")
      ], "Welches Element ist Elternteil des sichtbaren Inhalts?");
    }

    if (id === "python") return codeModel(text, "Python");
    if (id === "js") return codeModel(text, "JavaScript");

    if (id === "sec") {
      if (includes(text, ["hash", "passwort", "verschlüssel", "base64", "rot13", "hex"])) {
        return model("layers", "Darstellung, Schutz und Prüfung trennen", "Gleich aussehende Zeichenoperationen können völlig verschiedene Sicherheitsbedeutungen haben.", [
          node("Eingabe", "Die ursprüngliche Information."),
          node("Transformation", "Kodieren, hashen oder verschlüsseln sind verschiedene Operatoren."),
          node("Eigenschaft", "Lesbarkeit, Umkehrbarkeit und Schlüsselbedarf unterscheiden sich."),
          node("Prüfung", "Der Zweck entscheidet, ob die Methode passt.")
        ], "Ist die Transformation nur anders lesbar oder wirklich gegen unbefugten Zugriff geschützt?");
      }
      return model("branch", "Eingabe trifft auf eine Vertrauensgrenze", "Sicherheit beginnt dort, wo eine Eingabe nicht automatisch dieselbe Autorität wie das System besitzen darf.", [
        node("Eingabe", "Daten kommen aus einer weniger vertrauenswürdigen Quelle."),
        node("Grenze", "Validierung und Berechtigung entscheiden über den Übergang."),
        node("Erlaubter Weg", "Die beabsichtigte, begrenzte Wirkung."),
        node("Abgewiesener Weg", "Unzulässige Wirkung wird gestoppt und protokolliert.")
      ], "Welche konkrete Wirkung darf diese Eingabe niemals selbst autorisieren?", [[0,1],[1,2],[1,3]]);
    }

    if (id === "math" || id === "matheanfassen") {
      if (includes(text, ["gleichung", "gleichheit", "waage", "lösen", "nullstelle"])) {
        return model("balance", "Gleichung als erhaltenes Gleichgewicht", "Eine Umformung darf die Beziehung nicht heimlich verändern. Was du auf einer Seite tust, muss als äquivalenter Schritt gebunden sein.", [
          node("Linke Seite", "Ein Ausdruck beschreibt einen Wert."),
          node("Gleichheit", "Beide Seiten sollen denselben Wert bezeichnen."),
          node("Rechte Seite", "Der zweite Ausdruck beschreibt denselben Wert."),
          node("Umformung", "Eine erlaubte Operation erhält die Lösungsmenge.")
        ], "Welche Operation verändert beide Seiten, ohne die Lösung zu verlieren?", [[0,1],[2,1],[1,3]]);
      }
      if (includes(text, ["funktion", "graph", "steigung", "parabel", "ableitung", "kurve", "sinus", "cosinus"])) {
        return model("graph", "Funktion als Beziehung von Eingabe und Ausgabe", "Ein Graph ist die sichtbare Spur vieler zusammengehöriger Wertepaarungen.", [
          node("x wählen", "Eine Eingabe wird festgelegt."),
          node("Regel anwenden", "Die Funktion berechnet den zugehörigen Wert."),
          node("y erhalten", "Die Ausgabe gehört genau zu dieser Eingabe."),
          node("Punkt setzen", "Viele Punkte machen Form und Veränderung sichtbar.")
        ], "Welche Änderung der Regel würdest du sofort an der Kurve erkennen?");
      }
      if (includes(text, ["prozent", "anteil", "wahrscheinlichkeit", "bruch"])) {
        return model("balance", "Teil, Ganzes und Verhältnis", "Prozent und Bruch beschreiben keine einzelnen Dinge, sondern eine Beziehung zwischen Teil und Bezugsgröße.", [
          node("Ganzes", "Welche Menge gilt als hundert Prozent?"),
          node("Anteil", "Welcher Teil wird betrachtet?"),
          node("Verhältnis", "Teil geteilt durch Ganzes."),
          node("Darstellung", "Bruch, Dezimalzahl und Prozent können dasselbe Verhältnis zeigen.")
        ], "Was ändert sich, wenn nur das Bezugs-Ganze wechselt?");
      }
      return model("layers", "Vom Zeichen zur mathematischen Beziehung", "Mathematik trennt Symbol, Definition, Regel und Schluss. Erst ihre Bindung macht eine Aussage prüfbar.", [
        node("Zeichen", "Eine Ziffer oder Formel ist zunächst Darstellung."),
        node("Definition", "Sie bindet, wofür das Zeichen steht."),
        node("Beziehung", "Regeln verbinden die definierten Objekte."),
        node("Schluss", "Eine Folgerung gilt nur unter diesen Voraussetzungen.")
      ], "Welche Definition muss gelten, damit der nächste Schluss erlaubt ist?");
    }

    if (id === "mktg") {
      return model("cycle", "Marketing als lernende Wirkungskette", "Marketing ist nicht nur eine Botschaft. Es verbindet beobachtetes Bedürfnis, verständliches Angebot, Handlung und messbare Rückmeldung.", [
        node("Beobachtung", "Welches reale Problem oder Ziel ist sichtbar?"),
        node("Versprechen", "Welche konkrete Hilfe wird verständlich angeboten?"),
        node("Handlung", "Was kann der Mensch freiwillig als Nächstes tun?"),
        node("Messung", "Welche Reaktion zeigt, ob die Annahme trug?")
      ], "Welche kleinste Messung könnte deine erste Annahme widerlegen?", [[0,1],[1,2],[2,3],[3,0]]);
    }

    if (id === "seo") {
      if (includes(text, ["anzeige", "sea", "klickpreis", "kampagne", "google ads"])) {
        return model("cycle", "Anzeige als messbares Experiment", "Eine Anzeige verbindet Suchabsicht, Botschaft, Zielseite und Ergebnis. Nur die vollständige Kette lässt sich sinnvoll bewerten.", [
          node("Suchabsicht", "Was will der Mensch in diesem Moment?"),
          node("Anzeige", "Welche konkrete Relevanz wird versprochen?"),
          node("Zielseite", "Löst die Seite das angekündigte Problem ein?"),
          node("Ergebnis", "Kosten, Handlung und Qualität werden gemeinsam gemessen.")
        ], "Welche Zahl wäre ohne Bezug zur tatsächlichen Handlung irreführend?", [[0,1],[1,2],[2,3],[3,0]]);
      }
      return model("sequence", "Von der Frage zum Suchergebnis", "Eine Suchmaschine muss Inhalte erst entdecken, verstehen und für eine konkrete Suchabsicht auswählen.", [
        node("Suchfrage", "Wörter drücken eine Absicht unvollständig aus."),
        node("Crawling", "Ein Bot entdeckt erreichbare Ressourcen."),
        node("Index", "Inhalt und Beziehungen werden geordnet."),
        node("Ergebnis", "Passende Dokumente werden für diesen Kontext ausgewählt.")
      ], "Welche Stufe fehlt, wenn eine gute Seite gar nicht auffindbar ist?");
    }

    if (id === "proj") {
      return model("cycle", "Programm als Zustandskreislauf", "Ein interaktives Programm beobachtet einen Zustand, verarbeitet eine Handlung und zeichnet die neue Wirklichkeit.", [
        node("Zustand", "Wo befinden sich Figuren, Werte oder Aufgaben gerade?"),
        node("Eingabe", "Mensch, Zeit oder System löst etwas aus."),
        node("Regel", "Die Programmlogik berechnet den nächsten Zustand."),
        node("Darstellung", "Das neue Ergebnis wird sichtbar und wieder zum Zustand.")
      ], "Welche einzige Regel verhindert einen ungültigen nächsten Zustand?", [[0,1],[1,2],[2,3],[3,0]]);
    }

    if (id === "srv") {
      if (includes(text, ["http", "api", "request", "response", "webhook", "zahlung"])) {
        return model("sequence", "Anfrage und Antwort über Systemgrenzen", "Netzwerkkommunikation besteht aus benannten Nachrichten, Empfängern, Zuständen und überprüfbaren Antworten.", [
          node("Client", "Eine Anwendung formuliert eine Anfrage."),
          node("Request", "Methode, Adresse, Header und Daten reisen zum Dienst."),
          node("Server", "Berechtigung und Logik verarbeiten die Anfrage."),
          node("Response", "Status und Daten machen das Ergebnis beobachtbar.")
        ], "Welcher Status unterscheidet fehlende Anmeldung von fehlender Berechtigung?");
      }
      return model("sequence", "Befehl verändert einen benannten Zustand", "Terminalbefehle wirken nicht magisch. Sie laufen in einem Kontext aus Nutzer, Pfad, Rechten und aktuellem Systemzustand.", [
        node("Kontext", "Wer bist du und in welchem Ordner arbeitest du?"),
        node("Befehl", "Programmname und Argumente beschreiben die gewünschte Operation."),
        node("Prüfung", "Existenz, Rechte und Syntax begrenzen die Wirkung."),
        node("Neuer Zustand", "Datei, Prozess oder Ausgabe macht die Änderung sichtbar.")
      ], "Welche Kontextangabe müsste sich ändern, damit derselbe Befehl anders wirkt?");
    }

    if (id === "einstieg") {
      if (includes(text, ["betrug", "phishing", "scam", "verdächtig", "link"])) {
        return model("branch", "Pause vor einer riskanten Handlung", "Zwischen einer Nachricht und ihrer Wirkung liegt ein entscheidender Moment: Herkunft und Ziel unabhängig prüfen.", [
          node("Nachricht", "Etwas fordert Aufmerksamkeit oder Eile."),
          node("Prüfpause", "Absender, Adresse und Forderung getrennt kontrollieren."),
          node("Sicherer Weg", "Bekannten Kontakt oder selbst eingegebene Adresse nutzen."),
          node("Stopp", "Nicht klicken, keine Daten senden, Hilfe holen.")
        ], "Welche Information kannst du über einen zweiten, unabhängigen Weg prüfen?", [[0,1],[1,2],[1,3]]);
      }
      return model("sequence", "Mensch, Gerät und sichtbare Rückmeldung", "Digitale Bedienung wird leichter, wenn jede Handlung mit ihrem technischen Weg und ihrer Rückmeldung verbunden wird.", [
        node("Absicht", "Was möchtest du erreichen?"),
        node("Eingabe", "Klick, Taste oder Berührung übermittelt deine Handlung."),
        node("System", "Programm und Gerät verändern ihren Zustand."),
        node("Rückmeldung", "Bild, Ton oder Meldung zeigt, was geschah.")
      ], "Welche sichtbare Rückmeldung beweist, dass deine Handlung angekommen ist?");
    }

    return model("sequence", `Denkweg für „${title}“`, "Jede Lektion lässt sich als prüfbare Bewegung von Ausgangslage, Handlung, Wirkung und Erklärung betrachten.", [
      node("Ausgangslage", "Was ist vor der Veränderung beobachtbar?"),
      node("Eine Handlung", "Welche einzelne Sache wird verändert?"),
      node("Wirkung", "Was ist danach anders?"),
      node("Erklärung", "Welche Beziehung verbindet Handlung und Wirkung?")
    ], "Welche Gegenprobe würde deine Erklärung schwächen?");
  }

  function svgEl(name, attrs) {
    const element = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach((key) => element.setAttribute(key, String(attrs[key])));
    return element;
  }

  function positions(kind, count) {
    if (kind === "layers") return Array.from({ length: count }, (_, i) => ({ x: 400, y: 42 + i * 58 }));
    if (kind === "cycle") return [{x:160,y:130},{x:330,y:55},{x:640,y:130},{x:330,y:215}].slice(0, count);
    if (kind === "branch") return [{x:100,y:130},{x:330,y:130},{x:630,y:70},{x:630,y:195}].slice(0, count);
    if (kind === "balance") return [{x:140,y:90},{x:400,y:130},{x:660,y:90},{x:400,y:220}].slice(0, count);
    if (kind === "nest") return [{x:120,y:130},{x:315,y:130},{x:510,y:130},{x:690,y:130}].slice(0, count);
    return Array.from({ length: count }, (_, i) => ({ x: 95 + i * (610 / Math.max(1, count - 1)), y: 130 }));
  }

  function mount(host, context) {
    if (!host || typeof document === "undefined") return null;
    const data = describeModel(context || {});
    const beginner = describeBeginnerLayer(context || {});
    const lessonTitle = tidy(context && context.lesson && context.lesson.title) || "diese Lektion";

    const beginnerBox = document.createElement("section");
    beginnerBox.className = "lesson-beginner";
    beginnerBox.setAttribute("aria-label", "Einfacher Einstieg in die Lektion");
    const beginnerKicker = document.createElement("p");
    beginnerKicker.className = "lesson-beginner-kicker";
      beginnerKicker.textContent = "GRUNDBILD";
    const beginnerTitle = document.createElement("h3");
      beginnerTitle.textContent = "Ein Bild zum Gedanken.";
    const beginnerScene = document.createElement("p");
    beginnerScene.className = "lesson-beginner-scene";
    beginnerScene.textContent = beginner.scene;
    const beginnerSteps = document.createElement("div");
    beginnerSteps.className = "lesson-beginner-steps";
    beginner.steps.forEach((label, index) => {
      const step = document.createElement("span");
      step.innerHTML = `<b>${index + 1}</b>${label}`;
      beginnerSteps.appendChild(step);
    });
    const beginnerInvitation = document.createElement("p");
    beginnerInvitation.className = "lesson-beginner-invitation";
    beginnerInvitation.textContent = beginner.invitation;
    const beginnerBridge = document.createElement("p");
    beginnerBridge.className = "lesson-beginner-bridge";
    beginnerBridge.textContent = beginner.bridge;
    beginnerBox.append(beginnerKicker, beginnerTitle, beginnerScene, beginnerSteps, beginnerInvitation, beginnerBridge);
    host.appendChild(beginnerBox);

    const details = document.createElement("details");
    details.className = "lesson-visual";
    details.open = false;
    const summary = document.createElement("summary");
    summary.textContent = "Das Bild dazu Schritt für Schritt ansehen";
    details.appendChild(summary);
    const body = document.createElement("div");
    body.className = "lesson-visual-body";
    const topic = document.createElement("p");
    topic.className = "lesson-visual-topic";
    topic.textContent = "EINE EBENE GENAUER · " + lessonTitle;
    body.appendChild(topic);
    const intro = document.createElement("p");
    intro.className = "lesson-visual-intro";
    intro.textContent = data.intro;
    body.appendChild(intro);

    const canvas = document.createElement("div");
    canvas.className = "lesson-visual-canvas";
    const svg = svgEl("svg", { viewBox: "0 0 800 270", role: "img", "aria-label": `${data.name} zur Lektion ${lessonTitle}` });
    const defs = svgEl("defs");
    const marker = svgEl("marker", { id: "lv-arrow-" + Math.random().toString(36).slice(2), markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto" });
    marker.appendChild(svgEl("path", { d: "M0,0 L8,4 L0,8 z", class: "lv-arrow-head" }));
    defs.appendChild(marker); svg.appendChild(defs);
    const markerId = marker.getAttribute("id");
    const pos = positions(data.kind, data.nodes.length);

    if (data.kind === "graph") {
      svg.appendChild(svgEl("path", { d: "M40 225 H760 M80 245 V25", class: "lv-axis" }));
      svg.appendChild(svgEl("path", { d: "M85 210 C190 210 235 180 310 145 S475 82 715 45", class: "lv-curve" }));
    }

    data.edges.forEach((pair) => {
      const a = pos[pair[0]], b = pos[pair[1]];
      if (!a || !b) return;
      const line = svgEl("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "lv-edge", "marker-end": `url(#${markerId})` });
      svg.appendChild(line);
    });

    const groups = data.nodes.map((item, index) => {
      const p = pos[index];
      const group = svgEl("g", { class: "lv-node", "data-step": index, transform: `translate(${p.x},${p.y})` });
      const title = svgEl("title"); title.textContent = item.label + ": " + item.detail; group.appendChild(title);
      group.appendChild(svgEl("rect", { x: -78, y: -27, width: 156, height: 54, rx: 13 }));
      const number = svgEl("text", { x: -62, y: -5, class: "lv-number" }); number.textContent = String(index + 1).padStart(2, "0"); group.appendChild(number);
      const label = svgEl("text", { x: -36, y: 5, class: "lv-label" }); label.textContent = item.label.length > 19 ? item.label.slice(0, 18) + "…" : item.label; group.appendChild(label);
      svg.appendChild(group);
      return group;
    });
    canvas.appendChild(svg); body.appendChild(canvas);

    const controls = document.createElement("div"); controls.className = "lesson-visual-controls";
    const stepText = document.createElement("div"); stepText.className = "lesson-visual-step";
    const button = document.createElement("button"); button.type = "button"; button.className = "btn ghost lesson-visual-next";
    controls.append(stepText, button); body.appendChild(controls);
    const question = document.createElement("p"); question.className = "lesson-visual-question"; question.textContent = "Wenn du neugierig bist: " + data.question; body.appendChild(question);
    const note = document.createElement("p"); note.className = "lesson-visual-note"; note.textContent = "Dieses Bild macht den Anfang leichter. Die genaueren Wörter, Ausnahmen und Grenzen folgen in der Lektion."; body.appendChild(note);
    details.appendChild(body); host.appendChild(details);

    let active = 0;
    function show(index) {
      active = index;
      groups.forEach((group, i) => group.classList.toggle("active", i === active));
      stepText.textContent = `${data.nodes[active].label}: ${data.nodes[active].detail}`;
      button.textContent = active < data.nodes.length - 1 ? "Weiter im Bild →" : "Noch einmal von vorn ↺";
      button.setAttribute("aria-label", button.textContent);
    }
    button.addEventListener("click", () => show(active < data.nodes.length - 1 ? active + 1 : 0));
    show(0);
    return { element: details, model: data, show };
  }

  const api = { describeModel, describeBeginnerLayer, mount };
  root.LSLessonVisuals = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
