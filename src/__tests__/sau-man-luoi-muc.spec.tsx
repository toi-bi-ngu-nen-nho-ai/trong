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

  // ─── Tự soát: "vào rồi RA" ────────────────────────────────────────────────────────────────────
  // Bài học đã ghi của dự án: "mở lên chạy đúng" không đủ — phải bấm VÀO, THOÁT RA, sang màn khác
  // rồi quay lại, xem có rò rỉ trạng thái không. Sáu màn ở Task 7 dùng CHUNG một BoardGallery/LuoiMuc
  // nhưng chỉ mount khi `screen` khớp (không giữ sống như instance Mindmap) — ca này ghim đúng việc
  // đó: mở một mục ở Thư viện, thoát ra, sang Hướng dẫn, không còn thấy mục của Thư viện lẫn dư ảnh
  // của vỏ trang vừa đóng; quay lại Thư viện vẫn đúng lưới cũ.
  it('vào Thư viện, mở một mục, thoát ra, sang Hướng dẫn rồi quay lại — không rò rỉ trạng thái', async () => {
    await idbPut(IDB_STORES.mucs, muc('tv-mo4', 'bai-viet', 'phac-do'))
    await idbPut(IDB_STORES.mucs, muc('hd-rieng4', 'bai-viet', 'huong-dan'))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /^Mở bảng tv-mo4/ }))
    await waitFor(() => expect(screen.getByTestId('vo-muc')).toBeTruthy())

    fireEvent.click(screen.getByTestId('quay-lai'))
    // "quay lại" giấu CẢ HAI nhánh (lưới lẫn vỏ trang) trong một nhịp rất ngắn trước khi lưới mount
    // lại thật (cờ `dangDong`, BoardGallery.tsx) — chờ bằng waitFor, không phải expect đồng bộ ngay
    // sau khi vo-muc biến mất.
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))
    await waitFor(() => expect(screen.getByText('hd-rieng4')).toBeTruthy())
    expect(screen.queryByText('tv-mo4')).toBeNull()
    expect(screen.queryByTestId('vo-muc')).toBeNull()
    expect(screen.queryByTestId('quay-lai')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())
    expect(screen.queryByText('hd-rieng4')).toBeNull()
  })

  // ─── Tự soát: chuỗi thao tác nối tiếp giữa các thẻ danh mục ──────────────────────────────────
  // Ba thẻ "Tiếp cận vấn đề"/"ECG"/"Phác đồ" dùng CHUNG một nhánh Screen "danhMuc" + state
  // `danhMucDangXem` — rủi ro thật là danh mục CŨ còn dính lại khi bấm thẻ khác, vì hai lượt mở chỉ
  // khác nhau ở MỘT state, không phải một Screen riêng. Ca này bấm ECG rồi quay Trang chủ rồi bấm
  // Phác đồ, xác nhận lưới đổi đúng nội dung, không cộng dồn dữ liệu của thẻ trước.
  it('bấm ECG rồi Trang chủ rồi Phác đồ — lưới đổi đúng danh mục, không cộng dồn thẻ trước', async () => {
    await idbPut(IDB_STORES.mucs, muc('ecg-rieng5', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('pd-rieng5', 'bai-viet', 'phac-do'))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))
    await waitFor(() => expect(screen.getByText('ecg-rieng5')).toBeTruthy())
    expect(screen.queryByText('pd-rieng5')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }))
    await screen.findByRole('button', { name: /Tạo bài mới/ })

    fireEvent.click(screen.getByRole('button', { name: 'Phác đồ' }))
    await waitFor(() => expect(screen.getByText('pd-rieng5')).toBeTruthy())
    expect(screen.queryByText('ecg-rieng5')).toBeNull()
  })
})
