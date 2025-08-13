# Model Settings

The model settings define the core parameters and metadata of the entire model — including the model name, description, simulation time frame, and functions that apply globally across the model.

| Field | Input Type | Purpose |
| ----- | ---------- | ------- |
| Start | Integer | Start time in the chosen time unit |
| Duration | Integer | Time span over which the simulation should run |
| Interval | Numeric value | Time steps within the simulation period |
| Unit | Numeric value (dropdown) | Defines the time dimension |
| Algorithm | Euler or RK4 | Calculation method, depending on the complexity of the model |
| Globals & Macros | Functions | Function definitions that apply to the entire model |

---

# Calculation Methods

The Urban Model Builder offers two basic calculation methods, selectable in the global model settings:  
the **Euler method** (Euler) and the **Runge–Kutta method** (RK4).  
Below is a brief explanation of both algorithms.

---

#### Euler Method

A simple numerical method for solving differential equations.  
In System Dynamics models, it is used to simulate the time evolution of dynamic systems.  
The simple Euler method calculates the future value of a variable *x* based on its current value and its rate of change:

$$
x(t + \Delta t) = x(t) + \Delta t \cdot \frac{dx}{dt}(t)
$$

Where:  
$$
\begin{aligned}
x(t) & : \text{Current value of the state variable (Stock)} \\
\Delta t & : \text{Time step} \\
\frac{dx}{dt}(t) & : \text{Rate of change}
\end{aligned}
$$

---

#### Runge–Kutta Method

A more precise numerical method for solving differential equations than Euler’s method.  
While the Euler method uses the current rate of change to determine the next state,  
the fourth-order Runge–Kutta method (RK4) takes multiple estimates of the rate of change within a single time step and combines them to produce a more accurate prediction.

This method is especially recommended for complex models or simulations over longer time horizons.
