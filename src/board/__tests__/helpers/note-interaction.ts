// Hạ tầng kiểm tự động DÙNG CHUNG cho các mục kiểm tay bắt buộc ở spec §7 của
// docs/superpowers/plans/2026-08-21-database-note-day-du.md (Step 2-6) — tách từ kỹ thuật đã kiểm
// chứng lần đầu khi tự động hoá Step 2 (xem .superpowers/sdd/2026-08-21-database-note-day-du/
// progress.md, mục "Step 2 tự động hoá được bằng TDD"), để Step 3 trở đi không chép tay lại.
//
// KHÔNG kiểm được các mục này qua Browser pane tự động: con trỏ văn bản thật cần native
// Selection/Range, mà đặt Selection/Range từ TOẠ ĐỘ CHUỘT cần hit-testing thật từ compositing —
// Browser pane không compositing khi không có người xem trực tiếp. Né đúng vấn đề đó bằng cách chạy
// trong happy-dom (mỗi file test import module này PHẢI tự khai `// @vitest-environment happy-dom`
// ở đầu file — pragma đó áp theo từng file, không truyền qua được từ đây): dựng Selection/Range trực
// tiếp trên node văn bản bằng API DOM thuần, rồi để ĐÚNG cơ chế production tự xử lý sự kiện
// `beforeinput`/`pointerdown`/`pointerup` như thao tác thật — không tự tay giả lập kết quả cuối.
import 'fake-indexeddb/auto'

import { act } from 'react'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { expect, vi } from 'vitest'

import { EdgelessBoard } from '../../EdgelessBoard'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Giống hệt edgeless-board-mount.spec.ts — proxy ngữ cảnh canvas giả (happy-dom không cài
// CanvasRenderingContext2D thật; mã sản phẩm chỉ cần gọi được, không cần vẽ được).
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

// happy-dom chưa cài `InputEvent.getTargetRanges()` (Input Events Level 2). `services/event.ts`
// gọi thẳng nó không kiểm tồn tại trước — thiếu polyfill này thì MỌI sự kiện `beforeinput` ném
// TypeError giữa chừng xử lý. Trả mảng rỗng đúng hành vi trình duyệt thật khi không có target range.
if (!('getTargetRanges' in InputEvent.prototype)) {
  ;(InputEvent.prototype as unknown as { getTargetRanges(): unknown[] }).getTargetRanges = () => []
}

// Kiểu tối thiểu cho phần API nội bộ mà các ca kiểm này cần chạm tới trực tiếp (đúng kỹ thuật đã
// kiểm chứng bằng tay trên trình duyệt thật) — không có kiểu công khai cho các API này.
export type ToolLike = {
  currentToolName$: { value: string }
  currentTool$: { peek(): { activatedOption: unknown; activate(opt: unknown): void } | undefined }
}
export type GfxLike = { tool: ToolLike }
export type InlineEditorLike = {
  insertText(range: { index: number; length: number }, text: string): void
}

export async function taoNoteQuaCongCuThat(container: HTMLDivElement) {
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

// Đặt Selection/Range THẬT ở CUỐI đoạn văn — thay cho một cú click chuột thật (đòi hit-testing từ
// toạ độ, thứ Browser pane tự động không cấp được). `RangeManager.value` đọc `document.getSelection()`
// THẬT, và `isActiveInEditor()` đòi `document.activeElement` nằm trong `<editor-host>` — cả hai đều
// là API DOM thuần mà happy-dom hỗ trợ đầy đủ, không cần compositing.
export function datConTroCuoiDoanVan(inlineEl: HTMLElement) {
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

/**
 * Dựng bảng, tạo một Note qua công cụ toolbar thật, gõ `vanBan` (chèn thẳng qua Y.Text — happy-dom
 * không có bàn phím thật để gõ từng phím, giống các ca kiểm khác trong dự án), rồi đặt Selection/
 * Range thật ở cuối đoạn văn và xác nhận `std.selection` đã có text selection đang hoạt động —
 * đúng tiền điều kiện mà `getSelectedModelsCommand` (dùng bởi Database/định dạng inline) cần.
 */
export async function moBangVaTaoNoteCoNoiDung(
  root: Root,
  container: HTMLDivElement,
  boardId: string,
  vanBan: string,
) {
  await act(async () => {
    root.render(createElement(EdgelessBoard, { boardId }))
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
    ie.insertText({ index: 0, length: 0 }, vanBan)
    await vi.waitFor(() => {
      const vText = document.querySelector('[data-v-text]')
      expect(vText?.textContent).toBe(vanBan)
    })

    datConTroCuoiDoanVan(inlineEl)
    await vi.waitFor(() => {
      const eh = document.querySelector('editor-host') as unknown as {
        std: { selection: { value: Array<{ type: string }> } }
      }
      expect(eh.std.selection.value.some((s) => s.type === 'text')).toBe(true)
    })
  })

  return { inlineEl, ie }
}

/** Gõ `/` (đi qua ĐÚNG đường sự kiện `beforeinput` thật) và đợi SlashMenu build xong. */
export async function moSlashMenuTuNote(inlineEl: HTMLElement) {
  await act(async () => {
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

  return document.querySelector('drt-slash-menu') as unknown as {
    items: Array<{ name: string; action: (ctx: unknown) => void }>
    _handleClickItem: (item: { name: string; action: (ctx: unknown) => void }) => void
  }
}
