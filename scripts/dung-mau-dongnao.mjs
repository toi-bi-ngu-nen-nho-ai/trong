// Nạp 5 mẫu BẢNG "Động não" của AFFiNE (Brainstorming) vào nút "Mẫu" edgeless. Khác hai script kia:
// đây KHÔNG phải nhãn dán mà là `type: 'template'` — chèn cả một cụm ghi chú/hình/đường nối lên
// canvas, đi qua `createTemplateJob(std, 'template', …)` của cây vendored.
//
// Nguồn: bản checkout AFFiNE trên máy (`AFFINE_REPO`, mặc định `../AFFiNE`),
// `packages/frontend/templates/edgeless-snapshot/Brainstorming/<Tên>.zip` + `<Tên>.svg` (bìa).
// Trong mỗi .zip: `info.json`, `page:home.snapshot.json`, `assets/` (RỖNG ở cả 5 tệp — đã đếm
// 2026-09-01). Script vẫn kiểm và NÉM nếu gặp tài sản nhị phân: đường đó chưa từng được kiểm và ghi
// mù vào public/static/templates/ sẽ đụng cấu trúc thư mục của dung-mau-sticker.mjs.
//
// ═══ HAI PHÉP RỬA BẮT BUỘC, đừng bỏ bước nào ═══
//
// 1. `affine-` → `drt-`. Snapshot thượng nguồn nhồi tên token màu dạng DỮ LIỆU:
//    `--affine-palette-line-black`, `--affine-palette-shape-yellow`, `--affine-tag-purple`,
//    `--affine-note-shadow-sticker`… Chép nguyên thì (a) `kiem-dist.mjs` luật A báo đỏ vì `affine-`
//    lọt vào `dist/**/*.json`, và (b) mẫu render với custom property KHÔNG PHÂN GIẢI ĐƯỢC — đúng
//    lớp lỗi luật B của cổng đó sinh ra để bắt: console sạch, tên thẻ đúng, hình sai, mắt thường
//    không thấy. Luật khớp `\baffine-` CÓ GẠCH NỐI, y như scripts/doi-ten-vendor.mjs, nên
//    `affine:page` / `affine:surface` (FLAVOUR, dấu hai chấm) không bị chạm — đổi flavour là không
//    đọc được tài liệu do AFFiNE tạo.
//
// 2. Dịch. Mọi `insert` không rỗng phải có trong `scripts/dich-dongnao.json`; gặp chuỗi lạ thì
//    script LIỆT KÊ HẾT RỒI NÉM. Không được im lặng để tiếng Anh lọt lên bề mặt hiển thị — đó là
//    cùng kỷ luật mà `kiem-dist.mjs` luật C áp cho cây vendored.
//
// D13: nội dung mẫu (~204 KB) và bìa (~51 KB) ra `public/`, KHÔNG vào chunk JS. `mau-dongnao.sinh.ts`
// chỉ giữ slug + tên; `src/board/mau-dongnao.ts` fetch khi người dùng mở tab.
//
// Chạy tay: `npm run dung:mau-dongnao`. Kết quả ĐƯỢC COMMIT.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import JSZip from 'jszip'

const GOC = path.resolve(import.meta.dirname, '..')
const REPO = process.env.AFFINE_REPO || path.resolve(GOC, '../AFFiNE')
const THU_MUC_NGUON = path.join(REPO, 'packages/frontend/templates/edgeless-snapshot/Brainstorming')
const THU_MUC_DICH = path.join(GOC, 'public/static/templates/dongnao')
const TEP_SINH = path.join(GOC, 'src/board/mau-dongnao.sinh.ts')
const BANG_DICH = JSON.parse(readFileSync(path.join(import.meta.dirname, 'dich-dongnao.json'), 'utf8'))

// Thứ tự này là thứ tự mẫu trong tab. Tên hiển thị lấy từ `_ten` của bảng dịch.
const MAU = [
  { tep: '5W2H', slug: '5w2h' },
  { tep: 'Concept Map', slug: 'concept-map' },
  { tep: 'Flowchart', slug: 'flowchart' },
  { tep: 'SMART', slug: 'smart' },
  { tep: 'SWOT', slug: 'swot' },
]

if (!existsSync(THU_MUC_NGUON)) {
  throw new Error(
    `Không thấy ${THU_MUC_NGUON}. Trỏ biến môi trường AFFINE_REPO tới bản checkout AFFiNE, ví dụ:\n` +
      `  AFFINE_REPO=C:/Users/<tên>/Downloads/AFFiNE npm run dung:mau-dongnao`,
  )
}

/**
 * Bù `props.childElementIds` cho mọi khối `affine:frame` còn thiếu. Trả về số khối đã bù.
 *
 * VÌ SAO CẦN: `replaceIdMiddleware` chạy `Object.entries(blockJson.props.childElementIds)` cho MỌI
 * khối `affine:frame` (`gfx/template/src/services/template-middlewares.ts`, nhánh cuối
 * `regenerateBlockId`) — và `assertType` ngay phía trên nó là no-op lúc chạy, không chặn gì. Snapshot
 * gốc của AFFiNE KHÔNG có prop này (đã kiểm trong .zip: cả 3 khung của Concept Map lẫn 2 khung của
 * Flowchart đều thiếu), nên mỗi lần thả mẫu ném một `TypeError: Cannot convert undefined or null to
 * object` cho MỖI khung — bắt được trên trình duyệt thật 2026-09-01, đúng số lỗi bằng số khung.
 *
 * Bù bằng object RỖNG chứ không đi suy ra khung chứa phần tử nào: `frame-model.ts:51` mặc định prop
 * này là object rỗng, và mọi chỗ đọc nó đều xử lý được "khung không có con". Tự chế danh sách con
 * là bịa ra dữ liệu thượng nguồn không có.
 */
function buChildElementIds(nut) {
  let so = 0
  const di = (v) => {
    if (Array.isArray(v)) return v.forEach(di)
    if (!v || typeof v !== 'object') return
    if (v.flavour === 'affine:frame') {
      v.props ??= {}
      if (v.props.childElementIds == null) {
        v.props.childElementIds = {}
        so += 1
      }
    }
    Object.values(v).forEach(di)
  }
  di(nut)
  return so
}

/** Duyệt cây snapshot, thay mọi `insert` bằng bản dịch. Gom chuỗi chưa có trong bảng vào `thieu`. */
function dichCay(nut, thieu) {
  if (Array.isArray(nut)) return nut.forEach((v) => dichCay(v, thieu))
  if (!nut || typeof nut !== 'object') return
  for (const [khoa, giaTri] of Object.entries(nut)) {
    if (khoa === 'insert' && typeof giaTri === 'string') {
      if (giaTri.trim() === '') continue
      const ban = BANG_DICH._chuoi[giaTri]
      if (ban === undefined) thieu.add(giaTri)
      else nut[khoa] = ban
      continue
    }
    // Tài sản nhị phân: assets/ rỗng ở cả 5 tệp nên đường "chép blob ra public/" chưa từng được
    // kiểm. Gặp là dừng, đừng đoán.
    if (khoa === 'sourceId' && typeof giaTri === 'string' && giaTri !== '') {
      throw new Error(`Snapshot tham chiếu tài sản nhị phân (sourceId=${giaTri}) — đường này chưa được cài.`)
    }
    dichCay(giaTri, thieu)
  }
}

// ═══ PHÉP RỬA THỨ BA: TỈ LỆ CHỮ / KHỔ MẪU ═══
//
// VÌ SAO CẦN. `toolbar/template-panel.ts:311-316` của cây vendored (D11 — không sửa được) sau mỗi
// lần thả mẫu luôn THU KHUNG NHÌN CHO VỪA TOÀN BỘ mẫu, chỉ chừa 20 px mỗi cạnh. Nên độ đọc được
// của một mẫu KHÔNG phụ thuộc cỡ chữ tuyệt đối, mà chỉ phụ thuộc tỉ số `cỡ chữ ÷ khổ mẫu`. Đo trên
// trình duyệt thật (cửa sổ 1280×800, vùng vẽ 1280×743) ngày 2026-09-02, TRƯỚC bản vá này:
//
//   | mẫu             | khổ mẫu     | zoom sau khi chèn | cỡ chữ hiện trên màn        |
//   | Lưu đồ          | 3067×2545   | 0,276             | nhãn trong hình 5,5 px      |
//   | SMART           | 7279×1553   | 0,170             | thân bài 5,4 px             |
//   | Sơ đồ khái niệm | 8026×2334   | 0,155             | 7,4–9,9 px                  |
//   | SWOT            | 4304×2009   | 0,288             | tiêu đề bốn ô 18,4 px       |
//   | 5W2H            | 3215×1924   | 0,365             | 13–14 px — ĐẠT, không đụng* |
//
// (*) 5W2H không cần chỉnh CỠ CHỮ, nhưng vẫn có mục trong BO_CUC: bảy nhãn cột trái của nó có hộp
// HẸP HƠN bề rộng chữ ở phông dự phòng nên bị bẻ giữa từ. Đó là trục thứ ba, độc lập với tỉ lệ
// chữ/khổ mẫu — xem chú thích của `boCuc5W2H`.
//
// Riêng Lưu đồ còn một LỖI THẬT chứ không chỉ là lựa chọn thẩm mỹ: 14 hình của nó KHÔNG có prop
// `fontSize` trong snapshot thượng nguồn, nên rơi về mặc định `ShapeTextFontSize.MEDIUM = 20`
// (`affine/model/src/elements/shape/shape.ts:110`) trong hộp 304×156 — tỉ lệ chữ/hộp 0,128, trong
// khi hai mẫu CÓ ghi fontSize dùng 0,156 (5W2H) và 0,273 (Sơ đồ khái niệm).
//
// CHỈ CÓ HAI ĐÒN BẨY, và phóng đều cả hình lẫn chữ là vô nghĩa (khung nhìn thu lại đúng bấy nhiêu):
//   (a) NÂNG CỠ CHỮ ở những chỗ hộp còn dư chỗ. Với phần tử `text` phải phóng `xywh` theo ĐÚNG cùng
//       hệ số: bộ vẽ canvas ngắt dòng theo `w` đã lưu và KHÔNG tự tính lại
//       (`gfx/text/src/element-renderer/index.ts:39`; `normalizeTextBound` chỉ chạy lúc soạn thảo).
//       Quên phóng `w` là chữ ngắt dày thêm rồi tràn xuống dưới `h` — không bị cắt, không báo lỗi.
//   (b) THU KHỔ MẪU — dời bảng "Hướng dẫn" từ cạnh trái lên phía trên, thu hẹp cột.
//
// Mọi phép dưới đây KIỂM SỐ LƯỢNG trước khi sửa và NÉM nếu không khớp. Thượng nguồn đổi bố cục mà
// script lặng lẽ bỏ qua thì mẫu ra sai không ai thấy — đúng lớp lỗi mà hai phép rửa trên được viết
// ra để chặn. `src/board/__tests__/mau-dongnao.spec.ts` khoá kết quả ở đầu kia: mọi phần tử có chữ
// phải GHI RÕ fontSize, cỡ chữ nhỏ nhất sau khi chèn phải ≥ 10 px, và khổ từng mẫu là số chốt.
//
// ═══ HAI THỨ ĐÃ ĐIỀU TRA VÀ CỐ Ý KHÔNG VÁ — đừng thử lại từ đầu ═══
//
// 1. CHỮ TRONG GIẤY NHỚ (SMART 9 tờ, SWOT 21 tờ) vẫn ~4,5 px sau khi chèn. Knob thì CÓ:
//    `props.edgeless.scale` của khối `affine:note`. Nhưng `note-edgeless-block.ts:59-61` render với
//    `width = bound.w / scale`, nên chỉ có hai đường và cả hai đều cụt:
//      • nâng `scale` mà giữ `xywh` → chữ to lên đúng bấy nhiêu, nhưng bề rộng DOM chia cho `scale`.
//        Để đạt 13 px cần scale ≈ 2,9, tức tờ giấy 364 chỉ còn 125 px DOM ≈ 8 ký tự một dòng.
//      • nâng cả `scale` lẫn `xywh` → khổ mẫu phình đúng hệ số đó, khung nhìn thu lại đúng hệ số đó,
//        chữ trên màn KHÔNG đổi. Y hệt cái bẫy "phóng đều cả hình lẫn chữ" ở đầu khối này.
//    Bộ mẫu ship giấy nhớ RỖNG nên lúc vừa chèn không có gì để đọc; người dùng gõ vào thì đằng nào
//    cũng đã phóng to. Đổi 36 ký tự/dòng lấy 8 là lỗ.
//
// 2. MỨC ZOOM LÚC THẢ KHÔNG CỐ ĐỊNH. `template-panel.ts:312` tính `padding = 20 / viewport.zoom`
//    rồi đưa cho `setViewportByBound`, mà tham số đó tính bằng PX KHUNG NHÌN (`viewport.ts:712-724`)
//    — nên thả lúc board đang ở zoom 0,1 cho padding 200 px và mẫu rơi vào bé hơn hẳn mức vừa khung.
//    Lỗi thượng nguồn, D11 cấm sửa tại chỗ. Mọi đường vòng ở lớp app đều tệ hơn chính cái lỗi: vá đè
//    `setViewportByBound` là đổi hành vi của MỌI caller (outline/frame panel, edgeless-auto-connect)
//    mà không phân biệt được caller nào, còn ép zoom về 1 lúc mở panel là giật khung nhìn của người
//    dùng khi họ chưa làm gì. Cách dùng đúng: thả xong bấm "Vừa khung hình".

const doXywh = (o) => JSON.parse(o.props ? o.props.xywh : o.xywh)

function datXywh(o, x, y, w, h) {
  const s = `[${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}]`
  if (o.props) o.props.xywh = s
  else o.xywh = s
}

const chuTrongHinh = (el) => (el.text && el.text.delta ? el.text.delta.map((d) => d.insert).join('') : '')

/** Mảng phần tử mặt phẳng (shape/text/connector/group/brush) của snapshot. */
function phanTu(snap) {
  const mp = snap.blocks.children.find((c) => c.flavour === 'affine:surface')
  if (!mp) throw new Error('snapshot không có khối affine:surface')
  return Object.values(mp.props.elements)
}

/** Mảng khối theo flavour, duyệt cả cây con. */
function khoiTheoFlavour(snap, flavour) {
  const ra = []
  const di = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.flavour === flavour) ra.push(n)
    if (Array.isArray(n.children)) n.children.forEach(di)
  }
  di(snap.blocks)
  return ra
}

/**
 * Phóng một phần tử `text` lên `he` lần: cỡ chữ VÀ hộp, neo góc trên-trái. Vì `w` phóng cùng hệ số
 * nên cách ngắt dòng không đổi, số dòng không đổi, và `h × he` vẫn đúng là chiều cao mới.
 *
 * CỘNG BIÊN 2 % + 4 px, đừng bỏ. `w` thượng nguồn chính là bề rộng ĐO ĐƯỢC của chữ ở cỡ cũ, nên
 * `w × he` ra đúng bằng bề rộng cần — và `wrapText` so `width > W` nên chỉ cần sai số làm tròn
 * float là chữ rơi xuống dòng hai. Bắt được trên trình duyệt thật 2026-09-02: "Điểm mạnh" hiện ra
 * "Điểm", "Nguy cơ" ra "Nguy" — phần rơi xuống KHÔNG mất mà bị khối giấy nhớ (DOM, nằm trên canvas)
 * che, nên nhìn y hệt chữ bị cắt và console sạch trơn.
 */
function phongChu(el, he) {
  const [x, y, w, h] = doXywh(el)
  el.fontSize = Math.round(el.fontSize * he * 100) / 100
  datXywh(el, x, y, w * he * 1.02 + 4, h * he)
}

function canDung(dieuKien, thongDiep) {
  if (!dieuKien) throw new Error(`Bố cục thượng nguồn đã đổi — ${thongDiep}`)
}

/**
 * Lưu đồ. Khổ 3067×2545 bị chặn theo CHIỀU CAO (0,276) trong khi bề ngang còn dư tới 0,404, nên
 * thu khổ không được lợi gì — toàn bộ phần bù nằm ở cỡ chữ.
 */
function boCucLuuDo(snap) {
  const pt = phanTu(snap)

  const hinh = pt.filter((e) => e.type === 'shape' && chuTrongHinh(e) !== '')
  canDung(hinh.length === 14, `Lưu đồ phải có 14 hình có chữ, thấy ${hinh.length}`)
  for (const e of hinh) {
    if (e.shapeType === 'diamond') {
      // "Có / hay / Không" là BA dòng trong hình thoi 218×218. Bộ vẽ căn giữa theo hộp bao chứ
      // không theo cạnh xiên, nên bề rộng THẬT dùng được ở dòng đầu và dòng cuối chỉ còn ~122 px —
      // chặn cỡ chữ ở 36 (9,9 px trên màn). Nới hình thoi lên 280 quanh đúng tâm cũ mở chỗ đó lên
      // ~160 px và cho phép cỡ 44. Đường nối neo theo id phần tử nên tự tính lại điểm bám; hình
      // thoi nằm giữa sơ đồ nên khổ mẫu không đổi.
      const [x, y, w, h] = doXywh(e)
      canDung(Math.round(w) === 218 && Math.round(h) === 218, `hình thoi Lưu đồ phải là 218×218, thấy ${w}×${h}`)
      datXywh(e, x - 31, y - 31, 280, 280)
      e.fontSize = 44
    } else {
      // rect 304×156 (lòng 264 sau padding 20) và ellipse 234×234 (lòng 194). Đo bằng đúng font của
      // board: "Hành động" ở cỡ 48 rộng 251 px, "Bắt đầu" rộng 176 px — cỡ lớn nhất còn vừa.
      e.fontSize = 48
    }
  }

  // Sáu nhãn "Có"/"Không" cạnh đường nối — chọn theo bề rộng hộp, không theo chuỗi đã dịch. Bề rộng
  // đặt thẳng 200 vì cùng cái bẫy như tiêu đề ô SWOT: hộp thượng nguồn của "Không" chỉ rộng 33 khi
  // chữ cần 70 ở cỡ 24, nên `wrapText` bẻ THEO TỪNG KÝ TỰ và nhãn đổ dọc thành "K/h/ô/n/g" — nhìn
  // trên bản gốc tưởng là hoạ tiết. Nhân hệ số chỉ phóng to cái lỗi đó lên.
  const nhan = pt.filter((e) => e.type === 'text' && doXywh(e)[2] <= 100)
  canDung(nhan.length === 6, `Lưu đồ phải có 6 nhãn nhánh, thấy ${nhan.length}`)
  for (const e of nhan) {
    const [x, y, , h] = doXywh(e)
    e.fontSize = 40
    datXywh(e, x, y, 200, (h * 40) / 24)
  }

  // Cột trái: nới khung "Hướng dẫn" tới sát x = −460 (phần tử trái nhất của sơ đồ ở x = −416) để
  // khối văn xuôi ngắt dòng thưa hơn; nhờ đó nâng được cỡ 24 → 44 mà vẫn nằm gọn trong khung. Khung
  // cao thêm nên khung "Phím" phải tụt xuống theo — đáy mới 1633 vẫn trên đáy sơ đồ 1961, khổ mẫu
  // không đổi.
  const khung = khoiTheoFlavour(snap, 'affine:frame').sort((a, b) => doXywh(b)[3] - doXywh(a)[3])
  canDung(khung.length === 2, `Lưu đồ phải có 2 khung, thấy ${khung.length}`)
  datXywh(khung[0], -1722, 10, 1262, 1090)
  datXywh(khung[1], -1722, 1160, 811, 333)

  const DOI_PHIM = 268 // 1160 − 892: khoảng khung "Phím" tụt xuống
  const hinhPhim = pt.filter((e) => e.type === 'shape' && doXywh(e)[0] < -900)
  canDung(hinhPhim.length === 2, `khung "Phím" phải có 2 hình mẫu, thấy ${hinhPhim.length}`)
  hinhPhim.forEach((e) => {
    const [x, y, w, h] = doXywh(e)
    datXywh(e, x, y + DOI_PHIM, w, h)
  })

  const chuHuongDan = pt.filter((e) => e.type === 'text' && doXywh(e)[0] < -900)
  canDung(chuHuongDan.length === 2, `khung "Hướng dẫn" phải có 2 khối chữ, thấy ${chuHuongDan.length}`)
  const than = chuHuongDan.find((e) => e.fontSize < 60)
  const tieuDe = chuHuongDan.find((e) => e.fontSize >= 60)
  canDung(than != null && tieuDe != null, 'không tìm đủ tiêu đề + văn xuôi của khung "Hướng dẫn"')
  // DẸT XUỐNG 110 đơn vị dưới đỉnh khung. Chip tên khung (`drt-frame-title`) là DOM cao 23 px CỐ
  // ĐỊNH, vẽ đè vào góc trên-trái BÊN TRONG khung chứ không nằm phía trên nó. Thuợng nguồn đặt tiêu
  // đề chỉ cách đỉnh khung 45 đơn vị — ở zoom 0,25 chỉ còn 11 px nên chip đè thẳng lên chữ (đo DOM
  // 2026-09-02: chip 204..227, chữ "Lưu đồ" ở 212). 110 đơn vị đủ chỗ cho chip ở mọi mức zoom ≥ 0,21.
  const [, , wTieuDe, hTieuDe] = doXywh(tieuDe)
  datXywh(tieuDe, -1675, 120, wTieuDe, hTieuDe)
  than.fontSize = 44
  datXywh(than, -1675, 240, 1170, 800)
}

/**
 * SWOT. Khổ 4304×2009 bị chặn theo BỀ NGANG (0,288); bảng "Hướng dẫn" bên trái đúng là phần thừa
 * đó, nhưng dời nó lên trên đẩy chiều cao lên 2863 → zoom tụt còn 0,246, TỆ HƠN. Nên giữ nguyên bố
 * cục và dồn toàn bộ phần bù vào cỡ chữ — bốn ô ma trận 1377×956 còn rất nhiều chỗ.
 */
function boCucSwot(snap) {
  const chu = phanTu(snap).filter((e) => e.type === 'text')
  canDung(chu.length === 7, `SWOT phải có 7 khối chữ, thấy ${chu.length}`)

  const tieuDeO = chu.filter((e) => e.fontSize === 64 && doXywh(e)[0] > 0)
  canDung(tieuDeO.length === 4, `SWOT phải có 4 tiêu đề ô, thấy ${tieuDeO.length}`)
  // 64 → 110: hộp cao nhất sau khi phóng là 120 px, còn giấy nhớ đầu tiên của mỗi ô nằm ở +137 px
  // dưới đỉnh ô, nên vẫn không chạm.
  //
  // BỀ RỘNG ĐẶT THẲNG, KHÔNG NHÂN HỆ SỐ. `w` thượng nguồn KHÔNG phải bề rộng chữ: đo trên trình
  // duyệt thật 2026-09-02, "Điểm mạnh" ở cỡ 110 OrelegaOne cần 516 px trong khi 245 × 110/64 chỉ ra
  // 433 — tức bốn nhãn này đã ngắt dòng sẵn từ thượng nguồn. Nhân hệ số vì thế giữ nguyên lỗi: chữ
  // rơi xuống dòng hai rồi bị khối giấy nhớ (DOM nằm trên canvas) che, nhìn y như bị cắt cụt
  // ("Điểm mạnh" → "Điểm", "Nguy cơ" → "Nguy"). 1100 dư cho nhãn rộng nhất và vẫn nằm trong ô: nhãn
  // cách mép trái ô 69 px nên mép phải 1169 < 1377. Cả bốn đều căn TRÁI nên nới rộng không xê dịch.
  for (const e of tieuDeO) {
    const [x, y, , h] = doXywh(e)
    canDung(e.textAlign === 'left', `tiêu đề ô SWOT phải căn trái, thấy ${e.textAlign}`)
    e.fontSize = 110
    datXywh(e, x, y, 1100, (h * 110) / 64)
  }

  const tieuDeMau = chu.find((e) => e.fontSize === 64 && doXywh(e)[0] < 0)
  canDung(tieuDeMau != null, 'không tìm được tiêu đề "SWOT" trong bảng hướng dẫn')
  phongChu(tieuDeMau, 84 / 64) // đáy 40 vẫn trên đỉnh khối văn xuôi 49

  const than = chu.find((e) => e.fontSize === 36)
  canDung(than != null, 'không tìm được khối văn xuôi của bảng hướng dẫn SWOT')
  // Chặn ở 38: hộp rộng 912 vừa lọt bảng 1057 (mép phải −391 so với mép bảng −348) và đáy 477 vẫn
  // trên hàng giấy nhớ ở 537. Bảng hướng dẫn không nới rộng được vì bề ngang đang là cạnh chặn zoom.
  phongChu(than, 38 / 36)

  const goiY = chu.find((e) => e.fontSize === 44)
  canDung(goiY != null, 'không tìm được dòng gợi ý "Kéo các phần tử…"')
  phongChu(goiY, 52 / 44)
}

/**
 * 5W2H. Tỉ lệ chữ/khổ mẫu của mẫu này ĐÃ ĐẠT (13–14 px sau khi chèn) nên không đụng tới cỡ chữ.
 * Lượt này chữa một lỗi KHÁC HẲN, người dùng báo 2026-09-03: bảy nhãn cột trái bị BẺ GIỮA TỪ —
 * "Who" → "Wh"/"o", "What" → "Wha"/"t", "where" → "wher"/"e", "How much" → "How"/"much".
 *
 * NGUYÊN NHÂN GỐC — không phải lỗi bố cục, mà là PHÔNG. `w` thượng nguồn chính là bề rộng chữ mà
 * AFFiNE đo được BẰNG PHÔNG THẬT của nó (Kalam, tải từ `cdn.affine.pro`). App này cố ý chỉ tự chứa
 * DUY NHẤT họ Inter (`src/board/phong-chu-bang.ts` — để chạy được ngoại tuyến), nên
 * `getFontString()` của bộ vẽ (`gfx/text/src/element-renderer/utils.ts:105`) sinh ra
 * `"blocksuite:surface:Kalam", sans-serif` và trình duyệt rơi thẳng về phông sans-serif hệ thống —
 * RỘNG HƠN Kalam 11–23 %. `wrapText` so bề rộng thật với `w` đã lưu, thấy tràn, và vì nhãn chỉ có
 * MỘT từ nên chỗ ngắt rơi vào giữa từ. Cùng lớp lỗi với nhãn "K/h/ô/n/g" của Lưu đồ, chỉ khác là ở
 * đây chính THƯỢNG NGUỒN đúng còn ta sai — nên không sửa được bằng cách nhân hệ số.
 *
 * Đo trên trình duyệt thật 2026-09-03 (cả năm mẫu, mọi khối chữ một dòng): chỉ bảy nhãn này tràn,
 * ở mức 0,81–0,90 lần hộp. Mọi phần tử còn lại của cả năm mẫu đều dư chỗ.
 *
 * BẢN VÁ: căn PHẢI rồi kéo hộp về BÊN TRÁI tới một bề rộng cố định, GIỮ NGUYÊN mép phải thượng
 * nguồn. Hai lý do chọn hướng này thay vì nhân `w` lên:
 *   • bảy nhãn thượng nguồn thẳng hàng theo MÉP PHẢI (x + w giống hệt nhau tới 1e-12) chứ không
 *     theo mép trái — nới sang phải là đẩy nhãn vào sát các ô giải thích.
 *   • hộp rộng gấp nhiều lần chữ thì cách ngắt dòng thôi phụ thuộc phông dự phòng của nền tảng —
 *     thứ ta không điều khiển được và khác nhau giữa Windows / Android / iOS.
 *
 * BỀ RỘNG 720 lấy từ số đo thật chứ không phải hệ số: nhãn dài nhất ("How much" cỡ 128) cần
 * 565–677 px trên chín phông sans-serif hệ thống phổ biến (rộng nhất Verdana 677), sáu nhãn một-từ
 * cần ≤ 393 px. 720 phủ cả trường hợp xấu nhất mà vẫn cách mép phải bảng "Hướng dẫn" 21 px — biên
 * đó được `canDung` bên dưới canh, vì ba nhãn trên cùng nằm ngang tầm bảng.
 *
 * Khổ mẫu KHÔNG đổi: mép trái mới (−987) vẫn nằm trong bao của bảng hướng dẫn (−1943).
 */
function boCuc5W2H(snap) {
  const pt = phanTu(snap)
  const nhan = pt.filter((e) => e.type === 'text' && e.fontSize === 128)
  canDung(nhan.length === 7, `5W2H phải có 7 nhãn cột trái cỡ 128, thấy ${nhan.length}`)

  const mepPhai = nhan.map((e) => {
    const [x, , w] = doXywh(e)
    return x + w
  })
  const lech = Math.max(...mepPhai) - Math.min(...mepPhai)
  canDung(lech < 0.01, `7 nhãn 5W2H phải chung một mép phải, lệch ${lech.toFixed(2)}`)
  const MEP_PHAI = mepPhai[0]

  const W = 720
  const bang = pt.find((e) => e.type === 'shape' && chuTrongHinh(e) === '' && doXywh(e)[2] > 900)
  canDung(bang != null, 'không tìm được khối nền bảng "Hướng dẫn" của 5W2H')
  const [xBang, , wBang] = doXywh(bang)
  canDung(
    MEP_PHAI - W > xBang + wBang,
    `hộp nhãn 5W2H rộng ${W} sẽ đè lên bảng "Hướng dẫn" (mép phải bảng ${(xBang + wBang).toFixed(1)})`,
  )

  for (const e of nhan) {
    const [, y, , h] = doXywh(e)
    e.textAlign = 'right'
    datXywh(e, MEP_PHAI - W, y, W, h)
  }
}

/**
 * Sơ đồ khái niệm. Khổ 8026×2334 bị chặn theo BỀ NGANG rất nặng (0,155 so với 0,301 theo chiều cao)
 * — đúng dạng mà THU KHỔ ăn tiền: bảng "Hướng dẫn" 1030 px nằm ở cạnh trái, dời nó LÊN TRÊN hai
 * khung sơ đồ cắt bề ngang còn 6787 (zoom 0,183, +18 %) mà chiều cao mới 3718 vẫn chưa thành cạnh
 * chặn (703/3718 = 0,189). Bảng nằm ngang cũng cho khối văn xuôi ngắt dòng thưa hơn nhiều, nên cỡ
 * chữ nhảy từ 48 lên 96 mà chiều cao còn GIẢM.
 */
function boCucSoDoKhaiNiem(snap) {
  const pt = phanTu(snap)
  const khung = khoiTheoFlavour(snap, 'affine:frame').sort((a, b) => doXywh(a)[2] - doXywh(b)[2])
  canDung(khung.length === 3, `Sơ đồ khái niệm phải có 3 khung, thấy ${khung.length}`)
  const [kHuongDan, kA] = khung
  canDung(Math.round(doXywh(kHuongDan)[2]) === 1031, 'khung hẹp nhất phải là bảng "Hướng dẫn"')

  // Bảng hướng dẫn thành một dải NGANG rộng bằng khung sơ đồ A, đặt phía trên. 110 đơn vị chừa cho
  // chip tên khung (DOM cao 23 px cố định, vẽ đè vào góc trên-trái BÊN TRONG khung).
  const xA = doXywh(kA)[0]
  const wA = doXywh(kA)[2]
  datXywh(kHuongDan, xA, -1340, wA, 1274)

  const chu = pt.filter((e) => e.type === 'text')
  canDung(chu.length === 2, `Sơ đồ khái niệm phải có 2 khối chữ, thấy ${chu.length}`)
  const tieuDe = chu.find((e) => e.fontSize === 64)
  const than = chu.find((e) => e.fontSize === 48)
  canDung(tieuDe != null && than != null, 'không tìm đủ tiêu đề + văn xuôi bảng hướng dẫn')
  tieuDe.fontSize = 128
  datXywh(tieuDe, xA + 73, -1230, 2000, 164) // 2000 dư sức cho nhãn — xem bẫy bề rộng ở phongChu()
  than.fontSize = 96
  datXywh(than, xA + 73, -1026, wA - 146, 900)

  // Hai nút gốc "Khái niệm A/B": hộp 359×234 với BebasNeue cỡ 64 chỉ ra 11,7 px sau khi chèn. Nới
  // hộp để lên được cỡ 96 (còn thừa chỗ: phần tử kế tiếp trong khung cách 1213 px).
  //
  // 700 CHỨ KHÔNG PHẢI 560, và đây không phải chuyện thẩm mỹ. Lượt trước chọn 560 vì lòng hộp phải
  // hơn 496 px — bề rộng ĐO ĐƯỢC lúc đó của "Khái niệm A" ở cỡ 96. Đo lại 2026-09-03 trên trình
  // duyệt thật: 518 px, tức lòng hộp 520 chỉ còn dư 2 px. Con số đó trôi vì BebasNeue KHÔNG được
  // nạp (app chỉ tự chứa họ Inter — xem chú thích của `boCuc5W2H`), nên chữ vẽ bằng phông
  // sans-serif dự phòng của TỪNG NỀN TẢNG: rộng nhất trong chín phông hệ thống phổ biến là Verdana,
  // hơn phông đo được ở đây ~3 %, tức ~535 px — quá 520. Dư 2 px là đúng cái mìn đã nổ ở 5W2H, chỉ
  // chưa tới lượt. 700 (lòng 660) cho biên 1,27 lần và không đụng gì: hai nút không phải phần tử
  // phải nhất nên khổ mẫu 6788×3718 không đổi.
  const nut = pt.filter((e) => e.type === 'shape' && chuTrongHinh(e) !== '')
  canDung(nut.length === 2, `Sơ đồ khái niệm phải có 2 hình có chữ, thấy ${nut.length}`)
  for (const e of nut) {
    const [x, y] = doXywh(e)
    datXywh(e, x, y, 700, 280)
    e.fontSize = 96
  }
}

/**
 * SMART. Khổ 7279×1553 bị chặn theo BỀ NGANG cực nặng (0,170 so với 0,453 theo chiều cao): năm cột
 * rộng 1207 xếp một hàng, trong khi chiều cao chỉ dùng hết 1/3 khả năng. Đây là mẫu DUY NHẤT phải
 * dựng lại bố cục chứ không chỉ chỉnh cỡ chữ — chữ của nó đã lấp gần kín hộp sẵn (khối tiêu đề
 * 1208×271 chứa 202 px nội dung = 75 %), nên nâng cỡ tại chỗ là tràn.
 *
 * Cách làm: bóp bề ngang cột 1207 → 780 (chữ ngắt dòng dày hơn, bù bằng khối tiêu đề cao hơn — chỗ
 * đó đang thừa), dời bảng "Hướng dẫn" từ cạnh trái lên thành dải ngang phía trên, và thu chữ cái
 * khổng lồ 824 → 420 cho vừa cột mới. Khổ còn 4140×2176 → zoom 0,300 (từ 0,170), và cỡ chữ thân bài
 * nâng 32 → 44 nên chữ trên màn đi từ 5,4 px lên 13,2 px. (Khổ cao 2176 ở lượt đó; lượt
 * 2026-09-03 nâng hộp tiêu đề 440 → 560 nên thành 2160×4140 — vẫn bị chặn theo bề ngang, zoom
 * không đổi.)
 */
function boCucSmart(snap) {
  const pt = phanTu(snap)
  const W_COT = 780
  const BUOC = 840
  const X0 = -1680
  // Chiều cao khối tiêu đề lấy theo chỗ chữ THẬT chiếm — và "thật" ở đây phải tính bằng PHÔNG DỰ
  // PHÒNG, không phải phông thượng nguồn. Lượt trước đo Poppins ra 5 dòng = 253 px rồi chốt 440;
  // nhưng Poppins không được nạp (xem `boCuc5W2H`) nên chữ vẽ bằng sans-serif hệ thống, rộng hơn,
  // NGẮT THÀNH NHIỀU DÒNG HƠN. Người dùng báo 2026-09-03: dòng cuối cột "Phù hợp" ("dài.") rơi hẳn
  // xuống khoảng trắng dưới ô màu — đáy chữ ~250 so với đáy hộp 247.
  //
  // Đo lại 2026-09-03 trên sáu phông (thân bài dài nhất, cỡ 44, lòng 676): Poppins-thật 6 dòng,
  // Arial 6, Tahoma 6, Segoe UI 6, Noto Sans 6, Verdana 7 = 376 px. Lấy trường hợp xấu nhất cộng
  // đuôi chữ → thân bài cần 388 px, và nó bắt đầu ở 142 đơn vị dưới đỉnh hộp, nên hộp phải cao
  // 142 + 388 + 30 (lề đáy) = 560.
  //
  // Khổ mẫu cao thêm 120 (2040 → 2160) nhưng ZOOM KHÔNG ĐỔI: SMART bị chặn theo BỀ NGANG
  // (1240/4140 = 0,300 so với 703/2160 = 0,325), nên cỡ chữ trên màn giữ nguyên.
  const CAO_TIEU_DE = 560
  // Chiều cao hộp thân bài: 7 dòng × 54 (dòng cao nhất trong sáu phông) + đuôi chữ.
  const CAO_THAN_BAI = 388
  const Y_PANEL = -193 + CAO_TIEU_DE + 40 // 407
  // Panel phải chứa HAI tờ giấy nhớ 348 px xếp so le mà không chồng nhau: 60 + 348 + 22 + 348 + 42.
  const CAO_PANEL = 820

  const hinh = pt.filter((e) => e.type === 'shape')
  const bangHuongDan = hinh.find((e) => Math.round(doXywh(e)[2]) === 950)
  const dauCot = hinh.filter((e) => Math.round(doXywh(e)[3]) === 271).sort((a, b) => doXywh(a)[0] - doXywh(b)[0])
  const thanCot = hinh.filter((e) => Math.round(doXywh(e)[3]) === 1159).sort((a, b) => doXywh(a)[0] - doXywh(b)[0])
  canDung(bangHuongDan != null, 'không tìm được bảng "Hướng dẫn" 950×733 của SMART')
  canDung(dauCot.length === 5 && thanCot.length === 5, `SMART phải có 5 khối tiêu đề + 5 panel, thấy ${dauCot.length}/${thanCot.length}`)

  const chu = pt.filter((e) => e.type === 'text')
  const chuKhongLo = chu.filter((e) => e.fontSize > 500).sort((a, b) => doXywh(a)[0] - doXywh(b)[0])
  const nhan = chu.filter((e) => e.fontSize === 32 && doXywh(e)[2] < 400).sort((a, b) => doXywh(a)[0] - doXywh(b)[0])
  const thanBai = chu.filter((e) => e.fontSize === 32 && doXywh(e)[2] >= 400).sort((a, b) => doXywh(a)[0] - doXywh(b)[0])
  canDung(
    chuKhongLo.length === 5 && nhan.length === 5 && thanBai.length === 5,
    `SMART phải có 5 chữ cái lớn + 5 nhãn + 5 thân bài, thấy ${chuKhongLo.length}/${nhan.length}/${thanBai.length}`,
  )

  // Giấy nhớ: ghi lại cột cũ của từng tờ TRƯỚC khi dời cột, rồi xếp lại vào cột mới.
  const ghiChu = khoiTheoFlavour(snap, 'affine:note')
  canDung(ghiChu.length === 9, `SMART phải có 9 giấy nhớ, thấy ${ghiChu.length}`)
  const xCotCu = dauCot.map((e) => doXywh(e)[0])
  const theoCot = xCotCu.map(() => [])
  for (const n of ghiChu) {
    const x = doXywh(n)[0]
    let i = 0
    for (let k = 1; k < xCotCu.length; k += 1) if (x >= xCotCu[k]) i = k
    theoCot[i].push(n)
  }

  for (let i = 0; i < 5; i += 1) {
    const X = X0 + i * BUOC
    datXywh(dauCot[i], X, -193, W_COT, CAO_TIEU_DE)
    datXywh(thanCot[i], X, Y_PANEL, W_COT, CAO_PANEL)

    nhan[i].fontSize = 44
    datXywh(nhan[i], X + 52, -133, W_COT - 104, 66)
    thanBai[i].fontSize = 44
    datXywh(thanBai[i], X + 52, -51, W_COT - 104, CAO_THAN_BAI)

    // Chữ cái khổng lồ: đổi sang căn GIỮA và lấy trọn bề ngang cột. Vừa tránh hẳn bẫy ngắt dòng
    // (hộp luôn rộng hơn một ký tự), vừa cho nó nằm đúng tâm panel — bản gốc đặt lệch mỗi cột một
    // kiểu (lệch 232…365 px trong panel 1207).
    chuKhongLo[i].fontSize = 420
    chuKhongLo[i].textAlign = 'center'
    datXywh(chuKhongLo[i], X, Y_PANEL + 158, W_COT, 630)

    // Giấy nhớ xếp SO LE (trên-trái, dưới-phải) chứ không kề nhau: hai tờ 364 px cạnh nhau chiếm
    // trọn cột 780 và bịt kín chữ cái phía sau. Giấy nhớ là khối DOM nằm TRÊN canvas nên luôn che
    // chữ cái — bản gốc cũng vậy, chỉ khác là panel rộng 1207 nên che ít hơn.
    theoCot[i].forEach((n, k) => {
      const [, , w, h] = doXywh(n)
      datXywh(n, X + (k === 0 ? 40 : W_COT - 40 - w), Y_PANEL + 60 + k * 370, w, h)
    })
  }

  // Bảng hướng dẫn thành dải ngang phía trên năm cột.
  const W_BANG = 4 * BUOC + W_COT
  datXywh(bangHuongDan, X0, -933, W_BANG, 620)
  const tieuDeMau = chu.find((e) => e.fontSize === 48)
  const thanMau = chu.find((e) => e.fontSize === 36)
  canDung(tieuDeMau != null && thanMau != null, 'không tìm đủ tiêu đề + văn xuôi bảng hướng dẫn SMART')
  tieuDeMau.fontSize = 96
  datXywh(tieuDeMau, X0 + 60, -873, 2000, 136)
  thanMau.fontSize = 72
  datXywh(thanMau, X0 + 60, -707, W_BANG - 120, 470)
}

const BO_CUC = {
  '5w2h': boCuc5W2H,
  'concept-map': boCucSoDoKhaiNiem,
  flowchart: boCucLuuDo,
  smart: boCucSmart,
  swot: boCucSwot,
}

mkdirSync(THU_MUC_DICH, { recursive: true })

const thieu = new Set()
const daSinh = []

for (const { tep, slug } of MAU) {
  const duongZip = path.join(THU_MUC_NGUON, `${tep}.zip`)
  const duongBia = path.join(THU_MUC_NGUON, `${tep}.svg`)
  if (!existsSync(duongZip)) throw new Error(`Không thấy ${duongZip}`)
  if (!existsSync(duongBia)) throw new Error(`Không thấy bìa ${duongBia}`)

  const zip = await JSZip.loadAsync(readFileSync(duongZip))
  const ten = Object.keys(zip.files).filter((n) => !n.includes('MACOSX'))
  const nhiPhan = ten.filter((n) => n.includes('assets/') && !zip.files[n].dir)
  if (nhiPhan.length > 0) {
    throw new Error(`${tep}.zip có ${nhiPhan.length} tài sản nhị phân (${nhiPhan.join(', ')}) — đường này chưa được cài.`)
  }
  const tenSnapshot = ten.find((n) => n.endsWith('.snapshot.json'))
  if (!tenSnapshot) throw new Error(`${tep}.zip không có tệp *.snapshot.json`)

  const noiDung = JSON.parse(await zip.files[tenSnapshot].async('text'))
  dichCay(noiDung, thieu)
  const soKhungBu = buChildElementIds(noiDung)
  // Phép rửa thứ ba (xem khối chú thích "TỈ LỆ CHỮ / KHỔ MẪU"). Cả năm mẫu đều có mục trong BO_CUC,
  // nhưng 5W2H vào đây vì lý do KHÁC bốn mẫu kia: cỡ chữ của nó đã đạt, chỗ hỏng là hộp chữ hẹp hơn
  // bề rộng chữ ở phông dự phòng (xem chú thích của boCuc5W2H).
  if (BO_CUC[slug]) BO_CUC[slug](noiDung)

  const tenHienThi = BANG_DICH._ten[tep]
  if (tenHienThi === undefined) throw new Error(`Bảng dịch thiếu tên mẫu "${tep}" (mục _ten)`)

  const mau = {
    name: tenHienThi,
    type: 'template',
    preview: `/static/templates/dongnao/${slug}.svg`,
    content: noiDung,
  }

  // Rửa `affine-` SAU khi tuần tự hoá, để phủ cả khoá lẫn giá trị trong một lượt.
  const json = JSON.stringify(mau).replace(/\baffine-/g, 'drt-')
  if (/\baffine-/.test(json)) throw new Error(`${tep}: còn chuỗi "affine-" sau khi rửa`)
  writeFileSync(path.join(THU_MUC_DICH, `${slug}.json`), json)

  // Bìa: nén khoảng trắng như thượng nguồn, và `fill="white"` → `currentColor` để bìa theo được
  // theme sáng/tối của panel thay vì trắng cứng.
  const bia = readFileSync(duongBia, 'utf8')
    .replace(/\n/g, '')
    .replace(/\s+/g, ' ')
    .replaceAll('fill="white"', 'fill="currentColor"')
    .replace(/\baffine-/g, 'drt-')
  writeFileSync(path.join(THU_MUC_DICH, `${slug}.svg`), bia)

  daSinh.push({ slug, ten: tenHienThi })
  console.log(
    `> ${tep} → ${slug}.json (${Math.round(json.length / 1024)} KB) + ${slug}.svg` +
      (soKhungBu > 0 ? `  [bù childElementIds cho ${soKhungBu} khung]` : ''),
  )
}

if (thieu.size > 0) {
  throw new Error(
    `Bảng dịch scripts/dich-dongnao.json thiếu ${thieu.size} chuỗi. Thêm hết rồi chạy lại — ` +
      `để lọt một chuỗi là một mẫu tiếng Anh lên bề mặt hiển thị:\n` +
      [...thieu].map((s) => `  ${JSON.stringify(s)}`).join('\n'),
  )
}

// Dọn tệp thừa (mẫu bị gỡ ở thượng nguồn). Xoá từng tệp, không rmSync cả thư mục — CodeGraph hay
// giữ handle trên thư mục vừa có tệp mới → EPERM.
const giuLai = new Set(daSinh.flatMap((m) => [`${m.slug}.json`, `${m.slug}.svg`]))
for (const tep of readdirSync(THU_MUC_DICH)) {
  if (!giuLai.has(tep)) {
    try {
      rmSync(path.join(THU_MUC_DICH, tep))
    } catch (e) {
      console.warn(`! không xoá được tệp thừa ${tep}: ${e.code ?? e.message}`)
    }
  }
}

const than =
  '// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-dongnao` để tạo lại.\n' +
  '// Nguồn: AFFiNE packages/frontend/templates/edgeless-snapshot/Brainstorming →\n' +
  '// public/static/templates/dongnao/. Chỉ chứa slug + tên; nội dung mẫu (~204 KB) nằm trong\n' +
  '// public/, src/board/mau-dongnao.ts fetch khi người dùng mở tab (không vào chunk JS — D13).\n' +
  '\n' +
  'export type MauDongNao = { readonly slug: string; readonly ten: string }\n' +
  '\n' +
  "export const DANH_MUC_DONG_NAO = 'Động não'\n" +
  '\n' +
  'export const MAU_DONG_NAO: readonly MauDongNao[] = [\n' +
  daSinh.map((m) => `  { slug: ${JSON.stringify(m.slug)}, ten: ${JSON.stringify(m.ten)} },`).join('\n') +
  '\n]\n'

writeFileSync(TEP_SINH, than)

console.log(`> ghi ${path.relative(GOC, TEP_SINH)} (${daSinh.length} mẫu)`)
console.log('xong.')
