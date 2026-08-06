// Hỗ trợ màn "Đồng bộ dữ liệu": xem trước một file trước khi nhập (mục nào mới/mục nào bị đè) và
// suy ra thời điểm tạo gần nhất của một nhóm mục — không cần thêm trường `createdAt` vào từng kiểu
// dữ liệu, vì mọi id tự sinh trong app này đều đã nhúng sẵn `Date.now()` lúc tạo (xem các nơi gọi
// `custom-...-${Date.now()}-...`).

// Tách mốc thời gian (mili-giây) nhúng trong id tự sinh, nếu có. Chỉ nhận chuỗi số dài 12–14 chữ số
// và nằm trong khoảng 2020–2100 để không nhầm với số ngẫu nhiên/số thứ tự khác lỡ xuất hiện trong id.
export function extractTimestamp(id: string): number | null {
  const match = id.match(/(\d{12,14})/)
  if (!match) return null
  const n = Number(match[1])
  if (n < 1577836800000 || n > 4102444800000) return null
  return n
}

// Mốc thời gian MỚI NHẤT suy ra được trong một danh sách mục — null nếu không mục nào suy ra được
// (id không theo quy ước trên, ví dụ mục dựng sẵn hoặc mục nhập từ file rất cũ).
export function latestTimestamp(items: { id: string }[]): number | null {
  let max: number | null = null
  for (const item of items) {
    const t = extractTimestamp(item.id)
    if (t != null && (max == null || t > max)) max = t
  }
  return max
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`
}

// So một danh sách "đang có trên máy" với danh sách "trong file sắp nhập" theo id — dùng để cho
// người dùng xem trước sẽ có bao nhiêu mục MỚI (id chưa từng có) và bao nhiêu mục bị ĐÈ (id đã có,
// nội dung trên máy sẽ mất, thay bằng nội dung trong file) TRƯỚC khi bấm xác nhận.
export function diffImportCounts(current: { id: string }[], incoming: { id: string }[]): { added: number; updated: number } {
  const currentIds = new Set(current.map((i) => i.id))
  let added = 0
  let updated = 0
  for (const item of incoming) {
    if (currentIds.has(item.id)) updated++
    else added++
  }
  return { added, updated }
}
