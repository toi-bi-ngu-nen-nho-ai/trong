import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

export const ANTIARRHYTHMICS: InfusionDrug[] = [
  {
    id: "amiodarone",
    name: "Amiodarone",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Liều nạp: 150 mg pha với Glucose 5% vừa đủ 100 mL, truyền trong 10 phút. Liều duy trì: pha 900 mg (6 ống 150 mg) với Glucose 5% vừa đủ 500 mL (nồng độ 1,8 mg/mL) — truyền qua BTĐ.",
    doseRange: "Duy trì 1 mg/phút trong 6 giờ đầu, sau đó giảm còn 0,5 mg/phút trong 18 giờ tiếp theo (theo phác đồ kinh điển sau liều nạp).",
    note: "Chỉ định: rung nhĩ, nhanh thất có mạch, ngoại tâm thu thất nhiều, cắt cơn/duy trì nhịp sau sốc điện. Chỉ pha với Glucose 5% (không pha với Natri Clorid 0,9%).",
    warnings: [
      { text: "Có thể gây tụt huyết áp và chậm nhịp khi truyền nhanh — cần theo dõi ECG và huyết áp liên tục.", severity: "cao" },
      { text: "Kích ứng tĩnh mạch ngoại biên khi dùng kéo dài — ưu tiên tĩnh mạch trung tâm nếu duy trì lâu.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.amiodarone,
    boluses: [
      {
        label: "Liều nạp (nhanh thất/rung nhĩ có huyết động ổn định)",
        unit: "mg",
        fixedLow: 150,
        over: "truyền trong 10 phút",
        note: "Pha với Glucose 5% vừa đủ 100 mL. Có thể lặp lại 150 mg nếu loạn nhịp tái phát, sau đó chuyển sang liều duy trì.",
      },
      {
        label: "Ngừng tuần hoàn do rung thất/nhanh thất vô mạch",
        unit: "mg",
        fixedLow: 300,
        over: "tiêm tĩnh mạch nhanh (bolus)",
        note: "Liều thứ hai 150 mg nếu còn rung thất/nhanh thất vô mạch kháng trị.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/phút",
      doseMin: 0.5,
      doseMax: 1,
      // Phác đồ duy trì là 1 rồi 0,5 mg/phút; 2 mg/phút là mốc chặn.
      doseAbsMax: 2,
      concUnit: "mg/mL",
      concDefault: 1.8,
      unitScale: 1,
      mix: {
        vialAmount: 150,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 6,
        volumeMl: 500,
        vialVolumeMl: 3,
        diluents: ["Glucose 5%"],
        avoidDiluents: ["NaCl 0,9%"],
        diluentWarning: "Amiodarone pha với Natri Clorid 0,9% gây KẾT TỦA. Chỉ pha với Glucose 5%.",
        stability: "Ổn định 24 giờ trong Glucose 5%. Truyền kéo dài trên 2 giờ: dùng chai thuỷ tinh hoặc polyolefin, tránh túi/dây PVC vì amiodarone bám vào PVC làm giảm liều thực nhận.",
        // Tờ thông tin kê đơn: truyền kéo dài trên 1 giờ thì nồng độ không được vượt 2 mg/mL nếu
        // không có đường tĩnh mạch trung tâm. Y văn về viêm tĩnh mạch còn khắt khe hơn (nhiều
        // khuyến cáo dưới 1,2 mg/mL cho đường ngoại biên).
        maxPeripheralConc: 2,
        // Ngưỡng trên tuyệt đối: y văn ghi nhận nồng độ trên 3 mg/mL trong Glucose 5% gây viêm tĩnh
        // mạch với tỷ lệ cao. Đây là giới hạn KHÔNG phụ thuộc thói quen pha.
        maxConc: 3,
        peripheralNote:
          "Truyền kéo dài > 1 giờ qua đường ngoại biên: nồng độ không vượt 2 mg/mL (tờ thông tin kê đơn); nhiều nghiên cứu về viêm tĩnh mạch còn khuyến cáo dưới 1,2 mg/mL cho ngoại biên. Duy trì lâu nên dùng tĩnh mạch trung tâm.",
      },
    },
  },
  {
    id: "esmolol",
    name: "Esmolol",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Liều nạp: 500 mcg/kg tiêm tĩnh mạch trong 1 phút. Liều duy trì: pha theo nồng độ chuẩn của khoa (thường 2,5 g pha vừa đủ 250 mL, nồng độ 10 mg/mL) — truyền qua BTĐ.",
    doseRange: "Duy trì 50–200 mcg/kg/phút, chỉnh mỗi 5–10 phút theo tần số tim/huyết áp mục tiêu.",
    note: "Chỉ định: kiểm soát tần số thất trong rung nhĩ/cuồng nhĩ, nhanh xoang có triệu chứng cần kiểm soát nhanh (thời gian bán huỷ rất ngắn ~9 phút).",
    warnings: [{ text: "Có thể gây tụt huyết áp, chậm nhịp, co thắt phế quản — thận trọng ở bệnh nhân hen/COPD và suy tim mất bù.", severity: "cao" }],
    compatKey: COMPAT_KEYS.esmolol,
    boluses: [
      {
        label: "Liều nạp",
        unit: "mcg",
        perKgLow: 500,
        over: "tiêm tĩnh mạch trong 1 phút",
        note: "Có thể lặp lại liều nạp mỗi lần tăng bậc liều duy trì nếu chưa đạt tần số mục tiêu.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 50,
      doseMax: 200,
      // Một số phác đồ chỉnh tới 300 mcg/kg/phút; trên mức đó lợi ích không tăng.
      doseAbsMax: 300,
      concUnit: "mg/mL",
      concDefault: 10,
      unitScale: 1000,
      mix: {
        vialAmount: 2500,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 250,
        vialVolumeMl: 10,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        // Nồng độ 20 mg/mL thuộc nhóm chỉ dùng qua tĩnh mạch trung tâm; 10 mg/mL (công thức chuẩn
        // của app) còn dùng ngoại biên được. Trên 20 mg/mL không còn quy cách pha tiêu chuẩn nào.
        maxPeripheralConc: 10,
        maxConc: 20,
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Từ 20 mg/mL trở lên thuộc nhóm chỉ dùng qua tĩnh mạch trung tâm. Esmolol gây kích ứng tĩnh mạch — tránh truyền ngoại biên kéo dài ở nồng độ cao.",
      },
    },
  },
  {
    id: "lidocaine-antiarrhythmic",
    name: "Lidocaine (chống loạn nhịp)",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Liều nạp: 1–1,5 mg/kg tiêm tĩnh mạch chậm. Liều duy trì: pha 1 g với Glucose 5% vừa đủ 250 mL (nồng độ 4 mg/mL) — truyền qua BTĐ.",
    doseRange: "Duy trì 1–4 mg/phút; có thể lặp lại liều nạp 0,5–0,75 mg/kg nếu loạn nhịp tái phát (tối đa liều nạp tích luỹ ~3 mg/kg).",
    note: "Chỉ định: nhanh thất có mạch, ngoại tâm thu thất nhiều (thuốc hàng hai sau Amiodarone tại nhiều phác đồ hiện nay).",
    warnings: [{ text: "Ngộ độc thần kinh trung ương (lú lẫn, co giật) ở liều cao hoặc suy gan/suy tim — giảm liều duy trì ở nhóm này.", severity: "trung bình" }],
    compatKey: COMPAT_KEYS.lidocaine,
    boluses: [
      { label: "Liều nạp đầu", unit: "mg", perKgLow: 1, perKgHigh: 1.5, over: "tiêm tĩnh mạch chậm" },
      {
        label: "Liều nạp lặp lại (nếu loạn nhịp tái phát)",
        unit: "mg",
        perKgLow: 0.5,
        perKgHigh: 0.75,
        over: "tiêm tĩnh mạch chậm",
        note: "Tổng liều nạp tích luỹ không vượt quá ~3 mg/kg.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/phút",
      doseMin: 1,
      doseMax: 4,
      // TRẦN CỨNG 4 mg/phút — trên mức này là vùng độc tính thần kinh/tim của lidocaine.
      doseAbsMax: 4,
      concUnit: "mg/mL",
      concDefault: 4,
      unitScale: 1,
      mix: {
        vialAmount: 1000,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 250,
        // Thể tích ống phụ thuộc nồng độ chế phẩm sẵn có (2% → 1 g nằm trong 50 mL; 10% → 10 mL),
        // chênh nhau quá xa để điền sẵn — người dùng nhập theo ống thực tế.
        diluents: ["Glucose 5%", "NaCl 0,9%"],
        stability: "Dùng trong 24 giờ sau pha, để ở nhiệt độ phòng.",
      },
    },
  },
  {
    id: "adenosine",
    name: "Adenosine",
    route: "Tiêm tĩnh mạch nhanh (bolus)",
    preparation: "Tiêm tĩnh mạch nhanh (1–2 giây) qua đường truyền lớn, gần tim, tráng ngay bằng 20 mL Natri Clorid 0,9% (kỹ thuật \"double syringe\").",
    doseRange: "Liều đầu 6 mg bolus nhanh; nếu không cắt được cơn sau 1–2 phút, lặp lại 12 mg — có thể lặp thêm 1 lần 12 mg nếu cần.",
    note: "Chỉ định: cắt cơn nhanh kịch phát trên thất (PSVT) có mạch, ổn định huyết động — đây là thuốc bolus, không truyền liên tục.",
    warnings: [
      { text: "Gây ngừng xoang/block nhĩ thất thoáng qua (vài giây) — cảnh báo trước cho người bệnh cảm giác \"khó chịu ngực\" thoáng qua.", severity: "trung bình" },
      { text: "Thận trọng/tránh dùng ở bệnh nhân hen phế quản nặng và người ghép tim.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.adenosine,
    boluses: [
      { label: "Liều đầu", unit: "mg", fixedLow: 6, over: "tiêm tĩnh mạch nhanh 1–2 giây, tráng ngay 20 mL NaCl 0,9%" },
      { label: "Liều thứ hai (sau 1–2 phút nếu chưa cắt cơn)", unit: "mg", fixedLow: 12, over: "tiêm tĩnh mạch nhanh, tráng ngay" },
      { label: "Liều thứ ba (nếu cần)", unit: "mg", fixedLow: 12, over: "tiêm tĩnh mạch nhanh, tráng ngay" },
    ],
  },
]
