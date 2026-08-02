import type { Specialty } from "./types"

// Lưu ý: không có field đếm số bài viết ở đây — xem ghi chú trong types.ts. Số bài viết/thẻ ghi nhớ
// hiển thị cho mỗi chuyên khoa được tính động (ARTICLES/FLASHCARDS thật + mục tự thêm) tại nơi hiển thị.
// Không còn field `icon` (trước đây là một emoji): hình của mỗi chuyên khoa nay do
// components/SpecialtyIcons.tsx vẽ bằng SVG, tra theo `id` — xem ghi chú ở đầu file đó.
// `color` vẫn ở đây vì nó là màu nhận diện của khoa, dùng cho cả icon, nền thẻ và tiêu đề.
export const SPECIALTIES: Specialty[] = [
  { id: "cardiology", name: "Tim mạch", color: "#dc2626" },
  { id: "pulmonology", name: "Hô hấp", color: "#0891b2" },
  { id: "gastrointestinal", name: "Tiêu hoá", color: "#16a34a" },
  { id: "nephrology", name: "Thận học", color: "#003c78" },
  { id: "endocrine", name: "Nội tiết", color: "#d97706" },
  { id: "neurology", name: "Thần kinh", color: "#7c3aed" },
  { id: "hematology", name: "Huyết học", color: "#be185d" },
  { id: "infectious", name: "Truyền nhiễm", color: "#0d9488" },
  { id: "emergency", name: "Hồi sức - Cấp cứu", color: "#ef4444" },
  { id: "pathophysiology", name: "Sinh lý - Sinh lý bệnh", color: "#475569" },
  { id: "pharmacology", name: "Dược lý", color: "#0f766e" },
]

export const PICKER_ITEMS: Specialty[] = [
  { id: "home", name: "Trang chủ", color: "#0050B3" },
  ...SPECIALTIES,
]
