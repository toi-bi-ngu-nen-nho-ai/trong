// Trỏ mọi specifier `@blocksuite/*` vào JS ĐÃ DỊCH trong `.vendor-build/`.
//
// Vì sao không dùng resolve.alias: mỗi gói con có bản đồ `exports` riêng — riêng
// `@blocksuite/affine` có 207 subpath trỏ tới 207 file khác nhau — nên một luật tiền tố sẽ
// trỏ sai. Plugin này đọc đúng `exports` của từng gói rồi ánh xạ sang `.vendor-build/`.
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const NGUON = 'src/vendor/blocksuite'
const BUILD = '.vendor-build'

type Goi = { thuMuc: string; exports: Record<string, unknown> | undefined }

function quetGoi(): Map<string, Goi> {
  const map = new Map<string, Goi>()
  const di = (dir: string, sau: number) => {
    if (sau > 5) return
    let mucs: fs.Dirent[]
    try {
      mucs = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of mucs) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const f = path.join(dir, e.name)
      if (e.isDirectory()) di(f, sau + 1)
      else if (e.name === 'package.json') {
        try {
          const j = JSON.parse(fs.readFileSync(f, 'utf8'))
          if (j.name?.startsWith('@blocksuite/')) map.set(j.name, { thuMuc: dir, exports: j.exports })
        } catch {
          /* package.json hỏng thì bỏ qua */
        }
      }
    }
  }
  di(NGUON, 0)
  return map
}

// Tách `@blocksuite/affine/std/gfx` → ['@blocksuite/affine', './std/gfx'].
// Phải thử tên DÀI trước: `@blocksuite/affine-block-surface` và `@blocksuite/affine` cùng tiền tố.
function tach(spec: string, goi: Map<string, Goi>) {
  const phan = spec.split('/')
  for (let lay = phan.length; lay >= 2; lay--) {
    const ten = phan.slice(0, lay).join('/')
    if (goi.has(ten)) {
      const con = phan.slice(lay).join('/')
      return { ten, sub: con ? `./${con}` : '.' }
    }
  }
  return null
}

export function blocksuiteVendor(): Plugin {
  const goi = quetGoi()

  return {
    name: 'blocksuite-vendor',
    enforce: 'pre',

    configResolved() {
      if (!fs.existsSync(BUILD)) {
        throw new Error(
          `[blocksuite-vendor] chưa có ${BUILD}. Chạy "npm run dung:vendor" trước khi build hoặc dev.`
        )
      }
      console.log(`[blocksuite-vendor] ${goi.size} gói, đọc JS đã dịch từ ${BUILD}`)
    },

    resolveId(spec) {
      // `@blocksuite/icons` là gói npm thật, không nằm trong workspace — để Vite tự lo.
      if (!spec.startsWith('@blocksuite/') || spec.startsWith('@blocksuite/icons')) return null

      const t = tach(spec, goi)
      if (!t) return null

      const info = goi.get(t.ten)!
      const dich = info.exports?.[t.sub]
      const tuongDoiTs =
        typeof dich === 'string'
          ? path.join(info.thuMuc, dich)
          : path.join(info.thuMuc, 'src', t.sub === '.' ? 'index.ts' : `${t.sub.slice(2)}.ts`)

      // Ánh xạ src/vendor/... → .vendor-build/... và .ts → .js
      const rel = path.relative(NGUON, tuongDoiTs)
      const ungVien = [
        path.join(BUILD, rel).replace(/\.ts$/, '.js'),
        path.join(BUILD, rel).replace(/\.ts$/, '/index.js'),
      ]
      for (const u of ungVien) if (fs.existsSync(u)) return path.resolve(u).split(path.sep).join('/')

      console.warn(`[blocksuite-vendor] không phân giải được: ${spec}`)
      return null
    },
  }
}
