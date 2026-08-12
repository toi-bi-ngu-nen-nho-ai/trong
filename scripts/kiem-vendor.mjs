// Cổng D11: mọi file .ts và .json trong src/vendor/blocksuite phải khớp NGUYÊN VĂN thượng nguồn.
//
// KHÔNG dùng `cmp`: repo này có core.autocrlf=true nên cây làm việc lưu CRLF còn thượng nguồn
// AFFiNE là LF. `cmp` so byte-for-byte nên báo khác trên toàn bộ file dù nội dung giống hệt —
// một cổng đỏ giả, và cổng đỏ vô nghĩa nguy hiểm hơn không có cổng nào.
// So sau khi chuẩn hoá xuống dòng là phép kiểm đúng duy nhất.
import { readFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const VENDOR = 'src/vendor/blocksuite'
// Đường dẫn checkout AFFiNE trên máy cục bộ. Ghi đè bằng biến môi trường BLOCKSUITE_UPSTREAM
// trên máy khác; mặc định giữ nguyên đường dẫn hiện tại để không phá luồng làm việc sẵn có.
const UPSTREAM = process.env.BLOCKSUITE_UPSTREAM ?? 'C:/Users/LENOVO/Downloads/AFFiNE/blocksuite'

if (!existsSync(UPSTREAM)) {
  console.error(
    `Không tìm thấy thư mục thượng nguồn: ${UPSTREAM}\n` +
      'Đặt biến môi trường BLOCKSUITE_UPSTREAM trỏ tới checkout AFFiNE/blocksuite trên máy này.',
  )
  process.exit(1)
}

const chuanHoa = (s) => s.replace(/\r\n/g, '\n')
const dangDoiChieu = (ten) => ten.endsWith('.ts') || ten.endsWith('.json')

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

let tong = 0
let lech = 0
const thua = []

for await (const f of dietFile(VENDOR)) {
  const tuongUng = path.join(UPSTREAM, path.relative(VENDOR, f))
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

const thieu = []
for (const ten of goc) {
  for await (const f of dietFile(path.join(UPSTREAM, ten))) {
    const tuongUng = path.join(VENDOR, path.relative(UPSTREAM, f))
    if (!existsSync(tuongUng)) {
      thieu.push(f)
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

console.log(
  `\nĐã so ${tong} file, lệch ${lech}, không đối chiếu được ${thua.length + thieu.length}`,
)
process.exit(lech === 0 && thua.length === 0 && thieu.length === 0 ? 0 : 1)
