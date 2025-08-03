import { Part, Choice, Tuple } from "./index.js"

console.log(Part.encode(12345678901234567890n)) //aJkGoPH7MHi
console.log(Part.decode('hello-world')) // 19857872207319512397n