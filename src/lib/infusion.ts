// Quy đổi liều ⇄ tốc độ truyền cho máy tính pha thuốc.
//
// Cách làm: mọi thứ được quy về "lượng thuốc trong một giờ", rồi chia cho nồng độ để ra mL/giờ
// (và ngược lại). Nhờ đó chỉ cần MỘT công thức cho mọi đơn vị liều — theo cân nặng hay không,
// tính theo phút hay theo giờ, mcg hay mg — thay vì mỗi thuốc khai báo sẵn một hệ số quy đổi.
//
// Đơn vị được ĐỌC TỪ CHUỖI (vd "mcg/kg/phút", "mg/mL") chứ không cần khai báo thêm trường mới,
// nên toàn bộ dữ liệu thuốc có sẵn dùng được ngay. Trường `unitScale` cũ trong InfusionCalcConfig
// vì vậy không còn cần thiết nữa (xem ghi chú trong data/types.ts).

export interface DoseUnit {
  // Đúng chuỗi hiển thị cho người dùng, vd "mcg/kg/phút".
  id: string
  // Đơn vị lượng thuốc: "mcg" | "mg" | "g" | "đơn vị" | "mEq"...
  mass: string
  // Liều tính trên mỗi kg cân nặng hay không.
  perWeight: boolean
  per: "phút" | "giờ"
}

// Chỉ các đơn vị trong CÙNG một họ mới quy đổi được cho nhau. "đơn vị" (insulin, vasopressin) và
// "mEq" (điện giải) không có hệ số sang mg/mcg nên chỉ đổi được với chính nó.
const MASS_IN_MCG: Record<string, number> = { mcg: 1, mg: 1000, g: 1_000_000 }

export function parseDoseUnit(unit: string): DoseUnit | null {
  const parts = unit.split("/").map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const per = parts[parts.length - 1]
  if (per !== "phút" && per !== "giờ") return null
  return { id: unit, mass: parts[0], perWeight: parts.includes("kg"), per }
}

// "mg/mL" → "mg"
export function massOfConcUnit(concUnit: string): string {
  return concUnit.split("/")[0]?.trim() ?? concUnit
}

// Hệ số nhân để đổi 1 đơn vị `from` sang `to`; null nếu hai đơn vị không cùng họ.
export function massFactor(from: string, to: string): number | null {
  if (from === to) return 1
  const a = MASS_IN_MCG[from]
  const b = MASS_IN_MCG[to]
  if (a == null || b == null) return null
  return a / b
}

// Lượng thuốc dùng trong một giờ, tính theo đơn vị lượng của chính liều đó.
function amountPerHour(doseValue: number, unit: DoseUnit, weightKg: number | null): number | null {
  if (unit.perWeight) {
    if (!weightKg || weightKg <= 0) return null
    doseValue *= weightKg
  }
  return unit.per === "phút" ? doseValue * 60 : doseValue
}

// Liều → tốc độ (mL/giờ).
export function doseToRate(
  doseValue: number,
  unit: DoseUnit,
  weightKg: number | null,
  concValue: number,
  concUnit: string,
): number | null {
  if (!(doseValue > 0) || !(concValue > 0)) return null
  const perHour = amountPerHour(doseValue, unit, weightKg)
  if (perHour == null) return null
  const f = massFactor(unit.mass, massOfConcUnit(concUnit))
  if (f == null) return null
  return (perHour * f) / concValue
}

// Tốc độ (mL/giờ) → liều, theo đơn vị `unit`.
export function rateToDose(
  rate: number,
  unit: DoseUnit,
  weightKg: number | null,
  concValue: number,
  concUnit: string,
): number | null {
  if (!(rate > 0) || !(concValue > 0)) return null
  const f = massFactor(massOfConcUnit(concUnit), unit.mass)
  if (f == null) return null
  let perHour = rate * concValue * f
  if (unit.per === "phút") perHour /= 60
  if (unit.perWeight) {
    if (!weightKg || weightKg <= 0) return null
    perHour /= weightKg
  }
  return perHour
}

// Đổi một trị số liều sang đơn vị khác (dùng cho khoảng liều gợi ý khi người dùng đổi đơn vị).
export function convertDoseValue(
  value: number,
  from: DoseUnit,
  to: DoseUnit,
  weightKg: number | null,
): number | null {
  const perHour = amountPerHour(value, from, weightKg)
  if (perHour == null) return null
  const f = massFactor(from.mass, to.mass)
  if (f == null) return null
  let out = perHour * f
  if (to.per === "phút") out /= 60
  if (to.perWeight) {
    if (!weightKg || weightKg <= 0) return null
    out /= weightKg
  }
  return out
}

// Các đơn vị liều cho người dùng chọn. Với thuốc tính bằng mcg/mg/g thì đưa ra đúng bộ đơn vị hay
// dùng trên lâm sàng; với thuốc tính bằng "đơn vị"/"mEq" (không quy đổi sang mg được) thì sinh 4
// biến thể của chính đơn vị đó. Đơn vị gốc của thuốc luôn có trong danh sách và nằm đầu tiên.
const COMMON_METRIC_UNITS = ["mcg/kg/phút", "mcg/kg/giờ", "mcg/phút", "mg/phút", "mg/giờ", "mg/kg/giờ"]

// Danh sách chọn nhanh cho form thêm/sửa thuốc truyền — gồm bộ đơn vị mcg/mg hay dùng cộng thêm
// các đơn vị hoạt lực không quy đổi được sang mg (insulin, vasopressin, điện giải, magie).
export const COMMON_DOSE_UNITS = [
  ...COMMON_METRIC_UNITS,
  "đơn vị/phút",
  "đơn vị/giờ",
  "đơn vị/kg/giờ",
  "mEq/giờ",
  "g/giờ",
]

export function doseUnitOptions(drugDoseUnit: string, concUnit: string): string[] {
  const own = parseDoseUnit(drugDoseUnit)
  if (!own) return [drugDoseUnit]
  const concMass = massOfConcUnit(concUnit)
  const isMetric = MASS_IN_MCG[concMass] != null && MASS_IN_MCG[own.mass] != null
  const list = isMetric
    ? COMMON_METRIC_UNITS
    : [`${own.mass}/phút`, `${own.mass}/giờ`, `${own.mass}/kg/phút`, `${own.mass}/kg/giờ`]
  // Lọc bỏ đơn vị không quy đổi được sang đơn vị của nồng độ (không thể tính ra mL/giờ).
  const usable = list.filter((u) => {
    const p = parseDoseUnit(u)
    return p != null && massFactor(p.mass, concMass) != null
  })
  return [drugDoseUnit, ...usable.filter((u) => u !== drugDoseUnit)]
}

// Làm gọn số cho dễ đọc: liều rất nhỏ (0.01 mcg/kg/phút) cần nhiều số thập phân, tốc độ 12.5 mL/giờ
// thì một số là đủ.
export function formatDoseNumber(v: number): string {
  const abs = Math.abs(v)
  if (abs === 0) return "0"
  if (abs < 0.01) return v.toFixed(4)
  if (abs < 0.1) return v.toFixed(3)
  if (abs < 10) return v.toFixed(2)
  if (abs < 100) return v.toFixed(1)
  return v.toFixed(0)
}
