// Cưỡng chế CẦU NỐI TOKEN giữa màu thương hiệu app và bảng vẽ vendored (src/board/cau-noi-thuong-hieu.css).
//
// Vì sao đáng có: cầu nối này là CSS thuần, không có mã nào import nó ngoài một dòng `import` phụ.
// Nếu ai đó xoá dòng import, đổi tên file, hay một lượt nâng cấp vendor thêm token xanh MỚI, thì
// tsc vẫn sạch, mọi ca kiểm khác vẫn xanh — và bảng vẽ lặng lẽ quay về xanh AFFiNE, đúng lỗi P0 mà
// critique 2026-08-27 đã bắt. Không có gì khác trong repo canh chuyện đó.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CSS = join(__dirname, '../cau-noi-thuong-hieu.css')
const BOARD = join(__dirname, '../EdgelessBoard.tsx')
const THEME = join(__dirname, '../../../.vendor-build/theme/style.css')

// Xanh AFFiNE, viết ở đúng hai dạng mà theme vendor dùng.
const XANH_VENDOR = ['#1e96eb', 'rgba(30,150,235,1)']

// Bốn token PHẢI được nối sang --c-accent-2: là toàn bộ token mang đúng xanh vendor mà bản dựng
// thật còn dùng (đo 2026-08-28 trên dist/: primary-color 70 lượt, text-emphasis-color 8, brand-color 7, blue 3).
const PHAI_NOI = ['--drt-primary-color', '--drt-brand-color', '--drt-blue', '--drt-text-emphasis-color']

// 13 token xanh còn lại: có trong theme nhưng 0 lượt dùng trong dist/ (gói chưa bật). GHIM để một
// lượt nâng cấp vendor thêm/bớt token xanh sẽ làm ca này đỏ và buộc người sửa quyết định lại, thay
// vì âm thầm để lọt một màu nhấn xanh mới lên bảng vẽ.
const XANH_CHUA_TOI_DIST = [
  '--drt-blue-600',
  '--drt-v2-button-primary',
  '--drt-v2-edgeless-frame-border-active',
  '--drt-v2-edgeless-group-border-active',
  '--drt-v2-edgeless-group-border-hover',
  '--drt-v2-icon-activated',
  '--drt-v2-input-border-active',
  '--drt-v2-loading-foreground',
  '--drt-v2-radio-active-chekced',
  '--drt-v2-tab-divider-indicator',
  '--drt-v2-table-indicator-activated',
  '--drt-v2-text-emphasis',
  '--drt-v2-toggle-background',
]

function tokenXanhTrongTheme(): string[] {
  const nguon = readFileSync(THEME, 'utf8')
  const ten = new Set<string>()
  for (const m of nguon.matchAll(/(--drt-[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
    const giaTri = m[2].trim().toLowerCase().replace(/\s+/g, '')
    if (XANH_VENDOR.includes(giaTri)) ten.add(m[1])
  }
  return [...ten].sort()
}

describe('cầu nối token thương hiệu → bảng vẽ', () => {
  it('bốn token xanh đang tới dist/ đều được nối sang --c-accent-2', () => {
    const css = readFileSync(CSS, 'utf8')
    for (const token of PHAI_NOI) {
      expect(css, `${token} không được nối sang var(--c-accent-2)`).toContain(
        `${token}: var(--c-accent-2)`,
      )
    }
  })

  it('nền mờ 4% dựng lại từ --c-accent-2-rgb, không còn rgba xanh cứng', () => {
    const css = readFileSync(CSS, 'utf8')
    expect(css).toContain('--drt-primary-color-04: rgba(var(--c-accent-2-rgb)')
    expect(css).not.toContain('30, 150, 235')
  })

  it('giấy khối ghi chú nối sang --c-note và CHỈ ở bản sáng', () => {
    const css = readFileSync(CSS, 'utf8')
    // Luật duy nhất chứa token giấy phải là luật loại trừ bản tối — xem lý do dài trong chính file CSS.
    const luat = css.split('}').find((khoi) => khoi.includes('--drt-v2-edgeless-note-white'))
    expect(luat, 'không tìm thấy luật nối giấy khối ghi chú').toBeDefined()
    expect(luat).toContain("--drt-v2-edgeless-note-white: var(--c-note)")
    expect(luat, 'luật giấy phải loại trừ bản tối — mực gần trắng trên giấy sáng').toContain(
      ":not([data-theme='dark'])",
    )
  })

  it('EdgelessBoard.tsx import cầu nối SAU stylesheet theme vendor', () => {
    const nguon = readFileSync(BOARD, 'utf8')
    // Khớp CÂU LỆNH import ở đầu dòng, không phải chỉ tên file: bản đầu của ca này dùng indexOf
    // trên tên file và ĐÃ để lọt một lượt gỡ thật — comment dòng import lại vẫn đủ cho nó xanh
    // (bằng chứng đỏ chạy thật luác soạn ca này, 2026-08-28).
    const iTheme = nguon.search(/^import '\.\.\/\.\.\/\.vendor-build\/theme\/style\.css'/m)
    const iCauNoi = nguon.search(/^import '\.\/cau-noi-thuong-hieu\.css'/m)
    expect(iTheme, 'không tìm thấy import theme vendor').toBeGreaterThan(-1)
    expect(iCauNoi, 'không tìm thấy import cầu nối — bảng vẽ sẽ quay lại xanh AFFiNE').toBeGreaterThan(-1)
    expect(iTheme).toBeLessThan(iCauNoi)
  })

  it('tập token mang xanh vendor trong theme không đổi so với lượt đo 2026-08-28', () => {
    expect(tokenXanhTrongTheme()).toEqual([...PHAI_NOI, ...XANH_CHUA_TOI_DIST].sort())
  })
})
