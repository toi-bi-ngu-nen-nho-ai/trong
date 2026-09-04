// Cưỡng chế MỘT công thức duy nhất cho mọi thứ nổi trên đáy màn hình (--nav-h/--above-nav/
// --above-safe, khai ở :root trong src/index.css).
//
// Vì sao đáng có (critique 2026-08-27, P3): phép tính ĐÚNG có hai vế
// (`--nav-body-h + --nav-pad-bottom`), phép tính SAI chỉ có một vế — hai bản khác nhau đúng một từ.
// Trên máy KHÔNG có thanh gạt Home (`--safe-bottom: 0px`) cả hai cho CÙNG MỘT SỐ, nên bản sai chạy
// đúng ở mọi môi trường giả lập và chỉ lộ trên iPhone thật. Đã sinh lỗi thật ít nhất hai lần (menu
// bảng đè vùng thanh gạt, vá 2026-08-26; ba dải nổi ở App.tsx còn thiếu vế thứ hai tới 2026-08-28).
// Không có cổng nào khác trong repo canh chuyện này: tsc sạch, mọi ca kiểm khác xanh.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const GOC = join(__dirname, '../..')
const CSS = join(GOC, 'src/index.css')

// Mọi file có thể đặt vị trí một phần tử nổi trên đáy màn hình.
const FILE_TIEU_THU = ['src/App.tsx', 'src/board/LuoiMuc.tsx', 'src/board/BoardGallery.tsx', 'src/index.css']

// Hai hình dạng của phép tính viết tay — đúng những gì đã sinh lỗi thật.
const MANH_VUN_CAM = ['--nav-body-h) + 18px', '24px + var(--safe-bottom)']

describe('công thức vùng an toàn đáy màn hình', () => {
  it('ba biến khai đúng ở :root trong index.css', () => {
    const css = readFileSync(CSS, 'utf8')
    expect(css).toContain('--nav-h: calc(var(--nav-body-h) + var(--nav-pad-bottom))')
    expect(css).toContain('--above-nav: calc(var(--nav-h) + 18px)')
    expect(css).toContain('--above-safe: calc(24px + var(--safe-bottom))')
  })

  it('không nơi nào viết lại phép tính bằng tay nữa', () => {
    for (const duongDan of FILE_TIEU_THU) {
      const nguon = readFileSync(join(GOC, duongDan), 'utf8')
      for (const dong of nguon.split(/\r?\n/)) {
        // Chú thích được phép nhắc lại công thức để giải thích lý do; chỉ cấm MÃ THẬT.
        const laChuThich = dong.trimStart().startsWith('//') || dong.trimStart().startsWith('*') || dong.includes('/*')
        if (laChuThich) continue
        // Chính dòng khai --above-safe trong :root là nguồn thật, không phải bản sao chép.
        if (dong.includes('--above-safe:')) continue
        for (const manh of MANH_VUN_CAM) {
          expect(dong, `${duongDan}: dùng var(--above-nav)/var(--above-safe) thay cho "${manh}"`).not.toContain(manh)
        }
      }
    }
  })

  it('thanh nav tự phủ nốt vùng thanh gạt Home — --nav-pad-bottom bám --safe-bottom (sàn 5px)', () => {
    const css = readFileSync(CSS, 'utf8')
    // max(5px, …): giữ nguyên quan hệ "phủ đủ vùng thanh gạt" (iPhone: --safe-bottom ~34 thắng),
    // thêm 5px hở tối thiểu cho máy không home-indicator (--safe-bottom=0) — xem chú thích ở token.
    expect(css).toContain('--nav-pad-bottom: max(5px, var(--safe-bottom))')
    expect(css).toContain('--safe-bottom: env(safe-area-inset-bottom, 0px)')
  })
})
