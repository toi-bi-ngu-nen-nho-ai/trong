// @vitest-environment happy-dom
//
// I1 (review toàn nhánh 2026-09-09, mục 1 của BAN-GIAO-PHIEN-SAU.md — xác minh lại TRƯỚC khi vá):
// `handleConfirmImport` (App.tsx) có HAI tầng `try` (`:4168` ngoài, `:4250` trong) mà trước bản vá
// này chỉ có `finally`, không `catch` cấp hàm — cùng hình dạng `handleExport` trước khi được vá ở
// 3998ea3.
//
// KHÁC `handleExport` (đuôi `JSON.stringify`/`Blob`/`createObjectURL` hoàn toàn trần trụi, không
// lưới nào bọc): mọi lệnh gọi trong `handleConfirmImport` có thể ném vì NỘI DUNG FILE hỏng đã có
// try/catch riêng TỪNG MỤC rồi (`xuatSnapshotMuc`/`nhapSnapshotMuc`, xem các nhánh catch cạnh
// chúng) — không dựng được kịch bản "file hỏng" nào lọt ra ngoài hai tầng try đó. Hai ca dưới đây vì
// vậy KHÔNG mô phỏng file hỏng, mà mô phỏng đúng kỹ thuật `handleExport`'s test cũng dùng: một
// DEPENDENCY cấp thấp (`idbGetAllCoKetQua`) VI PHẠM hợp đồng của chính nó (ném thay vì trả
// `{ok:false, loi}`) — rẻ hơn hẳn việc dựng ra một lỗi thật từ tầng IndexedDB, và vẫn kiểm đúng
// thuộc tính cần có: "mọi lượt ném lọt vào hai tầng try này phải biến thành một dòng trạng thái,
// không được thoát ra ngoài im lặng".
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
// Namespace riêng CHỈ để `vi.spyOn` — App.tsx import tĩnh `idbGetAllCoKetQua` từ đúng module này,
// cùng khuôn hoan-tac-bam-chong-xac-nhan-nhap.spec.tsx đã dùng cho chính hàm này.
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
    id: `catch-cap-ham-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục có sẵn trên máy',
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

function chonFile(noiDungFile: unknown) {
  const file = new File([JSON.stringify(noiDungFile)], 'sao-luu.json', { type: 'application/json' })
  const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(inputFile, { target: { files: [file] } })
}

describe('I1 (xác minh 2026-09-09) — handleConfirmImport thiếu catch cấp hàm', () => {
  it('tầng NGOÀI (:4168) — idbGetAllCoKetQua ném ⇒ phải báo "Chưa nhập được", không im lặng', async () => {
    await moManDongBo()

    chonFile({ app: 'drtrong', version: 2, data: { mucs: [taoMucGia({ id: 'muc-tu-file-1' })] } })
    const nutXacNhan = await screen.findByRole('button', { name: 'Xác nhận nhập' })

    const spy = vi
      .spyOn(idbLib, 'idbGetAllCoKetQua')
      .mockRejectedValue(new Error('mô phỏng: idbGetAllCoKetQua vi phạm hợp đồng, ném thay vì trả {ok:false}'))
    try {
      fireEvent.click(nutXacNhan)

      // Khẳng định: sau khi khoá lối vào được nhả (finally luôn chạy), màn hình phải NÓI RA — trước
      // bản vá, panel đóng (setPendingImport(null) chạy TRƯỚC await idbGetAllCoKetQua) nhưng không
      // "Đã nhập" cũng không "Chưa nhập được": lời từ chối thoát khỏi handler onClick, không ai bắt.
      await waitFor(() => expect(screen.getByText(/^Chưa nhập được/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })
      expect(screen.queryByText(/^Đã nhập/)).toBeNull()
    } finally {
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)

  it('tầng TRONG (:4250) — dựng danh sách mục-trên-máy ném ⇒ phải báo rõ nội dung CHƯA ghi được', async () => {
    const mCu = taoMucGia()
    await idbPut(IDB_STORES.mucs, mCu)
    await moManDongBo()

    chonFile({
      app: 'drtrong',
      version: 2,
      data: { mucs: [taoMucGia({ id: 'muc-tu-file-2' })], mucDocs: { 'muc-tu-file-2': {} } },
    })
    const nutXacNhan = await screen.findByRole('button', { name: 'Xác nhận nhập' })

    // Mảng `items` thật (từ lượt đọc tươi giả lập) nhưng có `.map` bị thay để ném — buộc điểm hỏng
    // rơi đúng vào bước dựng `mucTrenMay` (App.tsx ~4303), TRƯỚC vòng lặp có try/catch riêng từng
    // mục, và SAU khi metadata (mucs) đã ghi xong (onImport đã chạy ở trên trong hàm thật).
    const itemsGayLoi = [mCu] as MucMeta[]
    ;(itemsGayLoi as unknown as { map: unknown }).map = () => {
      throw new Error('mô phỏng: lỗi không lường trước khi dựng danh sách mục trên máy')
    }
    const spy = vi
      .spyOn(idbLib, 'idbGetAllCoKetQua')
      .mockResolvedValue({ ok: true, items: itemsGayLoi } as Awaited<ReturnType<typeof idbLib.idbGetAllCoKetQua>>)
    try {
      fireEvent.click(nutXacNhan)

      // Khẳng định: trước bản vá, metadata ĐÃ ghi xong (onImport chạy trước điểm ném này) nhưng màn
      // hình đứng nguyên ở "Đã nhập metadata. Đang ghi nội dung…" vĩnh viễn — không một chữ nào nói
      // nội dung bài viết/sơ đồ đã THẤT BẠI, trong khi thực ra nó chưa từng được ghi.
      await waitFor(() => expect(screen.getByText(/CHƯA ghi được nội dung/)).toBeTruthy(), {
        timeout: HAN_GIO_DONG_BO_MS,
      })
      expect(screen.queryByText(/Đang ghi nội dung/)).toBeNull()
    } finally {
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)
})
