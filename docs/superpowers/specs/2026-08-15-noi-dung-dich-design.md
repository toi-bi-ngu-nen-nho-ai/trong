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

Bốn ca đã tra tận nơi và xác nhận hậu quả:

| Chuỗi | Chỗ định danh | Hỏng ra sao |
|---|---|---|
| `Divider` | `gfx/note/src/toolbar/note-menu-config.js:113` — `.filter(item => item.name !== 'Divider')` | **Gói ĐANG BẬT.** Bộ lọc hết khớp → mục thượng nguồn cố tình gỡ **hiện trở lại** trong menu note |
| `square bracket` | `inlines/preset/src/keymap/bracket.js:65` | Tự đóng ngoặc vuông chết hẳn |
| `Triangle`, `Diamond` | `gfx/connector/src/renderer/{dom,element}-renderer.js` — `case 'Triangle':` | Đầu mũi tên connector không vẽ |
| `Copy`, `Heading 1`–`6` | `slashMenuToolTips['Copy']`, `tooltips['Heading 1']` | Tra khoá trượt → tooltip biến mất |

### 3.3 Vì sao KHÔNG dịch cả vai trò định danh

Cả cây dịch một lượt lúc build, nên thay ở *mọi* vị trí thì mối nối vẫn nguyên và không gì đứt. Đã
cân nhắc và **loại**: `Triangle`/`Diamond` là kiểu đầu connector **được ghi vào model tài liệu**;
đổi chúng là đổi định dạng dữ liệu đã lưu, tài liệu cũ hỏng. Không có phép cơ học nào phân biệt
"chuỗi được lưu xuống" với "chuỗi chỉ sống trong bộ nhớ". Đây đúng là lớp lỗi mà cổng vị trí của
P1-B sinh ra để chặn (`type: 'LinkedPage'` là giá trị lược đồ tài liệu).

Cũng đã cân nhắc và loại: chặn rồi **bù bằng lớp dịch thứ hai lúc chạy** trong `src/board/`. Nó phủ
được `Copy`/`Delete`, nhưng dựng hai nguồn sự thật cho cùng một câu chữ, và `kiem:dist` không canh
được cái thứ hai.

**Chốt: fail-closed. 27 khoá bị từ chối, giao diện chấp nhận pha trộn.** Phần tiếng Anh còn lại là
phần **có lý do đo được**, không phải phần bỏ sót.

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

### 4.2 Bảng thuật ngữ — 29 từ

Đo trên **đúng tập 148 khoá cuối cùng**, đã bỏ hư từ tiếng Anh, đếm theo **số chuỗi phân biệt chứa
từ đó** (không đếm lặp trong cùng một chuỗi):

```
heading(15) insert(13) click(13) drag(12) size(9) list(9) font(9) frame(7) shadow(7)
headings(7) quote(7) create(6) doc(6) text(5) add(5) bracket(5) fullwidth(5) group(4)
align(4) page(4) linked(3) inserted(3) mode(3) title(3) shape(3) note(3) bulleted(3)
block(3) code(3)
```

> **Đây là con số thứ ba của đại lượng "từ lặp", và hai con số kia đều SAI.** "61 từ" suy ra từ tập
> 323 chuỗi đã bị bác bỏ. "33 từ" là lượt đo trung gian của chính ngày hôm nay, trên tập 185 —
> **trước** khi Cổng 4 loại 27 khoá. Chỉ **29** mới ứng với tập khoá thật. Ai đổi phạm vi §2 thì
> phải đo lại con số này, không được mang theo.

Chủ dự án chốt 29 mục, 148 chuỗi dịch theo — thay vì quyết định câu chữ 148 lần rời rạc.

### 4.3 Quy tắc biên tập

1. **Việt hoá hết**, giữ nguyên tên định dạng và nhãn hiệu: `Markdown`, `LaTeX`, `Docx`, `OneNote`,
   `Html`, `Zip`, `PDF`, `FreeMind`, `OPML`. Người dùng là bác sĩ, không phải lập trình viên.
2. **Cặp va chạm: giữ vế nằm trên đường edgeless.** Cổng cấm trùng bản dịch của P1-D đỏ khi hai khoá
   dịch ra cùng một chuỗi. Dò được 13 nhóm chuẩn hoá về cùng một câu; **9 nhóm tự tan** mà không tốn
   quyết định nào: 6 nhóm `Heading #N` / `Heading N` tan hai lần — vừa vì quy tắc 3 giữ dấu `#`, vừa
   vì Cổng 4 đã từ chối `Heading 1`–`6`; 2 nhóm `Colors`/`colors$` và `Pen`/`pen$` tan nhờ Cổng mẫu
   mã (§4.4); 1 nhóm `A visual divider.` / `A visual divider` tan nhờ quy tắc 3 giữ dấu chấm. Bốn
   nhóm còn lại là va chạm thật:

   | Cặp | Giữ | Bỏ |
   |---|---|---|
   | hoa/thường | `Create linked doc` — `blocks/root/src/edgeless/configs/toolbar/more.js` | `Create Linked Doc` — `configs/toolbar.js` (chế độ trang) + `embed-iframe` (chưa bật) |
   | số ít/số nhiều ×3 | `Heading in the {4th,5th,6th} font size.` — `gfx/note/src/toolbar/note-menu-config.js` | `Headings in the …` — `rich-text/src/conversion.js`, phục vụ slash-menu (chưa bật) |

   Cả bốn ngả về cùng một phía, nên đây là **quy tắc**, không phải bốn phán quyết rời.
3. **Giữ nguyên dấu câu bản gốc** — dấu chấm cuối câu, dấu `#`. Vừa trung thực với bản gốc, vừa tự
   gỡ các cặp `"A visual divider."` / `"A visual divider"` và `"Heading #1"` / `"Heading 1"`.
4. **Nhóm anh em.** Nếu Cổng 4 từ chối một thành viên của một nhóm menu thì **bỏ cả nhóm** khỏi đợt.
   Cổng đã loại `Ellipse`/`Diamond`/`Triangle`, nên `Square` và `Rounded rectangle` cũng để nguyên
   tiếng Anh — menu hình "Vuông / Ellipse / Diamond / Triangle / Chữ nhật bo góc" xấu hơn hẳn menu
   toàn tiếng Anh. Tương tự `Curve`/`Straight` bị loại thì bỏ luôn `Elbowed`.
   Đây là **kỷ luật biên tập, không có cổng cưỡng chế** — ghi rõ để không ai tưởng nó được canh.
5. **Không có danh sách miễn.** Giữ nguyên quyết định 2 của P1-C. Muốn dịch một chuỗi bị từ chối thì
   phải gỡ được nguyên nhân, không phải khai ngoại lệ.

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

---

## 5. Ba đợt

Mỗi đợt là một vòng khép kín: soạn khoá → `npm run dung:vendor` → bảy cổng → mở app soi mắt → chủ dự
án duyệt câu chữ. Một khoá làm hỏng thứ gì thì nó lẫn giữa 25 thay đổi, không phải giữa 148.

| Đợt | Khoá | Bề mặt |
|---|---|---|
| **1** | 25 | toast + `data-tip` + tooltip thanh công cụ edgeless — bấm một cái là thấy |
| **2** | 90 | nhãn menu note / shape / connector / frame / group / brush |
| **3** | 33 | câu mô tả dài (`description:`) + tên định dạng |

Đợt 1 gồm: `Copied to clipboard` `Link` `Create Linked Doc` `Frame` `Cutting mode` `Inline Equation`
`Create Table` `Release from group` `Group` `Align objects` `Draw connector` `Lock`
`Zoom to selection` `Mind Map` `Invalid link` `Title can not be empty` `Eraser` `Shape`
`Edgeless Text` `Note` `Frame has been inserted into doc` `Group has been inserted into doc` và ba
toast của chế độ trình chiếu (`You have reached the {first,last} frame`,
`The presentation requires at least 1 frame. …`).

Con số 25/90/33 là **trước** khi áp ba thứ làm tập nhỏ đi — không thứ nào làm nó to ra:

- **§4.3.2, cặp va chạm.** `Create Linked Doc` (đợt 1) bị bỏ, giữ `Create linked doc` (đợt 2) →
  đợt 1 còn **24**. `Headings in the {4th,5th,6th} font size.` (đợt 3) bị bỏ → đợt 3 còn **30**.
- **§4.3.4, nhóm anh em.** Ít nhất `Square`, `Rounded rectangle`, `Elbowed` rời đợt 2.
- **§4.5, soi tay.** Dự kiến 10 tên ngoặc rời đợt 2.

Kế hoạch phải tự đo lại con số cuối của từng đợt và ghi vào báo cáo, **không chép ba con số này**.

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
- **Cơ chế dịch thứ hai lúc chạy.** Đã cân nhắc và loại ở §3.3.
- **Đổi sang hệ i18n thật.** Giữ nguyên phán quyết §9 của spec `2026-08-14`.
- **27 khoá bị Cổng 4 từ chối.** Muốn dịch chúng thì phải giải quyết mối nối định danh trước; đó là
  một chặng riêng, cần bằng chứng riêng về chuỗi nào được ghi xuống model tài liệu.

---

## 8. Tiêu chí xong

Bài học #3 của `HANDOFF.md`: *tiêu chí xong hẹp không thay được bộ cổng đầy đủ*. Nên tiêu chí gồm cả
bảy cổng, không chỉ cổng liên quan trực tiếp.

1. `npx tsc --noEmit` exit 0.
2. `npm test` xanh toàn bộ, gồm ca kiểm mới của `vai-tro-dinh-danh.mjs`.
3. **Bằng chứng đỏ đã thật sự chạy và thật sự đỏ**: thêm `"Divider"` vào `vi.json` → Cổng 4 đỏ và
   nêu đúng `gfx/note/src/toolbar/note-menu-config.js:113`. Chép nguyên văn thông báo vào báo cáo.
4. **Mặt xanh có nội dung**: ca kiểm khẳng định Cổng 4 duyệt qua **đủ số khoá thật của đợt**, không
   phải xanh vì tập rỗng. Bốn trong mười một lỗi của P1-B là cổng xanh rỗng tuếch; Cổng 4 phải tự
   chứng minh nó không thuộc lớp đó.
5. `npm run kiem:vendor` lệch 0 (D11 không bị đụng).
6. `npm run kiem:vendor-paths` khớp.
7. `npm run build` + `npm run kiem:dist` xanh với `bản dịch vi.json — N/N có mặt`, N là số khoá thật
   sau khi áp §4.3.4 và §4.5.
8. Mở app ở màn Mindmap, thanh công cụ và menu hiện tiếng Việt; **chủ dự án xác nhận câu chữ từng
   đợt**, không gộp ba đợt vào một lượt duyệt.

---

## 9. Cảnh báo cho người lập kế hoạch

Bài học đã trả giá ba chặng liền — P1-B: 11 lỗi, tất cả nằm trong mã kế hoạch cho sẵn. P1-C: 4
Important, hai là của kế hoạch. P1-D: Important của Task 1 **và** I1 **và** I2 đều là kế hoạch/spec.

**Mã trong kế hoạch là bản nháp, không phải lời tiên tri.** Danh sách bốn vai trò định danh ở §3.2
là kết quả của một lượt đo trên cây thật, không phải suy luận từ ngữ pháp TypeScript; người thi hành
phải tự chạy lại phép đo đó chứ đừng chép danh sách 27 chuỗi từ đây vào mã.
