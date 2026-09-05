import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'
import {
  mucKhopTimKiem,
  capNhatSauKhiRoiMuc,
  ghepNoiDungTimKiem,
  taoIdMuc,
  trichVanBanTuCanvas,
  trichVanBanTuKhoi,
} from '../mucMeta'

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  // capNhatSauKhiRoiMuc() ghi vào store `mucs` từ Task 2 (task-2-brief.md Bước 4) — dọn luôn store
  // này, không thì bản ghi test rò rỉ sang ca sau (fake-indexeddb không tự reset giữa các `it`).
  const dsMuc = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of dsMuc) await idbDelete(IDB_STORES.mucs, m.id)
})

describe('taoIdMuc', () => {
  it('sinh id khác nhau ở hai lượt gọi liên tiếp, đúng tiền tố', () => {
    const a = taoIdMuc()
    const b = taoIdMuc()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^bang-/)
  })
})

describe('capNhatSauKhiRoiMuc', () => {
  // Store đọc/ghi của capNhatSauKhiRoiMuc đổi từ `boards` sang `mucs` ở Task 2 (task-2-brief.md
  // Bước 4) — mọi ca trong describe này seed/đọc lại qua IDB_STORES.mucs để khớp store THẬT hàm
  // đang thao tác, không phải store cũ nó không còn chạm tới nữa.
  it('coThayDoiNoiDung=true → cập nhật capNhatLuc', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, { id: 'x', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatSauKhiRoiMuc('x', true)

    const ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.mucs)
    expect(ds.find((b) => b.id === 'x')!.capNhatLuc).toBeGreaterThan(bayGio)
  })

  it('coThayDoiNoiDung=false → capNhatLuc giữ nguyên (mở xem, không sửa)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, { id: 'y', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatSauKhiRoiMuc('y', false)

    const ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.mucs)
    expect(ds.find((b) => b.id === 'y')!.capNhatLuc).toBe(bayGio)
  })

  it('bản ghi CŨ còn anhXemTruoc → lượt rời bảng kế tiếp DỌN HẲN trường đó', async () => {
    // Cơ chế ảnh chụp khung nhìn đã bị gỡ 2026-08-30, nhưng máy người dùng thật vẫn còn hàng trăm kB
    // data URL JPEG cho MỖI bảng trong IndexedDB. Không ai đọc chúng nữa, nên giữ lại chỉ là rác
    // chiếm quota. Đây là đường di trú: hook này vốn đã chạy ở MỌI lượt rời bảng, không cần script
    // riêng. Nếu ai đó sau này khôi phục `...hienCo` nguyên khối, ca kiểm này đỏ.
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'con-anh',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      anhXemTruoc: 'data:image/jpeg;base64,rac-cu',
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    } as unknown as Parameters<typeof idbPut>[1])

    await capNhatSauKhiRoiMuc('con-anh', false)

    const ds = await idbGetAll<{ id: string; anhXemTruoc?: string }>(IDB_STORES.mucs)
    const sau = ds.find((b) => b.id === 'con-anh')
    expect(sau).toBeDefined()
    expect(sau).not.toHaveProperty('anhXemTruoc')
  })

  it('bảng KHÔNG tồn tại → không ném lỗi, không tạo mục mới', async () => {
    await expect(capNhatSauKhiRoiMuc('khong-ton-tai', false)).resolves.toBeUndefined()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    expect(ds.find((b) => b.id === 'khong-ton-tai')).toBeUndefined()
  })
})

describe('capNhatSauKhiRoiMuc — KHÔNG backfill trường cũ + noiDungTimKiemMoi', () => {
  // Ca "bản ghi cũ THIẾU chuyenKhoa/tags/noiDungTimKiem → backfill giá trị mặc định" đã bị XOÁ ở
  // giai đoạn 5-6 (task-1-brief.md Bước 5): nó canh đúng ba nhánh `??` phòng vệ vừa bị gỡ khỏi
  // capNhatSauKhiRoiMuc, vì hàm này giờ chỉ còn ghi vào store MỚI (mucs, xem Task 2), không có bản
  // ghi thiếu trường nào để backfill — giữ lại ca cũ là giữ một lời nói dối về hình dạng dữ liệu
  // (spec §3.1). Thay vào đó là ca ĐẢO NGƯỢC ngay dưới đây, khẳng định điều NGƯỢC LẠI: bản ghi cũ
  // thiếu trường KHÔNG được backfill. Nếu ai phục hồi một nhánh `?? SPECIALTIES[0].id`/`?? []`/
  // `?? ''` vào idbPut trong capNhatSauKhiRoiMuc, ca dưới đây đỏ (đã tự tay gỡ vá tạm để xác nhận —
  // xem task-9-report.md).
  it('bản ghi cũ THIẾU chuyenKhoa/tags/noiDungTimKiem → KHÔNG backfill (bỏ 2026-09-05, spec §3.1)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'cu',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })
    await capNhatSauKhiRoiMuc('cu', false)
    const ds = await idbGetAll<{
      id: string
      chuyenKhoa?: string
      tags?: string[]
      noiDungTimKiem?: string
    }>(IDB_STORES.mucs)
    const sau = ds.find((b) => b.id === 'cu')
    expect(sau).toBeDefined()
    expect(sau?.chuyenKhoa).toBeUndefined()
    expect(sau?.tags).toBeUndefined()
    expect(sau?.noiDungTimKiem).toBeUndefined()
  })

  it('truyền noiDungTimKiemMoi → ghi đè noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'z',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'cũ',
    })

    await capNhatSauKhiRoiMuc('z', false, 'nội dung mới')

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.mucs)
    expect(ds.find((b) => b.id === 'z')?.noiDungTimKiem).toBe('nội dung mới')
  })

  it('KHÔNG truyền noiDungTimKiemMoi → giữ nguyên noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'w',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'giữ nguyên',
    })

    await capNhatSauKhiRoiMuc('w', false)

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.mucs)
    expect(ds.find((b) => b.id === 'w')?.noiDungTimKiem).toBe('giữ nguyên')
  })
})

describe('trichVanBanTuKhoi', () => {
  it('gộp text của mọi khối con có props.text, đệ quy nhiều cấp, cách nhau bằng dấu cách', () => {
    const goc = {
      children: [
        { props: { text: 'Đoạn 1' }, children: [] },
        { children: [{ props: { text: 'Đoạn con' }, children: [] }] },
        { props: {}, children: [] },
      ],
    }
    expect(trichVanBanTuKhoi(goc)).toBe('Đoạn 1 Đoạn con')
  })

  it('khối gốc và mọi con đều không có props.text → chuỗi rỗng', () => {
    expect(trichVanBanTuKhoi({ children: [{ props: {}, children: [] }] })).toBe('')
  })

  it('props.text không phải Y.Text/có toString (vd số) → bỏ qua, không ném lỗi', () => {
    expect(trichVanBanTuKhoi({ props: { text: 42 } })).toBe('42')
    expect(trichVanBanTuKhoi({ props: { text: null } })).toBe('')
  })
})

describe('trichVanBanTuCanvas', () => {
  it('gộp .text của mọi phần tử canvas có chữ, bỏ qua phần tử không có', () => {
    const els = [{ text: { toString: () => 'Nhãn connector' } }, {}, { text: { toString: () => 'Node mindmap' } }]
    expect(trichVanBanTuCanvas(els)).toBe('Nhãn connector Node mindmap')
  })
})

describe('ghepNoiDungTimKiem', () => {
  it('nối hai đoạn bằng dấu cách, cắt bớt nếu vượt 5000 ký tự', () => {
    expect(ghepNoiDungTimKiem('a', 'b')).toBe('a b')
    const dai = 'x'.repeat(6000)
    expect(ghepNoiDungTimKiem(dai, '').length).toBe(5000)
  })

  it('cả hai rỗng → chuỗi rỗng', () => {
    expect(ghepNoiDungTimKiem('', '')).toBe('')
  })
})

describe('mucKhopTimKiem', () => {
  const bangMau: MucMeta = {
    id: 'x', ten: 'Suy tim EF giảm', taoLuc: 0, capNhatLuc: 0,
    // Ca này canh so khớp tìm kiếm, không canh phân loại — giá trị của bảng sơ đồ đời cũ
    // (xem task-1-brief.md) là đủ.
    loai: 'so-do', danhMuc: 'tiep-can',
    chuyenKhoa: 'cardiology', tags: ['nội trú', 'cấp cứu'], noiDungTimKiem: 'furosemide 40mg TM',
  }

  it('khớp theo tên, không phân biệt dấu/hoa-thường', () => {
    expect(mucKhopTimKiem(bangMau, 'suy tim')).toBe(true)
    expect(mucKhopTimKiem(bangMau, 'SUY TIM')).toBe(true)
    expect(mucKhopTimKiem(bangMau, 'suy tim khong dau')).toBe(false)
  })

  it('khớp theo tag', () => {
    expect(mucKhopTimKiem(bangMau, 'cấp cứu')).toBe(true)
    expect(mucKhopTimKiem(bangMau, 'cap cuu')).toBe(true)
  })

  it('khớp theo noiDungTimKiem', () => {
    expect(mucKhopTimKiem(bangMau, 'furosemide')).toBe(true)
  })

  it('truy vấn rỗng → luôn khớp (không lọc)', () => {
    expect(mucKhopTimKiem(bangMau, '')).toBe(true)
    expect(mucKhopTimKiem(bangMau, '   ')).toBe(true)
  })

  it('không khớp bất kỳ trường nào → false', () => {
    // 'tiêu hoá' là TÊN của khoa gastrointestinal, còn bangMau thuộc cardiology ('Tim mạch') — nên
    // kể cả khi tên chuyên khoa đã được đưa vào chuỗi so khớp, truy vấn này vẫn phải trượt.
    expect(mucKhopTimKiem(bangMau, 'tiêu hoá')).toBe(false)
  })

  it('khớp theo TÊN chuyên khoa người dùng thấy, không phải id nội bộ', () => {
    // Chip lọc ở LuoiMuc.tsx hiện `kh.name` ("Tim mạch"), bác sĩ gõ đúng chữ đó — nếu chỉ so
    // khớp `bang.chuyenKhoa` (id 'cardiology') thì truy vấn này trượt.
    expect(mucKhopTimKiem(bangMau, 'Tim mạch')).toBe(true)
    expect(mucKhopTimKiem(bangMau, 'tim mach')).toBe(true)
  })

  it('bảng CŨ thiếu hẳn chuyenKhoa → không ném lỗi, vẫn khớp theo tên', () => {
    // Bản ghi tạo TRƯỚC lượt thêm ba trường mới — ép kiểu vì TS chặn thiếu trường bắt buộc.
    // normalizeSearch(undefined) sẽ ném TypeError nếu chỗ đọc chuyenKhoa không có giá trị dự phòng.
    const bangCu = { id: 'cu', ten: 'Bảng cũ', taoLuc: 0, capNhatLuc: 0 } as unknown as MucMeta
    expect(() => mucKhopTimKiem(bangCu, 'bảng')).not.toThrow()
    expect(mucKhopTimKiem(bangCu, 'bảng cũ')).toBe(true)
    expect(mucKhopTimKiem(bangCu, 'suy tim')).toBe(false)
    expect(mucKhopTimKiem(bangCu, '')).toBe(true)
  })
})
