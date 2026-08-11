# Báo cáo Task 2 (P0-C): Mở rộng ca canh gác `accessor` — trả nợ I5

**Trạng thái: DONE**

## Step 1 — Tái hiện lỗ hổng

Tạo `src/lib/__tests__/accessor-outside-core.spec.ts` với đúng nội dung ca canh gác cũ
(`src/core/__tests__/accessor-support.spec.ts`), chỉ khác vị trí — ngoài `src/core/`.

Chạy (trước khi sửa `vite.config.ts`):

```
npx vitest run src/lib/__tests__/accessor-outside-core.spec.ts
```

Output thật:

```
 RUN  v4.1.10 C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian

 ❯ src/lib/__tests__/accessor-outside-core.spec.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/lib/__tests__/accessor-outside-core.spec.ts [ src/lib/__tests__/accessor-outside-core.spec.ts ]
SyntaxError: Unexpected identifier 'x'

 Test Files  1 failed (1)
      Tests  no tests
   Start at  15:13:13
   Duration  263ms (transform 25ms, setup 0ms, import 0ms, tests 0ms, environment 0ms)
```

ĐỎ với `SyntaxError`, đúng như brief mô tả: `accessorSupport()` chỉ lọc `src/core/**`, nên file ở
`src/lib/` không được Babel chạm tới — rolldown/oxc nhận `accessor` chưa hạ cấp và ném lỗi ngay lúc
parse module, trước khi bất kỳ `test()` nào đăng ký được. Lỗ hổng xác nhận: `npm test` (không đụng
thư mục này) vẫn xanh trong khi mã ngoài `src/core/` dùng `accessor` vỡ hoàn toàn lúc chạy.

## Step 2 — Mở rộng phạm vi lọc

Sửa `accessorSupport()` trong `vite.config.ts`:

- **Trước**: `coreDir = path.resolve(__dirname, 'src/core')`, điều kiện
  `normalized.startsWith(coreDir + '/')`.
- **Sau**: `srcDir = path.resolve(__dirname, 'src')`, điều kiện `normalized.startsWith(srcDir + '/')`,
  cộng thêm chốt chặn riêng: `vendorDir = path.resolve(__dirname, 'src/vendor')`, nếu
  `normalized.startsWith(vendorDir + '/')` thì `return null` ngay — không đưa `src/vendor/` vào
  phạm vi lọc dù nội dung có khớp `accessor` hay không (D11: mã vendored, cấm sửa/cấm chạm).

Giữ nguyên bộ lọc theo nội dung (`/\baccessor\b/.test(code)`) — chi phí Babel chỉ tính trên file
thực sự chứa từ khoá này, không đổi theo số file trong phạm vi thư mục.

Đã kiểm trước khi sửa: `grep -rl '\baccessor\b' src/vendor/` → 0 kết quả, khớp mô tả trong brief.

## Step 3 — Bỏ fail-silent

Kiểm tra lại thấy hai nhánh `if (!stripped?.code)` / `if (!result?.code)` **đã được sửa thành
`throw`** trong lượt review trước đó của nhánh (commit `e8ab5ba "Sửa các phát hiện lượt review toàn
nhánh P0-B"`), trước khi Task 2 bắt đầu. Không cần sửa thêm ở bước này — chỉ xác nhận và giữ nguyên
cách phân biệt hai loại nhánh trượt:

- **`return null` (đúng, giữ nguyên)** — hai nhánh đầu của `transform()`:
  - File ngoài phạm vi (`!normalized.startsWith(srcDir + '/')`) hoặc không phải `.ts`/`.tsx`.
  - File trong `src/vendor/` (chốt chặn D11, thêm ở Step 2).
  - File trong phạm vi nhưng không chứa `accessor` (`!/\baccessor\b/.test(code)`).
  Ba trường hợp này nghĩa là "không phải việc của plugin này" — trả `null` đúng là để Vite/oxc xử lý
  tiếp bình thường, không phải lỗi.

- **`throw` (đã có sẵn từ trước, xác nhận giữ nguyên)** — hai nhánh sau khi **đã gọi** Babel:
  - Lượt 1 (`babel.transformAsync` với `@babel/preset-typescript`) trả về `stripped?.code` rỗng/hỏng
    → `throw new Error('accessorSupport: luot 1 (strip type TypeScript) khong tra ve code cho ${bareId}')`.
  - Lượt 2 (`@babel/plugin-proposal-decorators`) trả về `result?.code` rỗng/hỏng
    → `throw new Error('accessorSupport: luot 2 (transform decorator) khong tra ve code cho ${bareId}')`.
  Hai trường hợp này nghĩa là "plugin nhận trách nhiệm dịch file này nhưng dịch hỏng" — im lặng
  (`return null`) sẽ để Vite coi như plugin không làm gì, đẩy `accessor` chưa hạ cấp xuống oxc, và lỗi
  biên dịch thật sự biến thành `SyntaxError` khó lần lúc chạy (đúng lỗ hổng I5 mô tả). `throw` với
  tên file + lượt Babel nào hỏng giữ lỗi hiện ngay tại nguồn.

## Step 4 — Ca tái hiện phải xanh

```
npx vitest run src/lib/__tests__/accessor-outside-core.spec.ts
```

Output thật:

```
 RUN  v4.1.10 C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  15:14:05
   Duration  424ms (transform 184ms, setup 0ms, import 200ms, tests 5ms, environment 0ms)
```

XANH sau khi mở rộng phạm vi lọc.

## Step 5 — Giữ ca canh gác ở ngoài `src/core/`

Giữ `src/lib/__tests__/accessor-outside-core.spec.ts`, đã viết comment giải thích ngay trong file lý
do nó tồn tại: ca ở `src/core/__tests__/accessor-support.spec.ts` chứng minh Babel *chạy được* khi
được gọi, nhưng vì bản thân nó nằm trong `src/core/` nên luôn nằm trong phạm vi lọc dù phạm vi đúng
hay sai — không thể phát hiện lỗ hổng "bộ lọc bỏ sót thư mục X". Ca mới đặt ở `src/lib/`, ngoài
`src/core/`, nên nếu sau này ai thu hẹp phạm vi lọc lại thì ca này đỏ ngay trong khi ca cũ vẫn xanh
như không có gì — đúng cơ chế canh gác cho *độ phủ*, khác với ca cũ canh gác *cơ chế*.

Ca cũ ở `src/core/__tests__/accessor-support.spec.ts` không đổi.

## Step 6 — Chạy toàn bộ, đo lại build

```
npm test
 Test Files  10 passed (10)
      Tests  49 passed (49)
   Duration  3.40s

npx tsc --noEmit
(exit 0, không có output)
```

49 ca = 48 ca cũ (sau Task 1) + 1 ca mới (`accessor-outside-core.spec.ts`).

### Số đo build trước/sau

Trước khi sửa (`coreDir`-only, 3 lần chạy `npm run build`, chỉ lấy `built in`):

```
✓ built in 644ms
✓ built in 646ms
✓ built in 634ms
```

Sau khi sửa (`srcDir` trừ `vendorDir`, 4 lần chạy `npm run build`):

```
✓ built in 766ms   (lần chạy đầu, có warm-up)
✓ built in 654ms
✓ built in 638ms
✓ built in 647ms
```

**Kết luận**: build không chậm đi rõ rệt — dao động trước/sau nằm trong cùng khoảng nhiễu đo
(~635-650ms sau khi loại lần chạy đầu có warm-up). Output bundle **giống hệt byte-for-byte** cả hai
lần đo (`dist/assets/index-Bv1hiLRY.css` 64.75 kB, `dist/assets/index-BMHS9nXr.js` 995.89 kB, cùng
hash file).

**ĐIỀU CHỈNH (lưu ý độ chính xác)**: Phép đo này chưa phản ánh chi phí thực của việc mở rộng phạm vi lọc.
Lý do: `element-model.ts` và `local-element-model.ts` (hai file dùng `accessor`) **chưa được import từ
bất kỳ entry nào của app** (`App.tsx`/`main.tsx`), nên không nằm trong module graph lúc build — Babel
**chưa được chạy lần nào trong `npm run build`** hiện tại (con số 0 file, không phải 3). Ngược lại, khi
chạy `npm test`, 5 file được lọc ra: `element-model.ts`, `local-element-model.ts`, `accessor-support.spec.ts`,
`test-gfx-element.ts`, `accessor-outside-core.spec.ts`.

Khi chặng P1 nối tầng gfx vào entry app, Babel sẽ lần đầu tiên thực sự chạy trong `npm run build`, và
chi phí lúc đó có thể khác hẳn. **CẦN ĐO LẠI khi đó** để xác nhận Babel không gây chậm build rõ rệt
trong bối cảnh tầng gfx đã được kết nối đầy đủ.

## File thay đổi

- `vite.config.ts` — mở rộng phạm vi lọc từ `src/core/` sang toàn bộ `src/` trừ `src/vendor/`; cập
  nhật comment giải thích lý do (P1 sẽ đặt element port ngoài `src/core/`). Hai nhánh `throw` cho lỗi
  Babel thật sự đã có sẵn từ commit review P0-B trước đó, không cần sửa thêm ở Task 2.
- `src/lib/__tests__/accessor-outside-core.spec.ts` — MỚI. Ca canh gác chứng minh bộ lọc phủ đúng
  phạm vi (ngoài `src/core/`), khác với ca cũ chỉ canh gác cơ chế Babel.
