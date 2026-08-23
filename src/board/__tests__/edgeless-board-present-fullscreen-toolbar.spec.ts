// @vitest-environment happy-dom
//
// TDD tự động hoá kiểm tay cho khoá "Enter Full Screen"/"Exit Full Screen" (HANDOFF.md mục 21,
// nút toàn màn hình trên toolbar trình chiếu khung/frame) — một trong 12 khoá còn lại sau mục 23.
//
// Nguồn: `affine/blocks/frame/src/edgeless-toolbar/presentation-toolbar.ts:439-451` — nhãn
// `.tooltip` của `<edgeless-tool-icon-button>` đọc trực tiếp `document.fullscreenElement` (KHÔNG
// qua state nội bộ `_fullScreenMode`). `<presentation-toolbar>` chỉ được `EdgelessToolbarWidget`
// render khi `isPresentMode` (`edgeless-toolbar.ts:443-445`, `this.edgelessTool === 'frameNavigator'`
// — đúng `PresentTool.toolName`, `present-tool.ts:11`) — kích hoạt bằng ĐÚNG API công khai
// `gfx.tool.setTool(PresentTool, options)` (`framework/std/src/gfx/tool/tool-controller.ts:575-615`,
// cùng họ với kỹ thuật #1 vốn poke `currentToolName$`/`activate()` thủ công ở
// `note-interaction.ts:taoNoteQuaCongCuThat` — `setTool` là bản public, gọn hơn, làm đúng mọi bước
// đó cho ta). `EdgelessToolbarWidget` là `SignalWatcher` (`WidgetComponent` →
// `SignalWatcher(WithDisposable(LitElement))`, `widget-component.ts:17`) nên đọc
// `currentToolName$.value` trong `render()` tự re-render khi tool đổi — không cần tự gọi
// `requestUpdate()`.
//
// happy-dom KHÔNG cài Fullscreen API: `document.fullscreenElement` không tồn tại trên `Document`
// (chỉ có trên `ShadowRoot`, luôn `null` — đã kiểm bằng grep `node_modules/happy-dom/lib`),
// `Element.prototype.requestFullscreen`/`document.exitFullscreen` cũng không có. Hệ quả:
// `launchIntoFullscreen()` (gọi `element.requestFullscreen()` sau `if (element.requestFullscreen)`)
// tự lặng lẽ bỏ qua, KHÔNG throw — nhưng `document.fullscreenElement` cũng KHÔNG BAO GIỜ tự trở
// thành truthy qua hành động thật. Vì nhãn đọc THẲNG `document.fullscreenElement` (không qua state
// nội bộ), ca kiểm "Exit Full Screen" phải TỰ định nghĩa thuộc tính đó trước khi kích hoạt
// PresentTool (`Object.defineProperty(document, 'fullscreenElement', {value: ..., configurable:
// true})`) — an toàn vì thuộc tính này chưa từng tồn tại trên `Document`, không ghi đè accessor có
// sẵn nào.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PresentTool } from '@blocksuite/affine-block-frame'

import { moBangVaTaoNoteCoNoiDung } from './helpers/note-interaction'

type ToolLike = { setTool(ctor: unknown, options?: unknown): void }
type GfxLike = { tool: ToolLike }

/** Đệ quy xuyên light-DOM/shadow-DOM từ `document.body`, đọc `.tooltip` (thuộc tính Lit) của mọi
 * phần tử — cùng kỹ thuật đã dùng ở `edgeless-board-toolbar-translations.spec.ts`, chỉ đổi điểm
 * bắt đầu vì toolbar trình chiếu nằm SÂU hơn (edgeless-toolbar-widget → #shadow → presentation-toolbar
 * → #shadow → edgeless-tool-icon-button), không đáng viết riêng từng bước `querySelector`. */
function locTatCaTooltip(): string[] {
  const ket: string[] = []
  const di = (n: Element) => {
    const tip = (n as unknown as { tooltip?: unknown }).tooltip
    if (typeof tip === 'string' && tip) ket.push(tip)
    for (const c of n.children) di(c)
    if (n.shadowRoot) for (const c of n.shadowRoot.children) di(c)
  }
  for (const c of document.body.children) di(c)
  return ket
}

describe('EdgelessBoard — toolbar trình chiếu Enter/Exit Full Screen đã dịch tiếng Việt (HANDOFF mục 21)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    if (Object.prototype.hasOwnProperty.call(document, 'fullscreenElement')) {
      delete (document as unknown as Record<string, unknown>).fullscreenElement
    }
    document.querySelector('edgeless-toolbar-widget')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('kích hoạt trình chiếu (chưa toàn màn hình) → nút hiện "Vào toàn màn hình"', async () => {
    await moBangVaTaoNoteCoNoiDung(root, container, 'board-present-enter', 'hello')

    const rootEl = document.querySelector('drt-edgeless-root') as unknown as { gfx: GfxLike }

    await act(async () => {
      rootEl.gfx.tool.setTool(PresentTool, { mode: 'fit' })
      await vi.waitFor(() => {
        expect(locTatCaTooltip()).toContain('Vào toàn màn hình')
      })
    })

    const nhan = locTatCaTooltip()
    // Đối chứng: bản gốc tiếng Anh không còn xuất hiện, và trạng thái "đã toàn màn hình" không lộn
    // vào ca này.
    expect(nhan).not.toContain('Enter Full Screen')
    expect(nhan).not.toContain('Exit Full Screen')
    expect(nhan).not.toContain('Thoát toàn màn hình')
  })

  it('kích hoạt trình chiếu KHI đã toàn màn hình → nút hiện "Thoát toàn màn hình"', async () => {
    const fakeFullscreenEl = document.createElement('div')
    Object.defineProperty(document, 'fullscreenElement', {
      value: fakeFullscreenEl,
      configurable: true,
    })

    await moBangVaTaoNoteCoNoiDung(root, container, 'board-present-exit', 'hello')

    const rootEl = document.querySelector('drt-edgeless-root') as unknown as { gfx: GfxLike }

    await act(async () => {
      rootEl.gfx.tool.setTool(PresentTool, { mode: 'fit' })
      await vi.waitFor(() => {
        expect(locTatCaTooltip()).toContain('Thoát toàn màn hình')
      })
    })

    const nhan = locTatCaTooltip()
    expect(nhan).not.toContain('Enter Full Screen')
    expect(nhan).not.toContain('Exit Full Screen')
    expect(nhan).not.toContain('Vào toàn màn hình')
  })
})
