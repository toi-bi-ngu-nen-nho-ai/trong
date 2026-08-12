// Chạy SAU `dich:vendor`, TRƯỚC `doiten:vendor`. Với mỗi `package.json` trong
// src/vendor/blocksuite/, ghi một package.json RÚT GỌN vào đúng vị trí tương ứng trong
// .vendor-build/ — chỉ ba khoá `name`, `type`, `sideEffects`.
//
// Vì sao cần: `tsc` chỉ emit .js/.d.ts từ các file .ts — nó không tự chép package.json sang
// outDir. Kết quả là .vendor-build/ trước đây không có package.json nào, nên khi Rolldown/Rollup
// (được Vite dùng ở bước `build`) quyết định module nào an toàn để cắt bỏ (tree-shaking), nó tìm
// package.json GẦN NHẤT theo đường dẫn file ĐANG BUNDLE — tức là trong .vendor-build/, không phải
// src/vendor/blocksuite/ — và không thấy gì, nên coi mọi module là CÓ side effect và không cắt gì
// cả. Đã đo: đặt 70 file package.json vào đúng chỗ làm chunk board giảm từ 1.836 kB xuống 993 kB
// gzip (-46%) vì bundler giờ thấy được khai báo `"sideEffects": false` của thượng nguồn.
//
// Vì sao RÚT GỌN chứ không chép nguyên văn (đổi ở lượt sửa review, trước đây chép nguyên văn):
// bản gốc mang một bản đồ `exports` trỏ vào `./src/*.ts`, mà thư mục đích trong .vendor-build/
// chỉ có `.js` và `.d.ts` — tức bản chép NÓI DỐI về chính thư mục nó đang nằm. Hôm nay vô hại
// chỉ vì `blocksuiteVendor()` khai `enforce: 'pre'` và chặn mọi specifier `@blocksuite/*` TRƯỚC
// khi phân giải chạm tới `exports`. Bất cứ đường nào đi vòng qua plugin đó — dep optimizer của
// Vite, một mục `optimizeDeps.include`, thay đổi cách Vitest externalize, hay chính việc gỡ plugin
// khi BlockSuite 0.27 lên npm — sẽ phân giải qua `exports` và chết vì file `.ts` không tồn tại.
// Chính script này từng từ chối một package.json "nói dối tên gói" ở mục 3 bên dưới trong khi vẫn
// phát hành một bản nói dối về `exports`; nay bỏ hẳn cái bẫy đó.
//
// Vì sao bỏ hẳn `exports` chứ không viết lại `.ts` → `.js` (hai phương án đã cân nhắc):
//   - `vite.vendor-plugin.ts` KHÔNG đọc gì từ bản trong .vendor-build/: `quetGoi()` của nó quét
//     `src/vendor/blocksuite` (hằng NGUON) và tự tính đường dẫn đích. `scripts/tao-paths-vendor.mjs`
//     cũng vậy. Nên xoá `exports` khỏi bản đích không thể làm hỏng khâu phân giải.
//   - Viết lại `.ts` → `.js` vẫn còn nói dối một chỗ: 1 trong 438 subpath
//     (`@blocksuite/affine-inline-comment/store` → `./src/store.ts`) trỏ tới file KHÔNG TỒN TẠI
//     ngay cả ở thượng nguồn, nên không có `.js` nào để trỏ tới.
//   - Quan trọng hơn: một `exports` viết lại sẽ MỜI GỌI phân giải đi qua bản chép, tạo con đường
//     thứ hai tới cùng một module song song với plugin — đúng loại "hai đường tới cùng một module"
//     mà vite.config.ts đã cảnh báo ở khối `resolve.alias`. Không có `exports`, một lượt phân giải
//     đi vòng qua plugin sẽ hỏng TO và ngay, thay vì âm thầm nạp bản thứ hai.
// Ba khoá giữ lại, và lý do từng khoá:
//   - `sideEffects`: thứ DUY NHẤT Rollup/Rolldown đọc để tree-shake. Bỏ nó là mất -46% kia.
//   - `type`: quyết định `.js` cạnh nó được hiểu là ESM hay CJS. Toàn bộ 70 gói khai
//     `"type": "module"` và bản emit của tsc là ESM — bỏ khoá này là mời gọi hiểu sai định dạng.
//   - `name`: không công cụ nào đọc, nhưng giữ để người mở file trong .vendor-build/ biết nó là
//     bản dựng của gói nào. Giữ NGUYÊN tên `@blocksuite/affine-*`, không chạy qua bước đổi tên.
//
// Vì sao KHÔNG chạy qua doi-ten-vendor.mjs (dù đứng cạnh bước đó trong pipeline):
//   1. doi-ten-vendor.mjs chỉ quét file .js (xem hàm dietJs) — package.json vốn đã bị bỏ qua,
//      không cần thêm điều kiện loại trừ.
//   2. Nội dung cần đổi trong .js là TÊN THẺ DOM/class CSS (`affine-xxx` → `drt-xxx`) và CHUỖI
//      hiển thị tiếng Anh. package.json không chứa thẻ DOM hay chuỗi hiển thị nào — nó chỉ chứa
//      tên gói npm (`@blocksuite/affine-block-list`) và đường dẫn `exports`. Cả hai thứ này CHÍNH
//      doi-ten-vendor.mjs cũng cố tình KHÔNG đụng tới trong .js (xem hai lượt che "kho"/"khoGoi"
//      ở đó) — vì tên gói/đường dẫn import phải khớp với tên thư mục thật trên đĩa, vốn không đổi.
//      Kiểm chứng: toàn bộ 70 package.json trong src/vendor/blocksuite chỉ có `"sideEffects":
//      false` (boolean), không file nào dùng dạng mảng đường dẫn — nên tuyệt nhiên không có nội
//      dung nào trong các file này cần "dịch" sang tiền tố drt-.
//   3. Nếu lỡ đổi tên gói trong bản đích (vd. "name": "@blocksuite/drt-block-list"), nó vẫn khớp
//      vì Rollup chỉ đọc field "sideEffects", không đọc "name" — nhưng làm vậy tạo ra một
//      package.json nói dối về tên gói của chính nó, gây khó hiểu cho người đọc sau này.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const NGUON = path.join(GOC, 'src/vendor/blocksuite')
const BUILD = path.join(GOC, '.vendor-build')

function* timPackageJson(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* timPackageJson(f)
    else if (e.name === 'package.json') yield f
  }
}

let soChep = 0
const boQua = []

for (const nguon of timPackageJson(NGUON)) {
  const relDir = path.relative(NGUON, path.dirname(nguon))
  const dichDir = path.join(BUILD, relDir)

  // Gói nào không có file .ts nào được tsc emit (vd. bị loại khỏi phần cắt gọn ở bước đổi tên,
  // hoặc thư mục chỉ chứa cấu hình) thì thư mục tương ứng không tồn tại trong .vendor-build/ —
  // bỏ qua, không tự tạo thư mục rỗng chỉ để nhét package.json vào đó (Rollup không bao giờ
  // bundle tới thư mục không có module nào, nên package.json ở đó vô nghĩa).
  if (!existsSync(dichDir)) {
    boQua.push(relDir)
    continue
  }

  // Đọc rồi ghi bản RÚT GỌN (xem đầu file). Đọc bằng JSON.parse để một package.json hỏng cú pháp
  // báo lỗi ngay tại đây kèm đường dẫn, thay vì lặng lẽ đi tiếp.
  const goc = JSON.parse(readFileSync(nguon, 'utf8'))
  const rutGon = { name: goc.name, type: goc.type, sideEffects: goc.sideEffects }
  writeFileSync(path.join(dichDir, 'package.json'), JSON.stringify(rutGon, null, 2) + '\n')
  soChep++
}

console.log(
  `sao-chep-package-json-vendor: đã ghi ${soChep} package.json rút gọn${boQua.length ? ` (bỏ qua ${boQua.length} gói không có build tương ứng)` : ''}`,
)

if (soChep === 0) {
  console.error(
    'sao-chep-package-json-vendor: DỪNG — không ghi được package.json nào. Cây .vendor-build/ ' +
      'có vẻ trống hoặc sai cấu trúc thư mục so với src/vendor/blocksuite/.',
  )
  process.exit(1)
}

// Cổng theo SỐ THIẾU, không phải theo "lớn hơn 0". Một lượt chạy ghi 1/70 file vẫn thoả điều kiện
// `soChep !== 0` ở trên và vẫn in ra dòng thành công, trong khi 69 gói còn lại mất khai báo
// `sideEffects` và chunk bảng phình lên gần gấp đôi mà không ai được báo. Kỳ vọng hiện tại: MỌI
// package.json trong cây vendored đều có thư mục build tương ứng (đo được: 70 ghi / 0 bỏ qua) —
// vì `dung:vendor` xoá sạch rồi biên dịch toàn bộ cây. Nếu một chặng sau cố tình cắt bớt phạm vi
// biên dịch, cổng này sẽ đỏ và bắt người sửa xác nhận con số mới, thay vì để nó trôi đi im lặng.
if (boQua.length) {
  console.error(
    `sao-chep-package-json-vendor: DỪNG — ${boQua.length} gói không có thư mục tương ứng trong ` +
      '.vendor-build/, nên không nhận được khai báo "sideEffects" và sẽ không được tree-shake. ' +
      'Chạy "npm run dung:vendor" để dựng lại toàn bộ cây build; nếu việc bỏ qua là CỐ Ý thì sửa ' +
      'kỳ vọng ngay trong script này kèm lý do. Các gói bị bỏ qua:',
  )
  boQua.slice(0, 10).forEach((d) => console.error('  ', d))
  if (boQua.length > 10) console.error(`   ...và ${boQua.length - 10} gói nữa`)
  process.exit(1)
}
