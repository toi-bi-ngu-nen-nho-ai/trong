import type { ServiceProvider } from '@blocksuite/global/di';
import type { BlockModel, Store, StoreSelectionExtension } from '@blocksuite/store';
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
// | 7 | `selection.ts:135,149,318` (`.selection`, `.get()`, `.store`) | `selection`, `get` — ĐÃ THÊM | `StoreSelectionExtension`, `store/src/extension/selection/selection-extension.ts:12`; `ServiceProvider['get']`, `global/src/di/provider.ts:20` |
//
// `selection` và `get` khai đúng theo cách upstream `std-scope.ts` khai chúng (getter chuyển
// tiếp): `get selection() { return this.get(StoreSelectionExtension) }` (dòng 110) và
// `get get() { return this.provider.get.bind(this.provider) }` (dòng 88). Ở đây ta chỉ cần kiểu,
// không cần hành vi getter thật — `BlockStdScope` vẫn là placeholder tối giản, đúng lối
// `EditorHost` ở trên.
export interface BlockStdScope {
  readonly store: Store;
  readonly selection: StoreSelectionExtension;
  readonly get: ServiceProvider['get'];
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
// - Task 7 (`selection.ts`) thêm `selection` — nhưng KHÔNG sửa interface ở đây. Đúng thượng
//   nguồn (`gfx/selection.ts` khai `declare module './controller.js' { interface GfxController
//   { readonly selection: GfxSelectionManager } }`), `src/core/gfx/selection.ts` tự khai
//   `declare module './host' { interface GfxController { readonly selection: GfxSelectionManager
//   } }` — TypeScript gộp (declaration merging) thành viên đó vào interface bên dưới tại thời
//   điểm biên dịch, miễn `selection.ts` nằm trong đồ thị module (đã re-export qua `index.ts`).
//   `tool-controller.ts` (ngoài phạm vi P0-C) sẽ là nơi đọc nó.
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
