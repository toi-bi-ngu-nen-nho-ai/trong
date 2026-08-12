// Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi Lit tự
// render vào thẻ đó. React không biết gì về bên trong, Lit không biết gì về React — đó chính là
// điều làm phép nhúng khả thi, và cũng là lý do file này phải nhỏ.
// Ở đây từng có `import '@blocksuite/affine/effects'`, kèm niềm tin rằng nó là nơi gọi
// `customElements.define(...)` cho toàn bộ thẻ Lit. Ở bản vendored (BlockSuite 0.27) niềm tin đó
// SAI: `affine/all/src/effects.ts` chỉ gồm các `import { type effects ... }` — nhập KIỂU — nên bản
// biên dịch của nó là đúng một dòng `export {};` (kiểm bằng `cat .vendor-build/affine/all/src/effects.js`).
// Import một module rỗng không đăng ký gì; đã kiểm chứng bằng một ca chỉ import nó rồi hỏi
// `customElements.get('drt-edgeless-root')` → undefined.
// Nơi thật sự đăng ký là chuỗi `ViewExtensionProvider.setup() → effect() → effects()` của TỪNG gói
// view extension, tức là qua `viewExtensions` ngay bên dưới. Vì thế bỏ hẳn dòng import đó thay vì
// giữ một dòng vô tác dụng kèm chú thích sai. Đường đăng ký thật được canh bằng
// `__tests__/dang-ky-custom-element.spec.ts`.
import { StoreExtensionManager, ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import { render as litRender } from 'lit'
import { useEffect, useRef } from 'react'

import { viewExtensions } from './extensions'

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

/**
 * Dựng một bảng trống trong bộ nhớ. Chưa bền vững — lưu trữ (D4) thuộc chặng sau, nên đóng bảng
 * là mất nội dung. `TestWorkspace` là workspace không cần server, đúng thứ cần ở chặng này.
 */
export function taoBangTrong() {
  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
  })
  workspace.meta.initialize()

  const doc = workspace.createDoc('board')
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  const rootId = store.addBlock('affine:page', {})
  store.addBlock('affine:surface', {}, rootId)

  return store
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const std = new BlockStdScope({
      store: taoBangTrong(),
      extensions: viewManager.get('edgeless'),
    })
    litRender(std.render(), el)

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó.
    return () => {
      litRender(null, el)
    }
  }, [])

  // `ViewportElementExtension('.drt-edgeless-viewport')` (đăng ký trong extensions/view.ts của cây
  // vendor) tìm phần tử viewport bằng `std.host.closest(...)` — đi NGƯỢC LÊN từ editor host, nên
  // chính ứng dụng nhúng phải cấp sẵn tổ tiên mang đúng class này; cây Lit bên trong không tự tạo
  // ra nó. Thiếu tổ tiên này là nguyên nhân lỗi "viewport element is not found".
  // Bọc thêm một div `drt-edgeless-viewport` bên ngoài div gắn Lit — không đụng vào chính hostRef,
  // giữ đúng ranh giới "React chỉ giữ chỗ, Lit tự lo bên trong" của hostRef.
  //
  // `@container/viewport` là utility Tailwind v4 sinh ra ĐỦ CẢ HAI khai báo
  // `container-type: inline-size` và `container-name: viewport`. Luật này trước đây nằm trong
  // src/index.css với chú thích nói Tailwind không có utility cho `container-name` — chú thích đó
  // sai, và cái giá của nó là một luật CHỈ dùng cho bảng vẽ bị nạp kèm CSS của vỏ app, đúng thứ
  // ranh giới mà cả chặng này dựng lên để tránh. Cái TÊN "viewport" là bắt buộc: nhiều nơi trong
  // cây vendor (vd affine/widgets/edgeless-zoom-toolbar) viết thẳng `@container viewport (...)`,
  // truy vấn đó chỉ khớp container mang đúng tên này.
  // Class chữ `drt-edgeless-viewport` PHẢI ở lại — nó là thứ `closest()` bên trên tìm, không phải
  // thứ tạo ra kiểu dáng.
  return (
    <div className="drt-edgeless-viewport @container/viewport block h-full relative overflow-clip">
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
