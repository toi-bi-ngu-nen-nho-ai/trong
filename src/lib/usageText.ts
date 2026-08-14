// ─── Câu "Cách dùng" theo mẫu chuẩn của khoa ───────────────────────────────────
//
// Mỗi dạng chế phẩm có một câu tốc ký khác nhau mà điều dưỡng ghi lên nhãn bơm/chai — ba dạng ứng
// với ba cách pha trong lib/mixing.ts:
//   a. Ống dung dịch pha loãng qua bơm tiêm điện: "Noradrenalin 4 mg/4 ml 2 ống với NaCl 0.9% đủ
//      50 ml BTĐ 5 ml/h"
//   b. Lọ bột pha rồi truyền nhỏ giọt: "Cefoperazol 2 g 1 lọ pha với NaCl 0,9% (TTM) XX giọt/phút"
//      — hoặc ống dung dịch pha loãng đủ một thể tích rồi RÚT MỘT PHẦN ra truyền nhỏ giọt (liều
//      CrCl tính ra không cần trọn lượng đã pha): "Amikacin 1 g/4 ml pha với NaCl 0.9% đủ 100 ml
//      lấy 50 ml (TTM) XX giọt/phút"
//   c. Chai cố định hàm lượng: "Levofloxacin 750 mg/150 ml 1 chai" (dùng trọn) hoặc "... lấy 500 mg
//      (TTM) XX giọt/phút" (rút một phần)
//
// Các hàm ở đây CHỈ định dạng câu chữ từ số đã tính sẵn (lib/mixing.ts) — không tự tính toán gì
// thêm, để nơi gọi (App.tsx) chịu trách nhiệm tính đúng số trước khi format.

import { trim } from "./ui"
import { formatMass } from "./perKgDose"

export function formatAmpouleUsage(params: {
  name: string
  vialAmount: number
  vialUnit: string
  vialVolumeMl: number
  vialsUsed: number
  diluentName: string
  finalVolumeMl: number
  rateMlPerHour: number
}): string {
  const { name, vialAmount, vialUnit, vialVolumeMl, vialsUsed, diluentName, finalVolumeMl, rateMlPerHour } = params
  // Mọi con số trong câu này đi qua trim() để số tròn đọc "5 ml/h" đúng như mẫu chuẩn, không phải
  // "5.00 ml/h" — formatDoseNumber() cố định số lẻ theo độ lớn nên không tự bỏ số 0 thừa.
  return `${name} ${trim(vialAmount)} ${vialUnit}/${trim(vialVolumeMl)} ml ${trim(vialsUsed, 0)} ống với ${diluentName} đủ ${trim(finalVolumeMl)} ml BTĐ ${trim(rateMlPerHour)} ml/h`
}

export function formatVialUsage(params: {
  name: string
  vialAmount: number
  vialUnit: string
  // Luôn hiện "{n} {vialLabel}" ngay sau phần hàm lượng khi có truyền vào — kể cả khi n = 1 ("1
  // lọ"), giống cách mẫu 3c luôn nói "1 chai". Điều dưỡng đọc nhãn bơm cần thấy rõ số lượng đã
  // dùng, không suy luận ngầm rằng thiếu số nghĩa là 1. Không truyền vialsUsed thì không nói gì
  // (mẫu chưa biết số lượng, khác với biết chắc là 1).
  vialsUsed?: number
  vialLabel?: string
  // Ống dung dịch có sẵn thể tích riêng (vd Amikacin 1 g/4 ml, mẫu 4b) thì hiện kèm "/x ml" như ống
  // — bỏ trống cho lọ bột chưa có thể tích tới khi hoàn nguyên (Cefoperazol, mẫu 3b).
  vialVolumeMl?: number
  diluentName: string
  route: "TTM" | "TMC" | "IM" | "SC"
  // Pha loãng đủ finalVolumeMl rồi RÚT MỘT PHẦN drawMl ra dùng (mẫu 4b: đủ 100 ml lấy 50 ml) — bỏ
  // trống nếu liều cần đúng bằng trọn lượng vừa pha, không cần rút riêng (mẫu 3b).
  finalVolumeMl?: number
  drawMl?: number
  dropsPerMin?: number | null
  // Truyền qua bơm tiêm điện/bơm thể tích thay vì đếm giọt — vancomycin và một số kháng sinh khác
  // bắt buộc chạy bơm vì tốc độ quá chậm để đếm giọt chính xác. Chỉ TRUYỀN VÀO một trong hai
  // (dropsPerMin HOẶC rateMlPerHour) tuỳ deliveryDevice của công thức — xem AntibioticDoseCard.
  rateMlPerHour?: number | null
}): string {
  const { name, vialAmount, vialUnit, vialsUsed, vialLabel, vialVolumeMl, diluentName, route, finalVolumeMl, drawMl, dropsPerMin, rateMlPerHour } = params
  const strength = vialVolumeMl != null ? `${trim(vialAmount)} ${vialUnit}/${trim(vialVolumeMl)} ml` : formatMass(vialAmount, vialUnit)
  const countPart = vialsUsed != null ? ` ${vialsUsed > 1 ? trim(vialsUsed, 0) : "1"} ${vialLabel ?? "ống"}` : ""
  // Ba trường hợp, không phải hai:
  //   - pha đủ X mL rồi RÚT một phần Y mL  → "đủ X ml lấy Y ml" (mẫu 4b)
  //   - pha đủ X mL rồi truyền TRỌN mẻ đó  → "đủ X ml" — vẫn PHẢI nói thể tích pha loãng
  //   - chưa biết thể tích cuối             → không nói gì
  // Trước đây hai trường hợp đầu gộp làm một (đòi có CẢ finalVolumeMl lẫn drawMl), nên câu "dùng trọn
  // mẻ" rơi thẳng xuống nhánh cuối và mất sạch thể tích: "Amikacin 1000 mg/4 ml pha với NaCl 0,9%
  // (TTM)" — pha với bao nhiêu mL thì không ai biết. Với một kháng sinh bắt buộc pha loãng thì đó là
  // thiếu đúng con số quan trọng nhất của câu.
  const drawPart =
    finalVolumeMl == null ? "" : drawMl != null ? ` đủ ${trim(finalVolumeMl)} ml lấy ${trim(drawMl)} ml` : ` đủ ${trim(finalVolumeMl)} ml`
  const base = `${name} ${strength}${countPart} pha với ${diluentName}${drawPart} (${route})`
  // Chỉ đường TTM mới có tốc độ truyền (giọt/phút hoặc BTĐ) — TMC là tiêm thẳng một lần, IM/SC
  // không có khái niệm tốc độ truyền.
  if (route !== "TTM") return base
  if (rateMlPerHour != null) return `${base} BTĐ ${trim(rateMlPerHour)} ml/h`
  if (dropsPerMin == null) return base
  return `${base} ${trim(dropsPerMin, 0)} giọt/phút`
}

export function formatFixedUsage(params: {
  name: string
  vialAmount: number
  vialUnit: string
  vialVolumeMl: number
  // Gộp NHIỀU CHAI khi liều cần vượt một chai — mặc định 1 (không đổi câu chữ so với trước khi chỉ
  // dùng một chai duy nhất). Nói rõ số chai ngay trong câu, không chỉ nói tổng hàm lượng: "lấy 1500
  // mg" từ MỘT chai 750 mg nghe như lỗi (750 mg làm sao ra 1500 mg) nếu không nói kèm "2 chai".
  vialsUsed?: number
  // Trọn chai: bỏ trống doseAmount/drawMl. Lấy một phần: truyền đủ doseAmount + drawMl + đơn vị liều.
  doseAmount?: number
  doseUnit?: string
  route?: "TTM" | "TMC" | "IM" | "SC"
  dropsPerMin?: number | null
  rateMlPerHour?: number | null
}): string {
  const { name, vialAmount, vialUnit, vialVolumeMl, vialsUsed, doseAmount, doseUnit, route, dropsPerMin, rateMlPerHour } = params
  const bottle = `${name} ${trim(vialAmount)} ${vialUnit}/${trim(vialVolumeMl)} ml`
  const pooled = vialsUsed != null && vialsUsed > 1
  // Trước đây nhánh "dùng trọn chai" (doseAmount == null — trường hợp THƯỜNG GẶP NHẤT, vd Levofloxacin
  // dùng cả chai) return NGAY tại đây, không bao giờ chạy tới phần route/giọt-phút/BTĐ bên dưới — kết
  // quả là câu "Cách dùng" thiếu hẳn đường dùng và tốc độ truyền đúng lúc cần nhất. Gộp chung một
  // điểm `base` rồi cùng đi qua phần tốc độ ở cuối, giống hệt nhánh "lấy một phần".
  const base = doseAmount == null
    ? `${bottle}${pooled ? ` ${trim(vialsUsed, 0)} chai` : " 1 chai"}${route ? ` (${route})` : ""}`
    : `${bottle}${pooled ? ` ${trim(vialsUsed, 0)} chai` : ""} lấy ${trim(doseAmount)} ${doseUnit ?? vialUnit}${route ? ` (${route})` : ""}`
  if (route !== "TTM") return base
  if (rateMlPerHour != null) return `${base} BTĐ ${trim(rateMlPerHour)} ml/h`
  if (dropsPerMin == null) return base
  return `${base} ${trim(dropsPerMin, 0)} giọt/phút`
}
