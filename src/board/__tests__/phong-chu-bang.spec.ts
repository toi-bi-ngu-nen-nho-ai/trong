// Canh cấu hình phông cho CHỮ TRÊN BẢNG VẼ (src/board/phong-chu-bang.ts).
//
// LỖI GỐC (người dùng báo 2026-09-02, đo lại trên trình duyệt thật): chọn một hình có chữ rồi bấm ô
// kiểu chữ ("Thường") thì mở ra một hộp RỖNG — không có Đậm/Nghiêng nào. Ô phông ("Aa") cũng rỗng.
//
// Chuỗi nhân quả: panel kiểu chữ dựng từ `TextUtils.getFontFacesByFontFamily(fontFamily)`, mà hàm
// đó chính là `[...document.fonts.keys()]` lọc theo tên họ. Chữ trên canvas mặc định mang
// `fontFamily = FontFamily.Inter`, tức chuỗi CÓ TIỀN TỐ `'blocksuite:surface:Inter'`. App chưa bao
// giờ đăng ký `FontConfigExtension`, nên `FontLoaderService` không thêm FontFace nào mang tên họ
// đó vào `document.fonts` → phép lọc trả mảng rỗng → panel rỗng.
//
// Đo thật trước khi vá: `document.fonts` có 77 face nhưng TOÀN của app (Plus Jakarta Sans, Space
// Grotesk, Source Serif 4, JetBrains Mono) — 0 face nào thuộc họ Inter, dù trần hay có tiền tố.
// Tiêm thử 6 face mang đúng tên họ có tiền tố là dropdown hiện đủ sáu mục ngay (Light/Regular/
// Semibold × thường/nghiêng), đúng như video AFFiNE.
//
// VÌ SAO KHÔNG dùng `AffineCanvasTextFonts` của thượng nguồn: mọi URL trong đó trỏ
// `https://cdn.affine.pro/fonts/…`, và host đó KHÔNG với tới được từ máy dự án (đo: `Failed to
// fetch`). Dùng nó là chữ trên bảng im lặng rơi về phông dự phòng.
//
// VÌ SAO tự chứa trong `public/fonts/` (chủ dự án quyết 2026-09-02): app là sổ tay lâm sàng chạy
// ngoại tuyến, không nên phụ thuộc host thứ ba lúc chạy. Dùng bản Inter variable CHÍNH THỨC
// (rsms.me, giấy phép SIL OFL): MỘT tệp phủ mọi độ đậm, và — quan trọng nhất cho app tiếng Việt —
// phủ đủ dấu. Đã đo bằng `document.fonts.check()`: 14/14 ký tự có dấu và cả câu "Sốc nhiễm khuẩn —
// Đợt cấp COPD" đều dựng được, ở CẢ hai tệp thường và nghiêng.
//
// CẠM BẪY đã tránh: tệp subset "vietnamese" của Google Fonts CHỈ chứa các mã dấu tiếng Việt, KHÔNG
// có Latin cơ bản — mà `FontConfig` chỉ nhận MỘT `url` cho mỗi (họ, độ đậm, kiểu), không có chỗ
// khai `unicode-range`. Ghép subset kiểu đó là chữ thường biến mất. Nên phải là tệp ĐỦ BỘ KÝ TỰ.
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { phongChuBang } from '../phong-chu-bang'

const thuMuc = path.dirname(fileURLToPath(import.meta.url))
const CONG_KHAI = path.resolve(thuMuc, '../../../public')

describe('phongChuBang — cấu hình phông chữ trên bảng vẽ', () => {
  it('phủ đúng sáu tổ hợp độ đậm × kiểu mà panel kiểu chữ cần', () => {
    const toHop = phongChuBang.map((f) => `${f.weight}/${f.style}`).sort()
    expect(toHop).toEqual(
      ['300/italic', '300/normal', '400/italic', '400/normal', '600/italic', '600/normal'].sort(),
    )
  })

  it('mọi mục mang ĐÚNG tên họ có tiền tố của model, không phải "Inter" trần', () => {
    // Đây chính là mắt xích từng sai: `document.fonts` chứa họ tên trần thì phép lọc không khớp.
    for (const f of phongChuBang) expect(f.font).toBe('blocksuite:surface:Inter')
  })

  it('mỗi URL trỏ tới một tệp CÓ THẬT trong public/ và không rỗng', () => {
    // `FontConfig` của cây vendored khai mọi trường là TUỲ CHỌN (`url?: string` — dấu vết cách zod
    // được phát ra .d.ts ở đó), nên phải khẳng định sự hiện diện trước. Đây cũng là phép kiểm thật:
    // một mục thiếu `url` thì `new FontFace(font, 'url(undefined)')` hỏng im lặng lúc chạy.
    for (const f of phongChuBang) {
      expect(typeof f.url).toBe('string')
      const url = f.url as string
      expect(url.startsWith('/')).toBe(true)
      const tep = path.join(CONG_KHAI, url.replace(/^\//, ''))
      expect(existsSync(tep), `thiếu tệp phông: ${url}`).toBe(true)
      expect(statSync(tep).size).toBeGreaterThan(10_000)
    }
  })

  it('không trỏ ra host thứ ba nào — app phải chạy được ngoại tuyến', () => {
    for (const f of phongChuBang) expect(f.url).not.toMatch(/^https?:/)
  })
})
