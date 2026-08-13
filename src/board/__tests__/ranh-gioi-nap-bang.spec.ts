// @vitest-environment happy-dom
//
// Ca kiểm hỏng-hóc-ngoại-tuyến: chunk bảng vẽ KHÔNG tải được.
//
// Đây là tình huống thật, không giả định: public/manifest.json có lối tắt `/?screen=mindmap` cài
// ra màn hình chính; public/sw.js chỉ precache vỏ app còn chunk bảng vẽ 4 MB đi lối
// cache-first-with-revalidate, tức là chỉ có sau MỘT lượt tải mạng thành công. Mở lối tắt đó lần
// đầu khi mất sóng → `import()` bị từ chối ngay trong lúc render.
// Trước khi có src/board/index.tsx, lỗi đó nổi thẳng lên boundary gốc ở src/main.tsx và tháo sạch
// TOÀN BỘ app; nút phục hồi duy nhất là tải lại trang, mà cú tải lại giữ nguyên `?screen=mindmap`
// nên tái hiện đúng lỗi cũ — trong PWA standalone thì không còn thanh địa chỉ để thoát ra.
//
// Ca kiểm dựng lại đúng cảnh đó bằng cách cho module `../EdgelessBoard` ném lỗi lúc nạp, rồi đòi
// hai điều: (1) tab Mindmap hiện pane tiếng Việt thay vì trang trắng, (2) phần còn lại của cây —
// ở đây là thanh nav giả bên cạnh — vẫn còn nguyên trong tài liệu.
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Đúng thông điệp mà trình duyệt ném ra khi lượt tải một chunk động thất bại.
vi.mock('../EdgelessBoard', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/EdgelessBoard-abc123.js')
})

import { EdgelessBoard } from '../index'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Vỏ nạp chậm của bảng vẽ — chunk tải hỏng', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // React in nguyên vẹn lỗi đã bắt được ra console; ở ca kiểm này lỗi là thứ ta CỐ Ý gây ra nên
    // nuốt nó đi cho output đọc được, không phải để giấu lỗi thật.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('giữ hỏng hóc bên trong tab Mindmap, thanh nav và các màn khác vẫn còn', async () => {
    await act(async () => {
      root.render(
        createElement(
          'div',
          null,
          createElement('nav', { 'data-nav': 'true' }, 'Trang chủ'),
          createElement(EdgelessBoard),
        ),
      )
    })

    // 1) Không phải trang trắng: pane tiếng Việt đứng đúng chỗ bảng vẽ lẽ ra nằm.
    expect(container.textContent).toContain('Cần mạng để tải lần đầu')
    // 2) Có lối đi tiếp — nút thử lại, chứ không phải ngõ cụt.
    expect(container.querySelector('button')?.textContent).toBe('Thử lại')
    // 3) Phần còn lại của app KHÔNG bị tháo. Đây mới là điều ca kiểm này thật sự canh: thiếu
    //    boundary trong ./index.tsx thì cả cây (kể cả thẻ <nav> dưới đây) biến mất.
    expect(container.querySelector('nav[data-nav]')).not.toBeNull()
    expect(container.querySelector('nav[data-nav]')!.textContent).toBe('Trang chủ')
  })
})
