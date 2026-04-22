/**
 * 随机情话：多源并行、少请求、快失败。
 * 不再默认请求 uomg / vvhan（易证书/ DNS 问题）；改为一言 + 今日诗词 v1 等可用接口。
 * 关闭远程：根目录建 `.env` 写 `VITE_ENABLE_REMOTE_LOVE_QUOTES=false`
 */

const TIMEOUT_MS = 5000

/** 是否请求第三方（默认开；纯本地请关） */
export function isRemoteLoveQuotesEnabled() {
  return import.meta.env.VITE_ENABLE_REMOTE_LOVE_QUOTES !== 'false'
}

function abortAfter(ms) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(t) }
}

/**
 * 一言；可选 c 为分类，见 https://developer.hitokoto.cn/sentence/
 */
async function tryHitokotoWithCategory(cat) {
  const { signal, done } = abortAfter(TIMEOUT_MS)
  try {
    const u = new URL('https://v1.hitokoto.cn/')
    u.searchParams.set('encode', 'json')
    u.searchParams.set('charset', 'utf-8')
    if (cat) u.searchParams.set('c', cat)
    const r = await fetch(u.toString(), { signal, cache: 'no-store' })
    done()
    if (!r.ok) return null
    const j = await r.json()
    const t = String(j.hitokoto ?? '').trim()
    return t || null
  } catch {
    done()
    return null
  }
}

function tryHitokoto() {
  return tryHitokotoWithCategory()
}

/** 今日诗词，JSON 带 access-control-allow-origin: * */
async function tryJinrishiciV1() {
  const { signal, done } = abortAfter(TIMEOUT_MS)
  try {
    const r = await fetch('https://v1.jinrishici.com/all.json', { signal, cache: 'no-store' })
    done()
    if (!r.ok) return null
    const j = await r.json()
    const t = String(j.content ?? '').trim()
    return t || null
  } catch {
    done()
    return null
  }
}

/** 一言（诗词类），与无分类、今日诗词 错开，减少整轮重复 */
function tryHitokotoI() {
  return tryHitokotoWithCategory('i')
}

/** 每轮 3 路并行，均不依赖 uomg / vvhan */
const PARALLEL_GROUP = [tryHitokoto, tryJinrishiciV1, tryHitokotoI]

/**
 * 拉取一句（兼容旧代码）：一轮并行
 */
export async function fetchRandomLoveQuote() {
  if (!isRemoteLoveQuotesEnabled()) return null
  const results = await Promise.allSettled(PARALLEL_GROUP.map((fn) => fn()))
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && r.value.length > 1) return r.value
  }
  return null
}

/**
 * 拉取多句：多轮并行；任一轮 3 路全无新增则停。
 */
export async function fetchRandomLoveQuotes(count) {
  if (!isRemoteLoveQuotesEnabled()) return []

  const want = Math.max(1, Math.min(24, count | 0))
  const out = []
  const seen = new Set()
  const maxRounds = Math.min(3, Math.ceil(want / 2) + 1)

  for (let round = 0; round < maxRounds && out.length < want; round++) {
    const results = await Promise.allSettled(PARALLEL_GROUP.map((fn) => fn()))
    let anyOk = false
    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue
      const t = r.value
      if (t.length < 2) continue
      if (seen.has(t)) continue
      seen.add(t)
      out.push(t)
      anyOk = true
      if (out.length >= want) break
    }
    if (!anyOk) break
  }

  return out
}
