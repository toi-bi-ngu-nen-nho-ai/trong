// ─── Kiểu dữ liệu dùng chung cho toàn bộ nội dung tham khảo (bài viết, thẻ ghi nhớ, kháng sinh,
// bệnh lý, thuốc truyền tĩnh mạch). Tách riêng khỏi App.tsx để các file data/*.ts import vào và
// để App.tsx dùng lại khi cần khai báo props cho component.

import type { WeightBasis } from "../lib/bodyWeight"
import type { VialForm } from "../lib/mixing"

// ─── Nội dung dạng "khối" (block) — kiểu soạn thảo tự do giống Notion ─────────
// Mỗi dòng người dùng gõ là một block độc lập, nên có thể chèn ảnh xen giữa bất kỳ dòng nào
// thay vì bị ép "văn bản một chỗ, ảnh một chỗ" như trước. Dùng chung cho bài viết tự nhập
// (Article.blocks) và bài học ECG (EcgLesson.blocks).
// - "text": đoạn văn thường
// - "heading": tiêu đề mục (đồng thời là mục trong mục lục của bài)
// - "bullet": gạch đầu dòng
// - "numbered": mục đánh số (số thứ tự tính tự động theo các dòng đánh số liền nhau)
// - "quote": trích dẫn / lưu ý
// - "callout": khối "Điểm chính" nổi bật, kiểu hộp nhấn mạnh của UpToDate
// - "image": ảnh (dataUrl đã thu nhỏ + nén, xem src/lib/imageResize.ts), caption là chú thích
//
// Trong `text` có thể chứa dấu định dạng nội dòng: **đậm**, *nghiêng*, __gạch chân__, ==tô sáng==,
// và liên kết tới bài khác [[article:id|chữ hiện ra]] — xem src/lib/richText.ts.
export type BlockType = "text" | "heading" | "bullet" | "numbered" | "quote" | "callout" | "image"

export interface ContentBlock {
  id: string
  type: BlockType
  // Chỉ dùng cho block chữ (text/heading/bullet/quote).
  text?: string
  // Chỉ dùng cho block ảnh.
  dataUrl?: string
  caption?: string
}

export interface Article {
  id: string
  title: string
  specialty: string
  tags: string[]
  readTime: number
  difficulty: "Cơ bản" | "Nâng cao"
  excerpt: string
  lastUpdated: string
  // `body`: nội dung dạng văn bản thuần của các bài viết tự nhập ĐỜI CŨ (trước khi có trình soạn
  // thảo theo block). Vẫn đọc được nhờ articleBlocks() trong lib/blocks.ts; bài viết mới lưu vào
  // `blocks`.
  body?: string
  blocks?: ContentBlock[]
}

// Một mục trong bài viết dài (hiển thị trong mục lục của ArticleScreen).
export interface ArticleSection {
  id: string
  heading: string
  content: string[]
}

// Nội dung đầy đủ của một bài viết, khoá theo Article.id trong ARTICLE_CONTENT.
// Các trường hiển thị dùng chung với danh sách bài viết (title/specialty/tags/difficulty/
// readTime/lastUpdated) đã có sẵn trong Article — ArticleScreen tra theo articleId để lấy,
// tránh trùng lặp dữ liệu giữa ARTICLES và ARTICLE_CONTENT.
export interface ArticleContent {
  toc: string[]
  sections: ArticleSection[]
  keyPoints: string[]
  highlightTerms: string[]
}

// Lưu ý: KHÔNG có field đếm số bài viết ở đây — số bài viết/thẻ ghi nhớ của một chuyên khoa phải
// luôn được tính động từ ARTICLES/FLASHCARDS thật (kể cả mục tự thêm) tại nơi hiển thị, để không
// bao giờ lệch với dữ liệu thật (xem countArticlesFor/countFlashcardsFor trong lib/specialtyStats.ts).
// `icon` đã bỏ: hình của chuyên khoa được tra theo `id` trong components/SpecialtyIcons.tsx (SVG),
// không còn là một ký tự emoji do hệ điều hành vẽ.
export interface Specialty {
  id: string
  name: string
  color: string
}

export interface FlashCard {
  id: string
  front: string
  back: string
  specialty: string
  due: boolean
  // true nếu đây là thẻ người dùng tự nhập (lưu trong bộ nhớ trình duyệt) — dùng để hiển thị nhãn
  // "Tự nhập" và cho phép xoá, giống các mục tự nhập khác (bài viết, kháng sinh, thuốc truyền...).
  isCustom?: boolean
}

// Tầng liều theo mức lọc cầu thận (CrCl, mL/phút). `min` là ngưỡng dưới (bao gồm) của tầng.
export interface DoseTier {
  min: number
  label: string
  dose: string
}

// ─── Nguồn và ngày rà soát ────────────────────────────────────────────────────
// Mọi mục dữ liệu về thuốc đều phải trả lời được hai câu: liều này lấy từ đâu, và lần cuối rà soát
// là bao giờ. Không có hai thông tin này thì người dùng không có cách nào biết mục nào còn hợp thời
// (ví dụ đích nồng độ vancomycin đã đổi từ "đáy 15–20" sang AUC/MIC từ đồng thuận 2020) — nên khi
// bỏ trống, giao diện phải hiện rõ là CHƯA GHI NGUỒN thay vì im lặng.
// `reviewedOn`: dạng "YYYY-MM" cho gọn, vì rà soát tài liệu là việc theo tháng chứ không theo ngày.
export interface SourceInfo {
  source?: string
  reviewedOn?: string
}

// Liều theo phương thức điều trị thay thế thận. Đây chính là nhóm bệnh nhân mà bậc liều theo CrCl
// không áp dụng được; để trống nghĩa là app CHƯA có dữ liệu và phải nói thẳng như vậy.
//
// Lưu ý quan trọng khi nhập dữ liệu CRRT: liều KHÔNG phải một con số cố định mà phụ thuộc tốc độ
// dịch thải (Qeff). Vì vậy chuỗi `crrt` phải luôn ghi kèm điều kiện Qeff của khuyến cáo, và
// `source` phải nói rõ khuyến cáo đó lấy từ đâu — không có hai thứ đó thì con số vô nghĩa.
export interface RrtDose {
  ihd?: string
  crrt?: string
  sled?: string
  pd?: string
  note?: string
  source?: string
  reviewedOn?: string
}

// Cảnh báo / tương tác cần lưu ý khi dùng kháng sinh — không phụ thuộc CrCl.
export interface AntibioticWarning {
  text: string
  severity: "cao" | "trung bình"
}

// Liều riêng theo TỪNG bệnh lý (indication) — ghi đè lên `tiers` mặc định của thuốc khi bệnh lý
// đó đòi hỏi liều khác biệt về mặt lâm sàng (ví dụ viêm màng não cần liều cao hơn để thấm qua
// hàng rào máu não). `diseaseId` khớp với `DiseaseEntry.id`.
// `extends SourceInfo`: liều theo TỪNG bệnh lý thường lấy từ một khuyến cáo/y văn khác hẳn liều
// chuẩn chung của thuốc (vd viêm màng não thường theo hướng dẫn riêng cho thần kinh trung ương,
// không phải tài liệu dược lý tổng quát của thuốc) — trước đây mọi bệnh lý của một thuốc phải dùng
// CHUNG một `source`/`reviewedOn` ở cấp thuốc, nên hiện đúng nguồn cho bệnh lý này lại sai/thiếu
// cho bệnh lý khác. Để trống thì màn hình rơi về `source`/`reviewedOn` của thuốc (xem
// AntibioticDoseCard) — không bắt buộc phải điền lại ngay cho mọi bệnh lý cũ.
export interface IndicationDose extends SourceInfo {
  diseaseId: string
  standardDose?: string
  tiers: DoseTier[]
  note?: string
}

// Nguồn dữ liệu chuẩn cho từng kháng sinh — đây là "trường data" ổn định để nhập/mở rộng:
// mỗi thuốc có id duy nhất, liều chuẩn tham khảo, danh sách tầng liều theo CrCl (tối thiểu 1 tầng),
// ghi chú theo dõi, và danh sách cảnh báo lâm sàng.
// Lưu ý: cùng một hoạt chất (cùng `name`) có thể có nhiều bản ghi khác nhau nếu khác `route`
// (đường dùng) — ví dụ Metronidazole (IV) và Metronidazole (uống). `id` luôn phải duy nhất.
// `indications`: liều theo bệnh lý cụ thể, nếu có — khi người dùng chọn một bệnh lý nằm trong
// danh sách này, liều hiển thị sẽ ưu tiên lấy từ đây thay vì `tiers` mặc định.
// `isCustom`: true nếu đây là bản ghi người dùng tự nhập (lưu trong bộ nhớ trình duyệt) — dùng
// để hiển thị nhãn "Tự nhập" và cho phép xoá.
// `doseWeightBasis`: loại cân nặng cần dùng khi tính liều mg/kg cho thuốc này — "actual" (mặc định,
// không cần khai báo) | "ideal" (luôn dùng IBW) | "adjusted" (dùng AdjBW nếu bệnh nhân béo phì,
// ABW > 130% IBW). Chỉ khai báo cho các thuốc có khuyến cáo rõ ràng (vd. aminoglycosid) — khi có
// giá trị này, màn hình sẽ hiện rõ cân nặng đang áp dụng để chỉnh liều.
// Công thức pha/hoàn nguyên kháng sinh — khác hẳn MixRecipe của thuốc truyền: kháng sinh không có
// tốc độ để chỉnh (liều là một con số cố định mỗi lần dùng, không titrate), nên câu hỏi lúc pha
// không phải "đặt bơm bao nhiêu" mà là "hoàn nguyên/pha loãng thế nào ra đúng nồng độ, có vượt
// ngưỡng trên không, và truyền trong bao lâu". Mọi trường đều TUỲ CHỌN — panel vẫn tính được với số
// người dùng tự nhập ngay cả khi app chưa biết trước quy cách ống/lọ của thuốc đó.
export interface AntibioticMix {
  vialAmount?: number
  vialUnit?: string
  vialLabel?: string
  // "fixed" = chai/túi pha sẵn hàm lượng CỐ ĐỊNH của nhà sản xuất (vd Levofloxacin 750 mg/150 mL) —
  // không pha loãng thêm, chỉ RÚT một phần hoặc dùng trọn chai. Khác "solution" (ống dung dịch đậm
  // đặc, còn phải pha loãng ra thể tích cuối mong muốn).
  vialForm?: VialForm
  // Ống dung dịch / chai cố định: thể tích dung dịch có sẵn trong một ống/chai (mL).
  vialVolumeMl?: number
  // Lọ bột: thể tích dung môi hoàn nguyên một lọ, và thể tích bột chiếm chỗ sau khi tan.
  reconstituteMl?: number
  displacementMl?: number
  diluents?: string[]
  avoidDiluents?: string[]
  diluentWarning?: string
  // Đơn vị nồng độ hiển thị — bỏ trống thì mặc định "mg/mL" (đúng với gần hết kháng sinh IV).
  concUnit?: string
  // Ngưỡng trên nồng độ pha (giới hạn độ tan/khuyến cáo nhà sản xuất) — vượt là chặn, giống MixRecipe.
  maxConc?: number
  // Thời gian/tốc độ truyền khuyến cáo — câu chữ tự do vì thường có điều kiện (liều cao thì dài
  // hơn, có phác đồ truyền kéo dài riêng...) chứ không phải một con số cố định.
  infuseNote?: string
}

// `rrt`: liều khi bệnh nhân đang lọc máu/CRRT. `compatKey`: khoá tra bảng tương hợp Y-site và
// tương tác thuốc (xem data/compatibility.ts) — cùng một khoá dùng chung cho kháng sinh và thuốc
// truyền, để bảng "Đang truyền" kiểm tra được cả hai nhóm với nhau. `mix`: công thức pha/hoàn
// nguyên — chỉ có ý nghĩa với đường tiêm/truyền, bỏ trống với thuốc uống.
export interface Antibiotic extends SourceInfo {
  id: string
  name: string
  route: string
  standardDose?: string
  preparation?: string
  note?: string
  tiers: DoseTier[]
  warnings?: AntibioticWarning[]
  indications?: IndicationDose[]
  isCustom?: boolean
  doseWeightBasis?: WeightBasis
  rrt?: RrtDose
  compatKey?: string
  mix?: AntibioticMix
  // Liều nạp — vd Vancomycin cần liều nạp 25–30 mg/kg trước khi vào liều duy trì theo CrCl.
  // Cùng kiểu BolusDose với InfusionDrug.boluses (xem bên dưới), dùng chung component hiển thị/sửa.
  boluses?: BolusDose[]
  // Trần liều MỘT LẦN DÙNG. Xem ghi chú của DoseCap ngay bên dưới.
  maxSingleDose?: DoseCap
}

// ─── Trần liều một lần dùng ───────────────────────────────────────────────────
// Vì sao phải có: liều kháng sinh trong app viết dạng chuỗi "15–20 mg/kg mỗi 8–12h", và app nhân
// thẳng con số đó với cân nặng (xem lib/perKgDose.ts). Phép nhân đó KHÔNG có điểm dừng — bệnh nhân
// 140 kg cho ra "liều nạp Vancomycin 3.500 mg" trông hoàn toàn hợp lý trong khi mọi khuyến cáo đều
// chặn ở 2–3 g. Bên thuốc truyền đã có doseAbsMax canh việc này rất kỹ; bên kháng sinh — nhóm dùng
// nhiều hơn hẳn — thì trước đây không có lớp canh nào.
//
// `amount` tính theo `unit` (cùng họ đơn vị với liều: mg/g/mcg/đơn vị). `note` nói RÕ trần này từ
// đâu ra, vì một con số chặn mà không giải thích thì người dùng chỉ học cách bấm bỏ qua.
export interface DoseCap {
  amount: number
  unit: string
  note?: string
}

// Danh mục bệnh lý — mỗi bệnh tham chiếu tới các kháng sinh phù hợp qua `antibiotics` (id, theo thứ tự ưu tiên).
// `isCustom`: true nếu đây là bản ghi người dùng tự nhập hoặc được tự động tạo ra — ví dụ khi sửa
// "Chỉ định riêng theo bệnh lý" của một kháng sinh (EditAntibioticScreen) và gõ tên một bệnh lý
// chưa có trong danh mục gốc, app tự tạo một DiseaseEntry mới với cờ này để đánh dấu và cho phép
// đồng bộ/sao lưu như các mục tự nhập khác.
export interface DiseaseEntry {
  id: string
  name: string
  note?: string
  antibiotics: string[]
  isCustom?: boolean
}

// Cấu hình máy tính tốc độ truyền (mL/h) cho thuốc co bóp cơ tim / vận mạch / giãn mạch / chống loạn nhịp / điện giải.
// - weightBased: liều tính theo cân nặng (vd. mcg/kg/phút) hay liều cố định không theo cân nặng (vd. mg/phút, đơn vị/giờ).
// - concUnit / doseUnit: đơn vị hiển thị cho người dùng.
// - concDefault: nồng độ pha thường dùng (điền sẵn để tiện, người dùng vẫn có thể sửa) — bỏ trống nếu nồng độ tuỳ theo chuẩn từng khoa.
// - doseMin / doseMax: khoảng liều THƯỜNG DÙNG, không phải giới hạn nhập liệu.
// - doseAbsMax: NGƯỠNG TRÊN tuyệt đối của thuốc — mốc mà vượt qua thì gần như chắc chắn là gõ nhầm.
//   Vì sao cần tách khỏi doseMax: noradrenaline có khoảng thường dùng tới 1 mcg/kg/phút nhưng sốc
//   kháng trị chạy 2–3 mcg/kg/phút là chuyện có thật. Nếu chỉ có MỘT con số thì app phải chọn giữa
//   "chặn cả liều hợp lệ" (báo động giả đúng lúc bệnh nhân nặng nhất) và "không chặn gì". Có hai
//   mốc thì: trên doseMax = cảnh báo nhưng vẫn hiện kết quả; trên doseAbsMax = chặn, bắt xác nhận.
//   Bỏ trống doseAbsMax nghĩa là chưa khai báo ngưỡng trên tuyệt đối — lúc đó app quay về mốc suy ra từ
//   doseMax (xem lib/doseSafety.ts) thay vì bỏ chặn hoàn toàn.
// - unitScale: KHÔNG CÒN DÙNG. Trước đây là hệ số quy đổi nồng độ sang cùng đơn vị với liều; nay
//   lib/infusion.ts tự đọc đơn vị từ chuỗi `doseUnit`/`concUnit` rồi suy ra hệ số, nên không thể
//   khai báo lệch nữa. Giữ lại trường (không bắt buộc) để dữ liệu cũ và mục tự nhập cũ vẫn hợp lệ.
// - doseTimeBasis: liều nhập vào tính theo "phút" (mặc định — vd. mcg/kg/phút, mg/phút) hay theo "giờ" (vd. Nicardipine tính mg/giờ). Bỏ trống = "phút".
// - mix: công thức pha CHUẨN dưới dạng số (thay vì chỉ nằm trong câu chữ `preparation`), để app
//   tính giúp chiều "tôi có ống 250 mg, pha vừa đủ 50 mL → nồng độ bao nhiêu" và chiều ngược lại
//   "bệnh nhân hạn chế dịch, tôi cần nồng độ gấp đôi → lấy mấy ống".
// - pumpStep: bước đặt tốc độ nhỏ nhất của bơm (mặc định 0,1 mL/giờ) — kết quả phải làm tròn theo
//   bước thật rồi nói rõ sau khi làm tròn thì liều thực nhận là bao nhiêu.
export interface InfusionCalcConfig {
  weightBased: boolean
  doseUnit: string
  doseMin: number
  doseMax: number
  doseAbsMax?: number
  concUnit: string
  concDefault?: number
  unitScale?: number
  doseTimeBasis?: "phút" | "giờ"
  mix?: MixRecipe
  pumpStep?: number
}

// Công thức pha chuẩn ở dạng số.
// - vialAmount/vialUnit: hàm lượng MỘT ống/lọ, vd 250 mg.
// - vialLabel: cách gọi trên thực tế ("ống", "lọ", "chai").
// - volumeMl: thể tích cuối của công thức chuẩn (pha "vừa đủ" bao nhiêu mL).
export interface MixRecipe {
  vialAmount: number
  vialUnit: string
  vialLabel?: string
  // Số ống của công thức chuẩn (mặc định 1) — vd amiodarone duy trì dùng 6 ống 150 mg.
  vials?: number
  volumeMl: number
  // "solution" (mặc định) = ống dung dịch pha sẵn, rút thẳng ra. "powder" = lọ bột phải hoàn nguyên
  // trước. "fixed" = chai/túi pha sẵn hàm lượng CỐ ĐỊNH của nhà sản xuất, không pha loãng thêm —
  // ba thao tác khác hẳn nhau nên không dùng chung một con số thể tích được (xem VialSpec/VialForm
  // trong lib/mixing.ts, và AntibioticMix.vialForm ở trên — cùng ba giá trị, không được lệch nhau).
  vialForm?: VialForm
  // Thể tích DUNG DỊCH trong một ống (mL) — chỉ dùng cho ống dung dịch. Không có con số này thì app
  // không nói được câu duy nhất mà người đứng cạnh bàn pha thực sự thao tác — "rút 5 mL thuốc +
  // 45 mL dung môi" — và cũng không chặn được kiểu nhập vô lý như 4 ống pha vừa đủ 2 mL.
  // Quy cách ống khác nhau giữa các hãng/nước nên đây chỉ là giá trị mặc định, người dùng sửa được.
  vialVolumeMl?: number
  // Lọ bột: thể tích dung môi hoàn nguyên MỘT lọ.
  reconstituteMl?: number
  // Lọ bột: thể tích bột chiếm chỗ sau khi tan (mL/lọ, thường in trên tờ hướng dẫn). Bỏ qua con số
  // này là sai hệ thống — vancomycin 1 g chiếm ~0,7 mL, hoàn nguyên 10 mL thì nồng độ đã lệch 7%.
  displacementMl?: number
  // Dung môi được phép. Thiếu thông tin này thì bảng pha vô dụng với các thuốc kén dung môi
  // (amiodarone pha NaCl 0,9% là tủa).
  diluents?: string[]
  // Dung môi KHÔNG được dùng. Hiện ra thành chip đỏ bấm được: bấm vào mới hiện `diluentWarning`.
  // Trước đây cảnh báo này hiện thường trực bất kể người dùng chọn gì, nên chọn đúng dung môi vẫn
  // thấy một khối đỏ — kiểu cảnh báo dạy người ta bỏ qua màu đỏ.
  avoidDiluents?: string[]
  diluentWarning?: string
  // Ngưỡng trên của nồng độ pha (giới hạn độ tan hoặc khuyến cáo của nhà sản xuất) — vượt là chặn.
  maxConc?: number
  // Hạn dùng sau pha, bảo quản, tránh ánh sáng, loại chai/dây truyền. KHÔNG còn hiện trong bảng pha
  // (màn đó phải gọn để dùng lúc cấp cứu) — giữ lại trong dữ liệu để tra khi cần.
  stability?: string
  // Ngưỡng nồng độ cho đường truyền ngoại biên. KHÔNG còn hiện trong giao diện — giữ lại dữ liệu.
  maxPeripheralConc?: number
  peripheralNote?: string
}

// Liều nạp / bolus — amiodarone, magie, lidocaine, esmolol... đều phải nạp trước rồi mới duy trì,
// nhưng trước đây liều nạp chỉ nằm trong câu chữ `preparation` và không được tính giúp.
// - perKg: liều theo cân nặng (low–high). `fixed`: liều cố định không theo cân nặng.
// - maxSingle: ngưỡng trên một lần dùng (vd esmolol), tính bằng `unit`.
export interface BolusDose {
  label: string
  unit: string
  perKgLow?: number
  perKgHigh?: number
  fixedLow?: number
  fixedHigh?: number
  maxSingle?: number
  // Thời gian tiêm/truyền liều nạp — thứ hay bị bỏ sót và là nguyên nhân tụt huyết áp khi nạp nhanh.
  over?: string
  note?: string
}

// Liều riêng theo TỪNG bệnh lý cho thuốc truyền — cùng ý tưởng với IndicationDose của kháng sinh
// (một hoạt chất, nhiều bệnh cảnh, mỗi bệnh cảnh một liều/mục tiêu khác nhau — vd Adrenaline trong
// ngừng tim là bolus 1 mg mỗi 3–5 phút, trong phản vệ là bolus tiêm bắp, còn trong sốc nhiễm khuẩn
// là truyền liên tục chỉnh theo đáp ứng). Khác IndicationDose ở chỗ thuốc truyền không có "tiers"
// theo CrCl mà có `calc`/`boluses` riêng — nên đè (override) từng phần lên dữ liệu gốc của thuốc,
// phần nào không khai báo thì giữ nguyên dữ liệu gốc. `diseaseId` khớp DiseaseEntry.id như trên.
// `extends SourceInfo`: cùng lý do với IndicationDose bên trên — liều theo bệnh lý cụ thể (vd
// Adrenaline ngừng tim/phản vệ/sốc nhiễm khuẩn) thường lấy từ nguồn khác hẳn liều chung của thuốc.
// Để trống thì rơi về `source`/`reviewedOn` của thuốc.
export interface InfusionIndicationDose extends SourceInfo {
  diseaseId: string
  doseRange?: string
  note?: string
  calc?: InfusionCalcConfig
  boluses?: BolusDose[]
}

// Thuốc truyền tĩnh mạch cần pha/chỉnh liều theo cân nặng (thuốc co bóp cơ tim, thuốc vận mạch).
// Cấu trúc tách riêng khỏi Antibiotic vì không chỉnh theo CrCl mà chỉnh theo đáp ứng lâm sàng (titrate).
// `isCustom`: true nếu đây là bản ghi người dùng tự nhập.
export interface InfusionDrug extends SourceInfo {
  id: string
  name: string
  route: string
  preparation: string
  doseRange: string
  note?: string
  warnings?: AntibioticWarning[]
  calc?: InfusionCalcConfig
  isCustom?: boolean
  boluses?: BolusDose[]
  compatKey?: string
  // Cân nặng dùng khi tính liều theo kg — giống Antibiotic.doseWeightBasis.
  doseWeightBasis?: WeightBasis
  // Bệnh lý áp dụng — có thì AddInfusionScreen/InfusionCategoryScreen hiện bước "Chỉ định" giống
  // hệt kháng sinh; không khai báo thì thuốc dùng chung một liều/preparation như trước nay.
  indications?: InfusionIndicationDose[]
}

// Một ảnh trong bài học ECG (bản ghi ECG chụp/scan, ảnh minh hoạ...). `dataUrl` là ảnh đã được
// thu nhỏ và nén (xem src/lib/imageResize.ts) trước khi lưu, để không chiếm quá nhiều dung lượng.
export interface EcgImage {
  id: string
  dataUrl: string
  caption?: string
}

// Bài học ECG do người dùng tự nhập — tiêu đề, tóm tắt, nội dung chi tiết, kèm một hoặc nhiều ảnh.
// Lưu riêng bằng IndexedDB (không phải localStorage như các mục tự nhập khác) vì ảnh có thể khá
// nặng — xem src/lib/ecgStorage.ts. `isCustom` luôn true vì hiện chưa có bài học dựng sẵn.
// Một node (nhánh ý tưởng) trong Sơ đồ tư duy — toạ độ x/y là vị trí trên canvas (đã tính theo pan/zoom gốc).
// `style`: cách vẽ thẻ ghi chú — "solid" nền đặc chữ trắng (mặc định, cũng là kiểu duy nhất của bản
// trước nên dữ liệu cũ không cần sửa), "soft" nền nhạt chữ đậm màu, "outline" viền màu nền trắng.
// `size`: cỡ chữ — "md" là mặc định; "lg" dùng cho chủ đề trung tâm, "sm" cho ghi chú phụ.
// `link`: bài trong app mà thẻ này trỏ tới, mã hoá "<loại>:<id>" — "article:mi" (bài dựng sẵn),
// "custom:<id>" (bài tự nhập), "ecg:<id>" (bài học ECG); cùng cách mã hoá với liên kết trong bài
// viết (xem linkTargets/openLinkTarget trong App.tsx). CHỈ lưu id, không lưu tiêu đề: tiêu đề luôn
// tra lại từ dữ liệu thật nên bài đổi tên thì thẻ đổi theo, bài bị xoá thì thẻ nói rõ là đã xoá.
// `collapsed`: thẻ đang GẤP nhánh con — mọi thẻ nằm dưới nó (và đường nối tới chúng) tạm ẩn khỏi
// bảng, chỗ đó chỉ còn một dấu tròn ghi số thẻ đang ẩn. Bảng càng lớn thì đây càng là cách duy nhất
// để tập trung vào một nhánh mà không phải xoá hay kéo các nhánh khác đi chỗ khác. Chỉ ẩn khi HIỂN
// THỊ — dữ liệu thẻ con vẫn nguyên vẹn, mở ra là thấy lại đúng như cũ.
export interface MindNode {
  id: string
  x: number
  y: number
  text: string
  color: string
  style?: MindNodeStyle
  size?: MindNodeSize
  link?: string
  collapsed?: boolean
}

// "plain" = chữ trần trên mặt giấy (không khung, không nền) — dùng cho mục "Chữ", để viết tiêu đề
// rồi tự vẽ trang trí quanh nó.
export type MindNodeStyle = "solid" | "soft" | "outline" | "plain"
export type MindNodeSize = "sm" | "md" | "lg"

// Một liên kết giữa 2 node trong Sơ đồ tư duy.
export interface MindEdge {
  from: string
  to: string
  // Nhãn quan hệ, vd. "gây ra", "chống chỉ định", "chẩn đoán phân biệt". Để trống nếu đường nối
  // không cần giải thích thêm — phần lớn đường nối trong một nhánh đơn giản là "thuộc về" nên không
  // cần nhãn, ép mọi đường nối phải có chữ sẽ làm rối bảng chứ không thêm nghĩa.
  label?: string
  // "relationship" (mặc định khi bỏ trống — GIỮ NGUYÊN hành vi cũ cho dữ liệu đã lưu trước khi có
  // trường này): quan hệ kiến thức, nét đứt, ăn màu theo thẻ con như trước giờ. "algorithm": một
  // bước trong thuật toán/phác đồ — nét liền, đậm hơn, màu cố định (không ăn theo màu thẻ) để cả
  // chuỗi bước đọc thành MỘT luồng rõ ràng xuyên suốt bảng dù các thẻ khác màu nhau.
  kind?: "relationship" | "algorithm"
}

// Một nét vẽ tay trên bảng Sơ đồ tư duy.
// `points`: toạ độ nối tiếp nhau dạng phẳng [x1,y1,x2,y2,...] — phẳng thay vì mảng object {x,y} để
// file lưu/sao lưu nhỏ hơn đáng kể (một nét dài có thể tới vài trăm điểm).
// `tool`: "pen" nét mực đục, "highlighter" nét bút dạ (dày và trong suốt, vẽ chìm dưới chữ).
// `straight`: nét là HÌNH VẼ (đường thẳng, mũi tên, khung, vòng tròn) — nối các điểm bằng đoạn thẳng
// thay vì làm mượt bằng đường cong, để góc khung vuông và mũi tên nhọn đúng như lúc vẽ. Nét viết tay
// thường không có trường này.
// `widths`: bề dày tại TỪNG điểm của nét (một số cho mỗi điểm trong `points`). Có trường này thì nét
// được vẽ dưới dạng vùng tô có viền dày mỏng thay đổi — nét bút thật đầu nhẹ, giữa đậm, nhấc tay thì
// mảnh dần; bút cảm ứng (Apple Pencil) lấy theo lực nhấn, ngón tay/chuột lấy theo tốc độ di chuyển.
// Không có trường này (nét vẽ cũ, bút dạ, hình vẽ) thì vẫn vẽ bằng đường kẻ đều dày `width`.
// Cây bút đã vẽ ra nét này. Không chỉ để hiện icon: mỗi loại có độ mờ, kiểu đầu nét và thứ tự lớp
// riêng (xem strokeAlpha/strokeCap trong lib/mindmapStyle.ts), nên nét phải NHỚ mình được vẽ bằng gì
// thì mở lại bảng mới ra đúng thứ đã vẽ.
//   pen         — bút máy: bề dày thay đổi theo lực nhấn/tốc độ.
//   pencil      — bút chì: nét đều, hơi mờ như than chì trên giấy.
//   highlighter — bút dạ: vệt mờ vẽ chìm dưới nét mực.
//   tape        — băng dính: một dải thẳng, đầu cắt vuông, dán đè lên nội dung.
export type MindStrokeTool = "pen" | "pencil" | "highlighter" | "tape"

// Kiểu nét: liền (mặc định, không lưu gì), đứt đoạn, hoặc chấm. Áp cho MỌI cây bút và cả hình vẽ —
// một khung chữ nhật nét đứt hay một mũi tên chấm chấm là cách quen thuộc nhất để nói "cái này là
// phụ / là giả định / là đường liên hệ", mà nét liền không nói được.
export type MindDash = "dash" | "dot"

// Hoạ tiết CHỈ CÓ Ở băng dính — trước đây băng dính chỉ là một dải màu đặc mờ, không có gì phân
// biệt nó với một vệt bút dạ đậm hơn. "weave" (mặc định, không lưu gì — nét cũ từ trước khi có
// trường này tự nhận đúng hoạ tiết mới) là vân dệt chéo mảnh, giống mặt băng dính giấy thật ở MỌI
// màu; "stripe"/"dot" là hai hoạ tiết washi tape rõ rệt hơn để chọn khi muốn nổi bật.
export type TapePattern = "stripe" | "dot"

export interface MindStroke {
  id: string
  points: number[]
  color: string
  width: number
  tool: MindStrokeTool
  straight?: boolean
  widths?: number[]
  dash?: MindDash
  pattern?: TapePattern
}

// Một ảnh dán trên bảng Sơ đồ tư duy (ảnh chụp X-quang, ECG, sơ đồ trong sách...).
// `dataUrl` là ảnh đã thu nhỏ + nén bằng canvas (xem lib/imageResize.ts) như ảnh trong bài viết.
// w/h là kích thước hiển thị TRÊN BẢNG (người dùng kéo góc để đổi), luôn giữ đúng tỉ lệ ảnh gốc.
export interface MindImage {
  id: string
  x: number
  y: number
  w: number
  h: number
  dataUrl: string
}

// Toàn bộ dữ liệu của Sơ đồ tư duy — một bảng duy nhất cho cả app (không phải danh sách nhiều bảng),
// nên khác cấu trúc "collection" (mảng có id) dùng cho bài viết/kháng sinh/thuốc truyền/ECG.
// Lưu bằng IndexedDB (xem lib/mindmapStorage.ts): từ khi có nét vẽ tay, dữ liệu bảng có thể lớn hơn
// nhiều so với hạn mức localStorage.
// `strokes` và `images` không bắt buộc để dữ liệu/file sao lưu cũ (chỉ có node và cạnh nối) vẫn đọc được.
export interface MindmapData {
  nodes: MindNode[]
  edges: MindEdge[]
  strokes?: MindStroke[]
  images?: MindImage[]
}

// Metadata của MỘT bảng trong danh sách nhiều bảng Sơ đồ tư duy (vd. "Tim mạch", "Thận", "ECG").
// Chỉ chứa tên/màu/chuyên khoa gắn thẻ — KHÔNG chứa node/cạnh/nét vẽ/ảnh, để danh sách bảng (màn
// chọn bảng) luôn nhẹ. Dữ liệu thật của từng bảng tra riêng theo `id` — xem lib/mindmapStorage.ts.
// `specialtyId` khớp id trong SPECIALTIES (data/specialties.ts) nếu người dùng gắn bảng theo chuyên
// khoa có sẵn — dùng để tô màu/icon nhất quán với phần còn lại của app; để trống nếu bảng không thuộc
// đúng một chuyên khoa nào (vd. bảng gộp nhiều khoa).
export interface MindBoard {
  id: string
  name: string
  color: string
  specialtyId?: string
  order: number
  createdAt: number
  updatedAt: number
  // Thời điểm bị dời vào thùng rác. Có giá trị = đang nằm trong thùng rác, KHÔNG hiện ở danh sách
  // bảng nhưng dữ liệu vẫn còn nguyên và khôi phục lại được.
  //
  // Vì sao không xoá thẳng: một bảng sơ đồ là hàng giờ vẽ tay, mà nút xoá lại nằm ngay cạnh nút sửa
  // tên. Bấm nhầm một cái là mất sạch và không có cách nào lấy lại — dữ liệu chỉ nằm trên máy này,
  // không có bản trên máy chủ để khôi phục.
  deletedAt?: number
}

export interface EcgLesson {
  id: string
  title: string
  tags: string[]
  summary?: string
  // `content` + `images`: cấu trúc ĐỜI CŨ (toàn bộ ảnh gom một chỗ, văn bản một chỗ). Giữ lại để
  // các bài đã lưu trước đây vẫn đọc được — ecgBlocks() trong lib/blocks.ts tự chuyển sang block.
  // Bài mới lưu vào `blocks` (chữ và ảnh xen kẽ tự do).
  content?: string
  images?: EcgImage[]
  blocks?: ContentBlock[]
  createdAt: string
  isCustom?: boolean
}
