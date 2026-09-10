export function normalizeDecimalInput(value: string): string {
  return value.replace(/,/g, ".")
}

// parseFloat("70abc") = 70 và parseFloat("1.2.9") = 1.2 — JS âm thầm cắt phần rác sau con số đầu
// tiên, nên gõ nhầm/dán nhầm dữ liệu vào ô cân nặng/tuổi/creatinin vẫn ra một con số "hợp lệ" mà
// không có dấu hiệu nào cho biết chuỗi gốc có ký tự lạ. Chỉ chấp nhận chuỗi số THUẦN (không phần
// đuôi/ký tự chen giữa) — non-null nghĩa là parse được sạch, không có nghĩa là giá trị hợp lý (đó
// là việc của checkWeight/checkAge/checkHeight).
export function parseStrictNumber(raw: string): number | null {
  const s = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}

// Ô nhập không rỗng nhưng không parse sạch được thành số — để phân biệt với "chưa nhập gì".
export function hasInvalidNumericInput(raw: string): boolean {
  return raw.trim() !== "" && parseStrictNumber(raw) == null
}

// Chuyển tên bệnh lý tiếng Việt (có dấu) thành chuỗi ASCII gọn để làm phần id — dùng khi
// EditAntibioticScreen tự tạo một DiseaseEntry mới cho bệnh lý người dùng gõ vào mà chưa có
// trong danh mục. `đ`/`Đ` không tách dấu qua NFD nên phải thay riêng trước khi bỏ dấu.
export function slugifyDiseaseName(name: string): string {
  return name
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
