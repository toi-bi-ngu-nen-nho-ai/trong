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

  it('có nhãn trợ năng đọc được, không phải icon câm', () => {
    const { container } = render(iconLoaiMuc('bai-viet'))
    expect(container.querySelector('title')?.textContent).toBe('Bài viết')
    const { container: c2 } = render(iconLoaiMuc('so-do'))
    expect(c2.querySelector('title')?.textContent).toBe('Sơ đồ')
  })
})
