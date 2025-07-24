---
sidebar_position: 5
---

# Funktionen

## Basic Programming

### Variablen definieren

```jsx title="Verwende den Operator <-, um Werte zuzuweisen:"
x <- 5
y <- x + 3  # y = 8
x <- x * 2  # x = 10
```
:::tip Block-Scoping

Innerhalb eines Blocks deklarierte Variablen sind außerhalb des Blocks nicht zugänglich.

:::

### Kommentare
```jsx title="Verwende Kommentare, um den Code lesbarer zu machen. Diese werden bei der Ausführung ignoriert:"
# This is a comment 
// Also a comment
1 + /* this is ignored */ 2  # = 3
```
### Funktionen definieren
```jsx title="Definiere Funktionen in Kurz- oder Langform:"
# Short form
addThree(a, b, c) <- a + b + c

# Long form
function addThree(a, b, c)
  a + b + c
end function
```

```jsx title="Default values:"
power(a, b = 2) <- a^b
power(3)  # = 9
```
### If-Then-Else Statements
```jsx title="Nutze konditionale Logik:"
if age > 18 then
  "Adult"
else if age > 12 then
  "Teen"
else
  "Child"
end if
```
### While Loops
```jsx title="Code wiederholen, solange eine Bedingung erfüllt ist:"
n <- 1
while n < 100
  n <- n * 2
end loop
# n = 128
```
### For Loops
```jsx title="Der Code wird in einer festgelegte Anzahl ausgeführt:"
sum <- 0
for i from 1 to 5
  sum <- sum + i
end loop
# sum = 15
```
```jsx title="Mit benutzerdefinierten Schritten:"
for i from 2 to 10 by 2
  sum <- sum + i
end loop
# sum = 30
```
```jsx title="For-in loop:"
for val in {3, -1, 7}
  print(val)
end loop
```
### Returning Values
```jsx title="Der letzte Ausdruck in einem Block wird zurückgegeben, sofern „return“ nicht explizit verwendet wird:"
return 2 + 2  # = 4
```
### Error Handling
```jsx title="Verwende Try-Catch, um Fehler sicher zu behandeln:"
Try
  result <- someRiskyFunction()
Catch err
  result <- "Error occurred"
End Try
```
```jsx title="Benutzerdefinierte Fehler auslösen:"
if x.length() = 0 then
  throw "x must not be empty"
end if
```
### Destructuring Assignment
```jsx title="Schnelles Zuweisen von Elementen aus einem Vektor:"
a, b <- {100, 200}
# a = 100, b = 200
```
## Funktionale Programmierung

### First-Class Funktionen
```jsx title="Weise Variablen Funktionen zu:"
myFunc <- mean
myFunc(4, 6, 8)  # = 6
```
```jsx title="Nutze die Map-Funktion mit einem Funktionsvektor, um bestimmte Werte aus einem Datensatz zu erhalten:"
{Min, Max}.Map(x(5, 8, 2))  # = {2, 8}
```
### Anonyme Funktionen
```jsx title="Definiere Funktionen ohne Namen:"
f <- function(x, y) sqrt(x^2 + y^2)
f(6, 8)  # = 10
```
```jsx title="Hilfreich bei Funktionen wie Map() und Filter():"
{1, 2, 3}.map(function(n) n^2)  # = {1, 4, 9}
```
### Closures
```jsx title="Hilfreich bei Funktionen wie Map() und Filter():"
function makeCounter()
  count <- 0
  function()
    count <- count + 1
    count
  end function
end function

c <- makeCounter()
c()  # = 1
c()  # = 2
```
## Object-Oriented Programming (OOP)

### Objekte definieren
```jsx title="Objekte sind benannte Vektoren:"
Car <- {
  make: "Toyota",
  year: 2020
}
Car.make  # = "Toyota"
```
```jsx title="Füge Verhaltensregeln den Funktionen hinzu:"
Car.fullInfo <- function()
  self.make + " (" + self.year + ")"
end function
```
### Inheritance
```jsx title=""

```
### Constructors
```jsx title="Füge Verhaltensregeln den Funktionen hinzu:"
Car.fullInfo <- function()
  self.make + " (" + self.year + ")"
end function
```
### Parent Reference
```jsx title="Use parent to call a parent’s function:"
ElectricCar <- new Car("", 0)
ElectricCar.range <- 300
ElectricCar.constructor <- function(m, y, r)
  parent.constructor(m, y)
  self.range <- r
end function
```
## Integrierte Funktionen 
