// @vitest-environment happy-dom
//
// happy-dom không có IndexedDB, nên file này tiêm một DB giả: nó canh HỢP ĐỒNG (xoá đúng khoá nào,
// ở store nào, có nuốt lỗi không), còn phần mở DB thật kiểm trên trình duyệt.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KHOA_VIEWPORT, TEN_STORE_DOC, xoaNoiDungBang } from '../xoaNoiDungBang'

function dbGia() {
  const daXoa: string[] = []
  const storeDaMo: string[] = []
  const db = {
    transaction(ten: string) {
      storeDaMo.push(ten)
      return {
        objectStore: () => ({
          delete: (khoa: string) => {
            daXoa.push(khoa)
            return {}
          },
        }),
        // Giao dịch "xong" ngay ở lượt vi-task kế tiếp.
        set oncomplete(f: () => void) {
          queueMicrotask(f)
        },
        set onerror(_f: () => void) {},
      }
    },
    close: vi.fn(),
  }
  return { db, daXoa, storeDaMo }
}

describe('xoaNoiDungBang — dọn nội dung bảng sau khi xoá vĩnh viễn', () => {
  beforeEach(() => localStorage.clear())

  it('xoá bản ghi doc của ĐÚNG những bảng được nêu, trong store collection', async () => {
    const { db, daXoa, storeDaMo } = dbGia()
    await xoaNoiDungBang(['bang-a', 'bang-b'], {
      moDb: async () => db as unknown as IDBDatabase,
      luuTru: localStorage,
    })
    expect(daXoa).toEqual(['bang-a', 'bang-b'])
    expect(storeDaMo.every((s) => s === TEN_STORE_DOC)).toBe(true)
  })

  it('xoá luôn khoá viewport trong localStorage, không đụng khoá của bảng khác', async () => {
    localStorage.setItem(KHOA_VIEWPORT('bang-a'), '{"zoom":1}')
    localStorage.setItem(KHOA_VIEWPORT('bang-con-song'), '{"zoom":2}')
    const { db } = dbGia()
    await xoaNoiDungBang(['bang-a'], {
      moDb: async () => db as unknown as IDBDatabase,
      luuTru: localStorage,
    })
    expect(localStorage.getItem(KHOA_VIEWPORT('bang-a'))).toBeNull()
    expect(localStorage.getItem(KHOA_VIEWPORT('bang-con-song'))).toBe('{"zoom":2}')
  })

  it('KHÔNG mở DB khi không có bảng nào — đường xoá 0 mục không được đụng vào lưu trữ', async () => {
    const moDb = vi.fn()
    await xoaNoiDungBang([], { moDb, luuTru: localStorage })
    expect(moDb).not.toHaveBeenCalled()
  })

  it('mở DB hỏng → KHÔNG ném ra ngoài (meta đã xoá rồi, kéo cả lượt xoá hỏng theo là vô ích)', async () => {
    const canh = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      xoaNoiDungBang(['bang-a'], {
        moDb: async () => {
          throw new Error('IndexedDB chết')
        },
        luuTru: localStorage,
      }),
    ).resolves.toBe(false)
    expect(canh).toHaveBeenCalled()
    canh.mockRestore()
  })

  it('DB hỏng vẫn dọn khoá viewport — hai lớp lưu trữ độc lập nhau', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(KHOA_VIEWPORT('bang-a'), '{}')
    await xoaNoiDungBang(['bang-a'], {
      moDb: async () => {
        throw new Error('IndexedDB chết')
      },
      luuTru: localStorage,
    })
    expect(localStorage.getItem(KHOA_VIEWPORT('bang-a'))).toBeNull()
    vi.restoreAllMocks()
  })
})
