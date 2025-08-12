---
sidebar_position: 7
---
Simulationen bilden ein zentrales Werkzeug, um komplexe Systeme besser zu verstehen, Entscheidungen zu unterstützen und alternative Entwicklungen zu erkunden. Durch das schrittweise Durchlaufen von modellierten Prozessen lassen sich Ursache-Wirkungs-Zusammenhänge, Zeitverläufe und kritische Parameter sichtbar machen. Das Durchführen von Simulationen ermöglicht es, verschiedene Szenarien durchzurechnen, Unsicherheiten zu analysieren und Hypothesen zu überprüfen. 

## Simulationsergebnisse 
Im Simulationsfenster werden dir all jene Primitives angezeigt, die du zuvor als Outputparameter definiert hast. 

Es gibt zwei Arten, wie die Ergebnisse geplottet werden: 

### Time-Series 
- Verlaufsdiagramm zeigt die Entwicklung von Daten über die Zeit 
- Mouseover: spezifische Ergebnisanzeige 
- Filterung der Ergebnisse durch Ein-bzw. Ausschalten der Darstellung durch Klick auf die Legende

### Scatter-Plot
- Verhalten und Zustandsänderungen von Agenten werden auf einem Grid angezeigt
- Mouseover: Ergebnisanzeige 
- Filterung der Ergebnisse durch Ein-bzw. Ausschalten der Darstellung durch Klick auf die Legende

:::warning

Die Simulation kann nur durchgeführt werden, wenn ein Outputparameter festgelegt wurde und es keine Logik- bzw. Syntaxfehler in der Modellstruktur gibt. 

:::

## Validierung 
Wenn das Modell simuliert und berechnet werden kann, solltest du dennoch immer selbst hinterfragen, ob das modellierte Systemverhalten inhaltlich valide ist und die Realität auf geeignete Weise abbildet.

:::tip Prüfen

Standardmäßig können bspw. die Werte von Stocks mathemathisch in den negativen Zahlenbereich gehen. Jedoch ergibt das bspw. bei einem Bevölkerungsbestand wenig Sinn.  

::: 

- Du kannst die Ergebnisse mit realen Mess- oder Statistikdaten abgleichen und somit einschätzen, ob die Verhältnissmäßigkeiten oder Größenordnungen stimmen könnten
- Fachleute können beurteilen, ob das Modell und seine Ergebnisse plausibel und fachlich korrekt sind
- Du kannst auch historische Daten zur Validierung deines Modells heranziehen, um zu prüfen, ob die bekannte Entwicklung korrekt reproduzierbar ist
- Du kannst die Sensitivität deines Modells überprüfen, indem du testet, wie stark kleine Änderungen von Parametern das Modellverhalten beeinflussen

:::note Herausforderungen 

Es ist gar nicht so leicht, das eigene Modell zu validieren. Entweder es gibt keine nutzbaren Realweltdaten, das Modell abstrahiert bewusst und lässt sich nur schwer vergleichen oder modelliertes soziales Verhalten ist besonders schwierig zu definieren.
 
:::
