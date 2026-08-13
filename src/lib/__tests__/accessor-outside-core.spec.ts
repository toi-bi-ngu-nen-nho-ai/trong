import { expect, test } from 'vitest'

// Ca canh gác P0-C Task 2: chứng minh bộ lọc nội dung của accessorSupport() (vite.config.ts)
// phủ ĐÚNG PHẠM VI, không chỉ phủ một thư mục cố định.
//
// Từng có một ca song song ở src/core/__tests__/accessor-support.spec.ts chứng minh Babel
// *chạy được* khi được gọi — nhưng file đó nằm trong src/core/, tức luôn nằm trong phạm vi lọc
// dù phạm vi có đúng hay không, nên không thể phát hiện lỗ hổng "bộ lọc bỏ sót thư mục X". File
// đó (và cả src/core/) đã bị xoá ở P1-A Task 5 — `@blocksuite/affine/std` đã có sẵn `std/gfx`.
// Ca này vẫn ở lại vì nó phủ một điều ca kia không phủ được: đặt ở src/lib/, ngoài mọi thư mục
// từng/đang chứa mã port, nên nếu ai đó thu hẹp lại phạm vi lọc về chỉ một thư mục cụ thể, ca
// này sẽ đỏ với SyntaxError ngay.
//
// Trước khi bộ lọc phủ đúng phạm vi, ca này ĐỎ: Babel không được gọi cho file ngoài phạm vi hẹp,
// nên oxc/rolldown nhận `accessor` chưa hạ cấp và ném SyntaxError lúc chạy.
test('toolchain dịch được từ khoá accessor ngoài src/core/', () => {
  class A {
    accessor x: number = 1
  }
  const a = new A()
  a.x = 5
  expect(a.x).toBe(5)
})
