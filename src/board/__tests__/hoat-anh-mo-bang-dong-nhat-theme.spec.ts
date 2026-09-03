// Hoạt ảnh mở/đóng bảng phải ĐỌC GIỐNG HỆT ở bản sáng và bản tối (chủ dự án 2026-09-03: "hoạt ảnh
// sơ đồ chế độ dark/light quá khác biệt — thống nhất giống hệt, ưu tiên nâng bản tối lên").
//
// ─── Gốc rễ đã ĐO trên trình duyệt thật, không suy đoán ────────────────────────────────────────
// Chuyển động thì vốn đã giống nhau: cùng @keyframes, cùng thời lượng, cùng easing, KHÔNG có một
// dòng animation/transition nào bị ghi đè trong ba khối chủ đề của index.css. Khác biệt nằm ở VẬT
// LIỆU BỀ MẶT mà hoạt ảnh diễn ra trên đó. Hai lớp phủ của BoardGallery.tsx tô nền bằng
// `--c-surface-alt` (bề mặt VỎ APP, lật theo chủ đề) trong khi thứ chúng vẽ lên đó — mặt giấy +
// huy hiệu + nét vẽ của TheTrong — thuộc họ GIẤY (`--c-note`/`--c-on-note*`, CỐ Ý không lật, xem
// chú thích tại khai báo token trong index.css). Số đo lúc lớp phủ đứng opacity 1:
//
//                                  bản sáng      bản tối
//   giấy thẻ trong lưới            #fbfaf7       #efece3     (đều sáng — giấy vẫn là giấy)
//   nền lớp phủ (--c-surface-alt)  #f6f7fd       #1b1e3d     (LẬT: sáng → xanh đen)
//   lệch sáng giấy ↔ lớp phủ         1,02:1       13,68:1
//   nét vẽ trên lớp phủ              7,32:1        2,06:1     (bản tối dưới cả sàn 3:1 của
//                                                              WCAG 1.4.11 cho đồ hoạ mang nghĩa)
//
// Ở bản sáng hai vật liệu TRÙNG NHAU TÌNH CỜ (1,02:1) nên không ai thấy sai; ở bản tối chúng đảo
// ngược, cú phóng to đọc thành "một tấm nền tối khác đè lên" thay vì "tờ giấy vừa bấm lớn dần", và
// nét vẽ gần như tàng hình. Bản vá: lớp phủ dùng ĐÚNG vật liệu giấy của thẻ.
//
// Kiểm trên VĂN BẢN nguồn (cùng lý do/cùng khuôn với token-mau-bo-mat-mindmap.spec.ts): happy-dom
// không dựng cascade thật và `getComputedStyle` ở đó không phân giải `var()` xuyên lớp, còn Browser
// pane không chạy được trong cổng `npm test`. Thứ có thể hồi quy âm thầm ở đây là một lượt sửa CSS/
// TSX kéo lớp phủ về lại token vỏ app — đúng thứ ca kiểm này canh.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const doc = (p: string) => readFileSync(path.join(GOC, p), 'utf8').replace(/\r\n/g, '\n')

const CSS = doc('index.css')
const TSX = doc('board/BoardGallery.tsx')

/**
 * Bỏ chú thích để chỉ còn MÃ THỰC THI. Bắt buộc: chính bản vá này ghi lại lịch sử "trước đây chỗ
 * này tô --c-surface-alt" ngay trong chú thích cạnh chỗ sửa (đúng khuôn tài liệu-tại-chỗ của repo),
 * nên một phép kiểm chạy trên văn bản THÔ sẽ đỏ vì đọc được đúng lời giải thích về lỗi đã sửa — bắt
 * người sửa sau phải chọn giữa "xoá chú thích" và "test xanh". Cắt chú thích trước khi kiểm giữ
 * được cả hai.
 * Thứ tự QUAN TRỌNG: chú thích JSX `{/* … *\/}` và chú thích khối `/* … *\/` cắt trước, rồi mới tới
 * dòng `//` — cắt `//` trước sẽ ăn mất phần thân của một khối nhiều dòng có dấu `//` bên trong.
 */
function boChuThich(ma: string): string {
  return ma
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trim().startsWith('//'))
    .join('\n')
}

const TSX_MA = boChuThich(TSX)

/** Thân của quy tắc CSS đầu tiên khớp `boChon` (khớp nguyên văn chuỗi chọn). */
function thanQuyTac(boChon: string): string {
  const i = CSS.indexOf(boChon + ' {')
  if (i < 0) throw new Error(`không thấy quy tắc "${boChon}" trong index.css`)
  const mo = CSS.indexOf('{', i)
  const dong = CSS.indexOf('}', mo)
  return CSS.slice(mo + 1, dong)
}

describe('lớp phủ chuyển cảnh mở/đóng bảng dùng vật liệu GIẤY, không phải bề mặt vỏ app', () => {
  it('BoardGallery.tsx không còn tô lớp phủ nào bằng --c-surface-alt', () => {
    // `--c-surface-alt` là bề mặt vỏ app: #f6f7fd bản sáng → #1b1e3d bản tối. Mỗi lần nó xuất hiện
    // làm nền cho một lớp phủ chuyển cảnh là một lần bản tối rẽ khỏi bản sáng.
    expect(TSX_MA).not.toContain('--c-surface-alt')
  })

  it('cả hai lớp phủ (mở FLIP + gập lại) đều mang class mặt giấy dùng chung', () => {
    // MỘT class dùng chung cho cả hai, không phải hai literal inline chép tay — trước bản vá mỗi
    // lớp phủ tự viết `var(--c-surface-alt, #f6f7fd)` riêng, hai nguồn sự thật cho cùng một vật
    // liệu, sửa một chỗ quên chỗ kia là lệch âm thầm.
    const soLan = TSX_MA.match(/mind-giay-day/g)?.length ?? 0
    expect(soLan).toBe(2)
  })

  it('mặt giấy đó dựng từ CÙNG cặp token với .mind-note-card của thẻ trong lưới', () => {
    // Continuity là điều kiện của cú FLIP: lớp phủ CHÍNH LÀ tấm thẻ vừa bấm được phóng to, nên nó
    // phải là cùng một vật liệu — không phải "một màu na ná".
    const giay = thanQuyTac('.mind-giay-day')
    const the = thanQuyTac('.mind-note-card')
    for (const token of ['--c-note', '--c-note-edge']) {
      expect(giay).toContain(token)
      expect(the).toContain(token)
    }
    // Và KHÔNG mượn lại bất cứ token bề mặt vỏ app nào — đó là cả gốc rễ của lỗi này.
    expect(giay).not.toMatch(/--c-surface/)
  })

  it('chữ "vẫn đang tải" trên lớp phủ là MỰC TRÊN GIẤY (--c-on-note-muted)', () => {
    // Mắt xích nối tiếp, phải sửa cùng lượt: đổi nền sang giấy mà để chữ ở `--c-text-muted` thì bản
    // tối lật chữ sang #888eb8 sáng, đặt lên giấy sáng còn 1,9:1 — vá một chỗ, vỡ chỗ kế.
    // `--c-on-note-muted` được đo sẵn 5,9:1 (giấy bản sáng) / 5,2:1 (giấy bản tối).
    // Cắt ĐÚNG khối `{choLau && ( … )}` trong mã đã bỏ chú thích, thay vì lấy một cửa sổ N ký tự
    // trước dòng chữ: cửa sổ cố định vừa ăn cả `--c-text-muted` của lớp phủ "Đang dựng ảnh…" ở xa
    // hơn trong file (lớp đó nền `--c-surface`, cặp CÙNG lật nên vốn nhất quán — KHÔNG được kéo vào
    // bản vá này), vừa đỏ oan khi có ai thêm/bớt chú thích quanh đó.
    const mo = TSX_MA.indexOf('{choLau && (')
    expect(mo).toBeGreaterThan(-1)
    const het = TSX_MA.indexOf('Đang tải sơ đồ…', mo)
    expect(het).toBeGreaterThan(mo)
    const khoi = TSX_MA.slice(mo, het)
    expect(khoi).toContain('--c-on-note-muted')
    expect(khoi).not.toContain('--c-text-muted')
  })

  it('--c-on-note-muted vẫn KHÔNG có bản ghi đè cho chủ đề tối — đó là thứ giữ hai bản giống nhau', () => {
    // Bất biến này chính là cơ chế của bản vá: mực trên giấy khai ĐÚNG MỘT LẦN ở `:root`. Thêm một
    // bản ghi đè trong khối dark là tái tạo lại đúng lớp lỗi vừa sửa, chỉ ở tầng chữ.
    const soLan = CSS.match(/--c-on-note-muted:/g)?.length ?? 0
    expect(soLan).toBe(1)
  })
})
