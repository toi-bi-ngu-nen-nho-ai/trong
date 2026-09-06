# Kho bài viết — Giai đoạn 5–6 (Plan 2)

> **Cho người thi hành:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc
> `superpowers:executing-plans` để chạy từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Biến động cơ page mode đã dựng xong ở Plan 1 thành tính năng người dùng bấm tới được —
một kho mục hai loại (bài viết + sơ đồ), sáu màn hình dùng chung một lưới, và luồng "Tạo bài mới"
chạy thật từ Trang chủ.

**Kiến trúc:** `MucMeta` mọc thêm hai trường phân loại (`loai`, `danhMuc`) và chuyển sang object
store MỚI `mucs` (DB v6, không xoá store nào). `LuoiMuc` nhận năm prop lọc, tất cả optional với mặc
định "không lọc", nên tab Mindmap giữ nguyên hành vi. `BoardGallery` — vỏ quản lý "mục nào đang mở"
— chuyển tiếp năm prop đó xuống và thôi viết cứng `loai="so-do"`, thay bằng `loai` đọc từ chính bản
ghi. Sáu màn hình đều là `BoardGallery` với props khác nhau.

**Tech Stack:** React 19 + TypeScript, IndexedDB qua `src/lib/idb.ts` + `useIdbCollection`,
BlockSuite vendored (D11: KHÔNG sửa `src/vendor/`).

**Spec:** `docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md` — §3.1 (mô hình dữ
liệu), §3.2 (lưu trữ), §3.5 (màn hình), §4 giai đoạn 5–6. Plan này lập luận TỪ spec đó; người thi
hành đọc cả hai.

**Plan trước:** `docs/superpowers/plans/2026-09-04-nen-page-mode.md` (Plan 1, đã hợp nhất vào
`main`). Phần "BA CÂU HỎI — ĐÃ CÓ CÂU TRẢ LỜI" và "KIỂM TAY TIÊU CHÍ 4–5" ở cuối tài liệu đó là số
đo thật, đọc trước khi đoán lại bất cứ điều gì.

---

## Global Constraints

- **D11 — KHÔNG sửa `src/vendor/blocksuite/`.** Mọi bản vá đi qua phía app (extension, CSS, luật
  dịch). Cổng `npm run kiem:vendor` canh điều này.
- **D12 — chuỗi hiển thị mới phải là tiếng Việt.** Chuỗi trong `src/` viết thẳng tiếng Việt; chuỗi
  của cây vendored đi qua `src/board/vi.json` + `scripts/luat-vi-tri-dich.mjs` (danh sách CHO PHÉP
  theo vị trí cú pháp — thêm file mới phải đo tiêu thụ ngược trước).
- **D13 — ranh giới nạp chậm.** Không import giá trị từ `src/board/mo-doc.ts` hay `./EdgelessBoard`
  / `./TrangBaiViet` ngoài `src/board/index.tsx`. `import type` thì được (bị xoá lúc biên dịch).
  `src/__tests__/ranh-gioi-nap-bang.spec.ts` canh hai chiều.
- **Không phá huỷ.** Giai đoạn 5–6 KHÔNG được chứa `deleteObjectStore`, `deleteDatabase`, hay xoá
  bất kỳ file nào của hệ cũ. Toàn bộ việc đó ở giai đoạn 8–9 (Plan 3).
- **`tsc --noEmit` + `npm test` xanh trước mỗi commit.** Bộ hiện tại: 87 tệp / 790 ca.
- **Dev server phải TẮT khi chạy test** — `preview_stop` có lúc báo "stopped" mà tiến trình `vite`
  con vẫn sống, gây `EBUSY` trên `.tmp-test-*` và làm test đỏ giả. Kiểm cổng 8443 trước khi tin một
  lượt đỏ.
- **Factory `vi.mock` KHÔNG được `tsc` kiểm kiểu.** Sau mỗi lượt đổi tên export phải
  `grep -rn "<TênCũ>:" src/` rồi chạy TRỌN bộ test — `tsc` xanh không đủ.

---

## CỔNG CHỦ DỰ ÁN — đọc trước Task 2

Task 2 chuyển lưới sang object store MỚI `mucs`. Ba store cũ (`boards`, `articles`, `lessons`) **ở
lại nguyên vẹn trong IndexedDB**, không ai xoá gì — nhưng lưới Mindmap sẽ đọc `mucs`, nên **mọi bảng
sơ đồ đang có trong `boards` biến mất khỏi giao diện** kể từ Task 2.

Đây là hệ quả CÓ CHỦ Ý của spec §5 ("Di trú dữ liệu cũ — chủ dự án xác nhận chưa có dữ liệu thật,
quyết định 4"). Nội dung doc BlockSuite không mất (nó nằm ở IndexedDB `drtrong-board`, không phải
`boards`), chỉ metadata không còn được liệt kê.

**Trước khi chạy Task 2, chủ dự án xác nhận một trong hai:**
- (a) Các bảng sơ đồ hiện có là bảng thử, mất cũng được → chạy tiếp như plan.
- (b) Có bảng cần giữ → dừng lại, thêm một task di trú `boards` → `mucs` (đọc `boards`, gán
  `loai: 'so-do'` + `danhMuc: 'tiep-can'`, ghi sang `mucs`, ghim bằng cờ localStorage) trước Task 3.
  Việc này KHÔNG có trong spec vì spec giả định không có dữ liệu thật.

> **ĐÃ TRẢ LỜI (chủ dự án, 2026-09-05): (a).** Bảng sơ đồ hiện có là bảng thử, mất được. Chạy plan
> đúng như viết, KHÔNG thêm task di trú. Bản ghi trong `boards` vẫn nằm nguyên đó cho tới giai đoạn 9.

---

## File Structure

| File | Việc | Trách nhiệm sau chặng |
|---|---|---|
| `src/board/mucMeta.ts` | Sửa (Task 1) | Kiểu `MucMeta` đủ hai trường phân loại; hằng `DANH_MUC`; nguồn duy nhất của `LoaiMuc`/`IdDanhMuc` |
| `src/board/mo-doc.ts` | Sửa (Task 1) | Thôi tự khai `LoaiMuc`, re-export từ `mucMeta.ts` |
| `src/lib/idb.ts` | Sửa (Task 2) | Thêm store `mucs`, `DB_VERSION` 5 → 6 |
| `src/board/LuoiMuc.tsx` | Sửa (Task 3, 4) | Lưới dùng chung: nhận 5 prop lọc + `tieuDe`; đọc store `mucs`; nút tạo theo `loaiTaoDuoc` |
| `src/board/ChonDanhMuc.tsx` | **Tạo** (Task 4) | Bảng chọn danh mục — dùng chung cho cả hai luồng tạo |
| `src/board/BoardGallery.tsx` | Sửa (Task 5) | Chuyển tiếp prop lọc; `loai` truyền cho `VoMuc` đọc từ bản ghi thay vì viết cứng |
| `src/App.tsx` | Sửa (Task 6, 7) | Sáu màn dùng `BoardGallery`; nút "Tạo bài mới" xây lại |

Các file test mới đi kèm từng task, đặt trong `src/board/__tests__/` hoặc `src/__tests__/`.

---

## Task 1: `MucMeta` mọc hai trường phân loại

**Files:**
- Modify: `src/board/mucMeta.ts` (kiểu `MucMeta` dòng 10-38; `capNhatSauKhiRoiMuc` dòng 73-100)
- Modify: `src/board/mo-doc.ts` (khai `LoaiMuc`)
- Test: `src/board/__tests__/mucMeta-phan-loai.spec.ts` (tạo)

**Interfaces:**
- Consumes: `MucMeta` hiện tại (`id`, `ten`, `taoLuc`, `capNhatLuc`, `daXoaLuc?`, `chuyenKhoa`,
  `tags`, `noiDungTimKiem`, `mauHue?`).
- Produces: `export type LoaiMuc = 'bai-viet' | 'so-do'`,
  `export type IdDanhMuc = 'tiep-can' | 'ecg' | 'phac-do' | 'huong-dan'`,
  `export const DANH_MUC`, `MucMeta` thêm `loai: LoaiMuc` và `danhMuc: IdDanhMuc`,
  `export function danhMucNhanLoai(danhMuc: IdDanhMuc, loai: LoaiMuc): boolean`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```ts
// src/board/__tests__/mucMeta-phan-loai.spec.ts
import { describe, expect, it } from 'vitest'

import { DANH_MUC, danhMucNhanLoai, type IdDanhMuc, type MucMeta } from '../mucMeta'

describe('DANH_MUC', () => {
  it('có đúng bốn danh mục, đúng thứ tự spec §3.1', () => {
    expect(DANH_MUC.map((d) => d.id)).toEqual(['tiep-can', 'ecg', 'phac-do', 'huong-dan'])
  })

  it('Hướng dẫn CHỈ nhận bài viết — quyết định 6 của chủ dự án', () => {
    expect(danhMucNhanLoai('huong-dan', 'bai-viet')).toBe(true)
    expect(danhMucNhanLoai('huong-dan', 'so-do')).toBe(false)
  })

  it('ba danh mục còn lại nhận cả hai loại', () => {
    for (const id of ['tiep-can', 'ecg', 'phac-do'] as IdDanhMuc[]) {
      expect(danhMucNhanLoai(id, 'bai-viet')).toBe(true)
      expect(danhMucNhanLoai(id, 'so-do')).toBe(true)
    }
  })

  it('MucMeta bắt buộc loai và danhMuc ở mức kiểu', () => {
    // Ca này là một khẳng định KIỂU: nếu hai trường thành optional thì `tsc` vẫn xanh nhưng
    // `Required<>` bên dưới sẽ đỏ ở lượt gán.
    const muc: Required<Pick<MucMeta, 'loai' | 'danhMuc'>> = { loai: 'bai-viet', danhMuc: 'ecg' }
    expect(muc.loai).toBe('bai-viet')
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/board/__tests__/mucMeta-phan-loai.spec.ts`
Kỳ vọng: ĐỎ — `DANH_MUC` và `danhMucNhanLoai` chưa tồn tại (`does not provide an export named`).

- [ ] **Bước 3: Thêm kiểu và hằng vào `mucMeta.ts`**

Chèn NGAY TRƯỚC `export type MucMeta` (dòng 10):

```ts
/**
 * Loại mục — chốt lúc tạo, KHÔNG đổi được sau (spec §7 "Ngoài phạm vi"). Trước lượt này kiểu sống ở
 * `mo-doc.ts` vì nơi tiêu thụ đầu tiên là `taoHoacMoDoc`; nay metadata mới là nguồn thật của khái
 * niệm, còn `mo-doc.ts` chỉ là một nơi dùng. `mo-doc.ts` re-export để D13 không bị đụng: `index.tsx`
 * đang `import type { LoaiMuc } from './mo-doc'`, và một `import type` không kéo gì vào chunk vỏ app.
 */
export type LoaiMuc = 'bai-viet' | 'so-do'

export type IdDanhMuc = 'tiep-can' | 'ecg' | 'phac-do' | 'huong-dan'

/**
 * Bốn danh mục của kho. `loaiChoPhep` là ràng buộc HIỂN THỊ (bảng chọn danh mục lọc theo nó), không
 * phải ràng buộc lưu trữ — không có lớp kiểm nào chặn một bản ghi lệch, vì bản ghi lệch chỉ sinh ra
 * được bằng cách sửa tay IndexedDB.
 *
 * `as const satisfies` chứ không phải `as const` trần: `satisfies` bắt lỗi ngay tại đây nếu ai thêm
 * một `id` không có trong `IdDanhMuc`, trong khi vẫn giữ kiểu literal hẹp cho `DANH_MUC[n].id`.
 */
export const DANH_MUC = [
  { id: 'tiep-can', ten: 'Tiếp cận vấn đề', loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'ecg', ten: 'ECG', loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'phac-do', ten: 'Phác đồ', loaiChoPhep: ['bai-viet', 'so-do'] },
  { id: 'huong-dan', ten: 'Hướng dẫn', loaiChoPhep: ['bai-viet'] },
] as const satisfies readonly { id: IdDanhMuc; ten: string; loaiChoPhep: readonly LoaiMuc[] }[]

/** Danh mục này có nhận loại mục kia không. Bảng chọn danh mục dùng để ẩn lựa chọn không hợp lệ. */
export function danhMucNhanLoai(danhMuc: IdDanhMuc, loai: LoaiMuc): boolean {
  const muc = DANH_MUC.find((d) => d.id === danhMuc)
  return muc ? (muc.loaiChoPhep as readonly LoaiMuc[]).includes(loai) : false
}
```

- [ ] **Bước 4: Thêm hai trường vào `MucMeta`**

Trong `export type MucMeta`, chèn ngay sau `id: string`:

```ts
  /**
   * Chốt lúc tạo, KHÔNG đổi được — spec §7. Quyết định mở `TrangBaiViet` hay `EdgelessBoard`
   * (`index.tsx` chọn vỏ theo trường này), và là trục lọc của tab Thư viện / Mindmap.
   */
  loai: LoaiMuc
  /** Đổi được sau, qua menu "⋯" trên thẻ (spec §3.5 để dành, không làm ở chặng này). */
  danhMuc: IdDanhMuc
```

- [ ] **Bước 5: Bỏ ba nhánh `??` phòng vệ trong `capNhatSauKhiRoiMuc`**

Store `mucs` là store MỚI, không có bản ghi đời cũ nào (spec §3.1: "giữ lại là giữ một lời nói dối về
hình dạng dữ liệu"). Thay lượt `idbPut` bằng:

```ts
    await idbPut(IDB_STORES.boards, {
      ...conLai,
      capNhatLuc: coThayDoiNoiDung ? Date.now() : hienCo.capNhatLuc,
      noiDungTimKiem: noiDungTimKiemMoi ?? hienCo.noiDungTimKiem,
    })
```

(Giữ `IDB_STORES.boards` ở bước này — `IDB_STORES.mucs` chưa tồn tại, Task 2 Bước 4 mới đổi sang.)

Xoá dòng `import { SPECIALTIES } from '../data'` nếu không còn chỗ nào trong file dùng — kiểm bằng
`grep -n "SPECIALTIES" src/board/mucMeta.ts`.

- [ ] **Bước 6: Dời `LoaiMuc` khỏi `mo-doc.ts`**

Trong `src/board/mo-doc.ts`, thay khai báo `export type LoaiMuc = …` bằng:

```ts
// Nguồn thật của khái niệm nay ở ./mucMeta.ts (metadata mới là nơi loại mục được CHỐT). Re-export
// để mọi bên gọi cũ không phải sửa, và để `index.tsx` giữ nguyên `import type { LoaiMuc } from
// './mo-doc'` — D13 không bị đụng vì `import type` bị xoá lúc biên dịch.
export type { LoaiMuc } from './mucMeta'
```

- [ ] **Bước 7: Chạy ca kiểm mới + trọn bộ**

Chạy: `npx vitest run src/board/__tests__/mucMeta-phan-loai.spec.ts`
Kỳ vọng: XANH (4 ca).

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: `tsc` sạch. Một số ca cũ dựng `MucMeta` thủ công sẽ ĐỎ vì thiếu hai trường bắt buộc — đó là
đúng. Sửa từng ca bằng cách thêm `loai: 'so-do', danhMuc: 'tiep-can'` (giá trị của bảng sơ đồ đời
cũ), KHÔNG nới kiểu thành optional.

- [ ] **Bước 8: Commit**

```bash
git add src/board/mucMeta.ts src/board/mo-doc.ts src/board/__tests__/mucMeta-phan-loai.spec.ts
git commit -m "feat(muc): MucMeta mọc loai + danhMuc, thêm hằng DANH_MUC"
```

---

## Task 2: Object store `mucs` (DB v6)

**Files:**
- Modify: `src/lib/idb.ts` (`DB_VERSION` dòng 12; `IDB_STORES` dòng 15-20)
- Modify: `src/board/mucMeta.ts` (đổi `IDB_STORES.boards` → `IDB_STORES.mucs`)
- Test: `src/lib/__tests__/idb-store-mucs.spec.ts` (tạo)

**Interfaces:**
- Consumes: `IDB_STORES` hiện tại (`boards`, `articles`, `ecgLessons`, …), `openDb()`.
- Produces: `IDB_STORES.mucs === 'mucs'`, `DB_VERSION === 6`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```ts
// src/lib/__tests__/idb-store-mucs.spec.ts
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../idb'

describe('object store mucs', () => {
  it('có tên "mucs" trong IDB_STORES', () => {
    expect(IDB_STORES.mucs).toBe('mucs')
  })

  it('ghi rồi đọc lại được một bản ghi', async () => {
    const muc = {
      id: 'muc-1',
      loai: 'bai-viet' as const,
      danhMuc: 'ecg' as const,
      ten: 'Rung nhĩ',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    expect(await idbPut(IDB_STORES.mucs, muc)).toBe(true)
    const ds = await idbGetAll<typeof muc>(IDB_STORES.mucs)
    expect(ds.find((m) => m.id === 'muc-1')?.ten).toBe('Rung nhĩ')
  })

  it('KHÔNG xoá store cũ nào — giai đoạn 9 mới được phá huỷ', () => {
    expect(IDB_STORES.boards).toBe('boards')
    expect(IDB_STORES.articles).toBeDefined()
    expect(IDB_STORES.ecgLessons).toBeDefined()
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/lib/__tests__/idb-store-mucs.spec.ts`
Kỳ vọng: ĐỎ — `expected undefined to be 'mucs'`.

- [ ] **Bước 3: Thêm store, nâng version**

Trong `src/lib/idb.ts`:

```ts
// v5 → v6 (2026-09-05): thêm store `mucs` cho kho bài viết + sơ đồ dùng chung (spec §3.2.1a).
// `onupgradeneeded` dưới đây tạo MỌI store còn thiếu, nên chỉ cần thêm tên vào IDB_STORES là đủ —
// không viết nhánh nâng cấp riêng. KHÔNG xoá store nào ở lượt này: ba store cũ ở lại nguyên vẹn để
// một chặng hỏng giữa chừng không mang dữ liệu đi theo. Việc xoá là giai đoạn 9, DB_VERSION 6 → 7.
const DB_VERSION = 6

export const IDB_STORES = {
  mucs: "mucs",
  // … giữ nguyên toàn bộ các dòng hiện có, KHÔNG xoá dòng nào
} as const
```

- [ ] **Bước 4: Trỏ `mucMeta.ts` sang store mới**

Trong `src/board/mucMeta.ts`, đổi cả hai lượt `IDB_STORES.boards` (trong `capNhatSauKhiRoiMuc`) thành
`IDB_STORES.mucs`. Sửa luôn chú thích đầu file (dòng 1-2) — nó còn ghi `object store "boards"`.

- [ ] **Bước 5: Chạy ca kiểm + trọn bộ**

Chạy: `npx vitest run src/lib/__tests__/idb-store-mucs.spec.ts`
Kỳ vọng: XANH (3 ca).

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh trọn bộ.

- [ ] **Bước 6: Commit**

```bash
git add src/lib/idb.ts src/board/mucMeta.ts src/lib/__tests__/idb-store-mucs.spec.ts
git commit -m "feat(idb): thêm object store mucs, DB v6 — không xoá store nào"
```

---

## Task 3: `LuoiMuc` nhận năm prop lọc + tiêu đề

**Files:**
- Modify: `src/board/LuoiMuc.tsx` (chữ ký `export function LuoiMuc` dòng 1054; `useIdbCollection`
  ngay dưới; ba lượt `<ScreenHeader title="Sơ đồ tư duy" />` dòng 1328, 1350, 1626; `taoBangMoi`
  dòng 1533; hai nút `aria-label="Tạo bảng mới"` dòng 2549, 2594)
- Test: `src/board/__tests__/LuoiMuc-loc.spec.ts` (tạo)

**Interfaces:**
- Consumes: `MucMeta` (Task 1), `IDB_STORES.mucs` (Task 2), `BoardOpenOrigin` (đã có, dòng 58).
- Produces: `LuoiMuc` nhận thêm
  `{ tieuDe: string; loaiTaoDuoc: LoaiMuc[] } & BoLocMuc` bên cạnh ba prop cũ
  (`onMoBang`, `dungTuBang?`, `onHieuUngXong?`);
  `export type BoLocMuc = { loai?: LoaiMuc; danhMuc?: IdDanhMuc; danhMucLoaiTru?: IdDanhMuc[]; chuyenKhoa?: string }`;
  `export function locTheoProps(ds: MucMeta[], p: BoLocMuc): MucMeta[]`.

- [ ] **Bước 1: Viết ca kiểm đỏ — gồm CA GHIM tab Mindmap**

```ts
// src/board/__tests__/LuoiMuc-loc.spec.ts
import { describe, expect, it } from 'vitest'

import { locTheoProps } from '../LuoiMuc'
import type { IdDanhMuc, MucMeta } from '../mucMeta'

const muc = (p: Pick<MucMeta, 'id' | 'loai' | 'danhMuc'> & Partial<MucMeta>): MucMeta => ({
  ten: p.id,
  taoLuc: 1,
  capNhatLuc: 1,
  chuyenKhoa: '',
  tags: [],
  noiDungTimKiem: '',
  ...p,
})

const KHO: MucMeta[] = [
  muc({ id: 'sd-tiep-can', loai: 'so-do', danhMuc: 'tiep-can' }),
  muc({ id: 'sd-ecg', loai: 'so-do', danhMuc: 'ecg', chuyenKhoa: 'tim-mach' }),
  muc({ id: 'bv-ecg', loai: 'bai-viet', danhMuc: 'ecg' }),
  muc({ id: 'bv-huong-dan', loai: 'bai-viet', danhMuc: 'huong-dan' }),
  muc({ id: 'bv-da-xoa', loai: 'bai-viet', danhMuc: 'ecg', daXoaLuc: 5 }),
]

describe('locTheoProps', () => {
  it('CA GHIM tab Mindmap: loai="so-do" cho ra đúng các sơ đồ chưa xoá', () => {
    // Tab Mindmap là thứ chủ dự án dùng thật hàng ngày — hồi quy ở đây đắt hơn mọi thứ khác trong
    // chặng (spec §3.5). Ca này ghim đúng tập hợp mà DanhSachBang cho ra hôm nay.
    expect(locTheoProps(KHO, { loai: 'so-do' }).map((m) => m.id)).toEqual(['sd-tiep-can', 'sd-ecg'])
  })

  it('không prop nào = không lọc gì (trừ xoá mềm)', () => {
    expect(locTheoProps(KHO, {}).map((m) => m.id)).toEqual([
      'sd-tiep-can',
      'sd-ecg',
      'bv-ecg',
      'bv-huong-dan',
    ])
  })

  it('danhMuc lọc VÀO một danh mục', () => {
    expect(locTheoProps(KHO, { danhMuc: 'ecg' }).map((m) => m.id)).toEqual(['sd-ecg', 'bv-ecg'])
  })

  it('danhMucLoaiTru lọc RA — tab Thư viện không gồm Hướng dẫn', () => {
    const ra = locTheoProps(KHO, { loai: 'bai-viet', danhMucLoaiTru: ['huong-dan' as IdDanhMuc] })
    expect(ra.map((m) => m.id)).toEqual(['bv-ecg'])
  })

  it('chuyenKhoa lọc theo khoa; chuỗi rỗng nghĩa là chưa gắn nên không khớp khoa nào', () => {
    expect(locTheoProps(KHO, { chuyenKhoa: 'tim-mach' }).map((m) => m.id)).toEqual(['sd-ecg'])
  })

  it('mục xoá mềm không bao giờ lọt vào lưới', () => {
    expect(locTheoProps(KHO, {}).some((m) => m.id === 'bv-da-xoa')).toBe(false)
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/board/__tests__/LuoiMuc-loc.spec.ts`
Kỳ vọng: ĐỎ — `does not provide an export named 'locTheoProps'`.

- [ ] **Bước 3: Viết hàm lọc + kiểu bộ lọc**

Thêm vào `src/board/LuoiMuc.tsx`, NGAY TRƯỚC `export function LuoiMuc`:

```ts
/**
 * Bốn trục lọc của lưới. Mọi trường optional và mặc định "không lọc" — đó là điều kiện để tab
 * Mindmap không đổi hành vi khi màn khác bắt đầu dùng chung component này (spec §3.5).
 */
export type BoLocMuc = {
  loai?: LoaiMuc
  danhMuc?: IdDanhMuc
  /** Riêng tab Thư viện. Prop RIÊNG thay vì nhồi ngữ nghĩa "trừ" vào `danhMuc` — spec §3.5. */
  danhMucLoaiTru?: IdDanhMuc[]
  chuyenKhoa?: string
}

/**
 * Lọc thuần, tách khỏi component để ca kiểm gọi được mà không phải dựng cả cây React (lưới có FLIP,
 * ResizeObserver và bảy state — dựng nó chỉ để hỏi "danh sách nào hiện ra" là đắt và giòn).
 *
 * Xoá mềm luôn bị loại ở đây, không phải một trục lọc: panel "Đã xoá gần đây" đọc `danhSach` gốc
 * chứ không đi qua hàm này.
 */
export function locTheoProps(ds: MucMeta[], p: BoLocMuc): MucMeta[] {
  return ds.filter((m) => {
    if (m.daXoaLuc) return false
    if (p.loai && m.loai !== p.loai) return false
    if (p.danhMuc && m.danhMuc !== p.danhMuc) return false
    if (p.danhMucLoaiTru?.includes(m.danhMuc)) return false
    // `chuyenKhoa: ''` nghĩa là CHƯA GẮN khoa (xem taoBangMoi) — nó không khớp bất kỳ khoa cụ thể
    // nào, và cũng không phải "khớp tất cả". So sánh thẳng là đúng ngữ nghĩa đó.
    if (p.chuyenKhoa && m.chuyenKhoa !== p.chuyenKhoa) return false
    return true
  })
}
```

Thêm import kiểu ở đầu file nếu chưa có:
`import { …, type IdDanhMuc, type LoaiMuc, type MucMeta } from './mucMeta'`

- [ ] **Bước 4: Chạy ca kiểm — phải XANH**

Chạy: `npx vitest run src/board/__tests__/LuoiMuc-loc.spec.ts`
Kỳ vọng: XANH (6 ca).

- [ ] **Bước 5: Nối prop vào chữ ký component**

Đổi chữ ký `export function LuoiMuc` (dòng 1054) thành:

```ts
export function LuoiMuc({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
  tieuDe,
  loai,
  danhMuc,
  danhMucLoaiTru,
  chuyenKhoa,
  loaiTaoDuoc,
}: {
  onMoBang: (boardId: string, origin?: BoardOpenOrigin, ten?: string) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
  /** Tiêu đề màn — trước lượt này viết cứng "Sơ đồ tư duy" ở ba chỗ. */
  tieuDe: string
  /** `[]` = màn này KHÔNG có nút tạo (Thư viện, màn chuyên khoa). */
  loaiTaoDuoc: LoaiMuc[]
} & BoLocMuc) {
```

- [ ] **Bước 6: Trỏ lưới sang store `mucs` và dùng hàm lọc**

Đổi `useIdbCollection<MucMeta>(IDB_STORES.boards)` → `useIdbCollection<MucMeta>(IDB_STORES.mucs)`.

Tìm mọi chỗ trong file đang lọc `danhSach.filter((b) => !b.daXoaLuc)` để dựng lưới hiển thị và thay
bằng `locTheoProps(danhSach, { loai, danhMuc, danhMucLoaiTru, chuyenKhoa })`.

**KHÔNG đổi** hai chỗ sau — chúng cố ý đọc danh sách gốc:
- Panel "Đã xoá gần đây" (nó liệt kê đúng những mục `daXoaLuc` có giá trị).
- `hueHienCo` trong `taoBangMoi` — `mauHueChongTrung` cần hue của mọi mục ĐANG SỐNG trong kho, không
  chỉ mục lọt qua bộ lọc của màn hiện tại; lọc hẹp lại sẽ cho hai màn khác nhau chọn trùng hue.

- [ ] **Bước 7: Thay ba tiêu đề viết cứng**

Ba lượt `<ScreenHeader title="Sơ đồ tư duy" />` (dòng 1328, 1350, 1626) → `title={tieuDe}`.

- [ ] **Bước 8: Nút tạo theo `loaiTaoDuoc`**

Hai nút "Tạo bảng mới" (`aria-label` dòng 2549 và 2594) chỉ render khi `loaiTaoDuoc.length > 0`:

```tsx
{loaiTaoDuoc.length > 0 && (
  /* … nút hiện có, giữ nguyên toàn bộ thuộc tính … */
)}
```

`taoBangMoi` gán `loai` và `danhMuc` cho bản ghi mới — Task 4 nối bảng chọn danh mục vào đây, nên
bước này dùng giá trị suy được:

```ts
    const meta: MucMeta = {
      id: taoIdMuc(),
      // Task 4 thay bằng lựa chọn thật từ bảng chọn danh mục. Ở bước này lấy loại duy nhất mà màn
      // cho phép tạo — đúng cho mọi màn hiện có (Mindmap chỉ tạo sơ đồ, Hướng dẫn chỉ tạo bài viết).
      loai: loaiTaoDuoc[0],
      danhMuc: danhMuc ?? 'tiep-can',
      // … phần còn lại giữ nguyên
    }
```

- [ ] **Bước 9: Sửa bên gọi để biên dịch được**

`src/board/BoardGallery.tsx` gọi `<LuoiMuc …>` — thêm ba prop bắt buộc để `tsc` xanh; Task 5 mới làm
chúng cấu hình được:

```tsx
<LuoiMuc tieuDe="Sơ đồ tư duy" loai="so-do" loaiTaoDuoc={['so-do']} … />
```

- [ ] **Bước 10: Chạy trọn bộ**

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh. Nếu `LuoiMuc.spec.ts` hoặc `BoardGallery.spec.ts` đỏ vì thiếu prop, thêm đúng ba prop
trên vào chỗ dựng component trong ca kiểm — KHÔNG cho prop giá trị mặc định trong component để "đỡ
phải sửa test": `tieuDe` và `loaiTaoDuoc` bắt buộc là có chủ ý, mỗi màn phải khai rõ.

- [ ] **Bước 11: Commit**

```bash
git add src/board/LuoiMuc.tsx src/board/BoardGallery.tsx src/board/__tests__/LuoiMuc-loc.spec.ts
git commit -m "feat(luoi): LuoiMuc nhận năm prop lọc + tiêu đề, đọc store mucs"
```

---

## Task 4: Bảng chọn danh mục

**Files:**
- Create: `src/board/ChonDanhMuc.tsx`
- Modify: `src/board/LuoiMuc.tsx` (`taoBangMoi` dòng 1533)
- Test: `src/board/__tests__/ChonDanhMuc.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `DANH_MUC`, `danhMucNhanLoai`, `IdDanhMuc`, `LoaiMuc` (Task 1).
- Produces:
  `export function ChonDanhMuc(props: { loai: LoaiMuc; onChon: (danhMuc: IdDanhMuc) => void; onHuy: () => void })`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
// src/board/__tests__/ChonDanhMuc.spec.tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChonDanhMuc } from '../ChonDanhMuc'

describe('ChonDanhMuc', () => {
  it('bài viết có ĐỦ BỐN lựa chọn', () => {
    render(<ChonDanhMuc loai="bai-viet" onChon={() => {}} onHuy={() => {}} />)
    for (const ten of ['Tiếp cận vấn đề', 'ECG', 'Phác đồ', 'Hướng dẫn']) {
      expect(screen.getByRole('button', { name: ten })).toBeTruthy()
    }
  })

  it('sơ đồ chỉ có BA — Hướng dẫn không nhận sơ đồ', () => {
    render(<ChonDanhMuc loai="so-do" onChon={() => {}} onHuy={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Hướng dẫn' })).toBeNull()
  })

  it('bấm một danh mục gọi onChon với đúng id', () => {
    const onChon = vi.fn()
    render(<ChonDanhMuc loai="bai-viet" onChon={onChon} onHuy={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG' }))
    expect(onChon).toHaveBeenCalledWith('ecg')
  })

  it('phím Escape gọi onHuy', () => {
    const onHuy = vi.fn()
    render(<ChonDanhMuc loai="bai-viet" onChon={() => {}} onHuy={onHuy} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onHuy).toHaveBeenCalled()
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/board/__tests__/ChonDanhMuc.spec.tsx`
Kỳ vọng: ĐỎ — không tìm thấy module `../ChonDanhMuc`.

- [ ] **Bước 3: Viết component**

```tsx
// src/board/ChonDanhMuc.tsx
// Bảng chọn danh mục — bước GIỮA của mọi luồng tạo mục (spec §3.5, quyết định 7: không có trạng thái
// chưa-phân-loại). Dùng chung cho cả nút "Tạo bài mới" ở Trang chủ lẫn nút "+" trong lưới, nên nó
// nhận `loai` và tự lọc lựa chọn thay vì để mỗi bên gọi tự nhớ Hướng dẫn không nhận sơ đồ.
//
// KHÔNG import gì từ BlockSuite (chỉ React + ./mucMeta) — App.tsx import nó vào chunk vỏ app, D13
// canh bằng ranh-gioi-nap-bang.spec.ts.
import { useEffect } from 'react'

import { DANH_MUC, danhMucNhanLoai, type IdDanhMuc, type LoaiMuc } from './mucMeta'

export function ChonDanhMuc({
  loai,
  onChon,
  onHuy,
}: {
  loai: LoaiMuc
  onChon: (danhMuc: IdDanhMuc) => void
  onHuy: () => void
}) {
  // Escape đóng — cùng quy ước với mọi lớp phủ khác trong app. Nghe trên `document` chứ không trên
  // thẻ gốc: lúc mở, focus có thể còn nằm ở nút vừa bấm bên ngoài lớp phủ.
  useEffect(() => {
    const nghe = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onHuy()
    }
    document.addEventListener('keydown', nghe)
    return () => document.removeEventListener('keydown', nghe)
  }, [onHuy])

  const luaChon = DANH_MUC.filter((d) => danhMucNhanLoai(d.id, loai))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onHuy}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: 'var(--c-surface)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={loai === 'bai-viet' ? 'Chọn danh mục cho bài viết' : 'Chọn danh mục cho sơ đồ'}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-1">Xếp vào danh mục nào?</h2>
        <p className="text-xs text-slate-400 mb-4">Chọn xong là mở ra viết được ngay.</p>
        <div className="flex flex-col gap-2">
          {luaChon.map((d) => (
            <button
              key={d.id}
              onClick={() => onChon(d.id)}
              className="w-full text-left px-4 py-3 rounded-2xl card-press font-semibold text-slate-900"
              style={{ background: 'var(--c-surface-2)' }}
            >
              {d.ten}
            </button>
          ))}
        </div>
        <button onClick={onHuy} className="w-full mt-4 py-2 text-sm text-slate-400">
          Huỷ
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Bước 4: Chạy ca kiểm — phải XANH**

Chạy: `npx vitest run src/board/__tests__/ChonDanhMuc.spec.tsx`
Kỳ vọng: XANH (4 ca).

- [ ] **Bước 5: Nối vào nút "+" của lưới**

Trong `LuoiMuc.tsx`, thêm state:

```tsx
  // Danh mục chưa chọn xong thì chưa có bản ghi nào — quyết định 7 cấm trạng thái chưa-phân-loại,
  // nên bảng chọn phải đứng TRƯỚC lượt `add()`, không phải sau.
  const [dangChonDanhMuc, setDangChonDanhMuc] = useState<LoaiMuc | null>(null)
```

`taoBangMoi` giữ nguyên toàn bộ phần khoá chống bấm đúp (`e?.detail`, `dangSuaTenRef`), nhưng phần
sau khoá đổi thành:

```ts
    // Màn đã lọc sẵn theo một danh mục (thẻ Trang chủ) thì không hỏi lại — người dùng vừa đứng
    // trong đúng danh mục đó.
    if (danhMuc) {
      taoMucVoiDanhMuc(loaiTaoDuoc[0], danhMuc)
      return
    }
    setDangChonDanhMuc(loaiTaoDuoc[0])
```

Phần tạo bản ghi cũ chuyển NGUYÊN VĂN vào hàm mới (giữ y nguyên `hueHienCo`, khoá ref,
`setChuyenKhoaLoc(null)`, `setTruyVan('')` cùng toàn bộ chú thích đang có ở đó):

```ts
  const taoMucVoiDanhMuc = (loaiMuc: LoaiMuc, danhMucChon: IdDanhMuc) => {
    dangSuaTenRef.current = 'dang-tao'
    const luc = Date.now()
    const hueHienCo = danhSach.filter((b) => !b.daXoaLuc).map((b) => b.mauHue ?? mauOnDinh(b.id))
    const meta: MucMeta = {
      id: taoIdMuc(),
      loai: loaiMuc,
      danhMuc: danhMucChon,
      ten: TEN_MAC_DINH,
      taoLuc: luc,
      capNhatLuc: luc,
      mauHue: mauHueChongTrung(hueHienCo),
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    add(meta)
    dangSuaTenRef.current = meta.id
    setDangSuaTenId(meta.id)
    setChuyenKhoaLoc(null)
    setTruyVan('')
  }
```

Render lớp phủ ở cuối cây JSX của `LuoiMuc`:

```tsx
{dangChonDanhMuc && (
  <ChonDanhMuc
    loai={dangChonDanhMuc}
    onChon={(d) => {
      setDangChonDanhMuc(null)
      taoMucVoiDanhMuc(dangChonDanhMuc, d)
    }}
    onHuy={() => setDangChonDanhMuc(null)}
  />
)}
```

- [ ] **Bước 6: Chạy trọn bộ**

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh.

- [ ] **Bước 7: Commit**

```bash
git add src/board/ChonDanhMuc.tsx src/board/LuoiMuc.tsx src/board/__tests__/ChonDanhMuc.spec.tsx
git commit -m "feat(muc): bảng chọn danh mục, chặn trạng thái chưa-phân-loại"
```

---

## Task 5: `BoardGallery` chuyển tiếp prop lọc và thôi viết cứng `loai`

**Files:**
- Modify: `src/board/BoardGallery.tsx` (props component dòng 41-59; `<VoMuc loai="so-do">` dòng 369;
  effect `moBangYeuCau` dòng 94-102; lượt gọi `<LuoiMuc>`)
- Modify: `src/App.tsx` (lượt `<BoardGallery … />` dòng ~12814)
- Test: `src/board/__tests__/BoardGallery-loai-theo-ban-ghi.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `BoLocMuc`, `tieuDe`, `loaiTaoDuoc` (Task 3), `MucMeta.loai` (Task 1).
- Produces: `BoardGallery` nhận `BoLocMuc & { tieuDe: string; loaiTaoDuoc: LoaiMuc[] }` bên cạnh bốn
  prop hiện có (`dangHienTab`, `moBangYeuCau?`, `onMoBangYeuCauXong?`, `onDangMoBang?`).

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
// src/board/__tests__/BoardGallery-loai-theo-ban-ghi.spec.tsx
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'

// Vỏ nạp chậm thật kéo cả chunk BlockSuite — thay bằng một thẻ ghi lại `loai` nó nhận được.
vi.mock('../index', () => ({
  VoMuc: ({ loai }: { loai: string }) => <div data-testid="vo-muc" data-loai={loai} />,
}))

describe('BoardGallery chọn vỏ theo bản ghi', () => {
  it('mở một mục loai="bai-viet" thì truyền "bai-viet" xuống VoMuc', async () => {
    const muc: MucMeta = {
      id: 'muc-bv',
      loai: 'bai-viet',
      danhMuc: 'ecg',
      ten: 'Bài thử',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    await idbPut(IDB_STORES.mucs, muc)

    const { BoardGallery } = await import('../BoardGallery')
    render(
      <BoardGallery
        dangHienTab
        tieuDe="Thử"
        loaiTaoDuoc={[]}
        moBangYeuCau="muc-bv"
        onMoBangYeuCauXong={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/board/__tests__/BoardGallery-loai-theo-ban-ghi.spec.tsx`
Kỳ vọng: ĐỎ — nhận `"so-do"` (viết cứng ở dòng 369) thay vì `"bai-viet"`.

- [ ] **Bước 3: Thêm state "loại của mục đang mở"**

Trong `BoardGallery.tsx`, cạnh `openTen` (dòng ~67):

```tsx
  // Loại của mục đang mở — quyết định `index.tsx` nạp `TrangBaiViet` hay `EdgelessBoard`. Tách khỏi
  // `openOrigin` (thuần hình học, và null khi mở không qua thẻ trong lưới) vì loại PHẢI có ở mọi
  // đường mở, kể cả `moBangYeuCau` từ kết quả tìm kiếm toàn app.
  const [openLoai, setOpenLoai] = useState<LoaiMuc>('so-do')
```

Đường mở qua lưới: `onMoBang` đã nhận `boardId`; đọc loại từ `danhSach` trong `LuoiMuc` và truyền
lên qua tham số thứ tư, hoặc — đơn giản hơn và ít sửa chữ ký hơn — tra trong effect như đường dưới.

Đường `moBangYeuCau` (không đi qua lưới), sửa effect dòng 94-102:

```tsx
  useEffect(() => {
    if (!moBangYeuCau) return
    setOpenOrigin(null)
    setDangPhongTo(true)
    // Đọc loại TRƯỚC khi mở: mở nhầm vỏ rồi sửa sau nghĩa là tháo/lắp lại cả cây Lit.
    void idbGetAll<MucMeta>(IDB_STORES.mucs).then((ds) => {
      setOpenLoai(ds.find((m) => m.id === moBangYeuCau)?.loai ?? 'so-do')
      setOpenBoardId(moBangYeuCau)
    })
    onMoBangYeuCauXong?.()
  }, [moBangYeuCau, onMoBangYeuCauXong])
```

- [ ] **Bước 4: Thay `loai="so-do"` viết cứng**

Dòng 369: `loai="so-do"` → `loai={openLoai}`.

- [ ] **Bước 5: Chuyển tiếp prop lọc xuống `LuoiMuc`**

```tsx
export function BoardGallery({
  dangHienTab,
  moBangYeuCau,
  onMoBangYeuCauXong,
  onDangMoBang,
  tieuDe,
  loaiTaoDuoc,
  loai,
  danhMuc,
  danhMucLoaiTru,
  chuyenKhoa,
}: {
  dangHienTab: boolean
  moBangYeuCau?: string
  onMoBangYeuCauXong?: () => void
  onDangMoBang?: (dangMo: boolean) => void
  tieuDe: string
  loaiTaoDuoc: LoaiMuc[]
} & BoLocMuc) {
```

```tsx
<LuoiMuc
  tieuDe={tieuDe}
  loaiTaoDuoc={loaiTaoDuoc}
  loai={loai}
  danhMuc={danhMuc}
  danhMucLoaiTru={danhMucLoaiTru}
  chuyenKhoa={chuyenKhoa}
  /* … các prop hiện có giữ nguyên … */
/>
```

- [ ] **Bước 6: Sửa bên gọi trong `App.tsx`**

```tsx
<BoardGallery
  dangHienTab={screen === "mindmap"}
  tieuDe="Sơ đồ tư duy"
  loai="so-do"
  loaiTaoDuoc={['so-do']}
  moBangYeuCau={moBangYeuCau}
  onMoBangYeuCauXong={() => setMoBangYeuCau(undefined)}
  onDangMoBang={setBangDangMo}
/>
```

- [ ] **Bước 7: Chạy trọn bộ**

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh, gồm cả ca mới.

- [ ] **Bước 8: Commit**

```bash
git add src/board/BoardGallery.tsx src/App.tsx src/board/__tests__/BoardGallery-loai-theo-ban-ghi.spec.tsx
git commit -m "feat(gallery): chọn vỏ theo MucMeta.loai, chuyển tiếp prop lọc"
```

---

## Task 6: Luồng "Tạo bài mới" ở Trang chủ

**Files:**
- Modify: `src/App.tsx` (nút "Tạo bài mới" dòng 1128-1143; props `HomeScreen`; state trong `App()`)
- Test: `src/__tests__/tao-bai-moi-tu-trang-chu.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `ChonDanhMuc` (Task 4), `taoIdMuc`/`MucMeta`/`IdDanhMuc` (Task 1), `IDB_STORES.mucs`
  (Task 2), `BoardGallery` với `moBangYeuCau` (Task 5).
- Produces: `App` có state `taoBaiMoiDangMo: boolean` và hàm
  `taoBaiVietMoi(danhMuc: IdDanhMuc): Promise<void>`; `HomeScreen` nhận thêm
  `onTaoBaiMoi: () => void`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
// src/__tests__/tao-bai-moi-tu-trang-chu.spec.tsx
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbGetAll } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

vi.mock('../board/index', () => ({
  VoMuc: ({ loai }: { loai: string }) => <div data-testid="vo-muc" data-loai={loai} />,
}))

describe('Tạo bài mới từ Trang chủ', () => {
  it('bấm nút → chọn danh mục → sinh MucMeta loại bai-viet và mở vỏ trang', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Phác đồ' }))

    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      expect(ds.find((m) => m.loai === 'bai-viet')?.danhMuc).toBe('phac-do')
    })

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })
  })

  it('KHÔNG còn dẫn vào AddEntryScreen của hệ cũ', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Tạo bài mới/ }))
    expect(screen.getByRole('dialog', { name: /Chọn danh mục/ })).toBeTruthy()
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/__tests__/tao-bai-moi-tu-trang-chu.spec.tsx`
Kỳ vọng: ĐỎ — bấm nút mở `AddEntryScreen`, không có `role="dialog"` nào.

- [ ] **Bước 3: Thêm state + hàm tạo trong `App()`**

```tsx
  // Luồng "Tạo bài mới" (spec §3.5). Bảng chọn danh mục đứng ở App chứ không trong HomeScreen vì
  // sau khi tạo xong phải chuyển tab sang Mindmap và mở mục — hai việc chỉ App làm được.
  const [taoBaiMoiDangMo, setTaoBaiMoiDangMo] = useState(false)

  const taoBaiVietMoi = async (danhMuc: IdDanhMuc) => {
    const luc = Date.now()
    const meta: MucMeta = {
      id: taoIdMuc(),
      loai: 'bai-viet',
      danhMuc,
      ten: 'Bài chưa đặt tên',
      taoLuc: luc,
      capNhatLuc: luc,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    await idbPut(IDB_STORES.mucs, meta)
    setTaoBaiMoiDangMo(false)
    // Mở thẳng vào trang soạn thảo — spec §3.5 "mở thẳng TrangBaiViet", không dừng ở lưới như luồng
    // tạo sơ đồ (sơ đồ dừng lại để đặt tên vì ba bảng trống trông giống hệt nhau; bài viết thì tiêu
    // đề gõ ngay trong trang).
    setMoBangYeuCau(meta.id)
    navigate('mindmap')
  }
```

Import ở đầu `App.tsx`:

```ts
import { ChonDanhMuc } from './board/ChonDanhMuc'
import { taoIdMuc, type IdDanhMuc, type MucMeta } from './board/mucMeta'
```

**D13:** `mucMeta.ts` và `ChonDanhMuc.tsx` KHÔNG import BlockSuite, nên import GIÁ TRỊ từ chúng an
toàn cho chunk vỏ app. Xác nhận bằng
`npx vitest run src/__tests__/ranh-gioi-nap-bang.spec.ts`, đừng tin suy luận.

- [ ] **Bước 4: Xây lại nút**

```tsx
        <button
          onClick={onTaoBaiMoi}
          className="w-full flex items-center gap-3 p-4 rounded-2xl card-press text-left"
          style={{ background: "var(--c-surface)" }}
        >
          <div
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
          >
            {icons.docCross()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[15px] leading-snug">Tạo bài mới</p>
            <p className="text-xs text-slate-400 mt-0.5">Chọn danh mục rồi viết ngay</p>
          </div>
        </button>
```

`HomeScreen` nhận thêm prop `onTaoBaiMoi: () => void`; `App` truyền
`onTaoBaiMoi={() => setTaoBaiMoiDangMo(true)}`.

- [ ] **Bước 5: Render bảng chọn**

Trong cây JSX của `App`, cạnh các lớp phủ khác:

```tsx
{taoBaiMoiDangMo && (
  <ChonDanhMuc
    loai="bai-viet"
    onChon={(d) => void taoBaiVietMoi(d)}
    onHuy={() => setTaoBaiMoiDangMo(false)}
  />
)}
```

- [ ] **Bước 6: Chạy ca kiểm + trọn bộ**

Chạy: `npx vitest run src/__tests__/tao-bai-moi-tu-trang-chu.spec.tsx`
Kỳ vọng: XANH (2 ca).

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh.

- [ ] **Bước 7: Commit**

```bash
git add src/App.tsx src/__tests__/tao-bai-moi-tu-trang-chu.spec.tsx
git commit -m "feat(trang-chu): Tạo bài mới đi qua bảng chọn danh mục, mở thẳng trang soạn thảo"
```

---

## Task 7: Sáu màn hình dùng chung lưới

**Files:**
- Modify: `src/App.tsx` (`type Screen` dòng 107; nhánh render `library` dòng 12793, `guideline` dòng
  ~12820, `specialty` dòng ~12824; ba thẻ Truy cập nhanh trong `HomeScreen`)
- Test: `src/__tests__/sau-man-luoi-muc.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `BoardGallery` với `BoLocMuc` (Task 5), `DANH_MUC` (Task 1).
- Produces: `Screen` thêm nhánh `"danhMuc"`; `App` có state
  `danhMucDangXem: IdDanhMuc | null`; `HomeScreen` nhận `onMoDanhMuc: (d: IdDanhMuc) => void`.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
// src/__tests__/sau-man-luoi-muc.spec.tsx
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

vi.mock('../board/index', () => ({ VoMuc: () => <div data-testid="vo-muc" /> }))

const muc = (id: string, loai: MucMeta['loai'], danhMuc: MucMeta['danhMuc']): MucMeta => ({
  id,
  loai,
  danhMuc,
  ten: id,
  taoLuc: 1,
  capNhatLuc: 1,
  chuyenKhoa: '',
  tags: [],
  noiDungTimKiem: '',
})

describe('sáu màn dùng chung LuoiMuc', () => {
  it('Thư viện: chỉ bài viết, KHÔNG gồm Hướng dẫn', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-hd', 'bai-viet', 'huong-dan'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg', 'so-do', 'ecg'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))

    await waitFor(() => expect(screen.getByText('bv-ecg')).toBeTruthy())
    expect(screen.queryByText('bv-hd')).toBeNull()
    expect(screen.queryByText('sd-ecg')).toBeNull()
  })

  it('Hướng dẫn: đúng những mục danh mục huong-dan', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-hd2', 'bai-viet', 'huong-dan'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))

    await waitFor(() => expect(screen.getByText('bv-hd2')).toBeTruthy())
  })

  it('thẻ ECG ở Trang chủ mở lưới lọc theo danh mục ecg, trộn cả hai loại', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg3', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg3', 'so-do', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-pd3', 'bai-viet', 'phac-do'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))

    await waitFor(() => expect(screen.getByText('bv-ecg3')).toBeTruthy())
    expect(screen.getByText('sd-ecg3')).toBeTruthy()
    expect(screen.queryByText('bv-pd3')).toBeNull()
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/__tests__/sau-man-luoi-muc.spec.tsx`
Kỳ vọng: ĐỎ cả ba — Thư viện còn là `LibraryScreen` cũ, Hướng dẫn còn `ComingSoonScreen`, thẻ ECG còn
`EcgScreen`.

- [ ] **Bước 3: Thêm nhánh `Screen` và state danh mục**

```ts
type Screen =
  | "home"
  | "library"
  | "guideline"
  // Màn lưới lọc theo MỘT danh mục — thay ba màn cũ (EcgScreen, ComingSoonScreen của Phác đồ, và
  // thẻ Tiếp cận vấn đề). Danh mục nào nằm ở `danhMucDangXem`, không mã hoá vào tên màn: bốn nhánh
  // Screen gần giống nhau đúng là thứ đã bị gộp một lần rồi (xem `addInfusion`).
  | "danhMuc"
  /* … giữ nguyên phần còn lại … */
```

```tsx
  const [danhMucDangXem, setDanhMucDangXem] = useState<IdDanhMuc | null>(null)
```

- [ ] **Bước 4: Thay ba nhánh render**

```tsx
{screen === "library" && (
  <BoardGallery
    dangHienTab
    tieuDe="Thư viện"
    loai="bai-viet"
    danhMucLoaiTru={['huong-dan']}
    loaiTaoDuoc={[]}
    onDangMoBang={setBangDangMo}
  />
)}
{screen === "guideline" && (
  <BoardGallery
    dangHienTab
    tieuDe="Hướng dẫn"
    danhMuc="huong-dan"
    loaiTaoDuoc={['bai-viet']}
    onDangMoBang={setBangDangMo}
  />
)}
{screen === "danhMuc" && danhMucDangXem && (
  <BoardGallery
    dangHienTab
    tieuDe={DANH_MUC.find((d) => d.id === danhMucDangXem)?.ten ?? ''}
    danhMuc={danhMucDangXem}
    loaiTaoDuoc={['bai-viet', 'so-do']}
    onDangMoBang={setBangDangMo}
  />
)}
```

Instance tab Mindmap giữ nguyên như Task 5 Bước 6 — nó là instance DUY NHẤT luôn mount (kỹ thuật
ẩn-không-tháo, xem `docs/superpowers/specs/2026-08-19-board-gallery-design.md` §1). Ba instance mới
mount có điều kiện: chúng không giữ bảng vẽ sống nên không cần giữ zoom qua lượt chuyển tab.

- [ ] **Bước 5: Ba thẻ Truy cập nhanh trỏ sang màn danh mục**

Trong `HomeScreen`, ba thẻ "Tiếp cận vấn đề" / "ECG" / "Phác đồ" đổi `onClick` thành
`onMoDanhMuc('tiep-can')` / `onMoDanhMuc('ecg')` / `onMoDanhMuc('phac-do')`, và bỏ nhãn "Sắp ra mắt"
của hai thẻ chưa xây. `App` truyền:

```tsx
onMoDanhMuc={(d) => {
  setDanhMucDangXem(d)
  navigate('danhMuc')
}}
```

- [ ] **Bước 6: Màn chuyên khoa thành lưới lọc theo khoa**

```tsx
{screen === "specialty" && (
  <BoardGallery
    dangHienTab
    tieuDe={SPECIALTIES.find((s) => s.id === specialtyId)?.name ?? 'Chuyên khoa'}
    chuyenKhoa={specialtyId}
    loaiTaoDuoc={[]}
    onDangMoBang={setBangDangMo}
  />
)}
```

`SpecialtyScreen` (dòng 1865) KHÔNG xoá ở chặng này — giai đoạn 8 mới gỡ. Chỉ thôi render nó.

- [ ] **Bước 7: Chạy ca kiểm + trọn bộ**

Chạy: `npx vitest run src/__tests__/sau-man-luoi-muc.spec.tsx`
Kỳ vọng: XANH (3 ca).

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh. `SpecialtyScreen`/`LibraryScreen`/`EcgScreen` thành mã không được render — nếu `tsc`
báo "declared but never used" thì để nguyên và ghi chú "giai đoạn 8 xoá", KHÔNG xoá sớm (spec §4:
việc xoá là giai đoạn 8, có checklist chuỗi riêng ở §6.4).

- [ ] **Bước 8: Commit**

```bash
git add src/App.tsx src/__tests__/sau-man-luoi-muc.spec.tsx
git commit -m "feat(man-hinh): sáu màn dùng chung LuoiMuc qua BoardGallery"
```

---

## Task 8: Thẻ phân biệt loại bằng icon

**Files:**
- Modify: `src/components/SpecialtyIcons.tsx` (cạnh `iconBangSoDo`, dòng 173)
- Modify: `src/board/LuoiMuc.tsx` (huy hiệu thẻ, dòng ~265-275)
- Test: `src/board/__tests__/the-icon-loai.spec.tsx` (tạo)

**Interfaces:**
- Consumes: `MucMeta.loai` (Task 1).
- Produces: `export function iconLoaiMuc(loai: 'bai-viet' | 'so-do', cls?: string): React.ReactElement`.

**Vì sao là badge góc chứ không thay huy hiệu chính:** huy hiệu lớn giữa thẻ đang vẽ **chuyên khoa**
(`iconBangSoDo(khoa)`, và nhánh động `VeChuyenKhoaDangTai` lúc FLIP). Thay nó bằng icon loại là mất
tín hiệu chuyên khoa — thứ chủ dự án nhìn để quét lưới. Spec §3.5 chỉ đòi "phân biệt loại bằng
icon", không đòi chiếm chỗ huy hiệu.

- [ ] **Bước 1: Viết ca kiểm đỏ**

```tsx
// src/board/__tests__/the-icon-loai.spec.tsx
// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { iconLoaiMuc } from '../../components/SpecialtyIcons'

describe('iconLoaiMuc', () => {
  it('hai loại cho ra hai hình KHÁC nhau', () => {
    const { container: a } = render(iconLoaiMuc('bai-viet'))
    const { container: b } = render(iconLoaiMuc('so-do'))
    expect(a.innerHTML).not.toBe(b.innerHTML)
  })

  it('có nhãn trợ năng đọc được, không phải icon câm', () => {
    const { container } = render(iconLoaiMuc('bai-viet'))
    expect(container.querySelector('title')?.textContent).toBe('Bài viết')
    const { container: c2 } = render(iconLoaiMuc('so-do'))
    expect(c2.querySelector('title')?.textContent).toBe('Sơ đồ')
  })
})
```

- [ ] **Bước 2: Chạy để thấy đỏ**

Chạy: `npx vitest run src/board/__tests__/the-icon-loai.spec.tsx`
Kỳ vọng: ĐỎ — `does not provide an export named 'iconLoaiMuc'`.

- [ ] **Bước 3: Thêm icon**

Trong `src/components/SpecialtyIcons.tsx`, cạnh `iconBangSoDo`:

```tsx
/**
 * Icon LOẠI mục — trang giấy (bài viết) ↔ ba nút nối (sơ đồ). Khác `iconBangSoDo`, thứ vẽ CHUYÊN
 * KHOA: hai trục thông tin khác nhau, nên hai icon khác nhau ở hai chỗ khác nhau trên thẻ.
 *
 * `<title>` chứ không phải `aria-label`: SVG inline được đọc như hình, và `<title>` là cách duy
 * nhất trình đọc màn hình lấy được tên cho nó ở mọi trình duyệt.
 */
export function iconLoaiMuc(loai: 'bai-viet' | 'so-do', cls = 'w-4 h-4'): React.ReactElement {
  if (loai === 'bai-viet') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <title>Bài viết</title>
        <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
        <path d="M14 3v5h4M8.5 12h7M8.5 16h5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <title>Sơ đồ</title>
      <circle cx="5.5" cy="12" r="2.5" />
      <circle cx="18" cy="6.5" r="2.5" />
      <circle cx="18" cy="17.5" r="2.5" />
      <path d="M8 11l7.5-3.5M8 13l7.5 3.5" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Bước 4: Chạy ca kiểm — phải XANH**

Chạy: `npx vitest run src/board/__tests__/the-icon-loai.spec.tsx`
Kỳ vọng: XANH (2 ca).

- [ ] **Bước 5: Đặt badge lên thẻ**

Trong `LuoiMuc.tsx`, component vẽ huy hiệu thẻ nhận thêm `loai` và render badge ở góc trên-phải của ô
huy hiệu, NGAY SAU nhánh `dangVe ? … : …` hiện có (giữ nguyên nhánh đó, không đụng):

```tsx
        <span
          className="absolute top-1 right-1 rounded-full p-1"
          style={{ background: 'var(--c-surface)', color: 'var(--c-text-soft)' }}
        >
          {iconLoaiMuc(loai, 'w-3.5 h-3.5')}
        </span>
```

Thẻ bọc phải có `relative` để `absolute` neo đúng — kiểm class của nó trước khi thêm, đừng giả định.
Truyền `loai={muc.loai}` từ chỗ dựng thẻ trong lưới.

- [ ] **Bước 6: Chạy trọn bộ**

Chạy: `npx tsc --noEmit && npm test`
Kỳ vọng: xanh.

- [ ] **Bước 7: Xác minh trên Chrome thật**

Không dùng Browser pane. Mở lưới có cả hai loại, chụp màn hình, xác nhận badge nhìn ra được ở kích
thước thật (thẻ trên khung 390 px nhỏ hơn nhiều so với desktop) và không đè lên huy hiệu chuyên khoa.

- [ ] **Bước 8: Commit**

```bash
git add src/components/SpecialtyIcons.tsx src/board/LuoiMuc.tsx src/board/__tests__/the-icon-loai.spec.tsx
git commit -m "feat(the): badge icon phân biệt bài viết với sơ đồ"
```

---

## Tiêu chí xong giai đoạn 5–6

1. `npx tsc --noEmit` sạch; `npm test` xanh trọn bộ, không ca nào chập chờn.
2. `npm run build` xanh, `npm run kiem:dist` xanh, `npm run kiem:vendor` xanh.
3. Ca ghim tab Mindmap (`LuoiMuc-loc.spec.ts`, ca đầu tiên) xanh — và **gỡ prop `loai="so-do"` khỏi
   instance Mindmap thì nó phải ĐỎ**. Test xanh chưa chứng minh gì; chỉ lượt gỡ vá thấy đỏ mới chứng
   minh.
4. Trên Chrome thật (không phải Browser pane — nó không sinh sự kiện chuẩn hoá của
   `UIEventDispatcher`): bấm "Tạo bài mới" ở Trang chủ → chọn "Phác đồ" → mở thẳng trang soạn thảo →
   gõ tiêu đề và thân bài tiếng Việt → thoát ra → mục hiện trong tab Thư viện VÀ trong màn "Phác đồ",
   KHÔNG hiện trong tab Mindmap.
5. Cùng lượt đó, kiểm ngược: tạo một sơ đồ từ tab Mindmap → nó hiện trong Mindmap và trong màn danh
   mục đã chọn, KHÔNG hiện trong Thư viện.
6. Dưới 768 px: cả hai luồng trên vẫn chạy; thanh công cụ bàn phím ảo hiện khi soạn bài viết.
7. `grep -rn "IDB_STORES.boards" src/` — chỉ còn ở `idb.ts` (khai store, chưa xoá) và các file của hệ
   cũ mà giai đoạn 8 sẽ gỡ. `LuoiMuc.tsx` và `mucMeta.ts` không còn nhắc tới.
8. Không có `deleteObjectStore`, `deleteDatabase`; không file nào của hệ cũ bị xoá.
9. Thẻ trong lưới phân biệt được hai loại khi liếc nhanh trên khung 390 px (Task 8), và huy hiệu
   chuyên khoa vẫn đọc được — badge loại không đè lên nó.

---

## Việc của chủ dự án

- **Trước Task 2:** trả lời cổng ở đầu tài liệu — bảng sơ đồ hiện có là bảng thử (mất được) hay cần
  giữ.
- **Trước Plan 3 (giai đoạn 9):** xuất một file sao lưu bằng màn Đồng bộ dữ liệu **hiện có**. Đó là
  bảo hiểm rẻ nhất cho quyết định "bỏ toàn bộ dữ liệu cũ".

---

## KẾT QUẢ NGHIỆM THU (2026-09-06) — đã hợp nhất ở `b27d992`

Ghi lại đây vì bằng chứng kiểm tay (số đo trên Chrome thật) không nằm trong lịch sử git.

**Cổng tự động, đo trên cây ĐÃ MERGE:** `tsc --noEmit` sạch · 95 tệp / 840 ca xanh ·
`npm run build` xanh · `kiem:dist` xanh · `kiem:vendor` xanh (2782 tệp, 0 sai lệch).

**Chín tiêu chí:** đạt cả chín. Ba tiêu chí kiểm tay (4, 5, 6) làm trên Chrome thật.

| # | Bằng chứng |
|---|---|
| 3 | Gỡ `loai="so-do"` khỏi instance Mindmap trong `App.tsx` ⇒ `sau-man-luoi-muc.spec.tsx` ĐỎ (`bv-mindmap6` lọt vào lưới). Trước lượt vá, cùng thí nghiệm cho 30/30 XANH — ca ghim cũ là ghim GIẢ. |
| 4 | Tạo bài mới → Phác đồ → gõ tiếng Việt có dấu → thoát: hiện ở màn Phác đồ ✓, ở Thư viện ✓, KHÔNG ở Mindmap ✓; tiêu đề trên thẻ đúng, đủ dấu. |
| 5 | Tạo sơ đồ từ Mindmap → hiện ở Mindmap ✓ và ở màn danh mục ✓, KHÔNG ở Thư viện ✓. |
| 6 | UA Pixel 7/Android 13, `maxTouchPoints=1`, `innerWidth=375`. `drt-keyboard-toolbar` đo được `position:fixed x:0 y:766 w:375,3 h:46`, hiện rõ, dán đáy viewport 812. |
| 9 | Badge loại không đè huy hiệu chuyên khoa (overlap 0×0). Tương phản trên nền đĩa `--c-note-edge`: **4,890:1** bản sáng · **4,369:1** bản tối — vượt ngưỡng 3:1 của WCAG 1.4.11 cho đồ hoạ mang nghĩa. Ba phép tính độc lập đồng thuận. |

**Hai lỗi mà NĂM vòng review mã bỏ sót, chỉ kiểm tay mới lộ:**
1. "Tạo bài mới" xong, thoát vỏ soạn thảo thì rơi vào lưới Mindmap lọc `loai:'so-do'` — bài vừa
   viết vô hình, nav sáng đèn sai tab. Gốc: `moBangYeuCau` chỉ nối dây vào MỘT instance.
   Vá ở `767bf3b` (tổng quát hoá đường mở-theo-id).
2. Tiêu đề gõ trong trang soạn thảo không bao giờ lên thẻ ở lưới — mọi bài viết cùng mang nhãn
   "Bài chưa đặt tên". Gốc: `capNhatSauKhiRoiMuc` không đụng `ten`. Vá ở `6004333`
   (tham số `tenMoi` CHỈ `TrangBaiViet` truyền, nên tên sơ đồ không bị ghi đè).

**Bài học quy trình:** cả hai lỗi trên đều nằm ngoài tầm với của review đọc-diff. Tiêu chí kiểm tay
không phải thủ tục cho có — nó là lớp duy nhất bắt được chúng.
