import { Part, Choice, Tuple } from "./index.js"

// 1. Define the data model for the search state
const searchState = new Tuple("search", [
 new Choice("category", ["electronics", "clothing", "books"]),
 new Choice("price", ["under_25", "25_to_50", "50_to_100", "over_100"]),
 new Tuple("features", [
  new Choice("waterproof", ["yes", "no"]),
  new Choice("wireless", ["yes", "no"]),
  new Choice("color", ["black", "white", "red", "blue"])
 ])
])

const comprehensiveStress = new Tuple("comprehensive_test", [
 // A. A large number of choices to test boundary conditions on hash size.
 new Choice("colors", [
  "red", "green", "blue", "yellow", "orange", "purple", "pink", "brown",
  "black", "white", "gray", "cyan", "magenta", "lime", "teal", "indigo"
 ]),

 // B. A small number of choices to test minimal hashing.
 new Choice("boolean_choice", ["true", "false"]),

 // C. Nested tuples to test deep hierarchies.
 new Tuple("user_settings", [
  new Choice("theme", ["dark", "light", "system"]),
  new Choice("language", ["en", "es", "fr", "de"]),
 ]),

 // D. A tuple with a wide variety of choices inside.
 new Tuple("product_details", [
  new Choice("size", ["xs", "s", "m", "l", "xl", "xxl"]),
  new Choice("material", ["cotton", "polyester", "wool", "silk"]),
  new Choice("stock", ["in_stock", "out_of_stock"]),
  new Tuple("dimensions", [
   new Choice("width", ["small", "medium", "large"]),
   new Choice("height", ["short", "average", "tall"])
  ]),
 ]),

 // E. A choice with very long, similar-looking string values to test hash collisions.
 new Choice("long_strings", [
  "very-long-string-that-is-hard-to-distinguish-part-1",
  "very-long-string-that-is-hard-to-distinguish-part-2",
  "very-long-string-that-is-hard-to-distinguish-part-3"
 ]),

 // F. A choice with special characters that need proper encoding.
 new Choice("special_characters", ["!@#$", "%^&*", "()_+"]),

 new Tuple("parent_config", [
  // This top-level Choice now contains a mix of primitive strings and nested Tuple/Choice elements.
  new Choice("control_type", [
   // Standard primitive choice
   "no_control",

   // A nested Tuple for 'manual' control options
   new Tuple("manual", [
    new Choice("speed", ["slow", "medium", "fast"]),
    new Choice("direction", ["left", "right", "straight"])
   ]),

   // Another nested Tuple for 'automatic' control options
   new Tuple("automatic", [
    new Choice("mode", ["eco", "sport", "comfort"]),
    new Choice("target", ["home", "work", "store"])
   ]),

   // A nested Choice for 'voice' control with its own sub-options
   new Choice("voice", ["enabled", "disabled"])
  ])
 ])
])

console.group("Random Comprehensive Stress Hash Reversal Test")
for (let n = 0n; n < 250; n++) {
 const length = Math.random() * Part.encode(comprehensiveStress.cardinality - 1n).length
 const characters = []
 for (let i = 0; i < length; i++)
  characters.push(Part.radix[Math.trunc(Math.random() * 64)])
 const hash = characters.join("")
 const n = Part.decode(hash)
 if (n >= comprehensiveStress.cardinality)
  continue
 try {
  const hash = Part.encode(n)
  const nModel = comprehensiveStress.unhash(n, "bigint")
  const hashModel = comprehensiveStress.unhash(hash)
  const nReturn = comprehensiveStress.hash(nModel, "bigint")
  const hashReturn = comprehensiveStress.hash(hashModel)
  if (hash !== hashReturn) {
   console.log(`❌ Failed: Hash "${hash}" does not match return "${hashReturn}".`)
  } else if (n === nReturn) {
   console.log(`✅ Passed: reversed "${hash}" = ${n}.`)
  }
  if (n !== nReturn) {
   console.log(`❌ Failed: BigInt ${n} does not match return ${nReturn}.`)
  }
 } catch (e) {
  console.log(`❌ Failed: Hash "${hash}" did not reverse. Unexpected error was thrown.`, e)
 }
}
console.groupEnd()

console.group("Brute Force Search State Hash Reversal Test")
for (let n = 0n; n < searchState.cardinality; n++) {
 try {
  const hash = Part.encode(n)
  const nModel = searchState.unhash(n, "bigint")
  const hashModel = searchState.unhash(hash)
  const nReturn = searchState.hash(nModel, "bigint")
  const hashReturn = searchState.hash(hashModel)
  if (hash !== hashReturn) {
   if (n !== nReturn) {
    console.log(`❌ Failed: Input ${n} does not match return ${nReturn}.`)
   } else
    console.log(`❌ Failed: Input hash "${hash}" does not match return hash "${hashReturn}".`)
  } else if (n === nReturn) {
   console.log(`✅ Passed: reversed "${hash}" = ${n}.`)
  } else if (n !== nReturn) {
   console.log(`❌ Failed: Input ${n} does not match return ${nReturn}.`)
  }
 } catch (e) {
  console.log(`❌ Failed: Hash "${hash}" did not reverse. Unexpected error was thrown:`, e)
 }
}
console.groupEnd()

for (const [name, target, args, TError, expectedOutput] of [
 ["Out-of-Range String Test", searchState, ["hello-world-this-is-too-big-for-search-state"], RangeError],
 ["Out-of-Range BigInt Test", searchState, [123412341234123412341234n, "bigint"], RangeError],
 ["Bad Input Type Test", searchState, [16, "number"], TypeError],
 ["Input Type Mismatch Test - Explicit BigInt", searchState, ["17", "bigint"], TypeError],
 ["Input Type Mismatch Test - Explicit String", searchState, [16n, "string"], TypeError],
 ["Input Type Mismatch Test - Implicit Type", searchState, [16n], TypeError],
 ["Bad Characters Test", searchState, ["includes bad+characters$"], SyntaxError],
 ["Undefined Hash Test", searchState, [], TypeError],
 ["Single Part Hash Test - String", searchState.price.under_25, ["1"], RangeError],
 ["Single Part Hash Test - BigInt", searchState.price.under_25, [1n, "bigint"], RangeError],
 ["Single Part Hash Test - Empty String", searchState.price.under_25, [""], null, null],
 ["Single Part Hash Test - BigInt 0n", searchState.price.under_25, [0n, "bigint"], null, null],
 ["Negative BigInt Test", searchState, [-1n, "bigint"], RangeError],
 ["Negative BigInt Test", searchState, [-1n, "bigint"], RangeError],
]) {
 // Out of range test
 console.group(name)
 try {
  const output = target.unhash(...args)
  if (TError !== null)
   console.log("❌ Failed: Expected error was not thrown.")
  else if (expectedOutput !== output)
   console.log("❌ Failed: Unexpected output.", { output })
  else
   console.log("✅ Passed: Expected output with no error.")
 } catch (e) {
  if (TError && e && e instanceof TError)
   console.log("✅ Passed: Expected error was thrown.")
  else
   console.log("❌ Failed: Unexpected error was thrown: " + e)
 }
 console.groupEnd()
}