import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { BangMeta } from '../boardMeta'
import {
  bangKhopTimKiem,
  capNhatSauKhiRoiBang,
  ghepNoiDungTimKiem,
  taoIdBang,
  trichVanBanTuCanvas,
  trichVanBanTuKhoi,
} from '../boardMeta'

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
})

describe('taoIdBang', () => {
  it('sinh id khác nhau ở hai lượt gọi liên tiếp, đúng tiền tố', () => {
    const a = taoIdBang()
    const b = taoIdBang()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^bang-/)
  })
})

describe('capNhatSauKhiRoiBang', () => {
  it('coThayDoiNoiDung=true → cập nhật capNhatLuc', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'x', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatSauKhiRoiBang('x', true)

    const ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'x')!.capNhatLuc).toBeGreaterThan(bayGio)
  })

  it('coThayDoiNoiDung=false → capNhatLuc giữ nguyên (mở xem, không sửa)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'y', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatSauKhiRoiBang('y', false)

    const ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'y')!.capNhatLuc).toBe(bayGio)
  })

  it('bản ghi CŨ còn anhXemTruoc → lượt rời bảng kế tiếp DỌN HẲN trường đó', async () => {
    // Cơ chế ảnh chụp khung nhìn đã bị gỡ 2026-08-30, nhưng máy người dùng thật vẫn còn hàng trăm kB
    // data URL JPEG cho MỖI bảng trong IndexedDB. Không ai đọc chúng nữa, nên giữ lại chỉ là rác
    // chiếm quota. Đây là đường di trú: hook này vốn đã chạy ở MỌI lượt rời bảng, không cần script
    // riêng. Nếu ai đó sau này khôi phục `...hienCo` nguyên khối, ca kiểm này đỏ.
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'con-anh',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      anhXemTruoc: 'data:image/jpeg;base64,rac-cu',
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    } as unknown as Parameters<typeof idbPut>[1])

    await capNhatSauKhiRoiBang('con-anh', false)

    const ds = await idbGetAll<{ id: string; anhXemTruoc?: string }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'con-anh')
    expect(sau).toBeDefined()
    expect(sau).not.toHaveProperty('anhXemTruoc')
  })

  it('bảng KHÔNG tồn tại → không ném lỗi, không tạo mục mới', async () => {
    await expect(capNhatSauKhiRoiBang('khong-ton-tai', false)).resolves.toBeUndefined()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'khong-ton-tai')).toBeUndefined()
  })
})

describe('capNhatSauKhiRoiBang — backfill trường mới + noiDungTimKiemMoi', () => {
  it('bản ghi cũ THIẾU chuyenKhoa/tags/noiDungTimKiem → backfill giá trị mặc định', async () => {
    const bayGio = Date.now()
    // Mô phỏng bản ghi tạo TRƯỚC khi có ba trường mới — ép kiểu vì TS sẽ chặn thiếu trường bắt buộc.
    await idbPut(IDB_STORES.boards, {
      id: 'cu',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })

    await capNhatSauKhiRoiBang('cu', false)

    const ds = await idbGetAll<{
      id: string
      chuyenKhoa: string
      tags: string[]
      noiDungTimKiem: string
    }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'cu')
    expect(sau?.chuyenKhoa).toBe(SPECIALTIES[0].id)
    expect(sau?.tags).toEqual([])
    expect(sau?.noiDungTimKiem).toBe('')
  })

  it('truyền noiDungTimKiemMoi → ghi đè noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'z',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'cũ',
    })

    await capNhatSauKhiRoiBang('z', false, 'nội dung mới')

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'z')?.noiDungTimKiem).toBe('nội dung mới')
  })

  it('KHÔNG truyền noiDungTimKiemMoi → giữ nguyên noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'w',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'giữ nguyên',
    })

    await capNhatSauKhiRoiBang('w', false)

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
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

describe('bangKhopTimKiem', () => {
  const bangMau: BangMeta = {
    id: 'x', ten: 'Suy tim EF giảm', taoLuc: 0, capNhatLuc: 0,
    chuyenKhoa: 'cardiology', tags: ['nội trú', 'cấp cứu'], noiDungTimKiem: 'furosemide 40mg TM',
  }

  it('khớp theo tên, không phân biệt dấu/hoa-thường', () => {
    expect(bangKhopTimKiem(bangMau, 'suy tim')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'SUY TIM')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'suy tim khong dau')).toBe(false)
  })

  it('khớp theo tag', () => {
    expect(bangKhopTimKiem(bangMau, 'cấp cứu')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'cap cuu')).toBe(true)
  })

  it('khớp theo noiDungTimKiem', () => {
    expect(bangKhopTimKiem(bangMau, 'furosemide')).toBe(true)
  })

  it('truy vấn rỗng → luôn khớp (không lọc)', () => {
    expect(bangKhopTimKiem(bangMau, '')).toBe(true)
    expect(bangKhopTimKiem(bangMau, '   ')).toBe(true)
  })

  it('không khớp bất kỳ trường nào → false', () => {
    // 'tiêu hoá' là TÊN của khoa gastrointestinal, còn bangMau thuộc cardiology ('Tim mạch') — nên
    // kể cả khi tên chuyên khoa đã được đưa vào chuỗi so khớp, truy vấn này vẫn phải trượt.
    expect(bangKhopTimKiem(bangMau, 'tiêu hoá')).toBe(false)
  })

  it('khớp theo TÊN chuyên khoa người dùng thấy, không phải id nội bộ', () => {
    // Chip lọc ở DanhSachBang.tsx hiện `kh.name` ("Tim mạch"), bác sĩ gõ đúng chữ đó — nếu chỉ so
    // khớp `bang.chuyenKhoa` (id 'cardiology') thì truy vấn này trượt.
    expect(bangKhopTimKiem(bangMau, 'Tim mạch')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'tim mach')).toBe(true)
  })

  it('bảng CŨ thiếu hẳn chuyenKhoa → không ném lỗi, vẫn khớp theo tên', () => {
    // Bản ghi tạo TRƯỚC lượt thêm ba trường mới — ép kiểu vì TS chặn thiếu trường bắt buộc.
    // normalizeSearch(undefined) sẽ ném TypeError nếu chỗ đọc chuyenKhoa không có giá trị dự phòng.
    const bangCu = { id: 'cu', ten: 'Bảng cũ', taoLuc: 0, capNhatLuc: 0 } as unknown as BangMeta
    expect(() => bangKhopTimKiem(bangCu, 'bảng')).not.toThrow()
    expect(bangKhopTimKiem(bangCu, 'bảng cũ')).toBe(true)
    expect(bangKhopTimKiem(bangCu, 'suy tim')).toBe(false)
    expect(bangKhopTimKiem(bangCu, '')).toBe(true)
  })
})
