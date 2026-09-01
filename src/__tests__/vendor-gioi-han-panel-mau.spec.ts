// Ca kiểm hàm thuần scripts/gioi-han-panel-mau.mjs — vá lỗi panel "Mẫu" tràn/đè lên thanh công cụ
// chính trên viewport thấp/hẹp (người dùng báo kèm ảnh chụp, 2026-09-01). Xem chú thích gốc rễ +
// số liệu đo thật ở đầu scripts/gioi-han-panel-mau.mjs.
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

import { vaKichThuocPanelMau, vaViTriPanelMau } from '../../scripts/gioi-han-panel-mau.mjs'

// Fixture tối giản CÙNG HÌNH DẠNG với khối `.edgeless-templates-panel {...}` thật trong
// .vendor-build/affine/gfx/template/src/toolbar/template-panel.js — chỉ giữ hai dòng hàm cần kiểm
// đọc, phần còn lại là văn bản CSS bao quanh không liên quan.
function dungFixture(): string {
  return (
    '.edgeless-templates-panel {\n' +
    '      width: 467px;\n' +
    '      height: 568px;\n' +
    '      border-radius: 12px;\n' +
    '    }\n'
  )
}

describe('vaKichThuocPanelMau — đường cơ bản', () => {
  it('thay cả width và height thành biểu thức min() co giãn theo viewport', () => {
    const { js } = vaKichThuocPanelMau(dungFixture(), 'thu.js')
    expect(js).toContain('width: min(467px, calc(100dvw - 24px));')
    expect(js).toContain('height: min(568px, calc(100dvh - 160px));')
    expect(js).not.toContain('width: 467px;')
    expect(js).not.toContain('height: 568px;')
  })

  it('giữ nguyên phần CSS còn lại xung quanh (không cắt lố)', () => {
    const { js } = vaKichThuocPanelMau(dungFixture(), 'thu.js')
    expect(js).toContain('border-radius: 12px;')
    expect(js).toContain('.edgeless-templates-panel {')
  })

  it('báo daVa: true khi vá thành công', () => {
    const { daVa } = vaKichThuocPanelMau(dungFixture(), 'thu.js')
    expect(daVa).toBe(true)
  })

  it('chạy hai lần liên tiếp trên cùng input gốc cho kết quả giống hệt nhau', () => {
    const fixture = dungFixture()
    const lanMot = vaKichThuocPanelMau(fixture, 'thu.js')
    const lanHai = vaKichThuocPanelMau(fixture, 'thu.js')
    expect(lanMot).toEqual(lanHai)
  })
})

describe('vaKichThuocPanelMau — fail-closed khi cấu trúc lệch kỳ vọng', () => {
  it('thiếu "width: 467px;" → throw', () => {
    const fixture = dungFixture().replace('width: 467px;', 'width: 500px;')
    expect(() => vaKichThuocPanelMau(fixture, 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })

  it('thiếu "height: 568px;" → throw', () => {
    const fixture = dungFixture().replace('height: 568px;', 'height: 600px;')
    expect(() => vaKichThuocPanelMau(fixture, 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })

  it('xuất hiện HAI LẦN "width: 467px;" (thượng nguồn thêm khối lặp) → throw, không thay lặng lẽ', () => {
    const fixture = dungFixture() + dungFixture()
    expect(() => vaKichThuocPanelMau(fixture, 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })

  it('file trống → throw', () => {
    expect(() => vaKichThuocPanelMau('', 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })
})

// Fixture tối giản CÙNG HÌNH DẠNG với đoạn định vị floating-ui thật trong
// .vendor-build/affine/gfx/template/src/toolbar/template-tool-button.js — chỉ giữ câu import và
// lời gọi computePosition cần kiểm, phần còn lại lược bỏ (hàm bọc không ảnh hưởng đến việc thay
// chuỗi vì đây là phép thay CHUỖI THÔ, không phải AST).
function dungFixtureViTri(): string {
  return (
    "import { arrow, autoUpdate, computePosition, offset, shift, } from '@floating-ui/dom';\n" +
    'function _togglePanel() {\n' +
    '    requestAnimationFrame(() => {\n' +
    '        computePosition(this, panel, {\n' +
    "            placement: 'top',\n" +
    '            middleware: [offset(20), arrow({ element: arrowEl }), shift()],\n' +
    '        });\n' +
    '    });\n' +
    '}\n'
  )
}

describe('vaViTriPanelMau — đường cơ bản', () => {
  it('thêm "size" vào import @floating-ui/dom', () => {
    const { js } = vaViTriPanelMau(dungFixtureViTri(), 'thu.js')
    expect(js).toContain("import { arrow, autoUpdate, computePosition, offset, shift, size, } from '@floating-ui/dom';")
  })

  it('thêm middleware size({...}) vào TRƯỚC arrow()/shift(), gán maxHeight trong apply()', () => {
    const { js } = vaViTriPanelMau(dungFixtureViTri(), 'thu.js')
    expect(js).toContain('size({ padding: 12, apply({ availableHeight, elements })')
    expect(js).toContain('elements.floating.style.maxHeight')
    // Thứ tự middleware: offset trước size, size trước arrow/shift — cùng một mảng, một dòng.
    const iOffset = js.indexOf('offset(20)')
    const iSize = js.indexOf('size({')
    const iArrow = js.indexOf('arrow({ element: arrowEl })')
    expect(iOffset).toBeLessThan(iSize)
    expect(iSize).toBeLessThan(iArrow)
  })

  it('không đụng chuỗi "shift()" hay lời gọi computePosition khác trong middleware', () => {
    const { js } = vaViTriPanelMau(dungFixtureViTri(), 'thu.js')
    expect(js).toContain('shift()')
    expect(js).toContain("placement: 'top'")
  })

  it('đầu ra vẫn phân tích cú pháp hợp lệ (JS thật, không chỉ chuỗi trông đúng)', () => {
    const { js } = vaViTriPanelMau(dungFixtureViTri(), 'thu.js')
    const sf = ts.createSourceFile('thu.js', js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    expect((sf as any).parseDiagnostics).toEqual([])
  })

  it('báo daVa: true khi vá thành công', () => {
    const { daVa } = vaViTriPanelMau(dungFixtureViTri(), 'thu.js')
    expect(daVa).toBe(true)
  })

  it('chạy hai lần liên tiếp trên cùng input gốc cho kết quả giống hệt nhau', () => {
    const fixture = dungFixtureViTri()
    const lanMot = vaViTriPanelMau(fixture, 'thu.js')
    const lanHai = vaViTriPanelMau(fixture, 'thu.js')
    expect(lanMot).toEqual(lanHai)
  })
})

describe('vaViTriPanelMau — fail-closed khi cấu trúc lệch kỳ vọng', () => {
  it('câu import @floating-ui/dom khác hình dạng (thượng nguồn đổi thứ tự) → throw', () => {
    const fixture = dungFixtureViTri().replace(
      "import { arrow, autoUpdate, computePosition, offset, shift, } from '@floating-ui/dom';",
      "import { arrow, autoUpdate, computePosition, offset, shift } from '@floating-ui/dom';",
    )
    expect(() => vaViTriPanelMau(fixture, 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })

  it('mảng middleware khác hình dạng (thượng nguồn đổi thứ tự tham số) → throw', () => {
    const fixture = dungFixtureViTri().replace(
      'middleware: [offset(20), arrow({ element: arrowEl }), shift()],',
      'middleware: [offset(20), shift(), arrow({ element: arrowEl })],',
    )
    expect(() => vaViTriPanelMau(fixture, 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })

  it('file trống → throw', () => {
    expect(() => vaViTriPanelMau('', 'thu.js')).toThrow(/không xuất hiện ĐÚNG MỘT LẦN/)
  })
})
