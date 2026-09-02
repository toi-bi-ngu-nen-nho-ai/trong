// Chỉ chào những HỌ PHÔNG dựng được thật trong ô "Aa" của thanh công cụ chữ.
//
// GỐC RỄ: `affine/widgets/edgeless-toolbar/src/panel/font-family-panel.ts` render bằng
// `repeat(FontFamilyList, …)`. `FontFamilyList` là hằng suy ra từ enum `FontFamily` của model — nó
// nói "BlockSuite BIẾT bảy tên họ này", KHÔNG nói "trình duyệt dựng được bảy họ này". Hai chuyện
// khác nhau, và panel đang lẫn chúng làm một.
//
// Dự án tự chứa ĐÚNG họ Inter (chủ dự án quyết 2026-09-02 — xem src/board/phong-chu-bang.ts), nên
// sáu họ còn lại là mục CHẾT: bấm vào thì `fontFamily` của model đổi thật, nhưng chữ không đổi hình
// dạng (không có face để dựng), và ô kiểu chữ ngay bên cạnh tụt về RỖNG vì họ mới không có face nào
// — tức bấm nhầm một mục ở đây làm mất luôn khả năng chỉnh đậm/nghiêng vừa được vá.
//
// Đo thật trên trình duyệt sau khi đăng ký FontConfig: 7 họ liệt kê, đúng 1 (Inter) có 6 face, sáu
// họ còn lại đều 0.
//
// PHÉP VÁ không phải "ẩn cứng sáu cái tên" — đó là chép một quyết định sang chỗ thứ hai, và lần sau
// thêm họ mới là quên. Phát biểu ĐÚNG LUẬT: chỉ chào họ nào `getFontFacesByFontFamily()` thật sự
// trả về face. Nhờ vậy nó tự đúng về sau — thêm một họ vào `phongChuBang` là nó hiện ra ngay, không
// phải sửa file này.
//
// DỰ PHÒNG không-bao-giờ-rỗng: nếu KHÔNG họ nào có face — xảy ra khi nền tảng không dựng được
// `FontFace`, lúc đó `phongChuBang` cố ý khai mảng rỗng để khỏi thổi bay lượt mount — phép lọc sẽ
// cho danh sách rỗng và người dùng gặp một menu TRẮNG, tệ hơn hiện trạng. Ở đúng ca đó, giữ nguyên
// danh sách đầy đủ (bằng hành vi trước lượt vá này).
//
// VÌ SAO KHÔNG SỬA src/vendor/blocksuite/ (luật D11): cây đó phải khớp NGUYÊN VĂN thượng nguồn. Vá
// ở CÂY ĐÃ BIÊN DỊCH (.vendor-build/), cùng cơ chế scripts/gioi-han-panel-mau.mjs và
// scripts/dich-chuoi-vendor.mjs đã dùng.
//
// VÌ SAO KHÔNG vá bằng CSS phía app: `EdgelessFontFamilyPanel` là `LitElement` thường, có shadow
// root riêng, nên stylesheet của app không với tới các nút bên trong. Tiêm stylesheet vào shadow
// root lúc chạy thì phải theo dõi từng lần panel được dựng — nhiều máy móc hơn hẳn một phép thay
// chuỗi có mốc neo, mà vẫn chỉ giấu đi chứ không sửa nguồn danh sách.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// `TextUtils` đã được chính file đó import sẵn (dòng đầu), nên biểu thức thay vào dùng lại được
// ngay, không phải thêm import — bớt được một mốc neo nữa phải canh.
const CU = 'return repeat(FontFamilyList, item => item[0], ([font, name]) => {'
const MOI =
  'const hoCoFace = FontFamilyList.filter(([f]) => TextUtils.getFontFacesByFontFamily(f).length > 0); ' +
  'return repeat(hoCoFace.length > 0 ? hoCoFace : FontFamilyList, item => item[0], ([font, name]) => {'

function demLuot(s, con) {
  return s.split(con).length - 1
}

export function vaLocHoPhong(js, tenFile = 'khong-ten.js') {
  const luot = demLuot(js, CU)
  if (luot !== 1) {
    throw new Error(
      `loc-ho-phong-co-that: "${CU}" không xuất hiện ĐÚNG MỘT LẦN trong ${tenFile} (đo được ` +
        `${luot}). Thượng nguồn có thể đã đổi cách render panel phông — mở file ra đọc trước khi ` +
        'sửa, đừng nới mốc neo cho xanh.',
    )
  }

  return { js: js.replace(CU, MOI), daVa: true }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────────────────────
const dieuHanhTrucTiep = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (dieuHanhTrucTiep) {
  const GOC = path.resolve(import.meta.dirname, '..')
  const TEP = path.join(
    GOC,
    '.vendor-build/affine/widgets/edgeless-toolbar/src/panel/font-family-panel.js',
  )
  const rel = path.relative(GOC, TEP).split(path.sep).join('/')
  const goc = readFileSync(TEP, 'utf8')
  let ketQua
  try {
    ketQua = vaLocHoPhong(goc, rel)
  } catch (err) {
    console.error(`loc-ho-phong-co-that: DỪNG — ${err.message}`)
    process.exit(1)
  }
  writeFileSync(TEP, ketQua.js)
  console.log(`loc-ho-phong-co-that: đã lọc danh sách họ phông theo face có thật trong ${rel}`)
  process.exit(0)
}
