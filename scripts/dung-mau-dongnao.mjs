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
//   | 5W2H            | 3215×1924   | 0,365             | 13–14 px — ĐẠT, không đụng  |
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
// ra để chặn.

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
 */
function phongChu(el, he) {
  const [x, y, w, h] = doXywh(el)
  el.fontSize = Math.round(el.fontSize * he * 100) / 100
  datXywh(el, x, y, w * he, h * he)
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

  // Sáu nhãn "Có"/"Không" cạnh đường nối — chọn theo bề rộng hộp, không theo chuỗi đã dịch.
  const nhan = pt.filter((e) => e.type === 'text' && doXywh(e)[2] <= 100)
  canDung(nhan.length === 6, `Lưu đồ phải có 6 nhãn nhánh, thấy ${nhan.length}`)
  nhan.forEach((e) => phongChu(e, 40 / 24))

  // Cột trái: nới khung "Hướng dẫn" tới sát x = −460 (phần tử trái nhất của sơ đồ ở x = −416) để
  // khối văn xuôi ngắt dòng thưa hơn; nhờ đó nâng được cỡ 24 → 44 mà vẫn nằm gọn trong khung. Khung
  // cao thêm nên khung "Phím" phải tụt xuống theo — đáy mới 1633 vẫn trên đáy sơ đồ 1961, khổ mẫu
  // không đổi.
  const khung = khoiTheoFlavour(snap, 'affine:frame').sort((a, b) => doXywh(b)[3] - doXywh(a)[3])
  canDung(khung.length === 2, `Lưu đồ phải có 2 khung, thấy ${khung.length}`)
  datXywh(khung[0], -1722, 10, 1262, 1240)
  datXywh(khung[1], -1722, 1300, 811, 333)

  const DOI_PHIM = 408 // 1300 − 892: khoảng khung "Phím" tụt xuống
  const hinhPhim = pt.filter((e) => e.type === 'shape' && doXywh(e)[0] < -900)
  canDung(hinhPhim.length === 2, `khung "Phím" phải có 2 hình mẫu, thấy ${hinhPhim.length}`)
  hinhPhim.forEach((e) => {
    const [x, y, w, h] = doXywh(e)
    datXywh(e, x, y + DOI_PHIM, w, h)
  })

  const chuHuongDan = pt.filter((e) => e.type === 'text' && doXywh(e)[0] < -900)
  canDung(chuHuongDan.length === 2, `khung "Hướng dẫn" phải có 2 khối chữ, thấy ${chuHuongDan.length}`)
  const than = chuHuongDan.find((e) => e.fontSize < 60)
  canDung(than != null, 'không tìm được khối văn xuôi của khung "Hướng dẫn"')
  than.fontSize = 44
  datXywh(than, -1675, 174, 1170, 1010)
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
  tieuDeO.forEach((e) => phongChu(e, 110 / 64))

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

const BO_CUC = {
  flowchart: boCucLuuDo,
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
  // Phép rửa thứ ba (xem khối chú thích "TỈ LỆ CHỮ / KHỔ MẪU"). Chỉ những mẫu có mục trong BO_CUC;
  // 5W2H không có vì đo được đã đạt 13–14 px sau khi chèn.
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
