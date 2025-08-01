---
sidebar_position: 4
---
Wie viele Bausteine sind notwendig um Systeme in ihrer Komplexität modellieren zu können? - Keine einfache Frage! 

Wir geben dir aber insgesamt **11 Funktionsbausteine** an die Hand, damit du dein individuelles System Dynamics bzw. agentenbasiertes Modell aufbauen kannst.
Folgende Tabellen helfen dir die jeweiligen Primitives in ihren spezifischen Funktionsweisen zu verstehen und anwenden zu können.

## Stock
Stock (dt. Bestände) bilden akkumulierte Größen bzw. Werte, die sich im Laufe der Zeit ansammeln oder abbauen- ähnlich wie Wasser in einem Tank. Ein Stock ist eine zustandsbestimmende Variable in einem dynamischen System. Es speichert den aktuellen Wert eines bestimmten Aspekts des Systems und ändert sich durch Zuflüsse (Inflows) oder Abflüsse (Outflows), die mit ihm verbunden sind.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Wert*| Numerischer Wert, [Wert eines Primitives], Funktionen | Der Startwert beschreibt den Anfangszustand des Systems, worauf alle weiteren Veränderungen durch z.B. Flows aufbauen. Der Wert kann konstant sein oder dynamisch durch eine Funktion oder andere Variablen beschrieben sein. Es gibt bereits vorgefertigte Funktionsbeschreibungen zum Auswählen. Der Wert wird oft an realen Daten aus der Vergangenheit ausgerichtet. Beispiele: 500, if time < 2020 then 0 else 1000; Stock = Fläche*Bevölkerungsdichte|
| **Schnittstelle & Szenario** |
|Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|
| **Validierung** |
| Einheit | Text (Suchfunktion), Auswahloption | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Zahl | z.B. 0 : verhindert, dass ein Stock negative Werte annimmt, wenn das im realen System keinen Sinn ergibt (negative Bevölkerungszahl) 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Numerischer Wert | Begrenzt nach oben (z.B. maximale Bevölkerungszahl einer Region) |

*Pflichtfelder für Berechnung

## Flow
Flows (dt. Flüsse/Ströme) beschreiben die Geschwindigkeit, mit der sich ein Bestand aufbaut oder abbaut, und wirken damit direkt auf die Änderungsrate eines Stocks. Ein Flow ist eine zeitabhängige Rate, die angibt, wie schnell etwas in einen Stock hinein- oder aus ihm hinausfließt. Sie sind temporär aktiv, indem sie den Bestand verändern, aber selbst keine Werte speichern. Zudem können sie von anderen Variablen abhängen. Es gibt verschiedene Typen von Flows - zum einen statische/absolute und variable/relative In- und Outflows. 

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Rate*| Numerischer Wert, [Wert eines Primitives], Funktionen | Die Rate bestimmt die Geschwindigkeit, mit der sich der zugehörige Stock erhöht oder verringert. Flows können einen konstanten Wert (z.B. 1000 Liter) oder einen dynamischen Wert in Abhängigkeit von anderen Modellgrößen (z.B. Wasserzufluss= Regenmenge* Fläche* Versickerungsfaktor) haben.|
| **Schnittstelle & Szenario** |
|Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|
| **Validierung** |
| Einheit | Text (Suchfunktion), Auswahloption | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Numerischer Wert | Option eine untere Grenze einzustellen 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Numerischer Wert | Option eine obere Grenze einzustellen |

*Pflichtfelder für Berechnung

## OGC API Features
Die OGC API Features ist ein moderner Standard des Open Geospatial Consortium (OGC) zur Bereitstellung und Abfrage von Geodaten über Webschnittstellen. Dies ermöglicht eine einfache Integration in Webanwendungen und fördert die Interoperabilität zwischen verschiedenen Systemen. Das Masterportal Hamburg stellt über die OGC API- Features eine Vielzahl von Datensätzen aus dem Geoportal zur Verfügung.  

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell    |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| APIs*| Text (Suchfunktion); Auswahloption| APIs (Application Programming Interface) sind Schnittstellen zu Datenbanken. Hier suchst du das für dein Modell passenden Datensatz aus.|
| Sammlung* | Text (Suchfunktion); Auswahloption | Durch die Auswahl der Sammlungen werden die vorhandenen Datensätze reduziert. |
| Limits* | Numerischer Wert | Steuert wie viele Einträge pro Anfrage zurückgegeben werden. =100 -> max. 100 Einträge zurück |
| Offset | Numerischer Wert | Gibt an, ab welchem Eintrag die API die Daten liefern soll. = 200 -> API überspringt die ersten 200 Einträge und dann liefert weiter je nach Limit |
| Ausgewählte Eigenschaften | Text (Suchfunktion); Auswahloption | Sogenannte Properties werden hier modellspezifisch ausgewählt. Sie dienen der gezielten Datenabfrage. |
| **Feldabfrage** |
|Abfragefeld | Text (Suchfunktion); Auswahloption | Das Datenfeld („Key“), auf das die Bedingung angewendet wird.|
| Operator | Auswahloption | Logischer Vergleichsoperator, der prüft, ob das Datenfeld einen bestimmten Zustand erfüllt.
| Abfragewert | Text; (nummerischer) Wert | Der Wert, mit dem verglichen wird. |
| Beispiel API mit Aufbau:<br/>```[```<br/>``` {"Region": "Nord",```<br/>``` "Temperatur":21.5},``` <br/>``` {"Region": "Süd", ```<br/>```"Temperatur":25.0}, ```<br/>``` {"Region": "Nord",```<br/>``` "Temperatur":19.5}```<br/>```]```| Du willst nur Daten aus der Region „Nord“ importieren.<br/>```Abfragefeld: Region``` <br/> ```Operator: = ``` <br/> ``` Abfragewert: Nord ```| Die Abfrage filtert alle Einträge, bei denen Region == Nord gilt. 
| **Erweiterte Filterabfrage** | 
| Filter (CQL2) | Aufbau: <br/>1. Attribut(z.B "Temperatur") <br/> 2. Operator (z.B ">") <br/> 3. Wert (z.B 20) <br/>Temperatur größer als 20°C:<br/>```{ ```<br/>```"op": ">",```<br/>```"args": [ ```<br/>```{ "property": "Temperatur"}, 20```<br/>```]```<br/>```}```| CQL2 ist eine strukturierte Filtersprache, mit den Daten anhand ihrer Eigenschaften präzise serverseitig abgefragt werden. Wurde vom Open Geospatial Consortium (OGC) entwickelt.  |
| **Datentransformation** | | Nur ausgewählte Eigenschaften werden hier angezeigt |
| Schlüsselwert | Text (Suchfunktion); Auswahloption | Key-Value-Strukturen, typisch in  JSON-Daten, die von APIs geliefert werden. Der Schlüssel (Key) ist der Name eines Datenfeldes. Z.B "Bezirk"
| Wertfeld | Text (Suchfunktion); Auswahloption | Das Wertfeld ist der Inhalt, der zu dem Schlüssel gehört. Z.B "Bezirk": "Altersgruppe 0-18" |
| Vorschau | Anzeige | Zeigt den strukturellen Aufbau der abzufragenden Daten an. |

*Pflichtfelder für Berechnung

## Variablen
In der Systemdynamik beschreiben Variablen größenveränderliche Einflussfaktoren, die nicht direkt Bestände (Stocks) sind und im Gegensatz zu diesen keine Speicherfunktion der Werte aufweisen. Sie sind Berechnungsgrößen, die Flüsse oder andere Variablen beeinflussen. Sie fungieren als Rechenhilfen, indem sie die Struktur vereinfachen und 
ermöglichen Modulare Modellierung.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell    |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Wert*| Numerischer Wert, [Wert eines Primitives], Funktionen | Diese können sowohl konstant als auch dynamisch anhand von anderen Variablen oder vorgefertigten Funktionsbeschreibungen beschrieben werden.|
| **Schnittstelle & Szenario** |
|Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|
| **Validierung** |
| Einheit | Text (Suchfunktion), Auswahloption | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Numerischer Wert | Option eine untere Grenze einzustellen 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Numerischer Wert | Option eine obere Grenze einzustellen |

*Pflichtfelder für Berechnung

## Converter
Ein Converter ist ein Modellierungselement, das eine Berechnung, Transformation oder Ableitung aus anderen Variablen oder Konstanten durchführt. Er ist funktional gleichzusetzen mit einer Hilfsvariablen und speichert keine Werte, sondern wird bei jeder Simulationszeit neu berechnet.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Eingabe | In Abhängigkeit der verbundenen Primitves | Übernimmt den Eingangswert eines anderen Primitves; by Default ist die zeitliche Dimension festgelegt |
| **Mapping** | | Stellt grafisch die Input-Output-Beziehung dar
| Eingabe | x-Wert  | Wenn ein bestimmter Eingangswert angenommen wird, berechnet der Converter einen entsprechenden Ausgangswert |
| Ausgabe | y-Wert | Der Ausgangswert kann von anderen Primitves, die auf den Converter verweisen, übernommen werden.
| Interpolation | Auswahloption (Linear und Discrete) | Um Werte zwischen den definierten Punkten zu berechnen, können zwei Interpolationsmethoden angewendet werden. Linear: glatter, geradliniger Verlauf (geeignet für kontinuierliche Prozesse) Diskret: stufenweiser, sprunghafter Verlauf (geeignet für Schwellenwerte oder Kategorisierungen)
| **Validierung** |
| Einheit | Text (Suchfunktion), Auswahloption | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Numerischer Wert | Option eine untere Grenze einzustellen 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Numerischer Wert | Option eine obere Grenze einzustellen |

## States
Ein State in der agentenbasierten Modellierung bezeichnet einen Zustand (oder verschiedene Modi), der die aktuelle Situation oder Konfiguration eines Agenten, die sein Verhalten und seine Reaktion im Modell beeinflusst. Die Agenten wechseln von einem State in einen anderen, ausgelöst durch Regeln, Wahrscheinlichkeiten oder Umwelteinflüsse.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Aktiv zum Start | Numerischer Wert, [Wert eines Primitives], Funktionen | Definition der Anfangsbedingung |
| Vorhaltezeit | Numerischer Wert, [Wert eines Primitives], Funktionen | Gibt an, wie lange ein Zustand aktiv bleibt, bevor automatisch in den nächsten Zustand gewechselt wird (falls definiert) |
| **Schnittstelle & Szenario** |
| Eingabe | Auswahl (keine Parameter, Boolscher Wert) | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|
| Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|


## Transitions
Transitions bezeichnen die Übergänge zwischen den Zuständen (States) eines Agenten. Sie beschreiben wann und unter welchen Bedingungen ein Agent von einem Zustand in einen anderen wechselt.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell    |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Trigger | Auswahloption (Condition, Probability, Timeout) | Legt fest unter welcher Bedingung/Wahrscheinlichkeit/Zeitüberschreitung der Übergang von einem Zustand zum nächsten erfolgt |
| Wert | Numerischer Wert, [Wert eines Primitives], Funktionen | Input zur Berechnung|
| Neuberechnen | Boolean | Legt fest, ob die Bedingung während der Berechnung kontinuierlich geprüft und bei jeder Zustandsänderung neu berechnet wird. Ohne Neuberechnung: Triggerbedingung wird nur einmal geprüft; Mit Neuberechnung: Bedingung wird laufend geprüft (in jedem Zeitschritt). |
| Wiederholen | Boolean | Legt fest, ob derselbe Übergang mehrfach ausgelöst werden darf, auch wenn er schon einmal durchlaufen wurde. Ohne Wiederholung: Übergang findet nur einmal statt; Mit Wiederholung: Übergang kann beliebig oft durchlaufen werden, solange der Trigger zutrifft.|
| **Validierung** |
| Einheit | Text (Suchfunktion), Auswahloption | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Numerischer Wert | Option eine untere Grenze einzustellen 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Numerischer Wert | Option eine obere Grenze einzustellen |

## Actions
Actions sind die konkreten Handlungen, die ein Agent während eines Zustandes oder bei einem Zustandswechsels (Transitions) ausführt. Sie bestimmen das sichtbare Verhalten eines Agenten innerhalb des Modells. Sie sind opelrationale Verhaltensregeln, wie beispielsweise sich bewegen, mit anderen Agenten interagieren, Ressourcen verbrauchen etc.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Aktion | Numerischer Wert, [Wert eines Primitives], Funktionen| Auszuführende Algorithmen |
| Trigger | Auswahloption (Condition, Probability, Timeout) | Auslöser für eine Zustandsänderung |
| Wert | Numerischer Wert, [Wert eines Primitives], Funktionen | Input zur Berechnung|
| Neuberechnen | Boolean | Legt fest, ob die Bedingung während der Berechnung kontinuierlich geprüft und bei jeder Zustandsänderung neu berechnet wird. Ohne Neuberechnung: Triggerbedingung wird nur einmal geprüft; Mit Neuberechnung: Bedingung wird laufend geprüft (in jedem Zeitschritt). |
| Wiederholen | Boolean | Legt fest, ob derselbe Übergang mehrfach ausgelöst werden darf, auch wenn er schon einmal durchlaufen wurde. Ohne Wiederholung: Übergang findet nur einmal statt; Mit Wiederholung: Übergang kann beliebig oft durchlaufen werden, solange der Trigger zutrifft.|

## Agent
Ein Agent ist eine autonome Entität, die eigene Zustände, Eigenschaften und Verhaltensregeln besitzt und mit ihrer Umwelt und anderen Agenten interagieren kann. Als individuelles Modellobjekte können Agenten eigenständige Entscheidungen treffen, zustandsabhängig handeln, sich verändern und lokal interagieren.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| **Schnittstelle & Szenario** | 
| Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar. |

## Population
Eine Population bezeichnet eine Gesamtheit alles Agenten eines bestimmten Typs innerhalb eines Modells. Diese kollektive Menge an Agenten haben gemeinsame Eigenschaften oder Verhaltenstype, agieren sowohl in einer gemeinsamen Umwelt als auch untereinander.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Größe der Bevölkerung | Numerischer Wert | Beschreibt die Anzahl der Entitäten in einer Population |
| Einheit | Text (Suchfunktion), Auswahloption |
| Geo Breite | Numerischer Wert | Definiert die geografische Breite auf einer simulierten Karte |
| Geo Höhe | Numerischer Wert | Definiert die geografische Länge auf einer simulierten Karte |
| Geo Wrap Around | Boolean | Bestimmt, ob Agenten, die eine Kartenkante überschreiten, auf der „anderen Seite wieder erscheinen“ |
| Geo Platzierungstyp | Auswahloption (Benutzerdefinierte Funktion, Ellipse, Grid, Network, Random) | Legt fest, wie Agenten initial auf der Karte verteilt werden |
| Geo Platzierungsfunktion | Funktion | Bestimmt die Regel oder Formel, nach der die Verteilung erfolgt |
| Netzwerktyp | Auswahloption (Benutzerdefinierte Funktion, Keine) | Legt fest, ob und wie die Agenten untereinander Netzwerke aufbauen |
| Netzwerkfunktion | Funktion | Legt fest, ob und wie die Agenten untereinander Netzwerke aufbauen | 
| **Schnittstelle & Szenario** | 
| Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar. |

## Folder
Ein Folder ist ein strukturgebendes Element, welches die Organisation eines Modells vereinfacht. In einem Ordner können manuell ausgewählte Modellteile gesammelt, gruppiert und bewegt werden.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung des Primitives im Modell     |
| Beschreibung | Text        |    Zur Erläuterung von getroffenen Annahmen und wichtigen Infos |

