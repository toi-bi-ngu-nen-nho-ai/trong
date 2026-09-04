// @vitest-environment happy-dom
//
// Nút "Liên kết" trong menu Ghi chú trên bảng vẽ — khoản nợ §1.1 DUY NHẤT còn lại của HANDOFF.md.
//
// LỖI GỐC: `affine/gfx/note/src/toolbar/note-menu.ts:68-71` bấm nút thì chạy
// `insertLinkByQuickSearchCommand`. Dòng đầu của lệnh đó
// (`blocks/bookmark/src/commands/insert-link-by-quick-search.ts:22-25`):
// `const s = std.getOptional(QuickSearchProvider); if (!s) return` — thoát im lặng, KHÔNG gọi
// `next()`, nên `insertedLinkType` là `undefined` và `?.then` ở note-menu.ts thành no-op. Bấm nút
// không có phản hồi nào. `QuickSearchProvider` là service APP CHỦ phải cấp; dự án này chưa cấp.
//
// Cùng lớp với `ViewportElementProvider` (Task 1) và `VirtualKeyboardProvider` (task 14).
//
// PHẠM VI: chỉ edgeless. Nút sống trong `note-menu.ts` và dùng `this.edgeless.service.std`; quét cả
// cây vendored thì `QuickSearchProvider` có ĐÚNG MỘT bên tiêu thụ là lệnh nói trên. Đăng ký thêm
// cho chế độ trang là mở rộng diện rủi ro cho thứ không ai gọi — ca cuối canh điều đó.
import 'fake-indexeddb/auto'

import { QuickSearchProvider } from '@blocksuite/affine-shared/services'
import { BlockStdScope } from '@blocksuite/affine/std'
import { render as litRender } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { layExtensionsEdgeless, layExtensionsTrang } from '../extensions'
import { taoHoacMoDoc } from '../mo-doc'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

// Ngữ cảnh 2D chế tay — happy-dom trả `null`; cùng lý do đã ghi ở `trang-mount.spec.ts`.
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

let el: HTMLDivElement

beforeEach(() => {
  el = document.createElement('div')
  // Lớp bọc mà `ViewportElementProvider` tìm bằng `closest()` — thiếu nó thì getter ném BẤT ĐỒNG BỘ
  // trong `firstUpdated()` và vitest trả exit 1 dù mọi expect đều xanh (xem trang-mount.spec.ts).
  el.className = 'drt-edgeless-viewport'
  document.body.append(el)
})

afterEach(() => {
  litRender(null, el)
  el.remove()
  // Modal gắn vào document.body, ngoài `el` — dọn tay để ca sau không thấy rác của ca trước.
  document.querySelectorAll('embed-card-create-modal').forEach((n) => n.remove())
})

/** Dựng một cây edgeless thật rồi trả `std` của nó. */
async function dungEdgeless(id: string) {
  const { store, workspace } = await taoHoacMoDoc(id, 'so-do')
  const std = new BlockStdScope({ store, extensions: layExtensionsEdgeless() })
  litRender(std.render(), el)
  await choDom(() => expect(el.querySelector('drt-edgeless-root')).not.toBeNull())
  return { std, workspace }
}

/** Modal do `openQuickSearch()` gắn vào body. Kiểu lỏng: ta chỉ chạm hai thứ của nó. */
type ModalGia = HTMLElement & {
  createOptions: { mode: 'edgeless'; onSave: (url: string) => void }
}

async function doiModal(): Promise<ModalGia> {
  return await choDom(() => {
    const m = document.querySelector('embed-card-create-modal')
    expect(m, 'modal phải được gắn vào document.body').not.toBeNull()
    // Ép qua `unknown`: `EmbedCardCreateModal` kế thừa `ShadowlessElement` của cây vendored, kiểu
    // ấy không phân giải ra `HTMLElement` trong ngữ cảnh app (xem chú thích cùng nội dung trong
    // ../tim-nhanh-lien-ket.ts). Lúc chạy nó vẫn là custom element thật.
    return m as unknown as ModalGia
  })
}

describe('QuickSearchProvider — nút "Liên kết" trên bảng vẽ', () => {
  it('container edgeless phân giải được QuickSearchProvider (không còn thoát im lặng)', async () => {
    const { std, workspace } = await dungEdgeless('lien-ket-1')

    // `getOptional` chứ không `get`: đây chính là lời gọi mà lệnh thượng nguồn thực hiện, và
    // thiếu đăng ký ở đây LÀ lỗi gốc — lệnh `return` ngay, không ai biết.
    //
    // `?? null` KHÔNG thừa: khi chưa đăng ký, `getOptional` trả `undefined`, mà
    // `expect(undefined).not.toBeNull()` XANH — ca này từng xanh giả ở lượt chứng minh đỏ (2/4 xanh
    // trong khi đáng lẽ 3/4 phải đỏ). Chuẩn hoá về `null` rồi mới khẳng định.
    expect(std.getOptional(QuickSearchProvider) ?? null).not.toBeNull()

    workspace.forceStop()
  })

  it('huỷ modal (đóng mà không lưu) resolve null — KHÔNG treo', async () => {
    const { std, workspace } = await dungEdgeless('lien-ket-2')
    const dichVu = std.get(QuickSearchProvider)

    const cho = dichVu.openQuickSearch()
    const modal = await doiModal()

    // Đây là ca kiểm QUAN TRỌNG NHẤT của tệp. Modal thượng nguồn có BA đường thoát
    // (embed-card-create-modal.ts): bấm nền `_onCancel`, phím Escape, và xác nhận `_onConfirm` —
    // hai đường đầu chỉ gọi `this.remove()` và KHÔNG gọi `onConfirm`. Nghĩa là dùng thẳng
    // `toggleEmbedCardCreateModal()` của thượng nguồn thì promise của nó KHÔNG BAO GIỜ resolve khi
    // người dùng huỷ — đổi một lỗi im lặng lấy một promise treo vĩnh viễn. Bản vá móc vào
    // `remove()`, điểm chung của cả ba đường, nên huỷ phải resolve `null`.
    modal.remove()

    await expect(cho).resolves.toBeNull()

    workspace.forceStop()
  })

  it('lưu URL rồi đóng → resolve { externalUrl }', async () => {
    const { std, workspace } = await dungEdgeless('lien-ket-3')
    const dichVu = std.get(QuickSearchProvider)

    const cho = dichVu.openQuickSearch()
    const modal = await doiModal()

    // Gọi thẳng `onSave` rồi `remove()` — đúng thứ tự `_onConfirm` của thượng nguồn làm
    // (onSave → onConfirm → remove). Không bấm nút thật vì làm thế là kiểm `isValidUrl` và bố cục
    // Lit của thượng nguồn, không phải kiểm phần nối của mình.
    modal.createOptions.onSave('https://vd.test/bai-bao')
    modal.remove()

    await expect(cho).resolves.toEqual({ externalUrl: 'https://vd.test/bai-bao' })

    workspace.forceStop()
  })

  it('chế độ trang KHÔNG đăng ký — bản vá đúng phạm vi', async () => {
    const { store, workspace } = await taoHoacMoDoc('lien-ket-4', 'bai-viet')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })

    // Nút "Liên kết" chỉ có trong thanh công cụ Ghi chú của edgeless. Nhét provider vào bộ trang là
    // đăng ký một service không ai gọi — ca này đỏ nếu ai đó làm thế.
    expect(std.getOptional(QuickSearchProvider) ?? null).toBeNull()

    workspace.forceStop()
  })
})
