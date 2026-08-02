// ─── Bảng "Đang truyền" ───────────────────────────────────────────────────────
//
// Hai vấn đề được giải quyết cùng lúc ở đây:
//   1. Không xem được hai thuốc cạnh nhau — bệnh nhân sốc chạy 3 vận mạch thì phải cuộn qua lại
//      giữa 3 thẻ, không có chỗ nào nhìn thấy cả 3 tốc độ một lượt.
//   2. Câu hỏi thường trực của ICU: "cái này chạy chung nòng với cái kia được không". Muốn trả lời
//      được thì trước hết app phải BIẾT bệnh nhân đang chạy những gì và trên nòng nào.
//
// Mỗi mục là một thuốc đã ghim kèm tốc độ/liều tại thời điểm ghim và số nòng (lumen) của catheter
// trung tâm. Lưu trên máy để còn nguyên khi chuyển tab hay mở lại app; xoá cùng lúc với "Bệnh nhân
// mới".

const RUNNING_KEY = "drtrong:running"

export const MAX_LINES = 4

export interface RunningDrug {
  id: string
  drugId: string
  name: string
  // Khoá tra bảng tương hợp/tương tác (xem data/compatibility.ts). Thuốc tự nhập thường không có.
  compatKey?: string
  line: number
  doseText: string
  rateText: string
  concText: string
  at: number
  // "infusion" = truyền liên tục qua bơm (có tốc độ mL/giờ để nhìn và so).
  // "intermittent" = liều ngắt quãng (kháng sinh mỗi 8 giờ) — không có tốc độ, và gọi nó là "đang
  // truyền" là sai: cái người dùng cần biết là liều tiếp theo lúc mấy giờ, không phải bơm chạy bao nhiêu.
  kind?: "infusion" | "intermittent"
  // Cân nặng tại thời điểm ghim. Mọi tốc độ mL/giờ đều được tính từ con số này, nên khi cân nặng
  // của bệnh nhân hiện tại đổi mà mục ghim vẫn giữ tốc độ cũ thì bảng đang hiển thị một con số
  // KHÔNG còn đúng — phải phát hiện được để cảnh báo thay vì im lặng.
  weightKgAtPin?: number | null
  // Nồng độ pha tại thời điểm ghim (chuỗi hiển thị) — dùng cùng mục đích với weightKgAtPin.
  concAtPin?: string
}

// Ngưỡng coi một mục ghim là "đã lâu, cần xem lại". Một ca trực đổi sau 8 giờ; tốc độ vận mạch ghim
// từ ca trước gần như chắc chắn đã được chỉnh lại nhiều lần ở bơm mà không ai cập nhật vào app.
export const STALE_AFTER_MS = 4 * 60 * 60 * 1000

// "3 giờ 20 phút trước" — người trực cần biết con số này CŨ tới mức nào, không phải chỉ giờ ghim.
export function formatAgo(at: number, now: number = Date.now()): string {
  const mins = Math.max(0, Math.round((now - at) / 60000))
  if (mins < 1) return "vừa xong"
  if (mins < 60) return `${mins} phút trước`
  const h = Math.floor(mins / 60)
  const m = mins - h * 60
  if (h < 24) return m > 0 ? `${h} giờ ${m} phút trước` : `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

export function formatClock(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// Gộp các mục trỏ về CÙNG MỘT THUỐC THẬT, giữ mục ghim sau cùng.
//
// Vì sao cần: một hoạt chất có thể nằm ở nhiều bản ghi khác nhau trong app — adrenaline có hai bản
// ghi ("liều co bóp" trong tab Co bóp và "liều vận mạch" trong tab Vận mạch) với hai `drugId` khác
// nhau nhưng cùng `compatKey`. Chống trùng chỉ theo drugId (như trước) không bắt được cặp này, nên
// ghim cả hai thì bảng báo "2 thuốc" trong khi bệnh nhân chỉ đang chạy một; tệ hơn, phép kiểm tra
// tương hợp Y-site bỏ qua mọi cặp có cùng khoá (x === y) nên chỗ đó lặng thinh.
function dedupe(items: RunningDrug[]): RunningDrug[] {
  const out: RunningDrug[] = []
  items.forEach((item) => {
    const idx = out.findIndex(
      (r) => r.drugId === item.drugId || (r.compatKey != null && r.compatKey === item.compatKey),
    )
    if (idx === -1) out.push(item)
    else out[idx] = item
  })
  return out
}

export function loadRunning(): RunningDrug[] {
  try {
    const raw = localStorage.getItem(RUNNING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // Dọn cả dữ liệu CŨ đã bị trùng từ trước khi có bước chống trùng này.
    return Array.isArray(parsed) ? dedupe(parsed as RunningDrug[]) : []
  } catch {
    return []
  }
}

// Thêm/cập nhật một thuốc, giữ nguyên số nòng và id của mục cũ nếu đó là cùng một thuốc thật.
export function upsertRunning(prev: RunningDrug[], item: Omit<RunningDrug, "id" | "at">): RunningDrug[] {
  const existing = prev.find(
    (r) => r.drugId === item.drugId || (r.compatKey != null && r.compatKey === item.compatKey),
  )
  const entry: RunningDrug = {
    ...item,
    // Nòng đã gán là lựa chọn của người dùng, không phải giá trị mặc định của thẻ thuốc — cập nhật
    // tốc độ không được âm thầm ném thuốc về nòng 1.
    line: existing?.line ?? item.line,
    id: existing?.id ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
  }
  return existing ? prev.map((r) => (r.id === existing.id ? entry : r)) : [...prev, entry]
}

export function saveRunning(items: RunningDrug[]): void {
  try {
    localStorage.setItem(RUNNING_KEY, JSON.stringify(items))
  } catch {
    // Bỏ qua như các chỗ lưu khác — mất khả năng lưu không được phép làm gãy luồng đang dùng.
  }
}

export function lineLabel(line: number): string {
  return line === 0 ? "Ngoại biên" : `Nòng ${line}`
}
