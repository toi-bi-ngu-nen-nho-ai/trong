// @vitest-environment happy-dom
//
// Cưỡng chế PHÉP PHÂN TẦNG của src/board/lop-css-vendor.ts và thứ tự lớp khai ở src/index.css.
//
// Vì sao đáng có: bản đầu của cơ chế này bọc TOÀN BỘ CSS vendor vào một lớp DUY NHẤT, khai ở dòng
// đầu index.css nên ưu tiên THẤP NHẤT — thấp hơn cả `@layer base` của Tailwind. Mà preflight của
// Tailwind v4 đặt `*{margin:0;padding:0;border:0}` trong đúng lớp `base` đó. Hệ quả đo thật
// (2026-08-31, người dùng báo trên PC/iPad): mọi `padding` của khối BlockSuite bị xoá sạch — Khối mã
// mất `padding: 32px 20px`, Trích dẫn mất `padding-left`, nhìn "lệch hoàn toàn". Đo trên trình duyệt
// thật: gỡ đúng lớp bọc ra là `padding` computed nhảy từ `0px` về `32px 20px`.
//
// Phép vá: TÁCH LÀM HAI LỚP theo mức nguy hiểm của bộ chọn, chứ không hạ đồng loạt.
//   - `drt-vendor-tran`  (thấp nhất): stylesheet có bộ chọn PHẦN TỬ TRẦN (`input`, `svg`, `span`…)
//     — loại rò ra toàn app, đúng lỗi 2026-08-26. Giữ nguyên hành vi cũ.
//   - `drt-vendor`       (giữa `base` và `components`): mọi stylesheet còn lại — bộ chọn neo vào
//     class `.drt-*` hoặc custom element `drt-*`/`rich-text`, KHÔNG thể với tới DOM của app. Nằm
//     trên `base` nên thắng preflight; nằm dưới `components`/`utilities` nên vẫn thua utility của app.
//
// Đo trên bảng vẽ thật lúc soạn ca này: 124/132 stylesheet vào lớp cao, 8 vào lớp thấp (8 sheet đó
// chứa `input`, `input:focus`, `input::placeholder`, `span`, `svg` trần).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LOP_CAO, LOP_THAP, chonLopChoCss } from '../lop-css-vendor'

const INDEX_CSS = join(__dirname, '../../index.css')

describe('thứ tự lớp thác đổ khai ở index.css', () => {
  // Bỏ chú thích trước khi đo: phần đầu index.css GIẢI THÍCH cơ chế này bằng chính cú pháp
  // `@layer a;` / `@import 'tailwindcss'`, nên đo trên văn bản thô là bắt trúng lời văn chứ không
  // phải câu lệnh thật.
  const css = readFileSync(INDEX_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

  it('khai cả hai lớp TRƯỚC @import tailwindcss', () => {
    const viKhai = css.indexOf('@layer')
    const viImportTw = css.indexOf("@import 'tailwindcss'")
    expect(viKhai).toBeGreaterThanOrEqual(0)
    expect(viImportTw).toBeGreaterThan(viKhai)
  })

  // Thứ tự ưu tiên do THỨ TỰ KHAI ĐẦU TIÊN quyết định. Câu lệnh phải xếp đúng:
  // drt-vendor-tran < theme < base < drt-vendor < (components, utilities do tailwind khai sau).
  it('xếp drt-vendor-tran thấp nhất và drt-vendor NGAY SAU base', () => {
    const khai = css.match(/@layer\s+([^;{]+);/)
    expect(khai, 'phải có một câu lệnh @layer ...; ở đầu file').not.toBeNull()
    const ten = khai![1].split(',').map((t) => t.trim())
    expect(ten).toEqual([LOP_THAP, 'theme', 'base', LOP_CAO])
  })

  // HỒI QUY THẬT, bắt được ngay trong chính chặng tách lớp (2026-08-31): đẩy `drt-vendor` lên trên
  // `base` khiến bản vá `.truncate { align-self: revert }` — vốn nằm ở `@layer base` và thắng khi
  // `drt-vendor` còn là lớp thấp nhất — thua lại luật `.truncate { align-self: stretch }` của
  // BlockSuite. Lỗi 2026-08-28 tái phát nguyên vẹn: mở bảng vẽ rồi thoát ra là nhãn "Trang chủ" ở
  // Trang chủ nhảy từ 16px lên 35px (đo thật trên trình duyệt).
  //
  // `.truncate` là chỗ DUY NHẤT app và cây vendored trùng tên class (quét 797 luật lớp `drt-vendor`
  // đối chiếu mọi phần tử light-DOM của app, 2026-08-31), nên đây là bản vá duy nhất thuộc loại
  // "app phải thắng vendor" — và nó BẮT BUỘC nằm ở lớp cao hơn `drt-vendor`. `components` là đúng
  // chỗ: trên `drt-vendor`, dưới `utilities`.
  //
  // Hai bản vá `@layer base` còn lại KHÔNG chuyển và không được ca này canh, vì chúng nhắm vào luật
  // vendor có bộ chọn phần tử TRẦN (`input{…}`) — loại luôn bị xếp xuống `drt-vendor-tran`, dưới
  // `base`, nên vẫn thắng.
  it('bản vá .truncate nằm ở lớp CAO HƠN drt-vendor, không phải @layer base', () => {
    const khoi = css.match(/@layer\s+([\w-]+)\s*\{[^{}]*\.truncate\s*\{[^{}]*align-self:\s*revert/)
    expect(khoi, 'không thấy bản vá `.truncate { align-self: revert }` trong index.css').not.toBeNull()
    expect(khoi![1]).toBe('components')
  })
})

describe('chonLopChoCss — phân loại theo mức nguy hiểm của bộ chọn', () => {
  it('cho vào lớp CAO khi mọi bộ chọn đều neo vào class hoặc custom element', () => {
    expect(chonLopChoCss('drt-code { display: block } .drt-code-block-container { padding: 32px 20px }')).toBe(LOP_CAO)
    expect(chonLopChoCss('.drt-code-block-container rich-text { overflow: auto }')).toBe(LOP_CAO)
    expect(chonLopChoCss('.drt-code-block-container div:has(> v-line) { display: grid }')).toBe(LOP_CAO)
  })

  it('cho vào lớp THẤP khi có bộ chọn phần tử HTML trần — loại rò ra toàn app', () => {
    expect(chonLopChoCss('input { padding: 0; border: none }')).toBe(LOP_THAP)
    expect(chonLopChoCss('.popover-container { gap: 8px } input:focus { outline: none }')).toBe(LOP_THAP)
    expect(chonLopChoCss('input::placeholder { color: grey }')).toBe(LOP_THAP)
    expect(chonLopChoCss('svg { width: 20px }')).toBe(LOP_THAP)
    expect(chonLopChoCss('span { line-height: 1 }')).toBe(LOP_THAP)
    expect(chonLopChoCss('* { box-sizing: border-box }')).toBe(LOP_THAP)
    expect(chonLopChoCss('html, body { margin: 0 }')).toBe(LOP_THAP)
  })

  // Ba nguồn dương tính giả đã đo được trên bảng vẽ thật — nếu ba ca này đỏ thì 124 stylesheet
  // lành lặn sẽ bị đẩy xuống lớp thấp và lỗi mất padding quay lại y nguyên.
  it(':host không với tới DOM của app nên KHÔNG tính là nguy hiểm', () => {
    expect(chonLopChoCss(':host { box-sizing: border-box } .popover-container { padding: 0 6px }')).toBe(LOP_CAO)
  })

  it('bộ chọn khung hình của @keyframes (from/to/0%/100%) KHÔNG phải bộ chọn phần tử', () => {
    expect(chonLopChoCss('@keyframes fade { from { opacity: 0 } to { opacity: 1 } }')).toBe(LOP_CAO)
    expect(chonLopChoCss('@keyframes x { 0% { opacity: 0 } 100% { opacity: 1 } }')).toBe(LOP_CAO)
  })

  it('bộ chọn lồng bắt đầu bằng & đã được cha neo sẵn', () => {
    expect(chonLopChoCss('.drt-menu { color: red; & svg { width: 20px } }')).toBe(LOP_CAO)
  })

  it('bỏ qua chú thích và at-rule bọc ngoài', () => {
    expect(chonLopChoCss('/* input { padding: 0 } */ .drt-x { padding: 4px }')).toBe(LOP_CAO)
    expect(chonLopChoCss('@media (max-width: 600px) { .drt-x { padding: 4px } }')).toBe(LOP_CAO)
    expect(chonLopChoCss('@media (max-width: 600px) { input { padding: 0 } }')).toBe(LOP_THAP)
  })
})

describe('batLopCssVendor — bọc thẻ <style> Lit tiêm vào <head>', () => {
  let batLopCssVendor: () => void

  beforeEach(async () => {
    document.head.querySelectorAll('style').forEach((s) => s.remove())
    // Module giữ cờ `daBat` ở phạm vi module — nạp lại để mỗi ca có một bộ theo dõi sạch.
    vi.resetModules()
    const m = await import('../lop-css-vendor')
    batLopCssVendor = m.batLopCssVendor
  })

  afterEach(() => {
    document.head.querySelectorAll('style').forEach((s) => s.remove())
  })

  it('bọc thẻ có sẵn vào đúng lớp theo mức nguy hiểm', () => {
    const lanh = document.createElement('style')
    lanh.textContent = '.drt-code-block-container { padding: 32px 20px }'
    const ro = document.createElement('style')
    ro.textContent = 'input { padding: 0 }'
    document.head.append(lanh, ro)

    batLopCssVendor()

    expect(lanh.textContent!.startsWith(`@layer ${LOP_CAO}{`)).toBe(true)
    expect(ro.textContent!.startsWith(`@layer ${LOP_THAP}{`)).toBe(true)
  })

  it('KHÔNG đụng thẻ <style> có thuộc tính — đó là CSS của chính app do Vite gắn', () => {
    const cuaApp = document.createElement('style')
    cuaApp.setAttribute('data-vite-dev-id', '/src/index.css')
    cuaApp.textContent = 'input { padding: 0 }'
    document.head.append(cuaApp)

    batLopCssVendor()

    expect(cuaApp.textContent).toBe('input { padding: 0 }')
  })
})
