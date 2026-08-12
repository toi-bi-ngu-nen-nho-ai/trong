// Chạy pipeline "dung:vendor" — biên dịch cây vendor rồi đổi tên — theo ĐÚNG THỨ TỰ,
// bất kể shell nào chạy npm script trên máy này (cmd.exe, sh/bash, PowerShell...).
//
// Vì sao không thể diễn đạt bằng toán tử shell trong package.json:
//   - `dich:vendor && doiten:vendor`: SAI. `tsc -p tsconfig.vendor.json` LUÔN thoát khác 0 vì
//     cây vendor có hàng nghìn lỗi kiểu sẵn có từ thượng nguồn mà dự án này cố tình không kiểm
//     kiểu. `noEmitOnError: false` chỉ quyết định có emit hay không, KHÔNG quyết định exit code
//     — nên `&&` coi bước biên dịch là "thất bại" và không bao giờ chạy bước đổi tên. Đã kiểm
//     chứng: chạy chuỗi `&&` xong grep `.vendor-build/` ra 0 kết quả `drt-`.
//   - `dich:vendor & doiten:vendor`: chỉ đúng tình cờ trên cmd.exe (chạy A rồi B tuần tự).
//     `script-shell` của npm đang để trống (`npm config get script-shell` → null) nên shell
//     thật sự dùng tuỳ máy. Trên sh/bash (WSL, CI Linux, hoặc ai đó set script-shell) thì
//     `A & B` đẩy A chạy nền rồi chạy B NGAY LẬP TỨC — bước đổi tên đua với một bản biên dịch
//     vừa mới bắt đầu, và hỏng theo kiểu im lặng: build trông ổn nhưng sai.
//
// Script này thay hai toán tử đó bằng trình tự lệnh gọi tuần tự trong Node — thứ tự không phụ
// thuộc shell nào cả.
import { rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')

function chay(lenh, doiSo, nhan) {
  console.log(`\n> ${nhan}: ${lenh} ${doiSo.join(' ')}`)
  return spawnSync(lenh, doiSo, { cwd: GOC, stdio: 'inherit', shell: true })
}

// Bước 0 — xoá sạch .vendor-build/ trước khi biên dịch. Cổng kiểm ở Bước 2 chỉ nhìn SỰ TỒN TẠI
// của ba file index.js — nó không phân biệt được "vừa biên dịch xong ở lượt này" với "còn sót
// từ lượt chạy trước". Nếu không xoá, một lượt biên dịch chết yểu (tsc bị crash, hết bộ nhớ,
// tsconfig.vendor.json hỏng, `npx` không phân giải được...) mà thư mục build cũ vẫn còn nguyên
// sẽ khiến cổng kiểm thấy "đủ file" và báo xanh giả — bước đổi tên sau đó chạy trên bản build CŨ
// và toàn bộ pipeline in ra dòng thành công dù không biên dịch được gì ở lượt này. Đây đúng là
// lúc quan trọng nhất: nâng cấp cây vendor mà compile vỡ nhưng vẫn "thành công" với output cũ.
//
// Đánh đổi: xoá sạch nghĩa là MỌI lượt chạy đều biên dịch lại từ đầu (vài phút), không còn build
// gia tăng dùng cache của tsc giữa các lần chạy liên tiếp. Chấp nhận đánh đổi này vì cổng kiểm
// đúng quan trọng hơn tốc độ ở một script chạy tay, không chạy trong vòng lặp dev.
rmSync(path.join(GOC, '.vendor-build'), { recursive: true, force: true })

// Bước 1 — biên dịch. KHÔNG kiểm exit code ở đây: `tsc` báo lỗi kiểu từ mã nguồn bên thứ ba
// mà dự án này cố tình không kiểm kiểu, nên exit code luôn khác 0 dù bản build vẫn được sinh ra
// bình thường (noEmitOnError: false). Exit code không phải tín hiệu thành công ở bước này.
chay('npx', ['tsc', '-p', 'tsconfig.vendor.json'], 'dich:vendor')

// Bước 2 — cổng kiểm: bản biên dịch có thật sự sinh ra file không? Dùng LẠI
// scripts/kiem-vendor-build.mjs (cổng vốn đã kiểm sự tồn tại của ba file index.js đại diện cho
// ba gói framework/{global,store,sync}) thay vì tự bịa một cách kiểm khác — tránh hai định nghĩa
// "biên dịch thành công" lệch nhau trong cùng một repo. Nhờ Bước 0 xoá sạch trước, "tồn tại" ở
// đây chắc chắn nghĩa là "được sinh ra bởi lượt chạy này", không còn là bản sót từ trước. Nếu
// cổng này đỏ (tsc bị crash, hết bộ nhớ, bị kill giữa chừng...) thì dừng pipeline ngay, không
// chạy đổi tên lên một cây rỗng.
const ketQuaKiem = chay('node', ['scripts/kiem-vendor-build.mjs'], 'kiem:vendor-build')
if (ketQuaKiem.status !== 0) {
  console.error(
    '\ndung:vendor: DỪNG — bước biên dịch không sinh ra file nào (xem thông báo cổng kiểm ở ' +
      'trên). Không chạy bước đổi tên lên một cây build rỗng hoặc còn sót từ lần chạy trước.',
  )
  process.exit(ketQuaKiem.status ?? 1)
}

// Bước 3 — đổi tên. Ở bước này exit code CÓ Ý NGHĨA thật: script đổi tên không có lý do sẵn có
// nào để thoát khác 0, nên nếu nó thất bại thì phải báo lỗi to và dừng, không được nuốt.
const ketQuaDoiTen = chay('node', ['scripts/doi-ten-vendor.mjs'], 'doiten:vendor')
if (ketQuaDoiTen.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước đổi tên thất bại (exit code ${ketQuaDoiTen.status}).`,
  )
  process.exit(ketQuaDoiTen.status ?? 1)
}

console.log('\ndung:vendor: xong — đã biên dịch và đổi tên theo đúng thứ tự.')
process.exit(0)
