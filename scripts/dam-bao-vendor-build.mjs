// Bảo đảm .vendor-build/ tồn tại và hợp lệ, chạy tự động ở postinstall.
//
// Vì sao cần: .vendor-build/ bị gitignore, chỉ sinh ra bằng npm run dung:vendor (chuỗi vài phút:
// tsc, chép package.json, đổi tên D16, sinh bản đồ paths — xem scripts/dung-vendor.mjs). Trên
// máy dev cục bộ, ai quên chạy nó sẽ được predev/prebuild/pretest (kiem-vendor-build.mjs) báo lỗi
// và hướng dẫn chạy tay. Nhưng một pipeline CI/deploy không đọc được hướng dẫn đó để tự hành động
// — nó cần .vendor-build/ ĐÃ CÓ SẴN trước khi lệnh build chạy.
//
// Vercel thực tế gọi THẲNG `vite build`, không qua `npm run build`, nên bỏ qua hẳn npm script
// "prebuild" (xác nhận từ log lỗi thật: "Command \"vite build\" exited with 1", không phải
// "npm run build"). postinstall là hook DUY NHẤT chắc chắn chạy sau npm install/npm ci bất kể
// build command sau đó là gì — nên đây là chỗ đúng để tự chữa, không phải prebuild.
//
// Nhanh khi đã có sẵn (đường phổ biến của dev cục bộ): chỉ chạy lại toàn bộ dựng vendor khi cổng
// kiểm hiện tại KHÔNG xanh — tránh buộc mọi `npm install` (kể cả khi chỉ thêm một dependency)
// phải trả giá vài phút biên dịch lại từ đầu.
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')

function chay(lenh, doiSo) {
  return spawnSync(lenh, doiSo, { cwd: GOC, stdio: 'inherit', shell: true })
}

const kiemBuild = chay('node', ['scripts/kiem-vendor-build.mjs'])
const kiemPaths = kiemBuild.status === 0 ? chay('node', ['scripts/kiem-vendor-paths.mjs']) : kiemBuild

if (kiemBuild.status === 0 && kiemPaths.status === 0) {
  console.log('\ndam-bao-vendor-build: .vendor-build/ đã hợp lệ, bỏ qua bước dựng lại.')
  process.exit(0)
}

console.log(
  '\ndam-bao-vendor-build: .vendor-build/ thiếu hoặc chưa hợp lệ — tự chạy "npm run dung:vendor". ' +
    'Cần thiết trên môi trường CI/Vercel vì checkout ở đó luôn sạch và .vendor-build/ bị gitignore. ' +
    'Việc này tốn vài phút.',
)
const ketQua = chay('node', ['scripts/dung-vendor.mjs'])
process.exit(ketQua.status ?? 1)
