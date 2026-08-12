// Chạy SAU `dich:vendor`, TRƯỚC `doiten:vendor`. Chép nguyên văn mọi `package.json` trong
// src/vendor/blocksuite/ sang đúng vị trí tương ứng trong .vendor-build/.
//
// Vì sao cần: `tsc` chỉ emit .js/.d.ts từ các file .ts — nó không tự chép package.json sang
// outDir. Kết quả là .vendor-build/ trước đây không có package.json nào, nên khi Rolldown/Rollup
// (được Vite dùng ở bước `build`) quyết định module nào an toàn để cắt bỏ (tree-shaking), nó tìm
// package.json GẦN NHẤT theo đường dẫn file ĐANG BUNDLE — tức là trong .vendor-build/, không phải
// src/vendor/blocksuite/ — và không thấy gì, nên coi mọi module là CÓ side effect và không cắt gì
// cả. Đã đo: chép 70 file package.json vào đúng chỗ làm chunk board giảm từ 1.836 kB xuống 993 kB
// gzip (-46%) vì bundler giờ thấy được khai báo `"sideEffects": false` của thượng nguồn.
//
// Vì sao chép NGUYÊN VĂN, không sửa: `vite.vendor-plugin.ts` và `scripts/tao-paths-vendor.mjs`
// đọc `exports` của các package.json này TỪ src/vendor/blocksuite/ (không phải từ bản chép) để
// suy ra đường dẫn — chúng đọc tên gói `@blocksuite/affine-xxx` và thư mục gốc chưa đổi tên. Bản
// chép trong .vendor-build/ chỉ cần khớp để Rollup tìm thấy field `sideEffects`; nó không tham
// gia phân giải module (việc đó do vite.vendor-plugin.ts đảm nhiệm bằng đường dẫn tự tính). Nên
// bản chép PHẢI giữ nguyên tên gói và các đường dẫn `exports`/`sideEffects` như bản gốc — không
// được chạy qua bước đổi tên affine→drt.
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
//   3. Nếu lỡ đổi tên gói trong bản chép (vd. "name": "@blocksuite/drt-block-list"), nó vẫn khớp
//      vì Rollup chỉ đọc field "sideEffects", không đọc "name" — nhưng làm vậy tạo ra một
//      package.json nói dối về tên gói của chính nó, gây khó hiểu cho người đọc sau này. Giữ
//      nguyên văn là lựa chọn an toàn và trung thực nhất.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
let soBoQua = 0

for (const nguon of timPackageJson(NGUON)) {
  const relDir = path.relative(NGUON, path.dirname(nguon))
  const dichDir = path.join(BUILD, relDir)

  // Gói nào không có file .ts nào được tsc emit (vd. bị loại khỏi phần cắt gọn ở bước đổi tên,
  // hoặc thư mục chỉ chứa cấu hình) thì thư mục tương ứng không tồn tại trong .vendor-build/ —
  // bỏ qua, không tự tạo thư mục rỗng chỉ để nhét package.json vào đó (Rollup không bao giờ
  // bundle tới thư mục không có module nào, nên package.json ở đó vô nghĩa).
  if (!existsSync(dichDir)) {
    soBoQua++
    continue
  }

  // Chép nguyên văn — đọc rồi ghi (không dùng copyFileSync) để lỗi đọc/ghi báo rõ đường dẫn nào
  // hỏng, và để chắc chắn không có bước biến đổi nào len vào giữa đọc và ghi.
  const noiDung = readFileSync(nguon, 'utf8')
  writeFileSync(path.join(dichDir, 'package.json'), noiDung)
  soChep++
}

console.log(`sao-chep-package-json-vendor: đã chép ${soChep} package.json${soBoQua ? ` (bỏ qua ${soBoQua} gói không có build tương ứng)` : ''}`)

if (soChep === 0) {
  console.error(
    'sao-chep-package-json-vendor: DỪNG — không chép được package.json nào. Cây .vendor-build/ ' +
      'có vẻ trống hoặc sai cấu trúc thư mục so với src/vendor/blocksuite/.',
  )
  process.exit(1)
}
