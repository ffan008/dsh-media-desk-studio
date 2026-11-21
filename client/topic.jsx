// 选题采集：按关键词搜公开爆款，把结果并进灵感墙。
// 和「导入我的账号」的分工：那边是抓自己发过什么，这里是找别人什么内容跑得好。
import React from 'react'
import { crawlerStatus, importTopics, toast } from './desk.js'
import { t, useLang } from './i18n.js'
import { Dialog, Icon } from './ui.jsx'

const PLATFORMS = ['抖音', '小红书', 'B站', '微博', '知乎', '快手', '贴吧']
const PRESETS = ['AI工具', 'AI副业', '提示词', '效率提升']

function PlatformPicker({ value, onChange }) {
  return (
    <div className="md-segmented" role="radiogroup" aria-label={t('平台')}>
      {PLATFORMS.map(name => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          className={value === name ? 'is-active' : ''}
          onClick={() => onChange(name)}
        >{t(name)}</button>
      ))}
    </div>
  )
}

function StatusLine({ status }) {
  if (!status) return <p className="md-setup-lead md-shimmer">{t('正在检查 MediaCrawler…')}</p>
  if (status.state === 'off') {
    return (
      <div className="md-setup-note is-error">
        <p>{t('没连上 MediaCrawler（{base}）。', { base: status.base })}</p>
        <p>{t('先在终端把媒体爬虫服务起起来：')}</p>
        <code>bash ~/Obsidian/世界何以至此/02-Areas\ 领域/工具开发/start-mediacrawler.sh</code>
      </div>
    )
  }
  if (status.state === 'error') {
    return <p className="md-setup-note is-error">{status.message}</p>
  }
  return (
    <p className="md-setup-note">
      <Icon name="check" size={13} /> {t('MediaCrawler 已连接')}
      {status.running ? t('（正在跑别的采集，等它结束）') : ''}
    </p>
  )
}

export function TopicDialog({ onClose }) {
  useLang()
  const [status, setStatus] = React.useState(null)
  const [platform, setPlatform] = React.useState('抖音')
  const [keywords, setKeywords] = React.useState('')
  const [limit, setLimit] = React.useState(20)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    crawlerStatus().then(next => { if (alive) setStatus(next) })
    return () => { alive = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    const words = keywords.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)
    if (!words.length) {
      toast(t('先填一个关键词'), { error: true })
      return
    }
    setBusy(true)
    const ok = await importTopics({
      platform,
      keywords: words,
      limit: Number(limit) || 20,
      wantComments: false,
    })
    setBusy(false)
    if (ok) onClose()
  }

  const ready = status?.state === 'ready'
  return (
    <Dialog title={t('按关键词找选题')} onClose={onClose} width={520}>
      <form className="md-form" onSubmit={submit}>
        <p className="md-setup-lead">
          {t('输入关键词，去公开内容里找互动高的选题，直接进灵感墙。不花 Monid 余额，用的是你本机的 MediaCrawler。')}
        </p>

        <StatusLine status={status} />

        <label className="md-field">
          <span>{t('平台')}</span>
          <PlatformPicker value={platform} onChange={setPlatform} />
        </label>

        <label className="md-field">
          <span>{t('关键词')}</span>
          <textarea
            rows={2}
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder={t('用逗号分隔，最多 5 个。比如：AI工具, AI副业')}
          />
          <small>{t('第一次用需要扫码登录，浏览器弹出后扫一下就好。')}</small>
        </label>

        <div className="md-saved-accounts">
          {PRESETS.map(word => (
            <button
              type="button"
              key={word}
              className="md-pill is-small"
              onClick={() => setKeywords(prev => (prev.trim() ? `${prev.replace(/[,，]\s*$/, '')}, ${word}` : word))}
            ><Icon name="plus" size={12} />{t(word)}</button>
          ))}
        </div>

        <label className="md-field">
          <span>{t('抓多少条')}</span>
          <input type="number" min={10} max={100} step={10} value={limit} onChange={e => setLimit(e.target.value)} />
          <small>{t('按互动量排序，多的先收。一次 10–100 条。')}</small>
        </label>

        <p className="md-setup-foot">
          {t('只抓公开内容，遵守平台条款，别高频反复抓。')}
        </p>

        <div className="md-form-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="md-btn" onClick={onClose}>{t('取消')}</button>
          <button type="submit" className="md-btn is-primary" disabled={busy || !ready}>
            {busy ? <span className="md-shimmer">{t('正在抓取…可能需要一两分钟')}</span> : t('开始抓取')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
