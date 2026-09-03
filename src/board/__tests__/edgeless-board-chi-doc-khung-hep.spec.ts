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

// Trạng thái bề ngang hiện tại + những callback `change` mà mã sản phẩm đã gắn vào truy vấn khung
// hẹp. Giữ ở ngoài để `xoayMay()` bắn lại đúng chúng, y như trình duyệt làm khi xoay máy.
let dangHep = false
let ngheKhungHep: ((e: { matches: boolean }) => void)[] = []

/** `window.matchMedia` giả: chỉ truy vấn khung hẹp mới trả `khop`. */
function gaBeNgang(khop: boolean) {
  dangHep = khop
  ngheKhungHep = []
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q === TRUY_VAN_KHUNG_HEP ? dangHep : false
    },
    media: q,
    addEventListener: (_loai: string, cb: (e: { matches: boolean }) => void) => {
      if (q === TRUY_VAN_KHUNG_HEP) ngheKhungHep.push(cb)
    },
    removeEventListener: (_loai: string, cb: (e: { matches: boolean }) => void) => {
      ngheKhungHep = ngheKhungHep.filter((x) => x !== cb)
    },
  }))
}

/** Xoay máy / thu nhỏ cửa sổ: bề ngang vượt qua ngưỡng, mọi listener được báo. */
function xoayMay(hep: boolean) {
  dangHep = hep
  for (const cb of [...ngheKhungHep]) cb({ matches: hep })
}

/**
 * Tên công cụ đang chọn trên bảng — đọc qua `gfx` của `drt-edgeless-root`, đúng chỗ mã sản phẩm
 * (veCongCuBanTay trong EdgelessBoard.tsx) ghi vào.
 */
function congCuDangChon(): string | undefined {
  const root = document.querySelector('drt-edgeless-root') as unknown as {
    gfx?: { tool?: { currentToolName$?: { value?: string } } }
  } | null
  return root?.gfx?.tool?.currentToolName$?.value
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

  // ─── Công cụ đang chọn phải về BÀN TAY khi vào chế độ đọc ──────────────────────────────────
  // `store.readonly` chặn mọi đường GHI nhưng KHÔNG đụng `gfx.tool`: công cụ chọn lúc khung còn
  // rộng (Bút, Hình, Chữ...) vẫn nguyên đó khi khung hẹp lại, mà chỉ-đọc lại ẩn luôn thanh công cụ
  // nên không còn nút nào đổi về — bảng kẹt ở một công cụ vẽ không vẽ được gì, cú kéo trên canvas
  // không dời được khung nhìn (chủ dự án báo 2026-09-04).
  // CA CANH THƯỢNG NGUỒN, không canh mã của app: mốc MỞ BẢNG do
  // `edgeless-root-block.ts:452` lo sẵn (`if (store.readonly) setTool(PanTool, ...)` trong
  // `firstUpdated()`). Đã kiểm: gỡ hẳn bản vá của app thì ca này VẪN XANH — nên nó KHÔNG phải bằng
  // chứng cho bản vá, mà là chuông báo nếu nâng cấp cây vendored làm mất hành vi đó (lúc đó app
  // phải tự lo nốt mốc này).
  it('khung hẹp lúc mở bảng: công cụ đang chọn là bàn tay (thượng nguồn lo)', async () => {
    gaBeNgang(true)
    await moBang('bang-hep-cong-cu')

    await choDom(() => {
      expect(congCuDangChon(), 'mở thẳng ở khung hẹp cũng phải ra bàn tay').toBe('pan')
    })
  })

  it('xoay từ khung rộng sang khung hẹp: công cụ quay về bàn tay', async () => {
    gaBeNgang(false)
    await moBang('bang-xoay-cong-cu')

    // Khung rộng: giữ nguyên công cụ mặc định của bảng vẽ, KHÔNG phải bàn tay — nếu bước này đã là
    // 'pan' thì ca kiểm dưới không chứng minh được gì.
    expect(congCuDangChon(), 'khung rộng phải giữ công cụ mặc định của bảng vẽ').not.toBe('pan')

    await act(async () => {
      xoayMay(true)
    })

    await choDom(() => {
      expect(layStore()?.readonly, 'xoay sang hẹp phải khoá chỉ-đọc').toBe(true)
      expect(congCuDangChon(), 'và phải kéo công cụ đang chọn về bàn tay').toBe('pan')
    })
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
