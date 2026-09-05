// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { iconLoaiMuc } from '../../components/SpecialtyIcons'

describe('iconLoaiMuc', () => {
  it('hai loại cho ra hai hình KHÁC nhau', () => {
    const { container: a } = render(iconLoaiMuc('bai-viet'))
    const { container: b } = render(iconLoaiMuc('so-do'))
    expect(a.innerHTML).not.toBe(b.innerHTML)
  })

  // VÒNG SỬA 1, P1: tên ca này TỪNG là "có nhãn trợ năng đọc được, không phải icon câm" — sai, vì
  // ca chỉ render `iconLoaiMuc()` CÔ LẬP (không có tổ tiên `aria-hidden`) nên XANH dù trong thẻ
  // thật badge luôn nằm dưới `<div aria-hidden="true">` (TheTrong, LuoiMuc.tsx) — `aria-hidden` ở
  // tổ tiên nuốt TOÀN BỘ hậu duệ, nên `<title>` này không bao giờ tới trình đọc màn hình ở nơi nó
  // thật sự chạy. Ca dưới đây chỉ còn khoá đúng NỘI DUNG `<title>` — điều kiện CẦN để một `<title>`
  // *có thể* được đọc, KHÔNG PHẢI ĐỦ. Ca kiểm hành vi TÍCH HỢP thật (badge trong lưới, loại mục có
  // tới trình đọc màn hình hay không) nằm ở `LuoiMuc.spec.ts` — ca "loại mục (bài viết ↔ sơ đồ)
  // tới được tên trợ năng của nút mở thẻ" — verify trên `aria-label` của nút `.the-bang-vat`,
  // không phải trên `<title>` này.
  it('SVG có <title> đúng nội dung (điều kiện CẦN, không phải ĐỦ — xem ca tích hợp ở LuoiMuc.spec.ts)', () => {
    const { container } = render(iconLoaiMuc('bai-viet'))
    expect(container.querySelector('title')?.textContent).toBe('Bài viết')
    const { container: c2 } = render(iconLoaiMuc('so-do'))
    expect(c2.querySelector('title')?.textContent).toBe('Sơ đồ')
  })
})
