import { useState, useEffect, useMemo } from "react"
import type { BolusDose, InfusionCalcConfig, InfusionDrug } from "../../data/types"
import { resolveDosingWeight, type WeightBasis } from "../../lib/bodyWeight"
import { checkWeight } from "../../lib/doseSafety"
import { diluentVolume, formatDuration, gradeConcentration, infusionDurationHours, vialsTotalVolume, volumePerVial, type VialSpec } from "../../lib/mixing"
import { formatMass } from "../../lib/perKgDose"
import { tickHaptic } from "../../lib/haptics"
import { doseToRate, formatDoseNumber, parseDoseUnit } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { BTN_TALL, C, NUM, PROSE, T, trim } from "../../lib/ui"
import { useDosing } from "./context"

export function BolusList({
  boluses,
  drugName,
  doseWeightBasis,
}: {
  boluses: BolusDose[] | undefined
  drugName: string
  doseWeightBasis?: WeightBasis
}) {
  const { abwKg, heightCm, patient, openPatientPanel, logCalc } = useDosing()
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, doseWeightBasis],
  )
  const weightKg = dosingWeight.used
  // Liều nạp/bolus nhân trực tiếp mg/kg × cân nặng, giống hệt bảng liều mg/kg — cân nặng gõ nhầm
  // (vd 5000 kg) phải chặn ở đây luôn, không chỉ ở khung "Bệnh nhân hiện tại".
  const weightWarn = checkWeight(weightKg)
  const weightImplausible = weightWarn?.severity === "implausible"
  const list = boluses ?? []
  if (list.length === 0) return null
  // Chỉ liều tính theo mg/kg mới phụ thuộc cơ sở cân nặng — liều nạp cố định (fixedLow) không cần
  // cảnh báo này dù thuốc có gắn doseWeightBasis khác "actual" cho các liều perKg khác của nó.
  const hasPerKgBolus = list.some((b) => b.perKgLow != null)

  function describe(b: BolusDose): { text: string; needWeight: boolean; blocked: boolean; perKgText: string | null } {
    if (b.perKgLow != null) {
      const perKgText = b.perKgHigh != null ? `${b.perKgLow}–${b.perKgHigh} ${b.unit}/kg` : `${b.perKgLow} ${b.unit}/kg`
      if (weightKg == null) return { text: "—", needWeight: true, blocked: false, perKgText }
      if (weightImplausible) return { text: "—", needWeight: false, blocked: true, perKgText }
      const lo = b.perKgLow * weightKg
      const hi = b.perKgHigh != null ? b.perKgHigh * weightKg : null
      const base = hi != null ? `${formatMass(lo, b.unit)} – ${formatMass(hi, b.unit)}` : formatMass(lo, b.unit)
      const withCap = b.maxSingle != null && (hi ?? lo) > b.maxSingle ? `${base} — nhưng không vượt quá ${formatMass(b.maxSingle, b.unit)}` : base
      return { text: withCap, needWeight: false, blocked: false, perKgText }
    }
    if (b.fixedLow != null) {
      const base = b.fixedHigh != null ? `${formatMass(b.fixedLow, b.unit)} – ${formatMass(b.fixedHigh, b.unit)}` : formatMass(b.fixedLow, b.unit)
      return { text: base, needWeight: false, blocked: false, perKgText: null }
    }
    return { text: "—", needWeight: false, blocked: false, perKgText: null }
  }

  // Tiêu đề mục do khối gấp/mở ở ngoài lo, ở đây chỉ vẽ danh sách.
  return (
    <div>
      {/* Đã có cân nặng nhưng THIẾU chiều cao cho thuốc cần cân nặng lý tưởng/hiệu chỉnh (vd nhũ
          dịch lipid LAST): weightKg vẫn ra số (âm thầm là ABW) nên liều nạp bên dưới vẫn hiện bình
          thường — phải nói rõ cơ sở đang dùng không phải cái thuốc yêu cầu (/impeccable critique
          2026-08-21, P0). aria-live: khối này bật/tắt theo chiều cao vừa nhập, đọc trợ năng phải biết
          (/impeccable critique 2026-08-21 lượt 3, P2). */}
      <div aria-live="polite">
      {doseWeightBasis && doseWeightBasis !== "actual" && weightKg != null && dosingWeight.heightMissingForBasis && hasPerKgBolus && (
        <div className="mb-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p className={`text-[12px] font-bold ${PROSE}`} style={{ color: C.warn }}>
            Thiếu chiều cao — đang tạm dùng cân nặng thực ({weightKg.toFixed(1).replace(".", ",")} kg) để tính liều nạp này, chưa phải cân nặng lý tưởng/hiệu chỉnh thuốc yêu cầu.
          </p>
        </div>
      )}
      </div>
      {list.map((b, i) => {
        const info = describe(b)
        return (
          <div
            key={i}
            className="px-3 py-2.5 rounded-[14px] mb-1.5"
            style={
              info.blocked
                ? { background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }
                : { background: C.warnSoft, border: "1px solid var(--c-warn-line)" }
            }
          >
            <p className="text-[12px] font-bold leading-[1.45]" style={{ color: info.blocked ? "var(--c-danger-deep)" : C.warn }}>{b.label}</p>
            {info.perKgText && <p className="text-[12px]" style={{ color: info.blocked ? "var(--c-danger-deep)" : C.warnIcon }}>Theo cân nặng: {info.perKgText}</p>}
            {info.needWeight ? (
              <button onClick={openPatientPanel} className="text-[12px] font-bold underline mt-0.5" style={{ color: C.warnIcon }}>
                Nhập cân nặng ở khung "Bệnh nhân hiện tại" để tính ra số mg
              </button>
            ) : info.blocked ? (
              <>
                <p className="text-[12px] font-bold leading-[1.45] mt-0.5" style={{ color: "var(--c-danger-deep)" }}>
                  Không tính liều nạp: {weightWarn?.message}
                </p>
                <button onClick={openPatientPanel} className="text-[12px] font-bold underline mt-0.5" style={{ color: C.danger }}>
                  Sửa lại cân nặng ở khung "Bệnh nhân hiện tại"
                </button>
              </>
            ) : (
              <p className={`${T.title} ${NUM} mt-0.5`} style={{ color: C.warn }}>{info.text}</p>
            )}
            {b.over && <p className={T.meta} style={{ color: C.warnIcon }}>Cách dùng: {b.over}</p>}
            {b.note && <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: C.warnIcon }}>{b.note}</p>}
            {!info.needWeight && !info.blocked && (
              <button
                onClick={() => {
                  logCalc({
                    drug: drugName,
                    kind: "bolus",
                    inputs: [b.label, ...(info.perKgText ? [`Liều theo cân nặng: ${info.perKgText}`] : []), ...(b.over ? [`Cách dùng: ${b.over}`] : [])],
                    output: info.text,
                  })
                  tickHaptic()
                }}
                className="text-[12px] font-bold mt-1.5"
                style={{ color: C.warnIcon }}
              >
                Lưu vào nhật ký
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Bảng pha thuốc ───────────────────────────────────────────────────────────
// Chiều tính mà lúc đứng cạnh giường mới thực sự cần: "tôi có ống 250 mg, pha vừa đủ 50 mL" →
// nồng độ; và chiều ngược lại "tôi cần nồng độ này" → lấy mấy ống, rút bao nhiêu mL.
//
// Màn này dùng lúc gấp nên chỉ giữ những dòng dẫn thẳng tới một thao tác. Phần tra cứu (bảo quản
// sau pha, ngưỡng nồng độ cho đường ngoại biên) đã bỏ khỏi đây: mười dòng chữ quanh một con số thì
// lúc cần nhanh không ai đọc, mà chúng còn làm loãng đúng cái cảnh báo phải đọc. Dữ liệu vẫn còn
// trong data/*.ts để tra khi cần.
export const MIX_UNIT_CHOICES = ["mcg", "mg", "g", "đơn vị", "mEq"]

// Một phương án pha đã tính xong — dùng chung cho cả hai chiều tính, để chiều nào cũng đi qua đúng
// một đường kiểm tra.
export interface MixOutcome {
  concValue: number
  volumeMl: number
  // Số ống/lọ dùng thật — có thể lẻ khi rút một phần ống.
  vials: number
  // Số ống/lọ phải bóc ra. Chỉ khác `vials` ở phương án rút lẻ (phần thừa bỏ đi).
  vialsOpened: number
  // Thể tích thuốc phải rút, khi phương án là rút lẻ ống. null = dùng trọn ống.
  drawMl: number | null
  vialAmount: number
  vialUnit: string
  spec: VialSpec
  diluent: string
}

// Thể tích thuốc chiếm chỗ trong bơm/chai cuối cùng.
function outcomeDrugVolume(o: MixOutcome): number | null {
  return o.drawMl ?? vialsTotalVolume(o.vials, o.spec)
}

// Câu duy nhất người đứng cạnh bàn pha thực sự thao tác. Ba dạng, vì ba thao tác khác hẳn nhau:
// rút trọn ống dung dịch, hoàn nguyên lọ bột, và rút lẻ một phần ống.
export function describeComposition(o: MixOutcome, vialLabel: string): string {
  const drugVolume = outcomeDrugVolume(o)
  const dil = diluentVolume(o.volumeMl, drugVolume)
  const mass = formatMass(o.vials * o.vialAmount, o.vialUnit)
  const finalText = `${trim(o.volumeMl)} mL`

  if (o.drawMl != null) {
    // Rút lẻ: con số phải nhớ là số mL rút ra, không phải số ống.
    const source =
      o.spec.form === "powder"
        ? `${o.vialsOpened} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)} đã pha ban đầu với ${trim(o.spec.reconstituteMl as number)} mL/${vialLabel}`
        : `${o.vialsOpened} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)}`
    const base = `Rút ${formatDoseNumber(o.drawMl)} mL (= ${mass}) từ ${source}`
    return dil != null ? `${base} + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}` : `${base}, pha vừa đủ ${finalText}`
  }

  const amount = `${trim(o.vials)} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)} = ${mass}`
  if (drugVolume == null || dil == null) return `${amount}, pha vừa đủ ${finalText}`

  if (o.spec.form === "powder") {
    const displaced = (o.spec.displacementMl ?? 0) > 0
    return `Pha ban đầu ${trim(o.vials)} ${vialLabel} với ${trim(o.spec.reconstituteMl as number)} mL → rút ${formatDoseNumber(drugVolume)} mL${displaced ? " (đã cộng thể tích bột tăng sau pha)" : ""} (${amount}) + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}`
  }
  return `Rút ${formatDoseNumber(drugVolume)} mL thuốc (${amount}) + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}`
}

// ─── Bơm này chạy được bao lâu ────────────────────────────────────────────────
// Câu quyết định "pha 50 hay 100 mL" — và trước đây phải đóng bảng pha, quay về máy tính liều mới
// trả lời được. Một dòng, ngay dưới công thức, ở đúng lúc đang chọn thể tích.
function MixRunTime({ drug, calc, concValue, volumeMl }: { drug: InfusionDrug; calc: InfusionCalcConfig; concValue: number; volumeMl: number }) {
  const { abwKg, heightCm, patient } = useDosing()
  const unit = useMemo(() => parseDoseUnit(calc.doseUnit), [calc.doseUnit])
  // Lấy cả object (không chỉ .used) để đọc được heightMissingForBasis bên dưới — trước đây hàm này
  // chỉ lấy .used nên bỏ sót đúng cờ mà AntibioticDoseCard/BolusList/InfusionCalculator đã dùng để
  // cảnh báo, khiến ước tính thời lượng bơm âm thầm dùng cân nặng thực (ABW) không nhãn cho thuốc
  // cần cân nặng lý tưởng/hiệu chỉnh khi thiếu chiều cao (/impeccable critique 2026-08-21, P0 tái
  // diễn ở đường gọi thứ tư này).
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  const weightKg = dosingWeight.used
  if (!unit || !(concValue > 0) || !(volumeMl > 0)) return null

  const lo = doseToRate(calc.doseMin, unit, weightKg, concValue, calc.concUnit)
  const hi = doseToRate(calc.doseMax, unit, weightKg, concValue, calc.concUnit)
  if (lo == null || hi == null) {
    if (unit.perWeight && weightKg == null) {
      return (
        <p className={`${T.meta} mt-1`} style={{ color: C.textSoft }}>
          Nhập cân nặng ở khung Bệnh nhân để biết bơm này chạy được bao lâu.
        </p>
      )
    }
    return null
  }

  const slowest = infusionDurationHours(volumeMl, lo)
  const fastest = infusionDurationHours(volumeMl, hi)
  const heightMissingWarn = unit.perWeight && dosingWeight.heightMissingForBasis
  return (
    <p className={`${T.meta} ${NUM} mt-1`} style={{ color: heightMissingWarn ? C.warn : C.textSoft }}>
      {heightMissingWarn && <b>Thiếu chiều cao, đang dùng cân nặng thực: </b>}
      Liều thường dùng {calc.doseMin}–{calc.doseMax} {calc.doseUnit} → <b>{formatDoseNumber(lo)}–{formatDoseNumber(hi)} mL/giờ</b>
      {slowest != null && fastest != null && <> · {trim(volumeMl)} mL chạy được {formatDuration(fastest)} – {formatDuration(slowest)}</>}
    </p>
  )
}

export function MixResultCard({
  drug,
  calc,
  outcome,
  vialLabel,
  refConc,
  refLabel,
  headline,
  subline,
  onUse,
  onSaveWard,
}: {
  drug: InfusionDrug
  calc: InfusionCalcConfig
  outcome: MixOutcome
  vialLabel: string
  refConc: number | undefined
  refLabel: string
  headline: string
  subline?: string
  onUse: () => void
  onSaveWard: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  const drugVolume = outcomeDrugVolume(outcome)
  const dil = diluentVolume(outcome.volumeMl, drugVolume)
  // Kiểm tra vật lý: riêng thể tích thuốc đã vượt thể tích cuối thì công thức không pha được.
  const impossible = dil != null && dil < -1e-9

  const grade = gradeConcentration(outcome.concValue, refConc, calc.mix?.maxConc, calc.concUnit, refLabel)
  useEffect(() => setConfirmed(false), [outcome.concValue, outcome.volumeMl, outcome.vials])
  const blocked = grade.requiresConfirm && !confirmed

  if (impossible) {
    const per = volumePerVial(outcome.spec)
    return (
      <div className="px-3 py-2.5 rounded-[14px] mb-1 flex items-start gap-2" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-icon)" }}>
        <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
        <div>
          <p className={T.critical} style={{ color: "var(--c-danger-deep)" }}>Không pha được</p>
          <p className={`${T.meta} mt-0.5`} style={{ color: "var(--c-danger-deep)" }}>
            {trim(outcome.vials)} {vialLabel} × {trim(per as number)} mL = {formatDoseNumber(drugVolume as number)} mL thuốc, đã nhiều hơn thể tích cuối {trim(outcome.volumeMl)} mL. Kiểm tra lại số {vialLabel}, thể tích 1 {vialLabel} hoặc thể tích cuối.
          </p>
        </div>
      </div>
    )
  }

  const gradeStyle =
    grade.severity === "danger"
      ? { bg: C.dangerSoft, border: C.dangerIcon, fg: "var(--c-danger-deep)" }
      : { bg: C.warnSoft, border: C.warnLine, fg: C.warn }

  return (
    <div className="px-3 py-2.5 rounded-[14px] mb-1" style={{ background: C.surface, border: "1px solid var(--c-line-strong)" }}>
      <p className="text-[13px] font-bold text-slate-800 leading-[1.45]">{headline}</p>
      {subline && <p className="text-[12px] text-slate-500 leading-[1.45] mt-0.5">{subline}</p>}
      {/* Câu duy nhất người đứng cạnh bàn pha thực sự thao tác */}
      <p className="text-[12px] font-semibold leading-[1.45] mt-1" style={{ color: "var(--c-accent-deep)" }}>
        {describeComposition(outcome, vialLabel)}
      </p>
      {drugVolume == null && (
        <p className="text-[12px] text-slate-500 leading-[1.45] mt-0.5">
          {outcome.spec.form === "powder"
            ? `Nhập thể tích pha ban đầu 1 ${vialLabel} ở trên để app tính ra số mL dung môi phải thêm.`
            : `Nhập thể tích 1 ${vialLabel} ở trên để app tính ra số mL dung môi phải thêm.`}
        </p>
      )}

      <MixRunTime drug={drug} calc={calc} concValue={outcome.concValue} volumeMl={outcome.volumeMl} />

      {grade.severity !== "ok" && (
        <div className="mt-2 px-2.5 py-2 rounded-[14px] flex items-start gap-2" style={{ background: gradeStyle.bg, border: `1px solid ${gradeStyle.border}` }}>
          <span className="mt-0.5 flex-none" style={{ color: gradeStyle.fg }}>{icons.alert()}</span>
          <div>
            {grade.headline && <p className="text-[12px] font-extrabold leading-[1.3]" style={{ color: gradeStyle.fg }}>{grade.headline}</p>}
            {grade.detail && <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: gradeStyle.fg }}>{grade.detail}</p>}
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
          style={{ background: gradeStyle.fg, color: "var(--c-on-bright)" }}
        >
          Tôi đã kiểm tra lại — vẫn dùng công thức này
        </button>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button onClick={onUse} className="h-9 px-3 rounded-full text-[12px] font-bold dose-press" style={{ background: C.accent, color: "var(--c-on-primary)" }}>
            Dùng nồng độ này
          </button>
          <button
            onClick={onSaveWard}
            className="h-9 px-3 rounded-full text-[12px] font-bold border dose-press"
            style={{ borderColor: C.accentLine, color: "var(--c-accent-deep)" }}
          >
            Lưu công thức mới của bạn
          </button>
        </div>
      )}
    </div>
  )
}

// Ba cách xử lý khi số ống tính ra không tròn. Cách thứ ba (rút lẻ ống) mới là cách hay làm nhất
// với ống dung dịch: cần 200 mg từ ống 250 mg/20 mL thì rút 16 mL là xong, không việc gì phải đổ cả
// ống rồi nâng thể tích cuối lên cho khớp.
export type MixRoundMode = "keepConc" | "keepVolume" | "partial"

