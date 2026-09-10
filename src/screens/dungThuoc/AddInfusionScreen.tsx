import { useState, useMemo } from "react"
import type { BolusDose, AntibioticWarning, DiseaseEntry, InfusionCalcConfig, InfusionDrug, InfusionIndicationDose } from "../../data/types"
import type { InfusionCategory } from "../../data"
import { type VialForm } from "../../lib/mixing"
import { COMMON_DOSE_UNITS, massFactor, massOfConcUnit, parseDoseUnit } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { C } from "../../lib/ui"
import { WarnSeverity, BolusDraft, bolusToDraft, draftToBolus, addInfusionTitle, WARN_SEVERITIES, warnSeverityColor, BolusEditorField } from "./antibioticDrafts"
import { hasInvalidNumericInput, normalizeDecimalInput } from "./numberInput"

export function AddInfusionScreen({
  category,
  initial,
  diseases,
  onSave,
  onBack,
}: {
  category: InfusionCategory
  initial?: InfusionDrug
  diseases: DiseaseEntry[]
  onSave: (d: InfusionDrug) => void
  onBack: () => void
}) {
  const isEdit = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [route, setRoute] = useState(initial?.route ?? "")
  const [preparation, setPreparation] = useState(initial?.preparation ?? "")
  const [doseRange, setDoseRange] = useState(initial?.doseRange ?? "")
  const [note, setNote] = useState(initial?.note ?? "")
  // Bệnh lý áp dụng — giống hệt AddAntibioticScreen: chỉ TAG thuốc với bệnh lý để bước "Chỉ định"
  // nhận diện được, không sửa liều riêng theo từng bệnh lý ở màn này (đó là việc của dữ liệu dựng
  // sẵn/EditAntibioticScreen bên kháng sinh). Giữ lại đúng chỉ định đã có (kể cả liều/bolus riêng
  // của nó) khi sửa một thuốc đã có `indications` — chỉ thêm bớt theo đúng ô chọn, không xoá mất
  // override đã khai báo sẵn (vd Adrenaline: liều ngừng tim/phản vệ riêng).
  const [diseaseIds, setDiseaseIds] = useState<string[]>(() => (initial?.indications ?? []).map((i) => i.diseaseId))
  function toggleDisease(id: string) {
    setDiseaseIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }
  const [warnings, setWarnings] = useState<{ text: string; severity: WarnSeverity }[]>(
    (initial?.warnings ?? []).map((w) => ({ text: w.text, severity: w.severity })),
  )
  // Liều nạp / bolus. Trước đây chỉ dữ liệu dựng sẵn mới có được mục này, nên một thuốc tự nhập
  // kiểu esmolol hay magie — đúng những thuốc luôn phải nạp trước rồi mới duy trì — không có chỗ
  // nào ghi liều nạp ngoài ô "Cách pha" dạng câu chữ, và không được tính giúp theo cân nặng.
  const [boluses, setBoluses] = useState<BolusDraft[]>(() => (initial?.boluses ?? []).map(bolusToDraft))
  const [addCalc, setAddCalc] = useState(Boolean(initial?.calc))
  const [weightBased, setWeightBased] = useState(initial?.calc?.weightBased ?? true)
  const [doseUnit, setDoseUnit] = useState(initial?.calc?.doseUnit ?? "")
  const [doseMin, setDoseMin] = useState(initial?.calc ? String(initial.calc.doseMin) : "")
  const [doseMax, setDoseMax] = useState(initial?.calc ? String(initial.calc.doseMax) : "")
  const [concUnit, setConcUnit] = useState(initial?.calc?.concUnit ?? "")
  const [concDefault, setConcDefault] = useState(initial?.calc?.concDefault != null ? String(initial.calc.concDefault) : "")
  // Công thức pha ở dạng số — để bảng pha thuốc tính được chiều "mấy ống, bao nhiêu mL → nồng độ".
  const [mixVialAmount, setMixVialAmount] = useState(initial?.calc?.mix ? String(initial.calc.mix.vialAmount) : "")
  const [mixVialUnit, setMixVialUnit] = useState(initial?.calc?.mix?.vialUnit ?? "")
  const [mixVials, setMixVials] = useState(initial?.calc?.mix?.vials != null ? String(initial.calc.mix.vials) : "1")
  const [mixVolume, setMixVolume] = useState(initial?.calc?.mix ? String(initial.calc.mix.volumeMl) : "")
  // Ống dung dịch hay lọ bột — thiếu chỗ khai báo này thì bảng pha không nói được câu "rút mấy mL
  // thuốc, thêm mấy mL dung môi" cho thuốc tự nhập.
  const [mixForm, setMixForm] = useState<VialForm>(initial?.calc?.mix?.vialForm ?? "solution")
  const [mixVialVolume, setMixVialVolume] = useState(initial?.calc?.mix?.vialVolumeMl != null ? String(initial.calc.mix.vialVolumeMl) : "")
  const [mixReconstitute, setMixReconstitute] = useState(initial?.calc?.mix?.reconstituteMl != null ? String(initial.calc.mix.reconstituteMl) : "")
  const [mixDisplacement, setMixDisplacement] = useState(initial?.calc?.mix?.displacementMl != null ? String(initial.calc.mix.displacementMl) : "")
  // Nguồn và ngày rà soát: bỏ trống thì thẻ thuốc sẽ hiện rõ "kinh nghiệm lâm sàng tự biên soạn, chưa dẫn nguồn".
  const [source, setSource] = useState(initial?.source ?? "")
  const [reviewedOn, setReviewedOn] = useState(initial?.reviewedOn ?? "")

  // Kiểm tra ngay lúc nhập: nếu hai đơn vị không đọc được hoặc không quy đổi được cho nhau thì máy
  // tính sẽ không ra kết quả — chặn lưu ở đây tốt hơn là để người dùng phát hiện lúc đang cấp cứu.
  const unitProblem = useMemo(() => {
    if (!addCalc) return null
    if (!doseUnit.trim() || !concUnit.trim()) return null
    const u = parseDoseUnit(doseUnit.trim())
    if (!u) return `Đơn vị liều "${doseUnit.trim()}" không đọc được — phải có dạng <đơn vị>/phút, <đơn vị>/giờ, hoặc kèm /kg.`
    if (!concUnit.trim().includes("/")) return `Đơn vị nồng độ "${concUnit.trim()}" phải có dạng <đơn vị>/mL.`
    if (massFactor(u.mass, massOfConcUnit(concUnit.trim())) == null) {
      return `Không quy đổi được "${u.mass}" của liều sang "${massOfConcUnit(concUnit.trim())}" của nồng độ — hai đơn vị phải cùng họ (mcg/mg/g) hoặc trùng nhau.`
    }
    return null
  }, [addCalc, doseUnit, concUnit])

  // Các ô số của công thức pha/máy tính liều dùng chuỗi tự do (chỉ đổi dấu phẩy → chấm qua
  // normalizeDecimalInput), không ép kiểu số như input[type=number] — gõ nhầm "5oo" (chữ O) hay dán
  // nhầm "250mg" vào ô chỉ-nên-có-số vẫn được chấp nhận, và handleSave từng gọi thẳng parseFloat():
  // parseFloat("250mg") = 250 (coi như hợp lệ, im lặng cắt "mg") nhưng parseFloat("mg250") = NaN —
  // NaN đó lọt vào cấu hình máy tính liều của một thuốc tự nhập mà không ai biết cho tới lúc dùng
  // thật. Áp lại đúng `hasInvalidNumericInput` đã dùng cho khung Bệnh nhân (weight/height/age/scr)
  // thay vì để mỗi màn tự có tiêu chuẩn parse riêng.
  const numericFields = [doseMin, doseMax, concDefault, mixVialAmount, mixVials, mixVolume, mixVialVolume, mixReconstitute, mixDisplacement]
  const numericProblem = addCalc && numericFields.some(hasInvalidNumericInput)
    ? "Một hoặc nhiều ô số liệu (liều/nồng độ/công thức pha) có ký tự không phải số — sửa lại trước khi lưu, viền đỏ đánh dấu đúng ô."
    : null

  const calcValid = doseUnit.trim() && concUnit.trim() && doseMin.trim() && doseMax.trim() && !unitProblem && !numericProblem
  // Viền đỏ đúng ô số bị gõ nhầm, không chỉ một dòng cảnh báo chung — 9 ô cùng dạng đứng cạnh nhau,
  // nếu không chỉ thẳng ô nào thì người nhập phải dò lại toàn bộ để tìm chỗ sai.
  const numFieldStyle = (v: string) => (hasInvalidNumericInput(v) ? { ...fieldStyle, borderColor: C.danger } : fieldStyle)
  const canSave = name.trim().length > 0 && route.trim().length > 0 && doseRange.trim().length > 0 && (!addCalc || Boolean(calcValid))
  // Bật "Thêm máy tính tốc độ truyền" xong quên điền đơn vị/khoảng liều trong đó là cách dễ nhất để
  // rơi vào trạng thái này — unitProblem/numericProblem đã tự có dòng đỏ riêng khi giá trị SAI, nhưng
  // khi các ô đó đơn giản là TRỐNG thì không có dòng nào cả, chỉ có nút Lưu xám không rõ lý do.
  const missingSaveReasons: string[] = []
  if (!name.trim()) missingSaveReasons.push("Tên thuốc")
  if (!route.trim()) missingSaveReasons.push("Đường dùng")
  if (!doseRange.trim()) missingSaveReasons.push("Khoảng liều (mô tả)")
  if (addCalc && !calcValid) missingSaveReasons.push("Đơn vị/khoảng liều trong phần Máy tính tốc độ truyền")

  function updateWarningText(idx: number, value: string) {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, text: value } : w)))
  }
  function updateWarningSeverity(idx: number, severity: WarnSeverity) {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, severity } : w)))
  }
  function addWarning() {
    setWarnings((prev) => [...prev, { text: "", severity: "trung bình" }])
  }
  function removeWarning(idx: number) {
    setWarnings((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (!canSave) return
    const calc: InfusionCalcConfig | undefined = addCalc
      ? {
          weightBased,
          doseUnit: doseUnit.trim(),
          doseMin: parseFloat(doseMin),
          doseMax: parseFloat(doseMax),
          concUnit: concUnit.trim(),
          concDefault: concDefault.trim() ? parseFloat(concDefault) : undefined,
          // doseTimeBasis suy ra từ chính đơn vị liều (".../phút" hay ".../giờ") nên không còn ô
          // nhập riêng; vẫn ghi vào dữ liệu để file sao lưu cũ/mới cùng hình dạng.
          doseTimeBasis: parseDoseUnit(doseUnit.trim())?.per ?? "phút",
          mix:
            mixVialAmount.trim() && mixVolume.trim()
              ? {
                  // Giữ lại các trường không có ô nhập ở màn này (dung môi, hạn dùng sau pha, ngưỡng
                  // nồng độ...) khi SỬA một thuốc dựng sẵn — trước đây sửa hàm lượng ống một cái là
                  // xoá sạch phần dữ liệu đó mà không báo gì.
                  ...(initial?.calc?.mix ?? {}),
                  vialAmount: parseFloat(mixVialAmount),
                  vialUnit: mixVialUnit.trim() || massOfConcUnit(concUnit.trim()),
                  vials: mixVials.trim() ? parseFloat(mixVials) : 1,
                  volumeMl: parseFloat(mixVolume),
                  vialForm: mixForm,
                  vialVolumeMl: mixForm === "solution" && mixVialVolume.trim() ? parseFloat(mixVialVolume) : undefined,
                  reconstituteMl: mixForm === "powder" && mixReconstitute.trim() ? parseFloat(mixReconstitute) : undefined,
                  displacementMl: mixForm === "powder" && mixDisplacement.trim() ? parseFloat(mixDisplacement) : undefined,
                }
              : undefined,
        }
      : undefined
    const cleanedWarnings: AntibioticWarning[] = warnings.filter((w) => w.text.trim()).map((w) => ({ text: w.text.trim(), severity: w.severity }))
    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    // Giữ nguyên chỉ định đã có (kể cả liều/bolus riêng của nó, vd Adrenaline) nếu vẫn còn được
    // chọn; chỉ định MỚI bấm chọn thì thêm bản trống (chưa có liều riêng, dùng liều chung của thuốc).
    const indications: InfusionIndicationDose[] | undefined =
      diseaseIds.length > 0
        ? diseaseIds.map((diseaseId) => initial?.indications?.find((i) => i.diseaseId === diseaseId) ?? { diseaseId })
        : undefined
    const savedDrug: InfusionDrug = {
      ...(initial ?? {}),
      id: initial ? initial.id : `custom-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      route: route.trim(),
      preparation: preparation.trim() || "Pha theo nồng độ chuẩn đang dùng.",
      doseRange: doseRange.trim(),
      note: note.trim() || undefined,
      warnings: cleanedWarnings.length > 0 ? cleanedWarnings : undefined,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      indications,
      calc,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      isCustom: true,
    }
    onSave(savedDrug)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: C.line, background: C.surface }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary-deep)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {isEdit ? `Sửa: ${initial?.name}` : addInfusionTitle(category)}
        </span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên thuốc</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Isoprenaline" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="VD: Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bệnh lý áp dụng (tuỳ chọn)</label>
          <div className="flex flex-wrap gap-2">
            {diseases.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDisease(d.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={
                  diseaseIds.includes(d.id)
                    ? { background: C.primarySoft, borderColor: C.primary, color: "var(--c-primary-deep)" }
                    : { background: C.surface, borderColor: C.line, color: C.textSoft }
                }
              >
                {d.name}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-slate-400 mt-1.5">
            Chọn thì màn chọn thuốc hiện thêm bước "Chỉ định" cho thuốc này. Không chọn = thuốc dùng chung, không gắn với bệnh lý cụ thể nào.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách pha (tuỳ chọn)</label>
          <textarea
            value={preparation}
            onChange={(e) => setPreparation(e.target.value)}
            placeholder="VD: Pha 1 ống với Natri Clorid 0,9% vừa đủ 50 mL..."
            rows={3}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Khoảng liều (mô tả)</label>
          <input value={doseRange} onChange={(e) => setDoseRange(e.target.value)} placeholder="VD: 0,05–0,5 mcg/kg/phút, chỉnh theo đáp ứng" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Cảnh báo (tuỳ chọn)</label>
            <button onClick={addWarning} className="text-xs font-semibold" style={{ color: "var(--c-primary-deep)" }}>
              + Thêm cảnh báo
            </button>
          </div>
          <div className="space-y-2">
            {warnings.map((w, idx) => (
              <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={w.text}
                    onChange={(e) => updateWarningText(idx, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={fieldStyle}
                  />
                  <button onClick={() => removeWarning(idx)} className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: C.dangerSoft, color: C.dangerIcon }} aria-label="Xoá cảnh báo">
                    {icons.x()}
                  </button>
                </div>
                <div className="flex gap-2">
                  {WARN_SEVERITIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateWarningSeverity(idx, s)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                      style={
                        w.severity === s
                          ? { background: warnSeverityColor(s), borderColor: "transparent", color: "var(--c-on-bright)" }
                          : { background: C.surface, borderColor: C.line, color: C.textSoft }
                      }
                    >
                      Mức độ: {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liều nạp / bolus — amiodarone, magie, lidocaine, esmolol đều phải nạp trước rồi mới duy
            trì, và nhân nhẩm mg/kg lúc cấp cứu chính là chỗ dễ sai nhất. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <button onClick={() => setAddCalc((v) => !v)} className="flex items-center gap-2 mt-3 mb-1">
            <span
              className="w-9 h-5 rounded-full relative flex-none transition-colors"
              style={{ background: addCalc ? C.primary : C.line }}
            >
              {/* `left-0` là bắt buộc, không phải cho đẹp: thiếu nó thì vị trí tĩnh của nút tròn được
                  tính theo `text-align: center` mà thẻ <button> áp cho cả cụm, tức là lệch sẵn 18px
                  vào giữa track. Cộng thêm translateX(18px) lúc bật, nút tròn văng hẳn ra ngoài
                  track và đè lên dòng chữ bên cạnh. */}
              <span
                className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: addCalc ? "translateX(18px)" : "translateX(2px)" }}
              />
            </span>
            <span className="text-xs font-semibold text-slate-700">Thêm máy tính tốc độ truyền (mL/giờ)</span>
          </button>

          {addCalc && (
            <div className="space-y-2.5 mt-3 fade-in">
              <div className="flex gap-2">
                {(
                  [
                    { v: true, label: "Tính theo cân nặng" },
                    { v: false, label: "Liều cố định (không theo cân nặng)" },
                  ]
                ).map((opt) => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setWeightBased(opt.v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      weightBased === opt.v
                        ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
                        : { background: C.surface, borderColor: C.line, color: C.textSoft }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Chọn nhanh đơn vị liều. Máy tính đọc trực tiếp chuỗi này để biết đơn vị lượng
                  thuốc, có theo cân nặng hay không, và tính theo phút hay giờ — nên gõ tay dễ sai
                  (vd "mcg/kg/min" tiếng Anh sẽ không đọc được). Vẫn cho sửa tay bên dưới cho các
                  đơn vị lạ, kèm kiểm tra định dạng ngay tại chỗ. */}
              <div>
                <label className="text-[12px] text-slate-400 mb-1.5 block">Đơn vị liều</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_DOSE_UNITS.map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        setDoseUnit(u)
                        setWeightBased(u.includes("/kg"))
                      }}
                      className="px-2.5 py-1.5 rounded-full text-[12px] font-semibold border whitespace-nowrap"
                      style={
                        doseUnit === u
                          ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
                          : { background: C.surface, borderColor: C.line, color: C.textSoft }
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị liều (sửa tay nếu cần)</label>
                  <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} placeholder="mcg/kg/phút" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị nồng độ</label>
                  <input value={concUnit} onChange={(e) => setConcUnit(e.target.value)} placeholder="mg/mL" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Liều tối thiểu gợi ý</label>
                  <input value={doseMin} onChange={(e) => setDoseMin(normalizeDecimalInput(e.target.value))} inputMode="decimal" className={fieldClass} style={numFieldStyle(doseMin)} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Liều tối đa gợi ý</label>
                  <input value={doseMax} onChange={(e) => setDoseMax(normalizeDecimalInput(e.target.value))} inputMode="decimal" className={fieldClass} style={numFieldStyle(doseMax)} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Nồng độ pha mặc định (tuỳ chọn)</label>
                  <input value={concDefault} onChange={(e) => setConcDefault(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="Để trống nếu tuỳ khoa" className={fieldClass} style={numFieldStyle(concDefault)} />
                </div>
              </div>

              {/* Công thức pha dạng số — có phần này thì bảng "ống ⇄ nồng độ" mới tính giúp được */}
              <p className="text-[12px] font-semibold text-slate-500 mt-1">Công thức pha chuẩn (tuỳ chọn)</p>
              <div className="flex gap-2">
                {([
                  { v: "solution" as VialForm, label: "Ống dung dịch" },
                  { v: "powder" as VialForm, label: "Lọ bột" },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setMixForm(opt.v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      mixForm === opt.v
                        ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
                        : { background: C.surface, borderColor: C.line, color: C.textSoft }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Hàm lượng 1 ống/lọ</label>
                  <input value={mixVialAmount} onChange={(e) => setMixVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 250" className={fieldClass} style={numFieldStyle(mixVialAmount)} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị của ống</label>
                  <input value={mixVialUnit} onChange={(e) => setMixVialUnit(e.target.value)} placeholder="mg" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Số ống của công thức chuẩn</label>
                  <input value={mixVials} onChange={(e) => setMixVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={fieldClass} style={numFieldStyle(mixVials)} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Pha vừa đủ (mL)</label>
                  <input value={mixVolume} onChange={(e) => setMixVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 50" className={fieldClass} style={numFieldStyle(mixVolume)} />
                </div>
                {mixForm === "solution" && (
                  <div>
                    <label className="text-[12px] text-slate-400 mb-1 block">Thể tích 1 ống (mL)</label>
                    <input value={mixVialVolume} onChange={(e) => setMixVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 20" className={fieldClass} style={numFieldStyle(mixVialVolume)} />
                  </div>
                )}
              </div>
              {/* "Thể tích bột tăng sau pha" dài hơn hẳn "Pha ban đầu với" — ghép chung một hàng 2
                  cột thì nhãn dài xuống 2 dòng còn nhãn ngắn chỉ 1 dòng, đẩy lệch ô nhập. Mỗi ô một
                  hàng riêng, rộng hết cỡ, để nhãn dài nào cũng chỉ cần 1 dòng. */}
              {mixForm === "powder" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[12px] text-slate-400 mb-1 block">Pha ban đầu với (mL/lọ)</label>
                    <input value={mixReconstitute} onChange={(e) => setMixReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 10" className={fieldClass} style={numFieldStyle(mixReconstitute)} />
                  </div>
                  <div>
                    <label className="text-[12px] text-slate-400 mb-1 block">Thể tích bột tăng sau pha (mL/lọ)</label>
                    <input value={mixDisplacement} onChange={(e) => setMixDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 0,7" className={fieldClass} style={numFieldStyle(mixDisplacement)} />
                  </div>
                </div>
              )}

              {numericProblem && (
                <p className="text-[12px] font-semibold leading-relaxed" style={{ color: C.dangerIcon }}>
                  {numericProblem}
                </p>
              )}
              {unitProblem ? (
                <p className="text-[12px] leading-relaxed" style={{ color: C.dangerIcon }}>
                  {unitProblem}
                </p>
              ) : (
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Đơn vị liều phải kết thúc bằng <b>/phút</b> hoặc <b>/giờ</b>, thêm <b>/kg</b> nếu tính theo cân nặng. Đơn vị nồng độ dạng <b>&lt;đơn vị&gt;/mL</b>. Hệ số quy đổi không cần khai báo nữa — máy tính tự suy ra từ hai đơn vị này.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Nguồn dữ liệu (tuỳ chọn)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="VD: Phác đồ ICU BV X 2026 / Sanford Guide / tờ HDSD" className={fieldClass} style={fieldStyle} />
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Rà soát lần cuối (YYYY-MM)</label>
          <input value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} placeholder="VD: 2026-07" className={fieldClass} style={fieldStyle} />
          <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5">
            Bỏ trống thì thẻ thuốc sẽ hiện rõ "kinh nghiệm lâm sàng tự biên soạn, chưa dẫn nguồn" — để sau này biết mục nào còn phải kiểm chứng lại.
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {isEdit
            ? "Nội dung sửa được lưu ngay trên máy này, không đổi dữ liệu gốc trong app."
            : "Mục tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app."}
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: C.line, paddingBottom: "var(--nav-pad-bottom)" }}>
        {!canSave && missingSaveReasons.length > 0 && (
          <p className="text-[12px] font-semibold text-center mb-2" style={{ color: C.warnIcon }}>
            Cần điền thêm: {missingSaveReasons.join(" · ")}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? C.primary : C.muted, color: canSave ? "var(--c-on-primary)" : "var(--c-on-bright)" }}
        >
          {isEdit ? "Lưu thay đổi" : "Lưu thuốc"}
        </button>
      </div>
    </div>
  )
}
