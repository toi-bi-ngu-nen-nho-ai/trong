# Thiết kế: BlockKit — cổng Edgeless Canvas của AFFiNE sang Bs Trọng

**Ngày:** 2026-08-11
**Nhánh:** `worktree-blockkit-edgeless`
**Phạm vi tài liệu này:** P0 (hạt nhân) + P1 (Edgeless / MindMapScreen)
**Ngoài phạm vi, có spec riêng:** P1.5 (hoàn thiện canvas), P2 (Docs)

---

## 1. Mục tiêu

Dựng lại `MindMapScreen` của Bs Trọng thành một Edgeless Canvas theo đúng kiến trúc
BlockSuite/AFFiNE, viết bằng React 19, chạy hoàn toàn trên máy, không backend.

Nguồn tham chiếu: `C:\Users\LENOVO\Downloads\AFFiNE\blocksuite`. Mọi đường dẫn dạng
`blocksuite/...` trong tài liệu này trỏ vào cây đó.

### Nguyên tắc phân xử

**AFFiNE là mặc định cho tất cả** — cấu trúc dữ liệu, hành vi, bố cục, tương tác, hình dáng
thanh công cụ. Bs Trọng chỉ áp lên **token màu/phông** (xem `DESIGN.md`) và **tiếng Việt**.
Hễ quy ước cũ của app đụng AFFiNE thì quy ước cũ nhường.

Hệ quả: **không giữ lại tương thích ngược.** Không đọc dữ liệu mindmap cũ, không giữ hình dạng
dữ liệu cũ, không nuôi hai đường mã song song.

---

## 2. Điểm xuất phát

### Bs Trọng hiện tại

- React 19 + Vite 8 + Tailwind v4. Đúng 2 dependency chạy thật: `react`, `react-dom`.
- Không backend, không tài khoản. localStorage cho phần lớn dữ liệu, IndexedDB cho thứ có ảnh.
- `src/App.tsx` ~11.400 dòng chứa gần hết UI.
- Commit `fd24576` đã **xoá sạch** toàn bộ Mindmap cũ (14.661 dòng, gồm `MindmapBoard.tsx`
  8.949 dòng). Hiện `screen === "mindmap"` trả về `ComingSoonScreen`.
- Không có test suite. `package.json` không có script `test`.

### BlockSuite

~60 package workspace trên nền Lit 3 + Yjs + rxjs + `@preact/signals-core` + zod + lodash-es.
Trong AFFiNE, Page và Edgeless là **hai chế độ xem của cùng một Doc**.

---

## 3. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D0 | Khi có mâu thuẫn: **giống AFFiNE nhất** thắng, rồi mới tới khuyến nghị của người thực hiện, rồi mới tới cái còn lại | Chủ dự án chốt 2026-08-11. Áp dụng cho mọi quyết định chưa được nêu tên trong bảng này |
| D1 | ~~Không nhúng BlockSuite vì kéo theo Lit~~ → **thay bằng D10** | Giả định sai. Đo lại 2026-08-11: `@blocksuite/store` có **0** file dùng Lit; `@blocksuite/global` có 2, nằm gọn trong `global/src/lit/`; `std/gfx` có **1/44**. Lit chỉ sống ở tầng khung nhìn |
| D10 | ~~Cài `@blocksuite/store` + `global` từ npm~~ → **thay bằng D11** | Gãy khi thi hành: npm mới có tới **0.22.4**, còn bản mọi thứ trong spec đọc theo là **0.27.0** ở workspace AFFiNE, **chưa publish**. Đo 0.22.4: có `GfxGroupLikeElementModel` (D7 an toàn) nhưng **không có** `viewportRuntimeConfig`/`getEffectiveDpr`/`SKIP_REFRESH_DURING_GESTURE` — đúng phần giữ WKWebView khỏi sập, và là rủi ro số một ở §12 |
| D11 | **Vendor** `framework/global/src` + `framework/store/src` (0.27.0, từ máy) vào `src/vendor/blocksuite/` như mã bên thứ ba · **port** `std/gfx` · **viết** tầng khung nhìn React | Lý do chính của "cài thay vì chép" là cập nhật theo thượng ngu���n — lý do đó sụp khi bản cần dùng không có trên npm. Vendor thì khớp 100% với mọi thứ spec đã viết và giữ được phần viewport cho iPhone. Chép **nguyên văn, không sửa**, để so lại với thượng nguồn về sau còn dễ |
| D2 | Mindmap và Bài viết là **hai thực thể riêng**, nối bằng liên kết | Giữ nguyên `Article`, Thư viện, xuất/nhập JSON đang chạy |
| D3 | **Xoá sạch frontend cũ**, không khôi phục file nào từ `fd24576` | Chọn AFFiNE thay vì di sản |
| D4 | **Giữ tầng lưu trữ** `src/lib/idb.ts` làm nền, nâng schema | Đã gia cố tốt; là nơi backend cắm vào sau |
| D5 | **Yjs là nguồn sự thật** cho cả cây block lẫn phần tử surface | Hoàn tác/làm lại và đồng bộ về sau có sẵn |
| D6 | Docs đi theo **cây block đầy đủ** + slash menu + drag handle | Thuộc P2, nhưng định hình lược đồ từ P1 |
| D7 | **Giữ nguyên lồng nhau** (group/frame/layer đầy đủ) | `MindmapElementModel extends GfxGroupLikeElementModel` — cùng lớp cơ sở với `GroupElementModel`. Bỏ lồng nhau là bỏ nền của mindmap. |
| D8 | Chỉ cắt **tính năng**, không cắt **kiến trúc** | Mã gốc đã sạch |
| D9 | Kiểm thử = **port test gốc**, không chứng minh lại thuật toán | Xem §10 |

---

## 4. Kiến trúc

Bốn tầng, phụ thuộc chỉ đi xuống. Cột bên phải cho biết mã ở tầng đó **từ đâu ra** (D10):

```
src/screens/       MindMapScreen · BoardGallery       VIẾT     React, tiếng Việt, da Bs Trọng
src/editor/        EdgelessHost · ToolBar · Widgets   VIẾT     React: sự kiện, chọn, thanh công cụ
src/core/gfx/      Viewport · Grid · Layer · Tool     PORT     từ std/src/gfx (44 file)
src/vendor/        blocksuite/global · store          VENDOR   chép nguyên văn 0.27.0, KHÔNG sửa
                   blocksuite/                        (Yjs)    cây block, hình học, lược đồ
```

Ba tầng, ba cách đối xử khác nhau, và ranh giới không tuỳ tiện:

- **VENDOR** — sạch Lit hoàn toàn, không cần đổi gì để chạy trong React. Chép nguyên văn vào
  `src/vendor/blocksuite/`, **cấm sửa**: mọi sửa đổi phải nằm ở tầng trên, để sau này so lại với
  thượng nguồn (hoặc thay bằng gói npm khi 0.27.0 được publish) còn dễ.
- **PORT** — `std/gfx` có `viewport-element.ts` bọc custom element, và
  `GfxController extends LifeCycleWatcher` gắn vào `BlockStdScope` của `EditorHost`. Đó là chỗ
  React phải thay, nên port chứ không vendor.
- **VIẾT** — tầng khung nhìn, không có bản gốc để mà chép.

### Ràng buộc cứng: `src/core/` không import React

Cùng một công thức hình học phải chạy ở ba nơi: React render lần đầu, cập nhật DOM trực tiếp
khi ngón tay đang kéo, và vẽ lại bằng canvas khi xuất PNG. Ba nơi lệch công thức là lỗi rất dễ
xảy ra (đường nối "nhảy" một nhịp khi thả tay) — bản mindmap cũ đã ghi đúng bài học này trong
`mindmapGeometry.ts`. Ta nâng nó thành ranh giới thư mục, kiểm được bằng lint.

### Thành phần `core/`

| Thành phần | Việc | Tham chiếu |
|---|---|---|
| `Store` | Y.Doc: cây block + `Y.Map` phần tử surface | `blocksuite/affine/blocks/surface/src/surface-model.ts` |
| `Viewport` | Đổi toạ độ màn hình ↔ mô hình, zoom/pan, fit-to-screen | `blocksuite/framework/std/src/gfx/viewport.ts` |
| `Grid` | Chỉ mục không gian, hit-test, truy vấn theo khung nhìn | `blocksuite/framework/std/src/gfx/grid.ts` |
| `Layer` | Thứ tự chồng lớp, cắt đoạn canvas/block | `blocksuite/framework/std/src/gfx/layer.ts` |
| `ToolController` | Máy trạng thái công cụ + cơ chế hook | `blocksuite/framework/std/src/gfx/tool/` |

---

## 5. Mô hình dữ liệu

### Một `Y.Doc` cho mỗi bảng

Không dùng một doc chung. Mở bảng thì nạp doc đó, đóng thì giải phóng. Mở một bảng không
phải giải mã cả kho.

### Hai hạng công dân

| | Là gì | Ai vẽ | Ví dụ |
|---|---|---|---|
| **Block** | Chứa nội dung phong phú, cần DOM thật | React | `note`, `image`, `frame` |
| **Element** | Hình học thuần, vẽ hàng loạt | Canvas | `shape`, `connector`, `brush`, `text`, `mindmap`, `group` |

Ranh giới không tuỳ tiện: Note phải có ô to-do bấm được và liên kết chạm được nên phải là DOM;
nét bút có hàng nghìn cái một buổi nên phải là canvas.

### Mã hoá xuống Yjs

Sao chép nguyên quy ước BlockSuite (`framework/store/src/model/block/types.ts`,
`framework/store/src/model/store/crud.ts`):

```
doc.getMap('blocks')   : Y.Map<blockId, YBlock>
  YBlock               : Y.Map {
                           'sys:id', 'sys:flavour', 'sys:version',
                           'sys:children': Y.Array<blockId>,
                           'prop:xywh', 'prop:index', 'prop:text': Y.Text, ...
                         }

surface block 'prop:elements' : Y.Map<elementId, Y.Map<propName, value>>
```

Tiền tố `sys:` / `prop:` giữ nguyên: cho phép thêm thuộc tính mới mà không đụng vùng hệ thống,
và giữ khả năng đọc bằng adapter của AFFiNE nếu sau này cần nhập/xuất qua lại.

### Phần tử mindmap

Theo `blocksuite/affine/model/src/elements/mindmap/mindmap.ts:31`:

```
mindmap element = {
  children: Y.Map<nodeId, { index: string, parent?: string, collapsed?: boolean }>,
  layoutType: RIGHT | LEFT | BALANCE,
  style: 1..4
}
```

Ba hệ quả:

1. Cây **chỉ lưu quan hệ cha–con và thứ tự anh em**. Thân mỗi nút là một phần tử `shape` riêng.
2. **Đường nối không được lưu.** Dựng bằng model cục bộ, tính lại từ bố cục mỗi lần vẽ. Kéo
   nhánh đi đâu đường cũng đúng — chỗ mà `MindEdge` bản cũ luôn lệch một nhịp.
3. `index` là **chỉ số phân số**, chèn vào giữa chỉ ghi một trường thay vì đánh số lại cả mảng.

### Thứ tự z

Cũng là chỉ số phân số (`generateKeyBetween`), dùng chung cơ chế với thứ tự anh em.

---

## 6. Viewport và renderer

### Viewport không phải state React

`centerX`, `centerY`, `zoom`, cộng `toModelCoord()` / `toViewCoord()` — là object thường.
Ngón tay kéo ở 120 Hz mà mỗi mẫu gọi `setState` thì React vẽ lại 120 lần/giây (chính là cú
khựng đã phải sửa ở commit `5c23809`). Luồng đúng:

```
pointer event → ghi vào Viewport → một requestAnimationFrame
              → canvas vẽ lại + lớp DOM đổi một transform
```

React chỉ render lại khi **tập block đang nhìn thấy** đổi, không phải khi toạ độ đổi.

Hằng số lấy nguyên: `ZOOM_MIN 0.1`, `ZOOM_MAX 6.0`, `ZOOM_STEP 0.25`,
`FIT_TO_SCREEN_PADDING 100`, `smoothZoom` cho nút zoom có quán tính.

### Chỉ vẽ thứ đang nhìn thấy

`Grid` chia ô không gian; mỗi khung hình hỏi "phần tử nào cắt `viewportBounds`" rồi chỉ vẽ
chừng đó (`canvas-renderer.ts:550`). Bảng 5.000 nét mà đang zoom vào một góc thì mỗi khung chỉ
đụng vài chục nét.

### Canvas xếp chồng

Vấn đề: một `<canvas>` duy nhất thì nét bút hoặc luôn dưới mọi Note, hoặc luôn trên — không tô
sáng lên một thẻ rồi lại vẽ nét khác nằm dưới nó được.

Cách AFFiNE giải (`layer.ts:210`): sắp mọi thứ theo chỉ số phân số, cắt thành các **đoạn liên
tiếp cùng loại**, mỗi đoạn canvas được cấp **một thẻ `<canvas>` riêng**, xen kẽ với Note DOM
trong cùng thứ tự chồng lớp.

```
z ↑   [canvas #2]  nét bút vẽ đè lên thẻ
      [DOM]        Note "Sốc nhiễm khuẩn"
      [canvas #1]  hình nền, đường nối, nét bút cũ
```

### Sống sót trên iPhone

Lấy từ `viewportRuntimeConfig` ngay từ đầu, không đợi gặp sự cố:

- `getEffectiveDpr(zoom)` — hạ trần tỉ lệ điểm ảnh của canvas khi zoom xa. Trên iOS, giữ backing
  store retina đầy đủ ở mức zoom xa là phí bộ nhớ, và chính chỗ phí đó đẩy WKWebView quá ngân
  sách hợp thành rồi sập tiến trình nội dung web lúc pan/zoom.
- `SKIP_REFRESH_DURING_GESTURE` — trong lúc pinch-zoom không đụng DOM, chỉ transform.
- `POST_GESTURE_REFRESH_DELAY = 800` — vẽ lại canvas và kích hoạt lại block cùng một nhịp sau cử
  chỉ, tránh cảnh "thẻ hiện trước, đường nối lết theo sau".

### Ước lượng

`Viewport` ~250 dòng · `Grid` ~150 · `Layer` ~650 (giữ lồng nhau đầy đủ) · renderer ~400.

**Chỉ là bốn thành phần của `core/`.** Không tính `blocks/root`, thanh công cụ, hay các mảnh
`affine/components` — xem §13 để có bức tranh đủ.

---

## 7. ToolController và công cụ

### Cơ chế

Một công cụ hoạt động tại một thời điểm. Mỗi công cụ là object có vòng đời `activate` /
`deactivate` / `dragStart` / `dragMove` / `dragEnd` / `click`.

Thêm cơ chế **hook** (`framework/std/src/gfx/tool/tool.ts:19`): một công cụ đăng ký chặn sự kiện
*trước* công cụ đang hoạt động. Đó là cách AFFiNE làm "giữ Space để tạm kéo bảng" mà không công
cụ nào phải biết về Space. Ta dùng đúng cơ chế đó cho cử chỉ cảm ứng.

### Cử chỉ cảm ứng — chỗ buộc phải khác AFFiNE

Edgeless của AFFiNE thiết kế cho chuột; Bs Trọng chạy trên iPhone là chính.

| Đầu vào | Hành vi |
|---|---|
| **Hai ngón** | Luôn kéo bảng + pinch-zoom, **bất kể** đang chọn công cụ gì |
| **Một ngón** | Thi hành công cụ đang chọn |
| **Apple Pencil** (`pointerType === 'pen'`) | Luôn vẽ, kể cả khi đang ở công cụ chọn |

Quy tắc thứ ba khiến người dùng không bao giờ phải nghĩ về chế độ: cầm bút thì viết, dùng tay
thì thao tác.

### Mindmap tự xếp

Thuật toán `blocksuite/affine/gfx/mindmap/src/view/layout.ts` (201 dòng), hai lượt:

1. `calculateNodeSize` đệ quy dưới lên, gộp chiều cao con cộng `NODE_VERTICAL_SPACING = 45`
2. Đặt vị trí trên xuống với `NODE_HORIZONTAL_SPACING = 110`
   (`NODE_FIRST_LEVEL_HORIZONTAL_SPACING = 200` cho tầng một)

Ba bố cục `RIGHT` / `LEFT` / `BALANCE`, bốn phong cách màu (`mindmap/style.ts`, 518 dòng).

Ba chi tiết lấy nguyên:

- **Tab thêm nhánh con, Enter thêm nhánh ngang** — gõ liên tục không rời tay khỏi bàn phím.
- **`responseArea`** — kéo nút khác vào vùng lớn thì thành anh em, vào dải nhỏ ngay sau nút thì
  thành con. Sắp lại cây bằng một cú kéo, không menu.
- **Đường nối dẫn xuất**, không lưu (xem §5).

---

## 8. Phạm vi

### P0 — Hạt nhân

`Store` trên Yjs · `Schema` đăng ký kiểu block · `Viewport` · `Grid` · `Layer` ·
`ToolController` · hoàn tác qua `Y.UndoManager`.

### P1 — Canvas dùng được để nghĩ

```
P1.0  Viewport · Grid · Layer · renderer · công cụ chọn · pan · snap · quét chọn
      + BoardGallery: tạo/đổi tên/gắn màu/gắn chuyên khoa/xoá mềm bảng
P1.1  ★ Mindmap: element, layout, 4 phong cách, Tab/Enter, kéo đổi nhánh
P1.2  Shape · Connector (+ kéo đầu mút) · Text
P1.3  Note (paragraph · list · inline-latex · inline-footnote)
      + thanh công cụ trên bàn phím ảo
P1.4  Brush · Eraser · Ảnh · sao chép-dán · phím tắt
      + xuất PNG · sao chép bảng dạng outline văn bản
xuyên suốt:  khung chọn + tay nắm resize/xoay
```

Ba điểm làm rõ trong bảng trên:

- **`BoardGallery`** là màn danh sách bảng, thay `boards.ts` cũ. Nằm ở P1.0 vì P1.1 trở đi cần
  một bảng để mở. Xoá mềm vào thùng rác (xem §9).
- **Latex tách đôi:** `inline-latex` (công thức trong dòng chữ của Note) vào **P1.3** vì Note cần
  ngay; `block-latex` (khối công thức đứng riêng) vào **P2** cùng phần còn lại của cây block.
  `inline-footnote` đi cùng `inline-latex` — cả hai thuộc tầng rich-text dùng chung.
- **Xuất PNG** ở P1.4, sau khi đã có đủ loại phần tử để mà xuất. Vẽ lại bằng canvas 2d từ mô
  hình, không chụp DOM: bảng là canvas vô hạn nên chụp màn hình sẽ mất gần hết nội dung.
  Đây là lý do §4 bắt `core/` không được import React. Đi cùng nó là **sao chép dạng outline**
  (§8.1) — cùng bản chất "lấy nội dung ra khỏi bảng".

Widget và module kéo vào P1:

| Nguồn | Được gì |
|---|---|
| `widget-keyboard-toolbar` | Thanh công cụ nổi trên bàn phím ảo — widget mobile-first của AFFiNE |
| `gfx-pointer` (snap, pan, quick-tool) | Đường gióng canh chỉnh, kéo bảng. `adaptive-load-controller` (giới hạn số phần tử tham gia tính snap khi bảng đông) tách xuống P1.5 — snap chạy đúng mà không có nó, chỉ chậm dần khi bảng rất đông |
| `widget-edgeless-selected-rect` | Khung chọn, tay nắm resize + xoay |
| `widget-edgeless-dragging-area` | Quét chọn nhiều |
| `connector/element-transform` | Kéo đầu mút đường nối đổi điểm neo |
| `interactivity/resize/manager` | Resize nhiều phần tử cùng lúc |
| `gfx/keyboard` + `surface/extensions/clipboard-config` | Sao chép/dán phần tử, dán ảnh từ clipboard |

### P1.5 — Canvas dùng sướng

Bắt vào sau mà không đụng kiến trúc: **tìm xuyên bảng (§8.2)** · `shape/draggable` + overlay xem
trước · `gfx-turbo-renderer` · Frame + Group + `widget-frame-title` ·
`widget-edgeless-auto-connect` · `block-edgeless-text` · `block-surface-ref` · lasso ·
`adaptive-load-controller`.

`block-surface-ref` là cơ chế AFFiNE sẵn có cho D2: nhúng một frame của bảng vào bài viết như
ảnh sống, chạm vào nhảy tới bảng.

### P2 — Docs

Cây block đầy đủ · slash menu · tay cầm kéo · thanh định dạng · `block-latex` ·
`block-callout` · `block-divider` · `block-code` · `widget-note-slicer` ·
`inline-reference` + `widget-linked-doc` (thay marker `[[…]]` cũ) · `fragment-outline` ·
`fragment-doc-title`.

**Di trú `ContentBlock` → cây block** (7 kiểu phẳng hiện có sang cấu trúc cây) nằm ở P2, không
phải P1. Bài viết đã lưu **không** bị đụng tới trong phạm vi tài liệu này.

**Cầu nối P1↔P2:** Note trên canvas render bằng **chính** trình soạn thảo cây block dùng chung.
Cùng một mã, khác bộ lược đồ đăng ký — P1 đăng ký `paragraph` + `list` + `latex`, P2 đăng ký nốt
phần còn lại. Không có trình soạn thảo thứ hai.

### Hoãn tới phiên backend — phải nhắc lại

`block-database` · `block-table` · `data-view`. Đây là một hệ con lớn hơn cả P1 và gắn với
backend. **Không cắt, chỉ hoãn.**

### Tính năng cũ không có mặt trong P1

`PRODUCT.md` mô tả bản Mindmap cũ. Đối chiếu để không ai tưởng nhầm là còn:

| Tính năng cũ | Trạng thái |
|---|---|
| Nhiều bảng, tên/màu/gắn chuyên khoa | P1.0 (`BoardGallery`) |
| Nét vẽ tay, ảnh chèn, hoàn tác/làm lại, xoá mềm | P1 |
| Đường nối có nhãn, loại "quan hệ" / "phác đồ" | P1.2 — ánh xạ sang kiểu và nhãn của `connector` |
| Xuất PNG | P1.4 |
| Sao chép bảng dạng outline văn bản | P1.4 — xem §8.1 |
| Tìm xuyên suốt mọi bảng | P1.5 — xem §8.2 |
| Thẻ ghi chú gắn thẳng tới một bài Thư viện | **Bỏ.** Bản cũ cần nó vì ghi chú trên bảng chỉ là thẻ chữ trơ. Từ P2, Note *chính là* một trang đầy đủ — thẻ trỏ đi nơi khác mất lý do tồn tại |
| **Xuất PDF** | **Bỏ.** Cần thư viện ngoài; PNG là đủ |
| **Nhận dạng hình vẽ tay** (nắn nét thành hình) | **Bỏ.** Tính năng riêng của bản cũ, AFFiNE không có |

### 8.1 Sao chép bảng dạng outline

`blocksuite/affine/blocks/surface/src/adapters/plain-text/` — adapter này import
`getMindMapNodeMap` và đi bộ trên cây mindmap để sinh văn bản thụt lề. Nhỏ, và là cách AFFiNE
sẵn có. Vào **P1.4** cùng xuất PNG: cả hai đều là "lấy nội dung ra khỏi bảng".

Hệ quả với danh sách cắt bên dưới: **adapter không bị cắt cả cụm nữa** — giữ `plain-text` của
surface, vẫn cắt `html-adapter`, `markdown`, và `adapter-panel`.

### 8.2 Tìm xuyên suốt mọi bảng

AFFiNE làm hoàn toàn phía máy khách, **không cần server**:
`AFFiNE/packages/common/nbstore/src/impls/idb/indexer/` — chỉ mục ngược + xếp hạng BM25 lưu
thẳng trong IndexedDB.

| File gốc | Dòng | |
|---|---|---|
| `inverted-index.ts` | 537 | Chỉ mục ngược |
| `data-struct.ts` | 544 | Cấu trúc lưu trên IndexedDB |
| `tokenizer.ts` | 162 | Tách từ |
| `match.ts` | 105 | Khớp truy vấn |
| `highlighter.ts` | 77 | Tô sáng đoạn khớp |
| `bm25.ts` | 62 | Xếp hạng |
| `utils.ts` + `storage/indexer/*` | 220 | Lược đồ, truy vấn, tài liệu |

Lõi ~1.700 dòng. **Không** lấy `sync/indexer/index.ts` (863 dòng) — nó gắn với kiến trúc
workspace/nbstore của AFFiNE; ta thay bằng một crawler mỏng chạy khi bảng đóng.

Có sẵn 3 file test gốc (`bm25.spec.ts`, `tokenizer.spec.ts`, `highlighter.spec.ts`) — port theo
luật ở §10.

**Một chỗ buộc phải khác AFFiNE: gỡ dấu tiếng Việt.** `SimpleTokenizer` chỉ hạ chữ thường, không
chuẩn hoá dấu — gõ "khang sinh" sẽ **không** ra "kháng sinh". Với app y khoa tiếng Việt dùng một
tay lúc trực thì đó là hỏng, không phải thiếu tiện. Thêm một bước NFD gỡ dấu, **đánh chỉ mục cả
hai dạng** (có dấu và không dấu) để gõ kiểu nào cũng ra.

Đổi lại bỏ được `graphemer`: nó chỉ phục vụ `NGramTokenizer` tách chữ Hán–Nhật–Hàn; tiếng Việt
tách theo khoảng trắng nên `SimpleTokenizer` là đủ.

Xếp vào **P1.5** vì không có gì trong P1 phụ thuộc nó, nhưng phải ghi rõ: đây là hạng mục **lớn
nhất của P1.5**, một mình bằng cả phần còn lại cộng lại.

Shortcut PWA `/?screen=mindmap` giữ nguyên id màn hình nên vẫn chạy.

### Cắt, lý do không đổi

`remote-selection`, `inline-comment`, `inline-mention` (cần backend + tài khoản) ·
`frame-panel` + trình chiếu · `gfx-template` (không có nội dung mẫu) · `adapter-panel`, adapter
`markdown` và `html-adapter` (**giữ `plain-text` — xem §8.1**) · `block-embed`, `bookmark`,
`attachment`, `embed-doc` (app offline) · `page-dragging-area`, `scroll-anchoring` (thuộc chế độ
trang, tức P2) · `graphemer` (xem §8.2).

---

## 9. Lưu trữ và xử lý lỗi

### Bền vững

Lấy giao diện `DocSource` của AFFiNE (`framework/sync/src/doc/impl/indexeddb.ts`, 116 dòng):
`pull` / `push` / `subscribe`, lưu **mảng bản cập nhật tăng dần** rồi gộp khi đủ nhiều, kèm
`BroadcastChannel` để nhiều tab thấy nhau. Mỗi nét bút chỉ ghi thêm vài trăm byte thay vì mã
hoá lại toàn bảng.

Nền là `src/lib/idb.ts` sẵn có (một kết nối dùng lại, xử lý `onblocked` và `onversionchange`).

### Nâng schema lên `DB_VERSION = 5`

- Thêm object store cho bản cập nhật Yjs và store cách ly (xem dưới).
- **Xoá hẳn hai store `mindmap` và `boards`** ngay trong `onupgradeneeded`. Chúng vẫn nằm vật
  lý trong DB trên máy người dùng vì số version giữ nguyên 4 khi gỡ tính năng. Đây là chỗ "xoá
  bản cũ" thực sự xảy ra.
- **Không di trú dữ liệu cũ.** Bảng mindmap cũ trên máy sẽ không mở lại được. Đã xác nhận.

### Lỗ hổng phải sửa trong `idb.ts`

Mọi hàm ghi hiện kết thúc bằng `catch { return false }`. "Trình duyệt không có IndexedDB" và
"hết dung lượng" trả về **cùng một thứ**. Với canvas thì không chấp nhận được: một buổi vẽ có
ảnh chèn và vài nghìn nét chạm hạn mức rất dễ, và lúc đó người dùng vẫn thấy nét vừa vẽ trên
màn hình trong khi **không có gì được lưu** — mất dữ liệu im lặng.

**Sửa:** bắt riêng `QuotaExceededError`, trả về lý do thay vì `boolean`, và canvas dừng nhận
thao tác mới kèm thông báo thay vì vẽ tiếp vào hư không.

### Nguyên tắc chịu lỗi

Một phần tử hỏng không được giết cả bảng; một bảng hỏng không được giết cả app.

| Hỏng | Xử lý |
|---|---|
| Bản cập nhật Yjs giải mã lỗi | Không ghi đè, không xoá. Dựng doc rỗng, chuyển byte gốc sang store cách ly, ghi log |
| iOS giải phóng backing store của canvas | Dò `isContextLost()` mỗi khung, dựng lại context và vẽ lại từ mô hình (mô hình ở Yjs nên không mất gì) |
| Một phần tử ném lỗi lúc vẽ | Bọc vòng vẽ theo từng phần tử; phần tử lỗi bị bỏ qua và đánh dấu, phần tử khác vẫn hiện |
| KaTeX không phân tích được công thức | Hiện mã nguồn thô trong khung đỏ nhạt, không ném lỗi |
| Hết dung lượng | Xem trên |

### Boundary thứ hai

`src/components/ErrorBoundary.tsx` hiện bọc cả `App`, nên một lỗi trong canvas làm mất toàn bộ
màn hình đang xem. Thêm một boundary bọc riêng `EdgelessHost`: canvas sập thì chỉ canvas sập,
Thư viện và Dùng thuốc vẫn dùng được — quan trọng vì đây là app dùng lúc trực.

### Xoá là xoá mềm

Xoá bảng vào thùng rác, phục hồi được. `Y.UndoManager` lo hoàn tác **trong** bảng; thùng rác lo
hoàn tác **cả** bảng.

### Hoàn tác

`Y.UndoManager` lọc theo `origin`. Thao tác của người dùng ghi origin `"local"` và vào ngăn xếp.
Bố cục mindmap tính lại, đường nối dẫn xuất, và nâng cấp schema ghi origin khác nên **không** vào
ngăn xếp — tránh lỗi "bấm hoàn tác một lần lại lùi nửa bước".

---

## 10. Kiểm thử

**Tiền đề:** mã gốc BlockSuite coi như đúng. Ta không chứng minh lại thuật toán, ta chứng minh
**bản port trung thành**.

### Port test gốc cùng với code

**Đính chính (phát hiện lúc lập kế hoạch, 2026-08-11).** Bản đầu của mục này ghi "~2.465 dòng
test gốc, port hết". Sai. Kiểm lại từng file thì chỉ **855 dòng port thẳng được**; 1.433 dòng
(58%) phụ thuộc bộ khung kiểm thử Lit + DI của BlockSuite (`TestWorkspace` từ
`@blocksuite/store/test`, `effects()` đăng ký custom element, `TestEditorContainer`) — thứ dự án
này không dựng. Con số cũ đã lạc quan quá mức và làm nhẹ đi công thật của P0.

**Nhóm A — port thẳng, chỉ đổi đường dẫn import (855 dòng)**

| Test gốc | Dòng | Che phần nào |
|---|---|---|
| `affine/blocks/surface/src/__tests__/bound.unit.spec.ts` | 180 | Hình hộp, giao cắt — nền của hit-test |
| `framework/std/src/__tests__/gfx/tree.unit.spec.ts` | 165 | Lồng nhau (`utils/tree.ts`) |
| `affine/blocks/surface/src/__tests__/math-utils.unit.spec.ts` | 157 | Toán hình học |
| `affine/blocks/surface/src/__tests__/a-star.unit.spec.ts` | 114 | Định tuyến đường nối gấp khúc |
| `affine/blocks/surface/src/__tests__/sort.unit.spec.ts` | 99 | `loadingSort` — sắp thứ tự nạp theo phụ thuộc (**không phải** thứ tự z, xem dưới) |
| `affine/gfx/pointer/src/__tests__/adaptive-load-controller.unit.spec.ts` | 73 | Giới hạn tải khi snap |
| `affine/blocks/surface/src/__tests__/graph.unit.spec.ts` | 23 | Đồ thị cho định tuyến |
| `affine/blocks/surface/src/__tests__/priority-queue.unit.spec.ts` | 22 | Hàng đợi ưu tiên |
| `framework/global/src/__tests__/curve.unit.spec.ts` | 22 | Tham số Bézier |

**Nhóm B — cần shim nhỏ (177 dòng)**

`affine/gfx/pointer/src/__tests__/pan-tool.unit.spec.ts` — chỉ vướng `EdgelessLegacySlotIdentifier`
và `MouseButton`; thay bằng stub, giữ nguyên phần còn lại.

**Nhóm C — không port được (1.433 dòng)**

`view.unit.spec.ts` (1015) và `surface.unit.spec.ts` (418). Chúng phủ đúng Viewport, Store và
Layer — tim của P0 — nên không thể bỏ qua.

**Cách xử lý nhóm C: đọc như đặc tả, không chép như file.** Với mỗi `test(...)` trong hai file
đó, chép **khẳng định** sang test của ta và bỏ giàn giáo Lit. Ví dụ: một ca dựng `TestWorkspace`
rồi kiểm `viewport.toModelCoord(0, 0)` sau khi `setZoom(2)` thì bên ta dựng `new Viewport()`
trần và kiểm đúng cặp số đó. Cùng một khẳng định, khác cách dựng.

Đây là biến thể của cùng nguyên tắc "không tự nghĩ ra con số kỳ vọng" ở §10 dưới — chỉ khác là
nguồn chép là mã test thay vì kết quả chạy.

### Hàm không có test gốc — bổ sung vào danh sách

Ngoài `layout.ts` của mindmap (đã nêu dưới), lượt rà lúc lập kế hoạch tìm thêm:

- **`sortIndex`** (`affine/blocks/surface/src/utils/sort.ts`) — so sánh chỉ số phân số **có tính
  lồng nhóm**, tức là hàm quyết định thứ tự z thật sự. `sort.unit.spec.ts` chỉ phủ `loadingSort`
  nằm cùng file, không phủ hàm này. Cần test tự viết, và nó đáng được viết kỹ vì sai thứ tự z
  là loại lỗi hiện ra rất muộn.

Cho tìm xuyên bảng ở P1.5, thêm 3 file trong
`AFFiNE/packages/common/nbstore/src/impls/idb/indexer/__tests__/`: `bm25.spec.ts`,
`tokenizer.spec.ts`, `highlighter.spec.ts`.

**Ngoại lệ cho `tokenizer.spec.ts`:** ta cố ý đổi hành vi (gỡ dấu tiếng Việt, §8.2), nên test gốc
sẽ có ca không khớp. Đó là chỗ **duy nhất** được phép sửa test — và phải thêm ca mới cho hành vi
mới ("khang sinh" → khớp "kháng sinh"), không chỉ xoá ca cũ.

**Luật:** *một module chỉ được coi là port xong khi test gốc của nó chạy xanh trên mã của ta.*
Không đạt là lỗi port, không phải cớ sửa test.

### Chỗ không có test gốc

- **`layout.ts` của mindmap không có test nào** — mà nó là P1.1, chặng ưu tiên trước.
  **Bù bằng fixture vàng:** chạy `layout.ts` gốc trong workspace AFFiNE trên vài chục cây mẫu,
  đổ `{cây vào → toạ độ ra}` thành JSON, test của ta khớp vào đó. Không tự nghĩ ra con số kỳ
  vọng, chép từ bản gốc.
- `canvas-renderer` và phần vẽ của `layer` — có test cho sắp xếp, không có cho vẽ.

### Danh sách kiểm bằng tay trên iPhone thật

Chạy ở cuối mỗi chặng P1.x:

1. Hai ngón pinch-zoom trong lúc đang có nét bút dở — không khựng, không mất nét
2. Vẽ liên tục 60 giây, tắt mở lại app, bảng còn nguyên
3. Zoom ra hết cỡ trên bảng đông phần tử — không sập tab (bài kiểm tra `getEffectiveDpr`)
4. Apple Pencil vẽ trong khi đang ở công cụ chọn
5. Bàn phím ảo bung lên khi sửa Note — thanh công cụ bám đúng mép, không bị che

### Công cụ

Thêm `vitest` làm **devDependency**. Dự án đi từ không có script `test` sang có; nền sạch từ nay
đo được, không còn chỉ là "tsc và build không lỗi".

**Không hứa:** port test gốc chứng minh *logic* đúng, không chứng minh *cảm giác* đúng. Mượt hay
không vẫn phải xác nhận bằng máy thật.

---

## 11. Dependency

Chạy thật: **2 → 8**

**Đính chính (phát hiện lúc lập kế hoạch P0-B, 2026-08-11).** Bản đầu ghi "2 → 5" và liệt
`rxjs`, `@preact/signals-core`, `lodash-es` vào diện *không lấy*. Sai. Khi viết lệnh sao chép cho
từng file mới phải nhìn dòng `import` của chúng, và ba gói đó nằm ngay trong lõi P0:

| File lõi P0 | Phụ thuộc |
|---|---|
| `gfx/viewport.ts` | `rxjs`, `lodash-es` |
| `gfx/layer.ts` | `rxjs`, `lodash-es`, `fractional-indexing` |
| `gfx/tool/tool-controller.ts` | `@preact/signals-core`, `rxjs` |
| `gfx/model/surface/element-model.ts` | `rxjs`, `lodash-es` |
| `store/model/block/block-model.ts` | `@preact/signals-core`, `rxjs` |
| `store/model/block/sync-controller.ts` | `@preact/signals-core` |

23 file trong `framework/` dùng `rxjs`. Bỏ chúng nghĩa là **viết lại** tầng phản ứng của
BlockSuite, đúng thứ D1 và D8 đã cấm.

**Cập nhật theo D11 (2026-08-11).** Vendoring không tự gỡ dependency — mã chép về vẫn `import`
thứ nó cần. Cái lợi thật là **chọn được cây con nào để chép**, nên vài gói nặng rơi hẳn.

| Gói | Ai cần | Ghi chú |
|---|---|---|
| `yjs` | vendored store + tầng lưu trữ của ta | Nguồn sự thật (D5) |
| `@preact/signals-core` | vendored `store/model/block/*` | Cầu phản ứng `Y.Map` ↔ model. Nối vào React bằng `useSyncExternalStore` |
| `rxjs` | vendored store + `viewport.ts`/`layer.ts` ta port | 23 file trong `framework/` dùng |
| `lib0` | vendored store | Tiện ích nhị phân đi kèm Yjs |
| `zod` | vendored `store/model/block/zod.ts` | `defineBlockSchema` đi qua đây. Không bỏ được nếu vendor nguyên văn (D11 cấm sửa) |
| `nanoid` | vendored `store/utils/id-generator.ts` | Nhỏ |
| `minimatch` | vendored `store/schema/schema.ts` | Khớp mẫu flavour kiểu `affine:embed-*` |
| `lodash.ismatch` | vendored `store/model/store/query.ts` | Nhỏ |
| `lodash-es` | `viewport.ts`, `layer.ts` ta port | `debounce`, `last`. Tree-shake được |
| `fractional-indexing` | `layer.ts` ta port | Thuật toán ngắn nhưng nhiều bẫy biên; sai một chỗ là thứ tự phần tử hỏng âm thầm |
| `katex` | `block-latex`, `inline-latex` | ~75 KB gz + **phải đóng gói kèm font WOFF2**, thiếu là công thức hiện ô vuông khi offline. Chủ dự án xác nhận nội dung y khoa có công thức thực sự cần |

**Rơi hẳn nhờ chọn cây con** (so với việc cài cả gói):

| Gói | Vì sao rơi |
|---|---|
| `file-type` | **Không file nào trong `store/src` import** |
| `y-protocols` | Chỉ `extension/workspace` và `yjs/awareness` dùng — §8 đã cắt awareness |
| `@blocksuite/sync` | Chỉ `extension/workspace` và `test/` dùng |
| `lit` | Chỉ `global/src/lit/*` dùng — không vendor thư mục đó |

**Vẫn phải đo bundle sau chặng đầu P0** và ghi lại con số. Cây con nào hoá ra kéo theo gói tưởng
đã rơi thì phải xem lại danh sách này.

Dev: `vitest`.

**Ba phương án đã cân nhắc rồi bỏ:**

1. *Tự viết tầng phản ứng* — thay `rxjs` bằng `EventEmitter` ~20 dòng, `signals-core` bằng signal
   tự viết, `lodash-es` bằng `debounce` tự viết. Bỏ vì phân kỳ ở đúng tầng chịu lực nhất.
2. *Cài `@blocksuite/*` từ npm* (D10) — bỏ vì bản cần dùng chưa publish (xem D10 trong §3).
3. *Cài 0.22.4 rồi port riêng `viewport.ts` từ 0.27.0* — bỏ vì hai bản cách nhau năm minor, chưa
   biết còn khớp API không, và phải thử mới biết.

**Nếu 0.27.0 được publish về sau:** thay `src/vendor/blocksuite/` bằng dependency npm. Đó chính
là lý do D11 cấm sửa mã vendored — để lúc đó việc thay chỉ là xoá thư mục và đổi đường dẫn import.

`gfx-turbo-renderer` chạy trên Web Worker thật (`src/painter/painter.worker.ts`); Vite nuốt
`?worker` sẵn nên không thêm cấu hình.

---

## 12. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Hiệu năng trên iPhone không đạt | Cao | Ba cấu hình mobile của `viewportRuntimeConfig` lấy ngay từ P1.0, không đợi gặp sự cố. Danh sách kiểm tay ở cuối mỗi chặng. |
| P0 tốn công trước khi thấy màn hình chạy | Trung bình | P1.0 kết thúc bằng một bảng trống pan/zoom được — mốc nhìn thấy được, không phải "nền xong rồi tin tôi đi" |
| ~~Port test gốc vướng phụ thuộc Lit/DI~~ | **Đã xảy ra** | Không còn là rủi ro — đã đo: 1.433/2.465 dòng (58%) không port được. Xử lý ở §10 nhóm C: đọc như đặc tả, chép khẳng định, bỏ giàn giáo |
| KaTeX phình bundle | Thấp | Nạp động khi gặp công thức đầu tiên; font subset |
| Người dùng mất bảng mindmap cũ | Đã chấp nhận | Quyết định rõ ràng của chủ dự án (D3). Mã cũ đã xoá ở `fd24576` nên gần như chắc đã hỏng |
| Chỉ mục tìm kiếm phình P1.5 | Trung bình | ~1.700 dòng, một mình bằng cả phần còn lại của P1.5. Nếu P1.5 phải cắt thì đây là hạng mục tách ra thành spec riêng, không phải hạng mục làm dở |
| Chỉ mục ăn dung lượng IndexedDB | Trung bình | Chỉ mục ngược nằm cùng DB với nét vẽ và ảnh, cùng chịu một hạn mức. Xử lý `QuotaExceededError` ở §9 phải phân biệt "hết chỗ vì nội dung" và "hết chỗ vì chỉ mục" — chỉ mục dựng lại được, nội dung thì không |

---

## 13. Phụ lục: đối chiếu toàn bộ 66 package

Bảng này tồn tại vì bốn mục trước được rà theo kiểu phản ứng — mỗi lần chủ dự án hỏi lại thì
tìm ra thêm thứ bị sót. Đây là lượt rà máy móc: liệt kê mọi package trong
`blocksuite/affine/**` và `blocksuite/framework/*`, phân loại từng cái, không chừa dòng nào.

Ký hiệu: **P0** hạt nhân · **P1.x** chặng trong P1 · **1.5** P1.5 · **P2** Docs ·
**H** hoãn tới backend · **C** cắt · **—** không áp dụng.

### framework

| Package | | Ghi chú |
|---|---|---|
| `framework/global` | **P0** | `gfx/` chứa `Bound`, `Vec`, `curve`, `polygon`, `svg-path` — nền hình học của mọi thứ. `di/` thay bằng registry thuần React |
| `framework/std` | **P0** | `gfx/`: viewport, grid, layer, tool, selection, interactivity |
| `framework/store` | **P0** | Cây block trên Yjs, quy ước `sys:`/`prop:` |
| `framework/sync` | **P0** | Chỉ lấy `doc/impl/indexeddb.ts` (§9). Bỏ `awareness/`, `blob/` |

### affine — nền

| Package | | Ghi chú |
|---|---|---|
| `affine/model` | **P0** | Lược đồ mọi phần tử: shape, connector, brush, text, mindmap, group |
| `affine/shared` | **P0** | `selection/`, `commands/`, `theme/`, `utils/`. Bỏ `adapters/` trừ plain-text |
| `affine/foundation` | **P0** | `clipboard.ts` — nền sao chép/dán |
| `affine/ext-loader` | **P0** | Hệ nạp extension. Thay bằng registry thuần, giữ hình dạng API |
| `affine/components` | **P1.0** | 35 mảnh UI. Lấy dần theo nhu cầu: `portal`, `tooltip`, `toast`, `icon-button`, `color-picker`, `edgeless-line-width-panel`, `edgeless-line-styles-panel`, `slider`, `smooth-corner`, `context-menu`, `drop-indicator`, `block-selection`. Bỏ `embed-card-modal`, `link-preview`, `citation`, `date-picker`, `peek` |
| `affine/rich-text` | **P1.3** | Trình soạn nội dòng. **Không có nó thì Note không gõ được chữ** |
| `affine/all` | — | Package gộp, không có mã |

### affine/blocks

| Package | | Ghi chú |
|---|---|---|
| `blocks/root` | **P1.0** | **Khối chủ sở hữu chế độ edgeless.** `edgeless/`, `clipboard/`, `keyboard/`, `preview/`. Bỏ `page/` (P2), `adapters/` |
| `blocks/surface` | **P1.0** | Surface + renderer + `adapters/plain-text` (§8.1) |
| `blocks/note` | **P1.3** | Khối ghi chú |
| `blocks/paragraph` | **P1.3** | |
| `blocks/list` | **P1.3** | |
| `blocks/image` | **P1.4** | |
| `blocks/frame` | **1.5** | |
| `blocks/edgeless-text` | **1.5** | |
| `blocks/surface-ref` | **1.5** | |
| `blocks/latex` | **P2** | Khối công thức đứng riêng |
| `blocks/callout` | **P2** | |
| `blocks/divider` | **P2** | |
| `blocks/code` | **P2** | |
| `blocks/database` | **H** | |
| `blocks/table` | **H** | |
| `blocks/data-view` | **H** | |
| `blocks/attachment` | **C** | App offline |
| `blocks/bookmark` | **C** | App offline |
| `blocks/embed` | **C** | App offline |
| `blocks/embed-doc` | **C** | App offline |

### affine/gfx

| Package | | Ghi chú |
|---|---|---|
| `gfx/pointer` | **P1.0** | Snap, pan, quick-tool |
| `gfx/mindmap` | **P1.1** | ★ Chặng ưu tiên |
| `gfx/shape` | **P1.2** | `draggable/` + `overlay/` tách xuống 1.5 |
| `gfx/connector` | **P1.2** | Gồm `element-transform` |
| `gfx/text` | **P1.2** | |
| `gfx/note` | **P1.3** | **Công cụ đặt Note lên bảng** — khác `blocks/note` (bản thân khối) |
| `gfx/brush` | **P1.4** | |
| `gfx/group` | **1.5** | Lớp cơ sở đã ở P0 (D7); đây là công cụ gộp nhóm |
| `gfx/link` | **1.5** | Phần tử liên kết trên bảng — dùng để trỏ sang bảng khác |
| `gfx/turbo-renderer` | **1.5** | Web Worker |
| `gfx/template` | **C** | Không có nội dung mẫu |

### affine/inlines

| Package | | Ghi chú |
|---|---|---|
| `inlines/preset` | **P1.3** | **Đậm, nghiêng, gạch chân, gạch ngang, mã, phím tắt markdown.** Nền của mọi định dạng chữ |
| `inlines/latex` | **P1.3** | |
| `inlines/footnote` | **P1.3** | |
| `inlines/link` | **P1.3** | Liên kết nội dòng |
| `inlines/reference` | **P2** | Gõ `@` trỏ bài khác, thay marker `[[…]]` cũ |
| `inlines/comment` | **C** | Cần backend |
| `inlines/mention` | **C** | Cần tài khoản |

### affine/widgets

| Package | | Ghi chú |
|---|---|---|
| `widgets/edgeless-toolbar` | **P1.0** | **Thanh công cụ chính.** `draggable/`, `menu/`, `panel/`, `mixins/` |
| `widgets/edgeless-zoom-toolbar` | **P1.0** | Có `mobile-zoom-ruler.ts` — thước zoom riêng cho điện thoại |
| `widgets/viewport-overlay` | **P1.0** | Lớp phủ cho xem trước công cụ |
| `widgets/edgeless-dragging-area` | **P1.0** | Quét chọn |
| `widgets/edgeless-selected-rect` | **P1.0** | Khung chọn, tay nắm resize/xoay |
| `widgets/toolbar` | **P1.3** | Thanh định dạng nổi khi bôi đen |
| `widgets/keyboard-toolbar` | **P1.3** | Thanh công cụ trên bàn phím ảo |
| `widgets/edgeless-auto-connect` | **1.5** | |
| `widgets/frame-title` | **1.5** | |
| `widgets/slash-menu` | **P2** | |
| `widgets/drag-handle` | **P2** | |
| `widgets/linked-doc` | **P2** | |
| `widgets/note-slicer` | **P2** | |
| `widgets/page-dragging-area` | **C** | Chế độ trang |
| `widgets/scroll-anchoring` | **C** | Chế độ trang |
| `widgets/remote-selection` | **C** | Cần backend |

### affine/fragments

| Package | | Ghi chú |
|---|---|---|
| `fragments/outline` | **P2** | Mục lục |
| `fragments/doc-title` | **P2** | |
| `fragments/adapter-panel` | **C** | |
| `fragments/frame-panel` | **C** | Trình chiếu |

### Ngoài blocksuite

| Nguồn | | Ghi chú |
|---|---|---|
| `AFFiNE/packages/common/nbstore/src/impls/idb/indexer` | **1.5** | Tìm xuyên bảng (§8.2) |

### Hệ quả của lượt rà này

Bốn package load-bearing bị sót, và cả bốn đều rơi vào P1.0 hoặc P1.3:

- `blocks/root` — không có nó thì không có chế độ edgeless để mà gắn công cụ vào
- `widgets/edgeless-toolbar` + `edgeless-zoom-toolbar` — thanh công cụ chính, cộng thước zoom
  riêng cho điện thoại mà tôi cũng chưa từng nhắc
- `rich-text` + `inlines/preset` — không có thì Note không gõ được chữ đậm
- `gfx/note` — công cụ đặt Note, khác với bản thân khối Note

**P1.0 và P1.3 vì thế nặng hơn ước lượng ở §6 và §8.** Con số dòng ở §6 chỉ tính
`Viewport`/`Grid`/`Layer`/renderer, không tính `blocks/root` và thanh công cụ. Kế hoạch triển
khai phải ước lượng lại từ bảng này chứ không từ §6.

---

## 14. Việc kế tiếp

1. Spec này được duyệt
2. Gọi `superpowers:writing-plans` lập kế hoạch triển khai P0 + P1.
   **Ước lượng công phải lấy từ §13, không lấy từ §6** — §6 viết trước lượt rà toàn bộ và
   chỉ tính bốn thành phần của `core/`
3. P1.5 và P2 mỗi cái một spec riêng, sau khi P1 xong
4. `block-database` / `block-table` / `data-view` nhắc lại khi làm backend
