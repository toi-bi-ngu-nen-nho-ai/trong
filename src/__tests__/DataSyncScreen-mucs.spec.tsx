// @vitest-environment happy-dom
//
// Task 3 (giai đoạn 7-9, kho bài viết): màn "Đồng bộ dữ liệu" (Xuất/Nhập file) phải mang theo
// metadata store `mucs` (tên, danh mục, tag, chuyên khoa — Task 1 đã cho Tìm kiếm đọc, Task 2 đã
// cho "Đã đọc gần đây" ghi nhận). Task này CHỈ xuất/nhập bảng MucMeta[] — KHÔNG đụng nội dung doc
// CRDT thật (chữ/nét vẽ), việc đó là Task 4, tách riêng vì rủi ro D13 khác hẳn.
//
// Bốn ca dưới đây mount `<App />` THẬT và đi qua đúng nút bấm ("Đồng bộ dữ liệu" ở Trang chủ →
// "Xuất file sao lưu"/"Nhập file đã sao lưu" → "Xác nhận nhập"/"Hoàn tác") thay vì dựng
// DataSyncScreen trần với props tự chế. Lý do: dây nối thật đi App() → mucsCol (useIdbCollection) →
// prop customMucs của DataSyncScreen → handleExport/handleFileChange/handleConfirmImport — quên nối
// MỘT khâu trong dây đó (ví dụ quên truyền customMucs={mucsCol.items} ở lượt gọi <DataSyncScreen>
// thật trong App.tsx) sẽ không bị bắt nếu ca kiểm tự cấp customMucs cho một DataSyncScreen dựng
// riêng — đúng lớp lỗi "canh tắt lớp dưới" đã trả giá ở Task 2 (hai ca gọi thẳng loadRecentReads()
// khiến một lỗi người dùng thấy được lọt qua).
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

// Màn "Đồng bộ dữ liệu" tổng hợp SÁU collection (IndexedDB/localStorage: bài viết, kháng sinh,
// bệnh lý, bài học ECG, thẻ ghi nhớ, mucs) cùng lúc lúc mount — đo thật dưới happy-dom +
// fake-indexeddb: lượt mount+settle đầu tiên tốn tới ~55s, vượt hẳn `testTimeout` mặc định 20000ms
// của dự án (vite.config.ts, cỡ cho các màn nhẹ hơn nhiều — ví dụ Mindmap chỉ mount BoardGallery).
// Không phải treo vô hạn: đã xác nhận bằng log debug từng bước (bỏ ở bản này) chạy hết và trả đúng
// kết quả khi nới hạn giờ. Nới CỤC BỘ cho bốn ca của riêng file này, không đụng hạn giờ toàn cục.
const HAN_GIO_MAN_DONG_BO_MS = 60000

// Vỏ nạp chậm thật (BlockSuite) không mount được dưới happy-dom — cùng mẫu
// da-doc-gan-day-tich-hop.spec.tsx đã dùng. Màn "Đồng bộ dữ liệu" không đụng bảng vẽ nên vỏ giả chỉ
// cần tồn tại để App() mount được.
vi.mock('../board/index', () => ({
  VoMuc: () => null,
}))

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `sync-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục đồng bộ thử',
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

// Mount App() thật rồi bấm đúng nút "Đồng bộ dữ liệu" ở Trang chủ — không có đường tắt nào khác để
// tới màn này (không có route/URL trong app).
async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

describe('Đồng bộ dữ liệu mang theo metadata mucs (Task 3, giai đoạn 7-9)', () => {
  it('xuất file gồm cả mục metadata mucs', async () => {
    const meta = taoMucGia({ ten: 'Bài xuất thử' })
    await idbPut(IDB_STORES.mucs, meta)

    await moManDongBo()

    // Ô thống kê "Bài viết & Sơ đồ" đọc mucsCol từ IndexedDB — bất đồng bộ, chờ nạp xong.
    await waitFor(() => {
      expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy()
    })

    let blobDaXuat: Blob | null = null
    const gocCreate = URL.createObjectURL
    const gocRevoke = URL.revokeObjectURL
    // Object.defineProperty (không gán thẳng) — cùng lý do edgeless-board-image-toast-2.spec.ts đã
    // ghi lại: gán thẳng URL.createObjectURL = ... có thể không có hiệu lực dưới happy-dom.
    Object.defineProperty(URL, 'createObjectURL', {
      value: (b: Blob) => {
        blobDaXuat = b
        return 'blob:gia-lap-xuat-file'
      },
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })

    try {
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
      await waitFor(() => expect(blobDaXuat).not.toBeNull())
      const text = await (blobDaXuat as unknown as Blob).text()
      const parsed = JSON.parse(text) as { data: { mucs?: MucMeta[] } }
      expect(parsed.data.mucs).toHaveLength(1)
      expect(parsed.data.mucs?.[0]).toMatchObject({ id: meta.id, ten: 'Bài xuất thử' })
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
    }
  }, HAN_GIO_MAN_DONG_BO_MS)

  it('nhập file mucs mới gộp vào store, không đè mục đang có id khác', async () => {
    const dangCo = taoMucGia({ id: 'muc-dang-co-task3', ten: 'Mục đang có' })
    await idbPut(IDB_STORES.mucs, dangCo)

    await moManDongBo()
    await waitFor(() => {
      expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy()
    })

    const mucMoi = taoMucGia({ id: 'muc-moi-tu-file-task3', ten: 'Mục mới từ file' })
    const noiDungFile = JSON.stringify({ app: 'drtrong', version: 2, data: { mucs: [mucMoi] } })
    const file = new File([noiDungFile], 'sao-luu.json', { type: 'application/json' })

    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(inputFile, { target: { files: [file] } })

    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.id === 'muc-moi-tu-file-task3')).toBeTruthy()
      expect(ds.find((m) => m.id === 'muc-dang-co-task3')).toBeTruthy()
    })
  }, HAN_GIO_MAN_DONG_BO_MS)

  it('Hoàn tác nhập file trả mucs về đúng snapshot trước khi nhập', async () => {
    const dangCo = taoMucGia({ id: 'muc-truoc-nhap-task3', ten: 'Mục trước khi nhập' })
    await idbPut(IDB_STORES.mucs, dangCo)

    await moManDongBo()
    await waitFor(() => {
      expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy()
    })

    // File nhập ĐÈ đúng id đang có bằng nội dung khác — đây là ca "Hoàn tác" thật sự cần cứu, khác
    // "gộp thêm mục mới" ở ca kiểm trên.
    const banDeLen = taoMucGia({ id: 'muc-truoc-nhap-task3', ten: 'Mục đã bị ghi đè' })
    const noiDungFile = JSON.stringify({ app: 'drtrong', version: 2, data: { mucs: [banDeLen] } })
    const file = new File([noiDungFile], 'sao-luu.json', { type: 'application/json' })

    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(inputFile, { target: { files: [file] } })

    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.id === 'muc-truoc-nhap-task3')?.ten).toBe('Mục đã bị ghi đè')
    })

    fireEvent.click(await screen.findByRole('button', { name: /Hoàn tác lần nhập vừa rồi/ }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.id === 'muc-truoc-nhap-task3')?.ten).toBe('Mục trước khi nhập')
    })
  }, HAN_GIO_MAN_DONG_BO_MS)

  // Điều toàn cục #5 (task-3-report.md): nhập một file CŨ, không có khoá `mucs`, không được làm
  // hỏng gì — store mucs hiện có trên máy phải nguyên vẹn, và app không được ném lỗi/đứng hình.
  it('nhập file cũ không có khoá mucs → không hỏng gì, mucs hiện có giữ nguyên', async () => {
    const dangCo = taoMucGia({ id: 'muc-giu-nguyen-task3', ten: 'Mục phải còn nguyên' })
    await idbPut(IDB_STORES.mucs, dangCo)

    await moManDongBo()
    await waitFor(() => {
      expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy()
    })

    // File cũ: có dữ liệu hợp lệ ở một khoá khác (antibiotics) nhưng HOÀN TOÀN không có khoá `mucs`
    // — đúng hình dạng file xuất từ bản app trước Task 3.
    const noiDungFileCu = JSON.stringify({
      app: 'drtrong',
      version: 2,
      data: { antibiotics: [{ id: 'ks-cu-task3', name: 'Kháng sinh cũ', dose: '', notes: '' }] },
    })
    const file = new File([noiDungFileCu], 'sao-luu-cu.json', { type: 'application/json' })

    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(inputFile, { target: { files: [file] } })

    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))

    await waitFor(() => {
      expect(screen.getByText(/Đã nhập/)).toBeTruthy()
    })

    const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(ds.find((m) => m.id === 'muc-giu-nguyen-task3')?.ten).toBe('Mục phải còn nguyên')
    expect(ds).toHaveLength(1)
  }, HAN_GIO_MAN_DONG_BO_MS)

  // Vòng tròn thật: xuất file, rồi giả lập người dùng sửa/xoá vài mục NGAY TRÊN MÁY (đi thẳng qua
  // idb, mô phỏng chỉnh sửa ở màn khác — không phải việc của Task 3), rồi nhập lại CHÍNH file vừa
  // xuất. Mục bị sửa phải phục hồi đúng nội dung lúc xuất (import đè theo id — idbPutMany), mục bị
  // xoá phải xuất hiện lại nguyên vẹn (import chỉ gộp/đè, không xoá — xem upsertMany,
  // useIdbCollection.ts). Khác ca "Hoàn tác" ở trên: ca đó phục hồi bằng snapshot GIỮ TRONG BỘ NHỚ
  // của phiên làm việc; ca này đi trọn đường thật — Blob file thật, đọc lại bằng FileReader thật.
  it('vòng tròn: xuất → sửa/xoá vài mục → nhập lại → mucs trở về đúng như lúc xuất', async () => {
    const meta1 = taoMucGia({ id: 'muc-vong-tron-1', ten: 'Trước khi sửa 1' })
    const meta2 = taoMucGia({ id: 'muc-vong-tron-2', ten: 'Trước khi sửa 2' })
    await idbPut(IDB_STORES.mucs, meta1)
    await idbPut(IDB_STORES.mucs, meta2)

    await moManDongBo()
    await waitFor(() => {
      expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy()
    })

    let blobDaXuat: Blob | null = null
    const gocCreate = URL.createObjectURL
    const gocRevoke = URL.revokeObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      value: (b: Blob) => {
        blobDaXuat = b
        return 'blob:gia-lap-vong-tron'
      },
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })

    let noiDungDaXuat = ''
    try {
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
      await waitFor(() => expect(blobDaXuat).not.toBeNull())
      noiDungDaXuat = await (blobDaXuat as unknown as Blob).text()
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
    }

    // Sửa một mục, xoá hẳn mục kia — TRỰC TIẾP trên "máy" (idb), sau thời điểm đã xuất file.
    await idbPut(IDB_STORES.mucs, { ...meta1, ten: 'Đã sửa sau khi xuất' })
    await idbDelete(IDB_STORES.mucs, meta2.id)

    // Nhập lại ĐÚNG file vừa xuất (không phải file dựng tay như hai ca trên).
    const file = new File([noiDungDaXuat], 'sao-luu-vong-tron.json', { type: 'application/json' })
    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(inputFile, { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.id === meta1.id)?.ten).toBe('Trước khi sửa 1')
      expect(ds.find((m) => m.id === meta2.id)?.ten).toBe('Trước khi sửa 2')
    })
  }, HAN_GIO_MAN_DONG_BO_MS)
})
