// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../idb'

describe('object store mucs', () => {
  it('có tên "mucs" trong IDB_STORES', () => {
    expect(IDB_STORES.mucs).toBe('mucs')
  })

  it('ghi rồi đọc lại được một bản ghi', async () => {
    const muc = {
      id: 'muc-1',
      loai: 'bai-viet' as const,
      danhMuc: 'ecg' as const,
      ten: 'Rung nhĩ',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    expect(await idbPut(IDB_STORES.mucs, muc)).toBe(true)
    const ds = await idbGetAll<typeof muc>(IDB_STORES.mucs)
    expect(ds.find((m) => m.id === 'muc-1')?.ten).toBe('Rung nhĩ')
  })

  it('KHÔNG xoá store cũ nào — giai đoạn 9 mới được phá huỷ', () => {
    expect(IDB_STORES.boards).toBe('boards')
    expect(IDB_STORES.articles).toBeDefined()
    expect(IDB_STORES.ecgLessons).toBeDefined()
  })
})
