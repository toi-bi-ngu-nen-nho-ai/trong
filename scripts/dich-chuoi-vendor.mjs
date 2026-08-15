// D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json.
//
// Tách khỏi scripts/doi-ten-vendor.mjs vì hai việc khác bản chất: đổi tiền tố `affine-` → `drt-`
// là phép thay ĐỒNG NHẤT, sai ở đâu cũng lộ qua kiem:dist; còn dịch chuỗi là phép thay CÓ ĐIỀU
// KIỆN THEO NGỮ CẢNH, sai thì im lặng.
//
// Luật vị trí nằm ở scripts/luat-vi-tri-dich.mjs (thuần, kiểm được bằng đoạn mã nhỏ). File này
// chỉ lo I/O, báo cáo và bốn cổng DỪNG.
//
// Chạy SAU doi-ten-vendor.mjs: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'
import { dichMotFile } from './luat-vi-tri-dich.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(GOC, '.vendor-build')
const BAO_CAO = path.join(BUILD, 'bao-cao-dich.json')

// ─── Cổng sớm: cây này đã dịch chưa? ─────────────────────────────────────────────────────────
// Đặt TRƯỚC MỌI cổng khác, kể cả Cổng 0. Sự có mặt của `bao-cao-dich.json` là bằng chứng đủ rằng
// bước dịch đã chạy trên chính cây `.vendor-build/` hiện tại — script này chỉ ghi file đó SAU khi
// qua Cổng 3 (xem cuối file), và Bước 0 của dung-vendor.mjs xoá sạch `.vendor-build/` trước mỗi
// lượt nên không có chuyện file sót lại từ một cây cũ.
//
// Không có cổng này, chạy lại `npm run dichchuoi:vendor` lần hai trên cây ĐÃ dịch sẽ khiến MỌI
// khoá thành khoá chết (bản dịch tiếng Việt đã thay chỗ tiếng Anh, không còn gì để khớp) và Cổng 3
// in "thượng nguồn đã đổi chuỗi… Đừng xoá khoá cho xanh" — sai nguyên nhân hoàn toàn. Đây đúng
// loại cổng đỏ vô nghĩa mà bài học #2 của dự án cảnh báo: nó đẩy người sửa `vi.json` (thao tác
// chính khi mở rộng bản dịch) đi tìm "khoá chết" không có thật. Nguyên nhân thật là "cây này đã
// dịch rồi" — và cách dịch lại đúng là dựng lại từ đầu bằng `npm run dung:vendor`.
if (existsSync(BAO_CAO)) {
  console.error(
    'dich-chuoi-vendor: DỪNG — .vendor-build/bao-cao-dich.json đã tồn tại, tức cây build này ĐÃ ' +
      'được dịch ở một lượt trước. Chạy lại script này trên một cây đã dịch sẽ khiến MỌI khoá ' +
      'trong vi.json thành "khoá chết" (bản dịch đã thay chỗ tiếng Anh, không còn gì để khớp) — ' +
      'đó không phải dấu hiệu thượng nguồn đổi chuỗi, đừng đi sửa vi.json theo hướng đó.\n' +
      'Muốn dịch lại (sau khi sửa vi.json hay cây vendored): chạy `npm run dung:vendor` — nó xoá ' +
      'sạch .vendor-build/ rồi dựng lại từ đầu.',
  )
  process.exit(1)
}

const banDo = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))

// ─── Cổng 0: bản đồ dịch phải dùng được ──────────────────────────────────────────────────────
// Kiểm MỘT LẦN lúc nạp. `dichMotFile` cũng ném khi gặp giá trị không phải chuỗi, nhưng nó chỉ ném
// khi khoá hỏng THỰC SỰ xuất hiện trong file đang xử lý — nên một mục hỏng sẽ nổ ở giữa lượt duyệt
// 2.550 file, với thông báo trỏ vào một file vendored ngẫu nhiên thay vì nói thẳng "vi.json sai
// định dạng". Cổng ở đây trả lời đúng câu hỏi, đúng lúc.
if (banDo === null || typeof banDo !== 'object' || Array.isArray(banDo)) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi.json phải là một object phẳng ' +
      '{ "English": "Tiếng Việt" }. Không có nó thì mọi cổng phía sau đều không có gì để canh.',
  )
  process.exit(1)
}

// Bản đồ RỖNG là ca nguy hiểm nhất, và là ca duy nhất mà Cổng 3 hoàn toàn mù: cổng khoá chết lặp
// trên chính bản đồ, nên không có khoá nào thì không có khoá nào chết — nó in "0 khoá đều còn
// sống" rồi thoát 0. Toàn bộ bản dịch tiếng Việt bốc hơi mà pipeline vẫn xanh. Phải chặn ở đây,
// không cổng nào khác chặn được.
if (Object.keys(banDo).length === 0) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi.json rỗng. Nếu đúng là chưa muốn dịch gì thì gỡ hẳn ' +
      'bước này khỏi scripts/dung-vendor.mjs, đừng để một bản đồ rỗng chạy qua: cổng khoá chết ' +
      'lặp trên chính bản đồ nên nó KHÔNG phát hiện được ca này, và build sẽ xanh với bản dịch ' +
      'biến mất hoàn toàn.',
  )
  process.exit(1)
}

// Cột KHOÁ cũng phải kiểm, không chỉ cột giá trị — và đây là nửa NGUY HIỂM HƠN. Một khoá rỗng (ô
// TRÁI để trống khi dán bảng) không phải khoá chết vô hại: `Object.hasOwn(banDo, '')` khớp MỌI
// literal rỗng ở vị trí hiển thị, mà cây vendored có sẵn hàng chục chỗ như thế — `name: ''` và
// `caption: ''` là GIÁ TRỊ MẶC ĐỊNH của model tài liệu (attachment-model.js, image-model.js,
// code-model.js), `title: ''` ở surface-ref-model.js. Ghi đè chúng là hỏng DỮ LIỆU, không chỉ hỏng
// nhãn. Ba cổng còn lại đều mù trước ca này: Cổng 0 thấy giá trị là chuỗi không rỗng, Cổng 1 thấy
// `"" !== "Trống"`, Cổng 3 thấy khoá `""` SỐNG (nó khớp được, nên không phải khoá chết).
//
// Khoá thừa khoảng trắng (`"Style "`) thì an toàn — nó thành khoá chết và Cổng 3 bắt.
const saiKhoa = Object.keys(banDo).filter((en) => en.trim() === '')
if (saiKhoa.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — src/board/vi.json có ${saiKhoa.length} khoá rỗng hoặc chỉ gồm ` +
      'khoảng trắng. Khoá rỗng KHỚP MỌI chuỗi rỗng trong cây vendored, kể cả giá trị mặc định của ' +
      "model tài liệu (`name: ''`, `caption: ''`, `title: ''`) — nó ghi đè dữ liệu chứ không chỉ " +
      'ghi đè nhãn. Xoá dòng đó khỏi bảng dịch.',
  )
  process.exit(1)
}

// Chuỗi RỖNG cũng phải chặn: nó qua được phép kiểm kiểu (`typeof "" === 'string'`) lẫn Cổng 1
// (`"Style" !== ""`), rồi `JSON.stringify("")` chèn `""` vào mã vendored — nhãn trên giao diện bị
// xoá trắng, build xanh. Một ô để trống khi dán bảng dịch là chuyện thường gặp y như gõ nhầm số.
const saiKieu = Object.entries(banDo).filter(([, vi]) => typeof vi !== 'string' || vi.trim() === '')
if (saiKieu.length) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi.json phải phẳng { "English": "Tiếng Việt" }, và mọi ' +
      'bản dịch phải là chuỗi KHÔNG RỖNG. Gom nhóm lồng nhau, mảng phương án dịch để tạm, số gõ ' +
      'nhầm hay một ô để trống đều là JSON hợp lệ nên lọt tới đây được:',
  )
  saiKieu.forEach(([en, vi]) =>
    console.error(
      `   "${en}" → ${typeof vi !== 'string' ? `kiểu ${vi === null ? 'null' : typeof vi}` : 'chuỗi rỗng'}`,
    ),
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

// Ghi báo cáo SAU Cổng 3, không phải trước: nếu ghi trước, một lượt bị Cổng 3 từ chối (khoá chết)
// vẫn để lại `bao-cao-dich.json` trên đĩa dù việc dịch coi như thất bại. Từ khi cổng ở đầu file
// này (xem "Cổng sớm" phía trên) và cổng ở scripts/kiem-vendor-build.mjs đều coi sự có mặt của
// file này là bằng chứng "đã dịch xong hợp lệ", ghi trước cổng khoá chết là một lời khẳng định
// sai sự thật trên đĩa — không chỉ thừa, mà THẬT SỰ SAI.
writeFileSync(BAO_CAO, JSON.stringify({ tongLuot, theoKhoa }, null, 2))

console.log(
  `dich-chuoi-vendor: ${soFile} file đã sửa · ${tongLuot} lượt dịch · ` +
    `${Object.keys(banDo).length} khoá đều còn sống · báo cáo: ${path.relative(GOC, BAO_CAO)}`,
)
process.exit(0)
