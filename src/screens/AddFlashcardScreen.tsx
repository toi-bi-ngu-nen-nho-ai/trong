import { useState } from "react"
import type { FlashCard } from "../data/types"
import { SPECIALTIES } from "../data"
import { icons } from "../components/icons"
import { C } from "../lib/ui"

export function AddFlashcardScreen({
  onSave,
  onBack,
}: {
  onSave: (c: FlashCard) => void
  onBack: () => void
}) {
  const [front, setFront] = useState("")
  const [back, setBack] = useState("")
  const [specialty, setSpecialty] = useState(SPECIALTIES[0].name)

  const canSave = front.trim().length > 0 && back.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const newCard: FlashCard = {
      id: `custom-fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      front: front.trim(),
      back: back.trim(),
      specialty,
      due: true,
      isCustom: true,
    }
    onSave(newCard)
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
        <span className="text-sm font-semibold text-slate-900">Thêm thẻ ghi nhớ</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Chuyên khoa</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={fieldClass} style={fieldStyle}>
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Câu hỏi (mặt trước)</label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="VD: Tiêu chuẩn ECG chẩn đoán STEMI là gì?"
            rows={3}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đáp án (mặt sau)</label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Nội dung câu trả lời đầy đủ"
            rows={5}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Thẻ tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app. Dùng màn "Đồng bộ dữ liệu" nếu muốn sao lưu hoặc chuyển sang thiết bị khác.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: C.line, paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? C.primary : C.muted, color: canSave ? "var(--c-on-primary)" : "var(--c-on-bright)" }}
        >
          Lưu thẻ ghi nhớ
        </button>
      </div>
    </div>
  )
}
