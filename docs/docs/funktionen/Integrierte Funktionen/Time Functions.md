---
sidebar_position: 1
---
# Time Functions
### Seconds
```jsx title="Berechnet die aktuelle Zeit in Sekunden:"
Syntax: Seconds()

Seconds()*1000 → Zeit in Millisekunden
Seconds()/60 → Rechnet Sekunden in Minuten um
IfThenElse(Seconds() > 3600, 'Hour passed', 'Still running')
```
### Minutes
```jsx title="Berechnet die aktuelle Zeit in Minuten:"
Syntax: Minutes()

Minutes()*60 → Rechnet Minuten in Sekunden um
IfThenElse(Minutes() > 30, 'More than 30 mins', 'Less than 30 mins')
```
### Hours
```jsx title="Berechnet die aktuelle Zeit in Stunden:"
Syntax: Minutes()

Hours()*60 → Rechnet Stunden in Minuten um
IfThenElse(Hours() >= 24, 'Day passed', 'Less than a day')
```
### Days
```jsx title="Berechnet die aktuelle Zeit in Tagen:"
Syntax: Days()

Days()*24 → Rechnet Tage in Stunden um
Days()/7 → Rechnet Tage in Wochen um
```
### Weeks
```jsx title="Berechnet die aktuelle Zeit in Wochen:"
Syntax: Weeks()

Weeks()*7 → Rechnet Wochen in Tage um
```
### Months
```jsx title="Berechnet die aktuelle Zeit in Monaten:"
Syntax: Months()

Months()/12 → Rechnet Monate in Jahre um
```
### Years
```jsx title="Berechnet die aktuelle Zeit in Jahre:"
Syntax: Years()

Years()*12 → Rechnet Jahre in Monate um
Years()*365 → Rechnet Jahre in Tage um
```
### Time
```jsx title="Berechnet die exakte aktuelle Zeit (inkl. Einheiten):"
Syntax: Time()

Time() - TimeStart() → Berechnet die verstrichene Zeit seit dem Start der Simulation
TimeEnd() - Time() → Berechnet die übrige Zeit bis zum Ende der Simulation 
```
### TimeStart
```jsx title="Berechnet die exakte aktuelle Zeit:"
Syntax: TimeStart()

Time() - TimeStart() → Berechnet die verstrichene Zeit seit dem Start der Simulation
TimeEnd() - Time() → Berechnet die übrige Zeit bis zum Ende der Simulation 
```
### TimeStep
```jsx title="Definiert ein Zeitabschnitt-Intervall für zeitbasierte Funktionen:"
Syntax: TimeStep()

TimeLength() / TimeStep() → Anzahl der Zeitschritte 
```
### TimeLength
```jsx title="Berechnet die Dauer einer Zeitspanne:"
Syntax: TimeLength()

(Time() - TimeStart()) / TimeLength() → Berechnet prozentual die verstrichene Zeit der Simulation
```
### TimeEnd
```jsx title="Definiert einen Endzeitpunkt einer Zeitspanne:"
Syntax: TimeEnd()

TimeStart() + TimeLength() = TimeEnd()
```
### Seasonal
```jsx title="Modelliert Saisonalität mithilfe einer Sinuswelle:"
Syntax: Seasonal(Peak=0)

Seasonal({9 Months}) * 0.5 + 1 → Hochpunkt im September
Seasonal({3 Months}) + Seasonal({9 Months}) → Zwei saisonale Hochpunkte
```