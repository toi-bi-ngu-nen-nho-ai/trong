// Phép so khớp bản dịch — thay cho `includes` chuỗi con.
//
// Vì sao chuỗi con là phép SAI cho câu hỏi này: một bản dịch ngắn là chuỗi con của một bản dịch
// khác thì nó được tính "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị
// tree-shake. Đo trên dist/ thật (2026-08-15): "Phong" khớp thô vào "Phong cách" đang ship.
import { describe, expect, it } from 'vitest'

import {
  coDungNhuDaChen,
  coNhuLiteral,
  nhayHoa,
  timTrungBanDich,
} from '../../scripts/so-khop-ban-dich.mjs'

describe('coNhuLiteral — dùng cho dist/ đã minify', () => {
  it('thấy literal nháy kép', () => {
    expect(coNhuLiteral('const a={label:"Phong cách"}', 'Phong cách')).toBe(true)
  })

  it('thấy cả nháy đơn và backtick — kiểu nháy do bộ đóng gói chọn', () => {
    expect(coNhuLiteral("const a={label:'Bố cục'}", 'Bố cục')).toBe(true)
    expect(coNhuLiteral('const a=`Thêm ảnh`', 'Thêm ảnh')).toBe(true)
  })

  // CA GHIM ĐÚNG CON BUG ĐANG SỬA. Phép cũ `includes` trả true ở đây và đó là xanh giả.
  it('chuỗi là TIỀN TỐ của literal dài hơn thì KHÔNG khớp', () => {
    const js = 'const a={label:"Tô màu"}'
    expect(js.includes('Tô')).toBe(true) // phép CŨ khớp — đây là lỗi
    expect(coNhuLiteral(js, 'Tô')).toBe(false) // phép MỚI loại đúng
  })

  it('chuỗi là HẬU TỐ hoặc nằm giữa literal dài hơn thì KHÔNG khớp', () => {
    expect(coNhuLiteral('const a={label:"Tô màu"}', 'màu')).toBe(false)
    expect(coNhuLiteral('const a={label:"Xoá cả dòng"}', 'cả')).toBe(false)
  })

  // Bản dịch chứa dấu nháy hay gạch chéo phải so theo dạng ĐÃ THOÁT, vì đó là dạng nó nằm trong
  // mã. So thô sẽ trượt và cổng đỏ giả trên một bản dịch hoàn toàn hợp lệ.
  it('bản dịch chứa dấu nháy kép hoặc gạch chéo khớp đúng dạng đã thoát', () => {
    expect(coNhuLiteral('const a={label:"Nhấn \\"OK\\""}', 'Nhấn "OK"')).toBe(true)
    expect(coNhuLiteral('const a={label:"Ngăn cách\\\\dòng"}', 'Ngăn cách\\dòng')).toBe(true)
  })
})

describe('coDungNhuDaChen — dùng cho .vendor-build/ chưa minify', () => {
  // dich-chuoi-vendor.mjs chèn bản dịch bằng đúng JSON.stringify, nên ở cây đó phép so khớp
  // chính xác được, không cần chấp ba kiểu nháy.
  it('khớp đúng dạng JSON.stringify và từ chối kiểu nháy khác', () => {
    expect(coDungNhuDaChen('x = {label: "Phong cách"}', 'Phong cách')).toBe(true)
    expect(coDungNhuDaChen("x = {label: 'Phong cách'}", 'Phong cách')).toBe(false)
  })

  it('vẫn loại được ca tiền tố', () => {
    expect(coDungNhuDaChen('x = {label: "Tô màu"}', 'Tô')).toBe(false)
  })
})

describe('timTrungBanDich', () => {
  it('rỗng khi mọi bản dịch đều duy nhất', () => {
    expect(timTrungBanDich({ Style: 'Phong cách', Layout: 'Bố cục' })).toEqual([])
  })

  // Phép chặt KHÔNG cứu được ca này: hai chuỗi bằng nhau từng ký tự, nên một cái còn sống trong
  // dist/ là cả hai được tính có mặt. Phải chặn ở bảng dịch.
  it('gom đúng nhóm khi nhiều khoá dùng chung một bản dịch', () => {
    expect(timTrungBanDich({ Delete: 'Xoá', Remove: 'Xoá', Style: 'Phong cách' })).toEqual([
      { vi: 'Xoá', khoa: ['Delete', 'Remove'] },
    ])
  })
})

describe('nhayHoa', () => {
  it('trả dạng đã thoát, không kèm dấu nháy bao ngoài', () => {
    expect(nhayHoa('Nhấn "OK"')).toBe('Nhấn \\"OK\\"')
  })
})
