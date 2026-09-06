# Kho bài viết — Giai đoạn 7–9 (Plan 3)

> **Cho người thi hành:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc
> `superpowers:executing-plans` để chạy từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi.
> **Đọc trọn mục "PHÁT HIỆN — SPEC KHÔNG KHỚP MÃ THẬT" trước khi làm bất cứ Task nào**: một vài chỗ
> spec khẳng định dựa trên suy luận đọc mã, chưa chạy `grep` xác minh, và ba trong số đó SAI.

**Mục tiêu:** Hoàn tất kho nội dung hợp nhất — nối `mucs` vào Tìm kiếm + Đồng bộ dữ liệu (giai đoạn
7), gỡ toàn bộ hệ bài viết/ECG tự viết tay cũ (giai đoạn 8), rồi phá huỷ dữ liệu cũ trên máy (giai
đoạn 9 — **không hoàn tác được**, tách riêng ở cuối tài liệu này).

**Kiến trúc:** Không đổi kiến trúc dữ liệu (`MucMeta`, store `mucs`, `LuoiMuc`/`BoardGallery`) —
những thứ đó đã xong ở Plan 2. Chặng này là **tiêu thụ** (Tìm kiếm/Đồng bộ đọc `mucs`) rồi **dọn**
(xoá đường đọc/ghi cũ) rồi **phá huỷ** (xoá vật lý dữ liệu cũ). Không Task nào trong giai đoạn 7–8
đổi hình dạng `MucMeta` hay `DANH_MUC`.

**Tech Stack:** React 19 + TypeScript, IndexedDB qua `src/lib/idb.ts` + `useIdbCollection`,
BlockSuite vendored (D11: KHÔNG sửa `src/vendor/`).

**Spec:** `docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md` — §3.2 (lưu trữ),
§3.6 (Tìm kiếm/Đồng bộ/Đã đọc gần đây), §4 giai đoạn 7–9, §6.4 (checklist chuỗi). Spec là THẨM
QUYỀN RÀNG BUỘC cho quyết định SẢN PHẨM (loại nào vào danh mục nào, xoá gì, giữ gì) — nhưng phần
"mã hiện đọc X" của nó là suy luận, đã bị chứng minh sai ba chỗ (xem mục PHÁT HIỆN). Khi hai nguồn
lệch nhau, **tin mã thật, không tin mô tả của spec về mã**.

**Plan trước:** `docs/superpowers/plans/2026-09-05-kho-bai-viet-giai-doan-5-6.md` (Plan 2, đã hợp
nhất ở `b27d992`). Mục "KẾT QUẢ NGHIỆM THU" ở cuối tài liệu đó ghi hai lỗi mà 5 vòng review mã bỏ
sót — bài học: **review đọc-diff không đủ, phải kiểm tay trên Chrome thật.**

---

## PHÁT HIỆN — SPEC KHÔNG KHỚP MÃ THẬT

Đọc trước khi viết bất kỳ dòng nào. Xác minh bằng `grep`/đọc mã trực tiếp trên HEAD `6f000b5`, không
chép lại khẳng định của spec.

### 1. SearchScreen KHÔNG đọc `mucs` — spec sai

Prompt giao việc (và ngầm định của spec §3.6) nói "màn tìm kiếm hiện đọc
`useIdbCollection<MucMeta>(IDB_STORES.mucs)`". **Sai.** Dòng thật:

```
src/App.tsx:1426:  const { items: boards, loading: dangNapBang, loiDoc: loiDocBang } =
    useIdbCollection<MucMeta>(IDB_STORES.boards)
```

`SearchScreen` vẫn đọc store `boards` (kho cũ, đóng băng từ giai đoạn 5 — không ai còn ghi vào đó
ngoài `diTruBangCu.ts`). Kết quả kind `"board"` trong tìm kiếm hiện chỉ thấy các sơ đồ đời cũ đã di
trú, **không hề thấy** bất kỳ `MucMeta` mới nào tạo qua `LuoiMuc`/`ChonDanhMuc` từ Plan 2. Đây là
việc THẬT của giai đoạn 7 Task 1, không phải một xác nhận suông.

### 2. Đồng bộ dữ liệu (`DataSyncScreen`) hoàn toàn chưa biết `mucs`/`boards`

Xác nhận đúng như spec giả định (không phải phát hiện sai, nhưng đáng ghi rõ mức độ): `ImportPayload`,
`SyncSnapshot`, `categoryRows` trong `DataSyncScreen` (App.tsx:4143-4225) chỉ có bảy khoá —
`articles, antibiotics, diseases, infusions (5+ nhóm), ecgLessons, flashcards, wardRecipes`. Không một
chữ nào nhắc `board`/`muc`. Việc này ĐÚNG NHƯ MÔ TẢ của spec, chưa bắt đầu — Task 3–4 của giai đoạn 7.

### 3. `recentReads` — tên trường sai, và không có gì để "lọc bỏ" cho sơ đồ

Spec §3.6 viết: "`ReadEntry.screen` gom về một giá trị `'muc'`". **Trường thật tên là `kind`, không
phải `screen`** (`src/lib/recentReads.ts:15`: `export interface ReadEntry { kind: ReadKind; id: string;
at: number }`). Quan trọng hơn: `ReadKind = "article" | "custom" | "ecg"` — **chưa từng có giá trị
`"board"`**. `LuoiMuc.tsx`/`BoardGallery.tsx` không gọi `recordRead()` ở đâu cả (đã `grep` toàn bộ,
chỉ `App.tsx` gọi `recordRead("article"|"custom"|"ecg", …)`). Nghĩa là:

- KHÔNG có bản ghi `"board"` cũ nào cần "lọc bỏ khi đọc" như spec mô tả.
- Việc THẬT của giai đoạn 7 là **thêm mới** hoàn toàn: ghi nhận lượt mở một `MucMeta` (cả hai loại)
  vào recentReads, một tính năng CHƯA từng tồn tại cho bảng vẽ/bài viết.
- Việc lọc bỏ áp dụng cho `"article"`/`"ecg"` (không phải `"board"`) và chỉ có ý nghĩa SAU khi giai
  đoạn 8 xoá `ArticleScreen`/`EcgDetailScreen` — xếp vào checklist giai đoạn 8, không phải 7.

### 4. `scripts/kiem-dist.mjs` KHÔNG kiểm chuỗi `drtrong-board`/`drtrong-noi-dung` — gate đó CHƯA tồn tại

> **BỊ VÔ HIỆU bởi PHÁN QUYẾT 1 (giai đoạn 9):** gate hai chiều này sinh ra để canh đúng lượt
> đổi tên CSDL. Lượt đổi tên bị bỏ, nên gate này KHÔNG phải viết. Phát hiện vẫn giữ ở đây vì nó
> đúng: spec nói "cập nhật gate sẵn có" trong khi gate đó chưa từng tồn tại.

Spec §3.2.2 viết: "`scripts/kiem-dist.mjs` và các phép grep canh ranh giới nạp chậm D13 tìm chuỗi
`drtrong-board`…". Đã đọc **toàn bộ** `kiem-dist.mjs` (231 dòng) — nó chỉ kiểm ba luật A (không còn
`affine-`), B (biến `--drt-*` có định nghĩa), C (bản dịch `vi.json` có mặt). **Không một dòng nào**
nhắc `drtrong-board` hay `drtrong-noi-dung`. Gate hai chiều mà spec mô tả **phải được VIẾT MỚI** ở
giai đoạn 9, không phải "cập nhật" một gate sẵn có.

Bằng chứng gián tiếp mã đã "biết trước" việc này chưa xảy ra: comment trong `BoardGallery.tsx:16-19`
viết *"để tránh trùng con chuỗi 'drtrong-board' … sẽ khiến **việc grep sau này** kiểm ranh giới nạp
chậm D13 … báo dương tính giả"* — thì tương lai (chưa viết), đúng như grep xác nhận.

### 5. CSDL `drtrong-board` CHƯA được đổi tên thành `drtrong-noi-dung`

> **BỊ GHI ĐÈ bởi PHÁN QUYẾT 1 (giai đoạn 9):** bản plan đầu đề xuất dời lượt đổi tên sang giai
> đoạn 9 sau cổng sao lưu. Người điều phối bác: đổi tên ở giai đoạn 9 cũng mồ côi hoá nội dung y
> hệt, vì IndexedDB không có thao tác đổi tên thật. **Lượt đổi tên bị BỎ HẲN.** Phần phân tích
> dưới đây giữ nguyên vì nó chẩn đoán đúng mối nguy — chỉ kết luận là bị thay.

`grep -rn "drtrong-noi-dung" src/` ra **0 kết quả**. Ba nơi vẫn khai `TEN_CSDL_BANG = 'drtrong-board'`
độc lập nhau: `src/board/mo-doc.ts:34`, `src/board/diTruBangCu.ts:16` (sẽ xoá ở g8),
`src/board/xoaNoiDungBang.ts:20` (**KHÔNG** xoá — xem mục 6).

Spec §3.2 mô tả kiến trúc đích ("một workspace BlockSuite duy nhất … IndexedDB `drtrong-noi-dung`
(đổi từ `drtrong-board`)") nhưng **không gán việc đổi tên này vào một giai đoạn cụ thể nào** trong
bảng §4. Quyết định của plan này (xem lý do ở Task 10): **dời việc đổi tên vào giai đoạn 9**, ngay
sau cổng sao lưu, KHÔNG làm ở giai đoạn 8. Lý do: nếu đổi tên sớm, app lập tức mở một CSDL MỚI RỖNG
dưới tên mới — mọi nội dung CRDT thật (nét vẽ, chữ trong bài viết) đang nằm trong `drtrong-board`
**biến mất khỏi app ngay lập tức**, TRƯỚC KHI cổng sao lưu giai đoạn 9 kịp chạy. Đó là phá huỷ trá
hình dưới vỏ bọc "chỉ đổi tên hằng số" — đúng thứ luật 2 của spec §0 ("phá huỷ đi sau cùng") cấm.

### 6. `src/board/xoaNoiDungBang.ts` — file MỚI spec không biết tới, KHÔNG nằm trong danh sách xoá

File này (dựng 2026-08-31, sau khi spec được viết) triển khai xoá NỘI DUNG CRDT + gom rác blob cho
một mục đã xoá vĩnh viễn — gọi từ `LuoiMuc.tsx` (`xoaVinhVienNhieu`). Nó tự khai `TEN_CSDL_BANG =
'drtrong-board'` riêng (dòng 20), độc lập với `mo-doc.ts`. Đây là tính năng ĐANG SỐNG, không phải
mã hệ cũ — spec không liệt nó trong "xoá file" (đúng, vì spec viết trước khi file này tồn tại) và
plan này CŨNG không xoá nó. Nhưng: khi giai đoạn 9 đổi `TEN_CSDL_BANG`, **file này phải được sửa
đồng thời với `mo-doc.ts`** — bỏ sót một trong hai là mục xoá xong ở lưới nhưng nội dung CRDT không
bao giờ bị xoá thật (đúng lớp bug mà chính comment đầu file này đã ghi: "Đo 2026-08-31: xoá vĩnh viễn
cả 4 bảng xong, store `collection` vẫn còn nguyên 5 bản ghi").

### 7. `BI_DANH_KHOA`/`khoaChuan` — spec liệt vào danh sách xoá, nhưng **xoá là gây hồi quy thật**

Spec §3.5 dòng ~403 xếp `BI_DANH_KHOA`/`khoaChuan` chung với `ENTRY_TYPES` vào diện xoá giai đoạn 8.
**Đây là lỗi của spec, không xoá được.** Lý do cụ thể, đo bằng mã:

- `BI_DANH_KHOA = { "Hồi sức - Cấp cứu": "Cấp cứu" }` tồn tại để chuẩn hoá MỘT nhãn khoa lệch tên.
- Chuỗi `"Hồi sức - Cấp cứu"` xuất hiện ở **hai** nơi: `src/data/articles.ts:47` (xoá ở giai đoạn 8)
  **VÀ** `src/data/flashcards.ts:32` (**KHÔNG** nằm trong phạm vi xoá — thẻ ghi nhớ ở ngoài phạm vi
  theo spec §7).
- `khoaChuan()` được gọi trực tiếp trong `SearchScreen` ở hai chỗ ăn trên TOÀN BỘ `allResults`
  (App.tsx:1473 dựng dải chip, :1495 lọc theo chip) — không chỉ trên kết quả `"article"`. Kết quả
  `"flashcard"` (còn sống vĩnh viễn) mang `specialty: "Hồi sức - Cấp cứu"` từ `data/flashcards.ts`
  vẫn chạy qua đúng hai lượt gọi đó.

Xoá `BI_DANH_KHOA`/`khoaChuan` theo đúng lời spec sẽ làm dải chip tách "Hồi sức - Cấp cứu" thành một
chip RIÊNG thay vì gộp vào "Cấp cứu" — một hồi quy nhìn thấy được trên chính màn Tìm kiếm mà giai
đoạn 7 vừa nối vào `mucs`. **Quyết định của plan này: GIỮ NGUYÊN `BI_DANH_KHOA`/`khoaChuan`.**

### 8. `LibraryScreen`/`SpecialtyScreen` (hệ cũ) đã là dead code — xoá AN TOÀN HƠN spec ước tính

Plan 2 Task 7 đã đổi nhánh render `screen === "library"`/`screen === "specialty"` sang `BoardGallery`,
nhưng **giữ nguyên định nghĩa** hai hàm cũ để không phạm luật "đổi tên và đổi hành vi không đi chung
commit". Bằng chứng cả hai đã mồ côi hoàn toàn — không còn nơi nào GỌI chúng — nằm ngay trong mã,
người viết Plan 2 đã tự ghi chú và vô hiệu hoá cảnh báo `noUnusedLocals`:

```
App.tsx:12818-12827:
  // Ba tên dưới đây không còn được ĐỌC ở đâu sau Task 7 … KHÔNG xoá các định nghĩa/component đó —
  // spec §4: việc xoá mã hệ cũ là giai đoạn 8 …
  void LibraryScreen
  void SpecialtyScreen
  void pulseKey
```

Nghĩa là xoá `LibraryScreen`/`SpecialtyScreen`/`pulseKey` ở giai đoạn 8 là xoá đúng ba `void` này +
hai định nghĩa hàm — KHÔNG cần dò tìm nơi gọi, vì chắc chắn không còn nơi nào gọi (nếu có, `tsc` đã
không cho thêm `void` mà biên dịch sạch). `specialtyStats.ts` (`countArticlesFor`/`countFlashcardsFor`)
chỉ có ĐÚNG hai lời gọi, cả hai đều nằm trong hai hàm mồ côi này (App.tsx:1346, :1928) — xác nhận
bằng `grep`, không suy đoán: xoá được, đi kèm cùng Task.

Ngược lại: `ArticleScreen`, `CustomEntryScreen`, `AddEntryScreen`, `EcgScreen`, `EcgDetailScreen`,
`AddEcgScreen` **VẪN ĐANG SỐNG THẬT** — không có `void`, có nơi gọi thật:
- `SearchScreen.openResult()` (App.tsx:1515-1517) mở `article`/`customEntry`/`ecgDetail` từ kết quả
  tìm kiếm loại cũ.
- "Đã đọc gần đây" trên Trang chủ (App.tsx:12643-12645, hàm mở lại từ `recentReads`) mở lại đúng ba
  loại màn này.
- `AddEntryScreen`/`AddEcgScreen` là màn sửa của hai màn xem ở trên.

Xoá bốn/sáu màn này ở giai đoạn 8 tức là CẮT ĐỨT hai đường sống đó — người dùng có bài viết/bài ECG
tự nhập thật trên máy sẽ mất khả năng MỞ LẠI chúng qua Tìm kiếm hay "Đã đọc gần đây" (nội dung
KHÔNG mất — vẫn nằm trong IndexedDB `drtrong-ecg`/store `articles`/`lessons` tới tận giai đoạn 9 —
chỉ là không còn đường bấm vào UI để xem). Đây là hệ quả CÓ CHỦ Ý của quyết định 4 (spec §2: "Bỏ
toàn bộ dữ liệu cũ … Không viết code di trú"), đúng tinh thần cổng mà Plan 2 đã xin xác nhận cho
`boards`. Giai đoạn 8 của plan này lặp lại đúng cổng đó cho `articles`/`ecgLessons` — xem mục CỔNG
CHỦ DỰ ÁN bên dưới.

### 9. `manifest.json` / `sw.js` / `initialScreen()` — đã sạch sẵn, KHÔNG cần sửa

Spec §6.4 liệt ba mục này vào checklist "phải kiểm". Đã kiểm: `public/manifest.json` chỉ có hai
`shortcuts` (`?screen=mixing`, `?screen=mindmap`), cả hai còn là tab thật. `public/sw.js` không có
chuỗi `article`/`ecg`/`screen=` nào cần dọn. `initialScreen()` (App.tsx:12361-12364) chỉ nhận
`"mixing" | "library" | "mindmap" | "flashcard"`. Ba mục này giữ nguyên trong checklist Task 9 làm
gạch đầu dòng **XÁC NHẬN LẠI** (phòng hồi quy), không phải việc phải SỬA.

### 10. Hai test hiện có sẽ ĐỎ ngay khi giai đoạn 9 xoá store — spec không nhắc

- `src/lib/__tests__/idb.spec.ts` — toàn bộ file giả định store `boards`/`articles`/`ecgLessons` mở
  ghi được (test đường nâng cấp DB v4→v5). Sau `deleteObjectStore` ba store này, `idbPut(IDB_STORES.
  boards, …)` thất bại — file phải xoá hoặc viết lại hoàn toàn.
- `src/lib/__tests__/idb-store-mucs.spec.ts` — ca thứ ba tự đặt tên "KHÔNG xoá store cũ nào — giai
  đoạn 9 mới được phá huỷ" và `expect(IDB_STORES.boards).toBe('boards')`. Ca này PHẢI bị xoá/đảo
  ngược ở giai đoạn 9 — bản thân tên ca đã ghi rõ nó là tạm thời.

### 11. `Transformer.docToSnapshot`/`snapshotToDoc` chưa từng được gọi ở đâu ngoài vendor — rủi ro D13 thật, spec không nhắc

`grep -rn "docToSnapshot\|snapshotToDoc" src/` (loại vendor) ra 0 kết quả. Không có tiền lệ nào trong
repo về cách lấy một `Transformer` đã cấu hình đúng (`schema`/`docCRUD`/`blobCRUD`) từ một workspace
đang mở qua `taoHoacMoDoc()`. Nguy cơ cụ thể: `DataSyncScreen` sống trong `App.tsx` — **chunk vỏ
app, tải eager cho MỌI người dùng**. Nếu Task 4 (giai đoạn 7) import thẳng `Transformer` (hay bất cứ
gì từ `@blocksuite/affine/store`) vào `App.tsx`, D13 vỡ: mọi người dùng tải cả chồng ~1MB BlockSuite
ngay từ lần mở app đầu tiên, kể cả người chưa từng chạm Thư viện/Mindmap. Giai đoạn 7 Task 4 PHẢI
theo đúng khuôn `import()` động mà `BoardGallery.tsx` đã dùng cho `diTruBangCu.ts` — xem Task 4.

---

## Global Constraints

- **D11 — KHÔNG sửa `src/vendor/blocksuite/`.** Cổng `npm run kiem:vendor` canh điều này.
- **D12 — chuỗi hiển thị mới phải là tiếng Việt.**
- **D13 — ranh giới nạp chậm.** `src/board/__tests__/ranh-gioi-nap-bang.spec.ts` soi tĩnh
  `index.tsx`, `ChonDanhMuc.tsx`, `mucMeta.ts`. **Giai đoạn 7 Task 4 mở rộng nguy cơ này sang
  `App.tsx`/`DataSyncScreen`** — xem PHÁT HIỆN mục 11. Bất kỳ module mới nào import runtime
  BlockSuite phải nằm trong `src/board/` và được `App.tsx` `import()` ĐỘNG, không bao giờ tĩnh.
- **Giai đoạn 7–8 KHÔNG được chứa `deleteObjectStore`, `deleteDatabase`, hay đổi `DB_VERSION`.**
  Toàn bộ việc đó dồn vào giai đoạn 9, tách riêng ở cuối tài liệu này, có cổng chặn.
- **`tsc --noEmit` + `npm test` xanh trước mỗi commit.** Mốc hiện tại: **95 tệp / 840 ca** (đo trên
  `6f000b5`). Ghi số mới vào mỗi commit message nếu đổi.
- **Bẫy đã biết của repo — chép để khỏi vấp lại:**
  - `vi.mock` factory KHÔNG được `tsc` kiểm kiểu ⇒ đổi/xoá export phải `grep -rn "<tên cũ>" src/`
    rồi chạy TRỌN bộ test, không chỉ file liên quan.
  - Dev server thừa ở cổng 8443/5199 gây `EBUSY` trên `.tmp-test-*` ⇒ test ĐỎ GIẢ. Kiểm tiến trình
    `node`/`vite` thừa trước khi tin một lượt đỏ.
  - Sau merge/checkout đổi nhiều mã: xoá `node_modules/.vite` trước khi tin một lượt đỏ.
  - Message commit tiếng Việt phải viết qua Bash heredoc — PowerShell làm rụng dấu.
  - `tsc` MÙ với chuỗi (`?screen=`, tên CSDL, khoá `IDB_STORES`) — mọi bước xoá chuỗi phải kèm
    `grep`, không tin `tsc` xanh là đủ.
  - CSS BlockSuite chia hai cascade layer (`drt-vendor-tran` dưới base, `drt-vendor` trên base) —
    giai đoạn 9 không đụng CSS nên không áp dụng trực tiếp, nhưng nếu Task 4 lỡ kéo BlockSuite vào
    chunk vỏ app thì CSS của nó cũng theo vào, khả năng rò layer.
- **Mỗi ca kiểm quan trọng phải kèm bước chứng minh gỡ-vá-thấy-ĐỎ.** Bài học Plan 2: một "ca ghim"
  qua ba vòng review mà không canh được gì thật (xem KẾT QUẢ NGHIỆM THU của Plan 2, tiêu chí 3).
- **Tiêu chí xong mỗi giai đoạn phải có phần kiểm tay trên Chrome thật**, không phải Browser pane
  (không sinh sự kiện chuẩn hoá của `UIEventDispatcher` — xem `feedback_raf-khong-chay-trong-browser-pane`,
  `feedback_computer-key-gui-key-rong`).

---

## CỔNG CHỦ DỰ ÁN — đọc trước Task 6 (giai đoạn 8)

Task 6–7 xoá `ArticleScreen`/`CustomEntryScreen`/`AddEntryScreen`/`EcgScreen`/`EcgDetailScreen`/
`AddEcgScreen`. Theo PHÁT HIỆN mục 8: hai đường sống DUY NHẤT dẫn vào các màn này hôm nay là (a) kết
quả Tìm kiếm loại `article`/`customArticle`/`ecg`, và (b) panel "Đã đọc gần đây" ở Trang chủ. Xoá
các màn này cắt đứt CẢ HAI đường — bài viết/bài ECG tự nhập thật trên máy (nếu có) trở nên **không
mở lại được qua UI nào cả** cho tới khi giai đoạn 9 xoá luôn dữ liệu.

Nội dung KHÔNG mất ngay ở giai đoạn 8 (vẫn nằm trong IndexedDB `drtrong-ecg`, store `articles`/
`lessons`, đọc được bằng DevTools thủ công nếu cần) — nhưng về mặt SẢN PHẨM, đây là điểm không quay
đầu về UX, đúng tinh thần cổng mà Plan 2 đã xin cho `boards` ở giai đoạn 5.

**Trước khi chạy Task 6, chủ dự án xác nhận một trong hai:**
- (a) Bài viết/bài ECG tự nhập hiện có (nếu có) là dữ liệu thử, mất khả năng mở qua UI cũng được →
  chạy tiếp như plan, dữ liệu vẫn còn trên máy tới khi giai đoạn 9 xoá hẳn.
- (b) Có bài viết/bài ECG cần giữ đường mở lại → dừng lại, thêm một bước di trú `articles`/`lessons`
  → `mucs` (mỗi `Article`/`EcgLesson` cũ thành một `MucMeta` loại `bai-viet`, nội dung văn bản seed
  vào `TrangBaiViet` mới) trước khi xoá màn. Việc này KHÔNG có trong spec (spec giả định không có
  dữ liệu thật, quyết định 4).

> Đợi câu trả lời trước khi bắt đầu Task 6. Task 1–5 (giai đoạn 7 + phần dead-code của giai đoạn 8)
> không phụ thuộc câu trả lời này, làm được ngay.

> **ĐÃ TRẢ LỜI (chủ dự án, 2026-09-06): (a).** Bài viết và bài học ECG tự nhập hiện có là dữ liệu
> thử, mất được. Chạy plan đúng như viết, KHÔNG thêm bước di trú `articles`/`lessons` → `mucs`.
> Nguyên văn: *"tôi không có gì để sao lưu"* và *"cứ thực hiện, tôi tin bạn"*.
>
> Lưu ý đã nói rõ với chủ dự án trước khi họ quyết: Task 7 gỡ **hẳn tính năng Bài học ECG** (ba màn
> + `src/data/ecg.ts` + ba nhánh `Screen`), không chỉ dữ liệu — danh mục "ECG" của kho mới thay thế
> nó. Chủ dự án đã xác nhận sau khi biết điều này.

---

## File Structure

| File | Việc | Giai đoạn |
|---|---|---|
| `src/App.tsx` (`SearchScreen`, `SearchResult`) | Sửa — hợp nhất `mucs` vào kết quả tìm kiếm | 7 |
| `src/lib/recentReads.ts` | Sửa — thêm `ReadKind = "muc"` | 7 |
| `src/App.tsx` (`DataSyncScreen`, `ImportPayload`, `SyncSnapshot`) | Sửa — thêm khoá `mucs` (metadata) | 7 |
| `src/board/xuatNhapNoiDung.ts` | **Tạo** — cầu nối Transformer, nạp chậm, xuất/nhập snapshot doc | 7 |
| `src/App.tsx` (`LibraryScreen`, `SpecialtyScreen`, `pulseKey`) | Xoá — dead code đã void | 8 |
| `src/lib/specialtyStats.ts` | Xoá | 8 |
| `src/App.tsx` (`ArticleScreen`, `CustomEntryScreen`, `AddEntryScreen`), `src/data/articles.ts`, `src/components/BlockEditor.tsx`, `src/components/BlockContent.tsx`, `src/lib/blocks.ts`, `src/lib/richText.ts` | Xoá | 8 |
| `src/App.tsx` (`EcgScreen`, `EcgDetailScreen`, `AddEcgScreen`), `src/data/ecg.ts` | Xoá | 8 |
| `src/board/diTruBangCu.ts`, hai effect + hai cờ trong `src/board/BoardGallery.tsx` | Xoá | 8 |
| `src/data/types.ts` | Sửa — xoá 6 kiểu | 8 |
| `src/lib/storage.ts` (`CUSTOM_COLLECTION_KEYS.articles`) | Sửa — xoá khoá | 8 |
| `src/board/mo-doc.ts`, `src/board/xoaNoiDungBang.ts` | Sửa — đổi `TEN_CSDL_BANG` | 9 |
| ~~`src/lib/donCsdlCu.ts`~~ | **BỎ** — xem PHÁN QUYẾT 1 ở giai đoạn 9: không đổi tên CSDL, nên không có gì để dọn | — |
| `scripts/kiem-dist.mjs` | Sửa — thêm luật D (gate hai chiều tên CSDL) | 9 |
| `src/lib/idb.ts` | Sửa — `deleteObjectStore` ×3, `DB_VERSION` 6→7 | 9 |
| `src/lib/__tests__/idb.spec.ts`, `src/lib/__tests__/idb-store-mucs.spec.ts` | Xoá/sửa ca lỗi thời | 9 |

---

# GIAI ĐOẠN 7 — Tìm kiếm & Đồng bộ dữ liệu

## Task 1: Tìm kiếm toàn app đọc `mucs`

**Files:**
- Modify: `src/App.tsx` (`SearchResult` dòng 1390; `useIdbCollection` dòng 1426; `allResults` dòng
  1433-1465; `RESULT_LABEL` dòng 1506; `openResult` dòng 1514-1519)
- Modify: `src/App.tsx` (nơi dựng `<SearchScreen>`, truyền thêm state mở-theo-danh-mục)
- Test: `src/__tests__/SearchScreen.spec.ts` (sửa — đổi seed từ `IDB_STORES.boards` sang `mucs`)

**Interfaces:**
- Consumes: `MucMeta` (`loai`, `danhMuc`), `IDB_STORES.mucs`, cơ chế `moBangYeuCau` +
  `danhMucDangXem` đã tổng quát hoá từ Plan 2 Task 6-7 (App.tsx:12375, :12399 — CHỈ instance đang
  hiển thị mới tiêu thụ `moBangYeuCau`, xem chú thích dài tại đó trước khi sửa).
- Produces: `SearchResult` thêm biến thể `kind: "muc"` mang `loai: LoaiMuc` (để phân biệt điều
  hướng); `RESULT_LABEL` cho `"muc"` tính động theo `loai` thay vì tra bảng tĩnh.

**Quan trọng — KHÔNG xoá bốn kind cũ (`article`/`customArticle`/`ecg`) ở Task này.** Chúng còn sống
tới giai đoạn 8. Task này CHỈ thêm kind `"muc"` bên cạnh, đổi nguồn đọc từ `boards` → `mucs`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

Thêm vào `src/__tests__/SearchScreen.spec.ts` (giữ nguyên các ca hiện có, chỉ đổi cách SEED cho kind
board/muc — các ca dùng `idbPut(IDB_STORES.boards, {...})` cũ phải chuyển hẳn sang
`idbPut(IDB_STORES.mucs, {...})` VỚI ĐỦ `loai`/`danhMuc` bắt buộc, vì `MucMeta` không còn nhánh `??`
phòng vệ từ Task 1 Plan 2):

```ts
it('tìm kiếm thấy một bài viết mucs vừa tạo (không chỉ sơ đồ)', async () => {
  await idbPut(IDB_STORES.mucs, {
    id: 'muc-bv-1',
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Đọc ECG rung nhĩ',
    taoLuc: 1,
    capNhatLuc: 1,
    chuyenKhoa: 'tim-mach',
    tags: [],
    noiDungTimKiem: 'rung nhĩ QRS không đều',
  })
  render(<SearchScreen onNavigate={vi.fn()} onBack={vi.fn()} customArticles={[]} customFlashcards={[]} ecgLessons={[]} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rung nhĩ' } })
  expect(await screen.findByText('Đọc ECG rung nhĩ')).toBeTruthy()
})

it('bấm kết quả loại bài viết KHÔNG mở tab Mindmap', async () => {
  const onNavigate = vi.fn()
  await idbPut(IDB_STORES.mucs, {
    id: 'muc-bv-2', loai: 'bai-viet', danhMuc: 'phac-do', ten: 'Sốc nhiễm khuẩn',
    taoLuc: 1, capNhatLuc: 1, chuyenKhoa: '', tags: [], noiDungTimKiem: '',
  })
  render(<SearchScreen onNavigate={onNavigate} onBack={vi.fn()} customArticles={[]} customFlashcards={[]} ecgLessons={[]} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sốc' } })
  fireEvent.click(await screen.findByText('Sốc nhiễm khuẩn'))
  expect(onNavigate).not.toHaveBeenCalledWith('mindmap', expect.anything())
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

`npx vitest run src/__tests__/SearchScreen.spec.ts` — ca đầu ĐỎ (đọc `boards` không thấy mục mới ở
`mucs`); ca sau ĐỎ (điều hướng cứng luôn ra `"mindmap"`).

- [ ] **Bước 3: Đổi nguồn đọc + hợp nhất kind**

```ts
// Đổi dòng 1426
const { items: mucs, loading: dangNapMuc, loiDoc: loiDocMuc } = useIdbCollection<MucMeta>(IDB_STORES.mucs)
```

Trong `SearchResult` (dòng 1390), thêm biến thể (GIỮ bốn dòng cũ nguyên văn, chỉ thêm):

```ts
interface SearchResult {
  kind: "article" | "customArticle" | "ecg" | "flashcard" | "muc"
  id: string
  title: string
  subtitle: string
  specialty?: string
  tags: string[]
  noiDung?: string
  /** CHỈ kind "muc" set trường này — quyết định điều hướng ở openResult(). */
  loai?: LoaiMuc
  /** CHỈ kind "muc" set — cần để mở đúng instance BoardGallery khi loai === 'bai-viet'. */
  danhMuc?: IdDanhMuc
}
```

Thay khối `...boards.filter(...).map(...)` (dòng 1445-1463) bằng nguồn `mucs`:

```ts
...mucs
  .filter((m) => !m.daXoaLuc)
  .map((m): SearchResult => ({
    kind: "muc",
    id: m.id,
    title: m.ten,
    subtitle: "",
    specialty: SPECIALTIES.find((s) => s.id === m.chuyenKhoa)?.name,
    tags: m.tags ?? [],
    noiDung: m.noiDungTimKiem,
    loai: m.loai,
    danhMuc: m.danhMuc,
  })),
```

Cập nhật deps của `useMemo` (dòng cuối, `[customArticles, customFlashcards, ecgLessons, boards]` →
`… , mucs]`).

- [ ] **Bước 4: `RESULT_LABEL` động theo `loai` + huy hiệu icon dùng lại `iconLoaiMuc`**

```ts
const RESULT_LABEL: Record<Exclude<SearchResult["kind"], "muc">, string> = {
  article: "",
  customArticle: "Tự nhập",
  ecg: "ECG",
  flashcard: "Thẻ ghi nhớ",
}
// Kind "muc": nhãn suy từ r.loai ngay tại chỗ hiển thị — "Bài viết" | "Sơ đồ" — KHÔNG tra bảng tĩnh,
// vì một giá trị "muc" mang theo cả hai khả năng (khác bốn kind kia, mỗi kind chỉ một nhãn cố định).
```

Sửa chỗ render nhãn (tìm `RESULT_LABEL[r.kind]`, đây là chỗ literal cần đổi thành điều kiện — grep
`RESULT_LABEL\[` để tìm đúng chỗ, KHÔNG đoán dòng vì có thể lệch sau Task 1-3).

- [ ] **Bước 5: Điều hướng theo `loai` — dùng lại cơ chế `moBangYeuCau`/`danhMucDangXem` đã có**

`openResult()` cần gọi ra ngoài (App() giữ state điều hướng, SearchScreen chỉ là component con nhận
props — xem chữ ký hiện tại `onNavigate: (s: Screen, id?: string) => void`). Thêm một callback mới
thay vì nhồi vào `onNavigate`:

```ts
// Chữ ký SearchScreen thêm:
onMoMuc: (id: string, loai: LoaiMuc, danhMuc: IdDanhMuc) => void

function openResult(r: SearchResult) {
  if (r.kind === "article") onNavigate("article", r.id)
  else if (r.kind === "customArticle") onNavigate("customEntry", r.id)
  else if (r.kind === "ecg") onNavigate("ecgDetail", r.id)
  else if (r.kind === "muc" && r.loai && r.danhMuc) onMoMuc(r.id, r.loai, r.danhMuc)
  else onNavigate("specialty", SPECIALTIES.find((s) => s.name === r.specialty)?.id)
}
```

Ở App(), nơi dựng `<SearchScreen>`, truyền:

```tsx
onMoMuc={(id, loai, danhMuc) => {
  if (loai === 'so-do') {
    setMoBangYeuCau(id)
    navigate('mindmap')
  } else {
    // Cùng khuôn Task 6/7 Plan 2 dùng cho "Tạo bài mới": nhắm instance màn "danhMuc".
    setDanhMucDangXem(danhMuc)
    setMoBangYeuCau(id)
    navigate('danhMuc')
  }
}}
```

**Đọc kỹ chú thích tại `moBangYeuCau` (App.tsx quanh dòng 12546-12556) trước khi sửa** — nó giải
thích vì sao HAI instance BoardGallery (Mindmap, danhMuc) cùng tiêu thụ một state nhưng chỉ đúng MỘT
cái đang hiển thị mới thật sự mở — bug đã vá ở `767bf3b` (Plan 2). Không tự chế lại cơ chế này.

- [ ] **Bước 6: Chạy ca kiểm + trọn bộ**

`npx vitest run src/__tests__/SearchScreen.spec.ts` → xanh. `npx tsc --noEmit && npm test` → xanh.
Kiểm riêng: ca cũ nào seed qua `IDB_STORES.boards` cho kind "board" phải được ĐỔI (không phải xoá)
sang `IDB_STORES.mucs` + `kind: "muc"` — nếu để nguyên, chúng âm thầm hết tác dụng (đọc store rỗng,
"0 kết quả" trông như xanh nhưng không canh được gì).

- [ ] **Bước 7: Commit**

```bash
git add src/App.tsx "src/__tests__/SearchScreen.spec.ts"
git commit -m "$(cat <<'EOF'
feat(tim-kiem): hợp nhất mucs vào SearchScreen, mở đúng bài viết/sơ đồ theo loai

EOF
)"
```

---

## Task 2: "Đã đọc gần đây" ghi nhận `MucMeta`

**Files:**
- Modify: `src/lib/recentReads.ts` (`ReadKind` dòng 15)
- Modify: `src/board/BoardGallery.tsx` (nơi mở một mục thành công — effect `moBangYeuCau` và nhánh
  mở qua lưới)
- Modify: `src/App.tsx` (nơi dựng `recentReadItems`, dòng ~12605-12622 — thêm nhánh cho kind `"muc"`)
- Test: `src/board/__tests__/BoardGallery-ghi-nhan-doc.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `recordRead` (đã có, `src/lib/recentReads.ts`).
- Produces: `ReadKind` thêm `"muc"`; `BoardGallery` gọi `recordRead("muc", id)` khi một mục thật sự
  mở thành công (không phải mỗi lần effect chạy).

**Ràng buộc:** `BoardGallery.tsx` là app-shell (import trực tiếp trong `App.tsx`, KHÔNG lazy) —
`recordRead` chỉ đụng `localStorage`, không kéo BlockSuite, nên gọi thẳng ở đây AN TOÀN với D13
(khác hẳn Task 4 dưới, nơi rủi ro D13 là thật).

- [ ] **Bước 1: Viết ca kiểm đỏ**

```ts
// src/lib/__tests__/recentReads-muc.spec.ts
import { describe, expect, it } from 'vitest'
import { recordRead, loadRecentReads } from '../recentReads'

describe('recentReads — kind muc', () => {
  it('ghi nhận được kind "muc"', () => {
    recordRead('muc', 'muc-1')
    expect(loadRecentReads()[0]).toMatchObject({ kind: 'muc', id: 'muc-1' })
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ** — `npx vitest run src/lib/__tests__/recentReads-muc.spec.ts` — ĐỎ
  vì `ReadKind` không nhận `'muc'` (lỗi kiểu, hoặc `isEntry()` từ chối bản ghi).

- [ ] **Bước 3: Mở rộng `ReadKind`**

```ts
export type ReadKind = "article" | "custom" | "ecg" | "muc"
```

Sửa `isEntry()` (dòng ~28) thêm `e.kind === "muc"` vào điều kiện `||`.

- [ ] **Bước 4: Gọi `recordRead` từ `BoardGallery.tsx` đúng một chỗ — khi mở THÀNH CÔNG**

Tìm nơi `BoardGallery` biết chắc một `boardId` đã mở xong (không phải lúc `setOpenBoardId` — đó là
Ý ĐỊNH mở, có thể còn hỏng). Ứng viên: chỗ set `openLoai`/`openBoardId` sau khi tra `mucs` xong
trong effect `moBangYeuCau` (Task 5 Plan 2, App.tsx dòng ~856-866 nguyên bản, đã trộn thêm `openLoai`
từ Task 5), VÀ chỗ tương tự khi mở qua bấm thẻ trong lưới (`onMoBang` callback từ `LuoiMuc`). Đọc kỹ
`BoardGallery.tsx` hiện tại (đã đổi khác nhiều so với Plan 2 vì Task 6/7/8 review đã sửa lại) trước
khi quyết định đúng MỘT điểm gọi — tránh gọi trùng ở cả hai đường cho cùng một lượt mở (một mục mở
qua bấm thẻ trong lưới Mindmap thì cũng phải qua `onMoBang`, không phải cả hai).

```ts
recordRead('muc', boardId)
```

- [ ] **Bước 5: HomeScreen hiển thị mục "muc" trong panel "Đã đọc gần đây"**

`recentReadItems` (App.tsx ~12605-12622) hiện tra tên/tiêu đề theo `customArticlesCol.items`/
`ecgCol.items`. Thêm nhánh tra theo `mucs` (cần một `useIdbCollection<MucMeta>(IDB_STORES.mucs)` ở
App() — kiểm xem Task 4 dưới đã thêm chưa trước khi thêm trùng, hai Task này có thể làm song song).

```ts
if (e.kind === 'muc') {
  const m = mucsItems.find((x) => x.id === e.id)
  if (m) out.push({ id: m.id, kind: 'muc', title: m.ten, tag: DANH_MUC.find((d) => d.id === m.danhMuc)?.ten ?? '', at: e.at })
}
```

Bấm vào mục này ở HomeScreen phải mở đúng qua cùng cơ chế `onMoMuc` của Task 1 (không tự chế đường
điều hướng thứ ba).

- [ ] **Bước 6: Chạy trọn bộ** — `npx tsc --noEmit && npm test` → xanh.

- [ ] **Bước 7: Commit**

```bash
git add src/lib/recentReads.ts src/board/BoardGallery.tsx src/App.tsx "src/lib/__tests__/recentReads-muc.spec.ts"
git commit -m "$(cat <<'EOF'
feat(doc-gan-day): ghi nhận lượt mở MucMeta vào Đã đọc gần đây

EOF
)"
```

---

## Task 3: Đồng bộ dữ liệu — metadata `mucs` (KHÔNG đụng nội dung doc)

**Files:**
- Modify: `src/App.tsx` (`ImportPayload`/`SyncSnapshot` dòng ~4143-4161; `categoryRows` dòng
  ~4218-4225; `handleExport`, `handleFileChange`, `handleConfirmImport`, `handleRestoreSnapshot`)
- Test: `src/__tests__/DataSyncScreen-mucs.spec.tsx` (tạo)

**Phạm vi cố ý hẹp:** Task này CHỈ xuất/nhập bảng `MucMeta[]` (tên, danh mục, tag, chuyên khoa —
đúng những gì đã nằm trong store `mucs`). **KHÔNG đụng nội dung doc CRDT** (chữ/nét vẽ thật) — đó là
Task 4, tách riêng vì rủi ro D13 khác hẳn (Task này an toàn tuyệt đối với D13, không đụng gì tới
BlockSuite).

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
it('xuất file gồm cả mục metadata mucs', async () => {
  await idbPut(IDB_STORES.mucs, {
    id: 'm1', loai: 'bai-viet', danhMuc: 'ecg', ten: 'Test', taoLuc: 1, capNhatLuc: 1,
    chuyenKhoa: '', tags: [], noiDungTimKiem: '',
  })
  // dựng DataSyncScreen, bấm "Xuất file", đọc lại Blob đã tạo qua URL.createObjectURL mock,
  // expect JSON.parse(...).data.mucs.meta để có đúng một phần tử id 'm1'.
})

it('nhập file mucs mới gộp vào store, không đè mục đang có id khác', async () => { /* … */ })

it('Hoàn tác nhập file trả mucs về đúng snapshot trước khi nhập', async () => { /* … */ })
```

*(Viết đủ ba ca theo khuôn `categoryRows`/`diffImportCounts` đã có sẵn trong file — đọc
`handleFileChange`/`handleConfirmImport` hiện tại trước khi viết mock, tái dùng chính xác cấu trúc
`FileReader`/`Blob` mà các ca kiểm khác của `DataSyncScreen` (nếu có) đã dùng.)*

- [ ] **Bước 2: Chạy để thấy đỏ.**

- [ ] **Bước 3: Thêm `mucs` (chỉ meta) vào `ImportPayload`/`SyncSnapshot`/`categoryRows`**

```ts
type ImportPayload = {
  articles: Article[]
  // … giữ nguyên toàn bộ khoá cũ …
  mucs: MucMeta[]
}
type SyncSnapshot = ImportPayload // giữ nguyên cấu trúc chung như hiện tại
```

`DataSyncScreen` cần đọc `mucs` thật — thêm prop:

```ts
customMucs: MucMeta[]
```

App() truyền `customMucs={mucsCol.items}` (thêm `const mucsCol = useIdbCollection<MucMeta>(IDB_STORES.mucs)`
ở App() nếu Task 2 chưa thêm).

`categoryRows` thêm một dòng:

```ts
{ key: "mucs", label: "Bài viết & Sơ đồ", current: customMucs, incomingOf: (d) => d.mucs },
```

`handleExport`: thêm `mucs: pick("mucs", customMucs)` vào payload; `duLieuChuaDocDuoc` thêm điều
kiện `|| mucsCol.loiDoc !== null` (cùng lý do đã áp dụng cho `articles`/`ecgLessons` — đọc hỏng lúc
xuất tạo file thiếu dữ liệu vĩnh viễn).

`handleFileChange`: thêm nhánh đọc `d.mucs` (mảng, mặc định `[]` nếu file cũ không có khoá này —
CÙNG cách xử lý file cũ thiếu khoá `ecgLessons`/nhóm thuốc truyền mới đã làm).

`handleConfirmImport`/`onImport`/`handleRestoreSnapshot`: nối `mucs` vào luồng gộp — dùng
`mucsCol.upsertMany(data.mucs)` cho nhập thường, `mucsCol.replaceAll(snapshot.mucs)` cho hoàn tác.

- [ ] **Bước 4: Ràng buộc an toàn — TOÀN-BỘ-HOẶC-KHÔNG (spec §3.6, ràng buộc 1)**

`handleFileChange` hiện PHÂN TÍCH xong mới hỏi xác nhận (`pendingImport`), CHƯA ghi gì — đúng mẫu
"toàn-bộ-hoặc-không" đã có sẵn cho các bảng khác. Xác nhận: không có đường nào trong
`handleConfirmImport` ghi TỪNG bảng một cách có thể dừng giữa chừng (mỗi `upsertMany`/`replaceAll`
là một transaction `idb` riêng — SPEC muốn "xác thực mọi snapshot trước khi ghi bất kỳ cái nào", còn
GHI thì vẫn tuần tự nhiều transaction như các bảng khác đã làm từ trước, không phải một transaction
CSDL duy nhất). Task này KHÔNG cần xây cơ chế transaction mới — chỉ cần `mucs` đi đúng khuôn xác
thực-trước-khi-ghi mà `parsedData`/`pendingImport` đã áp dụng cho mọi khoá khác.

- [ ] **Bước 5: Chạy ca kiểm + trọn bộ.**

- [ ] **Bước 6: Commit**

```bash
git add src/App.tsx "src/__tests__/DataSyncScreen-mucs.spec.tsx"
git commit -m "$(cat <<'EOF'
feat(dong-bo): thêm metadata mucs vào Xuất/Nhập file — chưa gồm nội dung doc

EOF
)"
```

---

## Task 4: Đồng bộ dữ liệu — nội dung doc CRDT (Transformer, nạp chậm)

**Rủi ro cao nhất của giai đoạn 7 — đọc mục PHÁT HIỆN #11 trước khi bắt đầu.** Không có tiền lệ nào
trong repo dùng `Transformer` ngoài vendor. Task này BẮT BUỘC một bước SPIKE trước khi viết UI, đúng
luật 1 của spec §0 ("chứng minh trước khi phá") — không đoán API.

**Files:**
- Create: `src/board/xuatNhapNoiDung.ts` (module nạp chậm, chỉ `App.tsx` `import()` ĐỘNG)
- Modify: `src/App.tsx` (`handleExport`/`handleFileChange`/`handleConfirmImport` — gọi qua
  `import()` động, không import tĩnh bất cứ gì từ file trên)
- Test: `src/board/__tests__/xuat-nhap-noi-dung.spec.ts` (tạo — vòng tròn xuất→xoá→nhập)
- Test: mở rộng `src/board/__tests__/ranh-gioi-nap-bang.spec.ts` — soi tĩnh `App.tsx` KHÔNG import
  trực tiếp `xuatNhapNoiDung.ts` (D13 cho app-shell, kiểu gate mới — App.tsx hiện chưa bị soi bởi
  gate này, cần thêm một `describe` mới, không sửa ba `describe` hiện có)

- [ ] **Bước 0 — SPIKE, không tính là bước sản phẩm:**

Viết một test (KHÔNG commit riêng, gộp vào bước sau khi đã chứng minh) mở một doc qua
`taoHoacMoDoc()` (đã có ở `mo-doc.ts`), gõ vài khối nội dung, gọi `docToSnapshot(store)`, kiểm JSON
trả về hợp lý (không `undefined`), rồi `snapshotToDoc(snapshot)` vào một doc/workspace TRỐNG khác,
đọc lại nội dung khớp. Đây là câu hỏi phải trả lời TRƯỚC: **Transformer lấy `schema`/`docCRUD`/
`blobCRUD` từ đâu khi đã có một workspace từ `taoHoacMoDoc()`?** — đọc
`src/vendor/blocksuite/framework/store/src/transformer/transformer.ts` (constructor,
`TransformerOptions`) và cách `TestWorkspace`/BlockSuite thượng nguồn thường dựng `Transformer` từ
một workspace có sẵn (tìm trong cây vendor bằng `codegraph_explore "Transformer workspace.exportJSX
getTransformer"` hoặc tương đương — ĐỪNG đoán tên phương thức).

Nếu spike cho thấy tích hợp phức tạp hơn ước tính (ví dụ Transformer đòi một `Store` với schema khác
`storeManager` mà `mo-doc.ts` dùng, hoặc `AssetsManager`/blob middleware đòi nhiều lắp ráp hơn một
dòng), **DỪNG, báo lại chủ dự án, đề xuất tách Task này thành một chặng riêng có spec riêng** — đúng
tinh thần "phá được thì phải hoàn tác được" nhưng ở đây là "làm được thì phải chứng minh trước", và
Task 3 (metadata) đã tự đứng được độc lập, không cần Task 4 mới xuất bản được.

- [ ] **Bước 1: Viết ca kiểm đỏ (SAU KHI spike đã xác nhận API dùng được)**

```ts
// src/board/__tests__/xuat-nhap-noi-dung.spec.ts
it('vòng tròn: mở doc, gõ chữ, xuất snapshot, xoá doc, nhập lại — nội dung giống hệt', async () => {
  // 1. taoHoacMoDoc('m1', 'bai-viet') → gõ chữ vào note
  // 2. xuatSnapshotMuc('m1') → snapshot JSON
  // 3. Giả lập "xoá sạch" — mở lại workspace mới, không có doc 'm1'
  // 4. nhapSnapshotMuc('m1', snapshot) → doc mới có ĐÚNG nội dung đã gõ
})

it('ảnh chèn trong bài viết cũng đi theo snapshot (blob middleware)', async () => { /* … */ })
```

- [ ] **Bước 2: Chạy để thấy đỏ.**

- [ ] **Bước 3: Viết `src/board/xuatNhapNoiDung.ts`**

Chữ ký tối thiểu (điều chỉnh theo những gì Bước 0 xác nhận được — không chép nguyên khối dưới đây
nếu spike cho ra API khác):

```ts
export async function xuatSnapshotMuc(id: string): Promise<DocSnapshot | undefined>
export async function nhapSnapshotMuc(id: string, snapshot: DocSnapshot): Promise<void>
```

File này import `taoHoacMoDoc`, `storeManager` từ `./mo-doc` — HỢP LỆ (D13 chỉ cấm `App.tsx` import
tĩnh `mo-doc.ts`/`EdgelessBoard`/`TrangBaiViet`, không cấm một module khác trong `src/board/` làm
vậy, giống `EdgelessBoard.tsx` đã làm).

- [ ] **Bước 4: Gọi từ `App.tsx` bằng `import()` động — ĐÚNG khuôn `diTruBangCu.ts`**

```ts
// Trong handleExport, CHỈ lúc người dùng thật sự bấm "Xuất file" và đã chọn mục "mucs":
const { xuatSnapshotMuc } = await import('../board/xuatNhapNoiDung')
const docs = await Promise.all(customMucs.map((m) => xuatSnapshotMuc(m.id)))
```

Tương tự cho nhập ở `handleConfirmImport`. **KHÔNG** `import { xuatSnapshotMuc } from '../board/
xuatNhapNoiDung'` ở đầu `App.tsx` — đó chính là lỗ D13 mà PHÁT HIỆN #11 cảnh báo.

- [ ] **Bước 5: Thêm gate D13 cho `App.tsx`**

```ts
// src/board/__tests__/ranh-gioi-nap-bang.spec.ts — thêm describe mới, KHÔNG sửa ba describe cũ
describe('App.tsx — ranh giới D13 cho xuất/nhập nội dung doc', () => {
  const nguon = readFileSync(new NodeURL('../../App.tsx', import.meta.url), 'utf8')
  it('App.tsx không import tĩnh xuatNhapNoiDung', () => {
    expect(/^import\s+.*xuatNhapNoiDung/m.test(nguon)).toBe(false)
  })
})
```

- [ ] **Bước 6: Ca kiểm vòng tròn cấp UI — CỔNG CHẶN PHÁT HÀNH (spec §3.6 ràng buộc 3)**

```ts
it('[CỔNG] xuất file → xoá sạch mucs (metadata + doc) → nhập lại → nội dung bài viết và sơ đồ giống hệt trước, kể cả ảnh', async () => {
  // Dựng 1 bài viết có ảnh + 1 sơ đồ có chữ trên canvas. Xuất. Xoá store mucs + xoá doc CRDT tương
  // ứng (mô phỏng "xoá sạch"). Nhập lại file vừa xuất. So sánh: MucMeta khớp field-by-field,
  // trichVanBanTuKhoi(doc mới) === trichVanBanTuKhoi(doc cũ), ảnh (blob hash) khớp.
})
```

- [ ] **Bước 7: Chạy trọn bộ + đo bundle**

`npx tsc --noEmit && npm test && npm run build` — kiểm chunk vỏ app (không phải chunk soạn thảo)
KHÔNG phình lên đáng kể so với trước Task này (so `dist/assets/*.js` kích thước file KHÔNG chứa
`drt-` mật độ cao — cùng phép đo `kiem-dist.mjs` đã dùng để phân biệt file bảng vẽ). Nếu chunk vỏ
app tăng > vài KB, có khả năng `import()` động đã bị bundler "hoisting" nhầm — điều tra trước khi
commit, đừng bỏ qua.

- [ ] **Bước 8: Commit**

```bash
git add src/board/xuatNhapNoiDung.ts src/App.tsx src/board/__tests__/xuat-nhap-noi-dung.spec.ts src/board/__tests__/ranh-gioi-nap-bang.spec.ts
git commit -m "$(cat <<'EOF'
feat(dong-bo): xuất/nhập nội dung doc CRDT qua Transformer, nạp chậm sau App.tsx

EOF
)"
```

---

## Tiêu chí xong giai đoạn 7

1. `tsc --noEmit` sạch, `npm test` xanh trọn bộ (số ca tăng so với mốc 840, ghi số mới).
2. `npm run build`, `npm run kiem:dist`, `npm run kiem:vendor` xanh.
3. Gõ một truy vấn trên ô Tìm kiếm khớp một bài viết `mucs` vừa tạo VÀ một sơ đồ `mucs` vừa tạo —
   cả hai đều ra, bấm vào mở đúng (bài viết → `TrangBaiViet` qua màn danh mục đúng; sơ đồ → tab
   Mindmap). **Kiểm tay trên Chrome thật**, không phải Browser pane.
4. Xuất file → mở file JSON bằng tay → thấy khoá `mucs.meta` (và `mucs.docs` nếu Task 4 đã làm).
5. **[CỔNG]** Vòng tròn xuất → xoá sạch → nhập lại cho nội dung bài viết/sơ đồ giống hệt, kể cả ảnh
   — ca kiểm Task 4 Bước 6 xanh VÀ đã chứng minh gỡ vá thấy đỏ (tạm comment `nhapSnapshotMuc` cho
   ném lỗi, xác nhận ca kiểm bắt được).
6. `grep -rn "IDB_STORES.boards" src/App.tsx` — chỉ còn ở các màn hệ cũ (`ArticleScreen` và các màn
   xoay quanh, nếu chúng có nhắc — thực tế chúng dùng `articles`/`ecgLessons`, không dùng `boards`;
   xác nhận `SearchScreen` không còn dòng nào đọc `IDB_STORES.boards`).
7. Nếu Task 4 bị hoãn (spike thất bại): ghi rõ lý do vào tài liệu này (mục mới cuối giai đoạn 7),
   Task 3 vẫn đứng độc lập, KHÔNG chặn giai đoạn 8.

---

# GIAI ĐOẠN 8 — Gỡ hệ cũ

> Nhắc lại CỔNG CHỦ DỰ ÁN ở trên: Task 6–7 cần xác nhận trước khi chạy. Task 5, 8 không phụ thuộc,
> làm được ngay.

## Task 5: Xoá `LibraryScreen`/`SpecialtyScreen` (dead code) + `specialtyStats.ts`

**An toàn nhất trong giai đoạn 8** — đã xác nhận mồ côi hoàn toàn (PHÁT HIỆN #8), không có đường
sống nào phải cắt, không cần cổng chủ dự án.

**Files:**
- Modify: `src/App.tsx` (xoá hàm `LibraryScreen` dòng 1302-~1390 khớp thật; hàm `SpecialtyScreen`
  dòng 1912-~1996 khớp thật; ba dòng `void` + khai báo `pulseKey` không còn dùng, dòng ~12820-12827;
  hai comment tham chiếu "SpecialtyScreen hệ cũ" ở dòng ~12885, ~12902, ~12960, ~13053 — dọn luôn
  cho khỏi trỏ vào mã đã xoá)
- Delete: `src/lib/specialtyStats.ts`
- Modify: xoá `import { countArticlesFor, countFlashcardsFor } from "./lib/specialtyStats"` (dòng 97)

- [ ] **Bước 1: Xác nhận lại bằng grep (đừng tin số dòng trên, có thể lệch)**

```bash
grep -n "^function LibraryScreen\|^function SpecialtyScreen" src/App.tsx
grep -n "void LibraryScreen\|void SpecialtyScreen\|void pulseKey" src/App.tsx
grep -n "countArticlesFor\|countFlashcardsFor" src/App.tsx
```

Xác nhận `countArticlesFor`/`countFlashcardsFor` CHỈ xuất hiện bên trong hai hàm sắp xoá + dòng
import — nếu grep cho ra một lời gọi khác, DỪNG, đừng xoá `specialtyStats.ts`.

- [ ] **Bước 2: Xoá theo đúng ranh giới hàm** (dùng số dòng grep Bước 1 xác nhận, không phải số
  dòng ghi trong plan này).

- [ ] **Bước 3: Xoá state `pulseKey` không còn ai đọc**

`const [pulseKey, setPulseKey] = useState(0)` — kiểm `setPulseKey` còn được gọi ở `jumpTo()` (đúng,
comment đã ghi "vẫn tăng qua setPulseKey trong jumpTo(), chỉ là không ai đọc nữa"). Xoá CẢ state lẫn
mọi lời gọi `setPulseKey`, và tham số `pulseKey`/`isFinal` liên quan trong `jumpTo()` nếu chúng chỉ
tồn tại để nuôi state này — đọc `jumpTo()` trọn vẹn trước khi cắt, `isFinal` có thể còn ý nghĩa khác
ngoài `pulseKey`.

- [ ] **Bước 4: Chạy trọn bộ**

`npx tsc --noEmit` — kỳ vọng: sạch, KHÔNG còn cảnh báo `noUnusedLocals` nào mới xuất hiện (nếu xoá
sót một biến chỉ được dùng bên trong hai hàm đã xoá, `tsc` sẽ tự bắt — đây là trường hợp HIẾM `tsc`
THỰC SỰ giúp được, vì nó là lỗi kiểu chứ không phải lỗi chuỗi).

`npm test` — xanh. Không ca nào trong bộ test hiện có seed/gọi `LibraryScreen`/`SpecialtyScreen`
trực tiếp (chúng không export) nên không có test nào cần sửa ở Task này.

- [ ] **Bước 5: Commit**

```bash
git add src/App.tsx
git rm src/lib/specialtyStats.ts
git commit -m "$(cat <<'EOF'
chore(don-dep): xoá LibraryScreen/SpecialtyScreen hệ cũ (mồ côi từ Plan 2 Task 7) + specialtyStats.ts

EOF
)"
```

---

## Task 6: Xoá hệ bài viết tự viết tay (`ArticleScreen`/`CustomEntryScreen`/`AddEntryScreen`)

**Cần CỔNG CHỦ DỰ ÁN ở trên đã trả lời.**

**Files:**
- Modify: `src/App.tsx` — xoá `ArticleScreen`, `CustomEntryScreen`, `AddEntryScreen`, `ENTRY_TYPES`,
  nhánh `Screen`: `"article" | "customEntry" | "addEntry"`, ba nhánh render tương ứng, các state
  `editArticleDraft`/`viewCustomId`/`handleSaveEntry` chỉ phục vụ ba màn này, `linkTargets`/
  `openLinkTarget`/`LinkTarget` import — **NHƯNG GIỮ `BI_DANH_KHOA`/`khoaChuan`** (PHÁT HIỆN #7 —
  `flashcards.ts` còn dùng).
- Modify: `SearchScreen`/`SearchResult` — xoá kind `"article"`/`"customArticle"`, hai nhánh
  `RESULT_LABEL`, hai nhánh `openResult`, `...ARTICLES.map(...)`/`...customArticles.map(...)` trong
  `allResults`.
- Modify: `src/lib/recentReads.ts` — `ReadKind` bỏ `"article"`/`"custom"`; `loadRecentReads()` lọc
  bỏ bản ghi cũ mang hai kind này khi đọc (spec §3.6 — "không hiện ra dưới dạng mục chết").
- Modify: `src/lib/storage.ts` — xoá `CUSTOM_COLLECTION_KEYS.articles`.
- Modify: `src/data/types.ts` — xoá `ContentBlock`, `BlockType`, `Article`, `ArticleSection`,
  `ArticleContent`.
- Delete: `src/data/articles.ts`, `src/components/BlockEditor.tsx`, `src/components/BlockContent.tsx`,
  `src/lib/blocks.ts`, `src/lib/richText.ts`.
- Modify: `src/App.tsx`/`DataSyncScreen` — xoá khoá `articles` khỏi `ImportPayload`/`SyncSnapshot`/
  `categoryRows`/`handleExport`/`handleFileChange`/`handleConfirmImport`/`handleRestoreSnapshot`
  (Task 3 giai đoạn 7 đã thêm `mucs` cạnh nó — xoá `articles` KHÔNG đụng khoá `mucs` mới).

**Đây là Task lớn nhất của giai đoạn 8 — App.tsx ~13k dòng, tra bằng grep từng bước, không đọc tràn.**

- [ ] **Bước 1: Đo blast radius trước khi xoá bất cứ gì**

```bash
grep -n "ArticleScreen\|CustomEntryScreen\|AddEntryScreen\|ENTRY_TYPES\|editArticleDraft\|viewCustomId\|handleSaveEntry\|linkTargets\|openLinkTarget\|LinkTarget\b" src/App.tsx | wc -l
grep -n '"article"\|"customEntry"\|"addEntry"' src/App.tsx
```

Ghi lại danh sách dòng thật — đây là bản đồ xoá của Task này, KHÔNG dùng số dòng trong tài liệu.

- [ ] **Bước 2: Viết/sửa ca kiểm ĐỎ trước khi xoá — chứng minh hành vi mới**

```ts
// src/__tests__/SearchScreen.spec.ts — SỬA, không thêm file mới cho việc này
it('KHÔNG còn kết quả kind article/customArticle sau giai đoạn 8', () => {
  // Xác nhận SearchResult['kind'] ở mức kiểu không còn nhận 'article'/'customArticle' —
  // ca kiểu học (compile-time), viết bằng một biến khai kiểu tường minh sẽ đỏ nếu union chưa thu hẹp.
})
```

```ts
// src/lib/__tests__/recentReads-loc-cu.spec.ts (tạo)
it('lọc bỏ bản ghi cũ kind article/custom khi đọc — không hiện mục chết', () => {
  localStorage.setItem('recentReads', JSON.stringify([
    { kind: 'article', id: 'mi', at: 1 },
    { kind: 'muc', id: 'm1', at: 2 },
  ]))
  expect(loadRecentReads().map((e) => e.kind)).toEqual(['muc'])
})
```

- [ ] **Bước 3: Chạy để thấy đỏ**, rồi xoá theo bản đồ Bước 1 — từng cụm nhỏ (state → nhánh Screen →
  nhánh render → hàm component → file), chạy `npx tsc --noEmit` sau MỖI cụm để bắt lỗi tham chiếu
  ngay khi còn ít, không dồn hết rồi mới build.

- [ ] **Bước 4: `richText.ts` — xác nhận LẠI trước khi xoá (đừng tin lại số cũ)**

```bash
grep -rln "richText" src/ --include=*.ts --include=*.tsx | grep -v vendor
```

Kỳ vọng còn đúng ba tệp đang bị xoá cùng đợt: `BlockEditor.tsx`, `BlockContent.tsx`, `lib/blocks.ts`
(không phải bốn như spec ghi — `data/types.ts` chỉ có một dòng COMMENT nhắc tên file, không import
thật, xem PHÁT HIỆN — xoá comment đó khi sửa `data/types.ts` ở Bước 6, không cần coi nó là "consumer").

- [ ] **Bước 5: `ARTICLE_CONTENT` — xác nhận rồi xoá theo (nếu còn tồn tại; grep trước, đừng giả định)**

```bash
grep -rn "ARTICLE_CONTENT" src/ --include=*.ts --include=*.tsx
```

- [ ] **Bước 6: `src/data/types.ts` — xoá đúng 5 kiểu (không phải 6 — `EcgLesson` thuộc Task 7)**

`ContentBlock`, `BlockType`, `Article`, `ArticleSection`, `ArticleContent`. Sửa comment dòng 21 nhắc
`richText.ts` (xoá hoặc cập nhật, không để trỏ vào file không còn tồn tại).

- [ ] **Bước 7: `storage.ts` — xoá khoá `articles`**

Xoá dòng `articles: "customArticles"` khỏi `CUSTOM_COLLECTION_KEYS` — đã xác nhận (giai đoạn khảo
sát) chỉ một lời gọi duy nhất tiêu thụ nó (`useIdbCollection<Article>(IDB_STORES.articles,
CUSTOM_COLLECTION_KEYS.articles)`), và lời gọi đó bị xoá cùng `customArticlesCol` ở Bước 3.

- [ ] **Bước 8: Đồng bộ dữ liệu — xoá khoá `articles`**

Xoá `articles: Article[]` khỏi `ImportPayload`/`SyncSnapshot`, dòng `{ key: "articles", … }` khỏi
`categoryRows`, và các nhánh đọc/ghi `articles` trong bốn hàm xử lý — **để nguyên khoá `mucs`** mà
Task 3 giai đoạn 7 vừa thêm.

- [ ] **Bước 9: Chạy trọn bộ**

`npx tsc --noEmit && npm test` — xanh. Kỳ vọng SỐ CA GIẢM (các ca test riêng cho ArticleScreen/
CustomEntryScreen/AddEntryScreen, nếu có file riêng, bị xoá theo) — ghi số ca mới vào commit.

- [ ] **Bước 10: Checklist chuỗi cục bộ**

```bash
grep -rn "Article\b\|ContentBlock\|BlockEditor" src/ --include=*.ts --include=*.tsx | grep -v src/vendor/
```

Kỳ vọng: 0 kết quả ngoài các dòng đang nói về `EcgLesson`/`AntibioticWarning`... (kiểm bằng mắt từng
dòng còn lại — `\bArticle\b` có thể khớp nhầm chuỗi khác, đọc context).

- [ ] **Bước 11: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(don-he-cu): xoá ArticleScreen/CustomEntryScreen/AddEntryScreen + BlockEditor và toàn bộ chuỗi phụ thuộc

Giữ nguyên BI_DANH_KHOA/khoaChuan — flashcards.ts vẫn dùng chung tên khoa "Hồi sức - Cấp cứu".

EOF
)"
```

---

## Task 7: Xoá hệ ECG tự viết tay (`EcgScreen`/`EcgDetailScreen`/`AddEcgScreen`)

Cùng khuôn Task 6, phạm vi hẹp hơn (không có `richText`/`BlockEditor` — `EcgLesson` không dùng rich
text theo khối, chỉ ảnh + text thuần, kiểm lại bằng grep nếu nghi ngờ).

**Files:**
- Modify: `src/App.tsx` — xoá `EcgScreen`, `EcgDetailScreen`, `AddEcgScreen`, nhánh `Screen`:
  `"ecg" | "ecgDetail" | "addEcg"`, ba nhánh render, state `editEcgDraft`/`handleSaveEcg`, phần
  `ecgCol`/`allEcgLessons` nếu không còn ai đọc khác (kiểm trước — `allEcgLessons` có thể vẫn được
  `SearchScreen` cần cho tới khi Bước dưới xoá kind `"ecg"` khỏi nó).
- Modify: `SearchScreen` — xoá kind `"ecg"`.
- Modify: `src/lib/recentReads.ts` — `ReadKind` bỏ `"ecg"`; mở rộng ca lọc bản ghi cũ Task 6 Bước 2
  để phủ luôn kind `"ecg"` (không viết ca mới trùng lặp — sửa ca đã có).
- Delete: `src/data/ecg.ts`.
- Modify: `src/data/types.ts` — xoá `EcgLesson` (và `EcgImage` nếu chỉ `EcgLesson` dùng — grep trước).
- Modify: Đồng bộ dữ liệu — xoá khoá `ecgLessons` khỏi `ImportPayload`/`SyncSnapshot`/`categoryRows`.

- [ ] **Bước 1: Đo blast radius** — `grep -n "EcgScreen\|EcgDetailScreen\|AddEcgScreen\|EcgLesson\|
  ECG_LESSONS\|ecgCol\|allEcgLessons" src/App.tsx | wc -l`, ghi bản đồ dòng thật.

- [ ] **Bước 2: Ca kiểm đỏ** — mở rộng `recentReads-loc-cu.spec.ts` của Task 6 thêm entry kind
  `'ecg'`, kỳ vọng cũng bị lọc.

- [ ] **Bước 3: Xoá theo bản đồ**, `tsc --noEmit` sau mỗi cụm.

- [ ] **Bước 4: `EcgImage` — kiểm còn dùng riêng không**

```bash
grep -n "EcgImage" src/data/types.ts src/App.tsx
```

Nếu `EcgImage` CHỈ được `EcgLesson` tham chiếu (làm kiểu trường con), xoá theo. Nếu dùng độc lập ở
đâu khác (không có dấu hiệu trong khảo sát ban đầu, nhưng xác nhận lại), giữ.

- [ ] **Bước 5: Đồng bộ dữ liệu** — xoá khoá `ecgLessons` (giữ `mucs`).

- [ ] **Bước 6: Chạy trọn bộ + checklist chuỗi**

```bash
grep -rn "EcgLesson\|ECG_LESSONS" src/ --include=*.ts --include=*.tsx | grep -v src/vendor/
```

Kỳ vọng: 0.

- [ ] **Bước 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(don-he-cu): xoá EcgScreen/EcgDetailScreen/AddEcgScreen + data/ecg.ts

EOF
)"
```

---

## Task 8: Xoá `diTruBangCu.ts` + hai cờ di trú trong `BoardGallery.tsx`

Không cần cổng chủ dự án — đã xác nhận (PHÁT HIỆN #6) hai hàm trong file này đọc/ghi
`IDB_STORES.boards`, một store đã đóng băng từ giai đoạn 5, không còn đối tượng thật nào cần di trú.

**Files:**
- Delete: `src/board/diTruBangCu.ts`
- Delete: `src/board/__tests__/diTruBangCu.spec.ts`
- Modify: `src/board/BoardGallery.tsx` — xoá hai `useEffect` (khối `dangDiTru`/`DA_CHAY_DI_TRU_KEY`
  dòng ~207-246, khối `dangDiTruNoiDung`/`DA_CHAY_DI_TRU_NOI_DUNG_KEY` dòng ~253-281 — xác nhận số
  dòng thật bằng grep trước), bốn hằng/biến module-scope liên quan (`DA_CHAY_DI_TRU_KEY`,
  `dangDiTru`, `DA_CHAY_DI_TRU_NOI_DUNG_KEY`, `dangDiTruNoiDung`), comment dài giải thích lý do đặt
  tên `DA_CHAY_DI_TRU_KEY` không dùng gạch ngang (dòng ~13-19 — lý do đó hết còn ý nghĩa khi cả cờ
  lẫn hàm bị xoá).

- [ ] **Bước 1: Xác nhận không còn ai import `diTruBangCu`**

```bash
grep -rln "diTruBangCu" src/ --include=*.ts --include=*.tsx
```

Kỳ vọng: `BoardGallery.tsx` (2 lời `import('./diTruBangCu')` động) + file test của nó + chính nó.

- [ ] **Bước 2: Ca kiểm đỏ — chứng minh KHÔNG còn cờ localStorage nào được set khi mount tab Mindmap**

```tsx
// src/board/__tests__/BoardGallery-khong-di-tru.spec.tsx (tạo)
it('mount BoardGallery không set cờ di trú cũ nào', () => {
  render(<BoardGallery dangHienTab tieuDe="Mindmap" loai="so-do" loaiTaoDuoc={['so-do']} />)
  expect(localStorage.getItem('drtrong:board-di-tru-da-chay')).toBeNull()
  expect(localStorage.getItem('drtrong:board-di-tru-noi-dung-da-chay')).toBeNull()
})
```

Chạy trước khi xoá — kỳ vọng ĐỎ (cờ vẫn được set hôm nay). Đây là ca "chứng minh gỡ-vá-thấy-đỏ" theo
chiều NGƯỢC: viết test trước cho hành vi ĐÍCH, thấy nó đỏ trên mã hiện tại, rồi xoá mã cho nó xanh —
tương đương tinh thần TDD dù việc ở đây là xoá chứ không phải thêm.

- [ ] **Bước 3: Xoá** hai effect + bốn biến + comment liên quan, xoá file `diTruBangCu.ts` +
  `diTruBangCu.spec.ts`.

- [ ] **Bước 4: Chạy ca kiểm mới — phải XANH**, rồi `npx tsc --noEmit && npm test` trọn bộ.

- [ ] **Bước 5: Checklist**

```bash
grep -rn "drtrong:board-di-tru" src/
```

Kỳ vọng: 0.

- [ ] **Bước 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(don-he-cu): xoá diTruBangCu.ts và hai cờ di trú — không còn đối tượng để di trú sau quyết định 4

EOF
)"
```

---

## Task 9: Checklist chuỗi §6.4 tổng rà + kiểm tay Chrome thật

Chạy SAU Task 5-8, trước khi coi giai đoạn 8 xong. Đây là lượt XÁC NHẬN, không phải sửa (phần lớn
mục đã sạch từ trước — PHÁT HIỆN #9 — nhưng phải đo LẠI trên cây SAU khi Task 5-8 đã xoá xong, vì
xoá mã có thể vô tình chạm những chuỗi này).

- [ ] `src/App.tsx` `initialScreen()` — vẫn chỉ nhận `"mixing" | "library" | "mindmap" | "flashcard"`.
- [ ] `public/manifest.json` — `shortcuts[].url` vẫn chỉ trỏ hai tab thật.
- [ ] `public/sw.js` — không chuỗi `article`/`ecg`/`screen=` nào cần dọn.
- [ ] `NON_TAB_SCREENS` (App.tsx) — đã bỏ `"article"`, `"specialty"` (nếu Task 5 xoá luôn nhánh
  `specialty` render — XÁC NHẬN: Task 5 KHÔNG xoá nhánh Screen `"specialty"`, chỉ xoá hàm
  `SpecialtyScreen` cũ; nhánh `screen === "specialty"` vẫn còn, giờ render `BoardGallery`. Đừng xoá
  `"specialty"` khỏi `NON_TAB_SCREENS`/`type Screen` — nó vẫn là một screen thật), `"customEntry"`,
  `"addEntry"`, `"addEcg"`, `"ecg"`, `"ecgDetail"`.
- [ ] `NAV_ITEMS` — vẫn đúng 5 tab, nhãn giữ nguyên.
- [ ] `CUSTOM_COLLECTION_KEYS` (`src/lib/storage.ts`) — không còn khoá `articles`.
- [ ] `recentReads` — `ReadKind` chỉ còn `"muc"` (+ bất kỳ kind nào khác spec không đụng, xác nhận
  bằng đọc file); bản ghi cũ `article`/`custom`/`ecg` bị lọc khi đọc (ca kiểm Task 6-7 đã canh).
- [ ] `grep -rn "drtrong-board" src/ scripts/` — vẫn còn (giai đoạn 9 mới đổi, xem mục dưới) — CHƯA
  phải 0 ở cuối giai đoạn 8, đây là kỳ vọng ĐÚNG, không phải lỗi.
- [ ] `grep -rn "Article\|ContentBlock\|EcgLesson\|BlockEditor" src/ --include=*.ts --include=*.tsx`
  trừ `src/vendor/` — 0 kết quả.
- [ ] `BI_DANH_KHOA`/`khoaChuan` — VẪN CÒN (PHÁT HIỆN #7 — cố ý giữ, không phải sót).

- [ ] **Kiểm tay trên Chrome thật (không phải Browser pane):**
  1. Mở app, vào Tìm kiếm, gõ tên một bài viết/sơ đồ `mucs` đã tạo ở giai đoạn 7 — vẫn ra kết quả,
     bấm mở đúng.
  2. Panel "Đã đọc gần đây" ở Trang chủ — không còn mục nào bấm vào ra màn trắng/lỗi (nếu trên máy
     kiểm có bản ghi `recentReads` cũ trỏ `article`/`ecg` từ trước khi nâng cấp, xác nhận chúng biến
     mất khỏi danh sách thay vì hiện ra rồi vỡ khi bấm).
  3. PWA đã cài (nếu có) — mở qua icon trên màn hình chính, không rơi vào màn trắng.
  4. Đồng bộ dữ liệu — mở màn, xác nhận KHÔNG còn dòng "Bài viết"/"Bài học ECG" (hệ cũ) trong danh
     sách chọn xuất, CÓ dòng "Bài viết & Sơ đồ" (khoá `mucs`, từ giai đoạn 7).

- [ ] **Commit** (nếu Bước checklist phát hiện sai sót cần vá):

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(don-he-cu): vá sót từ checklist chuỗi §6.4 sau lượt xoá hệ cũ

EOF
)"
```

---

## Tiêu chí xong giai đoạn 8

1. `tsc --noEmit` sạch, `npm test` xanh, `npm run build`/`kiem:dist`/`kiem:vendor` xanh.
2. `grep -rn "Article\|ContentBlock\|EcgLesson\|BlockEditor" src/` (trừ vendor) → 0.
3. `BI_DANH_KHOA`/`khoaChuan` còn nguyên — dải chip Tìm kiếm không tách "Hồi sức - Cấp cứu" khỏi
   "Cấp cứu" (kiểm tay: tạo một thẻ ghi nhớ chuyên khoa "Hồi sức - Cấp cứu", tìm nó, xác nhận chip
   hiện "Cấp cứu" không phải một chip riêng).
4. Checklist Task 9 tick đủ, kiểm tay Chrome thật xác nhận không màn trắng, không mục chết.
5. Không có `deleteObjectStore`, `deleteDatabase`, đổi `DB_VERSION` ở bất kỳ commit nào của giai
   đoạn 8 — `git log --oneline` của các commit giai đoạn 7-8 không chứa các từ khoá này (tự kiểm
   bằng `git log -p | grep -c "deleteObjectStore\|deleteDatabase"` → 0 trước khi sang giai đoạn 9).

---

# GIAI ĐOẠN 9 — PHÁ HUỶ (không hoàn tác được)

## PHÁN QUYẾT — CỔNG SAO LƯU ĐÃ ĐƯỢC TRẢ LỜI, VÀ LƯỢT ĐỔI TÊN BỊ BỎ

> **Chủ dự án trả lời (2026-09-06):** *"tôi không có gì để sao lưu — giai đoạn 9 không cần chờ"*,
> và *"xoá dữ liệu cũ — phải cân nhắc cái nào cần sử dụng, và cái nào xoá, sau đó cứ thực hiện"*.
> Cổng sao lưu KHÔNG còn chặn. Việc cân nhắc cái nào sống / cái nào chết được uỷ quyền cho người
> điều phối, và phán quyết dưới đây là kết quả.

### Phán quyết 1 — BỎ HẲN lượt đổi tên `drtrong-board` → `drtrong-noi-dung` (bỏ Task 10)

Bản plan đầu xếp lượt đổi tên vào giai đoạn 9, sau cổng sao lưu, kèm lập luận đúng rằng đổi tên sớm
sẽ mồ côi hoá nội dung CRDT thật. Nhưng lập luận đó chưa đi hết: **đổi tên ở giai đoạn 9 cũng mồ côi
hoá y hệt.** IndexedDB không có thao tác "đổi tên" — đổi hằng số nghĩa là app bắt đầu dùng một CSDL
KHÁC, rỗng; nội dung cũ ở lại trong CSDL cũ rồi bị `deleteDatabase` xoá. File sao lưu không tự khôi
phục nó; phải người dùng tự tay xuất rồi nhập lại đúng thời điểm.

Cân lợi–hại:
- **Lợi của đổi tên:** cái tên mô tả đúng hơn (CSDL nay chứa cả bài viết, không riêng bảng vẽ).
  Đó là nợ NGỮ NGHĨA, không phải nợ kỹ thuật. Không tính năng nào hỏng vì tên cũ.
- **Hại:** đây là **nguồn rủi ro mất dữ liệu DUY NHẤT trong toàn bộ Plan 3**, và nó đòi một vũ điệu
  xuất–nhập thủ công đúng vào lúc mọi thứ trở nên không hoàn tác được.

Bỏ lượt đổi tên thì Plan 3 giữ **100% giá trị dọn dẹp** (ba store chết biến mất, bảy màn cũ biến
mất, tám tệp cũ biến mất) với **0% rủi ro mất nội dung sống**. Sau khi bỏ, **không còn một lệnh
`deleteDatabase` nào trong toàn bộ kế hoạch**.

Kéo theo, cùng bị bỏ: `src/lib/donCsdlCu.ts`, cổng hai chiều `drtrong-noi-dung` trong
`kiem-dist.mjs` (nó sinh ra để canh đúng lượt đổi tên này), và mọi sửa đổi
`src/board/xoaNoiDungBang.ts` / `src/board/mo-doc.ts` liên quan tên CSDL.

**Nợ ngữ nghĩa ghi nhận:** hằng `TEN_CSDL_BANG = 'drtrong-board'` ở `mo-doc.ts:34` và
`xoaNoiDungBang.ts:20` giữ nguyên tên cũ dù nay chứa cả bài viết. Trả nợ này về sau bằng một task
di trú đàng hoàng (đọc mọi doc + blob từ nguồn cũ, ghi sang nguồn mới, kiểm vòng tròn), vào lúc có
dữ liệu thật đáng để di trú — không phải bây giờ.

### Phán quyết 2 — cái nào SỐNG, cái nào CHẾT

Khảo sát mã thật, không chép danh sách của spec:

| Đối tượng | Ai còn dùng | Phán quyết |
|---|---|---|
| CSDL `drtrong-board` | `mo-doc.ts:151-152` mở/tạo MỌI doc; `xoaNoiDungBang.ts:20` dọn nội dung khi xoá mục | **SỐNG — không đụng** |
| `drtrong-board_blob`, `_blob_mime` | Ảnh dán trong mục ĐANG SỐNG | **SỐNG — không đụng** |
| store `boards` | `App.tsx:1426` (Tìm kiếm — Task 1 chuyển sang `mucs`); `diTruBangCu.ts` (Task 8 xoá) | CHẾT sau Task 1 + 8 → **xoá** |
| store `articles` | `App.tsx:12431` (màn bài viết cũ — Task 6 xoá) | CHẾT sau Task 6 → **xoá** |
| store `ecgLessons` | `App.tsx:12468` (màn ECG cũ — Task 7 xoá) | CHẾT sau Task 7 → **xoá** |

### Cái gì mất vĩnh viễn ở giai đoạn 9

Đúng ba object store trên, trong CSDL `drtrong-ecg`: metadata sơ đồ đời cũ, **bài viết tự nhập cũ**,
**bài học ECG tự nhập cũ (kèm ảnh)**. Chủ dự án đã xác nhận đây là dữ liệu bỏ được.

### Cái gì KHÔNG mất — và lần này là đúng thật

- Toàn bộ nội dung sống: mọi doc CRDT trong `drtrong-board` (nét vẽ, chữ trong bài viết, ảnh dán).
  Giai đoạn 9 không chạm CSDL này. Đây là khác biệt then chốt so với bản plan đầu, nơi dòng
  "KHÔNG bị ảnh hưởng" chỉ đúng NẾU người dùng tự xuất rồi nhập lại.
- Mọi `MucMeta` trong store `mucs`.
- Kháng sinh / bệnh lý / thuốc truyền / công thức pha / thẻ ghi nhớ (localStorage, ngoài phạm vi).

### Task 10 — BỎ

Task 10 (đổi tên CSDL + `donCsdlCu.ts` + gate hai chiều) **không thi hành**. Giữ lại tiêu đề này
làm dấu vết quyết định; nội dung chi tiết của nó đã được gỡ khỏi tài liệu.

---


## Task 11: `deleteObjectStore` ×3 + `DB_VERSION` 6→7

**Bước duy nhất không hoàn tác được của toàn bộ Plan 3.** Sau khi Task 10 bị bỏ, đây là Task duy nhất
của giai đoạn 9. Nó xoá BA OBJECT STORE đã chết trong CSDL `drtrong-ecg` — KHÔNG đụng CSDL nội
dung `drtrong-board`, KHÔNG có `deleteDatabase` nào trong Task này.

**Files:**
- Modify: `src/lib/idb.ts` (`DB_VERSION`, `onupgradeneeded`, `IDB_STORES`)
- Delete/rewrite: `src/lib/__tests__/idb.spec.ts` (PHÁT HIỆN #10 — toàn bộ file test đường nâng cấp
  v4→v5 dùng store `boards`/`articles`, không còn ý nghĩa)
- Modify: `src/lib/__tests__/idb-store-mucs.spec.ts` (PHÁT HIỆN #10 — xoá/đảo ca "KHÔNG xoá store cũ
  nào — giai đoạn 9 mới được phá huỷ")

- [ ] **Bước 1: Ca kiểm đỏ — chứng minh store cũ THẬT SỰ biến mất**

```ts
// src/lib/__tests__/idb-xoa-store-cu.spec.ts (tạo)
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { IDB_STORES, idbPut } from '../idb'

describe('giai đoạn 9 — ba store cũ đã bị deleteObjectStore', () => {
  it('IDB_STORES không còn khoá boards/articles/ecgLessons', () => {
    expect('boards' in IDB_STORES).toBe(false)
    expect('articles' in IDB_STORES).toBe(false)
    expect('ecgLessons' in IDB_STORES).toBe(false)
  })

  it('DB_VERSION là 7', async () => {
    // Mở DB thật qua một hàm ghi bất kỳ (idbPut ép mở kết nối), rồi kiểm db.version.
    await idbPut(IDB_STORES.mucs, { id: 'x' })
    const req = indexedDB.open('drtrong-ecg')
    const db = await new Promise<IDBDatabase>((res) => { req.onsuccess = () => res(req.result) })
    expect(db.version).toBe(7)
    db.close()
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ** — `IDB_STORES.boards` vẫn tồn tại, `DB_VERSION` vẫn 6.

- [ ] **Bước 3: Sửa `idb.ts`**

```ts
// v6 → v7 (giai đoạn 9): phá huỷ ba store hệ cũ. KHÔNG HOÀN TÁC ĐƯỢC — xem cổng chặn ở đầu Plan 3.
const DB_VERSION = 7

export const IDB_STORES = {
  mucs: "mucs",
} as const

const ALL_STORES: string[] = Object.values(IDB_STORES)
// Ba tên CỐ ĐỊNH (không qua IDB_STORES nữa — hằng số đó không còn khai chúng) để onupgradeneeded
// biết CHÍNH XÁC cái gì cần xoá, kể cả trên máy đang ở version cũ hơn 6 (chưa từng thấy 'mucs').
const STORE_CU_CAN_XOA = ['boards', 'articles', 'lessons']
```

Trong `req.onupgradeneeded`, SAU vòng lặp tạo store còn thiếu, thêm:

```ts
req.onupgradeneeded = (ev) => {
  const db = req.result
  ALL_STORES.forEach((name) => {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" })
  })
  // Chỉ xoá khi nâng cấp TỚI v7 — máy đang ở v6 trở xuống lần đầu mở sau bản cập nhật này sẽ chạy
  // nhánh này; máy đã ở v7 (không có ai, vì đây là lần đầu tri hành) sẽ bỏ qua vì oldVersion === 7.
  if (ev.oldVersion < 7) {
    STORE_CU_CAN_XOA.forEach((name) => {
      if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name)
    })
  }
}
```

**Đọc kỹ chữ ký `IDBOpenDBRequest.onupgradeneeded`** — tham số `ev: IDBVersionChangeEvent` mang
`oldVersion`/`newVersion`. Xác nhận `openDb()` hiện tại có đang dùng tham số này chưa (khảo sát ban
đầu không thấy — `req.onupgradeneeded = () => {…}` không nhận tham số); thêm tham số là thay đổi
CHỮ KÝ callback, không phải thêm dòng đơn thuần — kiểm kỹ TypeScript không phàn nàn.

- [ ] **Bước 4: Xoá/viết lại `src/lib/__tests__/idb.spec.ts`**

Toàn bộ file kiểm đường nâng cấp v4→v5 (store `boards`) không còn ý nghĩa sau v7 xoá `boards`. XOÁ
file này — không có gì đáng giữ lại để viết-lại-thành, vì chính kịch bản nó test (một máy ở v4 nâng
lên v5) đã là lịch sử, và hành vi "nâng cấp giữ dữ liệu cũ" giờ cần test THEO HƯỚNG NGƯỢC: máy ở v6
(có `boards`/`articles`/`ecgLessons` với dữ liệu) nâng lên v7 phải XOÁ đúng ba store mà KHÔNG đụng
`mucs`. Viết ca đó thay vào (gộp vào `idb-xoa-store-cu.spec.ts` ở Bước 1):

```ts
it('máy đang ở v6 có dữ liệu boards/articles → nâng lên v7 xoá đúng ba store, giữ nguyên mucs', async () => {
  await new Promise<void>((resolve) => { indexedDB.deleteDatabase('drtrong-ecg').onsuccess = () => resolve() })
  // Mở tay ở v6, ghi một bản ghi vào 'boards' VÀ 'mucs'.
  const dbCu = await new Promise<IDBDatabase>((resolve) => {
    const req = indexedDB.open('drtrong-ecg', 6)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const n of ['lessons', 'articles', 'boards', 'mucs']) {
        if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
  dbCu.transaction('boards', 'readwrite').objectStore('boards').put({ id: 'bang-cu' })
  dbCu.transaction('mucs', 'readwrite').objectStore('mucs').put({ id: 'muc-song' })
  dbCu.close()

  // Mở lại qua idb.ts (v7) — phải tự nâng cấp, xoá boards, giữ mucs.
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  expect(ds).toEqual([{ id: 'muc-song' }])
})
```

- [ ] **Bước 5: Xoá ca "KHÔNG xoá store cũ nào" trong `idb-store-mucs.spec.ts`**

```bash
grep -n "KHÔNG xoá store cũ nào" src/lib/__tests__/idb-store-mucs.spec.ts
```

Xoá đúng ca `it('KHÔNG xoá store cũ nào — giai đoạn 9 mới được phá huỷ', …)` — tên ca đã tự ghi rõ
đây là ca tạm thời cho tới đúng lúc này.

- [ ] **Bước 6: Checklist chuỗi cuối cùng**

```bash
grep -rn "IDB_STORES.boards\|IDB_STORES.articles\|IDB_STORES.ecgLessons" src/ --include=*.ts --include=*.tsx
```

Kỳ vọng: 0 (nếu còn, `tsc` đã báo lỗi biên dịch từ Bước 3 — nhưng grep vẫn là bằng chứng độc lập,
không tin một mình `tsc` cho chuỗi).

- [ ] **Bước 7: Chạy trọn bộ + build + kiem:dist (luật D)**

`npx tsc --noEmit && npm test && npm run build && npm run kiem:dist && npm run kiem:vendor` — tất cả
xanh.

- [ ] **Bước 8: Kiểm tay trên Chrome thật — bước cuối cùng trước khi coi chặng xong**

1. Mở DevTools → Application → IndexedDB trên MỘT máy đã từng dùng app trước giai đoạn 9 (có dữ liệu
   cũ thật, không phải máy sạch) — xác nhận CSDL `drtrong-board` không còn trong danh sách, CSDL
   `drtrong-ecg` chỉ còn store `mucs`.
2. Mở app — không có lỗi console, mọi mục `mucs` vẫn mở được, nội dung còn nguyên.
3. Tạo một bài viết mới, gõ chữ, thoát, mở lại — nội dung còn (xác nhận CSDL mới `drtrong-noi-dung`
   hoạt động đúng cho doc MỚI, không chỉ đo bằng test).

- [ ] **Bước 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(phá-huỷ): deleteObjectStore boards/articles/lessons, DB_VERSION 6→7 — KHÔNG HOÀN TÁC ĐƯỢC

Chủ dự án đã xác nhận xuất file sao lưu trước khi chạy commit này (xem commit trước, Task 10).

EOF
)"
```

---

## Tiêu chí xong giai đoạn 9

1. `tsc --noEmit`, `npm test`, `npm run build`, `npm run kiem:dist`, `npm run kiem:vendor` xanh.
2. Trên trình duyệt thật: CSDL `drtrong-ecg` chỉ còn đúng một object store `mucs`; CSDL nội dung
   `drtrong-board` **vẫn còn và vẫn hoạt động** (nó là CSDL SỐNG — xem PHÁN QUYẾT ĐỔI TÊN).
3. Một bài viết và một sơ đồ tạo TRƯỚC lượt phá huỷ này vẫn mở lại được, nội dung nguyên vẹn.
   Đây là ca chứng minh quan trọng nhất: nó phân biệt "xoá ba store metadata chết" với "xoá nhầm
   nội dung sống".
4. Một bài viết/sơ đồ tạo MỚI sau lượt phá huỷ vẫn lưu/mở lại bình thường.
5. Không còn tham chiếu nào tới `Article`, `ContentBlock`, `EcgLesson`, `BlockEditor`,
   `IDB_STORES.boards/articles/ecgLessons` trong `src/` (trừ vendor).

---

## Việc của chủ dự án

- **Trước Task 6:** ĐÃ TRẢ LỜI (xem cổng ở trên) — (a), dữ liệu thử, chạy tiếp.
- **Trước Task 11:** ĐÃ TRẢ LỜI — không cần sao lưu, không cần chờ.
- Không còn việc nào chặn người thi hành.