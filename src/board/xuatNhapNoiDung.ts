// Xuất / nhập NỘI DUNG một mục (doc CRDT của BlockSuite) ra/vào JSON — phần Task 3 cố ý để lại.
//
// ─── Ranh giới (D13) ────────────────────────────────────────────────────────────────────────
// File này import `./mo-doc` (kéo theo cả khối BlockSuite), nên `App.tsx` CHỈ được gọi nó qua
// `import()` ĐỘNG, đúng khuôn `./diTruBangCu.ts` và `./index.tsx` đã dùng. Một dòng
// `import { xuatSnapshotMuc } from './board/xuatNhapNoiDung'` ở đầu App.tsx là kéo ~4 MB bảng vẽ
// vào chunk vỏ app cho MỌI người dùng, kể cả người chưa từng mở một sơ đồ nào.
// Cổng canh: `__tests__/ranh-gioi-nap-bang.spec.ts`, describe "App.tsx — ranh giới D13…".
//
// ─── Vì sao dùng `store.getTransformer()` chứ không tự dựng `Transformer` ───────────────────
// `Transformer` (framework/store/src/transformer/transformer.ts) đòi ba thứ: `schema`, `blobCRUD`,
// `docCRUD`. Cả ba đã có sẵn ĐÚNG một chỗ: `Store.getTransformer()` (store.ts:1168) lấy `schema`
// từ chính store (Schema dựng từ `storeManager.get('store')` mà `mo-doc.ts` truyền vào), `blobCRUD`
// từ `workspace.blobSync`, `docCRUD` từ `workspace.createDoc/getDoc/removeDoc`. Tự dựng lại bằng
// tay là chép nguyên khối đó ra ngoài rồi phải tự đồng bộ khi thượng nguồn đổi — không được gì.
//
// ─── Vì sao NHẬP không dùng `Transformer.snapshotToDoc()` ───────────────────────────────────
// `snapshotToDoc` gọi `docCRUD.create(meta.id)` → `workspace.createDoc(id)`, mà hàm đó NÉM
// ("doc already exists") khi doc đã đăng ký — và sau `taoHoacMoDoc()` thì nó LUÔN đã đăng ký.
// Còn xoá khối gốc đi để nhập nguyên cây snapshot cũng không được: `DocCRUD.deleteBlock` thoát sớm
// ở `if (!parent) return` (crud.ts:161), tức XOÁ ROOT LÀ VÔ TÁC DỤNG — đo thật ở bước spike, root
// vẫn còn nguyên sau lời gọi. Nhập cây snapshot khi root cũ chưa chết sẽ tạo `affine:page` THỨ HAI:
// đúng lỗi hai-root đã đo 2026-08-30 (xem chú thích dài trong mo-doc.ts) — `gfx.surface` bám vào
// surface mồ côi nên bảng vẽ không render được gì mà không báo lỗi nào.
// Nên hướng đi là: GIỮ khối gốc `taoHoacMoDoc()` vừa mở/seed, xoá sạch CON của nó (những khối này
// có cha nên xoá được thật), khôi phục props của root từ snapshot (tiêu đề bài viết sống ở đây),
// rồi nhập từng con của snapshot vào dưới root đó. Id của các khối con giữ NGUYÊN như lúc xuất —
// quan trọng vì phần tử canvas trong `affine:surface` tham chiếu khối theo id.
// Hệ quả đã biết và chấp nhận: id của riêng khối `affine:page` đổi sau mỗi lượt nhập. Không có gì
// tham chiếu tới nó (mọi tham chiếu đều trỏ vào note/ảnh/phần tử canvas).
import type { BlockSnapshot, DocSnapshot } from '@blocksuite/store'
import type { BlobSource, DocSource } from '@blocksuite/sync'

import { taoHoacMoDoc } from './mo-doc'
import type { LoaiMuc } from './mucMeta'

/**
 * Một ảnh chèn, đã mã hoá để đi được trong JSON.
 *
 * `id` là khoá blob của BlockSuite — một BĂM NỘI DUNG (sha của byte ảnh), không phải id ngẫu nhiên.
 * Nhờ vậy nhập lại đúng ảnh cũ thì `sourceId` trong khối `affine:image` khớp mà không cần ánh xạ
 * lại id nào.
 */
export type AnhMuc = {
  id: string
  /** MIME thật của ảnh. Giữ lại vì `Blob` dựng lại từ base64 không tự biết mình là png hay jpeg. */
  mime: string
  /** Byte ảnh, base64 (không có tiền tố `data:`). */
  b64: string
}

/** Toàn bộ NỘI DUNG của một mục, ở dạng JSON thuần — đúng thứ được ghi vào file xuất. */
export type NoiDungMuc = {
  snapshot: DocSnapshot
  anh: AnhMuc[]
  /**
   * Blob id của những ảnh CÓ khối `affine:image` trong `snapshot` nhưng KHÔNG đọc được byte lúc
   * xuất (blob mất khỏi kho, `readFromBlob` ném giữa chừng). Không có khoá này thì một lượt sao
   * lưu thiếu ảnh trông y hệt một lượt trọn vẹn — bên gọi phải GỌI TÊN mục đó cho người dùng.
   * Không bắt buộc: file xuất từ bản trước vòng sửa này đơn giản là thiếu khoá.
   */
  anhThieu?: string[]
}

/** Kết quả một lượt NHẬP nội dung — bên gọi cần biết mục nào về máy mà không đủ ảnh. */
export type KetQuaNhap = {
  /**
   * `sourceId` của những khối ảnh đã bị BỎ khỏi cây trước khi ghi, vì gói không mang byte và kho
   * blob trên máy cũng không còn. Xem chú thích trong `nhapSnapshotMuc`.
   */
  anhThieu: string[]
}

/**
 * Nguồn lưu trữ — CHỈ ca kiểm truyền, để thay IndexedDB thật bằng bộ nhớ. App thật gọi không đối
 * số này và `taoHoacMoDoc` tự dùng `IndexedDBDocSource/IndexedDBBlobSource` của CSDL `drtrong-board`.
 */
export type NguonBang = {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
}

/**
 * Hạn giờ đợi lượt ghi của phép NHẬP đẩy xong xuống IndexedDB.
 *
 * `waitForSynced()` KHÔNG tự bỏ cuộc khi IndexedDB hỏng — DocEngine thử lại mỗi 5 giây vô thời hạn
 * (framework/sync/src/doc/peer.ts). Một `await` trần ở đây sẽ treo màn "Đồng bộ dữ liệu" mãi mãi
 * thay vì báo lỗi. Rộng rãi hơn hạn 4 giây của `mo-doc.ts` vì lượt ghi này to hơn nhiều (cả cây
 * khối + ảnh) và chạy theo lô nhiều mục liền nhau.
 */
const HAN_GIO_GHI_MS = 8000

function doiCoHanGio<T>(hua: Promise<T>, hanGioMs: number): Promise<T | 'het-gio'> {
  let idTimer: ReturnType<typeof setTimeout>
  const homHanGio = new Promise<'het-gio'>((giai) => {
    idTimer = setTimeout(() => giai('het-gio'), hanGioMs)
  })
  return Promise.race([hua, homHanGio]).finally(() => clearTimeout(idTimer))
}

/**
 * Byte → base64. Cắt lô vì `String.fromCharCode` nhận đối số qua ngăn xếp — trải nguyên một ảnh
 * vài trăm nghìn byte là tràn ngăn xếp (cùng lý do đã ghi ở `byteThanhChuoiLatin1` trong
 * `xoaNoiDungBang.ts`).
 */
function byteThanhB64(byte: Uint8Array): string {
  const LO = 8192
  let s = ''
  for (let i = 0; i < byte.length; i += LO) {
    s += String.fromCharCode(...byte.subarray(i, i + LO))
  }
  return btoa(s)
}

// Trả về `ArrayBuffer` chứ không phải `Uint8Array`: hàm khởi tạo `Blob` chỉ nhận `BlobPart`, mà
// `Uint8Array` mặc định được suy kiểu trên `ArrayBufferLike` (gồm cả `SharedArrayBuffer`) nên không
// gán được — dựng bộ đệm tường minh ở đây gọn hơn một phép ép kiểu ở chỗ gọi.
function b64ThanhByte(b64: string): ArrayBuffer {
  const s = atob(b64)
  const dem = new ArrayBuffer(s.length)
  const byte = new Uint8Array(dem)
  for (let i = 0; i < s.length; i++) byte[i] = s.charCodeAt(i)
  return dem
}

const FLAVOUR_ANH = 'affine:image'

/** `sourceId` của một khối, nếu đó là khối ảnh trỏ vào kho blob (bỏ qua đường dẫn `/…` của zip). */
function idBlobCuaKhoiAnh(nut: BlockSnapshot): string | undefined {
  if (nut.flavour !== FLAVOUR_ANH) return undefined
  const sid = (nut.props as { sourceId?: unknown } | undefined)?.sourceId
  // `ImageBlockTransformer.fromSnapshot` cũng bỏ qua `sourceId` bắt đầu bằng '/' (đường dẫn trong
  // file zip, không phải khoá blob) — soi cùng một điều kiện để không bỏ nhầm khối nào.
  return typeof sid === 'string' && sid !== '' && !sid.startsWith('/') ? sid : undefined
}

/** Duyệt cây snapshot, gom `sourceId` của mọi khối ảnh. */
function idAnhTrongCay(nut: BlockSnapshot, ra: Set<string> = new Set()): Set<string> {
  const sid = idBlobCuaKhoiAnh(nut)
  if (sid) ra.add(sid)
  for (const con of nut.children ?? []) idAnhTrongCay(con, ra)
  return ra
}

/**
 * BẢN SAO cây snapshot đã bỏ hẳn những khối ảnh có id nằm trong `idBo` — không đụng cây gốc
 * (`noiDung` là dữ liệu của bên gọi, sửa tại chỗ là làm hỏng gói cho mọi lượt dùng sau).
 */
function boKhoiAnhThieu(nut: BlockSnapshot, idBo: Set<string>): BlockSnapshot {
  return {
    ...nut,
    children: (nut.children ?? [])
      .filter((con) => {
        const sid = idBlobCuaKhoiAnh(con)
        return !(sid && idBo.has(sid))
      })
      .map((con) => boKhoiAnhThieu(con, idBo)),
  }
}

/**
 * Đọc NỘI DUNG của một mục ra JSON: cây khối + mọi ảnh chèn.
 *
 * Trả `undefined` khi không dựng được snapshot (doc hỏng) — `Transformer.docToSnapshot` nuốt lỗi và
 * trả `undefined`, ta chỉ chuyển tiếp; bên gọi quyết định báo cho người dùng thế nào.
 *
 * LƯU Ý về tác dụng phụ: `taoHoacMoDoc` SEED khối gốc cho một doc chưa từng tồn tại, nên xuất một
 * mục mà người dùng chưa từng mở sẽ tạo ra doc rỗng của nó. Vô hại (đúng bằng thứ lần mở đầu tiên
 * sẽ tạo), và đổi lại ta không phải chép lại toàn bộ phần dựng workspace + đua đồng bộ của mo-doc.ts.
 */
export async function xuatSnapshotMuc(
  id: string,
  loai: LoaiMuc,
  tuyChon?: NguonBang,
): Promise<NoiDungMuc | undefined> {
  const { workspace, store } = await taoHoacMoDoc(id, loai, tuyChon)
  try {
    const bien = store.getTransformer()
    const snapshot = bien.docToSnapshot(store)
    if (!snapshot) return undefined

    // `ImageBlockTransformer.toSnapshot` chỉ GHI SỔ `blockId → sourceId` vào `pathBlobIdMap`; nó
    // không đọc byte ảnh. Phải tự đi lấy, đúng như `ZipTransformer.exportDocs` của thượng nguồn.
    const anh: AnhMuc[] = []
    // Ảnh đọc hỏng KHÔNG được biến mất không dấu vết: đây là đường SAO LƯU, một bản thiếu ảnh mà
    // người dùng tin là đầy đủ sẽ được ghi đè lên bản tốt trước đó. Ghi id lại và trả về cho bên
    // gọi gọi tên mục.
    const anhThieu: string[] = []
    for (const idBlob of new Set(bien.assetsManager.getPathBlobIdMap().values())) {
      // Hỏng ở MỘT ảnh chỉ được mất ĐÚNG ảnh đó, không kéo cả bài viết ra khỏi bản sao lưu: một
      // bài thiếu một ảnh vẫn đáng sao lưu hơn nhiều so với không có bản nào. Bọc cả lượt đọc chứ
      // không chỉ kiểm `!blob` — `readFromBlob` còn đoán kiểu file bằng `await import('file-type')`
      // và `arrayBuffer()` cũng ném được, hai đường đó không đi qua nhánh kiểm null bên dưới.
      try {
        await bien.assetsManager.readFromBlob(idBlob)
        const blob = bien.assets.get(idBlob)
        // Ảnh mất khỏi kho blob (dọn rác quá tay, đồng bộ dở dang).
        if (!blob) {
          console.warn(
            `xuatSnapshotMuc: mục ${id} tham chiếu ảnh ${idBlob} không còn trong kho blob.`,
          )
          anhThieu.push(idBlob)
          continue
        }
        anh.push({
          id: idBlob,
          mime: blob.type,
          b64: byteThanhB64(new Uint8Array(await blob.arrayBuffer())),
        })
      } catch (loi) {
        console.warn(`xuatSnapshotMuc: không đọc được ảnh ${idBlob} của mục ${id}`, loi)
        anhThieu.push(idBlob)
      }
    }
    return { snapshot, anh, anhThieu }
  } finally {
    workspace.forceStop()
  }
}

/**
 * Ghi NỘI DUNG từ JSON vào doc của mục — THAY HẲN nội dung đang có (cùng ngữ nghĩa "đè theo id" mà
 * `handleImportData` dùng cho metadata), không trộn lẫn.
 *
 * Xem khối chú thích đầu file về việc vì sao phải giữ lại khối gốc thay vì nhập nguyên cây snapshot.
 *
 * ─── KHÔNG NGUYÊN TỬ, và vì sao không đảo được thứ tự ────────────────────────────────────────
 * Lượt ghi này xoá con của root TRƯỚC rồi mới dựng lại. Bất kỳ lượt ném nào sau bước xoá (khối lạ,
 * hết hạn `waitForSynced`) để doc ở trạng thái DỞ DANG, và nội dung cũ thì đã mất — bên gọi phải
 * nói đúng điều đó với người dùng ("ghi dở dang", không phải "chưa ghi được"; xem `handleConfirmImport`).
 * Hướng "dựng cây mới xong mới xoá cây cũ" KHÔNG dùng được: snapshot giữ NGUYÊN id của các khối con
 * (bắt buộc — phần tử canvas trong `affine:surface` tham chiếu khối theo id, xem chú thích đầu file),
 * nên khi nhập lại chính bản sao lưu của máy này, mọi id sắp chèn đều đang tồn tại trong doc; chèn
 * trước khi xoá là đâm thẳng vào id trùng. Muốn thật sự nguyên tử thì phải dựng ở một doc tạm rồi
 * hoán đổi — việc đó thuộc phần vá "Hoàn tác nội dung" (Task 4b), không làm ở đây.
 */
export async function nhapSnapshotMuc(
  id: string,
  loai: LoaiMuc,
  noiDung: NoiDungMuc,
  tuyChon?: NguonBang,
): Promise<KetQuaNhap> {
  // Kiểm hình dạng TRƯỚC khi mở doc, không phải sau. `noiDung` tới thẳng từ một file JSON người
  // dùng chọn — kiểu TypeScript ở trên không hứa gì về nó lúc chạy. Và `taoHoacMoDoc` SEED một doc
  // rỗng cho id chưa tồn tại, nên mở trước rồi mới phát hiện dữ liệu hỏng sẽ để lại đúng thứ rác
  // mà lượt nhập này không hề định tạo.
  const khoiGoc = (noiDung as Partial<NoiDungMuc> | null | undefined)?.snapshot?.blocks
  if (!khoiGoc || typeof khoiGoc !== 'object' || !Array.isArray(khoiGoc.children)) {
    throw new Error(`nhapSnapshotMuc: mục ${id} trong file không có cây khối hợp lệ.`)
  }
  const danhSachAnh = Array.isArray(noiDung.anh) ? noiDung.anh : []

  const { workspace, store } = await taoHoacMoDoc(id, loai, tuyChon)
  try {
    const bien = store.getTransformer()

    // Nạp ảnh vào `assets` TRƯỚC khi nhập khối: `ImageBlockTransformer.fromSnapshot` đọc từ đúng
    // map này rồi `writeToBlob` xuống kho blob của workspace. Nó bỏ qua hoàn toàn nếu map rỗng
    // (`if (!payload.assets.isEmpty() && …)`), nên thứ tự ở đây là bắt buộc, không phải tuỳ ý.
    for (const a of danhSachAnh) {
      bien.assets.set(a.id, new Blob([b64ThanhByte(a.b64)], { type: a.mime }))
    }

    // ─── Ảnh có KHỐI nhưng không có BYTE ─────────────────────────────────────────────────────
    // `ImageBlockTransformer.fromSnapshot` gọi `assets.writeToBlob(sourceId)`, và hàm đó NÉM khi
    // map assets còn ảnh khác nhưng thiếu đúng ảnh này (assets.ts:97). Lỗi ấy bị
    // `_convertSnapshotToDraftModel` nuốt → khối ảnh bị lọc ra → `_rebuildBlockTree` để lại một LỖ
    // THƯA trong `children` → `_insertBlockTree` ném khi gặp lỗ → `snapshotToBlock` nuốt tiếp và
    // trả `undefined`. Hậu quả đã ĐO THẬT: mọi khối SAU khối ảnh hỏng trong cùng cây con không bao
    // giờ được chèn — bài viết mất chữ, im lặng, trên chính đường khôi phục bản sao lưu.
    // Nên phải bỏ hẳn khối ảnh không có byte TRƯỚC khi giao cây cho Transformer, và gọi tên nó cho
    // người dùng. Trước khi bỏ thì thử kho blob TRÊN MÁY: lượt xuất có thể đã lỡ một ảnh mà máy
    // này vẫn còn giữ (Critical 2) — khôi phục bản sao lưu không được phép xoá ảnh đang lành.
    const anhThieu: string[] = []
    for (const sid of idAnhTrongCay(khoiGoc)) {
      if (bien.assets.has(sid)) continue
      const blobCon = await workspace.blobSync.get(sid).catch(() => null)
      if (blobCon) {
        bien.assets.set(sid, blobCon)
        continue
      }
      anhThieu.push(sid)
    }
    const cayNhap = anhThieu.length === 0 ? khoiGoc : boKhoiAnhThieu(khoiGoc, new Set(anhThieu))

    const goc = store.root
    if (!goc) {
      // `taoHoacMoDoc` luôn để lại một khối gốc (seed hoặc nội dung đã có). Không có nghĩa là dữ
      // liệu đã hỏng ở tầng dưới — dừng lại thay vì ghi tiếp lên một doc không rõ hình dạng.
      throw new Error(`nhapSnapshotMuc: doc ${id} không có khối gốc sau khi mở.`)
    }
    for (const con of [...goc.children]) store.deleteBlock(con)

    // Props của khối gốc — TIÊU ĐỀ bài viết sống ở đây (`store.root.props.title`, xem
    // TrangBaiViet.tsx). Bỏ bước này là nhập xong bài nào cũng mất tên.
    // `snapshotToModelData` cũng NUỐT lỗi và trả `undefined` (transformer.ts:217-240): im lặng ở
    // đây nghĩa là bài về máy không còn tên mà lượt nhập vẫn tính là thành công. Ném để App gọi tên.
    const duLieuGoc = await bien.snapshotToModelData(cayNhap)
    if (!duLieuGoc) {
      throw new Error(
        `nhapSnapshotMuc: mục ${id} — không dựng lại được props của khối gốc (tiêu đề bài nằm ở đây).`,
      )
    }
    store.updateBlock(goc, duLieuGoc.props)

    for (const [thuTu, con] of cayNhap.children.entries()) {
      // `snapshotToBlock` KHÔNG BAO GIỜ NÉM — nó bọc try/catch, `console.error` rồi trả `undefined`
      // (transformer.ts:174-190). Bỏ qua giá trị trả về là nuốt trọn một cây con hỏng: nội dung cũ
      // đã bị xoá ở trên, người dùng thì đọc "ghi xong N/N". Cách xử đúng ở phía app là KIỂM GIÁ
      // TRỊ TRẢ VỀ (D11: không sửa vendor).
      const khoi = await bien.snapshotToBlock(con, store, goc.id, thuTu)
      if (!khoi) {
        throw new Error(
          `nhapSnapshotMuc: mục ${id} — không dựng lại được khối "${con.flavour}" từ file ` +
            `(xem console để biết lỗi gốc).`,
        )
      }
    }

    const ketQua = await doiCoHanGio(workspace.waitForSynced(), HAN_GIO_GHI_MS)
    if (ketQua === 'het-gio') {
      // Nội dung đã nằm trong bộ nhớ nhưng CHƯA chắc xuống được đĩa — và ngay sau đây workspace bị
      // đóng, nên đây là mất dữ liệu thật chứ không phải chậm. Ném để bên gọi đếm được và nói cho
      // người dùng biết mục nào chưa nhập xong.
      throw new Error(
        `nhapSnapshotMuc: mục ${id} chưa ghi xong xuống lưu trữ trong ${HAN_GIO_GHI_MS}ms.`,
      )
    }
    return { anhThieu }
  } finally {
    workspace.forceStop()
  }
}
