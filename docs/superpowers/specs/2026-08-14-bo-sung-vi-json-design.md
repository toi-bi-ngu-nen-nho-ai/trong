# Thiết kế: bổ sung `vi.json` — dịch bề mặt hiển thị của bảng vẽ

Ngày: 2026-08-14. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

Tài liệu này chỉ nói về cơ chế D12 (bản đồ dịch chuỗi hiển thị của cây vendored) và việc mở nó từ
5 khoá lên toàn bộ bề mặt. Nó **không** đụng tới D11 (cây vendored nguyên văn) hay D16 (đổi tiền tố
`affine-` → `drt-`); hai luật đó giữ nguyên hiệu lực.

---

## 1. Việc này không phải "chỉ là dịch tay dần"

`HANDOFF.md` §8 xếp việc bổ sung `vi.json` vào loại *"ít rủi ro kỹ thuật, chỉ là công việc dịch tay
dần"*. Khảo sát cho thấy đánh giá đó sai, và sai theo đúng kiểu mà bài học #2 của chính HANDOFF đã
trả giá một lần: **cổng xanh không có nghĩa sản phẩm đúng**.

Cơ chế hiện tại (`scripts/doi-ten-vendor.mjs`, bước 3) thay chuỗi bằng cách khớp **trọn một literal
ở bất cứ đâu** trong 2.550 file `.js` của `.vendor-build/`:

```js
js = js.replace(new RegExp(`(['"\`])${thoat(en)}\\1`, 'g'), (_m, q) => `${q}${vi}${q}`)
```

Phép thay này không phân biệt chuỗi hiển thị với dữ liệu. Ở mức 5 khoá nó chưa lộ — cả ba chỗ
`'Phong cách'` đáp xuống đều là `label:` hợp lệ. Ở mức vài trăm khoá thì không.

Ca chứng minh, có thật trong cây hiện tại: chuỗi `LinkedPage` xuất hiện ở

```js
// .vendor-build/affine/widgets/keyboard-toolbar/src/config.js:232 — CHỖ HIỂN THỊ
{ name: 'LinkedPage', icon: LinkedPageIcon(), showWhen: … }

// … và 22 chỗ khác dạng — DỮ LIỆU LƯỢC ĐỒ
attributes: { reference: { type: 'LinkedPage', pageId: … } }
```

Thêm `"LinkedPage"` vào `vi.json` hôm nay sẽ dịch luôn giá trị lược đồ, làm hỏng phân giải liên kết
và tài liệu đã lưu — **không lỗi, không cảnh báo, không cổng nào đỏ**.

---

## 2. Số đo

Ba lượt đo độc lập trên `.vendor-build/` vừa dựng lại từ đầu (2026-08-14).

### 2.1 Bề mặt và va chạm

Ứng viên = literal viết hoa chữ đầu, có ít nhất một chữ thường, dài 2–70 ký tự, nằm ở
`tooltip|label|placeholder|title|description|name|text:`.

| | Số |
|---|---|
| Ứng viên chuỗi hiển thị | **391** |
| Sạch — mọi literal của nó đều ở chỗ hiển thị | 281 |
| **Có va chạm** — còn literal ở chỗ khác | **110 (28%)** |

Va chạm nặng nhất: `"Untitled"` (30 lượt lạ), `"None"` (23), `"LinkedPage"` (22), `"Image"` (8),
`"Text"` (7), `"Link"` (6).

### 2.2 Ghim theo file có đủ không — không

| | Số |
|---|---|
| Lạ **khác file** — ghim theo file gỡ được | 63 |
| Lạ **cùng file** — ghim theo file **không** gỡ được | **47** |

47 ca còn lại gồm `"Image"`, `"Text"`, `"Link"`, `"Delete"`, `"Untitled"`, `"Copy"`. Đây là số đo
loại bỏ hướng "ghim bản dịch theo đường dẫn file".

### 2.3 Bao nhiêu chuỗi thật sự đi tới `dist/`

| | Số |
|---|---|
| Có mặt trong `dist/` | **275** |
| Bị tree-shake, không tới | 116 |

116 chuỗi kia (`"Replace attachment"`, `"Card view"`, `"Icon Picker"`, `"Callout"`…) thuộc các khối
không được nạp — dịch chúng là công không. Cả 5 bản dịch hiện có đều tới được `dist/`, tức cơ chế
chạy thông từ đầu tới cuối.

### 2.4 Phân loại vị trí cú pháp bằng AST

Nguyên mẫu dùng `ts.createSourceFile` duyệt toàn bộ `.vendor-build/`: **2.550 file trong 2,2 giây**,
3.301 literal ứng viên, **127 loại vị trí cú pháp khác nhau**.

Con số 127 là căn cứ cho nguyên tắc ở §4: liệt kê chỗ *cấm* là việc không bao giờ xong.

---

## 3. Quyết định

**Thay chuỗi theo vị trí cú pháp, dùng AST.** Chỉ thay một `StringLiteral` khi vị trí của nó trong
cây cú pháp nằm trong danh sách cho phép.

Hai hướng bị loại, kèm lý do đo được:

| Hướng | Vì sao loại |
|---|---|
| Ghim bản dịch theo file | §2.2 — gỡ được 63/110 ca, **còn 47 ca lạ cùng file** vẫn hỏng |
| Giữ regex, thêm cổng chứng minh, bỏ khoá không chứng minh được | ~110 chuỗi ở lại tiếng Anh vĩnh viễn, gồm `"Straight"`, `"Curve"`, `"Diamond"`, `"Triangle"`, `"Frame"`, `"Note"`, `"Color"` — đúng các nút trên thanh công cụ mindmap. Mâu thuẫn với phạm vi đã chốt |

**Phạm vi đã chốt: toàn bộ bề mặt hiển thị**, không phải riêng thanh công cụ mindmap.

**Không thêm phụ thuộc nào.** `typescript` 5.9.3 đã là devDependency trực tiếp và đã chạy bước dịch
của pipeline. (`acorn` 8.18.0 và `@babel/parser` 7.29.8 cũng có sẵn nhưng chỉ là phụ thuộc bắc cầu —
không dựa vào chúng.)

---

## 4. Kiến trúc

### 4.1 Tách bước dịch ra khỏi bước đổi tên

Hôm nay cả hai nằm chung trong `scripts/doi-ten-vendor.mjs`. Chúng khác bản chất: đổi tiền tố là
phép thay đồng nhất, sai ở đâu cũng lộ qua `kiem:dist`; dịch chuỗi là phép thay **có điều kiện theo
ngữ cảnh**, sai thì im lặng.

Bước 3 chuyển sang `scripts/dich-vendor.mjs` riêng, chạy **ngay sau** đổi tên trong
`scripts/dung-vendor.mjs`. Thứ tự bắt buộc: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.

Pipeline sau thay đổi (`dung-vendor.mjs`):

```
0. xoá sạch .vendor-build/
1. tsc dịch
2. chép package.json rút gọn
3. đổi tên affine-* → drt-*  (doi-ten-vendor.mjs, đã bỏ phần dịch chuỗi)
3b. DỊCH CHUỖI                (dich-vendor.mjs — MỚI)
4. sinh tsconfig.vendor-paths.json
5. sinh bang-bam-vendor.json
```

### 4.2 `vi.json` giữ nguyên định dạng phẳng

```json
{ "Style": "Phong cách" }
```

Chủ ý: an toàn đến từ **luật vị trí trong bộ thay**, không đến từ chú thích gắn vào từng khoá. Nhờ
vậy file vẫn là bảng từ vựng đọc và sửa được, không phải cấu hình kỹ thuật. 5 khoá hiện có không
phải viết lại.

### 4.3 Tách phần thuần khỏi phần vào-ra

`dich-vendor.mjs` xuất một hàm thuần:

```
dichMotFile(js: string, banDo: Record<string,string>) -> { js: string, cacLuot: Luot[] }
Luot = { chuoiGoc, chuoiDich, loaiViTri, tenViTri, dong }
```

Lớp vỏ CLI lo đọc/ghi đĩa và gom báo cáo. Nhờ tách vậy, phần lõi kiểm được bằng đoạn mã nhỏ ngay
trong bộ test, không cần dựng cả `.vendor-build/`.

### 4.4 Báo cáo kiểm toán

Script phát ra `.vendor-build/bao-cao-dich.json` — mỗi lượt thay ghi rõ file, loại vị trí, chuỗi
gốc, chuỗi đích, số dòng. Đây là thứ soi được bằng mắt khi nghi ngờ. Bị `.gitignore` cùng
`.vendor-build/`.

---

## 5. Luật vị trí

**Nguyên tắc: danh sách cho phép, hỏng thì đóng.** Vị trí không nằm trong danh sách → không đụng.
Với 127 loại vị trí quan sát được, đây là lựa chọn duy nhất đứng vững.

### 5.1 Danh sách cho phép — đợt đầu

Số lượt là số **literal ứng viên** đo được ở vị trí đó, không phải số chuỗi khác nhau.

| Vị trí | Lượt |
|---|---|
| `thuộc-tính: name` | 337 |
| `thuộc-tính: label` | 168 |
| `thuộc-tính: tooltip` | 78 |
| `thuộc-tính: description` | 64 |
| `thuộc-tính: caption` | 45 |
| `đối-số: toast` | 31 |
| `thuộc-tính: group` | 20 |
| `thuộc-tính: text` | 18 |
| `thuộc-tính: title` | 17 |
| `thuộc-tính: menuName` | 17 |
| `thuộc-tính: displayName` | 17 |
| `thuộc-tính: placeholder` | 10 |
| **Tổng** | **822** |

Đo lại đúng theo danh sách này (chứ không theo tập con của §2.1, vốn thiếu `caption`, `menuName`,
`displayName`, `group`, `toast`):

| | Số |
|---|---|
| Lượt literal ở vị trí cho phép | **822** |
| **Chuỗi khác nhau** | **444** |
| · tới được `dist/` | **323** |
| · bị tree-shake | 121 |

**323 là khối lượng dịch thật của đợt đầu.** Con số 391/275 ở §2.1 và §2.3 là ước lượng của lượt đo
sớm bằng regex; 444/323 mới là số đúng, đo bằng chính luật vị trí ở §5.1.

### 5.2 Gác lại đợt sau — lẫn cả hai loại

| Vị trí | Lượt | Vì sao gác |
|---|---|---|
| `ConditionalExpression` | 77 | có `"Loading..."`, `"Failed to retrieve link information."` là hiển thị thật, lẫn với chuỗi điều kiện |
| `template` | 57 | có `"Rename"`, `"Background Color"` là hiển thị, lẫn với chuỗi ghép |
| `return` | 26 | có `"Plain Text"`, `"Block Type"`, `"Today"` là hiển thị, lẫn với giá trị trả về nội bộ |
| `phần-tử-mảng` | 69 | lẫn `"Code"`, `"Link"` (hiển thị) với `"Mod-Alt-ArrowUp"` (phím tắt) |

Đưa vào sau khi đợt đầu chạy ổn và có `bao-cao-dich.json` để đối chiếu. Thà còn vài chuỗi tiếng Anh
**nhìn thấy được**, hơn là dịch nhầm một thứ im lặng.

### 5.3 Cấm tuyệt đối

| Vị trí | Lượt | Dịch vào là hỏng gì |
|---|---|---|
| `NewExpression` | 970 | `new Error("Object expected")` — lỗi nội bộ, không ai đọc |
| `TRUY-CẬP-KHOÁ` `obj['…']` | 178 | tra khoá cấu hình trượt, trả `undefined` |
| `SO-SÁNH` `===`/`!==` + `case` | 186 | `"Escape"`, `"Enter"`, `"ArrowUp"` — **phím tắt chết** |
| `đối-số: track` | 138 | tên sự kiện đo đạc |
| `đối-số: error` / `warn` / `debugLog` | 130 | thông báo cho lập trình viên |
| `đối-số: createIdentifier` | 77 | **định danh tiêm phụ thuộc** — gãy phân giải service |
| `tên-thuộc-tính` | 65 | khoá đối tượng (`'Shift-Tab'`) |
| `thuộc-tính: key` | 35 | định danh mục menu |
| `đối-số: createIcon`, `createOnToggleFn` | 31 | tên hàm/biểu tượng |
| `thuộc-tính: type` | 19 | **giá trị lược đồ tài liệu** — ca `LinkedPage` |

`thuộc-tính: key` là cái bẫy đáng ghi riêng: nó chứa `"Align left"`, `"Align right"`,
`"Align horizontally"` — **đọc lên y hệt nhãn hiển thị** nhưng là định danh mục menu. Không có số đo
thì rất dễ đưa nhầm vào danh sách cho phép.

### 5.4 Một chuỗi vừa là nhãn vừa là định danh

`name:` trong keyboard-toolbar vừa được render (`keyboard-tool-panel.js:86` —
`<span>${item.name}</span>`) vừa làm khoá cho `repeat()` của Lit (dòng 74). An toàn, vì phép thay
chạy lúc build và đổi mọi chỗ cùng lúc cùng giá trị — khoá vẫn duy nhất và ổn định. Ghi lại ở đây
để lượt nâng cấp sau không tưởng đây là lỗi.

---

## 6. Xử lý lỗi và cổng kiểm

### 6.1 Trong `dich-vendor.mjs` — mọi bất thường đều DỪNG

Cùng lối với `doi-ten-vendor.mjs` hiện tại (nó `process.exit(1)` khi thiếu `@toeverything/theme`).

| Tình huống | Xử lý |
|---|---|
| File `.js` không phân tích được | Dừng, in tên file. Bỏ qua một file là mất bản dịch của cả một widget mà không ai biết |
| **Khoá không thay được chỗ nào** | Dừng, liệt kê khoá chết |
| Giá trị tiếng Việt trùng y hệt tiếng Anh | Dừng — dòng thừa, hoặc chép nhầm |

Cổng "khoá chết" bắt trôi thượng nguồn **chính xác hơn** cổng D12 hiện có ở
`src/__tests__/vendor-doi-ten.spec.ts`: cổng cũ hỏi *"chuỗi này còn nằm đâu đó trong cây nguồn
không"*; cổng mới hỏi *"chuỗi này có thật sự được dịch ở một vị trí hiển thị không"*. Một chuỗi bị
thượng nguồn đổi từ `label:` sang `key:` sẽ **qua được cổng cũ** mà chết ở cổng mới.

Cổng D12 cũ giữ nguyên, không thay thế — nó rẻ và canh một kiểu hỏng khác (khoá biến mất hẳn).

### 6.2 Cổng độc lập, tính lại từ đầu ra thật

Một ca kiểm mới phân tích lại `.vendor-build/` **sau khi** dịch xong và khẳng định: mọi literal có
nội dung trùng một giá trị tiếng Việt trong `vi.json` đều đang nằm ở vị trí thuộc danh sách cho
phép.

Điểm mấu chốt: nó **không đọc `bao-cao-dich.json`**. Nếu bộ thay có lỗi thì báo cáo cũng sai theo;
hai thứ cùng sai một kiểu thì không cổng nào bắt được. Chỉ phép tính lại độc lập mới có giá trị.

### 6.3 `kiem:dist` — danh sách "buộc phải ra tiếng Việt"

Không đếm tổng: 116/391 chuỗi bị tree-shake nên tổng số sẽ trồi sụt vô nghĩa. Thay vào đó là một
danh sách nhỏ, cố định, gồm các nhãn trên thanh công cụ mindmap/edgeless mà chủ dự án thấy mỗi
ngày; thiếu bất kỳ cái nào trong `dist/` là đỏ.

Nó mã hoá đúng mục tiêu sản phẩm — *"thanh công cụ nói tiếng Việt"* — chứ không mã hoá một con số.
Danh sách này chốt ở nhịp 2 của §8, khi đã biết bản dịch cuối của từng nhãn.

### 6.4 Hai thứ không phải lo

- **Dịch chồng**: bước 0 của `dung-vendor.mjs` xoá sạch `.vendor-build/` trước mỗi lượt, nên bộ thay
  luôn chạy trên cây tiếng Anh nguyên bản.
- **D11**: bản dịch chỉ đáp xuống `.vendor-build/`; `kiem:vendor` so `src/vendor/` với thượng nguồn.
  Không giao nhau.

---

## 7. Kiểm thử

Ca kiểm ở `src/__tests__/vendor-dich.spec.ts`, cạnh `vendor-doi-ten.spec.ts`.

| # | Ca | Kiểm gì |
|---|---|---|
| 1 | Dịch đúng chỗ | `label:`, `name:`, `tooltip:` đều đổi |
| 2 | Không đụng chỗ cấm | mỗi lớp một ca: `type:`, `key:`, `obj['None']`, `=== 'Escape'`, `case 'ArrowUp'`, `new Error(…)`, `createIdentifier(…)`, `track(…)` |
| 3 | **Ca xương sống — `LinkedPage` thu nhỏ** | một đoạn có `name: 'LinkedPage'` *và* `type: 'LinkedPage'` cạnh nhau; đúng cái đầu đổi, cái sau còn nguyên văn |
| 4 | Khoá chết → ném lỗi | |
| 5 | Bản dịch trùng tiếng Anh → ném lỗi | |
| 6 | Tích hợp trên `.vendor-build` thật | `type: 'LinkedPage'` còn nguyên sau khi dựng |
| 7 | Cổng độc lập §6.2 | mọi chuỗi tiếng Việt đều ở vị trí cho phép |

**Bằng chứng đỏ, ghi thẳng vào comment của từng ca.** Bài học #1 của HANDOFF: ca kiểm decorator
*"đo sai thứ nó tuyên bố đo"*. Mỗi ca nhóm 2 phải trả lời được *"bỏ chốt nào ra thì ca này đỏ"*, và
điều đó phải được **xác nhận bằng cách thật sự bỏ chốt ra và thấy nó đỏ**, không phải bằng suy luận:

- Thêm `type` vào danh sách cho phép → ca 3 phải đỏ.
- Bỏ luật `TRUY-CẬP-KHOÁ` → ca `obj['None']` phải đỏ.
- Bỏ luật `SO-SÁNH` → ca `=== 'Escape'` phải đỏ.

Chưa xác nhận được thì ca kiểm chưa tính là xong.

---

## 8. Quy trình chốt thuật ngữ và thứ tự thi hành

Chủ dự án chọn: **chốt thuật ngữ trước, rồi duyệt bảng**.

**Nhịp 1 — bảng thuật ngữ.** Trong 323 chuỗi tới được `dist/` có **61 từ lặp từ 3 lần trở lên** —
`heading` (21), `insert` (17), `click` (13), `list` (12), `drag` (12), `empty` (11), `size` (10),
`add` (10), `view` (9), `font` (9), `count` (8), `shadow` (7), `frame` (6), `align` (4)… Bảng thuật
ngữ dựng từ tập này, chủ dự án chốt từng mục. Đây là nơi duy nhất phải quyết định câu chữ nhiều
lần: chốt 61 từ rồi 323 chuỗi dịch theo, thay vì quyết định 323 lần rời rạc.

**Nhịp 2 — dịch toàn bộ theo bảng đã chốt.** Nộp `vi.json` kèm một bảng đối chiếu Anh–Việt gọn để
soát. Danh sách §6.3 chốt ở nhịp này.

**Nhịp 3 — thi hành theo thứ tự**: thanh công cụ mindmap/edgeless trước, phần còn lại sau.
**Thứ tự thôi, không cắt phạm vi** — đích vẫn là toàn bộ bề mặt hiển thị.

---

## 9. Ngoài phạm vi

- **Đổi sang hệ i18n thật (nhiều ngôn ngữ, đổi lúc chạy).** Cây vendored không có hạ tầng i18n —
  khảo sát tìm được đúng 1 file nhắc tới i18n trong toàn bộ `src/vendor/blocksuite`. App chỉ có một
  ngôn ngữ. Thay chuỗi lúc build là đúng mức cần thiết.
- **Dịch 116 chuỗi bị tree-shake** (§2.3). Nếu sau này bật thêm khối chức năng, chúng sẽ vào `dist/`
  và được xử lý ở đợt đó.
- **Dịch chuỗi của mã dự án sở hữu** (`src/App.tsx`…). Vốn đã tiếng Việt.
- **Bốn vị trí gác lại ở §5.2.** Đợt sau.

---

## 10. Tiêu chí xong

Bài học #3 của HANDOFF: *tiêu chí xong hẹp không thay được bộ cổng đầy đủ*. Nên tiêu chí dưới đây
gồm **cả sáu cổng**, không chỉ cổng liên quan trực tiếp.

1. `npx tsc --noEmit` exit 0.
2. `npm test` xanh toàn bộ, gồm 7 ca mới ở §7, và **ba phép xác nhận bằng chứng đỏ ở §7 đã thật sự
   chạy và thật sự đỏ**.
3. `npm run kiem:vendor` — lệch 0 (D11 không bị đụng).
4. `npm run kiem:vendor-paths` — khớp.
5. `npm run build` + `npm run kiem:dist` xanh, gồm danh sách "buộc phải ra tiếng Việt" ở §6.3.
6. Mở app ở màn Mindmap, thanh công cụ hiện tiếng Việt; chủ dự án xác nhận câu chữ.

---

## 11. Bản đồ tài liệu

| File | Nội dung |
|---|---|
| `docs/superpowers/HANDOFF.md` | Trạng thái repo, nợ, chặng kế tiếp |
| `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md` | Spec nhúng Edgeless — D11, D12, D16 định nghĩa ở đó |
| `src/vendor/blocksuite/README.md` | Luật D11 |
| `scripts/doi-ten-vendor.mjs` | Bước đổi tên (và bước dịch, cho tới khi tách theo §4.1) |
