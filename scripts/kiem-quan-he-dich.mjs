// Cổng 4 và Cổng 5 của D12 — hai cổng hỏi về QUAN HỆ giữa các chuỗi, không phải vị trí của MỘT
// chuỗi (đó là việc của luat-vi-tri-dich.mjs).
//
// CỔNG 4 — dây bẫy quét ngược. Ba bản spec đầu của chặng này quét theo chiều "chuỗi này có ở vị
// trí định danh không" — tức tìm STRING LITERAL. Nhưng mối nối chỉ cần MỘT đầu là literal; đầu
// kia thường là biến sau destructure, phần tử mảng, hay khoá object KHÔNG NHÁY (`Italic: {...}`).
// Bảng tooltip của BlockSuite trộn khoá có nháy với khoá không nháy trong CÙNG một object, nên
// bất kỳ danh sách nào dựng từ phép quét literal cũng thủng một nửa mà trông vẫn đầy đủ.
//
// Câu hỏi ĐÚNG: "ở đâu một giá trị hiển thị bị TIÊU THỤ làm dữ liệu" — quét từ phía ĐỌC, không
// phải từ phía chuỗi. Đo trên .vendor-build/ 2026-08-15, giới hạn 5 tên còn trong danh sách hiển
// thị sau Task 1 của chặng này (tooltip/label/description/caption/placeholder — 4 tên còn lại,
// name/group/title/text, đã bị loại khỏi danh sách hiển thị nên KHÔNG cần dây bẫy: chúng vĩnh
// viễn không được dịch): đúng 4 chỗ, xem BAN_KHAI_TIEU_THU.
//
// Không phải cổng CHẶN KHOÁ — nó không biết gì về vi.json. Nó là dây bẫy CƠ CHẾ: nếu bốn toạ độ
// này đổi (thượng nguồn thêm một chỗ mới, hay bốn chỗ cũ biến mất), cổng đỏ và người sửa phải tự
// đánh giá — không có phán quyết "an toàn/nguy hiểm" được mã hoá cứng ở đây.
//
// CỔNG 5 — tính nhất quán tiền tố. Lớp lỗi khác hẳn: PHẪU THUẬT CHUỖI trên một literal ĐÃ dịch.
// affine/gfx/note/src/toolbar/note-menu-config.js:118 dựng tooltip bằng
// `item.tooltip.replace('Drag/Click to insert ', '')` — cắt tiền tố khỏi chính literal mà D12 sẽ
// dịch. Nếu tiền tố tiếng Anh không được dịch ĐỒNG BỘ với các chuỗi nó cắt, `.replace()` hết khớp
// sau khi bản dịch kia đã đổi, và tooltip hiện nguyên câu dài thay vì phần đã cắt.
import ts from 'typescript'

export const THUOC_TINH_CON_GIU = new Set(['tooltip', 'label', 'description', 'caption', 'placeholder'])

function mangGiaTriHienThi(node) {
  if (!node) return null
  if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
    return THUOC_TINH_CON_GIU.has(node.name.text) ? node.name.text : null
  }
  if (node.kind === ts.SyntaxKind.Identifier) {
    return THUOC_TINH_CON_GIU.has(node.text) ? node.text : null
  }
  return null
}

export function diemTieuThuTrongFile(js, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
  const ra = []
  const ghi = (node, dang, thuocTinh) => {
    const dau = node.getStart(sf)
    ra.push({
      file: tenFile,
      dong: sf.getLineAndCharacterOfPosition(dau).line + 1,
      dang,
      thuocTinh,
    })
  }
  const di = (n) => {
    if (n.kind === ts.SyntaxKind.ElementAccessExpression) {
      const tt = mangGiaTriHienThi(n.argumentExpression)
      if (tt) ghi(n, 'tra-khoá', tt)
    }
    if (
      n.kind === ts.SyntaxKind.BinaryExpression &&
      ['===', '!==', '==', '!='].includes(n.operatorToken.getText(sf))
    ) {
      const tt = mangGiaTriHienThi(n.left) ?? mangGiaTriHienThi(n.right)
      if (tt) ghi(n, 'so-sánh', tt)
    }
    if (
      n.kind === ts.SyntaxKind.CallExpression &&
      n.expression.kind === ts.SyntaxKind.PropertyAccessExpression
    ) {
      const ten = n.expression.name.text
      if (['includes', 'indexOf', 'has', 'lastIndexOf'].includes(ten) && n.arguments.length) {
        const tt = mangGiaTriHienThi(n.arguments[0])
        if (tt) ghi(n, `${ten}()`, tt)
      }
    }
    if (n.kind === ts.SyntaxKind.SwitchStatement) {
      const tt = mangGiaTriHienThi(n.expression)
      if (tt) ghi(n, 'switch', tt)
    }
    ts.forEachChild(n, di)
  }
  di(sf)
  return ra
}

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

// Cổng 5. Với mỗi khoá tiền tố P (từ banDoTienTo) và mỗi khoá K trong banDo bắt đầu bằng P (khác
// chính P), bản dịch của K phải bắt đầu bằng bản dịch của P — nếu không thì .replace(bản dịch
// của P, '') ở phía tiêu thụ sẽ không cắt được gì.
export function kiemTienTo(banDo, banDoTienTo) {
  const viPham = []
  for (const [tienToEn, tienToVi] of Object.entries(banDoTienTo)) {
    if (typeof tienToVi !== 'string') continue
    for (const [khoa, vi] of Object.entries(banDo)) {
      if (typeof vi !== 'string') continue
      if (khoa === tienToEn) continue
      if (khoa.startsWith(tienToEn) && !vi.startsWith(tienToVi)) {
        viPham.push({ khoa, tienTo: tienToEn, banDichKhoa: vi, banDichTienTo: tienToVi })
      }
    }
  }
  return viPham
}
