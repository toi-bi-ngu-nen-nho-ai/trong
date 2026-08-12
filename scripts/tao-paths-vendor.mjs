// Sinh `tsconfig.vendor-paths.json` — bản đồ `paths` để `tsc --noEmit` phân giải được
// `@blocksuite/*`.
//
// Vì sao cần: plugin `blocksuiteVendor()` chỉ dạy VITE cách tìm cây vendored. `tsc` không chạy
// plugin Vite, nên nếu không có bản đồ này thì mọi import `@blocksuite/*` trong src/board là
// TS2307 "Cannot find module".
//
// Vì sao trỏ vào `.d.ts` trong `.vendor-build/` chứ không trỏ thẳng vào `.ts` nguồn: trỏ vào
// nguồn sẽ kéo 2.500 file của AFFiNE vào chương trình của `tsc` và bị kiểm kiểu bằng cấu hình
// NGHIÊM của dự án (strict, noImplicitAny, lib ES2022) thay vì cấu hình lỏng của thượng nguồn
// (lib ES2024) — đo được 83 lỗi, không lỗi nào thuộc mã của dự án. Không được nới cấu hình của
// dự án chỉ để chiều mã bên thứ ba, và cũng cấm sửa mã đó (D11). `skipLibCheck: true` bỏ qua
// việc kiểm kiểu BÊN TRONG `.d.ts`, nên đi qua khai báo là giữ nguyên kiểu thật cho mã của ta
// (đã kiểm: `taoBangTrong()` ra `Store`, không phải `any`) mà không rước 83 lỗi kia.
//
// Vì sao sinh tự động chứ không chép tay: 437 mục, thay đổi mỗi lần nâng cấp cây vendored. Chép
// tay là bảo đảm sẽ lệch.
//
// File sinh ra ĐƯỢC commit (khác `.vendor-build/`): `tsconfig.json` extends nó, thiếu file thì
// `tsc` chết ngay ở bước đọc cấu hình.
import fs from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const NGUON = 'src/vendor/blocksuite'
const BUILD = '.vendor-build'
const RA = 'tsconfig.vendor-paths.json'

// Quét mọi package.json trong cây vendored, lấy tên gói và bản đồ `exports` của nó. Cùng cách
// đọc như `vite.vendor-plugin.ts` — hai nơi phải nhìn cây vendored giống hệt nhau.
function quetGoi() {
  const goi = []
  const di = (dir, sau) => {
    if (sau > 5) return
    let mucs
    try {
      mucs = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of mucs) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const f = path.join(dir, e.name)
      if (e.isDirectory()) di(f, sau + 1)
      else if (e.name === 'package.json') {
        try {
          const j = JSON.parse(fs.readFileSync(f, 'utf8'))
          if (j.name?.startsWith('@blocksuite/')) goi.push({ ten: j.name, thuMuc: dir, exports: j.exports })
        } catch {
          /* package.json hỏng thì bỏ qua */
        }
      }
    }
  }
  di(path.join(GOC, NGUON), 0)
  return goi
}

const paths = {
  // `@/*` phải nằm ở đây chứ không nằm trong tsconfig.json: `extends` GHI ĐÈ trọn khoá `paths`
  // chứ không trộn, nên tsconfig.json khai `paths` là xoá sạch bản đồ dưới đây.
  '@/*': ['./src/*'],
}
let thieu = 0

for (const { ten, thuMuc, exports } of quetGoi()) {
  if (!exports) continue
  for (const [sub, dich] of Object.entries(exports)) {
    // Chỉ nhận subpath trỏ thẳng tới một file .ts. Không gói vendored nào dùng dạng điều kiện
    // ({ import, require }) hay ký tự đại diện; nếu thượng nguồn đổi sang dạng đó thì con số
    // in ra ở cuối sẽ tụt và phải xem lại chỗ này.
    if (typeof dich !== 'string') continue

    const spec = sub === '.' ? ten : `${ten}/${sub.slice(2)}`
    const tuongDoiNguon = path.relative(path.join(GOC, NGUON), path.join(thuMuc, dich))
    const khaiBao = path.join(BUILD, tuongDoiNguon).replace(/\.ts$/, '.d.ts')

    if (!fs.existsSync(path.join(GOC, khaiBao))) {
      thieu++
      continue
    }
    paths[spec] = ['./' + khaiBao.split(path.sep).join('/')]
  }
}

const soGoi = Object.keys(paths).length - 1
if (soGoi === 0) {
  console.error(
    `tao-paths-vendor: DỪNG — không ánh xạ được subpath nào. Có chạy "npm run dung:vendor" ` +
      `(bước biên dịch sinh .d.ts vào ${BUILD}/) chưa?`
  )
  process.exit(1)
}

const noiDung = {
  // Chú thích cho người đọc file sinh ra, vì nó nằm trong git.
  __sinh_tu: 'scripts/tao-paths-vendor.mjs — chạy lại bằng "npm run dung:vendor". Đừng sửa tay.',
  compilerOptions: { paths },
}
fs.writeFileSync(path.join(GOC, RA), JSON.stringify(noiDung, null, 2) + '\n')
console.log(`tao-paths-vendor: ${soGoi} subpath → ${RA}${thieu ? ` (${thieu} subpath không có .d.ts)` : ''}`)
