---
sidebar_position: 1
---

# Model Land betreten
Um dein Modell aufbauen zu können, stehen dir insgesamt elf Funktionsbausteine, sogenannte Primitives zur Verfügung. 
Folgende Tabellen helfen dir die jeweiligen Primitives zu verstehen und anzuwenden.

## Stock
Stock (dt. Bestände) bilden akkumulierte Größen bzw. Werte, die sich im Laufe der Zeit ansammeln oder abbauen- ähnlich wie Wasser in einem Tank. Ein Stock ist eine zustandsbestimmende Variable in einem dynamischen System. Es speichert den aktuellen Wert eines bestimmten Aspekts des Systems und ändert sich durch Zuflüsse (Inflows) oder Abflüsse (Outflows), die mit ihm verbunden sind.

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
| Name     | Text     |      Für eine eindeutige Zuordnung und Differenzierung      |
| Beschreibung | Text        |     Zur Erläuterung von getroffenen Annahmen und wichtigen Infos       |
| Wert*| Zahl, [Wert eines Primitives], Funktionen | Der Startwert beschreibt den Anfangszustand des Systems, worauf alle weiteren Veränderungen durch z.B. Flows aufbauen. Der Wert kann konstant sein oder dynamisch durch eine Funktion oder andere Variablen beschrieben sein. Es gibt bereits vorgefertigte Funktionsbeschreibungen zum Auswählen. Der Wert wird oft an realen Daten aus der Vergangenheit ausgerichtet. Beispiele: 500, if time < 2020 then 0 else 1000; Stock = Fläche*Bevölkerungsdichte|
| Schnittstelle & Szenario
|Ausgabeparameter | Boolean | Wenn als Ausgabeparameter gewählt, gibt dies Aufschluss über den Zustand des Systems im Zeitverlauf. Es werden Wirkungen von Entscheidungen, Änderungen oder externen Faktoren sichtbar.|
| Validierung
| Einheit | Text (Suchfunktion), Auswahl | Konkretisiert das System und stellt sicher, dass die Werte mit Einheiten sinnvoll miteinander verrechnet werden.
| Minimale Einschränkung | Boolean | Setzung einer unteren Grenze |
| Minimaler Wert | Zahl | z.B. 0 : verhindert, dass ein Stock negative Werte annimmt, wenn das im realen System keinen Sinn ergibt (negative Bevölkerungszahl) 
| Maximale Einschränkung | Boolean | Setzung einer oberen Grenze |
| Maximaler Wert | Zahl | Begrenzt nach oben (z.B. maximale Bevölkerungszahl einer Region)

*Pflichtfelder für Berechnung