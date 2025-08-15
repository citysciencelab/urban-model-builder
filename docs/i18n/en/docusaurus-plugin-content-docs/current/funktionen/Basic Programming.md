---
sidebar_position: 2
---

### Defining Variables
```jsx title="Use the operator <- to assign specific values to variables:"
x <- 5
y <- x + 3  # y = 8
x <- x * 2  # x = 10
```
:::tip Block-Scoping

Variables declared within a block are not accessible outside the block.

:::

### Comments
```jsx title="Use comments to make the code more readable. These are ignored during execution:"
# This is a comment 
// Also a comment
1 + /* this is ignored */ 2  # = 3
```
### Defining Functions
```jsx title="Define functions in short or long form:"
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
```jsx title="Use conditional logic:"
if age > 18 then
  "Adult"
else if age > 12 then
  "Teen"
else
  "Child"
end if
```
### While Loops
```jsx title="The code is repeated as long as a condition is met:"
n <- 1
while n < 100
  n <- n * 2
end loop
# n = 128
```
### For Loops
```jsx title="The code is executed a fixed number of times:"
sum <- 0
for i from 1 to 5
  sum <- sum + i
end loop
# sum = 15
```
```jsx title="With custom steps:"
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
```jsx title="The last expression in a block is returned unless 'return' is explicitly used:"
return 2 + 2  # = 4
```
### Error Handling
```jsx title="Use Try-Catch to handle errors safely:"
Try
  result <- someRiskyFunction()
Catch err
  result <- "Error occurred"
End Try
```
```jsx title="Throw custom errors:"
if x.length() = 0 then
  throw "x must not be empty"
end if
```
### Destructuring Assignment
```jsx title="Quickly assign elements from a vector:"
a, b <- {100, 200}
# a = 100, b = 200
```
## Functional Programming

### First-Class Functions
```jsx title="Assign functions to variables:"
myFunc <- mean
myFunc(4, 6, 8)  # = 6
```
```jsx title="Use the Map function with a function vector to get specific values from a dataset:"
{Min, Max}.Map(x(5, 8, 2))  # = {2, 8}
```
### Anonymous Functions
```jsx title="Define functions without names:"
f <- function(x, y) sqrt(x^2 + y^2)
f(6, 8)  # = 10
```
```jsx title="Useful for functions like Map() and Filter():"
{1, 2, 3}.map(function(n) n^2)  # = {1, 4, 9}
```
### Closures
```jsx title="Useful for functions like Map() and Filter():"
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

### Defining Objects
```jsx title="Objects are named vectors:"
Car <- {
  make: "Toyota",
  year: 2020
}
Car.make  # = "Toyota"
```
```jsx title="Add behaviors to functions:"
Car.fullInfo <- function()
  self.make + " (" + self.year + ")"
end function
```
### Inheritance
```jsx title="Create objects that inherit from others using 'new':"
Truck <- new Car
Truck.make <- "Ford"
Truck.year <- 2022
```
### Constructors
```jsx title="Add behaviors to functions:"
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
