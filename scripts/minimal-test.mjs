#!/usr/bin/env node
/**
 * Minimal install smoke test.
 * Usage: node minimal-test.mjs [package-root]
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(root, 'package.json')
if (!existsSync(pkgPath)) {
  console.error(`FAIL package.json not found: ${pkgPath}`)
  process.exit(1)
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const required = ['index.js', 'client.js', 'cordis.patch.yml']
let failed = 0
for (const file of required) {
  if (existsSync(resolve(root, file))) {
    console.log(`PASS ${file}`)
  } else {
    console.error(`FAIL ${file} is missing`)
    failed += 1
  }
}

if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') {
  console.log('PASS dsh.bundle.patch')
} else {
  console.error('FAIL dsh.bundle.patch')
  failed += 1
}

const patchText = existsSync(resolve(root, 'cordis.patch.yml'))
  ? readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8')
  : ''
if (/id:\s*['"]?dsh-info-check['"]?/.test(patchText) && /name:\s*['"]dsh-info-check['"]/.test(patchText)) {
  console.log('PASS bundle id/name')
} else {
  console.error('FAIL bundle id/name')
  failed += 1
}

const clientText = existsSync(resolve(root, 'client.js'))
  ? readFileSync(resolve(root, 'client.js'), 'utf8')
  : ''
if (/id:\s*['"]dsh-info-check['"]/.test(clientText)) {
  console.log('PASS client loader id')
} else {
  console.error('FAIL client loader id')
  failed += 1
}

console.log(`Package: ${pkg.name}@${pkg.version}`)
console.log(failed === 0 ? 'Minimal test passed.' : `Minimal test failed: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
