// Định dạng chữ TRONG một dòng (đậm / nghiêng / gạch chân / tô sáng / liên kết tới bài khác).
//
// Cách lưu: dùng dấu đánh dấu ngay trong chuỗi text của block, kiểu Markdown —
//   **đậm**  *nghiêng*  __gạch chân__  ==tô sáng==  [[article:mi|chữ hiện ra]]
// Vì sao không dùng contentEditable như Notion thật: trên iOS, contentEditable rất hay lỗi con trỏ,
// lỗi bàn phím và lỗi dán nội dung; giữ nguyên <textarea> đơn giản, đáng tin cậy hơn nhiều, mà vẫn
// định dạng được bằng cách bọc dấu quanh phần chữ đang chọn. Dữ liệu lưu ra cũng là văn bản thuần,
// đọc được bằng mắt trong file sao lưu JSON.

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "underline"; text: string }
  | { kind: "highlight"; text: string }
  // target dạng "<loại>:<id>", vd "article:mi", "custom:custom-123", "ecg:custom-ecg-1"
  | { kind: "link"; text: string; target: string }

// Thứ tự các nhánh trong regex có ý nghĩa: `**` phải đứng trước `*`, còn `[[...]]` đứng đầu để dấu
// định dạng nằm trong phần chữ của liên kết không bị tách ra.
const INLINE_RE = /\[\[([^\]|]+)\|([^\]]*)\]\]|\*\*([^*]+)\*\*|__([^_]+)__|==([^=]+)==|\*([^*]+)\*/g

export function parseInline(input: string): InlineToken[] {
  const out: InlineToken[] = []
  let last = 0
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(input)) !== null) {
    if (m.index > last) out.push({ kind: "text", text: input.slice(last, m.index) })
    if (m[1] != null) out.push({ kind: "link", target: m[1], text: m[2] || m[1] })
    else if (m[3] != null) out.push({ kind: "bold", text: m[3] })
    else if (m[4] != null) out.push({ kind: "underline", text: m[4] })
    else if (m[5] != null) out.push({ kind: "highlight", text: m[5] })
    else if (m[6] != null) out.push({ kind: "italic", text: m[6] })
    last = m.index + m[0].length
  }
  if (last < input.length) out.push({ kind: "text", text: input.slice(last) })
  return out
}

// Bỏ hết dấu định dạng — dùng khi cần văn bản thuần (tóm tắt tự động, mục lục, đếm chữ, tìm kiếm).
export function stripInlineMarkers(input: string): string {
  return parseInline(input)
    .map((t) => t.text)
    .join("")
}

export type InlineMarkKind = "bold" | "italic" | "underline" | "highlight"

export const INLINE_MARKS: Record<InlineMarkKind, string> = {
  bold: "**",
  italic: "*",
  underline: "__",
  highlight: "==",
}

// Đếm số ký tự `ch` liên tiếp ở CUỐI/ĐẦU chuỗi — dùng để phân biệt đúng "*" (nghiêng) với "**" (đậm):
// cả hai dấu đều dùng ký tự '*', nên chỉ check endsWith/startsWith không đủ — "**đậm**".endsWith("*")
// vẫn đúng, khiến toggle nghiêng tưởng nhầm đang đứng ngay sau dấu nghiêng rồi bóc một dấu '*' của
// cặp đậm, biến "**đậm**" thành "*đậm*" (mất đậm thay vì thêm nghiêng).
function trailingRunLength(str: string, ch: string): number {
  let n = 0
  for (let i = str.length - 1; i >= 0 && str[i] === ch; i--) n++
  return n
}
function leadingRunLength(str: string, ch: string): number {
  let n = 0
  for (let i = 0; i < str.length && str[i] === ch; i++) n++
  return n
}

// Bọc (hoặc bỏ bọc) phần chữ đang chọn bằng dấu định dạng, trả về chuỗi mới kèm vị trí con trỏ để
// màn hình đặt lại — nhờ vậy bấm "B" hai lần là quay về chữ thường, giống mọi trình soạn thảo khác.
export function toggleMarkAt(
  value: string,
  selStart: number,
  selEnd: number,
  kind: InlineMarkKind,
): { text: string; selStart: number; selEnd: number } {
  const mark = INLINE_MARKS[kind]
  const len = mark.length
  const markChar = mark[0]
  const before = value.slice(0, selStart)
  const selected = value.slice(selStart, selEnd)
  const after = value.slice(selEnd)

  // Đang được bọc sẵn (dấu nằm ngay ngoài vùng chọn) → bỏ bọc. Đếm ĐÚNG số ký tự dấu liền kề (không
  // chỉ endsWith/startsWith) để không nhầm dấu đậm "**" với dấu nghiêng "*".
  if (trailingRunLength(before, markChar) === len && leadingRunLength(after, markChar) === len) {
    return {
      text: before.slice(0, -len) + selected + after.slice(len),
      selStart: selStart - len,
      selEnd: selEnd - len,
    }
  }
  // Vùng chọn bao gồm cả dấu ở hai đầu → bỏ bọc. Cùng lý do trên: đếm đúng số dấu, không chỉ startsWith.
  if (
    selected.length >= len * 2 &&
    leadingRunLength(selected, markChar) === len &&
    trailingRunLength(selected, markChar) === len
  ) {
    const inner = selected.slice(len, -len)
    return { text: before + inner + after, selStart, selEnd: selStart + inner.length }
  }
  // Chưa chọn chữ nào → chèn cặp dấu rỗng và để con trỏ vào giữa để gõ tiếp.
  if (selStart === selEnd) {
    return { text: before + mark + mark + after, selStart: selStart + len, selEnd: selStart + len }
  }
  return { text: before + mark + selected + mark + after, selStart: selStart + len, selEnd: selEnd + len }
}

// Chèn một liên kết tới bài khác vào vị trí con trỏ; nếu đang chọn chữ thì lấy chữ đó làm nhãn.
export function insertLinkAt(
  value: string,
  selStart: number,
  selEnd: number,
  target: string,
  fallbackLabel: string,
): { text: string; selStart: number; selEnd: number } {
  const selected = value.slice(selStart, selEnd)
  const label = selected.trim() || fallbackLabel
  const snippet = `[[${target}|${label}]]`
  return {
    text: value.slice(0, selStart) + snippet + value.slice(selEnd),
    selStart: selStart + snippet.length,
    selEnd: selStart + snippet.length,
  }
}
