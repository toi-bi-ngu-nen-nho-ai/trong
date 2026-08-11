// Barrel của tầng gfx — tương ứng `std/src/gfx/index.ts` ở thượng nguồn.
//
// Bản thượng nguồn re-export cả Viewport, Grid, Layer, ToolController, selection và
// interactivity. P0-B mang tầng model; P0-C thêm dần cursor, extension, identifiers,
// raf-coalescer, Viewport (Task 4), Grid (Task 5), Layer (Task 6), Selection (Task 7).
// ToolController thuộc phạm vi ngoài P0-C (cần Viewport tương tác DOM thật) và sẽ thêm vào
// đúng file này khi tới chặng đó.
//
// Cố ý KHÔNG chép index.ts của thượng nguồn: nó re-export những module ta chưa port, và một
// barrel trỏ vào hư không thì hỏng ngay lúc dịch.
// `export *` cũ vô tình lộ `GfxViewportElement` ra barrel — kiểu placeholder rỗng khai trong
// `./host` để thay ràng buộc Lit của thượng nguồn ở `viewport.ts`. Nguy hiểm: thượng nguồn CŨNG
// có một `GfxViewportElement` thật (Lit custom element, từ `viewport-element.js` — xem comment
// cạnh `export * from './viewport'` phía dưới) mà barrel này cố tình KHÔNG đem qua vì file đó
// chưa port. Nếu `GfxViewportElement` của `./host` lộ ra barrel, một file P1 có thể
// `import type { GfxViewportElement } from '@/core/gfx'` và tưởng đang nhận kiểu Lit thật, trong
// khi chỉ nhận interface rỗng. Vì vậy export tường minh, chỉ đem ba kiểu thật sự là hợp đồng công
// khai (`EditorHost`, `BlockStdScope`, `GfxController`) — không đem `GfxViewportElement`.
//
// Đo trước khi đổi: đã grep toàn `src/**`, chưa nơi nào ngoài `src/core/gfx/**` import từ barrel
// này, nên đổi từ `export *` sang danh sách tường minh không làm vỡ import đang có.
export type { EditorHost, BlockStdScope, GfxController } from './host'
export type { CursorType, StandardCursor } from './cursor'
export { GfxExtension, GfxExtensionIdentifier } from './extension'
export { GridManager } from './grid'
export { GfxControllerIdentifier } from './identifiers'
export { LayerManager, type ReorderingDirection } from './layer'
export * from './model/base'
export * from './model/gfx-block-model'
// Thượng nguồn export `GfxCompatibleBlockModel as GfxCompatible` — tên nhiều file P1/P2 sẽ
// import. Giữ đúng bí danh đó dù `export * from './model/gfx-block-model'` ở trên đã lộ tên gốc.
export { GfxCompatibleBlockModel as GfxCompatible } from './model/gfx-block-model'
export * from './model/model'
export * from './model/surface/decorators'
export * from './model/surface/element-model'
export * from './model/surface/local-element-model'
export * from './model/surface/surface-model'
export * from './perf'
export { createRafCoalescer, type RafCoalescer } from './raf-coalescer'
// Thượng nguồn (`gfx/index.ts:101`): `export { GfxSelectionManager } from './selection.js';` —
// không re-export `SurfaceSelectionState` (chỉ dùng nội bộ trong `selection.ts`).
export { GfxSelectionManager } from './selection'
// Thượng nguồn: `export * from './viewport.js'` cộng `export { GfxViewportElement } from
// './viewport-element.js'`. `viewport-element.ts` là file Lit không port (xem `host.ts`), nên
// chỉ đem đúng phần đã port.
export * from './viewport'
// Thượng nguồn re-export 6 hàm này từ `utils/tree.js` qua barrel gfx (xem
// `std/src/gfx/index.ts`). `utils/tree.ts` ở đây có thêm các hàm lock/unlock nội bộ mà thượng
// nguồn KHÔNG re-export qua barrel gfx — cố tình không đem theo, chỉ đem đúng danh sách gốc.
export {
  batchAddChildren,
  batchRemoveChildren,
  canSafeAddToContainer,
  descendantElementsImpl,
  getTopElements,
  hasDescendantElementImpl,
} from '../utils/tree'
