// Phép so khớp bản dịch — thay cho `includes` chuỗi con.
//
// Vì sao chuỗi con là phép SAI cho câu hỏi này: một bản dịch ngắn là chuỗi con của một bản dịch
// khác thì nó được tính "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị
// tree-shake. Đo trên dist/ thật (2026-08-15): "Phong" khớp thô vào "Phong cách" đang ship.
import { describe, expect, it } from 'vitest'

import {
  coDungNhuDaChen,
  coNhuLiteral,
  dangTrongNhay,
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

  // CA HỒI QUY CHÍNH. Ba kiểu nháy có ba luật thoát khác nhau; mã cũ luôn thoát theo quy ước
  // JSON (nháy kép) dù đang dò literal backtick. Đây đúng hình dạng thật của cả 5 bản dịch đang
  // ship trong dist/ ngày 2026-08-15: nằm trong literal backtick, có dấu ngoặc kép bên trong.
  // Trong backtick, `"` KHÔNG cần thoát — bộ đóng gói ghi `Nhấn "OK" đi` nguyên vẹn. Mã cũ đi
  // tìm dạng nháy-kép-hoá `Nhấn \"OK\" đi` bên trong backtick nên trượt: đỏ giả trên bản dịch
  // hoàn toàn hợp lệ.
  it('CA HỒI QUY CHÍNH — bản dịch chứa dấu ngoặc kép, nằm trong literal backtick', () => {
    expect(coNhuLiteral('html`Nhấn "OK" đi`', 'Nhấn "OK" đi')).toBe(true)
  })

  // Literal nháy đơn thoát nháy đơn bằng gạch chéo ngược, không đụng tới nháy kép hay backtick.
  it('bản dịch chứa dấu nháy đơn nằm trong literal nháy đơn', () => {
    const noiDung = "x='Đừng \\'bỏ\\' qua'"
    expect(coNhuLiteral(noiDung, "Đừng 'bỏ' qua")).toBe(true)
  })

  // Literal backtick thoát backtick bên trong bằng gạch chéo ngược — khác quy ước nháy đơn/kép.
  it('bản dịch chứa backtick nằm trong literal backtick', () => {
    const noiDung = 'x=`má \\`đỏ\\``'
    expect(coNhuLiteral(noiDung, 'má `đỏ`')).toBe(true)
  })

  // Riêng backtick còn phải thoát `${` (mở nội suy) thành `\${`, việc ba kiểu nháy kia không có.
  it('bản dịch chứa ${ nằm trong literal backtick khớp dạng đã thoát \\${', () => {
    const noiDung = 'x=`Tổng: \\${n}`'
    expect(coNhuLiteral(noiDung, 'Tổng: ${n}')).toBe(true)
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

describe('dangTrongNhay', () => {
  // Cùng một chuỗi chứa `"`, ba kiểu nháy phải cho ba kết quả khác nhau: nháy kép là kiểu duy
  // nhất cần thoát `"`; nháy đơn và backtick để nguyên vì `"` không có ý nghĩa gì với chúng.
  it('trả đúng ba dạng khác nhau cho cùng một chuỗi chứa dấu ngoặc kép', () => {
    const s = 'Nhấn "OK"'
    expect(dangTrongNhay(s, '"')).toBe('Nhấn \\"OK\\"')
    expect(dangTrongNhay(s, "'")).toBe('Nhấn "OK"')
    expect(dangTrongNhay(s, '`')).toBe('Nhấn "OK"')
  })

  // Gạch chéo ngược phải thoát TRƯỚC mọi phép thoát khác, nếu không phép thoát dấu nháy sau sẽ
  // nhân đôi nhầm gạch chéo do chính nó sinh ra. Chuỗi gốc một gạch chéo → kết quả hai gạch chéo.
  it('thoát gạch chéo ngược trước — một gạch chéo gốc thành hai ở kết quả', () => {
    expect(dangTrongNhay('a\\b', '"')).toBe('a\\\\b')
  })
})
