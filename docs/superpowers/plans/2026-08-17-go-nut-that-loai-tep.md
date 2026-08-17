# Gỡ nút thắt Images/MindMap trong FileTypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách khoá tra cứu khỏi nhãn hiển thị `description` trong mảng `FileTypes` của
`affine/shared/src/utils/file/filesys.js` (compiled), để `"Images"`/`"MindMap"` dịch được sang tiếng
Việt mà không làm `openFilesWith`/`importMindmap` ném lỗi.

**Architecture:** Một hàm thuần mới (`tachDinhDanhLoaiTep`) chèn mảng định danh song song
`FILE_TYPE_IDS` (không đụng object `FileTypes`) và đổi hai lượt `.find(i => i.description ===
acceptType)` sang tra chỉ số. Chạy như một bước mới ("Bước 4a") trong `scripts/dung-vendor.mjs`,
giữa bước đổi tên và bước dịch chuỗi D12. Cổng 4 của D12 (`BAN_KHAI_TIEU_THU`) được cập nhật để
không còn ghim hai toạ độ đã biến mất. Sau đó thêm nội dung dịch cho hai khoá.

**Tech Stack:** Node.js (`.mjs`, ESM), gói `typescript` (dùng API `ts.createSourceFile` — chỉ phân
tích cú pháp, không type-check), Vitest cho ca kiểm.

## Global Constraints

- **D11 — không bao giờ sửa `src/vendor/blocksuite/**`.** Mọi thay đổi chỉ nằm ở `.vendor-build/`
  (sinh lại mỗi lượt `dung:vendor`) và ở `scripts/`/`src/__tests__/`/`src/board/vi.json`.
- **Không có danh sách miễn, không có cờ bật/tắt.** Cơ chế mới áp dụng luôn cho cả 9 phần tử của
  `FileTypes`, không phân biệt "2 mục đang kẹt" và "7 mục còn lại".
- **Fail-closed — mọi sai lệch cấu trúc phải `throw`, không bỏ qua im lặng.** Không dùng `?? []`
  hay try/catch nuốt lỗi ở bất cứ đâu trong `tachDinhDanhLoaiTep`.
- **Không đụng object `FileTypes`** — các object đó được truyền nguyên vẹn vào
  `window.showOpenFilePicker()`; chỉ thêm mảng `FILE_TYPE_IDS` song song, tách rời.
- **Danh sách kỳ vọng cứng, không suy luận:** `['Images', 'Videos', 'Audios', 'Markdown', 'Html',
  'Zip', 'Docx', 'OneNote', 'MindMap']`, đúng thứ tự.
- **Bản dịch mới:** `"Images"` → `"Hình ảnh"`, `"MindMap"` → `"Bản đồ tư duy"` (xem ĐÍNH CHÍNH ở
  Task 4 bên dưới — ban đầu định chọn `"Sơ đồ tư duy"` để khớp `"Mind Map"` đã có sẵn nhưng việc đó
  đụng cổng cấm trùng bản dịch). `"Images"` CHỈ được giữ lại nếu đo `kiem:dist` xác nhận nó tới
  `dist/`.
- **Không đụng `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự sửa.
- **Bảy cổng phải xanh ở cuối:** `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
  `kiem:vendor-build` · `build` · `kiem:dist`.
- **Tên định danh trong `scripts/` theo tiếng Việt** (đúng quy ước toàn bộ thư mục này:
  `tachDinhDanhLoaiTep`, `danhSachId`, `khaiBaoFileTypes`...), trừ hằng số/API vay mượn từ mã
  vendored tiếng Anh (`FileTypes`, `FILE_TYPE_IDS`, `acceptType`).
- Spec có thẩm quyền: `docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md`. Bất kỳ
  điểm nào trong plan này lệch với spec, spec thắng.

---

## Task 1: Hàm thuần `tachDinhDanhLoaiTep` — TDD, 11 ca kiểm

**Files:**
- Create: `scripts/tach-dinh-danh-loai-tep.mjs`
- Create: `scripts/tach-dinh-danh-loai-tep.d.mts`
- Test: `src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts`

**Interfaces:**
- Produces: `tachDinhDanhLoaiTep(js: string, tenFile?: string): { js: string; danhSachId: string[] }`
  — hàm thuần, không đọc/ghi đĩa. Ném `Error` với thông điệp mô tả rõ nguyên nhân khi cấu trúc đầu
  vào không khớp kỳ vọng. Task 2 gọi hàm này qua khối CLI cuối file (chạy khi
  `node scripts/tach-dinh-danh-loai-tep.mjs` được gọi trực tiếp).

- [ ] **Step 1: Viết toàn bộ ca kiểm (11 ca) — CHƯA có mã cài đặt**

Tạo `src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts`:

```ts
// Ca kiểm hàm thuần scripts/tach-dinh-danh-loai-tep.mjs — xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md §6.1.
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

import { tachDinhDanhLoaiTep } from '../../scripts/tach-dinh-danh-loai-tep.mjs'

const DANH_SACH_DUNG = [
  'Images',
  'Videos',
  'Audios',
  'Markdown',
  'Html',
  'Zip',
  'Docx',
  'OneNote',
  'MindMap',
]

// Dựng fixture tối giản CÙNG HÌNH DẠNG với affine/shared/src/utils/file/filesys.js thật (mảng
// FileTypes + N lượt gọi FileTypes.find(i => i.description === acceptType)), không cần đúng nội
// dung "accept" — hàm cần kiểm không đọc trường đó.
function dungFixture(moTa: string[], soLuotFind = 2): string {
  const phanTu = moTa.map((d) => `  { description: ${JSON.stringify(d)}, accept: {} },`).join('\n')
  const cacHam = Array.from(
    { length: soLuotFind },
    (_, i) =>
      `export async function ham${i}(acceptType) {\n` +
      `  return FileTypes.find(i => i.description === acceptType);\n` +
      `}`,
  ).join('\n')
  return `const FileTypes = [\n${phanTu}\n];\n${cacHam}\n`
}

describe('tachDinhDanhLoaiTep — đường cơ bản', () => {
  it('đầu vào đúng hình dạng → chèn FILE_TYPE_IDS ngay sau khai báo FileTypes', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js, danhSachId } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(danhSachId).toEqual(DANH_SACH_DUNG)
    expect(js).toContain(
      '];\nconst FILE_TYPE_IDS = ' + JSON.stringify(DANH_SACH_DUNG) + ';\nexport async function ham0',
    )
  })

  it('đổi cả hai lượt FileTypes.find(...description...) thành tra chỉ số', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(js).not.toContain('i.description === acceptType')
    expect(js.match(/FileTypes\[FILE_TYPE_IDS\.indexOf\(acceptType\)\]/g)).toHaveLength(2)
  })

  it('đầu ra vẫn phân tích cú pháp hợp lệ', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const { js } = tachDinhDanhLoaiTep(fixture, 'thu.js')
    const sf = ts.createSourceFile('thu.js', js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    expect(sf.parseDiagnostics).toEqual([])
  })

  it('chạy hai lần liên tiếp trên cùng input gốc cho kết quả giống hệt nhau', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 2)
    const lanMot = tachDinhDanhLoaiTep(fixture, 'thu.js')
    const lanHai = tachDinhDanhLoaiTep(fixture, 'thu.js')
    expect(lanMot).toEqual(lanHai)
  })
})

describe('tachDinhDanhLoaiTep — fail-closed khi cấu trúc lệch kỳ vọng', () => {
  it('thiếu một phần tử (8 thay vì 9) → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG.slice(0, 8), 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('đổi thứ tự hai phần tử đầu → throw', () => {
    const daoThuTu = ['Videos', 'Images', ...DANH_SACH_DUNG.slice(2)]
    const fixture = dungFixture(daoThuTu, 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('đổi chữ một description ("MindMap" → "Mind Map") → throw', () => {
    const doiChu = [...DANH_SACH_DUNG.slice(0, 8), 'Mind Map']
    const fixture = dungFixture(doiChu, 2)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/danh sách "description" đo được/)
  })

  it('chỉ có 1 lượt .find(...description...) thay vì 2 → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 1)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/kỳ vọng ĐÚNG 2 lượt/)
  })

  it('có 3 lượt .find(...description...) thay vì 2 → throw', () => {
    const fixture = dungFixture(DANH_SACH_DUNG, 3)
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/kỳ vọng ĐÚNG 2 lượt/)
  })
})

describe('tachDinhDanhLoaiTep — chặn trùng tên FILE_TYPE_IDS trước khi chèn', () => {
  it('đã có khai báo BIẾN trùng tên từ trước → throw', () => {
    const fixture = `const FILE_TYPE_IDS = [1, 2, 3];\n${dungFixture(DANH_SACH_DUNG, 2)}`
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/đã có khai báo/)
  })

  it('đã có khai báo HÀM trùng tên từ trước → throw', () => {
    const fixture = `function FILE_TYPE_IDS() {}\n${dungFixture(DANH_SACH_DUNG, 2)}`
    expect(() => tachDinhDanhLoaiTep(fixture, 'thu.js')).toThrow(/đã có khai báo/)
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận TẤT CẢ đỏ vì module chưa tồn tại**

Run: `npx vitest run src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts`
Expected: FAIL — lỗi import, `Cannot find module '../../scripts/tach-dinh-danh-loai-tep.mjs'` (hoặc
tương đương). Chép nguyên văn output vào báo cáo task.

- [ ] **Step 3: Viết `scripts/tach-dinh-danh-loai-tep.mjs`**

```js
// D12-adjacent: gỡ nút thắt tự tham chiếu Images/MindMap trong FileTypes của
// affine/shared/src/utils/file/filesys.js. Xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md.
//
// FileTypes[i].description vừa là nhãn hiển thị (truyền vào window.showOpenFilePicker()) vừa là
// khoá tra cứu (FileTypes.find(i => i.description === acceptType), hai lượt trong CHÍNH file này).
// Dịch description sang tiếng Việt sẽ làm tra cứu gãy. Sửa bằng cách thêm một mảng định danh SONG
// SONG (FILE_TYPE_IDS, cùng thứ tự với FileTypes) — KHÔNG đụng tới object trong FileTypes, vì các
// object đó được truyền NGUYÊN VẸN vào window.showOpenFilePicker() và dự án này không chấp nhận
// rủi ro chưa đo (bài học #2 của HANDOFF.md). Đổi hai lượt .find(...) sang tra chỉ số bằng
// FILE_TYPE_IDS.indexOf(acceptType).
//
// Chỉ đụng MỘT file cố định, biết trước đường dẫn — không cần quét cây như luat-vi-tri-dich.mjs.
//
// Xuất khẩu hàm THUẦN tachDinhDanhLoaiTep để ca kiểm import trực tiếp (không đọc/ghi đĩa). Khối
// CLI ở cuối file chỉ chạy khi được gọi TRỰC TIẾP bằng `node scripts/tach-dinh-danh-loai-tep.mjs`
// — dùng pathToFileURL so khớp thay vì so chuỗi thô với process.argv[1], vì trên Windows
// process.argv[1] dùng dấu `\` còn import.meta.url luôn là "file:///C:/..." (dấu `/`) nên so thô
// sẽ luôn lệch. Nhờ guard này, Vitest import module để lấy hàm thuần mà không vô tình đọc/ghi đĩa.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const TEN_MANG_ID = 'FILE_TYPE_IDS'

// Danh sách kỳ vọng CỨNG, đo trên .vendor-build/ ngày 2026-08-17 (xem spec §1.1). Thượng nguồn đổi
// gì ở đây — thêm/bớt/đổi thứ tự/đổi chữ — phải làm hàm này throw, không được lặng lẽ đổi theo.
const DANH_SACH_KY_VONG = [
  'Images',
  'Videos',
  'Audios',
  'Markdown',
  'Html',
  'Zip',
  'Docx',
  'OneNote',
  'MindMap',
]

function tenDinhDanh(node) {
  if (!node) return null
  if (ts.isIdentifier(node)) return node.text
  return null
}

function tenThuocTinh(node) {
  if (!node) return null
  if (ts.isIdentifier(node)) return node.text
  if (ts.isStringLiteral(node)) return node.text
  return null
}

// Tìm CHÍNH XÁC MỘT khai báo `const FileTypes = [...]` cấp module (không đệ quy vào thân hàm —
// "cấp module" nghĩa đúng là nằm thẳng trong sf.statements).
function timKhaiBaoFileTypes(sf) {
  const ketQua = []
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    for (const decl of stmt.declarationList.declarations) {
      if (
        tenDinhDanh(decl.name) === 'FileTypes' &&
        decl.initializer &&
        ts.isArrayLiteralExpression(decl.initializer)
      ) {
        ketQua.push({ stmt, mang: decl.initializer })
      }
    }
  }
  if (ketQua.length !== 1) {
    throw new Error(
      'tach-dinh-danh-loai-tep: kỳ vọng ĐÚNG MỘT khai báo "const FileTypes = [...]" cấp module, ' +
        `đo được ${ketQua.length}.`,
    )
  }
  return ketQua[0]
}

// Đọc "description" của từng phần tử — sai hình dạng ở BẤT KỲ phần tử nào thì throw ngay, không
// bỏ qua phần tử lỗi rồi xử tiếp phần còn lại.
function docDanhSachDescription(mang) {
  const ra = []
  mang.elements.forEach((phanTu, i) => {
    if (!ts.isObjectLiteralExpression(phanTu)) {
      throw new Error(
        `tach-dinh-danh-loai-tep: phần tử #${i} của FileTypes không phải object literal.`,
      )
    }
    const cacThuocTinhDescription = phanTu.properties.filter(
      (p) => ts.isPropertyAssignment(p) && tenThuocTinh(p.name) === 'description',
    )
    if (cacThuocTinhDescription.length !== 1) {
      throw new Error(
        `tach-dinh-danh-loai-tep: phần tử #${i} của FileTypes không có ĐÚNG MỘT thuộc tính ` +
          `"description" (đo được ${cacThuocTinhDescription.length}).`,
      )
    }
    const giaTri = cacThuocTinhDescription[0].initializer
    if (!ts.isStringLiteral(giaTri)) {
      throw new Error(
        `tach-dinh-danh-loai-tep: phần tử #${i} của FileTypes có "description" không phải ` +
          'string literal.',
      )
    }
    ra.push(giaTri.text)
  })
  return ra
}

// Tìm CHÍNH XÁC HAI `FileTypes.find(i => i.description === acceptType)` — đúng hình dạng: gọi
// `.find` trên định danh `FileTypes`, một arrow nhận một tham số, thân là so sánh `===` giữa
// `<tham số>.description` và định danh `acceptType`.
function timCacLuotFind(sf) {
  const ra = []
  const di = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      tenDinhDanh(n.expression.expression) === 'FileTypes' &&
      n.expression.name.text === 'find' &&
      n.arguments.length === 1 &&
      ts.isArrowFunction(n.arguments[0])
    ) {
      const arrow = n.arguments[0]
      if (
        arrow.parameters.length === 1 &&
        ts.isIdentifier(arrow.parameters[0].name) &&
        ts.isBinaryExpression(arrow.body) &&
        arrow.body.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      ) {
        const tenThamSo = arrow.parameters[0].name.text
        const { left, right } = arrow.body
        const veTraiLaDescription =
          ts.isPropertyAccessExpression(left) &&
          tenDinhDanh(left.expression) === tenThamSo &&
          left.name.text === 'description'
        const vePhaiLaAcceptType = ts.isIdentifier(right) && right.text === 'acceptType'
        if (veTraiLaDescription && vePhaiLaAcceptType) ra.push(n)
      }
    }
    ts.forEachChild(n, di)
  }
  di(sf)
  return ra
}

// Chặn trùng tên TRƯỚC khi chèn — quét cả ba hình dạng khai báo cấp module (biến/hàm/lớp).
function kiemTrungTen(sf, ten) {
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (tenDinhDanh(decl.name) === ten) {
          const dong = sf.getLineAndCharacterOfPosition(decl.getStart(sf)).line + 1
          throw new Error(
            `tach-dinh-danh-loai-tep: đã có khai báo biến "${ten}" ở dòng ${dong} — không thể ` +
              'chèn hằng số cùng tên.',
          )
        }
      }
    }
    if (
      (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) &&
      stmt.name?.text === ten
    ) {
      const dong = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1
      throw new Error(
        `tach-dinh-danh-loai-tep: đã có khai báo "${ten}" (hàm hoặc lớp) ở dòng ${dong} — không ` +
          'thể chèn hằng số cùng tên.',
      )
    }
  }
}

export function tachDinhDanhLoaiTep(js, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

  if (!Array.isArray(sf.parseDiagnostics)) {
    throw new Error(
      'tach-dinh-danh-loai-tep: sf.parseDiagnostics không còn là mảng — TypeScript đã đổi API nội ' +
        'bộ mà hàm này dựa vào (xem ghi chú tương tự trong luat-vi-tri-dich.mjs).',
    )
  }
  if (sf.parseDiagnostics.length > 0) {
    throw new Error(
      `tach-dinh-danh-loai-tep: không phân tích được ${tenFile} — ` +
        `${sf.parseDiagnostics.length} lỗi cú pháp.`,
    )
  }

  const { stmt: khaiBaoFileTypes, mang } = timKhaiBaoFileTypes(sf)
  const doDuoc = docDanhSachDescription(mang)

  const khopKyVong =
    doDuoc.length === DANH_SACH_KY_VONG.length &&
    doDuoc.every((v, i) => v === DANH_SACH_KY_VONG[i])
  if (!khopKyVong) {
    throw new Error(
      'tach-dinh-danh-loai-tep: danh sách "description" đo được trong FileTypes không khớp kỳ ' +
        `vọng.\n  Đo được:  ${JSON.stringify(doDuoc)}\n  Kỳ vọng:  ${JSON.stringify(DANH_SACH_KY_VONG)}`,
    )
  }

  const cacLuotFind = timCacLuotFind(sf)
  if (cacLuotFind.length !== 2) {
    throw new Error(
      'tach-dinh-danh-loai-tep: kỳ vọng ĐÚNG 2 lượt "FileTypes.find(i => i.description === ' +
        `acceptType)", đo được ${cacLuotFind.length}.`,
    )
  }

  kiemTrungTen(sf, TEN_MANG_ID)

  const danhSachId = doDuoc
  const thay = cacLuotFind.map((n) => ({
    dau: n.getStart(sf),
    cuoi: n.getEnd(),
    moi: `FileTypes[${TEN_MANG_ID}.indexOf(acceptType)]`,
  }))
  thay.push({
    dau: khaiBaoFileTypes.getEnd(),
    cuoi: khaiBaoFileTypes.getEnd(),
    moi: `\nconst ${TEN_MANG_ID} = ${JSON.stringify(danhSachId)};`,
  })

  let ra = js
  for (const t of [...thay].sort((a, b) => b.dau - a.dau)) {
    ra = ra.slice(0, t.dau) + t.moi + ra.slice(t.cuoi)
  }

  return { js: ra, danhSachId }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────────────────────
const dieuHanhTrucTiep = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (dieuHanhTrucTiep) {
  const GOC = path.resolve(import.meta.dirname, '..')
  const DICH = path.join(GOC, '.vendor-build/affine/shared/src/utils/file/filesys.js')
  const relDich = path.relative(GOC, DICH).split(path.sep).join('/')

  const goc = readFileSync(DICH, 'utf8')
  let ketQua
  try {
    ketQua = tachDinhDanhLoaiTep(goc, relDich)
  } catch (err) {
    console.error(`tach-dinh-danh-loai-tep: DỪNG — ${err.message}`)
    process.exit(1)
  }
  writeFileSync(DICH, ketQua.js)
  console.log(
    `tach-dinh-danh-loai-tep: đã tách ${ketQua.danhSachId.length} định danh khỏi description ` +
      `hiển thị trong ${relDich}.`,
  )
  process.exit(0)
}
```

- [ ] **Step 4: Viết khai kiểu `scripts/tach-dinh-danh-loai-tep.d.mts`**

```ts
// Khai kiểu cho scripts/tach-dinh-danh-loai-tep.mjs, để ca kiểm .ts import được mà `tsc --noEmit`
// vẫn xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
export declare function tachDinhDanhLoaiTep(
  js: string,
  tenFile?: string,
): { js: string; danhSachId: string[] }
```

- [ ] **Step 5: Chạy lại ca kiểm, xác nhận CẢ 11 CA XANH**

Run: `npx vitest run src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts`
Expected: `11 passed`. Nếu có ca đỏ, đọc thông báo lỗi, sửa `tach-dinh-danh-loai-tep.mjs` (KHÔNG sửa
ca kiểm để cho qua), chạy lại tới khi cả 11 xanh.

- [ ] **Step 6: Chạy `tsc --noEmit` để xác nhận `.d.mts` khớp cách dùng trong ca kiểm**

Run: `npx tsc --noEmit`
Expected: exit 0, không lỗi liên quan tới `tach-dinh-danh-loai-tep`.

- [ ] **Step 7: Commit**

```bash
git add scripts/tach-dinh-danh-loai-tep.mjs scripts/tach-dinh-danh-loai-tep.d.mts src/__tests__/vendor-tach-dinh-danh-loai-tep.spec.ts
git commit -m "$(cat <<'EOF'
Thêm tachDinhDanhLoaiTep: gỡ nút thắt Images/MindMap trong FileTypes

Hàm thuần, 11 ca kiểm fail-closed (số lượng/thứ tự/nội dung FileTypes,
số lượt so sánh .description, trùng tên FILE_TYPE_IDS). Chưa nối vào
pipeline dung:vendor — việc đó ở task sau.
EOF
)"
```

---

## Task 2: Nối vào pipeline `dung:vendor` + cập nhật Cổng 4 của D12

**Files:**
- Modify: `scripts/dung-vendor.mjs`
- Modify: `scripts/kiem-quan-he-dich.mjs`
- Modify: `src/__tests__/vendor-quan-he-dich.spec.ts`

**Interfaces:**
- Consumes: `tachDinhDanhLoaiTep` từ Task 1 (qua khối CLI của `scripts/tach-dinh-danh-loai-tep.mjs`,
  gọi bằng `node scripts/tach-dinh-danh-loai-tep.mjs`).
- Produces: `.vendor-build/affine/shared/src/utils/file/filesys.js` đã qua bước tách định danh
  TRƯỚC khi bước dịch chuỗi D12 chạy trên nó — Task 3 phụ thuộc trạng thái này.

- [ ] **Step 1: Thêm Bước 4a vào `scripts/dung-vendor.mjs`, đổi tên comment Bước 4b → 4c**

Tìm khối này trong `scripts/dung-vendor.mjs` (ngay sau Bước 4 — đổi tên):

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

Thay bằng:

```js
// Bước 4a — tách định danh tra cứu khỏi description hiển thị trong FileTypes (gỡ nút thắt
// Images/MindMap). Phải chạy TRƯỚC bước dịch chuỗi: Cổng 4 của D12 (bên trong bước đó) đo trên
// cây tại đúng thời điểm nó chạy, và phải thấy filesys.js đã qua bước tách này để không còn đọc
// lại "description" ở hai chỗ đã ghim cũ trong BAN_KHAI_TIEU_THU. Xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md. Exit code ở đây có ý nghĩa
// thật: script này không có lý do sẵn có nào để thoát khác 0, nên thất bại là phải dừng.
const ketQuaTachDinhDanh = chay(
  'node',
  ['scripts/tach-dinh-danh-loai-tep.mjs'],
  'tach-dinh-danh-loai-tep',
)
if (ketQuaTachDinhDanh.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước tách định danh loại tệp thất bại (exit code ${ketQuaTachDinhDanh.status}).`,
  )
  process.exit(ketQuaTachDinhDanh.status ?? 1)
}

// Bước 4c — dịch chuỗi hiển thị (D12). Phải chạy SAU đổi tên VÀ SAU tách định danh: bản dịch phải
// đáp lên cây đã đổi tên và đã tách định danh, không ngược lại. Tách khỏi bước đổi tên vì đây là
// phép thay có điều kiện theo ngữ cảnh — xem đầu scripts/dich-chuoi-vendor.mjs. Exit code ở đây
// có ý nghĩa thật: script này không có lý do sẵn có nào để thoát khác 0, nên thất bại là phải
// dừng, không được nuốt.
const ketQuaDich = chay('node', ['scripts/dich-chuoi-vendor.mjs'], 'dichchuoi:vendor')
if (ketQuaDich.status !== 0) {
  console.error(
    `\ndung:vendor: DỪNG — bước dịch chuỗi thất bại (exit code ${ketQuaDich.status}).`,
  )
  process.exit(ketQuaDich.status ?? 1)
}
```

- [ ] **Step 2: Chạy `npm run dung:vendor` đầy đủ, kỳ vọng ĐỎ ở Cổng 4 (bằng chứng — bản khai CŨ chưa cập nhật)**

Run: `npm run dung:vendor`
Expected: dừng tại bước `dichchuoi:vendor` (Bước 4c) với thông báo Cổng 4 của
`scripts/kiem-quan-he-dich.mjs` — `dich-chuoi-vendor: DỪNG — tập điểm tiêu thụ giá trị hiển thị đo
được trên cây THẬT SỰ khác bản khai được ghim...`, liệt kê "ĐO ĐƯỢC" chỉ còn 2 mục (thiếu hai dòng
`filesys.js`) so với "BẢN KHAI" còn 4 mục cũ. **Chép nguyên văn output đầy đủ vào báo cáo task** —
đây là bằng chứng đỏ chứng minh Bước 4a đã thực sự đổi được `.find(i => i.description ===
acceptType)` sang `FileTypes[FILE_TYPE_IDS.indexOf(acceptType)]` (tra chỉ số qua mảng định danh
song song `FILE_TYPE_IDS`, không phải thêm trường `id` vào object `FileTypes`), không phải suy
luận.

Nếu thay vào đó Bước 4a (`tach-dinh-danh-loai-tep`) tự đỏ: đọc thông báo lỗi, so với cấu trúc thật
của `.vendor-build/affine/shared/src/utils/file/filesys.js` (chạy
`npx tsc -p tsconfig.vendor.json` rồi `node scripts/doi-ten-vendor.mjs` tay để có cây đúng trạng
thái Bước 4a cần, nếu muốn xem trực tiếp) — KHÔNG nới lỏng logic trong `tachDinhDanhLoaiTep` chỉ để
qua bước này; quay lại Task 1 nếu logic thật sự sai.

- [ ] **Step 3: Cập nhật `BAN_KHAI_TIEU_THU` trong `scripts/kiem-quan-he-dich.mjs`**

Tìm khối:

```js
// Bản khai được ghim — đúng khuôn bang-bam-vendor.json của D11: khai thứ đã soi, để cổng gào khi
// thực tế lệch. Đo 2026-08-15, xem chi tiết ở docs/superpowers/plans/2026-08-15-noi-dung-dich.md
// Task 3.
export const BAN_KHAI_TIEU_THU = [
  { file: 'affine/components/src/toolbar/utils.js', dong: 50, dang: 'so-sánh', thuocTinh: 'label' },
  {
    file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
    dong: 114,
    dang: 'so-sánh',
    thuocTinh: 'label',
  },
  {
    file: 'affine/shared/src/utils/file/filesys.js',
    dong: 175,
    dang: 'so-sánh',
    thuocTinh: 'description',
  },
  {
    file: 'affine/shared/src/utils/file/filesys.js',
    dong: 205,
    dang: 'so-sánh',
    thuocTinh: 'description',
  },
]
```

Thay bằng:

```js
// Bản khai được ghim — đúng khuôn bang-bam-vendor.json của D11: khai thứ đã soi, để cổng gào khi
// thực tế lệch. Đo 2026-08-15, xem chi tiết ở docs/superpowers/plans/2026-08-15-noi-dung-dich.md
// Task 3.
//
// Hai mục filesys.js:175/205 (description trong FileTypes.find, gỡ nút thắt Images/MindMap) đã
// RỤNG khỏi bản khai này kể từ 2026-08-17: sau khi scripts/tach-dinh-danh-loai-tep.mjs đổi hai chỗ
// so sánh đó sang FILE_TYPE_IDS.indexOf(acceptType), chúng không còn đọc lại "description" nữa nên
// không còn là điểm tiêu thụ giá trị hiển thị — đây là hệ quả ĐÚNG mong muốn của việc gỡ nút thắt,
// không phải một điểm tiêu thụ bị bỏ sót. Xem
// docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md.
export const BAN_KHAI_TIEU_THU = [
  { file: 'affine/components/src/toolbar/utils.js', dong: 50, dang: 'so-sánh', thuocTinh: 'label' },
  {
    file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
    dong: 114,
    dang: 'so-sánh',
    thuocTinh: 'label',
  },
]
```

- [ ] **Step 4: Cập nhật `src/__tests__/vendor-quan-he-dich.spec.ts` khớp bản khai mới**

Tìm khối:

```ts
describe('BAN_KHAI_TIEU_THU — bản khai được ghim, đúng khuôn bang-bam-vendor.json của D11', () => {
  it('có đúng 4 mục, đúng toạ độ đã đo 2026-08-15', () => {
    expect(BAN_KHAI_TIEU_THU).toEqual([
      {
        file: 'affine/components/src/toolbar/utils.js',
        dong: 50,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
        dong: 114,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 175,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 205,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
    ])
  })
})
```

Thay bằng:

```ts
describe('BAN_KHAI_TIEU_THU — bản khai được ghim, đúng khuôn bang-bam-vendor.json của D11', () => {
  it('có đúng 2 mục — hai mục filesys.js đã rụng sau khi gỡ nút thắt Images/MindMap (2026-08-17)', () => {
    expect(BAN_KHAI_TIEU_THU).toEqual([
      {
        file: 'affine/components/src/toolbar/utils.js',
        dong: 50,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
        dong: 114,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
    ])
  })
})
```

- [ ] **Step 5: Chạy lại `npm run dung:vendor` đầy đủ, kỳ vọng XANH**

Run: `npm run dung:vendor`
Expected: chạy hết bảy bước, in `dung:vendor: xong — đã biên dịch, đổi tên và sinh bản đồ paths
theo đúng thứ tự.`, exit 0.

- [ ] **Step 6: Xác nhận bằng chứng cụ thể ở `.vendor-build/` (grep, khớp spec §6.2)**

Run:
```bash
grep -n "FILE_TYPE_IDS" .vendor-build/affine/shared/src/utils/file/filesys.js
grep -c "i.description === acceptType" .vendor-build/affine/shared/src/utils/file/filesys.js
grep -c "FileTypes\[FILE_TYPE_IDS.indexOf(acceptType)\]" .vendor-build/affine/shared/src/utils/file/filesys.js
```
Expected: dòng đầu in ra đúng một khai báo `const FILE_TYPE_IDS = [...]`; dòng thứ hai in `0`; dòng
thứ ba in `2`.

- [ ] **Step 7: Chạy `npm test` đầy đủ**

Run: `npm test`
Expected: mọi file test xanh, bao gồm `vendor-tach-dinh-danh-loai-tep.spec.ts` (11 ca) và
`vendor-quan-he-dich.spec.ts` (đã cập nhật bản khai 2 mục, kể cả ca tích hợp cuối file đó — nó đọc
lại `.vendor-build/` thật vừa dựng ở Step 5).

- [ ] **Step 8: Commit**

```bash
git add scripts/dung-vendor.mjs scripts/kiem-quan-he-dich.mjs src/__tests__/vendor-quan-he-dich.spec.ts
git commit -m "$(cat <<'EOF'
Nối tach-dinh-danh-loai-tep vào pipeline dung:vendor, cập nhật Cổng 4

Bước 4a chạy trước bước dịch chuỗi D12. BAN_KHAI_TIEU_THU rụng hai mục
filesys.js:175/205 — hai chỗ đó không còn đọc "description" làm dữ liệu
sau khi đổi sang FILE_TYPE_IDS.indexOf(acceptType). Bằng chứng đỏ/xanh
đầy đủ ở báo cáo task.
EOF
)"
```

---

## Task 3: Nội dung dịch — đo khả năng tới `dist/`, thêm khoá vào `vi.json`

**Files:**
- Modify: `src/board/vi.json`

**Interfaces:**
- Consumes: pipeline `dung:vendor` đã có Bước 4a (Task 2) — bắt buộc chạy lại `dung:vendor` sau khi
  sửa `vi.json` vì `.vendor-build/` không tự cập nhật.
- Produces: `vi.json` với `"MindMap"` (luôn thêm) và `"Images"` (thêm CÓ ĐIỀU KIỆN, tuỳ kết quả đo
  ở Step 2).

- [ ] **Step 1: Thêm CẢ HAI khoá tạm thời vào `src/board/vi.json` để đo**

Tìm hai dòng cuối file:

```json
  "Videos": "Video",
  "Audios": "Âm thanh"
}
```

Thay bằng:

```json
  "Videos": "Video",
  "Audios": "Âm thanh",
  "MindMap": "Bản đồ tư duy",
  "Images": "Hình ảnh"
}
```

> **ĐÍNH CHÍNH (2026-08-18, phát hiện lúc thi hành).** Bản gốc của task này ghi
> `"MindMap": "Sơ đồ tư duy"` để khớp bản dịch đã có sẵn của `"Mind Map"` — **SAI**: đụng thẳng cổng
> cấm trùng bản dịch của `scripts/kiem-dist.mjs` (hàm `timTrungBanDich`, chặng P1-D) — hai khoá khác
> nhau dịch ra cùng một chuỗi làm luật C đếm sai mẫu số, cổng DỪNG ngay, không in được dòng
> `X/Y có mặt` nào cả. Đã đổi sang `"Bản đồ tư duy"` (đồng nghĩa, chuỗi khác). Xem spec §5, mục
> đính chính. Nếu bạn đang đọc plan này để thi hành, dùng JSON ở trên (đã sửa), KHÔNG dùng
> `"Sơ đồ tư duy"`.

- [ ] **Step 2: Dựng lại cây, build, đo `kiem:dist`**

Run: `npm run dung:vendor && npm run build`

`postbuild` tự chạy `kiem-dist.mjs` (xem `package.json`). Đọc output cuối, tìm dòng
`bản dịch vi.json — X/Y có mặt`.

`kiem-dist.mjs` gộp `vi.json` (129 khoá TRƯỚC chặng này) VÀ `vi-tien-to.json` (1 khoá) thành một tập
`BAN_DICH` chung (xem `scripts/kiem-dist.mjs:67-71`) — con số `Y` trong thông báo là **130 hiện tại
+ 2 khoá mới = 132**, không phải 129 + 2. Đo lại thật trước khi so, đừng suy từ 129.

- **Nếu Y = 132 và X = 132** (cả hai khoá mới đều tới `dist/`, không khoá nào thiếu): giữ nguyên
  `vi.json` như Step 1, sang Step 4.
- **Nếu Y = 132 và X = 131** (đúng một khoá thiếu — kiểm tên khoá thiếu trong output để biết là
  `"Images"` hay khoá khác): đọc phần chẩn đoán trong output — kỳ vọng nêu tên gói (nhiều khả năng
  `affine/blocks/image` hoặc tương tự nếu đúng là `"Images"`) và đường dẫn file trong
  `.vendor-build/` nơi `"Hình ảnh"` được tìm thấy nhưng không tới `dist/`. Nếu khoá thiếu ĐÚNG LÀ
  `"Images"`, sang Step 3. Nếu là khoá khác (bất ngờ, không phải `"MindMap"`/`"Images"`) — DỪNG, đây
  là hồi quy ở một khoá đã ship trước đó, không thuộc phạm vi chặng này, cần điều tra riêng.
- **Kết quả khác** (ví dụ cả hai đều thiếu, hoặc thông báo không đúng dạng trên): DỪNG, đọc kỹ
  output đầy đủ, đối chiếu với spec §5 và §1.1 trước khi quyết định — không đoán, không tự sửa
  `vi.json` cho tới khi hiểu rõ nguyên nhân.

Chép nguyên văn output của lượt đo này vào báo cáo task, bất kể kết quả nào.

- [ ] **Step 3 (CHỈ chạy nếu `"Images"` thiếu ở Step 2): Gỡ khoá `"Images"`, ghi lại lý do loại trừ**

Sửa `src/board/vi.json`, bỏ dòng `"Images": "Hình ảnh"`:

```json
  "Videos": "Video",
  "Audios": "Âm thanh",
  "MindMap": "Bản đồ tư duy"
}
```

Chạy lại `npm run dung:vendor && npm run build` để xác nhận `kiem:dist` báo `X/Y có mặt` với X = Y
(mọi khoá còn lại đều tới `dist/`).

Thêm một mục vào bảng "Sáu khoá bị loại ở Đợt 2" — style — của `HANDOFF.md` (thực hiện ở Task 5,
mục cập nhật `HANDOFF.md`) ghi rõ: `"Images"` bị loại vì tên gói đo được ở Step 2, theo đúng quyết
định 1 của P1-C (gói chưa bật → từ chối, không danh sách miễn).

- [ ] **Step 4: Chạy `npm test` đầy đủ, xác nhận không hồi quy**

Run: `npm test`
Expected: mọi file xanh (không ca kiểm nào của chặng này đọc `vi.json` bằng số lượng khoá cứng, nên
không cần sửa test nào ở bước này — xác nhận điều đó đúng bằng cách đọc kỹ output, không giả định).

- [ ] **Step 5: Commit**

```bash
git add src/board/vi.json
git commit -m "$(cat <<'EOF'
vi.json: thêm nội dung dịch MindMap/Images sau khi gỡ nút thắt

"MindMap" -> "Bản đồ tư duy" (không dùng "Sơ đồ tư duy" — trùng bản
dịch có sẵn của "Mind Map", phạm cổng cấm trùng của kiem-dist.mjs).
"Images" -> "Hình ảnh" nếu kiem:dist xác nhận tới dist/, ngược lại bị
loại — xem báo cáo task cho kết quả đo thật.
EOF
)"
```

(Nếu Step 3 đã chạy, `git add` chỉ có đúng nội dung sau khi gỡ `"Images"` — không commit trạng thái
trung gian có cả hai khoá nếu một trong hai bị loại.)

---

## Task 4: Kiểm tay trên trình duyệt thật

**Files:** không sửa file nào — task xác nhận, không phải task viết mã.

**Interfaces:**
- Consumes: build đã dịch từ Task 3, chạy qua `PORT=8444 npm run dev` (dùng cổng khác 5173/8443 nếu
  máy có sẵn dev server khác — bài học mục 5 của `HANDOFF.md`).

- [ ] **Step 1: Mở dev server, xác nhận board tải được**

Dùng công cụ trình duyệt (Browser pane) mở `http://localhost:8444` (hoặc cổng đã chọn), bấm tab
"Mindmap", chờ tải xong (chunk ~994 kB gzip, có thể mất 20-30 giây lần đầu).

- [ ] **Step 2: Thử nhập sơ đồ tư duy từ file**

Trên thanh công cụ mindmap, tìm công cụ nhập từ file (`.mm`/`.opml`) — nếu công cụ này lộ ra trên
UI đã bật (dò bằng cách bấm thử công cụ mindmap trên thanh công cụ nổi của một node mindmap, hoặc
qua menu chèn). Bấm, xác nhận:
- **Không có lỗi ném ra** (đọc console trình duyệt bằng công cụ đọc console — không có
  `BlockSuiteError`/`Unexpected acceptType` nào xuất hiện).
- Hộp thoại mở tệp của hệ điều hành/trình duyệt xuất hiện.
- Nếu trình duyệt hỗ trợ File System Access API (Chrome desktop): ô lọc kiểu tệp trong hộp thoại
  hiện đúng chữ **"Bản đồ tư duy"**, không còn "MindMap" tiếng Anh.

Nếu công cụ nhập mindmap từ file KHÔNG lộ ra trên UI hiện tại (tính năng chưa nối đủ trên thanh công
cụ), ghi rõ điều đó thay vì bỏ qua im lặng — đối chiếu với mục "Chưa nghiệm thu" (mục 7) của
`HANDOFF.md` xem đây có phải giới hạn đã biết không.

- [ ] **Step 3: Thử chèn ảnh (nếu công cụ có trên UI)**

Nếu có nút chèn ảnh từ máy cục bộ trên toolbar (không phải kéo-thả), bấm thử, xác nhận không lỗi.
Nếu `"Images"` đã bị loại ở Task 3 Step 3 (không tới `dist/`), bỏ qua bước này và ghi rõ lý do
(khớp với kết quả đo Task 3).

- [ ] **Step 4: Ghi kết quả vào báo cáo task**

Chép lại: đã kiểm được gì, không kiểm được gì (và vì sao), có ảnh chụp màn hình nếu công cụ trình
duyệt hỗ trợ chụp. Không cần commit gì ở task này.

---

## Task 5: Bảy cổng đầy đủ, cập nhật `HANDOFF.md`, commit cuối

**Files:**
- Modify: `docs/superpowers/HANDOFF.md`

**Interfaces:** không có — task tổng hợp, đóng chặng.

- [ ] **Step 1: Chạy đủ bảy cổng theo đúng thứ tự HANDOFF quy định**

Run:
```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```
Expected: exit 0 ở mọi lệnh. Chép số liệu thật (số ca test, số file `kiem:vendor` lệch, số khoá
`vi.json` có mặt) — đừng chép số liệu cũ từ spec/plan, đo lại.

Nếu bất kỳ cổng nào đỏ: quay lại task tương ứng, sửa, KHÔNG bỏ qua bằng cách nới lỏng cổng.

- [ ] **Step 2: Thêm một mục mới vào `docs/superpowers/HANDOFF.md`**

Thêm một mục mới (đánh số tiếp theo mục 15 hiện có, tức **mục 16**) ngay trước dòng kết thúc file,
theo đúng khuôn các mục P1 trước đó — nội dung tối thiểu:

```markdown
## 16. GỠ NÚT THẮT IMAGES/MINDMAP — ĐÃ XONG VÀ ĐÃ GỘP

Track MindmapScreen, không thuộc chặng P1 (vendor/dịch nội dung) nào có số hiệu riêng — xem
docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md.

### Chặng này làm gì

`FileTypes.description` trong `affine/shared/src/utils/file/filesys.js` vừa là nhãn hiển thị vừa
là khoá tra cứu (`FileTypes.find(i => i.description === acceptType)`, hai lượt). Dịch
`"Images"`/`"MindMap"` sang tiếng Việt trước đây sẽ làm `openFilesWith`/`importMindmap` ném lỗi khi
người dùng bấm nhập sơ đồ tư duy hoặc chèn ảnh. Đã thêm bước mới ("Bước 4a" của `dung:vendor`,
`scripts/tach-dinh-danh-loai-tep.mjs`) chèn mảng định danh song song `FILE_TYPE_IDS` (không đụng
object `FileTypes` — object đó được truyền nguyên vẹn vào `window.showOpenFilePicker()`), đổi hai
lượt `.find(...)` sang tra chỉ số. Cổng 4 của D12 (`BAN_KHAI_TIEU_THU`) rụng hai mục
`filesys.js:175/205` — hệ quả đúng mong muốn.

### Đã xong

| Task | Nội dung | Commit |
|---|---|---|
| 1 | `tachDinhDanhLoaiTep` — hàm thuần, 11 ca kiểm | <điền SHA thật> |
| 2 | Nối vào pipeline, cập nhật Cổng 4 | <điền SHA thật> |
| 3 | Nội dung dịch — <điền: cả hai khoá, hay chỉ MindMap> | <điền SHA thật> |

`npm test` <điền số ca thật>/<điền số ca thật> (<điền số file thật> file), trước chặng 148/148.
`kiem:dist` báo `bản dịch vi.json — <điền số thật>` khoá có mặt.

### Kiểm tay trên trình duyệt thật

<điền tóm tắt kết quả Task 4: đã kiểm được gì, không kiểm được gì và vì sao>

### Việc làm ngay của phiên sau

\`\`\`bash
git log --oneline -1                    # kỳ vọng <điền SHA thật> hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
\`\`\`

**Chặng kế tiếp** (không đổi so với mục 14 cũ, trừ mục vừa xong): đợt dịch thứ hai cho nhóm gói
chưa bật (chủ yếu `affine/data-view`, cần bật tính năng trước); hoặc Lưu trữ (D4)/BoardGallery.
```

Điền các chỗ `<điền ...>` bằng số liệu/SHA THẬT đo được ở các task trên — không để nguyên placeholder
khi commit.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/HANDOFF.md
git commit -m "$(cat <<'EOF'
HANDOFF: chặng gỡ nút thắt Images/MindMap xong, mục 16

Bảy cổng xanh, số liệu đo thật ghi trong mục mới. Kiểm tay trình duyệt
xem báo cáo Task 4.
EOF
)"
```

- [ ] **Step 4: Báo cáo tổng kết cho chủ dự án**

Tóm tắt ngắn: 3 task nội dung + 1 task kiểm tay + 1 task đóng chặng đã xong, bảy cổng xanh, kết quả
đo `"Images"` (giữ được hay bị loại, kèm lý do), kết quả kiểm tay trình duyệt. Hỏi có cần
`git push` theo quyền tự động đã cấp trong `AGENTS.md` hay chủ dự án muốn tự xem qua trước.
