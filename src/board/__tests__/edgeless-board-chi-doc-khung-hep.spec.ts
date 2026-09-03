// @vitest-environment happy-dom
//
// Chủ dự án quyết 2026-09-03: MỞ BẢNG SƠ ĐỒ Ở KHUNG HẸP THÌ CHỈ ĐỂ XEM, không chỉnh sửa gì.
//
// Cách thực thi và VÌ SAO chọn nó: `store.readonly = true`. Đó là công tắc DUY NHẤT chặn được mọi
// đường sửa cùng lúc — thanh công cụ tự trả `nothing`
// (`widgets/edgeless-toolbar/src/edgeless-toolbar.ts:663`), `updateBlock` từ chối ghi, bấm đúp
// không mở được trình soạn chữ. Ẩn nút bằng CSS hay bỏ đăng ký từng công cụ thì vẫn còn bấm đúp và
// kéo phần tử, tức là vẫn sửa được.
//
// ĐÁNH ĐỔI đã biết và chấp nhận: `readonly` cũng ẩn luôn THANH ZOOM
// (`edgeless-zoom-toolbar/src/zoom-toolbar.ts:148` và `zoom-bar-toggle-button.ts:83` đều trả
// `nothing`), nên ở khung hẹp mất nút "Vừa khung hình" và mức zoom — chỉ còn chụm/kéo bằng
// ngón. Cả hai file đó thuộc cây vendored (D11) nên không vá tại chỗ được.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'
import { TRUY_VAN_KHUNG_HEP } from '../chi-doc-khung-hep'
import { choDom } from '../../__tests__/helpers/cho-den-khi'
// Import vì tác dụng phụ: proxy ngữ cảnh canvas 2D + các polyfill happy-dom mà cây Lit cần lúc
// mount (cùng lý do đã ghi ở helpers/note-interaction.ts).
import './helpers/note-interaction'

/** `window.matchMedia` giả: chỉ truy vấn điện thoại mới trả `khop`. */
function gaBeNgang(khop: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q === TRUY_VAN_KHUNG_HEP ? khop : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** `store` của bảng đang mở — đọc qua editor-host, đúng chỗ mã sản phẩm đặt nó. */
function layStore(): { readonly: boolean } | null {
  const host = document.querySelector('editor-host') as unknown as {
    store?: { readonly: boolean }
    doc?: { readonly: boolean }
  } | null
  return host?.store ?? host?.doc ?? null
}

describe('EdgelessBoard — chế độ chỉ đọc khi khung hẹp', () => {
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
    vi.unstubAllGlobals()
  })

  async function moBang(boardId: string) {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })
  }

  it('khung hẹp: store bị khoá chỉ-đọc VÀ có băng thông báo', async () => {
    gaBeNgang(true)
    await moBang('bang-khung-hep')

    await choDom(() => {
      expect(layStore()?.readonly, 'store phải bị khoá chỉ-đọc ở khung hẹp').toBe(true)
    })
    expect(container.textContent).toContain('chỉ ở chế độ đọc')
  })

  it('màn hình lớn: KHÔNG khoá, KHÔNG có băng thông báo', async () => {
    gaBeNgang(false)
    await moBang('bang-man-lon')

    await choDom(() => {
      expect(document.querySelector('editor-host')).not.toBeNull()
    })
    expect(layStore()?.readonly, 'màn hình lớn phải chỉnh sửa được như cũ').toBe(false)
    expect(container.textContent).not.toContain('chỉ ở chế độ đọc')
  })
})
