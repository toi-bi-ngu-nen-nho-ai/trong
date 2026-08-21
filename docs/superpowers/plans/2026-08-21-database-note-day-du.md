# Bật Database + Note đầy đủ như AFFiNE thật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bật 10 view extension còn thiếu (Database, SlashMenu, DragHandle, 7 inline) trong
`src/board/extensions.ts` để Database + định dạng inline trong Note hoạt động đầy đủ như AFFiNE
thật, đo dung lượng bundle thật, và xác nhận bằng kiểm tay trên trình duyệt thật.

**Architecture:** Chỉ sửa `src/board/extensions.ts` (đăng ký extension, KHÔNG đụng
`src/vendor/blocksuite/` — D11 cấm). Vì SlashMenu build menu ĐỘNG theo đúng các
`SlashMenuConfigExtension` đã đăng ký (mỗi view extension tự đăng ký config của mình khi được
bật), không cần code UI riêng để "chèn Database" — gõ `/` trong Note là đủ. Nếu build lộ biến CSS
thiếu định nghĩa (lỗi CÓ THẬT của thượng nguồn, đã xảy ra một lần ở chặng Template ngay trước
chặng này), vá bằng bí danh trong `src/index.css`, đúng khuôn đã có tiền lệ — không sửa vendor.

**Tech Stack:** TypeScript, Vite, Lit/BlockSuite (vendored), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-database-note-day-du-design.md`

## Global Constraints

- D11: `src/vendor/blocksuite/` cấm sửa dưới mọi hình thức.
- Thứ tự trong mảng `viewExtensions` PHẢI khớp đúng thứ tự thượng nguồn
  `getInternalViewExtensions()` (`src/vendor/blocksuite/affine/all/src/extensions/view.ts`) — ảnh
  hưởng z-index của widget.
- KHÔNG bật `DataViewViewExtension`/`@blocksuite/affine-block-data-view` — khối riêng, ngoài phạm
  vi (spec §2).
- Không viết code tự chế thay cho `InlinePresetViewExtension` — chủ dự án đã chốt lấy trọn bộ 7
  extension inline của thượng nguồn, không tối giản.
- Đo dung lượng bundle THẬT bằng `npm run build`, không ước lượng. Ngưỡng tham chiếu D11:
  +150 kB gzip — vượt xa thì DỪNG, hỏi lại chủ dự án trước khi gộp, không tự quyết.
- Bảy cổng hiện có (`tsc`, `npm test`, `kiem:vendor`, `kiem:vendor-paths`, `build`, `kiem:dist`)
  phải xanh trước khi coi bất kỳ task nào xong.
- Nội dung dịch cho các chuỗi mới lộ ra thuộc `affine/blocks/database`/`affine/widgets/slash-menu`/…
  là NGOÀI PHẠM VI kế hoạch này (spec §8) — chặng riêng sau, không làm ở đây.

---

## Task 1: Bật 10 extension trong `extensions.ts`, đúng thứ tự thượng nguồn

**Files:**
- Modify: `src/board/extensions.ts`

**Interfaces:**
- Không tạo hàm/kiểu mới — chỉ thêm import + phần tử vào mảng `viewExtensions` đã có.
- Produces: `viewExtensions` (export hiện có, không đổi tên/kiểu) giờ có 33 phần tử thay vì 23.

- [ ] **Step 1: Xác nhận lại thứ tự thượng nguồn ngay trước khi sửa (đừng tin số liệu trong spec)**

```bash
sed -n '60,135p' src/vendor/blocksuite/affine/all/src/extensions/view.ts
```

Kỳ vọng thấy đúng các dòng sau (đã xác nhận lúc viết kế hoạch này, 2026-08-21 — nếu cây vendor đã
đổi kể từ đó, DỪNG và báo lại, đừng tự suy diễn thứ tự mới):
- Nhóm Block: `...DataViewViewExtension, DatabaseViewExtension, DividerViewExtension...` — Database
  đứng NGAY TRƯỚC vị trí Frame trong toàn cục (không có Divider/DataView chen giữa vì cả hai không
  được bật ở app này).
- Nhóm Inline (7 dòng liền nhau): `InlineCommentViewExtension, FootnoteViewExtension,
  LinkViewExtension, ReferenceViewExtension, InlineLatexViewExtension, MentionViewExtension,
  InlinePresetViewExtension`.
- Nhóm Widget, đầu danh sách: `DragHandleViewExtension, EdgelessAutoConnectViewExtension,
  FrameTitleViewExtension, KeyboardToolbarViewExtension, LinkedDocViewExtension,
  RemoteSelectionViewExtension, ScrollAnchoringViewExtension, SlashMenuViewExtension,
  ToolbarViewExtension...` — DragHandle đứng đầu nhóm Widget; SlashMenu đứng ngay trước Toolbar.

- [ ] **Step 2: Sửa khối import — thêm 10 dòng, giữ thứ tự bảng chữ cái trong từng nhóm hiện có của file (đúng quy ước đang dùng: các import xếp theo A→Z không phân nhóm)**

Trong `src/board/extensions.ts`, thay khối import hiện tại:

```ts
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { MindmapViewExtension } from '@blocksuite/affine-gfx-mindmap/view'
import { NoteViewExtension as GfxNoteViewExtension } from '@blocksuite/affine-gfx-note/view'
import { PointerViewExtension } from '@blocksuite/affine-gfx-pointer/view'
import { ShapeViewExtension } from '@blocksuite/affine-gfx-shape/view'
import { TemplateViewExtension } from '@blocksuite/affine-gfx-template/view'
import { TextViewExtension } from '@blocksuite/affine-gfx-text/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'
```

bằng:

```ts
import { DatabaseViewExtension } from '@blocksuite/affine-block-database/view'
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { MindmapViewExtension } from '@blocksuite/affine-gfx-mindmap/view'
import { NoteViewExtension as GfxNoteViewExtension } from '@blocksuite/affine-gfx-note/view'
import { PointerViewExtension } from '@blocksuite/affine-gfx-pointer/view'
import { ShapeViewExtension } from '@blocksuite/affine-gfx-shape/view'
import { TemplateViewExtension } from '@blocksuite/affine-gfx-template/view'
import { TextViewExtension } from '@blocksuite/affine-gfx-text/view'
import { InlineCommentViewExtension } from '@blocksuite/affine-inline-comment/view'
import { FootnoteViewExtension } from '@blocksuite/affine-inline-footnote/view'
import { LatexViewExtension as InlineLatexViewExtension } from '@blocksuite/affine-inline-latex/view'
import { LinkViewExtension } from '@blocksuite/affine-inline-link/view'
import { MentionViewExtension } from '@blocksuite/affine-inline-mention/view'
import { InlinePresetViewExtension } from '@blocksuite/affine-inline-preset/view'
import { ReferenceViewExtension } from '@blocksuite/affine-inline-reference/view'
import { DragHandleViewExtension } from '@blocksuite/affine-widget-drag-handle/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
import { SlashMenuViewExtension } from '@blocksuite/affine-widget-slash-menu/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'
```

(`LatexViewExtension as InlineLatexViewExtension`: bí danh y hệt thượng nguồn, vì thượng nguồn có
CẢ MỘT `LatexViewExtension` khác ở `affine-block-latex` — app này không bật gói đó nên không thật
sự đụng độ tên, nhưng giữ bí danh cho khớp quy ước đọc-hiểu-ngay của thượng nguồn.)

- [ ] **Step 3: Sửa mảng `viewExtensions` — chèn đúng 10 phần tử vào đúng vị trí**

Thay:

```ts
export const viewExtensions = [
  FoundationViewExtension,

  PointerViewExtension,
  GfxNoteViewExtension,
  BrushViewExtension,
  ShapeViewExtension,
  MindmapViewExtension,
  ConnectorViewExtension,
  GroupViewExtension,
  TextViewExtension,
  TemplateViewExtension,

  FrameViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,
  RootViewExtension,

  FrameTitleViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,
]
```

bằng:

```ts
export const viewExtensions = [
  FoundationViewExtension,

  PointerViewExtension,
  GfxNoteViewExtension,
  BrushViewExtension,
  ShapeViewExtension,
  MindmapViewExtension,
  ConnectorViewExtension,
  GroupViewExtension,
  TextViewExtension,
  TemplateViewExtension,

  DatabaseViewExtension,
  FrameViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,
  RootViewExtension,

  InlineCommentViewExtension,
  FootnoteViewExtension,
  LinkViewExtension,
  ReferenceViewExtension,
  InlineLatexViewExtension,
  MentionViewExtension,
  InlinePresetViewExtension,

  DragHandleViewExtension,
  FrameTitleViewExtension,
  SlashMenuViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,
]
```

- [ ] **Step 4: Cập nhật comment đầu file — số đếm và danh sách gói loại trừ**

Trong cùng file, sửa đoạn mở đầu (dòng 1-9 hiện tại):

```ts
// Danh sách extension cắt gọn (D13).
//
// GIỮ 23 / 58 view extension của thượng nguồn (`getInternalViewExtensions()` trong
// src/vendor/blocksuite/affine/all/src/extensions/view.ts). MỌI THỨ KHÔNG CÓ TRONG MẢNG BÊN DƯỚI
// LÀ ĐÃ BỎ — 35 mục, cố tình không liệt kê ra đây vì một danh sách chép tay sẽ mục ngay lần nâng
// cấp cây vendored tiếp theo; muốn biết chính xác thì so mảng dưới với file thượng nguồn nói trên.
// Phần bỏ đi trải trên cả năm nhóm của thượng nguồn, không chỉ nhóm block: 1 gfx (link),
// 14 block, TOÀN BỘ 7 inline, 9 widget và TOÀN BỘ 4 fragment (0+1+14+7+9+4 = 35).
```

thành:

```ts
// Danh sách extension cắt gọn (D13).
//
// GIỮ 33 / 58 view extension của thượng nguồn (`getInternalViewExtensions()` trong
// src/vendor/blocksuite/affine/all/src/extensions/view.ts). MỌI THỨ KHÔNG CÓ TRONG MẢNG BÊN DƯỚI
// LÀ ĐÃ BỎ — 25 mục, cố tình không liệt kê ra đây vì một danh sách chép tay sẽ mục ngay lần nâng
// cấp cây vendored tiếp theo; muốn biết chính xác thì so mảng dưới với file thượng nguồn nói trên.
// Phần bỏ đi trải trên bốn nhóm của thượng nguồn: 1 gfx (link), 13 block (Database đã bật, KHÔNG
// gồm DataViewViewExtension — khối riêng, cố tình không bật, xem spec), 9 widget và TOÀN BỘ
// 4 fragment (0+13+9+4 = 26 — trừ đi 1 vì nhóm inline giờ ĐỦ 7/7, không còn góp vào phần loại).
//
// Chặng 2026-08-21 "Database + Note đầy đủ" (xem
// docs/superpowers/specs/2026-08-21-database-note-day-du-design.md) bật thêm 10 extension:
// DatabaseViewExtension, SlashMenuViewExtension, DragHandleViewExtension, và toàn bộ 7 extension
// Inline (trước đó nhóm Inline bị loại 100%). Hệ quả: Note trên canvas giờ có đầy đủ định dạng
// inline (đậm/nghiêng/@nhắc/liên kết/chú thích/công thức/bình luận) — không chỉ riêng ô Database.
// SlashMenu (gõ "/") là đường DUY NHẤT để chèn khối Database vào một Note — không có nút riêng.
```

Đoạn "Hệ quả cần biết trước khi tưởng Note là note đầy đủ" (đoạn ngay sau, nhắc Note thiếu inline)
giờ ĐÃ SAI — xoá nguyên đoạn đó (không còn đúng nữa, Note đã có inline).

- [ ] **Step 5: `tsc --noEmit` phải sạch**

Run: `npx tsc --noEmit`
Expected: exit 0, không lỗi. Nếu lỗi "Cannot find module '@blocksuite/affine-xxx/view'": kiểm tra
lại đúng tên gói bằng `grep '"name"' src/vendor/blocksuite/affine/<đường-dẫn>/package.json` — một
trong 10 tên gói ở Step 2 có thể đã đổi nếu cây vendored được nâng cấp giữa lúc viết kế hoạch và
lúc thi hành.

- [ ] **Step 6: Chạy toàn bộ test suite hiện có — không kỳ vọng đổi số**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -20` (KHÔNG dùng `| tail -N` để lấy bằng chứng
lỗi nếu có — chạy vậy chỉ để xem tổng kết nhanh; nếu có ca đỏ, chạy lại KHÔNG qua ống dẫn để đọc
đủ thông điệp, đúng bài học đã trả giá của dự án này)
Expected: `29 file / 277 ca` xanh — con số này không đổi vì task này không thêm/sửa file test nào,
chỉ cấu hình extension.

- [ ] **Step 7: Commit**

```bash
git add src/board/extensions.ts
git commit -m "feat(board): bật 10 extension Database+SlashMenu+DragHandle+7 inline (D13: 23→33/58)"
```

---

## Task 2: Build thật, đo dung lượng, vá lỗ hổng CSS thượng nguồn nếu phát sinh

**Files:**
- Modify (CÓ THỂ, tuỳ kết quả Step 2): `src/index.css`

**Interfaces:**
- Không có interface code mới trong task này (đo lường + vá CSS nếu cần).

- [ ] **Step 1: Chạy `kiem:vendor`/`kiem:vendor-paths` — xác nhận D11 không bị đụng**

Run: `npm run kiem:vendor && npm run kiem:vendor-paths`
Expected: `kiem:vendor` — "Đã so 2782 file với thượng nguồn, lệch 0"; `kiem:vendor-paths` — "khớp
438 mục". Task 1 không đụng `src/vendor/blocksuite/` nên hai số này PHẢI giữ nguyên y hệt trước
task — nếu lệch, có gì đó đã vô tình sửa file vendor, dừng lại điều tra trước khi đi tiếp.

- [ ] **Step 2: Build thật, đọc kỹ output — đây là bước đo dung lượng chính thức của chặng**

Run: `npm run build 2>&1 | tee /tmp/build-database-note.txt`
Ghi lại chính xác dòng `dist/assets/EdgelessBoard-*.js` (kích thước thô và gzip) từ output — đây
là con số dùng để so ngưỡng D11, KHÔNG được đoán hay làm tròn.

Hai khả năng ở bước `postbuild` (`kiem-dist.mjs`):

**(a) Xanh ngay** — "kiem-dist: xanh". Bỏ qua Step 3, sang Step 4.

**(b) Đỏ vì "BIẾN CSS ĐỎ — 1 (hoặc nhiều) tên --drt-* được dùng nhưng không được định nghĩa"** —
đúng lớp lỗi đã gặp ở chặng Template ngay trước (biến `--drt-secondary`, vá ở `src/index.css`).
Đây LÀ lỗi có thật của thượng nguồn (tên biến CSS họ dùng và tên họ định nghĩa trong
`@toeverything/theme` lệch nhau ở một vài chỗ), không phải lỗi của D11 hay của task này — sang
Step 3.

- [ ] **Step 3 (CHỈ chạy nếu Step 2 đỏ theo nhánh (b)): Vá từng biến CSS thiếu, theo đúng khuôn đã có**

Với MỖI biến `--drt-xxx` mà `kiem-dist.mjs` báo thiếu định nghĩa:

1. Tìm tên biến GẦN GIỐNG đã có định nghĩa thật trong theme:
   ```bash
   grep -o -- "--drt-[a-z-]*xxx[a-z-]*" .vendor-build/theme/style.css | sort -u
   ```
   (thay `xxx` bằng phần gốc của tên biến thiếu, vd biến thiếu `--drt-secondary` thì tìm `secondary`)
2. Tìm đúng dòng nguồn TS gây ra (để trích ngữ cảnh cho comment vá — đọc file, không đoán):
   ```bash
   grep -rn -- "--affine-<tên-biến-không-tiền-tố>" src/vendor/blocksuite/affine/ --include="*.ts"
   ```
3. Thêm một dòng bí danh vào khối `:root { --drt-secondary: var(--drt-secondary-color); }` đã có
   sẵn trong `src/index.css` (chặng Template tạo ra khối này — TÁI DÙNG, không tạo khối `:root`
   mới), theo đúng mẫu: `--drt-<tên-thiếu>: var(--drt-<tên-đúng-đã-định-nghĩa>);` — trỏ vào biến
   VENDOR thật (đã tự đổi theo sáng/tối), KHÔNG trỏ vào hệ token `--c-*` riêng của app.
4. Thêm một dòng vào comment giải thích phía trên khối đó, nêu rõ: biến nào thiếu, dòng TS nguồn
   nào gây ra, đo được ngày nào.

- [ ] **Step 4: Build lại, xác nhận `kiem:dist` xanh**

Run: `npm run build 2>&1 | tail -15`
Expected: "kiem-dist: xanh — không còn 'affine-' và mọi biến --drt-* dùng đều có định nghĩa." và
dòng "bản dịch vi.json — N/N có mặt" (N không đổi so với trước Task 1 — task này không đụng
`vi.json`).

- [ ] **Step 5: So sánh dung lượng với ngưỡng D11**

Lấy số gzip của `EdgelessBoard-*.js` ghi ở Step 2, trừ đi baseline TRƯỚC chặng này — baseline gần
nhất đã đo (chặng Template, commit `6c09c1a`): **698,41 kB gzip**. Nếu (số mới − 698,41) > 150 kB:
DỪNG, không tự gộp — báo cáo con số thật cho chủ dự án và chờ quyết định. Nếu ≤ 150 kB: ghi số vào
báo cáo task, tiếp tục.

- [ ] **Step 6: Commit (chỉ nếu Step 3 có chỉnh sửa; nếu Step 2 xanh ngay thì KHÔNG có gì để commit ở task này)**

```bash
git add src/index.css
git commit -m "fix(board): vá biến CSS thượng nguồn thiếu định nghĩa lộ ra khi bật Database/inline"
```

---

## Task 3: Kiểm tay trên trình duyệt thật — 5 mục bắt buộc của spec §7

**Files:** không sửa file nào ở task này (chỉ xác nhận qua trình duyệt) — trừ khi phát hiện lỗi
thật, xem "Nếu phát hiện lỗi" ở cuối task.

- [ ] **Step 1: Mở dev server, mở một bảng vẽ**

Dùng Browser pane (`preview_start` với `{"name": "drtrong-dev"}`), mở TAB MỚI (đừng dùng lại tab
cũ — buffer console không tự xoá khi điều hướng, bài học đã trả giá nhiều lần của dự án này). Vào
tab "Mindmap", tạo hoặc mở một bảng, đợi `document.querySelector('canvas')` khác `null`.

- [ ] **Step 2: Tạo Note, gõ `/`, xác nhận menu build đúng**

Dùng công cụ Note trên toolbar chính tạo một Note trên canvas, bấm vào để soạn, gõ một đoạn văn
bất kỳ rồi gõ `/`. Đọc DOM (`read_page` hoặc `javascript_tool` dò shadow DOM như các lượt kiểm
trước trong dự án) xác nhận:
- Menu SlashMenu xuất hiện, không lỗi console.
- Có mục để chèn Database/Table (tên tiếng Anh, chưa dịch — ĐÚNG dự kiến, dịch là chặng riêng).
- KHÔNG có mục nào ứng với khối chưa bật (vd Attachment, Bookmark, Code, Callout, Image, Embed) —
  nếu CÓ, đó là bằng chứng `defaultSlashMenuConfig` hoặc một view extension khác góp mục ngoài dự
  kiến — dừng lại, đọc `scripts` liên quan, KHÔNG tự ý bấm thử để "xem có vỡ không".

- [ ] **Step 3: Chèn một khối Database, gõ dữ liệu**

Chọn mục Database (hoặc Table) trong menu vừa mở. Xác nhận khối được chèn vào Note, không ném lỗi
console. Thêm một cột, thêm một hàng, gõ chữ vào một ô. Nếu Database hỗ trợ đổi view (Table/Kanban),
thử đổi qua lại một lượt.

- [ ] **Step 4: Bôi đen chữ trong Note, xác nhận thanh định dạng inline**

Bôi đen một đoạn chữ trong Note (không phải trong ô Database). Xác nhận:
- Thanh công cụ định dạng nổi lên (bold/italic/underline tối thiểu).
- Bấm đậm (hoặc phím tắt) đổi đúng kiểu chữ, đọc lại DOM xác nhận `<strong>`/thẻ tương ứng.
- Gõ `@` xem có gợi ý mention nào nổi lên không (kể cả rỗng/không có gì để gợi ý cũng được — chỉ
  cần KHÔNG lỗi console).

- [ ] **Step 5: Kéo-thả khối bằng drag-handle**

Trong Note có ít nhất hai khối (đoạn văn + Database vừa tạo), rê chuột sát mép trái một khối — xác
nhận tay cầm kéo-thả (drag handle) hiện ra. Kéo đổi thứ tự hai khối, xác nhận DOM đổi thứ tự đúng
sau khi thả.

- [ ] **Step 6: `prefers-reduced-motion` và chế độ tối — không hồi quy**

Lặp lại nhanh phần kiểm đã làm ở chặng "đẩy hiệu ứng DanhSachBang" (mục 19 HANDOFF.md) cho riêng
màn Mindmap: đổi `data-theme` sang `dark`, xác nhận Note/Database/SlashMenu vẫn đọc được (không
chữ trắng trên nền trắng do thiếu biến CSS theo chế độ tối). Không cần lặp lại toàn bộ bộ kiểm cũ,
chỉ xác nhận KHÔNG có gì mới vỡ do các extension vừa bật.

- [ ] **Step 7: Dọn dữ liệu thử, ghi lại kết quả**

Xoá Note/bảng vừa tạo để thử nghiệm (đúng quy trình dọn đã dùng ở các chặng kiểm tay trước — mở
menu "⋯", bấm xoá hai lượt xác nhận). Ghi vào báo cáo task: kết quả từng mục Step 2-6, kèm bằng
chứng cụ thể (đoạn JSON trả về từ `javascript_tool`, không chỉ mô tả bằng lời).

**Nếu phát hiện lỗi thật ở bất kỳ step nào** (console error, DOM sai, tính năng không hoạt động):
ghi lại chính xác thông điệp lỗi + bước tái hiện, KHÔNG tự vá ngay trong task này trừ khi lỗi thuộc
đúng lớp đã có tiền lệ (biến CSS thiếu — quay lại Task 2 Step 3). Lỗi thuộc lớp khác: dừng, báo cáo
cho lượt review toàn nhánh phân xử (xem cuối kế hoạch).

---

## Sau ba task — review toàn nhánh, không tự gộp một mình

Theo đúng mức rủi ro đã ghi ở spec §7 (thay đổi CẤU TRÚC, không phải nội dung/hiệu ứng — track P1
có lịch sử P1-B với 11 lỗi review bắt được, toàn bộ nằm trong mã kế hoạch cho sẵn): **không** áp
dụng lối "tự soát trực tiếp" đã dùng cho các chặng nội dung/hiệu ứng thuần. Sau khi cả ba task
xong và bảy cổng xanh:

1. `superpowers:requesting-code-review` trên toàn nhánh (từ điểm rẽ nhánh tới `HEAD`).
2. Đóng mọi Important/Critical trước khi gộp; Minor có thể hoãn có ghi chú lý do.
3. `superpowers:finishing-a-development-branch` để quyết định cách gộp (merge commit trực tiếp
   như BoardGallery/"đẩy hiệu ứng", không qua PR GitHub — đúng thói quen gần nhất của dự án, xem
   HANDOFF mục 18 "Vận hành").
4. Cập nhật `HANDOFF.md` — mục mới, đúng khuôn các mục 16-19 đã có: chặng làm gì, đã xong gì, số
   liệu bảy cổng đo lại SAU gộp, kiểm tay đã làm, nợ còn lại (ít nhất: nội dung dịch cho chuỗi mới
   lộ ra là chặng riêng chưa làm).

## Self-Review

**1. Spec coverage:**

| Mục spec | Task |
|---|---|
| §3 Mười extension, đúng thứ tự | Task 1 |
| §4 Đường chèn khối qua SlashMenu, không cần UI riêng | Task 3 Step 2-3 (xác nhận bằng kiểm tay, không phải bằng code — đúng bản chất "không cần xây gì thêm") |
| §5 Đo dung lượng thật, ngưỡng +150 kB gzip | Task 2 Step 2, 5 |
| §6 D11 không đụng vendor; D12 nội dung dịch ngoài phạm vi | Task 2 Step 1 (xác nhận D11); Global Constraints nhắc D12 ngoài phạm vi |
| §7 Năm mục kiểm tay + review toàn nhánh | Task 3 (5 step khớp 5 mục) + mục "Sau ba task" |
| §9 Tiêu chí xong 1-6 | Task 1 (1, 6) · Task 2 (2, 3) · Task 3 (4) · "Sau ba task" (5) |

Không có mục nào trong spec thiếu task tương ứng.

**2. Placeholder scan:** không còn "TBD"/"TODO"/"xử lý phù hợp". Nhánh (b) của Task 2 Step 2 mô tả
MỘT lớp lỗi cụ thể đã có tiền lệ thật (không phải "xử lý lỗi chung chung") kèm quy trình vá từng
bước cụ thể; Task 3 "nếu phát hiện lỗi" cũng phân theo đúng lớp đã biết vs lớp mới, không phải
"handle edge cases" mơ hồ.

**3. Type consistency:** không có hàm/kiểu mới nào được định nghĩa trong kế hoạch này (chỉ cấu
hình extension có sẵn) nên không có nguy cơ lệch chữ ký giữa các task.
