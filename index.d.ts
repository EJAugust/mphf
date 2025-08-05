export declare class Part {
 /** Encodes the given bigint value as a variable-length URL-safe base64 string hash. */
 static encode(n: bigint): string
 /** Decodes the given hash, returning the corresponding bigint. */
 static decode(hash: string): bigint
 /** The alphabet used for encoding and decoding BigInt values as strings. */
 readonly static radix: string
 /** The number of states the model has, used heavily to compute the hashing function across the model configuration space. */
 readonly cardinality: bigint
 /** The path to this part in the model hierarchy. */
 readonly path: string
 /** A unique name used to identify the part within its parent domain. */
 readonly key: string
 /** The part's index in it's parent domain. */
 readonly index: number
 /** The parent part, if one exists. */
 readonly parent: Part
 /** An array of the domain's subparts. Not available for simple Part types. */
 readonly subparts?: Part[]
 /** A method which hashes the given model, if it conforms to this part's model. Throws an error, otherwise. */
 hash(model: any, format: "string" = "string"): string
 hash(model: any, format: "bigint"): bigint
 /** A method which produces a model instance from the given hash, if the model conforms to this part's model specification. Throws an error, otherwise. */
 unhash(hash: string, format: "string" = "string"): any
 unhash(hash: bigint, format: "bigint"): any
}

export declare class Choice extends Part {
 /** A map relating the subparts of the choice to their corresponding bigint offsets, used to determine which hash ranges correspond to which subparts. */
 readonly offsets: Map<Part, bigint>
}

export declare class Tuple extends Part {
 /** A map relating the subparts of the tuple to their corresponding bigint place values, used as a unique factor to isolate each subpart state. */
 readonly placeValues: Map<Part, bigint>
}