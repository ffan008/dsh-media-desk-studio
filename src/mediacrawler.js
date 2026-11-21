// 选题采集：通过本机跑着的 MediaCrawler 服务按关键词搜公开爆款，把结果并进灵感墙。
// 和 monid.js 的分工：Monid 是「已知账号 → 抓他发的」，这里补的是「不知道谁在发 → 按关键词搜」。
// MediaCrawler 在本机跑，不花 API 余额，但登录态要用用户自己的（首次扫码）。
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { tr } from './i18n.js'
import { newId } from './ops.js'

const DEFAULT_BASE = 'http://127.0.0.1:8080'
const START_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 2_000
const JOB_TIMEOUT_MS = 10 * 60_000
const MAX_KEYWORDS = 5
const KEYWORD_MAX = 40

/** MediaCrawler 的平台代号 → 工作台用的平台名 */
const PLATFORM_ALIAS = {
  dy: '抖音', douyin: '抖音',
  xhs: '小红书', xiaohongshu: '小红书',
  bili: 'B站', bilibili: 'B站',
  wb: '微博',
  zhihu: '知乎',
  ks: '快手',
  tieba: '贴吧',
}

/** 工作台平台名 → MediaCrawler 平台代号 */
const CRAWLER_CODE = {
  抖音: 'dy', 小红书: 'xhs', B站: 'bili', 微博: 'wb', 知乎: 'zhihu', 快手: 'ks', 贴吧: 'tieba',
}

export const SUPPORTED = Object.keys(CRAWLER_CODE)

/** 用户填的服务地址，去掉末尾斜杠；空值走默认。 */
export function normalizeBase(input) {
  const text = String(input ?? '').trim()
  if (!text) return DEFAULT_BASE
  try {
    const url = new URL(text)
    if (!/^https?:$/.test(url.protocol)) throw new Error('bad protocol')
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    throw Object.assign(new Error(tr('MediaCrawler 地址填错了，应该是 http://127.0.0.1:8080 这样的形式')), { status: 400 })
  }
}

/** 关键词清洗：去重、限长、限个数。 */
export function normalizeKeywords(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,，\n]/)
  const seen = new Set()
  const out = []
  for (const piece of raw) {
    const word = String(piece ?? '').trim().slice(0, KEYWORD_MAX)
    if (!word || seen.has(word)) continue
    seen.add(word)
    out.push(word)
    if (out.length >= MAX_KEYWORDS) break
  }
  return out
}

/** 归一化一条抓取结果。抖音和小红书的字段名不同，这里统一。 */
export function normalizePost(row, platform) {
  if (!row || typeof row !== 'object') return null
  const id = String(row.aweme_id ?? row.note_id ?? row.video_id ?? row.id ?? '').trim()
  if (!id) return null
  const title = String(row.title ?? row.desc ?? '').trim()
  const body = String(row.desc ?? row.content ?? '').trim()
  const url = String(row.aweme_url ?? row.note_url ?? row.url ?? '').trim()
  const ts = Number(row.create_time ?? row.time ?? 0)
  const publishedAt = ts > 0 ? new Date(ts * 1000).toISOString() : null
  const nickname = String(row.nickname ?? row.user_nickname ?? '').trim()
  const cover = String(row.cover_url ?? row.cover ?? '').trim()
  // 不同平台计数列名不一样，能读到哪个算哪个
  const num = (...keys) => {
    for (const key of keys) {
      const value = Number(row[key])
      if (Number.isFinite(value)) return value
    }
    return 0
  }
  return {
    id,
    platform,
    title: title || body.slice(0, 60),
    body,
    url,
    author: nickname,
    publishedAt,
    cover: cover || null,
    keyword: String(row.source_keyword ?? '').trim(),
    views: num('view_count', 'video_play_count', 'play_count', 'views'),
    likes: num('liked_count', 'like_count', 'likes'),
    comments: num('comment_count', 'comments'),
    shares: num('share_count', 'shares'),
    saves: num('collected_count', 'collect_count', 'saves'),
  }
}

/** 互动总分，用来筛「爆款」并给灵感墙排序。 */
export function scoreOf(post) {
  return (post.likes || 0) + (post.comments || 0) * 5 + (post.saves || 0) * 3 + (post.shares || 0) * 2
}

async function callApi(base, path, init = {}) {
  let response
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch (err) {
    throw Object.assign(
      new Error(tr('连不上 MediaCrawler（{base}）。先在终端把媒体爬虫服务起起来再试', { base })),
      { status: 503, cause: err },
    )
  }
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!response.ok) {
    const detail = data?.detail ?? data?.error ?? text.slice(0, 200)
    throw Object.assign(new Error(String(detail || `HTTP ${response.status}`)), { status: response.status })
  }
  return data
}

/** 探测服务是否在跑，顺手把状态码带回去。 */
export async function crawlerStatus(input) {
  // 空值要走默认地址，别把 '' 直接拼进 URL
  let base
  try {
    base = normalizeBase(input)
  } catch {
    return { state: 'error', base: String(input ?? ''), message: tr('MediaCrawler 地址填错了') }
  }
  try {
    const health = await callApi(base, '/api/health')
    const status = await callApi(base, '/api/crawler/status')
    return {
      state: health?.status === 'ok' ? 'ready' : 'error',
      base,
      running: status?.status === 'running',
      platform: status?.platform ?? null,
      crawlerType: status?.crawler_type ?? null,
    }
  } catch (err) {
    if (err.status === 503) return { state: 'off', base }
    return { state: 'error', base, message: String(err.message ?? err) }
  }
}

/** MediaCrawler 的结果目录。默认在项目里。 */
function resultRoot() {
  return process.env.MEDIACRAWLER_DATA_DIR || join(homedir(), '.agent-reach', 'tools', 'MediaCrawler', 'data')
}

const CODE_DIR = { dy: 'douyin', xhs: 'xhs', bili: 'bilibili', wb: 'weibo', zhihu: 'zhihu', ks: 'kuaishou', tieba: 'tieba' }
const SAVE_FORMATS = ['jsonl', 'json']

/** 等这次抓取跑完。跑完后再读文件，避免读到写了一半的 json。 */
async function waitForJob(base, timeoutMs = JOB_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  // 先给它一点时间进入 running，别刚 start 完就判成 idle
  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  let sawRunning = false
  while (Date.now() < deadline) {
    const status = await callApi(base, '/api/crawler/status').catch(() => null)
    if (status?.status === 'running') {
      sawRunning = true
    } else if (sawRunning) {
      return true
    } else {
      // 还没进入 running，再等一轮；若一直不进，5 轮后放弃
      if (Date.now() > deadline - timeoutMs + 5 * POLL_INTERVAL_MS) return true
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw Object.assign(new Error(tr('抓取超时（超过 {min} 分钟），到 MediaCrawler 页面上看看是不是卡在扫码登录了', { min: Math.round(timeoutMs / 60_000) })), { status: 504 })
}

/** 从结果目录里找关键词对应、且比 since 新的文件。 */
async function readResults(platforms, since, formats) {
  const rows = []
  for (const code of platforms) {
    const folder = CODE_DIR[code] ?? code
    for (const format of formats) {
      const dir = join(resultRoot(), folder, format)
      let names = []
      try {
        const { readdir } = await import('node:fs/promises')
        names = await readdir(dir)
      } catch {
        continue
      }
      for (const name of names) {
        if (!name.endsWith(`.${format}`)) continue
        const full = join(dir, name)
        try {
          const { stat } = await import('node:fs/promises')
          const info = await stat(full)
          if (info.mtimeMs < since) continue
          const text = await readFile(full, 'utf8')
          if (format === 'json') {
            const data = JSON.parse(text)
            if (Array.isArray(data)) rows.push(...data)
          } else {
            for (const line of text.split('\n')) {
              const trimmed = line.trim()
              if (!trimmed) continue
              try {
                rows.push(JSON.parse(trimmed))
              } catch {
                // 半行就跳过
              }
            }
          }
        } catch {
          // 读不动就算了，不影响别的文件
        }
      }
    }
  }
  return rows
}

/**
 * 按关键词抓一批公开内容。
 * @param {{base?: string, platform: string, keywords: string[], limit?: number, wantComments?: boolean}} options
 */
export async function searchByKeyword(options) {
  const base = normalizeBase(options.base)
  const platform = CRAWLER_CODE[options.platform]
  if (!platform) {
    throw Object.assign(new Error(tr('这个平台 MediaCrawler 还不支持：{platform}', { platform: String(options.platform) })), { status: 400 })
  }
  const keywords = normalizeKeywords(options.keywords)
  if (!keywords.length) throw Object.assign(new Error(tr('先填一个关键词')), { status: 400 })

  const status = await callApi(base, '/api/crawler/status').catch(err => {
    throw err?.status === 503
      ? Object.assign(new Error(tr('连不上 MediaCrawler（{base}）', { base })), { status: 503 })
      : err
  })
  if (status?.status === 'running') {
    throw Object.assign(new Error(tr('MediaCrawler 正在跑别的任务，等它结束再来')), { status: 409 })
  }

  const since = Date.now()
  const body = {
    platform,
    login_type: 'qrcode',
    crawler_type: 'search',
    keywords: keywords.join(','),
    start_page: 1,
    enable_comments: Boolean(options.wantComments),
    enable_sub_comments: false,
    enable_media: false,
    save_option: 'json',
    headless: false,
    max_notes_count: Math.max(10, Math.min(Number(options.limit) || 20, 100)),
  }

  await callApi(base, '/api/crawler/start', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout?.(START_TIMEOUT_MS) })
  await waitForJob(base)

  const raw = await readResults([platform], since, SAVE_FORMATS)
  const seen = new Set()
  const posts = []
  for (const row of raw) {
    const post = normalizePost(row, PLATFORM_ALIAS[platform] ?? options.platform)
    if (!post || seen.has(post.id)) continue
    seen.add(post.id)
    posts.push(post)
  }
  posts.sort((a, b) => scoreOf(b) - scoreOf(a))
  const limited = typeof options.limit === 'number' ? posts.slice(0, options.limit) : posts
  return { posts: limited, total: posts.length, keywords, platform: PLATFORM_ALIAS[platform] ?? options.platform, base }
}

/**
 * 把抓到的选题并进工作台数据。已经在库里的（externalId 相同）只更新互动数据，不重复建卡。
 */
export function importTopics(draft, { posts, keyword, now = new Date().toISOString() }) {
  let added = 0
  let updated = 0
  for (const post of posts) {
    const externalId = `${post.platform}:${post.id}`
    let item = draft.items.find(row => row.externalId === externalId)
    if (!item) {
      item = {
        id: newId('it'),
        kind: 'web',
        title: post.title,
        body: post.body,
        tags: keyword ? [keyword] : [],
        status: 'idea',
        personaIds: [],
        drafts: {},
        createdAt: now,
        platform: post.platform,
        url: post.url,
        source: post.author || post.platform,
        media: post.cover ? { src: post.cover } : null,
        imported: true,
        externalId,
        // 选题热度，界面上当排序权重用
        score: scoreOf(post),
      }
      draft.items.push(item)
      added += 1
    } else {
      item.score = scoreOf(post)
      if (post.cover && !item.media) item.media = { src: post.cover }
      updated += 1
    }
    const numbers = { views: post.views, likes: post.likes, comments: post.comments, shares: post.shares, saves: post.saves }
    const metric = draft.metrics.find(row => row.externalId === externalId)
    if (metric) Object.assign(metric, numbers, { fetchedAt: now })
    else draft.metrics.push({ id: newId('m'), itemId: item.id, platform: post.platform, date: post.publishedAt || now, ...numbers, externalId, fetchedAt: now })
  }
  return { added, updated }
}
