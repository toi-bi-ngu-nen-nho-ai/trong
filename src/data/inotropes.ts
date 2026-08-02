import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// `mix` là công thức pha ở dạng SỐ, luôn phải cho ra đúng `calc.concDefault` khi nhân lại
// (vd 250 mg × 1 ống ÷ 50 mL = 5 mg/mL) — nhờ vậy màn hình pha thuốc và ô nồng độ điền sẵn không
// bao giờ nói hai chuyện khác nhau.
//
// `vialVolumeMl` là quy cách hay gặp, KHÔNG phải hằng số: cùng một hàm lượng có nhiều quy cách ống
// khác nhau giữa các hãng. Vì vậy đây chỉ là giá trị điền sẵn, người dùng sửa được ngay trong bảng
// pha, và giao diện luôn nhắc đối chiếu ống thực tế.
//
// `maxPeripheralConc`: ngưỡng nồng độ còn truyền được qua đường ngoại biên. Nguồn tham chiếu cho các
// ngưỡng dưới đây là hướng dẫn chọn đường truyền theo nồng độ chuẩn (Central and Peripheral Venous
// Line Medication Use, CHoR/VCU Health, cập nhật 3/2025) — hướng dẫn này của NHI KHOA, dùng ở đây
// như mốc tham chiếu về mặt nồng độ; quy định của cơ sở mới là thứ quyết định.
//
// `stability`: catecholamin (adrenaline, noradrenaline, dopamine, dobutamine) đều ổn định khoảng 24
// giờ sau pha nếu để dưới 25°C và tránh ánh sáng; điểm chung quan trọng nhất là dung dịch ĐỔI MÀU
// (hồng, nâu) hoặc có kết tủa thì phải bỏ, vì đó là dấu hiệu thuốc đã bị oxy hoá. Dòng này cũng
// được in ra nhãn bơm tiêm cho điều dưỡng ca sau.
const CATECHOLAMINE_STABILITY =
  "Dùng trong 24 giờ sau pha, để dưới 25°C và tránh ánh sáng. Bỏ ngay nếu dung dịch đổi màu (hồng, nâu) hoặc có kết tủa — dấu hiệu thuốc đã bị oxy hoá."
export const INOTROPES: InfusionDrug[] = [
  {
    id: "dobutamine",
    name: "Dobutamine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 250 mg (1 ống) với Natri Clorid 0,9% hoặc Glucose 5% vừa đủ 50 mL (nồng độ 5.000 mcg/mL) — truyền qua BTĐ, chỉnh tốc độ theo cân nặng.",
    doseRange: "Khởi đầu 2–5 mcg/kg/phút, chỉnh liều theo đáp ứng, tối đa thường dùng 20 mcg/kg/phút.",
    note: "Ưu tiên đường truyền tĩnh mạch trung tâm nếu dùng kéo dài; tác dụng β1 tăng co bóp cơ tim, giãn mạch nhẹ.",
    warnings: [{ text: "Có thể gây nhịp nhanh, loạn nhịp — theo dõi ECG và huyết áp liên tục.", severity: "trung bình" }],
    compatKey: COMPAT_KEYS.dobutamine,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 2,
      doseMax: 20,
      // Trần nhãn thuốc 40 mcg/kg/phút; trên mức này nhịp nhanh/loạn nhịp lấn át tác dụng tăng co bóp.
      doseAbsMax: 40,
      concUnit: "mg/mL",
      concDefault: 5,
      unitScale: 1000,
      mix: {
        vialAmount: 250,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 5,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxPeripheralConc: 2,
        // Riêng dobutamine hay ngả hồng nhạt do oxy hoá nhẹ — nói rõ để điều dưỡng không bỏ oan
        // một bơm còn dùng được, nhưng vẫn giữ ngưỡng bỏ ở màu nâu/kết tủa.
        stability:
          "Dùng trong 24 giờ sau pha, để dưới 25°C và tránh ánh sáng. Dung dịch ngả HỒNG NHẠT là oxy hoá nhẹ, chưa đồng nghĩa mất hoạt lực; ngả NÂU hoặc có kết tủa thì phải bỏ.",
        peripheralNote: "Nồng độ chuẩn dùng cho đường ngoại biên là 2 mg/mL; đặc hơn (kể cả công thức 250 mg/50 mL của app) thuộc nhóm ưu tiên tĩnh mạch trung tâm. Cân nhắc đường trung tâm nếu liều > 15 mcg/kg/phút kéo dài.",
      },
    },
  },
  {
    id: "dopamine",
    name: "Dopamine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 200 mg (1 ống) với Natri Clorid 0,9% hoặc Glucose 5% vừa đủ 50 mL (nồng độ 4.000 mcg/mL) — truyền qua BTĐ, ưu tiên tĩnh mạch trung tâm.",
    doseRange: "5–10 mcg/kg/phút (tác dụng β1 — tăng co bóp); > 10 mcg/kg/phút thiên về tác dụng α (co mạch).",
    note: "Liều thấp < 3 mcg/kg/phút (tác dụng dopaminergic trên thận) hiện không còn được khuyến cáo thường quy.",
    warnings: [{ text: "Thoát mạch có thể gây hoại tử mô — cần đường truyền chắc chắn, theo dõi vị trí truyền.", severity: "cao" }],
    compatKey: COMPAT_KEYS.dopamine,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 5,
      doseMax: 20,
      // Trần kinh điển 50 mcg/kg/phút — trên mức này gần như chỉ còn tác dụng co mạch và độc tính.
      doseAbsMax: 50,
      concUnit: "mg/mL",
      concDefault: 4,
      unitScale: 1000,
      mix: {
        vialAmount: 200,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 5,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxPeripheralConc: 1.6,
        stability: CATECHOLAMINE_STABILITY,
        peripheralNote: "Thuốc gây hoại tử khi thoát mạch. Nồng độ chuẩn cho ngoại biên là 1.600 mcg/mL (1,6 mg/mL); công thức 200 mg/50 mL của app đặc gấp 2,5 lần ngưỡng đó nên thuộc nhóm ưu tiên tĩnh mạch trung tâm.",
      },
    },
  },
  {
    id: "adrenaline-inotrope",
    name: "Adrenaline (Epinephrine) — liều co bóp",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 1 mg (1 ống) với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 20 mcg/mL) — truyền qua BTĐ đường tĩnh mạch trung tâm.",
    doseRange: "Khởi đầu 0,01–0,05 mcg/kg/phút, chỉnh liều theo đáp ứng.",
    warnings: [{ text: "Nguy cơ loạn nhịp, tăng lactat máu — theo dõi ECG, không dừng đột ngột.", severity: "cao" }],
    compatKey: COMPAT_KEYS.adrenaline,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.01,
      doseMax: 0.05,
      // Sốc kháng trị/ngừng tuần hoàn có thể dùng tới ~2 mcg/kg/phút; trên mức đó gần như luôn là nhầm đơn vị.
      doseAbsMax: 2,
      concUnit: "mg/mL",
      concDefault: 0.02,
      unitScale: 1000,
      mix: {
        vialAmount: 1,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 1,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxPeripheralConc: 0.02,
        stability: CATECHOLAMINE_STABILITY,
        peripheralNote: "Thuốc co mạch gây hoại tử khi thoát mạch. 20 mcg/mL (0,02 mg/mL) là nồng độ chuẩn thấp nhất — đúng bằng công thức 1 mg/50 mL của app; pha đặc hơn thì bắt buộc tĩnh mạch trung tâm. Cân nhắc đường trung tâm nếu liều ≥ 0,2 mcg/kg/phút kéo dài.",
      },
    },
  },
  {
    id: "milrinone",
    name: "Milrinone",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha theo nồng độ chuẩn của khoa (thường 10 mg — 1 ống — vừa đủ 50 mL, nồng độ 200 mcg/mL) — truyền qua BTĐ. Liều nạp thường được bỏ qua tại ICU do nguy cơ tụt huyết áp.",
    doseRange: "Duy trì 0,375–0,75 mcg/kg/phút.",
    note: "Thải trừ chủ yếu qua thận — cần giảm liều ở bệnh nhân suy thận.",
    warnings: [{ text: "Nguy cơ tụt huyết áp và loạn nhịp thất, đặc biệt nếu dùng liều nạp.", severity: "cao" }],
    compatKey: COMPAT_KEYS.milrinone,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.375,
      doseMax: 0.75,
      // Trần nhãn thuốc là 0,75 mcg/kg/phút; để 1 làm mốc chặn vì milrinone thải qua thận, tích luỹ nhanh khi suy thận.
      doseAbsMax: 1,
      concUnit: "mg/mL",
      concDefault: 0.2,
      unitScale: 1000,
      mix: {
        vialAmount: 10,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 10,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
      },
    },
  },
]
