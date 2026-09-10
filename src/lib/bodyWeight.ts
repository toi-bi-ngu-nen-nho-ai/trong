// ─── Tính cân nặng dùng để chỉnh liều thuốc / ước tính CrCl ───
// ABW (Actual Body Weight)   — cân nặng thực đo được.
// IBW (Ideal Body Weight)    — cân nặng lý tưởng theo công thức Devine (rút gọn theo cm):
//     Nam: 50   + 0.9 × (chiều cao(cm) − 152)
//     Nữ:  45.5 + 0.9 × (chiều cao(cm) − 152)
// AdjBW (Adjusted Body Weight) — cân nặng hiệu chỉnh, dùng khi bệnh nhân béo phì:
//     AdjBW = IBW + 0.4 × (ABW − IBW)
//
// ─── Hai NGƯỠNG BÉO PHÌ khác nhau, đừng gộp ───
// Nguồn: "Sử dụng kháng sinh" — Bệnh viện Chợ Rẫy 2024.
//   • Liều mg/kg   → ngưỡng theo %IBW: ABW ≥ 120% IBW (OBESITY_IBW_RATIO).
//   • Ước tính CrCl → ngưỡng theo BMI: BMI > 30 kg/m² (CRCL_BMI_THRESHOLD).
// Trước 2026-09-10 app dùng CHUNG một ngưỡng 130% IBW cho cả hai — CrCl vì thế chuyển sang AdjBW
// theo tỷ lệ IBW chứ không theo BMI. Hai ngưỡng đó KHÔNG trùng nhau: một bệnh nhân cao, cơ bắp
// (BMI 28 nhưng ABW ~135% IBW) bị hạ xuống AdjBW và ra CrCl thấp hơn thực tế → tụt bậc liều kháng
// sinh mà không một dấu hiệu nào báo. Hai hằng số dưới đây là hai quyết định lâm sàng ĐỘC LẬP;
// sửa cái này không được kéo theo cái kia.
export const OBESITY_IBW_RATIO = 1.2
export const CRCL_BMI_THRESHOLD = 30
//
// `WeightBasis` gắn trên từng thuốc (Antibiotic.doseWeightBasis / InfusionDrug.doseWeightBasis)
// để chỉ định loại cân nặng thuốc đó cần dùng khi tính liều mg/kg:
//   - "actual"   → luôn dùng ABW (mặc định — đa số thuốc, VÀ vancomycin kể cả khi béo phì)
//   - "ideal"    → luôn dùng IBW
//   - "adjusted" → ABW < 120% IBW thì dùng ABW; ABW ≥ 120% IBW (béo phì) thì dùng AdjBW
//                  (aminoglycosid: amikacin, gentamicin, tobramycin…)
//
// Vì sao vancomycin KHÔNG cần thêm một giá trị/cờ riêng: "dùng cân nặng thực kể cả khi béo phì"
// chính là "actual". Một trường boolean thứ hai cho cùng một quyết định lâm sàng là nguồn sự thật
// thứ hai — hai trường mâu thuẫn nhau trên một bản ghi thuốc là lỗi IM LẶNG, không phải lỗi báo đỏ.
// Giữ đúng MỘT trường.
export type WeightBasis = "actual" | "ideal" | "adjusted"

export type WeightLabel = "ABW" | "IBW" | "AdjBW"

export interface DosingWeightResult {
  abw: number | null
  ibw: number | null
  adjBw: number | null
  used: number | null
  usedLabel: WeightLabel | null
  // true khi `basis` yêu cầu IBW/AdjBW (khác "actual") nhưng thiếu chiều cao nên IBW không tính
  // được — hàm đã âm thầm rơi về ABW ở nhánh `ibw == null` bên dưới. `usedLabel` khi đó vẫn là
  // "ABW", không phân biệt được với một thuốc THẬT SỰ dùng basis "actual" — ba nơi gọi hàm này
  // (AntibioticDoseCard, BolusList, InfusionCalculator) chỉ hiện chú thích usedLabel khi nó KHÁC
  // "ABW", nên trước đây một liều nhũ dịch lipid (LAST) tính theo cân nặng thực thay vì cân nặng
  // lý tưởng mà không một dấu hiệu nào báo — cờ này để UI ở cả ba nơi cảnh báo đúng ca đó
  // (/impeccable critique 2026-08-21, P0).
  heightMissingForBasis: boolean
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
// việc tính liều khi thiếu dữ liệu — heightMissingForBasis báo cho UI biết để nhắc bổ sung
// chiều cao, thay vì âm thầm coi như thuốc dùng "actual".
export function resolveDosingWeight(
  abwInput: number | null | undefined,
  heightCm: number | null | undefined,
  sex: "male" | "female",
  basis: WeightBasis = "actual",
): DosingWeightResult {
  const abw = abwInput && abwInput > 0 ? abwInput : null
  const ibw = computeIBW(heightCm, sex)
  const adjBw = abw != null && ibw != null ? computeAdjBW(abw, ibw) : null
  const heightMissingForBasis = basis !== "actual" && ibw == null

  if (abw == null) {
    return { abw, ibw, adjBw, used: null, usedLabel: null, heightMissingForBasis }
  }
  if (ibw == null || basis === "actual") {
    return { abw, ibw, adjBw, used: abw, usedLabel: "ABW", heightMissingForBasis }
  }
  if (basis === "ideal") {
    return { abw, ibw, adjBw, used: ibw, usedLabel: "IBW", heightMissingForBasis }
  }
  // basis === "adjusted" — ngưỡng 120% IBW (Chợ Rẫy 2024), KHÔNG phải 130% như bản trước.
  // Mốc nằm ở đúng 120%: ABW = 120% IBW đã tính là béo phì → AdjBW ("≥ 20% trên IBW").
  if (abw < OBESITY_IBW_RATIO * ibw) {
    return { abw, ibw, adjBw, used: abw, usedLabel: "ABW", heightMissingForBasis }
  }
  return { abw, ibw, adjBw, used: adjBw as number, usedLabel: "AdjBW", heightMissingForBasis }
}

/** BMI = kg / m². Trả về null khi thiếu cân nặng hoặc chiều cao. */
export function computeBMI(abwKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!abwKg || abwKg <= 0 || !heightCm || heightCm <= 0) return null
  const m = heightCm / 100
  return abwKg / (m * m)
}

export interface CrClWeightResult extends DosingWeightResult {
  // BMI đã dùng để quyết định — UI hiện kèm con số này để bác sĩ thấy VÌ SAO app chọn AdjBW thay
  // vì phải tự nhẩm lại. null khi thiếu chiều cao (khi đó luôn rơi về ABW).
  bmi: number | null
}

/**
 * Cân nặng dùng để ước tính CrCl (Cockcroft-Gault) — quy tắc RIÊNG, không dùng chung với liều mg/kg:
 * BMI > 30 kg/m² thì dùng AdjBW, còn lại dùng ABW (Chợ Rẫy 2024).
 *
 * Thiếu chiều cao ⇒ không có BMI ⇒ dùng ABW và bật `heightMissingForBasis` để UI nhắc nhập chiều
 * cao, thay vì im lặng coi như bệnh nhân không béo phì.
 */
export function resolveCrClWeight(
  abwInput: number | null | undefined,
  heightCm: number | null | undefined,
  sex: "male" | "female",
): CrClWeightResult {
  const abw = abwInput && abwInput > 0 ? abwInput : null
  const ibw = computeIBW(heightCm, sex)
  const adjBw = abw != null && ibw != null ? computeAdjBW(abw, ibw) : null
  const bmi = computeBMI(abw, heightCm)
  const heightMissingForBasis = bmi == null

  if (abw == null) {
    return { abw, ibw, adjBw, used: null, usedLabel: null, heightMissingForBasis, bmi }
  }
  if (bmi == null || adjBw == null || bmi <= CRCL_BMI_THRESHOLD) {
    return { abw, ibw, adjBw, used: abw, usedLabel: "ABW", heightMissingForBasis, bmi }
  }
  return { abw, ibw, adjBw, used: adjBw, usedLabel: "AdjBW", heightMissingForBasis, bmi }
}
