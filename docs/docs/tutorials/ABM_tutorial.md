---
sidebar_position: 2
---
# Agent-Based Model

# Fußgänger:innen in einem Park
Stell dir vor, du möchtest simulieren, wie sich Menschen durch einen öffentlichen Park bewegen. Manche bleiben länger an bestimmten Orten (zB Spielplatz, Café), andere durchqueren den Park einfach nur. Manche beeinflussen sich sogar gegenseitig, z. B. durch Gruppendynamik oder Sichtbarkeit. Die folgende Schritt-für-Schritt-Anleitung zeigt dir, wie du dein erstes Agent-Based Model aufbauen kannst!

---
# 1. Neues Modell
✔︎ Erstelle ein neues Modell und nenne es "Parkbewegung ABM"

![ModellErstellen](./img/1_ABM.png)

---
# 2. Agent-Typ "Person" erstellen
✔︎ Erstelle einen neuen Agententyp (über das + oder Rechtsklick im Modellbaum)

✔︎ Benenne ihn "Person"

✔︎ Füge Attribute hinzu, zB :  
standort: [x, y]  
ziel: "Café"  
energie: 100

![ModellErstellen](./img/1_ABM.png)

---
# 3. Aktion "Bewegen" erstellen
✔︎ Füge eine Aktion im Agenten "Person" hinzu, zB "Bewegen"

✔︎ Programmiere, dass sich der Agent *bei jedem Schritt* in Richtung seines Ziels bewegt  
(zB mit einer einfachen moveTo(ziel)-Funktion oder einem Abstandswert)

✔︎ Optional: Reduziere bei jedem Schritt den Energie-Wert (energie -= 1)

![ModellErstellen](./img/1_ABM.png)

---
# 4. Zustand (State) hinzufügen
✔︎ Erstelle zwei Zustände im Agenten:  
- "Unterwegs"  
- "Am Ziel"

✔︎ Setze den Startzustand auf "Unterwegs"

![ModellErstellen](./img/1_ABM.png)

---
# 5. Transition definieren
✔︎ Definiere eine Transition von "Unterwegs" → "Am Ziel"

✔︎ Bedingung: Wenn der Agent in Nähe seines Ziels ist (zB dist(standort, ziel) < 2)

✔︎ Füge eine Aktion hinzu: zB energie = energie + 20

![ModellErstellen](./img/1_ABM.png)

---
# 6. Population hinzufügen
✔︎ Füge eine Population von zB 100 Personen zum Modell hinzu

✔︎ Wähle als Agententyp "Person"

✔︎ Verteile sie zufällig im Park (z. B. zufällige Startposition)

![ModellErstellen](./img/1_ABM.png)

---
# 7. Variable "Tageszeit“ erstellen
✔︎ Füge im globalen Modell eine Variable "Tageszeit" hinzu

✔︎ Beginne mit zB 6 (für 6:00 Uhr)

✔︎ Erhöhe sie bei jedem Zeitschritt um 0.25 (für Viertelstunden)

![ModellErstellen](./img/1_ABM.png)

---
# 8. Agentenverhalten zeitabhängig machen
✔︎ Passe das Verhalten an die Tageszeit an, zB :

```js
if (Tageszeit > 12 && ziel == "Spielplatz") {
    ziel = "Café";
}
```
✔︎ So ändern Agenten dynamisch ihr Ziel je nach Uhrzeit

![ModellErstellen](./img/1_ABM.png)

---
# 9. Simulationseinstellungen

✔︎ Öffne die Modell-Einstellungen in der Sidebar

✔︎ Setze die Werte wie folgt:
Start: 0
Länge: 24
Intervall: 0.25
Einheit: Stunden

![ModellErstellen](./img/1_ABM.png)

---
# 10. Simulation starten
✔︎ Klicke auf „Simulieren“ in der Activebar

✔︎ Beobachte, wie sich die Agenten über den Park bewegen und Ziele wechseln

![ModellErstellen](./img/1_ABM.png)