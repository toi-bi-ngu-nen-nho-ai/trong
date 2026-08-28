// @vitest-environment happy-dom
//
// Ca kiểm NỐI DÂY cho cơ chế bàn phím ảo iOS (HANDOFF mục 7, hướng B).
//
// `ban-phim-ao-ios.spec.ts` canh phần logic bằng phụ thuộc bơm vào — nhanh, phủ hết nhánh, nhưng
// nó KHÔNG chạm tới ba mối nối dễ đứt nhất, và cả ba đều nằm ngoài tầm của một ca kiểm đơn vị:
//
//  1. `layTenCongCu` đọc `drt-edgeless-root`.`gfx.tool.currentToolName$.value` — API NỘI BỘ của
//     cây vendored, không có kiểu công khai, thượng nguồn đổi lúc nào cũng được. Ca đơn vị bơm
//     một hàm giả nên nó xanh vĩnh viễn dù đường đọc thật đã mục.
//  2. Phần tử mồi phải nằm NGOÀI `editor-host` nhưng TRONG `.drt-edgeless-viewport` — sai một bậc
//     là hoặc BlockSuite thấy nó (rối loạn selection), hoặc listener không bắt được lượt chạm.
//  3. Cờ iOS quyết định có render mồi hay không. Nó ĐƯỢC ĐO trong khởi tạo state của component
//     (không phải hằng số cấp module) chính vì ca kiểm này: một hằng số cấp module chỉ đo được
//     một lần cho cả tiến trình, và nạp lại module để đo lần hai làm `customElements.define` của
//     cây vendored ném vì trùng tên (đã đo: 4/4 ca đỏ với `DOMException: ... "data-view-date-
//     group-view" has already been used`). Đo lúc mount thì chỉ cần đổi `navigator` rồi render.
//
// GIỚI HẠN giữ nguyên như ca đơn vị: happy-dom không có bàn phím ảo. Ca này chứng minh đúng chuỗi
// "chạm → mồi nhận focus đồng bộ" chạy thật trên một bảng thật; nó KHÔNG chứng minh Safari iOS
// chịu bật bàn phím. Khoản đó phải nghiệm thu trên iPhone thật.
import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'
import type { GfxLike } from './helpers/note-interaction'
// Import vì tác dụng phụ: proxy canvas + các polyfill happy-dom mà cây Lit cần lúc mount.
import './helpers/note-interaction'

const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const UA_MAY_BAN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

function datUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

describe('EdgelessBoard — nối dây cơ chế bàn phím ảo iOS', () => {
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
    datUserAgent(UA_MAY_BAN)
  })

  async function moBang(ua: string, boardId: string) {
    // Đặt userAgent TRƯỚC khi render: cờ iOS đo trong khởi tạo state, tức đúng lượt render đầu.
    datUserAgent(ua)
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })
    return container.querySelector('.drt-edgeless-viewport') as HTMLElement
  }

  const timMoi = (viewport: HTMLElement) =>
    viewport.querySelector('[data-drt-moi-ban-phim]') as HTMLElement | null

  const chamNen = (viewport: HTMLElement) =>
    viewport.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerType: 'touch',
      }),
    )

  const datCongCu = (ten: string) => {
    const goc = document.querySelector('drt-edgeless-root') as unknown as { gfx: GfxLike }
    goc.gfx.tool.currentToolName$.value = ten
  }

  it('máy tính bàn: KHÔNG render phần tử mồi — DOM sạch y như trước lượt vá', async () => {
    const viewport = await moBang(UA_MAY_BAN, 'bang-ban-phim-may-ban')
    expect(timMoi(viewport)).toBeNull()
  })

  it('iPhone: có phần tử mồi, và nó nằm NGOÀI editor-host', async () => {
    const viewport = await moBang(UA_IPHONE, 'bang-ban-phim-iphone')
    const moi = timMoi(viewport)
    expect(moi, 'thiếu phần tử mồi trên iOS').not.toBeNull()
    // Mối nối số 2: nằm trong viewport nhưng ngoài host. Nếu nó lọt vào trong host, mọi truy vấn
    // contenteditable của BlockSuite sẽ thấy một ô soạn thảo ma.
    expect(document.querySelector('editor-host')?.contains(moi!)).toBe(false)
  })

  it('iPhone + công cụ Note: chạm nền → mồi nhận focus NGAY trong nhịp pointerup', async () => {
    const viewport = await moBang(UA_IPHONE, 'bang-ban-phim-note')
    const moi = timMoi(viewport)!
    // Đặt công cụ qua ĐÚNG đường mà nút toolbar dùng — đây là mối nối số 1: nếu `layTenCongCu` đọc
    // sai đường, ca này đỏ dù ca đơn vị vẫn xanh.
    datCongCu('affine:note')
    chamNen(viewport)
    // Không await gì: điều kiện Safari đòi là ĐỒNG BỘ.
    expect(document.activeElement).toBe(moi)
  })

  it('iPhone + công cụ chọn: chạm nền KHÔNG bật bàn phím', async () => {
    const viewport = await moBang(UA_IPHONE, 'bang-ban-phim-chon')
    const moi = timMoi(viewport)!
    datCongCu('default')
    chamNen(viewport)
    expect(document.activeElement).not.toBe(moi)
  })
})
