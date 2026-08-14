// D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json.
//
// Tách khỏi scripts/doi-ten-vendor.mjs vì hai việc khác bản chất: đổi tiền tố `affine-` → `drt-`
// là phép thay ĐỒNG NHẤT, sai ở đâu cũng lộ qua kiem:dist; còn dịch chuỗi là phép thay CÓ ĐIỀU
// KIỆN THEO NGỮ CẢNH, sai thì im lặng.
//
// Luật vị trí nằm ở scripts/luat-vi-tri-dich.mjs (thuần, kiểm được bằng đoạn mã nhỏ). File này
// chỉ lo I/O, báo cáo và ba cổng DỪNG.
//
// Chạy SAU doi-ten-vendor.mjs: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'
import { dichMotFile } from './luat-vi-tri-dich.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(GOC, '.vendor-build')
const BAO_CAO = path.join(BUILD, 'bao-cao-dich.json')

const banDo = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))

// ─── Cổng 0: bản đồ dịch phải phẳng ─────────────────────────────────────────────────────────
// Kiểm MỘT LẦN lúc nạp. `dichMotFile` cũng ném khi gặp giá trị không phải chuỗi, nhưng nó chỉ ném
// khi khoá hỏng THỰC SỰ xuất hiện trong file đang xử lý — nên một mục hỏng sẽ nổ ở giữa lượt duyệt
// 2.550 file, với thông báo trỏ vào một file vendored ngẫu nhiên thay vì nói thẳng "vi.json sai
// định dạng". Cổng ở đây trả lời đúng câu hỏi, đúng lúc.
const saiKieu = Object.entries(banDo).filter(([, vi]) => typeof vi !== 'string')
if (saiKieu.length) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi.json phải phẳng { "English": "Tiếng Việt" }. Các khoá ' +
      'sau có giá trị KHÔNG PHẢI CHUỖI (gom nhóm lồng nhau, mảng phương án dịch để tạm, hay số gõ ' +
      'nhầm đều là JSON hợp lệ nên lọt tới đây được):',
  )
  saiKieu.forEach(([en, vi]) =>
    console.error(`   "${en}" → kiểu ${vi === null ? 'null' : typeof vi}`),
  )
  process.exit(1)
}

// ─── Cổng 1: bản dịch trùng y hệt bản gốc ───────────────────────────────────────────────────
// Dòng thừa, hoặc dấu hiệu chép nhầm cột khi soạn bảng. Bắt ngay, đừng để nó đi tiếp rồi trở
// thành một khoá "đã dịch" mà không dịch gì.
const trung = Object.entries(banDo).filter(([en, vi]) => en === vi)
if (trung.length) {
  console.error(
    'dich-chuoi-vendor: DỪNG — bản dịch trùng y hệt bản gốc ở các khoá sau. Đó là dòng thừa, ' +
      'hoặc dấu hiệu chép nhầm cột khi soạn bảng:',
  )
  trung.forEach(([en]) => console.error(`   "${en}"`))
  process.exit(1)
}

const theoKhoa = Object.fromEntries(Object.keys(banDo).map((k) => [k, []]))
let soFile = 0
let tongLuot = 0

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  const rel = path.relative(BUILD, f).split(path.sep).join('/')

  // ─── Cổng 2: file không phân tích được ───────────────────────────────────────────────────
  // dichMotFile ném lỗi; không bắt để nuốt. Bỏ qua một file là mất bản dịch của cả một widget
  // mà không cổng nào bắt được.
  let ketQua
  try {
    ketQua = dichMotFile(goc, banDo, rel)
  } catch (err) {
    console.error(`dich-chuoi-vendor: DỪNG — ${err.message}`)
    process.exit(1)
  }

  if (ketQua.cacLuot.length === 0) continue

  for (const l of ketQua.cacLuot) {
    theoKhoa[l.chuoiGoc].push({ file: rel, viTri: l.viTri, dong: l.dong, chuoiDich: l.chuoiDich })
    tongLuot++
  }
  writeFileSync(f, ketQua.js)
  soFile++
}

writeFileSync(BAO_CAO, JSON.stringify({ tongLuot, theoKhoa }, null, 2))

// ─── Cổng 3: khoá chết ──────────────────────────────────────────────────────────────────────
// Đây là bộ bắt trôi thượng nguồn CHÍNH XÁC HƠN cổng D12 cũ ở src/__tests__/vendor-doi-ten.spec.ts.
// Cổng cũ hỏi "chuỗi này còn nằm đâu đó trong cây nguồn không"; cổng này hỏi "chuỗi này có thật sự
// được dịch ở một VỊ TRÍ HIỂN THỊ không". Một chuỗi bị thượng nguồn đổi từ `label:` sang `key:`
// vẫn qua được cổng cũ mà chết ở đây — và đó đúng là lúc bản dịch trôi mất mà không ai biết.
const khoaChet = Object.entries(theoKhoa).filter(([, v]) => v.length === 0).map(([k]) => k)
if (khoaChet.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — ${khoaChet.length} khoá trong src/board/vi.json không dịch được ` +
      'chỗ nào. Hoặc thượng nguồn đã đổi chuỗi, hoặc nó đã chuyển sang một vị trí cú pháp KHÔNG ' +
      'nằm trong danh sách cho phép (xem scripts/luat-vi-tri-dich.mjs). Đừng xoá khoá cho xanh — ' +
      'tìm chỗ mới của nó trước:',
  )
  khoaChet.forEach((k) => console.error(`   "${k}"`))
  process.exit(1)
}

console.log(
  `dich-chuoi-vendor: ${soFile} file đã sửa · ${tongLuot} lượt dịch · ` +
    `${Object.keys(banDo).length} khoá đều còn sống · báo cáo: ${path.relative(GOC, BAO_CAO)}`,
)
process.exit(0)
