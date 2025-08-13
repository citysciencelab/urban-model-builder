---
sidebar_position: 4
---

Currently, the Urban Model Builder offers **11 functional building blocks** for creating your System Dynamics or agent-based model.  
The following sections and tables explain each primitive’s specific functions and how to use them.

---

## Stock
A *Stock* represents an accumulating quantity or value that increases or decreases over time—think of water in a tank.  
In a dynamic system, a stock is a state-determining variable that stores the current value of a specific aspect of the system.  
It changes through *Inflows* and *Outflows* connected to it.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier for the primitive in the model |
| Description       | Text | Explains assumptions and important notes |
| Value*            | Numeric, [Value of a primitive], Functions | The initial value defines the system’s starting state. It can be constant or dynamic, calculated from functions or other variables. Ready-made functions are available for selection. Often aligned with historical data. Examples: `500`, `if time < 2020 then 0 else 1000`, `Stock = Area * PopulationDensity` |
| **Interface & Scenario** |
| Output Parameter  | Boolean | When selected, shows how the system state changes over time, revealing the effects of decisions, changes, or external factors |
| **Validation** |
| Unit              | Text (search), Dropdown | Ensures unit consistency in calculations |
| Min Constraint    | Boolean | Set a lower limit |
| Min Value         | Number | e.g., `0` to prevent negative values where they don’t make sense (e.g., negative population) |
| Max Constraint    | Boolean | Set an upper limit |
| Max Value         | Number | e.g., maximum population in a region |

*Required for calculation

---

## Flow
A *Flow* describes the rate at which a stock increases or decreases, directly affecting its change over time.  
It’s a temporary, time-dependent rate—active only when changing the stock—and doesn’t store values itself.  
Flows can depend on other variables and be static/absolute or variable/relative, as in inflows and outflows.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions and important notes |
| Rate*             | Numeric, [Value of a primitive], Functions | Determines the rate of increase or decrease. Can be constant (e.g., `1000 liters`) or dynamic (e.g., `Inflow = Rainfall * Area * InfiltrationFactor`) |
| **Interface & Scenario** |
| Output Parameter  | Boolean | Displays time-series changes for the system |
| **Validation** |
| Unit              | Text (search), Dropdown | Ensures units are compatible |
| Min Constraint    | Boolean | Set a lower limit |
| Min Value         | Number | Lower limit option |
| Max Constraint    | Boolean | Set an upper limit |
| Max Value         | Number | Upper limit option |

*Required for calculation

---

## OGC API Features
The [OGC API Features](https://ogcapi.ogc.org/features/) is a modern Open Geospatial Consortium (OGC) standard for delivering and querying geospatial data via web APIs.  
It enables easy integration into web applications and improves interoperability between systems.  
For example, the Urban Data Platform Hamburg provides a wide range of geospatial datasets via OGC API Features, making it an important data source for the Urban Model Builder.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions and notes |
| APIs*             | Text (search), Dropdown | Select the API (data source) relevant for your model |
| Collection*       | Text (search), Dropdown | Filters datasets by collection |
| Limits*           | Number | Sets the max number of results per request (`=100` → 100 results) |
| Offset            | Number | Starting point for results (`=200` → skip first 200 entries) |
| Selected Properties | Text (search), Dropdown | Filters the dataset by specific attributes |
| **Field Query** |
| Query Field       | Text (search), Dropdown | Data field (“Key”) for the filter |
| Operator          | Dropdown | Comparison operator |
| Query Value       | Text/Number | Value to compare against |
| Example API data:<br/>```[{"Region":"North","Temp":21.5},{"Region":"South","Temp":25.0},{"Region":"North","Temp":19.5}]```<br/>Query: Region = North → returns only North entries |
| **Advanced Query** |
| Filter (CQL2)     | Structured format: `<attribute> <operator> <value>` (e.g., Temp > 20°C) using CQL2 syntax for server-side filtering |
| **Data Transformation** |
| Key               | Text (search), Dropdown | Key in the JSON data |
| Value Field       | Text (search), Dropdown | Corresponding value |
| Preview           | Display | Shows structure of the queried data |

*Required for calculation

---

## Variable
A *Variable* is a changeable factor that doesn’t store values over time like a stock.  
It’s a calculated value that influences flows or other variables, helping simplify model structure and enabling modular design.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Value*            | Numeric, [Value of a primitive], Functions | Can be constant or dynamic, based on other variables or predefined functions |
| **Interface & Scenario** |
| Output Parameter  | Boolean | Displays time-series results |
| **Validation** |
| Unit              | Text (search), Dropdown | Ensures unit consistency |
| Min Constraint    | Boolean | Set a lower limit |
| Min Value         | Number | Lower limit option |
| Max Constraint    | Boolean | Set an upper limit |
| Max Value         | Number | Upper limit option |

*Required for calculation

---

## Converter
A *Converter* performs calculations or transformations from other variables or constants.  
It works like a helper variable—storing no values and recalculating at every simulation step.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Input             | Depends on linked primitives | Takes the value from another primitive (time dimension fixed by default) |
| **Mapping** |
| Input*            | x-value | Input value to trigger calculation |
| Output*           | y-value | Result, possibly taken from another primitive |
| Interpolation     | Dropdown (Linear, Discrete) | Determines how values between points are calculated |
| **Validation** |
| Unit              | Text (search), Dropdown | Ensures unit consistency |
| Min Constraint    | Boolean | Set a lower limit |
| Min Value         | Number | Lower limit option |
| Max Constraint    | Boolean | Set an upper limit |
| Max Value         | Number | Upper limit option |

*Required for calculation

---

## State
In agent-based modeling, a *State* represents the current condition or mode of an agent, influencing its behavior and reactions.  
Agents can only be in one state at a time, switching due to rules, probabilities, or environmental factors.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Active at Start*  | Numeric, [Value of a primitive], Functions | Initial condition |
| Duration          | Numeric, [Value of a primitive], Functions | How long the state remains active before switching |
| **Interface & Scenario** |
| Input             | Dropdown | Sets incoming connections |
| Output Parameter  | Boolean | Displays state changes over time |

*Required for calculation

---

## Transition
A *Transition* defines the change from one state to another in an agent, specifying the conditions under which it occurs.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Trigger*          | Dropdown (Condition, Probability, Timeout) | Defines when the change happens |
| Value*            | Numeric, [Value of a primitive], Functions | Used in the trigger condition |
| Recalculate       | Boolean | Whether to check the condition continuously |
| Repeat            | Boolean | Whether the transition can occur multiple times |
| **Validation** |
| Unit              | Text (search), Dropdown | Ensures unit consistency |
| Min Constraint    | Boolean | Set a lower limit |
| Min Value         | Number | Lower limit option |
| Max Constraint    | Boolean | Set an upper limit |
| Max Value         | Number | Upper limit option |

*Required for calculation

---

## Action
An *Action* is what an agent does during a state or transition—its operational behavior, such as movement, interaction, or resource use.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Action*           | Numeric, [Value of a primitive], Functions | Algorithm to execute |
| Trigger*          | Dropdown | Condition for execution |
| Value*            | Numeric, [Value of a primitive], Functions | Used in the trigger condition |
| Recalculate       | Boolean | Whether to check the trigger continuously |
| Repeat            | Boolean | Whether the action can be repeated |

*Required for calculation

---

## Agent
An *Agent* is an autonomous entity with its own states, attributes, and rules, able to interact with the environment and other agents.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| **Interface & Scenario** |
| Output Parameter  | Boolean | Displays agent-related results over time |

---

## Population
A *Population* is the complete set of agents of a specific type in a model, sharing attributes or behaviors and interacting in a common environment.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |
| Population Size*  | Number | Number of agents |
| Unit              | Text (search), Dropdown | |
| Geo Width*        | Number | Map width coordinate |
| Geo Height*       | Number | Map height coordinate |
| Geo Wrap Around   | Boolean | Whether agents reappear on the opposite side when leaving the map |
| Geo Placement Type* | Dropdown | How agents are initially placed |
| Geo Placement Function | Function | Rule for placement |
| Network Type      | Dropdown | Whether and how agents form networks |
| Network Function  | Function | Network rule |
| **Interface & Scenario** |
| Output Parameter  | Boolean | Displays results over time |

*Required for calculation

---

## Folder
A *Folder* is an organizational element that groups selected parts of a model, making it easier to manage.

| Input Field       | Type of Input | Purpose |
| ----------------- | ------------- | ------- |
| Name              | Text | Unique identifier |
| Description       | Text | Explains assumptions |

