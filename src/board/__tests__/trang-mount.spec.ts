// @vitest-environment happy-dom
//
// CỔNG CHẶN của cả chặng "kho bài viết page mode". Trả lời đúng một câu hỏi: cây BlockSuite
// vendored có mount được ở CHẾ ĐỘ TRANG không, hay `viewManager.get('page')` chỉ đúng trên giấy?
//
// Chỉ thị `@vitest-environment happy-dom` ở dòng đầu: environment mặc định của dự án là 'node'
// (vite.config.ts) và mọi thứ chạm DOM sẽ đâm `DOMRect is not defined`. Cùng lý do đã ghi ở
// edgeless-board-mount.spec.ts.
import 'fake-indexeddb/auto'

import { BlockStdScope } from '@blocksuite/affine/std'
import { render as litRender } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { layExtensionsTrang } from '../EdgelessBoard'
import { taoHoacMoBang } from '../mo-doc'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

// Ngữ cảnh 2D của <canvas> phải chế tay — happy-dom trả `null` từ `getContext('2d')`, và một khối
// surface (ta VẪN seed nó, xem spec §3.3) sẽ ném lỗi BẤT ĐỒNG BỘ sau khi ca kiểm đã xong, khiến
// vitest trả exit code 1 dù mọi expect đều xanh. Chép nguyên cơ chế từ edgeless-board-mount.spec.ts
// — nếu chạy thấy thừa (page mode không render surface) thì gỡ ở lượt dọn sau, đừng gỡ mò lúc này.
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
  // Lớp `drt-page-viewport`: `PageRootBlockComponent._initViewportResizeEffect` (firstUpdated) đọc
  // `this.viewport`, tức `ViewportElementProvider.get()`, mà chuỗi cài đặt trong view.ts đăng ký
  // bằng `ViewportElementExtension('.drt-page-viewport')` (đã đổi tên từ `.affine-page-viewport`,
  // xem .vendor-build/affine/blocks/root/src/view.js) — bên trong dùng `std.host.closest(selector)`
  // để tìm TỔ TIÊN mang đúng lớp này. Thiếu nó thì getter ném `BlockSuiteError: viewport element is
  // not found` NGAY TRONG `firstUpdated()`, một chỗ Lit không bắt lỗi đồng bộ mà để rơi thành
  // unhandled rejection — cả ba ca kiểm trong file này vẫn PASS (lỗi xảy ra sau khi expect đã xong)
  // nhưng vitest đếm nó vào "unhandled errors" và trả exit code 1 cho CẢ LƯỢT CHẠY, y hệt lớp lỗi
  // canvas đã ghi ở đầu file. `EdgelessBoard.tsx` tự bọc hostRef trong một div lớp
  // `drt-edgeless-viewport` cho đúng lý do này ở chế độ edgeless; ở đây mô phỏng lại tối thiểu cho
  // chế độ trang bằng cách gắn thẳng lớp lên `el` (test không cần một lớp bọc riêng).
  el.className = 'drt-page-viewport'
  document.body.append(el)
})

afterEach(() => {
  litRender(null, el)
  el.remove()
})

describe('mount chế độ trang', () => {
  it('dựng được thẻ gốc drt-page-root', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-1')
    // Page mode cần một note để có chỗ gõ. `taoHoacMoBang` hiện chỉ seed page+surface (Task 7 mới
    // thêm nhánh theo loại), nên ca kiểm này tự thêm — đúng tinh thần spike: chứng minh khả năng,
    // chưa đụng vào hàm dùng chung.
    const rootId = store.root!.id
    const noteId = store.addBlock('affine:note', {}, rootId)
    store.addBlock('affine:paragraph', {}, noteId)

    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    // `drt-` là tiền tố sau bước đổi tên vendor (scripts/doi-ten-vendor.mjs); thượng nguồn viết
    // `affine-page-root`.
    await choDom(() => expect(el.querySelector('drt-page-root')).not.toBeNull())

    workspace.forceStop()
  })

  it('đoạn văn trong note soạn thảo được', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-2')
    const rootId = store.root!.id
    const noteId = store.addBlock('affine:note', {}, rootId)
    store.addBlock('affine:paragraph', {}, noteId)

    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    // `v-line` là thẻ của inline editor BlockSuite; nó chỉ xuất hiện khi paragraph đã render xong
    // và vùng soạn thảo thật sự sống. Đây là bằng chứng "gõ được", không phải chỉ "có thẻ".
    await choDom(() => expect(el.querySelector('drt-paragraph v-line')).not.toBeNull())

    const vungSoan = el.querySelector('[contenteditable="true"]')
    expect(vungSoan).not.toBeNull()

    workspace.forceStop()
  })

  it('chế độ trang KHÔNG dựng thẻ gốc edgeless', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-3')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    await choDom(() => expect(el.querySelector('drt-page-root')).not.toBeNull())
    expect(el.querySelector('drt-edgeless-root')).toBeNull()

    workspace.forceStop()
  })
})
