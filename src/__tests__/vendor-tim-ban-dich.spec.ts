// Chẩn đoán của luật C — tìm GIÁ TRỊ TIẾNG VIỆT trong cây đã dịch rồi quy ra gói chứa nó.
//
// Vì sao quét tiếng Việt chứ không tiếng Anh: sau khi bước dịch chạy, bản gốc tiếng Anh đã BIẾN
// MẤT khỏi đúng những chỗ đó — quét tiếng Anh sẽ không thấy gì và kết luận ngược.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  docGocGoi,
  goiCuaDuongDan,
  timTrongCayVendor,
} from '../../scripts/tim-ban-dich-vendor.mjs'

let GOC: string
let gocGoi: Set<string>

const ghi = (rel: string, noiDung: string) => {
  const f = path.join(GOC, rel)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, noiDung)
}

beforeAll(async () => {
  GOC = mkdtempSync(path.join(tmpdir(), 'tim-ban-dich-'))

  // Gói ở ĐỘ SÂU 2 — hình dạng có thật: affine/all, affine/foundation, affine/shared...
  ghi('affine/all/package.json', '{"name":"all"}')
  ghi('affine/all/src/a.js', 'const x = "Phong cách";\n')

  // Gói ở ĐỘ SÂU 3 — hình dạng có thật: affine/blocks/table, affine/gfx/mindmap...
  ghi('affine/blocks/table/package.json', '{"name":"table"}')
  ghi('affine/blocks/table/src/b.js', 'const y = "Phong cách"; const z = "Bố cục";\n')

  // Gói LỒNG trong gói: package.json ở cả tổ tiên gần lẫn xa.
  ghi('affine/blocks/table/noi/package.json', '{"name":"noi"}')
  ghi('affine/blocks/table/noi/e.js', 'const w = "Chèn ảnh";\n')

  // File KHÔNG nằm dưới package.json nào.
  ghi('ngoai/d.js', 'const v = "Lạc lối";\n')

  gocGoi = await docGocGoi(GOC)
})

afterAll(() => rmSync(GOC, { recursive: true, force: true }))

describe('goiCuaDuongDan', () => {
  it('quy đúng gói ở cả hai độ sâu có thật trong cây', () => {
    expect(goiCuaDuongDan('affine/all/src/a.js', gocGoi)).toBe('affine/all')
    expect(goiCuaDuongDan('affine/blocks/table/src/b.js', gocGoi)).toBe('affine/blocks/table')
  })

  it('trả null cho file không nằm dưới gói nào — không ném, không đoán bừa', () => {
    expect(goiCuaDuongDan('ngoai/d.js', gocGoi)).toBeNull()
  })

  // Cây hiện tại KHÔNG có gói lồng gói (đo 2026-08-15). Ca này ghim HỢP ĐỒNG của hàm, để một lượt
  // nâng cấp cây vendored đẻ ra hình dạng đó không lặng lẽ quy sai gói.
  it('chọn gói GẦN NHẤT khi có package.json ở nhiều tầng tổ tiên', () => {
    expect(goiCuaDuongDan('affine/blocks/table/noi/e.js', gocGoi)).toBe('affine/blocks/table/noi')
  })
})

describe('timTrongCayVendor', () => {
  it('tìm thấy bản dịch và quy đúng file + gói', async () => {
    const ra = await timTrongCayVendor(GOC, ['Bố cục'])
    expect(ra.get('Bố cục')).toEqual([
      { file: 'affine/blocks/table/src/b.js', goi: 'affine/blocks/table' },
    ])
  })

  it('chuỗi không có ở đâu thì VẮNG MẶT khỏi Map, không phải mảng rỗng', async () => {
    const ra = await timTrongCayVendor(GOC, ['Không hề tồn tại'])
    expect(ra.has('Không hề tồn tại')).toBe(false)
  })

  // Ca mà `find` thay cho `filter` sẽ lặng lẽ trượt. §5.4 của spec phụ thuộc vào nó: thông báo
  // phải liệt kê MỌI gói trúng, không tự chọn một cái.
  it('trả về CẢ HAI chỗ khi một chuỗi nằm ở hai gói khác nhau', async () => {
    const ra = await timTrongCayVendor(GOC, ['Phong cách'])
    const goi = ra.get('Phong cách')?.map((n) => n.goi).sort()
    expect(goi).toEqual(['affine/all', 'affine/blocks/table'])
  })

  it('ném lỗi phân biệt được khi cây không tồn tại, để bên gọi hạ cấp thông báo', async () => {
    await expect(timTrongCayVendor(path.join(GOC, 'khong-he-co'), ['x'])).rejects.toThrow(
      /không thấy cây/,
    )
  })
})
