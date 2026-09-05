// @vitest-environment happy-dom
//
// Task 7 (kho-bai-viet-giai-doan-5-6): sáu màn (Thư viện, Hướng dẫn, Mindmap, ba thẻ Truy cập nhanh
// "Tiếp cận vấn đề"/"ECG"/"Phác đồ", màn chuyên khoa) dùng CHUNG một BoardGallery/LuoiMuc, chỉ khác
// props lọc (BoLocMuc, Task 5). Ba ca dưới đây ghim đúng bộ lọc của ba màn: Thư viện loại trừ
// "huong-dan", Hướng dẫn CHỈ nhận danhMuc đó, và thẻ ECG mở lưới trộn cả hai `loai` cùng danhMuc
// 'ecg'.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

vi.mock('../board/index', () => ({ VoMuc: () => <div data-testid="vo-muc" /> }))

const muc = (id: string, loai: MucMeta['loai'], danhMuc: MucMeta['danhMuc']): MucMeta => ({
  id,
  loai,
  danhMuc,
  ten: id,
  taoLuc: 1,
  capNhatLuc: 1,
  chuyenKhoa: '',
  tags: [],
  noiDungTimKiem: '',
})

describe('sáu màn dùng chung LuoiMuc', () => {
  it('Thư viện: chỉ bài viết, KHÔNG gồm Hướng dẫn', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-hd', 'bai-viet', 'huong-dan'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg', 'so-do', 'ecg'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))

    await waitFor(() => expect(screen.getByText('bv-ecg')).toBeTruthy())
    expect(screen.queryByText('bv-hd')).toBeNull()
    expect(screen.queryByText('sd-ecg')).toBeNull()
  })

  it('Hướng dẫn: đúng những mục danh mục huong-dan', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-hd2', 'bai-viet', 'huong-dan'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))

    await waitFor(() => expect(screen.getByText('bv-hd2')).toBeTruthy())
  })

  it('thẻ ECG ở Trang chủ mở lưới lọc theo danh mục ecg, trộn cả hai loại', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg3', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg3', 'so-do', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-pd3', 'bai-viet', 'phac-do'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))

    await waitFor(() => expect(screen.getByText('bv-ecg3')).toBeTruthy())
    expect(screen.getByText('sd-ecg3')).toBeTruthy()
    expect(screen.queryByText('bv-pd3')).toBeNull()
  })
})
