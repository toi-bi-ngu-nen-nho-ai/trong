// ─── Kiểm tra an toàn liều ────────────────────────────────────────────────────
//
// Vấn đề đang sửa: app đã có sẵn doseMin/doseMax của từng thuốc nhưng chỉ IN RA dòng "gợi ý liều
// tham khảo" rồi không dùng con số đó để kiểm tra gì cả. Nhập 50 mcg/kg/phút dobutamine thay vì 5,
// app vẫn bình thản trả về một con số trong ô xanh dịu dàng y hệt lúc nhập đúng.
//
// Nguyên tắc ở đây: mọi phép so sánh đều quy về ĐƠN VỊ GỐC của thuốc (nơi doseMin/doseMax được khai
// báo), nên đổi đơn vị hiển thị không làm mất cảnh báo. Không quy đổi được (thiếu cân nặng) thì trả
// về "unknown" — nói rõ là CHƯA kiểm tra được, chứ không im lặng coi như đạt.

import { convertDoseValue, formatDoseNumber, type DoseUnit } from "./infusion"
import { scrToMgDl } from "./patient"

export type DoseSeverity =
  | "unknown" // chưa đủ dữ liệu để kiểm tra (thiếu cân nặng, đơn vị không quy đổi được)
  | "far-below" // thấp hơn liều tối thiểu ≥ 10 lần — nhiều khả năng gõ nhầm dấu thập phân
  | "below" // thấp hơn liều tối thiểu gợi ý
  | "ok"
  | "above" // cao hơn liều tối đa gợi ý (< 2 lần)
  | "high" // 2–10 lần liều tối đa
  | "extreme" // ≥ 10 lần liều tối đa

export interface DoseCheck {
  severity: DoseSeverity
  // Số lần vượt liều tối đa (severity above/high/extreme) hoặc số lần thấp hơn liều tối thiểu
  // (below/far-below). null khi ok/unknown.
  factor: number | null
  // Dòng chữ to, in hoa cho các mức nguy hiểm — thứ phải đập vào mắt lúc 2 giờ sáng.
  headline: string | null
  detail: string | null
  // Bắt người dùng bấm xác nhận trước khi app hiện con số tốc độ truyền.
  requiresConfirm: boolean
}

export const DOSE_OK: DoseCheck = { severity: "ok", factor: null, headline: null, detail: null, requiresConfirm: false }

function fmtFactor(f: number): string {
  if (f >= 10) return String(Math.round(f))
  // Dấu thập phân "," tiếng Việt (/impeccable critique 2026-08-31, P3).
  return f.toFixed(1).replace(/\.0$/, "").replace(".", ",")
}

// So liều người dùng nhập (theo `unit` đang chọn) với khoảng liều khai báo của thuốc (theo `ownUnit`).
//
// Hai mốc, không phải một (xem ghi chú `doseAbsMax` trong data/types.ts):
//   - doseMax    = trên khoảng THƯỜNG DÙNG → cảnh báo, vẫn hiện kết quả.
//   - doseAbsMax = NGƯỠNG TRÊN tuyệt đối → chặn, bắt xác nhận.
// Trước đây chỉ có doseMax nên noradrenaline 2 mcg/kg/phút (liều sốc kháng trị hoàn toàn có thật,
// chính phần mô tả của thuốc cũng nói "tăng đến 1–3") bị chặn cứng như một lỗi gõ nhầm — báo động
// giả đúng vào lúc bệnh nhân nặng nhất và người dùng bận nhất, tức là cách nhanh nhất để họ học
// thói quen bấm bỏ qua mọi cảnh báo.
export function checkInfusionDose(
  doseValue: number,
  unit: DoseUnit,
  ownUnit: DoseUnit,
  doseMin: number,
  doseMax: number,
  weightKg: number | null,
  doseAbsMax?: number,
): DoseCheck {
  if (!(doseValue > 0) || !(doseMax > 0)) return { ...DOSE_OK, severity: "unknown" }

  const inOwn = unit.id === ownUnit.id ? doseValue : convertDoseValue(doseValue, unit, ownUnit, weightKg)
  if (inOwn == null) {
    return {
      severity: "unknown",
      factor: null,
      headline: null,
      detail: "Chưa kiểm tra được liều so với khoảng khuyến cáo (thiếu cân nặng để quy đổi đơn vị).",
      requiresConfirm: false,
    }
  }

  // Chưa khai báo ngưỡng trên tuyệt đối thì giữ nguyên hành vi cũ (chặn từ 2 lần doseMax) — không im lặng
  // bỏ chặn chỉ vì thiếu một trường dữ liệu.
  //
  // Cho phép doseAbsMax BẰNG doseMax: với nitroprusside (độc tính cyanide), nicardipine, lidocaine,
  // KCl thì con số tối đa thường dùng CHÍNH LÀ ngưỡng trên cứng — vượt một chút cũng phải chặn, không có
  // vùng "cao nhưng chấp nhận được" ở giữa.
  const absMax = doseAbsMax != null && doseAbsMax >= doseMax ? doseAbsMax : doseMax * 2

  if (inOwn > absMax) {
    const factor = inOwn / absMax
    const asOwn = `${formatDoseNumber(inOwn)} ${ownUnit.id} · ngưỡng trên tuyệt đối ${formatDoseNumber(absMax)} ${ownUnit.id}`
    if (factor >= 5) {
      return {
        severity: "extreme",
        factor: inOwn / doseMax,
        headline: `GẤP ${fmtFactor(inOwn / doseMax)} LẦN LIỀU THƯỜNG DÙNG`,
        detail: `Liều đang nhập ${asOwn}. Chênh lệch cỡ này gần như luôn là sai dấu thập phân hoặc sai đơn vị — kiểm tra lại trước khi đặt bơm.`,
        requiresConfirm: true,
      }
    }
    return {
      severity: "high",
      factor: inOwn / doseMax,
      headline: "VƯỢT NGƯỠNG TRÊN TUYỆT ĐỐI CỦA THUỐC",
      detail: `Liều đang nhập ${asOwn}. Đây không còn là chuyện "liều cao ở bệnh nhân nặng" — kiểm tra lại đơn vị và dấu thập phân.`,
      requiresConfirm: true,
    }
  }

  if (inOwn > doseMax) {
    const factor = inOwn / doseMax
    const asOwn = `${formatDoseNumber(inOwn)} ${ownUnit.id} · khoảng thường dùng ${String(doseMin).replace(".", ",")}–${String(doseMax).replace(".", ",")} ${ownUnit.id}`
    return {
      severity: "above",
      factor,
      // Cố ý KHÔNG chặn: đây là vùng liều hợp lệ ở bệnh nhân nặng. Nói rõ còn cách ngưỡng trên bao nhiêu
      // để người dùng biết mình đang ở đâu, thay vì chỉ nghe "cao hơn khuyến cáo".
      headline: `Trên khoảng thường dùng (${fmtFactor(factor)} lần)`,
      detail: `Liều đang nhập ${asOwn}${doseAbsMax != null ? `; ngưỡng trên tuyệt đối ${formatDoseNumber(doseAbsMax)} ${ownUnit.id}` : ""}. Chấp nhận được ở bệnh nhân nặng nếu đúng chủ ý — vẫn phải đối chiếu đáp ứng lâm sàng.`,
      requiresConfirm: false,
    }
  }

  if (inOwn < doseMin && doseMin > 0) {
    const factor = doseMin / inOwn
    const asOwn = `${formatDoseNumber(inOwn)} ${ownUnit.id} · khoảng khuyến cáo ${String(doseMin).replace(".", ",")}–${String(doseMax).replace(".", ",")} ${ownUnit.id}`
    if (factor >= 10) {
      return {
        severity: "far-below",
        factor,
        headline: `THẤP HƠN LIỀU TỐI THIỂU ${fmtFactor(factor)} LẦN`,
        detail: `Liều đang nhập ${asOwn}. Kiểm tra lại dấu thập phân và đơn vị.`,
        requiresConfirm: false,
      }
    }
    return {
      severity: "below",
      factor,
      headline: "Thấp hơn liều tối thiểu gợi ý",
      detail: `Liều đang nhập ${asOwn}.`,
      requiresConfirm: false,
    }
  }

  return DOSE_OK
}

// Màu cho ô kết quả theo mức độ. Ô kết quả PHẢI đổi màu — nếu liều sai mà ô vẫn xanh dịu như lúc
// đúng thì cảnh báo có viết ở đâu cũng dễ bị lướt qua.
export interface SeverityStyle {
  bg: string
  border: string
  text: string
  label: string
}

export const SEVERITY_STYLE: Record<DoseSeverity, SeverityStyle> = {
  unknown: { bg: "var(--c-surface-alt)", border: "var(--c-line)", text: "var(--c-text-soft)", label: "Chưa kiểm tra được" },
  "far-below": { bg: "var(--c-warn-soft)", border: "var(--c-warn-line)", text: "var(--c-warn-icon)", label: "Quá thấp" },
  below: { bg: "var(--c-warn-soft)", border: "var(--c-warn-line)", text: "var(--c-warn-icon)", label: "Dưới khoảng khuyến cáo" },
  // text KHÔNG dùng --c-primary: đây là con số liều/tốc độ ĐẶT BƠM — DESIGN.md yêu cầu "thứ ồn nhất
  // trên màn liều luôn là tín hiệu nguy hiểm, không bao giờ là thương hiệu". Trước đây "ok" tô con số
  // 24px (T.metric, cỡ LỚN NHẤT toàn thang chữ) bằng đúng màu thương hiệu — một liều bình thường lại
  // to và bão hoà màu hơn cảnh báo "KHÔNG tương hợp" đứng ngay gần đó. Nền/viền vẫn giữ primary-soft
  // (chỉ là một dải nền dịu, đúng vai trò trang trí) — chỉ đổi màu CHỮ sang trung tính.
  ok: { bg: "var(--c-primary-soft)", border: "var(--c-primary-line)", text: "var(--c-text)", label: "Trong khoảng khuyến cáo" },
  // "above" trước tô cam riêng khỏi "below"/"far-below" (hổ phách) — trong buồng tối hai màu gần
  // như không phân biệt được, nên chỉ còn hai bậc màu thật sự: nguy hiểm (đỏ) và thận trọng (hổ
  // phách). Nhãn ("Trên khoảng khuyến cáo") vẫn nói rõ khác với "Dưới khoảng khuyến cáo".
  above: { bg: "var(--c-warn-soft)", border: "var(--c-warn-line)", text: "var(--c-warn-icon)", label: "Trên khoảng khuyến cáo" },
  high: { bg: "var(--c-danger-soft)", border: "var(--c-danger-line-2)", text: "var(--c-danger)", label: "Vượt liều tối đa" },
  extreme: { bg: "var(--c-danger-soft)", border: "var(--c-danger-icon)", text: "var(--c-danger-deep)", label: "Vượt liều tối đa rất nhiều" },
}

// ─── Kiểm tra cân nặng ────────────────────────────────────────────────────────
// Gõ nhầm 700 kg hay 7 kg thì app cũng nhận hết, mà cân nặng là hệ số nhân thẳng vào mọi liều
// mcg/kg/phút — sai một chữ số là sai cả liều.

export type WeightSeverity = "ok" | "check" | "implausible"

export interface WeightCheck {
  severity: WeightSeverity
  message: string
}

// Số đo cơ thể chỉ cần tối đa một chữ số thập phân — "7.00 kg" đọc như một kết quả tính toán chứ
// không giống con số vừa gõ vào.
function fmtMeasure(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10)
}

export function checkWeight(kg: number | null | undefined): WeightCheck | null {
  if (kg == null || !(kg > 0)) return null
  if (kg < 2 || kg > 400) {
    return { severity: "implausible", message: `${fmtMeasure(kg)} kg gần như chắc chắn là gõ nhầm — kiểm tra lại trước khi dùng bất kỳ liều nào.` }
  }
  if (kg < 30) {
    return { severity: "check", message: `${fmtMeasure(kg)} kg — dữ liệu liều trong app dành cho NGƯỜI LỚN. Với trẻ em phải tra liều nhi khoa riêng.` }
  }
  if (kg > 200) {
    return { severity: "check", message: `${fmtMeasure(kg)} kg — kiểm tra lại cân nặng; với người béo phì nhiều thuốc cần cân nặng lý tưởng/hiệu chỉnh chứ không phải cân nặng thực.` }
  }
  return { severity: "ok", message: "" }
}

export function checkHeight(cm: number | null | undefined): WeightCheck | null {
  if (cm == null || !(cm > 0)) return null
  if (cm < 100 || cm > 230) {
    return { severity: "implausible", message: `Chiều cao ${fmtMeasure(cm)} cm bất thường — kiểm tra lại (ảnh hưởng trực tiếp tới IBW/AdjBW và CrCl).` }
  }
  return { severity: "ok", message: "" }
}

export function checkAge(years: number | null | undefined): WeightCheck | null {
  if (years == null || !(years > 0)) return null
  if (years > 120) return { severity: "implausible", message: `Tuổi ${fmtMeasure(years)} bất thường — kiểm tra lại.` }
  if (years < 18) return { severity: "check", message: `Tuổi ${fmtMeasure(years)} — dữ liệu liều trong app dành cho người lớn.` }
  return { severity: "ok", message: "" }
}

// Creatinine là hệ số chia thẳng trong Cockcroft-Gault (CrCl = ... / (72 × Scr)) — gõ nhầm dấu thập
// phân ở đây (vd "0.1" thay vì "1.0" mg/dL) thổi phồng CrCl mà không có cảnh báo nào, rồi con số sai
// đó đi thẳng vào chọn mức liều kháng sinh. weightWarn/heightWarn/ageWarn đều có kiểm tra độ hợp lý
// ba mức; trước đây creatinine chỉ có hasInvalidNumericInput (kiểm tra KÝ TỰ, không kiểm tra ĐỘ LỚN)
// — lệch khỏi mẫu chung của ba trường còn lại (/impeccable critique 2026-08-18).
export function checkScr(value: number | null | undefined, unit: "mgdl" | "umol"): WeightCheck | null {
  if (value == null || !(value > 0)) return null
  const mgdl = scrToMgDl(value, unit)
  const unitLabel = unit === "umol" ? "µmol/L" : "mg/dL"
  if (mgdl < 0.1 || mgdl > 20) {
    return {
      severity: "implausible",
      message: `Creatinin ${fmtMeasure(value)} ${unitLabel} bất thường — kiểm tra lại trước khi dùng CrCl để chọn liều.`,
    }
  }
  return { severity: "ok", message: "" }
}
