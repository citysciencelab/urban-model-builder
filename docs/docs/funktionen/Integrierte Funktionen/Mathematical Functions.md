---
sidebar_position: 1
---
# Mathematical Functions
### Round
```jsx title="Rundet zum nächsten Integer:"
Syntax: Round(value)

Round(3.5) → 4
Round(-1.4) → -1
```
### Ceiling
```jsx title="Rundet auf zum nächsten Integer:"
Syntax: Ceiling(value)

Ceiling(3.01) → 4
Ceiling(-1.99) → -1
```
### Floor
```jsx title="Rundet ab zum nächsten Integer:"
Syntax: Floor(value)

Floor(3.99) → 3
Floor(-1.01) → -2
```
### Cos/ArcCos 
```jsx title="Cosinus- und inverse Cosinusfunktion (im Bogenmaß) :"
Syntax: Cos(angle), ArcCos(value)

Cos(Pi) → -1 
Cos(0) → 1 
ArcCos(1) → 0
ArcCos(0.5) → Pi/3
```
### Sin/ArcSin
```jsx title="Sinus- und inverse Sinusfunktion (im Bogenmaß):"
Syntax: Sin(angle), ArcSin(value)

Sin(Pi/2) → 1 
Sin(0) → 0 
ArcSin(1) → Pi/2
ArcSin(0.5) → Pi/6
```
### Tan/ArcTan
```jsx title="Tangens- und inverse Tangensfunktion (im Bogenmaß):"
Syntax: Tan(angle), ArcTan(value)

Tan(Pi/4) → 1 
Tan(0) → 0 
ArcTan(1) → Pi/4
ArcTan(-1) → -Pi/4
```
### Log / Ln / Exp
```jsx title="Logarithmus mit Basis 10 , natürlicher Logarithmus, and e^x:"
Syntax: Log(x), Ln(x), Exp(x)

Log(1000) → 3
Ln(e) → 1
Exp(1) → e
Ln(e^3) → 3
Exp(0) → 1
```
### Sum/Product
```jsx title="Addiere oder multipliziere Zahlen oder Vektoren:"
Syntax: Sum(...), Product(...)

Sum(1, 2, 3) → 6 
Sum({1, 2, 3}) → 6
Product(2, 2, 2) → 8
Product({2, 3, 4}) → 24
```
### Max / Min
```jsx title="Berechnet die größte oder niedirgste Zahl:"
Syntax: Max(...), Min(...)

Max(4, 2, 9) → 9
Max({7, 3, 8}) → 8
Min(3, -1, 5) → -1
Min({10, 2, 5}) → 2
```
### Mean / Median
```jsx title="Berechnet den Durchschnitts- oder Mittelwert:"
Syntax: Mean(...), Median(...)

Mean(2, 4, 6) → 4
Mean({10, 20, 30}) → 20
Median(1, 3, 5) → 3
Median({2, 4, 6, 8}) → 5
```
### StdDev
```jsx title="Bemisst die Datenstreuung:"
Syntax: StdDev(...)

StdDev(1, 2, 3) → 1
StdDev({10, 10, 10}) → 0
```
### Abs
```jsx title="Berechnet absolute (nicht-negative) Werte:"
Syntax: Abs(x)

Abs(-5) → 5
Abs(0.5) → 0.5
```
### Mod
```jsx title="Berechnet den Rest nach einer Division:"
Syntax: a mod b or a % b

10 mod 3 → 1
13 % 5 → 3
6 mod 2 → 0
```
### Square Root
```jsx title="Berechnet die Quadratwurzel einer Zahl:"
Syntax: Sqrt(x)

Sqrt(9) → 3
Sqrt(2) → 1.414
Sqrt(0) → 0
```
### Pi
```jsx title="Die Konstante π ≈ 3.14159:"
Syntax: pi

pi → 3.14159
2 * pi → 6.28318
Sin(pi) → 0
```
### e
```jsx title="Die Konstante e ≈ 2.71828:"
Syntax: e

e → 2.71828
Ln(e) → 1
```
### Logit
```jsx title="Rechnet Wahrscheinlichkeiten (0–1) zu Log-odds um:"
Syntax: Logit(p)

Logit(0.5) → 0
Logit(0.9) → 2.197
Logit(0.1) → -2.197
```
### Expit
```jsx title="Rechnet Log-odds zu Wahrscheinlichkeiten (0–1) um:"
Syntax: Expit(x)

Expit(0) → 0.5
Expit(2) → 0.881
Expit(-2) → 0.119
```