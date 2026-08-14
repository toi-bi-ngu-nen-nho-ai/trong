// Cổng D16 trên BẢN PHÁT HÀNH. Chạy tự động sau `npm run build` (`postbuild`).
//
// Vì sao phải có cổng nhìn vào `dist/`: mọi cổng khác của repo này dừng lại ở `.vendor-build/`.
// Chúng chứng minh cây vendored đã được biên dịch và đổi tên đúng — và không cổng nào nói được gì
// về thứ THẬT SỰ tới tay người dùng. Cả một lớp lỗi nằm trong khoảng trống đó, và nó đã xảy ra
// thật: bản dựng trước lượt sửa này dùng 81 biến `--drt-*` trong `dist/assets/` mà định nghĩa
// **không có biến nào** — toàn bộ thanh công cụ, khung chọn, khung kéo và widget của bảng vẽ render
// với custom property không phân giải được. Không có lỗi nào bị ném, console sạch, tên thẻ đúng,
// hình học đúng: một lượt kiểm bằng mắt trong trình duyệt cũng không bắt được. Chỉ có phép đếm
// "dùng bao nhiêu / định nghĩa bao nhiêu" trên chính bản dựng mới thấy.
//
// Ba luật:
//   A. Không còn `affine-` nào trong bản phát hành (D16 — devtools không được lộ thương hiệu
//      thượng nguồn). Chú ý luật này khớp `affine-` CÓ GẠCH NỐI, đúng như luật của
//      scripts/doi-ten-vendor.mjs: `affine:page` / `affine:surface` là FLAVOUR trong dữ liệu, cố
//      tình không đổi (đổi là không đọc được tài liệu do AFFiNE tạo) và không bị luật này chạm.
//   B. Mọi biến CSS trong không gian tên `--drt-` được DÙNG thì phải được ĐỊNH NGHĨA ở đâu đó
//      trong bản phát hành.
//   C. Mọi bản dịch trong src/board/vi.json phải CÓ MẶT trong bản phát hành. Không đếm tổng: 121
//      chuỗi ứng viên bị tree-shake nên tổng số trồi sụt vô nghĩa. Luật này soi đúng những chuỗi
//      ĐÃ ĐƯỢC CHỌN dịch — nếu một cái biến mất khỏi dist/ thì hoặc bước dịch không chạy, hoặc
//      chuỗi đó không còn trên đường render, và cả hai đều phải biết ngay.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const DIST = path.join(GOC, 'dist')

// Chỉ đọc các đuôi văn bản mà trình duyệt thật sự nạp. Ảnh/icon nhị phân không có gì để đọc.
const DUOI = new Set(['.js', '.css', '.html', '.json', '.txt', '.webmanifest'])

// ─── Vì sao luật B chỉ soi `--drt-` chứ không soi MỌI custom property ─────────────────────────
// Một phép kiểm "dùng mà không định nghĩa" áp cho mọi tên sẽ báo đỏ hàng trăm lần một cách vô
// nghĩa: rất nhiều custom property được ĐẶT LÚC CHẠY bằng `element.style.setProperty('--x', ...)`
// hoặc qua thuộc tính `style=` do JS sinh ra (`--rotate`, `--gap-h`, `--translate-x`, `--i`...) —
// không phép quét tĩnh nào thấy được chỗ đặt của chúng. Đo trên bản dựng hiện tại: 173 tên "dùng
// mà không thấy định nghĩa", trong đó chỉ khoảng nửa là token thiết kế thật.
// `--drt-` thì khác: đó là toàn bộ token thiết kế do bước đổi tên D16 sinh ra, tất cả đều được
// khai TĨNH trong một stylesheet (`.vendor-build/theme/style.css`). Thiếu một cái là thiếu thật.
const KHONG_GIAN_TEN = '--drt-'

// Ngoại lệ có lý do, KHÔNG phải danh sách để nhét thêm cho cổng xanh. Ba tên dưới đây thượng nguồn
// AFFiNE cũng không định nghĩa trong `@toeverything/theme` — chúng được khai trong CSS vỏ app của
// chính AFFiNE, thứ không nằm trong phạm vi vendored. Cả ba chỉ được dùng ở date-picker và
// kanban-card, không nằm trên đường render của bảng vẽ edgeless. Thêm tên vào đây bắt buộc phải
// kèm lý do tương đương; mặc định của một tên `--drt-*` thiếu định nghĩa là SỬA, không phải miễn.
const MIEN = new Set([
  '--drt-icon-hover-color', // affine/components/src/date-picker/style.ts
  '--drt-icon-hover-background', // affine/components/src/date-picker/style.ts
  '--drt-background-kanban-card-color', // affine/data-view/.../kanban/{pc,mobile}/card.ts
])

// Luật C — bản dịch phải tới được tay người dùng.
const BAN_DICH = Object.values(
  JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8')),
)

// Bản đồ dịch rỗng làm luật C xanh với "0/0 có mặt" — đúng con bug mà cả ba lớp cổng trước đều
// dính và đều phải vá. Ở đây nó nguy hiểm hơn hẳn: nơi chặn ca này (`dich-chuoi-vendor.mjs` Cổng 0)
// KHÔNG nằm trên đường `npm run build` — `prebuild` chỉ chạy `kiem-vendor-build` +
// `kiem-vendor-paths`, còn `postinstall` bỏ qua nhanh khi `.vendor-build/` đã hợp lệ. Nghĩa là ở
// mọi lượt build dùng cây vendor có sẵn, luật C là lớp CUỐI CÙNG và DUY NHẤT.
if (BAN_DICH.length === 0) {
  console.error(
    'kiem-dist: DỪNG — src/board/vi.json không có bản dịch nào, nên luật C không có gì để canh và ' +
      'sẽ xanh giả với "0/0 có mặt". Hoặc bảng dịch bị xoá nhầm, hoặc luật C nên được gỡ hẳn.',
  )
  process.exit(1)
}

// Dấu hiệu nhận ra một file thuộc cây bảng vẽ đã vendored: tiền tố `drt-` do bước đổi tên D16 sinh
// ra. Đo trên bản dựng hiện tại: **2.026 lượt** trong chunk bảng vẽ, **0 lượt** trong bundle app và
// mọi file còn lại. Dùng dấu hiệu này thay vì ghim cứng tên chunk, vì tên chunk mang hash và đổi
// mỗi lần chia lại gói.
const DAU_BANG_VE = 'drt-'

function* dietFile(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietFile(f)
    else if (DUOI.has(path.extname(e.name))) yield f
  }
}

if (!existsSync(DIST)) {
  console.error('kiem-dist: không thấy dist/. Chạy `npm run build` trước.')
  process.exit(1)
}

const dung = new Map() // tên → file đầu tiên thấy dùng
const dinhNghia = new Set()
const conAffine = []
const thieuBanDich = new Set(BAN_DICH)
let soFile = 0

for (const f of dietFile(DIST)) {
  soFile++
  const rel = path.relative(GOC, f).split(path.sep).join('/')
  const noiDung = readFileSync(f, 'utf8')

  // Luật A.
  const soAffine = noiDung.match(/affine-/g)?.length ?? 0
  if (soAffine) {
    const viDu = [...new Set([...noiDung.matchAll(/[-\w]*affine-[\w-]*/g)].map((m) => m[0]))]
    conAffine.push({ rel, soAffine, viDu: viDu.slice(0, 8) })
  }

  // Luật C. CHỈ tính khi bản dịch nằm trong một file thuộc cây bảng vẽ. Đếm ở mọi file thì một
  // `dist/` có chunk bảng vẽ HOÀN TOÀN tiếng Anh vẫn xanh, miễn bundle app tình cờ chứa mấy từ đó —
  // mà đây là app y khoa TIẾNG VIỆT với bundle riêng gần 1 MB, và chặng tới thêm 323 chuỗi nên va
  // chạm gần như chắc chắn. Mỗi va chạm là một chuỗi được miễn kiểm vĩnh viễn mà không ai biết.
  if (noiDung.includes(DAU_BANG_VE)) {
    for (const v of thieuBanDich) {
      if (noiDung.includes(v)) thieuBanDich.delete(v)
    }
  }

  // Luật B — phía ĐỊNH NGHĨA: `--x: giá trị`.
  for (const m of noiDung.matchAll(/(--[\w-]+)\s*:/g)) dinhNghia.add(m[1])

  // Luật B — phía DÙNG. Bắt luôn ký tự ngay sau tên để loại hai trường hợp KHÔNG phải lỗi:
  //   - có giá trị dự phòng: `var(--x, 10px)` — biến thiếu thì trình duyệt dùng giá trị sau dấu
  //     phẩy, không có gì hỏng cả.
  //   - tên ghép động: `` `var(--drt-text-highlight-${ten})` `` — tên đọc tĩnh được chỉ là phần
  //     đầu, phần đuôi do JS ghép lúc chạy; các tên ĐẦY ĐỦ có định nghĩa trong theme.
  for (const m of noiDung.matchAll(/var\(\s*(--[\w-]+)\s*([\s\S]?)/g)) {
    const [, ten, sau] = m
    if (sau === ',' || sau === '$' || sau === '`' || sau === '"' || sau === "'" || sau === '+') continue
    if (!dung.has(ten)) dung.set(ten, rel)
  }
}

const dungDrt = [...dung.keys()].filter((t) => t.startsWith(KHONG_GIAN_TEN))
const dinhNghiaDrt = [...dinhNghia].filter((t) => t.startsWith(KHONG_GIAN_TEN))
const thieuDinhNghia = dungDrt.filter((t) => !dinhNghia.has(t) && !MIEN.has(t))

console.log(
  `kiem-dist: đã đọc ${soFile} file trong dist/\n` +
    `  biến ${KHONG_GIAN_TEN}*  — dùng ${dungDrt.length} tên, định nghĩa ${dinhNghiaDrt.length} tên\n` +
    `  biến CSS tất cả  — dùng ${dung.size} tên, định nghĩa ${dinhNghia.size} tên\n` +
    `  bản dịch vi.json — ${BAN_DICH.length - thieuBanDich.size}/${BAN_DICH.length} có mặt`,
)

let loi = 0

if (conAffine.length) {
  loi++
  console.error(
    `\nD16 ĐỎ — còn "affine-" trong bản phát hành (${conAffine.length} file). Bước đổi tên ` +
      '(scripts/doi-ten-vendor.mjs + plugin doiTenAffine trong vite.config.ts) chưa phủ hết nguồn ' +
      'này — phần lớn các ca còn sót đến từ node_modules chứ không từ cây vendored:',
  )
  conAffine.forEach((c) => console.error(`   ${c.rel}: ${c.soAffine} chỗ — ${c.viDu.join(', ')}`))
}

if (thieuDinhNghia.length) {
  loi++
  console.error(
    `\nBIẾN CSS ĐỎ — ${thieuDinhNghia.length} tên ${KHONG_GIAN_TEN}* được dùng nhưng không được ` +
      'định nghĩa ở đâu trong dist/. Trình duyệt không báo lỗi cho chuyện này: nó chỉ vẽ ra một ' +
      'giao diện không màu, không viền, không bóng. Nguyên nhân thường gặp: bản theme đã đổi tên ' +
      '(.vendor-build/theme/style.css) không được import từ src/board/, nên không vào chunk nào cả.',
  )
  thieuDinhNghia
    .sort()
    .slice(0, 30)
    .forEach((t) => console.error(`   ${t}   (dùng ở ${dung.get(t)})`))
  if (thieuDinhNghia.length > 30) {
    console.error(`   ...và ${thieuDinhNghia.length - 30} tên nữa`)
  }
}

if (thieuBanDich.size) {
  loi++
  console.error(
    `\nD12 ĐỎ — ${thieuBanDich.size} bản dịch trong src/board/vi.json KHÔNG có mặt trong dist/. ` +
      'Nghĩa là thanh công cụ bảng vẽ đang nói tiếng Anh ở đúng chỗ đã chọn dịch. Nguyên nhân ' +
      'thường gặp: bước dich-chuoi-vendor không chạy (kiểm dung-vendor.mjs), hoặc thượng nguồn đã ' +
      'chuyển chuỗi sang một vị trí cú pháp ngoài danh sách cho phép:',
  )
  ;[...thieuBanDich].forEach((v) => console.error(`   "${v}"`))
}

if (loi) process.exit(1)
console.log('kiem-dist: xanh — không còn "affine-" và mọi biến --drt-* dùng đều có định nghĩa.')
process.exit(0)
