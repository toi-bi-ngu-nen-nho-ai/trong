import { expect, test } from 'vitest'

// Ca canh gác P0-C Task 2: chứng minh bộ lọc nội dung của accessorSupport() (vite.config.ts)
// phủ ĐÚNG PHẠM VI, không chỉ phủ src/core/.
//
// Ca ở src/core/__tests__/accessor-support.spec.ts chứng minh Babel *chạy được* khi được gọi —
// nhưng file đó nằm trong src/core/, tức luôn nằm trong phạm vi lọc dù phạm vi có đúng hay
// không. Nó không thể phát hiện lỗ hổng "bộ lọc bỏ sót thư mục X". Ca này đặt ở src/lib/ —
// ngoài src/core/ — nên nếu ai đó thu hẹp lại phạm vi lọc về chỉ src/core/, ca này sẽ đỏ với
// SyntaxError ngay, còn ca kia vẫn xanh như không có gì xảy ra.
//
// Trước khi vá (Step 2 chưa chạy), ca này ĐỎ: Babel không được gọi cho file ngoài src/core/,
// nên oxc/rolldown nhận `accessor` chưa hạ cấp và ném SyntaxError lúc chạy.
test('toolchain dịch được từ khoá accessor ngoài src/core/', () => {
  class A {
    accessor x: number = 1
  }
  const a = new A()
  a.x = 5
  expect(a.x).toBe(5)
})
