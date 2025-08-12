# Szenario-Einstellungen
Mit Szenarien lassen sich verschiedene "Was-wäre-wenn..."- Situationen in einem Modell durchspielen, ohne mehrere Modellkopien oder -versionen anlegen zu müssen. Somit kannst du ganz einfach alternative Zukunftsentwicklungen simulieren und vergleichen.

:::note Szenario

Ein Szenario ist eine definierte Variation bestimmter Modellannahmen und Eingabewerte. Du kannst damit beispielsweise analysieren: 
- wie empfindlich das Modell auf Änderungen reagiert
- Welche Entwicklungen unter verschiedenen Rahmenbedingungen möglich sind
- Welche Annahmen robust oder riskant sind
:::

Die Szenario-Einstellungen ermöglichen es dir auf unterschiedlichste Weise, bestimmte Parameter von Primitives flexibel zu verändern, um somit schnellstmöglich und unkompliziert eine große Bandbreite an Szenarien auszuprobieren.
Wenn du im Primitive- Einstellungsfenster im Reiter "Schnittstelle & Szenario" einen variablen Eingabeparameter auswählst, wird dieser in den Szenario-Einstellungen angezeigt. Hier kannst du dann die Eingabewerte für das Szenario festlegen. Folgende Eingabemöglichkeiten stehen dir zur Verfügung:


| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------------- | ----------------|-----------------|
| **Keine Parameter**  | -   |  |
| **Boolscher Wert** | On/off    |      |
| **Schieberegler** | Manueller Schieberegler   | Flexibel anpassbare Inputwerte |
| Min | Numerischer Wert | Startpunkt der Spanne
| Schritte | Numerischer Wert| Abstände der Werte zueinander|
| Max | Numerischer Wert | Endpunkt der Spanne|
| **Wertehilfe** | Auswahloption | Auswahl von Optionen festgelegter Werte|
| **Wert** | Numerischer Wert  | Input zur Berechnung |
| **Label** | Numerischer Wert, Text  | Beschreibung |


:::note Hinweis
Du kannst nur für die folgenden Primitives einen variablen Eingabeparameter definieren:
- **Variable**
- **State**
:::

:::tip
Wenn du für einen Stock- oder Flow-Primitive einen variablen Eingabeparameter definieren möchtest, erstelle zunächst ein **Variable**-Primitive, das du dann mit dem Stock- oder Flow-Primitive verbindest.
:::
