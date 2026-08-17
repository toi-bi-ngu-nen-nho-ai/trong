// Luật vị trí của D12 — phần THUẦN, không đọc/ghi đĩa gì cả.
//
// Nguyên tắc: DANH SÁCH CHO PHÉP, HỎNG THÌ ĐÓNG. Đo được 127 loại vị trí cú pháp khác nhau chứa
// chuỗi viết-hoa-đầu trong cây vendored — liệt kê chỗ CẤM là việc không bao giờ xong, nên chỉ
// liệt kê chỗ CHO PHÉP. Vị trí lạ → không đụng. Hỏng theo hướng "chuỗi không được dịch" (nhìn
// thấy được) thay vì "dữ liệu bị dịch" (im lặng).
import ts from 'typescript'

// Giá trị của các thuộc tính này là chuỗi hiển thị. Đo trên cây vendored ban đầu: 822 lượt, gồm
// cả `name`/`group`/`title`/`text`/`menuName`/`displayName`. Chặng P1-E đã BỎ SÁU tên đó khỏi
// danh sách (11 tên → 5 tên), không phải bốn. Spec
// docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md §3.1-§4.1 đo được BỐN mối nối nguy
// hiểm đọc lại giá trị hiển thị làm khoá tra cứu / vế so sánh, và cả bốn đều đọc `.name` — trong
// bảng phân bố 158 chỗ tiêu thụ ngược ở §3.3, `name` chiếm 96 lượt, `group` 38, `title` 12, `text`
// 8 (còn `label`/`description` — vẫn được giữ — đo được 2 lượt mỗi tên lúc đó, canh bằng Cổng 4;
// SAU chặng "Gỡ nút thắt Images/MindMap" (2026-08-18), hai lượt của `description` ở filesys.js đã
// bị xoá — `BAN_KHAI_TIEU_THU` hiện tại (`scripts/kiem-quan-he-dich.mjs`) chỉ còn 2 mục, cả hai đều
// `label`, `description` đo được 0. Đừng tin con số "2 lượt mỗi tên" ở trên cho `description` nữa —
// đo lại `BAN_KHAI_TIEU_THU` trước khi quyết định có nên bỏ `description` khỏi
// `THUOC_TINH_HIEN_THI` hay không):
//   tooltips[name]                          — affine/blocks/note/src/configs/slash-menu.js:51,83
//   ['Code','Link'].includes(i.name)        — affine/blocks/note/src/configs/slash-menu.js:39
//   item.name !== 'Divider'                 — affine/gfx/note/src/toolbar/note-menu-config.js:113
// Bảng tooltip của BlockSuite trộn khoá CÓ NHÁY ('Heading 1': {...}) với khoá KHÔNG NHÁY
// (Italic: {...}, Divider: {...}) trong CÙNG một object — nên không có cách quét literal nào tách
// được "name: an toàn" khỏi "name: nguy hiểm" một cách đáng tin. `title` đi vào file xuất ra
// (Markdown/PDF, adapters/markdown/markdown.js:212). `text` là thành viên enum số
// (Flag[Flag["Text"] = 4] = "Text", affine/shared/src/services/toolbar-service/flags.js:7) — người
// dùng viết Flag.Text (truy cập thuộc tính), phép thay chuỗi không với tới được. `group` là khoá
// sắp xếp có cấu trúc ('0_Basic@0'), bị parseGroup mổ (affine/widgets/slash-menu/src/utils.js:11).
//
// `menuName` và `displayName` đo được 0 lượt tiêu thụ ngược trong cùng bảng phân bố đó — an toàn
// ngang `tooltip`/`caption`/`placeholder` (những tên vẫn được giữ ở dưới). Nhưng spec §4.1 (dòng
// ~140-142) chỉ liệt kê "bảy vị trí đầu cuối" cuối cùng — `tooltip` `label` `description` `caption`
// `placeholder` `data-tip` đối số `toast` — không có `menuName`/`displayName`, và KHÔNG giải thích
// vì sao hai tên này bị loại dù đo an toàn như các tên được giữ. Đây là khoảng trống tài liệu kế
// thừa từ chính spec, không phải quyết định có lý do đã biết — đừng suy diễn lý do khi đọc comment
// này; nếu cần dùng lại hai tên, phải hỏi lại/đo lại trước.
//
// KHÔNG được thêm `key` vào đây: nó chứa "Align left", "Align right" — đọc lên y hệt nhãn hiển
// thị nhưng là ĐỊNH DANH mục menu, dịch vào là gãy tra cứu.
export const THUOC_TINH_HIEN_THI = new Set(['label', 'tooltip', 'description', 'caption', 'placeholder'])

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
    // Rút TÊN thuộc tính đứng ngay trước nhịp rồi so khớp CHÍNH XÁC với danh sách cho phép.
    //
    // KHÔNG nội suy tên vào một regex dạng `${a}\s*=\s*["']$`: nó không neo biên trái nên
    // `my-data-tip="` cũng khớp, tức luật rộng hơn danh sách "đúng một tên" mà kế hoạch tuyên bố.
    //
    // Và biên trái phải là `(?:^|\s)`, KHÔNG chỉ là "bắt đầu bằng chữ cái". Lý do đã trả giá một
    // lượt vá: nếu lớp ký tự mở đầu (`[A-Za-z]`) hẹp hơn lớp nối (`[\w:-]`), bộ quét chỉ việc bỏ
    // qua tiền tố rồi khớp ngay tại chữ `d` — nên `_data-tip=`, `-data-tip=`, `.data-tip=`,
    // `?data-tip=`, `@data-tip=` đều lọt. Ba cái sau là cú pháp binding CÓ THẬT của Lit
    // (property / boolean / event), nên đây không phải lo xa.
    //
    // Chuỗi khớp còn giữ được tính miễn nhiễm metachar: một tên có `.` hay `[` trong danh sách sẽ
    // không bao giờ khớp (chúng nằm ngoài `[\w:-]`), tức im lặng không dịch — vẫn fail-closed.
    const khop = truoc.match(/(?:^|\s)([A-Za-z][\w:-]*)\s*=\s*["']$/)
    if (khop && THUOC_TINH_HTML_HIEN_THI.includes(khop[1])) {
      return `thuộc-tính-html:${khop[1]}`
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
  //
  // `?? []` là FAIL-OPEN và bị cấm ở đây: nếu một bản TypeScript sau này đổi tên hay bỏ hẳn trường
  // nội bộ `parseDiagnostics`, `sf.parseDiagnostics` thành `undefined`, `?? []` biến "mất khả năng
  // kiểm cú pháp" thành "coi như không có lỗi" — cổng này lặng lẽ thành no-op trên cả 2.550 file,
  // và không cổng nào khác ở D12 canh cú pháp thay nó. Phải ném ngay khi trường đó không còn là
  // mảng, để BLOCKED hiện ra ngay thay vì im lặng bỏ qua.
  if (!Array.isArray(sf.parseDiagnostics)) {
    throw new Error(
      'luat-vi-tri-dich: sf.parseDiagnostics không còn là mảng — TypeScript đã đổi API nội bộ mà ' +
        'cổng này dựa vào, không còn cách nào biết cây cú pháp có hỏng hay không. Đây là tin tức ' +
        'cần xử lý (tìm cách kiểm cú pháp khác), không phải phiền toái để bỏ qua bằng `?? []`.',
    )
  }
  const loiCuPhap = sf.parseDiagnostics
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
      // `Object.hasOwn`, KHÔNG phải `banDo[n.text] !== undefined`. `banDo` là object thường (kể cả
      // khi đến từ `JSON.parse`), nên phép tra khoá đi qua chuỗi prototype: `banDo['constructor']`,
      // `['toString']`, `['valueOf']`, `['hasOwnProperty']`, `['__proto__']`… đều khác `undefined`
      // dù `vi.json` không hề có khoá nào như vậy.
      //
      // Hậu quả đo được: `label: 'constructor'` bị thay thành `label: undefined`, vì bản "dịch" là
      // một HÀM và `JSON.stringify` của hàm trả về `undefined` — tức token `undefined` TRẦN được
      // chèn vào mã vendored. JS vẫn hợp lệ nên `parseDiagnostics` không bắt; cổng khoá chết không
      // bắt (khoá đâu có trong `vi.json`); `kiem:dist` không bắt. Bản ghi kiểm toán cũng mất trường
      // `chuoiDich`, nên chính báo cáo dùng để soát cũng câm. Đúng loại hỏng-im-lặng mà cả cơ chế
      // này sinh ra để chặn.
      if (Object.hasOwn(banDo, n.text)) {
        const vi = banDo[n.text]
        // `Object.hasOwn` mới trả lời "khoá có thật không", KHÔNG trả lời "giá trị có phải chuỗi
        // không". `vi.json` đi qua `JSON.parse`, nên một bản đồ gom nhóm (`"toolbar": { … }`), một
        // mảng phương án dịch để tạm, hay một con số gõ nhầm đều là JSON HỢP LỆ — và
        // `JSON.stringify` sẽ chèn thẳng `label: 42`, `label: ["…"]`, `label: {…}` vào mã vendored.
        // Với `undefined` thì tệ nhất: `JSON.stringify(undefined)` trả về `undefined`, chèn ra
        // token TRẦN và bản ghi kiểm toán mất luôn trường `chuoiDich` — chính báo cáo dùng để soát
        // cũng câm. JS vẫn hợp lệ nên không cổng nào phía sau bắt được: `parseDiagnostics` im, cổng
        // khoá chết thấy khoá "đã dịch ở đúng một chỗ" nên xanh, và `kiem:dist` luật C tìm chuỗi
        // bản dịch trong `dist/` thì `["Phong cách"]` vẫn chứa "Phong cách" nên cũng xanh.
        if (typeof vi !== 'string') {
          throw new Error(
            `luat-vi-tri-dich: khoá "${n.text}" trong bản đồ dịch có giá trị KHÔNG PHẢI CHUỖI ` +
              `(kiểu ${vi === null ? 'null' : typeof vi}), gặp ở ${tenFile}. Bản đồ dịch phải ` +
              'phẳng: { "English": "Tiếng Việt" }.',
          )
        }
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

// Thay MỌI lượt xuất hiện của khoá, KHÔNG lọc theo vị trí. Dùng riêng cho src/board/vi-tien-to.json
// — khoá của nó ('Drag/Click to insert ') là ĐỐI SỐ của .replace() trong
// affine/gfx/note/src/toolbar/note-menu-config.js:118, một vị trí CỐ TÌNH không nằm trong danh
// sách hiển thị (đối số hàm thường không phải chữ cho người dùng đọc TRỰC TIẾP). Nhưng chuỗi này
// phải đổi ĐỒNG BỘ với các literal `tooltip: '...'` mà nó cắt tiền tố — nếu không, sau khi các
// literal đó đã dịch, .replace(tiền tố tiếng Anh, '') không còn khớp gì và tooltip hiện nguyên
// câu dài. Xem spec P1-E §3.7/§4.4 và kế hoạch Task 4.
//
// Dùng lại đúng phép bảo vệ của dichMotFile (Object.hasOwn chống chuỗi prototype, kiểm kiểu
// chuỗi, kiểm cú pháp trước khi duyệt) — hai hàm khác MỤC ĐÍCH lọc vị trí nhưng CÙNG rủi ro dữ
// liệu đầu vào, nên cùng một bộ vá.
export function thayTrenToanCay(js, banDoTienTo, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

  if (!Array.isArray(sf.parseDiagnostics)) {
    throw new Error(
      'luat-vi-tri-dich: sf.parseDiagnostics không còn là mảng (thayTrenToanCay) — xem ghi chú ' +
        'tương tự trong dichMotFile.',
    )
  }
  if (sf.parseDiagnostics.length > 0) {
    throw new Error(
      `luat-vi-tri-dich: không phân tích được ${tenFile} (thayTrenToanCay) — ` +
        `${sf.parseDiagnostics.length} lỗi cú pháp.`,
    )
  }

  const thayTienTo = []
  const diTienTo = (n) => {
    if (
      n.kind === ts.SyntaxKind.StringLiteral ||
      n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      if (Object.hasOwn(banDoTienTo, n.text)) {
        const vi = banDoTienTo[n.text]
        if (typeof vi !== 'string') {
          throw new Error(
            `luat-vi-tri-dich: khoá tiền tố "${n.text}" có giá trị KHÔNG PHẢI CHUỖI (kiểu ` +
              `${vi === null ? 'null' : typeof vi}), gặp ở ${tenFile}.`,
          )
        }
        thayTienTo.push({ dau: n.getStart(sf), cuoi: n.getEnd(), chuoiGoc: n.text, chuoiDich: vi })
      }
    }
    ts.forEachChild(n, diTienTo)
  }
  diTienTo(sf)

  let raTienTo = js
  for (const t of [...thayTienTo].sort((a, b) => b.dau - a.dau)) {
    raTienTo = raTienTo.slice(0, t.dau) + JSON.stringify(t.chuoiDich) + raTienTo.slice(t.cuoi)
  }

  return {
    js: raTienTo,
    cacLuot: thayTienTo
      .sort((a, b) => a.dau - b.dau)
      .map(({ chuoiGoc, chuoiDich }) => ({ chuoiGoc, chuoiDich })),
  }
}
