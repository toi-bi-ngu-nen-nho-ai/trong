// @vitest-environment happy-dom
//
// Ca kiểm CẦU NỐI React↔Lit — thứ mà `edgeless-board.spec.ts` không chạm tới (file đó chỉ gọi
// `taoBangTrong()`, nên xoá sạch component `EdgelessBoard` nó vẫn xanh).
//
// Vì sao có dòng `@vitest-environment happy-dom` ở đầu file: environment mặc định của dự án là
// 'node' (xem vite.config.ts) và mọi thứ chạm DOM sẽ đâm `DOMRect is not defined`. Chỉ thị trên
// đổi environment CHO RIÊNG FILE NÀY, không đụng 15 file spec còn lại — rẻ hơn nhiều so với đổi
// environment toàn cục, và không phải tự chế global giả bằng tay (một DOM tự chế sẽ khác DOM thật
// đúng ở những chỗ ta không lường trước). Chọn 'happy-dom' chứ không phải 'jsdom' vì chính
// BlockSuite chạy bộ test của họ trên happy-dom (xem affine/all/vitest.config.ts trong cây
// vendored) — cùng một môi trường thượng nguồn đã kiểm chứng cho chính đống mã Lit này.
import 'fake-indexeddb/auto'

import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'

// React 19 yêu cầu cờ này để `act()` không cảnh báo; vitest không tự đặt.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Ngữ cảnh 2D của <canvas> là thứ DUY NHẤT phải chế tay ở đây, và không môi trường DOM thuần
// JavaScript nào cấp được: happy-dom lẫn jsdom đều trả `null` từ `getContext('2d')` (jsdom cần gói
// native `canvas`, biên dịch được trên Windows là chuyện hên xui). `SurfaceBlockComponent`
// .firstUpdated gọi `CanvasRenderer._render` → `ctx.clearRect(...)` trên `null` và ném lỗi BẤT ĐỒNG
// BỘ (qua requestIdleCallback) SAU khi ca kiểm đã xong — vitest đếm nó vào "unhandled errors" và
// trả exit code 1 dù mọi expect đều xanh.
// Proxy dưới đây nuốt mọi lời gọi vẽ (trả về chính nó, và ép về số 0 khi bị dùng trong phép tính),
// nên phần vẽ ra pixel trở thành no-op. KHÔNG ca kiểm nào dựa vào nó: các expect bên dưới chỉ đọc
// cây DOM (thẻ custom element, `closest()`, `innerHTML`) — thứ happy-dom cấp thật.
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

describe('EdgelessBoard — cầu nối React↔Lit', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    // Phải nằm trong document thật: `closest()` và vòng đời custom element chỉ chạy khi phần tử
    // đã được kết nối vào cây tài liệu.
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('dựng cây Lit trong thẻ div của React, có tổ tiên viewport, và dọn sạch khi tháo', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })

    // taoHoacMoBang() giờ bất đồng bộ (đợi đồng bộ IndexedDB, dù cục bộ và nhanh) — cây Lit chỉ
    // được gắn SAU khi promise đó xong, không còn ngay trong lượt act() đầu tiên. Đợi tường minh
    // thay vì giả định act() một lượt là đủ.
    // Bọc trong act(): taoHoacMoBang() resolve xong còn kéo theo setDangMo(false) — một cập nhật
    // state React thật, cần một lượt render nữa để gỡ div "Đang mở bảng…" khỏi DOM. vi.waitFor
    // trần (không bọc act) chỉ đợi được điều kiện của nó, không flush lượt render đó: React cảnh
    // báo "not wrapped in act(...)" và div loading vẫn còn nằm trước div gắn Lit, khiến phép kiểm
    // `:scope > div` bên dưới chọn nhầm div loading (không có editor-host) thay vì div hostRef.
    await act(async () => {
      await vi.waitFor(() => {
        expect(document.querySelector('drt-edgeless-root')).not.toBeNull()
      })
    })

    // 1) Cây Lit thật sự được dựng: thẻ gốc edgeless (đã đổi tên affine-→drt- ở bước build vendor)
    //    phải có mặt trong tài liệu. Nếu `viewExtensions` bị rỗng/xáo trộn thì RootViewExtension
    //    không còn, và thẻ này không bao giờ xuất hiện.
    const goc = document.querySelector('drt-edgeless-root')
    expect(goc).not.toBeNull()

    // 2) Ranh giới nhúng: `ViewportElementExtension('.drt-edgeless-viewport')` đi NGƯỢC LÊN từ
    //    editor host bằng `closest()`. Bọc thiếu tổ tiên mang đúng class này là lỗi
    //    "viewport element is not found" lúc chạy.
    const host = document.querySelector('editor-host')
    expect(host).not.toBeNull()
    const boc = container.querySelector('.drt-edgeless-viewport')
    expect(boc).not.toBeNull()
    expect(host!.closest('.drt-edgeless-viewport')).toBe(boc)

    // 3) Dọn dẹp: `litRender(null, el)` trong hàm trả về của useEffect. Thiếu nó thì cây Lit cũ
    //    còn sống sau khi React tháo component (listener, rAF vẫn chạy).
    //
    //    Phải giữ tham chiếu tới ĐÚNG thẻ div mà Lit render vào (con của thẻ bọc) TRƯỚC khi tháo:
    //    sau khi tháo, React gỡ cả thẻ bọc khỏi `container` nên mọi phép kiểm nhìn từ `container`
    //    hay từ `document` đều xanh dù có dọn hay không — đã kiểm chứng bằng đột biến: xoá hẳn
    //    `litRender(null, el)` mà hai expect cuối vẫn xanh. Thẻ div này thì khác: nó bị React gỡ
    //    khỏi tài liệu nhưng KHÔNG bị React dọn ruột (ruột là do Lit đặt vào, React không biết),
    //    nên `editor-host` bên trong chỉ biến mất khi `litRender(null, el)` thật sự chạy.
    const noiLitRender = boc!.querySelector(':scope > div')
    expect(noiLitRender).not.toBeNull()
    expect(noiLitRender!.querySelector('editor-host')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
    expect(noiLitRender!.querySelector('editor-host')).toBeNull()
    // Hai phép kiểm dưới đây KHÔNG thay thế phép kiểm trên (chúng xanh cả khi thiếu dọn dẹp) —
    // giữ lại vì chúng canh phần việc của React: thẻ bọc phải được gỡ khỏi container.
    expect(container.innerHTML).toBe('')
    expect(document.querySelector('drt-edgeless-root')).toBeNull()
  })
})
