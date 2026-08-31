// Nạp bộ "mẫu" mũi tên vẽ tay từ https://github.com/Eronred/handy-arrows vào ứng dụng.
//
// Nút "Mẫu" trên thanh công cụ edgeless (EdgelessTemplateButton) mở panel gọi
// `builtInTemplates.list(category)`. Thượng nguồn để `templates = []` rỗng, chờ app chủ bơm qua
// `builtInTemplates.extend(manager)` — drtrong chưa từng gọi, nên panel mở ra trắng (xem HANDOFF
// mục 3). Script này là NỬA "dữ liệu" của việc bơm đó:
//
//   1. Sparse-clone `static/arrows/` của repo handy-arrows (chỉ vài MB, ~185 tệp .svg).
//   2. Chép nguyên văn vào `public/static/templates/arrows/<id>.svg` — Vite phục vụ tĩnh, panel
//      `fetch()` khi người dùng thả sticker; KHÔNG nhồi byte SVG vào chunk JS (giữ D13).
//   3. Đọc `viewBox`/`width`/`height` từng tệp, ghi `src/board/mau-handy.sinh.ts` — chỉ mảng
//      `{ id, w, h }` (~vài KB chữ). Nửa "logic" (HandyTemplateManager) đọc mảng này ở
//      `src/board/mau-handy.ts`.
//
// Chạy tay: `npm run dung:mau-handy`. Kết quả (thư mục public/ + tệp .sinh.ts) ĐƯỢC COMMIT — script
// chỉ để tái tạo, không chạy trong build/dev/test.
//
// Vì sao clone mỗi lần thay vì giữ submodule: repo nguồn không có tag/giấy phép, và ta chỉ cần
// đúng một lần chép. Submodule sẽ là một phụ thuộc build vĩnh viễn cho một thao tác một lần.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const REPO = process.env.HANDY_ARROWS_REPO || 'https://github.com/Eronred/handy-arrows.git'
const THU_MUC_NGUON_TRONG_REPO = 'static/arrows'
const THU_MUC_DICH = path.join(GOC, 'public/static/templates/arrows')
const TEP_SINH = path.join(GOC, 'src/board/mau-handy.sinh.ts')
const KHI_HONG_DUNG = { w: 240, h: 240 } // SVG không parse được kích thước — hiếm, nhưng đừng ném cả lượt chạy.

function chay(lenh, doiSo, cwd) {
  const kq = spawnSync(lenh, doiSo, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', shell: false })
  if (kq.status !== 0) {
    throw new Error(`Lệnh hỏng (mã ${kq.status}): ${lenh} ${doiSo.join(' ')}`)
  }
  return kq.stdout
}

/** Đọc kích thước hiển thị của một SVG. Ưu tiên viewBox (2 số cuối), rồi width/height, rồi mặc định. */
function docKichThuoc(noiDungSvg) {
  const the = noiDungSvg.slice(0, 2000) // thẻ <svg ...> luôn nằm đầu tệp
  const kvb = the.match(/viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i)
  if (kvb) {
    const w = Math.round(parseFloat(kvb[1]))
    const h = Math.round(parseFloat(kvb[2]))
    if (w > 0 && h > 0) return { w, h }
  }
  const kw = the.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i)
  const kh = the.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i)
  if (kw && kh) {
    const w = Math.round(parseFloat(kw[1]))
    const h = Math.round(parseFloat(kh[1]))
    if (w > 0 && h > 0) return { w, h }
  }
  return { ...KHI_HONG_DUNG }
}

/** Số học tự nhiên: "2.svg" trước "10.svg". */
function soSanhTuNhien(a, b) {
  return a.replace(/\d+/g, (n) => n.padStart(12, '0')) < b.replace(/\d+/g, (n) => n.padStart(12, '0')) ? -1 : 1
}

const tamGoc = mkdtempSync(path.join(tmpdir(), 'handy-arrows-'))
try {
  console.log(`> sparse-clone ${REPO} → ${tamGoc}`)
  chay('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, tamGoc])
  chay('git', ['sparse-checkout', 'set', THU_MUC_NGUON_TRONG_REPO], tamGoc)

  const thuMucNguon = path.join(tamGoc, THU_MUC_NGUON_TRONG_REPO)
  const tepSvg = readdirSync(thuMucNguon)
    .filter((t) => t.toLowerCase().endsWith('.svg'))
    .sort(soSanhTuNhien)

  if (tepSvg.length === 0) throw new Error(`Không thấy .svg nào trong ${thuMucNguon}`)

  // Xoá sạch thư mục đích trước khi chép — tệp bị gỡ ở thượng nguồn không được sót lại.
  rmSync(THU_MUC_DICH, { recursive: true, force: true })
  mkdirSync(THU_MUC_DICH, { recursive: true })

  const nghiNgoNgoai = [] // SVG có tham chiếu ngoài miền / phông — cảnh báo, không chặn.
  const dsMau = []

  for (const tep of tepSvg) {
    const id = tep.replace(/\.svg$/i, '')
    const noiDung = readFileSync(path.join(thuMucNguon, tep), 'utf8')

    if (/href\s*=\s*["']https?:|url\(\s*['"]?https?:|@font-face|<image[\s>]/i.test(noiDung)) {
      nghiNgoNgoai.push(tep)
    }

    cpSync(path.join(thuMucNguon, tep), path.join(THU_MUC_DICH, `${id}.svg`))
    dsMau.push({ id, ...docKichThuoc(noiDung) })
  }

  const than =
    '// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-handy` để tạo lại.\n' +
    `// Nguồn: ${REPO} (${THU_MUC_NGUON_TRONG_REPO}) → public/static/templates/arrows/.\n` +
    '// Chỉ chứa kích thước; byte SVG nằm trong public/, panel fetch khi cần (không vào chunk JS).\n' +
    '\n' +
    'export type KichThuocMau = { readonly id: string; readonly w: number; readonly h: number }\n' +
    '\n' +
    'export const MAU_MUI_TEN: readonly KichThuocMau[] = [\n' +
    dsMau.map((m) => `  { id: ${JSON.stringify(m.id)}, w: ${m.w}, h: ${m.h} },`).join('\n') +
    '\n]\n'

  writeFileSync(TEP_SINH, than)

  console.log(`> chép ${dsMau.length} tệp → ${path.relative(GOC, THU_MUC_DICH)}`)
  console.log(`> ghi ${path.relative(GOC, TEP_SINH)}`)
  if (nghiNgoNgoai.length > 0) {
    console.warn(
      `! ${nghiNgoNgoai.length} SVG có tham chiếu ngoài (phông/ảnh nhúng/href http) — kiểm tay: ${nghiNgoNgoai.join(', ')}`,
    )
  }
  console.log('xong.')
} finally {
  rmSync(tamGoc, { recursive: true, force: true })
}
