// Plugin Vite cho BẢN THỬ NHÚNG (nhánh probe-nhung-lit) — không thuộc mã sản phẩm.
//
// Việc của nó: phân giải mọi specifier `@blocksuite/*` thẳng vào cây nguồn AFFiNE trên máy,
// vì bản 0.27.0 chưa publish lên npm và các gói con dùng `workspace:*` nên npm không cài được.
//
// Vì sao không dùng `resolve.alias` cho xong: mỗi gói con có bản đồ `exports` riêng
// (`@blocksuite/affine` có 207 subpath, mỗi cái trỏ tới một file khác nhau), nên một luật
// tiền tố đơn giản sẽ trỏ sai. Plugin này đọc đúng `exports` của từng gói.
//
// Lưu ý quan trọng: bản thử này cố ý KHÔNG dùng `src/vendor/blocksuite/`. Nếu để hai bản sao
// của `store`/`global` cùng tồn tại thì mỗi bản có class riêng, và mọi phép `instanceof` giữa
// chúng sẽ sai — lỗi rất khó lần. Một nguồn duy nhất, dù là bản thử.

import * as babel from '@babel/core'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const AFFINE_ROOT = 'C:/Users/LENOVO/Downloads/AFFiNE/blocksuite'
const PROJECT_ROOT = 'C:/Users/LENOVO/Downloads/drtrong'

type PkgInfo = { dir: string; exports: Record<string, unknown> | undefined }

function scanPackages(): Map<string, PkgInfo> {
  const map = new Map<string, PkgInfo>()

  const walk = (dir: string, depth: number) => {
    if (depth > 4) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        walk(full, depth + 1)
      } else if (e.name === 'package.json') {
        try {
          const j = JSON.parse(fs.readFileSync(full, 'utf8'))
          if (j.name?.startsWith('@blocksuite/')) {
            map.set(j.name, { dir, exports: j.exports })
          }
        } catch {
          /* package.json hỏng thì bỏ qua */
        }
      }
    }
  }

  walk(path.join(AFFINE_ROOT, 'affine'), 1)
  walk(path.join(AFFINE_ROOT, 'framework'), 1)
  return map
}

// Tách `@blocksuite/affine/std/gfx` thành ['@blocksuite/affine', './std/gfx'].
// Phải thử tên dài trước vì `@blocksuite/affine-block-surface` và `@blocksuite/affine` cùng tiền tố.
function splitSpecifier(
  source: string,
  packages: Map<string, PkgInfo>
): { pkg: string; sub: string } | null {
  const parts = source.split('/')
  for (let take = parts.length; take >= 2; take--) {
    const name = parts.slice(0, take).join('/')
    if (packages.has(name)) {
      const rest = parts.slice(take).join('/')
      return { pkg: name, sub: rest ? `./${rest}` : '.' }
    }
  }
  return null
}

function resolveFromExports(info: PkgInfo, sub: string): string | null {
  const target = info.exports?.[sub]
  if (typeof target === 'string') return path.join(info.dir, target)

  // Không có bản đồ exports (hoặc thiếu subpath): đoán theo quy ước src/.
  const guessBase = sub === '.' ? path.join(info.dir, 'src', 'index') : path.join(info.dir, 'src', sub.slice(2))
  for (const candidate of [`${guessBase}.ts`, path.join(guessBase, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

export function blocksuiteSource(): Plugin {
  const packages = scanPackages()
  const missing = new Set<string>()

  return {
    name: 'blocksuite-source',
    enforce: 'pre',

    configResolved() {
      console.log(`[blocksuite-source] nạp ${packages.size} gói từ ${AFFINE_ROOT}`)
    },

    // Cùng vật cản `accessor` mà P0-A đã trả giá, lần này ở mã AFFiNE nên nằm ngoài phạm vi
    // bộ lọc của `accessorSupport()` trong vite.config.ts. oxc parse được `accessor` nhưng
    // không hạ cấp, nên trình duyệt ném SyntaxError. Hai lượt Babel tách rời — gộp một lượt
    // thì `preset-typescript` và `plugin-proposal-decorators` giẫm chân nhau (xem ghi chú dài
    // trong vite.config.ts).
    async transform(code, id) {
      const [bareId] = id.split('?')
      const normalized = bareId.replace(/\\/g, '/')
      if (!normalized.includes('/AFFiNE/blocksuite/')) return null
      if (!/\.tsx?$/.test(normalized)) return null
      if (!/\baccessor\b/.test(code)) return null

      // KHÁC với `accessorSupport()` trong vite.config.ts: ở đó `setPublicClassFields: true`
      // khớp mã port của dự án. Với mã AFFiNE thì KHÔNG được dùng — `@provide` của
      // `@lit/context` (xem `std/src/view/element/lit-host.ts:198`) cần ngữ nghĩa define; ép
      // assign semantics làm Babel sinh ra lệnh chạm `this` trước `super()`, và trình duyệt ném
      // "Must call super constructor in derived class...". Để mặc định.
      const assumptions = {}
      const isTSX = normalized.endsWith('.tsx')

      const stripped = await babel.transformAsync(code, {
        filename: bareId,
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        sourceMaps: true,
        assumptions,
        presets: [['@babel/preset-typescript', { isTSX, allowDeclareFields: true }]],
        plugins: [['@babel/plugin-syntax-decorators', { version: '2023-05' }]],
      })
      if (!stripped?.code) throw new Error(`[blocksuite-source] lượt 1 hỏng: ${bareId}`)

      const result = await babel.transformAsync(stripped.code, {
        filename: bareId.replace(/\.tsx?$/, isTSX ? '.jsx' : '.js'),
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        sourceMaps: true,
        inputSourceMap: stripped.map ?? undefined,
        assumptions,
        plugins: [['@babel/plugin-proposal-decorators', { version: '2023-05' }]],
      })
      if (!result?.code) throw new Error(`[blocksuite-source] lượt 2 hỏng: ${bareId}`)

      return { code: result.code, map: result.map }
    },

    async resolveId(source, importer) {
      // `@blocksuite/icons` là gói npm thật, không nằm trong workspace AFFiNE — để Vite tự lo.
      if (source.startsWith('@blocksuite/') && !source.startsWith('@blocksuite/icons')) {
        const split = splitSpecifier(source, packages)
        if (!split) {
          if (!missing.has(source)) {
            missing.add(source)
            console.warn(`[blocksuite-source] KHÔNG có gói: ${source}`)
          }
          return null
        }
        const file = resolveFromExports(packages.get(split.pkg)!, split.sub)
        if (file) return file.split(path.sep).join('/')
        console.warn(`[blocksuite-source] KHÔNG phân giải được subpath: ${source}`)
        return null
      }

      const fromAffine = importer?.replace(/\\/g, '/').includes('/AFFiNE/blocksuite/')
      if (!fromAffine) return null

      // Mã nguồn BlockSuite viết import tương đối kèm đuôi `.js` (chuẩn ESM), nhưng file thật
      // trên đĩa là `.ts`. Bỏ đuôi rồi để Vite tự tìm — cùng cách `vendorJsToTs` đang làm cho
      // thư mục vendor.
      if (source.startsWith('.') && source.endsWith('.js')) {
        const resolved = await this.resolve(source.slice(0, -3), importer, { skipSelf: true })
        return resolved?.id ?? null
      }

      // Cây AFFiNE nằm NGOÀI dự án và không có `node_modules` riêng, nên khi một file ở đó
      // import `lit` hay `lodash-es/throttle`, phép đi ngược lên thư mục cha không bao giờ chạm
      // tới `node_modules` của drtrong. Phân giải hộ, lấy gốc dự án làm điểm xuất phát.
      if (!source.startsWith('.') && !path.isAbsolute(source)) {
        const anchor = path.join(PROJECT_ROOT, '__probe_anchor__.ts')
        const resolved = await this.resolve(source, anchor, { skipSelf: true })
        if (resolved) return resolved.id

        // Deep import không đuôi (`lodash-es/throttle`) ở gói không khai `exports`:
        // thử thêm `.js` rồi `/index.js`.
        for (const suffix of ['.js', '/index.js']) {
          const retry = await this.resolve(source + suffix, anchor, { skipSelf: true })
          if (retry) return retry.id
        }
        console.warn(`[blocksuite-source] KHÔNG phân giải được gói npm: ${source}`)
      }

      return null
    },
  }
}
