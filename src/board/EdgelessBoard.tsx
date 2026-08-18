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
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'

// ĐỊNH NGHĨA của toàn bộ token thiết kế mà cây Lit bên dưới tiêu thụ. Cây vendored dùng 81 biến
// `--drt-*` (thanh công cụ, khung chọn, khung kéo, mọi widget) nhưng KHÔNG khai một biến nào —
// định nghĩa nằm trong gói npm `@toeverything/theme`, và trước lượt sửa này không có gì trong src/
// import nó. Hậu quả: mọi custom property không phân giải được, bảng vẽ dựng ra không màu, không
// viền, không bóng — mà không có một lỗi nào bị ném, nên không lượt kiểm nào bắt được.
// File dưới đây là bản `style.css` của gói đó ĐÃ QUA bước đổi tên `--affine-` → `--drt-`
// (scripts/doi-ten-vendor.mjs phát hành ra `.vendor-build/theme/`, cùng chỗ và cùng luật với phần
// còn lại của D16), nên tên hai bên khớp nhau và devtools không lộ tiền tố thượng nguồn.
//
// Import ở ĐÂY, trong EdgelessBoard.tsx, chứ không ở src/index.css hay src/main.tsx: file này chỉ
// được nạp qua `React.lazy` (xem ./index.tsx), nên 102 kB stylesheet đi vào CHUNK BẢNG VẼ. Đặt ở
// vỏ app là bắt mọi người dùng tải bảng màu của một màn hình họ có thể không bao giờ mở.
import '../../.vendor-build/theme/style.css'

import { viewExtensions } from './extensions'

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

// Tên CSDL IndexedDB riêng cho NỘI DUNG bảng (CRDT nhị phân + blob ảnh) — tách hẳn khỏi
// "drtrong-ecg" của src/lib/idb.ts (bản ghi JSON cho danh sách bảng/ECG/bài viết, hai bản chất dữ
// liệu khác nhau, xem docs/superpowers/specs/2026-08-18-luu-tru-noi-dung-bang-design.md §4.1).
// KHÔNG dùng tên mặc định 'blocksuite-local' của IndexedDBDocSource/IndexedDBBlobSource — tên đó
// mơ hồ, không nói lên đây là CSDL của dự án nào.
const TEN_CSDL_BANG = 'drtrong-board'

// waitForSynced() KHÔNG tự bỏ cuộc khi IndexedDB hỏng vĩnh viễn — DocEngine thử lại mỗi 5 giây vô
// thời hạn (framework/sync/src/doc/peer.ts, syncRetryLoop). await trần trên waitForSynced() sẽ treo
// màn "Đang mở bảng…" MÃI MÃI nếu IndexedDB hỏng (chế độ ẩn danh chặn, hết quota...) — một hồi quy
// nặng hơn hành vi trước khi có lưu trữ (board luôn hiện ra, chỉ là không lưu). 4 giây là hào phóng
// cho IndexedDB cục bộ (bình thường xong trong vài chục ms).
const HAN_GIO_MAC_DINH_MS = 4000

function cho(ms: number) {
  return new Promise<'het-gio'>((resolve) => setTimeout(() => resolve('het-gio'), ms))
}

/**
 * Dựng hoặc mở lại bảng đã lưu. Bền vững qua IndexedDB (mặc định) — nếu không đồng bộ xong trong
 * `hanGioMs`, rơi về workspace chỉ trong bộ nhớ thay vì treo vô thời hạn (xem HAN_GIO_MAC_DINH_MS).
 *
 * `tuyChon` CHỈ dùng để ca kiểm tiêm docSources/blobSources/hanGioMs giả — gọi không đối số trong
 * app thật.
 *
 * QUAN TRỌNG: `createDoc('board')` ném lỗi nếu doc đã tồn tại. Với người dùng cũ, sau khi đồng bộ
 * xong thì `getDoc('board')` đã trả về non-null — PHẢI kiểm trước khi gọi `createDoc`, nếu không
 * mọi lần mở app sau lần đầu đều vỡ ngay lúc mount.
 */
export async function taoHoacMoBang(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}) {
  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }
  const hanGioMs = tuyChon?.hanGioMs ?? HAN_GIO_MAC_DINH_MS

  let workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
    docSources,
    blobSources,
  })
  workspace.meta.initialize()
  workspace.start()

  const ketQua = await Promise.race([
    workspace.waitForSynced().then(() => 'xong' as const),
    cho(hanGioMs),
  ])

  if (ketQua === 'het-gio') {
    console.warn(
      `taoHoacMoBang: không đồng bộ được với IndexedDB trong ${hanGioMs}ms — dùng bảng chỉ trong ` +
        'bộ nhớ, nội dung sẽ không được lưu.',
    )
    workspace.forceStop()
    workspace = new TestWorkspace({
      id: 'bs-trong-board',
      idGenerator: createAutoIncrementIdGenerator(),
    })
    workspace.meta.initialize()
    workspace.start()
  }

  let doc = workspace.getDoc('board')
  let laLanDau = false
  if (!doc) {
    doc = workspace.createDoc('board')
    laLanDau = true
  }
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  if (laLanDau) {
    const rootId = store.addBlock('affine:page', {})
    store.addBlock('affine:surface', {}, rootId)
  }

  return { workspace, store }
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)

  // ─── Chủ đề sáng/tối của riêng bảng vẽ ───────────────────────────────────────────────────────
  // Bảng màu vendored (.vendor-build/theme/style.css) khoá TOÀN BỘ bản tối vào đúng một bộ chọn
  // `[data-theme=dark]` và không có nhánh `prefers-color-scheme` nào dự phòng. Mà chế độ mặc định
  // của app là "auto", nơi lib/theme.ts CỐ Ý gỡ hẳn thuộc tính data-theme khỏi <html> để các biến
  // --c-* của vỏ app chạy bằng @media. Hai điều đó cộng lại: máy để nền tối, cả app tối, riêng
  // bảng vẽ vẫn trắng loá — đúng thứ chói mắt nhất lúc 2 giờ sáng.
  // Vì thế thẻ bọc dưới đây tự mang một data-theme ĐÃ PHÂN GIẢI ("light"/"dark", không bao giờ
  // "auto"). Đây cũng là cách vỏ React của chính AFFiNE làm (`affine-edgeless-viewport`
  // data-theme=...). Không đụng gì tới <html> nên chủ đề của vỏ app giữ nguyên cách chạy cũ.
  const [chuDe, setChuDe] = useState(() => resolveTheme())
  // Đổi sống theo cả hai hướng: người dùng bấm nút chủ đề, và hệ điều hành lật sáng/tối khi app
  // đang ở "auto". Cả hai đều đi qua applyTheme() nên chỉ cần nghe đúng một chỗ (xem lib/theme.ts).
  useEffect(() => watchResolvedTheme(setChuDe), [])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let huyBo = false
    let workspaceHienTai: TestWorkspace | null = null

    taoHoacMoBang().then(({ workspace, store }) => {
      if (huyBo) {
        // Component đã unmount trong lúc đang đợi đồng bộ — đóng ngay, không render, không giữ
        // engine chạy nền cho một cây Lit sẽ không bao giờ được gắn.
        workspace.forceStop()
        return
      }
      workspaceHienTai = workspace
      const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
      litRender(std.render(), el)
      setDangMo(false)
    })

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó — cộng thêm giờ là một engine đồng bộ
    // IndexedDB còn chạy nền.
    return () => {
      huyBo = true
      litRender(null, el)
      workspaceHienTai?.forceStop()
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
  //
  // "Đang mở bảng…" hiện TRONG lớp bọc này (không phải thay thế nó) — lớp bọc phải render ngay từ
  // đầu để giữ cấu trúc DOM ổn định cho `closest()` ở trên, kể cả trước khi Lit gắn vào. Khớp thị
  // giác với dòng "Đang tải bảng vẽ…" của Suspense fallback ở src/board/index.tsx.
  return (
    <div
      className="drt-edgeless-viewport @container/viewport block h-full relative overflow-clip"
      data-theme={chuDe}
    >
      {dangMo && (
        <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
          Đang mở bảng…
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
