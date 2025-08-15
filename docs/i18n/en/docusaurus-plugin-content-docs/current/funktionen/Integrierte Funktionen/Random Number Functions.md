---
sidebar_position: 3
---
# Random Number Functions
### Uniform Distribution
```jsx title="Generates a random number between two values. Defaults to 0 and 1:"
Syntax:     Rand(Min, Max)

Example:   Rand() → random number between 0 and 1
            Rand(5, 15)
```
### Normal Distribution
```jsx title="Returns a normally distributed value with a specified mean and standard deviation (defaults: 0 and 1):"
Syntax:     RandNormal(Mean, StdDev)

Example:   RandNormal()
            RandNormal(100, 15)
```
### Lognormal Distribution
```jsx title="Generates a random number following a lognormal distribution:"
Syntax:     RandLognormal(Mean, StdDev)

Example:   RandLognormal(0, 0.5)
            RandLognormal(1, 0.25)
```
### Binary Distribution
```jsx title="Returns 'true' with the given probability, otherwise 'false'. Default is 0.5:"
Syntax:     RandBoolean(Probability)

Example:   RandBoolean() → fair coin flip
            RandBoolean(0.8)
```
### Binomial Distribution
```jsx title="Returns the number of successes from a fixed number of trials with a fixed success probability:"
Syntax:     RandBinomial(Count, Probability)

Example:   RandBinomial(10, 0.5)
            RandBinomial(20, 0.3)
```
### Negative Binomial Distribution
```jsx title="Returns the number of trials required to achieve a specific number of successes:"
Syntax:     RandNegativeBinomial(Successes, Probability)

Example:   RandNegativeBinomial(5, 0.25)
            RandNegativeBinomial(3, 0.5)
```
### Poisson Distribution
```jsx title="Simulates how often an event occurs within a specific time period:"
Syntax:     RandPoisson(Lambda)

Example:   RandPoisson(5)
            RandPoisson(10)
```
### Triangular Distribution
```jsx title="Returns a value between a minimum and a maximum, with a most likely (peak) value:"
Syntax:     RandTriangular(Min, Max, Peak)

Example:   RandTriangular(0, 10, 5)
            RandTriangular(1, 100, 30)
```
### Exponential Distribution
```jsx title="Models the time between independent events that occur at a constant rate:"
Syntax:     RandExp(Lambda)

Example:   RandExp(1)
            RandExp(0.5)
```
### Gamma Distribution
```jsx title="Generates a random number with a gamma distribution based on shape (alpha) and rate (beta):"
Syntax:     RandGamma(Alpha, Beta)

Example:   RandGamma(2, 2)
            RandGamma(1, 0.5)
```
### Beta Distribution
```jsx title="Generates a random number with a beta distribution using two shape parameters:"
Syntax:     RandBeta(Alpha, Beta)

Example:   RandBeta(2, 5)
            RandBeta(1, 1)
```
### Custom Distribution
```jsx title="Generates a number from a custom distribution using x-values and their probabilities:"
Syntax:     RandDist(X, Y)

Example:   RandDist({1, 2, 3}, {0.2, 0.5, 0.3})
            RandDist({-1, 0, 1}, {0.25, 0.5, 0.25})
```
### SetRandSeed
```jsx title="Fixes the seed of the random number generator for reproducible results:"
Syntax:     SetRandSeed(Seed)

Example:   SetRandSeed(123)
            SetRandSeed(83940)
```