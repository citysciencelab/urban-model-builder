---
sidebar_position: 1
---
# Time Functions
### Seconds
```jsx title="Calculates the current time in seconds:"
Syntax:     Seconds()

Example:   Seconds()*1000 → Time in milliseconds
            Seconds()/60 → Converts seconds to minutes
            IfThenElse(Seconds() > 3600, 'Hour passed', 'Still running')
```
### Minutes
```jsx title="Calculates the current time in minutes:"
Syntax:     Minutes()

Example:   Minutes()*60 → Converts minutes to seconds
            IfThenElse(Minutes() > 30, 'More than 30 mins', 'Less than 30 mins')
```
### Hours
```jsx title="Calculates the current time in hours:"
Syntax:     Minutes()

Example:   Hours()*60 → Converts hours to minutes
            IfThenElse(Hours() >= 24, 'Day passed', 'Less than a day')
```
### Days
```jsx title="Calculates the current time in days:"
Syntax:     Days()

Example:   Days()*24 → Converts days to hours
            Days()/7 → Converts days to weeks
```
### Weeks
```jsx title="Calculates the current time in weeks:"
Syntax:     Weeks()

Example:   Weeks()*7 → Converts weeks to days
```
### Months
```jsx title="Calculates the current time in months:"
Syntax:     Months()

Example:   Months()/12 → Converts months to years
```
### Years
```jsx title="Calculates the current time in years:"
Syntax:     Years()

Example:   Years()*12 → Converts years to months
            Years()*365 → Converts years to days
```
### Time
```jsx title="Calculates the exact current time (including units):"
Syntax:     Time()

Example:   Time() - TimeStart() → Calculates the elapsed time since the start of the simulation
            TimeEnd() - Time() → Calculates the remaining time until the end of the simulation 
```
### TimeStart
```jsx title="Calculates the exact current time:"
Syntax:     TimeStart()

Example:   Time() - TimeStart() → Calculates the elapsed time since the start of the simulation
            TimeEnd() - Time() → Calculates the remaining time until the end of the simulation 
```
### TimeStep
```jsx title="Defines a time interval for time-based functions:"
Syntax:     TimeStep()

Example:   TimeLength() / TimeStep() → Number of time steps 
```
### TimeLength
```jsx title="Calculates the duration of a time period:"
Syntax:     TimeLength()

Example:   (Time() - TimeStart()) / TimeLength() → Calculates the elapsed time of the simulation as a percentage
```
### TimeEnd
```jsx title="Defines an endpoint of a time period:"
Syntax:     TimeEnd()

Example:   TimeStart() + TimeLength() = TimeEnd()
```
### Seasonal
```jsx title="Models seasonality using a sine wave:"
Syntax:     Seasonal(Peak=0)

Example:   Seasonal({9 Months}) * 0.5 + 1 → Peak in September
            Seasonal({3 Months}) + Seasonal({9 Months}) → Two seasonal peaks
```