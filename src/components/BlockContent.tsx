// Hiển thị (chỉ đọc) nội dung dạng block của bài viết tự nhập và bài học ECG — chữ và ảnh xen kẽ
// đúng thứ tự người dùng đã soạn, kèm định dạng nội dòng (đậm/nghiêng/gạch chân/tô sáng/liên kết).
// Cặp đôi với BlockEditor.tsx (phần soạn thảo).
import type { ReactNode } from "react"
import type { ContentBlock } from "../data/types"
import { parseInline } from "../lib/richText"

// Một đoạn chữ đã áp dụng định dạng nội dòng. Dùng React node thay vì đổ HTML thô
// (dangerouslySetInnerHTML) để nội dung người dùng tự nhập không bao giờ chạy được thẻ/mã lạ, và
// để liên kết tới bài khác gắn được onClick thật.
function InlineText({ text, onOpenLink }: { text: string; onOpenLink?: (target: string) => void }) {
  return (
    <>
      {parseInline(text).map((tok, i) => {
        switch (tok.kind) {
          case "bold":
            return (
              <strong key={i} className="font-bold text-slate-900">
                {tok.text}
              </strong>
            )
          case "italic":
            return (
              <em key={i} className="italic">
                {tok.text}
              </em>
            )
          case "underline":
            return (
              <span key={i} style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>
                {tok.text}
              </span>
            )
          case "highlight":
            return (
              <mark key={i} className="rounded px-0.5" style={{ background: "var(--c-mark-bg)", color: "var(--c-mark-fg)" }}>
                {tok.text}
              </mark>
            )
          case "link":
            return (
              <button
                key={i}
                type="button"
                onClick={() => onOpenLink?.(tok.target)}
                className="font-semibold underline decoration-dotted underline-offset-2"
                style={{ color: "var(--c-primary)" }}
              >
                {tok.text}
              </button>
            )
          // "styled" (cỡ chữ/màu/font, xem richText.ts) chưa có nút bấm riêng trong trình soạn bài
          // viết — rơi vào đây, hiện đúng CHỮ THUẦN, không lỗi. Kiểu "text" cũng qua đây.
          default:
            return <span key={i}>{tok.text}</span>
        }
      })}
    </>
  )
}

// Số thứ tự của các dòng "numbered": đếm lại từ 1 mỗi khi chuỗi dòng đánh số bị ngắt bởi một dòng
// khác loại — giống cách Notion/Word xử lý, để hai danh sách rời nhau không dùng chung dãy số.
function numberingFor(blocks: ContentBlock[]): (number | null)[] {
  let n = 0
  return blocks.map((b) => {
    if (b.type !== "numbered") {
      n = 0
      return null
    }
    n += 1
    return n
  })
}

export function BlockContent({
  blocks,
  onOpenLink,
  headingRefs,
}: {
  blocks: ContentBlock[]
  onOpenLink?: (target: string) => void
  // Nơi màn hình đọc bài gắn ref cho từng tiêu đề để mục lục cuộn tới được.
  headingRefs?: (id: string, el: HTMLElement | null) => void
}) {
  if (blocks.length === 0) return null
  const numbers = numberingFor(blocks)

  return (
    <div className="mt-4">
      {blocks.map((block, idx) => {
        const inline: ReactNode = <InlineText text={block.text ?? ""} onOpenLink={onOpenLink} />
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={block.id}
                ref={(el) => headingRefs?.(block.id, el)}
                className="text-[17px] font-bold text-slate-900 mt-6 mb-2 pb-1.5 border-b leading-snug scroll-mt-4"
                style={{ borderColor: "var(--c-line)" }}
              >
                {inline}
              </h2>
            )
          case "bullet":
            return (
              <div key={block.id} className="flex gap-2.5 mt-1.5">
                <span className="flex-none mt-[9px] w-1.5 h-1.5 rounded-full" style={{ background: "var(--c-muted)" }} />
                <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap flex-1">{inline}</p>
              </div>
            )
          case "numbered":
            return (
              <div key={block.id} className="flex gap-2.5 mt-1.5">
                <span
                  className="flex-none mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
                >
                  {numbers[idx]}
                </span>
                <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap flex-1">{inline}</p>
              </div>
            )
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="mt-3 pl-3 border-l-2 text-[14px] text-slate-600 italic leading-relaxed whitespace-pre-wrap"
                style={{ borderColor: "var(--c-primary)" }}
              >
                {inline}
              </blockquote>
            )
          case "callout":
            return (
              <div
                key={block.id}
                className="mt-4 p-4 rounded-2xl"
                style={{ background: "var(--c-primary-soft)", border: "1.5px solid var(--c-primary-line)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--c-primary-strong)" }}>
                  Điểm chính
                </p>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--c-text-2)" }}>
                  {inline}
                </p>
              </div>
            )
          case "image":
            return (
              <figure key={block.id} className="m-0 mt-4">
                <img
                  src={block.dataUrl}
                  // alt="" chỉ đúng cho ảnh THUẦN TRANG TRÍ — ảnh chèn trong bài KHÔNG có chú thích
                  // vẫn mang nội dung thật, chỉ là chưa được mô tả bằng chữ. Rơi về "" khiến trình đọc
                  // màn hình bỏ qua hẳn ảnh, coi như bài không hề có hình đó.
                  alt={block.caption || "Hình ảnh trong bài"}
                  className="w-full rounded-2xl border"
                  style={{ borderColor: "var(--c-line)" }}
                />
                {block.caption && (
                  <figcaption className="text-xs text-slate-400 mt-1.5 text-center">{block.caption}</figcaption>
                )}
              </figure>
            )
          default:
            return (
              <p key={block.id} className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap mt-3">
                {inline}
              </p>
            )
        }
      })}
    </div>
  )
}
