import { useState } from "react"
import type { BolusDose, DoseTier, Antibiotic, DiseaseEntry, IndicationDose } from "../../data/types"
import { type WeightBasis } from "../../lib/bodyWeight"
import { icons } from "../../components/icons"
import { C } from "../../lib/ui"
import { WarnSeverity, BolusDraft, DoseCapDraft, emptyDoseCapDraft, MixDraft, emptyMixDraft, ANTIBIOTIC_ROUTE_OPTIONS, draftToBolus, draftToDoseCap, draftToMixList, BolusEditorField, WARN_SEVERITIES, warnSeverityColor, AntibioticAdvancedFields } from "./antibioticDrafts"

export function AddAntibioticScreen({
  diseases,
  onSave,
  onBack,
}: {
  diseases: DiseaseEntry[]
  onSave: (a: Antibiotic) => void
  onBack: () => void
}) {
  const [name, setName] = useState("")
  const [routeId, setRouteId] = useState<string>("iv-infusion")
  const [routeOther, setRouteOther] = useState("")
  const [diseaseIds, setDiseaseIds] = useState<string[]>([])
  const [doseMode, setDoseMode] = useState<"fixed" | "crcl3" | "crcl4">("fixed")
  const [fixedDose, setFixedDose] = useState("")
  // Mức chung cho cả 2 chế độ CrCl (3 mức / 4 mức)
  const [tier50, setTier50] = useState("")
  const [tierBelow10, setTierBelow10] = useState("")
  // Riêng cho 3 mức: >50, 10–49, <10
  const [tier1049, setTier1049] = useState("")
  // Riêng cho 4 mức: >50, 31–50, 10–30, <10
  const [tier3150, setTier3150] = useState("")
  const [tier1030, setTier1030] = useState("")
  const [preparation, setPreparation] = useState("")
  const [note, setNote] = useState("")
  const [warningText, setWarningText] = useState("")
  const [warningSeverity, setWarningSeverity] = useState<WarnSeverity>("trung bình")
  const [source, setSource] = useState("")
  const [reviewedOn, setReviewedOn] = useState("")
  // Liều nạp — vd Vancomycin cần liều nạp trước khi vào liều duy trì theo CrCl. Trước đây chỉ màn
  // Sửa có mục này, thêm nhanh kháng sinh mới hoàn toàn không khai báo được.
  const [boluses, setBoluses] = useState<BolusDraft[]>([])
  const [weightBasis, setWeightBasis] = useState<WeightBasis | "">("")
  const [cap, setCap] = useState<DoseCapDraft>(emptyDoseCapDraft())
  const [compatKey, setCompatKey] = useState("")
  const [mix, setMix] = useState<MixDraft>(emptyMixDraft())

  // "Cách dùng / Pha thuốc" có ích cho CẢ BỐN đường tiêm/truyền (TTM/TMC/IM/SC) — không chỉ truyền
  // tĩnh mạch. Trước đây chỉ hiện cho "iv-infusion" nên tiêm tĩnh mạch chậm/tiêm bắp/tiêm dưới da
  // không có chỗ ghi cách pha, dù các đường đó cũng cần hoàn nguyên/pha loãng như truyền tĩnh mạch.
  const isInjectableRoute = routeId === "iv-infusion" || routeId === "iv-slow" || routeId === "im" || routeId === "sc"
  const isOtherRoute = routeId === "other"
  const finalRoute = isOtherRoute ? routeOther.trim() : ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.id === routeId)?.label ?? ""

  const hasCrcl3Dose = tier50.trim() || tier1049.trim() || tierBelow10.trim()
  const hasCrcl4Dose = tier50.trim() || tier3150.trim() || tier1030.trim() || tierBelow10.trim()
  const doseValid =
    doseMode === "fixed" ? fixedDose.trim().length > 0 : doseMode === "crcl3" ? Boolean(hasCrcl3Dose) : Boolean(hasCrcl4Dose)
  const canSave = name.trim().length > 0 && finalRoute.length > 0 && doseValid
  // Nút Lưu tắt màu xám khi !canSave nhưng trước đây không nói lý do — người nhập điền tên+đường
  // dùng xong quên điền liều (rất dễ khi form dài, chia nhiều khối) thì thấy nút xám mà không biết
  // vì sao. Liệt kê đúng phần còn thiếu, không đoán chung chung "kiểm tra lại form".
  const missingSaveReasons: string[] = []
  if (!name.trim()) missingSaveReasons.push("Tên hoạt chất")
  if (!finalRoute) missingSaveReasons.push(isOtherRoute ? "Đường dùng (mô tả)" : "Đường dùng")
  if (!doseValid) missingSaveReasons.push("Liều theo CrCl (ít nhất một mức)")

  function toggleDisease(id: string) {
    setDiseaseIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  function handleSave() {
    if (!canSave) return
    const tiers: DoseTier[] =
      doseMode === "fixed"
        ? [{ min: 0, label: "Mọi mức CrCl", dose: fixedDose.trim() }]
        : doseMode === "crcl3"
          ? [
              ...(tier50.trim() ? [{ min: 50, label: "CrCl ≥ 50", dose: tier50.trim() }] : []),
              ...(tier1049.trim() ? [{ min: 10, label: "CrCl 10–49", dose: tier1049.trim() }] : []),
              ...(tierBelow10.trim() ? [{ min: 0, label: "CrCl < 10", dose: tierBelow10.trim() }] : []),
            ]
          : [
              ...(tier50.trim() ? [{ min: 50, label: "CrCl ≥ 50", dose: tier50.trim() }] : []),
              ...(tier3150.trim() ? [{ min: 31, label: "CrCl 31–50", dose: tier3150.trim() }] : []),
              ...(tier1030.trim() ? [{ min: 10, label: "CrCl 10–30", dose: tier1030.trim() }] : []),
              ...(tierBelow10.trim() ? [{ min: 0, label: "CrCl < 10", dose: tierBelow10.trim() }] : []),
            ]

    // Bệnh lý áp dụng: gắn `indications` theo từng bệnh lý đã chọn (dùng chung `tiers` ở trên) —
    // để AntibioticsScreen nhận diện được thuốc này khi người dùng chọn đúng bệnh lý đó ở Bước 2,
    // và AntibioticDoseCard hiển thị đúng nhãn "Chỉ định: ..." — đồng bộ với cách hiển thị chung.
    const indications: IndicationDose[] | undefined =
      diseaseIds.length > 0
        ? diseaseIds.map((diseaseId) => ({
            diseaseId,
            tiers,
            standardDose: doseMode === "fixed" ? fixedDose.trim() : undefined,
          }))
        : undefined

    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    const newDrug: Antibiotic = {
      id: `custom-abx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      route: finalRoute,
      preparation: isInjectableRoute && preparation.trim() ? preparation.trim() : undefined,
      note: note.trim() || undefined,
      tiers,
      warnings: warningText.trim() ? [{ text: warningText.trim(), severity: warningSeverity }] : undefined,
      indications,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      doseWeightBasis: weightBasis || undefined,
      maxSingleDose: draftToDoseCap(cap),
      compatKey: compatKey.trim() || undefined,
      mix: isInjectableRoute ? draftToMixList(mix) : undefined,
      isCustom: true,
    }
    onSave(newDrug)
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
        <span className="text-sm font-semibold text-slate-900">Thêm kháng sinh tự nhập</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên hoạt chất</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Linezolid" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <div className="flex flex-wrap gap-2">
            {ANTIBIOTIC_ROUTE_OPTIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRouteId(r.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={chipStyle(routeId === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {isOtherRoute && (
            <input
              value={routeOther}
              onChange={(e) => setRouteOther(e.target.value)}
              placeholder="Ghi rõ đường dùng, VD: Tiêm trong khớp, nhỏ mắt..."
              className={`${fieldClass} mt-2.5`}
              style={fieldStyle}
            />
          )}
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
          <p className="text-[12px] text-slate-400 mt-1.5">Không chọn = thuốc dùng chung, không gắn với bệnh lý cụ thể nào.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách chỉnh liều</label>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {(
              [
                { id: "fixed" as const, label: "Liều cố định" },
                { id: "crcl3" as const, label: "Theo CrCl (3 mức)" },
                { id: "crcl4" as const, label: "Theo CrCl (4 mức)" },
              ]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setDoseMode(m.id)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold border min-w-[30%]"
                style={chipStyle(doseMode === m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {doseMode === "fixed" && (
            <input value={fixedDose} onChange={(e) => setFixedDose(e.target.value)} placeholder="VD: 600 mg mỗi 12h — không cần chỉnh liều thận" className={fieldClass} style={fieldStyle} />
          )}
          {doseMode === "crcl3" && (
            <div className="space-y-2">
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl ≥ 50</label>
                <input value={tier50} onChange={(e) => setTier50(e.target.value)} placeholder="VD: 1 g mỗi 8h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl 10–49</label>
                <input value={tier1049} onChange={(e) => setTier1049(e.target.value)} placeholder="VD: 1 g mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl &lt; 10</label>
                <input value={tierBelow10} onChange={(e) => setTierBelow10(e.target.value)} placeholder="VD: 500 mg mỗi 24h" className={fieldClass} style={fieldStyle} />
              </div>
              <p className="text-[12px] text-slate-400">Có thể bỏ trống mức không áp dụng — chỉ cần điền ít nhất một mức.</p>
            </div>
          )}
          {doseMode === "crcl4" && (
            <div className="space-y-2">
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl &gt; 50</label>
                <input value={tier50} onChange={(e) => setTier50(e.target.value)} placeholder="VD: 1 g mỗi 8h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl 31–50</label>
                <input value={tier3150} onChange={(e) => setTier3150(e.target.value)} placeholder="VD: 1 g mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl 10–30</label>
                <input value={tier1030} onChange={(e) => setTier1030(e.target.value)} placeholder="VD: 500 mg mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">CrCl &lt; 10</label>
                <input value={tierBelow10} onChange={(e) => setTierBelow10(e.target.value)} placeholder="VD: 500 mg mỗi 24h" className={fieldClass} style={fieldStyle} />
              </div>
              <p className="text-[12px] text-slate-400">Có thể bỏ trống mức không áp dụng — chỉ cần điền ít nhất một mức.</p>
            </div>
          )}
        </div>

        {isInjectableRoute && (
          <div className="fade-in">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách dùng / Pha thuốc (tuỳ chọn)</label>
            <textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} placeholder="VD: Pha với Natri Clorid 0,9%, truyền trong 30–60 phút" rows={3} className={fieldClass} style={fieldStyle} />
          </div>
        )}

        {/* Liều nạp — vd Vancomycin cần liều nạp trước khi vào liều duy trì theo CrCl. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Theo dõi nồng độ đáy" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cảnh báo / tương tác (tuỳ chọn)</label>
          <input value={warningText} onChange={(e) => setWarningText(e.target.value)} placeholder="VD: Thận trọng khi phối hợp với..." className={`${fieldClass} mb-2`} style={fieldStyle} />
          {warningText.trim() && (
            <div className="flex gap-2">
              {WARN_SEVERITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setWarningSeverity(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                  style={
                    warningSeverity === s
                      ? { background: warnSeverityColor(s), borderColor: "transparent", color: "var(--c-on-bright)" }
                      : { background: C.surface, borderColor: C.line, color: C.textSoft }
                  }
                >
                  Mức độ: {s}
                </button>
              ))}
            </div>
          )}
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
          Mục tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app.
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
          Lưu kháng sinh
        </button>
      </div>
    </div>
  )
}
