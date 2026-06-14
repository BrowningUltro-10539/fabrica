export type * from './internal/types.ts'
export * from './internal/types.ts'
import productsMacro from './internal/index.ts' with { type: 'macro' }
export const products = productsMacro
