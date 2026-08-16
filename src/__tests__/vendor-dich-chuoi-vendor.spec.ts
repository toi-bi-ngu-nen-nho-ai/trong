// Cổng mẫu mã của dich-chuoi-vendor.mjs — lưới chắn ba dòng, không phải bộ lọc chính (tập khoá
// vốn được soạn từ danh sách đã duyệt tay, không bốc từ bề mặt thô). Bắt đúng năm chuỗi có thật
// từng lẫn trong bề mặt ứng viên của P1-E: colors$, pen$, penInfo$, penIconMap$,
// var(--drt-text-primary-color).
//
// dich-chuoi-vendor.mjs suy GOC từ `import.meta.dirname` của CHÍNH NÓ (đúng quy ước D11 dùng ở
// mọi script trong scripts/), KHÔNG phải từ cwd của tiến trình con — nên chạy nó với `cwd: GOC`
// trỏ vào thư mục tạm không cách ly được gì: nó vẫn đọc src/board/vi.json và .vendor-build/ của
// REPO THẬT. Phải chép cả thư mục scripts/ vào cây tạm để import.meta.dirname của bản chép tự
// trỏ về đúng GOC tạm.
//
// Thư mục tạm phải nằm TRONG repo (không phải os.tmpdir()): `luat-vi-tri-dich.mjs` import gói
// 'typescript' bằng specifier trần, và Node phân giải nó bằng cách duyệt node_modules/ từ thư mục
// chứa file lên tổ tiên — os.tmpdir() không có tổ tiên nào chứa node_modules nên ném
// ERR_MODULE_NOT_FOUND. Đặt thư mục tạm dưới gốc repo để phép duyệt đó chạm được
// <repo>/node_modules/typescript thật.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const REPO_ROOT = path.resolve(__dirname, '../..')

let GOC: string

beforeEach(() => {
  GOC = mkdtempSync(path.join(REPO_ROOT, '.tmp-test-dich-chuoi-'))
  mkdirSync(path.join(GOC, 'src/board'), { recursive: true })
  mkdirSync(path.join(GOC, '.vendor-build'), { recursive: true })
  writeFileSync(path.join(GOC, '.vendor-build/a.js'), `const a = { label: 'Style' };\n`)
  cpSync(path.resolve(__dirname, '../../scripts'), path.join(GOC, 'scripts'), { recursive: true })
})

afterEach(() => rmSync(GOC, { recursive: true, force: true }))

function chay(banDo: Record<string, string>) {
  writeFileSync(path.join(GOC, 'src/board/vi.json'), JSON.stringify(banDo))
  writeFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), '{}')
  const script = path.join(GOC, 'scripts/dich-chuoi-vendor.mjs')
  try {
    const ra = execFileSync('node', [script], { cwd: GOC, encoding: 'utf8', stdio: 'pipe' })
    return { exitCode: 0, stdout: ra, stderr: '' }
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string }
    return { exitCode: e.status, stdout: e.stdout, stderr: e.stderr }
  }
}

describe('Cổng mẫu mã — khoá dạng _tên, tên$, var(--…)', () => {
  it.each([
    ['_editing', 'bắt đầu bằng _'],
    ['pen$', 'kết thúc bằng $'],
    ['var(--drt-text-primary-color)', 'chứa var(--'],
  ])('DỪNG khi khoá là %s (%s)', (khoa) => {
    const ra = chay({ [khoa]: 'Phong cách' })
    expect(ra.exitCode).not.toBe(0)
    expect(ra.stderr).toContain('mẫu mã')
    expect(ra.stderr).toContain(khoa)
  })

  it('khoá bình thường vẫn qua được cổng này', () => {
    const ra = chay({ Style: 'Phong cách' })
    // Không cần exit 0 tuyệt đối ở đây (còn phụ thuộc các cổng khác chạy sau), chỉ cần thông báo
    // không nhắc tới "mẫu mã" — tức cổng này không chặn nhầm khoá hợp lệ.
    expect(ra.stderr).not.toContain('mẫu mã')
  })
})
