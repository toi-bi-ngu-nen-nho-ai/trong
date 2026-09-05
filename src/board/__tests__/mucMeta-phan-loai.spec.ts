import { describe, expect, it } from 'vitest'

import { DANH_MUC, danhMucNhanLoai, type IdDanhMuc, type MucMeta } from '../mucMeta'

describe('DANH_MUC', () => {
  it('có đúng bốn danh mục, đúng thứ tự spec §3.1', () => {
    expect(DANH_MUC.map((d) => d.id)).toEqual(['tiep-can', 'ecg', 'phac-do', 'huong-dan'])
  })

  it('Hướng dẫn CHỈ nhận bài viết — quyết định 6 của chủ dự án', () => {
    expect(danhMucNhanLoai('huong-dan', 'bai-viet')).toBe(true)
    expect(danhMucNhanLoai('huong-dan', 'so-do')).toBe(false)
  })

  it('ba danh mục còn lại nhận cả hai loại', () => {
    for (const id of ['tiep-can', 'ecg', 'phac-do'] as IdDanhMuc[]) {
      expect(danhMucNhanLoai(id, 'bai-viet')).toBe(true)
      expect(danhMucNhanLoai(id, 'so-do')).toBe(true)
    }
  })

  it('MucMeta bắt buộc loai và danhMuc ở mức kiểu', () => {
    // Ca này là một khẳng định KIỂU: nếu hai trường thành optional thì `tsc` vẫn xanh nhưng
    // `Required<>` bên dưới sẽ đỏ ở lượt gán.
    const muc: Required<Pick<MucMeta, 'loai' | 'danhMuc'>> = { loai: 'bai-viet', danhMuc: 'ecg' }
    expect(muc.loai).toBe('bai-viet')
  })
})
