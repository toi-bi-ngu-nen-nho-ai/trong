// Giai đoạn 9 — lượt PHÁ HUỶ DUY NHẤT của Plan 3: `deleteObjectStore` ba store metadata đã chết
// (`lessons`, `articles`, `boards`) trong CSDL `drtrong-ecg`, DB_VERSION 6 → 7.
//
// Vì sao ca kiểm ở đây soi THẲNG `objectStoreNames` chứ không chỉ đọc lại `mucs`: hợp đồng của
// lượt này là "ba store BIẾN MẤT", không phải "mucs còn đọc được". Một bản vá quên `deleteObjectStore`
// vẫn làm `mucs` đọc tốt như thường — chỉ danh sách store thật mới phân biệt được hai trạng thái đó.
//
// Và vì sao KHÔNG có `deleteDatabase` nào trong mã sản phẩm (chỉ trong ca kiểm, để dựng máy giả):
// CSDL nội dung `drtrong-board` (cây khối + ảnh do BlockSuite ghi) là kho SỐNG; lượt này không đụng
// tới nó, cũng không đụng store `mucs` của chính `drtrong-ecg`.
import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../idb'

const TEN_CSDL = 'drtrong-ecg'
const BA_STORE_CHET = ['lessons', 'articles', 'boards'] as const

/** Xoá sạch CSDL để mỗi ca dựng lại một "máy người dùng" từ đầu. */
function xoaCsdl(): Promise<void> {
  return new Promise((xong) => {
    const yc = indexedDB.deleteDatabase(TEN_CSDL)
    yc.onsuccess = () => xong()
    // Không có gì để xoá cũng là trạng thái hợp lệ của ca kiểm.
    yc.onerror = () => xong()
    // Không được kỳ vọng xảy ra: `openDb()` gắn `onversionchange` để tự đóng kết nối đang cache.
    // Nếu nó xảy ra thật thì ca kiểm phải ĐỎ ở khẳng định bên dưới, không treo tới hết giờ.
    yc.onblocked = () => xong()
  })
}

/** Mở CSDL bằng API thô (không qua idb.ts) để soi danh sách store và version THẬT. */
function moTho(phienBan?: number): Promise<IDBDatabase> {
  return new Promise((xong, hong) => {
    const yc = phienBan === undefined ? indexedDB.open(TEN_CSDL) : indexedDB.open(TEN_CSDL, phienBan)
    yc.onsuccess = () => xong(yc.result)
    yc.onerror = () => hong(yc.error ?? new Error('không mở được ' + TEN_CSDL))
  })
}

/** Dựng một "máy người dùng" ở version cũ với đúng danh sách store cho trước. */
function dungMayCu(phienBan: number, storeCanTao: readonly string[]): Promise<IDBDatabase> {
  return new Promise((xong, hong) => {
    const yc = indexedDB.open(TEN_CSDL, phienBan)
    yc.onupgradeneeded = () => {
      const db = yc.result
      for (const ten of storeCanTao) {
        if (!db.objectStoreNames.contains(ten)) db.createObjectStore(ten, { keyPath: 'id' })
      }
    }
    yc.onsuccess = () => xong(yc.result)
    yc.onerror = () => hong(yc.error ?? new Error('không dựng được máy cũ'))
  })
}

function ghiTho(db: IDBDatabase, store: string, ban: { id: string }): Promise<void> {
  return new Promise((xong, hong) => {
    const gd = db.transaction(store, 'readwrite')
    gd.objectStore(store).put(ban)
    gd.oncomplete = () => xong()
    gd.onerror = () => hong(gd.error)
  })
}

beforeEach(async () => {
  await xoaCsdl()
})

describe('giai đoạn 9 — ba store cũ đã bị deleteObjectStore', () => {
  it('IDB_STORES chỉ còn khoá mucs — không còn boards/articles/ecgLessons', () => {
    expect('boards' in IDB_STORES).toBe(false)
    expect('articles' in IDB_STORES).toBe(false)
    // Khoá của hằng số là `ecgLessons`; TÊN STORE THẬT nó trỏ tới là "lessons". Ca này soi KHOÁ,
    // còn `deleteObjectStore` bên dưới nhận TÊN THẬT — hai thứ khác nhau, cả hai đều đúng.
    expect('ecgLessons' in IDB_STORES).toBe(false)
    expect(Object.keys(IDB_STORES)).toEqual(['mucs'])
  })

  it('DB_VERSION là 7', async () => {
    // `idbPut` ép `openDb()` mở kết nối thật; sau đó soi version bằng API thô.
    expect(await idbPut(IDB_STORES.mucs, { id: 'x' })).toBe(true)
    const db = await moTho()
    try {
      expect(db.version).toBe(7)
    } finally {
      db.close()
    }
  })

  it('máy đang ở v6 (có dữ liệu boards/articles/lessons) → nâng lên v7 xoá đúng ba store, giữ nguyên mucs', async () => {
    const dbCu = await dungMayCu(6, ['lessons', 'articles', 'boards', 'mucs'])
    await ghiTho(dbCu, 'boards', { id: 'bang-cu' })
    await ghiTho(dbCu, 'articles', { id: 'bai-cu' })
    await ghiTho(dbCu, 'lessons', { id: 'ecg-cu' })
    await ghiTho(dbCu, 'mucs', { id: 'muc-song' })
    dbCu.close()

    // Mở lại QUA idb.ts (v7) — phải tự chạy onupgradeneeded.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    expect(ds).toEqual([{ id: 'muc-song' }])

    const db = await moTho()
    try {
      expect(db.version).toBe(7)
      const ten = [...db.objectStoreNames]
      for (const chet of BA_STORE_CHET) expect(ten).not.toContain(chet)
      expect(ten).toContain('mucs')
    } finally {
      db.close()
    }
  })

  it('máy đang ở v4 (chưa từng thấy boards lẫn mucs) → nâng lên v7 không ném, tạo mucs, xoá hai store cũ có thật', async () => {
    // Nhánh mà `db.objectStoreNames.contains(...)` che: `deleteObjectStore` một store KHÔNG tồn tại
    // ném NotFoundError, cắt ngang cả lượt nâng cấp và làm app không mở nổi CSDL.
    const dbCu = await dungMayCu(4, ['lessons', 'articles'])
    await ghiTho(dbCu, 'lessons', { id: 'ecg-that-cu' })
    dbCu.close()

    // Nếu onupgradeneeded ném, `openDb()` reject và `idbPut` trả false (hợp đồng nuốt-lỗi) —
    // khẳng định SAI, không phải hết giờ.
    expect(await idbPut(IDB_STORES.mucs, { id: 'muc-moi' })).toBe(true)

    const db = await moTho()
    try {
      expect(db.version).toBe(7)
      expect([...db.objectStoreNames]).toEqual(['mucs'])
    } finally {
      db.close()
    }
  })
})
