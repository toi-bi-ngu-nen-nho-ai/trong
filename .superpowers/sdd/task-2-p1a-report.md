# Task 2 (P1-A) Report: bằng chứng mutation cho `vendor-decorator.spec.ts`

Đây là báo cáo MỚI cho Finding 2 (review nhánh `worktree-p1a-nhung-edgeless`). File
`.superpowers/sdd/task-2-report.md` là báo cáo của một chặng khác (P0-C) — không đụng vào, không
ghi đè lên nó, để khỏi ai nhầm là báo cáo của chặng này.

## Bối cảnh

`src/__tests__/vendor-decorator.spec.ts` có 3 ca kiểm, đọc file đã dịch
`.vendor-build/framework/std/src/view/element/lit-host.js` (không chạy nó — đọc thứ tự trong
nguồn):

1. File tồn tại (bước dịch đã chạy).
2. Không còn từ khoá `accessor` chưa hạ cấp.
3. Trong constructor, `super()` đứng trước mọi truy cập `this` (chặn đúng lỗi thật đã gặp:
   `@provide` của `@lit/context` đặt trên một `accessor`, decorator hạ cấp sai → mã sinh ra chạm
   `this` TRƯỚC `super()` → trình duyệt ném "Must call super constructor in derived class").

Ca 3 đã bị viết lại trong task này. Phần dưới ghi lại: plan gốc quy định gì, vì sao nó
false-positive trên output thật, đổi thành gì, và toàn bộ output lệnh cho các lượt đỏ/xanh.

## Plan gốc quy định gì cho ca 3

`.superpowers/sdd/task-2-brief.md` (Step 4) viết ca 3 như sau — cửa sổ lùi CỐ ĐỊNH quanh lần
xuất hiện đầu tiên của `super(` trong toàn file:

```ts
it('trong constructor, super() đứng trước mọi truy cập this', () => {
  const js = readFileSync(FILE, 'utf8')
  const iSuper = js.indexOf('super(')
  expect(iSuper).toBeGreaterThan(-1)

  // Lấy đoạn từ đầu class tới super(); trong đó không được có `this.`
  const truocSuper = js.slice(Math.max(0, iSuper - 600), iSuper)
  const dongCuoi = truocSuper.split('\n').slice(-6).join('\n')
  expect(dongCuoi).not.toMatch(/this\./)
})
```

Tức: lấy 600 ký tự trước `super(` đầu tiên trong file, rồi lấy 6 dòng cuối của đoạn đó, kiểm
không chứa `this.`.

## Vì sao nó false-positive trên output thật

Trong `lit-host.js` thật, phần hạ cấp `accessor` sinh ra các cặp getter/setter dùng private
field lưu trữ (`#x_accessor_storage` / `get x()` / `set x()`), và các cặp này nằm NGAY PHÍA TRÊN
constructor trong thân class. Bản thân chúng chứa `this.` hợp lệ (thân của một method khác, chạy
lúc runtime sau, không phải câu lệnh chạy trước `super()`). Class đầu tiên trong file có 2
accessor (`store`, `std`), mỗi cặp 3 dòng — đúng 6 dòng, vừa khít cửa sổ lùi cố định của plan gốc.
Cửa sổ đọc trúng các dòng getter/setter đó và báo đỏ trên mã ĐÚNG:

```
$ npx vitest run src/__tests__/tmp-mutation-check.spec.ts   # ca 3 GỐC theo plan, chạy trên FILE THẬT, không mutate

 ❯ src/__tests__/tmp-mutation-check.spec.ts (1 test | 1 failed) 7ms
     × trong constructor, super() đứng trước mọi truy cập this (bản plan gốc) 6ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/tmp-mutation-check.spec.ts > ca 3 GỐC theo plan (cửa sổ lùi cố định) — chạy trên file thật, không mutate > trong constructor, super() đứng trước mọi truy cập this (bản plan gốc)
AssertionError: expected '        set store(value) { this.#stor…' not to match /this\./

- Expected:
/this\./

+ Received:
"        set store(value) { this.#store_accessor_storage = value; }
        #std_accessor_storage;
        get std() { return this.#std_accessor_storage; }
        set std(value) { this.#std_accessor_storage = value; }
        constructor() {
            "

 ❯ src/__tests__/tmp-mutation-check.spec.ts:20:26
     18|     const truocSuper = js.slice(Math.max(0, iSuper - 600), iSuper)
     19|     const dongCuoi = truocSuper.split('\n').slice(-6).join('\n')
     20|     expect(dongCuoi).not.toMatch(/this\./)
       |                          ^
     21|   })
     22| })

 Test Files  1 failed (1)
      Tests  1 failed (1)
```

Đây chính là "một cổng đỏ giả" — báo lỗi trên mã đã dịch đúng, vì cửa sổ cố định không phân
biệt được "thân method khác đứng trước constructor" với "câu lệnh đầu constructor".

## Đổi thành gì

Neo vào chính token `constructor(` thay vì lùi số ký tự/số dòng cố định: tìm `constructor(`, tìm
dấu `{` mở thân constructor ngay sau đó, tìm `super(` đầu tiên SAU dấu `{` đó, rồi chỉ kiểm đúng
đoạn từ `{` tới `super(` — tức phần mở đầu thực sự của constructor, không lẫn thân các
getter/setter đứng trước nó trong class:

```ts
it('trong constructor, super() đứng trước mọi truy cập this', () => {
  const js = readFileSync(FILE, 'utf8')

  const iCtor = js.indexOf('constructor(')
  expect(iCtor, 'không tìm thấy constructor( trong file — ca kiểm không còn phủ được gì').toBeGreaterThan(-1)

  const iCtorBrace = js.indexOf('{', iCtor)
  expect(iCtorBrace, 'không tìm thấy dấu { mở constructor').toBeGreaterThan(-1)

  const iSuper = js.indexOf('super(', iCtorBrace)
  expect(iSuper, 'không tìm thấy super( sau constructor(').toBeGreaterThan(-1)

  const moDauConstructor = js.slice(iCtorBrace + 1, iSuper)
  expect(moDauConstructor).not.toMatch(/this\./)
})
```

(Đúng như đang có trong `src/__tests__/vendor-decorator.spec.ts` hiện tại.)

## Phương pháp thu bằng chứng

Tất cả chạy trên BẢN SAO tạm trong scratchpad, không đụng file dịch thật
(`.vendor-build/framework/std/src/view/element/lit-host.js`) và không đụng
`src/vendor/blocksuite/` (D11). File spec tạm dùng để trỏ `FILE` sang các đường dẫn thử nghiệm
được đặt tạm trong `src/__tests__/tmp-mutation-check.spec.ts` (nằm trong phạm vi
`test.include` để `vitest run <path>` chạy được), và bị XOÁ ngay sau khi thu xong bằng chứng —
không còn tồn tại trong cây làm việc (xác nhận bằng `git status --short` ở cuối, không liệt kê
file này).

## 1. Mutation: gán accessor-storage chạm `this` TRƯỚC `super()` — ca 3 phải đỏ

Tạo bản sao `lit-host.js` trong scratchpad, chèn `this.#store_accessor_storage = null;` ngay đầu
constructor, TRƯỚC `super(...arguments);` — đúng hình dạng lỗi thật (accessor initializer bị đẩy
lên trước `super()` thay vì đứng sau):

```
constructor() {
    this.#store_accessor_storage = null;   // <-- mutation: this. trước super()
    super(...arguments);
    ...
```

Chạy cả 3 ca (spec tạm, FILE trỏ vào bản mutate):

```
$ npx vitest run src/__tests__/tmp-mutation-check.spec.ts

 ❯ src/__tests__/tmp-mutation-check.spec.ts (3 tests | 1 failed) 9ms
     × trong constructor, super() đứng trước mọi truy cập this 5ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/tmp-mutation-check.spec.ts > cây vendored đã dịch (mutation: this. trước super() trong constructor) > trong constructor, super() đứng trước mọi truy cập this
AssertionError: expected '\n            this.#store_accessor_st…' not to match /this\./

- Expected:
/this\./

+ Received:
"
            this.#store_accessor_storage = null;
            "

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

Đúng yêu cầu: ca 1 và 2 vẫn xanh (file tồn tại, không còn `accessor` sống sót), CA 3 ĐỎ — bắt
đúng lỗi mô phỏng, không toothless.

## 2. Đường dẫn không tồn tại — cả 3 ca phải đỏ

Đổi `FILE` trong spec tạm sang một đường dẫn chắc chắn không tồn tại
(`.../scratchpad/khong-ton-tai.js`):

```
$ npx vitest run src/__tests__/tmp-mutation-check.spec.ts

 ❯ src/__tests__/tmp-mutation-check.spec.ts (3 tests | 3 failed) 13ms
     × lit-host.js tồn tại — bước dịch đã chạy 10ms
     × không còn từ khoá accessor chưa hạ cấp 1ms
     × trong constructor, super() đứng trước mọi truy cập this 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  ... > lit-host.js tồn tại — bước dịch đã chạy
AssertionError: expected false to be true // Object.is equality
- true
+ false

 FAIL  ... > không còn từ khoá accessor chưa hạ cấp
Error: ENOENT: no such file or directory, open '...\scratchpad\khong-ton-tai.js'

 FAIL  ... > trong constructor, super() đứng trước mọi truy cập this
Error: ENOENT: no such file or directory, open '...\scratchpad\khong-ton-tai.js'

 Test Files  1 failed (1)
      Tests  3 failed (3)
```

Cả 3 ca đỏ đúng như yêu cầu.

## 3. Khôi phục — cả 3 ca phải xanh trên file thật, không mutate

Xoá spec tạm và bản `lit-host.js` mutate trong scratchpad, chạy lại đúng
`vendor-decorator.spec.ts` thật:

```
$ npx vitest run src/__tests__/vendor-decorator.spec.ts

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Xác nhận không còn file tạm trong cây làm việc:

```
$ git status --short
 M package.json
 M vite.config.ts
?? scripts/kiem-vendor-build.mjs
```

(Không có `src/__tests__/tmp-mutation-check.spec.ts` — đã xoá; hai thay đổi còn lại thuộc
Finding 1/3, không liên quan Finding 2.)

## Kết luận

Ca 3 sau khi viết lại (neo `constructor(`) không vacuous: nó bắt được lỗi thật khi mô phỏng
(mutation `this.` trước `super()` → đỏ), bắt được lỗi hạ tầng khi input hỏng (đường dẫn không
tồn tại → cả 3 ca đỏ), và không false-positive trên mã đúng thật (bản plan gốc thì có — đã chứng
minh ở trên; bản viết lại thì không, xem "1. Mutation" ở trên: ca 1 và 2 vẫn xanh, chỉ ca 3 đỏ
đúng chỗ mutate) — khác hẳn với plan gốc, vốn đỏ giả ngay trên chính output đúng.
