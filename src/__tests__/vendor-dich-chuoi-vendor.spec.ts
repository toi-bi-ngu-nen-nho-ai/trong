// Cổng mẫu mã của dich-chuoi-vendor.mjs — lưới chắn ba dòng, không phải bộ lọc chính (tập khoá
// vốn được soạn từ danh sách đã duyệt tay, không bốc từ bề mặt thô). Bắt đúng năm chuỗi có thật
// từng lẫn trong bề mặt ứng viên của P1-E: colors$, pen$, penInfo$, penIconMap$,
// var(--drt-text-primary-color).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let GOC: string

beforeEach(() => {
  GOC = mkdtempSync(path.join(tmpdir(), 'dich-chuoi-'))
  mkdirSync(path.join(GOC, 'src/board'), { recursive: true })
  mkdirSync(path.join(GOC, '.vendor-build'), { recursive: true })
  writeFileSync(path.join(GOC, '.vendor-build/a.js'), `const a = { label: 'Style' };\n`)
})

afterEach(() => rmSync(GOC, { recursive: true, force: true }))

function chay(banDo: Record<string, string>) {
  writeFileSync(path.join(GOC, 'src/board/vi.json'), JSON.stringify(banDo))
  writeFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), '{}')
  const script = path.resolve(__dirname, '../../scripts/dich-chuoi-vendor.mjs')
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
