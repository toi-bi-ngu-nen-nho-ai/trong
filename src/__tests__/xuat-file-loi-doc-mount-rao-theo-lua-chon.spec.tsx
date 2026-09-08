// @vitest-environment happy-dom
//
// BỔ SUNG Task 9c (điều phối gộp thêm sau re-review Task 9b, xem task-9c-brief.md).
//
// `duLieuChuaDocDuoc` (App.tsx, truyền vào DataSyncScreen = `mucsCol.loiDoc !== null`) phản ánh lượt
// đọc kho `mucs` LÚC MOUNT. Trước bản vá này, `handleExport` chặn CỨNG toàn bộ lượt xuất hễ
// `duLieuChuaDocDuoc` là true — KHÔNG rào theo `exportSelection["mucs"]`. Đúng hình dạng lỗi
// Important 1 mà Task 9b đã vá cho lượt đọc TƯƠI (lúc bấm nút "Xuất file"): một lượt đọc mucs hỏng
// (lần này là lúc MOUNT, không phải lúc bấm) chặn cả những nhóm chẳng liên quan (kháng sinh, bệnh
// lý, công thức pha…) dù chúng đọc bình thường — biến câu khuyên "bỏ chọn ô Bài viết & Sơ đồ nếu chỉ
// cần sao lưu các mục còn lại" thành một lối thoát KHÔNG TỒN TẠI.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll } from '../lib/idb'
// Namespace riêng CHỈ để `vi.spyOn` — App.tsx (và useIdbCollection.ts) import tĩnh `idbGetAllCoKetQua`
// từ đúng module này (`./lib/idb`), nên spy trên namespace ở đây thay được lời gọi thật ở CẢ HAI nơi:
// lượt đọc lúc MOUNT của mucsCol (useIdbCollection) và lượt đọc tươi lúc bấm nút trong handleExport.
import * as idbLib from '../lib/idb'
import { CUSTOM_COLLECTION_KEYS, saveCollection } from '../lib/storage'

// Mount `<App />` thật dưới happy-dom + fake-indexeddb tốn hàng chục giây — cùng lý do các spec anh
// em đã ghi. Rộng hơn các spec anh em một chút: ca RED (gỡ bản vá, bước 5) phải CHỜ ĐỦ 30s cho lượt
// "Xuất file" lần hai (đáng lẽ chạy được) mãi không tạo Blob, CỘNG với thời gian mount — nới CỤC BỘ,
// KHÔNG đụng `testTimeout` toàn cục.
const HAN_GIO_MOUNT_APP_MS = 150000
// Lượt xuất khi ô "Bài viết & Sơ đồ" đã bỏ chọn KHÔNG đụng IndexedDB/`import()` động nào (mọi khối
// đọc mucs/nội dung doc đều tự rào theo `exportSelection["mucs"]`) — thuần đồng bộ, nên hạn chờ Blob
// ngắn hơn hẳn `HAN_GIO_XUAT_FILE_MS` (30000ms) mà các spec anh em dùng cho lượt xuất CÓ đụng mucs.
// Ngắn có chủ đích: nếu bản vá bị gỡ, lượt xuất lần hai vẫn bị chặn cứng ngay lập tức (đồng bộ, không
// đợi I/O nào) — hạn ngắn vẫn đủ để bắt đúng SAI SỐ hành vi mà không biến ca RED thành một cuộc chờ
// 30 giây vô ích.
const HAN_GIO_XUAT_KHONG_DUNG_MUCS_MS = 5000
const HAN_GIO_CHAN_CUNG_MS = 5000

vi.mock('../board/index', () => ({ VoMuc: () => null }))

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  localStorage.clear()
  vi.restoreAllMocks()
})

async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

async function batXuatFile(timeout: number): Promise<Blob> {
  let blobDaXuat: Blob | null = null
  const gocCreate = URL.createObjectURL
  const gocRevoke = URL.revokeObjectURL
  // Object.defineProperty (không gán thẳng) — cùng lý do các spec anh em đã ghi: gán thẳng
  // URL.createObjectURL = ... có thể không có hiệu lực dưới happy-dom.
  Object.defineProperty(URL, 'createObjectURL', {
    value: (b: Blob) => {
      blobDaXuat = b
      return 'blob:gia-lap-xuat-mount-hong'
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  try {
    fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
    await waitFor(() => expect(blobDaXuat).not.toBeNull(), { timeout })
    return blobDaXuat as unknown as Blob
  } finally {
    Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
  }
}

describe('Lỗi đọc mucs LÚC MOUNT không được chặn xuất khi ô "Bài viết & Sơ đồ" đã bỏ chọn (BỔ SUNG Task 9c)', () => {
  it('Bỏ chọn ô "Bài viết & Sơ đồ": lượt xuất VẪN CHẠY dù mucsCol đọc hỏng lúc mount, file chứa các nhóm còn lại', async () => {
    saveCollection(CUSTOM_COLLECTION_KEYS.antibiotics, [{ id: 'ks-mount-hong', name: 'Kháng sinh còn đọc được', dose: '', notes: '' }])

    // Lỗi đọc mucs LÚC MOUNT: mucsCol (useIdbCollection, App.tsx) gọi idbGetAllCoKetQua đúng MỘT lần
    // trong effect boot() lúc mount — mock hỏng nó TRƯỚC khi mount để lượt đọc đó thất bại, đúng cách
    // useIdbCollection.ts tự đặt `loiDoc` (xem nhánh `if (!kq.ok)` của hook đó).
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockResolvedValue({ ok: false, loi: 'giả lập: lỗi đọc mucs lúc mount' })
    try {
      await moManDongBo()

      // ── Xác nhận duLieuChuaDocDuoc đã thật sự lên true ────────────────────────────────────────
      // Bấm Xuất trong lúc ô "Bài viết & Sơ đồ" còn đang CHỌN (mặc định) phải bị chặn cứng — đúng
      // thiết kế gốc của Task 4, KHÔNG đổi bởi bản vá BỔ SUNG này. Đồng thời đây là tín hiệu chờ:
      // đợi đúng lúc lượt đọc-hỏng-lúc-mount đã được mucsCol ghi nhận (loiDoc khác null) trước khi
      // thao tác tiếp — nếu chỉ chờ nhãn "Bài viết & Sơ đồ" xuất hiện thì KHÔNG đủ (nhãn đó render
      // ngay cả lúc mucsCol.loading còn true, xem chú thích các spec anh em).
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
      await waitFor(() => expect(screen.getByText(/Chưa xuất được/)).toBeTruthy(), { timeout: HAN_GIO_CHAN_CUNG_MS })

      // Bỏ chọn ô "Bài viết & Sơ đồ" — đúng lời khuyên mà câu báo lỗi phía trên đưa ra.
      const oTile = screen.getByText('Bài viết & Sơ đồ').closest('button')
      if (!oTile) throw new Error('không tìm thấy ô "Bài viết & Sơ đồ"')
      fireEvent.click(oTile)

      // ← đây là khẳng định ĐỎ hôm nay (trước bản vá BỔ SUNG): rào cũ (`if (duLieuChuaDocDuoc)`)
      // không xét exportSelection, nên bấm lại vẫn bị chặn cứng dù ô đã bỏ chọn — không Blob nào
      // được tạo, `batXuatFile` hết hạn ${HAN_GIO_XUAT_KHONG_DUNG_MUCS_MS}ms mà blobDaXuat vẫn null.
      const blob = await batXuatFile(HAN_GIO_XUAT_KHONG_DUNG_MUCS_MS)
      const text = await blob.text()
      const parsed = JSON.parse(text) as { data: { antibiotics?: { id: string }[]; mucs?: unknown[] } }
      expect(parsed.data.antibiotics?.some((a) => a.id === 'ks-mount-hong')).toBe(true)
      expect(parsed.data.mucs).toEqual([])
      await waitFor(() => expect(screen.getByText(/^Đã xuất/)).toBeTruthy())
    } finally {
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)
})
