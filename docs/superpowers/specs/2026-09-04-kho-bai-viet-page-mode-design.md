# Thiết kế: Kho nội dung hợp nhất — bài viết (page mode) + sơ đồ (edgeless)

Ngày: **2026-09-04**. Trạng thái: đã chốt thiết kế (brainstorm trong chat), chưa lập kế hoạch.
Sửa lượt 2 cùng ngày: **rà lại toàn bài để hạ rủi ro tối đa** theo yêu cầu chủ dự án — xem §0 và §4.
Track: **MindmapScreen mở rộng** — theo [[project_mindmap-charter]] đây là "phòng não phải" của app;
chặng này đưa nửa còn lại của BlockSuite (page mode) vào cùng một kho với nửa edgeless đã có.

Chặng này **thay thế** hệ bài viết tự viết tay (`Article`/`ContentBlock`/`BlockEditor`) bằng trình
soạn thảo AFFiNE ở chế độ trang. Đây là lượt xoá lớn nhất từ trước tới nay của dự án — nên nguyên
tắc bao trùm toàn spec là: **chứng minh trước, phá sau; phá được thì phải hoàn tác được.**

## 0. Nguyên tắc hạ rủi ro (đọc trước mọi mục khác)

Sáu luật dưới đây ràng buộc mọi giai đoạn ở §4. Vi phạm một luật là dừng, báo lại, không tự quyết.

1. **Chứng minh trước khi phá.** Giai đoạn 0 là một spike: page mode phải mount và gõ được chữ trên
   trình duyệt thật *trước khi* xoá một dòng nào của hệ cũ. Toàn bộ spec này đứng trên giả định
   "`viewManager.get('page')` chạy được với cây vendored" — giả định đó suy ra từ **đọc mã nguồn**
   (`RootViewExtension._setupPage()`), **chưa chạy thật lần nào**. Nếu spike hỏng, spec sai từ gốc và
   phải viết lại, chứ không phải vá.
2. **Phá huỷ đi sau cùng.** Mọi thao tác không hoàn tác được (`deleteObjectStore`,
   `deleteDatabase`, xoá file) dồn vào các giai đoạn cuối, mỗi thứ một commit riêng revert được độc
   lập.
3. **Đổi tên và đổi hành vi không đi chung một commit.** Commit đổi tên phải là *thuần* đổi tên:
   test cũ xanh mà **không sửa một dòng test nào**. Đó là bằng chứng duy nhất cho "chỉ đổi tên".
4. **Bóc mã ra file mới phải bóc nguyên văn trước.** Chữ ký giữ nguyên, logic giữ nguyên, test cũ
   xanh không sửa. Đổi chữ ký là commit sau.
5. **Bật extension theo nhóm, đo sau mỗi nhóm.** 18 cái một lượt thì hỏng cái nào cũng không biết.
6. **Có ngưỡng dừng cho dung lượng.** Vượt ngưỡng là dừng và báo, không âm thầm chấp nhận.

**Việc chủ dự án phải làm trước giai đoạn 9:** xuất một file sao lưu bằng cơ chế **hiện có** (màn
Đồng bộ dữ liệu). Bảo hiểm rẻ nhất có thể cho quyết định "bỏ toàn bộ dữ liệu cũ".

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
- **Page mode có đường chạy** với cây vendored mà không cần đụng vendor: `RootViewExtension._setupPage()`
  (`src/vendor/blocksuite/affine/blocks/root/src/view.ts:57`) đăng ký
  `BlockViewExtension('affine:page', literal\`affine-page-root\`)` + `PageClipboard` +
  `ViewportElementExtension('.affine-page-viewport')`. Chỉ cần gọi `viewManager.get('page')` thay
  vì `'edgeless'`. Không có gì phải vá ở `src/vendor/` (luật D11 giữ nguyên).
  **⚠️ Đây là kết luận từ ĐỌC MÃ, chưa chạy thật — xem §0 luật 1 và giai đoạn 0.**
- `Transformer.docToSnapshot()` / `.snapshotToDoc()` có sẵn
  (`src/vendor/blocksuite/framework/store/src/transformer/transformer.ts:100,192`) — đường xuất/nhập
  nội dung doc ra **JSON**, không phải tự chế định dạng CRDT nhị phân.

Hệ quả của việc để hai hệ song song: bác sĩ gặp hai thứ đều tên là "bài viết" nhưng soạn bằng hai
trình khác nhau, tìm kiếm ở hai chỗ khác nhau, xuất/nhập theo hai đường khác nhau. Không giải thích
được cho người dùng.

## 2. Quyết định của chủ dự án (chốt trong brainstorm 2026-09-04)

Ghi lại vì mọi mục dưới đây suy ra từ đây:

1. **Hai loại mục tách biệt.** "Bài viết" (page mode) và "Sơ đồ" (edgeless) là hai bản ghi khác
   nhau, **không** chuyển qua lại được. KHÔNG dùng mô hình "một doc, hai chế độ" của AFFiNE.
2. **Danh mục là trường dữ liệu chung** của một kho duy nhất.
3. **Xoá sạch hệ cũ**, ECG cũng chuyển sang page mode.
4. **Bỏ toàn bộ dữ liệu cũ** — cả store `articles`/`lessons` lẫn store `boards` + CSDL
   `drtrong-board`. Không viết code di trú.
5. **Giữ tab Mindmap** ở thanh nav. Thư viện = nơi tổng hợp bài viết; Mindmap = nơi tổng hợp sơ đồ.
   Thêm sơ đồ mới qua Mindmap; thêm bài viết mới ở Trang chủ.
6. **Hướng dẫn KHÔNG xuất hiện trong Thư viện** — nó đứng riêng ngoài cả hai trục. Nhãn tab **giữ
   nguyên là "Thư viện"** (đã cân nhắc đổi thành "Bài viết", chủ dự án chọn giữ).
7. **Hỏi danh mục ngay lúc tạo** bài mới. Không có trạng thái "chưa phân loại".
8. **Bài viết sửa được ở mọi bề ngang.** Luật chỉ-đọc-khung-hẹp CHỈ áp cho sơ đồ.
9. **Bật đủ bộ soạn thảo**, trừ phần đa người dùng.
   → **SỬA lượt 2 (2026-09-04):** chủ dự án yêu cầu hạ rủi ro tối đa, nên **khối Latex/KaTeX được
   hoãn** sang chặng riêng. Xem §3.4 và §6.1 — đây là mục đắt nhất và đã hỏng hai lần. 17 extension
   còn lại vẫn bật đủ.
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
chúng. Store `mucs` là store MỚI hoàn toàn (§3.2), không có bản ghi đời cũ nào, nên **bỏ hết các
nhánh `??` phòng vệ đó** — giữ lại là giữ một lời nói dối về hình dạng dữ liệu.

Hàm đổi tên theo: `bangKhopTimKiem` → `mucKhopTimKiem`, `taoIdBang` → `taoIdMuc`,
`capNhatSauKhiRoiBang` → `capNhatSauKhiRoiMuc`. `trichVanBanTuKhoi` / `trichVanBanTuCanvas` /
`ghepNoiDungTimKiem` giữ nguyên tên — chúng nói về cấu trúc BlockSuite, không về "bảng".

**Ràng buộc §0 luật 3:** toàn bộ phần đổi tên ở mục này là giai đoạn 1, một commit thuần đổi tên,
test cũ xanh không sửa. Thêm trường `loai`/`danhMuc` và bỏ nhánh `??` là giai đoạn 5.

### 3.2 Lưu trữ — `src/lib/idb.ts`

```
DB_VERSION 5 → 6

IDB_STORES = {
  mucs: "mucs",       // MỚI — metadata của cả hai loại
  // ecgLessons: "lessons",   ← xoá ở GIAI ĐOẠN 9, không sớm hơn
  // articles:   "articles",  ← xoá ở GIAI ĐOẠN 9
  // boards:     "boards",    ← xoá ở GIAI ĐOẠN 9
}
```

Nội dung doc: **một workspace BlockSuite duy nhất** cho cả hai loại, IndexedDB
`drtrong-noi-dung` (đổi từ `drtrong-board`). Một doc là một doc — khác nhau chỉ ở bộ extension lúc
render. Tách hai workspace nghĩa là hai `TestWorkspace`, hai `IndexedDBDocSource`, hai lượt
`waitForSynced()` — không đổi lại được gì.

#### 3.2.1 Ba việc phá huỷ, tách riêng, làm sau cùng

Đây là phần vá lượt 2 — bản đầu gộp chung vào §3.2 và **thiếu hẳn việc (b)**.

**(a) Tạo store `mucs`** — giai đoạn 5. `onupgradeneeded` chỉ `createObjectStore('mucs')`. **KHÔNG
xoá store nào ở bước này.** Ba store cũ vẫn nằm nguyên, code mới không đọc chúng. Nếu chặng hỏng
giữa chừng, dữ liệu cũ còn nguyên vẹn.

**(b) Xoá CSDL `drtrong-board` cũ** — giai đoạn 9. Đổi tên CSDL **không** xoá cái cũ: nếu chỉ đổi
tên, `drtrong-board` nằm lại trên máy người dùng vĩnh viễn, không ai đọc, chiếm chỗ — đúng loại rác
mà chặng này sinh ra để dọn. Phải gọi có chủ đích **một lần**:

```ts
// src/lib/donCsdlCu.ts — chạy một lần, ghim bằng cờ localStorage 'drtrong:da-don-csdl-bang-cu'
indexedDB.deleteDatabase('drtrong-board')
```

`deleteDatabase` **treo im lặng** (`onblocked`) nếu một tab khác còn giữ kết nối — đúng lớp lỗi mà
`openDb()` trong `idb.ts` đã phải xử lý bằng nhánh `onblocked`. Nên: bắt `onblocked`, bỏ qua lượt
này, để lần mở app sau thử lại (không set cờ). Không chặn khởi động app vì việc dọn rác.

**(c) `deleteObjectStore` ba store cũ** — giai đoạn 9, cùng commit với (b), `DB_VERSION 6 → 7`.
Tách khỏi (a) để lượt nâng version tạo `mucs` không mang theo thao tác xoá.

#### 3.2.2 Cổng `kiem-dist.mjs` — nguy cơ xanh giả

`scripts/kiem-dist.mjs` và các phép grep canh ranh giới nạp chậm D13 tìm chuỗi `drtrong-board` để
khẳng định nó **không** lọt vào chunk vỏ app. Đổi tên CSDL mà quên sửa cổng thì cổng **xanh giả** —
nó tìm một chuỗi không còn tồn tại và luôn báo đạt.

Chống: cổng phải kiểm **hai chiều**, không chỉ chiều vắng mặt.
1. Chuỗi `drtrong-noi-dung` **không có** trong chunk vỏ app (khẳng định cũ, đổi tên).
2. Chuỗi `drtrong-noi-dung` **có mặt** trong chunk soạn thảo (khẳng định MỚI). Thiếu vế này thì gõ
   sai tên hằng ở bất cứ đâu cũng làm cổng đạt.
3. Chuỗi `drtrong-board` **không còn ở bất kỳ đâu** trong `src/` lẫn `dist/`, trừ
   `src/lib/donCsdlCu.ts` (nơi duy nhất được phép nhắc tên cũ) và spec này.

**Xoá kèm** (giai đoạn 8): `src/board/diTruBangCu.ts` (173 dòng) + hai cờ localStorage
`drtrong:board-di-tru-da-chay`, `drtrong:board-di-tru-noi-dung-da-chay` + lời gọi di trú trong
`BoardGallery.tsx`. Chúng di trú bảng đời `docId` khoá cứng sang `BangMeta` — không còn đối tượng nào
để di trú sau quyết định 4.

### 3.3 Trình soạn thảo — bóc phần dùng chung

```
src/board/
  mo-doc.ts           MỚI  — taoHoacMoDoc(id, loai, tuyChon?): workspace, seed, hạn giờ, chống đua
  che-do-co-dinh.ts   ĐỔI  — từ che-do-edgeless.ts; CheDoCoDinh nhận tham số mode
  extensions.ts       SỬA  — +17 ext; tách layExtensionsTrang() / layExtensionsEdgeless()
  EdgelessBoard.tsx   SỬA  — còn lại phần riêng của edgeless
  TrangBaiViet.tsx    MỚI  — vỏ page mode
  index.tsx           SỬA  — vỏ nạp chậm + error boundary, dùng chung CẢ HAI loại
```

**`mo-doc.ts` bóc làm HAI commit** (§0 luật 4):

- *Giai đoạn 2* — `git mv` phần thân `taoHoacMoBang` + `moBangThat` + `doiCoHanGio` +
  `doiNoiDungToi` + hằng hạn giờ sang file mới, **giữ nguyên tên hàm và chữ ký**. `EdgelessBoard.tsx`
  import lại. Bằng chứng đây là phép bóc nguyên văn: `src/board/__tests__/edgeless-board*.spec.ts`
  xanh mà **không sửa một dòng nào**.
- *Giai đoạn 3* — đổi tên `taoHoacMoBang` → `taoHoacMoDoc`, thêm tham số `loai`.

Phần logic được giữ **nguyên vẹn**: hàng đợi `luotMoDangCho` chống hai lượt mở chồng nhau,
`doiCoHanGio`, `doiNoiDungToi`, nhánh rơi về workspace bộ nhớ khi hết giờ, cờ `khongLuuDuoc`, lượt
`waitForSynced()` thứ hai sau seed. Thay đổi hành vi DUY NHẤT là seed theo loại:

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
được giữ nguyên cho cả hai loại thay vì rẽ đôi.

**`affine:note` + `affine:paragraph` rỗng** để mở bài mới ra là có chỗ gõ ngay.
`page-root-block.ts:162` tự tạo note khi bấm vào vùng trống, nên đây là tiện nghi chứ không phải bắt
buộc — nhưng thiếu nó thì bài mới mở ra là một trang trắng không có con trỏ, đọc như lỗi.

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
ghi trong file gốc. **Ca kiểm hồi quy bắt buộc:** gán `cheDoEdgeless` cho một cây page mode phải
làm ca đỏ — nếu không, ca kiểm không chứng minh được gì ([[feedback_chung-minh-test-hoi-quy-do-khi-go-va]]).

**`TrangBaiViet.tsx`** là bản song sinh mỏng của `EdgelessBoard.tsx`, dùng chung `mo-doc.ts`,
`lop-css-vendor.ts`, theme watcher, `ban-phim-ios.ts`, và cơ chế đếm thay đổi nội dung
(`store.slots.blockUpdated`) để bump `capNhatLuc`. Khác ở:

- `layExtensionsTrang()` thay `layExtensionsEdgeless()`
- **KHÔNG** gọi `laKhungHep()` / `theoDoiKhungHep()` — bài viết luôn sửa được (quyết định 8)
- **KHÔNG** cần `dong-bo-toa-do-viewport.ts`, `viewport-ios.ts`, `xep-o-tu-dong.ts` (chuyện của canvas)
- `noiDungTimKiem` chỉ lấy từ `trichVanBanTuKhoi(store.root)` — trang không có
  `surface.elementModels` mang chữ

**`src/board/index.tsx`** (vỏ nạp chậm + error boundary) nhận thêm prop `loai` và chọn `lazy()` nào
để nạp. Giữ nguyên toàn bộ lý lẽ về error boundary đã ghi trong file: PWA cài ngoài màn hình chính,
chunk lớn chỉ có sau một lượt tải mạng thành công, `React.lazy` nhớ vĩnh viễn promise bị từ chối.
Hai loại **dùng chung một chunk** (§3.4), nên kho `Map<number, ComponentType>` chỉ cần thêm loại vào
khoá. **Ca kiểm:** mở bài viết khi chunk hỏng phải rơi vào error boundary của tab đó, không sập cả
app — cùng khẳng định đã có cho bảng vẽ.

### 3.4 Extension — `src/board/extensions.ts`

Bật thêm **17** (hiện **38**/58 → 55/58), **theo bốn nhóm, đo sau mỗi nhóm** (§0 luật 5).

> Đếm lại tay từ mảng `viewExtensions` thật: **38** mục, không phải 37 như dòng đầu file ghi — chú
> thích đó viết từ chặng D13 và không cập nhật khi các chặng sau bật thêm
> (`EdgelessTextViewExtension` 2026-08-31 là mục gần nhất). **Sửa luôn con số trong chú thích** khi
> đụng file.

**Nhóm 1 — page mode không có thì không dùng được** (bật cùng giai đoạn 3, ngay sau spike)

| Extension | Vì sao |
|---|---|
| `DocTitleViewExtension` | Tiêu đề bài viết — xem rủi ro §6.3 |
| `KeyboardToolbarViewExtension` | Thanh công cụ trên bàn phím ảo. **Quan trọng nhất cho PWA điện thoại** (quyết định 8) |
| `PageDraggingAreaViewExtension` | Bôi chọn nhiều khối trong trang |
| `ScrollAnchoringViewExtension` | Giữ vị trí cuộn khi nội dung phía trên đổi |
| `DividerViewExtension` | Đường kẻ ngang |

**Nhóm 2 — nội dung phong phú**

| Extension | Vì sao |
|---|---|
| `TableViewExtension` | Bảng — thiếu hẳn ở hệ cũ |
| `CalloutViewExtension` | Khối nhấn mạnh (cảnh báo lâm sàng) |
| `OutlineViewExtension` | Mục lục — thay `blocksToToc()` của hệ cũ |
| `DataViewViewExtension` | View bảng dữ liệu |

**Nhóm 3 — liên kết và nhúng**

| Extension | Vì sao |
|---|---|
| `LinkedDocViewExtension` | Gõ `@` liên kết sang bài khác — thay `LinkTarget` của hệ cũ |
| `BookmarkViewExtension` | Nhúng link dạng thẻ |
| `EmbedViewExtension` | Nhúng nội dung ngoài |
| `EmbedDocViewExtension` | Nhúng bài viết khác |
| `LinkViewExtension` (GfxLink) | Link trên canvas |

**Nhóm 4 — thêm cho edgeless** (không ảnh hưởng page mode; bật cuối, dễ bỏ nhất nếu đụng ngưỡng)

| Extension | Vì sao |
|---|---|
| `NoteSlicerViewExtension` | Cắt note trên canvas |
| `EdgelessAutoConnectViewExtension` | Tự nối phần tử trên canvas |
| `FramePanelViewExtension` | Panel khung cho edgeless |

**Giữ cắt 3:**

- `LatexViewExtension` (khối công thức) — **HOÃN sang chặng riêng.** Xem §6.1. Đây là sửa lượt 2 so
  với quyết định 9. `InlineLatexViewExtension` (công thức trong dòng) **đã bật từ trước** và không
  đụng tới — người dùng vẫn gõ được công thức inline.
- `RemoteSelectionViewExtension` — con trỏ/vùng chọn của người khác. App offline một người.
- `AdapterPanelViewExtension` — panel debug định dạng của playground thượng nguồn, không phải công
  cụ soạn thảo.

**Quy trình cho MỖI nhóm:**
1. Thêm import + mục vào mảng.
2. `npm test` trọn bộ — không chỉ file board. Đỏ chập chờn cũng tính là đỏ.
3. `npm run build`, ghi số gzip thật vào chú thích `extensions.ts`.
4. Mở một bài viết + một sơ đồ trên trình duyệt thật, bản **sáng và tối**, kiểm CSS không rò (§6.2).
5. Đạt cả bốn → commit nhóm đó. Hỏng → gỡ đúng nhóm đó ra, ghi lý do vào file, báo lại.

**Ngưỡng dừng dung lượng** (§0 luật 6): chunk soạn thảo hiện **993 kB gzip**. Nếu sau một nhóm vượt
**1.400 kB gzip** (+41%) thì **dừng, báo lại chủ dự án**, không tự bật tiếp. App này dùng cạnh
giường bệnh, nơi tải lần đầu có thể qua sóng 3G bệnh viện — đây là chi phí thật, không phải con số
trên bảng.

Con số "1.703 kB gzip cho đủ 58 ext" trong chú thích cũ là **của lần dựng 2026-08-12**, dùng để định
hướng chứ không được chép thành kết luận (§6.5).

**Một chunk cho cả hai chế độ.** `viewManager` là singleton cấp module và `.get()` chạy chuỗi
`setup() → effect() → effects()`, tức `customElements.define(...)`. Dựng manager thứ hai để tách
chunk là chạm đúng bẫy `NotSupportedError` đã ghi trong `EdgelessBoard.tsx`. Chấp nhận: mở một bài
viết vẫn tải cả phần edgeless.

`layExtensionsTrang()` = `[...viewManager.get('page'), cheDoTrang, phongChuBangExtension]`.
`layExtensionsEdgeless()` giữ nguyên chữ ký, đổi `cheDoEdgeless` sang bản mới.

### 3.5 Màn hình — `LuoiMuc` dùng chung

`DanhSachBang.tsx` (2.700 dòng) đổi tên thành `LuoiMuc.tsx`, **không tách file** (Hướng A). Giữ trọn
hành vi đã tôi luyện: FLIP mở/đóng thẻ, xoá mềm + hoàn tác, chọn nhiều, chip lọc, `mauHueChongTrung`,
ô đổi tên lúc tạo, các cuộc đua đã vá. Thêm props:

```ts
type PropsLuoiMuc = {
  tieuDe: string
  loai?: LoaiMuc                 // undefined = cả hai
  danhMuc?: IdDanhMuc            // undefined = mọi danh mục
  danhMucLoaiTru?: IdDanhMuc[]   // riêng Thư viện
  chuyenKhoa?: string            // undefined = mọi khoa
  loaiTaoDuoc: LoaiMuc[]         // [] = màn này không có nút tạo
}
```

**Chống hồi quy tab Mindmap:** cả năm prop lọc đều optional và mặc định "không lọc". Cần **một ca
kiểm ghim rằng `<LuoiMuc tieuDe="Mindmap" loai="so-do" loaiTaoDuoc={['so-do']} />` cho ra đúng danh
sách và đúng hành vi mà `DanhSachBang` cho ra hôm nay** — tab Mindmap là thứ chủ dự án dùng thật
hàng ngày, hồi quy ở đây đắt hơn mọi thứ khác trong chặng.

| Nơi | props | Ghi chú |
|---|---|---|
| Thẻ Trang chủ "Tiếp cận vấn đề" | `{ danhMuc: 'tiep-can', loaiTaoDuoc: ['bai-viet','so-do'] }` | hai loại trộn chung, phân biệt bằng icon trên thẻ |
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

Thanh nav giữ nguyên 5 tab, giữ nguyên nhãn: Trang chủ / Thư viện / Hướng dẫn / Mindmap / Thẻ ghi nhớ.

**Thẻ phân biệt loại bằng icon** — trang giấy (bài viết) ↔ sơ đồ nhánh (sơ đồ). Chủ dự án chọn "một
component chung, chỉ khác tiêu đề", tức KHÔNG tách hai khối riêng trong màn danh mục.

**"Tạo bài mới" ở Trang chủ**: bấm → bảng chọn danh mục (4 lựa chọn) → tạo `MucMeta` loại
`bai-viet` → mở thẳng `TrangBaiViet`. Không có trạng thái chưa-phân-loại (quyết định 7). Nút "+"
trong tab Mindmap giữ nguyên luồng hiện tại nhưng cũng hỏi danh mục — chỉ 3 lựa chọn (Hướng dẫn
không nhận sơ đồ).

**Xoá khỏi `src/App.tsx`** (giai đoạn 8): `ArticleScreen`, `CustomEntryScreen`, `AddEntryScreen`,
`SpecialtyScreen` (bản cũ), `EcgScreen`, `EcgDetailScreen`, `AddEcgScreen`, hằng `ENTRY_TYPES`,
`BI_DANH_KHOA`/`khoaChuan`, và các nhánh `Screen`: `article`, `customEntry`, `addEntry`, `addEcg`,
`ecg`, `ecgDetail`. `comingSoon` giữ lại — thẻ "Công cụ" và tab "Thẻ ghi nhớ" vẫn dùng.

**Xoá file** (giai đoạn 8): `src/data/articles.ts`, `src/data/ecg.ts`,
`src/components/BlockEditor.tsx`, `src/components/BlockContent.tsx`, `src/lib/blocks.ts`,
`src/lib/specialtyStats.ts`, `src/board/diTruBangCu.ts`, `src/lib/richText.ts`.

`richText.ts` xoá được: đã `grep` toàn `src/` — chỉ `BlockContent.tsx`, `BlockEditor.tsx`,
`data/types.ts`, `lib/blocks.ts` tiêu thụ nó, cả bốn đều bị xoá ở chặng này. (Kết quả trong
`src/vendor/blocksuite/` là mã thượng nguồn không liên quan, chỉ trùng chữ.)

`ARTICLE_CONTENT` chỉ được `src/App.tsx`, `src/data/articles.ts`, `src/data/types.ts` dùng — đi theo
`articles.ts`.

**Xoá kiểu** trong `src/data/types.ts`: `ContentBlock`, `BlockType`, `Article`, `ArticleSection`,
`ArticleContent`, `EcgLesson`.

### 3.6 Tìm kiếm · Đồng bộ · Đã đọc gần đây

**`SearchScreen`** — `SearchResult.kind` hiện là
`"article" | "customArticle" | "ecg" | "flashcard" | "board"` (`src/App.tsx:1344`); bốn trong năm
giá trị đó biến mất cùng hệ cũ. Sau chặng này còn **`'muc' | 'flashcard'`**: một nguồn duy nhất là
kho `mucs` (so khớp bằng `mucKhopTimKiem`) cộng thẻ ghi nhớ tự nhập. Nhánh điều hướng
`if (r.kind === …)` ở `src/App.tsx:1468-1471` rút còn hai. Dải chip suy từ kết quả giữ nguyên cơ chế.

*Lưu ý phạm vi:* màn tìm kiếm này **không** tìm thuốc/kháng sinh/bệnh — cây Dùng thuốc có đường tìm
riêng, chặng này không đụng.

**Đồng bộ dữ liệu** — bỏ khoá `articles` và `ecgLessons`, thêm:

```ts
mucs: {
  meta: MucMeta[]
  docs: DocSnapshot[]   // Transformer.docToSnapshot() cho từng mục
}
```

Ba ràng buộc an toàn cho nhập (phần này là vá lượt 2 — bản đầu chỉ nói "dựng lại doc"):

1. **Toàn-bộ-hoặc-không.** Xác thực **mọi** snapshot trước khi ghi **bất kỳ** cái nào. Nhập nửa
   chừng rồi hỏng để lại kho lai giữa hai trạng thái, tệ hơn không nhập.
2. **"Hoàn tác nhập file" phải phủ store `mucs` và cả doc CRDT.** Cơ chế `idbReplaceAll` +
   snapshot-trước-khi-nhập hiện có mới chỉ lo bản ghi JSON. Doc CRDT nằm ngoài — phải chụp lại
   `docToSnapshot()` của toàn kho trước khi nhập, hoặc nói thẳng ở UI rằng hoàn tác không phủ nội
   dung doc. **Không được để người dùng tưởng có đường lui mà thật ra không có.**
3. **Ca kiểm vòng tròn là cổng chặn phát hành**, không phải "nên có": xuất → xoá sạch → nhập →
   nội dung bài viết và sơ đồ giống hệt trước, kể cả ảnh.

`Transformer` cần middleware cho blob (ảnh) — dùng `assets` của chính transformer, chấp nhận file
xuất phình lên khi bài có ảnh. Ghi rõ giới hạn này ra màn Đồng bộ.

**`recentReads`** (`src/lib/recentReads.ts`) — `ReadEntry.screen` gom về một giá trị `'muc'`, `id` là
`MucMeta.id`. `RecentReadItem.tag` hiện tên danh mục. Bản ghi cũ trong localStorage trỏ tới
`article`/`ecg` phải bị **lọc bỏ khi đọc**, không hiện ra dưới dạng mục chết bấm vào không đi đâu.

## 4. Thứ tự thi công — mười giai đoạn

Mỗi giai đoạn là một commit (hoặc một cụm nhỏ), `tsc` + `npm test` xanh mới sang giai đoạn sau.
Thứ tự này **là** cơ chế hạ rủi ro, không phải gợi ý sắp xếp.

| # | Việc | Hoàn tác được? | Cổng qua |
|---|---|---|---|
| **0** | **Spike**: mount `viewManager.get('page')` + `cheDoTrang` trên nhánh riêng, gõ chữ được ở trình duyệt thật + điện thoại dọc. Không xoá gì. | vứt nhánh | Gõ được chữ, lưu được, mở lại còn |
| 1 | Đổi tên thuần: `boardMeta`→`mucMeta`, `DanhSachBang`→`LuoiMuc`, các hàm | `git revert` | Test cũ xanh, **không sửa test** |
| 2 | Bóc `mo-doc.ts` **nguyên văn**, giữ chữ ký | `git revert` | Test cũ xanh, **không sửa test** |
| 3 | `che-do-co-dinh.ts` + `layExtensionsTrang()` + `TrangBaiViet.tsx` + extension **nhóm 1** | `git revert` | Ca đỏ khi gán sai mode; đo bundle |
| 4 | Extension **nhóm 2, 3, 4** — mỗi nhóm một commit, đo sau mỗi nhóm | `git revert` | Ngưỡng 1.400 kB; CSS sáng+tối |
| 5 | `MucMeta` + `createObjectStore('mucs')` (DB v6). **Không xoá store nào** | `git revert` | Tạo/đọc/ghi mục mới chạy |
| 6 | `LuoiMuc` nhận props lọc + 6 màn + luồng tạo | `git revert` | Ca ghim tab Mindmap không đổi hành vi |
| 7 | Tìm kiếm + Đã đọc + Đồng bộ (xuất/nhập/hoàn tác) | `git revert` | Ca vòng tròn xuất→nhập |
| 8 | Gỡ hệ cũ: 7 màn, 8 file, 6 kiểu, `diTruBangCu.ts` | `git revert` | Checklist chuỗi §6.4 |
| **9** | **PHÁ HUỶ**: `deleteObjectStore` ×3 (DB v7) + `deleteDatabase('drtrong-board')` | **KHÔNG** | Chủ dự án đã xuất file sao lưu |

Giai đoạn 9 tách riêng và đi cuối cùng chính là điểm mấu chốt: từ giai đoạn 0 đến 8, **mọi thứ đều
lùi lại được** và dữ liệu cũ vẫn nằm nguyên trong máy.

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

**Tách chunk riêng cho page mode** — không làm được vì `customElements.define` toàn cục, §3.4.

**Di trú dữ liệu cũ** — chủ dự án xác nhận chưa có dữ liệu thật (quyết định 4). Viết code di trú cho
dữ liệu không tồn tại là chi phí thuần. Bù lại bằng: xuất file sao lưu thủ công trước giai đoạn 9.

**Xoá tab Thư viện** — đã cân nhắc và loại. Nó là nửa còn lại của trục LOẠI; bỏ nó thì sơ đồ có nhà
tổng (tab Mindmap) còn bài viết thì không, và sau khi tạo bài xong người dùng không có chỗ nào trả
lời "bài tôi vừa viết đâu rồi". Đề xuất đổi nhãn thành "Bài viết" cũng bị loại — chủ dự án giữ tên.

**Làm tất cả trong một lượt lớn** — loại ở lượt vá 2. Xem §4.

## 6. Rủi ro đã biết

### 6.1 KaTeX / khối Latex — HOÃN

`src/board/extensions.ts` có chú thích điều tra dài về **hai lần** thử bật `LatexViewExtension`, cả
hai đều phải gỡ. Gốc: `affine/blocks/latex/src/configs/tooltips.ts:34` chạy `DOMPurify.sanitize()`
và `katex.renderToString()` **ngay ở cấp module** — nên chi phí rơi lên *mọi* file test board, không
riêng Latex. Triệu chứng đo được: `TypeError: default.sanitize is not a function` ở môi trường
'node'; và sau khi vá bằng stub, ba ca dùng SlashMenu timeout 5000ms khi chạy **trọn bộ** nhưng xanh
khi chạy **riêng** — dạng đỏ chập chờn dễ quy sai nguyên nhân nhất.

**Quyết định lượt 2: hoãn sang chặng riêng.** Lý do: cách vá duy nhất đang có (nâng `testTimeout`)
là che triệu chứng chứ không sửa gốc, và nới biên độ timeout làm mờ chính tín hiệu "test chậm bất
thường" cho mọi chặng sau. Đổi một khối công thức lấy một cổng test kém tin cậy là tỉ lệ xấu.

Giảm nhẹ: `InlineLatexViewExtension` (công thức **trong dòng**) đã bật từ trước và không bị đụng —
người dùng vẫn gõ được công thức, chỉ không có khối công thức đứng riêng.

Chặng riêng sau này cần: đọc `HANDOFF.md` mục 23 trước (đừng điều tra lại từ đầu), và tìm cách để
`tooltips.ts` không render KaTeX đồng bộ lúc import — đó mới là gốc.

### 6.2 CSS page mode có thể rò qua lớp vendor

`src/board/lop-css-vendor.ts` bọc ~190 thẻ `<style>` của BlockSuite vào hai cascade layer
(`drt-vendor-tran` dưới base, `drt-vendor` trên base — xem
[[project_blocksuite-css-ro-ri-cascade-layer]]). Bật 17 extension mới là thêm thẻ `<style>` mới, và
page mode dùng `.affine-page-viewport` — selector chưa từng xuất hiện trong app.

Chống: bước 4 của quy trình mỗi nhóm ở §3.4 — rà bản **sáng và tối** sau **từng nhóm**, không phải
một lần ở cuối. Rò CSS sau 17 extension gộp thì không biết cái nào gây ra.

### 6.3 `DocTitleViewExtension` là fragment, không tự mount

Ở AFFiNE thật, tiêu đề tài liệu do app chủ render, không phải `EditorHost`. Bật extension chỉ đăng
ký thẻ; `TrangBaiViet.tsx` phải tự đặt `<doc-title>` (sau đổi tên là `drt-doc-title`) vào đúng chỗ
và truyền `doc`. Kiểm bằng một ca `customElements.get(...)` + một ca mount thật, theo mẫu
`__tests__/dang-ky-custom-element.spec.ts`.

**Đây là câu hỏi của giai đoạn 0**, không phải phát hiện muộn: spike phải trả lời được "tiêu đề gõ
được chưa" trước khi cam kết cả chặng.

### 6.4 Lượt xoá lớn — checklist chuỗi bắt buộc

`tsc` bắt phần lớn nhưng **mù với chuỗi**. Giai đoạn 8 phải grep từng mục, đánh dấu từng dòng:

- [ ] `src/App.tsx` `initialScreen()` — `?screen=` chỉ nhận tab thật còn tồn tại
- [ ] `public/manifest.json` — mảng `shortcuts`, mọi `url` có `?screen=`
- [ ] `public/sw.js` — danh sách precache
- [ ] `NON_TAB_SCREENS` trong `src/App.tsx`
- [ ] `NAV_ITEMS` — 5 tab, nhãn giữ nguyên
- [ ] `CUSTOM_COLLECTION_KEYS` (`src/lib/storage.ts`) — khoá `articles`
- [ ] `recentReads` — bản ghi cũ trỏ `article`/`ecg` phải bị lọc khi đọc (§3.6)
- [ ] `grep -rn "drtrong-board" src/ scripts/` — chỉ còn `donCsdlCu.ts`
- [ ] `grep -rn "Article\|ContentBlock\|EcgLesson\|BlockEditor" src/ --include=*.ts --include=*.tsx`
      — trừ `src/vendor/`

Lọt một chuỗi thì PWA đã cài mở lối tắt ra màn trắng, đúng lúc offline không có thanh địa chỉ để
thoát — chính lớp lỗi mà error boundary trong `board/index.tsx` sinh ra để chặn.

### 6.5 Đo dung lượng phải làm thật

Mọi con số dung lượng trong spec này là **ước tính hoặc lịch sử**. Phải chạy `npm run build` sau mỗi
nhóm extension và ghi số đo thật vào chú thích `extensions.ts`, theo mẫu các chặng trước. Không được
chép ước tính thành kết luận ([[feedback_screenshot-legend-vs-results]]).

### 6.6 Nhiều phiên cùng working tree

Working tree tại thời điểm viết spec đang có thay đổi chưa commit của phiên khác (`src/App.tsx`,
`src/lib/theme.ts`, `src/lib/__tests__/duong-dan-tai-lai-chu-de.spec.ts`). Chặng này chạm `App.tsx`
rất nặng. Trước mỗi giai đoạn: `git status` **toàn bộ**, stage đúng file của mình
([[feedback_check-full-status-before-commit]], [[project_concurrent_sessions_shared_worktree]]).

Cân nhắc dùng worktree riêng cho chặng này.

### 6.7 Dev server thừa làm test đỏ giả

Chặng này chạy `npm test` rất nhiều lần. Trước khi kết luận một lượt đỏ là hồi quy thật, kiểm tiến
trình `vite`/`node` thừa còn sống ([[feedback_stray-dev-server-vitest-timeout]]).

## 7. Ngoài phạm vi

- **Khối công thức Latex** — hoãn sang chặng riêng (§6.1). Công thức trong dòng vẫn dùng được.
- **Đổi loại mục sau khi tạo** (bài viết ⇄ sơ đồ). Quyết định 1 chốt hai loại tách biệt.
- **Thùng rác** cho mục đã xoá mềm — vẫn để dành như hiện nay.
- **Thẻ ghi nhớ** (tab flashcard) và thẻ **"Công cụ"** — vẫn `ComingSoonScreen`.
- **Dùng thuốc** (`mixing` và toàn bộ cây thuốc/kháng sinh/bệnh) — không đụng.
- **Sao lưu đám mây / đồng bộ nhiều máy** — vẫn chỉ xuất/nhập file thủ công.
- **Tách nhỏ `LuoiMuc.tsx`** — chặng riêng nếu cần.
- **Xoá doc CRDT khi xoá mềm mục** — giữ hành vi hiện tại.

## 8. Tiêu chí xong

1. **Giai đoạn 0 đạt trước mọi thứ khác**: page mode mount, gõ được chữ, lưu được, mở lại còn
   nguyên — trên trình duyệt thật, cả bề ngang điện thoại dọc.
2. Tạo bài mới từ Trang chủ → chọn danh mục → gõ được chữ, đóng app, mở lại còn nguyên.
3. Gõ được chữ trên **điện thoại dọc** (<768 px) với thanh công cụ bàn phím ảo hiện ra; sơ đồ ở cùng
   bề ngang vẫn chỉ-đọc.
4. Sáu màn (Thư viện, Mindmap, 3 danh mục, Hướng dẫn) đều render `LuoiMuc` và lọc đúng.
5. **Tab Mindmap hành vi không đổi** so với trước chặng — có ca kiểm ghim.
6. Bài trong Hướng dẫn **không** xuất hiện ở Thư viện.
7. Hướng dẫn không cho tạo sơ đồ.
8. Tìm kiếm toàn app tìm được cả bài viết lẫn sơ đồ mới tạo.
9. Xuất file → xoá sạch dữ liệu → nhập lại → nội dung bài viết và sơ đồ giống hệt trước, **kể cả
   ảnh**. Nhập hỏng giữa chừng không để lại kho lai.
10. Gán sai `DocMode` cho một cây page mode làm ca kiểm **đỏ**.
11. Chunk soạn thảo **≤ 1.400 kB gzip**, số đo thật ghi trong `extensions.ts`.
12. `npm test`, `npm run kiem:dist`, `npm run build` xanh. Cổng `kiem-dist` kiểm **hai chiều**
    (§3.2.2). Checklist chuỗi §6.4 tick đủ.
13. CSDL `drtrong-board` đã bị xoá khỏi máy; ba store cũ đã `deleteObjectStore`; không còn tham
    chiếu nào tới `Article`, `ContentBlock`, `EcgLesson`, `BlockEditor`.
