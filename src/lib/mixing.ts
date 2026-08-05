// ─── Tính chiều PHA THUỐC: ống ⇄ nồng độ ⇄ thể tích ───────────────────────────
//
// Tính năng tên là "pha thuốc" nhưng trước đây chỉ tính chiều ngược — từ nồng độ ra tốc độ. Việc
// pha thật sự lúc đứng cạnh giường là: lấy mấy ống, pha với bao nhiêu mL, ra nồng độ bao nhiêu.
// File này lo đúng chiều đó, cộng thêm hai câu hỏi luôn đi kèm:
//   - bơm 50 mL chạy 7 mL/giờ thì được bao lâu (để chuẩn bị bơm kế tiếp);
//   - bơm tiêm điện chỉ đặt được bước 0,1 mL/giờ, nên tốc độ tính ra phải làm tròn theo bước thật
//     và phải nói rõ sau khi làm tròn thì bệnh nhân THỰC SỰ nhận liều bao nhiêu.

import { massFactor, massOfConcUnit } from "./infusion"

// Bước đặt tốc độ nhỏ nhất của bơm tiêm điện thông dụng.
export const DEFAULT_PUMP_STEP = 0.1

export function roundToStep(value: number, step: number = DEFAULT_PUMP_STEP): number {
  if (!(step > 0)) return value
  return Math.round(value / step) * step
}

// ─── Quy cách ống/lọ ──────────────────────────────────────────────────────────
// Ống DUNG DỊCH và lọ BỘT là hai thao tác khác hẳn nhau, không thể dùng chung một con số thể tích:
//   - ống dung dịch: rút thẳng `volumeMl` mL ra khỏi ống;
//   - lọ bột: bơm `reconstituteMl` mL dung môi vào lọ, bột tan ra chiếm thêm `displacementMl` mL,
//     nên thứ rút ra được là `reconstituteMl + displacementMl` mL chứ không phải `reconstituteMl`.
// Bỏ qua phần bột chiếm chỗ là nguồn sai hệ thống: vancomycin 1 g chiếm ~0,7 mL, pha 10 mL thì
// nồng độ thực đã lệch 7% so với con số in ra.
// "fixed" = chai/túi pha sẵn hàm lượng CỐ ĐỊNH của nhà sản xuất (vd Levofloxacin 750 mg/150 mL):
// không pha loãng thêm, chỉ RÚT một phần hoặc dùng trọn chai — xem drawFromFixedVial() bên dưới.
export type VialForm = "solution" | "powder" | "fixed"

export interface VialSpec {
  form: VialForm
  // Ống dung dịch: thể tích dung dịch có sẵn trong một ống.
  volumeMl: number | null
  // Lọ bột: thể tích dung môi hoàn nguyên một lọ.
  reconstituteMl: number | null
  // Lọ bột: thể tích bột chiếm chỗ sau khi tan (thường in trên tờ hướng dẫn).
  displacementMl: number | null
}

// Thể tích rút ra được từ MỘT ống/lọ sau khi chuẩn bị xong. null nếu chưa đủ số liệu để nói.
export function volumePerVial(spec: VialSpec): number | null {
  if (spec.form === "powder") {
    if (spec.reconstituteMl == null || !(spec.reconstituteMl > 0)) return null
    return spec.reconstituteMl + (spec.displacementMl ?? 0)
  }
  return spec.volumeMl != null && spec.volumeMl > 0 ? spec.volumeMl : null
}

// Nồng độ sau khi pha `vials` ống (mỗi ống `vialAmount` `vialUnit`) vừa đủ `volumeMl` mL,
// quy về đơn vị của `concUnit` (vd "mg/mL"). null nếu hai đơn vị không cùng họ.
export function concentrationFromVials(
  vialAmount: number,
  vials: number,
  volumeMl: number,
  vialUnit: string,
  concUnit: string,
): number | null {
  if (!(vialAmount > 0) || !(vials > 0) || !(volumeMl > 0)) return null
  const f = massFactor(vialUnit, massOfConcUnit(concUnit))
  if (f == null) return null
  return (vialAmount * vials * f) / volumeMl
}

// Cần mấy ống để đạt nồng độ mong muốn trong `volumeMl` mL (số lẻ — UI tự làm tròn lên và nói rõ
// thể tích thực khi lấy tròn ống).
export function vialsForConcentration(
  targetConc: number,
  vialAmount: number,
  volumeMl: number,
  vialUnit: string,
  concUnit: string,
): number | null {
  if (!(targetConc > 0) || !(vialAmount > 0) || !(volumeMl > 0)) return null
  const f = massFactor(vialUnit, massOfConcUnit(concUnit))
  if (f == null || f === 0) return null
  return (targetConc * volumeMl) / (vialAmount * f)
}

// Thể tích cuối cần pha để `vials` ống ra đúng nồng độ mong muốn.
export function volumeForConcentration(
  targetConc: number,
  vialAmount: number,
  vials: number,
  vialUnit: string,
  concUnit: string,
): number | null {
  if (!(targetConc > 0) || !(vialAmount > 0) || !(vials > 0)) return null
  const f = massFactor(vialUnit, massOfConcUnit(concUnit))
  if (f == null) return null
  return (vialAmount * vials * f) / targetConc
}

// ─── Rút LẺ ống ───────────────────────────────────────────────────────────────
// Ép lấy nguyên ống là thói quen của máy tính, không phải của người pha: dobutamine 250 mg/20 mL
// cần 200 mg thì rút 16 mL là xong, không việc gì phải đổ cả ống rồi nâng thể tích cuối lên cho
// khớp. Chỉ áp dụng được khi biết thể tích rút ra từ một ống (xem volumePerVial).
export interface PartialDraw {
  // Thể tích thuốc phải rút ra.
  drawMl: number
  // Số ống phải BÓC (làm tròn lên) — phần còn thừa bỏ đi.
  vialsOpened: number
  // Số ống quy đổi ở dạng lẻ, dùng để mô tả lại tổng lượng thuốc.
  vialsUsed: number
}

export function partialDraw(
  targetConc: number,
  volumeMl: number,
  vialAmount: number,
  vialUnit: string,
  concUnit: string,
  spec: VialSpec,
): PartialDraw | null {
  if (!(targetConc > 0) || !(volumeMl > 0) || !(vialAmount > 0)) return null
  const per = volumePerVial(spec)
  if (per == null) return null
  const f = massFactor(vialUnit, massOfConcUnit(concUnit))
  if (f == null || f === 0) return null
  // Lượng thuốc cần, quy về đơn vị ghi trên ống.
  const neededMass = (targetConc * volumeMl) / f
  const vialsUsed = neededMass / vialAmount
  const drawMl = vialsUsed * per
  // Rút nhiều hơn cả thể tích cuối thì công thức không pha được — để chiều khác lo.
  if (!(drawMl > 0) || drawMl > volumeMl) return null
  return { drawMl, vialsOpened: Math.max(1, Math.ceil(vialsUsed - 1e-9)), vialsUsed }
}

// ─── Chai/túi pha sẵn hàm lượng cố định ────────────────────────────────────────
// Khác ống dung dịch (rút TRỌN ống rồi mới pha loãng thêm): chai cố định hàm lượng là chế phẩm
// thương mại đã pha sẵn đúng nồng độ (vd Levofloxacin 750 mg/150 mL), không pha loãng thêm — chỉ
// RÚT ra đúng lượng thuốc cần, hoặc dùng trọn chai nếu liều cần đúng bằng hàm lượng cả chai.

// Số mL cần rút từ MỘT chai cố định hàm lượng để đạt đúng `doseAmount` (đơn vị `doseUnit`).
// null nếu thiếu số liệu, hai đơn vị không cùng họ, hoặc liều cần vượt quá hàm lượng cả chai.
export function drawFromFixedVial(
  doseAmount: number,
  doseUnit: string,
  vialAmount: number,
  vialUnit: string,
  vialVolumeMl: number,
): number | null {
  if (!(doseAmount > 0) || !(vialAmount > 0) || !(vialVolumeMl > 0)) return null
  const f = massFactor(doseUnit, vialUnit)
  if (f == null) return null
  const doseInVialUnit = doseAmount * f
  if (doseInVialUnit > vialAmount + 1e-9) return null
  return (doseInVialUnit / vialAmount) * vialVolumeMl
}

// ─── Số giọt dịch truyền ────────────────────────────────────────────────────────
// Kháng sinh truyền tĩnh mạch (TTM) thường chạy bằng dây truyền thường (giọt), không phải bơm tiêm
// điện — công thức chuẩn: giọt/phút = (thể tích mL × giọt/mL của bộ dây) ÷ số phút truyền.
export const DEFAULT_DROP_FACTOR = 20 // giọt/mL — bộ dây thường (macro-drip) phổ biến ở VN
export const MICRO_DROP_FACTOR = 60 // giọt/mL — bộ dây vi giọt (micro-drip)

export function dropsPerMinute(volumeMl: number, durationMinutes: number, dropFactor: number = DEFAULT_DROP_FACTOR): number | null {
  if (!(volumeMl > 0) || !(durationMinutes > 0) || !(dropFactor > 0)) return null
  return (volumeMl * dropFactor) / durationMinutes
}

// Một số kháng sinh (vancomycin liều cao, một số truyền ngắt quãng khác) chạy bằng bơm tiêm điện/bơm
// thể tích thay vì dây truyền thường — tốc độ đặt thẳng mL/giờ, không đếm giọt. Cùng một cặp số liệu
// (thể tích + thời gian truyền dự kiến) như dropsPerMinute(), chỉ khác đơn vị ra.
export function pumpRateMlPerHour(volumeMl: number, durationMinutes: number): number | null {
  if (!(volumeMl > 0) || !(durationMinutes > 0)) return null
  return (volumeMl / durationMinutes) * 60
}

// ─── Chọn thể tích "dễ lấy nhất" trong một khoảng ──────────────────────────────
// Liều theo khoảng (vd Amikacin 5–7,5 mg/kg) quy đổi ra mL sẽ ra một khoảng lẻ (vd 35–52,5 mL).
// Người pha thực tế không rút đúng số lẻ máy tính ra — họ làm tròn tới vạch dễ đọc nhất trên bơm/xi
// lanh. Hàm này thử các bậc làm tròn từ THÔ tới MỊN (bội số 5 mL → 1 mL → 0,5 mL → 0,1 mL), trả về
// số "tròn" nhất ở bậc thô nhất tìm được mà KHÔNG VƯỢT cận trên của khoảng.
//
// Cố ý áp SÁT CẬN TRÊN chứ không lấy điểm giữa: khoảng liều đã được tác giả bậc liều xác nhận an
// toàn ở CẢ HAI đầu, nên làm tròn xuống gần cận trên không đưa thêm rủi ro nào ngoài rủi ro đã được
// chấp nhận sẵn trong khoảng đó — trong khi làm tròn thiếu (kiểu lấy điểm giữa) lại là rủi ro thật:
// dưới ngưỡng điều trị, nhất là với kháng sinh diệt khuẩn phụ thuộc nồng độ đỉnh (vd aminoglycosid).
export function pickEasiestVolume(loMl: number, hiMl: number): number {
  const lo = Math.min(loMl, hiMl)
  const hi = Math.max(loMl, hiMl)
  for (const step of [5, 1, 0.5, 0.1]) {
    const candidate = Math.floor(hi / step) * step
    if (candidate >= lo - 1e-9 && candidate <= hi + 1e-9) return Math.round(candidate * 100) / 100
  }
  return Math.round(((lo + hi) / 2) * 10) / 10
}

// Cùng triết lý với pickEasiestVolume() nhưng chọn SỐ LỌ/ỐNG thay vì thể tích — dùng khi bơm tiêm
// điện: người pha nhập hàm lượng 1 lọ/ống, app gợi ý luôn số lọ khớp khoảng liều (theo CrCl hoặc
// AdjBW) thay vì bắt tự nhẩm rồi gõ tay. Ưu tiên số NGUYÊN lọ (dễ lấy nhất, không phải chia lẻ một
// lọ bột đang hoàn nguyên dở) — chỉ lùi xuống bước 0,5 lọ khi không lọ nguyên nào rơi vào khoảng.
// Trả về null (không ép ra một số) nếu không có bước nào khớp — im lặng còn hơn gợi ý sai.
export function pickEasiestVialCount(loAmount: number, hiAmount: number, vialAmount: number): number | null {
  if (!(vialAmount > 0) || !(hiAmount > 0)) return null
  const lo = Math.min(loAmount, hiAmount) / vialAmount
  const hi = Math.max(loAmount, hiAmount) / vialAmount
  for (const step of [1, 0.5]) {
    const candidate = Math.floor(hi / step + 1e-9) * step
    if (candidate > 0 && candidate >= lo - 1e-9) return Math.round(candidate * 100) / 100
  }
  return null
}

// Bơm/chai `volumeMl` mL chạy ở `rate` mL/giờ thì hết sau bao nhiêu giờ.
export function infusionDurationHours(volumeMl: number, rate: number): number | null {
  if (!(volumeMl > 0) || !(rate > 0)) return null
  return volumeMl / rate
}

// "7.15" → "7 giờ 09 phút"; "0.63" → "38 phút"; "50.5" → "2 ngày 2 giờ 30 phút".
export function formatDuration(hours: number): string {
  if (!(hours > 0)) return "—"
  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / (60 * 24))
  const h = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const m = totalMinutes - days * 60 * 24 - h * 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ngày`)
  if (h > 0) parts.push(`${h} giờ`)
  if (m > 0) parts.push(`${days > 0 || h > 0 ? String(m).padStart(2, "0") : m} phút`)
  return parts.join(" ") || "dưới 1 phút"
}

// Tổng lượng thuốc trong bơm/chai — dùng để nói "50 mL nồng độ 0,08 mg/mL = 4 mg".
export function totalAmountInBag(volumeMl: number, concValue: number): number | null {
  if (!(volumeMl > 0) || !(concValue > 0)) return null
  return volumeMl * concValue
}

// ─── Kiểm tra vật lý tối thiểu ────────────────────────────────────────────────
// "4 ống pha vừa đủ 2 mL" là phép tính ra được số nhưng không pha được: riêng 4 ống đã hơn 2 mL.
// Máy tính nào cũng nên biết chuyện đó trước khi in ra một con số nồng độ.

export function vialsTotalVolume(vials: number, spec: VialSpec): number | null {
  const per = volumePerVial(spec)
  if (per == null || !(vials > 0)) return null
  return vials * per
}

// Lượng dung môi phải thêm = thể tích cuối − thể tích thuốc rút ra. Trả về null nếu không tính được,
// số ÂM nếu thể tích cuối nhỏ hơn thể tích thuốc (tức là công thức bất khả thi).
export function diluentVolume(finalMl: number, vialsVolumeMl: number | null): number | null {
  if (vialsVolumeMl == null || !(finalMl > 0)) return null
  return finalMl - vialsVolumeMl
}

// ─── Phân độ nồng độ pha ──────────────────────────────────────────────────────
// Một dòng vàng nhạt cho cả "đặc hơn 1%" lẫn "đặc hơn 1000 lần" là vô dụng: trường hợp thứ hai
// (bấm nhầm nút đơn vị g thay vì mg) mới là thứ giết người, và nó phải trông khác hẳn.

export type ConcSeverity = "ok" | "note" | "warn" | "danger"

export interface ConcGrade {
  severity: ConcSeverity
  factor: number | null
  headline: string | null
  detail: string | null
  // Chặn kết quả cho tới khi người dùng xác nhận, giống bên máy tính liều.
  requiresConfirm: boolean
}

export const CONC_OK: ConcGrade = { severity: "ok", factor: null, headline: null, detail: null, requiresConfirm: false }

function fmtX(f: number): string {
  if (f >= 10) return String(Math.round(f))
  return (Math.round(f * 10) / 10).toString().replace(/\.0$/, "")
}

// `refConc`/`refLabel`: mốc để so sánh. Khi người dùng đã lưu công thức pha của mình thì mốc đó
// PHẢI là công thức đã lưu, không phải công thức dựng sẵn của app — nếu không, một người pha đặc
// gấp đôi cố định sẽ ăn cảnh báo cam mỗi lần mở máy tính, và cảnh báo nào lặp lại vô cớ thì đến
// lúc nó đúng cũng không còn ai đọc.
export function gradeConcentration(
  conc: number | null,
  refConc: number | undefined,
  maxConc: number | undefined,
  concUnit: string,
  refLabel: string = "công thức chuẩn",
): ConcGrade {
  if (conc == null || !(conc > 0)) return CONC_OK

  // Ngưỡng trên của nồng độ pha là giới hạn cứng (độ tan / khuyến cáo nhà sản xuất) — vượt là chặn,
  // bất kể so với công thức đang dùng thế nào.
  if (maxConc != null && conc > maxConc) {
    return {
      severity: "danger",
      factor: conc / maxConc,
      headline: "VƯỢT NGƯỠNG TRÊN NỒNG ĐỘ PHA",
      // Cố ý KHÔNG nêu lý do cụ thể ở đây: mỗi thuốc một lý do khác nhau (amiodarone gây viêm tĩnh
      // mạch, kali đậm đặc gây ngừng tim, magie là chế phẩm chưa pha loãng). Dòng này chỉ nói đúng
      // bản chất của cái ngưỡng.
      detail: `Nồng độ ${conc} ${concUnit} vượt ngưỡng trên ${maxConc} ${concUnit} của thuốc này. Đây là giới hạn TUYỆT ĐỐI, không phải chuyện khác thói quen pha — kiểm tra lại trước khi tiếp tục.`,
      requiresConfirm: true,
    }
  }

  if (refConc == null || !(refConc > 0)) return CONC_OK
  const factor = conc / refConc
  if (factor > 5) {
    return {
      severity: "danger",
      factor,
      headline: `ĐẶC GẤP ${fmtX(factor)} LẦN ${refLabel.toUpperCase()}`,
      detail: `${refLabel} là ${refConc} ${concUnit}. Chênh lệch cỡ này thường do gõ nhầm chữ số hoặc chọn nhầm đơn vị (g thay vì mg).`,
      requiresConfirm: true,
    }
  }
  if (factor > 2) {
    return {
      severity: "warn",
      factor,
      headline: `Đặc gấp ${fmtX(factor)} lần ${refLabel}`,
      detail: `${refLabel} là ${refConc} ${concUnit} — kiểm tra lại ô nồng độ ở máy tính liều.`,
      requiresConfirm: false,
    }
  }
  if (factor > 1.001) {
    return {
      severity: "note",
      factor,
      headline: null,
      detail: `Đặc hơn ${refLabel} (${refConc} ${concUnit}) ${fmtX(factor)} lần.`,
      requiresConfirm: false,
    }
  }

  // ─── Chiều LOÃNG ───────────────────────────────────────────────────────────
  // Gõ nhầm thể tích cuối 500 thay vì 50 cũng là lỗi một phím, và hậu quả không nhẹ hơn: muốn ra
  // cùng một liều thì tốc độ bơm phải cao gấp đúng chừng đó lần — rơi thẳng vào nhóm bệnh nhân
  // đang hạn chế dịch.
  //
  // Nhưng KHÔNG chặn như chiều đặc, vì pha loãng thường là CHỦ Ý. Vì vậy chiều này cảnh báo và nói
  // thẳng hệ quả lên tốc độ bơm, để người dùng tự phân biệt "tôi cố ý" với "tôi gõ nhầm".
  const dilution = refConc / conc
  if (dilution > 5) {
    return {
      severity: "warn",
      factor: dilution,
      headline: `LOÃNG GẤP ${fmtX(dilution)} LẦN ${refLabel.toUpperCase()}`,
      detail: `${refLabel} là ${refConc} ${concUnit}. Nếu là chủ ý thì bỏ qua; nếu gõ nhầm thể tích cuối thì tốc độ bơm sẽ cao gấp ${fmtX(dilution)} lần để ra cùng liều.`,
      requiresConfirm: false,
    }
  }
  if (dilution > 2) {
    return {
      severity: "note",
      factor: dilution,
      headline: null,
      detail: `Loãng hơn ${refLabel} (${refConc} ${concUnit}) ${fmtX(dilution)} lần — tốc độ bơm sẽ cao hơn tương ứng.`,
      requiresConfirm: false,
    }
  }
  return CONC_OK
}
