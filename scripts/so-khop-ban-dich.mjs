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

// Dạng ĐÃ THOÁT của chuỗi, tức đúng cái nằm giữa hai dấu nháy trong mã. Bản dịch chứa `"` hay `\`
// nằm trong mã dưới dạng đã thoát, nên so thô sẽ trượt và cổng đỏ giả trên bản dịch hợp lệ.
export function nhayHoa(s) {
  return JSON.stringify(s).slice(1, -1)
}

// Dùng cho `dist/`. Bản build đã minify nên KIỂU NHÁY do bộ đóng gói chọn, không đoán trước được —
// phải chấp cả ba. Đã kiểm trên dist/ hiện tại: cả 5 bản dịch đang ship đều qua phép này, và bộ
// minify KHÔNG thoát tiếng Việt thành \uXXXX (nếu nó thoát thì phép này sẽ trượt hết và bản vá
// sẽ PHÁ luật C thay vì siết nó — đó là rủi ro đã được loại trước khi thiết kế).
export function coNhuLiteral(noiDung, s) {
  const e = nhayHoa(s)
  return (
    noiDung.includes('"' + e + '"') ||
    noiDung.includes("'" + e + "'") ||
    noiDung.includes('`' + e + '`')
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
