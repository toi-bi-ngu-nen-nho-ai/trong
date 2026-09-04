// ─── Phông cho CHỮ TRÊN BẢNG VẼ ─────────────────────────────────────────────────────────────────
//
// LỖI GỐC (người dùng báo 2026-09-02): gõ chữ vào một hình rồi bấm ô kiểu chữ ("Thường") thì mở ra
// một hộp RỖNG — không có Đậm/Nghiêng nào để chọn. Ô phông ("Aa") cũng rỗng y hệt.
//
// Chuỗi nhân quả (truy ngược từ chỗ hiển thị về nguồn dữ liệu):
//   1. `gfx/text/src/toolbar/actions.ts` dựng ô kiểu chữ từ
//      `TextUtils.getFontFacesByFontFamily(fontFamily)`.
//   2. Hàm đó (`blocks/surface/src/utils/font.ts`) chính là `[...document.fonts.keys()]` lọc theo
//      tên họ — tức nó đọc THẲNG danh sách FontFace trình duyệt đang giữ, không có bảng tĩnh nào.
//   3. Chữ trên canvas mặc định mang `fontFamily = FontFamily.Inter`, mà enum đó KHÔNG phải "Inter"
//      trần: `model/src/consts/text.ts` khai `Inter = 'blocksuite:surface:Inter'`.
//   4. App chưa bao giờ đăng ký `FontConfigExtension`, nên `FontLoaderService` không nạp FontFace
//      nào mang tên họ có tiền tố đó → phép lọc trả mảng rỗng → panel rỗng.
//
// `FoundationViewExtension` chỉ đăng ký `FontConfigExtension` KHI được truyền `options.fontConfig`
// (affine/foundation/src/view.ts). Ta gọi `viewManager.get('edgeless')` không kèm options, nên
// không ai truyền — cùng lớp lỗi với `che-do-co-dinh.ts`: một mẩu cấu hình mà vỏ app của AFFiNE tự
// lo, còn vỏ app của ta thì chưa.
//
// Đo thật trước khi vá: `document.fonts` có 77 face nhưng TOÀN của app (Plus Jakarta Sans, Space
// Grotesk, Source Serif 4, JetBrains Mono) — 0 face họ Inter. Tiêm tay 6 face mang đúng tên họ có
// tiền tố là dropdown hiện đủ sáu mục ngay (Light/Regular/Semibold × thường/nghiêng).
//
// ─── Vì sao KHÔNG dùng `AffineCanvasTextFonts` của thượng nguồn ─────────────────────────────────
// Mọi URL trong danh sách đó trỏ `https://cdn.affine.pro/fonts/…`. Đo được: host này KHÔNG với tới
// được từ máy dự án (`Failed to fetch`). Dùng nó thì `document.fonts.add()` vẫn chạy nên panel có
// vẻ đầy, nhưng `fontFace.load()` hỏng và chữ im lặng rơi về phông dự phòng — hỏng khó thấy hơn cả
// lỗi đang chữa.
//
// ─── Vì sao tự chứa, và vì sao ĐÚNG hai tệp này ─────────────────────────────────────────────────
// Chủ dự án quyết (2026-09-02) tự chứa trong `public/fonts/`: đây là sổ tay lâm sàng chạy ngoại
// tuyến, không nên phụ thuộc host thứ ba lúc chạy.
//
// Dùng bản Inter variable CHÍNH THỨC (rsms.me, giấy phép SIL OFL — cho phép nhúng lại tự do):
//   - variable ⇒ MỘT tệp phủ mọi độ đậm, nên 6 tổ hợp chỉ tốn 2 tệp (~740 kB) thay vì 6.
//   - đủ bộ ký tự ⇒ PHỦ DẤU TIẾNG VIỆT. Đã đo bằng `document.fonts.check()` trên trình duyệt thật:
//     14/14 ký tự có dấu và cả câu "Sốc nhiễm khuẩn — Đợt cấp COPD" đều dựng được, ở CẢ hai tệp.
//
// CẠM BẪY đã tránh — KHÔNG lấy tệp subset của Google Fonts: subset "vietnamese" ở đó CHỈ chứa các
// mã dấu tiếng Việt, KHÔNG có Latin cơ bản; Google ghép chúng lại bằng `unicode-range` trong CSS.
// Mà `FontConfig` chỉ nhận MỘT `url` cho mỗi (họ, độ đậm, kiểu) và KHÔNG có chỗ khai `unicode-range`
// (xem `shared/src/services/font-loader/config.ts`), nên lấy subset là chữ thường biến mất, chỉ còn
// dấu. Phải là tệp đủ bộ ký tự.
//
// PHẠM VI: chỉ họ Inter (chủ dự án quyết). Sáu họ còn lại trong ô "Aa" là danh sách TĨNH của
// `FontFamilyList` nên vẫn liệt kê ra; chọn chúng sẽ không đổi hình dạng chữ. Việc ẩn chúng nằm ở
// lớp hiển thị của panel (shadow DOM), là một thay đổi riêng — cố ý KHÔNG gộp vào đây.
import { FontFamily, FontStyle, FontWeight } from '@blocksuite/affine-model'
import { type FontConfig, FontConfigExtension } from '@blocksuite/affine-shared/services'

/** Một tệp variable phủ mọi độ đậm; nghiêng là tệp riêng (variable font không tự nghiêng được). */
const THUONG = '/fonts/InterVariable.woff2'
const NGHIENG = '/fonts/InterVariable-Italic.woff2'

/**
 * Ba độ đậm × hai kiểu = sáu mục, khớp đúng bộ mà `edgeless-font-weight-and-style-panel` hiển thị
 * (Light / Regular / Semibold, mỗi cái có bản nghiêng) — cũng đúng bộ thấy trong video AFFiNE.
 *
 * KHÔNG khai Medium(500)/Bold(700) dù tệp variable dựng được: panel chỉ đọc những face ĐÃ ĐĂNG KÝ,
 * nên thêm vào là thêm mục lạ so với thượng nguồn chứ không phải thêm khả năng.
 */
export const phongChuBang: FontConfig[] = [
  { font: FontFamily.Inter, weight: FontWeight.Light, style: FontStyle.Normal, url: THUONG },
  { font: FontFamily.Inter, weight: FontWeight.Regular, style: FontStyle.Normal, url: THUONG },
  { font: FontFamily.Inter, weight: FontWeight.SemiBold, style: FontStyle.Normal, url: THUONG },
  { font: FontFamily.Inter, weight: FontWeight.Light, style: FontStyle.Italic, url: NGHIENG },
  { font: FontFamily.Inter, weight: FontWeight.Regular, style: FontStyle.Italic, url: NGHIENG },
  { font: FontFamily.Inter, weight: FontWeight.SemiBold, style: FontStyle.Italic, url: NGHIENG },
]

/**
 * Nền tảng có dựng được `FontFace` không.
 *
 * PHẢI hỏi câu này trước khi khai cấu hình phông, vì `FontLoaderService.load()` gọi thẳng
 * `new FontFace(...)` trong `mounted()` — KHÔNG bọc try/catch. Mà `mounted()` chạy bên trong vòng
 * lặp `BlockStdScope.mount()`, nên một cú ném ở đây KHÔNG chỉ làm hỏng phông: nó thổi bay cả lượt
 * mount, tức BẢNG VẼ KHÔNG MỞ ĐƯỢC.
 *
 * Đo được thật (2026-09-02, lần đầu nối extension này vào): 3 ca của
 * `edgeless-board-mount.spec.ts` chuyển đỏ với `ReferenceError: FontFace is not defined` —
 * happy-dom không hiện thực `FontFace`. Đó là ca kiểm, nhưng cùng một đường đi áp dụng cho mọi
 * trình duyệt thiếu API này: đổi một ô chọn phông rỗng lấy một bảng vẽ trắng là lỗ hổng tệ hơn hẳn
 * thứ đang chữa.
 *
 * Phòng vệ đặt ở ĐÂY, phía app, chứ không phải vá cây vendored (luật D11) và cũng không phải nhét
 * một `FontFace` giả vào môi trường kiểm — bản giả sẽ che đúng cái bẫy này ở mọi lượt kiểm sau.
 */
const dungDuocFontFace = typeof globalThis.FontFace === 'function'

/**
 * Extension đăng ký danh sách trên. Nối vào mảng extension của bảng vẽ (xem `layExtensionsEdgeless`
 * trong ./EdgelessBoard.tsx) — `FontLoaderService` của thượng nguồn tự đọc nó ở `mounted()` rồi gọi
 * `document.fonts.add()` cho từng face.
 *
 * Nền tảng không dựng được `FontFace` thì đăng ký một mảng RỖNG: `mounted()` có nhánh thoát sớm
 * `if (!config || config.length === 0) return`, nên không face nào được dựng và không gì bị ném —
 * bảng vẽ mở bình thường, chỉ là ô chọn kiểu chữ trống, đúng hành vi trước lượt vá này.
 */
export const phongChuBangExtension = FontConfigExtension(dungDuocFontFace ? phongChuBang : [])
