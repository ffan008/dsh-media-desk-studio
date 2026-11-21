// 驾驶舱：像仪表盘一样一眼看清内容生产全局。
// 数据全部来自工作台的真实状态，不另存一份。
import React from 'react'
import { openItem, setDesk, useDesk } from './desk.js'
import { Icon } from './ui.jsx'
import { relativeDay, STATUS_LABEL, STATUSES } from './util.js'
import { t, useLang } from './i18n.js'

const PIPELINE = [
  { status: 'idea', icon: 'spark', tone: 'idea' },
  { status: 'outline', icon: 'list', tone: 'outline' },
  { status: 'draft', icon: 'pen', tone: 'draft' },
  { status: 'ready', icon: 'send', tone: 'ready' },
  { status: 'published', icon: 'check', tone: 'published' },
]

function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 顶部工具条：展开 / 标签，沿用参考看板「独立物件」的质感。 */
function Chrome({ tag }) {
  return (
    <>
      <span className="sb-handle" aria-hidden="true" />
      {tag ? <span className="sb-tag">{tag}</span> : null}
    </>
  )
}

/** 01 今日：大字日期 + 今天要做的 + 内容总量。 */
function TodayCard({ items }) {
  const now = new Date()
  const today = dayKey(now)
  const todayItems = items.filter(i => dayKey(i.createdAt) === today)
  const scheduledToday = items.filter(i => i.scheduledAt && dayKey(i.scheduledAt) === today)
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  return (
    <section className="sb-tile sb-today">
      <Chrome tag="TODAY" />
      <div className="sb-tile-h"><Icon name="target" size={15} /><span>{t('今天')}</span><span className="sb-hint">{now.getMonth() + 1}月{now.getDate()}日 · {weekday}</span></div>
      <div className="sb-big">{String(now.getDate()).padStart(2, '0')}<b>.</b><small>{String(now.getMonth() + 1).padStart(2, '0')}</small></div>
      <div className="sb-today-stat">
        <div><b>{todayItems.length}</b><span>{t('今日新增')}</span></div>
        <div><b>{scheduledToday.length}</b><span>{t('今日排期')}</span></div>
        <div><b>{items.length}</b><span>{t('内容总数')}</span></div>
      </div>
      <p className="sb-foot">{todayItems.length || scheduledToday.length ? t('今天有 {n} 条内容在推进', { n: todayItems.length + scheduledToday.length }) : t('按流程创作，或回到内容库看看')}</p>
    </section>
  )
}

/** 02 管线：五阶段进度条，点一段跳到内容库看板。 */
function PipelineCard({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const go = () => setDesk({ view: 'content' })
  return (
    <section className="sb-tile sb-pipeline">
      <Chrome tag="PIPELINE" />
      <div className="sb-tile-h"><Icon name="bolt" size={15} /><span>{t('内容管线')}</span></div>
      <div className="sb-pipe-track">
        {PIPELINE.map((stage) => {
          const n = counts[stage.status] || 0
          return (
            <button type="button" key={stage.status} className={`sb-pipe-step sb-tone-${stage.tone}`} onClick={go} title={t(STATUS_LABEL[stage.status])}>
              <span className="sb-pipe-dot"><Icon name={stage.icon} size={15} /></span>
              <b>{n}</b>
              <small>{t(STATUS_LABEL[stage.status])}</small>
              <i style={{ width: `${Math.round(n / total * 100)}%` }} />
            </button>
          )
        })}
      </div>
      <p className="sb-foot">{t('从灵感到发布，每一步都看得见')}</p>
    </section>
  )
}

/** 03 创作流程：一个「当前站」焦点，点进去继续写。 */
function FlowCard({ flowData }) {
  const steps = ['topic', 'opening', 'viewpoints', 'content', 'presence']
  const labels = { topic: '选题', opening: '抄开头', viewpoints: '列观点', content: '填内容', presence: '镜头表现力' }
  let current = steps.findIndex(s => !flowData?.flows?.some(f => f.steps?.[s]?.text?.trim()))
  if (current < 0) current = steps.length - 1
  const done = steps.filter(s => flowData?.flows?.some(f => f.steps?.[s]?.text?.trim())).length
  const activeFlow = flowData?.flows?.find(f => f.id === flowData.activeId) || flowData?.flows?.[0]
  const go = () => setDesk({ view: 'content' })
  return (
    <section className="sb-tile sb-flow sb-dark">
      <Chrome tag="FLOW" />
      <div className="sb-tile-h"><Icon name="pen" size={15} /><span>{t('创作流程')}</span></div>
      <div className="sb-flow-now">
        <span className="sb-flow-stepno">0{current + 1}</span>
        <div><small>{t('当前站')}</small><b>{t(labels[steps[current]])}</b></div>
      </div>
      <div className="sb-flow-rail">
        {steps.map((s, i) => <i key={s} className={i < done ? 'on' : i === current ? 'now' : ''} />)}
      </div>
      <p className="sb-flow-title">{activeFlow?.title || t('未命名流程')}</p>
      <p className="sb-foot">{t('已完成 {done}/{total} 步', { done, total: steps.length })}</p>
      <button type="button" className="sb-btn" onClick={go}>{t('继续创作')} <Icon name="chevR" size={13} /></button>
    </section>
  )
}

/** 04 灵感池：最近的灵感，点开就能继续。 */
function IdeasCard({ items }) {
  const ideas = items.filter(i => !i.parentId && i.status === 'idea').slice(0, 5)
  const total = items.filter(i => !i.parentId && i.status === 'idea').length
  return (
    <section className="sb-tile sb-ideas">
      <Chrome tag="IDEAS" />
      <div className="sb-tile-h"><Icon name="spark" size={15} /><span>{t('灵感池')}</span><span className="sb-count">{total}</span></div>
      {ideas.length ? (
        <ul className="sb-list">
          {ideas.map(i => (
            <li key={i.id}><button type="button" onClick={() => openItem(i.id)}><span className="sb-bullet" /><span className="sb-txt">{i.title}</span></button></li>
          ))}
        </ul>
      ) : <p className="sb-empty">{t('还没有灵感，去记一条')}</p>}
      <p className="sb-foot">{t('灵感是内容的起点')}</p>
    </section>
  )
}

/** 05 渠道脉搏：按平台统计内容量。 */
function ChannelsCard({ items }) {
  const byPlatform = React.useMemo(() => {
    const map = {}
    for (const i of items) if (i.platform) map[i.platform] = (map[i.platform] || 0) + 1
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [items])
  const max = byPlatform[0]?.[1] || 1
  return (
    <section className="sb-tile sb-channels">
      <Chrome tag="CHANNELS" />
      <div className="sb-tile-h"><Icon name="upRight" size={15} /><span>{t('渠道脉搏')}</span></div>
      {byPlatform.length ? (
        <ul className="sb-bars">
          {byPlatform.map(([platform, n]) => (
            <li key={platform}>
              <span className="sb-bar-label">{t(platform)}</span>
              <span className="sb-bar-track"><i style={{ width: `${Math.round(n / max * 100)}%` }} /></span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      ) : <p className="sb-empty">{t('还没有渠道数据')}</p>}
      <p className="sb-foot">{t('内容分布在哪些平台')}</p>
    </section>
  )
}

/** 06 本周排期：接下来要发的内容。 */
function ScheduleCard({ items }) {
  const upcoming = items.filter(i => i.scheduledAt && new Date(i.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 5)
  return (
    <section className="sb-tile sb-schedule">
      <Chrome tag="SCHEDULE" />
      <div className="sb-tile-h"><Icon name="calendar" size={15} /><span>{t('接下来排期')}</span></div>
      {upcoming.length ? (
        <ul className="sb-list sb-sched-list">
          {upcoming.map(i => (
            <li key={i.id}><button type="button" onClick={() => openItem(i.id)}>
              <span className="sb-when">{relativeDay(i.scheduledAt)}</span>
              <span className="sb-txt">{i.title}</span>
            </button></li>
          ))}
        </ul>
      ) : <p className="sb-empty">{t('还没有排期，去排期页安排')}</p>}
      <p className="sb-foot">{t('把成稿拖到日历就能排期')}</p>
    </section>
  )
}

/** 07 快捷动作。 */
function ActionsCard() {
  const actions = [
    { icon: 'plus', label: '记灵感', fn: () => setDesk({ capture: { tab: 'text' } }) },
    { icon: 'bolt', label: '创作流程', fn: () => setDesk({ view: 'content' }) },
    { icon: 'calendar', label: '去排期', fn: () => setDesk({ view: 'schedule' }) },
    { icon: 'eye', label: '看复盘', fn: () => setDesk({ view: 'insights' }) },
  ]
  return (
    <section className="sb-tile sb-actions sb-mint">
      <Chrome tag="ACTIONS" />
      <div className="sb-tile-h"><Icon name="bolt" size={15} /><span>{t('快捷动作')}</span></div>
      <div className="sb-action-grid">
        {actions.map(a => (
          <button type="button" key={a.label} onClick={a.fn}><Icon name={a.icon} size={18} /><span>{t(a.label)}</span></button>
        ))}
      </div>
    </section>
  )
}

function readFlowData() {
  try {
    const raw = localStorage.getItem('dsh-media-desk-studio/flow-v1') || localStorage.getItem('dsh-media-desk/flow-v1')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function CockpitView() {
  useLang()
  const items = useDesk(s => s.state?.items ?? [])
  const [flowData, setFlowData] = React.useState(() => readFlowData())
  const counts = React.useMemo(() => {
    const c = {}
    for (const s of STATUSES) c[s] = items.filter(i => i.status === s && !(i.parentId && s === 'idea')).length
    return c
  }, [items])

  return (
    <div className="md-page sb-board">
      <header className="md-page-head sb-head">
        <div><h1>{t('驾驶舱')}</h1><p className="md-page-sub">{t('打开就看见全局：今天、管线、灵感、排期，一目了然')}</p></div>
        <span style={{ flex: 1 }} />
        <button type="button" className="md-btn sb-back" onClick={() => setDesk({ mode: 'scatter' })}>
          <Icon name="chevL" size={14} /> {t('返回灵感墙')}
        </button>
      </header>
      <TodayCard items={items} />
      <PipelineCard counts={counts} />
      <FlowCard flowData={flowData} />
      <IdeasCard items={items} />
      <ChannelsCard items={items} />
      <ScheduleCard items={items} />
      <ActionsCard />
    </div>
  )
}
