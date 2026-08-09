import type { DiseaseEntry } from "./types"

export const DISEASES: DiseaseEntry[] = [
  { id: "cap", name: "Viêm phổi cộng đồng", antibiotics: [ "amikacin-iv" ,"ceftriaxone-iv", "azithromycin-po", "levofloxacin-iv"] },
  { id: "severe-cap", name: "Viêm phổi nặng / thở máy", antibiotics: ["pip-tazo-iv", "meropenem-iv", "levofloxacin-iv", "vancomycin-iv"] },
  { id: "sepsis", name: "Nhiễm khuẩn huyết / sốc nhiễm khuẩn", antibiotics: ["pip-tazo-iv", "meropenem-iv", "vancomycin-iv", "amikacin-iv"] },
  { id: "uti", name: "Nhiễm khuẩn tiết niệu phức tạp", antibiotics: ["ceftriaxone-iv", "ciprofloxacin-iv", "amikacin-iv"] },
  { id: "meningitis", name: "Viêm màng não vi khuẩn", antibiotics: ["cefotaxim-iv", "ceftriaxone-iv", "vancomycin-iv", "ampicillin-iv"] },
  { id: "ssti", name: "Nhiễm khuẩn da – mô mềm nặng", antibiotics: ["vancomycin-iv", "pip-tazo-iv", "ceftazidim-iv"] },
  { id: "iai", name: "Nhiễm khuẩn ổ bụng", antibiotics: ["pip-tazo-iv", "meropenem-iv", "metronidazole-iv", "ceftazidim-iv"] },
  // Bệnh lý KHÔNG dùng kháng sinh — dùng cho bước "Chỉ định" của thuốc vận mạch/co bóp (vd
  // Adrenaline: liều ngừng tim khác hẳn liều phản vệ, khác hẳn liều sốc nhiễm khuẩn — dùng chung
  // id "sepsis" ở trên cho vế sốc nhiễm khuẩn). `antibiotics: []` vì không áp dụng.
  { id: "cardiac-arrest", name: "Ngừng tim", antibiotics: [] },
  { id: "anaphylaxis", name: "Phản vệ", antibiotics: [] },
]
