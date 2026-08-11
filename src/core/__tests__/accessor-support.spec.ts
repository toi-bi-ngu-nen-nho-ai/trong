import { expect, test } from 'vitest'

// Ca canh gác cho vật cản đã gặp ở P0-B: toolchain phải dịch được từ khoá `accessor`.
// BlockSuite khai mọi thuộc tính của mọi element bằng cú pháp này, nên nếu ca dưới đỏ thì
// cả tầng model không nạp được lúc chạy — dù `tsc` vẫn xanh.
test('toolchain dịch được từ khoá accessor', () => {
  class A {
    accessor x: number = 1
  }
  const a = new A()
  a.x = 5
  expect(a.x).toBe(5)
})
