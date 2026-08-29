// Canh THỨ TỰ của `viewExtensions` (src/board/extensions.ts).
//
// `affine/all/src/extensions/view.ts` ghi thẳng trong khối widget: *"order will affect the z-index
// of the widget"* — và `extensions.ts` của dự án chép lại luật đó thành một câu bình luận
// ("Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn"). Trước ca kiểm này, câu đó
// KHÔNG có gì canh: `dang-ky-custom-element.spec.ts` chỉ bắt được việc BỚT extension (thẻ Lit không
// còn đăng ký), còn ĐỔI CHỖ hai widget thì mọi ca đều xanh — trong khi hệ quả thật là một widget
// bị vẽ đè lên widget khác, thứ chỉ mắt người nhìn màn hình mới thấy. Đây là khoản nợ ghi ở
// HANDOFF.md mục 6 ("bằng chứng đỏ của hai ca board không bắt được đổi thứ tự widget").
//
// Cách canh: mảng của dự án là bản CẮT GỌN của thượng nguồn (D13 — bỏ 21 mục), nên phép kiểm đúng
// KHÔNG phải "bằng nhau" mà là **dãy con giữ nguyên thứ tự** (subsequence). Bỏ bớt mục vẫn hợp lệ;
// đổi chỗ hai mục thì không.
//
// Đọc thẳng MÃ NGUỒN của cả hai file thay vì import mảng thật: đối tượng extension không mang tên
// lớp ổn định sau bước dựng vendor, và ca này cần so ĐÚNG THỨ TỰ VIẾT — thứ chỉ có trong văn bản.
// Cùng kỹ thuật với các ca duyệt cây ở `src/__tests__/vendor-doi-ten.spec.ts`.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const thuMuc = path.dirname(fileURLToPath(import.meta.url))
const DUAN = path.resolve(thuMuc, '../extensions.ts')
const THUONG_NGUON = path.resolve(
  thuMuc,
  '../../vendor/blocksuite/affine/all/src/extensions/view.ts',
)

/**
 * Lấy danh sách định danh trong thân một mảng, theo đúng thứ tự viết; bỏ bình luận và dòng trống.
 *
 * Chuẩn hoá CRLF về LF trước khi tìm: cây vendored trên máy Windows nằm trên đĩa với xuống dòng
 * CRLF (git `core.autocrlf`), nên mọi mốc neo viết bằng ký tự xuống dòng LF sẽ trượt — cùng bẫy mà
 * `chuanHoa()` của `scripts/kiem-vendor.mjs` đã phải vá.
 */
function docDanhSach(nguonGoc: string, moDau: string): string[] {
  const nguon = nguonGoc.replace(/\r\n/g, '\n')
  const i = nguon.indexOf(moDau)
  if (i < 0) throw new Error(`không thấy "${moDau}" — file đã đổi hình dạng, sửa ca kiểm này theo`)
  const than = nguon.slice(i + moDau.length)
  const ket = than.indexOf(']')
  if (ket < 0) throw new Error(`không thấy dấu đóng mảng sau "${moDau}"`)
  return than
    .slice(0, ket)
    .split('\n')
    .map((d) => d.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
    .filter((d) => /^[A-Za-z_$][\w$]*$/.test(d))
}

/** `con` có phải dãy con (giữ thứ tự) của `cha` không — trả về mục đầu tiên phá thứ tự, hoặc null. */
function mucPhaThuTu(con: string[], cha: string[]): string | null {
  let j = 0
  for (const muc of con) {
    const viTri = cha.indexOf(muc, j)
    if (viTri < 0) return muc
    j = viTri + 1
  }
  return null
}

describe('thứ tự viewExtensions bám đúng thứ tự thượng nguồn (z-index widget)', () => {
  const cuaDuAn = docDanhSach(readFileSync(DUAN, 'utf8'), 'export const viewExtensions = [')
  const cuaThuongNguon = docDanhSach(
    readFileSync(THUONG_NGUON, 'utf8'),
    'export function getInternalViewExtensions() {\n  return [',
  )

  it('đọc được cả hai danh sách — đối chứng cho ba ca dưới', () => {
    // Không ghim con số chính xác: mảng dự án còn thay đổi theo từng chặng bật thêm extension.
    // Ghim NGƯỠNG DƯỚI để một phép đọc hỏng (regex trượt, file đổi hình dạng) không âm thầm biến
    // ba ca dưới thành xanh-vì-rỗng.
    expect(cuaDuAn.length).toBeGreaterThan(30)
    expect(cuaThuongNguon.length).toBeGreaterThan(50)
    expect(cuaThuongNguon.length).toBeGreaterThan(cuaDuAn.length)
  })

  it('mọi extension của dự án đều có thật ở thượng nguồn', () => {
    expect(cuaDuAn.filter((m) => !cuaThuongNguon.includes(m))).toEqual([])
  })

  it('thứ tự dự án là dãy con giữ nguyên thứ tự của thượng nguồn', () => {
    expect(mucPhaThuTu(cuaDuAn, cuaThuongNguon)).toBeNull()
  })

  it('ĐỐI CHỨNG: đổi chỗ đúng hai widget thì phép kiểm phải ĐỎ', () => {
    // Bằng chứng rằng ba ca trên không xanh vì phép kiểm rỗng. Đảo hai widget cạnh nhau — đúng
    // dạng sai sót mà ca này sinh ra để bắt (thứ tự quyết định z-index).
    const daoChoTuNo = [...cuaDuAn]
    const i = daoChoTuNo.indexOf('EdgelessSelectedRectViewExtension')
    const k = daoChoTuNo.indexOf('EdgelessDraggingAreaViewExtension')
    expect(i).toBeGreaterThan(-1)
    expect(k).toBeGreaterThan(-1)
    ;[daoChoTuNo[i], daoChoTuNo[k]] = [daoChoTuNo[k], daoChoTuNo[i]]

    expect(mucPhaThuTu(daoChoTuNo, cuaThuongNguon)).toBe('EdgelessSelectedRectViewExtension')
  })
})
