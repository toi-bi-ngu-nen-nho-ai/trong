// D12-adjacent: giới hạn kích thước VÀ vị trí panel "Mẫu" (Template) theo không gian màn hình
// thật — vá lỗi panel tràn (đè lên thanh công cụ chính / mất nội dung phía trên viewport), người
// dùng báo kèm ảnh chụp (2026-09-01).
//
// GỐC RỄ (hai lớp, ĐÃ đo cả hai lượt sai — xem "LƯỢT VÁ THỨ NHẤT KHÔNG ĐỦ" bên dưới):
//   1. affine/gfx/template/src/toolbar/template-panel.ts khai `.edgeless-templates-panel { width:
//      467px; height: 568px; }` — kích thước CỐ ĐỊNH, không co giãn theo viewport.
//   2. affine/gfx/template/src/toolbar/template-tool-button.ts định vị panel bằng floating-ui:
//      `computePosition(nút, panel, { placement: 'top', middleware: [offset(20), arrow(...),
//      shift()] })` — CHỈ có `shift()`, KHÔNG có `size()` để TÍNH VỊ TRÍ dựa trên không gian còn
//      lại. `shift()` chỉ trượt phần tử trong biên, không co nhỏ nó — và đo thật xác nhận trục
//      dọc ('top' placement) không được `shift()` can thiệp khi không đủ chỗ, cứ để `top` âm.
//
// LƯỢT VÁ THỨ NHẤT KHÔNG ĐỦ (2026-09-01, giữ lại làm bài học): chỉ vá (1) — ép CSS
// `width/height: min(giá-trị-gốc, phần-co-giãn-theo-viewport)`. Đo lại trên trình duyệt thật sau
// vá: chiều NGANG hết tràn (đúng dự tính, vì `shift()` VẪN đọc lại kích thước panel MỚI khi tính
// trục ngang), nhưng chiều DỌC ('top') KHÔNG đổi — `top` đo được y hệt trước vá dù `height` đã co
// đúng theo CSS. Nguyên nhân: `computePosition` tính `top` cho placement 'top' bằng
// `referenceRect.top − floatingRect.height − offset`, và phép đo `floatingRect.height` của
// floating-ui không đồng bộ với thời điểm CSS `min()`/`calc(100dvh...)` phân giải xong trong lượt
// đo cụ thể đó — CSS co kích thước "sau lưng" phép tính vị trí, hai thứ lệch nhau. Bài học: một
// ràng buộc CSS thuần không đủ khi chính JS (floating-ui) mới là thứ QUYẾT ĐỊNH vị trí dựa trên
// kích thước nó tự đo — phải sửa NGAY TẠI phép đo đó, không phải áp một giới hạn CSS song song rồi
// hy vọng floating-ui tự nhận ra.
//
// PHÉP VÁ THẬT (hai phần, cả hai đều cần):
//   a) `vaKichThuocPanelMau` (giữ nguyên từ lượt trước) — CSS `min()` làm TRẦN AN TOÀN tuyệt đối,
//      không bao giờ để panel vượt quá 467×568px gốc lẫn viewport, bất kể floating-ui tính đúng
//      hay sai. Không hại gì khi giữ song song với (b) — `max-height`/`max-width` JS chỉ có thể
//      SIẾT chặt thêm, không bao giờ nới lỏng.
//   b) `vaViTriPanelMau` (MỚI) — thêm middleware `size()` chính thức của floating-ui vào
//      `computePosition(...)` trong template-tool-button.ts. Đây là công cụ floating-ui dành RIÊNG
//      cho "co nhỏ phần tử theo không gian còn lại" (khác `shift` — dịch chuyển trong biên — và
//      khác `flip` — đổi hẳn sang phía khác). `size()` chạy TRONG CÙNG lượt `computePosition`,
//      nên `availableHeight` nó tính ra LUÔN nhất quán với `top`/`x` được tính ngay sau đó — không
//      còn khoảng lệch thời điểm như CSS thuần. `apply()` của nó gán thẳng
//      `elements.floating.style.maxHeight` — ghi đè (siết chặt hơn) CSS `min()` ở (a) khi cần.
//
// VÌ SAO KHÔNG SỬA src/vendor/blocksuite/ (luật D11): cây đó phải khớp NGUYÊN VĂN thượng nguồn. Vá
// ở CÂY ĐÃ BIÊN DỊCH (.vendor-build/), cùng cơ chế scripts/dich-chuoi-vendor.mjs đã dùng cho D12.
//
// VÌ SAO DÙNG dvh/dvw KHÔNG PHẢI vh/vw Ở (a): DESIGN.md đã ghi nhận 100dvh "đo thiếu" trên iOS PWA
// fullscreen so với chiều cao thật — nhưng đó là vấn đề khi cần LẤP ĐẦY đúng khung nhìn (thiếu để
// lại khoảng hở nhìn thấy được). Ở đây dvh/dvw chỉ làm TRẦN GIỚI HẠN TRÊN (min(...)) — đo thiếu chỉ
// khiến panel nhỏ hơn một chút, không bao giờ gây tràn. An toàn theo đúng hướng ngược với rủi ro đã
// ghi nhận.
//
// Xuất khẩu hai hàm THUẦN để ca kiểm import trực tiếp (không đọc/ghi đĩa). Khối CLI ở cuối file
// chỉ chạy khi được gọi TRỰC TIẾP — cùng khuôn với scripts/tach-dinh-danh-loai-tep.mjs.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CU_WIDTH = 'width: 467px;'
const MOI_WIDTH = 'width: min(467px, calc(100dvw - 24px));'
const CU_HEIGHT = 'height: 568px;'
const MOI_HEIGHT = 'height: min(568px, calc(100dvh - 160px));'

const CU_IMPORT_FLOATING_UI = "import { arrow, autoUpdate, computePosition, offset, shift, } from '@floating-ui/dom';"
const MOI_IMPORT_FLOATING_UI = "import { arrow, autoUpdate, computePosition, offset, shift, size, } from '@floating-ui/dom';"
const CU_MIDDLEWARE = 'middleware: [offset(20), arrow({ element: arrowEl }), shift()],'
const MOI_MIDDLEWARE =
  'middleware: [offset(20), size({ padding: 12, apply({ availableHeight, elements }) { ' +
  'elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`; } }), ' +
  'arrow({ element: arrowEl }), shift()],'

function demLuot(s, con) {
  return s.split(con).length - 1
}

export function vaKichThuocPanelMau(js, tenFile = 'khong-ten.js') {
  if (demLuot(js, CU_WIDTH) !== 1 || demLuot(js, CU_HEIGHT) !== 1) {
    throw new Error(
      `gioi-han-panel-mau: "${CU_WIDTH}" hoặc "${CU_HEIGHT}" không xuất hiện ĐÚNG MỘT LẦN trong ` +
        `${tenFile} (đo được ${demLuot(js, CU_WIDTH)} và ${demLuot(js, CU_HEIGHT)}). Thượng nguồn ` +
        'có thể đã đổi kích thước panel — đo lại trước khi sửa, đừng đổi số mù.',
    )
  }

  const ra = js.replace(CU_WIDTH, MOI_WIDTH).replace(CU_HEIGHT, MOI_HEIGHT)
  return { js: ra, daVa: true }
}

// Thu gọn thanh tìm kiếm ở đầu panel "Mẫu" — chủ dự án báo 2026-09-02 (kèm ảnh chụp) rằng nó CHIẾM
// QUÁ NHIỀU DIỆN TÍCH so với phần còn lại của panel: đệm 21px/24px + cỡ chữ 18–20px trong khi hàng
// tab danh mục ngay dưới chỉ 12px/4px 9px và ô mẫu chỉ cao 80px. Không đổi hành vi, chỉ đổi TỈ LỆ:
// đệm còn hơn một nửa (12px 16px) và cỡ chữ hạ xuống 16px — SÀN đã dùng cho MỌI ô nhập của app
// (DESIGN.md "The 16px Floor Rule": ô dưới 16px khiến iOS Safari tự zoom khi focus). `.search-bar`
// tự nó cũng khai `font-size: 18px` làm giá trị dự phòng cho div bao ngoài — hạ luôn xuống 16px cho
// nhất quán, dù `.search-input` mới là thứ người dùng thật sự thấy gõ chữ vào.
//
// BA PHÉP THAY ĐỘC LẬP TỪNG DÒNG, không phải MỘT literal nhiều dòng: `tsc` phát ra file với line
// ending CRLF (cây nguồn `src/vendor/blocksuite/` toàn bộ là CRLF trên máy Windows này), nên một
// literal `'a;\n      b;'` chèn cứng `\n` sẽ KHÔNG BAO GIỜ khớp `a;\r\n      b;` thật — đo được
// ngay lần chạy đầu (0/1 thay vì 1/1). Ba dòng CSS đích đều là chuỗi lẻ, mỗi dòng chỉ xuất hiện
// đúng một lần trong file, nên tách riêng khỏi luôn phải quan tâm ký tự xuống dòng nào.
const CU_SEARCH_BAR_PADDING = 'padding: 21px 24px;'
const MOI_SEARCH_BAR_PADDING = 'padding: 12px 16px;'
const CU_SEARCH_BAR_CO_CHU = 'font-size: 18px;'
const MOI_SEARCH_BAR_CO_CHU = 'font-size: 16px;'
const CU_SEARCH_INPUT_CO_CHU = 'font-size: 20px;'
const MOI_SEARCH_INPUT_CO_CHU = 'font-size: 16px;'

export function thuGonThanhTimKiemPanelMau(js, tenFile = 'khong-ten.js') {
  const soKhop = {
    padding: demLuot(js, CU_SEARCH_BAR_PADDING),
    coChuBar: demLuot(js, CU_SEARCH_BAR_CO_CHU),
    coChuInput: demLuot(js, CU_SEARCH_INPUT_CO_CHU),
  }
  if (soKhop.padding !== 1 || soKhop.coChuBar !== 1 || soKhop.coChuInput !== 1) {
    throw new Error(
      `gioi-han-panel-mau: ".search-bar"/".search-input" không còn khớp ĐÚNG MỘT LẦN trong ` +
        `${tenFile} (đo được padding=${soKhop.padding}, font-size:18px=${soKhop.coChuBar}, ` +
        `font-size:20px=${soKhop.coChuInput}). Thượng nguồn có thể đã đổi CSS thanh tìm kiếm — ` +
        'đo lại trước khi sửa, đừng đổi số mù.',
    )
  }

  const ra = js
    .replace(CU_SEARCH_BAR_PADDING, MOI_SEARCH_BAR_PADDING)
    .replace(CU_SEARCH_BAR_CO_CHU, MOI_SEARCH_BAR_CO_CHU)
    .replace(CU_SEARCH_INPUT_CO_CHU, MOI_SEARCH_INPUT_CO_CHU)
  return { js: ra, daVa: true }
}

export function vaViTriPanelMau(js, tenFile = 'khong-ten.js') {
  if (demLuot(js, CU_IMPORT_FLOATING_UI) !== 1 || demLuot(js, CU_MIDDLEWARE) !== 1) {
    throw new Error(
      `gioi-han-panel-mau: câu import @floating-ui/dom hoặc mảng middleware không xuất hiện ĐÚNG ` +
        `MỘT LẦN trong ${tenFile} (đo được ${demLuot(js, CU_IMPORT_FLOATING_UI)} và ` +
        `${demLuot(js, CU_MIDDLEWARE)}). Thượng nguồn có thể đã đổi cách gọi floating-ui — đo lại ` +
        'trước khi sửa, đừng đổi mù.',
    )
  }

  const ra = js.replace(CU_IMPORT_FLOATING_UI, MOI_IMPORT_FLOATING_UI).replace(CU_MIDDLEWARE, MOI_MIDDLEWARE)
  return { js: ra, daVa: true }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────────────────────
const dieuHanhTrucTiep = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (dieuHanhTrucTiep) {
  const GOC = path.resolve(import.meta.dirname, '..')
  const TEP_KICH_THUOC = path.join(GOC, '.vendor-build/affine/gfx/template/src/toolbar/template-panel.js')
  const TEP_VI_TRI = path.join(GOC, '.vendor-build/affine/gfx/template/src/toolbar/template-tool-button.js')

  for (const [duong, ham, moTa] of [
    [TEP_KICH_THUOC, vaKichThuocPanelMau, 'giới hạn kích thước .edgeless-templates-panel theo viewport'],
    [TEP_KICH_THUOC, thuGonThanhTimKiemPanelMau, 'thu gọn đệm/cỡ chữ thanh tìm kiếm'],
    [TEP_VI_TRI, vaViTriPanelMau, 'thêm middleware size() cho vị trí panel'],
  ]) {
    const rel = path.relative(GOC, duong).split(path.sep).join('/')
    const goc = readFileSync(duong, 'utf8')
    let ketQua
    try {
      ketQua = ham(goc, rel)
    } catch (err) {
      console.error(`gioi-han-panel-mau: DỪNG — ${err.message}`)
      process.exit(1)
    }
    writeFileSync(duong, ketQua.js)
    console.log(`gioi-han-panel-mau: đã ${moTa} trong ${rel}`)
  }
  process.exit(0)
}
