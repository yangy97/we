/**
 * 从「旧站静态目录」一次性同步到 public/（需要时再手动执行：npm run sync:assets）
 * 源目录默认同级 ../lovewjl，可通过环境变量覆盖，例如：
 *   LOVEWJL_SRC=/path/to/lovewjl npm run sync:assets
 */
import { rmSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pub = join(root, 'public')
const defaultSrc = join(root, '..', 'lovewjl')
const lovewjl = process.env.LOVEWJL_SRC
  ? join(process.env.LOVEWJL_SRC)
  : defaultSrc

const dirs = ['css', 'fonts', 'img', 'js', 'music']

if (!existsSync(lovewjl)) {
  console.warn(
    '[sync-assets] 未找到源目录，已跳过：',
    lovewjl,
    '\n  需要同步时，把旧站 lovewjl 放在与 love-vue 同级的 lovewjl/，或设置 LOVEWJL_SRC 后重试。',
  )
  process.exit(0)
}

let copied = 0
for (const d of dirs) {
  const src = join(lovewjl, d)
  const dest = join(pub, d)
  if (!existsSync(src)) {
    console.warn('[sync-assets] 跳过（无此子目录）:', src)
    continue
  }
  rmSync(dest, { recursive: true, force: true })
  cpSync(src, dest, { recursive: true })
  copied++
  console.log('[sync-assets] 已同步', d, '-> public/' + d)
}

if (copied === 0) {
  console.warn('[sync-assets] 未同步任何目录，请检查 lovewjl 下是否有 css / fonts / img / js / music')
} else {
  console.log('[sync-assets] 完成，已处理', copied, '类资源')
}
