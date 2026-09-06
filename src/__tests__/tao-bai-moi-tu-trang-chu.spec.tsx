// @vitest-environment happy-dom
//
// Luồng "Tạo bài mới" ở Trang chủ — Task 6 (kho-bai-viet-giai-doan-5-6). Trước lượt này nút gọi
// thẳng onNavigate("addEntry") vào AddEntryScreen của hệ cũ; nay nó phải mở ChonDanhMuc, sinh một
// MucMeta loại "bai-viet" vào store `mucs`, rồi mở thẳng vỏ trang bài viết (không dừng ở lưới —
// khác luồng tạo sơ đồ, xem taoBaiVietMoi trong App.tsx).
import 'fake-indexeddb/auto'

import { act } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

// Vỏ nạp chậm thật (BlockSuite) không mount được trong happy-dom — thay bằng một thẻ ghi lại
// `loai` mà VoMuc nhận được, cùng mẫu BoardGallery-loai-theo-ban-ghi.spec.tsx đã dùng. Đường import
// khớp đúng import của BoardGallery.tsx ('./index' trong src/board/, tức '../board/index' từ đây).
vi.mock('../board/index', () => ({
  VoMuc: ({ loai }: { loai: string }) => <div data-testid="vo-muc" data-loai={loai} />,
}))

// Hồi quy HIỆU NĂNG (không phải tính đúng đắn) của Plan 3 giai đoạn 7-9 — cùng nguyên nhân đã ghi ở
// src/__tests__/sau-man-luoi-muc.spec.tsx: mỗi `it` ở đây `await import('../App')` rồi
// `render(<App />)`, và Task 1-3 (đọc `mucs` ở SearchScreen, thêm `mucsCol`, thêm phần đồng bộ dữ
// liệu) đều mount thêm việc vào CÙNG một lượt mount đó. Đã tự kiểm bằng
// `npx vitest run ... --testTimeout=90000` → 15/15 xanh (5 ca file này + 10 ca
// sau-man-luoi-muc.spec.tsx). Nới CỤC BỘ bằng tham số thứ ba của từng `it`, không đụng
// `testTimeout` toàn cục. CẦN ĐO LẠI sau Task 8 (kho-bai-viet-giai-doan-7-9) — Task 6-8 gỡ 7 màn +
// 8 tệp khỏi App, nhiều khả năng ngưỡng này có thể hạ lại gần 20000ms mặc định.
const HAN_GIO_MOUNT_APP_MS = 90000

// fake-indexeddb sống suốt cả file (không tự reset giữa các `it()`) — dọn store `mucs` sau mỗi ca
// để ca sau không thấy lẫn bản ghi của ca trước, đặc biệt quan trọng cho ca đếm-số-bản-ghi.
afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
})

describe('Tạo bài mới từ Trang chủ', () => {
  it('bấm nút → chọn danh mục → sinh MucMeta loại bai-viet và mở vỏ trang', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    // Quét TRONG bảng chọn danh mục (role="dialog"), không phải toàn `screen`: từ Task 7, thẻ Truy
    // cập nhanh "Phác đồ" ở Trang chủ không còn nhãn "Sắp ra mắt" (nó nay mở màn lưới lọc theo danh
    // mục thật) nên tên hiển thị của nó trùng HỆT nút "Phác đồ" trong bảng chọn này — hai nút cùng
    // tồn tại trong DOM cùng lúc (bảng chọn là lớp phủ, không unmount Trang chủ bên dưới), khiến
    // `screen.findByRole` không phân biệt được nữa nếu không thu hẹp phạm vi.
    const bangChon = await screen.findByRole('dialog', { name: /Chọn danh mục/ })
    fireEvent.click(within(bangChon).getByRole('button', { name: 'Phác đồ' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.loai === 'bai-viet')?.danhMuc).toBe('phac-do')
    })

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })
  }, HAN_GIO_MOUNT_APP_MS)

  it('KHÔNG còn dẫn vào AddEntryScreen của hệ cũ', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    expect(screen.getByRole('dialog', { name: /Chọn danh mục/ })).toBeTruthy()
  }, HAN_GIO_MOUNT_APP_MS)

  // Cùng lớp lỗi đã vá ở taoMucVoiDanhMuc (LuoiMuc.tsx, Task 4) — nút danh mục trong ChonDanhMuc
  // KHÔNG tự mang khoá chống bấm đúp (component đó chỉ được phép import React + ./mucMeta, không
  // thêm logic khoá), và onChon gọi setTaoBaiMoiDangMo(false) — một state React, chỉ có tác dụng ở
  // lượt render SAU — TRƯỚC khi gọi ĐỒNG BỘ taoBaiVietMoi. Hai cú click trúng nút danh mục trước
  // khi React kịp gỡ lớp phủ (double-fire trên một số trình duyệt cảm ứng — xem chú thích dài ở
  // taoBangMoi/taoMucVoiDanhMuc, LuoiMuc.tsx) sẽ chạy trọn hàm tạo hai lần nếu App không tự có khoá
  // ref riêng cho đường này — ghi HAI bản ghi cho một cú bấm.
  it('bấm ĐÚP nút danh mục (hai click trước khi React kịp đóng bảng) → chỉ MỘT MucMeta', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    // Cùng lý do thu hẹp phạm vi vào bảng chọn đã ghi ở ca kiểm đầu file (Task 7: nhãn thẻ Trang chủ
    // và nhãn nút trong bảng chọn nay trùng nhau).
    const bangChon = await screen.findByRole('dialog', { name: /Chọn danh mục/ })
    const nutDanhMuc = within(bangChon).getByRole('button', { name: 'Phác đồ' })

    // Hai dispatchEvent trong CÙNG một act() — React chưa flush render giữa hai lượt gọi nên nút
    // danh mục còn nguyên trong DOM cho cú thứ hai, mô phỏng đúng cửa sổ lọt double-fire (kỹ thuật
    // giống hệt LuoiMuc.spec.ts).
    await act(async () => {
      nutDanhMuc.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
      nutDanhMuc.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
    })

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.filter((m) => m.loai === 'bai-viet')).toHaveLength(1)
    })
  }, HAN_GIO_MOUNT_APP_MS)

  // "Vào rồi RA" — tạo xong một bài, rời khỏi vỏ trang, quay lại Trang chủ, rồi tạo bài THỨ HAI.
  // Khoá chống bấm đúp (dangTaoBaiVietRef, App.tsx) chỉ được đặt lại `false` khi bảng chọn MỞ RA
  // (onTaoBaiMoi) — nếu quên đặt lại, nó còn nguyên `true` từ lượt tạo TRƯỚC đã thành công, và lượt
  // tạo THỨ HAI sẽ bị khoá oan, không ghi thêm bản ghi nào dù người dùng thao tác hoàn toàn bình
  // thường. Hai ca kiểm bấm-đúp/bấm-đơn ở trên không bắt được lỗi này vì mỗi ca chỉ render App() một
  // lần rồi tạo đúng MỘT bài.
  //
  // Đợt vá cuối trước hợp nhất — C2: lối "quay lại Trang chủ" đổi từ thanh nav dưới (nút "Trang chủ")
  // sang HAI bước — "quay-lai" (BoardGallery, thoát vỏ soạn thảo về lưới danh mục) rồi
  // "quay-lai-danh-muc" (App, thoát màn danh mục về Trang chủ) — vì taoBaiVietMoi nay hạ cánh ở màn
  // "danhMuc" (NON_TAB_SCREENS), nơi thanh nav dưới LUÔN ẩn, không còn nút "Trang chủ" nào để bấm.
  it('tạo xong một bài rồi quay lại Trang chủ tạo bài THỨ HAI vẫn được (khoá không kẹt lại)', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    // Cùng lý do thu hẹp phạm vi vào bảng chọn đã ghi ở ca kiểm đầu file.
    let bangChon = await screen.findByRole('dialog', { name: /Chọn danh mục/ })
    fireEvent.click(within(bangChon).getByRole('button', { name: 'Phác đồ' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.filter((m) => m.loai === 'bai-viet')).toHaveLength(1)
    })
    // Bảng chọn phải tự đóng sau khi tạo xong — không còn dialog nào che mất Trang chủ/màn danh mục.
    expect(screen.queryByRole('dialog', { name: /Chọn danh mục/ })).toBeNull()

    // Vỏ soạn thảo mở qua đường moBangYeuCau tự tra `loai` bằng một idbGetAll BẤT ĐỒNG BỘ RIÊNG
    // (BoardGallery.tsx) — chậm hơn lượt idbGetAll của chính test này ở trên, nên phải đợi vo-muc
    // THẬT SỰ xuất hiện trước khi tìm nút "quay-lai" của nó, không suy đoán từ việc bản ghi đã tồn
    // tại trong store.
    await waitFor(() => expect(screen.getByTestId('vo-muc')).toBeTruthy())

    // Rời vỏ trang (về lưới danh mục "Phác đồ"), rồi rời màn danh mục đó (về Trang chủ).
    fireEvent.click(screen.getByTestId('quay-lai'))
    await screen.findByTestId('quay-lai-danh-muc')
    fireEvent.click(screen.getByTestId('quay-lai-danh-muc'))
    await screen.findByRole('button', { name: /Tạo bài mới/ })

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    bangChon = await screen.findByRole('dialog', { name: /Chọn danh mục/ })
    fireEvent.click(within(bangChon).getByRole('button', { name: 'ECG' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.filter((m) => m.loai === 'bai-viet')).toHaveLength(2)
    })
  }, HAN_GIO_MOUNT_APP_MS)

  // ─── Đợt vá cuối trước hợp nhất — C2 ─────────────────────────────────────────────────────────
  // taoBaiVietMoi (App.tsx) từng kết thúc bằng navigate("mindmap"): bài viết mở đúng vỏ (VoMuc
  // loai:'bai-viet') nhưng bấm "quay lại" thì rơi vào LƯỚI MINDMAP — lưới đó lọc CỨNG loai:'so-do',
  // nên bài viết vừa tạo KHÔNG BAO GIỜ hiện ra ở đó. Đọc như "bài viết vừa viết biến mất", trong khi
  // thanh nav dưới lại sáng đèn "Mindmap" — sai cả nơi hạ cánh lẫn tín hiệu điều hướng.
  //
  // Bản vá: taoBaiVietMoi đặt danhMucDangXem = danhMuc rồi navigate("danhMuc") thay vì "mindmap".
  // Người dùng rơi vào lưới lọc theo DANH MỤC (không lọc loai) — nơi bài viết vừa tạo CÓ hiện.
  //
  // Ca này đi trọn hành trình "vào rồi RA" (bài học đã ghi của dự án — "mở lên chạy đúng" không đủ):
  // tạo bài → thoát vỏ soạn thảo → khẳng định bài HIỆN trong lưới đang đứng, VÀ đang đứng đúng màn
  // "danhMuc" (data-testid="quay-lai-danh-muc" CHỈ tồn tại ở màn đó — LuoiMuc.tsx chỉ render nút này
  // khi onQuayLai được truyền, và trong App.tsx hiện chỉ instance BoardGallery của màn "danhMuc"
  // truyền onQuayLai) chứ không phải kẹt ở Mindmap.
  it('C2: thoát vỏ soạn thảo bài mới → thấy bài trong lưới danh mục đang đứng, KHÔNG kẹt ở Mindmap', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    const bangChon = await screen.findByRole('dialog', { name: /Chọn danh mục/ })
    fireEvent.click(within(bangChon).getByRole('button', { name: 'ECG' }))

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })

    // Thoát vỏ soạn thảo — nút "quay lại" của BoardGallery (data-testid="quay-lai"). Nếu đường
    // mở-theo-id (moBangYeuCau) vô tình kích hoạt CẢ HAI instance BoardGallery cùng lúc (Mindmap
    // luôn mount + instance màn "danhMuc" vừa mount cho lượt tạo này), sẽ có HAI phần tử cùng testid
    // này và getByTestId ném lỗi "multiple elements" ngay tại đây — đúng thứ BoardGallery.tsx phải
    // chặn (guard theo dangHienTab trên effect tiêu thụ moBangYeuCau).
    fireEvent.click(screen.getByTestId('quay-lai'))

    // Đứng đúng màn "danhMuc" (ECG), không phải Mindmap.
    await screen.findByTestId('quay-lai-danh-muc')

    // Bài vừa tạo PHẢI hiện trong lưới đang đứng — hành vi TRƯỚC bản vá không có: bài hiện trong
    // lưới Mindmap (lọc loai:'so-do', bài viết không lọt qua), không phải lưới danh mục này.
    await waitFor(() => expect(screen.getByText('Bài chưa đặt tên')).toBeTruthy())
  }, HAN_GIO_MOUNT_APP_MS)
})
