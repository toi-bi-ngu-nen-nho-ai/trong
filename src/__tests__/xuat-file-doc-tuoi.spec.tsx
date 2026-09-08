// @vitest-environment happy-dom
//
// Task 9b (giai đoạn 7-9): "Xuất file" phải đọc kho `mucs` TƯƠI ngay tại thời điểm bấm nút, không
// dùng bản sao `customMucs` — bản sao đó dựng từ `mucsCol` (App.tsx dòng ~11897), MỘT trong BA
// instance `useIdbCollection<MucMeta>` độc lập cùng đọc store `mucs`: SearchScreen có instance
// riêng, App() cấp trên có `mucsCol` (nguồn của `customMucs`), và LuoiMuc.tsx — nơi mục MỚI được
// TẠO — có instance thứ ba. Ba instance không đồng bộ NGANG với nhau: lượt ghi qua một instance chỉ
// cập nhật state của CHÍNH NÓ, hai instance kia không hay biết cho tới khi tự đọc lại IndexedDB.
//
// Triệu chứng đo được trên Chrome THẬT (Task 9): tạo mục mới trong phiên rồi bấm Xuất file ngay —
// IndexedDB có 6 mục, file xuất ra chỉ 5. Không một chữ cảnh báo.
//
// Ca chính dưới đây KHÔNG dựng lại thao tác "tạo mục qua LuoiMuc.tsx" (nặng, cần vỏ bảng vẽ thật) —
// ghi THẲNG một MucMeta thứ hai vào IDB_STORES.mucs bằng idbPut SAU KHI App đã mount và đọc xong
// lượt đầu. Đây đúng là mô phỏng "một instance khác vừa ghi mà state cấp App không hay": cả hai
// đường (LuoiMuc.tsx ghi qua instance riêng, hay ca kiểm ghi thẳng qua idbPut) đều là một lượt ghi
// trực tiếp vào IndexedDB xảy ra SAU KHI mucsCol cấp App đã chốt state của nó — mucsCol không phân
// biệt được nguồn gốc của lượt ghi, chỉ biết là nó không hay.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
// Namespace riêng CHỈ để `vi.spyOn` — App.tsx import tĩnh `idbGetAllCoKetQua` từ đúng module này
// (`./lib/idb`), nên spy trên namespace ở đây thay được lời gọi thật bên trong handleExport. Khác
// hẳn ca `DataSyncScreen-hoan-tac-noi-dung.spec.tsx` (comment "Phải mock ở tầng module chứ không
// vi.spyOn"): chỗ đó spy KHÔNG được vì `./board/xuatNhapNoiDung` được App.tsx nạp bằng `import()`
// ĐỘNG (D13) — namespace sau lượt nạp động đó không gán đè được. `idbGetAllCoKetQua` thì ngược
// lại: App.tsx `import { idbGetAllCoKetQua } from "./lib/idb"` TĨNH ngay đầu file, cùng một
// namespace ESM với import ở đây.
import * as idbLib from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

// Cùng lý do sau-man-luoi-muc.spec.tsx / DataSyncScreen-mucs.spec.tsx: mount <App/> thật dưới
// happy-dom + fake-indexeddb tốn hàng chục giây, vượt hẳn testTimeout mặc định 20000ms
// (vite.config.ts). Nới CỤC BỘ bằng tham số thứ ba của từng `it`, KHÔNG đụng hạn giờ toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000

// "Xuất file" đọc nội dung doc CRDT qua `import()` động (../board/xuatNhapNoiDung, kéo cả khối
// BlockSuite) rồi mở/đóng workspace cho từng mục — vài giây, vượt hẳn hạn 1000ms mặc định của
// `waitFor`.
const HAN_GIO_XUAT_FILE_MS = 30000

// Vỏ nạp chậm thật (BlockSuite) không mount được dưới happy-dom — cùng mẫu các spec anh em.
vi.mock('../board/index', () => ({ VoMuc: () => null }))

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `xuat-tuoi-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục xuất tươi',
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

// Mount App() thật rồi bấm đúng nút "Đồng bộ dữ liệu" ở Trang chủ — không có đường tắt nào khác tới
// màn này (không có route/URL trong app). Cùng helper DataSyncScreen-mucs.spec.tsx đã dùng.
async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

// Chờ ô thống kê "Bài viết & Sơ đồ" hiện ĐÚNG số `soLuong` — tín hiệu mucsCol (useIdbCollection cấp
// App) đã đọc XONG lượt đầu. Nhãn "Bài viết & Sơ đồ" tự nó render ngay cả khi mucsCol.loading vẫn
// còn true (số đếm lúc đó là 0) — chỉ chờ nhãn xuất hiện KHÔNG đủ để biết "đã nạp xong" (xem chú
// thích ở duLieuChuaDocDuoc trong App.tsx). Số đếm là <p> liền TRƯỚC nhãn trong cùng khối (App.tsx,
// nhánh render categoryRows).
async function choDemMucs(soLuong: number) {
  await waitFor(() => {
    const nhan = screen.getByText('Bài viết & Sơ đồ')
    expect(nhan.previousElementSibling?.textContent).toBe(String(soLuong))
  })
}

async function batXuatFile(): Promise<Blob> {
  let blobDaXuat: Blob | null = null
  const gocCreate = URL.createObjectURL
  const gocRevoke = URL.revokeObjectURL
  // Object.defineProperty (không gán thẳng) — cùng lý do edgeless-board-image-toast-2.spec.ts đã
  // ghi lại: gán thẳng URL.createObjectURL = ... có thể không có hiệu lực dưới happy-dom.
  Object.defineProperty(URL, 'createObjectURL', {
    value: (b: Blob) => {
      blobDaXuat = b
      return 'blob:gia-lap-xuat-file-tuoi'
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  try {
    fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
    await waitFor(() => expect(blobDaXuat).not.toBeNull(), { timeout: HAN_GIO_XUAT_FILE_MS })
    return blobDaXuat as unknown as Blob
  } finally {
    Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
  }
}

describe('Xuất file đọc kho mucs TƯƠI tại thời điểm bấm nút (Task 9b)', () => {
  it('Xuất file gồm cả mục vừa được ghi thẳng vào IndexedDB sau khi App đã nạp xong', async () => {
    const mucDau = taoMucGia({ id: 'muc-tuoi-1', ten: 'Mục có sẵn lúc mount' })
    await idbPut(IDB_STORES.mucs, mucDau)

    await moManDongBo()
    await choDemMucs(1)

    // Mô phỏng LuoiMuc.tsx tạo mục mới qua instance useIdbCollection RIÊNG của nó — mucsCol cấp App
    // không hề hay biết lượt ghi này cho tới khi tự đọc lại.
    const mucSau = taoMucGia({ id: 'muc-tuoi-2', ten: 'Mục vừa tạo qua LuoiMuc' })
    await idbPut(IDB_STORES.mucs, mucSau)

    const blob = await batXuatFile()
    const text = await blob.text()
    const parsed = JSON.parse(text) as { data: { mucs?: MucMeta[] } }
    const ids = (parsed.data.mucs ?? []).map((m) => m.id)
    expect(ids).toContain('muc-tuoi-1')
    expect(ids).toContain('muc-tuoi-2') // ← đây là khẳng định ĐỎ hôm nay (trước bản vá)
    expect(parsed.data.mucs).toHaveLength(2)
  }, HAN_GIO_MOUNT_APP_MS)

  it('Mục đã xoá mềm ghi thẳng vào IDB vẫn được xuất — khớp hành vi hiện có của customMucs', async () => {
    const mucConSong = taoMucGia({ id: 'muc-con-song', ten: 'Mục còn sống' })
    await idbPut(IDB_STORES.mucs, mucConSong)

    await moManDongBo()
    await choDemMucs(1)

    // Ghi thẳng một mục ĐÃ XOÁ MỀM (daXoaLuc khác undefined) qua instance khác, sau khi App đã nạp
    // xong — cùng kịch bản "instance không hay" như ca chính ở trên.
    const mucDaXoa = taoMucGia({ id: 'muc-da-xoa', ten: 'Mục đã xoá mềm', daXoaLuc: Date.now() })
    await idbPut(IDB_STORES.mucs, mucDaXoa)

    const blob = await batXuatFile()
    const text = await blob.text()
    const parsed = JSON.parse(text) as { data: { mucs?: MucMeta[] } }
    // useIdbCollection.ts (items = sortNewestFirst(Array.from(byId.values()))) KHÔNG lọc daXoaLuc —
    // customMucs từ trước tới nay vẫn mang theo mục xoá mềm (xem chính comment trong handleExport:
    // "Mục đã xoá mềm VẪN được xuất — để lại nội dung thì Hoàn tác xoá sau khi khôi phục sẽ trả về
    // một mục rỗng"). Đường đọc tươi PHẢI giữ đúng hành vi đó, không được đổi ngữ nghĩa xoá mềm.
    const ghiXoa = (parsed.data.mucs ?? []).find((m) => m.id === 'muc-da-xoa')
    expect(ghiXoa).toBeTruthy()
    expect(ghiXoa?.daXoaLuc).toBe(mucDaXoa.daXoaLuc)
    expect(parsed.data.mucs).toHaveLength(2)
  }, HAN_GIO_MOUNT_APP_MS)

  it('Kho mucs rỗng: xuất file vẫn chạy, không ném, mucs: []', async () => {
    await moManDongBo()
    await choDemMucs(0)

    // Minor 4 (review vòng sửa 1/5): ca này trước chỉ khẳng định payload, chưa chạm tới ô chọn —
    // brief bước 1 còn đòi "ô Bài viết & Sơ đồ hành xử như trước" ngay cả khi kho rỗng. Bấm để bỏ
    // chọn rồi chọn lại, xác nhận nhãn "Chọn tất cả"/"Bỏ chọn tất cả" (đọc từ selectedCount) phản
    // ứng đúng — hành vi toggle không bị đổi bởi lượt đọc tươi Task 9b mới thêm.
    const oTile = screen.getByText('Bài viết & Sơ đồ').closest('button')
    if (!oTile) throw new Error('không tìm thấy ô "Bài viết & Sơ đồ"')
    expect(screen.getByRole('button', { name: 'Bỏ chọn tất cả' })).toBeTruthy()
    fireEvent.click(oTile)
    expect(screen.getByRole('button', { name: 'Chọn tất cả' })).toBeTruthy()
    fireEvent.click(oTile)
    expect(screen.getByRole('button', { name: 'Bỏ chọn tất cả' })).toBeTruthy()

    const blob = await batXuatFile()
    const text = await blob.text()
    const parsed = JSON.parse(text) as { data: { mucs?: MucMeta[] } }
    expect(parsed.data.mucs).toEqual([])
  }, HAN_GIO_MOUNT_APP_MS)

  // ─── Vòng sửa 1/5 (review findings Important 1 + Minor 3) ──────────────────────────────────────
  //
  // Trước bản vá này, lượt đọc tươi mucs chạy VÔ ĐIỀU KIỆN — khi store `mucs` đọc hỏng, nó chặn
  // TOÀN BỘ lượt xuất kể cả khi người dùng đã bỏ chọn ô "Bài viết & Sơ đồ", biến câu khuyên "bỏ
  // chọn ô ... nếu chỉ cần sao lưu các mục còn lại" (App.tsx) thành một lối thoát KHÔNG TỒN TẠI.
  // Hai ca dưới đây ghim CẢ HAI nhánh của rào theo `exportSelection["mucs"]`: bỏ chọn thì lượt đọc
  // không chạy tới (ca này phải ĐỎ trên bản CHƯA rào — xem task-9b-findings-r1.md); còn chọn thì vẫn
  // chặn cứng như thiết kế gốc của Task 4 (chưa từng có ca kiểm nào ghim nhánh chặn này — Minor 3).
  it('Bỏ chọn ô "Bài viết & Sơ đồ": lượt xuất VẪN CHẠY dù đọc tươi mucs sẽ hỏng (Important 1)', async () => {
    const muc = taoMucGia({ id: 'muc-rao-theo-lua-chon', ten: 'Mục để kiểm rào theo lựa chọn' })
    await idbPut(IDB_STORES.mucs, muc)

    await moManDongBo()
    await choDemMucs(1)

    // Spy SAU khi App đã mount xong: mucsCol cấp App (useIdbCollection) đã tự gọi
    // idbGetAllCoKetQua MỘT LẦN lúc mount để đọc lượt đầu — spy đặt ở đây không đụng tới lượt đó
    // (mount đã dùng bản THẬT, count đã hiện đúng 1 ở choDemMucs), nên duLieuChuaDocDuoc vẫn false.
    // Chỉ những lời gọi SAU thời điểm này (bên trong handleExport, nếu rào không chặn được) mới bị
    // spy bắt.
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockResolvedValue({ ok: false, loi: 'giả lập: đọc hỏng ngay lúc xuất' })
    try {
      // Bỏ chọn ô "Bài viết & Sơ đồ" — đúng lời khuyên mà câu báo lỗi ở App.tsx đưa ra khi lượt đọc
      // tươi hỏng.
      const oTile = screen.getByText('Bài viết & Sơ đồ').closest('button')
      if (!oTile) throw new Error('không tìm thấy ô "Bài viết & Sơ đồ"')
      fireEvent.click(oTile)

      const blob = await batXuatFile()
      const text = await blob.text()
      const parsed = JSON.parse(text) as { data: { mucs?: MucMeta[] } }

      // Rào ở đúng chỗ, không phải "gọi rồi bỏ qua kết quả": khi ô đã bỏ chọn, lượt đọc tươi mucs
      // KHÔNG được gọi tới sau lúc mount.
      expect(spy).not.toHaveBeenCalled()
      expect(parsed.data.mucs).toEqual([])
      await waitFor(() => expect(screen.getByText(/^Đã xuất/)).toBeTruthy())
    } finally {
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)

  it('Ô "Bài viết & Sơ đồ" đang CHỌN mà đọc tươi mucs hỏng: xuất bị CHẶN, không Blob nào được tạo (Minor 3)', async () => {
    const muc = taoMucGia({ id: 'muc-nhanh-chan', ten: 'Mục để kiểm nhánh chặn' })
    await idbPut(IDB_STORES.mucs, muc)

    await moManDongBo()
    await choDemMucs(1)

    // Cùng lý do spy-sau-khi-mount ở ca trên. Ô "Bài viết & Sơ đồ" giữ nguyên trạng thái mặc định
    // (đang chọn) — không bấm gì.
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockResolvedValue({ ok: false, loi: 'giả lập: đọc hỏng ngay lúc xuất' })

    let blobDaXuat: Blob | null = null
    const gocCreate = URL.createObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      value: (b: Blob) => {
        blobDaXuat = b
        return 'blob:khong-nen-toi-day'
      },
      configurable: true,
      writable: true,
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
      await waitFor(() => expect(screen.getByText(/Chưa xuất được/)).toBeTruthy(), { timeout: HAN_GIO_XUAT_FILE_MS })
      expect(blobDaXuat).toBeNull()
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)
})
