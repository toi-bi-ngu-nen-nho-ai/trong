// Mở hoặc tạo một doc BlockSuite — workspace, hạn giờ, chống đua, seed khối gốc.
//
// Bóc ra khỏi EdgelessBoard.tsx ngày 2026-09-04 NGUYÊN VĂN (không sửa một dòng logic nào) để chế độ
// TRANG (TrangBaiViet.tsx) dùng chung đúng cơ chế này thay vì chép lại. Mọi comment bên dưới nói về
// các cuộc đua ĐÃ ĐO THẬT trên máy — đừng rút gọn chúng.
//
// File này KHÔNG biết gì về React và KHÔNG biết gì về chế độ hiển thị. Nó chỉ trả về `store` +
// `workspace`; ai mount cây Lit nào lên đó là việc của bên gọi.
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'

// `LoaiMuc` khai TẠM THỜI ở đây, không phải mucMeta.ts — vì chiều phụ thuộc bắt buộc là
// mo-doc → mucMeta, không được ngược lại: mucMeta.ts nằm NGOÀI ranh giới nạp chậm D13 (App.tsx
// import kiểu từ nó), còn mo-doc.ts thì import `@blocksuite/*` nên PHẢI ở trong ranh giới. Khai
// LoaiMuc ở mucMeta.ts rồi import ngược lại đây sẽ kéo cả chuỗi import của mo-doc.ts ra ngoài ranh
// giới đó qua mucMeta. Plan 2 sẽ dời khai báo này sang mucMeta.ts và mo-doc.ts import lại.
export type LoaiMuc = 'bai-viet' | 'so-do'

export const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

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
// Vì sao cần: hai lượt `taoHoacMoDoc()` chạy CHỒNG NHAU trên cùng một bảng MỚI đều thấy
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

export async function taoHoacMoDoc(boardId: string, loai: LoaiMuc, tuyChon?: {
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
    return await moDocThat(boardId, loai, tuyChon)
  } finally {
    bao()
    // Chỉ xoá nếu mình vẫn là lượt cuối — nếu đã có lượt khác xếp hàng sau, để nguyên cho nó.
    if (luotMoDangCho.get(boardId) === luotCuaToi) luotMoDangCho.delete(boardId)
  }
}

async function moDocThat(boardId: string, loai: LoaiMuc, tuyChon?: {
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
        `taoHoacMoDoc: không đồng bộ được với IndexedDB trong ${hanGioMs}ms — dùng bảng chỉ trong ` +
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
        // Bài viết cần một note + một đoạn văn rỗng để mở ra là có chỗ gõ ngay.
        // `page-root-block.ts:162` của thượng nguồn tự tạo note khi bấm vào vùng trống, nên đây là
        // TIỆN NGHI chứ không phải bắt buộc — nhưng thiếu nó thì bài mới mở ra là một trang trắng
        // không con trỏ, đọc như lỗi.
        //
        // Sơ đồ VẪN chỉ page+surface như trước: một note mặc định trên canvas là một ô trống lơ
        // lửng người dùng không đặt ở đó.
        if (loai === 'bai-viet') {
          const noteId = store.addBlock('affine:note', {}, rootId)
          store.addBlock('affine:paragraph', {}, noteId)
        }
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
          'taoHoacMoDoc: lượt ghi nội dung ban đầu chưa xác nhận đẩy xong lên IndexedDB trong ' +
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
