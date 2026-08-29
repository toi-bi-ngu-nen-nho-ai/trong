// Hai phát hiện THUẦN CSS của critique 2026-08-29
// (.impeccable/critique/2026-08-29T00-38-34Z__src-board-boardgallery-tsx.md).
//
// Kiểm trên VĂN BẢN của index.css, không qua trình duyệt: happy-dom không dựng cascade thật (và
// `getComputedStyle` ở đó không phân giải `var()` xuyên lớp), còn Browser pane thì không chạy được
// trong cổng `npm test`. Cách này canh đúng thứ có thể hồi quy âm thầm — một lượt refactor CSS gỡ
// mất khai báo — và ghi lại LÝ DO của từng con số ngay cạnh phép kiểm.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../index.css'),
  'utf8',
).replace(/\r\n/g, '\n')

/** Thân của quy tắc CSS đầu tiên khớp `boChon` (khớp nguyên văn chuỗi chọn). */
function thanQuyTac(boChon: string): string {
  const i = CSS.indexOf(boChon + ' {')
  if (i < 0) throw new Error(`không thấy quy tắc "${boChon}" trong index.css`)
  const mo = CSS.indexOf('{', i)
  const dong = CSS.indexOf('}', mo)
  return CSS.slice(mo + 1, dong)
}

describe('màu chữ mờ ô tìm kiếm (P2 critique 2026-08-29)', () => {
  // Đo được trên trang thật trước khi vá: bản tối 4,30:1, bản sáng ≈3,31:1 — dưới sàn AA 4,5:1 cho
  // chữ thường 16px. Nguyên nhân: app CHƯA BAO GIỜ tô placeholder này, nên nó rơi về mặc định
  // preflight của Tailwind v4 (`color-mix(in oklab, currentColor 50%, transparent)`). Trong một hệ
  // thống mà DESIGN.md tuyên bố "một hex cứng trong component là bug", để framework tự quyết màu
  // cũng là cùng một lỗi.
  //
  // BẢN VÁ ĐẦU DÙNG `--c-text-muted` VÀ VẪN THIẾU — ghi lại vì đây là bẫy dễ lặp: con số 4,89:1 mà
  // báo cáo critique nêu là đo trên nền THẺ TRẮNG (`--c-surface`), nhưng ô tìm ngồi trên pill
  // `--c-line-soft`. Đo lại trên trình duyệt thật sau khi vá: bản tối 4,56:1 (đạt) nhưng bản sáng
  // chỉ 4,12:1 — VẪN dưới sàn. Nên mới có token riêng `--c-text-placeholder`, hai giá trị đo TRÊN
  // PILL: 4,98:1 bản sáng, 5,33:1 bản tối.
  it('placeholder của SearchField tô bằng token riêng --c-text-placeholder', () => {
    const than = thanQuyTac('.mind-search-pill input::placeholder')
    expect(than).toContain('--c-text-placeholder')
    // Không có `opacity` kéo tương phản tụt lại sau khi đã đặt màu đúng.
    expect(than).not.toMatch(/opacity\s*:/)
  })

  it('token khai đủ cả ba khối chủ đề — thiếu một khối là một bản có màu rơi về giá trị dự phòng', () => {
    // :root (bản sáng), @media (prefers-color-scheme: dark), và [data-theme="dark"] — ba nơi mọi
    // token màu của file này phải có mặt (xem các cặp --c-text-muted ngay cạnh).
    const soLan = CSS.match(/--c-text-placeholder:/g)?.length ?? 0
    expect(soLan).toBe(3)
  })
})

describe('ô "+" tạo bảng là MỘT TỜ GIẤY (P3 critique 2026-08-29)', () => {
  // Màn này có đúng hai loại bo góc: giấy `.mind-note-card` bo 2px và hệ thống chung bo 14px
  // (`--radius`, DESIGN.md). Ô tạo bảng từng bo 8px — không khớp cái nào — và là phần tử duy nhất
  // trong lưới không phải "giấy": một khung đứt nét kiểu vùng-thả-file đứng cạnh những tờ giấy kem
  // có bóng đổ và góc cong. Trong ẩn dụ bàn giấy, "tờ mới" phải trông như tờ giấy chưa viết.
  it('bo góc 2px như .mind-note-card, không phải 8px lạc loài', () => {
    const than = thanQuyTac('.mind-o-tao-bang')
    const bo = /border-radius:\s*([^;]+);/.exec(than)?.[1].trim()
    expect(bo).toBe('2px')
    expect(thanQuyTac('.mind-note-card')).toContain('border-radius: 2px')
  })

  it('mặt là giấy (--c-note), không còn khung đứt nét kiểu vùng-thả-file', () => {
    const than = thanQuyTac('.mind-o-tao-bang')
    expect(than).toContain('--c-note')
    expect(than).not.toContain('dashed')
  })

  it('bóng đổ đi qua --c-shadow, không phải một literal chỉ đúng ở bản sáng', () => {
    // `--c-shadow` là rgba(18,20,43,.1) ở bản sáng nhưng rgba(0,0,0,.55) ở bản TỐI — chênh nhau hơn
    // năm lần độ đục. Một literal `rgba(0,0,0,.1)` viết cứng vì thế chỉ đúng ở bản sáng: sang bản
    // tối bóng gần như biến mất, ô "+" phẳng lì giữa những tờ giấy có bóng thật quanh nó — mất đúng
    // cái làm nó đọc thành "một tờ giấy chưa viết". Cùng lớp lỗi đã sửa cho nút quay lại của
    // BoardGallery (critique 2026-08-25, "Chrome chung chung phá vỡ ảo giác vật liệu"), chỉ sót lại
    // đúng chỗ này.
    const than = thanQuyTac('.mind-o-tao-bang')
    const bong = /box-shadow:\s*([^;]+);/.exec(than)?.[1] ?? ''
    expect(bong).toContain('--c-shadow')
    expect(bong).not.toMatch(/rgba?\(/)
  })
})
