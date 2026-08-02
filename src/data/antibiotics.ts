import type { Antibiotic } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// `source` / `reviewedOn` để trống nghĩa là mục đó CHƯA được ghi nguồn và chưa rà soát — giao diện
// sẽ hiện rõ trạng thái đó thay vì im lặng, để người dùng biết mục nào còn phải tự kiểm chứng.

// Nguồn cho các khuyến cáo liều CRRT bên dưới. Chỉ điền `rrt` cho những thuốc có trong nguồn này;
// thuốc không có thì để trống và app sẽ nói rõ là chưa có dữ liệu.
const CRRT_SOURCE = "Li L và cs. Recommendation of Antimicrobial Dosing Optimization During CRRT. Front Pharmacol 2020;11:786"

// Cảnh báo đi kèm MỌI liều CRRT: đây là con số có điều kiện, không phải liều cố định.
const CRRT_NOTE =
  "Liều CRRT phụ thuộc trực tiếp tốc độ dịch thải (Qeff), MIC của vi khuẩn và chức năng thận tồn dư. Nhập Qeff ở khung Bệnh nhân và luôn đối chiếu phác đồ của cơ sở; ưu tiên đo nồng độ thuốc nếu có."

export const ANTIBIOTICS: Antibiotic[] = [
  {
    id: "ampicillin-iv",
    name: "Ampicillin",
    compatKey: COMPAT_KEYS.ampicillin,
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 4–6h (IV)",
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "1–2 g mỗi 6h" },
      { min: 10, label: "CrCl 10–49", dose: "1–2 g mỗi 6–12h" },
      { min: 0, label: "CrCl < 10", dose: "1–2 g mỗi 12–24h" },
    ],
    warnings: [{ text: "Nguy cơ phát ban cao hơn ở bệnh nhân tăng bạch cầu đơn nhân nhiễm khuẩn hoặc dùng cùng allopurinol.", severity: "trung bình" }],
    indications: [
      {
        diseaseId: "meningitis",
        standardDose: "2 g mỗi 4h (IV) — liều cao để phủ Listeria trên thần kinh trung ương",
        tiers: [
          { min: 50, label: "CrCl ≥ 50", dose: "2 g mỗi 4h" },
          { min: 10, label: "CrCl 10–49", dose: "2 g mỗi 6–8h" },
          { min: 0, label: "CrCl < 10", dose: "2 g mỗi 12h" },
        ],
        note: "Phối hợp thường quy khi nghi ngờ Listeria monocytogenes (người già, suy giảm miễn dịch, phụ nữ mang thai).",
      },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%"],
      infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút. Pha xong nên dùng ngay — ampicillin kém bền theo thời gian, đặc biệt trong dung dịch glucose nên tránh dùng làm dung môi.",
    },
  },
  {
    id: "cefotaxim-iv",
    name: "Cefotaxim",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 8h (IV)",
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "1–2 g mỗi 8h" },
      { min: 10, label: "CrCl 10–49", dose: "1–2 g mỗi 12h" },
      { min: 0, label: "CrCl < 10", dose: "1 g mỗi 24h" },
    ],
    indications: [
      {
        diseaseId: "meningitis",
        standardDose: "2 g mỗi 4–6h (IV) — liều cao để đạt nồng độ dịch não tuỷ hiệu quả",
        tiers: [
          { min: 50, label: "CrCl ≥ 50", dose: "2 g mỗi 4–6h" },
          { min: 10, label: "CrCl 10–49", dose: "2 g mỗi 8–12h" },
          { min: 0, label: "CrCl < 10", dose: "2 g mỗi 24h" },
        ],
      },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
    },
  },
  {
    id: "ceftazidim-iv",
    name: "Ceftazidim",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 8h (IV)",
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "1–2 g mỗi 8h" },
      { min: 31, label: "CrCl 31–50", dose: "1–2 g mỗi 12h" },
      { min: 16, label: "CrCl 16–30", dose: "1 g mỗi 24h" },
      { min: 6, label: "CrCl 6–15", dose: "1 g mỗi 48h" },
      { min: 0, label: "CrCl < 6", dose: "500 mg mỗi 48h" },
    ],
    warnings: [{ text: "Phổ hẹp trên Gram dương — cân nhắc phối hợp nếu nghi ngờ tụ cầu.", severity: "trung bình" }],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
    },
  },
  {
    id: "meropenem-iv",
    name: "Meropenem",
    route: "Truyền tĩnh mạch (TTM)",
    standardDose: "1 g mỗi 8h (IV)",
    preparation: "1 lọ (1 g) pha với Natri Clorid 0,9% hoặc Glucose 5% (theo thể tích chỉ định) — truyền tĩnh mạch (TTM) XX giọt/phút, hoặc theo tốc độ bơm tiêm điện nếu truyền kéo dài.",
    rrt: {
      crrt: "1 g mỗi 12h khi MIC ≤ 1 mg/L và Qeff khoảng 22 mL/kg/giờ; 1 g mỗi 8h khi Qeff ≥ 4 L/giờ hoặc cần đích PK/PD mạnh (4×MIC). Y văn ghi nhận khoảng rất rộng (0,25 g mỗi 24h đến 2 g mỗi 8h) tuỳ cường độ lọc.",
      note: CRRT_NOTE,
      source: CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "1 g mỗi 8h" },
      { min: 25, label: "CrCl 25–49", dose: "1 g mỗi 12h" },
      { min: 10, label: "CrCl 10–24", dose: "500 mg mỗi 12h" },
      { min: 0, label: "CrCl < 10", dose: "500 mg mỗi 24h" },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Truyền tĩnh mạch trong 15–30 phút theo liều chuẩn (hoặc tiêm tĩnh mạch chậm ≥ 5 phút với liều thấp); nhiều phác đồ ICU dùng truyền kéo dài 3 giờ để tối ưu hiệu quả diệt khuẩn (PK/PD) ở nhiễm khuẩn nặng/vi khuẩn kém nhạy.",
    },
  },
  {
    id: "amikacin-iv",
    name: "Amikacin",
    route: "Truyền tĩnh mạch (TTM)",
    standardDose: "15 mg/kg mỗi 24h (IV)",
    note: "Theo dõi nồng độ đỉnh/đáy — độc tính thận và tiền đình/ốc tai",
    doseWeightBasis: "adjusted",
    compatKey: COMPAT_KEYS.aminoglycoside,
    rrt: {
      crrt: "25 mg/kg mỗi 48h ở Qeff khoảng 30 mL/kg/giờ; chỉnh khoảng cách liều theo nồng độ đáy đo được.",
      note: `${CRRT_NOTE} Với aminoglycosid, khoảng cách liều phải chỉnh theo nồng độ đáy chứ không theo bảng.`,
      source: CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 60, label: "CrCl ≥ 60", dose: "15 mg/kg mỗi 24h" },
      { min: 40, label: "CrCl 40–59", dose: "15 mg/kg mỗi 36h" },
      { min: 20, label: "CrCl 20–39", dose: "15 mg/kg mỗi 48h" },
      { min: 0, label: "CrCl < 20", dose: "Liều đơn, giãn khoảng liều theo nồng độ đo được" },
    ],
    warnings: [{ text: "Độc tính thận và tai tăng đáng kể khi phối hợp với vancomycin hoặc lợi tiểu quai.", severity: "cao" }],
    mix: {
      vialForm: "solution",
      vialLabel: "ống",
      // Quy cách ống thông dụng nhất trên thị trường (500 mg/2 mL) — chỉ để bảng pha có số mặc định,
      // sửa lại theo đúng ống thực tế đang dùng ở khoa.
      vialAmount: 500,
      vialUnit: "mg",
      vialVolumeMl: 2,
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Pha loãng trong 50–100 mL, truyền tĩnh mạch trong 30–60 phút — không tiêm tĩnh mạch trực tiếp/nhanh.",
    },
  },
  {
    id: "vancomycin-iv",
    name: "Vancomycin",
    route: "Truyền tĩnh mạch (TTM)",
    // Mục này là ví dụ điển hình của việc dữ liệu cũ đi nhưng không ai biết: đích "nồng độ đáy
    // 15–20 mg/L" là khuyến cáo 2009, đã được đồng thuận IDSA/ASHP/PIDS/SIDP 2020 thay bằng đích
    // AUC24/MIC cho nhiễm khuẩn MRSA nặng.
    note: "Đích theo dõi điều trị: AUC24/MIC 400–600 (đồng thuận 2020) cho nhiễm khuẩn MRSA nặng — KHÔNG còn lấy nồng độ đáy 15–20 mg/L làm đích chính. Nếu cơ sở chưa triển khai theo dõi AUC, nồng độ đáy vẫn được dùng thay thế theo phác đồ của cơ sở. Liều nạp 20–25 mg/kg (cân nặng thực) cho nhiễm khuẩn nặng.",
    source: "Đồng thuận IDSA/ASHP/PIDS/SIDP 2020 về theo dõi điều trị vancomycin",
    reviewedOn: "2026-07",
    compatKey: COMPAT_KEYS.vancomycin,
    preparation: "Pha loãng theo nồng độ tối đa 5 mg/mL, truyền tĩnh mạch tối thiểu trong 60 phút (không bơm tĩnh mạch trực tiếp).",
    rrt: {
      ihd: "Liều nạp 20–25 mg/kg (cân nặng thực), sau đó khoảng 10 mg/kg sau MỖI buổi lọc; chỉnh theo AUC/nồng độ đo được.",
      crrt: "Liều nạp 20–25 mg/kg, duy trì khoảng 400–650 mg mỗi 12h ở Qeff 30–40 mL/kg/giờ.",
      note: "Khoảng liều duy trì giữa các nguồn khác nhau đáng kể và bệnh nhân lọc máu là nhóm hay bị DƯỚI liều nhất — đo nồng độ sớm thay vì tin vào liều cố định.",
      source: "Đồng thuận IDSA/ASHP/PIDS/SIDP 2020 · " + CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "15–20 mg/kg mỗi 8–12h" },
      { min: 20, label: "CrCl 20–49", dose: "15–20 mg/kg mỗi 24h" },
      { min: 0, label: "CrCl < 20", dose: "Liều nạp 20–25 mg/kg, sau đó theo nồng độ đáy" },
    ],
    warnings: [
      { text: "Hội chứng \"Red man\" nếu truyền quá nhanh — truyền tối thiểu 60 phút.", severity: "trung bình" },
      { text: "Tăng độc tính thận khi phối hợp với aminoglycosid (gentamicin, amikacin).", severity: "cao" },
    ],
    // Cùng con số 20–25 mg/kg đã ghi trong `note`/`rrt` ở trên — cấu trúc lại thành số để tính giúp
    // theo cân nặng, không phải một khuyến cáo mới.
    boluses: [
      {
        label: "Liều nạp trước khi vào duy trì theo CrCl",
        unit: "mg",
        perKgLow: 20,
        perKgHigh: 25,
        over: "Truyền tĩnh mạch chậm, tối thiểu 60 phút cho mỗi 1 g (liều cao hơn thì kéo dài tương ứng) — không tiêm tĩnh mạch trực tiếp.",
        note: "Dùng cân nặng thực tế (ABW). Chỉ dùng cho nhiễm khuẩn nặng/MRSA — xem ghi chú đích theo dõi AUC24/MIC ở trên.",
      },
    ],
    indications: [
      {
        diseaseId: "meningitis",
        standardDose: "Liều nạp 25–30 mg/kg, sau đó 15–20 mg/kg mỗi 8h",
        tiers: [
          { min: 50, label: "CrCl ≥ 50", dose: "15–20 mg/kg mỗi 8h" },
          { min: 20, label: "CrCl 20–49", dose: "15–20 mg/kg mỗi 12h" },
          { min: 0, label: "CrCl < 20", dose: "Liều nạp 25–30 mg/kg, sau đó theo nồng độ đáy" },
        ],
        note: "Viêm màng não cần đích phơi nhiễm cao hơn — theo AUC24/MIC ở đầu khoảng 400–600 trở lên theo đồng thuận 2020; nơi còn theo nồng độ đáy thì nhắm 15–20 mg/L.",
      },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      // Ngưỡng trên đã nêu trong `preparation` ở trên — nhắc lại ở đây dưới dạng số để bảng pha
      // chặn được, không chỉ nằm trong câu chữ.
      maxConc: 5,
      infuseNote: "Truyền tĩnh mạch chậm, tối thiểu 60 phút cho mỗi 1 g (liều cao hơn thì kéo dài tương ứng) — truyền nhanh gây hội chứng \"Red man\". Không tiêm tĩnh mạch trực tiếp.",
    },
  },
  {
    id: "pip-tazo-iv",
    name: "Piperacillin-Tazobactam",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.pipTazo,
    rrt: {
      crrt: "4,5 g mỗi 6h ở Qeff khoảng 30 mL/kg/giờ; với vi khuẩn kém nhạy nên chuyển sang truyền kéo dài hoặc truyền liên tục thay vì tăng liều bolus.",
      note: CRRT_NOTE,
      source: CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 40, label: "CrCl ≥ 40", dose: "4.5 g mỗi 6h (truyền kéo dài 3–4h nếu nặng)" },
      { min: 20, label: "CrCl 20–39", dose: "3.375 g mỗi 6h" },
      { min: 0, label: "CrCl < 20", dose: "2.25 g mỗi 6h" },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Truyền tĩnh mạch trong 30 phút theo liều chuẩn; nhiều phác đồ ICU dùng truyền kéo dài 3–4 giờ để tối ưu PK/PD ở nhiễm khuẩn nặng.",
    },
  },
  {
    id: "ciprofloxacin-iv",
    name: "Ciprofloxacin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.fluoroquinolone,
    rrt: {
      crrt: "400 mg mỗi 8h ở Qeff khoảng 30 mL/kg/giờ; 200 mg mỗi 8h khi tốc độ dịch lọc khoảng 3 L/giờ.",
      note: CRRT_NOTE,
      source: CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 30, label: "CrCl ≥ 30", dose: "400 mg mỗi 12h" },
      { min: 0, label: "CrCl < 30", dose: "400 mg mỗi 24h" },
    ],
    warnings: [
      { text: "Tăng nguy cơ co giật ở bệnh nhân động kinh hoặc rối loạn thần kinh trung ương.", severity: "cao" },
      { text: "Nguy cơ viêm/đứt gân Achilles, đặc biệt người cao tuổi dùng kèm corticosteroid.", severity: "trung bình" },
    ],
  },
  {
    id: "levofloxacin-iv",
    name: "Levofloxacin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.fluoroquinolone,
    rrt: {
      crrt: "250 mg mỗi 24h khi cường độ lọc thấp — vẫn dùng liều nạp như bậc CrCl thấp ở trên trước khi chuyển sang liều duy trì này.",
      note: CRRT_NOTE,
      source: CRRT_SOURCE,
      reviewedOn: "2026-07",
    },
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "750 mg mỗi 24h" },
      { min: 20, label: "CrCl 20–49", dose: "Liều nạp 750 mg, sau đó 750 mg mỗi 48h" },
      { min: 0, label: "CrCl < 20", dose: "Liều nạp 750 mg, sau đó 500 mg mỗi 48h" },
    ],
    warnings: [
      { text: "Không nên dùng ở bệnh nhân động kinh — tăng nguy cơ co giật.", severity: "cao" },
      { text: "Có thể kéo dài khoảng QT — thận trọng khi phối hợp thuốc chống loạn nhịp.", severity: "trung bình" },
    ],
    mix: {
      // Chai truyền pha sẵn hàm lượng cố định của nhà sản xuất — không pha loãng thêm, chỉ rút một
      // phần hoặc dùng trọn chai theo đúng liều mỗi mức CrCl.
      vialForm: "fixed",
      vialLabel: "chai",
      vialAmount: 750,
      vialUnit: "mg",
      vialVolumeMl: 150,
      infuseNote: "Truyền tĩnh mạch trong tối thiểu 60 phút (750 mg) hoặc 60 phút (500 mg) — không truyền nhanh hơn.",
    },
  },
  {
    id: "gentamicin-iv",
    name: "Gentamicin",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    note: "Liều theo cân nặng thực/lý tưởng tuỳ thể trạng — theo dõi nồng độ đỉnh/đáy",
    doseWeightBasis: "adjusted",
    compatKey: COMPAT_KEYS.aminoglycoside,
    tiers: [
      { min: 60, label: "CrCl ≥ 60", dose: "5–7 mg/kg mỗi 24h" },
      { min: 40, label: "CrCl 40–59", dose: "5–7 mg/kg mỗi 36h" },
      { min: 20, label: "CrCl 20–39", dose: "5–7 mg/kg mỗi 48h" },
      { min: 0, label: "CrCl < 20", dose: "Liều đơn, giãn khoảng liều theo nồng độ đo được" },
    ],
    warnings: [{ text: "Độc tính thận và tai — tránh phối hợp kéo dài với thuốc độc thận khác.", severity: "cao" }],
    mix: {
      vialForm: "solution",
      vialLabel: "ống",
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Pha loãng trong 50–100 mL, truyền tĩnh mạch trong 30–60 phút — không tiêm tĩnh mạch trực tiếp/nhanh.",
    },
  },
  {
    id: "ceftriaxone-iv",
    name: "Ceftriaxone",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    compatKey: COMPAT_KEYS.ceftriaxone,
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "1–2 g mỗi 24h — không cần chỉnh liều thận" }],
    warnings: [{ text: "Tránh tiêm/truyền chung với dung dịch chứa calci ở trẻ sơ sinh — nguy cơ kết tủa.", severity: "trung bình" }],
    indications: [
      {
        diseaseId: "meningitis",
        standardDose: "2 g mỗi 12h (IV) — không cần chỉnh liều thận",
        tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "2 g mỗi 12h — không cần chỉnh liều thận" }],
      },
    ],
    mix: {
      vialForm: "powder",
      vialLabel: "lọ",
      // Không có Ringer lactat/dung dịch chứa calci trong bộ chọn — đúng cặp kết tủa đã ghi trong
      // bảng Y-site (COMPAT_KEYS.ceftriaxone), không lặp lại ở đây.
      diluents: ["NaCl 0,9%", "Glucose 5%"],
      infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
    },
  },
  {
    id: "metronidazole-iv",
    name: "Metronidazole",
    route: "Truyền tĩnh mạch (TTM)",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "500 mg mỗi 8h — không cần chỉnh liều thận" }],
    warnings: [{ text: "Phản ứng giống disulfiram khi uống cùng rượu — tránh rượu trong và sau điều trị 48h.", severity: "trung bình" }],
  },
  {
    id: "metronidazole-po",
    name: "Metronidazole",
    route: "Uống",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "500 mg mỗi 8h — không cần chỉnh liều thận" }],
    note: "Sinh khả dụng đường uống cao (~100%) — liều tương đương đường tĩnh mạch.",
    warnings: [{ text: "Phản ứng giống disulfiram khi uống cùng rượu — tránh rượu trong và sau điều trị 48h.", severity: "trung bình" }],
  },
  {
    id: "azithromycin-po",
    name: "Azithromycin",
    route: "Uống",
    compatKey: COMPAT_KEYS.macrolide,
    standardDose: "500 mg ngày 1, sau đó 250 mg mỗi 24h",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "Không cần chỉnh liều thận" }],
    warnings: [{ text: "Có thể kéo dài khoảng QT — thận trọng ở bệnh nhân bệnh tim mạch hoặc dùng kèm thuốc kéo dài QT khác.", severity: "trung bình" }],
  },
]
