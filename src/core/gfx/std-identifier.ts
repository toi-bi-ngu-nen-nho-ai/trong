// Mảnh cắt của `std/src/identifier.ts` — chỉ đúng phần P0-C thật sự cần.
//
// `gfx/identifiers.ts` thượng nguồn import `LifeCycleWatcherIdentifier` từ `std/src/identifier.ts`.
// File đó kéo theo `command/`, `event/`, `extension/`, `scope/`, `spec/` — 3.260 dòng hạ tầng std
// nằm ngoài phạm vi P0-C. Đã đo: trong cả `std/src/gfx/`, chỉ hai file chạm `../identifier.js` —
// `identifiers.ts` cần `LifeCycleWatcherIdentifier`, `surface-middleware.ts` cần `StdIdentifier`
// (file sau hoãn sang P1.0). Nghĩa là P0-C cần đúng **1 trong 9** export của file đó.
//
// VÌ SAO KHAI LẠI Ở ĐÂY LÀ AN TOÀN, KHÔNG PHẢI NỢ:
// DI của BlockSuite định danh dịch vụ bằng **chuỗi tên**, không bằng đồng nhất đối tượng —
// `global/src/di/container.ts` khoá theo `identifier.identifierName` (dòng 176, 184, 234) và
// `provider.ts` so sánh cũng bằng tên (dòng 175). Nên `createIdentifier<T>('LifeCycleWatcher')`
// khai ở đây và cái khai trong `std/src/identifier.ts` trỏ về **cùng một ô DI**. Khi P1.0 port
// std thật, việc phải làm là đổi import trong `identifiers.ts` — không có chuyện hai định danh
// song song chia đôi container. Tiền lệ nằm ngay trong mã đã vendor:
// `store/src/extension/store-extension.ts` khai `StoreExtensionIdentifier` y hệt cách này.
//
// VÌ SAO `LifeCycleWatcher` ĐỂ RỖNG:
// Chỗ dùng duy nhất trong P0-C (`gfx/identifiers.ts`) ép kiểu bỏ đi ngay lập tức —
// `LifeCycleWatcherIdentifier(gfxControllerKey) as ServiceIdentifier<GfxController>` — nên tham
// số kiểu không hề được quan sát. Khai rỗng là trung thực; thêm thành viên lúc này là đoán.
// Cùng lối với `EditorHost` ở `host.ts`, và cùng luật: thêm thành viên khi có chỗ thật sự cần.
//
// Thượng nguồn tương ứng: `blocksuite/framework/std/src/identifier.ts` dòng 26-27.

import { createIdentifier } from '@blocksuite/global/di';

export interface LifeCycleWatcher {}

export const LifeCycleWatcherIdentifier =
  createIdentifier<LifeCycleWatcher>('LifeCycleWatcher');
