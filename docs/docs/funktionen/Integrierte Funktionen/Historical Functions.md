---
sidebar_position: 3
---
# Historical Functions
### Delay
```jsx title=":"
Syntax: Delay(Primitive, Delay, Default)

Delay([Population], {10 Years}, 100000)
Delay([Revenue], {7 Months}, 50000)
```
### Delay1
```jsx title="Wendet eine exponentielle Verzögerung 1. Ordnung an:"
Syntax: Delay1(Value, Delay, Initial)

Delay1([Sales], {4 Year}, 200)
Delay1([Pollution], {6 Months})
```
### Delay3
```jsx title="Wendet eine exponentielle Verzögerung 3. Ordnung an:"
Syntax: Delay3(Value, Delay, Initial)

Delay3([Investment], {5 Years}, 100000)
Delay3([Tech], 24) → 2 years
```
### DelayN
```jsx title="Wendet eine exponentielle Verzögerung N-ter Ordnung an:"
Syntax: DelayN(Value, Delay, Order, Initial)

DelayN([Sales], {6 Months}, 4, 200)
DelayN([CO2], {10 Years}, 1)
```
### Smooth
```jsx title="Wendet eine exponentielle Glättung auf einen Wert an, um kurzfristige Schwankungen zu reduzieren und Trends hervorzuheben:"
Syntax: Smooth([Value], Length, Initial Value)

Smooth([Sales], {6 Months}, 1000)
Smooth([Visitors], {14 Days})
Smooth([Power Usage], {1 Year})
```
### SmoothN
```jsx title="Führt eine exponentielle Glättung n-ter Ordnung durch, um flüchtige Daten besser verarbeiten zu können:"
Syntax: SmoothN([Value], Length, Order, Initial Value)

SmoothN([Revenue], {1 Year}, 3, 100000)
SmoothN([Noise Level], {30 Days}, 2)
SmoothN([Air Quality Index], {12 Months}, 4)
```
### PastValues
```jsx title="Gibt eine Liste aller vorherigen Werte eines Primitivs zurück, optional innerhalb eines Zeitfensters:"
Syntax: PastValues([Primitive], Period)

Sum(PastValues([Profit]))
Mean(PastValues([Visitors], {1 Month}))
Min(PastValues([Humidity], {3 Days}))
```
### PastMax
```jsx title="Gibt den höchsten Wert zurück, den ein Primitiv während der Simulation oder eines bestimmten Zeitraums hatte:"
Syntax: PastMax([Primitive], Period)

PastMax([Sales], {1 Year})
PastMax([Rainfall], {6 Months})
```
### PastMin
```jsx title="Gibt den niedrigsten Wert zurück, den ein Primitiv im Laufe der Zeit oder innerhalb eines bestimmten Fensters hatte:"
Syntax: PastMin([Primitive], Period)

PastMin([Energy Usage], {12 Months})
PastMin([Budget], 10)
```
### PastMedian
```jsx title="Gibt den Median der Werte eines Primitives während der Simulation oder über einen definierten Zeitraum zurück:"
Syntax: PastMedian([Primitive], Period)

PastMedian([Temperature], {3 Months})
PastMedian([Response Time], {1 Week})
```
### PastMean
```jsx title="Berechnet den Durchschnittswert eines Primitives über die Zeit oder innerhalb eines Zeitraums:"
Syntax: PastMean([Primitive], Period)

PastMean([Page Views], {7 Days})
PastMean([Fuel Cost], {1 Year})
```
### PastStdDev
```jsx title="Gibt die Standardabweichung der Werte eines Primitivs zurück und zeigt die Variabilität an:"
Syntax: PastStdDev([Primitive], Period)

PastStdDev([Delivery Time], {6 Months})
PastStdDev([Inventory], {1 Quarter})
```
### PastCorrelation
```jsx title="Berechnet die Korrelation zwischen zwei Primitives über die gesamte Simulation oder ein bestimmtes Zeitfenster:"
Syntax: PastCorrelation([Primitive1], [Primitive2], Period)

PastCorrelation([Advertising], [Sales], {6 Months})
PastCorrelation([Temperature], [AC Usage], {1 Year})
```
### Fix
```jsx title="Sperrt einen Wert für einen bestimmten Zeitraum oder für die gesamte Simulation:"
Syntax: Fix(Value, Period)

Fix([CO2 Output], {1 Year})
Fix([Interest Rate])
```
