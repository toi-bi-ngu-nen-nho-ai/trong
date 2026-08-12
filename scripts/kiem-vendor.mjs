// Cổng D11: mọi file .ts trong src/vendor/blocksuite phải khớp NGUYÊN VĂN thượng nguồn.
//
// KHÔNG dùng `cmp`: repo này có core.autocrlf=true nên cây làm việc lưu CRLF còn thượng nguồn
// AFFiNE là LF. `cmp` so byte-for-byte nên báo khác trên 143/143 file dù nội dung giống hệt —
// một cổng đỏ giả, và cổng đỏ vô nghĩa nguy hiểm hơn không có cổng nào.
// So sau khi chuẩn hoá xuống dòng là phép kiểm đúng duy nhất.
import { readFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const VENDOR = 'src/vendor/blocksuite'
const UPSTREAM = 'C:/Users/LENOVO/Downloads/AFFiNE/blocksuite'

const chuanHoa = (s) => s.replace(/\r\n/g, '\n')

async function* dietFile(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* dietFile(f)
    } else if (e.name.endsWith('.ts')) {
      yield f
    }
  }
}

let tong = 0
let lech = 0
const thieu = []

for await (const f of dietFile(VENDOR)) {
  const tuongUng = path.join(UPSTREAM, path.relative(VENDOR, f))
  if (!existsSync(tuongUng)) {
    thieu.push(f)
    continue
  }
  tong++
  if (chuanHoa(readFileSync(f, 'utf8')) !== chuanHoa(readFileSync(tuongUng, 'utf8'))) {
    lech++
    console.error('LỆCH:', path.relative(VENDOR, f))
  }
}

if (thieu.length) {
  console.error(`\n${thieu.length} file không có bản tương ứng ở thượng nguồn:`)
  thieu.slice(0, 10).forEach((f) => console.error('  ', f))
}

console.log(`\nĐã so ${tong} file, lệch ${lech}, không đối chiếu được ${thieu.length}`)
process.exit(lech === 0 && thieu.length === 0 ? 0 : 1)
