---
sidebar_position: 5
---
# Vector Functions
### Range
```jsx title="Creates a sequence of numbers from start to end, with an optional step size:"
Syntax:     Start:Step:End or Start:End

Example:   1:5 → {1, 2, 3, 4, 5}
            10:-2:2 → {10, 8, 6, 4, 2}
```
### Length
```jsx title="Returns the number of elements in a vector:"
Syntax:     Vector.Length()

Example:   {1, 1, 2, 3}.Length() → 4
            { 'a', 'b', 'c' }.Length() → 3
```
### Select
```jsx title="Retrieves elements from a vector using indices, names, or conditions:"
Syntax:     Vector{Selector}

Example:   {4, 5, 6}{2} → 5
            { 'a': 1, 'b': 2 }{'b'} → 2
            {10, 20, 30}{ vector > 15 } → {20, 30}
```
### Join
```jsx title="Combines multiple items into a vector:"
Syntax:     Join(Item1, Item2, ...)

Example:   Join(0, {1, 2}) → {0, 1, 2}
Example:   Join('a', {'b', 'c'}) → {'a', 'b', 'c'}
```
### Flatten
```jsx title="Removes nesting and flattens a vector to a single level:"
Syntax:     Vector.Flatten()

Example:   { {1, 2}, {3} }.Flatten() → {1, 2, 3}
            { { {1} } }.Flatten() → {1}
```
### Unique
```jsx title="Removes duplicates from a vector:"
Syntax:     Vector.Unique()

Example:   {1, 2, 2, 3}.Unique() → {1, 2, 3}
            {'a', 'a', 'b'}.Unique() → {'a', 'b'}
```
### Union
```jsx title="Combines two vectors and removes duplicates:"
Syntax:     Vector1.Union(Vector2)

Example:   {1, 2}.Union({2, 3}) → {1, 2, 3}
            { 'x' }.Union({ 'y', 'z' }) → {'x', 'y', 'z'}
```
### Intersection
```jsx title="Returns common elements from both vectors:"
Syntax:     Vector1.Intersection(Vector2)

Example:   {1, 2}.Intersection({2, 3}) → {2}
            {'a', 'b'}.Intersection({'b', 'c'}) → {'b'}
```
### Difference
```jsx title="Returns elements unique to each vector:"
Syntax:     Vector1.Difference(Vector2)

Example:   {1, 2}.Difference({2, 3}) → {1, 3}
            {'a', 'b'}.Difference({'b', 'c'}) → {'a', 'c'}
```
### Sort
```jsx title="Sorts a vector in ascending order:"
Syntax:     Vector.Sort()

Example:   {4, 1, 3}.Sort() → {1, 3, 4}
            {8, -2, 0}.Sort() → {-2, 0, 8}
```
### Reverse
```jsx title="Reverses the order of elements:"
Syntax:     Vector.Reverse()

Example:   {4, 5, 6}.Reverse() → {6, 5, 4}
            {'x', 'y', 'z'}.Reverse() → {'z', 'y', 'x'}
            {true, false}.Reverse() → {false, true}
```
### Sample
```jsx title="Randomly selects elements from a vector:"
Syntax:     Vector.Sample(size, allowRepeats=False)

Example:   {10, 20, 30}.Sample(2) → {30, 10}
            {1, 2, 3}.Sample(2, true) → {2, 2}
            {1, 2, 3, 4}.Sample(3) → e.g., {1, 3, 4}
```
### IndexOf
```jsx title="Finds the position of an element:"
Syntax:     Vector.IndexOf(element)

Example:   {5, 10, 15}.IndexOf(10) → 2
            {'red', 'blue'}.IndexOf('green') → 0
            {7, 8, 7}.IndexOf(7) → 1
```
### Contains
```jsx title="Checks if a vector contains a value:"
Syntax:     Vector.Contains(element)

Example:   {100, 200}.Contains(100) → true
            {1, 2, 3}.Contains(0) → false
            {}.Contains(1) → false
```
### Repeat
```jsx title="Generates a vector by repeating an expression:"
Syntax:     Repeat(expression, times)

Example:   Repeat(x+1, 3) → {2, 3, 4}
            Repeat(x*2, 4) → {2, 4, 6, 8}
            Repeat('Item ' + key, {'id1', 'id2'}) → {'id1': 'Item id1', 'id2': 'Item id2'}
```
### Map
```jsx title="Applies a function to each element of the vector:"
Syntax:     Vector.Map(function)

Example:   {1, 2, 3}.Map(x + 1) → {2, 3, 4}
            {'a': 1, 'b': 2}.Map(x*10) → {'a': 10, 'b': 20}
            {'x': 5}.Map(key + '=' + x) → {'x': 'x=5'}
```
### Filter
```jsx title="Returns elements that meet a condition:"
Syntax:     Vector.Filter(condition)

Example:   {1, 2, 3, 4}.Filter(x > 2) → {3, 4}
            {'a': 5, 'b': 0}.Filter(x > 0) → {'a': 5}
            {10, 15, 20}.Filter(x mod 10 == 0) → {10, 20}
```
### Keys
```jsx title="Retrieves the key values from a named vector:"
Syntax:     Vector.Keys()

Example:   {'x': 1, 'y': 2}.Keys() → {'x', 'y'}
            {'temp': 30}.Keys() → {'temp'}
```
### Values
```jsx title="Retrieves the values from a vector:"
Syntax:     Vector.Values()

Example:   {'a': 10, 'b': 20}.Values() → {10, 20}
            {1, 2, 3}.Values() → {1, 2, 3}
```
### Lookup
```jsx title="Finds a result based on input and interpolates if necessary:"
Syntax:     Lookup(value, valuesVector, resultsVector)

Example:   Lookup(3, {1, 5}, {10, 50}) → 30
            Lookup(2, {2, 4}, {20, 40}) → 20
            Lookup(6, {5, 10}, {100, 200}) → 120
```
### ConverterTable
```jsx title="Returns x/y value pairs from a converter:"
Syntax:     ConverterTable([Converter])

Example:   ConverterTable([Speed]) → { {x: 0, y: 0}, {x: 1, y: 100} }
            ConverterTable([Temp]){*, "x"} → {0, 1}
            ConverterTable([Temp]){*, "y"} → {0, 100}
```