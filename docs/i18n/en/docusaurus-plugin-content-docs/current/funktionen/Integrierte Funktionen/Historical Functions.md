---
sidebar_position: 3
---
# Historical Functions
### Delay
```jsx title="Applies an exponential delay:"
Syntax:     Delay(Primitive, Delay, Default)

Example:   Delay([Population], {10 Years}, 100000)
            Delay([Revenue], {7 Months}, 50000)
```
### Delay1
```jsx title="Applies a first-order exponential delay:"
Syntax:     Delay1(Value, Delay, Initial)

Example:   Delay1([Sales], {4 Year}, 200)
            Delay1([Pollution], {6 Months})
```
### Delay3
```jsx title="Applies a third-order exponential delay:"
Syntax:     Delay3(Value, Delay, Initial)

Example:   Delay3([Investment], {5 Years}, 100000)
            Delay3([Tech], 24)
```
### DelayN
```jsx title="Applies an Nth-order exponential delay:"
Syntax:     DelayN(Value, Delay, Order, Initial)

Example:   DelayN([Sales], {6 Months}, 4, 200)
            DelayN([CO2], {10 Years}, 1)
```
### Smooth
```jsx title="Applies exponential smoothing to a value to reduce short-term fluctuations and highlight trends:"
Syntax:     Smooth([Value], Length, Initial Value)

Example:   Smooth([Sales], {6 Months}, 1000)
            Smooth([Visitors], {14 Days})
            Smooth([Power Usage], {1 Year})
```
### SmoothN
```jsx title="Performs Nth-order exponential smoothing to better handle volatile data:"
Syntax:     SmoothN([Value], Length, Order, Initial Value)

Example:   SmoothN([Revenue], {1 Year}, 3, 100000)
            SmoothN([Noise Level], {30 Days}, 2)
            SmoothN([Air Quality Index], {12 Months}, 4)
```
### PastValues
```jsx title="Returns a list of all previous values of a primitive, optionally within a time window:"
Syntax:     PastValues([Primitive], Period)

Example:   Sum(PastValues([Profit]))
            Mean(PastValues([Visitors], {1 Month}))
            Min(PastValues([Humidity], {3 Days}))
```
### PastMax
```jsx title="Returns the highest value that a primitive had during the simulation or a specific period:"
Syntax:     PastMax([Primitive], Period)

Example:   PastMax([Sales], {1 Year})
            PastMax([Rainfall], {6 Months})
```
### PastMin
```jsx title="Returns the lowest value that a primitive had over time or within a specific window:"
Syntax:     PastMin([Primitive], Period)

Example:   PastMin([Energy Usage], {12 Months})
            PastMin([Budget], 10)
```
### PastMedian
```jsx title="Returns the median of the values of a primitive during the simulation or over a defined period:"
Syntax:     PastMedian([Primitive], Period)

Example:   PastMedian([Temperature], {3 Months})
            PastMedian([Response Time], {1 Week})
```
### PastMean
```jsx title="Calculates the average value of a primitive over time or within a period:"
Syntax:     PastMean([Primitive], Period)

Example:   PastMean([Page Views], {7 Days})
            PastMean([Fuel Cost], {1 Year})
```
### PastStdDev
```jsx title="Returns the standard deviation of the values of a primitive, indicating variability:"
Syntax:     PastStdDev([Primitive], Period)

Example:   PastStdDev([Delivery Time], {6 Months})
            PastStdDev([Inventory], {1 Quarter})
```
### PastCorrelation
```jsx title="Calculates the correlation between two primitives over the entire simulation or a specific time window:"
Syntax:     PastCorrelation([Primitive1], [Primitive2], Period)

Example:   PastCorrelation([Advertising], [Sales], {6 Months})
            PastCorrelation([Temperature], [AC Usage], {1 Year})
```
### Fix
```jsx title="Locks a value for a specific period or for the entire simulation:"
Syntax:     Fix(Value, Period)

Example:   Fix([CO2 Output], {1 Year})
            Fix([Interest Rate])
```
