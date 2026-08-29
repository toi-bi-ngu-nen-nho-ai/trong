// @vitest-environment happy-dom
//
// TDD tự động hoá bước "kiểm tay trên trình duyệt thật" mà mục 21/22 của HANDOFF.md không làm được
// (Browser pane không compositing khi phiên không có người theo dõi trực tiếp — canvas/gfx-viewport
// tạm dừng render, xem chi tiết ở HANDOFF.md mục 21-22). Thay kiểm tay bằng kiểm tự động qua ĐÚNG
// API công khai của production, cùng kỹ thuật đã chứng minh hoạt động ở note-interaction.ts.
//
// Phạm vi: 6/7 khoá dịch mới của chặng "Bật 4 ViewExtension + dịch nốt 7 chuỗi" (HANDOFF.md mục
// 22): Align center/left/right, Download (qua toolbar khối ảnh) — và Attachment, Edgeless (qua
// caption tooltip của SlashMenu). "More" KHÔNG kiểm ở đây — mục 22 đo NHẦM gói lúc soạn spec (đúng
// ra thuộc `affine/blocks/code/src/code-toolbar/`, không phải `affine/blocks/image/`); toolbar đó
// dùng `HoverController` (index.ts:32-60), cơ chế trigger KHÁC HẲN `BlockSelection` — cần điều tra
// riêng. 15 khoá còn lại của mục 21 (Card/Embed/Inline view, Create Linked Doc, Enter/Exit Full
// Screen, các toast tải ảnh, Headings 4-6, placeholder Note trống) cần hạ tầng kiểm khác (reference
// toolbar, root toolbar, frame presentation state, rich-text conversion config, note-menu config)
// — CHƯA làm ở đây, xem HANDOFF.md mục 23 phần "còn nợ" để biết vì sao.
//
// Kỹ thuật MỚI so với note-interaction.ts: chọn một BLOCK (không phải text) để toolbar nổi lên —
// dùng `BlockSelection` (từ `@blocksuite/std`, cùng nơi `TextSelection` đến), set trực tiếp qua API
// công khai `std.selection.create(BlockSelection, {blockId})` + `setGroup('note', [...])`, GIỐNG
// HỆT cách `chonDoanVanTrucTiep` set TextSelection — không cần Range/pointer thật.
//
// Toolbar thật là `<drt-toolbar-widget>` (tên gốc thượng nguồn `affine-toolbar-widget`, đổi qua D11
// — `editor-toolbar` bên trong KHÔNG đổi vì không có tiền tố `affine-`) có SHADOW DOM riêng
// (LitElement thường, không phải ShadowlessElement) — querySelector PHẲNG (không
// qua shadowRoot) sẽ luôn thấy null dù mọi thứ chạy đúng. Action button có `.tooltip` là THUỘC TÍNH
// Lit (property binding `.tooltip=${...}`), đọc được trực tiếp qua `el.tooltip`, không cần tooltip
// (hover-popup) THẬT sự composite — đúng lý do kỹ thuật này né được giới hạn floating-ui/positioning
// dưới happy-dom (feature-detect ResizeObserver/IntersectionObserver, không throw, chỉ định vị sai
// — nội dung vẫn render đúng, xem điều tra đầy đủ trước khi viết file này).
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BlockSelection } from '@blocksuite/std'

import { moBangVaTaoNoteCoNoiDung, moSlashMenuTuNote } from './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

type BlockModelLike = { id: string; flavour: string }
type StoreLike = {
  root: (BlockModelLike & { children: BlockModelLike[] }) | null
  addBlock(flavour: string, props: Record<string, unknown>, parent: string): string
}
type StdLike = {
  store: StoreLike
  selection: {
    create(ctor: unknown, props: unknown): unknown
    setGroup(group: string, selections: unknown[]): void
  }
}

/** Đọc `.tooltip` (thuộc tính Lit) của mọi phần tử action-button trong toolbar đang mở. */
function locTooltipToolbar(): string[] {
  const widget = document.querySelector('drt-toolbar-widget') as HTMLElement | null
  const toolbar = widget?.shadowRoot?.querySelector('editor-toolbar')
  if (!toolbar) return []
  const ket: string[] = []
  const di = (n: Element) => {
    const tip = (n as unknown as { tooltip?: unknown }).tooltip
    if (typeof tip === 'string' && tip) ket.push(tip)
    for (const c of n.children) di(c)
    if (n.shadowRoot) for (const c of n.shadowRoot.children) di(c)
  }
  di(toolbar)
  return ket
}

describe('EdgelessBoard — toolbar khối ảnh + caption SlashMenu đã dịch tiếng Việt (HANDOFF mục 22)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    document.querySelector('drt-slash-menu')?.remove()
    document.querySelector('drt-toolbar-widget')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('chọn khối ảnh trong Note → toolbar hiện Căn giữa/Căn trái/Căn phải/Tải xuống', async () => {
    await moBangVaTaoNoteCoNoiDung(root, container, 'board-toolbar-image', 'hello')

    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }
    const { std } = eh
    const noteRef = std.store.root!.children.find((c) => c.flavour === 'affine:note')!

    // Ảnh KHÔNG cần blob/sourceId thật để hợp lệ — defaultImageProps chấp sourceId rỗng
    // (affine/model/src/blocks/image/image-model.ts), toolbar chỉ cần model tồn tại trong Note.
    const imageId = std.store.addBlock('affine:image', {}, noteRef.id)

    await act(async () => {
      const sel = std.selection.create(BlockSelection, { blockId: imageId })
      std.selection.setGroup('note', [sel])
      await choDom(() => {
        expect(document.querySelector('drt-toolbar-widget')).not.toBeNull()
      })
      await choDom(() => {
        expect(locTooltipToolbar().length).toBeGreaterThan(0)
      })
    })

    const tooltips = locTooltipToolbar()
    expect(tooltips).toContain('Căn giữa')
    expect(tooltips).toContain('Căn trái')
    expect(tooltips).toContain('Căn phải')
    expect(tooltips).toContain('Tải xuống')
    // "Thêm" (More) KHÔNG kiểm ở đây — đo sai gói lúc soạn spec mục 22 (đúng ra thuộc
    // affine/blocks/code/src/code-toolbar/, không phải affine/blocks/image/). Toolbar đó dùng
    // HoverController (affine/blocks/code/src/code-toolbar/index.ts:32-60), một cơ chế trigger
    // KHÁC HẲN BlockSelection — cần điều tra riêng, chưa làm ở đây.

    // Đối chứng: bản gốc tiếng Anh KHÔNG còn xuất hiện ở đúng những vị trí đã dịch — nếu bản dịch
    // bị gỡ khỏi vi.json một cách âm thầm, ca này phải đỏ chứ không phải xanh giả vì tìm nhầm chuỗi
    // khác chứa "Download" (không có chuỗi nào khác trong toolbar này chứa nó).
    expect(tooltips).not.toContain('Download')
    expect(tooltips).not.toContain('Align center')
  })

  it('mở SlashMenu → caption Attachment/Mind Map đã dịch (Tệp đính kèm/Tự do)', async () => {
    const { inlineEl } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-toolbar-slashmenu', 'hello')
    const slashMenu = await moSlashMenuTuNote(inlineEl)

    type ItemVoiTooltip = { name: string; tooltip?: { caption?: string } }
    const items = slashMenu.items as unknown as ItemVoiTooltip[]

    const attachment = items.find((i) => i.name === 'Attachment')
    expect(attachment?.tooltip?.caption).toBe('Tệp đính kèm')

    const mindMap = items.find((i) => i.name === 'Mind Map')
    expect(mindMap?.tooltip?.caption).toBe('Tự do')
  })
})
