// @vitest-environment happy-dom
//
// Đóng khoản "placeholder Note trống" của track TDD (HANDOFF mục 23 Phần 4, mục 25) — trước đây bị
// xếp vào ngõ cụt vì hướng tiếp cận cũ là IMPORT THẲNG module cấu hình: `affine/gfx/note/package.json`
// chỉ khai `exports` cho `"."` và `"./view"`, nên `vite.vendor-plugin.ts` không phân giải nổi subpath.
//
// Hướng ở đây khác hẳn và không đụng tới `exports`: dựng bảng thật, tạo Note thật qua công cụ
// toolbar, rồi ĐỌC CHỮ MỜ TRÊN MÀN HÌNH (`drt-paragraph-placeholder`) — đúng thứ người dùng nhìn
// thấy, không phải hằng số trong mã. Bonus: cách này cũng canh luôn cả đường dịch D12 lẫn đường
// render, thứ mà một phép so hằng số không canh được.
import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'
import { moBangVaTaoNoteCoNoiDung, taoNoteQuaCongCuThat } from './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

describe('EdgelessBoard — chữ mờ trong đoạn văn rỗng đã sang tiếng Việt', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('Note mới tạo (đoạn văn rỗng) hiện "Gõ \'/\' để mở danh sách lệnh", không còn tiếng Anh', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'bang-placeholder' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })
    await act(async () => {
      await taoNoteQuaCongCuThat(container)
    })

    const chuMo = await choDom(() => {
      const el = document.querySelector('.drt-paragraph-placeholder')
      expect(el, 'không tìm thấy phần tử chữ mờ của đoạn văn rỗng').not.toBeNull()
      return el as HTMLElement
    })

    // Chuỗi thượng nguồn là "Type '/' for commands" (SỐ NHIỀU) — khác hẳn hai khoá đã có sẵn trong
    // vi.json là "Type '/' to insert" và "Type '/' for command" (số ít), nên nó chưa từng được thay
    // và vẫn hiện tiếng Anh trong bản dựng thật cho tới lượt này.
    expect(chuMo.textContent?.trim()).toBe("Gõ '/' để mở danh sách lệnh")
    expect(chuMo.textContent).not.toContain('Type')
  })

  it('đoạn văn ĐÃ có chữ thì không còn chữ mờ nào', async () => {
    await moBangVaTaoNoteCoNoiDung(root, container, 'bang-placeholder-2', 'Chẩn đoán phân biệt')

    const chuMo = document.querySelector('.drt-paragraph-placeholder')
    // ĐO RỒI MỚI VIẾT: thượng nguồn (`paragraph-block.ts:360-371`) LUÔN render chuỗi chữ mờ vào
    // thẻ bọc — thứ bật/tắt nó là lớp `visible` gắn theo `_displayPlaceholder`, chứ không phải
    // nội dung thẻ. Nên khẳng định "không còn chữ mờ" phải đọc LỚP, không đọc textContent; bản
    // trước đọc textContent nên đỏ dù sản phẩm đúng.
    expect(chuMo, 'thẻ bọc chữ mờ vẫn phải tồn tại (chỉ bị ẩn)').not.toBeNull()
    expect(chuMo?.classList.contains('visible')).toBe(false)
  })
})
