---
sidebar_position: 5
---
# Vector Functions
### Range
```jsx title="Erstellt eine Zahlenfolge von Anfang bis Ende, mit optionaler Schrittweite:"
Syntax: Start:Step:End or Start:End

1:5 → {1, 2, 3, 4, 5}
10:-2:2 → {10, 8, 6, 4, 2}
```
### Length
```jsx title="Gibt die Anzahl der Elemente in einem Vektor zurück:"
Syntax: Vector.Length()

{1, 1, 2, 3}.Length() → 4
{ 'a', 'b', 'c' }.Length() → 3
```
### Select
```jsx title="Ruft Elemente aus einem Vektor mithilfe von Indizes, Namen oder Bedingungen ab:"
Syntax: Vector{Selector}

{4, 5, 6}{2} → 5
{ 'a': 1, 'b': 2 }{'b'} → 2
{10, 20, 30}{ vector > 15 } → {20, 30}
```
### Join
```jsx title="Kombiniert mehrere Elemente zu einem Vektor:"
Syntax: Join(Item1, Item2, ...)

Join(0, {1, 2}) → {0, 1, 2}
Join('a', {'b', 'c'}) → {'a', 'b', 'c'}
```
### Flatten
```jsx title="Entfernt die Verschachtelung und flacht einen Vektor auf eine Ebene ab:"
Syntax: Vector.Flatten()

{ {1, 2}, {3} }.Flatten() → {1, 2, 3}
{ { {1} } }.Flatten() → {1}
```
### Unique
```jsx title="Entfernt Duplikate aus einem Vektor:"
Syntax: Vector.Unique()

{1, 2, 2, 3}.Unique() → {1, 2, 3}
{'a', 'a', 'b'}.Unique() → {'a', 'b'}
```
### Union
```jsx title="Fügt zwei Vektoren zusammen und entfernt Duplikate:"
Syntax: Vector1.Union(Vector2)

{1, 2}.Union({2, 3}) → {1, 2, 3}
{ 'x' }.Union({ 'y', 'z' }) → {'x', 'y', 'z'}
```
### Intersection
```jsx title="Gibt gemeinsame Elemente aus beiden Vektoren zurück:"
Syntax: Vector1.Intersection(Vector2)

{1, 2}.Intersection({2, 3}) → {2}
{'a', 'b'}.Intersection({'b', 'c'}) → {'b'}
```
### Difference
```jsx title="Gibt für jeden Vektor eindeutige Elemente zurück:"
Syntax: Vector1.Difference(Vector2)

{1, 2}.Difference({2, 3}) → {1, 3}
{'a', 'b'}.Difference({'b', 'c'}) → {'a', 'c'}
```
### Sort
```jsx title="Sortiert einen Vektor in aufsteigender Reihenfolge:"
Syntax: Vector.Sort()

{4, 1, 3}.Sort() → {1, 3, 4}
{8, -2, 0}.Sort() → {-2, 0, 8}
```
### Reverse
```jsx title="Kehrt die Reihenfolge der Elemente um:"
Syntax: Vector.Reverse()

{4, 5, 6}.Reverse() → {6, 5, 4}
{'x', 'y', 'z'}.Reverse() → {'z', 'y', 'x'}
{true, false}.Reverse() → {false, true}
```
### Sample
```jsx title="Wählt zufällig Elemente aus einem Vektor aus:"
Syntax: Vector.Sample(size, allowRepeats=False)

{10, 20, 30}.Sample(2) → {30, 10}
{1, 2, 3}.Sample(2, true) → {2, 2}
{1, 2, 3, 4}.Sample(3) → e.g., {1, 3, 4}
```
### IndexOf
```jsx title="Findet die Position eines Elements:"
Syntax: Vector.IndexOf(element)

{5, 10, 15}.IndexOf(10) → 2
{'red', 'blue'}.IndexOf('green') → 0
{7, 8, 7}.IndexOf(7) → 1
```
### Contains
```jsx title="Überprüft, ob ein Vektor einen Wert enthält:"
Syntax: Vector.Contains(element)

{100, 200}.Contains(100) → true
{1, 2, 3}.Contains(0) → false
{}.Contains(1) → false
```
### Repeat
```jsx title="Erzeugt einen Vektor durch Wiederholung eines Ausdrucks:"
Syntax: Repeat(expression, times)

Repeat(x+1, 3) → {2, 3, 4}
Repeat(x*2, 4) → {2, 4, 6, 8}
Repeat('Item ' + key, {'id1', 'id2'}) → {'id1': 'Item id1', 'id2': 'Item id2'}
```
### Map
```jsx title="Wendet eine Funktion auf jedes Vektorelement an:"
Syntax: Vector.Map(function)

{1, 2, 3}.Map(x + 1) → {2, 3, 4}
{'a': 1, 'b': 2}.Map(x*10) → {'a': 10, 'b': 20}
{'x': 5}.Map(key + '=' + x) → {'x': 'x=5'}
```
### Filter
```jsx title="Gibt Elemente zurück, die einer Bedingung entsprechen:"
Syntax: Vector.Filter(condition)

{1, 2, 3, 4}.Filter(x > 2) → {3, 4}
{'a': 5, 'b': 0}.Filter(x > 0) → {'a': 5}
{10, 15, 20}.Filter(x mod 10 == 0) → {10, 20}
```
### Keys
```jsx title="Ruft die Schlüsselwerte aus einem benannten Vektor ab:"
Syntax: Vector.Keys()

{'x': 1, 'y': 2}.Keys() → {'x', 'y'}
{'temp': 30}.Keys() → {'temp'}
```
### Values
```jsx title="Ruft die Werte aus einem Vektor ab:"
Syntax: Vector.Values()

{'a': 10, 'b': 20}.Values() → {10, 20}
{1, 2, 3}.Values() → {1, 2, 3}
```
### Lookup
```jsx title="Findet ein Ergebnis basierend auf der Eingabe und interpoliert bei Bedarf:"
Syntax: Lookup(value, valuesVector, resultsVector)

Lookup(3, {1, 5}, {10, 50}) → 30
Lookup(2, {2, 4}, {20, 40}) → 20
Lookup(6, {5, 10}, {100, 200}) → 120
```
### ConverterTable
```jsx title="Gibt x/y-Wertpaare von einem Konverter zurück:"
Syntax: ConverterTable([Converter])

ConverterTable([Speed]) → { {x: 0, y: 0}, {x: 1, y: 100} }
ConverterTable([Temp]){*, "x"} → {0, 1}
ConverterTable([Temp]){*, "y"} → {0, 100}
```