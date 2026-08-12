// Cưỡng chế thứ đã chặn bản thử trước: `@provide` của @lit/context đặt trên một `accessor`
// trong lit-host.ts. Nếu decorator bị hạ cấp sai, mã sinh ra chạm `this` TRƯỚC `super()` và
// trình duyệt ném "Must call super constructor in derived class".
//
// Ca này đọc JS đã dịch chứ không chạy nó: chạy được đòi cả một DOM và một BlockStdScope thật.
// Đọc thứ tự trong nguồn là phép kiểm rẻ và đủ chặt cho đúng lỗi này.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const FILE = '.vendor-build/framework/std/src/view/element/lit-host.js'

describe('cây vendored đã dịch', () => {
  it('lit-host.js tồn tại — bước dịch đã chạy', () => {
    expect(existsSync(FILE)).toBe(true)
  })

  it('không còn từ khoá accessor chưa hạ cấp', () => {
    const js = readFileSync(FILE, 'utf8')
    // `accessor x = ...` là cú pháp Stage-3 mà oxc không hạ cấp được. Còn sót là hỏng.
    expect(js).not.toMatch(/^\s*(?:@[\w.]+\s*)*accessor\s+\w+/m)
  })

  it('trong constructor, super() đứng trước mọi truy cập this', () => {
    const js = readFileSync(FILE, 'utf8')

    // Neo vào chính token `constructor(` thay vì lùi một số ký tự cố định: các cặp
    // getter/setter do hạ cấp accessor sinh ra (#x_accessor_storage / get x / set x)
    // nằm ngay phía trên constructor trong thân class, và bản thân chúng hợp lệ chứa
    // `this.` — đó là thân của một method khác, được gọi sau lúc runtime, không phải
    // câu lệnh chạy trước super(). Một cửa sổ lùi cố định (số ký tự hoặc số dòng) đọc
    // trúng các getter/setter đó và báo đỏ trên mã đúng — đã xác nhận bằng thực nghiệm
    // trên EditorHost (hai accessor `store`/`std`, mỗi cái 3 dòng, vừa khít cửa sổ 6
    // dòng cũ). Neo vào token thật thì không còn phụ thuộc số dòng của các thành viên
    // đứng trước.
    const iCtor = js.indexOf('constructor(')
    expect(iCtor, 'không tìm thấy constructor( trong file — ca kiểm không còn phủ được gì').toBeGreaterThan(-1)

    const iCtorBrace = js.indexOf('{', iCtor)
    expect(iCtorBrace, 'không tìm thấy dấu { mở constructor').toBeGreaterThan(-1)

    const iSuper = js.indexOf('super(', iCtorBrace)
    expect(iSuper, 'không tìm thấy super( sau constructor(').toBeGreaterThan(-1)

    // Đúng phần mở đầu constructor: từ ngay sau dấu `{` mở constructor tới trước super().
    const moDauConstructor = js.slice(iCtorBrace + 1, iSuper)
    expect(moDauConstructor).not.toMatch(/this\./)
  })
})
