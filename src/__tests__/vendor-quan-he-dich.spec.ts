// Cổng 4 của D12 — dây bẫy quét NGƯỢC. Câu hỏi không phải "chuỗi này có ở vị trí định danh
// không" (quét literal, mù trước khoá không nháy như `Italic: {...}`) mà là "ở đâu một giá trị
// hiển thị bị TIÊU THỤ làm dữ liệu" — quét từ phía đọc, không phải từ phía chuỗi.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { dietJs } from '../../scripts/duyet-cay-js.mjs'
import {
  BAN_KHAI_TIEU_THU,
  diemTieuThuTrongFile,
  kiemTienTo,
  THUOC_TINH_CON_GIU,
} from '../../scripts/kiem-quan-he-dich.mjs'

describe('THUOC_TINH_CON_GIU', () => {
  it('đúng 5 tên, khớp với THUOC_TINH_HIEN_THI của luat-vi-tri-dich.mjs', () => {
    expect([...THUOC_TINH_CON_GIU].sort()).toEqual(
      ['caption', 'description', 'label', 'placeholder', 'tooltip'].sort(),
    )
  })
})

describe('diemTieuThuTrongFile — bốn hình dạng tiêu thụ', () => {
  it('tra khoá: bang[label]', () => {
    const ra = diemTieuThuTrongFile(`const t = bang[item.label];`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'tra-khoá', thuocTinh: 'label' }])
  })

  it('so sánh: x.description === y', () => {
    const ra = diemTieuThuTrongFile(`if (i.description === acceptType) {}`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'so-sánh', thuocTinh: 'description' }])
  })

  it('so sánh: y === x.tooltip (vế trái là biến, vế phải là property access)', () => {
    const ra = diemTieuThuTrongFile(`if (selectedName === item.tooltip) {}`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'so-sánh', thuocTinh: 'tooltip' }])
  })

  it('includes(): [...].includes(i.caption)', () => {
    const ra = diemTieuThuTrongFile(`['A','B'].includes(i.caption)`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'includes()', thuocTinh: 'caption' }])
  })

  it('switch: switch (item.placeholder)', () => {
    const ra = diemTieuThuTrongFile(`switch (item.placeholder) { case 'x': break; }`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'switch', thuocTinh: 'placeholder' }])
  })

  it('sau destructure: const { label } = config; bang[label]', () => {
    const ra = diemTieuThuTrongFile(`const { label } = config; const t = bang[label];`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'tra-khoá', thuocTinh: 'label' }])
  })

  it('tên KHÔNG trong THUOC_TINH_CON_GIU thì không bắt — ca đối chứng', () => {
    // `name` từng ở trong danh sách hiển thị nhưng đã bị Task 1 gỡ; module này chỉ quan tâm 5 tên
    // CÒN GIỮ, nên name/group/title/text không thuộc phạm vi của cổng này (chúng vĩnh viễn không
    // được dịch, nên không cần dây bẫy).
    const ra = diemTieuThuTrongFile(`if (item.name === 'Divider') {}`, 'thu.js')
    expect(ra).toEqual([])
  })

  it('ghi đúng số dòng khi tiêu thụ nằm ở dòng thứ hai', () => {
    const ra = diemTieuThuTrongFile(`const a = 1;\nif (i.description === x) {}`, 'thu.js')
    expect(ra[0].dong).toBe(2)
  })
})

describe('BAN_KHAI_TIEU_THU — bản khai được ghim, đúng khuôn bang-bam-vendor.json của D11', () => {
  it('có đúng 4 mục, đúng toạ độ đã đo 2026-08-15', () => {
    expect(BAN_KHAI_TIEU_THU).toEqual([
      {
        file: 'affine/components/src/toolbar/utils.js',
        dong: 50,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
        dong: 114,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 175,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 205,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
    ])
  })
})

describe('kiemTienTo — tính nhất quán tiền tố', () => {
  const TIEN_TO = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }

  it('rỗng khi mọi bản dịch bắt đầu đúng tiền tố', () => {
    const banDo = { 'Drag/Click to insert Quote': 'Kéo/Bấm để chèn Trích dẫn' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })

  it('báo vi phạm khi một bản dịch không bắt đầu bằng bản dịch của tiền tố', () => {
    const banDo = { 'Drag/Click to insert Quote': 'Trích dẫn (kéo hoặc bấm)' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([
      {
        khoa: 'Drag/Click to insert Quote',
        tienTo: 'Drag/Click to insert ',
        banDichKhoa: 'Trích dẫn (kéo hoặc bấm)',
        banDichTienTo: 'Kéo/Bấm để chèn ',
      },
    ])
  })

  it('khoá KHÔNG bắt đầu bằng tiền tố tiếng Anh thì không bị xét', () => {
    const banDo = { Quote: 'Trích dẫn' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })

  it('không tự xét chính khoá tiền tố với chính nó', () => {
    const banDo = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })
})

describe('Cổng 4 — cổng độc lập trên đầu ra thật', () => {
  it('không có điểm tiêu thụ nào ngoài bản khai, trên toàn bộ .vendor-build/', async () => {
    const phatHien: { file: string; dong: number; dang: string; thuocTinh: string }[] = []
    for await (const f of dietJs('.vendor-build')) {
      const src = readFileSync(f, 'utf8')
      const rel = path.relative('.vendor-build', f).split(path.sep).join('/')
      phatHien.push(...diemTieuThuTrongFile(src, rel))
    }
    const sap = (ds: typeof phatHien) =>
      [...ds].sort((a, b) => `${a.file}:${a.dong}`.localeCompare(`${b.file}:${b.dong}`))
    expect(sap(phatHien)).toEqual(sap(BAN_KHAI_TIEU_THU))
  }, 60_000)
})
