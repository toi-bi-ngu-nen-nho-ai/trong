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
// của vài file đại diện — nó không phân biệt được "vừa biên dịch xong ở lượt này" với "còn sót
// từ lượt chạy trước". Nếu không xoá, một lượt biên dịch chết yểu (tsc bị crash, hết bộ nhớ,
// tsconfig.vendor.json hỏng, `npx` không phân giải được...) mà thư mục build cũ vẫn còn nguyên
// sẽ khiến cổng kiểm thấy "đủ file" và báo xanh giả — bước đổi tên sau đó chạy trên bản build CŨ
// và toàn bộ pipeline in ra dòng thành công dù không biên dịch được gì ở lượt này. Đây đúng là
// lúc quan trọng nhất: nâng cấp cây vendor mà compile vỡ nhưng vẫn "thành công" với output cũ.
//
// Đánh đổi: xoá sạch nghĩa là MỌI lượt chạy đều biên dịch lại từ đầu (vài phút), không còn build
// gia tăng dùng cache của tsc giữa các lần chạy liên tiếp. Chấp nhận đánh đổi này vì cổng kiểm
// đúng quan trọng hơn tốc độ ở một script chạy tay, không chạy trong vòng lặp dev.
//
// `maxRetries`/`retryDelay`: đây là Windows, và một dev server LUÔN chạy sẵn (xem AGENTS.md) với
// alias trỏ thẳng vào `.vendor-build/`. Trên Windows một file đang được tiến trình khác mở không
// xoá được (EBUSY/EPERM) — mà `rmSync` xoá theo chiều sâu, nên một lần EBUSY giữa chừng ném lỗi
// và để lại CÂY XOÁ DỞ. Đúng thứ hỏng-im-lặng mà bước xoá này sinh ra để chặn: cổng ở Bước 2 chỉ
// nhìn sự tồn tại của vài file, nên một cây còn sót một nửa vẫn có thể qua cửa. Node sẽ thử lại
// tối đa 3 lần, giãn 200 ms — đủ để dev server nhả handle sau một lượt HMR.
rmSync(path.join(GOC, '.vendor-build'), {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 200,
})

// Bước 1 — biên dịch. KHÔNG kiểm exit code ở đây: `tsc` báo lỗi kiểu từ mã nguồn bên thứ ba
// mà dự án này cố tình không kiểm kiểu, nên exit code luôn khác 0 dù bản build vẫn được sinh ra
// bình thường (noEmitOnError: false). Exit code không phải tín hiệu thành công ở bước này.
chay('npx', ['tsc', '-p', 'tsconfig.vendor.json'], 'dich:vendor')

// Bước 2 — cổng kiểm: bản biên dịch có thật sự sinh ra file không? Dùng LẠI
// scripts/kiem-vendor-build.mjs (cổng vốn đã kiểm sự tồn tại của các file đại diện cho cả hai nửa
// cây: framework/{global,store,sync} và affine/*) thay vì tự bịa một cách kiểm khác — tránh hai
// định nghĩa "biên dịch thành công" lệch nhau trong cùng một repo. Nhờ Bước 0 xoá sạch trước, "tồn tại" ở
// đây chắc chắn nghĩa là "được sinh ra bởi lượt chạy này", không còn là bản sót từ trước. Nếu
// cổng này đỏ (tsc bị crash, hết bộ nhớ, bị kill giữa chừng...) thì dừng pipeline ngay, không
// chạy đổi tên lên một cây rỗng.
// Cờ `--chi-bien-dich`: ở ĐÂY cây build mới chỉ qua bước biên dịch, chưa có package.json rút gọn
// (Bước 3) lẫn theme/style.css đã đổi tên (Bước 4) — nên chỉ được đòi phần sản phẩm của `tsc`.
// Phép kiểm ĐẦY ĐỦ chạy lại ở Bước 6, sau khi cả chuỗi đã xong.
const ketQuaKiem = chay(
  'node',
  ['scripts/kiem-vendor-build.mjs', '--chi-bien-dich'],
  'kiem:vendor-build (chỉ bước biên dịch)',
)
if (ketQuaKiem.status !== 0) {
  console.error(
    '\ndung:vendor: DỪNG — bước biên dịch không sinh ra file nào (xem thông báo cổng kiểm ở ' +
      'trên). Không chạy bước đổi tên lên một cây build rỗng hoặc còn sót từ lần chạy trước.',
  )
  process.exit(ketQuaKiem.status ?? 1)
}

// Bước 3 — chép package.json. `tsc` chỉ emit .js/.d.ts, không chép package.json sang outDir, nên
// .vendor-build/ vốn không có file nào khai `"sideEffects": false` của thượng nguồn — Rollup tìm
// package.json gần nhất theo đường dẫn ĐANG BUNDLE (tức trong .vendor-build/) để quyết định
// tree-shake, không thấy gì thì coi mọi module là có side effect và không cắt gì. Phải đứng SAU
// Bước 2 (đã xác nhận .vendor-build/ có thật) để thư mục đích tồn tại, và TRƯỚC Bước 4 (đổi tên)
// theo đúng thứ tự "dựng xong cây build rồi mới hậu xử lý nó" — dù trên thực tế đổi tên chỉ đụng
// .js nên thứ tự giữa hai bước này không ảnh hưởng kết quả (xem comment trong file script). Đo
// được: chép xong, chunk board giảm từ 1.836 kB xuống 993 kB gzip. Xem chi tiết lý do chép nguyên
// văn — không chạy qua bước đổi tên — trong scripts/sao-chep-package-json-vendor.mjs.
const ketQuaChepPkg = chay('node', ['scripts/sao-chep-package-json-vendor.mjs'], 'sao-chep-package-json-vendor')
if (ketQuaChepPkg.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — chép package.json thất bại (exit code ${ketQuaChepPkg.status}). Thiếu ` +
      'các file này thì bundler không tree-shake được, chunk board sẽ to hơn nhiều so với đo đạc.',
  )
  process.exit(ketQuaChepPkg.status ?? 1)
}

// Bước 4 — đổi tên. Ở bước này exit code CÓ Ý NGHĨA thật: script đổi tên không có lý do sẵn có
// nào để thoát khác 0, nên nếu nó thất bại thì phải báo lỗi to và dừng, không được nuốt.
const ketQuaDoiTen = chay('node', ['scripts/doi-ten-vendor.mjs'], 'doiten:vendor')
if (ketQuaDoiTen.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước đổi tên thất bại (exit code ${ketQuaDoiTen.status}).`,
  )
  process.exit(ketQuaDoiTen.status ?? 1)
}

// Bước 4a — tách định danh tra cứu khỏi description hiển thị trong FileTypes (gỡ nút thắt
// Images/MindMap). Phải chạy TRƯỚC bước dịch chuỗi: Cổng 4 của D12 (bên trong bước đó) đo trên
// cây tại đúng thời điểm nó chạy, và phải thấy filesys.js đã qua bước tách này để không còn đọc
// lại "description" ở hai chỗ đã ghim cũ trong BAN_KHAI_TIEU_THU. Xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md. Exit code ở đây có ý nghĩa
// thật: script này không có lý do sẵn có nào để thoát khác 0, nên thất bại là phải dừng.
const ketQuaTachDinhDanh = chay(
  'node',
  ['scripts/tach-dinh-danh-loai-tep.mjs'],
  'tach-dinh-danh-loai-tep',
)
if (ketQuaTachDinhDanh.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước tách định danh loại tệp thất bại (exit code ${ketQuaTachDinhDanh.status}).`,
  )
  process.exit(ketQuaTachDinhDanh.status ?? 1)
}

// Bước 4b — giới hạn kích thước VÀ vị trí panel "Mẫu" theo viewport (vá lỗi panel tràn/đè lên
// thanh công cụ chính, người dùng báo 2026-09-01), CỘNG thêm thu gọn đệm/cỡ chữ thanh tìm kiếm
// (chủ dự án báo 2026-09-02: thanh tìm kiếm chiếm quá nhiều diện tích so với phần còn lại của
// panel) — xem chú thích đầy đủ ở gioi-han-panel-mau.mjs, gồm cả bài học "lượt vá CSS-only đầu
// tiên không đủ". Vá HAI file (template-panel.js + template-tool-button.js) trong một lượt gọi
// CLI. Không phụ thuộc thứ tự với tách định danh (4a) hay dịch chuỗi (4c) — khác hẳn phạm vi hai
// bước kia — nhưng đứng cạnh chúng cho nhất quán "vá cấu trúc trước khi dịch chuỗi". Exit code ở
// đây có ý nghĩa thật: script này không có lý do sẵn có nào để thoát khác 0, nên thất bại là phải
// dừng.
const ketQuaGioiHanPanel = chay(
  'node',
  ['scripts/gioi-han-panel-mau.mjs'],
  'gioi-han-panel-mau',
)
if (ketQuaGioiHanPanel.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước giới hạn kích thước panel Mẫu thất bại (exit code ${ketQuaGioiHanPanel.status}).`,
  )
  process.exit(ketQuaGioiHanPanel.status ?? 1)
}

// Bước 4b′ — ô "Aa" chỉ liệt kê những họ phông DỰNG ĐƯỢC THẬT. `FontFamilyList` là hằng enum của
// model (BlockSuite "biết" bảy họ), không nói gì về việc trình duyệt có face nào; dự án chỉ tự chứa
// Inter nên sáu họ kia là mục chết — bấm vào còn làm ô kiểu chữ bên cạnh tụt về rỗng. Xem chú thích
// đầy đủ ở loc-ho-phong-co-that.mjs. Cùng bản chất "vá cấu trúc trên cây đã biên dịch" với 4b nên
// đứng ngay sau; không phụ thuộc thứ tự với nó (khác file hẳn).
const ketQuaLocHoPhong = chay('node', ['scripts/loc-ho-phong-co-that.mjs'], 'loc-ho-phong-co-that')
if (ketQuaLocHoPhong.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước lọc họ phông thất bại (exit code ${ketQuaLocHoPhong.status}).`,
  )
  process.exit(ketQuaLocHoPhong.status ?? 1)
}

// Bước 4c — dịch chuỗi hiển thị (D12). Phải chạy SAU đổi tên VÀ SAU tách định danh: bản dịch phải
// đáp lên cây đã đổi tên và đã tách định danh, không ngược lại. Tách khỏi bước đổi tên vì đây là
// phép thay có điều kiện theo ngữ cảnh — xem đầu scripts/dich-chuoi-vendor.mjs. Exit code ở đây
// có ý nghĩa thật: script này không có lý do sẵn có nào để thoát khác 0, nên thất bại là phải
// dừng, không được nuốt.
const ketQuaDich = chay('node', ['scripts/dich-chuoi-vendor.mjs'], 'dichchuoi:vendor')
if (ketQuaDich.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước dịch chuỗi thất bại (exit code ${ketQuaDich.status}).`,
  )
  process.exit(ketQuaDich.status ?? 1)
}

// Bước 5 — sinh bản đồ `paths` cho `tsc`. Phải chạy SAU bước 1 vì nó chỉ ánh xạ những subpath
// thật sự có .d.ts trong .vendor-build/. Exit code ở đây có ý nghĩa thật.
const ketQuaPaths = chay('node', ['scripts/tao-paths-vendor.mjs'], 'tao-paths-vendor')
if (ketQuaPaths.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — không sinh được tsconfig.vendor-paths.json (exit code ${ketQuaPaths.status}).`,
  )
  process.exit(ketQuaPaths.status ?? 1)
}

// Bước 6 — sinh bảng băm của cây vendored (`bang-bam-vendor.json`, có commit). Đây là thứ cho phép
// cổng D11 chạy được trên máy KHÔNG có checkout AFFiNE/blocksuite — tức là trên CI và trên máy của
// mọi người khác. Chạy ở cuối chuỗi vì nó đọc `src/vendor/blocksuite/`, không đọc `.vendor-build/`:
// nó độc lập với mọi bước trên, chỉ cần chạy CÙNG NHỊP với chúng để bảng băm luôn phản ánh đúng cây
// vendored tại thời điểm dựng.
const ketQuaBam = chay('node', ['scripts/tao-bam-vendor.mjs'], 'tao-bam-vendor')
if (ketQuaBam.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — không sinh được bang-bam-vendor.json (exit code ${ketQuaBam.status}).`,
  )
  process.exit(ketQuaBam.status ?? 1)
}

// Bước 7 — chạy LẠI cổng kiểm, lần này ĐẦY ĐỦ (không cờ): đúng phép kiểm mà predev/prebuild/pretest
// sẽ chạy. Chạy ở đây để một chuỗi hỏng bị bắt ngay tại chỗ, thay vì để người dùng phát hiện ở lệnh
// tiếp theo với một thông báo không liên quan tới việc vừa làm.
const ketQuaKiemDay = chay('node', ['scripts/kiem-vendor-build.mjs'], 'kiem:vendor-build (đầy đủ)')
if (ketQuaKiemDay.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — cây build vừa dựng không qua được cổng kiểm đầy đủ (exit code ${ketQuaKiemDay.status}).`,
  )
  process.exit(ketQuaKiemDay.status ?? 1)
}

console.log('\ndung:vendor: xong — đã biên dịch, đổi tên và sinh bản đồ paths theo đúng thứ tự.')
process.exit(0)
