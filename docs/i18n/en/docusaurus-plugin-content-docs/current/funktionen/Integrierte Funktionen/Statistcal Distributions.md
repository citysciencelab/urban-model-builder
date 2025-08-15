---
sidebar_position: 10
---
# Statistical Distributions
### PDFChiSquared
```jsx title="Returns the density of a chi-squared value:"
Syntax:     PDFChiSquared(x, df)

Example:   PDFChiSquared(2, 5) → 0.138
            PDFChiSquared(7.8, 3) → 0.023
```
### InvChiSquared
```jsx title="Returns the chi-squared value for a given probability:"
Syntax:     InvChiSquared(p, df)

Example:   InvChiSquared(0.95, 3) → 7.81
            InvChiSquared(0.99, 1) → 6.63
```
### CDFExponential
```jsx title="Returns the cumulative probability for an exponential distribution:"
Syntax:     CDFExponential(x, rate)

Example:   CDFExponential(10, 0.5) → 0.9933
            CDFExponential(5, 1) → 0.9933
```
### PDFExponential
```jsx title="Returns the probability density for the exponential distribution:"
Syntax:     PDFExponential(x, rate)

Example:   PDFExponential(1, 0.5) → 0.303
            PDFExponential(2, 1) → 0.135
```
### InvExponential
```jsx title="Returns the x-value for a given probability:"
Syntax:     InvExponential(p, rate)

Example:   InvExponential(0.5, 1) → 0.6931
            InvExponential(0.8, 0.5) → 3.2189
```
### CDFPoisson
```jsx title="Returns the cumulative probability of the Poisson distribution:"
Syntax:     CDFPoisson(x, lambda)

Example:   CDFPoisson(5, 3) → 0.916
            CDFPoisson(10, 7) → 0.901
```
### PMFPoisson
```jsx title="Returns the exact probability for a count in the Poisson distribution:"
Syntax:     PMFPoisson(x, lambda)

Example:   PMFPoisson(4, 2) → 0.09
            PMFPoisson(0, 5) → 0.0067
```