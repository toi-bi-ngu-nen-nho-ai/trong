import { useState, useMemo } from "react"
import type { InfusionCalcConfig, InfusionDrug } from "../../data/types"
import { concentrationFromVials, partialDraw, vialsForConcentration, volumeForConcentration, type VialForm, type VialSpec } from "../../lib/mixing"
import { type WardRecipe } from "../../lib/wardRecipes"
import { formatMass } from "../../lib/perKgDose"
import { tickHaptic } from "../../lib/haptics"
import { formatDoseNumber, massFactor, massOfConcUnit } from "../../lib/infusion"
import { C, CHIP, FIELD, FIELD_STYLE, T, trim } from "../../lib/ui"
import { useDosing } from "./context"
import { MIX_UNIT_CHOICES, MixRoundMode, MixOutcome, describeComposition, MixResultCard } from "./infusionMixing"
import { useVialCountGuard, VialCountWarning } from "./antibioticMixingHelpers"
import { normalizeDecimalInput } from "./numberInput"

export function MixPanel({
  drug,
  calc,
  wardRecipe,
  onUseConc,
  onSaveWard,
}: {
  drug: InfusionDrug
  calc: InfusionCalcConfig
  wardRecipe?: WardRecipe
  onUseConc: (concValue: number, volumeMl: number) => void
  onSaveWard: (recipe: Omit<WardRecipe, "savedAt" | "id"> & { id?: string }) => void
}) {
  const { logCalc } = useDosing()
  const concMass = massOfConcUnit(calc.concUnit)
  const mix = calc.mix
  const vialLabel = mix?.vialLabel ?? "ống"

  // Công thức đã lưu (nếu có) được ưu tiên làm giá trị khởi tạo — đó là điểm khác biệt giữa một app
  // dùng hằng ngày và một app phải khai báo lại từ đầu mỗi lần mở.
  const [vialAmount, setVialAmount] = useState(String(wardRecipe?.vialAmount ?? mix?.vialAmount ?? ""))
  const [vialUnit, setVialUnit] = useState(wardRecipe?.vialUnit ?? mix?.vialUnit ?? concMass)
  const [vials, setVials] = useState(String(wardRecipe?.vials ?? mix?.vials ?? 1))
  // MỘT ô thể tích duy nhất cho cả hai chiều tính.
  const [volume, setVolume] = useState(String(wardRecipe?.volumeMl ?? mix?.volumeMl ?? 50))
  const [vialForm, setVialForm] = useState<VialForm>(wardRecipe?.vialForm ?? mix?.vialForm ?? "solution")
  const [vialVolume, setVialVolume] = useState(
    wardRecipe?.vialVolumeMl != null ? String(wardRecipe.vialVolumeMl) : mix?.vialVolumeMl != null ? String(mix.vialVolumeMl) : "",
  )
  const [reconstitute, setReconstitute] = useState(
    wardRecipe?.reconstituteMl != null ? String(wardRecipe.reconstituteMl) : mix?.reconstituteMl != null ? String(mix.reconstituteMl) : "",
  )
  const [displacement, setDisplacement] = useState(
    wardRecipe?.displacementMl != null ? String(wardRecipe.displacementMl) : mix?.displacementMl != null ? String(mix.displacementMl) : "",
  )
  const [diluent, setDiluent] = useState(wardRecipe?.diluent ?? mix?.diluents?.[0] ?? "NaCl 0,9%")
  const [target, setTarget] = useState("")
  const [roundMode, setRoundMode] = useState<MixRoundMode>("keepConc")
  const [saveTitle, setSaveTitle] = useState("")

  const unitChoices = useMemo(() => MIX_UNIT_CHOICES.filter((u) => massFactor(u, concMass) != null), [concMass])
  const allowedDiluents = mix?.diluents ?? ["NaCl 0,9%", "Glucose 5%"]
  const avoidDiluents = mix?.avoidDiluents ?? []
  // Cảnh báo dung môi chỉ nổ khi người dùng thực sự chọn dung môi cấm. Trước đây nó hiện thường
  // trực, nên chọn ĐÚNG Glucose 5% cho amiodarone vẫn thấy một khối đỏ — kiểu cảnh báo dạy người ta
  // bỏ qua màu đỏ.
  const diluentBlocked = avoidDiluents.includes(diluent)

  const va = parseFloat(vialAmount)
  const nv = parseFloat(vials)
  const vol = parseFloat(volume)
  const num = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) || n < 0 ? null : n
  }
  const spec = useMemo<VialSpec>(
    () => ({
      form: vialForm,
      volumeMl: vialForm === "solution" ? (num(vialVolume) || null) : null,
      reconstituteMl: vialForm === "powder" ? (num(reconstitute) || null) : null,
      displacementMl: vialForm === "powder" ? num(displacement) : null,
    }),
    [vialForm, vialVolume, reconstitute, displacement],
  )

  const mixedConc = concentrationFromVials(va, nv, vol, vialUnit, calc.concUnit)

  const tgt = parseFloat(target)
  const neededVialsRaw = vialsForConcentration(tgt, va, vol, vialUnit, calc.concUnit)
  const neededVials = neededVialsRaw != null ? Math.max(1, Math.ceil(neededVialsRaw - 1e-9)) : null
  // Số ống/lọ tính ra vượt ngưỡng hợp lý (gradeVialCount) thường là dấu hiệu gõ nhầm "Hàm lượng 1
  // {vialLabel}" ở trên chứ không phải liều thật cần nhiều đến vậy — chặn kết quả lại chờ xác nhận.
  const vialGuard = useVialCountGuard(neededVials, vialForm)
  const concIfRounded = neededVials != null ? concentrationFromVials(va, neededVials, vol, vialUnit, calc.concUnit) : null
  // Giữ ĐÚNG nồng độ mong muốn bằng cách chỉnh thể tích cuối thay vì chịu lệch nồng độ.
  const volForExact = neededVials != null ? volumeForConcentration(tgt, va, neededVials, vialUnit, calc.concUnit) : null
  const draw = useMemo(() => partialDraw(tgt, vol, va, vialUnit, calc.concUnit, spec), [tgt, vol, va, vialUnit, calc.concUnit, spec])
  const needsRounding = neededVialsRaw != null && neededVials != null && Math.abs(neededVialsRaw - neededVials) > 1e-6
  // Rút lẻ chỉ có nghĩa khi biết thể tích rút ra từ một ống. Không đủ số liệu thì không đưa lựa
  // chọn ra rồi để nó chết ở giữa — quay về phương án giữ nồng độ.
  const canDrawPartial = draw != null
  const mode: MixRoundMode = roundMode === "partial" && !canDrawPartial ? "keepConc" : roundMode

  const fieldClass = FIELD
  const fieldStyle = FIELD_STYLE

  // Mốc so sánh nồng độ: công thức người dùng đã lưu, nếu chưa lưu thì công thức dựng sẵn của app.
  const refConc = wardRecipe?.concValue ?? calc.concDefault
  const refLabel = wardRecipe ? "công thức của bạn" : "công thức chuẩn"

  function outcomeFor(concValue: number, volumeMl: number, vialsCount: number, opened?: number, drawMl?: number): MixOutcome {
    return {
      concValue,
      volumeMl,
      vials: vialsCount,
      vialsOpened: opened ?? Math.max(1, Math.ceil(vialsCount - 1e-9)),
      drawMl: drawMl ?? null,
      vialAmount: va,
      vialUnit,
      spec,
      diluent,
    }
  }

  function useOutcome(o: MixOutcome, inputs: string[]) {
    onUseConc(o.concValue, o.volumeMl)
    logCalc({
      drug: drug.name,
      kind: "mix",
      inputs: [...inputs, describeComposition(o, vialLabel)],
      output: `Nồng độ ${formatDoseNumber(o.concValue)} ${calc.concUnit} trong ${trim(o.volumeMl)} mL`,
    })
    tickHaptic()
  }

  function saveWardFrom(o: MixOutcome) {
    onSaveWard({
      drugId: drug.id,
      title: saveTitle.trim() || `${o.diluent} · ${o.vials} ${vialLabel}`,
      concValue: o.concValue,
      vialAmount: o.vialAmount,
      vialUnit: o.vialUnit,
      vials: o.vials,
      volumeMl: o.volumeMl,
      vialForm: o.spec.form,
      vialVolumeMl: o.spec.volumeMl ?? undefined,
      reconstituteMl: o.spec.reconstituteMl ?? undefined,
      displacementMl: o.spec.displacementMl ?? undefined,
      diluent: o.diluent,
    })
    setSaveTitle("")
    tickHaptic()
  }

  const pill = (on: boolean) =>
    on
      ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }

  return (
    <div className="mt-2.5 p-3 rounded-[14px] fade-in" style={{ background: C.surfaceAlt, border: "1px solid var(--c-line)" }}>
      {/* Dung môi — thông tin sống còn với thuốc kén dung môi */}
      <label className={`${T.label} text-slate-500 mb-1 block`}>Dung môi</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {allowedDiluents.map((d) => (
          <button key={d} onClick={() => setDiluent(d)} className={CHIP} style={pill(diluent === d)}>
            {d}
          </button>
        ))}
        {/* Dung môi cấm vẫn bấm được: "dùng NaCl có sao không" là câu người ta hỏi, và bấm vào để
            nhận câu trả lời đỏ rõ ràng thì tốt hơn là không tìm thấy nút nào để hỏi. */}
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

      {/* Ống dung dịch hay lọ bột — hai thao tác khác hẳn nhau, và chọn sai thì con số mL dung môi
          in ra bên dưới sai theo. */}
      <label className={`${T.label} text-slate-500 mb-1 block`}>Dạng chế phẩm</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {([
          { v: "solution" as VialForm, label: `Ống dung dịch` },
          { v: "powder" as VialForm, label: `Lọ bột` },
        ]).map((opt) => (
          <button key={opt.v} onClick={() => setVialForm(opt.v)} className={CHIP} style={pill(vialForm === opt.v)}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <label className={`${T.label} text-slate-500 mb-1 block`}>Tên công thức khi lưu (tuỳ chọn, vd: Khoa Hồi sức)</label>
        <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="Đặt tên để bấm nhanh đổi lại sau này" maxLength={40} className={fieldClass} style={fieldStyle} />
      </div>

      {/* Ống dung dịch: 3 ô ngắn vừa khít một hàng. Lọ bột thì tách "Pha ban đầu với (mL/lọ)" ra
          hàng riêng — nhãn này dài hơn hẳn "Thể tích 1 ống (mL)", nhét vào 1/3 hàng sẽ xuống dòng và
          đẩy ô nhập tụt xuống so với hai ô bên cạnh (không còn ngang hàng). */}
      <div className={`grid ${vialForm === "solution" ? "grid-cols-3" : "grid-cols-2"} gap-2 mb-2`}>
        <div>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Hàm lượng 1 {vialLabel}</label>
          <input value={vialAmount} onChange={(e) => setVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="250" className={fieldClass} style={fieldStyle} />
        </div>
        {vialForm === "solution" && (
          <div>
            <label className={`${T.label} text-slate-500 mb-1 block`}>Thể tích 1 {vialLabel} (mL)</label>
            <input value={vialVolume} onChange={(e) => setVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="5" className={fieldClass} style={fieldStyle} />
          </div>
        )}
        <div>
          <label className={`${T.label} text-slate-500 mb-1 block`}>Số {vialLabel}</label>
          <input value={vials} onChange={(e) => setVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={fieldClass} style={fieldStyle} />
        </div>
      </div>

      {/* Xếp dọc, mỗi ô một hàng riêng — không ghép ngang: "Thể tích bột tăng sau pha" luôn dài hơn
          hẳn "Pha ban đầu với", và độ dài {vialLabel} (lọ/ống/chai) đổi theo từng thuốc nên không
          thể tin là hai nhãn sẽ luôn xuống dòng đối xứng nhau ở mọi cỡ chữ. */}
      {vialForm === "powder" && (
        <div className="space-y-2 mb-2">
          <div>
            <label className={`${T.label} text-slate-500 mb-1 block`}>Pha ban đầu với (mL/{vialLabel})</label>
            <input value={reconstitute} onChange={(e) => setReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="10" className={fieldClass} style={fieldStyle} />
          </div>
          <div>
            {/* Bột tan ra làm thể tích tăng thật: vancomycin 1 g tăng thêm ~0,7 mL. Bỏ qua là sai hệ
                thống theo một chiều — nồng độ thực luôn loãng hơn con số in ra. */}
            <label className={`${T.label} text-slate-500 mb-1 block`}>Thể tích bột tăng sau pha (mL/{vialLabel})</label>
            <input value={displacement} onChange={(e) => setDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="0,7" className={fieldClass} style={fieldStyle} />
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className={`${T.label} text-slate-500 mb-1 block`}>Thể tích cuối sau pha (mL)</label>
        <input value={volume} onChange={(e) => setVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="50" className={fieldClass} style={fieldStyle} />
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

      <p className="text-[12px] font-bold mb-1.5 text-slate-500">Tôi có {vialLabel} thuốc → nồng độ bao nhiêu</p>
      {mixedConc != null && !isNaN(nv) && (
        <MixResultCard
          drug={drug}
          calc={calc}
          vialLabel={vialLabel}
          refConc={refConc}
          refLabel={refLabel}
          outcome={outcomeFor(mixedConc, vol, nv)}
          headline={`Nồng độ ${formatDoseNumber(mixedConc)} ${calc.concUnit}`}
          onUse={() => useOutcome(outcomeFor(mixedConc, vol, nv), [`${vials} ${vialLabel} × ${formatMass(va, vialUnit)}`, `Pha vừa đủ ${vol} mL`])}
          onSaveWard={() => saveWardFrom(outcomeFor(mixedConc, vol, nv))}
        />
      )}

      <p className="text-[12px] font-bold mb-1.5 mt-3 text-slate-500">Tôi cần nồng độ này → lấy mấy {vialLabel}</p>
      <div className="mb-2">
        <label className={`${T.label} text-slate-500 mb-1 block`}>Nồng độ mong muốn ({calc.concUnit})</label>
        <input value={target} onChange={(e) => setTarget(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={calc.concDefault != null ? String(calc.concDefault * 2) : ""} className={fieldClass} style={fieldStyle} />
      </div>
      {needsRounding && (
        <div className="flex p-0.5 rounded-[14px] mb-2" style={{ background: C.line }}>
          {([
            { v: "keepConc" as MixRoundMode, label: "Giữ nồng độ", on: true },
            { v: "keepVolume" as MixRoundMode, label: "Giữ thể tích", on: true },
            { v: "partial" as MixRoundMode, label: `Rút lẻ ${vialLabel}`, on: canDrawPartial },
          ]).map((opt) => (
            <button
              key={opt.v}
              onClick={() => opt.on && setRoundMode(opt.v)}
              disabled={!opt.on}
              className="flex-1 h-9 rounded-[14px] text-[12px] font-bold leading-[1.3]"
              style={
                mode === opt.v
                  ? { background: C.surface, color: "var(--c-accent-deep)" }
                  : { background: "transparent", color: opt.on ? "var(--c-text-muted)" : C.muted, opacity: opt.on ? 1 : 0.5 }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <VialCountWarning grade={vialGuard.grade} show={vialGuard.showWarning} onConfirm={vialGuard.confirm} />
      {neededVials != null && neededVialsRaw != null && concIfRounded != null && !vialGuard.blocked && (
        mode === "partial" && draw != null ? (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl)}
            headline={`Rút ${formatDoseNumber(draw.drawMl)} mL, pha vừa đủ ${trim(vol)} mL`}
            subline={`Bóc ${draw.vialsOpened} ${vialLabel}, rút đúng lượng cần rồi bỏ phần thừa — giữ nguyên cả nồng độ ${formatDoseNumber(tgt)} ${calc.concUnit} lẫn thể tích ${trim(vol)} mL.`}
            onUse={() =>
              useOutcome(outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Rút lẻ ${formatDoseNumber(draw.drawMl)} mL, thể tích cuối ${vol} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl))}
          />
        ) : mode === "keepConc" && volForExact != null ? (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(tgt, volForExact, neededVials)}
            headline={`Lấy ${neededVials} ${vialLabel}, pha vừa đủ ${trim(volForExact)} mL`}
            subline={
              needsRounding
                ? `Cần chính xác ${formatDoseNumber(neededVialsRaw)} ${vialLabel} cho ${trim(vol)} mL; lấy tròn ${neededVials} ${vialLabel} rồi nâng thể tích lên ${trim(volForExact)} mL thì giữ ĐÚNG nồng độ ${formatDoseNumber(tgt)} ${calc.concUnit}.`
                : undefined
            }
            onUse={() =>
              useOutcome(outcomeFor(tgt, volForExact, neededVials), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Giữ đúng nồng độ, chỉnh thể tích cuối thành ${trim(volForExact)} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(tgt, volForExact, neededVials))}
          />
        ) : (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(concIfRounded, vol, neededVials)}
            headline={`Lấy ${neededVials} ${vialLabel}, pha vừa đủ ${trim(vol)} mL`}
            subline={
              needsRounding
                ? `Cần chính xác ${formatDoseNumber(neededVialsRaw)} ${vialLabel}; lấy tròn ${neededVials} ${vialLabel} thì nồng độ thực là ${formatDoseNumber(concIfRounded)} ${calc.concUnit} (mong muốn ${formatDoseNumber(tgt)}).`
                : undefined
            }
            onUse={() =>
              useOutcome(outcomeFor(concIfRounded, vol, neededVials), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Thể tích cuối ${vol} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(concIfRounded, vol, neededVials))}
          />
        )
      )}
    </div>
  )
}
