// Kho lưu trữ IndexedDB dùng chung cho các mục tự nhập CÓ THỂ KÈM ẢNH — bài học ECG và (từ khi có
// trình soạn thảo tự do theo block) cả bài viết tự nhập. Lý do không dùng localStorage như các mục
// khác (src/lib/storage.ts): ảnh đã thu nhỏ vẫn nặng hơn nhiều so với dữ liệu văn bản thuần, trong
// khi localStorage của cả origin thường chỉ giới hạn khoảng 5–10MB và dùng chung với mọi mục tự
// nhập khác — dễ tràn dung lượng và làm hỏng dữ liệu cũ. IndexedDB cho phép lưu nhiều hơn đáng kể
// và vẫn hoạt động 100% offline, không gọi mạng.
//
// Tên DB giữ nguyên "drtrong-ecg" (đặt từ khi chỉ có ECG) để dữ liệu ECG đã lưu trên máy người dùng
// không bị mất; version 2 thêm object store "articles" cho bài viết.

const DB_NAME = "drtrong-ecg"
// v4: thêm store "boards" — danh sách nhiều bảng Sơ đồ tư duy (tên/màu/chuyên khoa). Store "mindmap"
// giữ nguyên tên nhưng từ v4 chứa NHIỀU bản ghi (một cho mỗi bảng, id = board.id) thay vì chỉ một
// bản ghi "main" — xem lib/boards.ts và lib/mindmapStorage.ts.
const DB_VERSION = 4

// Tên các object store — dùng làm tham số `store` cho các hàm bên dưới.
export const IDB_STORES = {
  ecgLessons: "lessons",
  articles: "articles",
  // Dữ liệu THẬT của từng bảng Sơ đồ tư duy — một bản ghi mỗi bảng (id = board.id), có thể rất nặng
  // vì chứa nét vẽ tay.
  mindmap: "mindmap",
  // Metadata (tên/màu/chuyên khoa) của danh sách các bảng Sơ đồ tư duy — xem lib/boards.ts.
  boards: "boards",
} as const

const ALL_STORES: string[] = Object.values(IDB_STORES)

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
    req.onupgradeneeded = () => {
      const db = req.result
      // Tạo mọi store còn thiếu — chạy cho cả máy mới (chưa có DB) lẫn máy đang ở version 1
      // (đã có "lessons", chỉ thiếu "articles").
      ALL_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" })
      })
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

// Đọc toàn bộ mục trong một store. Trả về [] nếu chưa có gì, hoặc nếu IndexedDB không khả dụng/lỗi
// (ví dụ chế độ riêng tư ở một số trình duyệt) — để không làm gãy luồng dùng app.
export async function idbGetAll<T>(store: string): Promise<T[]> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly")
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
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
