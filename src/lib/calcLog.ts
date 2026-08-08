// ─── Nhật ký tính toán ────────────────────────────────────────────────────────
//
// Trước đây app không lưu lại phép tính nào: có sự cố thì không truy lại được đã tính bằng thông số
// gì. Mỗi lần app đưa ra một con số để đặt bơm (hoặc một liều nạp), phép tính đó được ghi lại kèm
// ĐẦY ĐỦ đầu vào — cân nặng, nồng độ, liều, và cả việc người dùng có phải bấm xác nhận vượt liều
// hay không.
//
// Toàn bộ nằm trên máy (localStorage), không gửi đi đâu. Giữ 200 mục gần nhất là đủ cho một vài ca
// trực mà không phình dung lượng.

const LOG_KEY = "drtrong:calcLog"
const MAX_ENTRIES = 200

// "patientReset" không phải một phép tính — là một SỰ KIỆN hệ thống (xoá sạch bệnh nhân + bảng đang
// dùng). Ghi vào cùng nhật ký này vì hoàn tác 10 giây (App.tsx) không để lại dấu vết nào sau khi hết
// hạn: người dùng bị gián đoạn quá 10 giây (chuyện thường lúc trực) mất hẳn khả năng biết mình vừa
// xoá gì, lúc nào — trừ khi có dòng này trong Nhật ký.
export type CalcKind = "doseToRate" | "rateToDose" | "bolus" | "mix" | "patientReset"

export interface CalcLogEntry {
  id: string
  at: number
  drug: string
  kind: CalcKind
  // Nhãn bệnh nhân lúc tính (số giường/tên viết tắt), để phân biệt khi lật lại nhật ký.
  patient?: string
  weightKg?: number | null
  // Các dòng "đầu vào → kết quả" đã định dạng sẵn, vd ["Nồng độ 0.08 mg/mL", "Liều 0.1 mcg/kg/phút"].
  inputs: string[]
  output: string
  // Ghi lại đúng cảnh báo đã hiện ra lúc đó (nếu có) — phần quan trọng nhất khi rà soát sự cố.
  flag?: string
}

export function loadCalcLog(): CalcLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CalcLogEntry[]) : []
  } catch {
    return []
  }
}

function persist(entries: CalcLogEntry[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries))
  } catch {
    // Bỏ qua: không ghi được nhật ký thì vẫn phải cho dùng máy tính bình thường.
  }
}

export function appendCalcLog(entry: Omit<CalcLogEntry, "id" | "at">): CalcLogEntry[] {
  const full: CalcLogEntry = { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() }
  const next = [full, ...loadCalcLog()].slice(0, MAX_ENTRIES)
  persist(next)
  return next
}

export function clearCalcLog(): CalcLogEntry[] {
  persist([])
  return []
}

// Xoá đúng những mục được chọn. Trước đây nhật ký chỉ có "Xoá nhật ký" xoá sạch — nghĩa là muốn bỏ
// một phép tính nháp thì phải hy sinh cả lịch sử của ca trực, nên trên thực tế không ai dám xoá gì.
export function removeCalcLogEntries(ids: Set<string>): CalcLogEntry[] {
  const next = loadCalcLog().filter((e) => !ids.has(e.id))
  persist(next)
  return next
}

export function formatLogTime(at: number): string {
  const d = new Date(at)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(d.getHours())}:${two(d.getMinutes())} ${two(d.getDate())}/${two(d.getMonth() + 1)}`
}

export const CALC_KIND_LABELS: Record<CalcKind, string> = {
  doseToRate: "Liều → Tốc độ",
  rateToDose: "Tốc độ → Liều",
  bolus: "Liều nạp / bolus",
  mix: "Pha thuốc",
  patientReset: "Xoá bệnh nhân",
}

// Xuất ra chữ thuần để dán vào bệnh án/biên bản khi cần truy lại.
export function calcLogToText(entries: CalcLogEntry[]): string {
  return entries
    .map((e) => {
      const head = `[${formatLogTime(e.at)}] ${e.drug} — ${CALC_KIND_LABELS[e.kind]}`
      const who = e.patient ? `\n  Bệnh nhân: ${e.patient}` : ""
      const w = e.weightKg != null ? `\n  Cân nặng: ${e.weightKg} kg` : ""
      const ins = e.inputs.length > 0 ? `\n  ${e.inputs.join("\n  ")}` : ""
      const flag = e.flag ? `\n  ⚠ ${e.flag}` : ""
      return `${head}${who}${w}${ins}\n  → ${e.output}${flag}`
    })
    .join("\n\n")
}
