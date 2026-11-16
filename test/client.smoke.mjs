import assert from 'node:assert/strict'

let loaded
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      loaded = definition
    },
  },
}

await import('../client.js')
assert.equal(loaded.id, '@local/dsh-info-check')

const ReactStub = {
  createElement() { return null },
  useState(value) { return [value, () => {}] },
  useEffect() {},
  useRef(value) { return { current: value } },
  useSyncExternalStore() { return undefined },
  Fragment: Symbol('fragment'),
}

const plugin = loaded.factory(() => ReactStub)
assert.deepEqual(plugin.inject, ['slots', 'locale', 'remote', 'remote.commands', 'remote.settings'])

const calls = []
let composerSelect
const ctx = {
  effect(fn, label) {
    calls.push(['effect', label])
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  locale: {
    register() { calls.push(['locale.register']); return () => {} },
    bind() { return () => '' },
    subscribe() { return () => {} },
    getSnapshot() { return { active: 'zh', locales: [], revision: 0 } },
  },
  slots: {
    inject(key, callback) {
      calls.push(['slots.inject', key])
      callback()
    },
    register(options) {
      calls.push(['slots.register', options.name, options.id, options.priority, typeof options.select])
      if (options.name === 'conversation.composer') composerSelect = options.select
      return () => {}
    },
  },
  remote: {
    commands: {
      async execute() { return { kind: 'success' } },
    },
  },
}

plugin.apply(ctx)

assert.ok(calls.some(entry => entry[0] === 'slots.register' && entry[2] === 'dsh-info-check'))
assert.equal(typeof composerSelect, 'function')
assert.equal(composerSelect({ pendingInteraction: undefined }), null)
assert.equal(composerSelect({ pendingInteraction: { questions: [{ id: 'unrelated' }], answer() {} } }), null)
assert.equal(composerSelect({
  pendingInteraction: { questions: [{ id: 'intent-brief' }], answer() {} },
}).kind, 'intent')
assert.equal(composerSelect({
  pendingInteraction: { questions: [{ id: 'milestone-confirm' }], answer() {} },
}).kind, 'milestone')
assert.equal(composerSelect({
  pendingInteraction: { questions: [{ id: 'milestone-accept' }], answer() {} },
}).kind, 'accept')
assert.equal(composerSelect({
  pendingInteraction: { questions: [{ id: 'delivery-confirm' }], answer() {} },
}).kind, 'delivery')
console.log('dsh-info-check client smoke: ok')
