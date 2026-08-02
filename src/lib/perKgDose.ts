// ─── Nhân sẵn liều mg/kg cho phần kháng sinh ──────────────────────────────────
//
// App đã có cân nặng của người bệnh và đã có chuỗi liều "15–20 mg/kg mỗi 8–12h", nhưng không nhân
// hai cái đó với nhau — đúng cái phần dễ sai nhất (nhẩm mg/kg lúc 2 giờ sáng) vẫn là việc của người
// dùng, trong khi phần truyền tĩnh mạch lại tính rất tử tế.
//
// Cách làm: ĐỌC liều mg/kg trực tiếp từ chuỗi mô tả sẵn có, không bắt khai báo lại thành trường dữ
// liệu mới. Nhờ vậy mọi kháng sinh dựng sẵn VÀ mọi mục người dùng tự nhập đều được tính ngay, kể cả
// liều riêng theo bệnh lý (IndicationDose.tiers) vốn cũng chỉ là chuỗi chữ.

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
