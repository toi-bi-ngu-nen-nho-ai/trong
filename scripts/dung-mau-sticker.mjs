// Nạp ba bộ nhãn dán dựng sẵn của AFFiNE vào nút "Mẫu" trên thanh công cụ edgeless, cạnh bộ mũi tên
// mà `dung-mau-handy.mjs` đã bơm. Chủ dự án duyệt việc chép ngày 2026-09-01.
//
// Nguồn KHÔNG phải một repo trên mạng mà là bản checkout AFFiNE nằm sẵn trên máy — đường dẫn đọc từ
// biến môi trường `AFFINE_REPO`, mặc định `../AFFiNE` cạnh repo này. Vì thế script KHÔNG clone gì
// cả; nếu thư mục không có, nó dừng ngay và bảo phải trỏ `AFFINE_REPO` vào đâu.
//
//   1. Đọc `packages/frontend/templates/stickers/<Danh mục>/Content/*.svg`.
//      CHỈ `Content/`, KHÔNG `Cover/`: hai thư mục là hai tệp khác nhau, và `Paper/Cover` nặng
//      1020 KB trong khi `Paper/Content` chỉ 108 KB. `mau-handy` vốn đã dùng một tệp cho cả vai
//      preview lẫn vai asset, giữ nguyên quy ước đó.
//   2. Chép vào `public/static/templates/stickers/<thu-muc>/<slug>.svg` — Vite phục vụ tĩnh, panel
//      `fetch()` khi người dùng thả. KHÔNG nhồi byte SVG vào chunk JS (D13).
//   3. Ghi `src/board/mau-sticker.sinh.ts` — chỉ id/tên/kích thước, vài KB chữ.
//
// KHÁC `dung-mau-handy.mjs` một điểm quan trọng: KHÔNG ép mực `#808080`. Bước đó là bản vá riêng
// cho handy-arrows (nguồn dùng `fill="black"`/`currentColor` nên đen tịt trên canvas tối). Ba bộ
// này có màu sẵn — ép xám là phá hình, không phải sửa tương phản.
//
// Chạy tay: `npm run dung:mau-sticker`. Kết quả (thư mục public/ + tệp .sinh.ts) ĐƯỢC COMMIT.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const REPO = process.env.AFFINE_REPO || path.resolve(GOC, '../AFFiNE')
const THU_MUC_NGUON = path.join(REPO, 'packages/frontend/templates/stickers')
const THU_MUC_DICH = path.join(GOC, 'public/static/templates/stickers')
const TEP_SINH = path.join(GOC, 'src/board/mau-sticker.sinh.ts')
const KHI_HONG_DUNG = { w: 240, h: 240 } // SVG không parse được kích thước — hiếm, nhưng đừng ném cả lượt chạy.

const DANH_MUC = [
  { nguon: 'Cheeky Piggies', hienThi: 'Heo mập', thuMuc: 'heo-nhang' },
  { nguon: 'Contorted Stickers', hienThi: 'Nhãn dán', thuMuc: 'nhan-dan' },
  { nguon: 'Paper', hienThi: 'Giấy nhớ', thuMuc: 'giay-nho' },
]

// Bỏ 3 nhãn dán mang thương hiệu thượng nguồn. Hai lý do, cả hai đều đủ một mình:
//   - D16 luật A (`scripts/kiem-dist.mjs`) cấm chuỗi `affine-` CÓ GẠCH NỐI trong bản phát hành, mà
//     slug của chúng sẽ là `affine.svg` / `affine-ai.svg`.
//   - "Local First" là khẩu hiệu marketing của AFFiNE, không thuộc về app này.
const BO_QUA = new Set(['AFFiNE.svg', 'AFFiNE AI.svg', 'Local First.svg'])

// Tổng số nhãn dán mong đợi sau khi lọc: 15 + (15-1) + (15-2). Chốt cứng để một lượt chạy sinh
// thiếu tệp không lọt qua im lặng — kiểu hỏng khó thấy nhất ở đây.
const SO_MAU_MONG_DOI = 42

// ── Hai hàm dưới đây chép từ `dung-mau-handy.mjs` (thuần, vài dòng). Cố ý KHÔNG tách ra module
// dùng chung: làm vậy phải sửa script mũi tên đang chạy tốt, mà muốn kiểm lại nó thì phải clone
// lại repo nguồn. Đổi một trong hai thì rà cả hai.

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

/** Tên tệp nguồn → slug an toàn cho URL: "A lot of question.svg" → "a-lot-of-question". */
function taoSlug(tenTep) {
  const s = tenTep
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!s) throw new Error(`Không tạo được slug từ tên tệp ${tenTep}`)
  return s
}

if (!existsSync(THU_MUC_NGUON)) {
  throw new Error(
    `Không thấy ${THU_MUC_NGUON}. Trỏ biến môi trường AFFINE_REPO tới bản checkout AFFiNE, ví dụ:\n` +
      `  AFFINE_REPO=C:/Users/<tên>/Downloads/AFFiNE npm run dung:mau-sticker`,
  )
}

const nhom = []
const nghiNgoNgoai = [] // SVG có tham chiếu ngoài miền / phông — cảnh báo, không chặn.
let tong = 0

for (const { nguon, hienThi, thuMuc } of DANH_MUC) {
  const thuMucNguon = path.join(THU_MUC_NGUON, nguon, 'Content')
  if (!existsSync(thuMucNguon)) throw new Error(`Không thấy danh mục nguồn ${thuMucNguon}`)

  const tepSvg = readdirSync(thuMucNguon)
    .filter((t) => t.toLowerCase().endsWith('.svg') && !BO_QUA.has(t))
    .sort(soSanhTuNhien)

  if (tepSvg.length === 0) throw new Error(`Không thấy .svg nào trong ${thuMucNguon}`)

  const thuMucDich = path.join(THU_MUC_DICH, thuMuc)
  mkdirSync(thuMucDich, { recursive: true })

  const mau = []
  const daDungSlug = new Map()

  for (const tep of tepSvg) {
    const id = taoSlug(tep)
    if (daDungSlug.has(id)) {
      throw new Error(`Trùng slug "${id}" trong ${nguon}: ${daDungSlug.get(id)} và ${tep}`)
    }
    daDungSlug.set(id, tep)

    const noiDung = readFileSync(path.join(thuMucNguon, tep), 'utf8')

    if (/href\s*=\s*["']https?:|url\(\s*['"]?https?:|@font-face|<image[\s>]/i.test(noiDung)) {
      nghiNgoNgoai.push(`${nguon}/${tep}`)
    }
    // Chốt D16 ngay tại nguồn: một chuỗi `affine-` lọt vào public/ sẽ làm `kiem-dist.mjs` báo đỏ
    // sau khi build, xa chỗ gây lỗi. Bắt ở đây rẻ hơn nhiều.
    if (/\baffine-/i.test(noiDung)) throw new Error(`${nguon}/${tep} chứa chuỗi "affine-" — vi phạm D16`)

    writeFileSync(path.join(thuMucDich, `${id}.svg`), noiDung)
    mau.push({ id, ten: tep.replace(/\.svg$/i, ''), ...docKichThuoc(noiDung) })
  }

  // Dọn tệp .svg thừa (đã bị gỡ ở thượng nguồn). Ghi ĐÈ ở trên rồi mới xoá phần dư — không
  // `rmSync` cả thư mục vì trình đánh chỉ mục (CodeGraph) hay giữ handle trên thư mục vừa có tệp
  // mới → `EPERM`. Xoá từng tệp; kẹt tệp nào thì chỉ cảnh báo, không chặn lượt chạy.
  const giuLai = new Set(mau.map((m) => `${m.id}.svg`))
  for (const tep of readdirSync(thuMucDich)) {
    if (tep.toLowerCase().endsWith('.svg') && !giuLai.has(tep)) {
      try {
        rmSync(path.join(thuMucDich, tep))
      } catch (e) {
        console.warn(`! không xoá được tệp thừa ${thuMuc}/${tep}: ${e.code ?? e.message}`)
      }
    }
  }

  tong += mau.length
  nhom.push({ danhMuc: hienThi, thuMuc, mau })
  console.log(`> ${nguon} → ${mau.length} nhãn dán vào ${path.relative(GOC, thuMucDich)}`)
}

if (tong !== SO_MAU_MONG_DOI) {
  throw new Error(`Sinh ra ${tong} nhãn dán, mong đợi ${SO_MAU_MONG_DOI}. Nguồn đã đổi — kiểm tay trước khi commit.`)
}

const than =
  '// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-sticker` để tạo lại.\n' +
  '// Nguồn: AFFiNE packages/frontend/templates/stickers/<Danh mục>/Content →\n' +
  '// public/static/templates/stickers/<thu-muc>/. Chỉ chứa id/tên/kích thước; byte SVG nằm trong\n' +
  '// public/, panel fetch khi cần (không vào chunk JS — D13).\n' +
  '\n' +
  'export type MauSticker = { readonly id: string; readonly ten: string; readonly w: number; readonly h: number }\n' +
  '\n' +
  'export type NhomSticker = {\n' +
  '  readonly danhMuc: string\n' +
  '  readonly thuMuc: string\n' +
  '  readonly mau: readonly MauSticker[]\n' +
  '}\n' +
  '\n' +
  'export const MAU_STICKER: readonly NhomSticker[] = [\n' +
  nhom
    .map(
      (n) =>
        `  {\n` +
        `    danhMuc: ${JSON.stringify(n.danhMuc)},\n` +
        `    thuMuc: ${JSON.stringify(n.thuMuc)},\n` +
        `    mau: [\n` +
        n.mau
          .map((m) => `      { id: ${JSON.stringify(m.id)}, ten: ${JSON.stringify(m.ten)}, w: ${m.w}, h: ${m.h} },`)
          .join('\n') +
        `\n    ],\n` +
        `  },`,
    )
    .join('\n') +
  '\n]\n'

writeFileSync(TEP_SINH, than)

console.log(`> ghi ${path.relative(GOC, TEP_SINH)} (${tong} nhãn dán, ${nhom.length} danh mục)`)
if (nghiNgoNgoai.length > 0) {
  console.warn(
    `! ${nghiNgoNgoai.length} SVG có tham chiếu ngoài (phông/ảnh nhúng/href http) — kiểm tay: ${nghiNgoNgoai.join(', ')}`,
  )
}
console.log('xong.')
