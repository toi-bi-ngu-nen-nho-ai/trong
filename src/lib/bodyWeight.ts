// ─── Tính cân nặng dùng để chỉnh liều thuốc / ước tính CrCl ───
// ABW (Actual Body Weight)   — cân nặng thực đo được.
// IBW (Ideal Body Weight)    — cân nặng lý tưởng theo công thức Devine (rút gọn theo cm):
//     Nam: 50   + 0.9 × (chiều cao(cm) − 152)
//     Nữ:  45.5 + 0.9 × (chiều cao(cm) − 152)
// AdjBW (Adjusted Body Weight) — cân nặng hiệu chỉnh, dùng khi bệnh nhân béo phì:
//     AdjBW = IBW + 0.4 × (ABW − IBW)
//
// `WeightBasis` gắn trên từng thuốc (Antibiotic.doseWeightBasis / InfusionDrug.doseWeightBasis)
// để chỉ định loại cân nặng thuốc đó cần dùng khi tính liều:
//   - "actual"   → luôn dùng ABW (mặc định — đa số thuốc)
//   - "ideal"    → luôn dùng IBW
//   - "adjusted" → ABW ≤ 130% IBW thì dùng ABW; ABW > 130% IBW (béo phì) thì dùng AdjBW
export type WeightBasis = "actual" | "ideal" | "adjusted"

export type WeightLabel = "ABW" | "IBW" | "AdjBW"

export interface DosingWeightResult {
  abw: number | null
  ibw: number | null
  adjBw: number | null
  used: number | null
  usedLabel: WeightLabel | null
}

export function computeIBW(heightCm: number | null | undefined, sex: "male" | "female"): number | null {
  if (!heightCm || heightCm <= 0) return null
  const base = sex === "male" ? 50 : 45.5
  const val = base + 0.9 * (heightCm - 152)
  return val > 0 ? val : null
}

export function computeAdjBW(abw: number, ibw: number): number {
  return ibw + 0.4 * (abw - ibw)
}

// Trả về ABW/IBW/AdjBW và cân nặng thực sự nên dùng (`used`) theo `basis` chỉ định.
// Nếu chưa có chiều cao (không tính được IBW) thì tạm dùng ABW cho mọi basis, để không chặn
// việc tính liều khi thiếu dữ liệu — UI nên nhắc bổ sung chiều cao để chính xác hơn.
export function resolveDosingWeight(
  abwInput: number | null | undefined,
  heightCm: number | null | undefined,
  sex: "male" | "female",
  basis: WeightBasis = "actual",
): DosingWeightResult {
  const abw = abwInput && abwInput > 0 ? abwInput : null
  const ibw = computeIBW(heightCm, sex)
  const adjBw = abw != null && ibw != null ? computeAdjBW(abw, ibw) : null

  if (abw == null) {
    return { abw, ibw, adjBw, used: null, usedLabel: null }
  }
  if (ibw == null || basis === "actual") {
    return { abw, ibw, adjBw, used: abw, usedLabel: "ABW" }
  }
  if (basis === "ideal") {
    return { abw, ibw, adjBw, used: ibw, usedLabel: "IBW" }
  }
  // basis === "adjusted"
  if (abw <= 1.3 * ibw) {
    return { abw, ibw, adjBw, used: abw, usedLabel: "ABW" }
  }
  return { abw, ibw, adjBw, used: adjBw as number, usedLabel: "AdjBW" }
}
