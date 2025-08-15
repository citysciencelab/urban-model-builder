---
sidebar_position: 4
---
# Agent Functions

### FindAll
```jsx title="Returns all agents in a population. Useful for mass actions or analyses:"
Syntax:     [Population].FindAll()

Example:   [People].FindAll().Count()
            Mean([Trees].FindAll().Map(x.Value([Height])))
```
### FindState
```jsx title="Returns all agents in a specific state:"
Syntax:     [Population].FindState([State])

Example:   [Cells].FindState([Infected])
            [Students].FindState([Studying])
```
### FindNotState
```jsx title="Returns agents that are not in a specific state:"
Syntax:     [Population].FindNotState([State])

Example:   [Patients].FindNotState([Recovered])
            Mean([Trees].FindNotState([Burned]).Map(x.Value([Height])))
```
### FindIndex
```jsx title="Returns the agent at a specific index (starting from 1):"
Syntax:     [Population].FindIndex(Index)

Example:   [Fish].FindIndex(1)
            [Books].FindIndex(5)
```
### FindNearby
```jsx title="Returns agents within a specified distance to a target:"
Syntax:     [Population].FindNearby(Target, Distance)

Example:   [Trees].FindNearby(PollutedArea, 50)
            [Fish].FindNearby(FoodSource, 20)
```
### FindNearest
```jsx title="Returns the nearest agent(s) to a target:"
Syntax:     [Population].FindNearest(Target, Count=1)

Example:   [Customers].FindNearest(Store)
            [EmergencyVehicles].FindNearest(AccidentSite, 5)
```
### FindFurthest
```jsx title="Returns the agent(s) furthest from a target:"
Syntax:     [Population].FindFurthest(Target, Count=1)

Example:   [FireStations].FindFurthest(Fire, 3)
            [RetailStores].FindFurthest(Mall)
```
### Value
```jsx title="Gibt einen Vektor von Werten eines angegebenen Attributs zurück:"
Syntax:     [Population].Value([Primitive])

Beispiel:   [Employees].Value([Salary]).Max()
            [Cars].Value([Mileage]).Min()
```
### SetValue
```jsx title="Setzt ein Attribut für alle oder bestimmte Agenten auf einen bestimmten Wert:"
Syntax:     [Population].SetValue([Primitive], Value)

Beispiel:   car.SetValue([FuelLevel], 100)
            [University].SetValue([Smoker], false)
```
### Location
```jsx title="Gibt die {x, y}-Koordinaten eines Agenten zurück:"
Syntax:     [Agent].Location()

Beispiel:   Self.Location().x
            Self.Location().y
            Predator.Location().Distance(Prey.Location())
```
### SetLocation
```jsx title="Verschiebt einen Agenten an einen neuen {x, y}-Standort. Nützlich für die Simulation einer Neupositionierung:"
Syntax:     [Agent].SetLocation(New Location)

Beispiel:   Student.SetLocation({x: 60, y: 40})
            Bird.SetLocation(Bird.Location() + {x: -10, y: 0})
            Taxi.SetLocation(Customer.Location())
```
### Index
```jsx title="Gibt den 1-basierten Index des Agenten in seiner Population zurück:"
Syntax:     [Agent].Index()

Beispiel:   Self.Index()
```
### Distance
```jsx title="Berechnet die euklidische Distanz zwischen zwei Punkten oder Agenten:"
Syntax:     Distance(Location One, Location Two)

Beispiel:   Distance({x: 10, y: 5}, {x: 20, y: 15})
            Distance(patient, hospital)
```
### Move
```jsx title="Bewegt den Agenten um einen Delta-Vektor {x, y}:"
Syntax:     [Agent].Move({x, y})

Beispiel:   Self.Move({x: Rand(-1, 1), y: Rand(-1, 1)})
            Car.Move({x: 10, y: 0})
```
### MoveTowards
```jsx title="Bewegt den Agenten in Richtung eines Zielorts oder Agenten um eine angegebene Distanz:"
Syntax:     [Agent].MoveTowards(Target, Distance)

Beispiel:   Self.MoveTowards({0, 100}, 10)
            Self.MoveTowards([Food Sources].FindNearest(Self), 5)
```
### Connected
```jsx title="Gibt alle Agenten zurück, die in einem Netzwerk direkt mit dem Agenten verbunden sind:"
Syntax:     [Agent].Connected()

Beispiel:   Self.Connected().Length()
```
### Connect
```jsx title="Erstellt eine Netzwerkverbindung zwischen Agenten mit optionaler Gewichtung:"
Syntax:     [Agent 1].Connect([Agent 2], Weight)

Beispiel:   Self.Connect([Population].FindNearest(Self), 5)
            Self.Connect(Self.FindNearest([Food Source]), 10)
```
### Unconnect
```jsx title="Entfernt die Netzwerkverbindung zwischen Agenten:"
Syntax:     [Agent 1].Unconnect([Agent 2])

Beispiel:   Self.Unconnect(SpecificAgent)
```
### ConnectionWeight
```jsx title="Gibt das Gewicht der Verbindung zwischen zwei Agenten zurück:"
Syntax:     [Agent 1].ConnectionWeight([Agent 2])

Beispiel:   Self.ConnectionWeight(agent)
```
### SetConnectionWeight
```jsx title="Legt die Verbindungsgewichtung zwischen zwei Agenten fest:"
Syntax:     [Agent 1].SetConnectionWeight([Agent 2], Weight)

Beispiel:   Self.SetConnectionWeight(BestFriend, 100)
            Self.SetConnectionWeight(Other, 10)
```
### Population Size
```jsx title="Gibt die Gesamtzahl der Agenten in einer Population zurück:"
Syntax:     [Agent Population].PopulationSize()

Beispiel:   [Fish].PopulationSize()
            IfThenElse([Rabbits].PopulationSize() > 1000, 'Overpopulated', 'Stable')
```
### Add
```jsx title="Fügt der Population einen neuen Agenten hinzu, klont optional einen vorhandenen:"
Syntax:     [Agent Population].Add(Base Agent=Initial Agent)

Beispiel:   [Trees].Add(Tree)
            Repeat([Company].Add(NewHire), 10)
```
### Remove
```jsx title="Entfernt einen Agenten aus der Bevölkerung:"
Syntax:     [Agent].Remove()

Beispiel:   prey.Remove()
            [University].FindState([Smoker]).Map(x.Remove())
```
### Width
```jsx title="Gibt die Breite der geografischen Region des Agenten zurück:"
Syntax:     Width(Agent)

Beispiel:   Width(Self)
            Width(Car)
```
### Height
```jsx title="Gibt die Höhe der geografischen Region des Agenten zurück:"
Syntax:     Height(Agent)

Beispiel:   Height(Self)
            Height(Store)
```