---
sidebar_position: 7
---

# Running a Simulation

Simulations are a powerful tool for understanding complex systems, supporting decision-making, and exploring alternative outcomes. By stepping through modeled processes, you can reveal cause-and-effect relationships, timelines, and key parameters. Running simulations allows you to explore different scenarios, analyze uncertainties, and test hypotheses.  

## Simulation Results
In the simulation window, you’ll see all primitives you’ve defined as output parameters.  

Results can be visualized in two main ways:  

### Time Series  
- Displays how data changes over time in a line chart  
- Hover to see specific values  
- Toggle series on or off by clicking the legend  

### Scatter Plot  
- Shows agent behaviors and state changes on a grid  
- Hover to see specific values  
- Toggle series on or off by clicking the legend  

:::warning

A simulation can only run if at least one output parameter is defined **and** there are no logic or syntax errors in the model.  

:::

## Validation  
Even if your model runs without errors, you should still critically assess whether its behavior is realistic and represents the real-world system appropriately.  

:::tip Check

By default, stock values can mathematically drop below zero. For certain variables—like a population count—this wouldn’t make sense.  

:::

- Compare your results with real measurements or statistical data to check whether proportions and magnitudes seem reasonable  
- Consult subject matter experts to verify that the model and its outputs are plausible and technically sound  
- Use historical data to see if your model can reproduce known developments  
- Perform a sensitivity analysis to see how small parameter changes impact model behavior  

:::note Challenges  

Model validation is not always straightforward. You may lack reliable real-world data, your model might be intentionally abstract and difficult to compare, or you may be modeling social behavior—which can be especially tricky to define.  

:::
