// Bảng Sơ đồ tư duy kiểu GoodNotes — canvas vô hạn, vẽ tay tự do, ghi chú và ảnh di chuyển được.
//
// Công cụ: tay (di chuyển bảng & ghi chú), bút mực, bút dạ, tẩy, hình vẽ (đường/mũi tên/khung/vòng),
// và nối hai ghi chú. Thêm được thẻ ghi chú (nhiều màu, 3 kiểu, 3 cỡ chữ), nhánh con tự đặt vị trí,
// và ảnh dán trên bảng (kéo để di chuyển, kéo góc để đổi cỡ). Xuất được cả bảng ra ảnh PNG.
//
// Cách nhận cử chỉ (quan trọng trên iPhone):
// - MỘT ngón: làm việc theo công cụ đang chọn (vẽ / kéo bảng / kéo ghi chú / nối).
// - HAI ngón: luôn là phóng-thu + kéo bảng, bất kể đang chọn công cụ nào — giống GoodNotes, nhờ vậy
//   đang vẽ vẫn zoom được ngay mà không phải đổi công cụ. Nét đang vẽ dở bị bỏ khi ngón thứ hai đặt
//   xuống, để không để lại vệt mực do zoom.
// - Chạm hai lần nhanh vào chỗ trống: phóng to gấp đôi quanh đúng chỗ vừa chạm, chạm lại thì về 100%.
// - Vẩy tay rồi nhấc: bảng trôi thêm rồi dừng dần (đà quán tính), không dừng khựng lại.
//
// ─── Vì sao phần lớn thao tác KHÔNG đi qua state của React ────────────────────
// Bản trước giữ pan/zoom và cả nét đang vẽ trong state, nên mỗi sự kiện di chuyển ngón tay (60–120
// lần/giây) dựng lại toàn bộ cây React của bảng: kéo bảng bị rít, nét vẽ chạy chậm sau ngón tay. Nay
// pan/zoom nằm trong `view` (useRef) và được ghi thẳng vào `style.transform` của lớp nội dung; nét
// đang vẽ ghi thẳng vào thuộc tính `d` của một <path> có sẵn; kéo thẻ/ảnh ghi thẳng vào style của
// đúng phần tử đó. React chỉ dựng lại khi dữ liệu bảng thật sự đổi (thả tay xong) — nghĩa là một
// lần cho mỗi thao tác, thay vì hàng trăm lần.
// `flushSync` được dùng ở đúng thời điểm thả tay: nó ghi dữ liệu mới vào DOM ngay trong sự kiện, nhờ
// vậy xoá được style tạm mà không có khung hình nào nội dung bị nhảy chỗ hay biến mất.
//
// Toạ độ lưu trong dữ liệu là toạ độ TRÊN BẢNG (không phụ thuộc pan/zoom), nên phóng to thu nhỏ hay
// đổi thiết bị vẫn đúng vị trí.
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { flushSync } from "react-dom"
import type {
  MindDash,
  MindEdge,
  MindImage,
  MindNode,
  MindNodeSize,
  MindNodeStyle,
  MindStroke,
  MindmapData,
} from "../data/types"
import { fileToResizedDataUrl } from "../lib/imageResize"
import { tickHaptic } from "../lib/haptics"
import {
  NODE_FALLBACK,
  ancestorsOf,
  boxCenterInside,
  branchPosition,
  childrenMap,
  contentBounds,
  descendantsOf,
  edgeDistance,
  edgeGeometry,
  edgeKey,
  densify,
  hiddenByCollapse,
  layoutSubtree,
  markErased,
  nodeBox,
  shapePoints,
  strokeHit,
  strokeMostlyInside,
  strokeOutline,
  strokePath,
  surviveFragments,
  type ShapeKind,
  type StrokeFragment,
} from "../lib/mindmapGeometry"
import {
  PointerSmoother,
  coalescedSamples,
  initInkWidth,
  nextInkWidth,
  taperTail,
  type InkWidthState,
} from "../lib/ink"
import { SHAPE_LABELS, recognizeShape, type Recognized } from "../lib/shapeRecognize"
import {
  ALGORITHM_EDGE_COLOR,
  AUTO_COLORS,
  EDGE_COLOR,
  HIGHLIGHT_PALETTE,
  INK_PALETTE,
  MIX_GRID,
  NODE_COLORS,
  PAPER_BG,
  PAPER_LABELS,
  PAPER_STEP,
  PAPER_TONES,
  colorName,
  edgeColor,
  NODE_FONT_STACK,
  nodeMetrics,
  nodePaint,
  paperBackground,
  paperTone,
  luminance,
  STROKE_LAYERS,
  strokeAlpha,
  strokeCap,
  strokeDashArray,
  STYLE_FONT_STACKS,
  STYLE_FONT_LABELS,
  type PaperKind,
  type PaperTone,
} from "../lib/mindmapStyle"
import { buildOutlineText, copyOutlineText, deliverPng, downloadOutlineText, exportMindmapPdf, exportMindmapPng, safeFileName } from "../lib/mindmapExport"
import { hasMindmapClip, readMindmapClip, writeMindmapClip } from "../lib/mindmapClipboard"
import { applyStyleAt, parseInline, stripInlineMarkers, STYLE_FONTS, type StyleAttrs } from "../lib/richText"
import { mindIcons as mi } from "./MindmapIcons"

type Tool = "hand" | "pen" | "pencil" | "highlighter" | "tape" | "shape" | "eraser" | "lasso"

// Bốn cây bút thật sự để lại mực. "shape" không nằm trong đây: nó vẽ bằng ĐÚNG mực của bút máy (một
// hình vẽ ra phải cùng màu cùng cỡ nét với nét tay vừa vẽ cạnh nó), nên nó mượn màu/cỡ của "pen" chứ
// không giữ bộ màu riêng.
type InkTool = "pen" | "pencil" | "highlighter" | "tape"
// Cả bộ bút — đây là những gì nằm trong thanh công cụ bút chi tiết.
type DrawTool = InkTool | "shape"

// Hàng công cụ chính. "draw" KHÔNG phải một công cụ vẽ: nó là cửa vào của cả bộ bút.
//
// Vì sao gom lại: hàng cũ bày thẳng bảy công cụ (tay, bút, bút dạ, tẩy, hình, khoanh, nối) và mỗi
// công cụ vẽ lại kéo theo một hàng phụ đầy ô màu — trên máy 375px thì hai hàng đó ăn gần hết chỗ
// dành cho bảng, mà bốn phần năm số nút lúc nào cũng nằm đó dù đang không dùng tới. Nay hàng chính
// chỉ còn bốn nút của bốn việc KHÁC HẲN NHAU (di chuyển / vẽ / tẩy / khoanh), còn việc chọn
// cây bút nào thì nằm trong thanh bút — chỉ hiện khi đang thật sự cầm bút. Nối hai thẻ (công cụ
// "link" cũ) đã bỏ khỏi hàng công cụ — kéo thẻ này thả lên thẻ kia vẫn tự nối làm cha-con
// (reparentTo trong onPointerUp), đủ dùng cho phần lớn trường hợp thực tế.
type TopTool = "hand" | "draw" | "eraser" | "lasso"

// Những gì đang được khoanh chọn cùng lúc (công cụ lasso). Chỉ giữ ID, còn khung bao thì tính lại từ
// dữ liệu mỗi lần vẽ — nhờ vậy kéo cả nhóm xong khung tự chạy theo, không phải cập nhật hai nơi.
interface GroupSel {
  strokes: string[]
  nodes: string[]
  images: string[]
}
type Selection =
  | { kind: "node"; id: string }
  | { kind: "image"; id: string }
  // Chạm vào đường nối cũng chọn được — trước đây muốn bỏ một đường nối phải đổi sang công cụ nối
  // rồi chạm lại đúng hai thẻ đó, không ai đoán ra.
  | { kind: "edge"; from: string; to: string }
  | null

// Các công cụ bị chặn với ngón tay khi đang ở chế độ chỉ-bút (chống tì tay). "hand" không nằm ở
// đây: nó không để lại mực nên tì tay không gây hậu quả gì, mà chặn nó thì mất luôn cách kéo thẻ
// bằng ngón tay.
const DRAW_TOOLS: Tool[] = ["pen", "pencil", "highlighter", "tape", "eraser", "shape", "lasso"]
const PEN_ONLY_KEY = "drtrong:mindmap-pen-only"

// Bộ bút trong thanh công cụ chi tiết, theo đúng thứ tự bày ra.
const PEN_KIT: DrawTool[] = ["pen", "pencil", "highlighter", "tape", "shape"]
const INK_TOOLS: InkTool[] = ["pen", "pencil", "highlighter", "tape"]

function isDrawTool(t: Tool): t is DrawTool {
  return (PEN_KIT as Tool[]).includes(t)
}

// Cây bút mà một công cụ lấy màu/cỡ nét từ đó. Hình vẽ dùng chung mực với bút máy (xem InkTool).
function inkOf(t: Tool): InkTool {
  return t === "pencil" || t === "highlighter" || t === "tape" ? t : "pen"
}

// ─── Ô viết phóng to ──────────────────────────────────────────────────────────
//
// Bài toán: viết tay bằng ngón tay (hoặc cả bằng bút) ở cỡ chữ thật trên màn hình điện thoại thì
// nét to và xấu — muốn chữ nhỏ gọn trên bảng thì phải phóng bảng lên rất lớn, mà lúc đó lại không
// còn thấy mình đang viết ở chỗ nào trong tổng thể.
//
// Cách GoodNotes giải: một ô viết PHÓNG TO ở đáy màn hình. Viết to thoải mái trong ô đó, chữ hiện
// ra nhỏ trên bảng, và bảng phía trên vẫn giữ nguyên khung nhìn tổng thể. Một khung mảnh trên bảng
// chỉ rõ đang viết vào chỗ nào.
//
// Số pixel màn hình trên một đơn vị bảng BÊN TRONG ô phóng to. 3 lần là mức mà chữ viết bằng ngón
// tay ra cỡ chữ ghi chú bình thường trên bảng.
const ZOOM_SCALE = 3
const ZOOM_PANEL_H = 190
// Viết tới sát mép phải ô thì tự dịch khung sang chỗ mới, chừa lại một phần chữ vừa viết để nhìn
// thấy mạch câu. Tính theo tỉ lệ bề rộng ô.
const ZOOM_ADVANCE_AT = 0.86
const ZOOM_ADVANCE_KEEP = 0.22

// ─── Mỗi cây bút nhớ mực của riêng nó ─────────────────────────────────────────
//
// Bản trước có năm "ô bút yêu thích" bày thành một hàng riêng: mỗi ô nhớ sẵn loại bút + màu + cỡ
// nét. Nay bỏ hàng đó, vì chính CÁI BÚT đã là ô nhớ — nhấc bút chì lên là ra đúng màu xám cỡ 2.5
// lần trước dùng, quay lại bút dạ là ra đúng vệt vàng cỡ 14. Bốn cây bút = bốn ô nhớ, không tốn
// thêm một hàng nút nào trên màn hình, và không còn cái bẫy cũ "đang chọn ô bút mực mà đổi màu bút
// dạ thì ghi nhầm vào ô kia".
//
// `widths` là BA CỠ NÉT GẦN NHẤT của cây bút đó, phần tử đầu là cỡ đang dùng. Gộp "cỡ hiện tại" và
// "cỡ vừa dùng" vào một mảng thay vì hai biến rời: nút cỡ nét trên thanh bút chỉ cần đọc thẳng mảng
// này ra là có đủ ba chấm để bấm lại ngay, không phải tự dựng thêm một danh sách lịch sử riêng có
// khả năng lệch với cỡ đang dùng thật.
// Một "nét" = bề dày + kiểu nét. Đi thành cặp chứ không tách hai danh sách: người ta nhớ cây bút của
// mình theo cả cụm ("nét mảnh đứt đoạn để khoanh vùng phụ"), đổi bề dày mà kiểu nét ở lại là ra một
// cây bút thứ ba không ai gọi.
interface StrokeSpec {
  w: number
  dash?: MindDash
}

interface InkStyle {
  color: string
  // Ba nét gần nhất; phần tử đầu là nét đang dùng.
  strokes: StrokeSpec[]
}

function sameSpec(a: StrokeSpec, b: StrokeSpec): boolean {
  return a.w === b.w && (a.dash ?? null) === (b.dash ?? null)
}

const DASH_ITEMS: { id: MindDash | undefined; label: string }[] = [
  { id: undefined, label: "Liền" },
  { id: "dash", label: "Đứt đoạn" },
  { id: "dot", label: "Chấm" },
]
const INK_KEY = "drtrong:mindmap-ink"
// Khoá của bản cũ (năm ô bút yêu thích) — đọc một lần để giữ lại MÀU người dùng đã chọn cho bút mực
// và bút dạ, rồi thôi. Mất màu đã quen tay chỉ vì app đổi cách sắp xếp thanh công cụ là thứ người
// dùng cảm thấy ngay từ nét đầu tiên sau khi cập nhật.
const PRESETS_KEY = "drtrong:mindmap-pens"

// Màu mặc định lấy THẲNG từ bảng màu (không gõ lại mã màu): nhờ vậy mở bảng màu lần đầu là thấy
// ngay ô đang được chọn có vòng sáng, chứ không phải một bảng không ô nào được đánh dấu vì mã màu
// mặc định lệch bảng vài đơn vị.
const DEFAULT_INK: Record<InkTool, InkStyle> = {
  pen: { color: INK_PALETTE[2][4].color, strokes: [{ w: 3.5 }, { w: 2 }, { w: 6, dash: "dash" }] },
  // Bút chì mặc định KHÔNG phải màu đen: nét chì đen tuyền nhìn y hệt bút mực, mất luôn lý do tồn
  // tại của cây bút này. Xám than là màu của chì thật.
  pencil: { color: INK_PALETTE[2][3].color, strokes: [{ w: 2.5 }, { w: 1.5 }, { w: 4, dash: "dot" }] },
  highlighter: { color: HIGHLIGHT_PALETTE[0][2].color, strokes: [{ w: 14 }, { w: 24 }, { w: 8 }] },
  tape: { color: HIGHLIGHT_PALETTE[0][4].color, strokes: [{ w: 26 }, { w: 16 }, { w: 40 }] },
}

// Khoảng cỡ nét cho con trượt của từng bút. Bút dạ và băng dính bắt đầu từ chỗ bút mực kết thúc:
// một vệt bút dạ 2px thì không tô nổi một chữ, còn một dải băng dính mảnh hơn 10px thì không ra
// hình miếng băng dính.
const WIDTH_RANGE: Record<InkTool, [number, number]> = {
  pen: [1, 12],
  pencil: [1, 10],
  highlighter: [6, 40],
  tape: [10, 60],
}
// Số nét gần nhất giữ lại cho mỗi bút.
const RECENT_WIDTHS = 3
// Số ô màu bấm-là-xong bày sẵn trên thanh bút dựng dọc (ngoài ô màu đang dùng).
const QUICK_COLORS = 2

// Màu vừa dùng (tab "Lịch sử" của bảng màu) và màu tự pha người dùng đã lưu (tab "Tùy chỉnh").
// Dùng CHUNG cho cả bốn bút, không tách theo bút: một màu vừa pha ra để viết thì thường cũng là màu
// muốn dùng để tô ngay sau đó, tách ra thì phải pha lại lần nữa.
const COLOR_HISTORY_KEY = "drtrong:mindmap-ink-history"
const COLOR_CUSTOM_KEY = "drtrong:mindmap-ink-custom"
const COLOR_HISTORY_MAX = 18
const COLOR_CUSTOM_MAX = 16

// Tên bảng màu gọi đúng cây bút đang cầm — "Màu chì" khác "Màu bút dạ", và mỗi cây nhớ màu riêng nên
// nếu chỉ đề "Màu bút" thì không biết mình đang đổi màu của cây nào.
const COLOR_SHEET_TITLES: Record<InkTool, string> = {
  pen: "Màu bút",
  pencil: "Màu chì",
  highlighter: "Màu bút dạ",
  tape: "Màu băng dính",
}

// Ống hút màu của trình duyệt (Chrome/Edge trên máy tính). Không có trên Safari/iOS — hỏi trước rồi
// mới bày nút ra.
interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> }
}
function eyeDropper(): EyeDropperCtor | null {
  const w = window as unknown as { EyeDropper?: EyeDropperCtor }
  return typeof w.EyeDropper === "function" ? w.EyeDropper : null
}

// Vị trí thanh công cụ bút (kéo thả được) — xem phần dựng thanh bút ở dưới.
const PENBAR_KEY = "drtrong:mindmap-penbar"
// Cụm hoàn tác/làm lại — nổi RIÊNG, không phải một phần của thanh bút, nên bấm hoàn tác lúc đang
// dùng tay/tẩy/khoanh vùng/nối vẫn thấy được ngay, không phải mở thanh bút ra trước (xem C2). Mặc
// định dính mép TRÊN, đối diện phía thanh bút thường đứng, để hai cụm không đè lên nhau ngay từ đầu.
const UNDOBAR_KEY = "drtrong:mindmap-undobar"

// Cỡ nút trên hàng công cụ chính. 42 chứ không phải 36 như bản trước: hàng này chỉ còn năm công cụ
// (bút gom lại một nút) và đã bỏ nút "…" trùng lặp, nên chỗ trống dôi ra được trả về cho chính các
// nút — 36px là sát mức tối thiểu cho một mục tiêu chạm, mà đây lại là những nút bấm nhiều nhất.
const TOOL_BTN = 42
// Cỡ nút trên thanh bút. Bằng đúng hàng công cụ chính — thanh bút mới là thứ tay chạm nhiều nhất
// trong lúc vẽ, nút ở đây nhỏ hơn chỗ khác là vô lý.
const BAR_BTN = 42

// Bán kính tẩy (theo pixel MÀN HÌNH — chia cho zoom khi đổi sang toạ độ bảng, để đầu tẩy luôn to
// bằng đầu ngón tay dù đang phóng to hay thu nhỏ).
//
// Ba cỡ: đầu nhỏ để lấy đúng một dấu phụ tiếng Việt viết sai, đầu vừa cho một chữ, đầu lớn để dọn cả
// một mảng nháp. Hai cỡ như trước thì cỡ "vừa" phải kiêm luôn một trong hai việc kia.
const ERASER_SIZES = [9, 18, 34]
const ERASER_LABELS = ["nhỏ", "vừa", "lớn"]
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
// Số bước hoàn tác giữ lại. Mỗi bước là một bản chụp cả bảng — các mảng con dùng chung tham chiếu
// nên chi phí chủ yếu là mảng vỏ, giữ 40 bước vẫn nhẹ.
const UNDO_LIMIT = 40
// Khoảng cách tối thiểu giữa hai điểm liên tiếp của một nét, tính theo toạ độ bảng. Bỏ các điểm quá
// gần nhau: nét vẫn mượt như cũ nhưng dữ liệu lưu nhẹ đi nhiều lần.
const MIN_POINT_DIST = 2
// Ngưỡng nhận biết "đã kéo" (pixel màn hình) — dưới ngưỡng này coi như chỉ chạm.
const DRAG_SLOP = 4
// Cỡ ảnh dán vào bảng lúc đầu, tính theo cạnh dài (toạ độ bảng).
const IMAGE_START_SIZE = 240
const PAPER_ORDER: PaperKind[] = ["grid", "dot", "line", "plain"]
const PAPER_STORAGE_KEY = "drtrong:mindmap-paper"
// Khung nhìn (pan/zoom) được ghi lại để mở bảng lần sau thấy ĐÚNG chỗ đang làm. Trước đây mỗi lần
// vào tab Sơ đồ tư duy là khung nhìn về lại góc trên trái: bảng vẽ ở xa gốc thì mở ra thấy giấy
// trắng, phải tự mò tìm lại chỗ mình vừa vẽ.
const VIEW_STORAGE_KEY = "drtrong:mindmap-view"
// Đã xem qua hướng dẫn cử chỉ lần đầu hay chưa — hỏi MỘT LẦN cho cả mọi bảng, vì cử chỉ giống nhau ở
// mọi bảng (không phải đặc điểm riêng của bảng nào).
const COACH_STORAGE_KEY = "drtrong:mindmap-coach-seen"
// Khung radar góc trên phải — thu nhỏ CẢ VÙNG có nội dung để biết đang xem ở đâu so với tổng thể,
// và chạm/kéo trong khung này để nhảy tới đó ngay, không phải kéo bảng thật mò dần.
const MM_W = 116
const MM_H = 82
const MM_PAD = 6
// Bước lưới để hít (snap) khi kéo thẻ — trùng bước ô của giấy kẻ nên thẻ nằm đúng vào ô.
const SNAP_STEP = PAPER_STEP
// Ngưỡng hít, tính theo pixel MÀN HÌNH: kéo tới gần mốc chừng này thì thẻ tự dính vào mốc.
const SNAP_DIST = 7
// Giữ ngón trên chỗ trống lâu hơn mức này (ms) thì tạo ghi chú ngay tại đó.
const LONG_PRESS_MS = 480
// Chạm trong khoảng này (px màn hình) tính là trúng đường nối.
const EDGE_HIT_DIST = 12
// Đang cầm bút, giữ yên trên chỗ trống lâu hơn mức này (ms) thì chuyển tạm sang khoanh vùng — xem
// C3/startHoldLassoTimer(). Ngắn hơn LONG_PRESS_MS (tạo ghi chú, chỉ áp dụng với công cụ tay) một
// chút: đây là cử chỉ của người đang vẽ liên tục, càng nhanh vào việc càng đỡ đứt mạch.
const HOLD_LASSO_MS = 400
// Tay/bút còn nhúc nhích quá mức này (px màn hình) trong lúc giữ thì KHÔNG tính là giữ yên — đang vẽ
// một nét chậm chứ không phải đang chờ chuyển sang khoanh vùng.
const HOLD_LASSO_TOLERANCE = 6
// Khoảng trễ tối thiểu (ms) giữa hai lần đồng bộ cullView từ view.current — xem khai báo cullView.
// Đủ ngắn để lọc theo khung nhìn bắt kịp mắt trong lúc kéo/phóng, đủ dài để không setState mỗi
// khung hình (60 lần/giây) như applyView() đang cố tránh.
const CULL_VIEW_THROTTLE_MS = 150
// Đệm quanh khung nhìn khi lọc thẻ/đường nối, tính theo TỈ LỆ kích thước khung nhìn (0.75 = thêm
// 75% bề rộng/cao mỗi phía) — đủ rộng để một cú kéo/vẩy nhanh trong một nhịp trễ (CULL_VIEW_THROTTLE_MS)
// không làm thẻ hiện ra giữa chừng ngay trước mắt.
const CULL_VIEW_PAD_RATIO = 0.75

const TOP_TOOLS: { id: TopTool; icon: (cls?: string) => React.ReactElement; hint: string }[] = [
  { id: "hand", icon: mi.hand, hint: "Di chuyển bảng và ghi chú" },
  { id: "draw", icon: mi.pen, hint: "Bút vẽ — chạm để mở thanh bút" },
  { id: "eraser", icon: mi.eraser, hint: "Tẩy nét vẽ" },
  { id: "lasso", icon: mi.lasso, hint: "Khoanh vùng để chọn nhiều nét, thẻ, ảnh" },
]

// Công cụ đang cầm thuộc về nút nào trên hàng chính — cả năm cây bút đều nằm dưới nút "draw".
function topOf(t: Tool): TopTool {
  return isDrawTool(t) ? "draw" : t
}

const PEN_KIT_ITEMS: { id: DrawTool; icon: (cls?: string) => React.ReactElement; hint: string }[] = [
  { id: "pen", icon: mi.pen, hint: "Bút máy" },
  { id: "pencil", icon: mi.pencilTool, hint: "Bút chì" },
  { id: "highlighter", icon: mi.marker, hint: "Bút dạ" },
  { id: "tape", icon: mi.tape, hint: "Băng dính" },
  { id: "shape", icon: mi.shapes, hint: "Hình vẽ" },
]

const SHAPES: { id: ShapeKind; icon: (cls?: string) => React.ReactElement; hint: string }[] = [
  { id: "line", icon: mi.shapeLine, hint: "Đường thẳng" },
  { id: "arrow", icon: mi.shapeArrow, hint: "Mũi tên" },
  { id: "rect", icon: mi.shapeRect, hint: "Khung chữ nhật" },
  { id: "ellipse", icon: mi.shapeEllipse, hint: "Vòng khoanh" },
]

const NODE_STYLES: { id: MindNodeStyle; label: string }[] = [
  { id: "solid", label: "Nền đặc" },
  { id: "soft", label: "Nền nhạt" },
  { id: "outline", label: "Viền" },
  { id: "plain", label: "Chữ trần" },
]

const NODE_SIZES: { id: MindNodeSize; label: string }[] = [
  { id: "sm", label: "Nhỏ" },
  { id: "md", label: "Vừa" },
  { id: "lg", label: "Lớn" },
]

// Bảng phím tắt in trong menu "…" — cùng một danh sách với phần xử lý phím ở dưới, để không bao giờ
// có chuyện app quảng cáo một phím mà bấm vào thì không có gì xảy ra.
const SHORTCUT_HINTS: [string, string][] = [
  ["1–4", "Đổi công cụ"],
  ["Ctrl+Z", "Hoàn tác"],
  ["Ctrl+F", "Tìm thẻ"],
  ["Ctrl+A", "Chọn hết"],
  ["Enter", "Sửa thẻ"],
  ["Tab", "Thêm nhánh"],
  ["↑↓←→", "Dời thẻ đang chọn"],
  ["Delete", "Xoá phần chọn"],
  ["Esc", "Bỏ chọn"],
  ["+ / −", "Phóng - thu"],
  ["0", "Vừa khung"],
]

// Máy có bàn phím thật hay không (dùng để quyết định có hiện bảng phím tắt). Hỏi qua con trỏ: chuột
// và bàn cảm ứng cho con trỏ "fine", màn hình cảm ứng thì không.
function detectKeyboard(): boolean {
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
  } catch {
    return false
  }
}

const NEW_NODE_TEXT = "Ghi chú mới"
const NEW_BRANCH_TEXT = "Nhánh mới"
const NEW_TEXT_TEXT = "Nhập chữ"

// ─── Lớp nét vẽ ───────────────────────────────────────────────────────────────
// Tách thành component riêng có memo, và nhớ luôn chuỗi đường đi của từng nét.
//
// Vì sao cần: mỗi lần React dựng lại bảng (đổi bút, chọn thẻ, mở bảng chọn...) mà nét vẽ nằm trực
// tiếp trong thân component thì strokePath() phải chạy lại cho TẤT CẢ nét — bảng vài nghìn nét là
// vài trăm nghìn phép tính cho một việc không liên quan gì tới nét vẽ. Nay chỉ chạy lại khi danh
// sách nét thật sự đổi, và mỗi nét chỉ tính đường đi một lần duy nhất trong cả phiên làm việc.
const pathCache = new Map<string, string>()

// Nét có `widths` được vẽ bằng VÙNG TÔ (bề dày thay đổi theo lực nhấn / tốc độ), nét còn lại vẫn là
// đường kẻ đều dày.
//
// Nét đứt/nét chấm luôn là đường kẻ: nét đứt được tạo ra bằng cách cắt khúc ĐƯỜNG VIỀN, mà một vùng
// tô thì viền của nó chạy vòng quanh cả hai mép nét — cắt khúc cái viền đó ra không thành nét đứt,
// nó thành một chuỗi mảnh vụn hình răng cưa.
function isFilled(s: MindStroke): boolean {
  return !!s.widths && s.widths.length > 1 && !s.straight && !s.dash
}

// Xoá bộ nhớ đệm của những nét vừa bị đổi toạ độ (kéo cả nhóm). Không xoá thì lần vẽ sau vẫn lấy
// đường đi cũ ở chỗ cũ. Giữ nguyên id của nét (thay vì cấp id mới) để lịch sử hoàn tác và phần đang
// khoanh chọn không bị đứt.
function invalidatePaths(ids: string[]): void {
  ids.forEach((id) => pathCache.delete(id))
}

function cachedPath(s: MindStroke): string {
  const hit = pathCache.get(s.id)
  if (hit !== undefined) return hit
  const d = isFilled(s) ? strokeOutline(s.points, s.widths!) : strokePath(s.points, s.straight)
  // Nét đã vẽ xong thì mảng điểm không bao giờ đổi nữa (hoàn tác cũng trả lại đúng nét cũ theo id),
  // nên nhớ theo id là an toàn. Chỉ dọn khi bộ nhớ đệm phình quá mức của một buổi vẽ bình thường.
  if (pathCache.size > 6000) pathCache.clear()
  pathCache.set(s.id, d)
  return d
}

function StrokePath({ s }: { s: MindStroke }) {
  const filled = isFilled(s)
  const alpha = strokeAlpha(s.tool)
  return (
    <path
      data-stroke={s.id}
      d={cachedPath(s)}
      fill={filled ? s.color : "none"}
      stroke={filled ? "none" : s.color}
      strokeWidth={filled ? undefined : s.width}
      strokeLinecap={filled ? undefined : s.dash === "dot" ? "round" : strokeCap(s.tool)}
      strokeLinejoin={filled ? undefined : "round"}
      strokeDasharray={filled ? undefined : strokeDashArray(s.dash, s.width)}
      opacity={alpha === 1 ? undefined : alpha}
    />
  )
}

const InkLayer = memo(function InkLayer({ strokes }: { strokes: MindStroke[] }) {
  // Xếp lớp theo cây bút: băng dính dán dưới cùng, rồi bút dạ, trên cùng mới là chì và mực — thứ
  // dùng để đánh dấu phải nằm dưới thứ dùng để viết, đúng như trên giấy thật (xem STROKE_LAYERS).
  //
  // Chia MỘT lượt vào các ngăn thay vì lọc lại mảng cho từng lớp: bảng vẽ lâu có hàng nghìn nét, mà
  // lớp này dựng lại mỗi lần danh sách nét đổi (tức là sau mỗi nét vừa vẽ xong).
  const byLayer = new Map<string, MindStroke[]>(STROKE_LAYERS.map((l) => [l, [] as MindStroke[]]))
  strokes.forEach((s) => (byLayer.get(s.tool) ?? byLayer.get("pen")!).push(s))
  return (
    <>
      {STROKE_LAYERS.map((layer) => (
        <g key={layer}>
          {byLayer.get(layer)!.map((s) => (
            <StrokePath key={s.id} s={s} />
          ))}
        </g>
      ))}
    </>
  )
})

interface SavedView {
  x: number
  y: number
  zoom: number
}

// Khung nhìn nhớ RIÊNG cho từng bảng. Trước đây một khoá dùng chung cho mọi bảng, nên mở bảng B
// xong quay lại bảng A là A nhảy tới đúng chỗ đang xem của B — hai bảng khác nhau hoàn toàn về toạ
// độ nội dung, nên chỗ đó thường là giấy trắng.
function viewKey(boardId: string | undefined): string {
  return boardId ? `${VIEW_STORAGE_KEY}:${boardId}` : VIEW_STORAGE_KEY
}

function readView(boardId?: string): SavedView | null {
  try {
    const raw = localStorage.getItem(viewKey(boardId))
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<SavedView>
    if (typeof v.x !== "number" || typeof v.y !== "number" || typeof v.zoom !== "number") return null
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.zoom)) return null
    return { x: v.x, y: v.y, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom)) }
  } catch {
    return null
  }
}

function writeView(v: SavedView, boardId?: string): void {
  try {
    localStorage.setItem(viewKey(boardId), JSON.stringify({ x: Math.round(v.x), y: Math.round(v.y), zoom: v.zoom }))
  } catch {
    // Không ghi được thì thôi, chỉ mất chỗ đang xem chứ không mất nội dung bảng.
  }
}

function readPaper(): PaperKind {
  try {
    const v = localStorage.getItem(PAPER_STORAGE_KEY)
    return PAPER_ORDER.includes(v as PaperKind) ? (v as PaperKind) : "grid"
  } catch {
    return "grid"
  }
}

// Màu/nét của bốn cây bút. Đọc bản mới trước; chưa có thì cố vớt màu từ bộ "bút yêu thích" đời cũ.
function readInkStyles(): Record<InkTool, InkStyle> {
  const clone = (s: InkStyle): InkStyle => ({ color: s.color, strokes: s.strokes.map((x) => ({ ...x })) })
  const out: Record<InkTool, InkStyle> = {
    pen: clone(DEFAULT_INK.pen),
    pencil: clone(DEFAULT_INK.pencil),
    highlighter: clone(DEFAULT_INK.highlighter),
    tape: clone(DEFAULT_INK.tape),
  }
  try {
    const raw = localStorage.getItem(INK_KEY)
    if (raw) {
      // `widths` là dạng cũ (chỉ có bề dày, chưa có kiểu nét) — đọc lên rồi nâng thành StrokeSpec,
      // để người đã chỉnh cỡ nét quen tay không bị trả về mặc định chỉ vì app thêm nét đứt/nét chấm.
      const v = JSON.parse(raw) as Partial<Record<InkTool, { color?: string; strokes?: StrokeSpec[]; widths?: number[] }>>
      INK_TOOLS.forEach((t) => {
        const s = v?.[t]
        if (!s) return
        if (typeof s.color === "string") out[t].color = s.color
        const list: StrokeSpec[] = Array.isArray(s.strokes)
          ? s.strokes
              .filter((x) => x && typeof x.w === "number" && x.w > 0)
              .map((x) => ({ w: x.w, ...(x.dash === "dash" || x.dash === "dot" ? { dash: x.dash } : {}) }))
          : Array.isArray(s.widths)
            ? s.widths.filter((w) => typeof w === "number" && w > 0).map((w) => ({ w }))
            : []
        if (list.length > 0) out[t].strokes = list.slice(0, RECENT_WIDTHS)
      })
      return out
    }
    // Di trú từ bộ bút yêu thích cũ: lấy màu của ô BÚT MỰC đầu tiên và ô BÚT DẠ đầu tiên. Cỡ nét
    // không mang sang — cỡ thì bấm lại một cái là xong, còn màu đã chọn tay mới là thứ khó dựng lại.
    const old = localStorage.getItem(PRESETS_KEY)
    if (old) {
      const list = JSON.parse(old) as { tool?: string; color?: string }[]
      if (Array.isArray(list)) {
        const pen = list.find((p) => p?.tool === "pen" && typeof p.color === "string")
        const hl = list.find((p) => p?.tool === "highlighter" && typeof p.color === "string")
        if (pen?.color) out.pen.color = pen.color
        if (hl?.color) out.highlighter.color = hl.color
      }
    }
  } catch {
    // Hỏng dữ liệu thì dùng bộ mặc định — không đáng chặn việc mở bảng.
  }
  return out
}

function writeInkStyles(v: Record<InkTool, InkStyle>): void {
  try {
    localStorage.setItem(INK_KEY, JSON.stringify(v))
  } catch {
    // Không lưu được thì phiên sau quay về bộ mặc định — chấp nhận được.
  }
}

// Đổi mọi cách viết màu của app về "#rrggbb". Cần vì bảng màu sinh ra một phần bằng phép pha
// (mixHex trả về "rgb(…)") trong khi ô chọn màu của trình duyệt (<input type="color">) chỉ nhận hex,
// và vì so sánh "màu đang dùng" phải so trên cùng một cách viết — nếu không, cùng một màu viết hai
// kiểu sẽ không có ô nào hiện dấu đang chọn.
function toHex(color: string): string {
  const c = color.trim()
  if (c.startsWith("#")) {
    const h = c.slice(1)
    if (h.length === 3) return `#${h.split("").map((x) => x + x).join("")}`.toLowerCase()
    if (h.length >= 6) return `#${h.slice(0, 6)}`.toLowerCase()
    return "#000000"
  }
  const nums = c.match(/[\d.]+/g)
  if (!nums || nums.length < 3) return "#000000"
  const hex = nums
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0"))
    .join("")
  return `#${hex}`
}

function sameColor(a: string, b: string): boolean {
  return toHex(a) === toHex(b)
}

function readColorList(key: string, max: number): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return v.filter((c): c is string => typeof c === "string").slice(0, max)
  } catch {
    return []
  }
}

function writeColorList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Như trên.
  }
}

// Vị trí thanh bút, lưu theo TỈ LỆ bề rộng/chiều cao mặt bảng chứ không theo pixel: người dùng xoay
// máy ngang hoặc mở app trên màn khác cỡ thì thanh vẫn nằm đúng "chỗ đó" trên bảng, không văng ra
// ngoài màn hình rồi không cách nào kéo lại.
// ─── Chỗ đứng của thanh bút ───────────────────────────────────────────────────
//
// Thanh bút GẮN VÀO MỘT MÉP bảng chứ không thả nổi tự do ở toạ độ bất kỳ.
//
// Bản trước thả nổi và đó là một quyết định sai: thanh nằm ngang rộng gần bằng cả bề ngang máy, nên
// kéo qua kéo lại theo chiều ngang chỉ nhích được vài chục pixel — tay kéo cả đoạn dài mà thanh gần
// như đứng yên, cảm giác lỏng lẻo và không điều khiển được. Gắn mép thì mỗi lần kéo là một quyết
// định rõ ràng: "đưa sang trái", "đưa xuống dưới", và thanh luôn nằm thẳng hàng với mép bảng.
//
//   top/bottom — nằm ngang, CHIẾM TRỌN bề ngang, dính sát mép trên hoặc mép dưới.
//   left/right — dựng dọc, cao vừa đủ nội dung, trượt lên xuống được bằng `f`.
type BarDock = "top" | "bottom" | "left" | "right"

interface BarPos {
  dock: BarDock
  // Vị trí dọc theo mép, chỉ dùng khi thanh dựng dọc (0 = trên cùng, 1 = dưới cùng).
  f: number
}

const BAR_DOCKS: BarDock[] = ["top", "bottom", "left", "right"]

// Nhận `key` làm tham số vì có HAI thanh nổi kéo-thả-neo-mép độc lập trên bảng: thanh bút và cụm
// hoàn tác/làm lại (xem UNDOBAR_KEY) — mỗi cụm nhớ vị trí RIÊNG, gắn tay một cụm không kéo cụm kia
// theo.
function readBarPos(key: string, defaultF: number): BarPos | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<BarPos>
    if (!v.dock || !BAR_DOCKS.includes(v.dock)) return null
    const f = typeof v.f === "number" && Number.isFinite(v.f) ? Math.min(1, Math.max(0, v.f)) : defaultF
    return { dock: v.dock, f }
  } catch {
    return null
  }
}

function writeBarPos(key: string, v: BarPos | null): void {
  try {
    if (v) localStorage.setItem(key, JSON.stringify(v))
    else localStorage.removeItem(key)
  } catch {
    // Như trên.
  }
}

const TONE_KEY = "drtrong:mindmap-tone"
const SNAP_KEY = "drtrong:mindmap-snap"

// Chưa từng tự chọn giấy (chưa có TONE_KEY) mà app đang ở chế độ tối thì mặc định giấy ĐEN, không
// phải trắng: bảng trắng chói giữa một app đã bật tối là đúng thứ người trực đêm bật chế độ tối để
// tránh. Người đã từng chọn tay — kể cả chọn đúng "white" — thì giữ nguyên lựa chọn đó mãi mãi, chỉ
// ảnh hưởng tới lần mở đầu tiên. Cùng logic với applyTheme() ở src/lib/theme.ts: data-theme thắng,
// không có thì theo prefers-color-scheme của máy.
function isDarkThemeActive(): boolean {
  try {
    const attr = document.documentElement.getAttribute("data-theme")
    if (attr === "dark") return true
    if (attr === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  } catch {
    return false
  }
}

function readTone(): PaperTone {
  try {
    const v = localStorage.getItem(TONE_KEY)
    if (v === "black" || v === "yellow" || v === "white") return v
    return isDarkThemeActive() ? "black" : "white"
  } catch {
    return "white"
  }
}

function writeTone(v: PaperTone): void {
  try {
    localStorage.setItem(TONE_KEY, v)
  } catch {
    // Không lưu được thì lần sau về giấy trắng — không đáng chặn việc gì.
  }
}

// Hai công tắc căn chỉnh nằm chung một khoá cho gọn. MẶC ĐỊNH BẬT: đó là hành vi đã có từ trước,
// tắt sẵn sẽ làm người đang dùng quen thấy thẻ đột nhiên hết dính vào nhau mà không hiểu vì sao.
function readSnap(which: "obj" | "grid"): boolean {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return true
    const v = JSON.parse(raw) as Record<string, boolean>
    return v[which] !== false
  } catch {
    return true
  }
}

function writeSnap(obj: boolean, grid: boolean): void {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({ obj, grid }))
  } catch {
    // Như trên.
  }
}

function readPenOnly(): boolean {
  try {
    return localStorage.getItem(PEN_ONLY_KEY) === "1"
  } catch {
    return false
  }
}

function writePenOnly(on: boolean): void {
  try {
    localStorage.setItem(PEN_ONLY_KEY, on ? "1" : "0")
  } catch {
    // Không lưu được thì phiên sau quay về mặc định — chấp nhận được.
  }
}

function readCoachSeen(): boolean {
  try {
    return localStorage.getItem(COACH_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function writeCoachSeen(): void {
  try {
    localStorage.setItem(COACH_STORAGE_KEY, "1")
  } catch {
    // Không ghi được thì hướng dẫn sẽ hiện lại lần sau — không sao, không mất nội dung bảng.
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

// Ghép một vòng viền (chọn/tìm/nối) với bóng đổ riêng của thẻ (paint.shadowCss) thành một khai báo
// box-shadow nhiều lớp. Thẻ kiểu "plain" (chữ trần) có shadowCss = "none" — nối thẳng chuỗi
// `"${ring}, none"` cho ra CSS không hợp lệ, trình duyệt bỏ qua CẢ khai báo, nên vòng viền cũng biến
// mất theo. Chỉ nối thêm khi thật sự có một bóng để nối.
function ringShadow(ring: string, base: string): string {
  return base && base !== "none" ? `${ring}, ${base}` : ring
}

// Bỏ dấu tiếng Việt để tìm kiếm gõ không dấu vẫn ra kết quả.
function noAccent(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// Chữ của một thẻ ghi chú, có định dạng (đậm/nghiêng/gạch chân/tô sáng/cỡ/màu/font) — xem
// richText.ts. `size: "lg"` dùng em (không phải px tuyệt đối) để luôn tỉ lệ đúng với cỡ chữ GỐC của
// thẻ (nhỏ/vừa/lớn, xem NODE_METRICS) thay vì đè lên nó. Màu/font mặc định (không đặt) không ghi gì
// vào style — để thừa kế đúng `color`/font hệ thống của thẻ, không phải bịa ra một giá trị "mặc
// định" trùng lặp.
function RichNodeText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((tok, i) => {
        if (tok.kind === "text" || tok.kind === "link") return <span key={i}>{tok.text}</span>
        const style: React.CSSProperties = {}
        const bold = tok.kind === "bold" || (tok.kind === "styled" && tok.bold)
        const italic = tok.kind === "italic" || (tok.kind === "styled" && tok.italic)
        const underline = tok.kind === "underline" || (tok.kind === "styled" && tok.underline)
        const highlight = tok.kind === "highlight" || (tok.kind === "styled" && tok.highlight)
        if (tok.kind === "styled") {
          if (tok.color) style.color = tok.color
          if (tok.size === "lg") style.fontSize = "1.2em"
          if (tok.font && STYLE_FONT_STACKS[tok.font]) style.fontFamily = STYLE_FONT_STACKS[tok.font]
        }
        if (bold) style.fontWeight = 800
        if (italic) style.fontStyle = "italic"
        if (underline) {
          style.textDecoration = "underline"
          style.textUnderlineOffset = 2
        }
        if (highlight) {
          // Không dùng một màu vàng cố định: thẻ có thể mang BẤT KỲ màu nền nào trong 10 sắc, một
          // mảng vàng cứng sẽ đẹp trên thẻ trắng nhưng chọi thẳng vào thẻ vàng/cam. Phủ đen mờ vừa
          // luôn "đậm hơn một chút so với nền của chính thẻ đó", đúng nghĩa "tô sáng" trên MỌI màu.
          style.background = "rgba(0,0,0,.16)"
          style.borderRadius = 3
          style.padding = "0 2px"
        }
        return (
          <span key={i} style={style}>
            {tok.text}
          </span>
        )
      })}
    </>
  )
}

// Chặn sự kiện chạm của các nút NỔI TRÊN mặt bảng (nút ＋, phóng-thu, thanh nút trên thẻ đang chọn)
// không cho nổi bọt xuống mặt bảng.
//
// Đây là lỗi đã làm cả loạt nút "bấm không ăn": các nút đó là con của mặt bảng, nên `pointerdown` của
// chúng chạy luôn cả tay xử lý của mặt bảng — tay này đóng bảng chọn và bỏ chọn thẻ. Nút bị tháo khỏi
// DOM ngay ở nhịp `pointerdown`, nên nhịp `click` (xảy ra sau) không bao giờ đến được nút nữa: bấm
// "Ghi chú"/"Ảnh" hay các nút trên thẻ đang chọn thì không có gì xảy ra. Chưa kể khi đang chọn bút,
// chạm vào nút còn bị tính là bắt đầu một nét vẽ và để lại dấu mực.
function stopPointer(e: ReactPointerEvent) {
  e.stopPropagation()
}

// Nút icon vuông dùng khắp thanh công cụ. `tone`: "plain" nút trên nền trắng, "dark" nút trên thanh
// nhỏ màu tối nổi trên thẻ ghi chú đang chọn.
function IconBtn({
  icon,
  hint,
  active,
  disabled,
  onClick,
  tone = "plain",
  size = 36,
  plainBg = false,
}: {
  icon: (cls?: string) => React.ReactElement
  hint: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  tone?: "plain" | "dark"
  size?: number
  // `plainBg`: nút KHÔNG tự tô nền khi được chọn — dùng cho hàng công cụ, nơi phần nền do một ô sáng
  // trượt phía sau đảm nhiệm.
  plainBg?: boolean
}) {
  const color = disabled
    ? "var(--c-faint)"
    : tone === "dark"
      ? "#fff"
      : active
        ? "var(--c-on-bright)"
        : "var(--c-text-soft)"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      aria-label={hint}
      aria-pressed={active}
      className="mind-btn flex-none flex items-center justify-center rounded-xl relative"
      style={{
        width: size,
        height: size,
        color,
        background: active && !plainBg ? "var(--c-primary)" : "transparent",
      }}
    >
      {icon("w-[19px] h-[19px]")}
    </button>
  )
}

export function MindmapBoard({
  data,
  loading,
  savedTick,
  linkTargets = [],
  onOpenLink,
  updateNodes,
  updateEdges,
  updateStrokes,
  updateImages,
  replaceAll,
  undoStore,
  boardName,
  boardId,
  onGoHome,
  initialFindQuery,
}: {
  data: MindmapData
  loading: boolean
  savedTick: number
  // Tên bảng và đường quay về danh sách — thanh trên của bảng nằm trong component này (nó cần
  // chạm tới paper/màu nền/căn chỉnh vốn là state của chính nó), nên hai thứ này phải truyền vào.
  boardName?: string
  // Khung nhìn (kéo/phóng) được nhớ RIÊNG cho từng bảng theo id này — xem viewKey().
  boardId?: string
  onGoHome?: () => void
  // Mở TỪ kết quả tìm xuyên-bảng (màn danh sách) — tự mở ô tìm nội bộ với đúng từ khoá này và nhảy
  // tới thẻ khớp đầu tiên, để không phải gõ lại từ khoá vừa gõ ở màn danh sách.
  initialFindQuery?: string
  // Mọi bài trong app có thể gắn vào thẻ: bài viết dựng sẵn, bài tự nhập, bài học ECG. Cùng danh sách
  // mà trình soạn thảo dùng để chèn liên kết trong bài (xem linkTargets trong App.tsx).
  linkTargets?: { target: string; label: string; group: string }[]
  onOpenLink?: (target: string) => void
  updateNodes: (updater: (nodes: MindNode[]) => MindNode[]) => void
  updateEdges: (updater: (edges: MindEdge[]) => MindEdge[]) => void
  updateStrokes: (updater: (strokes: MindStroke[]) => MindStroke[]) => void
  updateImages: (updater: (images: MindImage[]) => MindImage[]) => void
  replaceAll: (next: MindmapData) => void
  // Ngăn xếp hoàn tác/làm lại — CHỦ SỞ HỮU thật sự là useMindmap ở App.tsx (một ngăn xếp riêng cho
  // mỗi bảng, sống hết vòng đời của bảng đó), không phải component này. Trước đây ngăn xếp nằm ở một
  // `useRef` ngay trong MindmapBoard nên mỗi lần rời màn Sơ đồ tư duy (chuyển tab khác) rồi quay lại,
  // component bị unmount/mount lại từ đầu — ref mất sạch, hoàn tác luôn trống trơn dù vừa sửa xong.
  // Nhận từ props thì dữ liệu ngăn xếp không còn gắn với vòng đời của component vẽ nữa.
  undoStore: { undo: MindmapData[]; redo: MindmapData[] }
}) {
  const { nodes, edges } = data
  const strokes = data.strokes ?? []
  const images = data.images ?? []

  // Thẻ nằm trong nhánh đang gấp. Tính MỘT lần ở đây rồi dùng cho mọi việc phía dưới (vẽ, xét chạm,
  // khoanh vùng, hít vị trí, vừa khung, xuất ảnh): "đang ẩn" phải có nghĩa giống nhau ở mọi nơi, nếu
  // không sẽ có chuyện chạm trúng một đường nối vô hình hay khoanh phải một thẻ không nhìn thấy.
  const { hidden, counts: hiddenCounts } = hiddenByCollapse(nodes, edges)
  const visibleNodes = hidden.size === 0 ? nodes : nodes.filter((n) => !hidden.has(n.id))
  const visibleEdges =
    hidden.size === 0 ? edges : edges.filter((e) => !hidden.has(e.from) && !hidden.has(e.to))
  // Bảng "như đang thấy" — dùng cho vừa khung và xuất ảnh, để ảnh xuất ra đúng bằng cái đang nhìn.
  const visibleData: MindmapData = { nodes: visibleNodes, edges: visibleEdges, strokes, images }

  // ─── Chế độ chỉ đọc ───────────────────────────────────────────────────────
  // Bảng ĐÃ CÓ NỘI DUNG mở ra là CHỈ ĐỌC. Lý do: phần lớn lần mở một sơ đồ đã vẽ xong là để XEM lại,
  // mà ở chế độ vẽ thì mỗi lần chạm nhầm vào mặt bảng đều để lại một vệt mực hoặc xê dịch một thẻ.
  // Muốn sửa thì bấm một nút — rõ ràng và cố ý.
  //
  // Bảng TRỐNG (chỉ có đúng thẻ trung tâm mặc định, chưa vẽ chưa thêm gì) thì mở sẵn ở chế độ SỬA:
  // một bảng chưa có gì để "xem lại" — buộc phải bấm thêm một nút trước khi viết được chữ đầu tiên
  // là một bước thừa, không bảo vệ được gì cả vì chưa có nội dung nào để lỡ tay làm hỏng.
  //
  // KHÔNG quyết định bằng `useState(() => ...)` đọc `data` ngay lúc mount: `data`/`loading` đến từ
  // useMindmap() ở App.tsx, nạp bất đồng bộ từ IndexedDB — đọc `data` ngay lúc mount có thể vẫn là
  // dữ liệu tạm (mặc định hoặc còn sót của bảng trước). Phải đợi `loading` về `false` (nạp xong THẬT,
  // useMindmap() đã tự đảm bảo không lộ dữ liệu sai bảng ra prop này — xem ghi chú ở đó) rồi mới đọc.
  const [readOnly, setReadOnly] = useState(true)
  // Đã tự quyết định readOnly cho lượt mở này chưa — chỉ quyết ĐÚNG MỘT LẦN. Sau đó readOnly hoàn
  // toàn do người dùng bấm nút, không tự nhảy qua nhảy lại theo nội dung đổi trong lúc đang sửa.
  const autoEditDecidedRef = useRef(false)
  useEffect(() => {
    if (autoEditDecidedRef.current || loading) return
    autoEditDecidedRef.current = true
    if (nodes.length <= 1 && strokes.length === 0 && images.length === 0) setReadOnly(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, nodes.length, strokes.length, images.length])
  const [rawTool, setTool] = useState<Tool>("hand")
  // Ở chế độ chỉ đọc, mọi công cụ đều coi như "tay": không vẽ, không tẩy, không khoanh, không nối —
  // chỉ kéo và phóng-thu. Ép ở ĐÚNG MỘT chỗ này thay vì rải `if (readOnly)` khắp các nhánh xử lý
  // chạm, vì bỏ sót một nhánh nghĩa là chế độ chỉ đọc vẫn để lại mực trên bảng.
  const tool: Tool = readOnly ? "hand" : rawTool
  const [shapeKind, setShapeKind] = useState<ShapeKind>("arrow")
  // Mỗi cây bút nhớ màu và ba cỡ nét gần nhất của riêng nó — xem InkStyle ở đầu file.
  const [inkStyles, setInkStyles] = useState<Record<InkTool, InkStyle>>(readInkStyles)
  // Cây bút sẽ được nhấc lên khi bấm nút "Bút vẽ" ở hàng chính. Nhớ lại cây VỪA DÙNG chứ không luôn
  // trả về bút máy: đang tô bằng bút dạ, chuyển sang tay để kéo bảng, quay lại vẽ tiếp thì thứ muốn
  // cầm lên vẫn là cây bút dạ đó.
  const [lastDraw, setLastDraw] = useState<DrawTool>("pen")
  // Thanh công cụ bút có đang mở hay không. Mở/đóng là việc CỦA NGƯỜI DÙNG (bấm nút "Bút vẽ"), không
  // tự đóng khi đổi bút — thanh tự biến mất giữa lúc đang chọn màu là cách nhanh nhất làm hỏng mạch
  // thao tác.
  const [penBarOpen, setPenBarOpen] = useState(false)
  // Thanh trên và thanh công cụ tự mờ đi khi đang vẽ, để tay và mắt tập trung hết vào nét đang đi —
  // xem noteDrawActivity()/revealChrome() và khối style ở thanh trên/thanh công cụ.
  const [chromeHidden, setChromeHidden] = useState(false)
  // Thanh bút gắn vào mép nào của bảng — xem BarPos. Mặc định dính mép TRÊN, ngay dưới hàng công cụ:
  // đó là chỗ mọi app ghi chép đặt thanh bút, và cũng là chỗ ít che phần giấy đang viết nhất.
  const [barPos, setBarPos] = useState<BarPos>(() => readBarPos(PENBAR_KEY, 0.12) ?? { dock: "top", f: 0.12 })
  // Cụm hoàn tác/làm lại — nổi riêng khỏi thanh bút (xem C2/UNDOBAR_KEY). Mặc định dính mép PHẢI,
  // để không chồng lên thanh bút (mép trên) ngay từ lần mở đầu tiên.
  const [undoBarPos, setUndoBarPos] = useState<BarPos>(() => readBarPos(UNDOBAR_KEY, 0.14) ?? { dock: "right", f: 0.14 })
  // Bảng phụ đang mở trên thanh bút: cỡ nét, hoặc danh sách hình vẽ.
  const [penPop, setPenPop] = useState<null | "size" | "shape">(null)
  // Bảng màu bút (tấm trượt lên từ đáy). Ba tab như trong thiết kế: bảng có sẵn, tự pha, đã dùng.
  const [colorSheet, setColorSheet] = useState(false)
  const [colorTab, setColorTab] = useState<"palette" | "custom" | "history">("palette")
  // Đang ở chế độ "Sửa" của bảng màu — hiện nút xoá trên những màu tự pha đã lưu.
  const [colorEdit, setColorEdit] = useState(false)
  const [colorHistory, setColorHistory] = useState<string[]>(() => readColorList(COLOR_HISTORY_KEY, COLOR_HISTORY_MAX))
  const [customColors, setCustomColors] = useState<string[]>(() => readColorList(COLOR_CUSTOM_KEY, COLOR_CUSTOM_MAX))
  // Màu đang pha trong tab "Tùy chỉnh".
  const [mixColor, setMixColor] = useState("#1E1B1B")
  // Chuỗi đang gõ dở trong ô HEX. Tách khỏi mixColor vì gõ dở ("1E1B") chưa phải một màu hợp lệ —
  // ép nó thành màu ngay từng ký tự thì con trỏ nhảy lung tung và ô tự sửa chữ dưới tay người gõ.
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const [hasEyeDropper] = useState(() => eyeDropper() != null)
  const [eraserSize, setEraserSize] = useState(ERASER_SIZES[1])
  // Khoanh vùng bằng nét tay tự do, hay bằng một khung chữ nhật kéo từ góc này sang góc kia.
  const [lassoRect, setLassoRect] = useState(false)
  // Đang ở giữa cử chỉ "giữ bút rồi kéo = khoanh vùng tạm" (C3) — chỉ dùng để bật dải nhắc "Khoanh
  // một vòng…" giống lúc dùng tay công cụ khoanh vùng thật; KHÔNG đổi `tool`/`rawTool` (nhả tay ra
  // là về lại đúng cây bút đang cầm, không cần chọn lại).
  const [tempLassoActive, setTempLassoActive] = useState(false)
  // Tẩy cả nét hay chỉ tẩy phần chạm trúng. Mặc định tẩy MỘT PHẦN, giống cục tẩy thật và giống
  // GoodNotes: xoá được một chữ viết sai giữa một dòng dài mà không mất cả dòng.
  const [eraseWholeStroke, setEraseWholeStroke] = useState(false)
  // Ô viết phóng to: vùng bảng đang được phóng (toạ độ bảng). null = đang tắt.
  const [zoomBox, setZoomBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // Chế độ chỉ-bút (chống tì tay) — xem noteStylus().
  const [penOnly, setPenOnly] = useState(readPenOnly)
  const penSeen = useRef(false)
  // Người dùng đã tự bật/tắt bằng tay chưa — nếu rồi thì không tự động bật đè lên lựa chọn của họ.
  const penOnlyTouched = useRef(false)
  const [paper, setPaper] = useState<PaperKind>(readPaper)
  const [tone, setTone] = useState<PaperTone>(readTone)
  // Căn chỉnh khi kéo thẻ/ảnh: theo các đối tượng khác, và theo ô lưới. Tách hai công tắc vì đây là
  // hai kiểu canh khác hẳn nhau — có người muốn thẻ thẳng hàng với nhau nhưng không muốn bị ô lưới
  // kéo đi, và ngược lại.
  const [snapObjects, setSnapObjects] = useState(() => readSnap("obj"))
  const [snapGrid, setSnapGrid] = useState(() => readSnap("grid"))
  const [exportOpen, setExportOpen] = useState(false)
  // File đã dựng xong, đang chờ người dùng bấm để giao đi — xem exportBoard().
  const [exportReady, setExportReady] = useState<{ blob: Blob; name: string; kind: "png" | "pdf" } | null>(null)
  const [sel, setSel] = useState<Selection>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  // Sửa nhãn của một đường nối (vd. "gây ra", "chống chỉ định") — mở từ nút bút chì trên thanh nổi
  // khi đang chọn đường nối đó. Tách riêng khỏi editingId/draft (dùng cho sửa CHỮ THẺ) vì đường nối
  // không có một "ô" cố định trên bảng để đặt textarea đè lên như thẻ ghi chú.
  const [editingEdgeLabel, setEditingEdgeLabel] = useState<{ from: string; to: string; text: string; kind: "relationship" | "algorithm" } | null>(null)
  const [zoomPct, setZoomPct] = useState(100)
  // Cụm phóng-thu ở góc dưới trái mặc định chỉ hiện viên phần trăm; chạm vào mới bung ra bốn nút
  // còn lại — xem openZoomCluster()/bumpZoomCluster().
  const [zoomClusterOpen, setZoomClusterOpen] = useState(false)
  const [canUndo, setCanUndo] = useState(() => undoStore.undo.length > 0)
  const [canRedo, setCanRedo] = useState(() => undoStore.redo.length > 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  // Đang hỏi lại trước khi xoá một đường nối — xoá nhầm mất công gõ lại nhãn "quan hệ"/"phác đồ", nên
  // hỏi trước dù đã có hoàn tác (hoàn tác chỉ cứu được nếu người dùng NHỚ RA ngay, còn đang bận việc
  // khác thì không).
  const [confirmDeleteEdge, setConfirmDeleteEdge] = useState<{ from: string; to: string; kind?: "relationship" | "algorithm" } | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // Thẻ/ảnh vừa được tạo — chạy hiệu ứng bung ra một nhịp rồi thôi.
  const [bornId, setBornId] = useState<string | null>(null)
  // Đường nối vừa được tạo — chạy hiệu ứng vẽ dần từ thẻ này sang thẻ kia.
  const [newEdgeKey, setNewEdgeKey] = useState<string | null>(null)
  // Đang xếp lại nhánh: bật transition cho left/top của thẻ để thấy chúng trượt về chỗ mới.
  const [sliding, setSliding] = useState(false)
  const [selGroup, setSelGroup] = useState<GroupSel | null>(null)
  // Đang mở bảng chọn bài để gắn vào thẻ. "add" = tạo thẻ mới từ một bài; "edit" = gắn bài vào thẻ
  // đang sửa.
  const [pickLink, setPickLink] = useState<false | "add" | "edit">(false)
  const [linkQuery, setLinkQuery] = useState("")
  // Tìm thẻ trên bảng. `findIdx` là thẻ khớp đang được nhảy tới; `foundId` chạy hiệu ứng nhấp nháy
  // một nhịp quanh thẻ vừa nhảy tới, vì trên bảng rộng thì "đã bay tới nơi" rất khó nhận ra.
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState("")
  const [findIdx, setFindIdx] = useState(-1)
  const [foundId, setFoundId] = useState<string | null>(null)
  const [hasKeyboard] = useState(detectKeyboard)
  // Thanh nút trên thẻ đang chọn có hai trang: các thao tác, và hàng màu. Lưu theo ID THẺ (không phải
  // một cờ bật/tắt) để khi chọn sang thẻ khác thì thanh tự về trang thao tác, không cần dọn tay.
  const [colorsForId, setColorsForId] = useState<string | null>(null)
  // Bật thì mọi lần chọn màu áp cho cả nhánh bên dưới thẻ, không chỉ riêng thẻ đó.
  const [applyToBranch, setApplyToBranch] = useState(false)
  // Bảng chọn màu chữ / font đang mở trong ô sửa ghi chú — xem hàng định dạng chữ cạnh textarea.
  // Trước đây ba nút riêng (A+ / Màu chữ / Font) — gộp vào MỘT nút "Aa" mở một khay chung, để hàng
  // định dạng chữ không vượt quá 4-5 lựa chọn nhìn thấy cùng lúc (xem ghi chú ở nơi render).
  const [textStyleOpen, setTextStyleOpen] = useState(false)
  // Màu/kiểu/cỡ thẻ + "áp cho cả nhánh" gộp sau một khối gấp/mở riêng (moreStyleOpen) — đóng theo
  // mặc định vì phần lớn ghi chú chỉ cần gõ chữ, không cần chỉnh gì thêm; chỉ mở khi thật sự cần.
  const [moreStyleOpen, setMoreStyleOpen] = useState(false)
  const moreStyleId = useId()
  // Rỗng = không lọc, hiện hết. Có màu nào trong đây thì CHỈ những màu đó giữ độ đậm bình thường, thẻ
  // màu khác mờ đi — xem cách dùng ở chỗ vẽ thẻ ghi chú (dimmed) và menu "…" (mục "Lọc theo màu").
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set())
  // Kích thước thật của từng thẻ ghi chú, đo bằng ResizeObserver. Cần đo (không tính nhẩm) vì thẻ tự
  // giãn theo độ dài chữ — đường nối phải cắm đúng vào mép thẻ, và ảnh xuất ra phải khớp với bảng.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({})
  // Hướng dẫn cử chỉ hiện MỘT LẦN cho người dùng mới — xem readCoachSeen(). null lúc đầu (chưa biết,
  // tránh chớp hiện rồi tắt ngay trước khi đọc xong localStorage), rồi chốt true/false ngay sau đó.
  const [showCoach, setShowCoach] = useState<boolean | null>(null)

  const surfaceRef = useRef<HTMLDivElement>(null)
  // Thanh công cụ bút — đo bề rộng/chiều cao thật của nó khi kéo, để thanh không đi lố ra ngoài bảng.
  const penBarRef = useRef<HTMLDivElement>(null)
  // Cụm hoàn tác/làm lại nổi riêng — xem C2.
  const undoBarRef = useRef<HTMLDivElement>(null)
  const minimapPanelRef = useRef<HTMLDivElement>(null)
  const minimapViewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const draftPathRef = useRef<SVGPathElement>(null)
  const erasePreviewRef = useRef<SVGGElement>(null)
  // Ô viết phóng to: nét nháp, vòng tẩy và mặt nhận chạm của riêng nó.
  const zoomDraftRef = useRef<SVGPathElement>(null)
  const zoomEraserRingRef = useRef<HTMLDivElement>(null)
  const zoomSurfaceRef = useRef<HTMLDivElement>(null)
  // Phép quy đổi toạ độ đang có hiệu lực — chỉ khác null khi ngón/bút đang đặt trong ô phóng to.
  // Xem toBoard().
  const drawMap = useRef<((cx: number, cy: number) => { x: number; y: number }) | null>(null)
  const edgeLayerRef = useRef<SVGGElement>(null)
  const eraserRingRef = useRef<HTMLDivElement>(null)
  const floatBarRef = useRef<HTMLDivElement>(null)
  const vGuideRef = useRef<HTMLDivElement>(null)
  const hGuideRef = useRef<HTMLDivElement>(null)
  const lassoPathRef = useRef<SVGPathElement>(null)
  // Khung nháy sáng lên phần dữ liệu vừa hoàn tác/làm lại — xem flashChangeGlow() (D1). Là một
  // <rect> SVG (không phải div) để nằm cùng lớp toạ độ bảng với InkLayer, khỏi phải tự quy đổi.
  const undoGlowRef = useRef<SVGRectElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const foundTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Đếm ngược lúc nào thanh trên/thanh công cụ hiện lại — xem noteDrawActivity().
  const chromeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Đếm ngược lúc nào radar tự mờ đi — xem showRadar() trong applyView().
  const radarHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const view = useRef({ x: 24, y: 24, zoom: 1 })
  // Bản sao CÓ TRỄ của view.current, chỉ dùng để tính "thẻ nào đang trong khung nhìn" (lọc theo
  // khung nhìn cho lớp thẻ/đường nối chính — xem renderedNodeIds bên dưới). view.current tự nó CỐ Ý
  // không phải React state (xem applyView()) để kéo/phóng mượt 60fps không phải dựng lại cây React
  // mỗi khung hình — cullView đồng bộ lại từ đó nhưng có TRỄ (throttle, xem syncCullView trong
  // applyView), nên việc lọc cập nhật vài lần mỗi giây trong lúc kéo, không phải mỗi khung hình.
  const [cullView, setCullView] = useState(() => ({ ...view.current }))
  const cullViewSyncedAt = useRef(0)
  const cullViewTrailingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paperRef = useRef(paper)
  // Màu giấy đọc trong applyView() — hàm đó chạy ngoài vòng vẽ của React (ghi thẳng vào style), nên
  // phải lấy qua ref chứ không dùng được biến state trực tiếp.
  const toneRef = useRef<PaperTone>("white")
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const draftPts = useRef<number[] | null>(null)
  // Bề dày tại từng điểm của nét đang vẽ (chỉ bút mực) và trạng thái tính bề dày — xem lib/ink.ts.
  const draftWidths = useRef<number[] | null>(null)
  const inkState = useRef<InkWidthState | null>(null)
  // Bộ lọc rung One-Euro, tạo mới cho MỖI nét: bộ lọc mang trạng thái của nét trước, dùng lại thì
  // đầu nét mới bị kéo về phía cuối nét cũ.
  const smoother = useRef<PointerSmoother | null>(null)
  // ─── Nhận dạng hình khi giữ tay ───────────────────────────────────────────
  // Đồng hồ đếm khi tay đứng yên cuối nét, và hình đã nắn được (nếu có). Nắn xong thì KHOÁ lại tới
  // khi nhấc tay — nếu để nhận lại liên tục, hình sẽ nhấp nháy đổi qua đổi lại dưới tay người dùng.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdAnchor = useRef({ x: 0, y: 0 })
  const snapped = useRef<Recognized | null>(null)
  // Vùng khoanh đang vẽ (công cụ lasso) và những gì đã khoanh được.
  const lassoPts = useRef<number[] | null>(null)
  // Điểm đặt tay của một vùng khoanh HÌNH CHỮ NHẬT — bốn góc tính lại từ điểm này và điểm hiện tại.
  const lassoAnchor = useRef({ x: 0, y: 0 })
  // Đếm giờ + điểm mốc cho cử chỉ "giữ bút rồi kéo = khoanh vùng tạm" (C3) — xem startHoldLassoTimer().
  const holdLassoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdLassoAnchor = useRef({ x: 0, y: 0, pointerId: -1 })
  const erased = useRef(new Set<string>())
  // Tẩy MỘT PHẦN: với mỗi nét bị chạm, bản điểm đã chia nhỏ (xem densify) cùng những điểm đã bị tẩy
  // và những chỗ phải cắt đôi.
  const erasedParts = useRef(
    new Map<string, { pts: number[]; widths?: number[]; removed: Set<number>; cuts: Set<number> }>(),
  )
  const sizesRef = useRef<Record<string, { w: number; h: number }>>({})
  const sizesPending = useRef(false)
  const roRef = useRef<ResizeObserver | null>(null)
  // Phần tử DOM đang được ResizeObserver theo dõi cho từng node — cần để unobserve() đúng phần tử
  // khi thẻ bị xoá/unmount, nếu không ResizeObserver giữ tham chiếu tới phần tử đã rời DOM mãi mãi
  // (phiên làm việc dài, tạo/xoá nhiều thẻ sẽ tích luỹ tham chiếu chết).
  const observedElsRef = useRef<Map<string, HTMLElement>>(new Map())
  const anim = useRef<number | null>(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewRestored = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mốc hít gần nhất đang áp dụng khi kéo thẻ, để chỉ rung một nhịp lúc vừa dính vào mốc.
  const snapKey = useRef("")
  // Thẻ đang được thả LÊN TRÊN trong lúc kéo (kéo thẻ A chồng lên thẻ B = định nối A thành con B) —
  // null nếu ngón tay không đang ở trên một thẻ nào có thể nhận làm cha. Chỉ có ý nghĩa trong lúc
  // act.kind === "drag" && act.target === "node".
  const dropTargetId = useRef<string | null>(null)
  // Cách quy đổi toạ độ bảng ↔ điểm ảnh trong khung radar hiện tại — đọc lại mỗi khung hình lúc kéo
  // bảng (applyView) để vẽ khung khung nhìn, nên phải là ref (không phải state) để không trễ một nhịp
  // React. null nghĩa là bảng trống, không có gì để vẽ radar.
  const mmMapRef = useRef<{ x: number; y: number; scale: number; offX: number; offY: number } | null>(null)
  const mmDragging = useRef(false)

  const action = useRef<
    | { kind: "none" }
    | { kind: "draw" }
    | { kind: "shape"; sx: number; sy: number }
    | { kind: "erase" }
    | { kind: "lasso" }
    // Kéo cả nhóm đang khoanh chọn.
    | { kind: "groupdrag"; startX: number; startY: number; moved: boolean }
    | {
        kind: "pan"
        startX: number
        startY: number
        origX: number
        origY: number
        moved: boolean
        vx: number
        vy: number
        lastX: number
        lastY: number
        lastT: number
      }
    | {
        kind: "drag"
        target: "node" | "image"
        id: string
        startX: number
        startY: number
        origX: number
        origY: number
        moved: boolean
        el: HTMLElement | null
        // Kéo một thẻ thì cả nhánh bên dưới nó đi theo — `moveIds` là thẻ đang kéo CỘNG với mọi thẻ
        // con cháu của nó (chỉ mình nó nếu kéo ảnh, hoặc thẻ không có nhánh con). `descendantEls` là
        // phần tử DOM của riêng phần con cháu (không tính thẻ đang kéo, đã có sẵn ở `el`), lấy MỘT
        // LẦN lúc bắt đầu kéo để mỗi khung hình kéo không phải dò lại toàn bảng.
        moveIds: string[]
        descendantEls: HTMLElement[]
      }
    | {
        kind: "resize"
        id: string
        startX: number
        startY: number
        origW: number
        origH: number
        el: HTMLElement | null
      }
    | {
        kind: "pinch"
        startDist: number
        origZoom: number
        anchorBoard: { x: number; y: number }
        // Xem C1 — chạm nhiều ngón mà không hề kéo/phóng-thu (giữ yên rồi buông ngay) là một cử chỉ
        // KHÁC hẳn: hai ngón = hoàn tác, ba ngón = làm lại. `moved` bật lên ngay khi tâm hai ngón
        // hoặc khoảng cách giữa chúng đổi quá một ngưỡng nhỏ; `maxPointers` nhớ số ngón NHIỀU NHẤT
        // đã chạm cùng lúc trong suốt cử chỉ (không phải số ngón còn lại lúc nhấc tay — tay thường
        // nhấc từng ngón một, không phải cùng lúc).
        startTime: number
        startCx: number
        startCy: number
        maxPointers: number
        moved: boolean
      }
  >({ kind: "none" })

  // ─── Khung nhìn (pan/zoom) ─────────────────────────────────────────────────

  // Ghi pan/zoom hiện tại vào DOM. Đây là hàm duy nhất được phép đổi hình ảnh khung nhìn, nên không
  // bao giờ có chuyện lưới nền và nội dung lệch nhau một nhịp.
  function applyView() {
    const { x, y, zoom } = view.current
    const w = worldRef.current
    if (w) {
      w.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`
      // Các nút nổi trên bảng (thanh nhỏ trên thẻ đang chọn, tay cầm đổi cỡ ảnh) nhân nghịch đảo
      // mức phóng để luôn to bằng đầu ngón tay, thay vì phình ra/teo đi theo bảng.
      w.style.setProperty("--inv-zoom", String(1 / zoom))
    }
    const s = surfaceRef.current
    if (s) {
      const bg = paperBackground(paperRef.current, zoom, toneRef.current)
      s.style.backgroundImage = bg.backgroundImage
      s.style.backgroundSize = bg.backgroundSize
      s.style.backgroundPosition = `${x}px ${y}px`
    }
    drawMinimapViewport()
    showRadar()
    syncCullView()
  }

  // Đồng bộ cullView từ view.current, có TRỄ (throttle với cạnh sau — trailing edge): đủ lâu từ lần
  // đồng bộ trước thì cập nhật ngay; chưa đủ thì hẹn đúng MỘT lần cập nhật sau khi hết hạn trễ, để
  // lần đổi khung nhìn CUỐI trong một cú kéo/vẩy luôn tới đích, không bị bỏ sót.
  function syncCullView() {
    const now = performance.now()
    const elapsed = now - cullViewSyncedAt.current
    if (elapsed >= CULL_VIEW_THROTTLE_MS) {
      cullViewSyncedAt.current = now
      if (cullViewTrailingTimer.current) {
        clearTimeout(cullViewTrailingTimer.current)
        cullViewTrailingTimer.current = null
      }
      setCullView({ ...view.current })
    } else if (!cullViewTrailingTimer.current) {
      cullViewTrailingTimer.current = setTimeout(() => {
        cullViewTrailingTimer.current = null
        cullViewSyncedAt.current = performance.now()
        setCullView({ ...view.current })
      }, CULL_VIEW_THROTTLE_MS - elapsed)
    }
  }

  // Radar chỉ hiện trong lúc khung nhìn đang đổi và một nhịp ngắn sau đó — bảng ít nội dung hoặc
  // đang đứng yên thì một khung nhỏ luôn nổi ở góc chỉ thêm rối mắt mà không nói lên điều gì. Viết
  // trực tiếp vào style qua ref (không qua state) vì applyView() chạy ở tần suất một khung hình mỗi
  // lần trong lúc kéo/phóng — setState ở đó sẽ dựng lại cả cây React mỗi lần rê ngón tay.
  function showRadar() {
    const el = minimapPanelRef.current
    if (!el) return
    el.style.opacity = "1"
    el.style.pointerEvents = "auto"
    if (radarHideTimer.current) clearTimeout(radarHideTimer.current)
    radarHideTimer.current = setTimeout(() => {
      const cur = minimapPanelRef.current
      if (!cur) return
      cur.style.opacity = "0"
      cur.style.pointerEvents = "none"
    }, 1500)
  }

  // Khung trắng nhỏ trong radar thể hiện đúng phần bảng đang nhìn thấy — vẽ lại mỗi lần pan/zoom đổi.
  // Đặt ngoài applyView() làm hàm riêng để useEffect theo dõi vùng radar cũng gọi lại được, không phải
  // đợi người dùng pan/zoom thêm một cái mới thấy khung cập nhật đúng chỗ.
  function drawMinimapViewport() {
    const map = mmMapRef.current
    const el = minimapViewportRef.current
    if (!map || !el) return
    const rect = surfaceRect()
    const { x, y, zoom } = view.current
    const bx0 = -x / zoom
    const by0 = -y / zoom
    const bw = rect.width / zoom
    const bh = rect.height / zoom
    el.style.left = `${map.offX + (bx0 - map.x) * map.scale}px`
    el.style.top = `${map.offY + (by0 - map.y) * map.scale}px`
    el.style.width = `${Math.max(4, bw * map.scale)}px`
    el.style.height = `${Math.max(4, bh * map.scale)}px`
  }

  // Cách quy đổi toạ độ bảng ↔ điểm ảnh trong radar — vùng quy đổi là khung nội dung (thẻ + ảnh + nét
  // vẽ) nới rộng thêm biên mỗi phía, để các thẻ ở sát mép không dính luôn vào viền radar. Tính lại chỉ
  // khi nội dung thật sự đổi (không phải mỗi khung hình pan/zoom) — kéo/phóng chỉ cần vẽ lại KHUNG
  // NHÌN (drawMinimapViewport trong applyView), không cần tính lại toàn bộ cách quy đổi này.
  const mmMap = useMemo(() => {
    const cb = contentBounds({ nodes, edges, strokes, images }, sizes)
    if (!cb) return null
    const margin = Math.max(cb.w, cb.h, 200) * 0.18
    const rx = cb.x - margin
    const ry = cb.y - margin
    const rw = cb.w + margin * 2
    const rh = cb.h + margin * 2
    const drawW = MM_W - MM_PAD * 2
    const drawH = MM_H - MM_PAD * 2
    const scale = Math.min(drawW / rw, drawH / rh)
    return { x: rx, y: ry, scale, offX: MM_PAD + (drawW - rw * scale) / 2, offY: MM_PAD + (drawH - rh * scale) / 2 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, images, strokes, sizes])

  useEffect(() => {
    mmMapRef.current = mmMap
    drawMinimapViewport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mmMap])

  // Chạm hoặc kéo trong radar → nhảy thẳng khung nhìn tới đúng chỗ đó, giữ mức phóng hiện tại. Không
  // animateView (mượt nhưng có nhịp trễ ~200ms): kéo trong radar cần bảng dính NGAY theo ngón tay,
  // giống kéo trên bản đồ thật, animation ở đây sẽ làm ngón tay "chạy trước" khung nhìn.
  function jumpFromMinimap(clientX: number, clientY: number) {
    const map = mmMapRef.current
    const panel = minimapPanelRef.current
    if (!map || !panel) return
    const r = panel.getBoundingClientRect()
    const bx = map.x + (clientX - r.left - map.offX) / map.scale
    const by = map.y + (clientY - r.top - map.offY) / map.scale
    const rect = surfaceRect()
    const { zoom } = view.current
    view.current = { x: rect.width / 2 - bx * zoom, y: rect.height / 2 - by * zoom, zoom }
    applyView()
  }

  function handleMinimapPointerDown(e: ReactPointerEvent) {
    e.stopPropagation()
    stopAnim()
    mmDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    jumpFromMinimap(e.clientX, e.clientY)
    tickHaptic()
  }

  function handleMinimapPointerMove(e: ReactPointerEvent) {
    if (!mmDragging.current) return
    e.stopPropagation()
    jumpFromMinimap(e.clientX, e.clientY)
  }

  function handleMinimapPointerUp(e: ReactPointerEvent) {
    if (!mmDragging.current) return
    e.stopPropagation()
    mmDragging.current = false
    saveViewSoon()
  }

  useEffect(() => {
    paperRef.current = paper
    toneRef.current = tone
    applyView()
    try {
      localStorage.setItem(PAPER_STORAGE_KEY, paper)
    } catch {
      // Không lưu được lựa chọn giấy thì bỏ qua — không ảnh hưởng nội dung bảng.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper])

  useEffect(() => {
    return () => {
      if (anim.current) cancelAnimationFrame(anim.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      if (foundTimer.current) clearTimeout(foundTimer.current)
      if (chromeHideTimer.current) clearTimeout(chromeHideTimer.current)
      if (radarHideTimer.current) clearTimeout(radarHideTimer.current)
      if (holdTimer.current) clearTimeout(holdTimer.current)
      if (holdLassoTimer.current) clearTimeout(holdLassoTimer.current)
      if (cullViewTrailingTimer.current) clearTimeout(cullViewTrailingTimer.current)
      // Chỗ đang xem phải ghi NGAY khi rời màn hình, không chờ hết 500ms gộp lần ghi.
      if (viewSaveTimer.current) {
        clearTimeout(viewSaveTimer.current)
        writeView(view.current, boardId)
      }
      roRef.current?.disconnect()
    }
  }, [])

  // Mở bảng: trả khung nhìn về đúng chỗ làm việc lần trước. Nếu chỗ đó không còn thấy nội dung nào
  // (bảng vừa nhập từ máy khác, hoặc vừa xoá hết rồi hoàn tác) thì thu cả bảng vào vừa khung.
  useEffect(() => {
    if (loading || viewRestored.current) return
    viewRestored.current = true
    setShowCoach(!readCoachSeen())
    const saved = readView(boardId)
    if (saved) {
      view.current = { ...saved }
      applyView()
      setZoomPct(Math.round(saved.zoom * 100))
    }
    // Chờ một nhịp để ResizeObserver đo xong thẻ, rồi mới xét "có thấy gì không". setTimeout, không
    // phải requestAnimationFrame: rAF chỉ chạy khi tab đang thật sự compositing khung hình — mở
    // Mindmap từ một tab đang ở nền (ví dụ ứng dụng vừa được đưa lên nền trước khi màn kịp vẽ) có
    // thể khiến rAF treo vô thời hạn, bảng đứng yên ở giấy trắng dù có nội dung ở đâu đó ngoài khung
    // nhìn đã lưu. setTimeout luôn chạy qua hàng đợi sự kiện bình thường.
    const t = setTimeout(() => {
      if (!contentVisible()) fitToContent()
    }, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Chuột và bàn cảm ứng (máy tính): cuộn = kéo bảng, chụm hai ngón trên bàn cảm ứng (trình duyệt
  // gửi kèm ctrlKey) hoặc Ctrl+cuộn = phóng-thu quanh con trỏ. Phải gắn tay bằng addEventListener
  // với passive: false, vì React gắn sự kiện wheel ở chế độ passive nên gọi preventDefault trong
  // onWheel sẽ bị trình duyệt bỏ qua và cả trang bị cuộn theo.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stopAnim()
      const rect = surfaceRect()
      if (e.ctrlKey || e.metaKey) {
        const z = clampZoom(view.current.zoom * Math.exp(-e.deltaY * 0.0022))
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const bx = (cx - view.current.x) / view.current.zoom
        const by = (cy - view.current.y) / view.current.zoom
        view.current = { x: cx - bx * z, y: cy - by * z, zoom: z }
        applyView()
        showZoom()
        return
      }
      view.current = { ...view.current, x: view.current.x - e.deltaX, y: view.current.y - e.deltaY }
      applyView()
      saveViewSoon()
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopAnim() {
    if (anim.current) {
      cancelAnimationFrame(anim.current)
      anim.current = null
    }
  }

  function surfaceRect() {
    return surfaceRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 320, 420)
  }

  // Đổi toạ độ điểm trên màn hình sang toạ độ trên bảng (đã trừ pan, chia zoom).
  //
  // `drawMap` là cửa duy nhất để một MẶT VẼ KHÁC (ô viết phóng to ở đáy màn hình) chen vào phép quy
  // đổi này. Nhờ nó, toàn bộ phần vẽ/tẩy/nhận dạng hình bên dưới chạy nguyên xi trong ô phóng to mà
  // không phải viết lại một bản thứ hai — thứ chắc chắn sẽ trôi lệch khỏi bản gốc theo thời gian.
  function toBoard(clientX: number, clientY: number) {
    const map = drawMap.current
    if (map) return map(clientX, clientY)
    const rect = surfaceRect()
    const { x, y, zoom } = view.current
    return { x: (clientX - rect.left - x) / zoom, y: (clientY - rect.top - y) / zoom }
  }

  // Số pixel màn hình trên một đơn vị bảng, TẠI MẶT ĐANG VẼ. Mọi ngưỡng tính theo pixel màn hình
  // (khoảng cách điểm tối thiểu, bán kính tẩy, ngưỡng nhận dạng hình) phải chia cho con số này —
  // dùng nhầm mức phóng của bảng chính thì trong ô phóng to tẩy sẽ to gấp mấy lần đầu ngón tay.
  function drawScale() {
    return drawMap.current ? ZOOM_SCALE : view.current.zoom
  }

  function clampZoom(z: number) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
  }

  function showZoom() {
    setZoomPct(Math.round(view.current.zoom * 100))
    saveViewSoon()
  }

  // Ghi lại chỗ đang xem, gộp các lần gọi liên tiếp trong 500ms để không ghi localStorage liên tục
  // trong lúc còn đang kéo/phóng.
  function saveViewSoon() {
    if (viewSaveTimer.current) clearTimeout(viewSaveTimer.current)
    viewSaveTimer.current = setTimeout(() => {
      writeView(view.current, boardId)
      settleView()
    }, 500)
  }

  // "Cao su" khi vẩy/kéo ra quá xa nội dung: sau khi bảng ĐÃ DỪNG (đà trôi hết, hoặc 500ms không pan
  // tiếp — cùng nhịp với saveViewSoon), nếu tâm khung nhìn đã trôi ra khỏi vùng nội dung (nới rộng
  // thêm đúng một màn hình mỗi phía, để vẫn thoải mái xem quanh mép) thì kéo nhẹ về lại. KHÔNG chặn
  // trong lúc còn đang kéo/trôi — chặn giữa chừng sẽ làm bảng "dính khựng" ở biên, cảm giác như liệt
  // chứ không phải cao su thật. Chỉ hiệu lực khi bảng có nội dung: bảng trống thì đi đâu cũng được.
  function settleView() {
    // Còn một animation khác đang chạy (đà trôi chưa dứt, hoặc đang "vừa khung"...) — bỏ qua lần
    // này, ĐỪNG cắt ngang nó. Animation nào cũng tự gọi lại saveViewSoon() lúc xong (showZoom() và
    // nhánh dừng của startInertia đều làm vậy), nên lượt kiểm tra biên kế tiếp sẽ tự đến sau đó.
    if (anim.current) return
    const bounds = contentBounds(visibleData, sizesRef.current)
    if (!bounds) return
    const rect = surfaceRect()
    const { zoom } = view.current
    const vw = rect.width / zoom
    const vh = rect.height / zoom
    const overpan = Math.max(vw, vh, 200)
    const halfW = bounds.w / 2 + overpan
    const halfH = bounds.h / 2 + overpan
    const cbx = bounds.x + bounds.w / 2
    const cby = bounds.y + bounds.h / 2
    const vcx = -view.current.x / zoom + vw / 2
    const vcy = -view.current.y / zoom + vh / 2
    const ncx = Math.max(cbx - halfW, Math.min(cbx + halfW, vcx))
    const ncy = Math.max(cby - halfH, Math.min(cby + halfH, vcy))
    if (Math.abs(ncx - vcx) < 0.5 && Math.abs(ncy - vcy) < 0.5) return
    animateView({ x: -(ncx - vw / 2) * zoom, y: -(ncy - vh / 2) * zoom, zoom }, 320)
  }

  // Trong khung nhìn hiện tại có nhìn thấy chút nội dung nào không? Dùng khi mở bảng: khung nhìn đã
  // lưu có thể trỏ vào vùng giấy trắng (ví dụ vừa nhập bảng từ máy khác, toạ độ nằm chỗ khác hẳn).
  function contentVisible(): boolean {
    const b = contentBounds(visibleData, sizesRef.current)
    if (!b) return true
    const rect = surfaceRect()
    const { x, y, zoom } = view.current
    const left = b.x * zoom + x
    const top = b.y * zoom + y
    const right = (b.x + b.w) * zoom + x
    const bottom = (b.y + b.h) * zoom + y
    return right > 8 && bottom > 8 && left < rect.width - 8 && top < rect.height - 8
  }

  // Chạy khung nhìn tới đích theo đường cong chậm dần — dùng cho "vừa khung", nút ±, chạm hai lần.
  function animateView(target: { x: number; y: number; zoom: number }, ms = 260) {
    stopAnim()
    const from = { ...view.current }
    const t0 = performance.now()
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      view.current = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        zoom: from.zoom + (target.zoom - from.zoom) * e,
      }
      applyView()
      if (p < 1) anim.current = requestAnimationFrame(step)
      else {
        anim.current = null
        showZoom()
      }
    }
    anim.current = requestAnimationFrame(step)
  }

  // Phóng quanh một điểm trên MÀN HÌNH (mặc định là giữa mặt bảng) — giữ đúng điểm đó tại chỗ.
  // ─── Cụm phóng-thu: mở/thu ─────────────────────────────────────────────────
  // Xem A2 — mặc định chỉ hiện viên phần trăm, chạm vào mới bung ra −/+/vừa khung/ô viết phóng to.

  function openZoomCluster() {
    setZoomClusterOpen(true)
    tickHaptic()
  }

  // Trước đây cụm tự thu sau 3 giây bất kể người dùng đang làm gì — một trong những nguồn ức chế
  // kinh điển: bung cụm ra, nhìn mặt bảng để quyết định phóng bao nhiêu, đưa tay tới nút "+" thì
  // cụm vừa thu lại, cú chạm rơi vào viên phần trăm và bung lại từ đầu. Bỏ hẳn đồng hồ — giờ chỉ
  // thu khi bắt đầu vẽ (noteDrawActivity → closeZoomCluster) hoặc bấm lại nút mở/thu.
  function bumpZoomCluster() {
    // Không còn hẹn giờ tự thu — hàm giữ lại (không làm gì) để mọi chỗ gọi cũ không cần sửa.
  }

  function closeZoomCluster() {
    setZoomClusterOpen(false)
  }

  function zoomAround(nextZoom: number, sx?: number, sy?: number, ms = 200) {
    const rect = surfaceRect()
    const cx = sx ?? rect.width / 2
    const cy = sy ?? rect.height / 2
    const { x, y, zoom } = view.current
    const z = clampZoom(nextZoom)
    const bx = (cx - x) / zoom
    const by = (cy - y) / zoom
    animateView({ x: cx - bx * z, y: cy - by * z, zoom: z }, ms)
  }

  function fitToContent() {
    const b = contentBounds(visibleData, sizesRef.current)
    const rect = surfaceRect()
    if (!b) {
      animateView({ x: 24, y: 24, zoom: 1 })
      return
    }
    const pad = 40
    const z = clampZoom(Math.min((rect.width - pad * 2) / b.w, (rect.height - pad * 2) / b.h, 1.5))
    animateView({
      x: rect.width / 2 - (b.x + b.w / 2) * z,
      y: rect.height / 2 - (b.y + b.h / 2) * z,
      zoom: z,
    })
  }

  // ─── Hoàn tác / làm lại ────────────────────────────────────────────────────

  function snapshot(): MindmapData {
    return { nodes, edges, strokes, images }
  }

  function pushUndo() {
    undoStore.undo.push(snapshot())
    if (undoStore.undo.length > UNDO_LIMIT) undoStore.undo.shift()
    undoStore.redo.length = 0
    setCanUndo(true)
    setCanRedo(false)
  }

  // Phần dữ liệu THẬT SỰ khác nhau giữa hai bản ghi (trước/sau một lần hoàn tác hoặc làm lại) — chỉ
  // đúng những nét/thẻ/ảnh vừa mất hoặc vừa hiện lại, không phải toàn bộ bảng. Dùng để khoanh vùng
  // vừa đổi (D1): contentBounds() sẵn có đo khung bao của MỘT MindmapData, nên gói phần khác biệt
  // vào một MindmapData giả rồi đưa thẳng cho nó, giống cách groupBounds() đo khung của một nhóm
  // đang khoanh chọn.
  function diffSubset(before: MindmapData, after: MindmapData): MindmapData {
    const beforeStrokes = new Map((before.strokes ?? []).map((s) => [s.id, s]))
    const afterStrokes = new Map((after.strokes ?? []).map((s) => [s.id, s]))
    const strokesDiff: MindStroke[] = []
    beforeStrokes.forEach((s, id) => {
      if (!afterStrokes.has(id)) strokesDiff.push(s)
    })
    afterStrokes.forEach((s, id) => {
      if (!beforeStrokes.has(id)) strokesDiff.push(s)
    })

    const beforeImages = new Map((before.images ?? []).map((im) => [im.id, im]))
    const afterImages = new Map((after.images ?? []).map((im) => [im.id, im]))
    const imagesDiff: MindImage[] = []
    beforeImages.forEach((im, id) => {
      if (!afterImages.has(id)) imagesDiff.push(im)
    })
    afterImages.forEach((im, id) => {
      const b = beforeImages.get(id)
      if (!b || b.x !== im.x || b.y !== im.y || b.w !== im.w || b.h !== im.h) imagesDiff.push(im)
    })

    const beforeNodes = new Map(before.nodes.map((n) => [n.id, n]))
    const afterNodes = new Map(after.nodes.map((n) => [n.id, n]))
    const nodesDiff: MindNode[] = []
    beforeNodes.forEach((n, id) => {
      if (!afterNodes.has(id)) nodesDiff.push(n)
    })
    afterNodes.forEach((n, id) => {
      const b = beforeNodes.get(id)
      if (!b || b.x !== n.x || b.y !== n.y || b.text !== n.text) nodesDiff.push(n)
    })

    return { nodes: nodesDiff, edges: [], strokes: strokesDiff, images: imagesDiff }
  }

  // Tâm khung có đang nằm trong khung nhìn hiện tại không — dùng để quyết định có cần lăn bảng tới
  // đó trước khi nháy sáng hay không (D1). So TÂM, không so cả khung: một khung to hơn cả màn hình
  // vẫn nên coi là "đang thấy" nếu tâm nó đang ở giữa mắt, không cần lăn thêm.
  function boxCenterVisible(b: { x: number; y: number; w: number; h: number }): boolean {
    const rect = surfaceRect()
    const { x, y, zoom } = view.current
    const cx = x + (b.x + b.w / 2) * zoom
    const cy = y + (b.y + b.h / 2) * zoom
    return cx >= 0 && cx <= rect.width && cy >= 0 && cy <= rect.height
  }

  // Nháy sáng một khung trên bảng (D1) — viết trực tiếp vào DOM (không qua state) và ép chạy lại
  // animation từ đầu mỗi lần gọi (đọc offsetWidth để buộc reflow): hoàn tác/làm lại liên tiếp nhiều
  // lần nhanh vẫn phải thấy nháy sáng ở MỖI lần, không phải animation cũ còn dang dở bị bỏ qua vì
  // className không đổi.
  function flashChangeGlow(b: { x: number; y: number; w: number; h: number }) {
    const el = undoGlowRef.current
    if (!el) return
    const pad = 8
    el.setAttribute("x", String(b.x - pad))
    el.setAttribute("y", String(b.y - pad))
    el.setAttribute("width", String(b.w + pad * 2))
    el.setAttribute("height", String(b.h + pad * 2))
    el.style.display = "block"
    el.classList.remove("pulse-glow")
    // Đọc getBBox() để ép trình duyệt tính lại bố cục ngay — nếu không, gọi liên tiếp (hoàn tác
    // nhiều lần nhanh) sẽ không thấy nháy lần thứ hai vì trình duyệt gộp việc bỏ rồi thêm lại cùng
    // một className vào một lượt vẽ duy nhất, animation coi như chưa từng bị gỡ ra.
    void el.getBBox()
    el.classList.add("pulse-glow")
    // `.pulse-glow` không có fill-mode "forwards" (chủ ý — .mind-btn và các hoạt ảnh phản hồi chạm
    // khác trong file này đều vậy) nên khi chạy xong, trình duyệt trả opacity về giá trị NỀN của
    // chính rect — mà rect không đặt opacity riêng, nền đó là "hiện" (1). Không tự ẩn lại thì khung
    // dính lại trên bảng mãi sau lần nháy đầu tiên. `once: true` để mỗi lần gọi lại chỉ đăng ký một
    // lượt, không dồn thêm listener qua các lần hoàn tác liên tiếp.
    el.addEventListener("animationend", () => (el.style.display = "none"), { once: true })
  }

  // Lăn bảng tới khung vừa đổi (nếu đang ở ngoài khung nhìn) rồi nháy sáng lên đó, kèm một dòng nhắc
  // ngắn ở đáy — hoàn tác/làm lại đổi dữ liệu NGOÀI TẦM MẮT (cuộn xa, hay bị thẻ khác che) thì người
  // dùng không hề biết vừa có gì xảy ra, bấm đi bấm lại tưởng nút không ăn (D1).
  function announceHistoryJump(before: MindmapData, after: MindmapData, verb: string) {
    const subset = diffSubset(before, after)
    const box = contentBounds(subset, sizesRef.current)
    if (box) {
      if (!boxCenterVisible(box)) {
        const rect = surfaceRect()
        const zoom = view.current.zoom
        animateView(
          { x: rect.width / 2 - (box.x + box.w / 2) * zoom, y: rect.height / 2 - (box.y + box.h / 2) * zoom, zoom },
          320,
        )
      }
      flashChangeGlow(box)
    }
    const kind =
      (subset.strokes?.length ?? 0) > 0 ? "nét vẽ" : (subset.images?.length ?? 0) > 0 ? "ảnh" : subset.nodes.length > 0 ? "ghi chú" : null
    flashToast(kind ? `${verb}: ${kind}` : verb)
  }

  function undo() {
    const prev = undoStore.undo.pop()
    if (!prev) return
    const before = snapshot()
    undoStore.redo.push(before)
    replaceAll(prev)
    announceHistoryJump(before, prev, "Đã hoàn tác")
    setCanUndo(undoStore.undo.length > 0)
    setCanRedo(true)
    setEditingId(null)
    setSel(null)
    tickHaptic()
  }

  function redo() {
    const next = undoStore.redo.pop()
    if (!next) return
    const before = snapshot()
    undoStore.undo.push(before)
    replaceAll(next)
    announceHistoryJump(before, next, "Đã làm lại")
    setCanUndo(true)
    setCanRedo(undoStore.redo.length > 0)
    setEditingId(null)
    setSel(null)
    tickHaptic()
  }

  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  function dismissCoach() {
    setShowCoach(false)
    writeCoachSeen()
  }

  // ─── Đo kích thước thẻ ghi chú ─────────────────────────────────────────────

  function commitSizes() {
    if (sizesPending.current) return
    sizesPending.current = true
    requestAnimationFrame(() => {
      sizesPending.current = false
      setSizes({ ...sizesRef.current })
    })
  }

  function ensureObserver(): ResizeObserver | null {
    if (typeof ResizeObserver === "undefined") return null
    if (!roRef.current) {
      roRef.current = new ResizeObserver((entries) => {
        let changed = false
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement
          const id = el.dataset.nodeId
          if (!id) return
          const box = entry.borderBoxSize?.[0]
          const w = box ? box.inlineSize : el.offsetWidth
          const h = box ? box.blockSize : el.offsetHeight
          const prev = sizesRef.current[id]
          if (!prev || Math.abs(prev.w - w) > 0.5 || Math.abs(prev.h - h) > 0.5) {
            sizesRef.current[id] = { w, h }
            changed = true
          }
        })
        if (changed) commitSizes()
      })
    }
    return roRef.current
  }

  function registerNode(id: string, el: HTMLElement | null) {
    const ro = ensureObserver()
    const prevEl = observedElsRef.current.get(id)
    if (!el) {
      if (prevEl) {
        ro?.unobserve(prevEl)
        observedElsRef.current.delete(id)
      }
      if (sizesRef.current[id] && !nodes.some((n) => n.id === id)) delete sizesRef.current[id]
      return
    }
    if (prevEl && prevEl !== el) ro?.unobserve(prevEl)
    observedElsRef.current.set(id, el)
    ro?.observe(el)
    if (!sizesRef.current[id] && el.offsetWidth > 0) {
      sizesRef.current[id] = { w: el.offsetWidth, h: el.offsetHeight }
      commitSizes()
    }
  }

  function sizeOf(id: string): { w: number; h: number } | undefined {
    return sizesRef.current[id] ?? sizes[id]
  }

  // ─── Thêm nội dung ────────────────────────────────────────────────────────

  function viewCenterBoard() {
    const rect = surfaceRect()
    const { x, y, zoom } = view.current
    return { x: (rect.width / 2 - x) / zoom, y: (rect.height / 2 - y) / zoom }
  }

  // Tra bài mà một thẻ đang trỏ tới. Trả null nếu bài đó không còn (đã xoá khỏi thư viện) — thẻ vẫn
  // giữ liên kết để hoàn tác được, nhưng hiển thị rõ là bài đã mất.
  function resolveLink(target: string): { target: string; label: string; group: string } | null {
    return linkTargets.find((t) => t.target === target) ?? null
  }

  // Thẻ/ảnh vừa tạo được nhớ lại một nhịp để chạy hiệu ứng bung ra (xem class mind-born).
  function markBorn(id: string) {
    setBornId(id)
    setTimeout(() => setBornId((cur) => (cur === id ? null : cur)), 500)
  }

  // Đường nối vừa tạo được nhớ lại một nhịp để chạy hiệu ứng tô dần (mind-edge-draw). PHẢI tự xoá
  // sau khi hoạt ảnh xong (420ms, xem index.css) — không xoá thì class ở lại vĩnh viễn trên đúng
  // đường nối đó, và CSS của nó (`stroke-dasharray: 400`) đè mất nét đứt của kiểu "Quan hệ" mãi mãi
  // cho tới khi có đường nối MỚI khác giành lấy class.
  function markNewEdge(key: string) {
    setNewEdgeKey(key)
    setTimeout(() => setNewEdgeKey((cur) => (cur === key ? null : cur)), 500)
  }

  // Thêm ghi chú. Không truyền toạ độ thì đặt giữa khung nhìn; giữ ngón lên chỗ trống thì đặt ĐÚNG
  // chỗ đó (xem long-press trong handleSurfacePointerDown).
  function addNote(at?: { x: number; y: number }) {
    setAddOpen(false)
    const c = at ?? viewCenterBoard()
    // Đặt giữa khung thì lệch nhẹ theo số thẻ đã có để thẻ mới không nằm chồng khít lên thẻ vừa tạo;
    // còn khi người dùng chỉ đúng chỗ thì tôn trọng chỗ đó, không lệch.
    const off = at ? 0 : (nodes.length % 5) * 14
    const id = newId("n")
    pushUndo()
    updateNodes((ns) => [
      ...ns,
      {
        id,
        x: Math.round(c.x - NODE_FALLBACK.w / 2 + off),
        y: Math.round(c.y - NODE_FALLBACK.h / 2 + off),
        text: NEW_NODE_TEXT,
        // Màu tự cấp cho thẻ mới chỉ lấy trong nhóm ĐẬM: thẻ vừa tạo là thứ người dùng đang tập
        // trung vào, phải nổi. Muốn dùng màu sáng thì chọn tay — đó là lựa chọn có chủ ý ("ý này phụ
        // thôi"), không phải thứ nên rơi vào ngẫu nhiên theo số thứ tự thẻ.
        color: AUTO_COLORS[ns.length % AUTO_COLORS.length],
        style: "solid",
        size: "md",
      },
    ])
    setSel({ kind: "node", id })
    setEditingId(id)
    setDraft(NEW_NODE_TEXT)
    setTool("hand")
    markBorn(id)
    tickHaptic()
  }

  // Mục "Chữ": chữ trần trên giấy, không khung không nền — viết tiêu đề rồi tự vẽ trang trí quanh nó.
  function addText(at?: { x: number; y: number }) {
    setAddOpen(false)
    const c = at ?? viewCenterBoard()
    const id = newId("n")
    pushUndo()
    updateNodes((ns) => [
      ...ns,
      {
        id,
        x: Math.round(c.x - 60),
        y: Math.round(c.y - 16),
        text: NEW_TEXT_TEXT,
        color: NODE_COLORS[0],
        style: "plain",
        size: "lg",
      },
    ])
    setSel({ kind: "node", id })
    setEditingId(id)
    setDraft(NEW_TEXT_TEXT)
    setTool("hand")
    markBorn(id)
    tickHaptic()
  }

  // Mục "Bài viết": tạo thẻ mang đúng tên bài và gắn liên kết tới bài đó, để dựng sơ đồ nối nhiều bài
  // với nhau rồi chạm vào là mở bài ra đọc.
  function addLinkedNode(t: { target: string; label: string }) {
    setPickLink(false)
    setLinkQuery("")
    setAddOpen(false)
    const c = viewCenterBoard()
    const off = (nodes.length % 5) * 16
    const id = newId("n")
    pushUndo()
    updateNodes((ns) => [
      ...ns,
      {
        id,
        x: Math.round(c.x - NODE_FALLBACK.w / 2 + off),
        y: Math.round(c.y - NODE_FALLBACK.h / 2 + off),
        text: t.label,
        // Màu tự cấp cho thẻ mới chỉ lấy trong nhóm ĐẬM: thẻ vừa tạo là thứ người dùng đang tập
        // trung vào, phải nổi. Muốn dùng màu sáng thì chọn tay — đó là lựa chọn có chủ ý ("ý này phụ
        // thôi"), không phải thứ nên rơi vào ngẫu nhiên theo số thứ tự thẻ.
        color: AUTO_COLORS[ns.length % AUTO_COLORS.length],
        style: "soft",
        size: "md",
        link: t.target,
      },
    ])
    setSel({ kind: "node", id })
    setTool("hand")
    markBorn(id)
    tickHaptic()
    flashToast("Đã thêm thẻ gắn với bài này")
  }

  function addBranch(parent: MindNode) {
    const childCount = edges.filter((e) => e.from === parent.id).length
    const pos = branchPosition(nodeBox(parent, sizeOf(parent.id)), childCount)
    const id = newId("n")
    // Nhánh con lấy màu kế tiếp trong nhóm ĐẬM tính từ màu cha, nên các nhánh anh em khác màu nhau
    // rõ ràng. Cha đang mang màu sáng (indexOf = −1) thì bắt đầu lại từ đầu nhóm.
    const parentIdx = AUTO_COLORS.indexOf(parent.color)
    pushUndo()
    updateNodes((ns) => [
      // Thêm nhánh cho một thẻ ĐANG GẤP thì mở nhánh đó ra luôn: nếu không, thẻ vừa tạo bị ẩn ngay
      // lập tức và người dùng chỉ thấy con số trên dấu tròn nhích lên một.
      ...(parent.collapsed ? ns.map((n) => (n.id === parent.id ? { ...n, collapsed: undefined } : n)) : ns),
      {
        id,
        x: pos.x,
        y: pos.y,
        text: NEW_BRANCH_TEXT,
        color: AUTO_COLORS[(parentIdx + 1 + childCount) % AUTO_COLORS.length],
        style: parent.style === "solid" ? "soft" : (parent.style ?? "soft"),
        size: parent.size === "lg" ? "md" : (parent.size ?? "md"),
      },
    ])
    updateEdges((es) => [...es, { from: parent.id, to: id }])
    setSel({ kind: "node", id })
    setEditingId(id)
    setDraft(NEW_BRANCH_TEXT)
    markBorn(id)
    markNewEdge(edgeKey({ from: parent.id, to: id }))
    tickHaptic()
  }

  // ─── Tìm thẻ trên bảng ────────────────────────────────────────────────────
  //
  // Bảng là canvas vô hạn: một thẻ viết cách đây hai tuần có thể nằm ngoài khung nhìn vài nghìn
  // pixel, và cách duy nhất để tìm lại nó là kéo bảng đi lùng — hoặc thu nhỏ hết cỡ rồi nheo mắt.
  // Ô tìm này gõ tên là bay thẳng tới nơi.

  // Thẻ khớp, xếp theo vị trí TRÊN BẢNG (trên xuống, trái sang phải) chứ không theo thứ tự tạo: bấm
  // "tiếp" thì mắt đi theo một đường đoán được, không nhảy qua nhảy lại hai đầu bảng.
  function matchingNodes(): MindNode[] {
    const q = noAccent(findQuery.trim())
    if (!q) return []
    return nodes.filter((n) => noAccent(n.text).includes(q)).sort((a, b) => a.y - b.y || a.x - b.x)
  }

  function centerOnNode(node: MindNode) {
    const rect = surfaceRect()
    const b = nodeBox(node, sizeOf(node.id))
    // Không thu nhỏ bảng của người dùng, nhưng nếu đang thu quá nhỏ thì kéo về mức đọc được chữ.
    const z = clampZoom(Math.max(view.current.zoom, 0.8))
    animateView({ x: rect.width / 2 - (b.x + b.w / 2) * z, y: rect.height / 2 - (b.y + b.h / 2) * z, zoom: z }, 320)
  }

  function jumpToMatch(step: number) {
    const list = matchingNodes()
    if (list.length === 0) {
      flashToast("Không có thẻ nào khớp.")
      return
    }
    const i = (((findIdx + step) % list.length) + list.length) % list.length
    setFindIdx(i)
    const target = list[i]
    // Thẻ đang nằm trong nhánh bị gấp thì mở đường tới nó, không thì bay tới một chỗ trống rỗng.
    // KHÔNG ghi vào lịch sử hoàn tác: đây là thao tác xem, bấm hoàn tác lúc này là người dùng muốn
    // lấy lại nội dung vừa sửa chứ không phải gấp lại mấy nhánh vừa tự mở ra.
    if (hidden.has(target.id)) {
      const reopen = ancestorsOf(target.id, edges).filter((id) => nodes.some((n) => n.id === id && n.collapsed))
      if (reopen.length > 0) {
        updateNodes((ns) => ns.map((n) => (reopen.includes(n.id) ? { ...n, collapsed: undefined } : n)))
      }
    }
    centerOnNode(target)
    setSel({ kind: "node", id: target.id })
    setFoundId(target.id)
    if (foundTimer.current) clearTimeout(foundTimer.current)
    foundTimer.current = setTimeout(() => setFoundId(null), 900)
    tickHaptic()
  }

  function openFind() {
    setFindOpen(true)
    setMenuOpen(false)
    setAddOpen(false)
  }

  function closeFind() {
    setFindOpen(false)
    setFindQuery("")
    setFindIdx(-1)
    setFoundId(null)
  }

  useEffect(() => {
    if (findOpen) findInputRef.current?.focus()
  }, [findOpen])

  // Mở từ kết quả tìm xuyên-bảng ở màn danh sách: tự mở ô tìm với đúng từ khoá đó, một lần duy nhất
  // (không mở lại nếu người dùng tự đóng ô tìm sau đó rồi board re-render vì lý do khác).
  const initialFindAppliedRef = useRef(false)
  useEffect(() => {
    if (!initialFindQuery || loading || initialFindAppliedRef.current) return
    initialFindAppliedRef.current = true
    setFindQuery(initialFindQuery)
    openFind()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFindQuery, loading])

  const initialFindJumpedRef = useRef(false)
  useEffect(() => {
    if (!findOpen || findQuery !== initialFindQuery || initialFindJumpedRef.current) return
    initialFindJumpedRef.current = true
    // step = 1 (không phải 0): findIdx bắt đầu ở -1, "bước tới" một lần mới đúng là thẻ khớp ĐẦU
    // TIÊN — giống hệt việc người dùng tự bấm nút "khớp tiếp theo" một lần sau khi gõ xong.
    jumpToMatch(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findOpen, findQuery])

  function duplicateNode(node: MindNode) {
    const id = newId("n")
    pushUndo()
    // Bản sao không mang theo trạng thái "đang gấp": nó chưa có nhánh con nào để mà gấp, giữ lại chỉ
    // tạo ra một thẻ mang cờ vô nghĩa mà người dùng không có cách nào tắt.
    updateNodes((ns) => [...ns, { ...node, id, x: node.x + 20, y: node.y + 22, collapsed: undefined }])
    setSel({ kind: "node", id })
    markBorn(id)
    tickHaptic()
  }

  // ─── Sao chép/dán một nhánh sang bảng KHÁC ─────────────────────────────────
  // "Nhân đôi" (trên) chỉ nhân bản NGAY TRÊN bảng đang mở — không giúp được gì khi người dùng muốn
  // dùng lại một cụm thẻ (vd. phác đồ "Sốc nhiễm khuẩn") ở một bảng chuyên khoa khác. Sao chép ghi
  // xuống sessionStorage (xem lib/mindmapClipboard.ts) vì mỗi bảng là một lượt mount RIÊNG của
  // component này (key={activeBoardId} ở App.tsx) — state React thường không sống sót qua đó.

  // Sao chép một thẻ CÙNG TOÀN BỘ nhánh con của nó — cùng quy tắc "kéo cha thì con đi theo" mà việc
  // kéo tay và nhân đôi vẫn dùng.
  function copyBranch(node: MindNode) {
    const ids = new Set([node.id, ...descendantsOf(node.id, childrenMap(edges))])
    const copiedNodes = nodes.filter((n) => ids.has(n.id))
    const copiedEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
    writeMindmapClip({ nodes: copiedNodes, edges: copiedEdges, strokes: [], images: [] })
    flashToast(`Đã sao chép ${copiedNodes.length} thẻ — mở bảng khác rồi bấm "Thêm → Dán nhánh"`)
    tickHaptic()
  }

  // Sao chép nguyên một nhóm đang khoanh (nét vẽ + thẻ + ảnh) — dùng khi cụm muốn mang sang không
  // đi gọn theo quan hệ cha-con (vd. một mảng ghi chú rời kèm nét vẽ minh hoạ).
  function copyGroup(g: GroupSel) {
    if (g.nodes.length === 0 && g.strokes.length === 0 && g.images.length === 0) return
    const nodeIds = new Set(g.nodes)
    writeMindmapClip({
      nodes: nodes.filter((n) => nodeIds.has(n.id)),
      edges: edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)),
      strokes: strokes.filter((s) => g.strokes.includes(s.id)),
      images: images.filter((im) => g.images.includes(im.id)),
    })
    flashToast(`Đã sao chép phần đã chọn — mở bảng khác rồi bấm "Thêm → Dán nhánh"`)
    tickHaptic()
  }

  // Dán phần vừa sao chép (từ CHÍNH bảng này hoặc từ một bảng khác) vào giữa khung nhìn hiện tại.
  // Cấp lại ID MỚI cho mọi thứ — id cũ có thể trùng với thẻ đang có trên bảng đích (hai bảng khác
  // nhau nhưng cùng đọc từ một bản `newId()` trong cùng một phiên có xác suất trùng cực nhỏ nhưng
  // không phải KHÔNG THỂ, và dán 2 lần liên tiếp từ cùng một lần sao chép CHẮC CHẮN trùng nếu giữ
  // nguyên id) — kèm ánh xạ id cũ→mới để cạnh nối bám đúng thẻ vừa tạo, không đứt gãy.
  function pasteClip() {
    const clip = readMindmapClip()
    if (!clip || (clip.nodes.length === 0 && clip.strokes.length === 0 && clip.images.length === 0)) {
      flashToast("Chưa sao chép gì để dán")
      return
    }
    setAddOpen(false)
    // Đưa TRỌNG TÂM phần vừa dán ra giữa khung nhìn hiện tại — toạ độ ở bảng nguồn và bảng đích là
    // hai hệ gốc khác nhau, dán y nguyên toạ độ cũ dễ rơi ra ngoài màn hình, phải kéo đi tìm.
    const bounds = contentBounds({ nodes: clip.nodes, edges: [], strokes: clip.strokes, images: clip.images }, {})
    const c = viewCenterBoard()
    const dx = bounds ? Math.round(c.x - (bounds.x + bounds.w / 2)) : 0
    const dy = bounds ? Math.round(c.y - (bounds.y + bounds.h / 2)) : 0

    const idMap = new Map<string, string>()
    clip.nodes.forEach((n) => idMap.set(n.id, newId("n")))
    const newNodes: MindNode[] = clip.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      x: n.x + dx,
      y: n.y + dy,
      // Nhánh đang gấp ở bảng nguồn thì dán sang mở sẵn — nhánh con của nó không được sao chép theo
      // (copyBranch/copyGroup không đi qua thẻ ẩn), giữ "đang gấp" sẽ chỉ còn một cờ vô nghĩa.
      collapsed: undefined,
    }))
    const newEdges: MindEdge[] = clip.edges
      .filter((e) => idMap.has(e.from) && idMap.has(e.to))
      .map((e) => ({ ...e, from: idMap.get(e.from)!, to: idMap.get(e.to)! }))
    const newStrokes: MindStroke[] = clip.strokes.map((s) => ({
      ...s,
      id: newId("s"),
      points: s.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)),
    }))
    const newImages: MindImage[] = clip.images.map((im) => ({ ...im, id: newId("im"), x: im.x + dx, y: im.y + dy }))

    pushUndo()
    if (newNodes.length) updateNodes((ns) => [...ns, ...newNodes])
    if (newEdges.length) updateEdges((es) => [...es, ...newEdges])
    if (newStrokes.length) updateStrokes((ss) => [...ss, ...newStrokes])
    if (newImages.length) updateImages((ims) => [...ims, ...newImages])

    setSelGroup({
      nodes: newNodes.map((n) => n.id),
      strokes: newStrokes.map((s) => s.id),
      images: newImages.map((im) => im.id),
    })
    setTool("hand")
    tickHaptic()
    flashToast(`Đã dán ${newNodes.length + newStrokes.length + newImages.length} phần`)
  }

  // Xếp lại CẢ nhánh bên dưới một thẻ (con, cháu, chắt...) thành cây toả hai bên — xem layoutSubtree.
  // Chạy kèm hiệu ứng trượt (bật transition cho left/top trong 380ms) nên nhìn thấy rõ các thẻ tự đi
  // về chỗ mới, thay vì cả bảng nhảy một cái là xong mà không biết cái gì vừa đi đâu.
  function tidyBranches(parent: MindNode) {
    const moves = layoutSubtree(parent.id, nodes, edges, sizesRef.current)
    if (moves.size === 0) {
      flashToast("Thẻ này chưa có nhánh con nào.")
      return
    }
    pushUndo()
    setSliding(true)
    updateNodes((ns) => ns.map((n) => (moves.has(n.id) ? { ...n, ...moves.get(n.id)! } : n)))
    setSel({ kind: "node", id: parent.id })
    tickHaptic()
    setTimeout(() => setSliding(false), 420)
    flashToast(`Đã xếp lại ${moves.size} thẻ trong nhánh này`)
  }

  // Xếp lại MỌI nhánh trên bảng cùng lúc — chạy layoutSubtree cho từng "thẻ gốc" (thẻ không có thẻ
  // cha nào, tức không phải đích của đường nối nào). Mỗi thẻ gốc vẫn đứng yên tại chỗ như tidyBranches
  // vẫn làm — chỉ dọn phần CÀNH lộn xộn bên dưới, không xếp lại vị trí các cây so với nhau (xếp lại cả
  // vị trí cây là việc khác hẳn: người dùng đã tự tay đặt các cây đó ở đâu là có chủ ý, không nên tự
  // dịch chúng đi chỗ khác).
  function tidyAll() {
    const hasParent = new Set(edges.map((e) => e.to))
    const roots = nodes.filter((n) => !hasParent.has(n.id))
    const moves = new Map<string, { x: number; y: number }>()
    roots.forEach((r) => {
      layoutSubtree(r.id, nodes, edges, sizesRef.current).forEach((v, k) => moves.set(k, v))
    })
    if (moves.size === 0) {
      flashToast("Bảng chưa có nhánh nào để xếp lại.")
      return
    }
    pushUndo()
    setSliding(true)
    updateNodes((ns) => ns.map((n) => (moves.has(n.id) ? { ...n, ...moves.get(n.id)! } : n)))
    setSel(null)
    tickHaptic()
    setTimeout(() => setSliding(false), 420)
    flashToast(`Đã xếp lại ${moves.size} thẻ trên toàn bảng`)
  }

  function toggleColorFilter(c: string) {
    setColorFilter((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
    tickHaptic()
  }

  function clearColorFilter() {
    setColorFilter(new Set())
    tickHaptic()
  }

  // Gấp / mở nhánh con. Gấp xong thì bỏ luôn nhóm đang khoanh và ô sửa chữ nếu chúng trỏ vào thứ vừa
  // bị ẩn — để lại một thanh nút lơ lửng ở chỗ trống là kiểu lỗi khó hiểu nhất với người dùng.
  function toggleCollapse(node: MindNode) {
    const next = !node.collapsed
    // Số thẻ sẽ bị ẩn, tính trên bảng GIẢ ĐỊNH là đã gấp thẻ này — cùng một hàm mà cả bảng đang dùng
    // để biết cái gì đang ẩn, nên con số báo ra không bao giờ lệch với thực tế.
    const under = next
      ? hiddenByCollapse(nodes.map((n) => (n.id === node.id ? { ...n, collapsed: true } : n)), edges).hidden
      : new Set<string>()
    if (next && under.size === 0) {
      flashToast("Thẻ này chưa có nhánh con nào.")
      return
    }
    pushUndo()
    updateNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, collapsed: next || undefined } : n)))
    setSel({ kind: "node", id: node.id })
    tickHaptic()
    if (!next) {
      flashToast("Đã mở lại nhánh này")
      return
    }
    setSelGroup(null)
    if (editingId && under.has(editingId)) setEditingId(null)
    flashToast(`Đã gấp ${under.size} thẻ vào nhánh này`)
  }

  function pickImage() {
    setAddOpen(false)
    fileInputRef.current?.click()
  }

  async function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    setBusy(true)
    try {
      const c = viewCenterBoard()
      const added: MindImage[] = []
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await fileToResizedDataUrl(files[i], 1400, 0.82)
        const dim = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = () => resolve({ w: IMAGE_START_SIZE, h: IMAGE_START_SIZE })
          img.src = dataUrl
        })
        const scale = IMAGE_START_SIZE / Math.max(dim.w, dim.h)
        const w = Math.round(dim.w * scale)
        const h = Math.round(dim.h * scale)
        added.push({
          id: newId("im"),
          x: Math.round(c.x - w / 2 + i * 18),
          y: Math.round(c.y - h / 2 + i * 18),
          w,
          h,
          dataUrl,
        })
      }
      pushUndo()
      updateImages((ims) => [...ims, ...added])
      const last = added[added.length - 1]
      if (last) setSel({ kind: "image", id: last.id })
      setTool("hand")
      flashToast(added.length > 1 ? `Đã dán ${added.length} ảnh lên bảng` : "Đã dán ảnh lên bảng")
    } catch (err) {
      flashToast(err instanceof Error ? err.message : "Không thêm được ảnh.")
    } finally {
      setBusy(false)
    }
  }

  // Xuất bảng ra file. PNG và PDF đi qua cùng một đường: cùng kiểm tra bảng trống, cùng vẽ lại nội
  // dung, cùng cách giao file cho người dùng — chỉ khác bước đóng gói cuối cùng.
  //
  // Dựng xong KHÔNG giao file ngay mà mở một tấm "file đã sẵn sàng". Lý do là một hạn chế thật của
  // iOS: `navigator.share` chỉ chạy khi còn nằm trong cử chỉ chạm của người dùng, mà vẽ lại cả bảng
  // ra ảnh mất vài trăm mili-giây tới vài giây — tới lúc gọi thì cử chỉ đã hết hiệu lực, iOS từ
  // chối, và nhánh dự phòng (thẻ <a download>) thì trên iOS không lưu file mà chỉ mở blob ra một
  // tab trắng. Đó chính là "xuất file không được". Bấm nút trong tấm này là một cử chỉ MỚI, nên
  // bảng chia sẻ của iOS mở được bình thường.
  async function exportBoard(kind: "png" | "pdf") {
    setMenuOpen(false)
    setExportOpen(false)
    if (!contentBounds(visibleData, sizesRef.current)) {
      flashToast("Bảng đang trống — chưa có gì để xuất.")
      return
    }
    setBusy(true)
    try {
      // Xuất đúng phần ĐANG THẤY: nhánh đang gấp thì file cũng không có nó, không thì người dùng gấp
      // gọn bảng lại rồi xuất ra vẫn thấy nguyên đống thẻ mình vừa giấu đi.
      const title = boardName ?? "Sơ đồ tư duy"
      const blob =
        kind === "pdf"
          ? await exportMindmapPdf(visibleData, sizesRef.current, paperRef.current, title)
          : await exportMindmapPng(visibleData, sizesRef.current, paperRef.current)
      if (!blob) {
        flashToast("Không tạo được file trên máy này.")
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      setExportReady({ blob, name: `${safeFileName(title)}-${stamp}.${kind}`, kind })
    } catch {
      flashToast("Không xuất được file.")
    } finally {
      setBusy(false)
    }
  }

  // Sao chép bảng dưới dạng dàn ý văn bản — dán được vào ghi chú bệnh án/email, thứ ảnh/PDF không
  // làm được. Ưu tiên clipboard (dán ngay, đúng việc người dùng cần); Clipboard API không dùng được
  // (quyền bị chặn, trình duyệt cũ) thì tải về file .txt thay thế, không để im lặng thất bại.
  async function copyOutline() {
    setMenuOpen(false)
    setExportOpen(false)
    if (!contentBounds(visibleData, sizesRef.current)) {
      flashToast("Bảng đang trống — chưa có gì để sao chép.")
      return
    }
    setBusy(true)
    try {
      const title = boardName ?? "Sơ đồ tư duy"
      const text = `${title}\n${"=".repeat(title.length)}\n\n${buildOutlineText(visibleData)}`
      const copied = await copyOutlineText(text)
      if (copied) {
        flashToast("Đã sao chép — dán vào ghi chú bệnh án hoặc bất kỳ đâu.")
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      downloadOutlineText(text, `${safeFileName(title)}-${stamp}.txt`)
      flashToast("Không sao chép được — đã tải file văn bản thay thế.")
    } catch {
      flashToast("Không xuất được văn bản.")
    } finally {
      setBusy(false)
    }
  }

  // Giao file cho người dùng. Chỉ gọi từ trong tấm "file đã sẵn sàng", tức là luôn nằm trong một cử
  // chỉ chạm còn hiệu lực.
  async function deliverReady() {
    const ready = exportReady
    if (!ready) return
    try {
      const how = await deliverPng(ready.blob, ready.name)
      const what = ready.kind === "pdf" ? "file PDF" : "ảnh"
      flashToast(how === "share" ? `Đã gửi ${what} sang bảng chia sẻ.` : `Đã tải ${what} về máy.`)
      setExportReady(null)
    } catch {
      flashToast("Không giao được file — thử lại.")
    }
  }

  // Mở file ra xem trong một tab mới. Có mặt vì trên iOS đây là đường chắc chắn nhất: file hiện
  // trong trình xem sẵn có của máy, từ đó dùng nút chia sẻ của chính hệ điều hành để lưu đi đâu tuỳ ý.
  function openReadyInTab() {
    const ready = exportReady
    if (!ready) return
    const url = URL.createObjectURL(ready.blob)
    window.open(url, "_blank")
    // Không thu hồi ngay: tab mới còn đang đọc từ URL này. Trình duyệt tự dọn khi đóng trang.
    setExportReady(null)
  }

  function clearBoard() {
    pushUndo()
    replaceAll({ nodes: [], edges: [], strokes: [], images: [] })
    setConfirmClear(false)
    setSel(null)
    setEditingId(null)
    flashToast("Đã xoá bảng — bấm nút hoàn tác để lấy lại.")
  }

  // ─── Tẩy ──────────────────────────────────────────────────────────────────

  function eraseAt(bx: number, by: number) {
    const r = eraserSize / drawScale()
    let hitAny = false

    if (eraseWholeStroke) {
      strokes.forEach((s) => {
        if (erased.current.has(s.id)) return
        if (!strokeHit(s.points, s.width, bx, by, r)) return
        erased.current.add(s.id)
        hitAny = true
        // Ẩn ngay trên DOM để thấy phản hồi tức thì, dữ liệu chỉ ghi một lần khi nhấc tay.
        hideStrokeEl(s.id)
      })
      if (hitAny) tickHaptic()
      return
    }

    // ─── Tẩy một phần ────────────────────────────────────────────────────────
    // Đánh dấu phần bị tẩy của từng nét, rồi vẽ lại NGAY các mẩu còn sống vào một lớp xem trước
    // riêng. Không thể cập nhật thẳng phần tử gốc: một nét bị cắt làm đôi cần hai phần tử, mà thêm
    // phần tử giữa lúc kéo tay thì phải qua React — tức là dựng lại cả bảng ở mỗi khung hình.
    strokes.forEach((s) => {
      if (erased.current.has(s.id)) return
      if (!strokeHit(s.points, s.width, bx, by, r)) return
      let part = erasedParts.current.get(s.id)
      if (!part) {
        // Chia nhỏ MỘT LẦN khi bắt đầu tẩy nét này, rồi mọi lần chạm sau đều làm việc trên bản đã
        // chia — nếu chia lại ở mỗi lần chạm thì chỉ số điểm sẽ đổi và các dấu đã đánh trước đó
        // trỏ nhầm chỗ. Đoạn dài nhất lấy bằng 40% bán kính tẩy: đủ mịn để vết tẩy bám sát đầu
        // ngón tay, chưa tới mức làm phình dữ liệu.
        const dense = densify(s.points, s.widths, Math.max(1, r * 0.4))
        part = { pts: dense.points, widths: dense.widths, removed: new Set<number>(), cuts: new Set<number>() }
        erasedParts.current.set(s.id, part)
      }
      if (!markErased(part.pts, s.width, bx, by, r, part.removed, part.cuts)) return
      hitAny = true
      hideStrokeEl(s.id)
      const frags = surviveFragments(part.pts, part.widths, part.removed, part.cuts)
      if (frags.length === 0) {
        // Không còn mẩu nào → coi như xoá cả nét, khỏi giữ bản ghi rỗng.
        erased.current.add(s.id)
        erasedParts.current.delete(s.id)
      }
      drawErasePreview(s, frags)
    })
    if (hitAny) tickHaptic()
  }

  function hideStrokeEl(id: string) {
    const el = worldRef.current?.querySelector(`[data-stroke="${id}"]`)
    if (el instanceof SVGElement) el.style.display = "none"
  }

  // Vẽ các mẩu còn sống của MỘT nét vào lớp xem trước. Mỗi nét một nhóm riêng để cập nhật nét này
  // không phải dựng lại các nét khác đang tẩy dở.
  function drawErasePreview(s: MindStroke, frags: StrokeFragment[]) {
    const host = erasePreviewRef.current
    if (!host) return
    const ns = "http://www.w3.org/2000/svg"
    let g = host.querySelector(`[data-erase-for="${s.id}"]`)
    if (!g) {
      g = document.createElementNS(ns, "g")
      g.setAttribute("data-erase-for", s.id)
      host.appendChild(g)
    }
    while (g.firstChild) g.removeChild(g.firstChild)
    const filled = isFilled(s)
    frags.forEach((f) => {
      const path = document.createElementNS(ns, "path")
      const usesWidths = filled && f.widths && f.widths.length > 1
      path.setAttribute("d", usesWidths ? strokeOutline(f.points, f.widths!) : strokePath(f.points, s.straight))
      if (usesWidths) {
        path.setAttribute("fill", s.color)
        path.setAttribute("stroke", "none")
      } else {
        path.setAttribute("fill", "none")
        path.setAttribute("stroke", s.color)
        path.setAttribute("stroke-width", String(s.width))
        path.setAttribute("stroke-linecap", s.dash === "dot" ? "round" : strokeCap(s.tool))
        path.setAttribute("stroke-linejoin", "round")
        const da = strokeDashArray(s.dash, s.width)
        if (da) path.setAttribute("stroke-dasharray", da)
      }
      const alpha = strokeAlpha(s.tool)
      if (alpha !== 1) path.setAttribute("opacity", String(alpha))
      g!.appendChild(path)
    })
  }

  function clearErasePreview() {
    const host = erasePreviewRef.current
    if (!host) return
    while (host.firstChild) host.removeChild(host.firstChild)
  }

  // Bỏ dở việc tẩy: hiện lại những nét mới chỉ bị ẩn trên DOM. Cần thiết khi ngón thứ hai đặt xuống
  // giữa lúc đang tẩy (chuyển sang phóng-thu) — nếu không, nét trông như đã xoá nhưng vẫn còn trong
  // dữ liệu và sẽ hiện lại ở lần mở app sau.
  function unhideErased() {
    erased.current.forEach((id) => {
      const el = worldRef.current?.querySelector(`[data-stroke="${id}"]`)
      if (el instanceof SVGElement) el.style.display = ""
    })
    erasedParts.current.forEach((_, id) => {
      const el = worldRef.current?.querySelector(`[data-stroke="${id}"]`)
      if (el instanceof SVGElement) el.style.display = ""
    })
    erased.current.clear()
    erasedParts.current.clear()
    clearErasePreview()
    hideEraserRings()
  }

  function moveEraserRing(clientX: number, clientY: number) {
    const p = toBoard(clientX, clientY)
    const r = eraserSize / drawScale()
    // Vẽ vòng tẩy ở cả bảng chính lẫn ô phóng to: cả hai lớp đều dùng toạ độ bảng nên cùng một con
    // số đặt được vào cả hai, chỉ khác bề dày viền phải chia theo mức phóng của từng lớp để viền
    // luôn mảnh như nhau trên màn hình.
    const put = (ring: HTMLDivElement | null, scale: number) => {
      if (!ring) return
      ring.style.display = "block"
      ring.style.left = `${p.x - r}px`
      ring.style.top = `${p.y - r}px`
      ring.style.width = `${r * 2}px`
      ring.style.height = `${r * 2}px`
      ring.style.borderWidth = `${Math.max(1, 1.5 / scale)}px`
    }
    put(eraserRingRef.current, view.current.zoom)
    put(zoomEraserRingRef.current, ZOOM_SCALE)
  }

  function hideEraserRings() {
    if (eraserRingRef.current) eraserRingRef.current.style.display = "none"
    if (zoomEraserRingRef.current) zoomEraserRingRef.current.style.display = "none"
  }

  // ─── Nét đang vẽ ──────────────────────────────────────────────────────────

  // Nét đang vẽ dở phải hiện ở CẢ HAI mặt: trên bảng chính và trong ô viết phóng to. Cùng một dữ
  // liệu, cùng một toạ độ bảng — chỉ khác phép biến hình của lớp chứa, nên chỉ cần ghi cùng một
  // chuỗi `d` vào hai phần tử.
  function draftPaths(): SVGPathElement[] {
    return [draftPathRef.current, zoomDraftRef.current].filter((p): p is SVGPathElement => p != null)
  }

  // `filled`: nét nháp là vùng tô (bút mực có bề dày thay đổi) hay đường kẻ đều dày (bút chì, bút dạ,
  // băng dính, hình vẽ). `cap`: đầu nét — băng dính cắt vuông, còn lại đầu tròn (xem strokeCap).
  function beginDraft(width: number, color: string, opacity: number, filled: boolean, cap: "round" | "butt" = "round") {
    // Nét nháp phải mang ĐÚNG kiểu nét sẽ chốt lại: vẽ liền rồi nhấc tay mới thấy nó hoá nét đứt thì
    // không canh được khoảng hở rơi vào đâu — mà đó chính là thứ người ta canh khi vẽ nét đứt.
    const da = strokeDashArray(activeDash, width)
    draftPaths().forEach((p) => {
      if (filled) {
        p.setAttribute("fill", color)
        p.setAttribute("stroke", "none")
      } else {
        p.setAttribute("fill", "none")
        p.setAttribute("stroke", color)
        p.setAttribute("stroke-width", String(width))
      }
      p.setAttribute("stroke-linecap", activeDash === "dot" ? "round" : cap)
      if (da) p.setAttribute("stroke-dasharray", da)
      else p.removeAttribute("stroke-dasharray")
      p.setAttribute("opacity", String(opacity))
      p.setAttribute("d", "")
    })
  }

  function paintDraft(straight: boolean) {
    if (!draftPts.current) return
    const w = draftWidths.current
    const d =
      w && w.length > 1 && !straight ? strokeOutline(draftPts.current, w) : strokePath(draftPts.current, straight)
    draftPaths().forEach((p) => p.setAttribute("d", d))
  }

  function endDraft() {
    draftPts.current = null
    draftWidths.current = null
    inkState.current = null
    smoother.current = null
    snapped.current = null
    cancelHold()
    draftPaths().forEach((p) => p.setAttribute("d", ""))
  }

  // ─── Giữ yên tay cuối nét → nắn thành hình chuẩn ──────────────────────────
  //
  // Cách dùng giống GoodNotes: vẽ nguệch ngoạc bằng bút mực bình thường, KHÔNG nhấc tay, giữ yên
  // khoảng nửa giây. Ưu điểm so với việc chọn công cụ hình trước là không phải rời mạch suy nghĩ để
  // đi chọn công cụ — mà lúc đang dựng sơ đồ thì đó đúng là thứ hay làm đứt mạch nhất.
  //
  // Không nhận ra hình nào thì im lặng giữ nguyên nét tay: thà bỏ sót còn hơn nắn bừa chữ viết
  // thành hình (xem ghi chú ngưỡng trong lib/shapeRecognize.ts).

  // Tay còn nhúc nhích quá mức này (px màn hình) thì coi như chưa dừng, đếm lại từ đầu.
  const HOLD_MOVE_TOLERANCE = 5
  const HOLD_MS = 450

  function cancelHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function trackHold(clientX: number, clientY: number) {
    if (snapped.current) return
    // Đã rời khỏi chỗ đang giữ → bắt đầu đếm lại từ vị trí mới.
    if (holdTimer.current && dist(holdAnchor.current.x, holdAnchor.current.y, clientX, clientY) <= HOLD_MOVE_TOLERANCE) {
      return
    }
    cancelHold()
    holdAnchor.current = { x: clientX, y: clientY }
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null
      trySnapShape()
    }, HOLD_MS)
  }

  function trySnapShape() {
    const pts = draftPts.current
    if (!pts || action.current.kind !== "draw" || snapped.current) return
    // Truyền mức phóng vào: mọi ngưỡng nhận dạng đo theo pixel MÀN HÌNH, không theo toạ độ bảng —
    // nếu không, cùng một chữ viết tay sẽ bị nhận khác nhau tuỳ đang phóng to hay thu nhỏ.
    const found = recognizeShape(pts, drawScale())
    if (!found) return
    snapped.current = found
    draftPts.current = found.points.slice()
    // Hình nắn ra là đường kẻ đều dày, không phải vùng tô có bề dày thay đổi — vẽ lại nét nháp
    // theo đúng kiểu đó, nếu không hình sẽ hiện ra dưới dạng một vệt loang.
    draftWidths.current = null
    beginDraft(activeWidth, activeInk, strokeAlpha(inkOf(tool)), false)
    paintDraft(true)
    tickHaptic()
    flashToast(`Đã nắn thành ${SHAPE_LABELS[found.kind].toLowerCase()} — nhấc tay để giữ`)
  }

  function commitStroke(points: number[], straight: boolean, widths?: number[] | null) {
    const stroke: MindStroke = {
      id: newId("s"),
      points,
      color: activeInk,
      width: activeWidth,
      // Hình vẽ được chốt lại như một nét BÚT MÁY: nó dùng chung mực với bút máy (xem inkOf), nên
      // lưu là "shape" sẽ tạo ra một loại nét thứ năm không có luật hiển thị riêng nào cả.
      tool: inkOf(tool),
      ...(activeDash ? { dash: activeDash } : {}),
      ...(straight ? { straight: true } : {}),
      // Làm tròn 0.1 để dữ liệu lưu không phình vì mấy chữ số thập phân vô nghĩa.
      ...(widths && widths.length > 1 ? { widths: widths.map((w) => Math.round(w * 10) / 10) } : {}),
    }
    pushUndo()
    // flushSync: nét thật phải có mặt trong DOM TRƯỚC khi xoá nét nháp, nếu không sẽ có một khung
    // hình nét biến mất rồi hiện lại.
    flushSync(() => updateStrokes((ss) => [...ss, stroke]))
    endDraft()
  }

  // ─── Đường nối: cập nhật trực tiếp khi đang kéo thẻ ───────────────────────

  // Vẽ lại (chỉ trên DOM, không đụng state) mọi đường nối chạm vào tập thẻ đang kéo — dùng chung cho
  // kéo một thẻ (kèm nhánh con), kéo cả nhóm đang khoanh, v.v. Nhận CẢ TẬP một lần thay vì gọi lặp lại
  // cho từng id: một đường nối có CẢ HAI đầu cùng nằm trong tập đang kéo (nối hai thẻ trong cùng một
  // nhánh, hoặc hai thẻ cùng nằm trong vùng khoanh) phải thấy cả hai đầu dịch chuyển CÙNG LÚC trong
  // MỘT lần tính toán — gọi lặp từng id sẽ mỗi lần chỉ dịch một đầu, đầu kia bị tính lại từ vị trí gốc
  // (chưa kéo) của y hệt lần trước, khiến đường nối bị méo suốt lúc kéo rồi giật thẳng lại lúc thả tay.
  function redrawEdgesFor(moveIds: Set<string>, dx: number, dy: number) {
    const layer = edgeLayerRef.current
    if (!layer) return
    const byId = new Map(nodes.map((n) => [n.id, n]))
    edges.forEach((e) => {
      if (!moveIds.has(e.from) && !moveIds.has(e.to)) return
      const a = byId.get(e.from)
      const b = byId.get(e.to)
      if (!a || !b) return
      const boxA = nodeBox(a, sizeOf(a.id))
      const boxB = nodeBox(b, sizeOf(b.id))
      if (moveIds.has(e.from)) {
        boxA.x += dx
        boxA.y += dy
      }
      if (moveIds.has(e.to)) {
        boxB.x += dx
        boxB.y += dy
      }
      const g = edgeGeometry(boxA, boxB)
      const key = edgeKey(e)
      layer.querySelector(`[data-edge="${key}"]`)?.setAttribute("d", g.d)
      layer.querySelector(`[data-edge-head="${key}"]`)?.setAttribute("d", g.head)
      // Chữ nhãn CHẠY DỌC theo cung riêng của nó (xem <textPath> ở chỗ vẽ) — chỉ cần đổi `d` của
      // đúng cung đó là trình duyệt tự dựng lại chữ theo hình dạng mới, không phải tính lại vị trí
      // từng chữ cái bằng tay.
      layer.querySelector(`[data-edge-labelpath="${key}"]`)?.setAttribute("d", g.labelD)
    })
  }

  function setFloatBarHidden(hidden: boolean) {
    const el = floatBarRef.current
    if (!el) return
    el.style.opacity = hidden ? "0" : "1"
    el.style.pointerEvents = hidden ? "none" : "auto"
  }

  // ─── Hít vị trí khi kéo thẻ / ảnh ─────────────────────────────────────────
  //
  // Kéo tay tự do thì các thẻ luôn lệch nhau vài pixel, bảng nhìn lộn xộn dù đã cố canh. Nay khi kéo
  // tới gần một mốc — ô lưới của giấy, hoặc đường tâm/mép của một thẻ khác — thẻ tự dính vào mốc,
  // kèm một vạch chỉ báo và một nhịp rung. Ngưỡng tính theo pixel MÀN HÌNH nên cảm giác hít giống
  // nhau ở mọi mức phóng.
  function showGuide(ref: React.RefObject<HTMLDivElement | null>, boardPos: number | null, vertical: boolean) {
    const el = ref.current
    if (!el) return
    if (boardPos === null) {
      el.style.display = "none"
      return
    }
    const { x, y, zoom } = view.current
    el.style.display = "block"
    if (vertical) el.style.left = `${boardPos * zoom + x}px`
    else el.style.top = `${boardPos * zoom + y}px`
  }

  function snapDrag(
    act: { target: "node" | "image"; id: string; origX: number; origY: number },
    rawDx: number,
    rawDy: number,
  ): { dx: number; dy: number } {
    const z = view.current.zoom
    const tol = SNAP_DIST / z
    const size =
      act.target === "node"
        ? (sizeOf(act.id) ?? NODE_FALLBACK)
        : (() => {
            const im = images.find((i) => i.id === act.id)
            return im ? { w: im.w, h: im.h } : NODE_FALLBACK
          })()

    let x = act.origX + rawDx
    let y = act.origY + rawDy
    let guideX: number | null = null
    let guideY: number | null = null

    // Mốc từ các thẻ khác: mép trái, tâm, mép phải (và tương tự theo chiều dọc). Ưu tiên hơn lưới vì
    // canh thẳng với thẻ khác là ý người dùng muốn rõ ràng hơn.
    let bestX = tol
    let bestY = tol
    if (snapObjects) visibleNodes.forEach((n) => {
      if (act.target === "node" && n.id === act.id) return
      const b = nodeBox(n, sizeOf(n.id))
      const targetsX: [number, number][] = [
        [b.x, x],
        [b.x + b.w / 2, x + size.w / 2],
        [b.x + b.w, x + size.w],
      ]
      targetsX.forEach(([mark, cur]) => {
        const d = Math.abs(mark - cur)
        if (d < bestX) {
          bestX = d
          x += mark - cur
          guideX = mark
        }
      })
      const targetsY: [number, number][] = [
        [b.y, y],
        [b.y + b.h / 2, y + size.h / 2],
        [b.y + b.h, y + size.h],
      ]
      targetsY.forEach(([mark, cur]) => {
        const d = Math.abs(mark - cur)
        if (d < bestY) {
          bestY = d
          y += mark - cur
          guideY = mark
        }
      })
    })

    // Chưa canh được với thẻ nào thì hít vào ô lưới.
    if (snapGrid && guideX === null) {
      const gx = Math.round(x / SNAP_STEP) * SNAP_STEP
      if (Math.abs(gx - x) < tol) x = gx
    }
    if (snapGrid && guideY === null) {
      const gy = Math.round(y / SNAP_STEP) * SNAP_STEP
      if (Math.abs(gy - y) < tol) y = gy
    }

    showGuide(vGuideRef, guideX, true)
    showGuide(hGuideRef, guideY, false)

    // Rung MỘT nhịp đúng lúc vừa dính vào mốc mới, không rung liên tục suốt lúc kéo.
    const key = `${guideX ?? "-"}|${guideY ?? "-"}`
    if (key !== snapKey.current) {
      if (guideX !== null || guideY !== null) tickHaptic()
      snapKey.current = key
    }

    return { dx: x - act.origX, dy: y - act.origY }
  }

  function hideGuides() {
    showGuide(vGuideRef, null, true)
    showGuide(hGuideRef, null, false)
    snapKey.current = ""
  }

  // ─── Khoanh vùng chọn nhiều thứ cùng lúc ──────────────────────────────────

  // Khung bao quanh cả nhóm đang chọn, tính lại từ dữ liệu hiện tại (không lưu sẵn) nên sau khi kéo
  // nhóm hay đổi màu thì khung tự khớp lại.
  function groupBounds(g: GroupSel): { x: number; y: number; w: number; h: number } | null {
    const sub: MindmapData = {
      nodes: nodes.filter((n) => g.nodes.includes(n.id)),
      edges: [],
      strokes: strokes.filter((s) => g.strokes.includes(s.id)),
      images: images.filter((im) => g.images.includes(im.id)),
    }
    return contentBounds(sub, sizesRef.current)
  }

  function finishLasso() {
    const poly = lassoPts.current
    lassoPts.current = null
    if (lassoPathRef.current) {
      lassoPathRef.current.setAttribute("d", "")
      lassoPathRef.current.style.display = "none"
    }
    if (!poly || poly.length < 8) return

    const picked: GroupSel = {
      strokes: strokes.filter((s) => strokeMostlyInside(s.points, poly)).map((s) => s.id),
      // Chỉ những gì ĐANG THẤY: khoanh trúng một thẻ đang bị gấp thì người dùng không hề biết mình
      // vừa chọn nó, kéo cả nhóm đi sẽ kéo theo cả những thẻ vô hình.
      nodes: visibleNodes.filter((n) => boxCenterInside(nodeBox(n, sizeOf(n.id)), poly)).map((n) => n.id),
      images: images.filter((im) => boxCenterInside({ x: im.x, y: im.y, w: im.w, h: im.h }, poly)).map((im) => im.id),
    }
    const count = picked.strokes.length + picked.nodes.length + picked.images.length
    if (count === 0) {
      setSelGroup(null)
      flashToast("Vùng khoanh chưa trùm được thứ gì.")
      return
    }
    setSel(null)
    setSelGroup(picked)
    tickHaptic()
    flashToast(`Đã chọn ${count} thứ — kéo để di chuyển cả nhóm`)
  }

  // Các phần tử DOM của nhóm đang chọn, để dịch chuyển trực tiếp trong lúc kéo.
  function groupElements(g: GroupSel): { strokes: SVGElement[]; boxes: HTMLElement[] } {
    const world = worldRef.current
    if (!world) return { strokes: [], boxes: [] }
    const strokeEls: SVGElement[] = []
    g.strokes.forEach((id) => {
      const el = world.querySelector(`[data-stroke="${id}"]`)
      if (el instanceof SVGElement) strokeEls.push(el)
    })
    const boxEls: HTMLElement[] = []
    ;[...g.nodes.map((id) => `[data-node-id="${id}"]`), ...g.images.map((id) => `[data-image-id="${id}"]`)].forEach(
      (sel) => {
        const el = world.querySelector(sel)
        if (el instanceof HTMLElement) boxEls.push(el)
      },
    )
    return { strokes: strokeEls, boxes: boxEls }
  }

  function moveGroupDom(g: GroupSel, dx: number, dy: number) {
    const { strokes: sEls, boxes } = groupElements(g)
    // Nét vẽ là phần tử SVG: dịch bằng thuộc tính transform của SVG, không phải style của CSS.
    sEls.forEach((el) => el.setAttribute("transform", `translate(${dx} ${dy})`))
    boxes.forEach((el) => (el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`))
  }

  function clearGroupDom(g: GroupSel) {
    const { strokes: sEls, boxes } = groupElements(g)
    sEls.forEach((el) => el.removeAttribute("transform"))
    boxes.forEach((el) => (el.style.transform = ""))
  }

  function commitGroupMove(g: GroupSel, dx: number, dy: number) {
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      clearGroupDom(g)
      return
    }
    pushUndo()
    // Bỏ đệm đường đi TRƯỚC khi ghi dữ liệu mới, để lần vẽ ngay sau đó dựng lại nét ở chỗ mới.
    invalidatePaths(g.strokes)
    // Nét vẽ dịch bằng cách cộng thẳng vào toạ độ từng điểm — nét là danh sách điểm, không có gốc
    // riêng để dịch như thẻ.
    flushSync(() => {
      updateStrokes((ss) =>
        ss.map((s) => {
          if (!g.strokes.includes(s.id)) return s
          const pts = s.points.slice()
          for (let i = 0; i < pts.length; i += 2) {
            pts[i] = Math.round((pts[i] + dx) * 10) / 10
            pts[i + 1] = Math.round((pts[i + 1] + dy) * 10) / 10
          }
          return { ...s, points: pts }
        }),
      )
      updateNodes((ns) =>
        ns.map((n) => (g.nodes.includes(n.id) ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) } : n)),
      )
      updateImages((ims) =>
        ims.map((im) => (g.images.includes(im.id) ? { ...im, x: Math.round(im.x + dx), y: Math.round(im.y + dy) } : im)),
      )
    })
    // Dữ liệu đã ở chỗ mới → xoá style dịch tạm, nhóm vẫn đang được chọn.
    clearGroupDom(g)
  }

  function deleteGroup(g: GroupSel) {
    pushUndo()
    updateStrokes((ss) => ss.filter((s) => !g.strokes.includes(s.id)))
    updateNodes((ns) => ns.filter((n) => !g.nodes.includes(n.id)))
    updateEdges((es) => es.filter((e) => !g.nodes.includes(e.from) && !g.nodes.includes(e.to)))
    updateImages((ims) => ims.filter((im) => !g.images.includes(im.id)))
    setSelGroup(null)
    flashToast("Đã xoá phần đã chọn")
    tickHaptic()
  }

  // Đổi màu cả nhóm. Màu là thuộc tính vẽ, không nằm trong đường đi của nét, nên không cần bỏ đệm.
  function recolorGroup(g: GroupSel, color: string) {
    if (g.strokes.length === 0 && g.nodes.length === 0) return
    pushUndo()
    updateStrokes((ss) => ss.map((s) => (g.strokes.includes(s.id) ? { ...s, color } : s)))
    updateNodes((ns) => ns.map((n) => (g.nodes.includes(n.id) ? { ...n, color } : n)))
    tickHaptic()
  }

  // ─── Cử chỉ ───────────────────────────────────────────────────────────────

  function capture(e: ReactPointerEvent) {
    try {
      surfaceRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // Vài trình duyệt từ chối bắt con trỏ (ví dụ chuột đã nhả) — vẫn chạy được nhờ bubbling.
    }
  }

  // Dọn "ngón ma" còn sót lại trong pointers.current — xảy ra khi một ngón trước đó KHÔNG BAO GIỜ báo
  // pointerup/pointercancel (ví dụ trên iPhone Safari: vừa chạm để tạo ghi chú thì bàn phím ảo bật
  // lên ngay, đổi cả layout giữa lúc ngón vẫn còn trên mặt kính — Safari đôi khi bỏ luôn sự kiện nhấc
  // tay của ngón đó). Ngón thật MỚI luôn báo `isPrimary: true` nếu nó là ngón ĐẦU của một cử chỉ mới;
  // nếu điều đó đúng mà `pointers.current` vẫn còn mục cũ, mục cũ chắc chắn là rác — không dọn thì mọi
  // lần chạm một ngón về sau đều bị hiểu lầm thành "ngón thứ hai" (vào thẳng nhánh phóng-thu), tức là
  // chỉ zoom được, không bao giờ kéo được thẻ hay kéo được bảng nữa cho tới khi tải lại trang.
  function reapStalePointers(e: ReactPointerEvent) {
    if (e.isPrimary && pointers.current.size > 0) pointers.current.clear()
  }

  // ─── Phát hiện bút cảm ứng ────────────────────────────────────────────────
  //
  // Lần đầu thấy một sự kiện đến từ bút (Apple Pencil, bút Surface), tự bật chế độ chỉ-bút: từ đó
  // ngón tay chỉ để kéo và phóng-thu, còn vẽ thì chỉ bút mới vẽ được. Không có bước này thì phần
  // bàn tay tì lên màn hình khi viết sẽ để lại vệt mực ngang trang — lỗi khó chịu nhất khi viết
  // tay trên máy tính bảng.
  //
  // Bật TỰ ĐỘNG chứ không bắt người dùng đi tìm cài đặt, nhưng vẫn tắt được bằng tay (nút trong
  // menu "…"): có người thích vẽ bằng ngón tay ngay cả khi đang cầm bút.
  function noteStylus(e: ReactPointerEvent) {
    if (e.pointerType !== "pen" || penSeen.current) return
    penSeen.current = true
    // Người dùng đã tự tắt trước đó thì tôn trọng lựa chọn đó, không bật lại.
    if (penOnlyTouched.current) return
    setPenOnly(true)
    flashToast("Đã nhận ra bút — ngón tay giờ chỉ kéo và phóng-thu bảng")
  }

  function startPinch() {
    const [a, b] = Array.from(pointers.current.values())
    const rect = surfaceRect()
    const cx = (a.x + b.x) / 2 - rect.left
    const cy = (a.y + b.y) / 2 - rect.top
    const { x, y, zoom } = view.current
    cancelLongPress()
    cancelHoldLassoTimer()
    hideGuides()
    endDraft()
    unhideErased()
    action.current = {
      kind: "pinch",
      startDist: dist(a.x, a.y, b.x, b.y),
      origZoom: zoom,
      anchorBoard: { x: (cx - x) / zoom, y: (cy - y) / zoom },
      startTime: performance.now(),
      startCx: cx,
      startCy: cy,
      maxPointers: 2,
      moved: false,
    }
  }

  function handleSurfacePointerDown(e: ReactPointerEvent) {
    stopAnim()
    noteStylus(e)
    reapStalePointers(e)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    capture(e)

    // Ngón thứ hai đặt xuống → chuyển sang phóng-thu, bỏ nét đang vẽ dở.
    if (pointers.current.size === 2) {
      startPinch()
      return
    }
    if (pointers.current.size > 2) {
      // Ngón thứ ba (hoặc hơn) trong lúc đang phóng-thu: không đổi cách tính zoom (vẫn dùng đúng
      // hai ngón đầu), chỉ NHỚ đã có bao nhiêu ngón — để lúc nhấc tay phân biệt được chạm hai ngón
      // (hoàn tác) hay chạm ba ngón (làm lại), xem C1.
      if (action.current.kind === "pinch") {
        action.current.maxPointers = Math.max(action.current.maxPointers, pointers.current.size)
      }
      return
    }
    if (loading) return
    setMenuOpen(false)
    setAddOpen(false)
    // Đặt bút xuống bảng = đã chọn xong cỡ nét/hình vẽ → đóng bảng đang mở trên thanh bút, để nó
    // không nằm che mất chỗ vừa bắt đầu vẽ.
    setPenPop(null)

    const p = toBoard(e.clientX, e.clientY)

    // ─── Chống tì tay ────────────────────────────────────────────────────────
    // Đang ở chế độ chỉ-bút mà đây là NGÓN TAY → không vẽ/tẩy/khoanh, chuyển thẳng sang kéo bảng.
    // Đây chính là cách cầm bút thật: bàn tay tì lên màn hình lẽ ra không được để lại vệt mực nào,
    // còn ngón tay thì vẫn kéo và phóng-thu bảng được như thường.
    if (penOnly && e.pointerType === "touch" && DRAW_TOOLS.includes(tool)) {
      action.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        origX: view.current.x,
        origY: view.current.y,
        moved: false,
        vx: 0,
        vy: 0,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
      }
      return
    }

    // Đang có nhóm khoanh chọn và ngón đặt vào TRONG khung nhóm → kéo cả nhóm. Xét trước các công cụ
    // khác để việc kéo nhóm không bị công cụ đang chọn giành mất (nét vẽ đè lên chẳng hạn).
    if (selGroup && (tool === "lasso" || tool === "hand")) {
      const gb = groupBounds(selGroup)
      const pad = 10 / view.current.zoom
      if (gb && p.x >= gb.x - pad && p.x <= gb.x + gb.w + pad && p.y >= gb.y - pad && p.y <= gb.y + gb.h + pad) {
        action.current = { kind: "groupdrag", startX: e.clientX, startY: e.clientY, moved: false }
        return
      }
    }

    if (freehand) {
      beginInk(e, p)
      startHoldLassoTimer(e, p)
      return
    }
    // Băng dính đi chung đường với hình vẽ: cả hai đều là "kéo từ điểm này tới điểm kia rồi thả",
    // không phải nét tay. Khác nhau đúng một chỗ — băng dính luôn là một DẢI THẲNG, xử lý ở phần
    // kéo bên dưới.
    if (tool === "shape" || tool === "tape") {
      noteDrawActivity()
      action.current = { kind: "shape", sx: p.x, sy: p.y }
      draftPts.current = [p.x, p.y]
      draftWidths.current = null
      beginDraft(activeWidth, activeInk, strokeAlpha(inkOf(tool)), false, strokeCap(inkOf(tool)))
      startHoldLassoTimer(e, p)
      return
    }
    if (tool === "lasso") {
      action.current = { kind: "lasso" }
      lassoPts.current = [p.x, p.y]
      lassoAnchor.current = { x: p.x, y: p.y }
      setSelGroup(null)
      const el = lassoPathRef.current
      if (el) {
        el.setAttribute("d", "")
        el.style.display = "block"
      }
      return
    }
    if (tool === "eraser") {
      beginErase(e, p)
      return
    }
    action.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      origX: view.current.x,
      origY: view.current.y,
      moved: false,
      vx: 0,
      vy: 0,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
    }

    // Giữ ngón trên chỗ trống → tạo ghi chú ngay tại đó. Đây là cách đặt thẻ ĐÚNG chỗ mình muốn;
    // nút "Thêm" luôn đặt thẻ vào giữa khung nên phải kéo lại sau đó.
    cancelLongPress()
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      const act = action.current
      if (act.kind !== "pan" || act.moved) return
      action.current = { kind: "none" }
      addNote(p)
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // ─── Giữ bút rồi kéo = khoanh vùng tạm (C3) ────────────────────────────────
  //
  // Vì sao cần: đang vẽ dở một sơ đồ, muốn khoanh nhanh vài nét/thẻ để đổi màu hay xoá cả cụm — cách
  // "đúng" là đổi sang công cụ khoanh vùng, khoanh, rồi đổi lại bút. Ba lần chạm cho một việc phụ,
  // và đứt mạch tay đang cầm bút. Giữ yên bút một nhịp rồi kéo thì vào thẳng việc khoanh, nhả tay ra
  // là bút cũ vẫn còn trong tay — không phải hai lần đổi công cụ nào cả.
  //
  // Gọi ngay sau khi ĐÃ bắt đầu vẽ bình thường (beginInk / bắt đầu hình), không phải THAY vào chỗ
  // đó — nếu tay nhấc lên sớm hay kéo đi ngay, nét/hình vẽ vẫn chốt lại như thường, không có gì đổi
  // khác với trước đây. Chỉ khi giữ ĐỦ LÂU mà KHÔNG NHÚC NHÍCH thì mới bỏ nét dở và chuyển hướng.
  function startHoldLassoTimer(e: ReactPointerEvent, p: { x: number; y: number }) {
    // So sánh THAM CHIẾU đối tượng action, không phải `.kind`: một cử chỉ mới (nhấc tay rồi chạm lại,
    // hoặc đã chốt nét cũ) luôn tạo action MỚI, dù cùng kind — nhờ vậy hẹn giờ cũ hết hạn đúng lúc,
    // không cần huỷ tay ở mọi nơi có thể kết thúc một nét.
    const startedAction = action.current
    holdLassoAnchor.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    if (holdLassoTimer.current) clearTimeout(holdLassoTimer.current)
    holdLassoTimer.current = setTimeout(() => {
      holdLassoTimer.current = null
      if (action.current !== startedAction) return
      const anchor = holdLassoAnchor.current
      const cur = pointers.current.get(anchor.pointerId)
      if (!cur || dist(cur.x, cur.y, anchor.x, anchor.y) > HOLD_LASSO_TOLERANCE) return
      endDraft()
      action.current = { kind: "lasso" }
      lassoPts.current = [p.x, p.y]
      lassoAnchor.current = { x: p.x, y: p.y }
      setTempLassoActive(true)
      const el = lassoPathRef.current
      if (el) {
        el.setAttribute("d", "")
        el.style.display = "block"
      }
      // Rung để phân biệt với việc bắt đầu một nét — người dùng phải biết ngay là cử chỉ đã ĐỔI
      // HƯỚNG, không phải bút vừa khựng lại một nhịp rồi vẫn đang vẽ.
      tickHaptic()
    }, HOLD_LASSO_MS)
  }

  function cancelHoldLassoTimer() {
    if (holdLassoTimer.current) {
      clearTimeout(holdLassoTimer.current)
      holdLassoTimer.current = null
    }
  }

  function handleNodePointerDown(e: ReactPointerEvent, node: MindNode) {
    // Công cụ vẽ/tẩy: để sự kiện chạy tiếp xuống mặt bảng để vẽ đè lên cả ghi chú.
    if (drawTool || tool === "eraser") return
    reapStalePointers(e)
    if (pointers.current.size >= 1) {
      // Đã có một ngón trên bảng → ngón này là ngón thứ hai: phóng-thu, không kéo thẻ.
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      capture(e)
      if (pointers.current.size === 2) startPinch()
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    stopAnim()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    capture(e)
    setMenuOpen(false)
    setAddOpen(false)
    // Thẻ vừa tạo còn đang chạy hoạt ảnh "bung ra" (class mind-born, 0.42s — xem markBorn/index.css):
    // animation CSS đó điều khiển `transform` của CHÍNH thẻ này, cùng thuộc tính mà việc kéo cũng ghi
    // vào (act.el.style.transform bên dưới). Animation CSS luôn thắng style ghi trực tiếp trong lúc
    // nó còn chạy, nên kéo thẻ ngay sau khi tạo (chưa hết 0.42s) sẽ thấy thẻ "đứng im" dưới tay, dù dữ
    // liệu vẫn nhận đúng khi thả tay ra — tắt animation NGAY khi bắt đầu kéo để nhường quyền lại.
    if (bornId === node.id) setBornId(null)

    // Kéo một thẻ thì cả nhánh bên dưới nó phải đi theo — không ai muốn kéo "Suy tim" ra chỗ khác mà
    // "Furosemide"/"ACEi" đứng nguyên tại chỗ, dây nối chéo lung tung qua giữa bảng.
    const descendants = Array.from(descendantsOf(node.id, childrenMap(edges)))
    const world = worldRef.current
    const descendantEls: HTMLElement[] = []
    descendants.forEach((id) => {
      const el = world?.querySelector(`[data-node-id="${id}"]`)
      if (el instanceof HTMLElement) descendantEls.push(el)
    })
    const primaryEl = e.currentTarget as HTMLElement
    // Không cái nào trong nhánh đang kéo được chắn tia dò tìm "đang thả lên thẻ nào" — nếu không,
    // thẻ đang kéo (luôn nằm ngay dưới ngón tay) sẽ tự chắn mất chính cái nó đang che, không bao giờ
    // dò trúng thẻ THẬT SỰ nằm bên dưới ngón tay để nhận làm cha.
    primaryEl.style.pointerEvents = "none"
    descendantEls.forEach((el) => (el.style.pointerEvents = "none"))
    action.current = {
      kind: "drag",
      target: "node",
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      moved: false,
      el: primaryEl,
      moveIds: [node.id, ...descendants],
      descendantEls,
    }
  }

  function handleImagePointerDown(e: ReactPointerEvent, image: MindImage) {
    if (drawTool || tool === "eraser") return
    reapStalePointers(e)
    if (pointers.current.size >= 1) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      capture(e)
      if (pointers.current.size === 2) startPinch()
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    stopAnim()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    capture(e)
    setMenuOpen(false)
    setAddOpen(false)
    action.current = {
      kind: "drag",
      target: "image",
      id: image.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: image.x,
      origY: image.y,
      moved: false,
      el: e.currentTarget as HTMLElement,
      moveIds: [image.id],
      descendantEls: [],
    }
  }

  function handleResizePointerDown(e: ReactPointerEvent, image: MindImage) {
    // Chỉ đọc: tay cầm đổi cỡ vẫn hiện (nó không nằm trong thanh nổi bị ẩn), nhưng không được phép
    // kéo — nếu không nội dung "chỉ xem" vẫn đổi kích thước được dưới ngón tay.
    if (readOnly) return
    e.stopPropagation()
    stopAnim()
    reapStalePointers(e)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    capture(e)
    const el = worldRef.current?.querySelector(`[data-image-id="${image.id}"]`)
    action.current = {
      kind: "resize",
      id: image.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: image.w,
      origH: image.h,
      el: el instanceof HTMLElement ? el : null,
    }
    setFloatBarHidden(true)
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const act = action.current

    if (act.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      const d = dist(a.x, a.y, b.x, b.y)
      if (act.startDist <= 0) return
      const rect = surfaceRect()
      const z = clampZoom(act.origZoom * (d / act.startDist))
      const cx = (a.x + b.x) / 2 - rect.left
      const cy = (a.y + b.y) / 2 - rect.top
      // Tâm hai ngón dịch, hoặc khoảng cách giữa chúng đổi, quá một ngưỡng nhỏ → đây là một cử chỉ
      // kéo/phóng-thu THẬT, không phải chạm rồi buông ngay — loại khỏi diện "chạm nhiều ngón" (C1).
      if (!act.moved && (dist(cx, cy, act.startCx, act.startCy) > 10 || Math.abs(d - act.startDist) > 10)) {
        act.moved = true
      }
      // Giữ đúng điểm trên bảng nằm dưới giữa hai ngón → cảm giác "bảng dính vào ngón tay".
      view.current = { x: cx - act.anchorBoard.x * z, y: cy - act.anchorBoard.y * z, zoom: z }
      applyView()
      return
    }

    if (act.kind === "draw") {
      const pts = draftPts.current
      if (!pts) return
      // Hình đã nắn xong thì khoá lại — tay còn rê tiếp cũng không vẽ thêm gì nữa (giống GoodNotes:
      // nắn xong là xong, chỉ nhấc tay ra để chốt hoặc kéo ngược lại để huỷ).
      if (snapped.current) return

      // Lấy TOÀN BỘ mẫu mà trình duyệt đã gom lại, không chỉ mẫu cuối — đây là điểm khác biệt lớn
      // nhất về độ mượt khi vẽ nhanh. Xem ghi chú đầu lib/ink.ts.
      const samples = coalescedSamples(e.nativeEvent as PointerEvent, performance.now())
      const sm = smoother.current
      let added = false
      for (const s of samples) {
        // Lọc rung TRÊN TOẠ ĐỘ MÀN HÌNH rồi mới đổi sang toạ độ bảng: tham số bộ lọc chỉnh theo
        // pixel màn hình nên độ lọc giữ nguyên ở mọi mức phóng.
        const f = sm ? sm.filter(s.x, s.y, s.t) : { x: s.x, y: s.y }
        const p = toBoard(f.x, f.y)
        const lastX = pts[pts.length - 2]
        const lastY = pts[pts.length - 1]
        if (dist(lastX, lastY, p.x, p.y) < MIN_POINT_DIST / drawScale()) continue
        pts.push(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10)
        added = true
        const ws = draftWidths.current
        if (ws && inkState.current) ws.push(nextInkWidth(s, activeWidth, inkState.current))
      }
      if (added) paintDraft(false)
      // Giữ yên tay cuối nét → thử nắn thành hình chuẩn. Chỉ bút mực và bút chì, không áp cho bút dạ
      // (bút dạ dùng để tô nền chứ không để vẽ hình).
      if (tool === "pen" || tool === "pencil") trackHold(e.clientX, e.clientY)
      return
    }

    if (act.kind === "lasso") {
      const p = toBoard(e.clientX, e.clientY)
      const pts = lassoPts.current
      if (!pts) return
      // Khoanh theo khung chữ nhật: bốn góc tính lại từ điểm đặt tay và điểm hiện tại. Cần cách này
      // bên cạnh khoanh tay tự do vì phần lớn thứ muốn chọn trên bảng (một cụm thẻ, một khối chữ đã
      // viết) nằm gọn trong một khung vuông vắn — vẽ tay quanh nó vừa run vừa dễ sót mép, mà chỉ cần
      // sót một thẻ là cả nhóm kéo đi bị đứt.
      if (lassoRect) {
        const a = lassoAnchor.current
        lassoPts.current = [a.x, a.y, p.x, a.y, p.x, p.y, a.x, p.y]
        lassoPathRef.current?.setAttribute("d", `${strokePath(lassoPts.current, true)} Z`)
        return
      }
      if (dist(pts[pts.length - 2], pts[pts.length - 1], p.x, p.y) < 3 / view.current.zoom) return
      pts.push(p.x, p.y)
      // Vùng khoanh vẽ khép kín ngay trong lúc kéo để thấy rõ mình đang quây cái gì.
      lassoPathRef.current?.setAttribute("d", `${strokePath(pts, true)} Z`)
      return
    }

    if (act.kind === "shape") {
      const p = toBoard(e.clientX, e.clientY)
      draftPts.current =
        tool === "tape" ? [act.sx, act.sy, p.x, p.y] : shapePoints(shapeKind, act.sx, act.sy, p.x, p.y)
      paintDraft(true)
      return
    }

    if (act.kind === "erase") {
      moveEraserRing(e.clientX, e.clientY)
      const p = toBoard(e.clientX, e.clientY)
      eraseAt(p.x, p.y)
      return
    }

    if (act.kind === "groupdrag") {
      if (!selGroup) return
      const z = view.current.zoom
      const dx = (e.clientX - act.startX) / z
      const dy = (e.clientY - act.startY) / z
      if (!act.moved && (Math.abs(e.clientX - act.startX) > DRAG_SLOP || Math.abs(e.clientY - act.startY) > DRAG_SLOP)) {
        act.moved = true
      }
      if (!act.moved) return
      moveGroupDom(selGroup, dx, dy)
      redrawEdgesFor(new Set(selGroup.nodes), dx, dy)
      return
    }

    // Chỉ đọc: không cho thẻ/ảnh TRÔI theo ngón tay — bỏ qua hẳn khối này, `act.moved` không bao
    // giờ thành true, nên lúc thả tay (xem pointerup) tự rơi đúng vào nhánh "chạm không kéo = chọn",
    // không có bước nào ghi lại vị trí mới.
    if (act.kind === "drag" && !readOnly) {
      const z = view.current.zoom
      if (!act.moved && (Math.abs(e.clientX - act.startX) > DRAG_SLOP || Math.abs(e.clientY - act.startY) > DRAG_SLOP)) {
        act.moved = true
        cancelLongPress()
        setFloatBarHidden(true)
      }
      if (!act.moved) return
      const snapped = snapDrag(act, (e.clientX - act.startX) / z, (e.clientY - act.startY) / z)
      const transform = `translate3d(${snapped.dx}px, ${snapped.dy}px, 0)`
      if (act.el) act.el.style.transform = transform
      // Cả nhánh con đi theo thẻ cha đang kéo — cùng một độ dịch, để hình dạng cây không đổi giữa
      // chừng lúc kéo (chỉ trượt cả khối, không co giãn lệch lạc).
      act.descendantEls.forEach((el) => (el.style.transform = transform))
      if (act.target === "node") {
        redrawEdgesFor(new Set(act.moveIds), snapped.dx, snapped.dy)
        // Đang chồng lên một thẻ khác (không phải chính nó/nhánh con nó) → thả tay ở đây sẽ NỐI làm
        // cha, không phải chỉ dời vị trí. Viền sáng báo trước để không ai bị bất ngờ lúc thả tay.
        const hoverId = nodeIdAtPoint(e.clientX, e.clientY)
        setDropHighlight(hoverId && !act.moveIds.includes(hoverId) ? hoverId : null)
      }
      return
    }

    if (act.kind === "resize") {
      const z = view.current.zoom
      const dx = (e.clientX - act.startX) / z
      const dy = (e.clientY - act.startY) / z
      // Giữ đúng tỉ lệ ảnh: lấy chiều nào người dùng kéo mạnh hơn làm chuẩn.
      const ratio = act.origH / act.origW
      const w = Math.max(48, act.origW + (Math.abs(dx) > Math.abs(dy) ? dx : dy / ratio))
      if (act.el) {
        act.el.style.width = `${w}px`
        act.el.style.height = `${w * ratio}px`
      }
      return
    }

    if (act.kind === "pan") {
      const now = performance.now()
      const dt = Math.max(1, now - act.lastT)
      act.vx = (e.clientX - act.lastX) / dt
      act.vy = (e.clientY - act.lastY) / dt
      act.lastX = e.clientX
      act.lastY = e.clientY
      act.lastT = now
      if (!act.moved && (Math.abs(e.clientX - act.startX) > DRAG_SLOP || Math.abs(e.clientY - act.startY) > DRAG_SLOP)) {
        act.moved = true
      }
      view.current = {
        ...view.current,
        x: act.origX + (e.clientX - act.startX),
        y: act.origY + (e.clientY - act.startY),
      }
      applyView()
    }
  }

  // Bảng trôi thêm rồi dừng dần sau khi vẩy tay — chuyển động kiểu iOS, giảm 8% tốc độ mỗi khung
  // hình. Quãng trôi tổng ≈ 150 lần tốc độ lúc nhấc tay (px/ms): đủ để một cái vẩy đưa bảng đi xa,
  // vẫn dừng đúng chỗ mắt đoán được thay vì lao đi mất hút.
  function startInertia(vx: number, vy: number) {
    if (Math.hypot(vx, vy) < 0.08) return
    let sx = vx * 12
    let sy = vy * 12
    const step = () => {
      sx *= 0.92
      sy *= 0.92
      view.current = { ...view.current, x: view.current.x + sx, y: view.current.y + sy }
      applyView()
      if (Math.hypot(sx, sy) > 0.25) anim.current = requestAnimationFrame(step)
      else {
        anim.current = null
        saveViewSoon()
      }
    }
    anim.current = requestAnimationFrame(step)
  }

  function handleDoubleTapZoom(clientX: number, clientY: number) {
    const rect = surfaceRect()
    const target = view.current.zoom < 1.6 ? 2 : 1
    zoomAround(target, clientX - rect.left, clientY - rect.top, 240)
    tickHaptic()
  }

  function nodeIdAtPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY)
    const holder = el instanceof Element ? el.closest("[data-node-id]") : null
    return holder instanceof HTMLElement ? (holder.dataset.nodeId ?? null) : null
  }

  // Viền sáng quanh thẻ đang được thả lên trên trong lúc kéo — báo "thả tay ở đây để nối làm cha".
  function setDropHighlight(id: string | null) {
    if (dropTargetId.current === id) return
    if (dropTargetId.current) {
      const prev = worldRef.current?.querySelector(`[data-node-id="${dropTargetId.current}"]`)
      if (prev instanceof HTMLElement) prev.style.boxShadow = ""
    }
    dropTargetId.current = id
    if (id) {
      const next = worldRef.current?.querySelector(`[data-node-id="${id}"]`)
      if (next instanceof HTMLElement) next.style.boxShadow = "0 0 0 3px var(--c-primary), 0 0 0 6px rgba(var(--c-primary-rgb),.2)"
    }
  }

  // Đường nối nằm gần điểm vừa chạm nhất (nếu có) — để chạm vào đường nối là chọn được nó.
  function edgeAtPoint(clientX: number, clientY: number): MindEdge | null {
    const p = toBoard(clientX, clientY)
    const tol = EDGE_HIT_DIST / view.current.zoom
    let hit: MindEdge | null = null
    let hitDist = Infinity
    // Vòng for (không phải forEach): TypeScript theo được luồng gán biến nên `hit` giữ đúng kiểu.
    for (const ed of visibleEdges) {
      const a = nodes.find((n) => n.id === ed.from)
      const b = nodes.find((n) => n.id === ed.to)
      if (!a || !b) continue
      const d = edgeDistance(nodeBox(a, sizeOf(a.id)), nodeBox(b, sizeOf(b.id)), p.x, p.y)
      if (d <= tol && d < hitDist) {
        hitDist = d
        hit = ed
      }
    }
    return hit
  }

  function handlePointerUp(e: ReactPointerEvent) {
    cancelLongPress()
    if (!pointers.current.has(e.pointerId) && action.current.kind === "none") return
    pointers.current.delete(e.pointerId)
    const act = action.current

    if (act.kind === "pinch") {
      // ─── Chạm nhiều ngón (không kéo/phóng-thu) ──────────────────────────────
      // Đặt xuống rồi buông ngay, gần như không dịch chuyển: đây không phải một cử chỉ phóng-thu
      // dở, mà là CHẠM CÓ Ý — hai ngón để hoàn tác, ba ngón để làm lại. Không áp dụng ở chế độ chỉ
      // đọc (không có gì để hoàn tác/làm lại theo cách người dùng mong đợi ở màn xem), và không áp
      // dụng khi đang có nét dở — nhưng ngón thứ hai đặt xuống đã luôn HUỶ nét dở ngay từ
      // startPinch(), nên tới đây thì điều kiện đó chắc chắn đã đúng.
      const isTap = !act.moved && performance.now() - act.startTime < 300
      if (isTap && !readOnly && (act.maxPointers === 2 || act.maxPointers === 3)) {
        if (act.maxPointers === 2) undo()
        else redo()
        action.current = { kind: "none" }
        return
      }
      showZoom()
      if (pointers.current.size === 1) {
        // Nhấc một ngón nhưng ngón kia còn trên bảng → chuyển tiếp thành kéo bảng, để bảng vẫn dính
        // theo ngón còn lại thay vì đứng chết cho tới khi nhấc hết tay.
        const [p] = Array.from(pointers.current.values())
        action.current = {
          kind: "pan",
          startX: p.x,
          startY: p.y,
          origX: view.current.x,
          origY: view.current.y,
          moved: true,
          vx: 0,
          vy: 0,
          lastX: p.x,
          lastY: p.y,
          lastT: performance.now(),
        }
      } else action.current = { kind: "none" }
      return
    }

    if (act.kind === "draw" || act.kind === "shape") {
      cancelHold()
      cancelHoldLassoTimer()
      const pts = draftPts.current
      // Nét đã được nắn thành hình chuẩn (giữ yên tay giữa chừng) → chốt nó như một HÌNH: nối thẳng
      // các điểm, bề dày đều, không vuốt đuôi. Nắn xong mà vẫn vẽ như nét tay thì công sức nắn coi
      // như bỏ đi.
      const wasSnapped = snapped.current != null
      if (pts && pts.length >= 2) {
        // Hình vẽ chỉ là một cái chạm (không kéo) thì bỏ, tránh để lại dấu chấm vô nghĩa.
        const isTinyShape = act.kind === "shape" && dist(pts[0], pts[1], pts[2] ?? pts[0], pts[3] ?? pts[1]) < 6
        if (isTinyShape) endDraft()
        else {
          const widths = wasSnapped ? null : draftWidths.current
          // Vuốt mảnh đuôi nét: bút thật nhấc lên thì nét nhỏ dần, không cắt ngang bằng một đầu tù.
          if (widths) taperTail(widths)
          commitStroke(pts, act.kind === "shape" || wasSnapped, widths)
        }
      } else endDraft()
    }

    if (act.kind === "lasso") {
      finishLasso()
      // Nhả tay ra khỏi cử chỉ khoanh vùng TẠM (C3): tắt dải nhắc, không đổi gì tới `tool` — cây bút
      // đang cầm vẫn còn nguyên trong tay, không cần chọn lại.
      if (tempLassoActive) setTempLassoActive(false)
    }

    if (act.kind === "groupdrag" && selGroup) {
      const z = view.current.zoom
      if (act.moved) commitGroupMove(selGroup, (e.clientX - act.startX) / z, (e.clientY - act.startY) / z)
    }

    if (act.kind === "erase") {
      hideEraserRings()
      const gone = new Set(erased.current)
      const parts = erasedParts.current
      if (gone.size > 0 || parts.size > 0) {
        pushUndo()
        flushSync(() =>
          updateStrokes((ss) =>
            ss.flatMap((s) => {
              if (gone.has(s.id)) return []
              const part = parts.get(s.id)
              if (!part) return [s]
              const frags = surviveFragments(part.pts, part.widths, part.removed, part.cuts)
              // Mỗi mẩu là một nét MỚI với id riêng — giữ nguyên id cũ cho một trong các mẩu sẽ làm
              // bộ nhớ đệm đường đi (pathCache, khoá theo id) trả về hình dạng của nét trước khi tẩy.
              return frags.map((f) => ({
                ...s,
                id: newId("s"),
                points: f.points,
                ...(f.widths && f.widths.length > 1 ? { widths: f.widths } : {}),
              }))
            }),
          ),
        )
      }
      erased.current.clear()
      parts.clear()
      clearErasePreview()
    }

    if (act.kind === "drag") {
      const z = view.current.zoom
      // Đọc TRƯỚC khi setDropHighlight(null) xoá mất — đây là thẻ đang được thả lên trong lúc kéo,
      // nếu có, chỉ có ý nghĩa khi target là "node" (ảnh không nối được).
      const reparentTo = act.target === "node" ? dropTargetId.current : null
      setDropHighlight(null)
      if (act.el) act.el.style.pointerEvents = ""
      act.descendantEls.forEach((el) => (el.style.pointerEvents = ""))
      if (act.moved) {
        // Chốt đúng vị trí đã hít, không phải vị trí thô của ngón tay — nếu không thẻ sẽ nhảy lệch
        // khỏi mốc vừa dính vào ngay lúc thả tay.
        const snapped = snapDrag(act, (e.clientX - act.startX) / z, (e.clientY - act.startY) / z)
        hideGuides()
        const nx = Math.round(act.origX + snapped.dx)
        const ny = Math.round(act.origY + snapped.dy)
        // Cùng một độ dịch cho cả nhánh — tính từ đúng thẻ đang cầm kéo (đã hít mốc), không phải lấy
        // lại toạ độ thô của ngón tay, để cả khối đứng yên tương đối với nhau y hệt lúc đang kéo.
        const dx = nx - act.origX
        const dy = ny - act.origY
        pushUndo()
        // flushSync + xoá style tạm ngay sau đó: vị trí thật và vị trí tạm đổi trong cùng một khung
        // hình, nên thẻ không "nháy" về chỗ cũ rồi mới nhảy tới chỗ mới.
        flushSync(() => {
          if (act.target === "node") {
            const moveSet = new Set(act.moveIds)
            updateNodes((ns) => ns.map((n) => (moveSet.has(n.id) ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) } : n)))
            // Thả lên một thẻ khác = NỐI làm cha mới, thay cho cha CHÍNH cũ (đường nối đầu tiên trỏ
            // tới thẻ này — cùng định nghĩa "cha" mà ancestorsOf() dùng để mở lại nhánh gấp lúc tìm
            // thẻ). Dây nối tay khác trỏ tới thẻ này (không phải quan hệ cha-con) được giữ nguyên,
            // không bị dọn theo — người dùng bỏ công nối tay thì không tự nhiên biến mất.
            if (reparentTo) {
              updateEdges((es) => {
                const primaryIdx = es.findIndex((ed) => ed.to === act.id)
                if (primaryIdx >= 0 && es[primaryIdx].from === reparentTo) return es
                const next = primaryIdx >= 0 ? es.filter((_, i) => i !== primaryIdx) : es.slice()
                next.push({ from: reparentTo, to: act.id })
                return next
              })
            }
          } else updateImages((ims) => ims.map((im) => (im.id === act.id ? { ...im, x: nx, y: ny } : im)))
        })
        if (act.el) act.el.style.transform = ""
        act.descendantEls.forEach((el) => (el.style.transform = ""))
        setFloatBarHidden(false)
        if (reparentTo) {
          const targetName = nodes.find((n) => n.id === reparentTo)?.text ?? ""
          flashToast(targetName ? `Đã chuyển vào nhánh "${targetName}"` : "Đã đổi thẻ cha")
          tickHaptic()
        }
      } else {
        // Chạm không kéo = chọn. Chạm lại vào thẻ đang chọn = mở ô sửa chữ.
        if (act.target === "node") {
          const n = nodes.find((x) => x.id === act.id)
          if (n) {
            if (sel?.kind === "node" && sel.id === n.id) {
              // Đang CHỈ ĐỌC mà vẫn chạm lại vào đúng thẻ đang chọn để mở ô sửa: đây là ý định RÕ
              // RÀNG muốn sửa ngay thẻ này, không phải chạm nhầm — chuyển hẳn cả bảng sang chế độ sửa
              // (không chỉ mở riêng ô này) để những gì gõ tiếp theo (thêm nhánh, đổi màu…) cũng đi
              // vào đúng chế độ, không phải bật lại "Đang sửa" thêm một lần nữa ngay sau đó.
              if (readOnly) {
                setReadOnly(false)
                tickHaptic()
              }
              openEditor(n)
            } else {
              setSel({ kind: "node", id: n.id })
              tickHaptic()
            }
          }
        } else {
          setSel({ kind: "image", id: act.id })
          tickHaptic()
        }
      }
    }

    if (act.kind === "resize") {
      const z = view.current.zoom
      const dx = (e.clientX - act.startX) / z
      const dy = (e.clientY - act.startY) / z
      const ratio = act.origH / act.origW
      const w = Math.round(Math.max(48, act.origW + (Math.abs(dx) > Math.abs(dy) ? dx : dy / ratio)))
      const h = Math.round(w * ratio)
      // Ghi đúng cỡ vừa chốt vào style TRƯỚC khi lưu, rồi để nguyên. Khác với lúc kéo thẻ (nơi style
      // tạm là `transform`, thứ React không quản), ở đây style tạm chính là width/height mà React
      // đang quản — xoá đi sau khi lưu là xoá luôn cỡ ảnh, ảnh sẽ nhảy về kích thước gốc.
      if (act.el) {
        act.el.style.width = `${w}px`
        act.el.style.height = `${h}px`
      }
      pushUndo()
      flushSync(() => {
        updateImages((ims) => ims.map((im) => (im.id === act.id ? { ...im, w, h } : im)))
      })
      setFloatBarHidden(false)
    }

    if (act.kind === "pan") {
      if (act.moved) {
        startInertia(act.vx, act.vy)
        saveViewSoon()
      } else {
        // Chạm vào chỗ trống: nếu trúng một đường nối thì chọn đường nối đó; không trúng gì thì bỏ
        // chọn. Hai lần chạm nhanh cùng chỗ: phóng to.
        const now = performance.now()
        const near = dist(lastTap.current.x, lastTap.current.y, e.clientX, e.clientY) < 34
        if (now - lastTap.current.t < 300 && near) {
          handleDoubleTapZoom(e.clientX, e.clientY)
          lastTap.current = { t: 0, x: 0, y: 0 }
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY }
          const hitEdge = edgeAtPoint(e.clientX, e.clientY)
          if (hitEdge) {
            setSel({ kind: "edge", from: hitEdge.from, to: hitEdge.to })
            setColorsForId(null)
            tickHaptic()
          } else if (sel) setSel(null)
        }
      }
    }

    if (pointers.current.size === 0) action.current = { kind: "none" }
  }

  // ─── Sửa thẻ ghi chú ──────────────────────────────────────────────────────

  function openEditor(node: MindNode) {
    setSel({ kind: "node", id: node.id })
    setEditingId(node.id)
    setDraft(node.text)
    setTextStyleOpen(false)
    setMoreStyleOpen(false)
  }

  // Vùng chọn hiện tại trong ô sửa ghi chú — NHỚ LẠI qua ref (không phải chỉ đọc trực tiếp từ
  // textarea) vì bấm một nút định dạng làm textarea có thể mất focus ngay trước khi onClick chạy,
  // lúc đó selectionStart/selectionEnd của nó đã không còn phản ánh đúng đoạn người dùng vừa chọn.
  // Cùng cách BlockEditor.tsx đã dùng (currentSelection/selectionRef), chỉ gọn hơn vì ở đây luôn có
  // ĐÚNG MỘT ô đang sửa, không phải một danh sách nhiều block.
  const draftSelectionRef = useRef({ start: 0, end: 0 })
  function rememberDraftSelection() {
    const el = textareaRef.current
    if (el) draftSelectionRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }

  useEffect(() => {
    if (!editingId) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    // Chọn sẵn toàn bộ chữ: thẻ mới tạo có chữ mặc định, gõ là thay luôn — không phải xoá tay.
    if (draft === NEW_NODE_TEXT || draft === NEW_BRANCH_TEXT) el.select()
    else el.setSelectionRange(el.value.length, el.value.length)
    rememberDraftSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  // Áp một thuộc tính định dạng (đậm/nghiêng/gạch chân/tô sáng/cỡ/màu/font) lên đúng đoạn đang nhớ,
  // rồi đặt lại vùng chọn trên textarea đúng bằng đoạn chữ vừa định dạng — bấm liên tiếp nhiều nút
  // (vd đậm rồi tô màu) trên CÙNG một đoạn vẫn thao tác đúng đoạn đó, không phải chọn lại từ đầu.
  function applyDraftStyle(patch: Partial<StyleAttrs>) {
    const { start, end } = draftSelectionRef.current
    const res = applyStyleAt(draft, start, end, patch)
    setDraft(res.text)
    draftSelectionRef.current = { start: res.selStart, end: res.selEnd }
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(res.selStart, res.selEnd)
    })
    tickHaptic()
  }

  function saveEdit() {
    if (!editingId) return
    const id = editingId
    const text = draft.trim()
    updateNodes((ns) => ns.map((n) => (n.id === id ? { ...n, text: text || n.text } : n)))
    setEditingId(null)
  }

  // Đổi màu một thẻ, hoặc cả nhánh bên dưới nó khi đang bật "áp cho cả nhánh".
  function applyColor(node: MindNode, color: string) {
    if (!applyToBranch) {
      patchNode(node.id, { color })
      tickHaptic()
      return
    }
    const under = descendantsOf(node.id, childrenMap(edges))
    under.add(node.id)
    pushUndo()
    updateNodes((ns) => ns.map((n) => (under.has(n.id) ? { ...n, color } : n)))
    tickHaptic()
    flashToast(`Đã đổi màu ${under.size} thẻ trong nhánh`)
  }

  function patchNode(id: string, patch: Partial<MindNode>) {
    updateNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function deleteNode(id: string) {
    pushUndo()
    updateNodes((ns) => ns.filter((n) => n.id !== id))
    updateEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    setEditingId(null)
    setSel(null)
  }

  function deleteImage(id: string) {
    pushUndo()
    updateImages((ims) => ims.filter((im) => im.id !== id))
    setSel(null)
  }

  function deleteEdge(from: string, to: string) {
    pushUndo()
    updateEdges((es) => es.filter((ed) => !(ed.from === from && ed.to === to)))
    setSel(null)
    flashToast("Đã bỏ đường nối")
    tickHaptic()
  }

  // Chữ nhãn chạy dọc theo cung nối (xem edgeGeometry().labelD) — nhánh ngắn hơn chữ sẽ làm chữ tràn
  // ra khỏi hai đầu, đè lên thẳng hai thẻ. Đẩy CẢ NHÁNH bên dưới thẻ đích ra xa thêm đúng phần còn
  // thiếu, giữ nguyên hướng đang nối — cùng cách "kéo thẻ thì nhánh con đi theo" mà việc kéo tay vẫn làm.
  function ensureEdgeLength(from: string, to: string, label: string) {
    const a = nodes.find((n) => n.id === from)
    const b = nodes.find((n) => n.id === to)
    if (!a || !b) return
    const aBox = nodeBox(a, sizeOf(a.id))
    const bBox = nodeBox(b, sizeOf(b.id))
    const acx = aBox.x + aBox.w / 2
    const acy = aBox.y + aBox.h / 2
    const bcx = bBox.x + bBox.w / 2
    const bcy = bBox.y + bBox.h / 2
    const dist = Math.hypot(bcx - acx, bcy - acy)
    // Ước lượng bề rộng chữ (10.5px, đậm) + khoảng đệm hai đầu cho mép thẻ — cùng công thức đã dùng
    // trước đây cho khung nhãn dạng viên thuốc, nay dùng để biết "còn thiếu bao nhiêu" thôi.
    const minDist = label.length * 6.8 + 16 + 100
    if (dist < 1 || dist >= minDist) return
    const extra = minDist - dist
    const ux = (bcx - acx) / dist
    const uy = (bcy - acy) / dist
    const dx = Math.round(acx + ux * (dist + extra) - bBox.w / 2) - b.x
    const dy = Math.round(acy + uy * (dist + extra) - bBox.h / 2) - b.y
    const moveIds = new Set([to, ...descendantsOf(to, childrenMap(edges))])
    updateNodes((ns) => ns.map((n) => (moveIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)))
  }

  // Lưu nhãn + loại của đường nối đang sửa — chữ để trống thì XOÁ hẳn field `label` (không lưu chuỗi
  // rỗng), để đường nối không nhãn quay lại đúng như trước khi có tính năng này. Tương tự, loại
  // "relationship" (mặc định) XOÁ hẳn field `kind` thay vì lưu chuỗi — dữ liệu cũ và đường nối
  // "quan hệ" thường ngày trông giống hệt nhau về mặt lưu trữ, không rác thêm field khi không cần.
  function saveEdgeLabel() {
    if (!editingEdgeLabel) return
    const { from, to, text, kind } = editingEdgeLabel
    const trimmed = text.trim()
    pushUndo()
    updateEdges((es) =>
      es.map((ed): MindEdge => {
        if (ed.from !== from || ed.to !== to) return ed
        const next: MindEdge = { from: ed.from, to: ed.to }
        if (trimmed) next.label = trimmed
        if (kind === "algorithm") next.kind = kind
        return next
      }),
    )
    if (trimmed) ensureEdgeLength(from, to, trimmed)
    setEditingEdgeLabel(null)
  }

  // Xoá "thứ đang chọn", bất kể đó là gì — dùng cho phím Delete, nơi người dùng không phân biệt mình
  // đang chọn thẻ, ảnh, đường nối hay cả một nhóm.
  function deleteSelection() {
    if (selGroup) {
      deleteGroup(selGroup)
      return
    }
    if (sel?.kind === "node") deleteNode(sel.id)
    else if (sel?.kind === "image") deleteImage(sel.id)
    else if (sel?.kind === "edge") {
      const cur = edges.find((ed) => ed.from === sel.from && ed.to === sel.to)
      setConfirmDeleteEdge({ from: sel.from, to: sel.to, kind: cur?.kind })
    }
  }

  function selectAll() {
    const g: GroupSel = {
      strokes: strokes.map((s) => s.id),
      nodes: visibleNodes.map((n) => n.id),
      images: images.map((im) => im.id),
    }
    const count = g.strokes.length + g.nodes.length + g.images.length
    if (count === 0) return
    // Nhóm chỉ kéo được bằng công cụ tay hoặc khoanh vùng — đang cầm bút mà chọn hết thì trả về tay,
    // nếu không người dùng chọn xong lại vẽ một nét lên chính cái nhóm vừa chọn.
    if (tool !== "hand" && tool !== "lasso") setTool("hand")
    setSel(null)
    setSelGroup(g)
    tickHaptic()
    flashToast(`Đã chọn ${count} thứ trên bảng`)
  }

  // ─── Phím tắt (bàn phím máy tính) ─────────────────────────────────────────
  //
  // Bảng vẽ chủ yếu dùng trên điện thoại, nhưng khi ngồi máy tính soạn một sơ đồ dài thì mỗi việc
  // nhỏ đều phải rê chuột lên tận thanh công cụ. Đây là bộ phím quen tay của mọi app vẽ.
  //
  // Gắn ở cấp window chứ không phải mặt bảng: mặt bảng là một thẻ <div> không nhận tiêu điểm bàn
  // phím nên sẽ không bao giờ nhận được sự kiện. Đang gõ trong ô nhập chữ thì bỏ qua hết — gõ số "1"
  // vào nội dung ghi chú mà thành đổi công cụ thì hỏng việc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      // Đang gõ mà bấm phím khác Escape thì bỏ qua hết — gõ số "1" vào nội dung ghi chú mà thành đổi
      // công cụ thì hỏng việc. Riêng Escape: blur ô nhập RỒI CHẠY TIẾP xuống khối xử lý Escape bên
      // dưới, để cùng một lần bấm vừa rời bàn phím vừa đóng luôn tấm đang mở (trước đây phải bấm hai
      // lần — lần một chỉ blur, lần hai mới đóng được ô sửa ghi chú).
      if (typing && e.key !== "Escape") return
      if (typing) t?.blur()
      const mod = e.ctrlKey || e.metaKey
      if (mod) {
        const k = e.key.toLowerCase()
        // Hoàn tác/làm lại/chọn hết đều SỬA dữ liệu (hoàn tác có thể lùi lại tới trước lúc bật Chỉ
        // đọc, chọn hết mở ra thanh xoá cả nhóm) — chặn ở đây, cùng chỗ với mọi phím sửa khác bên
        // dưới. "Tìm" (k === "f") không sửa gì nên vẫn cho dùng.
        if (k === "z" && !readOnly) {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        } else if (k === "y" && !readOnly) {
          e.preventDefault()
          redo()
        } else if (k === "f") {
          e.preventDefault()
          openFind()
        } else if (k === "a" && !readOnly) {
          e.preventDefault()
          selectAll()
        }
        // Mọi tổ hợp Ctrl/Cmd khác để nguyên cho trình duyệt (Ctrl+R tải lại, Ctrl+P in...).
        return
      }

      if (e.key === "Escape") {
        // Đóng theo thứ tự "cái vừa mở đóng trước" — bấm Esc liên tục thì lùi dần ra ngoài, giống
        // mọi hộp thoại lồng nhau khác.
        if (pickLink) setPickLink(false)
        else if (colorSheet) setColorSheet(false)
        else if (penPop) setPenPop(null)
        else if (confirmClear) setConfirmClear(false)
        else if (confirmDeleteEdge) setConfirmDeleteEdge(null)
        else if (menuOpen || addOpen) {
          setMenuOpen(false)
          setAddOpen(false)
        } else if (editingId) setEditingId(null)
        else if (findOpen) closeFind()
        else if (selGroup) setSelGroup(null)
        else if (sel) setSel(null)
        else if (tool !== "hand") setTool("hand")
        return
      }
      // Đang mở hộp thoại phủ lên bảng thì mọi phím khác không được đụng tới bảng phía dưới.
      if (pickLink || confirmClear || confirmDeleteEdge) return
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!readOnly && (sel || selGroup)) {
          e.preventDefault()
          deleteSelection()
        }
        return
      }
      if (e.key === "Enter" && !readOnly && sel?.kind === "node") {
        const n = nodes.find((x) => x.id === sel.id)
        if (n) {
          e.preventDefault()
          openEditor(n)
        }
        return
      }
      // Tab thêm nhánh con cho thẻ đang chọn — giống cách mọi app sơ đồ tư duy trên máy tính làm.
      // CHỈ áp dụng khi focus đang ở mặt bảng hoặc ở đúng thẻ đang chọn (thẻ là <div>, không bao
      // giờ khớp BUTTON/A), không phải một nút thật đang có focus (vd nút nổi Sửa/Thêm nhánh/Xoá
      // cạnh thẻ) — nếu không, Tab từ nút này sang nút khác trên thanh nổi sẽ bị cướp thành "thêm
      // nhánh", chặn mất đường di chuyển focus bình thường của người dùng bàn phím.
      const focusOnControl = t?.tagName === "BUTTON" || t?.tagName === "A"
      if (e.key === "Tab" && !readOnly && !focusOnControl && sel?.kind === "node") {
        const n = nodes.find((x) => x.id === sel.id)
        if (n) {
          e.preventDefault()
          addBranch(n)
        }
        return
      }
      if (e.key === "+" || e.key === "=") {
        zoomAround(view.current.zoom * 1.35)
        return
      }
      if (e.key === "-" || e.key === "_") {
        zoomAround(view.current.zoom / 1.35)
        return
      }
      if (e.key === "0") {
        fitToContent()
        return
      }
      // Dời thẻ đang chọn bằng phím mũi tên — chuột/bàn cảm ứng đã kéo được rồi, nhưng người dùng chỉ
      // dùng bàn phím (xem vòng focus riêng cho .mind-btn/.mind-input ở index.css) không có cách nào
      // khác để tinh chỉnh vị trí. Giữ phím lặp lại (auto-repeat) chỉ tính là MỘT lượt kéo cho hoàn
      // tác — pushUndo() một lần lúc bắt đầu, giống lúc thả tay sau khi kéo chuột.
      if (
        !readOnly &&
        sel?.kind === "node" &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault()
        const step = e.shiftKey ? 24 : 8
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        const moveIds = new Set([sel.id, ...descendantsOf(sel.id, childrenMap(edges))])
        if (!e.repeat) pushUndo()
        updateNodes((ns) => ns.map((n) => (moveIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)))
        return
      }
      const idx = Number(e.key)
      if (Number.isInteger(idx) && idx >= 1 && idx <= TOP_TOOLS.length) {
        pickTopTool(TOP_TOOLS[idx - 1].id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // ─── Dựng hình ────────────────────────────────────────────────────────────

  useEffect(() => {
    applyView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Chrome tự ẩn khi đang vẽ ─────────────────────────────────────────────
  //
  // Thanh trên và thanh công cụ là hai dải viền/nút không liên quan gì tới nội dung đang viết — giữ
  // chúng lù lù trên màn suốt lúc tay đang đi từng nét là một dải xao nhãng ở mép mắt. Mờ đi trong
  // lúc vẽ, hiện lại ngay khi tay ngừng một nhịp hoặc khi chạm lên mép trên.
  //
  // Chỉ mờ ở CHẾ ĐỘ SỬA: readOnly không bao giờ gọi tới hàm này (không có nét nào để bắt đầu), nên
  // không cần chặn riêng — nhưng vẫn kiểm tránh trường hợp gọi nhầm từ chỗ khác sau này.
  function noteDrawActivity() {
    if (readOnly) return
    setChromeHidden(true)
    if (chromeHideTimer.current) clearTimeout(chromeHideTimer.current)
    chromeHideTimer.current = setTimeout(() => setChromeHidden(false), 1200)
    // Bắt đầu vẽ cũng là một điều kiện tự thu của cụm phóng-thu (xem A2) — tay đã đặt bút xuống
    // rồi thì cụm đang bung, nếu còn, chỉ đứng giữa đường vẽ và ngón tay.
    closeZoomCluster()
  }

  // Chạm lên dải 24px sát mép trên → hiện lại ngay, không đợi hết giờ. Đây là lối thoát cho lúc
  // đang vẽ liên tục (chrome cứ mờ) mà cần bấm một nút trên thanh trên/thanh công cụ.
  function revealChrome() {
    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current)
      chromeHideTimer.current = null
    }
    setChromeHidden(false)
  }

  // Đang CHUYỂN sang chỉ đọc thì trả chrome về hiện ngay — không đợi bộ đếm 1200ms hết giờ, và
  // không để lần sau bật sửa lại thấy chrome vẫn đang mờ từ phiên trước.
  useEffect(() => {
    if (readOnly) revealChrome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  // ─── Bắt đầu một nét / một lượt tẩy ───────────────────────────────────────
  // Tách riêng vì có HAI mặt vẽ gọi tới: bảng chính và ô viết phóng to. Viết hai bản là chắc chắn
  // sẽ trôi lệch nhau — sửa một bên quên bên kia.

  function beginInk(e: ReactPointerEvent, p: { x: number; y: number }) {
    noteDrawActivity()
    action.current = { kind: "draw" }
    draftPts.current = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]
    // Bộ lọc rung mới cho mỗi nét, mồi bằng đúng điểm đặt bút để đầu nét không bị kéo lệch.
    smoother.current = new PointerSmoother()
    smoother.current.filter(e.clientX, e.clientY, e.timeStamp || performance.now())
    snapped.current = null
    cancelHold()
    // CHỈ bút máy có bề dày thay đổi theo lực nhấn/tốc độ. Bút chì thật cũng đậm nhạt theo lực,
    // nhưng cái làm nên nét chì là VỆT ĐỀU hơi mờ — cho nó nét vuốt thon như bút máy thì hai cây bút
    // ra gần như cùng một nét, và người dùng không còn lý do gì để chọn giữa chúng.
    // Bút máy đang để nét đứt/nét chấm thì cũng vẽ nét ĐỀU: bề dày thay đổi cộng với cắt khúc thành
    // ra một chuỗi mảnh vụn to nhỏ lộn xộn, không đọc ra là nét đứt nữa (xem isFilled).
    const varied = tool === "pen" && !activeDash
    if (varied) {
      inkState.current = initInkWidth(activeWidth, e.clientX, e.clientY, e.timeStamp || performance.now())
      draftWidths.current = [inkState.current.width]
    } else {
      draftWidths.current = null
      inkState.current = null
    }
    beginDraft(activeWidth, activeInk, strokeAlpha(inkOf(tool)), varied, strokeCap(inkOf(tool)))
    paintDraft(false)
  }

  function beginErase(e: ReactPointerEvent, p: { x: number; y: number }) {
    noteDrawActivity()
    action.current = { kind: "erase" }
    erased.current.clear()
    erasedParts.current.clear()
    moveEraserRing(e.clientX, e.clientY)
    eraseAt(p.x, p.y)
  }

  // ─── Ô viết phóng to ──────────────────────────────────────────────────────

  // Bề rộng/chiều cao vùng bảng lọt vào ô, suy từ bề rộng thật của ô trên màn hình. Tính lúc mở
  // chứ không đặt cứng: bề rộng máy mỗi cái một khác, mà mức phóng thì phải giữ nguyên 3 lần.
  function zoomBoxSize() {
    const w = (zoomSurfaceRef.current?.clientWidth ?? surfaceRect().width) / ZOOM_SCALE
    return { w, h: ZOOM_PANEL_H / ZOOM_SCALE }
  }

  function openZoomBox() {
    const { w, h } = zoomBoxSize()
    // Mở ngay giữa khung nhìn hiện tại — chỗ người dùng đang nhìn cũng là chỗ họ định viết.
    const c = viewCenterBoard()
    setZoomBox({ x: c.x - w / 2, y: c.y - h / 2, w, h })
    // Công cụ tay không vẽ được gì trong ô — chuyển sẵn sang bút để mở ra là viết được ngay. Lấy cây
    // bút vừa dùng nếu nó viết được nét tay, còn không thì bút máy.
    if (tool !== "pen" && tool !== "pencil" && tool !== "highlighter") {
      pickPen(lastDraw === "pencil" || lastDraw === "highlighter" ? lastDraw : "pen")
    }
    tickHaptic()
  }

  // Dịch khung viết. `dx`/`dy` tính theo TỈ LỆ bề rộng/chiều cao khung, không theo pixel — nhờ vậy
  // một lần bấm luôn dịch đúng "gần hết một khung" ở mọi cỡ máy.
  function moveZoomBox(dx: number, dy: number) {
    setZoomBox((b) => (b ? { ...b, x: b.x + b.w * dx, y: b.y + b.h * dy } : b))
    tickHaptic()
  }

  // Viết tới sát mép phải → tự dịch khung sang chỗ mới, chừa lại một dải chữ vừa viết ở mép trái để
  // không mất mạch câu. Đây là thứ khiến ô viết phóng to dùng được liên tục thay vì cứ vài chữ lại
  // phải dừng tay đi bấm nút dịch khung.
  function maybeAdvanceZoom(strokeEndX: number) {
    const b = zoomBox
    if (!b) return
    if (strokeEndX < b.x + b.w * ZOOM_ADVANCE_AT) return
    setZoomBox({ ...b, x: b.x + b.w * (1 - ZOOM_ADVANCE_KEEP) })
    tickHaptic()
  }

  // ─── Vẽ bên trong ô phóng to ──────────────────────────────────────────────
  //
  // Chỉ nhận các cây bút vẽ NÉT TAY (bút máy, bút chì, bút dạ) và tẩy. Ô này để VIẾT; kéo bảng, chọn
  // thẻ hay nối thẻ đều làm ở bảng chính phía trên, nơi nhìn được tổng thể. Băng dính và hình vẽ cũng
  // không nhận: cả hai vẽ bằng cách kéo từ điểm này tới điểm kia, mà ô phóng to chỉ thấy một mẩu bảng
  // rất nhỏ nên điểm cuối gần như luôn nằm ngoài ô.

  function handleZoomPointerDown(e: ReactPointerEvent) {
    const b = zoomBox
    if (!b || loading) return
    if (tool !== "pen" && tool !== "pencil" && tool !== "highlighter" && tool !== "eraser") return
    // Chống tì tay áp dụng y như bảng chính — bàn tay tì vào ô phóng to còn dễ xảy ra hơn, vì ô này
    // nằm ngay dưới lòng bàn tay khi viết.
    if (penOnly && e.pointerType === "touch") return
    noteStylus(e)
    e.stopPropagation()
    stopAnim()

    const el = zoomSurfaceRef.current
    if (!el) return
    // Chốt phép quy đổi cho cả lượt vẽ này: đọc lại kích thước ô ở mỗi điểm là thừa, và nếu ô đổi
    // kích thước giữa chừng (xoay máy) thì nét đang vẽ sẽ gãy làm đôi.
    const r = el.getBoundingClientRect()
    drawMap.current = (cx, cy) => ({ x: b.x + (cx - r.left) / ZOOM_SCALE, y: b.y + (cy - r.top) / ZOOM_SCALE })
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Vài trình duyệt từ chối bắt con trỏ — vẫn chạy được nhờ sự kiện nổi bọt lên.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const p = toBoard(e.clientX, e.clientY)
    if (tool === "eraser") beginErase(e, p)
    else beginInk(e, p)
  }

  function handleZoomPointerUp(e: ReactPointerEvent) {
    const wasDrawing = action.current.kind === "draw"
    const endX = draftPts.current ? draftPts.current[draftPts.current.length - 2] : null
    handlePointerUp(e)
    drawMap.current = null
    // Xét dịch khung SAU khi nét đã chốt, nếu không nét cuối sẽ bị vẽ theo khung mới.
    if (wasDrawing && endX != null) maybeAdvanceZoom(endX)
  }

  // ─── Mực của cây bút đang cầm ─────────────────────────────────────────────

  // Nhấc một cây bút lên: đổi công cụ, và ghi nhớ đây là cây bút mà nút "Bút vẽ" sẽ mở lại lần sau.
  function pickPen(t: DrawTool) {
    setTool(t)
    setLastDraw(t)
    setSel(null)
    setSelGroup(null)
    setMenuOpen(false)
    tickHaptic()
  }

  // Bấm một nút trên hàng công cụ chính.
  function pickTopTool(id: TopTool) {
    setPenPop(null)
    if (id === "draw") {
      // Đang cầm bút rồi → nút này chỉ đóng/mở thanh bút (một cái công tắc, không phải một cú nhảy
      // công cụ). Chưa cầm bút → nhấc lại đúng cây vừa dùng VÀ mở thanh bút ra luôn: người vừa bấm
      // "bút vẽ" thì việc tiếp theo chắc chắn là chọn bút/màu, không có lý do bắt bấm thêm lần nữa.
      if (drawTool) setPenBarOpen((v) => !v)
      else {
        pickPen(lastDraw)
        setPenBarOpen(true)
      }
      tickHaptic()
      return
    }
    setTool(id)
    if (id !== "hand") setSel(null)
    // Nhóm đã khoanh chỉ dùng được với công cụ tay và khoanh vùng — đổi sang tẩy thì bỏ chọn luôn,
    // để khung nhóm không nằm chắn giữa bảng.
    if (id !== "hand" && id !== "lasso") setSelGroup(null)
    setMenuOpen(false)
    tickHaptic()
  }

  // ─── Kéo thanh bút sang mép khác ──────────────────────────────────────────
  //
  // Vì sao phải kéo được: thanh bút nổi trên mặt bảng, nên ở bất kỳ mép cố định nào nó cũng che mất
  // một phần bảng — và phần bị che luôn là phần người dùng đang muốn vẽ vào (họ kéo bảng tới đó
  // chính vì định vẽ ở đó). Thêm nữa, thanh nằm bên phải thì người thuận tay trái phải vươn cả cánh
  // tay qua màn hình, tay áo quét lên mặt bảng.
  //
  // Kéo tới đâu thì thanh GẮN VÀO MÉP gần đó nhất — xem BarPos về lý do không thả nổi tự do.
  const barDrag = useRef<{ dy: number; pos: BarPos } | null>(null)
  // Danh sách nét trước khi bắt đầu kéo con trượt — xem useStrokeSpec().
  const widthBase = useRef<StrokeSpec[] | null>(null)

  function barPointerDown(e: ReactPointerEvent) {
    const bar = penBarRef.current
    if (!bar) return
    e.stopPropagation()
    const b = bar.getBoundingClientRect()
    barDrag.current = { dy: e.clientY - b.top, pos: barPos }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Trình duyệt từ chối bắt con trỏ thì vẫn kéo được nhờ sự kiện nổi bọt.
    }
  }

  function barPointerMove(e: ReactPointerEvent) {
    const d = barDrag.current
    const host = surfaceRef.current
    const bar = penBarRef.current
    if (!d || !host || !bar) return
    e.stopPropagation()
    const r = host.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    // Mép nào gần ngón tay nhất thì thanh về mép đó. So khoảng cách TƯƠNG ĐỐI (chia cho bề ngang/bề
    // cao) chứ không so pixel thô: màn điện thoại cao gấp đôi bề ngang, so pixel thô thì mép
    // trên/dưới gần như không bao giờ thắng nổi mép trái/phải.
    const cand: [BarDock, number][] = [
      ["left", px / r.width],
      ["right", (r.width - px) / r.width],
      ["top", py / r.height],
      ["bottom", (r.height - py) / r.height],
    ]
    const dock = cand.sort((a, b) => a[1] - b[1])[0][0]
    // Thanh dựng dọc còn trượt lên xuống dọc theo mép; thanh nằm ngang thì đã chiếm trọn bề ngang
    // nên không còn gì để chỉnh.
    const maxY = Math.max(1, r.height - bar.offsetHeight)
    d.pos = { dock, f: Math.min(1, Math.max(0, (py - d.dy) / maxY)) }
    setBarPos(d.pos)
  }

  function barPointerUp() {
    const d = barDrag.current
    if (!d) return
    barDrag.current = null
    writeBarPos(PENBAR_KEY, d.pos)
    tickHaptic()
  }

  // ─── Kéo cụm hoàn tác/làm lại sang mép khác ────────────────────────────────
  // Cùng cơ chế với thanh bút ở trên (gắn mép gần nhất), nhưng là một cụm ĐỘC LẬP — xem C2/UNDOBAR_KEY
  // về lý do tách riêng khỏi thanh bút thay vì nhét vào trong nó.
  //
  // Khác thanh bút ở một điểm: cụm này CHỈ có hai nút, không đủ để chiếm trọn một mép (thanh bút
  // nằm ngang chiếm trọn bề ngang vì nó có cả chục nút cần chỗ). Đứng nguyên nhỏ gọn ở mọi mép, và
  // `f` trượt dọc theo ĐÚNG mép đang gắn — theo chiều ngang khi gắn mép trên/dưới, theo chiều dọc khi
  // gắn mép trái/phải — nên cần nhớ CẢ dx và dy lúc bắt đầu kéo (thanh bút chỉ cần dy vì luôn dính
  // trọn bề ngang, không có toạ độ ngang nào để nhớ).
  const undoBarDrag = useRef<{ dx: number; dy: number; pos: BarPos } | null>(null)

  function undoBarPointerDown(e: ReactPointerEvent) {
    const bar = undoBarRef.current
    if (!bar) return
    e.stopPropagation()
    const b = bar.getBoundingClientRect()
    undoBarDrag.current = { dx: e.clientX - b.left, dy: e.clientY - b.top, pos: undoBarPos }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Trình duyệt từ chối bắt con trỏ thì vẫn kéo được nhờ sự kiện nổi bọt.
    }
  }

  function undoBarPointerMove(e: ReactPointerEvent) {
    const d = undoBarDrag.current
    const host = surfaceRef.current
    const bar = undoBarRef.current
    if (!d || !host || !bar) return
    e.stopPropagation()
    const r = host.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    const cand: [BarDock, number][] = [
      ["left", px / r.width],
      ["right", (r.width - px) / r.width],
      ["top", py / r.height],
      ["bottom", (r.height - py) / r.height],
    ]
    const dock = cand.sort((a, b) => a[1] - b[1])[0][0]
    const vert = dock === "left" || dock === "right"
    const max = vert ? Math.max(1, r.height - bar.offsetHeight) : Math.max(1, r.width - bar.offsetWidth)
    const along = vert ? py - d.dy : px - d.dx
    d.pos = { dock, f: Math.min(1, Math.max(0, along / max)) }
    setUndoBarPos(d.pos)
  }

  function undoBarPointerUp() {
    const d = undoBarDrag.current
    if (!d) return
    undoBarDrag.current = null
    writeBarPos(UNDOBAR_KEY, d.pos)
    tickHaptic()
  }

  function setInkColorFor(t: InkTool, color: string) {
    setInkStyles((prev) => {
      const next = { ...prev, [t]: { ...prev[t], color } }
      writeInkStyles(next)
      return next
    })
    rememberColor(color)
  }

  // Đổi nét đang dùng: nét mới lên đầu mảng, nét cũ lùi lại một chỗ. Nhờ vậy ba ô nét trên thanh bút
  // luôn là ba nét vừa dùng gần nhất — quay lại nét trước đó chỉ mất một lần chạm, không phải kéo lại
  // con trượt để dò đúng con số cũ.
  //
  // `base` là danh sách TRƯỚC KHI kéo con trượt (xem widthBase): một lần kéo đi qua hàng chục giá trị
  // trung gian, lấy danh sách hiện tại thì ba ô nhớ bị mấy con số chỉ lướt qua quét sạch.
  function useStrokeSpec(t: InkTool, spec: StrokeSpec, base?: StrokeSpec[]) {
    setInkStyles((prev) => {
      const cur = prev[t]
      const strokes = [spec, ...(base ?? cur.strokes).filter((s) => !sameSpec(s, spec))].slice(0, RECENT_WIDTHS)
      const next = { ...prev, [t]: { ...cur, strokes } }
      writeInkStyles(next)
      return next
    })
  }

  // Đang kéo con trượt: chỉ đổi nét ĐANG dùng (ô đầu mảng), chưa đụng tới hai ô nhớ còn lại.
  function setCurrentSpec(t: InkTool, spec: StrokeSpec) {
    setInkStyles((prev) => {
      const cur = prev[t]
      const next = { ...prev, [t]: { ...cur, strokes: [spec, ...cur.strokes.slice(1)] } }
      writeInkStyles(next)
      return next
    })
  }

  function rememberColor(color: string) {
    setColorHistory((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, COLOR_HISTORY_MAX)
      writeColorList(COLOR_HISTORY_KEY, next)
      return next
    })
  }

  function addCustomColor(color: string) {
    setCustomColors((prev) => {
      if (prev.includes(color)) return prev
      const next = [color, ...prev].slice(0, COLOR_CUSTOM_MAX)
      writeColorList(COLOR_CUSTOM_KEY, next)
      return next
    })
  }

  // Hút màu từ bất cứ đâu trên màn hình (ảnh X-quang vừa dán vào bảng, một thẻ đã tô màu…) rồi dùng
  // luôn làm màu bút.
  async function pickScreenColor() {
    const Ctor = eyeDropper()
    if (!Ctor) return
    try {
      const res = await new Ctor().open()
      if (!res?.sRGBHex) return
      setMixColor(res.sRGBHex)
      setInkColorFor(styleTool, res.sRGBHex)
      tickHaptic()
    } catch {
      // Người dùng bấm Esc để bỏ — không phải lỗi, im lặng.
    }
  }

  function removeCustomColor(color: string) {
    setCustomColors((prev) => {
      const next = prev.filter((c) => c !== color)
      writeColorList(COLOR_CUSTOM_KEY, next)
      return next
    })
    tickHaptic()
  }

  const pal = paperTone(tone)
  // Ba cây bút vẽ NÉT TAY — nét đi đúng theo đường ngón tay đi. Băng dính không nằm ở đây dù cũng
  // để lại mực: nó vẽ bằng cách kéo từ điểm này tới điểm kia rồi thả, giống hình vẽ hơn giống bút.
  const freehand = tool === "pen" || tool === "pencil" || tool === "highlighter"
  const drawTool = isDrawTool(tool)
  // Cây bút đang cấp màu/cỡ nét. Công cụ không phải bút (tay, tẩy…) thì lấy theo cây bút vừa dùng —
  // thanh bút lúc đó không hiện, nhưng nút màu/cỡ nét vẫn phải có một giá trị hợp lệ để vẽ ra.
  const styleTool: InkTool = drawTool ? inkOf(tool) : inkOf(lastDraw)
  const inkStyle = inkStyles[styleTool]
  const activeInk = inkStyle.color
  const activeSpec = inkStyle.strokes[0]
  const activeWidth = activeSpec.w
  const activeDash = activeSpec.dash
  // Bút dạ và băng dính dùng bảng màu nhạt (màu tô sáng); bút mực và bút chì dùng bảng màu mực.
  const inkPalette = styleTool === "highlighter" || styleTool === "tape" ? HIGHLIGHT_PALETTE : INK_PALETTE
  const widthRange = WIDTH_RANGE[styleTool]

  // Thanh bút đang dựng dọc (gắn mép trái/phải) hay nằm ngang (gắn mép trên/dưới).
  const barVert = barPos.dock === "left" || barPos.dock === "right"
  // Vạch ngăn giữa các cụm nút, xoay theo chiều của thanh.
  const barDivider = barVert ? "flex-none h-px w-7 my-1" : "flex-none w-px h-7 mx-1"
  // Chỗ đứng thật của thanh trên mặt bảng.
  //
  // Nằm ngang thì DÍNH TRỌN một mép (left:0, right:0) — không còn toạ độ ngang tự do nữa, nên không
  // còn cái cảm giác kéo cả đoạn dài mà thanh nhích được vài pixel. Dựng dọc thì dính mép trái/phải
  // và trượt lên xuống theo `f`, đặt bằng đúng mẹo phần trăm cũ: top f% cộng translateY(-f%) cho ra
  // f × (chiều cao bảng − chiều cao thanh), không bao giờ lòi ra ngoài dù màn hình cỡ nào.
  const barStyle: React.CSSProperties = barVert
    ? {
        [barPos.dock === "left" ? "left" : "right"]: 6,
        top: `${barPos.f * 100}%`,
        transform: `translateY(${-barPos.f * 100}%)`,
      }
    : { left: 0, right: 0, [barPos.dock === "top" ? "top" : "bottom"]: 0 }

  // Cụm hoàn tác/làm lại: chỉ hai nút, không đủ để chiếm trọn một mép như thanh bút — đứng nhỏ gọn
  // ở mọi mép, `f` trượt dọc theo ĐÚNG mép đang gắn (ngang khi gắn mép trên/dưới, dọc khi gắn mép
  // trái/phải). Cùng mẹo phần trăm + translate ngược để không bao giờ lòi ra ngoài màn hình.
  const undoBarVert = undoBarPos.dock === "left" || undoBarPos.dock === "right"
  const undoBarStyle: React.CSSProperties = undoBarVert
    ? {
        [undoBarPos.dock === "left" ? "left" : "right"]: 6,
        top: `${undoBarPos.f * 100}%`,
        transform: `translateY(${-undoBarPos.f * 100}%)`,
      }
    : {
        [undoBarPos.dock === "top" ? "top" : "bottom"]: 6,
        left: `${undoBarPos.f * 100}%`,
        transform: `translateX(${-undoBarPos.f * 100}%)`,
      }

  // Đường kính chấm xem trước trên nút cỡ nét. Không vẽ chấm to đúng bằng cỡ nét thật (bút dạ 40 thì
  // chấm sẽ to hơn cả cái nút) mà quy về khoảng 4–10px THEO TỈ LỆ trong khoảng cỡ của chính cây bút
  // đó — nhờ vậy ba chấm luôn hơn kém nhau rõ ràng dù là bút mực hay băng dính.
  function dotSize(w: number): number {
    const [lo, hi] = widthRange
    const t = Math.min(1, Math.max(0, (w - lo) / Math.max(0.001, hi - lo)))
    return Math.round(4 + t * 6)
  }

  // Mẫu nét vẽ trên nút: một đoạn thẳng mang ĐÚNG bề dày (đã quy về khoảng 3–9px cho vừa nút) và
  // ĐÚNG kiểu nét sẽ vẽ ra. Nét chấm hiện ra thành mấy cái chấm, nét đứt thành mấy gạch — nhìn là
  // biết, không cần nhãn chữ nào.
  function strokeSample(sp: StrokeSpec, color: string, len: number): React.ReactElement {
    const t = Math.min(9, Math.max(3, dotSize(sp.w) - 1))
    return (
      <svg width={len} height={10} viewBox={`0 0 ${len} 10`} aria-hidden="true" style={{ display: "block" }}>
        <line
          x1={1.5}
          y1={5}
          x2={len - 1.5}
          y2={5}
          stroke={color}
          strokeWidth={t}
          strokeLinecap="round"
          strokeDasharray={strokeDashArray(sp.dash, t)}
          opacity={strokeAlpha(styleTool) < 1 ? 0.85 : 1}
        />
      </svg>
    )
  }

  // Hai màu bấm-là-xong trên thanh dựng dọc: lấy từ những màu VỪA DÙNG, bỏ màu đang cầm (nó đã có ô
  // riêng ngay bên cạnh). Chưa dùng màu nào thì mượn tạm đỏ và xanh dương của bảng — hai màu đánh dấu
  // hay dùng nhất, còn hơn để hai ô trống không bấm được.
  const quickColors = (() => {
    const seen = new Set([toHex(activeInk)])
    const out: string[] = []
    for (const c of [...colorHistory, inkPalette[0][0].color, inkPalette[0][5].color]) {
      const h = toHex(c)
      if (seen.has(h)) continue
      seen.add(h)
      out.push(c)
      if (out.length === QUICK_COLORS) break
    }
    return out
  })()

  function openColorSheet(tab: "palette" | "custom") {
    setMixColor(toHex(activeInk))
    setColorTab(tab)
    setColorEdit(false)
    setColorSheet(true)
    setPenPop(null)
    tickHaptic()
  }

  // Ô màu đang dùng + mũi tên: mở bảng màu đầy đủ. Dùng chung cho cả hai chiều của thanh nên viết
  // một lần ở đây thay vì chép hai bản trong JSX.
  function colorButton(): React.ReactElement {
    return (
      <button
        type="button"
        title="Màu bút"
        aria-label="Màu bút"
        onClick={() => openColorSheet("palette")}
        className="mind-btn flex-none flex items-center justify-center rounded-full relative"
        style={{ width: BAR_BTN, height: barVert ? 36 : BAR_BTN, color: "var(--c-text-soft)" }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            background: activeInk,
            opacity: strokeAlpha(styleTool) < 1 ? 0.85 : 1,
            boxShadow: "0 0 0 3px var(--c-line-soft)",
            // Mũi tên nằm TRONG ô màu (không phải bên cạnh): thanh không còn chỗ cho một nút nữa, mà
            // ô màu thì luôn đủ tối/đủ sáng để một mũi tên tương phản nằm lên trên.
            color: luminance(activeInk) > 0.5 ? "#1E1B1B" : "#fff",
          }}
        >
          {mi.chevronDown("w-3.5 h-3.5")}
        </span>
      </button>
    )
  }
  const selNode = sel?.kind === "node" ? nodes.find((n) => n.id === sel.id) : undefined
  const selImage = sel?.kind === "image" ? images.find((im) => im.id === sel.id) : undefined
  const selEdgeKey = sel?.kind === "edge" ? edgeKey({ from: sel.from, to: sel.to }) : null
  const editingNode = editingId ? nodes.find((n) => n.id === editingId) : undefined
  const selNodeHasChildren = selNode ? edges.some((e) => e.from === selNode.id) : false
  const editingNodeHasChildren = editingId ? edges.some((e) => e.from === editingId) : false

  // Dùng sizesRef trước (số đo mới nhất, cập nhật ngay khi ResizeObserver báo); `sizes` chỉ là bản
  // sao trong state để React biết cần vẽ lại đường nối khi thẻ đổi kích thước.
  //
  // useMemo theo [nodes, sizes]: trước đây dựng lại Map này ở MỌI lượt render, kể cả những lượt chỉ
  // đổi `draft` (gõ chữ trong ô sửa ghi chú) — nghĩa là mỗi phím gõ đều tính lại hình học của TOÀN
  // BỘ thẻ trên bảng, không chỉ thẻ đang sửa. sizesRef luôn được đọc TRƯỚC (giá trị mới nhất), còn
  // `sizes` là đúng phần phụ thuộc phản ứng thật sự cần theo dõi — mọi lần sizesRef đổi đều có
  // commitSizes() bơm lại vào `sizes` ngay khung hình sau (xem registerNode/ensureObserver), nên
  // không có khoảng trễ đáng kể.
  const nodeBoxes = useMemo(
    () => new Map(nodes.map((n) => [n.id, nodeBox(n, sizeOf(n.id))])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, sizes],
  )
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // ─── Lọc theo khung nhìn ────────────────────────────────────────────────────
  //
  // Trước đây MỌI thẻ/đường nối trên bảng đều được layout dù đang ở ngoài khung nhìn — tăng tuyến
  // tính theo TỔNG số thẻ, không phải số thẻ đang thấy. `renderedNodes`/`renderedEdges` bên dưới chỉ
  // dùng cho LỚP VẼ CHÍNH (thẻ + đường nối trên mặt bảng) — minimap và ô viết phóng to vẫn phải dùng
  // `visibleNodes` gốc (không lọc), vì chúng cần thấy TOÀN BỘ bảng hoặc một vùng crop KHÁC, không
  // phải đúng khung nhìn chính.
  const cullRect = useMemo(() => {
    const rect = surfaceRect()
    const { x, y, zoom } = cullView
    const w = rect.width / zoom
    const h = rect.height / zoom
    const padX = w * CULL_VIEW_PAD_RATIO
    const padY = h * CULL_VIEW_PAD_RATIO
    const left = -x / zoom - padX
    const top = -y / zoom - padY
    return { left, top, right: left + w + padX * 2, bottom: top + h + padY * 2 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cullView])

  const renderedNodeIds = useMemo(() => {
    const set = new Set<string>()
    for (const n of visibleNodes) {
      const box = nodeBoxes.get(n.id)
      if (box && box.x + box.w >= cullRect.left && box.x <= cullRect.right && box.y + box.h >= cullRect.top && box.y <= cullRect.bottom) {
        set.add(n.id)
      }
    }
    // Luôn vẽ thẻ đang chọn/đang sửa/trong nhóm khoanh/đang chạy hoạt ảnh, BẤT KỂ có nằm trong khung
    // nhìn hay không — nếu không, thanh nổi "Sửa/Thêm nhánh/Xoá" của thẻ đang chọn có thể trỏ vào
    // một chỗ trống (thẻ bị lọc mất) sau khi cuộn bảng đi trong lúc thẻ đó vẫn đang được chọn.
    if (sel?.kind === "node") set.add(sel.id)
    if (selGroup) selGroup.nodes.forEach((id) => set.add(id))
    if (editingId) set.add(editingId)
    if (bornId) set.add(bornId)
    if (foundId) set.add(foundId)
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes, nodeBoxes, cullRect, sel, selGroup, editingId, bornId, foundId])

  const renderedNodes = useMemo(() => visibleNodes.filter((n) => renderedNodeIds.has(n.id)), [visibleNodes, renderedNodeIds])
  // Đường nối vẽ khi MỘT TRONG HAI đầu còn trong tập render — một đầu vừa cuộn khỏi khung nhìn thì
  // đường nối vẫn còn vẽ tới sát mép, không biến mất đột ngột giữa chừng.
  const renderedEdges = useMemo(
    () => visibleEdges.filter((e) => renderedNodeIds.has(e.from) || renderedNodeIds.has(e.to)),
    [visibleEdges, renderedNodeIds],
  )

  // Thẻ khớp ô tìm — chỉ tính khi ô tìm đang mở, để lúc bình thường không quét cả bảng mỗi lần vẽ.
  const findMatches = findOpen ? matchingNodes() : []
  const findMatchIds = findOpen && findQuery.trim() ? new Set(findMatches.map((n) => n.id)) : null

  // Danh sách bài đã lọc theo ô tìm kiếm trong bảng chọn bài. Bỏ dấu để gõ "tim mach" cũng ra
  // "Tim mạch" — gõ tiếng Việt có dấu trên bàn phím điện thoại chậm hơn nhiều.
  const filteredLinkTargets = (() => {
    const q = noAccent(linkQuery.trim())
    const list = q ? linkTargets.filter((t) => noAccent(t.label).includes(q) || noAccent(t.group).includes(q)) : linkTargets
    return list.slice(0, 60)
  })()

  // Khung bao quanh nhóm đang khoanh chọn (toạ độ bảng).
  const groupBox = selGroup ? groupBounds(selGroup) : null

  // Điểm giữa cung của đường nối đang chọn — chỗ đặt nút xoá đường nối.
  const selEdgeMid = (() => {
    if (sel?.kind !== "edge") return null
    const a = nodeBoxes.get(sel.from)
    const b = nodeBoxes.get(sel.to)
    if (!a || !b) return null
    return edgeGeometry(a, b).mid
  })()

  // Chrome mờ đi khi đang vẽ — KHÔNG unmount, chỉ mờ/dịch/tắt chạm: unmount thanh trên lúc ô tìm
  // đang mở sẽ làm mất tiêu điểm ô nhập, và unmount thanh công cụ thì bố cục giật một nhịp mỗi lần
  // ẩn/hiện vì flex phải tính lại chiều cao.
  const chromeStyle: React.CSSProperties = chromeHidden
    ? { opacity: 0, transform: "translateY(-8px)", pointerEvents: "none", transition: "opacity 0.18s ease, transform 0.18s ease" }
    : { opacity: 1, transform: "translateY(0)", transition: "opacity 0.18s ease, transform 0.18s ease" }

  return (
    <div className="h-full flex flex-col relative">
      {/* Dải hiện lại chrome — chỉ CÓ MẶT (pointer-events) lúc chrome đang mờ. Nằm ĐÈ LÊN thanh trên
          (z cao hơn) nhưng vì thanh trên lúc đó đang pointer-events:none nên không giẫm lên việc
          bấm nút của nó khi chrome đã hiện lại — dải này tự biến mất (pointer-events:none) ngay khi
          chromeHidden về false. */}
      {chromeHidden && (
        <div
          className="absolute left-0 right-0 top-0 z-50"
          style={{ height: 24 }}
          onPointerDown={(e) => {
            e.stopPropagation()
            revealChrome()
          }}
        />
      )}

      {/* ─── Thanh trên: luôn hiện ở CẢ hai chế độ ──────────────────────
          Chứa đúng những việc không phải là vẽ: về danh sách, tên bảng, bật/tắt chỉnh sửa, xuất
          file, và các cài đặt của bảng. Nhờ vậy ở chế độ chỉ đọc màn hình vẫn dùng được đầy đủ chứ
          không phải một bảng chết chỉ để nhìn. Mờ đi khi đang vẽ (chromeStyle) — xem noteDrawActivity(). */}
      <div className="flex-none flex items-center gap-1 px-3 py-2 relative z-40" style={chromeStyle}>
        <IconBtn icon={mi.home} hint="Về danh sách bảng" onClick={() => onGoHome?.()} />

        {/* Ô tìm CHIẾM CHỖ của tên bảng khi đang mở, không phải một lớp nổi đè lên mặt bảng: đang
            tìm thì tên bảng không còn là thứ cần đọc, mà một ô nổi thì luôn che mất đúng phần nội
            dung ở đỉnh màn hình — chỗ có nhiều khả năng chứa thẻ vừa nhảy tới nhất. */}
        {findOpen ? (
          <div className="flex-1 min-w-0 flex items-center gap-1 pl-1" onPointerDown={stopPointer}>
            <span className="flex-none text-slate-400">{mi.search("w-4 h-4")}</span>
            <input
              ref={findInputRef}
              value={findQuery}
              onChange={(e) => {
                setFindQuery(e.target.value)
                // Gõ lại từ đầu thì lần bấm "tiếp" sau đó phải về thẻ khớp ĐẦU TIÊN, không phải thẻ
                // thứ mấy của lần tìm trước.
                setFindIdx(-1)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  jumpToMatch(e.shiftKey ? -1 : 1)
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  closeFind()
                }
              }}
              placeholder="Tìm chữ trong thẻ…"
              className="mind-input flex-1 min-w-0 bg-transparent outline-none rounded-md text-[13px] font-medium text-slate-700"
            />
            {findQuery.trim() && (
              // Trước đây trước khi bấm nhảy lần đầu chỉ hiện số tổng ("7") — trông như "7" là vị
              // trí hiện tại chứ không phải tổng số. Luôn hiện dạng "–/7" cho tới khi đã nhảy.
              <span className="flex-none text-[11px] font-bold tabular-nums text-slate-400">
                {findMatches.length === 0
                  ? "0"
                  : `${findIdx >= 0 ? findIdx + 1 : "–"}/${findMatches.length}`}
              </span>
            )}
            <IconBtn icon={mi.chevronUp} hint="Thẻ khớp trước đó" size={32} disabled={findMatches.length === 0} onClick={() => jumpToMatch(-1)} />
            <IconBtn icon={mi.chevronDown} hint="Thẻ khớp tiếp theo" size={32} disabled={findMatches.length === 0} onClick={() => jumpToMatch(1)} />
            <IconBtn icon={mi.close} hint="Đóng ô tìm" size={32} onClick={closeFind} />
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 px-1">
              <p className="min-w-0 truncate text-[14px] font-bold" style={{ color: "var(--c-text)" }}>
                {boardName ?? "Bảng"}
              </p>
              {/* Dấu "đã lưu" — bảng vẽ tay là thứ dễ lo mất nhất, nên mỗi lần ghi xong nói một
                  tiếng, ngay cạnh tên bảng chứ không phải một pill nổi riêng đè lên mặt vẽ (D2).
                  `key={savedTick}` để mỗi lần ghi xong là một nút DOM MỚI — cách duy nhất bắt CSS
                  animation chạy lại từ đầu khi lưu liên tiếp nhiều lần, không phải bật/tắt qua
                  state như trước (đổi lại phải giữ THÊM một biến `savedFlash` chỉ để làm việc mà
                  chính bản thân animation `.flash-ok` — có sẵn điểm dừng ở cuối — đã tự làm được). */}
              {/* Trước đây 10.5px + --c-muted (~3:1, dưới ngưỡng đọc) — chữ nhỏ nhất, nhạt nhất
                  màn hình lại đúng là lời trấn an cho nỗi lo "mất bài vẽ tay". Lên 12px + --c-green
                  (đã có token, gần như không dùng ở đâu) + icon tích, cho lời trấn an trọng lượng
                  đúng với vai trò của nó. */}
              {savedTick > 0 && (
                <span key={savedTick} className="flash-ok flex-none flex items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--c-green)" }}>
                  <span className="scale-75">{mi.check("w-3.5 h-3.5")}</span>
                  đã lưu
                </span>
              )}
            </div>
          </>
        )}

        {/* Đang tìm thì nhường hết chỗ cho ô tìm — trên màn hình 375px, giữ cả hai nút này lại sẽ
            bóp ô nhập xuống còn vài chữ. Công tắc "Đang sửa"/"Chỉ đọc" và nút tìm đã chuyển xuống
            chung hàng với công cụ vẽ bên dưới cho gọn (một hàng thay vì hai) — xem hàng công cụ. */}
        {!findOpen && (
        <>
        <div className="flex-none relative">
          <IconBtn
            icon={mi.share}
            hint="Xuất bảng ra file"
            active={exportOpen}
            onClick={() => {
              setExportOpen((v) => !v)
              setMenuOpen(false)
            }}
          />
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onPointerDown={() => setExportOpen(false)} />
              <div
                className="mind-pop absolute right-0 top-full mt-1 w-[184px] rounded-2xl border p-1.5 z-50"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface)", boxShadow: "0 12px 30px var(--c-shadow)" }}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setExportOpen(false)
                    void exportBoard("png")
                  }}
                  className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ color: busy ? "var(--c-muted)" : "var(--c-text-2)" }}
                >
                  {mi.image("w-[18px] h-[18px]")}
                  Ảnh PNG
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setExportOpen(false)
                    void exportBoard("pdf")
                  }}
                  className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ color: busy ? "var(--c-muted)" : "var(--c-text-2)" }}
                >
                  {mi.doc("w-[18px] h-[18px]")}
                  Tài liệu PDF
                </button>
                <div className="h-px my-1" style={{ background: "var(--c-line)" }} />
                {/* Ảnh/PDF chỉ để xem — dán vào ghi chú bệnh án hay email thì cần CHỮ, không phải
                    ảnh. Sao chép thẳng vào clipboard, không bắt tải file rồi tự mở lên copy lại. */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setExportOpen(false)
                    void copyOutline()
                  }}
                  className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ color: busy ? "var(--c-muted)" : "var(--c-text-2)" }}
                >
                  {mi.copy("w-[18px] h-[18px]")}
                  Sao chép dạng văn bản
                </button>
              </div>
            </>
          )}
        </div>

        <span className="relative inline-flex">
          <IconBtn
            icon={mi.more}
            hint="Cài đặt bảng"
            active={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v)
              setExportOpen(false)
            }}
          />
          {/* Chấm nhỏ báo "đang lọc màu" — không có nó, thẻ mờ đi trên bảng rất dễ bị hiểu lầm là lỗi
              hiển thị chứ không phải một bộ lọc đang bật, vì nút mở ra bộ lọc lại đang đóng. */}
          {colorFilter.size > 0 && (
            <span
              className="absolute rounded-full pointer-events-none"
              style={{ top: 3, right: 3, width: 7, height: 7, background: "var(--c-accent-2)", border: "1.5px solid var(--c-surface)" }}
            />
          )}
        </span>
        </>
        )}
      </div>

      {/* ─── Thanh công cụ: công tắc chế độ + tìm + công cụ vẽ ─────────────
          LUÔN hiện, kể cả chỉ đọc — công tắc chế độ phải bấm được để quay lại sửa. Trước đây công
          tắc "Đang sửa" và nút tìm nằm ở thanh trên, tách hẳn khỏi hàng công cụ (hai hàng); nay gộp
          chung một hàng cho gọn. Chỉ cụm công cụ vẽ (tay/bút/tẩy/khoanh) mới ẩn khi chỉ đọc — không
          có gì để vẽ với các nút đó lúc này.
          Mờ đi khi đang vẽ, cùng nhịp với thanh trên — xem chromeStyle/noteDrawActivity(). */}
      <div className="flex-none px-3 pb-2 relative z-30" style={chromeStyle}>
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-3 px-3">
          {/* Công tắc chỉnh sửa. Nhãn nói TRẠNG THÁI ĐANG Ở, không nói việc sẽ làm — người dùng cần
              biết ngay "bảng này có đang ăn nét vẽ của mình không", đó mới là câu hỏi thật. */}
          <button
            onClick={() => {
              setReadOnly((v) => !v)
              setMenuOpen(false)
              setExportOpen(false)
              setSel(null)
              setSelGroup(null)
              tickHaptic()
            }}
            aria-pressed={readOnly}
            className="mind-btn flex-none h-9 pl-2 pr-3 rounded-2xl border flex items-center gap-1.5 text-[13px] font-bold"
            style={
              readOnly
                ? { borderColor: "var(--c-line)", background: "var(--c-line-soft)", color: "var(--c-text-soft)" }
                // Nền đặc chỉ dành cho nút "＋ Thêm" (hành động chính) và con trượt công cụ đang chọn —
                // nút công tắc này chỉ BÁO TRẠNG THÁI, không phải một hành động nổi bật cần lôi mắt.
                : { borderColor: "var(--c-primary)", background: "transparent", color: "var(--c-primary)" }
            }
          >
            {readOnly ? mi.readOnly("w-[18px] h-[18px]") : mi.pen("w-[18px] h-[18px]")}
            {readOnly ? "Chỉ đọc" : "Đang sửa"}
          </button>

          {!findOpen && <IconBtn icon={mi.search} hint="Tìm thẻ trên bảng" onClick={openFind} />}

          {!readOnly && (
          <>
          <span className="flex-none w-px h-6 mx-0.5" style={{ background: "var(--c-line)" }} />
          <div
            className="flex-none flex items-center rounded-2xl border p-0.5 relative"
            style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)" }}
          >
            {/* Ô sáng TRƯỢT từ công cụ cũ sang công cụ mới thay vì tắt chỗ này bật chỗ kia — mắt đi
                theo được chuyển động nên biết ngay mình vừa đổi sang cái gì. */}
            <div
              className="mind-tool-slider absolute rounded-xl"
              style={{
                width: TOOL_BTN,
                height: TOOL_BTN,
                left: 2,
                top: 2,
                background: "var(--c-primary)",
                boxShadow: "0 2px 8px rgba(var(--c-primary-rgb),.35)",
                transform: `translateX(${Math.max(0, TOP_TOOLS.findIndex((t) => t.id === topOf(tool))) * TOOL_BTN}px)`,
              }}
            />
            {TOP_TOOLS.map((t) => (
              <span key={t.id} className="relative inline-flex">
                <IconBtn
                  // Nút "Bút vẽ" mang icon của CÂY BÚT ĐANG CẦM, không phải một icon chung: liếc vào
                  // hàng công cụ là biết ngay nét tiếp theo sẽ ra mực, ra chì hay ra vệt bút dạ — thứ
                  // mà một icon "bút vẽ" cố định không nói được.
                  icon={t.id === "draw" ? (PEN_KIT_ITEMS.find((k) => k.id === (drawTool ? tool : lastDraw))?.icon ?? mi.pen) : t.icon}
                  hint={t.hint}
                  active={topOf(tool) === t.id}
                  size={TOOL_BTN}
                  plainBg
                  onClick={() => pickTopTool(t.id)}
                />
                {/* Vạch màu dưới nút bút = màu mực của cây bút đang cầm. Đổi màu có transition
                    (D4) — cùng nhịp 0.16s với .mind-btn, để đổi màu bút không phải cú NHÁY cứng
                    duy nhất không có transition giữa một hàng nút toàn có phản hồi mượt. */}
                {t.id === "draw" && drawTool && (
                  <span
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: 10,
                      right: 10,
                      bottom: 6,
                      height: 3,
                      background: activeInk,
                      opacity: strokeAlpha(styleTool) < 1 ? 0.85 : 1,
                      transition: "background-color 0.16s ease",
                    }}
                  />
                )}
              </span>
            ))}
          </div>
          </>
          )}
          {/* Hoàn tác/làm lại không còn đứng ở đây — đã chuyển thành một cụm nổi riêng, kéo-thả-neo
              mép được, luôn thấy dù đang cầm công cụ nào (xem C2 và cụm `undoBarRef` trên mặt bảng).
              Nút "…" từng đứng cạnh đó cũng đã bỏ cùng lúc: nó mở ĐÚNG cái bảng mà nút "…" trên
              thanh tiêu đề mở. Chấm báo "đang lọc màu" chuyển theo sang nút "…" của thanh tiêu đề. */}
        </div>

        {/* Hàng phụ của TẨY — chỉ tẩy mới còn hàng phụ ở đây. Mọi lựa chọn của bút (cây bút nào,
            màu gì, cỡ nét bao nhiêu) đã chuyển hết sang thanh bút kéo thả được phía dưới, nơi tay
            đang cầm bút với tới được mà không phải rời mắt khỏi chỗ đang vẽ.
            gap-2 (8px), không phải gap-1 (4px): đây là các ô bấm liên tiếp khi đang vẽ — dưới 8px là
            dưới ngưỡng khoảng cách chạm tối thiểu. */}
        {!readOnly && tool === "eraser" && (
          <div className="mind-row flex items-center gap-2 mt-1.5 overflow-x-auto -mx-3 px-3 pb-0.5">
            {ERASER_SIZES.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setEraserSize(s)
                        tickHaptic()
                      }}
                      aria-label={`Đầu tẩy ${ERASER_LABELS[i]}`}
                      aria-pressed={eraserSize === s}
                      className="mind-btn flex-none w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={
                        eraserSize === s
                          ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)" }
                      }
                    >
                      {/* Vòng tròn xem trước to đúng theo TỈ LỆ giữa ba cỡ thật, không phải ba cỡ đặt
                          tuỳ ý — nhìn là ước lượng được đầu tẩy sẽ ăn vào bao nhiêu. */}
                      <span
                        className="rounded-full"
                        style={{
                          width: 8 + i * 5,
                          height: 8 + i * 5,
                          border: "1.5px solid var(--c-muted)",
                          background: "var(--c-line-soft)",
                        }}
                      />
                    </button>
                  ))}
                  <span className="flex-none w-px h-6" style={{ background: "var(--c-line)" }} />
                  {/* Tẩy một phần (mặc định, giống cục tẩy thật) hay xoá trọn cả nét. Cần cả hai:
                      tẩy một phần để sửa một chữ giữa dòng, xoá cả nét để dọn nhanh một hình vẽ hỏng
                      mà không phải tô đi tô lại lên nó. */}
                  <button
                    type="button"
                    onClick={() => {
                      setEraseWholeStroke((v) => !v)
                      tickHaptic()
                    }}
                    className="mind-btn flex-none h-9 px-3 rounded-xl border text-[12px] font-bold"
                    style={
                      eraseWholeStroke
                        ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                        : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-muted)" }
                    }
                  >
                    {eraseWholeStroke ? "Xoá cả nét" : "Tẩy một phần"}
                  </button>
          </div>
        )}

        {/* Hàng phụ của KHOANH VÙNG: khoanh tay tự do hay kéo một khung chữ nhật. */}
        {!readOnly && tool === "lasso" && (
          <div className="mind-row flex items-center gap-2 mt-1.5 overflow-x-auto -mx-3 px-3 pb-0.5">
            {([
              [false, mi.lasso, "Khoanh tay tự do"],
              [true, mi.shapeRect, "Khoanh theo khung chữ nhật"],
            ] as const).map(([rect, icon, label]) => (
              <button
                key={String(rect)}
                type="button"
                onClick={() => {
                  setLassoRect(rect)
                  tickHaptic()
                }}
                aria-label={label}
                aria-pressed={lassoRect === rect}
                className="mind-btn flex-none h-10 pl-2.5 pr-3.5 rounded-xl border flex items-center gap-1.5 text-[13px] font-bold"
                style={
                  lassoRect === rect
                    ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-muted)" }
                }
              >
                {icon("w-[17px] h-[17px]")}
                {rect ? "Khung" : "Tay tự do"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bảng cài đặt bảng vẽ. Nằm NGOÀI khối thanh công cụ vì nút mở nó ở thanh trên, và thanh
          trên thì có ở cả chế độ chỉ đọc — để trong đó thì chỉ đọc sẽ bấm ba chấm mà không ra gì. */}
      {menuOpen && (
          <div
            className="mind-pop absolute right-3 top-[50px] w-[236px] rounded-2xl border p-2 z-50"
            style={{ borderColor: "var(--c-line)", background: "var(--c-surface)", boxShadow: "0 12px 30px var(--c-shadow)" }}
          >
            <p className="text-[12px] font-semibold text-slate-400 px-1.5 pt-0.5 pb-1.5">
              Giấy nền
            </p>
            <div className="grid grid-cols-2 gap-1">
              {PAPER_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPaper(p)
                    tickHaptic()
                  }}
                  className="mind-btn text-[12px] font-semibold py-2 rounded-xl border"
                  style={
                    paper === p
                      ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                  }
                >
                  {PAPER_LABELS[p]}
                </button>
              ))}
            </div>

            <div className="h-px my-2" style={{ background: "var(--c-line)" }} />

            <p className="text-[12px] font-semibold text-slate-400 px-1.5 pb-1.5">Màu nền</p>
            <div className="grid grid-cols-3 gap-1">
              {PAPER_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTone(t.id)
                    writeTone(t.id)
                    tickHaptic()
                  }}
                  className="mind-btn flex flex-col items-center gap-1 py-1.5 rounded-xl border"
                  style={
                    tone === t.id
                      ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                  }
                >
                  {/* Ô xem trước mang ĐÚNG màu giấy sẽ dùng, có viền riêng để giấy trắng trên nền
                      trắng vẫn nhìn ra là một ô chứ không biến mất. */}
                  <span
                    className="w-6 h-5 rounded"
                    style={{ background: t.bg, border: "1px solid rgba(15,23,42,.18)" }}
                  />
                  <span className="text-[11px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="h-px my-2" style={{ background: "var(--c-line)" }} />

            <p className="text-[12px] font-semibold text-slate-400 px-1.5 pb-1.5">Căn chỉnh</p>
            {[
              { on: snapObjects, label: "Căn theo đối tượng", hint: "Thẻ dính vào mép và tâm thẻ khác" },
              { on: snapGrid, label: "Căn theo lưới", hint: "Thẻ dính vào ô lưới của giấy" },
            ].map((row, i) => (
              <button
                key={row.label}
                type="button"
                onClick={() => {
                  const nextObj = i === 0 ? !snapObjects : snapObjects
                  const nextGrid = i === 1 ? !snapGrid : snapGrid
                  setSnapObjects(nextObj)
                  setSnapGrid(nextGrid)
                  writeSnap(nextObj, nextGrid)
                  tickHaptic()
                }}
                aria-pressed={row.on}
                className="mind-btn w-full flex items-center gap-2 px-1.5 py-2 rounded-xl text-left"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold" style={{ color: "var(--c-text-2)" }}>
                    {row.label}
                  </span>
                  <span className="block text-[11px]" style={{ color: "var(--c-muted)" }}>
                    {row.hint}
                  </span>
                </span>
                {/* Công tắc gạt: trạng thái đọc được bằng HÌNH DẠNG (núm trái/phải) chứ không chỉ
                    bằng màu — nhìn lướt vẫn biết đang bật hay tắt. */}
                <span
                  className="flex-none w-9 h-5 rounded-full relative transition-colors"
                  style={{ background: row.on ? "var(--c-primary)" : "var(--c-line-strong)" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: row.on ? 18 : 2 }}
                  />
                </span>
              </button>
            ))}

            <div className="h-px my-2" style={{ background: "var(--c-line)" }} />

            <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1.5">
              <p className="text-[12px] font-semibold text-slate-400">Lọc theo màu</p>
              {colorFilter.size > 0 && (
                <button type="button" onClick={clearColorFilter} className="mind-btn text-[11px] font-bold" style={{ color: "var(--c-primary)" }}>
                  Xem tất cả
                </button>
              )}
            </div>
            {/* Bật một hay nhiều màu để CHỈ nổi bật đúng nhóm thẻ đó — các thẻ màu khác mờ đi (vẫn bấm
                được như thường) chứ không biến mất, để sơ đồ nhiều màu (triệu chứng/cận lâm sàng/điều
                trị...) lọc ra được đúng một tầng ý mà không phải xoá hay gấp bớt nội dung khác. */}
            <div className="grid grid-cols-5 gap-1 px-0.5 pb-1">
              {NODE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleColorFilter(c)}
                  aria-label={`Lọc màu: ${colorName(c)}`}
                  title={colorName(c)}
                  aria-pressed={colorFilter.has(c)}
                  // minWidth/minHeight 24px: sàn tối thiểu WCAG 2.5.8 cho đích chạm — trước đây chỉ
                  // dựa vào py-1 quanh chấm 18px, có thể hụt sàn tuỳ bề rộng cột lưới thật.
                  className="mind-btn flex items-center justify-center rounded-lg py-1"
                  style={{ minWidth: 24, minHeight: 24 }}
                >
                  <span
                    className="rounded-full block"
                    style={{
                      width: 18,
                      height: 18,
                      background: c,
                      boxShadow: colorFilter.has(c) ? "0 0 0 2px rgba(15,23,42,.85), 0 0 0 4px var(--c-surface)" : "0 1px 3px rgba(15,23,42,.2)",
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="h-px my-2" style={{ background: "var(--c-line)" }} />

            {/* Xuất file đã dời lên thanh trên (nút mũi tên chia sẻ) để dùng được ở cả chế độ chỉ
                đọc — xem bảng xong muốn gửi đi thì không phải bật chế độ sửa lên chỉ để xuất. */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                fitToContent()
              }}
              className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ color: "var(--c-text-2)" }}
            >
              {mi.fit("w-[18px] h-[18px]")}
              Thu cả bảng vừa khung
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                tidyAll()
              }}
              className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ color: "var(--c-text-2)" }}
            >
              {mi.tidy("w-[18px] h-[18px]")}
              Sắp lại toàn bộ bảng
            </button>
            {/* Mở lại đúng bảng hướng dẫn cử chỉ đã thấy lúc mở bảng lần đầu — dismissCoach() chỉ ghi
                "đã xem" một lần và không có lối quay lại nào khác, nên ai quên một cử chỉ giữa chừng
                (vd "kéo chồng thẻ để nối nhánh") không có chỗ tra lại. */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setShowCoach(true)
              }}
              className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ color: "var(--c-text-2)" }}
            >
              {mi.help("w-[18px] h-[18px]")}
              Xem lại hướng dẫn cử chỉ
            </button>
            {/* Chống tì tay. Tự bật khi app nhận ra bút cảm ứng (xem noteStylus), nhưng vẫn phải
                tắt được bằng tay — có người thích vẽ bằng ngón tay ngay cả khi đang cầm bút, và
                một chế độ tự bật mà không tắt được thì đúng là thứ gây ức chế nhất. */}
            <button
              type="button"
              onClick={() => {
                penOnlyTouched.current = true
                const next = !penOnly
                setPenOnly(next)
                writePenOnly(next)
                setMenuOpen(false)
                flashToast(
                  next ? "Chỉ bút mới vẽ được — ngón tay để kéo bảng" : "Ngón tay vẽ được như bút",
                )
              }}
              className="mind-btn w-full flex items-center justify-between gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ color: "var(--c-text-2)" }}
            >
              <span className="flex items-center gap-2">
                {mi.pen("w-[18px] h-[18px]")}
                Chống tì tay
              </span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={
                  penOnly
                    ? { background: "var(--c-primary-soft)", color: "var(--c-primary)" }
                    : { background: "var(--c-line-soft)", color: "var(--c-muted)" }
                }
              >
                {penOnly ? "Đang bật" : "Đang tắt"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setConfirmClear(true)
              }}
              className="mind-btn w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ color: "var(--c-danger-icon)" }}
            >
              {mi.trash("w-[18px] h-[18px]")}
              Xoá toàn bộ bảng
            </button>

            <div className="h-px my-2" style={{ background: "var(--c-line)" }} />
            <p className="text-[11px] text-slate-500 px-1.5 pb-1 leading-relaxed">
              {nodes.length} ghi chú · {strokes.length} nét vẽ · {images.length} ảnh
              {hidden.size > 0 && <> · {hidden.size} thẻ đang gấp</>}
            </p>

            {/* Phím tắt chỉ hiện trên máy có bàn phím thật — trên điện thoại nó chỉ tổ chiếm chỗ. */}
            {hasKeyboard && (
              <>
                <div className="h-px my-2" style={{ background: "var(--c-line)" }} />
                <p className="text-[12px] font-semibold text-slate-400 px-1.5 pb-1.5">
                  Phím tắt
                </p>
                <div className="px-1.5 pb-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  {SHORTCUT_HINTS.map(([key, what]) => (
                    <span key={key} className="flex items-center gap-1.5 min-w-0">
                      <kbd
                        className="flex-none px-1 py-0.5 rounded font-bold"
                        style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)", border: "1px solid var(--c-line)" }}
                      >
                        {key}
                      </kbd>
                      <span className="truncate">{what}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
      )}

      {menuOpen && <div className="absolute inset-0 z-30" onPointerDown={() => setMenuOpen(false)} />}

      {/* ─── Mặt bảng ──────────────────────────────────────────────────── */}
      <div
        ref={surfaceRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background: pal.bg,
          touchAction: "none",
          cursor: readOnly || tool === "hand" ? "grab" : "crosshair",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        onPointerDown={handleSurfacePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          ref={worldRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          {/* Nét vẽ và đường nối nằm DƯỚI ghi chú để chữ luôn đọc được */}
          <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }} width="1" height="1">
            {/* Nháy sáng lên phần vừa hoàn tác/làm lại (D1) — nằm TRÊN cùng lớp SVG này (không phải
                trong worldRef trực tiếp) để dùng chung toạ độ bảng với InkLayer, khỏi tự quy đổi. */}
            <rect
              ref={undoGlowRef}
              rx={12}
              // Alpha nằm NGAY TRONG màu tô (rgba), không đặt qua `opacity` riêng: `.pulse-glow` tự
              // chạy opacity 0→1→0, đặt thêm opacity cố định ở đây sẽ nhân dồn hai lớp mờ, và lúc
              // animation dừng (không có fill-mode "forwards") trình duyệt trả opacity về giá trị
              // đặt tại đây — nếu đó là một số khác 0, khung nháy sáng sẽ dính lại trên bảng mãi.
              fill="rgba(var(--c-primary-rgb), 0.35)"
              style={{ display: "none", pointerEvents: "none" }}
            />
            <InkLayer strokes={strokes} />

            {/* Các mẩu còn sống của những nét đang bị tẩy MỘT PHẦN. Nét gốc bị ẩn đi và thay tạm
                bằng nhóm này trong lúc kéo tay, vì một nét bị cắt đôi cần nhiều phần tử hơn nét gốc
                — thêm phần tử giữa lúc kéo thì phải qua React, tức dựng lại cả bảng mỗi khung hình. */}
            <g ref={erasePreviewRef} />

            {/* Nét đang vẽ dở — cập nhật trực tiếp, không qua React */}
            <path ref={draftPathRef} fill="none" strokeLinecap="round" strokeLinejoin="round" />

            <g ref={edgeLayerRef}>
              {renderedEdges.map((e) => {
                const a = nodeBoxes.get(e.from)
                const b = nodeBoxes.get(e.to)
                if (!a || !b) return null
                const g = edgeGeometry(a, b)
                const key = edgeKey(e)
                const picked = selEdgeKey === key
                // "algorithm" (một bước phác đồ/thuật toán): nét LIỀN, đậm hơn, màu CỐ ĐỊNH để cả
                // chuỗi bước đọc thành một luồng xuyên suốt dù đi qua thẻ khác màu nhau. "relationship"
                // (mặc định, kể cả dữ liệu cũ chưa có `kind`): giữ nguyên nét ĐỨT + ăn màu thẻ con —
                // xem ghi chú edgeColor() và MindEdge.kind trong data/types.ts.
                const isAlgorithm = e.kind === "algorithm"
                const child = nodeById.get(e.to)
                const col = picked ? "var(--c-primary)" : isAlgorithm ? ALGORITHM_EDGE_COLOR : child ? edgeColor(child.color) : EDGE_COLOR
                // id dùng cho href="#..." của <textPath> — chỉ giữ ký tự an toàn cho id/URL, khỏi
                // phải nghĩ tới việc "->" trong edgeKey() có hợp lệ trong một fragment identifier hay
                // không (nó vốn hợp lệ, nhưng không phải rủi ro đáng giữ lại khi đổi tên rẻ như vậy).
                const labelPathId = `mind-edge-lbl-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`
                return (
                  <g key={key}>
                    <path
                      data-edge={key}
                      // Nét vẽ mới được tô dần từ thẻ này sang thẻ kia (xem class mind-edge-draw)
                      className={newEdgeKey === key ? "mind-edge-draw" : undefined}
                      d={g.d}
                      fill="none"
                      stroke={col}
                      strokeWidth={picked ? 3.2 : isAlgorithm ? 2.6 : 2}
                      strokeDasharray={isAlgorithm ? undefined : "5 4"}
                      strokeLinecap="round"
                      style={{ transition: "stroke .16s ease, stroke-width .16s ease" }}
                    />
                    <path data-edge-head={key} d={g.head} fill={col} stroke="none" />
                    {e.label && (
                      <>
                        {/* Cung ẨN (không tô, không viền) chỉ để làm "đường ray" cho <textPath> bên
                            dưới — song song với cung nối thật nhưng lệch ra một chút (xem LABEL_OFFSET
                            trong edgeGeometry) để chữ không đè lên nét đứt/liền. Kéo thẻ thì
                            redrawEdgesFor() chỉ cần đổi `d` của đúng path này, chữ tự chạy theo hình
                            dạng mới — không phải tính lại toạ độ từng chữ cái bằng tay. */}
                        <path id={labelPathId} data-edge-labelpath={key} d={g.labelD} fill="none" stroke="none" />
                        {/* Chữ trần (không khung/nền) — giống đúng kiểu "Chữ trần" của thẻ ghi chú.
                            CONG THEO ĐÚNG ĐỘ CONG của cạnh nối nhờ textPath (không phải một dòng chữ
                            thẳng xoay một góc cố định như trước — dòng thẳng chỉ đúng tiếp tuyến tại
                            ĐÚNG một điểm giữa cung, càng xa điểm đó chữ càng tách khỏi đường nét, rõ
                            nhất ở nhánh dài/nhãn dài).
                            Không gắn onPointerDown — chạm trúng đường nối đã tính bằng khoảng cách
                            toán học tới đường cong (edgeAtPoint) trên toàn mặt bảng, không qua sự
                            kiện DOM của riêng path này. Sửa nhãn thì chọn đường nối rồi bấm bút chì
                            trên thanh nổi. */}
                        <text
                          fontSize={10.5}
                          fontWeight={600}
                          fill={col}
                          paintOrder="stroke"
                          stroke={PAPER_BG}
                          strokeWidth={3}
                          style={{ pointerEvents: "none" }}
                        >
                          <textPath href={`#${labelPathId}`} startOffset="50%" textAnchor="middle">
                            {e.label}
                          </textPath>
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Vùng đang khoanh (lasso) — vẽ ngay trong lúc kéo ngón */}
          <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }} width="1" height="1">
            <path
              ref={lassoPathRef}
              fill="rgba(var(--c-accent-2-rgb),.08)"
              stroke="var(--c-accent-2)"
              strokeWidth={1.6}
              strokeDasharray="6 5"
              strokeLinejoin="round"
              style={{ display: "none" }}
            />
          </svg>

          {/* Ảnh dán trên bảng, nằm dưới ghi chú */}
          {images.map((im) => {
            const selected = sel?.kind === "image" && sel.id === im.id
            const inGroup = selGroup?.images.includes(im.id) ?? false
            return (
              <img
                key={im.id}
                src={im.dataUrl}
                alt=""
                draggable={false}
                data-image-id={im.id}
                onPointerDown={(e) => handleImagePointerDown(e, im)}
                className={`absolute${bornId === im.id ? " mind-born" : ""}`}
                style={{
                  left: im.x,
                  top: im.y,
                  width: im.w,
                  height: im.h,
                  borderRadius: 10,
                  objectFit: "cover",
                  background: "#fff",
                  boxShadow: selected
                    ? "0 0 0 2.5px rgba(var(--c-primary-rgb),.6), 0 8px 20px rgba(15,23,42,.2)"
                    : inGroup
                      ? "0 0 0 2px rgba(var(--c-accent-2-rgb),.5)"
                      : "0 4px 14px rgba(15,23,42,.14)",
                  pointerEvents: drawTool || tool === "eraser" ? "none" : "auto",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                  touchAction: "none",
                }}
              />
            )
          })}

          {/* Thẻ ghi chú */}
          {renderedNodes.map((n) => {
            const m = nodeMetrics(n)
            const paint = nodePaint(n)
            const selected = sel?.kind === "node" && sel.id === n.id
            const inGroup = selGroup?.nodes.includes(n.id) ?? false
            const matched = findMatchIds?.has(n.id) ?? false
            const linked = n.link ? resolveLink(n.link) : null
            const dimmed = colorFilter.size > 0 && !colorFilter.has(n.color)
            return (
              <div
                key={n.id}
                data-node-id={n.id}
                ref={(el) => registerNode(n.id, el)}
                onPointerDown={(e) => handleNodePointerDown(e, n)}
                // Trước đây thẻ hoàn toàn không nằm trong đường Tab (không role, không tabIndex) —
                // cách DUY NHẤT chọn được thẻ bằng bàn phím là Ctrl+F rồi Enter. Giờ thêm "roving
                // tabindex": chỉ đúng MỘT thẻ (đang chọn) nằm trong đường Tab tại một thời điểm —
                // giống cách một danh sách/toolbar thật làm — để sau khi đã chọn một thẻ (bằng
                // chạm, hoặc bằng Ctrl+F), Tab từ nút khác trên màn có thể quay lại đúng thẻ đó, và
                // Enter/Delete (đã có sẵn ở handler window) áp dụng ngay. onFocus đồng bộ `sel` khi
                // focus tới bằng bàn phím (vd Shift+Tab từ thanh nổi) chứ không chỉ bằng chạm.
                role="button"
                tabIndex={selected ? 0 : -1}
                aria-pressed={selected}
                aria-label={stripInlineMarkers(n.text).trim() || "Ghi chú trống"}
                onFocus={() => {
                  if (!(sel?.kind === "node" && sel.id === n.id)) setSel({ kind: "node", id: n.id })
                }}
                className={`absolute font-semibold whitespace-pre-wrap${bornId === n.id ? " mind-born" : ""}${foundId === n.id ? " mind-found" : ""}`}
                style={{
                  left: n.x,
                  top: n.y,
                  // `width: max-content` là bắt buộc, không phải để cho đẹp: thẻ là phần tử position
                  // absolute, nếu để bề rộng tự co thì bề rộng khả dụng của nó là "bề rộng mặt bảng
                  // trừ đi toạ độ x" — nghĩa là cùng một câu chữ, thẻ càng kéo sang phải càng bị bóp
                  // hẹp và cao dần lên. Với max-content, bề rộng chỉ phụ thuộc nội dung và maxWidth.
                  width: "max-content",
                  maxWidth: m.maxWidth,
                  // Chuỗi dài không có chỗ ngắt (tên thuốc ghép gạch chéo, URL dán nhầm...) thì
                  // "normal" (mặc định) để nguyên một hàng dài tràn thẳng ra ngoài maxWidth, đè lên
                  // thẻ bên cạnh. "anywhere" chỉ bẻ khi thật sự không còn chỗ ngắt tự nhiên nào khác,
                  // không đụng tới cách ngắt dòng bình thường theo khoảng trắng.
                  overflowWrap: "anywhere",
                  padding: `${m.padY}px ${m.padX}px`,
                  borderRadius: m.radius,
                  fontSize: m.fontSize,
                  lineHeight: `${m.lineHeight}px`,
                  // Phải khớp đúng NODE_FONT_STACK — đây là font mindmapExport.ts dùng để đo/vẽ chữ khi
                  // xuất PNG/PDF. Thiếu dòng này, thẻ trên bảng thừa hưởng font chữ thường của cả app
                  // (Plus Jakarta Sans) còn ảnh xuất ra lại là Inter — cùng một ghi chú, hai font khác
                  // nhau giữa cái đang xem và cái vừa xuất.
                  fontFamily: NODE_FONT_STACK,
                  background: paint.background,
                  color: paint.color,
                  border: `${paint.borderWidth || 1}px solid ${paint.borderWidth ? paint.border : "transparent"}`,
                  boxShadow: selected
                    ? ringShadow("0 0 0 2.5px rgba(var(--c-primary-rgb),.55)", paint.shadowCss)
                    : inGroup
                      ? "0 0 0 2px rgba(var(--c-accent-2-rgb),.5)"
                      : // Thẻ khớp ô tìm: viền vàng, để nhìn một cái là thấy hết chỗ nào có chữ
                        // vừa gõ chứ không phải bấm "tiếp" từng thẻ mới biết bảng có bao nhiêu.
                        matched
                        ? ringShadow("0 0 0 2.5px rgba(217,119,6,.7)", paint.shadowCss)
                        : paint.shadowCss,
                  // Chữ CĂN GIỮA. Thẻ dài quá một dòng bị ngắt xuống, căn trái thì dòng cuối cụt lủn
                  // lệch hẳn sang trái trong một cái khung bo tròn hai đầu — nhìn như ô nhập liệu bị
                  // bỏ dở. Căn giữa thì chữ ngồi cân trong thẻ, đúng kiểu nhãn dán của sơ đồ tư duy.
                  textAlign: "center",
                  cursor: tool === "hand" ? "grab" : "default",
                  // Công cụ vẽ: cho ngón tay xuyên qua ghi chú để vẽ đè lên được.
                  pointerEvents: drawTool || tool === "eraser" ? "none" : "auto",
                  touchAction: "none",
                  // Khai báo LẠI ngay trên chính thẻ, không dựa vào kế thừa từ mặt bảng — Safari trên
                  // iPhone không luôn tôn trọng user-select thừa qua một tổ tiên có transform (worldRef
                  // phóng-thu cả bảng), nên chạm giữ vào thẻ mới tạo đôi khi bị hiểu thành "chọn văn
                  // bản" (hiện kính lúp/marker chọn chữ) thay vì bắt đầu kéo — thẻ trông như đứng im.
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none",
                  // `sliding`: chỉ bật lúc bấm "xếp lại nhánh" để thấy thẻ trượt về chỗ mới. Ngoài lúc
                  // đó KHÔNG được bật, nếu không mỗi lần kéo thả tay thẻ sẽ chạy đuổi theo một nhịp.
                  transition: sliding
                    ? "left .38s cubic-bezier(.22,1,.36,1), top .38s cubic-bezier(.22,1,.36,1), box-shadow .16s ease, opacity .15s ease"
                    : "box-shadow .16s ease, opacity .15s ease",
                  // "Lọc theo màu" (menu …): mờ thẻ không thuộc màu đang lọc, vẫn bấm được như thường —
                  // đây là lọc để NHÌN, không phải ẩn nội dung.
                  opacity: dimmed ? 0.22 : 1,
                  willChange: "transform",
                }}
              >
                <RichNodeText text={n.text} />
                {/* Thẻ có gắn bài: một dòng nhỏ ngay dưới chữ, bấm vào là mở bài đó. Bài đã bị xoá thì
                    nói rõ chứ không im lặng dẫn tới màn hình trống. */}
                {n.link && (
                  <span
                    onPointerDown={stopPointer}
                    onClick={() => {
                      if (!linked) {
                        flashToast("Bài này đã bị xoá khỏi thư viện.")
                        return
                      }
                      onOpenLink?.(n.link!)
                    }}
                    // `inline-flex` (không phải `flex`) để chip này tự căn giữa theo textAlign của
                    // thẻ; `flex` là khối chiếm trọn bề ngang nên nó sẽ dính lì bên trái.
                    className="mind-btn inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg text-[11px] font-bold"
                    style={{
                      background: paint.color === "#ffffff" ? "rgba(255,255,255,.22)" : "rgba(15,23,42,.07)",
                      // Trước đây dùng một màu xám cố định (#94a3b8) cho trạng thái "bài đã xoá", mà
                      // xám đó chỉ đạt ~2.6:1 trên nền trắng — dưới ngưỡng đọc 4.5:1. Giữ NGUYÊN màu
                      // chữ của thẻ (đã kiểm qua đủ tương phản) và để chữ "Bài đã xoá" tự nói lên
                      // trạng thái, thay vì tô nhạt màu chữ đi thêm.
                      color: "inherit",
                      cursor: "pointer",
                      maxWidth: "100%",
                    }}
                  >
                    {mi.note("w-3.5 h-3.5")}
                    {/* Thẻ tạo từ chính bài đó thì tên thẻ đã là tên bài — nhắc lại tên bài lần nữa
                        chỉ tổ chật thẻ, nên chỉ ghi "Mở bài". */}
                    <span className="truncate">
                      {!linked ? "Bài đã xoá" : linked.label.trim() === n.text.trim() ? "Mở bài" : linked.label}
                    </span>
                  </span>
                )}
              </div>
            )
          })}

          {/* Dấu tròn ở mép thẻ đang gấp: ghi số thẻ đang ẩn bên dưới, chạm vào là mở lại.
              Phải luôn hiện (không chỉ khi thẻ được chọn) vì nếu không, một nhánh gấp lại trông y hệt
              một thẻ chưa có nhánh con nào — người dùng sẽ tưởng mình vừa làm mất mấy chục thẻ. */}
          {renderedNodes.map((n) => {
            if (!n.collapsed) return null
            const count = hiddenCounts.get(n.id) ?? 0
            if (count === 0) return null
            const b = nodeBoxes.get(n.id)
            if (!b) return null
            return (
              <button
                key={`c${n.id}`}
                type="button"
                onPointerDown={stopPointer}
                onClick={() => toggleCollapse(n)}
                aria-label={`Mở lại ${count} thẻ đang gấp`}
                title={`Mở lại ${count} thẻ đang gấp`}
                className="mind-btn absolute flex items-center justify-center gap-0.5 font-bold"
                style={{
                  left: b.x + b.w + 7,
                  top: b.y + b.h / 2,
                  // Luôn to bằng đầu ngón tay dù bảng đang phóng hay thu (xem --inv-zoom).
                  transform: "translateY(-50%) scale(var(--inv-zoom, 1))",
                  transformOrigin: "left center",
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 999,
                  background: n.color,
                  color: "#fff",
                  fontSize: 11.5,
                  border: "2px solid #fff",
                  boxShadow: "0 2px 8px rgba(15,23,42,.25)",
                  pointerEvents: drawTool || tool === "eraser" ? "none" : "auto",
                  touchAction: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {mi.expand("w-3 h-3")}
                {count}
              </button>
            )
          })}

          {/* Khung chỉ chỗ đang viết trong ô phóng to. Không có nó thì viết vào ô dưới mà không biết
              chữ đang rơi vào đâu trên bảng — đúng thứ làm ô viết phóng to trở nên vô dụng. */}
          {zoomBox && (
            <div
              className="absolute"
              style={{
                left: zoomBox.x,
                top: zoomBox.y,
                width: zoomBox.w,
                height: zoomBox.h,
                border: "2px solid var(--c-primary)",
                borderRadius: 4,
                background: "rgba(var(--c-primary-rgb),.06)",
                // Viền luôn mảnh như nhau trên màn hình dù bảng đang phóng hay thu.
                borderWidth: Math.max(1, 2 / view.current.zoom),
                pointerEvents: "none",
              }}
            />
          )}

          {/* Vòng tròn đầu tẩy chạy theo ngón tay */}
          <div
            ref={eraserRingRef}
            className="absolute rounded-full"
            style={{
              display: "none",
              border: "1.5px solid rgba(var(--c-primary-rgb),.6)",
              background: "rgba(var(--c-primary-rgb),.08)",
              pointerEvents: "none",
            }}
          />

          {/* Tay cầm đổi cỡ ảnh (góc dưới phải), luôn to bằng đầu ngón tay nhờ nhân nghịch đảo zoom */}
          {selImage && (
            <div
              onPointerDown={(e) => handleResizePointerDown(e, selImage)}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: selImage.x + selImage.w,
                top: selImage.y + selImage.h,
                width: 30,
                height: 30,
                marginLeft: -15,
                marginTop: -15,
                transform: "scale(var(--inv-zoom, 1))",
                background: "var(--c-primary)",
                border: "2.5px solid #fff",
                boxShadow: "0 2px 8px rgba(15,23,42,.3)",
                touchAction: "none",
                cursor: "nwse-resize",
              }}
              aria-label="Kéo để đổi cỡ ảnh"
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRight: "2px solid #fff",
                  borderBottom: "2px solid #fff",
                  marginRight: 2,
                  marginBottom: 2,
                }}
              />
            </div>
          )}

          {/* Khung bao và thanh nút của nhóm đang khoanh chọn */}
          {selGroup && groupBox && (
            <>
              <div
                className="absolute pointer-events-none"
                style={{
                  left: groupBox.x - 8,
                  top: groupBox.y - 8,
                  width: groupBox.w + 16,
                  height: groupBox.h + 16,
                  border: "1.5px dashed var(--c-accent-2)",
                  borderRadius: 12,
                  background: "rgba(var(--c-accent-2-rgb),.05)",
                }}
              />
              <div
                onPointerDown={stopPointer}
                className="mind-pop absolute flex items-center gap-0.5 p-1 rounded-2xl"
                style={{
                  left: groupBox.x + groupBox.w / 2,
                  top: groupBox.y - 14,
                  transform: "translate(-50%, -100%) scale(var(--inv-zoom, 1))",
                  transformOrigin: "bottom center",
                  background: "var(--c-pill-dark)",
                  boxShadow: "0 6px 20px rgba(15,23,42,.3)",
                }}
              >
                <span className="px-2 text-[11px] font-bold" style={{ color: "#fff" }}>
                  {selGroup.strokes.length + selGroup.nodes.length + selGroup.images.length}
                </span>
                {/* Đúng năm màu đậm: đổi màu cả một nhóm là để gộp chúng thành MỘT khối ý, nên chỉ
                    cần các màu nói to. Trước đây lấy 5 màu đầu bảng mực, trong đó có màu đen. */}
                {AUTO_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => recolorGroup(selGroup, c)}
                    aria-label={`Đổi cả nhóm sang ${colorName(c)}`}
                    title={colorName(c)}
                    // 24x24 + margin 2: sàn tối thiểu WCAG 2.5.8 cho đích chạm (trước đây 22x22, dưới
                    // sàn 24px) — giữ nguyên tổng khoảng cách giữa các nút (22+3+3 = 24+2+2 = 28px).
                    className="mind-btn flex-none rounded-full"
                    style={{ width: 24, height: 24, margin: 2, background: c }}
                  />
                ))}
                <IconBtn
                  icon={mi.share}
                  hint="Sao chép để dán ở bảng khác"
                  tone="dark"
                  size={38}
                  onClick={() => copyGroup(selGroup)}
                />
                {/* Vạch ngăn trước nút xoá: xoá là thao tác không lùi lại được (dù có hoàn tác) và
                    đứng cạnh một dãy nút bấm liên tục (đổi màu) — không có vạch này, tay vung nhanh
                    qua các ô màu rất dễ trượt luôn vào nút xoá ngay kế bên. */}
                <span className="flex-none w-px self-stretch my-1.5" style={{ background: "rgba(255,255,255,.18)" }} />
                <IconBtn
                  icon={mi.trash}
                  hint="Xoá phần đã chọn"
                  tone="dark"
                  size={38}
                  onClick={() => deleteGroup(selGroup)}
                />
                <IconBtn
                  icon={mi.close}
                  hint="Bỏ chọn"
                  tone="dark"
                  size={38}
                  onClick={() => setSelGroup(null)}
                />
              </div>
            </>
          )}

          {/* Thanh nhỏ nổi trên phần tử đang chọn. Với thẻ ghi chú, thanh có hai trang: các thao tác,
              và hàng màu (bấm nút bảng màu để đổi trang) — đổi màu là việc làm nhiều nhất nên không
              nên bắt mở hẳn ô sửa chữ mới làm được. */}
          {/* Chỉ đọc: toàn bộ thao tác trên thanh này (sửa/xoá/nối/đổi màu/nhân đôi...) đều SỬA dữ
              liệu — ẩn hẳn, không chỉ ẩn từng nút, để không sót nút mới nào thêm sau này. */}
          {!readOnly && (selNode || selImage || selEdgeMid) && (
            <div
              ref={floatBarRef}
              onPointerDown={stopPointer}
              className="mind-pop absolute flex items-center gap-0.5 p-1 rounded-2xl"
              style={{
                left: selNode
                  ? selNode.x + (nodeBoxes.get(selNode.id)?.w ?? NODE_FALLBACK.w) / 2
                  : selImage
                    ? selImage.x + selImage.w / 2
                    : (selEdgeMid?.x ?? 0),
                top: selNode ? selNode.y - 6 : selImage ? selImage.y - 6 : (selEdgeMid?.y ?? 0) - 6,
                transform: "translate(-50%, -100%) scale(var(--inv-zoom, 1))",
                transformOrigin: "bottom center",
                background: "var(--c-pill-dark)",
                boxShadow: "0 6px 20px rgba(15,23,42,.3)",
                transition: "opacity .12s ease",
              }}
            >
              {selNode && colorsForId !== selNode.id && (
                <>
                  <IconBtn icon={mi.pencil} hint="Sửa nội dung" tone="dark" size={38} onClick={() => openEditor(selNode)} />
                  <IconBtn icon={mi.branch} hint="Thêm nhánh con" tone="dark" size={38} onClick={() => addBranch(selNode)} />
                  {selNodeHasChildren && !selNode.collapsed && (
                    <IconBtn
                      icon={mi.tidy}
                      hint="Xếp lại cả nhánh cho gọn"
                      tone="dark"
                      size={38}
                      onClick={() => tidyBranches(selNode)}
                    />
                  )}
                  {selNodeHasChildren && (
                    <IconBtn
                      icon={selNode.collapsed ? mi.expand : mi.collapse}
                      hint={selNode.collapsed ? "Mở lại nhánh con" : "Gấp nhánh con lại"}
                      tone="dark"
                      size={38}
                      onClick={() => toggleCollapse(selNode)}
                    />
                  )}
                  <IconBtn
                    icon={mi.palette}
                    hint="Đổi màu thẻ"
                    tone="dark"
                    size={38}
                    onClick={() => {
                      setColorsForId(selNode.id)
                      tickHaptic()
                    }}
                  />
                  <IconBtn icon={mi.copy} hint="Nhân đôi" tone="dark" size={38} onClick={() => duplicateNode(selNode)} />
                  <IconBtn
                    icon={mi.share}
                    hint="Sao chép cả nhánh sang bảng khác"
                    tone="dark"
                    size={38}
                    onClick={() => copyBranch(selNode)}
                  />
                  {/* Vạch ngăn trước nút xoá — xem lý do ở thanh nút của nhóm đang khoanh chọn bên
                      trên. Ở đây còn quan trọng hơn: nút liền trước là "Nhân đôi", bấm nhiều lần liên
                      tiếp khi đang nhân bản ý tưởng, trượt tay là xoá luôn thẻ gốc. */}
                  <span className="flex-none w-px self-stretch my-1.5" style={{ background: "rgba(255,255,255,.18)" }} />
                  <IconBtn icon={mi.trash} hint="Xoá ghi chú" tone="dark" size={38} onClick={() => deleteNode(selNode.id)} />
                </>
              )}

              {selNode && colorsForId === selNode.id && (
                <>
                  <IconBtn
                    icon={mi.chevronLeft}
                    hint="Quay lại"
                    tone="dark"
                    size={38}
                    onClick={() => setColorsForId(null)}
                  />
                  {/* Nút bật/tắt "áp cho cả nhánh", đứng NGAY TRƯỚC hàng màu để thấy rõ nó đổi ý
                      nghĩa của cú chạm màu tiếp theo. Chỉ hiện khi thẻ thật sự có nhánh con. */}
                  {selNodeHasChildren && (
                    <IconBtn
                      icon={mi.branch}
                      hint={applyToBranch ? "Đang áp màu cho cả nhánh — chạm để tắt" : "Áp màu cho cả nhánh bên dưới"}
                      tone="dark"
                      size={38}
                      active={applyToBranch}
                      onClick={() => {
                        setApplyToBranch((v) => !v)
                        tickHaptic()
                      }}
                    />
                  )}
                  {/* Mười sắc xếp thành LƯỚI 2 hàng × 5 cột, không phải một hàng ngang: một hàng mười
                      ô sẽ dài hơn bề ngang điện thoại mà thanh nổi này thì không cuộn được. */}
                  <div className="grid grid-rows-2 grid-flow-col gap-0.5 px-0.5">
                    {NODE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyColor(selNode, c)}
                        aria-label={`Màu thẻ: ${colorName(c)}`}
                        title={colorName(c)}
                        aria-pressed={selNode.color === c}
                        className="mind-btn flex items-center justify-center rounded-lg"
                        style={{ width: 32, height: 32 }}
                      >
                        <span
                          className="rounded-full block"
                          style={{
                            width: 22,
                            height: 22,
                            background: c,
                            boxShadow:
                              selNode.color === c ? "0 0 0 2px rgba(15,23,42,.9), 0 0 0 4px #fff" : "none",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selImage && (
                <>
                  <IconBtn
                    icon={mi.copy}
                    hint="Nhân đôi ảnh"
                    tone="dark"
                    size={38}
                    onClick={() => {
                      const id = newId("im")
                      pushUndo()
                      updateImages((ims) => [...ims, { ...selImage, id, x: selImage.x + 20, y: selImage.y + 22 }])
                      setSel({ kind: "image", id })
                      markBorn(id)
                    }}
                  />
                  <IconBtn
                    icon={mi.fit}
                    hint="Đưa ảnh lên trên cùng"
                    tone="dark"
                    size={38}
                    onClick={() => {
                      pushUndo()
                      updateImages((ims) => [...ims.filter((i) => i.id !== selImage.id), selImage])
                      tickHaptic()
                    }}
                  />
                  <span className="flex-none w-px self-stretch my-1.5" style={{ background: "rgba(255,255,255,.18)" }} />
                  <IconBtn icon={mi.trash} hint="Xoá ảnh" tone="dark" size={38} onClick={() => deleteImage(selImage.id)} />
                </>
              )}

              {sel?.kind === "edge" && (
                <>
                  <IconBtn
                    icon={mi.pencil}
                    hint="Đặt nhãn và loại đường nối (quan hệ / phác đồ)"
                    tone="dark"
                    size={38}
                    onClick={() => {
                      const cur = edges.find((ed) => ed.from === sel.from && ed.to === sel.to)
                      setEditingEdgeLabel({ from: sel.from, to: sel.to, text: cur?.label ?? "", kind: cur?.kind ?? "relationship" })
                    }}
                  />
                  <IconBtn
                    icon={mi.trash}
                    hint="Bỏ đường nối này"
                    tone="dark"
                    size={38}
                    onClick={() => {
                      const cur = edges.find((ed) => ed.from === sel.from && ed.to === sel.to)
                      setConfirmDeleteEdge({ from: sel.from, to: sel.to, kind: cur?.kind })
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Vạch chỉ báo khi thẻ hít vào mốc — nằm ở lớp mặt bảng (toạ độ màn hình) nên không bị phóng
            to theo bảng, luôn mảnh đúng 1px */}
        <div
          ref={vGuideRef}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ display: "none", width: 1, background: "rgba(var(--c-accent-2-rgb),.75)" }}
        />
        <div
          ref={hGuideRef}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ display: "none", height: 1, background: "rgba(var(--c-accent-2-rgb),.75)" }}
        />

        {/* ─── Cụm hoàn tác/làm lại ─────────────────────────────────────────
            Nổi RIÊNG khỏi thanh bút, kéo-thả-neo mép được (xem C2) — luôn thấy được ở chế độ sửa dù
            đang cầm công cụ nào (tay/bút/tẩy/khoanh vùng/nối), không phụ thuộc thanh bút đang
            đóng/mở. Ẩn hẳn ở chế độ chỉ đọc: không có gì để hoàn tác/làm lại khi không sửa được gì. */}
        {!readOnly && (
          <div
            ref={undoBarRef}
            className={`fade-in absolute z-20 flex ${undoBarVert ? "flex-col" : "flex-row"} items-center gap-0.5 rounded-2xl border p-1`}
            style={{
              ...undoBarStyle,
              borderColor: "var(--c-line)",
              background: "var(--c-float-bg)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 8px 26px var(--c-shadow)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Kéo để đưa cụm hoàn tác sang mép khác"
              title="Kéo để đưa cụm hoàn tác sang mép khác"
              onPointerDown={undoBarPointerDown}
              onPointerMove={undoBarPointerMove}
              onPointerUp={undoBarPointerUp}
              onPointerCancel={undoBarPointerUp}
              className="flex-none flex items-center justify-center rounded-lg"
              style={{
                // 24px trên trục ngắn: sàn tối thiểu WCAG 2.5.8 (trước đây 20px, dưới sàn).
                width: undoBarVert ? TOOL_BTN : 24,
                height: undoBarVert ? 24 : TOOL_BTN,
                color: "var(--c-faint)",
                touchAction: "none",
                cursor: "grab",
              }}
            >
              {mi.grip(undoBarVert ? "w-4 h-4 rotate-90" : "w-4 h-4")}
            </button>
            <IconBtn icon={mi.undo} hint="Hoàn tác" disabled={!canUndo} onClick={undo} size={TOOL_BTN} />
            <IconBtn icon={mi.redo} hint="Làm lại" disabled={!canRedo} onClick={redo} size={TOOL_BTN} />
          </div>
        )}

        {/* ─── Thanh công cụ bút ────────────────────────────────────────────
            Nổi TRÊN mặt bảng và kéo thả được (xem barPointerDown). Chỉ hiện khi đang cầm bút và
            người dùng đã mở nó ra bằng nút "Bút vẽ" — lúc không vẽ thì mặt bảng sạch hoàn toàn.

            Nằm bên trong mặt bảng (không phải ở khối thanh công cụ trên cùng) vì toạ độ kéo thả phải
            tính theo đúng vùng mà thanh được phép đi lại: mặt bảng. */}
        {!readOnly && penBarOpen && drawTool && (
          <div
            ref={penBarRef}
            // `fade-in` chứ không phải `mind-pop` như các bảng nổi khác: mind-pop chạy hoạt ảnh trên
            // thuộc tính `transform`, mà chính transform là thứ đang giữ vị trí của thanh này (xem
            // cách đặt left/top theo tỉ lệ bên dưới) — hoạt ảnh sẽ đè lên và ném thanh ra khỏi chỗ
            // của nó trong suốt 0,2 giây đầu. Hiện dần bằng độ mờ thì không đụng tới vị trí.
            className={`fade-in absolute z-20 border ${barVert ? "rounded-2xl" : ""}`}
            style={{
              ...barStyle,
              // Mờ đi khi đang vẽ, cùng nhịp với thanh trên/thanh công cụ chính (chromeStyle) — trước
              // đây chỉ hai thanh đó ẩn, thanh bút vẫn đứng nguyên che một phần bảng suốt lúc đang vẽ.
              // Không dùng thẳng `chromeStyle`: nó có `transform: translateY(...)`, mà transform ở
              // đây đã bị `barStyle` chiếm (gắn mép dọc) — gộp chung sẽ đè mất vị trí thanh.
              opacity: chromeHidden ? 0 : 1,
              pointerEvents: chromeHidden ? "none" : undefined,
              transition: "opacity 0.18s ease",
              borderColor: "var(--c-line)",
              background: "var(--c-float-bg)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: barVert ? "0 8px 26px var(--c-shadow)" : "0 4px 16px var(--c-shadow)",
              // Thanh nằm ngang dính trọn một mép nên chỉ bo hai góc phía TRONG bảng — bo cả bốn góc
              // sẽ để lộ hai khe tam giác ở hai đầu, nhìn như thanh bị đặt lệch chứ không phải đang
              // gắn vào mép.
              // Dùng borderTopWidth (không phải `borderTop: none`): trộn thuộc tính viết tắt với
              // borderColor ở trên là kiểu React cảnh báo và có thể xoá nhầm màu viền.
              // 16px khớp đúng rounded-2xl mà nhánh `barVert` dùng ở className phía trên — trước đây
              // 18px là một giá trị lẻ, không khớp bậc bo góc nào của hệ thống.
              ...(barVert
                ? {}
                : barPos.dock === "top"
                  ? { borderTopWidth: 0, borderRadius: "0 0 16px 16px" }
                  : { borderBottomWidth: 0, borderRadius: "16px 16px 0 0" }),
            }}
            // Chặn tại đây: nếu để sự kiện chạm rơi xuống mặt bảng phía dưới thì mỗi lần bấm nút trên
            // thanh cũng là một lần đặt bút xuống bảng, để lại một chấm mực ngay dưới thanh.
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Lớp cuộn TÁCH RIÊNG khỏi lớp mờ (backdrop-filter) ở div cha — Safari/iOS có lỗi vẽ
                lại đã biết: một phần tử vừa `backdrop-filter` vừa `overflow: auto/scroll` mà nội
                dung bên trong nó đổi (ở đây là mũi tên cài đặt mọc/biến mất mỗi lần đổi cây bút
                đang cầm) thì đôi khi không tự vẽ lại — cả thanh biến mất cho tới khi có một lần vẽ
                lại khác buộc trình duyệt tính toán lại lớp. Để `overflow` ở lớp mờ ngoài chuyển
                sang lớp trong SUÔNG (không blur, không nền riêng) thì Safari vẽ lại bình thường như
                mọi phần tử khác, không còn dính lỗi này. */}
            <div
              className={`flex ${barVert ? "flex-col" : "flex-row"} items-center gap-0.5 ${barVert ? "px-1 py-1.5" : "px-1.5"}`}
              style={
                // Máy hẹp hoặc thanh dựng dọc trên máy màn ngắn: cho cuộn bên trong thanh thay vì để
                // nút cuối cùng bị cắt mất ra ngoài mép bảng.
                barVert
                  ? { maxHeight: "calc(100% - 12px)", overflowY: "auto", overflowX: "hidden" }
                  : { overflowX: "auto" }
              }
            >
            <button
              type="button"
              aria-label="Kéo để đưa thanh bút sang mép khác"
              title="Kéo để đưa thanh bút sang mép khác"
              onPointerDown={barPointerDown}
              onPointerMove={barPointerMove}
              onPointerUp={barPointerUp}
              onPointerCancel={barPointerUp}
              className="flex-none flex items-center justify-center rounded-lg"
              style={{
                width: barVert ? BAR_BTN : 20,
                height: barVert ? 20 : BAR_BTN,
                color: "var(--c-faint)",
                touchAction: "none",
                cursor: "grab",
              }}
            >
              {mi.grip(barVert ? "w-4 h-4 rotate-90" : "w-4 h-4")}
            </button>

            {/* ─── Bộ bút: cả năm cây luôn có mặt ───────────────────────────
                Chỉ CÂY ĐANG CẦM mọc thêm mũi tên mở phần cài đặt của nó; bốn cây kia không có mũi
                tên nào cả. Đổi bút vẫn là một lần chạm duy nhất — thứ phải giữ bằng mọi giá, vì trong
                lúc ghi chép người ta đảo bút liên tục giữa mực và bút dạ. */}
            {PEN_KIT_ITEMS.map((k) => {
              const on = tool === k.id
              const kInk = inkStyles[inkOf(k.id)]
              return (
                <span
                  key={k.id}
                  className={`flex-none flex ${barVert ? "flex-col" : "flex-row"} items-center rounded-xl overflow-hidden`}
                  style={{ background: on ? "var(--c-primary-soft)" : "transparent" }}
                >
                  <button
                    type="button"
                    title={k.hint}
                    aria-label={k.hint}
                    aria-pressed={on}
                    onClick={() => {
                      if (on) {
                        // Chạm lại cây đang cầm = mở phần cài đặt của nó, y như bấm mũi tên bên cạnh.
                        const want = k.id === "shape" ? "shape" : "size"
                        setPenPop((v) => (v === want ? null : want))
                        tickHaptic()
                        return
                      }
                      pickPen(k.id)
                      setPenPop(null)
                    }}
                    className="mind-btn flex-none relative flex items-start justify-center pt-[9px]"
                    style={{
                      width: BAR_BTN,
                      height: BAR_BTN,
                      color: on ? "var(--c-primary)" : "var(--c-text-soft)",
                    }}
                  >
                    {k.icon("w-6 h-6")}
                    {/* Vạch mực dưới mỗi cây bút: nhìn cả thanh là thấy ngay bút chì đang xám, bút dạ
                        đang vàng — không phải bấm vào từng cây để biết nó đang mang màu gì. */}
                    <span
                      className="absolute rounded-full"
                      style={{
                        left: 8,
                        right: 8,
                        bottom: 5,
                        height: 3,
                        background: kInk.color,
                        opacity: strokeAlpha(inkOf(k.id)) < 1 ? 0.85 : 1,
                      }}
                    />
                  </button>
                  {/* Mũi tên tùy chỉnh, chỉ mọc ra ở cây ĐANG CẦM. */}
                  {on && (
                    <button
                      type="button"
                      title={k.id === "shape" ? "Chọn hình vẽ" : "Chỉnh nét"}
                      aria-label={k.id === "shape" ? "Chọn hình vẽ" : "Chỉnh nét"}
                      aria-pressed={penPop != null}
                      onClick={() => {
                        const want = k.id === "shape" ? "shape" : "size"
                        setPenPop((v) => (v === want ? null : want))
                        tickHaptic()
                      }}
                      className="mind-btn flex-none flex items-center justify-center"
                      style={{
                        width: barVert ? BAR_BTN : 16,
                        height: barVert ? 16 : BAR_BTN,
                        color: "var(--c-primary)",
                      }}
                    >
                      {(barVert ? mi.chevronDown : mi.chevronDown)("w-[13px] h-[13px]")}
                    </button>
                  )}
                </span>
              )
            })}

            <span className={barDivider} style={{ background: "var(--c-line)" }} />

            {/* ─── Nét và màu ───────────────────────────────────────────────
                Thanh DỰNG DỌC có cả chiều dài của màn hình nên bày thẳng ra: ba ô nét và ba ô màu,
                bấm phát ăn ngay. Thanh NẰM NGANG chỉ có 375px cho mười mấy nút nên gộp lại thành hai
                nút mở bảng. Cùng một bộ chức năng, khác cách bày theo chỗ thật sự có. */}
            {barVert ? (
              <>
                {inkStyle.strokes.map((sp, i) => {
                  const on = i === 0
                  return (
                    <button
                      key={`${sp.w}-${sp.dash ?? ""}-${i}`}
                      type="button"
                      title={`Nét ${sp.w}${sp.dash ? ` ${DASH_ITEMS.find((d) => d.id === sp.dash)?.label.toLowerCase()}` : ""}`}
                      aria-label={`Nét ${sp.w}${sp.dash ? ` ${DASH_ITEMS.find((d) => d.id === sp.dash)?.label.toLowerCase()}` : ""}`}
                      aria-pressed={on}
                      onClick={() => {
                        if (on) {
                          setPenPop((v) => (v === "size" ? null : "size"))
                          tickHaptic()
                          return
                        }
                        useStrokeSpec(styleTool, sp)
                        tickHaptic()
                      }}
                      className="mind-btn flex-none flex items-center justify-center rounded-xl"
                      style={{
                        width: BAR_BTN,
                        height: 34,
                        background: on ? "var(--c-line-soft)" : "transparent",
                      }}
                    >
                      {strokeSample(sp, on ? activeInk : "var(--c-text-soft)", 26)}
                    </button>
                  )
                })}

                <span className={barDivider} style={{ background: "var(--c-line)" }} />

                {/* Vài màu bấm-là-xong, lấy từ chính những màu vừa dùng. */}
                {quickColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={`Màu ${c}`}
                    aria-label={`Màu ${c}`}
                    onClick={() => {
                      setInkColorFor(styleTool, c)
                      tickHaptic()
                    }}
                    className="mind-btn flex-none flex items-center justify-center"
                    style={{ width: BAR_BTN, height: 36 }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: 26,
                        height: 26,
                        background: c,
                        opacity: strokeAlpha(styleTool) < 1 ? 0.85 : 1,
                        boxShadow: "inset 0 0 0 1px rgba(15,23,42,.15)",
                      }}
                    />
                  </button>
                ))}
                {colorButton()}
                {/* Ô "+" nét đứt: mở thẳng phần tự pha màu, đúng chỗ người ta tìm khi ba màu trên
                    thanh không có màu mình cần. */}
                <button
                  type="button"
                  title="Thêm màu"
                  aria-label="Thêm màu"
                  onClick={() => openColorSheet("custom")}
                  className="mind-btn flex-none flex items-center justify-center"
                  style={{ width: BAR_BTN, height: 36, color: "var(--c-text-muted)" }}
                >
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 26, height: 26, border: "1.5px dashed var(--c-line-strong)" }}
                  >
                    {mi.plus("w-3 h-3")}
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* Nút nét — ba mẫu nét gần nhất xếp chồng, mẫu đang dùng tô đúng màu mực. */}
                <button
                  type="button"
                  title={`Nét ${activeWidth}`}
                  aria-label={`Nét ${activeWidth}`}
                  aria-pressed={penPop === "size"}
                  onClick={() => {
                    setPenPop((v) => (v === "size" ? null : "size"))
                    tickHaptic()
                  }}
                  className="mind-btn flex-none flex flex-col items-center justify-center gap-[3px] rounded-xl"
                  style={{
                    width: BAR_BTN,
                    height: BAR_BTN,
                    background: penPop === "size" ? "var(--c-primary-soft)" : "transparent",
                  }}
                >
                  {[...inkStyle.strokes]
                    .sort((a, b) => b.w - a.w)
                    .map((sp, i) => (
                      <span key={`${sp.w}-${sp.dash ?? ""}-${i}`} className="flex items-center justify-center">
                        {strokeSample(sp, sameSpec(sp, activeSpec) ? activeInk : "var(--c-line-strong)", 22)}
                      </span>
                    ))}
                </button>
                {colorButton()}
              </>
            )}
            </div>

            {/* Bảng cỡ nét / bảng hình vẽ — mở ra phía có chỗ trống: thanh dựng dọc thì bảng bung
                sang NGANG (bên trong màn hình), thanh nằm ngang ở nửa dưới thì bảng bung LÊN. Không
                tính lại theo pixel thật vì thanh đã được đặt bằng tỉ lệ (xem barPointerMove). */}
            {penPop && (
              <div
                className="mind-pop absolute rounded-2xl border p-2.5 z-50"
                style={{
                  ...(barVert
                    ? {
                        // Bung ra phía TRONG bảng, và nếu thanh đang trượt xuống thấp thì căn theo
                        // đáy thanh để bảng không thò ra ngoài màn hình.
                        ...(barPos.f > 0.6 ? { bottom: 0 } : { top: 0 }),
                        ...(barPos.dock === "right" ? { right: "calc(100% + 6px)" } : { left: "calc(100% + 6px)" }),
                      }
                    : {
                        ...(barPos.dock === "bottom" ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
                        right: 6,
                      }),
                  width: penPop === "size" ? 236 : 190,
                  borderColor: "var(--c-line)",
                  background: "var(--c-surface)",
                  boxShadow: "0 12px 30px var(--c-shadow)",
                }}
              >
                {penPop === "shape" ? (
                  <>
                    <p className="text-[12px] font-semibold px-0.5 pb-1.5" style={{ color: "var(--c-text-muted)" }}>
                      Hình vẽ
                    </p>
                    <div className="flex items-center gap-1">
                      {SHAPES.map((s) => (
                        <IconBtn
                          key={s.id}
                          icon={s.icon}
                          hint={s.hint}
                          active={shapeKind === s.id}
                          size={38}
                          onClick={() => {
                            setShapeKind(s.id)
                            setPenPop(null)
                            tickHaptic()
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-0.5 pb-1">
                      <p className="text-[12px] font-semibold" style={{ color: "var(--c-text-muted)" }}>
                        Cỡ nét
                      </p>
                      <span className="text-[12px] font-bold tabular-nums" style={{ color: "var(--c-text-2)" }}>
                        {activeWidth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={widthRange[0]}
                      max={widthRange[1]}
                      step={0.5}
                      value={activeWidth}
                      // Ghi lại danh sách nét TRƯỚC khi kéo, chốt lại khi thả tay — xem
                      // useStrokeSpec/setCurrentSpec.
                      onPointerDown={() => {
                        widthBase.current = inkStyle.strokes.map((s) => ({ ...s }))
                      }}
                      onChange={(e) => setCurrentSpec(styleTool, { w: Number(e.target.value), ...(activeDash ? { dash: activeDash } : {}) })}
                      onPointerUp={(e) =>
                        useStrokeSpec(
                          styleTool,
                          { w: Number((e.target as HTMLInputElement).value), ...(activeDash ? { dash: activeDash } : {}) },
                          widthBase.current ?? undefined,
                        )
                      }
                      onKeyUp={(e) =>
                        useStrokeSpec(
                          styleTool,
                          { w: Number((e.target as HTMLInputElement).value), ...(activeDash ? { dash: activeDash } : {}) },
                          widthBase.current ?? undefined,
                        )
                      }
                      className="w-full"
                      style={{ accentColor: "var(--c-primary)" }}
                      aria-label="Cỡ nét"
                    />

                    {/* ─── Kiểu nét ───────────────────────────────────────
                        Chung cho mọi cây bút và cả hình vẽ: một khung chữ nhật nét đứt hay một mũi
                        tên chấm chấm là cách quen thuộc nhất để nói "cái này là phụ / là giả định",
                        mà nét liền không nói được. */}
                    <p className="text-[12px] font-semibold px-0.5 pt-2 pb-1" style={{ color: "var(--c-text-muted)" }}>
                      Kiểu nét
                    </p>
                    <div className="flex items-center gap-1.5">
                      {DASH_ITEMS.map((d) => {
                        const on = (activeDash ?? undefined) === d.id
                        return (
                          <button
                            key={d.label}
                            type="button"
                            onClick={() => {
                              useStrokeSpec(styleTool, { w: activeWidth, ...(d.id ? { dash: d.id } : {}) })
                              tickHaptic()
                            }}
                            aria-label={`Kiểu nét: ${d.label}`}
                            aria-pressed={on}
                            className="mind-btn flex-1 h-11 rounded-xl flex flex-col items-center justify-center gap-1 border"
                            style={
                              on
                                ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)" }
                                : { background: "var(--c-surface)", borderColor: "var(--c-line)" }
                            }
                          >
                            {strokeSample({ w: activeWidth, ...(d.id ? { dash: d.id } : {}) }, activeInk, 40)}
                            <span className="text-[10px] font-bold" style={{ color: on ? "var(--c-primary)" : "var(--c-text-muted)" }}>
                              {d.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <p className="text-[12px] font-semibold px-0.5 pt-2 pb-1" style={{ color: "var(--c-text-muted)" }}>
                      Ba nét gần nhất
                    </p>
                    <div className="flex items-center gap-1.5">
                      {inkStyle.strokes.map((sp, i) => {
                        const on = sameSpec(sp, activeSpec)
                        return (
                          <button
                            key={`${sp.w}-${sp.dash ?? ""}-${i}`}
                            type="button"
                            onClick={() => {
                              useStrokeSpec(styleTool, sp)
                              tickHaptic()
                            }}
                            aria-label={`Nét ${sp.w}${sp.dash ? ` ${DASH_ITEMS.find((d) => d.id === sp.dash)?.label.toLowerCase()}` : ""}`}
                            aria-pressed={on}
                            className="mind-btn flex-1 h-11 rounded-xl flex flex-col items-center justify-center gap-1 border"
                            style={
                              on
                                ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)" }
                                : { background: "var(--c-surface)", borderColor: "var(--c-line)" }
                            }
                          >
                            {strokeSample(sp, activeInk, 40)}
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: "var(--c-text-muted)" }}>
                              {sp.w}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trước đây có một khối chữ gợi ý cử chỉ nổi thường trực trên bảng TRỐNG ("Hai ngón để di
            chuyển bảng"...) — trùng nội dung với hộp "4 cách chạm hay dùng nhất" (showCoach, tự hiện
            lần đầu) và án ngữ mặt bảng mọi lần bảng trống, không chỉ lần đầu. Đã bỏ hẳn khối đó; lối
            vào duy nhất cho hướng dẫn cử chỉ giờ là nút "?" → "Xem lại hướng dẫn cử chỉ" trong menu
            "…" (xem showCoach ở khối JSX phía dưới cùng file này). */}

        {/* Radar góc trên phải — thu nhỏ toàn bộ nội dung để biết đang xem ở đâu, chạm/kéo để nhảy tới
            đó ngay. Ẩn khi bảng trống (mmMap null: chưa có gì để làm radar) hoặc lúc đang gõ tìm kiếm
            (ô tìm cũng neo gần góc này trên máy hẹp, hai thứ đè lên nhau thì rối hơn là giúp). */}
        {mmMap && !findOpen && (
          <div
            ref={minimapPanelRef}
            onPointerDown={handleMinimapPointerDown}
            onPointerMove={handleMinimapPointerMove}
            onPointerUp={handleMinimapPointerUp}
            onPointerCancel={handleMinimapPointerUp}
            title="Chạm hoặc kéo để nhảy tới chỗ đó"
            // Nằm ngay TRÊN cụm phóng-thu ở góc dưới trái, không còn ở góc trên phải. Hai thứ này
            // trả lời cùng một câu hỏi — "tôi đang xem chỗ nào, ở cỡ nào" — nên để cạnh nhau thì
            // mắt không phải chạy chéo màn hình, và góc trên phải được trả lại cho nội dung bảng.
            //
            // Không dùng class "mind-pop": hoạt ảnh bật lên của nó tự chạy opacity 0→1 mỗi lần
            // component này được dựng lại, giẫm lên đúng thứ showRadar()/applyView() đang điều
            // khiển bằng tay (ẩn/hiện theo pan-zoom, không phải theo lúc mount).
            className="absolute left-3 rounded-xl border overflow-hidden z-10"
            style={{
              bottom: 60,
              width: MM_W,
              height: MM_H,
              borderColor: "var(--c-line)",
              background: "var(--c-float-bg)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              touchAction: "none",
              cursor: "crosshair",
              // Mặc định ẨN — chỉ hiện khi showRadar() bật lên lúc pan/zoom, xem applyView().
              opacity: 0,
              pointerEvents: "none",
              transition: "opacity 0.25s ease",
            }}
          >
            {images.map((im) => {
              const lx = mmMap.offX + (im.x - mmMap.x) * mmMap.scale
              const ly = mmMap.offY + (im.y - mmMap.y) * mmMap.scale
              return (
                <div
                  key={im.id}
                  className="absolute rounded-[2px]"
                  style={{
                    left: lx,
                    top: ly,
                    width: Math.max(2, im.w * mmMap.scale),
                    height: Math.max(2, im.h * mmMap.scale),
                    background: "var(--c-line-strong)",
                  }}
                />
              )
            })}
            {visibleNodes.map((n) => {
              const box = nodeBox(n, sizeOf(n.id))
              const cx = box.x + box.w / 2
              const cy = box.y + box.h / 2
              const lx = mmMap.offX + (cx - mmMap.x) * mmMap.scale
              const ly = mmMap.offY + (cy - mmMap.y) * mmMap.scale
              return (
                <span
                  key={n.id}
                  className="absolute rounded-full"
                  style={{
                    left: lx,
                    top: ly,
                    width: 5,
                    height: 5,
                    transform: "translate(-50%, -50%)",
                    background: n.color || "var(--c-primary)",
                  }}
                />
              )
            })}
            {/* Khung trắng = phần bảng đang thấy trên màn hình. Vị trí/cỡ do drawMinimapViewport() ghi
                trực tiếp — không qua state, để theo kịp pan/zoom ở tần suất một khung hình mỗi lần. */}
            <div
              ref={minimapViewportRef}
              className="absolute rounded-[3px] pointer-events-none"
              style={{ border: "1.5px solid var(--c-primary)", boxShadow: "0 0 0 1px rgba(255,255,255,.7)" }}
            />
          </div>
        )}

        {/* ─── Nút nổi trên mặt bảng ───────────────────────────────────── */}

        {/* ─── Cụm phóng-thu, góc dưới trái ──────────────────────────────
            Mặc định chỉ một viên phần trăm — bốn nút kia (−, +, vừa khung, ô viết phóng to) chỉ
            thật sự cần khi đang chủ động chỉnh khung nhìn, mà lại thường trực chiếm chỗ suốt phiên
            làm việc. Chạm vào viên phần trăm để bung cả cụm ra, thu lại ngay khi bắt đầu vẽ (xem
            openZoomCluster/closeZoomCluster). Trước đây còn tự thu sau 3s bất kể đang làm gì — bỏ
            hẳn, vì đó là kiểu ức chế kinh điển: bung cụm, nhìn bảng để quyết định phóng bao nhiêu,
            đưa tay tới nút thì cụm vừa thu lại. */}
        <div className="absolute left-3 bottom-4 flex items-center gap-2" onPointerDown={stopPointer}>
          <div
            className={`flex items-center rounded-2xl border p-0.5 ${zoomClusterOpen ? "mind-pop" : ""}`}
            style={{ borderColor: "var(--c-line)", background: "var(--c-float-bg)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          >
            {zoomClusterOpen && (
              <IconBtn
                icon={mi.minus}
                hint="Thu nhỏ"
                size={36}
                onClick={() => {
                  zoomAround(view.current.zoom / 1.35)
                  bumpZoomCluster()
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (!zoomClusterOpen) {
                  openZoomCluster()
                  return
                }
                animateView({ x: view.current.x, y: view.current.y, zoom: 1 })
                bumpZoomCluster()
              }}
              className="mind-btn px-1 h-8 text-[11px] font-bold tabular-nums"
              style={{ color: "var(--c-text-soft)", minWidth: 40 }}
              title={zoomClusterOpen ? "Về tỉ lệ 100%" : "Mở cụm phóng-thu"}
            >
              {zoomPct}%
            </button>
            {zoomClusterOpen && (
              <IconBtn
                icon={mi.plus}
                hint="Phóng to"
                size={36}
                onClick={() => {
                  zoomAround(view.current.zoom * 1.35)
                  bumpZoomCluster()
                }}
              />
            )}
          </div>
          {zoomClusterOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  fitToContent()
                  bumpZoomCluster()
                }}
                title="Thu cả bảng vừa khung"
                aria-label="Thu cả bảng vừa khung"
                className="mind-btn mind-pop w-9 h-9 rounded-2xl border flex items-center justify-center"
                style={{
                  borderColor: "var(--c-line)",
                  background: "var(--c-float-bg)",
                  color: "var(--c-text-soft)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                {mi.fit("w-[18px] h-[18px]")}
              </button>
              {/* Nút tìm thẻ đã chuyển lên thanh trên, chung hàng với tên bảng. */}
              {/* Ô viết phóng to — đặt cạnh phóng-thu vì cùng là chuyện "nhìn bảng ở cỡ nào", chỉ khác
                  là nó phóng riêng một ô để VIẾT thay vì phóng cả bảng. */}
              <button
                type="button"
                onClick={() => {
                  if (zoomBox) setZoomBox(null)
                  else openZoomBox()
                  bumpZoomCluster()
                }}
                title="Ô viết phóng to"
                aria-label="Ô viết phóng to"
                aria-pressed={zoomBox != null}
                className="mind-btn mind-pop w-9 h-9 rounded-2xl border flex items-center justify-center"
                style={{
                  borderColor: zoomBox ? "var(--c-primary)" : "var(--c-line)",
                  background: zoomBox ? "var(--c-primary)" : "var(--c-float-bg)",
                  color: zoomBox ? "var(--c-on-bright)" : "var(--c-text-soft)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                {mi.writeBox("w-[18px] h-[18px]")}
              </button>
            </>
          )}
        </div>

        {/* Thêm nội dung, góc dưới phải — chỉ hiện ở chế độ sửa, vì đây là hành động thêm dữ liệu. */}
        {!readOnly && (
        <div className="absolute right-4 bottom-4 flex flex-col items-end gap-2" onPointerDown={stopPointer}>
          {addOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false)
                  setLinkQuery("")
                  setPickLink("add")
                }}
                className="mind-fab-item mind-btn flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full text-[13px] font-bold"
                style={{ background: "var(--c-surface)", color: "var(--c-text-2)", boxShadow: "0 6px 18px var(--c-shadow)", animationDelay: "120ms" }}
              >
                {mi.library("w-[18px] h-[18px]")}
                Bài trong app
              </button>
              <button
                type="button"
                onClick={pickImage}
                className="mind-fab-item mind-btn flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full text-[13px] font-bold"
                style={{ background: "var(--c-surface)", color: "var(--c-text-2)", boxShadow: "0 6px 18px var(--c-shadow)", animationDelay: "80ms" }}
              >
                {mi.image("w-[18px] h-[18px]")}
                Ảnh
              </button>
              {/* "Chữ trần" (không "Chữ") và "Ghi chú thẻ" (không "Ghi chú") — hai nhãn cũ không tự
                  giải thích được khác nhau ở điểm gì, phải thử mới biết: "Chữ" trước đây là chữ
                  trần trên giấy, không khung không nền; "Ghi chú" là một thẻ có khung/nền thật. */}
              <button
                type="button"
                onClick={() => addText()}
                className="mind-fab-item mind-btn flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full text-[13px] font-bold"
                style={{ background: "var(--c-surface)", color: "var(--c-text-2)", boxShadow: "0 6px 18px var(--c-shadow)", animationDelay: "40ms" }}
              >
                {mi.textSize("w-[18px] h-[18px]")}
                Chữ trần
              </button>
              <button
                type="button"
                onClick={() => addNote()}
                className="mind-fab-item mind-btn flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full text-[13px] font-bold"
                style={{ background: "var(--c-surface)", color: "var(--c-text-2)", boxShadow: "0 6px 18px var(--c-shadow)" }}
              >
                {mi.note("w-[18px] h-[18px]")}
                Ghi chú thẻ
              </button>
              {/* Chỉ hiện khi thật sự có gì để dán (đã sao chép từ nút "Sao chép nhánh"/"Sao chép"
                  trên thẻ hoặc nhóm đang chọn) — bày một nút bấm vào không ra gì còn tệ hơn không có. */}
              {hasMindmapClip() && (
                <button
                  type="button"
                  onClick={() => pasteClip()}
                  className="mind-fab-item mind-btn flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full text-[13px] font-bold"
                  style={{ background: "var(--c-surface)", color: "var(--c-text-2)", boxShadow: "0 6px 18px var(--c-shadow)" }}
                >
                  {mi.download("w-[18px] h-[18px]")}
                  Dán nhánh
                </button>
              )}
            </>
          )}
          {/* Nút này có CHỮ chứ không chỉ một dấu ＋: dấu ＋ trơ trọi không cho biết bên trong có gì,
              nhìn vào bảng trống thì không đoán được là thêm ghi chú và ảnh ở đây. */}
          <button
            type="button"
            onClick={() => {
              setAddOpen((v) => !v)
              setMenuOpen(false)
              tickHaptic()
            }}
            aria-label={addOpen ? "Đóng" : "Thêm ghi chú hoặc ảnh"}
            aria-expanded={addOpen}
            className="mind-btn h-12 pl-3.5 pr-4.5 rounded-full flex items-center gap-1.5 text-[14px] font-bold"
            style={{ background: "var(--c-primary)", color: "var(--c-on-bright)", boxShadow: "0 8px 22px rgba(var(--c-primary-rgb),.4)" }}
          >
            {addOpen ? mi.close("w-5 h-5") : mi.plus("w-5 h-5")}
            {addOpen ? "Đóng" : "Thêm"}
          </button>
        </div>
        )}

        {/* Dải nhắc khi đang khoanh vùng — hiện cả lúc khoanh vùng TẠM bằng cách giữ bút rồi kéo (C3),
            không chỉ lúc chọn thẳng công cụ khoanh vùng. */}
        {(tool === "lasso" || tempLassoActive) && !selGroup && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-full text-[12px] font-semibold fade-in flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: "var(--c-pill-dark)", color: "#fff", pointerEvents: "none" }}
          >
            {mi.lasso("w-4 h-4")}
            Khoanh một vòng quanh phần muốn chọn
          </div>
        )}

        {(loading || busy) && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-full text-[12px] font-semibold fade-in"
            style={{ background: "var(--c-pill-dark)", color: "#fff", pointerEvents: "none" }}
          >
            {loading ? "Đang mở bảng…" : "Đang xử lý ảnh…"}
          </div>
        )}

        {/* Bảng trống hẳn (vừa "Xoá toàn bộ bảng", hoặc vừa nhập một file rỗng) chỉ còn giấy trắng —
            không có gợi ý gì thì trông như app hỏng chứ không phải "chưa có gì". `pointerEvents: none`
            để không chắn tay vẽ hay long-press tạo ghi chú ngay tại đây. */}
        {!loading && nodes.length === 0 && strokes.length === 0 && images.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center fade-in"
            style={{ pointerEvents: "none" }}
          >
            {/* var(--c-text-muted) thay vì var(--c-muted): --c-muted chỉ đạt ~3:1, dưới cả ngưỡng
                4.5:1 cho chữ dù đây là chữ mô tả, không phải icon/placeholder thuần. */}
            <div className="flex flex-col items-center gap-2 text-center px-8" style={{ color: "var(--c-text-muted)" }}>
              {mi.note("w-8 h-8")}
              <p className="text-[13px] font-semibold text-slate-600">Bảng đang trống</p>
              <p className="text-[12px] leading-relaxed max-w-[220px]">
                Bấm nút "Thêm" ở góc dưới phải, hoặc giữ ngón trên một chỗ trống để tạo ghi chú đầu
                tiên.
              </p>
            </div>
          </div>
        )}

        {toast && (
          <div
            className="toast-in absolute bottom-20 left-1/2 px-4 py-2.5 rounded-2xl text-[12px] font-semibold text-center max-w-[80%]"
            style={{
              background: "var(--c-pill-dark)",
              color: "#fff",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* ─── Ô viết phóng to ────────────────────────────────────────────
          Là phần tử ANH EM của mặt bảng chứ không nằm đè lên nó: mặt bảng đang là `flex-1` nên khi
          ô này mở ra, bảng tự co lại đúng phần chiều cao ô chiếm. Đè lên thì phần bảng bị che khuất
          vẫn cuộn/vẽ được ở dưới, và khung viết trên bảng có thể nằm đúng vào chỗ bị che. */}
      {zoomBox && (
        <div
          className="flex-none border-t relative"
          style={{ height: ZOOM_PANEL_H, borderColor: "var(--c-line)", background: pal.bg }}
        >
          <div
            ref={zoomSurfaceRef}
            className="absolute inset-0 overflow-hidden"
            style={{ touchAction: "none", cursor: "crosshair", WebkitUserSelect: "none", userSelect: "none" }}
            onPointerDown={handleZoomPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handleZoomPointerUp}
            onPointerCancel={handleZoomPointerUp}
            onContextMenu={(ev) => ev.preventDefault()}
          >
            {/* Lớp nội dung: cùng dữ liệu với bảng chính, chỉ khác phép biến hình. Đây là bản CHỈ
                ĐỌC — không gắn ref hay bộ xử lý chạm cho từng thẻ, vì mọi thao tác với thẻ đều làm
                ở bảng chính nơi nhìn được tổng thể. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transformOrigin: "0 0",
                transform: `scale(${ZOOM_SCALE}) translate(${-zoomBox.x}px, ${-zoomBox.y}px)`,
              }}
            >
              <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }} width="1" height="1">
                <InkLayer strokes={strokes} />
                <path ref={zoomDraftRef} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {images.map((im) => (
                <img
                  key={im.id}
                  src={im.dataUrl}
                  alt=""
                  draggable={false}
                  style={{ position: "absolute", left: im.x, top: im.y, width: im.w, height: im.h, pointerEvents: "none" }}
                />
              ))}
              {visibleNodes.map((n) => {
                const m = nodeMetrics(n)
                const paint = nodePaint(n)
                return (
                  <div
                    key={n.id}
                    className="absolute font-semibold whitespace-pre-wrap"
                    style={{
                      left: n.x,
                      top: n.y,
                      width: "max-content",
                      maxWidth: m.maxWidth,
                      overflowWrap: "anywhere",
                      padding: `${m.padY}px ${m.padX}px`,
                      borderRadius: m.radius,
                      fontSize: m.fontSize,
                      // Cùng đơn vị px với thẻ thật (không phải bội số 1.3 rời rạc) — khác đơn vị thì
                      // cùng một ghi chú có thể XUỐNG DÒNG khác nhau giữa lớp xem trước lúc phóng to và
                      // thẻ thật trên bảng, nhất là ở cỡ chữ lớn.
                      lineHeight: `${m.lineHeight}px`,
                      fontFamily: NODE_FONT_STACK,
                      background: paint.background,
                      color: paint.color,
                      border: `${paint.borderWidth}px solid ${paint.border}`,
                      pointerEvents: "none",
                    }}
                  >
                    <RichNodeText text={n.text} />
                  </div>
                )
              })}
              <div
                ref={zoomEraserRingRef}
                className="absolute rounded-full"
                style={{
                  display: "none",
                  border: "1.5px solid rgba(var(--c-primary-rgb),.6)",
                  background: "rgba(var(--c-primary-rgb),.08)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Thanh điều khiển khung viết. Nằm đè góc phải để không ăn mất chiều rộng viết. */}
          <div
            className="absolute right-2 top-2 flex items-center gap-1 rounded-2xl border p-0.5"
            style={{ borderColor: "var(--c-line)", background: "var(--c-float-bg)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onPointerDown={stopPointer}
          >
            <IconBtn icon={mi.chevronLeft} hint="Lùi khung viết sang trái" size={34} onClick={() => moveZoomBox(-0.78, 0)} />
            <IconBtn icon={mi.chevronRight} hint="Dịch khung viết sang phải" size={34} onClick={() => moveZoomBox(0.78, 0)} />
            {/* Xuống dòng: lùi hẳn về mép trái của dòng vừa viết rồi hạ xuống một khung — đúng thao
                tác viết hết một dòng trên giấy. */}
            <IconBtn
              icon={mi.chevronDown}
              hint="Xuống dòng mới"
              size={34}
              onClick={() => {
                setZoomBox((b) => (b ? { ...b, y: b.y + b.h * 0.82 } : b))
                tickHaptic()
              }}
            />
            <IconBtn icon={mi.close} hint="Đóng ô viết phóng to" size={34} onClick={() => setZoomBox(null)} />
          </div>
        </div>
      )}

      {/* ─── Ô sửa ghi chú ─────────────────────────────────────────────── */}
      {editingNode && (
        <div
          // KHÔNG phải role="dialog": tấm này neo ở đáy, không phủ scrim che cả màn hình như các
          // tấm trượt khác của bảng — mặt vẽ phía trên vẫn còn đó, không phải trạng thái modal thật.
          // Gắn role="region" + aria-label để trình đọc màn hình vẫn nhận ra đây là MỘT vùng riêng,
          // không tuyên bố nhầm là "chặn hết tương tác khác" như dialog thật.
          role="region"
          aria-label="Sửa ghi chú"
          className="mind-sheet flex-none border-t px-4 pt-3 pb-3 z-30"
          style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onSelect={rememberDraftSelection}
            onKeyUp={rememberDraftSelection}
            onClick={rememberDraftSelection}
            rows={2}
            className="mind-input w-full px-3.5 py-2.5 rounded-2xl text-sm border outline-none mb-2"
            style={{ borderColor: "var(--c-line-strong)", background: "var(--c-surface-alt)" }}
            placeholder="Nội dung ghi chú…"
          />

          {/* Định dạng CHỮ trong ghi chú (khác với "Màu thẻ" bên dưới, vốn tô cả tấm nền). Áp lên
              đúng đoạn đang chọn trong ô nhập trên — chưa chọn gì thì đậm/nghiêng/... áp vào đúng vị
              trí con trỏ, giống mọi trình soạn thảo. `onMouseDown` chặn mất focus/mất vùng chọn khi
              bấm nút — không có nó, textarea mất focus trước khi onClick kịp chạy, và đoạn vừa chọn
              coi như mất, applyDraftStyle sẽ áp nhầm vào vị trí cũ đã nhớ từ trước đó. */}
          <div className="flex items-center gap-1 mb-2 overflow-x-auto -mx-4 px-4 relative">
            {(
              [
                { patch: { bold: true }, label: "B", hint: "Đậm", style: { fontWeight: 800 } },
                { patch: { italic: true }, label: "I", hint: "Nghiêng", style: { fontStyle: "italic" } },
                { patch: { underline: true }, label: "U", hint: "Gạch chân", style: { textDecoration: "underline" } },
                // Trước đây rgba(0,0,0,.1) — một mảng xám không giống màu tô sáng THẬT dùng khi hiển
                // thị ghi chú (--c-mark-bg). Đổi sang đúng token đó để nút xem trước đúng là xem trước.
                { patch: { highlight: true }, label: "H", hint: "Tô sáng", style: { background: "var(--c-mark-bg)", color: "var(--c-mark-fg)", borderRadius: 3 } },
              ] as const
            ).map((b) => (
              <button
                key={b.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyDraftStyle(b.patch)}
                aria-label={b.hint}
                title={b.hint}
                className="mind-btn flex-none w-9 h-9 rounded-xl border text-[14px] flex items-center justify-center"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)", color: "var(--c-text-2)", ...b.style }}
              >
                {b.label}
              </button>
            ))}

            <span className="flex-none w-px h-6 mx-0.5" style={{ background: "var(--c-line)" }} />

            {/* Gộp cỡ chữ + màu chữ + font vào MỘT nút "Aa" mở một khay chung — trước đây ba nút
                riêng (A+/Màu chữ/Font) làm cả hàng định dạng có tới bảy nút cùng lúc. */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextStyleOpen((v) => !v)}
              aria-label="Thêm định dạng chữ: cỡ, màu, font"
              title="Thêm định dạng chữ"
              aria-expanded={textStyleOpen}
              className="mind-btn flex-none px-2.5 h-9 rounded-xl border text-[14px] font-bold flex items-center justify-center gap-1"
              style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)", color: "var(--c-text-2)" }}
            >
              Aa
              <span className="flex-none" style={{ transform: textStyleOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                {mi.chevronDown("w-3 h-3")}
              </span>
            </button>

            {textStyleOpen && (
              <>
                <div className="fixed inset-0 z-40" onPointerDown={() => setTextStyleOpen(false)} />
                <div
                  className="mind-pop absolute left-0 top-full mt-1 w-[220px] rounded-2xl border p-2.5 z-50"
                  style={{ borderColor: "var(--c-line)", background: "var(--c-surface)", boxShadow: "0 12px 30px var(--c-shadow)" }}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyDraftStyle({ size: "lg" })}
                    className="mind-btn w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-[13px] font-semibold text-left"
                    style={{ color: "var(--c-text-2)" }}
                  >
                    <span className="w-6 text-center text-[15px] font-bold">A+</span>
                    Cỡ chữ lớn hơn
                  </button>

                  <span className="block h-px my-1.5" style={{ background: "var(--c-line)" }} />

                  <div className="grid grid-cols-5 gap-1 px-0.5 pb-1.5">
                    {NODE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyDraftStyle({ color: c })}
                        aria-label={`Màu chữ: ${colorName(c)}`}
                        title={colorName(c)}
                        className="mind-btn w-8 h-8 rounded-lg flex items-center justify-center"
                      >
                        <span className="w-6 h-6 rounded-full block" style={{ background: c, boxShadow: "0 1px 3px rgba(15,23,42,.2)" }} />
                      </button>
                    ))}
                  </div>

                  <span className="block h-px my-1.5" style={{ background: "var(--c-line)" }} />

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyDraftStyle({ font: "" })}
                    className="mind-btn w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-[13px] font-semibold"
                    style={{ color: "var(--c-text-2)" }}
                  >
                    <span className="w-6 text-center" style={{ fontFamily: NODE_FONT_STACK }}>
                      Aa
                    </span>
                    Mặc định
                  </button>
                  {STYLE_FONTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        // `applyDraftStyle` gộp/xoá theo GIÁ TRỊ trùng — bấm lại đúng font đang chọn
                        // thì tự trở về mặc định, không cần một nút "Mặc định" riêng phải nhớ bấm.
                        applyDraftStyle({ font: f })
                      }}
                      className="mind-btn w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-[13px] font-semibold"
                      style={{ color: "var(--c-text-2)" }}
                    >
                      <span className="w-6 text-center" style={{ fontFamily: STYLE_FONT_STACKS[f] }}>
                        Aa
                      </span>
                      {STYLE_FONT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Màu/kiểu/cỡ thẻ gấp sau một hàng tóm tắt — phần lớn ghi chú chỉ cần gõ chữ rồi lưu, không
              đụng tới màu/kiểu/cỡ; front-load cả bốn khối này mỗi lần mở ô sửa (kể cả khi chỉ gõ một
              dòng chữ) là quá nhiều lựa chọn cùng lúc. Hàng tóm tắt vẫn hiện sắc/kiểu hiện tại (chấm
              tròn theo đúng màu thật của thẻ) để không mất "nhận ra ngay" khi đang gấp. */}
          <button
            type="button"
            onClick={() => setMoreStyleOpen((v) => !v)}
            aria-expanded={moreStyleOpen}
            aria-controls={moreStyleId}
            className="mind-btn w-full flex items-center justify-between gap-2 h-10 px-2 mb-1 rounded-xl border"
            style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)" }}
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--c-text-2)" }}>
              <span
                className="w-4 h-4 rounded-full block flex-none"
                style={{ background: nodePaint(editingNode).background, boxShadow: "0 1px 3px rgba(15,23,42,.2)" }}
              />
              Màu · kiểu · cỡ thẻ
            </span>
            <span className="flex-none" style={{ color: "var(--c-text-muted)", transform: moreStyleOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              {mi.chevronDown("w-4 h-4")}
            </span>
          </button>

          <div id={moreStyleId} className="disc-body" data-open={moreStyleOpen}>
            <div>
              {/* MỘT hàng mười sắc. Bảng màu nay theo hệ Notion: mỗi sắc đã gồm sẵn cả bản đậm lẫn bản
                  nhạt, chọn bản nào là do KIỂU thẻ ngay bên dưới quyết định — nên không còn phải chia hai
                  nhóm "đậm"/"sáng" như bản trước, và số ô phải nhớ giảm từ mười hai xuống mười. */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex-1 flex flex-wrap items-center gap-0.5">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(editingNode, c)}
                      aria-label={`Màu thẻ: ${colorName(c)}`}
                      title={colorName(c)}
                      aria-pressed={editingNode.color === c}
                      className="mind-btn flex-none flex items-center justify-center rounded-xl"
                      style={{ width: 32, height: 32 }}
                    >
                      <span
                        className="rounded-full block"
                        style={{
                          width: 24,
                          height: 24,
                          background: c,
                          boxShadow:
                            editingNode.color === c
                              ? "0 0 0 2px var(--c-surface), 0 0 0 4px rgba(var(--c-primary-rgb),.5)"
                              : "0 1px 3px rgba(15,23,42,.2)",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Đổi màu CẢ NHÁNH — một sơ đồ thường tô màu theo nhánh chứ không theo từng thẻ, mà đổi
                  tay từng thẻ con thì nhánh mười thẻ là mười lần mở ô sửa. */}
              {editingNodeHasChildren && (
                <button
                  type="button"
                  onClick={() => {
                    setApplyToBranch((v) => !v)
                    tickHaptic()
                  }}
                  aria-pressed={applyToBranch}
                  className="mind-btn w-full flex items-center gap-2 h-9 px-3 mb-2 rounded-2xl border text-[12px] font-semibold"
                  style={
                    applyToBranch
                      ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-muted)" }
                  }
                >
                  <span className="flex-none">{applyToBranch ? mi.check("w-4 h-4") : mi.branch("w-4 h-4")}</span>
                  Áp màu cho cả nhánh bên dưới
                </button>
              )}

              {/* Kiểu thẻ hiện dưới dạng THẺ THẬT thu nhỏ, vẽ bằng đúng hàm nodePaint của bảng và đúng sắc
                  đang chọn. Bốn cái nhãn chữ ("Nền đặc", "Nền nhạt"…) không cho biết chúng khác nhau chỗ
                  nào cho tới khi bấm thử từng cái — nhất là từ khi mỗi sắc có tới hai sắc độ. */}
              <div className="flex items-center gap-1.5 mb-2.5">
                {NODE_STYLES.map((s) => {
                  const active = (editingNode.style ?? "solid") === s.id
                  const preview = nodePaint({ ...editingNode, style: s.id })
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => patchNode(editingNode.id, { style: s.id })}
                      aria-pressed={active}
                      aria-label={`Kiểu thẻ: ${s.label}`}
                      className="mind-btn flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-2xl border"
                      style={
                        active
                          ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)" }
                      }
                    >
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: 46,
                          height: 24,
                          borderRadius: 12,
                          background: preview.background,
                          border: `${preview.borderWidth || 1}px solid ${preview.borderWidth ? preview.border : "transparent"}`,
                          color: preview.color,
                          fontSize: 11,
                          fontWeight: 700,
                          boxShadow: preview.shadow ? "0 1px 3px rgba(15,23,42,.16)" : "none",
                        }}
                      >
                        Aa
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: active ? "var(--c-primary)" : "var(--c-text-muted)" }}>
                        {s.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto -mx-4 px-4">
                {NODE_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patchNode(editingNode.id, { size: s.id })}
                    className="mind-btn flex-none px-2.5 h-8 rounded-xl text-[12px] font-semibold border"
                    style={
                      (editingNode.size ?? "md") === s.id
                        ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                        : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-muted)" }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gắn thẻ này với một bài trong app — chạm vào thẻ trên bảng là mở thẳng bài đó ra đọc */}
          <div className="flex items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => {
                setLinkQuery("")
                setPickLink("edit")
              }}
              className="mind-btn flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-2xl border text-[13px] font-semibold"
              style={{
                borderColor: editingNode.link ? "var(--c-primary-line)" : "var(--c-line)",
                background: editingNode.link ? "var(--c-primary-soft)" : "var(--c-surface)",
                color: editingNode.link ? "var(--c-primary)" : "var(--c-text-muted)",
              }}
            >
              {mi.library("w-[17px] h-[17px]")}
              <span className="truncate">
                {editingNode.link
                  ? (resolveLink(editingNode.link)?.label ?? "Bài đã bị xoá")
                  : "Gắn với một bài trong app"}
              </span>
            </button>
            {editingNode.link && (
              <button
                type="button"
                onClick={() => patchNode(editingNode.id, { link: undefined })}
                aria-label="Bỏ gắn bài"
                className="mind-btn flex-none w-10 h-10 rounded-2xl flex items-center justify-center border"
                // #94a3b8 (2.56:1 trên nền trắng) dưới cả ngưỡng 3:1 tối thiểu cho biểu tượng điều
                // khiển (không phải chữ) theo WCAG — đổi sang #64748b (4.76:1) như nút cạnh nó.
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface)", color: "var(--c-text-muted)" }}
              >
                {mi.close("w-[17px] h-[17px]")}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => deleteNode(editingNode.id)}
              className="mind-btn w-11 flex-none h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
              aria-label="Xoá ghi chú"
            >
              {mi.trash("w-[18px] h-[18px]")}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold"
              style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
            >
              {mi.check("w-[18px] h-[18px]")}
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* ─── Bảng màu bút ──────────────────────────────────────────────────
          Trượt lên từ ĐÁY màn hình, không phải một menu nhỏ thả xuống từ nút màu. Ba lý do: bảng
          màu đầy đủ có gần ba mươi ô nên một menu nhỏ sẽ phải cuộn; đáy màn hình là chỗ ngón cái
          với tới được trên máy to; và quan trọng nhất — nút màu nằm trên thanh bút KÉO ĐI ĐƯỢC, nên
          một menu neo vào nút đó sẽ mở ra mỗi lần một chỗ, còn tấm trượt từ đáy thì lần nào cũng ở
          đúng một chỗ.

          Chọn màu xong bảng KHÔNG tự đóng: chọn màu thường đi kèm việc so đi so lại vài sắc gần
          nhau, mà mỗi lần đóng lại là một lần phải mở lại từ đầu. Đóng bằng nút X hoặc chạm ra ngoài. */}
      {colorSheet && (
        <div
          className="absolute inset-0 z-50 flex items-end fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setColorSheet(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bảng màu bút"
            className="mind-sheet w-full rounded-t-3xl flex flex-col"
            style={{ background: "var(--c-surface)", maxHeight: "72%", boxShadow: "0 -10px 40px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex-none flex items-center gap-2 px-4 pt-3.5 pb-3">
              <button
                type="button"
                onClick={() => setColorSheet(false)}
                aria-label="Đóng bảng màu"
                className="mind-btn flex-none w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "var(--c-line-soft)", color: "var(--c-text-2)" }}
              >
                {mi.close("w-[17px] h-[17px]")}
              </button>
              <p className="flex-1 text-center text-[15px] font-bold" style={{ color: "var(--c-text)" }}>
                {COLOR_SHEET_TITLES[styleTool]}
              </p>
              {/* Góc phải đổi việc theo tab đang mở, vì hai tab cần hai thứ khác nhau:
                  • Bảng màu → "Sửa", mở khoá xoá cho những màu TỰ PHA (màu dựng sẵn không xoá được,
                    xoá xong không có đường nào lấy lại ngoài xoá dữ liệu cả app).
                  • Tùy chỉnh → ống hút màu, lấy đúng màu của một thứ đang có sẵn trên màn hình. Chỉ
                    hiện khi trình duyệt thật sự có nó (Chrome/Edge trên máy tính) — bày một nút bấm
                    vào không ra gì còn tệ hơn là không có nút.
                  Luôn CHỪA ĐÚNG một ô rộng w-9 ở góc này (kể cả khi không có gì để hiện — tab "Tùy
                  chỉnh" trên mọi iPhone, Safari không có API hút màu) — nếu để trống hẳn, tiêu đề
                  giữa (`flex-1 text-center`) mất chỗ dựa bên phải, tự dạt sang trái ngay lúc chuyển
                  tab, đúng lỗi "chữ bị lệch" đã gặp. */}
              {colorTab === "custom" ? (
                hasEyeDropper ? (
                  <button
                    type="button"
                    onClick={() => void pickScreenColor()}
                    aria-label="Hút màu từ màn hình"
                    title="Hút màu từ màn hình"
                    className="mind-btn flex-none w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "var(--c-line-soft)", color: "var(--c-text-2)" }}
                  >
                    {mi.dropper("w-[17px] h-[17px]")}
                  </button>
                ) : (
                  <span className="flex-none w-9 h-9" aria-hidden="true" />
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setColorEdit((v) => !v)
                    tickHaptic()
                  }}
                  aria-pressed={colorEdit}
                  className="mind-btn flex-none h-9 px-4 rounded-full text-[13px] font-bold"
                  style={
                    colorEdit
                      ? { background: "var(--c-primary)", color: "var(--c-on-bright)" }
                      : { background: "var(--c-line-soft)", color: "var(--c-text-2)" }
                  }
                >
                  {colorEdit ? "Xong" : "Sửa"}
                </button>
              )}
            </div>

            <div className="flex-none px-4 pb-3">
              <div className="flex items-center rounded-full p-1" style={{ background: "var(--c-line-soft)" }}>
                {([
                  ["palette", "Bảng màu"],
                  ["custom", "Tùy chỉnh"],
                  ["history", "Lịch sử"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setColorTab(id)
                      if (id !== "palette") setColorEdit(false)
                      tickHaptic()
                    }}
                    aria-pressed={colorTab === id}
                    className="mind-btn flex-1 h-9 rounded-full text-[13px] font-bold"
                    style={
                      colorTab === id
                        ? { background: "var(--c-surface)", color: "var(--c-text)", boxShadow: "0 1px 4px var(--c-shadow)" }
                        : { background: "transparent", color: "var(--c-text-muted)" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
              {colorTab === "palette" && (
                <>
                  {inkPalette.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-8 gap-2.5 mb-3">
                      {row.map(({ color: c, name }) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setInkColorFor(styleTool, c)
                            tickHaptic()
                          }}
                          title={name}
                          aria-label={name}
                          aria-pressed={sameColor(activeInk, c)}
                          className="mind-btn rounded-full"
                          style={{
                            aspectRatio: "1",
                            background: c,
                            // Ô trắng trên nền trắng phải có viền riêng, nếu không nó biến mất khỏi bảng.
                            boxShadow: sameColor(activeInk, c)
                              ? "0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-primary)"
                              : "inset 0 0 0 1px rgba(15,23,42,.12)",
                          }}
                        />
                      ))}
                    </div>
                  ))}

                  <p className="text-[12px] font-semibold pt-1 pb-2" style={{ color: "var(--c-text-muted)" }}>
                    Màu tự pha
                  </p>
                  <div className="grid grid-cols-8 gap-2.5">
                    {customColors.map((c) => (
                      <span key={c} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (colorEdit) {
                              removeCustomColor(c)
                              return
                            }
                            setInkColorFor(styleTool, c)
                            tickHaptic()
                          }}
                          aria-label={colorEdit ? `Xoá màu ${c}` : `Màu ${c}`}
                          aria-pressed={!colorEdit && sameColor(activeInk, c)}
                          className="mind-btn w-full rounded-full"
                          style={{
                            aspectRatio: "1",
                            background: c,
                            boxShadow: sameColor(activeInk, c)
                              ? "0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-primary)"
                              : "inset 0 0 0 1px rgba(15,23,42,.12)",
                          }}
                        />
                        {colorEdit && (
                          <span
                            className="absolute flex items-center justify-center rounded-full pointer-events-none"
                            style={{ top: -4, right: -4, width: 17, height: 17, background: "var(--c-accent-2)", color: "#fff" }}
                          >
                            {mi.close("w-[10px] h-[10px]")}
                          </span>
                        )}
                      </span>
                    ))}
                    {/* Ô "+" nét đứt: chỗ THÊM màu, đúng như trong thiết kế — nó dẫn thẳng sang tab tự pha. */}
                    <button
                      type="button"
                      onClick={() => {
                        setColorEdit(false)
                        setColorTab("custom")
                        tickHaptic()
                      }}
                      aria-label="Thêm màu tự pha"
                      className="mind-btn w-full rounded-full flex items-center justify-center"
                      style={{
                        aspectRatio: "1",
                        border: "1.5px dashed var(--c-line-strong)",
                        color: "var(--c-text-muted)",
                      }}
                    >
                      {mi.plus("w-[15px] h-[15px]")}
                    </button>
                  </div>
                </>
              )}

              {colorTab === "custom" && (
                <div className="flex flex-col gap-4">
                  {/* Lưới sắc × độ sáng. Chạm thẳng vào ô là ĂN NGAY vào cây bút (không phải chọn rồi
                      bấm thêm nút xác nhận): đang so hai sắc gần nhau thì thứ cần thấy là nét thật
                      trên giấy, mà muốn thấy nó thì màu phải được áp trước đã. */}
                  <div
                    className="grid overflow-hidden rounded-2xl"
                    style={{ gridTemplateColumns: `repeat(${MIX_GRID[0].length}, 1fr)` }}
                  >
                    {MIX_GRID.map((row, ri) =>
                      row.map((c, ci) => (
                        <button
                          key={`${ri}-${ci}`}
                          type="button"
                          onClick={() => {
                            setMixColor(toHex(c))
                            setInkColorFor(styleTool, c)
                            tickHaptic()
                          }}
                          aria-label={`Màu ${toHex(c)}`}
                          aria-pressed={sameColor(activeInk, c)}
                          className="relative"
                          style={{ aspectRatio: "1", background: c }}
                        >
                          {/* Ô đang chọn: một vòng trắng viền đen mảnh — thấy được trên cả ô đen lẫn
                              ô trắng, thứ mà một vòng một màu không làm được trên lưới này. */}
                          {sameColor(activeInk, c) && (
                            <span
                              className="absolute rounded-full pointer-events-none"
                              style={{
                                left: "50%",
                                top: "50%",
                                width: 12,
                                height: 12,
                                marginLeft: -6,
                                marginTop: -6,
                                border: "2px solid #fff",
                                boxShadow: "0 0 0 1px rgba(0,0,0,.45)",
                              }}
                            />
                          )}
                        </button>
                      )),
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Lưu màu đang pha vào Bảng màu — chấm màu kèm dấu cộng, đúng thứ nó sẽ thành. */}
                    <button
                      type="button"
                      onClick={() => {
                        addCustomColor(toHex(mixColor))
                        tickHaptic()
                        flashToast("Đã thêm vào bảng màu")
                      }}
                      className="mind-btn flex-none flex items-center gap-2"
                      style={{ color: "var(--c-text-2)" }}
                    >
                      <span className="relative flex-none">
                        <span
                          className="block rounded-full"
                          style={{ width: 34, height: 34, background: mixColor, boxShadow: "inset 0 0 0 1px rgba(15,23,42,.15)" }}
                        />
                        <span
                          className="absolute flex items-center justify-center rounded-full"
                          style={{ top: -3, right: -3, width: 16, height: 16, background: "var(--c-primary)", color: "var(--c-on-bright)" }}
                        >
                          {mi.plus("w-[10px] h-[10px]")}
                        </span>
                      </span>
                      <span className="text-[14px] font-bold whitespace-nowrap">Vào Bảng màu</span>
                    </button>

                    {/* Ô mã màu: gõ tay được, dùng khi cần đúng một mã lấy từ chỗ khác. */}
                    <label
                      className="flex-1 min-w-0 h-11 flex items-center gap-1.5 px-3 rounded-full"
                      style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-line)" }}
                    >
                      <span className="text-[12px] font-bold" style={{ color: "var(--c-text-muted)" }}>
                        HEX
                      </span>
                      <input
                        value={hexDraft ?? toHex(mixColor).slice(1).toUpperCase()}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
                          setHexDraft(v.toUpperCase())
                          // Đủ sáu ký tự thì áp luôn, không đợi rời ô: gõ xong mà chưa thấy gì đổi
                          // thì không biết mình gõ đúng hay sai.
                          if (v.length === 6) {
                            setMixColor(`#${v}`)
                            setInkColorFor(styleTool, `#${v}`)
                          }
                        }}
                        onBlur={() => setHexDraft(null)}
                        aria-label="Mã màu HEX"
                        spellCheck={false}
                        autoCapitalize="characters"
                        className="mind-input flex-1 min-w-0 bg-transparent outline-none text-[14px] font-bold tabular-nums tracking-wide"
                        style={{ color: "var(--c-text)" }}
                      />
                    </label>

                    {/* Bánh xe màu của chính hệ điều hành — chỗ duy nhất lấy được những sắc không có
                        trong lưới (lưới chia 12 sắc, đủ dùng nhưng không phải là tất cả). */}
                    <span className="relative flex-none" style={{ width: 44, height: 44 }}>
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            "conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                        }}
                      />
                      <span
                        className="absolute rounded-full"
                        style={{ inset: 7, background: mixColor, boxShadow: "0 0 0 2px var(--c-surface)" }}
                      />
                      <input
                        type="color"
                        value={toHex(mixColor)}
                        onChange={(e) => {
                          setMixColor(e.target.value)
                          setInkColorFor(styleTool, e.target.value)
                        }}
                        aria-label="Chọn màu tự do"
                        title="Chọn màu tự do"
                        className="absolute inset-0 opacity-0"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </span>
                  </div>
                </div>
              )}

              {colorTab === "history" &&
                (colorHistory.length === 0 ? (
                  <p className="text-[13px] text-center py-6" style={{ color: "var(--c-text-muted)" }}>
                    Chưa có màu nào được dùng. Chọn một màu ở tab Bảng màu, nó sẽ nằm lại đây.
                  </p>
                ) : (
                  <div className="grid grid-cols-8 gap-2.5">
                    {colorHistory.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setInkColorFor(styleTool, c)
                          tickHaptic()
                        }}
                        aria-label={`Màu ${c}`}
                        aria-pressed={sameColor(activeInk, c)}
                        className="mind-btn rounded-full"
                        style={{
                          aspectRatio: "1",
                          background: c,
                          boxShadow: sameColor(activeInk, c)
                            ? "0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-primary)"
                            : "inset 0 0 0 1px rgba(15,23,42,.12)",
                        }}
                      />
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bảng chọn bài để gắn vào thẻ ──────────────────────────────── */}
      {pickLink && (
        <div
          className="absolute inset-0 z-50 flex items-end fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setPickLink(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={pickLink === "add" ? "Thêm thẻ từ một bài" : "Gắn thẻ với một bài"}
            className="mind-sheet w-full rounded-t-3xl flex flex-col"
            style={{ background: "var(--c-surface)", maxHeight: "76%", boxShadow: "0 -10px 40px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex-none px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--c-line)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-bold text-slate-900">
                  {pickLink === "add" ? "Thêm thẻ từ một bài" : "Gắn thẻ với một bài"}
                </p>
                <button
                  type="button"
                  onClick={() => setPickLink(false)}
                  aria-label="Đóng"
                  className="mind-btn w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
                >
                  {mi.close("w-[18px] h-[18px]")}
                </button>
              </div>
              <input
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                placeholder="Tìm theo tên bài…"
                className="w-full px-3.5 py-2.5 rounded-2xl text-sm border outline-none"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)" }}
              />
            </div>
            <div className="scroll-ios flex-1 px-3 py-2">
              {filteredLinkTargets.length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-8">
                  {linkTargets.length === 0 ? "Chưa có bài nào trong app." : "Không tìm thấy bài nào khớp."}
                </p>
              )}
              {filteredLinkTargets.map((t) => (
                <button
                  key={t.target}
                  type="button"
                  onClick={() => {
                    if (pickLink === "add") addLinkedNode(t)
                    else if (editingId) {
                      patchNode(editingId, { link: t.target })
                      setPickLink(false)
                      setLinkQuery("")
                      tickHaptic()
                    }
                  }}
                  className="mind-btn w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left"
                >
                  <span className="flex-none text-slate-300">{mi.note("w-[18px] h-[18px]")}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold text-slate-800 leading-snug">{t.label}</span>
                    <span className="block text-[12px] text-slate-400 mt-0.5">{t.group}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Hỏi lại trước khi xoá cả bảng ─────────────────────────────── */}
      {editingEdgeLabel && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-8 fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setEditingEdgeLabel(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nhãn đường nối"
            className="mind-pop w-full max-w-[300px] rounded-3xl p-5"
            style={{ background: "var(--c-surface)", boxShadow: "0 20px 50px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-slate-900 mb-1.5">Nhãn đường nối</p>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-3">
              Giải thích quan hệ giữa hai thẻ, vd. "gây ra", "chống chỉ định". Để trống thì bỏ nhãn.
            </p>
            {/* Loại đường nối: "Quan hệ" (mặc định, nét đứt, ăn màu thẻ) cho liên hệ kiến thức thường
                ngày; "Phác đồ" (nét liền, đậm, màu xanh cố định) cho một bước trong thuật toán/phác đồ
                — để cả chuỗi bước đọc thành một luồng xuyên suốt dù đi qua thẻ khác màu nhau. */}
            <div className="flex gap-1.5 mb-3">
              {(
                [
                  { v: "relationship" as const, label: "Quan hệ" },
                  { v: "algorithm" as const, label: "Phác đồ / thuật toán" },
                ]
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setEditingEdgeLabel({ ...editingEdgeLabel, kind: opt.v })}
                  className="flex-1 h-9 rounded-xl text-[12px] font-bold"
                  style={
                    editingEdgeLabel.kind === opt.v
                      ? { background: opt.v === "algorithm" ? ALGORITHM_EDGE_COLOR : "var(--c-text-2)", color: "var(--c-on-bright)" }
                      : { background: "var(--c-line-soft)", color: "var(--c-text-muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={editingEdgeLabel.text}
              onChange={(ev) => setEditingEdgeLabel({ ...editingEdgeLabel, text: ev.target.value })}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") saveEdgeLabel()
                if (ev.key === "Escape") setEditingEdgeLabel(null)
              }}
              placeholder="Nhãn…"
              maxLength={24}
              className="w-full h-11 px-3.5 rounded-xl text-sm mb-3"
              style={{ background: "var(--c-line-soft)", color: "var(--c-text)" }}
            />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["gây ra", "dẫn tới", "chống chỉ định", "chẩn đoán phân biệt", "điều trị bằng", "yếu tố nguy cơ"].map(
                (w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setEditingEdgeLabel({ ...editingEdgeLabel, text: w })}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                    style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
                  >
                    {w}
                  </button>
                ),
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingEdgeLabel(null)}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveEdgeLabel}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File đã dựng xong, chờ người dùng bấm để giao đi. Bước này tồn tại vì iOS — xem ghi chú
          đầu exportBoard(). */}
      {exportReady && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-8 fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setExportReady(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={exportReady.kind === "pdf" ? "File PDF đã sẵn sàng" : "Ảnh đã sẵn sàng"}
            className="mind-pop w-full max-w-[320px] rounded-3xl p-5"
            style={{ background: "var(--c-surface)", boxShadow: "0 18px 40px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-bold text-slate-900">
              {exportReady.kind === "pdf" ? "File PDF đã sẵn sàng" : "Ảnh đã sẵn sàng"}
            </p>
            <p className="text-[12px] text-slate-500 leading-[1.5] mt-1 break-all">{exportReady.name}</p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => void deliverReady()}
                className="w-full h-11 rounded-2xl text-[14px] font-bold"
                style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
              >
                Lưu / Chia sẻ
              </button>
              <button
                onClick={openReadyInTab}
                className="w-full h-11 rounded-2xl text-[14px] font-bold border"
                style={{ borderColor: "var(--c-line)", color: "var(--c-text-2)" }}
              >
                Mở xem trước
              </button>
              <button
                onClick={() => setExportReady(null)}
                className="w-full h-9 text-[13px] font-semibold"
                style={{ color: "var(--c-muted)" }}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClear && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-8 fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setConfirmClear(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xoá toàn bộ bảng?"
            className="mind-pop w-full max-w-[300px] rounded-3xl p-5"
            style={{ background: "var(--c-surface)", boxShadow: "0 20px 50px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-slate-900 mb-1.5">Xoá toàn bộ bảng?</p>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              {nodes.length} ghi chú, {strokes.length} nét vẽ và {images.length} ảnh sẽ bị xoá khỏi bảng. Vẫn lấy lại
              được bằng nút hoàn tác ngay sau đó.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={clearBoard}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "var(--c-danger-icon)" }}
              >
                Xoá hết
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteEdge && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-8 fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={() => setConfirmDeleteEdge(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Bạn thật sự muốn xoá ${confirmDeleteEdge.kind === "algorithm" ? "bước phác đồ" : "quan hệ"} này?`}
            className="mind-pop w-full max-w-[300px] rounded-3xl p-5"
            style={{ background: "var(--c-surface)", boxShadow: "0 20px 50px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-slate-900 mb-1.5">
              Bạn thật sự muốn xoá {confirmDeleteEdge.kind === "algorithm" ? "bước phác đồ" : "quan hệ"} này?
            </p>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              Đường nối {confirmDeleteEdge.kind === "algorithm" ? "và bước phác đồ" : "và nhãn quan hệ"} sẽ bị xoá.
              Vẫn lấy lại được bằng nút hoàn tác ngay sau đó.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteEdge(null)}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteEdge(confirmDeleteEdge.from, confirmDeleteEdge.to)
                  setConfirmDeleteEdge(null)
                }}
                className="mind-btn flex-1 h-11 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "var(--c-danger-icon)" }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hướng dẫn cử chỉ lần đầu — hiện đúng MỘT LẦN (xem readCoachSeen/COACH_STORAGE_KEY). Che cả
          màn hình (kể cả thanh công cụ) vì các cử chỉ nói tới đều xảy ra trên mặt bảng — để hở thanh
          công cụ thì người dùng bấm ngay vào đó, đóng hộp thoại nửa vời mà không đọc hết. */}
      {showCoach && !loading && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-8 fade-in"
          style={{ background: "var(--c-scrim)" }}
          onPointerDown={dismissCoach}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="4 cách chạm hay dùng nhất"
            className="mind-pop w-full max-w-[320px] rounded-3xl p-5"
            style={{ background: "var(--c-surface)", boxShadow: "0 20px 50px var(--c-shadow)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-slate-900 mb-3">4 cách chạm hay dùng nhất</p>
            <ul className="space-y-2.5 mb-4">
              {[
                ["Giữ ngón trên chỗ trống", "Tạo ghi chú ngay tại đó"],
                ["Hai ngón trên bảng", "Luôn là phóng to/thu nhỏ và di chuyển bảng"],
                ["Kéo một thẻ chồng lên thẻ khác", "Nối làm nhánh con của thẻ đó"],
                ["Chạm hai lần nhanh vào chỗ trống", "Phóng to gấp đôi, chạm lại để về 100%"],
              ].map(([title, detail]) => (
                <li key={title} className="flex gap-2.5">
                  <span
                    className="flex-none rounded-full mt-0.5"
                    style={{ width: 6, height: 6, marginTop: 7, background: "var(--c-primary)" }}
                  />
                  <span className="text-[13px] leading-snug">
                    <span className="font-semibold text-slate-800">{title}</span>
                    <span className="text-slate-500"> — {detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={dismissCoach}
              className="mind-btn w-full h-11 rounded-2xl text-sm font-semibold"
              style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageFiles}
        className="hidden"
      />
    </div>
  )
}
