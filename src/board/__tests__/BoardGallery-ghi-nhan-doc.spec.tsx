// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { loadRecentReads, recordRead } from '../../lib/recentReads'
import { choDenKhi } from '../../__tests__/helpers/cho-den-khi'
import { type MucMeta } from '../mucMeta'
import { BoardGallery } from '../BoardGallery'

// Task 2 (giai đoạn 7-9): "Đã đọc gần đây" phải ghi nhận cả mục MucMeta của kho mới. File này canh
// ĐÚNG hai điểm BoardGallery.tsx gọi `onDaDoc(id)` — mở qua bấm thẻ trong lưới (onMoBang) và mở
// thẳng theo id từ ngoài (effect moBangYeuCau, dùng bởi tìm kiếm/"Tạo bài mới") — và rằng một id
// KHÔNG tồn tại trong kho thì KHÔNG được gọi (đó không phải một lượt mở thành công).
//
// VÒNG SỬA 1: từ bản vá lỗi Critical (panel "Đã đọc gần đây" không cập nhật trong phiên — xem
// chú thích dài tại `ghiDaDocMuc`, App.tsx), BoardGallery.tsx KHÔNG còn tự gọi `recordRead` vào
// localStorage nữa — nó chỉ gọi ngược `onDaDoc(id)`, một prop BẮT BUỘC do App() truyền xuống. File này CHỈ
// canh "BoardGallery gọi ĐÚNG onDaDoc, ĐÚNG lúc, ĐÚNG id" ở TẦNG COMPONENT (không đi qua App()) —
// truyền tay một `onDaDoc` gọi thẳng `recordRead` để vẫn kiểm được lớp lưu trữ THẬT, giữ nguyên giá
// trị hai ca kiểm dương tính vốn có. Ca này KHÔNG chứng minh panel "Đã đọc gần đây" ở Trang chủ cập
// nhật được trong phiên — đó là việc của ca TÍCH HỢP mount `<App />` thật, xem
// `src/__tests__/da-doc-gan-day-tich-hop.spec.tsx`.
//
// `../index` (VoMuc) được giả bằng một component tối giản — cùng lý do BoardGallery.spec.ts đã giả:
// không cần dựng canvas/BlockSuite thật để canh hành vi điều hướng/ghi nhận.
vi.mock('../index', () => ({
  VoMuc: ({ boardId }: { boardId: string }) =>
    createElement('div', { 'data-testid': 'bang-gia', 'data-board-id': boardId }, 'BẢNG GIẢ'),
}))

function taoBangGia(ten: string): MucMeta {
  const bayGio = Date.now()
  return {
    id: `bang-gia-${bayGio}-${Math.random().toString(36).slice(2, 6)}`,
    loai: 'so-do',
    danhMuc: 'tiep-can',
    ten,
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: SPECIALTIES[0].id,
    tags: [],
    noiDungTimKiem: '',
  }
}

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('BoardGallery — ghi nhận "Đã đọc gần đây"', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    localStorage.clear()
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const b of ds) await idbDelete(IDB_STORES.mucs, b.id)
    localStorage.clear()
  })

  it('bấm một thẻ bảng, mở thành công → ghi nhận recordRead("muc", id)', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.mucs, meta)
    await act(async () => {
      root.render(
        createElement(BoardGallery, {
          dangHienTab: true,
          tieuDe: 'Sơ đồ tư duy',
          loaiTaoDuoc: ['so-do'],
          onDaDoc: (id: string) => recordRead('muc', id),
        }),
      )
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    // Chưa bấm gì — chưa có gì được ghi.
    expect(loadRecentReads()).toHaveLength(0)

    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull()
    })

    const ds = loadRecentReads()
    expect(ds).toHaveLength(1)
    expect(ds[0]).toMatchObject({ kind: 'muc', id: meta.id })
  })

  it('mở thẳng theo id có thật qua moBangYeuCau (đường tìm kiếm/"Tạo bài mới") → ghi nhận', async () => {
    const meta = taoBangGia('Bảng mục tiêu')
    await idbPut(IDB_STORES.mucs, meta)

    await act(async () => {
      root.render(
        createElement(BoardGallery, {
          dangHienTab: true,
          moBangYeuCau: meta.id,
          tieuDe: 'Sơ đồ tư duy',
          loaiTaoDuoc: ['so-do'],
          onDaDoc: (id: string) => recordRead('muc', id),
        }),
      )
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(meta.id)
    })

    const ds = loadRecentReads()
    expect(ds).toHaveLength(1)
    expect(ds[0]).toMatchObject({ kind: 'muc', id: meta.id })
  })

  it('moBangYeuCau trỏ tới id KHÔNG tồn tại trong kho → KHÔNG ghi nhận (không phải một lượt mở thành công)', async () => {
    await act(async () => {
      root.render(
        createElement(BoardGallery, {
          dangHienTab: true,
          moBangYeuCau: 'id-khong-ton-tai',
          tieuDe: 'Sơ đồ tư duy',
          loaiTaoDuoc: ['so-do'],
          onDaDoc: () => {},
        }),
      )
    })

    // Cờ mở vẫn được set (hành vi cũ, không đổi) — chờ đúng mốc đó rồi mới kiểm recentReads, để
    // không đọc sớm lúc effect còn dở.
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(
        'id-khong-ton-tai',
      )
    })

    expect(loadRecentReads()).toHaveLength(0)
  })
})
