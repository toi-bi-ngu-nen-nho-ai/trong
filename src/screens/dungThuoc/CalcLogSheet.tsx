import { useState, useRef, useEffect } from "react"
import type { AntibioticWarning } from "../../data/types"
import { CALC_KIND_LABELS, calcLogToText, formatLogTime, type CalcLogEntry } from "../../lib/calcLog"
import { tickHaptic } from "../../lib/haptics"
import { icons } from "../../components/icons"
import { BTN_SM, C, PROSE, R, T, useDialogFocus } from "../../lib/ui"

export function CalcLogSheet({ entries, onClear, onRemove, onClose }: { entries: CalcLogEntry[]; onClear: () => void; onRemove: (ids: Set<string>) => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // Sheet này CÓ đường thoát rõ ràng (nút "Đóng" + chạm ra ngoài) nên Esc hợp lý ở đây, khác
  // DisclaimerGate — bẫy Tab để không lọt ra danh sách thuốc đang bị che phía sau.
  useDialogFocus(panelRef, { onEscape: onClose })

  // Mục đã chọn có thể bị xoá khỏi danh sách (hoặc rơi khỏi mốc 200) — bỏ id "mồ côi" khỏi vùng
  // chọn, nếu không số đếm trên nút sẽ nói dối.
  useEffect(() => {
    setSelected((prev) => {
      const alive = new Set(entries.map((e) => e.id))
      const next = new Set([...prev].filter((id) => alive.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [entries])
  useEffect(() => setConfirmDelete(false), [selected])

  const hasSelection = selected.size > 0
  const target = hasSelection ? entries.filter((e) => selected.has(e.id)) : entries
  const allSelected = entries.length > 0 && selected.size === entries.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    tickHaptic()
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col fade-in" style={{ background: "var(--c-scrim)" }}>
      <button className="flex-1" onClick={onClose} aria-label="Đóng nhật ký" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calclog-title"
        className="mind-sheet rounded-t-3xl flex flex-col"
        style={{ background: C.surface, maxHeight: "78%" }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p id="calclog-title" className="text-[13px] font-bold text-slate-900">Nhật ký tính toán</p>
          <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.lineSoft, color: C.textSoft }} aria-label="Đóng">
            {icons.x()}
          </button>
        </div>
        <div className="flex items-center gap-2 px-5 pb-2">
          <p className={`${T.meta} flex-1`} style={{ color: C.textSoft }}>
            {hasSelection
              ? `Đã chọn ${selected.size}/${entries.length} — hai nút bên dưới chỉ tác động lên phần đã chọn.`
              : "Chạm vào một mục để chọn riêng. Chưa chọn gì thì nút bên dưới áp dụng cho toàn bộ."}
          </p>
          {entries.length > 0 && (
            <button
              onClick={() => {
                setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.id)))
                tickHaptic()
              }}
              className={`${BTN_SM} flex-none`}
              style={{ borderColor: C.line, color: "var(--c-primary-strong)" }}
            >
              {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          )}
        </div>
        <div className="scroll-ios flex-1 px-5 pb-3">
          {entries.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">Chưa có phép tính nào được lưu.</p>
          ) : (
            entries.map((e) => {
              const on = selected.has(e.id)
              return (
                <button
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  aria-pressed={on}
                  className="w-full text-left p-3 rounded-[20px] border mb-2 flex gap-2.5 items-start"
                  style={on ? { borderColor: C.primary, background: C.primarySoft } : { borderColor: C.line }}
                >
                  {/* Ô đánh dấu vẽ tay thay vì <input type=checkbox>: cả thẻ đã là vùng chạm 44px,
                      thêm một ô bấm được nữa bên trong chỉ tạo ra hai đích chạm chồng nhau. */}
                  <span
                    className="flex-none w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center"
                    style={on ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-primary)" } : { borderColor: C.line }}
                  >
                    {on && <span className="scale-[0.6]">{icons.check()}</span>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`${T.meta} font-bold truncate`} style={{ color: C.text }}>{e.drug}</span>
                      <span className={`${T.meta} flex-none`} style={{ color: C.textSoft }}>{formatLogTime(e.at)}</span>
                    </span>
                    <span className={`${T.meta} block`} style={{ color: C.textSoft }}>
                      {CALC_KIND_LABELS[e.kind]}
                      {e.patient ? ` · ${e.patient}` : ""}
                      {e.weightKg != null ? ` · ${e.weightKg} kg` : ""}
                    </span>
                    {e.inputs.map((line, i) => (
                      <span key={i} className={`${T.meta} block`} style={{ color: C.textSoft }}>
                        {line}
                      </span>
                    ))}
                    <span className={`${T.meta} font-bold block mt-0.5`} style={{ color: "var(--c-primary-strong)" }}>
                      → {e.output}
                    </span>
                    {e.flag && (
                      <span className={`${T.meta} font-semibold block mt-1 px-2 py-1 ${R.box}`} style={{ background: C.dangerSoft, color: C.danger }}>
                        {e.flag}
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
        <div className="flex-none flex gap-2 px-5 pt-2 border-t" style={{ borderColor: C.line, paddingBottom: "var(--nav-pad-bottom)" }}>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(calcLogToText(target))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                // Trình duyệt chặn clipboard: không làm gì, nút vẫn giữ nguyên nhãn.
              }
            }}
            disabled={target.length === 0}
            className="flex-1 py-3 rounded-[20px] font-semibold text-[13px] border"
            style={{ borderColor: C.line, color: target.length === 0 ? C.muted : "var(--c-primary-strong)" }}
          >
            {copied ? "Đã sao chép" : hasSelection ? `Sao chép ${selected.size} mục` : "Sao chép tất cả"}
          </button>
          {/* Xoá cần một nhịp xác nhận, nhưng KHÔNG dùng hộp thoại: nút tự đổi thành "Chắc chắn xoá?"
              rồi mới thực hiện ở lần chạm thứ hai — bỏ tay ra khỏi nút là quên (xem useEffect trên). */}
          <button
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              if (hasSelection) {
                onRemove(selected)
                setSelected(new Set())
              } else {
                onClear()
              }
              setConfirmDelete(false)
              tickHaptic()
            }}
            onBlur={() => setConfirmDelete(false)}
            disabled={target.length === 0}
            className="flex-1 py-3 rounded-[20px] font-semibold text-[13px] border"
            style={
              target.length === 0
                ? { borderColor: C.dangerLine, color: "var(--c-disabled-fg)" }
                : confirmDelete
                  ? { borderColor: C.dangerIcon, background: C.dangerSoft, color: C.danger }
                  : { borderColor: C.dangerLine, color: C.danger }
            }
          >
            {confirmDelete ? "Chắc chắn xoá?" : hasSelection ? `Xoá ${selected.size} mục` : "Xoá tất cả"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Antibiotics — chỉnh liều theo độ lọc cầu thận ────────────────────────────

// Cảnh báo/tương tác của một thuốc — dùng chung cho AntibioticDoseCard và InfusionDrugCard.
// Trước đây "cao" và "trung bình" chỉ khác nhau ở màu một chấm tròn 1.5px — rất dễ lướt qua và
// bỏ sót cảnh báo mức cao. Giờ mức "cao" có khung nền đỏ nhạt + icon cảnh báo + chữ đậm màu đỏ,
// tách hẳn khỏi mức "trung bình" (vẫn giữ kiểu chấm nhỏ, không cần nổi bật bằng).
// `bare` = đã có tiêu đề mục ở ngoài (khối gấp/mở) nên không vẽ lại đường kẻ và tiêu đề riêng.
export function DrugWarnings({ warnings, bare }: { warnings?: AntibioticWarning[]; bare?: boolean }) {
  if (!warnings || warnings.length === 0) return null
  return (
    <div className={bare ? "space-y-1.5" : "mt-3 pt-3 border-t space-y-1.5"} style={bare ? undefined : { borderColor: C.lineSoft }}>
      {!bare && <p className="text-[12px] font-bold" style={{ color: C.warnIcon }}>Lưu ý / tương tác</p>}
      {warnings.map((w, i) =>
        w.severity === "cao" ? (
          <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-[14px]" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-line)" }}>
            <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
            {/* Cảnh báo mức CAO dùng cỡ chữ chính (13px), không phải cỡ chú thích 11px như phần còn
                lại: đây là dòng chữ mà việc bỏ sót gây hại nhất, nó không được nhỏ hơn chữ mô tả. */}
            <p className={`${T.bodyStrong} ${PROSE}`} style={{ color: "var(--c-danger-deep)" }}>{w.text}</p>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none" style={{ background: C.warnIcon }} />
            <p className={`text-[12px] text-slate-600 leading-[1.45] ${PROSE}`}>{w.text}</p>
          </div>
        ),
      )}
    </div>
  )
}

// Gộp danh sách dựng sẵn với các bản người dùng tự lưu (cùng khoá lưu trữ dùng cho cả mục tự
// thêm mới VÀ mục "sửa" một thuốc dựng sẵn — cả hai đều nằm trong cùng collection tự nhập, phân
// biệt bằng việc id có trùng với một mục dựng sẵn hay không). Mục có id trùng với dựng sẵn sẽ
// THAY THẾ mục dựng sẵn tại đúng vị trí cũ (hiển thị bản đã sửa, không hiện cả hai bản); mục có id
// mới hoàn toàn được thêm vào cuối, như một thuốc tự nhập bình thường.
