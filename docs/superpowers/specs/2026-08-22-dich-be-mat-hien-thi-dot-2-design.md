# Spec — Dịch bề mặt hiển thị, đợt 2 (loại trừ 10 extension mới mục 20)

Ngày: 2026-08-22. Track P1 vendor/dịch (không thuộc MindmapScreen).

## 1. Bối cảnh

HANDOFF.md mục 10/12 cảnh báo số đo cũ (899 chuỗi tới `dist/`, đo 2026-08-15) đã lỗi thời từ khi
mục 20 bật thêm 10 extension (Database, SlashMenu, DragHandle, 7 inline) — tập hợp "chuỗi nào tới
được `dist/`" đã đổi. Chặng này **đo lại từ đầu** (đúng yêu cầu "test lại có sót" của chủ dự án),
rồi dịch phần còn thiếu — **loại trừ nội dung của 10 extension mới** (đã có khoản nợ riêng, ngoài
phạm vi ở mục 20, chưa muốn đụng).

## 2. Phương pháp đo (để không mất lại như hai lượt trước — mục 11: "một lượt đo sớm hơn... nay đã mất")

Script `scratch-do-lai-chuoi.mjs` (đã chạy, đã xoá — thuật toán chép lại đây để tái lập được):

1. Quét **`src/vendor/blocksuite/**/*.ts`** (nguồn TS GỐC, TRƯỚC dịch — không phải `.vendor-build/`
   đã bị `dichchuoi:vendor` ghi đè, đó là lỗi lượt đo đầu tiên của chặng này: quét cây đã dịch lẫn
   luôn các giá trị tiếng Việt ĐÃ SHIP vào tập "ứng viên chưa dịch").
2. Với mỗi file, `ts.createSourceFile(..., ScriptKind.TS)`, duyệt AST tìm
   `StringLiteral`/`NoSubstitutionTemplateLiteral` mà `viTriHienThi(node)` (từ
   `scripts/luat-vi-tri-dich.mjs` — ĐÚNG luật D12 đang dùng để dịch, không tự chế luật khác) trả về
   khác `null`, và văn bản đó **chưa có khoá** trong `src/board/vi.json`.
3. Gộp theo GÓI (`docGocGoi`/`goiCuaDuongDan` của `scripts/tim-ban-dich-vendor.mjs` — cùng cách quy
   gói mà D12 dùng ở mọi nơi khác).
4. Loại trừ mọi ứng viên mà **mọi gói chứa nó** đều nằm trong tập 12 gói của mục "3. Loại trừ" dưới
   đây (ứng viên xuất hiện ở CẢ gói cũ lẫn gói mới thì GIỮ LẠI — nó đã tới tay người dùng qua đường
   cũ rồi, không phải riêng qua extension mới).
5. Với phần còn lại, kiểm từng chuỗi có tới được `dist/` không bằng `coNhuLiteral` (từ
   `scripts/so-khop-ban-dich.mjs` — ĐÚNG phép so khớp luật C dùng để đo bản dịch đã ship, ba kiểu
   nháy, không phải `includes` thô).

Build dùng để đo: `main` tại `51a6dc9` (sau khi vá `manifest.json`), `npm run dung:vendor` +
`npm run build` chạy lại trực tiếp trong phiên này (2026-08-22), không tin số cũ.

## 3. Loại trừ — 12 gói thuộc "10 extension mới mục 20"

```
affine/blocks/database      affine/data-view (**)   affine/widgets/slash-menu
affine/widgets/drag-handle  affine/inlines/comment  affine/inlines/footnote
affine/inlines/latex        affine/inlines/link     affine/inlines/mention
affine/inlines/preset       affine/inlines/reference
```

(**) `affine/data-view` KHÔNG map trực tiếp 1-1 với 10 extension liệt kê ở mục 20, nhưng
`package.json` của nó ghi `"description": "Views of database in affine"` — đây là ENGINE thật đứng
sau `DatabaseViewExtension` (`@blocksuite/affine-block-database/view` chỉ là wrapper mỏng). Không
loại gói này thì 37 chuỗi thuộc bảng Database (toán tử so sánh, tên đơn vị tiền tệ…) sẽ lẫn vào
danh sách "cần dịch ngay" — sai, vì chúng chỉ tới được `dist/` NHỜ Database vừa bật, đúng loại nợ
mục 20 đã tách riêng.

**Quy tắc loại trừ:** một ứng viên bị loại chỉ khi **MỌI gói chứa nó** nằm trong danh sách 12 gói
trên. Ứng viên xuất hiện đồng thời ở một gói cũ (đã bật từ trước mục 20) thì vẫn giữ trong phạm vi
chặng này.

## 4. Kết quả đo (2026-08-22)

| | Số |
|---|---|
| Tổng ứng viên chưa dịch (mọi gói, kể cả 12 gói loại trừ) | 162 |
| Thuộc riêng 12 gói loại trừ (bỏ khỏi chặng này) | 60 |
| **Còn lại, thuộc phạm vi chặng này** | **102** |
| — tới được `dist/` ngay bây giờ (dịch NGAY, có ích) | **38** |
| — KHÔNG tới `dist/` (gói khác chưa bật `extensions.ts`, hoãn — theo đúng quyết định 1+2 của chủ dự án ở mục 11: không có danh sách miễn, chỉ hoãn tới khi tính năng bật) | 64 |

**Phạm vi chặng này: dịch đúng 38 chuỗi dưới đây.** Không thêm ứng viên nào trong 64 chuỗi "chưa
tới dist" — bật tính năng trước rồi mới dịch, đúng nguyên tắc đã chốt ở mục 11.

### 38 chuỗi — danh sách phẳng, không trùng (dùng bản này khi soạn `vi.json`)

```
1, 2, 3, aaa, Align center, Align left, Align right, Attachment, Card view,
Copied image to clipboard, Create Linked Doc, Docx, Download,
Download in progress..., Downloading image..., Drag/Click to insert Text block,
Edgeless, Embed view, Enter Full Screen, Equation, Exit Full Screen,
Failed to download image!, Failed to read image size, please try another image,
Figma, Headings in the 4th font size., Headings in the 5th font size.,
Headings in the 6th font size., Html, HTML, Inline view, loom, Markdown, More,
OneNote, PlainText, Thickness, YouTube Video, Zip
```

Phân bố theo gói (một chuỗi có thể thuộc nhiều gói, không cộng dồn được thành 38):
`affine/blocks/image` (9), `affine/blocks/embed` (7), `affine/blocks/attachment` (5),
`affine/shared` (5), `affine/all` (4 — gồm cả 4 mục nghi nhiễu ở §5), `affine/blocks/bookmark` (3),
`affine/blocks/embed-doc` (3), `affine/inlines/link` (3), `affine/inlines/reference` (3),
`affine/fragments/adapter-panel` (3), `affine/rich-text` (3), `affine/blocks/frame` (2),
`affine/blocks/code`/`root`/`latex`/`surface-ref`/`components`/`gfx/note` (1 mỗi gói).

## 5. Nhiễu đã biết — cần quyết định trước khi dịch (không tự suy diễn)

Đúng cảnh báo mục 11 ("bề mặt 1.205 có lẫn thứ rõ ràng không phải chữ hiển thị"), 4 mục sau đáng
ngờ:

- **`"1"`, `"2"`, `"3"`** (gói `affine/all`) — rất có thể là placeholder/số thứ tự, không phải câu
  chữ cần dịch nghĩa. Số Ả Rập giống nhau ở mọi ngôn ngữ — có thể **giữ nguyên, không cần thêm khoá
  dịch**, nhưng PHẢI xác nhận ngữ cảnh thật (đọc đúng dòng nguồn) trước khi bỏ qua, đừng đoán.
- **`"aaa"`** — rất giống giá trị placeholder/test của thượng nguồn, không phải chữ hiển thị cho
  người dùng cuối thật. Cần đọc đúng dòng nguồn trước khi quyết định dịch hay bỏ qua.

**Việc của Task 1 trong kế hoạch:** đọc đúng ngữ cảnh nguồn (file + dòng) của 4 mục này, quyết
định "dịch" hay "bỏ qua có ghi chú" — **không đoán, không tự ý loại khỏi vi.json mà không ghi lý
do**, đúng tinh thần "không có danh sách miễn ngầm" đã chốt ở mục 11.

## 6. Bảng thuật ngữ — tái dùng, không bịa lại

Không tạo bảng thuật ngữ mới từ đầu. Tái dùng cách dịch đã chốt ở các khoá tương tự đã ship (mục 14
P1-E, mục 16 Images/MindMap) làm chuẩn nhất quán:

- Cụm điều khiển hiển thị ("Align left/center/right", "Enter/Exit Full Screen") → dịch theo đúng
  văn phong ngắn gọn, mệnh lệnh, đã dùng cho các tooltip khác đang ship (đối chiếu `vi.json` hiện
  tại để khớp giọng văn).
- Tên riêng thương hiệu (Figma, loom, YouTube Video, OneNote, Docx/Html/Markdown/Zip/PlainText) —
  **KHÔNG dịch nghĩa**, giữ nguyên tên riêng/định dạng file.
- Thông báo lỗi/tiến trình (Download/Downloading/Failed to.../Copied...) → khớp văn phong đã dùng
  ở các thông báo khác trong app (xem `src/lib`, `DungThuocScreen`).

## 7. Cơ chế — không đổi gì

Dùng NGUYÊN pipeline D12 hiện có: thêm khoá vào `src/board/vi.json`, chạy `npm run dung:vendor` (áp
Cổng 3 — mỗi khoá phải dịch được ở đâu đó), `npm run build` + `kiem:dist` (luật C — mỗi bản dịch
phải có mặt trong `dist/`, cấm hai khoá trùng giá trị). KHÔNG sửa script nào trong `scripts/`.

## 8. Tiêu chí xong

- `src/board/vi.json` có thêm đúng các khoá cho 38 chuỗi (trừ những mục quyết định bỏ qua có ghi
  chú lý do ở Task 1 — ví dụ "1"/"2"/"3"/"aaa" nếu xác nhận là nhiễu).
- Cả bảy cổng xanh: `tsc`, `npm test`, `kiem:vendor`, `kiem:vendor-paths`, `build`, `kiem:dist`
  (`bản dịch vi.json — N/N có mặt`, N = 150 cũ + số khoá mới thêm).
- `timTrungBanDich` (cổng cấm hai khoá trùng giá trị, đã có từ P1-D) không báo trùng.
- Kiểm tay tối thiểu trên trình duyệt thật (dev server): mở bảng vẽ, chèn ảnh/attachment/embed, xem
  toolbar align/download/embed đã tiếng Việt, không còn tiếng Anh ở các vị trí đã dịch.

## 9. Ngoài phạm vi

- 64 chuỗi chưa tới `dist/` (gói chưa bật) — KHÔNG thêm khoá, đúng chính sách "không danh sách
  miễn" của mục 11.
- Toàn bộ nội dung dịch cho 10 extension mới mục 20 (Database/SlashMenu/DragHandle/7 inline) —
  chặng riêng, đã ghi nợ ở mục 20, KHÔNG đụng ở đây.
- `src/data/antibiotics.ts` — chủ dự án tự sửa.
