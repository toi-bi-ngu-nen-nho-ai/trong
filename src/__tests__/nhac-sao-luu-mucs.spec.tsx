// @vitest-environment happy-dom
//
// Review Task 5-8 vòng sửa 1/5 (Important 1): `hasCustomContent` (App.tsx, khai báo ngay trên
// `showBackupReminder`) trước bản vá này chỉ đếm bốn collection localStorage cũ (kháng sinh, bệnh
// lý, thuốc truyền, thẻ ghi nhớ) — kho `mucs` (bài viết/sơ đồ, hệ THAY THẾ ArticleScreen/EcgScreen
// đã xoá ở giai đoạn 8) hoàn toàn vắng mặt trong phép tính, dù comment ngay trên nó khẳng định
// "tính theo TẤT CẢ mục tự nhập". Hệ quả: người dùng mà nội dung tự tạo DUY NHẤT là bài viết/sơ đồ
// trong kho mucs — đúng nhóm plan này tồn tại để phục vụ — không bao giờ thấy dải "Đã lâu chưa sao
// lưu — dữ liệu chỉ nằm trên máy này, mất máy là mất hết." (App.tsx, gần cuối JSX của App()).
//
// Hai ca dưới đây mount `<App />` THẬT (không dựng lại logic riêng) và seed thẳng vào store
// `mucs` của IndexedDB giả, theo đúng khuôn `sau-man-luoi-muc.spec.tsx`/`DataSyncScreen-mucs.spec.tsx`.
import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

// Vỏ nạp chậm thật (BlockSuite) không mount được dưới happy-dom — cùng lý do các spec mount <App/>
// khác trong dự án đã ghi (ví dụ DataSyncScreen-mucs.spec.tsx). Màn Trang chủ không đụng bảng vẽ.
vi.mock('../board/index', () => ({
  VoMuc: () => null,
}))

// Mount App() thật dưới happy-dom + fake-indexeddb — cùng cảnh chậm mà các file mount <App/> khác
// của giai đoạn 7-9 đã đo (55-90s cho lượt đầu). Nới CỤC BỘ, không đụng testTimeout toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `nhac-sao-luu-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Bài tự viết thử',
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: '',
    tags: [],
    noiDungTimKiem: '',
    ...overrides,
  }
}

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  localStorage.clear()
})

describe('nhắc sao lưu tính cả kho mucs (review Task 5-8 vòng sửa 1/5, Important 1)', () => {
  // Localstorage sạch (không `drtrong:lastBackupAt`) → shouldRemindBackup() mặc định true (chưa
  // từng xuất file) — không cần giả lập "đã lâu không sao lưu", chỉ cần hasCustomContent đúng.
  it('chỉ có MỘT mục trong kho mucs (không kháng sinh/bệnh lý/thuốc truyền/thẻ nào) vẫn hiện dải nhắc sao lưu', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Đã lâu chưa sao lưu/)).toBeTruthy()
    })
  }, HAN_GIO_MOUNT_APP_MS)

  it('mục mucs duy nhất đã XOÁ MỀM (daXoaLuc) thì KHÔNG tính là nội dung đang có — không hiện dải nhắc', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia({ daXoaLuc: Date.now() }))

    const { default: App } = await import('../App')
    render(<App />)

    // Chờ hết một nhịp settle (mucsCol nạp xong + effect chạy) rồi khẳng định KHÔNG có dải nhắc —
    // dùng một mốc chắc chắn đã render xong (nút "Tạo bài mới" ở Trang chủ) thay vì chờ cố định.
    await screen.findByRole('button', { name: /Tạo bài mới/ })
    expect(screen.queryByText(/Đã lâu chưa sao lưu/)).toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)
})
