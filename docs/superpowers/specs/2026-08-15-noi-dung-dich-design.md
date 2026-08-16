# Thiết kế: nội dung dịch, đợt đầu (chặng P1-E)

Ngày: **2026-08-15**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch. **Bản 4** — ba bản trước đều
sai ở phần cơ chế; §9 ghi lại từng lần và vì sao.

Chặng trước: `2026-08-15-siet-so-khop-ban-dich-design.md` (siết phép so khớp bản dịch, đã gộp ở
`9ce6955`).

Đây là chặng **đầu tiên thật sự thêm khoá dịch**. Bốn chặng trước (P1-A…P1-D) chỉ dựng và siết cơ
chế; `src/board/vi.json` vẫn đúng 5 khoá suốt từ đầu.

---

## 1. Hai con số bắt buộc phải đo lại — đã đo

`HANDOFF.md` mục 10 và mục 13 đều dặn: trước khi thêm khoá đầu tiên phải **đo lại cả số chuỗi lẫn số
từ lặp**, và cấm đổi "323 → 899" rồi giữ nguyên "61 từ", vì đó là hai phép đo khác nhau.

Đo lại bằng **chính luật sản xuất** — `viTriHienThi` của `scripts/luat-vi-tri-dich.mjs` cho bề mặt,
`coNhuLiteral` của `scripts/so-khop-ban-dich.mjs` cho phép "có mặt trong chunk". Không bộ lọc phụ
nào; bộ lọc "viết hoa chữ đầu" là thứ đã làm hỏng mọi lượt đo trước 2026-08-15.

| Đại lượng | `HANDOFF.md` ghi | Đo lại |
|---|---|---|
| Bề mặt — chuỗi phân biệt ở vị trí cho phép | 1.205 | **1.206** |
| Tới được chunk bảng vẽ | 899 | **900** |
| Không tới | 306 | **306** |

Lệch đúng **1 chuỗi**, rơi vào nhóm "tới được", **chưa truy nguyên**. Ghi ra để lượt sau không tưởng
đây là con số chép lại. Con số quyết định (**306**) tái lập chính xác lần thứ ba.

Số từ lặp: **23 từ**, xem §5.2. Nó phụ thuộc tập khoá cuối nên chỉ đo được sau §4.

---

## 2. "Tới được `dist/`" không phải "người dùng thấy được"

Luật C đòi mỗi bản dịch phải có mặt trong chunk bảng vẽ. Đó là điều kiện **cần**, không trả lời được
câu hỏi thật: *chuỗi này có bao giờ hiện ra trước mắt người dùng không?*

### 2.1 Sàng tập 900

| Bước sàng | Loại đi | Còn lại |
|---|---|---|
| Bề mặt tới được chunk | — | 900 |
| Rác: không chữ cái, hoặc dưới 2 ký tự hữu hình (`""` `"="` `"≥"` `"x"` `"1:1"`) | 14 | 886 |
| Định danh chữ thường (`image`, `rowId`, `bookmarkCard`, `abortController`) | 469 | 417 |
| Trường private của Lit, tiền tố `_` (`_editing`, `_clone`) | 70 | **347** |

### 2.2 Chia 347 theo view extension đã đăng ký

`src/board/extensions.ts` giữ **22/58** view extension của thượng nguồn. Phía store thì không cắt —
`EdgelessBoard.tsx` vẫn nạp nguyên `getInternalStoreExtensions()`. Nên có một lớp chuỗi vào được
chunk **không phải vì giao diện của nó được nạp**, mà vì phía store kéo theo.

| Nhóm | Chuỗi | Nội dung |
|---|---|---|
| **A** — gói có view extension | 134 | `gfx/note` 47 · `blocks/note` 34 · `blocks/root` 24 · `blocks/frame` 10 · `gfx/connector` 10 · `gfx/shape` 9 · `gfx/mindmap` 8 · `gfx/brush` 6 |
| **B** — hạ tầng dùng chung | 51 | `affine/shared` · `affine/components` · `affine/rich-text` · `framework/std` |
| **C** — gói KHÔNG có view extension | 162 | **`affine/data-view` 128** · `widgets/keyboard-toolbar` 16 · `blocks/table` 10 |

Cột "nội dung" đếm theo gói, mà một chuỗi có thể thuộc nhiều gói (`Copy` trúng 13 gói), nên tổng các
cột lớn hơn số chuỗi. Ba con số 134 / 51 / 162 mới là phép chia không chồng lấn.

**Chốt: đợt này lấy A+B = 185 chuỗi, bỏ hẳn nhóm C.** 128 chuỗi `affine/data-view` là giao diện bảng
dữ liệu, không view extension nào nạp — dịch chúng là công không, cùng lý do quyết định 1 của P1-C.

---

## 3. Lớp lỗi thật: giá trị hiển thị bị dùng làm dữ liệu

### 3.1 Cơ chế

`dichMotFile` thay chuỗi ở vị trí hiển thị và **không** thay ở vị trí so sánh — đúng thiết kế P1-B.
Hỏng xảy ra khi một giá trị hiển thị **được đọc ngược lại** làm khoá tra cứu hoặc vế so sánh:

```js
// affine/blocks/note/src/configs/slash-menu.js
const { name, … } = config;
tooltip: tooltips[name],                            // :51, :83 — tra bảng bằng NHÃN
.filter(i => !['Code', 'Link'].includes(i.name))    // :39 — lọc bằng NHÃN

// affine/gfx/note/src/toolbar/note-menu-config.js:113
.filter(item => item.name !== 'Divider')            // so sánh bằng NHÃN
```

Dịch nhãn → tra khoá trượt, bộ lọc hết khớp. JS hợp lệ, `tsc` xanh, `npm test` xanh, `kiem:dist`
xanh. **Hỏng im lặng.**

### 3.2 Vì sao ba bản spec trước không thấy hết

Ba bản đầu quét theo chiều *"chuỗi này có xuất hiện ở vị trí định danh không"* — tức tìm **string
literal**. Nhưng mối nối chỉ cần **một** đầu là string literal; đầu kia thường không phải:

| Dạng đầu kia | Ví dụ | Quét literal thấy? |
|---|---|---|
| biến sau destructure | `tooltips[name]` | **không** |
| phần tử mảng đưa vào `.includes` | `['Code','Link'].includes(i.name)` | **không** |
| khoá object dạng identifier | `Italic: { … }` (không nháy) | **không** |
| chữ trần trong template | `` `${…} Italic` `` | **không** |
| khoá object có nháy | `'Heading 1': { … }` | có |

Bảng tooltip của BlockSuite **trộn hai dạng khoá trong cùng một object** — `'Heading 1':` có nháy,
`Italic:` `Divider:` `Copy:` không — nên bất kỳ danh sách nào dựng từ phép quét literal cũng thủng
một nửa mà trông vẫn đầy đủ.

### 3.3 Phép đo đúng: quét theo chiều ngược

Hỏi *"ở đâu một giá trị hiển thị bị tiêu thụ làm dữ liệu"* — tìm mọi `X[e]`, `e === …`,
`[…].includes(e)`, `switch (e)` trong đó `e` mang tên một thuộc tính hiển thị (kể cả sau
destructure):

| | |
|---:|---|
| 158 | chỗ tiêu thụ trong toàn cây |
| 79 | trong gói đang bật |
| 15 | cùng file với một khoá ta định dịch |
| **4** | **thật sự nguy hiểm** — đúng bốn chỗ ở §3.1 |

11 chỗ còn lại vô hại: `title === null`, `error.name === 'AbortError'`, và `acc[config.name]` ở
`shape-menu-config.js:42` — chỗ cuối đọc `config.name` vốn là `ShapeType.*`, **truy cập thuộc tính
chứ không phải chuỗi dịch**.

**Phân bố theo thuộc tính là thứ quyết định cả thiết kế:**

```
name(96)  group(38)  title(12)  text(8)  label(2)  description(2)
tooltip(0)  caption(0)  menuName(0)  displayName(0)  placeholder(0)  data-tip(0)  toast(0)
```

`name` một mình chiếm 96/158. Bảy thuộc tính cuối **chưa bao giờ bị đọc ngược** — chúng là vị trí
*đầu cuối*: giá trị chỉ đi ra màn hình.

---

## 4. Thiết kế: thu hẹp vị trí, không dựng cổng bù

### 4.1 Quyết định trung tâm

**Đợt này chỉ dịch ở bảy vị trí đầu cuối**, bỏ `name` `group` `title` `text` khỏi danh sách:

`tooltip` · `label` · `description` · `caption` · `placeholder` · `data-tip` · đối số `toast`

(`label` và `description` mỗi cái có 2 chỗ tiêu thụ, cả 4 đã soi ở §4.3.)

Cả **bốn** mối nối nguy hiểm ở §3.1 đọc `.name`. Không dịch `name:` nữa thì chúng biến mất **theo
cấu trúc**, không cần cổng nào canh. Cùng lúc:

- `square bracket` — `pair.name === 'square bracket'` hết nguy hiểm;
- `Untitled` — chỗ ghi vào file xuất ra là `title:`, đã bỏ khỏi danh sách;
- `Triangle` `Diamond` `Ellipse` `Curve` `Straight` `Normal` `Light` `Dark` `Italic` — nhãn của
  chúng nằm ở `tooltip:`/`caption:`, sạch;
- `group` — giá trị thật là khoá sắp xếp có cấu trúc (`'0_Basic@0'`), bị `parseGroup` mổ ở
  `widgets/slash-menu/src/utils.js:11`. Nó **chưa bao giờ nên** nằm trong danh sách hiển thị.

**Không còn chuỗi nào phải từ chối.** Không Cổng 4 kiểu cũ, không chế độ dịch trọn cây, không bản
khai được ghim cho 9 chuỗi, không phân loại năm mức. Ba bản spec trước dựng chừng đó bộ máy chỉ để bù
cho việc dịch `name:`; bỏ `name:` thì cả bộ máy thành thừa.

> Bài học đắt nhất của lượt thiết kế: **khi phải dựng ba cơ chế mới để bù cho một quyết định, hãy
> nghi ngờ quyết định đó trước.**

### 4.2 Cái giá: 47 khoá và 29 mục pha trộn

| | |
|---:|---|
| A+B | 185 |
| chỉ xuất hiện ở `name:`/`group:`/`title:`/`text:` → thành khoá chết, phải bỏ | **38** |
| trừ 5 khoá đã ship, chuỗi mẫu mã, 4 cặp va chạm | 9 |
| **khoá mới của đợt này** | **138** |

Trong 138 khoá, **29 khoá còn ít nhất một lượt xuất hiện ở vị trí đã bỏ**, tức lượt đó **ở lại tiếng
Anh** trong khi lượt khác của cùng chuỗi ra tiếng Việt. Ví dụ `Copy` dịch ở `label:` của menu More
nhưng giữ nguyên ở `name:` của cấu hình slash-menu.

Phần lớn vô hại vì slash-menu **chưa được đăng ký** trong `extensions.ts` nên lượt `name:` không
render. Nhưng đây là **kỷ luật biên tập không có cổng canh**: kế hoạch phải soi 29 khoá đó, và với
mỗi khoá trả lời *"lượt ở lại tiếng Anh có render không"*. Ghi kết quả vào báo cáo.

### 4.3 Cổng 4 — dây bẫy quét ngược

Không phải cổng chặn khoá, mà là **dây bẫy cho bốn chỗ còn lại**. Quét theo §3.3, giới hạn ở các
thuộc tính còn trong danh sách (`label`, `description`), rồi so với bản khai đã soi:

```
affine/shared/src/utils/file/filesys.js:175   i.description === acceptType
affine/shared/src/utils/file/filesys.js:205   i.description === acceptType
+ 2 chỗ `label` (kế hoạch tự đo lại, đừng chép)
```

DỪNG khi tập chỗ tiêu thụ lệch bản khai — thêm, bớt, hay đổi file. Cùng khuôn `bang-bam-vendor.json`
của D11: khai thứ đã soi, để cổng gào khi thượng nguồn đổi.

Đặt trong `scripts/dich-chuoi-vendor.mjs` cạnh Cổng 3, **trước** lượt ghi `bao-cao-dich.json` — đúng
bài học "báo cáo ghi trước cổng thì lượt bị từ chối vẫn để lại file".

Bằng chứng đỏ: thêm `name` trở lại danh sách vị trí → cổng phải đỏ và nêu cả 96 chỗ đọc `.name`.

### 4.4 Cổng 5 — tiền tố nhất quán

Lớp lỗi thứ hai, khác hẳn §3 và không cổng nào cũ bắt được: **phẫu thuật chuỗi trên literal đã dịch**.

```js
// gfx/note/src/toolbar/note-menu-config.js:117-119
tooltip: item.type !== 'text'
    ? item.tooltip.replace('Drag/Click to insert ', '')
    : 'Text',
```

Menu note dựng tooltip bằng cách **cắt tiền tố** khỏi chính literal mà đợt 2 sẽ dịch. Chuỗi mẫu
`'Drag/Click to insert '` ở vị trí đối số nên không được dịch → `.replace` hết khớp → tooltip hiện
nguyên câu dài. Chuỗi vẫn trong `dist/`, luật C vẫn xanh.

Quét toàn cây: **12 chỗ trúng, 11 báo động giả** (cắt trên `flavour`, trên hướng kéo `'top-left'`,
hoặc nằm trong `test-utils` không ship). Đúng 1 chỗ thật. Tỉ lệ 11/12 quá xấu để dựng cổng chặn —
vá tại gốc thay vì canh:

`'Drag/Click to insert '` xuất hiện **đúng 1 lần** trong toàn cây, nên thay thẳng nó cùng lượt dịch
(một khoá riêng trong `src/board/vi-tien-to.json`, thay ở mọi vị trí vì nó chỉ có một vị trí).
**Cổng 5** canh tính nhất quán: mọi khoá bắt đầu bằng tiền tố `P` phải có bản dịch bắt đầu bằng bản
dịch của `P`. So chuỗi thuần, không duyệt cây.

Ghi chú đã đo: `TEXT_ITEMS`/`LIST_ITEMS` không dùng ở đâu khác, nên **11** chuỗi
`Drag/Click to insert X` chưa bao giờ hiện ra nguyên vẹn — chúng chỉ tồn tại để bị cắt. Chuỗi thứ 12
(`Drag/Click to insert Text block`) là **mã chết**: nhánh `item.type !== 'text'` không bao giờ cho nó
qua `.replace`. Không thành khoá.

### 4.5 Cổng mẫu mã — lưới chắn ba dòng

Khoá bắt đầu bằng `_`, kết thúc bằng `$`, hoặc chứa `var(--` → DỪNG. Bắt đúng năm chuỗi có thật
trong bề mặt: `colors$` `pen$` `penInfo$` `penIconMap$` `var(--drt-text-primary-color)`.

---

## 5. Nội dung và thứ tự

### 5.1 Quy tắc biên tập

1. **Việt hoá hết**, giữ nguyên tên định dạng và nhãn hiệu: `Markdown` `LaTeX` `Docx` `OneNote`
   `Html` `Zip` `PDF` `FreeMind` `OPML`. Người dùng là bác sĩ, không phải lập trình viên.
2. **Cặp va chạm: giữ vế nằm trên đường edgeless.** Cổng cấm trùng bản dịch của P1-D đỏ khi hai khoá
   dịch ra cùng một chuỗi. Dò được 13 nhóm; 9 nhóm tự tan nhờ quy tắc 3 và Cổng mẫu mã. Bốn nhóm còn
   lại:

   | Cặp | Giữ | Bỏ |
   |---|---|---|
   | hoa/thường | `Create linked doc` — `blocks/root/src/edgeless/configs/toolbar/more.js` | `Create Linked Doc` — chế độ trang + `embed-iframe` (chưa bật) |
   | số ít/số nhiều ×3 | `Heading in the {4th,5th,6th} font size.` — `gfx/note/.../note-menu-config.js` | `Headings in the …` — `rich-text/src/conversion.js`, phục vụ slash-menu (chưa bật) |

3. **Giữ nguyên dấu câu bản gốc** — dấu chấm cuối, dấu `#`. Vừa trung thực vừa tự gỡ các cặp
   `A visual divider.` / `A visual divider`.
4. **Nhóm anh em — kỷ luật biên tập, KHÔNG có cổng.** Nếu một nhóm menu bị xẻ (vài mục dịch, vài mục
   không vì §4.2), cân nhắc để cả nhóm nguyên tiếng Anh. Không định nghĩa được bằng AST vì "một
   nhóm menu" có thể trải trên nhiều file; ghi rõ là không có cổng canh.

### 5.2 Bảng thuật ngữ — 23 từ

Đo trên đúng tập 138 khoá, bỏ hư từ tiếng Anh, đếm theo số chuỗi phân biệt chứa từ đó:

```
heading(15) insert(13) click(13) list(12) drag(12) shadow(7) text(6) frame(6) size(6)
font(6) create(5) doc(5) align(4) code(4) block(4) bulleted(4) group(4) add(4) quote(3)
divider(3) numbered(3) shape(3) headings(3)
```

> **Con số thứ NĂM của đại lượng này trong một ngày.** 61 (tập 323, đã bác bỏ) → 33 (tập 185) → 29
> (tập 148) → 28 (tập 157) → **23** (tập 138). Mỗi lần đổi vì *phạm vi* đổi, không vì phép đếm sai.
> Ai đổi §2 hoặc §4.1 thì phải đo lại, không mang theo.

Chủ dự án chốt 23 mục, 138 chuỗi dịch theo.

### 5.3 Ba đợt

| Đợt | Khoá | Bề mặt |
|---|---:|---|
| **1** | 24 | toast + `data-tip` + tooltip thanh công cụ edgeless — bấm một cái là thấy |
| **2** | 84 | nhãn menu (`label`/`tooltip`/`caption`) |
| **3** | 30 | câu mô tả dài (`description:`) + tên định dạng |
| | **138** | |

Mỗi đợt là một vòng khép kín: soạn khoá → `npm run dung:vendor` → bảy cổng → mở app soi mắt → chủ dự
án duyệt câu chữ. Một khoá làm hỏng thứ gì thì nó lẫn giữa 24 thay đổi, không phải giữa 138.

Kế hoạch phải **tự đo lại** con số từng đợt sau khi soi 29 khoá pha trộn ở §4.2, không chép.

---

## 6. Nợ gộp vào chặng này

**M3 của P1-D** — `coNhuLiteral` gọi `dangTrongNhay` ba lần mỗi lượt thay vì tính một lần, nằm trong
vòng lặp `O(file × chuỗi)`. Đợt này nhân số chuỗi lên ~28 lần nên nó thôi là chuyện nhỏ.

M2, M4, M5, M6 của P1-D **không** gộp — độc lập với chặng này, gộp vào chỉ làm loãng lượt review.

---

## 7. Ngoài phạm vi

- **`affine/data-view` và cả nhóm C** (162 chuỗi). Bật tính năng trước, dịch sau.
- **306 chuỗi không tới `dist/`.** Quy tắc đã chốt ở P1-C.
- **Bốn vị trí `name` `group` `title` `text`.** Muốn dịch chúng thì phải giải quyết 158 chỗ tiêu thụ
  trước — đó là một chặng riêng, cần bằng chứng riêng, và §9 cho thấy nó tốn hơn vẻ ngoài rất nhiều.
- **26 chuỗi hiển thị qua `.tooltip=${'…'}`** mà luật vị trí không với tới (`THUOC_TINH_HTML_HIEN_THI`
  chỉ có `data-tip`, và regex neo biên trái nên `.tooltip=` không khớp). Gồm `Curve` `Elbowed`
  `Straight` ở `connector-menu.js:55,64,73`. Chúng ở lại tiếng Anh; mở rộng luật là chặng riêng.
- **`getConnectorModeName`** (`model/src/elements/connector/connector.js:40`) trả nhãn tiếng Anh qua
  khoá tính toán, và **có** được hiển thị ở `connector-tool-button.js:49`. Cùng lớp với mục trên.
- **Đổi sang hệ i18n thật.**

---

## 8. Tiêu chí xong

Bài học #3 của `HANDOFF.md`: *tiêu chí xong hẹp không thay được bộ cổng đầy đủ*.

1. `npx tsc --noEmit` exit 0.
2. `npm test` xanh toàn bộ, gồm ca kiểm mới của bộ quét ngược.
3. **Ba bằng chứng đỏ đã thật sự chạy và thật sự đỏ**, chép nguyên văn thông báo vào báo cáo:

   | Cổng | Cách ép đỏ | Phải nêu đúng |
   |---|---|---|
   | 4 — quét ngược | thêm `name` trở lại danh sách vị trí | 96 chỗ đọc `.name`, gồm `slash-menu.js:51` |
   | 5 — tiền tố | đổi một bản dịch `Drag/Click to insert X` sang mở đầu khác | đúng khoá đó |
   | mẫu mã | thêm `"pen$"` vào `vi.json` | khoá khớp mẫu `$` |

4. **Mặt xanh có nội dung**: ca kiểm khẳng định Cổng 4 duyệt qua **đủ số chỗ tiêu thụ đã khai**,
   không phải xanh vì tập rỗng. Bốn trong mười một lỗi của P1-B là cổng xanh rỗng tuếch.
5. `npm run kiem:vendor` lệch 0 · 6. `kiem:vendor-paths` khớp.
7. `npm run build` + `kiem:dist` xanh với `N/N có mặt`, N cộng cả `vi.json` và `vi-tien-to.json`.
8. Mở app ở màn Mindmap; **chủ dự án xác nhận câu chữ từng đợt**, không gộp.
9. Xác nhận bằng tay ba hành vi mà không cổng nào thấy: mục `Divider` **vẫn bị ẩn** khỏi menu note;
   tooltip menu note hiện **nhãn ngắn** (`Danh sách dấu chấm`) chứ không phải nguyên câu dài;
   slash-menu (nếu bật thử) vẫn tra được bảng tooltip.
10. Báo cáo liệt kê 29 khoá pha trộn ở §4.2 kèm phán quyết từng khoá.

---

## 9. Bốn bản, bốn lần sai ở phần cơ chế — đọc trước khi lập kế hoạch

Bài học đã trả giá ba chặng liền: P1-B 11 lỗi đều trong mã kế hoạch; P1-C 4 Important, hai của kế
hoạch; P1-D Important Task 1 **và** I1 **và** I2 đều của kế hoạch/spec. Chặng này thêm bốn lần nữa,
tất cả ở phần cơ chế, tất cả trong cùng một ngày:

| Bản | Sai gì | Vì sao lộ ra |
|---|---|---|
| 1 | Gộp 27 chuỗi định danh vào một mức nguy hiểm; bỏ sót lớp "chuỗi phụ cùng một mục" (32 chuỗi) | đọc mã quanh chỗ phép quét chỉ tới |
| 2 | Coi `Ellipse`/`Curve`/`Normal`… là nguy hiểm, trong khi nhãn và giá trị lưu xuống là hai literal ở hai không gian tên | đọc `shape-menu-config.js` và enum trong `affine/model` |
| 3 | Bỏ sót lớp **phẫu thuật chuỗi** — `.replace('Drag/Click to insert ', '')` | đọc tiếp đúng file đang mở |
| 4 | **Cổng 4 hỏi sai câu hỏi.** Quét string literal không thấy được mối nối có đầu kia là biến, phần tử mảng, hay khoá identifier | subagent kiểm chứng độc lập tìm ra `tooltips[name]`, `['Code','Link'].includes(i.name)`, khoá `Italic:` |

**Mẫu chung: phép quét trả lời "chuỗi này xuất hiện ở đâu"; nó không trả lời "những chỗ đó có chung
một dòng dữ liệu không".** Câu thứ hai phải đọc bằng mắt, và cả bốn lần lỗi đều lộ ra đúng lúc đọc.

Bằng chứng đỏ của cổng chính **hỏng ba lần liên tiếp** vì cùng một lý do: chuỗi chọn làm mẫu sau đó
được một cơ chế mới nhận về (`Divider`, `Copy`, `Ellipse`). Bản 4 không kê chuỗi nào làm mẫu nữa —
nó ép đỏ bằng cách đổi **luật**, thứ không có cơ chế nào nhận về được.

Con số duy nhất không đổi qua cả bốn bản là **306 chuỗi không tới `dist/`**, tái lập ba lần bằng ba
script khác nhau. **Mọi con số khác đã đổi ít nhất một lần. Đo lại, đừng chép.**
