import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { capNhatAnhXemTruoc, taoIdBang } from '../boardMeta'

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
})

describe('taoIdBang', () => {
  it('sinh id khác nhau ở hai lượt gọi liên tiếp, đúng tiền tố', () => {
    const a = taoIdBang()
    const b = taoIdBang()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^bang-/)
  })
})

describe('capNhatAnhXemTruoc', () => {
  it('ghi ảnh xem trước cho bảng đã tồn tại, cập nhật capNhatLuc', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'x', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatAnhXemTruoc('x', 'data:image/jpeg;base64,xyz')

    const ds = await idbGetAll<{ id: string; anhXemTruoc?: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'x')
    expect(sau?.anhXemTruoc).toBe('data:image/jpeg;base64,xyz')
    expect(sau!.capNhatLuc).toBeGreaterThan(bayGio)
  })

  it('bảng KHÔNG tồn tại → không ném lỗi, không tạo mục mới', async () => {
    await expect(capNhatAnhXemTruoc('khong-ton-tai', 'x')).resolves.toBeUndefined()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'khong-ton-tai')).toBeUndefined()
  })
})
