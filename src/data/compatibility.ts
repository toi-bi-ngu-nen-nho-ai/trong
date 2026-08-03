// ─── Tương hợp Y-site & tương tác thuốc ───────────────────────────────────────
//
// NGUYÊN TẮC AN TOÀN CỦA BẢNG NÀY — đọc trước khi thêm dữ liệu:
//
// App chỉ khẳng định theo MỘT chiều: "KHÔNG tương hợp" / "thận trọng". App không bao giờ nói một
// cặp thuốc là "tương hợp, chạy chung được". Lý do: khẳng định sai chiều "không tương hợp" thì hậu
// quả xấu nhất là dùng thừa một nòng; khẳng định sai chiều "tương hợp" thì hậu quả là kết tủa chạy
// thẳng vào tĩnh mạch trung tâm. Cặp nào không có trong bảng, app phải nói rõ là CHƯA CÓ DỮ LIỆU —
// tuyệt đối không để im lặng bị hiểu thành an toàn.
//
// `verified: false` nghĩa là mục đó do app dựng sẵn nhưng CHƯA được đối chiếu với tài liệu gốc
// (Trissel's / King Guide / tờ hướng dẫn của nhà sản xuất / danh mục của khoa dược). Giao diện hiển
// thị rõ trạng thái này để người dùng biết mục nào còn phải kiểm chứng — thay vì phải đoán.

export interface CompatRule {
  a: string
  b: string
  verdict: "incompatible" | "caution"
  text: string
  verified: boolean
  // Bắt buộc có khi verified = true — "đã đối chiếu" mà không nói đối chiếu với cái gì thì cũng
  // vô nghĩa như không ghi nguồn.
  source?: string
}

export interface InteractionRule {
  a: string
  b: string
  severity: "cao" | "trung bình"
  text: string
  verified: boolean
  source?: string
}

// Khoá tra bảng — gắn vào từng thuốc qua `compatKey`. Dùng khoá riêng thay vì tên thuốc để tên hiển
// thị đổi (thêm "(Epinephrine)", đổi sang tên biệt dược) cũng không làm hỏng tra cứu.
export const COMPAT_KEYS = {
  noradrenaline: "noradrenaline",
  adrenaline: "adrenaline",
  dobutamine: "dobutamine",
  dopamine: "dopamine",
  vasopressin: "vasopressin",
  phenylephrine: "phenylephrine",
  milrinone: "milrinone",
  nitroglycerin: "nitroglycerin",
  nitroprusside: "nitroprusside",
  nicardipine: "nicardipine",
  amiodarone: "amiodarone",
  esmolol: "esmolol",
  lidocaine: "lidocaine",
  adenosine: "adenosine",
  insulin: "insulin",
  magnesium: "magnesium",
  potassium: "potassium",
  calcium: "calcium",
  bicarbonate: "bicarbonate",
  furosemide: "furosemide",
  phenytoin: "phenytoin",
  propofol: "propofol",
  midazolam: "midazolam",
  pantoprazole: "pantoprazole",
  heparin: "heparin",
  vancomycin: "vancomycin",
  aminoglycoside: "aminoglycoside",
  fluoroquinolone: "fluoroquinolone",
  macrolide: "macrolide",
  ceftriaxone: "ceftriaxone",
  ampicillin: "ampicillin",
  pipTazo: "pipTazo",
} as const

const K = COMPAT_KEYS

// Chạy chung một nòng (Y-site) — chỉ liệt kê các cặp KHÔNG dùng chung được hoặc cần thận trọng.
export const YSITE_RULES: CompatRule[] = [
  { a: K.calcium, b: K.bicarbonate, verdict: "incompatible", text: "Kết tủa calci carbonat — không bao giờ dùng chung đường; tráng dây bằng NaCl 0,9% giữa hai thuốc.", verified: false },
  {
    a: K.ceftriaxone,
    b: K.calcium,
    verdict: "incompatible",
    text: "KHÔNG bao giờ truyền đồng thời qua cùng một đường (Y-site) ở mọi lứa tuổi — kết tủa ceftriaxone–calci. Trẻ sơ sinh (≤ 28 ngày): chống chỉ định dùng calci đường tĩnh mạch trong vòng 48 giờ quanh ceftriaxone. Trên 28 ngày: được dùng NỐI TIẾP nhau nếu tráng kỹ dây truyền bằng dịch tương hợp giữa hai thuốc.",
    verified: true,
    source: "Tờ thông tin kê đơn Ceftriaxone (FDA, NDA 050796) — cập nhật cảnh báo 14/4/2009",
  },
  { a: K.amiodarone, b: K.bicarbonate, verdict: "incompatible", text: "Không tương hợp — amiodarone cần môi trường acid, kết tủa khi gặp dung dịch kiềm.", verified: false },
  { a: K.amiodarone, b: K.heparin, verdict: "incompatible", text: "Kết tủa khi tiếp xúc trực tiếp — dùng đường riêng.", verified: false },
  { a: K.amiodarone, b: K.furosemide, verdict: "incompatible", text: "Không tương hợp tại Y-site.", verified: false },
  { a: K.furosemide, b: K.midazolam, verdict: "incompatible", text: "Kết tủa — furosemide kiềm, midazolam acid.", verified: false },
  { a: K.furosemide, b: K.noradrenaline, verdict: "incompatible", text: "Không tương hợp — catecholamin cần môi trường acid, bị phân huỷ/kết tủa với furosemide kiềm.", verified: false },
  { a: K.furosemide, b: K.dobutamine, verdict: "incompatible", text: "Không tương hợp tại Y-site.", verified: false },
  { a: K.furosemide, b: K.adrenaline, verdict: "incompatible", text: "Không tương hợp — cùng lý do với noradrenaline (pH đối nghịch).", verified: false },
  { a: K.pantoprazole, b: K.midazolam, verdict: "incompatible", text: "Kết tủa — pantoprazole là dung dịch kiềm.", verified: false },
  { a: K.pantoprazole, b: K.calcium, verdict: "incompatible", text: "Không tương hợp — tránh dùng chung đường.", verified: false },
  { a: K.phenytoin, b: K.noradrenaline, verdict: "incompatible", text: "Phenytoin kết tủa với hầu hết dịch truyền và thuốc khác — truyền một mình, chỉ tráng bằng NaCl 0,9%.", verified: false },
  { a: K.phenytoin, b: K.insulin, verdict: "incompatible", text: "Phenytoin truyền riêng một đường, không dùng chung với bất kỳ thuốc nào.", verified: false },
  { a: K.propofol, b: K.noradrenaline, verdict: "caution", text: "Propofol là nhũ dịch lipid — ưu tiên một đường riêng; nếu buộc phải chung, hỏi dược lâm sàng cho từng cặp cụ thể.", verified: false },
  { a: K.insulin, b: K.noradrenaline, verdict: "caution", text: "Insulin hấp phụ vào dây truyền và bị pha loãng thất thường khi chung đường với thuốc chỉnh liều liên tục — nên đi đường riêng để liều thực sự đúng.", verified: false },
  { a: K.potassium, b: K.propofol, verdict: "caution", text: "Ưu tiên tách đường; kali đậm đặc luôn phải chạy qua đường có kiểm soát tốc độ riêng.", verified: false },
  {
    a: K.pipTazo,
    b: K.aminoglycoside,
    verdict: "caution",
    text: "Piperacillin/tazobactam có thể làm BẤT HOẠT aminoglycosid (tạo phức mất hoạt tính) nếu trộn chung dung dịch hoặc dùng chung Y-site ngoài đúng bảng nồng độ/dung môi đã kiểm định của nhà sản xuất. Ưu tiên hai đường truyền riêng biệt; chỉ dùng chung Y-site nếu đối chiếu đúng khuyến cáo trong tờ hướng dẫn.",
    verified: true,
    source: "Tờ thông tin kê đơn Piperacillin/Tazobactam (Pfizer, Zosyn) — mục tương kỵ với aminoglycosid",
  },
]

// Tương tác dược lý (không phải tương hợp vật lý) — hai thuốc dùng cùng lúc trên cùng người bệnh,
// kể cả khác đường truyền.
export const INTERACTION_RULES: InteractionRule[] = [
  { a: K.amiodarone, b: K.fluoroquinolone, severity: "cao", text: "Cộng gộp kéo dài QT → nguy cơ xoắn đỉnh. Theo dõi QTc, điều chỉnh kali/magie máu.", verified: false },
  { a: K.amiodarone, b: K.macrolide, severity: "cao", text: "Cộng gộp kéo dài QT → nguy cơ xoắn đỉnh. Cân nhắc thay kháng sinh nhóm khác.", verified: false },
  { a: K.amiodarone, b: K.esmolol, severity: "cao", text: "Cộng gộp ức chế nút xoang/nút nhĩ thất — nguy cơ chậm nhịp nặng, block AV. Theo dõi ECG liên tục.", verified: false },
  { a: K.esmolol, b: K.nicardipine, severity: "trung bình", text: "Cộng gộp tụt huyết áp và giảm co bóp — chỉnh từng thuốc một, không tăng đồng thời.", verified: false },
  {
    a: K.vancomycin,
    b: K.aminoglycoside,
    severity: "cao",
    text: "Cộng gộp độc tính thận — theo dõi creatinin hằng ngày, đo nồng độ thuốc, tránh phối hợp kéo dài. Đồng thuận 2020 khuyến cáo theo dõi AUC sát hơn khi buộc phải phối hợp.",
    verified: true,
    source: "Đồng thuận IDSA/ASHP/PIDS/SIDP 2020 về theo dõi điều trị vancomycin",
  },
  { a: K.magnesium, b: K.nicardipine, severity: "trung bình", text: "Cộng gộp giãn mạch/tụt huyết áp và ức chế thần kinh cơ.", verified: false },
  { a: K.insulin, b: K.potassium, severity: "trung bình", text: "Insulin đẩy kali vào tế bào — theo dõi kali máu sát khi truyền đồng thời, tránh cả hạ lẫn tăng kali.", verified: false },
  { a: K.adenosine, b: K.esmolol, severity: "trung bình", text: "Cộng gộp ức chế dẫn truyền nút nhĩ thất — nguy cơ vô tâm thu kéo dài hơn thường lệ sau bolus.", verified: false },
  {
    a: K.vancomycin,
    b: K.pipTazo,
    severity: "cao",
    text: "Phối hợp vancomycin + piperacillin/tazobactam làm tăng đáng kể nguy cơ tổn thương thận cấp so với vancomycin phối hợp cefepim hoặc meropenem (các phân tích gộp/mạng lưới ghi nhận OR khoảng 2–2,5). Theo dõi creatinin sát; cân nhắc đổi sang phối hợp khác nếu lâm sàng cho phép.",
    verified: true,
    source: "Phân tích gộp/mạng lưới nguy cơ AKI khi phối hợp vancomycin + piperacillin-tazobactam (PubMed 29088001; J Antimicrob Chemother 2025;80:47)",
  },
]

function pairMatches(rule: { a: string; b: string }, x: string, y: string): boolean {
  return (rule.a === x && rule.b === y) || (rule.a === y && rule.b === x)
}

export function findYsiteRule(x: string | undefined, y: string | undefined): CompatRule | null {
  if (!x || !y || x === y) return null
  return YSITE_RULES.find((r) => pairMatches(r, x, y)) ?? null
}

export function findInteractionRule(x: string | undefined, y: string | undefined): InteractionRule | null {
  if (!x || !y || x === y) return null
  return INTERACTION_RULES.find((r) => pairMatches(r, x, y)) ?? null
}

export const COMPAT_DISCLAIMER =
  "Bảng tương hợp/tương tác trong app là DỮ LIỆU KHỞI TẠO, chưa đối chiếu tài liệu gốc. Không tìm thấy cặp nào trong bảng KHÔNG có nghĩa là hai thuốc dùng chung được — hãy hỏi dược lâm sàng hoặc tra tài liệu tương hợp của cơ sở."
