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

// ─── Bậc tăng thanh thải thận (ARC) ───────────────────────────────────────────
// Trước đây mọi bảng liều đều dừng ở bậc "CrCl ≥ 50": bệnh nhân trẻ, nhiễm khuẩn huyết, CrCl 160
// nhận đúng liều như người CrCl 55. Đó là nhóm bị DƯỚI liều beta-lactam kinh điển — và vì app chỉ
// từng cảnh báo chiều suy thận nên chiều ngược lại hoàn toàn im lặng.
//
// Ngưỡng dùng ở đây là CrCl ≥ 90 mL/phút. Cách xử trí đúng KHÔNG phải tăng liều mỗi lần (beta-lactam
// diệt khuẩn phụ thuộc THỜI GIAN nồng độ trên MIC, không phụ thuộc đỉnh) mà là rút ngắn khoảng cách
// liều hoặc truyền kéo dài/liên tục — nên câu chữ của bậc này luôn nói theo hướng đó.
// LƯU Ý khi sửa câu này: chuỗi mô tả liều được AntibioticDoseCard soi tìm các cụm báo hiệu "liều
// này không tính ra con số được" — "theo nồng độ", "cá thể hoá", "giãn khoảng liều". Bản nháp đầu
// của câu dưới đây viết "không giãn khoảng liều" và vô tình khớp cụm thứ ba, khiến toàn bộ bậc ARC
// bị coi là không tính được: mất cả trần liều lẫn phần "Cách dùng" tự tính. Tránh ba cụm đó.
const ARC_TIER_NOTE = "tăng thanh thải thận — ưu tiên truyền kéo dài, giữ nguyên khoảng cách liều"
const ARC_NOTE =
  "CrCl ≥ 90 mL/phút ở bệnh nhân nhiễm khuẩn nặng (trẻ tuổi, sốt, bù nhiều dịch, sau chấn thương/bỏng) là vùng TĂNG THANH THẢI THẬN — nhóm hay bị dưới liều nhất. Với beta-lactam, cách xử trí là truyền kéo dài/liên tục hoặc rút ngắn khoảng cách liều, KHÔNG phải tăng liều mỗi lần. Đo nồng độ thuốc nếu cơ sở có."

export const ANTIBIOTICS: Antibiotic[] = [
  {
    id: "Amikacin-iv",                 
    name: "Amikacin",
    compatKey: COMPAT_KEYS.amikacin,                  
    route: "TTM",                        
    standardDose: "15-20 mg/kg mỗi 24h",
    tiers: 
      [                             
          { min: 80.01, label: "CrCl >80", dose: "15–20 mg/kg mỗi 24h" },
          { min: 60.01, label: "CrCl >60–80 ", dose: "12 mg/kg mỗi 24h" },
          { min: 40.01, label: "CrCl >40–60 ", dose: "7.5 mg/kg mỗi 24h" },
          { min: 30.01, label: "CrCl >30–40 ", dose: "4 mg/kg mỗi 24h" },
          { min: 20.01, label: "CrCl >20–30 ", dose: "7.5 mg/kg mỗi 48h" },
          { min: 10.01, label: "CrCl >10–20 ", dose: "4 mg/kg mỗi 48h" },
          { min: 0,  label: "CrCl 0 - 10",  dose: "3 mg/kg mỗi 72h (sau lọc máu)" },
      ],
    preparation: " 'Đối với người lớn, pha 500 mg amikacin vào 100-200ml dịch truyền thông thường như dung dịch NaCl 0.9% hoặc D5%. Thời gian truyền thích hợp amikacin là trong 30-60 phút' - Dược thư quốc gia 2022, tr.193",
    note: "Thời gian điều trị thường 7-10 ngày, không nên kéo dài quá 10 ngày",
    source: "Dược thư quốc gia 2022, tr.193",
    reviewedOn: "2026-08",
    warnings: [
      { text: "Người cao tuổi, trẻ nhỏ. rối loạn/suy giảm chức năng thận do có nguy cơ độc tai và thận (tránh dùng chung các nhóm độc tính tương tự)", severity: "cao" },
      { text: "Người bệnh rối loạn hoạt động cơ (nhược cơ hoặc Parkinson) - tác dụng kiểu cura (yếu cơ trầm trọng)", severity: "cao" },
      { text: "Không dùng quá liều khuyến cáo, dùng đủ nước trong thời gian điều trị", severity: "cao" }
    ],
    indications: [
      {
        diseaseId: "cap",
        standardDose: "15-20 mg/kg mỗi 24h",
        tiers: [                             
          { min: 80.01, label: "CrCl >80", dose: "15–20 mg/kg mỗi 24h" },
          { min: 60.01, label: "CrCl >60–80 ", dose: "12 mg/kg mỗi 24h" },
          { min: 40.01, label: "CrCl >40–60 ", dose: "7.5 mg/kg mỗi 24h" },
          { min: 30.01, label: "CrCl >30–40 ", dose: "4 mg/kg mỗi 24h" },
          { min: 20.01, label: "CrCl >20–30 ", dose: "7.5 mg/kg mỗi 48h" },
          { min: 10.01, label: "CrCl >10–20 ", dose: "4 mg/kg mỗi 48h" },
          { min: 0,  label: "CrCl 0 - 10",  dose: "3 mg/kg mỗi 72h (sau lọc máu)" },
        ],
        note: "Theo dõi chức năng thận thường xuyên, cân nhắc hiệu chỉnh liều thông qua định lượng nồng độ thuốc trong máu",
        source: "Viêm phổi cộng đồng BYT 2026, tr. 61",
        reviewedOn: "2026-08",
      },
    ],
    maxSingleDose: {
      amount: 1500,
      unit: "mg",
      note: "Ngưỡng tối đa ở người lớn - Dược thư quốc gia 2022",
    },
    doseWeightBasis: "actual",
    rrt: {
      ihd: "3 mg/kg mỗi 72h (sau lọc máu)",
      crrt: "LD: 10mg/kg MD 7.5mg mỗi 24-48h khi Qeff (chưa rõ) L/giờ",
      sled: "Chưa có số liệu",
      pd: "Chưa có số liệu",
      note: "Thẩm tách máu và thẩm tách màng bụng loại bỏ được amikacin, cần hiệu chỉnh liều theo Qeff và theo dõi nồng độ thuốc trong máu. Liều CRRT phụ thuộc trực tiếp tốc độ dịch thải (Qeff), MIC của vi khuẩn và chức năng thận tồn dư. Nhập Qeff ở khung Bệnh nhân và luôn đối chiếu phác đồ của cơ sở; ưu tiên đo nồng độ thuốc nếu có.",
      source: "Bệnh viện Nhiệt đới - 2021",
      reviewedOn: "2026-08",
    },
    mix: [
      {
        vialAmount: 1000,
        vialUnit: "mg",
        vialLabel: "ống",
        vialForm: "solution",
        vialVolumeMl: 4,
        defaultVolumeMl: 200,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxConc: 35,                  // 30-35 microgram/ml là nồng độ tối đa khuyến cáo để tránh độc tính thận và tai
        infuseNote: "Pha 500 mg amikacin vào 100-200ml dịch truyền, truyền tĩnh mạch trong 30-60 phút.",
      },
      {
        vialAmount: 500,
        vialUnit: "mg",
        vialLabel: "ống",
        vialForm: "solution",
        vialVolumeMl: 2,
        defaultVolumeMl: 100,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxConc: 35,                  // 30-35 microgram/ml là nồng độ tối đa khuyến cáo để tránh độc tính thận và tai
        infuseNote: "Pha 500 mg amikacin vào 100-200ml dịch truyền, truyền tĩnh mạch trong 30-60 phút.",
      },
      {
        vialAmount: 1000,
        vialUnit: "mg",
        vialLabel: "lọ",
        vialForm: "powder",
        reconstituteMl: 20,
        defaultVolumeMl: 200,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxConc: 35,                  // 30-35 microgram/ml là nồng độ tối đa khuyến cáo để tránh độc tính thận và tai
        infuseNote: "Pha 500 mg amikacin vào 100-200ml dịch truyền, truyền tĩnh mạch trong 30-60 phút.",
      },
            {
        vialAmount: 500,
        vialUnit: "mg",
        vialLabel: "lọ",
        vialForm: "powder",
        reconstituteMl: 20,
        defaultVolumeMl: 100,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        maxConc: 35,                  // 30-35 microgram/ml là nồng độ tối đa khuyến cáo để tránh độc tính thận và tai
        infuseNote: "Pha 500 mg amikacin vào 100-200ml dịch truyền, truyền tĩnh mạch trong 30-60 phút.",
      },
    ],
  },
  {
    id: "ampicillin-iv",
    name: "Ampicillin",
    compatKey: COMPAT_KEYS.ampicillin,
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 4–6h (IV)",
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `2 g mỗi 4h (${ARC_TIER_NOTE})` },
      { min: 50, label: "CrCl 50–89", dose: "1–2 g mỗi 6h" },
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
    mix: [
    {
      vialForm: "powder",
      vialLabel: "lọ",
      diluents: ["NaCl 0,9%"],
      infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút. Pha xong nên dùng ngay — ampicillin kém bền theo thời gian, đặc biệt trong dung dịch glucose nên tránh dùng làm dung môi.",
    },
    ],
  },
  {
    id: "cefotaxim-iv",
    name: "Cefotaxim",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 8h (IV)",
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `2 g mỗi 6h (${ARC_TIER_NOTE})` },
      { min: 50, label: "CrCl 50–89", dose: "1–2 g mỗi 8h" },
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
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
      }
    ],
  },
  {
    id: "ceftazidim-iv",
    name: "Ceftazidim",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    standardDose: "1–2 g mỗi 8h (IV)",
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `2 g mỗi 8h truyền kéo dài 3–4h (${ARC_TIER_NOTE})` },
      { min: 50, label: "CrCl 50–89", dose: "1–2 g mỗi 8h" },
      { min: 31, label: "CrCl 31–50", dose: "1–2 g mỗi 12h" },
      { min: 16, label: "CrCl 16–30", dose: "1 g mỗi 24h" },
      { min: 6, label: "CrCl 6–15", dose: "1 g mỗi 48h" },
      { min: 0, label: "CrCl < 6", dose: "500 mg mỗi 48h" },
    ],
    warnings: [{ text: "Phổ hẹp trên Gram dương — cân nhắc phối hợp nếu nghi ngờ tụ cầu.", severity: "trung bình" }],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
      }
    ],
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
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `2 g mỗi 8h truyền kéo dài 3h (${ARC_TIER_NOTE})` },
      { min: 50, label: "CrCl 50–89", dose: "1 g mỗi 8h" },
      { min: 25, label: "CrCl 25–49", dose: "1 g mỗi 12h" },
      { min: 10, label: "CrCl 10–24", dose: "500 mg mỗi 12h" },
      { min: 0, label: "CrCl < 10", dose: "500 mg mỗi 24h" },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Truyền tĩnh mạch trong 15–30 phút theo liều chuẩn (hoặc tiêm tĩnh mạch chậm ≥ 5 phút với liều thấp); nhiều phác đồ ICU dùng truyền kéo dài 3 giờ để tối ưu hiệu quả diệt khuẩn (PK/PD) ở nhiễm khuẩn nặng/vi khuẩn kém nhạy.",
      }
    ],
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
      { min: 90, label: "CrCl ≥ 90", dose: `15–20 mg/kg mỗi 8h (${ARC_TIER_NOTE}) — chỉnh theo AUC đo được` },
      { min: 50, label: "CrCl 50–89", dose: "15–20 mg/kg mỗi 8–12h" },
      { min: 20, label: "CrCl 20–49", dose: "15–20 mg/kg mỗi 24h" },
      { min: 0, label: "CrCl < 20", dose: "Liều nạp 20–25 mg/kg, sau đó theo nồng độ đáy" },
    ],
    // 20 mg/kg × 130 kg = 2.600 mg. Đồng thuận 2020 chặn liều duy trì một lần ở 2 g và liều nạp ở
    // 3 g — không có trần thì app in ra một liều gam trông hoàn toàn hợp lý.
    maxSingleDose: { amount: 2, unit: "g", note: "trần liều duy trì một lần theo đồng thuận IDSA/ASHP 2020" },
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
        // 25 mg/kg × 140 kg = 3.500 mg. Trần liều nạp là 3 g — cao hơn liều duy trì (2 g) vì đây là
        // liều một lần để đạt nồng độ đích nhanh, nhưng vẫn phải có điểm dừng.
        maxSingle: 3000,
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
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        // Ngưỡng trên đã nêu trong `preparation` ở trên — nhắc lại ở đây dưới dạng số để bảng pha
        // chặn được, không chỉ nằm trong câu chữ.
        maxConc: 5,
        infuseNote: "Truyền tĩnh mạch chậm, tối thiểu 60 phút cho mỗi 1 g (liều cao hơn thì kéo dài tương ứng) — truyền nhanh gây hội chứng \"Red man\". Không tiêm tĩnh mạch trực tiếp.",
      }
    ],
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
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `4.5 g mỗi 6h truyền kéo dài 3–4h (${ARC_TIER_NOTE})` },
      { min: 40, label: "CrCl 40–89", dose: "4.5 g mỗi 6h (truyền kéo dài 3–4h nếu nặng)" },
      { min: 20, label: "CrCl 20–39", dose: "3.375 g mỗi 6h" },
      { min: 0, label: "CrCl < 20", dose: "2.25 g mỗi 6h" },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Truyền tĩnh mạch trong 30 phút theo liều chuẩn; nhiều phác đồ ICU dùng truyền kéo dài 3–4 giờ để tối ưu PK/PD ở nhiễm khuẩn nặng.",
      }
    ],
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
    mix: [
      {
        // Chai truyền pha sẵn hàm lượng cố định của nhà sản xuất — không pha loãng thêm, chỉ rút một
        // phần hoặc dùng trọn chai theo đúng liều mỗi mức CrCl.
        vialForm: "fixed",
        vialLabel: "chai",
        vialAmount: 750,
        vialUnit: "mg",
        vialVolumeMl: 150,
        infuseNote: "Truyền tĩnh mạch trong tối thiểu 60 phút (750 mg) hoặc 60 phút (500 mg) — không truyền nhanh hơn.",
      }
    ],
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
    maxSingleDose: { amount: 700, unit: "mg", note: "trần một liều của phác đồ liều đơn hằng ngày; cao hơn phải theo nồng độ đo được" },
    warnings: [{ text: "Độc tính thận và tai — tránh phối hợp kéo dài với thuốc độc thận khác.", severity: "cao" }],
    mix: [
      {
        vialForm: "solution",
        vialLabel: "ống",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Pha loãng trong 50–100 mL, truyền tĩnh mạch trong 30–60 phút — không tiêm tĩnh mạch trực tiếp/nhanh.",
      }
    ],
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
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        // Không có Ringer lactat/dung dịch chứa calci trong bộ chọn — đúng cặp kết tủa đã ghi trong
        // bảng Khóa chữ Y (COMPAT_KEYS.ceftriaxone), không lặp lại ở đây.
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Tiêm tĩnh mạch chậm trong 3–5 phút hoặc truyền trong 15–30 phút.",
      }
    ],
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
  {
    id: "cefepime-iv",
    name: "Cefepim",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.cefepime,
    standardDose: "2 g mỗi 8h (IV) cho nhiễm khuẩn nặng",
    note: ARC_NOTE,
    tiers: [
      { min: 90, label: "CrCl ≥ 90", dose: `2 g mỗi 8h truyền kéo dài 3–4h (${ARC_TIER_NOTE})` },
      { min: 60, label: "CrCl 60–89", dose: "2 g mỗi 8h" },
      { min: 30, label: "CrCl 30–59", dose: "2 g mỗi 12h" },
      { min: 11, label: "CrCl 11–29", dose: "2 g mỗi 24h" },
      { min: 0, label: "CrCl ≤ 10", dose: "1 g mỗi 24h" },
    ],
    warnings: [
      {
        text:
          "Độc tính thần kinh do cefepim (bệnh não, rung giật cơ, trạng thái động kinh không co giật) — xảy ra chủ yếu khi KHÔNG giảm liều ở suy thận. Rối loạn tri giác mới xuất hiện ở bệnh nhân đang dùng cefepim phải nghĩ tới nguyên nhân này trước khi quy cho nhiễm khuẩn nặng lên.",
        severity: "cao",
      },
      { text: "Phổ trên Gram dương hạn chế với MRSA — phối hợp thêm nếu nghi ngờ tụ cầu kháng methicillin.", severity: "trung bình" },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 2,
        vialUnit: "g",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Truyền tĩnh mạch trong 30 phút theo liều chuẩn; nhiều phác đồ ICU dùng truyền kéo dài 3–4 giờ để tối ưu PK/PD ở nhiễm khuẩn nặng.",
      }
    ],
  },
  {
    id: "ampicillin-sulbactam-iv",
    name: "Ampicillin-Sulbactam",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.ampicillin,
    standardDose: "3 g mỗi 6h (IV)",
    tiers: [
      { min: 30, label: "CrCl ≥ 30", dose: "3 g mỗi 6h" },
      { min: 15, label: "CrCl 15–29", dose: "3 g mỗi 12h" },
      { min: 0, label: "CrCl < 15", dose: "3 g mỗi 24h" },
    ],
    note: "Liều 3 g gồm 2 g ampicillin + 1 g sulbactam. Phác đồ liều cao cho Acinetobacter baumannii dùng sulbactam liều rất cao — tra phác đồ riêng, không dùng bảng này.",
    warnings: [{ text: "Nguy cơ phát ban cao hơn ở bệnh nhân tăng bạch cầu đơn nhân nhiễm khuẩn.", severity: "trung bình" }],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 3,
        vialUnit: "g",
        diluents: ["NaCl 0,9%"],
        infuseNote: "Truyền tĩnh mạch trong 15–30 phút. Pha xong dùng ngay — kém bền theo thời gian, đặc biệt trong dung dịch glucose.",
      }
    ],
  },
  {
    id: "ertapenem-iv",
    name: "Ertapenem",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.carbapenem,
    standardDose: "1 g mỗi 24h (IV)",
    tiers: [
      { min: 31, label: "CrCl > 30", dose: "1 g mỗi 24h" },
      { min: 0, label: "CrCl ≤ 30", dose: "500 mg mỗi 24h" },
    ],
    note:
      "KHÔNG phủ Pseudomonas aeruginosa, Acinetobacter hay Enterococcus — đây là điểm khác biệt quan trọng nhất so với meropenem và cũng là lý do không dùng ertapenem cho nhiễm khuẩn bệnh viện nặng chưa rõ căn nguyên.",
    warnings: [{ text: "Nguy cơ co giật, nhất là khi suy thận không giảm liều hoặc có bệnh lý thần kinh trung ương.", severity: "trung bình" }],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 1,
        vialUnit: "g",
        diluents: ["NaCl 0,9%"],
        avoidDiluents: ["Glucose 5%"],
        diluentWarning: "Không hoàn nguyên hay pha loãng ertapenem bằng dung dịch chứa glucose — chỉ dùng Natri Clorid 0,9%.",
        infuseNote: "Truyền tĩnh mạch trong 30 phút. Dùng trong 6 giờ sau pha nếu để nhiệt độ phòng.",
      }
    ],
  },
  {
    id: "oxacillin-iv",
    name: "Oxacillin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.oxacillin,
    standardDose: "2 g mỗi 4h (IV) cho nhiễm khuẩn nặng",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "2 g mỗi 4h — không cần chỉnh liều thận" }],
    note:
      "Là lựa chọn ĐẦU TAY cho tụ cầu vàng nhạy methicillin (MSSA) — hiệu quả hơn vancomycin rõ rệt trong nhiễm khuẩn huyết do MSSA. Khi kháng sinh đồ trả về MSSA thì phải xuống thang từ vancomycin sang oxacillin, không giữ nguyên vancomycin.",
    warnings: [
      { text: "Viêm gan do thuốc và viêm thận kẽ khi dùng liều cao kéo dài — theo dõi men gan, creatinin và bạch cầu ái toan hằng tuần.", severity: "trung bình" },
      { text: "Gây hoại tử mô khi thoát mạch — dùng đường truyền chắc chắn.", severity: "trung bình" },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 1,
        vialUnit: "g",
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Truyền tĩnh mạch trong 30–60 phút.",
      }
    ],
  },
  {
    id: "clindamycin-iv",
    name: "Clindamycin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.clindamycin,
    standardDose: "600–900 mg mỗi 8h (IV)",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "600–900 mg mỗi 8h — không cần chỉnh liều thận" }],
    note:
      "Ức chế tổng hợp protein nên có tác dụng dập độc tố — đó là lý do phối hợp clindamycin trong viêm cân mạc hoại tử và hội chứng sốc nhiễm độc, ngoài vai trò kháng khuẩn thuần tuý.",
    warnings: [
      { text: "Nguy cơ viêm đại tràng do Clostridioides difficile cao nhất trong các kháng sinh thường dùng — cân nhắc kỹ chỉ định và thời gian dùng.", severity: "cao" },
      { text: "Có tác dụng ức chế thần kinh cơ nhẹ — có thể kéo dài tác dụng của thuốc giãn cơ.", severity: "trung bình" },
    ],
    mix: [
      {
        vialForm: "solution",
        vialLabel: "ống",
        vialAmount: 600,
        vialUnit: "mg",
        vialVolumeMl: 4,
        maxConc: 18,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Pha loãng tới nồng độ không quá 18 mg/mL, truyền trong ít nhất 30 phút cho mỗi 600 mg — không tiêm tĩnh mạch trực tiếp (nguy cơ ngừng tim).",
      }
    ],
  },
  {
    id: "doxycycline-iv",
    name: "Doxycyclin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.tetracycline,
    standardDose: "100 mg mỗi 12h (IV)",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "100 mg mỗi 12h — không cần chỉnh liều thận" }],
    note:
      "Không cần chỉnh liều ở suy thận lẫn khi lọc máu — một trong số ít kháng sinh có ưu điểm đó. Sinh khả dụng đường uống rất cao nên chuyển sang đường uống sớm khi bệnh nhân ăn được.",
    warnings: [
      { text: "Viêm thực quản nếu uống mà không đủ nước hoặc nằm ngay sau khi uống.", severity: "trung bình" },
      { text: "Nhạy cảm ánh sáng; giảm hấp thu rõ rệt khi uống cùng calci, magie, sắt hoặc thuốc kháng acid.", severity: "trung bình" },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 100,
        vialUnit: "mg",
        maxConc: 1,
        diluents: ["NaCl 0,9%", "Glucose 5%"],
        infuseNote: "Pha loãng tới nồng độ 0,1–1 mg/mL, truyền trong 1–4 giờ. Tránh ánh sáng trong lúc truyền.",
      }
    ],
  },
  {
    id: "linezolid-iv",
    name: "Linezolid",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.linezolid,
    standardDose: "600 mg mỗi 12h (IV)",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "600 mg mỗi 12h — không cần chỉnh liều thận" }],
    note:
      "Thấm vào mô phổi rất tốt nên là lựa chọn hợp lý cho viêm phổi do MRSA, đặc biệt khi bệnh nhân đã suy thận hoặc vancomycin không đạt đích. Sinh khả dụng đường uống 100% — chuyển đường uống được ngay khi bệnh nhân ăn được, cùng liều.",
    warnings: [
      {
        text:
          "Linezolid là chất ức chế MAO — phối hợp với thuốc vận mạch giao cảm (noradrenaline, adrenaline, dopamine) có thể gây đáp ứng tăng huyết áp quá mức, và phối hợp với thuốc serotonergic (fentanyl, SSRI) có thể gây hội chứng serotonin.",
        severity: "cao",
      },
      { text: "Ức chế tuỷ xương (giảm tiểu cầu, thiếu máu) khi dùng trên 10–14 ngày — kiểm tra công thức máu hằng tuần.", severity: "cao" },
      { text: "Toan lactic và bệnh thần kinh ngoại biên/thị giác khi dùng kéo dài.", severity: "trung bình" },
    ],
    mix: [
      {
        vialForm: "fixed",
        vialLabel: "túi",
        vialAmount: 600,
        vialUnit: "mg",
        vialVolumeMl: 300,
        infuseNote: "Túi pha sẵn 600 mg/300 mL — truyền trong 30–120 phút, không pha loãng thêm.",
      }
    ],
  },
  {
    id: "colistin-iv",
    name: "Colistin (Colistimethat natri)",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.colistin,
    standardDose: "Liều nạp 9 triệu đơn vị, sau đó 4,5 triệu đơn vị mỗi 12h",
    note:
      "ĐƠN VỊ LIỀU LÀ NGUỒN SAI SÓT LỚN NHẤT của thuốc này: colistin được ghi theo 'triệu đơn vị quốc tế (MIU)' ở châu Âu/Việt Nam nhưng theo 'mg colistin base (CBA)' ở Mỹ, và 1 MIU ≈ 30 mg CBA — nhầm hai đơn vị là sai liều nhiều lần. Luôn đối chiếu đơn vị ghi trên lọ thực tế. Liều nạp KHÔNG được bỏ qua kể cả ở bệnh nhân suy thận.",
    tiers: [
      { min: 50, label: "CrCl ≥ 50", dose: "4,5 triệu đơn vị mỗi 12h (sau liều nạp 9 triệu đơn vị)" },
      { min: 30, label: "CrCl 30–49", dose: "3 triệu đơn vị mỗi 12h (sau liều nạp 9 triệu đơn vị)" },
      { min: 10, label: "CrCl 10–29", dose: "2,5 triệu đơn vị mỗi 12h (sau liều nạp 9 triệu đơn vị)" },
      { min: 0, label: "CrCl < 10", dose: "1,5 triệu đơn vị mỗi 12h (sau liều nạp 9 triệu đơn vị)" },
    ],
    warnings: [
      { text: "Độc tính thận phụ thuộc liều, xảy ra ở tỷ lệ cao — theo dõi creatinin hằng ngày và tránh phối hợp thêm thuốc độc thận khác.", severity: "cao" },
      { text: "Ức chế dẫn truyền thần kinh cơ — kéo dài tác dụng giãn cơ, có thể gây yếu cơ hô hấp. Theo dõi TOF trước khi cai máy.", severity: "cao" },
      { text: "Dạng khí dung dùng để bổ trợ trong viêm phổi thở máy có liều và cách pha KHÁC hẳn đường tĩnh mạch — không dùng chung con số.", severity: "cao" },
    ],
    boluses: [
      {
        label: "Liều nạp (không bỏ qua kể cả khi suy thận)",
        unit: "đơn vị",
        fixedLow: 9000000,
        over: "Truyền tĩnh mạch trong 30–60 phút.",
        note: "9 triệu đơn vị quốc tế. Liều duy trì đầu tiên cách liều nạp 12 giờ.",
      },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        diluents: ["NaCl 0,9%"],
        infuseNote:
          "Hoàn nguyên nhẹ nhàng (lắc mạnh gây tạo bọt nhiều), pha loãng trong 50–100 mL NaCl 0,9%, truyền trong 30–60 phút. Pha xong dùng ngay — colistimethat tự thuỷ phân thành colistin có độc tính cao hơn nếu để lâu sau pha.",
      }
    ],
  },
  {
    id: "fluconazole-iv",
    name: "Fluconazole",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.azole,
    standardDose: "Liều nạp 800 mg (12 mg/kg), sau đó 400 mg mỗi 24h",
    note:
      "Không phủ được Candida krusei (kháng tự nhiên) và phần lớn Candida glabrata — với hai loài này hoặc khi bệnh nhân nặng/đã dùng azol trước đó thì phải chọn echinocandin. Liều nạp gấp đôi liều duy trì là bắt buộc, nếu không phải mất 5–7 ngày mới đạt nồng độ đích.",
    tiers: [
      { min: 50, label: "CrCl > 50", dose: "400 mg mỗi 24h (sau liều nạp 800 mg)" },
      { min: 0, label: "CrCl ≤ 50", dose: "200 mg mỗi 24h (sau liều nạp 800 mg — KHÔNG giảm liều nạp)" },
    ],
    warnings: [
      { text: "Kéo dài khoảng QT — thận trọng khi phối hợp amiodarone, quinolon, macrolid; kiểm tra kali và magie máu.", severity: "cao" },
      { text: "Ức chế CYP2C9/CYP3A4 — làm tăng nồng độ warfarin, phenytoin, midazolam và nhiều thuốc khác. Rà lại toàn bộ đơn thuốc khi bắt đầu.", severity: "cao" },
    ],
    boluses: [
      {
        label: "Liều nạp (giữ nguyên kể cả khi suy thận)",
        unit: "mg",
        perKgLow: 12,
        maxSingle: 800,
        over: "Truyền tĩnh mạch, tốc độ không quá 200 mg/giờ.",
      },
    ],
    mix: [
      {
        vialForm: "fixed",
        vialLabel: "chai",
        vialAmount: 200,
        vialUnit: "mg",
        vialVolumeMl: 100,
        infuseNote: "Chai pha sẵn 2 mg/mL — truyền với tốc độ không quá 200 mg/giờ (tức không nhanh hơn 100 mL/giờ).",
      }
    ],
  },
  {
    id: "caspofungin-iv",
    name: "Caspofungin",
    route: "Truyền tĩnh mạch (TTM)",
    compatKey: COMPAT_KEYS.echinocandin,
    standardDose: "Liều nạp 70 mg, sau đó 50 mg mỗi 24h",
    note:
      "Là lựa chọn ĐẦU TAY cho nhiễm nấm Candida xâm lấn ở bệnh nhân nặng, trước khi có định danh loài. KHÔNG cần chỉnh liều theo chức năng thận và không bị lọc bỏ khi chạy thận — nhưng PHẢI giảm liều khi suy gan mức Child-Pugh B (50 mg xuống 35 mg mỗi 24h).",
    tiers: [{ min: 0, label: "Mọi mức CrCl", dose: "50 mg mỗi 24h (sau liều nạp 70 mg) — không chỉnh theo thận, chỉnh theo CHỨC NĂNG GAN" }],
    warnings: [
      { text: "Suy gan Child-Pugh B: giảm liều duy trì còn 35 mg mỗi 24h (giữ nguyên liều nạp 70 mg). Chưa có dữ liệu cho Child-Pugh C.", severity: "cao" },
      { text: "Thấm kém vào nước tiểu, dịch não tuỷ và dịch kính — không dùng đơn độc cho nhiễm nấm tiết niệu, viêm màng não hay viêm nội nhãn do nấm.", severity: "cao" },
      { text: "Bệnh nhân trên 80 kg: một số phác đồ tăng liều duy trì lên 70 mg mỗi 24h.", severity: "trung bình" },
    ],
    boluses: [
      {
        label: "Liều nạp (giữ nguyên kể cả khi suy gan)",
        unit: "mg",
        fixedLow: 70,
        maxSingle: 70,
        over: "Truyền tĩnh mạch chậm trong khoảng 60 phút.",
      },
    ],
    mix: [
      {
        vialForm: "powder",
        vialLabel: "lọ",
        vialAmount: 50,
        vialUnit: "mg",
        diluents: ["NaCl 0,9%"],
        avoidDiluents: ["Glucose 5%"],
        diluentWarning: "Không hoàn nguyên hay pha loãng caspofungin bằng dung dịch chứa glucose — chỉ dùng Natri Clorid 0,9%.",
        infuseNote: "Hoàn nguyên rồi pha loãng trong 250 mL NaCl 0,9%, truyền chậm trong khoảng 60 phút — không tiêm tĩnh mạch trực tiếp.",
      }
    ],
  },
]
