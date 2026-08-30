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
import { ganDongBoToaDoSauHieuUng, type ViewportCoDoLai } from './dong-bo-toa-do-viewport'
import { apDungViewportChoIOS } from './viewport-ios'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'
import { capNhatSauKhiRoiBang, ghepNoiDungTimKiem, trichVanBanTuCanvas, trichVanBanTuKhoi } from './boardMeta'

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

// Ghi đè token vendor bằng màu thương hiệu của app — PHẢI đứng SAU import theme ở trên (cùng độ
// đặc hiệu thì luật khai sau thắng; xem chú thích trong chính file đó về lý do chọn độ đặc hiệu).
import './cau-noi-thuong-hieu.css'

import { viewExtensions } from './extensions'

// Phải chạy Ở ĐÂY — top-level module, trước khi bất kỳ Viewport nào được dựng (bên trong
// BlockStdScope, mount trong useEffect bên dưới). Xem viewport-ios.ts để biết vì sao thứ tự này
// bắt buộc (SKIP_REFRESH_DURING_GESTURE là field initializer, chốt cứng lúc constructor chạy).
apDungViewportChoIOS()

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

/**
 * Bộ extension cho chế độ edgeless, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Có hàm này vì `xuatAnhBang.ts` cũng cần mount một cây Lit (bảng ngầm để xuất PNG) và KHÔNG được
 * phép tự dựng một `ViewExtensionManager` thứ hai: `.get('edgeless')` chạy chuỗi
 * `ViewExtensionProvider.setup() → effect() → effects()`, tức là `customElements.define(...)` cho
 * toàn bộ thẻ Lit — gọi lần hai trên cùng tên thẻ là `NotSupportedError` ném thẳng ra, hỏng cả
 * bảng vẽ lẫn lượt xuất. Xuất một hàm rẻ hơn xuất chính `viewManager` (bên ngoài không cần biết
 * manager tồn tại, chỉ cần đúng mảng extension).
 */
export function layExtensionsEdgeless() {
  return viewManager.get('edgeless')
}

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

// Hạn giờ đợi NỘI DUNG của một doc ĐÃ ĐĂNG KÝ hiện ra sau `doc.load()`. Xem `doiNoiDungToi`.
const HAN_GIO_NOI_DUNG_MAC_DINH_MS = 3000

/**
 * Đợi tới khi `store` có khối gốc KÈM con `affine:surface`, hoặc hết giờ.
 *
 * Tồn tại vì nội dung subdoc tới BẤT ĐỒNG BỘ: `workspace.waitForSynced()` chỉ nói doc GỐC đã đồng
 * bộ, còn subdoc chỉ được yêu cầu khi `doc.load()` chạy — `TestDoc._initSubDoc` đặt `_loaded=false`
 * rồi đợi sự kiện 'subdocs' (framework/store/src/test/test-doc.ts:22-33). Trong cửa sổ đó
 * `store.root` là `null` CHO MỘT BẢNG CÓ NỘI DUNG.
 *
 * KHÔNG dùng được `waitForSynced()` cho việc này: nó `return` ngay khi trạng thái đang là `Synced`
 * (framework/sync/src/doc/engine.ts:268), mà ngay sau `doc.load()` engine thường vẫn đang ở Synced
 * vì chưa kịp xếp subdoc vào hàng đợi — nên lượt await đó trả về tức thì và không đợi gì cả.
 * Kiểm THẲNG trạng thái muốn có là cách duy nhất không phải đoán nội bộ của engine.
 */
async function doiNoiDungToi(
  store: { root?: { children: Array<{ flavour: string }> } | null },
  hanGioMs: number,
): Promise<void> {
  const batDau = Date.now()
  while (Date.now() - batDau < hanGioMs) {
    if (store.root?.children.some((khoi) => khoi.flavour === 'affine:surface')) return
    await new Promise((r) => setTimeout(r, 30))
  }
}

// Xuất PNG/PDF KHÔNG có UI trong màn vẽ này (phản hồi thật 2026-08-27, lần 3: "xoá luôn nút ... của
// đổi tên/chuyên khoa xuất file" ở màn vẽ, "tính năng xuất file chuyển ra board") — nút xuất sống
// trong menu "⋯" của THẺ bảng ở lưới danh sách (DanhSachBang.tsx).
// Từ 2026-08-30 lượt xuất đó KHÔNG còn đóng gói lại ảnh chụp khung nhìn nữa: ./xuatAnhBang.ts mở
// bảng NGẦM rồi dựng ảnh từ tài liệu CRDT qua ExportManager, đóng khung theo `gfx.elementsBound`.
// Nó dùng chung `taoHoacMoBang()` và `layExtensionsEdgeless()` của file này — đó là toàn bộ quan hệ
// giữa hai module; component bên dưới không biết gì về việc xuất và không cần biết.

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
// Nối tiếp các lượt mở CÙNG một `boardId` — mỗi lượt đợi lượt trước xong mới bắt đầu.
//
// Vì sao cần: hai lượt `taoHoacMoBang()` chạy CHỒNG NHAU trên cùng một bảng MỚI đều thấy
// `getDoc()` trả null (lượt kia chưa kịp đẩy metadata), nên cả hai cùng `createDoc` + seed, rồi
// CRDT hợp nhất cả hai lượt ghi → doc có 2 `affine:page` và 2 `affine:surface`. Bản trùng không
// lộ ra ngay: mỗi lượt chỉ thấy seed của chính nó, phải tới lần mở KẾ TIẾP mới thấy cả hai.
// Hậu quả khi đó: `gfx.surface` bám vào surface MỒ CÔI (không phải con của `store.root`) nên
// `gfx.surfaceComponent` null vĩnh viễn — bảng vẽ không render được gì.
// Đo được 2026-08-30 ở dev: React StrictMode mount-rồi-remount tạo đúng cặp lượt chồng nhau này,
// và một bảng vừa tạo xong đã hỏng ngay. Bản build production không bật StrictMode nên hiếm gặp,
// nhưng cửa sổ đua vẫn thật (mở app ở hai tab cùng lúc).
//
// Sau khi nối tiếp, lượt thứ hai thấy `getDoc()` khác null nên đi nhánh "doc đã đăng ký": đợi nội
// dung tới rồi mới quyết seed, và nội dung đã có sẵn nhờ lượt đầu — không seed nữa.
//
// GIỚI HẠN đã biết: khoá này ở module-scope nên chỉ phủ được cùng một ngữ cảnh JS. Hai TAB trình
// duyệt cùng mở một bảng mới vẫn đua được với nhau — muốn đóng hẳn phải là khoá liên-tab (Web
// Locks API), chưa cần tới mức đó.
const luotMoDangCho = new Map<string, Promise<void>>()

export async function taoHoacMoBang(boardId: string, tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
  khongSeed?: boolean
  hanGioNoiDungMs?: number
}) {
  const cho = luotMoDangCho.get(boardId)
  let bao!: () => void
  const luotCuaToi = new Promise<void>((giai) => {
    bao = giai
  })
  luotMoDangCho.set(boardId, luotCuaToi)
  // `cho` có thể đã bị từ chối — lượt trước hỏng KHÔNG được kéo lượt này hỏng theo, nó chỉ cần
  // biết lượt kia đã kết thúc.
  if (cho) await cho.catch(() => {})
  try {
    return await moBangThat(boardId, tuyChon)
  } finally {
    bao()
    // Chỉ xoá nếu mình vẫn là lượt cuối — nếu đã có lượt khác xếp hàng sau, để nguyên cho nó.
    if (luotMoDangCho.get(boardId) === luotCuaToi) luotMoDangCho.delete(boardId)
  }
}

async function moBangThat(boardId: string, tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
  khongSeed?: boolean
  hanGioNoiDungMs?: number
}) {
  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }
  const hanGioMs = tuyChon?.hanGioMs ?? HAN_GIO_MAC_DINH_MS
  const hanGioNoiDungMs = tuyChon?.hanGioNoiDungMs ?? HAN_GIO_NOI_DUNG_MAC_DINH_MS

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
    // `getDoc()` trả null = doc CHƯA ĐĂNG KÝ trong metadata workspace, tức chưa từng có nội dung —
    // tín hiệu DUY NHẤT đáng tin để phân biệt "bảng mới tinh" với "bảng có nội dung đang trên đường
    // tới". Xem khối quyết định seed bên dưới.
    const laDocMoi = !doc
    if (!doc) {
      doc = workspace.createDoc(boardId)
    }
    const store = doc.getStore({ extensions: storeManager.get('store') })
    doc.load()

    // ─── Quyết định có SEED khối gốc hay không ────────────────────────────────────────────────
    //
    // Nhánh này tự hồi phục doc đã ĐĂNG KÝ trong metadata nhưng khối gốc (`affine:page`/
    // `affine:surface`) chưa bao giờ ghi xong — vd tab bị đóng đúng khe vài mili-giây giữa lượt ghi
    // metadata và lượt ghi khối. Không có nó thì lần mở kế tiếp ném `BlockSuiteError: This doc is
    // missing surface/root block` sâu trong `EditorHost.connectedCallback` — unhandled rejection
    // không ai bắt — và bảng hỏng vĩnh viễn từ đó, âm thầm.
    //
    // NHƯNG `!store.root` MỘT MÌNH KHÔNG ĐỦ để kết luận "doc này rỗng": nội dung subdoc tới bất
    // đồng bộ, nên `store.root` cũng là null trong cửa sổ vài trăm ms đầu của một bảng ĐẦY nội
    // dung (xem `doiNoiDungToi`). Seed trong cửa sổ đó ghi một `affine:page` + `affine:surface`
    // THỨ HAI vào chính doc đang có nội dung.
    // Đo được 2026-08-30 ở dev (React StrictMode mount hai lượt, hai `TestWorkspace` cùng chạm một
    // IndexedDB): bảng vừa tạo có 2 root và 2 surface; `gfx.surface` bám vào surface MỒ CÔI nên
    // `gfx.surfaceComponent` null vĩnh viễn — thanh công cụ vẽ ra nhưng không gì render được, và
    // lượt xuất PNG báo "sơ đồ chưa có nội dung" cho một sơ đồ đầy nội dung.
    //
    // Cách phân biệt: `laDocMoi` (`getDoc()` trả null ⇒ chưa đăng ký ⇒ chưa từng có nội dung).
    //   • Doc MỚI → seed NGAY, không đợi gì. Tạo bảng mới không phải trả thêm một mili-giây nào.
    //   • Doc ĐÃ ĐĂNG KÝ → ĐỢI nội dung tới trước đã. Chỉ khi hết giờ mà vẫn trống mới seed — đúng
    //     ca tự hồi phục mà nhánh này sinh ra để phục vụ, không phải một cuộc đua.
    // Đây KHÔNG phải `laLanDau` từng bị gỡ trước đây: cờ cũ được OR vào điều kiện seed (`laLanDau
    // || !store.root`) nên nó THÊM một đường seed đè lên nội dung có sẵn. Cờ này đi hướng ngược
    // lại — nó chỉ dùng để quyết định CÓ ĐỢI HAY KHÔNG, không bao giờ tự nó cho phép seed.
    let daGhiKhoiMoi = false
    if (tuyChon?.khongSeed) {
      // `khongSeed`: mở CHỈ ĐỌC, tuyệt đối không tạo nội dung (dùng bởi ./xuatAnhBang.ts). Bên gọi
      // tự đợi và tự kiểm `store.root`.
    } else {
      if (!laDocMoi && !store.root?.children.some((khoi) => khoi.flavour === 'affine:surface')) {
        await doiNoiDungToi(store, hanGioNoiDungMs)
      }
      if (!store.root) {
        const rootId = store.addBlock('affine:page', {})
        store.addBlock('affine:surface', {}, rootId)
        daGhiKhoiMoi = true
      } else if (!store.root.children.some((khoi) => khoi.flavour === 'affine:surface')) {
        // Nhánh hẹp hơn: đã có `store.root` nhưng thiếu hẳn con `affine:surface`. Khó xảy ra ĐỘC
        // LẬP với nhánh trên vì hai addBlock luôn nằm cùng một giao dịch Yjs, nhưng đây chính là
        // điều kiện literal mà lỗi runtime thật kiểm tra (`EdgelessRootService`, "missing surface
        // block"), nên rẻ để bọc thêm cho chắc.
        store.addBlock('affine:surface', {}, store.root.id)
        daGhiKhoiMoi = true
      }
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

// Xuất file (giờ dùng ảnh xem trước đã lưu) sống hẳn ở menu "⋯" của THẺ bảng trong
// DanhSachBang.tsx, và rename/đổi chuyên khoa cũng vốn đã ở đó từ trước — component này KHÔNG cần
// biết BoardGallery.tsx làm gì với chrome của nó (đúng tinh thần "file phải nhỏ" ghi ở đầu file).
// Hai lượt trước từng thêm forwardRef + useImperativeHandle riêng cho việc xuất PNG — bỏ hẳn (không
// phải giữ lại dead code): không còn nơi nào gọi qua ref nữa (phản hồi thật 2026-08-27, lần 3: "xoá
// luôn nút ... của đổi tên/chuyên khoa xuất file" ở màn vẽ).
export function EdgelessBoard({
  boardId,
  onReady,
}: {
  boardId: string
  // Báo cho BoardGallery.tsx biết canvas thật đã gắn xong (đúng lúc setDangMo(false) chạy) — dùng
  // để mờ dần lớp phủ ảnh xem trước (FLIP continuity, xem BoardGallery.tsx) thay vì tự đoán một
  // thời lượng cố định không khớp tốc độ mạng/máy thật.
  onReady?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  // Ref lớp bọc viewport — dùng cho phép đồng bộ lại toạ độ sau hiệu ứng vào màn (useEffect bên dưới).
  const viewportRef = useRef<HTMLDivElement>(null)
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
    // Có sửa NỘI DUNG thật trong phiên mở bảng này hay không — xem chú thích ở capNhatSauKhiRoiBang
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
      // Cập nhật metadata của bảng vừa đóng TRƯỚC khi tháo — `workspaceHienTai.forceStop()` ngay
      // dưới đóng DocEngine, sau đó không còn gì để đọc. Best-effort tuyệt đối: lỗi ở đây KHÔNG
      // được chặn dọn dẹp thật (forceStop() vẫn phải chạy).
      //
      // Ở ĐÂY TỪNG CÓ một lượt chụp ảnh xem trước: lấy `el.querySelector('canvas')` (canvas KHUNG
      // NHÌN), ép xuống 480×360, quét kênh alpha để phân biệt bảng trống, lấp nền theo --c-surface
      // rồi ghi `toDataURL('image/jpeg', 0.6)` vào `BangMeta.anhXemTruoc`. Gỡ HẲN 2026-08-30 (phản
      // hồi thật của chủ dự án): ảnh đó là NGUỒN GỐC của cả ba lỗi cùng lúc — thẻ ở lưới tái hiện
      // nét vẽ thay vì giữ icon chuyên khoa, "Xuất PNG" cho ra khung ảnh đổi theo pan/zoom (vì ảnh
      // CHÍNH LÀ khung nhìn), và chất lượng bệt (0,17 MP + JPEG 0.6, sau đó bọc PNG chỉ đóng đinh
      // artefact lại). Thẻ giờ luôn dùng huy hiệu chuyên khoa; xuất PNG dựng lại từ tài liệu CRDT
      // qua ./xuatAnhBang.ts. Không còn ai đọc `anhXemTruoc`, nên tiếp tục ghi nó chỉ là bơm hàng
      // trăm kB rác vào IndexedDB mỗi lần rời bảng — capNhatSauKhiRoiBang() còn chủ động bóc trường
      // đó ra để dọn dữ liệu đã ghi từ trước.
      //
      // Lượt gọi capNhatSauKhiRoiBang() thì Ở LẠI, và giờ chạy VÔ ĐIỀU KIỆN (trước đây nó nằm lồng
      // trong `if (canvasGoc && canvasGoc.width > 0 ...)` — điều kiện của việc CHỤP, không phải của
      // việc cập nhật): nó gánh bump capNhatLuc, backfill chuyenKhoa/tags và ghi noiDungTimKiem.
      try {
        // Trích văn bản NGAY TRƯỚC forceStop(). Tự lấy lại store qua
        // `workspaceHienTai.getDoc(boardId).getStore(...)` — con đường CHẮC CHẮN sống nếu
        // taoHoacMoBang đã resolve, không phụ thuộc bất kỳ state React nào có thể lệch nhịp lúc
        // unmount.
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
              // text/mindmap...), không lớp nào khai `text` ở kiểu CHUNG nên TypeScript từ chối gán
              // thẳng dù đúng ở runtime cho những lớp có field đó (đã xác nhận qua chính
              // element-model/{text,shape,connector}.ts của cây vendored, xem chú thích tại định
              // nghĩa trichVanBanTuCanvas trong boardMeta.ts).
              surfaceHienTai
                ? trichVanBanTuCanvas(surfaceHienTai.elementModels as unknown as Array<{ text?: unknown }>)
                : '',
            )
          }
        } catch {
          // Trích văn bản là tiện ích phụ (phục vụ tìm kiếm) — lỗi ở đây không được làm hỏng lượt
          // cập nhật metadata hay thao tác quay lại danh sách của người dùng.
        }
        void capNhatSauKhiRoiBang(boardId, coThayDoiNoiDung, noiDungTimKiemMoi)
      } catch {
        // Cập nhật metadata là tiện ích phụ — không được làm hỏng thao tác quay lại của người dùng.
      }
      litRender(null, el)
      workspaceHienTai?.forceStop()
    }
  }, [boardId])


  // ─── Đồng bộ lại toạ độ sau hiệu ứng vào màn ─────────────────────────────────────────────────
  // Cơ chế, bằng chứng đo được và lý do đầy đủ nằm ở ./dong-bo-toa-do-viewport.ts. Tóm tắt: bảng
  // mount BÊN TRONG lớp bọc đang chạy hiệu ứng FLIP, BlockSuite đo `getBoundingClientRect()` đúng
  // một lần lúc gắn (tính cả transform), và `ResizeObserver` của nó không bao giờ bắn vì transform
  // — nên số đo méo bị đóng đinh, mọi lượt chạm lệch nguyên khối.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    return ganDongBoToaDoSauHieuUng({
      viewport: el,
      // API nội bộ vendored, không có kiểu công khai. `ganDongBoToaDoSauHieuUng` bọc lượt gọi này
      // trong try/catch nên thượng nguồn đổi hình dạng thì mất phép đồng bộ, không gãy thao tác.
      layViewport: () =>
        (el.querySelector('drt-edgeless-root') as unknown as { gfx?: { viewport?: ViewportCoDoLai } } | null)
          ?.gfx?.viewport,
    })
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
      ref={viewportRef}
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
        // Chữ xám tĩnh cũ (khoảng chờ ~5-7s không tín hiệu, critique 2026-08-25) → chấm tròn
        // ink-bloom → 4 vòng hiệu ứng tự vẽ icon chuyên khoa (đều đọc sai) → nay BA CHẤM nhảy so
        // le kiểu template phổ thông (VeChuyenKhoaDangTai), ăn currentColor của div bọc ngay dưới.
        <div
          className="h-full flex flex-col items-center justify-center gap-3 text-[13px]"
          style={{ color: 'var(--c-text-muted, #6b6e96)' }}
        >
          <VeChuyenKhoaDangTai />
          <span>Đang mở bảng…</span>
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
