# Thiết kế: Mindmap — tìm kiếm, chuyên khoa/tag, xuất file

Ngày: **2026-08-24**. Trạng thái: đã chốt thiết kế (brainstorm trong chat), chưa lập kế hoạch.
Track: **MindmapScreen** — theo [[project_mindmap-charter]] đây là "app của chủ dự án", đáng phần
lớn nhất công sức thiết kế của cả app. Chặng này là mục backlog #1 ghi ở
`docs/superpowers/HANDOFF.md` mục 0: *"Roadmap PRODUCT.md hứa (tìm kiếm/tag/xuất file cho Mindmap)
đã được chủ dự án xác nhận là việc THẬT cần làm dần, không phải chỉ sửa tài liệu"*.

## 1. Vấn đề

`PRODUCT.md` §Capabilities and Constraints mô tả Mindmap với ba khả năng: *"Có tìm xuyên suốt mọi
bảng cùng lúc... xuất PNG/PDF hoặc sao chép dạng văn bản (outline)"*. Đoạn mô tả đó viết cho **hệ
Mindmap CŨ** (`MindmapScreen`/`MindmapGallery`/`MindNode`/`MindEdge`) — hệ đó đã bị thay hoàn toàn
bởi `BoardGallery`/`EdgelessBoard` (nền BlockSuite vendored, xem
`docs/superpowers/specs/2026-08-19-board-gallery-design.md`). Xác nhận qua code: không có bất kỳ
tham chiếu nào tới `MindNode`/`MindEdge`/`MindmapScreen` trong `src/App.tsx` nữa. Hệ mới **không có
cả ba khả năng đó** — đây là nợ lời hứa sản phẩm, không phải mất tính năng do lỗi.

Trạng thái cụ thể đã đo:

- `BangMeta` (`src/board/boardMeta.ts`) hiện chỉ có `id/ten/taoLuc/capNhatLuc/anhXemTruoc/daXoaLuc`
  — không trường chuyên khoa, không tag, không trường phục vụ tìm kiếm nội dung.
- App đã có một màn tìm kiếm toàn cục (`SearchScreen`, `src/App.tsx:1359`) gộp
  article/customArticle/ecg/flashcard qua kiểu `SearchResult` — Mindmap hoàn toàn vắng mặt trong
  đó.
- Vendored BlockSuite đã có sẵn `ExportManager.exportPng()`/`exportPdf()`
  (`src/vendor/blocksuite/affine/blocks/surface/src/extensions/export-manager/export-manager.ts`,
  đăng ký qua `ExportManagerExtension`) — **không có nút UI nào trong cây của dự án gọi tới hai hàm
  này**. Đúng mẫu "hạ tầng vendored có sẵn, chưa lộ ra UI" của các chặng bật `ViewExtension` trước
  đây (mục 20, 22 HANDOFF.md).
- Có sẵn `normalizeSearch()` (`src/lib/ui.ts`) bỏ dấu tiếng Việt cho tìm kiếm không phân biệt dấu —
  tái dùng, không viết lại.
- `SPECIALTIES` là mảng import được từ `src/data` (`import { SPECIALTIES } from "./data"`,
  `App.tsx:3`) — dùng chung cho chuyên khoa của bảng, không tạo danh sách riêng.

## 2. Kiến trúc

### 2.1 Mô hình dữ liệu — mở rộng `BangMeta`

```ts
export type BangMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  anhXemTruoc?: string
  daXoaLuc?: number
  chuyenKhoa: string        // MỚI — id trong SPECIALTIES, bắt buộc (mặc định SPECIALTIES[0].id)
  tags: string[]             // MỚI — tự do, mặc định []
  noiDungTimKiem: string     // MỚI — snapshot văn bản trong bảng, mặc định "", xem §2.2
}
```

Không đổi `keyPath`/store IndexedDB (`IDB_STORES.boards` giữ nguyên) — chỉ thêm trường trên object,
`idbPut` ghi đè bình thường. Bảng cũ thiếu ba trường mới cần migration (§2.7), không phải nâng
`DB_VERSION`.

### 2.2 Trích văn bản để tìm kiếm nội dung

**Đã cân nhắc ba cách, chọn "snapshot lúc rời bảng":**

| | Cách | Vì sao loại/chọn |
|---|---|---|
| **A (chọn)** | Duyệt block/phần tử canvas có chữ lúc `EdgelessBoard.tsx` unmount (đúng điểm đang ghi `anhXemTruoc`+`capNhatLuc`, mục 31 HANDOFF), gộp thành `noiDungTimKiem`, ghi kèm `BangMeta` | Tái dùng đúng lifecycle hook đã có, tìm kiếm sau đó chỉ lọc chuỗi trong bộ nhớ (`useIdbCollection` đã nạp), không mở thêm doc nào |
| B | Mở tất cả doc BlockSuite mỗi lần gõ tìm kiếm | Mỗi bảng là một Y.Doc riêng trong IndexedDB — mở N doc mỗi phím gõ ngược hẳn yêu cầu tốc độ của PRODUCT.md ("trực cấp cứu... cần tra cứu nhanh") |
| C | Index realtime, subscribe mọi bảng cùng lúc trong nền | Phải giữ mọi doc sống song song trong bộ nhớ — quá nặng cho PWA offline một người dùng, vi phạm YAGNI |

Đánh đổi đã chấp nhận: nội dung mới gõ trong một bảng chỉ tìm được **sau khi rời bảng đó ít nhất
một lần** (đúng lúc nội dung "chốt lại", chấp nhận được — cùng đánh đổi app đã chấp nhận cho ảnh
xem trước).

Thuật toán trích văn bản (chi tiết API thật đo lúc viết plan, không suy luận): duyệt
`store.root.children` đệ quy, với mỗi khối lấy `.text?.toString()` nếu có (note/paragraph), cộng
mọi phần tử `surface` có văn bản/nhãn (chữ trên connector, khối text độc lập trên canvas) — **bỏ
qua nét vẽ tay tự do** (không phải văn bản, không nên phí công OCR). Gộp bằng khoảng trắng, giới
hạn độ dài hợp lý (ví dụ 5.000 ký tự) để tránh `BangMeta` phình quá to.

### 2.3 Chuyên khoa + tag — UI trong `DanhSachBang.tsx`

- Dải chip lọc theo chuyên khoa trên đầu lưới, cùng khuôn `SEARCH_FILTERS` của `SearchScreen`
  (`"Tất cả"` + từng tên trong `SPECIALTIES`).
- Menu "⋯" của mỗi thẻ (đã có "Đổi tên"/"Xoá", `DanhSachBang.tsx:273-309`) thêm mục "Đổi chuyên
  khoa" (dropdown chọn từ `SPECIALTIES`) và một ô sửa tag tự do (nhập-Enter-thêm, giống mẫu tag
  input đã dùng ở đâu đó trong Thư viện nếu có sẵn — tái dùng, không tự chế mới nếu đã tồn tại).

### 2.4 Tìm kiếm nội bộ `BoardGallery`

Ô tìm kiếm trong `DanhSachBang.tsx`, lọc trên `ten + tags.join(' ') + chuyenKhoa + noiDungTimKiem`
qua `normalizeSearch()` (bỏ dấu, so khớp con chuỗi) — thuần hàm, test được độc lập không cần DOM.

### 2.5 Gộp vào `SearchScreen` toàn app

- Thêm `kind: "board"` vào `SearchResult` (`App.tsx:1350-1357`), field `specialty` map từ
  `chuyenKhoa`, `tags` map thẳng.
- `SearchScreen` tự gọi `useIdbCollection<BangMeta>(IDB_STORES.boards)` **bên trong chính nó**
  (không phải ở `App.tsx` cấp cao) — đọc `boardMeta.ts`/`idb.ts` KHÔNG kéo theo chunk BlockSuite 994
  kB (đã xác nhận qua comment đầu `DanhSachBang.tsx`: *"KHÔNG phụ thuộc BlockSuite... giữ file này
  nhẹ, tách hẳn khỏi ranh giới nạp chậm D13"*), nên chi phí chỉ phát sinh khi người dùng thật sự mở
  màn Tìm kiếm, không phải lúc app khởi động.
- Mở kết quả bảng từ tìm kiếm cần chuyển tab Mindmap VÀ mở đúng bảng đó — `BoardGallery` hiện quản
  `openBoardId` hoàn toàn nội bộ (`BoardGallery.tsx:33`, không prop nào can thiệp từ ngoài). Thêm
  prop mới `moBangYeuCau?: string` — `App.tsx` truyền id cần mở khi `onNavigate` được gọi với kết
  quả loại "board"; `BoardGallery` dùng `useEffect` gọi `setOpenBoardId` khi prop này đổi.

### 2.6 Xuất PNG/PDF

Nút "Xuất" (menu con PNG/PDF) thêm vào `EdgelessBoard.tsx` — component DUY NHẤT đang giữ tham chiếu
`store`/`std` sống của bảng đang mở (`BoardGallery.tsx` chỉ biết `boardId`, không có tay cầm vào
doc). Gọi `ExportManager.exportPng()`/`exportPdf()` đã vendored sẵn. Vị trí đặt nút: cùng cụm nút
nổi đang có (nút đổi chủ đề sáng/tối, `EdgelessBoard.tsx:234-237`) — chi tiết API thật để lấy đúng
instance `ExportManager` từ `std` (`std.get(ExportManagerExtension.identifier)` hay qua widget gốc)
**đo lúc viết plan/TDD, không suy luận trước** — đúng thói quen "đo thật" đã ghi khắp HANDOFF.md.

Sao chép dạng văn bản (outline) — PRODUCT.md cũ có nhắc nhưng **không có trong ba lựa chọn đã hỏi
người dùng** (chỉ hỏi PNG/PDF) — xem §7 Ngoài phạm vi.

### 2.7 Migration bảng cũ

Script một lần, mẫu `diTruBangCu.ts` đã có: với mỗi `BangMeta` chưa có `chuyenKhoa`/`tags`/
`noiDungTimKiem`, mở doc, chạy thuật toán §2.2, backfill `chuyenKhoa` mặc định (`SPECIALTIES[0].id`
— đúng mẫu `App.tsx:1576` đang dùng cho một trường hợp khác; `SPECIALTIES` không có mục "Khác" nào,
xác nhận qua `src/data/specialties.ts:26-38`, 11 khoa cố định), `tags: []`, ghi `noiDungTimKiem`. Chạy lúc `BoardGallery`
mount lần đầu tab Mindmap được mở (cùng chỗ `diTruBangCuNeuCo()` hiện chạy), có cờ
`localStorage` đánh dấu đã chạy xong (cùng mẫu `DA_CHAY_DI_TRU_KEY`).

## 3. Vì sao không chọn phương án khác

Đã trình bày cách trích văn bản (B/C) ở bảng §2.2. Hai nhánh khác từng cân nhắc:

| | Phương án | Vì sao loại |
|---|---|---|
| Chuyên khoa tự do (không ràng theo `SPECIALTIES`) | Không nhất quán với phần còn lại của app (Thư viện đã ràng theo `SPECIALTIES`); người dùng đã chọn "cả hai" (chuyên khoa cố định + tag tự do) khi được hỏi |
| Ô tìm kiếm CHỈ trong `SearchScreen` toàn app, bỏ ô tìm kiếm nội bộ `BoardGallery` | Người dùng thường vào thẳng tab Mindmap để tìm một bảng cụ thể, không phải luôn qua tab Tìm kiếm gốc — giữ cả hai không tốn thêm mô hình dữ liệu, chỉ thêm một ô input tái dùng cùng hàm lọc |

## 4. Thứ tự triển khai đề xuất (cho `writing-plans` chia checkpoint)

1. **Mô hình dữ liệu + chuyên khoa/tag UI** (§2.1, §2.3, §2.7 phần backfill chuyên khoa/tag) — nền
   cho cả tìm kiếm lẫn lọc, làm trước.
2. **Xuất PNG/PDF** (§2.6) — độc lập hoàn toàn với phần còn lại, rủi ro thấp, xong nhanh.
3. **Trích văn bản + tìm kiếm nội bộ `BoardGallery`** (§2.2, §2.4).
4. **Gộp vào `SearchScreen` toàn app** (§2.5) — chạm `src/App.tsx` (11.400 dòng), rủi ro cao nhất,
   để cuối cùng sau khi ba phần trên đã đứng vững.

## 5. Kiểm thử

- `boardMeta.ts`: trích văn bản thuần hàm (nhiều loại khối, bỏ nét vẽ tay, giới hạn độ dài) — test
  không cần DOM thật.
- Lọc/tìm kiếm (`normalizeSearch` + ghép trường) — thuần hàm, bảng ca rõ ràng (có dấu/không dấu,
  khớp theo tag, khớp theo `noiDungTimKiem`).
- `DanhSachBang`: chip lọc chuyên khoa, sửa tag qua menu, ô tìm kiếm lọc đúng lưới hiển thị.
- `SearchScreen`: kết quả loại "board" xuất hiện đúng, bấm vào mở đúng bảng trong tab Mindmap
  (`moBangYeuCau` truyền đúng id).
- Migration: bảng cũ (thiếu ba trường mới) sau di trú có đủ `chuyenKhoa`/`tags`/`noiDungTimKiem`
  hợp lệ, chạy đúng một lần (cờ localStorage).
- Xuất PNG/PDF: khó test tự động (canvas/PDF thật) — kiểm tay Browser pane thật, cùng nhóm khoá đã
  "hoãn" ở track TDD (mục 21+22 HANDOFF.md) nếu không tìm được cách gọi thẳng hàm export mà không
  cần render DOM đầy đủ.

## 6. Rủi ro đã biết

- **API lấy instance `ExportManager` từ `std` chưa xác nhận** — cần đo lúc viết plan (§2.6).
- **Thuật toán trích văn bản có thể bỏ sót loại khối mới** nếu vendored BlockSuite thêm block type
  chưa từng gặp — chấp nhận được, không chặn chặng, bổ sung dần khi phát hiện qua báo cáo cụ thể
  (đúng thói quen "đo có mục tiêu" của các chặng dịch trước, không quét phòng thủ toàn bộ trước).
- **`noiDungTimKiem` có thể phình `BangMeta`** với bảng nhiều chữ — đã đặt giới hạn độ dài (§2.2),
  cần đo kích thước thật của một `BangMeta` sau khi thêm trường này lúc viết plan.
- **Đổi `SearchResult`/`SearchScreen` trong `App.tsx`** là file 11.400 dòng — rủi ro hồi quy cao
  nhất trong toàn chặng, đã xếp cuối cùng (§4) để giảm thiệt hại nếu phải lùi lại.

## 7. Ngoài phạm vi

- Sao chép dạng văn bản (outline) — PRODUCT.md cũ có nhắc nhưng không nằm trong phạm vi đã chốt với
  người dùng (chỉ PNG/PDF). Có thể thêm sau nếu có yêu cầu cụ thể.
- Tìm kiếm mờ (fuzzy)/xếp hạng liên quan — so khớp con chuỗi sau khi bỏ dấu là đủ cho quy mô cá
  nhân hiện tại.
- Đồng bộ `chuyenKhoa`/`tags` hai chiều với hệ thống chuyên khoa của Thư viện (vd một bài viết gắn
  ngược lại danh sách bảng cùng chuyên khoa) — YAGNI tới khi có yêu cầu cụ thể.
- Sắp xếp/lọc kết hợp nhiều chuyên khoa cùng lúc (chỉ lọc được một chuyên khoa tại một thời điểm,
  giống `SEARCH_FILTERS` hiện có).

## 8. Tiêu chí xong

1. `BangMeta` có đủ `chuyenKhoa`/`tags`/`noiDungTimKiem`, bảng cũ được backfill qua migration một
   lần, không cần thao tác gì từ người dùng.
2. `DanhSachBang` có chip lọc chuyên khoa + ô tìm kiếm lọc đúng theo tên/tag/chuyên khoa/nội dung.
3. Menu "⋯" của thẻ sửa được chuyên khoa và tag, ghi đúng IndexedDB.
4. Nút "Xuất" trong bảng đang mở xuất được PNG và PDF thật, kiểm tay xác nhận file tải về đúng nội
   dung bảng.
5. Kết quả loại "board" xuất hiện trong `SearchScreen` toàn app, bấm vào mở đúng bảng trong tab
   Mindmap.
6. Bảy cổng hiện có (`tsc`, `npm test`, `kiem:vendor*`, `build`, `kiem:dist`) vẫn xanh.
