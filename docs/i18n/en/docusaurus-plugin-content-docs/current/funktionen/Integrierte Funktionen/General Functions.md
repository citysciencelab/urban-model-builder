---
sidebar_position: 6
---
# General Functions
### IfThenElse
```jsx title="Tests a condition and returns one of two values:"
Syntax:     IfThenElse(condition, trueValue, falseValue)

Example:   IfThenElse(5 > 3, "Yes", "No") → "Yes"
            IfThenElse(Years() >= 10, 1, 0) → 1
            IfThenElse([Temp] > 100, "Hot", "Cool")
```
### Pulse
```jsx title="Generates a pulse at a specified time:"
Syntax:     Pulse(time, height=1, width=0, repeat=-1)

Example:   Pulse({5 Years}, 10) → 10 at year 5
            Pulse({2 Years}, 3, 1, {4 Years}) → Repeats every 4 years
            Pulse({0}, 1, 1) → Starts immediately, lasts 1 year
```
### Step
```jsx title="Jumps to a new value at a specific time:"
Syntax:     Step(start, height=1)

Example:   Step({3 Years}, 50) → 50 after 3 years
            Step({10 Years}) → Defaults to 1
            Step({0}, 100) → Starts at time 0
```
### Ramp
```jsx title="Rises linearly to a specified height:"
Syntax:     Ramp(start, finish, height=1)

Example:   Ramp({0}, {5}, 10) → From 0 to 10 over 5 years
            Ramp({2}, {6}) → Gradually increases to 1
            Ramp({4}, {8}, -2) → Decreases to -2
```
### Pause
```jsx title="Temporarily pauses the simulation:"
Syntax:     Pause()

Example:   IfThenElse(Years() = 10, Pause(), 0)
            IfThenElse([Value] > 100, Pause(), 0)
```
### Stop
```jsx title="Stops the simulation immediately:"
Syntax:     Stop()

Example:   IfThenElse([CO2] > 400, Stop(), 0)
            IfThenElse(Rand() < 0.05, Stop(), 0)
```
