import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { capNhatAnhXemTruoc, ghepNoiDungTimKiem, taoIdBang, trichVanBanTuCanvas, trichVanBanTuKhoi } from '../boardMeta'

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

describe('capNhatAnhXemTruoc', () => {
  it('coThayDoiNoiDung=true → ghi ảnh xem trước VÀ cập nhật capNhatLuc', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'x', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatAnhXemTruoc('x', 'data:image/jpeg;base64,xyz', true)

    const ds = await idbGetAll<{ id: string; anhXemTruoc?: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'x')
    expect(sau?.anhXemTruoc).toBe('data:image/jpeg;base64,xyz')
    expect(sau!.capNhatLuc).toBeGreaterThan(bayGio)
  })

  it('coThayDoiNoiDung=false → VẪN ghi ảnh xem trước, nhưng capNhatLuc giữ nguyên (mở xem, không sửa)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'y', ten: 'Test', taoLuc: bayGio, capNhatLuc: bayGio })
    await new Promise((r) => setTimeout(r, 2))

    await capNhatAnhXemTruoc('y', 'data:image/jpeg;base64,moi', false)

    const ds = await idbGetAll<{ id: string; anhXemTruoc?: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'y')
    expect(sau?.anhXemTruoc).toBe('data:image/jpeg;base64,moi')
    expect(sau!.capNhatLuc).toBe(bayGio)
  })

  it('bảng KHÔNG tồn tại → không ném lỗi, không tạo mục mới', async () => {
    await expect(capNhatAnhXemTruoc('khong-ton-tai', 'x', false)).resolves.toBeUndefined()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'khong-ton-tai')).toBeUndefined()
  })
})

describe('capNhatAnhXemTruoc — backfill trường mới + noiDungTimKiemMoi', () => {
  it('bản ghi cũ THIẾU chuyenKhoa/tags/noiDungTimKiem → backfill giá trị mặc định', async () => {
    const bayGio = Date.now()
    // Mô phỏng bản ghi tạo TRƯỚC khi có ba trường mới — ép kiểu vì TS sẽ chặn thiếu trường bắt buộc.
    await idbPut(IDB_STORES.boards, {
      id: 'cu',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })

    await capNhatAnhXemTruoc('cu', 'data:image/jpeg;base64,x', false)

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

    await capNhatAnhXemTruoc('z', 'data:image/jpeg;base64,x', false, 'nội dung mới')

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

    await capNhatAnhXemTruoc('w', 'data:image/jpeg;base64,x', false)

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
