import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

export const ELECTROLYTES: InfusionDrug[] = [
  {
    id: "insulin-infusion",
    name: "Insulin thường (Regular Insulin) truyền TM",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 50 đơn vị Insulin thường với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 1 đơn vị/mL) — truyền qua BTĐ; tráng bộ dây truyền trước khi dùng (insulin bám dính vào nhựa dây truyền).",
    doseRange: "Nhiễm toan ceton/tăng áp lực thẩm thấu: 0,05–0,1 đơn vị/kg/giờ. Tăng kali máu cấp: liều cố định 10 đơn vị kèm Glucose theo phác đồ khoa (không tính theo cân nặng).",
    note: "Bắt buộc theo dõi đường huyết mao mạch mỗi 1 giờ và kali máu định kỳ trong quá trình truyền.",
    warnings: [{ text: "Nguy cơ hạ đường huyết và hạ kali máu — chuẩn bị sẵn Glucose ưu trương và bổ sung Kali theo phác đồ.", severity: "cao" }],
    compatKey: COMPAT_KEYS.insulin,
    boluses: [
      {
        label: "Liều nạp (nhiễm toan ceton — chỉ dùng khi phác đồ khoa yêu cầu)",
        unit: "đơn vị",
        perKgLow: 0.1,
        over: "tiêm tĩnh mạch",
        note: "Nhiều phác đồ hiện nay BỎ liều nạp và truyền thẳng liều duy trì. Không dùng liều nạp khi kali máu < 3,3 mmol/L — phải bù kali trước.",
      },
      {
        label: "Tăng kali máu cấp",
        unit: "đơn vị",
        fixedLow: 10,
        over: "tiêm tĩnh mạch, kèm Glucose ưu trương theo phác đồ",
        note: "Liều cố định, KHÔNG tính theo cân nặng. Theo dõi đường huyết ít nhất 6 giờ sau tiêm.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "đơn vị/kg/giờ",
      doseMin: 0.05,
      doseMax: 0.1,
      // Đề kháng insulin nặng có thể cần cao hơn; 0,5 đơn vị/kg/giờ là mốc chặn.
      doseAbsMax: 0.5,
      concUnit: "đơn vị/mL",
      concDefault: 1,
      unitScale: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 50,
        vialUnit: "đơn vị",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 50,
        // Insulin thường 100 đơn vị/mL → 50 đơn vị nằm trong 0,5 mL.
        vialVolumeMl: 0.5,
        diluents: ["NaCl 0,9%"],
        stability: "Tráng khoảng 20 mL dung dịch đã pha qua dây truyền trước khi nối vào người bệnh; thay bơm và dây mỗi 24 giờ.",
        peripheralNote: "Insulin hấp phụ vào nhựa dây truyền — không tráng dây thì liều thực nhận trong giờ đầu sẽ thấp hơn liều đặt.",
      },
    },
  },
  {
    id: "magnesium-sulfate",
    name: "Magie Sulfat (MgSO4)",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Sản giật/tiền sản giật: liều nạp 4–6 g pha loãng truyền trong 15–20 phút, sau đó pha 5 g với Glucose 5%/Natri Clorid 0,9% vừa đủ 250 mL (nồng độ 0,02 g/mL — 20 mg/mL) để truyền duy trì. Xoắn đỉnh/hạ Mg nặng: 1–2 g truyền trong 5–15 phút.",
    doseRange: "Duy trì (sản giật) 1–2 g/giờ; chỉnh theo phản xạ gân xương, nhịp thở, và nồng độ Mg máu nếu đo được.",
    note: "Chỉ định: sản giật/tiền sản giật nặng, xoắn đỉnh (Torsades de pointes), hạ Magie máu nặng có triệu chứng.",
    warnings: [{ text: "Quá liều gây mất phản xạ gân xương, suy hô hấp, ngừng tim — luôn có sẵn Calci gluconat để giải độc và theo dõi phản xạ/nhịp thở.", severity: "cao" }],
    compatKey: COMPAT_KEYS.magnesium,
    boluses: [
      {
        label: "Liều nạp — sản giật/tiền sản giật nặng",
        unit: "g",
        fixedLow: 4,
        fixedHigh: 6,
        over: "pha loãng, truyền trong 15–20 phút",
        note: "Không tiêm tĩnh mạch nhanh. Theo dõi phản xạ gân xương, nhịp thở và lượng nước tiểu trước mỗi lần lặp liều.",
      },
      {
        label: "Xoắn đỉnh / hạ Magie máu nặng",
        unit: "g",
        fixedLow: 1,
        fixedHigh: 2,
        over: "truyền trong 5–15 phút (xoắn đỉnh có rối loạn huyết động: tiêm nhanh hơn theo phác đồ cấp cứu)",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "g/giờ",
      doseMin: 1,
      doseMax: 2,
      // Trên 3 g/giờ nguy cơ mất phản xạ gân xương/ức chế hô hấp.
      doseAbsMax: 3,
      concUnit: "g/mL",
      concDefault: 0.02,
      unitScale: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 5,
        vialUnit: "g",
        vialLabel: "phần pha",
        vials: 1,
        volumeMl: 250,
        // Thể tích tuỳ nồng độ chế phẩm (10% / 15% / 20% / 50%) nên không điền sẵn — nhập theo ống
        // thực tế để app tính đúng lượng dung môi.
        diluents: ["Glucose 5%", "NaCl 0,9%"],
        // 0,2 g/mL = dung dịch 20%, tức là nồng độ ống chưa pha loãng. Vượt mốc này nghĩa là đang
        // định truyền thẳng chế phẩm đậm đặc.
        maxConc: 0.2,
        stability: "Dùng trong 24 giờ sau pha. Không truyền dung dịch chưa pha loãng.",
      },
    },
  },
  {
    id: "potassium-chloride",
    name: "Kali Clorid (KCl) truyền TM",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha loãng theo nồng độ chuẩn của khoa (ví dụ 20 mEq pha vừa đủ 100 mL, nồng độ 0,2 mEq/mL) — không bao giờ tiêm tĩnh mạch trực tiếp không pha loãng.",
    doseRange: "Tốc độ tối đa qua đường truyền ngoại biên: 10 mEq/giờ; qua tĩnh mạch trung tâm có theo dõi ECG liên tục: có thể tới 20 mEq/giờ trong hạ Kali máu nặng có triệu chứng.",
    note: "Luôn kiểm tra chức năng thận và Kali máu trước và trong khi truyền; ngừng ngay nếu vô niệu hoặc Kali máu tăng bất thường.",
    warnings: [{ text: "Truyền quá nhanh gây loạn nhịp tim nặng, có thể ngừng tim — bắt buộc theo dõi ECG khi truyền tốc độ cao.", severity: "cao" }],
    compatKey: COMPAT_KEYS.potassium,
    calc: {
      weightBased: false,
      doseUnit: "mEq/giờ",
      doseMin: 10,
      doseMax: 20,
      // TRẦN CỨNG 20 mEq/giờ — trên mức này nguy cơ ngừng tim, kể cả qua tĩnh mạch trung tâm.
      doseAbsMax: 20,
      concUnit: "mEq/mL",
      concDefault: 0.2,
      unitScale: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 20,
        vialUnit: "mEq",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 100,
        // Thể tích tuỳ chế phẩm (KCl 10% ống 10 mL ≈ 13,4 mEq) — nhập theo ống thực tế.
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "TUYỆT ĐỐI không tiêm tĩnh mạch trực tiếp dung dịch chưa pha loãng. Trộn đều bơm/chai sau khi pha — kali đậm đặc lắng xuống đáy nếu không lắc.",
        // Ngưỡng ngoại biên hay dùng: 40 mmol/L = 40 mEq/L = 0,04 mEq/mL. Công thức 20 mEq/100 mL
        // của app (0,2 mEq/mL) gấp 5 lần ngưỡng đó — dành cho đường trung tâm.
        maxPeripheralConc: 0.04,
        // Ngưỡng trên tuyệt đối, KHÔNG phải ngưỡng theo phác đồ: nhiều hướng dẫn còn chặt hơn nhiều (80–200
        // mmol/L tuỳ cơ sở). 0,4 mEq/mL là mốc báo động "đang tiến vào vùng dung dịch đậm đặc chưa
        // pha loãng đủ" — kali đậm đặc bơm thẳng là nguyên nhân tử vong kinh điển.
        maxConc: 0.4,
        peripheralNote:
          "Ngưỡng ngoại biên thường quy là ≤ 40 mmol/L (0,04 mEq/mL) để hạn chế đau và viêm tĩnh mạch; đặc hơn thì phải qua tĩnh mạch trung tâm. Tốc độ ngoại biên thường không quá 10 mEq/giờ; trung tâm có theo dõi ECG liên tục mới lên tới 20 mEq/giờ. Nhiều cơ sở quy định ngưỡng nồng độ thấp hơn nhiều — đối chiếu quy định của khoa.",
      },
    },
  },
  {
    id: "calcium-gluconate",
    name: "Calci Gluconat",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Tăng Kali máu cấp/ổn định màng tế bào cơ tim: 1 ống (10 mL dung dịch 10%) tiêm tĩnh mạch chậm trong 2–3 phút, có thể lặp lại sau 5–10 phút nếu ECG chưa cải thiện.",
    doseRange: "Liều bolus 1 g (10 mL dung dịch 10%), lặp lại theo đáp ứng ECG — đây là thuốc tiêm/truyền ngắn, không phải truyền liên tục kéo dài.",
    note: "Chỉ định: tăng Kali máu có thay đổi ECG, hạ Calci máu nặng có triệu chứng, quá liều chẹn kênh calci.",
    warnings: [{ text: "Không pha chung hoặc truyền cùng đường với Natri Bicarbonat hay các dung dịch chứa Phosphat — nguy cơ kết tủa.", severity: "trung bình" }],
    compatKey: COMPAT_KEYS.calcium,
    boluses: [
      {
        label: "Tăng Kali máu có thay đổi ECG",
        unit: "g",
        fixedLow: 1,
        over: "tiêm tĩnh mạch chậm 2–3 phút (1 ống 10 mL dung dịch 10%)",
        note: "Lặp lại sau 5–10 phút nếu ECG chưa cải thiện. Tráng dây bằng NaCl 0,9% trước và sau nếu đường truyền có dùng Natri Bicarbonat.",
      },
    ],
  },
  {
    // Khoá `bicarbonate` đã có trong bảng tương hợp từ đầu (cặp calci × bicarbonat là một trong
    // những cặp kết tủa kinh điển nhất) nhưng chưa từng có thuốc nào mang nó — nghĩa là luật đó
    // không bao giờ chạy được. Bản ghi này nối lại chỗ đứt đó.
    id: "sodium-bicarbonate",
    name: "Natri Bicarbonat 8,4%",
    route: "Tiêm/truyền tĩnh mạch (IV) — ưu tiên tĩnh mạch trung tâm khi dùng dung dịch 8,4%",
    preparation:
      "Dung dịch 8,4% có 1 mEq/mL (1 mmol Na và 1 mmol HCO3 trong mỗi mL). Ống 50 mL = 50 mEq. Truyền chậm; nếu dùng đường ngoại biên thì pha loãng xuống 1,4% (đẳng trương) bằng cách pha 50 mL dung dịch 8,4% vào 250 mL Glucose 5%.",
    doseRange:
      "Toan chuyển hoá nặng: 1–2 mEq/kg truyền chậm, sau đó chỉnh theo khí máu. Tăng kali máu cấp: 50 mEq truyền trong 5 phút. Ngộ độc thuốc chống trầm cảm ba vòng có QRS giãn: 1–2 mEq/kg bolus, lặp lại tới khi QRS hẹp lại.",
    note:
      "Chỉ định KHÔNG phải là mọi trường hợp toan máu. Trong toan chuyển hoá do tăng lactat hoặc nhiễm toan ceton, bicarbonat không cải thiện kết cục và có thể gây hại — chỉ cân nhắc khi pH rất thấp (thường < 7,1) hoặc có toan chuyển hoá mất bicarbonat thật sự (tiêu chảy, toan ống thận). Ngược lại, trong ngộ độc thuốc chẹn kênh natri (chống trầm cảm ba vòng) thì đây là thuốc điều trị đặc hiệu.",
    warnings: [
      {
        text:
          "Dung dịch KIỀM MẠNH — phân huỷ catecholamin và kết tủa với calci, giãn cơ, phenytoin tại Khóa chữ Y. Dùng đường truyền riêng và tráng dây bằng NaCl 0,9% trước/sau, nếu không sẽ mất vận mạch hoặc mất giãn cơ giữa chừng.",
        severity: "cao",
      },
      {
        text:
          "Gây HẠ KALI và hạ calci ion hoá (đẩy kali vào tế bào, tăng gắn calci với albumin) — theo dõi kali và calci ion hoá; có thể làm nặng thêm co giật do hạ calci.",
        severity: "cao",
      },
      { text: "Thoát mạch dung dịch 8,4% gây hoại tử mô — ưu tiên tĩnh mạch trung tâm, hoặc pha loãng xuống 1,4% khi dùng ngoại biên.", severity: "cao" },
      { text: "Quá tải natri và tăng CO2 máu — ở bệnh nhân không tăng được thông khí, bicarbonat làm toan hô hấp nặng thêm.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.bicarbonate,
    boluses: [
      {
        label: "Toan chuyển hoá nặng / ngộ độc thuốc chẹn kênh natri",
        unit: "mEq",
        perKgLow: 1,
        perKgHigh: 2,
        over: "Truyền tĩnh mạch chậm; trong ngộ độc có QRS giãn thì bolus nhanh hơn và lặp lại cho tới khi QRS hẹp lại.",
        note: "1 mEq = 1 mL dung dịch 8,4%. Kiểm tra lại khí máu sau mỗi liều thay vì truyền tiếp theo quán tính.",
      },
      {
        label: "Tăng kali máu cấp",
        unit: "mEq",
        fixedLow: 50,
        over: "Truyền tĩnh mạch trong 5 phút.",
        note: "Chỉ có tác dụng đáng kể khi bệnh nhân có toan chuyển hoá kèm theo; không thay thế được calci trong việc ổn định màng cơ tim.",
      },
    ],
  },
]
