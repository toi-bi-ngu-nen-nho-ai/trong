// D12 — luật vị trí của phép thay chuỗi hiển thị.
//
// Vì sao phải kiểm theo VỊ TRÍ chứ không theo nội dung chuỗi: cơ chế cũ khớp trọn một literal ở
// bất cứ đâu, nên "LinkedPage" vừa là nhãn ở `name:` vừa là GIÁ TRỊ LƯỢC ĐỒ ở `type:` — dịch cả
// hai là hỏng phân giải liên kết, không lỗi, không cổng nào đỏ.
import { describe, expect, it } from 'vitest'

import { dichMotFile } from '../../scripts/luat-vi-tri-dich.mjs'

const BAN_DO = { Style: 'Phong cách', LinkedPage: 'Trang liên kết', Escape: 'Thoát', None: 'Không' }

const dich = (js: string) => dichMotFile(js, BAN_DO, 'thu.js').js

describe('D12 — vị trí ĐƯỢC dịch', () => {
  it('giá trị của thuộc tính label', () => {
    expect(dich(`const a = { label: 'Style' }`)).toContain('Phong cách')
  })

  it('giá trị của thuộc tính name', () => {
    expect(dich(`const a = { name: 'Style' }`)).toContain('Phong cách')
  })

  it('giá trị của thuộc tính tooltip', () => {
    expect(dich(`const a = { tooltip: 'Style' }`)).toContain('Phong cách')
  })

  it('đối số của toast', () => {
    expect(dich(`toast(std, 'Style')`)).toContain('Phong cách')
  })

  it('literal đứng một mình sau data-tip= trong template', () => {
    const ra = dich('html`<x data-tip="${\'Style\'}"></x>`')
    expect(ra).toContain('Phong cách')
  })
})

describe('D12 — vị trí KHÔNG được đụng', () => {
  // Mỗi ca dưới đây canh một lớp hỏng khác nhau. Bằng chứng đỏ: thêm tên vị trí tương ứng vào
  // danh sách cho phép trong scripts/luat-vi-tri-dich.mjs thì ca đó PHẢI đỏ.
  it('giá trị lược đồ ở type:', () => {
    expect(dich(`const a = { type: 'LinkedPage' }`)).toContain('LinkedPage')
  })

  it('định danh mục menu ở key:', () => {
    expect(dich(`const a = { key: 'Style' }`)).toContain(`'Style'`)
  })

  it('tra khoá obj[...]', () => {
    expect(dich(`const v = cau_hinh['None']`)).toContain(`'None'`)
  })

  it('so sánh ===', () => {
    expect(dich(`if (e.key === 'Escape') return`)).toContain(`'Escape'`)
  })

  it('nhánh case', () => {
    expect(dich(`switch (k) { case 'Escape': break }`)).toContain(`'Escape'`)
  })

  it('thông báo lỗi nội bộ new Error(...)', () => {
    expect(dich(`throw new Error('Style')`)).toContain(`'Style'`)
  })

  it('định danh tiêm phụ thuộc createIdentifier(...)', () => {
    expect(dich(`const I = createIdentifier('Style')`)).toContain(`'Style'`)
  })

  it('tên sự kiện đo đạc track(...)', () => {
    expect(dich(`track(std, 'Style')`)).toContain(`'Style'`)
  })

  it('literal là VẾ GHÉP trong template, không đứng một mình', () => {
    const ra = dich('html`<x data-tip="${\'Style\' + hau}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('literal sau thuộc tính KHÔNG hiển thị trong template', () => {
    const ra = dich('html`<x class="${\'Style\'}"></x>`')
    expect(ra).toContain(`'Style'`)
  })
})

describe('D12 — ca xương sống: cùng chuỗi, hai vị trí, cùng file', () => {
  // Tái hiện chính xác thứ suýt làm hỏng dữ liệu. Đây là ca quan trọng nhất của bộ này.
  it('name: được dịch, type: còn nguyên văn', () => {
    const ra = dich(`
      const muc = { name: 'LinkedPage', icon: I() }
      const du_lieu = { reference: { type: 'LinkedPage', pageId: p } }
    `)
    expect(ra).toContain(`name: "Trang liên kết"`)
    expect(ra).toContain(`type: 'LinkedPage'`)
  })
})

describe('D12 — báo cáo lượt thay', () => {
  it('ghi đúng vị trí và số dòng', () => {
    const { cacLuot } = dichMotFile(`const a = { label: 'Style' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Style', chuoiDich: 'Phong cách', viTri: 'thuộc-tính:label', dong: 1 },
    ])
  })

  it('không thay gì thì báo cáo rỗng', () => {
    const { cacLuot } = dichMotFile(`const a = { type: 'LinkedPage' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([])
  })
})
