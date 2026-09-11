import type { BolusDose, AntibioticMix, AntibioticWarning, DoseCap } from "../../data/types"
import { infusionCategory, InfusionCategory } from "../../data"
import { type WeightBasis } from "../../lib/bodyWeight"
import { type VialForm } from "../../lib/mixing"
import { icons } from "../../components/icons"
import { C, trim } from "../../lib/ui"
import { normalizeDecimalInput } from "./numberInput"

export const ANTIBIOTIC_ROUTE_OPTIONS: { id: string; label: string }[] = [
  { id: "iv-infusion", label: "Truyền tĩnh mạch (TTM)" },
  { id: "iv-slow", label: "Tiêm tĩnh mạch chậm (TMC)" },
  { id: "im", label: "Tiêm bắp (TB)" },
  { id: "sc", label: "Tiêm dưới da (TDD)" },
  { id: "oral", label: "Uống" },
  { id: "other", label: "Vị trí khác" },
]

export function addInfusionTitle(category: InfusionCategory): string {
  return `Thêm ${infusionCategory(category).categoryLabel}`
}

// Bản nháp của một liều nạp trong lúc nhập: mọi ô số giữ ở dạng chuỗi để gõ dở dang ("0,", "1.")
// không bị nhảy về NaN giữa chừng, rồi mới đổi sang BolusDose khi lưu.
export interface BolusDraft {
  label: string
  unit: string
  mode: "perKg" | "fixed"
  low: string
  high: string
  maxSingle: string
  over: string
  note: string
}

function emptyBolusDraft(): BolusDraft {
  return { label: "", unit: "mg", mode: "perKg", low: "", high: "", maxSingle: "", over: "", note: "" }
}

export function bolusToDraft(b: BolusDose): BolusDraft {
  const perKg = b.perKgLow != null
  return {
    label: b.label,
    unit: b.unit,
    mode: perKg ? "perKg" : "fixed",
    low: String((perKg ? b.perKgLow : b.fixedLow) ?? ""),
    high: b.perKgHigh != null || b.fixedHigh != null ? String((perKg ? b.perKgHigh : b.fixedHigh) ?? "") : "",
    maxSingle: b.maxSingle != null ? String(b.maxSingle) : "",
    over: b.over ?? "",
    note: b.note ?? "",
  }
}

// null nếu bản nháp chưa đủ dùng (thiếu tên hoặc thiếu con số liều) — mục dở dang thì bỏ qua khi
// lưu chứ không sinh ra một liều nạp rỗng nằm trong thẻ thuốc.
export function draftToBolus(d: BolusDraft): BolusDose | null {
  const label = d.label.trim()
  const low = parseFloat(d.low)
  if (!label || isNaN(low)) return null
  const high = parseFloat(d.high)
  const maxSingle = parseFloat(d.maxSingle)
  return {
    label,
    unit: d.unit.trim() || "mg",
    ...(d.mode === "perKg"
      ? { perKgLow: low, ...(isNaN(high) ? {} : { perKgHigh: high }) }
      : { fixedLow: low, ...(isNaN(high) ? {} : { fixedHigh: high }) }),
    ...(isNaN(maxSingle) ? {} : { maxSingle }),
    ...(d.over.trim() ? { over: d.over.trim() } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  }
}

// Khối sửa liều nạp/bolus dùng chung cho AddInfusionScreen, AddAntibioticScreen và
// EditAntibioticScreen — trước đây chỉ AddInfusionScreen có, khiến kháng sinh cần liều nạp (vd
// Vancomycin) không có chỗ khai báo.
export function BolusEditorField({ boluses, setBoluses }: { boluses: BolusDraft[]; setBoluses: (fn: (prev: BolusDraft[]) => BolusDraft[]) => void }) {
  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: C.line, background: C.surface }
  return (
    <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
      <div className="flex items-center justify-between mb-1.5 mt-3">
        <label className="text-xs font-semibold text-slate-500">Liều nạp / bolus (tuỳ chọn)</label>
        <button onClick={() => setBoluses((prev) => [...prev, emptyBolusDraft()])} className="text-xs font-semibold" style={{ color: "var(--c-primary-deep)" }}>
          + Thêm liều nạp
        </button>
      </div>
      <div className="space-y-2">
        {boluses.map((b, idx) => {
          const set = (patch: Partial<BolusDraft>) => setBoluses((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
          return (
            <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={b.label}
                  onChange={(e) => set({ label: e.target.value })}
                  placeholder="VD: Liều nạp trước khi vào duy trì"
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={fieldStyle}
                />
                <button
                  onClick={() => setBoluses((prev) => prev.filter((_, i) => i !== idx))}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
                  style={{ background: C.dangerSoft, color: C.dangerIcon }}
                  aria-label="Xoá liều nạp"
                >
                  {icons.x()}
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                {([
                  { v: "perKg" as const, label: "Theo cân nặng (/kg)" },
                  { v: "fixed" as const, label: "Liều cố định" },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => set({ mode: opt.v })}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      b.mode === opt.v
                        ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
                        : { background: C.surface, borderColor: C.line, color: C.textSoft }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Liều{b.mode === "perKg" ? "/kg" : ""}</label>
                  <input value={b.low} onChange={(e) => set({ low: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="1" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Đến (tuỳ chọn)</label>
                  <input value={b.high} onChange={(e) => set({ high: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="1,5" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị</label>
                  <input value={b.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="mg" className={fieldClass} style={fieldStyle} />
                </div>
              </div>
              {b.mode === "perKg" && (
                <div className="mt-2">
                  <label className="text-[12px] text-slate-400 mb-1 block">Không vượt quá 1 lần (tuỳ chọn)</label>
                  <input value={b.maxSingle} onChange={(e) => set({ maxSingle: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="VD: 100" className={fieldClass} style={fieldStyle} />
                </div>
              )}
              <div className="mt-2">
                {/* Thời gian tiêm là thứ hay bị bỏ sót và là nguyên nhân tụt huyết áp/phản ứng truyền
                    nhanh khi nạp nhanh. */}
                <label className="text-[12px] text-slate-400 mb-1 block">Cách dùng — tiêm/truyền trong bao lâu</label>
                <input value={b.over} onChange={(e) => set({ over: e.target.value })} placeholder="VD: truyền tĩnh mạch trong 60 phút" className={fieldClass} style={fieldStyle} />
              </div>
              <div className="mt-2">
                <label className="text-[12px] text-slate-400 mb-1 block">Ghi chú (tuỳ chọn)</label>
                <input value={b.note} onChange={(e) => set({ note: e.target.value })} className={fieldClass} style={fieldStyle} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Bản nháp của DoseCap (ngưỡng liều một lần dùng) lúc nhập — amount giữ dạng chuỗi giống BolusDraft
// để gõ dở dang không bị nhảy về NaN.
export interface DoseCapDraft {
  amount: string
  unit: string
  note: string
}

export function emptyDoseCapDraft(): DoseCapDraft {
  return { amount: "", unit: "mg", note: "" }
}

export function doseCapToDraft(c?: DoseCap): DoseCapDraft {
  return c ? { amount: String(c.amount), unit: c.unit, note: c.note ?? "" } : emptyDoseCapDraft()
}

// undefined nếu chưa gõ số lượng — ngưỡng rỗng thì không lưu.
export function draftToDoseCap(d: DoseCapDraft): DoseCap | undefined {
  const amount = parseFloat(d.amount)
  if (isNaN(amount)) return undefined
  return { amount, unit: d.unit.trim() || "mg", ...(d.note.trim() ? { note: d.note.trim() } : {}) }
}

// Bản nháp của AntibioticMix (công thức pha/hoàn nguyên) — mọi ô số giữ dạng chuỗi, `diluents`/
// `avoidDiluents` giữ dạng một chuỗi cách nhau bằng dấu CHẤM PHẨY (;) để gõ tự nhiên rồi mới tách
// mảng lúc lưu. KHÔNG dùng dấu phẩy: số thập phân tiếng Việt viết bằng dấu phẩy (vd "NaCl 0,9%"),
// tách theo "," sẽ bổ đôi "0,9%" thành "0" và "9%" — đúng lỗi đã xảy ra khi field này dùng dấu phẩy.
export interface MixDraft {
  vialAmount: string
  vialUnit: string
  vialLabel: string
  vialForm: VialForm | ""
  vialVolumeMl: string
  reconstituteMl: string
  displacementMl: string
  defaultVolumeMl: string
  diluents: string
  avoidDiluents: string
  diluentWarning: string
  concUnit: string
  maxConc: string
  infuseNote: string
}

export function emptyMixDraft(): MixDraft {
  return {
    vialAmount: "",
    vialUnit: "mg",
    vialLabel: "",
    vialForm: "",
    vialVolumeMl: "",
    reconstituteMl: "",
    displacementMl: "",
    defaultVolumeMl: "",
    diluents: "",
    avoidDiluents: "",
    diluentWarning: "",
    concUnit: "",
    maxConc: "",
    infuseNote: "",
  }
}

export function mixToDraft(m?: AntibioticMix): MixDraft {
  if (!m) return emptyMixDraft()
  return {
    vialAmount: m.vialAmount != null ? String(m.vialAmount) : "",
    vialUnit: m.vialUnit ?? "mg",
    vialLabel: m.vialLabel ?? "",
    vialForm: m.vialForm ?? "",
    vialVolumeMl: m.vialVolumeMl != null ? String(m.vialVolumeMl) : "",
    reconstituteMl: m.reconstituteMl != null ? String(m.reconstituteMl) : "",
    displacementMl: m.displacementMl != null ? String(m.displacementMl) : "",
    defaultVolumeMl: m.defaultVolumeMl != null ? String(m.defaultVolumeMl) : "",
    diluents: (m.diluents ?? []).join("; "),
    avoidDiluents: (m.avoidDiluents ?? []).join("; "),
    diluentWarning: m.diluentWarning ?? "",
    concUnit: m.concUnit ?? "",
    maxConc: m.maxConc != null ? String(m.maxConc) : "",
    infuseNote: m.infuseNote ?? "",
  }
}

// undefined nếu mọi ô đều rỗng — không lưu một khối `mix` toàn undefined.
function draftToMix(d: MixDraft): AntibioticMix | undefined {
  const vialAmount = parseFloat(d.vialAmount)
  const vialVolumeMl = parseFloat(d.vialVolumeMl)
  const reconstituteMl = parseFloat(d.reconstituteMl)
  const displacementMl = parseFloat(d.displacementMl)
  const defaultVolumeMl = parseFloat(d.defaultVolumeMl)
  const maxConc = parseFloat(d.maxConc)
  const diluents = d.diluents.split(";").map((s) => s.trim()).filter(Boolean)
  const avoidDiluents = d.avoidDiluents.split(";").map((s) => s.trim()).filter(Boolean)
  const hasAny =
    !isNaN(vialAmount) ||
    d.vialForm !== "" ||
    !isNaN(vialVolumeMl) ||
    !isNaN(reconstituteMl) ||
    !isNaN(displacementMl) ||
    !isNaN(defaultVolumeMl) ||
    diluents.length > 0 ||
    avoidDiluents.length > 0 ||
    d.diluentWarning.trim() !== "" ||
    d.concUnit.trim() !== "" ||
    !isNaN(maxConc) ||
    d.infuseNote.trim() !== ""
  if (!hasAny) return undefined
  return {
    ...(isNaN(vialAmount) ? {} : { vialAmount }),
    ...(d.vialUnit.trim() ? { vialUnit: d.vialUnit.trim() } : {}),
    ...(d.vialLabel.trim() ? { vialLabel: d.vialLabel.trim() } : {}),
    ...(d.vialForm ? { vialForm: d.vialForm } : {}),
    ...(isNaN(vialVolumeMl) ? {} : { vialVolumeMl }),
    ...(isNaN(reconstituteMl) ? {} : { reconstituteMl }),
    ...(isNaN(displacementMl) ? {} : { displacementMl }),
    ...(isNaN(defaultVolumeMl) ? {} : { defaultVolumeMl }),
    ...(diluents.length > 0 ? { diluents } : {}),
    ...(avoidDiluents.length > 0 ? { avoidDiluents } : {}),
    ...(d.diluentWarning.trim() ? { diluentWarning: d.diluentWarning.trim() } : {}),
    ...(d.concUnit.trim() ? { concUnit: d.concUnit.trim() } : {}),
    ...(isNaN(maxConc) ? {} : { maxConc }),
    ...(d.infuseNote.trim() ? { infuseNote: d.infuseNote.trim() } : {}),
  }
}

// ─── Nhiều quy cách đóng gói dựng sẵn cho MỘT thuốc ───────────────────────────
// `Antibiotic.mix` là một MẢNG: cùng một kháng sinh trên thị trường có nhiều hàm lượng/quy cách ống
// khác nhau (Amikacin 1000 mg/4 mL và 500 mg/2 mL là hai mặt hàng riêng), và khoa nào có mặt hàng nào
// thì không dữ liệu dựng sẵn nào biết trước được. Khai sẵn cả hai để app tính ra liều minh hoạ ngay
// khi vừa có CrCl, người dùng chỉ cần bấm chọn — chỉ khi không quy cách nào khớp hàng thật ở khoa
// mới phải sửa tay trong "Bảng pha thuốc".
//
// Trình soạn thảo kháng sinh tự nhập (Thêm/Sửa) vẫn chỉ sửa MỘT quy cách: một mục tự nhập là một
// mặt hàng cụ thể người dùng đang cầm trên tay, không phải một danh mục thị trường. Hai hàm dưới đây
// bọc/mở mảng để phần soạn thảo không phải biết tới chuyện đó.
export function draftToMixList(d: MixDraft): AntibioticMix[] | undefined {
  const one = draftToMix(d)
  return one ? [one] : undefined
}

// Nhãn ngắn trên chip chọn quy cách, vd "1000 mg/4 mL" (ống dung dịch có thể tích) hay "1 g" (lọ bột
// chưa hoàn nguyên thì chưa có thể tích để nói). Đây đúng là cách người dùng gọi tên mặt hàng khi
// đứng trước tủ thuốc, nên không thêm chữ nào khác vào.
export function mixOptionLabel(m: AntibioticMix): string {
  const amount = m.vialAmount != null ? `${trim(m.vialAmount)} ${m.vialUnit ?? "mg"}` : "Chưa rõ hàm lượng"
  const withVolume = m.vialVolumeMl != null ? `${amount}/${trim(m.vialVolumeMl)} mL` : amount
  // Không nêu chế phẩm (lọ/ống/chai) thì hai quy cách cùng hàm lượng nhưng khác dạng đóng gói (vd
  // Amikacin 500 mg bột 1 lọ và 500 mg/2 mL dung dịch 1 ống) hiện ra giống hệt nhau trên chip — người
  // dùng không cách nào phân biệt trước khi bấm vào xem chi tiết.
  return `${withVolume} · ${m.vialLabel ?? "lọ"}`
}

// ─── Mức độ cảnh báo của kháng sinh ──────────────────────────────────────────
// Lấy THẲNG từ kiểu dữ liệu (AntibioticWarning) thay vì chép lại một union thứ hai trong màn soạn
// thảo: trước đây hai nơi khai riêng nên khi dữ liệu thêm mức "thấp", ba bộ chip chọn mức độ vẫn chỉ
// có hai lựa chọn — một cảnh báo mức "thấp" mở ra sửa sẽ hiện KHÔNG chip nào sáng, và người dùng
// không có cách nào chọn lại mức đó.
export type WarnSeverity = AntibioticWarning["severity"]

// Thứ tự nhẹ → nặng, đúng chiều đọc của một thang mức độ.
export const WARN_SEVERITIES: readonly WarnSeverity[] = ["thấp", "trung bình", "cao"] as const

// Màu nền chip khi mức đó đang được chọn. Ba bậc phải TÁCH HẲN nhau về màu — xem ghi chú "cao và
// trung bình chỉ khác nhau ở một chấm 1.5px" ở phần hiển thị cảnh báo.
export function warnSeverityColor(s: WarnSeverity): string {
  if (s === "cao") return C.dangerIcon
  if (s === "trung bình") return C.warnIcon
  return C.muted
}

// Nhãn phải nói THẲNG ngưỡng và tên nhóm thuốc, không chỉ tên viết tắt: người nhập là bác sĩ đang
// gõ một thuốc mg/kg lúc trực, câu hỏi trong đầu họ là "thuốc này khi bệnh nhân béo phì thì tính
// theo cân nào" chứ không phải "AdjBW là gì". Ba lựa chọn giữ dạng chip chọn-một (không phải công
// tắc bật/tắt) vì "ideal" là trạng thái thứ ba dùng thật (nhũ dịch lipid) — công tắc boolean sẽ
// nuốt mất nó, và một cờ boolean thứ hai song song trường này là hai nguồn sự thật cho cùng một
// quyết định liều (xem ghi chú ở lib/bodyWeight.ts).
const WEIGHT_BASIS_OPTIONS: { id: WeightBasis | ""; label: string }[] = [
  { id: "", label: "Cân nặng thực (ABW)" },
  { id: "ideal", label: "Luôn dùng IBW" },
  { id: "adjusted", label: "AdjBW khi ABW ≥ 120% IBW" },
]

const VIAL_FORM_OPTIONS: { id: VialForm | ""; label: string }[] = [
  { id: "", label: "Chưa chọn" },
  { id: "powder", label: "Bột — cần hoàn nguyên" },
  { id: "solution", label: "Ống dung dịch" },
  { id: "fixed", label: "Chai pha sẵn cố định" },
]

// Nhóm 4 trường "nâng cao" của kháng sinh mà trước đây chỉ có trong dữ liệu dựng sẵn, chưa có ô
// nhập trong UI: cân nặng dùng tính liều, ngưỡng liều một lần dùng, khoá tra bảng tương hợp, và công
// thức pha/hoàn nguyên. Dùng chung cho cả AddAntibioticScreen lẫn EditAntibioticScreen.
// `showMix`: chỉ hiện khối công thức pha khi đường dùng là tiêm/truyền — thuốc uống không có gì để pha.
export function AntibioticAdvancedFields({
  showMix,
  weightBasis,
  setWeightBasis,
  cap,
  setCap,
  compatKey,
  setCompatKey,
  mix,
  setMix,
}: {
  showMix: boolean
  weightBasis: WeightBasis | ""
  setWeightBasis: (v: WeightBasis | "") => void
  cap: DoseCapDraft
  setCap: (fn: (prev: DoseCapDraft) => DoseCapDraft) => void
  compatKey: string
  setCompatKey: (v: string) => void
  mix: MixDraft
  setMix: (fn: (prev: MixDraft) => MixDraft) => void
}) {
  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: C.line, background: C.surface }
  const smallFieldClass = "w-full px-3 py-2 rounded-xl text-sm border outline-none"
  const chipStyle = (active: boolean) =>
    active
      ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }
  function updateMix(field: keyof MixDraft, value: string) {
    setMix((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
      <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Cân nặng dùng để tính liều (tuỳ chọn)</label>
      <div className="flex flex-wrap gap-2">
        {WEIGHT_BASIS_OPTIONS.map((o) => (
          <button key={o.id || "actual"} onClick={() => setWeightBasis(o.id)} className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors" style={chipStyle(weightBasis === o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5">
        Chỉ đổi khi thuốc có khuyến cáo rõ ràng. Cân nặng thực dưới 120% IBW thì mọi thuốc đều tính theo cân nặng thực;
        từ 120% IBW trở lên, aminoglycosid (amikacin, gentamicin…) chuyển sang AdjBW, còn vancomycin vẫn giữ cân nặng thực
        — Chợ Rẫy 2024.
      </p>

      <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Ngưỡng liều một lần dùng (tuỳ chọn)</label>
      <div className="flex gap-2">
        <input
          value={cap.amount}
          onChange={(e) => setCap((prev) => ({ ...prev, amount: normalizeDecimalInput(e.target.value) }))}
          inputMode="decimal"
          placeholder="VD: 2000"
          className={`${smallFieldClass} flex-1`}
          style={fieldStyle}
        />
        <input value={cap.unit} onChange={(e) => setCap((prev) => ({ ...prev, unit: e.target.value }))} placeholder="mg" className={`${smallFieldClass} w-20`} style={fieldStyle} />
      </div>
      {cap.amount.trim() && (
        <input
          value={cap.note}
          onChange={(e) => setCap((prev) => ({ ...prev, note: e.target.value }))}
          placeholder="Ngưỡng này lấy từ đâu — VD: khuyến cáo XYZ"
          className={`${fieldClass} mt-2`}
          style={fieldStyle}
        />
      )}
      <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5">
        Chặn liều tính theo mg/kg khi nhân với cân nặng lớn ra một con số vượt ngưỡng an toàn.
      </p>

      <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Khoá tra bảng tương hợp / tương tác (tuỳ chọn)</label>
      <input
        value={compatKey}
        onChange={(e) => setCompatKey(e.target.value)}
        placeholder="VD: vancomycin — khớp khoá trong bảng tương hợp"
        className={fieldClass}
        style={fieldStyle}
      />

      {showMix && (
        <>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Công thức pha / hoàn nguyên (tuỳ chọn)</label>
          <div className="p-3 rounded-2xl border space-y-2.5" style={{ borderColor: C.line }}>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[12px] text-slate-400 mb-1 block">Hàm lượng / lọ</label>
                <input value={mix.vialAmount} onChange={(e) => updateMix("vialAmount", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 1000" className={smallFieldClass} style={fieldStyle} />
              </div>
              <div className="w-20">
                <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị</label>
                <input value={mix.vialUnit} onChange={(e) => updateMix("vialUnit", e.target.value)} placeholder="mg" className={smallFieldClass} style={fieldStyle} />
              </div>
              <div className="w-20">
                <label className="text-[12px] text-slate-400 mb-1 block">Gọi là</label>
                <input value={mix.vialLabel} onChange={(e) => updateMix("vialLabel", e.target.value)} placeholder="lọ" className={smallFieldClass} style={fieldStyle} />
              </div>
            </div>

            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Dạng đóng gói</label>
              <div className="flex flex-wrap gap-2">
                {VIAL_FORM_OPTIONS.map((o) => (
                  <button key={o.id || "none"} onClick={() => updateMix("vialForm", o.id)} className="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors" style={chipStyle(mix.vialForm === o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {mix.vialForm === "powder" && (
              <div className="flex gap-2 fade-in">
                <div className="flex-1">
                  <label className="text-[12px] text-slate-400 mb-1 block">Thể tích hoàn nguyên (mL)</label>
                  <input value={mix.reconstituteMl} onChange={(e) => updateMix("reconstituteMl", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 20" className={smallFieldClass} style={fieldStyle} />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] text-slate-400 mb-1 block">Thể tích bột chiếm chỗ (mL)</label>
                  <input value={mix.displacementMl} onChange={(e) => updateMix("displacementMl", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 0,7" className={smallFieldClass} style={fieldStyle} />
                </div>
              </div>
            )}
            {(mix.vialForm === "solution" || mix.vialForm === "fixed") && (
              <div className="fade-in">
                <label className="text-[12px] text-slate-400 mb-1 block">Thể tích dung dịch trong ống/chai (mL)</label>
                <input value={mix.vialVolumeMl} onChange={(e) => updateMix("vialVolumeMl", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 150" className={smallFieldClass} style={fieldStyle} />
              </div>
            )}
            {(mix.vialForm === "powder" || mix.vialForm === "solution") && (
              <div className="fade-in">
                <label className="text-[12px] text-slate-400 mb-1 block">Thể tích pha loãng mặc định (mL)</label>
                <input
                  value={mix.defaultVolumeMl}
                  onChange={(e) => updateMix("defaultVolumeMl", normalizeDecimalInput(e.target.value))}
                  inputMode="decimal"
                  placeholder="VD: 200"
                  className={smallFieldClass}
                  style={fieldStyle}
                />
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[12px] text-slate-400 mb-1 block">Đơn vị nồng độ</label>
                <input value={mix.concUnit} onChange={(e) => updateMix("concUnit", e.target.value)} placeholder="mg/mL" className={smallFieldClass} style={fieldStyle} />
              </div>
              <div className="flex-1">
                <label className="text-[12px] text-slate-400 mb-1 block">Ngưỡng trên nồng độ</label>
                <input value={mix.maxConc} onChange={(e) => updateMix("maxConc", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 5" className={smallFieldClass} style={fieldStyle} />
              </div>
            </div>

            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Dung môi được phép (cách nhau bằng dấu chấm phẩy ;)</label>
              <input value={mix.diluents} onChange={(e) => updateMix("diluents", e.target.value)} placeholder="VD: NaCl 0,9%; Glucose 5%" className={smallFieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Dung môi KHÔNG được dùng (cách nhau bằng dấu chấm phẩy ;)</label>
              <input value={mix.avoidDiluents} onChange={(e) => updateMix("avoidDiluents", e.target.value)} placeholder="VD: Glucose 5%" className={smallFieldClass} style={fieldStyle} />
            </div>
            {mix.avoidDiluents.trim() && (
              <div>
                <label className="text-[12px] text-slate-400 mb-1 block">Lý do tránh dung môi trên</label>
                <input value={mix.diluentWarning} onChange={(e) => updateMix("diluentWarning", e.target.value)} placeholder="VD: gây tủa" className={smallFieldClass} style={fieldStyle} />
              </div>
            )}
            <div>
              <label className="text-[12px] text-slate-400 mb-1 block">Thời gian/tốc độ truyền khuyến cáo</label>
              <textarea value={mix.infuseNote} onChange={(e) => updateMix("infuseNote", e.target.value)} rows={2} placeholder="VD: truyền ≥60 phút" className={smallFieldClass} style={fieldStyle} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
