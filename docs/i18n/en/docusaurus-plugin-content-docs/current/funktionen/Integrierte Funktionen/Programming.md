---
sidebar_position: 8
---
# Programming
### Variables
```jsx title="Assigns a value for later use:"
Syntax:   variable <- value

Example: x <- 10 → x^2 → 100
          a <- 3; b <- a + 5 → b → 8
```
### If-Then-Else Statement
```jsx title="Executes code based on conditions:"
Syntax:
If condition Then
  code
Else If condition Then
  code
Else
  code
End If

Example:
x <- 5; 
If x > 10 Then 
'Big' 
Else 
'Small' 
End If 
→ 'Small'
```
### While Loop
```jsx title="Repeats as long as a condition is met:"
Syntax:
While condition
  code
End Loop

Example:
x <- 1; 
While x < 5 
x <- x * 2 
End Loop 

→ x → 8
```
### For-In Loop
```jsx title="Iterates through each element in a vector:"
Syntax:
For item in vector
  code
End Loop

Example:
sum <- 0; 
For x in {1, 2, 3} 
sum <- sum + x 
End Loop 

→ sum → 6
```
### Functions
```jsx title="Defines a reusable code block:"
Syntax:
Function Name(params)
  code
End Function

Example:
Function Double(x) 
x * 2 
End Function

Double(4) → 8
```
### Anonymous Functions
```jsx title="Unnamed function stored in a variable:"
Syntax:
var <- Function(params)
  code
End Function

Example:
square <- Function(x) 
x^2 
End Function

square(3) → 9
```
### Single-Line Anonymous Functions
```jsx title="Compact anonymous function:"
Syntax:   Function(x) expression

Example: {1, 2, 3}.Map(Function(x) x + 1) → {2, 3, 4}
          {5, 10, 15}.Filter(Function(x) x > 5) → {10, 15}
```
### Throwing Errors
```jsx title="Manually throws an error:"
Syntax: throw 'message'

Example:
If x < 0 Then 
throw 'Negative not allowed' 
End If
```
### Error Handling
```jsx title="Handles errors with Try-Catch:"
Syntax:
Try
  code
Catch err
  handle error
End Try

Example:
Try
Ln(-1) 
Catch e 
'Error: ' + e 
End Try 

→ 'Error: Invalid input'
```