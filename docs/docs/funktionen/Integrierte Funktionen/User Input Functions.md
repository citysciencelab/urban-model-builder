---
sidebar_position: 9
---
# User Input Functions
### Alert
```jsx title="Zeigt ein Meldungsfeld an:"
Syntax: Alert("message")

Alert("Simulation started")
```
### Prompt
```jsx title="Ruft Benutzereingaben ab:"
Syntax: Prompt("message", default)

age <- Prompt("Enter age", 18).Parse()
```
### Confirm
```jsx title="Erhält eine Ja/Nein-Bestätigung:"
Syntax: Confirm("message")

runAdvanced <- Confirm("Enable advanced mode?")
```