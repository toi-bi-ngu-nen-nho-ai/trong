// Cổng nhanh: bắt buộc `.vendor-build/` đã được DỰNG ĐẦY ĐỦ trước khi test/dev/build chạy.
//
// `.vendor-build/` bị gitignore và chỉ sinh ra bằng cách chạy tay `npm run dung:vendor`. Bước đó
// là một CHUỖI (xem scripts/dung-vendor.mjs), không phải một lệnh biên dịch:
//   1. `tsc -p tsconfig.vendor.json` — biên dịch TOÀN BỘ `src/vendor/blocksuite/**/*.ts`
//      (framework/* lẫn affine/*; xem `include` trong tsconfig.vendor.json) sang JS thuần
//   2. chép package.json rút gọn để bundler đọc được `sideEffects` mà tree-shake
//   3. đổi tên `affine-` → `drt-` / `--affine-` → `--drt-` (D16) và phát hành theme/style.css
//   4. sinh lại `tsconfig.vendor-paths.json`
// `npm run dich:vendor` chỉ là bước 1. Thông báo dưới đây từng bảo người đọc chạy đúng bước đó —
// ai làm theo sẽ có một cây build QUA ĐƯỢC cổng này rồi chạy tiếp với thương hiệu AFFiNE còn
// nguyên, không có `sideEffects` (chunk bảng phình gần gấp đôi) và bản đồ paths cũ. Hỏng im lặng,
// đúng loại mà cổng này tồn tại để chặn.
//
// `vite.vendor-plugin.ts` phân giải MỌI specifier `@blocksuite/*` vào `.vendor-build/`, không có
// phương án dự phòng. Trên một checkout mới toanh, mọi import sẽ trượt — và lỗi Vite/Rolldown báo
// ra chỉ nói "không phân giải được module", không hề gợi ý bước còn thiếu là gì.
//
// Cổng này không dựng lại (việc đó tốn vài phút) — nó kiểm SỰ TỒN TẠI của những sản phẩm đại diện
// cho từng bước ở trên, cộng hai phép khẳng định NỘI DUNG để phân biệt "đã chạy đủ chuỗi" với
// "mới chỉ biên dịch". Không phép kiểm nào ở đây đọc mã nguồn — chỉ đọc sản phẩm.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')

// `--chi-bien-dich`: chỉ kiểm sản phẩm của BƯỚC 1. Cờ này tồn tại cho đúng một chỗ gọi —
// scripts/dung-vendor.mjs dùng chính cổng này làm cửa chặn GIỮA chuỗi, ngay sau `tsc` và trước các
// bước hậu xử lý; ở thời điểm đó package.json và theme/style.css tất nhiên chưa có. Mọi chỗ khác
// (predev/prebuild/pretest, và bước cuối của chính dung:vendor) gọi KHÔNG cờ và nhận phép kiểm đầy đủ.
const chiBienDich = process.argv.includes('--chi-bien-dich')

// Bước 1 phải phủ CẢ HAI nửa của cây: `framework/*` (ba gói nền) lẫn `affine/*` (khối, widget —
// nơi có gần như toàn bộ giao diện bảng vẽ). Trước lượt sửa này danh sách chỉ có ba file
// framework, nên một lượt biên dịch chết giữa chừng sau khi xong framework mà chưa chạm affine/
// vẫn được cổng cho qua.
const SAU_BIEN_DICH = [
  '.vendor-build/framework/global/src/index.js',
  '.vendor-build/framework/store/src/index.js',
  '.vendor-build/framework/sync/src/index.js',
  '.vendor-build/affine/blocks/root/src/edgeless/edgeless-root-block.js',
]

const SAU_HAU_XU_LY = [
  // Bước 2 — package.json rút gọn (thiếu là mất tree-shaking, chunk bảng phình gần gấp đôi).
  '.vendor-build/affine/blocks/root/package.json',
  // Bước 3 — bản theme đã đổi tên; thiếu là bảng vẽ không có biến CSS nào để phân giải.
  '.vendor-build/theme/style.css',
]

const CAN_KIEM = chiBienDich ? SAU_BIEN_DICH : [...SAU_BIEN_DICH, ...SAU_HAU_XU_LY]

const thieu = CAN_KIEM.filter((duong) => !existsSync(path.join(GOC, duong)))

// Hai phép khẳng định NỘI DUNG cho bước 3 (đổi tên). Sự tồn tại của file không nói được bước đổi
// tên đã chạy hay chưa: `tsc` một mình cũng sinh ra đủ các file trên.
//   - `drt-edgeless-root` là tên thẻ gốc của bảng vẽ sau khi đổi; chưa đổi thì nó còn là
//     `affine-edgeless-root`.
//   - `--affine-` là biến CSS chưa đổi. `affine-` TRẦN thì không kiểm được ở đây: tên GÓI
//     (`@blocksuite/affine-block-note`) cố tình KHÔNG đổi và vẫn nằm đầy trong file.
const KHANG_DINH = [
  {
    duong: '.vendor-build/affine/blocks/root/src/edgeless/edgeless-root-block.js',
    phaiCo: 'drt-edgeless-root',
    khongDuocCo: '--affine-',
  },
  {
    duong: '.vendor-build/theme/style.css',
    phaiCo: '--drt-',
    khongDuocCo: '--affine-',
  },
]

const saiNoiDung = []
for (const k of chiBienDich ? [] : KHANG_DINH) {
  const day = path.join(GOC, k.duong)
  if (!existsSync(day)) continue // đã được báo trong `thieu`
  const noiDung = readFileSync(day, 'utf8')
  if (!noiDung.includes(k.phaiCo)) {
    saiNoiDung.push(`${k.duong}: không thấy "${k.phaiCo}"`)
  }
  if (noiDung.includes(k.khongDuocCo)) {
    saiNoiDung.push(`${k.duong}: vẫn còn "${k.khongDuocCo}"`)
  }
}

if (thieu.length || saiNoiDung.length) {
  console.error(
    'Cây vendor đã dựng (.vendor-build/) thiếu hoặc chưa qua đủ các bước hậu xử lý — ' +
      'vite.vendor-plugin.ts phân giải mọi specifier @blocksuite/* thẳng vào đó, không có phương ' +
      'án dự phòng.\n' +
      'Chạy lệnh sau rồi thử lại (tốn vài phút):\n\n' +
      '    npm run dung:vendor\n\n' +
      'CHÚ Ý: `npm run dich:vendor` KHÔNG đủ — nó chỉ biên dịch, không đổi tên (D16), không chép ' +
      'package.json (tree-shaking) và không sinh lại bản đồ paths.',
  )
  if (thieu.length) {
    console.error('\nCác file kỳ vọng nhưng không thấy:')
    thieu.forEach((duong) => console.error('  ', duong))
  }
  if (saiNoiDung.length) {
    console.error('\nCác phép khẳng định nội dung thất bại (bước đổi tên chưa chạy?):')
    saiNoiDung.forEach((d) => console.error('  ', d))
  }
  process.exit(1)
}

process.exit(0)
