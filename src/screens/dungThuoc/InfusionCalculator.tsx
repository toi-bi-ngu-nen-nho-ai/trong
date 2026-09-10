import { useState, useRef, useEffect, useMemo } from "react"
import type { DiseaseEntry, InfusionCalcConfig, InfusionDrug, SourceInfo } from "../../data/types"
import { resolveDosingWeight } from "../../lib/bodyWeight"
import { SEVERITY_STYLE, checkInfusionDose, type DoseCheck } from "../../lib/doseSafety"
import { DEFAULT_PUMP_STEP, formatDuration, gradeConcentration, infusionDurationHours, roundToStep, totalAmountInBag } from "../../lib/mixing"
import { formatAmpouleUsage } from "../../lib/usageText"
import { formatSavedAt } from "../../lib/wardRecipes"
import { useStickyState } from "../../lib/uiState"
import { resolveConfirmTap, shouldRequireExtraConfirm } from "../../lib/confirmGate"
import { formatMass } from "../../lib/perKgDose"
import { tickHaptic } from "../../lib/haptics"
import { doseToRate, doseUnitOptions, formatDoseNumber, massFactor, massOfConcUnit, parseDoseUnit, rateToDose } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { BTN_BLOCK, BTN_TALL, C, CHIP, FIELD, FIELD_STYLE, NUM, NUM_DOSE, PROSE, R, T, TAP, trim } from "../../lib/ui"
import { useDosing } from "./context"
import { useActiveWardRecipe, WardRecipeChips, CompatWarningForDrug } from "./antibioticMixingHelpers"
import { useCountUp, Note, Disclosure, ConfirmIconButton, SourceLine, CONFIRM_EXTREME_RESET_MS } from "./sharedUi"
import { normalizeDecimalInput } from "./numberInput"
import { MixPanel } from "./MixPanel"
import { BolusList } from "./infusionMixing"
import { DrugWarnings } from "./CalcLogSheet"

function InfusionCalculator({ drug, calc }: { drug: InfusionDrug; calc: InfusionCalcConfig }) {
  const { abwKg, heightCm, patient, openPatientPanel, pinRunning, logCalc, wardRecipes, saveWard, clearWard, pinWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  // Công thức đã lưu GẦN NHẤT là mặc định thật sự của thuốc này lúc MỞ THẺ — không bắt gõ lại mỗi
  // lần mở (chỉ dùng để khởi tạo `conc`/`bagVolume` bên dưới). Sau đó `ward` đổi theo chip người dùng
  // BẤM chọn (kể cả "Công thức hệ thống") — xem useActiveWardRecipe và hàng chip trong "Cách dùng ·
  // Pha thuốc".
  const { activeId: activeRecipeId, setActiveId: setActiveRecipeId, active: ward } = useActiveWardRecipe(wardList)
  const unitOptions = useMemo(() => doseUnitOptions(calc.doseUnit, calc.concUnit), [calc.doseUnit, calc.concUnit])
  const [unitId, setUnitId] = useState(calc.doseUnit)
  const [mode, setMode] = useState<"doseToRate" | "rateToDose">("doseToRate")
  // Bốn ô này trước đây dùng useState thường, trong khi mọi lớp chọn khác của thẻ thuốc (tab, thuốc,
  // bệnh lý, đường dùng) đều useStickyState — bị cắt ngang (cuộc gọi, báo động, chuyển màn xem cái
  // khác rồi quay lại) là mất trắng số đang gõ, không một dấu hiệu. Khoá theo drug.id vì
  // InfusionCalculator bị gỡ khỏi cây và dựng lại mỗi lần đổi thuốc đang mở.
  const [conc, setConc] = useStickyState(
    `infusion.calc.conc.${drug.id}`,
    ward ? String(ward.concValue) : calc.concDefault != null ? String(calc.concDefault) : "",
  )
  const [dose, setDose] = useStickyState(`infusion.calc.dose.${drug.id}`, "")
  const [rateInput, setRateInput] = useStickyState(`infusion.calc.rate.${drug.id}`, "")
  const [bagVolume, setBagVolume] = useStickyState(
    `infusion.calc.bagVolume.${drug.id}`,
    ward ? String(ward.volumeMl) : calc.mix ? String(calc.mix.volumeMl) : "",
  )
  const [showMix, setShowMix] = useState(false)
  // Cảnh báo ngoại biên trước đây LUÔN vẽ đủ 2 câu (~257px) ngay khi vượt ngưỡng, đẩy khung kết quả
  // ra xa ô nhập liều gần nửa màn hình. Mặc định chỉ hiện một dòng khẳng định + nút xem chi tiết —
  // vẫn không bao giờ im lặng (đây là cảnh báo an toàn), chỉ không còn chiếm chỗ cố định.
  const [showPeripheralDetail, setShowPeripheralDetail] = useState(false)
  // "Xoá công thức này" xoá dữ liệu ĐÃ LƯU (không phải dòng nháp) nên cần xác nhận hai chạm giống
  // ConfirmIconButton — nhãn tự đổi thành "Chắc chắn xoá?" ở chạm đầu, rời tay khỏi nút (blur) thì
  // huỷ, chạm lần hai mới thật sự xoá.
  const [confirmClearWard, setConfirmClearWard] = useState(false)
  // Chỉ hiện con số tốc độ sau khi người dùng xác nhận, với các liều vượt xa khoảng khuyến cáo.
  const [confirmed, setConfirmed] = useState(false)
  // `confirmed` ở trên chỉ mở khoá NHÌN THẤY kết quả — nó không chặn được việc ghim liều đó vào
  // "Đang truyền" hay chép câu Cách dùng vào bệnh án, hai hành động có hậu quả cao hơn hẳn việc
  // nhìn. Với liều severity high/extreme, hai nút đó cần một chạm xác nhận RIÊNG (double-tap, hết
  // hạn sau CONFIRM_EXTREME_RESET_MS — cố ý ngắn hơn CONFIRM_DELETE_RESET_MS, xem khai báo ở trên)
  // — không dùng chung khoá
  // với `confirmed` vì xem xong không có nghĩa là đã chắc chắn muốn ghim/chép.
  const [confirmPin, setConfirmPin] = useState(false)
  const [confirmCopyExtreme, setConfirmCopyExtreme] = useState(false)
  const confirmPinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (confirmPinTimer.current) clearTimeout(confirmPinTimer.current)
      if (confirmCopyTimer.current) clearTimeout(confirmCopyTimer.current)
    },
    [],
  )
  // usageLine là câu chuẩn để chép vào bệnh án — gần như chắc chắn là tính năng dùng nhiều nhất
  // trong ngày, nhưng trước đây muốn lấy nó phải mở Nhật ký rồi sao chép cả mục. Nút chép nhỏ ngay
  // cạnh câu, không cần rời khỏi thẻ thuốc.
  const [usageCopied, setUsageCopied] = useState(false)
  const [savedNote, setSavedNote] = useState("")
  // Đếm số lần lưu, để dải xác nhận chạy lại hoạt ảnh kể cả khi chữ không đổi.
  const [savedTick, setSavedTick] = useState(0)
  // Dải xác nhận tự biến mất sau khi mờ đi, chứ không nằm lại dưới dạng ô trong suốt vẫn chiếm chỗ
  // — nếu để lại, thẻ thuốc dài thêm một dòng vĩnh viễn sau lần lưu đầu tiên.
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmSaved = (msg: string) => {
    setSavedNote(msg)
    setSavedTick((n) => n + 1)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedNote(""), 2000)
  }
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
  }, [])

  const unit = useMemo(() => parseDoseUnit(unitId), [unitId])
  const ownUnit = useMemo(() => parseDoseUnit(calc.doseUnit), [calc.doseUnit])
  // Cân nặng lấy từ "Bệnh nhân hiện tại" — không còn ô nhập riêng cho từng thẻ thuốc.
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  const weightKg = dosingWeight.used
  const c = parseFloat(conc)
  const concValue = isNaN(c) ? null : c
  const pumpStep = calc.pumpStep ?? DEFAULT_PUMP_STEP
  // Số lẻ của tốc độ bơm — chuyển lên đây (từ chỗ dùng đầu tiên cũ, gần dòng "Đặt bơm") để con số
  // to nhất màn hình (resultFinalText bên dưới) dùng ĐÚNG quy tắc này, không phải quy tắc riêng của
  // formatDoseNumber() theo độ lớn con số.
  const rateDecimals = pumpStep >= 1 ? 0 : 1

  const result = useMemo(() => {
    if (!unit || concValue == null) return null
    if (mode === "doseToRate") {
      const d = parseFloat(dose)
      if (isNaN(d)) return null
      return doseToRate(d, unit, weightKg, concValue, calc.concUnit)
    }
    const r = parseFloat(rateInput)
    if (isNaN(r)) return null
    return rateToDose(r, unit, weightKg, concValue, calc.concUnit)
  }, [unit, mode, dose, rateInput, concValue, weightKg, calc.concUnit])

  // Kiểm tra khoảng liều ở CẢ HAI CHIỀU: chiều "Liều → Tốc độ" kiểm tra liều vừa nhập; chiều
  // "Tốc độ → Liều" kiểm tra liều suy ra từ tốc độ bơm đang chạy — đúng tình huống nhận bàn giao ca
  // và phát hiện bơm đang đặt sai.
  const doseUnderCheck = mode === "doseToRate" ? (isNaN(parseFloat(dose)) ? null : parseFloat(dose)) : result
  const check: DoseCheck | null = useMemo(() => {
    if (!unit || !ownUnit || doseUnderCheck == null) return null
    return checkInfusionDose(doseUnderCheck, unit, ownUnit, calc.doseMin, calc.doseMax, weightKg, calc.doseAbsMax)
  }, [unit, ownUnit, doseUnderCheck, calc.doseMin, calc.doseMax, calc.doseAbsMax, weightKg])

  // Con số này chạy thẳng lên bơm thật — số lẻ khi đếm chạy phải khớp CHÍNH XÁC số lẻ mà bản tĩnh
  // bên dưới dùng, không tự bịa một quy tắc làm tròn riêng.
  //
  // Chế độ "Liều → Tốc độ": đây CHÍNH LÀ con số sẽ đặt lên bơm (dòng "Đặt bơm" bên dưới chỉ làm
  // tròn thêm theo bước bơm) — nên phải dùng ĐÚNG số lẻ của bước bơm (rateDecimals), không phải
  // quy tắc làm tròn theo ĐỘ LỚN con số của formatDoseNumber(). Trước đây hai quy tắc độc lập từng
  // hiện "2063 mL/giờ" ở đây và "Đặt bơm 2062.5 mL/giờ" một dòng dưới — cùng một tốc độ, hai cách
  // đọc khác nhau, đúng lúc tốc độ cao/liều cực đoan là lúc chép số chính xác quan trọng nhất
  // (critique /impeccable 2026-08-17T17-38, P2). Chế độ "Tốc độ → Liều" không có dòng "Đặt bơm" đối
  // chiếu (kết quả là LIỀU, không phải tốc độ bơm) nên vẫn dùng formatDoseNumber() như cũ.
  const resultFinalText =
    result != null ? (mode === "doseToRate" ? result.toFixed(rateDecimals) : formatDoseNumber(result)) : "—"
  const resultDecimals = mode === "doseToRate" ? rateDecimals : result != null ? (formatDoseNumber(result).split(".")[1]?.length ?? 0) : 0
  const resultDisplay = useCountUp(result, resultDecimals, resultFinalText)

  // Đổi bất kỳ đầu vào nào là phải xác nhận lại — không để một lần bấm xác nhận che cho mọi con số
  // gõ sau đó. `weightKg` PHẢI có trong mảng phụ thuộc: liều mcg/kg/phút không đổi số nhưng đổi cân
  // nặng (vd "Xoá bệnh nhân" rồi nhập cân nặng bệnh nhân mới) là một liều TUYỆT ĐỐI khác hẳn — thiếu
  // nó thì khoá cũ (kể cả khoá ghim/chép của liều cực đoan) vẫn mở cho một bệnh nhân chưa từng xác
  // nhận gì (critique /impeccable 2026-08-17T17-38, P0).
  useEffect(() => {
    setConfirmed(false)
    setSavedNote("")
    // Đổi liều thì khoá ghim/chép cũ (nếu đang chờ chạm lần hai) không còn nói đúng liều nào nữa —
    // tắt luôn, đừng để chạm lần hai vô tình xác nhận một liều khác đã gõ sau đó.
    setConfirmPin(false)
    setConfirmCopyExtreme(false)
    if (confirmPinTimer.current) clearTimeout(confirmPinTimer.current)
    if (confirmCopyTimer.current) clearTimeout(confirmCopyTimer.current)
  }, [dose, rateInput, conc, unitId, mode, weightKg])

  // Ô "Nồng độ" là đường vào phổ biến hơn bảng pha rất nhiều, nên nó phải được canh bằng ĐÚNG bộ
  // luật đã dùng cho bảng pha. Trước đây gõ 50 thay vì 5 mg/mL thì bảng pha chặn đỏ còn ô này chỉ
  // hiện một dòng xanh dịu — cùng một sai lầm, hai phản ứng ngược nhau.
  // Mốc so sánh là công thức BẠN đã lưu khi có — xem lib/wardRecipes.ts.
  const concGrade = useMemo(
    () => gradeConcentration(concValue, ward?.concValue ?? calc.concDefault, calc.mix?.maxConc, calc.concUnit, ward ? "công thức của bạn" : "công thức chuẩn"),
    [concValue, ward, calc.concDefault, calc.mix?.maxConc, calc.concUnit],
  )

  const blocked = (Boolean(check?.requiresConfirm) || concGrade.requiresConfirm) && !confirmed
  const doseSeverity = check?.severity ?? "ok"
  // Ô kết quả lấy màu theo mức nặng hơn giữa "liều sai" và "nồng độ sai".
  const concAsDoseSeverity: DoseCheck["severity"] =
    concGrade.severity === "danger" ? "extreme" : concGrade.severity === "warn" ? "above" : "ok"
  const RANK: Record<string, number> = { ok: 0, unknown: 0, below: 1, "far-below": 2, above: 2, high: 3, extreme: 4 }
  const severity = RANK[concAsDoseSeverity] > RANK[doseSeverity] ? concAsDoseSeverity : doseSeverity
  const severityStyle = SEVERITY_STYLE[severity === "unknown" && result != null ? "ok" : severity]
  // Ngưỡng riêng cho nút ghim/chép — "extreme" mở khoá nhìn kết quả ở `blocked` rồi, nhưng ghim vào
  // Đang truyền hay chép vào bệnh án là hành động có hậu quả cao hơn hẳn việc nhìn, nên cần chạm
  // xác nhận thứ hai (xem confirmPin/confirmCopyExtreme) trước khi thực sự chạy. Quyết định thuần,
  // kiểm ở lib/__tests__/confirmGate.spec.ts — xem lib/confirmGate.ts.
  const needsExtraConfirm = shouldRequireExtraConfirm(severity)
  // Cảnh báo đi kèm mọi dòng nhật ký của phép tính này — gồm cả cảnh báo liều lẫn cảnh báo nồng độ.
  const activeFlag = [check?.headline, concGrade.headline].filter(Boolean).join(" + ") || undefined

  // Bơm tiêm điện chỉ đặt được theo bước 0,1 mL/giờ — phải nói rõ đặt bao nhiêu và khi đó liều thực
  // nhận là bao nhiêu.
  const roundedRate = mode === "doseToRate" && result != null ? roundToStep(result, pumpStep) : null
  const deliveredDose =
    roundedRate != null && unit && concValue != null ? rateToDose(roundedRate, unit, weightKg, concValue, calc.concUnit) : null

  const effectiveRate = mode === "doseToRate" ? roundedRate : isNaN(parseFloat(rateInput)) ? null : parseFloat(rateInput)
  const bagVol = parseFloat(bagVolume)
  const duration = !isNaN(bagVol) && effectiveRate != null ? infusionDurationHours(bagVol, effectiveRate) : null
  const bagAmount = !isNaN(bagVol) && concValue != null ? totalAmountInBag(bagVol, concValue) : null

  const needWeight = unit?.perWeight ?? false

  // ─── Vì sao ô kết quả đang trống ───────────────────────────────────────────
  // Lỗi cũ: gõ liều xong, ô kết quả hiện "—" và KHÔNG nói gì thêm. Lời nhắc "thuốc này tính theo
  // cân nặng" thì có, nhưng nằm cách đó gần một màn hình phía trên (sau ô nồng độ, cảnh báo ngoại
  // biên, nút bảng pha, ô thể tích...), nên người dùng nhìn thẳng vào chỗ đáng lẽ có con số và chỉ
  // thấy một dấu gạch ngang câm. Từ nay lý do nằm NGAY TRONG ô kết quả, kèm đường đi để sửa.
  const missingReason: { text: string; fix?: () => void } | null = (() => {
    if (result != null) return null
    if (concValue == null || !(concValue > 0)) return { text: "Nhập nồng độ pha ở ô bên trên để tính được." }
    if (mode === "doseToRate" && !(parseFloat(dose) > 0)) return { text: "Nhập liều muốn truyền để app tính ra tốc độ bơm." }
    if (mode === "rateToDose" && !(parseFloat(rateInput) > 0)) return { text: "Nhập tốc độ bơm đang chạy để app suy ra liều." }
    if (needWeight && weightKg == null) {
      return {
        text: `Thiếu cân nặng — ${unitId} tính theo kg nên chưa ra được con số. Chạm để nhập ở khung "Bệnh nhân hiện tại".`,
        fix: openPatientPanel,
      }
    }
    // Đơn vị liều và đơn vị nồng độ không cùng họ (vd liều "đơn vị/giờ" với nồng độ "mg/mL") —
    // không có hệ số quy đổi nào đúng, và đoán bừa một hệ số ở đây là kiểu sai tệ nhất.
    if (unit && massFactor(unit.mass, massOfConcUnit(calc.concUnit)) == null) {
      return { text: `Không quy đổi được ${unit.mass} sang ${massOfConcUnit(calc.concUnit)} — chọn đơn vị liều khác hoặc sửa đơn vị nồng độ.` }
    }
    return { text: "Chưa đủ dữ liệu để tính — kiểm tra lại các ô phía trên." }
  })()
  // Ô nồng độ điền sẵn là con dao hai lưỡi: tiện, nhưng nếu chỗ bạn pha khác chuẩn mà quên sửa thì
  // app im lặng tính ra một con số sai trông hoàn toàn hợp lý. Vì vậy khi con số đã bị sửa khác mốc
  // thì phải nói rõ nó đang so với cái gì.
  const concIsDefault = calc.concDefault != null && concValue != null && Math.abs(concValue - calc.concDefault) < 1e-9
  const concIsWard = ward != null && concValue != null && Math.abs(concValue - ward.concValue) < 1e-9
  // Nồng độ đang dùng có vượt ngưỡng còn truyền được qua đường ngoại biên hay không. Chỉ tính khi
  // thuốc có khai ngưỡng — thiếu dữ liệu thì im lặng, không đoán một ngưỡng nào đó.
  const peripheralWarn = useMemo(() => {
    const max = calc.mix?.maxPeripheralConc
    if (max == null || !(max > 0) || concValue == null || !(concValue > max + 1e-9)) return null
    return { conc: concValue, max, factor: concValue / max, note: calc.mix?.peripheralNote }
  }, [calc.mix?.maxPeripheralConc, calc.mix?.peripheralNote, concValue])
  const fieldClass = FIELD
  const fieldStyle = FIELD_STYLE

  const doseText = mode === "doseToRate" ? `${dose} ${unitId}` : result != null ? `${formatDoseNumber(result)} ${unitId}` : "—"
  const rateText =
    mode === "doseToRate"
      ? roundedRate != null
        ? `${roundedRate.toFixed(rateDecimals)} mL/giờ`
        : "—"
      : `${rateInput} mL/giờ`

  // Câu "Cách dùng" theo mẫu chuẩn (vd "Noradrenalin 4 mg/4 ml 2 ống với NaCl 0,9% đủ 50 ml BTĐ
  // 5 ml/h") — chỉ ra được khi đã có đủ hàm lượng/thể tích 1 ống (từ công thức đã lưu hoặc mặc định
  // của thuốc) VÀ đã tính ra tốc độ bơm cụ thể. Xem lib/usageText.ts.
  const usageVialRaw = ward ?? calc.mix
  const usageLine = (() => {
    if (mode !== "doseToRate" || roundedRate == null || usageVialRaw == null) return null
    const usageVial = usageVialRaw
    if (usageVial.vialAmount == null || usageVial.vialVolumeMl == null) return null
    return formatAmpouleUsage({
      name: drug.name,
      vialAmount: usageVial.vialAmount,
      vialUnit: usageVial.vialUnit ?? massOfConcUnit(calc.concUnit),
      vialVolumeMl: usageVial.vialVolumeMl,
      vialsUsed: usageVial.vials ?? 1,
      // `diluent` (WardRecipe, một chuỗi) và `diluents` (MixRecipe, một mảng) đều là optional — dò
      // riêng từng khoá thay vì suy luận "không có diluent thì chắc là MixRecipe", vì một WardRecipe
      // chưa từng gán `diluent` cũng trông giống hệt vậy dưới mắt TypeScript.
      diluentName: ("diluent" in usageVial ? usageVial.diluent : "diluents" in usageVial ? usageVial.diluents?.[0] : undefined) ?? "NaCl 0,9%",
      finalVolumeMl: !isNaN(bagVol) ? bagVol : usageVial.volumeMl,
      rateMlPerHour: roundedRate,
    })
  })()

  function logCurrent(flag?: string) {
    logCalc({
      drug: drug.name,
      kind: mode,
      inputs: [
        `Nồng độ ${conc} ${calc.concUnit}${concIsDefault ? " (công thức pha chuẩn của app)" : calc.concDefault != null ? ` (khác chuẩn ${calc.concDefault})` : ""}`,
        mode === "doseToRate" ? `Liều đặt ${dose} ${unitId}` : `Tốc độ bơm ${rateInput} mL/giờ`,
      ],
      output: mode === "doseToRate" ? `${rateText}${deliveredDose != null ? ` → thực nhận ${formatDoseNumber(deliveredDose)} ${unitId}` : ""}` : doseText,
      flag,
    })
  }

  // Chuyển sang tính cho bệnh nhân khác trước đây phải tự xoá tay từng ô (Nồng độ, Liều/Tốc độ, Thể
  // tích bơm/chai) — lối tắt này đưa cả bốn ô về đúng mốc lúc mới mở thẻ: công thức ĐÃ LƯU nếu có
  // (`ward`), ngược lại mặc định của thuốc (`calc.concDefault`/`calc.mix`) — cùng biểu thức với
  // useState khởi tạo `conc`/`bagVolume` phía trên, không phải một mốc "trống" tự bịa riêng.
  function resetCalcInputs() {
    setConc(ward ? String(ward.concValue) : calc.concDefault != null ? String(calc.concDefault) : "")
    setDose("")
    setRateInput("")
    setBagVolume(ward ? String(ward.volumeMl) : calc.mix ? String(calc.mix.volumeMl) : "")
    tickHaptic()
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: C.lineSoft }}>
      <div className="flex justify-end mb-1.5">
        <button onClick={resetCalcInputs} className={`flex items-center gap-1 text-[12px] font-bold ${TAP}`} style={{ color: C.textSoft }}>
          <span className="scale-90">{icons.refresh()}</span>
          Làm mới
        </button>
      </div>
      {/* Chọn chiều tính */}
      <div className="flex p-0.5 rounded-[14px] mb-2.5" style={{ background: C.lineSoft }}>
        {([
          { id: "doseToRate" as const, label: "Liều → Tốc độ" },
          { id: "rateToDose" as const, label: "Tốc độ → Liều" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id)
              tickHaptic()
            }}
            // h-11 (44px), không phải h-9 (36px) như trước — control chạm nhiều lần mỗi phiên
            // (đổi chiều tính liều↔tốc độ) trên app "chủ yếu một tay tại giường bệnh", dưới sàn
            // công thái 44×44pt (/impeccable critique 2026-08-19T10-03, P2).
            className="dose-press flex-1 h-11 rounded-[14px] text-[12px] font-bold"
            aria-pressed={mode === m.id}
            style={
              // Không boxShadow: đây là control thường trực (không phải dropdown/toast/modal/sheet),
              // luật Floating-Layer-Only trong DESIGN.md chỉ cho shadow ở lớp nổi thật sự — màu nền
              // trắng + chữ primary đã đủ phân biệt trạng thái chọn (/impeccable critique 2026-08-18).
              mode === m.id
                ? { background: C.surface, color: "var(--c-primary-strong)" }
                : { background: "transparent", color: C.textSoft }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chọn đơn vị liều — cuộn ngang vì có nhiều lựa chọn, không vừa một hàng chia đều */}
      <div className="scroll-ios overflow-x-auto flex gap-1.5 mb-2.5 -mx-0.5 px-0.5">
        {unitOptions.map((u) => (
          <button
            key={u}
            onClick={() => {
              setUnitId(u)
              tickHaptic()
            }}
            className={CHIP}
            style={
              unitId === u
                ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
                : { background: C.surface, borderColor: C.line, color: C.textSoft }
            }
          >
            {u}
          </button>
        ))}
      </div>

      {/* Cân nặng lấy từ khung "Bệnh nhân hiện tại" — không gõ lại cho từng thuốc nữa. Chỉ nói khi
          ĐÃ có cân nặng (xác nhận đang dùng số nào); lúc thiếu thì không nhắc ở đây nữa — lý do và
          đường sửa đã nằm ngay trong ô kết quả bên dưới (xem missingReason), đúng chỗ người dùng
          đang nhìn khi thấy "—" mà không hiểu vì sao. */}
      {/* aria-live: cân nặng dùng để tính và cờ "thiếu chiều cao" đổi theo trạng thái bệnh nhân — không
          có nó, người dùng trình đọc màn hình sửa cân nặng/chiều cao xong không được báo khối này vừa
          đổi (/impeccable critique 2026-08-21 lượt 3, P2, cùng lỗ hổng với AntibioticDoseCard). */}
      <div aria-live="polite">
      {needWeight && weightKg != null && (
        <p className={`text-[12px] mb-2 px-2.5 py-1.5 rounded-lg leading-[1.45] ${PROSE}`} style={{ background: C.accentSoft, color: "var(--c-accent-deep)" }}>
          Cân nặng dùng để tính: <b>{weightKg.toFixed(1).replace(".", ",")} kg</b>
          {dosingWeight.usedLabel && dosingWeight.usedLabel !== "ABW" ? ` (${dosingWeight.usedLabel})` : ""} — lấy từ khung "Bệnh nhân hiện tại".
        </p>
      )}
      {/* Đã có cân nặng nhưng THIẾU chiều cao cho thuốc cần cân nặng lý tưởng/hiệu chỉnh: dòng trên
          vẫn hiện một con số "chắc chắn" (nhãn usedLabel âm thầm là "ABW") — phải nói rõ nó không
          phải cơ sở thuốc yêu cầu, cùng lỗ hổng đã vá ở AntibioticDoseCard/BolusList
          (/impeccable critique 2026-08-21, P0). */}
      {needWeight && weightKg != null && dosingWeight.heightMissingForBasis && (
        <p className={`text-[12px] mb-2 px-2.5 py-1.5 rounded-lg leading-[1.45] font-bold ${PROSE}`} style={{ background: C.warnSoft, color: C.warn }}>
          Thiếu chiều cao — số trên là cân nặng thực, chưa phải cân nặng lý tưởng/hiệu chỉnh thuốc yêu cầu.
        </p>
      )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-1.5">
        <div>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Nồng độ ({calc.concUnit})</label>
          <input value={conc} onChange={(e) => setConc(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={calc.concUnit} className={fieldClass} style={fieldStyle} />
        </div>
        {mode === "doseToRate" ? (
          <div>
            <label className={`${T.label} text-slate-500 mb-1 block`}>Liều</label>
            <input value={dose} onChange={(e) => setDose(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={unitId} className={fieldClass} style={fieldStyle} />
          </div>
        ) : (
          <div>
            <label className={`${T.label} text-slate-500 mb-1 block`}>Tốc độ (mL/giờ)</label>
            <input value={rateInput} onChange={(e) => setRateInput(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="mL/giờ" className={fieldClass} style={fieldStyle} />
          </div>
        )}
      </div>

      {/* Ô nồng độ đang giả định điều gì — dòng này không bao giờ được vắng mặt */}
      {concGrade.severity === "danger" || concGrade.severity === "warn" ? (
        // Nồng độ lệch nhiều thì cảnh báo này thay chỗ dòng ghi chú nhẹ nhàng bên dưới — hai thứ
        // cùng lúc chỉ làm loãng cái quan trọng.
        <div
          className={`flex items-start gap-2 px-3 py-2.5 ${R.box} mb-2`}
          style={
            concGrade.severity === "danger"
              ? { background: C.dangerSoft, border: `1px solid ${C.dangerIcon}` }
              : { background: C.warnSoft, border: "1px solid var(--c-warn-line)" }
          }
        >
          <span className="mt-0.5 flex-none" style={{ color: concGrade.severity === "danger" ? C.dangerIcon : C.warnIcon }}>{icons.alert()}</span>
          <div>
            <p className={`${T.bodyStrong} font-extrabold leading-[1.3]`} style={{ color: concGrade.severity === "danger" ? C.danger : C.warn }}>
              {concGrade.headline}
            </p>
            {concGrade.detail && (
              <p className={`${T.meta} mt-0.5`} style={{ color: concGrade.severity === "danger" ? C.danger : C.warn }}>{concGrade.detail}</p>
            )}
          </div>
        </div>
      ) : concIsWard ? null : calc.concDefault == null ? (
        <Note tone="warn">App không điền sẵn nồng độ cho thuốc này — nhập theo chai/bơm thực tế rồi lưu lại trong bảng pha.</Note>
      ) : concIsDefault ? null : (
        // Con số dựng sẵn thì không cần nói gì: nó đã là mặc định hiển nhiên, và một dòng nhắc lặp
        // lại ở mọi thuốc chỉ làm loãng những dòng thật sự phải đọc. Chỉ nói khi nồng độ đã bị SỬA
        // khác mốc — lúc đó mới có thông tin mới.
        <Note tone="info">
          Nồng độ tự nhập {conc} {calc.concUnit} — {ward ? `công thức của bạn là ${formatDoseNumber(ward.concValue)}` : `chuẩn của app là ${calc.concDefault}`} {calc.concUnit}.
        </Note>
      )}

      {/* ─── Đường truyền và hạn dùng sau pha ───────────────────────────────────
          Hai thông tin này đã có sẵn trong dữ liệu từ lâu (MixRecipe.maxPeripheralConc / .stability)
          nhưng bị ẩn hẳn khỏi giao diện cho gọn. Kết quả: công thức noradrenaline 0,08 mg/mL của
          chính app đặc gấp 5 lần ngưỡng ngoại biên mà không có dòng nào nói ra — dữ liệu đúng nằm
          sai chỗ. Nay chỉ hiện khi nồng độ ĐANG DÙNG thực sự vượt ngưỡng, nên nó không phải một
          dòng chữ thường trực để người ta học cách lướt qua. */}
      {peripheralWarn && (
        <div className={`${R.box} mb-2 overflow-hidden`} style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <button
            type="button"
            onClick={() => setShowPeripheralDetail((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
            aria-expanded={showPeripheralDetail}
          >
            <span className="flex-none" style={{ color: C.warnIcon }}>{icons.alert()}</span>
            <span className={`${T.bodyStrong} font-extrabold leading-[1.3] flex-1`} style={{ color: C.warn }}>
              Đặc hơn ngưỡng cho đường ngoại biên
            </span>
            <span className="flex-none" style={{ color: C.warn, transform: showPeripheralDetail ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              {icons.chevronDown()}
            </span>
          </button>
          {showPeripheralDetail && (
            <p className={`${T.meta} ${PROSE} px-3 pb-2.5`} style={{ color: C.warn }}>
              Đang pha {formatDoseNumber(peripheralWarn.conc)} {calc.concUnit}, gấp {formatDoseNumber(peripheralWarn.factor)} lần ngưỡng{" "}
              {formatDoseNumber(peripheralWarn.max)} {calc.concUnit} — nồng độ này thuộc nhóm ưu tiên tĩnh mạch trung tâm.
              {peripheralWarn.note ? ` ${peripheralWarn.note}` : ""}
            </p>
          )}
        </div>
      )}
      {/* Cảnh báo vượt/thấp hơn khoảng liều — đổi màu, in hoa, và với mức nguy hiểm thì CHẶN kết quả
          cho tới khi người dùng xác nhận. Trước đây khối này KHÔNG nằm trong vùng aria-live nào —
          trình đọc màn hình chỉ biết có cảnh báo nếu focus tình cờ đọc tới. high/extreme dùng
          assertive (ngắt lời đang đọc dở) vì đây đúng loại việc assertive sinh ra để xử lý — liều
          gấp nhiều lần ngưỡng tuyệt đối không nên đợi tới lượt như một cập nhật thông thường
          (critique /impeccable 2026-08-17T22-03, P2). */}
      {check?.headline && (
        <div
          aria-live={severity === "extreme" || severity === "high" ? "assertive" : "polite"}
          aria-atomic="true"
          className="flex items-start gap-2 px-3 py-2.5 rounded-[14px] mb-2"
          style={{ background: severityStyle.bg, border: `1px solid ${severityStyle.border}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: severityStyle.text }}>{icons.alert()}</span>
          <div>
            <p className={`text-[13px] font-extrabold leading-[1.3] ${PROSE}`} style={{ color: severityStyle.text }}>{check.headline}</p>
            {check.detail && <p className={`text-[12px] leading-[1.45] mt-0.5 ${PROSE}`} style={{ color: severityStyle.text }}>{check.detail}</p>}
          </div>
        </div>
      )}

      {/* aria-live bọc CẢ HAI nhánh: trước đây chỉ nhánh "có kết quả" có aria-live, nên lúc kết quả
          bị CHE (chuyển sang nút xác nhận) trình đọc màn hình im lặng hoàn toàn — người dùng không
          biết con số vừa biến mất, chỉ có nút xác nhận thay vào đó. */}
      <div aria-live="polite" aria-atomic="true">
      {blocked ? (
        <button
          onClick={() => {
            const reason = [check?.requiresConfirm ? check.headline : null, concGrade.requiresConfirm ? concGrade.headline : null]
              .filter(Boolean)
              .join(" + ")
            setConfirmed(true)
            logCurrent(`${reason} — người dùng đã bấm xác nhận để xem kết quả`)
            confirmSaved("Đã ghi vào nhật ký kèm cảnh báo")
            tickHaptic()
          }}
          className={`${BTN_TALL} border-transparent`}
          style={{ background: severityStyle.text, color: "var(--c-on-bright)" }}
        >
          Tôi đã kiểm tra lại — vẫn muốn xem kết quả
        </button>
      ) : (
        // Con số duy nhất cần nhìn thấy từ xa. Đặt to hẳn một bậc so với mọi chữ khác trong thẻ,
        // dùng chữ số đều bề ngang (tabular) để hàng "đặt bơm" và hàng "thực nhận" thẳng cột nhau.
        <div
          className={`px-3 py-3 ${R.box}`}
          style={{ background: severityStyle.bg, border: `1px solid ${severityStyle.border}` }}
          role={severity === "extreme" ? "alert" : undefined}
        >
          {usageLine && (
            <div className="flex items-start gap-1.5 mb-1.5">
              <p className={`${T.bodyStrong} flex-1`} style={{ color: severityStyle.text }}>{usageLine}</p>
              <button
                type="button"
                onClick={async () => {
                  // Liều high/extreme: chạm đầu chỉ vũ trang khoá xác nhận, chưa chép gì — giống
                  // "Xoá công thức này". Đổi bất kỳ ô nào ở trên tắt khoá này ngay (useEffect trên).
                  if (resolveConfirmTap(confirmCopyExtreme, needsExtraConfirm) === "arm") {
                    setConfirmCopyExtreme(true)
                    tickHaptic()
                    if (confirmCopyTimer.current) clearTimeout(confirmCopyTimer.current)
                    confirmCopyTimer.current = setTimeout(() => setConfirmCopyExtreme(false), CONFIRM_EXTREME_RESET_MS)
                    return
                  }
                  try {
                    await navigator.clipboard.writeText(usageLine)
                    setUsageCopied(true)
                    setConfirmCopyExtreme(false)
                    if (confirmCopyTimer.current) clearTimeout(confirmCopyTimer.current)
                    setTimeout(() => setUsageCopied(false), 1500)
                    tickHaptic()
                  } catch {
                    // Trình duyệt chặn clipboard: không làm gì, nút vẫn giữ nguyên nhãn.
                  }
                }}
                aria-label={
                  confirmCopyExtreme
                    ? "Liều bất thường — chạm lần nữa để chép"
                    : usageCopied
                      ? "Đã chép"
                      : "Chép câu Cách dùng"
                }
                className="flex-none w-11 h-11 -m-2 rounded-lg flex items-center justify-center"
                style={
                  confirmCopyExtreme
                    ? { color: "var(--c-on-bright)", background: C.dangerIcon, opacity: 1 }
                    : { color: severityStyle.text, opacity: 0.75 }
                }
              >
                {confirmCopyExtreme ? icons.alert() : usageCopied ? icons.check() : icons.copy()}
              </button>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            {/* Đếm chạy từ số cũ sang số mới (useCountUp) thay vì bật thẳng vào số mới — số này
                chạy lên bơm thật nên "đổi tăng hay giảm, đổi bao nhiêu" đáng nhìn thấy rõ hơn cả
                "đã đổi". Khoá cứng về đúng formatDoseNumber() ngay khi đếm xong. */}
            <span className={`${T.metric} ${NUM_DOSE}`} style={{ color: severityStyle.text }}>
              {resultDisplay}
            </span>
            <span className={T.body} style={{ color: C.textSoft }}>{mode === "doseToRate" ? "mL/giờ" : unitId}</span>
            {/* Xác nhận tích cực: liều nằm đúng khoảng thì nói ra, không chỉ im lặng khi không sai.
                Màu XANH LÁ, KHÔNG phải C.accent: `--c-accent` trỏ thẳng vào `--c-primary`, tức
                badge này đang đọc bằng đúng màu thương hiệu — trong khi con số liều ngay bên trái
                nó đã cố ý bỏ màu đó vì DESIGN.md ("thứ ồn nhất trên màn liều luôn là tín hiệu nguy
                hiểm, không bao giờ là thương hiệu", xem chú thích `ok:` của SEVERITY_STYLE,
                lib/doseSafety.ts). Bỏ sót đúng badge nằm cạnh con số đó là một chỗ lệch nội bộ.
                "Xanh lá = xác nhận an toàn" đã là quy ước dùng lại nhiều nơi trong app.

                `--c-green-deep` chứ KHÔNG phải `--c-green`: đo trên nền thật của badge
                (`--c-primary-soft`, khối kết quả bao quanh — không phải nền thẻ trắng),
                `--c-green` chỉ cho 4,34:1 ở bản sáng, DƯỚI sàn AA 4,5:1 cho chữ 12px thường;
                `--c-green-deep` cho 7,89:1 sáng / 12,4:1 tối. Cùng bẫy "đo tương phản trên nền
                không phải nền thật" đã ghi ở HANDOFF mục 39.3 — và `--c-green-deep` vốn đã là
                token CHỮ xanh của hệ (xem hai chỗ dùng khác trong file này), còn `--c-green` là
                token nền/viền/icon.
                `badge-pop-in` (index.css) chỉ chạy MỘT LẦN lúc span này được mount — span chỉ tồn
                tại khi severity === "ok" nên đổi số liều trong lúc vẫn "ok" không remount, hoạt ảnh
                không lặp lại theo từng phím gõ. */}
            {severity === "ok" && result != null && check != null && (
              <span
                className={`${T.meta} ml-auto flex items-center gap-1 flex-none badge-pop-in`}
                style={{ color: "var(--c-green-deep)" }}
              >
                <span className="scale-75">{icons.check()}</span>
                Trong khoảng
              </span>
            )}
          </div>
          {mode === "doseToRate" && roundedRate != null && (
            // Con số 24px bên trên là kết quả TÍNH; đây mới là con số thật sự đem đi đặt máy —
            // nên đứng ở bậc T.critical (15px), không phải T.meta như một dòng chú thích phụ.
            <p className={`${T.critical} ${NUM} mt-1.5`} style={{ color: severityStyle.text }}>
              Đặt bơm <b className={NUM_DOSE}>{roundedRate.toFixed(rateDecimals)} mL/giờ</b> (bước {pumpStep})
              {deliveredDose != null && ` → thực nhận ${formatDoseNumber(deliveredDose)} ${unitId}`}
            </p>
          )}
          {duration != null && (
            <p className={`${T.meta} ${NUM} mt-0.5`} style={{ color: C.textSoft }}>
              {trim(bagVol)} mL ở {effectiveRate?.toFixed(rateDecimals)} mL/giờ → hết sau <b>{formatDuration(duration)}</b>
            </p>
          )}
          {check?.severity === "unknown" && check.detail && (
            <p className={`${T.meta} mt-0.5`} style={{ color: C.textSoft }}>{check.detail}</p>
          )}
          {/* Dấu "—" không bao giờ được đứng một mình: luôn kèm lý do và cách sửa. */}
          {missingReason &&
            (missingReason.fix ? (
              <button onClick={missingReason.fix} className={`${T.meta} font-semibold text-left mt-1 underline`} style={{ color: C.warn }}>
                {missingReason.text}
              </button>
            ) : (
              <p className={`${T.meta} mt-1`} style={{ color: C.textSoft }}>{missingReason.text}</p>
            ))}
        </div>
      )}
      </div>

      {/* Hai hành động này KHÔNG ngang hàng nhau về tầm quan trọng, nên không còn vẽ thành hai nút
          bằng nhau cạnh nhau nữa — cách cũ (flex-1 flex-1) chỉ chừa ~147px mỗi nút trên máy 375px,
          đủ để "Thêm vào danh sách đang dùng" vỡ thành 3 dòng chữ chồng lên nhau, và người dùng
          không có cách nào phân biệt hành động nào là chính giữa hai ô trông y hệt nhau.
          Nay: MỘT nút chính (ghim thuốc — đặc màu, có icon, chiếm trọn hàng, luôn đủ chỗ cho một
          dòng chữ) và một hành động phụ bên dưới (chỉ ghi nhật ký, không ghim — nhạt hơn hẳn về
          màu sắc nhưng vẫn đủ 44px chiều cao để bấm được khi đeo găng). */}
      {!blocked && result != null && (
        <div className="flex flex-col gap-1.5 mt-2">
          <button
            onClick={() => {
              // Liều high/extreme: chạm đầu chỉ vũ trang khoá xác nhận riêng cho việc GHIM — xem
              // xong kết quả (đã xác nhận ở `blocked` phía trên) không có nghĩa là chắc chắn muốn
              // đưa liều này vào bảng Đang truyền. Đổi bất kỳ ô nhập nào tắt khoá này ngay.
              if (resolveConfirmTap(confirmPin, needsExtraConfirm) === "arm") {
                setConfirmPin(true)
                tickHaptic()
                if (confirmPinTimer.current) clearTimeout(confirmPinTimer.current)
                confirmPinTimer.current = setTimeout(() => setConfirmPin(false), CONFIRM_EXTREME_RESET_MS)
                return
              }
              pinRunning({
                drugId: drug.id,
                name: drug.name,
                compatKey: drug.compatKey,
                line: 1,
                doseText,
                rateText,
                concText: `${conc} ${calc.concUnit}`,
                kind: "infusion",
                severity,
                weightKgAtPin: weightKg,
                concAtPin: conc,
              })
              setConfirmPin(false)
              if (confirmPinTimer.current) clearTimeout(confirmPinTimer.current)
              logCurrent(activeFlag ? `${activeFlag} — vẫn ghim vào bảng đang dùng` : undefined)
              confirmSaved("Đã ghim tốc độ truyền")
              tickHaptic()
            }}
            className={`${BTN_TALL} border-transparent flex items-center justify-center gap-1.5`}
            style={
              confirmPin
                ? { background: C.dangerIcon, color: "var(--c-on-bright)" }
                : { background: C.accent, color: "var(--c-on-primary)" }
            }
          >
            <span className="flex-none scale-90">{confirmPin ? icons.alert() : icons.plus()}</span>
            {/* "Ghim tốc độ truyền này", không phải "Thêm vào danh sách đang dùng" — xem lý do ở
                AntibioticDoseCard (/impeccable critique 2026-08-19, P3). Ngắn hơn chữ cũ nên không
                tái phạm lỗi vỡ 3 dòng đã sửa ở comment phía trên. */}
            {confirmPin ? "Liều bất thường — chạm lần nữa để ghim" : "Ghim tốc độ truyền này"}
          </button>
          <button
            onClick={() => {
              logCurrent(activeFlag)
              confirmSaved("Đã lưu vào nhật ký")
              tickHaptic()
            }}
            className={`w-full min-h-[44px] px-3 py-2 ${R.box} ${T.chip} flex items-center justify-center gap-1.5 dose-press`}
            style={{ background: C.lineSoft, color: C.textSoft }}
          >
            <span className="flex-none scale-90">{icons.doc()}</span>
            Chỉ lưu vào nhật ký, không ghim
          </button>
        </div>
      )}

      {/* ─── Tham khảo pha thuốc — đứng SAU khung kết quả ─────────────────────────
          Trước đây khối này (công thức đã lưu, bảng pha, thể tích bơm) nằm GIỮA ô nhập liều và
          khung kết quả, đẩy chúng cách nhau tới 439px đo được trên máy 375px — gõ liều xong, bàn
          phím ảo che nốt phần còn lại, không thấy con số. Không khối nào trong đây là INPUT bắt
          buộc để tính tốc độ bơm (nồng độ đã có ô riêng ở trên); chúng chỉ hỗ trợ TRA CỨU/PHA
          thuốc và tính thêm "hết sau bao lâu" — hợp lý đứng sau khi đã thấy câu trả lời chính. */}
      {calc.mix?.stability && (
        <p className={`${T.meta} ${PROSE} mb-2 px-2.5 py-1.5 ${R.box}`} style={{ background: C.lineSoft, color: C.textSoft }}>
          Sau khi pha: {calc.mix.stability}
        </p>
      )}

      {/* Trả về mốc chuẩn sau khi đã sửa lung tung */}
      {(!concIsWard || !ward) && (calc.concDefault != null || ward) && !(concIsDefault && !ward) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ward && (
            <button
              onClick={() => {
                setActiveRecipeId(ward.id)
                setConc(String(ward.concValue))
                setBagVolume(String(ward.volumeMl))
                tickHaptic()
              }}
              className="px-2.5 py-1 rounded-full text-[12px] font-bold border"
              style={{ borderColor: C.accentLine, color: "var(--c-accent-deep)" }}
            >
              Dùng lại công thức của bạn
            </button>
          )}
          {calc.concDefault != null && (
            <button
              onClick={() => {
                setActiveRecipeId("system")
                setConc(String(calc.concDefault))
                if (calc.mix) setBagVolume(String(calc.mix.volumeMl))
                tickHaptic()
              }}
              className="px-2.5 py-1 rounded-full text-[12px] font-bold border"
              style={{ borderColor: C.line, color: C.textSoft }}
            >
              Dùng lại công thức chuẩn
            </button>
          )}
        </div>
      )}
      {/* Cách dùng gộp chung với bảng pha, và nội dung ĐỘNG theo công thức đã lưu — giống hệt cách ô
          kết quả bên trên đổi theo dữ liệu thật thay vì đứng yên. Trước đây "Cách dùng" là một khối
          tĩnh tách rời (luôn đọc câu chữ dựng sẵn của app dù bạn đã lưu công thức khác từ lâu), còn
          "Bảng pha thuốc" là một nút riêng nằm giữa dòng — hai thứ cùng nói về MỘT việc (pha thuốc
          thế nào) nhưng lại ở hai chỗ khác nhau. */}
      <Disclosure label="Cách dùng · Pha thuốc">
        {wardList.length > 0 && (
          <WardRecipeChips
            wardList={wardList}
            activeId={activeRecipeId}
            onSelectSystem={() => {
              setActiveRecipeId("system")
              setConc(calc.concDefault != null ? String(calc.concDefault) : "")
              setBagVolume(calc.mix ? String(calc.mix.volumeMl) : "")
              tickHaptic()
            }}
            onSelectWard={(w) => {
              setActiveRecipeId(w.id)
              setConc(String(w.concValue))
              setBagVolume(String(w.volumeMl))
              tickHaptic()
            }}
            onDelete={(id) => clearWard(drug.id, id)}
            onPin={(id) => pinWard(drug.id, id)}
          />
        )}
        {ward ? (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-none" style={{ color: "var(--c-primary-strong)" }}>{icons.edit()}</span>
            <div className="flex-1 min-w-0">
              <p className={`${T.meta} font-bold`} style={{ color: "var(--c-accent-deep)" }}>
                {ward.title || "Công thức của bạn"} (lưu {formatSavedAt(ward.savedAt)}) — khác công thức hệ thống
              </p>
              <p className={`${T.body} mt-0.5`} style={{ color: C.textSoft }}>
                {ward.vials} {calc.mix?.vialLabel ?? "ống"} × {formatMass(ward.vialAmount, ward.vialUnit)} vừa đủ {trim(ward.volumeMl)} mL
                {ward.diluent ? `, dung môi ${ward.diluent}` : ""}.
              </p>
              <button
                onClick={() => {
                  if (!confirmClearWard) {
                    setConfirmClearWard(true)
                    tickHaptic()
                    return
                  }
                  clearWard(drug.id, ward.id)
                  // Xoá xong thì rơi về công thức đã lưu MỚI NHẤT còn lại (nếu có), chứ không nhảy
                  // thẳng về công thức hệ thống khi vẫn còn công thức khác — khớp với cách
                  // useActiveWardRecipe tự chọn lại khi công thức đang xem biến mất.
                  const remaining = wardList.filter((w) => w.id !== ward.id)
                  const next = remaining[remaining.length - 1]
                  if (next) {
                    setConc(String(next.concValue))
                    setBagVolume(String(next.volumeMl))
                  } else {
                    setConc(calc.concDefault != null ? String(calc.concDefault) : "")
                    setBagVolume(calc.mix ? String(calc.mix.volumeMl) : "")
                  }
                  setConfirmClearWard(false)
                  tickHaptic()
                }}
                onBlur={() => setConfirmClearWard(false)}
                className="flex items-center gap-1.5 text-[12px] font-bold mt-1.5"
                style={{ color: confirmClearWard ? "var(--c-on-bright)" : C.danger, background: confirmClearWard ? C.dangerIcon : "transparent", padding: confirmClearWard ? "4px 8px" : 0, borderRadius: 999 }}
              >
                <span className="scale-90">{confirmClearWard ? icons.alert() : icons.trash()}</span>
                {confirmClearWard ? "Chắc chắn xoá?" : "Xoá công thức này"}
              </button>
            </div>
          </div>
        ) : (
          <p className={`${T.body} ${PROSE}`} style={{ color: C.textSoft }}>{drug.preparation}</p>
        )}
        {drug.note && <p className={`${T.meta} ${PROSE} mt-2`} style={{ color: C.textSoft }}>{drug.note}</p>}

        <button
          onClick={() => setShowMix((v) => !v)}
          className={`${BTN_BLOCK} mt-3`}
          style={{ borderColor: C.accentLine, background: C.accentSoft, color: "var(--c-primary-deep)" }}
        >
          {showMix ? "Đóng bảng pha thuốc" : "Bảng pha thuốc"}
        </button>
        {/* LUÔN mount MixPanel (chỉ ẩn bằng CSS) — cùng lỗi và cùng cách vá với AntibioticMixPanel
            (xem comment ở AntibioticDoseCard): `{showMix && <MixPanel/>}` unmount hẳn component mỗi
            lần đóng, xoá sạch state cục bộ (số ống, thể tích, dung môi...) — mở lại là mất hết. */}
        <div className={showMix ? undefined : "hidden"}>
          <MixPanel
            drug={drug}
            calc={calc}
            wardRecipe={ward}
            onSaveWard={saveWard}
            onUseConc={(value, volumeMl) => {
              setConc(String(Math.round(value * 1e6) / 1e6))
              setBagVolume(String(Math.round(volumeMl * 100) / 100))
              setShowMix(false)
            }}
          />
        </div>
      </Disclosure>

      <div className="grid grid-cols-2 gap-2 mb-2 mt-2">
        <div>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Thể tích bơm/chai (mL)</label>
          <input value={bagVolume} onChange={(e) => setBagVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 50" className={fieldClass} style={fieldStyle} />
        </div>
        {bagAmount != null && (
          <div className="flex items-end">
            <p className="text-[12px] text-slate-500 leading-[1.45] pb-2">
              Trong bơm có {formatMass(bagAmount, massOfConcUnit(calc.concUnit))}
            </p>
          </div>
        )}
      </div>

      {/* Xác nhận việc vừa làm đã xong — dải xanh có dấu tích, tự mờ đi sau ~1,8s. `key` để mỗi
          lần lưu lại là một lần hiện mới, kể cả khi nội dung không đổi. */}
      {savedNote && (
        <p
          key={`${savedNote}-${savedTick}`}
          className={`${T.meta} flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 ${R.box} flash-ok`}
          style={{ background: C.accentSoft, color: "var(--c-primary-deep)" }}
        >
          <span className="flex-none scale-90">{icons.check()}</span>
          {savedNote}
        </p>
      )}
    </div>
  )
}

export function InfusionDrugCard({
  drug: baseDrug,
  disease,
  isOverride,
  onEdit,
  onDelete,
}: {
  drug: InfusionDrug
  disease?: DiseaseEntry | null
  isOverride?: boolean
  onEdit?: (drug: InfusionDrug) => void
  onDelete?: (id: string) => void
}) {
  const { pinRunning, abwKg, heightCm, patient } = useDosing()
  // Bệnh lý áp dụng đè (override) doseRange/calc/boluses/note lên dữ liệu gốc — giống hệt cách
  // IndicationDose đè lên Antibiotic.tiers ở AntibioticDoseCard. Phần nào chỉ định không khai báo
  // thì giữ nguyên dữ liệu gốc của thuốc.
  const indication = disease ? baseDrug.indications?.find((i) => i.diseaseId === disease.id) : undefined
  const drug: InfusionDrug = indication
    ? {
        ...baseDrug,
        doseRange: indication.doseRange ?? baseDrug.doseRange,
        note: indication.note ?? baseDrug.note,
        calc: indication.calc ?? baseDrug.calc,
        boluses: indication.boluses ?? baseDrug.boluses,
      }
    : baseDrug
  // Nguồn hiện ra: bệnh lý có tự khai nguồn riêng thì ưu tiên nguồn đó — cùng lý do với
  // AntibioticDoseCard (liều theo bệnh lý cụ thể thường lấy từ nguồn khác hẳn nguồn chung).
  const sourceItem: SourceInfo = indication && (indication.source || indication.reviewedOn) ? indication : baseDrug
  // Cảnh báo mức "cao" là thứ duy nhất không được phép gấp lại; mức trung bình và mọi nội dung
  // tham khảo khác đều nằm sau tiêu đề gấp/mở để phần máy tính luôn nằm trong tầm mắt.
  const highWarnings = (drug.warnings ?? []).filter((w) => w.severity === "cao")
  const otherWarnings = (drug.warnings ?? []).filter((w) => w.severity !== "cao")
  const boluses = drug.boluses ?? []
  // Cảnh báo "thiếu chiều cao" trong BolusList (vd Nhũ dịch lipid 20%/LAST) trước đây luôn bị giấu
  // sau Disclosure "Liều nạp/bolus" đóng mặc định — khác hẳn AntibioticDoseCard, nơi cùng loại cảnh
  // báo cơ sở cân nặng LUÔN hiện thẳng, không gấp lại (xem comment ở AntibioticDoseCard giải thích lý
  // do). Với thuốc cấp cứu tối khẩn như LAST, bác sĩ không có thời gian dò accordion để thấy con số
  // đang âm thầm dùng cân nặng thực thay vì cân nặng lý tưởng (/impeccable critique 2026-08-21 lượt
  // 3, P2). Tính trước ở đây để mở sẵn đúng lúc cảnh báo đó thật sự áp dụng.
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  const bolusHeightMissingWarn = Boolean(
    drug.doseWeightBasis &&
      drug.doseWeightBasis !== "actual" &&
      dosingWeight.used != null &&
      dosingWeight.heightMissingForBasis &&
      boluses.some((b) => b.perKgLow != null),
  )

  return (
    <div className={`p-4 ${R.card} border mb-3`} style={{ borderColor: C.line, background: C.surface }}>
      {/* Đầu thẻ: tên thuốc và hai nút cùng nằm trên một đường, cao bằng nhau */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* line-clamp-2, không truncate: đây là THẺ CHI TIẾT đang mở, chỗ duy nhất người dùng cần
              đọc trọn tên — một thuốc/công thức pha tự đặt tên dài không có nơi nào khác để xem hết
              (critique /impeccable 2026-08-18, P2). items-start vì tên có thể xuống 2 dòng, badge
              "Tự nhập"/"Đã sửa" cần neo theo đỉnh dòng đầu, không theo tâm cả khối. */}
          <div className="flex items-start gap-1.5 min-w-0">
            <p className={`${T.title} line-clamp-2`} style={{ color: C.text }}>{drug.name}</p>
            {drug.isCustom && (
              <span
                className={`${T.label} px-1.5 py-0.5 ${R.pill} flex-none`}
                style={isOverride ? { background: C.primarySoft, color: "var(--c-primary-deep)" } : { background: "var(--c-green-soft)", color: "var(--c-green)" }}
              >
                {isOverride ? "Đã sửa" : "Tự nhập"}
              </span>
            )}
          </div>
          <p className={`${T.meta} mt-0.5`} style={{ color: C.textSoft }}>{drug.route}</p>
          {disease && (
            <p className={`${T.meta} font-semibold mt-1 px-2 py-0.5 ${R.pill} inline-block`} style={{ background: C.lineSoft, color: C.textSoft }}>
              Chỉ định: {disease.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          {onEdit && (
            <button onClick={() => onEdit(drug)} className={`w-11 h-11 ${R.pill} flex items-center justify-center`} style={{ background: C.primarySoft, color: "var(--c-primary-deep)" }} aria-label="Sửa thuốc">
              {icons.edit()}
            </button>
          )}
          {drug.isCustom && onDelete && (isOverride ? (
            <button
              onClick={() => onDelete(drug.id)}
              className={`w-11 h-11 ${R.pill} flex items-center justify-center`}
              style={{ background: C.lineSoft, color: C.textSoft }}
              aria-label="Khôi phục mặc định"
            >
              {icons.undo()}
            </button>
          ) : (
            <ConfirmIconButton
              onConfirm={() => onDelete(drug.id)}
              ariaLabel="Xoá thuốc"
              className={`w-11 h-11 ${R.pill} flex items-center justify-center`}
              style={{ background: C.dangerSoft, color: C.dangerIcon }}
            />
          ))}
        </div>
      </div>

      <p className={`${T.body} ${PROSE} mt-2`} style={{ color: "var(--c-text-2)" }}>{drug.doseRange}</p>

      {/* Cảnh báo mức cao — luôn hiện, ngay dưới khoảng liều */}
      {highWarnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {highWarnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 ${R.box}`} style={{ background: C.dangerSoft, border: `1px solid ${C.dangerLine}` }}>
              <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
              <p className={`${T.bodyStrong} ${PROSE}`} style={{ color: C.danger }}>{w.text}</p>
            </div>
          ))}
        </div>
      )}

      <CompatWarningForDrug compatKey={drug.compatKey} ownDrugId={drug.id} />

      {drug.calc && <InfusionCalculator drug={drug} calc={drug.calc} />}

      {/* Thuốc không có máy tính tốc độ (Adenosine, Calci gluconat) vẫn phải ghim được: chúng nằm
          trong đúng những cặp tương hợp quan trọng nhất (calci + bicarbonat...). */}
      {!drug.calc && (
        <button
          onClick={() => {
            pinRunning({ drugId: drug.id, name: drug.name, compatKey: drug.compatKey, line: 1, doseText: drug.doseRange, rateText: "", concText: drug.route, kind: "intermittent" })
            tickHaptic()
          }}
          className={`w-full h-11 ${R.box} ${T.bodyStrong} border mt-3`}
          style={{ borderColor: C.accentLine, background: C.accentSoft, color: "var(--c-primary-deep)" }}
        >
          {/* Cùng lý do "Ghim liều này" thay vì "Thêm vào danh sách đang dùng" ở AntibioticDoseCard:
              đây cũng là một liều ngắt quãng/bolus, không phải tốc độ truyền liên tục. */}
          Ghim liều này
        </button>
      )}

      {boluses.length > 0 && (
        <Disclosure label="Liều nạp / bolus" count={boluses.length} defaultOpen={bolusHeightMissingWarn}>
          <BolusList boluses={drug.boluses} drugName={drug.name} doseWeightBasis={drug.doseWeightBasis} />
        </Disclosure>
      )}

      {/* Thuốc CÓ máy tính tốc độ đã tự vẽ khối "Cách dùng · Pha thuốc" của riêng nó bên trong
          InfusionCalculator (bản ĐỘNG, đổi theo công thức đã lưu) — vẽ lại tĩnh ở đây thành ra có
          hai khối "Cách dùng" trên cùng một thẻ. Chỉ thuốc KHÔNG có máy tính (Adenosine, Calci
          gluconat...) mới cần khối tĩnh này. */}
      {!drug.calc && (
        <Disclosure label="Cách dùng · Pha thuốc">
          <p className={`${T.body} ${PROSE}`} style={{ color: C.textSoft }}>{drug.preparation}</p>
          {drug.note && <p className={`${T.meta} ${PROSE} mt-2`} style={{ color: C.textSoft }}>{drug.note}</p>}
        </Disclosure>
      )}

      {otherWarnings.length > 0 && (
        <Disclosure label="Lưu ý khác" count={otherWarnings.length} alert>
          <DrugWarnings warnings={otherWarnings} bare />
        </Disclosure>
      )}

      {/* Nguồn dữ liệu: ưu tiên nguồn riêng của bệnh lý đang chọn, rơi về nguồn chung của thuốc nếu
          bệnh lý chưa tự khai — xem chú thích ở AntibioticDoseCard. `alert` khi mục đang hiện chưa
          ghi nguồn: trước đây phải MỞ khối này ra mới biết, nên trên thực tế không ai biết. */}
      <Disclosure label={sourceItem.source || sourceItem.reviewedOn ? "Nguồn dữ liệu" : "Nguồn dữ liệu — kinh nghiệm lâm sàng tự biên soạn"} alert={!sourceItem.source && !sourceItem.reviewedOn}>
        {indication && (indication.source || indication.reviewedOn) && (
          <p className={`${T.meta} mb-1.5`} style={{ color: C.textSoft }}>Nguồn riêng cho chỉ định {disease?.name}:</p>
        )}
        <SourceLine item={sourceItem} bare />
        {indication && !(indication.source || indication.reviewedOn) && (baseDrug.source || baseDrug.reviewedOn) && (
          <p className={`${T.meta} mt-1.5`} style={{ color: C.textSoft }}>Bệnh lý này chưa tự khai nguồn riêng — đang hiện nguồn chung của thuốc.</p>
        )}
      </Disclosure>
    </div>
  )
}

// Trước đây màn này đổ TOÀN BỘ thuốc trong nhóm ra dưới dạng thẻ mở sẵn, mỗi thẻ kèm máy tính,
// bảng pha, liều nạp, cảnh báo và nguồn — bốn thuốc là bốn màn hình cuộn, trong khi một bệnh nhân
// cụ thể thường chỉ dùng một hai thứ. Nay đảo lại thứ tự ưu tiên cho đúng nhịp ICU:
//   1. Thuốc bệnh nhân ĐANG dùng (chạm là mở thẳng máy tính)
//   2. Ô tìm + chip chọn thuốc cần thêm
//   3. Chỉ thuốc đang chọn mới bung thẻ đầy đủ
// Ngưỡng gấp gọn khi CHƯA lọc/CHƯA mở rộng — cùng số với ABX_GROUP_COLLAPSE_COUNT (AntibioticsScreen)
// để hai màn dùng chung một quy tắc thay vì mỗi nơi một con số, kể cả khi con số đó đổi (8 → 6,
// /impeccable critique 2026-08-22, P2 — 8 vẫn gấp đôi ngưỡng ≤4 lựa chọn tại một điểm quyết định).
// Đa số nhóm (Co bóp 4, Vận mạch 4, Giãn mạch 3, Loạn nhịp 4, Nội môi 5, Thần kinh 4, Giải độc 5)
// chưa bao giờ chạm ngưỡng này; chỉ An thần và Khác từng phơi hết chip cùng lúc — đúng lỗ hổng
// /impeccable critique 2026-08-18 vốn đã sửa cho AntibioticsScreen nhưng chưa lan sang màn anh em này.
export const INFUSION_DRUG_COLLAPSE_COUNT = 6
