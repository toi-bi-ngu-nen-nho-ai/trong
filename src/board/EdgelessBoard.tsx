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
import { type SurfaceBlockModel } from '@blocksuite/affine/blocks/surface'
import { StoreExtensionManager, ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import { TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'
import { apDungViewportChoIOS } from './viewport-ios'
import { capNhatAnhXemTruoc, ghepNoiDungTimKiem, trichVanBanTuCanvas, trichVanBanTuKhoi } from './boardMeta'

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

// Phải chạy Ở ĐÂY — top-level module, trước khi bất kỳ Viewport nào được dựng (bên trong
// BlockStdScope, mount trong useEffect bên dưới). Xem viewport-ios.ts để biết vì sao thứ tự này
// bắt buộc (SKIP_REFRESH_DURING_GESTURE là field initializer, chốt cứng lúc constructor chạy).
apDungViewportChoIOS()

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

// Xuất PNG/PDF từng sống ở đây qua ExportManager (BlockStdScope chỉ mount SAU khi mở bảng) — đã bỏ
// HẲN khỏi màn vẽ này (không phải ẩn UI): tính năng xuất giờ dùng ẢNH XEM TRƯỚC đã lưu sẵn
// (BangMeta.anhXemTruoc, một JPEG chụp lúc rời bảng gần nhất) và sống trong menu "⋯" của THẺ bảng ở
// lưới danh sách (DanhSachBang.tsx) — không cần mở bảng, không cần ExportManager/std/store nào ở
// đây nữa (phản hồi thật 2026-08-27, lần 3: "xoá luôn nút ... của đổi tên/chuyên khoa xuất file" ở
// màn vẽ, "tính năng xuất file chuyển ra board"). Đánh đổi: ảnh xem trước vốn để làm thumbnail thẻ,
// không phải bản xuất tươi từ canvas hiện tại — nếu cần đúng bản mới nhất, mở bảng, rời ra (ảnh xem
// trước tự ghi lại) rồi mới xuất từ menu thẻ.

/**
 * Dựng hoặc mở lại bảng đã lưu. Bền vững qua IndexedDB (mặc định) — nếu không đồng bộ xong trong
 * `hanGioMs`, rơi về workspace chỉ trong bộ nhớ thay vì treo vô thời hạn (xem HAN_GIO_MAC_DINH_MS).
 *
 * `tuyChon` CHỈ dùng để ca kiểm tiêm docSources/blobSources/hanGioMs giả — gọi không đối số trong
 * app thật.
 *
 * QUAN TRỌNG: `createDoc(boardId)` ném lỗi nếu doc đã tồn tại. Với người dùng cũ, sau khi đồng bộ
 * xong thì `getDoc(boardId)` đã trả về non-null — PHẢI kiểm trước khi gọi `createDoc`, nếu không
 * mọi lần mở app sau lần đầu đều vỡ ngay lúc mount.
 *
 * Trả về `khongLuuDuoc: true` khi (và chỉ khi) lượt race đồng bộ ĐẦU TIÊN hết giờ và workspace phải
 * dựng lại ở chế độ chỉ-trong-bộ-nhớ — bên gọi (EdgelessBoard()) dùng cờ này để hiện một băng cảnh
 * báo thay vì im lặng để người dùng mất nội dung mà không biết.
 */
export async function taoHoacMoBang(boardId: string, tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}) {
  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }
  const hanGioMs = tuyChon?.hanGioMs ?? HAN_GIO_MAC_DINH_MS

  // KHÔNG truyền `idGenerator` — để TestWorkspace tự rơi về mặc định của nó (`nanoid`, ngẫu nhiên).
  // Từng có `createAutoIncrementIdGenerator()` ở đây: bộ đếm bắt đầu lại từ 0 ở MỖI lần hàm này
  // chạy (mỗi lần mount/mở lại bảng), không biết gì về id đã dùng trong nội dung ĐÃ LƯU. Lần mở đầu
  // tiên seed root="0" không va chạm, nhưng lần MỞ LẠI một bảng đã có nội dung thì không seed lại
  // (đúng), mà bộ đếm mới vẫn bắt đầu từ 0 — nên khối TIẾP THEO người dùng thêm (vd một note) bị
  // cấp lại id "0", trùng id root đã tồn tại. Giao dịch Yjs bị từ chối ÂM THẦM (chỉ console.error,
  // không ném ra ngoài), `addBlock()` vẫn trả về một id như thể thành công, nhưng khối chưa từng vào
  // store thật — đây là nguyên nhân gốc của lỗi "thêm Note không hiện ra". Ghim ở
  // src/board/__tests__/edgeless-board.spec.ts.
  let workspace = new TestWorkspace({
    id: 'bs-trong-board',
    docSources,
    blobSources,
  })
  try {
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
      })
      workspace.meta.initialize()
      workspace.start()
    }

    let doc = workspace.getDoc(boardId)
    if (!doc) {
      doc = workspace.createDoc(boardId)
    }
    const store = doc.getStore({ extensions: storeManager.get('store') })
    doc.load()

    // Tự hồi phục khi doc đã ĐĂNG KÝ trong metadata IndexedDB (nên `getDoc(boardId)` khác null) nhưng
    // khối gốc (`affine:page`/`affine:surface`) chưa bao giờ được ghi xong — vd tab bị đóng đúng vào
    // khe vài mili-giây giữa lượt ghi metadata và lượt ghi khối lúc mở app lần đầu, hai tab cùng mở
    // app lần đầu và đua nhau, hoặc (ở dev) React StrictMode mount-rồi-remount hai lần tạo ra hai
    // `TestWorkspace` cùng chạm một IndexedDB. Điều kiện seed dưới đây kiểm THẲNG `!store.root` (và,
    // cho nhánh hẹp hơn, thiếu `affine:surface`) thay vì "đây có phải lần đầu mở doc" — trước lượt
    // sửa này điều kiện là `laLanDau || !store.root`, tưởng an toàn hơn nhưng thực ra NGƯỢC lại:
    // `createDoc()` luôn khởi tạo một store RỖNG (`!store.root` đã tự đúng ở mọi lần đầu thật), nên
    // `laLanDau` không thêm được ca nào `!store.root` chưa phủ — nó chỉ THÊM một đường seed giả nếu
    // metadata workspace từng bị mất trong khi nội dung subdoc vẫn còn nguyên: khi đó `laLanDau` có
    // thể là `true` dù `store.root` đã có nội dung thật, và vế `||` sẽ seed CHỒNG LÊN nội dung có
    // sẵn — đúng thứ guard này phải ngăn. Bỏ hẳn `laLanDau` khỏi điều kiện vừa đơn giản hơn vừa an
    // toàn hơn. Không kiểm điều kiện này thì lần mở kế tiếp gặp đúng doc hỏng này sẽ ném
    // `BlockSuiteError: This doc is missing surface/root block` sâu trong `EditorHost.connectedCallback`
    // — một unhandled rejection không ai bắt — và bảng vẽ hỏng vĩnh viễn từ đó về sau, âm thầm.
    let daGhiKhoiMoi = false
    if (!store.root) {
      const rootId = store.addBlock('affine:page', {})
      store.addBlock('affine:surface', {}, rootId)
      daGhiKhoiMoi = true
    } else if (!store.root.children.some((khoi) => khoi.flavour === 'affine:surface')) {
      // Nhánh hẹp hơn: đã có `store.root` nhưng thiếu hẳn con `affine:surface` — trong thực tế khó
      // xảy ra ĐỘC LẬP với nhánh trên vì hai addBlock ở đó luôn nằm cùng một giao dịch/lượt đẩy Yjs,
      // nhưng đây chính là điều kiện literal mà lỗi runtime thật kiểm tra trực tiếp
      // (`EdgelessRootService`, "missing surface block"), nên rẻ để bọc thêm cho chắc.
      store.addBlock('affine:surface', {}, store.root.id)
      daGhiKhoiMoi = true
    }

    if (daGhiKhoiMoi) {
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
  } catch (loi) {
    // Bất kỳ lỗi nào từ đây trở đi (kể cả bên trong nhánh dựng lại workspace bộ nhớ khi hết giờ)
    // đều phải đóng engine trước khi ném tiếp — nếu không, promise reject nhưng DocEngine của
    // `workspace` (dù là bản gốc hay bản dựng lại) vẫn chạy nền vô thời hạn, không còn ai giữ tham
    // chiếu để gọi forceStop() sau đó.
    workspace.forceStop()
    throw loi
  }
}

// Phép nhúng canvas THUẦN — không còn tay cầm/imperative handle nào lộ ra ngoài, không còn state
// nào liên quan tới xuất file. Xuất file (giờ dùng ảnh xem trước đã lưu) sống hẳn ở menu "⋯" của
// THẺ bảng trong DanhSachBang.tsx, và rename/đổi chuyên khoa cũng vốn đã ở đó từ trước — component
// này KHÔNG cần biết BoardGallery.tsx làm gì với chrome của nó (đúng tinh thần "file phải nhỏ" ghi
// ở đầu file). Hai lượt trước từng thêm forwardRef + useImperativeHandle riêng cho việc xuất PNG —
// bỏ hẳn (không phải giữ lại dead code): không còn nơi nào gọi qua ref nữa (phản hồi thật
// 2026-08-27, lần 3: "xoá luôn nút ... của đổi tên/chuyên khoa xuất file" ở màn vẽ).
export function EdgelessBoard({
  boardId,
  onReady,
  mauNhanDien,
}: {
  boardId: string
  // Báo cho BoardGallery.tsx biết canvas thật đã gắn xong (đúng lúc setDangMo(false) chạy) — dùng
  // để mờ dần lớp phủ ảnh xem trước (FLIP continuity, xem BoardGallery.tsx) thay vì tự đoán một
  // thời lượng cố định không khớp tốc độ mạng/máy thật.
  onReady?: () => void
  // Hue nhận diện của bảng (BoardOpenOrigin.mauNhanDien, DanhSachBang.tsx) — tô đúng màu giọt mực
  // loading (--mind-ink-h, index.css) bằng màu chấm nhận diện của CHÍNH bảng đang mở, thay vì luôn
  // magenta cố định (overdrive 2026-08-26, Hướng 2 "Cổng chuyển cảnh vật liệu"). undefined khi mở
  // KHÔNG qua một thẻ trong lưới (vd kết quả tìm kiếm) — CSS tự rơi về hue magenta mặc định (327).
  mauNhanDien?: number
}) {
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
    // Có sửa NỘI DUNG thật trong phiên mở bảng này hay không — xem chú thích ở capNhatAnhXemTruoc
    // (boardMeta.ts). Đăng ký lúc mount xong (sau seed, xem taoHoacMoBang), nên chỉ đếm thay đổi
    // PHÁT SINH TỪ đây trở đi, không tính lượt hydrate/seed đã xảy ra trước khi effect này chạy.
    let coThayDoiNoiDung = false
    let huyDangKyThayDoi: Array<() => void> = []

    taoHoacMoBang(boardId)
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
        onReady?.()

        // Khối (note, ảnh, đính kèm...) đi qua store.slots.blockUpdated; phần tử canvas thuần
        // (connector, brush, shape, mindmap node...) KHÔNG phải khối — sống trong Y.Map riêng của
        // chính surface, chỉ báo qua surface.element{Added,Updated,Removed}. Cần cả hai mới phủ hết
        // những gì PRODUCT.md liệt cho Mindmap (thẻ ghi chú + đường nối + nét vẽ tay + ảnh chèn).
        // `isLocal`/`local`: chỉ đếm sự kiện phát sinh TỪ CHÍNH client này — bỏ qua sự kiện đến từ
        // hydrate/đồng bộ nền, dù ở app một-người-dùng-cục-bộ này trường hợp đó hiếm.
        const dkBlock = store.slots.blockUpdated.subscribe((payload) => {
          if (payload.isLocal) coThayDoiNoiDung = true
        })
        huyDangKyThayDoi.push(() => dkBlock.unsubscribe())

        const surfaceModel = store.root?.children.find(
          (khoi): khoi is SurfaceBlockModel => khoi.flavour === 'affine:surface',
        )
        if (surfaceModel) {
          const dkThem = surfaceModel.elementAdded.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          const dkSua = surfaceModel.elementUpdated.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          const dkXoa = surfaceModel.elementRemoved.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          huyDangKyThayDoi.push(
            () => dkThem.unsubscribe(),
            () => dkSua.unsubscribe(),
            () => dkXoa.unsubscribe(),
          )
        }
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
      huyDangKyThayDoi.forEach((huy) => huy())
      // Chụp ảnh xem trước TRƯỚC khi tháo cây Lit — sau litRender(null, el) canvas không còn.
      // Best-effort tuyệt đối: lỗi ở đây KHÔNG được chặn dọn dẹp thật (forceStop() vẫn phải chạy).
      try {
        const canvasGoc = el.querySelector('canvas')
        if (canvasGoc && canvasGoc.width > 0 && canvasGoc.height > 0) {
          const nho = document.createElement('canvas')
          nho.width = 480
          nho.height = 360
          const ctx = nho.getContext('2d')
          if (ctx) {
            // Tô nền TRƯỚC drawImage — bảng TRỐNG (chưa vẽ gì) chỉ có canvasGoc trong suốt hoàn
            // toàn (nền chấm lưới người dùng thấy trên màn là một lớp CSS riêng phủ NGOÀI canvas,
            // không phải nội dung canvas thật). toDataURL('image/jpeg', ...) không có kênh alpha nên
            // vùng trong suốt đó tự động tô ĐEN khi xuất — kết quả là một ô đen thay hẳn icon chuyên
            // khoa mặc định vốn đang hiện tốt cho bảng chưa có anhXemTruoc (phản hồi thật 2026-08-26:
            // mở một bảng mới trống rồi quay lại, thẻ hoá ô đen). ĐÃ THỬ bỏ hẳn lượt ghi khi canvas
            // trống (quét kênh alpha rồi return sớm) — vỡ 3 test edgeless-board-mount.spec.ts đang
            // khoá cứng "unmount LUÔN gọi capNhatAnhXemTruoc kể cả khi không tương tác gì" (đúng hợp
            // đồng đã ghi ở đầu capNhatAnhXemTruoc trong boardMeta.ts: "Ảnh xem trước LUÔN được ghi
            // lại... kể cả khi họ chỉ pan/zoom mà không sửa gì"), plus happy-dom không rasterize
            // drawImage() thật nên getImageData() luôn ra toàn số 0 trong môi trường test dù canvas
            // "có nội dung" theo kịch bản test — không có cách nào phân biệt hai ca đó qua pixel
            // trong happy-dom. Tô nền là fix ĐÚNG TẦNG: giữ nguyên hợp đồng "luôn ghi", chỉ đổi màu
            // nền JPEG-hoá-đen thành đúng màu nền thật của theme đang áp — cùng kỹ thuật
            // getComputedStyle('--c-surface') + fallback hex mà src/lib/theme.ts đã dùng cho
            // <meta name="theme-color">, tránh một nguồn sự thật thứ hai cho màu nền theme.
            ctx.drawImage(canvasGoc, 0, 0, 480, 360)

            // Bảng TRỐNG (chưa vẽ gì) cho canvas TRONG SUỐT HOÀN TOÀN — nền chấm lưới người dùng
            // thấy trên màn là một lớp CSS phủ NGOÀI canvas, không phải nội dung canvas. Quét kênh
            // alpha để phân biệt "trống thật" với "có nội dung": thoát ở pixel đục ĐẦU TIÊN nên
            // bảng có nội dung gần như không tốn gì, chỉ bảng trống mới quét hết 480×360.
            let coNoiDung = false
            const duLieu = ctx.getImageData(0, 0, 480, 360).data
            for (let i = 3; i < duLieu.length; i += 4) {
              if (duLieu[i] !== 0) {
                coNoiDung = true
                break
              }
            }

            // Chỉ lấp nền khi THẬT SỰ có nội dung. `destination-over` vẽ màu nền XUỐNG DƯỚI phần đã
            // vẽ (không đè lên), nên không cần drawImage lần hai. Cần lấp vì toDataURL('jpeg') không
            // có kênh alpha: vùng trong suốt quanh nét vẽ sẽ tự hoá ĐEN nếu để nguyên.
            // Màu nền lấy từ --c-surface đang áp — cùng nguồn sự thật mà src/lib/theme.ts dùng cho
            // <meta name="theme-color">, không tự chế bảng màu thứ hai.
            if (coNoiDung) {
              ctx.globalCompositeOperation = 'destination-over'
              ctx.fillStyle =
                getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim() ||
                (resolveTheme() === 'dark' ? '#14162c' : '#ffffff')
              ctx.fillRect(0, 0, 480, 360)
              ctx.globalCompositeOperation = 'source-over'
            }
            // Trích văn bản NGAY TRƯỚC KHI workspaceHienTai.forceStop() chạy (mấy dòng dưới) — store
            // vẫn còn sống tới đó, forceStop() đóng DocEngine và không còn gì để đọc sau đó. Tự lấy
            // lại store qua `workspaceHienTai.getDoc(boardId).getStore(...)` — con đường CHẮC CHẮN
            // sống nếu tới được đây (chỉ chạy khi canvasGoc đã có nội dung, tức taoHoacMoBang đã
            // resolve xong), không phụ thuộc bất kỳ state React nào có thể lệch nhịp lúc unmount.
            let noiDungTimKiemMoi: string | undefined
            try {
              const rootHienTai = workspaceHienTai
                ?.getDoc(boardId)
                ?.getStore({ extensions: storeManager.get('store') }).root
              if (rootHienTai) {
                const surfaceHienTai = rootHienTai.children.find(
                  (khoi): khoi is SurfaceBlockModel => khoi.flavour === 'affine:surface',
                )
                noiDungTimKiemMoi = ghepNoiDungTimKiem(
                  trichVanBanTuKhoi(rootHienTai),
                  // Ép kiểu về hình dạng tối thiểu mà trichVanBanTuCanvas cần (`{ text?: unknown }[]`)
                  // — elementModels là union các lớp GfxPrimitiveElementModel cụ thể (shape/connector/
                  // text/mindmap...), không lớp nào khai `text` ở kiểu CHUNG nên TypeScript từ chối
                  // gán thẳng dù đúng ở runtime cho những lớp có field đó (đã xác nhận qua chính
                  // element-model/{text,shape,connector}.ts của cây vendored, xem chú thích tại định
                  // nghĩa trichVanBanTuCanvas trong boardMeta.ts).
                  surfaceHienTai
                    ? trichVanBanTuCanvas(surfaceHienTai.elementModels as unknown as Array<{ text?: unknown }>)
                    : '',
                )
              }
            } catch {
              // Trích văn bản là tiện ích phụ (phục vụ tìm kiếm) — lỗi ở đây không được làm hỏng
              // lượt ghi ảnh xem trước hay thao tác quay lại danh sách của người dùng.
            }
            // Bảng trống truyền CHUỖI RỖNG chứ không phải ảnh ô-màu-phẳng: boardMeta.ts hiểu đó là
            // "giữ nguyên ảnh cũ", nhờ vậy thẻ bảng chưa vẽ gì vẫn hiện icon chuyên khoa thay vì một
            // ô đặc. Vẫn GỌI (không bỏ qua) vì lượt gọi này còn gánh bump capNhatLuc + backfill
            // chuyenKhoa/tags/noiDungTimKiem — bỏ qua là mất luôn mấy việc đó (đã thử và vỡ 3 ca
            // kiểm trong edgeless-board-mount.spec.ts).
            void capNhatAnhXemTruoc(
              boardId,
              coNoiDung ? nho.toDataURL('image/jpeg', 0.6) : '',
              coThayDoiNoiDung,
              noiDungTimKiemMoi,
            )
          }
        }
      } catch {
        // Chụp ảnh là tiện ích phụ — không được làm hỏng thao tác quay lại danh sách của người dùng.
      }
      litRender(null, el)
      workspaceHienTai?.forceStop()
    }
  }, [boardId])

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
        // băng cảnh báo lâm sàng khác trong app, để không tạo thêm ngôn ngữ màu mới.
        <div
          className="absolute top-0 inset-x-0 z-10 px-3 py-1.5 text-[12px] font-semibold text-center pointer-events-none"
          role="status"
          aria-live="polite"
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
        // Thay chữ xám tĩnh cũ (từng là khoảng chờ ~5-7s không tín hiệu duy nhất trong app, critique
        // 2026-08-25) bằng ink-bloom (.mind-loading-ink, src/index.css) — đọc như canvas đang được vẽ
        // ra, không phải màn hình đứng yên/hỏng.
        <div
          className="h-full flex flex-col items-center justify-center gap-3 text-[13px]"
          style={{ color: 'var(--c-text-muted, #6b6e96)' }}
        >
          <div
            className="mind-loading-ink"
            aria-hidden="true"
            style={mauNhanDien !== undefined ? ({ '--mind-ink-h': mauNhanDien } as React.CSSProperties) : undefined}
          />
          <span>Đang mở bảng…</span>
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
