// @vitest-environment happy-dom
//
// Huy hiệu của một bảng Sơ đồ tư duy CHƯA GẮN CHUYÊN KHOA.
//
// Chủ dự án cấp ảnh 2026-09-04 (bóng đèn đang sáng + bút chì + bánh răng) và yêu cầu nó thay cho
// hình cũ, kèm hoạt ảnh line-drawing lúc chờ mở sơ đồ. Ba thứ ca kiểm này canh:
//
//   1. ĐÚNG CỬA. Trước lượt sửa, nhánh "chưa gắn khoa" rơi vào `SPECIALTY_ICONS.default` — icon tờ
//      giấy — mà tờ giấy còn là icon của một BÀI VIẾT ghi chuyên khoa ngoài danh mục (App.tsx).
//      Hai thứ khác hẳn nhau dùng chung một hình. Nên có `iconBangSoDo()` riêng, và `specialtyIcon()`
//      PHẢI giữ nguyên tờ giấy cho bài viết — đổi `default` là sửa nhầm cả một màn khác.
//
//   2. HỢP ĐỒNG VỚI LỚP VẼ. VeChuyenKhoaDangTai.tsx nhân bản chính thẻ <svg> này rồi tách `d` theo
//      lệnh `M` thành từng nét bút. Nó đọc `fill` ở ROOT để quyết bề dày nét (khác 'none' →
//      beRong/58) và ăn `currentColor` để lấy màu khoa. Ảnh gốc chủ dự án gửi ghi `fill="#000000"`
//      trên TỪNG path và có `width`/`height` cứng — để nguyên là icon đen thui, cỡ cứng, và nét vẽ
//      sai bề dày. Ba điều kiện đó không có tín hiệu biên dịch nào, nên canh ở đây.
//
//   3. HAI NHÁNH TĨNH/ĐỘNG CÙNG MỘT HÌNH. Thẻ ở lưới (TheTrong, tĩnh) và lớp phủ FLIP lúc mở bảng
//      (VeChuyenKhoaDangTai, động) phải vẽ ĐÚNG một hình — nếu lệch, cú phóng to đổi hình giữa
//      chừng (cùng loại lỗi mà chú thích "Hai nhánh vẽ CÙNG..." tại TheTrong đã ghi cho phần màu).
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { iconBangSoDo, specialtyIcon } from '../../components/SpecialtyIcons'
import { TheTrong } from '../trangThai'
import { VeChuyenKhoaDangTai } from '../VeChuyenKhoaDangTai'

const THU_MUC = path.dirname(fileURLToPath(import.meta.url))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
})

async function ve(el: React.ReactElement): Promise<SVGSVGElement> {
  await act(async () => {
    root.render(el)
  })
  const svg = container.querySelector('svg')
  expect(svg, 'phải render ra một <svg>').not.toBeNull()
  return svg as unknown as SVGSVGElement
}

/** viewBox của icon "chưa gắn chuyên khoa" — dấu nhận dạng rẻ nhất, không phải so cả chuỗi `d`. */
const VIEWBOX_BONG_DEN = '30.5 16.4 300 300'

describe('icon bảng chưa gắn chuyên khoa', () => {
  it('rơi vào bóng đèn với mọi kiểu "không có khoa"', async () => {
    // '' là giá trị THẬT của bảng mới tạo (LuoiMuc.tsx: `chuyenKhoa: ''`); undefined là bảng
    // cũ thiếu hẳn trường; 'khoa-khong-ton-tai' là bảng gắn một khoa đã bị gỡ khỏi danh mục.
    for (const khoa of ['', undefined, 'khoa-khong-ton-tai']) {
      const svg = await ve(iconBangSoDo(khoa, 'w-full h-full'))
      expect(svg.getAttribute('viewBox'), `khoa=${JSON.stringify(khoa)}`).toBe(VIEWBOX_BONG_DEN)
    }
  })

  it('bảng CÓ khoa vẫn dùng đúng icon chuyên khoa', async () => {
    const svg = await ve(iconBangSoDo('cardiology', 'w-full h-full'))
    expect(svg.getAttribute('viewBox')).not.toBe(VIEWBOX_BONG_DEN)
  })

  it('specialtyIcon() KHÔNG đổi: bài viết chuyên khoa lạ vẫn là tờ giấy 24×24', async () => {
    // Đây là phép canh "đừng sửa nhầm màn khác": Thư viện (App.tsx) gọi specialtyIcon() cho bài
    // viết ghi tên chuyên khoa ngoài danh mục, và tờ giấy mới là hình đúng ở đó.
    const svg = await ve(specialtyIcon(undefined, 'w-5 h-5'))
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('giữ đủ hợp đồng mà lớp line-drawing dựa vào', async () => {
    const svg = await ve(iconBangSoDo('', 'w-full h-full'))

    // fill ở ROOT, khác 'none' — VeChuyenKhoaDangTai đọc đúng chỗ này để chọn công thức bề dày nét.
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.getAttribute('stroke')).toBe('none')
    // Kích thước do NƠI GỌI cấp bằng class. width/height cứng (bản gốc có 352/341) khoá cứng cỡ và
    // còn chỏi với viewBox.
    expect(svg.getAttribute('width')).toBeNull()
    expect(svg.getAttribute('height')).toBeNull()

    const paths = [...svg.querySelectorAll('path')]
    expect(paths.length, 'nhiều <path> — không gộp thành một `d` khổng lồ').toBeGreaterThan(1)
    for (const p of paths) {
      expect(p.getAttribute('fill'), 'path con không được mang fill riêng (bản gốc ghi #000000)').toBeNull()
    }
    // Mỗi lệnh `M` = một nét bút. Ít nét thì hoạt ảnh đọc thành "một vệt bò", đúng chế độ hỏng mà
    // bốn vòng phản hồi trước đã gặp (xem đầu VeChuyenKhoaDangTai.tsx).
    const soNet = paths.reduce((tong, p) => tong + ((p.getAttribute('d') ?? '').match(/M/g)?.length ?? 0), 0)
    expect(soNet, 'đủ nhiều nét bút để đọc ra "đang phác"').toBeGreaterThanOrEqual(10)
  })

  it('thẻ tĩnh và lớp vẽ động ra CÙNG một hình', async () => {
    const tinh = await ve(createElement(TheTrong, { khoa: '', id: 'bang-1', mauHue: 300 }))
    const viewBoxTinh = tinh.getAttribute('viewBox')

    const dong = await ve(createElement(VeChuyenKhoaDangTai, { khoa: '', id: 'bang-1', mauHue: 300 }))
    expect(dong.getAttribute('viewBox'), 'lệch là cú FLIP đổi hình giữa chừng').toBe(viewBoxTinh)
    expect(viewBoxTinh).toBe(VIEWBOX_BONG_DEN)
  })
})

describe('viền hai nút tròn nổi của màn vẽ (Quay lại / Xuất PNG)', () => {
  // Chủ dự án 2026-09-04: viền magenta --c-accent-2 đọc thành "viền đỏ" trên một nút chrome, tức
  // thành màu cảnh báo — đúng thứ "Untouchable Signal Rule" (DESIGN.md) giữ riêng cho tín hiệu nguy
  // hiểm. Ca kiểm này tồn tại vì đường hồi quy có thật: chính một lượt critique (2026-08-25) đã đặt
  // magenta vào đây với lý do "cho thuộc bộ nhận diện Mindmap" — lượt sau rất dễ làm lại y thế.
  const NGUON = readFileSync(path.resolve(THU_MUC, '../BoardGallery.tsx'), 'utf8')

  // NEO THEO TỪNG NÚT, không đếm mọi dòng `border:` trong file: bản đầu của ca kiểm này khẳng định
  // "đúng hai khai báo border" và đỏ ngay hôm sau khi một phần tử KHÁC trong cùng file mọc thêm một
  // viền. Ca kiểm phải nói về hai nút nó quan tâm, không phải về số lượng viền của cả file.
  const NHAN_NUT = ['Quay lại danh sách bảng', 'Xuất PNG sơ đồ']

  /** Dòng `border:` nằm trong khối `style` của chính nút mang nhãn này. */
  function dongVienCuaNut(nhan: string): string {
    const mo = NGUON.indexOf(`aria-label="${nhan}"`)
    expect(mo, `không thấy nút "${nhan}" trong BoardGallery.tsx`).toBeGreaterThan(-1)
    // Cắt tới nhãn KẾ TIẾP để không bao giờ đọc lấn sang nút khác.
    const ke = NGUON.indexOf('aria-label="', mo + 1)
    const khoi = NGUON.slice(mo, ke === -1 ? undefined : ke)
    const dong = khoi.split(/\r?\n/).find((d) => /^\s*border:/.test(d))
    expect(dong, `nút "${nhan}" không còn khai báo border nào`).toBeDefined()
    return dong as string
  }

  it('dùng hairline trung tính --c-line, không dùng mực magenta', () => {
    for (const nhan of NHAN_NUT) {
      const d = dongVienCuaNut(nhan)
      expect(d, `viền nút "${nhan}"`).toContain('var(--c-line')
      expect(d, 'magenta quay lại là đỏ quay lại').not.toContain('accent-2')
    }
  })

  it('không phần tử nào trong màn vẽ dựng lại viền magenta', () => {
    // Rộng hơn hai nút trên: cả file. Đây mới là chỗ chặn một lượt critique sau đặt lại
    // --c-accent-2 lên một nút chrome mới — nhưng nó chỉ CẤM, không đếm, nên phần tử mới thêm vào
    // file không làm ca kiểm đỏ oan.
    for (const d of NGUON.split(/\r?\n/).filter((x) => /^\s*border:/.test(x))) {
      expect(d, 'viền magenta trên chrome đọc thành màu cảnh báo').not.toContain('accent-2')
    }
  })
})
