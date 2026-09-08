import type { FlashCard } from "./types"

// `specialty` phải khớp đúng Specialty.name (tiếng Việt, xem specialties.ts) — trước đây các thẻ này
// dùng tên chuyên khoa tiếng Anh ("Cardiology", "Pulmonology"...) nên không bao giờ khớp được khi lọc
// theo chuyên khoa.
export const FLASHCARDS: FlashCard[] = [
  {
    id: "fc1",
    front: "Tiêu chuẩn ECG chẩn đoán STEMI là gì?",
    back: "ST chênh lên ≥1 mm ở ≥2 chuyển đạo chi liên tiếp, hoặc ≥2 mm ở ≥2 chuyển đạo trước tim liên tiếp. Block nhánh trái mới xuất hiện được coi tương đương STEMI.",
    specialty: "Tim mạch",
    due: true,
  },
  {
    id: "fc2",
    front: "Thang điểm CURB-65 dùng để làm gì?",
    back: "Đánh giá độ nặng viêm phổi cộng đồng: Confusion (lú lẫn), Urea >7 mmol/L, RR ≥30, BP <90/60, Age ≥65. Điểm ≥2 nên cân nhắc nhập viện.",
    specialty: "Hô hấp",
    due: true,
  },
  {
    id: "fc3",
    front: "Điều trị đầu tay cho đái tháo đường type 2?",
    back: "Metformin (nếu eGFR ≥30) kết hợp thay đổi lối sống. Nếu HbA1c >10% hoặc có triệu chứng, phối hợp thêm thuốc thứ hai (GLP-1 RA, SGLT-2i, hoặc insulin) ngay từ đầu.",
    specialty: "Nội tiết",
    due: false,
  },
  {
    id: "fc4",
    front: "Định nghĩa sốc nhiễm khuẩn theo Sepsis-3?",
    back: "Sốc nhiễm khuẩn = nhiễm khuẩn huyết + cần vận mạch để duy trì MAP ≥65 mmHg + lactate máu >2 mmol/L dù đã bù dịch đầy đủ.",
    specialty: "Hồi sức - Cấp cứu",
    due: true,
  },
  {
    id: "fc5",
    front: "Cửa sổ thời gian dùng tPA trong đột quỵ thiếu máu não?",
    back: "Alteplase truyền tĩnh mạch trong vòng 4.5 giờ từ khi khởi phát (3 giờ nếu bệnh nhân >80 tuổi, có tiền sử đột quỵ + đái tháo đường, đang dùng kháng đông, hoặc NIHSS >25). Mục tiêu door-to-needle <60 phút.",
    specialty: "Thần kinh",
    due: false,
  },
]
