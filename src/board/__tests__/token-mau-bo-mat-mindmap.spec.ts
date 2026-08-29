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

describe('ô "+" tạo bảng — viền đứt nét, nền phớt nhạt (chủ dự án 2026-08-30, đảo P3 2026-08-29)', () => {
  // Lịch sử: P3 (2026-08-29) đổi ô "+" từ viền ĐỨT sang viền LIỀN với lý do "nét đứt = vùng-thả-file".
  // Chủ dự án đảo lại 2026-08-30: nét đứt + nền nhạt "dễ chịu hơn", và nét đứt ở ĐÂY đọc đúng nghĩa
  // "thêm mới" (quy ước Drive/Notion/Figma) chứ không phải drop-zone. Ghi rõ: đây là SỞ THÍCH có thể
  // sửa, KHÔNG bất di bất dịch — ca kiểm này canh "đừng vô tình hồi quy", không phải "cấm đổi".
  // Bo góc: màn này có đúng hai loại — giấy `.mind-note-card` bo 2px, hệ thống chung bo 14px
  // (`--radius`, DESIGN.md). Ô "+" giữ 2px (khớp họ giấy), CHỈ đổi kiểu viền + nền qua `.mind-o-moi`.
  it('bo góc 2px như .mind-note-card, không phải 8px lạc loài', () => {
    const than = thanQuyTac('.mind-o-tao-bang')
    const bo = /border-radius:\s*([^;]+);/.exec(than)?.[1].trim()
    expect(bo).toBe('2px')
    expect(thanQuyTac('.mind-note-card')).toContain('border-radius: 2px')
  })

  it('ô "+" (.mind-o-moi) là viền ĐỨT nét + nền phớt --c-accent-2, không mượn mặt giấy --c-note', () => {
    // Lấy đúng luật modifier — KHÔNG phải `.mind-o-tao-bang` gốc (gốc vẫn viền liền, dùng cho nút
    // "Xoá bộ lọc" cũng mượn class đó).
    const than = thanQuyTac('.mind-o-tao-bang.mind-o-moi')
    expect(than).toContain('dashed')
    // Nền là lớp phớt accent-2 tự đổi sáng/tối, không phải mặt giấy kem --c-note của thẻ thật.
    expect(than).toMatch(/background:\s*rgba\(var\(--c-accent-2-rgb/)
    expect(than).not.toContain('--c-note')
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
