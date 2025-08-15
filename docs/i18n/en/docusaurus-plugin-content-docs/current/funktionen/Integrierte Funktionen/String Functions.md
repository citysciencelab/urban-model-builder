---
sidebar_position: 7
---
# String Functions
### Length
```jsx title="Returns the number of characters in a string:"
Syntax: String.Length()

"abc".Length() → 3
" ".Length() → 3
"Hello, world!".Length() → 13
```
### Range
```jsx title="Extracts parts of a string:"
Syntax: String.Range(positions)

"abcdef".Range(2:4) → "bcd"
"Data123".Range({1, 5, 6}) → "Da2"
"TestString".Range(1:4) → "Test"
```
### Split
```jsx title="Splits a string using delimiters:"
Syntax: String.Split(delimiter)

"a,b,c".Split(",") → {"a", "b", "c"}
"2025/07/11".Split("/") → {"2025", "07", "11"}
"word1 word2".Split(" ") → {"word1", "word2"}
```
### IndexOf
```jsx title="Finds the starting position of a substring:"
Syntax: String.IndexOf(substring)

"abcabc".IndexOf("b") → 2
"Example".IndexOf("z") → 0
"UrbanModelBuilder".IndexOf("Builder") → 11
```
### Contains
```jsx title="Checks if a string contains a substring:"
Syntax: String.Contains(substring)

"hello".Contains("ell") → true
"abc123".Contains("123") → true
```
### UpperCase
```jsx title="Converts all letters to uppercase:"
Syntax: String.UpperCase()

"hello".UpperCase() → "HELLO"
"a1b2!".UpperCase() → "A1B2!"
```
### LowerCase
```jsx title="Wandelt alle Buchstaben in Kleinbuchstaben um:"
Syntax:     String.LowerCase()

Beispiel:   "HELLO".LowerCase() → "hello"
            "Text123!".LowerCase() → "text123!"
```
### Join
```jsx title="Kombiniert Vektorelemente zu einer Zeichenfolge:"
Syntax:     Vector.Join(separator)

Beispiel:   {"a", "b", "c"}.Join("-") → "a-b-c"
            {2025, 7, 11}.Join("/") → "2025/7/11"
            {"red", "blue"}.Join(" & ") → "red & blue"
```
### Trim
```jsx title="Entfernt Leerzeichen an beiden Enden:"
Syntax:     String.Trim()

Beispiel:   " text ".Trim() → "text"
            " \nTest\t".Trim() → "Test"
```
### Parse
```jsx title="Wandelt eine numerische Zeichenfolge in eine Zahl um:"
Syntax:      String.Parse()

Beispiel:   "42".Parse() → 42
            "3.14".Parse() → 3.14
            "-100".Parse() → -100
```