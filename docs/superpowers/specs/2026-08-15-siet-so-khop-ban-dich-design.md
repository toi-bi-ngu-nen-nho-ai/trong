# Thiết kế: siết phép so khớp bản dịch (chặng P1-D)

Ngày: **2026-08-15**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch.

Chặng trước: `2026-08-15-chuoi-khong-toi-dist-design.md` (quy tắc cho chuỗi không tới `dist/`, đã
thi hành xong và đã gộp ở `d165b92`).

---

## 1. Vấn đề — một phép `includes` ở hai chỗ, hai lớp lỗi

Hai nơi hỏi cùng một câu *"bản dịch này có mặt trong văn bản kia không"*, và cả hai trả lời bằng
phép so khớp **chuỗi con**:

| Chỗ | Dòng | Hỏi gì | Hậu quả khi khớp nhầm |
|---|---|---|---|
| Luật C, `scripts/kiem-dist.mjs` | `:166` | bản dịch có trong chunk bảng vẽ của `dist/` không | **cổng XANH GIẢ** — bản dịch không tới người dùng mà vẫn được tính là có |
| `timTrongCayVendor`, `scripts/tim-ban-dich-vendor.mjs` | `:79` | bản dịch có trong `.vendor-build/` không | **chẩn đoán chỉ sai gói** — nêu tên gói không liên quan |

Chuỗi con là phép sai cho câu hỏi này: một bản dịch ngắn là **chuỗi con của một bản dịch khác** thì
nó được tính "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị tree-shake.

### 1.1 Đây là lỗi ĐÃ ĐO ĐƯỢC, không phải phỏng đoán

Cùng một `dist/`, chỉ đổi phép so khớp (đo 2026-08-15):

| Phép so khớp | Tới được | Không tới |
|---|---|---|
| `noiDung.includes(s)` — phép đang chạy | 969 | 236 |
| Chuỗi nằm trọn trong một literal có nháy | **899** | **306** |

Phép lỏng đếm thừa **70 chuỗi**. Con số **306** của phép chặt tái lập chính xác lượt đo độc lập ghi
trong `HANDOFF.md` bằng một script khác.

### 1.2 Ở 5 khoá hiện tại lỗi KHÔNG THỂ lộ — ở vài trăm khoá thì chắc chắn

Cả 5 bản dịch đang ship đều ≥ 6 ký tự, phân biệt, và không cái nào là chuỗi con của cái nào. Đó là
**may mắn của quy mô nhỏ**, không phải tính chất được canh.

Đo trên chính `dist/` hiện tại, dùng các tiền tố của bản dịch đang ship:

```
"Phong"          thô: true   | chặt: false   <-- phép thô KHỚP NHẦM
"Phong cách"     thô: true   | chặt: true
"Bố"             thô: true   | chặt: false   <-- phép thô KHỚP NHẦM
"Bố cục"         thô: true   | chặt: true
"Thêm"           thô: true   | chặt: false   <-- phép thô KHỚP NHẦM
"Thêm ảnh"       thô: true   | chặt: true
```

Tiếng Việt có rất nhiều bản dịch chia nhau tiền tố (`Xoá` / `Xoá dòng`, `Tô` / `Tô màu`), nên ở quy
mô vài trăm khoá đây là chuyện **sẽ xảy ra**, không phải có thể xảy ra.

Đúng dạng lỗi #11 của vòng review P1-B ("so khớp mù phạm vi") ở một trục khác.

### 1.3 Lớp thứ hai mà phép chặt KHÔNG sửa được — bản dịch trùng nhau

Hai khoá tiếng Anh khác nhau cùng dịch ra **một chuỗi y hệt** (`Delete` → `"Xoá"`, `Remove` →
`"Xoá"`) thì chỉ cần một trong hai còn sống trong `dist/` là **cả hai** được tính có mặt. Phép chặt
không cứu được ca này vì hai chuỗi bằng nhau từng ký tự. Sổ P1-B đã ghi ("giá trị dịch trùng nhau
làm mẫu số đếm sai") nhưng chưa xử.

---

## 2. Khả thi — rủi ro lớn nhất đã loại trước khi thiết kế

Phép chặt tìm literal trong chunk **đã minify**. Nếu bộ đóng gói thoát ký tự ngoài ASCII thành
`\uXXXX` thì mọi bản dịch tiếng Việt sẽ trượt và bản vá này **phá** luật C thay vì siết nó.

Đo trên `dist/` hiện tại:

| Bản dịch | phép thô | phép chặt | có dạng `\uXXXX` |
|---|---|---|---|
| `"Phong cách"` | true | **true** | false |
| `"Bố cục"` | true | **true** | false |
| `"Thêm ảnh"` | true | **true** | false |
| `"Nhập thất bại, thử lại giúp"` | true | **true** | false |
| `"Hỗ trợ nhập FreeMind, OPML."` | true | **true** | false |

**5/5 qua phép chặt, không chuỗi nào bị thoát.** Hướng khả thi.

Phép chặt hơn dành cho cây vendored cũng đã kiểm: cả **5/5** bản dịch có mặt trong `.vendor-build/`
đúng dạng `JSON.stringify(s)` — khớp với việc `luat-vi-tri-dich.mjs` chèn bằng chính hàm đó.

---

## 3. Ba quyết định đã chốt với chủ dự án

**1. Phạm vi chỉ là siết phép so khớp.** Không sàng lọc tập chuỗi cần dịch, không chốt bảng thuật
ngữ, không dịch gì. Lý do tách: đây là **đổi hàm quyết định xanh/đỏ của một cổng**, cần bằng chứng
đỏ riêng; trộn vào việc đo đạc là trộn hai loại rủi ro khác hẳn nhau.

**2. CẤM bản dịch trùng nhau — cổng ĐỎ.** Mỗi giá trị trong `vi.json` phải duy nhất. Được: luật C
đếm đúng từng khoá, không còn ca "xanh nhờ chuỗi của khoá khác". Mất: không được dịch `Delete` và
`Remove` cùng thành `"Xoá"` — phải chọn chữ khác nhau hoặc bỏ bớt một khoá. Chủ dự án chấp nhận
ràng buộc biên tập này.

**3. Phép chặt trượt mà phép thô trúng → ĐỎ, nhưng nói rõ đây là ca gì.** Fail-closed đúng triết lý
sẵn của dự án (`luat-vi-tri-dich.mjs`: *"hỏng theo hướng nhìn thấy được"*). **Không có danh sách
miễn**, nhất quán với quyết định 2 của P1-C.

---

## 4. Kiến trúc

| File | Trạng thái | Việc |
|---|---|---|
| `scripts/so-khop-ban-dich.mjs` | **mới** | Ba hàm thuần. Không đọc/ghi đĩa, không in, không `exit`. |
| `scripts/so-khop-ban-dich.d.mts` | **mới** | Khai kiểu, để ca kiểm `.ts` import được mà `tsc --noEmit` vẫn xanh. |
| `scripts/kiem-dist.mjs` | sửa | Luật C dùng `coNhuLiteral`; thêm cổng cấm trùng; thông báo thêm ghi chú. |
| `scripts/tim-ban-dich-vendor.mjs` | sửa | `timTrongCayVendor` dùng `coDungNhuDaChen`; `soanThongBaoThieu` nhận ghi chú. |
| `src/__tests__/vendor-so-khop.spec.ts` | **mới** | Ca kiểm module thuần. |

### 4.1 Vì sao HAI phép khác nhau, và vì sao chúng phải ở CHUNG một file

Hai chỗ hỏi cùng một câu nhưng trên hai loại văn bản có tính chất khác hẳn:

- **`.vendor-build/`** là đầu ra `tsc` **chưa minify**, và bản dịch được chèn vào bằng đúng
  `JSON.stringify(vi)` trong `luat-vi-tri-dich.mjs`. Nên ở đây tìm **chính xác chuỗi
  `JSON.stringify(s)`** — không mơ hồ một chút nào, chặt hơn phép ba-kiểu-nháy.
- **`dist/`** đã minify; kiểu nháy do bộ đóng gói chọn, nên phải chấp cả `"`, `'` và `` ` ``.

Để chúng ở hai file là mời hai bên lệch nhau đúng vào lúc một bên đổi cách so khớp — đúng lý do
`duyet-cay-js.mjs` được tách ra dùng chung ở Task 1 của P1-B, và header file đó đã ghi lý do bằng
chữ.

### 4.2 Giao diện

- **`nhayHoa(s): string`** — dạng đã thoát của `s` để nhúng vào literal, tức
  `JSON.stringify(s).slice(1, -1)`.
- **`coNhuLiteral(noiDung, s): boolean`** — `s` xuất hiện trọn vẹn trong một literal có nháy
  (`"…"`, `'…'`, `` `…` ``). Dùng cho `dist/`.
- **`coDungNhuDaChen(noiDung, s): boolean`** — `noiDung` chứa **chính xác** `JSON.stringify(s)`.
  Dùng cho `.vendor-build/`.
- **`timTrungBanDich(banDo): Array<{ vi: string; khoa: string[] }>`** — các giá trị bị ≥2 khoá dùng
  chung. Rỗng khi mọi bản dịch đều duy nhất.

---

## 5. Cổng mới — cấm trùng bản dịch

Đặt trong `scripts/kiem-dist.mjs`, cạnh các phép kiểm `vi.json` đã có (`MUC_XAU`).

**Vì sao ở đây chứ không ở Cổng 0 của `dich-chuoi-vendor.mjs`:** chính file đó đã ghi rằng nó
**KHÔNG nằm trên đường `npm run build`** — `prebuild` chỉ chạy `kiem-vendor-build` +
`kiem-vendor-paths`, còn `postinstall` bỏ qua nhanh khi `.vendor-build/` đã hợp lệ. Nghĩa là ở mọi
lượt build dùng cây vendor có sẵn, **luật C là lớp cuối cùng và duy nhất**. Đặt cổng ở nơi chắc
chắn chạy.

Cũng **không** nhân đôi sang Cổng 0: review P1-B đã ghi "bất biến nhân đôi ở hai nơi" là nợ, và
một bất biến ở hai chỗ sẽ lệch nhau.

---

## 6. Thông báo — giữ BA kết cục của P1-C, thêm một GHI CHÚ

Đây là chỗ dễ làm sai nhất, và lý do đáng ghi lại.

Khi phép chặt trượt mà phép thô trúng, phản xạ đầu là kết luận *"bộ đóng gói đã ghép chuỗi"*. Nhưng
có một nguyên nhân **thường gặp hơn nhiều**: chuỗi đó khớp nhầm vào **một bản dịch khác**
(`"Phong"` nằm trong `"Phong cách"`). Hai nguyên nhân đó khác hẳn nhau, và đoán bừa một cái là lặp
lại đúng lỗi mà P1-C vừa sửa.

Vì thế phép thô **KHÔNG** trở thành kết cục thứ tư. Ba kết cục của P1-C giữ nguyên vì chúng trả lời
đúng câu hỏi *"vì sao chỗ THẬT của chuỗi này không tới `dist/`"*:

1. thấy trong `.vendor-build/` → gói bị tree-shake, nêu tên gói;
2. không thấy → bước dịch không chạy / thượng nguồn đổi vị trí cú pháp;
3. chẩn đoán không chạy được → không khẳng định gì.

Phép thô thêm **một dòng ghi chú** vào bất kỳ kết cục nào ở trên, và tự phân biệt hai ca:

- giải thích được bằng một bản dịch khác chứa nó →
  *"lưu ý: chuỗi này có trong chunk nhưng chỉ vì nó nằm trong bản dịch `"Phong cách"` của khoá
  `Style` — phép so khớp cũ đã tính nhầm đây là 'có mặt'"*;
- không giải thích được →
  *"lưu ý: chuỗi này có trong chunk nhưng không ở dạng literal trọn vẹn và không nằm trong bản dịch
  nào khác — có thể bộ đóng gói đã ghép/tách chuỗi. Kiểm tay trước khi kết luận."*

---

## 7. Kiểm thử

### 7.1 Ca kiểm module (thuần, rẻ)

| # | Ca | Canh cái gì |
|---|---|---|
| 1 | `coNhuLiteral` thấy literal nháy kép | đường cơ bản |
| 2 | thấy cả nháy đơn và backtick | bộ đóng gói chọn kiểu nháy nào cũng được |
| 3 | **chuỗi là TIỀN TỐ của literal dài hơn → KHÔNG khớp** | `"Tô"` trong `"Tô màu"`. **Đây là ca ghim đúng con bug đang sửa** |
| 4 | chuỗi là HẬU TỐ / nằm giữa → KHÔNG khớp | `"màu"` trong `"Tô màu"` |
| 5 | bản dịch chứa `"` hoặc `\` khớp đúng dạng đã thoát | `nhayHoa` phải dùng, không so thô |
| 6 | `coDungNhuDaChen` khớp `JSON.stringify(s)`, từ chối nháy đơn | phép chặt hơn cho cây vendored |
| 7 | `timTrungBanDich` rỗng khi mọi bản dịch duy nhất | không đỏ giả |
| 8 | `timTrungBanDich` gom đúng nhóm khi hai khoá trùng giá trị | §1.3 |

Mỗi ca phải **thật sự đỏ trước khi có mã**.

### 7.2 Bằng chứng đỏ ở mức cổng — PHÉP THỬ QUYẾT ĐỊNH

Ca kiểm module chứng minh hàm mới chạy đúng. Nó **không** chứng minh cổng đã hết xanh giả. Phép
dưới đây chứng minh **đúng con bug đang sửa**, và đã được đo trước trên `dist/` thật (§1.2).

Thêm tay vào `src/board/vi.json`:

```json
"Clear column style": "Phong"
```

`"Phong"` là **tiền tố** của `"Phong cách"` đang ship. Gói `affine/blocks/table` **chưa được bật**
trong `src/board/extensions.ts`, nên chỗ thật của chuỗi này **không** tới `dist/`.

| | `kiem:dist` |
|---|---|
| **Trước khi vá** | **XANH** với `6/6 có mặt` — **SAI**, nó khớp nhầm vào `"Phong cách"` |
| **Sau khi vá** | **ĐỎ**, nêu gói `affine/blocks/table` chưa bật, kèm ghi chú "khớp nhầm vào bản dịch của khoá `Style`" |

Khoá `"Clear column style"` được chọn vì P1-C đã kiểm nó thoả cả ba điều kiện: nằm ở vị trí cú pháp
cho phép (qua được Cổng 3, không thành khoá chết), thuộc đúng một gói chưa bật, và không tới `dist/`.

**Phải chép nguyên văn cả hai lượt vào báo cáo task** — lượt xanh giả trước khi vá là nửa quan
trọng hơn, vì nó là bằng chứng lỗi có thật.

### 7.3 Bằng chứng đỏ cho cổng cấm trùng

Thêm hai khoá cùng giá trị vào `vi.json`, chạy `npm run kiem:dist`, kỳ vọng **DỪNG** với danh sách
khoá trùng. Chép nguyên văn.

---

## 8. Rủi ro đã biết

**Siết phép so khớp mở ra khả năng ĐỎ GIẢ.** Nếu bộ đóng gói ghép hay tách một chuỗi, bản dịch vẫn
tới người dùng nhưng phép chặt báo "thiếu".

- Với 5 khoá hiện tại: **đã kiểm, không xảy ra** (§2).
- Với vài trăm khoá: không đoán trước được.
- Khi xảy ra: cổng **đỏ** kèm ghi chú "không giải thích được bằng bản dịch nào khác — có thể bộ
  đóng gói đã ghép/tách chuỗi" (§6, quyết định 3). Không có danh sách miễn.

Đây là đánh đổi có chủ đích: một lượt đỏ nhìn thấy được, đổi lấy việc xoá hẳn một lớp xanh giả
không nhìn thấy được. Đúng bài học #2 của dự án.

---

## 9. Ngoài phạm vi

- **Không thêm khoá dịch nào.** `vi.json` vẫn đúng 5 khoá sau chặng này. Khoá thử của §7.2 và §7.3
  là công cụ lấy bằng chứng, **không được đi vào commit**.
- **Không sàng lọc tập chuỗi cần dịch**, không đo lại số từ lặp, không chốt bảng thuật ngữ. Bề mặt
  1.205 lẫn thứ không phải chữ hiển thị (`"="`, `"x"`, `"PDF"`, `"4_Content & Media@3"`); việc sàng
  là chặng riêng.
- **Không cấm một bản dịch là chuỗi con của bản dịch khác.** Tiếng Việt chia nhau tiền tố quá nhiều
  (`Xoá` / `Xoá dòng`); phép chặt đã xử đúng ca đó nên không cần ràng buộc biên tập thêm.
- **Không đụng `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự sửa.

---

## 10. Tiêu chí xong

1. `scripts/so-khop-ban-dich.mjs` + khai kiểu + 8 ca kiểm ở §7.1, mỗi ca có bằng chứng đỏ đã thật
   sự chạy và thật sự đỏ.
2. Hai chỗ dùng `includes` (`kiem-dist.mjs:166`, `tim-ban-dich-vendor.mjs:79`) đều đã chuyển sang
   phép chặt tương ứng. **Không còn chỗ nào so khớp bản dịch bằng chuỗi con** ngoài phép thô dùng
   làm ghi chú ở §6.
3. Cổng cấm trùng chạy trong `kiem-dist.mjs`, có bằng chứng đỏ.
4. **Phép thử quyết định ở §7.2 đã chạy đủ hai lượt**, cả hai chép nguyên văn: xanh giả trước khi
   vá, đỏ đúng chỗ sau khi vá.
5. **Bảy cổng xanh**: `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
   `kiem:vendor-build` · `build` · `kiem:dist`. Chạy đủ bộ — bài học #3.
6. `vi.json` vẫn đúng 5 khoá, `kiem:dist` vẫn báo `bản dịch vi.json — 5/5 có mặt`, và
   `git status --short` không thấy `src/board/vi.json`.
