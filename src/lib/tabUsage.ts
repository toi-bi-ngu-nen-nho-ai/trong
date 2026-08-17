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
