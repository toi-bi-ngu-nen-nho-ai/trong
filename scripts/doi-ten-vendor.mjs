// Chạy SAU `dich:vendor`. Biến đổi JS đã dịch trong .vendor-build/ tại chỗ:
//   1. D16 — đổi tiền tố `affine-` → `drt-` ở tên thẻ DOM và class, `--affine-` → `--drt-`
//   2. D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json
//
// Mã nguồn trong src/vendor/ KHÔNG bị đụng — cổng `npm run kiem:vendor` vẫn xanh sau bước này.
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const BUILD = '.vendor-build'
const TIEN_TO = 'drt'
const banDoDich = JSON.parse(readFileSync('src/board/vi.json', 'utf8'))

async function* dietJs(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietJs(f)
    else if (e.name.endsWith('.js')) yield f
  }
}

// Thoát ký tự đặc biệt của regex trong chuỗi cần dịch.
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let soFile = 0
let soDoiTen = 0
let soDich = 0

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

  // 1. Biến CSS: --affine-xxx → --drt-xxx. Làm trước vì nó cũng khớp luật dưới.
  js = js.replace(/--affine-/g, `--${TIEN_TO}-`)
  // 2. Tên thẻ và class: affine-xxx → drt-xxx.
  //    Chỉ khớp khi có gạch nối, nên `affine:page` (flavour trong dữ liệu) KHÔNG bị đụng —
  //    đổi flavour là đổi lược đồ và sẽ không đọc được tài liệu do AFFiNE tạo.
  js = js.replace(/\baffine-/g, `${TIEN_TO}-`)

  // Trả specifier về nguyên trạng.
  js = js.replace(/__DRT_SPEC_(\d+)__/g, (_m, i) => kho[Number(i)])

  if (js !== goc) soDoiTen++

  // 3. Chuỗi hiển thị. Chỉ thay khi nằm trọn trong một literal, tránh đụng tên biến.
  for (const [en, vi] of Object.entries(banDoDich)) {
    const truoc = js
    js = js.replace(new RegExp(`(['"\`])${thoat(en)}\\1`, 'g'), (_m, q) => `${q}${vi}${q}`)
    if (js !== truoc) soDich++
  }

  if (js !== goc) {
    writeFileSync(f, js)
    soFile++
  }
}

console.log(`Đã biến đổi ${soFile} file · ${soDoiTen} file đổi tên · ${soDich} lượt dịch`)
