# Thiết kế: gỡ nút thắt tự tham chiếu `Images`/`MindMap` trong `FileTypes`

Ngày: **2026-08-17**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch.

Track: **MindmapScreen** — không thuộc chặng P1 (vendor/dịch nội dung) nào đã có số hiệu riêng, vì
đây là công việc thuộc lớp **cơ chế D12** (an toàn cho việc dịch), không phải lớp **nội dung dịch**.
Phát hiện gốc nằm ở kế hoạch P1-E
(`docs/superpowers/plans/2026-08-15-noi-dung-dich.md`, mục "Global Constraints" và "Bốn khoá bị
loại") và được nhắc lại làm một trong ba hướng "chặng kế tiếp" ở `HANDOFF.md` mục 14.

---

## 1. Vấn đề — một chuỗi vừa là nhãn hiển thị vừa là khoá tra cứu

`affine/shared/src/utils/file/filesys.ts` (vendored, D11, cấm sửa trực tiếp) khai mảng `FileTypes`:

```ts
const FileTypes = [
  { description: 'Images', accept: { 'image/*': [...] } },
  { description: 'Videos', accept: { 'video/*': [...] } },
  { description: 'Audios', accept: { 'audio/*': [...] } },
  { description: 'Markdown', accept: { 'text/markdown': [...] } },
  { description: 'Html', accept: { 'text/html': [...] } },
  { description: 'Zip', accept: { 'application/zip': [...] } },
  { description: 'Docx', accept: { '...wordprocessingml...': [...] } },
  { description: 'OneNote', accept: { 'application/onenote': [...] } },
  { description: 'MindMap', accept: { 'text/xml': [...] } },
]
```

`description` đóng hai vai không liên quan tới nhau:

1. **Nhãn hiển thị** — được truyền vào `window.showOpenFilePicker({ types: [fileType] })`, trình
   duyệt Chromium desktop hiện nó trong ô lọc kiểu tệp của hộp thoại mở tệp gốc hệ điều hành.
2. **Khoá tra cứu** — hai chỗ trong CHÍNH file này (`openFilesWith`, cả nhánh File System Access API
   lẫn nhánh `<input type=file>` dự phòng) đọc lại nó để tìm đúng mục:
   `FileTypes.find(i => i.description === acceptType)`.

Người gọi truyền `acceptType` bằng **chuỗi tiếng Anh viết chết trong mã nguồn**, không phải biến:

- `openFilesWith('Images')` → `getImageFilesFromLocal()` (cùng file, `filesys.ts:454`)
- `openSingleFileWith('MindMap')` → `importMindmap()`
  (`affine/gfx/mindmap/src/toolbar/utils/import-mindmap.ts:15`, gói **ĐANG BẬT** trong
  `src/board/extensions.ts`)

Cơ chế dịch D12 (`scripts/luat-vi-tri-dich.mjs`) cho phép dịch mọi giá trị ở vị trí cú pháp
`thuộc-tính:description` (`THUOC_TINH_HIEN_THI` có `description`) — **không phân biệt được** mục nào
trong `FileTypes` an toàn để dịch và mục nào không. Nếu ai đó thêm
`"MindMap": "Sơ đồ tư duy"` vào `src/board/vi.json`, D12 sẽ dịch ĐÚNG literal
`description: 'MindMap'`, khiến `.find(i => i.description === acceptType)` với `acceptType ===
'MindMap'` (vẫn tiếng Anh, vì đối số gọi hàm không nằm trong vị trí được dịch) không tìm thấy gì
nữa. Hệ quả đo được bằng cách đọc mã: `openFilesWith` ném `BlockSuiteError` ngay tại
`if (acceptType !== 'Any' && !fileType) throw ...`, `importMindmap` không bắt lỗi này nên nó nổ
thẳng lên UI — **hỏng tính năng nhập sơ đồ tư duy đang bật**, không phải một câu chữ xấu. `"Images"`
tương tự cho `getImageFilesFromLocal()`.

### 1.1 Đây KHÔNG phải rủi ro giả định — đã có bằng chứng cấu trúc

Đo trên `.vendor-build/affine/shared/src/utils/file/filesys.js` hiện tại (2026-08-17):

- Đúng **9 phần tử** trong `FileTypes`, đúng thứ tự `Images, Videos, Audios, Markdown, Html, Zip,
  Docx, OneNote, MindMap`.
- Đúng **2 lượt so sánh** `i.description === acceptType`, ở dòng **175** (nhánh File System Access
  API) và **205** (nhánh `<input type=file>` dự phòng) — TRÙNG với hai toạ độ đã ghim sẵn trong
  `scripts/kiem-quan-he-dich.mjs` (`BAN_KHAI_TIEU_THU`), tức Cổng 4 của D12 **đã biết** hai chỗ này
  đọc lại `description` làm dữ liệu, nhưng — theo đúng thiết kế của Cổng 4 — nó chỉ **báo lệch khi
  toạ độ đổi**, không phán xét khoá nào an toàn để dịch. Đây là lý do `"Images"`/`"MindMap"` hiện chỉ
  được giữ ngoài `vi.json` bằng **kỷ luật ghi chép** (kế hoạch P1-E, `HANDOFF.md`), không bằng cổng
  tự động — một người không đọc hai tài liệu đó hoàn toàn có thể thêm nhầm khoá.
- `"Videos"`/`"Audios"` **đã dịch** thành công (`vi.json` hiện có `"Videos": "Video"`,
  `"Audios": "Âm thanh"`) — chứng minh hai mục này không có caller nào tra cứu lại bằng chuỗi, đúng
  như kế hoạch P1-E đã đo.

---

## 2. Quyết định đã chốt với chủ dự án

**1. Vá cho cả 9 mục, đồng nhất — không phân biệt "2 mục đang kẹt" và "7 mục còn lại".** Không phải
vì 7 mục kia đang có rủi ro đo được, mà vì một cơ chế đồng nhất cho cả mảng rẻ hơn và bền hơn một cơ
chế lọc theo tên hai mục cụ thể: không cần danh sách tên hard-code có thể lệch nếu thượng nguồn đổi
chữ (`'MindMap'` → `'Mind Map'` chẳng hạn), và không tạo ra tình trạng 2 mục có cấu trúc khác 7 mục
còn lại trong cùng một mảng.

**2. Không sửa `FileTypes` — thêm một mảng định danh SONG SONG, tách rời.** Đã cân nhắc và loại bỏ
phương án thêm trường `id` vào từng object của `FileTypes` (xem §3 — phương án bị loại B). Lý do
loại: các object đó được truyền **nguyên vẹn** vào `window.showOpenFilePicker()`; dù nhiều khả năng
trình duyệt bỏ qua trường lạ trong dictionary (hành vi WebIDL tiêu chuẩn), dự án này đã trả giá nhiều
lần cho việc TIN một hành vi chưa đo (bài học #2 của `HANDOFF.md`) — không có lý do chấp nhận rủi ro
đó khi có phương án không đụng gì tới object được truyền ra ngoài.

**3. Không có danh sách miễn, không có cờ bật/tắt.** Nhất quán với quyết định 2 của P1-C. Cơ chế mới
áp dụng luôn, không có đường tắt.

---

## 3. Ba phương án đã xét

| | Cơ chế | Vì sao chọn / loại |
|---|---|---|
| **A — CHỌN** | Mảng `FILE_TYPE_IDS` song song, cùng thứ tự với `FileTypes`; `.find(...)` đổi thành tra chỉ số (`FileTypes[FILE_TYPE_IDS.indexOf(acceptType)]`) | Không đụng object truyền cho browser API; đổi tối thiểu (1 mảng mới + 2 biểu thức); tách bạch triệt để khỏi `THUOC_TINH_HIEN_THI` vì `FILE_TYPE_IDS` không phải thuộc tính của object nào cả |
| B — loại | Thêm `id: '...'` vào từng object trong `FileTypes`, đổi so sánh sang `i.id` | Rủi ro chưa đo: object đã sửa được truyền thẳng vào `showOpenFilePicker()`. Không có lý do chấp nhận rủi ro không cần thiết khi phương án A không có rủi ro này |
| C — loại | Đổi các CALL SITE (`openFilesWith('Images')` v.v.) sang một tập hằng số riêng biệt hoàn toàn khỏi `AcceptTypes`, việc so khớp giữ nguyên `.description` | Phải sửa NHIỀU điểm gọi rải trong nhiều gói (`filesys.ts` lẫn `import-mindmap.ts`, và bất kỳ caller tương lai nào) thay vì một điểm; mỗi caller mới lại là một cơ hội quên áp dụng — vi phạm chính triết lý "một chỗ, hỏng thì đóng" mà D11/D12 đang theo |

---

## 4. Kiến trúc

| File | Trạng thái | Việc |
|---|---|---|
| `scripts/tach-dinh-danh-loai-tep.mjs` | **mới** | Hàm thuần `tachDinhDanhLoaiTep(js, tenFile)` (đọc/ghi do người gọi lo) + khối `if (import.meta.url === ...)` đọc/ghi đúng MỘT file cố định khi chạy trực tiếp. Không quét cây — đường dẫn đích cố định (`affine/shared/src/utils/file/filesys.js`), biết trước, không cần tổng quát hoá. |
| `scripts/tach-dinh-danh-loai-tep.d.mts` | **mới** | Khai kiểu, theo đúng khuôn `luat-vi-tri-dich.d.mts`. |
| `scripts/dung-vendor.mjs` | sửa | Thêm **Bước 4a**, giữa Bước 4 (đổi tên) và Bước 4b (dịch chuỗi) hiện tại. Đánh số lại comment "Bước 4b" thành "Bước 4c" cho khỏi trùng. |
| `scripts/kiem-quan-he-dich.mjs` | sửa | `BAN_KHAI_TIEU_THU`: bỏ hai mục `filesys.js:175`/`:205`, còn lại 2 mục (`utils.js`, `dropdown-menu.js`). Thêm ghi chú giải thích vì sao rụng — trỏ về spec này. |
| `src/__tests__/vendor-quan-he-dich.spec.ts` | sửa | Cập nhật khối `toEqual` của "BAN_KHAI_TIEU_THU — bản khai được ghim" theo đúng 2 mục còn lại; sửa tiêu đề "đúng 4 mục" → "đúng 2 mục". |
| `src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts` | **mới** | Ca kiểm module thuần, xem §6. |
| `src/board/vi.json` | sửa | Thêm 2 khoá (§5). |

### 4.1 Hợp đồng của `tachDinhDanhLoaiTep`

```
tachDinhDanhLoaiTep(js: string, tenFile?: string): { js: string; danhSachId: string[] }
```

Các bước, MỖI bước sai đều `throw` (fail-closed, không bỏ qua im lặng — đúng khuôn
`dichMotFile`/`thayTrenToanCay` của `luat-vi-tri-dich.mjs`):

1. Parse `js` bằng `ts.createSourceFile`; kiểm `parseDiagnostics` rỗng như hai hàm kia — lỗi cú pháp
   thì DỪNG, không đoán.
2. Tìm CHÍNH XÁC MỘT khai báo `const FileTypes = [...]` (một `VariableDeclaration` tên `FileTypes`
   có initializer là `ArrayLiteralExpression`). Không thấy, hoặc thấy nhiều hơn một → `throw`.
3. Với mỗi phần tử của mảng: phải là `ObjectLiteralExpression` có đúng một `PropertyAssignment` tên
   `description` với initializer là `StringLiteral`. Sai hình dạng ở BẤT KỲ phần tử nào → `throw`
   (không bỏ qua phần tử lỗi rồi xử tiếp phần còn lại — một phần tử lạ là tín hiệu thượng nguồn đã
   đổi cấu trúc, cần người đọc).
4. Khẳng định số phần tử đúng **9** và danh sách `description` đo được **khớp y hệt, đúng thứ tự**:
   `['Images', 'Videos', 'Audios', 'Markdown', 'Html', 'Zip', 'Docx', 'OneNote', 'MindMap']`. Lệch ở
   bất kỳ đâu (thừa/thiếu/đổi thứ tự/đổi chữ) → `throw`, in rõ danh sách đo được so với kỳ vọng.
   Đây là **danh sách kỳ vọng cứng**, không phải suy ra rồi tự tin dùng — nếu thượng nguồn đổi, cổng
   phải đỏ và người sửa phải tự nhìn, không được lặng lẽ đổi theo.
5. Tìm CHÍNH XÁC HAI `CallExpression` dạng `FileTypes.find(<arrow nhận 1 tham số>)` mà thân hàm là
   `<tham số>.description === acceptType` (một `BinaryExpression` `===`, một vế là
   `PropertyAccessExpression` `.description` trên đúng tên tham số của arrow, vế kia là định danh
   `acceptType`). Không đúng hai lượt → `throw`.
6. Sinh `danhSachId` = đúng danh sách `description` đo được ở bước 4 (không hard-code lại — lấy từ
   phép đo, để không có hai nguồn sự thật lệch nhau).
7. **Quét TOÀN BỘ danh sách statement cấp module** (`sf.statements`) tìm bất kỳ `VariableStatement`
   nào đã khai một biến tên `FILE_TYPE_IDS` (hoặc một `FunctionDeclaration`/`ClassDeclaration` cùng
   tên — quét tên định danh ở CẢ BA hình dạng khai báo cấp module). Thấy → `throw`, in rõ dòng đã có
   tên đó. Đây là bước loại bỏ HẲN rủi ro trùng tên đã ghi ở §7 (rủi ro #2) — không còn "khó xảy ra,
   giảm nhẹ bằng đặt tên", mà là "không thể lọt qua mà không bị `throw`". Chạy bước này ĐỘC LẬP VỚI
   TÊN CỤ THỂ `FILE_TYPE_IDS`: nhận tên hằng số cần chèn làm tham số của hàm nội bộ, để nếu sau này
   đổi tên hằng số, phép quét vẫn đúng theo tên mới — không có hai nguồn sự thật cho "tên sắp chèn".
8. Dựng chuỗi mới: chèn `const FILE_TYPE_IDS = ${JSON.stringify(danhSachId)};` ngay sau dấu `;` kết
   thúc khai báo `FileTypes`; đổi cả hai `CallExpression` ở bước 5 thành
   `FileTypes[FILE_TYPE_IDS.indexOf(acceptType)]`. Thay từ CUỐI file về ĐẦU (như `dichMotFile`) để vị
   trí các lượt thay chưa xử lý không bị lệch.
9. Trả `{ js: <chuỗi mới>, danhSachId }`.

### 4.2 Vị trí trong `dung-vendor.mjs`

Chạy **sau Bước 4 (đổi tên)**, **trước Bước 4b hiện tại (dịch chuỗi)** — đặt tên "Bước 4a". Lý do thứ
tự: Cổng 4 của D12 (`kiem-quan-he-dich.mjs`, chạy bên trong bước dịch chuỗi) phải đo trên cây **ĐÃ
qua bước tách định danh**, để hai toạ độ `filesys.js:175`/`:205` không còn xuất hiện trong tập đo
được — khớp với `BAN_KHAI_TIEU_THU` đã cập nhật (§4, dòng `kiem-quan-he-dich.mjs`). Thứ tự với Bước 4
(đổi tên `affine-`→`drt-`) không quan trọng về mặt đúng/sai (không đụng cùng nội dung), nhưng đặt sau
nó để giữ đúng trực giác "dựng xong cây rồi mới vá cấu trúc cụ thể" như Bước 3 (chép package.json) đã
làm.

Không kiểm exit code kiểu "không có lý do sẵn có nào để thoát khác 0, thất bại là dừng" — giống mọi
bước khác từ Bước 4 trở đi trong `dung-vendor.mjs`.

### 4.3 Vì sao KHÔNG cần một cổng độc lập riêng như Cổng 4 của D12

`tachDinhDanhLoaiTep` tự đóng vai trò cổng của chính nó: mọi sai lệch cấu trúc đều `throw` ngay tại
chỗ chạy (Bước 4a), làm `dung:vendor` dừng cứng. Không cần một cổng ĐO LẠI độc lập kiểu Cổng 4 (đo
trên `.vendor-build/` rồi so với bản khai) vì không có "bản khai" nào tách rời khỏi chính phép biến
đổi — bước 4 và bước 6 của thuật toán ở §4.1 dùng CHUNG một phép đo (`description` đo được ở bước 4
chính là nguồn của `danhSachId` ở bước 6), nên không có chỗ cho hai nguồn lệch nhau kiểu "kịch bản tự
khai" mà P1-B lỗi #9 đã cảnh báo (cổng độc lập đọc lại lời tự khai của chính bộ thay).

---

## 5. Nội dung dịch — hai khoá mới

| Khoá tiếng Anh | Bản dịch | Vì sao chọn chữ này |
|---|---|---|
| `"Images"` | `"Hình ảnh"` | Chưa có bản dịch nào khác dùng — không trùng `"Shape"` → `"Hình"` đã có trong `vi.json`, không gây lẫn |
| `"MindMap"` | `"Bản đồ tư duy"` | **ĐÍNH CHÍNH (phát hiện lúc thi hành Task 3, 2026-08-18).** Bản gốc của mục này chọn `"Sơ đồ tư duy"` để khớp đúng bản dịch đã có sẵn của khoá khác cùng nghĩa (`"Mind Map": "Sơ đồ tư duy"`) — **SAI**, vì việc đó đụng thẳng cổng cấm trùng bản dịch của chặng P1-D (`scripts/kiem-dist.mjs`, hàm `timTrungBanDich`): hai khoá tiếng Anh khác nhau không được dịch ra cùng một chuỗi, vì luật C tìm bản dịch trong `dist/` theo GIÁ TRỊ — một trong hai còn sống là cả hai được tính "có mặt", mẫu số sai mà cổng vẫn xanh (đúng lớp lỗi P1-D §1.3). Đổi sang `"Bản đồ tư duy"` — đồng nghĩa hoàn toàn với "Sơ đồ tư duy" trong tiếng Việt (cả hai đều là cách dịch thông dụng của "mind map"), nhưng là chuỗi KHÁC nên không trùng |

Cả hai khoá đi qua đúng bộ cổng hiện có của `dich-chuoi-vendor.mjs` như mọi khoá khác — không cần cổng
riêng cho nội dung. **Trước khi thêm bất kỳ khoá mới nào vào `vi.json` ở các chặng sau, LUÔN kiểm
bản dịch dự định có trùng một giá trị đã có sẵn trong `vi.json` không** — bài học của chính mục này.

**Điều kiện tiên quyết trước khi thêm khoá `"Images"`:** phải đo lại bằng `kiem:dist` xem chỗ dịch
thật của `description: 'Images'` có tới `dist/` hay không — đúng quyết định 1 của P1-C ("gói chưa bật
→ từ chối, không danh sách miễn"). `affine/shared` là gói dùng chung nên gần như chắc chắn được bundle,
nhưng "gần như chắc chắn" không phải phép đo; việc này chuyển cho kế hoạch thi hành, không giả định
trước ở đây. Nếu đo ra KHÔNG tới `dist/`: chỉ thêm `"MindMap"`, ghi lại `"Images"` vào danh sách loại
trừ giống P1-E đã làm với 6 khoá khác.

---

## 6. Kiểm thử

### 6.1 Ca kiểm module thuần (`src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts`)

| # | Ca | Canh cái gì |
|---|---|---|
| 1 | Đầu vào đúng hình dạng (9 phần tử, đúng thứ tự) → trả `js` có `FILE_TYPE_IDS` đúng nội dung, đúng vị trí (ngay sau `FileTypes`) | đường cơ bản |
| 2 | Cả hai `.find(i => i.description === acceptType)` đổi thành `FileTypes[FILE_TYPE_IDS.indexOf(acceptType)]` | đúng phép thay, đúng cả hai chỗ |
| 3 | `js` đầu ra vẫn phân tích cú pháp được (`ts.createSourceFile` lại, `parseDiagnostics` rỗng) | không sinh ra mã vỡ |
| 4 | Thiếu một phần tử (chỉ 8) → `throw` | fail-closed khi số lượng lệch |
| 5 | Đổi thứ tự hai phần tử → `throw` | fail-closed khi thứ tự lệch — `indexOf` mà sai thứ tự là hỏng im lặng, phải bắt trước |
| 6 | Đổi chữ một `description` (`'MindMap'` → `'Mind Map'`) → `throw` | fail-closed khi thượng nguồn đổi chữ |
| 7 | Chỉ có 1 lượt `.find(...description...)` thay vì 2 → `throw` | fail-closed khi số điểm so sánh lệch |
| 8 | Có 3 lượt `.find(...description...)` (giả lập thượng nguồn thêm một chỗ mới) → `throw` | fail-closed theo hướng ngược lại |
| 9 | Chạy hàm HAI LẦN liên tiếp trên cùng input gốc → cả hai lượt cho kết quả giống hệt nhau (idempotent theo nghĩa đầu vào-đầu ra, KHÔNG chạy lần hai trên đầu ra của lần một — xem ghi chú Cổng sớm của D12, đây không phải ca "chạy lại trên cây đã vá") | không có trạng thái ẩn giữa hai lượt gọi |
| 10 | Input có sẵn `const FILE_TYPE_IDS = [1, 2, 3];` (khác nội dung, cùng tên) ở đâu đó TRƯỚC khai báo `FileTypes` → `throw`, thông báo nêu đúng dòng đã có tên đó | bước 7 mới (§4.1) — loại trừ rủi ro #2 ở §7, không chỉ giảm nhẹ bằng tên đặc thù |
| 11 | Input có `function FILE_TYPE_IDS() {}` (khai báo hàm trùng tên, không phải `const`) → `throw` | bước 7 phải quét CẢ BA hình dạng khai báo cấp module, không chỉ `VariableStatement` |

Mỗi ca phải thật sự đỏ trước khi có mã.

### 6.2 Bằng chứng đỏ ở mức pipeline

Chạy `npm run dung:vendor` đủ, xác nhận bằng `grep`:

```bash
grep -n "FILE_TYPE_IDS" .vendor-build/affine/shared/src/utils/file/filesys.js
grep -n "i.description === acceptType" .vendor-build/affine/shared/src/utils/file/filesys.js   # kỳ vọng: 0 kết quả, đã đổi hết
grep -n "FileTypes\[FILE_TYPE_IDS.indexOf(acceptType)\]" .vendor-build/affine/shared/src/utils/file/filesys.js   # kỳ vọng: 2 kết quả
```

### 6.3 Bằng chứng đỏ cho Cổng 4 đã cập nhật đúng

Trước khi sửa `BAN_KHAI_TIEU_THU`: chạy `npm run dichchuoi:vendor` trên cây đã qua Bước 4a — Cổng 4
phải **ĐỎ** (đo được 2 chỗ, bản khai cũ còn 4 chỗ, lệch). Chép lại thông báo đỏ này vào báo cáo task.
Sau khi sửa `BAN_KHAI_TIEU_THU` còn 2 mục: chạy lại, Cổng 4 phải **XANH**.

### 6.4 Kiểm tay trên trình duyệt thật — bắt buộc, không được bỏ qua

Đây là chỗ mọi cổng tự động đều mù (đúng bài học #2): không cổng nào ở D11/D12 mô phỏng được việc
trình duyệt THẬT SỰ mở hộp thoại file với `types` đã đổi.

1. Mở một board, dùng công cụ nhập sơ đồ tư duy từ file (`.mm`/`.opml`) trên thanh công cụ mindmap —
   thao tác **không được ném lỗi**, hộp thoại mở tệp phải xuất hiện, và (nếu trình duyệt hỗ trợ File
   System Access API) ô lọc kiểu tệp hiện đúng chữ tiếng Việt mới.
2. Nếu công cụ chèn ảnh từ máy cục bộ có trên UI đã bật, thử chèn ảnh qua nút toolbar (không phải
   kéo-thả) — thao tác **không được ném lỗi**.
3. Test trên ít nhất Chrome desktop (hỗ trợ File System Access API, nên đi qua nhánh có khả năng lộ
   rủi ro §2 nếu phương án B từng được chọn) — dù phương án A không đụng object truyền cho API, vẫn
   kiểm tay để xác nhận hành vi cuối cùng đúng, không chỉ tin lý luận.

Nếu MỘT trong hai thao tác không thể thực hiện được vì tính năng chưa bật trong `extensions.ts`, ghi
rõ lý do không kiểm được thay vì bỏ qua im lặng.

---

## 7. Rủi ro đã biết

- **`ts.createSourceFile` không tự sinh khoảng trắng đẹp khi chèn chuỗi bằng cắt/nối thủ công** — đầu
  ra sẽ không đẹp bằng mã do `tsc` sinh, nhưng đây là `.vendor-build/` (không ai đọc bằng mắt trong
  vận hành bình thường, không đi qua `git diff`), nên không phải vấn đề — đúng như `luat-vi-tri-dich.mjs`
  đã chấp nhận đánh đổi này từ trước.
- **~~Chèn `FILE_TYPE_IDS` là biến `const` cấp module — trùng tên với biến khác trong CHÍNH file đó~~
  — ĐÃ LOẠI TRỪ, không còn là rủi ro "giảm nhẹ", là bất khả thi có kiểm chứng.** Bước 7 mới ở §4.1
  quét toàn bộ khai báo cấp module trước khi chèn, `throw` ngay nếu trùng tên — không phụ thuộc vào
  việc "chọn tên đặc thù" nữa (dù vẫn giữ `FILE_TYPE_IDS` viết hoa toàn bộ cho dễ đọc, tách biệt khỏi
  style camelCase còn lại của file). Ca kiểm §6.1.10-11 ghim đúng hai hình dạng trùng tên (biến,
  hàm). **Lưu ý một điều đã xét rồi loại:** ca kiểm §6.1.3 (`parseDiagnostics` rỗng sau khi thay)
  KHÔNG phải lớp chặn dự phòng cho ca này — trùng khai báo `const`/`let` trong cùng scope là lỗi ngữ
  nghĩa sớm ("early error") của JS, đòi hỏi phân tích ràng buộc (binder), mà `ts.createSourceFile` +
  `parseDiagnostics` chỉ làm phân tích CÚ PHÁP thuần (đúng lý do file gốc `luat-vi-tri-dich.mjs` chọn
  API này, không phải `ts.createProgram`) — nên nó sẽ KHÔNG phát hiện trùng tên. Bước 7 là lớp chặn
  DUY NHẤT cho ca này ở tầng `tach-dinh-danh-loai-tep.mjs`; nếu lọt qua, lỗi vẫn sẽ nổ sau đó ở
  `npm run dev`/`npm run build` (Vite/esbuild parse thật, có kiểm ràng buộc), nhưng muộn hơn nhiều và
  thông báo lỗi không trỏ thẳng vào nguyên nhân.
- **Nếu về sau có caller thứ ba gọi `FileTypes.find(...)` bằng một biểu thức KHÁC hình dạng** (ví dụ
  gọi qua biến trung gian, hoặc destructure `description` ra trước rồi so sánh) — bước 5 của §4.1 sẽ
  không nhận diện được và số lượt đo được sẽ khác 2, khiến toàn bộ bước 4a `throw`. Đây là hành vi
  ĐÚNG mong muốn (fail-closed), không phải lỗ hổng: pipeline dừng, người sửa phải tự nhìn.

---

## 8. Ngoài phạm vi

- **Không đụng `src/vendor/blocksuite/affine/shared/src/utils/file/filesys.ts`** — vẫn nguyên văn,
  D11 không đổi. Mọi thay đổi nằm ở `.vendor-build/` (sinh lại mỗi lượt `dung:vendor`) và ở
  `scripts/`.
- **Không mở rộng cơ chế này cho các mối nối tự tham chiếu khác** (nếu có) ngoài `FileTypes` —
  `Cổng 4` vẫn là lớp phát hiện chung cho những mối nối chưa biết; đây chỉ giải quyết đúng một mối
  nối đã đo.
- **Không đụng `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự sửa.
- **Không dịch thêm khoá nào khác ngoài `"Images"`/`"MindMap"`** (đợt dịch 162 chuỗi nhóm
  `affine/data-view` là một hướng "chặng kế tiếp" khác, chưa được chọn — xem `HANDOFF.md` mục 14).

---

## 9. Tiêu chí xong

1. `scripts/tach-dinh-danh-loai-tep.mjs` + khai kiểu + 11 ca kiểm ở §6.1, mỗi ca có bằng chứng đỏ đã
   thật sự chạy và thật sự đỏ trước khi có mã.
2. Bước 4a chạy trong `scripts/dung-vendor.mjs`, đúng vị trí (sau đổi tên, trước dịch chuỗi), thất
   bại thì dừng pipeline.
3. `scripts/kiem-quan-he-dich.mjs` (`BAN_KHAI_TIEU_THU`) và
   `src/__tests__/vendor-quan-he-dich.spec.ts` đã cập nhật khớp nhau, còn đúng 2 mục.
4. Bằng chứng đỏ ở §6.3 đã chạy đủ hai lượt (đỏ trước khi sửa bản khai, xanh sau khi sửa), chép
   nguyên văn vào báo cáo task.
5. `src/board/vi.json` có thêm `"MindMap": "Sơ đồ tư duy"`, và `"Images": "Hình ảnh"` **nếu** đo
   `kiem:dist` xác nhận gói `affine/shared` tới được `dist/` (§5) — nếu không, ghi rõ lý do loại trừ
   theo đúng khuôn P1-E.
6. Kiểm tay trên trình duyệt thật theo §6.4, chép lại kết quả (kể cả ảnh chụp màn hình nếu có).
7. **Bảy cổng xanh**: `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
   `kiem:vendor-build` · `build` · `kiem:dist`.
8. `kiem:dist` báo đúng số khoá mới (129 hoặc 130 tuỳ kết quả §5, cộng 1 hoặc 2 so với 129 hiện tại)
   — không tự tin ghi số trước khi đo thật.
