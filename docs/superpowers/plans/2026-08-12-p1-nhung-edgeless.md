# P1-A: Nhúng Edgeless Canvas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở được một bảng edgeless trống, pan/zoom được, không mang dấu vết AFFiNE, chạy trong vỏ React của Bs Trọng.

**Architecture:** Vendor toàn bộ `blocksuite/` 0.27.0 nguyên văn, **dịch trước bằng `tsc`** (cùng công cụ thượng nguồn dùng), và trong đúng bước dịch đó áp luôn đổi tên `affine-*` (D16) và bản đồ chuỗi tiếng Việt (D12). Vite chỉ tiêu thụ JS thuần — không decorator, không `accessor`, không Babel. React giữ một thẻ `<div>`, Lit render vào trong.

**Tech Stack:** TypeScript 5.7 · Vite 8 (rolldown + oxc) · React 19 · Lit 3 · BlockSuite 0.27.0 (vendored)

Spec: `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md`

## Global Constraints

- **`src/vendor/blocksuite/**` cấm sửa** (D11, D15). Phép kiểm đúng: **`diff --strip-trailing-cr`** với thượng nguồn. **KHÔNG dùng `cmp`** — repo có `core.autocrlf=true` nên `cmp` báo khác trên mọi file dù nội dung giống hệt.
- **`LICENSE` của BlockSuite phải ở lại** trong `src/vendor/blocksuite/`. MIT bắt buộc giữ dòng bản quyền trong bản phát hành. Không gỡ chú thích bản quyền trong file nguồn.
- **Đổi tên và dịch xảy ra lúc build, không sửa file nguồn** (D12, D16).
- Comment mới viết bằng **tiếng Việt**. Comment gốc tiếng Anh của thượng nguồn giữ nguyên.
- **Không suy độ sâu đường dẫn tương đối bằng đầu** — sai ba lần ở P0-B. Phân giải thật rồi kiểm tồn tại:
  ```bash
  node -e "const p=require('path'),f=require('fs');const t=p.resolve('<thư mục>','<specifier>');console.log(t,f.existsSync(t))"
  ```
- Tiền tố thay cho `affine`: **`btb`** (Bảng Trọng Board). Dùng đúng chuỗi này ở mọi nơi: thẻ DOM `btb-*`, biến CSS `--btb-*`.
- Nguồn thượng nguồn: `C:/Users/LENOVO/Downloads/AFFiNE/blocksuite`

## Ngoài phạm vi kế hoạch này

- **Lưu trữ (D4)** — bảng trống không cần bền vững. Chặng sau.
- **Danh sách bảng / BoardGallery** — chặng riêng.
- Mọi công cụ vẽ cụ thể (mindmap, shape, connector…) — đã có sẵn trong extension, không phải viết.

---

## Task 1: Vendor cây blocksuite và dựng cổng D11

**Files:**
- Create: `src/vendor/blocksuite/` (chép từ thượng nguồn)
- Create: `scripts/kiem-vendor.mjs`
- Modify: `package.json` (thêm script `kiem:vendor`)
- Modify: `src/vendor/blocksuite/README.md`

**Interfaces:**
- Produces: cây nguồn vendored tại `src/vendor/blocksuite/{framework,affine}/`, và lệnh `npm run kiem:vendor` trả exit 0 khi mọi file khớp thượng nguồn.

- [ ] **Step 1: Xoá cây vendored cũ và chép cây mới**

Cây cũ chỉ có `global`, `store`, `sync`. Cây mới cần cả `std` và `affine`.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong"
rm -rf src/vendor/blocksuite/global src/vendor/blocksuite/store src/vendor/blocksuite/sync
AFF="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite"
mkdir -p src/vendor/blocksuite
cp -r "$AFF/framework" src/vendor/blocksuite/framework
cp -r "$AFF/affine" src/vendor/blocksuite/affine
cp "C:/Users/LENOVO/Downloads/AFFiNE/LICENSE" src/vendor/blocksuite/LICENSE
```

Xoá `node_modules` nếu lỡ bị chép theo:

```bash
find src/vendor/blocksuite -name node_modules -type d -prune -exec rm -rf {} +
```

- [ ] **Step 2: Viết cổng kiểm D11**

Create `scripts/kiem-vendor.mjs`:

```js
// Cổng D11: mọi file .ts trong src/vendor/blocksuite phải khớp NGUYÊN VĂN thượng nguồn.
//
// KHÔNG dùng `cmp`: repo này có core.autocrlf=true nên cây làm việc lưu CRLF còn thượng nguồn
// AFFiNE là LF. `cmp` so byte-for-byte nên báo khác trên 143/143 file dù nội dung giống hệt —
// một cổng đỏ giả, và cổng đỏ vô nghĩa nguy hiểm hơn không có cổng nào.
// So sau khi chuẩn hoá xuống dòng là phép kiểm đúng duy nhất.
import { readFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const VENDOR = 'src/vendor/blocksuite'
const UPSTREAM = 'C:/Users/LENOVO/Downloads/AFFiNE/blocksuite'

const chuanHoa = (s) => s.replace(/\r\n/g, '\n')

async function* dietFile(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* dietFile(f)
    } else if (e.name.endsWith('.ts')) {
      yield f
    }
  }
}

let tong = 0
let lech = 0
const thieu = []

for await (const f of dietFile(VENDOR)) {
  const tuongUng = path.join(UPSTREAM, path.relative(VENDOR, f))
  if (!existsSync(tuongUng)) {
    thieu.push(f)
    continue
  }
  tong++
  if (chuanHoa(readFileSync(f, 'utf8')) !== chuanHoa(readFileSync(tuongUng, 'utf8'))) {
    lech++
    console.error('LỆCH:', path.relative(VENDOR, f))
  }
}

if (thieu.length) {
  console.error(`\n${thieu.length} file không có bản tương ứng ở thượng nguồn:`)
  thieu.slice(0, 10).forEach((f) => console.error('  ', f))
}

console.log(`\nĐã so ${tong} file, lệch ${lech}, không đối chiếu được ${thieu.length}`)
process.exit(lech === 0 && thieu.length === 0 ? 0 : 1)
```

- [ ] **Step 3: Thêm script vào package.json**

Trong `"scripts"`, thêm:

```json
"kiem:vendor": "node scripts/kiem-vendor.mjs"
```

- [ ] **Step 4: Chạy cổng, xác nhận xanh**

```bash
npm run kiem:vendor
```

Expected: dòng cuối dạng `Đã so <N> file, lệch 0, không đối chiếu được 0`, exit 0.

Nếu có file LỆCH: chép lại file đó từ thượng nguồn, đừng sửa tay.

- [ ] **Step 5: Chứng minh cổng không rỗng**

Đột biến một file vendored rồi chạy lại — cổng phải **đỏ đúng file đó**:

```bash
echo "// đột biến thử" >> src/vendor/blocksuite/framework/global/src/di/consts.ts
npm run kiem:vendor
```

Expected: in `LỆCH: framework/global/src/di/consts.ts`, exit 1.

Hoàn tác:

```bash
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/global/src/di/consts.ts" src/vendor/blocksuite/framework/global/src/di/consts.ts
npm run kiem:vendor
```

Expected: exit 0.

- [ ] **Step 6: Viết lại README của thư mục vendor**

Replace `src/vendor/blocksuite/README.md`:

```markdown
# Mã vendored từ BlockSuite — KHÔNG SỬA

Xuất xứ: `AFFiNE/blocksuite/{framework,affine}`, phiên bản **0.27.0**. Giấy phép **MIT** —
xem `LICENSE` trong thư mục này. Dòng bản quyền phải ở lại: MIT bắt buộc giữ nó trong bản
phát hành, và PWA phục vụ JS cho trình duyệt chính là phát hành.

## Quy tắc

**Cấm sửa một chữ nào trong thư mục này.** Muốn đổi hành vi thì theo thứ tự:

1. Viết một extension — đúng cách AFFiNE tự dựng mọi thứ của họ
2. `di.override(...)` để thay một dịch vụ có sẵn
3. Bản đồ chuỗi / đổi tên lúc build (D12, D16) — xem `scripts/dich-vendor.mjs`
4. File vá áp lúc build (D14) — chỉ khi ba cách trên không đủ

Lý do: giữ bản chép sạch thì nâng cấp = xoá thư mục, chép bản mới. Sửa vào đây một chỗ là
mỗi lần nâng cấp phải tự tay ghép lại từng sửa đổi — tức là bị ghim.

## Cổng kiểm

```bash
npm run kiem:vendor
```

So từng file `.ts` với thượng nguồn sau khi chuẩn hoá xuống dòng. **Không dùng `cmp`** —
repo có `core.autocrlf=true` nên `cmp` báo khác trên mọi file dù nội dung giống hệt.
```

- [ ] **Step 7: Commit**

```bash
git add src/vendor/blocksuite scripts/kiem-vendor.mjs package.json
git commit -m "P1-A Task 1: vendor toàn bộ blocksuite 0.27.0 + cổng kiểm D11"
```

**Tiêu chí xong:** `npm run kiem:vendor` exit 0; bước đột biến ở Step 5 đã chứng minh cổng không rỗng; `LICENSE` có mặt.

---

## Task 2: Dịch trước bằng `tsc` — gỡ vật cản decorator

**Files:**
- Create: `tsconfig.vendor.json`
- Create: `scripts/dich-vendor.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: cây vendored từ Task 1
- Produces: thư mục `.vendor-build/` chứa JS đã dịch, và lệnh `npm run dich:vendor`

### Vì sao bước này tồn tại

Bản thử trước build được nhưng mở lên thì lỗi
`ReferenceError: Must call super constructor in derived class before accessing 'this'`, phát từ
`framework/std/src/view/element/lit-host.ts:198` — chỗ `@provide` của `@lit/context` đặt trên một
`accessor`.

Nguyên nhân: AFFiNE dịch bằng `tsc`, còn Vite 8 chạy trên rolldown + oxc vốn *parse* được `accessor`
nhưng **không hạ cấp** nó. Hạ cấp bằng Babel sinh ra mã khác `tsc` ở chính chỗ này.

Đã kiểm bằng thực nghiệm: `tsc --target ES2022 --useDefineForClassFields false` sinh ra
`super(...arguments)` **trước** phần khởi tạo accessor — đúng thứ tự. Nên dùng đúng công cụ của
thượng nguồn thay vì đi sửa Babel cho khớp.

Lợi thêm: sau bước này Vite chỉ thấy **JS thuần** — hết decorator, hết `accessor`, hết Babel, hết
chuyện phân giải đuôi `.js` → `.ts`.

- [ ] **Step 1: Viết tsconfig cho cây vendored**

Create `tsconfig.vendor.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "useDefineForClassFields": false,
    "experimentalDecorators": false,
    "declaration": false,
    "sourceMap": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmitOnError": false,
    "allowJs": true,
    "outDir": ".vendor-build",
    "rootDir": "src/vendor/blocksuite"
  },
  "include": ["src/vendor/blocksuite/**/*.ts"],
  "exclude": [
    "src/vendor/blocksuite/**/__tests__/**",
    "src/vendor/blocksuite/**/*.spec.ts",
    "src/vendor/blocksuite/**/node_modules/**"
  ]
}
```

`useDefineForClassFields: false` khớp thượng nguồn (`AFFiNE/tsconfig.json:25`) — đổi giá trị này
là đổi ngữ nghĩa class field và làm vỡ decorator.

`strict: false` và `noEmitOnError: false` cố ý: ta **không type-check** mã của người khác, chỉ
dịch. Lỗi kiểu do thiếu `@types` không được chặn bước emit.

- [ ] **Step 2: Thêm script và bỏ qua thư mục output**

Trong `package.json` `"scripts"`:

```json
"dich:vendor": "tsc -p tsconfig.vendor.json"
```

Thêm vào `.gitignore`:

```
.vendor-build/
```

- [ ] **Step 3: Chạy thử, xác nhận emit ra JS**

```bash
npm run dich:vendor
ls .vendor-build/framework/std/src/view/element/lit-host.js
```

Expected: file tồn tại. `tsc` có thể in lỗi kiểu — **không sao**, `noEmitOnError: false` nên vẫn emit.

- [ ] **Step 4: Viết ca kiểm chứng minh decorator đã hạ cấp đúng**

Create `src/__tests__/vendor-decorator.spec.ts`:

```ts
// Cưỡng chế thứ đã chặn bản thử trước: `@provide` của @lit/context đặt trên một `accessor`
// trong lit-host.ts. Nếu decorator bị hạ cấp sai, mã sinh ra chạm `this` TRƯỚC `super()` và
// trình duyệt ném "Must call super constructor in derived class".
//
// Ca này đọc JS đã dịch chứ không chạy nó: chạy được đòi cả một DOM và một BlockStdScope thật.
// Đọc thứ tự trong nguồn là phép kiểm rẻ và đủ chặt cho đúng lỗi này.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const FILE = '.vendor-build/framework/std/src/view/element/lit-host.js'

describe('cây vendored đã dịch', () => {
  it('lit-host.js tồn tại — bước dịch đã chạy', () => {
    expect(existsSync(FILE)).toBe(true)
  })

  it('không còn từ khoá accessor chưa hạ cấp', () => {
    const js = readFileSync(FILE, 'utf8')
    // `accessor x = ...` là cú pháp Stage-3 mà oxc không hạ cấp được. Còn sót là hỏng.
    expect(js).not.toMatch(/^\s*(?:@[\w.]+\s*)*accessor\s+\w+/m)
  })

  it('trong constructor, super() đứng trước mọi truy cập this', () => {
    const js = readFileSync(FILE, 'utf8')
    const iSuper = js.indexOf('super(')
    expect(iSuper).toBeGreaterThan(-1)

    // Lấy đoạn từ đầu class tới super(); trong đó không được có `this.`
    const truocSuper = js.slice(Math.max(0, iSuper - 600), iSuper)
    const dongCuoi = truocSuper.split('\n').slice(-6).join('\n')
    expect(dongCuoi).not.toMatch(/this\./)
  })
})
```

- [ ] **Step 5: Chạy ca kiểm, xác nhận xanh**

```bash
npx vitest run src/__tests__/vendor-decorator.spec.ts
```

Expected: 3 passed.

- [ ] **Step 6: Chứng minh ca kiểm không rỗng**

Đổi `FILE` sang một đường dẫn không tồn tại, chạy lại, xác nhận **cả ba ca đỏ**, rồi hoàn tác.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.vendor.json package.json .gitignore src/__tests__/vendor-decorator.spec.ts
git commit -m "P1-A Task 2: dịch trước cây vendored bằng tsc, gỡ vật cản decorator"
```

**Tiêu chí xong:** `npm run dich:vendor` sinh ra `.vendor-build/`; ba ca ở Step 4 xanh; bước đột biến ở Step 6 chứng minh chúng không rỗng.

---

## Task 3: Đổi tên `affine-*` (D16) và bản đồ chuỗi tiếng Việt (D12)

**Files:**
- Create: `scripts/doi-ten-vendor.mjs`
- Create: `src/board/vi.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `.vendor-build/` từ Task 2
- Produces: `.vendor-build/` đã đổi tên và dịch, sẵn sàng cho Vite

### Vì sao làm ở bước build chứ không vá tay

Đo được **256** tên thẻ `affine-*` và **154** biến CSS `--affine-*`. Vá tay 410 định danh nghĩa là
mỗi lần nâng cấp phải soát lại 410 miếng. Một luật biến đổi thì bản nâng cấp sau **tự động được đổi
tên theo**, kể cả thẻ mới thượng nguồn thêm vào.

Đã kiểm rủi ro: quét cả cây tìm chỗ ghép tên thẻ động (`` `affine-${...}` ``, `'affine-' +`) —
**đúng 1 chỗ**, ở `affine/shared/src/test-utils/affine-test-utils.ts:23`, tức tiện ích test, không
nằm trong mã sản phẩm. Nên phép thay văn bản an toàn *hôm nay*; Step 4 dựng cổng canh cho ngày mai.

- [ ] **Step 1: Viết bản đồ chuỗi khởi đầu**

Create `src/board/vi.json`:

```json
{
  "Style": "Phong cách",
  "Layout": "Bố cục",
  "Add media": "Thêm ảnh",
  "Import failed, please try again": "Nhập thất bại, thử lại giúp",
  "Support import of FreeMind,OPML.": "Hỗ trợ nhập FreeMind, OPML."
}
```

Đây là mồi, không phải bản đầy đủ. Step 5 dựng cổng liệt kê chuỗi chưa dịch để bổ sung dần.

- [ ] **Step 2: Viết bộ biến đổi**

Create `scripts/doi-ten-vendor.mjs`:

```js
// Chạy SAU `dich:vendor`. Biến đổi JS đã dịch trong .vendor-build/ tại chỗ:
//   1. D16 — đổi tiền tố `affine-` → `btb-` ở tên thẻ DOM và class, `--affine-` → `--btb-`
//   2. D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json
//
// Mã nguồn trong src/vendor/ KHÔNG bị đụng — cổng `npm run kiem:vendor` vẫn xanh sau bước này.
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const BUILD = '.vendor-build'
const TIEN_TO = 'btb'
const banDoDich = JSON.parse(readFileSync('src/board/vi.json', 'utf8'))

async function* dietJs(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietJs(f)
    else if (e.name.endsWith('.js')) yield f
  }
}

// Thoát ký tự đặc biệt của regex trong chuỗi cần dịch.
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let soFile = 0
let soDoiTen = 0
let soDich = 0

for await (const f of dietJs(BUILD)) {
  let js = readFileSync(f, 'utf8')
  const goc = js

  // CẨN TRỌNG: tên GÓI cũng chứa `affine-` — `@blocksuite/affine-block-frame/view`. Đổi tên
  // trong câu import là làm gãy mọi phép phân giải module. Nên che các specifier lại trước,
  // đổi tên, rồi trả về chỗ cũ.
  // Mốc phải là chuỗi không thể trùng với nội dung thật, và KHÔNG dùng ký tự điều khiển —
  // ký tự điều khiển làm mọi công cụ text (grep, git diff) coi file là nhị phân.
  const kho = []
  const dungMoc = (i) => `__BTB_SPEC_${i}__`
  js = js.replace(
    /(\bfrom\s*|\bimport\s*\(\s*|\bexport\s*\*\s*from\s*|\brequire\s*\(\s*)(['"])([^'"]+)\2/g,
    (m) => {
      kho.push(m)
      return dungMoc(kho.length - 1)
    }
  )

  // 1. Biến CSS: --affine-xxx → --btb-xxx. Làm trước vì nó cũng khớp luật dưới.
  js = js.replace(/--affine-/g, `--${TIEN_TO}-`)
  // 2. Tên thẻ và class: affine-xxx → btb-xxx.
  //    Chỉ khớp khi có gạch nối, nên `affine:page` (flavour trong dữ liệu) KHÔNG bị đụng —
  //    đổi flavour là đổi lược đồ và sẽ không đọc được tài liệu do AFFiNE tạo.
  js = js.replace(/\baffine-/g, `${TIEN_TO}-`)

  // Trả specifier về nguyên trạng.
  js = js.replace(/__BTB_SPEC_(\d+)__/g, (_m, i) => kho[Number(i)])

  if (js !== goc) soDoiTen++

  // 3. Chuỗi hiển thị. Chỉ thay khi nằm trọn trong một literal, tránh đụng tên biến.
  for (const [en, vi] of Object.entries(banDoDich)) {
    const truoc = js
    js = js.replace(new RegExp(`(['"\`])${thoat(en)}\\1`, 'g'), (_m, q) => `${q}${vi}${q}`)
    if (js !== truoc) soDich++
  }

  if (js !== goc) {
    writeFileSync(f, js)
    soFile++
  }
}

console.log(`Đã biến đổi ${soFile} file · ${soDoiTen} file đổi tên · ${soDich} lượt dịch`)
```

- [ ] **Step 3: Nối hai bước thành một lệnh**

Trong `package.json` `"scripts"`, sửa và thêm:

```json
"dich:vendor": "tsc -p tsconfig.vendor.json",
"doiten:vendor": "node scripts/doi-ten-vendor.mjs",
"dung:vendor": "npm run dich:vendor && npm run doiten:vendor"
```

- [ ] **Step 4: Viết cổng canh — ba điều phải đúng**

Create `src/__tests__/vendor-doi-ten.spec.ts`:

```ts
// Ba cổng cho D16, mỗi cái canh một cách hỏng khác nhau.
import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const BUILD = '.vendor-build'
const NGUON = 'src/vendor/blocksuite'

async function* diet(dir: string, duoi: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* diet(f, duoi)
    } else if (e.name.endsWith(duoi)) yield f
  }
}

describe('D16 — đổi tên affine-*', () => {
  it('output không còn tiền tố affine- nào, ngoài tên gói trong câu import', async () => {
    expect(existsSync(BUILD)).toBe(true)

    // Tên GÓI cũng chứa `affine-` (`@blocksuite/affine-block-frame/view`) và phải giữ nguyên,
    // nếu không mọi phép phân giải module gãy. Bỏ specifier ra trước rồi mới soi phần còn lại.
    const boSpecifier = (js: string) =>
      js.replace(
        /(\bfrom\s*|\bimport\s*\(\s*|\bexport\s*\*\s*from\s*|\brequire\s*\(\s*)(['"])([^'"]+)\2/g,
        '$1$2$2'
      )

    const soPham: string[] = []
    for await (const f of diet(BUILD, '.js')) {
      const js = boSpecifier(readFileSync(f, 'utf8'))
      if (/\baffine-|--affine-/.test(js)) soPham.push(path.relative(BUILD, f))
      if (soPham.length > 5) break
    }
    expect(soPham).toEqual([])
  })

  it('tiền tố mới thật sự có mặt — chứng minh phép thay đã chạy', async () => {
    let thay = false
    for await (const f of diet(BUILD, '.js')) {
      if (/\bbtb-/.test(readFileSync(f, 'utf8'))) {
        thay = true
        break
      }
    }
    expect(thay).toBe(true)
  })

  // Phép thay văn bản chỉ an toàn khi KHÔNG chỗ nào ghép tên thẻ động. Hôm nay đúng 1 chỗ và
  // nó nằm trong test-utils. Nếu bản nâng cấp sau thêm chỗ thứ hai trong mã sản phẩm, tên thẻ
  // sẽ ghép ra `affine-...` chưa đổi và component im lặng không mount. Cổng này phải đỏ trước.
  it('không có chỗ ghép tên thẻ động ngoài test-utils', async () => {
    const mau = /`affine-\$\{|'affine-'\s*\+|"affine-"\s*\+/
    const soPham: string[] = []
    for await (const f of diet(NGUON, '.ts')) {
      const rel = path.relative(NGUON, f).replace(/\\/g, '/')
      if (rel.includes('test-utils') || rel.includes('__tests__')) continue
      if (mau.test(readFileSync(f, 'utf8'))) soPham.push(rel)
    }
    expect(soPham).toEqual([])
  })
})

describe('D12 — bản đồ dịch', () => {
  // Nếu thượng nguồn đổi một chuỗi, khoá trong vi.json không còn khớp và bản dịch trôi âm thầm.
  // Cổng này liệt kê khoá chết để người sau biết mà sửa.
  it('mọi khoá trong vi.json còn tìm thấy trong cây nguồn', async () => {
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    const khoa = Object.keys(banDo)
    const conSong = new Set<string>()

    for await (const f of diet(NGUON, '.ts')) {
      const ts = readFileSync(f, 'utf8')
      for (const k of khoa) if (!conSong.has(k) && ts.includes(k)) conSong.add(k)
      if (conSong.size === khoa.length) break
    }

    const khoaChet = khoa.filter((k) => !conSong.has(k))
    expect(khoaChet).toEqual([])
  })
})
```

- [ ] **Step 5: Chạy toàn bộ đường ống rồi chạy cổng**

```bash
npm run dung:vendor
npx vitest run src/__tests__/vendor-doi-ten.spec.ts
```

Expected: dòng thống kê từ Step 2, rồi 4 passed.

Nếu ca "không còn tiền tố affine-" đỏ: đọc danh sách file phạm, xem có phải chỗ nào thoát khỏi hai
luật regex không, rồi mở rộng luật — **đừng** sửa file vendored.

- [ ] **Step 6: Xác nhận nguồn vẫn sạch**

Đây là điều D16 hứa: đổi tên mà không đụng mã vendored.

```bash
npm run kiem:vendor
```

Expected: exit 0, lệch 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/doi-ten-vendor.mjs src/board/vi.json package.json src/__tests__/vendor-doi-ten.spec.ts
git commit -m "P1-A Task 3: đổi tên affine-* và bản đồ dịch, làm lúc build"
```

**Tiêu chí xong:** `npm run dung:vendor` chạy trọn; 4 ca ở Step 4 xanh; `npm run kiem:vendor` vẫn exit 0.

---

## Task 4: Cầu nối React↔Lit với extension cắt gọn (D13)

**Files:**
- Create: `src/board/extensions.ts`
- Create: `src/board/EdgelessBoard.tsx`
- Create: `src/board/index.ts`
- Create: `vite.vendor-plugin.ts`
- Modify: `vite.config.ts`
- Create: `src/board/__tests__/edgeless-board.spec.ts`

**Interfaces:**
- Consumes: `.vendor-build/` đã biến đổi từ Task 3
- Produces: `EdgelessBoard` — React component không nhận prop, dựng một bảng trống; và `viewExtensions` — mảng extension cắt gọn

- [ ] **Step 1: Viết plugin phân giải cho Vite**

Create `vite.vendor-plugin.ts`:

```ts
// Trỏ mọi specifier `@blocksuite/*` vào JS ĐÃ DỊCH trong `.vendor-build/`.
//
// Vì sao không dùng resolve.alias: mỗi gói con có bản đồ `exports` riêng — riêng
// `@blocksuite/affine` có 207 subpath trỏ tới 207 file khác nhau — nên một luật tiền tố sẽ
// trỏ sai. Plugin này đọc đúng `exports` của từng gói rồi ánh xạ sang `.vendor-build/`.
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const NGUON = 'src/vendor/blocksuite'
const BUILD = '.vendor-build'

type Goi = { thuMuc: string; exports: Record<string, unknown> | undefined }

function quetGoi(): Map<string, Goi> {
  const map = new Map<string, Goi>()
  const di = (dir: string, sau: number) => {
    if (sau > 5) return
    let mucs: fs.Dirent[]
    try {
      mucs = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of mucs) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const f = path.join(dir, e.name)
      if (e.isDirectory()) di(f, sau + 1)
      else if (e.name === 'package.json') {
        try {
          const j = JSON.parse(fs.readFileSync(f, 'utf8'))
          if (j.name?.startsWith('@blocksuite/')) map.set(j.name, { thuMuc: dir, exports: j.exports })
        } catch {
          /* package.json hỏng thì bỏ qua */
        }
      }
    }
  }
  di(NGUON, 0)
  return map
}

// Tách `@blocksuite/affine/std/gfx` → ['@blocksuite/affine', './std/gfx'].
// Phải thử tên DÀI trước: `@blocksuite/affine-block-surface` và `@blocksuite/affine` cùng tiền tố.
function tach(spec: string, goi: Map<string, Goi>) {
  const phan = spec.split('/')
  for (let lay = phan.length; lay >= 2; lay--) {
    const ten = phan.slice(0, lay).join('/')
    if (goi.has(ten)) {
      const con = phan.slice(lay).join('/')
      return { ten, sub: con ? `./${con}` : '.' }
    }
  }
  return null
}

export function blocksuiteVendor(): Plugin {
  const goi = quetGoi()

  return {
    name: 'blocksuite-vendor',
    enforce: 'pre',

    configResolved() {
      if (!fs.existsSync(BUILD)) {
        throw new Error(
          `[blocksuite-vendor] chưa có ${BUILD}. Chạy "npm run dung:vendor" trước khi build hoặc dev.`
        )
      }
      console.log(`[blocksuite-vendor] ${goi.size} gói, đọc JS đã dịch từ ${BUILD}`)
    },

    resolveId(spec) {
      // `@blocksuite/icons` là gói npm thật, không nằm trong workspace — để Vite tự lo.
      if (!spec.startsWith('@blocksuite/') || spec.startsWith('@blocksuite/icons')) return null

      const t = tach(spec, goi)
      if (!t) return null

      const info = goi.get(t.ten)!
      const dich = info.exports?.[t.sub]
      const tuongDoiTs =
        typeof dich === 'string'
          ? path.join(info.thuMuc, dich)
          : path.join(info.thuMuc, 'src', t.sub === '.' ? 'index.ts' : `${t.sub.slice(2)}.ts`)

      // Ánh xạ src/vendor/... → .vendor-build/... và .ts → .js
      const rel = path.relative(NGUON, tuongDoiTs)
      const ungVien = [
        path.join(BUILD, rel).replace(/\.ts$/, '.js'),
        path.join(BUILD, rel).replace(/\.ts$/, '/index.js'),
      ]
      for (const u of ungVien) if (fs.existsSync(u)) return path.resolve(u).split(path.sep).join('/')

      console.warn(`[blocksuite-vendor] không phân giải được: ${spec}`)
      return null
    },
  }
}
```

- [ ] **Step 2: Nối plugin vào vite.config.ts**

Thêm import ở đầu `vite.config.ts`:

```ts
import { blocksuiteVendor } from './vite.vendor-plugin'
```

Trong mảng `plugins`, đặt `blocksuiteVendor()` **trước** `react()`:

```ts
plugins: [blocksuiteVendor(), accessorSupport(), react(), tailwindcss()],
```

Trong `resolve`, thêm `dedupe` — hai bản sao `yjs` hoặc `lit` là lỗi "cùng kiểu nhưng không bằng nhau" rất khó lần:

```ts
dedupe: ['yjs', '@preact/signals-core', 'lit', 'lit-html', '@lit/context'],
```

Xoá ba alias cũ trỏ vào `src/vendor/blocksuite/{global,store,sync}` — plugin thay chúng, và để lại
sẽ tạo hai bản sao trong cùng bundle.

- [ ] **Step 3: Viết danh sách extension cắt gọn**

Create `src/board/extensions.ts`:

```ts
// Danh sách extension cắt gọn (D13). Đo được: đầy đủ 1.856 kB gzip / 293 file JS;
// cắt gọn 1.131 kB gzip / 5 file. Phần bỏ đi kéo theo Shiki (~40 chunk ngôn ngữ), KaTeX,
// pdfmake, mammoth — thứ một bảng vẽ không dùng tới.
//
// Bỏ: database, table, data-view, code, latex, attachment, bookmark, embed, embed-doc,
//     image, callout, divider, surface-ref, edgeless-text.
// Giữ: nền tảng, các phần tử vẽ, Note với đoạn văn và danh sách, cùng nhóm widget làm nên
//     cảm giác thao tác.
//
// Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai trong
// `affine/all/src/extensions/view.ts`.
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { MindmapViewExtension } from '@blocksuite/affine-gfx-mindmap/view'
import { NoteViewExtension as GfxNoteViewExtension } from '@blocksuite/affine-gfx-note/view'
import { PointerViewExtension } from '@blocksuite/affine-gfx-pointer/view'
import { ShapeViewExtension } from '@blocksuite/affine-gfx-shape/view'
import { TextViewExtension } from '@blocksuite/affine-gfx-text/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'

export const viewExtensions = [
  FoundationViewExtension,

  PointerViewExtension,
  GfxNoteViewExtension,
  BrushViewExtension,
  ShapeViewExtension,
  MindmapViewExtension,
  ConnectorViewExtension,
  GroupViewExtension,
  TextViewExtension,

  FrameViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,
  RootViewExtension,

  FrameTitleViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,
]
```

- [ ] **Step 4: Viết cầu nối React↔Lit**

Create `src/board/EdgelessBoard.tsx`:

```tsx
// Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi Lit tự
// render vào thẻ đó. React không biết gì về bên trong, Lit không biết gì về React — đó chính là
// điều làm phép nhúng khả thi, và cũng là lý do file này phải nhỏ.
import '@blocksuite/affine/effects'

import { StoreExtensionManager, ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import { render as litRender } from 'lit'
import { useEffect, useRef } from 'react'

import { viewExtensions } from './extensions'

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

/**
 * Dựng một bảng trống trong bộ nhớ. Chưa bền vững — lưu trữ (D4) thuộc chặng sau, nên đóng bảng
 * là mất nội dung. `TestWorkspace` là workspace không cần server, đúng thứ cần ở chặng này.
 */
export function taoBangTrong() {
  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
  })
  workspace.meta.initialize()

  const doc = workspace.createDoc('board')
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  const rootId = store.addBlock('affine:page', {})
  store.addBlock('affine:surface', {}, rootId)

  return store
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const std = new BlockStdScope({
      store: taoBangTrong(),
      extensions: viewManager.get('edgeless'),
    })
    litRender(std.render(), el)

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó.
    return () => {
      litRender(null, el)
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0" />
}
```

Lưu ý: `'affine:page'` và `'affine:surface'` ở trên là **flavour trong dữ liệu**, không phải tên thẻ
DOM — luật đổi tên ở Task 3 chỉ chạm `affine-` (gạch nối), không chạm `affine:` (hai chấm). Đổi
chúng là đổi lược đồ dữ liệu và sẽ không đọc được tài liệu do AFFiNE tạo.

- [ ] **Step 5: Viết barrel với nạp chậm**

Create `src/board/index.ts`:

```ts
// Nạp chậm (D13): 1.131 kB gzip chỉ tải khi người dùng thật sự mở một bảng. Vỏ app giữ nguyên
// 331 kB. Import tĩnh ở đây là mất trọn lợi ích đó.
import { lazy } from 'react'

export const EdgelessBoard = lazy(() =>
  import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard }))
)
```

- [ ] **Step 6: Viết ca kiểm cầu nối**

Create `src/board/__tests__/edgeless-board.spec.ts`:

```ts
// Kiểm đúng thứ dự án sở hữu (D9): việc dựng bảng và hình dạng dữ liệu ban đầu.
// KHÔNG kiểm mã của AFFiNE — họ có bộ test riêng.
//
// Không render component ở đây: environment là 'node' (xem vite.config.ts) nên chạm DOM sẽ đâm
// `DOMRect is not defined`. Ca render thuộc mốc kiểm tay ở Step 8.
import { describe, expect, it } from 'vitest'

import { taoBangTrong } from '../EdgelessBoard'

describe('taoBangTrong', () => {
  it('dựng ra một store có root', () => {
    const store = taoBangTrong()
    expect(store.root).not.toBeNull()
  })

  it('bảng mới có đúng một surface', () => {
    const store = taoBangTrong()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
  })

  it('surface mới chưa có phần tử nào', () => {
    const store = taoBangTrong()
    const surface = store.root!.children.find((c) => c.flavour === 'affine:surface')!
    expect((surface as unknown as { elementModels: unknown[] }).elementModels).toHaveLength(0)
  })
})
```

- [ ] **Step 7: Chạy cổng**

```bash
npm run dung:vendor
npx tsc --noEmit
npx vitest run src/board/__tests__/edgeless-board.spec.ts
npm run build
```

Expected: `tsc` exit 0; 3 passed; build thành công.

Ghi lại số kB gzip của chunk lớn nhất trong output build — Step 9 cần nó.

- [ ] **Step 8: Mốc kiểm tay — bảng thật, thiết bị thật**

```bash
npm run dev
```

Mở app, vào một bảng. Kiểm bằng mắt trên **iPad** và **PC Windows**:

1. Canvas hiện ra, thanh công cụ edgeless có mặt
2. Kéo hai ngón (iPad) hoặc kéo chuột giữa (PC) — bảng dịch chuyển
3. Pinch-zoom (iPad) hoặc cuộn (PC) — bảng phóng to thu nhỏ
4. Vẽ một hình chữ nhật bằng công cụ shape
5. Mở dev tools, soi cây DOM — **không được thấy thẻ nào tên `affine-*`**, phải là `btb-*`

Trên **iPhone** chỉ kiểm mở lên xem được, không kiểm nhập liệu.

Điểm 5 là điều D16 hứa. Điểm 2 và 3 là điều cả chặng tồn tại vì nó.

- [ ] **Step 9: Commit**

```bash
git add src/board vite.vendor-plugin.ts vite.config.ts
git commit -m "P1-A Task 4: cầu nối React↔Lit, extension cắt gọn, nạp chậm"
```

**Tiêu chí xong:** `tsc --noEmit` exit 0; 3 ca xanh; `npm run build` thành công; mốc kiểm tay ở Step 8 qua cả 5 điểm trên iPad và PC.

---

## Task 5: Xoá `src/core/gfx` và mã port của P0-B/P0-C

**Files:**
- Delete: `src/core/gfx/`, `src/core/utils/`, `src/core/selection/`
- Delete: `src/core/__tests__/` trừ hai file giữ lại (xem Step 2)
- Modify: `src/core/__tests__/viewport-runtime-config.spec.ts`
- Modify: `tsconfig.json`, `vite.config.ts` (gỡ alias và bộ lọc `accessor` không còn đối tượng)

**Interfaces:**
- Consumes: `EdgelessBoard` chạy được từ Task 4 — **xoá trước khi Task 4 xanh là mất mã tham chiếu**

### Vì sao xoá

`@blocksuite/affine/std` đã chứa sẵn `std/gfx`. Giữ cả hai là có hai bản sao của cùng một lớp trong
một bundle, và mọi phép `instanceof` giữa chúng sẽ sai — lỗi ở tầng chạy mà `tsc` không bắt được.

- [ ] **Step 1: Xác nhận không còn ai import**

```bash
grep -rn "from '@/core\|from '\.\./core\|src/core/gfx" src --include=*.ts --include=*.tsx | grep -v "src/core/"
```

Expected: không có kết quả. Nếu có, sửa chỗ đó trỏ sang `@blocksuite/affine/std` trước khi xoá.

- [ ] **Step 2: Giữ lại ca kiểm còn giá trị, trỏ sang mã vendored**

`src/core/__tests__/viewport-runtime-config.spec.ts` cưỡng chế một phát hiện của P0-C vẫn còn đúng:
`viewportRuntimeConfig` có **hai nửa vòng đời khác nhau** — `ZOOM_MIN`/`ZOOM_MAX` đọc qua getter
động nên override lúc nào cũng ăn, còn `SKIP_REFRESH_DURING_GESTURE` là field initializer **chốt
cứng lúc dựng Viewport**. Hậu quả nếu quên: mount viewport lúc bootstrap rồi cấu hình iOS trong một
`useEffect` sẽ ăn sàn zoom nhưng **không** ăn thứ giữ WKWebView khỏi bị kill.

**Chuyển file ra khỏi `src/core/` TRƯỚC khi xoá thư mục đó** — làm ngược thứ tự là mất file:

```bash
git mv src/core/__tests__/viewport-runtime-config.spec.ts src/board/__tests__/viewport-runtime-config.spec.ts
```

Rồi đổi đúng một dòng import trong file vừa chuyển:

```ts
import { getEffectiveDpr, Viewport, viewportRuntimeConfig } from '@blocksuite/affine/std/gfx'
```

Giữ nguyên toàn bộ phần còn lại, kể cả `afterEach` khôi phục trạng thái toàn cục — `viewportRuntimeConfig` là trạng thái toàn cục, một ca đổi nó mà không dọn sẽ rò sang ca sau.

Chạy riêng file này để xác nhận nó vẫn xanh khi trỏ vào mã vendored:

```bash
npm run dung:vendor
npx vitest run src/board/__tests__/viewport-runtime-config.spec.ts
```

Expected: 5 passed. Nếu đỏ, **dừng và báo** — nghĩa là hành vi của `Viewport` vendored khác bản port, và đó là phát hiện chứ không phải lỗi vặt.

- [ ] **Step 3: Xoá phần còn lại**

```bash
git rm -r src/core/gfx src/core/utils src/core/selection src/core/__tests__
```

- [ ] **Step 4: Gỡ cấu hình không còn đối tượng**

Trong `tsconfig.json`, xoá các mục `paths` trỏ vào `src/vendor/blocksuite/{global,store,sync}` —
plugin ở Task 4 thay chúng.

Trong `vite.config.ts`, bộ lọc `accessorSupport()` giờ chỉ còn áp cho mã của dự án. Kiểm còn file
nào dùng `accessor` không:

```bash
grep -rln "\baccessor\b" src --include=*.ts --include=*.tsx | grep -v src/vendor
```

Nếu **không còn file nào**, gỡ hẳn `accessorSupport()` khỏi mảng `plugins` cùng khối comment dài của
nó, và gỡ năm devDependency Babel khỏi `package.json`. Nếu còn, giữ nguyên.

- [ ] **Step 5: Chạy toàn bộ cổng**

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: `tsc` exit 0; mọi ca xanh; build thành công.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "P1-A Task 5: xoá src/core/gfx — @blocksuite/affine/std đã chứa sẵn"
```

**Tiêu chí xong:** `tsc --noEmit` exit 0; `npm test` xanh; `npm run build` thành công; ca `viewport-runtime-config` vẫn xanh ở vị trí mới.

---

## Nghiệm thu P1-A

```bash
npm run kiem:vendor   # exit 0 — mã vendored khớp thượng nguồn
npm run dung:vendor   # dịch + đổi tên + dịch chuỗi
npx tsc --noEmit      # exit 0
npm test              # tất cả xanh
npm run build         # thành công
```

| Cổng | Kỳ vọng |
|---|---|
| `kiem:vendor` | lệch 0 — D11 giữ được sau khi đổi tên và dịch |
| Ca `vendor-decorator` | 3 xanh — vật cản đã gỡ |
| Ca `vendor-doi-ten` | 4 xanh — không còn tiền tố `affine-`, không có ghép tên động |
| Ca `edgeless-board` | 3 xanh |
| Mốc kiểm tay | 5 điểm ở Task 4 Step 8, trên iPad và PC |
| Bundle | vỏ app giữ ~331 kB gzip; chunk bảng ~1.131 kB, chỉ tải khi mở bảng |

**Ghi số bundle vào `docs/superpowers/notes/`.** Lần này con số **có nghĩa** — khác P0-A/B/C, nơi tầng gfx chưa vào module graph nên mọi phép đo đều là đo lại app cũ.

## Chặng kế tiếp

- **Lưu trữ (D4)** — nối y-indexeddb của AFFiNE cho nội dung bảng, nâng `DB_VERSION` lên 5 cho danh sách bảng
- **BoardGallery** — màn danh sách bảng
- **Bổ sung `vi.json`** — 260 chuỗi, dịch dần theo mức độ hay gặp
