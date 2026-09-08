// Kho lưu trữ IndexedDB cho METADATA của kho bài viết + sơ đồ dùng chung (`MucMeta`: tên, loại,
// chuyên khoa, tag, mốc thời gian, văn bản để tìm kiếm). Lý do không dùng localStorage như các mục
// khác (src/lib/storage.ts): kho này lớn dần theo số mục người dùng tạo, trong khi localStorage của
// cả origin thường chỉ giới hạn khoảng 5–10MB và dùng chung với mọi mục tự nhập khác — dễ tràn dung
// lượng và làm hỏng dữ liệu cũ. IndexedDB cho phép lưu nhiều hơn đáng kể và vẫn hoạt động 100%
// offline, không gọi mạng.
//
// Ở đây CHỈ có metadata. NỘI DUNG của mục (cây khối, nét vẽ, ảnh) nằm ở một CSDL khác hẳn,
// `drtrong-board`, do BlockSuite ghi — xem src/board/mo-doc.ts và src/board/xoaNoiDungBang.ts.
//
// Tên DB giữ nguyên "drtrong-ecg" (đặt từ khi kho này chỉ chứa bài học ECG) để dữ liệu đã lưu trên
// máy người dùng không bị mất qua các lần cập nhật.

const DB_NAME = "drtrong-ecg"
// v6 → v7 (giai đoạn 9, 2026-09-09): PHÁ HUỶ ba store hệ cũ — `lessons`, `articles`, `boards`.
// KHÔNG HOÀN TÁC ĐƯỢC. Chủ dự án đã xác nhận không cần sao lưu trước lượt này (2026-09-06).
//
// v5 → v6 (2026-09-05) đã thêm store `mucs` cho kho bài viết + sơ đồ dùng chung (spec §3.2.1a) và
// CỐ Ý giữ ba store cũ lại, để một chặng hỏng giữa chừng không mang dữ liệu đi theo. Từ Task 6/7
// không còn mã nào đọc chúng nữa, nên lượt này dọn hẳn.
//
// Phạm vi: CHỈ CSDL `drtrong-ecg`, CHỈ ba object store trên. Không có `deleteDatabase` nào; CSDL nội
// dung `drtrong-board` (cây khối + ảnh do BlockSuite ghi, xem src/board/mo-doc.ts) là kho SỐNG và
// giữ nguyên tên cũ vĩnh viễn — việc đổi tên nó đã bị bỏ khỏi kế hoạch.
const DB_VERSION = 7

// Tên các object store — dùng làm tham số `store` cho các hàm bên dưới.
export const IDB_STORES = {
  mucs: "mucs",
} as const

const ALL_STORES: string[] = Object.values(IDB_STORES)

// Ba TÊN STORE THẬT của hệ cũ, viết CỐ ĐỊNH chứ không đọc qua IDB_STORES — hằng số đó không còn khai
// chúng nữa, và đây là chỗ duy nhất trong mã còn phải biết tới chúng.
//
// Lưu ý một cái bẫy đọc: khoá cũ trong IDB_STORES là `ecgLessons` nhưng TÊN STORE nó trỏ tới là
// "lessons". `deleteObjectStore` nhận TÊN STORE, nên danh sách dưới đây phải là "lessons" — sửa
// thành "ecgLessons" cho "nhất quán" sẽ xoá một store không tồn tại và bỏ sót store thật, hỏng im
// lặng trên đúng lượt không hoàn tác được.
const STORE_CU_CAN_XOA = ["lessons", "articles", "boards"]

// Dùng LẠI một kết nối duy nhất thay vì mở mới mỗi lần đọc/ghi — trước đây mỗi thao tác gọi
// indexedDB.open() và không bao giờ đóng, nên một phiên vẽ Sơ đồ tư duy (autosave debounce 400ms)
// có thể tích luỹ hàng chục kết nối còn treo. Cache lại promise; nếu mở lỗi (hoặc bị `onblocked` vì
// tab khác đang giữ phiên bản DB cũ) thì xoá cache để lần gọi sau thử mở lại, không kẹt vĩnh viễn.
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      dbPromise = null
      reject(new Error("IndexedDB không khả dụng trên trình duyệt này."))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (ev) => {
      const db = req.result
      // Tạo mọi store còn thiếu — chạy cho cả máy mới (chưa có DB) lẫn máy đang ở version cũ bất kỳ
      // (ví dụ máy dừng ở v4: có "lessons"/"articles", chưa từng thấy "mucs").
      ALL_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" })
      })
      // Giai đoạn 9: xoá ba store hệ cũ. `contains()` là bắt buộc, KHÔNG phải phòng xa thừa —
      // `deleteObjectStore` trên một store không tồn tại ném NotFoundError, và một lần ném ở đây
      // cắt ngang cả lượt nâng cấp (giao dịch versionchange bị huỷ) nên app không mở nổi CSDL.
      // Máy đang ở version CŨ HƠN 6 là ca thật: nó chưa từng có "boards" (chỉ có từ v5) lẫn "mucs".
      //
      // `oldVersion < 7` chỉ để ghi rõ ý định: onupgradeneeded chỉ chạy khi thực sự nâng version,
      // nên máy đã ở v7 không vào đây; điều kiện này giữ cho một lần nâng v7 → v8 sau này không
      // chạy lại vòng xoá đã xong.
      if (ev.oldVersion < 7) {
        STORE_CU_CAN_XOA.forEach((name) => {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name)
        })
      }
    }
    // Một tab khác đang mở kết nối ở version CŨ hơn thì lần open() version mới này bị treo tới khi
    // tab đó đóng — không chờ vô thời hạn, báo lỗi ngay để caller rơi về hành vi an toàn ([]/false).
    req.onblocked = () => {
      dbPromise = null
      reject(new Error("Một tab/cửa sổ khác đang mở app ở phiên bản cũ hơn — đóng tab đó rồi thử lại."))
    }
    req.onsuccess = () => {
      const db = req.result
      // Tab NÀY đang giữ kết nối mà tab KHÁC cần nâng cấp version cao hơn — đóng lại để không chặn
      // tab kia mãi mãi; lần đọc/ghi tiếp theo ở tab này tự mở kết nối mới.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

// Kết quả đọc PHÂN BIỆT ĐƯỢC "rỗng thật" với "đọc hỏng" — thứ mà idbGetAll() bên dưới không làm
// được, vì hợp đồng của nó là nuốt lỗi thành [].
export type KetQuaDocIdb<T> = { ok: true; items: T[] } | { ok: false; loi: string }

// Đọc toàn bộ mục trong một store, GIỮ LẠI lỗi thay vì nuốt.
//
// Vì sao cần: nhánh `catch { return [] }` của idbGetAll khiến "chưa có gì" và "không đọc được" trả
// về y hệt nhau. Đường thất bại KHÔNG hiếm trong app này — openDb() reject ở nhánh `onblocked` chỉ
// cần người dùng còn một tab khác mở app bản cũ (chuyện thường với PWA sau mỗi lần cập nhật), và
// reject luôn khi trình duyệt chặn IndexedDB (chế độ riêng tư). Hậu quả trước đây: mở tab thứ hai
// là toàn bộ bảng Mindmap "biến mất", kèm trạng thái rỗng mời tạo bảng mới — ảo giác mất dữ liệu
// trên đúng sản phẩm lấy tự chủ dữ liệu làm cam kết cốt lõi. Với bài viết/ECG còn kín đáo hơn: mục
// tự soạn được TRỘN với nội dung tĩnh nên màn hình vẫn đầy, chỉ phần của người dùng lặng lẽ mất.
export async function idbGetAllCoKetQua<T>(store: string): Promise<KetQuaDocIdb<T>> {
  try {
    const db = await openDb()
    const items = await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly")
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
    return { ok: true, items }
  } catch (loi) {
    // openDb() đã đặt sẵn câu tiếng Việt giải thích được cho hai ca hay gặp nhất (tab cũ đang giữ
    // DB, trình duyệt không có IndexedDB); ca còn lại là DOMException của chính IndexedDB.
    return { ok: false, loi: loi instanceof Error ? loi.message : "Không đọc được dữ liệu đã lưu trên máy." }
  }
}

// Đọc toàn bộ mục trong một store. Trả về [] nếu chưa có gì, hoặc nếu IndexedDB không khả dụng/lỗi
// (ví dụ chế độ riêng tư ở một số trình duyệt) — để không làm gãy luồng dùng app.
//
// GIỮ NGUYÊN hợp đồng nuốt-lỗi-thành-[] cho những nơi thật sự chỉ cần "danh sách tốt nhất có thể"
// (di trú bảng cũ, đọc metadata phụ, và toàn bộ ca kiểm). Nơi nào cần PHÂN BIỆT rỗng với hỏng thì
// gọi idbGetAllCoKetQua ở trên — useIdbCollection là đúng ca đó.
export async function idbGetAll<T>(store: string): Promise<T[]> {
  const kq = await idbGetAllCoKetQua<T>(store)
  return kq.ok ? kq.items : []
}

// Ghi (thêm mới hoặc đè nếu trùng id) nhiều mục cùng lúc.
export async function idbPutMany<T>(store: string, items: T[]): Promise<boolean> {
  if (items.length === 0) return true
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite")
      const objectStore = tx.objectStore(store)
      items.forEach((item) => objectStore.put(item))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  }
}

export function idbPut<T>(store: string, item: T): Promise<boolean> {
  return idbPutMany(store, [item])
}

// Thay TOÀN BỘ nội dung một store bằng đúng danh sách `items` — xoá sạch rồi ghi lại trong CÙNG một
// transaction, khác `idbPutMany` (chỉ đè/thêm, không xoá mục không có trong `items`). Dùng cho "Hoàn
// tác nhập file": khôi phục đúng như snapshot trước khi nhập, kể cả những mục mà file vừa nhập THÊM
// MỚI (không có trong snapshot) cũng phải mất đi, không chỉ những mục bị đè.
export async function idbReplaceAll<T>(store: string, items: T[]): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite")
      const objectStore = tx.objectStore(store)
      objectStore.clear()
      items.forEach((item) => objectStore.put(item))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  }
}

export async function idbDelete(store: string, id: string): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite")
      tx.objectStore(store).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  }
}
