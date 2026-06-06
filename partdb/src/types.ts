export type Keyword =
  | 'motor'
  | 'servo'
  | 'actuator'
  | 'FTC'
  | 'FRC'
  | 'channel'
  | 'extrusion'
  | 'bearing'
  | 'bracket'
  | 'plate'
  | 'gear'
  | (string & {})

export type CommonSpecifications = {
  [key: string]: any
  /**
   * Weight of the prodct in grams.
   */
  weight?: number
  /**
   * Length of the product in centimeters.
   */
  length?: number
  /**
   * Width of the product in centimeters.
   */
  width?: number
  /**
   * Height of the product in centimeters.
   */
  height?: number
}

/**
 * T
 */
export type Product = {
  /**
   * The spoken, common name of the product.
   *
   * @remarks
   *
   * Do not include the main manufacturer or brand that the product falls under.
   * However, sub-brands should be included.
   *
   * In the case of the product containing a large number of keywords intended for SEO
   * (as is common in, say, Amazon listings),
   * then make a best effort attempt to capture the colloquial product name
   * including all major brand signifiers.
   *
   * @example Name for the fictional ACME Robotics Turboencabulator
   *
   * ```ts
   * const turboencabulator: Product = {
   *   name: "Turboencabulator",
   *   ...
   * }
   * ```
   *
   * @example Name for the fictional ACME Robotics SUPERCHARGED™ Turboencabulator
   *
   * ```ts
   * const turboencabulator: Product = {
   *   name: "SUPERCHARGED™ Turboencabulator",
   *   ...
   * }
   * ```
   */
  name: string
  sku: string
  description: string
  keywords: Keyword[]
  specifications: CommonSpecifications
}

let product: Product = {
  name: '',
  sku: '',
  description: '',
  keywords: [],
  specifications: {
    weight: 30,
    j: ''
  }
}
