import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// Xem ghi chú đầu file inotropes.ts về ý nghĩa của mix/vialVolumeMl/maxPeripheralConc/stability.
// Catecholamin ổn định khoảng 24 giờ sau pha; dấu hiệu phải bỏ là dung dịch đổi màu hoặc kết tủa.
const CATECHOLAMINE_STABILITY =
  "Dùng trong 24 giờ sau pha, để dưới 25°C và tránh ánh sáng. Bỏ ngay nếu dung dịch đổi màu (hồng, nâu) hoặc có kết tủa — dấu hiệu thuốc đã bị oxy hoá."

export const VASOACTIVES: InfusionDrug[] = [
  {
    id: "noradrenaline",
    name: "Noradrenaline (Norepinephrine)",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ) — ưu tiên tĩnh mạch trung tâm",
    preparation: "Pha 4 mg (1 ống) với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 80 mcg/mL) — truyền qua BTĐ, chỉnh theo nồng độ pha thực tế của khoa.",
    doseRange: "Khởi đầu 0,01–0,1 mcg/kg/phút, chỉnh liều theo huyết áp mục tiêu, có thể tăng đến 1–3 mcg/kg/phút ở sốc kháng trị.",
    note: "Thuốc vận mạch đầu tay trong sốc nhiễm khuẩn. Công thức pha khác nhau giữa các khoa (4 mg/50 mL, 8 mg/50 mL, 4 mg/100 mL...).",
    warnings: [{ text: "Thoát mạch có thể gây hoại tử mô nặng — cần đường truyền tĩnh mạch trung tâm nếu dùng liều cao/kéo dài.", severity: "cao" }],
    compatKey: COMPAT_KEYS.noradrenaline,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.01,
      doseMax: 1,
      // Sốc kháng trị chạy tới 1-3 mcg/kg/phút là có thật (xem doseRange) — chỉ chặn khi vượt 3.
      doseAbsMax: 3,
      concUnit: "mg/mL",
      concDefault: 0.08,
      unitScale: 1000,
      mix: {
        vialAmount: 4,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 4,
        diluents: ["Glucose 5%", "NaCl 0,9%"],
        // Chưa có chuẩn thống nhất cho truyền vận mạch ngoại biên. Ngưỡng hay được nhắc trong y văn
        // là ≤ 16 mcg/mL (4 mg pha 250 mL) = 0,016 mg/mL. Công thức 4 mg/50 mL của app (0,08 mg/mL)
        // gấp 5 lần ngưỡng đó — tức là công thức dành cho tĩnh mạch TRUNG TÂM.
        maxPeripheralConc: 0.016,
        stability: CATECHOLAMINE_STABILITY,
        peripheralNote:
          "Thuốc co mạch gây hoại tử khi thoát mạch. Y văn về truyền ngoại biên tạm thời dùng nồng độ loãng ≤ 16 mcg/mL (0,016 mg/mL — tương đương 4 mg pha 250 mL), catheter 18–20G ở vị trí gần thân, kiểm tra vị trí truyền mỗi 2 giờ; đa số biến chứng thoát mạch xảy ra sau 24 giờ. Chưa có chuẩn thống nhất — đối chiếu quy định của khoa.",
      },
    },
  },
  {
    id: "vasopressin",
    name: "Vasopressin",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha theo nồng độ chuẩn của khoa (ví dụ 20 UI pha vừa đủ 50 mL, nồng độ 0,4 UI/mL) — truyền qua BTĐ với tốc độ cố định, không chỉnh theo cân nặng.",
    doseRange: "Liều cố định 0,01–0,04 đơn vị/phút (thường 0,03 đơn vị/phút), không chỉnh theo cân nặng.",
    note: "Thường phối hợp thêm (add-on) với Noradrenaline khi chưa đạt huyết áp mục tiêu, không dùng như thuốc đơn độc ban đầu.",
    warnings: [{ text: "Nguy cơ thiếu máu cục bộ đầu chi/mạc treo ruột ở liều cao — tránh vượt quá liều khuyến cáo.", severity: "cao" }],
    compatKey: COMPAT_KEYS.vasopressin,
    calc: {
      weightBased: false,
      doseUnit: "đơn vị/phút",
      doseMin: 0.01,
      doseMax: 0.04,
      // Trên 0,04 đơn vị/phút không tăng thêm lợi ích mà tăng thiếu máu chi/mạc treo; 0,1 là mốc chặn.
      doseAbsMax: 0.1,
      concUnit: "đơn vị/mL",
      concDefault: 0.4,
      unitScale: 1,
      mix: {
        vialAmount: 20,
        vialUnit: "đơn vị",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 1,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        // Hướng dẫn chọn đường truyền xếp vasopressin cho sốc ở nồng độ > 0,04 đơn vị/mL vào nhóm
        // CHỈ dùng đường trung tâm — công thức 20 UI/50 mL của app (0,4 đơn vị/mL) gấp 10 lần mốc đó.
        maxPeripheralConc: 0.04,
        stability: "Dùng trong 24 giờ sau pha ở nhiệt độ phòng.",
        peripheralNote: "Nồng độ trên 0,04 đơn vị/mL thuộc nhóm chỉ dùng qua tĩnh mạch trung tâm; nguy cơ thiếu máu cục bộ đầu chi khi thoát mạch.",
      },
    },
  },
  {
    id: "phenylephrine",
    name: "Phenylephrine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha theo nồng độ chuẩn của khoa — truyền qua BTĐ, ưu tiên tĩnh mạch trung tâm nếu dùng kéo dài.",
    doseRange: "0,5–3 mcg/kg/phút (chỉnh theo huyết áp mục tiêu).",
    note: "Tác dụng α thuần — không có hiệu quả tăng co bóp cơ tim, có thể gây phản xạ chậm nhịp tim. App không điền sẵn nồng độ vì công thức pha tuỳ khoa: phải tự nhập theo chai/bơm thực tế.",
    warnings: [{ text: "Có thể làm giảm cung lượng tim do co mạch mạnh — thận trọng ở bệnh nhân rối loạn chức năng tâm thất.", severity: "trung bình" }],
    compatKey: COMPAT_KEYS.phenylephrine,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.5,
      doseMax: 3,
      // Một số phác đồ dùng tới 6 mcg/kg/phút; trên mức đó nên đổi thuốc chứ không tăng liều tiếp.
      doseAbsMax: 6,
      concUnit: "mg/mL",
      unitScale: 1000,
      // Cố tình KHÔNG có concDefault (công thức pha tuỳ khoa), nhưng vẫn khai `mix` để bảng pha có
      // số điền sẵn và để app kiểm tra được ngưỡng đường truyền ngoại biên.
      mix: {
        vialAmount: 10,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 100,
        vialVolumeMl: 1,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxPeripheralConc: 0.04,
        stability: CATECHOLAMINE_STABILITY,
        peripheralNote: "Nồng độ chuẩn thấp nhất cho đường ngoại biên là 40 mcg/mL (0,04 mg/mL). Công thức pha trong bảng chỉ là gợi ý — app không điền sẵn nồng độ cho thuốc này, phải nhập theo chai/bơm thực tế.",
      },
    },
  },
  {
    id: "adrenaline-vasoactive",
    name: "Adrenaline (Epinephrine) — liều vận mạch",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ) — ưu tiên tĩnh mạch trung tâm",
    preparation: "Pha 1 mg (1 ống) với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 20 mcg/mL) — truyền qua BTĐ.",
    doseRange: "Liều vận mạch/phối hợp thường 0,1–0,5 mcg/kg/phút, có thể cao hơn tuỳ đáp ứng.",
    warnings: [{ text: "Nguy cơ loạn nhịp, tăng lactat máu và co mạch tạng — theo dõi sát khi phối hợp với Noradrenaline.", severity: "cao" }],
    compatKey: COMPAT_KEYS.adrenaline,
    // Ba bệnh cảnh, ba cách dùng khác hẳn nhau — bước "Chỉ định" cho chọn đúng trước khi thấy liều.
    // "sepsis" dùng lại đúng id đã có trong DISEASES (Nhiễm khuẩn huyết / sốc nhiễm khuẩn) vì đây
    // cũng chính là bệnh cảnh mà Noradrenaline/các thuốc vận mạch khác đang gắn. Mỗi chỉ định tự
    // mang `boluses` riêng — chọn "Ngừng tim" chỉ thấy liều ngừng tim, không lẫn với liều phản vệ.
    indications: [
      { diseaseId: "sepsis", doseRange: "Phối hợp khi sốc kháng trị với Noradrenaline liều cao: khởi đầu 0,1–0,5 mcg/kg/phút, chỉnh theo đáp ứng." },
      {
        diseaseId: "cardiac-arrest",
        doseRange: "Không dùng đường truyền liên tục — dùng liều nạp/bolus bên dưới, lặp lại theo phác đồ ACLS.",
        boluses: [
          {
            label: "Ngừng tim (ACLS)",
            unit: "mg",
            fixedLow: 1,
            maxSingle: 1,
            over: "Tiêm tĩnh mạch/trong xương nhanh, tráng đường truyền bằng 20 mL NaCl 0,9% ngay sau đó — lặp lại mỗi 3–5 phút theo phác đồ ACLS.",
            note: "Nguồn: phác đồ ACLS/AHA (adrenaline 1 mg IV/IO mỗi 3–5 phút trong ngừng tim).",
          },
        ],
      },
      {
        diseaseId: "anaphylaxis",
        doseRange: "Ưu tiên tiêm bắp (xem Liều nạp/bolus bên dưới) — chỉ truyền tĩnh mạch liều thấp khi phản vệ kháng trị và có theo dõi huyết động liên tục.",
        note: "Không dùng liều truyền tĩnh mạch thay cho tiêm bắp ở tuyến chưa có theo dõi huyết động liên tục.",
        boluses: [
          {
            label: "Phản vệ (tiêm bắp)",
            unit: "mg",
            fixedLow: 0.3,
            fixedHigh: 0.5,
            over: "Tiêm bắp (KHÔNG tiêm tĩnh mạch trực tiếp) mặt trước-bên đùi, lặp lại mỗi 5–15 phút nếu chưa đáp ứng.",
            note: "Nguồn: hướng dẫn phản vệ WAO/AAAAI (adrenaline 0,3–0,5 mg IM, ống 1 mg/1 mL không pha loãng).",
          },
        ],
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.1,
      doseMax: 0.5,
      // Cùng mốc chặn với bản ghi liều co bóp của adrenaline.
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
        peripheralNote: "Thuốc co mạch gây hoại tử khi thoát mạch. 20 mcg/mL (0,02 mg/mL) là nồng độ chuẩn thấp nhất — đúng bằng công thức 1 mg/50 mL của app; pha đặc hơn thì bắt buộc tĩnh mạch trung tâm.",
      },
    },
  },
]
