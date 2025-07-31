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
```jsx title="Wendet eine exponentielle Verzögerung 1. Ordnung an:"
Syntax: Delay1(Value, Delay, Initial)

Delay1([Sales], {4 Year}, 200)
Delay1([Pollution], {6 Months})
```
#### Delay3
```jsx title="Wendet eine exponentielle Verzögerung 3. Ordnung an:"
Syntax: Delay3(Value, Delay, Initial)

Delay3([Investment], {5 Years}, 100000)
Delay3([Tech], 24) → 2 years
```
#### DelayN
```jsx title="Wendet eine exponentielle Verzögerung N-ter Ordnung an:"
Syntax: DelayN(Value, Delay, Order, Initial)

DelayN([Sales], {6 Months}, 4, 200)
DelayN([CO2], {10 Years}, 1)
```
#### Smooth
```jsx title="Wendet eine exponentielle Glättung auf einen Wert an, um kurzfristige Schwankungen zu reduzieren und Trends hervorzuheben:"
Syntax: Smooth([Value], Length, Initial Value)

Smooth([Sales], {6 Months}, 1000)
Smooth([Visitors], {14 Days})
Smooth([Power Usage], {1 Year})
```
#### SmoothN
```jsx title="Führt eine exponentielle Glättung n-ter Ordnung durch, um flüchtige Daten besser verarbeiten zu können:"
Syntax: SmoothN([Value], Length, Order, Initial Value)

SmoothN([Revenue], {1 Year}, 3, 100000)
SmoothN([Noise Level], {30 Days}, 2)
SmoothN([Air Quality Index], {12 Months}, 4)
```
#### PastValues
```jsx title="Gibt eine Liste aller vorherigen Werte eines Primitivs zurück, optional innerhalb eines Zeitfensters:"
Syntax: PastValues([Primitive], Period)

Sum(PastValues([Profit]))
Mean(PastValues([Visitors], {1 Month}))
Min(PastValues([Humidity], {3 Days}))
```
#### PastMax
```jsx title="Gibt den höchsten Wert zurück, den ein Primitiv während der Simulation oder eines bestimmten Zeitraums hatte:"
Syntax: PastMax([Primitive], Period)

PastMax([Sales], {1 Year})
PastMax([Rainfall], {6 Months})
```
#### PastMin
```jsx title="Gibt den niedrigsten Wert zurück, den ein Primitiv im Laufe der Zeit oder innerhalb eines bestimmten Fensters hatte:"
Syntax: PastMin([Primitive], Period)

PastMin([Energy Usage], {12 Months})
PastMin([Budget], 10)
```
#### PastMedian
```jsx title="Gibt den Median der Werte eines Primitives während der Simulation oder über einen definierten Zeitraum zurück:"
Syntax: PastMedian([Primitive], Period)

PastMedian([Temperature], {3 Months})
PastMedian([Response Time], {1 Week})
```
#### PastMean
```jsx title="Berechnet den Durchschnittswert eines Primitives über die Zeit oder innerhalb eines Zeitraums:"
Syntax: PastMean([Primitive], Period)

PastMean([Page Views], {7 Days})
PastMean([Fuel Cost], {1 Year})
```
#### PastStdDev
```jsx title="Gibt die Standardabweichung der Werte eines Primitivs zurück und zeigt die Variabilität an:"
Syntax: PastStdDev([Primitive], Period)

PastStdDev([Delivery Time], {6 Months})
PastStdDev([Inventory], {1 Quarter})
```
#### PastCorrelation
```jsx title="Berechnet die Korrelation zwischen zwei Primitives über die gesamte Simulation oder ein bestimmtes Zeitfenster:"
Syntax: PastCorrelation([Primitive1], [Primitive2], Period)

PastCorrelation([Advertising], [Sales], {6 Months})
PastCorrelation([Temperature], [AC Usage], {1 Year})
```
#### Fix
```jsx title="Sperrt einen Wert für einen bestimmten Zeitraum oder für die gesamte Simulation:"
Syntax: Fix(Value, Period)

Fix([CO2 Output], {1 Year})
Fix([Interest Rate])
```
### Random Number Functions

#### Uniform Distribution
```jsx title="Generiert eine Zufallszahl zwischen zwei Werten. Standardmäßig 0 und 1:"
Syntax: Rand(Min, Max)

Rand() → random number between 0 and 1
Rand(5, 15)
```
#### Normal Distribution
```jsx title="Gibt einen normalverteilten Wert mit einem angegebenen Mittelwert und einer angegebenen Standardabweichung zurück (Standardwerte: 0 und 1):"
Syntax: RandNormal(Mean, StdDev)

RandNormal()
RandNormal(100, 15)
```
#### Lognormal Distribution
```jsx title="Generiert eine Zufallszahl, die einer logarithmischen Normalverteilung folgt:"
Syntax: RandLognormal(Mean, StdDev)

RandLognormal(0, 0.5)
RandLognormal(1, 0.25)
```
#### Binary Distribution
```jsx title="Gibt mit der angegebenen Wahrscheinlichkeit „true“ zurück, andernfalls „false“. Der Standardwert ist 0,5:"
Syntax: RandBoolean(Probability)

RandBoolean() → fair coin flip
RandBoolean(0.8)
```
#### Binomial Distribution
```jsx title="Gibt die Anzahl der Erfolge aus einer festgelegten Anzahl von Versuchen mit fester Erfolgschance zurück:"
Syntax: RandBinomial(Count, Probability)

RandBinomial(10, 0.5)
RandBinomial(20, 0.3)
```
#### Negative Binomial Distribution
```jsx title="Gibt die Anzahl der Versuche zurück, die erforderlich sind, um eine bestimmte Anzahl von Erfolgen zu erreichen:"
Syntax: RandNegativeBinomial(Successes, Probability)

RandNegativeBinomial(5, 0.25)
RandNegativeBinomial(3, 0.5)
```
#### Poisson Distribution
```jsx title="Simuliert, wie oft ein Ereignis in einem bestimmten Zeitraum auftritt:"
Syntax: RandPoisson(Lambda)

RandPoisson(5)
RandPoisson(10)
```
#### Triangular Distribution
```jsx title="Gibt einen Wert zwischen einem Minimum und einem Maximum zurück, mit einem wahrscheinlichsten (Spitzen-)Wert:"
Syntax: RandTriangular(Min, Max, Peak)

RandTriangular(0, 10, 5)
RandTriangular(1, 100, 30)
```
#### Exponential Distribution
```jsx title="Modelliert die Zeit zwischen unabhängigen Ereignissen, die mit konstanter Rate stattfinden:"
Syntax: RandExp(Lambda)

RandExp(1)
RandExp(0.5)
```
#### Gamma Distribution
```jsx title="Generiert eine Zufallszahl mit Gamma-Verteilung basierend auf Form (Alpha) und Rate (Beta):"
Syntax: RandGamma(Alpha, Beta)

RandGamma(2, 2)
RandGamma(1, 0.5)
```
#### Beta Distribution
```jsx title="Generiert eine Zufallszahl mit Beta-Verteilung unter Verwendung von zwei Formparametern:"
Syntax: RandBeta(Alpha, Beta)

RandBeta(2, 5)
RandBeta(1, 1)
```
#### Custom Distribution
```jsx title="Generiert eine Zahl aus einer benutzerdefinierten Verteilung unter Verwendung von x-Werten und deren Wahrscheinlichkeiten:"
Syntax: RandDist(X, Y)

RandDist({1, 2, 3}, {0.2, 0.5, 0.3})
RandDist({-1, 0, 1}, {0.25, 0.5, 0.25})
```
#### SetRandSeed
```jsx title="Behebt den Seed des Zufallszahlengenerators für reproduzierbare Ergebnisse:"
Syntax: SetRandSeed(Seed)

SetRandSeed(123)
SetRandSeed(83940)
```

### Agent Functions

#### FindAll
```jsx title="Gibt alle Agenten in einer Population zurück. Nützlich für Massenaktionen oder Analysen:"
Syntax: [Population].FindAll()

[People].FindAll().Count()
Mean([Trees].FindAll().Map(x.Value([Height])))
```
#### FindState
```jsx title="Gibt alle Agenten in einem bestimmten Zustand zurück:"
Syntax: [Population].FindState([State])

[Cells].FindState([Infected])
[Students].FindState([Studying])
```
#### FindNotState
```jsx title="Gibt Agenten zurück, die sich nicht in einem bestimmten Zustand befinden:"
Syntax: [Population].FindNotState([State])

[Patients].FindNotState([Recovered])
Mean([Trees].FindNotState([Burned]).Map(x.Value([Height])))
```
#### FindIndex
```jsx title="Gibt den Agenten an einem bestimmten Index zurück (beginnend bei 1):"
Syntax: [Population].FindIndex(Index)

[Fish].FindIndex(1)
[Books].FindIndex(5)
```
#### FindNearby
```jsx title="Gibt Agenten innerhalb einer festgelegten Entfernung zu einem Ziel zurück:"
Syntax: [Population].FindNearby(Target, Distance)

[Trees].FindNearby(PollutedArea, 50)
[Fish].FindNearby(FoodSource, 20)
```
#### FindNearest
```jsx title="Gibt den/die nächstgelegene(n) Agent(en) zu einem Ziel zurück:"
Syntax: [Population].FindNearest(Target, Count=1)

[Customers].FindNearest(Store)
[EmergencyVehicles].FindNearest(AccidentSite, 5)
```
#### FindFurthest
```jsx title="Gibt den/die Agenten zurück, der/die am weitesten von einem Ziel entfernt ist/sind:"
Syntax: [Population].FindFurthest(Target, Count=1)

[FireStations].FindFurthest(Fire, 3)
[RetailStores].FindFurthest(Mall)
```
#### Value
```jsx title="Gibt einen Vektor von Werten eines angegebenen Attributs zurück:"
Syntax: [Population].Value([Primitive])

[Employees].Value([Salary]).Max()
[Cars].Value([Mileage]).Min()
```
#### SetValue
```jsx title="Setzt ein Attribut für alle oder bestimmte Agenten auf einen bestimmten Wert:"
Syntax: [Population].SetValue([Primitive], Value)

car.SetValue([FuelLevel], 100)
[University].SetValue([Smoker], false)
```
#### Location
```jsx title="Gibt die {x, y}-Koordinaten eines Agenten zurück:"
Syntax: [Agent].Location()

Self.Location().x
Self.Location().y
Predator.Location().Distance(Prey.Location())
```
#### SetLocation
```jsx title="Verschiebt einen Agenten an einen neuen {x, y}-Standort. Nützlich für die Simulation einer Neupositionierung:"
Syntax: [Agent].SetLocation(New Location)

Student.SetLocation({x: 60, y: 40})
Bird.SetLocation(Bird.Location() + {x: -10, y: 0})
Taxi.SetLocation(Customer.Location())
```
#### Index
```jsx title="Gibt den 1-basierten Index des Agenten in seiner Population zurück:"
Syntax: [Agent].Index()

Self.Index()
```
#### Distance
```jsx title="Berechnet die euklidische Distanz zwischen zwei Punkten oder Agenten:"
Syntax: Distance(Location One, Location Two)

Distance({x: 10, y: 5}, {x: 20, y: 15})
Distance(patient, hospital)
```
#### Move
```jsx title="Bewegt den Agenten um einen Delta-Vektor {x, y}:"
Syntax: [Agent].Move({x, y})

Self.Move({x: Rand(-1, 1), y: Rand(-1, 1)})
Car.Move({x: 10, y: 0})
```
#### MoveTowards
```jsx title="Bewegt den Agenten in Richtung eines Zielorts oder Agenten um eine angegebene Distanz:"
Syntax: [Agent].MoveTowards(Target, Distance)

Self.MoveTowards({0, 100}, 10)
Self.MoveTowards([Food Sources].FindNearest(Self), 5)
```
#### Connected
```jsx title="Gibt alle Agenten zurück, die in einem Netzwerk direkt mit dem Agenten verbunden sind:"
Syntax: [Agent].Connected()

Self.Connected().Length()
```
#### Connect
```jsx title="Erstellt eine Netzwerkverbindung zwischen Agenten mit optionaler Gewichtung:"
Syntax: [Agent 1].Connect([Agent 2], Weight)

Self.Connect([Population].FindNearest(Self), 5)
Self.Connect(Self.FindNearest([Food Source]), 10)
```
#### Unconnect
```jsx title="Entfernt die Netzwerkverbindung zwischen Agenten:"
Syntax: [Agent 1].Unconnect([Agent 2])

Self.Unconnect(SpecificAgent)
```
#### ConnectionWeight
```jsx title="Gibt das Gewicht der Verbindung zwischen zwei Agenten zurück:"
Syntax: [Agent 1].ConnectionWeight([Agent 2])

Self.ConnectionWeight(agent)
```
#### SetConnectionWeight
```jsx title="Legt die Verbindungsgewichtung zwischen zwei Agenten fest:"
Syntax: [Agent 1].SetConnectionWeight([Agent 2], Weight)

Self.SetConnectionWeight(BestFriend, 100)
Self.SetConnectionWeight(Other, 10)
```
#### Population Size
```jsx title="Gibt die Gesamtzahl der Agenten in einer Population zurück:"
Syntax: [Agent Population].PopulationSize()

[Fish].PopulationSize()
IfThenElse([Rabbits].PopulationSize() > 1000, 'Overpopulated', 'Stable')
```
#### Add
```jsx title="Fügt der Population einen neuen Agenten hinzu, klont optional einen vorhandenen:"
Syntax: [Agent Population].Add(Base Agent=Initial Agent)

[Trees].Add(Tree)
Repeat([Company].Add(NewHire), 10)
```
#### Remove
```jsx title="Entfernt einen Agenten aus der Bevölkerung:"
Syntax: [Agent].Remove()

prey.Remove()
[University].FindState([Smoker]).Map(x.Remove())
```

#### Width
```jsx title="Gibt die Breite der geografischen Region des Agenten zurück:"
Syntax: Width(Agent)

Width(Self)
Width(Car)
```
#### Height
```jsx title="Gibt die Höhe der geografischen Region des Agenten zurück:"
Syntax: Height(Agent)

Height(Self)
Height(Store)
```
### Vector Functions

#### Range
```jsx title="Erstellt eine Zahlenfolge von Anfang bis Ende, mit optionaler Schrittweite:"
Syntax: Start:Step:End or Start:End

1:5 → {1, 2, 3, 4, 5}
10:-2:2 → {10, 8, 6, 4, 2}
```
#### Length
```jsx title="Gibt die Anzahl der Elemente in einem Vektor zurück:"
Syntax: Vector.Length()

{1, 1, 2, 3}.Length() → 4
{ 'a', 'b', 'c' }.Length() → 3
```
#### Select
```jsx title="Ruft Elemente aus einem Vektor mithilfe von Indizes, Namen oder Bedingungen ab:"
Syntax: Vector{Selector}

{4, 5, 6}{2} → 5
{ 'a': 1, 'b': 2 }{'b'} → 2
{10, 20, 30}{ vector > 15 } → {20, 30}
```
#### Join
```jsx title="Kombiniert mehrere Elemente zu einem Vektor:"
Syntax: Join(Item1, Item2, ...)

Join(0, {1, 2}) → {0, 1, 2}
Join('a', {'b', 'c'}) → {'a', 'b', 'c'}
```
#### Flatten
```jsx title="Entfernt die Verschachtelung und flacht einen Vektor auf eine Ebene ab:"
Syntax: Vector.Flatten()

{ {1, 2}, {3} }.Flatten() → {1, 2, 3}
{ { {1} } }.Flatten() → {1}
```
#### Unique
```jsx title="Entfernt Duplikate aus einem Vektor:"
Syntax: Vector.Unique()

{1, 2, 2, 3}.Unique() → {1, 2, 3}
{'a', 'a', 'b'}.Unique() → {'a', 'b'}
```
#### Union
```jsx title="Fügt zwei Vektoren zusammen und entfernt Duplikate:"
Syntax: Vector1.Union(Vector2)

{1, 2}.Union({2, 3}) → {1, 2, 3}
{ 'x' }.Union({ 'y', 'z' }) → {'x', 'y', 'z'}
```
#### Intersection
```jsx title="Gibt gemeinsame Elemente aus beiden Vektoren zurück:"
Syntax: Vector1.Intersection(Vector2)

{1, 2}.Intersection({2, 3}) → {2}
{'a', 'b'}.Intersection({'b', 'c'}) → {'b'}
```
#### Difference
```jsx title="Gibt für jeden Vektor eindeutige Elemente zurück:"
Syntax: Vector1.Difference(Vector2)

{1, 2}.Difference({2, 3}) → {1, 3}
{'a', 'b'}.Difference({'b', 'c'}) → {'a', 'c'}
```
#### Sort
```jsx title="Sortiert einen Vektor in aufsteigender Reihenfolge:"
Syntax: Vector.Sort()

{4, 1, 3}.Sort() → {1, 3, 4}
{8, -2, 0}.Sort() → {-2, 0, 8}
```
#### Reverse
```jsx title="Kehrt die Reihenfolge der Elemente um:"
Syntax: Vector.Reverse()

{4, 5, 6}.Reverse() → {6, 5, 4}
{'x', 'y', 'z'}.Reverse() → {'z', 'y', 'x'}
{true, false}.Reverse() → {false, true}
```
#### Sample
```jsx title="Wählt zufällig Elemente aus einem Vektor aus:"
Syntax: Vector.Sample(size, allowRepeats=False)

{10, 20, 30}.Sample(2) → {30, 10}
{1, 2, 3}.Sample(2, true) → {2, 2}
{1, 2, 3, 4}.Sample(3) → e.g., {1, 3, 4}
```
#### IndexOf
```jsx title="Findet die Position eines Elements:"
Syntax: Vector.IndexOf(element)

{5, 10, 15}.IndexOf(10) → 2
{'red', 'blue'}.IndexOf('green') → 0
{7, 8, 7}.IndexOf(7) → 1
```
#### Contains
```jsx title="Überprüft, ob ein Vektor einen Wert enthält:"
Syntax: Vector.Contains(element)

{100, 200}.Contains(100) → true
{1, 2, 3}.Contains(0) → false
{}.Contains(1) → false
```
#### Repeat
```jsx title="Erzeugt einen Vektor durch Wiederholung eines Ausdrucks:"
Syntax: Repeat(expression, times)

Repeat(x+1, 3) → {2, 3, 4}
Repeat(x*2, 4) → {2, 4, 6, 8}
Repeat('Item ' + key, {'id1', 'id2'}) → {'id1': 'Item id1', 'id2': 'Item id2'}
```
#### Map
```jsx title="Wendet eine Funktion auf jedes Vektorelement an:"
Syntax: Vector.Map(function)

{1, 2, 3}.Map(x + 1) → {2, 3, 4}
{'a': 1, 'b': 2}.Map(x*10) → {'a': 10, 'b': 20}
{'x': 5}.Map(key + '=' + x) → {'x': 'x=5'}
```
#### Filter
```jsx title="Gibt Elemente zurück, die einer Bedingung entsprechen:"
Syntax: Vector.Filter(condition)

{1, 2, 3, 4}.Filter(x > 2) → {3, 4}
{'a': 5, 'b': 0}.Filter(x > 0) → {'a': 5}
{10, 15, 20}.Filter(x mod 10 == 0) → {10, 20}
```
#### Keys
```jsx title="Ruft die Schlüsselwerte aus einem benannten Vektor ab:"
Syntax: Vector.Keys()

{'x': 1, 'y': 2}.Keys() → {'x', 'y'}
{'temp': 30}.Keys() → {'temp'}
```
#### Values
```jsx title="Ruft die Werte aus einem Vektor ab:"
Syntax: Vector.Values()

{'a': 10, 'b': 20}.Values() → {10, 20}
{1, 2, 3}.Values() → {1, 2, 3}
```
#### Lookup
```jsx title="Findet ein Ergebnis basierend auf der Eingabe und interpoliert bei Bedarf:"
Syntax: Lookup(value, valuesVector, resultsVector)

Lookup(3, {1, 5}, {10, 50}) → 30
Lookup(2, {2, 4}, {20, 40}) → 20
Lookup(6, {5, 10}, {100, 200}) → 120
```
#### ConverterTable
```jsx title="Gibt x/y-Wertpaare von einem Konverter zurück:"
Syntax: ConverterTable([Converter])

ConverterTable([Speed]) → { {x: 0, y: 0}, {x: 1, y: 100} }
ConverterTable([Temp]){*, "x"} → {0, 1}
ConverterTable([Temp]){*, "y"} → {0, 100}
```
### General Functions

#### IfThenElse
```jsx title="Testet eine Bedingung und gibt einen von zwei Werten zurück:"
Syntax: IfThenElse(condition, trueValue, falseValue)

IfThenElse(5 > 3, "Yes", "No") → "Yes"
IfThenElse(Years() >= 10, 1, 0) → 1
IfThenElse([Temp] > 100, "Hot", "Cool")
```
#### Pulse
```jsx title="Erzeugt einen Impuls zu einem festgelegten Zeitpunkt:"
Syntax: Pulse(time, height=1, width=0, repeat=-1)

Pulse({5 Years}, 10) → 10 at year 5
Pulse({2 Years}, 3, 1, {4 Years}) → Repeats every 4 years
Pulse({0}, 1, 1) → Starts immediately, lasts 1 year
```
#### Step
```jsx title="Springt zu einem bestimmten Zeitpunkt auf einen neuen Wert:"
Syntax: Step(start, height=1)

Step({3 Years}, 50) → 50 after 3 years
Step({10 Years}) → Defaults to 1
Step({0}, 100) → Starts at time 0
```
#### Ramp
```jsx title="Steigt linear von 0 auf eine bestimmte Höhe:"
Syntax: Ramp(start, finish, height=1)

Ramp({0}, {5}, 10) → From 0 to 10 over 5 years
Ramp({2}, {6}) → Gradually increases to 1
Ramp({4}, {8}, -2) → Decreases to -2
```
#### Pause
```jsx title="Hält die Simulation vorübergehend an:"
Syntax: Pause()

IfThenElse(Years() = 10, Pause(), 0)
IfThenElse([Value] > 100, Pause(), 0)
```
#### Stop
```jsx title="Beendet die Simulation sofort:"
Syntax: Stop()

IfThenElse([CO2] > 400, Stop(), 0)
IfThenElse(Rand() < 0.05, Stop(), 0)
```
### String Functions

#### Length
```jsx title="Gibt die Anzahl der Zeichen in einer Zeichenfolge zurück:"
Syntax: String.Length()

"abc".Length() → 3
" ".Length() → 3
"Hello, world!".Length() → 13
```
#### Range
```jsx title="Extrahiert Teile einer Zeichenfolge:"
Syntax: String.Range(positions)

"abcdef".Range(2:4) → "bcd"
"Data123".Range({1, 5, 6}) → "Da2"
"TestString".Range(1:4) → "Test"
```
#### Split
```jsx title="Teilt eine Zeichenfolge mithilfe von Trennzeichen auf:"
Syntax: String.Split(delimiter)

"a,b,c".Split(",") → {"a", "b", "c"}
"2025/07/11".Split("/") → {"2025", "07", "11"}
"word1 word2".Split(" ") → {"word1", "word2"}
```
#### IndexOf
```jsx title="Findet die Startposition eines Teilstrings:"
Syntax: String.IndexOf(substring)

"abcabc".IndexOf("b") → 2
"Example".IndexOf("z") → 0
"UrbanModelBuilder".IndexOf("Builder") → 11
```
#### Contains
```jsx title="Überprüft, ob eine Zeichenfolge eine Teilzeichenfolge enthält:"
Syntax: String.Contains(substring)

"hello".Contains("ell") → true
"abc123".Contains("123") → true
```
#### UpperCase
```jsx title="Wandelt alle Buchstaben in Großbuchstaben um:"
Syntax: String.UpperCase()

"hello".UpperCase() → "HELLO"
"a1b2!".UpperCase() → "A1B2!"
```
#### LowerCase
```jsx title="Wandelt alle Buchstaben in Kleinbuchstaben um:"
Syntax: String.LowerCase()

"HELLO".LowerCase() → "hello"
"Text123!".LowerCase() → "text123!"
```
#### Join
```jsx title="Kombiniert Vektorelemente zu einer Zeichenfolge:"
Syntax: Vector.Join(separator)

{"a", "b", "c"}.Join("-") → "a-b-c"
{2025, 7, 11}.Join("/") → "2025/7/11"
{"red", "blue"}.Join(" & ") → "red & blue"
```
#### Trim
```jsx title="Entfernt Leerzeichen an beiden Enden:"
Syntax: String.Trim()

" text ".Trim() → "text"
" \nTest\t".Trim() → "Test"
```
#### Parse
```jsx title="Wandelt eine numerische Zeichenfolge in eine Zahl um:"
Syntax: String.Parse()

"42".Parse() → 42
"3.14".Parse() → 3.14
"-100".Parse() → -100
```
### Programming

#### Variables
```jsx title="Weist einen Wert zur späteren Verwendung zu:"
Syntax: variable <- value

x <- 10 → x^2 → 100
a <- 3; b <- a + 5 → b → 8
```
#### If-Then-Else Statement
```jsx title="Führt Code basierend auf Bedingungen aus:"
Syntax:
If condition Then
  code
Else If condition Then
  code
Else
  code
End If

x <- 5; 
If x > 10 Then 
'Big' 
Else 
'Small' 
End If 
→ 'Small'
```
#### While Loop
```jsx title="Wird wiederholt, solange eine Bedingung erfüllt ist:"
Syntax:
While condition
  code
End Loop

x <- 1; 
While x < 5 
x <- x * 2 
End Loop 

→ x → 8
```
#### For-In Loop
```jsx title="Durchläuft jedes Element in einem Vektor:"
Syntax:
For item in vector
  code
End Loop

sum <- 0; 
For x in {1, 2, 3} 
sum <- sum + x 
End Loop 

→ sum → 6
```
#### Functions
```jsx title="Definiert einen wiederverwendbaren Codeblock:"
Syntax:
Function Name(params)
  code
End Function

Function Double(x) 
x * 2 
End Function

Double(4) → 8
```
#### Anonymous Functions
```jsx title="Unbenannte Funktion, die in einer Variablen gespeichert ist:"
Syntax:
var <- Function(params)
  code
End Function

square <- Function(x) 
x^2 
End Function

square(3) → 9
```
#### Single-Line Anonymous Functions
```jsx title="Kompakte anonyme Funktion:"
Syntax: Function(x) expression

{1, 2, 3}.Map(Function(x) x + 1) → {2, 3, 4}
{5, 10, 15}.Filter(Function(x) x > 5) → {10, 15}
```
#### Throwing Errors
```jsx title="Löst manuell einen Fehler aus:"
Syntax: throw 'message'

If x < 0 Then 
throw 'Negative not allowed' 
End If
```
#### Error Handling
```jsx title="Behandelt Fehler mit Try-Catch:"
Syntax:
Try
  code
Catch err
  handle error
End Try

Try
Ln(-1) 
Catch e 
'Error: ' + e 
End Try 

→ 'Error: Invalid input'
```
### User Input Functions

#### Alert
```jsx title="Zeigt ein Meldungsfeld an:"
Syntax: Alert("message")

Alert("Simulation started")
```
#### Prompt
```jsx title="Ruft Benutzereingaben ab:"
Syntax: Prompt("message", default)

age <- Prompt("Enter age", 18).Parse()
```
#### Confirm
```jsx title="Erhält eine Ja/Nein-Bestätigung:"
Syntax: Confirm("message")

runAdvanced <- Confirm("Enable advanced mode?")
```
### Statistical Distributions

#### PDFChiSquared
```jsx title="Gibt die Dichte eines Chi-Quadrat-Wertes zurück:"
Syntax: PDFChiSquared(x, df)

PDFChiSquared(2, 5) → 0.138
PDFChiSquared(7.8, 3) → 0.023
```
#### InvChiSquared
```jsx title="Gibt den Chi-Quadrat-Wert für eine gegebene Wahrscheinlichkeit zurück:"
Syntax: InvChiSquared(p, df)

InvChiSquared(0.95, 3) → 7.81
InvChiSquared(0.99, 1) → 6.63
```
#### CDFExponential
```jsx title="Gibt die kumulative Wahrscheinlichkeit für eine Exponentialverteilung zurück:"
Syntax: CDFExponential(x, rate)

CDFExponential(10, 0.5) → 0.9933
CDFExponential(5, 1) → 0.9933
```
#### PDFExponential
```jsx title="Gibt die Wahrscheinlichkeitsdichte für die Exponentialverteilung zurück:"
Syntax: PDFExponential(x, rate)

PDFExponential(1, 0.5) → 0.303
PDFExponential(2, 1) → 0.135
```
#### InvExponential
```jsx title="Gibt den x-Wert für eine gegebene Wahrscheinlichkeit zurück:"
Syntax: InvExponential(p, rate)

InvExponential(0.5, 1) → 0.6931
InvExponential(0.8, 0.5) → 3.2189
```
#### CDFPoisson
```jsx title="Gibt die kumulative Wahrscheinlichkeit der Poisson-Verteilung zurück:"
Syntax: CDFPoisson(x, lambda)

CDFPoisson(5, 3) → 0.916
CDFPoisson(10, 7) → 0.901
```
#### PMFPoisson
```jsx title="Gibt die genaue Wahrscheinlichkeit für eine Zählung in der Poisson-Verteilung zurück:"
Syntax: PMFPoisson(x, lambda)

PMFPoisson(4, 2) → 0.09
PMFPoisson(0, 5) → 0.0067
```