import type { DiseaseEntry } from "./types"

export const DISEASES: DiseaseEntry[] = [
  { id: "cap", name: "Viêm phổi cộng đồng", antibiotics: [ "amikacin-iv" ,"ceftriaxone-iv", "azithromycin-po", "levofloxacin-iv"] },
  { id: "severe-cap", name: "Viêm phổi nặng / thở máy", antibiotics: ["pip-tazo-iv", "meropenem-iv", "levofloxacin-iv", "vancomycin-iv"] },
  { id: "sepsis", name: "Nhiễm khuẩn huyết / sốc nhiễm khuẩn", antibiotics: ["pip-tazo-iv", "meropenem-iv", "vancomycin-iv", "amikacin-iv"] },
  { id: "uti", name: "Nhiễm khuẩn tiết niệu phức tạp", antibiotics: ["ceftriaxone-iv", "ciprofloxacin-iv", "amikacin-iv"] },
  { id: "meningitis", name: "Viêm màng não vi khuẩn", antibiotics: ["cefotaxim-iv", "ceftriaxone-iv", "vancomycin-iv", "ampicillin-iv"] },
  { id: "ssti", name: "Nhiễm khuẩn da – mô mềm nặng", antibiotics: ["vancomycin-iv", "pip-tazo-iv", "ceftazidim-iv"] },
  // metronidazole-iv VÀ metronidazole-po cùng liệt kê: Metronidazole là kháng sinh duy nhất có 2
  // đường dùng trong danh mục — thiếu "metronidazole-po" ở đây khiến bước "Chỉ định" lọc nhóm
  // Metronidazole (2 mục) xuống còn đúng 1, InfusionCategoryScreen/AntibioticsScreen tự động chọn
  // luôn IV và không bao giờ hiện bước "Đường dùng" để chọn Uống — đường Uống trở nên không thể
  // chạm tới qua luồng thường (chỉ tới được qua Tìm xuyên tab, vốn bỏ qua bước Chỉ định). Đây là
  // ca duy nhất trong dữ liệu hiện có nên chưa có khung kiểm tra tự động cho lỗi dạng này.
  { id: "iai", name: "Nhiễm khuẩn ổ bụng", antibiotics: ["pip-tazo-iv", "meropenem-iv", "metronidazole-iv", "metronidazole-po", "ceftazidim-iv"] },
  // Bệnh lý KHÔNG dùng kháng sinh — dùng cho bước "Chỉ định" của thuốc vận mạch/co bóp (vd
  // Adrenaline: liều ngừng tim khác hẳn liều phản vệ, khác hẳn liều sốc nhiễm khuẩn — dùng chung
  // id "sepsis" ở trên cho vế sốc nhiễm khuẩn). `antibiotics: []` vì không áp dụng.
  { id: "cardiac-arrest", name: "Ngừng tim", antibiotics: [] },
  { id: "anaphylaxis", name: "Phản vệ", antibiotics: [] },
]
