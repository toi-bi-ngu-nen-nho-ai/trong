import { useState } from "react"
import type { BolusDose, DoseTier, Antibiotic, AntibioticWarning, DiseaseEntry, IndicationDose } from "../../data/types"
import { type WeightBasis } from "../../lib/bodyWeight"
import { icons } from "../../components/icons"
import { C, T } from "../../lib/ui"
import { ANTIBIOTIC_ROUTE_OPTIONS, BolusDraft, bolusToDraft, DoseCapDraft, doseCapToDraft, MixDraft, mixToDraft, WarnSeverity, draftToBolus, draftToDoseCap, draftToMixList, BolusEditorField, WARN_SEVERITIES, warnSeverityColor, AntibioticAdvancedFields } from "./antibioticDrafts"
import { slugifyDiseaseName, normalizeDecimalInput } from "./numberInput"

interface IndicationRow {
  key: string
  diseaseName: string
  standardDose: string
  tiers: { min: string; label: string; dose: string }[]
  note: string
}

export function EditAntibioticScreen({
  drug,
  diseases,
  onSave,
  onBack,
}: {
  drug: Antibiotic
  diseases: DiseaseEntry[]
  onSave: (a: Antibiotic, newDiseases: DiseaseEntry[]) => void
  onBack: () => void
}) {
  const initialRouteMatch = ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.label === drug.route)
  const [name, setName] = useState(drug.name)
  const [routeId, setRouteId] = useState<string>(initialRouteMatch ? initialRouteMatch.id : "other")
  const [routeOther, setRouteOther] = useState(initialRouteMatch ? "" : drug.route)
  const [standardDose, setStandardDose] = useState(drug.standardDose ?? "")
  const [preparation, setPreparation] = useState(drug.preparation ?? "")
  const [note, setNote] = useState(drug.note ?? "")
  const [source, setSource] = useState(drug.source ?? "")
  const [reviewedOn, setReviewedOn] = useState(drug.reviewedOn ?? "")
  // Liều khi lọc máu — nhập được ngay tại đây để phác đồ của khoa vào thẳng app, thay vì mỗi lần
  // gặp bệnh nhân CRRT lại phải đi tra sổ.
  const [rrtIhd, setRrtIhd] = useState(drug.rrt?.ihd ?? "")
  const [rrtCrrt, setRrtCrrt] = useState(drug.rrt?.crrt ?? "")
  const [rrtSled, setRrtSled] = useState(drug.rrt?.sled ?? "")
  const [rrtPd, setRrtPd] = useState(drug.rrt?.pd ?? "")
  const [rrtNote, setRrtNote] = useState(drug.rrt?.note ?? "")
  const [rrtSource, setRrtSource] = useState(drug.rrt?.source ?? "")
  // Liều nạp — vd Vancomycin cần 25–30 mg/kg trước khi vào liều duy trì theo CrCl.
  const [boluses, setBoluses] = useState<BolusDraft[]>(() => (drug.boluses ?? []).map(bolusToDraft))
  const [weightBasis, setWeightBasis] = useState<WeightBasis | "">(drug.doseWeightBasis ?? "")
  const [cap, setCap] = useState<DoseCapDraft>(() => doseCapToDraft(drug.maxSingleDose))
  const [compatKey, setCompatKey] = useState(drug.compatKey ?? "")
  const [mix, setMix] = useState<MixDraft>(() => mixToDraft(drug.mix?.[0]))
  const [tiers, setTiers] = useState<{ min: string; label: string; dose: string }[]>(
    (drug.tiers ?? []).length > 0
      ? (drug.tiers ?? []).map((t) => ({ min: String(t.min), label: t.label, dose: t.dose }))
      : [{ min: "0", label: "Mọi mức CrCl", dose: "" }],
  )
  const [warnings, setWarnings] = useState<{ text: string; severity: WarnSeverity }[]>(
    (drug.warnings ?? []).map((w) => ({ text: w.text, severity: w.severity })),
  )
  // Chỉ định riêng theo bệnh lý — trước đây chỉ xem, giờ cho sửa/thêm/xoá được ngay ở màn này.
  const [indications, setIndications] = useState<IndicationRow[]>(() =>
    (drug.indications ?? []).map((ind, i) => {
      const dz = diseases.find((d) => d.id === ind.diseaseId)
      return {
        key: `${ind.diseaseId}-${i}`,
        diseaseName: dz?.name ?? ind.diseaseId,
        standardDose: ind.standardDose ?? "",
        tiers: ind.tiers.map((t) => ({ min: String(t.min), label: t.label, dose: t.dose })),
        note: ind.note ?? "",
      }
    }),
  )

  const isOtherRoute = routeId === "other"
  const isInjectableRoute = routeId === "iv-infusion" || routeId === "iv-slow" || routeId === "im" || routeId === "sc"
  const finalRoute = isOtherRoute ? routeOther.trim() : ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.id === routeId)?.label ?? ""
  const canSave = name.trim().length > 0 && finalRoute.length > 0 && tiers.some((t) => t.dose.trim())
  const missingSaveReasons: string[] = []
  if (!name.trim()) missingSaveReasons.push("Tên hoạt chất")
  if (!finalRoute) missingSaveReasons.push(isOtherRoute ? "Đường dùng (mô tả)" : "Đường dùng")
  if (!tiers.some((t) => t.dose.trim())) missingSaveReasons.push("Liều theo CrCl (ít nhất một mức)")

  function updateTier(idx: number, field: "min" | "label" | "dose", value: string) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }
  function addTier() {
    setTiers((prev) => [...prev, { min: "", label: "", dose: "" }])
  }
  function removeTier(idx: number) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

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

  function addIndication() {
    setIndications((prev) => [
      ...prev,
      { key: `new-${Date.now()}-${prev.length}`, diseaseName: "", standardDose: "", tiers: [], note: "" },
    ])
  }
  function removeIndication(key: string) {
    setIndications((prev) => prev.filter((r) => r.key !== key))
  }
  function updateIndicationField(key: string, field: "diseaseName" | "standardDose" | "note", value: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }
  function pickIndicationDisease(key: string, diseaseName: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, diseaseName } : r)))
  }
  function addIndicationTier(key: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, tiers: [...r.tiers, { min: "", label: "", dose: "" }] } : r)))
  }
  function removeIndicationTier(key: string, idx: number) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, tiers: r.tiers.filter((_, i) => i !== idx) } : r)))
  }
  function updateIndicationTier(key: string, idx: number, field: "min" | "label" | "dose", value: string) {
    setIndications((prev) =>
      prev.map((r) => (r.key === key ? { ...r, tiers: r.tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)) } : r)),
    )
  }

  function handleSave() {
    if (!canSave) return
    const cleanedTiers: DoseTier[] = tiers
      .filter((t) => t.dose.trim())
      .map((t) => {
        const minNum = parseFloat(t.min)
        const min = isNaN(minNum) ? 0 : minNum
        return { min, label: t.label.trim() || `CrCl ≥ ${min}`, dose: t.dose.trim() }
      })
    const cleanedWarnings: AntibioticWarning[] = warnings.filter((w) => w.text.trim()).map((w) => ({ text: w.text.trim(), severity: w.severity }))
    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    // `drug.tiers` đã thành optional — bậc liều rỗng thì để MẢNG RỖNG, không phải undefined:
    // IndicationDose.tiers vẫn bắt buộc, và tierFor() đã tự xử lý danh sách rỗng.
    const fallbackTiers = cleanedTiers.length > 0 ? cleanedTiers : drug.tiers ?? []

    // Với mỗi chỉ định theo bệnh lý: tìm bệnh lý trùng tên trong danh mục hiện có (không phân biệt
    // hoa/thường, không kể khoảng trắng thừa) để lấy đúng diseaseId; nếu tên không khớp mục nào,
    // đây là bệnh lý mới do người dùng gõ vào — tự tạo một DiseaseEntry mới cho bệnh lý đó. Cũng so
    // khớp với các bệnh lý VỪA được tạo ở chỉ định trước đó trong cùng lần lưu này, để hai chỉ định
    // cùng gõ một tên bệnh lý mới (chưa có trong danh mục) dùng chung một diseaseId thay vì tạo trùng.
    const newDiseases: DiseaseEntry[] = []
    const cleanedIndications: IndicationDose[] = indications
      .filter((row) => row.diseaseName.trim())
      .map((row) => {
        const trimmedName = row.diseaseName.trim()
        const matched =
          diseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase()) ??
          newDiseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase())
        let diseaseId = matched?.id
        if (!diseaseId) {
          diseaseId = `custom-disease-${slugifyDiseaseName(trimmedName) || "moi"}-${Date.now()}-${newDiseases.length}`
          newDiseases.push({ id: diseaseId, name: trimmedName, antibiotics: [drug.id], isCustom: true })
        }
        const indTiers: DoseTier[] = row.tiers
          .filter((t) => t.dose.trim())
          .map((t) => {
            const minNum = parseFloat(t.min)
            const min = isNaN(minNum) ? 0 : minNum
            return { min, label: t.label.trim() || `CrCl ≥ ${min}`, dose: t.dose.trim() }
          })
        const indication: IndicationDose = {
          diseaseId,
          tiers: indTiers.length > 0 ? indTiers : fallbackTiers,
          standardDose: row.standardDose.trim() || undefined,
          note: row.note.trim() || undefined,
        }
        return indication
      })

    const updated: Antibiotic = {
      ...drug,
      name: name.trim(),
      route: finalRoute,
      standardDose: standardDose.trim() || undefined,
      preparation: preparation.trim() || undefined,
      note: note.trim() || undefined,
      tiers: fallbackTiers,
      warnings: cleanedWarnings.length > 0 ? cleanedWarnings : undefined,
      indications: cleanedIndications.length > 0 ? cleanedIndications : undefined,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      rrt:
        rrtIhd.trim() || rrtCrrt.trim() || rrtSled.trim() || rrtPd.trim() || rrtNote.trim()
          ? {
              ihd: rrtIhd.trim() || undefined,
              crrt: rrtCrrt.trim() || undefined,
              sled: rrtSled.trim() || undefined,
              pd: rrtPd.trim() || undefined,
              note: rrtNote.trim() || undefined,
              source: rrtSource.trim() || undefined,
              reviewedOn: drug.rrt?.reviewedOn,
            }
          : undefined,
      doseWeightBasis: weightBasis || undefined,
      maxSingleDose: draftToDoseCap(cap),
      compatKey: compatKey.trim() || undefined,
      mix: isInjectableRoute ? draftToMixList(mix) : undefined,
      isCustom: true,
    }
    onSave(updated, newDiseases)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: C.line, background: C.surface }
  const chipStyle = (active: boolean) =>
    active
      ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary-deep)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Sửa kháng sinh</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên hoạt chất</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <div className="flex flex-wrap gap-2">
            {ANTIBIOTIC_ROUTE_OPTIONS.map((r) => (
              <button key={r.id} onClick={() => setRouteId(r.id)} className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors" style={chipStyle(routeId === r.id)}>
                {r.label}
              </button>
            ))}
            <button onClick={() => setRouteId("other")} className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors" style={chipStyle(routeId === "other")}>
              Khác
            </button>
          </div>
          {isOtherRoute && (
            <input value={routeOther} onChange={(e) => setRouteOther(e.target.value)} placeholder="Ghi rõ đường dùng" className={`${fieldClass} mt-2.5`} style={fieldStyle} />
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Liều chuẩn tham khảo (tuỳ chọn)</label>
          <input
            value={standardDose}
            onChange={(e) => setStandardDose(e.target.value)}
            placeholder="VD: 1–2 g mỗi 8h (IV)"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách dùng / Pha thuốc (tuỳ chọn)</label>
          <textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} rows={3} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Mức liều theo CrCl</label>
            <button onClick={addTier} className="text-xs font-semibold" style={{ color: "var(--c-primary-deep)" }}>
              + Thêm mức
            </button>
          </div>
          <div className="space-y-2.5">
            {tiers.map((t, idx) => (
              <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    {/* min-h-[3em] (issue "CrCl tối thiểu không ngay hàng"): nhãn này dài hơn "Nhãn
                        hiển thị" nên xuống 2 dòng ở cột hẹp trong khi nhãn kia chỉ 1 dòng, đẩy ô nhập
                        bên dưới tụt xuống lệch nhau. Đặt trước chiều cao ĐÚNG 2 dòng (line-height 1.5
                        ở cỡ chữ 10px) trên cả hai nhãn cùng hàng để hai ô nhập luôn ngang hàng. */}
                    <label className="text-[12px] text-slate-400 mb-1 block min-h-[3em]">CrCl tối thiểu (mL/phút)</label>
                    <input
                      value={t.min}
                      onChange={(e) => updateTier(idx, "min", normalizeDecimalInput(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-[12px] text-slate-400 mb-1 block min-h-[3em]">Nhãn hiển thị</label>
                    <input
                      value={t.label}
                      onChange={(e) => updateTier(idx, "label", e.target.value)}
                      placeholder="VD: CrCl 10–49"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={fieldStyle}
                    />
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(idx)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-4"
                      style={{ background: C.dangerSoft, color: C.dangerIcon }}
                      aria-label="Xoá mức"
                    >
                      {icons.x()}
                    </button>
                  )}
                </div>
                <label className="text-[12px] text-slate-400 mb-1 block">Liều</label>
                <input
                  value={t.dose}
                  onChange={(e) => updateTier(idx, "dose", e.target.value)}
                  placeholder="VD: 1 g mỗi 8h"
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
          <p className="text-[12px] text-slate-400 mt-1.5">Chỉ 1 mức với CrCl tối thiểu = 0 nghĩa là liều cố định, không cần chỉnh theo thận.</p>
        </div>

        {/* Liều nạp — vd Vancomycin cần 25–30 mg/kg trước khi vào liều duy trì theo CrCl. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Cảnh báo / tương tác (tuỳ chọn)</label>
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
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold border"
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Chỉ định riêng theo bệnh lý (tuỳ chọn)</label>
            <button onClick={addIndication} className="text-xs font-semibold" style={{ color: "var(--c-primary-deep)" }}>
              + Thêm chỉ định
            </button>
          </div>
          <p className="text-[12px] text-slate-400 mb-2 leading-relaxed">
            Dùng khi thuốc cần liều khác cho một bệnh lý cụ thể (VD: viêm màng não cần liều cao hơn để thấm qua hàng rào
            máu não). Gõ tên bệnh lý có sẵn hoặc một tên mới — nếu tên không khớp bệnh lý nào đang có, app sẽ tự thêm
            bệnh lý đó vào danh mục khi lưu.
          </p>
          <div className="space-y-2.5">
            {indications.map((row) => {
              const trimmedName = row.diseaseName.trim()
              const matched = trimmedName ? diseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase()) : undefined
              const isNewDisease = trimmedName.length > 0 && !matched
              const suggestions = diseases.filter(
                (d) => !indications.some((r) => r.key !== row.key && r.diseaseName.trim().toLowerCase() === d.name.trim().toLowerCase()),
              )
              return (
                <div key={row.key} className="p-3 rounded-2xl border" style={{ borderColor: C.warnLine, background: C.warnSoft }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-[12px] text-slate-400 mb-1 block">Tên bệnh lý</label>
                      <input
                        value={row.diseaseName}
                        onChange={(e) => updateIndicationField(row.key, "diseaseName", e.target.value)}
                        placeholder="VD: Viêm màng não vi khuẩn"
                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                        style={fieldStyle}
                      />
                    </div>
                    <button
                      onClick={() => removeIndication(row.key)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-3"
                      style={{ background: C.dangerSoft, color: C.dangerIcon }}
                      aria-label="Xoá chỉ định"
                    >
                      {icons.x()}
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {suggestions.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => pickIndicationDisease(row.key, d.name)}
                          className="px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors"
                          style={
                            matched?.id === d.id
                              ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
                              : { background: C.surface, borderColor: C.warnLine, color: C.warn }
                          }
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {isNewDisease && (
                    <p className="text-[12px] font-semibold mb-2" style={{ color: C.warnIcon }}>
                      Bệnh lý mới — khi lưu, "{trimmedName}" sẽ được tự thêm vào danh mục bệnh lý.
                    </p>
                  )}

                  <label className="text-[12px] text-slate-400 mb-1 block">Liều chuẩn riêng cho bệnh lý này (tuỳ chọn)</label>
                  <input
                    value={row.standardDose}
                    onChange={(e) => updateIndicationField(row.key, "standardDose", e.target.value)}
                    placeholder="VD: 2 g mỗi 4h — liều cao hơn để thấm qua hàng rào máu não"
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none mb-2.5"
                    style={fieldStyle}
                  />

                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] text-slate-400">Mức liều theo CrCl riêng (tuỳ chọn — bỏ trống để dùng mức liều chung ở trên)</label>
                    <button onClick={() => addIndicationTier(row.key)} className={T.chip} style={{ color: "var(--c-primary-deep)" }}>
                      + Thêm mức
                    </button>
                  </div>
                  {row.tiers.length > 0 && (
                    <div className="space-y-2 mb-2.5">
                      {row.tiers.map((t, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border" style={{ borderColor: C.warnLine, background: C.surface }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                              {/* min-h-[3em] (issue "CrCl tối thiểu không ngay hàng"): nhãn này dài hơn "Nhãn
                        hiển thị" nên xuống 2 dòng ở cột hẹp trong khi nhãn kia chỉ 1 dòng, đẩy ô nhập
                        bên dưới tụt xuống lệch nhau. Đặt trước chiều cao ĐÚNG 2 dòng (line-height 1.5
                        ở cỡ chữ 10px) trên cả hai nhãn cùng hàng để hai ô nhập luôn ngang hàng. */}
                    <label className="text-[12px] text-slate-400 mb-1 block min-h-[3em]">CrCl tối thiểu (mL/phút)</label>
                              <input
                                value={t.min}
                                onChange={(e) => updateIndicationTier(row.key, idx, "min", normalizeDecimalInput(e.target.value))}
                                inputMode="decimal"
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            <div className="flex-[2]">
                              <label className="text-[12px] text-slate-400 mb-1 block min-h-[3em]">Nhãn hiển thị</label>
                              <input
                                value={t.label}
                                onChange={(e) => updateIndicationTier(row.key, idx, "label", e.target.value)}
                                placeholder="VD: CrCl ≥ 50"
                                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            <button
                              onClick={() => removeIndicationTier(row.key, idx)}
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-3"
                              style={{ background: C.dangerSoft, color: C.dangerIcon }}
                              aria-label="Xoá mức"
                            >
                              {icons.x()}
                            </button>
                          </div>
                          <label className="text-[12px] text-slate-400 mb-1 block">Liều</label>
                          <input
                            value={t.dose}
                            onChange={(e) => updateIndicationTier(row.key, idx, "dose", e.target.value)}
                            placeholder="VD: 2 g mỗi 4h"
                            className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                            style={fieldStyle}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="text-[12px] text-slate-400 mb-1 block">Ghi chú riêng (tuỳ chọn)</label>
                  <input
                    value={row.note}
                    onChange={(e) => updateIndicationField(row.key, "note", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={fieldStyle}
                  />
                </div>
              )
            })}
            {indications.length === 0 && (
              <p className="text-[12px] text-slate-400">Chưa có chỉ định riêng nào — bấm "+ Thêm chỉ định" nếu cần.</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <p className="text-xs font-semibold text-slate-500 mt-3 mb-1.5">Liều khi lọc máu / CRRT (tuỳ chọn)</p>
          <p className="text-[12px] text-slate-400 leading-relaxed mb-2">
            Bỏ trống mục nào thì với bệnh nhân đang dùng phương thức đó, app sẽ nói rõ là chưa có dữ liệu — không bao giờ tự suy ra từ bậc CrCl.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Chạy thận chu kỳ (IHD)</label>
              <input value={rrtIhd} onChange={(e) => setRrtIhd(e.target.value)} placeholder="VD: 500 mg sau mỗi buổi lọc" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Lọc máu liên tục (CRRT) — ghi kèm tốc độ dịch thải của khuyến cáo</label>
              <input value={rrtCrrt} onChange={(e) => setRrtCrrt(e.target.value)} placeholder="VD: 1 g mỗi 8h khi Qeff ≥ 2 L/giờ" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Lọc kéo dài chậm (SLED)</label>
              <input value={rrtSled} onChange={(e) => setRrtSled(e.target.value)} className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Lọc màng bụng (PD)</label>
              <input value={rrtPd} onChange={(e) => setRrtPd(e.target.value)} className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Ghi chú chung khi lọc máu</label>
              <textarea value={rrtNote} onChange={(e) => setRrtNote(e.target.value)} rows={2} placeholder="VD: đo nồng độ đáy trước buổi lọc thứ ba" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Nguồn của liều lọc máu</label>
              <input value={rrtSource} onChange={(e) => setRrtSource(e.target.value)} placeholder="VD: Phác đồ lọc máu khoa HSTC 2026" className={fieldClass} style={fieldStyle} />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Nguồn dữ liệu (tuỳ chọn)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="VD: Phác đồ ICU BV X 2026 / Sanford Guide" className={fieldClass} style={fieldStyle} />
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Rà soát lần cuối (YYYY-MM)</label>
          <input value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} placeholder="VD: 2026-07" className={fieldClass} style={fieldStyle} />
          <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5">
            Bỏ trống thì thẻ thuốc sẽ hiện rõ "kinh nghiệm lâm sàng tự biên soạn, chưa dẫn nguồn".
          </p>
        </div>

        <AntibioticAdvancedFields
          showMix={isInjectableRoute}
          weightBasis={weightBasis}
          setWeightBasis={setWeightBasis}
          cap={cap}
          setCap={setCap}
          compatKey={compatKey}
          setCompatKey={setCompatKey}
          mix={mix}
          setMix={setMix}
        />

        <p className="text-xs text-slate-400 leading-relaxed">
          Nội dung sửa được lưu ngay trên máy này, không đổi dữ liệu gốc trong app.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: C.line, paddingBottom: "var(--nav-pad-bottom)" }}>
        {!canSave && missingSaveReasons.length > 0 && (
          <p className="text-[12px] font-semibold text-center mb-2" style={{ color: C.warnIcon }}>
            Cần điền thêm: {missingSaveReasons.join(" · ")}
          </p>
        )}
        <button onClick={handleSave} disabled={!canSave} className="w-full py-3.5 rounded-2xl font-semibold text-sm" style={{ background: canSave ? C.primary : C.muted, color: canSave ? "var(--c-on-primary)" : "var(--c-on-bright)" }}>
          Lưu thay đổi
        </button>
      </div>
    </div>
  )
}
