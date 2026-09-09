// @vitest-environment happy-dom
//
// Task 9c, vòng sửa 2/5 (findings-r2 Important 1 + "Cùng gốc, sửa luôn — nút Xuất file sao lưu"):
// vòng sửa 1 đã đóng cửa sổ bấm-chồng TRÊN CHÍNH nút "Xác nhận nhập" (xem
// hoan-tac-bam-chong-xac-nhan-nhap.spec.tsx) bằng cách dời `setPendingImport(null)` lên TRƯỚC
// `await idbGetAllCoKetQua(...)`. Nhưng `setImporting(true)` chỉ được gọi rất muộn (và KHÔNG BAO
// GIỜ nếu file chỉ mang metadata) — nên suốt khoảng từ lúc panel đóng tới lúc đó, `importing` vẫn
// `false`, và cả nút "Nhập file đã sao lưu" lẫn nút "Xuất file sao lưu" (cả hai chỉ gate bằng
// `exporting || importing`) vẫn bấm được — mở ra một cửa sổ bấm-chồng MỚI: không phải bấm lại CÙNG
// nút cho CÙNG file, mà khởi động một lượt `handleConfirmImport`/`handleExport` ĐỘC LẬP, chạy song
// song với lượt nhập đầu còn dở, trên một file/thao tác KHÁC.
//
// Ca dưới đây kiểm soát chính xác thời điểm `idbGetAllCoKetQua` giải quyết (một Promise "đợi tay",
// CHUNG cho mọi lời gọi — đúng khuôn hoan-tac-bam-chong-xac-nhan-nhap.spec.tsx) để có thể thử cả
// hai lối vào (Xuất file, và nhập một file KHÁC) trong lúc lượt nhập đầu còn treo, rồi đếm số lần
// hàm đó thực sự được gọi — đỏ bằng khẳng định sai (đếm số lần gọi), không phải hết giờ.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
// Namespace riêng CHỈ để `vi.spyOn` — App.tsx import tĩnh `idbGetAllCoKetQua` từ đúng module này,
// cùng khuôn hoan-tac-bam-chong-xac-nhan-nhap.spec.tsx / xuat-file-doc-tuoi.spec.tsx đã dùng.
import * as idbLib from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

const HAN_GIO_MOUNT_APP_MS = 90000
const HAN_GIO_DONG_BO_MS = 30000

vi.mock('../board/index', () => ({ VoMuc: () => null }))

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `loi-vao-khac-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục lối vào khác',
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

async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

async function choDemMucs(soLuong: number) {
  await waitFor(() => {
    const nhan = screen.getByText('Bài viết & Sơ đồ')
    expect(nhan.previousElementSibling?.textContent).toBe(String(soLuong))
  })
}

/** Một Promise mà ta tự quyết định lúc nào giải quyết — mô phỏng IndexedDB phản hồi chậm. */
function tinhDoiPromise<T>() {
  let giaiQuyet!: (v: T) => void
  const hua = new Promise<T>((resolve) => {
    giaiQuyet = resolve
  })
  return { hua, giaiQuyet }
}

function fileNhap(data: Record<string, unknown>, ten: string): File {
  return new File([JSON.stringify({ app: 'drtrong', version: 2, data })], ten, { type: 'application/json' })
}

describe('Cửa sổ bấm-chồng MỚI do vòng sửa 1 tạo ra: lối vào KHÁC trong lúc handleConfirmImport còn treo (Task 9c, findings-r2 Important 1)', () => {
  it('Nhập file A, xác nhận; trong lúc còn treo, thử Xuất VÀ thử nhập file B — cả hai lối vào đều KHÔNG chạy được', async () => {
    const mCu = taoMucGia({ id: 'm-cu-loi-vao-khac', ten: 'Mục trước khi nhập' })
    await idbPut(IDB_STORES.mucs, mCu)

    await moManDongBo()
    await choDemMucs(1)

    const { hua, giaiQuyet } = tinhDoiPromise<{ ok: true; items: MucMeta[] } | { ok: false; loi: string }>()
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockImplementation(() => hua as ReturnType<typeof idbLib.idbGetAllCoKetQua>)
    try {
      // ── File A: đè tên mCu. Chọn file, xác nhận nhập — treo ở await idbGetAllCoKetQua ──────────
      const fileA = fileNhap({ mucs: [{ ...mCu, ten: 'Đã nhập từ file A' }] }, 'file-a.json')
      const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(inputFile, { target: { files: [fileA] } })
      const nutXacNhanA = await screen.findByRole('button', { name: 'Xác nhận nhập' })
      fireEvent.click(nutXacNhanA)
      // Nhường vài nhịp microtask cho phần ĐỒNG BỘ trước await chạy xong và flush — panel xem trước
      // đã đóng (setPendingImport(null) đứng trước await, vòng sửa 1), màn chính Xuất/Nhập hiện lại.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(spy).toHaveBeenCalledTimes(1)

      // ── Thử lối vào KHÁC #1: bấm "Xuất file sao lưu" trong lúc lượt nhập A còn treo ────────────
      // M1 (review toàn nhánh, final-review-findings.md): trước bản vá này nửa "Xuất" bấm THẲNG
      // vào nút đang `disabled` — chỉ canh thuộc tính DOM, không canh `dongBoDangChayRef`. Ép về
      // `disabled=false` ngay trước cú bấm, CÙNG cách nửa "nhập file B" bên dưới đã làm, để ca này
      // kiểm ĐÚNG cơ chế (ref bên trong handleExport tự chặn lấy chính nó), không phải khoá bằng
      // trang trí — đúng thứ mà chính vòng sửa 2/5 của Task 9c đã chứng minh là KHÔNG đủ.
      const nutXuat = await screen.findByRole('button', { name: /Xuất file sao lưu/ })
      ;(nutXuat as HTMLButtonElement).disabled = false
      fireEvent.click(nutXuat)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      // ← khẳng định ĐỎ (trước bản vá vòng 2): handleExport cũng gọi idbGetAllCoKetQua (cùng spy)
      // vì chỉ gate bằng `exporting || importing`, cả hai đều false ở đây — spy lên 2 lần.
      expect(spy).toHaveBeenCalledTimes(1)

      // ── Thử lối vào KHÁC #2: chọn file B KHÁC rồi bấm "Xác nhận nhập" cho NÓ ────────────────────
      // Truy vấn LẠI input — React tháo/dựng lại nó mỗi lần chuyển giữa nhánh panel xem trước và
      // nhánh màn chính (Export/Import chỉ tồn tại trong nhánh `!pendingImport`), nên tham chiếu
      // `inputFile` chụp lúc đầu bài (trước khi có file A) đã RỜI DOM (isConnected=false) từ sau
      // lượt đóng/mở panel của file A.
      //
      // Input file ẩn giờ tự nó cũng `disabled` (dongBoDangChay) — ép về `disabled=false` ngay
      // trước khi bắn sự kiện để bỏ qua lớp UI, kiểm ĐÚNG cơ chế: dù một cách nào đó lọt qua được
      // lớp `disabled` (bug UI khác, hay tương lai ai đó xoá nhầm), hàm vẫn phải tự chặn lấy chính
      // nó — cơ chế thật là `ref` bên trong handleConfirmImport, không phải chỉ thuộc tính disabled.
      const fileB = fileNhap({ mucs: [taoMucGia({ id: 'm-file-b', ten: 'Mục file B' })] }, 'file-b.json')
      const inputFileB = document.querySelector('input[type="file"]') as HTMLInputElement
      inputFileB.disabled = false
      fireEvent.change(inputFileB, { target: { files: [fileB] } })
      const nutXacNhanB = await screen.findByRole('button', { name: 'Xác nhận nhập' })
      fireEvent.click(nutXacNhanB)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      // ← khẳng định ĐỎ (trước bản vá vòng 2, và trước cả vòng 1): một handleConfirmImport ĐỘC LẬP
      // thứ hai chạy trên file B — spy lên tới 3 lần nếu cả hai lối vào trên đều không bị chặn.
      expect(spy).toHaveBeenCalledTimes(1)

      // Giải phóng lượt đọc tươi — lượt DUY NHẤT thật sự đang treo, nếu bản vá đúng, là lượt A.
      giaiQuyet({ ok: true, items: [mCu] })
      await waitFor(() => expect(screen.getByText(/^Đã nhập/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }

    // Dữ liệu: CHỈ lượt A được ghi — mCu đổi đúng tên file A, KHÔNG có mục nào từ file B lọt vào.
    const conLai = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(conLai.find((m) => m.id === 'm-cu-loi-vao-khac')?.ten).toBe('Đã nhập từ file A')
    expect(conLai.find((m) => m.id === 'm-file-b')).toBeUndefined()

    // Khoá phải NHẢ sau khi lượt A xong (không kẹt vĩnh viễn): panel file B bị chặn nên vẫn còn
    // đứng nguyên trên màn (pendingImport chưa từng bị clear cho lượt bị chặn) — bấm "Xác nhận
    // nhập" lại LẦN NỮA cho nó giờ phải chạy THẬT (spy lên 2 — lần này là của chính file B).
    const nutXacNhanBLanHai = await screen.findByRole('button', { name: 'Xác nhận nhập' })
    const spy2 = vi.spyOn(idbLib, 'idbGetAllCoKetQua')
    fireEvent.click(nutXacNhanBLanHai)
    await waitFor(() => expect(spy2).toHaveBeenCalledTimes(1), { timeout: HAN_GIO_DONG_BO_MS })
    spy2.mockRestore()
  }, HAN_GIO_MOUNT_APP_MS)
})
