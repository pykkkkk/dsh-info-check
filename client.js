window.__ModuleLoader__.load({
  id: '@local/dsh-info-check',
  factory(require) {
    const React = require('react')
    let createPortal
    try {
      createPortal = require('react-dom').createPortal
    } catch {
      createPortal = undefined
    }

    const NS = 'dsh-info-check'
    const BRIEF_ID = 'intent-brief'
    const MILESTONE_ID = 'milestone-confirm'
    const ACCEPT_ID = 'milestone-accept'
    const DELIVERY_ID = 'delivery-confirm'
    const APPROVE_MILESTONE = '按此方案执行（推荐）'
    const ACCEPT_LABEL = '验收通过'
    const REWORK_LABEL = '需要返工'
    const DELIVER_LABEL = '确认并交付'
    const ADJUST_DELIVERY_LABEL = '需要调整'

    const PANEL_CSS = `
.ic-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:24px;background:rgba(15,23,42,.30);animation:ic-fade .16s ease-out}
.ic-backdrop-top{z-index:2147483100}
.ic-modal{width:min(560px,75vw);max-width:75vw;max-height:75vh;display:flex;flex-direction:column}
.ic-modal .ic-card{max-height:75vh}
.ic-card,.ic-toggle{--ic-primary:#4D6BFE;--ic-primary-ink:#3B55D4;--ic-primary-tint:#EEF1FF;--ic-ink:#1F1F1F;--ic-text-2:#64748B;--ic-text-3:#94A3B8;--ic-bg:#F5F6F8;--ic-surface:#FFFFFF;--ic-read:#FAFBFC;--ic-line:#E5E7EB;--ic-line-soft:#EFF1F4;--ic-border:#D7DCE3;--ic-warn:#B45309;--ic-error:#DC2626;--ic-spring:cubic-bezier(.34,1.56,.64,1);--ic-sh:0 18px 44px rgba(15,23,42,.10),0 3px 10px rgba(15,23,42,.05);font-family:"Urbanist","Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.ic-card{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:100%;border:1px solid var(--ic-line);border-radius:14px;background:var(--ic-surface);color:var(--ic-ink);box-shadow:var(--ic-sh);overflow:hidden;animation:ic-in .18s cubic-bezier(.2,.8,.2,1)}
.ic-card-compact{min-height:0}
.ic-head{display:flex;align-items:center;gap:10px;padding:18px 24px 14px;border-bottom:1px solid var(--ic-line-soft);flex:0 0 auto}
.ic-brand{font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--ic-text-2);background:var(--ic-bg);padding:4px 8px;border-radius:6px;border:1px solid var(--ic-line);white-space:nowrap}
.ic-title{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.ic-spacer{flex:1}
.ic-stepper{display:flex;align-items:center;gap:9px}
.ic-track{width:40px;height:2px;background:var(--ic-line);position:relative;border-radius:2px;overflow:hidden}
.ic-track i{position:absolute;left:0;top:0;height:2px;background:var(--ic-ink);display:block;transition:width .3s ease}
.ic-cnt{font-size:11px;font-weight:700;color:var(--ic-text-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.ic-icon-btn{width:28px;height:28px;flex:none;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--ic-text-3);cursor:pointer;display:grid;place-items:center;font-size:17px;line-height:1;transition:background .15s,color .15s}
.ic-icon-btn:hover{background:var(--ic-bg);color:var(--ic-ink)}
.ic-desc{margin:16px 24px 0;font-size:12.5px;color:var(--ic-text-2);line-height:1.65}
.ic-hint{font-size:12px;line-height:1.65;color:var(--ic-text-2)}
.ic-step{display:flex;flex-direction:column;gap:10px}
.ic-count-row{display:flex;align-items:center;gap:8px;padding:10px 24px 0;flex:0 0 auto}
.ic-count{font-size:11px;color:var(--ic-text-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.ic-count-warn{color:var(--ic-warn)}
.ic-timer-stop{flex:none;border:1px solid var(--ic-line);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;font-family:inherit;color:var(--ic-text-2);background:var(--ic-surface);cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.ic-timer-stop:hover{background:var(--ic-bg);color:var(--ic-ink);border-color:var(--ic-text-3)}
.ic-bar{flex:1;height:3px;border-radius:999px;background:var(--ic-line);overflow:hidden}
.ic-bar-fill{height:100%;border-radius:999px;background:var(--ic-primary);transition:width 1s linear,background .2s}
.ic-bar-fill-warn{background:var(--ic-warn)}
.ic-body{flex:1;padding:14px 24px 0;overflow:auto;min-height:0;display:flex;flex-direction:column;gap:10px}
.ic-readbox{box-sizing:border-box;width:100%;height:216px;min-height:120px;max-height:44vh;resize:vertical;padding:16px 18px;border:1px solid transparent;border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font-family:inherit;font-size:13px;line-height:1.78;outline:none;overflow:auto;transition:border-color .15s,box-shadow .15s}
.ic-readbox:hover{border-color:var(--ic-line)}
.ic-readbox:focus{border-color:var(--ic-primary);box-shadow:0 0 0 3px rgba(77,107,254,.12)}
.ic-input{box-sizing:border-box;width:100%;padding:9px 12px;border:1px solid var(--ic-line);border-radius:8px;background:var(--ic-surface);color:var(--ic-ink);font-family:inherit;font-size:12.5px;outline:none;transition:border-color .15s}
.ic-input:focus{border-color:var(--ic-primary);box-shadow:0 0 0 3px rgba(77,107,254,.12)}
.ic-sections{display:flex;flex-direction:column;gap:14px}
.ic-sec{display:flex;flex-direction:column;gap:6px}
.ic-sec-label{font-size:15px;font-weight:700;letter-spacing:0;color:#000;line-height:1.4;text-transform:none}
.ic-sec-box{box-sizing:border-box;width:100%;min-height:76px;max-height:200px;resize:vertical;padding:12px 14px;border:1px solid var(--ic-line-soft);border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font-family:inherit;font-size:13px;line-height:1.75;outline:none;overflow:auto;transition:border-color .15s,box-shadow .15s}
.ic-sec-box:hover{border-color:var(--ic-line)}
.ic-sec-box:focus{border-color:var(--ic-primary);box-shadow:0 0 0 3px rgba(77,107,254,.12)}
.ic-sec-read{white-space:pre-wrap;padding:12px 14px;border:1px solid var(--ic-line-soft);border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font-size:13px;line-height:1.75;overflow-wrap:anywhere}
.ic-qgroup{margin-bottom:22px}
.ic-qgroup:last-child{margin-bottom:0}
.ic-q-title{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700;margin-bottom:10px;line-height:1.5}
.ic-q-badge{font-size:10.5px;font-weight:700;letter-spacing:.03em;color:var(--ic-text-2);background:var(--ic-bg);padding:3px 7px;border-radius:6px;border:1px solid var(--ic-line);white-space:nowrap}
.ic-q-hint{font-size:11px;color:var(--ic-text-3);font-weight:500}
.ic-opts{display:flex;flex-wrap:wrap;gap:8px}
.ic-opt{position:relative;overflow:hidden;cursor:pointer;user-select:none;font-family:inherit;font-size:12px;font-weight:600;color:var(--ic-text-2);background:var(--ic-surface);border:1px solid var(--ic-line);border-radius:8px;padding:9px 13px;transition:transform .38s var(--ic-spring),background .18s,border-color .18s,color .18s}
.ic-opt:hover{border-color:var(--ic-text-3);color:var(--ic-ink)}
.ic-opt:active{transform:scale(.94)}
.ic-opt-sel{background:var(--ic-primary-tint);border-color:#C9D3FF;color:var(--ic-primary-ink);box-shadow:inset 2px 0 0 var(--ic-primary)}
.ic-opt-sel:hover{border-color:#C9D3FF;color:var(--ic-primary-ink)}
.ic-rec{color:var(--ic-text-3);font-size:11px;margin-left:3px;font-weight:500}
.ic-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:16px 24px 20px;border-top:1px solid var(--ic-line-soft);margin-top:18px;flex:0 0 auto}
.ic-task{display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;font-size:12px;color:var(--ic-text-2)}
.ic-cbox{width:17px;height:17px;flex:none;position:relative}
.ic-cbox input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.ic-box{position:absolute;inset:0;border-radius:5px;border:1.5px solid var(--ic-border);background:var(--ic-surface);transition:transform .42s var(--ic-spring),background .2s,border-color .2s}
.ic-box svg{position:absolute;inset:0;width:100%;height:100%}
.ic-box path{fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:20;stroke-dashoffset:20;transition:stroke-dashoffset .3s ease .05s}
.ic-cbox input:checked + .ic-box{transform:scale(1.12);background:var(--ic-primary);border-color:var(--ic-primary);animation:ic-cb .42s var(--ic-spring)}
.ic-cbox input:checked + .ic-box path{stroke-dashoffset:0}
.ic-cbox input:checked ~ .ic-task-text{color:var(--ic-ink);font-weight:600}
.ic-task-on .ic-task-text{color:var(--ic-ink);font-weight:600}
.ic-btn{position:relative;overflow:hidden;cursor:pointer;user-select:none;font-family:inherit;font-size:12.5px;font-weight:700;border-radius:8px;padding:9px 18px;border:1px solid transparent;transition:transform .42s var(--ic-spring),background .18s,color .18s,border-color .18s;line-height:1.2}
.ic-btn:active{transform:scale(.94)}
.ic-btn:disabled{opacity:.5;cursor:default;transform:none}
.ic-btn-ghost{background:var(--ic-surface);color:var(--ic-text-2);border-color:var(--ic-line)}
.ic-btn-ghost:hover:not(:disabled){background:var(--ic-bg);color:var(--ic-ink)}
.ic-btn-primary{background:var(--ic-primary);color:#fff}
.ic-btn-primary:hover:not(:disabled){background:var(--ic-primary-ink)}
.ic-ripple{position:absolute;border-radius:50%;pointer-events:none;background:currentColor;opacity:.26;transform:translate(-50%,-50%) scale(0);animation:ic-rip .45s ease-out forwards}
.ic-error{padding:0 24px;font-size:12px;color:var(--ic-error)}
.ic-toggle{display:flex;align-items:center;gap:6px;height:22px;font-size:11.5px;color:var(--ic-text-2);user-select:none}
.ic-toggle-label{border:none;background:transparent;padding:0;font:inherit;font-size:11.5px;color:var(--ic-text-2);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--ic-border);transition:color .15s,text-decoration-color .15s}
.ic-toggle-label:hover{color:var(--ic-ink);text-decoration-color:var(--ic-primary)}
.ic-close:focus-visible,.ic-btn:focus-visible,.ic-opt:focus-visible,.ic-readbox:focus-visible,.ic-input:focus-visible,.ic-toggle-label:focus-visible,.ic-cbox input:focus-visible + .ic-box{outline:2px solid var(--ic-primary);outline-offset:2px}
@keyframes ic-in{from{opacity:0;transform:translateY(6px) scale(.995)}to{opacity:1;transform:none}}
@keyframes ic-fade{from{opacity:0}to{opacity:1}}
@keyframes ic-cb{0%{transform:scale(.8)}60%{transform:scale(1.16)}100%{transform:scale(1.12)}}
@keyframes ic-rip{to{transform:translate(-50%,-50%) scale(1);opacity:0}}
@media (max-height:640px){.ic-card{min-height:0}}
@media (prefers-reduced-motion:reduce){.ic-card,.ic-backdrop,.ic-cbox input:checked + .ic-box,.ic-ripple,.ic-step{animation:none}.ic-btn,.ic-opt,.ic-readbox,.ic-bar-fill,.ic-icon-btn,.ic-track i,.ic-box,.ic-box path{transition:none}}
`

    const zh = {
      'title': '需求核对',
      'state.on': '已开启',
      'state.off': '已关闭',
      'hint.on': '开工前核对意图，确认一次执行方案，逐个验收里程碑，交付前确认完成程度；每次选择都会写入 .dsh-info-check/ledger.md',
      'hint.off': '已关闭：不会核对意图、确认方案或验收里程碑',
      'saveFailed': '切换失败，请重试',
      'panel.title': '需求核对',
      'panel.detailsTitle': '细节确认',
      'panel.milestoneTitle': '里程碑确认',
      'panel.acceptTitle': '里程碑验收',
      'panel.deliveryTitle': '交付确认',
      'panel.acceptHint': '确认完成内容与验证证据；通过后进入下一个里程碑。',
      'panel.deliveryHint': '确认完成程度后交付最终结果。',
      'panel.acceptCheck': '我已确认以上验收内容',
      'panel.deliveryCheck': '我已确认以上完成程度',
      'panel.acceptPrimary': '验收通过',
      'panel.acceptSecondary': '需要返工',
      'panel.deliveryPrimary': '确认并交付',
      'panel.deliverySecondary': '需要调整',
      'panel.reworkTitle': '返修说明',
      'panel.reworkHint': '请说明哪里不通过、希望怎么改；模型会以此为依据修改。',
      'panel.reworkSubmit': '提交返修说明',
      'panel.reworkCancel': '返回验收',
      'panel.reworkPlaceholder': '例如：按钮 loading 态不对，间距也不一致…',
      'panel.reasonRequired': '请填写说明',
      'panel.adjustTitle': '调整说明',
      'panel.adjustHint': '请说明需要调整什么；模型会以此为依据修改后再交付。',
      'panel.adjustSubmit': '提交调整说明',
      'panel.adjustCancel': '返回交付确认',
      'panel.adjustPlaceholder': '例如：完成程度描述不准，还差…',
      'panel.settingsTitle': '设置',
      'panel.settingsPlaceholder': '设置项稍后添加。当前对话的开关在下方；关闭只影响这个对话。',
      'panel.current': '当前对话',
      'panel.settingsOpen': '打开 dsh-info-check 设置',
      'panel.briefHint': '下面是 agent 的理解与核对单。你可以直接修改、补充；确认后进入细节确认。',
      'panel.milestoneHint': '这是本里程碑的方案。你可以直接修改；勾选确认后按此执行。',
      'panel.check': '我已确认以上理解（可直接修改）',
      'panel.milestoneCheck': '我已确认以上方案（可直接修改）',
      'panel.next': '下一步',
      'panel.back': '上一步',
      'panel.submit': '提交确认',
      'panel.approve': '按此方案执行',
      'panel.cancel': '取消',
      'panel.saving': '提交中…',
      'panel.failed': '提交失败，请重试',
      'panel.briefRequired': '核对单不能为空',
      'panel.checkRequired': '请先勾选“我已确认”',
      'panel.detailsHint': '以下问题可以只选你关心的；不选表示跳过。',
      'panel.multiHint': '可多选',
      'panel.textPlaceholder': '也可以直接写你的选择',
      'panel.close': '关闭',
      'panel.countdown': '自动跳过',
      'panel.countdownPaused': '已暂停',
      'panel.continued': '已超时，仍可提交',
      'panel.stopTimer': '停止计时',
      'panel.countdownStopped': '计时已停止',
    }
    const en = {
      'title': 'Info checker',
      'state.on': 'On',
      'state.off': 'Off',
      'hint.on': 'Clarifies intent, confirms the plan once, accepts each milestone, and signs off delivery; choices go to .dsh-info-check/ledger.md',
      'hint.off': 'Off: no intent check, plan confirmation, acceptance, or delivery sign-off',
      'saveFailed': 'Could not toggle; try again',
      'panel.title': 'Intent check',
      'panel.detailsTitle': 'Details',
      'panel.milestoneTitle': 'Milestone confirmation',
      'panel.acceptTitle': 'Milestone acceptance',
      'panel.deliveryTitle': 'Delivery confirmation',
      'panel.acceptHint': 'Confirm the completed work and evidence; acceptance moves to the next milestone.',
      'panel.deliveryHint': 'Confirm the completion level before the final result is delivered.',
      'panel.acceptCheck': 'I confirm this acceptance summary',
      'panel.deliveryCheck': 'I confirm this completion level',
      'panel.acceptPrimary': 'Accept',
      'panel.acceptSecondary': 'Needs rework',
      'panel.deliveryPrimary': 'Confirm and deliver',
      'panel.deliverySecondary': 'Needs adjustment',
      'panel.reworkTitle': 'Rework notes',
      'panel.reworkHint': 'Say what failed and what should change; the model will use this to revise.',
      'panel.reworkSubmit': 'Submit rework notes',
      'panel.reworkCancel': 'Back to acceptance',
      'panel.reworkPlaceholder': 'For example: the loading state is wrong and spacing differs…',
      'panel.adjustTitle': 'Adjustment notes',
      'panel.adjustHint': 'Say what needs adjustment; the model will use this to revise before delivery.',
      'panel.adjustSubmit': 'Submit adjustments',
      'panel.adjustCancel': 'Back to delivery',
      'panel.adjustPlaceholder': 'For example: the completion summary is inaccurate; still missing…',
      'panel.reasonRequired': 'Please write the notes',
      'panel.settingsTitle': 'Settings',
      'panel.settingsPlaceholder': 'Settings will be added here. The switch for this conversation is below; turning it off affects only this conversation.',
      'panel.current': 'This conversation',
      'panel.settingsOpen': 'Open dsh-info-check settings',
      'panel.briefHint': 'This is the agent’s understanding and checklist. Edit it in place, then confirm to continue to details.',
      'panel.milestoneHint': 'This is the plan for this milestone. Edit it in place, then confirm to execute it.',
      'panel.check': 'I confirm this understanding (edit as needed)',
      'panel.milestoneCheck': 'I confirm this plan (edit as needed)',
      'panel.next': 'Next',
      'panel.back': 'Back',
      'panel.submit': 'Submit',
      'panel.approve': 'Execute this plan',
      'panel.cancel': 'Cancel',
      'panel.saving': 'Submitting…',
      'panel.failed': 'Could not submit; try again',
      'panel.briefRequired': 'The checklist cannot be empty',
      'panel.checkRequired': 'Check “I confirm” first',
      'panel.detailsHint': 'Answer only what matters; leave a question blank to skip it.',
      'panel.multiHint': 'multi-select',
      'panel.textPlaceholder': 'Or type your answer',
      'panel.close': 'Close',
      'panel.countdown': 'Auto-skip in',
      'panel.countdownPaused': 'Paused',
      'panel.continued': 'Timed out — still answerable',
      'panel.stopTimer': 'Stop timer',
      'panel.countdownStopped': 'Timer stopped',
    }

    function useSnapshot(store) {
      return React.useSyncExternalStore(
        listener => store.subscribe(listener),
        () => store.getSnapshot(),
      )
    }

    function usePending(pending) {
      return React.useSyncExternalStore(
        listener => pending.subscribe(listener),
        () => pending.snapshot(),
      )
    }

    function useCountdownBase(snapshot) {
      const base = React.useRef(0)
      if (base.current === 0 && snapshot.countdown !== undefined) {
        base.current = Math.max(1, snapshot.countdown.remainingMs)
      }
      return base.current
    }

    function RippleButton(props) {
      const { className, onClick, disabled, children, ...rest } = props
      const [ripples, setRipples] = React.useState([])
      const nextId = React.useRef(0)
      const onPointerDown = (event) => {
        if (disabled) return
        const rect = event.currentTarget.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height) * 2.4
        const id = nextId.current++
        setRipples(previous => [...previous, { id, left: event.clientX - rect.left, top: event.clientY - rect.top, size }])
        setTimeout(() => {
          setRipples(previous => previous.filter(item => item.id !== id))
        }, 460)
      }
      return React.createElement('button', {
        type: 'button',
        className,
        disabled,
        onClick,
        onPointerDown,
        ...rest,
      },
      ...ripples.map(item => React.createElement('span', {
        key: item.id,
        className: 'ic-ripple',
        style: {
          left: `${item.left}px`,
          top: `${item.top}px`,
          width: `${item.size}px`,
          height: `${item.size}px`,
        },
      })),
      children)
    }

    function CheckBox({ checked, onChange, disabled, label }) {
      return React.createElement('label', { className: `ic-task${checked ? ' ic-task-on' : ''}` },
        React.createElement('span', { className: 'ic-cbox' },
          React.createElement('input', {
            type: 'checkbox',
            checked,
            disabled,
            onChange: event => { onChange(event.target.checked) },
          }),
          React.createElement('span', { className: 'ic-box' },
            React.createElement('svg', { viewBox: '0 0 20 20' },
              React.createElement('path', { d: 'M4 10.5l4 4 8-8' })))),
        React.createElement('span', { className: 'ic-task-text' }, label))
    }

    const SECTION_MARKER = /^(【(.+?)】|#{1,6}\s+(.+?))\s*$/

    function parseSections(text) {
      const sections = []
      let current = { marker: '', title: '', lines: [] }
      for (const line of String(text).split('\n')) {
        const match = SECTION_MARKER.exec(line)
        if (match) {
          if (current.marker !== '' || current.lines.some(item => item.trim() !== '')) sections.push(current)
          current = { marker: line, title: match[2] ?? match[3] ?? '', lines: [] }
          continue
        }
        current.lines.push(line)
      }
      if (current.marker !== '' || current.lines.some(item => item.trim() !== '')) sections.push(current)
      return sections.map(section => ({
        marker: section.marker,
        title: section.title,
        body: section.lines.join('\n').replace(/^\n+|\n+$/g, ''),
      }))
    }

    function joinSections(sections) {
      return sections
        .map(section => `${section.marker === '' ? '' : `${section.marker}\n\n`}${section.body}`)
        .join('\n\n')
        .trim()
    }

    function SectionsEditor({ detail, onChange, disabled, onFocus, onBlur, onEdit }) {
      const [sections, setSections] = React.useState(() => parseSections(detail))
      React.useEffect(() => {
        setSections(parseSections(detail))
      }, [detail])

      const update = (index, body) => {
        const next = sections.map((section, i) => (i === index ? { ...section, body } : section))
        setSections(next)
        if (typeof onEdit === 'function') onEdit()
        onChange(joinSections(next))
      }

      return React.createElement('div', { className: 'ic-sections' },
        ...sections.map((section, index) => React.createElement('div', {
          key: `${section.marker}:${index}`,
          className: 'ic-sec',
        },
        section.title === '' ? null : React.createElement('div', { className: 'ic-sec-label' }, section.title),
        React.createElement('textarea', {
          className: 'ic-sec-box',
          value: section.body,
          disabled,
          spellCheck: false,
          'aria-label': section.title === '' ? 'content' : section.title,
          onFocus: typeof onFocus === 'function' ? onFocus : undefined,
          onBlur: typeof onBlur === 'function' ? onBlur : undefined,
          onChange: event => { update(index, event.target.value) },
        }))))
    }

    function SectionsView({ detail }) {
      const sections = parseSections(detail)
      return React.createElement('div', { className: 'ic-sections' },
        ...sections.map((section, index) => React.createElement('div', {
          key: `${section.marker}:${index}`,
          className: 'ic-sec',
        },
        section.title === '' ? null : React.createElement('div', { className: 'ic-sec-label' }, section.title),
        React.createElement('div', { className: 'ic-sec-read' }, section.body))))
    }

    function countdownNode(t, snapshot, base, onStop) {
      if (snapshot.countdown === undefined) return null
      const remaining = snapshot.countdown.remainingMs
      const seconds = Math.max(0, Math.ceil(remaining / 1000))
      const held = snapshot.waitState === 'waiting'
      const continued = snapshot.waitState === 'continued'
      const paused = !held && !continued && snapshot.waitState !== 'counting'
      const warn = !held && !continued && seconds <= 10
      const percent = held || continued || base <= 0 ? 0 : Math.max(0, Math.min(100, (remaining / base) * 100))
      const label = held
        ? t('panel.countdownStopped')
        : continued
          ? t('panel.continued')
          : `${paused ? t('panel.countdownPaused') : t('panel.countdown')} · ${seconds}s`
      const showStop = !held && !continued && typeof onStop === 'function'
      return React.createElement('div', { className: 'ic-count-row' },
        React.createElement('span', { className: `ic-count${warn ? ' ic-count-warn' : ''}` }, label),
        held ? null : React.createElement('div', { className: 'ic-bar' },
          React.createElement('div', {
            className: `ic-bar-fill${warn ? ' ic-bar-fill-warn' : ''}`,
            style: { width: `${percent}%` },
          })),
        showStop ? React.createElement('button', {
          type: 'button',
          className: 'ic-timer-stop',
          onClick: onStop,
        }, t('panel.stopTimer')) : null)
    }

    function ModalShell({ children, onBackdrop, top }) {
      const node = React.createElement('div', {
        className: `ic-backdrop${top === true ? ' ic-backdrop-top' : ''}`,
        onMouseDown: (event) => {
          if (onBackdrop !== undefined && event.target === event.currentTarget) onBackdrop()
        },
      }, React.createElement('div', { className: 'ic-modal' }, children))
      return createPortal === undefined ? node : createPortal(node, document.body)
    }

    function PanelShell(props) {
      const { t, title, step, stepCount, description, countdown, onClose, children, footer, error, compact } = props
      return React.createElement('div', { className: `ic-card${compact === true ? ' ic-card-compact' : ''}` },
        React.createElement('style', null, PANEL_CSS),
        React.createElement('div', { className: 'ic-head' },
          React.createElement('span', { className: 'ic-brand' }, 'dsh-info-check'),
          React.createElement('h2', { className: 'ic-title' }, title),
          React.createElement('div', { className: 'ic-spacer' }),
          step === undefined ? null : React.createElement('div', { className: 'ic-stepper' },
            React.createElement('div', { className: 'ic-track' },
              React.createElement('i', { style: { width: `${Math.round((step / stepCount) * 100)}%` } })),
            React.createElement('span', { className: 'ic-cnt' }, `${step} / ${stepCount}`)),
          React.createElement('button', {
            type: 'button',
            className: 'ic-icon-btn',
            'aria-label': t('panel.close'),
            title: t('panel.close'),
            onClick: onClose,
          }, '×')),
        description === undefined ? null : React.createElement('p', { className: 'ic-desc' }, description),
        countdown,
        React.createElement('div', { className: 'ic-body' }, children),
        error === '' ? null : React.createElement('div', { className: 'ic-error' }, error),
        React.createElement('div', { className: 'ic-foot' }, footer))
    }

    function createIntentPanel(ctx) {
      return function IntentPanel({ pending }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const briefQuestion = pending.questions.find(question => question !== null && question.id === BRIEF_ID)
        const details = pending.questions.filter(question => question !== null && question.id !== BRIEF_ID)
        const original = typeof briefQuestion?.detail === 'string' ? briefQuestion.detail : ''

        const [text, setText] = React.useState(original)
        const [checked, setChecked] = React.useState(false)
        const [step, setStep] = React.useState(0)
        const [selections, setSelections] = React.useState({})
        const [customs, setCustoms] = React.useState({})
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setText(original)
          setChecked(false)
          setStep(0)
          setSelections({})
          setCustoms({})
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.dismiss().catch(() => { setBusy(false) })
        }

        const toggleOption = (question, label) => {
          setSelections((previous) => {
            const current = Array.isArray(previous[question.id]) ? previous[question.id] : []
            if (question.multiSelect === true) {
              const next = current.includes(label) ? current.filter(item => item !== label) : [...current, label]
              return { ...previous, [question.id]: next }
            }
            return { ...previous, [question.id]: [label] }
          })
        }

        const submit = () => {
          if (busy) return
          if (text.trim() === '') { setError(t('panel.briefRequired')); return }
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          const answers = [
            { id: BRIEF_ID, selected: [], custom: text.trim() },
            ...details.map((question) => {
              const custom = typeof customs[question.id] === 'string' ? customs[question.id].trim() : ''
              return {
                id: question.id,
                selected: Array.isArray(selections[question.id]) ? selections[question.id] : [],
                ...custom === '' ? {} : { custom },
              }
            }),
          ]
          pending.answer({ answers }).catch(() => {
            setError(t('panel.failed'))
            setBusy(false)
          })
        }

        const advance = () => {
          if (text.trim() === '') { setError(t('panel.briefRequired')); return }
          if (!checked) { setError(t('panel.checkRequired')); return }
          setError('')
          if (details.length === 0) { submit(); return }
          setStep(1)
        }

        const detailBlocks = details.map((question) => {
          const selected = Array.isArray(selections[question.id]) ? selections[question.id] : []
          const hasOptions = Array.isArray(question.options) && question.options.length > 0
          return React.createElement('div', { key: question.id, className: 'ic-qgroup' },
            React.createElement('div', { className: 'ic-q-title' },
              question.header === undefined ? null : React.createElement('span', { className: 'ic-q-badge' }, question.header),
              React.createElement('span', null, question.question),
              question.multiSelect === true
                ? React.createElement('span', { className: 'ic-q-hint' }, t('panel.multiHint'))
                : null),
            hasOptions
              ? React.createElement('div', { className: 'ic-opts' },
                  question.options.map((option) => {
                    const isSelected = selected.includes(option.label)
                    const recommended = /(\s*（推荐）|\s*\(Recommended\))$/i.exec(option.label)
                    const baseLabel = recommended === null ? option.label : option.label.slice(0, recommended.index)
                    return React.createElement(RippleButton, {
                      key: option.label,
                      className: `ic-opt${isSelected ? ' ic-opt-sel' : ''}`,
                      'aria-pressed': isSelected,
                      disabled: busy,
                      onClick: () => { toggleOption(question, option.label) },
                    },
                    baseLabel,
                    recommended === null ? null : React.createElement('span', { className: 'ic-rec' }, '（推荐）'))
                  }))
              : React.createElement('input', {
                  type: 'text',
                  className: 'ic-input',
                  placeholder: t('panel.textPlaceholder'),
                  value: typeof customs[question.id] === 'string' ? customs[question.id] : '',
                  disabled: busy,
                  onChange: (event) => {
                    const value = event.target.value
                    setCustoms(previous => ({ ...previous, [question.id]: value }))
                  },
                }))
        })

        if (step === 0) {
          return React.createElement(ModalShell, null, PanelShell({
            t,
            title: t('panel.title'),
            step: 1,
            stepCount: 2,
            description: t('panel.briefHint'),
            countdown: countdownNode(t, snapshot, base),
            onClose: close,
            error,
            children: React.createElement(SectionsEditor, {
              detail: original,
              onChange: setText,
              disabled: busy,
            }),
            footer: [
              React.createElement(CheckBox, {
                key: 'confirm',
                checked,
                disabled: busy,
                onChange: setChecked,
                label: t('panel.check'),
              }),
              React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
              React.createElement(RippleButton, {
                key: 'cancel',
                className: 'ic-btn ic-btn-ghost',
                disabled: busy,
                onClick: close,
              }, t('panel.cancel')),
              React.createElement(RippleButton, {
                key: 'next',
                className: 'ic-btn ic-btn-primary',
                disabled: busy,
                onClick: advance,
              }, details.length === 0 ? (busy ? t('panel.saving') : t('panel.submit')) : t('panel.next')),
            ],
          }))
        }

        return React.createElement(ModalShell, null, PanelShell({
          t,
          title: t('panel.detailsTitle'),
          step: 2,
          stepCount: 2,
          description: t('panel.detailsHint'),
          countdown: countdownNode(t, snapshot, base),
          onClose: close,
          error,
          children: React.createElement('div', { className: 'ic-step' }, ...detailBlocks),
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'back',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: () => { setError(''); setStep(0) },
            }, t('panel.back')),
            React.createElement(RippleButton, {
              key: 'submit',
              className: 'ic-btn ic-btn-primary',
              disabled: busy,
              onClick: submit,
            }, busy ? t('panel.saving') : t('panel.submit')),
          ],
        }))
      }
    }

    function createMilestonePanel(ctx) {
      return function MilestonePanel({ pending }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === MILESTONE_ID)
        const original = typeof question?.detail === 'string' ? question.detail : ''

        const [text, setText] = React.useState(original)
        const [checked, setChecked] = React.useState(false)
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setText(original)
          setChecked(false)
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.dismiss().catch(() => { setBusy(false) })
        }

        const submit = () => {
          if (busy) return
          if (text.trim() === '') { setError(t('panel.briefRequired')); return }
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          const edited = text.trim() === original.trim() ? '' : text.trim()
          pending.answer({
            answers: [{
              id: MILESTONE_ID,
              selected: [APPROVE_MILESTONE],
              ...edited === '' ? {} : { custom: edited },
            }],
          }).catch(() => {
            setError(t('panel.failed'))
            setBusy(false)
          })
        }

        return React.createElement(ModalShell, null, PanelShell({
          t,
          title: t('panel.milestoneTitle'),
          step: 1,
          stepCount: 1,
          description: t('panel.milestoneHint'),
          countdown: countdownNode(t, snapshot, base, () => {
            if (typeof pending.takeTime === 'function') pending.takeTime()
          }),
          onClose: close,
          error,
          children: React.createElement(SectionsEditor, {
            detail: original,
            onChange: setText,
            disabled: busy,
            onFocus: () => { if (typeof pending.holdFocus === 'function') pending.holdFocus() },
            onBlur: () => { if (typeof pending.releaseFocus === 'function') pending.releaseFocus() },
            onEdit: () => { if (typeof pending.engage === 'function') pending.engage() },
          }),
          footer: [
            React.createElement(CheckBox, {
              key: 'confirm',
              checked,
              disabled: busy,
              onChange: setChecked,
              label: t('panel.milestoneCheck'),
            }),
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'approve',
              className: 'ic-btn ic-btn-primary',
              disabled: busy,
              onClick: submit,
            }, busy ? t('panel.saving') : t('panel.approve')),
          ],
        }))
      }
    }

    function createReportPanel(ctx, config) {
      return function ReportPanel({ pending }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === config.id)
        const original = typeof question?.detail === 'string' ? question.detail : ''

        const [checked, setChecked] = React.useState(false)
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')
        const [reasonOpen, setReasonOpen] = React.useState(false)
        const [reason, setReason] = React.useState('')
        const [reasonError, setReasonError] = React.useState('')

        React.useEffect(() => {
          setChecked(false)
          setBusy(false)
          setError('')
          setReasonOpen(false)
          setReason('')
          setReasonError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.dismiss().catch(() => { setBusy(false) })
        }

        const openReason = () => {
          if (busy) return
          if (typeof pending.takeTime === 'function') pending.takeTime()
          setReason('')
          setReasonError('')
          setError('')
          setReasonOpen(true)
        }

        const submitApprove = () => {
          if (busy) return
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{ id: config.id, selected: [config.approveLabel] }],
          }).catch(() => {
            setError(t('panel.failed'))
            setBusy(false)
          })
        }

        const submitReason = () => {
          if (busy) return
          const text = reason.trim()
          if (text === '') { setReasonError(t('panel.reasonRequired')); return }
          setBusy(true)
          setReasonError('')
          pending.answer({
            answers: [{ id: config.id, selected: [config.secondaryLabel], custom: text }],
          }).catch(() => {
            setReasonError(t('panel.failed'))
            setBusy(false)
          })
        }

        const report = React.createElement(ModalShell, null, PanelShell({
          t,
          title: t(config.titleKey),
          step: 1,
          stepCount: 1,
          description: t(config.hintKey),
          countdown: countdownNode(t, snapshot, base, () => {
            if (typeof pending.takeTime === 'function') pending.takeTime()
          }),
          onClose: close,
          error,
          children: React.createElement(SectionsView, { detail: original }),
          footer: [
            React.createElement(CheckBox, {
              key: 'confirm',
              checked,
              disabled: busy,
              onChange: setChecked,
              label: t(config.checkKey),
            }),
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'secondary',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: openReason,
            }, t(config.secondaryKey)),
            React.createElement(RippleButton, {
              key: 'primary',
              className: 'ic-btn ic-btn-primary',
              disabled: busy,
              onClick: submitApprove,
            }, busy ? t('panel.saving') : t(config.primaryKey)),
          ],
        }))

        const reasonModal = reasonOpen ? React.createElement(ModalShell, {
          top: true,
          onBackdrop: () => { if (!busy) setReasonOpen(false) },
        }, PanelShell({
          t,
          title: t(config.reasonTitleKey),
          compact: true,
          description: t(config.reasonHintKey),
          onClose: () => { if (!busy) setReasonOpen(false) },
          error: reasonError,
          children: React.createElement('textarea', {
            className: 'ic-readbox',
            style: { height: '150px', minHeight: '150px' },
            value: reason,
            placeholder: t(config.reasonPlaceholderKey),
            disabled: busy,
            spellCheck: false,
            'aria-label': t(config.reasonTitleKey),
            onChange: (event) => { setReason(event.target.value) },
          }),
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'cancel',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: () => { if (!busy) setReasonOpen(false) },
            }, t(config.reasonCancelKey)),
            React.createElement(RippleButton, {
              key: 'submit',
              className: 'ic-btn ic-btn-primary',
              disabled: busy,
              onClick: submitReason,
            }, busy ? t('panel.saving') : t(config.reasonSubmitKey)),
          ],
        })) : null

        return React.createElement(React.Fragment, null, report, reasonModal)
      }
    }

    function createPanel(ctx) {
      const IntentPanel = createIntentPanel(ctx)
      const MilestonePanel = createMilestonePanel(ctx)
      const AcceptPanel = createReportPanel(ctx, {
        id: ACCEPT_ID,
        titleKey: 'panel.acceptTitle',
        hintKey: 'panel.acceptHint',
        checkKey: 'panel.acceptCheck',
        primaryKey: 'panel.acceptPrimary',
        secondaryKey: 'panel.acceptSecondary',
        approveLabel: ACCEPT_LABEL,
        secondaryLabel: REWORK_LABEL,
        reasonTitleKey: 'panel.reworkTitle',
        reasonHintKey: 'panel.reworkHint',
        reasonSubmitKey: 'panel.reworkSubmit',
        reasonCancelKey: 'panel.reworkCancel',
        reasonPlaceholderKey: 'panel.reworkPlaceholder',
      })
      const DeliveryPanel = createReportPanel(ctx, {
        id: DELIVERY_ID,
        titleKey: 'panel.deliveryTitle',
        hintKey: 'panel.deliveryHint',
        checkKey: 'panel.deliveryCheck',
        primaryKey: 'panel.deliveryPrimary',
        secondaryKey: 'panel.deliverySecondary',
        approveLabel: DELIVER_LABEL,
        secondaryLabel: ADJUST_DELIVERY_LABEL,
        reasonTitleKey: 'panel.adjustTitle',
        reasonHintKey: 'panel.adjustHint',
        reasonSubmitKey: 'panel.adjustSubmit',
        reasonCancelKey: 'panel.adjustCancel',
        reasonPlaceholderKey: 'panel.adjustPlaceholder',
      })
      return function InfoCheckerPanel(props) {
        const matched = props.matched
        if (matched.kind === 'intent') return React.createElement(IntentPanel, { pending: matched.pending })
        if (matched.kind === 'milestone') return React.createElement(MilestonePanel, { pending: matched.pending })
        if (matched.kind === 'accept') return React.createElement(AcceptPanel, { pending: matched.pending })
        return React.createElement(DeliveryPanel, { pending: matched.pending })
      }
    }

    function createToggle(ctx) {
      return function Toggle(props) {
        useSnapshot(ctx.locale)
        const t = ctx.locale.bind(NS)
        const view = props.useProjection('infoCheck')
        const enabled = view === undefined ? true : view.enabled !== false
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')
        const [settingsOpen, setSettingsOpen] = React.useState(false)

        const run = () => {
          if (busy || props.sessionId === undefined) return
          setBusy(true)
          setError('')
          ctx.remote.commands.execute(
            props.sessionId,
            enabled ? '/dsh-info-check off' : '/dsh-info-check on',
            [],
          ).then(() => {}, () => {
            setError(t('saveFailed'))
          }).finally(() => {
            setBusy(false)
          })
        }

        const rowNode = React.createElement('div', {
          className: 'ic-toggle',
          title: enabled ? t('hint.on') : t('hint.off'),
        },
        React.createElement('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': enabled,
          'aria-label': t('title'),
          disabled: busy,
          onClick: run,
          style: {
            position: 'relative',
            width: '28px',
            height: '16px',
            flex: '0 0 auto',
            padding: 0,
            border: 'none',
            borderRadius: '999px',
            cursor: busy ? 'default' : 'pointer',
            background: enabled ? 'var(--ic-primary)' : 'var(--ic-border)',
            transition: 'background .15s',
            opacity: busy ? 0.6 : 1,
          },
        }, React.createElement('span', {
          style: {
            position: 'absolute',
            top: '2px',
            left: enabled ? '14px' : '2px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.25)',
            transition: 'left .15s',
          },
        })),
        React.createElement('button', {
          type: 'button',
          className: 'ic-toggle-label',
          title: t('panel.settingsOpen'),
          onClick: () => { setSettingsOpen(true) },
        }, t('title')),
        error === '' ? null : React.createElement('span', {
          style: { color: 'var(--ic-error)' },
        }, error))

        const settings = settingsOpen ? React.createElement(ModalShell, {
          onBackdrop: () => { setSettingsOpen(false) },
        }, PanelShell({
          t,
          title: t('panel.settingsTitle'),
          compact: true,
          description: t('panel.settingsPlaceholder'),
          onClose: () => { setSettingsOpen(false) },
          children: React.createElement('div', { className: 'ic-hint' },
            `${t('panel.current')}：${enabled ? t('state.on') : t('state.off')}`),
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'close',
              className: 'ic-btn ic-btn-primary',
              onClick: () => { setSettingsOpen(false) },
            }, t('panel.close')),
          ],
        })) : null

        return React.createElement(React.Fragment, null,
          React.createElement('style', null, PANEL_CSS),
          rowNode,
          settings)
      }
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'dsh-info-check: zh dictionary')
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'dsh-info-check: en dictionary')

        ctx.effect(() => ctx.slots.inject('conversation.composer', () => {
          try {
            return ctx.slots.register({
              name: 'conversation.composer',
              select: ({ pendingInteraction }) => {
                if (pendingInteraction === undefined || pendingInteraction === null) return null
                if (!Array.isArray(pendingInteraction.questions)) return null
                for (const question of pendingInteraction.questions) {
                  if (question === null || question === undefined) continue
                  if (question.id === BRIEF_ID) return { kind: 'intent', pending: pendingInteraction }
                  if (question.id === MILESTONE_ID) return { kind: 'milestone', pending: pendingInteraction }
                  if (question.id === ACCEPT_ID) return { kind: 'accept', pending: pendingInteraction }
                  if (question.id === DELIVERY_ID) return { kind: 'delivery', pending: pendingInteraction }
                }
                return null
              },
              priority: -100,
            }, createPanel(ctx))
          } catch (error) {
            console.warn('[dsh-info-check] review panel registration failed; the generic question card stays in use.', error)
            return () => {}
          }
        }), 'dsh-info-check: review panels')

        ctx.effect(() => ctx.slots.inject('conversation.hero.options', () => ctx.slots.register({
          name: 'conversation.hero.options',
          id: 'dsh-info-check',
          order: 10,
        }, createToggle(ctx))), 'dsh-info-check: new-session toggle')

        ctx.effect(() => ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'dsh-info-check',
          order: -9,
        }, createToggle(ctx))), 'dsh-info-check: header toggle')
      },
    }
  },
})
