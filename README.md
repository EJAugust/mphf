# MPHF - Minimal Perfect Hash Function
This project is a small library that takes some structured model data and creates a minimal perfect hash function over every possible model state.

MPHF can output either an integer or a URL-safe base64 hash string of that integer. This represetation achieves the information-theoretic lower bound for storage size of any correctly formatted model.

## Entropy-Perfect Encoding

Every possible model state is assigned a BigInt value and a unique variable-length base64 hash, derived from a bijective minimal perfect hash function. This makes hashes as compact and expressive as is mathematically possible.

MPHF provides a compression solution that is uniquely built for a given data model and safely hashes and unhashes every state in that model.

All MPHF hashes are inherently integers (implemented using the `bigint` primative in JavaScript). Because the hash function has no gaps, no duplicates, and no collisions, it is not possible to achieve a smaller lossless hash of a given data model than this.

If there are 10,000,000,000,000,000,000,000,000,000,000,000,000,000,000 possible ways to populate your application's data model, then MPHF produces a hash integer that is always between 0 and 9,999,999,999,999,999,999,999,999,999,999,999,999,999,999. MPHF can then instantly hash any instance of the data model and instantly recover one from any integer in that range.

An example use-case of this is embedding rich state information in places with limited space, such as a URL or DNS TXT record, without the syntactical overhead of query parameters,JSON objects, or delimiters.

```
https://www.ejaugust.com/0.126.3/4lb5kAsH_R0Dv_UHg/
```

## Installation
Install MPHF via `npm`:
```bash
npm install mphf
```
Import MPHF classes in JavaScript:
```js
import { Part, Choice, Tuple } from 'mphf'
```
OR
```js
const { Part, Choice, Tuple } = require('mphf')
```
## Usage
### Parts
Use the `Part` class to create a single part with no mutability.
```js
const apple = new Part("apple")
```

Part is the base type. It supports one argument, `key`, which is used to uniquely identify the part in its parent domain (see Choice and Tuple, below).

It represents a model element that does not change. As such, it has a cardinality of 1.
```js
console.log(apple.cardinality) // 1n
```
This cardinality represents the number of states that the part can be in. All part cardinalities are stored as a BigInt primative.

Part does not have the `hash()` and `unhash()` methods. Instead, it is used to assemble larger models which can then be hashed and unhashed.

All other types in MPHF extend this base type.
### Choices
To model a choice between two or more options, use the `Choice` class. It has two arguments: `key` and `subparts`.
```js
const apple = new Part("apple")
const orange = new Part("orange")
const pear = new Part("pear")

const fruit = new Choice("fruit", [apple, orange, pear])

console.log(fruit.cardinality) // 3n
console.log(fruit.apple.cardinality) // 1n
```
If you provide a string instead of a part instance, a part instance will be created automatically.
```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])

console.log(fruit.cardinality) // 3n
console.log(fruit.apple instanceof Part) // true
```
When there are strings in the `subparts` array, the constructor process mutates the original array to replace each string with a part instance.
```js
const array = ["apple", "orange", "pear"]
console.log(typeof array[0] === 'string') // true

const fruit = new Choice("fruit")
console.log(typeof array[0] === 'string') // false
console.log(array[0] instaceof Part) // true
```
Each subpart has an index corresponding to its location in the `subpart` array.
```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])

console.log(fruit.apple.index) // 0
console.log(fruit[1] === fruit.orange) // true
```
For any subpart of a `Choice` which has a cardinality of 1, the `hash()` function may be used with its `key` in order to obtain a hash computed from the integer `n` in the range $`0 < n < k`$, where `k` is the cardinality of the `Choice`. Hashes have a variable length. The first hash is the empty string.

```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])

console.log(fruit.hash("apple")) // ""
console.log(fruit.hash("orange")) // "1"
console.log(fruit.hash("pear")) // "2"
```
Likewise, when a given hash selects a subpart with a cardinality of 1, the `unhash()` function returns the corresponding key.

```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])

console.log(fruit.unhash("")) // "apple"
console.log(fruit.unhash("1")) // "orange"
console.log(fruit.unhash("2")) // "pear"
```
An out-of-range hash will throw an error.
```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])

console.log(fruit.unhash("3")) // error
```
When a subpart of a `Choice` has a cardinality greater than 1, it means that the given subpart can have model data of its own.

#### Choice Nesting
In this case, instead of a `key` string, the `hash()` method expects an object with a single key corresponding to a subpart key and a value corresponding to a model which will be passed to the subpart's `hash()` method.

```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])
const vegetable = new Choice("vegetable", ["cabbage", "broccoli", "kale"])

const food = new Choice("snack", [fruit, vegetable])

console.log(food.cardinality) // "6"

console.log(food.hash("apple")) // error

console.log(food.hash({ fruit: "apple" })) // ""
console.log(food.hash({ vegetable: "kale" })) // "5"
```
The same applies to the output of the `unhash()` method.

```js
const fruit = new Choice("fruit", ["apple", "orange", "pear"])
const vegetable = new Choice("vegetable", ["cabbage", "broccoli", "kale"])

const food = new Choice("snack", [fruit, vegetable])

console.log(food.unhash("")) // { fruit: "apple" }
console.log(food.unhash("5")) // { vegetable: "kale" }
```
### Tuples
To define a set of independantly mutable variables, use the `Tuple` class.
```js
const outfit = new Tuple("outfit", [
 new Choice("top", [
  "t-shirt",
  "button-down",
  "tank-top"
  ]),
 new Choice("bottom", [
  "shorts",
  "skirt",
  "pants"
  ])
])

console.log(outfit.cardinality) // 9n

console.log(outfit.hash({
 top: "t-shirt",
 bottom: "shorts"
}))
// ""

console.log(outfit.hash({
 top: "button-down",
 bottom: "pants"
})) // "5"

```
### Tuple Nesting
Like `Choice`, a `Tuple` may be nested within a `Choice` or another `Tuple`:

```js
const outfit = new Tuple("outfit", [
 new Choice("top", [
  "t-shirt",
  "button-down",
  "tank-top"
 ]),
 new Choice("bottom", [
  "shorts",
  "skirt",
  "pants"
 ]),
 new Tuple("shoes", [
  new Choice("color", [
   "magenta",
   "auburn",
   "green"
  ]),
  new Choice("elastic-laces", [
   "yes",
   "no"
  ]),
  new Choice("lace-color", [
   "red",
   "green",
   "blue"
  ])
 ]),
 new Choice("socks", [
  "tube",
  "mid-calf",
  "ankle",
  "none"
 ])
])

console.log(outfit.cardinality) // 648n

console.log(outfit.hash({
 top: "tank-top",
 bottom: "shorts",
 shoes: {
  color: "magenta",
  "elastic-laces": "no",
  "lace-color": "red"
 },
 socks: "mid-calf"
}))
// 6Z

console.log(outfit.unhash("6Z"))
/*
{
 top: 'tank-top',
 bottom: 'shorts',
 shoes: { color: 'magenta', 'elastic-laces': 'no', 'lace-color': 'red' },
 socks: 'mid-calf'
}
*/

console.log(outfit.unhash("a7"))
/*
{
  top: 'tank-top',
  bottom: 'pants',
  shoes: { color: 'green', 'elastic-laces': 'no', 'lace-color': 'blue' },
  socks: 'none'
}
*/

```
### Acquiring Integer Hashes
In addition to string hashes, parts can hash and unhash a BigInt primative value instead, using the `format` argument, whose default value is `"string"`.

```js
console.log(outfit.hash({
 top: "tank-top",
 bottom: "shorts",
 shoes: {
  color: "magenta",
  "elastic-laces": "no",
  "lace-color": "red"
 },
 socks: "mid-calf"
}, "bigint"))
// 445n

console.log(outfit.unhash(513n, "bigint"))
/*
{
  top: 'tank-top',
  bottom: 'skirt',
  shoes: { color: 'magenta', 'elastic-laces': 'yes', 'lace-color': 'blue' },
  socks: 'mid-calf'
}
*/

```
Any bigint can be converted to a variable-length base64 string and back using the methods `Part.encode()` and `Part.decode()`:
```js
console.log(Part.encode(12345678901234567890n))
// aJkGoPH7MHi

console.log(Part.decode('hello-world'))
// 19857872207319512397n
```
## Current Status
[![Project Status: Alpha](https://img.shields.io/badge/Project%20Status-Alpha-orange)](https://www.repostatus.org/#alpha)
[![Commits](https://img.shields.io/github/commit-activity/t/EJAugust/mphf)](https://github.com/EJAugust/EJAugust)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/EJAugust/mphf)](https://github.com/EJAugust/mphf)

The project is currently in alpha, so it is not ready to use for a production project. Use with caution.

Want to speed up the development process? Consider contributing to or sponsoring this project!
## License
The project is released under the MIT license. See LICENSE.md for copyright information.