// Cưỡng chế BẤT BIẾN "bảng đã đỗ thì không được vẽ ra ngoài".
//
// LỖI GỐC (đo thật trên trình duyệt 2026-09-01): mở một bảng ở tab Mindmap rồi bấm sang tab khác
// (Trang chủ). BoardGallery cố ý KHÔNG tháo bảng — nó chỉ gắn `invisible pointer-events-none` +
// `inert` lên bọc `[data-testid="boc-bang"]` để lần quay lại tức thì. Nhưng `visibility` tuy THỪA KẾ
// được thì cũng GHI ĐÈ được, mà `gfx-viewport` của cây vendored đặt `visibility: visible` lên từng
// khối DOM đang trong khung nhìn — bằng CẢ luật `.block-active`/`.block-survival` LẪN style inline.
// Kết quả: hai khung `affine:frame` của mẫu "Lưu đồ" (nền vàng) vẽ đè lên màn Trang chủ, che mất
// thẻ "Truy cập nhanh". Đã dựng lại được từ bảng trống + một mẫu Động não.
//
// CÁCH VÁ: một luật `!important` trong cau-noi-thuong-hieu.css. Khai báo `!important` của author
// thắng style inline THƯỜNG, nên nó bịt cả hai đường mà không đụng `src/vendor/**` (luật D11) và
// không đổi hình học (visibility không ảnh hưởng layout, nên mọi phép đo viewport giữ nguyên).
//
// Vì sao đáng có bài kiểm này: cả ba mảnh (class đỗ ở BoardGallery, luật CSS, và luật vendored bị
// đối kháng) nằm ở ba tệp khác nhau, không mảnh nào import mảnh nào. Đổi một mảnh thì tsc vẫn sạch,
// mọi ca kiểm khác vẫn xanh, và rò rỉ lặng lẽ quay lại — đúng kiểu hỏng chỉ thấy bằng mắt.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const GALLERY = join(__dirname, '../BoardGallery.tsx')
const CSS = join(__dirname, '../cau-noi-thuong-hieu.css')
const VIEWPORT = join(__dirname, '../../vendor/blocksuite/framework/std/src/gfx/viewport-element.ts')

describe('bảng đã đỗ không được vẽ ra ngoài', () => {
  it('BoardGallery vẫn đỗ bảng bằng class `invisible` trên [data-testid="boc-bang"]', () => {
    const nguon = readFileSync(GALLERY, 'utf8')
    // Luật CSS bên dưới bám vào đúng hai móc này. Đổi tên móc mà quên sửa CSS = rò rỉ trở lại.
    expect(nguon).toContain('data-testid="boc-bang"')
    expect(nguon).toMatch(/invisible pointer-events-none/)
  })

  it('cau-noi-thuong-hieu.css có luật chặn hậu duệ tự bật lại visibility', () => {
    const css = readFileSync(CSS, 'utf8')
    const luat = css
      .split('}')
      .find((khoi) => khoi.includes('boc-bang') && khoi.includes('.invisible'))
    expect(luat, 'không thấy luật nhắm bọc bảng đang đỗ trong cau-noi-thuong-hieu.css').toBeTruthy()
    // Phải là `!important`: đối thủ là style INLINE, mà inline thường thắng mọi luật không-important.
    expect(luat).toMatch(/visibility:\s*hidden\s*!important/)
    // Bịt luôn `pointer-events: auto` mà .block-active cũng đặt — `inert` là cơ chế RIÊNG, đừng để
    // bất biến này phụ thuộc vào việc ai đó giữ `inert` mãi mãi.
    expect(luat).toMatch(/pointer-events:\s*none\s*!important/)
    // Nhắm HẬU DUỆ, không phải chính bọc: bọc đã `visibility: hidden` sẵn, thứ cần bịt là con.
    expect(luat).toMatch(/\*/)
  })

  // Ghim ĐỐI THỦ. Nếu thượng nguồn bỏ hai luật này thì bản vá thành CSS chết — ca đỏ buộc người sửa
  // quyết định lại thay vì để nó nằm đó mãi.
  it('cây vendored vẫn là thứ cần đối kháng: gfx-viewport bật lại visibility cho khối trong khung nhìn', () => {
    const nguon = readFileSync(VIEWPORT, 'utf8')
    expect(nguon).toMatch(/\.block-active\s*\{[^}]*visibility:\s*visible/)
    expect(nguon).toMatch(/\.block-survival\s*\{[^}]*visibility:\s*visible/)
  })
})
