// Ba cổng cho D16, mỗi cái canh một cách hỏng khác nhau.
import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const BUILD = '.vendor-build'
const NGUON = 'src/vendor/blocksuite'

async function* diet(dir: string, duoi: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* diet(f, duoi)
    } else if (e.name.endsWith(duoi)) yield f
  }
}

describe('D16 — đổi tên affine-*', () => {
  it('output không còn tiền tố affine- nào, ngoài tên gói trong câu import', async () => {
    expect(existsSync(BUILD)).toBe(true)

    // Tên GÓI cũng chứa `affine-` (`@blocksuite/affine-block-frame/view`) và phải giữ nguyên,
    // nếu không mọi phép phân giải module gãy. Bỏ specifier ra trước rồi mới soi phần còn lại.
    //
    // Danh sách nhánh phải KHỚP TỪNG CHỮ với bộ che trong `scripts/doi-ten-vendor.mjs`, kể cả
    // nhánh `\bimport\s*` cho import chỉ-để-chạy và thứ tự `\bimport\s*\(\s*` đứng trước nó.
    // Lệch một nhánh là ca này đỏ giả (che ít hơn) hoặc mù (che nhiều hơn) — cả hai đều tệ.
    const boSpecifier = (js: string) =>
      js.replace(
        /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bexport\s*\*\s*from\s*|\brequire\s*\(\s*)(['"])([^'"]+)\2/g,
        '$1$2$2'
      )

    const soPham: string[] = []
    for await (const f of diet(BUILD, '.js')) {
      const js = boSpecifier(readFileSync(f, 'utf8'))
      if (/\baffine-|--affine-/.test(js)) soPham.push(path.relative(BUILD, f))
      if (soPham.length > 5) break
    }
    expect(soPham).toEqual([])
  })

  it('tiền tố mới thật sự có mặt — chứng minh phép thay đã chạy', async () => {
    let thay = false
    for await (const f of diet(BUILD, '.js')) {
      if (/\bdrt-/.test(readFileSync(f, 'utf8'))) {
        thay = true
        break
      }
    }
    expect(thay).toBe(true)
  })

  // Phép thay văn bản chỉ an toàn khi KHÔNG chỗ nào ghép tên thẻ động. Hôm nay đúng 1 chỗ và
  // nó nằm trong test-utils. Nếu bản nâng cấp sau thêm chỗ thứ hai trong mã sản phẩm, tên thẻ
  // sẽ ghép ra `affine-...` chưa đổi và component im lặng không mount. Cổng này phải đỏ trước.
  it('không có chỗ ghép tên thẻ động ngoài test-utils', async () => {
    const mau = /`affine-\$\{|'affine-'\s*\+|"affine-"\s*\+/
    const soPham: string[] = []
    for await (const f of diet(NGUON, '.ts')) {
      const rel = path.relative(NGUON, f).replace(/\\/g, '/')
      if (rel.includes('test-utils') || rel.includes('__tests__')) continue
      if (mau.test(readFileSync(f, 'utf8'))) soPham.push(rel)
    }
    expect(soPham).toEqual([])
  })
})

describe('D12 — bản đồ dịch', () => {
  // Nếu thượng nguồn đổi một chuỗi, khoá trong vi.json không còn khớp và bản dịch trôi âm thầm.
  // Cổng này liệt kê khoá chết để người sau biết mà sửa.
  it('mọi khoá trong vi.json còn tìm thấy trong cây nguồn', async () => {
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    const khoa = Object.keys(banDo)
    const conSong = new Set<string>()

    for await (const f of diet(NGUON, '.ts')) {
      const ts = readFileSync(f, 'utf8')
      for (const k of khoa) if (!conSong.has(k) && ts.includes(k)) conSong.add(k)
      if (conSong.size === khoa.length) break
    }

    const khoaChet = khoa.filter((k) => !conSong.has(k))
    expect(khoaChet).toEqual([])
  })
})
