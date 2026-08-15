# Thiết kế: quy tắc cho chuỗi không tới `dist/` (chặng P1-C)

Ngày: **2026-08-15**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch.

Chặng trước: `2026-08-14-bo-sung-vi-json-design.md` (cơ chế thay chuỗi D12 theo vị trí cú pháp, đã
thi hành xong và đã gộp ở `d24ee83`).

---

## 1. Vấn đề — vùng im lặng giữa hai cổng

Hai cổng của D12 đặt hai yêu cầu khác nhau, và giữa chúng có một vùng không cổng nào nói ra:

| Cổng | Đòi gì | Với chuỗi thuộc gói chưa bật |
|---|---|---|
| Cổng 3 (`dich-chuoi-vendor.mjs`) | mỗi khoá `vi.json` phải dịch được ở đâu đó trong 2.550 file | **THOẢ** |
| Luật C (`kiem-dist.mjs`) | mỗi bản dịch phải có mặt trong `dist/` | **KHÔNG THOẢ** |

Tức tồn tại một lớp chuỗi **"dịch được nhưng không được phép dịch"**: bước dịch thay nó thành công
ở `.vendor-build/`, rồi rolldown tree-shake nguyên gói chứa nó vì gói đó chưa được nối vào
`src/board/extensions.ts`.

Khi ai đó thêm nhầm một khoá như vậy, luật C đỏ với thông báo nêu **hai** nguyên nhân:

> *"bước dich-chuoi-vendor không chạy (kiểm dung-vendor.mjs), hoặc thượng nguồn đã chuyển chuỗi
> sang một vị trí cú pháp ngoài danh sách cho phép"*

**Cả hai đều sai.** Bước dịch đã chạy, vị trí cú pháp vẫn nằm trong danh sách. Người đọc thông báo
sẽ đi dựng lại `.vendor-build/` (vô ích) rồi đi soi `luat-vi-tri-dich.mjs` (vô ích), trong khi việc
cần làm là **gỡ khoá đó khỏi `vi.json`**.

Đây đúng bài học #2 của dự án ở dạng nguy hiểm hơn: không phải cổng xanh mà sai, mà là **cổng đỏ
đúng chỗ nhưng sai lý do** — nó đẩy người sửa đi đúng hướng ngược lại.

Chặng này chỉ làm một việc: **khi luật C đã đỏ, nói đúng nguyên nhân.** Nó không thêm khoá dịch
nào, không đổi hành vi xanh/đỏ của bất kỳ cổng nào.

---

## 2. Số đo — ĐÍNH CHÍNH §2.3 của spec P1-B

### 2.1 Repo đang có ba con số khác nhau cho cùng một đại lượng

| Nơi ghi | Ứng viên | Tới `dist/` | Không tới |
|---|---|---|---|
| Spec P1-B §2.3 | 391 | 275 | **116** |
| Spec P1-B §5.1 | 444 | 323 | **121** |
| `scripts/kiem-dist.mjs:20` (comment) | — | — | **121** |

§5.1 đã tự ghi rằng §2.3 là "ước lượng của lượt đo sớm bằng regex", nhưng §2.3 **vẫn nằm nguyên đó**
với bộ số cũ, và comment của `kiem-dist.mjs` chép bộ thứ hai. Một đại lượng, ba con số, không chỗ
nào ghi ngày đo.

### 2.2 Đo lại — phương pháp

Đo ngày **2026-08-15**, trên cây `.vendor-build/` và `dist/` vừa dựng lại từ đầu ở cùng một máy
(`npm ci && npm run dung:vendor && npm run build`, bảy cổng xanh).

1. **Bề mặt ứng viên** — duyệt cả 2.550 file `.js` của `.vendor-build/` bằng `ts.createSourceFile`,
   nhận một literal là ứng viên khi và chỉ khi `viTriHienThi(node)` **của chính module sản xuất**
   (`scripts/luat-vi-tri-dich.mjs`) trả về khác `null`. Không regex, không bộ lọc phụ.
2. **Chunk bảng vẽ trong `dist/`** — nhận theo **mật độ `drt-` ≥ 100**, đúng dấu hiệu luật C dùng.
   Đo được 2/12 file: `assets/EdgelessBoard-*.js` và `assets/EdgelessBoard-*.css`.
3. **"Tới được"** — chuỗi xuất hiện **trọn vẹn bên trong một literal có dấu nháy** (`"…"`, `'…'`,
   `` `…` ``) trong chunk bảng vẽ.

### 2.3 Kết quả

| | Spec §2.3 (cũ) | Spec §5.1 (cũ) | **Đo lại 2026-08-15** |
|---|---|---|---|
| Chuỗi phân biệt ở vị trí cho phép | 391 | 444 | **1.205** |
| Tới được chunk bảng vẽ | 275 | 323 | **899** |
| **KHÔNG tới** | 116 | 121 | **306** |

Tổng lượt (không khử trùng lặp): **2.171** trên 2.550 file.

Cả hai bộ số cũ **thấp hơn thực tế khoảng ba lần**. Nguyên nhân: lượt đo sớm lọc "chuỗi viết hoa
chữ đầu", còn luật sản xuất không có bộ lọc đó.

### 2.4 Phép so khớp lỏng làm sai lệch 70 chuỗi — và vì sao chi tiết này quan trọng

Cùng một cây, cùng một `dist/`, chỉ đổi phép so khớp:

| Phép so khớp | Tới được | Không tới |
|---|---|---|
| `noiDung.includes(chuoi)` — **đúng phép luật C đang dùng** | 969 | 236 |
| Chuỗi nằm trọn trong một literal có nháy | **899** | **306** |

Phép lỏng đếm thừa **70 chuỗi**. Thủ phạm là các chuỗi ngắn: 13 chuỗi dưới 3 ký tự và 99 chuỗi dưới
5 ký tự được tính là "có mặt", gồm `"="`, `"≠"`, `"x"`, `"y"`, `"on"`, `"is"`, `"PDF"` — chúng khớp
ngẫu nhiên vào mã đã minify, không phải vì gói của chúng vào được bản build.

Con số **306** của phép chặt **tái lập chính xác** con số 306 mà lượt đo trong `HANDOFF.md` mục 11
ghi được bằng một script khác (script đó không được giữ lại). Hai lượt đo độc lập cho cùng kết quả
ở đại lượng quan trọng nhất của chặng này. Bề mặt ứng viên lệch 9 chuỗi (1.205 so với 1.196) và
toàn bộ 9 chuỗi đó rơi vào nhóm "tới được" (899 so với 890); chênh lệch nằm ở chi tiết phương pháp
của lượt đo cũ, không tái dựng được vì script đã mất. **Không chặn chặng này** — số quyết định là
306 và nó đã khớp.

### 2.5 306 chuỗi không rải rác — chúng dồn theo GÓI

Phân bố của 306 chuỗi không tới, theo gói (thư mục có `package.json` gần nhất), 20 gói đầu:

```
 33 affine/blocks/embed          12 affine/widgets/drag-handle    7 affine/inlines/link
 33 affine/blocks/embed-doc      12 affine/fragments/outline      7 affine/gfx/template
 19 affine/fragments/frame-panel 10 affine/blocks/attachment      6 affine/inlines/reference
 19 affine/widgets/slash-menu    10 affine/blocks/code            6 affine/blocks/callout
 15 affine/widgets/linked-doc     9 affine/blocks/bookmark        6 affine/blocks/latex
 14 affine/blocks/table           9 affine/blocks/surface-ref     4 affine/blocks/image
```

Đây là nguyên các tính năng bị `src/board/extensions.ts` cắt bỏ (22/58 view extension được giữ).
`affine/gfx/template` và `affine/inlines/*` khớp đúng phần mở đầu `extensions.ts` tự khai: hai gfx
bị bỏ là template và link, và **toàn bộ** 7 inline extension đều vắng.

**Tính dồn cụm này là điều làm chẩn đoán khả thi**: biết một chuỗi thuộc gói nào là gần như biết
luôn vì sao nó không tới.

### 2.6 Bề mặt 1.205 không phải "số chuỗi cần dịch"

Nó có lẫn thứ rõ ràng không phải chữ hiển thị: `"4_Content & Media@3"`, `"bookmark"`, `"PDF"`,
`"="`, `"x"`. Con số này là **bề mặt kỹ thuật** của luật vị trí, không phải khối lượng công việc
dịch. Việc chốt danh sách chuỗi cần dịch là chặng riêng, không thuộc phạm vi ở đây.

---

## 3. Quyết định

### 3.1 Ba quyết định chủ dự án đã chốt

**1. Từ chối, và nói rõ vì sao.** Thêm khoá `vi.json` cho một chuỗi thuộc nhóm 306 là **lỗi soạn
bảng dịch**, không phải trường hợp cần hỗ trợ. Thông báo phải nói thật: chuỗi nằm trong gói chưa
bật ở `extensions.ts` nên không tới người dùng, dịch nó là công không. Muốn dịch thì **bật tính
năng trước** — đúng thứ tự.

**2. KHÔNG có danh sách miễn.** YAGNI: chưa có ca thật nào cần dịch trước một chuỗi thuộc tính năng
chưa bật. Một cơ chế miễn không ai dùng là gánh nặng bảo trì, và tệ hơn, là cửa để về sau nhét khoá
vào cho cổng xanh — đúng thứ mà comment của `MIEN` (luật B) đã cảnh báo bằng chữ.

**3. Hướng A — soi `.vendor-build/` trên ĐƯỜNG ĐỎ, quét theo giá trị TIẾNG VIỆT.**

Hai hướng đã loại:

| Hướng | Vì sao loại |
|---|---|
| Đọc `bao-cao-dich.json` | Nhanh hơn, nhưng ghép luật C vào **lời tự khai của chính bộ thay chuỗi**. Cổng độc lập ở Task 4 của P1-B sinh ra chính vì lý do ngược lại; đi ngược nó ở đây là tự tháo một tính chất đã trả giá để có |
| Chỉ thêm nguyên nhân thứ ba vào chữ thông báo | Rẻ nhất, nhưng để người đọc tự mò giữa **ba** khả năng, trong khi phân biệt được chỉ tốn một phép quét trên đường vốn đã hỏng |

Hướng A được ba điểm: **độc lập** (tính lại từ cây thật), **chỉ tốn khi đỏ** (đường xanh không quét
gì), và `.vendor-build/` chắc chắn có mặt vì `prebuild` đã chạy `kiem-vendor-build` trước đó.

**Phải quét theo TIẾNG VIỆT, không phải tiếng Anh.** Sau khi bước dịch chạy, bản gốc tiếng Anh đã
biến mất khỏi đúng những chỗ đó — quét tiếng Anh sẽ không thấy gì và kết luận ngược.

Đã kiểm chứng cơ chế trên cây thật ngày 2026-08-15: quét 5 giá trị tiếng Việt hiện có tìm được
**5/5**, và gói quy ra được (`affine/gfx/mindmap`, `affine/gfx/shape`, `affine/gfx/connector`)
khớp đúng danh sách file trong `bao-cao-dich.json`.

### 3.2 Hai quyết định bổ sung của chặng này

**4. Gói = thư mục tổ tiên gần nhất có `package.json`.** Không cắt N đoạn đầu đường dẫn, không giữ
danh sách tên nhóm chép tay. Lý do: cây có **hai** độ sâu gói (`affine/all` nhưng
`affine/blocks/attachment`), nên cắt cứng 3 đoạn là sai với 8 gói. Bước 3 của `dung-vendor.mjs` đã
chép sẵn **70 `package.json`** vào `.vendor-build/`, nên dấu hiệu này tự cập nhật khi nâng cấp cây
vendored. Một danh sách chép tay sẽ mục ngay lần nâng cấp sau — đúng cảnh báo mở đầu
`extensions.ts` về danh sách 36 mục bị bỏ.

**5. Sửa cả ba chỗ số liệu về một bộ duy nhất, và bỏ số ra khỏi comment mã nguồn.** §2.3 và §5.1
của spec P1-B được đính chính bằng bộ số §2.3 ở trên, kèm ngày đo và phương pháp. Comment ở
`kiem-dist.mjs:19-22` thì **bỏ hẳn con số** (viết "một phần chuỗi ứng viên bị tree-shake" thay cho
"121 chuỗi ứng viên bị tree-shake"): một con số nằm trong comment mã nguồn chỉ có một tương lai là
mục đi mà không ai biết, và nó không gánh vai trò gì trong logic của luật C.

---

## 4. Kiến trúc

Theo đúng khuôn đã dựng ở P1-B: **phần thuần tách khỏi phần vào-ra**, phần thuần có ca kiểm riêng.

| File | Trạng thái | Việc |
|---|---|---|
| `scripts/tim-ban-dich-vendor.mjs` | **mới** | Tra cứu: cho gốc cây `.vendor-build/` và tập bản dịch cần tìm → trả về mỗi chuỗi thấy ở file nào, gói nào. Không in gì, không `process.exit`. |
| `scripts/tim-ban-dich-vendor.d.mts` | **mới** | Khai kiểu, để ca kiểm `.ts` import được mà `tsc --noEmit` vẫn xanh (cùng lý do `luat-vi-tri-dich.d.mts` tồn tại). |
| `scripts/kiem-dist.mjs` | sửa | Gọi module trên **chỉ khi `thieuBanDich.size > 0`**, rồi soạn thông báo theo ba kết cục ở §5. |
| `src/__tests__/vendor-tim-ban-dich.spec.ts` | **mới** | Ca kiểm cho module thuần. Đặt dưới `src/__tests__/` chứ không cạnh script: `vite.config.ts` khai `include: ['src/**/__tests__/**/*.spec.ts']`, nên một file spec đặt trong `scripts/` sẽ **không bao giờ được chạy** — cổng xanh vì không có ca nào, đúng lớp lỗi #8. Tiền lệ: `src/__tests__/vendor-dich.spec.ts` kiểm `scripts/luat-vi-tri-dich.mjs` theo đúng cách này. |

### 4.1 Dùng lại `dietJs`, không viết bộ duyệt thứ hai

Module quét bằng `dietJs` của `scripts/duyet-cay-js.mjs` — **đúng bộ duyệt mà
`dich-chuoi-vendor.mjs` dùng để ghi bản dịch vào cây**. Hai bên hỏi cùng một câu về cùng một cây thì
phải duyệt cùng một cách; để chúng lệch nhau là mời một lớp lỗi mà không cổng nào bắt. Đây đúng lý
do `duyet-cay-js.mjs` được tách ra dùng chung ở Task 1 của P1-B, và header file đó đã ghi lý do
bằng chữ.

`kiem-dist.mjs` giữ nguyên bộ duyệt riêng của nó cho `dist/` — khác cây, khác bộ lọc đuôi file,
không gộp.

### 4.2 Giao diện của module

Hai hàm, mỗi hàm một việc:

- **`goiCuaDuongDan(rel, gocGoi)`** — thuần, không chạm đĩa: đường dẫn tương đối + tập gốc gói →
  tên gói, hoặc `null` khi không nằm dưới gói nào.
- **`timTrongCayVendor(goc, canTim)`** — bất đồng bộ: duyệt cây, trả về `Map<chuỗi, Array<{file,
  gói}>>`. Chuỗi không thấy ở đâu **không có mặt** trong Map (chứ không phải có mặt với mảng rỗng)
  — để bên gọi không phải phân biệt hai cách biểu diễn của cùng một sự thật.

Tập gốc gói được dựng một lần lúc vào (`package.json` trong cây), không dựng lại cho từng file.

---

## 5. Ba kết cục và thông báo tương ứng

Chạy sau khi luật C đã xác định `thieuBanDich` khác rỗng.

### 5.1 Thấy giá trị tiếng Việt trong `.vendor-build/`

Bước dịch **đã chạy** và **đã thay đúng chỗ**. Chuỗi mất ở `dist/` vì mã chứa nó bị tree-shake.

Thông báo, cho mỗi bản dịch thiếu (mẫu chữ — chuỗi và đường dẫn dưới đây chỉ để minh hoạ định dạng,
không phải một ca đã đo):

```
"Chèn ảnh"
   đã dịch ở affine/blocks/image/src/toolbar/config.js
   gói affine/blocks/image không vào được bản build — thường vì chưa được bật trong
   src/board/extensions.ts, nên chuỗi này KHÔNG tới tay người dùng và dịch nó là công không.
   Cách sửa: gỡ khoá khỏi src/board/vi.json, HOẶC bật tính năng đó trước rồi mới dịch.
```

Câu chữ tách bạch **sự thật đo được** ("gói này không vào được bản build" — suy ra trực tiếp từ
chính hai phép đo vừa làm) khỏi **nguyên nhân thường gặp** ("thường vì chưa được bật trong
extensions.ts" — không đo, chỉ là chỉ dẫn). Nói quá lên thành "gói X chưa bật" là lặp lại đúng lỗi
mà chặng này sinh ra để sửa: khẳng định chắc nịch một nguyên nhân không đo.

### 5.2 Không thấy

Bản dịch chưa từng được đáp vào cây. Giữ nguyên hai nguyên nhân cũ (bước dịch không chạy / thượng
nguồn đã chuyển chuỗi ra ngoài danh sách vị trí cho phép) — với ca này chúng đúng.

### 5.3 Không có `.vendor-build/`

Không kết luận được. Nói thẳng là **chưa chẩn đoán được** kèm lệnh `npm run dung:vendor`, thay vì
im lặng rơi vào nhánh 5.2 và khẳng định một nguyên nhân không có căn cứ. Ca này không xảy ra trên
đường `npm run build` (vì `prebuild` chạy `kiem-vendor-build`), nhưng `kiem:dist` gọi tay được.

### 5.4 Một chuỗi trúng nhiều gói

Liệt kê **mọi** gói trúng, không tự chọn một cái. Ca này không phải giả thuyết: trong 5 khoá đang
ship, `"Style"` → `"Phong cách"` đã trải trên **ba** gói (`affine/gfx/connector`,
`affine/gfx/mindmap`, `affine/gfx/shape`); còn literal `"Frame"` đo được ở **bốn** gói
(`affine/blocks/frame`, `affine/blocks/surface-ref`, `affine/widgets/edgeless-selected-rect`,
`affine/blocks/root`) — một số đã bật, một số chưa. Tự chọn cái đầu tiên là đưa ra một kết luận mà
dữ liệu không đỡ. Báo sự thật đo được, để người đọc kết luận.

Giới hạn in **3 file mỗi chuỗi** kèm đếm phần còn lại, để một lượt đỏ 50 khoá không đẩy thông báo
thật ra khỏi màn hình.

---

## 6. Vì sao chẩn đoán này KHÔNG THỂ đẻ ra "cổng xanh rỗng tuếch"

Bốn trong mười một lỗi mà vòng review P1-B bắt được (#8–#11) đều cùng một lớp: cổng báo "đã kiểm"
trong khi không kiểm được gì. Đây là lớp lỗi đắt nhất của dự án này.

Ở chặng này lớp đó **bị loại bằng kết cấu, không bằng ca kiểm**: đoạn mã mới chỉ chạy sau khi
`loi++` đã xảy ra, và chỉ ảnh hưởng tới **chữ** của một lượt `process.exit(1)` đã chắc chắn xảy ra.
Chẩn đoán hỏng, quét rỗng, cây rỗng, module ném lỗi — cổng vẫn đỏ, exit code vẫn 1. **Không có
đường đi nào từ mã mới tới một lượt exit 0.**

Đây là lý do phép quét **không** được đưa lên đường xanh để "chặn sớm" chuỗi thuộc gói chưa bật:
làm thế là dựng một cổng mới, và một cổng mới thì lại phải tự chứng minh nó không xanh rỗng — thêm
đúng loại rủi ro mà hướng hiện tại không có. Cổng 3 và luật C đã đủ để chặn; chặng này chỉ sửa lời.

---

## 7. Xử lý lỗi

Rủi ro thật duy nhất: phép quét ném lỗi (quyền đọc, cây hỏng giữa chừng, hết bộ nhớ) → `kiem-dist`
chết bằng stack trace thay vì thông báo D12 sạch sẽ, và người đọc mất luôn cả thông tin cũ.

Bọc lời gọi trong `try/catch`. Hỏng thì in thông báo của §5.2 kèm một dòng *"chẩn đoán bổ sung không
chạy được: <lý do>"*. Cổng vẫn đỏ, exit code không đổi.

Đây là chỗ **fail-open là đúng**, ngược với `?? []` bị cấm trong `luat-vi-tri-dich.mjs`. Khác biệt:
ở đó fail-open biến "mất khả năng kiểm" thành "coi như không có lỗi" trên đường xanh; ở đây kết quả
xấu nhất là thông báo nghèo hơn trên một cổng **đã đỏ rồi**.

---

## 8. Chi phí

Chỉ trên đường đỏ. Cây 2.550 file; `dich-chuoi-vendor.mjs` duyệt và **phân tích AST** toàn cây
trong khoảng 2 giây, còn phép quét này chỉ đọc chuỗi con nên rẻ hơn. Đường xanh không đọc thêm một
byte nào.

---

## 9. Kiểm thử

Module thuần, ca kiểm dựng cây giả trong thư mục tạm rồi xoá.

| # | Ca | Canh cái gì |
|---|---|---|
| 1 | Gói ở độ sâu 2 (`affine/all`) và độ sâu 3 (`affine/blocks/table`) | Phép suy gói đúng ở cả hai hình dạng có thật trong cây |
| 2 | File không nằm dưới `package.json` nào | Trả `null`, không ném, không đoán bừa |
| 3 | Thấy chuỗi tiếng Việt | Trả đúng file + gói |
| 4 | Không có chuỗi nào | Chuỗi vắng mặt khỏi Map |
| 5 | **Một chuỗi ở HAI gói** | Trả **cả hai**. Đây là ca mà `find` thay cho `filter` sẽ lặng lẽ trượt, và §5.4 phụ thuộc vào nó |
| 6 | Gói lồng trong gói (`package.json` ở cả tổ tiên gần và xa) | Chọn cái **gần nhất**, không phải cái đầu tiên gặp khi duyệt từ gốc. Đo 2026-08-15: cây hiện tại **không có** hình dạng này — đây là ca ghim HỢP ĐỒNG của hàm, không phải ca tái hiện cây thật. Giữ vì nó rẻ và vì thượng nguồn có thể đẻ ra hình dạng đó bất cứ lúc nào |
| 7 | Cây không tồn tại | Ném lỗi phân biệt được, để `kiem-dist` bắt và hạ cấp thông báo theo §7 |

Ngoài ra, một ca ở mức `kiem-dist.mjs` khó dựng rẻ (cần một `dist/` thật) — thay vào đó, **bằng
chứng đỏ bắt buộc khi thi hành**: thêm tay một khoá thuộc nhóm 306 vào `vi.json`, dựng lại, chạy
`npm run build`, và **chép nguyên văn thông báo thật vào báo cáo task**. Chỉ nhận thông báo đã in
ra thật; không nhận suy luận từ mã.

Mỗi ca trong bảng phải **thật sự đỏ trước khi có mã sửa**. Ca xanh ngay từ đầu là ca không canh gì
— đúng lỗi #8 của vòng review P1-B.

---

## 10. Đính chính tài liệu

| Chỗ | Sửa gì |
|---|---|
| Spec P1-B §2.3 | Thay bảng 391/275/116 bằng bộ đo 2026-08-15 (§2.3 tài liệu này), ghi rõ phương pháp và ngày; giữ lại số cũ trong một dòng ghi chú để người đọc bản in cũ không tưởng mình nhớ nhầm |
| Spec P1-B §5.1 | Bỏ mệnh đề "444/323 mới là số đúng" — nó cũng sai; trỏ sang §2.3 đã đính chính |
| `scripts/kiem-dist.mjs:19-22` | Bỏ con số "121" khỏi comment (§3.2 quyết định 5) |

---

## 11. Ngoài phạm vi

**Không thêm khoá dịch nào.** `vi.json` vẫn đúng 5 khoá sau chặng này.

**Không đổi phép so khớp của luật C** — dù §2.4 đo được rằng phép `includes` hiện tại đếm thừa 70
chuỗi so với phép "nằm trong literal có nháy". Lý do hoãn: đổi nó là **đổi hành vi xanh/đỏ của một
cổng**, tức một chặng khác về bản chất với chặng "sửa lời của một cổng đã đỏ", và phải có bằng
chứng đỏ riêng.

Nhưng đây là **nợ đã đo được, không phải phỏng đoán**, và nó sẽ đắt lên ở chặng 323 chuỗi: luật C
hỏi "bản dịch có mặt trong chunk không" bằng `includes`, nên một bản dịch ngắn là **chuỗi con của
một bản dịch khác** (`"Tô"` trong `"Tô màu"`) sẽ được tính là có mặt kể cả khi chỗ của chính nó đã
bị tree-shake. Ở 5 khoá tiếng Việt phân biệt hiện nay thì chưa lộ; ở vài trăm khoá thì đây đúng
dạng lỗi #11 ("so khớp mù phạm vi") ở một trục khác. **Phải xử trước khi thêm khoá hàng loạt.**

**Không chốt danh sách chuỗi cần dịch**, không chốt bảng thuật ngữ. Bề mặt 1.205 là số kỹ thuật,
không phải khối lượng dịch (§2.6).

**Không đụng `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự sửa.

---

## 12. Tiêu chí xong

1. `scripts/tim-ban-dich-vendor.mjs` + khai kiểu + 7 ca kiểm ở §9, mỗi ca có bằng chứng đỏ đã thật
   sự chạy và thật sự đỏ.
2. `kiem-dist.mjs` phân biệt được ba kết cục ở §5, kèm **thông báo thật đã in ra** chép vào báo cáo
   task (không phải suy luận từ mã).
3. Ba chỗ số liệu ở §10 đã sửa về một bộ duy nhất có ngày đo.
4. **Bảy cổng xanh**: `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
   `kiem:vendor-build` · `build` · `kiem:dist`. Chạy đủ bộ, không tin tiêu chí xong hẹp của từng
   task — bài học #3.
5. `vi.json` vẫn đúng 5 khoá, và `kiem:dist` vẫn báo `bản dịch vi.json — 5/5 có mặt`.
