// Chạy SAU `dich:vendor`. Biến đổi JS đã dịch trong .vendor-build/ tại chỗ:
//   1. D16 — đổi tiền tố `affine-` → `drt-` ở tên thẻ DOM và class, `--affine-` → `--drt-`
//   2. (Bước dịch chuỗi D12 đã tách sang scripts/dich-chuoi-vendor.mjs — chạy ngay sau file này)
// Rồi phát HÀNH ĐỊNH NGHĨA biến CSS: chép `@toeverything/theme/dist/style.css` sang
// `.vendor-build/theme/style.css` qua ĐÚNG hai luật đổi tên ở trên (xem khối cuối file).
//
// Mã nguồn trong src/vendor/ KHÔNG bị đụng — cổng `npm run kiem:vendor` vẫn xanh sau bước này.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'

const BUILD = '.vendor-build'
const TIEN_TO = 'drt'

let soFile = 0
let soDoiTen = 0

for await (const f of dietJs(BUILD)) {
  let js = readFileSync(f, 'utf8')
  const goc = js

  // CẨN TRỌNG: tên GÓI cũng chứa `affine-` — `@blocksuite/affine-block-frame/view`. Đổi tên
  // trong câu import là làm gãy mọi phép phân giải module. Nên che các specifier lại trước,
  // đổi tên, rồi trả về chỗ cũ.
  // Mốc phải là chuỗi không thể trùng với nội dung thật, và KHÔNG dùng ký tự điều khiển —
  // ký tự điều khiển làm mọi công cụ text (grep, git diff) coi file là nhị phân.
  //
  // Nhánh `\bimport\s*` (không ngoặc, không `from`) che import chỉ-để-chạy: thượng nguồn có
  // đúng một chỗ — `affine/blocks/list/src/list-block.ts:1` viết
  // `import '@blocksuite/affine-shared/commands'` — và `list` nằm trong danh sách cắt gọn nên
  // chỗ đó thật sự chạy tới. Thiếu nhánh này thì specifier bị đổi thành
  // `@blocksuite/drt-shared/commands` và Vite không phân giải được.
  // Thứ tự các nhánh có nghĩa: `\bimport\s*\(\s*` phải đứng TRƯỚC `\bimport\s*`.
  const kho = []
  const dungMoc = (i) => `__DRT_SPEC_${i}__`
  js = js.replace(
    /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bexport\s*\*\s*from\s*|\brequire\s*\(\s*)(['"])([^'"]+)\2/g,
    (m) => {
      kho.push(m)
      return dungMoc(kho.length - 1)
    }
  )

  // Che THÊM mọi chỗ nhắc tên GÓI `@blocksuite/affine-...` NẰM NGOÀI câu import — ví dụ
  // trong doc comment. Nhánh che ở trên chỉ bắt specifier đứng ngay sau
  // import/require/from/export-*-from; một cái tên gói bị nhắc ở chỗ khác (JSDoc, thông báo
  // lỗi, chuỗi bất kỳ) vẫn lọt xuống luật `\baffine-` bên dưới và bị đổi thành `drt-`, sinh ra
  // tên gói không tồn tại trên npm (`@blocksuite/drt-block-surface`). Ca thật:
  // `affine/blocks/surface/src/renderer/dom-renderer.ts` dòng 121 và 141 nhắc
  // `@blocksuite/affine-block-surface` trong JSDoc bằng backtick, không phải câu import.
  //
  // Dùng mốc khác tiền tố (PKG, không phải SPEC) và một kho riêng (khoGoi, không phải kho) để
  // hai lượt che không đè lên nhau: lượt này chạy SAU lượt trên nên không thấy được nội dung
  // đã bị che thành __DRT_SPEC_i__ (đúng — specifier trong câu import đã được xử lý rồi), và
  // khi trả về cũng phải trả đúng kho của mình, không lẫn với kho kia.
  const khoGoi = []
  const dungMocGoi = (i) => `__DRT_PKG_${i}__`
  js = js.replace(/@blocksuite\/affine-[\w/-]*/g, (m) => {
    khoGoi.push(m)
    return dungMocGoi(khoGoi.length - 1)
  })

  // Che lượt thứ BA: chú thích `//# sourceMappingURL=...` ở cuối file. `tsc` chạy với
  // `sourceMap: true` (tsconfig.vendor.json) nên mỗi .js được emit kèm một .js.map MANG ĐÚNG TÊN
  // FILE GỐC — và 7 file trong cây có tên bắt đầu bằng `affine-` (vd.
  // `affine/widgets/frame-title/src/affine-frame-title-widget.js`). Không che thì luật `\baffine-`
  // bên dưới đổi chú thích thành `sourceMappingURL=drt-frame-title-widget.js.map`, trỏ tới một file
  // KHÔNG TỒN TẠI: script này chỉ sửa nội dung .js, nó không đổi TÊN file .map trên đĩa. Hậu quả đo
  // được: `npm test` và dev server in ra 7 khối `ENOENT ... drt-*.js.map` mỗi lượt nạp (Vite đọc
  // chú thích rồi mở file theo tên đó).
  // Che thay vì đổi tên file .map, vì tên file .map phải khớp tên file .js — mà tên .js thì KHÔNG
  // đổi (chỉ nội dung đổi), nên giữ nguyên chú thích mới là bản đúng.
  const khoMap = []
  js = js.replace(/sourceMappingURL=\S+/g, (m) => {
    khoMap.push(m)
    return `__DRT_MAP_${khoMap.length - 1}__`
  })

  // 1. Biến CSS: --affine-xxx → --drt-xxx. Làm trước vì nó cũng khớp luật dưới.
  js = js.replace(/--affine-/g, `--${TIEN_TO}-`)
  // 2. Tên thẻ và class: affine-xxx → drt-xxx.
  //    Chỉ khớp khi có gạch nối, nên `affine:page` (flavour trong dữ liệu) KHÔNG bị đụng —
  //    đổi flavour là đổi lược đồ và sẽ không đọc được tài liệu do AFFiNE tạo.
  js = js.replace(/\baffine-/g, `${TIEN_TO}-`)

  // Trả cả ba kho về nguyên trạng. Thứ tự giữa các lượt trả không quan trọng — ba loại mốc
  // (MAP, PKG, SPEC) không lồng vào nhau và nội dung gốc được trả về không chứa mốc của kho kia.
  js = js.replace(/__DRT_MAP_(\d+)__/g, (_m, i) => khoMap[Number(i)])
  js = js.replace(/__DRT_PKG_(\d+)__/g, (_m, i) => khoGoi[Number(i)])
  js = js.replace(/__DRT_SPEC_(\d+)__/g, (_m, i) => kho[Number(i)])

  if (js !== goc) soDoiTen++

  if (js !== goc) {
    writeFileSync(f, js)
    soFile++
  }
}

console.log(`Đã biến đổi ${soFile} file · ${soDoiTen} file đổi tên`)

// ─── ĐỊNH NGHĨA biến CSS ─────────────────────────────────────────────────────────────────────
// Vòng lặp trên đổi tên mọi chỗ DÙNG biến (`var(--affine-x)` → `var(--drt-x)`) trong .js. Nhưng
// chỗ ĐỊNH NGHĨA chúng (`--affine-x: #fff`) không nằm trong cây vendored — nó nằm trong gói npm
// `@toeverything/theme`, file `dist/style.css`, và trước lượt sửa này KHÔNG có gì trong src/
// import nó. Kết quả đo được trên bản dựng trước: 81 biến `--drt-*` được dùng trong dist/assets,
// 0 biến được định nghĩa — toàn bộ thanh công cụ, khung chọn, khung kéo và widget của bảng vẽ
// render với custom property không phân giải được. Không có lỗi nào được ném ra, nên không cổng
// nào (và không lượt kiểm trình duyệt nào nhìn tên thẻ/hình học) bắt được.
//
// Vì sao đổi tên bản định nghĩa thay vì import thẳng gói gốc: D16 nói thương hiệu AFFiNE bị gỡ
// bằng một phép biến đổi lúc build, và custom property NHÌN THẤY ĐƯỢC trong devtools. Import
// nguyên bản `@toeverything/theme/style.css` sẽ nạp 639 tên `--affine-*` vào trang, tức là dán
// lại đúng thứ vừa gỡ — và chúng cũng sẽ không khớp với phía tiêu thụ đã đổi thành `--drt-*`.
//
// Vì sao đặt ở ĐÂY chứ không chép tay một lần: nâng cấp `@toeverything/theme` (hoặc `npm ci` trên
// máy khác) sẽ tự động đi qua bước này. Một bản chép tay trong repo sẽ lặng lẽ cũ đi.
//
// Áp ĐÚNG hai luật của vòng lặp trên, theo đúng thứ tự đó — không có specifier import hay tên gói
// npm nào trong CSS nên không cần lượt che nào (đã kiểm: 1776 chỗ `affine-` trong file, 0 chỗ
// KHÔNG đứng sau `--`). `url(...)` trong file chỉ là data URI, không tham chiếu file bên cạnh,
// nên chép sang thư mục khác không làm gãy đường dẫn tương đối nào.
const NGUON_THEME = 'node_modules/@toeverything/theme/dist/style.css'
const DICH_THEME = path.join(BUILD, 'theme/style.css')

let cssTheme
try {
  cssTheme = readFileSync(NGUON_THEME, 'utf8')
} catch (err) {
  console.error(
    `doi-ten-vendor: DỪNG — không đọc được ${NGUON_THEME} (${err.code ?? err.message}). Gói ` +
      '`@toeverything/theme` là nơi DUY NHẤT định nghĩa các biến `--affine-*` mà cây vendored dùng; ' +
      'thiếu nó thì bảng vẽ dựng ra không có màu, viền hay bóng nào. Chạy `npm ci` rồi thử lại.',
  )
  process.exit(1)
}

cssTheme = cssTheme.replace(/--affine-/g, `--${TIEN_TO}-`).replace(/\baffine-/g, `${TIEN_TO}-`)

// Cổng ngay tại chỗ: nếu còn sót một `affine-` nào thì bản phát hành vẫn mang thương hiệu thượng
// nguồn — báo đỏ ở đây, đừng để nó đi tiếp tới dist/ rồi mới bị cổng kiem-dist bắt.
if (cssTheme.includes('affine-')) {
  console.error('doi-ten-vendor: DỪNG — vẫn còn `affine-` trong bản đổi tên của theme style.css.')
  process.exit(1)
}

const soBien = new Set([...cssTheme.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])).size
mkdirSync(path.dirname(DICH_THEME), { recursive: true })
writeFileSync(DICH_THEME, cssTheme)
console.log(`Đã phát hành ${DICH_THEME} — ${soBien} biến CSS đã đổi sang tiền tố --${TIEN_TO}-`)
