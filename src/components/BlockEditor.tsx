// Trình soạn thảo tự do theo "khối" (block) — kiểu Notion — dùng chung cho bài viết tự nhập và
// bài học ECG. Mỗi dòng là một block riêng, nên có thể chèn ảnh ngay sau BẤT KỲ dòng nào thay vì
// gom hết ảnh về một chỗ.
//
// Thao tác:
// - Enter: tách dòng, tạo block mới ngay bên dưới (Shift+Enter để xuống dòng trong cùng một block).
// - Backspace ở đầu dòng: gộp ngược lên dòng trên (hoặc xoá dòng trống).
// - Chạm vào một dòng: hiện thanh công cụ của dòng đó — đổi kiểu dòng (văn bản / tiêu đề / gạch đầu
//   dòng / đánh số / trích dẫn / điểm chính), định dạng chữ đang chọn (đậm, nghiêng, gạch chân, tô
//   sáng, liên kết tới bài khác), chèn ảnh ngay dưới, di chuyển lên-xuống, xoá.
//
// Toàn bộ xử lý ảnh chạy trên máy (thu nhỏ + nén bằng canvas, xem lib/imageResize.ts) và nội dung
// được lưu cục bộ, không gọi mạng.
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { BlockType, ContentBlock } from "../data/types"
import { newBlockId } from "../lib/blocks"
import { fileToResizedDataUrl } from "../lib/imageResize"
import { insertLinkAt, toggleMarkAt, type InlineMarkKind } from "../lib/richText"

// Một bài/bài học khác trong app để chèn liên kết tới. `target` có dạng "<loại>:<id>".
export interface LinkTarget {
  target: string
  label: string
  group: string
}

const TEXT_TYPES: { id: BlockType; label: string; hint: string }[] = [
  { id: "text", label: "Aa", hint: "Văn bản" },
  { id: "heading", label: "H", hint: "Tiêu đề mục" },
  { id: "bullet", label: "•", hint: "Gạch đầu dòng" },
  { id: "numbered", label: "1.", hint: "Mục đánh số" },
  { id: "quote", label: "❝", hint: "Trích dẫn" },
  { id: "callout", label: "★", hint: "Điểm chính" },
]

const MARK_BUTTONS: { kind: InlineMarkKind; label: string; hint: string; style: React.CSSProperties }[] = [
  { kind: "bold", label: "B", hint: "In đậm", style: { fontWeight: 800 } },
  { kind: "italic", label: "I", hint: "In nghiêng", style: { fontStyle: "italic", fontFamily: "Georgia, serif" } },
  { kind: "underline", label: "U", hint: "Gạch chân", style: { textDecoration: "underline" } },
  { kind: "highlight", label: "H", hint: "Tô sáng", style: { background: "#fef08a", borderRadius: 3, padding: "0 3px" } },
]

const PLACEHOLDERS: Record<BlockType, string> = {
  text: "Viết nội dung… (Enter để xuống dòng mới)",
  heading: "Tiêu đề mục",
  bullet: "Ý gạch đầu dòng",
  numbered: "Bước / ý được đánh số",
  quote: "Trích dẫn hoặc lưu ý",
  callout: "Điểm chính cần nhớ",
  image: "",
}

function textClassFor(type: BlockType): string {
  switch (type) {
    case "heading":
      return "text-[17px] font-bold text-slate-900 leading-snug"
    case "quote":
      return "text-[14px] text-slate-600 italic leading-relaxed"
    case "callout":
      return "text-[14px] leading-relaxed"
    default:
      return "text-[15px] text-slate-800 leading-relaxed"
  }
}

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

export function BlockEditor({
  blocks,
  onChange,
  linkTargets = [],
}: {
  blocks: ContentBlock[]
  onChange: (next: ContentBlock[]) => void
  linkTargets?: LinkTarget[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Khi khác null: đang mở bảng chọn bài để chèn liên kết cho block có id này.
  const [linkPickerFor, setLinkPickerFor] = useState<string | null>(null)
  const [linkQuery, setLinkQuery] = useState("")
  const inputRefs = useRef(new Map<string, HTMLTextAreaElement>())
  // Vị trí chọn chữ lúc rời khỏi ô nhập, để nút định dạng biết đang thao tác lên đoạn nào (bấm nút
  // làm textarea mất focus nên phải nhớ lại trước đó).
  const selectionRef = useRef(new Map<string, { start: number; end: number }>())
  // Vị trí con trỏ cần đặt lại SAU khi danh sách block đã render xong (tách dòng, gộp dòng, đổi
  // kiểu, định dạng) — giữ trong ref để không gây thêm một lần render thừa.
  const pendingFocus = useRef<{ id: string; caret?: number; caretEnd?: number } | null>(null)
  // Chỉ số cần chèn ảnh vào, đặt ngay trước khi mở hộp thoại chọn file.
  const pendingImageIndex = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const el = inputRefs.current.get(target.id)
    if (!el) return
    el.focus()
    const caret = target.caret ?? el.value.length
    el.setSelectionRange(caret, target.caretEnd ?? caret)
    selectionRef.current.set(target.id, { start: caret, end: target.caretEnd ?? caret })
    autoGrow(el)
  })

  function rememberSelection(id: string, el: HTMLTextAreaElement) {
    selectionRef.current.set(id, { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 })
  }

  // Vị trí chữ đang chọn của một block: ưu tiên trạng thái thật của ô nhập, nếu ô đã mất focus thì
  // dùng lại vị trí nhớ được lần cuối.
  function currentSelection(block: ContentBlock): { start: number; end: number } {
    const el = inputRefs.current.get(block.id)
    if (el && document.activeElement === el) {
      return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }
    const len = (block.text ?? "").length
    return selectionRef.current.get(block.id) ?? { start: len, end: len }
  }

  function applyMark(block: ContentBlock, kind: InlineMarkKind) {
    const { start, end } = currentSelection(block)
    const res = toggleMarkAt(block.text ?? "", start, end, kind)
    onChange(blocks.map((b) => (b.id === block.id ? { ...b, text: res.text } : b)))
    pendingFocus.current = { id: block.id, caret: res.selStart, caretEnd: res.selEnd }
  }

  function applyLink(block: ContentBlock, target: LinkTarget) {
    const { start, end } = currentSelection(block)
    const res = insertLinkAt(block.text ?? "", start, end, target.target, target.label)
    onChange(blocks.map((b) => (b.id === block.id ? { ...b, text: res.text } : b)))
    pendingFocus.current = { id: block.id, caret: res.selStart, caretEnd: res.selEnd }
    setLinkPickerFor(null)
    setLinkQuery("")
  }

  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function removeAt(index: number) {
    const next = blocks.filter((_, i) => i !== index)
    // Luôn còn ít nhất một dòng để gõ tiếp.
    if (next.length === 0) next.push({ id: newBlockId(), type: "text", text: "" })
    onChange(next)
    const focusTarget = next[Math.max(0, index - 1)]
    if (focusTarget && focusTarget.type !== "image") pendingFocus.current = { id: focusTarget.id }
    setActiveId(focusTarget?.id ?? null)
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  function changeType(index: number, type: BlockType) {
    const block = blocks[index]
    onChange(blocks.map((b, i) => (i === index ? { ...b, type } : b)))
    pendingFocus.current = { id: block.id }
  }

  function insertTextBlockAfter(index: number, type: BlockType = "text") {
    const created: ContentBlock = { id: newBlockId(), type, text: "" }
    const next = [...blocks]
    next.splice(index + 1, 0, created)
    onChange(next)
    pendingFocus.current = { id: created.id, caret: 0 }
    setActiveId(created.id)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const el = e.currentTarget
    const block = blocks[index]

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const caret = el.selectionStart ?? el.value.length
      const head = el.value.slice(0, caret)
      const tail = el.value.slice(caret)
      // Tiêu đề / trích dẫn / điểm chính: dòng tiếp theo quay về văn bản thường. Gạch đầu dòng và
      // mục đánh số thì nối tiếp danh sách để gõ liên tục không phải bấm lại kiểu.
      const nextType: BlockType =
        block.type === "bullet" || block.type === "numbered" ? block.type : "text"
      const created: ContentBlock = { id: newBlockId(), type: nextType, text: tail }
      const next = blocks.map((b, i) => (i === index ? { ...b, text: head } : b))
      next.splice(index + 1, 0, created)
      onChange(next)
      pendingFocus.current = { id: created.id, caret: 0 }
      setActiveId(created.id)
      return
    }

    const atStart = (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0
    if (e.key === "Backspace" && atStart && index > 0) {
      const prev = blocks[index - 1]
      // Không tự xoá ảnh bằng phím lùi — ảnh có nút xoá riêng, tránh mất ảnh ngoài ý muốn.
      if (prev.type === "image") return
      e.preventDefault()
      const mergedText = (prev.text ?? "") + (block.text ?? "")
      const next = blocks
        .filter((_, i) => i !== index)
        .map((b, i) => (i === index - 1 ? { ...b, text: mergedText } : b))
      onChange(next)
      pendingFocus.current = { id: prev.id, caret: (prev.text ?? "").length }
      setActiveId(prev.id)
    }
  }

  function requestImageAt(index: number) {
    pendingImageIndex.current = index
    setError(null)
    fileInputRef.current?.click()
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    // Phải sao danh sách file ra mảng TRƯỚC khi xoá `value`: FileList là tham chiếu sống, gán
    // value = "" sẽ làm nó rỗng ngay. Vẫn cần xoá value sớm để chọn lại đúng ảnh đó vẫn nhận.
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    const created: ContentBlock[] = []
    let failCount = 0
    for (const file of files) {
      try {
        const dataUrl = await fileToResizedDataUrl(file)
        created.push({ id: newBlockId(), type: "image", dataUrl })
      } catch {
        failCount += 1
      }
    }
    if (created.length > 0) {
      const at = Math.min(pendingImageIndex.current, blocks.length)
      const next = [...blocks]
      next.splice(at, 0, ...created)
      // Luôn có một dòng chữ ngay sau ảnh để viết tiếp mà không phải bấm thêm nút.
      const after = next[at + created.length]
      if (!after || after.type === "image") {
        const trailing: ContentBlock = { id: newBlockId(), type: "text", text: "" }
        next.splice(at + created.length, 0, trailing)
        pendingFocus.current = { id: trailing.id, caret: 0 }
        setActiveId(trailing.id)
      } else {
        pendingFocus.current = { id: after.id, caret: 0 }
        setActiveId(after.id)
      }
      onChange(next)
    }
    if (failCount > 0) setError(`${failCount} ảnh không đọc được và đã bị bỏ qua.`)
    setBusy(false)
  }

  return (
    <div>
      <div className="rounded-2xl border px-3 py-2" style={{ borderColor: "#e2e8f0", background: "#fff" }}>
        {blocks.map((block, index) => {
          const isActive = activeId === block.id
          return (
            <div key={block.id} className="py-0.5">
              {block.type === "image" ? (
                <div
                  onClick={() => setActiveId(block.id)}
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: isActive ? "var(--c-primary)" : "#e2e8f0" }}
                >
                  <img src={block.dataUrl} alt="" className="w-full block" />
                  <input
                    value={block.caption ?? ""}
                    onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                    onFocus={() => setActiveId(block.id)}
                    placeholder="Chú thích ảnh (không bắt buộc)"
                    className="w-full px-3 py-2 text-xs text-center text-slate-500 outline-none border-t"
                    style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  {block.type === "bullet" && (
                    <span className="flex-none mt-[11px] w-1.5 h-1.5 rounded-full" style={{ background: "#94a3b8" }} />
                  )}
                  {block.type === "numbered" && (
                    <span
                      className="flex-none mt-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: "#eff6ff", color: "var(--c-primary)" }}
                    >
                      {blocks.slice(0, index + 1).reduceRight((acc, b, i) => {
                        // Đếm ngược tới khi gặp dòng khác loại — cùng cách tính số như lúc hiển thị.
                        if (acc.done) return acc
                        if (i === index) return { n: 1, done: false }
                        return b.type === "numbered" ? { n: acc.n + 1, done: false } : { ...acc, done: true }
                      }, { n: 0, done: false }).n}
                    </span>
                  )}
                  <div
                    className={
                      block.type === "quote"
                        ? "flex-1 pl-2.5 border-l-2"
                        : block.type === "callout"
                          ? "flex-1 px-3 py-1 rounded-xl"
                          : "flex-1"
                    }
                    style={
                      block.type === "quote"
                        ? { borderColor: "var(--c-primary)" }
                        : block.type === "callout"
                          ? { background: "#eff6ff", border: "1px solid #bfdbfe" }
                          : undefined
                    }
                  >
                    <textarea
                      ref={(el) => {
                        if (el) {
                          inputRefs.current.set(block.id, el)
                          autoGrow(el)
                        } else {
                          inputRefs.current.delete(block.id)
                        }
                      }}
                      value={block.text ?? ""}
                      rows={1}
                      onChange={(e) => {
                        autoGrow(e.currentTarget)
                        rememberSelection(block.id, e.currentTarget)
                        updateBlock(block.id, { text: e.target.value })
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onFocus={() => setActiveId(block.id)}
                      onSelect={(e) => rememberSelection(block.id, e.currentTarget)}
                      onBlur={(e) => rememberSelection(block.id, e.currentTarget)}
                      placeholder={PLACEHOLDERS[block.type]}
                      className={`w-full py-1.5 bg-transparent outline-none resize-none overflow-hidden ${textClassFor(block.type)}`}
                      style={block.type === "callout" ? { color: "#1e40af" } : undefined}
                    />
                  </div>
                </div>
              )}

              {isActive && block.type !== "image" && (
                // Hàng 1 — đổi KIỂU DÒNG.
                <div className="flex items-center gap-1 flex-wrap pt-1.5">
                  {TEXT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => changeType(index, t.id)}
                      title={t.hint}
                      aria-label={t.hint}
                      className="w-8 h-8 rounded-lg text-xs font-bold border flex items-center justify-center"
                      style={
                        block.type === t.id
                          ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "#fff" }
                          : { background: "#fff", borderColor: "#e2e8f0", color: "#475569" }
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {isActive && block.type !== "image" && (
                // Hàng 2 — định dạng ĐOẠN CHỮ ĐANG CHỌN. Bấm khi chưa chọn chữ nào thì chèn sẵn cặp
                // dấu và đặt con trỏ vào giữa để gõ tiếp.
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {MARK_BUTTONS.map((m) => (
                    <button
                      key={m.kind}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyMark(block, m.kind)}
                      title={m.hint}
                      aria-label={m.hint}
                      className="w-8 h-8 rounded-lg text-[13px] border flex items-center justify-center"
                      style={{ background: "#fff", borderColor: "#e2e8f0", color: "#334155", ...m.style }}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setLinkPickerFor(linkPickerFor === block.id ? null : block.id)
                      setLinkQuery("")
                    }}
                    title="Liên kết tới bài khác"
                    aria-label="Liên kết tới bài khác"
                    disabled={linkTargets.length === 0}
                    className="w-8 h-8 rounded-lg text-[13px] border flex items-center justify-center"
                    style={
                      linkPickerFor === block.id
                        ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "#fff" }
                        : { background: "#fff", borderColor: "#e2e8f0", color: linkTargets.length === 0 ? "#cbd5e1" : "#334155" }
                    }
                  >
                    🔗
                  </button>
                </div>
              )}

              {isActive && linkPickerFor === block.id && (
                <div className="mt-1.5 rounded-xl border overflow-hidden fade-in" style={{ borderColor: "#dbeafe", background: "#f8fafc" }}>
                  <input
                    value={linkQuery}
                    onChange={(e) => setLinkQuery(e.target.value)}
                    placeholder="Tìm bài để liên kết…"
                    className="w-full px-3 py-2 text-xs outline-none border-b"
                    style={{ borderColor: "#e2e8f0", background: "#fff" }}
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {linkTargets
                      .filter((t) => t.label.toLowerCase().includes(linkQuery.trim().toLowerCase()))
                      .slice(0, 30)
                      .map((t) => (
                        <button
                          key={t.target}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyLink(block, t)}
                          className="w-full text-left px-3 py-2 border-b last:border-0 flex items-center gap-2"
                          style={{ borderColor: "#f1f5f9" }}
                        >
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-none" style={{ background: "#eff6ff", color: "var(--c-primary)" }}>
                            {t.group}
                          </span>
                          <span className="text-xs text-slate-700 truncate">{t.label}</span>
                        </button>
                      ))}
                    {linkTargets.filter((t) => t.label.toLowerCase().includes(linkQuery.trim().toLowerCase())).length === 0 && (
                      <p className="px-3 py-2.5 text-xs text-slate-400">Không tìm thấy bài nào khớp.</p>
                    )}
                  </div>
                </div>
              )}

              {isActive && (
                // Hàng 3 — chèn ảnh, đổi thứ tự, xoá dòng.
                <div className="flex items-center gap-1 flex-wrap py-1.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => requestImageAt(index + 1)}
                    disabled={busy}
                    className="h-8 px-2.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1"
                    style={{ background: "#eff6ff", borderColor: "#dbeafe", color: "var(--c-primary)" }}
                  >
                    {busy ? "Đang xử lý…" : "＋ Ảnh"}
                  </button>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    aria-label="Chuyển lên trên"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm"
                    style={{ background: "#fff", borderColor: "#e2e8f0", color: index === 0 ? "#cbd5e1" : "#475569" }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label="Chuyển xuống dưới"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm"
                    style={{
                      background: "#fff",
                      borderColor: "#e2e8f0",
                      color: index === blocks.length - 1 ? "#cbd5e1" : "#475569",
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeAt(index)}
                    aria-label="Xoá dòng này"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold"
                    style={{ background: "#fef2f2", borderColor: "#fee2e2", color: "#dc2626" }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex gap-2 pt-1 pb-1">
          <button
            type="button"
            onClick={() => insertTextBlockAfter(blocks.length - 1)}
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold border"
            style={{ background: "#fff", borderColor: "#e2e8f0", color: "#64748b" }}
          >
            ＋ Thêm dòng
          </button>
          <button
            type="button"
            onClick={() => requestImageAt(blocks.length)}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold border"
            style={{ background: "#eff6ff", borderColor: "#dbeafe", color: "var(--c-primary)" }}
          >
            {busy ? "Đang xử lý ảnh…" : "＋ Ảnh ở cuối"}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      {error && (
        <p className="text-[11px] mt-2" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
        Chạm vào một dòng để hiện thanh công cụ: hàng trên đổi kiểu dòng (văn bản, tiêu đề mục, gạch
        đầu dòng, đánh số, trích dẫn, điểm chính), hàng giữa định dạng đoạn chữ đang bôi đen (đậm,
        nghiêng, gạch chân, tô sáng, liên kết tới bài khác), hàng dưới chèn ảnh / đổi thứ tự / xoá.
        Ảnh được tự động thu nhỏ trước khi lưu để không chiếm quá nhiều dung lượng máy.
      </p>
    </div>
  )
}
