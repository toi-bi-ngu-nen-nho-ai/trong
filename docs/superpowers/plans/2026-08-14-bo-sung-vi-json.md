# Kế hoạch: bổ sung `vi.json` — cơ chế thay chuỗi theo vị trí cú pháp

> **Cho người/agent thi hành:** KỸ NĂNG BẮT BUỘC — dùng `superpowers:subagent-driven-development`
> (khuyến nghị) hoặc `superpowers:executing-plans` để thi hành từng task. Các bước dùng cú pháp
> checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Thay cơ chế dịch chuỗi D12 từ regex khớp-mọi-nơi sang phép thay theo vị trí cú pháp,
để mở `vi.json` từ 5 khoá lên toàn bộ bề mặt hiển thị mà không làm hỏng dữ liệu.

**Kiến trúc:** Tách bước dịch khỏi `doi-ten-vendor.mjs` thành script riêng. Bộ luật vị trí nằm
trong một module thuần, phân tích `.vendor-build/**/*.js` bằng `ts.createSourceFile` và chỉ thay
`StringLiteral` khi vị trí cú pháp của nó thuộc danh sách cho phép. Ba cổng DỪNG trong script, một
cổng độc lập tính lại từ đầu ra, một danh sách "buộc phải ra tiếng Việt" trong `kiem:dist`.

**Công nghệ:** Node ESM, `typescript` 5.9.3 (`ts.createSourceFile` — đã là devDependency trực
tiếp), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md`

## Global Constraints

- **Không thêm phụ thuộc mới.** `typescript` đã có; `acorn`/`@babel/parser` là phụ thuộc bắc cầu,
  không được import trực tiếp.
- **D11 bất khả xâm phạm.** Không sửa gì dưới `src/vendor/blocksuite/`. `npm run kiem:vendor` phải
  giữ nguyên "lệch 0".
- **`vi.json` giữ định dạng phẳng** `{ "English": "Tiếng Việt" }`. Không thêm trường, không lồng.
- **Tên script npm `dich:vendor` ĐÃ CÓ và nghĩa là `tsc -p tsconfig.vendor.json`.** Script mới tên
  `dichchuoi:vendor`. Trùng tên là làm gãy pipeline.
- **Fail-closed:** vị trí không nằm trong danh sách cho phép thì không đụng. Không viết danh sách cấm.
- Danh sách thuộc tính cho phép, đúng 11 tên: `name`, `label`, `tooltip`, `description`, `caption`,
  `group`, `text`, `title`, `menuName`, `displayName`, `placeholder`.
- Danh sách đối số cho phép, đúng 1 tên: `toast`.
- Danh sách thuộc tính HTML trong template, đúng 1 tên: `data-tip`.
- **Kế hoạch này KHÔNG thêm khoá dịch nào.** `vi.json` kết thúc kế hoạch vẫn đúng 5 khoá như lúc
  bắt đầu. Nội dung dịch là chặng sau (spec §8, nhịp 1–2), phải có chủ dự án chốt thuật ngữ trước.
- Mọi comment và thông báo lỗi viết **tiếng Việt**, theo lối của `scripts/` hiện có: nói *vì sao*,
  không chỉ nói *cái gì*.
- Sau mỗi task: `npx tsc --noEmit` exit 0 và `npm test` xanh trước khi commit.

## Ngoài phạm vi kế hoạch này

- Dịch 323+ chuỗi (spec §8 nhịp 1–2 — cần chủ dự án chốt bảng thuật ngữ trước).
- Bốn vị trí gác lại ở spec §5.2 (`ConditionalExpression`, `template` ngoài luật hẹp, `return`,
  `phần-tử-mảng`).
- 121 chuỗi bị tree-shake.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `scripts/luat-vi-tri-dich.mjs` | **Mới.** Thuần, không I/O: luật vị trí + `dichMotFile()` |
| `scripts/luat-vi-tri-dich.d.mts` | **Mới.** Khai kiểu cho module trên, để test `.ts` import được |
| `scripts/dich-chuoi-vendor.mjs` | **Mới.** Vỏ CLI: duyệt cây, ghi file, phát báo cáo, ba cổng DỪNG |
| `scripts/doi-ten-vendor.mjs` | **Sửa.** Gỡ bước 3 (dịch chuỗi) ra |
| `scripts/dung-vendor.mjs` | **Sửa.** Chèn bước dịch sau Bước 4 (đổi tên) |
| `scripts/kiem-dist.mjs` | **Sửa.** Thêm luật C — danh sách "buộc phải ra tiếng Việt" |
| `src/__tests__/vendor-dich.spec.ts` | **Mới.** Ca kiểm luật vị trí + cổng độc lập + tích hợp |
| `package.json` | **Sửa.** Thêm script `dichchuoi:vendor` |

---

## Task 1: Tách bước dịch sang script riêng, chưa đổi thuật toán

Chỉ di chuyển mã. Thuật toán vẫn là regex cũ. Mục đích: diff của Task 3 chỉ còn phần đổi thuật
toán, không lẫn với phần di chuyển.

**Files:**
- Create: `scripts/dich-chuoi-vendor.mjs`
- Modify: `scripts/doi-ten-vendor.mjs` (gỡ dòng 14, 107–112, và mục 2 của comment đầu file)
- Modify: `scripts/dung-vendor.mjs` (chèn bước mới sau khối "Bước 4 — đổi tên", dòng 102–108)
- Modify: `package.json` (thêm script)

**Interfaces:**
- Consumes: không có (task đầu).
- Produces: `scripts/dich-chuoi-vendor.mjs` chạy độc lập được bằng
  `node scripts/dich-chuoi-vendor.mjs`, đọc `src/board/vi.json`, sửa `.vendor-build/**/*.js` tại chỗ.

- [ ] **Bước 1: Tạo `scripts/dich-chuoi-vendor.mjs`**

```js
// D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json.
//
// Tách khỏi scripts/doi-ten-vendor.mjs vì hai việc khác bản chất: đổi tiền tố `affine-` → `drt-`
// là phép thay ĐỒNG NHẤT, sai ở đâu cũng lộ qua kiem:dist; còn dịch chuỗi là phép thay CÓ ĐIỀU
// KIỆN THEO NGỮ CẢNH, sai thì im lặng. Gộp chung một file khiến cả hai khó soi.
//
// Chạy SAU doi-ten-vendor.mjs: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(GOC, '.vendor-build')
const banDoDich = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))

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
let soDich = 0

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  let js = goc
  // Chỉ thay khi nằm trọn trong một literal, tránh đụng tên biến.
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

console.log(`dich-chuoi-vendor: ${soFile} file đã sửa · ${soDich} lượt dịch`)
process.exit(0)
```

- [ ] **Bước 2: Gỡ bước dịch khỏi `scripts/doi-ten-vendor.mjs`**

Xoá dòng 14:

```js
const banDoDich = JSON.parse(readFileSync('src/board/vi.json', 'utf8'))
```

Xoá dòng 24–25 (hàm `thoat`, giờ không còn chỗ dùng):

```js
// Thoát ký tự đặc biệt của regex trong chuỗi cần dịch.
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
```

Xoá khối dòng 107–112:

```js
  // 3. Chuỗi hiển thị. Chỉ thay khi nằm trọn trong một literal, tránh đụng tên biến.
  for (const [en, vi] of Object.entries(banDoDich)) {
    const truoc = js
    js = js.replace(new RegExp(`(['"\`])${thoat(en)}\\1`, 'g'), (_m, q) => `${q}${vi}${q}`)
    if (js !== truoc) soDich++
  }
```

Xoá khai báo `let soDich = 0` (dòng 29) và sửa dòng log cuối (dòng 120) bỏ phần `soDich`:

```js
console.log(`Đã biến đổi ${soFile} file · ${soDoiTen} file đổi tên`)
```

Sửa mục 2 của comment đầu file (dòng 3) thành:

```js
//   2. (Bước dịch chuỗi D12 đã tách sang scripts/dich-chuoi-vendor.mjs — chạy ngay sau file này)
```

- [ ] **Bước 3: Chèn bước dịch vào `scripts/dung-vendor.mjs`**

Chèn NGAY SAU khối "Bước 4 — đổi tên" (sau dòng 108, trước comment "Bước 5"):

```js
// Bước 4b — dịch chuỗi hiển thị (D12). Phải chạy SAU đổi tên: bản dịch đáp lên cây đã đổi tên.
// Tách khỏi bước đổi tên vì đây là phép thay có điều kiện theo ngữ cảnh — xem đầu
// scripts/dich-chuoi-vendor.mjs. Exit code ở đây có ý nghĩa thật: script này không có lý do sẵn
// có nào để thoát khác 0, nên thất bại là phải dừng, không được nuốt.
const ketQuaDich = chay('node', ['scripts/dich-chuoi-vendor.mjs'], 'dichchuoi:vendor')
if (ketQuaDich.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước dịch chuỗi thất bại (exit code ${ketQuaDich.status}).`,
  )
  process.exit(ketQuaDich.status ?? 1)
}
```

- [ ] **Bước 4: Thêm script vào `package.json`**

Chèn ngay sau dòng `"doiten:vendor"`:

```json
    "dichchuoi:vendor": "node scripts/dich-chuoi-vendor.mjs",
```

- [ ] **Bước 5: Dựng lại và xác nhận không đổi hành vi**

Chạy: `npm run dung:vendor`

Kỳ vọng: chạy hết không lỗi, và in ra dòng `dich-chuoi-vendor: ... lượt dịch` với `soDich` **7**
(đúng con số bước dịch cũ in ra trong `Đã biến đổi ... 7 lượt dịch`).

- [ ] **Bước 6: Xác nhận 5 bản dịch vẫn đáp xuống**

Chạy:

```bash
node -e "const{readFileSync}=require('fs');const m=JSON.parse(readFileSync('src/board/vi.json','utf8'));const{execSync}=require('child_process');for(const v of Object.values(m)){const n=execSync('grep -rl \"'+v+'\" .vendor-build --include=*.js || true').toString().trim();console.log((n?'CÓ  ':'MẤT ')+v)}"
```

Kỳ vọng: cả 5 dòng đều `CÓ`.

- [ ] **Bước 7: Chạy đủ bộ cổng**

Chạy: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build`

Kỳ vọng: `tsc` exit 0 · 40/40 ca xanh (11 file) · `kiem:vendor` lệch 0 · `kiem:vendor-paths` 438 mục
khớp · build xong, `kiem-dist` xanh.

- [ ] **Bước 8: Commit**

```bash
git add scripts/dich-chuoi-vendor.mjs scripts/doi-ten-vendor.mjs scripts/dung-vendor.mjs package.json
git commit -m "Tách bước dịch chuỗi D12 sang script riêng, chưa đổi thuật toán"
```

---

## Task 2: Module thuần cho luật vị trí, TDD, chưa nối vào pipeline

**Files:**
- Create: `scripts/luat-vi-tri-dich.mjs`
- Create: `scripts/luat-vi-tri-dich.d.mts`
- Create: `src/__tests__/vendor-dich.spec.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `viTriHienThi(node: ts.Node): string | null` — trả nhãn vị trí nếu được phép dịch, `null` nếu không.
  - `dichMotFile(js: string, banDo: Record<string,string>, tenFile?: string): { js: string, cacLuot: Luot[] }`
  - `type Luot = { chuoiGoc: string, chuoiDich: string, viTri: string, dong: number }`
  - Hằng xuất khẩu: `THUOC_TINH_HIEN_THI: Set<string>`, `DOI_SO_HIEN_THI: Set<string>`,
    `THUOC_TINH_HTML_HIEN_THI: string[]`

- [ ] **Bước 1: Viết ca kiểm đỏ — `src/__tests__/vendor-dich.spec.ts`**

```ts
// D12 — luật vị trí của phép thay chuỗi hiển thị.
//
// Vì sao phải kiểm theo VỊ TRÍ chứ không theo nội dung chuỗi: cơ chế cũ khớp trọn một literal ở
// bất cứ đâu, nên "LinkedPage" vừa là nhãn ở `name:` vừa là GIÁ TRỊ LƯỢC ĐỒ ở `type:` — dịch cả
// hai là hỏng phân giải liên kết, không lỗi, không cổng nào đỏ.
import { describe, expect, it } from 'vitest'

import { dichMotFile } from '../../scripts/luat-vi-tri-dich.mjs'

const BAN_DO = { Style: 'Phong cách', LinkedPage: 'Trang liên kết', Escape: 'Thoát', None: 'Không' }

const dich = (js: string) => dichMotFile(js, BAN_DO, 'thu.js').js

describe('D12 — vị trí ĐƯỢC dịch', () => {
  it('giá trị của thuộc tính label', () => {
    expect(dich(`const a = { label: 'Style' }`)).toContain('Phong cách')
  })

  it('giá trị của thuộc tính name', () => {
    expect(dich(`const a = { name: 'Style' }`)).toContain('Phong cách')
  })

  it('giá trị của thuộc tính tooltip', () => {
    expect(dich(`const a = { tooltip: 'Style' }`)).toContain('Phong cách')
  })

  it('đối số của toast', () => {
    expect(dich(`toast(std, 'Style')`)).toContain('Phong cách')
  })

  it('literal đứng một mình sau data-tip= trong template', () => {
    const ra = dich('html`<x data-tip="${\'Style\'}"></x>`')
    expect(ra).toContain('Phong cách')
  })
})

describe('D12 — vị trí KHÔNG được đụng', () => {
  // Mỗi ca dưới đây canh một lớp hỏng khác nhau. Bằng chứng đỏ: thêm tên vị trí tương ứng vào
  // danh sách cho phép trong scripts/luat-vi-tri-dich.mjs thì ca đó PHẢI đỏ.
  it('giá trị lược đồ ở type:', () => {
    expect(dich(`const a = { type: 'LinkedPage' }`)).toContain('LinkedPage')
  })

  it('định danh mục menu ở key:', () => {
    expect(dich(`const a = { key: 'Style' }`)).toContain(`'Style'`)
  })

  it('tra khoá obj[...]', () => {
    expect(dich(`const v = cau_hinh['None']`)).toContain(`'None'`)
  })

  it('so sánh ===', () => {
    expect(dich(`if (e.key === 'Escape') return`)).toContain(`'Escape'`)
  })

  it('nhánh case', () => {
    expect(dich(`switch (k) { case 'Escape': break }`)).toContain(`'Escape'`)
  })

  it('thông báo lỗi nội bộ new Error(...)', () => {
    expect(dich(`throw new Error('Style')`)).toContain(`'Style'`)
  })

  it('định danh tiêm phụ thuộc createIdentifier(...)', () => {
    expect(dich(`const I = createIdentifier('Style')`)).toContain(`'Style'`)
  })

  it('tên sự kiện đo đạc track(...)', () => {
    expect(dich(`track(std, 'Style')`)).toContain(`'Style'`)
  })

  it('literal là VẾ GHÉP trong template, không đứng một mình', () => {
    const ra = dich('html`<x data-tip="${\'Style\' + hau}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('literal sau thuộc tính KHÔNG hiển thị trong template', () => {
    const ra = dich('html`<x class="${\'Style\'}"></x>`')
    expect(ra).toContain(`'Style'`)
  })
})

describe('D12 — ca xương sống: cùng chuỗi, hai vị trí, cùng file', () => {
  // Tái hiện chính xác thứ suýt làm hỏng dữ liệu. Đây là ca quan trọng nhất của bộ này.
  it('name: được dịch, type: còn nguyên văn', () => {
    const ra = dich(`
      const muc = { name: 'LinkedPage', icon: I() }
      const du_lieu = { reference: { type: 'LinkedPage', pageId: p } }
    `)
    expect(ra).toContain(`name: "Trang liên kết"`)
    expect(ra).toContain(`type: 'LinkedPage'`)
  })
})

describe('D12 — báo cáo lượt thay', () => {
  it('ghi đúng vị trí và số dòng', () => {
    const { cacLuot } = dichMotFile(`const a = { label: 'Style' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Style', chuoiDich: 'Phong cách', viTri: 'thuộc-tính:label', dong: 1 },
    ])
  })

  it('không thay gì thì báo cáo rỗng', () => {
    const { cacLuot } = dichMotFile(`const a = { type: 'LinkedPage' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([])
  })
})
```

- [ ] **Bước 2: Chạy để chắc chắn nó đỏ**

Chạy: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Kỳ vọng: ĐỎ với lỗi phân giải module `../../scripts/luat-vi-tri-dich.mjs` (chưa tồn tại).

- [ ] **Bước 3: Viết `scripts/luat-vi-tri-dich.mjs`**

```js
// Luật vị trí của D12 — phần THUẦN, không đọc/ghi đĩa gì cả.
//
// Nguyên tắc: DANH SÁCH CHO PHÉP, HỎNG THÌ ĐÓNG. Đo được 127 loại vị trí cú pháp khác nhau chứa
// chuỗi viết-hoa-đầu trong cây vendored — liệt kê chỗ CẤM là việc không bao giờ xong, nên chỉ
// liệt kê chỗ CHO PHÉP. Vị trí lạ → không đụng. Hỏng theo hướng "chuỗi không được dịch" (nhìn
// thấy được) thay vì "dữ liệu bị dịch" (im lặng).
import ts from 'typescript'

// Giá trị của các thuộc tính này là chuỗi hiển thị. Đo trên cây vendored: 822 lượt.
// KHÔNG được thêm `key` vào đây: nó chứa "Align left", "Align right" — đọc lên y hệt nhãn hiển
// thị nhưng là ĐỊNH DANH mục menu, dịch vào là gãy tra cứu.
export const THUOC_TINH_HIEN_THI = new Set([
  'name', 'label', 'tooltip', 'description', 'caption',
  'group', 'text', 'title', 'menuName', 'displayName', 'placeholder',
])

// Đối số của các hàm này là chuỗi hiển thị cho người dùng cuối.
// KHÔNG thêm `error`/`warn`/`debugLog` (thông báo cho lập trình viên) hay `track` (tên sự kiện đo
// đạc) hay `createIdentifier` (định danh tiêm phụ thuộc — dịch là gãy phân giải service).
export const DOI_SO_HIEN_THI = new Set(['toast'])

// Luật hẹp cho template: chỉ nhận literal đứng MỘT MÌNH trong một nhịp `${…}` và đứng ngay sau
// một thuộc tính HTML hiển thị. Danh sách có đúng một mục vì đó là mục duy nhất ĐO ĐƯỢC (12 lượt,
// 10 chuỗi, tất cả qua data-tip=). Thượng nguồn thêm `title=` hay `aria-label=` thì chuỗi đó
// không được dịch — hỏng theo hướng nhìn thấy được. Mở rộng khi đo được chỗ mới, không thêm trước.
export const THUOC_TINH_HTML_HIEN_THI = ['data-tip']

function tenThuocTinh(name) {
  if (!name) return null
  if (name.kind === ts.SyntaxKind.Identifier) return name.text
  if (name.kind === ts.SyntaxKind.StringLiteral) return name.text
  return null
}

function tenHam(expr) {
  if (!expr) return null
  if (expr.kind === ts.SyntaxKind.Identifier) return expr.text
  if (expr.kind === ts.SyntaxKind.PropertyAccessExpression) return expr.name?.text ?? null
  return null
}

// Đoạn văn bản đứng NGAY TRƯỚC nhịp template — là `head` nếu đây là nhịp đầu, ngược lại là phần
// literal của nhịp liền trước.
function vanBanTruocNhip(span) {
  const te = span.parent
  if (!te || te.kind !== ts.SyntaxKind.TemplateExpression) return null
  const i = te.templateSpans.indexOf(span)
  if (i < 0) return null
  return i === 0 ? te.head.text : te.templateSpans[i - 1].literal.text
}

export function viTriHienThi(node) {
  const p = node.parent
  if (!p) return null

  if (p.kind === ts.SyntaxKind.PropertyAssignment && p.initializer === node) {
    const ten = tenThuocTinh(p.name)
    return ten && THUOC_TINH_HIEN_THI.has(ten) ? `thuộc-tính:${ten}` : null
  }

  if (p.kind === ts.SyntaxKind.CallExpression && p.expression !== node) {
    const ten = tenHam(p.expression)
    return ten && DOI_SO_HIEN_THI.has(ten) ? `đối-số:${ten}` : null
  }

  if (p.kind === ts.SyntaxKind.TemplateSpan && p.expression === node) {
    const truoc = vanBanTruocNhip(p)
    if (truoc == null) return null
    for (const a of THUOC_TINH_HTML_HIEN_THI) {
      if (new RegExp(`${a}\\s*=\\s*["']$`).test(truoc)) return `thuộc-tính-html:${a}`
    }
  }

  return null
}

export function dichMotFile(js, banDo, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

  // Phân tích hỏng thì DỪNG, không bỏ qua im lặng: bỏ qua một file là mất bản dịch của cả một
  // widget mà không ai biết. `parseDiagnostics` là API nội bộ của TypeScript nhưng ổn định và là
  // cách duy nhất biết cây có hỏng hay không — createSourceFile không bao giờ ném.
  //
  // Đã đo trước khi viết kế hoạch (2026-08-14): 2.550/2.550 file của cây vendored cho
  // `parseDiagnostics` RỖNG, tức cổng này không báo đỏ giả; và một file cố tình hỏng (`const a = {`)
  // cho đúng 1 chẩn đoán, tức nó thật sự canh. Nếu về sau cổng đỏ hàng loạt trên file hợp lệ thì
  // đó là tin tức, không phải phiền toái — báo BLOCKED, đừng gỡ cổng cho xanh.
  const loiCuPhap = sf.parseDiagnostics ?? []
  if (loiCuPhap.length > 0) {
    throw new Error(
      `luat-vi-tri-dich: không phân tích được ${tenFile} — ${loiCuPhap.length} lỗi cú pháp. ` +
        'Bỏ qua file này là mất bản dịch của cả một widget mà không cổng nào bắt được.',
    )
  }

  const thay = []
  const di = (n) => {
    if (
      n.kind === ts.SyntaxKind.StringLiteral ||
      n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      const vi = banDo[n.text]
      if (vi !== undefined) {
        const viTri = viTriHienThi(n)
        if (viTri) {
          const dau = n.getStart(sf)
          thay.push({
            dau,
            cuoi: n.getEnd(),
            chuoiGoc: n.text,
            chuoiDich: vi,
            viTri,
            dong: sf.getLineAndCharacterOfPosition(dau).line + 1,
          })
        }
      }
    }
    ts.forEachChild(n, di)
  }
  di(sf)

  // Thay từ CUỐI về ĐẦU để các vị trí chưa xử lý không bị lệch.
  // `JSON.stringify` sinh ra literal nháy kép đã thoát đúng — không phải tự lo dấu nháy trong bản
  // dịch, và luôn là JS hợp lệ kể cả khi chỗ gốc dùng nháy đơn hay backtick.
  let ra = js
  for (const t of [...thay].sort((a, b) => b.dau - a.dau)) {
    ra = ra.slice(0, t.dau) + JSON.stringify(t.chuoiDich) + ra.slice(t.cuoi)
  }

  return {
    js: ra,
    cacLuot: thay
      .sort((a, b) => a.dau - b.dau)
      .map(({ chuoiGoc, chuoiDich, viTri, dong }) => ({ chuoiGoc, chuoiDich, viTri, dong })),
  }
}
```

- [ ] **Bước 4: Viết `scripts/luat-vi-tri-dich.d.mts`**

```ts
// Khai kiểu cho scripts/luat-vi-tri-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
import type ts from 'typescript'

export declare const THUOC_TINH_HIEN_THI: Set<string>
export declare const DOI_SO_HIEN_THI: Set<string>
export declare const THUOC_TINH_HTML_HIEN_THI: string[]

export interface Luot {
  chuoiGoc: string
  chuoiDich: string
  viTri: string
  dong: number
}

export declare function viTriHienThi(node: ts.Node): string | null

export declare function dichMotFile(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: Luot[] }
```

- [ ] **Bước 5: Chạy ca kiểm — phải xanh**

Chạy: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Kỳ vọng: XANH, 18 ca.

- [ ] **Bước 6: Xác nhận bằng chứng đỏ — bắt buộc, không được suy luận thay**

Làm lần lượt ba phép, mỗi phép: sửa → chạy → thấy đỏ → hoàn tác.

1. Thêm `'type'` vào `THUOC_TINH_HIEN_THI`. Chạy
   `npx vitest run src/__tests__/vendor-dich.spec.ts`.
   Kỳ vọng: ĐỎ ở ca *"giá trị lược đồ ở type:"* và ca *"name: được dịch, type: còn nguyên văn"*.
   Hoàn tác.
2. Thêm `'track'` vào `DOI_SO_HIEN_THI`. Chạy lại.
   Kỳ vọng: ĐỎ ở ca *"tên sự kiện đo đạc track(...)"*. Hoàn tác.
3. Thêm `'class'` vào `THUOC_TINH_HTML_HIEN_THI`. Chạy lại.
   Kỳ vọng: ĐỎ ở ca *"literal sau thuộc tính KHÔNG hiển thị trong template"*. Hoàn tác.

Nếu phép nào KHÔNG đỏ thì ca kiểm đó đang đo sai thứ nó tuyên bố đo — sửa ca kiểm trước khi đi
tiếp. Ghi kết quả ba phép này vào báo cáo task.

- [ ] **Bước 7: Cổng đầy đủ**

Chạy: `npx tsc --noEmit && npm test`

Kỳ vọng: `tsc` exit 0 · 58/58 ca xanh (12 file).

- [ ] **Bước 8: Commit**

```bash
git add scripts/luat-vi-tri-dich.mjs scripts/luat-vi-tri-dich.d.mts src/__tests__/vendor-dich.spec.ts
git commit -m "Luật vị trí D12: module thuần + 18 ca kiểm, chưa nối vào pipeline"
```

---

## Task 3: Nối luật vị trí vào pipeline, phát báo cáo, ba cổng DỪNG

**Files:**
- Modify: `scripts/dich-chuoi-vendor.mjs` (viết lại phần lõi)

**Interfaces:**
- Consumes: `dichMotFile()` từ Task 2.
- Produces: `.vendor-build/bao-cao-dich.json` — `{ tongLuot, theoKhoa: { [en]: Luot[] & {file} } }`.

- [ ] **Bước 1: Viết lại `scripts/dich-chuoi-vendor.mjs`**

```js
// D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json.
//
// Tách khỏi scripts/doi-ten-vendor.mjs vì hai việc khác bản chất: đổi tiền tố `affine-` → `drt-`
// là phép thay ĐỒNG NHẤT, sai ở đâu cũng lộ qua kiem:dist; còn dịch chuỗi là phép thay CÓ ĐIỀU
// KIỆN THEO NGỮ CẢNH, sai thì im lặng.
//
// Luật vị trí nằm ở scripts/luat-vi-tri-dich.mjs (thuần, kiểm được bằng đoạn mã nhỏ). File này
// chỉ lo I/O, báo cáo và ba cổng DỪNG.
//
// Chạy SAU doi-ten-vendor.mjs: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { dichMotFile } from './luat-vi-tri-dich.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(GOC, '.vendor-build')
const BAO_CAO = path.join(BUILD, 'bao-cao-dich.json')

const banDo = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))

// ─── Cổng 1: bản dịch trùng y hệt bản gốc ───────────────────────────────────────────────────
// Dòng thừa, hoặc dấu hiệu chép nhầm cột khi soạn bảng. Bắt ngay, đừng để nó đi tiếp rồi trở
// thành một khoá "đã dịch" mà không dịch gì.
const trung = Object.entries(banDo).filter(([en, vi]) => en === vi)
if (trung.length) {
  console.error(
    'dich-chuoi-vendor: DỪNG — bản dịch trùng y hệt bản gốc ở các khoá sau. Đó là dòng thừa, ' +
      'hoặc dấu hiệu chép nhầm cột khi soạn bảng:',
  )
  trung.forEach(([en]) => console.error(`   "${en}"`))
  process.exit(1)
}

async function* dietJs(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietJs(f)
    else if (e.name.endsWith('.js')) yield f
  }
}

const theoKhoa = Object.fromEntries(Object.keys(banDo).map((k) => [k, []]))
let soFile = 0
let tongLuot = 0

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  const rel = path.relative(BUILD, f).split(path.sep).join('/')

  // ─── Cổng 2: file không phân tích được ───────────────────────────────────────────────────
  // dichMotFile ném lỗi; không bắt để nuốt. Bỏ qua một file là mất bản dịch của cả một widget
  // mà không cổng nào bắt được.
  let ketQua
  try {
    ketQua = dichMotFile(goc, banDo, rel)
  } catch (err) {
    console.error(`dich-chuoi-vendor: DỪNG — ${err.message}`)
    process.exit(1)
  }

  if (ketQua.cacLuot.length === 0) continue

  for (const l of ketQua.cacLuot) {
    theoKhoa[l.chuoiGoc].push({ file: rel, viTri: l.viTri, dong: l.dong, chuoiDich: l.chuoiDich })
    tongLuot++
  }
  writeFileSync(f, ketQua.js)
  soFile++
}

writeFileSync(BAO_CAO, JSON.stringify({ tongLuot, theoKhoa }, null, 2))

// ─── Cổng 3: khoá chết ──────────────────────────────────────────────────────────────────────
// Đây là bộ bắt trôi thượng nguồn CHÍNH XÁC HƠN cổng D12 cũ ở src/__tests__/vendor-doi-ten.spec.ts.
// Cổng cũ hỏi "chuỗi này còn nằm đâu đó trong cây nguồn không"; cổng này hỏi "chuỗi này có thật sự
// được dịch ở một VỊ TRÍ HIỂN THỊ không". Một chuỗi bị thượng nguồn đổi từ `label:` sang `key:`
// vẫn qua được cổng cũ mà chết ở đây — và đó đúng là lúc bản dịch trôi mất mà không ai biết.
const khoaChet = Object.entries(theoKhoa).filter(([, v]) => v.length === 0).map(([k]) => k)
if (khoaChet.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — ${khoaChet.length} khoá trong src/board/vi.json không dịch được ` +
      'chỗ nào. Hoặc thượng nguồn đã đổi chuỗi, hoặc nó đã chuyển sang một vị trí cú pháp KHÔNG ' +
      'nằm trong danh sách cho phép (xem scripts/luat-vi-tri-dich.mjs). Đừng xoá khoá cho xanh — ' +
      'tìm chỗ mới của nó trước:',
  )
  khoaChet.forEach((k) => console.error(`   "${k}"`))
  process.exit(1)
}

console.log(
  `dich-chuoi-vendor: ${soFile} file đã sửa · ${tongLuot} lượt dịch · ` +
    `${Object.keys(banDo).length} khoá đều còn sống · báo cáo: ${path.relative(GOC, BAO_CAO)}`,
)
process.exit(0)
```

- [ ] **Bước 2: Dựng lại**

Chạy: `npm run dung:vendor`

Kỳ vọng: chạy hết không lỗi. Dòng cuối của bước dịch in `5 khoá đều còn sống` và `tongLuot` là
**7**, phân bố đúng như sau (đã đo trước khi viết kế hoạch):

| Khoá | Số lượt | Vị trí |
|---|---|---|
| `Style` | 3 | `thuộc-tính:label` (connector, mindmap, shape toolbar config) |
| `Layout` | 1 | `thuộc-tính:label` (mindmap toolbar config) |
| `Add media` | 1 | `thuộc-tính-html:data-tip` |
| `Import failed, please try again` | 1 | `đối-số:toast` |
| `Support import of FreeMind,OPML.` | 1 | `thuộc-tính-html:data-tip` |

Con số này trùng với `7 lượt dịch` mà regex cũ in ra, nhưng **trùng do tình cờ**: regex cũ đếm theo
*cặp (file, khoá) có thay đổi*, bộ mới đếm theo *lượt thay thật*. Chúng bằng nhau vì không khoá nào
xuất hiện hai lần trong cùng một file. Đừng dùng phép trùng này làm cổng cho các lượt sau.

Nếu số khoá sống khác 5 thì DỪNG và đọc thông báo, đừng sửa `vi.json` cho xanh.

- [ ] **Bước 3: Xác nhận báo cáo có đúng hai khoá đi qua luật hẹp template**

Chạy:

```bash
node -e "const r=require('./.vendor-build/bao-cao-dich.json');for(const[k,v]of Object.entries(r.theoKhoa))console.log(k.padEnd(34)+v.map(x=>x.viTri).join(', '))"
```

Kỳ vọng: `Add media` và `Support import of FreeMind,OPML.` đều hiện `thuộc-tính-html:data-tip`;
`Style` hiện `thuộc-tính:label` ba lần; `Layout` hiện `thuộc-tính:label`;
`Import failed, please try again` hiện `đối-số:toast`.

- [ ] **Bước 4: Xác nhận dữ liệu lược đồ còn nguyên**

Chạy: `grep -rc "type: 'LinkedPage'" .vendor-build --include=*.js | grep -v ':0' | head`

Kỳ vọng: vẫn còn các file chứa `type: 'LinkedPage'` nguyên văn (không có khoá `LinkedPage` trong
`vi.json` nên đây là phép kiểm âm; nó phải giữ nguyên bất kể).

- [ ] **Bước 5: Cổng đầy đủ**

Chạy: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build`

Kỳ vọng: tất cả xanh, 58/58 ca.

- [ ] **Bước 6: Commit**

```bash
git add scripts/dich-chuoi-vendor.mjs
git commit -m "Nối luật vị trí vào pipeline dịch, phát báo cáo kiểm toán, ba cổng DỪNG"
```

---

## Task 4: Cổng độc lập tính lại từ đầu ra thật

**Files:**
- Modify: `src/__tests__/vendor-dich.spec.ts` (thêm một `describe` ở cuối)

**Interfaces:**
- Consumes: `viTriHienThi()` từ Task 2; `.vendor-build/` đã dịch từ Task 3.
- Produces: không có.

- [ ] **Bước 1: Thêm ca kiểm vào cuối `src/__tests__/vendor-dich.spec.ts`**

Thêm vào phần import ở đầu file:

```ts
import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

import { dichMotFile, viTriHienThi } from '../../scripts/luat-vi-tri-dich.mjs'
```

(thay dòng import `dichMotFile` cũ)

Thêm vào cuối file:

```ts
const BUILD = '.vendor-build'

async function* dietJs(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietJs(f)
    else if (e.name.endsWith('.js')) yield f
  }
}

describe('D12 — cổng độc lập trên đầu ra thật', () => {
  // Cổng này TÍNH LẠI TỪ ĐẦU trên .vendor-build/ và cố tình KHÔNG đọc bao-cao-dich.json: nếu bộ
  // thay có lỗi thì báo cáo cũng sai theo, hai thứ cùng sai một kiểu thì không cổng nào bắt được.
  // Chỉ phép tính lại độc lập mới có giá trị.
  it('mọi chuỗi tiếng Việt trong .vendor-build đều nằm ở vị trí cho phép', async () => {
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    const banDich = new Set(Object.values(banDo))
    const soPham: string[] = []

    for await (const f of dietJs(BUILD)) {
      const src = readFileSync(f, 'utf8')
      let coKhong = false
      for (const v of banDich) {
        if (src.includes(v)) {
          coKhong = true
          break
        }
      }
      if (!coKhong) continue

      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
      const di = (n: ts.Node) => {
        if (ts.isStringLiteral(n) && banDich.has(n.text) && viTriHienThi(n) === null) {
          soPham.push(`${path.relative(BUILD, f)}: "${n.text}"`)
        }
        ts.forEachChild(n, di)
      }
      di(sf)
      if (soPham.length > 5) return expect(soPham).toEqual([])
    }

    expect(soPham).toEqual([])
  }, 120_000)

  it('bộ thay là bất biến — chạy lại trên cây ĐÃ dịch không đổi gì nữa', async () => {
    // Nếu một bản dịch tiếng Việt lại trùng một khoá tiếng Anh khác, lượt chạy thứ hai sẽ dịch
    // tiếp và bản build khác nhau tuỳ số lần chạy. Bước 0 của dung-vendor.mjs xoá sạch nên chuyện
    // này không xảy ra trong pipeline, nhưng ca này khoá lại tính chất đó cho các lượt sửa sau.
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    let soFileDoi = 0
    for await (const f of dietJs(BUILD)) {
      const src = readFileSync(f, 'utf8')
      if (dichMotFile(src, banDo, f).cacLuot.length > 0) soFileDoi++
    }
    expect(soFileDoi).toBe(0)
  }, 120_000)
})
```

- [ ] **Bước 2: Chạy ca kiểm**

Chạy: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Kỳ vọng: XANH, 20 ca.

- [ ] **Bước 3: Xác nhận bằng chứng đỏ của cổng độc lập**

Sửa tạm `scripts/luat-vi-tri-dich.mjs`: gỡ `'label'` khỏi `THUOC_TINH_HIEN_THI`. Chạy
`npm run dung:vendor` — kỳ vọng bước dịch **DỪNG** vì `Style`/`Layout` thành khoá chết. Hoàn tác,
dựng lại.

Phép này chứng minh cổng khoá chết ở Task 3 thật sự canh. Ghi kết quả vào báo cáo task.

- [ ] **Bước 4: Cổng đầy đủ**

Chạy: `npx tsc --noEmit && npm test`

Kỳ vọng: `tsc` exit 0 · 60/60 ca xanh.

- [ ] **Bước 5: Commit**

```bash
git add src/__tests__/vendor-dich.spec.ts
git commit -m "Cổng độc lập: tính lại từ .vendor-build, không tin báo cáo của chính bộ thay"
```

---

## Task 5: `kiem:dist` — danh sách "buộc phải ra tiếng Việt"

**Files:**
- Modify: `scripts/kiem-dist.mjs` (thêm luật C)

**Interfaces:**
- Consumes: `.vendor-build/` đã dịch, `dist/` đã build.
- Produces: không có.

- [ ] **Bước 1: Thêm luật C vào `scripts/kiem-dist.mjs`**

Sửa comment đầu file, thêm sau khối "Hai luật" (dòng 12–18) — đổi "Hai luật" thành "Ba luật" và
thêm:

```js
//   C. Mọi bản dịch trong src/board/vi.json phải CÓ MẶT trong bản phát hành. Không đếm tổng: 121
//      chuỗi ứng viên bị tree-shake nên tổng số trồi sụt vô nghĩa. Luật này soi đúng những chuỗi
//      ĐÃ ĐƯỢC CHỌN dịch — nếu một cái biến mất khỏi dist/ thì hoặc bước dịch không chạy, hoặc
//      chuỗi đó không còn trên đường render, và cả hai đều phải biết ngay.
```

Thêm sau khối khai báo `MIEN` (sau dòng 47):

```js
// Luật C — bản dịch phải tới được tay người dùng.
const BAN_DICH = Object.values(
  JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8')),
)
```

Thêm biến gom, cạnh `const conAffine = []` (dòng 64):

```js
const thieuBanDich = new Set(BAN_DICH)
```

Thêm vào trong vòng lặp file, ngay sau khối "Luật A" (sau dòng 77):

```js
  // Luật C.
  for (const v of thieuBanDich) {
    if (noiDung.includes(v)) thieuBanDich.delete(v)
  }
```

Thêm vào dòng log tổng kết (sau dòng 101), trong chuỗi template:

```js
    `  bản dịch vi.json — ${BAN_DICH.length - thieuBanDich.size}/${BAN_DICH.length} có mặt`,
```

Thêm khối báo lỗi, trước `if (loi) process.exit(1)` (dòng 133):

```js
if (thieuBanDich.size) {
  loi++
  console.error(
    `\nD12 ĐỎ — ${thieuBanDich.size} bản dịch trong src/board/vi.json KHÔNG có mặt trong dist/. ` +
      'Nghĩa là thanh công cụ bảng vẽ đang nói tiếng Anh ở đúng chỗ đã chọn dịch. Nguyên nhân ' +
      'thường gặp: bước dich-chuoi-vendor không chạy (kiểm dung-vendor.mjs), hoặc thượng nguồn đã ' +
      'chuyển chuỗi sang một vị trí cú pháp ngoài danh sách cho phép:',
  )
  ;[...thieuBanDich].forEach((v) => console.error(`   "${v}"`))
}
```

- [ ] **Bước 2: Chạy cổng — phải xanh**

Chạy: `npm run build`

Kỳ vọng: `kiem-dist` in `bản dịch vi.json — 5/5 có mặt` và kết thúc xanh.

- [ ] **Bước 3: Xác nhận bằng chứng đỏ**

Sửa tạm `src/board/vi.json`, thêm một khoá không tồn tại:

```json
  "Zzz Khong Ton Tai": "Chuỗi thử nghiệm"
```

Chạy `npm run dung:vendor` — kỳ vọng **DỪNG** ở cổng khoá chết của Task 3 (chưa tới được
`kiem-dist`). Hoàn tác `vi.json`.

Phép này cho thấy hai cổng xếp lớp đúng thứ tự: khoá chết bị bắt lúc dựng, trước cả lúc build.
Ghi kết quả vào báo cáo task.

- [ ] **Bước 4: Cổng đầy đủ**

Chạy: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build`

Kỳ vọng: tất cả xanh · 60/60 ca · `kiem-dist` xanh với `5/5 có mặt`.

- [ ] **Bước 5: Cập nhật `HANDOFF.md`**

Trong mục 4, bảng "Sáu cổng và việc của từng cái", thêm dòng:

```
| `dichchuoi:vendor` | mọi khoá `vi.json` dịch được ở ĐÚNG một vị trí hiển thị; khoá chết thì DỪNG |
```

Trong mục 6 (nợ còn lại), xoá dòng về `src/board/vi.json` chỉ có 5 chuỗi và thay bằng:

```
- `src/board/vi.json` vẫn 5 chuỗi, nhưng cơ chế đã an toàn ở quy mô lớn (spec
  `2026-08-14-bo-sung-vi-json-design.md`, kế hoạch `2026-08-14-bo-sung-vi-json.md`). Chặng tiếp là
  nội dung dịch: chốt bảng thuật ngữ 61 từ rồi dịch 323 chuỗi.
```

- [ ] **Bước 6: Commit**

```bash
git add scripts/kiem-dist.mjs docs/superpowers/HANDOFF.md
git commit -m "kiem:dist luật C — bản dịch vi.json buộc phải có mặt trong bản phát hành"
```

---

## Nghiệm thu

Chạy đủ bộ cổng trên cây vừa dựng lại từ đầu:

```bash
npm run dung:vendor && npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build
```

| Cổng | Kỳ vọng |
|---|---|
| `dung:vendor` | `5 khoá đều còn sống`, 8 lượt dịch |
| `tsc --noEmit` | exit 0 |
| `npm test` | 60/60 ca xanh (12 file) |
| `kiem:vendor` | 2782 file, lệch 0 |
| `kiem:vendor-paths` | 438 mục khớp |
| `build` + `kiem:dist` | xanh, `bản dịch vi.json — 5/5 có mặt` |
| Bằng chứng đỏ | 5 phép ở Task 2 bước 6, Task 4 bước 3, Task 5 bước 3 — tất cả đã chạy và đã đỏ |

Mở app ở màn Mindmap, thanh công cụ vẫn hiện đúng 5 chuỗi tiếng Việt như trước — kế hoạch này
**không thêm bản dịch nào**, nó chỉ làm cho việc thêm về sau trở nên an toàn.
