# Đẩy hiệu ứng DanhSachBang — vật liệu ảnh/giấy thật Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho màn danh sách bảng (`DanhSachBang.tsx`) một danh tính vật lý riêng (nghiêng ổn định
theo id, vào-màn/tạo-mới/xoá có animation, trạng thái rỗng được đầu tư) và vá lại chuyển cảnh
danh sách↔bảng đang mất hẳn (`.board-in`/`.board-out` mồ côi) — đúng chỉ thị charter "đẩy hết
hiệu ứng rồi để chủ dự án cắt" cho surface đáng ~70% trọng số thiết kế của app.

**Architecture:** Toàn bộ thay đổi nằm trong ba file (`DanhSachBang.tsx`, `BoardGallery.tsx`,
`index.css`), không đụng data model/IndexedDB. Một state cục bộ mới duy nhất có ý nghĩa hành vi
(`dangXoaId`, trì hoãn `remove()` thật để chạy animation xoá) — mọi thứ khác là class CSS + một
hàm băm thuần (`nghiengOnDinh`) + một cặp state/prop nhỏ để đồng bộ animation chuyển cảnh
(`vuaDongBang`/`dungTuBang`/`onHieuUngXong`).

**Tech Stack:** React 18 (hooks), CSS animation/keyframes thuần (không thư viện), Vitest +
happy-dom cho test component.

**Spec:** `docs/superpowers/specs/2026-08-21-day-hieu-ung-danh-sach-bang-design.md`

## Global Constraints

- **Không thêm `box-shadow`** cho thẻ ở trạng thái đứng yên hay hover/press — "Floating-Layer-Only
  Rule" của `DESIGN.md`. Cảm giác "nhấc lên" chỉ đến từ `transform`.
- **Mọi màu qua token `--c-*`** có sẵn (`--c-surface`, `--c-surface-soft`, `--c-line`,
  `--c-text-muted`, `--c-text`, `--c-page`) — không hex mới.
- **`prefers-reduced-motion: reduce`** tắt toàn bộ animation trang trí mới (`card-settle`,
  `card-plop`, `card-slide-out`, `empty-breathe`) nhưng **giữ nguyên** phản hồi `:active` của
  `.the-bang-vat` — đúng "Do" của `DESIGN.md` (tap-confirmation luôn sống).
- **Không đổi hành vi dữ liệu**: `add`/`update`/`remove` của `useIdbCollection` (chữ ký, hành vi
  ghi IndexedDB) giữ nguyên 100%. Duy nhất `remove()` được gọi TRỄ hơn (200ms) so với trước, không
  gọi khác đi.
- **Không đụng thời điểm unmount thật của `EdgelessBoard`** hay lượt gọi `doiGhiAnhXongNeuCo()` đã
  có trong `BoardGallery.tsx` — cửa sổ `dangDong` đã qua hai vòng review (mục 18 HANDOFF), không
  tái tạo race đã tốn công vá.
- **Tái dùng vốn từ chuyển động sẵn có**: họ easing `cubic-bezier(0.34, 1.4, 0.64, 1)` (giống
  `.card-press`/`.dose-press`/`.nav-press`), cơ chế stagger `--i`/28ms/cap-8 của `.rise-in`.
- **Test dùng timer THẬT + `choDenKhi`/`vi.waitFor`, KHÔNG `vi.useFakeTimers()`** — cả
  `DanhSachBang.spec.ts` và `BoardGallery.spec.ts` đã tự ghi lý do tránh trộn `act()` với timer giả
  (kẹt vô thời hạn); giữ đúng mẫu polling-với-timer-thật đã có.
- **`data-testid="tao-bang"` và `aria-label="Tạo bảng mới"` không đổi** trên nút tạo bảng, dù ở
  trạng thái rỗng hay lưới đã có thẻ — hai ca kiểm hiện có phụ thuộc đúng hai giá trị này.
- Custom property CSS trong style JSX viết theo đúng quy ước đã dùng trong `App.tsx`:
  `style={{ ..., "--i": i } as React.CSSProperties}` (khoá trong ngoặc kép, cast cuối cùng). Không
  cần import `React` — `as React.CSSProperties` đã hoạt động trong `App.tsx` không kèm import
  namespace `React` (JSX transform tự cấp kiểu toàn cục), giữ đúng cách đó.

---

## File Structure

| File | Vai trò trong chặng này |
|---|---|
| `src/board/DanhSachBang.tsx` | Toàn bộ logic thẻ: nghiêng, animation vào-màn/xoá, trạng thái rỗng, nhận prop chuyển cảnh mới |
| `src/board/BoardGallery.tsx` | Wiring `.board-in` lúc mở bảng, state `vuaDongBang` + truyền `dungTuBang`/`onHieuUngXong` xuống `DanhSachBang` lúc đóng |
| `src/index.css` | Mọi `@keyframes`/class mới, thêm vào đúng khối "Chuyển cảnh danh sách bảng ↔ mặt bảng" đã có (dòng ~482-607 ở bản hiện tại) |
| `src/board/__tests__/DanhSachBang.spec.ts` | Sửa 1 ca hiện có (xoá không còn tức thì) + thêm ca cho `nghiengOnDinh`, `vuaTao`, trạng thái rỗng |
| `src/board/__tests__/BoardGallery.spec.ts` | Thêm ca cho `.board-in`/`.board-out` |

Không tạo file mới — cả ba file trên đã tồn tại và đúng ranh giới trách nhiệm hiện có (theo đúng
comment đầu `DanhSachBang.tsx`: "KHÔNG phụ thuộc BlockSuite... tách hẳn khỏi ranh giới nạp chậm").

---

### Task 1: Nghiêng ổn định theo id + phản hồi vật lý tĩnh (transform-only)

**Files:**
- Modify: `src/board/DanhSachBang.tsx` (thêm hàm `nghiengOnDinh`, áp `--tilt` + class
  `the-bang-vat`)
- Modify: `src/index.css` (thêm khối `.the-bang-vat`, sau dòng 507 — ngay sau rule `.board-out`)
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Produces: `export function nghiengOnDinh(id: string): number` — băm `id` thành góc ổn định
  trong khoảng `[-3.0, 3.0]`, bước 0.1. Task 2/3 dùng lại giá trị này qua `--tilt` đã đặt trên
  outer div (không gọi lại hàm).

- [ ] **Step 1: Viết ca kiểm cho `nghiengOnDinh` (RED)**

Thêm vào **đầu file** `src/board/__tests__/DanhSachBang.spec.ts`, ngay sau dòng import hiện có
(`import { DanhSachBang } from '../DanhSachBang'`), thêm một import nữa và một `describe` mới
TRƯỚC `describe('DanhSachBang', ...)`:

```ts
import { DanhSachBang, nghiengOnDinh } from '../DanhSachBang'

describe('nghiengOnDinh', () => {
  it('cùng id → luôn cùng một góc (ổn định qua nhiều lần gọi)', () => {
    expect(nghiengOnDinh('bang-abc')).toBe(nghiengOnDinh('bang-abc'))
  })

  it('góc luôn nằm trong khoảng [-3, 3]', () => {
    const ids = ['bang-1', 'bang-2', 'bang-xyz', 'a', 'bang-' + 'x'.repeat(50)]
    for (const id of ids) {
      const goc = nghiengOnDinh(id)
      expect(goc).toBeGreaterThanOrEqual(-3)
      expect(goc).toBeLessThanOrEqual(3)
    }
  })

  it('id rỗng vẫn trả về một số hữu hạn hợp lệ, không NaN', () => {
    expect(Number.isFinite(nghiengOnDinh(''))).toBe(true)
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t nghiengOnDinh`
Expected: FAIL — `nghiengOnDinh` không tồn tại trong export của `../DanhSachBang` (lỗi import
hoặc `TypeError: nghiengOnDinh is not a function`).

- [ ] **Step 3: Thêm hàm `nghiengOnDinh` vào `DanhSachBang.tsx`**

Mở `src/board/DanhSachBang.tsx`. Ngay sau dòng `const XAC_NHAN_XOA_MS = 5000` (dòng 14 ở bản hiện
tại) và TRƯỚC `function TheTrong() {`, chèn:

```ts
// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}
```

- [ ] **Step 4: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t nghiengOnDinh`
Expected: PASS, cả 3 ca.

- [ ] **Step 5: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(board): nghiengOnDinh — góc nghiêng ổn định theo id cho thẻ bảng"
```

- [ ] **Step 6: Viết ca kiểm cho việc áp `--tilt`/class lên thẻ đã render (RED)**

Thêm vào `describe('DanhSachBang', ...)`, sau ca `'có sẵn bảng trong metadata...'` (khoảng dòng
78 ở bản hiện tại):

```ts
  it('mặt thẻ có class "the-bang-vat", thẻ ngoài có biến CSS --tilt hợp lệ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Test nghiêng', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const nut = container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement
    expect(nut.className).toContain('the-bang-vat')

    const the = container.querySelector('[data-testid="the-bang"]') as HTMLElement
    const tilt = the.style.getPropertyValue('--tilt')
    expect(tilt).toMatch(/^-?\d+(\.\d+)?deg$/)
    expect(tilt).toBe(`${nghiengOnDinh('bang-1')}deg`)
  })
```

- [ ] **Step 7: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "the-bang-vat"`
Expected: FAIL — `nut.className` không chứa `'the-bang-vat'`, `the.style.getPropertyValue('--tilt')`
trả về chuỗi rỗng.

- [ ] **Step 8: Áp `--tilt` và class `the-bang-vat` trong `TheBang`**

Trong `src/board/DanhSachBang.tsx`, hàm `TheBang`, sửa outer `<div data-testid="the-bang" ...>`
(dòng 59 ở bản hiện tại) và `<button onClick={onMo} ...>` (dòng 60-65):

```tsx
  return (
    <div
      data-testid="the-bang"
      style={{ position: 'relative', '--tilt': `${nghiengOnDinh(bang.id)}deg` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onMo}
        className="the-bang-vat"
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={`Mở bảng ${bang.ten}`}
      >
```

(Phần thân bên trong `<button>` và các phần tử sau nó — ô nhập tên, nút "⋯", menu — giữ nguyên
100%, không đổi gì.)

- [ ] **Step 9: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "the-bang-vat"`
Expected: PASS.

- [ ] **Step 10: Thêm CSS `.the-bang-vat` vào `index.css`**

Mở `src/index.css`, tìm rule `.board-out { animation: boardOut 0.2s cubic-bezier(0.22, 0.68, 0.24, 1) both; }`
(dòng 507 ở bản hiện tại). Ngay sau dòng đó, TRƯỚC `.screen-transition {`, chèn:

```css
/* Danh tính vật lý đứng yên của mặt thẻ bảng + phản hồi hover/press. KHÔNG nằm trong khối
   prefers-reduced-motion bên dưới — góc nghiêng nghỉ là một TƯ THẾ TĨNH (lựa chọn hình ảnh), không
   phải chuyển động; :active phải sống sót qua reduced-motion theo đúng "Do" của DESIGN.md.
   KHÔNG thêm box-shadow — Floating-Layer-Only Rule của DESIGN.md, cảm giác "nhấc lên" chỉ đến từ
   transform (un-rotate + scale). */
.the-bang-vat {
  transform: rotate(var(--tilt, 0deg));
  transition: transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@media (hover: hover) and (pointer: fine) {
  .the-bang-vat:hover {
    transform: rotate(0deg) scale(1.02);
  }
}
.the-bang-vat:active {
  transform: rotate(0deg) scale(0.97);
}
```

Đây là CSS thuần, không có ca kiểm tự động canh (`happy-dom` không nạp `index.css` thật trong môi
trường test) — đúng như spec §6 đã ghi ("không cố unit-test animation CSS"). Xác nhận bằng kiểm
tay trình duyệt ở Task 6 (bước cuối cùng của cả chặng).

- [ ] **Step 11: Chạy toàn bộ test + tsc để xác nhận không phá gì**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh (bộ hiện có + 4 ca mới của task này).

- [ ] **Step 12: Commit**

```bash
git add src/board/DanhSachBang.tsx src/index.css src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(board): áp --tilt + .the-bang-vat lên mặt thẻ bảng (nghiêng, hover, press)"
```

---

### Task 2: Vào màn — `.card-settle` / `.card-plop`

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Modify: `src/index.css`
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Consumes: `nghiengOnDinh` (Task 1, đã dùng gián tiếp qua `--tilt` có sẵn trên outer div).
- Produces: `TheBang` nhận thêm hai prop bắt buộc `index: number`, `vuaTao: boolean` — Task 3 sẽ
  thêm tiếp `dangXoa: boolean` vào ĐÚNG danh sách prop này.

- [ ] **Step 1: Viết ca kiểm phân biệt thẻ mới/cũ (RED)**

Thêm vào `describe('DanhSachBang', ...)`, sau ca vừa thêm ở Task 1:

```ts
  it('thẻ vừa tạo (taoLuc gần đây) có class "card-plop"; thẻ cũ có class "card-settle"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-cu', ten: 'Thẻ cũ', taoLuc: bayGio - 10_000, capNhatLuc: bayGio - 10_000 })
    await idbPut(IDB_STORES.boards, { id: 'bang-moi', ten: 'Thẻ mới', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const cac = Array.from(container.querySelectorAll('[data-testid="the-bang"]')) as HTMLElement[]
    const theCu = cac.find((el) => el.textContent?.includes('Thẻ cũ'))
    const theMoi = cac.find((el) => el.textContent?.includes('Thẻ mới'))
    expect(theCu?.className).toContain('card-settle')
    expect(theMoi?.className).toContain('card-plop')
  })
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "card-plop"`
Expected: FAIL — `theCu?.className`/`theMoi?.className` đều là chuỗi rỗng (outer div hiện chưa có
`className` nào).

- [ ] **Step 3: Thêm hằng số ngưỡng + prop `index`/`vuaTao` + logic chọn class**

Trong `src/board/DanhSachBang.tsx`:

1. Thêm hằng số, ngay dưới `const XAC_NHAN_XOA_MS = 5000`:

```ts
// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
const VUA_TAO_NGUONG_MS = 3000
```

2. Sửa chữ ký `TheBang` — thêm `index` và `vuaTao` vào object props (cả type lẫn destructure),
   ngay sau `bang: BangMeta,`/`bang,`:

```tsx
function TheBang({
  bang,
  index,
  vuaTao,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
}: {
  bang: BangMeta
  index: number
  vuaTao: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  onMo: () => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
}) {
```

3. Trong thân `TheBang`, ngay trước `return (`, thêm:

```tsx
  const lopVaoMan = vuaTao ? 'card-plop' : 'card-settle'
```

4. Sửa outer div (đã có `style` từ Task 1) — thêm `className` và `--i`:

```tsx
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{ position: 'relative', '--tilt': `${nghiengOnDinh(bang.id)}deg`, '--i': index } as React.CSSProperties}
    >
```

5. Trong `DanhSachBang`, thêm `useRef` vào import (sửa dòng `import { useEffect, useState } from 'react'`
   thành `import { useEffect, useRef, useState } from 'react'`), rồi thêm ngay sau khai báo
   `dangXacNhanXoaId`:

```tsx
  const luoBoMount = useRef(Date.now())
```

6. Trong `.map()` render danh sách (`danhSachSapXep.map((bang) => (`), đổi thành có `index` và
   truyền hai prop mới vào `TheBang`:

```tsx
        {danhSachSapXep.map((bang, index) => (
          <TheBang
            key={bang.id}
            bang={bang}
            index={index}
            vuaTao={luoBoMount.current - bang.taoLuc < VUA_TAO_NGUONG_MS}
            dangSuaTen={dangSuaTenId === bang.id}
```

(Các prop còn lại của `<TheBang>` giữ nguyên như hiện có, chỉ chèn thêm hai dòng `index=`/`vuaTao=`
ngay sau `bang={bang}`.)

- [ ] **Step 4: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "card-plop"`
Expected: PASS.

- [ ] **Step 5: Thêm CSS `cardSettle`/`.card-settle`, `cardPlop`/`.card-plop`**

Trong `src/index.css`, ngay sau khối `.the-bang-vat`/`@media (hover...)`/`.the-bang-vat:active`
vừa thêm ở Task 1 (trước `.screen-transition {`), chèn:

```css
/* Thẻ "rơi vào chỗ" lúc lưới vào màn — biến thể của .rise-in nhưng dừng ở góc nghiêng NGHỈ của
   từng thẻ (--tilt, xem nghiengOnDinh trong DanhSachBang.tsx) thay vì luôn thẳng đứng. Dùng lại
   NGUYÊN VẸN cơ chế --i/28ms/cap-8 mà .rise-in đã có — không phát minh cách stagger khác. */
@keyframes cardSettle {
  from { opacity: 0; transform: translateY(10px) rotate(0deg) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1); }
}
.card-settle {
  animation: cardSettle 0.26s cubic-bezier(0.25, 0.9, 0.35, 1) backwards;
  animation-delay: calc(min(var(--i, 0), 8) * 28ms);
}

/* Thẻ VỪA TẠO (taoLuc gần đây, xem VUA_TAO_NGUONG_MS) nảy quá đà nhẹ rồi settle, khác hẳn cảm
   giác êm của .card-settle — "vừa đặt thêm một tấm ảnh mới vào chồng". */
@keyframes cardPlop {
  0%   { opacity: 0; transform: translateY(14px) rotate(0deg) scale(0.85); }
  55%  { opacity: 1; transform: translateY(-3px) rotate(var(--tilt, 0deg)) scale(1.06); }
  100% { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1); }
}
.card-plop {
  animation: cardPlop 0.34s cubic-bezier(0.34, 1.4, 0.64, 1);
}
```

- [ ] **Step 6: Thêm hai class mới vào khối `prefers-reduced-motion`**

Trong `src/index.css`, tìm khối (dòng ~592-606 ở bản hiện tại):

```css
@media (prefers-reduced-motion: reduce) {
  .mind-sheet,
  .board-in,
  .board-out,
  .fade-in,
  .toast-in,
  .toast-in-full,
  .pulse-glow,
  .pulse-scale {
```

Đổi thành (thêm hai dòng, giữ nguyên phần còn lại của khối kể cả `.the-bang-vat` KHÔNG nằm trong
danh sách này — đúng chủ ý ghi ở Task 1 Step 10):

```css
@media (prefers-reduced-motion: reduce) {
  .mind-sheet,
  .board-in,
  .board-out,
  .fade-in,
  .toast-in,
  .toast-in-full,
  .pulse-glow,
  .pulse-scale,
  .card-settle,
  .card-plop {
```

- [ ] **Step 7: Chạy toàn bộ test + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh.

- [ ] **Step 8: Commit**

```bash
git add src/board/DanhSachBang.tsx src/index.css src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(board): .card-settle/.card-plop cho thẻ bảng vào màn"
```

---

### Task 3: Xoá trễ — `.card-slide-out` (+ sửa ca kiểm cũ)

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Modify: `src/index.css`
- Test: `src/board/__tests__/DanhSachBang.spec.ts` (SỬA một ca hiện có + thêm ca mới)

**Interfaces:**
- Consumes: `TheBang` props từ Task 2 (`index`, `vuaTao`) — giữ nguyên, thêm `dangXoa: boolean`.
- Produces: `DanhSachBang` có state nội bộ `dangXoaId: string | null` (không xuất ra ngoài module).

- [ ] **Step 1: Sửa ca kiểm cũ trước (RED — ca cũ sẽ fail với hành vi mới ngay khi ta đổi code ở Step 3)**

Trong `src/board/__tests__/DanhSachBang.spec.ts`, tìm ca hiện có (dòng 241-273 ở bản hiện tại):

```ts
  it('bấm "⋯" rồi "Xoá" HAI lần liên tiếp → bảng biến mất khỏi lưới NGAY, rồi khỏi metadata', async () => {
```

Thay TOÀN BỘ ca này bằng:

```ts
  it('bấm "⋯" rồi "Xoá" HAI lần liên tiếp → thẻ trượt ra (card-slide-out) rồi mới biến mất khỏi lưới, rồi khỏi metadata', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Sẽ bị xoá', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-1"]') as HTMLButtonElement).click()
    })
    const nutXoa = () => container.querySelector('[data-testid="xoa-bang-1"]') as HTMLButtonElement

    // Chạm lần 1: chỉ đổi nhãn, CHƯA xoá.
    await act(async () => {
      nutXoa().click()
    })
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    expect(nutXoa().textContent).toContain('Chắc chắn')

    // Chạm lần 2: bắt đầu xoá — thẻ CHƯA biến mất ngay, đang chạy .card-slide-out.
    await act(async () => {
      nutXoa().click()
    })
    const theDangXoa = container.querySelector('[data-testid="the-bang"]') as HTMLElement
    expect(theDangXoa).not.toBeNull()
    expect(theDangXoa.className).toContain('card-slide-out')
    expect(theDangXoa.style.pointerEvents).toBe('none')

    // Sau khoảng chờ animation (200ms), thẻ mới thật sự biến mất khỏi state + IndexedDB.
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    }, 3000)

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
      expect(ds.map((b) => b.id)).not.toContain('bang-1')
    })
  })
```

- [ ] **Step 2: Chạy ca kiểm đã sửa, xác nhận FAIL đúng lý do**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "card-slide-out"`
Expected: FAIL ở khẳng định `theDangXoa.className).toContain('card-slide-out')` — hành vi hiện tại
xoá tức thì, `theDangXoa` là `null` (đã `toHaveLength(0)` ngay, dòng `theDangXoa` phía trên sẽ là
`null` nên `.className` ném lỗi hoặc khẳng định trả `undefined`, tuỳ runtime — cả hai đều là FAIL,
đúng ý nghĩa RED).

- [ ] **Step 3: Thêm `dangXoaId` + đổi `onXoa`, thêm prop `dangXoa` cho `TheBang`**

Trong `src/board/DanhSachBang.tsx`:

1. Thêm hằng số, cạnh `VUA_TAO_NGUONG_MS`:

```ts
// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi remove()
// thật chạy, để animation kịp chạy hết trước khi gỡ khỏi DOM.
const XOA_TRE_MS = 200
```

2. Thêm `dangXoa: boolean` vào chữ ký `TheBang` (cả type lẫn destructure, ngay sau `vuaTao`):

```tsx
function TheBang({
  bang,
  index,
  vuaTao,
  dangXoa,
  dangSuaTen,
  ...
}: {
  bang: BangMeta
  index: number
  vuaTao: boolean
  dangXoa: boolean
  dangSuaTen: boolean
  ...
```

3. Sửa `lopVaoMan` trong thân `TheBang`:

```tsx
  const lopVaoMan = dangXoa ? 'card-slide-out' : vuaTao ? 'card-plop' : 'card-settle'
```

4. Sửa outer div — thêm `pointerEvents` có điều kiện vào `style`:

```tsx
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{
        position: 'relative',
        '--tilt': `${nghiengOnDinh(bang.id)}deg`,
        '--i': index,
        pointerEvents: dangXoa ? 'none' : undefined,
      } as React.CSSProperties}
    >
```

5. Trong `DanhSachBang`, thêm state ngay sau `dangXacNhanXoaId`:

```tsx
  const [dangXoaId, setDangXoaId] = useState<string | null>(null)
```

6. Thêm `useEffect` mới, ngay sau `useEffect` hiện có canh `dangXacNhanXoaId`:

```tsx
  useEffect(() => {
    if (!dangXoaId) return
    const idBiXoa = dangXoaId
    const id = setTimeout(() => {
      remove(idBiXoa)
      setDangXoaId(null)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangXoaId, remove])
```

7. Sửa `onXoa` trong `.map()` — thay `remove(bang.id)` bằng `setDangXoaId(bang.id)`:

```tsx
            onXoa={() => {
              if (dangXacNhanXoaId !== bang.id) {
                setDangXacNhanXoaId(bang.id)
                return
              }
              setDangXacNhanXoaId(null)
              setDangMoMenuId(null)
              setDangXoaId(bang.id)
            }}
```

8. Truyền `dangXoa` vào `<TheBang>` trong `.map()`, ngay sau `vuaTao=`:

```tsx
            dangXoa={dangXoaId === bang.id}
```

- [ ] **Step 4: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "card-slide-out"`
Expected: PASS.

- [ ] **Step 5: Viết ca kiểm cho rủi ro đã ghi ở spec §7 — xoá thẻ A không ảnh hưởng menu đang mở của thẻ B (RED)**

```ts
  it('xoá thẻ A (đang chạy card-slide-out) không đóng menu "⋯" đang mở của thẻ B', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-a', ten: 'Bảng A', taoLuc: bayGio - 20_000, capNhatLuc: bayGio - 20_000 })
    await idbPut(IDB_STORES.boards, { id: 'bang-b', ten: 'Bảng B', taoLuc: bayGio - 10_000, capNhatLuc: bayGio - 10_000 })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    // Mở menu của B trước.
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-b"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="doi-ten-bang-b"]')).not.toBeNull()

    // Xoá A (hai chạm) — KHÔNG mở menu của A trước, chỉ thao tác trực tiếp qua state nội bộ bằng
    // đúng luồng UI: mở menu A, chạm Xoá hai lần.
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-a"]') as HTMLButtonElement).click()
    })
    const nutXoaA = () => container.querySelector('[data-testid="xoa-bang-a"]') as HTMLButtonElement
    await act(async () => { nutXoaA().click() })
    await act(async () => { nutXoaA().click() })

    // Menu của B mở lúc đầu đã bị đóng bởi bước mở-menu-A (đúng hành vi sẵn có: mở menu khác thì
    // đóng menu cũ, dangMoMenuId chỉ giữ MỘT id) — kiểm đúng điều đó, không phải lỗi mới.
    expect(container.querySelector('[data-testid="doi-ten-bang-b"]')).toBeNull()
    // Thẻ B vẫn còn nguyên, không bị ảnh hưởng bởi việc A đang trượt ra.
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng B')
  })
```

- [ ] **Step 6: Chạy ca kiểm, xác nhận PASS ngay (đây là ca kiểm XÁC NHẬN hành vi đã đúng qua state
  độc lập theo id — không kỳ vọng RED, vì `dangMoMenuId`/`dangXoaId` vốn đã tách theo id từ thiết
  kế Task 3 Step 3; ca này tồn tại để GHIM lại bất biến đó, phòng hồi quy sau này)**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "không đóng menu"`
Expected: PASS ngay từ lượt chạy đầu.

- [ ] **Step 7: Thêm CSS `cardSlideOut`/`.card-slide-out`**

Trong `src/index.css`, ngay sau khối `.card-plop { ... }` vừa thêm ở Task 2 (trước
`.screen-transition {`), chèn:

```css
/* Thẻ bị xoá trượt/rút khỏi chồng thay vì biến mất tức thì. forwards giữ trạng thái cuối (opacity
   0) trong khoảng chờ ngắn trước khi component thật sự gỡ nó khỏi DOM (XOA_TRE_MS trong
   DanhSachBang.tsx).
   KHÔNG dùng var(--tilt) ở đây — SỬA THEO RULING review Task 2 (ledger): .the-bang-vat (nút con)
   đã có rotate(var(--tilt)) CỐ ĐỊNH suốt vòng đời; nếu outer div này CŨNG animate rotate(var(--tilt)
   ...) thì hai rotate lồng nhau cộng dồn (nghiêng gấp đôi rồi giật khi animation hết fill-mode —
   đúng lỗi đã vá ở .card-settle/.card-plop). Outer div ở đây chỉ đóng góp một góc CỐ ĐỊNH nhỏ
   (-8deg, không tham chiếu --tilt) — cộng với --tilt cố định của nút con cho đúng hiệu ứng "nghiêng
   thêm khi trượt ra" mà không tính --tilt hai lần. */
@keyframes cardSlideOut {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to   { opacity: 0; transform: translateX(-24px) rotate(-8deg) scale(0.92); }
}
.card-slide-out {
  animation: cardSlideOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}
```

- [ ] **Step 8: Thêm `.card-slide-out` vào khối `prefers-reduced-motion`**

Sửa khối đã cập nhật ở Task 2 Step 6, thêm một dòng nữa:

```css
  .card-settle,
  .card-plop,
  .card-slide-out {
```

- [ ] **Step 9: Chạy toàn bộ test + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh (kể cả ca đã SỬA ở Step 1 và ca mới ở Step 5).

- [ ] **Step 10: Commit**

```bash
git add src/board/DanhSachBang.tsx src/index.css src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(board): xoá thẻ trượt ra (.card-slide-out) thay vì biến mất tức thì"
```

---

### Task 4: Trạng thái rỗng — đầu tư riêng

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Modify: `src/index.css`
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Consumes: không phụ thuộc gì mới từ Task 1-3 ngoài cấu trúc `DanhSachBang` hiện tại.
- Produces: hàm nội bộ `taoBangMoi` (dùng chung cho cả hai vị trí nút "+"), không xuất ra module.

- [ ] **Step 1: Viết ca kiểm — trạng thái rỗng có minh hoạ + lời mời, giữ nguyên testid/aria-label (RED một phần: hai ca CŨ phải vẫn xanh không sửa, ca MỚI dưới đây kiểm nội dung mời gọi)**

Thêm vào `describe('DanhSachBang', ...)`:

```ts
  it('rỗng lúc đầu → có lời mời và minh hoạ, KHÔNG chỉ mỗi nút "+" trần', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.textContent).toContain('Bắt đầu một sơ đồ tư duy mới')
    // Nút tạo vẫn đúng testid/aria-label — hai ca kiểm cũ dựa vào đúng hai giá trị này.
    const nut = container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement
    expect(nut.getAttribute('aria-label')).toBe('Tạo bảng mới')
  })
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "lời mời"`
Expected: FAIL — `container.textContent` chưa chứa `'Bắt đầu một sơ đồ tư duy mới'`.

- [ ] **Step 3: Tách `taoBangMoi`, thêm khối trạng thái rỗng, thêm class `.empty-breathe`**

Trong `src/board/DanhSachBang.tsx`, hàm `DanhSachBang` — thay TOÀN BỘ phần từ `if (loading) return null`
tới hết `return (...)` (khoảng dòng 154-217 ở bản hiện tại, SAU khi Task 1-3 đã áp dụng) bằng:

```tsx
  if (loading) return null

  const danhSachSapXep = [...danhSach].sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  const bayGio = luoBoMount.current

  const taoBangMoi = () => {
    const luc = Date.now()
    const meta: BangMeta = { id: taoIdBang(), ten: 'Bảng chưa đặt tên', taoLuc: luc, capNhatLuc: luc }
    add(meta)
    onMoBang(meta.id)
  }

  return (
    <div className="scroll-ios h-full">
      {danhSachSapXep.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70%',
            gap: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div className="empty-breathe" style={{ width: 96, height: 72, color: 'var(--c-text-muted, #b5aa8f)' }}>
            <TheTrong />
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-muted, #8a8378)', margin: 0 }}>
            Bắt đầu một sơ đồ tư duy mới
          </p>
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            style={{
              width: 96,
              height: 72,
              border: '2px dashed var(--c-line, #d5cdb8)',
              borderRadius: 8,
              background: 'none',
              fontSize: 28,
              color: 'var(--c-text-muted, #b5aa8f)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
          {danhSachSapXep.map((bang, index) => (
            <TheBang
              key={bang.id}
              bang={bang}
              index={index}
              vuaTao={bayGio - bang.taoLuc < VUA_TAO_NGUONG_MS}
              dangXoa={dangXoaId === bang.id}
              dangSuaTen={dangSuaTenId === bang.id}
              dangMoMenu={dangMoMenuId === bang.id}
              dangXacNhanXoa={dangXacNhanXoaId === bang.id}
              onMo={() => onMoBang(bang.id)}
              onBatMenu={() => setDangMoMenuId(dangMoMenuId === bang.id ? null : bang.id)}
              onBatSuaTen={() => {
                setDangMoMenuId(null)
                setDangSuaTenId(bang.id)
              }}
              onLuuTen={(tenMoi) => {
                setDangSuaTenId(null)
                const tenSach = tenMoi.trim() || bang.ten
                update({ ...bang, ten: tenSach, capNhatLuc: Date.now() })
              }}
              onXoa={() => {
                if (dangXacNhanXoaId !== bang.id) {
                  setDangXacNhanXoaId(bang.id)
                  return
                }
                setDangXacNhanXoaId(null)
                setDangMoMenuId(null)
                setDangXoaId(bang.id)
              }}
            />
          ))}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            style={{
              aspectRatio: '4 / 3',
              border: '2px dashed var(--c-line, #d5cdb8)',
              borderRadius: 8,
              background: 'none',
              fontSize: 24,
              color: 'var(--c-text-muted, #b5aa8f)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
```

(Task 5 sẽ sửa lại đúng `<div className="scroll-ios h-full">` này thêm một lần nữa để cấy
`.board-out` — không phải lỗi trùng lặp, là hai lượt chỉnh liên tiếp trên cùng một dòng.)

- [ ] **Step 4: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "lời mời"`
Expected: PASS.

- [ ] **Step 5: Chạy TOÀN BỘ bộ test của file này, xác nhận hai ca cũ về trạng thái rỗng/tạo bảng vẫn xanh KHÔNG SỬA**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts`
Expected: toàn bộ PASS, gồm cả `'rỗng lúc đầu → chỉ hiện thẻ "+"'` (dòng 58-66 gốc — vẫn đúng vì
`the-bang` vẫn 0 phần tử, `tao-bang` vẫn có mặt) và `'bấm thẻ "+" → gọi onMoBang...'` (dòng 80-105
gốc — vẫn đúng vì `taoBangMoi` giữ nguyên logic `taoIdBang()`+`add()`+`onMoBang()`).

- [ ] **Step 6: Thêm CSS `.empty-breathe`**

Trong `src/index.css`, ngay sau khối `.card-slide-out { ... }` vừa thêm ở Task 3 (trước
`.screen-transition {`), chèn:

```css
/* Nhịp thở nhẹ mời gọi ở trạng thái rỗng — LẶP VÔ HẠN nên PHẢI gate reduced-motion (khác các
   animation chạy-một-lần khác trong file này). */
@keyframes emptyBreathe {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.65; transform: scale(1.04); }
}
.empty-breathe {
  animation: emptyBreathe 2.4s ease-in-out infinite;
}
```

- [ ] **Step 7: Thêm `.empty-breathe` vào khối `prefers-reduced-motion`**

```css
  .card-settle,
  .card-plop,
  .card-slide-out,
  .empty-breathe {
```

- [ ] **Step 8: Chạy toàn bộ test + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh.

- [ ] **Step 9: Commit**

```bash
git add src/board/DanhSachBang.tsx src/index.css src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(board): trạng thái rỗng có minh hoạ + lời mời + nhịp thở nhẹ"
```

---

### Task 5: Chuyển cảnh — vá lại `.board-in`/`.board-out` mồ côi

**Files:**
- Modify: `src/board/BoardGallery.tsx`
- Modify: `src/board/DanhSachBang.tsx`
- Test: `src/board/__tests__/BoardGallery.spec.ts`

**Interfaces:**
- Produces: `DanhSachBang` nhận thêm hai prop OPTIONAL mới: `dungTuBang?: boolean`,
  `onHieuUngXong?: () => void`. Không đổi prop bắt buộc `onMoBang` đã có.

- [ ] **Step 1: Viết ca kiểm cho `.board-in` lúc mở bảng (RED)**

Thêm vào `describe('BoardGallery', ...)` trong `src/board/__tests__/BoardGallery.spec.ts`, sau ca
`'bấm một thẻ bảng → mount EdgelessBoard...'`:

```ts
  it('bấm một thẻ bảng → boc-bang có class "board-in"', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    const boc = container.querySelector('[data-testid="boc-bang"]')
    expect(boc?.className).toContain('board-in')
  })
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "board-in"`
Expected: FAIL — `boc?.className` không chứa `'board-in'`.

- [ ] **Step 3: Áp `.board-in` + `key` lên `boc-bang` trong `BoardGallery.tsx`**

Trong `src/board/BoardGallery.tsx`, sửa khối render (dòng 86-91 ở bản hiện tại):

```tsx
      {openBoardId && (
        <div
          key={openBoardId}
          data-testid="boc-bang"
          className={`absolute inset-0 board-in${dangHienTab ? '' : ' invisible pointer-events-none'}`}
          inert={!dangHienTab}
        >
```

(Phần còn lại của khối — `<EdgelessBoard boardId={openBoardId} />`, nút quay lại — giữ nguyên.)

- [ ] **Step 4: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "board-in"`
Expected: PASS.

- [ ] **Step 5: Chạy lại ca kiểm cũ `'dangHienTab=false trong khi có bảng mở...'` để xác nhận
  `.toContain('invisible')` vẫn đúng dù `className` giờ dài hơn**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "VẪN mount"`
Expected: PASS — `className` giờ là `"absolute inset-0 board-in invisible pointer-events-none"`,
`.toContain('invisible')` vẫn khớp.

- [ ] **Step 6: Viết ca kiểm cho `.board-out` lúc quay lại danh sách (RED)**

```ts
  it('bấm quay lại → DanhSachBang tái xuất hiện có class "board-out", rồi tự mất sau đó', async () => {
    await idbPut(IDB_STORES.boards, taoBangGia('Bảng test'))
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    const luoi = container.querySelector('.scroll-ios')
    expect(luoi?.className).toContain('board-out')

    // Sau ~220ms, cờ tự tắt — class board-out biến mất khỏi lượt render kế tiếp.
    await choDenKhi(() => {
      expect(container.querySelector('.scroll-ios')?.className).not.toContain('board-out')
    }, 3000)
  })
```

- [ ] **Step 7: Chạy ca kiểm, xác nhận FAIL**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "tái xuất hiện"`
Expected: FAIL — `luoi?.className` không chứa `'board-out'` (chưa có wiring).

- [ ] **Step 8: Thêm state `vuaDongBang` + truyền prop xuống `DanhSachBang` trong `BoardGallery.tsx`**

Trong `src/board/BoardGallery.tsx`:

1. Thêm state, ngay sau `const [dangDong, setDangDong] = useState(false)`:

```tsx
  // "vừa đóng một bảng" — cho DanhSachBang biết để chạy .board-out đúng MỘT lần khi nó tái xuất
  // hiện. KHÔNG dùng chung với dangDong (dangDong canh cuộc đua ảnh xem trước, không liên quan
  // animation) — hai mối quan tâm tách biệt dù cùng bật/tắt gần nhau trong thời gian.
  const [vuaDongBang, setVuaDongBang] = useState(false)
```

2. Trong `onClick` của nút "quay lại" (`data-testid="quay-lai"`), thêm dòng `setVuaDongBang(true)`
   ngay sau `setDangDong(true)` (KHÔNG đổi thứ tự các dòng còn lại của handler):

```tsx
            onClick={async () => {
              setDangDong(true)
              setVuaDongBang(true)
              setOpenBoardId(null)

              await new Promise((r) => setTimeout(r, 0))
              await doiGhiAnhXongNeuCo()
              setDangDong(false)
            }}
```

3. Sửa dòng render `<DanhSachBang onMoBang={setOpenBoardId} />` thành:

```tsx
      {!openBoardId && !dangDong && dangHienTab && (
        <DanhSachBang
          onMoBang={setOpenBoardId}
          dungTuBang={vuaDongBang}
          onHieuUngXong={() => setVuaDongBang(false)}
        />
      )}
```

- [ ] **Step 9: Nhận prop `dungTuBang`/`onHieuUngXong` trong `DanhSachBang.tsx`, áp class `board-out`**

Trong `src/board/DanhSachBang.tsx`:

1. Sửa chữ ký `export function DanhSachBang({ onMoBang }: { onMoBang: (boardId: string) => void })`
   thành:

```tsx
export function DanhSachBang({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
}: {
  onMoBang: (boardId: string) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
}) {
```

2. Thêm `useEffect` mới, ngay sau `useEffect` canh `dangXoaId` (đã thêm ở Task 3):

```tsx
  // Hiệu ứng .board-out chỉ chạy MỘT LẦN khi vừa đóng một bảng (dungTuBang=true) — tự báo xong
  // sau khi animation (0,2s, xem index.css) kết thúc, cộng biên an toàn nhỏ. KHÔNG chạy khi
  // DanhSachBang mount vì lý do khác (vd lần đầu vào tab Mindmap) — dungTuBang khi đó là
  // undefined/false, effect này không làm gì.
  useEffect(() => {
    if (!dungTuBang) return
    const id = setTimeout(() => onHieuUngXong?.(), 220)
    return () => clearTimeout(id)
  }, [dungTuBang, onHieuUngXong])
```

3. Sửa dòng `<div className="scroll-ios h-full">` (đã có từ Task 4 Step 3) thành:

```tsx
    <div className={`scroll-ios h-full${dungTuBang ? ' board-out' : ''}`}>
```

- [ ] **Step 10: Chạy lại ca kiểm, xác nhận PASS**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "tái xuất hiện"`
Expected: PASS.

- [ ] **Step 11: Chạy toàn bộ test + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh (cả hai file `DanhSachBang.spec.ts`/`BoardGallery.spec.ts`
và toàn bộ bộ test còn lại của repo — task này không đụng gì ngoài hai file component).

- [ ] **Step 12: Commit**

```bash
git add src/board/BoardGallery.tsx src/board/DanhSachBang.tsx src/board/__tests__/BoardGallery.spec.ts
git commit -m "feat(board): vá lại .board-in/.board-out cho chuyển cảnh danh sách bảng ↔ mặt bảng"
```

---

### Task 6 (LỚP C — tuỳ chọn, cắt tự do): Hoạ tiết nền + nghiêng theo con trỏ

**Đánh dấu rõ:** mọi thay đổi của task này nằm gọn trong đúng một commit, có thể `git revert` độc
lập mà KHÔNG ảnh hưởng Task 1-5 (không có task nào sau đây phụ thuộc vào task này).

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Modify: `src/index.css`
- Test: không thêm ca kiểm tự động mới (JS chỉ cập nhật CSS custom property qua `pointermove`,
  không có logic nhánh đáng kiểm bằng unit test — xác nhận bằng kiểm tay trình duyệt ở bước cuối).

- [ ] **Step 1: Thêm CSS hoạ tiết nền**

Trong `src/index.css`, ngay sau khối `.empty-breathe { ... }` vừa thêm ở Task 4 (trước
`.screen-transition {`), chèn:

```css
/* LỚP C — có thể gỡ độc lập (git revert commit này) mà không ảnh hưởng phần còn lại của chặng.
   Hoạ tiết nền mờ sau lưới thẻ — CSS thuần, không ảnh (giữ offline/bundle gọn), độ mờ rất thấp,
   không đảo ngược sáng/tối cho nhau (đúng luật "không invert theme" của DESIGN.md). */
.danh-sach-bang-nen {
  position: relative;
}
.danh-sach-bang-nen::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: repeating-linear-gradient(
    45deg,
    var(--c-text) 0,
    var(--c-text) 1px,
    transparent 1px,
    transparent 12px
  );
}

/* LỚP C — nghiêng nhẹ theo vị trí con trỏ khi hover, chỉ bật với chuột thật (không giả trên cảm
   ứng). JS (DanhSachBang.tsx) cập nhật --con-tro-x/--con-tro-y qua pointermove; nếu JS không chạy
   (hoặc trên cảm ứng, nơi media query dưới đây không khớp), thẻ vẫn dùng đúng .the-bang-vat:hover
   tĩnh của Task 1 — không có gì hỏng nếu bỏ qua lớp này. */
@media (hover: hover) and (pointer: fine) {
  .the-bang-vat.the-bang-nghieng-con-tro:hover {
    transform: perspective(400px)
      rotateX(calc((var(--con-tro-y, 0.5) - 0.5) * -6deg))
      rotateY(calc((var(--con-tro-x, 0.5) - 0.5) * 6deg))
      scale(1.02);
  }
}
```

- [ ] **Step 2: Thêm listener `pointermove`/`pointerleave` trong `TheBang`**

Trong `src/board/DanhSachBang.tsx`, thêm `useRef` cho phần tử nút (đã import `useRef` từ Task 2),
sửa `<button onClick={onMo} className="the-bang-vat" ...>` thành có thêm class + handler:

```tsx
  const nutRef = useRef<HTMLButtonElement>(null)

  // ... (giữ nguyên phần trên, trong return):

      <button
        ref={nutRef}
        type="button"
        onClick={onMo}
        className="the-bang-vat the-bang-nghieng-con-tro"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const el = nutRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          el.style.setProperty('--con-tro-x', String((e.clientX - r.left) / r.width))
          el.style.setProperty('--con-tro-y', String((e.clientY - r.top) / r.height))
        }}
        onPointerLeave={() => {
          nutRef.current?.style.removeProperty('--con-tro-x')
          nutRef.current?.style.removeProperty('--con-tro-y')
        }}
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={`Mở bảng ${bang.ten}`}
      >
```

`e.pointerType !== 'mouse'` chặn hẳn công việc tính toán trên cảm ứng ngay ở JS (không chỉ dựa vào
media query CSS) — đúng ràng buộc hiệu năng đã ghi trong spec §3.6/§7 ("không có công việc mỗi
khung hình" trên thiết bị không cần).

- [ ] **Step 3: Áp `className="danh-sach-bang-nen"` cho lưới (không áp cho trạng thái rỗng — hoạ
  tiết chỉ có ý nghĩa khi có thẻ thật để "nằm trên")**

Sửa `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>` (nhánh
KHÔNG rỗng, từ Task 4) thành:

```tsx
        <div className="danh-sach-bang-nen" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
```

- [ ] **Step 4: Chạy toàn bộ test + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, mọi ca kiểm xanh (task này không đổi hành vi mà bất kỳ ca kiểm nào canh).

- [ ] **Step 5: Commit**

```bash
git add src/board/DanhSachBang.tsx src/index.css
git commit -m "feat(board): LỚP C tuỳ chọn — hoạ tiết nền + nghiêng theo con trỏ (revert được độc lập)"
```

- [ ] **Step 6: Kiểm tay trên trình duyệt thật — xác nhận toàn bộ chặng (Task 1-6)**

Mở dev server (`drtrong-dev` qua Browser pane, giống lượt kiểm BoardGallery 2026-08-21), vào tab
Mindmap, và xác nhận từng mục:

1. Thẻ nghiêng nhẹ, khác nhau giữa các thẻ, ổn định (reload trang, góc không đổi).
2. Hover chuột (PC): thẻ hết nghiêng + phóng nhẹ + (nếu Task 6 chưa bị cắt) nghiêng theo vị trí
   con trỏ. KHÔNG có bóng đổ mới nào xuất hiện.
3. Tạo bảng mới, quay lại danh sách: thẻ mới nảy rõ hơn thẻ cũ.
4. Xoá một thẻ: thấy nó trượt/mờ đi trước khi biến mất (~200ms), không phải biến mất tức thì.
5. Xoá hết thẻ: trạng thái rỗng có minh hoạ + lời mời + nút lớn, nhịp thở nhẹ.
6. Mở một bảng: nội dung mới xuất hiện có phóng nhẹ (`.board-in`).
7. Đóng bảng (nút "←"): quay lại danh sách có cảm giác "lùi ra" (`.board-out`), không nháy trắng
   mới nào so với lượt kiểm BoardGallery trước đó (2026-08-21).
8. DevTools → emulate `prefers-reduced-motion: reduce` → mọi hiệu ứng trang trí tắt, riêng phản
   hồi chạm (hover/press un-rotate) vẫn hoạt động.
9. Chuyển tab Mindmap → Trang chủ → Mindmap (KHÔNG mở/đóng bảng nào) → danh sách KHÔNG chạy
   `.board-out` (đúng thiết kế — chỉ chạy khi thật sự vừa đóng một bảng).

Nếu bất kỳ mục nào sai, quay lại đúng Task tương ứng để sửa trước khi coi chặng là xong — không
dừng ở "bảy cổng xanh" (bài học #2 của `HANDOFF.md`).

---

## Self-Review (đã chạy, ghi lại kết quả)

**1. Spec coverage:**

| Mục spec | Task |
|---|---|
| §3.1 Nghiêng ổn định | Task 1 |
| §2 Không box-shadow, chỉ transform | Task 1 |
| §3.2 `.card-settle`/`.card-plop` | Task 2 |
| §3.3 Xoá trễ `.card-slide-out` | Task 3 |
| §3.4 Trạng thái rỗng | Task 4 |
| §3.5 `.board-in`/`.board-out` (đã sửa hướng hiểu) | Task 5 |
| §3.6 Lớp C (nền + nghiêng con trỏ) | Task 6 |
| §5 Điểm không dùng `vi.useFakeTimers()` | Áp dụng xuyên suốt Task 3/5 |
| §6 Sửa ca kiểm xoá cũ | Task 3 Step 1 |
| §6 Ca kiểm menu độc lập theo id | Task 3 Step 5 |
| §6 Giữ `data-testid="tao-bang"`/`aria-label` | Task 4 Step 1, Step 5 |
| §9.6 reduced-motion không tắt `:active` | Task 1 Step 10 (comment giải thích), xác nhận tay ở Task 6 Step 6 mục 8 |
| §9.8 Kiểm tay trình duyệt thật | Task 6 Step 6 |

Không có mục nào trong spec thiếu task tương ứng.

**2. Placeholder scan:** không còn "TBD"/"TODO"/"add appropriate..." — mọi step có code đầy đủ,
không có step nào chỉ mô tả mà không kèm code.

**3. Type consistency:** `TheBang` props tích luỹ đúng thứ tự qua các task —
`bang, index, vuaTao, dangXoa, dangSuaTen, dangMoMenu, dangXacNhanXoa, onMo, onBatMenu,
onBatSuaTen, onLuuTen, onXoa` — mỗi task chỉ CHÈN THÊM vào đúng vị trí đã khai, không đổi tên
prop nào đã đặt ở task trước (`vuaTao` không đổi thành `vuaTaoBang`, `dangXoa` không đổi thành
`dangBiXoa`, v.v., xuyên suốt Task 2→3→4). `nghiengOnDinh` được gọi với đúng chữ ký
`(id: string): number` ở mọi nơi dùng (Task 1 định nghĩa, Task 1 Step 8 gọi, Task 2/3/4 chỉ dùng
lại `--tilt` đã có trên outer div, không gọi lại hàm). `dungTuBang`/`onHieuUngXong` khớp tên ở cả
`BoardGallery.tsx` (nơi truyền) và `DanhSachBang.tsx` (nơi nhận) — Task 5 Step 8/9.

---

Plan complete and saved to `docs/superpowers/plans/2026-08-21-day-hieu-ung-danh-sach-bang.md`. Hai
lựa chọn thi hành:

**1. Subagent-Driven (khuyến nghị)** — tôi dispatch một subagent mới cho từng task, review giữa
các task, lặp nhanh.

**2. Inline Execution** — thi hành các task ngay trong phiên này, chạy theo lô có điểm dừng để
review.

Bạn muốn cách nào?
