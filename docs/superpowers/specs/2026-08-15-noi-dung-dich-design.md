# Thiết kế: nội dung dịch, đợt đầu (chặng P1-E)

Ngày: **2026-08-15**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch.

Chặng trước: `2026-08-15-siet-so-khop-ban-dich-design.md` (siết phép so khớp bản dịch, đã thi hành
xong và đã gộp ở `9ce6955`).

Đây là chặng **đầu tiên thật sự thêm khoá dịch**. Bốn chặng trước (P1-A…P1-D) chỉ dựng và siết cơ
chế; `src/board/vi.json` vẫn đúng 5 khoá suốt từ đầu.

---

## 1. Hai con số bắt buộc phải đo lại — đã đo

`HANDOFF.md` mục 10 và mục 13 đều dặn: trước khi thêm khoá đầu tiên phải **đo lại cả số chuỗi lẫn
số từ lặp**, và cấm đổi "323 → 899" rồi giữ nguyên "61 từ", vì đó là hai phép đo khác nhau.

Đo lại 2026-08-15, bằng **chính luật sản xuất** — `viTriHienThi` của `scripts/luat-vi-tri-dich.mjs`
cho bề mặt, `coNhuLiteral` của `scripts/so-khop-ban-dich.mjs` cho phép "có mặt trong chunk". Không
bộ lọc phụ nào; bộ lọc "viết hoa chữ đầu" là thứ đã làm hỏng mọi lượt đo trước 2026-08-15.

| Đại lượng | `HANDOFF.md` ghi | Đo lại |
|---|---|---|
| Bề mặt — chuỗi phân biệt ở vị trí cho phép | 1.205 | **1.206** |
| Tới được chunk bảng vẽ | 899 | **900** |
| Không tới | 306 | **306** |

Lệch đúng **1 chuỗi**, rơi vào nhóm "tới được", **chưa truy nguyên**. Ghi ra để lượt sau không tưởng
đây là con số chép lại. Con số quyết định (**306**) tái lập chính xác lần thứ ba.

**Số từ lặp: xem §4.2.** Nó phụ thuộc tập khoá cuối cùng, nên không đo được trước §2.

---

## 2. "Tới được `dist/`" không phải "người dùng thấy được"

Luật C đòi mỗi bản dịch phải có mặt trong chunk bảng vẽ. Đó là điều kiện **cần**. Nó không trả lời
được câu hỏi thật: *chuỗi này có bao giờ hiện ra trước mắt người dùng không?*

### 2.1 Sàng tập 900

| Bước sàng | Loại đi | Còn lại |
|---|---|---|
| Bề mặt tới được chunk | — | 900 |
| Rác: không có chữ cái, hoặc dưới 2 ký tự hữu hình (`""`, `"="`, `"≥"`, `"x"`, `"1:1"`, `"16:9"`) | 14 | 886 |
| Định danh chữ thường (`image`, `rowId`, `bookmarkCard`, `abortController`, `google-drive`) | 469 | 417 |
| Trường private của Lit, tiền tố `_` (`_editing`, `_clone`, `_currentFrameIndex`) | 70 | **347** |

469 định danh chữ thường không phải phỏng đoán về hình dạng: chúng ở vị trí hiển thị vì `name:` và
`label:` cũng là tên thuộc tính của cấu hình nội bộ, không riêng của nhãn.

### 2.2 Chia 347 theo view extension đã đăng ký

`src/board/extensions.ts` giữ **22/58** view extension của thượng nguồn. Phía store thì không cắt —
`EdgelessBoard.tsx` vẫn nạp nguyên `getInternalStoreExtensions()`. Nên có một lớp chuỗi vào được
chunk **không phải vì giao diện của nó được nạp**, mà vì phía store kéo theo.

| Nhóm | Chuỗi | Nội dung |
|---|---|---|
| **A** — gói có view extension đăng ký | 134 | `gfx/note` 47 · `blocks/note` 34 · `blocks/root` 24 · `blocks/frame` 10 · `gfx/connector` 10 · `gfx/shape` 9 · `gfx/mindmap` 8 · `gfx/brush` 6 |
| **B** — hạ tầng dùng chung | 51 | `affine/shared` · `affine/components` · `affine/rich-text` · `framework/std` — chỗ ở của `Copy`/`Delete`/`Duplicate` |
| **C** — gói KHÔNG có view extension | 162 | **`affine/data-view` 128** · `widgets/keyboard-toolbar` 16 · `blocks/table` 10 |

Cột "nội dung" đếm theo gói, mà **một chuỗi có thể thuộc nhiều gói** (`Copy` trúng 13 gói), nên tổng
các cột lớn hơn số chuỗi. Ba con số 134 / 51 / 162 mới là phép chia không chồng lấn.

**Chốt: đợt này lấy A+B = 185 chuỗi, bỏ hẳn nhóm C.** 128 chuỗi `affine/data-view` là giao diện
bảng dữ liệu; không view extension nào nạp nó, nên dịch chúng là công không — cùng lý do mà quyết
định 1 của P1-C từ chối dịch nhóm 306.

Đây **không** phải cổng mới. Luật C vẫn chấp nhận nhóm C nếu ai đó thêm khoá; ranh giới này là kỷ
luật soạn bảng, ghi thành văn ở đây để lượt sau không phải suy lại.

---

## 3. Lớp lỗi mới: chuỗi mang vai trò định danh

Đây là phát hiện chính của lượt thiết kế, và nó không có trong 11 lỗi của P1-B lẫn 4 Important của
P1-C.

### 3.1 Cơ chế

`dichMotFile` thay chuỗi **ở vị trí hiển thị** và không thay ở vị trí so sánh — đúng thiết kế của
P1-B. Nhưng khi một chuỗi vừa là nhãn vừa là **mối nối giữa hai chỗ**, thay một đầu là đứt mối nối:

```js
// .vendor-build/affine/shared/src/consts/bracket-pairs.js:8   — ĐƯỢC thay
name: 'square bracket',
// .vendor-build/affine/inlines/preset/src/keymap/bracket.js:65 — KHÔNG được thay
if (!isCodeBlock && pair.name === 'square bracket') {
```

Sau lượt dịch, phép so sánh không bao giờ đúng nữa. JS vẫn hợp lệ, `tsc` xanh, `npm test` xanh,
`kiem:dist` xanh — **tính năng tự đóng ngoặc chết im lặng**. Không cổng nào hiện có nhìn thấy được,
vì mọi cổng đều soi *chỗ được thay*, không cổng nào soi *chỗ không được thay mà lẽ ra phải cùng đổi*.

### 3.2 Đo được: 27 trong 175 khoá ứng viên

Quét lại toàn cây, tìm những chỗ chuỗi ứng viên xuất hiện mà `viTriHienThi` trả `null`, rồi phân
loại theo vai trò cú pháp. Bốn vai trò dưới đây là **định danh**:

| Vai trò | Dạng |
|---|---|
| toán hạng của phép bằng | `x === 'Divider'`, `x !== 'Divider'` |
| nhãn `case` | `case 'Triangle':` |
| chỉ số truy cập | `obj['Copy']` |
| **tên** của property | `{ 'Heading 1': { … } }` |

**27 chuỗi** trúng: `Untitled` `Text` `Light` `Dark` `Normal` `Italic` `Delete` `Copy` `Divider`
`Triangle` `Diamond` `Ellipse` `Curve` `Straight` `square bracket` `Move Up` `Move Down`
`Heading 1`–`Heading 6` `Code Block` `Bulleted List` `Numbered List` `To-do List`.

### 3.3 Năm mức, KHÔNG phải một

Lượt soi kỹ cho thấy 27 chuỗi này **không cùng một mức**. Gộp chúng vào một bảng là sai, và bản đầu
của spec này đã sai đúng chỗ đó. Sau khi phân loại xong, **chỉ còn 3 chuỗi thật sự phải từ chối**.

**Mức 1 — chỗ định danh là GIÁ TRỊ ĐƯỢC LƯU XUỐNG.** Chỉ `Triangle` và `Diamond`:

```js
// affine/model/src/consts/connector.js:13 — giá trị lưu xuống CHÍNH LÀ "Triangle"
PointStyle["Triangle"] = "Triangle";
// affine/gfx/connector/src/renderer/dom-renderer.js:65 — switch trên giá trị đã lưu
case 'Triangle': { … }
```

Nguy hiểm thật, nhưng lý do sâu hơn "đổi định dạng dữ liệu": chuỗi `"Triangle"` mang **hai nghĩa** —
nhãn hình tam giác trong menu Hình, *và* kiểu đầu mũi tên connector trong tài liệu. Bộ thay so khớp
theo chuỗi nên không phân biệt được; dịch nhãn menu Hình là dịch luôn nhãn đầu connector trong khi
`case` giữ tiếng Anh. Đây là con `LinkedPage` của P1-B tái sinh ở trục khác.

**Mức 2 — chỗ định danh là THÀNH VIÊN ENUM đã dịch.** Chỉ `Text` còn ở mức này; năm chuỗi kia
(`Ellipse` `Italic` `Light` `Dark` `Normal`) hoá ra là **mức 5**, xem §3.6:

```js
ShapeType["Ellipse"] = "ellipse";   FontStyle["Italic"] = "italic";   Flag[Flag["Text"] = 4] = "Text";
```

Giá trị lưu xuống (`"ellipse"`, `"italic"`, `4`) **khác** chuỗi hiển thị, nên chúng KHÔNG nằm trong
dữ liệu tài liệu. `Text` vẫn phải từ chối vì một lý do khác hẳn mức 1: người dùng enum viết
`Flag.Text` — **truy cập thuộc tính, không phải chuỗi**, nên bộ thay không với tới được. Dịch chuỗi
là biến `Flag.Text` thành `undefined`.

Ranh giới giữa mức 2 và mức 5 là: **chỗ hiển thị và chỗ enum có chung một dòng dữ liệu không.** Với
`Text` thì có (`note-menu-config.js` vừa định nghĩa nhãn vừa nhánh theo `item.type`); với năm chuỗi
kia thì không.

**Mức 3 — chỗ định danh nằm TRỌN trong cây vendored và không đi vào tài liệu.** 16 khoá:

- nhóm menu note (11): `Heading 1`–`Heading 6` `Bulleted List` `Numbered List` `To-do List`
  `Code Block` `Divider`;
- nhóm menu More và slash-menu (4): `Copy` `Delete` `Move Up` `Move Down`;
- tiền tố `Drag/Click to insert ` (1) — không phải nhãn, xem §3.7.

Đã kiểm chứng bằng phép đếm toàn cây (§3.4): **0/16 xuất hiện trong `affine/model/`**; mọi chỗ định
danh đều là khoá bảng tooltip, map nhãn của outline, placeholder của paragraph, hoặc phép so sánh
nội bộ.

Với mức 3, thay ở **mọi** vị trí giữ mối nối nguyên vẹn và không gì đứt — xem §4.6.

**Mức 4 — không phải chữ hiển thị.** `square bracket` **đạt** tiêu chí mức 3 (2 lượt cả thảy, 1 hiển
thị 1 so sánh, không dính model) nhưng vẫn không thành khoá, vì §4.5 loại nó cùng 10 tên ngoặc anh
em: chúng là tên cấu hình cặp ngoặc, chưa bao giờ hiện ra trước mắt ai. Ghi riêng thành một mức để
không ai đọc §3.3 rồi tưởng nó bị từ chối vì nguy hiểm.

### 3.4 Phép kiểm chứng cho mức 3 — đo, không suy luận

Liệt kê **mọi** lượt xuất hiện trong cây, phân theo vai trò. Đây là phép đo, không phải suy luận:

| Chuỗi | Lượt | Hiển thị | Định danh | Chỗ định danh là gì | `affine/model/` |
|---|---:|---:|---:|---|---|
| `Heading 1`–`Heading 6` | 5 | 2 | 3 | khoá `tooltips[…]`, map nhãn outline, placeholder paragraph | KHÔNG |
| `Bulleted List`, `Numbered List`, `Code Block` | 5 | 3 | 2 | khoá `tooltips[…]`, map nhãn outline | KHÔNG |
| `To-do List` | 5 | 4 | 1 | khoá `tooltips[…]` | KHÔNG |
| `Divider` | 6 | 4 | 2 | hai phép `!==` / `===` trên `item.name` | KHÔNG |
| `Copy` | 20 | 18 | 2 | `slashMenuToolTips['Copy']` ×2 | KHÔNG |
| `Move Up`, `Move Down` | 7 | 5 | 2 | khoá + tra khoá bảng tooltip slash-menu | KHÔNG |
| `Delete` | 36 | 32 | 4 | 1 khoá bảng tooltip + **3 `trackEvent('Delete')`** | KHÔNG |

Hai chỗ định danh hoá ra là **chỗ hiển thị mà luật vị trí đang bỏ sót** —
`paragraph/src/view.js:12` (`placeholders = { h1: 'Heading 1' }`) và
`gfx/note/src/toolbar/note-tool-button.js:156` (giá trị mặc định của `tip`). Dịch trọn cây phủ luôn
chúng, tức được thêm chứ không mất gì.

**Ba `trackEvent('Delete')` là tên sự kiện thống kê, không phải chữ hiển thị.** Dịch trọn cây biến
chúng thành `trackEvent('Xoá')`. Chủ dự án đã cân nhắc và chấp nhận: `citationService` chưa nối
backend nào trong app này, nên không có dữ liệu lịch sử để lệch. **Nếu sau này nối analytics thật
thì đây là chỗ phải xem lại trước tiên.**

Ba ca đã đo và **bị loại** dù thoạt nhìn giống mức 3:

| Chuỗi | Vì sao loại |
|---|---|
| `Untitled` | 34 lượt, chỉ 5 hiển thị, **29 định danh** — `\|\| 'Untitled'` khắp nơi, `DEFAULT_DOC_NAME`, và `insert: 'Untitled'` trong bộ xuất Markdown/PDF/plain-text. Nó là tên tài liệu mặc định và **đi vào file xuất ra** |
| `Curve`, `Straight` | `ConnectorMode["Curve"]` ở `affine/model/src/consts/connector.js:29` — vừa mức 1 vừa mức 2 |
| `Text` | `Flag[Flag["Text"] = 4]` là enum số; người dùng viết `Flag.Text`, phép thay chuỗi không với tới |

`Text` là **ca suýt lọt** — nó nằm trong nhóm menu note theo mọi dấu hiệu bề ngoài và chỉ rụng ra khi
đếm thật. Đó là lý do §4.6 phải có cổng riêng chứ không tin danh sách chép tay.

### 3.6 Vì sao 9 chuỗi mức 5 là báo động giả

Cổng 4 hỏi *"chuỗi này có xuất hiện ở vị trí định danh ở đâu đó không"*. Đó là **phép đại diện** cho
câu hỏi thật: *"nó có phải mối nối giữa hai chỗ không"*. Với 9 chuỗi này, chỗ định danh duy nhất là
**định nghĩa enum trong `affine/model/`**, không bao giờ nhận chuỗi hiển thị:

```js
// gfx/shape/src/toolbar/shape-menu-config.js
{ name: ShapeType.Ellipse,   // truy cập thuộc tính → giá trị "ellipse", bộ thay KHÔNG chạm
  tooltip: 'Ellipse' }       // nhãn hiển thị, chỉ mình nó bị thay
// ShapeComponentConfigMap khoá theo config.name = "ellipse", KHÔNG theo tooltip

// gfx/connector/src/toolbar/connector-dense-menu.js
menu.action({ name: 'Curve', select: createSelect(ConnectorMode.Curve) })
// model/src/consts/connector.js — ConnectorMode là enum SỐ:
ConnectorMode[ConnectorMode["Straight"] = 0] = "Straight";   // lưu xuống là 0

// components/src/color-picker/color-picker.js — so sánh bằng chữ THƯỜNG
if (type !== 'normal') { const another = type === 'light' ? 'dark' : 'light'; }

// gfx/text/src/toolbar/actions.js
{ key: 'Italic', value: FontStyle.Italic }   // nhãn và giá trị tách rời
```

Đối chiếu ca thật để thấy khác biệt: `Divider` có `name: 'Divider'` ở dòng 105 và
`item.name !== 'Divider'` ở dòng 113 — **cùng file, cùng một dòng dữ liệu**.

**Không có quy tắc cú pháp rẻ nào thay được phép kiểm tay.** Đã thử hai quy tắc trên dữ liệu thật:

| Quy tắc nới lỏng | `Divider` | `Ellipse` | `square bracket` |
|---|---|---|---|
| chỗ định danh **cùng gói** với chỗ hiển thị | refuse ✓ | allow ✓ | **allow ✗ SAI** |
| chỗ định danh **cùng file** với chỗ hiển thị | refuse ✓ | allow ✓ | **allow ✗ SAI** |

`square bracket` định nghĩa ở `affine/shared/consts/bracket-pairs.js` và so sánh ở
`affine/inlines/preset/keymap/bracket.js` — khác file, khác gói, **mà vẫn là mối nối thật**. Nó
chứng minh mối nối vượt được mọi ranh giới cú pháp, nên mọi quy tắc tự động nới lỏng đều bỏ lọt đúng
lớp ca này. Đó là lý do §4.8 dùng **bản khai được ghim** chứ không nới Cổng 4.

### 3.7 Lớp lỗi THỨ HAI: phẫu thuật chuỗi trên literal đã dịch

Không thuộc vai trò định danh, và không cổng nào trong spec bắt được:

```js
// gfx/note/src/toolbar/note-menu-config.js:117-119
tooltip: item.type !== 'text'
    ? item.tooltip.replace('Drag/Click to insert ', '')   // ← cắt tiền tố khỏi literal ĐÃ DỊCH
    : 'Text',
```

Menu note dựng tooltip bằng cách **cắt tiền tố** khỏi chính chuỗi mà đợt 2 sẽ dịch. Chuỗi mẫu
`'Drag/Click to insert '` nằm ở vị trí đối số — ngoài danh sách cho phép — nên **không** được dịch.
Sau lượt dịch, `.replace` hết khớp và tooltip hiện nguyên câu dài thay vì mỗi cái nhãn. Chuỗi vẫn có
mặt trong `dist/`, **luật C vẫn xanh**.

Đã quét toàn cây tìm mọi literal là đối số của `replace`/`split`/`startsWith`/`includes`/`match`… mà
lại là mảnh của một khoá sắp dịch: **12 chỗ trúng, 11 là báo động giả** (chúng cắt trên `flavour`,
trên hướng kéo `'top-left'`, hoặc nằm trong `test-utils` không ship). **Đúng 1 chỗ là thật**, và nó
làm gãy 12 khoá.

Vì tỉ lệ báo động giả 11/12, **không dựng cổng cho lớp này** — một cổng đỏ sai 11 lần trên 12 là
đúng thứ bài học #2 cảnh báo. Thay vào đó vá tại gốc: đưa `'Drag/Click to insert '` vào
`vi-tron-cay.json` (đúng **1 chỗ** trong toàn cây), cộng Cổng 10 canh tính nhất quán tiền tố (§4.9).

Ghi chú: `TEXT_ITEMS`/`LIST_ITEMS` không được dùng ở đâu khác, nên 12 chuỗi
`Drag/Click to insert X` **chưa bao giờ hiện ra nguyên vẹn** — chúng chỉ tồn tại để bị cắt.

### 3.5 Hai hướng đã cân nhắc và loại

**Dịch cả vai trò định danh cho TOÀN BỘ 27 chuỗi.** Loại vì mức 1 và mức 2 ở trên: `Triangle` đi vào
tài liệu, `Flag.Text` không với tới được bằng phép thay chuỗi.

**Chặn hết rồi bù bằng lớp dịch thứ hai lúc chạy trong `src/board/`.** Loại vì nó dựng hai nguồn sự
thật cho cùng một câu chữ, và `kiem:dist` không canh được cái thứ hai.

**Mức 5 — báo động giả.** 9 chuỗi: `Ellipse` `Diamond` `Triangle` `Curve` `Straight` `Normal`
`Light` `Dark` `Italic`. Cổng 4 từ chối chúng, nhưng đọc dây nối thật thì **nhãn hiển thị và giá trị
được lưu là hai literal khác nhau, ở hai không gian tên khác nhau** — xem §3.6. Chúng được nhận lại
qua bản khai được ghim (§4.8).

**Chốt phân loại:**

| Mức | Chuỗi | Xử |
|---|---|---|
| 1 — giá trị lưu xuống | `Triangle` `Diamond` (vai trò đầu connector) | phần connector không dịch; nhãn menu Hình nhận qua §4.8 |
| 2 — thành viên enum | `Text` | **từ chối** |
| 3 — định danh nội bộ | 15 chuỗi + tiền tố `Drag/Click to insert ` | **trọn cây** (§4.6) |
| 4 — không phải chữ hiển thị | `square bracket` + 10 tên ngoặc | **không thành khoá** (§4.5) |
| 5 — báo động giả | 9 chuỗi menu Hình / Connector / màu | **nhận, có bản khai ghim** (§4.8) |
| — | `Untitled` | **từ chối** — đi vào file xuất ra |

Còn đúng **3 chuỗi bị từ chối**: `Text`, `Untitled`, `square bracket`.

---

## 4. Việc chặng này làm

### 4.1 Cổng 4 — vai trò định danh

Đặt trong `scripts/dich-chuoi-vendor.mjs` cạnh Cổng 3, **trước** lượt ghi `bao-cao-dich.json` —
đúng bài học "báo cáo ghi trước cổng thì lượt bị từ chối vẫn để lại file" (Minor còn mở của P1-B
Task 3). Không thêm lệnh npm nào, nên không dựng một cổng thứ tám phải tự chứng minh.

Vị từ tách thành module thuần `scripts/vai-tro-dinh-danh.mjs` + `.d.mts`, cùng khuôn với
`luat-vi-tri-dich.mjs` / `so-khop-ban-dich.mjs`, để kiểm được độc lập.

**Thu thập trong chính lượt duyệt AST đang có** của `dichMotFile`, không duyệt cây lần hai —
`dung:vendor` đã tốn vài phút, và M6 của P1-D đã ghi chi phí quét là nợ.

Fail-closed: trúng thì DỪNG, exit khác 0, nêu khoá + `file:dòng` + vai trò.

### 4.2 Bảng thuật ngữ — 28 từ

Đo trên **đúng tập 157 khoá cuối cùng** (§5), đã bỏ hư từ tiếng Anh, đếm theo **số chuỗi phân biệt
chứa từ đó** (không đếm lặp trong cùng một chuỗi):

```
heading(21) insert(12) click(12) list(12) drag(11) frame(7) shadow(7) size(6) font(6)
create(5) doc(5) add(5) group(4) align(4) page(4) headings(4) bulleted(4) code(4)
inserted(3) mode(3) title(3) shape(3) text(3) note(3) quote(3) numbered(3) block(3)
divider(3)
```

> **Đây là con số thứ TƯ của đại lượng "từ lặp", và ba con số kia đều đã hết giá trị.** "61 từ" suy
> ra từ tập 323 chuỗi đã bị bác bỏ. "33 từ" đo trên tập 185, trước Cổng 4. "29 từ" đo trên tập 148,
> trước khi §4.6 và §4.8 kéo 25 khoá về. Chỉ **28** ứng với tập khoá thật — và nó giữ nguyên 28 qua
> **ba** lượt mở rộng liên tiếp (147 → 156 → 157 khoá), **đừng đọc đó là dấu hiệu con số đã ổn định**;
> thành phần bên trong đổi mỗi lượt, chỉ số đếm tình cờ trùng.
>
> Đại lượng này đã đổi giá trị bốn lần trong một ngày, mỗi lần vì phạm vi đổi chứ không vì phép đếm
> sai. **Ai đổi phạm vi §2, §3.3 hay §4.6 thì phải đo lại, không được mang theo con số cũ.**

Chủ dự án chốt 28 mục, 157 chuỗi dịch theo — thay vì quyết định câu chữ 157 lần rời rạc.

### 4.3 Quy tắc biên tập

1. **Việt hoá hết**, giữ nguyên tên định dạng và nhãn hiệu: `Markdown`, `LaTeX`, `Docx`, `OneNote`,
   `Html`, `Zip`, `PDF`, `FreeMind`, `OPML`. Người dùng là bác sĩ, không phải lập trình viên.
2. **Cặp va chạm: giữ vế nằm trên đường edgeless.** Cổng cấm trùng bản dịch của P1-D đỏ khi hai khoá
   dịch ra cùng một chuỗi. Dò được 13 nhóm chuẩn hoá về cùng một câu; **9 nhóm tự tan** mà không tốn
   quyết định nào: 6 nhóm `Heading #N` / `Heading N` tan nhờ quy tắc 3 giữ dấu `#` (`Tiêu đề #1` vs
   `Tiêu đề 1`); 2 nhóm `Colors`/`colors$` và `Pen`/`pen$` tan nhờ Cổng mẫu mã (§4.4); 1 nhóm
   `A visual divider.` / `A visual divider` tan nhờ quy tắc 3 giữ dấu chấm. Bốn nhóm còn lại là va
   chạm thật:

   > Bản đầu của spec ghi 6 nhóm `Heading` tan **hai lần** — nhờ quy tắc 3 *và* nhờ Cổng 4 từ chối
   > `Heading 1`–`6`. Vế thứ hai không còn đúng: §4.6 đã kéo `Heading 1`–`6` về chế độ trọn cây, nên
   > quy tắc 3 giờ là **lớp duy nhất** giữ sáu nhóm này khỏi va chạm. Đổi quy tắc 3 là mở lại chúng.

   | Cặp | Giữ | Bỏ |
   |---|---|---|
   | hoa/thường | `Create linked doc` — `blocks/root/src/edgeless/configs/toolbar/more.js` | `Create Linked Doc` — `configs/toolbar.js` (chế độ trang) + `embed-iframe` (chưa bật) |
   | số ít/số nhiều ×3 | `Heading in the {4th,5th,6th} font size.` — `gfx/note/src/toolbar/note-menu-config.js` | `Headings in the …` — `rich-text/src/conversion.js`, phục vụ slash-menu (chưa bật) |

   Cả bốn ngả về cùng một phía, nên đây là **quy tắc**, không phải bốn phán quyết rời.
3. **Giữ nguyên dấu câu bản gốc** — dấu chấm cuối câu, dấu `#`. Vừa trung thực với bản gốc, vừa tự
   gỡ các cặp `"A visual divider."` / `"A visual divider"` và `"Heading #1"` / `"Heading 1"`.
4. **Chuỗi phụ cùng một mục — CƠ HỌC, thành cổng.** Nếu một object literal có `name:`/`label:` là
   chuỗi bị từ chối, thì mọi `tooltip:`/`description:`/`caption:`… **cùng object đó** cũng phải bỏ.
   Dịch chúng cho ra một mục nhãn tiếng Anh, tooltip tiếng Việt — mà tooltip lại chứa đúng bản dịch
   của cái nhãn đang để tiếng Anh:

   ```js
   { description: 'A simple bulleted list.',           // sẽ dịch
     name: 'Bulleted List',                            // bị từ chối → tiếng Anh
     tooltip: 'Drag/Click to insert Bulleted List' }   // sẽ dịch
   ```

   Đo được **32 chuỗi** thuộc lớp này khi 27 khoá đều bị từ chối; sau §4.6 còn **2** (`Text` vẫn bị
   từ chối). Quy tắc đếm được bằng AST nên nó là **cổng** (§4.7), không phải ghi chú.
5. **Nhóm anh em — kỷ luật biên tập, KHÔNG có cổng.** Nếu Cổng 4 từ chối một thành viên của một nhóm
   menu thì bỏ cả nhóm khỏi đợt. Cổng đã loại `Ellipse`/`Diamond`/`Triangle`, nên `Square` và
   `Rounded rectangle` cũng để nguyên tiếng Anh — menu hình "Vuông / Ellipse / Diamond / Triangle /
   Chữ nhật bo góc" xấu hơn hẳn menu toàn tiếng Anh. Tương tự `Curve`/`Straight` bị loại thì bỏ luôn
   `Elbowed`.

   Khác quy tắc 4 ở chỗ **"một nhóm menu" không định nghĩa được bằng AST** — mục cạnh nhau trong một
   mảng, trong hai file, hay trong hai gói đều có thể cùng một menu trên màn hình. Ghi rõ là không có
   cổng nào canh, để không ai tưởng ngược lại.
6. **Không có danh sách miễn cho Cổng 4.** Giữ nguyên tinh thần quyết định 2 của P1-C. Chế độ trọn
   cây ở §4.6 **không phải ngoại lệ của Cổng 4** — nó là một chế độ khác, chịu hai cổng riêng chặt
   hơn (§4.6), chứ không phải khai lý do rồi cho qua.

### 4.4 Cổng mẫu mã — lưới chắn ba dòng

Khoá bắt đầu bằng `_`, kết thúc bằng `$`, hoặc chứa `var(--` → DỪNG. Bắt đúng năm chuỗi có thật
trong bề mặt 185: `colors$` `pen$` `penInfo$` `penIconMap$` `var(--drt-text-primary-color)`.

Là lưới chắn, không phải bộ lọc chính — tập khoá vốn được soạn từ danh sách đã duyệt, không bốc từ
900 chuỗi thô.

### 4.5 Soi tay 31 chuỗi chỉ-ở-`name:`

Cổng 4 bắt `square bracket` vì nó có phép `===` thật, nhưng **không** bắt 10 tên ngoặc anh em
(`curly bracket`, `single quote`, `double quote`, `fullwidth parenthesis`, `corner bracket`…) —
cùng file cấu hình, cùng chẳng bao giờ hiện ra, nhưng không có phép so sánh nào để cổng bám vào.

Hai lớp bảo vệ này **bù nhau chứ không thay nhau**. Danh sách 31 chuỗi chỉ xuất hiện ở `name:` đủ
ngắn để đọc hết bằng mắt một lượt; đó là lớp bắt được nhóm này. Dự kiến loại 10 tên ngoặc.

### 4.6 Chế độ dịch trọn cây — 16 khoá mức 3

`src/board/vi.json` giữ nguyên hình dạng và nguyên nghĩa: **thay ở vị trí hiển thị**. Khoá mức 3 đi
vào một file thứ hai, `src/board/vi-tron-cay.json`, cùng hình dạng phẳng `{ "English": "Tiếng Việt" }`
nhưng nghĩa khác: **thay ở MỌI lượt xuất hiện**, không lọc vị trí.

Hai file thay vì một cờ trong cùng file — hai quy tắc khác nhau thì để hai chỗ khác nhau, ai đọc
`vi.json` không phải nhớ rằng vài dòng trong đó chơi theo luật khác.

Vì sao trọn cây lại **an toàn hơn** nửa vời: thay hết thì cây tự nhất quán theo kiến trúc — mọi mối
nối nội bộ vẫn nối đúng vì cả hai đầu cùng đổi. Rủi ro duy nhất là chuỗi **vượt ra khỏi cây**: đi vào
tài liệu đã lưu, hoặc được với tới bằng thứ không phải chuỗi. Hai cổng dưới đây canh đúng hai đường
đó.

**Cổng 5 — không còn lượt sót.** Sau lượt thay, chuỗi gốc tiếng Anh của mỗi khoá trọn cây phải còn
**đúng 0 lượt** trong `.vendor-build/`. Cổng này tự chứng minh là không rỗng tuếch: nó đếm được số
lượt *trước* khi thay (5 tới 6 mỗi chuỗi, §3.4) nên khẳng định "0 lượt còn lại" có mẫu số thật.
Sót một chỗ là đỏ ngay, và sót chính là dạng hỏng duy nhất mà chế độ này có thể sinh ra.

**Cổng 6 — cấm thành viên enum.** Khoá trọn cây bị DỪNG nếu chuỗi của nó:
- xuất hiện ở bất kỳ đâu trong `affine/model/` — đó là nơi BlockSuite khai lược đồ tài liệu; hoặc
- là đối số của một `ElementAccessExpression` nằm ở **vế trái một phép gán** (`X["S"] = …`) — đúng
  hình dạng của enum đã dịch, kể cả dạng số `X[X["S"] = 4] = "S"`.

Vế thứ hai bắt đúng ca `Text` ở §3.4 — ca suýt lọt. Kế hoạch **phải** dùng nó làm bằng chứng đỏ:
thêm `"Text"` vào `vi-tron-cay.json` thì Cổng 6 phải đỏ và nêu `flags.js:7`.

**Cổng 7 — một khoá không được ở cả hai file.** Trùng khoá giữa `vi.json` và `vi-tron-cay.json` là
mơ hồ về luật áp dụng; DỪNG.

`kiem:dist` luật C phải cộng cả hai file vào mẫu số `N/N có mặt` — nếu không, 11 bản dịch mới trôi
qua cổng cuối mà không ai soi.

### 4.7 Cổng 8 — chuỗi phụ dính nhãn bị từ chối

Cưỡng chế quy tắc 4 của §4.3. Trong cùng một object literal, nếu có `name:`/`label:` mang chuỗi bị
Cổng 4 từ chối, mà lại có một `tooltip:`/`description:`/`caption:`/`title:`… là **khoá trong
`vi.json`**, thì DỪNG và nêu cả hai.

Đây là cổng duy nhất trong chặng nhìn vào **quan hệ giữa hai chuỗi**, không nhìn từng chuỗi rời.
Bằng chứng đỏ: giữ `"Drag/Click to insert Text block"` trong `vi.json` (nhãn `Text` của nó vẫn bị
Cổng 4 từ chối) → phải đỏ, nêu `note-menu-config.js:36` cùng nhãn `"Text"`.

### 4.8 Cổng 9 — bản khai được ghim cho 9 chuỗi mức 5

Không nới Cổng 4 (§3.6 đã chứng minh mọi quy tắc nới lỏng tự động đều bỏ lọt `square bracket`).
Thay vào đó dùng **đúng khuôn `bang-bam-vendor.json` của D11**: khai những gì đã kiểm, rồi để cổng
gào lên khi thực tế lệch khỏi bản khai.

`src/board/vi-mien-dinh-danh.json` — mỗi chuỗi khai **chính xác** tập chỗ định danh đã soi:

```json
{ "Ellipse": ["affine/model/src/consts/shape.js:14"],
  "Curve":   ["affine/model/src/consts/connector.js:29",
              "affine/model/src/elements/connector/connector.js:44"] }
```

Cổng 9 quét lại cây, tính tập chỗ định danh thật của từng khoá, và **DỪNG khi lệch bản khai** — thêm
một chỗ, bớt một chỗ, đổi file, đều đỏ. Khác danh sách miễn ở đúng điểm này: danh sách miễn mục đi
trong im lặng khi thượng nguồn đổi, bản khai được ghim thì đỏ ngay lượt `dung:vendor` kế tiếp.

Chuỗi được nhận vào đây thì **vẫn dịch theo luật vị trí thường** (`vi.json`), không phải trọn cây —
chính vì chỗ định danh của nó phải giữ nguyên tiếng Anh.

Bằng chứng đỏ bắt buộc: sửa một dòng bản khai của `Ellipse` thành đường dẫn khác → Cổng 9 phải đỏ và
nêu cả chỗ khai lẫn chỗ đo được.

### 4.9 Cổng 10 — tiền tố nhất quán

Cưỡng chế lớp lỗi §3.7. Với mỗi khoá trọn cây `P` **kết thúc bằng dấu cách** (tức nó là tiền tố bị
đem đi cắt), mọi khoá `K` bắt đầu bằng `P` phải có bản dịch bắt đầu bằng bản dịch của `P`.

Hôm nay đúng một cặp: `P = "Drag/Click to insert "`, `K` = 12 chuỗi `Drag/Click to insert X`. Nếu
`P → "Kéo/Bấm để chèn "` thì cả 12 bản dịch phải mở đầu bằng `"Kéo/Bấm để chèn "`, để
`.replace(P_vi, '')` vẫn cắt đúng.

Kiểm bằng phép so chuỗi thuần, không cần duyệt cây. Bằng chứng đỏ: đổi một trong 12 bản dịch sang
mở đầu khác → đỏ, nêu đúng khoá đó.

---

## 5. Ba đợt

Mỗi đợt là một vòng khép kín: soạn khoá → `npm run dung:vendor` → bảy cổng → mở app soi mắt → chủ dự
án duyệt câu chữ. Một khoá làm hỏng thứ gì thì nó lẫn giữa 24 thay đổi, không phải giữa 157.

| Đợt | Khoá | Bề mặt |
|---|---:|---|
| **1** | 24 | toast + `data-tip` + tooltip thanh công cụ edgeless — bấm một cái là thấy |
| **3** | 29 | câu mô tả dài (`description:`) + tên định dạng |
| **2** | 88 | nhãn menu Hình / Connector / frame / group / brush — gồm 9 khoá nhận qua §4.8 |
| **trọn cây** | 16 | nhóm menu note + `Copy`/`Delete`/`Move Up`/`Move Down` + tiền tố (§4.6) |
| | **157** | **tổng** |

Đợt 1 gồm: `Copied to clipboard` `Link` `Frame` `Cutting mode` `Inline Equation` `Create Table`
`Release from group` `Group` `Align objects` `Draw connector` `Lock` `Zoom to selection` `Mind Map`
`Invalid link` `Title can not be empty` `Eraser` `Shape` `Edgeless Text` `Note`
`Frame has been inserted into doc` `Group has been inserted into doc` và ba toast của chế độ trình
chiếu (`You have reached the {first,last} frame`, `The presentation requires at least 1 frame. …`).

Nhóm trọn cây: `Heading 1`–`Heading 6` `Bulleted List` `Numbered List` `To-do List` `Code Block`
`Divider` `Copy` `Delete` `Move Up` `Move Down` `Drag/Click to insert `.

Bản khai ghim (§4.8), nằm trong đợt 2: `Ellipse` `Diamond` `Triangle` `Curve` `Straight` `Normal`
`Light` `Dark` `Italic`.

**157 đã trừ hết** 4 cặp va chạm (§4.3.2), 10 tên ngoặc (§4.5) và 2 chuỗi phụ dính nhãn `Text`
(§4.3.4).

**Quy tắc nhóm anh em §4.3.5 giờ không lấy đi khoá nào** — nó chỉ kích hoạt khi một nhóm menu bị xẻ
đôi, mà sau §4.8 cả ba menu Hình / kiểu Connector / bộ chọn màu đều ra tiếng Việt trọn vẹn. Năm khoá
mà bản trước dự định bỏ (`Square`, `Rounded rectangle`, `Elbowed`, `Custom`, `Colors`) nay ở lại.

Kế hoạch phải tự đo lại con số cuối của từng đợt và ghi vào báo cáo, **không chép các con số này**.

### 5.1 Vì sao chia đợt như vậy — bảng tỉ lệ pha trộn

Đếm chuỗi hiển thị trên mỗi file cấu hình của gói đang bật, **giả sử cả 27 chuỗi đều bị từ chối**
(tức trước khi có §4.6):

| VI | EN | % Anh | File |
|---:|---:|---:|---|
| 1 | 2 | 67% | `gfx/connector/.../connector-dense-menu.js` — `Curve` `Straight`; **§4.8 gỡ cả hai** |
| 2 | 3 | 60% | `components/.../color-picker.js` — `Normal` `Light` `Dark`; **§4.8 gỡ cả ba** |
| 2 | 3 | 60% | `gfx/shape/.../shape-menu-config.js` — `Ellipse` `Diamond` `Triangle`; **§4.8 gỡ cả ba** |
| 16 | 12 | 43% | `rich-text/src/conversion.js` |
| 10 | 7 | 41% | `blocks/note/src/configs/tooltips.js` |
| 27 | 12 | 31% | `gfx/note/.../note-menu-config.js` |
| 10 | 2 | 17% | `blocks/root/.../toolbar/more.js` — chỉ `Copy` `Delete`; **§4.6 gỡ nốt hai chuỗi này** |
| — | 0 | 0% | 11 file khác, sạch hoàn toàn |

Con số 31% của menu note **là ảo**: 24 trong 27 chuỗi Việt của nó chính là 24 tooltip/description
dính nhãn ở §4.3.4. Trừ chúng đi thì menu note còn **3 VI / 12 EN = 80% tiếng Anh** — và đó chính là
lý do §4.6 tồn tại. Sau §4.6 menu note ra tiếng Việt trọn vẹn.

Bảng trên là **ảnh chụp trước §4.6 và §4.8**. Sau cả hai, mọi dòng trong bảng về 0% tiếng Anh trừ
một chỗ: mục **`Text`** của menu note, cùng tooltip và description của nó (§4.3.4 bắt bỏ theo). Một
mục tiếng Anh giữa mười ba mục tiếng Việt — chấp nhận, vì §4.3.5 chỉ áp khi nhóm bị xẻ *phần lớn*,
không áp cho một mục lẻ.

---

## 6. Nợ gộp vào chặng này

**M3 của P1-D** — `coNhuLiteral` gọi `dangTrongNhay` **ba lần** mỗi lượt thay vì tính một lần, nằm
trong vòng lặp `O(file × chuỗi)`. Đợt này nhân số chuỗi lên ~30 lần nên nó thôi là chuyện nhỏ.

Các nợ M2, M4, M5, M6 của P1-D **không** gộp — chúng độc lập với chặng này và gộp vào chỉ làm loãng
lượt review.

---

## 7. Ngoài phạm vi

- **`affine/data-view` và cả nhóm C** (162 chuỗi). Bật tính năng trước, dịch sau — đúng thứ tự của
  quyết định 1 P1-C.
- **306 chuỗi không tới `dist/`.** Quy tắc đã chốt ở P1-C, không đụng lại.
- **Cơ chế dịch thứ hai lúc chạy.** Đã cân nhắc và loại ở §3.5.
- **Đổi sang hệ i18n thật.** Giữ nguyên phán quyết §9 của spec `2026-08-14`.
- **3 khoá còn bị từ chối**: `Text` (enum `Flag.Text`, không với tới bằng phép thay chuỗi),
  `Untitled` (đi vào file xuất ra Markdown/PDF), `square bracket` (mức 4, không phải chữ hiển thị).
  Hệ quả nhìn thấy duy nhất: **mục `Text` của menu note ở lại tiếng Anh**.
- **Vai trò đầu connector của `Triangle`/`Diamond`.** Nhãn menu Hình được dịch qua §4.8, nhưng
  `PointStyleMap` và `getConnectorModeName` giữ bản tiếng Anh vì khoá của chúng là biểu thức tính
  toán, ngoài luật vị trí. Không hỏng, nhưng nếu hai map đó có hiện ra thì sẽ lệch ngôn ngữ.

---

## 8. Tiêu chí xong

Bài học #3 của `HANDOFF.md`: *tiêu chí xong hẹp không thay được bộ cổng đầy đủ*. Nên tiêu chí gồm cả
bảy cổng, không chỉ cổng liên quan trực tiếp.

1. `npx tsc --noEmit` exit 0.
2. `npm test` xanh toàn bộ, gồm ca kiểm mới của `vai-tro-dinh-danh.mjs`.
3. **Bốn bằng chứng đỏ đã thật sự chạy và thật sự đỏ**, chép nguyên văn thông báo vào báo cáo:

   | Cổng | Cách ép đỏ | Phải nêu đúng |
   |---|---|---|
   | 4 — vai trò định danh | thêm `"Untitled"` vào `vi.json` | một trong 29 chỗ định danh của nó |
   | 5 — còn lượt sót | dịch trọn cây `"Divider"` rồi cố tình bỏ qua một chỗ so sánh | số lượt còn lại ≠ 0 |
   | 6 — thành viên enum | thêm `"Text"` vào `vi-tron-cay.json` | `shared/src/services/toolbar-service/flags.js:7` |
   | 7 — khoá ở cả hai file | để `"Copy"` trong cả `vi.json` lẫn `vi-tron-cay.json` | tên khoá trùng |
   | 8 — chuỗi phụ dính nhãn | giữ `"Drag/Click to insert Text block"` trong `vi.json` | `note-menu-config.js:36` cùng nhãn `"Text"` |
   | 9 — bản khai ghim | đổi một dòng bản khai của `"Ellipse"` sang đường dẫn khác | cả chỗ khai lẫn chỗ đo được |
   | 10 — tiền tố nhất quán | đổi một bản dịch `Drag/Click to insert X` sang mở đầu khác | đúng khoá đó |

   **Bằng chứng đỏ của Cổng 4 đã hỏng ba lần liên tiếp**, mỗi lần vì cùng một lý do: chuỗi được chọn
   làm mẫu sau đó được một cơ chế mới nhận về, nên hết ép cổng đỏ được. `"Divider"` rụng vì §4.6,
   `"Copy"` rụng vì §4.6 mở rộng, `"Ellipse"` rụng vì §4.8. Chốt ở `"Untitled"` — nó nằm trong danh
   sách **3 chuỗi từ chối cuối cùng**, và lý do từ chối (đi vào file xuất ra) không có cơ chế nào
   trong spec này gỡ được. Người lập kế hoạch **phải kiểm lại điều đó còn đúng không** trước khi
   dùng, thay vì chép.
4. **Mặt xanh có nội dung** cho từng cổng mới. Cổng 4 phải khẳng định duyệt qua **đủ số khoá thật của
   đợt**; Cổng 5 phải khẳng định **mẫu số** — 5 tới 6 lượt mỗi chuỗi trước khi thay, 0 lượt sau. Bốn
   trong mười một lỗi của P1-B là cổng xanh rỗng tuếch; ba cổng mới phải tự chứng minh không thuộc
   lớp đó.
5. `npm run kiem:vendor` lệch 0 (D11 không bị đụng).
6. `npm run kiem:vendor-paths` khớp.
7. `npm run build` + `npm run kiem:dist` xanh với `N/N có mặt`, **N cộng cả hai file** `vi.json` và
   `vi-tron-cay.json`, sau khi áp §4.3.4, §4.3.5 và §4.5.
8. Mở app ở màn Mindmap, thanh công cụ và menu hiện tiếng Việt; **chủ dự án xác nhận câu chữ từng
   đợt**, không gộp các đợt vào một lượt duyệt.
9. Riêng nhóm trọn cây, xác nhận bằng tay **năm** hành vi mà Cổng 5 không thấy: mục `Divider` **vẫn
   bị ẩn** khỏi menu note; tooltip của `Heading 1`–`6` **vẫn hiện**; placeholder của đoạn văn ra tiếng
   Việt; tip mặc định của công cụ Note ra tiếng Việt; và **tooltip menu note hiện nhãn ngắn** (`Danh
   sách dấu chấm`) chứ không phải nguyên câu dài — đó là lớp lỗi §3.7, Cổng 10 canh phần chuỗi nhưng
   không canh được kết quả trên màn hình.
10. Ba menu Hình / kiểu Connector / bộ chọn màu ra tiếng Việt **và vẫn hoạt động**: đổi hình, đổi
    kiểu đường nối, chọn màu tuỳ chỉnh ở cả ba chế độ. Đây là mặt kiểm cho §4.8 — bản khai ghim nói
    rằng nhãn và giá trị tách rời, việc bấm thật là thứ chứng minh nó.

---

## 9. Cảnh báo cho người lập kế hoạch

Bài học đã trả giá ba chặng liền — P1-B: 11 lỗi, tất cả nằm trong mã kế hoạch cho sẵn. P1-C: 4
Important, hai là của kế hoạch. P1-D: Important của Task 1 **và** I1 **và** I2 đều là kế hoạch/spec.

**Mã trong kế hoạch là bản nháp, không phải lời tiên tri.** Danh sách bốn vai trò định danh ở §3.2
là kết quả của một lượt đo trên cây thật, không phải suy luận từ ngữ pháp TypeScript; người thi hành
phải tự chạy lại phép đo đó chứ đừng chép danh sách 27 chuỗi từ đây vào mã.

Và chính spec này đã sai bốn chỗ trong bản đầu, cả bốn đều lộ ra khi soi kỹ chứ không khi viết:

| Sai | Sửa ở |
|---|---|
| Gộp 27 chuỗi vào một mức nguy hiểm duy nhất; `Ellipse`/`Italic`/`Light`/`Dark`/`Normal` thật ra là artifact enum, giá trị lưu xuống khác chuỗi hiển thị | §3.3 chia bốn mức |
| Bỏ sót hẳn lớp "chuỗi phụ cùng một mục" — 32 chuỗi | §4.3.4 + Cổng 8 |
| Phân loại ba mức không phủ hết 27 chuỗi: `Copy` `Delete` `Move Up` `Move Down` cũng là mức 3, `square bracket` là mức 4 | §3.3 thêm mức 4, §3.4 đo nốt |
| Coi 9 chuỗi menu Hình / Connector / màu là nguy hiểm, trong khi nhãn và giá trị lưu xuống là hai literal ở hai không gian tên | §3.6 mức 5, §4.8 bản khai ghim |
| Bỏ sót hẳn lớp lỗi **phẫu thuật chuỗi** — `.replace('Drag/Click to insert ', '')` cắt trên literal sắp dịch, làm hỏng 12 tooltip mà không cổng nào đỏ | §3.7, Cổng 10 |
| Số khoá 147 → **157**; số chuỗi bị từ chối 12 → **3** | §5, §7 |
| Ghi 148 khoá, số cơ học thật là 147 và đích thực tế ~142 | §5 |
| Lấy `"Divider"` làm bằng chứng đỏ cho Cổng 4, trong khi nó là khoá trọn cây hợp lệ | §8.3 đổi sang `"Copy"` |

Con số duy nhất **không** đổi qua cả ba bản là **306 chuỗi không tới `dist/`** — nó tái lập lần thứ
ba bằng ba script khác nhau. Mọi con số khác trong tài liệu này đều đã đổi ít nhất một lần trong
cùng một ngày. Đo lại, đừng chép.

**Bài học riêng của lượt soi kỹ này, đáng ghi vào `HANDOFF.md`:** hai lớp lỗi lớn nhất (§3.6 báo động
giả, §3.7 phẫu thuật chuỗi) đều **không** lộ ra từ phép quét AST — chúng lộ ra khi *đọc mã xung
quanh* chỗ mà phép quét chỉ tới. Phép quét trả lời "chuỗi này xuất hiện ở đâu"; nó không trả lời
"những chỗ đó có chung một dòng dữ liệu không". Câu thứ hai vẫn phải đọc bằng mắt.
