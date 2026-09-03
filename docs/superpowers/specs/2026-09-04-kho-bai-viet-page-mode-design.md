# Thiết kế: Kho nội dung hợp nhất — bài viết (page mode) + sơ đồ (edgeless)

Ngày: **2026-09-04**. Trạng thái: đã chốt thiết kế (brainstorm trong chat), chưa lập kế hoạch.
Track: **MindmapScreen mở rộng** — theo [[project_mindmap-charter]] đây là "phòng não phải" của app;
chặng này đưa nửa còn lại của BlockSuite (page mode) vào cùng một kho với nửa edgeless đã có.

Chặng này **thay thế** hệ bài viết tự viết tay (`Article`/`ContentBlock`/`BlockEditor`) bằng trình
soạn thảo AFFiNE ở chế độ trang. Đây là lượt xoá lớn nhất từ trước tới nay của dự án.

## 1. Vấn đề

App đang chạy **hai** hệ nội dung song song, không biết gì về nhau:

| | Hệ bài viết (cũ) | Hệ bảng vẽ (mới) |
|---|---|---|
| Kiểu dữ liệu | `Article` + `ContentBlock` (`src/data/types.ts`) | `BangMeta` (`src/board/boardMeta.ts`) |
| Trình soạn | `src/components/BlockEditor.tsx` (540 dòng, tự viết) | BlockSuite vendored, `viewManager.get('edgeless')` |
| Lưu trữ | store `articles` + `lessons` trong `drtrong-ecg` | store `boards` + CSDL CRDT `drtrong-board` |
| Màn hình | `AddEntryScreen`, `CustomEntryScreen`, `ArticleScreen`, `SpecialtyScreen`, `EcgScreen`, `EcgDetailScreen`, `AddEcgScreen` | `BoardGallery` → `DanhSachBang` → `EdgelessBoard` |

Trạng thái cụ thể đã đo:

- `src/data/articles.ts` (475 dòng) chứa `ARTICLES` — **dữ liệu placeholder**, tóm tắt còn nguyên
  tiếng Anh ("Myocardial infarction results from prolonged ischemia…"). Không phải nội dung thật.
- `src/data/ecg.ts`: `ECG_LESSONS = []` — chưa từng có bài học ECG dựng sẵn.
- Ba thẻ "Truy cập nhanh" ở Trang chủ — **Tiếp cận vấn đề**, **Phác đồ**, **Công cụ** — trỏ vào
  `ComingSoonScreen`. Tab **Hướng dẫn** dưới thanh nav cũng vậy (`src/App.tsx:12793`).
- **Page mode CHẠY ĐƯỢC** với cây vendored mà không cần đụng vendor: `RootViewExtension._setupPage()`
  (`src/vendor/blocksuite/affine/blocks/root/src/view.ts:57`) đăng ký
  `BlockViewExtension('affine:page', literal\`affine-page-root\`)` + `PageClipboard` +
  `ViewportElementExtension('.affine-page-viewport')`. Chỉ cần gọi `viewManager.get('page')` thay
  vì `'edgeless'`. Không có gì phải vá ở `src/vendor/` (luật D11 giữ nguyên).
- `Transformer.docToSnapshot()` / `.snapshotToDoc()` có sẵn
  (`src/vendor/blocksuite/framework/store/src/transformer/transformer.ts:100,192`) — đường xuất/nhập
  nội dung doc ra **JSON**, không phải tự chế định dạng CRDT nhị phân.

Hệ quả của việc để hai hệ song song: bác sĩ gặp hai thứ đều tên là "bài viết" nhưng soạn bằng hai
trình khác nhau, tìm kiếm ở hai chỗ khác nhau, xuất/nhập theo hai đường khác nhau. Không giải thích
được cho người dùng.

## 2. Quyết định của chủ dự án (chốt trong brainstorm 2026-09-04)

Ghi lại nguyên văn vì mọi mục dưới đây suy ra từ đây:

1. **Hai loại mục tách biệt.** "Bài viết" (page mode) và "Sơ đồ" (edgeless) là hai bản ghi khác
   nhau, **không** chuyển qua lại được. KHÔNG dùng mô hình "một doc, hai chế độ" của AFFiNE.
2. **Danh mục là trường dữ liệu chung** của một kho duy nhất.
3. **Xoá sạch hệ cũ**, ECG cũng chuyển sang page mode.
4. **Bỏ toàn bộ dữ liệu cũ** — cả store `articles`/`lessons` lẫn store `boards` + CSDL
   `drtrong-board`. Không viết code di trú.
5. **Giữ tab Mindmap** ở thanh nav. Thư viện = nơi tổng hợp bài viết; Mindmap = nơi tổng hợp sơ đồ.
   Thêm sơ đồ mới qua Mindmap; thêm bài viết mới ở Trang chủ.
6. **Hướng dẫn KHÔNG xuất hiện trong Thư viện** (chủ dự án nghĩ lại 2026-09-04) — nó đứng riêng
   ngoài cả hai trục. Nhãn tab **giữ nguyên là "Thư viện"** (đã cân nhắc đổi thành "Bài viết", chủ
   dự án chọn giữ).
7. **Hỏi danh mục ngay lúc tạo** bài mới. Không có trạng thái "chưa phân loại".
8. **Bài viết sửa được ở mọi bề ngang.** Luật chỉ-đọc-khung-hẹp CHỈ áp cho sơ đồ.
9. **Bật đủ bộ soạn thảo**, trừ phần đa người dùng.
10. **Làm luôn** Tìm kiếm + Đồng bộ dữ liệu + Đã đọc gần đây trong cùng lượt này.
11. Ba màn danh mục dùng **một component chung**, chỉ khác tiêu đề.
12. Màn chuyên khoa thành **lưới mục lọc sẵn theo khoa**.

## 3. Kiến trúc

### 3.1 Mô hình dữ liệu — `src/board/mucMeta.ts` (đổi tên từ `boardMeta.ts`)

```ts
export type LoaiMuc   = 'bai-viet' | 'so-do'
export type IdDanhMuc = 'tiep-can' | 'ecg' | 'phac-do' | 'huong-dan'

export const DANH_MUC = [
  { id: 'tiep-can',  ten: 'Tiếp cận vấn đề', loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'ecg',       ten: 'ECG',             loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'phac-do',   ten: 'Phác đồ',         loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'huong-dan', ten: 'Hướng dẫn',       loaiChoPhep: ['bai-viet'] },
] as const satisfies readonly { id: IdDanhMuc; ten: string; loaiChoPhep: readonly LoaiMuc[] }[]

export type MucMeta = {
  id: string
  /** Chốt lúc tạo, KHÔNG đổi được — xem §7 "Ngoài phạm vi". */
  loai: LoaiMuc
  /** Đổi được sau qua ô sửa trên thẻ. */
  danhMuc: IdDanhMuc
  ten: string
  taoLuc: number
  capNhatLuc: number
  /** Xoá MỀM — giữ nguyên ngữ nghĩa của `BangMeta.daXoaLuc` hiện tại. */
  daXoaLuc?: number
  chuyenKhoa: string
  tags: string[]
  noiDungTimKiem: string
  mauHue?: number
}
```

**Mọi trường đều BẮT BUỘC ở runtime** (trừ `daXoaLuc`/`mauHue`) — khác `BangMeta` hiện tại, nơi
`chuyenKhoa`/`tags`/`noiDungTimKiem` phải tự `?? mặc định` ở mọi chỗ đọc vì bản ghi đời cũ thiếu
chúng. Ở đây không có bản ghi đời cũ nào (quyết định 4), nên **bỏ hết các nhánh `??` phòng vệ đó** —
giữ lại là giữ một lời nói dối về hình dạng dữ liệu.

Hàm đổi tên theo: `bangKhopTimKiem` → `mucKhopTimKiem`, `taoIdBang` → `taoIdMuc`,
`capNhatSauKhiRoiBang` → `capNhatSauKhiRoiMuc`. `trichVanBanTuKhoi` / `trichVanBanTuCanvas` /
`ghepNoiDungTimKiem` giữ nguyên tên — chúng nói về cấu trúc BlockSuite, không về "bảng".

### 3.2 Lưu trữ — `src/lib/idb.ts`

```
DB_VERSION 5 → 6

IDB_STORES = {
  mucs: "mucs",       // MỚI — metadata của cả hai loại
  // ecgLessons: "lessons",   ← XOÁ
  // articles:   "articles",  ← XOÁ
  // boards:     "boards",    ← XOÁ
}
```

`onupgradeneeded` tạo store `mucs` và **`deleteObjectStore`** ba store cũ. Ba store đó không còn ai
đọc sau chặng này; để lại là để rác trong CSDL người dùng vĩnh viễn — đúng lớp vấn đề mà chú thích
`anhXemTruoc` trong `boardMeta.ts` đã từng phải dọn thủ công.

Nội dung doc: **một workspace BlockSuite duy nhất** cho cả hai loại, IndexedDB
`drtrong-noi-dung` (đổi từ `drtrong-board`). Một doc là một doc — khác nhau chỉ ở bộ extension lúc
render. Tách hai workspace nghĩa là hai `TestWorkspace`, hai `IndexedDBDocSource`, hai lượt
`waitForSynced()` — không đổi lại được gì.

Đổi tên CSDL kéo theo: `scripts/kiem-dist.mjs` và mọi chỗ grep chuỗi `drtrong-board` để canh ranh
giới nạp chậm D13 phải đổi sang `drtrong-noi-dung`. Xem chú thích `DA_CHAY_DI_TRU_KEY` trong
`BoardGallery.tsx` — nó cố ý tránh chuỗi con `drtrong-board` vì đúng phép grep này.

**Xoá kèm**: `src/board/diTruBangCu.ts` (173 dòng) + hai cờ localStorage
`drtrong:board-di-tru-da-chay` và `drtrong:board-di-tru-noi-dung-da-chay` + lời gọi di trú trong
`BoardGallery.tsx`. Chúng di trú bảng đời `docId` khoá cứng sang `BangMeta` — không còn đối tượng nào
để di trú sau quyết định 4.

### 3.3 Trình soạn thảo — bóc phần dùng chung

```
src/board/
  mo-doc.ts           MỚI  — taoHoacMoDoc(id, loai, tuyChon?): workspace, seed, hạn giờ, chống đua
  che-do-co-dinh.ts   ĐỔI  — từ che-do-edgeless.ts; CheDoCoDinh nhận tham số mode
  extensions.ts       SỬA  — +18 ext; tách layExtensionsTrang() / layExtensionsEdgeless()
  EdgelessBoard.tsx   SỬA  — còn lại phần riêng của edgeless
  TrangBaiViet.tsx    MỚI  — vỏ page mode
  index.tsx           SỬA  — vỏ nạp chậm + error boundary, dùng chung CẢ HAI loại
```

**`mo-doc.ts`** giữ nguyên toàn bộ logic đã tôi luyện của `taoHoacMoBang`: hàng đợi
`luotMoDangCho` chống hai lượt mở chồng nhau, `doiCoHanGio`, `doiNoiDungToi`, nhánh rơi về workspace
bộ nhớ khi hết giờ, cờ `khongLuuDuoc`, lượt `waitForSynced()` thứ hai sau seed. Thay đổi DUY NHẤT là
tham số `loai` quyết định seed:

```ts
const rootId = store.addBlock('affine:page', {})
store.addBlock('affine:surface', {}, rootId)
if (loai === 'bai-viet') {
  const noteId = store.addBlock('affine:note', {}, rootId)
  store.addBlock('affine:paragraph', {}, noteId)
}
```

**Vì sao bài viết vẫn seed `affine:surface`**: (a) giữ MỘT hình dạng doc duy nhất cho
`Transformer` xuất/nhập ở §3.6, (b) `SurfaceRefViewExtension` đã bật cho phép bài viết nhúng tham
chiếu vùng canvas về sau, (c) nhánh tự-hồi-phục `!store.root.children.some(… 'affine:surface')`
trong `mo-doc.ts` được giữ nguyên cho cả hai loại thay vì rẽ đôi.

**`affine:note` + `affine:paragraph` rỗng** để mở bài mới ra là có chỗ gõ ngay.
`page-root-block.ts:162` tự tạo note khi bấm vào vùng trống, nên đây là tiện nghi chứ không phải bắt
buộc — nhưng thiếu nó thì bài mới mở ra là một trang trắng hoàn toàn không có con trỏ, đọc như lỗi.

**⚠️ `che-do-edgeless.ts` chốt cứng `getEditorMode() → 'edgeless'`.** Dùng lại nguyên xi cho page
mode là hỏng ngay ba chỗ mà chính file đó đã ghi lại: `ToolbarContext.editorMode` sai
→ `isEdgelessMode` TRUE giữa một trang page; `topContenteditableElement` của paragraph/list/code
trả về root thay vì thẻ note bọc ngoài; `image-resize-manager.ts` đọc `viewport.zoom` sai. Nên:

```ts
class CheDoCoDinh extends DocModeService {
  constructor(private readonly cheDo: DocMode) { super() }
  override getEditorMode(): DocMode { return this.cheDo }
}
export const cheDoTrang    = DocModeExtension(new CheDoCoDinh('page'))
export const cheDoEdgeless = DocModeExtension(new CheDoCoDinh('edgeless'))
```

Phạm vi vẫn cố ý hẹp: chỉ `getEditorMode`, `getPrimaryMode` để nguyên mặc định — giữ đúng lý lẽ đã
ghi trong file gốc.

**`TrangBaiViet.tsx`** là bản song sinh mỏng của `EdgelessBoard.tsx`, dùng chung `mo-doc.ts`,
`lop-css-vendor.ts`, theme watcher, `ban-phim-ios.ts`, và cơ chế đếm thay đổi nội dung
(`store.slots.blockUpdated`) để bump `capNhatLuc`. Khác ở:

- `layExtensionsTrang()` thay `layExtensionsEdgeless()`
- **KHÔNG** gọi `laKhungHep()` / `theoDoiKhungHep()` — bài viết luôn sửa được (quyết định 8)
- **KHÔNG** cần `dong-bo-toa-do-viewport.ts`, `viewport-ios.ts`, `xep-o-tu-dong.ts` (đều là chuyện
  của canvas)
- `noiDungTimKiem` chỉ lấy từ `trichVanBanTuKhoi(store.root)` — trang không có
  `surface.elementModels` mang chữ

**`src/board/index.tsx`** (vỏ nạp chậm + error boundary) nhận thêm prop `loai` và chọn `lazy()` nào
để nạp. Giữ nguyên toàn bộ lý lẽ về error boundary đã ghi trong file: PWA cài ngoài màn hình chính,
chunk 4 MB chỉ có sau một lượt tải mạng thành công, `React.lazy` nhớ vĩnh viễn promise bị từ chối.
Hai loại **dùng chung một chunk** (xem §3.4), nên kho `Map<number, ComponentType>` hiện có chỉ cần
thêm loại vào khoá.

### 3.4 Extension — `src/board/extensions.ts`

Bật thêm **18** (hiện **38**/58 → 56/58).

> Đếm lại tay từ mảng `viewExtensions` thật: **38** mục, không phải 37 như dòng đầu file ghi — chú
> thích đó viết từ chặng D13 và không được cập nhật khi các chặng sau bật thêm
> (`EdgelessTextViewExtension` 2026-08-31 là mục gần nhất). **Sửa luôn con số trong chú thích** khi
> đụng file, đừng để nó lệch tiếp.

| Nhóm | Extension | Vì sao |

|---|---|---|
| Fragment | `DocTitleViewExtension` | Tiêu đề bài viết |
| Fragment | `OutlineViewExtension` | Mục lục — thay `blocksToToc()` của hệ cũ |
| Fragment | `FramePanelViewExtension` | Panel khung cho edgeless |
| Widget | `KeyboardToolbarViewExtension` | Thanh công cụ trên bàn phím ảo — **quan trọng nhất cho PWA điện thoại** (quyết định 8) |
| Widget | `PageDraggingAreaViewExtension` | Bôi chọn nhiều khối trong trang |
| Widget | `LinkedDocViewExtension` | Gõ `@` liên kết sang bài khác — thay `LinkTarget` của hệ cũ |
| Widget | `ScrollAnchoringViewExtension` | Giữ vị trí cuộn khi nội dung phía trên đổi |
| Widget | `NoteSlicerViewExtension` | Cắt note trên canvas |
| Widget | `EdgelessAutoConnectViewExtension` | Tự nối phần tử trên canvas |
| Block | `DividerViewExtension` | Đường kẻ ngang |
| Block | `TableViewExtension` | Bảng — thiếu hẳn ở hệ cũ |
| Block | `CalloutViewExtension` | Khối nhấn mạnh (cảnh báo lâm sàng) |
| Block | `LatexViewExtension` | Khối công thức — **xem cảnh báo §6.1** |
| Block | `BookmarkViewExtension` | Nhúng link dạng thẻ |
| Block | `EmbedViewExtension` | Nhúng nội dung ngoài |
| Block | `EmbedDocViewExtension` | Nhúng bài viết khác |
| Block | `DataViewViewExtension` | View bảng dữ liệu |
| Gfx | `LinkViewExtension` (GfxLink) | Link trên canvas |

Giữ cắt **2**:

- `RemoteSelectionViewExtension` — con trỏ/vùng chọn của người dùng khác. App offline một người,
  không có gì để hiển thị (quyết định 9: "trừ đa người dùng").
- `AdapterPanelViewExtension` — panel debug chuyển đổi định dạng của playground thượng nguồn, không
  phải công cụ soạn thảo.

Nếu một extension trong bảng trên hoá ra kéo theo phụ thuộc nặng bất ngờ, **gỡ nó ra và ghi lại vào
file kèm số đo**, theo đúng mẫu chú thích Latex sẵn có — đừng gỡ im lặng.

`layExtensionsTrang()` = `[...viewManager.get('page'), cheDoTrang, phongChuBangExtension]`.
`layExtensionsEdgeless()` giữ nguyên chữ ký, đổi `cheDoEdgeless` sang bản mới.

**Một chunk cho cả hai chế độ.** `viewManager` là singleton cấp module và `.get()` chạy chuỗi
`setup() → effect() → effects()`, tức `customElements.define(...)`. Dựng manager thứ hai để tách
chunk là chạm đúng bẫy `NotSupportedError` đã ghi trong `EdgelessBoard.tsx`. Chấp nhận: mở một bài
viết vẫn tải cả phần edgeless.

Dung lượng ước tính (phải **đo lại thật** bằng `npm run build` và ghi số vào file, theo mẫu chú
thích hiện có): chunk soạn thảo **993 kB gzip → ~1.500–1.700 kB**. Vỏ app giữ nguyên 332 kB.

### 3.5 Màn hình — `LuoiMuc` dùng chung

`DanhSachBang.tsx` (2.700 dòng) đổi tên thành `LuoiMuc.tsx`, **không tách file** (Hướng A). Giữ trọn
hành vi đã tôi luyện: FLIP mở/đóng thẻ, xoá mềm + hoàn tác, chọn nhiều, chip lọc, `mauHueChongTrung`,
ô đổi tên lúc tạo, các cuộc đua đã vá. Thêm props:

```ts
type PropsLuoiMuc = {
  tieuDe: string
  loai?: LoaiMuc                 // undefined = cả hai
  danhMuc?: IdDanhMuc            // undefined = mọi danh mục
  danhMucLoaiTru?: IdDanhMuc[]   // riêng Thư viện — xem ghi chú dưới bảng
  chuyenKhoa?: string            // undefined = mọi khoa
  loaiTaoDuoc: LoaiMuc[]         // [] = màn này không có nút tạo
}
```

| Nơi | props | Ghi chú |
|---|---|---|
| Thẻ Trang chủ "Tiếp cận vấn đề" | `{ danhMuc: 'tiep-can', loaiTaoDuoc: ['bai-viet','so-do'] }` | cả hai loại trộn chung, phân biệt bằng icon trên thẻ |
| Thẻ Trang chủ "ECG" | `{ danhMuc: 'ecg', … }` | thay `EcgScreen` |
| Thẻ Trang chủ "Phác đồ" | `{ danhMuc: 'phac-do', … }` | thay `ComingSoonScreen` |
| Tab **Thư viện** | `{ loai: 'bai-viet', danhMucLoaiTru: ['huong-dan'], loaiTaoDuoc: [] }` | **KHÔNG** gồm Hướng dẫn (quyết định 6) |
| Tab **Mindmap** | `{ loai: 'so-do', loaiTaoDuoc: ['so-do'] }` | giữ nút "+" hiện có |
| Tab **Hướng dẫn** | `{ danhMuc: 'huong-dan', loaiTaoDuoc: ['bai-viet'] }` | chỉ bài viết |
| Màn chuyên khoa | `{ chuyenKhoa: id, loaiTaoDuoc: [] }` | mở từ dải chọn khoa cong |

`danhMucLoaiTru` là prop riêng vì Thư viện là màn DUY NHẤT loại trừ theo danh mục thay vì lọc vào.
Đặt tên rõ như vậy thay vì nhồi ngữ nghĩa "trừ" vào `danhMuc`.

**Cấu trúc điều hướng sau chặng này:**

```
Trục LOẠI     : Thư viện (bài viết) ↔ Mindmap (sơ đồ)   — cùng phủ 3 danh mục
Trục DANH MỤC : Tiếp cận vấn đề · ECG · Phác đồ          — mỗi thẻ chứa cả 2 loại
Đứng riêng    : Hướng dẫn (chỉ bài viết, không lọt vào Thư viện)
```

Thanh nav giữ nguyên 5 tab, giữ nguyên nhãn: Trang chủ / Thư viện / Hướng dẫn / Mindmap / Thẻ ghi
nhớ.

**Thẻ phân biệt loại bằng icon** — trang giấy (bài viết) ↔ sơ đồ nhánh (sơ đồ). Chủ dự án chọn "một
component chung, chỉ khác tiêu đề", tức KHÔNG tách hai khối riêng trong màn danh mục.

**"Tạo bài mới" ở Trang chủ**: bấm → bảng chọn danh mục (4 lựa chọn) → tạo `MucMeta` loại
`bai-viet` → mở thẳng `TrangBaiViet`. Không có trạng thái chưa-phân-loại (quyết định 7). Nút "+"
trong tab Mindmap giữ nguyên luồng hiện tại nhưng cũng hỏi danh mục — chỉ 3 lựa chọn (Hướng dẫn
không nhận sơ đồ).

**Xoá khỏi `src/App.tsx`**: `ArticleScreen`, `CustomEntryScreen`, `AddEntryScreen`, `SpecialtyScreen`
(bản cũ), `EcgScreen`, `EcgDetailScreen`, `AddEcgScreen`, hằng `ENTRY_TYPES`, `BI_DANH_KHOA`/
`khoaChuan`, và các nhánh `Screen` tương ứng: `article`, `customEntry`, `addEntry`, `addEcg`,
`ecg`, `ecgDetail`. `comingSoon` giữ lại — thẻ "Công cụ" và tab "Thẻ ghi nhớ" vẫn dùng.

**Xoá file**: `src/data/articles.ts`, `src/data/ecg.ts`, `src/components/BlockEditor.tsx`,
`src/components/BlockContent.tsx`, `src/lib/blocks.ts`, `src/lib/specialtyStats.ts`,
`src/board/diTruBangCu.ts`, `src/lib/richText.ts`.

`richText.ts` xoá được: đã `grep` toàn `src/` — chỉ `BlockContent.tsx`, `BlockEditor.tsx`,
`data/types.ts`, `lib/blocks.ts` tiêu thụ nó, cả bốn đều bị xoá ở chặng này. (Các kết quả trong
`src/vendor/blocksuite/` là mã thượng nguồn không liên quan, chỉ trùng chữ.)

`ARTICLE_CONTENT` chỉ được `src/App.tsx`, `src/data/articles.ts`, `src/data/types.ts` dùng — đi theo
`articles.ts`.

**Xoá kiểu** trong `src/data/types.ts`: `ContentBlock`, `BlockType`, `Article`, `ArticleSection`,
`ArticleContent`, `EcgLesson`.

### 3.6 Tìm kiếm · Đồng bộ · Đã đọc gần đây

**`SearchScreen`** — `SearchResult.kind` hiện là
`"article" | "customArticle" | "ecg" | "flashcard" | "board"` (`src/App.tsx:1344`); bốn trong năm
giá trị đó biến mất cùng hệ cũ. Sau chặng này còn **`'muc' | 'flashcard'`**: một nguồn duy nhất là
kho `mucs` (so khớp bằng `mucKhopTimKiem`) cộng thẻ ghi nhớ tự nhập. Bốn nhánh `ARTICLES`,
`customArticles`, `ECG_LESSONS`, `board` gộp thành một. Nhánh điều hướng
`if (r.kind === …)` ở `src/App.tsx:1468-1471` rút còn hai. Dải chip suy từ kết quả giữ nguyên cơ chế.

*Lưu ý phạm vi:* màn tìm kiếm này **không** tìm thuốc/kháng sinh/bệnh — cây Dùng thuốc có đường
tìm riêng. Chặng này không đụng tới.

**Đồng bộ dữ liệu** (`ImportPayload` / xuất JSON) — bỏ khoá `articles` và `ecgLessons`, thêm:

```ts
mucs: {
  meta: MucMeta[]
  docs: DocSnapshot[]   // Transformer.docToSnapshot() cho từng mục
}
```

Nhập: `snapshotToDoc()` dựng lại doc trong workspace, rồi `idbPutMany` phần meta. Vẫn là JSON thuần
— hợp với `diffImportCounts` và màn xem trước hiện có. Nhãn đếm: "Mục" thay cho "Bài viết" + "Bài
học ECG".

`Transformer` cần middleware cho blob (ảnh) — dùng `assets` của chính transformer, chấp nhận
file xuất phình lên khi bài có ảnh. Ghi rõ giới hạn này ra màn Đồng bộ.

**`recentReads`** (`src/lib/recentReads.ts`) — `ReadEntry.screen` gom về một giá trị `'muc'`, `id` là
`MucMeta.id`. `RecentReadItem.tag` hiện tên danh mục.

## 4. Vòng đời thao tác

**Tạo bài viết mới**
1. Trang chủ → "Tạo bài mới" → bảng chọn danh mục.
2. `taoIdMuc()` → `idbPut(mucs, { loai: 'bai-viet', danhMuc, ten: 'Bài viết mới', … })`.
3. Mở `TrangBaiViet` → `taoHoacMoDoc(id, 'bai-viet')` → seed page+surface+note+paragraph.
4. Gõ nội dung. Autosave qua `IndexedDBDocSource` như bảng vẽ hiện nay.
5. Rời bài → `capNhatSauKhiRoiMuc(id, coThayDoiNoiDung, noiDungTimKiem)`.

**Mở lại một mục**
1. `LuoiMuc` → bấm thẻ → FLIP.
2. `index.tsx` chọn vỏ theo `muc.loai` → nạp chunk (chung) → `TrangBaiViet` hoặc `EdgelessBoard`.

**Xoá**: mềm như hiện nay (`daXoaLuc`), hoàn tác bằng cách xoá trường. Doc CRDT **không** bị xoá —
giữ nguyên hành vi hiện tại, đợi màn "thùng rác" sau này.

## 5. Vì sao không chọn phương án khác

**Một doc, hai chế độ (mô hình gốc của AFFiNE)** — chủ dự án loại. Bác sĩ bấm vào thứ ghi "bài viết"
phải ra bài viết, không phải một canvas có thể lật qua lại. Một khái niệm ít hơn quan trọng hơn một
tính năng nhiều hơn.

**Hai hệ song song (giữ `DanhSachBang` cho sơ đồ, viết `DanhSachBaiViet` mới)** — nhân đôi ~2.700
dòng logic lưới. Sửa một lỗi lọc/xoá mềm phải sửa hai nơi. Đúng cái bẫy đã ăn ở lượt 2026-08-31
([[feedback_scope-split-cross-cutting-changes]]).

**Tách nhỏ `DanhSachBang.tsx` trước rồi mới xây kho** — một lượt refactor thuần không đem lại gì
nhìn thấy được, mà rủi ro hồi quy nằm đúng chỗ mong manh nhất (FLIP + cuộc đua lúc đóng bảng).
Hoãn; nếu `LuoiMuc.tsx` phình quá thì tách ở chặng riêng có spec riêng.

**Tách chunk riêng cho page mode** — không làm được vì `customElements.define` toàn cục, xem §3.4.

**Di trú dữ liệu cũ** — chủ dự án xác nhận chưa có dữ liệu thật (quyết định 4). Viết code di trú cho
dữ liệu không tồn tại là chi phí thuần.

**Xoá tab Thư viện** — đã cân nhắc và loại. Nó là nửa còn lại của trục LOẠI; bỏ nó thì sơ đồ có nhà
tổng (tab Mindmap) còn bài viết thì không, và sau khi tạo bài xong người dùng không có chỗ nào trả
lời "bài tôi vừa viết đâu rồi". Đề xuất đổi nhãn thành "Bài viết" cũng bị loại — chủ dự án giữ tên
"Thư viện".

## 6. Rủi ro đã biết

### 6.1 KaTeX / khối Latex — bẫy đã ghi sẵn

`src/board/extensions.ts` có chú thích điều tra dài về hai lần thử bật `LatexViewExtension` và cả
hai đều phải gỡ: `affine/blocks/latex/src/configs/tooltips.ts:34` chạy `DOMPurify.sanitize()` và
`katex.renderToString()` **ngay ở cấp module**. Hệ quả đã đo: `TypeError: default.sanitize is not a
function` ở môi trường 'node', và — sau khi vá bằng stub — ba ca kiểm dùng SlashMenu timeout 5000ms
khi chạy TRỌN bộ (xanh khi chạy riêng).

Chủ dự án chọn "đủ bộ soạn thảo", nên chặng này **bật lại**. Kế hoạch:
1. Dựng lại `test.alias` cho `dompurify` trỏ sang stub (cách vá đã xác nhận RED→GREEN lần trước).
2. Nâng `testTimeout` cho nhóm file `src/board/__tests__/*` thay vì toàn cục.
3. Nếu sau hai bước trên vẫn chập chờn: **báo lại chủ dự án**, không âm thầm gỡ.

Toàn bộ điều tra cũ ở `HANDOFF.md` mục 23 — đọc trước khi bắt đầu, đừng điều tra lại từ đầu.

### 6.2 CSS page mode có thể rò qua lớp vendor

`src/board/lop-css-vendor.ts` bọc ~190 thẻ `<style>` của BlockSuite vào hai cascade layer
(`drt-vendor-tran` dưới base, `drt-vendor` trên base — xem
[[project_blocksuite-css-ro-ri-cascade-layer]]). Bật 18 extension mới là thêm thẻ `<style>` mới, và
page mode dùng `.affine-page-viewport` — một selector chưa từng xuất hiện trong app. Phải rà lại mọi
bản vá đối kháng trong `cau-noi-thuong-hieu.css` sau khi bật, ở CẢ bản sáng và bản tối.

### 6.3 `DocTitleViewExtension` là fragment, không tự mount

Ở AFFiNE thật, tiêu đề tài liệu do app chủ render, không phải `EditorHost`. Bật extension mới chỉ
đăng ký thẻ; `TrangBaiViet.tsx` phải tự đặt `<doc-title>` (tên sau đổi tên là `drt-doc-title`) vào
đúng chỗ và truyền `doc`. Kiểm bằng một ca `customElements.get(...)` + một ca mount thật, theo mẫu
`__tests__/dang-ky-custom-element.spec.ts`.

### 6.4 Lượt xoá lớn — dễ sót tham chiếu

Xoá 7 màn + 7 file + 6 kiểu trong một lượt. `tsc` bắt phần lớn, nhưng **không** bắt: chuỗi
`"article"`/`"ecg"` còn sót trong `initialScreen()` đọc `?screen=`, `public/manifest.json`
shortcuts, `public/sw.js` precache list, `NON_TAB_SCREENS`. Phải grep từng chuỗi một.

### 6.5 Đo dung lượng phải làm thật

Con số "~1.500–1.700 kB" ở §3.4 là **ước tính**, suy từ ghi chép cũ (58 ext = 1.703 kB gzip). Phải
chạy `npm run build` và ghi số đo thật vào chú thích `extensions.ts`, theo đúng mẫu các chặng trước.
Không được chép con số ước tính này thành kết luận.

## 7. Ngoài phạm vi

- **Đổi loại mục sau khi tạo** (bài viết ⇄ sơ đồ). Quyết định 1 chốt hai loại tách biệt.
- **Thùng rác** cho mục đã xoá mềm — vẫn để dành như hiện nay.
- **Thẻ ghi nhớ** (tab flashcard) và thẻ **"Công cụ"** — vẫn `ComingSoonScreen`.
- **Dùng thuốc** (`mixing` và toàn bộ cây thuốc/kháng sinh/bệnh) — không đụng.
- **Sao lưu đám mây / đồng bộ nhiều máy** — vẫn chỉ xuất/nhập file thủ công.
- **Tách nhỏ `LuoiMuc.tsx`** — chặng riêng nếu cần.
- **Xoá doc CRDT khi xoá mềm mục** — giữ hành vi hiện tại.

## 8. Tiêu chí xong

1. Tạo bài mới từ Trang chủ → chọn danh mục → gõ được chữ, đóng app, mở lại còn nguyên.
2. Gõ được chữ trên **điện thoại dọc** (<768 px) với thanh công cụ bàn phím ảo hiện ra; sơ đồ ở cùng
   bề ngang vẫn chỉ-đọc.
3. Sáu màn (Thư viện, Mindmap, 3 danh mục, Hướng dẫn) đều render `LuoiMuc` và lọc đúng.
4. Bài trong Hướng dẫn **không** xuất hiện ở Thư viện.
5. Hướng dẫn không cho tạo sơ đồ.
6. Tìm kiếm toàn app tìm được cả bài viết lẫn sơ đồ mới tạo.
7. Xuất file → xoá sạch dữ liệu → nhập lại → nội dung bài viết và sơ đồ giống hệt trước.
8. `npm test`, `npm run kiem:dist`, `npm run build` đều xanh. Không còn tham chiếu nào tới
   `Article`, `ContentBlock`, `EcgLesson`, `BlockEditor`, `drtrong-board`.
9. Số đo dung lượng chunk thật được ghi vào `extensions.ts`.
