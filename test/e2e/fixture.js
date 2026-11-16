/* Browser fixture: loads the real client bundle with a mock DSH host and renders
 * the confirmation panels. No network, no DSH login, no agent/model involved. */
(() => {
  const test = window.__TEST
  const spec = test.spec
  if (spec === undefined) throw new Error('client.js did not call __ModuleLoader__.load')

  const dictionaries = {}
  const t = key => dictionaries.zh?.[key] ?? dictionaries.en?.[key] ?? key

  const ctx = {
    effect(fn) {
      return fn()
    },
    locale: {
      register(_ns, lang, dictionary) {
        dictionaries[lang] = dictionary
        return () => {}
      },
      bind() {
        return t
      },
    },
    slots: {
      inject(_name, fn) {
        fn()
        return () => {}
      },
      register(options, component) {
        if (options?.name === 'conversation.composer') test.Panel = component
        return () => {}
      },
    },
    remote: {
      commands: { execute: async () => ({ ok: true }) },
      settings: {
        describe: async () => ({ ok: true, value: {} }),
        update: async () => ({ ok: true, value: {} }),
      },
    },
  }

  const mod = spec.factory(id => {
    if (id === 'react') return window.React
    if (id === 'react-dom') return window.ReactDOM
    throw new Error(`unexpected require(${id})`)
  })
  mod.apply(ctx)
  if (typeof test.Panel !== 'function') throw new Error('composer panel was not registered')

  const briefDetail = [
    '【我的理解】',
    '1. 加载真实 client.js 并渲染需求核对卡。',
    '',
    '【完成标准】',
    '1. 每个要点有独立文本框和序号框。',
    '',
    '【范围外】',
    '1. 不连接真实 DSH 服务。',
    '',
    '【里程碑】',
    '1. m1 — 渲染需求卡',
    '2. m2 — 验证交互',
  ].join('\n')

  const planDetail = [
    '【方案】',
    '1. 检查需求卡的点框与序号。',
    '2. 检查备注和调宽。',
    '',
    '【影响范围】',
    '1. 仅测试 fixture。',
  ].join('\n')

  const acceptDetail = [
    '【里程碑】',
    '1. m1 — 渲染与交互',
    '',
    '【完成内容】',
    '1. 真实组件已渲染。',
    '',
    '【验证证据】',
    '1. 浏览器 E2E 断言通过。',
    '',
    '【未完成或风险】',
    '1. 无。',
  ].join('\n')

  const deliveryDetail = [
    '【完成程度】',
    '1. 四道闸门已覆盖。',
    '',
    '【交付内容】',
    '1. test/e2e fixture 和断言。',
    '',
    '【未完成或限制】',
    '1. 不测试真实模型。',
    '',
    '【验证】',
    '1. 无头浏览器运行通过。',
  ].join('\n')

  const detailQuestions = [
    {
      id: 'q1',
      header: '范围',
      question: '第一条细节：覆盖哪些卡片？',
      options: [{ label: '四道闸门（推荐）' }, { label: '只测需求卡' }],
    },
    {
      id: 'q2',
      header: '备注',
      question: '第二条细节：备注写到哪里？',
      options: [{ label: '进入 answer payload（推荐）' }, { label: '只显示' }],
    },
    {
      id: 'q3',
      header: '调宽',
      question: '第三条细节：调宽上限是什么？',
      options: [{ label: '不超过当前高度（推荐）' }, { label: '无上限' }],
    },
  ]

  let root = null
  let pending = null

  function makePending(questions) {
    let snapshot = {
      key: `e2e-${Date.now()}`,
      closed: false,
      countdown: { remainingMs: 30000 },
      waitState: 'counting',
    }
    const listeners = new Set()
    const current = {
      key: snapshot.key,
      questions,
      snapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      answer(payload) {
        test.answers.push(payload)
        snapshot = { ...snapshot, closed: true }
        listeners.forEach(listener => listener())
        return Promise.resolve({ ok: true })
      },
      dismiss() {
        test.dismissed = true
        snapshot = { ...snapshot, closed: true }
        listeners.forEach(listener => listener())
        return Promise.resolve({ ok: true })
      },
      takeTime() { test.takeTime += 1 },
      holdFocus() { test.holds += 1 },
      releaseFocus() { test.releases += 1 },
      engage() { test.engages += 1 },
    }
    pending = current
    test.pending = current
    return current
  }

  function render(kind, questions) {
    if (root !== null) root.unmount()
    const mount = document.getElementById('root')
    mount.innerHTML = ''
    test.answers = []
    test.dismissed = false
    test.takeTime = 0
    test.holds = 0
    test.releases = 0
    test.engages = 0
    root = window.ReactDOM.createRoot(mount)
    const current = makePending(questions)
    root.render(window.React.createElement(test.Panel, { matched: { kind, pending: current } }))
    return true
  }

  window.__E2E = {
    renderIntent() {
      return render('intent', [{ id: 'intent-brief', detail: briefDetail }, ...detailQuestions])
    },
    renderMilestone() {
      return render('milestone', [{ id: 'milestone-confirm', detail: planDetail }])
    },
    renderAccept() {
      return render('accept', [{ id: 'milestone-accept', detail: acceptDetail }])
    },
    renderDelivery() {
      return render('delivery', [{ id: 'delivery-confirm', detail: deliveryDetail }])
    },
    state() {
      return test
    },
    pending() {
      return pending
    },
  }
  test.ready = true
})()
