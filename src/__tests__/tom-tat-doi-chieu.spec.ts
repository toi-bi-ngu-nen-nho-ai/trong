// Canh dòng tổng kết của cổng D11 (nợ vặt HANDOFF mục 6).
//
// Lỗi gốc: dòng "không đối chiếu được N" chỉ cộng `thua + thieu`, trong khi `process.exit` xét
// thêm `gocThua`. Một cây hỏng vì thư mục gốc thừa in "không đối chiếu được 0" rồi thoát mã 1 —
// dòng tổng kết NÓI cổng sạch trong khi cổng đang đỏ. Kiểu lỗi này sống dai vì hai phép tính nằm
// cách nhau vài dòng và chỉ lệch MỘT vế.
//
// Cách vá cấu trúc, không phải vá số: `tomTatDoiChieu()` sinh RA CẢ dòng chữ LẪN mã thoát từ cùng
// một phép tính, nên chúng không thể lệch nhau nữa. Ca kiểm dưới đây canh đúng bất biến đó.
import { describe, expect, it } from 'vitest'

import { tomTatDoiChieu } from '../../scripts/tom-tat-doi-chieu.mjs'

const KHONG = { tong: 100, lech: 0, loiBam: 0, thua: 0, thieu: 0, gocThua: 0 }

describe('tomTatDoiChieu — dòng chữ và mã thoát không được nói hai điều khác nhau', () => {
  it('cây sạch: mã 0 và đếm 0', () => {
    const t = tomTatDoiChieu(KHONG)
    expect(t.ma).toBe(0)
    expect(t.khongDoiChieuDuoc).toBe(0)
    expect(t.dong).toContain('Đã so 100 file')
  })

  // Bảng bảy tổ hợp: mỗi vế hỏng riêng lẻ, rồi hai vế và ba vế cùng lúc. `gocThua` là vế từng bị
  // bỏ sót nên nó phải xuất hiện cả một mình lẫn lẫn với vế khác.
  const HONG = [
    { ten: 'chỉ thừa file', them: { thua: 3 }, dem: 3 },
    { ten: 'chỉ thiếu file', them: { thieu: 2 }, dem: 2 },
    { ten: 'chỉ thừa thư mục gốc', them: { gocThua: 1 }, dem: 1 },
    { ten: 'thừa file + thừa thư mục gốc', them: { thua: 3, gocThua: 1 }, dem: 4 },
    { ten: 'thiếu file + thừa thư mục gốc', them: { thieu: 2, gocThua: 5 }, dem: 7 },
    { ten: 'cả ba vế', them: { thua: 1, thieu: 1, gocThua: 1 }, dem: 3 },
  ]

  for (const { ten, them, dem } of HONG) {
    it(`${ten}: đếm ${dem}, mã 1, và KHÔNG bao giờ in "không đối chiếu được 0"`, () => {
      const t = tomTatDoiChieu({ ...KHONG, ...them })
      expect(t.khongDoiChieuDuoc).toBe(dem)
      expect(t.ma).toBe(1)
      expect(t.dong).not.toContain('không đối chiếu được 0')
      expect(t.dong).toContain(`không đối chiếu được ${dem}`)
    })
  }

  // `lech` và `loiBam` KHÔNG thuộc "không đối chiếu được" (chúng là file so được nhưng khác nội
  // dung) — nhưng vẫn phải làm đỏ mã thoát. Canh riêng để không ai gộp nhầm chúng vào phép đếm.
  it('lệch nội dung: đếm vẫn 0 nhưng mã phải là 1', () => {
    const t = tomTatDoiChieu({ ...KHONG, lech: 4 })
    expect(t.khongDoiChieuDuoc).toBe(0)
    expect(t.ma).toBe(1)
  })

  it('bảng băm sai: đếm vẫn 0 nhưng mã phải là 1', () => {
    const t = tomTatDoiChieu({ ...KHONG, loiBam: 1 })
    expect(t.khongDoiChieuDuoc).toBe(0)
    expect(t.ma).toBe(1)
  })
})
