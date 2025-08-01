---
sidebar_position: 3
---
# Random Number Functions
### Uniform Distribution
```jsx title="Generiert eine Zufallszahl zwischen zwei Werten. Standardmäßig 0 und 1:"
Syntax: Rand(Min, Max)

Rand() → random number between 0 and 1
Rand(5, 15)
```
### Normal Distribution
```jsx title="Gibt einen normalverteilten Wert mit einem angegebenen Mittelwert und einer angegebenen Standardabweichung zurück (Standardwerte: 0 und 1):"
Syntax: RandNormal(Mean, StdDev)

RandNormal()
RandNormal(100, 15)
```
### Lognormal Distribution
```jsx title="Generiert eine Zufallszahl, die einer logarithmischen Normalverteilung folgt:"
Syntax: RandLognormal(Mean, StdDev)

RandLognormal(0, 0.5)
RandLognormal(1, 0.25)
```
### Binary Distribution
```jsx title="Gibt mit der angegebenen Wahrscheinlichkeit „true“ zurück, andernfalls „false“. Der Standardwert ist 0,5:"
Syntax: RandBoolean(Probability)

RandBoolean() → fair coin flip
RandBoolean(0.8)
```
### Binomial Distribution
```jsx title="Gibt die Anzahl der Erfolge aus einer festgelegten Anzahl von Versuchen mit fester Erfolgschance zurück:"
Syntax: RandBinomial(Count, Probability)

RandBinomial(10, 0.5)
RandBinomial(20, 0.3)
```
### Negative Binomial Distribution
```jsx title="Gibt die Anzahl der Versuche zurück, die erforderlich sind, um eine bestimmte Anzahl von Erfolgen zu erreichen:"
Syntax: RandNegativeBinomial(Successes, Probability)

RandNegativeBinomial(5, 0.25)
RandNegativeBinomial(3, 0.5)
```
### Poisson Distribution
```jsx title="Simuliert, wie oft ein Ereignis in einem bestimmten Zeitraum auftritt:"
Syntax: RandPoisson(Lambda)

RandPoisson(5)
RandPoisson(10)
```
### Triangular Distribution
```jsx title="Gibt einen Wert zwischen einem Minimum und einem Maximum zurück, mit einem wahrscheinlichsten (Spitzen-)Wert:"
Syntax: RandTriangular(Min, Max, Peak)

RandTriangular(0, 10, 5)
RandTriangular(1, 100, 30)
```
### Exponential Distribution
```jsx title="Modelliert die Zeit zwischen unabhängigen Ereignissen, die mit konstanter Rate stattfinden:"
Syntax: RandExp(Lambda)

RandExp(1)
RandExp(0.5)
```
### Gamma Distribution
```jsx title="Generiert eine Zufallszahl mit Gamma-Verteilung basierend auf Form (Alpha) und Rate (Beta):"
Syntax: RandGamma(Alpha, Beta)

RandGamma(2, 2)
RandGamma(1, 0.5)
```
### Beta Distribution
```jsx title="Generiert eine Zufallszahl mit Beta-Verteilung unter Verwendung von zwei Formparametern:"
Syntax: RandBeta(Alpha, Beta)

RandBeta(2, 5)
RandBeta(1, 1)
```
### Custom Distribution
```jsx title="Generiert eine Zahl aus einer benutzerdefinierten Verteilung unter Verwendung von x-Werten und deren Wahrscheinlichkeiten:"
Syntax: RandDist(X, Y)

RandDist({1, 2, 3}, {0.2, 0.5, 0.3})
RandDist({-1, 0, 1}, {0.25, 0.5, 0.25})
```
### SetRandSeed
```jsx title="Behebt den Seed des Zufallszahlengenerators für reproduzierbare Ergebnisse:"
Syntax: SetRandSeed(Seed)

SetRandSeed(123)
SetRandSeed(83940)
```