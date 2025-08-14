---
sidebar_position: 1
---
# System Dynamic Model

# Wasserstand mit Zufluss und Verdunstung
Stell dir vor, du möchtest wissen, wie sich die Wassermenge in einem See über einen bestimmten Zeitraum verhält. Durch Regen gelangt immer mal wieder Wasser hinzu, jedoch verdunstet auch eine gewisse Wassermenge bei ausreichender Sonneneinstrahlung. Konstante Zu- und Abflüsse gibt es natürlich auch durch kleine Wasser- und Bachläufe. Die folgende Schritt-für-Schritt- Anleitung zeigt dir, wie du in nur wenigen Schritten dein erstes System Dynamics Modell aufbaust!

---

# 1. Neues Modell
✔︎ Erstelle ein neues Modell und nenne es "Wasserstandsprognose"

![NeuesModell](./img/1_SD.png)

---
# 2. Stock "Wasserstand" erstellen
✔︎ Füge einen Stock hinzu, welchen du über das Plus-Icon in der Activebar findest

✔︎ Öffne die Parameter Einstellung des platzierten Stocks, indem du darauf klickst und nenne ihn "Wasserstand"

✔︎ Setze einen Startwert in das Wert-Eingabefeld von bspw. ```20000``` m<sup>3</sup>. Wenn du die Einheit hinzufügen möchtest, kannst du das unter dem Reiter "Validierung" im Primitive-Einstellungsfenster tun.

✔︎ Stelle den Stock als Output-Parameter ein

![StockErstellen](./img/2_SD.png)

---
# 3. Inflow "Zufluss" anlegen
✔︎ Füge einen Flow hinzu und nenne ihn "Zufluss"

✔︎ Setze einen konstanten Wert von ```500``` m<sup>3</sup> pro Tag, ausgelöst durch einen Wasserlauf. Wenn du die Einheit hinzufügen möchtest, kannst du das unter dem Reiter "Validierung" im Primitive-Einstellungsfenster tun.

✔︎ Verbinde nun den Ausgangs-Knotenpunkt des Flows "Zufluss" mit einem Knotenpunkt des Stocks "Wasserstand"

✔︎ Achte darauf, dass der Verbindungspfeil zum Stock zeigt 

![InflowAnlegen](./img/3_SD.png)

---
# 4. Variable "Niederschlag" erstellen
✔︎ Füge eine Variable mit dem Namen "Niederschlag" hinzu

✔︎ Setze zB einen konstanten Wert von ```10```<sup>3</sup> pro Tag. Wenn du die Einheit hinzufügen möchtest, kannst du das unter dem Reiter "Validierung" im Primitive-Einstellungsfenster tun.

✔︎ Verbinde die Variable "Niederschlag" mit dem oberen oder unteren Knotenpunkt des Flows "Zufluss"

![VariableErstellen](./img/4_SD.png)

---
# 5. Gleichung für Flow "Zufluss" setzen
✔︎ Öffne die Parameter Einstellung des Flows "Zufluss", indem du darauf klickst

✔︎ Addiere den Wert "Niederschlag" zu dem Wert des einströmenden Bachlaufs

![FlowSetzen](./img/7_SD.png)

---
# 6. Outflow "Verdunstung" anlegen
✔︎ Füge einen zweiten Flow hinzu und nenne ihn "Verdunstung"

✔︎ Setze einen konstanten Wert von ```400``` m<sup>3</sup> pro Tag

✔︎ Verbinde nun einen Knotenpunkt des Stocks "Wasserstand" mit dem Eingangs-Knotenpunkt des Flows "Verdunstung"

✔︎ Achte darauf, dass der Verbindungspfeil weg vom Stock zeigt

![OutflowAnlegen](./img/8_SD.png)

---
# 7. Variable "Verdunstungsrate" erstellen
✔︎ Füge eine Variable mit dem Namen "Verdunstungsrate" hinzu

✔︎ Setze sie abhängig vom Wasserstand zB ```Wasserstand * 0.002``` (-> 0,2% pro Tag)

✔︎ Verbinde die Variable "Verdunstungsrate" mit dem oberen oder unteren Knotenpunkt des Flows "Verdunstung"

![OutflowAnlegen](./img/9_SD.png)

---
# 8. Gleichung für Flow "Verdunstung" setzen
✔︎ Öffne die Parameter Einstellung des Flows "Verdunstung"

✔︎ Addiere den Wert "Verdunstungsrate" zu dem Wert des ausströmenden Bachlaufs
![FLowSetzen](./img/10_SD.png)

---
# 9. Simulationseinstellungen
✔︎ Öffne die Modell Einstellung in der Sidebar 

✔︎ Setze die Werte wie folgt:

Start: 0
Länge: 365 
Intervall: 1 
Einheit: Tage 
![Einstellungen](./img/11_SD.png)

---
# 10. Simulation starten 
✔︎ Starte die Berechnung der Simulation, indem du auf den "Simulieren"-Button in der Activebar klickst

![Simulation](./img/12_SD.png)


Fertig ist dein erstes System Dynamics Modell!