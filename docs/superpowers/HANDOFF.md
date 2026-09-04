# BÀN GIAO

Cập nhật **2026-09-01**. Đọc §1 (đang mở) + §4 (ranh giới) trước khi làm; §2 tra khi cần.

- Lịch sử đầy đủ 43 chặng: **[`NHAT-KY-CHANG.md`](NHAT-KY-CHANG.md)**. Định thử một hướng nghe có
  vẻ hay thì tra bên đó trước — nhiều khả năng đã thử và đã hỏng, kèm phép đo.
- **"HANDOFF mục N" trong `src/` và `specs/` trỏ tới NHẬT KÝ, không phải file này** (di sản từ thời
  hai nội dung chung một file). Không sửa các chú thích đó.
- **Danh sách nợ không tự già đi cùng mã nguồn.** Mở mã kiểm lại trước khi lập kế hoạch — lượt
  2026-08-29 thấy 3/5 khoản đã đóng từ lâu mà không ai cập nhật.

---

## 1. ĐANG MỞ

Hai nhóm dưới đây KHÁC HẲN NHAU về nghĩa vụ — đừng gộp lại thành "danh sách việc cần làm":

- **§1.1 NỢ KỸ THUẬT** — khiếm khuyết có thật, còn nằm đó, *nên* trả khi có dịp.
- **§1.2 ĐÃ QUYẾT KHÔNG LÀM** — chủ dự án đã cân nhắc và chốt là KHÔNG làm. Đây là **thông tin**,
  không phải việc tồn. Đừng "sửa giúp", đừng đưa vào kế hoạch, đừng nêu lại như một thiếu sót.
  Chỉ mở lại khi chủ dự án nói mở lại.

### 1.1 NỢ KỸ THUẬT — cần trả

~~**Nút "Liên kết" trong menu Ghi chú không làm gì.**~~ **ĐÃ VÁ 2026-09-05** — xem mục "Đã vá" ở
cuối khoản này. Phần mô tả dưới đây giữ nguyên làm hồ sơ chẩn đoán.

**Nút "Liên kết" trong menu Ghi chú không làm gì — khiếm khuyết THẬT, chủ dự án hoãn (2026-08-31).**
`affine/gfx/note/src/toolbar/note-menu.ts` render một nút Liên kết gọi `insertLinkByQuickSearchCommand`
(`affine/blocks/bookmark/src/commands/insert-link-by-quick-search.ts`). Dòng đầu của lệnh đó:
`const s = std.getOptional(QuickSearchProvider); if (!s) return` — **thoát im lặng, không gọi
`next()`**, nên `insertedLinkType` là `undefined` và `?.then` ở note-menu.ts cũng thành no-op.
`QuickSearchProvider` là service do APP CHỦ cấp (AFFiNE cấp hộp thoại tìm tài liệu / dán URL);
drtrong không cấp. Đã đo trên trình duyệt thật: nút hiện đúng nhãn "Liên kết", bấm không có phản hồi
nào.
Muốn làm cho chạy thì KHÔNG đủ nếu chỉ cấp `QuickSearchProvider`: nhánh `externalUrl` chạy tiếp
`insertEmbedIframeWithUrlCommand` rồi `insertBookmarkCommand`, mà `EmbedViewExtension` và
`BookmarkViewExtension` đều KHÔNG có trong `viewExtensions` — kết quả sẽ là một khối vô hình, tức
đổi lỗi này lấy đúng lỗi "Chữ tự do" vừa vá. Ba việc phải làm CÙNG LÚC: cấp QuickSearchProvider +
bật Embed + bật Bookmark (và đo lại dung lượng bundle). Nhánh `docId` không áp dụng — app không có
kho tài liệu để tìm.

**ĐÃ VÁ 2026-09-05.** Cả ba điều kiện nay đủ: Task 12 của chặng page mode đã bật
`BookmarkViewExtension` + `EmbedViewExtension` (`src/board/extensions.ts`), và lượt này cấp
`QuickSearchProvider` — `src/board/tim-nhanh-lien-ket.ts`, nối vào `layExtensionsEdgeless()`. Đo lại
dung lượng theo đúng yêu cầu ghi ở trên: chunk soạn thảo 1.159,34 → **1.159,48 kB gzip** (provider
thêm 0,14 kB), trần 1.400 kB. Ca kiểm `tim-nhanh-lien-ket.spec.ts`.

Một cái bẫy đáng nhớ phát hiện lúc vá: KHÔNG dùng thẳng `toggleEmbedCardCreateModal()` của thượng
nguồn. Modal ấy có ba đường thoát, nhưng promise nó trả về CHỈ resolve trong `_onConfirm`; bấm nền
hoặc Escape chỉ gọi `this.remove()`, nên `openQuickSearch()` treo vĩnh viễn khi người dùng huỷ —
đổi một lỗi im lặng lấy một promise rò rỉ. Bản vá tự dựng modal để giữ tham chiếu rồi móc vào
`remove()`, điểm chung của cả ba đường.

~~**Hộp thoại "Chèn liên kết" còn ba chuỗi tiếng Anh (D12).**~~ **ĐÃ VÁ 2026-09-05, cùng ngày.**
Bản vá nút làm lộ ra ba chuỗi viết cứng trong cây vendored. Kết quả: `Invalid link` hoá ra ĐÃ có sẵn
bản dịch ("Liên kết không hợp lệ") — chỉ chưa ai với tới được vì hộp thoại chưa mở được; hai chuỗi
còn lại nay đi qua một bộ thay mới `thayChuTranHopThoaiLienKet`
(`placeholder="Input in https://..."` → "Dán liên kết https://...", nhãn nút `Confirm` → "Xác nhận").

**Lượt này là ví dụ mẫu cho luật "dạy CẢ HAI cổng" — cả hai đều đỏ, mỗi cổng một lý do KHÁC nhau,
và cả hai đều đúng:**
- `vendor-dich.spec.ts` (cổng độc lập, tính lại trên `.vendor-build`) đỏ vì nó tự viết lại regex cho
  TỪNG hình dạng chữ trần và chưa biết hình dạng `<button …>nhãn</button>`. Placeholder thì không
  cần thêm gì — regex `placeholder="…"` ở đó vốn đã tổng quát.
- `kiem-dist.mjs` (Luật C, soát `dist/`) đỏ vì `coNhuLiteral` đòi chuỗi nằm TRỌN trong MỘT literal,
  mà nhãn nút nằm giữa hai nhịp `${…}` của cùng một template. Phải thêm `coTrongNutTran` vào
  `scripts/so-khop-ban-dich.mjs` rồi nối vào danh sách bộ dò của Luật C.

Và một bước nữa dễ quên: hàm mới phải được khai trong `scripts/luat-vi-tri-dich.d.mts` (khai báo
kiểu viết TAY, không sinh tự động) — thiếu nó thì `tsc` đỏ với `TS2305 has no exported member` dù
hàm đã export đúng.

Cuối cùng: đổi luật dịch mà quên `npm run dung:vendor` thì cổng phủ chuỗi đỏ với thông điệp trỏ
đúng hướng — `.vendor-build` là artifact cục bộ (gitignored), luật nằm trong `scripts/` mới được
commit.

~~**Bảng Mẫu — chuỗi "Search file or anything..." vẫn tiếng Anh.**~~ **ĐÃ ĐÓNG 2026-09-01**, mục
này giữ lại để phiên sau khỏi mở điều tra lại. Vị trí dịch đã có:
`scripts/luat-vi-tri-dich.mjs:890-911` (`RE_PLACEHOLDER_BANG_MAU`). Bảng Mẫu nay không còn khoản
tồn nào — tính năng đã xong (5 tab, 227 nhãn dán + 5 mẫu bảng, 2026-09-01): xem NHẬT KÝ chặng 43 và
[`plans/2026-09-01-mo-rong-bang-mau.md`](plans/2026-09-01-mo-rong-bang-mau.md).


**MỚI 2026-09-05 — bước đổi tên D16 đã viết lại nhầm HAI HOSTNAME BÊN NGOÀI. Cần chủ dự án quyết,
tôi KHÔNG tự sửa.** Phát hiện khi kiểm nút "Liên kết" trên trình duyệt thật: tạo một thẻ liên kết
xong, console đỏ `CORS ... drt-worker.toeverything.workers.dev`. Đối chiếu nguồn:

| | |
|---|---|
| `src/vendor/.../shared/src/consts/index.ts:76,80` (gốc) | `https://affine-worker.toeverything.workers.dev/api/worker/{image-proxy,link-preview}` |
| `.vendor-build/.../consts/index.js:57,59` (sau D16) | `https://drt-worker.toeverything.workers.dev/...` |

Luật đổi `affine-` → `drt-` không phân biệt tên miền với định danh mã, mà `drt-worker` thì không tồn
tại trong namespace `toeverything.workers.dev`. Hệ quả: **hai endpoint chết vĩnh viễn** — xem trước
liên kết (thẻ liên kết không lấy được tiêu đề/mô tả/biểu tượng) và proxy ảnh (ảnh ngoài phải đi vòng
CORS). Script `doi-ten-vendor.mjs` CÓ cơ chế che (`sourceMappingURL`) nhưng không có guard nào cho
hostname.

**CHỦ DỰ ÁN ĐÃ CHỌN 2026-09-05: "không muốn có bên thứ ba — chỉ lưu trữ nội bộ."** Tức hướng 1, và
làm cho đúng: chặn hẳn lời gọi chứ không để nó chết ồn ào. Khôi phục tên miền gốc đã bị loại — nó
nghĩa là mỗi URL bác sĩ dán vào bảng sẽ rời máy tới hạ tầng của AFFiNE.

Quét lại toàn cây khi triển khai thì bề mặt rộng hơn hai endpoint này nhiều — **ít nhất TÁM điểm gọi
mạng**, trong đó `link-preview-service.ts:86` gọi thẳng `https://api.fxtwitter.com` **viết cứng**,
không endpoint nào cấu hình tới được. Vá từng điểm là mong manh: D11 cấm sửa cây vendored, và bản
nâng cấp sau sẽ thêm điểm mới mà không ai hay.

**Đã triển khai — ba lớp, xem `src/board/khong-ben-thu-ba.ts` và chú thích CSP trong `index.html`:**
1. **CSP `connect-src 'self'; img-src 'self' data: blob:`** — lớp DUY NHẤT trình duyệt cưỡng chế,
   phủ cả những điểm chưa ai biết. Cố ý KHÔNG khai `script-src`/`style-src` (khai là giết script nội
   tuyến của Vite và của khối phân giải chủ đề), cũng KHÔNG khai `frame-src` (khối nhúng là nội dung
   bác sĩ chủ động dán — muốn siết tuyệt đối thì thêm `frame-src 'none'`, đổi lại thẻ nhúng thành ô
   trống).
2. **`khongXemTruocQuaMang`** ghi đè `LinkPreviewProvider` ở CẢ HAI bộ extension — không phát lời gọi
   nào, nên không có gì để CSP phải chặn và console sạch.
3. **`docNhanTuUrl`** suy nhan đề từ chính URL (`/wiki/Suy_tim` → "Suy tim" + "vi.wikipedia.org"),
   nên thẻ vẫn đọc được mà không tốn một byte mạng.

Ca kiểm `khong-ben-thu-ba.spec.ts` canh cả ba, gồm một bẫy `fetch` toàn cục khẳng định KHÔNG lời gọi
nào được phát. Đã chứng minh đỏ khi gỡ bản vá.

**CÒN NỢ:** thêm guard hostname trong `doi-ten-vendor.mjs` để lượt đổi tên sau không âm thầm viết lại
một URL nữa. Bản thân hai hằng số vẫn mang tên miền `drt-worker` vô nghĩa — vô hại vì đã có ba lớp
trên, nhưng nó là dấu vết của đúng lỗi này và nên được dọn cùng lúc với guard.

### 1.2 ĐÃ QUYẾT: KHÔNG LÀM — thông tin, KHÔNG phải việc tồn

Các mục dưới đây đã được cân nhắc và chốt là không làm. Ghi lại để phiên sau **khỏi phát hiện lại
rồi tưởng là thiếu sót** — kèm sẵn phép đo và hướng đi nếu có ngày đổi ý. Đừng tự ý sửa, đừng xếp
vào kế hoạch, đừng báo cáo như lỗi còn tồn.

**`illustrations` của handy-arrows (54 tệp, ~10 MB) — CỐ Ý BỎ.** Rủi ro phình git + phình IndexedDB
của bảng. Trước 2026-09-01 khoản này nằm ở §1.1 dưới nhãn "CÒN NỢ (b)", đọc như việc tồn; nó là
QUYẾT ĐỊNH, không phải nợ. Bốn tab nhãn dán hiện có (227 mẫu) đã phủ nhu cầu. Muốn mở lại thì cân
dung lượng trước — và bộ `illustrations` là ảnh minh hoạ, không phải mũi tên/nhãn dán, tức là một
loại nội dung khác chứ không phải "thêm cho đủ".

**Deploy Vercel chậm thêm vài phút mỗi lần.** `postinstall` dựng lại `.vendor-build/` từ đầu trên CI
(checkout luôn sạch; cục bộ nó bỏ qua khi cổng đã xanh). Cân nhắc 2026-08-31 và bác: không đo được
thời gian build Vercel từ máy dev, nên sẽ là một lớp cache viết mù. Khoá cache thì đã có sẵn nếu sau
này cần — `bang-bam-vendor.json` là băm SHA-256 toàn cây vendored, đã commit, nên "khoá đổi ⇒ dựng
lại" là đúng theo cấu tạo, không sợ phục vụ cây cũ. **Chỉ làm khi có một lượt deploy thật bị chặn vì
nó**, và làm thì đo trước/sau.

**Gõ "/" bằng TIẾNG ANH không còn tìm ra mục — hệ quả CÓ CHỦ Ý của chặng dịch menu lệnh
(commit `c528c38`).** `slash-menu-popover.ts:153` lọc bằng `[name, ...searchAlias].some(…)`, mà
`searchAlias` thượng nguồn gần như rỗng (đo được đúng 3 chỗ: `checkbox`, `mathBlock/equationBlock/
latexBlock`, `remove`). Từ khi `name` được dịch, `/code` `/h1` không ra kết quả nữa — phải gõ
`/khối` `/tiêu`. Chủ dự án đã được báo và chốt là chấp nhận.
Nếu có ngày muốn khôi phục gõ tắt tiếng Anh: KHÔNG dùng được bộ dịch D12 — nó chỉ THAY chuỗi, không
THÊM được thuộc tính `searchAlias` vào cây vendored. Cần một bước dựng khác, hoặc một
`SlashMenuConfig` phụ đăng ký từ phía app (hướng chưa khảo sát). Đừng bắt đầu bằng cách nới luật dịch.

**Chữ tiếng Anh trong TRANH MINH HOẠ SVG của thẻ xem trước menu "/".** Nhãn và tiêu đề nhóm đã dịch
xong; phần còn lại là nội dung mẫu vẽ TRONG hình (`In a decentralized system…`, chữ "Heading 1" nằm
trong SVG) ở các bảng `tooltips`.
Vì sao bác: `viewBox` cố định 170×68, mỗi dòng là `<tspan>` ghim cứng `x`/`y`, `font-size: 10` —
tiếng Việt dài hơn ~20–30% và có dấu nên sẽ tràn khung/cắt dấu, mà sửa toạ độ là sửa `src/vendor/`
(D11 cấm). Cộng thêm một lớp luật dịch thứ 5 (text node trong SVG) và ~30 khoá văn xuôi trang trí.
Đo được: ở khung 800×450 thẻ xem trước KHÔNG dựng ra (SVG 0×0), chỉ hiện khi cửa sổ rộng ~1600px —
tức trên iPad/điện thoại gần như không thấy. **Nếu có ngày đổi ý, cách rẻ và an toàn hơn nhiều là ẩn
hẳn thẻ xem trước bằng một luật CSS phía app, không phải dịch chữ trong hình.**

---

## 2. LUẬT THAO TÁC — mỗi dòng là một lượt đã mất

### 2.1 Bằng chứng từ lệnh chạy

- **Không nối `| tail` khi chạy test.** Vitest in ca đỏ TRƯỚC khối tổng kết; ống dẫn còn nuốt mã
  thoát. Ghi ra file rồi mở file đọc.
- **Mã thoát chỉ đúng khi lệnh cuối chuỗi là thứ cần đo.** `npx tsc … ; echo "exit=$?"` luôn báo 0
  (mã của `echo`). Bắt vào biến: `... > log.txt 2>&1; MA=$?; echo "$MA"; cat log.txt`.
- **Đọc vitest phải nhìn đủ ba:** mã thoát thật, dòng `Test Files` (đỏ-cấp-file không hiện ở dòng
  `Tests`), và tổng số ca so lượt trước (tụt số ca mà không ca nào đỏ = có file không nạp được).
- **Đừng chạy `tsc` song song `vitest`** (đã gây `UNKNOWN: unknown error, read` trên Windows).
- **`EBUSY ... watch '.tmp-test-*'` là RÁC TẠM, không phải ca đỏ.** Lượt chạy chết giữa chừng, KHÔNG
  in dòng `Test Files` nào — dấu hiệu nhận ra. Chạy lại là xanh; không có bản tổng kết thì đừng đọc
  thành hồi quy.
- **Tắt dev server trước khi chạy suite** — server thừa từng làm worker timeout, đọc nhầm thành hồi quy.

### 2.2 Đo trên trình duyệt

- **Số tương phản phải kèm NỀN đo trên đó.** Đã vấp ba lần (4,89:1 trên thẻ trắng → 4,12:1 trên pill).
- **Đo hình học trên phần tử có `transition` thì chờ quá transition dài nhất** (đo ở 500ms từng cho
  `marginTop: 0px` giả; chờ 1200ms mới ra 10px).
- **`backgroundColor` computed rơi xuyên gradient** xuống nền app → số AA giả. Đi ngược cây cha tìm
  màu đục thật.
- **Kiểm phải VÀO RỒI RA** — bấm vào, thoát ra, sang màn khác, quay lại. "Mở lên chạy đúng" không đủ.
- **Kiểm bản build phải GỠ SERVICE WORKER trước**, nếu không đang đo mã CŨ (`public/sw.js`
  cache-first cho chunk lazy). Dấu hiệu: lượt chạy xong NHANH HƠN cả hạn giờ vừa thêm vào mã.
  `for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();`
  `for (const k of await caches.keys()) await caches.delete(k);`
- **Chuỗi trong update Yjs nằm NGUYÊN VĂN (UTF-8, có varint độ dài đứng trước).** Nhờ vậy dò được
  tham chiếu mà không phải giải mã schema — `donRacBlobBang` dựa vào đúng tính chất này để tìm ảnh
  mồ côi, không cần `yjs` trong chunk vỏ app.
- **`text-decoration` và `background-color` KHÔNG kế thừa** — `getComputedStyle` trên phần tử mang
  chữ trả "none"/"rgba(0, 0, 0, 0)" dù cha có đặt (trình duyệt vẽ chúng từ cha phủ xuống). Muốn đọc
  thì đi ngược lên cha, và phải CHẶN đúng phần tử bọc: không chặn thì vớ luôn màu thân thẻ ghi chú.
  `color`/`font-*` thì kế thừa bình thường — đó là lý do đậm/nghiêng vào ảnh được mà gạch chân không.
- **Đừng lọc "http" trần khi lọc tài nguyên ngoài miền của SVG** — mọi `<svg>` mang
  `xmlns="http://www.w3.org/2000/svg"`, nên phép lọc thô loại SẠCH 100% biểu tượng, âm thầm (ảnh
  vẫn xuất ra, chỉ thiếu đúng thứ vừa thêm). Lọc theo `href=`/`url(`.
- **Đừng chờ bằng `requestAnimationFrame`** — rAF không chạy khi tài liệu ẩn (tab nền, pane bị
  giấu). Một lượt xuất ảnh từng treo vĩnh viễn ở đúng đó. Nhịp chờ đi bằng `setTimeout`.
- **Browser pane bị GIẤU thì không kiểm được gì cần render.** rAF im, ảnh chụp ra ĐEN, và
  BlockSuite không bao giờ dựng khối note — trông y hệt mã hỏng. `tabs_select` và `preview_start`
  KHÔNG mở pane ra được (đã thử, `tabs_context` vẫn báo hidden): phải nhờ chủ dự án bật. Kiểm
  `document.visibilityState` + một lượt rAF có hạn giờ TRƯỚC khi kết luận bất cứ điều gì.
- **Dải xác nhận hai bước tự rút sau 5 giây** (`XAC_NHAN_XOA_MS`). Bấm bước 1 rồi bước 2 ở HAI lượt
  gọi công cụ khác nhau là thua: nhịp đầu đã hết hạn, cú bấm thứ hai chỉ mở lại dải. Cả hai cú phải
  nằm trong CÙNG một lượt chạy JS.
- **Khối tạo bằng `store.addBlock()` trần không render**; và edgeless **cull** khối ngoài khung nhìn
  (đo ra 0×0). Muốn đo thẻ ghi chú thật thì tạo bằng thanh công cụ.
- **Hàm hình học vendored nhận `IVec` = MẢNG `[x, y]`, không phải `{x, y}`.**
  `viewport.setViewport(zoom, center)` đọc `newCenter[0]/[1]`; truyền object gán `_center.x =
  undefined` mà KHÔNG ném lỗi → khung nhìn hỏng âm thầm (zoom vẫn đúng nên nhìn qua tưởng lành).
  Đọc chữ ký ở `framework/std/src/gfx/viewport.ts` trước khi gọi.
- **Đừng đếm khung hình để chờ khối hiện ra.** BlockSuite hoãn render ĐẦU của mỗi khối qua rAF, chia
  lô `maxConcurrentRenders` mỗi khung (`viewport-element.ts`, `scheduleUpdateChildren`). Kiểm thẳng
  trạng thái muốn có + hạn giờ, như `doiNoiDungToi()` ở EdgelessBoard.tsx.
- **Đừng dời khung nhìn của người dùng như tác dụng phụ.** Lượt xuất PNG từng fit vô điều kiện: bảng
  thu nhỏ hết cỡ 1,5 giây rồi nhảy về ("màn hình cứ nhấp nháy", 2026-08-31). Chỉ dời khi thật sự cần,
  và che lại trong lúc dời.
- **Một tấm ảnh chụp KHÔNG phải bằng chứng — Browser pane trả về khung dở.** 2026-09-01: ảnh chụp
  cho thấy lưới nhãn dán trống trơn và hai thẻ "Truy cập nhanh" biến mất; đo DOM ngay lúc đó thì cả
  15 nhãn dán đều `naturalWidth = 360` và cả 5 thẻ đều `opacity 1`, đúng vị trí, đúng màu. Chụp lại
  sau khi trang lắng là ra đủ. Pane cũng tự báo `Screenshot timed out ... did not finish rendering`
  ở các lượt gần đó. **Thấy gì đó "biến mất" thì đo `getBoundingClientRect` + `getComputedStyle`
  trước khi gọi là lỗi** — nếu không sẽ đi đuổi một con ma nửa tiếng.
- **`elementsFromPoint` BỎ QUA phần tử `pointer-events: none`.** Lớp phủ đang vẽ đè nhưng không nhận
  chuột thì phép dò điểm không thấy nó — 2026-09-01 suýt kết luận nhầm "không có gì che". Muốn tìm
  thứ đang vẽ đè thì duyệt cây con và lọc theo `getComputedStyle(el).visibility` + rect, có xuyên cả
  `shadowRoot`.
- **ĐỌC CONSOLE, đừng chỉ nhìn.** 2026-09-01: mọi cổng xanh, kiểm mắt "trông đúng", vậy mà mỗi lần
  thả mẫu Động não có khung vẫn ném một `TypeError` cho MỖI khung (`affine:frame` thiếu
  `childElementIds`; `assertType` phía trên chỗ ném là no-op lúc chạy). Không tấm ảnh nào cho thấy
  điều đó, và mẫu vẫn hiện ra gần đúng. Mỗi lượt kiểm trình duyệt phải đọc console + network, và với
  lỗi khó bắt thì gắn `window.addEventListener('error'|'unhandledrejection')` rồi mới thao tác —
  bộ đệm console sống qua cả lần tải lại nên phải phân biệt lỗi CŨ với lỗi MỚI.
- **`preview_start` LUÔN dựng dev server từ THƯ MỤC DỰ ÁN CHÍNH, không phải worktree đang làm việc.**
  Thêm một configuration vào `.claude/launch.json` của worktree KHÔNG có tác dụng — công cụ vẫn trả
  về `name` của cây chính. Server dựng lên phục vụ mã CÂY CHÍNH, tức đo nhầm nhánh, và **không có
  dấu hiệu nào báo**. Cách phát hiện: `fetch` một file rồi tìm một định danh chỉ có ở nhánh này.
  Cách phục vụ mã worktree qua server ấy: `/@fs/<đường dẫn tuyệt đối>` — worktree nằm trong
  `.claude/worktrees/` tức BÊN TRONG gốc repo chính nên `server.fs.allow` mặc định của Vite cho phép;
  `import('/@fs/C:/.../<nhánh>/src/board/EdgelessBoard.tsx')` nạp đúng bản nhánh, import tương đối
  của nó cũng phân giải trong nhánh. Nạp nguội mất ~60–90 giây (dev không gói, ~250 request) — phải
  kick off rồi poll, `await` thẳng sẽ vượt hạn giờ 45 giây của công cụ.
- **`computer{action:"key"}` gửi keydown với `e.key` RỖNG.** Enter/BackSpace tới được phần tử nhưng
  BlockSuite không nhận ra phím nào, nên đoạn không tách và ký tự không xoá — trông y hệt lỗi của
  editor. `computer{action:"type"}` thì đúng (sinh `beforeinput:insertText`). Muốn kiểm phím điều
  hướng thì tự bắn `new KeyboardEvent('keydown', {key:'Enter', bubbles:true, composed:true,
  cancelable:true})`; BlockSuite xử lý được và trả `defaultPrevented: true`.
- **ĐỪNG dùng `document.execCommand` để mô phỏng thao tác soạn thảo trên BlockSuite.** Nó ghi thẳng
  vào DOM của contenteditable, vượt mặt inline editor, làm hỏng model và đẻ ra một chuỗi
  `TypeError: ... reading 'attributeService'` trông y như lỗi kiến trúc. Mất nửa tiếng mới tách được
  khỏi lỗi thật (2026-09-04).
- **Dọn sau khi đo:** xoá bảng/dữ liệu thử khỏi IndexedDB + localStorage, tắt dev server.

### 2.3 Tin vào ca kiểm tới đâu

- **Ca kiểm xanh nhiều chặng vẫn có thể đang chứng minh một đường đi KHÁC với lời bình luận của nó.**
  Hai ca "kéo" (Hình, Bút) xanh nhiều tháng mà chưa từng chạy qua đường kéo — chúng đi nhánh `click()`.
- **Cơ chế nằm NGOÀI DOM** (bàn phím ảo, cử chỉ hệ điều hành, quyền): kiểm trên thiết bị thật TRƯỚC,
  rồi mới bọc ca kiểm quanh cái đã biết là chạy. Đã có lượt 18 ca xanh cho thứ không chạy trên máy thật.
- **Ca kiểm cho một cuộc đua phải được CHỨNG MINH LÀ ĐỎ trước khi vá.** Ca "seed root trùng" từng
  xanh cả khi guard bị vô hiệu hoá, hai lần, hai lý do khác nhau.
- **Xác minh finding trước khi sửa** — tỉ lệ dương tính giả của critique/máy dò đã đo được là cao
  (2/6 một lượt; 4/9 một lượt khác).
- **TÊN THẺ LIT viết trong plan/brief là ĐOÁN, không phải dữ kiện.** Chặng page mode sai 3 trên 4
  task. Nguyên nhân: bước đổi tên D16 chỉ thay tiền tố `affine-` → `drt-`, mà một phần đáng kể thẻ
  thượng nguồn KHÔNG mang tiền tố ấy từ đầu — `doc-title` (`fragments/doc-title/src/effects.ts`
  gọi thẳng `customElements.define('doc-title', …)`), `edgeless-link-tool-button`, `note-slicer` —
  nên tên runtime của chúng y hệt thượng nguồn, không có `drt-`. Tra `effects.ts` của gói vendored
  TRƯỚC khi viết một `expect(customElements.get(...))`, đừng suy ra từ luật đổi tên.

### 2.4 Cây git dùng chung

Nhiều phiên cùng chạy trên thư mục này. Đã xảy ra: một phiên khác commit **cuốn theo** edit dở dang
của phiên này.

- **Luôn `git status` TOÀN BỘ trước khi commit.** Thấy file lạ thì `git diff` trước; không phải việc
  của mình thì **không stage**. Cùng một file hai bên sửa thì tách hunk.
- **Đừng dùng `git stash` để tách hunk trên cây dùng chung** — pop xung đột từng để lại dấu
  `<<<<<<<` và phiên kia commit luôn vào `main`.
- `resume` báo "no transcript" thì kiểm `git status`/`git diff` trước — subagent có thể đã làm xong
  một phần trước khi chết.

---

## 3. CỔNG KIỂM

| Cổng | Lệnh | Canh gì |
|---|---|---|
| Kiểu | `npx tsc --noEmit -p tsconfig.json` | `src/` + cây vendored qua `tsconfig.vendor-paths.json` |
| Test | `npx vitest run` | **63 file / 596 ca** (2026-09-01) |
| D11 | `npm run kiem:vendor` | Cây vendored khớp nguyên văn thượng nguồn, VÀ checkout `BLOCKSUITE_UPSTREAM` còn ở SHA trong `commit-thuong-nguon.txt`. Lệch thì cổng tự in cảnh báo + lệnh dán-là-chạy TRƯỚC danh sách `LỆCH:`. |
| Bản đồ paths | `npm run kiem:vendor-paths` | `tsconfig.vendor-paths.json` còn tả đúng `.vendor-build/` |
| D16 + biến CSS | `npm run build` (tự chạy `kiem:dist` ở `postbuild`) | Bản PHÁT HÀNH: không còn `affine-`, mọi `--drt-*` được dùng đều có định nghĩa, bản dịch `vi.json` còn nguyên. Cổng DUY NHẤT nhìn vào `dist/` — từng bắt 81 biến CSS không phân giải mà console vẫn sạch. |

- `npm run dung:vendor` dựng lại `.vendor-build/` (vài phút). Nó **không** kéo lại từ thượng nguồn →
  không sửa được lệch do checkout trôi khỏi SHA pin; cái đó phải `git -C "$BLOCKSUITE_UPSTREAM"
  checkout <SHA>` theo lệnh cổng in ra.
- **Đừng nâng cây vendored lên `canary`** trừ khi thật sự cần một bản vá thượng nguồn — việc lớn
  (dựng lại toàn bộ + pipeline dịch + kiểm hồi quy Mindmap).
- **Hạn giờ chờ trong test có MỘT nguồn sự thật:** `src/__tests__/helpers/cho-den-khi.ts`,
  `HAN_GIO_CHO_MS = 8000`. Nâng thì phải nâng `testTimeout` trong `vite.config.ts` theo, giữ nguyên
  khoảng cách — để thứ hết giờ trước là lượt chờ (ném đúng câu `expect` đã hỏng), không phải cả test.

---

## 4. RANH GIỚI KHÔNG ĐƯỢC VƯỢT

- **D11 — `src/vendor/blocksuite/` là bản sao nguyên văn thượng nguồn.** Không sửa. Mọi thay đổi
  hành vi nằm ở `src/board/` hoặc pipeline `scripts/`. Ca kiểm chạm cây vendored phải khai kiểu tối
  thiểu tại chỗ (`SurfaceLike`, `GfxLike`, `CrudLike`), không import kiểu xuyên ranh giới.
- **D13 — chunk Mindmap nạp chậm.** Cả chồng BlockSuite nằm sau `React.lazy`. Import tĩnh từ
  `BoardGallery.tsx`/`App.tsx` vào bất cứ thứ gì kéo theo BlockSuite là lôi cả chồng vào chunk vỏ
  app cho mọi người dùng. Dùng `import()` động.
- **D16 — bản phát hành không được lộ tên thượng nguồn.** Pipeline `scripts/doi-ten-vendor.mjs` đổi
  `affine-` → `drt-` khi dựng. Nên mã của app đừng ghim tiền tố cứng: selector chạm cây vendored
  phải khớp được cả hai (vd `[class*="list-block__prefix"]`), nếu không một lượt đổi tên nữa sẽ tắt
  nó âm thầm. (`affine:page`/`affine:surface` là FLAVOUR trong dữ liệu — cố ý KHÔNG đổi.)
- **CSS BlockSuite rò ra toàn app** nếu không chặn bằng lớp `drt-vendor`. Câu lệnh
  `@layer drt-vendor;` trong `src/index.css` phải đứng TRƯỚC mọi `@import` (không phải "dòng đầu
  tệp" — nó nằm sau khối chú thích); đừng xoá nó, đừng xoá lời gọi `batLopCssVendor()`.
- **npm là công cụ quản gói duy nhất** (`pnpm-lock.yaml` đã gỡ — nó tả một dự án 2 dependency cho
  một `package.json` có 67 dependency, chưa kể 19 devDependency).

---

## 5. NGƯỜI DÙNG VÀ PHẠM VI

- **Đối tượng: bác sĩ lâm sàng đang trực**, không phải sinh viên y khoa. Đừng đề xuất glossary. Thứ
  cần nhìn ngay là con số đem đi đặt bơm.
- **DESIGN.md là luật màu.** Thứ ồn nhất trên màn liều luôn là tín hiệu nguy hiểm, không bao giờ là
  thương hiệu. Một hex cứng trong component là bug.
- **MindmapScreen là "phòng não phải"** — được đẩy hiệu ứng xa nhất rồi để chủ dự án cắt. Các màn
  còn lại ngược lại: đọc nhanh, ít chuyển động.
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
