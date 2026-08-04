import type { InfusionDrug } from "./types"
import { COMPAT_KEYS } from "./compatibility"

// ─── Thuốc giải độc ───────────────────────────────────────────────────────────
//
// Nhóm này khác mọi nhóm khác ở một điểm: nó được tra trong đúng vài phút đầu của một tình huống
// hiếm gặp, khi không ai kịp nhớ chính xác con số. Vì vậy phần `boluses` ở đây quan trọng hơn phần
// truyền liên tục, và mỗi liều đều ghi rõ CÁCH dò liều chứ không chỉ con số.
//
// Nguyên tắc chung được lặp lại trong từng mục: liều giải độc dò theo ĐÁP ỨNG LÂM SÀNG (nhịp thở,
// tri giác, huyết động), không dò theo một bảng cố định.

export const ANTIDOTES: InfusionDrug[] = [
  {
    id: "naloxone",
    name: "Naloxone",
    route: "Tiêm tĩnh mạch / tiêm bắp / truyền tĩnh mạch",
    preparation:
      "Ống 0,4 mg/1 mL. Để dò liều nhỏ, pha loãng 1 ống 0,4 mg với NaCl 0,9% vừa đủ 10 mL (nồng độ 0,04 mg/mL) rồi tiêm từng 1 mL một. Truyền liên tục: pha 2 mg vừa đủ 500 mL (4 mcg/mL).",
    doseRange:
      "Ngộ độc opioid có ức chế hô hấp: bắt đầu 0,04–0,4 mg tiêm tĩnh mạch, lặp lại mỗi 2–3 phút và TĂNG DẦN cho tới khi bệnh nhân thở đủ. Truyền duy trì: mỗi giờ truyền khoảng 2/3 tổng liều bolus đã có hiệu quả.",
    note:
      "Mục tiêu là PHỤC HỒI NHỊP THỞ, không phải đánh thức bệnh nhân tỉnh hẳn. Ở người lệ thuộc opioid, đảo ngược quá mạnh gây hội chứng cai cấp tính (kích động, nôn, tăng huyết áp, phù phổi) — nên bắt đầu từ liều nhỏ đã pha loãng và dò lên.",
    warnings: [
      {
        text:
          "Thời gian tác dụng của naloxone (30–90 phút) NGẮN HƠN hầu hết opioid — bệnh nhân có thể ức chế hô hấp trở lại sau khi đã tỉnh. Bắt buộc theo dõi liên tục ít nhất 4–6 giờ, dài hơn với opioid tác dụng kéo dài (methadone, morphine giải phóng chậm, fentanyl dán).",
        severity: "cao",
      },
      { text: "Phù phổi cấp và loạn nhịp khi đảo ngược quá nhanh ở người lệ thuộc opioid — dò từ liều nhỏ.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.naloxone,
    boluses: [
      {
        label: "Liều dò đầu tiên (có lệ thuộc opioid hoặc chưa rõ)",
        unit: "mg",
        fixedLow: 0.04,
        fixedHigh: 0.4,
        over: "Tiêm tĩnh mạch chậm, lặp lại mỗi 2–3 phút với liều tăng dần cho tới khi nhịp thở đủ.",
        note: "Dùng dung dịch đã pha loãng 0,04 mg/mL để dò được từng nấc nhỏ.",
      },
      {
        label: "Ngừng thở / nguy kịch",
        unit: "mg",
        fixedLow: 0.4,
        fixedHigh: 2,
        over: "Tiêm tĩnh mạch (hoặc tiêm bắp/trong xương nếu chưa có đường truyền), lặp lại mỗi 2–3 phút.",
        note: "Không đáp ứng sau tổng liều 10 mg thì phải xem lại chẩn đoán — nhiều khả năng nguyên nhân không phải opioid.",
      },
    ],
  },
  {
    id: "flumazenil",
    name: "Flumazenil",
    route: "Tiêm tĩnh mạch (IV)",
    preparation: "Ống 0,5 mg/5 mL — tiêm thẳng từng liều nhỏ, không cần pha loãng.",
    doseRange: "0,2 mg tiêm tĩnh mạch trong 15 giây; nếu chưa đáp ứng, lặp lại 0,1–0,2 mg mỗi phút. Tổng liều thường không quá 1 mg.",
    note:
      "Chỉ định HẸP hơn nhiều so với cảm giác thông thường: chủ yếu cho đảo ngược an thần thủ thuật bằng benzodiazepine đơn thuần ở người không lệ thuộc. Với ngộ độc nhiều thuốc hoặc bệnh nhân dùng benzodiazepine kéo dài, nguy cơ vượt lợi ích — hỗ trợ hô hấp là lựa chọn an toàn hơn.",
    warnings: [
      {
        text:
          "CO GIẬT KHÓ CẮT — nguy cơ cao ở người dùng benzodiazepine kéo dài (mất tác dụng bảo vệ chống co giật) hoặc ngộ độc kèm thuốc chống trầm cảm ba vòng. Trong hai tình huống này, flumazenil chống chỉ định.",
        severity: "cao",
      },
      { text: "Thời gian tác dụng ngắn (khoảng 1 giờ) — an thần có thể tái phát, phải theo dõi tiếp sau khi bệnh nhân đã tỉnh.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.flumazenil,
    boluses: [
      {
        label: "Liều dò",
        unit: "mg",
        fixedLow: 0.2,
        maxSingle: 0.2,
        over: "Tiêm tĩnh mạch trong 15 giây, chờ 1 phút rồi đánh giá lại.",
        note: "Lặp lại 0,1–0,2 mg mỗi phút; tổng liều thường không quá 1 mg. Kiểm tra chống chỉ định trước liều đầu tiên.",
      },
    ],
  },
  {
    id: "glucagon-antidote",
    name: "Glucagon (ngộ độc chẹn beta / chẹn kênh calci)",
    route: "Tiêm/truyền tĩnh mạch (IV)",
    preparation: "Hoàn nguyên lọ 1 mg với dung môi kèm theo. Truyền liên tục: pha trong Glucose 5% (KHÔNG dùng NaCl 0,9% với thể tích lớn theo tờ hướng dẫn của một số chế phẩm).",
    doseRange:
      "Ngộ độc chẹn beta: 3–10 mg tiêm tĩnh mạch chậm trong 3–5 phút, sau đó truyền liên tục 3–5 mg/giờ, chỉnh theo nhịp tim và huyết áp.",
    note:
      "Glucagon làm tăng co bóp cơ tim qua thụ thể riêng, KHÔNG qua thụ thể beta — đó là lý do nó còn tác dụng khi thụ thể beta đã bị chẹn hoàn toàn. Liều dùng trong ngộ độc cao gấp nhiều lần liều điều trị hạ đường huyết (1 mg), rất dễ nhầm.",
    warnings: [
      { text: "Nôn nhiều và mạnh — bảo vệ đường thở trước khi tiêm ở bệnh nhân rối loạn tri giác.", severity: "cao" },
      { text: "Tăng đường huyết và HẠ KALI máu — theo dõi kali trong khi truyền.", severity: "trung bình" },
      { text: "Cần rất nhiều lọ để đủ liều — huy động thuốc từ khoa dược ngay khi nghĩ tới chẩn đoán, đừng chờ đến lúc cần.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.glucagon,
    boluses: [
      {
        label: "Liều nạp — ngộ độc chẹn beta",
        unit: "mg",
        fixedLow: 3,
        fixedHigh: 10,
        over: "Tiêm tĩnh mạch chậm trong 3–5 phút (tiêm nhanh gây nôn dữ dội).",
        note: "Liều này cao gấp nhiều lần liều 1 mg dùng cho hạ đường huyết — kiểm tra lại chỉ định trước khi rút thuốc.",
      },
    ],
    calc: {
      weightBased: false,
      doseUnit: "mg/giờ",
      doseMin: 3,
      doseMax: 5,
      doseAbsMax: 10,
      concUnit: "mg/mL",
      concDefault: 1,
      doseTimeBasis: "giờ",
      mix: {
        vialAmount: 1,
        vialUnit: "mg",
        vialLabel: "lọ",
        vials: 5,
        volumeMl: 50,
        vialForm: "powder",
        reconstituteMl: 1,
        diluents: ["Glucose 5%"],
        stability: "Hoàn nguyên xong dùng ngay; dung dịch đã pha loãng dùng trong 24 giờ.",
        peripheralNote: "Truyền được qua đường ngoại biên.",
      },
    },
  },
  {
    id: "lipid-emulsion",
    name: "Nhũ dịch lipid 20% (ngộ độc thuốc tê — LAST)",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Chai nhũ dịch lipid 20% pha sẵn — dùng nguyên, không pha loãng. Dùng một đường truyền riêng.",
    doseRange:
      "Ngộ độc thuốc tê toàn thân (LAST): bolus 1,5 mL/kg truyền trong 2–3 phút, sau đó truyền 0,25 mL/kg/phút. Nếu huyết động chưa ổn: lặp lại bolus tối đa 2 lần và tăng tốc độ truyền gấp đôi. Tổng liều không quá khoảng 12 mL/kg.",
    note:
      "Dùng cân nặng LÝ TƯỞNG để tính liều lipid. Tiếp tục truyền thêm ít nhất 10 phút sau khi huyết động đã ổn định. Song song vẫn phải hồi sức theo phác đồ: adrenaline dùng liều THẤP hơn thường lệ (≤ 1 mcg/kg mỗi lần) và tránh vasopressin, chẹn kênh calci, chẹn beta, thuốc tê nhóm khác.",
    doseWeightBasis: "ideal",
    warnings: [
      { text: "Không trì hoãn việc gọi hỗ trợ và chuẩn bị tuần hoàn ngoài cơ thể (ECMO) trong khi truyền lipid — lipid không thay thế được hồi sức.", severity: "cao" },
      { text: "Quá tải lipid: viêm tuỵ, hội chứng thuyên tắc mỡ, ảnh hưởng kết quả xét nghiệm (mẫu máu đục). Không vượt tổng liều khoảng 12 mL/kg.", severity: "cao" },
    ],
    compatKey: COMPAT_KEYS.lipidEmulsion,
    boluses: [
      {
        label: "Bolus khởi đầu (LAST)",
        unit: "mL",
        perKgLow: 1.5,
        over: "Truyền nhanh trong 2–3 phút qua đường truyền riêng.",
        note: "Đơn vị là mL nhũ dịch 20%, tính theo cân nặng LÝ TƯỞNG. Lặp lại tối đa 2 lần nếu huyết động chưa ổn.",
      },
    ],
  },
  {
    id: "acetylcysteine-iv",
    name: "N-Acetylcystein (ngộ độc paracetamol)",
    route: "Truyền tĩnh mạch (TTM)",
    preparation: "Pha loãng trong Glucose 5% theo từng túi của phác đồ ba giai đoạn — xem liều bên dưới.",
    doseRange:
      "Phác đồ 3 túi (21 giờ): túi 1 — 150 mg/kg truyền trong 60 phút; túi 2 — 50 mg/kg truyền trong 4 giờ; túi 3 — 100 mg/kg truyền trong 16 giờ. Tổng 300 mg/kg trong 21 giờ.",
    note:
      "Hiệu quả gần như hoàn toàn nếu bắt đầu trong vòng 8 GIỜ kể từ khi uống paracetamol — đây là chỉ định phải nhìn đồng hồ. Quá 8 giờ vẫn dùng, và vẫn có lợi kể cả khi đã có tổn thương gan. Không chờ kết quả nồng độ paracetamol nếu thời điểm uống đã quá 8 giờ hoặc không xác định được.",
    warnings: [
      {
        text:
          "Phản ứng dạng phản vệ (đỏ bừng, mày đay, co thắt phế quản, tụt huyết áp) hay xảy ra trong GIỜ ĐẦU khi tốc độ truyền cao nhất — xử trí bằng cách tạm ngừng truyền, cho kháng histamin, rồi truyền lại chậm hơn. Đây thường KHÔNG phải chống chỉ định dùng tiếp.",
        severity: "cao",
      },
      { text: "Thận trọng ở bệnh nhân hen — nguy cơ co thắt phế quản cao hơn.", severity: "trung bình" },
      { text: "Quá tải dịch/hạ natri máu ở bệnh nhân cân nặng thấp do thể tích dung môi lớn — điều chỉnh thể tích pha theo cân nặng.", severity: "trung bình" },
    ],
    compatKey: COMPAT_KEYS.acetylcysteine,
    boluses: [
      {
        label: "Túi 1 — truyền trong 60 phút",
        unit: "mg",
        perKgLow: 150,
        over: "Pha loãng trong 200 mL Glucose 5%, truyền trong 60 phút (không truyền trong 15 phút như phác đồ cũ — truyền nhanh làm tăng phản ứng dạng phản vệ).",
      },
      {
        label: "Túi 2 — truyền trong 4 giờ",
        unit: "mg",
        perKgLow: 50,
        over: "Pha loãng trong 500 mL Glucose 5%, truyền đều trong 4 giờ.",
      },
      {
        label: "Túi 3 — truyền trong 16 giờ",
        unit: "mg",
        perKgLow: 100,
        over: "Pha loãng trong 1.000 mL Glucose 5%, truyền đều trong 16 giờ.",
      },
    ],
  },
]
