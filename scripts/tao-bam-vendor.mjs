// Sinh `bang-bam-vendor.json` — bảng băm SHA-256 của từng file trong `src/vendor/blocksuite/`.
//
// Vì sao cần: cổng D11 (`scripts/kiem-vendor.mjs`) đối chiếu cây vendored với một checkout
// AFFiNE/blocksuite THẬT trên đĩa. Checkout đó chỉ có trên đúng một máy — trên CI, hoặc trên máy
// của bất kỳ ai khác, cổng thoát 1 ngay dòng đầu và D11 (bất biến quan trọng nhất của nhánh này)
// trở thành KHÔNG KIỂM ĐƯỢC. Đúng lúc đó lại là lúc nguy hiểm nhất: một lượt `npm run format`
// chạy nhầm, hay một lần "sửa nhanh" trong cây vendored, sẽ trôi qua không ai biết.
//
// Bảng băm này được COMMIT vào repo, nên trên máy không có thượng nguồn cổng vẫn so được cây
// vendored với một mốc cố định.
//
// Giới hạn phải nói rõ: bảng băm chỉ chứng minh cây vendored KHÔNG ĐỔI kể từ lần chạy
// `npm run dung:vendor` gần nhất — nó KHÔNG chứng minh cây đó khớp thượng nguồn. Ai sửa một file
// vendored rồi chạy lại `dung:vendor` sẽ sinh ra bảng băm mới khớp với bản đã sửa. Thứ chặn việc
// đó là bảng băm được commit: một lượt sửa như vậy hiện thành diff trong `bang-bam-vendor.json`
// ngay giữa pull request, không thể lặng lẽ. Phép so NGUYÊN VĂN với thượng nguồn vẫn là phép kiểm
// mạnh hơn và vẫn chạy nguyên vẹn ở đâu có checkout đó.
//
// Chuẩn hoá xuống dòng trước khi băm, đúng vì lý do đã ghi ở kiem-vendor.mjs: repo bật
// core.autocrlf=true nên cây làm việc lưu CRLF, còn cùng nội dung ấy trên CI Linux là LF. Băm byte
// thô sẽ cho hai kết quả khác nhau cho cùng một nội dung — một cổng đỏ giả, tệ hơn không có cổng.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
export const VENDOR = 'src/vendor/blocksuite'
export const BANG_BAM = 'bang-bam-vendor.json'

// Cùng tập file mà cổng D11 đối chiếu — xem `dangDoiChieu` trong kiem-vendor.mjs. Giữ một định
// nghĩa DUY NHẤT ở đây và để cổng import lại, tránh hai danh sách lệch nhau trong cùng một repo.
export const dangDoiChieu = (ten) =>
  ten.endsWith('.ts') || ten.endsWith('.json') || ten === 'LICENSE'

export async function* dietFileVendor(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* dietFileVendor(f)
    } else if (dangDoiChieu(e.name)) {
      yield f
    }
  }
}

const chuanHoa = (s) => s.replace(/\r\n/g, '\n')

export function bamFile(duong) {
  return createHash('sha256').update(chuanHoa(readFileSync(duong, 'utf8')), 'utf8').digest('hex')
}

// Đọc cây vendored và trả về { 'đường/dẫn/tương/đối': 'băm' }. Khoá dùng dấu `/` bất kể hệ điều
// hành nào sinh ra file — nếu không thì bảng băm sinh trên Windows (`\`) và trên Linux (`/`) khác
// nhau ở MỌI dòng dù nội dung y hệt.
export async function docCayVendor(goc = GOC) {
  const thuMuc = path.join(goc, VENDOR)
  const bang = {}
  for await (const f of dietFileVendor(thuMuc)) {
    bang[path.relative(thuMuc, f).split(path.sep).join('/')] = bamFile(f)
  }
  // Sắp khoá theo thứ tự cố định: readdir không bảo đảm thứ tự giữa các hệ điều hành, và một bảng
  // băm xáo thứ tự sẽ sinh diff khổng lồ vô nghĩa mỗi lần chạy lại.
  return Object.fromEntries(Object.entries(bang).sort(([a], [b]) => (a < b ? -1 : 1)))
}

// Chỉ ghi file khi được gọi trực tiếp (`node scripts/tao-bam-vendor.mjs`), không ghi khi
// kiem-vendor.mjs import các hàm ở trên.
if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  const bang = await docCayVendor()
  const so = Object.keys(bang).length
  if (so === 0) {
    console.error(
      `tao-bam-vendor: DỪNG — không thấy file nào trong ${VENDOR}/. Bảng băm rỗng sẽ làm cổng D11 ` +
        'xanh giả trên mọi máy không có checkout thượng nguồn.',
    )
    process.exit(1)
  }
  writeFileSync(
    path.join(GOC, BANG_BAM),
    JSON.stringify({ thuatToan: 'sha256-lf', soFile: so, file: bang }, null, 2) + '\n',
  )
  console.log(`tao-bam-vendor: đã ghi ${BANG_BAM} — ${so} file`)
}
