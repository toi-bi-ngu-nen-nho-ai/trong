// ─── Nhân sẵn liều mg/kg cho phần kháng sinh ──────────────────────────────────
//
// App đã có cân nặng của người bệnh và đã có chuỗi liều "15–20 mg/kg mỗi 8–12h", nhưng không nhân
// hai cái đó với nhau — đúng cái phần dễ sai nhất (nhẩm mg/kg lúc 2 giờ sáng) vẫn là việc của người
// dùng, trong khi phần truyền tĩnh mạch lại tính rất tử tế.
//
// Cách làm: ĐỌC liều mg/kg trực tiếp từ chuỗi mô tả sẵn có, không bắt khai báo lại thành trường dữ
// liệu mới. Nhờ vậy mọi kháng sinh dựng sẵn VÀ mọi mục người dùng tự nhập đều được tính ngay, kể cả
// liều riêng theo bệnh lý (IndicationDose.tiers) vốn cũng chỉ là chuỗi chữ.

import type { DoseCap } from "../data/types"

// Đơn vị lượng thuốc chấp nhận được ở dạng "…/kg". "đơn vị"/"UI" giữ nguyên, không quy đổi.
const MASS_UNITS = ["mg", "mcg", "g", "đơn vị", "UI"] as const

// Bắt "15–20 mg/kg", "5-7 mg/kg", "15 mg/kg", "500 mcg/kg", "25 đơn vị/kg".
// Dấu gạch có thể là "-", "–" (en dash, dữ liệu trong app dùng dấu này) hoặc "—".
const PER_KG_RE = new RegExp(
  String.raw`(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*(\d+(?:[.,]\d+)?)\s*)?(${MASS_UNITS.join("|")})\s*\/\s*kg`,
  "gi",
)

export interface PerKgDose {
  // Đoạn chữ gốc đã khớp, vd "15–20 mg/kg" — hiển thị lại để người dùng đối chiếu.
  raw: string
  low: number
  high: number | null
  unit: string
}

function toNumber(s: string): number {
  return parseFloat(s.replace(",", "."))
}

export function findPerKgDoses(text: string | undefined | null): PerKgDose[] {
  if (!text) return []
  const out: PerKgDose[] = []
  PER_KG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = PER_KG_RE.exec(text)) != null) {
    const low = toNumber(m[1])
    const high = m[2] != null ? toNumber(m[2]) : null
    if (!(low > 0)) continue
    out.push({ raw: m[0], low, high: high != null && high > 0 ? high : null, unit: m[3] })
  }
  return out
}

// Làm gọn số cho dễ đọc, kèm quy đổi sang gam khi con số quá lớn (1750 mg → "1750 mg (1,75 g)") vì
// lọ thuốc trên thực tế ghi theo gam.
export function formatMass(value: number, unit: string): string {
  const round = (v: number) => {
    if (v >= 100) return String(Math.round(v))
    if (v >= 10) return (Math.round(v * 10) / 10).toString()
    return (Math.round(v * 100) / 100).toString()
  }
  const base = `${round(value)} ${unit}`
  if (unit === "mg" && value >= 1000) return `${base} (${(Math.round((value / 1000) * 100) / 100).toString().replace(".", ",")} g)`
  if (unit === "mcg" && value >= 1000) return `${base} (${(Math.round((value / 1000) * 100) / 100).toString().replace(".", ",")} mg)`
  return base
}

// "15–20 mg/kg" × 70 kg → "1050–1400 mg (1,05 g – 1,4 g)". Trả về null nếu chưa có cân nặng.
export function computePerKgText(dose: PerKgDose, weightKg: number | null): string | null {
  if (weightKg == null || !(weightKg > 0)) return null
  const lo = dose.low * weightKg
  if (dose.high == null) return formatMass(lo, dose.unit)
  const hi = dose.high * weightKg
  return `${formatMass(lo, dose.unit)} – ${formatMass(hi, dose.unit)}`
}

// ─── Trần liều một lần dùng ───────────────────────────────────────────────────
// Phép nhân mg/kg × cân nặng không có điểm dừng tự nhiên: 25 mg/kg × 140 kg = 3.500 mg Vancomycin,
// một con số trông hợp lý nhưng vượt xa trần 2–3 g của mọi khuyến cáo. `DoseCap` khai trên từng
// thuốc (Antibiotic.maxSingleDose) là mốc dừng đó — xem ghi chú trong data/types.ts.
//
// Quy tắc: KHÔNG im lặng cắt số. App vẫn cho thấy con số tính thô (để người dùng đối chiếu được với
// phép nhẩm của chính mình) nhưng nói rõ liều thực dùng bị trần chặn ở đâu và vì sao — cắt số mà
// không nói gì thì lần sau người dùng nhẩm tay lại ra số khác app, và họ sẽ tin phép nhẩm.

export interface CappedDose {
  // Liều sau khi đã áp trần — đây là con số được dùng để tính "Cách dùng"/số mL phải rút.
  low: number
  high: number | null
  unit: string
  // Liều tính thô trước khi áp trần, chỉ để hiển thị đối chiếu.
  rawLow: number
  rawHigh: number | null
  // Trần đã thực sự cắt vào khoảng liều này hay không.
  capped: boolean
  cap: DoseCap | null
}

// Áp trần lên một khoảng liều đã nhân ra đơn vị tuyệt đối. Trần khai bằng đơn vị khác họ (vd trần
// "g" cho liều tính bằng "mg") vẫn quy đổi được; khác họ hoàn toàn (vd trần "mg" cho liều "đơn vị")
// thì BỎ QUA trần thay vì quy đổi bừa — một hệ số bịa ra ở đây còn nguy hiểm hơn là không có trần.
export function applyDoseCap(
  low: number,
  high: number | null,
  unit: string,
  cap: DoseCap | null | undefined,
): CappedDose {
  const base: CappedDose = { low, high, unit, rawLow: low, rawHigh: high, capped: false, cap: null }
  if (cap == null || !(cap.amount > 0)) return base
  const capInDoseUnit = convertMass(cap.amount, cap.unit, unit)
  if (capInDoseUnit == null) return base
  const capped = (high ?? low) > capInDoseUnit + 1e-9
  if (!capped) return { ...base, cap }
  return {
    low: Math.min(low, capInDoseUnit),
    high: high != null ? Math.min(high, capInDoseUnit) : null,
    unit,
    rawLow: low,
    rawHigh: high,
    capped: true,
    cap,
  }
}

// Quy đổi khối lượng giữa mcg/mg/g. Trả về null khi một trong hai đơn vị không thuộc họ này
// ("đơn vị"/"UI" chỉ so được với chính nó).
const MASS_IN_MCG: Record<string, number> = { mcg: 1, mg: 1000, g: 1_000_000 }

function convertMass(value: number, from: string, to: string): number | null {
  if (from === to) return value
  const a = MASS_IN_MCG[from]
  const b = MASS_IN_MCG[to]
  if (a == null || b == null) return null
  return (value * a) / b
}

// Câu giải thích hiện cạnh liều khi trần đã cắt. Luôn nói cả con số thô lẫn con số sau trần.
export function describeDoseCap(d: CappedDose): string | null {
  if (!d.capped || d.cap == null) return null
  const raw = d.rawHigh != null ? `${formatMass(d.rawLow, d.unit)} – ${formatMass(d.rawHigh, d.unit)}` : formatMass(d.rawLow, d.unit)
  const capText = formatMass(d.cap.amount, d.cap.unit)
  return `Nhân theo cân nặng ra ${raw}, vượt trần một lần dùng ${capText}${d.cap.note ? ` (${d.cap.note})` : ""}. Liều dùng lấy tối đa ${capText}.`
}

// Bắt liều TUYỆT ĐỐI (không theo cân nặng) đứng đầu chuỗi, vd "500 mg mỗi 48 giờ" → 500 mg,
// "1 g mỗi 8h" → 1 g. Chỉ khớp khi con số nằm NGAY ĐẦU chuỗi (bỏ khoảng trắng đầu) — cách viết
// nhất quán của mọi mức liều trong app — để không bắt nhầm một con số nằm giữa câu (vd "mỗi 8 giờ").
const FIXED_DOSE_RE = new RegExp(
  String.raw`^\s*(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*\d+(?:[.,]\d+)?\s*)?(${MASS_UNITS.join("|")})(?!\s*\/\s*kg)\b`,
  "i",
)

// Nhiều mức liều trong app viết dạng "Liều nạp X, sau đó Y mỗi Zh" (nạp một lần, RỒI duy trì lặp
// lại) — liều cần pha lặp đi lặp lại mỗi lần dùng là liều DUY TRÌ đứng sau "sau đó", không phải liều
// nạp đứng đầu câu. Cụm "sau đó" là cách viết nhất quán của mọi mục có liều nạp trong app.
const MAINTENANCE_DOSE_RE = new RegExp(
  String.raw`sau đó\s*(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*\d+(?:[.,]\d+)?\s*)?(${MASS_UNITS.join("|")})(?!\s*\/\s*kg)\b`,
  "i",
)

export interface FixedDose {
  raw: string
  amount: number
  unit: string
}

// Chỉ dùng khi findPerKgDoses() không khớp gì — một chuỗi không thể vừa là liều theo cân nặng vừa
// là liều tuyệt đối, và mg/kg là mẫu hẹp/chắc chắn hơn nên luôn được ưu tiên trước.
export function findFixedDose(text: string | undefined | null): FixedDose | null {
  if (!text) return null
  if (findPerKgDoses(text).length > 0) return null
  const maintenance = MAINTENANCE_DOSE_RE.exec(text)
  const m = maintenance ?? FIXED_DOSE_RE.exec(text)
  if (!m) return null
  const amount = toNumber(m[1])
  if (!(amount > 0)) return null
  return { raw: m[0].trim(), amount, unit: m[2] }
}
