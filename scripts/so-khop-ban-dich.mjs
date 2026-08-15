// Phép so khớp bản dịch — thay cho `includes` chuỗi con ở luật C và ở chẩn đoán cây vendored.
//
// VÌ SAO CHUỖI CON LÀ PHÉP SAI. Câu hỏi thật là "bản dịch này có tới được người dùng không", và
// `includes` trả lời nhầm khi một bản dịch ngắn là chuỗi con của một bản dịch KHÁC: nó được tính
// "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị tree-shake. Đo trên dist/
// thật ngày 2026-08-15, dùng tiền tố của các bản dịch đang ship:
//
//   "Phong"  thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Phong cách"
//   "Bố"     thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Bố cục"
//   "Thêm"   thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Thêm ảnh"
//
// Ở 5 khoá hiện tại lỗi không thể lộ (cả 5 đều >=6 ký tự, phân biệt, không cái nào là chuỗi con
// của cái nào) — đó là MAY MẮN CỦA QUY MÔ NHỎ, không phải tính chất được canh. Tiếng Việt chia
// nhau tiền tố rất nhiều (`Xoá` / `Xoá dòng`), nên ở vài trăm khoá đây là chuyện SẼ xảy ra.
//
// VÌ SAO HAI HÀM CHỨ KHÔNG MỘT. Hai chỗ gọi hỏi cùng một câu nhưng trên hai loại văn bản khác
// hẳn nhau, nên phép chặt nhất khả dĩ ở mỗi chỗ là khác nhau — xem chú thích từng hàm. Để chúng
// ở hai file là mời hai bên lệch nhau đúng vào lúc một bên đổi cách so khớp; đó là lý do
// duyet-cay-js.mjs được tách ra dùng chung ở P1-B.

// Dạng ĐÃ THOÁT của `s` khi nó nằm trong một literal dùng ký tự `nhay` để mở/đóng. BA KIỂU NHÁY
// CÓ BA LUẬT THOÁT KHÁC NHAU — đây là chỗ bản vá trước đây sai: nó luôn thoát theo quy ước JSON
// (tức quy ước của nháy KÉP) rồi đem áp cho cả ba kiểu. Trong literal backtick, dấu `"` không hề
// cần thoát (bộ đóng gói ghi thẳng `Nhấn "OK"` vào giữa hai backtick), nhưng quy ước JSON lại biến
// nó thành `\"` — nên phép so khớp đi tìm một chuỗi KHÔNG TỒN TẠI trong mã và báo đỏ giả.
//
// Đo trên dist/ ngày 2026-08-15: cả 5 bản dịch đang ship đều nằm trong literal BACKTICK (chunk
// bảng vẽ có ~30.936 literal backtick, ~12.507 nháy kép, chỉ ~977 nháy đơn) — nên nhánh backtick
// phải đúng, không phải nhánh nháy kép. Lỗi chưa lộ tới giờ chỉ vì chưa bản dịch nào trong 5 cái
// đó chứa `'`, `"`, backtick hay `\`; chữ giao diện tiếng Việt có dấu ngoặc kép là chuyện bình
// thường nên đây là đường sống, không phải giả thuyết.
//
// Thứ tự thoát QUAN TRỌNG: gạch chéo ngược phải thoát TRƯỚC mọi phép thoát khác. Nếu thoát dấu
// nháy trước, gạch chéo ngược mà chính phép thoát đó sinh ra sẽ bị thoát thêm một lần nữa (nhân
// đôi sai) ở bước thoát gạch chéo.
export function dangTrongNhay(s, nhay) {
  let ket = s.split('\\').join('\\\\')
  if (nhay === '"') {
    ket = ket.split('"').join('\\"')
  } else if (nhay === "'") {
    ket = ket.split("'").join("\\'")
  } else if (nhay === '`') {
    // Backtick còn phải thoát `${` — mở nội suy — thứ hai kiểu nháy kia không có.
    ket = ket.split('`').join('\\`')
    ket = ket.split('${').join('\\${')
  }
  return ket
}

// Dùng cho `dist/`. Bản build đã minify nên KIỂU NHÁY do bộ đóng gói chọn, không đoán trước được —
// phải chấp cả ba, MỖI KIỂU THEO ĐÚNG LUẬT THOÁT CỦA NÓ (xem `dangTrongNhay`). Đã kiểm trên dist/
// hiện tại: cả 5 bản dịch đang ship đều qua phép này, và bộ minify KHÔNG thoát tiếng Việt thành
// \uXXXX (nếu nó thoát thì phép này sẽ trượt hết và bản vá sẽ PHÁ luật C thay vì siết nó — đó là
// rủi ro đã được loại trước khi thiết kế).
export function coNhuLiteral(noiDung, s) {
  return (
    noiDung.includes('"' + dangTrongNhay(s, '"') + '"') ||
    noiDung.includes("'" + dangTrongNhay(s, "'") + "'") ||
    noiDung.includes('`' + dangTrongNhay(s, '`') + '`')
  )
}

// Dùng cho `.vendor-build/`. Cây đó là đầu ra `tsc` CHƯA minify, và bản dịch được chèn vào bằng
// đúng `JSON.stringify(chuoiDich)` trong luat-vi-tri-dich.mjs. Nên ở đây so khớp chính xác được —
// chặt hơn phép ba-kiểu-nháy, và không có chỗ nào mơ hồ. Đã kiểm: cả 5 bản dịch có mặt đúng dạng
// này trong cây hiện tại.
export function coDungNhuDaChen(noiDung, s) {
  return noiDung.includes(JSON.stringify(s))
}

// Hai khoá cùng dịch ra MỘT chuỗi y hệt là lớp lỗi mà phép chặt KHÔNG cứu được — hai chuỗi bằng
// nhau từng ký tự, nên một cái còn sống trong dist/ là cả hai được tính có mặt. Chặn ở bảng dịch
// là nơi duy nhất chặn được.
export function timTrungBanDich(banDo) {
  const theoGiaTri = new Map()
  for (const [khoa, vi] of Object.entries(banDo)) {
    if (typeof vi !== 'string') continue
    if (!theoGiaTri.has(vi)) theoGiaTri.set(vi, [])
    theoGiaTri.get(vi).push(khoa)
  }
  return [...theoGiaTri.entries()]
    .filter(([, khoa]) => khoa.length > 1)
    .map(([vi, khoa]) => ({ vi, khoa }))
}

// Khi phép chặt trượt mà phép thô trúng, có HAI nguyên nhân khác hẳn nhau và không được đoán bừa
// một cái:
//   - chuỗi khớp nhầm vào một BẢN DỊCH KHÁC bao nó ("Phong" nằm trong "Phong cách") — thường gặp;
//   - bộ đóng gói đã ghép/tách chuỗi nên nó không còn là một literal trọn vẹn — hiếm.
// Hàm này trả lời được vế thứ nhất, và chỉ vế thứ nhất. Không thấy gì thì bên gọi phải nói là
// KHÔNG giải thích được, chứ không được kết luận sang vế thứ hai.
export function giaiThichKhopTho(v, banDo) {
  for (const [khoa, vi] of Object.entries(banDo)) {
    if (typeof vi !== 'string') continue
    // `vi !== v` để không tự giải thích bằng chính mục của nó — nếu không thì mọi chuỗi đều
    // "giải thích được" và ghi chú thành vô nghĩa.
    if (vi !== v && vi.includes(v)) return { khoa, vi }
  }
  return null
}
