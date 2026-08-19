// Di trú MỘT LẦN: bảng cũ (docId 'board' cố định, từ trước khi có BoardGallery) chưa có metadata
// trong store 'boards' → tự tạo một bản ghi cho nó, để nó xuất hiện trong danh sách sau khi cập
// nhật, không cần thao tác gì từ người dùng. Xem spec 2026-08-19-board-gallery-design.md §2.6.
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'

import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import type { BangMeta } from './boardMeta'

const TEN_CSDL_BANG = 'drtrong-board'
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

export async function diTruBangCuNeuCo(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
}): Promise<void> {
  const dsHienCo = await idbGetAll<BangMeta>(IDB_STORES.boards)
  if (dsHienCo.some((b) => b.id === 'board')) return

  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }

  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
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
    await workspace.waitForSynced()
    workspace.meta.initialize()

    const doc = workspace.getDoc('board')
    if (!doc) return // Máy mới, chưa từng có bảng cũ — không làm gì.

    const store = doc.getStore({ extensions: storeManager.get('store') })
    doc.load()

    const coNoiDungThat = store.root?.children.some((khoi) => khoi.flavour === 'affine:surface')
    if (!coNoiDungThat) return

    const bayGio = Date.now()
    const meta: BangMeta = { id: 'board', ten: 'Bảng đầu tiên', taoLuc: bayGio, capNhatLuc: bayGio }
    await idbPut(IDB_STORES.boards, meta)
  } finally {
    workspace.forceStop()
  }
}
