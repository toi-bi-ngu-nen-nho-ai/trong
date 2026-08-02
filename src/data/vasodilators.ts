import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

export const VASODILATORS: InfusionDrug[] = [
  {
    id: "nitroglycerin",
    name: "Nitroglycerin (TNG)",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 50 mg với Glucose 5% vừa đủ 250 mL (nồng độ 200 mcg/mL) — truyền qua BTĐ, dùng dây truyền không hấp phụ nitrat (non-PVC) nếu có.",
    doseRange: "Khởi đầu 5–10 mcg/phút, tăng dần mỗi 5–10 phút theo đáp ứng, tối đa thường dùng 200 mcg/phút.",
    note: "Chỉ định: phù phổi cấp, cơn đau thắt ngực/thiếu máu cơ tim, tăng huyết áp cấp cứu có kèm thiếu máu cơ tim.",
    warnings: [
      { text: "Chống chỉ định nếu đã dùng thuốc ức chế PDE5 (sildenafil...) trong 24–48h trước — nguy cơ tụt huyết áp nặng.", severity: "cao" },
      { text: "Có thể gây đau đầu, tụt huyết áp tư thế, nhịp nhanh phản xạ.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.nitroglycerin,
    calc: {
      weightBased: false,
      doseUnit: "mcg/phút",
      doseMin: 5,
      doseMax: 200,
      // Trên 400 mcg/phút hầu như không tăng thêm hiệu quả, chủ yếu là dung nạp nitrat.
      doseAbsMax: 400,
      concUnit: "mg/mL",
      concDefault: 0.2,
      unitScale: 1000,
      mix: {
        vialAmount: 50,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 250,
        vialVolumeMl: 10,
        diluents: ["Glucose 5%", "NaCl 0,9%"],
        stability: "Dùng dây truyền và chai không hấp phụ nitrat (non-PVC, thuỷ tinh hoặc polyolefin) nếu có — nitroglycerin bám vào PVC làm liều thực nhận thấp hơn liều đặt.",
      },
    },
  },
  {
    id: "nitroprusside",
    name: "Nitroprusside (Na Nitroprusside)",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ) — tránh ánh sáng",
    preparation: "Pha 50 mg với Glucose 5% vừa đủ 250 mL (nồng độ 200 mcg/mL) — bọc kín tránh ánh sáng trực tiếp, truyền qua BTĐ đường tĩnh mạch trung tâm nếu có thể.",
    doseRange: "Khởi đầu 0,3 mcg/kg/phút, chỉnh theo huyết áp, tối đa thường dùng 10 mcg/kg/phút (hạn chế thời gian dùng liều cao/kéo dài).",
    note: "Chỉ định: cơn tăng huyết áp cấp cứu, giảm hậu tải trong suy tim cấp.",
    warnings: [
      { text: "Nguy cơ ngộ độc cyanide/thiocyanat khi dùng liều cao hoặc kéo dài, đặc biệt ở bệnh nhân suy gan/suy thận.", severity: "cao" },
      { text: "Có thể gây tụt huyết áp nhanh — cần theo dõi huyết áp liên tục (catheter động mạch nếu có).", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.nitroprusside,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 0.3,
      doseMax: 10,
      // NGƯỠNG TRÊN CỨNG: trên 10 mcg/kg/phút nguy cơ ngộ độc cyanide tăng nhanh — không có vùng "cao nhưng chấp nhận được".
      doseAbsMax: 10,
      concUnit: "mg/mL",
      concDefault: 0.2,
      unitScale: 1000,
      mix: {
        vialAmount: 50,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 250,
        // Lọ BỘT: hoàn nguyên bằng 2–3 mL dung môi rồi mới pha loãng tiếp. Phần bột 50 mg chiếm chỗ
        // không đáng kể so với 2 mL dung môi nên để 0 — vẫn khai báo để bảng pha đi đúng đường tính
        // của lọ bột thay vì coi đây là ống dung dịch pha sẵn.
        vialForm: "powder",
        reconstituteMl: 2,
        displacementMl: 0,
        diluents: ["Glucose 5%"],
        avoidDiluents: ["NaCl 0,9%"],
        diluentWarning: "Chỉ pha loãng bằng Glucose 5%.",
        stability: "Bọc kín tránh ánh sáng ngay sau khi pha (giấy bạc/bao tối màu). Dung dịch đổi màu xanh, nâu hoặc đỏ sẫm là phải bỏ, không truyền tiếp. Thay bơm mỗi 24 giờ.",
      },
    },
  },
  {
    id: "nicardipine",
    name: "Nicardipine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha theo nồng độ chuẩn của khoa (thường 10 mg — 1 ống — vừa đủ 100 mL, nồng độ 0,1 mg/mL; hoặc dùng lọ pha sẵn) — truyền qua BTĐ.",
    doseRange: "Khởi đầu 5 mg/giờ, tăng mỗi 5–15 phút thêm 2,5 mg/giờ theo đáp ứng, tối đa thường dùng 15 mg/giờ.",
    note: "Chỉ định: cơn tăng huyết áp cấp cứu, đặc biệt kèm bệnh lý thần kinh (đột quỵ, xuất huyết não) do ít ảnh hưởng áp lực nội sọ.",
    warnings: [{ text: "Có thể gây nhịp nhanh phản xạ và đau đầu — thận trọng ở bệnh nhân thiếu máu cơ tim.", severity: "trung bình" }],
    compatKey: COMPAT_KEYS.nicardipine,
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 5,
      doseMax: 15,
      // TRẦN CỨNG theo nhãn thuốc 15 mg/giờ.
      doseAbsMax: 15,
      concUnit: "mg/mL",
      concDefault: 0.1,
      unitScale: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 10,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 100,
        vialVolumeMl: 10,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxPeripheralConc: 0.1,
        stability: "Dùng trong 24 giờ sau pha, để ở nhiệt độ phòng. Bỏ nếu dung dịch đổi màu hoặc có kết tủa.",
        peripheralNote: "Nồng độ chuẩn 0,1 mg/mL (đúng bằng công thức của app) còn dùng ngoại biên được; 0,2 mg/mL thuộc nhóm ưu tiên tĩnh mạch trung tâm. Gây kích ứng/viêm tĩnh mạch khi truyền ngoại biên kéo dài — đổi vị trí truyền mỗi 12 giờ nếu chưa có đường trung tâm.",
      },
    },
  },
]
