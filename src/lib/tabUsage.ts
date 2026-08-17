// ─── Sắp hàng tab theo tần suất dùng ────────────────────────────────────────
//
// Khác useStickyState (uiState.ts, sessionStorage — nhớ CHỖ ĐANG ĐỨNG trong một phiên), đây là
// THÓI QUEN dài hạn tích luỹ qua nhiều ca trực, nên dùng localStorage riêng. Xem
// docs/superpowers/specs/2026-08-17-dungthuoc-tab-mru-design.md.

const KEY = "drtrong:tabUsage"

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function recordTabUse(id: string): void {
  try {
    const counts = readCounts()
    counts[id] = (counts[id] ?? 0) + 1
    localStorage.setItem(KEY, JSON.stringify(counts))
  } catch {
    // Hết chỗ hoặc trình duyệt chặn: không đếm được thì thôi, không làm gãy luồng đang dùng.
  }
}

// Stable sort giảm dần theo đếm — đếm bằng nhau (kể cả toàn 0, người dùng mới hoặc localStorage
// trống/bị chặn) giữ NGUYÊN thứ tự đầu vào, nên không cần nhánh đặc cách cho "lần đầu mở app".
export function sortByUsage<T extends { id: string }>(items: T[]): T[] {
  const counts = readCounts()
  return items
    .map((item, i) => ({ item, i, count: counts[item.id] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .map((x) => x.item)
}

// Giữ một thứ tự đã "đóng băng" (vd đã lưu vào sessionStorage lúc đầu phiên) ổn định suốt phiên,
// mà không bao giờ làm mất một mục nếu `items` đổi giữa chừng (bản cập nhật ứng dụng thêm/bớt
// nhóm): id đã lưu nhưng không còn trong `items` bị bỏ qua; id mới trong `items` nhưng chưa có
// trong bản lưu được nối vào CUỐI theo đúng thứ tự gốc của chúng trong `items`.
export function reconcileOrder<T extends { id: string }>(items: T[], storedIds: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const ordered: T[] = []
  storedIds.forEach((id) => {
    if (seen.has(id)) return
    const item = byId.get(id)
    if (!item) return
    ordered.push(item)
    seen.add(id)
  })
  items.forEach((item) => {
    if (!seen.has(item.id)) ordered.push(item)
  })
  return ordered
}
