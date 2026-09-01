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

const PIN_KEY = "drtrong:tabPins"

function readPinned(): string[] {
  try {
    const raw = localStorage.getItem(PIN_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function isTabPinned(id: string): boolean {
  return readPinned().includes(id)
}

// Ghim thủ công 2-3 nhóm hay dùng theo tua trực — MRU (sortByUsage bên dưới) cần vài phiên mới hội
// tụ, nên ca mới/đầu ca trực (chưa có dữ liệu đếm) có thể khiến nhóm cần dùng nằm cách nhiều lần
// vuốt ngang (/impeccable critique 2026-09-01, P2). Ghim không thay MRU, chỉ đứng TRƯỚC nó trong
// sortByUsage — bỏ ghim thì tab quay lại đúng vị trí theo tần suất như cũ.
export function toggleTabPin(id: string): string[] {
  const pinned = readPinned()
  const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id]
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(next))
  } catch {
    // Hết chỗ hoặc trình duyệt chặn: ghim không lưu được thì thôi, không làm gãy luồng đang dùng.
  }
  return next
}

// Stable sort: ghim thủ công trước, rồi giảm dần theo đếm — đếm bằng nhau (kể cả toàn 0, người dùng
// mới hoặc localStorage trống/bị chặn) giữ NGUYÊN thứ tự đầu vào, nên không cần nhánh đặc cách cho
// "lần đầu mở app".
export function sortByUsage<T extends { id: string }>(items: T[]): T[] {
  const counts = readCounts()
  const pinned = new Set(readPinned())
  return items
    .map((item, i) => ({ item, i, count: counts[item.id] ?? 0, pinned: pinned.has(item.id) }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.count - a.count || a.i - b.i)
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
