// ─── Kiểu dữ liệu dùng chung cho toàn bộ nội dung tham khảo (bài viết, thẻ ghi nhớ, kháng sinh,
// bệnh lý, thuốc truyền tĩnh mạch). Tách riêng khỏi App.tsx để các file data/*.ts import vào và
// để App.tsx dùng lại khi cần khai báo props cho component.

import type { WeightBasis } from "../lib/bodyWeight"
import type { VialForm } from "../lib/mixing"

// Lưu ý: KHÔNG có field đếm số mục ở đây — số mục/thẻ ghi nhớ của một chuyên khoa phải luôn
// được tính động từ dữ liệu thật (kể cả mục tự thêm) tại nơi hiển thị, để không bao giờ lệch.
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
  severity: "cao" | "trung bình" | "thấp"
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
  // Thể tích pha loãng MẶC ĐỊNH mà công thức chuẩn khuyến cáo (mL) — con số "x" trong "pha vừa đủ
  // x mL" trước khi tính RÚT một phần (nếu cần), vd Amikacin 500 mg pha vừa đủ 200 mL. Chỉ có ý
  // nghĩa với "powder"/"solution" (còn phải tự pha loãng); "fixed" đã có thể tích cố định riêng qua
  // vialVolumeMl nên không dùng trường này. Bỏ trống = giữ mốc 100 mL/lọ như trước nay.
  defaultVolumeMl?: number
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

// `rrt`: liều khi bệnh nhân đang lọc máu/CRRT. `compatKey`: khoá tra bảng tương hợp qua Khóa chữ Y
// và tương tác thuốc (xem data/compatibility.ts) — cùng một khoá dùng chung cho kháng sinh và thuốc
// truyền, để bảng "Đang truyền" kiểm tra được cả hai nhóm với nhau. `mix`: công thức pha/hoàn
// nguyên — chỉ có ý nghĩa với đường tiêm/truyền, bỏ trống với thuốc uống.
export interface Antibiotic extends SourceInfo {
  id: string
  name: string
  route: string
  standardDose?: string
  preparation?: string
  note?: string
  tiers?: DoseTier[]
  warnings?: AntibioticWarning[]
  indications?: IndicationDose[]
  isCustom?: boolean
  doseWeightBasis?: WeightBasis
  rrt?: RrtDose
  compatKey?: string
  mix?: AntibioticMix []
  // Liều nạp — vd Vancomycin cần liều nạp 25–30 mg/kg trước khi vào liều duy trì theo CrCl.
  // Cùng kiểu BolusDose với InfusionDrug.boluses (xem bên dưới), dùng chung component hiển thị/sửa.
  boluses?: BolusDose[]
  // Ngưỡng liều MỘT LẦN DÙNG. Xem ghi chú của DoseCap ngay bên dưới.
  maxSingleDose?: DoseCap
}

// ─── Ngưỡng liều một lần dùng ───────────────────────────────────────────────────
// Vì sao phải có: liều kháng sinh trong app viết dạng chuỗi "15–20 mg/kg mỗi 8–12h", và app nhân
// thẳng con số đó với cân nặng (xem lib/perKgDose.ts). Phép nhân đó KHÔNG có điểm dừng — bệnh nhân
// 140 kg cho ra "liều nạp Vancomycin 3.500 mg" trông hoàn toàn hợp lý trong khi mọi khuyến cáo đều
// chặn ở 2–3 g. Bên thuốc truyền đã có doseAbsMax canh việc này rất kỹ; bên kháng sinh — nhóm dùng
// nhiều hơn hẳn — thì trước đây không có lớp canh nào.
//
// `amount` tính theo `unit` (cùng họ đơn vị với liều: mg/g/mcg/đơn vị). `note` nói RÕ ngưỡng này từ
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
