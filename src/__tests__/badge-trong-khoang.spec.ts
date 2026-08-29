// Badge "✓ Trong khoảng" của InfusionCalculator — khoản P2 của critique DungThuocScreen 2026-08-15
// (tag `luu/critique-dungthuocscreen-2026-08-15`, task 3) chưa bao giờ gộp vào `main`, xem HANDOFF
// mục 41.
//
// Kiểm trên VĂN BẢN của index.css, không qua trình duyệt — cùng lý do đã ghi ở
// `src/board/__tests__/token-mau-bo-mat-mindmap.spec.ts`: happy-dom không dựng cascade thật và
// `getComputedStyle` ở đó không phân giải `var()`. Cái canh được ở đây là thứ hồi quy ÂM THẦM: một
// lượt dọn CSS gỡ mất khai báo, hoặc thêm hoạt ảnh mới mà quên khối `prefers-reduced-motion`.
// Riêng MÀU thì đo trên trình duyệt thật (xem HANDOFF mục 41) — con số tương phản chỉ có nghĩa kèm
// theo nền nó được đo trên.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
).replace(/\r\n/g, '\n')

function thanQuyTac(boChon: string): string {
  const i = CSS.indexOf(boChon + ' {')
  if (i < 0) throw new Error(`không thấy quy tắc "${boChon}" trong index.css`)
  const mo = CSS.indexOf('{', i)
  const dong = CSS.indexOf('}', mo)
  return CSS.slice(mo + 1, dong)
}

describe('.badge-pop-in — nhịp xác nhận của badge "Trong khoảng"', () => {
  it('chạy MỘT nhịp rồi đứng yên, không lặp và không tự ẩn', () => {
    const than = thanQuyTac('.badge-pop-in')
    // Không `infinite`: badge ở lại trên màn chừng nào liều còn "ok", một hoạt ảnh lặp mãi ở cạnh
    // con số liều là nhiễu thị giác thường trực đúng chỗ cần đọc kỹ nhất.
    expect(than).not.toContain('infinite')
    // Thời lượng nằm trong khoảng 200-300ms của hệ chuyển động (DESIGN.md) — đủ thấy, không chờ.
    const giay = /animation:[^;]*?(\d*\.?\d+)s/.exec(than)?.[1]
    expect(Number(giay)).toBeGreaterThanOrEqual(0.2)
    expect(Number(giay)).toBeLessThanOrEqual(0.3)
    // Khung hình cuối phải đứng ở scale 1 và opacity 1 — `both` giữ nguyên khung cuối sau khi chạy
    // xong, thiếu nó badge sẽ nhảy về trạng thái trước hoạt ảnh.
    expect(than).toContain('both')
    const keyframes = /@keyframes badgePopIn\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? ''
    expect(keyframes).toMatch(/100%\s*\{[^}]*opacity:\s*1[^}]*transform:\s*scale\(1\)/)
  })

  it('bị vô hiệu trong prefers-reduced-motion cùng các hoạt ảnh còn lại', () => {
    // Đây là chỗ dễ quên nhất khi thêm một hoạt ảnh mới: khai `.badge-pop-in` xong mà không nối vào
    // khối reduced-motion thì người bật "giảm chuyển động" của hệ điều hành vẫn thấy nó nảy.
    // index.css có NHIỀU khối reduced-motion (mỗi cụm hoạt ảnh một khối). Khối đúng cho badge này
    // là khối liệt kê nhóm hoạt ảnh cùng loại `.pop-value / .flash-ok / .rise-in` — bám vào
    // `.pop-value` chứ không lấy khối đầu tiên gặp được, kẻo phép kiểm trỏ nhầm chỗ.
    const i = CSS.indexOf('.pop-value,', CSS.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(i).toBeGreaterThan(-1)
    const khoi = CSS.slice(i, CSS.indexOf('{', i))
    expect(khoi).toContain('.badge-pop-in')
  })
})
