export const brands = [
  {
    name: 'goBILDA',
    id: 'com.gobilda'
  },
  {
    name: 'REV Robotics',
    id: 'com.revrobotics'
  },
  {
    name: 'FIRST',
    id: 'org.firstinspires'
  },
  {
    name: 'AndyMark',
    id: 'com.andymark'
  },
  {
    name: 'Axon Robotics',
    id: 'com.axon-robotics'
  },
  {
    name: 'Studica',
    id: 'com.studica'
  }
] as const

export type BrandID = (typeof brands)[number]['id'] | (string & {})

export type SKU = `${BrandID}.${string}`

/**
 * A file hosted by the database.
 * Useful in cases where the original STEP file is not accessible directly from the brand,
 * or if it's packaged in a non-STEP format.
 */
export type LocalFile = {
  type: 'local'
  hash: string
}

/**
 * A file hosted externally.
 * Note that
 */
export type ExternalFile = {
  type: 'external'
  url: URL
}

export type File = LocalFile | ExternalFile

export const isLocalFile = (file: File): file is LocalFile =>
  file.type === 'local'
export const isExternalFile = (file: File): file is ExternalFile =>
  file.type === 'external'

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
  | 'mount'
  | 'gear'
  | 'beam'
  | 'shaft'
  | 'wheel'
  | (string & {})

/**
 * This type represents
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
  sku: SKU
  description: string
  keywords: Keyword[]
  specifications: {
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
  cad?: {
    step?: File
    onshape?: URL
  }
}
