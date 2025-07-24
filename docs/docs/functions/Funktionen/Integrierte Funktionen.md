### Mathematical Functions

#### Round
```jsx title="Rundet zum nächsten Integer:"
Syntax: Round(value)

Round(3.5) → 4
Round(-1.4) → -1
```
#### Ceiling
```jsx title="Rundet auf zum nächsten Integer:"
Syntax: Ceiling(value)

Ceiling(3.01) → 4
Ceiling(-1.99) → -1
```
#### Floor
```jsx title="Rundet ab zum nächsten Integer:"
Syntax: Floor(value)

Floor(3.99) → 3
Floor(-1.01) → -2
```
#### Cos/ArcCos 
```jsx title="Cosinus- und inverse Cosinusfunktion (im Bogenmaß) :"
Syntax: Cos(angle), ArcCos(value)

Cos(Pi) → -1 
Cos(0) → 1 
ArcCos(1) → 0
ArcCos(0.5) → Pi/3
```
#### Sin/ArcSin
```jsx title="Sinus- und inverse Sinusfunktion (im Bogenmaß):"
Syntax: Sin(angle), ArcSin(value)

Sin(Pi/2) → 1 
Sin(0) → 0 
ArcSin(1) → Pi/2
ArcSin(0.5) → Pi/6
```
#### Tan/ArcTan
```jsx title="Tangens- und inverse Tangensfunktion (im Bogenmaß):"
Syntax: Tan(angle), ArcTan(value)

Tan(Pi/4) → 1 
Tan(0) → 0 
ArcTan(1) → Pi/4
ArcTan(-1) → -Pi/4
```
#### Log / Ln / Exp
```jsx title="Logarithmus mit Basis 10 , natürlicher Logarithmus, and e^x:"
Syntax: Log(x), Ln(x), Exp(x)

Log(1000) → 3
Ln(e) → 1
Exp(1) → e
Ln(e^3) → 3
Exp(0) → 1
```
#### Sum/Product
```jsx title="Addiere oder multipliziere Zahlen oder Vektoren:"
Syntax: Sum(...), Product(...)

Sum(1, 2, 3) → 6 
Sum({1, 2, 3}) → 6
Product(2, 2, 2) → 8
Product({2, 3, 4}) → 24
```
#### Max / Min
```jsx title="Berechnet die größte oder niedirgste Zahl:"
Syntax: Max(...), Min(...)

Max(4, 2, 9) → 9
Max({7, 3, 8}) → 8
Min(3, -1, 5) → -1
Min({10, 2, 5}) → 2
```
#### Mean / Median
```jsx title="Berechnet den Durchschnitts- oder Mittelwert:"
Syntax: Mean(...), Median(...)

Mean(2, 4, 6) → 4
Mean({10, 20, 30}) → 20
Median(1, 3, 5) → 3
Median({2, 4, 6, 8}) → 5
```
#### StdDev
```jsx title="Bemisst die Datenstreuung:"
Syntax: StdDev(...)

StdDev(1, 2, 3) → 1
StdDev({10, 10, 10}) → 0
```
#### Abs
```jsx title="Berechnet absolute (nicht-negative) Werte:"
Syntax: Abs(x)

Abs(-5) → 5
Abs(0.5) → 0.5
```
#### Mod
```jsx title="Berechnet den Rest nach einer Division:"
Syntax: a mod b or a % b

10 mod 3 → 1
13 % 5 → 3
6 mod 2 → 0
```
#### Square Root
```jsx title="Berechnet die Quadratwurzel einer Zahl:"
Syntax: Sqrt(x)

Sqrt(9) → 3
Sqrt(2) → 1.414
Sqrt(0) → 0
```
#### Pi
```jsx title="Die Konstante π ≈ 3.14159:"
Syntax: pi

pi → 3.14159
2 * pi → 6.28318
Sin(pi) → 0
```
#### e
```jsx title="Die Konstante e ≈ 2.71828:"
Syntax: e

e → 2.71828
Ln(e) → 1
```
#### Logit
```jsx title="Rechnet Wahrscheinlichkeiten (0–1) zu Log-odds um:"
Syntax: Logit(p)

Logit(0.5) → 0
Logit(0.9) → 2.197
Logit(0.1) → -2.197
```
#### Expit
```jsx title="Rechnet Log-odds zu Wahrscheinlichkeiten (0–1) um:"
Syntax: Expit(x)

Expit(0) → 0.5
Expit(2) → 0.881
Expit(-2) → 0.119
```
### Time Functions

#### Seconds
```jsx title="Berechnet die aktuelle Zeit in Sekunden:"
Syntax: Seconds()

Seconds()*1000 → Zeit in Millisekunden
Seconds()/60 → Rechnet Sekunden in Minuten um
IfThenElse(Seconds() > 3600, 'Hour passed', 'Still running')
```
#### Minutes
```jsx title="Berechnet die aktuelle Zeit in Minuten:"
Syntax: Minutes()

Minutes()*60 → Rechnet Minuten in Sekunden um
IfThenElse(Minutes() > 30, 'More than 30 mins', 'Less than 30 mins')
```
#### Hours
```jsx title="Berechnet die aktuelle Zeit in Stunden:"
Syntax: Minutes()

Hours()*60 → Rechnet Stunden in Minuten um
IfThenElse(Hours() >= 24, 'Day passed', 'Less than a day')
```
#### Days
```jsx title="Berechnet die aktuelle Zeit in Tagen:"
Syntax: Days()

Days()*24 → Rechnet Tage in Stunden um
Days()/7 → Rechnet Tage in Wochen um
```
#### Weeks
```jsx title="Berechnet die aktuelle Zeit in Wochen:"
Syntax: Weeks()

Weeks()*7 → Rechnet Wochen in Tage um
```
#### Months
```jsx title="Berechnet die aktuelle Zeit in Monaten:"
Syntax: Months()

Months()/12 → Rechnet Monate in Jahre um
```
#### Years
```jsx title="Berechnet die aktuelle Zeit in Jahre:"
Syntax: Years()

Years()*12 → Rechnet Jahre in Monate um
Years()*365 → Rechnet Jahre in Tage um
```
#### Time
```jsx title="Berechnet die exakte aktuelle Zeit (inkl. Einheiten):"
Syntax: Time()

Time() - TimeStart() → Berechnet die verstrichene Zeit seit dem Start der Simulation
TimeEnd() - Time() → Berechnet die übrige Zeit bis zum Ende der Simulation 
```
#### TimeStart
```jsx title="Berechnet die exakte aktuelle Zeit:"
Syntax: TimeStart()

Time() - TimeStart() → Berechnet die verstrichene Zeit seit dem Start der Simulation
TimeEnd() - Time() → Berechnet die übrige Zeit bis zum Ende der Simulation 
```
#### TimeStep
```jsx title="Definiert ein Zeitabschnitt-Intervall für zeitbasierte Funktionen:"
Syntax: TimeStep()

TimeLength() / TimeStep() → Anzahl der Zeitschritte 
```
#### TimeLength
```jsx title="Berechnet die Dauer einer Zeitspanne:"
Syntax: TimeLength()

(Time() - TimeStart()) / TimeLength() → Berechnet prozentual die verstrichene Zeit der Simulation
```
#### TimeEnd
```jsx title="Definiert einen Endzeitpunkt einer Zeitspanne:"
Syntax: TimeEnd()

TimeStart() + TimeLength() = TimeEnd()
```
#### Seasonal
```jsx title="Modelliert Saisonalität mithilfe einer Sinuswelle:"
Syntax: Seasonal(Peak=0)

Seasonal({9 Months}) * 0.5 + 1 → Hochpunkt im September
Seasonal({3 Months}) + Seasonal({9 Months}) → Zwei saisonale Hochpunkte
```

### Historical Functions

#### Delay
```jsx title=":"
Syntax: Delay(Primitive, Delay, Default)

Delay([Population], {10 Years}, 100000)
Delay([Revenue], {7 Months}, 50000)
```
#### Delay1
```jsx title=":"
Syntax: Delay1(Value, Delay, Initial)

Delay1([Sales], {4 Year}, 200)
Delay1([Pollution], {6 Months})
```
#### Delay3
```jsx title=":"
Syntax: Delay3(Value, Delay, Initial)

Delay3([Investment], {5 Years}, 100000)
Delay3([Tech], 24) → 2 years
```
#### DelayN
```jsx title=":"
Syntax: DelayN(Value, Delay, Order, Initial)

DelayN([Sales], {6 Months}, 4, 200)
DelayN([CO2], {10 Years}, 1)
```
#### Smooth
```jsx title=":"
Syntax: Smooth([Value], Length, Initial Value)

Smooth([Sales], {6 Months}, 1000)
Smooth([Visitors], {14 Days})
Smooth([Power Usage], {1 Year})
```
#### SmoothN
```jsx title=":"
Syntax: SmoothN([Value], Length, Order, Initial Value)

SmoothN([Revenue], {1 Year}, 3, 100000)
SmoothN([Noise Level], {30 Days}, 2)
SmoothN([Air Quality Index], {12 Months}, 4)
```
#### PastValues
```jsx title=":"
Syntax: PastValues([Primitive], Period)

Sum(PastValues([Profit]))
Mean(PastValues([Visitors], {1 Month}))
Min(PastValues([Humidity], {3 Days}))
```
### Random Number Functions
### Agent Functions
### Vector Functions
### General Functions
### String Functions
### Programming
### User Input Functions
### Statistical Distributions
