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
  // ─── Bổ sung ───────────────────────────────────────────────────────────────
  // Trước đây bảy khoá ở trên (propofol, midazolam, pantoprazole, heparin, bicarbonate, furosemide,
  // phenytoin) được khai ở đây và có luật Y-site hẳn hoi, nhưng KHÔNG thuốc nào trong app mang các
  // khoá đó — nghĩa là không có cách nào ghim chúng vào bảng "Đang truyền", nên đúng những cặp kết
  // tủa quan trọng nhất không bao giờ kích hoạt được. Nay các nhóm An thần / Thần kinh / Khác /
  // Giải độc đã mang đủ khoá, và danh sách dưới đây là phần mở rộng cho các thuốc mới thêm.
  fentanyl: "fentanyl",
  morphine: "morphine",
  ketamine: "ketamine",
  dexmedetomidine: "dexmedetomidine",
  rocuronium: "rocuronium",
  cisatracurium: "cisatracurium",
  levetiracetam: "levetiracetam",
  mannitol: "mannitol",
  hypertonicSaline: "hypertonicSaline",
  hydrocortisone: "hydrocortisone",
  tranexamic: "tranexamic",
  labetalol: "labetalol",
  digoxin: "digoxin",
  paracetamol: "paracetamol",
  enoxaparin: "enoxaparin",
  naloxone: "naloxone",
  flumazenil: "flumazenil",
  glucagon: "glucagon",
  lipidEmulsion: "lipidEmulsion",
  acetylcysteine: "acetylcysteine",
  carbapenem: "carbapenem",
  cefepime: "cefepime",
  clindamycin: "clindamycin",
  linezolid: "linezolid",
  colistin: "colistin",
  azole: "azole",
  echinocandin: "echinocandin",
  tetracycline: "tetracycline",
  oxacillin: "oxacillin",
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
  // ─── Cặp bổ sung theo các nhóm thuốc mới ────────────────────────────────────
  // Catecholamin cần môi trường acid — mọi dung dịch kiềm mạnh đều phân huỷ/kết tủa chúng. Trước
  // đây bảng chỉ ghi được vế furosemide vì bicarbonat không có thuốc nào mang khoá.
  { a: K.bicarbonate, b: K.noradrenaline, verdict: "incompatible", text: "Natri bicarbonat là dung dịch kiềm mạnh — phân huỷ catecholamin. Đường riêng, tráng dây bằng NaCl 0,9% nếu buộc dùng nối tiếp.", verified: false },
  { a: K.bicarbonate, b: K.adrenaline, verdict: "incompatible", text: "Cùng lý do với noradrenaline — catecholamin bị phân huỷ trong môi trường kiềm.", verified: false },
  { a: K.bicarbonate, b: K.dobutamine, verdict: "incompatible", text: "Không tương hợp — dobutamine kém bền trong dung dịch kiềm.", verified: false },
  { a: K.bicarbonate, b: K.dopamine, verdict: "incompatible", text: "Không tương hợp — dopamine bị phân huỷ trong môi trường kiềm.", verified: false },
  // Propofol là nhũ dịch lipid: gần như mọi cặp đều nên đi đường riêng, và đây là thuốc chạy liên
  // tục nhiều nhất ở ICU nên phải nói rõ thay vì để bảng im lặng.
  { a: K.propofol, b: K.adrenaline, verdict: "caution", text: "Nhũ dịch lipid — ưu tiên đường riêng; trộn chung có thể phá vỡ nhũ tương (tách pha, kết bông).", verified: false },
  { a: K.propofol, b: K.pipTazo, verdict: "caution", text: "Nhũ dịch lipid — ưu tiên đường riêng cho propofol, không dùng chung với kháng sinh truyền ngắt quãng.", verified: false },
  { a: K.propofol, b: K.vancomycin, verdict: "caution", text: "Ưu tiên đường riêng — nguy cơ phá vỡ nhũ tương; vancomycin cũng cần đường truyền có kiểm soát tốc độ.", verified: false },
  { a: K.propofol, b: K.bicarbonate, verdict: "incompatible", text: "Dung dịch kiềm phá vỡ nhũ tương lipid — không dùng chung đường.", verified: false },
  // Phenytoin: kết tủa với gần như mọi thứ, kể cả glucose. Chỉ tráng bằng NaCl 0,9%.
  { a: K.phenytoin, b: K.midazolam, verdict: "incompatible", text: "Phenytoin truyền một mình — kết tủa khi tiếp xúc trực tiếp với hầu hết thuốc khác.", verified: false },
  { a: K.phenytoin, b: K.propofol, verdict: "incompatible", text: "Phenytoin truyền một mình, chỉ tráng dây bằng NaCl 0,9%.", verified: false },
  { a: K.phenytoin, b: K.heparin, verdict: "incompatible", text: "Kết tủa — phenytoin phải đi đường riêng hoàn toàn.", verified: false },
  { a: K.phenytoin, b: K.dobutamine, verdict: "incompatible", text: "Kết tủa — phenytoin phải đi đường riêng hoàn toàn.", verified: false },
  // Pantoprazole là dung dịch kiềm — cùng nhóm vấn đề với bicarbonat.
  { a: K.pantoprazole, b: K.noradrenaline, verdict: "incompatible", text: "Pantoprazole là dung dịch kiềm — không dùng chung đường với catecholamin.", verified: false },
  { a: K.pantoprazole, b: K.adrenaline, verdict: "incompatible", text: "Cùng lý do với noradrenaline (pH đối nghịch).", verified: false },
  // Heparin: cặp kết tủa hay gặp nhất ngoài amiodarone.
  { a: K.heparin, b: K.vancomycin, verdict: "incompatible", text: "Kết tủa tại Y-site — tráng dây bằng NaCl 0,9% giữa hai thuốc hoặc dùng nòng riêng.", verified: false },
  { a: K.heparin, b: K.aminoglycoside, verdict: "caution", text: "Heparin có thể bất hoạt aminoglycosid khi trộn chung dung dịch — không pha chung, ưu tiên đường riêng.", verified: false },
  { a: K.heparin, b: K.labetalol, verdict: "incompatible", text: "Không tương hợp tại Y-site — dùng đường riêng.", verified: false },
  // Furosemide (kiềm) — bổ sung các cặp còn thiếu so với danh sách catecholamin/an thần.
  { a: K.furosemide, b: K.dopamine, verdict: "incompatible", text: "Không tương hợp — cùng lý do pH đối nghịch với các catecholamin khác.", verified: false },
  { a: K.furosemide, b: K.labetalol, verdict: "incompatible", text: "Kết tủa tại Y-site — furosemide kiềm, labetalol acid.", verified: false },
  { a: K.furosemide, b: K.morphine, verdict: "incompatible", text: "Kết tủa tại Y-site — dùng đường riêng hoặc tráng dây giữa hai thuốc.", verified: false },
  // Giãn cơ: mất tác dụng giãn cơ giữa chừng do kết tủa là tình huống không được phép xảy ra.
  { a: K.rocuronium, b: K.bicarbonate, verdict: "incompatible", text: "Kết tủa trong môi trường kiềm — tráng dây bằng NaCl 0,9% trước và sau khi tiêm giãn cơ.", verified: false },
  { a: K.rocuronium, b: K.furosemide, verdict: "incompatible", text: "Kết tủa tại Y-site — dùng đường riêng.", verified: false },
  { a: K.cisatracurium, b: K.bicarbonate, verdict: "incompatible", text: "Cisatracurium cần môi trường acid để bền — dung dịch kiềm làm mất hoạt lực.", verified: false },
  { a: K.cisatracurium, b: K.propofol, verdict: "caution", text: "Ưu tiên đường riêng — cisatracurium kém bền khi pha loãng ngoài môi trường acid.", verified: false },
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
  // ─── Tương tác bổ sung theo các nhóm thuốc mới ──────────────────────────────
  // Linezolid là chất ức chế MAO không chọn lọc, có hồi phục — đây là tương tác hay bị bỏ sót nhất
  // vì người ta xếp nó vào "kháng sinh" chứ không nghĩ tới trục thần kinh.
  { a: K.linezolid, b: K.noradrenaline, severity: "cao", text: "Linezolid ức chế MAO — có thể gây đáp ứng tăng huyết áp quá mức với thuốc vận mạch giao cảm. Chỉnh liều vận mạch từng nấc nhỏ và theo dõi huyết áp sát hơn thường lệ.", verified: false },
  { a: K.linezolid, b: K.adrenaline, severity: "cao", text: "Cùng cơ chế ức chế MAO — nguy cơ tăng huyết áp kịch phát khi phối hợp thuốc giao cảm.", verified: false },
  { a: K.linezolid, b: K.dopamine, severity: "cao", text: "Dopamine là cơ chất của MAO — linezolid làm tăng mạnh đáp ứng tăng huyết áp.", verified: false },
  { a: K.linezolid, b: K.fentanyl, severity: "cao", text: "Nguy cơ hội chứng serotonin khi phối hợp linezolid với opioid có hoạt tính serotonin. Theo dõi sốt, rung giật cơ, kích thích thần kinh.", verified: false },
  // Colistin: độc thận cộng gộp và kéo dài giãn cơ — hai vấn đề khác nhau, ghi tách.
  { a: K.colistin, b: K.aminoglycoside, severity: "cao", text: "Cộng gộp độc tính thận — tránh phối hợp nếu còn lựa chọn khác; theo dõi creatinin hằng ngày.", verified: false },
  { a: K.colistin, b: K.vancomycin, severity: "cao", text: "Cộng gộp độc tính thận — theo dõi creatinin hằng ngày và cân nhắc phác đồ thay thế.", verified: false },
  { a: K.colistin, b: K.rocuronium, severity: "cao", text: "Polymyxin ức chế dẫn truyền thần kinh cơ — kéo dài tác dụng giãn cơ, nguy cơ chậm rút ống. Theo dõi TOF trước khi cai máy.", verified: false },
  { a: K.colistin, b: K.cisatracurium, severity: "cao", text: "Cùng cơ chế — kéo dài giãn cơ, theo dõi TOF trước khi cai máy.", verified: false },
  { a: K.clindamycin, b: K.rocuronium, severity: "trung bình", text: "Clindamycin có tác dụng ức chế thần kinh cơ nhẹ — có thể kéo dài giãn cơ.", verified: false },
  { a: K.magnesium, b: K.rocuronium, severity: "cao", text: "Magie ức chế giải phóng acetylcholine tại synap thần kinh cơ — kéo dài rõ rệt tác dụng giãn cơ. Giảm liều giãn cơ và theo dõi TOF.", verified: false },
  { a: K.magnesium, b: K.cisatracurium, severity: "cao", text: "Cùng cơ chế — magie kéo dài đáng kể tác dụng giãn cơ.", verified: false },
  // Trục QT — bổ sung các thuốc mới vào nhóm đã có sẵn amiodarone × quinolon/macrolid.
  { a: K.azole, b: K.amiodarone, severity: "cao", text: "Cộng gộp kéo dài QT, đồng thời fluconazole ức chế chuyển hoá amiodarone. Theo dõi QTc, điều chỉnh kali/magie máu.", verified: false },
  { a: K.azole, b: K.fluoroquinolone, severity: "trung bình", text: "Cộng gộp kéo dài QT — theo dõi QTc khi buộc phải phối hợp.", verified: false },
  // Digoxin — hai tương tác kinh điển, đều nguy hiểm.
  { a: K.digoxin, b: K.amiodarone, severity: "cao", text: "Amiodarone làm TĂNG nồng độ digoxin (thường gấp đôi) — giảm nửa liều digoxin khi bắt đầu amiodarone và đo nồng độ.", verified: false },
  { a: K.digoxin, b: K.calcium, severity: "cao", text: "Calci tĩnh mạch trên nền digoxin có thể gây loạn nhịp thất nặng — tránh bolus calci nhanh ở bệnh nhân đang dùng digoxin trừ khi có chỉ định sinh mạng.", verified: false },
  { a: K.digoxin, b: K.esmolol, severity: "trung bình", text: "Cộng gộp ức chế nút nhĩ thất — nguy cơ chậm nhịp/block. Theo dõi ECG.", verified: false },
  // An thần/giảm đau — cộng gộp tụt huyết áp và ức chế hô hấp là chuyện xảy ra hằng đêm ở ICU.
  { a: K.propofol, b: K.fentanyl, severity: "trung bình", text: "Cộng gộp tụt huyết áp và ức chế hô hấp — giảm liều cả hai khi dùng cùng, chỉnh từng thuốc một.", verified: false },
  { a: K.propofol, b: K.midazolam, severity: "trung bình", text: "Cộng gộp an thần sâu và tụt huyết áp — tránh tăng đồng thời hai thuốc.", verified: false },
  { a: K.dexmedetomidine, b: K.esmolol, severity: "cao", text: "Cộng gộp chậm nhịp tim và tụt huyết áp — dexmedetomidine gây chậm nhịp qua trục giao cảm trung ương. Theo dõi ECG liên tục.", verified: false },
  { a: K.dexmedetomidine, b: K.digoxin, severity: "trung bình", text: "Cộng gộp chậm nhịp — theo dõi nhịp tim khi bắt đầu dexmedetomidine.", verified: false },
  // Kháng đông.
  { a: K.heparin, b: K.tranexamic, severity: "cao", text: "Hai thuốc tác dụng ngược chiều lên đông máu — chỉ dùng cùng khi có chỉ định rõ ràng và hội chẩn; xem lại chỉ định của cả hai.", verified: false },
  { a: K.heparin, b: K.enoxaparin, severity: "cao", text: "Chồng liều kháng đông — không dùng đồng thời trừ giai đoạn chuyển đổi có kế hoạch rõ ràng.", verified: false },
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
