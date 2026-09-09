// @vitest-environment happy-dom
//
// I3 (BAN-GIAO-PHIEN-SAU.md, mục 3 — quyết định của chủ dự án qua AskUserQuestion 2026-09-09):
// "Xuất file" phải CẢNH BÁO MỀM khi file ước tính vượt ~80MB (không chặn — người dùng tự xác nhận
// tiếp tục hoặc bỏ chọn bớt). Ngưỡng đo được từ dữ liệu thật (xem commit): ảnh base64 luôn ≈ 4/3
// dung lượng ảnh gốc, và 20-30 ảnh ECG chụp điện thoại (2-4MB/ảnh, phổ biến) đã cho ra 100-160MB.
//
// Ca dưới đây mock `xuatSnapshotMuc` (tầng module — App.tsx nạp `./board/xuatNhapNoiDung` bằng
// `import()` ĐỘNG D13, `vi.spyOn` không gán đè được namespace sau lượt nạp đó, xem
// DataSyncScreen-hoan-tac-noi-dung.spec.tsx) để trả về MỘT ảnh base64 giả cực lớn — rẻ hơn hẳn việc
// dựng ảnh thật, và test đúng đường mã ĐANG kiểm: kích thước payload cuối cùng, không phải nội dung
// ảnh.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'
import type { DocSnapshot } from '@blocksuite/store'

const HAN_GIO_MOUNT_APP_MS = 90000
const HAN_GIO_XUAT_FILE_MS = 30000

vi.mock('../board/index', () => ({ VoMuc: () => null }))

const ID_MUC_ANH_LON = 'xuat-canh-bao-kich-thuoc-muc-anh-lon'
// 85MB ký tự base64 (ASCII, 1 ký tự = 1 byte trong JSON UTF-8) — vượt ngưỡng cảnh báo 80MB với biên
// đủ rộng để không flake theo phần overhead nhỏ (khoá JSON, metadata khác).
const ANH_LON_B64 = 'A'.repeat(85 * 1024 * 1024)

vi.mock('../board/xuatNhapNoiDung', async (importOriginal) => {
  const goc = await importOriginal<typeof import('../board/xuatNhapNoiDung')>()
  return {
    ...goc,
    xuatSnapshotMuc: async (...doiSo: Parameters<typeof goc.xuatSnapshotMuc>) => {
      if (doiSo[0] === ID_MUC_ANH_LON) {
        return {
          snapshot: { id: doiSo[0] } as unknown as DocSnapshot,
          anh: [{ id: 'anh-gia-lap-lon', mime: 'image/jpeg', b64: ANH_LON_B64 }],
        }
      }
      return goc.xuatSnapshotMuc(...doiSo)
    },
  }
})

function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  return {
    id: ID_MUC_ANH_LON,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Mục có ảnh lớn',
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

/** Theo dõi mọi lượt gọi `URL.createObjectURL` mà KHÔNG đọc byte của Blob (85MB — đắt). */
function theoDoiCreateObjectURL() {
  const loiGoi: Blob[] = []
  const goc = URL.createObjectURL
  Object.defineProperty(URL, 'createObjectURL', {
    value: (b: Blob) => {
      loiGoi.push(b)
      return 'blob:gia-lap-canh-bao-kich-thuoc'
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  return {
    loiGoi,
    khoiPhuc: () => Object.defineProperty(URL, 'createObjectURL', { value: goc, configurable: true, writable: true }),
  }
}

describe('I3 — cảnh báo mềm khi file xuất ước tính vượt ~80MB', () => {
  it('File ~85MB: KHÔNG tự tải ngay — hiện cảnh báo + nút "Vẫn xuất", chỉ tải sau khi xác nhận', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())
    await moManDongBo()
    await choDemMucs(1)

    const { loiGoi, khoiPhuc } = theoDoiCreateObjectURL()
    try {
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))

      // (1) Băng cảnh báo phải xuất hiện, nhắc rõ số MB ước tính.
      await waitFor(() => expect(screen.getByText(/MB/)).toBeTruthy(), { timeout: HAN_GIO_XUAT_FILE_MS })
      // (2) CHƯA tải — đây là khẳng định ĐỎ hôm nay (trước bản vá, app tự tải ngay không hỏi gì).
      expect(loiGoi).toHaveLength(0)

      // (3) Xác nhận "Vẫn xuất" — giờ mới thật sự tải.
      const nutVanXuat = screen.getByRole('button', { name: /Vẫn xuất/ })
      fireEvent.click(nutVanXuat)
      await waitFor(() => expect(loiGoi).toHaveLength(1), { timeout: HAN_GIO_XUAT_FILE_MS })
      expect(loiGoi[0].size).toBeGreaterThan(80 * 1024 * 1024)
      await waitFor(() => expect(screen.getByText(/^Đã xuất/)).toBeTruthy())
    } finally {
      khoiPhuc()
    }
  }, HAN_GIO_MOUNT_APP_MS)

  it('Bấm "Huỷ": không tải file nào, dữ liệu trên máy không đổi, khoá lối vào được nhả', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())
    await moManDongBo()
    await choDemMucs(1)

    const { loiGoi, khoiPhuc } = theoDoiCreateObjectURL()
    try {
      fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
      const nutHuy = await screen.findByRole('button', { name: /^Huỷ/ }, { timeout: HAN_GIO_XUAT_FILE_MS })
      fireEvent.click(nutHuy)

      expect(loiGoi).toHaveLength(0)
      await waitFor(() => expect(screen.getByText(/Đã huỷ/)).toBeTruthy())
      // Khoá lối vào (dongBoDangChayRef) phải được nhả — nút Xuất phải bấm lại được, không kẹt disabled.
      const nutXuat = screen.getByRole('button', { name: /Xuất file sao lưu/ }) as HTMLButtonElement
      expect(nutXuat.disabled).toBe(false)
    } finally {
      khoiPhuc()
    }
  }, HAN_GIO_MOUNT_APP_MS)
})
