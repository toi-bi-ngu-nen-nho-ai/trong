// Canh phép vá "chỉ liệt kê họ phông DỰNG ĐƯỢC THẬT" (scripts/loc-ho-phong-co-that.mjs).
//
// LỖI GỐC: ô "Aa" của thanh công cụ chữ liệt kê CỐ ĐỊNH cả 7 họ trong `FontFamilyList` — một hằng
// enum của model, không liên quan gì tới việc trình duyệt có face nào. Dự án chỉ tự chứa họ Inter
// (xem src/board/phong-chu-bang.ts), nên 6 họ còn lại là mục CHẾT: bấm vào thì model đổi
// `fontFamily` nhưng chữ không đổi hình dạng, và ô kiểu chữ bên cạnh tụt về rỗng vì họ mới không
// có face nào.
//
// Đo thật trên trình duyệt (2026-09-02, sau khi đăng ký FontConfig): 7 họ liệt kê, đúng 1 (Inter)
// có 6 face, sáu họ còn lại đều 0 face.
//
// PHÉP VÁ không phải "ẩn cứng 6 tên" mà là phát biểu ĐÚNG LUẬT: chỉ chào những họ mà
// `TextUtils.getFontFacesByFontFamily()` thật sự trả về face. Nhờ vậy nó tự đúng về sau — thêm một
// họ vào `phongChuBang` là nó hiện ra, không phải sửa thêm chỗ nào.
//
// DỰ PHÒNG không-bao-giờ-rỗng: nếu KHÔNG họ nào có face (nền tảng không dựng được `FontFace`, lúc
// đó `phongChuBang` cố ý khai mảng rỗng — xem chú thích trong file đó), phép lọc sẽ cho danh sách
// rỗng và người dùng gặp một menu trắng, tệ hơn hiện trạng. Nên vá giữ nguyên danh sách đầy đủ ở
// đúng ca đó.
import { describe, expect, it } from 'vitest'

import { vaLocHoPhong } from '../../scripts/loc-ho-phong-co-that.mjs'

const NEO = '            return repeat(FontFamilyList, item => item[0], ([font, name]) => {'
const TEP = '.vendor-build/affine/widgets/edgeless-toolbar/src/panel/font-family-panel.js'

const nguonThat = [
  '        render() {',
  NEO,
  '                const active = this.value === font;',
  '            });',
  '        }',
].join('\n')

describe('vaLocHoPhong — chỉ liệt kê họ phông dựng được thật', () => {
  it('thay danh sách tĩnh bằng danh sách đã lọc theo face có thật', () => {
    const { js, daVa } = vaLocHoPhong(nguonThat, TEP)
    expect(daVa).toBe(true)
    expect(js).toContain('getFontFacesByFontFamily')
    // Vẫn phải gọi repeat() — không đổi cách render, chỉ đổi NGUỒN danh sách.
    expect(js).toContain('repeat(')
    expect(js).toContain('item => item[0]')
  })

  it('giữ dự phòng: không họ nào có face thì vẫn dùng danh sách đầy đủ', () => {
    const { js } = vaLocHoPhong(nguonThat, TEP)
    // Phải có nhánh quay về FontFamilyList, nếu không menu sẽ trắng trên nền tảng thiếu FontFace.
    expect(js).toMatch(/length\s*(>|!==)\s*0\s*\?[\s\S]*FontFamilyList/)
  })

  it('KHÔNG còn lượt `repeat(FontFamilyList` trần nào sau khi vá', () => {
    const { js } = vaLocHoPhong(nguonThat, TEP)
    expect(js).not.toContain('repeat(FontFamilyList,')
  })

  it('mốc neo KHÔNG xuất hiện thì DỪNG bằng lỗi, không vá mù', () => {
    const doiChoc =
      '        render() {\n            return repeat(DanhSachKhac, item => item[0], () => {});\n        }'
    expect(() => vaLocHoPhong(doiChoc, TEP)).toThrow(/ĐÚNG MỘT LẦN/)
  })

  it('mốc neo xuất hiện HAI lần thì cũng DỪNG bằng lỗi', () => {
    expect(() => vaLocHoPhong(nguonThat + '\n' + nguonThat, TEP)).toThrow(/ĐÚNG MỘT LẦN/)
  })

  it('vá hai lần trên cùng nguồn đã vá thì DỪNG — không chồng lớp', () => {
    const { js } = vaLocHoPhong(nguonThat, TEP)
    expect(() => vaLocHoPhong(js, TEP)).toThrow(/ĐÚNG MỘT LẦN/)
  })
})
