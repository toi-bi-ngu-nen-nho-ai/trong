// @vitest-environment happy-dom
//
// TDD tự động hoá kiểm tay cho khoá "Card view"/"Embed view"/"Inline view" (HANDOFF.md mục 21,
// toolbar Card/Embed/Inline view của tham chiếu inline) — một trong 12 khoá còn lại sau mục 23.
//
// Kỹ thuật MỚI so với ba kỹ thuật đã có: bơm thẳng `message$` — một signal RIÊNG cho toolbar phần
// tử inline (`ToolbarRegistryIdentifier.message$`, từ `@blocksuite/affine-shared/services`), KHÁC
// `flavour$`/`BlockSelection` mà kỹ thuật #2 (edgeless-board-toolbar-translations.spec.ts) tra.
// Điều tra ở HANDOFF.md mục 23 Phần 4 dừng lại đúng chỗ "cần tìm `message$` được set ở đâu" — tìm
// thấy ở `affine/inlines/reference/src/reference-node/reference-node.ts:162-182`
// (`_whenHover` callback, chạy khi hover chuột THẬT) VÀ ở
// `affine/shared/src/services/toolbar-service/registry.ts:31-35` (định nghĩa `message$` — một
// signal THƯỜNG, `@preact/signals-core`, đọc/ghi qua `.value` như mọi signal khác trong dự án).
// `affine/shared/src/services/toolbar-service/context.ts:130-132` xác nhận `ctx.message$` (đọc bởi
// mọi action trong `reference-node/configs/toolbar.ts`) chính là CÙNG MỘT object — không có tầng
// bọc nào khác. Nghĩa là set `message$.value = {flavour, element, setFloating}` bằng code test
// THẲNG (không qua `_whenHover`/pointer hover thật) kích hoạt ĐÚNG same code path mà
// `affine/widgets/toolbar/src/toolbar.ts:693-723` lắng nghe (`message$.subscribe(...)`) — cùng tinh
// thần với kỹ thuật #2 (set trực tiếp qua API công khai, né Range/pointer thật), chỉ khác signal
// đích.
//
// `element` trong message phải là một `AffineReference` (`<drt-reference>`) THẬT — mọi action của
// nhóm "c.conversions" (`reference-node/configs/toolbar.ts:29-247`) đều gate bằng
// `target instanceof AffineReference`. Dựng bằng cách chèn một delta có `attributes.reference =
// {type:'LinkedPage', pageId}` qua `insertText` (đúng API production, xem
// `affine/inlines/reference/src/inline-spec.ts` — schema chỉ đòi `pageId: string`, không cần tài
// liệu đích tồn tại thật, `AffineReference` tự xử lý "refMeta undefined" cho tài liệu đã xoá/không
// có — `reference-node.ts:75-93`). REFERENCE_NODE (`affine/shared/src/consts/text.ts`) là ký tự
// production dùng để chèn ("một dấu cách") — dùng lại đúng ký tự đó để khớp hành vi thật, tránh
// console.error vô hại "Reference node must be initialized with..." (không chặn test, chỉ dọn log).
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ToolbarRegistryIdentifier } from '@blocksuite/affine-shared/services'

import { moBangVaTaoNoteCoNoiDung } from './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

type ToolbarMessage = {
  flavour: string
  element: Element
  setFloating: (element?: Element) => void
} | null
type ToolbarRegistryLike = { message$: { value: ToolbarMessage } }
type StdLike = { get(id: unknown): ToolbarRegistryLike }
type InlineEditorVoiThuocTinh = {
  insertText(range: { index: number; length: number }, text: string, attributes?: Record<string, unknown>): void
}

/**
 * Đọc nhãn hiển thị của mọi phần tử trong toolbar đang mở — cùng phép đệ quy xuyên light-DOM/
 * shadow-DOM đã dùng ở `edgeless-board-toolbar-translations.spec.ts` (`locTooltipToolbar`), mở rộng
 * thêm `aria-label`: nhóm "Card/Embed/Inline view" hiển thị nhãn qua
 * `<editor-menu-action aria-label="...">` (`affine/components/src/view-dropdown-menu/
 * dropdown-menu.ts:62-74`, LUÔN có mặt trong cây — không cần bấm mở dropdown thật, giống lý do
 * `.tooltip` đọc được mà không cần hover-popup thật composite), không phải thuộc tính `.tooltip`
 * của nút đơn.
 */
function locNhanToolbar(): string[] {
  const widget = document.querySelector('drt-toolbar-widget') as HTMLElement | null
  const toolbar = widget?.shadowRoot?.querySelector('editor-toolbar')
  if (!toolbar) return []
  const ket: string[] = []
  const di = (n: Element) => {
    const tip = (n as unknown as { tooltip?: unknown }).tooltip
    if (typeof tip === 'string' && tip) ket.push(tip)
    const ariaLabel = n.getAttribute('aria-label')
    if (ariaLabel) ket.push(ariaLabel)
    for (const c of n.children) di(c)
    if (n.shadowRoot) for (const c of n.shadowRoot.children) di(c)
  }
  di(toolbar)
  return ket
}

describe('EdgelessBoard — toolbar Card/Embed/Inline view của tham chiếu đã dịch tiếng Việt (HANDOFF mục 21)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    document.querySelector('drt-toolbar-widget')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('hover tham chiếu trong Note → toolbar hiện Xem dạng dòng/Xem dạng thẻ/Xem dạng nhúng', async () => {
    const { ie } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-reference-toolbar', 'hello')

    await act(async () => {
      ;(ie as unknown as InlineEditorVoiThuocTinh).insertText({ index: 5, length: 0 }, ' ', {
        reference: { type: 'LinkedPage', pageId: 'lien-ket-gia' },
      })
      await choDom(() => {
        expect(document.querySelector('drt-reference')).not.toBeNull()
      })
    })

    const refEl = document.querySelector('drt-reference') as Element
    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }
    const registry = eh.std.get(ToolbarRegistryIdentifier)

    await act(async () => {
      registry.message$.value = { flavour: 'affine:reference', element: refEl, setFloating: () => {} }
      await choDom(() => {
        expect(document.querySelector('drt-toolbar-widget')).not.toBeNull()
      })
      await choDom(() => {
        expect(locNhanToolbar().length).toBeGreaterThan(0)
      })
    })

    const nhan = locNhanToolbar()
    expect(nhan).toContain('Xem dạng dòng')
    expect(nhan).toContain('Xem dạng thẻ')
    expect(nhan).toContain('Xem dạng nhúng')

    // Đối chứng: bản gốc tiếng Anh không còn xuất hiện — nếu bản dịch bị gỡ khỏi vi.json âm thầm,
    // ca này phải đỏ chứ không phải xanh giả.
    expect(nhan).not.toContain('Inline view')
    expect(nhan).not.toContain('Card view')
    expect(nhan).not.toContain('Embed view')
  })
})
