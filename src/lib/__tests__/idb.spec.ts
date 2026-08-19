import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../idb'

describe('idb — store boards (nâng DB_VERSION lên 5)', () => {
  afterEach(async () => {
    // Xoá sạch để mỗi ca kiểm độc lập — fake-indexeddb giữ state giữa các ca trong cùng file.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('đọc/ghi được store boards, không đụng store cũ (ecgLessons/articles)', async () => {
    const okBang = await idbPut(IDB_STORES.boards, { id: 'x', ten: 'Test' })
    expect(okBang).toBe(true)

    const dsBang = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(dsBang).toEqual([{ id: 'x', ten: 'Test' }])

    // Store cũ vẫn hoạt động bình thường sau khi nâng version — không rỗng bất thường, không lỗi.
    const dsLessons = await idbGetAll(IDB_STORES.ecgLessons)
    expect(Array.isArray(dsLessons)).toBe(true)
  })

  it('máy đã có CSDL ở version 4 (chưa có store boards) → nâng cấp lên 5 không mất dữ liệu cũ', async () => {
    // Xoá database trước để reset state fake-indexeddb từ test trước
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('drtrong-ecg')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve() // Bỏ qua lỗi nếu DB không tồn tại
    })

    // Mô phỏng máy cũ: mở thẳng bằng indexedDB API, version 4, chỉ có hai store gốc, ghi một mục.
    const dbCu = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('drtrong-ecg', 4)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('articles')) db.createObjectStore('articles', { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = dbCu.transaction('lessons', 'readwrite')
      tx.objectStore('lessons').put({ id: 'bai-cu', title: 'Bài học cũ' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    dbCu.close()

    // Giờ mở qua idb.ts (version 5) — phải tự nâng cấp, KHÔNG mất mục "bai-cu", VÀ có store boards.
    const dsLessons = await idbGetAll<{ id: string; title: string }>(IDB_STORES.ecgLessons)
    expect(dsLessons).toEqual([{ id: 'bai-cu', title: 'Bài học cũ' }])

    const okBang = await idbPut(IDB_STORES.boards, { id: 'y', ten: 'Test 2' })
    expect(okBang).toBe(true)
  })
})
