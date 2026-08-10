# Đo bundle sau khi vendor BlockSuite (P0-A)

Ngày đo: 2026-08-11 · commit `34fbbff` (vendor) + Task 2

## Số liệu

| | JS thô | JS gzip |
|---|---|---|
| Mốc nền — trước khi vendor (Task 1 Step 1) | 996,30 kB | 331,46 kB |
| Sau khi vendor 143 file + hai tiện ích định tuyến | 996,33 kB | 331,48 kB |
| **Chênh** | **+0,03 kB** | **+0,02 kB** |

`y-protocols` / `file-type` trong bundle: **KHÔNG**

## Kết luận

Giữ nguyên danh sách dependency ở spec §11. Không gói nặng nào lọt vào bundle.

## Đọc con số này cho đúng

**+30 byte không có nghĩa là vendoring miễn phí.** Ở chặng này mới chỉ có
`src/core/utils/graph.ts` *dùng* mã vendored (một import kiểu `Bound`), nên rollup tree-shake
bỏ gần như toàn bộ `src/vendor/`. Con số này là **sàn**, không phải trần.

Trần thật chỉ đo được ở cuối P0-B, khi `std/gfx` đã kéo `Store`, `SurfaceBlockModel`,
`Viewport`, `Layer` vào thật — lúc đó Yjs, rxjs, signals-core và zod mới thực sự vào bundle.

**Phải đo lại ở cuối P0-B** và cập nhật file này. Nếu lúc đó phần gzip vượt +150 kB thì
xem lại D11 (spec §11 đã hẹn trước ngưỡng này).

## Ba đính chính so với phép đo ở spec §11

Phép đo ban đầu dùng `grep "from '<gói>'"` nên bỏ sót hai trường hợp:

| Gói | Spec §11 ghi | Thật ra |
|---|---|---|
| `file-type` | "không file nào trong `store/src` import" | **Có** — `await import('file-type')` ở `transformer/assets.ts:84`. Dynamic import nên grep tĩnh không thấy |
| `y-protocols` | "rơi — chỉ awareness dùng" | **Phải cài.** `extension/workspace/doc.ts` cung cấp `DocIdentifier` cho `store.ts`, nên không xoá cả thư mục `workspace/` được |
| `@blocksuite/sync` | "rơi" | **Vendor luôn.** Spec §9 vốn đã lấy `IndexedDBDocSource` từ gói này |

Cả ba đều **không vào bundle** ở chặng này, nên hệ quả thực tế bằng không — nhưng phép đo
thì sai, và cách đo (grep tĩnh cho dynamic import) là cái sai cần nhớ.
