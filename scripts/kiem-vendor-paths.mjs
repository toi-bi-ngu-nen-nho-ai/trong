// Cổng: `tsconfig.vendor-paths.json` đã commit phải còn mô tả ĐÚNG cây `.vendor-build/` hiện tại.
//
// Vì sao cần: file đó nằm trong git (1.321 dòng) nhưng tả một thư mục BỊ GITIGNORE và chỉ được
// dựng lại bằng một pipeline chạy tay vài phút (`npm run dung:vendor`). `tsconfig.json` extends
// nó, nên cả cổng kiểm kiểu của dự án phụ thuộc vào một ảnh chụp có thể đã cũ. Khi nó trôi lệch,
// `tsc` không nói "bản đồ paths cũ rồi" mà đổ hàng loạt TS2307 trỏ vào src/board — báo lỗi ở đúng
// nơi KHÔNG có lỗi. Hai cổng anh em `kiem:vendor` và `kiem:vendor-build` đã canh cây nguồn và cây
// build; file này trước đó không có cổng nào.
//
// Cách kiểm: sinh lại ra một đường dẫn TẠM bằng CHÍNH `scripts/tao-paths-vendor.mjs` (không chép
// lại logic sinh — hai định nghĩa "đúng" trong một repo là mầm của một cổng xanh giả), rồi so
// nguyên văn với bản đã commit. Cùng lối "dùng lại script sẵn có thay vì tự bịa cách kiểm khác"
// mà `dung-vendor.mjs` đã áp dụng khi gọi lại `kiem-vendor-build.mjs`.
//
// So sau khi chuẩn hoá xuống dòng, đúng lý do đã ghi trong `kiem-vendor.mjs`: repo bật
// core.autocrlf nên cây làm việc lưu CRLF, còn script sinh ra LF — so byte thô sẽ đỏ giả trên
// toàn bộ file dù nội dung giống hệt.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const RA = 'tsconfig.vendor-paths.json'
const LENH_LAM_MOI = 'npm run dung:vendor'

const duongDanCommit = path.join(GOC, RA)
if (!existsSync(duongDanCommit)) {
  console.error(
    `kiem-vendor-paths: DỪNG — không thấy ${RA}. tsconfig.json extends file này, thiếu nó thì ` +
      `\`tsc\` chết ngay ở bước đọc cấu hình. Chạy "${LENH_LAM_MOI}".`,
  )
  process.exit(1)
}

const thuMucTam = mkdtempSync(path.join(tmpdir(), 'kiem-vendor-paths-'))
const duongDanTam = path.join(thuMucTam, RA)

try {
  const ketQua = spawnSync('node', ['scripts/tao-paths-vendor.mjs', duongDanTam], {
    cwd: GOC,
    stdio: 'inherit',
    shell: false,
  })

  if (ketQua.status !== 0) {
    console.error(
      `\nkiem-vendor-paths: DỪNG — không sinh lại được bản đồ paths để đối chiếu (exit code ` +
        `${ketQua.status}). Xem thông báo ngay trên: thường là chưa có .vendor-build/ (chạy ` +
        `"${LENH_LAM_MOI}") hoặc bản build dở dang.`,
    )
    process.exit(ketQua.status ?? 1)
  }

  const chuanHoa = (s) => s.replace(/\r\n/g, '\n')
  const banCommit = chuanHoa(readFileSync(duongDanCommit, 'utf8'))
  const banMoi = chuanHoa(readFileSync(duongDanTam, 'utf8'))

  if (banCommit === banMoi) {
    const soMuc = Object.keys(JSON.parse(banCommit).compilerOptions.paths).length
    console.log(`kiem-vendor-paths: khớp — ${soMuc} mục paths, ${RA} đúng với cây .vendor-build/.`)
    process.exit(0)
  }

  // Đỏ: nêu ĐÍCH DANH mục nào lệch, vì diff nguyên văn của một file 1.321 dòng không đọc nổi.
  const mucCommit = JSON.parse(banCommit).compilerOptions.paths
  const mucMoi = JSON.parse(banMoi).compilerOptions.paths
  const thieu = Object.keys(mucCommit).filter((k) => !(k in mucMoi))
  const thua = Object.keys(mucMoi).filter((k) => !(k in mucCommit))
  const khac = Object.keys(mucCommit).filter(
    (k) => k in mucMoi && JSON.stringify(mucCommit[k]) !== JSON.stringify(mucMoi[k]),
  )

  console.error(
    `\nkiem-vendor-paths: DỪNG — ${RA} đã commit KHÔNG còn khớp cây .vendor-build/ hiện tại.\n` +
      `  ${thieu.length} mục có trong bản commit nhưng không sinh lại được\n` +
      `  ${thua.length} mục sinh ra nhưng không có trong bản commit\n` +
      `  ${khac.length} mục cùng khoá nhưng khác đường dẫn` +
      (thieu.length + thua.length + khac.length === 0
        ? '\n  (không mục paths nào lệch — khác nhau nằm ở phần còn lại của file)'
        : ''),
  )
  const in10 = (nhan, ds) => {
    if (!ds.length) return
    console.error(`\n${nhan}:`)
    ds.slice(0, 10).forEach((k) => console.error('  ', k))
    if (ds.length > 10) console.error(`   ...và ${ds.length - 10} mục nữa`)
  }
  in10('Chỉ có trong bản commit', thieu)
  in10('Chỉ có trong bản sinh lại', thua)
  in10('Lệch đường dẫn', khac)
  console.error(
    `\nLàm mới bằng: ${LENH_LAM_MOI}   (dựng lại .vendor-build/ rồi ghi lại ${RA}; vài phút)\n` +
      `Nếu .vendor-build/ đã đúng và chỉ cần ghi lại bản đồ: node scripts/tao-paths-vendor.mjs`,
  )
  process.exit(1)
} finally {
  rmSync(thuMucTam, { recursive: true, force: true })
}
