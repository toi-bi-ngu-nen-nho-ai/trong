// Di trú MỘT LẦN: bảng cũ (docId 'board' cố định, từ trước khi có BoardGallery) chưa có metadata
// trong store 'boards' → tự tạo một bản ghi cho nó, để nó xuất hiện trong danh sách sau khi cập
// nhật, không cần thao tác gì từ người dùng. Xem spec 2026-08-19-board-gallery-design.md §2.6.
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'

import { SPECIALTIES } from '../data'
import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import type { BangMeta } from './boardMeta'

const TEN_CSDL_BANG = 'drtrong-board'
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

// Giống HAN_GIO_MAC_DINH_MS của EdgelessBoard.tsx — 4 giây là hào phóng cho IndexedDB cục bộ (bình
// thường xong trong vài chục ms), nhưng vẫn chặn treo vô thời hạn nếu IndexedDB hỏng vĩnh viễn.
const HAN_GIO_MAC_DINH_MS = 4000

// Bản sao cục bộ của doiCoHanGio() (EdgelessBoard.tsx, không export) — cùng lý do đã ghi ở đầu file
// cho việc lặp lại cụm TestWorkspace/IndexedDBDocSource/IndexedDBBlobSource: không tách helper dùng
// chung giữa hai file trong phạm vi lượt sửa này. `waitForSynced()` KHÔNG tự bỏ cuộc khi IndexedDB
// hỏng vĩnh viễn — DocEngine thử lại mỗi 5 giây vô thời hạn (framework/sync/src/doc/peer.ts,
// syncRetryLoop) — await trần trên nó sẽ treo diTruBangCuNeuCo() MÃI MÃI trong đúng tình huống mà
// hàm này chạy (lúc BoardGallery mount lần đầu, ngay khi app khởi động).
function doiCoHanGio<T>(hua: Promise<T>, hanGioMs: number): Promise<T | 'het-gio'> {
  let idTimer: ReturnType<typeof setTimeout>
  const homHanGio = new Promise<'het-gio'>((giai) => {
    idTimer = setTimeout(() => giai('het-gio'), hanGioMs)
  })
  return Promise.race([hua, homHanGio]).finally(() => clearTimeout(idTimer))
}

export async function diTruBangCuNeuCo(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}): Promise<void> {
  const dsHienCo = await idbGetAll<BangMeta>(IDB_STORES.boards)
  if (dsHienCo.some((b) => b.id === 'board')) return

  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }
  const hanGioMs = tuyChon?.hanGioMs ?? HAN_GIO_MAC_DINH_MS

  // KHÔNG truyền `idGenerator` — cùng lý do đã ghi ở EdgelessBoard.tsx (fix bug id trùng lúc remount):
  // hàm này CHỈ ĐỌC (`store.root?.children`, không bao giờ `addBlock`/`createDoc`) nên thuật toán
  // sinh id không ảnh hưởng hành vi hiện tại, nhưng để lại `createAutoIncrementIdGenerator()` ở đây
  // là một bẫy — nếu hàm di trú này sau này được mở rộng để ghi khối, đúng lớp bug đó sẽ tái xuất.
  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    docSources,
    blobSources,
  })
  try {
    // CHỜ ĐỒNG BỘ TRƯỚC RỒI MỚI `meta.initialize()` — thứ tự NGƯỢC với taoHoacMoBang() (EdgelessBoard.tsx).
    // Lý do: `meta.initialize()` ghi `pages = []` cục bộ ngay trên Y.Doc RỖNG trong bộ nhớ nếu
    // `_proxy.pages` chưa có giá trị. Gọi nó TRƯỚC `waitForSynced()` (như taoHoacMoBang() làm, chấp
    // nhận được ở đó vì có nhánh `createDoc` dự phòng nếu doc "biến mất") tạo ra một cuộc ĐUA CRDT
    // thật: nếu bản ghi từ xa (chứa đăng ký bảng 'board' cũ) ĐANG TRÊN ĐƯỜNG kéo về cùng lúc ta gán
    // `pages = []` cục bộ, hai giá trị `pages` (một rỗng cục bộ, một có nội dung từ xa) ĐUA NHAU ở
    // CÙNG một khoá Y.Map — Yjs hoà giải theo clientID/clock, THẮNG THUA NGẪU NHIÊN theo clientID
    // sinh ngẫu nhiên của từng Y.Doc. Đo được chập chờn thật khi viết ca kiểm Task 1 (~2/5 lượt chạy
    // `getDoc('board')` trả về null dù dữ liệu vẫn còn nguyên trong docSources) — đúng dấu hiệu của
    // một cuộc đua CRDT, không phải lỗi logic. diTruBangCuNeuCo() KHÔNG BAO GIỜ gọi `createDoc`/
    // `addDocMeta` (chỉ đọc), nên không cần `meta.initialize()` chạy trước lúc nào cả — gọi SAU khi
    // `waitForSynced()` xong nghĩa là ta đã BIẾT chắc bản ghi từ xa (nếu có) đã được áp dụng, nên
    // guard `if (!_proxy.pages)` của `initialize()` chỉ còn đúng nghĩa "máy mới, chưa từng có gì".
    workspace.start()
    const ketQua = await doiCoHanGio(workspace.waitForSynced(), hanGioMs)
    if (ketQua === 'het-gio') {
      // Hàm này CHỈ ĐỌC — không như taoHoacMoBang(), không có nội dung người dùng nào đang chờ ghi
      // để phải rơi về workspace bộ nhớ. Hết giờ ở đây nghĩa là "chưa di trú được lần này" — bỏ
      // cuộc êm, lượt mount BoardGallery kế tiếp (lần sau mở app) sẽ tự thử lại từ đầu.
      console.warn(
        `diTruBangCuNeuCo: không đồng bộ được với IndexedDB trong ${hanGioMs}ms — bỏ qua lượt di ` +
          'trú này, thử lại ở lần mở app sau.',
      )
      return
    }
    workspace.meta.initialize()

    const doc = workspace.getDoc('board')
    if (!doc) return // Máy mới, chưa từng có bảng cũ — không làm gì.

    const store = doc.getStore({ extensions: storeManager.get('store') })
    doc.load()

    const coNoiDungThat = store.root?.children.some((khoi) => khoi.flavour === 'affine:surface')
    if (!coNoiDungThat) return

    const bayGio = Date.now()
    const meta: BangMeta = {
      id: 'board',
      ten: 'Bảng đầu tiên',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    }
    await idbPut(IDB_STORES.boards, meta)
  } finally {
    workspace.forceStop()
  }
}
