// Canh cổng `pretest:watch` (nợ vặt HANDOFF mục 6).
//
// npm chỉ chạy hook `pre<tên>` cho ĐÚNG cái tên được gọi: `npm test` kéo theo `pretest`, còn
// `npm run test:watch` thì KHÔNG — nó cần một `pretest:watch` riêng. Trước lượt vá, watch chạy
// trên một cây vendor chưa qua `kiem-vendor-build`/`kiem-vendor-paths`, tức chế độ mà người ta
// ngồi lâu nhất lại là chế độ DUY NHẤT không được gác.
//
// Ca kiểm khẳng định theo QUAN HỆ (hai hook phải giống hệt nhau) chứ không chép cứng chuỗi lệnh:
// thêm cổng thứ ba vào `pretest` mà quên `pretest:watch` cũng phải đỏ, không chỉ mỗi lượt xoá.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>
}

describe('package.json — chế độ watch được gác đúng bằng chế độ chạy một lần', () => {
  it('có `pretest:watch`', () => {
    expect(pkg.scripts['pretest:watch'], 'thiếu hook pretest:watch').toBeDefined()
  })

  it('`pretest:watch` chạy ĐÚNG những cổng mà `pretest` chạy', () => {
    expect(pkg.scripts['pretest:watch']).toBe(pkg.scripts.pretest)
  })

  it('`pretest` thật sự gọi hai cổng vendor — nếu không, ca trên thành phép so hai chuỗi rỗng', () => {
    expect(pkg.scripts.pretest).toContain('kiem-vendor-build.mjs')
    expect(pkg.scripts.pretest).toContain('kiem-vendor-paths.mjs')
  })
})
