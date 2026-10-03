import { build } from 'esbuild'

await build({
  entryPoints: ['src/server/invoice.ts'],
  outfile: '.server/invoice.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
})
