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
// D13: file này nhập TĨNH vào chunk vỏ app từ HAI nơi — LuoiMuc.tsx (từ trước) và App.tsx (thêm ở
// Task 4b, dùng trong handleUndo — xem comment cạnh import ở đầu App.tsx). Import bất cứ thứ gì
// của BlockSuite vào đây là kéo cả chồng ra khỏi chunk nạp chậm cho mọi người dùng, bất kể qua
// lối vào nào trong hai lối trên. IndexedDB thuần không phụ thuộc gì — bất biến này được ghim ở
// describe "xoaNoiDungBang.ts — ranh giới D13" trong ranh-gioi-nap-bang.spec.ts, soi thẳng file
// này chứ không suy luận qua ai import nó.

/** DB nội dung bảng — cùng tên với `TEN_CSDL_BANG` mà mo-doc truyền cho DocSource. */
const TEN_CSDL_BANG = 'drtrong-board'

/** Store và khoá do `IndexedDBDocSource` của thượng nguồn định nghĩa (`sync/src/doc/impl/indexeddb.ts`). */
export const TEN_STORE_DOC = 'collection'
const PHIEN_BAN_CSDL = 1

/** Khoá vị trí khung nhìn — nguyên văn `affine/shared/src/services/edit-props-store.ts:123`. */
export const KHOA_VIEWPORT = (id: string) => `blocksuite:${id}:edgelessViewport`

/**
 * Hai DB blob do `IndexedDBBlobSource` dựng (`sync/src/blob/impl/indexeddb.ts`): `${name}_blob` giữ
 * byte ảnh, `${name}_blob_mime` giữ kiểu MIME. Cả hai do idb-keyval tạo, nên object store KHÔNG có
 * `keyPath` (khoá ngoài dòng) — dựng lại sai kiểu là làm hỏng kho ảnh của người dùng.
 */
const CSDL_BLOB = `${TEN_CSDL_BANG}_blob`
const STORE_BLOB = 'blob'
const CSDL_BLOB_MIME = `${TEN_CSDL_BANG}_blob_mime`
const STORE_BLOB_MIME = 'blob_mime'

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


// ─── Gom rác blob ────────────────────────────────────────────────────────────────────────────
//
// Ảnh đánh khoá theo BĂM NỘI DUNG, không theo id bảng, và nằm ở hai DB riêng — nên xoá một bảng
// xong không có gì cho biết ảnh nào vừa mồ côi. Phải đi hướng ngược lại: thu tập mọi khoá CÒN được
// tham chiếu, rồi xoá phần thừa.
//
// KHÔNG giải mã schema BlockSuite để tìm `prop:sourceId`. Giá trị đó là một chuỗi ASCII mà Yjs ghi
// NGUYÊN VĂN (varint độ dài + UTF-8) vào update, nên "khoá không xuất hiện trong byte của BẤT KỲ
// doc nào còn lại" đã là bằng chứng đủ để kết luận mồ côi — không phụ thuộc tên trường, không phụ
// thuộc phiên bản schema, và không phải kéo `yjs` vào chunk vỏ app (D13).
//
// Hướng sai lệch chọn có chủ đích. Quét THỪA: giữ lại một blob đáng xoá, rò vài KB. Quét THIẾU:
// xoá mất ảnh của một bảng đang sống, không lấy lại được. Nên mọi ca mập mờ — đọc doc hỏng, DB
// không mở được, `databases()` không có — đều nghiêng về GIỮ, và cả lượt dọn bị bỏ chứ không dọn
// một nửa trên dữ liệu không đọc đủ.

export type PhuThuocDonRac = {
  /** Mọi update Yjs của mọi doc CÒN LẠI. Phải đọc SAU khi doc của bảng bị xoá đã biến mất. */
  docTatCaDoc: () => Promise<Uint8Array[]>
  danhSachBlob: () => Promise<string[]>
  xoaBlob: (khoa: string) => Promise<void>
}

/**
 * Xoá những blob không còn doc nào tham chiếu. Trả số blob đã xoá, hoặc `null` khi bỏ lượt dọn.
 *
 * PHẢI gọi SAU `xoaNoiDungBang()`: chừng nào doc của bảng vừa xoá còn trong kho thì chính nó vẫn
 * tham chiếu ảnh của nó, và lượt dọn sẽ không thấy blob nào mồ côi.
 */
export async function donRacBlobBang(pt?: PhuThuocDonRac): Promise<{ daXoa: number } | null> {
  const p = pt ?? phuThuocDonRacThat()
  try {
    const khoa = await p.danhSachBlob()
    // Không có ảnh nào thì đừng đọc doc — lượt xoá bảng thường gặp nhất không phải trả giá gì.
    if (khoa.length === 0) return { daXoa: 0 }

    const doc = await p.docTatCaDoc()
    const noiDung = doc.map(byteThanhChuoiLatin1)
    const moCoi = khoa.filter((k) => !noiDung.some((s) => s.includes(k)))
    for (const k of moCoi) await p.xoaBlob(k)
    return { daXoa: moCoi.length }
  } catch (loi) {
    console.warn('donRacBlobBang: bỏ lượt dọn ảnh mồ côi (giữ nguyên, không xoá gì) —', loi)
    return null
  }
}

/**
 * Byte → chuỗi latin1 để dò chuỗi con. Latin1 ánh xạ 1 byte ↔ 1 mã ký tự nên khoá blob (ASCII) giữ
 * nguyên; dùng UTF-8 sẽ hỏng ở byte không hợp lệ giữa dữ liệu nhị phân. Cắt lô vì `fromCharCode`
 * nhận đối số qua ngăn xếp — trải cả một mảng vài trăm nghìn phần tử là tràn.
 */
function byteThanhChuoiLatin1(b: Uint8Array): string {
  const LO = 8192
  let s = ''
  for (let i = 0; i < b.length; i += LO) {
    s += String.fromCharCode(...b.subarray(i, i + LO))
  }
  return s
}

function phuThuocDonRacThat(): PhuThuocDonRac {
  return {
    docTatCaDoc: async () => {
      const db = await moDbThat()
      try {
        const banGhi = await new Promise<Array<{ updates?: Array<{ update?: unknown }> }>>(
          (giai, tuChoi) => {
            const yc = db.transaction(TEN_STORE_DOC, 'readonly').objectStore(TEN_STORE_DOC).getAll()
            yc.onsuccess = () => giai(yc.result ?? [])
            yc.onerror = () => tuChoi(yc.error ?? new Error('không đọc được doc'))
          },
        )
        return banGhi.flatMap((b) =>
          (b.updates ?? []).map((u) => thanhUint8(u.update)).filter((u): u is Uint8Array => !!u),
        )
      } finally {
        db.close()
      }
    },
    danhSachBlob: async () => {
      const db = await moDbBlob(CSDL_BLOB, STORE_BLOB)
      if (!db) return []
      try {
        return await new Promise<string[]>((giai, tuChoi) => {
          const yc = db.transaction(STORE_BLOB, 'readonly').objectStore(STORE_BLOB).getAllKeys()
          yc.onsuccess = () => giai((yc.result ?? []).map(String))
          yc.onerror = () => tuChoi(yc.error ?? new Error('không đọc được danh sách blob'))
        })
      } finally {
        db.close()
      }
    },
    xoaBlob: async (khoa) => {
      for (const [ten, store] of [
        [CSDL_BLOB, STORE_BLOB],
        [CSDL_BLOB_MIME, STORE_BLOB_MIME],
      ] as const) {
        const db = await moDbBlob(ten, store)
        if (!db) continue
        try {
          await new Promise<void>((giai, tuChoi) => {
            const gd = db.transaction(store, 'readwrite')
            gd.objectStore(store).delete(khoa)
            gd.oncomplete = () => giai()
            gd.onerror = () => tuChoi(gd.error ?? new Error('không xoá được blob'))
            gd.onabort = () => tuChoi(gd.error ?? new Error('giao dịch xoá blob bị huỷ'))
          })
        } finally {
          db.close()
        }
      }
    },
  }
}

function thanhUint8(u: unknown): Uint8Array | null {
  if (u instanceof Uint8Array) return u
  if (u instanceof ArrayBuffer) return new Uint8Array(u)
  return null
}

/**
 * Mở một DB blob — `null` nếu nó CHƯA TỒN TẠI.
 *
 * Không được tự tạo: người dùng chưa dán ảnh nào thì DB chưa có, và mở nó ở đây sẽ dựng sẵn một DB
 * phiên bản 1 mà idb-keyval sau đó không còn cơ hội chạy `upgrade` — đúng cái bẫy đã ghi ở
 * `moDbThat()`. `databases()` cho biết trước; nơi nào không có nó (Firefox cũ) thì bỏ lượt dọn,
 * vì rò vài KB rẻ hơn nhiều so với làm hỏng kho ảnh.
 */
async function moDbBlob(ten: string, store: string): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return null
  const co = (await indexedDB.databases()).some((d) => d.name === ten)
  if (!co) return null
  const db = await new Promise<IDBDatabase>((giai, tuChoi) => {
    const yc = indexedDB.open(ten)
    yc.onsuccess = () => giai(yc.result)
    yc.onerror = () => tuChoi(yc.error ?? new Error(`không mở được ${ten}`))
    yc.onblocked = () => tuChoi(new Error(`${ten}: một tab khác đang giữ phiên bản cũ`))
  })
  if (!db.objectStoreNames.contains(store)) {
    db.close()
    return null
  }
  return db
}
