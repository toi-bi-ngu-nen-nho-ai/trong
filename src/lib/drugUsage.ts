// ─── Sắp nhóm kháng sinh theo tần suất chọn ────────────────────────────────────
//
// Cùng thuật toán với lib/tabUsage.ts (sắp TAB theo tần suất) nhưng áp dụng cho các NHÓM kháng
// sinh (chip "Chọn kháng sinh" trong AntibioticsScreen) — dùng để rút danh sách 22 chip xuống một
// tập "hay tra" mặc định, expand ra đủ khi cần (/impeccable critique 2026-08-18, P2: 22 chip hiện
// hết cùng lúc trước khi lọc/mở rộng gì, vượt ngưỡng cognitive-load ≤4 lựa chọn tại một điểm quyết
// định). Khoá localStorage RIÊNG với tabUsage — tab nào hay mở khác hẳn hoạt chất nào hay tra, hai
// thói quen không nên đếm chung một bộ số. KHÔNG gộp vào tabUsage.ts: hàm đó đã có 12 ca kiểm đang
// qua (tabUsage.spec.ts) khoá theo đúng chữ ký hiện tại, đổi thêm tham số key chỉ để dùng lại vài
// dòng logic không đáng công sửa cả bộ kiểm.

const KEY = "drtrong:abxGroupUsage"

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function recordAbxGroupUse(name: string): void {
  try {
    const counts = readCounts()
    counts[name] = (counts[name] ?? 0) + 1
    localStorage.setItem(KEY, JSON.stringify(counts))
  } catch {
    // Hết chỗ hoặc trình duyệt chặn: không đếm được thì thôi, không làm gãy luồng đang dùng.
  }
}

// Stable sort giảm dần theo đếm — đếm bằng nhau (kể cả toàn 0, người dùng mới hoặc localStorage
// trống/bị chặn) giữ NGUYÊN thứ tự đầu vào (đã sắp alphabet từ AntibioticsScreen), nên lần đầu mở
// app vẫn thấy một tập con có trật tự (A→...) thay vì một lựa chọn ngẫu nhiên.
export function sortGroupsByUsage<T extends { name: string }>(items: T[]): T[] {
  const counts = readCounts()
  return items
    .map((item, i) => ({ item, i, count: counts[item.name] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .map((x) => x.item)
}
