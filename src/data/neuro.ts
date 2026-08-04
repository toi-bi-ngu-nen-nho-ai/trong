import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// ─── Thần kinh cấp cứu ────────────────────────────────────────────────────────
//
// Ba tình huống khác hẳn nhau nhưng đều nằm trong nhóm này: cắt cơn động kinh (phenytoin,
// levetiracetam) và hạ áp lực nội sọ (natri ưu trương, mannitol).
//
// Đặc điểm chung khiến chúng phải nằm chung một chỗ: PHẦN LỚN là liều nạp một lần tính theo cân
// nặng, không phải tốc độ truyền chỉnh dần — nên thẻ thuốc ở đây chủ yếu dùng khối "Liều nạp/bolus"
// chứ không phải máy tính mL/giờ. Thuốc nào không khai `calc` thì app tự ẩn máy tính tốc độ và vẫn
// ghim được vào bảng "Đang truyền" (xem InfusionDrugCard trong App.tsx).
//
// Phenytoin còn là lý do kỹ thuật: bảng Y-site đã có sẵn luật "phenytoin kết tủa với hầu hết mọi
// thứ" nhưng không thuốc nào mang khoá đó nên luật không bao giờ chạy.

export const NEURO_DRUGS: InfusionDrug[] = [
  {
    id: "phenytoin",
    name: "Phenytoin",
    route: "Truyền tĩnh mạch (TTM) — đường riêng",
    preparation:
      "Pha loãng CHỈ với Natri Clorid 0,9% (kết tủa trong Glucose), nồng độ không quá 10 mg/mL, dùng ngay sau pha và truyền qua bộ lọc nếu cơ sở có. Truyền một mình trên một đường riêng.",
    doseRange:
      "Liều nạp 15–20 mg/kg. TỐC ĐỘ tối đa 50 mg/phút (25 mg/phút ở người già hoặc có bệnh tim) — đây là giới hạn quan trọng hơn cả con số liều. Duy trì 100 mg mỗi 8 giờ, chỉnh theo nồng độ.",
    note:
      "Động học bão hoà (bậc 0): tăng liều một chút có thể làm nồng độ tăng vọt. Đo nồng độ và hiệu chỉnh theo albumin máu — bệnh nhân ICU thường giảm albumin nên nồng độ TOÀN PHẦN đo được thấp giả tạo trong khi nồng độ tự do (phần có tác dụng) đã đủ hoặc đã cao.",
    warnings: [
      {
        text:
          "Tụt huyết áp và loạn nhịp nếu truyền nhanh — bắt buộc theo dõi ECG và huyết áp liên tục trong suốt thời gian truyền liều nạp. Ngừng ngay nếu tụt huyết áp hoặc QRS giãn.",
        severity: "cao",
      },
      {
        text:
          "Hội chứng găng tay tím (purple glove) và hoại tử mô khi thoát mạch — dùng tĩnh mạch lớn, kiểm tra vị trí truyền thường xuyên, không dùng đường truyền nhỏ ở mu bàn tay.",
        severity: "cao",
      },
      { text: "Kết tủa với hầu hết dịch truyền và thuốc khác — truyền một mình, chỉ tráng dây bằng NaCl 0,9%.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.phenytoin,
    boluses: [
      {
        label: "Liều nạp cắt cơn động kinh",
        unit: "mg",
        perKgLow: 15,
        perKgHigh: 20,
        // 20 mg/kg × 90 kg = 1.800 mg. Trần liều nạp thực hành là 1.500 mg.
        maxSingle: 1500,
        over:
          "Truyền tĩnh mạch với tốc độ KHÔNG quá 50 mg/phút (25 mg/phút ở người già/bệnh tim) — liều 1.000 mg cần ít nhất 20 phút. Theo dõi ECG và huyết áp liên tục.",
        note: "Dùng cân nặng thực tế. Tráng dây bằng NaCl 0,9% trước và sau khi truyền.",
      },
    ],
  },
  {
    id: "levetiracetam",
    name: "Levetiracetam",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Pha loãng trong 100 mL Natri Clorid 0,9% hoặc Glucose 5%, truyền trong 15 phút.",
    doseRange: "Liều nạp 20–60 mg/kg (thường 60 mg/kg, tối đa 4.500 mg). Duy trì 500–1.500 mg mỗi 12 giờ.",
    note:
      "Thải trừ chủ yếu qua thận — giảm liều duy trì khi CrCl thấp và bổ sung liều sau mỗi buổi lọc máu. Ưu điểm so với phenytoin: rất ít tương tác thuốc, không cần đo nồng độ thường quy, không gây tụt huyết áp khi truyền.",
    warnings: [
      { text: "Kích động, thay đổi hành vi, hiếm gặp ý tưởng tự sát — theo dõi ở bệnh nhân có tiền sử tâm thần.", severity: "trung bình" },
      { text: "Giảm liều duy trì theo mức lọc cầu thận; bổ sung liều sau buổi lọc máu chu kỳ.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.levetiracetam,
    boluses: [
      {
        label: "Liều nạp trạng thái động kinh",
        unit: "mg",
        perKgLow: 40,
        perKgHigh: 60,
        maxSingle: 4500,
        over: "Truyền tĩnh mạch trong 15 phút (pha loãng trong 100 mL).",
        note: "Dùng cân nặng thực tế. Trần liều nạp 4.500 mg theo phác đồ trạng thái động kinh.",
      },
    ],
  },
  {
    id: "hypertonic-saline",
    name: "Natri Clorid ưu trương 3%",
    route: "Truyền tĩnh mạch (TTM) — ưu tiên tĩnh mạch trung tâm",
    preparation:
      "Dung dịch pha sẵn 3% (513 mmol Na/L). Bolus cấp cứu tăng áp lực nội sọ: 3 mL/kg (hoặc 250 mL) truyền trong 10–20 phút qua đường truyền chắc chắn.",
    doseRange:
      "Cấp cứu tụt não / tăng áp lực nội sọ: 3 mL/kg truyền trong 10–20 phút, lặp lại theo đáp ứng. Hạ natri máu có triệu chứng: 100–150 mL truyền trong 10–20 phút, lặp lại tối đa 3 lần cho tới khi hết co giật.",
    note:
      "Tốc độ NÂNG natri là thứ phải theo dõi, không phải thể tích đã truyền: không quá 8–10 mmol/L trong 24 giờ đầu ở hạ natri mạn — nâng nhanh hơn gây hội chứng huỷ myelin do thẩm thấu, một biến chứng không hồi phục. Ngoại lệ là giai đoạn cấp cứu co giật, khi mục tiêu là nâng nhanh 4–6 mmol/L rồi DỪNG.",
    warnings: [
      {
        text:
          "Hội chứng huỷ myelin do thẩm thấu nếu điều chỉnh natri quá nhanh ở hạ natri mạn — đo natri máu mỗi 2–4 giờ trong giai đoạn điều chỉnh, không truyền theo giờ mà không đo lại.",
        severity: "cao",
      },
      { text: "Gây hoại tử mô khi thoát mạch ở nồng độ ưu trương — ưu tiên tĩnh mạch trung tâm khi truyền liên tục.", severity: "cao" },
      { text: "Quá tải natri, toan chuyển hoá tăng clo khi dùng thể tích lớn.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.hypertonicSaline,
    boluses: [
      {
        label: "Cấp cứu tăng áp lực nội sọ",
        unit: "mL",
        perKgLow: 3,
        over: "Truyền trong 10–20 phút qua đường truyền chắc chắn (ưu tiên tĩnh mạch trung tâm).",
        note: "Đơn vị ở đây là mL dung dịch 3%, KHÔNG phải mg. Đo lại natri máu sau mỗi liều.",
      },
      {
        label: "Hạ natri máu có triệu chứng (co giật/hôn mê)",
        unit: "mL",
        fixedLow: 100,
        fixedHigh: 150,
        over: "Truyền trong 10–20 phút, lặp lại tối đa 3 lần cho tới khi cắt được triệu chứng.",
        note: "Mục tiêu giai đoạn cấp là nâng natri 4–6 mmol/L rồi DỪNG, không nâng tiếp theo quán tính.",
      },
    ],
  },
  {
    id: "mannitol",
    name: "Mannitol 20%",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Dung dịch pha sẵn 20% (200 mg/mL). Truyền qua bộ dây có màng lọc — mannitol có thể kết tinh khi nhiệt độ xuống thấp.",
    doseRange: "Tăng áp lực nội sọ: 0,25–1 g/kg truyền trong 15–30 phút, lặp lại mỗi 4–6 giờ theo đáp ứng và áp lực thẩm thấu máu.",
    note:
      "Trước mỗi liều lặp lại phải kiểm tra khoảng trống thẩm thấu (osmolar gap) hoặc áp lực thẩm thấu máu — ngưỡng dừng thường dùng là áp lực thẩm thấu > 320 mOsm/kg. Mannitol gây lợi niệu thẩm thấu mạnh nên phải bù dịch, nếu không sẽ tụt huyết áp và làm nặng thêm tổn thương não thứ phát.",
    warnings: [
      { text: "Tổn thương thận cấp khi dùng liều lặp lại nhiều lần hoặc ở bệnh nhân đã giảm thể tích — theo dõi creatinin và cân bằng dịch.", severity: "cao" },
      { text: "Giảm thể tích và tụt huyết áp do lợi niệu thẩm thấu — phải bù dịch song song.", severity: "cao" },
      { text: "Kiểm tra chai trước khi dùng: có tinh thể thì phải làm ấm cho tan hết, không truyền chai còn tinh thể.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.mannitol,
    boluses: [
      {
        label: "Cấp cứu tăng áp lực nội sọ",
        unit: "g",
        perKgLow: 0.25,
        perKgHigh: 1,
        over: "Truyền trong 15–30 phút qua bộ dây có màng lọc.",
        note: "Dung dịch 20% có 200 mg/mL — 1 g tương ứng 5 mL. Kiểm tra áp lực thẩm thấu máu trước mỗi liều lặp lại.",
      },
    ],
  },
]
