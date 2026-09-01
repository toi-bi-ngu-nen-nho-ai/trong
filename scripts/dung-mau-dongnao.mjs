// Nạp 5 mẫu BẢNG "Động não" của AFFiNE (Brainstorming) vào nút "Mẫu" edgeless. Khác hai script kia:
// đây KHÔNG phải nhãn dán mà là `type: 'template'` — chèn cả một cụm ghi chú/hình/đường nối lên
// canvas, đi qua `createTemplateJob(std, 'template', …)` của cây vendored.
//
// Nguồn: bản checkout AFFiNE trên máy (`AFFINE_REPO`, mặc định `../AFFiNE`),
// `packages/frontend/templates/edgeless-snapshot/Brainstorming/<Tên>.zip` + `<Tên>.svg` (bìa).
// Trong mỗi .zip: `info.json`, `page:home.snapshot.json`, `assets/` (RỖNG ở cả 5 tệp — đã đếm
// 2026-09-01). Script vẫn kiểm và NÉM nếu gặp tài sản nhị phân: đường đó chưa từng được kiểm và ghi
// mù vào public/static/templates/ sẽ đụng cấu trúc thư mục của dung-mau-sticker.mjs.
//
// ═══ HAI PHÉP RỬA BẮT BUỘC, đừng bỏ bước nào ═══
//
// 1. `affine-` → `drt-`. Snapshot thượng nguồn nhồi tên token màu dạng DỮ LIỆU:
//    `--affine-palette-line-black`, `--affine-palette-shape-yellow`, `--affine-tag-purple`,
//    `--affine-note-shadow-sticker`… Chép nguyên thì (a) `kiem-dist.mjs` luật A báo đỏ vì `affine-`
//    lọt vào `dist/**/*.json`, và (b) mẫu render với custom property KHÔNG PHÂN GIẢI ĐƯỢC — đúng
//    lớp lỗi luật B của cổng đó sinh ra để bắt: console sạch, tên thẻ đúng, hình sai, mắt thường
//    không thấy. Luật khớp `\baffine-` CÓ GẠCH NỐI, y như scripts/doi-ten-vendor.mjs, nên
//    `affine:page` / `affine:surface` (FLAVOUR, dấu hai chấm) không bị chạm — đổi flavour là không
//    đọc được tài liệu do AFFiNE tạo.
//
// 2. Dịch. Mọi `insert` không rỗng phải có trong `scripts/dich-dongnao.json`; gặp chuỗi lạ thì
//    script LIỆT KÊ HẾT RỒI NÉM. Không được im lặng để tiếng Anh lọt lên bề mặt hiển thị — đó là
//    cùng kỷ luật mà `kiem-dist.mjs` luật C áp cho cây vendored.
//
// D13: nội dung mẫu (~204 KB) và bìa (~51 KB) ra `public/`, KHÔNG vào chunk JS. `mau-dongnao.sinh.ts`
// chỉ giữ slug + tên; `src/board/mau-dongnao.ts` fetch khi người dùng mở tab.
//
// Chạy tay: `npm run dung:mau-dongnao`. Kết quả ĐƯỢC COMMIT.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import JSZip from 'jszip'

const GOC = path.resolve(import.meta.dirname, '..')
const REPO = process.env.AFFINE_REPO || path.resolve(GOC, '../AFFiNE')
const THU_MUC_NGUON = path.join(REPO, 'packages/frontend/templates/edgeless-snapshot/Brainstorming')
const THU_MUC_DICH = path.join(GOC, 'public/static/templates/dongnao')
const TEP_SINH = path.join(GOC, 'src/board/mau-dongnao.sinh.ts')
const BANG_DICH = JSON.parse(readFileSync(path.join(import.meta.dirname, 'dich-dongnao.json'), 'utf8'))

// Thứ tự này là thứ tự mẫu trong tab. Tên hiển thị lấy từ `_ten` của bảng dịch.
const MAU = [
  { tep: '5W2H', slug: '5w2h' },
  { tep: 'Concept Map', slug: 'concept-map' },
  { tep: 'Flowchart', slug: 'flowchart' },
  { tep: 'SMART', slug: 'smart' },
  { tep: 'SWOT', slug: 'swot' },
]

if (!existsSync(THU_MUC_NGUON)) {
  throw new Error(
    `Không thấy ${THU_MUC_NGUON}. Trỏ biến môi trường AFFINE_REPO tới bản checkout AFFiNE, ví dụ:\n` +
      `  AFFINE_REPO=C:/Users/<tên>/Downloads/AFFiNE npm run dung:mau-dongnao`,
  )
}

/** Duyệt cây snapshot, thay mọi `insert` bằng bản dịch. Gom chuỗi chưa có trong bảng vào `thieu`. */
function dichCay(nut, thieu) {
  if (Array.isArray(nut)) return nut.forEach((v) => dichCay(v, thieu))
  if (!nut || typeof nut !== 'object') return
  for (const [khoa, giaTri] of Object.entries(nut)) {
    if (khoa === 'insert' && typeof giaTri === 'string') {
      if (giaTri.trim() === '') continue
      const ban = BANG_DICH._chuoi[giaTri]
      if (ban === undefined) thieu.add(giaTri)
      else nut[khoa] = ban
      continue
    }
    // Tài sản nhị phân: assets/ rỗng ở cả 5 tệp nên đường "chép blob ra public/" chưa từng được
    // kiểm. Gặp là dừng, đừng đoán.
    if (khoa === 'sourceId' && typeof giaTri === 'string' && giaTri !== '') {
      throw new Error(`Snapshot tham chiếu tài sản nhị phân (sourceId=${giaTri}) — đường này chưa được cài.`)
    }
    dichCay(giaTri, thieu)
  }
}

mkdirSync(THU_MUC_DICH, { recursive: true })

const thieu = new Set()
const daSinh = []

for (const { tep, slug } of MAU) {
  const duongZip = path.join(THU_MUC_NGUON, `${tep}.zip`)
  const duongBia = path.join(THU_MUC_NGUON, `${tep}.svg`)
  if (!existsSync(duongZip)) throw new Error(`Không thấy ${duongZip}`)
  if (!existsSync(duongBia)) throw new Error(`Không thấy bìa ${duongBia}`)

  const zip = await JSZip.loadAsync(readFileSync(duongZip))
  const ten = Object.keys(zip.files).filter((n) => !n.includes('MACOSX'))
  const nhiPhan = ten.filter((n) => n.includes('assets/') && !zip.files[n].dir)
  if (nhiPhan.length > 0) {
    throw new Error(`${tep}.zip có ${nhiPhan.length} tài sản nhị phân (${nhiPhan.join(', ')}) — đường này chưa được cài.`)
  }
  const tenSnapshot = ten.find((n) => n.endsWith('.snapshot.json'))
  if (!tenSnapshot) throw new Error(`${tep}.zip không có tệp *.snapshot.json`)

  const noiDung = JSON.parse(await zip.files[tenSnapshot].async('text'))
  dichCay(noiDung, thieu)

  const tenHienThi = BANG_DICH._ten[tep]
  if (tenHienThi === undefined) throw new Error(`Bảng dịch thiếu tên mẫu "${tep}" (mục _ten)`)

  const mau = {
    name: tenHienThi,
    type: 'template',
    preview: `/static/templates/dongnao/${slug}.svg`,
    content: noiDung,
  }

  // Rửa `affine-` SAU khi tuần tự hoá, để phủ cả khoá lẫn giá trị trong một lượt.
  const json = JSON.stringify(mau).replace(/\baffine-/g, 'drt-')
  if (/\baffine-/.test(json)) throw new Error(`${tep}: còn chuỗi "affine-" sau khi rửa`)
  writeFileSync(path.join(THU_MUC_DICH, `${slug}.json`), json)

  // Bìa: nén khoảng trắng như thượng nguồn, và `fill="white"` → `currentColor` để bìa theo được
  // theme sáng/tối của panel thay vì trắng cứng.
  const bia = readFileSync(duongBia, 'utf8')
    .replace(/\n/g, '')
    .replace(/\s+/g, ' ')
    .replaceAll('fill="white"', 'fill="currentColor"')
    .replace(/\baffine-/g, 'drt-')
  writeFileSync(path.join(THU_MUC_DICH, `${slug}.svg`), bia)

  daSinh.push({ slug, ten: tenHienThi })
  console.log(`> ${tep} → ${slug}.json (${Math.round(json.length / 1024)} KB) + ${slug}.svg`)
}

if (thieu.size > 0) {
  throw new Error(
    `Bảng dịch scripts/dich-dongnao.json thiếu ${thieu.size} chuỗi. Thêm hết rồi chạy lại — ` +
      `để lọt một chuỗi là một mẫu tiếng Anh lên bề mặt hiển thị:\n` +
      [...thieu].map((s) => `  ${JSON.stringify(s)}`).join('\n'),
  )
}

// Dọn tệp thừa (mẫu bị gỡ ở thượng nguồn). Xoá từng tệp, không rmSync cả thư mục — CodeGraph hay
// giữ handle trên thư mục vừa có tệp mới → EPERM.
const giuLai = new Set(daSinh.flatMap((m) => [`${m.slug}.json`, `${m.slug}.svg`]))
for (const tep of readdirSync(THU_MUC_DICH)) {
  if (!giuLai.has(tep)) {
    try {
      rmSync(path.join(THU_MUC_DICH, tep))
    } catch (e) {
      console.warn(`! không xoá được tệp thừa ${tep}: ${e.code ?? e.message}`)
    }
  }
}

const than =
  '// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-dongnao` để tạo lại.\n' +
  '// Nguồn: AFFiNE packages/frontend/templates/edgeless-snapshot/Brainstorming →\n' +
  '// public/static/templates/dongnao/. Chỉ chứa slug + tên; nội dung mẫu (~204 KB) nằm trong\n' +
  '// public/, src/board/mau-dongnao.ts fetch khi người dùng mở tab (không vào chunk JS — D13).\n' +
  '\n' +
  'export type MauDongNao = { readonly slug: string; readonly ten: string }\n' +
  '\n' +
  "export const DANH_MUC_DONG_NAO = 'Động não'\n" +
  '\n' +
  'export const MAU_DONG_NAO: readonly MauDongNao[] = [\n' +
  daSinh.map((m) => `  { slug: ${JSON.stringify(m.slug)}, ten: ${JSON.stringify(m.ten)} },`).join('\n') +
  '\n]\n'

writeFileSync(TEP_SINH, than)

console.log(`> ghi ${path.relative(GOC, TEP_SINH)} (${daSinh.length} mẫu)`)
console.log('xong.')
