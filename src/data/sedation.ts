import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// ─── An thần · Giảm đau · Giãn cơ ─────────────────────────────────────────────
//
// Đây là nhóm truyền liên tục và chỉnh liều NHIỀU NHẤT ở bất kỳ ICU nào, nhưng trước đây app không
// có mục nào cho nó: bệnh nhân thở máy chạy propofol + fentanyl là hai bơm không tra được ở đâu.
// Hệ quả thứ hai nghiêm trọng hơn — bảng tương hợp Y-site đã khai sẵn khoá `propofol`/`midazolam`
// kèm các luật kết tủa quan trọng, nhưng không thuốc nào mang khoá đó nên các luật ấy không bao giờ
// kích hoạt được (xem ghi chú trong data/compatibility.ts).
//
// Xem ghi chú đầu file inotropes.ts về ý nghĩa của mix/vialVolumeMl/maxPeripheralConc/stability.

export const SEDATIVES: InfusionDrug[] = [
  {
    id: "propofol",
    name: "Propofol",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation:
      "Nhũ dịch 1% (10 mg/mL) — rút thẳng từ lọ, KHÔNG pha loãng thêm trong đa số trường hợp. Nếu buộc phải pha loãng thì chỉ dùng Glucose 5% và không loãng hơn 2 mg/mL.",
    doseRange:
      "An thần tại ICU: 0,3–3 mg/kg/giờ, chỉnh theo thang an thần (RASS) mục tiêu. Duy trì trên 4 mg/kg/giờ kéo dài là ngưỡng nguy cơ hội chứng truyền propofol.",
    note:
      "Nhũ dịch lipid — phải tính vào tổng lượng lipid/calo trong ngày (1% cung cấp khoảng 1,1 kcal/mL). Thay bơm và dây truyền mỗi 12 giờ: dịch không có chất bảo quản, là môi trường nuôi cấy vi khuẩn rất tốt.",
    warnings: [
      {
        text:
          "Hội chứng truyền propofol (PRIS): toan chuyển hoá, tiêu cơ vân, tăng kali, suy tim — nguy cơ tăng rõ khi liều > 4 mg/kg/giờ kéo dài trên 48 giờ. Theo dõi khí máu, CK, triglycerid khi truyền dài ngày.",
        severity: "cao",
      },
      { text: "Tụt huyết áp và ức chế hô hấp phụ thuộc liều — thận trọng ở bệnh nhân giảm thể tích hoặc đang dùng vận mạch.", severity: "cao" },
      { text: "Thận trọng ở người dị ứng trứng/đậu nành (tá dược nhũ dịch).", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.propofol,
    boluses: [
      {
        label: "Liều nạp an thần tại ICU (chỉ khi huyết động cho phép)",
        unit: "mg",
        perKgLow: 0.25,
        perKgHigh: 1,
        over: "Tiêm tĩnh mạch chậm trong 1–2 phút, dò từng nấc theo đáp ứng.",
        note:
          "Liều nạp khởi mê 1,5–2,5 mg/kg là liều của phòng mổ, KHÔNG dùng thẳng cho bệnh nhân ICU đang tụt huyết áp. Nhiều phác đồ bỏ hẳn liều nạp và truyền thẳng liều duy trì.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mg/kg/giờ",
      doseMin: 0.3,
      doseMax: 3,
      // 4 mg/kg/giờ là mốc nguy cơ PRIS được nhắc trong mọi khuyến cáo — vượt mốc này phải là một
      // quyết định có chủ ý, không phải một con số trôi qua mắt.
      doseAbsMax: 4,
      concUnit: "mg/mL",
      concDefault: 10,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 500,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 50,
        vialForm: "solution",
        diluents: ["Không pha loãng (dùng nguyên nhũ dịch 1%)", "Glucose 5%"],
        avoidDiluents: ["NaCl 0,9%"],
        diluentWarning:
          "Không pha loãng propofol bằng NaCl 0,9% — muối làm mất ổn định nhũ tương (tách pha, kết bông). Chỉ Glucose 5% và không loãng hơn 2 mg/mL.",
        stability:
          "Dùng trong 12 GIỜ sau khi bóc lọ (ngắn hơn hẳn 24 giờ của các thuốc khác) — nhũ dịch không có chất bảo quản. Thay cả bơm và dây truyền mỗi 12 giờ. Bỏ ngay nếu thấy tách lớp hoặc lợn cợn.",
        peripheralNote:
          "Truyền được qua đường ngoại biên nhưng gây đau nơi tiêm rõ rệt — ưu tiên tĩnh mạch lớn. Nhũ dịch lipid nên ưu tiên một nòng riêng.",
      },
    },
  },
  {
    id: "midazolam",
    name: "Midazolam",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 50 mg với Natri Clorid 0,9% hoặc Glucose 5% vừa đủ 50 mL (nồng độ 1 mg/mL) — truyền qua BTĐ.",
    doseRange: "An thần tại ICU: 0,02–0,1 mg/kg/giờ, chỉnh theo RASS mục tiêu.",
    note:
      "Chất chuyển hoá còn hoạt tính (α-hydroxymidazolam) TÍCH LUỸ ở suy thận và khi truyền kéo dài — thời gian tỉnh sau khi ngừng có thể kéo dài nhiều ngày. Ngắt an thần hằng ngày để đánh giá lại.",
    warnings: [
      { text: "Tụt huyết áp và ức chế hô hấp, cộng gộp mạnh khi dùng cùng opioid — giảm liều cả hai khi phối hợp.", severity: "cao" },
      { text: "Mê sảng và kéo dài thời gian thở máy so với propofol/dexmedetomidine — cân nhắc thuốc khác nếu dự kiến an thần dài.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.midazolam,
    boluses: [
      {
        label: "Liều nạp / liều ngắt quãng",
        unit: "mg",
        fixedLow: 1,
        fixedHigh: 2.5,
        maxSingle: 5,
        over: "Tiêm tĩnh mạch chậm trong 2–3 phút, chờ đủ 3–5 phút mới đánh giá đáp ứng và lặp lại.",
        note: "Ở người già hoặc huyết động không ổn định, bắt đầu từ 0,5–1 mg. Tác dụng đỉnh chậm — tiêm lặp lại quá sớm là nguyên nhân kinh điển gây quá liều.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mg/kg/giờ",
      doseMin: 0.02,
      doseMax: 0.1,
      doseAbsMax: 0.3,
      concUnit: "mg/mL",
      concDefault: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 5,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 10,
        volumeMl: 50,
        vialVolumeMl: 1,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên. Midazolam là dung dịch ACID — không dùng chung nòng với furosemide/pantoprazole (kết tủa).",
      },
    },
  },
  {
    id: "fentanyl",
    name: "Fentanyl",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 1.000 mcg (20 ống 50 mcg/mL) với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 20 mcg/mL) — truyền qua BTĐ. Công thức pha khác nhau giữa các khoa.",
    doseRange: "Giảm đau/an thần khi thở máy: 0,5–3 mcg/kg/giờ, chỉnh theo thang đau và mức an thần.",
    note:
      "Tích luỹ ở mô mỡ khi truyền kéo dài — thời gian bán thải theo bối cảnh (context-sensitive half-time) dài dần theo số giờ đã truyền, nên bệnh nhân truyền 5 ngày tỉnh chậm hơn hẳn bệnh nhân truyền 5 giờ dù cùng liều.",
    warnings: [
      { text: "Ức chế hô hấp — chỉ dùng liều truyền liên tục khi đã kiểm soát đường thở hoặc có theo dõi liên tục.", severity: "cao" },
      { text: "Cứng cơ thành ngực khi tiêm bolus nhanh liều cao — tiêm chậm.", severity: "cao" },
      { text: "Giảm nhu động ruột, bí tiểu, dung nạp thuốc khi dùng kéo dài.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.fentanyl,
    boluses: [
      {
        label: "Liều nạp giảm đau",
        unit: "mcg",
        perKgLow: 0.5,
        perKgHigh: 1,
        maxSingle: 100,
        over: "Tiêm tĩnh mạch chậm trong 1–2 phút (tiêm nhanh gây cứng cơ thành ngực).",
        note: "Chờ đủ 3–5 phút mới đánh giá đáp ứng — đỉnh tác dụng của fentanyl không tức thì như cảm giác thường thấy.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/giờ",
      doseMin: 0.5,
      doseMax: 3,
      doseAbsMax: 10,
      concUnit: "mcg/mL",
      concDefault: 20,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 100,
        vialUnit: "mcg",
        vialLabel: "ống",
        vials: 10,
        volumeMl: 50,
        vialVolumeMl: 2,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C và tránh ánh sáng.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "morphine",
    name: "Morphine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 50 mg với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 1 mg/mL) — truyền qua BTĐ.",
    doseRange: "Giảm đau truyền liên tục: 1–5 mg/giờ (liều cố định, không tính theo cân nặng), chỉnh theo thang đau.",
    note:
      "Chất chuyển hoá morphine-6-glucuronid còn hoạt tính và THẢI QUA THẬN — tích luỹ gây ức chế hô hấp muộn ở bệnh nhân suy thận. Ở nhóm này ưu tiên fentanyl.",
    warnings: [
      { text: "Ức chế hô hấp, đặc biệt khi suy thận (tích luỹ chất chuyển hoá còn hoạt tính).", severity: "cao" },
      { text: "Giải phóng histamin gây tụt huyết áp và co thắt phế quản — thận trọng ở bệnh nhân hen và huyết động không ổn định.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.morphine,
    boluses: [
      {
        label: "Liều nạp giảm đau",
        unit: "mg",
        fixedLow: 2,
        fixedHigh: 5,
        maxSingle: 10,
        over: "Tiêm tĩnh mạch chậm trong 4–5 phút, dò từng nấc.",
        note: "Giảm liều ở người già và bệnh nhân suy thận.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 1,
      doseMax: 5,
      doseAbsMax: 10,
      concUnit: "mg/mL",
      concDefault: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 10,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 5,
        volumeMl: 50,
        vialVolumeMl: 1,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C và tránh ánh sáng.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "ketamine",
    name: "Ketamine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 500 mg với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 10 mg/mL) — truyền qua BTĐ.",
    doseRange:
      "Giảm đau liều thấp: 0,1–0,5 mg/kg/giờ. An thần: 0,5–2 mg/kg/giờ. Liều giảm đau và liều an thần khác nhau một bậc — xác định rõ đang dùng cho mục đích nào.",
    note:
      "Giữ được trương lực giao cảm nên ít tụt huyết áp hơn propofol — lựa chọn hợp lý ở bệnh nhân huyết động không ổn định. Ở người đã cạn kiệt catecholamin nội sinh (sốc kéo dài) thì tác dụng ức chế cơ tim trực tiếp lại lộ ra, vẫn có thể tụt huyết áp.",
    warnings: [
      { text: "Phản ứng tâm thần khi tỉnh (ảo giác, kích động) — cân nhắc phối hợp benzodiazepine liều thấp.", severity: "trung bình" },
      { text: "Tăng tiết nước bọt và dịch phế quản; tăng huyết áp, nhịp nhanh — thận trọng ở bệnh mạch vành.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.ketamine,
    boluses: [
      {
        label: "Liều nạp giảm đau (liều thấp)",
        unit: "mg",
        perKgLow: 0.1,
        perKgHigh: 0.3,
        over: "Tiêm tĩnh mạch chậm trong 2–3 phút — tiêm nhanh làm phản ứng tâm thần nặng hơn.",
      },
      {
        label: "Liều khởi mê / đặt nội khí quản",
        unit: "mg",
        perKgLow: 1,
        perKgHigh: 2,
        over: "Tiêm tĩnh mạch trong 30–60 giây.",
        note: "Đây là liều KHỞI MÊ, khác hẳn liều giảm đau ở trên — dùng nhầm hai liều này là sai một bậc độ lớn.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mg/kg/giờ",
      doseMin: 0.1,
      doseMax: 2,
      doseAbsMax: 4,
      concUnit: "mg/mL",
      concDefault: 10,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 500,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 10,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "dexmedetomidine",
    name: "Dexmedetomidine",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 200 mcg với Natri Clorid 0,9% vừa đủ 50 mL (nồng độ 4 mcg/mL) — truyền qua BTĐ.",
    doseRange: "0,2–0,7 mcg/kg/giờ, có thể tăng tới 1,4 mcg/kg/giờ theo đáp ứng. KHÔNG dùng liều nạp tại ICU.",
    note:
      "An thần nhẹ, bệnh nhân vẫn đánh thức được và ít mê sảng hơn benzodiazepine. Không có tác dụng giảm đau đủ mạnh để dùng một mình, và KHÔNG ức chế hô hấp — đây cũng là lý do không dùng nó để an thần sâu.",
    warnings: [
      {
        text: "Chậm nhịp tim và tụt huyết áp là tác dụng phụ thường gặp nhất, nặng hơn khi có liều nạp — vì vậy phác đồ ICU bỏ hẳn liều nạp. Theo dõi ECG liên tục.",
        severity: "cao",
      },
      { text: "Không đủ để an thần sâu — không dùng cho bệnh nhân cần giãn cơ hoặc kiểm soát thở máy chặt.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.dexmedetomidine,
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/giờ",
      doseMin: 0.2,
      doseMax: 0.7,
      // Nhãn thuốc cho phép tới 1,4 mcg/kg/giờ; trên mức đó không tăng thêm hiệu quả an thần mà chỉ
      // tăng chậm nhịp/tụt huyết áp.
      doseAbsMax: 1.4,
      concUnit: "mcg/mL",
      concDefault: 4,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 200,
        vialUnit: "mcg",
        vialLabel: "ống",
        vials: 1,
        volumeMl: 50,
        vialVolumeMl: 2,
        vialForm: "solution",
        diluents: ["NaCl 0,9%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "rocuronium",
    name: "Rocuronium",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Ống 50 mg/5 mL (10 mg/mL) — tiêm thẳng cho liều nạp. Truyền duy trì: pha 500 mg vừa đủ 50 mL (10 mg/mL) hoặc theo chuẩn của khoa.",
    doseRange: "Duy trì giãn cơ khi thở máy: 0,3–0,6 mg/kg/giờ, chỉnh theo TOF (mục tiêu thường 1–2/4).",
    note:
      "BẮT BUỘC an thần và giảm đau ĐẦY ĐỦ TRƯỚC khi dùng giãn cơ — thuốc giãn cơ không có tác dụng an thần hay giảm đau, bệnh nhân bị liệt mà vẫn tỉnh là biến cố nặng. Thải trừ qua gan-mật, kéo dài ở suy gan.",
    warnings: [
      { text: "Không bao giờ dùng giãn cơ khi chưa chắc chắn bệnh nhân đã được an thần đủ sâu và đã kiểm soát đường thở.", severity: "cao" },
      { text: "Kéo dài tác dụng khi phối hợp magie, aminoglycosid, colistin, hoặc khi hạ thân nhiệt/toan máu — theo dõi TOF trước khi cai máy.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.rocuronium,
    boluses: [
      {
        label: "Đặt nội khí quản nhanh (RSI)",
        unit: "mg",
        perKgLow: 1,
        perKgHigh: 1.2,
        over: "Tiêm tĩnh mạch nhanh sau khi đã cho thuốc an thần khởi mê.",
        note: "Dùng cân nặng thực tế. Liều RSI cao hơn hẳn liều đặt ống thường quy (0,6 mg/kg) để rút ngắn thời gian khởi phát.",
      },
      {
        label: "Liều nạp giãn cơ thường quy",
        unit: "mg",
        perKgLow: 0.6,
        over: "Tiêm tĩnh mạch.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mg/kg/giờ",
      doseMin: 0.3,
      doseMax: 0.6,
      doseAbsMax: 1,
      concUnit: "mg/mL",
      concDefault: 10,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 50,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 10,
        volumeMl: 50,
        vialVolumeMl: 5,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        stability: "Dùng trong 24 giờ sau pha, để dưới 25°C. Ống chưa dùng bảo quản lạnh 2–8°C theo tờ hướng dẫn.",
        peripheralNote: "Truyền được qua đường ngoại biên, nhưng phải tráng dây bằng NaCl 0,9% trước/sau nếu nòng đó có dùng thuốc kiềm (bicarbonat, furosemide) — kết tủa làm mất giãn cơ giữa chừng.",
      },
    },
  },
  {
    id: "cisatracurium",
    name: "Cisatracurium",
    route: "Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)",
    preparation: "Pha 100 mg vừa đủ 50 mL (nồng độ 2 mg/mL) với Natri Clorid 0,9% — truyền qua BTĐ.",
    doseRange: "Duy trì giãn cơ: 1–3 mcg/kg/phút, chỉnh theo TOF (mục tiêu thường 1–2/4).",
    note:
      "Thải trừ bằng phân huỷ Hofmann — KHÔNG phụ thuộc gan hay thận, nên đây là giãn cơ được ưu tiên ở bệnh nhân suy đa tạng. Cũng bắt buộc an thần/giảm đau đầy đủ trước khi dùng.",
    warnings: [
      { text: "Không bao giờ dùng giãn cơ khi chưa chắc chắn bệnh nhân đã được an thần đủ sâu và đã kiểm soát đường thở.", severity: "cao" },
      { text: "Kéo dài tác dụng khi phối hợp magie, aminoglycosid, colistin — theo dõi TOF trước khi cai máy.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.cisatracurium,
    boluses: [
      {
        label: "Liều nạp giãn cơ",
        unit: "mg",
        perKgLow: 0.15,
        perKgHigh: 0.2,
        over: "Tiêm tĩnh mạch trong 5–10 giây, sau khi đã an thần đủ sâu.",
      },
    ],
    calc: {
      weightBased: true,
      doseUnit: "mcg/kg/phút",
      doseMin: 1,
      doseMax: 3,
      doseAbsMax: 10,
      concUnit: "mg/mL",
      concDefault: 2,
      mix: {
        vialAmount: 20,
        vialUnit: "mg",
        vialLabel: "ống",
        vials: 5,
        volumeMl: 50,
        vialVolumeMl: 10,
        vialForm: "solution",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        avoidDiluents: ["Ringer lactat"],
        diluentWarning: "Cisatracurium cần môi trường acid để bền — không pha với dung dịch kiềm (Ringer lactat, bicarbonat) vì mất hoạt lực.",
        stability: "Dùng trong 24 giờ sau pha. Ống chưa dùng bảo quản lạnh 2–8°C và tránh ánh sáng theo tờ hướng dẫn.",
        peripheralNote: "Truyền được qua đường ngoại biên; tráng dây bằng NaCl 0,9% nếu nòng đó có dùng thuốc kiềm.",
      },
    },
  },
]
