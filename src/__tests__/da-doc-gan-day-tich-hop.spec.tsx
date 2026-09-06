// @vitest-environment happy-dom
//
// VÒNG SỬA 1 (task-2, giai đoạn 7-9) — lỗi Critical: panel "Đã đọc gần đây" ở Trang chủ KHÔNG cập
// nhật TRONG PHIÊN LÀM VIỆC khi một mục `MucMeta` được mở qua BoardGallery — App() chỉ đọc
// `recentReads` MỘT LẦN lúc mount (`useState(loadRecentReads)`, App.tsx), còn BoardGallery.tsx (TRƯỚC
// bản vá này) tự ghi thẳng `localStorage` qua `recordRead('muc', id)` mà không có đường nào gọi
// ngược `setRecentReads` của App() — panel đứng yên tới khi người dùng TẢI LẠI TRANG.
//
// Hai ca kiểm CŨ (`src/board/__tests__/BoardGallery-ghi-nhan-doc.spec.tsx`) chỉ mount `<BoardGallery>`
// TRẦN rồi gọi thẳng `loadRecentReads()` — canh đúng lớp lưu trữ, nhưng KHÔNG đi qua App()/HomeScreen
// nên không bắt được lỗi này (đúng hạng "ca ghim giả" dự án đã trả giá ở Plan 2).
//
// Ca này mount `<App />` THẬT: mở một sơ đồ qua bấm thẻ trong lưới Mindmap → quay lại Trang chủ
// KHÔNG reload trang → khẳng định panel "Đã đọc gần đây" hiện đúng mục vừa mở, đúng thứ tự
// mới-nhất-trước.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SPECIALTIES } from '../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

// Vỏ nạp chậm thật (BlockSuite) không mount được trong happy-dom — cùng mẫu
// tao-bai-moi-tu-trang-chu.spec.tsx đã dùng: chỉ cần biết boardId nào được yêu cầu mở, không cần
// canvas thật để canh hành vi ghi nhận "Đã đọc gần đây".
vi.mock('../board/index', () => ({
  VoMuc: ({ boardId }: { boardId: string }) => <div data-testid="vo-muc" data-board-id={boardId} />,
}))

function taoMucGia(ten: string): MucMeta {
  const bayGio = Date.now()
  return {
    id: `tich-hop-${bayGio}-${Math.random().toString(36).slice(2, 6)}`,
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

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  localStorage.clear()
})

describe('Đã đọc gần đây — cập nhật TRONG PHIÊN qua App() thật (VÒNG SỬA 1)', () => {
  it('mở một sơ đồ qua bấm thẻ trong lưới Mindmap → quay lại Trang chủ KHÔNG reload → panel hiện đúng mục, mới nhất trước', async () => {
    const meta = taoMucGia('Sơ Đồ Tích Hợp Vòng Sửa 1')
    await idbPut(IDB_STORES.mucs, meta)

    const { default: App } = await import('../App')
    render(<App />)

    // Trang chủ ban đầu: chưa mở bài nào — đúng lời hứa của spec (không lấy đại vài bài đầu danh
    // sách ra hiển thị như hệ cũ).
    expect(screen.getByText(/Chưa mở bài nào/)).toBeTruthy()

    // Sang tab Mindmap, chờ lưới nạp xong rồi bấm đúng thẻ vừa gieo.
    fireEvent.click(screen.getByRole('button', { name: /^Mindmap$/ }))
    const the = await screen.findByRole('button', { name: new RegExp(`^Mở bảng ${meta.ten}`) })
    fireEvent.click(the)

    // Bảng vẽ (giả) đã "mở" — đúng boardId vừa bấm.
    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-board-id')).toBe(meta.id)
    })

    // Quay lại lưới (nút "quay-lai" của BoardGallery), rồi về Trang chủ — KHÔNG reload trang (đây
    // chính là kịch bản người dùng thật đã tái hiện: sang lại tab khác/Trang chủ trong CÙNG phiên).
    fireEvent.click(screen.getByTestId('quay-lai'))
    fireEvent.click(await screen.findByRole('button', { name: /^Trang chủ$/ }))

    // Panel "Đã đọc gần đây" phải hiện ĐÚNG mục vừa mở — không cần reload trang. Đây là khẳng định
    // CHÍNH của ca kiểm: trước bản vá, `recentReads` (state của App()) không đổi vì BoardGallery ghi
    // thẳng localStorage mà không gọi ngược setRecentReads — dòng dưới đây ĐỎ trong trường hợp đó.
    await waitFor(() => {
      expect(screen.getByText(meta.ten)).toBeTruthy()
    })
    expect(screen.queryByText(/Chưa mở bài nào/)).toBeNull()
  })
})
