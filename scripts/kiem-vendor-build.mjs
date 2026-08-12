// Cổng nhanh: bắt buộc `.vendor-build/` đã được biên dịch trước khi test/dev/build chạy.
//
// `.vendor-build/` bị gitignore và chỉ được tạo ra bằng cách chạy tay `npm run dich:vendor`
// (biên dịch toàn bộ src/vendor/blocksuite/framework/{global,store,sync} sang JS thuần —
// xem tsconfig.vendor.json). vite.config.ts trỏ thẳng ba alias @blocksuite/{global,store,sync}
// vào .vendor-build/framework/*/src, KHÔNG có phương án dự phòng. Trên một checkout mới toanh,
// mọi import ba specifier đó sẽ phân giải trượt — và lỗi Vite/Rolldown báo ra chỉ nói "không
// phân giải được module", không hề gợi ý bước còn thiếu là gì.
//
// Cổng này không biên dịch lại (việc đó tốn vài phút) — chỉ kiểm SỰ TỒN TẠI của một file cụ
// thể do chính bước biên dịch sinh ra trong mỗi gói, để phân biệt "chưa từng dịch" với "thư
// mục rỗng do lỡ tay tạo". Ba đường dẫn dưới đã được resolve thật bằng node -e trước khi ghi
// vào đây (xem task report), không đoán.
import { existsSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')

const CAN_KIEM = [
  '.vendor-build/framework/global/src/index.js',
  '.vendor-build/framework/store/src/index.js',
  '.vendor-build/framework/sync/src/index.js',
]

const thieu = CAN_KIEM.filter((duong) => !existsSync(path.join(GOC, duong)))

if (thieu.length) {
  console.error(
    'Thiếu cây vendor đã biên dịch (.vendor-build/) — vite.config.ts trỏ alias ' +
      '@blocksuite/{global,store,sync} thẳng vào đó, không có phương án dự phòng.\n' +
      'Chạy lệnh sau rồi thử lại (tốn vài phút):\n\n' +
      '    npm run dich:vendor\n\n' +
      'Các file kỳ vọng nhưng không thấy:',
  )
  thieu.forEach((duong) => console.error('  ', duong))
  process.exit(1)
}

process.exit(0)
