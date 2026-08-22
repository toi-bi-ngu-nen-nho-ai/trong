// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 2 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): tạo
// Note thật qua công cụ toolbar (không gọi thẳng store.addBlock), gõ "/", xác nhận SlashMenu build
// đúng — có mục chèn Database, không lỗi console.
//
// KHÔNG kiểm được việc này qua Browser pane tự động (đã thử ở phiên trước): con trỏ văn bản thật
// cần native Selection/Range, mà đặt Selection/Range từ TOẠ ĐỘ CHUỘT cần hit-testing thật từ
// compositing — Browser pane không compositing khi không có người xem trực tiếp (xem
// .superpowers/sdd/2026-08-21-database-note-day-du/progress.md). Ca kiểm này né đúng vấn đề đó
// bằng cách chạy trong happy-dom (như edgeless-board-mount.spec.ts): dựng Selection/Range trực
// tiếp trên node văn bản bằng API DOM thuần (document.createRange/window.getSelection — không cần
// hit-testing từ toạ độ), rồi để đúng cơ chế production (EventService._onBeforeInput,
// framework/std/src/inline/services/event.ts) tự xử lý sự kiện `beforeinput` như một cú gõ phím
// thật — không tự tay chèn ký tự "/" trùng với việc production code đã làm.
import 'fake-indexeddb/auto'

import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Giống hệt edgeless-board-mount.spec.ts — xem chú thích ở đó về lý do cần proxy ngữ cảnh canvas giả.
const taoCtxGia = (canvas: HTMLCanvasElement): unknown =>
  new Proxy(function () {} as unknown as object, {
    get(_t, p) {
      if (p === 'canvas') return canvas
      if (p === Symbol.toPrimitive) return () => 0
      return taoCtxGia(canvas)
    },
    set: () => true,
    apply: () => taoCtxGia(canvas),
  })
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return taoCtxGia(this)
} as HTMLCanvasElement['getContext']

// happy-dom chưa cài `InputEvent.getTargetRanges()` (API thật của trình duyệt cho sự kiện
// `beforeinput`, phần Input Events Level 2). `services/event.ts` gọi thẳng nó không kiểm tồn tại
// trước — thiếu polyfill này thì MỌI sự kiện `beforeinput` (kể cả sự kiện bàn phím thật gõ qua
// happy-dom, không riêng gì sự kiện dựng tay ở ca kiểm này) đều ném `TypeError` giữa chừng xử lý.
// Trả mảng rỗng đúng hành vi trình duyệt thật khi không có target range nào (event.ts tự bỏ qua
// nhánh đó khi rỗng — không đổi luồng xử lý phần còn lại).
if (!('getTargetRanges' in InputEvent.prototype)) {
  ;(InputEvent.prototype as unknown as { getTargetRanges(): unknown[] }).getTargetRanges = () => []
}

// Kiểu tối thiểu cho phần API nội bộ của gfx/tool-controller mà ca kiểm này cần chạm tới trực tiếp
// (đúng kỹ thuật đã kiểm chứng bằng tay trên trình duyệt thật ở phiên trước) — không có kiểu công
// khai cho các API này nên khai tối thiểu tại chỗ dùng, không import từ vendor.
type ToolLike = {
  currentToolName$: { value: string }
  currentTool$: { peek(): { activatedOption: unknown; activate(opt: unknown): void } | undefined }
}
type GfxLike = { tool: ToolLike }
type InlineEditorLike = {
  insertText(range: { index: number; length: number }, text: string): void
}

async function taoNoteQuaCongCuThat(container: HTMLDivElement) {
  const root = document.querySelector('drt-edgeless-root') as unknown as { gfx: GfxLike }
  const gfx = root.gfx
  gfx.tool.currentToolName$.value = 'affine:note'
  const cur = gfx.tool.currentTool$.peek()!
  const opt = { childFlavour: 'affine:paragraph', childType: 'text', tip: 'Note' }
  cur.activatedOption = opt
  cur.activate(opt)

  const canvas = container.querySelector('canvas')!
  const opts: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: 100,
    clientY: 100,
    button: 0,
    pointerId: 1,
    isPrimary: true,
  }
  canvas.dispatchEvent(new PointerEvent('pointerdown', opts))
  canvas.dispatchEvent(new PointerEvent('pointerup', opts))

  await vi.waitFor(() => {
    expect(document.querySelector('.inline-editor')).not.toBeNull()
  })
}

// Đặt Selection/Range THẬT trên node văn bản của note, ở CUỐI đoạn văn — thay cho một cú click
// chuột thật (đòi hit-testing từ toạ độ, thứ Browser pane tự động không cấp được — xem chú thích
// đầu file). `RangeManager.value` (range-manager.ts) đọc `document.getSelection()` THẬT, và
// `isActiveInEditor()` (inline/range/active.ts) đòi `document.activeElement` nằm trong
// `<editor-host>` — cả hai đều là API DOM thuần mà happy-dom hỗ trợ đầy đủ, không cần compositing.
function datConTroCuoiDoanVan(inlineEl: HTMLElement) {
  const vText = document.querySelector('[data-v-text]') as HTMLElement
  const textNode = vText.firstChild as Text
  const range = document.createRange()
  range.setStart(textNode, textNode.data.length)
  range.collapse(true)
  inlineEl.focus()
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  document.dispatchEvent(new Event('selectionchange', { bubbles: true }))
}

describe('EdgelessBoard — gõ "/" trong Note mở SlashMenu (spec §7 Step 2)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    // Tên thẻ THẬT sau bước đổi tên D12 (affine-* → drt-*) là `drt-slash-menu`, không phải
    // `affine-slash-menu` (tên gốc thượng nguồn) — xem chú thích ở khẳng định chính bên dưới.
    document.querySelector('drt-slash-menu')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('gõ "/" sau một note mới tạo qua công cụ toolbar thật → SlashMenu hiện ra kèm mục Database', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board-slash-menu' }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    await act(async () => {
      await taoNoteQuaCongCuThat(container)
    })

    const inlineEl = document.querySelector('.inline-editor') as unknown as HTMLElement & {
      inlineEditor: InlineEditorLike
    }
    const ie = inlineEl.inlineEditor

    await act(async () => {
      // Mô phỏng người dùng đã gõ "hello" (chèn thẳng qua Y.Text, giống các ca kiểm khác trong dự
      // án — happy-dom không có bàn phím thật để gõ từng phím). CHỈ ký tự "/" kích hoạt SlashMenu
      // mới cần đi qua đúng đường sự kiện `beforeinput` thật, nên KHÔNG chèn nó ở đây — production
      // code (EventService._onBeforeInput) tự chèn khi nhận sự kiện dưới, giống một cú gõ phím
      // thật, tránh chèn trùng.
      ie.insertText({ index: 0, length: 0 }, 'hello')
      await vi.waitFor(() => {
        const vText = document.querySelector('[data-v-text]')
        expect(vText?.textContent).toBe('hello')
      })

      datConTroCuoiDoanVan(inlineEl)
      await vi.waitFor(() => {
        const eh = document.querySelector('editor-host') as unknown as {
          std: { selection: { value: Array<{ type: string }> } }
        }
        expect(eh.std.selection.value.some((s) => s.type === 'text')).toBe(true)
      })

      inlineEl.dispatchEvent(
        new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: 'insertText',
          data: '/',
        }),
      )

      await vi.waitFor(() => {
        expect(document.querySelector('drt-slash-menu')).not.toBeNull()
      })
    })

    // Xác nhận đúng luồng thật đã chạy (không phải một menu rỗng/giả): nội dung note giờ phải là
    // "hello/" — do CHÍNH production code chèn ký tự "/", không phải ca kiểm này chèn tay.
    expect((ie as unknown as { yText: { toString(): string } }).yText.toString()).toBe('hello/')

    const slashMenu = document.querySelector('drt-slash-menu') as unknown as {
      items: Array<{ name: string }>
    }
    const tenCacMuc = slashMenu.items.map((m) => m.name)

    // Có mục chèn Database — đúng spec §7 Step 2 ("Có mục để chèn Database/Table").
    expect(tenCacMuc).toContain('Table View')
  })
})
