import { useState, useEffect, useMemo } from "react"
import type { Antibiotic, DiseaseEntry, SourceInfo } from "../../data/types"
import { resolveDosingWeight } from "../../lib/bodyWeight"
import { RRT_LABELS, crclNullReason, needsCrrtFlow } from "../../lib/patient"
import { checkWeight } from "../../lib/doseSafety"
import { DEFAULT_DROP_FACTOR, DEFAULT_PUMP_STEP, dropsPerMinute, pickEasiestBatchVolume, pumpRateMlPerHour, resolveFixedDraw, roundingExcess, roundToStep, ROUND_WARN_RATIO, type VialForm } from "../../lib/mixing"
import { useRoundUp } from "../../lib/roundingPref"
import { formatFixedUsage, formatVialUsage } from "../../lib/usageText"
import { formatSavedAt } from "../../lib/wardRecipes"
import { applyDoseCap, computePerKgText, describeDoseCap, findFixedDose, findPerKgDoses, formatMass } from "../../lib/perKgDose"
import { tickHaptic } from "../../lib/haptics"
import { formatDoseNumber, massFactor } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { AdminRoute, BTN_BLOCK, C, CHIP, NUM, NUM_DOSE, PROSE, R, T, adminRouteLabel, highlightDoseNumbers, inferAdminRoutes, trim } from "../../lib/ui"
import { useDosing } from "./context"
import { useActiveWardRecipe, tierFor, useVialCountGuard, VialCountWarning, RoundingControl, CompatWarningForDrug, WardRecipeChips } from "./antibioticMixingHelpers"
import { parseStrictNumber } from "./numberInput"
import { ConfirmIconButton, formatReviewedOn, Disclosure, SourceLine } from "./sharedUi"
import { BolusList } from "./infusionMixing"
import { AntibioticMixPanel } from "./AntibioticMixPanel"
import { DrugWarnings } from "./CalcLogSheet"

export function AntibioticDoseCard({
  drug,
  disease,
  isOverride,
  onEdit,
  onDelete,
}: {
  drug: Antibiotic
  disease?: DiseaseEntry | null
  isOverride?: boolean
  onEdit?: (drug: Antibiotic) => void
  onDelete?: (id: string) => void
}) {
  const { patient, abwKg, heightCm, ageYears, crcl, crclUsable, crclInputImplausible: patientCrclInputImplausible, openPatientPanel, pinRunning, wardRecipes, clearWard, pinWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  const { activeId: activeRecipeId, setActiveId: setActiveRecipeId, active: ward } = useActiveWardRecipe(wardList)
  const [showMix, setShowMix] = useState(false)
  const [confirmClearWard, setConfirmClearWard] = useState(false)
  // Đường uống không cần hoàn nguyên/pha loãng — bảng pha chỉ có ý nghĩa với đường tiêm/truyền.
  const injectable = !drug.route.includes("Uống")
  const indication = disease ? drug.indications?.find((i) => i.diseaseId === disease.id) : undefined
  // `drug.tiers` là optional (thuốc chỉ có liều chuẩn, không phân bậc theo CrCl) — quy về mảng
  // rỗng ngay tại đây để mọi chỗ đọc `tiers.length` bên dưới không phải tự phòng thân từng chỗ.
  const tiers = indication?.tiers ?? drug.tiers ?? []
  const standardDose = indication?.standardDose ?? drug.standardDose
  // Nguồn hiện ra: bệnh lý có tự khai nguồn riêng thì dùng nguồn đó (xem IndicationDose.source),
  // không thì rơi về nguồn của thuốc — không còn gộp cứng một nguồn cho mọi bệnh lý như trước.
  const sourceItem: SourceInfo = indication && (indication.source || indication.reviewedOn) ? indication : drug
  // Khi bệnh nhân lọc máu hoặc creatinin chưa ổn định thì KHÔNG được chọn bậc liều theo CrCl —
  // app quay về liều chuẩn (bậc thận bình thường) và nói rõ vì sao, thay vì đưa ra một bậc liều
  // trông chắc chắn mà thực ra không áp dụng được.
  const effectiveCrcl = crclUsable ? crcl : null
  const tier = tierFor(tiers, effectiveCrcl)
  // Chưa nhập đủ thông số để ra CrCl thì tierFor() trả về bậc THẬN BÌNH THƯỜNG. Trước đây app im
  // lặng hiển thị bậc đó như một câu trả lời chắc chắn — đúng kiểu sai nguy hiểm nhất, vì người
  // dùng không có dấu hiệu nào để biết con số đang giả định thận bình thường. Chỉ nhắc khi thuốc
  // THẬT SỰ có nhiều bậc liều; thuốc một bậc (metronidazole, azithromycin) thì CrCl không đổi gì.
  // `crcl == null` giờ có HAI nguyên nhân khác hẳn nhau kể từ bản vá P0 (2026-08-19): "chưa nhập gì"
  // (missingCrcl thật) HOẶC "đã nhập nhưng tuổi/cân nặng/chiều cao/creatinin khiến estimateCrCl từ
  // chối thẳng, vd tuổi 200 làm tử số Cockcroft-Gault ≤0" (crclDataRejected) — trước đây gộp chung
  // một `missingCrcl`, nên ca thứ hai hiện banner "Nhập tuổi, cân nặng và creatinin..." dù bác sĩ đã
  // nhập đủ, dễ khiến họ gõ lại đúng số sai đó hoặc tưởng app lỗi hiển thị (/impeccable critique
  // 2026-08-19T14-41, P2). `crclNullReason` (lib/patient.ts) là nguồn chân lý DUY NHẤT cho phân biệt
  // này, dùng chung với PatientPanel — trước đây mỗi nơi tự suy luận lại bằng
  // patientCrclInputImplausible (chỉ true khi một trường CÓ giá trị và bị gắn cờ, không phân biệt
  // được ca "tuổi thiếu + cân nặng bị gắn cờ" khỏi ca "đã nhập đủ nhưng bị từ chối") và đã trôi lệch
  // nhau (/impeccable critique 2026-08-21, P1).
  const crclApplies = crcl == null && crclUsable && tiers.length > 1
  const crclReason = crclApplies ? crclNullReason(ageYears, abwKg, parseStrictNumber(patient.scr)) : null
  const crclDataRejected = crclReason === "rejected"
  const missingCrcl = crclReason === "missing"
  // CrCl ĐÃ được dùng để chọn bậc liều ở trên (effectiveCrcl != null), nhưng dựa trên tuổi/cân
  // nặng/chiều cao/creatinin mà chính app đã gắn cờ "implausible" (vd tuổi 200) — khác missingCrcl
  // (chưa có số), đây là "có số nhưng số có thể sai". Cùng cách weightImplausible đã cảnh báo cho
  // liều mg/kg ở dưới (/impeccable critique 2026-08-19, P0). `patientCrclInputImplausible` đến từ
  // DosingContext (tính chung một lần với PatientPanel, xem DosingContextValue.crclInputImplausible)
  // — ở đây chỉ còn hai điều kiện riêng của thẻ thuốc này: CrCl có thật sự được dùng để chọn bậc
  // (effectiveCrcl != null) và thuốc có thật nhiều hơn một bậc hay không.
  const crclInputImplausible = effectiveCrcl != null && tiers.length > 1 && patientCrclInputImplausible
  // Chỉ hiện "Liều chuẩn" khi nó KHÁC dòng liều ở trên — trước đây meropenem in ra "1 g mỗi 8h" rồi
  // ngay dưới lại "Liều chuẩn: 1 g mỗi 8h (IV)", đọc như hai thông tin khác nhau.
  const showStandardDose = !!standardDose && effectiveCrcl == null && !standardDose.startsWith(tier.dose)
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  // Cân nặng gõ nhầm (vd 5000 kg) đã bị checkWeight() gắn cờ "implausible" ở khung Bệnh nhân, nhưng
  // trước đây cờ đó không truyền xuống đây — app vẫn nhân 20–25 mg/kg × 5000 kg ra một liều Vancomycin
  // trông chắc chắn (100–125 g). Chặn NGAY TẠI NGUỒN (doseTargetMg) để mọi chỗ đọc từ nó (perKgDoses,
  // autoUsage/bảng pha) đều không tính ra số khi cân nặng vô lý, thay vì phải nhớ chặn từng chỗ hiển thị.
  const weightImplausible = checkWeight(dosingWeight.used)?.severity === "implausible"
  // Ba khối cảnh báo độc lập ngay dưới (cơ sở cân nặng, RRT/AKI, CrCl) có thể cùng hiện một lúc trên
  // ca bệnh nhân xấu nhất (vd tuổi bất thường + thiếu chiều cao + đang lọc máu) mà không có gì phân
  // biệt "đây là N lời nhắc ĐỘC LẬP cần đọc hết" với một khối văn bản liên tục — một bác sĩ vội có
  // thể lướt qua một trong số đó (/impeccable critique 2026-08-21 lượt 2, P2). Đếm trước để chỉ chêm
  // dòng tiêu đề nhóm khi thật sự có từ 2 lời nhắc trở lên; một cảnh báo đơn lẻ không cần dòng này.
  const weightBasisWarnActive = Boolean(drug.doseWeightBasis) && drug.doseWeightBasis !== "actual" && (dosingWeight.used == null || dosingWeight.heightMissingForBasis)
  const rrtWarnActive = patient.rrt !== "none" || patient.akiUnstable
  const crclWarnActive = missingCrcl || crclDataRejected || crclInputImplausible
  const preDoseWarningCount = [weightBasisWarnActive, rrtWarnActive, crclWarnActive].filter(Boolean).length
  // Nhân sẵn liều mg/kg: app đã có cân nặng và đã có chuỗi "15–20 mg/kg mỗi 8–12h" thì không có lý
  // do gì bắt người dùng tự nhẩm — đó đúng là chỗ dễ sai nhất lúc 2 giờ sáng.
  const perKgDoses = useMemo(() => findPerKgDoses(tier.dose), [tier.dose])
  // Tự tính "Cách dùng" theo mức liều CrCl hiện tại: đọc con số liều (mg/kg × cân nặng, hoặc liều
  // tuyệt đối đứng đầu chuỗi) rồi quy đổi ra mL/chai theo công thức pha đã lưu (hoặc mặc định của
  // thuốc) — xem lib/perKgDose.ts (findFixedDose) và lib/mixing.ts (drawFromFixedVial/pickEasiestVolume).
  // Không tự bịa công thức pha: chỉ tính khi thuốc CÓ `mix`/công thức đã lưu, ngược lại im lặng.
  // "Đường dùng" (TTM/TMC/IM/SC) — TRƯỚC ĐÂY nằm sâu bên trong bảng pha thuốc (sau cả mục Dung môi),
  // giờ nhấc lên đây làm STATE DUY NHẤT của cả thẻ: vừa hiện ở mục "Đường dùng" ngay bên dưới, vừa
  // quyết định nút "Bảng pha thuốc" có hiện hay không (chỉ hiện với bốn đường tiêm/truyền — uống,
  // nhỏ mắt... không có gì để pha), vừa truyền xuống AntibioticMixPanel thay cho state riêng của nó.
  // `mixableRoutes` đọc THẲNG từ câu chữ `route` của thuốc (xem inferAdminRoutes trong lib/ui.ts):
  // route ghi CHỈ "(TTM)" hay CHỈ "(TMC)" thì thuốc đó CHỈ được dùng đúng một đường — không cho đổi
  // qua đường còn lại, vì nhiều thuốc bắt buộc truyền chậm (TTM), tiêm nhanh (TMC) là sai lầm nguy
  // hiểm (vd Vancomycin gây hội chứng người đỏ). Chỉ khi route ghi chung chung "(IV)" (chưa phân biệt
  // trong dữ liệu) mới thật sự có hai lựa chọn để bác sĩ tự chọn.
  const mixableRoutes = useMemo(() => inferAdminRoutes(drug.route), [drug.route])
  // Quy cách đóng gói dựng sẵn đang chọn. State ở ĐÂY (không phải trong AntibioticMixPanel) vì cả
  // "Cách dùng" tự tính của thẻ này lẫn bảng pha bên trong đều phải đọc cùng một quy cách — xem
  // mixOptionLabel/draftToMixList. Mặc định quy cách đầu tiên trong dữ liệu thuốc.
  const mixList = useMemo(() => drug.mix ?? [], [drug.mix])
  const [mixIndex, setMixIndex] = useState(0)
  // Dữ liệu thuốc vừa được sửa (bớt quy cách) thì chỉ số cũ có thể trỏ ra ngoài mảng — rơi về quy
  // cách đầu thay vì để `mixList[mixIndex]` thành undefined và mọi phép tính im lặng biến mất.
  const activeMix = mixList[mixIndex] ?? mixList[0]
  const [roundUp, setRoundUp] = useRoundUp()
  // Công thức đã lưu (ward) có thể tự khai đường dùng riêng (khoa A truyền TTM, khoa B tiêm TMC cùng
  // một thuốc) — ưu tiên đường đó, chỉ suy từ `drug.route` khi chưa có công thức nào được lưu. Nếu
  // đường đã lưu không còn nằm trong `mixableRoutes` (vd dữ liệu thuốc vừa được sửa lại) thì bỏ qua,
  // tránh khoá thẻ vào một đường không còn hợp lệ.
  const [routeShort, setRouteShort] = useState<AdminRoute>(
    (ward?.route && mixableRoutes.includes(ward.route) ? ward.route : undefined) ?? mixableRoutes[0] ?? "TTM",
  )
  const pill = (on: boolean) =>
    on
      ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }
  // Chỉ có gì để "pha" khi câu chữ route thật sự là một trong bốn đường tiêm/truyền — uống, nhỏ
  // mắt... không có bảng pha kiểu này, hiện ra sẽ sai vì áp công thức pha lên đường dùng không liên quan.
  const hasMixPanel = mixableRoutes.length > 0
  const mixCfg = useMemo(() => {
    // `vials`/`volumeMl` là null khi CHƯA có công thức đã lưu — tự tính số lọ cần dùng ở autoUsage
    // bên dưới thay vì giả định cứng "đúng 1 lọ" như trước (khiến Amikacin/Vancomycin liều theo
    // cân nặng — đa số cần nhiều hơn 1 lọ — không bao giờ ra được gợi ý).
    if (ward)
      return {
        vialAmount: ward.vialAmount,
        vialUnit: ward.vialUnit,
        vialForm: ward.vialForm ?? "powder",
        vialVolumeMl: ward.vialVolumeMl,
        vials: ward.vials,
        volumeMl: ward.volumeMl,
        diluent: ward.diluent ?? "NaCl 0,9%",
        // Chỉ công thức ĐÃ LƯU mới có cơ sở thật để tính giọt/phút — drug.mix tĩnh không có, nên
        // nhánh dưới vẫn ẩn phần giọt/phút thay vì bịa thời gian truyền.
        infuseMinutes: ward.infuseMinutes,
        dropFactor: ward.dropFactor,
        // Bơm tiêm điện chỉ áp dụng được khi có công thức đã lưu khai rõ — công thức hệ thống dựng
        // sẵn (nhánh drug.mix bên dưới) không biết khoa nào chạy bơm nên luôn coi là dây thường.
        deliveryDevice: ward.deliveryDevice ?? "drip",
        // Mặc định KHÔNG cho rút (số nguyên) khi công thức cũ chưa từng khai — xem WardRecipe.allowWithdraw.
        allowWithdraw: ward.allowWithdraw ?? false,
        // Công thức ĐÃ LƯU luôn có volumeMl thật rồi (dùng thẳng, xem autoUsage) — trường này chỉ có
        // ý nghĩa ở nhánh "chưa lưu" bên dưới, giữ null cho khớp kiểu.
        defaultVolumeMl: null as number | null,
      }
    const mix = activeMix
    if (mix != null && mix.vialAmount != null)
      return {
        vialAmount: mix.vialAmount,
        vialUnit: mix.vialUnit ?? "mg",
        vialForm: mix.vialForm ?? "powder",
        vialVolumeMl: mix.vialVolumeMl,
        vials: null as number | null,
        volumeMl: null as number | null,
        diluent: mix.diluents?.[0] ?? "NaCl 0,9%",
        infuseMinutes: undefined as number | undefined,
        dropFactor: undefined as number | undefined,
        deliveryDevice: "drip" as "drip" | "pump",
        allowWithdraw: false,
        // Thể tích pha loãng mặc định thuốc tự khai (vd Amikacin 1 g/4 ml → 200 mL, xem
        // data/antibiotics.ts) — trước đây KHÔNG được chép vào mixCfg nên autoUsage (nhánh chưa có
        // công thức lưu) phải hardcode 100 mL/lọ bất kể defaultVolumeMl thật của thuốc là bao nhiêu,
        // trong khi bảng pha thủ công (applySolutionSuggestion) vẫn đọc đúng mix.defaultVolumeMl —
        // hai chỗ tính cùng một con số ra hai kết quả khác nhau (bug báo cáo 2026-08-19: Amikacin
        // 1 g/4 ml hiện "đủ 100 ml" ở dòng tự tính, nhưng ô nhập tương tác lại đúng 200 ml).
        defaultVolumeMl: mix.defaultVolumeMl ?? null,
      }
    return null
  }, [ward, activeMix])
  // Một số mức liều viết dạng "Liều nạp 20–25 mg/kg, sau đó theo nồng độ đáy" — con số mg/kg ở đây
  // là liều NẠP một lần, còn liều DUY TRÌ (thứ cần tính lặp lại mỗi lần pha) được nói thẳng là
  // "theo nồng độ đo được", tức KHÔNG có con số cố định. Nếu cứ lấy đại con số mg/kg đứng trước rồi
  // tính ra mL thì sẽ đưa ra một "Cách dùng" trông chắc chắn cho một liều thực ra phải cá thể hoá —
  // đúng kiểu tự suy diễn nguy hiểm mà app tránh ở mọi chỗ khác. Chỉ cần bỏ qua tier đó là đủ an toàn.
  const notComputableDose = /theo nồng độ|cá thể hoá|giãn khoảng liều/i.test(tier.dose)
  // Ngưỡng liều một lần dùng của thuốc (nếu có khai báo) — áp NGAY TẠI ĐÂY, cùng chỗ với chặn cân
  // nặng vô lý, để mọi thứ đọc từ doseTargetMg (bảng pha, "Cách dùng", số mL phải rút) đều đã nằm
  // dưới ngưỡng. Xem applyDoseCap trong lib/perKgDose.ts.
  const doseTargetMg = useMemo(() => {
    if (notComputableDose) return null
    const perKg = perKgDoses[0]
    if (perKg && dosingWeight.used != null) {
      // Cân nặng bất thường (vd 5000 kg gõ nhầm) → không nhân ra một con số trông chắc chắn, xem
      // weightImplausible ở trên.
      if (weightImplausible) return null
      return applyDoseCap(
        perKg.low * dosingWeight.used,
        perKg.high != null ? perKg.high * dosingWeight.used : null,
        perKg.unit,
        drug.maxSingleDose,
      )
    }
    if (perKg) return null // liều mg/kg mà chưa có cân nặng thì không đoán được
    const fixed = findFixedDose(tier.dose)
    return fixed ? applyDoseCap(fixed.amount, null, fixed.unit, drug.maxSingleDose) : null
  }, [notComputableDose, perKgDoses, dosingWeight.used, weightImplausible, tier.dose, drug.maxSingleDose])
  const doseCapText = doseTargetMg ? describeDoseCap(doseTargetMg) : null
  // Tính "Cách dùng" theo CẢ HAI chiều làm tròn trong một memo (build(true)/build(false)) thay vì
  // chỉ theo công tắc toàn cục: thẻ cần biết TRƯỚC lượng thực nhận nếu làm tròn LÊN có vọt quá
  // ROUND_WARN_RATIO không, để quyết định có tự áp liều làm tròn hay hiện liều tính được
  // (/impeccable critique 2026-08-31, P1 — "liều thực nhận không phải con số nổi bật" + mặc định
  // làm tròn theo thẻ).
  const autoUsagePair = useMemo(() => {
    const build = (roundUp: boolean) => {
    if (!mixCfg || !doseTargetMg) return null
    if (mixCfg.vialForm === "fixed") {
      if (mixCfg.vialVolumeMl == null) return null
      const toVialUnit = massFactor(doseTargetMg.unit, mixCfg.vialUnit)
      const toDoseUnit = massFactor(mixCfg.vialUnit, doseTargetMg.unit)
      if (toVialUnit == null || toDoseUnit == null) return null
      const loInVialUnit = doseTargetMg.low * toVialUnit
      const hiInVialUnit = (doseTargetMg.high ?? doseTargetMg.low) * toVialUnit
      // Liều cần có thể vượt MỘT chai — resolveFixedDraw tự gộp thêm chai khi cần (giữ nguyên thang
      // làm tròn mịn 5/1/0,5/0,1 mL cho trường hợp một chai thường gặp nhất, chỉ chuyển sang thang
      // trăm/năm mươi mL khi thật sự phải gộp — xem lib/mixing.ts). Không cho rút (allowWithdraw
      // false) thì drawMl null — dùng TRỌN thể tích đã gộp, không có "lấy X mg" riêng.
      const result = resolveFixedDraw(loInVialUnit, hiInVialUnit, mixCfg.vialAmount, mixCfg.vialVolumeMl, mixCfg.allowWithdraw, roundUp)
      if (result == null) return null
      const { bottleCount } = result
      const pooledVolume = bottleCount * mixCfg.vialVolumeMl
      const pickedMl = result.drawMl ?? pooledVolume
      const pickedDose = pickedMl * (mixCfg.vialAmount / mixCfg.vialVolumeMl) * toDoseUnit
      // Liều tính ra đúng bằng (các) chai gộp lại (vd Levofloxacin 750 mg = trọn chai 750 mg/150 mL)
      // → nói "N chai" đúng mẫu, không nói "lấy 750 mg" (đúng số nhưng sai câu chữ thực tế dùng).
      const isWholeVial = result.drawMl == null || pickedMl >= pooledVolume - 1e-6
      // Chỉ tính tốc độ khi công thức ĐÃ LƯU có khai thời gian truyền dự kiến — không có thì ẩn hẳn
      // phần này thay vì bịa một thời gian truyền không ai xác nhận. Bơm tiêm điện thì ra mL/giờ,
      // dây thường thì ra giọt/phút — không tính cả hai cùng lúc (xem mixCfg.deliveryDevice).
      const onPump = routeShort === "TTM" && mixCfg.deliveryDevice === "pump"
      const dropsPerMin =
        routeShort === "TTM" && !onPump && mixCfg.infuseMinutes != null ? dropsPerMinute(pickedMl, mixCfg.infuseMinutes, mixCfg.dropFactor ?? DEFAULT_DROP_FACTOR) : null
      const rateMlPerHourRaw = onPump && mixCfg.infuseMinutes != null ? pumpRateMlPerHour(pickedMl, mixCfg.infuseMinutes) : null
      const rateMlPerHour = rateMlPerHourRaw != null ? roundToStep(rateMlPerHourRaw, DEFAULT_PUMP_STEP) : null
      return {
        text: formatFixedUsage({
          name: drug.name,
          vialAmount: mixCfg.vialAmount,
          vialUnit: mixCfg.vialUnit,
          vialVolumeMl: mixCfg.vialVolumeMl,
          vialsUsed: bottleCount,
          doseAmount: isWholeVial ? undefined : pickedDose,
          doseUnit: doseTargetMg.unit,
          route: routeShort,
          dropsPerMin,
          rateMlPerHour,
        }),
        vialCount: bottleCount,
        vialForm: "fixed" as VialForm,
        // formatFixedUsage() luôn nói "chai" cho dạng đóng gói cố định hàm lượng — không tham số hoá
        // qua vialLabel như hai nhánh lọ/ống bên dưới, nên khớp cứng chuỗi tại đây cho nhất quán.
        vialLabel: "chai",
        // Số lần lượng thuốc thực nhận so với liều tính được — dùng để giải thích/cảnh báo phần dư
        // do làm tròn, xem roundingExcess và khối RoundingNote bên dưới.
        excess: roundingExcess(pickedDose, doseTargetMg.high ?? doseTargetMg.low),
        deliveredDose: pickedDose,
      }
    }
    const f = massFactor(doseTargetMg.unit, mixCfg.vialUnit)
    if (f == null) return null
    const neededHigh = (doseTargetMg.high ?? doseTargetMg.low) * f // đơn vị vialUnit
    const neededLow = doseTargetMg.low * f

    let vials: number
    let volumeMl: number
    if (mixCfg.vials != null && mixCfg.volumeMl != null) {
      // Có công thức đã lưu (ward) — dùng ĐÚNG số lọ/ống và thể tích đã pha thật, không tự đoán
      // lại. Liều cần vượt quá tổng lượng thuốc thật có trong bơm/chai đã pha thì dừng — không tự
      // ý cộng thêm lọ ngoài công thức người dùng đã xác nhận. Trước đây dừng bằng cách trả về
      // null: "Cách dùng" im lặng biến mất, không nói vì sao — trông y hệt một lỗi hiển thị (đã
      // lưu công thức xong mà "Cách dùng" không hiện/không cập nhật). Nói thẳng thiếu bao nhiêu
      // thay vì im lặng.
      vials = mixCfg.vials
      volumeMl = mixCfg.volumeMl
      if (neededHigh > vials * mixCfg.vialAmount + 1e-9) {
        const haveDoseUnit = (vials * mixCfg.vialAmount) / f
        const vialLabel = activeMix?.vialLabel ?? (mixCfg.vialForm === "solution" ? "ống" : "lọ")
        return {
          text: `Công thức đã lưu chỉ có ${formatDoseNumber(haveDoseUnit)} ${doseTargetMg.unit} (${vials} ${vialLabel}) — KHÔNG đủ cho liều cần ${formatDoseNumber(doseTargetMg.high ?? doseTargetMg.low)} ${doseTargetMg.unit}. Sửa số ${vialLabel} trong "Bảng pha thuốc" rồi lưu lại, hoặc chuyển về công thức hệ thống.`,
          vialCount: vials,
          vialForm: mixCfg.vialForm,
          vialLabel,
          insufficient: true as const,
        }
      }
    } else {
      // Không có công thức đã lưu — tự tính số lọ/ống cần dùng (làm tròn LÊN) thay vì giả định cứng
      // "đúng 1 lọ" như trước (khiến liều theo cân nặng vượt 1 lọ luôn bị bỏ qua), pha theo tỉ lệ
      // mặc định 100 mL cho mỗi lọ khi chưa biết quy cách pha thật của khoa.
      // Chiều làm tròn theo công tắc của người dùng (xem lib/roundingPref.ts): LÊN = đủ liều chắc
      // chắn nhưng có lúc dư nhiều; XUỐNG = số lọ lớn nhất không vượt cận trên, thiếu một chút.
      // Sàn 1 lọ ở cả hai chiều — "0 lọ" không phải một câu trả lời.
      vials = roundUp
        ? Math.max(1, Math.ceil(neededHigh / mixCfg.vialAmount - 1e-9))
        : Math.max(1, Math.floor(neededHigh / mixCfg.vialAmount + 1e-9))
      // mixCfg.defaultVolumeMl ?? 100 — KHÔNG hardcode 100: thuốc có tự khai thể tích pha mặc định
      // riêng (vd Amikacin 1 g/4 ml → 200 mL) thì phải dùng đúng số đó, giống hệt cách
      // applySolutionSuggestion() (bảng pha thủ công) đã làm — hai nơi tính "Cách dùng" cho cùng một
      // thuốc phải ra cùng một con số.
      volumeMl = vials * (mixCfg.defaultVolumeMl ?? 100)
    }
    const conc = (vials * mixCfg.vialAmount) / volumeMl
    if (!(conc > 0)) return null
    const loMl = neededLow / conc
    const hiMl = neededHigh / conc
    // Chốt chặn này chỉ có nghĩa ở chiều làm tròn LÊN: ở đó "rút nhiều hơn cả thể tích đã pha" là một
    // phép tính bất khả thi, phải dừng. Ở chiều XUỐNG thì thiếu so với cận trên chính là điều người
    // dùng vừa chủ động chọn — giữ nguyên chốt này sẽ khiến cả khối "Cách dùng" IM LẶNG BIẾN MẤT ngay
    // khi tắt công tắc (vd Amikacin 1050–1400 mg: 1 ống 1000 mg pha 100 mL, hiMl = 140 > 100).
    if (roundUp && hiMl > volumeMl + 1e-9) return null
    // Thể tích rút ra ở đây luôn nằm trong một mẻ pha ≥100 mL (100 mL/lọ trở lên) — thang mịn cỡ
    // 0,1 mL vô nghĩa ở quy mô đó (không ai đọc "217 mL" như một con số dễ lấy), nên dùng thang
    // trăm/năm mươi mL của pickEasiestBatchVolume() thay vì pickEasiestVolume() thang mịn. Chặn ngưỡng
    // ở `volumeMl` — làm tròn LÊN (thà dư còn hơn thiếu) không được phép "rút" nhiều hơn cả thể tích
    // thật đã pha, vượt ngưỡng thì coi như dùng trọn mẻ (isWholeBatch bên dưới tự xử lý đúng câu chữ).
    const pickedMlRaw = doseTargetMg.high != null ? pickEasiestBatchVolume(loMl, hiMl, roundUp) : pickEasiestBatchVolume(loMl, loMl, roundUp)
    const pickedMl = Math.min(pickedMlRaw, volumeMl)
    // Liều tính ra dùng ĐÚNG trọn lượng vừa pha (không cần rút riêng một phần) → câu gọn như mẫu
    // 3b, không lặp lại "đủ X ml lấy Y ml" một cách thừa thãi.
    const isWholeBatch = pickedMl >= volumeMl - 1e-6
    // Lượng thuốc bệnh nhân THỰC SỰ nhận sau khi làm tròn, quy về đúng đơn vị của liều tính được.
    const deliveredDose = (pickedMl * conc) / f
    // Chỉ tính tốc độ khi công thức ĐÃ LƯU có khai thời gian truyền dự kiến — không có thì ẩn hẳn
    // phần này thay vì bịa một thời gian truyền không ai xác nhận (xem mixCfg ở trên). Bơm tiêm điện
    // thì ra mL/giờ, dây thường thì ra giọt/phút.
    const onPump = routeShort === "TTM" && mixCfg.deliveryDevice === "pump"
    const dropsPerMin =
      routeShort === "TTM" && !onPump && mixCfg.infuseMinutes != null ? dropsPerMinute(pickedMl, mixCfg.infuseMinutes, mixCfg.dropFactor ?? DEFAULT_DROP_FACTOR) : null
    const rateMlPerHourRaw = onPump && mixCfg.infuseMinutes != null ? pumpRateMlPerHour(pickedMl, mixCfg.infuseMinutes) : null
    const rateMlPerHour = rateMlPerHourRaw != null ? roundToStep(rateMlPerHourRaw, DEFAULT_PUMP_STEP) : null
    const usageVialLabel = activeMix?.vialLabel ?? (mixCfg.vialForm === "solution" ? "ống" : "lọ")
    return {
      text: formatVialUsage({
        name: drug.name,
        vialAmount: mixCfg.vialAmount,
        vialUnit: mixCfg.vialUnit,
        vialsUsed: vials,
        vialLabel: usageVialLabel,
        // Chỉ ống dung dịch mới có thể tích riêng đáng nói kiểu "1 g/4 ml" (mẫu 4b) — lọ bột chưa có
        // thể tích tới khi hoàn nguyên, thể tích đó đã nằm trong "đủ X ml" bên dưới rồi.
        vialVolumeMl: mixCfg.vialForm === "solution" ? mixCfg.vialVolumeMl ?? undefined : undefined,
        diluentName: mixCfg.diluent,
        route: routeShort,
        // Thể tích pha loãng LUÔN nói ra — kể cả khi truyền trọn mẻ (xem drawPart trong usageText.ts).
        // Chỉ phần "lấy Y ml" mới bỏ đi khi không phải rút riêng, để câu không thừa "đủ 100 ml lấy 100 ml".
        finalVolumeMl: volumeMl,
        drawMl: isWholeBatch ? undefined : pickedMl,
        dropsPerMin,
        rateMlPerHour,
      }),
      vialCount: vials,
      vialForm: mixCfg.vialForm,
      vialLabel: usageVialLabel,
      excess: roundingExcess(deliveredDose, doseTargetMg.high ?? doseTargetMg.low),
      deliveredDose,
    }
    }
    return { up: build(true), down: build(false) }
  }, [mixCfg, doseTargetMg, drug.name, activeMix?.vialLabel, routeShort])

  const usageUp = autoUsagePair?.up ?? null
  const usageDown = autoUsagePair?.down ?? null
  // Làm tròn LÊN cho đúng thuốc/bậc này có làm lượng thực nhận vượt 1,3× liều tính được không?
  const roundUpWouldOvershoot = usageUp != null && !("insufficient" in usageUp) && usageUp.excess > ROUND_WARN_RATIO
  // Opt-in THEO THẺ khi làm tròn lên vọt >1,3×: không tự áp, hiện liều tính được (thấp hơn, trong
  // khoảng khuyến cáo); người dùng bật riêng cho thuốc này bằng một chạm. Reset khi đổi thuốc/bậc/
  // quy cách đóng gói — quyết định "chấp nhận dư nhiều lần này" không được mang sang thuốc kế tiếp.
  const [useHeavyRoundUp, setUseHeavyRoundUp] = useState(false)
  useEffect(() => {
    setUseHeavyRoundUp(false)
  }, [drug.id, tier.dose, mixIndex])
  const autoUsage = !roundUp ? usageDown : roundUpWouldOvershoot && !useHeavyRoundUp ? usageDown : usageUp
  const vialGuard = useVialCountGuard(autoUsage?.vialCount ?? null, autoUsage?.vialForm ?? "powder")
  const highWarnings = (drug.warnings ?? []).filter((w) => w.severity === "cao")
  const otherWarnings = (drug.warnings ?? []).filter((w) => w.severity !== "cao")
  const rrtDoseText =
    patient.rrt !== "none" && drug.rrt ? (drug.rrt as Record<string, string | undefined>)[patient.rrt] : undefined
  const weightLabelVi: Record<"ABW" | "IBW" | "AdjBW", string> = {
    ABW: "cân nặng thực tế (ABW)",
    IBW: "cân nặng lý tưởng (IBW)",
    AdjBW: "cân nặng hiệu chỉnh (AdjBW)",
  }
  return (
    <div className="p-4 rounded-[20px] border" style={{ borderColor: C.line, background: C.surface }}>
      <div className="flex items-center justify-between mb-0.5 gap-2">
        {/* line-clamp-2, không truncate — cùng lý do với InfusionDrugCard: đây là thẻ chi tiết đang
            mở, chỗ duy nhất người dùng cần đọc trọn tên kháng sinh tự đặt dài (critique /impeccable
            2026-08-18, P2). items-start chỉ trên HÀNG TRONG (tên + badge) để hai dòng tên căn theo
            đỉnh; hàng NGOÀI giữ items-center để cụm nút/nhãn bên phải vẫn thẳng hàng với trường hợp
            phổ biến hơn — tên một dòng. */}
        <div className="flex items-start gap-1.5 min-w-0">
          <p className="font-bold text-slate-900 text-[13px] line-clamp-2">{drug.name}</p>
          {drug.isCustom && (
            <span
              className="text-[12px] font-bold px-1.5 py-0.5 rounded-full flex-none"
              style={isOverride ? { background: C.primarySoft, color: "var(--c-primary-deep)" } : { background: "var(--c-green-soft)", color: "var(--c-green)" }}
            >
              {isOverride ? "Đã chỉnh sửa" : "Tự nhập"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          {/* Nhãn bậc liều hiện cả khi CHƯA có CrCl (màu vàng = đang giả định), thay vì biến mất —
              biến mất khiến bậc "thận bình thường" trông giống liều duy nhất của thuốc. */}
          {tiers.length > 1 && (
            <span
              className={`${T.meta} font-semibold px-2 py-0.5 ${R.pill}`}
              style={
                effectiveCrcl != null
                  ? { background: C.primarySoft, color: "var(--c-primary-deep)" }
                  : { background: C.warnSoft, color: C.warn }
              }
            >
              {effectiveCrcl != null ? tier.label : `${tier.label} (giả định)`}
            </span>
          )}
          {onEdit && (
            <button onClick={() => onEdit(drug)} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.primarySoft, color: "var(--c-primary-deep)" }} aria-label="Sửa">
              {icons.edit()}
            </button>
          )}
          {drug.isCustom && onDelete && (isOverride ? (
            <button
              onClick={() => onDelete(drug.id)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: C.lineSoft, color: C.textSoft }}
              aria-label="Khôi phục mặc định"
            >
              {icons.undo()}
            </button>
          ) : (
            <ConfirmIconButton
              onConfirm={() => onDelete(drug.id)}
              ariaLabel="Xoá"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: C.dangerSoft, color: C.dangerIcon }}
            />
          ))}
        </div>
      </div>
      {/* drug.route và chip "Chỉ định" là CHÚ THÍCH TĨNH, không bấm được — trước đây tô cùng màu
          primary với nút hành động/chip đang chọn khiến người dùng học nhầm "màu này = bấm được"
          rồi gặp ngay một chỗ cùng màu nhưng không phản hồi gì khi chạm. Đổi sang --c-text-soft
          (chữ) / nền trung tính (chip), giữ primary cho đúng vai trò hành động + trạng thái chọn. */}
      <p className={`${T.meta} font-semibold mb-1.5`} style={{ color: C.textSoft }}>{drug.route}</p>
      {/* Chọn TTM/TMC/IM/SC ngay tại "Đường dùng" — TRƯỚC ĐÂY nằm sâu trong bảng pha thuốc (sau cả
          mục Dung môi), khiến bảng pha "lấn át" luôn cả việc chọn đường dùng. CHỈ hiện chip khi thật
          sự có nhiều hơn một đường hợp lệ (route ghi chung chung "(IV)") — route đã ghi rõ đúng MỘT
          đường (vd Vancomycin "Truyền tĩnh mạch (TTM)") thì KHOÁ CỨNG, không hiện chip để đổi, tránh
          đổi nhầm sang đường tiêm không phù hợp với thuốc đó (xem mixableRoutes ở trên). */}
      {mixableRoutes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-1.5">
          {mixableRoutes.map((r) => (
            <button key={r} type="button" onClick={() => setRouteShort(r)} className={CHIP} style={pill(routeShort === r)}>
              {adminRouteLabel(r)}
            </button>
          ))}
        </div>
      )}
      {disease && (
        <p className={`${T.meta} font-semibold mb-1.5 px-2 py-0.5 rounded-full inline-block`} style={{ background: C.lineSoft, color: C.textSoft }}>
          Chỉ định: {disease.name}
        </p>
      )}
      {/* Dòng tiêu đề nhóm — chỉ hiện khi ≥2 trong 3 khối cảnh báo độc lập bên dưới (cơ sở cân nặng,
          RRT/AKI, CrCl) cùng bật, để phân biệt "N lời nhắc ĐỘC LẬP" khỏi một khối văn bản liên tục
          (/impeccable critique 2026-08-21 lượt 2, P2). Không gộp/gấp các khối lại: RRT có nút/link
          thao tác riêng bên trong, gộp chung dễ làm mất focus/thao tác của nó.
          LƯU Ý: trên thực tế N không bao giờ vượt quá 2 — crclWarnActive và rrtWarnActive loại trừ
          lẫn nhau về mặt logic (crclReliability() trả "rrt"/"aki" bất cứ khi nào patient.rrt !== "none"
          hoặc akiUnstable, khiến crclApplies luôn sai khi RRT/AKI đang bật, xem lib/patient.ts:189-193
          + crclApplies dòng ~7748). Không phải bug — chỉ ghi lại để người đọc sau không tưởng nhầm ca
          "cả 3 khối cùng bật" là khả thi (/impeccable critique 2026-08-21 lượt 3, P3). */}
      {/* aria-live bọc CẢ khối cảnh báo trước-liều bên dưới (cơ sở cân nặng/RRT-AKI/CrCl): các khối
          này bật/tắt độc lập theo trạng thái bệnh nhân (đổi RRT, sửa tuổi, nhập chiều cao...) — không
          có aria-live thì người dùng trình đọc màn hình đổi RRT/tuổi xong không được báo có cảnh báo
          mới xuất hiện hoặc vừa biến mất, phải tự dò lại cả thẻ (/impeccable critique 2026-08-21 lượt
          3, P2, cờ đỏ Sam). polite (không assertive): đây là lời nhắc kèm bối cảnh, không phải kết quả
          liều bị chặn — mức "assertive" đã dành riêng cho khối kiểm tra liều cực đoan ở InfusionCalculator. */}
      <div aria-live="polite">
      {preDoseWarningCount >= 2 && (
        <p className={`${T.meta} font-bold mb-1`} style={{ color: C.textSoft }}>
          {preDoseWarningCount} điều cần biết trước khi dùng liều này — đọc hết trước khi ghim:
        </p>
      )}
      {/* Chỉ khối GIẢI THÍCH (đã có cân nặng, đang nói ABW/IBW/AdjBW dùng để nhân) mới gấp lại —
          con số cân nặng dùng để tính vẫn hiện ngay trong khối liều mg/kg bên dưới, nên gấp phần
          này không giấu số liệu, chỉ giấu phần diễn giải thêm. Nhánh CHƯA CÓ cân nặng vẫn phải hiện
          thẳng (không gấp): đó là lời nhắc hành động, cùng loại với "Chưa có CrCl" ở dưới — gấp một
          lời nhắc "còn thiếu dữ liệu" đi thì người dùng không biết vì sao liều mg/kg không ra số. */}
      {drug.doseWeightBasis && drug.doseWeightBasis !== "actual" && dosingWeight.used == null && (
        <div className="mb-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p className={`text-[12px] font-bold ${PROSE}`} style={{ color: C.warn }}>
            Thuốc này cần cân nặng lý tưởng/hiệu chỉnh — nhập cân nặng và chiều cao ở trên để tính chính xác.
          </p>
        </div>
      )}
      {/* Đã có cân nặng nhưng THIẾU chiều cao: dosingWeight đã âm thầm dùng cân nặng thực (ABW) thay
          cho cân nặng lý tưởng/hiệu chỉnh mà thuốc này yêu cầu — khác ca thiếu cân nặng ở trên (block
          đó chặn hẳn), ca này vẫn ra một con số trông chắc chắn nên càng cần nói rõ nó dựa trên cơ sở
          nào (/impeccable critique 2026-08-21, P0). */}
      {drug.doseWeightBasis && drug.doseWeightBasis !== "actual" && dosingWeight.used != null && dosingWeight.heightMissingForBasis && (
        <div className="mb-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p className={`text-[12px] font-bold ${PROSE}`} style={{ color: C.warn }}>
            Thiếu chiều cao — đang tạm dùng cân nặng thực ({dosingWeight.used.toFixed(1).replace(".", ",")} kg) để tính liều này, chưa phải cân nặng lý tưởng/hiệu chỉnh thuốc yêu cầu.
          </p>
        </div>
      )}
      {/* Lọc máu / CRRT: đây chính là nhóm bệnh nhân cần app nhất, và cũng là nhóm app dễ im lặng
          nhất. Bậc liều theo CrCl bị vô hiệu hoá, và nếu app không có dữ liệu thì phải nói thẳng. */}
      {patient.rrt !== "none" && (
        <div className="mb-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-line)" }}>
          <p className={`text-[12px] font-bold leading-[1.45] ${PROSE}`} style={{ color: "var(--c-danger-deep)" }}>
            {RRT_LABELS[patient.rrt]} — bậc liều theo CrCl KHÔNG áp dụng.
          </p>
          {rrtDoseText ? (
            <>
              <p className={`text-[13px] font-bold leading-[1.45] mt-1 ${PROSE}`} style={{ color: "var(--c-danger-deep)" }}>{rrtDoseText}</p>
              {/* Liều CRRT là con số CÓ ĐIỀU KIỆN — thiếu Qeff thì chưa đọc được nó thuộc cột nào */}
              {needsCrrtFlow(patient.rrt) && !((parseStrictNumber(patient.crrtFlowLPerH) ?? 0) > 0) && (
                <button onClick={openPatientPanel} className={`text-[12px] font-bold underline text-left leading-[1.45] mt-1 ${PROSE}`} style={{ color: C.danger }}>
                  Chưa nhập tốc độ dịch thải (Qeff) — nhập ở khung "Bệnh nhân hiện tại" để biết khuyến cáo trên ứng với mức lọc nào.
                </button>
              )}
            </>
          ) : (
            <p className={`text-[12px] leading-[1.45] mt-0.5 ${PROSE}`} style={{ color: "var(--c-danger-deep)" }}>
              App CHƯA có dữ liệu liều cho phương thức lọc này với {drug.name}. Tra phác đồ lọc máu của cơ sở hoặc hỏi dược lâm sàng — liều và thời điểm dùng phụ thuộc phương thức lọc, liều lọc và lịch buổi lọc. Nhập được vào app qua nút Sửa để lần sau khỏi tra lại.
            </p>
          )}
          {drug.rrt?.note && <p className={`text-[12px] leading-[1.45] mt-1 ${PROSE}`} style={{ color: "var(--c-danger-deep)" }}>{drug.rrt.note}</p>}
          {(drug.rrt?.source || drug.rrt?.reviewedOn) && (
            <p className={`text-[12px] leading-[1.45] mt-1 ${PROSE}`} style={{ color: C.danger }}>
              {drug.rrt.source && <>Nguồn liều lọc máu: {drug.rrt.source}</>}
              {drug.rrt.source && drug.rrt.reviewedOn && " · "}
              {drug.rrt.reviewedOn && <>Rà soát: {formatReviewedOn(drug.rrt.reviewedOn)}</>}
            </p>
          )}
        </div>
      )}
      {patient.rrt === "none" && patient.akiUnstable && (
        <div className="mb-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p className={`text-[12px] font-bold leading-[1.45] ${PROSE}`} style={{ color: C.warn }}>
            Tổn thương thận cấp (creatinin chưa ổn định) — Cockcroft-Gault không dùng được, app đang hiển thị liều bậc thận bình thường. Chỉnh liều theo lâm sàng, nồng độ thuốc đo được và ý kiến dược lâm sàng.
          </p>
        </div>
      )}

      {/* Chưa có CrCl: nói thẳng con số bên dưới đang giả định điều gì, và mở sẵn đường đi nhập */}
      {missingCrcl && (
        <button
          onClick={openPatientPanel}
          className={`w-full text-left mb-1.5 px-2.5 py-2 ${R.box} flex items-start gap-2`}
          style={{ background: C.warnSoft, border: `1px solid ${C.warnLine}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: C.warnIcon }}>{icons.alert()}</span>
          <span>
            <span className={`${T.meta} font-bold block ${PROSE}`} style={{ color: C.warn }}>
              Chưa có CrCl — đang hiện liều bậc THẬN BÌNH THƯỜNG
            </span>
            <span className={`${T.meta} block mt-0.5 ${PROSE}`} style={{ color: C.warnIcon }}>
              Thuốc này có {tiers.length} bậc liều theo Độ thanh thải thận. Nhập tuổi, cân nặng và creatinin ở khung "Bệnh nhân hiện tại" để app chọn đúng bậc.
            </span>
          </span>
        </button>
      )}

      {/* Khác missingCrcl (chưa nhập gì): ĐÃ nhập đủ, nhưng số liệu bất thường tới mức estimateCrCl
          từ chối thẳng (vd tuổi 200 → tử số Cockcroft-Gault ≤0), không ra được CrCl để hiện. Nói rõ
          ĐÃ nhập rồi và vì sao vẫn không ra số — không lặp lại lời mời "nhập tuổi, cân nặng..." mà
          bác sĩ vừa làm xong, dễ khiến họ gõ lại đúng số sai đó hoặc tưởng app lỗi hiển thị. */}
      {crclDataRejected && (
        <button
          onClick={openPatientPanel}
          className={`w-full text-left mb-1.5 px-2.5 py-2 ${R.box} flex items-start gap-2`}
          style={{ background: C.warnSoft, border: `1px solid ${C.warnLine}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: C.warnIcon }}>{icons.alert()}</span>
          <span>
            <span className={`${T.meta} font-bold block ${PROSE}`} style={{ color: C.warn }}>
              Không tính được CrCl — số liệu bất thường, đang hiện liều bậc THẬN BÌNH THƯỜNG
            </span>
            <span className={`${T.meta} block mt-0.5 ${PROSE}`} style={{ color: C.warnIcon }}>
              Kiểm tra lại tuổi, cân nặng, chiều cao hoặc creatinin ở khung "Bệnh nhân hiện tại" — số liệu hiện tại làm công thức Cockcroft-Gault không tính ra được.
            </span>
          </span>
        </button>
      )}

      {/* CrCl có số, số ĐÃ được dùng chọn bậc liều bên dưới, nhưng input nuôi nó bất thường — không
          ẩn bậc đã chọn (chủ dự án chọn hướng cảnh báo, không chặn), chỉ nói rõ nó cần kiểm tra lại
          trước khi tin. */}
      {crclInputImplausible && (
        <button
          onClick={openPatientPanel}
          className={`w-full text-left mb-1.5 px-2.5 py-2 ${R.box} flex items-start gap-2`}
          style={{ background: C.warnSoft, border: `1px solid ${C.warnLine}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: C.warnIcon }}>{icons.alert()}</span>
          <span>
            <span className={`${T.meta} font-bold block ${PROSE}`} style={{ color: C.warn }}>
              Bậc liều dưới đây tính theo CrCl {crcl} — dựa trên số liệu bất thường
            </span>
            <span className={`${T.meta} block mt-0.5 ${PROSE}`} style={{ color: C.warnIcon }}>
              Kiểm tra lại tuổi, cân nặng, chiều cao hoặc creatinin ở khung "Bệnh nhân hiện tại" trước khi dùng bậc liều này.
            </span>
          </span>
        </button>
      )}
      </div>

      <p className={T.body} style={{ color: "var(--c-text-2)" }} dangerouslySetInnerHTML={{ __html: highlightDoseNumbers(tier.dose) }} />

      {/* Nhân sẵn mg/kg × cân nặng — DÒNG SUY DIỄN, không phải câu trả lời: nền/chữ trung tính
          (--c-surface-alt / --c-text-2), không màu thương hiệu. Con số bệnh nhân THỰC NHẬN nằm ở
          khối "Cách dùng" bên dưới với cỡ lớn hơn (/impeccable critique 2026-08-31, P2:
          Decoration/Diagnosis Split — kết quả tính đọc bằng --c-text, không --c-primary). */}
      {perKgDoses.length > 0 && (
        <div
          className="mt-1.5 px-2.5 py-2 rounded-[14px]"
          style={
            weightImplausible
              ? { background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }
              : { background: C.surfaceAlt, border: "1px solid var(--c-line)" }
          }
        >
          {weightImplausible ? (
            <>
              {/* CHẶN hẳn con số nhân sẵn — cân nặng cỡ này gần như chắc chắn gõ nhầm, không được
                  in ra một liều gam trông chắc chắn rồi để bác sĩ tự tin dùng luôn lúc gấp. */}
              <p className="text-[12px] font-bold leading-[1.45]" style={{ color: "var(--c-danger-deep)" }}>
                Không tính liều mg/kg: {checkWeight(dosingWeight.used)?.message}
              </p>
              <button onClick={openPatientPanel} className="text-[12px] font-bold underline text-left leading-[1.45] mt-0.5" style={{ color: C.danger }}>
                Sửa lại cân nặng ở khung "Bệnh nhân hiện tại"
              </button>
            </>
          ) : dosingWeight.used != null ? (
            <>
              {perKgDoses.map((d, i) => (
                <p key={i} className={T.meta} style={{ color: "var(--c-text-2)" }}>
                  <b className={NUM_DOSE}>{d.raw}</b> × <b className={NUM_DOSE}>{dosingWeight.used?.toFixed(1).replace(".", ",")}</b> kg
                  {dosingWeight.usedLabel && dosingWeight.usedLabel !== "ABW" ? ` (${dosingWeight.usedLabel})` : ""} = <b className={NUM_DOSE}>{computePerKgText(d, dosingWeight.used)}</b> mỗi lần dùng
                </p>
              ))}
              {/* Ngưỡng liều một lần dùng đã cắt vào khoảng liều vừa nhân — phải nói ngay cạnh con số,
                  không để dưới đáy thẻ: chỗ người dùng đang nhìn là dòng mg/kg này. */}
              {doseCapText && (
                <p
                  className="text-[12px] font-bold leading-[1.45] mt-1 px-2 py-1.5 rounded-lg"
                  style={{ background: C.warnSoft, color: C.warn }}
                  dangerouslySetInnerHTML={{ __html: highlightDoseNumbers(doseCapText) }}
                />
              )}
              {/* notComputableDose: con số mg/kg vừa nhân ở trên là liều NẠP, còn liều DUY TRÌ (thứ
                  "Cách dùng"/gợi ý số lọ bên dưới cần) lại "theo nồng độ đo được" — không có con số
                  cố định để làm tròn. Nói rõ NGAY DƯỚI con số đó thay vì vẫn hứa "còn phải làm tròn"
                  rồi để "Cách dùng"/gợi ý số lọ lặng lẽ biến mất phía dưới không giải thích. */}
              <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: notComputableDose ? C.warn : C.textSoft }}>
                {notComputableDose
                  ? "Đây là liều NẠP — liều DUY TRÌ phải cá thể hoá theo nồng độ đo được, không có con số cố định để tự tính số lọ/ống hay \"Cách dùng\"."
                  : doseCapText
                    ? "Còn phải làm tròn theo hàm lượng lọ/ống thực tế."
                    : "Còn phải làm tròn theo hàm lượng lọ/ống thực tế và ngưỡng liều tối đa của thuốc."}
              </p>
            </>
          ) : (
            <button onClick={openPatientPanel} className="text-[12px] font-bold text-left leading-[1.45]" style={{ color: "var(--c-accent-deep)" }}>
              Nhập cân nặng ở khung "Bệnh nhân hiện tại" để app nhân sẵn liều mg/kg.
            </button>
          )}
        </div>
      )}

      {/* Cách dùng tự tính theo mức liều CrCl hiện tại — chỉ hiện khi đọc được cả con số liều lẫn
          công thức pha, xem autoUsage ở trên. Số lượng ống/lọ/chai vượt ngưỡng hợp lý (gradeVialCount)
          thì KHÔNG in số ra ngay — thường là dấu hiệu gõ nhầm hàm lượng — chờ xác nhận trước.
          Công thức đã lưu không đủ thuốc cho liều cần thì autoUsage.insufficient=true — hiện cảnh
          báo màu vàng nói RÕ vì sao thay vì im lặng biến mất (trông y hệt lỗi hiển thị). */}
      {autoUsage && autoUsage.insufficient ? (
        <div className="mt-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p
            className="text-[12px] font-bold leading-[1.45]"
            style={{ color: C.warnIcon }}
            dangerouslySetInnerHTML={{ __html: highlightDoseNumbers(autoUsage.text) }}
          />
        </div>
      ) : (
        autoUsage &&
        !vialGuard.blocked && (
          <div className="mt-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.primarySoft, border: "1px solid var(--c-primary-line)" }}>
            {/* Con số bệnh nhân THỰC NHẬN mở đầu khối, cỡ mono-dose 16px — figure to nhất trên thẻ
                (hộp suy diễn "7.5 × 70 = 525" phía trên đã hạ xuống --c-text-2 12px). LUÔN hiện khi
                đọc được liều (không chỉ khi có chênh lệch): người đọc vội cần đúng một con số để đưa
                cho điều dưỡng (/impeccable critique 2026-08-31, P2). Kèm "đích Y" khi lệch >0,5. */}
            {!autoUsage.insufficient && doseTargetMg && (
              <p className="text-[13px] font-bold leading-[1.4] mb-1.5" style={{ color: C.text }}>
                Cho{" "}
                <b className={NUM_DOSE} style={{ fontSize: "16px" }}>
                  {formatDoseNumber(autoUsage.deliveredDose)} {doseTargetMg.unit}
                </b>
                {Math.abs(autoUsage.deliveredDose - (doseTargetMg.high ?? doseTargetMg.low)) > 0.5 && (
                  <span className="font-normal text-[12px]" style={{ color: C.textSoft }}>
                    {" "}· đích <span className={NUM}>{formatDoseNumber(doseTargetMg.high ?? doseTargetMg.low)}</span> {doseTargetMg.unit}
                  </span>
                )}
              </p>
            )}
            {/* Đây là hướng dẫn rút thuốc thật — điểm kiểm tra cuối trước khi kim chạm vào lọ —
                nên đọc CHỮ bằng --c-text (như SEVERITY_STYLE.ok trong doseSafety.ts) chứ không phải
                --c-primary, và KHÔNG bounce (bỏ pop-value): con số đổi ở đây là do tính toán lại
                (đổi công tắc làm tròn, cân nặng...), không phải một hành động vừa "thành công" —
                màu/motion "xác nhận" đó dành cho chip/tab, không dành cho số liều (Decoration/
                Diagnosis Split Rule, DESIGN.md). `key={autoUsage.vialCount}` vẫn giữ để React dựng
                lại đúng dòng này chỉ khi SỐ LỌ thật sự đổi, không phải mỗi khi câu đổi vì số khác
                (nồng độ, thể tích). */}
            <p
              key={autoUsage.vialCount}
              className="text-[12px] font-bold leading-[1.45]"
              style={{ color: C.text }}
              dangerouslySetInnerHTML={{ __html: highlightDoseNumbers(autoUsage.text) }}
            />
            <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: C.textSoft }}>
              Tự tính theo {tier.label} {ward ? "và công thức pha của bạn" : "và công thức pha mặc định"} — kiểm tra lại trước khi dùng.
            </p>
          </div>
        )
      )}
      {autoUsage && !autoUsage.insufficient && (
        <VialCountWarning grade={vialGuard.grade} show={vialGuard.showWarning} onConfirm={vialGuard.confirm} />
      )}
      {/* Công tắc làm tròn + lời giải thích cho con số vừa in ra. Đặt NGAY DƯỚI khối "Cách dùng" chứ
          không nhét vào Cài đặt: con số gây thắc mắc nằm ở trên, chỗ trả lời phải ở ngay cạnh nó —
          và người dùng phải đổi được chiều làm tròn ngay tại đây, không phải đi tìm. */}
      {autoUsage && !autoUsage.insufficient && !vialGuard.blocked && (
        <RoundingControl
          globalOn={roundUp}
          setGlobalOn={setRoundUp}
          overshoot={roundUpWouldOvershoot}
          useHeavyRoundUp={useHeavyRoundUp}
          setUseHeavyRoundUp={setUseHeavyRoundUp}
          excess={autoUsage.excess}
          delivered={autoUsage.deliveredDose}
          calcTarget={doseTargetMg ? (doseTargetMg.high ?? doseTargetMg.low) : null}
          roundedUpDelivered={usageUp && !("insufficient" in usageUp) ? usageUp.deliveredDose : null}
          roundedUpExcess={usageUp && !("insufficient" in usageUp) ? usageUp.excess : null}
          unit={doseTargetMg?.unit ?? "mg"}
        />
      )}

      {/* Cảnh báo mức cao luôn hiện; phần còn lại gấp lại giống thẻ thuốc truyền */}
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

      <button
        onClick={() => {
          pinRunning({
            drugId: drug.id,
            name: drug.name,
            compatKey: drug.compatKey,
            line: 1,
            // Ghim con số mg CỤ THỂ (lượng thực nhận sau làm tròn) đứng trước quy tắc mg/kg — bảng
            // Đang truyền dùng để bàn giao ca, ở đó "15–20 mg/kg mỗi 8h" bắt người đọc tự nhân lại
            // (/impeccable critique 2026-08-31, P1). Không có con số cụ thể (thiếu cân nặng/công
            // thức) thì rơi về text bậc như trước.
            doseText:
              autoUsage && !autoUsage.insufficient && doseTargetMg
                ? `${formatDoseNumber(autoUsage.deliveredDose)} ${doseTargetMg.unit} · ${tier.dose}`
                : tier.dose,
            rateText: "",
            concText: drug.route,
            kind: "intermittent",
            weightKgAtPin: abwKg,
          })
          tickHaptic()
        }}
        className={`${BTN_BLOCK} mt-3`}
        style={{ borderColor: C.accentLine, background: C.accentSoft, color: "var(--c-primary-deep)" }}
      >
        {/* "Ghim liều này", không phải "Thêm vào danh sách đang dùng" (chữ dùng cho nút ghim TỐC ĐỘ
            TRUYỀN liên tục ở InfusionCalculator) — hai hành động khác bản chất (một liều ngắt quãng
            kế tiếp vs. một bơm đang chạy), RunningPanel đã tự phân biệt bằng nhãn "ngắt quãng" nên
            chữ nút nên phản ánh đúng khác biệt đó thay vì dùng chung một câu (/impeccable critique
            2026-08-19, P3). */}
        Ghim liều này
      </button>

      {/* Gộp phần diễn giải cân nặng dùng để tính (ABW/IBW/AdjBW) và câu nhắc lại liều chuẩn vào một
          Disclosure — cả hai đều là THÔNG TIN THAM KHẢO thêm cho con số đã hiện ở trên, không phải
          cảnh báo cần đọc ngay. Con số cân nặng THẬT SỰ dùng để nhân liều mg/kg vẫn hiện sẵn trong
          khối liều/kg phía trên; gấp mục này không giấu số nào, chỉ giấu phần diễn giải. */}
      {((drug.doseWeightBasis && drug.doseWeightBasis !== "actual" && dosingWeight.used != null) || showStandardDose) && (
        <Disclosure label="Điều kiện đặc biệt">
          {drug.doseWeightBasis && drug.doseWeightBasis !== "actual" && dosingWeight.used != null && dosingWeight.usedLabel && (
            <div className={showStandardDose ? "mb-2" : undefined}>
              <p className="text-[12px] font-bold" style={{ color: C.warn }}>
                Liều mg/kg dùng {weightLabelVi[dosingWeight.usedLabel]}: {dosingWeight.used.toFixed(1).replace(".", ",")} kg
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: C.warnIcon }}>
                ABW {dosingWeight.abw?.toFixed(1)?.replace(".", ",")} kg
                {dosingWeight.ibw != null && ` · IBW ${dosingWeight.ibw.toFixed(1).replace(".", ",")} kg`}
                {dosingWeight.adjBw != null && ` · AdjBW ${dosingWeight.adjBw.toFixed(1).replace(".", ",")} kg`}
              </p>
            </div>
          )}
          {showStandardDose && <p className={T.meta} style={{ color: C.textSoft }}>Liều chuẩn: {standardDose}</p>}
        </Disclosure>
      )}

      {(drug.boluses?.length ?? 0) > 0 && (
        <Disclosure label="Liều nạp / bolus" count={drug.boluses?.length}>
          <BolusList boluses={drug.boluses} drugName={drug.name} doseWeightBasis={drug.doseWeightBasis} />
        </Disclosure>
      )}

      {/* Cách dùng gộp chung với bảng pha, và nội dung ĐỘNG theo công thức đã lưu — giống bên thuốc
          truyền: trước đây "Cách dùng · Ghi chú" chỉ đọc câu chữ dựng sẵn, còn "Bảng pha thuốc" là
          nút riêng — cùng nói về một việc nhưng tách hai chỗ. */}
      {(injectable || drug.preparation || indication?.note || drug.note) && (
        <Disclosure label="Cách dùng · Ghi chú">
          {/* Chuyển đổi qua lại giữa các công thức đã lưu VÀ công thức hệ thống ngay ở đây — không
              còn phải mở hẳn "Bảng pha thuốc" bên dưới mới đổi được, và không cần XOÁ một công thức
              đã lưu chỉ để tạm xem lại công thức hệ thống (xem useActiveWardRecipe). */}
          {wardList.length > 0 && (
            <WardRecipeChips
              wardList={wardList}
              activeId={activeRecipeId}
              onSelectSystem={() => setActiveRecipeId("system")}
              onSelectWard={(w) => setActiveRecipeId(w.id)}
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
                  {ward.vials} {ward.vialForm === "powder" ? "lọ" : "ống"} × {formatMass(ward.vialAmount, ward.vialUnit)} vừa đủ {trim(ward.volumeMl)} mL
                  {ward.diluent ? `, dung môi ${ward.diluent}` : ""}.
                </p>
                {/* Đây là XOÁ THẬT (mất hẳn công thức đã lưu) — chuyển VỀ công thức hệ thống mà
                    không mất dữ liệu thì dùng chip "Công thức hệ thống" ở trên. Nên cần xác nhận hai
                    chạm giống mọi chỗ xoá dữ liệu đã lưu khác trong app, không phải một chạm "hoàn
                    tác" như trước (dễ bấm nhầm mất công thức chỉ để xem lại công thức hệ thống). */}
                <button
                  onClick={() => {
                    if (!confirmClearWard) {
                      setConfirmClearWard(true)
                      tickHaptic()
                      return
                    }
                    clearWard(drug.id, ward.id)
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
            drug.preparation && <p className={`${T.body} ${PROSE}`} style={{ color: C.textSoft }}>{drug.preparation}</p>
          )}
          {indication?.note && <p className={`${T.meta} ${PROSE} mt-2`} style={{ color: C.textSoft }}>{indication.note}</p>}
          {drug.note && <p className={`${T.meta} ${PROSE} mt-2`} style={{ color: C.textSoft }}>{drug.note}</p>}

          {/* Hiện bảng pha cho CẢ BỐN đường tiêm/truyền (TTM/TMC/IM/SC, xem mixableRoutes) — trước đây
              chỉ hiện cho TTM/TMC, khiến tiêm bắp/tiêm dưới da không có gì để pha dù cũng cần hoàn
              nguyên/pha loãng như hai đường kia (chỉ khác là không có tốc độ truyền). Đường uống thì
              mixableRoutes rỗng nên vẫn không hiện. */}
          {hasMixPanel && (
            <>
              <button
                onClick={() => setShowMix((v) => !v)}
                className={`${BTN_BLOCK} mt-3`}
                style={{ borderColor: C.accentLine, background: C.accentSoft, color: "var(--c-primary-deep)" }}
              >
                {showMix ? "Đóng bảng pha thuốc" : "Bảng pha thuốc"}
              </button>
              {/* LUÔN mount AntibioticMixPanel (chỉ ẩn bằng CSS) — giống mọi Disclosure khác trong thẻ
                  này (xem comment ở Disclosure). Trước đây `{showMix && <AntibioticMixPanel/>}` unmount
                  hẳn component mỗi lần đóng, xoá sạch state cục bộ (số lọ, thể tích pha loãng, dung
                  môi...) — mở lại bảng pha là mất hết số vừa gõ tay, quay về mặc định từ đầu. */}
              <div className={showMix ? undefined : "hidden"}>
                <AntibioticMixPanel drug={drug} mixList={mixList} mixIndex={mixIndex} setMixIndex={setMixIndex} doseTargetMg={doseTargetMg} doseNotComputable={notComputableDose} routeShort={routeShort} setRouteShort={setRouteShort} />
              </div>
            </>
          )}
        </Disclosure>
      )}

      {otherWarnings.length > 0 && (
        <Disclosure label="Lưu ý khác" count={otherWarnings.length} alert>
          <DrugWarnings warnings={otherWarnings} bare />
        </Disclosure>
      )}

      {/* Nguồn dữ liệu: ưu tiên nguồn RIÊNG của bệnh lý đang chọn (indication.source/reviewedOn) —
          liều theo bệnh lý cụ thể (vd viêm màng não) thường lấy từ một khuyến cáo khác hẳn nguồn
          chung của thuốc, nên không thể gộp chung một nguồn cho mọi bệnh lý như trước. Bệnh lý nào
          CHƯA tự khai nguồn riêng thì rơi về nguồn của thuốc, không bắt buộc điền lại toàn bộ dữ
          liệu cũ. `alert` khi mục đang hiện chưa ghi nguồn: trước đây phải MỞ khối này ra mới biết,
          nên trên thực tế không ai biết. Nay tình trạng nằm ngay trên tiêu đề. */}
      <Disclosure label={sourceItem.source || sourceItem.reviewedOn ? "Nguồn dữ liệu" : "Nguồn dữ liệu — kinh nghiệm lâm sàng tự biên soạn"} alert={!sourceItem.source && !sourceItem.reviewedOn}>
        {indication && (indication.source || indication.reviewedOn) && (
          <p className={`${T.meta} mb-1.5`} style={{ color: C.textSoft }}>Nguồn riêng cho chỉ định {disease?.name}:</p>
        )}
        <SourceLine item={sourceItem} bare />
        {indication && !(indication.source || indication.reviewedOn) && (drug.source || drug.reviewedOn) && (
          <p className={`${T.meta} mt-1.5`} style={{ color: C.textSoft }}>Bệnh lý này chưa tự khai nguồn riêng — đang hiện nguồn chung của thuốc.</p>
        )}
      </Disclosure>
    </div>
  )
}
