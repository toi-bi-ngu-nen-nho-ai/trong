import { createContext, useContext } from "react"
import { type PatientVitals } from "../../lib/patient"
import { type WardRecipe } from "../../lib/wardRecipes"
import { type CalcLogEntry } from "../../lib/calcLog"
import { type RunningDrug } from "../../lib/runningDrugs"

export interface DosingContextValue {
  patient: PatientVitals
  setPatientField: <K extends keyof PatientVitals>(key: K, value: PatientVitals[K]) => void
  resetPatient: () => void
  // Khác null trong lần render đầu tiên sau khi MỘT TAB KHÁC (cùng gốc) ghi đè patient qua sự kiện
  // `storage` — xem usePatientVitals.crossTabUpdatedAt. PatientPanel dùng để hiện banner riêng,
  // phân biệt với staleReason (RunningPanel, "cân nặng đã đổi") vì đây là dữ liệu bị NGỮ CẢNH KHÁC
  // ghi đè, không phải người dùng hiện tại tự sửa.
  patientChangedElsewhereAt: number | null
  dismissPatientChangedElsewhere: () => void

  // Còn khác null trong 10 giây sau khi bấm "Bệnh nhân mới" — bản sao thông số + bảng đang dùng
  // NGAY TRƯỚC lúc xoá, để dải "Hoàn tác" phục hồi lại đúng như cũ.
  resetUndo: { patient: PatientVitals; running: RunningDrug[] } | null
  undoResetPatient: () => void
  abwKg: number | null
  heightCm: number | null
  ageYears: number | null
  crcl: number | null
  // false khi bệnh nhân có tổn thương thận cấp hoặc đang lọc máu — lúc đó con số CrCl KHÔNG được
  // dùng để chọn bậc liều.
  crclUsable: boolean
  // true khi tuổi/cân nặng/chiều cao/creatinin nuôi CrCl đã bị chính app gắn cờ "implausible" (vd
  // tuổi 200) — tính MỘT LẦN ở đây, dùng chung cho PatientPanel (tô số CrCl) và AntibioticDoseCard
  // (tô bậc liều kháng sinh chọn từ nó) thay vì mỗi nơi tự gọi lại 4 hàm check giống hệt nhau trên
  // cùng input (/impeccable critique 2026-08-19T10-03, P3).
  crclInputImplausible: boolean
  openPatientPanel: () => void
  // Gấp khung bệnh nhân lại khi người dùng đã chuyển sang chọn thuốc. Khung này mở sẵn chiếm gần
  // 700px — trên điện thoại nghĩa là thẻ thuốc vừa chọn nằm dưới hơn hai màn hình cuộn.
  collapsePatientPanel: () => void
  running: RunningDrug[]
  pinRunning: (item: Omit<RunningDrug, "id" | "at">) => void
  unpinRunning: (id: string) => void
  setRunningLine: (id: string, line: number) => void
  logCalc: (entry: Omit<CalcLogEntry, "id" | "at" | "patient" | "weightKg">) => void
  // Công thức pha thực tế của người dùng, lưu theo từng thuốc — có thể nhiều công thức/thuốc (mỗi
  // khoa/mỗi cách pha một tiêu đề riêng) — xem lib/wardRecipes.ts.
  wardRecipes: Record<string, WardRecipe[]>
  // `id` bỏ trống = thêm công thức mới (tự sinh id); có `id` = ghi đè đúng công thức đó.
  saveWard: (recipe: Omit<WardRecipe, "savedAt" | "id"> & { id?: string }) => void
  clearWard: (drugId: string, recipeId: string) => void
  // Ghim/gỡ ghim một công thức làm mặc định cố định — độc lập với "lưu gần nhất" (xem
  // useActiveWardRecipe và lib/wardRecipes.ts).
  pinWard: (drugId: string, recipeId: string) => void
}

export const DosingContext = createContext<DosingContextValue | null>(null)

export function useDosing(): DosingContextValue {
  const ctx = useContext(DosingContext)
  if (!ctx) throw new Error("useDosing chỉ dùng được bên trong màn hình Dùng thuốc")
  return ctx
}

// Số CrCl / tốc độ bơm ĐẾM CHẠY từ giá trị cũ sang giá trị mới thay vì bật thẳng vào số mới
// (trước đây dùng `key` để dựng lại phần tử, kích hoạt lại hoạt ảnh `pop-value` nảy một nhịp).
// Đếm chạy nói được NHIỀU hơn "số vừa đổi" — nó cho thấy đổi TĂNG hay GIẢM và đổi bao nhiêu, đúng
// tinh thần "đừng đọc nhầm số cũ" mà pop-value đã theo đuổi, chỉ là rõ ràng hơn một bậc.
//
// `finalText` luôn là chuỗi ĐÃ ĐỊNH DẠNG THẬT (formatDoseNumber(...)/String(crcl)...) — hook này
// không tự quyết định cách hiển thị số cuối cùng, chỉ nội suy MÀN HÌNH GIỮA CHỪNG bằng `decimals`
// rồi khoá lại đúng `finalText` khi đếm xong. Nhờ vậy con số nghỉ (không đang đếm) không bao giờ
// lệch khỏi con số mà phần tính liều thật sự tin dùng.
