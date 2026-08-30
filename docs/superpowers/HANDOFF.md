# BÀN GIAO

Cập nhật **2026-08-30**. Đọc hết file này trước khi làm bất cứ việc gì; nó dài đúng bằng những thứ
còn đang mở cộng những luật đã phải trả giá mới có.

Hồ sơ 42 chặng đã xong nằm ở **[`NHAT-KY-CHANG.md`](NHAT-KY-CHANG.md)** (4.000+ dòng). Tra bên đó
khi cần biết *vì sao* một quyết định được đưa ra, hoặc khi định thử một hướng nghe có vẻ hay — rất
có thể nó đã được thử và đã hỏng, kèm phép đo chứng minh.

> **"HANDOFF mục N" trong mã nguồn và trong `specs/` trỏ tới NHẬT KÝ, không phải file này.** Hàng
> chục chú thích rải khắp `src/` và `docs/superpowers/specs/` viết "xem HANDOFF mục 39" từ thời hai
> nội dung còn nằm chung một file. Chúng **không được sửa** khi tách: một hồ sơ lịch sử ghi lại điều
> tác giả tham chiếu tại thời điểm viết, sửa hàng loạt là làm sai lệch chính bản ghi đó. Cứ thấy
> "HANDOFF mục &lt;số&gt;" thì mở `NHAT-KY-CHANG.md` — đánh số mục ở đó giữ nguyên vẹn.

> **LUẬT ĐỌC FILE NÀY.** Một danh sách nợ **không tự già đi cùng mã nguồn**. Trước khi lập kế hoạch
> dựa trên bất kỳ mục nào bên dưới, mở mã nguồn kiểm lại từng dòng — lượt 2026-08-29 phát hiện 3
> trong 5 khoản của danh sách nợ cũ đã đóng từ lâu mà không ai cập nhật (nhật ký, mục 39.1).

---

## 1. ĐANG MỞ

### 1.1 Bàn phím ảo iOS — VIỆC CẦN LÀM: chủ dự án chạy bàn thử lượt 2 trên iPhone

> **→ Mở trên iPhone thật:** https://claude.ai/code/artifact/d571d1fa-39fb-473e-b0cd-783b7685d72b
> Cuộn lên phần các phép thử (phía TRÊN "Bảng luận giải"). Bấm chạy từng phép, xem bàn phím có
> bật lên không, báo **G / E / F / H** mỗi phép ✓ hay ✗. **G TRƯỚC** — G ✗ thì dừng, chụp bảng
> "Máy anh báo gì" ở cuối trang, mọi ✗ khác vô nghĩa.
>
> ⚠️ 2026-08-30: hai ảnh chủ dự án gửi đầu tiên là **"Bảng luận giải"** (phần *giải thích nếu*
> mỗi tổ hợp ra thế nào thì nghĩa gì) + probe môi trường, **không phải kết quả thật**. Chưa có
> phép nào được chạy. `visualViewport` CÓ trong probe chỉ nói API tồn tại — G mới là đối chứng
> dương thật.

Chạm vào bảng vẽ trên iPhone không hiện bàn phím. Gốc rễ đã xác định từ 2026-08-18 (nhật ký mục 7):
mọi lệnh gọi `focusTextModel()` trong cây vendored đều bị hoãn qua `requestAnimationFrame`/`.then()`,
mà Safari iOS chỉ mở bàn phím khi `.focus()` chạy **đồng bộ trong handler cử chỉ**. Đây là kiến trúc
xuyên suốt thượng nguồn, không phải một dòng lệch vá được — nên đụng vào là đụng luật D11.

Hướng B (bọc ở tầng React, ô mồi `contenteditable` ẩn) đã cài, nghiệm thu trên iPhone: **không
được**, đã gỡ sạch (nhật ký mục 37). Ba giả thuyết bị loại bằng phép đo, đừng thử lại.

**Trạng thái:** bàn thử lượt 1 (4 phép A/B/C/D) cho **cả bốn đều ✗** — nhưng KHÔNG kết luận được gì
vì lượt 1 thiếu **đối chứng dương**: không phép nào chứng minh phép đo *có khả năng* bắt được bàn
phím trên máy đó. "Cả bốn ✗" có hai cách đọc không phân biệt được — thật sự không mở được, hoặc
phép đo mù. Cùng lớp lỗi với "18 ca kiểm xanh cho thứ không chạy trên máy thật" (mục 37).

Bàn thử lượt 2 thêm đối chứng dương **G** và tách ba biến chưa ai đụng: cả bốn phép lượt 1 đều dùng
`contenteditable` **và** đều giấu phần tử — hai thứ dính nhau nên không biết cái nào có tội.

| Phép | Biến số | Nếu ✗ nghĩa là |
|---|---|---|
| **G** | chạm thẳng `<input>` hiện rõ, không script | phép đo mù — mọi kết quả khác vô nghĩa, kể cả lượt 1 |
| **E** | `<input>` hiện rõ, `focus()` script trong `touchend` | Safari cấm hẳn mở bàn phím bằng script |
| **F** | `<input>` đẩy ngoài khung nhìn, `focus()` script | phần tử phải nằm trong khung nhìn mới focus được |
| **H** | `<input>` trong suốt **dưới ngón tay**, trong khung nhìn | hình dạng app thật sự cần cũng không chạy |
<<<<<<< Updated upstream

**Nếu G ✓ E ✓ F ✓** → thủ phạm lượt 1 là **`contenteditable`**, không phải cách giấu — cài lại bằng
ô nhập thật rồi chuyển chữ vào canvas.
**Nếu G ✓ E ✗** → Safari cấm hẳn `focus()` script; đường còn lại vẫn là ô nhập THẬT dưới ngón tay để
chính cú chạm của người dùng mở bàn phím, không nhờ script.

**Tiền lệ cùng gốc:** ô đổi tên bảng ("gõ tên bị nối đuôi" trên iOS, đã đóng 2026-08-29) vá bằng
đúng nguyên tắc này — bỏ chỗ dựa `select()`, ô **RỖNG** + `placeholder`, vì cú chạm mở bàn phím của
người dùng đặt lại caret và huỷ vùng chọn do script tạo. Dù E ✓ hay ✗, hướng cài lại bàn phím ảo
đều là: một ô nhập THẬT dưới ngón tay, để chính cú chạm mở bàn phím.
=======
>>>>>>> Stashed changes

**Nếu G ✓ E ✓ F ✓** → thủ phạm lượt 1 là **`contenteditable`**, không phải cách giấu — cài lại bằng
ô nhập thật rồi chuyển chữ vào canvas.
**Nếu G ✓ E ✗** → Safari cấm hẳn `focus()` script; đường còn lại vẫn là ô nhập THẬT dưới ngón tay để
chính cú chạm của người dùng mở bàn phím, không nhờ script.

**Tiền lệ cùng gốc:** ô đổi tên bảng ("gõ tên bị nối đuôi" trên iOS, đã đóng 2026-08-29) vá bằng
đúng nguyên tắc này — bỏ chỗ dựa `select()`, ô **RỖNG** + `placeholder`, vì cú chạm mở bàn phím của
người dùng đặt lại caret và huỷ vùng chọn do script tạo. Dù E ✓ hay ✗, hướng cài lại bàn phím ảo
đều là: một ô nhập THẬT dưới ngón tay, để chính cú chạm mở bàn phím.

### 1.2 Thẻ ghi chú không vào được PNG xuất ra — ĐÃ ĐÀO TỚI ĐÁY, chặn ở tầng kiến trúc

`src/board/xuatAnhBang.ts` dựng ảnh từ tài liệu CRDT và **chỉ vẽ phần tử canvas** (nét vẽ, hình,
đường nối, chữ, node mindmap). Khối edgeless (thẻ ghi chú, ảnh chèn) là DOM thật, muốn vào ảnh phải
qua `html2canvas`. Ba lượt đào, tất cả 2026-08-30. **Đừng lặp lại** — mọi giả thuyết dễ nghĩ ra đều
đã bị loại bằng phép đo.

**1. `ExportManager.edgelessToCanvas()` của cây vendored trả `undefined` 100% lượt gọi.** Nó mở đầu
bằng `rootComponent.querySelector('.affine-block-children-container')` (sau đổi tên D16 là
`.drt-block-children-container`) và `return` ngay nếu không thấy — mà root edgeless bản này KHÔNG
BAO GIỜ dựng phần tử đó (`<drt-edgeless-root>` chỉ có `.edgeless-background`,
`.drt-edgeless-surface-block-container`, `.edgeless-mount-point`, `.widgets-container`, kể cả khi
đã có khối note). Phần tử đó chỉ dùng để đọc một màu nền. **Vá được** qua pipeline
`scripts/doi-ten-vendor.mjs` (D11 cho phép sửa hành vi ở pipeline) — nhưng vá xong chỉ dẫn vào
đúng đường html2canvas dưới đây, nên không giải quyết gì.

**2. Mỗi khối một lượt html2canvas: quá đắt.** Đo trên một thẻ ghi chú THẬT (tạo bằng thanh công cụ,
400×92, dev build, máy để bàn): **7,9s → 6,9s → 4,6s** cho ba lượt liên tiếp, chạm đáy ~5 giây MỖI
KHỐI. `foreignObjectRendering: true` không cứu (8,6s). Nguyên nhân: html2canvas nhân bản cả tài liệu
kèm **~298 thẻ `<style>`** mà chunk bảng vẽ tiêm vào `<head>`, cho mỗi lượt gọi.

**3. MỘT lượt html2canvas cho cả lớp khối: rẻ, nhưng không có gì để chụp.**
Phần chi phí giải quyết xong hẳn: một lượt chụp phần tử viewport kèm `ignoreElements` cắt `<canvas>`
và mọi cây widget/toolbar đo được **1272ms nguội, 387–568ms ấm** — rẻ hơn một bậc; và trên BẢNG ĐANG
MỞ, ảnh chụp chứa đúng thẻ ghi chú kèm chữ, không dính widget.
Nhưng đường xuất mở bảng NGẦM, và **trình soạn thảo ngầm không bao giờ render khối note**:
`<drt-edgeless-note>` lên `block-active` nhưng `offsetWidth` vẫn **0 và `children.length` = 0** suốt
cả 1,5 giây chờ — không phải chuyện thời gian. `.block-idle` mang `contain: size layout style`
(framework/std/src/gfx/viewport-element.ts) nên khối chưa kích hoạt đo ra đúng 0×0 và html2canvas
trên cây đó cho ảnh trống.
**Đã loại bằng phép đo:** hộp chứa đặt ở `left:-20000px` (đưa vào trong khung nhìn, `opacity:0` —
không đổi); chờ lâu hơn; pane trình duyệt bị ẩn (đưa ra trước — không đổi); `setViewportByBound`
chưa chạy (đã chạy, khối nằm trong `viewportBounds` — vẫn idle).

**Ba ngõ cụt phụ, cũng đã đo:**
- `.edgeless-mount-point` cao ĐÚNG 0px — khối là con định vị tuyệt đối thoát ra ngoài nó, không có
  hộp chung nào bọc riêng lớp khối để chụp.
- Không loại được `.edgeless-background` khỏi ảnh chụp: nó là TỔ TIÊN của lớp khối, loại nó thì ảnh
  ra rỗng hoàn toàn (0,00% pixel đục). May là vô hại — html2canvas không dựng lưới chấm
  (`radial-gradient`), vùng nền phẳng đúng một màu và bằng đúng `backgroundColor` mà lượt tô nền
  hiện tại đang dùng (mẫu 300×200: đúng 1 màu). Không có đường ghép.
- Khối tạo bằng `store.addBlock()` trần **không render** (`visibility:hidden`, rỗng) — mọi số đo
  trên nó vô nghĩa, phải tạo thẻ bằng thanh công cụ thật.

**Kết luận:** chặn KHÔNG nằm ở chi phí html2canvas (đã giải xong) mà ở chỗ một trình soạn thảo
edgeless dựng ngầm không kích hoạt khối note. Muốn đóng hẳn phải đổi KIẾN TRÚC. Hai hướng còn lại,
mỗi hướng một cái giá:
1. Chụp lớp khối **lúc người dùng đang mở bảng** (nơi khối render thật — đã đo), lưu làm lớp phụ rồi
   ghép vào lúc xuất. Giá: ảnh thẻ ghi chú có thể cũ hơn nét vẽ nếu sửa xong không mở lại bảng, và
   tốn thêm chỗ lưu cho lớp raster đó — đúng loại nợ mà cơ chế `anhXemTruoc` cũ từng sinh ra.
2. Đưa mục xuất trở lại MÀN VẼ (bảng đang mở, khối đã render). Giá: đảo ngược yêu cầu 2026-08-27 của
   chủ dự án là dồn xuất về menu "⋯" ở lưới.

Hiện app **báo thẳng** khi bảng có khối ("Đã xuất PNG — nét vẽ và hình khối. Thẻ ghi chú chưa vào
được ảnh."), không im lặng.

### 1.3 Deploy Vercel chậm thêm vài phút mỗi lần

`postinstall` dựng lại `.vendor-build/` từ đầu mỗi lần (checkout CI luôn sạch). Cân nhắc cache qua
Vercel Build Cache API **nếu** độ chậm thành vấn đề thật — hiện chưa cần, chỉ theo dõi.

---

## 2. LUẬT THAO TÁC — mỗi dòng ở đây là một lượt đã mất

Không phải phong cách. Đây là những lỗi đã thật sự làm hỏng một kết luận, nhiều cái lặp lại vài lần
trước khi được viết ra.

### 2.1 Lấy bằng chứng từ lệnh chạy

- **KHÔNG BAO GIỜ nối `| tail`** khi chạy bộ test. Vitest in chi tiết ca đỏ **trước** khối tổng kết
  nên `tail` vứt đúng phần cần giữ; ống dẫn còn nuốt mã thoát. Ba lượt săn ca chập chờn hụt vì đúng
  lỗi này. Ghi ra file rồi **mở file đọc**.
- **Mã thoát chỉ có nghĩa khi lệnh cuối chuỗi chính là thứ cần đo.** `npx tsc … ; echo "exit=$?"`
  luôn báo 0 — đó là mã của `echo`. Ba commit đã mang một con số sai vì lỗi này. Đúng cách:
  ```bash
  npx tsc --noEmit -p tsconfig.json > log.txt 2>&1; MA=$?; echo "MÃ THOÁT THẬT = $MA"; cat log.txt
  ```
- **Đọc kết quả vitest phải nhìn đủ ba thứ**, thiếu một là đọc sai: (1) mã thoát thật, (2) dòng
  **`Test Files`** — đỏ-cấp-file không hiện ở dòng `Tests`, (3) **tổng số ca** so với lượt trước —
  tụt số ca mà không có ca đỏ nào nghĩa là có file không nạp được.
- **Đừng chạy `tsc` song song với `vitest`.** Lượt duy nhất gặp `UNKNOWN: unknown error, read`
  (đỏ cấp file, Windows I/O) là lượt chạy song song. Nếu nó quay lại thì **đó là tin tức** — ghi
  lại lượt đó, đừng chạy lại cho tới khi xanh.
- **Tắt dev server trước khi chạy suite.** Server thừa ăn CPU đã từng làm worker vitest timeout và
  bị đọc nhầm thành hồi quy thật.

### 2.2 Đo trên trình duyệt

- **Một con số tương phản chỉ có nghĩa kèm NỀN nó được đo trên.** Đã vấp ba lần. Con số 4,89:1 của
  một báo cáo đo trên nền thẻ trắng; áp lên pill chỉ còn 4,12:1. `--c-green` nghe hợp lý nhưng trên
  nền thật của badge chỉ đạt 4,34:1 — dưới sàn AA. Chép số phải chép cả nền.
- **Đo hình học trên phần tử có `transition` thì phải chờ quá thời lượng transition dài nhất.** Lượt
  đo đầu của một phép kiểm cho `marginTop: 0px` và suýt xác nhận nhầm một bản vá thừa — vì đo ở
  500ms trong khi `.disc-body` có `transition: max-height .28s, margin-top .22s`. Chờ 1200ms ra
  10px. In kèm giá trị đang chuyển động ra để tự soi.
- **Đo `backgroundColor` computed rơi xuyên gradient** xuống nền app và cho số AA giả — phân giải
  token nền bằng cách đi ngược cây cha tìm màu đục thật.
- **Kiểm phải VÀO RỒI RA.** Bấm vào, thoát ra, sang màn khác, quay lại — xem trạng thái có bị biến
  đổi vĩnh viễn không. "Mở lên chạy đúng" không đủ.
- **Kiểm bản build thì phải GỠ SERVICE WORKER trước.** `public/sw.js` đi cache-first cho chunk nạp
  chậm: `index.html` có hash mới nhưng chunk lazy vẫn lấy từ cache `drtrong-vNN`, nên đang đo mã CŨ.
  Đã mất hai lượt đo vì tin vào kết quả đó; dấu hiệu lộ ra là "lượt chạy kết thúc NHANH HƠN cả hạn
  giờ vừa thêm vào mã". Chạy trước mỗi lượt:
  `for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();`
  `for (const k of await caches.keys()) await caches.delete(k);` rồi mới nạp lại trang.
- **Đừng đợi `requestAnimationFrame` trong mã có thể chạy ở tab nền.** Trình duyệt ngừng bắn rAF khi
  tab ẩn — một lượt xuất ảnh treo vĩnh viễn ở đúng dòng đó. Dùng `setTimeout` cho các nhịp chờ layout.
- **Khối tạo bằng `store.addBlock()` trần KHÔNG render** (`visibility:hidden`, rỗng, không vào
  `.edgeless-mount-point`). Mọi số đo trên nó vô nghĩa — muốn đo thẻ ghi chú thật thì phải tạo bằng
  thanh công cụ. Và edgeless **cull** khối ngoài khung nhìn: khối bị cull đo ra 0×0.
- **Dọn sau khi đo:** xoá bảng/dữ liệu thử khỏi IndexedDB và localStorage, tắt dev server.

### 2.3 Tin vào ca kiểm tới đâu

- **Một ca kiểm xanh nhiều chặng liền vẫn có thể đang chứng minh một đường đi KHÁC với đường ghi
  trong chính lời bình luận của nó.** Hai ca "kéo" (Hình, Bút) xanh suốt nhiều tháng mà chưa bao giờ
  chạy qua đường kéo — chúng đi nhánh `click()`. Phát hiện ra nhờ viết ca cho một tính năng **thứ ba**.
- **Với thứ mà cơ chế quyết định nằm NGOÀI DOM** (bàn phím ảo, cử chỉ hệ điều hành, quyền): kiểm
  trên thiết bị thật **TRƯỚC** bằng bản dựng nhỏ nhất, rồi mới bọc ca kiểm quanh cái đã biết là
  chạy. Đã có lượt 18 ca kiểm xanh cho một tính năng không chạy trên máy thật.
- **Ca kiểm cho một cuộc đua phải được CHỨNG MINH LÀ ĐỎ trước khi vá.** Lượt đầu của ca "seed root
  trùng" xanh cả khi guard bị vô hiệu hoá — hai lần liền, vì hai lý do khác nhau: (a) độ trễ `pull`
  giả bị `waitForSynced()` nuốt trọn; (b) đếm ngay trên hai store vừa dựng, mà mỗi store chỉ thấy
  seed CỦA CHÍNH NÓ — bản trùng chỉ lộ ra ở lượt mở THỨ BA, sau khi CRDT hợp nhất. Ca kiểm không
  chứng minh được là đỏ thì không phải ca kiểm.
- **Xác minh finding trước khi sửa.** Đọc mã/đo DOM thật trước khi implement báo cáo của critique
  hay máy dò — tỉ lệ dương tính giả đã đo được là cao (2/6 một lượt; 4/9 một lượt khác).

### 2.4 Cây git dùng chung

Nhiều phiên có thể cùng chạy trên thư mục này. Đã xảy ra thật: một phiên khác commit **cuốn theo**
edit dở dang của phiên này trong cùng file.

- **Luôn `git status` TOÀN BỘ trước khi commit**, đừng giả định chỉ file mình vừa sửa là đang thay đổi.
- Thấy file lạ trong `status`: `git diff` nó trước. Nếu không phải việc của mình thì **không stage**.
- Cùng một file bị hai bên sửa thì tách hunk, đừng `git add` cả file.
- `resume` báo "no transcript" thì kiểm `git status`/`git diff` trước — subagent có thể đã làm đúng
  một phần trước khi chết.

---

## 3. CỔNG KIỂM

| Cổng | Lệnh | Canh gì |
|---|---|---|
| Kiểu | `npx tsc --noEmit -p tsconfig.json` | Cả `src/` + cây vendored qua `tsconfig.vendor-paths.json` |
| Test | `npx vitest run` | **54 file / 468 ca** |
| D11 | `npm run kiem:vendor` | Cây vendored khớp nguyên văn thượng nguồn, VÀ checkout thượng nguồn (`BLOCKSUITE_UPSTREAM`) còn ở SHA pin trong `commit-thuong-nguon.txt`. Lệch thì cổng tự in cảnh báo + lệnh dán-là-chạy **TRƯỚC** danh sách `LỆCH:` (logic: `scripts/doi-chieu-commit-thuong-nguon.mjs`). Đừng nâng cây vendored lên `canary` trừ khi thật sự cần một bản vá thượng nguồn — đó là việc lớn (dựng lại toàn bộ + pipeline dịch + kiểm hồi quy Mindmap). |
| Bản đồ paths | `npm run kiem:vendor-paths` | `tsconfig.vendor-paths.json` còn tả đúng `.vendor-build/` |

`npm run dung:vendor` dựng lại `.vendor-build/` + `bang-bam-vendor.json` + `tsconfig.vendor-paths.json`
(vài phút). Nó **không** kéo lại từ thượng nguồn, nên không sửa được lệch do checkout thượng nguồn
trôi khỏi SHA pin — cái đó phải `git -C "$BLOCKSUITE_UPSTREAM" checkout <SHA>` theo lệnh cổng in ra.

**Hạn giờ chờ trong test có MỘT nguồn sự thật:** `src/__tests__/helpers/cho-den-khi.ts`,
`HAN_GIO_CHO_MS = 8000`. Nâng số này thì phải nâng `testTimeout` trong `vite.config.ts` theo, giữ
nguyên khoảng cách — để khi có hồi quy thật, thứ hết giờ trước là **lượt chờ** (ném đúng câu `expect`
đã hỏng) chứ không phải cả test (chỉ nói "timeout"). Vitest không có tuỳ chọn toàn cục cho hạn mặc
định của `vi.waitFor`; hàm bọc là cách duy nhất.

---

## 4. RANH GIỚI KHÔNG ĐƯỢC VƯỢT

- **D11 — `src/vendor/blocksuite/` là bản sao nguyên văn thượng nguồn.** Không sửa. Mọi thay đổi
  hành vi phải nằm ở tầng bọc (`src/board/`) hoặc ở pipeline `scripts/`. Cổng `kiem:vendor` canh
  điều này. Ca kiểm chạm cây vendored phải khai kiểu tối thiểu tại chỗ (`SurfaceLike`, `GfxLike`,
  `CrudLike`), không import kiểu xuyên qua ranh giới.
- **D13 — chunk Mindmap nạp chậm.** Cả chồng BlockSuite nằm sau `React.lazy`. Import tĩnh từ
  `src/board/BoardGallery.tsx` hay `src/App.tsx` vào bất cứ thứ gì kéo theo BlockSuite sẽ lôi cả
  chồng đó vào chunk vỏ app, tải eager cho mọi người dùng kể cả người chưa từng mở tab Mindmap.
  Dùng `import()` động.
- **CSS BlockSuite rò ra toàn app** nếu không chặn bằng lớp `drt-vendor`. Đừng xoá dòng `@layer` đầu
  `src/index.css`, đừng xoá lời gọi `batLopCssVendor()`.
- **npm là công cụ quản gói duy nhất.** `pnpm-lock.yaml` đã bị gỡ vì nó tả một dự án 2 dependency
  trong khi `package.json` đã có 67 — `pnpm install` cho ra một cây không dùng được.

---

## 5. NGƯỜI DÙNG VÀ PHẠM VI

- **Đối tượng: bác sĩ lâm sàng đang trực**, không phải sinh viên y khoa. Đừng đề xuất glossary thuật
  ngữ. Thứ cần nhìn ngay là con số đem đi đặt bơm, không phải bốn đoạn văn cảnh báo.
- **DESIGN.md là luật màu.** "Thứ ồn nhất trên màn liều luôn là tín hiệu nguy hiểm, không bao giờ là
  thương hiệu" — một liều bình thường không đọc bằng `--c-primary`. Một hex cứng trong component là bug.
- **MindmapScreen là "phòng não phải" của app** — nơi được phép đẩy hiệu ứng xa nhất, rồi để chủ dự
  án cắt bớt. Các màn còn lại thì ngược lại: ưu tiên đọc nhanh, ít chuyển động.
- **`/impeccable critique` MindMapScreen chỉ sửa React app**, không đụng cây vendored (D11).

---

## 6. BẢN ĐỒ TÀI LIỆU

| File | Nội dung |
|---|---|
| [`NHAT-KY-CHANG.md`](NHAT-KY-CHANG.md) | 42 chặng đã xong, kèm những đường đã thử và hỏng |
| [`../../AGENTS.md`](../../AGENTS.md) | Dev server, package manager, quy ước git |
| [`../../DESIGN.md`](../../DESIGN.md) | Bảng màu, thang chữ, luật chuyển động |
| [`../../PRODUCT.md`](../../PRODUCT.md) | Roadmap tính năng |
| `plans/` | Kế hoạch từng chặng (18 file) |
| `.impeccable/critique/` | Báo cáo critique đã lưu |
| `src/vendor/blocksuite/README.md` | Luật D11 đầy đủ |
