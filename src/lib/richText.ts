// Định dạng chữ TRONG một dòng (đậm / nghiêng / gạch chân / tô sáng / liên kết tới bài khác / và từ
// đây thêm cỡ chữ / màu chữ / font — xem khối "styled" bên dưới).
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
  // Một đoạn mang MỘT HAY NHIỀU thuộc tính CÙNG LÚC (vd vừa đậm vừa đỏ vừa cỡ lớn) — năm kiểu ở trên
  // chỉ mang được đúng một thuộc tính mỗi token nên không kết hợp được, xem StyleAttrs/{{...}} bên
  // dưới. `bold`/`italic`/`underline`/`highlight` giữ true khi có, KHÔNG có nghĩa là false khi vắng
  // mặt (vắng mặt = "không đặt", không phải "tắt") — cùng quy ước với `color`/`size`/`font`.
  | ({ kind: "styled"; text: string } & StyleAttrs)

export interface StyleAttrs {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  highlight?: boolean
  color?: string
  size?: "sm" | "lg"
  font?: string
}

// Font hợp lệ cho `f=`. "sans" (mặc định, không đặt `f` khi đây là lựa chọn) không nằm trong danh
// sách vì nó chính là KHÔNG có thuộc tính font — không cần một mã riêng cho "mặc định".
export const STYLE_FONTS = ["serif", "mono", "display"] as const
export type StyleFont = (typeof STYLE_FONTS)[number]

const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

// Thứ tự các nhánh trong regex có ý nghĩa: `**` phải đứng trước `*`, còn `[[...]]`/`{{...}}` đứng
// đầu để dấu định dạng nằm TRONG phần chữ của liên kết/đoạn định dạng kết hợp không bị tách ra giữa
// chừng. `{{...}}` dùng lối "loại ký tự bị cấm trong nội dung" giống `[[...]]` (không escape, không
// backtrack — không có bề mặt ReDoS): bên trong KHÔNG được chứa `{`, `}`, `|` — ba ký tự đó trở
// thành ký tự dành riêng bên trong một đoạn định dạng kết hợp.
const INLINE_RE =
  /\[\[([^\]|]+)\|([^\]]*)\]\]|\{\{([^{}|]*)\|([^{}]*)\}\}|\*\*([^*]+)\*\*|__([^_]+)__|==([^=]+)==|\*([^*]+)\*/g

// Đọc chuỗi thuộc tính bên trong `{{...|`: cờ đứng riêng (b/i/u/h), thuộc tính có giá trị dạng
// key=value (c=#hex, s=sm|lg, f=serif|mono|display). Không dùng regex thứ hai — tách bằng
// split khoảng trắng rồi indexOf("=") là đủ và không có bề mặt ReDoS nào để lo. Token lạ/giá trị
// lạ thì BỎ QUA (không lỗi) — tương thích xuôi nếu sau này thêm thuộc tính mới mà bản cũ chưa biết.
function parseAttrs(raw: string): StyleAttrs {
  const attrs: StyleAttrs = {}
  raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((tok) => {
      const eq = tok.indexOf("=")
      if (eq === -1) {
        if (tok === "b") attrs.bold = true
        else if (tok === "i") attrs.italic = true
        else if (tok === "u") attrs.underline = true
        else if (tok === "h") attrs.highlight = true
        return
      }
      const key = tok.slice(0, eq)
      const val = tok.slice(eq + 1)
      if (key === "c" && COLOR_RE.test(val)) attrs.color = val.toLowerCase()
      else if (key === "s" && (val === "sm" || val === "lg")) attrs.size = val
      else if (key === "f" && (STYLE_FONTS as readonly string[]).includes(val)) attrs.font = val as StyleFont
    })
  return attrs
}

// Chiều ngược lại parseAttrs — thứ tự PHẢI cố định (b i u h c= s= f=) để cùng một tổ hợp thuộc tính
// luôn in ra đúng một chuỗi duy nhất, không phụ thuộc thứ tự người dùng bấm các nút định dạng.
function serializeAttrs(attrs: StyleAttrs): string {
  const parts: string[] = []
  if (attrs.bold) parts.push("b")
  if (attrs.italic) parts.push("i")
  if (attrs.underline) parts.push("u")
  if (attrs.highlight) parts.push("h")
  if (attrs.color) parts.push(`c=${attrs.color}`)
  if (attrs.size) parts.push(`s=${attrs.size}`)
  if (attrs.font) parts.push(`f=${attrs.font}`)
  return parts.join(" ")
}

function hasAnyAttr(attrs: StyleAttrs): boolean {
  return !!(attrs.bold || attrs.italic || attrs.underline || attrs.highlight || attrs.color || attrs.size || attrs.font)
}

export function parseInline(input: string): InlineToken[] {
  const out: InlineToken[] = []
  let last = 0
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(input)) !== null) {
    if (m.index > last) out.push({ kind: "text", text: input.slice(last, m.index) })
    if (m[1] != null) out.push({ kind: "link", target: m[1], text: m[2] || m[1] })
    else if (m[3] != null) out.push({ kind: "styled", text: m[4], ...parseAttrs(m[3]) })
    else if (m[5] != null) out.push({ kind: "bold", text: m[5] })
    else if (m[6] != null) out.push({ kind: "underline", text: m[6] })
    else if (m[7] != null) out.push({ kind: "highlight", text: m[7] })
    else if (m[8] != null) out.push({ kind: "italic", text: m[8] })
    last = m.index + m[0].length
  }
  if (last < input.length) out.push({ kind: "text", text: input.slice(last) })
  return out
}

// Bỏ hết dấu định dạng — dùng khi cần văn bản thuần (tóm tắt tự động, mục lục, đếm chữ, tìm kiếm).
// Mọi kiểu token (kể cả "styled" mới) đều có `.text`, nên không cần một nhánh riêng cho kiểu mới.
export function stripInlineMarkers(input: string): string {
  return parseInline(input)
    .map((t) => t.text)
    .join("")
}

export type InlineMarkKind = "bold" | "italic" | "underline" | "highlight"
const LEGACY_BOOL_KINDS: InlineMarkKind[] = ["bold", "italic", "underline", "highlight"]

export const INLINE_MARKS: Record<InlineMarkKind, string> = {
  bold: "**",
  italic: "*",
  underline: "__",
  highlight: "==",
}

// ─── Định vị đoạn chữ đang khớp ──────────────────────────────────────────────
//
// applyStyleAt (bên dưới) cần biết: vùng đang chọn có NẰM KHÍT vào phần CHỮ của một token đã có sẵn
// hay không — có thì GỘP thuộc tính mới vào token đó thay vì bọc chồng một lớp mới lên trên (bọc
// chồng `{{...}}` vào bên trong `**...**` sẽ khiến `\*\*([^*]+)\*\*` nuốt trọn cả `{{...}}` làm chữ
// thường, hiện dấu `{{}}` trần ra màn hình — lỗi âm thầm, không phải lỗi cú pháp).
//
// Không dùng cờ `d`/`hasIndices` của RegExp (cần lib ES2022, tsconfig hiện ở ES2020) — tính offset
// bằng tay theo ĐỘ DÀI CỐ ĐỊNH của phần mở đầu mỗi nhánh (`**`, `__`, `==`, `*`, hoặc `{{attrs|`,
// `[[target|`) là đủ và không cần bump target.
interface EnclosingMatch {
  kind: "link" | "styled" | InlineMarkKind
  matchStart: number
  matchEnd: number
  textStart: number
  textEnd: number
  rawAttrs?: string
}

function findEnclosingMatch(value: string, selStart: number, selEnd: number): EnclosingMatch | null {
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(value)) !== null) {
    const matchStart = m.index
    const matchEnd = matchStart + m[0].length
    let hit: EnclosingMatch | null = null
    if (m[1] != null) {
      const textStart = matchStart + 2 + m[1].length + 1
      hit = { kind: "link", matchStart, matchEnd, textStart, textEnd: textStart + m[2].length }
    } else if (m[3] != null) {
      const textStart = matchStart + 2 + m[3].length + 1
      hit = { kind: "styled", matchStart, matchEnd, textStart, textEnd: textStart + m[4].length, rawAttrs: m[3] }
    } else if (m[5] != null) {
      hit = { kind: "bold", matchStart, matchEnd, textStart: matchStart + 2, textEnd: matchStart + 2 + m[5].length }
    } else if (m[6] != null) {
      hit = { kind: "underline", matchStart, matchEnd, textStart: matchStart + 2, textEnd: matchStart + 2 + m[6].length }
    } else if (m[7] != null) {
      hit = { kind: "highlight", matchStart, matchEnd, textStart: matchStart + 2, textEnd: matchStart + 2 + m[7].length }
    } else if (m[8] != null) {
      hit = { kind: "italic", matchStart, matchEnd, textStart: matchStart + 1, textEnd: matchStart + 1 + m[8].length }
    }
    if (!hit) continue
    // Chọn ĐÚNG phần chữ bên trong (không kèm dấu) — trường hợp thường gặp nhất.
    if (hit.textStart === selStart && hit.textEnd === selEnd) return hit
    // HOẶC chọn CẢ dấu lẫn chữ (vd bôi đen nguyên "**đậm**") — chỉ áp dụng cho 4 kiểu dấu đơn giản
    // cũ (bold/italic/underline/highlight); "styled"/"link" dùng dấu dài/lồng phức tạp hơn, bôi đen
    // trọn vẹn kiểu đó là chuyện hiếm và không đáng thêm rủi ro xử lý sai.
    if (LEGACY_BOOL_KINDS.includes(hit.kind as InlineMarkKind) && hit.matchStart === selStart && hit.matchEnd === selEnd) {
      return hit
    }
  }
  return null
}

// Đơn giản hoá khi kết quả gộp chỉ còn ĐÚNG một cờ boolean, không màu/cỡ/font: dùng lại dấu markdown
// cũ (`**`/`*`/`__`/`==`) thay vì `{{...}}` — để định dạng đơn giản vẫn ra đúng chuỗi ngắn gọn như
// trước, `{{...}}` chỉ xuất hiện khi THẬT SỰ cần kết hợp nhiều thuộc tính trên cùng một đoạn.
function singleBooleanKind(attrs: StyleAttrs): InlineMarkKind | null {
  if (attrs.color || attrs.size || attrs.font) return null
  const flags = LEGACY_BOOL_KINDS.filter((k) => attrs[k])
  return flags.length === 1 ? flags[0] : null
}

function replaceSpan(
  value: string,
  spanStart: number,
  spanEnd: number,
  attrs: StyleAttrs,
  text: string,
): { text: string; selStart: number; selEnd: number } {
  let snippet: string
  let textOffset: number
  if (!hasAnyAttr(attrs)) {
    // Gộp xong không còn thuộc tính nào (vd bấm đậm lần hai để bỏ đậm, không còn gì khác) → về hẳn
    // chữ thường, không để lại span rỗng kiểu `{{|chữ}}` — cái đó vừa vô nghĩa vừa phá vỡ tiêu chí
    // "đọc được bằng mắt trong file sao lưu" mà module này đặt ra từ đầu.
    snippet = text
    textOffset = 0
  } else {
    const single = singleBooleanKind(attrs)
    if (single) {
      const mark = INLINE_MARKS[single]
      snippet = mark + text + mark
      textOffset = mark.length
    } else {
      const attrsStr = serializeAttrs(attrs)
      snippet = `{{${attrsStr}|${text}}}`
      textOffset = 2 + attrsStr.length + 1
    }
  }
  return {
    text: value.slice(0, spanStart) + snippet + value.slice(spanEnd),
    selStart: spanStart + textOffset,
    selEnd: spanStart + textOffset + text.length,
  }
}

// Gộp `patch` vào `current`: cờ boolean có mặt trong patch (giá trị luôn là `true` — sự CÓ MẶT của
// khoá mới là tín hiệu "đảo cờ này", không phải giá trị true/false của nó) thì ĐẢO (đang bật → tắt,
// đang tắt → bật) — đúng hành vi "bấm nút đậm hai lần thì hết đậm" mà mọi trình soạn thảo có. Thuộc
// tính có giá trị (color/size/font): đặt CÙNG giá trị đang có → xoá (bấm lại đúng màu đang chọn để
// bỏ màu), khác giá trị → ghi đè. Chuỗi RỖNG ("") là dấu hiệu riêng "XOÁ LUÔN bất kể đang là gì" —
// dùng cho nút "Mặc định" của font, nơi người bấm không cần biết/nhớ font hiện tại là gì mới xoá
// được (khác với "bấm lại đúng giá trị đang chọn", vốn đòi phải biết trước giá trị đó).
function mergePatch(current: StyleAttrs, patch: Partial<StyleAttrs>): StyleAttrs {
  const next: StyleAttrs = { ...current }
  if (patch.bold !== undefined) next.bold = current.bold ? undefined : true
  if (patch.italic !== undefined) next.italic = current.italic ? undefined : true
  if (patch.underline !== undefined) next.underline = current.underline ? undefined : true
  if (patch.highlight !== undefined) next.highlight = current.highlight ? undefined : true
  if (patch.color !== undefined) {
    // Chuẩn hoá về chữ thường TRƯỚC khi so/lưu — parseAttrs() cũng lowercase khi đọc lại một span
    // đã có sẵn (xem COLOR_RE bên trên), trong khi patch tới từ bảng màu (NODE_COLORS) giữ nguyên
    // hoa/thường gốc (vd "#D44C47"). Không chuẩn hoá thì bấm lại ĐÚNG màu đang chọn để bỏ màu sẽ so
    // "#d44c47" (đã lưu) với "#D44C47" (patch) ra khác nhau, và không bao giờ bỏ được.
    const c = patch.color === "" ? "" : patch.color.toLowerCase()
    next.color = c === "" || current.color === c ? undefined : c
  }
  if (patch.size !== undefined) next.size = current.size === patch.size ? undefined : patch.size
  if (patch.font !== undefined) next.font = patch.font === "" || current.font === patch.font ? undefined : (patch.font as StyleFont)
  return next
}

// Lõi DUY NHẤT cho mọi thao tác định dạng — B/I/U/tô sáng CŨ (qua toggleMarkAt bên dưới) và
// màu/cỡ/font MỚI đều đi qua đúng hàm này. Bắt buộc phải chung một lõi: nếu để hai đường xử lý song
// song (một cho {{...}} mới, một cho **/__ cũ không biết gì về {{...}}) thì bấm nút cũ trên một đoạn
// đã có {{...}} sẽ bọc chồng lên nhau, sinh ra đúng lỗi "dấu {{}} lộ ra ngoài" nói ở trên nhưng theo
// chiều ngược lại.
export function applyStyleAt(
  value: string,
  selStart: number,
  selEnd: number,
  patch: Partial<StyleAttrs>,
): { text: string; selStart: number; selEnd: number } {
  const hit = findEnclosingMatch(value, selStart, selEnd)

  if (hit?.kind === "link") {
    // Không hỗ trợ định dạng ĐÈ lên đúng phần chữ hiển thị của một liên kết — bọc `{{...}}` vào
    // trong `[[target|...]]` vẫn PARSE được (do đó không phá dữ liệu) nhưng chữ dấu `{{}}` sẽ hiện
    // trần ra thay vì được diễn giải, cùng một lớp lỗi với việc lồng vào bold/italic. An toàn hơn là
    // không làm gì — nút bấm liên quan nên tự vô hiệu khi vùng chọn rơi đúng vào một liên kết.
    return { text: value, selStart, selEnd }
  }

  if (hit) {
    const current: StyleAttrs = hit.kind === "styled" ? parseAttrs(hit.rawAttrs ?? "") : { [hit.kind]: true }
    const merged = mergePatch(current, patch)
    return replaceSpan(value, hit.matchStart, hit.matchEnd, merged, value.slice(hit.textStart, hit.textEnd))
  }

  // Không khớp khít bất kỳ token nào — vùng chọn nằm trên chữ thường, HOẶC đè lên/cắt ngang nhiều
  // token khác nhau (lệch biên). Vùng chọn chứa `{`, `}`, `|` hoặc mở đầu một liên kết `[[` thì
  // KHÔNG áp dụng gì: bọc đè lên đó có thể nuốt mất một liên kết trọn vẹn (chữ liên kết vẫn hợp lệ
  // trong phần "chữ" của {{...}} vì nhóm bắt chữ của {{...}} không cấm `[`/`]`) hoặc phá cấu trúc
  // một span khác đang nằm bên trong vùng chọn — mất dữ liệu ÂM THẦM còn tệ hơn không làm gì cả.
  const raw = value.slice(selStart, selEnd)
  if (/[{}|]/.test(raw) || raw.includes("[[")) {
    return { text: value, selStart, selEnd }
  }
  // Qua ĐÚNG mergePatch() như nhánh có sẵn span ở trên (current = rỗng, coi như "chưa có gì để gộp
  // vào") thay vì dùng thẳng `patch` — nếu không, việc chuẩn hoá (chữ thường hoá màu, xem mergePatch)
  // chỉ chạy trên đoạn ĐÃ có định dạng sẵn mà bỏ sót lần áp dụng ĐẦU TIÊN trên chữ thường.
  return replaceSpan(value, selStart, selEnd, mergePatch({}, patch), raw)
}

// Bọc (hoặc bỏ bọc) phần chữ đang chọn bằng dấu định dạng, trả về chuỗi mới kèm vị trí con trỏ để
// màn hình đặt lại — nhờ vậy bấm "B" hai lần là quay về chữ thường, giống mọi trình soạn thảo khác.
// Chỉ còn là một lớp mỏng gọi applyStyleAt() — xem lý do "phải chung một lõi" ở ghi chú của hàm đó.
export function toggleMarkAt(
  value: string,
  selStart: number,
  selEnd: number,
  kind: InlineMarkKind,
): { text: string; selStart: number; selEnd: number } {
  return applyStyleAt(value, selStart, selEnd, { [kind]: true })
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
