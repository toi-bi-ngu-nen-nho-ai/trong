import { describe, expect, it } from 'vitest'

import { locTheoProps } from '../LuoiMuc'
import type { IdDanhMuc, MucMeta } from '../mucMeta'

const muc = (p: Pick<MucMeta, 'id' | 'loai' | 'danhMuc'> & Partial<MucMeta>): MucMeta => ({
  ten: p.id,
  taoLuc: 1,
  capNhatLuc: 1,
  chuyenKhoa: '',
  tags: [],
  noiDungTimKiem: '',
  ...p,
})

const KHO: MucMeta[] = [
  muc({ id: 'sd-tiep-can', loai: 'so-do', danhMuc: 'tiep-can' }),
  muc({ id: 'sd-ecg', loai: 'so-do', danhMuc: 'ecg', chuyenKhoa: 'cardiology' }),
  muc({ id: 'bv-ecg', loai: 'bai-viet', danhMuc: 'ecg' }),
  muc({ id: 'bv-huong-dan', loai: 'bai-viet', danhMuc: 'huong-dan' }),
  muc({ id: 'bv-da-xoa', loai: 'bai-viet', danhMuc: 'ecg', daXoaLuc: 5 }),
]

describe('locTheoProps', () => {
  it('CA GHIM tab Mindmap: loai="so-do" cho ra đúng các sơ đồ chưa xoá', () => {
    // Tab Mindmap là thứ chủ dự án dùng thật hàng ngày — hồi quy ở đây đắt hơn mọi thứ khác trong
    // chặng (spec §3.5). Ca này ghim đúng tập hợp mà DanhSachBang cho ra hôm nay.
    expect(locTheoProps(KHO, { loai: 'so-do' }).map((m) => m.id)).toEqual(['sd-tiep-can', 'sd-ecg'])
  })

  it('không prop nào = không lọc gì (trừ xoá mềm)', () => {
    expect(locTheoProps(KHO, {}).map((m) => m.id)).toEqual([
      'sd-tiep-can',
      'sd-ecg',
      'bv-ecg',
      'bv-huong-dan',
    ])
  })

  it('danhMuc lọc VÀO một danh mục', () => {
    expect(locTheoProps(KHO, { danhMuc: 'ecg' }).map((m) => m.id)).toEqual(['sd-ecg', 'bv-ecg'])
  })

  it('danhMucLoaiTru lọc RA — tab Thư viện không gồm Hướng dẫn', () => {
    const ra = locTheoProps(KHO, { loai: 'bai-viet', danhMucLoaiTru: ['huong-dan' as IdDanhMuc] })
    expect(ra.map((m) => m.id)).toEqual(['bv-ecg'])
  })

  it('chuyenKhoa lọc theo khoa; chuỗi rỗng nghĩa là chưa gắn nên không khớp khoa nào', () => {
    expect(locTheoProps(KHO, { chuyenKhoa: 'cardiology' }).map((m) => m.id)).toEqual(['sd-ecg'])
  })

  it('mục xoá mềm không bao giờ lọt vào lưới', () => {
    expect(locTheoProps(KHO, {}).some((m) => m.id === 'bv-da-xoa')).toBe(false)
  })
})
