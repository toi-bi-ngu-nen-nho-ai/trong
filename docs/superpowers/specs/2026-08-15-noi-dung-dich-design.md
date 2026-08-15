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

### 3.3 Bốn mức, KHÔNG phải một

Lượt soi kỹ cho thấy 27 chuỗi này **không cùng một mức**. Gộp chúng vào một bảng là sai, và bản đầu
của spec này đã sai đúng chỗ đó.

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

**Mức 2 — chỗ định danh là THÀNH VIÊN ENUM đã dịch.** `Ellipse` `Italic` `Light` `Dark` `Normal`
`Text`:

```js
ShapeType["Ellipse"] = "ellipse";   FontStyle["Italic"] = "italic";   Flag[Flag["Text"] = 4] = "Text";
```

Giá trị lưu xuống (`"ellipse"`, `"italic"`, `4`) **khác** chuỗi hiển thị, nên chúng KHÔNG nằm trong
dữ liệu tài liệu. Nhưng vẫn phải từ chối, và lý do khác hẳn mức 1: người dùng enum viết `Flag.Text`
— **truy cập thuộc tính, không phải chuỗi**, nên bộ thay không với tới được. Dịch chuỗi là biến
`Flag.Text` thành `undefined`.

**Mức 3 — chỗ định danh nằm TRỌN trong cây vendored và không đi vào tài liệu.** 15 chuỗi:

- nhóm menu note (11): `Heading 1`–`Heading 6` `Bulleted List` `Numbered List` `To-do List`
  `Code Block` `Divider`;
- nhóm menu More và slash-menu (4): `Copy` `Delete` `Move Up` `Move Down`.

Đã kiểm chứng bằng phép đếm toàn cây (§3.4): **0/15 xuất hiện trong `affine/model/`**; mọi chỗ định
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

### 3.5 Hai hướng đã cân nhắc và loại

**Dịch cả vai trò định danh cho TOÀN BỘ 27 chuỗi.** Loại vì mức 1 và mức 2 ở trên: `Triangle` đi vào
tài liệu, `Flag.Text` không với tới được bằng phép thay chuỗi.

**Chặn hết rồi bù bằng lớp dịch thứ hai lúc chạy trong `src/board/`.** Loại vì nó dựng hai nguồn sự
thật cho cùng một câu chữ, và `kiem:dist` không canh được cái thứ hai.

**Chốt: fail-closed cho 12 chuỗi mức 1, mức 2 và `Untitled`; chế độ dịch trọn cây cho 15 chuỗi
mức 3; `square bracket` rụng theo §4.5 vì thuộc mức 4.**

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

Đo trên **đúng tập 147 khoá cuối cùng** (§5), đã bỏ hư từ tiếng Anh, đếm theo **số chuỗi phân biệt
chứa từ đó** (không đếm lặp trong cùng một chuỗi):

```
heading(21) insert(12) click(12) list(12) drag(11) frame(7) shadow(7) size(6) font(6)
create(5) doc(5) add(5) group(4) align(4) page(4) headings(4) bulleted(4) code(4)
inserted(3) mode(3) title(3) shape(3) text(3) note(3) quote(3) numbered(3) block(3)
divider(3)
```

> **Đây là con số thứ TƯ của đại lượng "từ lặp", và ba con số kia đều đã hết giá trị.** "61 từ" suy
> ra từ tập 323 chuỗi đã bị bác bỏ. "33 từ" đo trên tập 185, trước Cổng 4. "29 từ" đo trên tập 148,
> trước khi chế độ trọn cây (§4.6) kéo 15 khoá về. Chỉ **28** ứng với tập khoá thật — và nó giữ
> nguyên 28 qua cả hai lượt mở rộng trọn cây, **đừng đọc đó là dấu hiệu con số đã ổn định**.
>
> Đại lượng này đã đổi giá trị bốn lần trong một ngày, mỗi lần vì phạm vi đổi chứ không vì phép đếm
> sai. **Ai đổi phạm vi §2, §3.3 hay §4.6 thì phải đo lại, không được mang theo con số cũ.**

Chủ dự án chốt 28 mục, 147 chuỗi dịch theo — thay vì quyết định câu chữ 147 lần rời rạc.

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

### 4.6 Chế độ dịch trọn cây — 15 khoá mức 3

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

---

## 5. Ba đợt

Mỗi đợt là một vòng khép kín: soạn khoá → `npm run dung:vendor` → bảy cổng → mở app soi mắt → chủ dự
án duyệt câu chữ. Một khoá làm hỏng thứ gì thì nó lẫn giữa 24 thay đổi, không phải giữa 147.

| Đợt | Khoá | Bề mặt |
|---|---:|---|
| **1** | 24 | toast + `data-tip` + tooltip thanh công cụ edgeless — bấm một cái là thấy |
| **2** | 79 | nhãn menu shape / connector / frame / group / brush |
| **3** | 29 | câu mô tả dài (`description:`) + tên định dạng |
| **trọn cây** | 15 | nhóm menu note + `Copy`/`Delete`/`Move Up`/`Move Down` (§4.6) |
| | **147** | **tổng, theo quy tắc cơ học** |

Đợt 1 gồm: `Copied to clipboard` `Link` `Frame` `Cutting mode` `Inline Equation` `Create Table`
`Release from group` `Group` `Align objects` `Draw connector` `Lock` `Zoom to selection` `Mind Map`
`Invalid link` `Title can not be empty` `Eraser` `Shape` `Edgeless Text` `Note`
`Frame has been inserted into doc` `Group has been inserted into doc` và ba toast của chế độ trình
chiếu (`You have reached the {first,last} frame`, `The presentation requires at least 1 frame. …`).

Nhóm trọn cây: `Heading 1`–`Heading 6` `Bulleted List` `Numbered List` `To-do List` `Code Block`
`Divider` `Copy` `Delete` `Move Up` `Move Down`.

**147 là con số CƠ HỌC** — đã trừ 4 cặp va chạm (§4.3.2), 10 tên ngoặc (§4.5) và 2 chuỗi phụ dính
nhãn `Text` (§4.3.4). Còn một lớp trừ nữa **không cơ học được**: quy tắc nhóm anh em §4.3.5, dự kiến
lấy đi khoảng 5 khoá (`Elbowed`; `Square` + `Rounded rectangle`; hai khoá của bộ chọn màu). Đích thực
tế **khoảng 142**.

Kế hoạch phải tự đo lại con số cuối của từng đợt và ghi vào báo cáo, **không chép các con số này**.

### 5.1 Vì sao chia đợt như vậy — bảng tỉ lệ pha trộn

Đếm chuỗi hiển thị trên mỗi file cấu hình của gói đang bật, **giả sử cả 27 chuỗi đều bị từ chối**
(tức trước khi có §4.6):

| VI | EN | % Anh | File |
|---:|---:|---:|---|
| 1 | 2 | 67% | `gfx/connector/.../connector-dense-menu.js` — `Curve` `Straight` |
| 2 | 3 | 60% | `components/.../color-picker.js` — `Normal` `Light` `Dark` |
| 2 | 3 | 60% | `gfx/shape/.../shape-menu-config.js` — `Ellipse` `Diamond` `Triangle` |
| 16 | 12 | 43% | `rich-text/src/conversion.js` |
| 10 | 7 | 41% | `blocks/note/src/configs/tooltips.js` |
| 27 | 12 | 31% | `gfx/note/.../note-menu-config.js` |
| 10 | 2 | 17% | `blocks/root/.../toolbar/more.js` — chỉ `Copy` `Delete`; **§4.6 gỡ nốt hai chuỗi này** |
| — | 0 | 0% | 11 file khác, sạch hoàn toàn |

Con số 31% của menu note **là ảo**: 24 trong 27 chuỗi Việt của nó chính là 24 tooltip/description
dính nhãn ở §4.3.4. Trừ chúng đi thì menu note còn **3 VI / 12 EN = 80% tiếng Anh** — và đó chính là
lý do §4.6 tồn tại. Sau §4.6 menu note ra tiếng Việt trọn vẹn.

Ba menu còn hỏng — Hình, kiểu Connector, bộ chọn màu — thuộc mức 1 và mức 2 nên không cứu được ở
chặng này; quy tắc §4.3.5 để chúng nguyên tiếng Anh thay vì pha trộn.

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
- **12 khoá còn bị từ chối** (§3.3): `Triangle` `Diamond` `Curve` `Straight` · `Text` `Light` `Dark`
  `Normal` `Italic` `Ellipse` · `Untitled` · `square bracket`. Mức 1 cần chặng riêng về dữ liệu đã
  lưu; mức 2 cần cách với tới `Flag.Text` mà phép thay chuỗi không có; `Untitled` đi vào file xuất
  ra. Hệ quả nhìn thấy: **menu Hình, menu kiểu Connector và bộ chọn màu ở lại tiếng Anh** — ba bề
  mặt, không hơn.

---

## 8. Tiêu chí xong

Bài học #3 của `HANDOFF.md`: *tiêu chí xong hẹp không thay được bộ cổng đầy đủ*. Nên tiêu chí gồm cả
bảy cổng, không chỉ cổng liên quan trực tiếp.

1. `npx tsc --noEmit` exit 0.
2. `npm test` xanh toàn bộ, gồm ca kiểm mới của `vai-tro-dinh-danh.mjs`.
3. **Bốn bằng chứng đỏ đã thật sự chạy và thật sự đỏ**, chép nguyên văn thông báo vào báo cáo:

   | Cổng | Cách ép đỏ | Phải nêu đúng |
   |---|---|---|
   | 4 — vai trò định danh | thêm `"Ellipse"` vào `vi.json` | chỗ `ShapeType["Ellipse"]` |
   | 6 — thành viên enum | thêm `"Text"` vào `vi-tron-cay.json` | `shared/src/services/toolbar-service/flags.js:7` |
   | 5 — còn lượt sót | dịch trọn cây `"Divider"` rồi cố tình bỏ qua một chỗ so sánh | số lượt còn lại ≠ 0 |
   | 8 — chuỗi phụ dính nhãn | giữ `"Drag/Click to insert Text block"` trong `vi.json` | `note-menu-config.js:36` cùng nhãn `"Text"` |

   Ca của Cổng 4 dùng `"Ellipse"` chứ **không** dùng `"Divider"` lẫn `"Copy"`: sau §4.6 cả hai đều
   là khoá trọn cây hợp lệ nên không ép Cổng 4 đỏ được nữa. Bản đầu kê `"Divider"`, bản thứ hai kê
   `"Copy"` — cả hai hỏng vì cùng một lý do: phạm vi §4.6 nới ra dưới chân bằng chứng.
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
9. Riêng nhóm trọn cây, xác nhận bằng tay bốn hành vi mà Cổng 5 không thấy: mục `Divider` **vẫn bị
   ẩn** khỏi menu note; tooltip của `Heading 1`–`6` **vẫn hiện**; placeholder của đoạn văn ra tiếng
   Việt; tip mặc định của công cụ Note ra tiếng Việt.

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
| Ghi 148 khoá, số cơ học thật là 147 và đích thực tế ~142 | §5 |
| Lấy `"Divider"` làm bằng chứng đỏ cho Cổng 4, trong khi nó là khoá trọn cây hợp lệ | §8.3 đổi sang `"Copy"` |

Con số duy nhất **không** đổi qua cả hai bản là **306 chuỗi không tới `dist/`** — nó tái lập lần thứ
ba bằng ba script khác nhau. Mọi con số khác trong tài liệu này đều đã đổi ít nhất một lần trong
cùng một ngày. Đo lại, đừng chép.
