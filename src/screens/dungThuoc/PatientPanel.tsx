import { useState, useRef, useEffect, useMemo, useId } from "react"
import { resolveDosingWeight } from "../../lib/bodyWeight"
import { CRCL_RELIABILITY_TEXT, RRT_LABELS, RRT_SHORT, SCR_UMOL_PER_MGDL, crclNullReason, crclReliability, isPatientStale, isRenalStatusStale, needsCrrtFlow, patientHasData, type RrtMode } from "../../lib/patient"
import { checkAge, checkHeight, checkScr, checkWeight } from "../../lib/doseSafety"
import { tickHaptic } from "../../lib/haptics"
import { icons } from "../../components/icons"
import { C, CHIP, FIELD, FIELD_STYLE, NUM, NUM_DOSE, R, T } from "../../lib/ui"
import { useDosing } from "./context"
import { parseStrictNumber, hasInvalidNumericInput, normalizeDecimalInput } from "./numberInput"
import { useDelayedWarning } from "./antibioticMixingHelpers"
import { useCountUp, InputWarning, Disclosure, SectionLabel, CONFIRM_PATIENT_RESET_MS } from "./sharedUi"

function PatientField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${T.label} h-4 flex items-end mb-1.5`} style={{ color: C.textSoft }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function PatientPanel({ open, onToggle, renalRelevantByDefault = false }: { open: boolean; onToggle: () => void; renalRelevantByDefault?: boolean }) {
  const {
    patient,
    setPatientField,
    resetPatient,
    running,
    abwKg,
    heightCm,
    ageYears,
    crcl,
    crclUsable,
    crclInputImplausible,
    patientChangedElsewhereAt,
    dismissPatientChangedElsewhere,
  } = useDosing()
  const hasData = patientHasData(patient)
  // Hai nút gấp/mở khung (nút chữ chứa tóm tắt sinh hiệu + nút chevron) thiếu `aria-expanded` — trình
  // đọc màn hình không biết khung đang mở hay đóng, và tên khả truy cập của nút chữ là NGUYÊN chuỗi
  // "80 kg · 170 cm · Nữ · 72 tuổi · CrCl 36" không có ngữ nghĩa toggle (/impeccable critique
  // 2026-09-04, P2). Cùng khuôn với Disclosure: aria-expanded + aria-controls trỏ vào thân khung.
  const panelBodyId = useId()
  // "Bệnh nhân mới" xoá SẠCH thông số lẫn bảng đang dùng — hành động phá huỷ nhất màn hình, nên
  // bắt xác nhận hai bước như mọi nút xoá khác thay vì thực thi ngay từ một chạm.
  const [confirmReset, setConfirmReset] = useState(false)
  const confirmResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // `aria-label` của nút chỉ nói "tự huỷ sau 20 giây" MỘT LẦN lúc chạm đầu tiên — trình đọc màn hình
  // không có cách nào biết cửa sổ hoàn tác sắp đóng ngoài tự hỏi lại đúng control đó (/impeccable
  // critique 2026-09-01 lượt 2, P3). Vùng `aria-live` rỗng lúc nghỉ, đổi nội dung ở mốc còn 5 giây —
  // trình đọc màn hình tự động đọc lại NGAY LÚC nội dung đổi, không cần người dùng chủ động dò.
  const [confirmResetNearExpiry, setConfirmResetNearExpiry] = useState(false)
  const confirmResetNearExpiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current)
      if (confirmResetNearExpiryTimer.current) clearTimeout(confirmResetNearExpiryTimer.current)
    },
    [],
  )

  const weightWarn = checkWeight(abwKg)
  const heightWarn = checkHeight(heightCm)
  const ageWarn = checkAge(ageYears)
  const scrWarn = checkScr(parseStrictNumber(patient.scr), patient.scrUnit)
  // crclInputImplausible (dùng bên dưới để tô số CrCl) đến từ DosingContext — tính chung một lần
  // với AntibioticDoseCard, xem comment tại DosingContextValue.crclInputImplausible.
  // crclReason phân biệt "chưa nhập đủ" (missing) với "đã nhập đủ nhưng bị Cockcroft-Gault từ chối"
  // (rejected) khi crcl == null — dùng chung crclNullReason với AntibioticDoseCard (lib/patient.ts)
  // để hai nơi không còn thể trôi lệch nhau như đã xảy ra hai lần (/impeccable critique 2026-08-21,
  // P1: dòng "dựa trên số liệu bất thường, kiểm tra lại trước khi dùng bậc liều này" trước đây hiện
  // sai ngay cả khi crcl == null — không hề có "bậc liều" nào đang dùng con số đó cả).
  const crclReason = crclUsable && crcl == null ? crclNullReason(ageYears, abwKg, parseStrictNumber(patient.scr)) : null

  // "70abc" hay "1.2.9" vẫn còn NGUYÊN trong ô nhập (không tự sửa), nhưng abwKg/heightCm/ageYears
  // ở trên giờ trả về null cho các chuỗi này (parseStrictNumber) — nói rõ ra đây, kẻo trông như ô
  // trống bình thường trong khi thực ra người dùng đã gõ/dán một thứ gì đó vào.
  const weightInvalid = hasInvalidNumericInput(patient.weight)
  const heightInvalid = hasInvalidNumericInput(patient.height)
  const ageInvalid = hasInvalidNumericInput(patient.age)
  const scrInvalid = hasInvalidNumericInput(patient.scr)

  // Cảnh báo thông số bệnh nhân (ký tự lạ, số bất thường) chỉ hiện SAU khi người dùng ngừng gõ —
  // xem useDelayedWarning. `key` gộp cả nội dung ô nhập lẫn mức cảnh báo, null nghĩa là không có gì
  // để cảnh báo (ẩn ngay, không trễ).
  const showWeightWarn = useDelayedWarning(
    weightInvalid ? `winv:${patient.weight}` : weightWarn && weightWarn.severity !== "ok" ? `w:${weightWarn.severity}:${patient.weight}` : null,
  )
  const showHeightWarn = useDelayedWarning(
    heightInvalid ? `hinv:${patient.height}` : heightWarn && heightWarn.severity !== "ok" ? `h:${heightWarn.severity}:${patient.height}` : null,
  )
  const showAgeWarn = useDelayedWarning(
    ageInvalid ? `ainv:${patient.age}` : ageWarn && ageWarn.severity !== "ok" ? `a:${ageWarn.severity}:${patient.age}` : null,
  )
  const showScrWarn = useDelayedWarning(
    scrInvalid ? `sinv:${patient.scr}` : scrWarn && scrWarn.severity !== "ok" ? `s:${scrWarn.severity}:${patient.scr}:${patient.scrUnit}` : null,
  )

  // Cân nặng dùng để ước tính CrCl: ABW nếu bình thường/thiếu cân, AdjBW nếu béo phì (ABW > 130% IBW).
  const crclWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, "adjusted"),
    [abwKg, heightCm, patient.sex],
  )

  function switchScrUnit(next: "mgdl" | "umol") {
    if (next === patient.scrUnit) return
    const s = parseStrictNumber(patient.scr)
    if (s != null) {
      const converted = next === "umol" ? s * SCR_UMOL_PER_MGDL : s / SCR_UMOL_PER_MGDL
      setPatientField("scr", (Math.round(converted * 100) / 100).toString())
    }
    setPatientField("scrUnit", next)
  }

  const crclFinalText = crclUsable && crcl != null ? String(crcl) : "—"
  const crclDisplay = useCountUp(crclUsable ? crcl : null, 0, crclFinalText)

  const summary = [
    abwKg != null ? `${abwKg} kg` : null,
    heightCm != null ? `${heightCm} cm` : null,
    patient.sex === "male" ? "Nam" : "Nữ",
    ageYears != null ? `${ageYears} tuổi` : null,
    patient.rrt !== "none" ? RRT_LABELS[patient.rrt] : null,
  ]
    .filter(Boolean)
    .join(" · ")
  // CrCl tách khỏi summary và không bao giờ `truncate` — đây là con số cả tab kháng sinh tồn tại để
  // tính ra, nhưng đứng cuối chuỗi join cũ nên bị `truncate` nuốt mất đầu tiên trên màn 375px, đúng
  // lúc bác sĩ lướt nhanh dòng thu gọn một tay để hỏi "CrCl bao nhiêu" (/impeccable critique
  // 2026-09-01, P1). Đặt thành span `flex-none` riêng để phần còn lại (cân nặng/tuổi/RRT) có thể
  // rớt trước, còn CrCl luôn hiện trọn vẹn.
  const crclSummary = crcl != null ? (crclUsable ? `CrCl ${crcl}` : `CrCl ${crcl} (không dùng được)`) : null

  return (
    <div className="mx-5 mb-3 rounded-[20px]" style={{ background: C.surface }}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex-1 min-w-0 min-h-[44px] flex flex-col justify-center text-left" aria-expanded={open} aria-controls={panelBodyId}>
          <p className="text-[12px] font-bold" style={{ color: "var(--c-primary-strong)" }}>
            Bệnh nhân hiện tại
          </p>
          {/* Trước đây `truncate` một dòng: lượt vá 2026-09-01 tách CrCl ra khỏi vùng cắt vì đó là
              con số cả tab kháng sinh tồn tại để tính ra, nhưng tuổi/chiều cao/cân nặng vẫn nằm
              trong chuỗi `truncate` cũ — ở 375px với đủ dữ liệu, tuổi (đứng cuối) bị cắt mất, đúng
              CÙNG lớp lỗi vừa vá cho CrCl (/impeccable critique 2026-09-01 lượt 2, P1). Thay vì vá
              tiếp từng trường một mỗi lần bị phát hiện, đổi hẳn sang `flex-wrap` — không trường nào
              còn có thể bị cắt âm thầm, tối đa chỉ xuống dòng (dữ liệu bệnh nhân luôn ngắn, hiếm khi
              quá 2 dòng thật). */}
          {/* text-slate-600 (Tailwind cứng) trước đây — DESIGN.md cấm hex/màu Tailwind cứng, chỉ đọc
              từ `--c-*`; đổi sang `--c-text-soft` (dòng nhãn "Bệnh nhân hiện tại" cạnh nó cũng đã
              dùng inline style token, không phải class màu cứng) — /impeccable polish 2026-09-02. */}
          <p className="text-[12px] mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5" style={{ color: C.textSoft }}>
            <span>{hasData ? summary : "Chưa nhập thông số — chạm để nhập"}</span>
            {hasData && crclSummary && <span className="flex-none">· {crclSummary}</span>}
          </p>
        </button>
        {/* "Xoá bệnh nhân" CỐ Ý nằm ở đây — đầu khung, gần nút mở/thu gọn — chứ không đẩy xuống gần
            vùng ngón cái hơn (vd cuối danh sách thuốc). Đây là hành động phá huỷ nhất màn hình
            (xoá cả bệnh nhân lẫn bảng "Đang truyền", xem resetPatient), nên khó với hơn một chút là
            CHỦ ĐÍCH, không phải sơ suất bố cục — xác nhận trực tiếp với chủ dự án (/impeccable
            critique 2026-08-18). Hai lớp chạm-hai-lần + Hoàn tác 20 giây (CONFIRM_PATIENT_RESET_MS)
            đã đủ chống bấm nhầm; đừng "sửa" chỗ này bằng cách kéo nút xuống vùng dễ với. */}
        {hasData && (
          <>
          <button
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true)
                setConfirmResetNearExpiry(false)
                tickHaptic()
                confirmResetTimer.current = setTimeout(() => setConfirmReset(false), CONFIRM_PATIENT_RESET_MS)
                confirmResetNearExpiryTimer.current = setTimeout(
                  () => setConfirmResetNearExpiry(true),
                  Math.max(CONFIRM_PATIENT_RESET_MS - 5_000, 0),
                )
                return
              }
              if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current)
              if (confirmResetNearExpiryTimer.current) clearTimeout(confirmResetNearExpiryTimer.current)
              setConfirmReset(false)
              setConfirmResetNearExpiry(false)
              resetPatient()
              tickHaptic()
            }}
            className="flex-none min-h-[44px] px-2.5 rounded-full text-[12px] font-bold border relative overflow-hidden"
            // Trạng thái NGHỈ dùng màu trung tính, không phải đỏ: đỏ dành cho nguy hiểm lâm sàng
            // (thẻ cảnh báo thuốc ngay bên dưới) — một nút đỏ thường trực trên đầu khung tranh tín
            // hiệu với chúng (/impeccable critique 2026-08-31, P2). Chạm-một mới lên đỏ đặc: đó mới
            // là khoảnh khắc "sắp xoá sạch bệnh nhân + bảng Đang truyền" cần màu nguy hiểm thật.
            style={
              confirmReset
                ? { background: C.danger, borderColor: C.danger, color: "var(--c-on-bright)" }
                : { background: C.surface, borderColor: C.line, color: C.textSoft }
            }
            aria-label={
              confirmReset
                ? `Xoá bệnh nhân${running.length > 0 ? ` và ${running.length} thuốc` : ""} — chạm lần nữa để xác nhận, tự huỷ sau 20 giây`
                : "Xoá bệnh nhân"
            }
          >
            {/* Cửa sổ 20 giây (CONFIRM_PATIENT_RESET_MS) dài hơn hẳn CONFIRM_DELETE_RESET_MS của
                ConfirmIconButton/RunningPanel, đúng để sống sót qua gián đoạn — nhưng thiếu dải đếm
                ngược thì người quay lại sau 5-10s không biết khoá còn hiệu lực hay đã tự huỷ, dễ
                chạm hụt vào đúng chạm-hai-lần thật sự xoá (critique /impeccable 2026-08-17T17-38,
                P1). Thanh cạn ngang (không phải vòng tròn quanh icon) vì đây là nút pill có chữ,
                không phải nút icon vuông — xem quy ước hình dạng ở ConfirmIconButton. */}
            {confirmReset && (
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "rgba(255,255,255,0.28)", transformOrigin: "left", animation: `confirmDrain ${CONFIRM_PATIENT_RESET_MS}ms linear forwards` }}
              />
            )}
            <span className="relative">
              {confirmReset
                ? `Xoá bệnh nhân${running.length > 0 ? ` + ${running.length} thuốc?` : "?"}`
                : "Xoá bệnh nhân"}
            </span>
          </button>
          {/* Trình đọc màn hình tự đọc lại NGAY khi nội dung vùng aria-live đổi — rỗng lúc nghỉ, chỉ
              có chữ ở mốc còn 5 giây, nên không đọc ồn ào suốt 20 giây, chỉ đúng một lần lúc cửa sổ
              hoàn tác sắp đóng. */}
          <span className="sr-only" role="status" aria-live="assertive">
            {confirmReset && confirmResetNearExpiry ? "Cửa sổ hoàn tác xoá bệnh nhân sắp đóng." : ""}
          </span>
          </>
        )}
        <button onClick={onToggle} className="flex-none w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.surface, color: "var(--c-primary-strong)" }} aria-label={open ? "Thu gọn" : "Mở rộng"} aria-expanded={open} aria-controls={panelBodyId}>
          <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>{icons.chevronDown()}</span>
        </button>
      </div>

      {/* Đứng TRƯỚC banner "thông số nhập từ lâu" bên dưới — mức nghiêm trọng hơn (màu danger, không
          phải warn): đây không phải chính người dùng quên cập nhật, mà là MỘT TAB/CỬA SỔ KHÁC (cùng
          gốc) vừa ghi đè cân nặng/creatinin qua sự kiện `storage` (xem usePatientVitals). Trước đây
          `usePatientVitals` chỉ đọc localStorage một lần lúc mount, không đối chiếu khi tab khác ghi
          đè — tab hiện tại lặng lẽ nhận số sai, và banner "cân nặng đã đổi" hiện có (staleReason,
          RunningPanel) đọc y như một chỉnh sửa bình thường của chính người dùng chứ không báo đây là
          ngữ cảnh khác (/impeccable critique 2026-09-01, P1). */}
      {hasData && patientChangedElsewhereAt != null && (
        <div className="flex items-center gap-2 mx-4 mb-3 px-2.5 py-2 rounded-[14px] fade-in" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-line)" }}>
          <p className="flex-1 text-[12px] font-bold leading-[1.4]" style={{ color: C.danger }}>
            Dữ liệu bệnh nhân vừa đổi từ một tab khác — kiểm tra lại trước khi dùng
          </p>
          <button
            onClick={dismissPatientChangedElsewhere}
            className={`flex-none h-7 px-2.5 ${R.pill} dose-press text-[12px] font-bold`}
            style={{ background: C.danger, color: "var(--c-on-bright)" }}
          >
            Đã biết
          </button>
        </div>
      )}

      {/* Nhắc "còn đúng bệnh nhân này không" — nằm ở HÀNG LUÔN HIỆN, ngoài disc-body, vì mọi phép
          tính liều trên màn hình đọc từ khối này, và trước đây chỉ isRenalStatusStale nhắc riêng
          tình trạng thận (nằm sâu trong khung đã gấp) — người quay lại máy cho bệnh nhân/ca trực
          khác không có gì báo ngoài trí nhớ của chính họ (critique /impeccable 2026-08-17T22-03, P1).
          Không lưu tên/ID (xem PatientVitals) nên tín hiệu này chỉ dựa vào THỜI GIAN, không định
          danh — đúng ràng buộc riêng tư đã có sẵn của màn hình. */}
      {hasData && isPatientStale(patient) && (
        <div className="flex items-center gap-2 mx-4 mb-3 px-2.5 py-2 rounded-[14px] fade-in" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
          <p className="flex-1 text-[12px] font-bold leading-[1.4]" style={{ color: C.warn }}>
            Thông số nhập từ lâu — còn đúng bệnh nhân này không?
          </p>
          <button
            onClick={() => setPatientField("weight", patient.weight)}
            className={`flex-none h-7 px-2.5 ${R.pill} dose-press text-[12px] font-bold`}
            style={{ background: C.warn, color: "var(--c-on-bright)" }}
          >
            Vẫn đúng
          </button>
        </div>
      )}

      {/* Trước đây `{open && <div>}` — gấp/mở khối ~700px này NHẢY TỨC THÌ, đúng khoảnh khắc "chọn
          thuốc → panel gấp lại → cuộn tới thẻ" bị giật nhiều nhất màn hình. Dùng lại kỹ thuật
          .disc-body (grid-template-rows 0fr→1fr, xem Disclosure) để chiều cao co giãn mượt. */}
      <div id={panelBodyId} className="disc-body disc-body--flush" data-open={open}>
        <div className="px-4 pb-4">
          {/* Mọi ô đều có hàng nhãn CAO BẰNG NHAU (PatientField) nên đáy các ô nhập thẳng một đường.
              Trước đây ô Creatinin có thêm bộ chọn đơn vị nằm chung hàng nhãn, đẩy ô nhập của nó
              tụt xuống so với ô Chiều cao bên cạnh — nay bộ chọn đơn vị nằm cạnh ô nhập. */}
          {/* Cân nặng lên ĐẦU: đây là trường DUY NHẤT mà hầu hết máy tính liều bắt buộc phải có
              (missingReason chỉ ra đúng nó) — tuổi/creatinin chỉ cần khi tính CrCl cho kháng sinh.
              Trước đây Tuổi/Giới tính đứng đầu, đẩy Cân nặng xuống hàng thứ hai dù nó quan trọng
              hơn hẳn cho phần lớn thuốc (vận mạch, an thần... không cần CrCl). */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <PatientField label="Cân nặng (kg)">
              <input value={patient.weight} onChange={(e) => setPatientField("weight", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 65" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
            <PatientField label="Chiều cao (cm)">
              <input value={patient.height} onChange={(e) => setPatientField("height", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 165" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
          </div>
          {/* Cân nặng và chiều cao có thể cùng lúc đều cảnh báo (vd trẻ em nhẹ cân, thấp) — xếp mỗi
              cảnh báo một dòng riêng, đủ rộng để đọc trọn câu thay vì bị bóp trong nửa cột. Ký tự lạ
              (vd "70abc") ưu tiên hiện trước cảnh báo độ lớn, vì lúc đó con số còn chưa xác định được. */}
          {(
            [
              !showWeightWarn
                ? null
                : weightInvalid
                  ? { key: "w", message: `Cân nặng "${patient.weight.trim()}" có ký tự không phải số — app coi như CHƯA NHẬP.`, severity: "implausible" as const }
                  : weightWarn && weightWarn.severity !== "ok"
                    ? { key: "w", message: weightWarn.message, severity: weightWarn.severity }
                    : null,
              !showHeightWarn
                ? null
                : heightInvalid
                  ? { key: "h", message: `Chiều cao "${patient.height.trim()}" có ký tự không phải số — app coi như CHƯA NHẬP.`, severity: "implausible" as const }
                  : heightWarn && heightWarn.severity !== "ok"
                    ? { key: "h", message: heightWarn.message, severity: heightWarn.severity }
                    : null,
            ] as ({ key: string; message: string; severity: "check" | "implausible" } | null)[]
          )
            .filter((w): w is { key: string; message: string; severity: "check" | "implausible" } => w != null)
            .map((w) => (
              <div key={w.key} className="mb-2">
                <InputWarning text={w.message} level={w.severity} />
              </div>
            ))}

          {/* Tuổi + Giới tính + Creatinin: chỉ cần cho CrCl (kháng sinh chỉnh theo Độ thanh thải thận) —
              nhóm lại thành cụm "để tính CrCl", đứng sau cụm cân nặng/chiều cao dùng chung cho mọi
              thuốc. */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <PatientField label="Tuổi">
              <input value={patient.age} onChange={(e) => setPatientField("age", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 70" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
            <PatientField label="Giới tính">
              <div className="flex gap-1.5">
                {(["male", "female"] as const).map((sVal) => (
                  <button
                    key={sVal}
                    onClick={() => {
                      setPatientField("sex", sVal)
                      tickHaptic()
                    }}
                    className={`flex-1 h-11 ${R.input} ${T.chip} border dose-press`}
                    style={
                      patient.sex === sVal
                        ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" }
                        : { background: C.surface, borderColor: C.primaryLine, color: C.textSoft }
                    }
                  >
                    {sVal === "male" ? "Nam" : "Nữ"}
                  </button>
                ))}
              </div>
            </PatientField>
          </div>
          {showAgeWarn && (ageInvalid ? (
            <div className="mb-2">
              <InputWarning text={`Tuổi "${patient.age.trim()}" có ký tự không phải số — app coi như CHƯA NHẬP, không tính CrCl từ đây.`} level="implausible" />
            </div>
          ) : (
            ageWarn && ageWarn.severity !== "ok" && (
              <div className="mb-2">
                <InputWarning text={ageWarn.message} level={ageWarn.severity} />
              </div>
            )
          ))}

          {/* Creatinin/CrCl/độ thanh thải thận chỉ có ý nghĩa cho liều kháng sinh theo CrCl — 9 nhóm
              thuốc truyền còn lại chỉ cần cân nặng/giới tính ở trên. Gấp lại theo mặc định để
              không chặn đường xuống danh sách thuốc trên các tab đó; tự mở khi đã có dữ liệu liên
              quan HOẶC đang ở tab Kháng sinh (renalRelevantByDefault) — creatinin là ô nhập mà cả
              màn "theo CrCl" xoay quanh, giấu nó sau disclosure khiến dễ đọc thẻ liều khi CrCl chưa
              tính (/impeccable critique 2026-08-31, P2).

              `key` đổi theo renalRelevantByDefault: Disclosure chốt open-state lúc mount, không tự
              đổi sau đó — nếu không có key, mở ở tab Kháng sinh rồi sang tab thuốc truyền nó vẫn
              đứng mở, đẩy danh sách thuốc xuống bằng ~300px "Độ thanh thải thận" vô nghĩa ở đó
              (/impeccable critique 2026-08-31 lượt 2, P3). Đổi key -> remount -> áp lại defaultOpen
              đúng nhóm; trong cùng một nhóm key ổn định nên thao tác gấp/mở tay vẫn giữ. */}
          <Disclosure
            key={renalRelevantByDefault ? "renal-open" : "renal-collapsed"}
            label="Creatinin · CrCl · Độ thanh thải thận"
            alert={!crclUsable}
            // Tab Kháng sinh: LUÔN mở (màn "theo CrCl" xoay quanh ô này). Tab thuốc truyền: mặc định
            // GẤP kể cả khi đã nhập creatinin — 9 nhóm đó chỉnh liều theo đáp ứng/cân nặng, khối
            // "Độ thanh thải thận" 296px chỉ đẩy danh sách thuốc xuống (/impeccable critique
            // 2026-08-31 lượt 2, P3). Chỉ RRT/AKI (tín hiệu "bệnh nhân đang lọc máu", đáng thấy ở
            // mọi tab) mới tự mở trên các tab đó.
            defaultOpen={renalRelevantByDefault || patient.rrt !== "none" || patient.akiUnstable}
          >
            <PatientField label="Creatinin">
              {/* flex-wrap + min-w-[96px]: trên máy hẹp (iPhone SE, hoặc cỡ chữ hệ thống lớn), ô nhập
                  co tới 96px rồi khối chọn đơn vị (mg/dL · µmol/L) tự XUỐNG DÒNG thay vì bị đẩy tràn
                  ra ngoài thẻ và bị màn hình xén mất — min-w-0 trước đây co ô nhập về gần 0px, nhìn
                  như lỗi méo ô chứ không giải quyết được tràn khi khối đơn vị đã đủ rộng để tự nó
                  không vừa hàng. */}
              <div className="flex flex-wrap gap-1.5">
                <input value={patient.scr} onChange={(e) => setPatientField("scr", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 1.2" className={`${FIELD} flex-1 min-w-[96px]`} style={FIELD_STYLE} />
                {/* h-11 trên chính khung viền, không phải trên các nút bên trong — nếu không, viền
                    1px cộng thêm làm khối này cao 46px và lệch 2px so với ô nhập bên cạnh. Viền vẽ
                    bằng boxShadow inset thay vì `border` thật — border thật ăn vào content-box (44px
                    tổng trừ 2×1px viền = 42px cho hai nút `h-full` bên trong, dưới sàn chạm 44px);
                    boxShadow không chiếm không gian box nên nút vẫn đúng 44px mà viền nhìn y hệt
                    (/impeccable critique 2026-08-19T14-41, P3). */}
                <div className={`flex h-11 ${R.input} overflow-hidden flex-none`} style={{ boxShadow: `inset 0 0 0 1px ${C.primaryLine}` }}>
                  {(["mgdl", "umol"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        switchScrUnit(u)
                        tickHaptic()
                      }}
                      className={`px-3 h-full ${T.chip} leading-none dose-press`}
                      style={patient.scrUnit === u ? { background: C.primary, color: "var(--c-on-primary)" } : { background: C.surface, color: "var(--c-text-muted)" }}
                    >
                      {u === "mgdl" ? "mg/dL" : "µmol/L"}
                    </button>
                  ))}
                </div>
              </div>
            </PatientField>
            {showScrWarn && (scrInvalid ? (
              <div className="mt-2">
                <InputWarning text={`Creatinin "${patient.scr.trim()}" có ký tự không phải số — app coi như CHƯA NHẬP, không tính CrCl từ đây.`} level="implausible" />
              </div>
            ) : (
              scrWarn && scrWarn.severity !== "ok" && (
                <div className="mt-2">
                  <InputWarning text={scrWarn.message} level={scrWarn.severity} />
                </div>
              )
            ))}

          {/* Kết quả CrCl gói trong MỘT dải thay vì con số lớn + hai đoạn chú thích rời như trước.
              mt-3 để tách hẳn khỏi ô Creatinin phía trên — trước đây dính sát nhau vì cả hai chỉ có
              margin-bottom, không có khoảng trên. */}
          <div
            className={`flex items-center gap-3 px-3 h-14 ${R.box} mt-3 mb-2`}
            style={
              crclUsable && crclInputImplausible
                ? { background: C.warnSoft, border: `1px solid ${C.warnLine}` }
                : { background: crclUsable ? C.primarySoft : C.surface }
            }
            // Con số này tự tính lại mỗi khi gõ cân nặng/creatinin, và nó quyết định bậc liều — người
            // dùng trình đọc màn hình gõ xong một ô mà không có gì báo "CrCl vừa đổi" thì không biết
            // giá trị dùng để tính liều là bao nhiêu. aria-atomic để đọc lại TRỌN dải (số + nhãn),
            // không chỉ phần chữ vừa đổi — tránh đọc mỗi "53" trơn không rõ là số gì.
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Trước đây khi crclUsable=false vẫn hiện to con số CrCl thật, chỉ đổi màu xám — quá
                yếu để nói "con số này KHÔNG được dùng chọn bậc liều". Đổi hẳn sang "—": im lặng
                còn an toàn hơn một con số đúng-về-mặt-tính-toán nhưng sai-về-mặt-lâm-sàng.
                Màu chữ dùng C.text (trung tính) chứ không phải C.primary khi dùng được — cùng lý do
                đã sửa cho SEVERITY_STYLE.ok trong lib/doseSafety.ts: con số 24px lớn nhất màn hình
                không nên bão hoà màu thương hiệu hơn một cảnh báo nguy hiểm đứng gần đó.
                crclInputImplausible: số VẪN hiện và VẪN dùng được (không ẩn/chặn bậc liều) — chỉ đổi
                sang màu cảnh báo, cùng SEVERITY_STYLE.above đã dùng cho liều truyền, để "trông chắc
                chắn" không còn đúng cho một con số dựa trên input mà chính app vừa gắn cờ bất thường. */}
            <span className={`${T.metric} flex-none ${NUM_DOSE}`} style={{ color: crclUsable ? (crclInputImplausible ? C.warnIcon : C.text) : C.muted }}>
              {crclDisplay}
            </span>
            <div className="min-w-0">
              <p className={T.meta} style={{ color: crclUsable && crclInputImplausible ? C.warnIcon : C.textSoft }}>
                mL/phút · CrCl (Cockcroft-Gault)
                {!crclUsable && crcl != null && ` — tính được ${crcl} nhưng không dùng được`}
                {/* crcl != null bắt buộc: nếu không, câu này ngụ ý "một bậc liều đang dùng số này"
                    ngay cả khi crcl == null (— hiện trên màn) và không hề có bậc liều nào cả — đúng
                    ca crclReason === "rejected" bên dưới (/impeccable critique 2026-08-21, P1). */}
                {crclUsable && crclInputImplausible && crcl != null && " — dựa trên số liệu bất thường, kiểm tra lại trước khi dùng bậc liều này"}
              </p>
              {/* Dấu "—" không bao giờ được đứng một mình — missingReason ở InfusionCalculator đã
                  làm đúng điều này (lý do + đường sửa), ô CrCl trước đây thì chưa: thiếu dữ liệu
                  chỉ hiện "—" trơn, không nói thiếu gì. Nay còn phân biệt "chưa nhập đủ" (missing)
                  khỏi "đã nhập đủ nhưng bị từ chối" (rejected) qua crclReason dùng chung với
                  AntibioticDoseCard — trước đây nhánh rejected rơi vào ternary dưới, không khớp
                  điều kiện nào, render một <p> rỗng ngay dưới câu "kiểm tra lại trước khi dùng bậc
                  liều này" dù không có bậc liều nào đang dùng số vừa "bị từ chối" đó cả. */}
              {crclUsable && crcl == null && (
                // C.textSoft, không phải C.muted: đây là chữ hướng dẫn thật phải đọc được ("Cần nhập
                // X để tính"), không phải icon/placeholder — cùng lỗi và cùng cách sửa RunningPanel
                // đã tự áp dụng cho nhãn "Đường truyền" của chính nó (xem comment ở dưới).
                <p className={T.meta} style={{ color: C.textSoft }}>
                  {crclReason === "rejected"
                    ? "Không tính được — số liệu bất thường, kiểm tra lại tuổi/cân nặng/chiều cao/creatinin"
                    : ageYears == null
                      ? "Cần nhập tuổi để tính"
                      : abwKg == null
                        ? "Cần nhập cân nặng để tính"
                        : "Cần nhập creatinin để tính"}
                </p>
              )}
              {crclWeight.ibw != null && crclWeight.used != null && (
                <p className={`${T.meta} ${NUM} truncate`} style={{ color: C.textSoft }}>
                  IBW {crclWeight.ibw.toFixed(0)} kg · tính theo {crclWeight.usedLabel} {crclWeight.used.toFixed(1).replace(".", ",")} kg
                </p>
              )}
            </div>
          </div>

          {/* Độ thanh thải thận: tách 2 cụm thị giác thay vì gộp về một hàng phẳng — cụm "trạng thái
              lọc" (Không lọc/AKI, 2 lựa chọn thường gặp nhất) rồi tới cụm "phương thức lọc máu"
              (IHD/CRRT/SLED/PD, 4 lựa chọn hiếm hơn nhưng không được ẩn vì đều có thể quan trọng
              lâm sàng). "Không lọc" đứng đầu (trạng thái mặc định/phổ biến nhất) rồi mới tới AKI —
              trước đây AKI đứng đầu khiến hàng chip đọc lộn thứ tự ưu tiên.
              mb-3 (gấp đôi gap-1.5 giữa các chip cùng cụm) + nhãn phụ "Phương thức lọc máu" ngay
              trên cụm 2: lần vá đầu chỉ tách bằng mb-1.5 — đo trực tiếp bằng getBoundingClientRect
              cho thấy khoảng cách dọc giữa 2 cụm khi đó BẰNG HỆT khoảng cách ngang trong một cụm
              (6px cả hai), nên ở trạng thái nghỉ (chưa chọn gì) mắt đọc thành một hàng 6 chip bị wrap,
              không phải 2 nhóm khái niệm khác nhau (/impeccable critique 2026-08-22 lần 2, P2). */}
          <SectionLabel>Độ thanh thải thận</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => {
                setPatientField("rrt", "none")
                tickHaptic()
              }}
              className={`${CHIP} dose-press`}
              style={
                patient.rrt === "none"
                  ? { background: C.primary, borderColor: "transparent", color: "var(--c-on-primary)" }
                  : { background: "transparent", borderColor: "transparent", color: C.textSoft }
              }
            >
              {RRT_SHORT.none}
            </button>
            <button
              onClick={() => {
                setPatientField("akiUnstable", !patient.akiUnstable)
                tickHaptic()
              }}
              className={`${CHIP} dose-press`}
              style={
                patient.akiUnstable
                  ? { background: C.warnIcon, borderColor: C.warnIcon, color: "var(--c-on-bright)" }
                  : { background: "transparent", borderColor: "transparent", color: C.textSoft }
              }
            >
              AKI
            </button>
          </div>
          <p className={`${T.meta} mb-1`} style={{ color: C.textSoft }}>Phương thức lọc máu</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(Object.keys(RRT_LABELS) as RrtMode[])
              .filter((m) => m !== "none")
              .map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPatientField("rrt", m)
                    tickHaptic()
                  }}
                  className={`${CHIP} dose-press`}
                  style={
                    patient.rrt === m
                      ? { background: C.danger, borderColor: "transparent", color: "var(--c-on-bright)" }
                      : { background: "transparent", borderColor: "transparent", color: C.textSoft }
                  }
                >
                  {RRT_SHORT[m]}
                </button>
              ))}
          </div>

          {/* Độ thanh thải thận đã xác nhận lâu rồi mà chưa ai chạm lại — lọc máu có thể đã bắt đầu/kết
              thúc giữa ca mà tra cứu sau đó vẫn âm thầm dùng bậc liều cũ. Chỉ hiện khi đã từng được
              xác nhận ít nhất một lần (isRenalStatusStale loại bệnh nhân mới, chưa ai chạm tới). */}
          {isRenalStatusStale(patient) && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-2 rounded-[14px] fade-in" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
              <p className="flex-1 text-[12px] font-bold leading-[1.4]" style={{ color: C.warn }}>
                Độ thanh thải thận chưa được xác nhận lại từ đầu ca — còn đúng không?
              </p>
              <button
                onClick={() => setPatientField("rrt", patient.rrt)}
                className={`flex-none h-7 px-2.5 ${R.pill} dose-press text-[12px] font-bold`}
                style={{ background: C.warn, color: "var(--c-on-bright)" }}
              >
                Vẫn đúng
              </button>
            </div>
          )}

          {/* Tốc độ dịch thải: thiếu con số này thì mọi khuyến cáo "liều CRRT" đều thiếu vế điều kiện */}
          {needsCrrtFlow(patient.rrt) && (
            <div className="mb-2 fade-in">
              <PatientField label="Tốc độ dịch thải Qeff (L/giờ)">
                <input
                  value={patient.crrtFlowLPerH}
                  onChange={(e) => setPatientField("crrtFlowLPerH", normalizeDecimalInput(e.target.value))}
                  inputMode="decimal"
                  placeholder="VD: 2 — dịch lọc + siêu lọc"
                  className={FIELD}
                  style={FIELD_STYLE}
                />
              </PatientField>
              <p className={`${T.meta} mt-1`} style={{ color: C.textSoft }}>
                {abwKg != null && (parseStrictNumber(patient.crrtFlowLPerH) ?? 0) > 0
                  ? `Tương đương ${(((parseStrictNumber(patient.crrtFlowLPerH) as number) * 1000) / abwKg).toFixed(0)} mL/kg/giờ — so với điều kiện Qeff ghi trong liều CRRT của từng thuốc.`
                  : "Cộng tốc độ dịch lọc và tốc độ siêu lọc — liều kháng sinh trong CRRT thay đổi theo con số này."}
              </p>
            </div>
          )}

          {!crclUsable && (
            <div className={`fade-in px-3 py-2 ${R.box} flex items-start gap-2`} style={{ background: C.dangerSoft, border: `1px solid ${C.dangerLine}` }}>
              <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
              <p className={`${T.meta} font-semibold`} style={{ color: C.danger }}>
                {CRCL_RELIABILITY_TEXT[crclReliability(patient) as "aki" | "rrt"]}
              </p>
            </div>
          )}
          </Disclosure>
        </div>
      </div>
    </div>
  )
}

// ─── Bảng "Đang truyền" — xem nhiều thuốc cạnh nhau + tương hợp Khóa chữ Y ────────
//
// Quy tắc an toàn: app CHỈ kết luận "không tương hợp"/"thận trọng". Cặp nào không có trong bảng thì
// nói rõ là chưa có dữ liệu — im lặng không bao giờ được hiểu thành "chạy chung được".

// Từng cặp một phải tự khai đã đối chiếu tài liệu gốc hay chưa — nếu chỉ có một dòng miễn trừ
// chung ở cuối bảng thì người đọc không phân biệt được mục nào chắc, mục nào còn phải kiểm.
