// 内容创作工作台：把「内容」页从单一的内容库，升级为口播创作流程工作台。
// 流程：选题 → 抄开头 → 列观点 → 填内容 → 镜头表现力（来自「得到大脑」全流程拆解）。
import React from 'react'
import { t, useLang } from './i18n.js'
import { dispatchOps, toast } from './desk.js'
import { Icon } from './ui.jsx'
import {
  DURATIONS, STEPS, addFlow, checkText, composeScript, deleteFlow,
  durationLabel, loadFlowState, saveFlow, selectFlow, stepText,
  suggestViewpoints, targetChars, toolText,
} from './flow-store.js'

/** 去掉流程文本里的空白，按中文习惯计字。 */
function charCount(text) { return (text || '').replace(/\s/g, '').length }

function FlowNav({ flow, onStep }) {
  const done = STEPS.filter(s => flow.steps[s.id]?.text?.trim()).length
  const pct = Math.round(done / STEPS.length * 100)
  return (
    <div className="md-flow-track" role="navigation" aria-label={t('创作流程')}>
      <div className="md-flow-progress" style={{ '--flow-pct': `${pct}%` }}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="md-flow-steps">
        {STEPS.map((step, i) => {
          const info = stepText(step)
          const hasText = !!flow.steps[step.id]?.text?.trim()
          const active = flow.activeStep === step.id
          return (
            <React.Fragment key={step.id}>
              {i > 0 ? <span className={`md-flow-link ${flow.steps[STEPS[i - 1].id]?.text?.trim() ? 'is-done' : ''}`} /> : null}
              <button
                type="button"
                className={`md-flow-step ${active ? 'is-active' : ''} ${hasText ? 'is-done' : ''}`}
                aria-current={active ? 'step' : undefined}
                onClick={() => onStep(step.id)}
              >
                <span className="md-flow-step-dot">{hasText ? <Icon name="check" size={13} stroke={2.6} /> : <Icon name={step.icon} size={15} />}</span>
                <span className="md-flow-step-label"><b>{info.title}</b><small>{info.sub}</small></span>
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

function CheckList({ step, values, onToggle }) {
  const all = step.checks.length
  const checked = step.checks.filter((_, i) => values?.[i]).length
  return (
    <div className="md-flow-checks">
      <div className="md-flow-blockhead">
        <Icon name="check" size={13} />
        <span>{t('要点清单')}</span>
        <small>{checked}/{all}</small>
      </div>
      {step.checks.map((check, i) => (
        <label key={i} className={`md-flow-check ${values?.[i] ? 'is-checked' : ''}`}>
          <input type="checkbox" checked={!!values?.[i]} onChange={() => onToggle(i)} />
          <span className="md-flow-checkbox"><Icon name="check" size={11} stroke={2.8} /></span>
          <span>{checkText(check)}</span>
        </label>
      ))}
    </div>
  )
}

function StepEditor({ flow, step, onChange }) {
  const info = stepText(step)
  const data = flow.steps[step.id] ?? { text: '', checks: {} }
  const count = charCount(data.text)
  const isContent = step.id === 'content'
  const isViewpoints = step.id === 'viewpoints'
  const target = targetChars(flow.durationSec)
  const suggested = suggestViewpoints(flow.durationSec)

  const toggleCheck = (i) => {
    const checks = { ...(data.checks ?? {}) }
    checks[i] = !checks[i]
    onChange({ ...data, checks })
  }

  return (
    <section className="md-flow-work">
      <header className="md-flow-workhead">
        <span className="md-flow-workicon"><Icon name={step.icon} size={20} /></span>
        <div>
          <h2>{info.title}</h2>
          <p>{info.principle}</p>
        </div>
      </header>

      <div className="md-flow-columns">
        <div className="md-flow-col-main">
          <label className="md-flow-editor">
            <span className="md-flow-editor-label">
              {t('这一步写点什么')}
              <em>{t('边说边写，口语化')}</em>
            </span>
            <textarea
              value={data.text}
              onChange={e => onChange({ ...data, text: e.target.value })}
              placeholder={step.id === 'topic' ? t('写下你选的选题、为什么它有确定性（低粉爆款 / 热点 / 低粉高赞）……') : step.id === 'opening' ? t('把原爆款开头一个字不改地抄到这里，抄到句号为止……') : step.id === 'viewpoints' ? t('1. 观点一（约 150 字）\n2. 观点二\n3. 观点三……\n借鉴不超过 40%，其余来自同类低粉爆款和高赞评论') : step.id === 'content' ? t('用自己的口语，把每个观点重新讲一遍。边说边写，不抄原文……') : t('每 15 秒的情绪钩子、动作、道具、语气语调、内容伏笔……')}
              rows={isContent ? 14 : 10}
              spellCheck={false}
            />
            <span className="md-flow-editor-foot">
              <span>{t('已写 {n} 字', { n: count })}</span>
              {isContent ? <span className={count >= target * 0.85 ? 'is-ok' : ''}>{t('目标约 {n} 字', { n: target })}</span> : null}
              {isViewpoints ? <span>{t('建议约 {n} 个观点', { n: suggested })}</span> : null}
            </span>
          </label>

          {isContent ? (
            <div className="md-flow-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.round(count / target * 100))}%` }} />
            </div>
          ) : null}
        </div>

        <aside className="md-flow-col-side">
          <CheckList step={step} values={data.checks} onToggle={toggleCheck} />
          <div className="md-flow-tools">
            <div className="md-flow-blockhead"><Icon name="spark" size={13} /><span>{t('工具与方法')}</span></div>
            {step.tools.map((tool, i) => (
              <p key={i} className="md-flow-tool">{toolText(tool)}</p>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

function FlowHeader({ flow, onPatch }) {
  return (
    <div className="md-flow-head">
      <div className="md-flow-title-row">
        <input
          className="md-flow-title"
          value={flow.title}
          onChange={e => onPatch({ title: e.target.value })}
          placeholder={t('给这条创作流程起个名字')}
          aria-label={t('流程标题')}
        />
        <div className="md-seg" role="radiogroup" aria-label={t('体裁')}>
          {[['script', t('脚本')], ['article', t('文章')]].map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={flow.format === v} className={flow.format === v ? 'is-on' : ''} onClick={() => onPatch({ format: v })}>{label}</button>
          ))}
        </div>
        <select className="md-flow-duration" value={flow.durationSec} onChange={e => onPatch({ durationSec: Number(e.target.value) })} aria-label={t('目标时长')}>
          {DURATIONS.map(d => <option key={d.sec} value={d.sec}>{durationLabel(d)}</option>)}
        </select>
      </div>
      <p className="md-flow-sub">
        {t('目标约 {chars} 字 · 建议 {n} 个观点', { chars: targetChars(flow.durationSec), n: suggestViewpoints(flow.durationSec) })}
        <span style={{ flex: 1 }} />
        <span>{t('创作流程自动保存在本机')}</span>
      </p>
    </div>
  )
}

function FlowLibrary({ state, onSelect, onAdd, onDelete }) {
  const [open, setOpen] = React.useState(false)
  const current = state.flows.find(f => f.id === state.activeId)
  return (
    <div className="md-flow-library">
      <button type="button" className="md-flow-library-current" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <Icon name="list" size={14} />
        <span>{current?.title || t('未命名流程')}</span>
        <Icon name={open ? 'chevD' : 'chevR'} size={13} />
      </button>
      {open ? (
        <div className="md-flow-library-menu">
          {state.flows.map(f => {
            const progress = STEPS.filter(s => f.steps[s.id]?.text?.trim()).length
            return (
              <div key={f.id} className={`md-flow-library-row ${f.id === state.activeId ? 'is-on' : ''}`}>
                <button type="button" onClick={() => { onSelect(f.id); setOpen(false) }}>
                  <b>{f.title || t('未命名流程')}</b>
                  <small>{progress}/{STEPS.length} {t('步')} · {new Date(f.updatedAt).toLocaleDateString()}</small>
                </button>
                <button type="button" className="md-flow-library-del" title={t('删除流程')} onClick={() => { if (window.confirm(t('确定删除这条创作流程？'))) onDelete(f.id) }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            )
          })}
          <button type="button" className="md-flow-library-add" onClick={() => { onAdd(); setOpen(false) }}>
            <Icon name="plus" size={14} /> {t('新建创作流程')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function FlowWorkbench({ switcher = null }) {
  useLang()
  const [state, setState] = React.useState(() => loadFlowState())
  const flow = state.flows.find(f => f.id === state.activeId) ?? state.flows[0] ?? null

  const patch = (partial) => {
    if (!flow) return
    const next = { ...flow, ...partial }
    setState(saveFlow(next))
  }
  const changeStep = (stepId, data) => {
    if (!flow) return
    patch({ steps: { ...flow.steps, [stepId]: data }, activeStep: stepId })
  }
  const setStep = (stepId) => patch({ activeStep: stepId })

  const saveToInbox = async () => {
    if (!flow) return
    const text = composeScript(flow)
    if (!text) { toast(t('还没有可保存的内容'), { error: true }); return }
    const title = flow.title || text.split('\n')[0].slice(0, 40) || t('创作流程')
    await dispatchOps([{ op: 'add_item', kind: 'note', title, body: text, tags: ['创作流程'] }], { label: t('保存创作流程') })
  }

  if (!flow) {
    return (
      <div className="md-page">
        <div className="md-empty">
          <p className="md-empty-title">{t('还没有创作流程')}</p>
          <button type="button" className="md-btn is-primary" onClick={() => setState(addFlow().data)}>{t('新建创作流程')}</button>
        </div>
      </div>
    )
  }

  const active = STEPS.find(s => s.id === flow.activeStep) ?? STEPS[0]

  return (
    <div className="md-page md-flow-page">
      <header className="md-page-head md-flow-pagehead">
        <div>
          <h1>{t('内容创作工作台')}</h1>
          <p className="md-page-sub">{t('选题 → 抄开头 → 列观点 → 填内容 → 镜头表现力，一步一步来')}</p>
        </div>
        <span style={{ flex: 1 }} />
        {switcher}
        <FlowLibrary
          state={state}
          onSelect={id => setState(selectFlow(id))}
          onAdd={() => setState(addFlow().data)}
          onDelete={id => setState(deleteFlow(id))}
        />
        <button type="button" className="md-btn md-flow-save" onClick={saveToInbox}>
          <Icon name="save" size={14} /> {t('存进内容库')}
        </button>
      </header>

      <FlowHeader flow={flow} onPatch={patch} />
      <FlowNav flow={flow} onStep={setStep} />
      <StepEditor flow={flow} step={active} onChange={data => changeStep(active.id, data)} />
    </div>
  )
}
