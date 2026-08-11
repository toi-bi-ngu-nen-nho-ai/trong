import type { BlockModel, Store } from '@blocksuite/store';
import type { Signal } from '@preact/signals-core';

import type { GfxModel } from './model/model';
import type { SurfaceBlockModel } from './model/surface/surface-model';

// Thay ràng buộc Lit của BlockSuite ở tầng model.
//
// `model/base.ts` và `model/gfx-block-model.ts` của thượng nguồn khai
// `import type { EditorHost } from '../../view/...'` — EditorHost là một Lit custom element.
// Nhưng cả hai đều là `import type`: nó CHỈ dùng làm kiểu, không có mã Lit nào chạy. Vì thế
// ta khai một kiểu tối giản thay vì port cả tầng `view/`.
//
// Khi P1.0 dựng EdgelessHost bằng React, kiểu này là chỗ khai những gì host thật phải cung cấp.
// Hiện tại tầng model chỉ dùng nó ở vị trí tham số nên để rỗng là đủ và trung thực — thêm thành
// viên khi có chỗ thật sự cần, không đoán trước.
export interface EditorHost {}

// Thay ràng buộc Lit của BlockSuite ở `viewport.ts` (Task 4).
//
// Thượng nguồn khai `import type { GfxViewportElement } from '.'` (từ `viewport-element.ts`) —
// một Lit custom element hiển thị viewport. `viewport-element.ts` không port ở P0-C (React sẽ
// thay ở P1.0). Đây cũng là `import type`, không có mã Lit nào chạy.
//
// Đã đo bằng grep trên `viewport.ts` gốc: `GfxViewportElement` chỉ xuất hiện ở vị trí kiểu
// (`_element: GfxViewportElement | null`, `elementReady = new Subject<GfxViewportElement>()`)
// — không có chỗ nào đọc tiếp thành viên trên giá trị mang kiểu này. Vì thế interface rỗng là
// đủ và trung thực, đúng lối `EditorHost` ở trên.
export interface GfxViewportElement {}

// Placeholder cho `std/src/scope/std-scope.ts` (`BlockStdScope`) — hạ tầng std lớn, ngoài phạm
// vi P0-C (xem lý do loại trong `std-identifier.ts`: đây là một trong 7 thứ mà hướng "port
// identifier.ts chỉ phần kiểu" sẽ buộc phải khai thêm mà không task nào quan sát cả 7).
//
// Rỗng ở Task 3 vì trong phạm vi task này không có chỗ nào đọc tiếp vào `.std` — `extension.ts`
// chỉ CHUYỂN TIẾP nó qua getter (`get std() { return this.gfx.std; }`) chứ không đọc thành viên
// nào của nó. Ba thành viên các task P0-C sau sẽ cần đã đo trước, dựng dần đúng lối `GfxController`
// dưới đây — đều tựa vào kiểu ĐÃ VENDOR, nên đây là hợp đồng đo được chứ không phải interface đoán:
//
// | Task | Nơi đọc tiếp vào `.std` | Thành viên cần thêm | Kiểu tựa vào (đã vendor) |
// |---|---|---|---|
// | 3 (file này) | không ai — chỉ chuyển tiếp qua getter | (không thêm gì) | — |
// | 5 | `grid.ts:384` (`this.std.store`) | `store` — ĐÃ THÊM | `Store`, `store/src/model/store/store.ts:195` |
// | 6 | `layer.ts:78` (`this.std.store`) | (đã có từ Task 5) | (như trên) |
// | 7 | `selection.ts:135,149,318` (`.selection`, `.get()`) | `selection`, `get` | `StoreSelectionExtension`, `store/src/extension/selection/selection-extension.ts:12`; `ServiceProvider['get']`, `global/src/di/provider.ts:20` |
export interface BlockStdScope {
  readonly store: Store;
}

// Placeholder dựng dần cho `std/src/gfx/controller.ts` (hoãn sang P1.0 — nó cần
// `KeyboardController` như một giá trị, cộng `LifeCycleWatcher` và `onSurfaceAdded` nằm ngoài
// `gfx/`). `extension.ts` và `identifiers.ts` chỉ `import type { GfxController }` — không có mã
// nào chạy thật của `GfxController`, giống hệt tình huống `EditorHost` ở trên.
//
// Khác `EditorHost`: `GfxController` nằm ở vị trí tham số thật (constructor của `GfxExtension`)
// và các lớp con truy cập `this.gfx.<thành viên>` — interface rỗng sẽ thành lỗi kiểu. Nên
// placeholder này khai ĐÚNG những thành viên đã đo là được dùng thật, dựng dần qua từng task:
// - Task 3 (file này): `surface`, `getElementById` — dùng ở `grid.ts`, `layer.ts`, `selection.ts`.
//   Cộng `std` — không phải do file tiêu thụ ở task sau, mà do chính `extension.ts` (Task 3) có
//   getter `get std() { return this.gfx.std; }` cần kiểu này để type-check. Xem `BlockStdScope`
//   ở trên.
// - Task 4 sẽ thêm `viewport` sau khi `Viewport` được port — dùng ở `tool-controller.ts`.
// - Task 5 (file này) thêm `surface$` — đo trên `grid.ts:501-511`
//   (`this.gfx.surface ... else this.gfx.surface$.subscribe(...)`, nhánh chờ surface được gắn
//   sau). Thượng nguồn (`gfx/controller.ts`): `get surface$() { return this._surface$; }` kiểu
//   `Signal<SurfaceBlockModel | null>` — `Signal` từ `@preact/signals-core`, dependency chạy
//   thật đã có sẵn trong `package.json` (đã dùng ở `model/surface/surface-model.ts`).
// - Task 7 sẽ thêm `selection` sau khi `selection.ts` được port — dùng ở `tool-controller.ts`.
// Không khai thêm thành viên "để dành" — mỗi thành viên phải có chỗ dùng thật đã đo được.
export interface GfxController {
  readonly surface: SurfaceBlockModel | null;
  readonly surface$: Signal<SurfaceBlockModel | null>;
  readonly std: BlockStdScope;

  getElementById<
    T extends GfxModel | BlockModel<object> = GfxModel | BlockModel<object>,
  >(
    id: string
  ): T | null;
}

// Placeholder khác loại với ba cái trên: không phải thay ràng buộc Lit, mà thay một vòng phụ
// thuộc kiểu giữa hai file port ở CÙNG P0-C. `utils/layer.ts` (Task 5) thượng nguồn khai
// `import type { Layer } from '../gfx/layer.js'`, nhưng `gfx/layer.ts` là Task 6 — chưa tồn tại
// lúc Task 5 chạy. Thượng nguồn cũng có vòng này (chỉ ở mức kiểu: `gfx/layer.ts` xuất `Layer`,
// `utils/layer.ts` nhập nó; không có `import` giá trị nào đi ngược lại), nên vòng không phải lỗi
// port — chỉ là thứ tự file.
//
// Khác `EditorHost`/`GfxViewportElement`: `utils/layer.ts` ĐỌC THẬT hai thành viên trên `Layer`
// (`getLayerEndZIndex`, `updateLayersZIndex` dùng `layer.zIndex` và `layer.elements.length`) —
// interface rỗng sẽ vỡ type-check. Kiểu thật ở thượng nguồn là `BlockLayer | CanvasLayer`, hợp
// cấu trúc với type dưới đây (cả hai case đều có `zIndex: number` và `elements: Array<T>`), nên
// placeholder cấu trúc tối thiểu này là đúng đắn — không đoán, đo trên đúng hai chỗ đọc.
//
// Khi Task 6 port `gfx/layer.ts` xong, `utils/layer.ts` sẽ đổi import trỏ thẳng vào đó
// (`import type { Layer } from '../gfx/layer'`) và interface này hết chỗ dùng — xoá cùng lúc.
//
// `zIndex` KHÔNG readonly: `updateLayersZIndex` gán lại nó (`curLayer.zIndex = curIndex`) — đo
// được trên chính hai hàm tiêu thụ type này, không phải suy đoán.
export interface Layer {
  zIndex: number;
  readonly elements: { readonly length: number };
}
