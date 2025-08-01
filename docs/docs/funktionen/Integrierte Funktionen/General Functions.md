---
sidebar_position: 6
---
# General Functions
### IfThenElse
```jsx title="Testet eine Bedingung und gibt einen von zwei Werten zurück:"
Syntax: IfThenElse(condition, trueValue, falseValue)

IfThenElse(5 > 3, "Yes", "No") → "Yes"
IfThenElse(Years() >= 10, 1, 0) → 1
IfThenElse([Temp] > 100, "Hot", "Cool")
```
### Pulse
```jsx title="Erzeugt einen Impuls zu einem festgelegten Zeitpunkt:"
Syntax: Pulse(time, height=1, width=0, repeat=-1)

Pulse({5 Years}, 10) → 10 at year 5
Pulse({2 Years}, 3, 1, {4 Years}) → Repeats every 4 years
Pulse({0}, 1, 1) → Starts immediately, lasts 1 year
```
### Step
```jsx title="Springt zu einem bestimmten Zeitpunkt auf einen neuen Wert:"
Syntax: Step(start, height=1)

Step({3 Years}, 50) → 50 after 3 years
Step({10 Years}) → Defaults to 1
Step({0}, 100) → Starts at time 0
```
### Ramp
```jsx title="Steigt linear von 0 auf eine bestimmte Höhe:"
Syntax: Ramp(start, finish, height=1)

Ramp({0}, {5}, 10) → From 0 to 10 over 5 years
Ramp({2}, {6}) → Gradually increases to 1
Ramp({4}, {8}, -2) → Decreases to -2
```
### Pause
```jsx title="Hält die Simulation vorübergehend an:"
Syntax: Pause()

IfThenElse(Years() = 10, Pause(), 0)
IfThenElse([Value] > 100, Pause(), 0)
```
### Stop
```jsx title="Beendet die Simulation sofort:"
Syntax: Stop()

IfThenElse([CO2] > 400, Stop(), 0)
IfThenElse(Rand() < 0.05, Stop(), 0)
```
