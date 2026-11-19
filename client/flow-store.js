// 内容创作工作台：口播创作五步流程的数据与本地持久化。
// 流程稿存在浏览器 localStorage，刷新不丢；不占用工作台的内容数据，也不上传。
import { lang } from './i18n.js'

const KEY = 'dsh-media-desk-studio/flow-v1'

/** 五步流程的静态知识：要点、工具、公式都来自「新手做口播短视频全流程拆解」。 */
export const STEPS = [
  {
    id: 'topic',
    icon: 'target',
    zh: { title: '选题', sub: '成败的一半', principle: '选题要的是确定性，不是靠猜。短视频做给算法看，先让算法看懂，它才知道推给谁。' },
    en: { title: 'Topic', sub: 'Half the battle', principle: 'A topic is about certainty, not guessing. Short video is made for the algorithm — make it understand you first.' },
    checks: [
      { zh: '追求确定性：找低粉爆款，不靠猜', en: 'Seek certainty: low-follower hits, no guessing' },
      { zh: '新号前一个月必蹭热点型选题', en: 'New accounts: ride trends for the first month' },
      { zh: '与自己价值观高度一致，不蹭违心流量', en: 'Align with your values; skip traffic you dislike' },
      { zh: '放下自我：观众划走只需一两秒', en: 'Drop the ego: viewers swipe away in a second' },
      { zh: '至少一半时间花在选题上', en: 'Spend at least half your time on the topic' },
    ],
    tools: [
      { zh: '抖音热点宝 — 官方数据、简单直接，但不全且有平台引导性；只适合早期蹭热点。', en: 'Douyin Hot List — official, simple, but incomplete and platform-steered; for early trend-riding only.' },
      { zh: '蝉妈妈 — 淘宝买单月会员试水；视频榜→个人成长/管理→过去一周/月→找低粉爆款（粉丝一两千、点赞几万几十万）。', en: 'Chanmama — try a one-month membership; Video Rank → Personal Growth → past week/month → low-follower hits.' },
      { zh: '今日头条 — 作者用得最多，与抖音同属字节、算法几乎一样。空号养素材号：刷到目标内容长按点赞/喜欢/关注/完播，不感兴趣的长按点不感兴趣；20 分钟后关机重启再来，不能连 WiFi，三遍约两小时。', en: 'Toutiao — the author’s top tool; same algorithm as Douyin. Train a fresh account: like/follow/finish target videos, reject others; 20 min → restart → repeat 3× (no Wi-Fi), about 2 hours.' },
    ],
  },
  {
    id: 'opening',
    icon: 'bolt',
    zh: { title: '抄开头', sub: '一个字都不能改', principle: '开头照抄原爆款，一个字不改，抄到句号为止——句号才是一个完整观点，逗号也要抄。' },
    en: { title: 'Copy the hook', sub: 'Don’t change a word', principle: 'Copy the winning opening word for word, up to the full stop — the full stop ends one complete idea; keep the commas too.' },
    checks: [
      { zh: '照抄原爆款开头，一个字不改', en: 'Copy the original opening word for word' },
      { zh: '抄到句号为止，逗号也抄', en: 'Copy through the full stop; keep commas' },
      { zh: '不死卡「前 3 秒」，以完整观点为准', en: 'Don’t fixate on “first 3 seconds”; use the complete idea' },
      { zh: '记住依据：2 秒完播、5 秒留存极重要', en: 'Remember: 2s completion and 5s retention matter most' },
    ],
    tools: [
      { zh: '后台数据明确显示：2 秒完播、5 秒留存极重要。翻拍爆款却非要改开头，完全没必要。', en: 'Analytics show 2s completion and 5s retention are critical. Remaking a hit but rewriting its hook is pointless.' },
    ],
  },
  {
    id: 'viewpoints',
    icon: 'list',
    zh: { title: '列观点', sub: '以价值观为唯一标准', principle: '先定时长段、再倒推字数、最后凑观点。观点要让观众点头（附和）或摇头（开骂），都增加互动。' },
    en: { title: 'List viewpoints', sub: 'Values are the only standard', principle: 'Pick a duration, derive the word count, then fill viewpoints. Make viewers nod or shake their heads — both drive engagement.' },
    checks: [
      { zh: '以个人价值观为唯一标准', en: 'Use your own values as the only standard' },
      { zh: '观点借鉴原爆款不超过 40%（5 个最多 2 个）', en: 'Borrow at most 40% from the original (2 of 5)' },
      { zh: '同主题再找低粉爆款，摘 1–2 个观点', en: 'Find similar low-follower hits, take 1–2 viewpoints' },
      { zh: '高赞评论区摘 1–2 个（点赞超 5000、赞比 20:1）', en: 'Take 1–2 top comments (5k+ likes, 20:1 ratio)' },
      { zh: '每个观点约 150 字，短句更好吸收', en: 'About 150 characters per viewpoint; short lines win' },
    ],
    tools: [
      { zh: '时长赛马分池：<1 分钟 / 1–3 / 3–5 / 5–7 / 7–10 / >10 分钟，各自成赛道。', en: 'Duration pools: <1 / 1–3 / 3–5 / 5–7 / 7–10 / >10 min, each its own lane.' },
      { zh: '当下最好打：3–5 分钟，尤其 4–5 分钟（大量内容实测）。', en: 'Best right now: 3–5 min, especially 4–5 min (field-tested).' },
      { zh: '字数公式：每秒约 4.2 字。4 分钟≈960 字、5 分钟≈1200 字；刨去开头结尾剩约 750–800 字，按每观点 150 字算约 5 个观点。', en: 'Word formula: ~4.2 chars/sec. 4 min≈960, 5 min≈1200 chars; minus opening/ending leaves ~750–800, ≈5 viewpoints at 150 each.' },
    ],
  },
  {
    id: 'content',
    icon: 'pen',
    zh: { title: '填内容', sub: '不用怕文笔差', principle: '语言无好坏，只有风格，做自己就行。边说边写——你写的不是稿子，是口述的总结。口语化，绝不抄内容。' },
    en: { title: 'Fill content', sub: 'Don’t fear bad writing', principle: 'Language has no good or bad, only style — be yourself. Write as you speak: it’s a spoken summary, not an essay. Never copy content.' },
    checks: [
      { zh: '边说边写，写的是口述的总结', en: 'Write while speaking — a spoken summary' },
      { zh: '口语化，用自己的语言习惯讲一遍', en: 'Keep it conversational, in your own voice' },
      { zh: '绝不抄内容（会触发查重或直接限流）', en: 'Never copy content (duplicate check or shadowban)' },
      { zh: '金句就是前面借来的确定性观点', en: 'Memorable lines are the certain viewpoints you borrowed' },
      { zh: '老板必看：干掉文案助理，内容要自己写', en: 'Founders: fire the ghostwriter — write it yourself' },
      { zh: '不会写先做短内容，从短的开始练', en: 'If stuck, start short and practice' },
    ],
    tools: [
      { zh: '观众看完一条 5 分钟、1000 多字的视频，记住的只有金句。语言无好坏，只有风格。', en: 'After a 5-minute, 1000-character video, viewers remember only the memorable lines. Language has only style.' },
    ],
  },
  {
    id: 'presence',
    icon: 'video',
    zh: { title: '镜头表现力', sub: '唯一且最好的方法', principle: '对着镜子说话，一次至少一小时。先克服对自己那张脸的不适，再克服对镜头的不适。' },
    en: { title: 'On-camera presence', sub: 'The one best method', principle: 'Talk to a mirror, at least an hour at a time. Overcome discomfort with your own face before the camera.' },
    checks: [
      { zh: '对着镜子说话，一次至少 1 小时', en: 'Talk to a mirror, 1+ hour each time' },
      { zh: '录前过两遍稿：第一遍内容、第二遍重点情绪', en: 'Two run-throughs: content first, then key emotion' },
      { zh: '15 秒法则：每 15 秒设一个情绪钩子', en: '15-second rule: an emotional hook every 15s' },
      { zh: '道具留人（红色手环、猴子等），多看一眼多留一两秒', en: 'Use a prop to hold attention a second longer' },
      { zh: '不背稿：稿子是自己边写边念出来的', en: 'Don’t memorize — you already spoke it while writing' },
      { zh: '情绪钩子包括动作、语气语调、内容伏笔', en: 'Hooks include motion, tone, and content foreshadowing' },
    ],
    tools: [
      { zh: '一条 3 分钟以上的视频，用户每 15 秒就有一次划走机会；作者每 15 秒设一个情绪钩子（动作、语气语调、内容伏笔）。', en: 'In a 3+ min video viewers can leave every 15s; set an emotional hook (motion, tone, foreshadowing) each time.' },
      { zh: '不自然的原因是 99.99% 的人不习惯对着自己说话。训练的不是对镜头的恐惧，而是对自己那张脸的恐惧。', en: '99.99% aren’t used to talking to themselves. Train the fear of your own face, not the camera.' },
    ],
  },
]

/** 时长预设 → 秒数；用于字数公式。 */
export const DURATIONS = [
  { label: '1 分钟', en: '1 min', sec: 60 },
  { label: '3 分钟', en: '3 min', sec: 180 },
  { label: '4 分钟', en: '4 min', sec: 240 },
  { label: '5 分钟', en: '5 min', sec: 300 },
  { label: '7 分钟', en: '7 min', sec: 420 },
  { label: '10 分钟', en: '10 min', sec: 600 },
]

const SPEECH_RATE = 4.2 // 每秒字数（作者语速）

export function targetChars(seconds) { return Math.round(seconds * SPEECH_RATE) }
export function suggestViewpoints(seconds) { return Math.max(1, Math.round(targetChars(seconds) * 0.8 / 150)) }

function localize(entry) {
  return lang() === 'en' ? entry.en : entry.zh
}

export function stepText(step) { return localize(step) }
export function checkText(check) { return localize(check) }
export function toolText(tool) { return localize(tool) }
export function durationLabel(d) { return lang() === 'en' ? d.en : d.label }

function emptyStep() {
  return { text: '', checks: {} }
}

export function newFlow() {
  const steps = {}
  for (const step of STEPS) steps[step.id] = emptyStep()
  return {
    id: `flow_${Date.now().toString(36)}_${Math.floor(Math.random() * 1296).toString(36)}`,
    title: '',
    format: 'script',
    durationSec: 240,
    activeStep: 'topic',
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.flows)) return null
    return data
  } catch {
    return null
  }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* 无痕模式等：忽略 */ }
}

export function loadFlowState() {
  const data = read()
  if (data) return data
  const fresh = { activeId: null, flows: [] }
  write(fresh)
  return fresh
}

/** 取当前流程；没有就新建一条并设为当前。 */
export function ensureActiveFlow() {
  const data = loadFlowState()
  let flow = data.flows.find(f => f.id === data.activeId)
  if (!flow) {
    flow = newFlow()
    data.flows.unshift(flow)
    data.activeId = flow.id
    write(data)
  }
  return { data, flow }
}

export function selectFlow(id) {
  const data = loadFlowState()
  data.activeId = id
  write(data)
  return data
}

/** 保存一个流程（更新 updatedAt），返回新的完整 state。 */
export function saveFlow(flow) {
  const data = loadFlowState()
  flow.updatedAt = new Date().toISOString()
  const i = data.flows.findIndex(f => f.id === flow.id)
  if (i >= 0) data.flows[i] = flow
  else { data.flows.unshift(flow); data.activeId = flow.id }
  write(data)
  return data
}

export function deleteFlow(id) {
  const data = loadFlowState()
  data.flows = data.flows.filter(f => f.id !== id)
  if (data.activeId === id) data.activeId = data.flows[0]?.id ?? null
  write(data)
  return data
}

export function addFlow() {
  const data = loadFlowState()
  const flow = newFlow()
  data.flows.unshift(flow)
  data.activeId = flow.id
  write(data)
  return { data, flow }
}

/** 汇总流程稿：把五步的文字拼成可保存的脚本文本。 */
export function composeScript(flow) {
  const lines = []
  if (flow.title) lines.push(`【${stepText(STEPS[0]).title}】${flow.title}`)
  const topic = flow.steps.topic?.text?.trim()
  if (topic) lines.push(topic)
  const opening = flow.steps.opening?.text?.trim()
  if (opening) lines.push('', '【开头】', opening)
  const vp = flow.steps.viewpoints?.text?.trim()
  if (vp) lines.push('', '【观点】', vp)
  const content = flow.steps.content?.text?.trim()
  if (content) lines.push('', `【${lang() === 'en' ? 'Content' : '内容'}】`, content)
  const presence = flow.steps.presence?.text?.trim()
  if (presence) lines.push('', `【${lang() === 'en' ? 'Presence cues' : '表现力提示'}】`, presence)
  return lines.join('\n').trim()
}
