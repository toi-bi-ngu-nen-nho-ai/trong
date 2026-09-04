// Danh sách extension cắt gọn (D13).
//
// GIỮ 52 / 58 view extension của thượng nguồn (`getInternalViewExtensions()` trong
// src/vendor/blocksuite/affine/all/src/extensions/view.ts). MỌI THỨ KHÔNG CÓ TRONG MẢNG BÊN DƯỚI
// LÀ ĐÃ BỎ — 6 mục, cố tình không liệt kê ra đây vì một danh sách chép tay sẽ mục ngay lần nâng
// cấp cây vendored tiếp theo; muốn biết chính xác thì so mảng dưới với file thượng nguồn nói trên.
// Phần bỏ đi trải trên BA nhóm của thượng nguồn (gfx giờ ĐỦ, không còn góp phần loại kể từ Task 12
// bật GfxLinkViewExtension): 1 block (LatexViewExtension — khối, xem lý do dưới), 3 widget
// (EdgelessAutoConnect, RemoteSelection, NoteSlicer), 2 fragment (FramePanel, AdapterPanel) — nhóm
// inline vẫn ĐỦ 7/7, không góp vào phần loại (1+3+2 = 6). Đếm bằng tay trên mảng bên dưới mỗi lần
// sửa số này — đừng suy diễn từ lượt trước.
//
// Chặng 2026-08-21 "Database + Note đầy đủ" (xem
// docs/superpowers/specs/2026-08-21-database-note-day-du-design.md) bật thêm 10 extension:
// DatabaseViewExtension, SlashMenuViewExtension, DragHandleViewExtension, và toàn bộ 7 extension
// Inline (trước đó nhóm Inline bị loại 100%). Hệ quả: Note trên canvas giờ có đầy đủ định dạng
// inline (đậm/nghiêng/@nhắc/liên kết/chú thích/công thức/bình luận) — không chỉ riêng ô Database.
// SlashMenu (gõ "/") là đường DUY NHẤT để chèn khối Database vào một Note — không có nút riêng.
//
// Chặng 2026-08-31 bật thêm 1: EdgelessTextViewExtension — điều tra lỗi người dùng báo "Chữ tự do:
// bấm là vào hư vô". Công cụ Chữ tự do (menu Sơ đồ tư duy) chèn khối `affine:edgeless-text` qua
// `insertEdgelessTextCommand` vì cờ `enable_edgeless_text` mặc định BẬT — nhưng không có extension
// này thì không ai đăng ký `BlockViewExtension('affine:edgeless-text', …)` lẫn thẻ
// `drt-edgeless-text`, nên khối vào store mà không có gì vẽ ra. Xem
// src/board/__tests__/cong-cu-chu-tu-do.spec.ts. Ghi chú lịch sử: đoạn đầu file lúc D13 liệt
// EdgelessText vào diện BỎ — kể từ chặng này nó KHÔNG còn trong diện đó nữa (số liệu ở đoạn đầu đã
// cập nhật theo qua các lượt sửa sau).
//
// Chặng 2026-08-23 (xem docs/superpowers/specs/2026-08-22-dich-be-mat-hien-thi-dot-2-design.md
// mục "Ngoài phạm vi") bật thêm 4: AttachmentViewExtension, CodeBlockViewExtension,
// ImageViewExtension, SurfaceRefViewExtension — để 7/8 chuỗi dịch bị gỡ ở chặng "Dịch bề mặt hiển
// thị đợt 2" (mục 21 HANDOFF.md) có nơi hiển thị. ĐÃ ĐO kích thước bundle (xem ghi chú dưới).
//
// LatexViewExtension (khối, khác InlineLatexViewExtension ở nhóm Inline) THỬ bật HAI LẦN, cả hai
// đều PHẢI GỠ LẠI:
//
// Lần 1 (2026-08-23): `affine/blocks/latex/src/configs/tooltips.ts:34` gọi `unsafeHTML()` →
// `sanitizeHTML()` → `DOMPurify.sanitize()` NGAY Ở CẤP MODULE (khi `view.ts` được import, không
// đợi tới lúc dùng thật) — `dompurify` tự phát hiện `window` LÚC IMPORT để quyết định hình dạng
// export; environment 'node' (đa số file spec, xem vite.config.ts) không có `window` nên default
// export là hàm factory trần, không `.sanitize` → `TypeError: default.sanitize is not a function`
// ngay khi `diTruBangCu.spec.ts`/`edgeless-board.spec.ts` IMPORT module, dù bản thân hai ca kiểm đó
// không đụng gì tới Latex.
//
// ĐÃ TÌM ĐÚNG GỐC RỄ VÀ VÁ ĐƯỢC (không đụng vendor): thêm `test.alias` cho `dompurify` trong
// `vite.config.ts` trỏ sang `src/__test-stubs__/dompurify.ts` — RED→GREEN xác nhận cả hai file
// trên xanh sau khi vá. Nhưng chạy TRỌN bộ 34 file thì lộ vấn đề khác: KaTeX
// (`katex.renderToString()`, cũng chạy đồng bộ ở cấp module cùng chỗ) cộng dồn thời gian IMPORT
// cho MỌI file test board (không riêng Latex) — ba ca dùng SlashMenu chờ khối mới xuất hiện
// (`edgeless-board-database.spec.ts`, `-dark-mode.spec.ts`, `-reorder.spec.ts`) timeout 5000ms khi
// chạy TRỌN bộ, nhưng XANH khi chạy RIÊNG LẺ (3355ms, dư nhiều so với 5000ms) — đúng dạng "chập
// chờn do tải" mục 6 đã ghi, không phải lỗi logic. Nhưng đây là CHI PHÍ THẬT (thêm độ trễ import
// cho toàn bộ suite, siết hẹp biên độ timeout mặc định 5s ở MỌI file, không riêng Latex) đổi lấy
// ĐÚNG MỘT chuỗi ("Equation") — không đáng. Quyết định: GỠ Latex; gỡ luôn `test.alias`/stub
// `dompurify` vì không còn gì dùng tới (YAGNI, cùng tinh thần "không danh sách miễn ngầm" mục 11).
// Toàn bộ điều tra (bao gồm cách vá đúng nếu cần thử lại) chép ở HANDOFF.md mục 23 — chặng sau
// muốn thử lại (ví dụ nếu nâng `testTimeout` mặc định vì lý do khác, hoặc thượng nguồn sửa
// `tooltips.ts` để không render KaTeX đồng bộ lúc import) thì đọc đó, đừng điều tra lại từ đầu.
// "Equation" VẪN nằm trong diện hoãn.
//
// Chặng 2026-09-04, Task 10 (xem
// docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md) bật thêm 5:
// DocTitleViewExtension, KeyboardToolbarViewExtension, PageDraggingAreaViewExtension,
// ScrollAnchoringViewExtension, DividerViewExtension — nhóm 1 trong bốn nhóm bật dần cho CHẾ ĐỘ
// TRANG (bài viết): thiếu năm cái này thì page mode không dùng được. Cùng lượt, `viewManager` và
// hai hàm `layExtensionsEdgeless`/`layExtensionsTrang` dời từ EdgelessBoard.tsx sang cuối file này
// (nguyên văn, chỉ đổi đường import), để TrangBaiViet.tsx không còn phải kéo theo module edgeless.
//
// DocTitleViewExtension không override `setup()` — nó không đăng ký gì qua `context.register`, chỉ
// đăng ký thẻ Lit qua `effect()`. Ở AFFiNE thật, app chủ tự đặt thẻ tiêu đề quanh EditorHost; cây
// vendored không tự mount nó (đúng như spec §6.3 cảnh báo). TrangBaiViet.tsx vì vậy tự dựng thẻ này
// và gán `.doc` — xem chú thích tại chỗ đặt trong file đó. TÊN THẺ THẬT: `doc-title`, KHÔNG mang
// tiền tố affine-/drt- nào — `fragments/doc-title/src/effects.ts` viết thẳng
// `customElements.define('doc-title', DocTitle)`, và luật đổi tên của `scripts/doi-ten-vendor.mjs`
// chỉ khớp `\baffine-` (có gạch nối ngay sau), nên không đụng tới một chuỗi không có tiền tố đó.
// Bốn extension còn lại đều ĐỊNH DANH bằng hằng `AFFINE_..._WIDGET = 'affine-...-widget'` (trừ
// Divider, viết thẳng `'affine-divider'`) nên có prefix và ĐƯỢC đổi thành `drt-` bình thường.
//
// KeyboardToolbarViewExtension.setup() chỉ `context.register` widget khi `context.scope` là
// 'mobile-page', hoặc 'page' VÀ `IS_MOBILE` (dò user agent thiết bị — KHÔNG phải media query bề
// ngang). Thẻ Lit vẫn luôn được đăng ký qua `effect()` bất kể nhánh này; chỉ WIDGET có thật sự xuất
// hiện trên DOM hay không mới phụ thuộc nó. Phần kiểm mắt (thanh công cụ bàn phím ảo dưới 768px)
// nằm ngoài phạm vi Task 10, dời sau Task 13 (xem báo cáo).
//
// Chặng 2026-09-04, Task 11 (xem
// docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md) bật thêm 4:
// TableViewExtension, CalloutViewExtension, OutlineViewExtension, DataViewViewExtension — nhóm 2
// trong bốn nhóm bật dần cho CHẾ ĐỘ TRANG: nội dung phong phú (bảng, khối nhấn mạnh, mục lục, ô dữ
// liệu). DataViewViewExtension TRƯỚC ĐÂY (đoạn D13 gốc) ghi "cố tình không bật" — ghi chú đó đã LỖI
// THỜI kể từ chặng này, spec kho-bai-viet-page-mode liệt nó vào diện BẬT ở nhóm 2 nên đã bật cùng ba
// extension kia. TÊN THẺ THẬT tra từ cây vendored (không đoán theo tên lớp — hai trong bốn đoán ban
// đầu SAI):
//   - Table: `blocks/table/src/table-block.ts` định danh bằng hằng
//     `TableBlockComponentName = 'affine-table'`, `effects.ts` dùng lại hằng đó → `drt-table` (KHÔNG
//     phải `drt-table-block-component` như suy đoán ban đầu theo tên lớp `TableBlockComponent`).
//   - Callout: `blocks/callout/src/effects.ts` viết thẳng chuỗi `'affine-callout'` → `drt-callout`.
//   - Outline: `fragments/outline/src/outline-panel.ts` định danh bằng hằng
//     `AFFINE_OUTLINE_PANEL = 'affine-outline-panel'` → `drt-outline-panel`. (Gói này còn định nghĩa
//     `affine-outline-panel-header`/`-body`, không dùng làm đại diện vì đó là các mảnh con của cùng
//     panel.)
//   - DataView: `blocks/data-view/src/effects.ts` viết thẳng chuỗi `'affine-data-view'` →
//     `drt-data-view` (KHÔNG phải `drt-data-view-block` như suy đoán ban đầu theo tên lớp
//     `DataViewBlockComponent`).
// Cả bốn đều mang tiền tố affine- gốc nên đổi thành drt- bình thường ở bước build vendor (không rơi
// vào trường hợp đặc biệt như `doc-title` ở Task 10).
//
// Mục lục (Outline) thay cơ chế `blocksToToc()` tự chế của hệ bài viết cũ bằng chính
// `OutlinePanel`/`AFFINE_OUTLINE_PANEL` của thượng nguồn — panel đọc trực tiếp cây block của doc,
// không cần đồng bộ tay danh sách heading.
//
// Chặng 2026-09-04, Task 12 (xem
// docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md) bật thêm 5:
// LinkedDocViewExtension, BookmarkViewExtension, EmbedViewExtension, EmbedDocViewExtension,
// GfxLinkViewExtension — nhóm 3 trong bốn nhóm bật dần cho CHẾ ĐỘ TRANG: liên kết và nhúng (gõ `@`
// mở bảng chọn tài liệu, dán URL tự bọc bookmark/embed, nhúng bài viết vào bài viết). TÊN THẺ THẬT
// tra từ cây vendored (task-12-brief.md Step 1, cả bốn brief nêu đều ĐÚNG lần này):
//   - LinkedDoc: `widgets/linked-doc/src/config.ts` định danh bằng hằng
//     `AFFINE_LINKED_DOC_WIDGET = 'affine-linked-doc-widget'` → `drt-linked-doc-widget`.
//   - Bookmark: `blocks/bookmark/src/effects.ts` viết thẳng chuỗi `'affine-bookmark'` →
//     `drt-bookmark`.
//   - Embed: `blocks/embed/src/effects.ts` viết thẳng chuỗi `'affine-embed-figma-block'` →
//     `drt-embed-figma-block` (đại diện — gói còn đăng ký nhiều thẻ embed khác: GitHub, HTML,
//     iframe, Loom, YouTube... cùng lượt `effects()`).
//   - EmbedDoc: `blocks/embed-doc/src/effects.ts` viết thẳng chuỗi
//     `'affine-embed-linked-doc-block'` → `drt-embed-linked-doc-block`.
// Bốn thẻ trên đều mang tiền tố affine- gốc nên đổi thành drt- bình thường. GfxLink KHÁC:
// `gfx/link/src/effects.ts` viết thẳng chuỗi `'edgeless-link-tool-button'` — KHÔNG mang tiền tố
// affine- nên luật đổi tên `\baffine-` của `scripts/doi-ten-vendor.mjs` không đụng tới, tên runtime
// giữ nguyên `edgeless-link-tool-button` (cùng lớp bẫy với `doc-title` ở Task 10).
//
// VA CHẠM TÊN: thượng nguồn có HAI extension cùng tên lớp `LinkViewExtension` — một ở
// `@blocksuite/affine-inline-link/view` (đã bật từ trước, nhóm Inline) và một ở
// `@blocksuite/affine-gfx-link/view` (nhóm 3 này). Theo đúng cách thượng nguồn giải va chạm
// (`affine/all/src/extensions/view.ts:29`), import cái sau với bí danh `GfxLinkViewExtension` —
// KHÔNG tự đặt tên khác: `thu-tu-view-extension.spec.ts` so định danh bằng VĂN BẢN, một bí danh
// khác khiến ca "mọi extension của dự án đều có thật ở thượng nguồn" đỏ.
//
// Phía STORE thì KHÔNG cắt: `getInternalStoreExtensions()` trong mo-doc.ts vẫn nạp nguyên
// bộ schema của mọi loại block, kể cả những loại không có view ở đây. Nghĩa là một tài liệu chứa
// block lạ vẫn nạp được vào store mà không vỡ, chỉ là không có gì vẽ nó ra. Cắt phía store là
// việc riêng, chưa làm.
//
// Đo được ở lần dựng ngày 2026-08-12 (npm run build, cùng một máy, chỉ đổi mảng dưới đây):
//   - đầy đủ 58 extension: chunk bảng 6.368,52 kB → 1.703,89 kB gzip, tổng 309 file .js trong dist/
//     (phần bỏ đi kéo theo Shiki với ~300 chunk ngôn ngữ, KaTeX, pdfmake, mammoth).
//   - cắt gọn 22 extension: chunk bảng 4.031,25 kB → 993,69 kB gzip, tổng 6 file .js.
// Tức còn ~58% dung lượng gzip và 6/309 số file. Vỏ app không đổi ở cả hai: 332,01 kB gzip.
//
// TemplateViewExtension thêm 2026-08-21 (23 extension) — số đo lại ở commit thêm nó, xem
// `git log -p -- src/board/extensions.ts` nếu cần con số chính xác thời điểm đó; ĐỪNG tin hai
// con số "22"/"cắt gọn" ở trên nữa cho mục đích đo dung lượng, chúng chỉ còn giá trị lịch sử.
//
// Nhóm 1 page mode thêm 2026-09-04, Task 10 (43 extension, xem đoạn giải thích ở trên) — đo lại ở
// `npm run build` của chính lượt này. HÌNH DẠNG DUNG LƯỢNG ĐÃ ĐỔI so với mọi lần đo trước: từ
// Task 9 có HAI điểm vào nạp chậm (EdgelessBoard.tsx và TrangBaiViet.tsx, cùng import
// `extensions.ts`), Rolldown tách phần DÙNG CHUNG ra một chunk riêng thay vì gộp hết vào một
// "chunk bảng" duy nhất như trước:
//   - `extensions-*.js` (mã chung — toàn bộ view extension + phụ thuộc vendor): 3.900,74 kB →
//     930,81 kB gzip. Đây là chunk mang GẦN NHƯ TOÀN BỘ tải trọng BlockSuite, đặt tên trùng file
//     này vì Rolldown tự chọn theo module chung lớn nhất — dùng số này làm "chunk soạn thảo" để so
//     ngưỡng.
//   - `extensions-*.css` đi kèm (theme vendor + ghi đè thương hiệu, dùng chung cả hai điểm vào):
//     90,60 kB → 14,41 kB gzip.
//   - Phần RIÊNG mỗi chế độ, nhỏ không đáng kể: `EdgelessBoard-*.js` 6,25 kB gzip (`TrangBaiViet-*.js`
//     chỉ 1,09 kB — trang không cần dong-bo-toa-do-viewport/viewport-ios/xep-o-tu-dong).
// Tổng đường mở EdgelessBoard (trường hợp nặng hơn): 930,81 + 14,41 + 6,25 ≈ 951,47 kB gzip.
// `mucMeta-*.js`/`theme-*.js`/`rolldown-runtime-*.js`/`gfx-*.js`/`preload-helper-*.js` KHÔNG tính
// vào đây dù hai entry điểm trên có nhắc tới — đã kiểm bằng `grep` thấy `index-*.js` (chunk VỎ APP)
// cũng import đúng các tên đó, tức chúng đã nằm trong 332,01 kB gzip của vỏ app, tải dù không mở
// bảng, không phải chi phí RIÊNG của việc mở bảng.
// Ngưỡng dừng §0 luật 6 của kế hoạch là 1.400 kB gzip — còn cách ~448,5 kB dù tính theo cách rộng
// rãi nhất (951,47 kB).
//
// Nhóm 2 page mode thêm 2026-09-04, Task 11 (47 extension, xem đoạn giải thích ở trên) — đo lại ở
// `npm run build` của chính lượt này, cùng máy, cùng cách tách chunk của Task 10:
//   - `extensions-*.js` (mã chung): 4.023,91 kB → **957,87 kB gzip** (Task 10: 930,81 kB gzip, +27,06
//     kB cho bốn extension Table/Callout/Outline/DataView).
//   - `extensions-*.css` đi kèm: 96,94 kB → 15,61 kB gzip (Task 10: 14,41 kB gzip, +1,20 kB).
//   - `EdgelessBoard-*.js`: 6,24 kB gzip (Task 10: 6,25 kB — không đổi đáng kể).
//   - `TrangBaiViet-*.js`: 1,09 kB gzip (Task 10: 1,09 kB — không đổi).
// Tổng đường mở nặng nhất (EdgelessBoard): 957,87 + 15,61 + 6,24 ≈ **979,72 kB gzip**. Ngưỡng dừng
// vẫn 1.400 kB gzip — còn cách ~420,3 kB, KHÔNG vượt ngưỡng.
//
// Nhóm 3 page mode thêm 2026-09-04, Task 12 (52 extension, xem đoạn giải thích ở trên) — đo lại ở
// `npm run build` của chính lượt này, cùng máy, cùng cách tách chunk. Đây là nhóm NẶNG NHẤT trong
// bốn nhóm, đúng như brief cảnh báo (Embed kéo theo hàng chục khối nhúng: Figma, GitHub, HTML,
// iframe, Loom, YouTube, synced-doc...):
//   - `extensions-*.js` (mã chung): 4.547,34 kB → **1.145,31 kB gzip** (Task 11: 957,87 kB gzip,
//     +187,44 kB cho LinkedDoc/Bookmark/Embed/EmbedDoc/GfxLink — bước nhảy lớn nhất trong ba nhóm
//     đã bật, khớp cảnh báo của brief).
//   - `extensions-*.css` đi kèm: 96,94 kB → 15,61 kB gzip — KHÔNG đổi so với Task 11. CSS của các
//     component Embed/Bookmark/LinkedDoc là style Lit `css\`...\`` nằm trong bản thân lớp (đi vào
//     chunk JS), không tách ra file .css riêng như theme vendor/vanilla-extract.
//   - `EdgelessBoard-*.js`: 6,25 kB gzip (Task 11: 6,24 kB — không đổi đáng kể).
//   - `TrangBaiViet-*.js`: 1,09 kB gzip (Task 11: 1,09 kB — không đổi).
// Tổng đường mở nặng nhất (EdgelessBoard): 1.145,31 + 15,61 + 6,25 ≈ **1.167,17 kB gzip**. Ngưỡng
// dừng vẫn 1.400 kB gzip — còn cách ~232,83 kB, KHÔNG vượt ngưỡng nhưng biên độ đã hẹp lại đáng kể
// (từ ~420,3 kB xuống ~232,83 kB chỉ sau một nhóm) — nhóm 4 (Task 13) nên đo cẩn thận, khả năng
// chạm ngưỡng không còn xa như trước.
//
// VA CHẠM TÊN `LinkViewExtension`: thượng nguồn có hai extension trùng tên lớp (inline link và gfx
// link) — dự án import cái sau với bí danh `GfxLinkViewExtension`, ĐÚNG NHƯ thượng nguồn tự đặt ở
// `affine/all/src/extensions/view.ts:29`, để `thu-tu-view-extension.spec.ts` (so định danh bằng
// văn bản) không đỏ vì bí danh lệch.
//
// KaTeX/DOMPurify KHÔNG bị kéo theo bởi Task 12 dù Embed cũng có mã render đồng bộ ở cấp module tại
// một vài nơi (`embed-html-fullscreen-toolbar` dùng `unsafeHTML` cho HTML người dùng nhúng, khác
// hẳn `sanitizeHTML()`/KaTeX của Latex) — bộ test đầy đủ (754 ca, xem log Step 5) chạy trọn một lượt
// không timeout, không cần tách lượt như Latex ở trên.
//
// Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai trong
// `affine/all/src/extensions/view.ts`.
import { AttachmentViewExtension } from '@blocksuite/affine-block-attachment/view'
import { BookmarkViewExtension } from '@blocksuite/affine-block-bookmark/view'
import { CalloutViewExtension } from '@blocksuite/affine-block-callout/view'
import { CodeBlockViewExtension } from '@blocksuite/affine-block-code/view'
import { DataViewViewExtension } from '@blocksuite/affine-block-data-view/view'
import { DatabaseViewExtension } from '@blocksuite/affine-block-database/view'
import { DividerViewExtension } from '@blocksuite/affine-block-divider/view'
import { EdgelessTextViewExtension } from '@blocksuite/affine-block-edgeless-text/view'
import { EmbedViewExtension } from '@blocksuite/affine-block-embed/view'
import { EmbedDocViewExtension } from '@blocksuite/affine-block-embed-doc/view'
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ImageViewExtension } from '@blocksuite/affine-block-image/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { SurfaceRefViewExtension } from '@blocksuite/affine-block-surface-ref/view'
import { TableViewExtension } from '@blocksuite/affine-block-table/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { DocTitleViewExtension } from '@blocksuite/affine-fragment-doc-title/view'
import { OutlineViewExtension } from '@blocksuite/affine-fragment-outline/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { LinkViewExtension as GfxLinkViewExtension } from '@blocksuite/affine-gfx-link/view'
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
import { KeyboardToolbarViewExtension } from '@blocksuite/affine-widget-keyboard-toolbar/view'
import { LinkedDocViewExtension } from '@blocksuite/affine-widget-linked-doc/view'
import { PageDraggingAreaViewExtension } from '@blocksuite/affine-widget-page-dragging-area/view'
import { ScrollAnchoringViewExtension } from '@blocksuite/affine-widget-scroll-anchoring/view'
import { SlashMenuViewExtension } from '@blocksuite/affine-widget-slash-menu/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader'

import { cheDoEdgeless, cheDoTrang } from './che-do-co-dinh'
import { phongChuBangExtension } from './phong-chu-bang'

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
  GfxLinkViewExtension,

  AttachmentViewExtension,
  BookmarkViewExtension,
  CalloutViewExtension,
  CodeBlockViewExtension,
  DataViewViewExtension,
  DatabaseViewExtension,
  DividerViewExtension,
  EdgelessTextViewExtension,
  EmbedViewExtension,
  EmbedDocViewExtension,
  FrameViewExtension,
  ImageViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceRefViewExtension,
  TableViewExtension,
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
  KeyboardToolbarViewExtension,
  LinkedDocViewExtension,
  ScrollAnchoringViewExtension,
  SlashMenuViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  PageDraggingAreaViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,

  DocTitleViewExtension,
  OutlineViewExtension,
]

const viewManager = new ViewExtensionManager(viewExtensions)

/**
 * Bộ extension cho chế độ edgeless, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Có hàm này vì `xuatAnhBang.ts` cũng cần mount một cây Lit (bảng ngầm để xuất PNG) và KHÔNG được
 * phép tự dựng một `ViewExtensionManager` thứ hai: `.get('edgeless')` chạy chuỗi
 * `ViewExtensionProvider.setup() → effect() → effects()`, tức là `customElements.define(...)` cho
 * toàn bộ thẻ Lit — gọi lần hai trên cùng tên thẻ là `NotSupportedError` ném thẳng ra, hỏng cả
 * bảng vẽ lẫn lượt xuất. Xuất một hàm rẻ hơn xuất chính `viewManager` (bên ngoài không cần biết
 * manager tồn tại, chỉ cần đúng mảng extension).
 *
 * `cheDoEdgeless` nối vào CUỐI, sau mọi view extension: nó `di.override` `DocModeProvider` mà
 * `FoundationViewExtension` (phần tử đầu mảng) vừa đăng ký. Không có nó thì `getEditorMode()` trả
 * `null` và TOÀN BỘ thanh công cụ phần tử tắt câm — xem ./che-do-co-dinh.ts để biết chuỗi nhân quả
 * đầy đủ. Đặt trong hàm dùng chung này để mọi đường mount cây Lit đều nhận đúng một bộ.
 *
 * `phongChuBangExtension` cùng lớp lý do: `FoundationViewExtension` chỉ đăng ký cấu hình phông KHI
 * được truyền `options.fontConfig`, mà ta gọi `.get('edgeless')` không kèm options — nên không có
 * FontFace nào mang tên họ `blocksuite:surface:*` và MỌI ô chọn phông/kiểu chữ mở ra đều rỗng. Xem
 * ./phong-chu-bang.ts.
 */
export function layExtensionsEdgeless() {
  return [...viewManager.get('edgeless'), cheDoEdgeless, phongChuBangExtension]
}

/**
 * Bộ extension cho CHẾ ĐỘ TRANG, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Phải dùng chung manager với `layExtensionsEdgeless()`, không được dựng manager thứ hai: `.get()`
 * chạy chuỗi `ViewExtensionProvider.setup() → effect() → effects()`, tức `customElements.define(...)`
 * cho toàn bộ thẻ Lit — lý do đầy đủ đã ghi ở JSDoc của `layExtensionsEdgeless` ngay trên.
 *
 * `cheDoTrang` nối vào CUỐI vì `di.override` chỉ thay được một hiện thực ĐÃ đăng ký, mà
 * `DocModeService` gốc do `FoundationViewExtension` (phần tử đầu mảng) đăng ký.
 *
 * `phongChuBangExtension` giữ nguyên như edgeless: `FoundationViewExtension` chỉ đăng ký cấu hình
 * phông KHI được truyền `options.fontConfig`, mà ta gọi `.get()` không kèm options.
 */
export function layExtensionsTrang() {
  return [...viewManager.get('page'), cheDoTrang, phongChuBangExtension]
}
