window.__ModuleLoader__.load({
  id: 'dsh-info-check',
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
    const ACCEPT_PAUSE_LABEL = '暂停任务'
    const BUDGET_PROPOSAL_ID = 'budget-proposal'
    const BUDGET_REVIEW_ID = 'budget-review'
    const BUDGET_SETTLEMENT_ID = 'budget-settlement'
    const CONTRACT_PANEL_ID = 'dsh-info-check-contract'
    const SIGN_BUDGET_LABEL = '签约并开始'
    const BUDGET_PLAN_CONFIRM_LABEL = '确认预算方案'
    const ADJUST_BUDGET_LABEL = '要求调整'
    const APPROVE_BUDGET_LABEL = '批准并继续'
    const DENY_BUDGET_LABEL = '不追加，继续'
    const SATISFIED_BUDGET_LABEL = '满意'
    const NEUTRAL_BUDGET_LABEL = '一般'
    const DISSATISFIED_BUDGET_LABEL = '不满意'
    const SKIP_LABEL = '__skip__'
    const DELIVER_LABEL = '确认并交付'
    const ADJUST_DELIVERY_LABEL = '需要调整'

    const PANEL_CSS = `
.ic-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:24px;background:rgba(15,23,42,.30);animation:ic-fade .16s ease-out}
.ic-backdrop-top{z-index:2147483100}
.ic-modal{position:relative;width:min(560px,75vw);max-width:min(75vw,75vh);max-height:75vh;display:flex;flex-direction:column}
.ic-modal .ic-card{max-height:75vh}
.ic-resize{position:absolute;top:0;right:-6px;z-index:3;width:12px;height:100%;display:flex;align-items:center;justify-content:center;cursor:ew-resize;touch-action:none}
.ic-resize::after{content:'';width:3px;height:42px;border-radius:99px;background:var(--ic-border);opacity:.35;transition:opacity .15s,background .15s}
.ic-resize:hover::after,.ic-resize:focus-visible::after{opacity:1;background:var(--ic-primary)}
.ic-resize:focus-visible{outline:2px solid var(--ic-primary);outline-offset:2px}
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
.ic-settings{display:flex;flex-direction:column;gap:18px;padding-bottom:2px}
.ic-set-section{display:flex;flex-direction:column;gap:11px}
.ic-set-head{font-size:15px;font-weight:700;line-height:1.4;color:#000}
.ic-set-row{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
.ic-set-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.ic-set-label{font-size:12.5px;font-weight:600;color:var(--ic-ink);line-height:1.45}
.ic-set-hint{font-size:11px;line-height:1.55;color:var(--ic-text-3)}
.ic-set-control{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.ic-seg{display:inline-flex;overflow:hidden;border:1px solid var(--ic-line);border-radius:8px;background:var(--ic-surface)}
.ic-seg button{min-width:30px;border:none;border-right:1px solid var(--ic-line-soft);background:transparent;padding:6px 8px;font:inherit;font-size:11.5px;font-weight:600;color:var(--ic-text-2);cursor:pointer;transition:background .15s,color .15s}
.ic-seg button:last-child{border-right:none}
.ic-seg button:hover{background:var(--ic-bg);color:var(--ic-ink)}
.ic-seg button.on{background:var(--ic-primary-tint);color:var(--ic-primary-ink);font-weight:700}
.ic-input-num{width:70px;text-align:center;padding:8px 8px}
.ic-preset{display:inline-flex;gap:5px;align-items:center}
.ic-preset button{border:1px solid var(--ic-line);border-radius:6px;background:var(--ic-surface);padding:4px 7px;font:inherit;font-size:10.5px;font-weight:600;color:var(--ic-text-2);cursor:pointer}
.ic-preset button:hover{border-color:var(--ic-text-3);color:var(--ic-ink)}
.ic-preset button.on{background:var(--ic-primary-tint);border-color:#C9D3FF;color:var(--ic-primary-ink)}
.ic-expect{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%}
.ic-expect button{display:flex;flex-direction:column;gap:4px;text-align:left;border:1px solid var(--ic-line);border-radius:8px;background:var(--ic-surface);padding:9px 10px;font:inherit;cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s}
.ic-expect button:hover{border-color:var(--ic-text-3)}
.ic-expect button.on{border-color:var(--ic-primary);background:var(--ic-primary-tint);box-shadow:0 0 0 2px rgba(77,107,254,.08)}
.ic-expect b{font-size:12px;font-weight:700;color:var(--ic-ink)}
.ic-expect span{font-size:10.5px;line-height:1.45;color:var(--ic-text-3)}
.ic-expect button.on b{color:var(--ic-primary-ink)}
.ic-settings-switch{position:relative;width:30px;height:18px;flex:none;border:none;border-radius:999px;background:var(--ic-border);padding:0;cursor:pointer;transition:background .15s}
.ic-settings-switch i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.22);transition:left .15s}
.ic-settings-switch.on{background:var(--ic-primary)}
.ic-settings-switch.on i{left:14px}
.ic-settings-switch:disabled{opacity:.5;cursor:default}
.ic-set-path{width:210px;max-width:100%}
.ic-set-files{display:flex;flex-direction:column;gap:6px;width:min(360px,100%)}
.ic-quality-input{min-height:64px;max-height:180px;resize:vertical;line-height:1.6}
.ic-set-files .ic-file-link{width:100%}
.ic-file-kind{flex:none;font-size:10px;font-weight:700;color:var(--ic-text-3);white-space:nowrap}
.ic-file-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ic-text-2);font-size:10.5px;text-align:left}
.ic-file-link:disabled{opacity:.55;cursor:default}
.ic-set-current{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--ic-line);border-radius:8px;background:var(--ic-read)}
.ic-set-current b{font-size:12px;font-weight:700}
.ic-set-current span{font-size:10.5px;color:var(--ic-text-3)}
.ic-settings-msg{font-size:11px;line-height:1.55;color:var(--ic-text-3)}
.ic-settings-error{font-size:11px;line-height:1.55;color:var(--ic-error)}
.ic-settings-loading{font-size:12px;color:var(--ic-text-3);padding:12px 0}
.ic-set-control .ic-input-num{width:72px;flex:0 0 72px}
.ic-set-control .ic-set-path{width:210px;flex:0 0 210px}
@media (max-width:600px){.ic-expect{grid-template-columns:1fr}.ic-set-row{flex-direction:column;gap:7px}.ic-set-control{justify-content:flex-start}.ic-set-control .ic-set-path{width:100%;flex:1 1 auto}}
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
.ic-points{display:flex;flex-direction:column;gap:8px}
.ic-point{display:flex;align-items:flex-start;gap:8px}
.ic-point-no{flex:none;display:flex;align-items:center;justify-content:center;width:24px;height:24px;margin-top:9px;border:1px solid var(--ic-line);border-radius:6px;background:var(--ic-bg);color:var(--ic-text-2);font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.ic-point-box{box-sizing:border-box;flex:1;width:100%;min-height:64px;resize:none;padding:10px 12px;border:1px solid var(--ic-line-soft);border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font-family:inherit;font-size:13px;line-height:1.7;outline:none;overflow:hidden;transition:border-color .15s,box-shadow .15s}
.ic-point-box:hover{border-color:var(--ic-line)}
.ic-point-box:focus{border-color:var(--ic-primary);box-shadow:0 0 0 3px rgba(77,107,254,.12)}
.ic-point-text{flex:1;white-space:pre-wrap;padding:10px 12px;border:1px solid var(--ic-line-soft);border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font-size:13px;line-height:1.7;overflow-wrap:anywhere}
.ic-file-list{display:flex;flex-direction:column;gap:8px}
.ic-file-link{flex:1;display:flex;align-items:center;gap:8px;min-width:0;padding:9px 12px;border:1px solid var(--ic-line-soft);border-radius:8px;background:var(--ic-read);color:var(--ic-ink);font:inherit;font-size:12.5px;line-height:1.5;text-align:left;cursor:pointer;transition:border-color .15s,background .15s}
.ic-file-link:hover{border-color:var(--ic-primary);background:var(--ic-primary-tint)}
.ic-file-link:disabled{cursor:default;opacity:.55}
.ic-file-icon{flex:none;font-size:14px;line-height:1}
.ic-file-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:"Cascadia Code","Consolas",monospace;font-size:11.5px;color:var(--ic-text-2)}
.ic-point-remove{flex:none;width:20px;height:20px;margin-top:9px;border:none;border-radius:5px;background:transparent;color:var(--ic-text-3);font-size:15px;line-height:1;cursor:pointer}
.ic-point-remove:hover{background:var(--ic-bg);color:var(--ic-error)}
.ic-point-add{align-self:flex-start;border:1px dashed var(--ic-line);border-radius:6px;background:transparent;padding:4px 8px;font:inherit;font-size:10.5px;font-weight:600;color:var(--ic-text-3);cursor:pointer}
.ic-point-add:hover{border-color:var(--ic-text-3);color:var(--ic-ink)}
.ic-notes{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.ic-notes .ic-readbox{min-height:80px;height:auto}
.ic-notes-hint{font-size:11px;line-height:1.5;color:var(--ic-text-3)}
.ic-other{display:flex;align-items:center;gap:8px;margin-top:8px}
.ic-other-label{flex:none;font-size:11px;font-weight:600;color:var(--ic-text-3);white-space:nowrap}
.ic-other-input{flex:1;min-width:0}
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
.ic-progress{--ic-primary:#4D6BFE;--ic-primary-ink:#3B55D4;--ic-ink:#1F1F1F;--ic-text-3:#94A3B8;--ic-line:#E5E7EB;--ic-surface:#FFFFFF;position:fixed;z-index:60;display:flex;align-items:center;gap:10px;box-sizing:border-box;padding:5px 12px 6px;border:1px solid rgba(215,220,227,.9);border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 4px 16px rgba(15,23,42,.07);backdrop-filter:blur(10px);color:var(--ic-text-3);font-family:"Urbanist","Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif;pointer-events:none;user-select:none}
.ic-progress-label{flex:none;font-size:10.5px;font-weight:700;letter-spacing:.01em;color:var(--ic-text-3);white-space:nowrap}
.ic-progress-count{flex:none;min-width:24px;text-align:right;font-size:10px;font-weight:700;color:var(--ic-text-3);font-variant-numeric:tabular-nums}
.ic-progress-close{flex:none;width:18px;height:18px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--ic-text-3);font:inherit;font-size:14px;line-height:1;cursor:pointer;pointer-events:auto;display:grid;place-items:center}
.ic-progress-close:hover{background:var(--ic-line);color:var(--ic-ink)}
.ic-progress-track{position:relative;flex:1;height:3px;border-radius:999px;background:var(--ic-line);margin:0 4px}
.ic-progress-fill{position:absolute;left:0;top:0;height:100%;border-radius:999px;background:linear-gradient(90deg,#7B91FF,var(--ic-primary));transition:width 1.45s cubic-bezier(.22,.61,.36,1)}
.ic-progress-fast .ic-progress-fill{transition-duration:.32s}
.ic-progress-stone{position:absolute;top:50%;width:16px;height:22px;transform:translate(-50%,-50%);display:grid;place-items:center;color:#AEB7C4;transition:color .3s ease,transform .3s ease}
.ic-progress-stone svg{display:block;width:14px;height:18px;overflow:visible}
.ic-progress-stone path{fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}
.ic-progress-stone.done{color:var(--ic-primary)}
.ic-progress-stone.current{color:var(--ic-primary-ink);transform:translate(-50%,-50%) scale(1.12)}
.ic-progress-stone.current svg{animation:ic-stone-pulse 1.8s ease-in-out infinite}
@keyframes ic-stone-pulse{0%,100%{filter:drop-shadow(0 0 0 rgba(77,107,254,0))}50%{filter:drop-shadow(0 0 4px rgba(77,107,254,.55))}}
@media (max-width:520px){.ic-progress-label{display:none}.ic-progress{gap:6px;padding-left:10px;padding-right:10px}}
@media (prefers-reduced-motion:reduce){.ic-progress-fill{transition:none}.ic-progress-stone.current svg{animation:none}}
@media (max-height:640px){.ic-card{min-height:0}}
@media (prefers-reduced-motion:reduce){.ic-card,.ic-backdrop,.ic-cbox input:checked + .ic-box,.ic-ripple,.ic-step{animation:none}.ic-btn,.ic-opt,.ic-readbox,.ic-bar-fill,.ic-icon-btn,.ic-track i,.ic-box,.ic-box path{transition:none}}
`

    const zh = {
      'title': '需求核对',
      'progress.label': '任务进度',
      'progress.milestone': '里程碑',
      'progress.clear': '清除进度条',
      'state.on': '已开启',
      'state.off': '已关闭',
      'hint.on': '开工前核对意图，确认一次执行方案，逐个验收里程碑，交付前确认完成程度；每次选择都会写入 .dsh-info-check/ledger.md',
      'hint.off': '已关闭：不会核对意图、确认方案或验收里程碑',
      'saveFailed': '切换失败，请重试',
      'panel.title': '任务书',
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
      'panel.acceptPause': '暂停任务',
      'panel.deliveryPrimary': '确认并交付',
      'panel.deliverySecondary': '需要调整',
      'panel.budgetProposalTitle': '预算签约',
      'panel.budgetPlanTitle': '预算方案',
      'panel.budgetPlanHint': '确认总预算和每个里程碑预算；可直接修改数字，总和不能超过总预算。',
      'panel.budgetPlanTotal': '总预算',
      'panel.budgetPlanMilestones': '里程碑预算',
      'panel.budgetPlanAllocated': '已分配',
      'panel.budgetPlanRemaining': '备用预算',
      'panel.budgetPlanInvalid': '里程碑预算之和不能超过总预算，且每项必须是非负整数。',
      'panel.budgetPlanAdjustment': '乙方调整说明',
      'panel.budgetPlanConfirm': '确认预算方案',
      'panel.budgetPlanSkip': '取消',
      'panel.budgetProposalHint': '作为乙方提交报价与分解；甲方签约后才开始执行。',
      'panel.budgetProposalCheck': '我已确认报价、范围与预算分解',
      'panel.budgetProposalPrimary': '签约并开始',
      'panel.budgetProposalSecondary': '要求调整',
      'panel.budgetReviewTitle': '预算使用',
      'panel.budgetReviewHint': '审核本阶段预算使用；选择是否追加预算，批准后可继续下一里程碑。',
      'panel.budgetReviewText': '预算使用说明',
      'panel.budgetReviewSpent': '累计已用',
      'panel.budgetReviewInitial': '初始预算',
      'panel.budgetReviewChoice': '是否追加预算？',
      'panel.budgetReviewNoExtra': '不追加预算',
      'panel.budgetReviewExtra': '追加预算',
      'panel.budgetReviewExtraAmount': '追加金额',
      'panel.budgetReviewNotes': '备注（可选）',
      'panel.budgetReviewConfirm': '确认预算审核',
      'panel.budgetReviewInvalid': '累计已用和追加金额必须是非负人民币金额。',
      'panel.budgetSettlementItem': '项目',
      'panel.budgetSettlementAmount': '金额（CNY）',
      'panel.budgetSettlementTotal': '预算合计（初始 + 追加）',
      'panel.budgetSettlementActual': '实际使用',
      'panel.budgetSettlementVariance': '差额',
      'panel.budgetSettlementSource': '数据来源',
      'panel.budgetSettlementRating': '评价',
      'panel.budgetSettlementNotes': '预算评价说明（可选）',
      'panel.budgetSettlementConfirm': '提交结算',
      'panel.budgetReviewCheck': '我已核对本阶段预算使用',
      'panel.budgetReviewPrimary': '批准并继续',
      'panel.budgetReviewSecondary': '要求调整',
      'panel.budgetReviewTertiary': '不追加，继续',
      'panel.budgetSettlementTitle': '预算结算',
      'panel.budgetSettlementHint': '审核实际使用与差额，并评价本次预算是否合理。',
      'panel.budgetSettlementCheck': '我已确认本次预算结算',
      'panel.budgetSettlementPrimary': '满意',
      'panel.budgetSettlementSecondary': '一般',
      'panel.budgetSettlementTertiary': '不满意',
      'panel.budgetPause': '暂停任务',
      'panel.budgetAdjustTitle': '预算调整说明',
      'panel.budgetAdjustHint': '说明哪里需要调整、希望的目标金额或分解；乙方会按此重新报价。',
      'panel.budgetAdjustSubmit': '提交预算调整',
      'panel.budgetAdjustCancel': '取消',
      'panel.budgetAdjustPlaceholder': '例如：实现部分压缩到 40 元，测试保留 10。',
      'panel.budgetSettlementReasonTitle': '预算评价说明',
      'panel.budgetSettlementReasonHint': '说明评价“一般”的原因；这会写入预算标准。',
      'panel.budgetSettlementPlaceholder': '例如：报价偏高，实际只用了约一半；说明不够细。',
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
      'panel.close': '关闭并跳过',
      'panel.countdown': '自动跳过',
      'panel.countdownPaused': '已暂停',
      'panel.continued': '已超时，仍可提交',
      'panel.stopTimer': '停止计时',
      'panel.countdownStopped': '计时已停止',
      'panel.addPoint': '+ 添加一点',
      'panel.removePoint': '删除这一点',
      'panel.notes': '备注',
      'panel.notesHint': '其他要求或补充说明（可选）。',
      'panel.notesPlaceholder': '例如：验收时请额外检查…',
      'panel.other': '其他',
      'panel.otherPlaceholder': '自己输入…',
      'panel.openFile': '打开文件所在位置',
      'settings.title': '设置',
      'settings.desc': '偏好、计时与台账；保存后立即生效。',
      'settings.preferences': '偏好',
      'settings.milestones': '里程碑数量',
      'settings.milestonesHint': '希望 agent 把任务拆成几个里程碑（1–5）。',
      'settings.expectation': '期望程度',
      'settings.expectationHint': '影响方案深度、验收标准和交付确认。',
      'settings.qualityStandard': '质量标准',
      'settings.qualityStandardHint': '填写你自己的质量要求，保存后写入 quality-standard.md 的手工补充区。',
      'settings.qualityWriteFailed': '设置已保存，但质量标准文件写入失败。',
      'settings.perfect': '完美',
      'settings.perfectDesc': '可发布/可开源；边界、回归、文档都要覆盖。',
      'settings.good': '较好',
      'settings.goodDesc': '主路径与关键边界通过；允许小的非阻塞问题。',
      'settings.pass': '及格',
      'settings.passDesc': '满足最低可用标准；明确列出未做与限制。',
      'settings.timer': '自动计时',
      'settings.timeout': '自动跳过时长',
      'settings.timeoutHint': '计时浮窗在无操作后自动继续的秒数（5–600）。',
      'settings.seconds': '秒',
      'settings.presets': '常用',
      'settings.review': '核对、台账与复盘',
      'settings.maxQuestions': '细节问题数量',
      'settings.maxQuestionsHint': '需求核对时最多问几个细节问题（1–6）。',
      'settings.defaultEnabled': '新对话默认开启',
      'settings.defaultEnabledHint': '新建对话时默认启用；已有对话仍用标题旁开关。',
      'settings.ledger': '启用工作区台账',
      'settings.ledgerHint': '把每次确认和决定写入会话目录。',
      'settings.ledgerPath': '台账路径',
      'settings.ledgerPathHint': '相对于会话工作目录；越界路径会被跳过。',
      'settings.files': '文件位置',
      'settings.fileLedger': '台账',
      'settings.fileRetrospective': '复盘分析',
      'settings.fileQuality': '质量标准',
      'settings.fileBudget': '预算标准',
      'contract.nav': '任务档案',
      'contract.title': '任务档案',
      'contract.subtitle': '任务台账详细记录',
      'contract.taskNumber': '任务编号',
      'contract.search': '搜索任务档案',
      'contract.noMatch': '没有匹配的任务档案。',
      'contract.statsTasks': '任务',
      'contract.statsSigned': '已签约',
      'contract.statsSettled': '已结算',
      'contract.statsBudget': '预算合计',
      'contract.timeline': '台账时间线',
      'contract.taskBookConfirmed': '任务书确认',
      'contract.budgetSigned': '预算签约',
      'contract.deliveryConfirmed': '交付确认',
      'contract.settlementDone': '预算结算',
      'contract.client': '甲方：用户',
      'contract.contractor': '乙方：Agent',
      'contract.terms': '验收与变更条款',
      'contract.term1': '每个里程碑完成后由甲方验收；未通过则返工。',
      'contract.term2': '范围或预算变更须经甲方确认；追加预算须单独批准。',
      'contract.refresh': '刷新',
      'contract.loading': '正在读取任务合同…',
      'contract.error': '读取任务合同失败，请稍后重试。',
      'contract.empty': '还没有任务合同。完成一次任务书和预算方案后，这里会显示合同内容。',
      'contract.unnamed': '未命名任务',
      'contract.taskBook': '任务书',
      'contract.milestone': '里程碑内容',
      'contract.budget': '预算方案',
      'contract.total': '总预算',
      'contract.allocated': '已分配',
      'contract.reserve': '备用预算',
      'contract.extra': '已批准追加',
      'contract.signed': '预算已签约',
      'contract.unsigned': '预算待签约',
      'contract.updated': '更新时间',
      'contract.report': '验收与结算记录',
      'contract.accepted': '通过',
      'contract.rework': '返工',
      'contract.paused': '暂停',
      'contract.timeout': '超时',
      'contract.approved': '批准',
      'contract.denied': '不追加',
      'contract.result': '结果',
      'contract.files': '交付文件',
      'contract.completion': '完成内容',
      'contract.delivered': '交付内容',
      'contract.initialBudget': '初始预算',
      'contract.approvedExtra': '批准追加',
      'contract.financialTotal': '预算合计',
      'contract.variance': '差额',
      'contract.over': '超支',
      'contract.under': '结余',
      'contract.balanced': '持平',
      'contract.settlementNotes': '结算说明',
      'contract.evidence': '验证证据',
      'contract.gaps': '未完成/风险',
      'contract.budgetReview': '预算审核',
      'contract.settlement': '预算结算',
      'contract.finalSpent': '实际使用',
      'contract.rating': '评价',
      'contract.satisfied': '满意',
      'contract.neutral': '一般',
      'contract.unsatisfied': '不满意',
      'contract.delivery': '交付',
      'contract.noReports': '尚无验收或结算记录。',
      'settings.openLocation': '打开所在位置',
      'settings.openFailed': '无法打开文件位置；文件可能尚未生成。',
      'settings.autoRetrospective': '自动复盘',
      'settings.autoRetrospectiveHint': '交付确认后自动生成复盘；关闭后改为交付时询问。',
      'settings.supervision': '监督方式',
      'settings.supervisionHint': '严格门禁会阻止同轮连续验收和没有新文件变更的验收；仅提醒只保留策略提示。',
      'settings.supervisionStrict': '严格门禁',
      'settings.supervisionAdvisory': '仅提醒',
      'settings.current': '当前对话',
      'settings.currentOn': '已开启',
      'settings.currentOff': '已关闭',
      'settings.currentHint': '只影响当前对话；全局设置保存后立即生效。',
      'settings.currentToggle': '切换当前对话',
      'settings.save': '保存设置',
      'settings.saving': '保存中…',
      'settings.saved': '设置已保存',
      'settings.cancel': '取消',
      'settings.reset': '恢复默认',
      'settings.close': '关闭',
      'settings.loading': '正在读取设置…',
      'settings.loadFailed': '读取设置失败',
      'settings.saveFailed': '保存设置失败',
      'settings.unavailable': '设置服务或插件 Config 不可用；请确认插件已启用且 DSH 版本匹配。',
      'settings.noEntry': '没有找到 dsh-info-check 的设置项；请重新加载插件。',
      'settings.invalid': '请检查数值范围。',
      'settings.ledgerRequired': '台账路径不能为空。',
    }
    const en = {
      'title': 'Info checker',
      'progress.label': 'Task progress',
      'progress.milestone': 'Milestone',
      'progress.clear': 'Clear progress bar',
      'state.on': 'On',
      'state.off': 'Off',
      'hint.on': 'Clarifies intent, confirms the plan once, accepts each milestone, and signs off delivery; choices go to .dsh-info-check/ledger.md',
      'hint.off': 'Off: no intent check, plan confirmation, acceptance, or delivery sign-off',
      'saveFailed': 'Could not toggle; try again',
      'panel.title': 'Task book',
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
      'panel.acceptPause': 'Pause task',
      'panel.deliveryPrimary': 'Confirm and deliver',
      'panel.deliverySecondary': 'Needs adjustment',
      'panel.budgetProposalTitle': 'Budget sign-off',
      'panel.budgetPlanTitle': 'Budget plan',
      'panel.budgetPlanHint': 'Confirm the total and per-milestone budgets; edit the numbers directly, but the total cannot be exceeded.',
      'panel.budgetPlanTotal': 'Total budget',
      'panel.budgetPlanMilestones': 'Milestone budgets',
      'panel.budgetPlanAllocated': 'Allocated',
      'panel.budgetPlanRemaining': 'Reserve',
      'panel.budgetPlanInvalid': 'Milestone budgets must be non-negative integers and cannot exceed the total.',
      'panel.budgetPlanAdjustment': 'Contractor adjustment',
      'panel.budgetPlanConfirm': 'Confirm budget plan',
      'panel.budgetPlanSkip': 'Cancel',
      'panel.budgetProposalHint': 'Quote and breakdown from the contractor; execution starts after the client signs.',
      'panel.budgetProposalCheck': 'I confirm the quote, scope, and budget breakdown',
      'panel.budgetProposalPrimary': 'Sign and start',
      'panel.budgetProposalSecondary': 'Request changes',
      'panel.budgetReviewTitle': 'Budget usage',
      'panel.budgetReviewHint': 'Review this stage and choose whether to add budget; approval unlocks the next milestone.',
      'panel.budgetReviewText': 'Budget usage notes',
      'panel.budgetReviewSpent': 'Used so far',
      'panel.budgetReviewInitial': 'Initial budget',
      'panel.budgetReviewChoice': 'Add budget?',
      'panel.budgetReviewNoExtra': 'No extra budget',
      'panel.budgetReviewExtra': 'Add budget',
      'panel.budgetReviewExtraAmount': 'Extra amount',
      'panel.budgetReviewNotes': 'Notes (optional)',
      'panel.budgetReviewConfirm': 'Confirm budget review',
      'panel.budgetReviewInvalid': 'Used and extra amounts must be non-negative CNY amounts.',
      'panel.budgetSettlementItem': 'Item',
      'panel.budgetSettlementAmount': 'Amount (CNY)',
      'panel.budgetSettlementTotal': 'Total budget (initial + extra)',
      'panel.budgetSettlementActual': 'Actual usage',
      'panel.budgetSettlementVariance': 'Variance',
      'panel.budgetSettlementSource': 'Source',
      'panel.budgetSettlementRating': 'Rating',
      'panel.budgetSettlementNotes': 'Budget rating notes (optional)',
      'panel.budgetSettlementConfirm': 'Submit settlement',
      'panel.budgetReviewCheck': 'I have checked this stage budget',
      'panel.budgetReviewPrimary': 'Approve and continue',
      'panel.budgetReviewSecondary': 'Request changes',
      'panel.budgetReviewTertiary': 'No extra, continue',
      'panel.budgetSettlementTitle': 'Budget settlement',
      'panel.budgetSettlementHint': 'Review actual usage and variance, then rate whether the budget was reasonable.',
      'panel.budgetSettlementCheck': 'I confirm this budget settlement',
      'panel.budgetSettlementPrimary': 'Satisfied',
      'panel.budgetSettlementSecondary': 'Neutral',
      'panel.budgetSettlementTertiary': 'Unsatisfied',
      'panel.budgetPause': 'Pause task',
      'panel.budgetAdjustTitle': 'Budget adjustment notes',
      'panel.budgetAdjustHint': 'Say what should change and the target amount or breakdown; the contractor will re-quote.',
      'panel.budgetAdjustSubmit': 'Submit budget changes',
      'panel.budgetAdjustCancel': 'Cancel',
      'panel.budgetAdjustPlaceholder': 'Example: reduce implementation to 40 points and keep 10 for tests.',
      'panel.budgetSettlementReasonTitle': 'Budget rating notes',
      'panel.budgetSettlementReasonHint': 'Explain a neutral rating; this feeds the budget standard.',
      'panel.budgetSettlementPlaceholder': 'Example: the quote was high; actual usage was about half and the breakdown was vague.',
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
      'panel.close': 'Close and skip',
      'panel.countdown': 'Auto-skip in',
      'panel.countdownPaused': 'Paused',
      'panel.continued': 'Timed out — still answerable',
      'panel.stopTimer': 'Stop timer',
      'panel.countdownStopped': 'Timer stopped',
      'panel.addPoint': '+ Add point',
      'panel.removePoint': 'Remove point',
      'panel.notes': 'Notes',
      'panel.notesHint': 'Other requirements or extra notes (optional).',
      'panel.notesPlaceholder': 'For example: also check …',
      'panel.other': 'Other',
      'panel.otherPlaceholder': 'Type your own…',
      'panel.openFile': 'Open file location',
      'settings.title': 'Settings',
      'settings.desc': 'Preferences, timing, and ledger. Saved values apply immediately.',
      'settings.preferences': 'Preferences',
      'settings.milestones': 'Milestones',
      'settings.milestonesHint': 'How many milestones the agent should plan (1–5).',
      'settings.expectation': 'Expectation',
      'settings.expectationHint': 'Controls plan depth, acceptance, and delivery sign-off.',
      'settings.qualityStandard': 'Quality standard',
      'settings.qualityStandardHint': 'Your own quality requirements; saved into the manual section of quality-standard.md.',
      'settings.qualityWriteFailed': 'Settings saved, but writing the quality standard file failed.',
      'settings.perfect': 'Excellent',
      'settings.perfectDesc': 'Release/open-source ready; boundaries, regression, and docs covered.',
      'settings.good': 'Good',
      'settings.goodDesc': 'Main paths and key boundaries pass; small non-blocking issues are allowed.',
      'settings.pass': 'Pass',
      'settings.passDesc': 'Minimum usable standard; list every missing item and limitation.',
      'settings.timer': 'Auto-timer',
      'settings.timeout': 'Auto-skip after',
      'settings.timeoutHint': 'Seconds before a timed dialog proceeds when idle (5–600).',
      'settings.seconds': 'sec',
      'settings.presets': 'Presets',
      'settings.review': 'Review, ledger and retrospectives',
      'settings.maxQuestions': 'Detail questions',
      'settings.maxQuestionsHint': 'How many detail questions the intent check may ask (1–6).',
      'settings.defaultEnabled': 'On by default for new conversations',
      'settings.defaultEnabledHint': 'New conversations start enabled; existing ones use the header switch.',
      'settings.ledger': 'Enable workspace ledger',
      'settings.ledgerHint': 'Write every confirmation and decision into the session directory.',
      'settings.ledgerPath': 'Ledger path',
      'settings.ledgerPathHint': 'Relative to the session directory; escaping paths are skipped.',
      'settings.files': 'Files',
      'settings.fileLedger': 'Ledger',
      'settings.fileRetrospective': 'Retrospective',
      'settings.fileQuality': 'Quality standard',
      'settings.fileBudget': 'Budget standard',
      'contract.nav': 'Task archive',
      'contract.title': 'Task archive',
      'contract.subtitle': 'Detailed task ledger records',
      'contract.taskNumber': 'Task number',
      'contract.search': 'Search task archive',
      'contract.noMatch': 'No matching task archive entries.',
      'contract.statsTasks': 'Tasks',
      'contract.statsSigned': 'Signed',
      'contract.statsSettled': 'Settled',
      'contract.statsBudget': 'Total budget',
      'contract.timeline': 'Ledger timeline',
      'contract.taskBookConfirmed': 'Task book confirmed',
      'contract.budgetSigned': 'Budget signed',
      'contract.deliveryConfirmed': 'Delivery confirmed',
      'contract.settlementDone': 'Budget settled',
      'contract.client': 'Client: User',
      'contract.contractor': 'Contractor: Agent',
      'contract.terms': 'Acceptance and change terms',
      'contract.term1': 'The client accepts each completed milestone; failed acceptance means rework.',
      'contract.term2': 'Scope or budget changes need client confirmation; extra budget needs separate approval.',
      'contract.refresh': 'Refresh',
      'contract.loading': 'Loading task contract…',
      'contract.error': 'Could not load the task contract. Try again.',
      'contract.empty': 'No task contract yet. Complete a task book and budget plan and it will appear here.',
      'contract.unnamed': 'Untitled task',
      'contract.taskBook': 'Task book',
      'contract.milestone': 'Milestone content',
      'contract.budget': 'Budget plan',
      'contract.total': 'Total budget',
      'contract.allocated': 'Allocated',
      'contract.reserve': 'Reserve',
      'contract.extra': 'Approved extra',
      'contract.signed': 'Budget signed',
      'contract.unsigned': 'Budget unsigned',
      'contract.updated': 'Updated',
      'contract.report': 'Acceptance and settlement records',
      'contract.accepted': 'Accepted',
      'contract.rework': 'Rework',
      'contract.paused': 'Paused',
      'contract.timeout': 'Timed out',
      'contract.approved': 'Approved',
      'contract.denied': 'No extra',
      'contract.result': 'Result',
      'contract.files': 'Delivered files',
      'contract.completion': 'Completion',
      'contract.delivered': 'Delivered content',
      'contract.initialBudget': 'Initial budget',
      'contract.approvedExtra': 'Approved extra',
      'contract.financialTotal': 'Total budget',
      'contract.variance': 'Variance',
      'contract.over': 'Over',
      'contract.under': 'Under',
      'contract.balanced': 'Balanced',
      'contract.settlementNotes': 'Settlement notes',
      'contract.evidence': 'Evidence',
      'contract.gaps': 'Gaps / risks',
      'contract.budgetReview': 'Budget review',
      'contract.settlement': 'Budget settlement',
      'contract.finalSpent': 'Actual usage',
      'contract.rating': 'Rating',
      'contract.satisfied': 'Satisfied',
      'contract.neutral': 'Neutral',
      'contract.unsatisfied': 'Unsatisfied',
      'contract.delivery': 'Delivery',
      'contract.noReports': 'No acceptance or settlement records yet.',
      'settings.openLocation': 'Open file location',
      'settings.openFailed': 'Could not open the file location; the file may not exist yet.',
      'settings.autoRetrospective': 'Auto retrospective',
      'settings.autoRetrospectiveHint': 'Generate a retrospective after delivery; when off, ask at delivery time.',
      'settings.supervision': 'Supervision',
      'settings.supervisionHint': 'Strict blocks same-turn acceptance and acceptance without new file changes; advisory keeps the policy reminder only.',
      'settings.supervisionStrict': 'Strict',
      'settings.supervisionAdvisory': 'Advisory',
      'settings.current': 'This conversation',
      'settings.currentOn': 'On',
      'settings.currentOff': 'Off',
      'settings.currentHint': 'Only this conversation; global settings apply after saving.',
      'settings.currentToggle': 'Toggle this conversation',
      'settings.save': 'Save settings',
      'settings.saving': 'Saving…',
      'settings.saved': 'Settings saved',
      'settings.cancel': 'Cancel',
      'settings.reset': 'Restore defaults',
      'settings.close': 'Close',
      'settings.loading': 'Reading settings…',
      'settings.loadFailed': 'Could not read settings',
      'settings.saveFailed': 'Could not save settings',
      'settings.unavailable': 'Settings or the plugin Config is unavailable; check that the plugin is enabled and the DSH version matches.',
      'settings.noEntry': 'No dsh-info-check settings namespace was found; reload the plugin.',
      'settings.invalid': 'Check the value ranges.',
      'settings.ledgerRequired': 'The ledger path cannot be empty.',
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

    function parsePoints(body) {
      const points = []
      let current = null
      let inFence = false
      for (const raw of String(body ?? '').split(/\r?\n/)) {
        const line = raw.trim()
        if (/^(```|~~~)/.test(line)) {
          inFence = !inFence
          if (current === null) current = { text: raw }
          else current.text += `${current.text === '' ? '' : '\n'}${raw}`
          continue
        }
        if (!inFence) {
          const match = /^(\d+)[.)]\s+(.*)$/.exec(line)
          if (match) {
            if (current !== null) points.push(current)
            current = { text: match[2] }
            continue
          }
        }
        if (current === null) {
          if (line !== '') current = { text: raw }
        } else {
          current.text += `\n${raw}`
        }
      }
      if (current !== null) points.push(current)
      return points
        .map(point => ({ text: point.text.replace(/^\n+|\n+$/g, '') }))
        .filter(point => point.text !== '')
    }

    function joinPoints(points) {
      return points
        .filter(point => point.text.trim() !== '')
        .map((point, index) => `${index + 1}. ${point.text}`)
        .join('\n\n')
    }

    function sectionsWithPoints(detail) {
      return parseSections(detail).map(section => {
        const points = parsePoints(section.body)
        return { ...section, points: points.length === 0 ? [{ text: '' }] : points }
      })
    }

    function AutoTextarea({ className, value, ...props }) {
      const ref = React.useRef(null)
      const fit = React.useCallback(() => {
        const node = ref.current
        if (node === null) return
        node.style.height = 'auto'
        node.style.height = `${Math.max(64, node.scrollHeight + 2)}px`
      }, [])
      React.useLayoutEffect(() => { fit() }, [value, fit])
      return React.createElement('textarea', {
        ...props,
        ref,
        value,
        className,
        onInput: event => {
          if (typeof props.onInput === 'function') props.onInput(event)
          fit()
        },
      })
    }

    function NotesField({ t, value, onChange, disabled }) {
      return React.createElement('div', { className: 'ic-notes' },
        React.createElement('div', { className: 'ic-sec-label' }, t('panel.notes')),
        React.createElement('div', { className: 'ic-notes-hint' }, t('panel.notesHint')),
        React.createElement(AutoTextarea, {
          className: 'ic-readbox',
          value,
          disabled,
          spellCheck: false,
          placeholder: t('panel.notesPlaceholder'),
          'aria-label': t('panel.notes'),
          onChange: event => { onChange(event.target.value) },
        }))
    }

    function SectionsEditor({ t, detail, onChange, disabled, onFocus, onBlur, onEdit }) {
      const [sections, setSections] = React.useState(() => sectionsWithPoints(detail))
      React.useEffect(() => {
        setSections(sectionsWithPoints(detail))
      }, [detail])

      const publish = (next) => {
        setSections(next)
        if (typeof onEdit === 'function') onEdit()
        onChange(joinSections(next.map(section => ({
          marker: section.marker,
          title: section.title,
          body: joinPoints(section.points),
        }))))
      }

      const updatePoint = (sectionIndex, pointIndex, text) => {
        publish(sections.map((section, index) => index === sectionIndex
          ? { ...section, points: section.points.map((point, pointIndex_) => pointIndex_ === pointIndex ? { text } : point) }
          : section))
      }

      const addPoint = (sectionIndex) => {
        publish(sections.map((section, index) => index === sectionIndex
          ? { ...section, points: [...section.points, { text: '' }] }
          : section))
      }

      const removePoint = (sectionIndex, pointIndex) => {
        const section = sections[sectionIndex]
        if (section === undefined || section.points.length <= 1) return
        publish(sections.map((item, index) => index === sectionIndex
          ? { ...item, points: item.points.filter((_, pointIndex_) => pointIndex_ !== pointIndex) }
          : item))
      }

      return React.createElement('div', { className: 'ic-sections' },
        ...sections.map((section, sectionIndex) => React.createElement('div', {
          key: `${section.marker}:${sectionIndex}`,
          className: 'ic-sec',
        },
        section.title === '' ? null : React.createElement('div', { className: 'ic-sec-label' }, section.title),
        React.createElement('div', { className: 'ic-points' },
          ...section.points.map((point, pointIndex) => React.createElement('div', {
            key: pointIndex,
            className: 'ic-point',
          },
          React.createElement('div', { className: 'ic-point-no' }, String(pointIndex + 1)),
          React.createElement(AutoTextarea, {
            className: 'ic-point-box',
            value: point.text,
            disabled,
            spellCheck: false,
            'aria-label': `${section.title === '' ? 'content' : section.title} ${pointIndex + 1}`,
            onFocus: typeof onFocus === 'function' ? onFocus : undefined,
            onBlur: typeof onBlur === 'function' ? onBlur : undefined,
            onChange: event => { updatePoint(sectionIndex, pointIndex, event.target.value) },
          }),
          section.points.length <= 1 ? null : React.createElement('button', {
            type: 'button',
            className: 'ic-point-remove',
            'aria-label': t('panel.removePoint'),
            disabled,
            onClick: () => { removePoint(sectionIndex, pointIndex) },
          }, '×'))),
          React.createElement('button', {
            type: 'button',
            className: 'ic-point-add',
            disabled,
            onClick: () => { addPoint(sectionIndex) },
          }, t('panel.addPoint'))))))
    }

    function SectionsView({ detail, onOpenFile, t }) {
      const sections = parseSections(detail).map(section => ({
        ...section,
        points: parsePoints(section.body),
      }))
      return React.createElement('div', { className: 'ic-sections' },
        ...sections.map((section, sectionIndex) => React.createElement('div', {
          key: `${section.marker}:${sectionIndex}`,
          className: 'ic-sec',
        },
        section.title === '' ? null : React.createElement('div', { className: 'ic-sec-label' }, section.title),
        section.title === '结果文件'
          ? React.createElement('div', { className: 'ic-file-list' },
              ...section.points.map((point, pointIndex) => React.createElement('div', {
                key: pointIndex,
                className: 'ic-point',
              },
              React.createElement('div', { className: 'ic-point-no' }, String(pointIndex + 1)),
              React.createElement('button', {
                type: 'button',
                className: 'ic-file-link',
                title: t('panel.openFile'),
                disabled: typeof onOpenFile !== 'function',
                onClick: () => { if (typeof onOpenFile === 'function') onOpenFile(point.text) },
              },
              React.createElement('span', { className: 'ic-file-icon' }, '📂'),
              React.createElement('span', { className: 'ic-file-path' }, point.text)))))
          : React.createElement('div', { className: 'ic-points' },
              ...section.points.map((point, pointIndex) => React.createElement('div', {
                key: pointIndex,
                className: 'ic-point',
              },
              React.createElement('div', { className: 'ic-point-no' }, String(pointIndex + 1)),
              React.createElement('div', { className: 'ic-point-text' }, point.text)))))))
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
      const [width, setWidth] = React.useState(undefined)
      const modalRef = React.useRef(null)
      const dragRef = React.useRef(null)

      React.useEffect(() => () => {
        const drag = dragRef.current
        if (drag !== null && typeof drag.cleanup === 'function') drag.cleanup()
      }, [])

      React.useEffect(() => {
        if (width === undefined) return
        const modal = modalRef.current
        if (modal === null) return
        const height = modal.getBoundingClientRect().height
        if (height > 0 && width > height + 1) {
          setWidth(Math.max(320, Math.min(width, height)))
        }
      }, [width])

      const startResize = (event) => {
        if (event.button !== undefined && event.button !== 0) return
        const modal = modalRef.current
        if (modal === null) return
        event.preventDefault()
        event.stopPropagation()
        const rect = modal.getBoundingClientRect()
        const max = Math.min(window.innerWidth * 0.75, window.innerHeight * 0.75, rect.height || window.innerHeight * 0.75)
        const move = (moveEvent) => {
          const drag = dragRef.current
          if (drag === null) return
          const next = Math.max(320, Math.min(drag.max, drag.startWidth + moveEvent.clientX - drag.startX))
          setWidth(next)
        }
        const cleanup = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
        }
        const up = () => {
          cleanup()
          dragRef.current = null
        }
        dragRef.current = { startX: event.clientX, startWidth: rect.width, max, cleanup }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
      }

      const node = React.createElement('div', {
        className: `ic-backdrop${top === true ? ' ic-backdrop-top' : ''}`,
        onMouseDown: (event) => {
          if (onBackdrop !== undefined && event.target === event.currentTarget) onBackdrop()
        },
      }, React.createElement('div', {
        className: 'ic-modal',
        ref: modalRef,
        style: width === undefined ? undefined : { width: `${width}px` },
      },
      children,
      React.createElement('div', {
        className: 'ic-resize',
        role: 'separator',
        'aria-orientation': 'vertical',
        'aria-label': '拖动调整宽度 / Drag to resize',
        tabIndex: 0,
        onPointerDown: startResize,
        onDoubleClick: () => { setWidth(undefined) },
      })))
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
        const [notes, setNotes] = React.useState('')
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setText(original)
          setChecked(false)
          setStep(0)
          setSelections({})
          setCustoms({})
          setNotes('')
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.answer({
            answers: [{ id: BRIEF_ID, selected: [SKIP_LABEL] }],
          }).catch(() => { setBusy(false) })
        }

        const toggleOption = (question, label) => {
          setSelections((previous) => {
            const current = Array.isArray(previous[question.id]) ? previous[question.id] : []
            if (question.multiSelect === true) {
              const next = current.includes(label) ? current.filter(item => item !== label) : [...current, label]
              return { ...previous, [question.id]: next }
            }
            return { ...previous, [question.id]: current.includes(label) ? [] : [label] }
          })
          if (question.multiSelect !== true) {
            setCustoms(previous => ({ ...previous, [question.id]: '' }))
          }
        }

        const submit = () => {
          if (busy) return
          if (text.trim() === '') { setError(t('panel.briefRequired')); return }
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          const composed = notes.trim() === '' ? text.trim() : `${text.trim()}\n\n【补充备注】\n\n${notes.trim()}`
          const answers = [
            { id: BRIEF_ID, selected: [], custom: composed },
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
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'ic-opts' },
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
                    })),
                  React.createElement('div', { className: 'ic-other' },
                    React.createElement('span', { className: 'ic-other-label' }, t('panel.other')),
                    React.createElement('input', {
                      type: 'text',
                      className: 'ic-input ic-other-input',
                      placeholder: t('panel.otherPlaceholder'),
                      value: typeof customs[question.id] === 'string' ? customs[question.id] : '',
                      disabled: busy,
                      onChange: (event) => {
                        const value = event.target.value
                        setCustoms(previous => ({ ...previous, [question.id]: value }))
                        if (question.multiSelect !== true && value.trim() !== '') {
                          setSelections(previous => ({ ...previous, [question.id]: [] }))
                        }
                      },
                    })))
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
            children: React.createElement(React.Fragment, null,
              React.createElement(SectionsEditor, {
                t,
                detail: original,
                onChange: setText,
                disabled: busy,
              }),
              details.length === 0 ? React.createElement(NotesField, {
                t,
                value: notes,
                onChange: setNotes,
                disabled: busy,
              }) : null),
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
          children: React.createElement('div', { className: 'ic-step' },
            ...detailBlocks,
            React.createElement(NotesField, {
              t,
              value: notes,
              onChange: setNotes,
              disabled: busy,
            })),
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
        const [notes, setNotes] = React.useState('')
        const [checked, setChecked] = React.useState(false)
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setText(original)
          setNotes('')
          setChecked(false)
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.answer({
            answers: [{ id: MILESTONE_ID, selected: [SKIP_LABEL] }],
          }).catch(() => { setBusy(false) })
        }

        const submit = () => {
          if (busy) return
          if (text.trim() === '') { setError(t('panel.briefRequired')); return }
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          const base = text.trim()
          const composed = notes.trim() === '' ? base : `${base}\n\n【补充备注】\n\n${notes.trim()}`
          const edited = notes.trim() === '' && base === original.trim() ? '' : composed
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
          children: React.createElement(React.Fragment, null,
            React.createElement(SectionsEditor, {
              t,
              detail: original,
              onChange: setText,
              disabled: busy,
              onFocus: () => { if (typeof pending.holdFocus === 'function') pending.holdFocus() },
              onBlur: () => { if (typeof pending.releaseFocus === 'function') pending.releaseFocus() },
              onEdit: () => { if (typeof pending.engage === 'function') pending.engage() },
            }),
            React.createElement(NotesField, {
              t,
              value: notes,
              onChange: setNotes,
              disabled: busy,
            })),
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
      return function ReportPanel({ pending, sessionId }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === config.id)
        const original = typeof question?.detail === 'string' ? question.detail : ''

        const [checked, setChecked] = React.useState(false)
        const [notes, setNotes] = React.useState('')
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')
        const [reasonOpen, setReasonOpen] = React.useState(false)
        const [reason, setReason] = React.useState('')
        const [reasonError, setReasonError] = React.useState('')

        React.useEffect(() => {
          setChecked(false)
          setNotes('')
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
          pending.answer({
            answers: [{ id: config.id, selected: [SKIP_LABEL] }],
          }).catch(() => { setBusy(false) })
        }

        const openReason = () => {
          if (busy) return
          if (typeof pending.takeTime === 'function') pending.takeTime()
          setReason('')
          setReasonError('')
          setError('')
          setReasonOpen(true)
        }

        const openFile = (file) => {
          const sid = sessionId ?? pending.sessionId
          if (sid === undefined || typeof ctx.remote.commands?.execute !== 'function') return
          ctx.remote.commands.execute(sid, `/dsh-info-check open ${file}`, []).catch(() => {})
        }

        const submitApprove = () => {
          if (busy) return
          if (!checked) { setError(t('panel.checkRequired')); return }
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{
              id: config.id,
              selected: [config.approveLabel],
              ...notes.trim() === '' ? {} : { custom: notes.trim() },
            }],
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

        const submitPause = () => {
          if (busy) return
          if (typeof pending.takeTime === 'function') pending.takeTime()
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{
              id: config.id,
              selected: [config.pauseLabel],
              ...notes.trim() === '' ? {} : { custom: notes.trim() },
            }],
          }).catch(() => {
            setError(t('panel.failed'))
            setBusy(false)
          })
        }

        const submitTertiary = () => {
          if (busy) return
          if (typeof pending.takeTime === 'function') pending.takeTime()
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{
              id: config.id,
              selected: [config.tertiaryLabel],
              ...notes.trim() === '' ? {} : { custom: notes.trim() },
            }],
          }).catch(() => {
            setError(t('panel.failed'))
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
          children: React.createElement(React.Fragment, null,
            React.createElement(SectionsView, { detail: original, onOpenFile: openFile, t }),
            React.createElement(NotesField, {
              t,
              value: notes,
              onChange: setNotes,
              disabled: busy,
            })),
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
            config.tertiaryLabel === undefined ? null : React.createElement(RippleButton, {
              key: 'tertiary',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: submitTertiary,
            }, t(config.tertiaryKey)),
            config.pauseLabel === undefined ? null : React.createElement(RippleButton, {
              key: 'pause',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: submitPause,
            }, t(config.pauseKey)),
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

    function createBudgetPlanPanel(ctx) {
      return function BudgetPlanPanel({ pending, sessionId }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === BUDGET_PROPOSAL_ID)
        let plan = question?.budgetPlan
        if (plan === undefined && typeof question?.detail === 'string') {
          const match = /<!--dsh-budget-plan:([\s\S]*?)-->/.exec(question.detail)
          if (match !== null) {
            try { plan = JSON.parse(match[1]) } catch { plan = undefined }
          }
        }
        plan = plan ?? { total: 0, milestones: [] }
        const [total, setTotal] = React.useState(plan.total ?? 0)
        const [amounts, setAmounts] = React.useState(() => (plan.milestones ?? []).map(item => item.amount ?? 0))
        const [titles, setTitles] = React.useState(() => (plan.milestones ?? []).map(item => item.title ?? ''))
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setTotal(plan.total ?? 0)
          setAmounts((plan.milestones ?? []).map(item => item.amount ?? 0))
          setTitles((plan.milestones ?? []).map(item => item.title ?? ''))
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const sum = amounts.reduce((value, amount) => value + (Number(amount) || 0), 0)
        const totalValue = Number(total)
        const invalid = !Number.isFinite(totalValue) || totalValue < 0
          || amounts.some(amount => !Number.isFinite(Number(amount)) || Number(amount) < 0)
          || sum > totalValue

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.answer({
            answers: [{ id: BUDGET_PROPOSAL_ID, selected: [SKIP_LABEL] }],
          }).catch(() => { setBusy(false) })
        }

        const step = (index, delta) => {
          if (busy) return
          setAmounts(current => current.map((value, at) => at === index ? Math.max(0, (Number(value) || 0) + delta) : value))
        }

        const submit = () => {
          if (busy) return
          if (invalid) {
            setError(t('panel.budgetPlanInvalid'))
            return
          }
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{
              id: BUDGET_PROPOSAL_ID,
              selected: [BUDGET_PLAN_CONFIRM_LABEL],
              custom: JSON.stringify({
                total: totalValue,
                milestones: (plan.milestones ?? []).map((item, index) => ({
                  ...item,
                  title: String(titles[index] ?? item.title ?? '').trim() || item.title,
                  amount: Number(amounts[index]) || 0,
                })),
              }),
            }],
          }).catch(() => {
            setError(t('panel.failed'))
            setBusy(false)
          })
        }

        const milestoneRows = (plan.milestones ?? []).map((item, index) => React.createElement('div', {
          key: item.id,
          style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #f0f2f5' },
        },
        React.createElement('span', { style: { flex: '0 0 28px', fontSize: '11px', fontWeight: 700, color: '#4D6BFE' } }, item.id),
        React.createElement('input', {
          type: 'text',
          className: 'ic-input',
          style: { flex: '1 1 auto', minWidth: 0, height: '28px', padding: '0 6px' },
          value: titles[index] ?? '',
          disabled: busy,
          onChange: event => setTitles(current => current.map((value, at) => at === index ? event.target.value : value)),
        }),
        React.createElement('button', {
          type: 'button',
          className: 'ic-btn ic-btn-ghost',
          style: { width: '24px', height: '24px', padding: 0 },
          disabled: busy,
          onClick: () => step(index, -1),
        }, '−'),
        React.createElement('input', {
          type: 'number',
          min: 0,
          step: 0.01,
          className: 'ic-input',
          style: { width: '80px', height: '28px', padding: '0 6px', textAlign: 'right' },
          value: amounts[index] ?? 0,
          disabled: busy,
          onChange: event => setAmounts(current => current.map((value, at) => at === index ? event.target.value : value)),
        }),
        React.createElement('button', {
          type: 'button',
          className: 'ic-btn ic-btn-ghost',
          style: { width: '24px', height: '24px', padding: 0 },
          disabled: busy,
          onClick: () => step(index, 1),
        }, '+')))

        const children = React.createElement(React.Fragment, null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0 12px' } },
            React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: '#334155' } }, t('panel.budgetPlanTotal')),
            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, '¥'),
            React.createElement('input', {
              type: 'number',
              min: 0,
              step: 0.01,
              className: 'ic-input',
              style: { width: '120px', height: '32px', padding: '0 8px', textAlign: 'right', fontWeight: 700 },
              value: total,
              disabled: busy,
              onChange: event => setTotal(event.target.value),
            }),
            React.createElement('span', { style: { fontSize: '11px', color: '#94a3b8' } }, 'CNY')),
          React.createElement('div', { style: { fontSize: '11px', fontWeight: 700, color: '#64748b', padding: '4px 0 2px' } }, t('panel.budgetPlanMilestones')),
          milestoneRows,
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: '10px', fontSize: '11px', color: '#64748b' } },
            React.createElement('span', null, `${t('panel.budgetPlanAllocated')} ${sum}`),
            React.createElement('span', null, `${t('panel.budgetPlanRemaining')} ¥${Number.isFinite(totalValue) ? (totalValue - sum).toFixed(2) : '—'}`)),
          invalid
            ? React.createElement('div', { style: { paddingTop: '8px', fontSize: '11px', color: '#dc2626' } }, t('panel.budgetPlanInvalid'))
            : null,
          plan.round === 2 && plan.adjustment
            ? React.createElement('div', { style: { marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: '#f6f8ff', color: '#475569', fontSize: '12px', lineHeight: 1.7 } },
              React.createElement('b', null, `${t('panel.budgetPlanAdjustment')} `), plan.adjustment)
            : null)

        return React.createElement(ModalShell, null, PanelShell({
          t,
          title: t('panel.budgetPlanTitle'),
          step: 1,
          stepCount: 1,
          description: t('panel.budgetPlanHint'),
          countdown: countdownNode(t, snapshot, base, () => {
            if (typeof pending.takeTime === 'function') pending.takeTime()
          }),
          onClose: close,
          error,
          children,
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'skip',
              className: 'ic-btn ic-btn-ghost',
              disabled: busy,
              onClick: close,
            }, t('panel.budgetPlanSkip')),
            React.createElement(RippleButton, {
              key: 'confirm',
              className: 'ic-btn ic-btn-primary',
              disabled: busy || invalid,
              onClick: submit,
            }, busy ? t('panel.saving') : t('panel.budgetPlanConfirm')),
          ],
        }))
      }
    }

    function createBudgetReviewPanel(ctx) {
      return function BudgetReviewPanel({ pending }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === BUDGET_REVIEW_ID)
        const data = question?.budgetReview ?? { spent: 0, requestedExtra: 0 }
        const [spent, setSpent] = React.useState(data.spent ?? 0)
        const [extraMode, setExtraMode] = React.useState((data.requestedExtra ?? 0) > 0 ? 'extra' : 'none')
        const [extra, setExtra] = React.useState(data.requestedExtra ?? 0)
        const [notes, setNotes] = React.useState('')
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setSpent(data.spent ?? 0)
          setExtraMode((data.requestedExtra ?? 0) > 0 ? 'extra' : 'none')
          setExtra(data.requestedExtra ?? 0)
          setNotes('')
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const spentValue = Number(spent)
        const extraValue = Number(extra)
        const invalid = !Number.isFinite(spentValue) || spentValue < 0
          || (extraMode === 'extra' && (!Number.isFinite(extraValue) || extraValue < 0))

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.answer({ answers: [{ id: BUDGET_REVIEW_ID, selected: [SKIP_LABEL] }] }).catch(() => setBusy(false))
        }

        const submit = () => {
          if (busy) return
          if (invalid) { setError(t('panel.budgetReviewInvalid')); return }
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{
              id: BUDGET_REVIEW_ID,
              selected: ['批准并继续'],
              custom: JSON.stringify({
                spent: spentValue,
                requestedExtra: extraMode === 'extra' ? extraValue : 0,
                notes: notes.trim() || undefined,
              }),
            }],
          }).catch(() => { setError(t('panel.failed')); setBusy(false) })
        }

        const children = React.createElement(React.Fragment, null,
          React.createElement('div', {
            style: { border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' },
          },
          (Array.isArray(data.rows) && data.rows.length > 0
            ? data.rows
            : String(question?.detail ?? '').split('\n').filter(line => line.trim() !== '').map(line => {
              const match = /^([^：:]{1,40})[：:]\s*(.*)$/.exec(line.trim())
              return match === null ? { label: line.trim(), value: '' } : { label: match[1], value: match[2] }
            })).map((row, index) => React.createElement('div', {
            key: `${row.label}-${index}`,
            style: { display: 'grid', gridTemplateColumns: 'minmax(120px, 38%) 1fr', borderBottom: index === (data.rows?.length ?? 0) - 1 ? 'none' : '1px solid #f1f5f9' },
          },
          React.createElement('div', {
            style: { padding: '7px 10px', background: '#f8fafc', color: '#64748b', fontSize: '11px', borderRight: '1px solid #f1f5f9' },
          }, row.label),
          React.createElement('div', {
            style: { padding: '7px 10px', color: '#334155', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 600 },
          }, row.value)))),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
            React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: '#334155' } }, t('panel.budgetReviewInitial')),
            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, '¥'),
            React.createElement('input', {
              type: 'number', min: 0, step: 0.01, className: 'ic-input',
              style: { width: '130px', height: '30px', padding: '0 8px', textAlign: 'right', background: '#f8fafc', color: '#64748b' },
              value: data.initialBudget ?? 0, disabled: true, readOnly: true,
            }),
            React.createElement('span', { style: { fontSize: '11px', color: '#94a3b8' } }, 'CNY')),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
            React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: '#334155' } }, t('panel.budgetReviewSpent')),
            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, '¥'),
            React.createElement('input', {
              type: 'number', min: 0, step: 0.01, className: 'ic-input',
              style: { width: '130px', height: '30px', padding: '0 8px', textAlign: 'right' },
              value: spent, disabled: busy,
              onChange: event => setSpent(event.target.value),
            }),
            React.createElement('span', { style: { fontSize: '11px', color: '#94a3b8' } }, 'CNY')),
          React.createElement('div', { style: { fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' } }, t('panel.budgetReviewChoice')),
          React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: '12px', color: '#475569' } },
            React.createElement('input', { type: 'radio', name: 'budget-extra', checked: extraMode === 'none', disabled: busy, onChange: () => setExtraMode('none') }),
            t('panel.budgetReviewNoExtra')),
          React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: '12px', color: '#475569' } },
            React.createElement('input', { type: 'radio', name: 'budget-extra', checked: extraMode === 'extra', disabled: busy, onChange: () => setExtraMode('extra') }),
            t('panel.budgetReviewExtra')),
          extraMode === 'extra'
            ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 8px 24px' } },
              React.createElement('span', { style: { fontSize: '11px', color: '#64748b' } }, t('panel.budgetReviewExtraAmount')),
              React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, '¥'),
              React.createElement('input', {
                type: 'number', min: 0, step: 0.01, className: 'ic-input',
                style: { width: '110px', height: '28px', padding: '0 8px', textAlign: 'right' },
                value: extra, disabled: busy,
                onChange: event => setExtra(event.target.value),
              }),
              React.createElement('span', { style: { fontSize: '11px', color: '#94a3b8' } }, 'CNY'))
            : null,
          React.createElement('textarea', {
            className: 'ic-readbox',
            style: { height: '64px', width: '100%', marginTop: '8px' },
            value: notes,
            placeholder: t('panel.budgetReviewNotes'),
            disabled: busy,
            onChange: event => setNotes(event.target.value),
          }))

        return React.createElement(ModalShell, null, PanelShell({
          t,
          title: t('panel.budgetReviewTitle'),
          step: 1, stepCount: 1,
          description: t('panel.budgetReviewHint'),
          countdown: countdownNode(t, snapshot, base, () => { if (typeof pending.takeTime === 'function') pending.takeTime() }),
          onClose: close,
          error,
          children,
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, { key: 'cancel', className: 'ic-btn ic-btn-ghost', disabled: busy, onClick: close }, t('panel.budgetPlanSkip')),
            React.createElement(RippleButton, { key: 'confirm', className: 'ic-btn ic-btn-primary', disabled: busy || invalid, onClick: submit }, busy ? t('panel.saving') : t('panel.budgetReviewConfirm')),
          ],
        }))
      }
    }

    function createBudgetSettlementPanel(ctx) {
      return function BudgetSettlementPanel({ pending }) {
        const snapshot = usePending(pending)
        const base = useCountdownBase(snapshot)
        const t = ctx.locale.bind(NS)
        const question = pending.questions.find(item => item !== null && item.id === BUDGET_SETTLEMENT_ID)
        const data = question?.budgetSettlement ?? { initial: 0, extra: 0, finalSpent: 0 }
        const [rating, setRating] = React.useState(SATISFIED_BUDGET_LABEL)
        const [notes, setNotes] = React.useState('')
        const [busy, setBusy] = React.useState(false)
        const [error, setError] = React.useState('')

        React.useEffect(() => {
          setRating(SATISFIED_BUDGET_LABEL)
          setNotes('')
          setBusy(false)
          setError('')
        }, [pending.key])

        if (snapshot.closed) return null

        const close = () => {
          if (busy) return
          setBusy(true)
          pending.answer({ answers: [{ id: BUDGET_SETTLEMENT_ID, selected: [SKIP_LABEL] }] }).catch(() => setBusy(false))
        }

        const submit = () => {
          if (busy) return
          setBusy(true)
          setError('')
          pending.answer({
            answers: [{ id: BUDGET_SETTLEMENT_ID, selected: [rating], ...(notes.trim() === '' ? {} : { custom: notes.trim() }) }],
          }).catch(() => { setError(t('panel.failed')); setBusy(false) })
        }

        const total = Number(data.initial) + Number(data.extra)
        const variant = Number(data.finalSpent) - total
        const rows = [
          [t('panel.budgetSettlementTotal'), `¥${total.toFixed(2)}`],
          [t('panel.budgetSettlementActual'), `¥${Number(data.finalSpent).toFixed(2)}`],
          [t('panel.budgetSettlementVariance'), `${variant > 0 ? '超支' : variant < 0 ? '结余' : '持平'} ¥${Math.abs(variant).toFixed(2)}`],
          [t('panel.budgetSettlementSource'), data.source === 'dsh-ui-usage-billing' ? 'dsh-ui-usage-billing' : '手动/估算'],
        ]
        const table = React.createElement('table', {
          style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' },
        },
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', { style: { textAlign: 'left', padding: '8px', borderBottom: '1px solid #dbe2ea', color: '#64748b' } }, t('panel.budgetSettlementItem')),
          React.createElement('th', { style: { textAlign: 'right', padding: '8px', borderBottom: '1px solid #dbe2ea', color: '#64748b' } }, t('panel.budgetSettlementAmount')))),
        React.createElement('tbody', null, rows.map(([label, value]) => React.createElement('tr', { key: label },
          React.createElement('td', { style: { padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#475569' } }, label),
          React.createElement('td', { style: { padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, value)))))

        const choices = [SATISFIED_BUDGET_LABEL, NEUTRAL_BUDGET_LABEL, DISSATISFIED_BUDGET_LABEL]
        const ratingRow = React.createElement('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px', fontSize: '12px' } },
          React.createElement('span', { style: { fontWeight: 700, color: '#334155' } }, t('panel.budgetSettlementRating')),
          choices.map(label => React.createElement('label', { key: label, style: { display: 'flex', gap: '5px', alignItems: 'center', color: '#475569' } },
            React.createElement('input', { type: 'radio', name: 'budget-rating', checked: rating === label, disabled: busy, onChange: () => setRating(label) }),
            label)))

        const children = React.createElement(React.Fragment, null,
          React.createElement('div', { style: { fontSize: '12px', color: '#64748b', marginBottom: '10px' } }, question?.detail ?? ''),
          table,
          ratingRow,
          React.createElement('textarea', {
            className: 'ic-readbox', style: { height: '64px', width: '100%' },
            value: notes, placeholder: t('panel.budgetSettlementNotes'), disabled: busy,
            onChange: event => setNotes(event.target.value),
          }))

        return React.createElement(ModalShell, null, PanelShell({
          t, title: t('panel.budgetSettlementTitle'), step: 1, stepCount: 1,
          description: t('panel.budgetSettlementHint'),
          countdown: countdownNode(t, snapshot, base, () => { if (typeof pending.takeTime === 'function') pending.takeTime() }),
          onClose: close, error, children,
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, { key: 'cancel', className: 'ic-btn ic-btn-ghost', disabled: busy, onClick: close }, t('panel.budgetPlanSkip')),
            React.createElement(RippleButton, { key: 'confirm', className: 'ic-btn ic-btn-primary', disabled: busy, onClick: submit }, busy ? t('panel.saving') : t('panel.budgetSettlementConfirm')),
          ],
        }))
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
        pauseLabel: ACCEPT_PAUSE_LABEL,
        pauseKey: 'panel.acceptPause',
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
      const BudgetPlanPanel = createBudgetPlanPanel(ctx)
      const BudgetReviewPanel = createBudgetReviewPanel(ctx)
      const BudgetSettlementPanel = createBudgetSettlementPanel(ctx)
      return function InfoCheckerPanel(props) {
        const matched = props.matched
        if (matched.kind === 'intent') return React.createElement(IntentPanel, { pending: matched.pending })
        if (matched.kind === 'milestone') return React.createElement(MilestonePanel, { pending: matched.pending })
        if (matched.kind === 'budget-proposal') return React.createElement(BudgetPlanPanel, { pending: matched.pending, sessionId: props.sessionId })
        if (matched.kind === 'accept') return React.createElement(AcceptPanel, { pending: matched.pending, sessionId: props.sessionId })
        if (matched.kind === 'budget-review') return React.createElement(BudgetReviewPanel, { pending: matched.pending, sessionId: props.sessionId })
        if (matched.kind === 'budget-settlement') return React.createElement(BudgetSettlementPanel, { pending: matched.pending, sessionId: props.sessionId })
        return React.createElement(DeliveryPanel, { pending: matched.pending, sessionId: props.sessionId })
      }
    }

    function normalizeSettings(value) {
      const source = value ?? {}
      const clamp = (input, min, max, fallback) => {
        const number = Number(input)
        if (!Number.isFinite(number)) return fallback
        return Math.min(max, Math.max(min, Math.trunc(number)))
      }
      const expectation = source.expectation === 'perfect' || source.expectation === 'pass'
        ? source.expectation
        : 'good'
      return {
        milestoneCount: clamp(source.milestoneCount, 1, 5, 3),
        expectation,
        timeoutSeconds: clamp(source.timeoutSeconds, 5, 600, 60),
        maxQuestions: clamp(source.maxQuestions, 1, 6, 3),
        defaultEnabled: source.defaultEnabled !== false,
        ledgerEnabled: source.ledgerEnabled !== false,
        autoRetrospective: source.autoRetrospective !== false,
        supervisionMode: source.supervisionMode === 'advisory' ? 'advisory' : 'strict',
        qualityStandard: typeof source.qualityStandard === 'string' ? source.qualityStandard : '',
        ledgerPath: typeof source.ledgerPath === 'string' && source.ledgerPath.trim() !== ''
          ? source.ledgerPath.trim()
          : '.dsh-info-check/ledger.md',
      }
    }

    const SettingsComponent = React.Component
    class SettingsBoundary extends (SettingsComponent ?? class {}) {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error) {
        console.warn('[dsh-info-check] settings panel failed', error)
      }

      render() {
        if (!this.state.failed) return this.props.children
        const t = this.props.t
        return React.createElement(ModalShell, { onBackdrop: this.props.onClose }, PanelShell({
          t,
          title: t('settings.title'),
          compact: true,
          description: t('settings.unavailable'),
          onClose: this.props.onClose,
          children: React.createElement('div', { className: 'ic-settings-error' }, t('settings.loadFailed')),
          footer: [
            React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
            React.createElement(RippleButton, {
              key: 'close',
              className: 'ic-btn ic-btn-primary',
              onClick: this.props.onClose,
            }, t('settings.close')),
          ],
        }))
      }
    }

    function createSettingsPanel(ctx) {
      return function SettingsPanel({ onClose, enabled, busy, sessionId, onToggle }) {
        const t = ctx.locale.bind(NS)
        let remote
        try {
          remote = ctx.remote?.settings
        } catch {
          remote = undefined
        }
        const [values, setValues] = React.useState({
          milestoneCount: 3,
          expectation: 'good',
          timeoutSeconds: 60,
          maxQuestions: 3,
          defaultEnabled: true,
          ledgerEnabled: true,
          autoRetrospective: true,
          supervisionMode: 'strict',
          qualityStandard: '',
          ledgerPath: '.dsh-info-check/ledger.md',
        })
        const [loading, setLoading] = React.useState(true)
        const [saving, setSaving] = React.useState(false)
        const [error, setError] = React.useState('')
        const [openError, setOpenError] = React.useState('')
        const [saved, setSaved] = React.useState(false)
        const [ns, setNs] = React.useState('')
        const [revision, setRevision] = React.useState(undefined)

        React.useEffect(() => {
          let alive = true
          if (remote === undefined || typeof remote.describe !== 'function') {
            setError(t('settings.unavailable'))
            setLoading(false)
            return () => { alive = false }
          }
          let request
          try {
            request = remote.describe()
          } catch {
            setError(t('settings.loadFailed'))
            setLoading(false)
            return () => { alive = false }
          }
          Promise.resolve(request).then((response) => {
            if (!alive) return
            if (response !== null && typeof response === 'object' && response.ok === false) {
              setError(response.error?.message ?? t('settings.loadFailed'))
              setLoading(false)
              return
            }
            const result = response !== null && typeof response === 'object' && response.ok === true
              ? response.value
              : response
            const namespaces = Array.isArray(result)
              ? result
              : result?.namespaces ?? result?.sections ?? []
            const entry = namespaces.find((item) => {
              const name = String(item?.ns ?? '')
              if (name.includes('dsh-info-check') || name.includes('info-check')) return true
              return item?.value !== undefined && ('milestoneCount' in item.value || 'timeoutSeconds' in item.value)
            })
            if (entry === undefined) {
              setError(t('settings.noEntry'))
              setLoading(false)
              return
            }
            const value = entry.value ?? entry.user ?? {}
            setNs(entry.ns)
            setRevision(entry.revision)
            setValues(normalizeSettings(value))
            setLoading(false)
          }).catch(() => {
            if (!alive) return
            setError(t('settings.loadFailed'))
            setLoading(false)
          })
          return () => { alive = false }
        }, [])

        const update = (key, value) => {
          setSaved(false)
          setValues(previous => ({ ...previous, [key]: value }))
        }

        const reset = () => {
          setSaved(false)
          setError('')
          setValues(normalizeSettings({}))
        }

        const syncQuality = (text) => {
          if (props.sessionId === undefined) return Promise.resolve()
          else {
            const bytes = new TextEncoder().encode(text)
            let binary = ''
            for (const byte of bytes) binary += String.fromCharCode(byte)
            const encoded = btoa(binary)
            const controller = new AbortController()
            return Promise.resolve(ctx.remote.commands.execute(
              props.sessionId,
              `/dsh-info-check quality custom ${encoded}`,
              [],
              controller.signal,
            )).then((response) => {
              const result = response?.result ?? response
              if (result !== null && typeof result === 'object' && result.kind === 'error') {
                throw new Error(result.text ?? 'quality write failed')
              }
            })
          }
        }

        const save = () => {
          if (saving || ns === '') return
          const next = normalizeSettings(values)
          if (next.ledgerPath === '') {
            setError(t('settings.ledgerRequired'))
            return
          }
          setSaving(true)
          setError('')
          setSaved(false)
          if (remote === undefined || typeof remote.update !== 'function') {
            setSaving(false)
            setError(t('settings.unavailable'))
            return
          }
          let request
          try {
            request = remote.update(ns, next, revision)
          } catch {
            setSaving(false)
            setError(t('settings.saveFailed'))
            return
          }
          Promise.resolve(request).then((response) => {
            if (response !== null && typeof response === 'object' && response.ok === false) {
              setSaving(false)
              setError(response.error?.message ?? t('settings.saveFailed'))
              return
            }
            const result = response !== null && typeof response === 'object' && response.ok === true
              ? response.value
              : response
            if (result !== undefined && result !== null && typeof result.revision === 'number') {
              setRevision(result.revision)
            }
            syncQuality(next.qualityStandard).then(() => {
              setSaving(false)
              setSaved(true)
            }).catch(() => {
              setSaving(false)
              setError(t('settings.qualityWriteFailed'))
            })
          }).catch(() => {
            setSaving(false)
            setError(t('settings.saveFailed'))
          })
        }

        const close = () => {
          if (saving) return
          onClose()
        }

        const current = enabled ? t('settings.currentOn') : t('settings.currentOff')
        const ledgerPath = values.ledgerPath || '.dsh-info-check/ledger.md'
        const slashIndex = Math.max(ledgerPath.lastIndexOf('/'), ledgerPath.lastIndexOf('\\'))
        const assetBase = slashIndex >= 0 ? ledgerPath.slice(0, slashIndex) : '.'
        const separator = assetBase.includes('\\') ? '\\' : '/'
        const assets = [
          ['ledger', t('settings.fileLedger'), ledgerPath],
          ['retrospectives', t('settings.fileRetrospective'), `${assetBase}${separator}retrospectives.md`],
          ['quality', t('settings.fileQuality'), `${assetBase}${separator}quality-standard.md`],
          ['budget', t('settings.fileBudget'), `${assetBase}${separator}budget-standard.md`],
        ]
        const openAsset = (kind) => {
          if (props.sessionId === undefined) {
            setOpenError(t('settings.openFailed'))
            return
          }
          setOpenError('')
          let request
          try {
            const controller = new AbortController()
            request = ctx.remote.commands.execute(
              props.sessionId,
              `/dsh-info-check open ${kind}`,
              [],
              controller.signal,
            )
          } catch {
            setOpenError(t('settings.openFailed'))
            return
          }
          Promise.resolve(request).then((response) => {
            const result = response?.result ?? response
            if (result !== null && typeof result === 'object' && result.kind === 'error') {
              setOpenError(result.text ?? t('settings.openFailed'))
            }
          }).catch(() => {
            setOpenError(t('settings.openFailed'))
          })
        }
        const body = loading
          ? React.createElement('div', { className: 'ic-settings-loading' }, t('settings.loading'))
          : ns === ''
            ? React.createElement('div', { className: 'ic-settings-error' }, error)
            : React.createElement('div', { className: 'ic-settings' },
              React.createElement('div', { className: 'ic-set-section' },
                React.createElement('div', { className: 'ic-set-current' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('b', null, t('settings.current')),
                    React.createElement('span', null, t('settings.currentHint'))),
                  React.createElement('div', { className: 'ic-set-control' },
                    React.createElement('span', { className: 'ic-settings-msg' }, current),
                    React.createElement('button', {
                      type: 'button',
                      role: 'switch',
                      'aria-checked': enabled,
                      'aria-label': t('settings.currentToggle'),
                      className: `ic-settings-switch${enabled ? ' on' : ''}`,
                      disabled: busy === true || sessionId === undefined || onToggle === undefined,
                      onClick: onToggle,
                    }, React.createElement('i'))))),
              React.createElement('div', { className: 'ic-set-section' },
                React.createElement('div', { className: 'ic-set-head' }, t('settings.preferences')),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.milestones')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.milestonesHint'))),
                  React.createElement('div', { className: 'ic-set-control' },
                    React.createElement('div', { className: 'ic-seg' },
                      [1, 2, 3, 4, 5].map(number => React.createElement('button', {
                        key: number,
                        type: 'button',
                        className: number === values.milestoneCount ? 'on' : '',
                        disabled: saving,
                        onClick: () => update('milestoneCount', number),
                      }, String(number)))))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.expectation')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.expectationHint'))),
                  null),
                React.createElement('div', { className: 'ic-expect' },
                  [
                    ['perfect', t('settings.perfect'), t('settings.perfectDesc')],
                    ['good', t('settings.good'), t('settings.goodDesc')],
                    ['pass', t('settings.pass'), t('settings.passDesc')],
                  ].map(([id, label, description]) => React.createElement('button', {
                    key: id,
                    type: 'button',
                    className: values.expectation === id ? 'on' : '',
                    disabled: saving,
                    onClick: () => update('expectation', id),
                  },
                  React.createElement('b', null, label),
                  React.createElement('span', null, description))))),
              React.createElement('div', { className: 'ic-set-section' },
                React.createElement('div', { className: 'ic-set-head' }, t('settings.qualityStandard')),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.qualityStandardHint')))),
                React.createElement('textarea', {
                  className: 'ic-input ic-quality-input',
                  value: values.qualityStandard,
                  maxLength: 2000,
                  disabled: saving,
                  placeholder: t('settings.qualityStandardHint'),
                  onChange: (event) => update('qualityStandard', event.target.value),
                })),
              React.createElement('div', { className: 'ic-set-section' },
                React.createElement('div', { className: 'ic-set-head' }, t('settings.timer')),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.timeout')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.timeoutHint'))),
                  React.createElement('div', { className: 'ic-set-control' },
                    React.createElement('input', {
                      className: 'ic-input ic-input-num',
                      type: 'number',
                      min: 5,
                      max: 600,
                      value: values.timeoutSeconds,
                      disabled: saving,
                      onChange: (event) => update('timeoutSeconds', event.target.value === '' ? 0 : Number(event.target.value)),
                    }),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.seconds')),
                    React.createElement('div', { className: 'ic-preset' },
                      [30, 60, 90, 120].map(number => React.createElement('button', {
                        key: number,
                        type: 'button',
                        className: values.timeoutSeconds === number ? 'on' : '',
                        disabled: saving,
                        onClick: () => update('timeoutSeconds', number),
                      }, String(number))))))),
              React.createElement('div', { className: 'ic-set-section' },
                React.createElement('div', { className: 'ic-set-head' }, t('settings.review')),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.maxQuestions')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.maxQuestionsHint'))),
                  React.createElement('div', { className: 'ic-set-control' },
                    React.createElement('input', {
                      className: 'ic-input ic-input-num',
                      type: 'number',
                      min: 1,
                      max: 6,
                      value: values.maxQuestions,
                      disabled: saving,
                      onChange: (event) => update('maxQuestions', event.target.value === '' ? 0 : Number(event.target.value)),
                    }))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.defaultEnabled')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.defaultEnabledHint'))),
                  React.createElement('button', {
                    type: 'button',
                    role: 'switch',
                    'aria-checked': values.defaultEnabled,
                    'aria-label': t('settings.defaultEnabled'),
                    className: `ic-settings-switch${values.defaultEnabled ? ' on' : ''}`,
                    disabled: saving,
                    onClick: () => update('defaultEnabled', !values.defaultEnabled),
                  }, React.createElement('i'))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.ledger')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.ledgerHint'))),
                  React.createElement('button', {
                    type: 'button',
                    role: 'switch',
                    'aria-checked': values.ledgerEnabled,
                    'aria-label': t('settings.ledger'),
                    className: `ic-settings-switch${values.ledgerEnabled ? ' on' : ''}`,
                    disabled: saving,
                    onClick: () => update('ledgerEnabled', !values.ledgerEnabled),
                  }, React.createElement('i'))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.supervision')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.supervisionHint'))),
                  React.createElement('div', { className: 'ic-seg' },
                    [['strict', 'settings.supervisionStrict'], ['advisory', 'settings.supervisionAdvisory']].map(([value, key]) =>
                      React.createElement('button', {
                        key: value,
                        type: 'button',
                        className: values.supervisionMode === value ? 'on' : '',
                        disabled: saving,
                        onClick: () => update('supervisionMode', value),
                      }, t(key))))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.autoRetrospective')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.autoRetrospectiveHint'))),
                  React.createElement('button', {
                    type: 'button',
                    role: 'switch',
                    'aria-checked': values.autoRetrospective,
                    'aria-label': t('settings.autoRetrospective'),
                    className: `ic-settings-switch${values.autoRetrospective ? ' on' : ''}`,
                    disabled: saving,
                    onClick: () => update('autoRetrospective', !values.autoRetrospective),
                  }, React.createElement('i'))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.ledgerPath')),
                    React.createElement('span', { className: 'ic-set-hint' }, t('settings.ledgerPathHint'))),
                  React.createElement('div', { className: 'ic-set-control' },
                    React.createElement('input', {
                      className: 'ic-input ic-set-path',
                      type: 'text',
                      value: values.ledgerPath,
                      disabled: saving || !values.ledgerEnabled,
                      onChange: (event) => update('ledgerPath', event.target.value),
                    }))),
                React.createElement('div', { className: 'ic-set-row' },
                  React.createElement('div', { className: 'ic-set-copy' },
                    React.createElement('span', { className: 'ic-set-label' }, t('settings.files'))),
                  React.createElement('div', { className: 'ic-set-files' },
                    assets.map(([kind, label, path]) => React.createElement('button', {
                      key: kind,
                      type: 'button',
                      className: 'ic-file-link',
                      title: t('settings.openLocation'),
                      disabled: saving,
                      onClick: () => openAsset(kind),
                    },
                    React.createElement('span', { className: 'ic-file-kind' }, label),
                    React.createElement('span', { className: 'ic-file-path' }, path))))),
                openError === '' ? null : React.createElement('div', { className: 'ic-settings-error' }, openError)))

        const footer = ns === ''
          ? [
              React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
              React.createElement(RippleButton, {
                key: 'close',
                className: 'ic-btn ic-btn-primary',
                onClick: close,
              }, t('settings.close')),
            ]
          : [
              React.createElement(RippleButton, {
                key: 'reset',
                className: 'ic-btn ic-btn-ghost',
                disabled: saving,
                onClick: reset,
              }, t('settings.reset')),
              React.createElement('span', { key: 'spacer', className: 'ic-spacer' }),
              React.createElement(RippleButton, {
                key: 'cancel',
                className: 'ic-btn ic-btn-ghost',
                disabled: saving,
                onClick: close,
              }, t('settings.cancel')),
              React.createElement(RippleButton, {
                key: 'save',
                className: 'ic-btn ic-btn-primary',
                disabled: saving || loading,
                onClick: save,
              }, saving ? t('settings.saving') : saved ? t('settings.saved') : t('settings.save')),
            ]

        return React.createElement(ModalShell, { onBackdrop: close }, PanelShell({
          t,
          title: t('settings.title'),
          compact: true,
          description: t('settings.desc'),
          onClose: close,
          error: ns === '' ? '' : error,
          children: body,
          footer,
        }))
      }
    }

    function createContractPage(ctx) {
      const CSS = `
        .ic-contract-page{height:100%;overflow:auto;padding:30px 34px 60px;background:var(--dsw-alias-bg-base,#f7f9fc);color:var(--dsw-alias-label-primary,#1f2937)}
        .ic-contract-inner{max-width:980px;margin:0 auto}
        .ic-contract-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
        .ic-contract-mark{width:34px;height:34px;border-radius:10px;background:#4D6BFE;color:#fff;display:grid;place-items:center;flex:0 0 auto}
        .ic-contract-head h1{font-size:20px;margin:0 0 3px;letter-spacing:.1px}
        .ic-contract-head p{margin:0;color:var(--dsw-alias-label-secondary,#64748b);font-size:12px}
        .ic-contract-head button{margin-left:auto;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-line,#dfe5ed);border-radius:7px;background:#fff;color:#475569;font:inherit;font-size:12px;cursor:pointer}
        .ic-contract-status{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#f0fdf4;color:#0f766e;font-size:11px;font-weight:700;margin-bottom:16px}
        .ic-contract-status.pending{background:#fff7ed;color:#b45309}
        .ic-contract-card{border:1px solid var(--dsw-alias-line,#e2e8f0);border-radius:12px;background:#fff;padding:18px 20px;margin-bottom:16px;box-shadow:0 4px 16px rgba(15,23,42,.04)}
        .ic-contract-list{display:flex;flex-direction:column;gap:10px}
        .ic-contract-tools{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .ic-contract-search{flex:1 1 auto;height:32px;padding:0 11px;border:1px solid #dfe5ed;border-radius:8px;font:inherit;font-size:12px;color:#475569;background:#fff}
        .ic-contract-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}
        .ic-contract-stat{padding:11px 13px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
        .ic-contract-stat span{display:block;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
        .ic-contract-stat b{display:block;margin-top:4px;color:#1f2937;font-size:16px;font-variant-numeric:tabular-nums}
        .ic-contract-timeline{position:relative;padding-left:16px}
        .ic-contract-timeline:before{content:"";position:absolute;left:4px;top:5px;bottom:5px;width:1px;background:#e2e8f0}
        .ic-contract-time{position:relative;padding:0 0 13px 8px}
        .ic-contract-time:before{content:"";position:absolute;left:-16px;top:5px;width:7px;height:7px;border-radius:50%;background:#4D6BFE;box-shadow:0 0 0 3px #eef1ff}
        .ic-contract-time-head{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#334155}
        .ic-contract-time-head time{color:#94a3b8;font-size:10px}
        .ic-contract-time-detail{margin-top:3px;color:#64748b;font-size:11px;line-height:1.6;white-space:pre-wrap}
        .ic-contract-entry{border:1px solid var(--dsw-alias-line,#e2e8f0);border-radius:12px;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.04);overflow:hidden}
        .ic-contract-entry summary{display:flex;align-items:center;gap:10px;padding:13px 16px;cursor:pointer;list-style:none;font-size:12px;color:#475569}
        .ic-contract-entry summary::-webkit-details-marker{display:none}
        .ic-contract-entry[open] summary{border-bottom:1px solid #f1f5f9;background:#fafbff}
        .ic-contract-entry-arrow{color:#94a3b8;font-size:16px;transition:transform .15s}
        .ic-contract-entry-no{flex:0 0 auto;font-size:10px;color:#94a3b8;font-variant-numeric:tabular-nums}
        .ic-contract-entry[open] .ic-contract-entry-arrow{transform:rotate(90deg)}
        .ic-contract-entry-title{flex:1 1 auto;min-width:0;font-weight:700;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ic-contract-entry-status{flex:0 0 auto;padding:3px 7px;border-radius:999px;background:#f0fdf4;color:#0f766e;font-size:10px;font-weight:700}
        .ic-contract-entry-status.pending{background:#fff7ed;color:#b45309}
        .ic-contract-entry-budget,.ic-contract-entry-date{flex:0 0 auto;color:#64748b;font-variant-numeric:tabular-nums}
        .ic-contract-entry-body{padding:16px 18px 4px}
        .ic-contract-report-item{padding:10px 0;border-bottom:1px solid #f1f5f9}
        .ic-contract-report-item:last-child{border-bottom:none}
        .ic-contract-report-head{display:flex;align-items:center;gap:10px;margin-bottom:6px;color:#334155}
        .ic-contract-report-label{font-size:11px;font-weight:700;color:#64748b;margin:6px 0 2px}
        .ic-contract-card h2{font-size:13px;margin:0 0 12px;color:#334155}
        .ic-contract-book{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.75 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:#475569}
        .ic-contract-meta{display:flex;gap:18px;color:#64748b;font-size:11px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
        .ic-contract-section{margin-bottom:14px}
        .ic-contract-section h3,.ic-contract-terms h3{font-size:12px;margin:0 0 6px;color:#334155}
        .ic-contract-terms{margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b}
        .ic-contract-terms p{margin:4px 0;line-height:1.6}
        .ic-contract-table{width:100%;border-collapse:collapse;font-size:12px}
        .ic-contract-table th{text-align:left;padding:8px 10px;color:#64748b;font-size:11px;border-bottom:1px solid #dbe2ea;background:#f8fafc}
        .ic-contract-table th:last-child{text-align:right}
        .ic-contract-table td{padding:9px 10px;border-bottom:1px solid #f1f5f9;color:#475569}
        .ic-contract-table td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
        .ic-contract-summary{display:flex;justify-content:space-between;gap:16px;padding-top:12px;font-size:12px;color:#64748b}
        .ic-contract-summary b{color:#1f2937}
        .ic-contract-empty{padding:48px 24px;text-align:center;color:#64748b;font-size:13px;line-height:1.8}
        .ic-contract-error{color:#dc2626;font-size:12px;margin-bottom:12px}
      `
      return function ContractPage() {
        const t = ctx.locale.bind(NS)
        const [state, setState] = React.useState({ loading: true, data: undefined, error: '' })
        const [query, setQuery] = React.useState('')
        const load = React.useCallback(async () => {
          try {
            const response = await fetch('/dsh-info-check/contract-page', { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            setState({ loading: false, data, error: '' })
          } catch {
            setState(previous => ({ ...previous, loading: false, error: t('contract.error') }))
          }
        }, [])
        React.useEffect(() => {
          let alive = true
          const run = () => { if (alive) load() }
          run()
          const timer = window.setInterval(run, 4000)
          return () => {
            alive = false
            window.clearInterval(timer)
          }
        }, [load])
        const contracts = Array.isArray(state.data?.contracts)
          ? state.data.contracts
          : state.data !== null && typeof state.data === 'object' && typeof state.data.taskBook === 'string'
            ? [state.data]
            : []
        const sectionMap = {
          '我的理解': '项目目标',
          '项目目标': '项目目标',
          '完成标准': '质量要求',
          '质量要求': '质量要求',
          '范围外': '范围边界',
          '范围边界': '范围边界',
        }
        const parseSections = (taskBook) => {
          const sections = []
          const source = typeof taskBook === 'string' ? taskBook : ''
          const matches = [...source.matchAll(/【([^】]+)】([\s\S]*?)(?=【[^】]+】|$)/g)]
          for (const match of matches) {
            const label = sectionMap[match[1].trim()]
            const body = match[2].trim()
            if (label === undefined || body === '' || match[1].trim() === '里程碑') continue
            sections.push({ label, body })
          }
          return sections
        }
        const titleFor = (contract) => {
          const sections = parseSections(contract?.taskBook)
          const goal = sections.find(section => section.label === '项目目标')
          const firstLine = goal?.body.split('\n').map(line => line.trim()).find(line => line !== '')
          return firstLine ?? contract?.initial?.milestones?.[0]?.title ?? t('contract.unnamed')
        }
        const taskNumberFor = (contract) => {
          if (typeof contract?.taskNumber === 'string' && contract.taskNumber !== '') return contract.taskNumber
          const at = Number(contract?.startedAt) || Number(contract?.updatedAt)
          if (!Number.isFinite(at) || at <= 0) return ''
          const date = new Date(at)
          const two = value => String(value).padStart(2, '0')
          return `${two(date.getFullYear() % 100)}${two(date.getMonth() + 1)}${two(date.getDate())}${two(date.getHours())}${two(date.getMinutes())}`
        }
        const normalizedQuery = query.trim().toLowerCase()
        const visibleContracts = normalizedQuery === ''
          ? contracts
          : contracts.filter(contract => `${titleFor(contract)} ${taskNumberFor(contract)} ${contract?.taskBook ?? ''} ${contract?.contractId ?? ''}`.toLowerCase().includes(normalizedQuery))
        const settledCount = contracts.filter(contract => contract?.settlement !== null && contract?.settlement !== undefined).length
        const signedCount = contracts.filter(contract => contract?.signed === true).length
        const budgetTotal = contracts.reduce((sum, contract) => sum + (Number(contract?.initial?.amount) || 0) + (Number(contract?.extra) || 0), 0)
        const stats = React.createElement('div', { className: 'ic-contract-stats' },
          React.createElement('div', { className: 'ic-contract-stat' },
            React.createElement('span', null, t('contract.statsTasks')), React.createElement('b', null, String(contracts.length))),
          React.createElement('div', { className: 'ic-contract-stat' },
            React.createElement('span', null, t('contract.statsSigned')), React.createElement('b', null, String(signedCount))),
          React.createElement('div', { className: 'ic-contract-stat' },
            React.createElement('span', null, t('contract.statsSettled')), React.createElement('b', null, String(settledCount))),
          React.createElement('div', { className: 'ic-contract-stat' },
            React.createElement('span', null, t('contract.statsBudget')), React.createElement('b', null, `¥${budgetTotal.toFixed(2)}`)))
        const tools = React.createElement('div', { className: 'ic-contract-tools' },
          React.createElement('input', {
            className: 'ic-contract-search',
            value: query,
            placeholder: t('contract.search'),
            onChange: event => setQuery(event.target.value),
          }))
        const buildEntry = (contract, index) => {
          const initial = contract?.initial ?? {}
          const milestones = Array.isArray(initial.milestones) ? initial.milestones : []
          const total = Number(initial.amount) || 0
          const extra = Number(contract?.extra) || 0
          const allocated = milestones.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
          const updated = Number(contract?.updatedAt) || 0
          const sections = parseSections(contract?.taskBook)
          const taskBookCard = React.createElement('section', { className: 'ic-contract-card' },
            React.createElement('div', { className: 'ic-contract-meta' },
              taskNumberFor(contract) === '' ? null : React.createElement('span', null, `${t('contract.taskNumber')} #${taskNumberFor(contract)}`),
              React.createElement('span', null, t('contract.client')),
              React.createElement('span', null, t('contract.contractor'))),
            sections.length > 0
              ? sections.map(section => React.createElement('div', { key: section.label, className: 'ic-contract-section' },
                React.createElement('h3', null, section.label),
                React.createElement('pre', { className: 'ic-contract-book' }, section.body)))
              : React.createElement('pre', { className: 'ic-contract-book' }, contract?.taskBook ?? ''),
            React.createElement('div', { className: 'ic-contract-terms' },
              React.createElement('h3', null, t('contract.terms')),
              React.createElement('p', null, `1. ${t('contract.term1')}`),
              React.createElement('p', null, `2. ${t('contract.term2')}`)))
          const allocatedRow = React.createElement('tr', null,
            React.createElement('td', { colSpan: 2 }, t('contract.allocated')),
            React.createElement('td', null, `¥${allocated.toFixed(2)}`))
          const budgetTable = React.createElement('table', { className: 'ic-contract-table' },
            React.createElement('thead', null, React.createElement('tr', null,
              React.createElement('th', null, 'mNum'),
              React.createElement('th', null, t('contract.milestone')),
              React.createElement('th', null, 'CNY'))),
            React.createElement('tbody', null,
              milestones.map(item => React.createElement('tr', { key: item.id },
                React.createElement('td', null, item.id),
                React.createElement('td', null, item.title),
                React.createElement('td', null, `¥${(Number(item.amount) || 0).toFixed(2)}`))),
              allocatedRow))
          const budgetCard = React.createElement('section', { className: 'ic-contract-card' },
            React.createElement('h2', null, t('contract.budget')),
            budgetTable,
            React.createElement('div', { className: 'ic-contract-summary' },
              React.createElement('span', null, `${t('contract.total')} ¥${total.toFixed(2)}`),
              React.createElement('span', null, `${t('contract.reserve')} ¥${(total - allocated).toFixed(2)}`),
              React.createElement('span', null, `${t('contract.extra')} ¥${extra.toFixed(2)}`)),
            updated === 0 ? null : React.createElement('div', { style: { marginTop: '10px', fontSize: '11px', color: '#94a3b8' } },
              `${t('contract.updated')} ${new Date(updated).toLocaleString()}`))
          const decisionText = (decision) => decision === 'accepted'
            ? t('contract.accepted')
            : decision === 'rework' ? t('contract.rework')
              : decision === 'paused' ? t('contract.paused')
                : decision === 'timeout' ? t('contract.timeout')
                  : decision === 'approved' ? t('contract.approved')
                    : decision === 'denied' ? t('contract.denied') : String(decision ?? '')
          const acceptances = Array.isArray(contract?.acceptances) ? contract.acceptances : []
          const budgetReviews = Array.isArray(contract?.budgetReviews) ? contract.budgetReviews : []
          const settlement = contract?.settlement
          const delivery = contract?.delivery
          const reportItems = []
          acceptances.forEach((item, at) => {
            reportItems.push(React.createElement('div', { key: `accept-${at}`, className: 'ic-contract-report-item' },
              React.createElement('div', { className: 'ic-contract-report-head' },
                React.createElement('b', null, item.milestone),
                React.createElement('span', { className: `ic-contract-entry-status${item.decision === 'accepted' ? '' : ' pending'}` }, decisionText(item.decision))),
              React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.result')),
              React.createElement('pre', { className: 'ic-contract-book' }, item.summary ?? ''),
              Array.isArray(item.files) && item.files.length > 0
                ? React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.files')),
                  React.createElement('pre', { className: 'ic-contract-book' }, item.files.join('\n')))
                : null,
              React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.evidence')),
              React.createElement('pre', { className: 'ic-contract-book' }, item.evidence ?? ''),
              item.gaps === undefined || item.gaps === '' ? null : React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.gaps')),
                React.createElement('pre', { className: 'ic-contract-book' }, item.gaps))))
          })
          budgetReviews.forEach((item, at) => {
            reportItems.push(React.createElement('div', { key: `budget-review-${at}`, className: 'ic-contract-report-item' },
              React.createElement('div', { className: 'ic-contract-report-head' },
                React.createElement('b', null, `${t('contract.budgetReview')} · ${item.milestone}`),
                React.createElement('span', { className: 'ic-contract-entry-status' }, decisionText(item.decision))),
              React.createElement('div', { className: 'ic-contract-book' }, `¥${Number(item.spent || 0).toFixed(2)}${Number(item.requestedExtra || 0) > 0 ? ` · +¥${Number(item.requestedExtra).toFixed(2)}` : ''}`)))
          })
          if (settlement) {
            const settlementHead = React.createElement('div', { className: 'ic-contract-report-head' },
              React.createElement('b', null, t('contract.settlement')),
              React.createElement('span', { className: 'ic-contract-entry-status' },
                settlement.rating === 3 ? t('contract.satisfied') : settlement.rating === 2 ? t('contract.neutral') : t('contract.unsatisfied')))
            const settlementTotal = total + extra
            const variance = Number(settlement.finalSpent || 0) - settlementTotal
            const settlementRows = [
              [t('contract.initialBudget'), `¥${total.toFixed(2)}`],
              [t('contract.approvedExtra'), `¥${extra.toFixed(2)}`],
              [t('contract.financialTotal'), `¥${settlementTotal.toFixed(2)}`],
              [t('contract.finalSpent'), `¥${Number(settlement.finalSpent || 0).toFixed(2)}`],
              [t('contract.variance'), `${variance > 0 ? t('contract.over') : variance < 0 ? t('contract.under') : t('contract.balanced')} ¥${Math.abs(variance).toFixed(2)}`],
            ]
            const settlementTable = React.createElement('table', { className: 'ic-contract-table' },
              React.createElement('tbody', null,
                settlementRows.map(([label, value]) => React.createElement('tr', { key: label },
                  React.createElement('td', null, label),
                  React.createElement('td', null, value)))))
            const settlementSummary = React.createElement('pre', { className: 'ic-contract-book', style: { marginTop: '8px' } }, settlement.summary ?? '')
            reportItems.push(React.createElement('div', { key: 'settlement', className: 'ic-contract-report-item' },
              settlementHead, settlementTable, settlementSummary))
          }
          if (delivery) {
            const deliveryHead = React.createElement('div', { className: 'ic-contract-report-head' },
              React.createElement('b', null, t('contract.delivery')))
            const deliveryBody = React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.completion')),
              React.createElement('pre', { className: 'ic-contract-book' }, delivery.completion ?? ''),
              React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.delivered')),
              React.createElement('pre', { className: 'ic-contract-book' }, delivery.delivered ?? ''),
              delivery.gaps === undefined || delivery.gaps === '' ? null : React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.gaps')),
                React.createElement('pre', { className: 'ic-contract-book' }, delivery.gaps)),
              delivery.evidence === undefined || delivery.evidence === '' ? null : React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.evidence')),
                React.createElement('pre', { className: 'ic-contract-book' }, delivery.evidence)))
            reportItems.push(React.createElement('div', { key: 'delivery', className: 'ic-contract-report-item' },
              deliveryHead, deliveryBody))
          }
          const reportsCard = React.createElement('section', { className: 'ic-contract-card' },
            React.createElement('h2', null, t('contract.report')),
            reportItems.length === 0
              ? React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.noReports'))
              : reportItems)
          const timeline = []
          const addTimeline = (at, label, detail) => {
            const value = typeof at === 'number' ? at : Date.parse(at)
            if (!Number.isFinite(value) || value <= 0) return
            timeline.push({ at: value, label, detail: detail ?? '' })
          }
          addTimeline(contract?.taskBookAt || contract?.startedAt, t('contract.taskBookConfirmed'), '')
          if (contract?.signed) addTimeline(contract?.signedAt || contract?.updatedAt, t('contract.budgetSigned'), `¥${(total + extra).toFixed(2)}`)
          acceptances.forEach(item => addTimeline(item.at, `${t('contract.report')} · ${item.milestone}`, `${decisionText(item.decision)}${item.summary ? ` · ${item.summary}` : ''}`))
          budgetReviews.forEach(item => addTimeline(item.at, `${t('contract.budgetReview')} · ${item.milestone}`, `¥${Number(item.spent || 0).toFixed(2)}${Number(item.requestedExtra || 0) > 0 ? ` · +¥${Number(item.requestedExtra).toFixed(2)}` : ''}`))
          if (delivery) addTimeline(delivery.at, t('contract.deliveryConfirmed'), delivery.delivered ?? '')
          if (settlement) addTimeline(settlement.at, t('contract.settlementDone'), `${t('contract.finalSpent')} ¥${Number(settlement.finalSpent || 0).toFixed(2)}`)
          timeline.sort((a, b) => a.at - b.at)
          const timelineCard = React.createElement('section', { className: 'ic-contract-card' },
            React.createElement('h2', null, t('contract.timeline')),
            timeline.length === 0
              ? React.createElement('div', { className: 'ic-contract-report-label' }, t('contract.noReports'))
              : React.createElement('div', { className: 'ic-contract-timeline' },
                timeline.map((item, at) => React.createElement('div', { key: `time-${at}`, className: 'ic-contract-time' },
                  React.createElement('div', { className: 'ic-contract-time-head' },
                    React.createElement('b', null, item.label),
                    React.createElement('time', null, new Date(item.at).toLocaleString())),
                  item.detail === '' ? null : React.createElement('div', { className: 'ic-contract-time-detail' }, item.detail)))))
          return React.createElement('details', {
            key: contract?.contractId ?? `${contract?.sessionId ?? 'contract'}-${index}`,
            className: 'ic-contract-entry',
          },
          React.createElement('summary', { className: 'ic-contract-entry-summary' },
            React.createElement('span', { className: 'ic-contract-entry-arrow' }, '›'),
            taskNumberFor(contract) === '' ? null : React.createElement('span', { className: 'ic-contract-entry-no' }, `#${taskNumberFor(contract)}`),
            React.createElement('span', { className: 'ic-contract-entry-title' }, titleFor(contract)),
            React.createElement('span', { className: `ic-contract-entry-status${contract?.signed ? '' : ' pending'}` },
              contract?.signed ? t('contract.signed') : t('contract.unsigned')),
            React.createElement('span', { className: 'ic-contract-entry-budget' }, `¥${(total + extra).toFixed(2)}`),
            updated === 0 ? null : React.createElement('span', { className: 'ic-contract-entry-date' }, new Date(updated).toLocaleDateString())),
          React.createElement('div', { className: 'ic-contract-entry-body' }, taskBookCard, budgetCard, timelineCard, reportsCard))
        }
        const head = React.createElement('div', { className: 'ic-contract-head' },
          React.createElement('div', { className: 'ic-contract-mark' },
            React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' },
              React.createElement('path', { d: 'M6 3h9l3 3v15H6z' }),
              React.createElement('path', { d: 'M9 9h6M9 13h6M9 17h3' }))),
          React.createElement('div', null,
            React.createElement('h1', null, t('contract.title')),
            React.createElement('p', null, t('contract.subtitle'))),
          React.createElement('button', { type: 'button', onClick: load }, t('contract.refresh')))
        const body = state.loading && contracts.length === 0
          ? React.createElement('div', { className: 'ic-contract-empty' }, t('contract.loading'))
          : contracts.length === 0
            ? React.createElement('div', { className: 'ic-contract-empty' }, t('contract.empty'))
            : visibleContracts.length === 0
              ? React.createElement('div', { className: 'ic-contract-empty' }, t('contract.noMatch'))
              : React.createElement('div', { className: 'ic-contract-list' }, visibleContracts.map(buildEntry))
        return React.createElement('div', { className: 'ic-contract-page' },
          React.createElement('style', null, CSS),
          React.createElement('div', { className: 'ic-contract-inner' },
            head,
            stats,
            tools,
            state.error === '' ? null : React.createElement('div', { className: 'ic-contract-error' }, state.error),
            body))
      }
    }

    function createToggle(ctx) {
      const SettingsPanel = createSettingsPanel(ctx)
      return function Toggle(props) {
        useSnapshot(ctx.locale)
        const t = ctx.locale.bind(NS)
        const view = props.useProjection('infoCheck')
        const enabled = view === undefined ? false : view.enabled !== false
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

        const settings = settingsOpen ? React.createElement(SettingsBoundary, {
          t,
          onClose: () => { setSettingsOpen(false) },
        }, React.createElement(SettingsPanel, {
          onClose: () => { setSettingsOpen(false) },
          enabled,
          busy,
          sessionId: props.sessionId,
          onToggle: run,
        })) : null

        return React.createElement(React.Fragment, null,
          React.createElement('style', null, PANEL_CSS),
          rowNode,
          settings)
      }
    }

    function createProgress(ctx) {
      return function Progress(props) {
        const t = ctx.locale.bind(NS)
        const view = props.useProjection('infoCheck')
        const milestones = Array.isArray(view?.milestones) ? view.milestones : []
        const accepted = Array.isArray(view?.accepted) ? view.accepted : []
        const phase = typeof view?.phase === 'string' ? view.phase : 'idle'
        const active = typeof view?.active === 'string' ? view.active : null
        const enabled = view === undefined || view.enabled !== false
        const show = enabled && milestones.length > 0
          && ['working', 'accepting', 'delivering'].includes(phase)
        const [visual, setVisual] = React.useState(0)
        const [placement, setPlacement] = React.useState({
          left: 16,
          width: 640,
          bottom: 96,
        })
        const dismiss = () => {
          if (props.sessionId === undefined) return
          try {
            const controller = new AbortController()
            ctx.remote.commands.execute(
              props.sessionId,
              '/dsh-info-check reset',
              [],
              controller.signal,
            ).catch(() => {})
          } catch {
            // The command can be unavailable while the plugin is unloading.
          }
        }

        React.useEffect(() => {
          if (!show) return undefined
          let timer
          const measure = () => {
            try {
              const selector = 'textarea, [contenteditable="true"], [role="textbox"]'
              const areas = Array.from(document.querySelectorAll(selector))
                .map(node => ({ node, rect: node.getBoundingClientRect() }))
                .filter(item => item.rect.width > 160 && item.rect.height > 10 && item.rect.top > 0)
                .filter(item => item.rect.bottom > window.innerHeight * 0.55)
              areas.sort((a, b) => b.rect.bottom - a.rect.bottom)
              const rect = areas[0]?.rect
              if (rect !== undefined && rect.top < window.innerHeight) {
                const left = Math.max(8, Math.round(rect.left))
                const width = Math.max(160, Math.min(Math.round(rect.width), window.innerWidth - left - 8))
                setPlacement({
                  left,
                  width,
                  bottom: Math.max(10, Math.round(window.innerHeight - rect.top + 6)),
                })
                return
              }
              setPlacement({
                left: Math.max(8, Math.round((window.innerWidth - Math.min(640, window.innerWidth - 16)) / 2)),
                width: Math.min(640, window.innerWidth - 16),
                bottom: 96,
              })
            } catch {
              // Keep the fallback placement.
            }
          }
          measure()
          window.addEventListener('resize', measure)
          window.addEventListener('scroll', measure, true)
          timer = window.setInterval(measure, 1500)
          return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
            window.clearInterval(timer)
          }
        }, [show])

        React.useEffect(() => {
          if (!show) return undefined
          const tick = () => {
            const total = milestones.length
            const done = accepted.length
            if (total === 0) {
              setVisual(0)
              return
            }
            const base = Math.min(1, done / total)
            const next = Math.min(1, (done + 1) / total)
            const stageStart = Number(view?.stageStartedAt) || Date.now()
            const elapsed = Math.max(0, Date.now() - stageStart)
            const slow = base + Math.min(0.9, elapsed / 60000) * (next - base)
            const cap = Math.max(base, next - 0.05)
            let target
            if (phase === 'delivered' || phase === 'delivering') target = 1
            else if (phase === 'accepting') target = next
            else if (done >= total) target = 1
            else target = Math.min(cap, slow)
            setVisual(Math.min(1, Math.max(base, target)))
          }
          tick()
          const timer = window.setInterval(tick, 1000)
          return () => window.clearInterval(timer)
        }, [show, phase, accepted.length, milestones.length, view?.stageStartedAt])

        if (!show || createPortal === undefined || typeof document === 'undefined') return null

        const total = milestones.length
        const done = accepted.length
        const fast = phase === 'accepting' || phase === 'delivering' || phase === 'delivered'
        const stones = milestones.map((milestone, index) => {
          const position = total === 0 ? 0 : ((index + 1) / total) * 100
          const complete = accepted.includes(milestone.id) || phase === 'delivered'
          const current = active === milestone.id && phase !== 'delivered'
          const className = `ic-progress-stone${complete ? ' done' : ''}${current ? ' current' : ''}`
          return React.createElement('span', {
            key: milestone.id,
            className,
            style: { left: `${position}%` },
            title: milestone.title,
            'aria-hidden': 'true',
          }, React.createElement('svg', { viewBox: '0 0 16 20', 'aria-hidden': 'true' },
            React.createElement('path', { d: 'M8 1.7c-3.1 0-5.2 2.1-5.2 5.2v9.4h10.4V6.9c0-3.1-2.1-5.2-5.2-5.2Z' }),
            React.createElement('path', { d: 'M8 5.4v6.1M5.8 9.2h4.4M4.2 17.9h7.6' })))
        })

        const bar = React.createElement('div', {
          className: `ic-progress${fast ? ' ic-progress-fast' : ''}`,
          style: {
            left: `${placement.left}px`,
            width: `${placement.width}px`,
            bottom: `${placement.bottom}px`,
          },
          role: 'status',
          'aria-label': `${t('progress.label')} ${done}/${total}`,
        },
        React.createElement('span', { className: 'ic-progress-label' }, t('progress.label')),
        React.createElement('div', { className: 'ic-progress-track' },
          React.createElement('span', {
            className: 'ic-progress-fill',
            style: { width: `${(visual * 100).toFixed(2)}%` },
          }),
          ...stones),
        React.createElement('span', { className: 'ic-progress-count' }, `${done}/${total}`),
        React.createElement('button', {
          type: 'button',
          className: 'ic-progress-close',
          title: t('progress.clear'),
          'aria-label': t('progress.clear'),
          onClick: dismiss,
        }, '×'))

        return createPortal(bar, document.body)
      }
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.commands', 'remote.settings'],
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
                  if (question.id === BUDGET_PROPOSAL_ID) return { kind: 'budget-proposal', pending: pendingInteraction }
                  if (question.id === ACCEPT_ID) return { kind: 'accept', pending: pendingInteraction }
                  if (question.id === BUDGET_REVIEW_ID) return { kind: 'budget-review', pending: pendingInteraction }
                  if (question.id === BUDGET_SETTLEMENT_ID) return { kind: 'budget-settlement', pending: pendingInteraction }
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

        ctx.effect(() => ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'dsh-info-check-progress',
          order: -10,
        }, createProgress(ctx))), 'dsh-info-check: progress bar')

        const ContractPage = createContractPage(ctx)
        const ContractGlyph = (owner = {}) => React.createElement('svg', {
          width: owner.size ?? 16,
          height: owner.size ?? 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        React.createElement('path', { d: 'M6 3h9l3 3v15H6z' }),
        React.createElement('path', { d: 'M9 9h6M9 13h6M9 17h3' }))

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: CONTRACT_PANEL_ID,
          order: 30,
          label: () => ctx.locale.bind(NS)('contract.nav'),
        }, ContractGlyph)), 'dsh-info-check: contract sidebar entry')

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: CONTRACT_PANEL_ID,
        }, ContractPage)), 'dsh-info-check: contract page')
      },
    }
  },
})
