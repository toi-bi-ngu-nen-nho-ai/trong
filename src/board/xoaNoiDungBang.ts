// Dọn NỘI DUNG một bảng sau khi nó đã bị xoá vĩnh viễn khỏi danh sách.
//
// ─── Vì sao cần một module riêng ─────────────────────────────────────────────────────────────
// Dữ liệu một bảng nằm ở HAI kho khác nhau, và trước lượt này chỉ kho thứ nhất được dọn:
//   1. META (tên, tag, chuyên khoa, `daXoaLuc`) — DB `drtrong-ecg`, store `boards`. `xoaVinhVienNhieu`
//      gọi `remove(id)` xoá đúng cái này.
//   2. NỘI DUNG (toàn bộ nét vẽ, thẻ ghi chú, ảnh) — DB `drtrong-board`, store `collection`, một
//      bản ghi `{ id, updates }` mỗi bảng, do `IndexedDBDocSource` của BlockSuite ghi. KHÔNG có ai
//      xoá — `IndexedDBDocSource` chỉ có `pull`/`push`, không có `delete`.
// Cộng thêm một khoá localStorage `blocksuite:<id>:edgelessViewport` (vị trí/zoom lần cuối, xem
// `affine/shared/src/services/edit-props-store.ts`).
// Đo 2026-08-31: xoá vĩnh viễn cả 4 bảng xong, store `collection` vẫn còn nguyên 5 bản ghi. Người
// dùng tưởng đã xoá sạch, dung lượng thì không giảm một byte.
//
// ─── Vì sao KHÔNG dùng lại `IndexedDBDocSource` ──────────────────────────────────────────────
// D13: file này bị gọi từ DanhSachBang.tsx (chunk vỏ app). Import bất cứ thứ gì của BlockSuite vào
// đây là kéo cả chồng ra khỏi chunk nạp chậm cho mọi người dùng. IndexedDB thuần không phụ thuộc gì.

/** DB nội dung bảng — cùng tên với `TEN_CSDL_BANG` mà EdgelessBoard/diTruBangCu truyền cho DocSource. */
const TEN_CSDL_BANG = 'drtrong-board'

/** Store và khoá do `IndexedDBDocSource` của thượng nguồn định nghĩa (`sync/src/doc/impl/indexeddb.ts`). */
export const TEN_STORE_DOC = 'collection'
const PHIEN_BAN_CSDL = 1

/** Khoá vị trí khung nhìn — nguyên văn `affine/shared/src/services/edit-props-store.ts:123`. */
export const KHOA_VIEWPORT = (id: string) => `blocksuite:${id}:edgelessViewport`

export type PhuThuocXoaNoiDung = {
  moDb: () => Promise<IDBDatabase>
  luuTru: Pick<Storage, 'removeItem'>
}

/**
 * Mở DB nội dung bảng.
 *
 * `onupgradeneeded` PHẢI dựng store y hệt thượng nguồn (`upgradeDB`: `createObjectStore('collection',
 * { keyPath: 'id' })`). Nếu ở đây mở DB mà KHÔNG tạo store — vd mở không nêu phiên bản trên một máy
 * chưa từng có DB này — thì ta để lại một DB phiên bản 1 RỖNG, và lượt `openDB(name, 1, { upgrade })`
 * của BlockSuite sau đó sẽ không chạy upgrade nữa (phiên bản đã bằng 1): store `collection` không
 * bao giờ được tạo, và cả lớp lưu nội dung bảng hỏng vĩnh viễn. Trùng đúng phiên bản + đúng phép
 * dựng store là cách duy nhất an toàn.
 */
function moDbThat(): Promise<IDBDatabase> {
  return new Promise((giai, tuChoi) => {
    if (typeof indexedDB === 'undefined') {
      tuChoi(new Error('xoaNoiDungBang: IndexedDB không khả dụng'))
      return
    }
    const yc = indexedDB.open(TEN_CSDL_BANG, PHIEN_BAN_CSDL)
    yc.onupgradeneeded = () => {
      const db = yc.result
      if (!db.objectStoreNames.contains(TEN_STORE_DOC)) {
        db.createObjectStore(TEN_STORE_DOC, { keyPath: 'id' })
      }
    }
    yc.onblocked = () => tuChoi(new Error('xoaNoiDungBang: một tab khác đang giữ DB ở phiên bản cũ'))
    yc.onsuccess = () => giai(yc.result)
    yc.onerror = () => tuChoi(yc.error ?? new Error('xoaNoiDungBang: không mở được DB'))
  })
}

/**
 * Xoá nội dung + khoá khung nhìn của những bảng đã bị xoá vĩnh viễn.
 *
 * Cố gắng hết sức, KHÔNG ném: meta đã xoá xong từ trước lời gọi này, nên một lỗi lưu trữ ở đây chỉ
 * có nghĩa "còn sót ít byte", không đáng kéo cả lượt xoá của người dùng hỏng theo. Nhưng cũng KHÔNG
 * im lặng — hỏng thì cảnh báo ra console và trả `false`.
 *
 * Hai kho dọn ĐỘC LẬP nhau: IndexedDB hỏng thì khoá localStorage vẫn phải sạch.
 */
export async function xoaNoiDungBang(
  ids: readonly string[],
  pt?: PhuThuocXoaNoiDung,
): Promise<boolean> {
  if (ids.length === 0) return true
  const luuTru = pt?.luuTru ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const moDb = pt?.moDb ?? moDbThat

  if (luuTru) {
    for (const id of ids) {
      try {
        luuTru.removeItem(KHOA_VIEWPORT(id))
      } catch {
        // localStorage bị chặn (chế độ riêng tư của vài trình duyệt) — không phải lý do để dừng.
      }
    }
  }

  let db: IDBDatabase | null = null
  try {
    db = await moDb()
    const dbMo = db
    await new Promise<void>((giai, tuChoi) => {
      const gd = dbMo.transaction(TEN_STORE_DOC, 'readwrite')
      const store = gd.objectStore(TEN_STORE_DOC)
      for (const id of ids) store.delete(id)
      gd.oncomplete = () => giai()
      gd.onerror = () => tuChoi(gd.error ?? new Error('xoaNoiDungBang: giao dịch xoá hỏng'))
      gd.onabort = () => tuChoi(gd.error ?? new Error('xoaNoiDungBang: giao dịch xoá bị huỷ'))
    })
    return true
  } catch (loi) {
    console.warn('xoaNoiDungBang: không dọn được nội dung bảng đã xoá vĩnh viễn —', loi)
    return false
  } finally {
    db?.close()
  }
}
