// @vitest-environment happy-dom
//
// Dọn khoá localStorage `drtrong:customArticles` — RÁC VĨNH VIỄN kể từ Task 6.
//
// Chuyện đã xảy ra: bài viết tự nhập từng nằm ở localStorage dưới khoá này, rồi được di trú sang
// IndexedDB qua `legacyLocalKey` của useIdbCollection (chính nó gọi `removeCollection` sau khi ghi
// xong). Task 6 xoá `CUSTOM_COLLECTION_KEYS.articles` cùng ba màn hình đọc nó, nên KHÔNG còn ai
// truyền `legacyLocalKey` nữa — đường tự dọn đó chết theo. Trên máy người dùng nào chưa từng chạy
// lượt di trú, khoá cứ nằm lại chiếm chỗ trong hạn mức ~5–10MB dùng chung của cả origin, không ai
// đọc và không ai xoá.
//
// Gộp vào giai đoạn 9 vì đây là lượt dọn không-hoàn-tác-được duy nhất của kế hoạch, cùng ngữ cảnh
// với ba object store bị `deleteObjectStore` ở `src/lib/idb.ts`.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOM_COLLECTION_KEYS, donKhoaRacHeCu, saveCollection } from '../storage'

const KHOA_RAC = 'drtrong:customArticles'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('donKhoaRacHeCu', () => {
  it('xoá hẳn khoá drtrong:customArticles', () => {
    localStorage.setItem(KHOA_RAC, JSON.stringify([{ id: 'bv-cu', title: 'Bài viết hệ cũ' }]))
    expect(localStorage.getItem(KHOA_RAC)).not.toBeNull()

    donKhoaRacHeCu()

    expect(localStorage.getItem(KHOA_RAC)).toBeNull()
  })

  it('KHÔNG đụng các khoá tự nhập còn sống', () => {
    // Ba khoá này vẫn có người đọc. Một lượt dọn quét theo tiền tố `drtrong:` sẽ nuốt cả chúng —
    // mất kháng sinh/bệnh lý/thẻ ghi nhớ người dùng tự soạn, mà không có đường hoàn tác.
    saveCollection(CUSTOM_COLLECTION_KEYS.antibiotics, [{ id: 'ks-1' }])
    saveCollection(CUSTOM_COLLECTION_KEYS.diseases, [{ id: 'bl-1' }])
    saveCollection(CUSTOM_COLLECTION_KEYS.flashcards, [{ id: 'the-1' }])
    localStorage.setItem(KHOA_RAC, '[]')

    donKhoaRacHeCu()

    expect(localStorage.getItem('drtrong:customAntibiotics')).not.toBeNull()
    expect(localStorage.getItem('drtrong:customDiseases')).not.toBeNull()
    expect(localStorage.getItem('drtrong:customFlashcards')).not.toBeNull()
    expect(localStorage.getItem(KHOA_RAC)).toBeNull()
  })

  it('không ném khi trình duyệt chặn lưu trữ (chế độ riêng tư)', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bị chặn', 'SecurityError')
    })
    // Hàm này chạy ở main.tsx TRƯỚC khi React render; một lần ném ở đó là màn hình trắng.
    expect(() => donKhoaRacHeCu()).not.toThrow()
  })
})

describe('nối dây', () => {
  // `tsc` không thấy được việc "có ai gọi hàm này lúc khởi động app không" — một hàm dọn đúng đắn
  // mà không ai gọi thì khoá rác vẫn nằm nguyên trên máy người dùng, và mọi ca ở trên vẫn xanh.
  const MAIN = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../main.tsx'),
    'utf8',
  ).replace(/\r\n/g, '\n')

  it('main.tsx gọi donKhoaRacHeCu() đúng một lần lúc khởi động', () => {
    expect(MAIN).toMatch(/import\s*\{[^}]*\bdonKhoaRacHeCu\b[^}]*\}\s*from\s*['"]\.\/lib\/storage['"]/)
    // `?? []` để lượt gỡ dây báo "expected [] to have length 1" thay vì "Target cannot be null" —
    // ca kiểm hỏng phải nói ngay được là THIẾU lời gọi, không bắt người đọc suy ra.
    expect(MAIN.match(/\bdonKhoaRacHeCu\s*\(\s*\)/g) ?? []).toHaveLength(1)
  })
})
