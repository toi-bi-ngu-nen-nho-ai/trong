// Cổng D16 trên BẢN PHÁT HÀNH. Chạy tự động sau `npm run build` (`postbuild`).
//
// Vì sao phải có cổng nhìn vào `dist/`: mọi cổng khác của repo này dừng lại ở `.vendor-build/`.
// Chúng chứng minh cây vendored đã được biên dịch và đổi tên đúng — và không cổng nào nói được gì
// về thứ THẬT SỰ tới tay người dùng. Cả một lớp lỗi nằm trong khoảng trống đó, và nó đã xảy ra
// thật: bản dựng trước lượt sửa này dùng 81 biến `--drt-*` trong `dist/assets/` mà định nghĩa
// **không có biến nào** — toàn bộ thanh công cụ, khung chọn, khung kéo và widget của bảng vẽ render
// với custom property không phân giải được. Không có lỗi nào bị ném, console sạch, tên thẻ đúng,
// hình học đúng: một lượt kiểm bằng mắt trong trình duyệt cũng không bắt được. Chỉ có phép đếm
// "dùng bao nhiêu / định nghĩa bao nhiêu" trên chính bản dựng mới thấy.
//
// Ba luật:
//   A. Không còn `affine-` nào trong bản phát hành (D16 — devtools không được lộ thương hiệu
//      thượng nguồn). Chú ý luật này khớp `affine-` CÓ GẠCH NỐI, đúng như luật của
//      scripts/doi-ten-vendor.mjs: `affine:page` / `affine:surface` là FLAVOUR trong dữ liệu, cố
//      tình không đổi (đổi là không đọc được tài liệu do AFFiNE tạo) và không bị luật này chạm.
//   B. Mọi biến CSS trong không gian tên `--drt-` được DÙNG thì phải được ĐỊNH NGHĨA ở đâu đó
//      trong bản phát hành.
//   C. Mọi bản dịch trong src/board/vi.json phải CÓ MẶT trong bản phát hành. Không đếm tổng: một
//      phần đáng kể chuỗi ứng viên bị tree-shake nên tổng số trồi sụt vô nghĩa. (Con số cụ thể cố
//      tình KHÔNG ghi ở đây: nó đã mục ba lần trong repo này — §2.3 và §5.1 của spec P1-B từng
//      ghi hai bộ khác nhau và comment này từng ghi bộ thứ ba. Số có ngày đo nằm ở §2.3 của
//      docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md.) Luật này soi đúng những chuỗi
//      ĐÃ ĐƯỢC CHỌN dịch — nếu một cái biến mất khỏi dist/ thì bước dịch không chạy, chuỗi không
//      còn trên đường render, hoặc gói chứa nó chưa được bật; chẩn đoán phân biệt ba ca đó nằm ở
//      scripts/tim-ban-dich-vendor.mjs và chỉ chạy trên đường đỏ.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

import {
  coNhuLiteral,
  coTrongDivCoClass,
  coTrongKhoaNhomSlashMenu,
  coTrongNutDongMenuMobile,
  coTrongSpanTran,
  coTrongTagTooltip,
  coTrongTienToTemplateHead,
  giaiThichKhopTho,
  timTrungBanDich,
} from './so-khop-ban-dich.mjs'
import { soanThongBaoThieu, timTrongCayVendor } from './tim-ban-dich-vendor.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const DIST = path.join(GOC, 'dist')
// Cây đã dịch — chỉ đọc trên ĐƯỜNG ĐỎ của luật C, để phân biệt "gói bị tree-shake" với "bước dịch
// không chạy". Chắc chắn có mặt trên đường `npm run build` vì `prebuild` đã chạy
// kiem-vendor-build; nhưng `npm run kiem:dist` gọi tay được nên vẫn phải kiểm sự tồn tại.
const BUILD = path.join(GOC, '.vendor-build')

// Chỉ đọc các đuôi văn bản mà trình duyệt thật sự nạp. Ảnh/icon nhị phân không có gì để đọc.
const DUOI = new Set(['.js', '.css', '.html', '.json', '.txt', '.webmanifest'])

// ─── Vì sao luật B chỉ soi `--drt-` chứ không soi MỌI custom property ─────────────────────────
// Một phép kiểm "dùng mà không định nghĩa" áp cho mọi tên sẽ báo đỏ hàng trăm lần một cách vô
// nghĩa: rất nhiều custom property được ĐẶT LÚC CHẠY bằng `element.style.setProperty('--x', ...)`
// hoặc qua thuộc tính `style=` do JS sinh ra (`--rotate`, `--gap-h`, `--translate-x`, `--i`...) —
// không phép quét tĩnh nào thấy được chỗ đặt của chúng. Đo trên bản dựng hiện tại: 173 tên "dùng
// mà không thấy định nghĩa", trong đó chỉ khoảng nửa là token thiết kế thật.
// `--drt-` thì khác: đó là toàn bộ token thiết kế do bước đổi tên D16 sinh ra, tất cả đều được
// khai TĨNH trong một stylesheet (`.vendor-build/theme/style.css`). Thiếu một cái là thiếu thật.
const KHONG_GIAN_TEN = '--drt-'

// Ngoại lệ có lý do, KHÔNG phải danh sách để nhét thêm cho cổng xanh. Bốn tên dưới đây thượng nguồn
// AFFiNE cũng không định nghĩa trong `@toeverything/theme` — chúng được khai trong CSS vỏ app của
// chính AFFiNE, thứ không nằm trong phạm vi vendored. Thêm tên vào đây bắt buộc phải kèm lý do
// tương đương; mặc định của một tên `--drt-*` thiếu định nghĩa là SỬA, không phải miễn.
const MIEN = new Set([
  '--drt-icon-hover-color', // affine/components/src/date-picker/style.ts
  '--drt-icon-hover-background', // affine/components/src/date-picker/style.ts
  '--drt-background-kanban-card-color', // affine/data-view/.../kanban/{pc,mobile}/card.ts
  // Thêm ở Task 12 (nhóm 3, bật EmbedViewExtension): `affine/blocks/embed/src/embed-iframe-block/
  // components/embed-iframe-link-edit-popup.ts:34` dùng `var(--affine-background-color)` — tên
  // BẲN, không có hậu tố (khác `--affine-background-primary-color` và chín tên background-* khác
  // mà `affine/shared/src/theme/css-variables.ts` có khai). Đã kiểm bằng grep: đây là nơi DUY NHẤT
  // trong toàn cây vendored dùng tên bẳn này, và `.vendor-build/theme/style.css` (bản dựng thật)
  // không định nghĩa nó — cùng dạng lỗ với ba tên trên, không phải lỗi của bước đổi tên D16. KHÔNG
  // đoán giá trị thay: file này chỉ tô nền `.input-container` bên trong popup sửa URL của khối
  // nhúng iframe (chỉ hiện khi người dùng bấm sửa liên kết một embed đã có, không phải đường render
  // chính của khối), và không có cách nào kiểm bằng mắt trong lượt này (Step 7 hoãn theo hiệu chỉnh
  // D của Task 12 — dồn hết phần thị giác của bốn nhóm vào một lượt hợp nhất sau Task 13). Đoán một
  // giá trị không kiểm chứng được rủi ro hơn để trống — thiếu biến này chỉ khiến `.input-container`
  // không có màu nền (viền + chữ vẫn còn), không vỡ layout hay ném lỗi.
  '--drt-background-color',
])

// Luật C — bản dịch phải tới được tay người dùng. Gộp CẢ HAI file: vi.json (thay theo vị trí
// hiển thị) và vi-tien-to.json (thay trọn cây, P1-E) — cả hai đều phải "có mặt" trong dist/,
// nếu không N/N sẽ chỉ đếm một nửa sự thật.
const BAN_DO = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))
const BAN_DO_TIEN_TO = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), 'utf8'))
const BAN_DO_GOP = { ...BAN_DO, ...BAN_DO_TIEN_TO }
const MUC_BAN_DICH = Object.entries(BAN_DO_GOP)
const BAN_DICH = MUC_BAN_DICH.map(([, vi]) => vi)

// Bản đồ dịch rỗng làm luật C xanh với "0/0 có mặt" — đúng con bug mà cả ba lớp cổng trước đều
// dính và đều phải vá. Ở đây nó nguy hiểm hơn hẳn: nơi chặn ca này (`dich-chuoi-vendor.mjs` Cổng 0)
// KHÔNG nằm trên đường `npm run build` — `prebuild` chỉ chạy `kiem-vendor-build` +
// `kiem-vendor-paths`, còn `postinstall` bỏ qua nhanh khi `.vendor-build/` đã hợp lệ. Nghĩa là ở
// mọi lượt build dùng cây vendor có sẵn, luật C là lớp CUỐI CÙNG và DUY NHẤT.
if (BAN_DICH.length === 0) {
  console.error(
    'kiem-dist: DỪNG — src/board/vi.json không có bản dịch nào, nên luật C không có gì để canh và ' +
      'sẽ xanh giả với "0/0 có mặt". Hoặc bảng dịch bị xoá nhầm, hoặc luật C nên được gỡ hẳn.',
  )
  process.exit(1)
}

// Chặn cả chuỗi RỖNG lẫn chuỗi THOÁI HOÁ, vì luật C hỏng theo MỨC ĐỘ chứ không theo nhị phân:
// `""` thì `includes` LUÔN khớp, còn `"-"`, `"…"`, `"x"` hay một ký tự vô hình thì GẦN NHƯ CHẮC
// CHẮN khớp — chunk bảng vẽ thật chứa sẵn ZWSP, soft hyphen, word-joiner, và tất nhiên mọi chữ
// cái đơn. Cả hai cho cùng một kết quả: chuỗi được đếm là "có mặt" mà bản phát hành không dịch gì.
//
// Mà gõ `-` hay `…` để đánh dấu "dịch sau" là thao tác biên tập bình thường ngang với để trống,
// nhất là ở quy mô 323 chuỗi sắp tới. Cùng lý lẽ với sàn ở trên: nơi duy nhất chặn được nó là
// Cổng 0 của `dich-chuoi-vendor.mjs`, mà cổng đó KHÔNG nằm trên đường `npm run build`.
//
// Bản dịch thật ngắn nhất hiện có là "Bố cục" (6 ký tự), nên đòi >=2 ký tự hữu hình và ít nhất
// một chữ cái là ngưỡng rộng rãi, không cản trở bản dịch hợp lệ nào.
//
// Lớp ký tự viết bằng ESCAPE chứ không bằng ký tự thật — chúng vô hình nên một lượt sao chép làm
// mất chúng thì không ai thấy: \u00AD soft hyphen · \u200B-\u200D zero-width space/non-joiner/joiner ·
// \u2060 word joiner · \uFEFF BOM.
const VO_HINH = /[\s\u00AD\u200B-\u200D\u2060\uFEFF]/gu
const laBanDichXau = (v) => {
  if (typeof v !== 'string') return true
  const con = v.replace(VO_HINH, '')
  return con.length < 2 || !/\p{L}/u.test(con)
}
const MUC_XAU = MUC_BAN_DICH.filter(([, vi]) => laBanDichXau(vi))
if (MUC_XAU.length) {
  console.error(
    `kiem-dist: DỪNG — ${MUC_XAU.length} bản dịch trong src/board/vi.json rỗng, thoái hoá, hoặc ` +
      'không phải chuỗi. Luật C không canh được chúng: chuỗi rỗng thì phép tìm luôn khớp, còn chuỗi ' +
      'một ký tự hay ký tự vô hình thì gần như chắc chắn khớp — nên chúng sẽ được đếm là "có mặt" ' +
      'dù bản phát hành không hề chứa bản dịch nào:',
  )
  MUC_XAU.forEach(([en, vi]) => console.error(`   "${en}" → ${JSON.stringify(vi)}`))
  process.exit(1)
}

// Hai khoá cùng dịch ra MỘT chuỗi y hệt là lớp lỗi mà phép so khớp chặt KHÔNG cứu được: hai chuỗi
// bằng nhau từng ký tự, nên chỉ cần một trong hai còn sống trong dist/ là CẢ HAI được đếm là "có
// mặt" — kể cả khi chỗ của cái kia đã bị tree-shake. Mẫu số của luật C sai mà không ai biết.
//
// Đây là ràng buộc BIÊN TẬP, chủ dự án đã chốt: không được dịch `Delete` và `Remove` cùng thành
// "Xoá" — phải chọn chữ khác nhau, hoặc bỏ bớt một khoá.
//
// Đặt ở đây chứ không ở Cổng 0 của dich-chuoi-vendor.mjs vì cổng đó KHÔNG nằm trên đường
// `npm run build` (xem chú thích sàn rỗng phía trên) — luật C là lớp duy nhất chắc chắn chạy.
const TRUNG = timTrungBanDich(BAN_DO_GOP)
if (TRUNG.length) {
  console.error(
    `kiem-dist: DỪNG — ${TRUNG.length} bản dịch trong src/board/vi.json bị nhiều khoá dùng chung. ` +
      'Luật C tìm bản dịch trong dist/ theo GIÁ TRỊ, nên hai khoá cùng giá trị thì một cái còn ' +
      'sống là cả hai được tính "có mặt" — mẫu số sai mà cổng vẫn xanh. Đổi chữ cho khác nhau, ' +
      'hoặc bỏ bớt khoá:',
  )
  TRUNG.forEach(({ vi, khoa }) =>
    console.error(`   ${JSON.stringify(vi)} ← ${khoa.map((k) => `"${k}"`).join(', ')}`),
  )
  process.exit(1)
}

// Nhận ra file thuộc cây bảng vẽ đã vendored bằng MẬT ĐỘ `drt-`, không phải bằng sự có mặt.
//
// `drt-` là tiền tố thương hiệu của CẢ dự án chứ không riêng cây vendored, nên chỉ cần một class
// name lọt vào bundle app là phạm vi bị nới trở lại và lỗ cũ mở ra: chunk bảng vẽ tiếng Anh 100%
// vẫn xanh vì bundle app tình cờ chứa cả `drt-` lẫn mấy chuỗi tiếng Việt. Không phải giả thuyết —
// `src/index.css` từng chứa đúng luật `.drt-edgeless-viewport`, mới dời sang `src/board/` vì một lý
// do hoàn toàn khác. Tính "độc quyền" của dấu hiệu là ngẫu nhiên lịch sử, không phải bất biến.
//
// Mật độ thì không mong manh như vậy. Đo trên bản dựng hiện tại: **2.026** lượt ở chunk JS bảng vẽ
// và **1.783** ở CSS bảng vẽ, so với **0** ở cả mười file còn lại (kể cả bundle app 977 kB). Biên
// rộng tới mức ngưỡng 100 vừa loại được ca lọt lẻ vừa không sợ trượt oan.
const NGUONG_BANG_VE = 100
const laFileBangVe = (noiDung) => (noiDung.match(/drt-/g)?.length ?? 0) >= NGUONG_BANG_VE

function* dietFile(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietFile(f)
    else if (DUOI.has(path.extname(e.name))) yield f
  }
}

if (!existsSync(DIST)) {
  console.error('kiem-dist: không thấy dist/. Chạy `npm run build` trước.')
  process.exit(1)
}

const dung = new Map() // tên → file đầu tiên thấy dùng
const dinhNghia = new Set()
const conAffine = []
const thieuBanDich = new Set(BAN_DICH)
// Bản dịch mà phép THÔ trúng nhưng phép CHẶT thì không — tức chuỗi có trong chunk nhưng không ở
// dạng literal trọn vẹn. Task 4 dùng tập này để thêm ghi chú vào thông báo đỏ. Ghi lại ở đây vì
// đây là chỗ duy nhất còn đọc nội dung file.
const khopTho = new Set()
let soFile = 0

for (const f of dietFile(DIST)) {
  soFile++
  const rel = path.relative(GOC, f).split(path.sep).join('/')
  const noiDung = readFileSync(f, 'utf8')

  // Luật A.
  const soAffine = noiDung.match(/affine-/g)?.length ?? 0
  if (soAffine) {
    const viDu = [...new Set([...noiDung.matchAll(/[-\w]*affine-[\w-]*/g)].map((m) => m[0]))]
    conAffine.push({ rel, soAffine, viDu: viDu.slice(0, 8) })
  }

  // Luật C. CHỈ tính khi bản dịch nằm trong một file thuộc cây bảng vẽ. Đếm ở mọi file thì một
  // `dist/` có chunk bảng vẽ HOÀN TOÀN tiếng Anh vẫn xanh, miễn bundle app tình cờ chứa mấy từ đó —
  // mà đây là app y khoa TIẾNG VIỆT với bundle riêng gần 1 MB, và chặng tới thêm 323 chuỗi nên va
  // chạm gần như chắc chắn. Mỗi va chạm là một chuỗi được miễn kiểm vĩnh viễn mà không ai biết.
  if (laFileBangVe(noiDung)) {
    for (const v of thieuBanDich) {
      // Phép CHẶT: chuỗi phải nằm trọn trong một literal. `includes` chuỗi con tính nhầm một bản
      // dịch là "có mặt" khi nó chỉ là chuỗi con của một bản dịch KHÁC — đo được trên dist/ thật:
      // "Phong" khớp thô vào "Phong cách" đang ship, dù chỗ thật của nó đã bị tree-shake.
      //
      // `coTrongTagTooltip` xử lớp KHÁC hẳn: chữ trần giữa <drt-tooltip>…</drt-tooltip> (vd
      // "More Tools" → "Công cụ khác") không hề đứng một mình trong MỘT literal — nó là một khúc
      // văn bản nằm GIỮA hai literal khác của cùng một template lớn hơn, nên `coNhuLiteral` không
      // bao giờ thấy nó (đo được thật: luật C báo "Công cụ khác" thiếu dù bản dịch đã tới dist/).
      if (
        coNhuLiteral(noiDung, v) ||
        coTrongTagTooltip(noiDung, v) ||
        coTrongNutDongMenuMobile(noiDung, v) ||
        coTrongTienToTemplateHead(noiDung, v) ||
        coTrongKhoaNhomSlashMenu(noiDung, v) ||
        coTrongDivCoClass(noiDung, v) ||
        coTrongSpanTran(noiDung, v)
      )
        thieuBanDich.delete(v)
      // Phép THÔ chỉ còn dùng làm CHẨN ĐOÁN, không còn dùng để kết luận "có mặt". Một chuỗi vừa
      // được ghi vào đây rồi sau đó khớp chặt ở file khác thì vẫn bị xoá khỏi `thieuBanDich`, nên
      // nó không bao giờ được in ra — thông báo chỉ lặp trên `thieuBanDich`.
      else if (noiDung.includes(v)) khopTho.add(v)
    }
  }

  // Luật B — phía ĐỊNH NGHĨA: `--x: giá trị`.
  for (const m of noiDung.matchAll(/(--[\w-]+)\s*:/g)) dinhNghia.add(m[1])

  // Luật B — phía DÙNG. Bắt luôn ký tự ngay sau tên để loại hai trường hợp KHÔNG phải lỗi:
  //   - có giá trị dự phòng: `var(--x, 10px)` — biến thiếu thì trình duyệt dùng giá trị sau dấu
  //     phẩy, không có gì hỏng cả.
  //   - tên ghép động: `` `var(--drt-text-highlight-${ten})` `` — tên đọc tĩnh được chỉ là phần
  //     đầu, phần đuôi do JS ghép lúc chạy; các tên ĐẦY ĐỦ có định nghĩa trong theme.
  for (const m of noiDung.matchAll(/var\(\s*(--[\w-]+)\s*([\s\S]?)/g)) {
    const [, ten, sau] = m
    if (sau === ',' || sau === '$' || sau === '`' || sau === '"' || sau === "'" || sau === '+') continue
    if (!dung.has(ten)) dung.set(ten, rel)
  }
}

const dungDrt = [...dung.keys()].filter((t) => t.startsWith(KHONG_GIAN_TEN))
const dinhNghiaDrt = [...dinhNghia].filter((t) => t.startsWith(KHONG_GIAN_TEN))
const thieuDinhNghia = dungDrt.filter((t) => !dinhNghia.has(t) && !MIEN.has(t))

console.log(
  `kiem-dist: đã đọc ${soFile} file trong dist/\n` +
    `  biến ${KHONG_GIAN_TEN}*  — dùng ${dungDrt.length} tên, định nghĩa ${dinhNghiaDrt.length} tên\n` +
    `  biến CSS tất cả  — dùng ${dung.size} tên, định nghĩa ${dinhNghia.size} tên\n` +
    `  bản dịch vi.json — ${BAN_DICH.length - thieuBanDich.size}/${BAN_DICH.length} có mặt`,
)

let loi = 0

if (conAffine.length) {
  loi++
  console.error(
    `\nD16 ĐỎ — còn "affine-" trong bản phát hành (${conAffine.length} file). Bước đổi tên ` +
      '(scripts/doi-ten-vendor.mjs + plugin doiTenAffine trong vite.config.ts) chưa phủ hết nguồn ' +
      'này — phần lớn các ca còn sót đến từ node_modules chứ không từ cây vendored:',
  )
  conAffine.forEach((c) => console.error(`   ${c.rel}: ${c.soAffine} chỗ — ${c.viDu.join(', ')}`))
}

if (thieuDinhNghia.length) {
  loi++
  console.error(
    `\nBIẾN CSS ĐỎ — ${thieuDinhNghia.length} tên ${KHONG_GIAN_TEN}* được dùng nhưng không được ` +
      'định nghĩa ở đâu trong dist/. Trình duyệt không báo lỗi cho chuyện này: nó chỉ vẽ ra một ' +
      'giao diện không màu, không viền, không bóng. Nguyên nhân thường gặp: bản theme đã đổi tên ' +
      '(.vendor-build/theme/style.css) không được import từ src/board/, nên không vào chunk nào cả.',
  )
  thieuDinhNghia
    .sort()
    .slice(0, 30)
    .forEach((t) => console.error(`   ${t}   (dùng ở ${dung.get(t)})`))
  if (thieuDinhNghia.length > 30) {
    console.error(`   ...và ${thieuDinhNghia.length - 30} tên nữa`)
  }
}

if (thieuBanDich.size) {
  loi++

  // Chẩn đoán: quét cây đã dịch tìm GIÁ TRỊ TIẾNG VIỆT. Thấy → bước dịch đã chạy, chuỗi mất ở
  // dist/ vì gói chứa nó bị tree-shake. Không thấy → bước dịch chưa đáp được vào cây.
  //
  // Chỉ chạy ở ĐÂY, trên đường đỏ: đường xanh không đọc thêm một byte nào. Và vì cả nhánh này
  // nằm sau `loi++`, không có cách nào mã dưới đây biến một lượt đỏ thành xanh — chẩn đoán hỏng,
  // quét rỗng, cây rỗng thì cổng vẫn đỏ.
  let daDich = null
  let loiChanDoan = null
  if (!existsSync(BUILD)) {
    loiChanDoan = 'không có .vendor-build/ để đối chiếu — dựng lại bằng `npm run dung:vendor`'
  } else {
    try {
      daDich = await timTrongCayVendor(BUILD, thieuBanDich)
    } catch (err) {
      // FAIL-OPEN có chủ đích, ngược với `?? []` bị cấm trong luat-vi-tri-dich.mjs. Khác biệt:
      // ở đó fail-open biến "mất khả năng kiểm" thành "coi như không có lỗi" trên đường XANH;
      // ở đây kết quả xấu nhất là một thông báo nghèo hơn trên một cổng ĐÃ ĐỎ RỒI. Để lỗi này
      // ném ra thì người đọc mất luôn cả thông tin cũ và nhận về một stack trace.
      //
      // `err?.message` chứ không phải `err.message`: nếu thứ bị ném là `null`/`undefined` (một
      // rejection trần), `err.message` tự nó ném TypeError NGAY TRONG khối catch này — không ai
      // bắt — và phá đúng cái try/catch dựng lên để tránh chuyện đó. `String(err)` làm dự phòng
      // khi `err` không có `.message` (ví dụ ném ra một chuỗi hoặc một object thường).
      loiChanDoan = err?.message || String(err)
    }
  }

  // Ghi chú cho những chuỗi mà phép THÔ trúng nhưng phép CHẶT không. Chúng có mặt trong chunk
  // dưới một dạng nào đó, và người đọc cần biết dạng nào — nếu không họ sẽ tưởng cổng đang nói
  // "chuỗi này hoàn toàn vắng mặt".
  const ghiChu = new Map()
  for (const v of thieuBanDich) {
    if (!khopTho.has(v)) continue
    // Truyền `thieuBanDich` (đã ổn định — vòng quét file phía trên đã chạy xong) làm `dangThieu`,
    // để giaiThichKhopTho ưu tiên một ứng viên ĐANG SHIP thay vì một ứng viên cũng đang thiếu —
    // xem I1 của lượt review toàn nhánh P1-D.
    const nguon = giaiThichKhopTho(v, BAN_DO, thieuBanDich)
    ghiChu.set(
      v,
      nguon
        ? nguon.cungThieu
          ? // cungThieu === true: KHÔNG có ứng viên nào đang ship chứa chuỗi này — bản dịch tìm
            // được cũng đang nằm trong danh sách thiếu, nên đây chỉ là một khả năng, không phải
            // nguyên nhân đã xác nhận. Thể dè dặt, không khẳng định dứt khoát.
            `lưu ý: chuỗi này có thể trùng với bản dịch ${JSON.stringify(nguon.vi)} của khoá ` +
            `"${nguon.khoa}", nhưng bản dịch đó CŨNG đang thiếu — chưa xác định được chuỗi nào ` +
            'trong chunk làm phép so khớp cũ trúng.'
          : // cungThieu === false: nguon.vi THẬT SỰ có mặt (nó không nằm trong thieuBanDich), nên
            // đây là một khẳng định ĐÃ ĐO, không phải suy đoán.
            `lưu ý: chuỗi này CÓ trong chunk, nhưng chỉ vì nó nằm trong bản dịch ` +
            `${JSON.stringify(nguon.vi)} của khoá "${nguon.khoa}". Phép so khớp cũ đã tính nhầm ` +
            'đây là "có mặt".'
        : 'lưu ý: chuỗi này CÓ trong chunk nhưng KHÔNG ở dạng literal trọn vẹn, và không nằm ' +
          'trong bản dịch nào khác — có thể bộ đóng gói đã ghép/tách chuỗi. Kiểm tay trước khi ' +
          'kết luận.',
    )
  }

  console.error('\n' + soanThongBaoThieu(thieuBanDich, daDich, loiChanDoan, ghiChu))
}

if (loi) process.exit(1)
console.log('kiem-dist: xanh — không còn "affine-" và mọi biến --drt-* dùng đều có định nghĩa.')
process.exit(0)
