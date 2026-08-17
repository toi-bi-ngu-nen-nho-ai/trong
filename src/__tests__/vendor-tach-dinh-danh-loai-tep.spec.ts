// Ca kiểm hàm thuần scripts/tach-dinh-danh-loai-tep.mjs — xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md §6.1.
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

import { tachDinhDanhLoaiTep } from '../../scripts/tach-dinh-danh-loai-tep.mjs'

const DANH_SACH_DUNG = [
  'Images',
  'Videos',
  'Audios',
  'Markdown',
  'Html',
  'Zip',
  'Docx',
  'OneNote',
  'MindMap',
]

// Dựng fixture tối giản CÙNG HÌNH DẠNG với affine/shared/src/utils/file/filesys.js thật (mảy
// FileTypes + N lượt gọi FileTypes.find(i => i.description === acceptType)), không cần đúng nội
// dung "accept" — hàm cần kiểm không đọc trường đó.
function dungFixture(moTa: string[], soLuotFind = 2): string {
  const phanTu = moTa.map((d) => `  { description: ${JSON.stringify(d)}, accept: {} },`).join('\n')
  const cacHam = Array.from(
    { length: soLuotFind },
    (_, i) =>
      `export async function ham${i}(acceptType) {\n` +
      `  return FileTypes.find(i => i.description === acceptType);\n` +
      `}`,
  ).join('\n')
  return `const FileTypes = [\n${phanTu}\n];\n${cacHam}\n`
}

describe('tachDinhDanhLoaiTep — đường cơ bản', () => {
  it('đầu vào đúng hình dạng → chèn FILE_TYPE_IDS ngay sau khai báo FileTypes', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js, danhSachId } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(danhSachId).toEqual(DANH_SACH_DUNG)
    expect(js).toContain(
      '];\nconst FILE_TYPE_IDS = ' + JSON.stringify(DANH_SACH_DUNG) + ';\nexport async function ham0',
    )
  })

  it('đổi cả hai lượt FileTypes.find(...description...) thành tra chỉ số', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(js).not.toContain('i.description === acceptType')
    expect(js.match(/FileTypes\[FILE_TYPE_IDS\.indexOf\(acceptType\)\]/g)).toHaveLength(2)
  })

  it('đầu ra vẫn phân tích cú pháp hợp lệ', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    const sf = ts.createSourceFile('thu.js', js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    expect((sf as any).parseDiagnostics).toEqual([])
  })

  it('chạy hai lần liên tiếp trên cùng input gốc cho kết quả giống hệt nhau', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const lanMot = tachDinhDanhLoaiTep(fixture, 'thu.js')
    const lanHai = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(lanMot).toEqual(lanHai)
  })
})

describe('tachDinhDanhLoaiTep — fail-closed khi cấu trúc lệch kỳ vọng', () => {
  it('thiếu một phần tử (8 thay vì 9) → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG.slice(0, 8), 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('đổi thứ tự hai phần tử đầu → throw', () => {
    const daoThuTu = ['Videos', 'Images', ...DANH_SACH_DUNG.slice(2)]
    const fixture = dungFixture(daoThuTu, 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('đổi chữ một description ("MindMap" → "Mind Map") → throw', () => {
    const doiChu = [...DANH_SACH_DUNG.slice(0, 8), 'Mind Map']
    const fixture = dungFixture(doiChu, 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('chỉ có 1 lượt .find(...description...) thay vì 2 → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 1)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/kỳ vọng ĐÚNG 2 lượt/)
  })

  it('có 3 lượt .find(...description...) thay vì 2 → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 3)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/kỳ vọng ĐÚNG 2 lượt/)
  })
})

describe('tachDinhDanhLoaiTep — chặn trùng tên FILE_TYPE_IDS trước khi chèn', () => {
  it('đã có khai báo BIẾN trùng tên từ trước → throw', () => {
    const fixture = `const FILE_TYPE_IDS = [1, 2, 3];\n${dungFixture(DANH_SACH_DUNG, 2)}`
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/đã có khai báo/)
  })

  it('đã có khai báo HÀM trùng tên từ trước → throw', () => {
    const fixture = `function FILE_TYPE_IDS() {}\n${dungFixture(DANH_SACH_DUNG, 2)}`
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/đã có khai báo/)
  })
})
