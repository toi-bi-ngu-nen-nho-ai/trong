# BÀN GIAO

Cập nhật **2026-08-29**. Đọc hết file này trước khi làm bất cứ việc gì; nó dài đúng bằng những thứ
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

### 1.1 Bàn phím ảo iOS — chưa kết luận được, và lý do đáng đọc

Chạm vào bảng vẽ trên iPhone không hiện bàn phím. Gốc rễ đã xác định từ 2026-08-18 (nhật ký mục 7):
mọi lệnh gọi `focusTextModel()` trong cây vendored đều bị hoãn qua `requestAnimationFrame`/`.then()`,
mà Safari iOS chỉ mở bàn phím khi `.focus()` chạy **đồng bộ trong handler cử chỉ**. Đây là kiến trúc
xuyên suốt thượng nguồn, không phải một dòng lệch vá được — nên đụng vào là đụng luật D11.

Hướng B (bọc ở tầng React, ô mồi `contenteditable` ẩn) đã cài, nghiệm thu trên iPhone: **không
được**, đã gỡ sạch (nhật ký mục 37). Ba giả thuyết bị loại bằng phép đo, đừng thử lại.

**Trạng thái hiện tại:** bàn thử lượt 1 (4 phép A/B/C/D) cho **cả bốn đều ✗**.

> **Bốn chữ ✗ đó KHÔNG kết luận được gì, và đó là lỗi thiết kế của bàn thử.** Nó thiếu **đối chứng
> dương**: không phép nào chứng minh phép đo *có khả năng* bắt được bàn phím trên chính máy đó. Nên
> "cả bốn ✗" hiện có hai cách đọc không phân biệt được — hoặc thật sự không cách nào mở được, hoặc
> phép đo mù (bàn phím có mở mà `visualViewport` không đổi, hoặc máy đang cắm bàn phím ngoài). Đây
> là cùng một lớp lỗi với "18 ca kiểm xanh cho thứ không chạy trên máy thật" ở mục 37.

**Bàn thử lượt 2 đã dựng, đang chờ chủ dự án chạy** — thêm đối chứng dương G (chạm thẳng vào một
`<input>` thật) và tách ba biến số chưa ai đụng: cả bốn phép lượt 1 đều dùng `contenteditable`
**và** đều giấu phần tử, hai thứ dính vào nhau nên không biết cái nào có tội.

| Phép | Biến số | Nếu ✗ nghĩa là |
|---|---|---|
| **G** | chạm thẳng vào `<input>` hiện rõ, không script | phép đo mù — mọi kết quả khác vô nghĩa, kể cả lượt 1 |
| **E** | `<input>` hiện rõ, script `focus()` trong `touchend` | Safari cấm hẳn mở bàn phím bằng script |
| **F** | `<input>` đẩy ngoài khung nhìn, script focus | việc **giấu** là thủ phạm |
| **H** | `<input>` trong suốt **dưới ngón tay**, trong khung nhìn | hình dạng app thật sự cần cũng không chạy |

Nếu G ✓ mà E ✓ F ✓ thì thủ phạm của lượt 1 là **`contenteditable`**, không phải cách giấu — cài lại
bằng ô nhập thật rồi chuyển chữ vào canvas.

**Ghi chú nối hai vấn đề:** khoản 1.2 mục "gõ tên bị nối đuôi" nhiều khả năng **cùng gốc** — ô đổi
tên dùng `autoFocus` rồi `select()` trong `onFocus`, đúng loại thao tác Safari iOS hạn chế. Nếu E ✗
thì hai chuyện là một, và cách sửa cũng là một.

### 1.2 Ba khoản Board Gallery chủ dự án báo sai trên iPhone — có mâu thuẫn chưa gỡ

Nghiệm thu 2026-08-29, ba mục **không đạt**: ô "+" không ở đầu lưới; ô "+" không trông như tờ giấy;
tạo bảng mới rồi gõ tên thì bị nối đuôi (`"Bảng chưa đặt tênSốc nhiễm khuẩn"`).

**Đã kiểm trên `main`, cả ba đều ĐÚNG ở đây** (đo trên trình duyệt thật 375×812): ô "+" ở
`indexOf === 0` của lưới, `border-style: solid`, `border-radius: 2px`, nền `--c-note` (kem ở **cả
hai** bản: `#fbfaf7` sáng / `#efece3` tối).

> **MÂU THUẪN CHƯA GỠ — đây là chỗ phải bắt đầu ở lượt sau.** Mục "Xoá bộ lọc" mà chủ dự án tick
> ĐẠT nằm **cùng commit, cùng file** với ô "+" ([`DanhSachBang.tsx`](../../src/board/DanhSachBang.tsx),
> nút "Xoá bộ lọc" dòng ~1437, ô "+" dòng ~1484, cả hai vào ở `5654c07`). Không bản build nào có
> cái này mà thiếu cái kia. Nên hoặc bản trên máy là bản cũ (và mục kia tick nhầm), hoặc bản mới
> (và ô "+" hỏng vì lý do khác hẳn).

Chủ dự án mở app qua **Safari như trang web**, tức đang xem **bản deploy Vercel**, không phải `main`.
Đã loại trừ service worker: `public/sw.js` là stale-while-revalidate trên tên file có hash, bản mới
không kẹt được.

**Phép phân biệt rẻ nhất, chưa ai chạy:** nhìn ô "+" trong lưới — viền **nét đứt** + nằm cuối = bản
cũ, vấn đề ở deploy; viền **liền mảnh hồng** + ô đầu tiên = bản mới, đào tiếp phía code.

**Một khoản trong nhóm này đã tìm ra và vá:** `.mind-o-tao-bang` viết cứng `box-shadow: rgba(0,0,0,.1)`
thay vì token `--c-shadow` — mà token đó là `rgba(18,20,43,.1)` bản sáng nhưng **`rgba(0,0,0,.55)`
bản tối**. Ở bản tối ô "+" gần như mất bóng, phẳng lì giữa những tờ giấy có bóng thật quanh nó, mất
đúng thứ làm nó đọc thành "tờ giấy chưa viết". Đã vá + có ca kiểm (`2f84880`).

### 1.3 Cổng `kiem:vendor` ĐANG ĐỎ — thượng nguồn nhảy, cây vendored không hỏng

```
Đã so 2782 file với thượng nguồn, lệch 84, không đối chiếu được 0
```

**Không phải cây vendored hỏng.** `git status` sạch, `npm run dung:vendor` chạy lại mã thoát 0.
Thượng nguồn của cổng là **một checkout AFFiNE trên đĩa**
(`BLOCKSUITE_UPSTREAM`, mặc định `C:/Users/LENOVO/Downloads/AFFiNE/blocksuite`) — và checkout đó
**vừa được clone mới lúc 2026-08-29 18:14, đang ở `canary`**, đã đi xa hơn bản mà cây vendored được
pin.

Bằng chứng dứt điểm: thượng nguồn có commit `6375f5ab8c` (2026-08-11, "bump typescript 7") gỡ hai
dòng `@ts-expect-error` khỏi `framework/global/src/utils/function.ts`; cây vendored còn giữ chúng.
84 file lệch = 70 `package.json` + 14 file mã nguồn.

**Cần chủ dự án quyết, hai đường:**

1. **Pin lại thượng nguồn** — `git checkout` checkout AFFiNE về đúng commit mà cây vendored được tạo
   ra, hoặc trỏ `BLOCKSUITE_UPSTREAM` sang bản đó. Rẻ, khôi phục cổng ngay, không đụng mã.
2. **Nâng cây vendored lên canary mới** — việc lớn: dựng lại toàn bộ, chạy lại pipeline dịch/đổi
   tên, kiểm hồi quy cả màn Mindmap. Chỉ làm khi thật sự cần tính năng/bản vá mới của thượng nguồn.

Cho tới khi quyết: cổng này đỏ **không chặn** `tsc`/`vitest` (cả hai xanh), nhưng đừng coi nó là
nhiễu — nó đang làm đúng việc nó sinh ra để làm.

### 1.4 Còn lại, mức thấp

- **`src/board/vi.json` mới có 5 chuỗi.** Cơ chế thay chuỗi đã xong và an toàn ở quy mô lớn (nhật ký
  mục 10-13); chặng còn thiếu là **nội dung dịch**: chốt bảng thuật ngữ rồi dịch. Số chuỗi/số từ
  phải **đo lại**, đừng tin con số cũ.
- **Deploy Vercel chậm thêm vài phút mỗi lần** vì `postinstall` dựng lại `.vendor-build/` từ đầu
  (checkout CI luôn sạch). Cân nhắc cache qua Vercel Build Cache API nếu thành vấn đề — chưa cần.

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
- **Dọn sau khi đo:** xoá bảng/dữ liệu thử khỏi IndexedDB và localStorage, tắt dev server.

### 2.3 Tin vào ca kiểm tới đâu

- **Một ca kiểm xanh nhiều chặng liền vẫn có thể đang chứng minh một đường đi KHÁC với đường ghi
  trong chính lời bình luận của nó.** Hai ca "kéo" (Hình, Bút) xanh suốt nhiều tháng mà chưa bao giờ
  chạy qua đường kéo — chúng đi nhánh `click()`. Phát hiện ra nhờ viết ca cho một tính năng **thứ ba**.
- **Với thứ mà cơ chế quyết định nằm NGOÀI DOM** (bàn phím ảo, cử chỉ hệ điều hành, quyền): kiểm
  trên thiết bị thật **TRƯỚC** bằng bản dựng nhỏ nhất, rồi mới bọc ca kiểm quanh cái đã biết là
  chạy. Đã có lượt 18 ca kiểm xanh cho một tính năng không chạy trên máy thật.
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
| Test | `npx vitest run` | **53 file / 457 ca** ở `2f84880` |
| D11 | `npm run kiem:vendor` | Cây vendored khớp nguyên văn thượng nguồn — **đang đỏ, xem 1.3** |
| Bản đồ paths | `npm run kiem:vendor-paths` | `tsconfig.vendor-paths.json` còn tả đúng `.vendor-build/` |

`npm run dung:vendor` dựng lại `.vendor-build/` + `bang-bam-vendor.json` + `tsconfig.vendor-paths.json`
(vài phút). Nó **không** kéo lại từ thượng nguồn, nên không sửa được lệch kiểu 1.3.

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
