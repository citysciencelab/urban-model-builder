---
sidebar_position: 8
---
# Programming
### Variables
```jsx title="Weist einen Wert zur späteren Verwendung zu:"
Syntax: variable <- value

x <- 10 → x^2 → 100
a <- 3; b <- a + 5 → b → 8
```
### If-Then-Else Statement
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
### While Loop
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
### For-In Loop
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
### Functions
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
### Anonymous Functions
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
### Single-Line Anonymous Functions
```jsx title="Kompakte anonyme Funktion:"
Syntax: Function(x) expression

{1, 2, 3}.Map(Function(x) x + 1) → {2, 3, 4}
{5, 10, 15}.Filter(Function(x) x > 5) → {10, 15}
```
### Throwing Errors
```jsx title="Löst manuell einen Fehler aus:"
Syntax: throw 'message'

If x < 0 Then 
throw 'Negative not allowed' 
End If
```
### Error Handling
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