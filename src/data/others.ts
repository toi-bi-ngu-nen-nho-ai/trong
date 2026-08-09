import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// ─── Thuốc dùng thường trực khác ──────────────────────────────────────────────
//
// Nhóm gom các thuốc chạy hằng ngày ở buồng bệnh nhưng không thuộc trục huyết động hay thần kinh:
// kháng đông, lợi tiểu truyền, dự phòng loét do stress, corticoid liều sốc, chống tiêu sợi huyết,
// hạ áp, digoxin, giảm đau hạ sốt.
//
// Ba trong số này (heparin, furosemide, pantoprazole) chính là các khoá tương hợp đã được khai sẵn
// trong data/compatibility.ts từ đầu nhưng chưa từng có thuốc nào mang — nghĩa là các luật kết tủa
// quan trọng nhất (furosemide × catecholamin, pantoprazole × midazolam, heparin × amiodarone) trước
// đây không bao giờ kích hoạt được.
//
// Xem ghi chú đầu file inotropes.ts về ý nghĩa của mix/vialVolumeMl/maxPeripheralConc/stability.

export const OTHER_DRUGS: InfusionDrug[] = [
  {
    id: "heparin",
    name: "Heparin không phân đoạn (UFH)",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 25.000 đơn vị với Natri Clorid 0,9% vừa đủ 250 mL (nồng độ 100 đơn vị/mL) — truyền qua bơm có kiểm soát tốc độ.",
    doseRange:
      "Điều trị huyết khối: liều nạp 80 đơn vị/kg, sau đó duy trì 18 đơn vị/kg/giờ, chỉnh theo aPTT hoặc anti-Xa. Hội chứng vành cấp: liều nạp 60 đơn vị/kg (tối đa 4.000), duy trì 12 đơn vị/kg/giờ (tối đa 1.000/giờ).",
    note:
      "Liều KHỞI ĐẦU tính theo cân nặng, nhưng liều DUY TRÌ phải chỉnh theo xét nghiệm — app chỉ tính giúp điểm xuất phát. Xét nghiệm lại sau mỗi 6 giờ kể từ lúc bắt đầu hoặc sau mỗi lần đổi liều, và một lần nữa khi đã đạt đích hai lần liên tiếp. Dùng cân nặng thực tế, nhiều phác đồ giới hạn ở 150 kg.",
    warnings: [
      { text: "Chảy máu — theo dõi hemoglobin, tiểu cầu và dấu hiệu chảy máu; có sẵn protamin sulfat làm thuốc trung hoà.", severity: "cao" },
      {
        text:
          "Giảm tiểu cầu do heparin (HIT): kiểm tra tiểu cầu trước khi dùng và định kỳ; tiểu cầu giảm trên 50% sau ngày thứ 4–5 phải NGỪNG mọi dạng heparin và chuyển sang kháng đông nhóm khác, không chỉ giảm liều.",
        severity: "cao",
      },
      { text: "Tăng kali máu do ức chế tổng hợp aldosteron khi dùng kéo dài — theo dõi kali ở bệnh nhân suy thận.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.heparin,
    boluses: [
      {
        label: "Liều nạp — điều trị huyết khối",
        unit: "đơn vị",
        perKgLow: 80,
        maxSingle: 10000,
        over: "Tiêm tĩnh mạch chậm.",
        note: "Dùng cân nặng thực tế. Bỏ qua liều nạp nếu bệnh nhân có nguy cơ chảy máu cao.",
      },
      {
        label: "Liều nạp — hội chứng vành cấp",
        unit: "đơn vị",
        perKgLow: 60,
        maxSingle: 4000,
        over: "Tiêm tĩnh mạch chậm.",
        note: "Trần liều nạp 4.000 đơn vị theo phác đồ hội chứng vành cấp, thấp hơn hẳn phác đồ huyết khối tĩnh mạch.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "đơn vị/kg/giờ",
      doseMin: 12,
      doseMax: 18,
      doseAbsMax: 30,
      concUnit: "đơn vị/mL",
      concDefault: 100,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 25000,
        vialUnit: "đơn vị",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 250,
        vialVolumeMl: 5,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên. Heparin kết tủa với amiodarone và vancomycin tại Khóa chữ Y — tráng dây hoặc dùng đường truyền riêng.",
      },
    },
  },
  {
    id: "enoxaparin",
    name: "Enoxaparin (heparin trọng lượng phân tử thấp)",
    route: "Tiêm dưới da (SC)",
    preparation: "Bơm tiêm đóng sẵn — tiêm dưới da thành bụng, luân phiên vị trí, không xoa sau tiêm.",
    doseRange:
      "Điều trị: 1 mg/kg mỗi 12 giờ, hoặc 1,5 mg/kg mỗi 24 giờ. Dự phòng: 40 mg mỗi 24 giờ. CrCl < 30 mL/phút: liều điều trị giảm còn 1 mg/kg mỗi 24 giờ, liều dự phòng còn 30 mg mỗi 24 giờ.",
    note:
      "KHÔNG theo dõi được bằng aPTT — nếu cần theo dõi (suy thận, béo phì, thai kỳ) thì phải đo anti-Xa lấy mẫu 4 giờ sau mũi tiêm. Ở bệnh nhân ICU huyết động không ổn định, hấp thu dưới da thất thường nên nhiều phác đồ ưu tiên heparin không phân đoạn truyền tĩnh mạch.",
    warnings: [
      { text: "Tích luỹ ở suy thận (CrCl < 30) — phải giảm liều, nếu không nguy cơ chảy máu tăng rõ rệt.", severity: "cao" },
      { text: "Protamin chỉ trung hoà được một phần tác dụng của enoxaparin (khoảng 60%) — khác hẳn heparin không phân đoạn.", severity: "cao" },
      { text: "Ngừng đủ thời gian trước thủ thuật gây tê trục thần kinh — nguy cơ máu tụ ngoài màng cứng.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.enoxaparin,
    boluses: [
      {
        label: "Liều điều trị mỗi 12 giờ",
        unit: "mg",
        perKgLow: 1,
        over: "Tiêm dưới da thành bụng.",
        note: "CrCl < 30 mL/phút: giữ nguyên 1 mg/kg nhưng GIÃN khoảng cách thành mỗi 24 giờ.",
      },
      {
        label: "Liều dự phòng",
        unit: "mg",
        fixedLow: 40,
        over: "Tiêm dưới da mỗi 24 giờ.",
        note: "CrCl < 30 mL/phút: giảm còn 30 mg mỗi 24 giờ.",
      },
    ],
  },
  {
    id: "furosemide",
    name: "Furosemide",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Pha 250 mg với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 5 mg/mL) — truyền qua bơm tiêm điện. Không pha với dung dịch acid (furosemide là dung dịch KIỀM).",
    doseRange:
      "Truyền liên tục: 2–20 mg/giờ sau liều nạp 20–40 mg tiêm tĩnh mạch. Liều tiêm ngắt quãng: 20–80 mg mỗi 6–12 giờ, tăng dần theo đáp ứng lợi niệu.",
    note:
      "Truyền liên tục cho lợi niệu đều hơn và ít độc tai hơn so với tiêm bolus liều cao ngắt quãng, nhất là ở suy tim mất bù. Bệnh nhân suy thận cần liều cao hơn để đạt đủ nồng độ thuốc tại ống thận. Theo dõi kali, magie và natri máu.",
    warnings: [
      { text: "Độc tai (ù tai, giảm thính lực, có thể không hồi phục) khi tiêm nhanh liều cao — không tiêm quá 4 mg/phút với liều trên 120 mg.", severity: "cao" },
      { text: "Hạ kali, hạ magie máu gây loạn nhịp — bù song song, đặc biệt khi bệnh nhân đang dùng digoxin hoặc thuốc kéo dài QT.", severity: "cao" },
      { text: "Dung dịch KIỀM — kết tủa với catecholamin, midazolam, morphine tại Khóa chữ Y. Dùng đường truyền riêng hoặc tráng dây bằng NaCl 0,9%.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.furosemide,
    boluses: [
      {
        label: "Liều nạp trước khi truyền liên tục",
        unit: "mg",
        fixedLow: 20,
        fixedHigh: 40,
        maxSingle: 80,
        over: "Tiêm tĩnh mạch chậm, không quá 4 mg/phút.",
        note: "Bệnh nhân đã dùng lợi tiểu quai kéo dài hoặc suy thận thường cần liều nạp cao hơn.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 2,
      doseMax: 20,
      doseAbsMax: 40,
      concUnit: "mg/mL",
      concDefault: 5,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 20,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 12,
        volumeMl: 50,
        vialVolumeMl: 2,
        vialForm: "solution",
        diluents: ["NaCl 0,9%"],
        avoidDiluents: ["Glucose 5%"],
        diluentWarning: "Furosemide là dung dịch kiềm (pH khoảng 9) — kém bền và có thể tủa trong dung dịch acid. Ưu tiên pha với NaCl 0,9%.",
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C và TRÁNH ÁNH SÁNG — furosemide phân huỷ khi tiếp xúc ánh sáng (dung dịch ngả vàng thì bỏ).",
        peripheralNote: "Truyền được qua đường ngoại biên. Là dung dịch kiềm — không dùng chung đường truyền với catecholamin, midazolam hay morphine.",
      },
    },
  },
  {
    id: "pantoprazole",
    name: "Pantoprazole",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation:
      "Hoàn nguyên lọ 40 mg với 10 mL Natri Clorid 0,9%. Truyền liên tục: pha 80 mg vừa đủ 100 mL NaCl 0,9% (nồng độ 0,8 mg/mL). CHỈ dùng NaCl 0,9% làm dung môi.",
    doseRange:
      "Xuất huyết tiêu hoá do loét: liều nạp 80 mg tiêm tĩnh mạch, sau đó truyền liên tục 8 mg/giờ trong 72 giờ. Dự phòng loét do stress: 40 mg mỗi 24 giờ.",
    note:
      "Truyền liên tục 8 mg/giờ sau nội soi cầm máu là phác đồ dành cho loét có nguy cơ chảy máu lại cao. Sau 72 giờ chuyển sang đường uống nếu bệnh nhân ăn được.",
    warnings: [
      { text: "Dung dịch KIỀM — kết tủa với midazolam, calci và catecholamin tại Khóa chữ Y. Dùng đường truyền riêng hoặc tráng dây bằng NaCl 0,9%.", severity: "cao" },
      { text: "Dùng kéo dài liên quan tới nhiễm Clostridioides difficile, viêm phổi bệnh viện, hạ magie máu — rà lại chỉ định mỗi ngày, không để chạy theo quán tính.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.pantoprazole,
    boluses: [
      {
        label: "Liều nạp — xuất huyết tiêu hoá",
        unit: "mg",
        fixedLow: 80,
        over: "Tiêm tĩnh mạch chậm trong ít nhất 2 phút, hoặc truyền trong 15 phút.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 8,
      doseMax: 8,
      doseAbsMax: 8,
      concUnit: "mg/mL",
      concDefault: 0.8,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 40,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 2,
        volumeMl: 100,
        vialForm: "powder",
        reconstituteMl: 10,
        diluents: ["NaCl 0,9%"],
        avoidDiluents: ["Glucose 5%", "Ringer lactat"],
        diluentWarning: "Chỉ dùng Natri Clorid 0,9% để hoàn nguyên và pha loãng pantoprazole — các dung môi khác làm thuốc kém bền.",
        stability: "Dùng trong 12 giờ sau khi hoàn nguyên/pha loãng, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên. Là dung dịch kiềm — không dùng chung đường truyền với midazolam, calci hay catecholamin.",
      },
    },
  },
  {
    id: "hydrocortisone",
    name: "Hydrocortisone",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Hoàn nguyên lọ 100 mg với dung môi kèm theo. Truyền liên tục: pha 200 mg vừa đủ 50 mL (nồng độ 4 mg/mL) cho 24 giờ.",
    doseRange:
      "Sốc nhiễm khuẩn kháng trị: 200 mg mỗi 24 giờ — chia 50 mg mỗi 6 giờ tiêm tĩnh mạch, hoặc truyền liên tục 200 mg/24 giờ. Suy thượng thận cấp: 100 mg tiêm tĩnh mạch, sau đó 200 mg/24 giờ.",
    note:
      "Chỉ định trong sốc nhiễm khuẩn là khi huyết áp CHƯA đạt mục tiêu dù đã đủ dịch và đang dùng vận mạch liều đáng kể — không dùng thường quy cho mọi bệnh nhân sốc. Truyền liên tục cho đường huyết ổn định hơn so với tiêm ngắt quãng.",
    warnings: [
      { text: "Tăng đường huyết — theo dõi đường huyết mao mạch và điều chỉnh insulin.", severity: "trung bình" },
      { text: "Tăng natri, hạ kali máu do tác dụng mineralocorticoid; tăng nguy cơ bội nhiễm khi dùng kéo dài.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.hydrocortisone,
    boluses: [
      {
        label: "Suy thượng thận cấp — liều đầu",
        unit: "mg",
        fixedLow: 100,
        over: "Tiêm tĩnh mạch chậm.",
        note: "Trong cơn suy thượng thận cấp, không trì hoãn liều này để chờ kết quả cortisol máu.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 8,
      doseMax: 8.5,
      doseAbsMax: 17,
      concUnit: "mg/mL",
      concDefault: 4,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 100,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 2,
        volumeMl: 50,
        vialForm: "powder",
        reconstituteMl: 2,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "tranexamic-acid",
    name: "Acid Tranexamic (TXA)",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Pha loãng 1 g trong 100 mL Natri Clorid 0,9% — truyền trong 10 phút. KHÔNG tiêm tĩnh mạch nhanh.",
    doseRange:
      "Chấn thương/chảy máu nặng: 1 g truyền trong 10 phút, sau đó 1 g truyền trong 8 giờ. Chảy máu sau sinh: 1 g truyền trong 10 phút, lặp lại 1 g sau 30 phút nếu còn chảy.",
    note:
      "Hiệu quả phụ thuộc THỜI ĐIỂM: phải dùng trong vòng 3 giờ kể từ khi chấn thương/bắt đầu chảy máu. Dùng muộn hơn 3 giờ không còn lợi ích và có tín hiệu gây hại trong các thử nghiệm lớn — đây là chỉ định phải nhìn đồng hồ, không phải nhìn mức độ chảy máu.",
    warnings: [
      { text: "Tiêm tĩnh mạch nhanh gây tụt huyết áp — luôn truyền trong ít nhất 10 phút.", severity: "cao" },
      { text: "Giảm liều ở suy thận (thải trừ chủ yếu qua thận). Thận trọng khi có tiền sử huyết khối; co giật khi dùng liều rất cao.", severity: "trung bình" },
      { text: "Nhầm lẫn thuốc: đã có báo cáo tiêm nhầm TXA vào khoang tuỷ sống thay cho thuốc tê — kiểm tra nhãn ống hai lần.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.tranexamic,
    boluses: [
      {
        label: "Liều đầu — chấn thương/chảy máu nặng",
        unit: "g",
        fixedLow: 1,
        over: "Truyền tĩnh mạch trong 10 phút (pha loãng trong 100 mL NaCl 0,9%).",
        note: "Chỉ có lợi ích khi dùng trong vòng 3 GIỜ đầu kể từ lúc chấn thương.",
      },
      {
        label: "Liều duy trì",
        unit: "g",
        fixedLow: 1,
        over: "Truyền tĩnh mạch đều trong 8 giờ.",
      },
    ],
  },
  {
    id: "labetalol",
    name: "Labetalol",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Ống 100 mg/20 mL (5 mg/mL) — tiêm thẳng cho liều bolus. Truyền liên tục: pha 200 mg vừa đủ 200 mL (nồng độ 1 mg/mL).",
    doseRange:
      "Bolus 10–20 mg tiêm tĩnh mạch trong 2 phút, lặp lại mỗi 10 phút (liều tăng dần, tổng tối đa 300 mg). Truyền liên tục: 0,5–2 mg/phút.",
    note:
      "Chẹn cả α và β nên hạ huyết áp mà không gây nhịp nhanh phản xạ — lựa chọn quen thuộc trong cấp cứu tăng huyết áp, tiền sản giật và bóc tách động mạch chủ. Thời gian tác dụng dài (3–6 giờ) nên không phù hợp khi cần chỉnh huyết áp thật nhanh và có thể đảo ngược.",
    warnings: [
      { text: "Chậm nhịp tim, block nhĩ thất, suy tim mất bù, co thắt phế quản — chống chỉ định ở hen/COPD nặng và block AV độ cao.", severity: "cao" },
      { text: "Tác dụng kéo dài 3–6 giờ — tụt huyết áp do labetalol không dừng lại khi ngừng bơm, khác hẳn nicardipine hay esmolol.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.labetalol,
    boluses: [
      {
        label: "Bolus cấp cứu tăng huyết áp",
        unit: "mg",
        fixedLow: 10,
        fixedHigh: 20,
        maxSingle: 80,
        over: "Tiêm tĩnh mạch trong 2 phút, lặp lại mỗi 10 phút với liều tăng dần (20 → 40 → 80 mg).",
        note: "Tổng liều tích luỹ tối đa 300 mg — vượt mức này phải chuyển sang truyền liên tục hoặc đổi thuốc.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/phút",
      doseMin: 0.5,
      doseMax: 2,
      doseAbsMax: 4,
      concUnit: "mg/mL",
      concDefault: 1,
      mix: {
        vialAmount: 100,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 2,
        volumeMl: 200,
        vialVolumeMl: 20,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên. Không dùng chung đường truyền với furosemide hay heparin (kết tủa).",
      },
    },
  },
  {
    id: "digoxin",
    name: "Digoxin",
    route: "Tiêm tĩnh mạch (IV)",
    preparation: "Ống 0,5 mg/2 mL — pha loãng trong ít nhất 4 lần thể tích (NaCl 0,9% hoặc Glucose 5%), tiêm tĩnh mạch chậm trong ít nhất 5 phút.",
    doseRange:
      "Liều nạp kiểm soát tần số rung nhĩ: tổng 0,75–1,5 mg chia nhiều lần trong 24 giờ (thường 0,5 mg liều đầu, rồi 0,25 mg mỗi 6 giờ). Duy trì 0,125–0,25 mg mỗi 24 giờ, giảm ở suy thận và người già.",
    note:
      "Khởi phát tác dụng chậm (30 phút đến vài giờ) nên KHÔNG phải thuốc kiểm soát tần số cấp cứu — vai trò của nó là ở bệnh nhân suy tim/tụt huyết áp không dùng được chẹn beta hay chẹn kênh calci. Khoảng điều trị rất hẹp; đo nồng độ lấy mẫu ít nhất 6 giờ sau liều.",
    warnings: [
      {
        text:
          "Ngộ độc digoxin nặng lên rõ rệt khi HẠ KALI, hạ magie hoặc tăng calci máu — kiểm tra và bù điện giải trước khi kết luận là kháng trị rồi tăng liều.",
        severity: "cao",
      },
      { text: "Tích luỹ ở suy thận — giảm liều duy trì theo mức lọc cầu thận.", severity: "cao" },
      { text: "Amiodarone làm tăng gấp đôi nồng độ digoxin — giảm nửa liều khi phối hợp.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.digoxin,
    boluses: [
      {
        label: "Liều nạp — liều đầu",
        unit: "mg",
        fixedLow: 0.5,
        maxSingle: 0.5,
        over: "Pha loãng và tiêm tĩnh mạch chậm trong ít nhất 5 phút.",
        note: "Sau đó 0,25 mg mỗi 6 giờ cho tới tổng liều nạp 0,75–1,5 mg. Giảm tổng liều nạp ở người già và suy thận.",
      },
    ],
  },
  {
    id: "paracetamol-iv",
    name: "Paracetamol (Acetaminophen) truyền TM",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Chai pha sẵn 1 g/100 mL — truyền trong 15 phút, không pha loãng thêm.",
    doseRange:
      "Người lớn ≥ 50 kg: 1 g mỗi 6 giờ, TỐI ĐA 4 g trong 24 giờ. Người lớn < 50 kg: 15 mg/kg mỗi 6 giờ, tối đa 60 mg/kg/24 giờ (không quá 3 g).",
    note:
      "Trần 4 g/24 giờ là trần TỔNG CỘNG của mọi đường dùng và mọi chế phẩm — rất hay bị vượt vì bệnh nhân đồng thời nhận paracetamol truyền và thuốc phối hợp đường uống. Giảm trần xuống 3 g/24 giờ ở người suy dinh dưỡng, nghiện rượu, suy gan hoặc cân nặng thấp.",
    warnings: [
      {
        text:
          "Độc tính gan khi vượt liều tích luỹ — cộng dồn MỌI đường dùng và mọi chế phẩm có chứa paracetamol trong 24 giờ trước khi cho liều tiếp theo.",
        severity: "cao",
      },
      { text: "Nhầm liều gấp 10 lần do nhầm đơn vị mg với mL là sai sót đã được báo cáo nhiều lần với dạng truyền tĩnh mạch — chai 1 g có đúng 100 mL.", severity: "cao" },
      { text: "Giảm liều/giãn khoảng cách liều ở suy gan, suy thận nặng, nghiện rượu, cân nặng dưới 50 kg.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.paracetamol,
    boluses: [
      {
        label: "Liều chuẩn người lớn ≥ 50 kg",
        unit: "g",
        fixedLow: 1,
        maxSingle: 1,
        over: "Truyền tĩnh mạch trong 15 phút, mỗi 6 giờ.",
        note: "Tối đa 4 g trong 24 giờ tính GỘP mọi đường dùng.",
      },
      {
        label: "Liều theo cân nặng (người lớn < 50 kg)",
        unit: "mg",
        perKgLow: 15,
        maxSingle: 750,
        over: "Truyền tĩnh mạch trong 15 phút, mỗi 6 giờ.",
        note: "Tối đa 60 mg/kg/24 giờ và không quá 3 g/24 giờ.",
      },
    ],
  },
]
