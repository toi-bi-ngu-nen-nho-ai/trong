import { useState, useEffect, useMemo } from "react"
import type { Antibiotic, AntibioticMix } from "../../data/types"
import { CONC_OK, DEFAULT_DROP_FACTOR, DEFAULT_PUMP_STEP, MICRO_DROP_FACTOR, concentrationFromVials, diluentVolume, dropsPerMinute, gradeConcentration, pickEasiestVialCount, pumpRateMlPerHour, resolveFixedDraw, roundToStep, vialsTotalVolume, wholeCountOptions, type VialForm, type VialSpec } from "../../lib/mixing"
import { useRoundUp } from "../../lib/roundingPref"
import { formatFixedUsage, formatVialUsage } from "../../lib/usageText"
import { type WardRecipe } from "../../lib/wardRecipes"
import { type CappedDose } from "../../lib/perKgDose"
import { tickHaptic } from "../../lib/haptics"
import { formatDoseNumber, massFactor, massOfConcUnit } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { AdminRoute, BTN_TALL, C, CHIP, FIELD, FIELD_STYLE, T, inferAdminRoutes, trim } from "../../lib/ui"
import { useDosing } from "./context"
import { useActiveWardRecipe, WardRecipeChips } from "./antibioticMixingHelpers"
import { MIX_UNIT_CHOICES, MixOutcome, describeComposition } from "./infusionMixing"
import { mixOptionLabel } from "./antibioticDrafts"
import { normalizeDecimalInput } from "./numberInput"

export function AntibioticMixPanel({
  drug,
  mixList,
  mixIndex,
  setMixIndex,
  doseTargetMg,
  doseNotComputable,
  routeShort,
  setRouteShort,
}: {
  drug: Antibiotic
  // Danh sách quy cách đóng gói DỰNG SẴN của thuốc và cái đang chọn — state nằm ở AntibioticDoseCard
  // (cha) chứ không phải ở đây, vì "Cách dùng" tự tính ngoài thẻ đọc cùng một quy cách; hai nơi giữ
  // hai state riêng thì cùng một màn hình sẽ hiện hai con số theo hai ống khác nhau. Xem mixOptionLabel.
  mixList: AntibioticMix[]
  mixIndex: number
  setMixIndex: (i: number) => void
  doseTargetMg?: CappedDose | null
  // true khi bậc CrCl hiện tại là liều phải cá thể hoá ("theo nồng độ đo được"...) — doseTargetMg
  // null VÌ LÝ DO NÀY (không phải vì thiếu cân nặng/công thức) nên gợi ý số lọ/ống bên dưới im lặng
  // không hiện được gì cả; dùng cờ này để nói rõ vì sao thay vì để trống khó hiểu (xem notComputableDose
  // ở AntibioticDoseCard).
  doseNotComputable?: boolean
  // "Đường dùng" (TTM/TMC/IM/SC) — TRƯỚC ĐÂY panel này tự giữ state riêng và hiện chip chọn ở đây
  // (sau cả mục Dung môi), lấn át mục "Đường dùng" ngoài thẻ AntibioticDoseCard. Nay panel chỉ
  // ĐỌC/GHI state của cha (nhấc lên AntibioticDoseCard) để cả thẻ dùng chung đúng một đường dùng.
  routeShort: AdminRoute
  setRouteShort: (r: AdminRoute) => void
}) {
  const { logCalc, wardRecipes, saveWard, clearWard, pinWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  // Công thức ĐANG XEM — có thể là một công thức đã lưu, hoặc công thức HỆ THỐNG (xem
  // useActiveWardRecipe phía trên) — bấm chip tương ứng để nạp lại giá trị của nó vào form đang mở
  // (xem loadWard()/loadSystemDefault() bên dưới).
  const { activeId: activeRecipeId, setActiveId: setActiveRecipeId, active: ward } = useActiveWardRecipe(wardList)
  const mix = mixList[mixIndex]
  // Chỉ ĐỌC ở đây — công tắc bật/tắt nằm ngoài thẻ, ngay dưới khối "Cách dùng" (xem RoundingSwitch).
  const [roundUp] = useRoundUp()
  const concUnit = mix?.concUnit ?? "mg/mL"
  const concMass = massOfConcUnit(concUnit)
  const vialLabel = mix?.vialLabel ?? "lọ"
  // Đường dùng mặc định của thuốc — chỉ dùng khi CHƯA có công thức đã lưu nào tự khai đường riêng
  // (xem loadWard()/loadSystemDefault() bên dưới, vẫn cần hằng số này để reset khi đổi công thức).
  const defaultRoute: AdminRoute = inferAdminRoutes(drug.route)[0] ?? "TTM"

  const [vialAmount, setVialAmount] = useState(String(ward?.vialAmount ?? mix?.vialAmount ?? ""))
  const [vialUnit, setVialUnit] = useState(ward?.vialUnit ?? mix?.vialUnit ?? concMass)
  const [vials, setVials] = useState(String(ward?.vials ?? 1))
  const [vialForm, setVialForm] = useState<VialForm>(ward?.vialForm ?? mix?.vialForm ?? "powder")
  const [vialVolume, setVialVolume] = useState(
    ward?.vialVolumeMl != null ? String(ward.vialVolumeMl) : mix?.vialVolumeMl != null ? String(mix.vialVolumeMl) : "",
  )
  const [reconstitute, setReconstitute] = useState(
    ward?.reconstituteMl != null ? String(ward.reconstituteMl) : mix?.reconstituteMl != null ? String(mix.reconstituteMl) : "",
  )
  const [displacement, setDisplacement] = useState(
    ward?.displacementMl != null ? String(ward.displacementMl) : mix?.displacementMl != null ? String(mix.displacementMl) : "",
  )
  const [volume, setVolume] = useState(String(ward?.volumeMl ?? mix?.defaultVolumeMl ?? 100))
  const [diluent, setDiluent] = useState(ward?.diluent ?? mix?.diluents?.[0] ?? "NaCl 0,9%")
  // Chai cố định hàm lượng: liều cần LẤY (bỏ trống = dùng trọn chai) — không pha loãng thêm nên
  // không dùng chung ô "Pha loãng tới"/"Dung môi" của hai dạng kia.
  const [fixedDoseAmount, setFixedDoseAmount] = useState("")
  // Giọt/phút: máy tính sống, không thuộc dữ liệu thuốc — nhập thời gian truyền dự kiến là ra ngay.
  const [infuseMinutes, setInfuseMinutes] = useState("")
  const [dropFactor, setDropFactor] = useState(DEFAULT_DROP_FACTOR)
  // Đường TTM có hai thiết bị truyền: dây thường (đếm giọt) hoặc bơm tiêm điện/bơm thể tích (đặt
  // mL/giờ) — vancomycin và một số kháng sinh khác BẮT BUỘC chạy bơm vì tốc độ quá chậm để đếm giọt
  // chính xác (vd 1 g/60 phút ở 100 mL chỉ ~33 giọt/phút, sai số đếm tay đáng kể). Xem lib/mixing.ts.
  const [deliveryDevice, setDeliveryDevice] = useState<"drip" | "pump">(ward?.deliveryDevice ?? "drip")
  // Vài khoa hoàn nguyên/gộp nhiều lọ-chai rồi RÚT BỚT dung dịch dư ra (cho phép số lọ lẻ như 1,5),
  // vài khoa chỉ dùng NGUYÊN số lọ/chai đã mở (bắt buộc số nguyên) — mặc định KHÔNG cho rút, vì "1,5
  // lọ" chỉ hợp lý khi khoa thật sự làm thao tác đó. Xem WardRecipe.allowWithdraw.
  const [allowWithdraw, setAllowWithdraw] = useState(ward?.allowWithdraw ?? false)
  const [saveTitle, setSaveTitle] = useState("")

  // Không khai `diluents` riêng (đa số kháng sinh tự nhập, chưa ai điền công thức pha chuẩn) thì cho
  // chọn cả ba dung môi thường gặp nhất — trước đây chỉ có NaCl 0,9%/Glucose 5%, thiếu hẳn Nước cất
  // pha tiêm (dung môi hoàn nguyên rất phổ biến cho lọ bột trước khi pha loãng tiếp).
  const allowedDiluents = mix?.diluents ?? ["NaCl 0,9%", "Glucose 5%", "Nước cất pha tiêm"]
  const avoidDiluents = mix?.avoidDiluents ?? []
  const diluentBlocked = avoidDiluents.includes(diluent)
  const unitChoices = useMemo(() => MIX_UNIT_CHOICES.filter((u) => massFactor(u, concMass) != null), [concMass])

  const va = parseFloat(vialAmount)
  const nv = parseFloat(vials)
  const vol = parseFloat(volume)
  const num = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) || n < 0 ? null : n
  }
  const spec: VialSpec = useMemo(
    () => ({
      form: vialForm,
      volumeMl: vialForm !== "powder" ? num(vialVolume) : null,
      reconstituteMl: vialForm === "powder" ? num(reconstitute) : null,
      displacementMl: vialForm === "powder" ? num(displacement) : null,
    }),
    [vialForm, vialVolume, reconstitute, displacement],
  )

  const isFixed = vialForm === "fixed"
  const fixedDoseNum = num(fixedDoseAmount)
  const fixedVialVolume = num(vialVolume)
  // Chai cố định hàm lượng có thể cần GỘP NHIỀU CHAI khi liều cần vượt một chai (xem
  // applyFixedSuggestion bên dưới) — dùng chung ô "Số {vialLabel}" (nv/vials) với hai dạng kia thay
  // vì thêm state riêng, vì WardRecipe.vials vốn đã là "số đơn vị đã dùng" chung cho mọi dạng chế
  // phẩm. Công thức tỉ lệ trên TỔNG lượng đã gộp bên dưới cho kết quả giống hệt drawFromFixedVial()
  // khi fixedBottleCount = 1 (trường hợp một chai — vẫn thường gặp nhất, không đổi hành vi cũ).
  const fixedBottleCount = isFixed ? (nv > 0 ? nv : 1) : 1
  const fixedPoolAmount = isFixed && va > 0 ? fixedBottleCount * va : null
  const fixedPoolVolume = isFixed && fixedVialVolume != null ? fixedBottleCount * fixedVialVolume : null
  const fixedDrawMl =
    isFixed && fixedDoseNum != null && fixedPoolAmount != null && fixedPoolVolume != null
      ? fixedDoseNum > fixedPoolAmount + 1e-9
        ? null
        : (fixedDoseNum / fixedPoolAmount) * fixedPoolVolume
      : null
  const fixedImpossible = isFixed && fixedDoseNum != null && fixedPoolAmount != null && fixedDrawMl == null

  const conc = isFixed ? (fixedVialVolume != null && va > 0 ? va / fixedVialVolume : null) : concentrationFromVials(va, nv, vol, vialUnit, concUnit)
  const grade = isFixed ? CONC_OK : gradeConcentration(conc, ward?.concValue, mix?.maxConc, concUnit, ward ? "công thức của bạn" : "công thức chuẩn")
  const drugVolume = vialsTotalVolume(nv, spec)
  const dil = diluentVolume(vol, drugVolume)
  const impossible = !isFixed && dil != null && dil < -1e-9
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => setConfirmed(false), [conc, vol, nv])
  const blocked = grade.requiresConfirm && !confirmed

  // Thể tích thực sự sẽ truyền — dùng để tính giọt/phút: chai cố định thì là mL rút ra, hoặc TOÀN BỘ
  // thể tích đã GỘP nếu dùng trọn (không phải thể tích một chai — sai khi gộp nhiều chai, giọt/phút
  // sẽ tính ra như thể chỉ có một chai trong khi thực tế truyền cả 2-3 chai), hai dạng kia là thể
  // tích pha loãng tới.
  const infuseVolumeMl = isFixed ? (fixedDoseNum != null ? fixedDrawMl : fixedPoolVolume) : vol
  const minutes = num(infuseMinutes)
  const usePump = routeShort === "TTM" && deliveryDevice === "pump"
  const dropsPerMin = routeShort === "TTM" && !usePump ? dropsPerMinute(infuseVolumeMl ?? NaN, minutes ?? NaN, dropFactor) : null
  // Làm tròn theo bước đặt tốc độ nhỏ nhất của bơm — 166.666... ml/h không phải con số đặt được thật
  // trên bơm tiêm điện (bước 0,1 ml/h), giống cách InfusionCalculator làm tròn roundedRate.
  const rateMlPerHourRaw = usePump ? pumpRateMlPerHour(infuseVolumeMl ?? NaN, minutes ?? NaN) : null
  const rateMlPerHour = rateMlPerHourRaw != null ? roundToStep(rateMlPerHourRaw, DEFAULT_PUMP_STEP) : null

  // ─── Tự tính số lọ/ống (hoặc số chai) khớp khoảng liều ────────────────────────
  // Chỉ cần nhập hàm lượng — dựa vào khoảng liều đã tính theo CrCl/AdjBW (doseTargetMg, truyền từ
  // AntibioticDoseCard), app tự điền số lọ VÀ thể tích pha loãng (hai dạng lọ bột/ống dung dịch),
  // hoặc số chai VÀ liều cần rút (dạng chai cố định). Áp dụng cho MỌI đường dùng/thiết bị truyền —
  // TTM lẫn TMC, dây thường lẫn bơm tiêm điện — không riêng gì bơm, vì "làm tròn ống/lọ theo khoảng
  // liều" là nhu cầu chung của mọi cách pha kháng sinh. Không có lựa chọn nào rơi đúng trong khoảng
  // thì làm tròn LÊN (thà dư nhẹ còn hơn thiếu liều — xem pickEasiestVialCount/bottleCountForDose).
  //
  // Cố ý KHÔNG dùng useEffect phản ứng theo doseTargetMg/vialAmount: một effect như vậy sẽ ĐÈ LÊN
  // công thức đã lưu ngay khi vừa nạp lại (loadWard đổi vialAmount cùng lúc, effect sẽ tính lại và
  // ghi đè mất số lọ/thể tích đã lưu). Thay vào đó, hai hàm dưới đây chỉ chạy khi NGƯỜI DÙNG chủ
  // động gõ hàm lượng — xem các onChange gọi tới chúng. Kết quả vẫn là Ô SỐ LỌ/THỂ TÍCH bình
  // thường, sửa tay lại được như mọi ô khác.
  function applySolutionSuggestion(vaValue: number, allow: boolean = allowWithdraw) {
    if (!doseTargetMg || !(vaValue > 0)) return
    const toVialUnit = massFactor(doseTargetMg.unit, vialUnit)
    const toConcMass = massFactor(vialUnit, concMass)
    if (toVialUnit == null) return
    const loInVialUnit = doseTargetMg.low * toVialUnit
    const hiInVialUnit = (doseTargetMg.high ?? doseTargetMg.low) * toVialUnit
    const count = pickEasiestVialCount(loInVialUnit, hiInVialUnit, vaValue, allow, roundUp)
    if (count == null) return
    setVials(String(count))
    if (toConcMass == null) return
    // Thể tích pha loãng mặc định: mix.defaultVolumeMl/lọ nếu thuốc có khai (vd Amikacin 200 mL),
    // rơi về quy ước 100 mL/lọ như trước nếu chưa khai — trừ khi nồng độ đó vượt ngưỡng trên
    // (mix.maxConc) — khi đó nâng lên mốc 50 mL gần nhất để về lại nồng độ an toàn.
    const totalInConcMass = count * vaValue * toConcMass
    let vol = count * (mix?.defaultVolumeMl ?? 100)
    if (mix?.maxConc != null) {
      const minSafeVol = totalInConcMass / mix.maxConc
      if (minSafeVol > vol) vol = Math.ceil(minSafeVol / 50 - 1e-9) * 50
    }
    setVolume(String(vol))
  }

  function applyFixedSuggestion(vaValue: number, volValue: number, allow: boolean = allowWithdraw) {
    if (!doseTargetMg || !(vaValue > 0) || !(volValue > 0)) return
    const toVialUnit = massFactor(doseTargetMg.unit, vialUnit)
    if (toVialUnit == null) return
    const loInVialUnit = doseTargetMg.low * toVialUnit
    const hiInVialUnit = (doseTargetMg.high ?? doseTargetMg.low) * toVialUnit
    const result = resolveFixedDraw(loInVialUnit, hiInVialUnit, vaValue, volValue, allow, roundUp)
    if (result == null) return
    setVials(String(result.bottleCount))
    // Không rút được (drawMl null) — dùng TRỌN số chai, xoá "Liều cần lấy" để hiển thị "dùng trọn".
    if (result.drawMl == null) {
      setFixedDoseAmount("")
      return
    }
    const concPerMl = vaValue / volValue
    setFixedDoseAmount(String(Math.round(result.drawMl * concPerMl * 100) / 100))
  }

  // Chỉ để HIỂN THỊ lý do (dòng "Đã tự tính..." dưới ô) — phép tính giống hệt applySolutionSuggestion
  // nhưng không ghi state, nên an toàn gọi lại mỗi lần render. Áp dụng cho MỌI đường dùng/thiết bị
  // truyền (TTM lẫn TMC, dây thường lẫn bơm) — không riêng gì bơm tiêm điện, vì "làm tròn ống/lọ
  // theo khoảng liều" là nhu cầu chung của mọi cách pha kháng sinh, không phải chỉ lúc chạy bơm.
  const vialCountSuggestion = useMemo(() => {
    if (isFixed || !doseTargetMg || !(va > 0)) return null
    const toVialUnit = massFactor(doseTargetMg.unit, vialUnit)
    const toDoseUnit = massFactor(vialUnit, doseTargetMg.unit)
    if (toVialUnit == null || toDoseUnit == null) return null
    const loInVialUnit = doseTargetMg.low * toVialUnit
    const hiInVialUnit = (doseTargetMg.high ?? doseTargetMg.low) * toVialUnit
    const count = pickEasiestVialCount(loInVialUnit, hiInVialUnit, va, allowWithdraw, roundUp)
    if (count == null) return null
    // Không rút được VÀ không có số nguyên nào khớp hẳn khoảng liều — có hai phương án hợp lý (thấp
    // hơn/cao hơn), hiện cả hai để người dùng tự chọn thay vì chỉ đưa phương án app tự thiên vị chọn
    // (xem wholeCountOptions — cùng triết lý "Giữ nồng độ"/"Giữ thể tích" ở MixPanel).
    const alt = !allowWithdraw
      ? wholeCountOptions(loInVialUnit, hiInVialUnit, va).find((o) => o.count !== count)
      : undefined
    return {
      count,
      totalInDoseUnit: count * va * toDoseUnit,
      alt: alt ? { count: alt.count, totalInDoseUnit: alt.totalAmount * toDoseUnit } : undefined,
    }
  }, [isFixed, doseTargetMg, va, vialUnit, allowWithdraw, roundUp])

  const fixedPoolSuggestion = useMemo(() => {
    if (!isFixed || !doseTargetMg || !(va > 0) || !(fixedVialVolume != null && fixedVialVolume > 0)) return null
    const toVialUnit = massFactor(doseTargetMg.unit, vialUnit)
    if (toVialUnit == null) return null
    const loInVialUnit = doseTargetMg.low * toVialUnit
    const hiInVialUnit = (doseTargetMg.high ?? doseTargetMg.low) * toVialUnit
    const result = resolveFixedDraw(loInVialUnit, hiInVialUnit, va, fixedVialVolume, allowWithdraw, roundUp)
    if (result == null) return null
    const alt = !allowWithdraw
      ? wholeCountOptions(loInVialUnit, hiInVialUnit, va).find((o) => o.count !== result.bottleCount)
      : undefined
    return { count: result.bottleCount, drawMl: result.drawMl, alt: alt ? { count: alt.count } : undefined }
  }, [isFixed, doseTargetMg, va, vialUnit, fixedVialVolume, allowWithdraw, roundUp])

  const pill = (on: boolean) =>
    on
      ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }

  function outcome(): MixOutcome {
    return { concValue: conc as number, volumeMl: vol, vials: nv, vialsOpened: Math.max(1, Math.ceil(nv - 1e-9)), drawMl: null, vialAmount: va, vialUnit, spec, diluent }
  }

  // Câu "Cách dùng" theo mẫu chuẩn — dòng đầu của khối kết quả, xem lib/usageText.ts.
  const usageLine =
    conc == null
      ? null
      : isFixed
        ? formatFixedUsage({
            name: drug.name,
            vialAmount: va,
            vialUnit,
            vialVolumeMl: fixedVialVolume ?? 0,
            vialsUsed: fixedBottleCount,
            doseAmount: fixedDoseNum ?? undefined,
            doseUnit: vialUnit,
            route: routeShort,
            dropsPerMin,
            rateMlPerHour,
          })
        : formatVialUsage({ name: drug.name, vialAmount: va * nv, vialUnit, diluentName: diluent, route: routeShort, dropsPerMin, rateMlPerHour })

  function loadWard(w: WardRecipe) {
    setVialAmount(String(w.vialAmount))
    setVialUnit(w.vialUnit)
    setVials(String(w.vials))
    setVialForm(w.vialForm ?? "powder")
    setVialVolume(w.vialVolumeMl != null ? String(w.vialVolumeMl) : "")
    setReconstitute(w.reconstituteMl != null ? String(w.reconstituteMl) : "")
    setDisplacement(w.displacementMl != null ? String(w.displacementMl) : "")
    setVolume(String(w.volumeMl))
    setDiluent(w.diluent ?? allowedDiluents[0] ?? "NaCl 0,9%")
    setRouteShort(w.route ?? defaultRoute)
    setInfuseMinutes(w.infuseMinutes != null ? String(w.infuseMinutes) : "")
    setDropFactor(w.dropFactor ?? DEFAULT_DROP_FACTOR)
    setDeliveryDevice(w.deliveryDevice ?? "drip")
    setAllowWithdraw(w.allowWithdraw ?? false)
    // Liều rút riêng của chai cố định không được lưu trong công thức (WardRecipe không có trường
    // này) — không xoá thì con số RÚT của công thức trước đó (thường không khớp hàm lượng/số chai
    // vừa nạp) tiếp tục nằm lại, có thể vượt hẳn tổng hàm lượng mới và làm cả khối "Cách dùng" biến
    // mất (xem fixedImpossible bên dưới).
    setFixedDoseAmount("")
    setActiveRecipeId(w.id)
    tickHaptic()
  }

  // Quay lại công thức DỰNG SẴN của app — không xoá công thức đã lưu nào cả, chỉ đổi giá trị form
  // đang mở về đúng như lúc chưa lưu công thức nào (xem các useState phía trên dùng cùng fallback
  // `mix?.xxx`). Trước đây muốn "quay lại hệ thống" chỉ có một cách: XOÁ hẳn công thức đã lưu.
  // `m` mặc định là quy cách đang chọn; truyền tường minh khi NGƯỜI DÙNG vừa bấm sang một quy cách
  // khác — lúc đó `mix` trong lượt render này vẫn còn là quy cách cũ (setMixIndex chưa kịp có hiệu
  // lực), nạp theo nó sẽ điền lại đúng con số vừa bỏ đi.
  function loadSystemDefault(m: AntibioticMix | undefined = mix) {
    setVialAmount(String(m?.vialAmount ?? ""))
    setVialUnit(m?.vialUnit ?? concMass)
    setVials("1")
    setVialForm(m?.vialForm ?? "powder")
    setVialVolume(m?.vialVolumeMl != null ? String(m.vialVolumeMl) : "")
    setReconstitute(m?.reconstituteMl != null ? String(m.reconstituteMl) : "")
    setDisplacement(m?.displacementMl != null ? String(m.displacementMl) : "")
    setVolume(String(m?.defaultVolumeMl ?? 100))
    setDiluent(m?.diluents?.[0] ?? "NaCl 0,9%")
    setRouteShort(defaultRoute)
    setInfuseMinutes("")
    setDropFactor(DEFAULT_DROP_FACTOR)
    setDeliveryDevice("drip")
    setAllowWithdraw(false)
    setFixedDoseAmount("")
    setActiveRecipeId("system")
    tickHaptic()
  }

  function saveWardFrom() {
    if (conc == null) return
    saveWard({
      drugId: drug.id,
      title: saveTitle.trim() || `${diluent} · ${vialForm === "powder" ? "lọ bột" : vialForm === "fixed" ? "chai cố định" : "ống dung dịch"} · ${routeShort}`,
      concValue: conc,
      vialAmount: va,
      vialUnit,
      vials: nv,
      volumeMl: vol,
      vialForm: spec.form,
      vialVolumeMl: spec.volumeMl ?? undefined,
      reconstituteMl: spec.reconstituteMl ?? undefined,
      displacementMl: spec.displacementMl ?? undefined,
      diluent,
      route: routeShort,
      infuseMinutes: minutes ?? undefined,
      dropFactor,
      deliveryDevice: routeShort === "TTM" ? deliveryDevice : undefined,
      allowWithdraw,
    })
    setSaveTitle("")
    tickHaptic()
  }

  function saveLog() {
    if (conc == null) return
    logCalc({
      drug: drug.name,
      kind: "mix",
      inputs: [usageLine ?? describeComposition(outcome(), vialLabel)],
      output: isFixed ? usageLine ?? "" : `Nồng độ ${formatDoseNumber(conc)} ${concUnit} trong ${trim(vol)} mL`,
    })
    tickHaptic()
  }

  return (
    <div className="mt-2.5 p-3 rounded-[14px] fade-in" style={{ background: C.surfaceAlt, border: "1px solid var(--c-line)" }}>
      {wardList.length > 0 && (
        <WardRecipeChips
          wardList={wardList}
          activeId={activeRecipeId}
          // Bọc trong arrow: truyền thẳng `loadSystemDefault` vào onClick sẽ đưa ĐỐI TƯỢNG SỰ KIỆN
          // vào tham số `m` (quy cách cần nạp) và xoá sạch bảng pha.
          onSelectSystem={() => loadSystemDefault()}
          onSelectWard={loadWard}
          onDelete={(id) => clearWard(drug.id, id)}
          onPin={(id) => pinWard(drug.id, id)}
        />
      )}

      {/* Quy cách đóng gói DỰNG SẴN — chỉ hiện khi thuốc khai từ hai quy cách trở lên (một quy cách
          thì hàng chip này không có gì để chọn, chỉ tốn một dòng). Bấm là nạp thẳng hàm lượng/thể
          tích ống của quy cách đó vào bảng bên dưới; hàng thật ở khoa khác hẳn thì vẫn sửa tay được
          như trước — xem mixOptionLabel. */}
      {mixList.length > 1 && (
        <div className="mb-2">
          <label className={`${T.label} text-slate-500 mb-1 block`}>Quy cách đóng gói — bấm để đổi</label>
          <div className="flex flex-wrap gap-1.5">
            {mixList.map((m, i) => (
              <button
                key={i}
                onClick={() => {
                  setMixIndex(i)
                  loadSystemDefault(m)
                }}
                className={CHIP}
                style={pill(i === mixIndex)}
              >
                {mixOptionLabel(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isFixed && (
        <>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Dung môi</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {allowedDiluents.map((d) => (
              <button key={d} onClick={() => setDiluent(d)} className={CHIP} style={pill(diluent === d)}>
                {d}
              </button>
            ))}
            {avoidDiluents.map((d) => (
              <button
                key={d}
                onClick={() => setDiluent(d)}
                className={CHIP}
                style={
                  diluent === d
                    ? { background: C.dangerIcon, borderColor: C.dangerIcon, color: "var(--c-on-bright)" }
                    : { background: C.surface, borderColor: C.dangerLine, color: "var(--c-danger-deep)" }
                }
              >
                {d}
              </button>
            ))}
          </div>
          {diluentBlocked && (
            <p className="text-[12px] font-bold leading-[1.45] mb-2 px-2.5 py-2 rounded-[14px]" style={{ background: C.dangerSoft, color: "var(--c-danger-deep)" }}>
              {mix?.diluentWarning ?? `Không pha ${drug.name} với ${diluent}.`}
            </p>
          )}
        </>
      )}

      {/* Chỉ TTM mới cần chọn thiết bị truyền — TMC là tiêm nhanh một lần, không có tốc độ. Một số
          kháng sinh (vancomycin liều cao, một số kháng sinh truyền kéo dài khác) BẮT BUỘC chạy bơm
          tiêm điện/bơm thể tích vì tốc độ quá chậm để đếm giọt cho chính xác — xem lib/mixing.ts
          (pumpRateMlPerHour) và lib/usageText.ts. */}
      {routeShort === "TTM" && (
        <>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Thiết bị truyền</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(
              [
                { v: "drip" as const, label: "Dây thường (giọt/phút)" },
                { v: "pump" as const, label: "Bơm tiêm điện (mL/giờ)" },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => {
                  setDeliveryDevice(opt.v)
                  tickHaptic()
                }}
                className={CHIP}
                style={pill(deliveryDevice === opt.v)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Vài khoa hoàn nguyên/gộp nhiều lọ-chai rồi rút bớt dung dịch dư ra (cho phép số lọ lẻ như
          1,5 lọ), vài khoa chỉ dùng NGUYÊN số lọ/chai đã mở — quyết định này ảnh hưởng thẳng tới gợi
          ý số lọ/chai bên dưới, nên đặt ngay trước "Dạng chế phẩm". */}
      <label className={`${T.label} text-slate-500 mb-1 block`}>Cho phép rút dung dịch sau pha?</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(
          [
            { v: false, label: "Không — bắt buộc số nguyên" },
            { v: true, label: "Có — được lấy số lẻ" },
          ]
        ).map((opt) => (
          <button
            key={String(opt.v)}
            onClick={() => {
              setAllowWithdraw(opt.v)
              // Tính lại ngay bằng giá trị MỚI vừa bấm — closure của applySolutionSuggestion/
              // applyFixedSuggestion còn giữ allowWithdraw CŨ tới khi component render lại, nên
              // phải truyền tay opt.v thay vì dựa vào state (chưa kịp cập nhật ở lượt render này).
              if (va > 0) {
                if (isFixed) {
                  if (fixedVialVolume != null) applyFixedSuggestion(va, fixedVialVolume, opt.v)
                } else {
                  applySolutionSuggestion(va, opt.v)
                }
              }
              tickHaptic()
            }}
            className={CHIP}
            style={pill(allowWithdraw === opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className={`${T.label} text-slate-500 mb-1 block`}>Dạng chế phẩm</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(
          [
            { v: "powder" as VialForm, label: "Lọ bột" },
            { v: "solution" as VialForm, label: "Ống dung dịch" },
            { v: "fixed" as VialForm, label: "Chai cố định hàm lượng" },
          ]
        ).map((opt) => (
          <button key={opt.v} onClick={() => setVialForm(opt.v)} className={CHIP} style={pill(vialForm === opt.v)}>
            {opt.label}
          </button>
        ))}
      </div>

      {isFixed ? (
        <>
          {/* Chai cố định hàm lượng: KHÔNG pha loãng thêm — chỉ khai hàm lượng/thể tích cả chai rồi
              hoặc dùng trọn, hoặc rút một phần theo liều cần. Liều cần có thể vượt một chai — GỘP
              NHIỀU CHAI thay vì rút lẻ trong một chai duy nhất; ô "Số chai" dùng chung state với "Số
              lọ/ống" ở hai dạng kia (WardRecipe.vials), mặc định 1 nên không đổi hành vi cũ. Tự tính
              số chai + thể tích rút (làm tròn tới hàng trăm mL) khi biết khoảng liều — áp dụng cho
              MỌI đường dùng/thiết bị truyền, không riêng bơm tiêm điện. */}
          {/* min-h-[2.8em] trên nhãn (issue "bảng pha không ngay hàng"): "Hàm lượng 1 chai" và "Thể
              tích 1 chai (mL)" dài ngắn khác nhau nên xuống dòng khác nhau ở cột hẹp — nhãn dài 2 dòng
              đẩy ô nhập tụt xuống so với ô cạnh bên chỉ có nhãn 1 dòng. Đặt trước chiều cao cho ĐÚNG 2
              dòng (12px × 1.4 × 2, xem T.label) trên mọi nhãn cùng hàng để ô nhập luôn ngang hàng dù
              nhãn dài ngắn khác nhau. */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={`${T.label} text-slate-500 mb-1 block min-h-[2.8em]`}>Hàm lượng 1 chai</label>
              <input
                value={vialAmount}
                onChange={(e) => {
                  const v = normalizeDecimalInput(e.target.value)
                  setVialAmount(v)
                  const parsed = parseFloat(v)
                  if (parsed > 0 && fixedVialVolume != null) applyFixedSuggestion(parsed, fixedVialVolume)
                }}
                inputMode="decimal"
                placeholder="750"
                className={FIELD}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label className={`${T.label} text-slate-500 mb-1 block min-h-[2.8em]`}>Thể tích 1 chai (mL)</label>
              <input
                value={vialVolume}
                onChange={(e) => {
                  const v = normalizeDecimalInput(e.target.value)
                  setVialVolume(v)
                  const parsed = parseFloat(v)
                  if (va > 0 && parsed > 0) applyFixedSuggestion(va, parsed)
                }}
                inputMode="decimal"
                placeholder="150"
                className={FIELD}
                style={FIELD_STYLE}
              />
            </div>
          </div>
          <div className="mb-2">
            <label className={`${T.label} text-slate-500 mb-1 block`}>Số chai</label>
            <input value={vials} onChange={(e) => setVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={FIELD} style={FIELD_STYLE} />
          </div>
          {/* Gợi ý số chai (+ thể tích rút gộp nếu khoa cho rút) — bấm để áp dụng lại nếu vừa sửa tay
              lệch khỏi gợi ý. Thể tích rút làm tròn tới mốc trăm/năm mươi mL (khác thang với thể
              tích pha loãng nhỏ ở hai dạng kia) — xem poolDrawVolume trong lib/mixing.ts. Không cho
              rút thì không có "rút X mL" nào cả — dùng TRỌN số chai, và có thể có phương án thay thế
              (thấp hơn/cao hơn) để tự chọn thay vì chỉ một đáp án app tự thiên vị. */}
          {fixedPoolSuggestion && doseTargetMg && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                onClick={() => {
                  setVials(String(fixedPoolSuggestion.count))
                  if (fixedPoolSuggestion.drawMl == null) {
                    setFixedDoseAmount("")
                  } else {
                    const concPerMl = va / (fixedVialVolume as number)
                    setFixedDoseAmount(String(Math.round(fixedPoolSuggestion.drawMl * concPerMl * 100) / 100))
                  }
                  tickHaptic()
                }}
                className="text-left text-[12px] leading-[1.45] font-semibold px-2.5 py-2 rounded-[14px] underline decoration-dotted"
                style={{ background: C.accentSoft, color: "var(--c-accent-deep)" }}
              >
                {fixedPoolSuggestion.drawMl == null
                  ? `Gợi ý dùng trọn ${trim(fixedPoolSuggestion.count, 0)} chai`
                  : `Gợi ý ${trim(fixedPoolSuggestion.count, 0)} chai — rút ${trim(fixedPoolSuggestion.drawMl)} mL`}
                {" "}(khớp khoảng liều {formatDoseNumber(doseTargetMg.low)}
                {doseTargetMg.high != null ? `–${formatDoseNumber(doseTargetMg.high)}` : ""} {doseTargetMg.unit})
              </button>
              {fixedPoolSuggestion.alt && (
                <button
                  onClick={() => {
                    setVials(String(fixedPoolSuggestion.alt!.count))
                    setFixedDoseAmount("")
                    tickHaptic()
                  }}
                  className="text-left text-[12px] leading-[1.45] font-semibold px-2.5 py-2 rounded-[14px] underline decoration-dotted"
                  style={{ background: C.lineSoft, color: C.textSoft }}
                >
                  Hoặc {trim(fixedPoolSuggestion.alt.count, 0)} chai
                </button>
              )}
            </div>
          )}
          {/* Đã nhập hàm lượng nhưng KHÔNG có gợi ý nào (và không phải vì thiếu dữ liệu — đã đủ hàm
              lượng/thể tích) — bậc liều hiện tại là liều phải cá thể hoá, không có con số cố định để
              gợi ý. Nói rõ thay vì để trống trông như mất gợi ý. */}
          {!fixedPoolSuggestion && doseNotComputable && va > 0 && fixedVialVolume != null && fixedVialVolume > 0 && (
            <p className="text-[12px] leading-[1.45] mb-2" style={{ color: C.warn }}>
              Không gợi ý được số chai — liều DUY TRÌ ở bậc CrCl hiện tại phải cá thể hoá theo nồng độ đo được.
            </p>
          )}
          {unitChoices.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {unitChoices.map((u) => (
                <button key={u} onClick={() => setVialUnit(u)} className={CHIP} style={pill(vialUnit === u)}>
                  {u}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Ống dung dịch: 3 ô ngắn vừa khít một hàng. Lọ bột thì KHÔNG dùng chung hàng đó — nhãn "Pha
              ban đầu với (mL/lọ)" dài hơn hẳn "Thể tích 1 ống (mL)", nhét vào 1/3 hàng sẽ xuống dòng và
              đẩy ô nhập tụt xuống so với hai ô bên cạnh (không còn ngang hàng). Tách thành hàng riêng để
              nhãn dài có đủ chỗ, không phải đứng cạnh nhãn ngắn.
              `min-h-[2.8em]` trên cả ba nhãn: ở cột hẹp (grid-cols-3), "Hàm lượng 1 {vialLabel}" và
              "Thể tích 1 {vialLabel} (mL)" xuống 2 dòng còn "Số {vialLabel}" chỉ 1 dòng — đặt trước
              chiều cao ĐÚNG 2 dòng (12px × 1.4 × 2, xem T.label) trên mọi nhãn cùng hàng để ba ô nhập
              luôn ngang hàng bất kể nhãn dài ngắn khác nhau theo từng thuốc. */}
          <div className={`grid ${vialForm === "solution" ? "grid-cols-3" : "grid-cols-2"} gap-2 mb-2`}>
            <div>
              <label className={`${T.label} text-slate-500 mb-1 block min-h-[2.8em]`}>Hàm lượng 1 {vialLabel}</label>
              <input
                value={vialAmount}
                onChange={(e) => {
                  const v = normalizeDecimalInput(e.target.value)
                  setVialAmount(v)
                  const parsed = parseFloat(v)
                  if (parsed > 0) applySolutionSuggestion(parsed)
                }}
                inputMode="decimal"
                placeholder="1000"
                className={FIELD}
                style={FIELD_STYLE}
              />
            </div>
            {vialForm === "solution" && (
              <div>
                <label className={`${T.label} text-slate-500 mb-1 block min-h-[2.8em]`}>Thể tích 1 {vialLabel} (mL)</label>
                <input value={vialVolume} onChange={(e) => setVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="2" className={FIELD} style={FIELD_STYLE} />
              </div>
            )}
            <div>
              <label className={`${T.label} text-slate-500 mb-1 block min-h-[2.8em]`}>Số {vialLabel}</label>
              <input value={vials} onChange={(e) => setVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={FIELD} style={FIELD_STYLE} />
            </div>
          </div>

          {/* Đã tự điền số {vialLabel} + thể tích pha loãng ngay khi gõ hàm lượng ở trên (xem
              applySolutionSuggestion, áp dụng cho mọi đường dùng/thiết bị truyền) — dòng này chỉ để
              BẤM ÁP DỤNG LẠI nếu vừa sửa tay lệch khỏi gợi ý, vẫn sửa tay ô "Số {vialLabel}"/"Pha
              loãng tới" bình thường sau đó. */}
          {vialCountSuggestion && doseTargetMg && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                onClick={() => {
                  applySolutionSuggestion(va)
                  tickHaptic()
                }}
                className="text-left text-[12px] leading-[1.45] font-semibold px-2.5 py-2 rounded-[14px] underline decoration-dotted"
                style={{ background: C.accentSoft, color: "var(--c-accent-deep)" }}
              >
                Gợi ý {trim(vialCountSuggestion.count)} {vialLabel} (≈ {formatDoseNumber(vialCountSuggestion.totalInDoseUnit)} {doseTargetMg.unit} — khớp khoảng liều{" "}
                {formatDoseNumber(doseTargetMg.low)}
                {doseTargetMg.high != null ? `–${formatDoseNumber(doseTargetMg.high)}` : ""} {doseTargetMg.unit})
              </button>
              {/* Không cho rút dung dịch VÀ không có số nguyên nào khớp hẳn — có 2 phương án hợp lý
                  (thấp hơn/cao hơn khoảng liều), hiện cả hai để tự chọn thay vì chỉ app tự quyết. */}
              {vialCountSuggestion.alt && (
                <button
                  onClick={() => {
                    setVials(String(vialCountSuggestion.alt!.count))
                    tickHaptic()
                  }}
                  className="text-left text-[12px] leading-[1.45] font-semibold px-2.5 py-2 rounded-[14px] underline decoration-dotted"
                  style={{ background: C.lineSoft, color: C.textSoft }}
                >
                  Hoặc {trim(vialCountSuggestion.alt.count)} {vialLabel} (≈ {formatDoseNumber(vialCountSuggestion.alt.totalInDoseUnit)} {doseTargetMg.unit})
                </button>
              )}
            </div>
          )}
          {/* Đã nhập hàm lượng nhưng KHÔNG có gợi ý (và không phải vì thiếu dữ liệu) — bậc liều hiện
              tại là liều phải cá thể hoá, không có con số cố định để gợi ý. Nói rõ thay vì để trống
              trông như mất gợi ý (xem doseNotComputable). */}
          {!vialCountSuggestion && doseNotComputable && va > 0 && (
            <p className="text-[12px] leading-[1.45] mb-2" style={{ color: C.warn }}>
              Không gợi ý được số {vialLabel} — liều DUY TRÌ ở bậc CrCl hiện tại phải cá thể hoá theo nồng độ đo được.
            </p>
          )}

          {/* Xếp dọc, mỗi ô một hàng riêng — không ghép ngang: "Thể tích bột tăng sau pha" luôn dài hơn
              hẳn "Pha ban đầu với", và độ dài {vialLabel} (lọ/ống/chai) đổi theo từng thuốc nên không
              thể tin là hai nhãn sẽ luôn xuống dòng đối xứng nhau ở mọi cỡ chữ. */}
          {vialForm === "powder" && (
            <div className="space-y-2 mb-2">
              <div>
                <label className={`${T.label} text-slate-500 mb-1 block`}>Pha ban đầu với (mL/{vialLabel})</label>
                <input value={reconstitute} onChange={(e) => setReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="10" className={FIELD} style={FIELD_STYLE} />
              </div>
              <div>
                <label className={`${T.label} text-slate-500 mb-1 block`}>Thể tích bột tăng sau pha (mL/{vialLabel})</label>
                <input value={displacement} onChange={(e) => setDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="0,5" className={FIELD} style={FIELD_STYLE} />
              </div>
            </div>
          )}

          <div className="mb-2">
            <label className={`${T.label} text-slate-500 mb-1 block`}>Pha loãng tới (mL)</label>
            <input value={volume} onChange={(e) => setVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="100" className={FIELD} style={FIELD_STYLE} />
          </div>

          {unitChoices.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {unitChoices.map((u) => (
                <button key={u} onClick={() => setVialUnit(u)} className={CHIP} style={pill(vialUnit === u)}>
                  {u}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tốc độ truyền — chỉ có ý nghĩa với đường TTM, không áp dụng cho TMC (tiêm thẳng). Bộ dây
          (giọt/mL) chỉ hiện khi dùng dây thường; bơm tiêm điện đặt thẳng mL/giờ, không đếm giọt. */}
      {routeShort === "TTM" && infuseVolumeMl != null && infuseVolumeMl > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={`${T.label} text-slate-500 mb-1 block`}>Truyền trong (phút)</label>
            <input value={infuseMinutes} onChange={(e) => setInfuseMinutes(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="60" className={FIELD} style={FIELD_STYLE} />
          </div>
          {usePump ? (
            // Luôn chiếm đúng một ô của lưới 2 cột, kể cả khi CHƯA nhập số phút — trước đây ô này
            // biến mất hoàn toàn lúc rateMlPerHour còn null, để lại một hàng lệch (chỉ "Truyền trong
            // (phút)" một mình, nửa lưới bên phải trống trơn) thay vì đứng cân đối như phía dây thường.
            <div className="flex flex-col justify-end">
              <label className={`${T.label} text-slate-500 mb-1 block`}>Tốc độ bơm</label>
              <p className={`${FIELD} flex items-center font-bold`} style={{ ...FIELD_STYLE, color: rateMlPerHour != null ? "var(--c-accent-deep)" : C.muted }}>
                {rateMlPerHour != null ? `BTĐ ${trim(rateMlPerHour)} ml/h` : "Nhập số phút để tính"}
              </p>
            </div>
          ) : (
            <div>
              <label className={`${T.label} text-slate-500 mb-1 block`}>Bộ dây (giọt/mL)</label>
              <div className="flex h-11 rounded-[20px] overflow-hidden border" style={{ borderColor: C.line }}>
                {[DEFAULT_DROP_FACTOR, MICRO_DROP_FACTOR].map((f) => (
                  <button
                    key={f}
                    onClick={() => setDropFactor(f)}
                    className="flex-1 text-[12px] font-semibold"
                    style={dropFactor === f ? { background: C.accent, color: "var(--c-on-primary)" } : { background: C.surface, color: C.textSoft }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {fixedImpossible && (
        <div className="px-3 py-2.5 rounded-[14px] flex items-start gap-2 mb-2" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }}>
          <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
          <p className={T.meta} style={{ color: "var(--c-danger-deep)" }}>
            LIỀU CẦN LẤY VƯỢT HÀM LƯỢNG CẢ CHAI — kiểm tra lại liều cần lấy hoặc hàm lượng chai.
          </p>
        </div>
      )}

      {conc != null && (isFixed ? !fixedImpossible : !isNaN(nv)) && (
        impossible ? (
          <div className="px-3 py-2.5 rounded-[14px] flex items-start gap-2" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }}>
            <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
            <p className={T.meta} style={{ color: "var(--c-danger-deep)" }}>
              KHÔNG PHA ĐƯỢC — thể tích thuốc đã nhiều hơn thể tích pha loãng. Kiểm tra lại số {vialLabel}, thể tích 1 {vialLabel} hoặc thể tích pha loãng.
            </p>
          </div>
        ) : (
          <div className="px-3 py-2.5 rounded-[14px]" style={{ background: C.surface, border: "1px solid var(--c-line-strong)" }}>
            {usageLine && <p className="text-[13px] font-bold text-slate-800 leading-[1.45]">{usageLine}</p>}
            {!isFixed && <p className="text-[12px] leading-[1.45] mt-1" style={{ color: C.textSoft }}>Nồng độ {formatDoseNumber(conc)} {concUnit}</p>}
            <p className="text-[12px] font-semibold leading-[1.45] mt-1" style={{ color: "var(--c-accent-deep)" }}>
              {isFixed
                ? fixedDoseNum != null
                  ? // Luôn nói rõ SỐ CHAI đã gộp — "rút 300 mL từ chai 750 mg/150 mL" đọc như đang rút
                    // từ MỘT chai duy nhất, dễ hiểu lầm là lỗi khi con số rút ra lớn hơn cả một chai
                    // (vd rút 300 mL từ chai chỉ có 150 mL). Phải nói "2 chai gộp lại" ngay tại đây.
                    fixedBottleCount > 1
                    ? `Rút ${formatDoseNumber(fixedDrawMl as number)} mL từ ${trim(fixedBottleCount, 0)} chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL gộp lại (tổng ${formatDoseNumber(fixedPoolAmount as number)} ${vialUnit}/${trim(fixedPoolVolume as number)} mL)`
                    : `Rút ${formatDoseNumber(fixedDrawMl as number)} mL từ chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL`
                  : fixedBottleCount > 1
                    ? `Dùng trọn ${trim(fixedBottleCount, 0)} chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL`
                    : `Dùng trọn 1 chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL`
                : describeComposition(outcome(), vialLabel)}
            </p>
            {mix?.infuseNote && <p className="text-[12px] leading-[1.45] mt-2" style={{ color: C.textSoft }}>Truyền: {mix.infuseNote}</p>}

            {/* Chỉ còn HAI mức màu, không phải ba: nguy hiểm (đỏ) / thận trọng (hổ phách). Trước đây
                "warn" tô cam riêng tách khỏi "note" tô hổ phách — trong buồng tối cam #c2410c và
                hổ phách #92400e gần như không phân biệt được, mà lại đang mang hai mức nghiêm
                trọng khác nhau mà chỉ dựa vào màu để phân biệt. Chữ (headline/detail) vẫn nói rõ
                mức độ; màu chỉ còn giữ hai bậc thật sự phân biệt được. */}
            {grade.severity !== "ok" && (
              <div
                className="mt-2 px-2.5 py-2 rounded-[14px] flex items-start gap-2"
                style={
                  grade.severity === "danger"
                    ? { background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }
                    : { background: C.warnSoft, border: "1px solid var(--c-warn-line)" }
                }
              >
                <span className="mt-0.5 flex-none" style={{ color: grade.severity === "danger" ? C.dangerIcon : C.warnIcon }}>
                  {icons.alert()}
                </span>
                <div>
                  {grade.headline && (
                    <p className="text-[12px] font-extrabold leading-[1.3]" style={{ color: grade.severity === "danger" ? "var(--c-danger-deep)" : C.warn }}>
                      {grade.headline}
                    </p>
                  )}
                  {grade.detail && (
                    <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: grade.severity === "danger" ? "var(--c-danger-deep)" : C.warn }}>
                      {grade.detail}
                    </p>
                  )}
                </div>
              </div>
            )}

            {blocked ? (
              <button
                onClick={() => {
                  setConfirmed(true)
                  tickHaptic()
                }}
                className={`${BTN_TALL} mt-2 border-transparent`}
                style={{ background: grade.severity === "danger" ? "var(--c-danger-deep)" : C.warn, color: "var(--c-on-bright)" }}
              >
                Tôi đã kiểm tra lại — vẫn dùng công thức này
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={saveLog} className="h-9 px-3 rounded-full text-[12px] font-bold dose-press" style={{ background: C.accent, color: "var(--c-on-primary)" }}>
                    Lưu vào nhật ký
                  </button>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {/* `min-w-0` là bắt buộc: flex item mặc định min-width:auto (theo nội dung), nên
                      một input flex-1 đứng cạnh nút flex-none sẽ không chịu co lại dưới độ rộng nội
                      dung của nó — trên màn hình hẹp, cả hàng tràn ra ngoài thẻ thay vì input co lại. */}
                  <input
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Đặt tên công thức (tuỳ chọn, vd: Khoa Hồi sức)"
                    maxLength={40}
                    className="flex-1 min-w-0 h-11 px-2.5 rounded-full text-[12px] border outline-none"
                    style={FIELD_STYLE}
                  />
                  {/* h-11, không phải h-9: đứng cùng hàng với ô nhập "Đặt tên công thức" (buộc phải
                      cao 44px theo quy tắc sàn 16px/44px cho input) — hai chiều cao khác nhau trên
                      cùng một hàng sẽ lệch đường đáy, trông như hai khối không liên quan. */}
                  <button onClick={saveWardFrom} className="h-11 px-3 rounded-full text-[12px] font-bold border flex-none dose-press" style={{ borderColor: C.accentLine, color: "var(--c-accent-deep)" }}>
                    Lưu công thức mới
                  </button>
                </div>
              </>
            )}
          </div>
        )
      )}
      {conc == null && (
        // text-slate-500 (→ --c-text-muted, ~5.8:1), không phải -400 (→ --c-muted, ~3.1:1) — đây là
        // hướng dẫn thao tác thật phải đọc được, không phải icon/placeholder (cùng quy tắc đã áp ở
        // RunningPanel, xem 6002-6004; /impeccable critique 2026-08-18).
        <p className="text-[12px] leading-[1.45] text-slate-500">
          {isFixed ? `Nhập hàm lượng và thể tích cả chai để tính.` : `Nhập hàm lượng ${vialLabel}, số ${vialLabel} và thể tích pha loãng để tính nồng độ.`}
        </p>
      )}
    </div>
  )
}
