import type { Specialty } from "./types"

// Lưu ý: không có field đếm số bài viết ở đây — xem ghi chú trong types.ts. Số bài viết/thẻ ghi nhớ
// hiển thị cho mỗi chuyên khoa được tính động (ARTICLES/FLASHCARDS thật + mục tự thêm) tại nơi hiển thị.
// Không còn field `icon` (trước đây là một emoji): hình của mỗi chuyên khoa nay do
// components/SpecialtyIcons.tsx vẽ bằng SVG, tra theo `id` — xem ghi chú ở đầu file đó.
// `color` vẫn ở đây vì nó là màu nhận diện của khoa, dùng cho cả icon, nền thẻ và tiêu đề.
//
// Trước đây 10 màu này tự do (L trải 36-67, C trải 0.04-0.25): xếp cạnh nhau trong dải chọn khoa,
// mắt không đọc ra 10 hạng mục ngang hàng — vài mảng nổi bật (Nội tiết cam), vài mảng gần như biến
// mất (Thận học gần đen, Sinh lý xám mờ). Bốn màu còn ĐỤNG thẳng token hệ thống (Truyền nhiễm ≈
// primary, Tiêu hoá ≈ green, Nội tiết ≈ warn-icon, Tim mạch ≈ danger) khiến "màu nhận diện khoa"
// không phân biệt được với "màu cảnh báo". Bộ mới cố định L≈52, C≈0.155-0.20 cho cả 10 — cùng
// trọng lượng thị giác, mọi màu đạt ≥4.5:1 trên nền trang mới, và Cấp cứu dùng đúng sắc đỏ của
// --c-danger (nó LÀ cấp cứu — hợp lý khi trùng màu ngữ nghĩa) trong khi Tim mạch tách sang một hue
// khác để hai khoa hay đứng cạnh nhau trong danh sách không nhoè vào nhau.
//
// Còn thiếu: một bộ 10 màu THỨ HAI cho bản tối (bộ này tối ưu cho nền sáng). Đây là hằng số cứng,
// chưa đổi theo chủ đề — trên nền tối các màu này vẫn hiển thị nguyên như ở bản sáng. Muốn đổi
// theo theme cần bọc SPECIALTIES qua một hook đọc `data-theme`/matchMedia rồi chọn bảng màu tương
// ứng, và sửa lại ~15 chỗ trong App.tsx đang dùng `s.color`/`spec.color` trực tiếp — việc này CHƯA
// làm ở đây vì đổi cả cách các nơi đó lấy màu, rủi ro hồi quy cao hơn hẳn phần còn lại của lần sửa
// này. Màu vẫn để dạng mã hex thuần (không phải var(--c-*)): nhiều chỗ nối thêm hai ký tự alpha
// vào cuối (`${spec.color}15`, `${spec.color}88`...) để pha độ trong suốt — cú pháp đó chỉ hoạt
// động với hex, không nối được vào một tham chiếu var().
export const SPECIALTIES: Specialty[] = [
  { id: "cardiology", name: "Tim mạch", color: "#b13a34" },
  { id: "pulmonology", name: "Hô hấp", color: "#0079a8" },
  { id: "gastrointestinal", name: "Tiêu hoá", color: "#008030" },
  { id: "nephrology", name: "Thận học", color: "#1468bf" },
  { id: "endocrine", name: "Nội tiết", color: "#9f5300" },
  { id: "neurology", name: "Thần kinh", color: "#6f52b8" },
  { id: "hematology", name: "Huyết học", color: "#ad385f" },
  { id: "infectious", name: "Truyền nhiễm", color: "#008248" },
  { id: "emergency", name: "Cấp cứu", color: "#b91c1c" },
  { id: "pathophysiology", name: "Sinh lý (bệnh)", color: "#5b6470" },
  { id: "pharmacology", name: "Dược lâm sàng", color: "#7a6300" },
]

export const PICKER_ITEMS: Specialty[] = [
  // Trước đây #0050B3 — màu chủ đạo CŨ từ trước khi app đổi sang teal, mảnh sót lại của lần đổi
  // thương hiệu chưa dọn. Đổi sang đúng giá trị --c-primary hiện tại (bản sáng).
  { id: "home", name: "Trang chủ", color: "#00766e" },
  ...SPECIALTIES,
]
