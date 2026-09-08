// @vitest-environment happy-dom
//
// Task 9c (giai đoạn 7-9): snapshot "Hoàn tác" (`handleConfirmImport`, App.tsx) phải chụp kho `mucs`
// TƯƠI ngay tại thời điểm nhập file — không dùng `customMucs` (bản sao dựng từ `mucsCol` cấp App,
// MỘT trong BA instance `useIdbCollection<MucMeta>` độc lập cùng đọc store `mucs`: SearchScreen có
// instance riêng, App() cấp trên có `mucsCol`, và LuoiMuc.tsx — nơi mục MỚI được TẠO — có instance
// thứ ba). Ba instance không đồng bộ NGANG với nhau — cùng cơ chế lệch pha mà Task 9b đã vá cho
// đường XUẤT, nhưng ở đây hậu quả nặng hơn: `handleRestoreSnapshot` dùng snapshot này để
// `mucsCol.replaceAll` → `idbReplaceAll` (src/lib/idb.ts) XOÁ SẠCH store `mucs` rồi ghi lại đúng
// snapshot. Chụp bản CŨ (thiếu mục vừa tạo qua instance khác) rồi cho Hoàn tác dùng nó nghĩa là:
//
//   tạo mục mới trong phiên → nhập một file sao lưu → bấm Hoàn tác → mục vừa tạo BIẾN MẤT khỏi
//   IndexedDB.
//
// Ca chính dưới đây KHÔNG dựng lại thao tác "tạo mục qua LuoiMuc.tsx" (nặng, cần vỏ bảng vẽ thật) —
// ghi THẲNG một MucMeta thứ hai vào IDB_STORES.mucs bằng idbPut SAU KHI App đã mount và đọc xong
// lượt đầu (đúng khuôn xuat-file-doc-tuoi.spec.tsx của Task 9b — cùng lớp lỗi, khác đường phá huỷ).
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { CUSTOM_COLLECTION_KEYS, loadCollection, saveCollection } from '../lib/storage'
import type { MucMeta } from '../board/mucMeta'

// Mount `<App />` thật dưới happy-dom + fake-indexeddb tốn hàng chục giây — cùng lý do các spec anh
// em (xuat-file-doc-tuoi.spec.tsx, DataSyncScreen-mucs.spec.tsx) đã ghi. Nới CỤC BỘ bằng tham số thứ
// ba của từng `it`, KHÔNG đụng `testTimeout` toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000
// Riêng cho các `waitFor` chờ trạng thái sau lượt nhập/hoàn tác — vượt hẳn hạn 1000ms mặc định.
const HAN_GIO_DONG_BO_MS = 30000

// Vỏ nạp chậm thật (BlockSuite) không mount được dưới happy-dom — cùng mẫu các spec anh em. Màn
// "Đồng bộ dữ liệu" không hiển thị bảng vẽ nào nên vỏ giả chỉ cần tồn tại để App() mount được.
vi.mock('../board/index', () => ({ VoMuc: () => null }))

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `hoan-tac-tuoi-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục hoàn tác thử',
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
// màn này (không có route/URL trong app). Cùng helper các spec anh em đã dùng.
async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

// Chờ ô thống kê "Bài viết & Sơ đồ" hiện ĐÚNG số `soLuong` — tín hiệu mucsCol (useIdbCollection cấp
// App) đã đọc XONG lượt đầu, TRƯỚC khi ta ghi thẳng mục thứ hai vào IndexedDB. Đây là điểm khiến ca
// này ghim đúng thứ nó nhắm (cùng lý do xuat-file-doc-tuoi.spec.tsx đã ghi lại).
async function choDemMucs(soLuong: number) {
  await waitFor(() => {
    const nhan = screen.getByText('Bài viết & Sơ đồ')
    expect(nhan.previousElementSibling?.textContent).toBe(String(soLuong))
  })
}

/** Đưa `noiDungFile` qua đúng `<input type=file>` rồi bấm "Xác nhận nhập". */
async function nhapFile(noiDungFile: string) {
  const file = new File([noiDungFile], 'sao-luu-hoan-tac-tuoi.json', { type: 'application/json' })
  const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(inputFile, { target: { files: [file] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
}

async function bamHoanTac() {
  fireEvent.click(await screen.findByRole('button', { name: /Hoàn tác lần nhập vừa rồi/ }))
}

describe('Hoàn tác không xoá mục được tạo qua instance khác sau khi App đã nạp xong (Task 9c)', () => {
  it('Hoàn tác KHÔNG xoá mục được tạo sau khi App đã nạp xong', async () => {
    const mCu = taoMucGia({ id: 'm-cu', ten: 'Mục có sẵn lúc mount' })
    await idbPut(IDB_STORES.mucs, mCu)

    await moManDongBo()
    await choDemMucs(1)

    // Mô phỏng LuoiMuc.tsx tạo mục mới qua instance useIdbCollection RIÊNG của nó — mucsCol cấp App
    // không hề hay biết lượt ghi này cho tới khi tự đọc lại IndexedDB.
    const mMoi = taoMucGia({ id: 'm-moi', ten: 'Mục vừa tạo qua LuoiMuc' })
    await idbPut(IDB_STORES.mucs, mMoi)

    // File nhập CHỈ mang m-cu — không có m-moi (đúng kịch bản: file sao lưu cũ hơn lượt tạo mục mới).
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: { mucs: [{ ...mCu, ten: 'm-cu bị đè từ file' }] },
      }),
    )
    await waitFor(() => expect(screen.getByText(/^Đã nhập/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    // ── Bấm Hoàn tác ─────────────────────────────────────────────────────────────────────────
    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Đã hoàn tác/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    // ← đây là khẳng định ĐỎ hôm nay (trước bản vá): m-moi bị `idbReplaceAll` xoá sạch vì snapshot
    // hoàn tác dựng từ `customMucs` (bản sao CŨ, chụp lúc mount, không có m-moi).
    const conLai = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    const idConLai = conLai.map((m) => m.id)
    expect(idConLai).toContain('m-moi')
    expect(idConLai).toContain('m-cu')
    expect(conLai.find((m) => m.id === 'm-moi')?.ten).toBe('Mục vừa tạo qua LuoiMuc')
    // Hoàn tác vẫn phải trả m-cu về đúng tên TRƯỚC khi nhập — không phải chỉ "không xoá m-moi" mà
    // đánh đổi mất luôn công dụng chính của Hoàn tác.
    expect(conLai.find((m) => m.id === 'm-cu')?.ten).toBe('Mục có sẵn lúc mount')
  }, HAN_GIO_MOUNT_APP_MS)

  it('Hoàn tác vẫn trả đúng trạng thái cũ cho nhóm khác (kháng sinh) — không hỏng công dụng chính', async () => {
    // Seed TRƯỚC khi mount: useLocalCollection đọc localStorage một lần lúc khởi tạo state.
    saveCollection(CUSTOM_COLLECTION_KEYS.antibiotics, [{ id: 'ks-hoan-tac-tuoi', name: 'Kháng sinh cũ', dose: '', notes: '' }])

    await moManDongBo()
    await choDemMucs(0)

    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: { antibiotics: [{ id: 'ks-hoan-tac-tuoi', name: 'Kháng sinh bị đè từ file', dose: '', notes: '' }] },
      }),
    )
    await waitFor(() => expect(screen.getByText(/^Đã nhập/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })
    expect(loadCollection<{ id: string; name: string }>(CUSTOM_COLLECTION_KEYS.antibiotics).find((a) => a.id === 'ks-hoan-tac-tuoi')?.name).toBe(
      'Kháng sinh bị đè từ file',
    )

    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Đã hoàn tác/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    expect(loadCollection<{ id: string; name: string }>(CUSTOM_COLLECTION_KEYS.antibiotics).find((a) => a.id === 'ks-hoan-tac-tuoi')?.name).toBe(
      'Kháng sinh cũ',
    )
  }, HAN_GIO_MOUNT_APP_MS)

  it('Mục đã xoá mềm (daXoaLuc) vẫn được chụp trong snapshot tươi và Hoàn tác ghi lại đúng nguyên trạng', async () => {
    const mConSong = taoMucGia({ id: 'm-con-song', ten: 'Mục còn sống' })
    const luoiXoa = Date.now()
    const mDaXoa = taoMucGia({ id: 'm-da-xoa', ten: 'Mục đã xoá mềm', daXoaLuc: luoiXoa })
    await idbPut(IDB_STORES.mucs, mConSong)
    await idbPut(IDB_STORES.mucs, mDaXoa)

    await moManDongBo()
    // Ô thống kê KHÔNG lọc daXoaLuc (customMucs mang theo mục xoá mềm — xem chú thích
    // xuat-file-doc-tuoi.spec.tsx) nên đếm đủ cả hai.
    await choDemMucs(2)

    // File nhập chỉ đè m-con-song — không đụng m-da-xoa (gộp theo id, đúng ngữ nghĩa "nhập file").
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: { mucs: [{ ...mConSong, ten: 'Bị đè từ file' }] },
      }),
    )
    await waitFor(() => expect(screen.getByText(/^Đã nhập/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Đã hoàn tác/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    // Snapshot tươi (chụp TRƯỚC khi nhập) đã mang theo cả m-da-xoa — Hoàn tác (idbReplaceAll) phải ghi
    // lại ĐÚNG NGUYÊN VẸN nó, kể cả trường daXoaLuc, không lọc bỏ và không đổi ngữ nghĩa xoá mềm.
    const conLai = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    const daXoaSauHoanTac = conLai.find((m) => m.id === 'm-da-xoa')
    expect(daXoaSauHoanTac, 'mục đã xoá mềm phải còn trong IndexedDB sau Hoàn tác').toBeTruthy()
    expect(daXoaSauHoanTac?.daXoaLuc).toBe(luoiXoa)
    expect(conLai.find((m) => m.id === 'm-con-song')?.ten).toBe('Mục còn sống')
  }, HAN_GIO_MOUNT_APP_MS)
})
