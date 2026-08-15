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
  soanThongBaoThieu,
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

  // M2 — fixture 'ngoai/d.js' đã có sẵn trong beforeAll (dùng cho goiCuaDuongDan ở trên) nhưng
  // chưa ca nào tra tới nó QUA timTrongCayVendor. Ghim rằng goi === null được trả về đúng khi
  // chuỗi trúng nằm ở một file không dưới package.json nào.
  it('chuỗi trúng ở file không nằm dưới gói nào → goi là null', async () => {
    const ra = await timTrongCayVendor(GOC, ['Lạc lối'])
    expect(ra.get('Lạc lối')).toEqual([{ file: 'ngoai/d.js', goi: null }])
  })

  // M7 — header của module tuyên bố chẩn đoán ĐỘC LẬP với bao-cao-dich.json. Tính độc lập đó hiện
  // chỉ nhờ dietJs lọc .js; ghim nó bằng HÀNH VI: đặt một bao-cao-dich.json giả có chứa chuỗi tiếng
  // Việt vào cây, rồi khẳng định timTrongCayVendor không trúng nó.
  it('KHÔNG đọc bao-cao-dich.json — độc lập với lời tự khai của bộ thay chuỗi', async () => {
    ghi('bao-cao-dich.json', JSON.stringify({ 'Chèn ảnh': 'Chèn ảnh giả từ báo cáo' }))
    const ra = await timTrongCayVendor(GOC, ['Chèn ảnh giả từ báo cáo'])
    expect(ra.has('Chèn ảnh giả từ báo cáo')).toBe(false)
  })
})

describe('soanThongBaoThieu', () => {
  const cho = (file: string, goi: string | null) => ({ file, goi })

  it('thấy trong cây → nói bước dịch ĐÃ chạy, nêu gói, và bảo cách sửa', () => {
    const ra = soanThongBaoThieu(
      ['Chèn ảnh'],
      new Map([['Chèn ảnh', [cho('affine/blocks/image/src/a.js', 'affine/blocks/image')]]]),
    )
    expect(ra).toContain('đã dịch ở affine/blocks/image/src/a.js')
    expect(ra).toContain('affine/blocks/image')
    expect(ra).toContain('extensions.ts')
    expect(ra).toContain('gỡ khoá')
    // Không được nêu hai nguyên nhân cũ — với ca này CẢ HAI ĐỀU SAI. Đó là toàn bộ lý do chặng
    // này tồn tại.
    expect(ra).not.toContain('không chạy')
  })

  it('không thấy trong cây → giữ nguyên hai nguyên nhân cũ, vì với ca này chúng đúng', () => {
    const ra = soanThongBaoThieu(['Chèn ảnh'], new Map())
    expect(ra).toContain('KHÔNG thấy')
    expect(ra).toContain('dich-chuoi-vendor')
    expect(ra).toContain('luat-vi-tri-dich.mjs')
    expect(ra).not.toContain('đã dịch ở')
  })

  // Ca quan trọng nhất của khối này. Khi phép quét hỏng, ta KHÔNG BIẾT chuỗi có trong cây hay
  // không — nên không được khẳng định "KHÔNG thấy". Khẳng định một nguyên nhân không đo được
  // chính là lỗi mà chặng này sinh ra để sửa; lặp lại nó ở nhánh lỗi là tự thua.
  it('chẩn đoán hỏng → nói rõ là chưa chẩn đoán được, KHÔNG khẳng định gì', () => {
    const ra = soanThongBaoThieu(['Chèn ảnh'], null, 'EACCES: permission denied')
    expect(ra).toContain('chẩn đoán bổ sung không chạy được')
    expect(ra).toContain('EACCES: permission denied')
    expect(ra).not.toContain('KHÔNG thấy')
    expect(ra).not.toContain('đã dịch ở')
  })

  // M3 — ghim bất biến của I1: `daDich === null` phải chọn nhánh "chẩn đoán hỏng" ĐỘC LẬP với
  // loiChanDoan. Gọi với HAI tham số — không có loiChanDoan — nên nếu bộ phân biệt vẫn còn là
  // `if (loiChanDoan)` (falsy ở đây) thì mã sẽ rơi xuống nhánh "không thấy" và khẳng định sai.
  it('daDich === null mà KHÔNG có loiChanDoan → vẫn không được khẳng định "KHÔNG thấy"', () => {
    const ra = soanThongBaoThieu(['Chèn ảnh'], null)
    expect(ra).not.toContain('KHÔNG thấy')
  })

  // M2 (phần 2) — khi goi === null ở MỌI chỗ trúng, câu "Thường vì gói đó..." mất chủ ngữ. Ca này
  // ghim rằng thông báo cho tình huống đó không chứa cụm "gói đó".
  it('mọi chỗ trúng đều goi === null → không nói "gói đó" (mất chủ ngữ)', () => {
    const ra = soanThongBaoThieu(
      ['Chèn ảnh'],
      new Map([['Chèn ảnh', [cho('ngoai/d.js', null)]]]),
    )
    expect(ra).not.toContain('gói đó')
  })

  it('nhiều hơn TOI_DA_CHO chỗ → cắt bớt và đếm phần còn lại', () => {
    const ds = [
      cho('a/x/1.js', 'a/x'),
      cho('a/x/2.js', 'a/x'),
      cho('a/x/3.js', 'a/x'),
      cho('a/x/4.js', 'a/x'),
      cho('a/x/5.js', 'a/x'),
    ]
    const ra = soanThongBaoThieu(['Nhãn'], new Map([['Nhãn', ds]]))
    expect(ra).toContain('a/x/3.js')
    expect(ra).not.toContain('a/x/4.js')
    expect(ra).toContain('...và 2 chỗ nữa')
  })

  // §5.4 của spec: liệt kê MỌI gói trúng, không tự chọn một cái. `"Frame"` đo được ở bốn gói,
  // một số đã bật một số chưa — tự chọn cái đầu tiên là kết luận mà dữ liệu không đỡ.
  it('một chuỗi ở nhiều gói → nêu ĐỦ các gói, không chọn giùm', () => {
    const ra = soanThongBaoThieu(
      ['Khung'],
      new Map([['Khung', [cho('a/x/1.js', 'a/x'), cho('b/y/2.js', 'b/y')]]]),
    )
    expect(ra).toContain('a/x')
    expect(ra).toContain('b/y')
  })

  // I3 (review toàn nhánh P1-D). Tham số `ghiChu` và bất biến "ghi chú in NGAY dưới tên chuỗi,
  // TRƯỚC mọi kết luận" (Task 4) trước lượt vá này không có guard nào — chỉ chạy tay một lần.
  describe('ghi chú (tham số ghiChu)', () => {
    it('in ra ghi chú khi ghiChu có mục cho chuỗi đó', () => {
      const ghiChu = new Map([['Chèn ảnh', 'lưu ý: ghi chú thử nghiệm cho Chèn ảnh']])
      const ra = soanThongBaoThieu(['Chèn ảnh'], new Map(), null, ghiChu)
      expect(ra).toContain('lưu ý: ghi chú thử nghiệm cho Chèn ảnh')
    })

    // Khẳng định theo THỨ TỰ DÒNG — không dùng toContain đơn thuần, vì toContain vẫn xanh kể cả
    // khi thứ tự hai dòng dong.push bị đảo (đúng hồi quy im lặng mà I3 cảnh báo).
    it('ghi chú xuất hiện TRƯỚC dòng kết luận, ngay sau dòng tên chuỗi', () => {
      const ghiChu = new Map([['Chèn ảnh', 'lưu ý: ghi chú thử nghiệm cho Chèn ảnh']])
      const ra = soanThongBaoThieu(['Chèn ảnh'], new Map(), null, ghiChu)
      const dong = ra.split('\n')
      const idxTen = dong.findIndex((d) => d.includes('"Chèn ảnh"'))
      const idxGhiChu = dong.findIndex((d) => d.includes('lưu ý: ghi chú thử nghiệm cho Chèn ảnh'))
      const idxKetLuan = dong.findIndex((d) => d.includes('KHÔNG thấy'))
      expect(idxTen).toBeGreaterThanOrEqual(0)
      expect(idxKetLuan).toBeGreaterThanOrEqual(0)
      // Ghi chú phải là dòng NGAY SAU dòng tên chuỗi — không chỉ "ở đâu đó trước kết luận".
      expect(idxGhiChu).toBe(idxTen + 1)
      expect(idxKetLuan).toBeGreaterThan(idxGhiChu)
    })

    it('không có ghiChu (hoặc không có mục cho chuỗi) → thông báo y hệt như trước, không thêm dòng lạ', () => {
      const raKhongThamSo = soanThongBaoThieu(['Chèn ảnh'], new Map())
      const raThamSoNull = soanThongBaoThieu(['Chèn ảnh'], new Map(), null, null)
      const raKhongMuc = soanThongBaoThieu(['Chèn ảnh'], new Map(), null, new Map())
      expect(raThamSoNull).toBe(raKhongThamSo)
      expect(raKhongMuc).toBe(raKhongThamSo)
      expect(raKhongThamSo).not.toContain('lưu ý')
    })
  })
})
