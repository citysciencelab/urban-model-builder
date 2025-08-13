# Scenario Settings

Scenarios allow you to explore different “what-if” situations in a model without having to create multiple copies or versions.  
This makes it easy to simulate and compare alternative future developments.

:::note Scenario
A scenario is a defined variation of certain model assumptions and input values.  
It can be used, for example, to analyze:
- How sensitive the model is to changes
- Which developments are possible under different conditions
- Which assumptions are robust or risky
:::

The scenario settings let you flexibly change specific primitive parameters in various ways, enabling you to quickly and easily test a wide range of scenarios.  

If, in a primitive’s settings panel, you select a variable input parameter under the **Interface & Scenario** tab, it will appear in the scenario settings. You can then define its input values for the scenario.  
The following input types are available:

| Field | Input Type | Purpose |
| ----- | ---------- | ------- |
| **No Parameters** | – | – |
| **Boolean Value** | On/Off | Toggle |
| **Slider** | Manual slider | Flexible input values |
| Min | Number | Start of range |
| Steps | Number | Increment between values |
| Max | Number | End of range |
| **Value Helper** | Dropdown | Select from predefined options |
| **Value** | Number | Input for calculation |
| **Label** | Number, Text | Description |

:::note Tip
You can only define variable input parameters for the following primitives:
- **Variable**
- **State**
:::

:::tip
If you want to define a variable input parameter for a **Stock** or **Flow** primitive, first create a **Variable** primitive and then connect it to the Stock or Flow.
:::
