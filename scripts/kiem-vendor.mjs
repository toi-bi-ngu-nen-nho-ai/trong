// Cổng D11: mọi file .ts, .json và LICENSE trong src/vendor/blocksuite phải khớp NGUYÊN VĂN
// thượng nguồn.
//
// Cổng chạy ở MỘT TRONG HAI chế độ:
//   1. Có checkout AFFiNE/blocksuite trên đĩa → so nguyên văn với thượng nguồn (phép kiểm mạnh
//      nhất), VÀ kiểm luôn bảng băm đã commit có còn khớp cây vendored không.
//   2. Không có checkout đó (CI, máy của người khác) → so cây vendored với `bang-bam-vendor.json`
//      đã commit. Trước lượt sửa này cổng chỉ thoát 1 và D11 đơn giản là không kiểm được ở đâu
//      ngoài đúng một máy — nguy hiểm nhất chính là những chỗ đó, vì một lượt định dạng lại hàng
//      loạt (xem `npm run format` đã bị gỡ) sẽ trôi qua không ai biết.
// Xem `scripts/tao-bam-vendor.mjs` để biết bảng băm chứng minh được gì và KHÔNG chứng minh được gì.
//
// LICENSE nằm trong diện đối chiếu (6 file trong cây): giấy phép MIT của BlockSuite và của 5 thư
// viện được nhúng kèm là thứ D11 tồn tại để bảo vệ — để chúng ngoài diện kiểm nghĩa là chính cái
// lý do có luật lại không được luật che.
//
// KHÔNG dùng `cmp`: repo này có core.autocrlf=true nên cây làm việc lưu CRLF còn thượng nguồn
// AFFiNE là LF. `cmp` so byte-for-byte nên báo khác trên toàn bộ file dù nội dung giống hệt —
// một cổng đỏ giả, và cổng đỏ vô nghĩa nguy hiểm hơn không có cổng nào.
// So sau khi chuẩn hoá xuống dòng là phép kiểm đúng duy nhất.
import { readFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { BANG_BAM, VENDOR, dangDoiChieu, docCayVendor } from './tao-bam-vendor.mjs'

// Đường dẫn checkout AFFiNE trên máy cục bộ. Ghi đè bằng biến môi trường BLOCKSUITE_UPSTREAM
// trên máy khác; mặc định giữ nguyên đường dẫn hiện tại để không phá luồng làm việc sẵn có.
const UPSTREAM = process.env.BLOCKSUITE_UPSTREAM ?? 'C:/Users/LENOVO/Downloads/AFFiNE/blocksuite'

const chuanHoa = (s) => s.replace(/\r\n/g, '\n')

async function* dietFile(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* dietFile(f)
    } else if (dangDoiChieu(e.name)) {
      yield f
    }
  }
}

// ─── Chế độ 2: đối chiếu với bảng băm đã commit ───────────────────────────────────────────────
// Trả về số lỗi tìm được (0 = xanh). Dùng ở CẢ HAI chế độ: khi có thượng nguồn, phép này bắt thêm
// tình huống bảng băm commit đã cũ so với cây vendored — nếu không, máy CI sẽ đi kiểm một mốc đã
// mục mà không ai hay.
async function kiemTheoBam() {
  if (!existsSync(BANG_BAM)) {
    console.error(
      `Không thấy ${BANG_BAM}. Sinh lại bằng:\n\n    npm run tao:bam-vendor\n`,
    )
    return 1
  }
  const daLuu = JSON.parse(readFileSync(BANG_BAM, 'utf8')).file
  const hienTai = await docCayVendor()

  const lechBam = Object.keys(hienTai).filter((k) => k in daLuu && daLuu[k] !== hienTai[k])
  const thuaSoVoiBam = Object.keys(hienTai).filter((k) => !(k in daLuu))
  const thieuSoVoiBam = Object.keys(daLuu).filter((k) => !(k in hienTai))

  if (lechBam.length) {
    console.error(`\n${lechBam.length} file lệch so với ${BANG_BAM}:`)
    lechBam.slice(0, 10).forEach((f) => console.error('  ', f))
  }
  if (thuaSoVoiBam.length) {
    console.error(`\n${thuaSoVoiBam.length} file có trên đĩa nhưng không có trong ${BANG_BAM}:`)
    thuaSoVoiBam.slice(0, 10).forEach((f) => console.error('  ', f))
  }
  if (thieuSoVoiBam.length) {
    console.error(`\n${thieuSoVoiBam.length} file có trong ${BANG_BAM} nhưng không có trên đĩa:`)
    thieuSoVoiBam.slice(0, 10).forEach((f) => console.error('  ', f))
  }

  const loi = lechBam.length + thuaSoVoiBam.length + thieuSoVoiBam.length
  console.log(
    `Bảng băm: đã so ${Object.keys(hienTai).length} file với ${BANG_BAM}, ${loi} sai lệch`,
  )
  if (loi) {
    console.error(
      'Nếu thay đổi này là CỐ Ý (nâng cấp cây vendored từ thượng nguồn), chạy ' +
        '`npm run tao:bam-vendor` rồi commit bảng băm mới cùng với thay đổi đó.',
    )
  }
  return loi
}

const loiBam = await kiemTheoBam()

if (!existsSync(UPSTREAM)) {
  console.log(
    `\nKhông thấy checkout thượng nguồn (${UPSTREAM}) — đã kiểm bằng bảng băm đã commit.\n` +
      'Để so NGUYÊN VĂN với thượng nguồn (phép kiểm mạnh hơn), đặt biến môi trường ' +
      'BLOCKSUITE_UPSTREAM trỏ tới checkout AFFiNE/blocksuite trên máy này.',
  )
  process.exit(loiBam === 0 ? 0 : 1)
}

// Một ngoại lệ ánh xạ, và nó có lý do: `src/vendor/blocksuite/LICENSE` KHÔNG đến từ
// `AFFiNE/blocksuite/LICENSE` — thư mục con đó không có file LICENSE nào. Giấy phép của
// BlockSuite nằm ở GỐC repo AFFiNE, một cấp trên. Đã kiểm: nội dung hai bên khớp nguyên văn.
// Không có ánh xạ này thì file LICENSE quan trọng nhất trong cây lại là file duy nhất cổng
// không đối chiếu được — đúng chỗ mà việc đưa LICENSE vào diện kiểm sinh ra để bịt.
const ANH_XA_RIENG = new Map([['LICENSE', path.resolve(UPSTREAM, '..', 'LICENSE')]])

const duongThuongNguon = (f) => {
  const rel = path.relative(VENDOR, f).split(path.sep).join('/')
  return ANH_XA_RIENG.get(rel) ?? path.join(UPSTREAM, rel)
}

let tong = 0
let lech = 0
const thua = []

for await (const f of dietFile(VENDOR)) {
  const tuongUng = duongThuongNguon(f)
  if (!existsSync(tuongUng)) {
    thua.push(f)
    continue
  }
  tong++
  if (chuanHoa(readFileSync(f, 'utf8')) !== chuanHoa(readFileSync(tuongUng, 'utf8'))) {
    lech++
    console.error('LỆCH:', path.relative(VENDOR, f))
  }
}

// Chiều ngược lại: file có ở thượng nguồn nhưng bị thiếu trong cây vendor cục bộ (vd. chép
// lại nửa vời lúc nâng cấp làm rớt file mà không ai để ý). Chỉ đi qua các thư mục gốc thực sự
// đã vendor — lấy trực tiếp từ đĩa, không hardcode hai cái tên — vì thượng nguồn
// AFFiNE/blocksuite còn có docs/, docs-site/, playground/, integration-test/... chưa từng
// được chép vào đây; đi qua cả cây thượng nguồn sẽ báo đỏ giả trên hàng nghìn file không liên quan.
const goc = (await readdir(VENDOR, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

// Thư mục gốc có trong cây vendor nhưng không tồn tại ở thượng nguồn (vd. tên gõ sai, hoặc
// một lần chép nửa vời để lại thư mục mồ côi). readdir trên đường dẫn không tồn tại sẽ ném
// ENOENT/ENOTDIR — bắt riêng hai mã đó để báo bằng thông điệp D11, không để lộ stack trace
// Node trỏ vào đường dẫn AFFiNE cục bộ. Lỗi I/O nào khác vẫn phải ném tiếp, không được nuốt.
const thieu = []
const gocThua = []
for (const ten of goc) {
  try {
    for await (const f of dietFile(path.join(UPSTREAM, ten))) {
      const tuongUng = path.join(VENDOR, path.relative(UPSTREAM, f))
      if (!existsSync(tuongUng)) {
        thieu.push(path.relative(UPSTREAM, f))
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      gocThua.push(ten)
    } else {
      throw err
    }
  }
}

if (thua.length) {
  console.error(`\n${thua.length} file cục bộ không có bản tương ứng ở thượng nguồn:`)
  thua.slice(0, 10).forEach((f) => console.error('  ', f))
}

if (thieu.length) {
  console.error(`\n${thieu.length} file thượng nguồn không có bản tương ứng trong cây vendor:`)
  thieu.slice(0, 10).forEach((f) => console.error('  ', f))
}

if (gocThua.length) {
  console.error(`\n${gocThua.length} thư mục gốc trong cây vendor không tồn tại ở thượng nguồn:`)
  gocThua.forEach((ten) => console.error('  ', ten))
}

console.log(
  `\nĐã so ${tong} file với thượng nguồn, lệch ${lech}, không đối chiếu được ${thua.length + thieu.length}`,
)
process.exit(
  loiBam === 0 &&
    lech === 0 &&
    thua.length === 0 &&
    thieu.length === 0 &&
    gocThua.length === 0
    ? 0
    : 1,
)
