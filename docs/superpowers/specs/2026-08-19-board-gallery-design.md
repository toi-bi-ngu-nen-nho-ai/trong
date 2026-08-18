# Thiết kế: BoardGallery — màn danh sách bảng

Ngày: **2026-08-19**. Trạng thái: đã chốt thiết kế (brainstorm + mockup trực quan), chưa lập kế
hoạch. Track: **MindmapScreen**, phần "danh sách" — theo [[project_mindmap-charter]] đây là "app
của chủ dự án" (React, tiếng Việt), đáng phần lớn nhất công sức thiết kế của cả app; **ruột từng
bảng** (EdgelessBoard đã có) tiếp tục giữ chuẩn mực bám sát AFFiNE, KHÔNG đổi bởi chặng này.

Tiền đề đã xong: D4 (lưu trữ bền vững nội dung bảng qua IndexedDB) đã gộp vào `main`
(`1739f37`) — xem `docs/superpowers/specs/2026-08-18-luu-tru-noi-dung-bang-design.md` §8, mục này
là đúng "chặng BoardGallery riêng" mà spec đó để lại.

## 1. Vấn đề

App hiện chỉ có **đúng một bảng cứng**: tab "Mindmap" ở thanh nav dưới mở thẳng `EdgelessBoard`
với `docId` khoá cứng `'board'` trong CSDL IndexedDB `'drtrong-board'`. Không có cách tạo bảng
thứ hai, không có danh sách, không có cách đặt tên/xoá.

Ràng buộc kỹ thuật đang tồn tại phải tôn trọng khi đổi:

- **Hack "mount vĩnh viễn"** ở `src/App.tsx:11748-11778` — một khi tab Mindmap được mở lần đầu,
  `<EdgelessBoard />` không bao giờ unmount nữa; chuyển tab khác chỉ ẩn bằng
  `visibility:hidden` + `pointer-events-none` + `inert`, KHÔNG dùng `display:none`. Lý do đã đo
  thật: `Viewport`'s `ResizeObserver` chốt `_initialTopLeft` ngay lượt resize đầu tiên rồi mới
  debounce 200ms; nếu khung về 0×0 (`display:none`) trong lúc đó, lượt ẩn+hiện gộp thành một lần
  `_completeResize` tính sai tâm màn hình. `visibility:hidden` giữ nguyên kích thước hộp nên
  không kích hoạt resize nào.
- Trước khi có D4, unmount thật = mất trắng nội dung (bảng chỉ sống trong bộ nhớ) — đó là lý do
  ban đầu của hack. **D4 đã xoá tiền đề này**: unmount giờ an toàn vì nội dung đã lưu IndexedDB.

## 2. Kiến trúc

### 2.1 Data model — `src/lib/idb.ts`

Thêm store mới, nâng `DB_VERSION` 4 → 5 (theo đúng cơ chế `onupgradeneeded` đã có, tự tạo store
còn thiếu, không đụng gì của store cũ):

```ts
export const IDB_STORES = {
  ecgLessons: "lessons",
  articles: "articles",
  boards: "boards",   // MỚI
} as const
```

Bản ghi mỗi bảng (`keyPath: "id"`, dùng chung `idbGetAll`/`idbPut`/`idbDelete` đã có sẵn):

```ts
export type BangMeta = {
  id: string           // ĐỒNG THỜI là docId Yjs của bảng này — xem §2.2
  ten: string
  taoLuc: number        // Date.now()
  capNhatLuc: number     // Date.now(), ghi lại mỗi lần mở/sửa
  anhXemTruoc?: string   // data URL JPEG, xem §2.4 — vắng mặt nếu chưa từng mở bảng này
}
```

### 2.2 `EdgelessBoard.tsx` — nhận `boardId`, bỏ docId khoá cứng

`taoHoacMoBang()` đổi chữ ký: thêm `boardId: string` làm tham số ĐẦU (không phải trong
`tuyChon` — đây là mối quan tâm thật của production, không chỉ để test tiêm):

```ts
export async function taoHoacMoBang(
  boardId: string,
  tuyChon?: { docSources?: {...}; blobSources?: {...}; hanGioMs?: number },
)
```

Hai chỗ dùng `'board'` khoá cứng (`workspace.getDoc('board')`, `workspace.createDoc('board')`)
đổi thành `workspace.getDoc(boardId)`/`workspace.createDoc(boardId)`. `TEN_CSDL_BANG =
'drtrong-board'` và `id: 'bs-trong-board'` của `TestWorkspace` **giữ nguyên** — một CSDL/workspace
DUY NHẤT dùng chung cho mọi bảng, chỉ `docId` khác nhau theo từng bảng (đúng gợi ý đã ghi ở spec
D4 §7: `IndexedDBDocSource` đã hỗ trợ nhiều `docId` trong một `dbName`, không cần N CSDL riêng).

`EdgelessBoard()` (component React) nhận prop `boardId: string`, truyền xuống
`taoHoacMoBang(boardId)`.

### 2.3 `src/board/index.tsx` — xuyên `boardId` qua vỏ lazy/error-boundary

Class `EdgelessBoard` hiện khai `Component<Record<string, never>, State>` (KHÔNG nhận prop nào).
Đổi thành `Component<{ boardId: string }, State>`, và `<Bang />` (dòng 96) đổi thành
`<Bang boardId={this.props.boardId} />`. Không đổi gì khác của vỏ lazy/retry/error-boundary.

### 2.4 Ảnh xem trước — chụp lúc RỜI bảng, không dùng `ExportManager`

`ExportManager` sẵn có trong cây vendor (`affine/blocks/surface/.../export-manager.ts`) dùng
`html2canvas` — cần dựng DOM đầy đủ, không hợp để chụp NHIỀU bảng chỉ nhằm hiện danh sách (mỗi
lượt chụp tốn ngang một lượt mount thật).

Chọn hướng rẻ hơn: chụp **lúc unmount** (bảng đã mount sẵn, không tốn thêm gì). Trong nhánh dọn
dẹp của `useEffect` ở `EdgelessBoard()`, TRƯỚC dòng `litRender(null, el)` (sau dòng đó canvas đã
bị tháo):

```ts
try {
  const canvasGoc = el.querySelector('canvas')
  if (canvasGoc && canvasGoc.width > 0 && canvasGoc.height > 0) {
    const nho = document.createElement('canvas')
    nho.width = 480
    nho.height = 360
    nho.getContext('2d')?.drawImage(canvasGoc, 0, 0, 480, 360)
    void capNhatAnhXemTruoc(boardId, nho.toDataURL('image/jpeg', 0.6))
  }
} catch {
  // Chụp ảnh xem trước là best-effort — lỗi ở đây KHÔNG được chặn unmount thật.
}
```

Vẽ vào canvas 480×360 riêng (không lấy thẳng `toDataURL` của canvas gốc) để giới hạn dung lượng
bản ghi IndexedDB bất kể độ phân giải backing-store thật (có thể cao trên màn Retina/desktop).
`capNhatAnhXemTruoc()` không `await` — chạy nền, không trì hoãn thao tác quay lại danh sách của
người dùng.

Bảng chưa từng mở lần nào (mới tạo, người dùng bấm "+" rồi thoát ngay không vẽ gì) thì
`anhXemTruoc` vắng mặt — thẻ hiện icon trống thay vì ảnh.

### 2.5 `BoardGallery.tsx` (mới) — màn danh sách + quản lý mount/unmount một bảng

File mới `src/board/BoardGallery.tsx`, import trực tiếp (KHÔNG lazy — không phụ thuộc BlockSuite,
chỉ IndexedDB thuần + ảnh nhỏ) vào `App.tsx` thay cho `EdgelessBoard` hiện tại:

```ts
// App.tsx
import { BoardGallery } from "./board"   // thay cho: import { EdgelessBoard } from "./board"
```

Props: `{ dangHienTab: boolean }` — `dangHienTab = screen === "mindmap"`, App.tsx truyền xuống.

State nội bộ: `openBoardId: string | null`.

- **`openBoardId === null`:** render lưới thẻ (§3), CHỈ khi `dangHienTab` (không cần giữ mount
  lúc ẩn — lưới thẻ không có `Viewport`/`ResizeObserver` của BlockSuite, ẩn/hiện bằng conditional
  render bình thường là đủ, không cần kỹ thuật `visibility:hidden`).
- **`openBoardId !== null`:** LUÔN mount `<EdgelessBoard boardId={openBoardId} />` (từ
  `./index`, giữ nguyên vỏ lazy/error-boundary), bọc trong đúng kỹ thuật hack cũ đã đo — nhưng
  giờ CHỈ ẩn khi rời TAB (không phải rời app), và unmount thật khi bấm nút quay lại danh sách:

```tsx
{openBoardId && (
  <div
    className={`absolute inset-0${dangHienTab ? "" : " invisible pointer-events-none"}`}
    inert={!dangHienTab}
  >
    <EdgelessBoard boardId={openBoardId} />
    <button onClick={() => setOpenBoardId(null)} /* nút quay lại, nổi trên bảng */>...</button>
  </div>
)}
```

Bấm nút quay lại → `setOpenBoardId(null)` → `<EdgelessBoard>` unmount THẬT (chạy đúng dọn dẹp đã
có ở §2.4 + `workspace.forceStop()` sẵn có) → lưới thẻ hiện lại, thẻ vừa rời có ảnh xem trước mới.

Kết quả phụ đáng kể: **`daMoBangVe`/`invisible`/`inert` ở `App.tsx` (toàn bộ khối 11290-11305 +
11748-11778) được THAY THẾ, không phải xoá trơ trọi** — logic tương đương chuyển hẳn vào
`BoardGallery.tsx`, App.tsx chỉ còn `<BoardGallery dangHienTab={screen === "mindmap"} />` không
điều kiện (rẻ, không tải chunk BlockSuite cho tới khi thật sự mở một bảng).

### 2.6 Di trú bảng cũ

`BoardGallery` lúc mount lần đầu (chạy đúng một lần, `useEffect([])`) gọi
`diTruBangCuNeuCo()` (mới, trong `boardMeta.ts`):

1. Đọc danh sách `boards` hiện có qua `idbGetAll`. Nếu đã có bản ghi `id === 'board'` → dừng
   (đã di trú hoặc người dùng đã tự đặt tên cho nó).
2. Nếu chưa: mở workspace `'drtrong-board'` (dùng lại `IndexedDBDocSource`/`IndexedDBBlobSource`
   như `taoHoacMoBang`, nhưng KHÔNG `createDoc` nếu thiếu — đây là kiểm tra tồn tại, không phải
   mở/tạo), `getDoc('board')`. Nếu doc tồn tại VÀ `store.root` có ít nhất một `affine:surface`
   con → ghi `{ id: 'board', ten: 'Bảng đầu tiên', taoLuc: Date.now(), capNhatLuc: Date.now() }`
   vào store `boards`. Nếu không tồn tại (máy mới, chưa từng có bảng cũ) → không làm gì.
3. `workspace.forceStop()` trong mọi nhánh trước khi return.

## 3. Màn danh sách — bố cục (đã chốt qua mockup trực quan)

Lưới 2 cột, gọn (kiểu Google Keep): ảnh xem trước 4:3 nổi trực tiếp trên nền (không khung/nền
trắng riêng), gap 8px. Dưới ảnh: **tên bảng** (đậm, 1 dòng, ellipsis nếu dài) rồi **thời điểm sửa
gần nhất** (nhạt, nhỏ, định dạng tương đối — "2 giờ trước"/"Hôm qua"/... tái dùng hàm định dạng
thời gian tương đối đã có trong app nếu có, viết mới nếu chưa). Thẻ cuối cùng của lưới là ô "+"
viền đứt để tạo bảng mới.

## 4. Vòng đời thao tác

- **Tạo:** bấm thẻ "+" → `taoIdBang()` (mẫu `newBlockId()` đã có ở `src/lib/blocks.ts`, đổi tiền
  tố) → ghi `BangMeta` mặc định (`ten: "Bảng chưa đặt tên"`) qua `idbPut` → `setOpenBoardId(id)`
  ngay (mở thẳng vào vẽ, không hỏi tên trước — khớp cảm giác "mở sổ mới rồi viết" hơn là điền
  form).
- **Đổi tên:** chạm giữ (long-press, `onContextMenu`/timer `pointerdown`) thẻ → tên hiện thành ô
  nhập tại chỗ (inline) → lưu qua `idbPut` khi blur/Enter, huỷ khi Escape.
- **Xoá:** menu nhỏ trên thẻ (mở bằng chạm giữ, cùng chỗ với Đổi tên) — theo ĐÚNG khuôn "chạm hai
  lần" app đã dùng cho "Xoá bệnh nhân" (`src/App.tsx:5239` khu vực) và "Xoá nhật ký": mục menu
  đổi nhãn "Xoá" → "Chắc chắn xoá?" khi chạm lần 1, tự trở lại "Xoá" sau vài giây nếu không chạm
  tiếp, chạm lần 2 (trong cửa sổ đó) mới xoá thật — **không dùng hộp thoại xác nhận**. Xoá thật:
  `idbDelete('boards', id)` + xoá luôn Yjs doc + blob liên quan trong `'drtrong-board'` (gọi
  `workspace.removeDoc()`/tương đương nếu vendor có, đo lại lúc viết plan — nếu không có API xoá
  doc sạch thì ghi rõ nợ kỹ thuật "xoá metadata nhưng để rác Yjs lại", không chặn chặng này).

## 5. Vì sao không chọn phương án khác

| | Phương án | Vì sao loại |
|---|---|---|
| B | Ảnh xem trước bằng `ExportManager`/`html2canvas`, chụp theo yêu cầu khi hiện danh sách | Cần dựng DOM đầy đủ cho MỖI bảng chỉ để chụp — tốn ngang N lượt mount thật; chụp lúc rời bảng (đã chọn) tái dùng canvas đã có sẵn, chi phí gần như 0 |
| C | CSDL IndexedDB riêng cho mỗi bảng (`dbName` theo id) | `IndexedDBDocSource` đã hỗ trợ nhiều `docId` trong một `dbName` (đo ở spec D4 §7) — mở N kết nối CSDL không cần thiết, phức tạp hơn quản lý version/migration |
| D | Giữ hack mount-vĩnh-viễn, chỉ thêm danh sách bên cạnh (không unmount khi đổi bảng) | Nhiều bảng cùng mount = nhân bộ nhớ/engine đồng bộ theo số bảng đã từng mở trong phiên — đúng loại áp lực mà cấu hình `viewportRuntimeConfig` cho iOS (2026-08-18) vừa tìm cách giảm, làm ngược lại vô nghĩa |

## 6. Kiểm thử

Chi tiết ca kiểm cụ thể để plan quyết định, nhưng phạm vi bắt buộc:

- `idb.ts`: nâng version không phá store cũ (ca kiểm hồi quy, mô phỏng máy đã có version 4).
- `boardMeta.ts`: CRUD thuần (tạo/đổi tên/xoá/liệt kê), `diTruBangCuNeuCo()` cả hai nhánh (có bảng
  cũ / không có).
- `taoHoacMoBang(boardId, ...)`: mở rộng bộ ca kiểm hiện có (`edgeless-board.spec.ts`) — hai
  `boardId` khác nhau tạo hai doc độc lập, không đụng nhau.
- `BoardGallery`: chuyển `openBoardId` null↔có-giá-trị đúng lúc unmount/mount `EdgelessBoard`;
  `dangHienTab=false` khi có bảng mở → không unmount (kiểm tra DOM `invisible`/`inert`, không
  phải mất hẳn khỏi cây — đúng tinh thần ca kiểm cũ đã ghim cho hack cũ).
- Ảnh xem trước: hàm chụp+resize thuần (tách khỏi DOM thật nếu được, hoặc happy-dom) không ném
  lỗi khi canvas rỗng/0×0.

## 7. Rủi ro đã biết

- **API xoá sạch một Yjs doc trong `TestWorkspace`/`IndexedDBDocSource` chưa được xác nhận tồn
  tại** — cần đo lúc viết plan (§4). Nếu không có, xoá bảng chỉ xoá metadata (bảng biến mất khỏi
  danh sách) nhưng để lại rác trong CSDL — chấp nhận được ở quy mô cá nhân, ghi rõ thành nợ kỹ
  thuật, không chặn chặng này.
- **Ảnh xem trước có thể lệch nội dung thật** nếu người dùng sửa xong nhưng KHÔNG rời bảng bằng
  nút quay lại (ví dụ tắt hẳn app/tab) — thẻ giữ ảnh cũ tới lượt rời tiếp theo. Chấp nhận được:
  nội dung thật (đã lưu qua D4) luôn đúng, chỉ ảnh minh hoạ có thể trễ một nhịp.
- **`inert` cần polyfill/kiểm hỗ trợ trình duyệt** nếu iPad Safari cũ chưa có — đo lúc viết plan
  (thuộc tính đã dùng sẵn ở hack cũ nên khả năng cao đã ổn, chỉ nhắc lại).

## 8. Ngoài phạm vi

- Sắp xếp lại thứ tự thẻ theo tay (kéo-thả) — mặc định sắp theo `capNhatLuc` giảm dần là đủ cho
  chặng này.
- Tìm kiếm/lọc trong danh sách bảng — YAGNI tới khi số bảng thật sự nhiều.
- Đồng bộ server nhiều bảng — điều kiện đã kiểm khả thi ở spec D4, chưa làm.
- Xử lý va chạm hai tab cùng sửa metadata (`idbPut` cho `boards`) — rủi ro thấp, cùng lớp với các
  store `idb.ts` khác đã chấp nhận từ trước (last-write-wins ngầm định).

## 9. Tiêu chí xong

1. `idb.ts` `DB_VERSION` = 5, store `boards` tồn tại, ca kiểm hồi quy version xanh.
2. `taoHoacMoBang(boardId, ...)` — hai `boardId` khác nhau không đụng nội dung nhau, ca kiểm cũ
   (đường cơ bản, hạn giờ, tự hồi phục) vẫn xanh với chữ ký mới.
3. `BoardGallery` render lưới thẻ đúng bố cục §3, tạo/đổi tên/xoá hoạt động đúng §4.
4. Mở một bảng → chuyển tab khác → quay lại tab Mindmap → bảng vẫn ở đúng chỗ, không vẽ lại từ
   đầu (đúng hành vi ẩn/hiện đã ghim).
5. Bấm quay lại danh sách → bảng unmount thật, ảnh xem trước cập nhật trên thẻ.
6. Bảng cũ (`docId 'board'` có sẵn trên máy) xuất hiện tự động trong danh sách sau khi cập nhật,
   không cần thao tác gì từ người dùng.
7. Bảy cổng hiện có (`tsc`, `npm test`, `kiem:vendor*`, `build`, `kiem:dist`) vẫn xanh — chặng này
   không đụng `src/vendor/` nên bốn cổng vendor/dist dự kiến không đổi số, đo lại để xác nhận
   thay vì giả định (bài học #2/#3 của HANDOFF).
