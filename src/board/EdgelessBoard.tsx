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

// Cơ chế đua-với-hạn-giờ dùng chung cho CẢ HAI lượt race bên dưới (đợi đồng bộ lần đầu, đợi đồng bộ
// sau khi seed) — trước đây `Promise.race([waitForSynced()..., cho(hanGioMs)])` bị lặp nguyên văn ở
// hai chỗ, mỗi chỗ tự dựng `setTimeout` riêng. CHỈ cơ chế đua được gom lại; cách xử lý khi hết giờ ở
// mỗi nơi vẫn khác nhau (huỷ và dựng lại workspace bộ nhớ ở lượt đầu, chỉ cảnh báo ở lượt sau) nên
// phần đó vẫn nằm riêng tại từng chỗ gọi.
// `.finally(() => clearTimeout(...))` dọn timer dù bên nào thắng — thiếu bước này thì khi
// `waitForSynced()` thắng trước, `setTimeout` của nhánh thua vẫn treo tới khi tự bắn, giữ event loop
// của Node/vitest sống lâu hơn cần thiết (vô hại trên trình duyệt, nhưng làm chậm dọn dẹp ca kiểm).
function doiCoHanGio<T>(hua: Promise<T>, hanGioMs: number): Promise<T | 'het-gio'> {
  let idTimer: ReturnType<typeof setTimeout>
  const homHanGio = new Promise<'het-gio'>((giai) => {
    idTimer = setTimeout(() => giai('het-gio'), hanGioMs)
  })
  return Promise.race([hua, homHanGio]).finally(() => clearTimeout(idTimer))
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
 *
 * Trả về `khongLuuDuoc: true` khi (và chỉ khi) lượt race đồng bộ ĐẦU TIÊN hết giờ và workspace phải
 * dựng lại ở chế độ chỉ-trong-bộ-nhớ — bên gọi (EdgelessBoard()) dùng cờ này để hiện một băng cảnh
 * báo thay vì im lặng để người dùng mất nội dung mà không biết.
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

  const ketQua = await doiCoHanGio(workspace.waitForSynced(), hanGioMs)

  // `khongLuuDuoc` đúng nghĩa CHỈ khi lượt race NÀY (lượt đầu) hết giờ và workspace bị huỷ/dựng lại
  // không docSources/blobSources — đó là lúc phiên làm việc thật sự chuyển sang "không lưu gì cho
  // tới khi tải lại trang". Lượt race thứ hai (sau khi seed, bên dưới) hết giờ KHÔNG bật cờ này: cửa
  // sổ đó hẹp hơn nhiều (chỉ một lượt ghi seed chưa xác nhận đẩy xong) và không có nghĩa "mất lưu trữ
  // cho cả phiên" — quyết định phạm vi này là của chủ dự án sau khi xem lượt review toàn nhánh.
  let khongLuuDuoc = false

  if (ketQua === 'het-gio') {
    console.warn(
      `taoHoacMoBang: không đồng bộ được với IndexedDB trong ${hanGioMs}ms — dùng bảng chỉ trong ` +
        'bộ nhớ, nội dung sẽ không được lưu.',
    )
    khongLuuDuoc = true
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

  // Tự hồi phục khi doc đã ĐĂNG KÝ trong metadata IndexedDB (nên `getDoc('board')` khác null) nhưng
  // khối gốc (`affine:page`/`affine:surface`) chưa bao giờ được ghi xong — vd tab bị đóng đúng vào
  // khe vài mili-giây giữa lượt ghi metadata và lượt ghi khối lúc mở app lần đầu, hai tab cùng mở
  // app lần đầu và đua nhau, hoặc (ở dev) React StrictMode mount-rồi-remount hai lần tạo ra hai
  // `TestWorkspace` cùng chạm một IndexedDB. Khi đó `store.root` là `null` dù `laLanDau` là false —
  // seed như bình thường vẫn AN TOÀN vì không có gì để mất: doc rỗng thật sự thì ghi đè cũng chỉ là
  // lấp vào chỗ trống, không bao giờ đè lên nội dung thật (nội dung thật luôn có `store.root`).
  // Không kiểm điều kiện này thì lần mở kế tiếp gặp đúng doc hỏng này sẽ ném
  // `BlockSuiteError: This doc is missing surface/root block` sâu trong `EditorHost.connectedCallback`
  // — một unhandled rejection không ai bắt — và bảng vẽ hỏng vĩnh viễn từ đó về sau, âm thầm.
  const canSeed = laLanDau || !store.root

  if (canSeed) {
    const rootId = store.addBlock('affine:page', {})
    store.addBlock('affine:surface', {}, rootId)

    // Đợi lượt ghi seed ban đầu ĐẨY XONG lên IndexedDB trước khi trả về — nếu không, component gọi
    // hàm này unmount ngay (forceStop() không điều kiện) có thể cắt ngang lượt ghi này, làm mất nội
    // dung seed (đo được thật lúc viết ca kiểm Task 2 — chập chờn ~2/3 lượt npm test đầy đủ dưới
    // tải CPU cao). waitForSynced() lần hai đúng nghĩa vì DocEngineStep chỉ về Synced khi hàng đợi
    // đẩy rỗng (xem framework/sync/src/doc/engine.ts, updateSyncingState). Đua với CÙNG hạn giờ như
    // lượt đầu — nhưng KHÔNG rơi về workspace bộ nhớ nếu hết giờ: nội dung seed đã có trong `store`
    // sắp trả về, huỷ nó mới là mất dữ liệu thật; ghi trễ vào IndexedDB không phải mất, chỉ cảnh báo.
    // (Và KHÔNG bật `khongLuuDuoc` — phạm vi cờ này chỉ là lượt race đầu, xem chú thích ở trên.)
    const ketQuaSeed = await doiCoHanGio(workspace.waitForSynced(), hanGioMs)
    if (ketQuaSeed === 'het-gio') {
      console.warn(
        'taoHoacMoBang: lượt ghi nội dung ban đầu chưa xác nhận đẩy xong lên IndexedDB trong ' +
          `${hanGioMs}ms — tiếp tục, nội dung vẫn còn trong bộ nhớ.`,
      )
    }
  }

  return { workspace, store, khongLuuDuoc }
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)
  // Lỗi không mở được bảng — vd IndexedDB ném lỗi thật (không phải chỉ hết giờ, nhánh đó đã tự rơi
  // về bộ nhớ ở taoHoacMoBang() chứ không reject). Trước lượt sửa này, một promise reject ở đây
  // không có .catch() nào bắt: React ném "Đang mở bảng…" treo mãi, còn lỗi thật thì trôi thành một
  // unhandled rejection không ai thấy. Component này không có cơ chế thử lại riêng (khác error
  // boundary ở src/board/index.tsx, nơi có nút "Thử lại" thật) nên chỉ cần gợi ý tải lại trang.
  const [loi, setLoi] = useState<Error | null>(null)
  // true khi taoHoacMoBang() phải rơi về workspace chỉ-trong-bộ-nhớ (lượt race đồng bộ đầu tiên hết
  // giờ) — quyết định của chủ dự án sau lượt review toàn nhánh: hiện băng cảnh báo thay vì im lặng.
  const [khongLuuDuoc, setKhongLuuDuoc] = useState(false)

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

    taoHoacMoBang()
      .then(({ workspace, store, khongLuuDuoc: khongLuuDuocKetQua }) => {
        if (huyBo) {
          // Component đã unmount trong lúc đang đợi đồng bộ — đóng ngay, không render, không giữ
          // engine chạy nền cho một cây Lit sẽ không bao giờ được gắn.
          workspace.forceStop()
          return
        }
        workspaceHienTai = workspace
        const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
        litRender(std.render(), el)
        setKhongLuuDuoc(khongLuuDuocKetQua)
        setDangMo(false)
      })
      .catch((err: unknown) => {
        if (huyBo) return
        console.error('EdgelessBoard: không mở được bảng:', err)
        setLoi(err instanceof Error ? err : new Error(String(err)))
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
  // giác với dòng "Đang tải bảng vẽ…" của Suspense fallback ở src/board/index.tsx. Trạng thái lỗi
  // (`loi`) dùng đúng khung chứa và kiểu chữ nhạt màu tương tự, cho cảm giác nhất quán thay vì một
  // màn hình lỗi đột ngột khác kiểu.
  return (
    <div
      className="drt-edgeless-viewport @container/viewport block h-full relative overflow-clip"
      data-theme={chuDe}
    >
      {khongLuuDuoc && (
        // Băng cảnh báo mỏng, ghim trên đầu — KHÔNG che phần còn lại của bảng vẽ bên dưới (chỉ cao
        // một dòng chữ), theo đúng dùng lại token cảnh báo `--c-warn-*` đã dùng ở App.tsx cho các
        // băng cảnh báo lâm sàng khác trong app, để không tạo thêm một ngôn ngữ màu mới.
        <div
          className="absolute top-0 inset-x-0 z-10 px-3 py-1.5 text-[12px] font-semibold text-center"
          style={{
            background: 'var(--c-warn-soft)',
            borderBottom: '1px solid var(--c-warn-line)',
            color: 'var(--c-warn-icon)',
          }}
        >
          Bảng đang ở chế độ không lưu — nội dung sẽ mất khi tải lại trang.
        </div>
      )}
      {loi && (
        <div className="h-full flex flex-col items-center justify-center gap-1 text-[13px] text-slate-400 text-center px-6">
          <p>Không mở được bảng.</p>
          <p>Hãy tải lại trang để thử lại.</p>
        </div>
      )}
      {dangMo && !loi && (
        <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
          Đang mở bảng…
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
