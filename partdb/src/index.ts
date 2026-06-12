export type { Product, BrandID } from './internal/types.ts'
export { brands } from './internal/types.ts'
import productsMacro from './internal/index.ts' with { type: 'macro' }
export const products = productsMacro
