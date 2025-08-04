---
sidebar_position: 6
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
 <TabItem value="versionseinstellungen" label="Versionseinstellungen">
    
  </TabItem>
  <TabItem value="modelleinstellungen" label="Modell-Einstellungen">

# Modell-Einstellungen

| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
|Start    | Numerischer Wert (Integer)     |  Startzeitpunkt in der gewählten Zeiteinheit |
| Zeitspanne | Numerischer Wert (Integer)    |   Zeitraum, über die die Simulation laufen soll     |
| Intervall | Numerischer Wert   | Zeitschritte des Simulationszeitraumes |
| Einheit | Numerischer Wert (Auswahloption)| 
| Algorithmus | Euler oder RK4 | Berechnungsverfahren, abhängig von der Komplexität des Modells|
| Globals & Makros | Funktionen | Funktionsbeschreibungen, die für das gesamte Modell gelten  |

# Berechnungsverfahren

Beim Urban Model Builder gibt es zwei grundlegende Berechnungsverfahren, die unter den globalen Modelleinstellungen ausgewählt werden können. Zum einen das Euler-Verfahren (Euler) und zum anderen das Runge-Kutta- Verfahren (RK4). Im Folgenden werden kurz diese beiden Methoden von Berechnungsalgorithmen erläutert.

#### Euler Verfahren

Ist eine einfache, numerische Methode zur Lösung von Differentialgleichungen. In System Dynamics Modellen wird es verwendet, um die Zeitentwicklung dynamischer Systeme zu simulieren. Das einfache Euler- Verfahren berechnet den zukünftigen Wert einer Variablen x auf Basis ihres aktuellen Wertes und ihrer Änderungsrate: 

x(t+delta t)= x(t) + delta t* dx/dt (t)


Aktueller Wert der Zustandsgröße (Stock)

Zeitschritt 

Änderungsrate 

Beispiel: einfaches Bevölkerungswachstum (Stock: Bevölkerung P; Flow: Geburten B= r*P r=Geburtenrate) 

Differenzialgleichung: dP/dt= r*P

Mit Euler Verfahren: P(t+delta t) = P(t) + delta t* (r*P(t))

#### Runge-Kutta Verfahren

Ist ein präziseres numerisches Verfahren zur Lösung von Differentialgleichungen als das Euler-Verfahren. Das Euler-Verfahren nutzt den aktuellen Wert der Änderungsrate, um den nächsten Zustand zu erreichen. Das Runge-Kutta- Verfahren (hier 4. Ordnung) verwendet mehrere Schätzungen der Änderungsrate innerhalb des Zeitschritts und kombiniert diese, um eine genauere Prognose zu erstellen.
Besonders bei komplexen Modellen oder längeren Zeithorizonten ist dieses Berechnungsverfahren zu empfehlen.


  </TabItem>
  <TabItem value="szenarioeinstellungen" label="Szenario-Einstellungen">

# Szenario-Einstellungen
| Eingabefelder     | Art der Eingabe |    Zweck        |
| ----------- | ----------- |----------- |
|Start    | Numerischer Wert (Integer)     |  Startzeitpunkt in der gewählten Zeiteinheit |
| Zeitspanne | Numerischer Wert (Integer)    |   Zeitraum, über die die Simulation laufen soll     |
| Intervall | Numerischer Wert   | Zeitschritte des Simulationszeitraumes |
| Einheit | Numerischer Wert (Auswahloption)| 
| Algorithmus | Euler oder RK4 | Berechnungsverfahren, abhängig von der Komplexität des Modells|
| Globals & Makros | Funktionen | Funktionsbeschreibungen, die für das gesamte Modell gelten  |
  </TabItem>
  
 </Tabs>