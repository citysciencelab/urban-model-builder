---
sidebar_position: 10
---
# Statistical Distributions
### PDFChiSquared
```jsx title="Gibt die Dichte eines Chi-Quadrat-Wertes zurück:"
Syntax:     PDFChiSquared(x, df)

Beispiel:   PDFChiSquared(2, 5) → 0.138
            PDFChiSquared(7.8, 3) → 0.023
```
### InvChiSquared
```jsx title="Gibt den Chi-Quadrat-Wert für eine gegebene Wahrscheinlichkeit zurück:"
Syntax:     InvChiSquared(p, df)

Beispiel:   InvChiSquared(0.95, 3) → 7.81
            InvChiSquared(0.99, 1) → 6.63
```
### CDFExponential
```jsx title="Gibt die kumulative Wahrscheinlichkeit für eine Exponentialverteilung zurück:"
Syntax:     CDFExponential(x, rate)

Beispiel:   CDFExponential(10, 0.5) → 0.9933
            CDFExponential(5, 1) → 0.9933
```
### PDFExponential
```jsx title="Gibt die Wahrscheinlichkeitsdichte für die Exponentialverteilung zurück:"
Syntax:     PDFExponential(x, rate)

Beispiel:   PDFExponential(1, 0.5) → 0.303
            PDFExponential(2, 1) → 0.135
```
### InvExponential
```jsx title="Gibt den x-Wert für eine gegebene Wahrscheinlichkeit zurück:"
Syntax:     InvExponential(p, rate)

Beispiel:   InvExponential(0.5, 1) → 0.6931
            InvExponential(0.8, 0.5) → 3.2189
```
### CDFPoisson
```jsx title="Gibt die kumulative Wahrscheinlichkeit der Poisson-Verteilung zurück:"
Syntax:     CDFPoisson(x, lambda)

Beispiel:   CDFPoisson(5, 3) → 0.916
            CDFPoisson(10, 7) → 0.901
```
### PMFPoisson
```jsx title="Gibt die genaue Wahrscheinlichkeit für eine Zählung in der Poisson-Verteilung zurück:"
Syntax:     PMFPoisson(x, lambda)

Beispiel:   PMFPoisson(4, 2) → 0.09
            PMFPoisson(0, 5) → 0.0067
```