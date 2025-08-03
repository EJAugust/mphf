class Part {
 static radix = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_0"
 static encode = n => {
  let charmCount = 0n
  let charmIndex
  let reducedBigint = n

  while (reducedBigint > 0n) {
   charmIndex = 2n ** (charmCount * 6n)
   if (reducedBigint >= charmIndex) {
    reducedBigint -= charmIndex
    charmCount++
   } else break
  }

  let charmLengthOffset = 0n

  for (let i = 0n; i < charmCount; i++)
   charmLengthOffset += 2n ** (i * 6n)

  const binaryString = (n - charmLengthOffset).toString(2)
  const charmRoundedBinaryLength = Number(charmCount) * 6
  const charmRoundedBinaryString = binaryString.padStart(charmRoundedBinaryLength, "0")

  let hash = ""

  for (let i = 0; i < charmRoundedBinaryLength; i += 6)
   hash += this.radix[parseInt(charmRoundedBinaryString.slice(i, i + 6), 2)]

  return hash
 }
 static decode = hash => {
  let charmRoundedBinaryString = "0b0"
  let charmLengthOffsetBinaryString = "0b0"

  for (const character of [...hash]) {
   const characterValue = this.radix.indexOf(character)
   if (characterValue === -1 || characterValue >= 64) throw character
   charmRoundedBinaryString += characterValue.toString(2).padStart(6, 0)
   charmLengthOffsetBinaryString += "000001"
  }

  return BigInt(charmRoundedBinaryString) + BigInt(charmLengthOffsetBinaryString)
 }
 get path() {
  return (this.parent ? this.parent.path + "/" : "") + this.key
 }
 constructor(key, subparts) {
  Object.defineProperties(this, {
   key: { value: key },
   subparts: { value: subparts },
   cardinality: { value: 1n, writable: true },
  })

  if (this.constructor === Part) {
   if (this.subparts)
    throw 'Subparts are not supported for the base type.'
  } else this.subparts.forEach((subpart, index) => {
   if (typeof subpart === "string") this.subparts[index] = subpart = new Part(subpart)
   Object.defineProperties(subpart, {
    parent: { value: this },
    index: { value: index }
   })
   Object.defineProperties(this, {
    [subpart.key]: { value: subpart },
    [index]: { value: subpart }
   })
  })
 }
 hash(model, format = "string") {
  if (model !== null)
   throw `Hash Error: The base Part type does not support hashing any model besides null.`

  return format === "string" ? "" : 0n
 }
 unhash(hash, format = "string") {
  const n = format === "string" ? Part.decode(hash) : hash

  if (n !== 0n) throw `Unhash Error: Hash ${n} is outside the range of the base Part (max ${this.cardinality - 1n}).`

  return null
 }
}
class Tuple extends Part {
 constructor(key, subparts) {
  super(key, subparts)

  const placeValues = new Map()

  let product = 1n

  for (const subpart of [...this.subparts].reverse()) {
   placeValues.set(subpart, product)
   product *= subpart.cardinality
  }

  Object.defineProperties(this, {
   placeValues: { value: placeValues },
   cardinality: { value: product }
  })
 }
 hash(model, format = "string") {

  if (typeof model !== "object")
   throw new TypeError(`Hash Error: Tuple "${this.path}" does not support computing a hash from a model of type "${typeof model}".`)

  const keys = Object.keys(model)

  if (!keys.length)
   return 0n

  let n = 0n

  for (const key of keys) {
   const subpart = this[key]

   if (!subpart)
    throw new ReferenceError(`Hash Error: Tuple "${this.path}" does not have a subpart called ${key}.`)

   n += subpart.hash(model[key], "bigint") * this.placeValues.get(subpart)
  }

  if (n >= this.cardinality)
   throw new RangeError(`Hash Error: Tuple "${this.path}" does not support a hash up to ${n} (max ${this.cardinality - 1n}).`)

  return format === "string" ? Part.encode(n) : n
 }
 unhash(hash, format = "string") {
  let n = format === "string" ? Part.decode(hash) : hash
  const model = {}

  for (const subpart of this.subparts) {
   const placeValue = this.placeValues.get(subpart)
   model[subpart.key] = subpart.unhash(n / placeValue, "bigint")
   n %= placeValue
  }

  return model
 }
}
class Choice extends Part {
 constructor(key, subparts) {
  super(key, subparts)

  const offsets = new Map()

  let sum = 0n

  for (const subpart of this.subparts) {
   offsets.set(subpart, sum)
   sum += subpart.cardinality
  }

  Object.defineProperties(this, {
   offsets: { value: offsets },
   cardinality: { value: sum }
  })
 }
 hash(model, format = "string") {
  const isString = typeof model === "string"

  if (!isString && typeof model !== "object")
   throw new TypeError(`Hash Error: Choice "${this.path}" does not support computing a hash from a model of type "${typeof model}".`)

  const keys = isString ? [model] : Object.keys(model)

  if (!keys.length)
   return 0n

  if (keys.length !== 1)
   throw new ReferenceError(`Hash Error: Choice "${this.path}" does not support multiple key assignments (attempted to set "${keys.join('", "')}").`)

  const key = keys[0]
  const subpart = this[key]

  if (!(this[key] instanceof Part))
   throw new ReferenceError(`Hash Error: Choice "${this.path}" does not have a subpart with key "${key}" (available keys are "${this.subparts.map(subpart => subpart.key).join('", "')}").`)

  const m = (isString ? 0n : subpart.hash(model[key], "bigint"))
  const n = this.offsets.get(subpart) + m

  if (n >= this.cardinality)
   throw new RangeError(`Hash Error: Tuple "${this.path}" does not support a hash up to ${n} (max ${this.cardinality - 1n}).`)

  return format === "string" ? Part.encode(n) : n
 }
 unhash(hash, format = "string") {
  const n = format === "string" ? Part.decode(hash) : hash

  for (let i = 0; i < this.subparts.length; i++) {
   if (i + 1 === this.subparts.length || n < this.offsets.get(this.subparts[i + 1])) {
    const subpart = this.subparts[i]
    return subpart.cardinality === 1n ? subpart.key : {
     [subpart.key]: subpart.unhash(n - this.offsets.get(subpart), "bigint")
    }
   }
  }
 }
}

export { Part, Tuple, Choice }