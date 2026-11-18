import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { applyProgressSafely, createProgressState } from '../lib/progress.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const state = createProgressState(true)
const thrown = new Proxy({}, {
  get() {
    throw new Error('projection getter exploded')
  },
})
const recovered = applyProgressSafely(state, thrown, true, () => {})
assert.equal(recovered.enabled, true)
assert.deepEqual(recovered.milestones, [])

const source = await readFile(join(root, 'lib', 'progress.js'), 'utf8')
const hasConstState = /\bconst\s+state\s*=/.test(source)
const reassigned = /(?<![.\w$])state\s*=(?!=)/.test(source)
assert.equal(hasConstState && reassigned, false, 'const state is reassigned in lib/progress.js')

console.log('dsh-info-check projection regression tests: ok')
