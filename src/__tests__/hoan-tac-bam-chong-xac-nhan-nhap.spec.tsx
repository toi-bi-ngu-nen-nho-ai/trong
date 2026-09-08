// @vitest-environment happy-dom
//
// Task 9c, vòng sửa 1/5 (findings Important 1): `handleConfirmImport` (App.tsx) đọc mucs TƯƠI qua
// một `await idbGetAllCoKetQua(...)` NGAY ĐẦU hàm. Nút "Xác nhận nhập" (panel xem trước, gate thuần
// bằng `pendingImport`, KHÔNG có `disabled`) trước bản vá này chỉ biến mất SAU khi await đó giải
// quyết — mở ra một cửa sổ bấm-chồng CHƯA TỪNG CÓ trước Task 9c (hàm khi đó chạy đồng bộ trọn vẹn từ
// đầu tới `setPendingImport(null)`, không `await` nào chắn giữa đường). Trong cửa sổ đó, một cú
// click thứ hai (đúng lúc IndexedDB phản hồi chậm — chính kịch bản cả tệp App.tsx lo) chạy trọn một
// lượt `handleConfirmImport` THỨ HAI trên CÙNG một `pendingImport`, gọi `idbGetAllCoKetQua` (và
// `onImport`) hai lần cho một lượt bấm mà người dùng chỉ định làm MỘT lần.
//
// Ca dưới đây kiểm soát chính xác thời điểm `idbGetAllCoKetQua` giải quyết (một Promise "đợi tay")
// để có thể bấm lần hai trong khi lượt đọc tươi của lần bấm thứ nhất còn treo, rồi đếm số lần hàm đó
// thực sự được gọi.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
// Namespace riêng CHỈ để `vi.spyOn` — App.tsx import tĩnh `idbGetAllCoKetQua` từ đúng module này,
// cùng lý do/cùng khuôn xuat-file-doc-tuoi.spec.tsx đã dùng cho `handleExport`.
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
    id: `bam-chong-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục bấm chồng',
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

describe('Bấm chồng "Xác nhận nhập" trong lúc lượt đọc tươi mucs còn treo (Task 9c, Important 1)', () => {
  it('Bấm hai lần liên tiếp: chỉ MỘT lượt handleConfirmImport thực thi, không phải hai', async () => {
    const mCu = taoMucGia({ id: 'm-cu-bam-chong', ten: 'Mục trước khi nhập' })
    await idbPut(IDB_STORES.mucs, mCu)

    await moManDongBo()
    await choDemMucs(1)

    const { hua, giaiQuyet } = tinhDoiPromise<{ ok: true; items: MucMeta[] } | { ok: false; loi: string }>()
    // Mọi lời gọi đọc tươi (dù một hay hai lượt bấm) đều nhận CHÍNH promise `hua` này — nếu bị gọi
    // hai lần, spy vẫn ghi nhận đủ số lần, chỉ là cả hai cùng đợi chung một điểm giải quyết.
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockImplementation(() => hua as ReturnType<typeof idbLib.idbGetAllCoKetQua>)
    try {
      const file = new File(
        [
          JSON.stringify({
            app: 'drtrong',
            version: 2,
            data: { mucs: [{ ...mCu, ten: 'Mục bị đè từ file' }] },
          }),
        ],
        'sao-luu-bam-chong.json',
        { type: 'application/json' },
      )
      const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(inputFile, { target: { files: [file] } })
      const nutLanMot = await screen.findByRole('button', { name: 'Xác nhận nhập' })

      // ── Bấm lần MỘT — vào giữa hàm rồi treo ở `await idbGetAllCoKetQua` (chưa giải quyết) ─────
      fireEvent.click(nutLanMot)
      // Nhường vài nhịp microtask cho phần ĐỒNG BỘ của handleConfirmImport (trước điểm `await`
      // idbGetAllCoKetQua) chạy xong và flush — dưới bản vá, panel xem trước đã đóng ở đây.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      // ── Bấm lần HAI — chỉ có tác dụng nếu nút vẫn còn trong DOM ───────────────────────────────
      const nutLanHai = screen.queryByRole('button', { name: 'Xác nhận nhập' })
      if (nutLanHai) fireEvent.click(nutLanHai)

      // Giải phóng lượt đọc tươi (cả hai lượt bấm, nếu có, đều đang đợi promise NÀY).
      giaiQuyet({ ok: true, items: [mCu] })
      await waitFor(() => expect(screen.getByText(/^Đã nhập/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

      // ← khẳng định ĐỎ hôm nay (trước bản vá): bấm chồng gọi `idbGetAllCoKetQua` HAI lần vì
      // `setPendingImport(null)` đứng SAU await, nút vẫn còn trong DOM lúc bấm lần hai.
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }

    // Dữ liệu vẫn phải nhập đúng — bản vá không được đổi kết quả của một lượt bấm ĐƠN.
    const conLai = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(conLai.find((m) => m.id === 'm-cu-bam-chong')?.ten).toBe('Mục bị đè từ file')
  }, HAN_GIO_MOUNT_APP_MS)
})
