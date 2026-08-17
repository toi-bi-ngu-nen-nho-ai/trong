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
  const sfKiem = ts.createSourceFile(relDich, ketQua.js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
  if (!Array.isArray(sfKiem.parseDiagnostics) || sfKiem.parseDiagnostics.length > 0) {
    console.error('tach-dinh-danh-loai-tep: DỪNG — văn bản sau khi vá không còn phân tích cú pháp được. Không ghi đĩa.')
    process.exit(1)
  }
  const soLuotThayThe = ketQua.js.match(/FileTypes\[FILE_TYPE_IDS\.indexOf\(acceptType\)\]/g)?.length ?? 0
  if (soLuotThayThe !== 2) {
    console.error(
      `tach-dinh-danh-loai-tep: DỪNG — kỳ vọng đúng 2 lượt thay thế trong văn bản đầu ra, đếm được ${soLuotThayThe}. Không ghi đĩa.`,
    )
    process.exit(1)
  }

  writeFileSync(DICH, ketQua.js)
  console.log(
    `tach-dinh-danh-loai-tep: đã tách ${ketQua.danhSachId.length} định danh khỏi description ` +
      `hiển thị trong ${relDich}.`,
  )
  process.exit(0)
}
