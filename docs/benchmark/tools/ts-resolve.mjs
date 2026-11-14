// Lets Node load the app's TypeScript modules, which use extensionless relative imports.
// Usage: node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs <script>
import { register } from 'node:module'
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) } catch (e) {
    if (spec.startsWith('.') && !/\\.[a-z]+$/.test(spec)) return next(spec + '.ts', ctx)
    throw e
  }
}`))
