
// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}

// Băm id thành một góc (độ hue) ỔN ĐỊNH trong khoảng [260, 330) — họ tím-hồng quanh --c-accent-2
// (~327°, xem src/index.css), CỐ TÌNH tránh xa đỏ/hổ phách/xanh lá (~0-50°, ~90-150°) vì ba màu đó
// dành riêng cho tín hiệu nguy hiểm/cảnh báo/thành công (Untouchable Signal Rule, DESIGN.md) — chấm
// phân biệt bảng không bao giờ được lẫn với tín hiệu an toàn — critique lượt 3 (2026-08-24): bảng
// mới tạo không phân biệt được trong lưới lẫn panel "Đã xoá gần đây" (11/15 bảng thật trên máy dev
// đọc y hệt "Bảng chưa đặt tên"). Từ 2026-09-02 lượt 3 chỉ còn FALLBACK cho bảng thiếu mauHue (xem
// mauHueChongTrung/mauTrungTinhTheoBang ngay dưới) — không còn dùng trực tiếp cho S/L nữa (đã bỏ
// --chip-s/--chip-l, xem chú thích tại mauTrungTinhTheoBang).
export function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
}

// 3 mốc hue cách đều 30° trong [260,330) — "ứng viên" cho mauHueChongTrung() ngay dưới. TRƯỚC là 14
// mốc cách 5° (phủ gần hết 65° của dải): đo trực tiếp trên trình duyệt thật, farthest-point trên 14
// mốc mịn cho khoảng cách tối thiểu chỉ 14,4-15° ngay khi có 4 bảng chưa gắn khoa cùng sống — VI PHẠM
// claim "≥30°" của chính hàm này (critique 2026-09-03 lượt 4, P2), vì đây là giới hạn TOÁN HỌC
// (pigeonhole): rải N≥4 điểm trong 65° thì khoảng cách nhỏ nhất tốt nhất có thể đạt chỉ ~21,7°, không
// mốc mịn cỡ nào sửa được. 3 mốc cách ĐÚNG 30° thì lời hứa "≥30°" trở thành SỰ THẬT cho tối đa 3 bảng
// sống cùng lúc — ít hơn 14 nhưng không còn là lời hứa suông. Từ bảng thứ 4 trở đi, xem chú thích
// "khi bão hoà" tại mauHueChongTrung ngay dưới. KHÔNG mở rộng dải [260,330) để lấy thêm mốc: dải này
// cố tình áp sát nhưng chưa chạm đỏ/hổ phách (~0-50°, buffer 35° ở đầu 330) lẫn xanh lá (~90-150°,
// buffer 110° ở đầu 260) — nới rộng về phía nào cũng ăn bớt buffer an toàn đó (Untouchable Signal
// Rule, DESIGN.md) hoặc lấn sang hue của chính --c-primary (~232°), một quyết định thương hiệu vượt
// quá phạm vi một bản vá P2, cần chủ dự án xác nhận trước (xem câu hỏi cuối critique lượt 4).
const CAC_MOC_HUE: number[] = [260, 290, 320]

// Chọn MỘT hue trong CAC_MOC_HUE xa nhất (theo khoảng cách gần nhất) các hue ĐANG CÓ — greedy
// farthest-point, gọi MỘT LẦN lúc tạo bảng (taoBangMoi) rồi lưu cố định vào MucMeta.mauHue, KHÔNG
// gọi lại mỗi lần render. Vì sao không thể là hash thuần theo id: hai giá trị hash độc lập của hai id
// bất kỳ không có bảo đảm khoảng cách tối thiểu nào — đo được trực tiếp 2 bảng tạo liên tiếp ra hue
// cách nhau chỉ 6°, gần như cùng màu (critique 2026-09-02 lượt 3, P2). Thuật toán này thì có: nó NHÌN
// THẤY sibling hiện có trước khi gán, nên luôn chọn được mốc tách biệt nhất còn lại. Mảng rỗng (bảng
// đầu tiên) → mốc đầu tiên, không có gì để tránh.
//
// KHI BÃO HOÀ (bảng chưa-gắn-khoa thứ 4 trở đi, sống cùng lúc): cả 3 mốc đã dùng hết, mọi ứng viên
// còn lại đều có khoảng-cách-gần-nhất bằng 0 (trùng một mốc đã có) — vòng lặp dùng `>` (không phải
// `>=`) nên giữ nguyên `tot` ở giá trị KHỞI TẠO (CAC_MOC_HUE[0] = 260) thay vì đổi lung tung theo thứ
// tự duyệt mảng, tức bảng thứ 4 LUÔN lặp lại đúng màu bảng ĐẦU TIÊN — một sự trùng lặp NHẤT QUÁN, dễ
// đoán, còn hơn một sự trùng lặp ngẫu nhiên tuỳ thời điểm gọi. Đây là suy giảm CÓ CHỦ Ý, không phải
// lỗi: 3 bảng đầu vẫn tách biệt thật (đo được ≥30°); bảng thứ 4+ dựa vào tên riêng + số thứ tự trong
// aria-label (xem chỗ dùng formatReadTime ở TheBang) để phân biệt, không còn dựa vào màu.
export function mauHueChongTrung(hueHienCo: number[]): number {
  if (hueHienCo.length === 0) return CAC_MOC_HUE[0]
  let tot = CAC_MOC_HUE[0]
  let xaNhat = -1
  for (const moc of CAC_MOC_HUE) {
    const ganNhat = Math.min(...hueHienCo.map((h) => Math.abs(h - moc)))
    if (ganNhat > xaNhat) {
      xaNhat = ganNhat
      tot = moc
    }
  }
  return tot
}

// Màu badge cho bảng CHƯA gắn chuyên khoa — tô theo hue (mauHue nếu bảng đã có, tức tạo từ
// 2026-09-02 lượt 3 trở đi qua mauHueChongTrung; mauOnDinh(id) làm fallback cho bảng CŨ hơn, tạo
// trước khi trường này tồn tại — không đổi màu bảng cũ người dùng đã quen mắt) thay vì một xám trung
// tính DÙNG CHUNG cho mọi bảng chưa gắn khoa. Trước 2026-09-02 mọi bảng như vậy (nay là mặc định của
// bảng mới, xem taoBangMoi) đều đọc y hệt nhau trong lưới — cùng lớp lỗi "11/15 bảng đọc y hệt nhau"
// mà chính mauOnDinh() ở trên từng vá cho panel "Đã xoá gần đây" (critique 2026-09-02 lượt 2, P2).
// S/L CỐ ĐỊNH (không dùng --chip-s/--chip-l — hai token đó tự đổi theo theme cho nền --c-page/
// --c-surface, còn badge này luôn nằm TRÊN GIẤY (.mind-note-card), vốn KHÔNG theme-swap — trộn nhầm
// token theo-theme vào nền không theo-theme là đúng lớp bug 2,69:1 mà --c-on-note-muted bên dưới
// từng vá, xem chú thích P0 tại chỗ dùng). 50%/36% đo được ≥5,3:1 trên cả hai tông giấy (#fbfaf7
// sáng / #efece3 tối) xuyên suốt toàn bộ dải hue [260,330) — kiểm bằng script, không đoán. Panel "Đã
// xoá gần đây" dùng CHÍNH công thức này (không còn --chip-s/--chip-l riêng) để chấm màu ở đó và badge
// ở lưới chính luôn là MỘT màu cho cùng một bảng (critique 2026-09-02 lượt 3, P3).
export function mauTrungTinhTheoBang(id: string | undefined, mauHue?: number): string {
  if (!id) return 'var(--c-on-note-muted, #5c5f7a)'
  return `hsl(${mauHue ?? mauOnDinh(id)} 50% 36%)`
}

// Độ sáng tương đối (WCAG relative luminance, 0-1) của một màu hex "#rrggbb".
function doSangTuongDoi(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const tuyenTinh = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * tuyenTinh(r) + 0.7152 * tuyenTinh(g) + 0.0722 * tuyenTinh(b)
}

// Xấp xỉ độ sáng của --c-on-bright ở dark mode (#0b0c1c) — dùng làm ứng viên "chữ gần đen" thay vì
// đen tuyệt đối, để khớp đúng giá trị token thật app đang dùng ở mọi nơi khác.
const DO_SANG_GAN_DEN = doSangTuongDoi('#0b0c1c')

function tiLeTuongPhan(l1: number, l2: number): number {
  const [sang, toi] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (sang + 0.05) / (toi + 0.05)
}

// Chọn chữ trắng hoặc gần-đen tuỳ theo màu NỀN CỤ THỂ (kh.color) — KHÔNG dùng var(--c-on-bright)
// cứng cho nền này: token đó chỉ được hiệu chỉnh cho --c-primary (đổi độ sáng theo theme), còn
// kh.color là hằng số CỐ ĐỊNH qua cả hai theme (xem comment đầu specialties.ts: "chưa đổi theo chủ
// đề"). Ghép nhầm --c-on-bright vào nền này khiến cả 11/11 màu chuyên khoa xuống dưới AA ở dark mode
// (đo được 3.00-3.97:1, critique 2026-08-26 P1) — bài học từ chính lượt vá contrast trước, áp đúng
// công thức cho MỘT điểm chạm (chip "Tất cả", nền --c-primary) rồi lan sang điểm chạm khác có màu
// nền hoàn toàn khác bản chất. Hàm này tính tương phản thật với CẢ HAI ứng viên rồi chọn bên thắng —
// đúng cho bất kỳ giá trị hex nào, kể cả nếu sau này thêm chuyên khoa với màu sáng hơn hẳn 11 màu
// hiện tại (nơi trắng sẽ không còn thắng nữa).
export function chuTrenNen(hexNen: string): string {
  const lNen = doSangTuongDoi(hexNen)
  const dungTrang = tiLeTuongPhan(1, lNen)
  const dungGanDen = tiLeTuongPhan(DO_SANG_GAN_DEN, lNen)
  return dungTrang >= dungGanDen ? '#ffffff' : '#0b0c1c'
}
