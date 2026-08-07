// ─── Thông số bệnh nhân dùng chung cho cả tab "Dùng thuốc" ────────────────────
//
// Trước đây mỗi thẻ thuốc có ô cân nặng RIÊNG: bệnh nhân sốc đang chạy 3 loại vận mạch là phải gõ
// cân nặng 3 lần vào 3 chỗ khác nhau — 3 cơ hội gõ nhầm, và không có chỗ nào giữ "bệnh nhân hiện
// tại" để đối chiếu. Nay toàn bộ thông số (tuổi/cân nặng/chiều cao/giới/creatinin + tình trạng
// thận) nằm ở MỘT chỗ duy nhất, mọi máy tính liều đọc chung từ đây.
//
// Lưu xuống localStorage để không mất khi chuyển tab hay tắt/mở lại app, kèm `reset()` để xoá sạch
// khi chuyển sang bệnh nhân khác — số của bệnh nhân trước nằm nguyên đó là một kiểu sai nguy hiểm
// vì nhìn thì vẫn "có số", không có gì báo là số cũ.

import { useCallback, useEffect, useState } from "react"

export type Sex = "male" | "female"

// Phương thức điều trị thay thế thận đang dùng. Đây chính là nhóm bệnh nhân mà công thức
// Cockcroft-Gault KHÔNG áp dụng được — phải tra phác đồ riêng, không phải bậc CrCl.
export type RrtMode = "none" | "ihd" | "crrt" | "sled" | "pd"

export const RRT_LABELS: Record<RrtMode, string> = {
  none: "Không lọc máu",
  ihd: "Chạy thận chu kỳ (IHD)",
  crrt: "Lọc máu liên tục (CRRT)",
  sled: "Lọc kéo dài chậm (SLED)",
  pd: "Lọc màng bụng (PD)",
}

// Nhãn ngắn cho hàng chip — tên đầy đủ vẫn dùng ở các dòng cảnh báo trên thẻ thuốc. Năm chip tên
// dài chiếm ba hàng và không hàng nào bằng hàng nào; viết tắt thì gọn đúng một hàng rưỡi.
export const RRT_SHORT: Record<RrtMode, string> = {
  none: "Không lọc",
  ihd: "IHD",
  crrt: "CRRT",
  sled: "SLED",
  pd: "PD",
}

// CỐ Ý KHÔNG có trường tên/nhãn bệnh nhân. App chạy hoàn toàn trên máy, không đăng nhập, không
// khoá màn hình riêng — mà máy trực thì hay được chuyền tay và để trên bàn. Lưu tên hay số giường
// vào localStorage nghĩa là thông tin định danh người bệnh nằm lại trên thiết bị sau khi tắt app,
// đổi lại chỉ để tiện một chút khi đọc nhật ký. Không đáng.
// Nhãn bơm tiêm vẫn có dòng "Bệnh nhân: ......." để viết tay tại giường (xem lib/syringeLabel.ts).
export interface PatientVitals {
  age: string
  weight: string
  height: string
  sex: Sex
  scr: string
  scrUnit: "mgdl" | "umol"
  // Creatinin đang thay đổi từng ngày (tổn thương thận cấp) — Cockcroft-Gault giả định creatinin ở
  // trạng thái ổn định nên khi cờ này bật, con số CrCl không được dùng để chỉnh liều.
  akiUnstable: boolean
  rrt: RrtMode
  // Tốc độ dịch thải của CRRT (L/giờ) — liều kháng sinh trong CRRT phụ thuộc trực tiếp vào con số
  // này, nên không có nó thì mọi khuyến cáo "liều CRRT" đều thiếu vế điều kiện.
  crrtFlowLPerH: string
  updatedAt: number
  // Mốc giờ lần cuối CHẠM vào akiUnstable hoặc rrt — tách riêng khỏi updatedAt (đổi theo MỌI
  // trường, kể cả cân nặng) vì "tình trạng thận còn đúng không" là câu hỏi cần trả lời riêng: một
  // ca lọc máu bắt đầu giữa ca trực mà quên cập nhật thì mọi tra cứu kháng sinh sau đó âm thầm
  // dùng sai bậc liều. 0 nghĩa là chưa từng chạm — không nhắc nhở một trạng thái chưa ai xác nhận.
  renalUpdatedAt: number
}

export const EMPTY_PATIENT: PatientVitals = {
  age: "",
  weight: "",
  height: "",
  sex: "male",
  scr: "",
  scrUnit: "mgdl",
  akiUnstable: false,
  rrt: "none",
  crrtFlowLPerH: "",
  updatedAt: 0,
  renalUpdatedAt: 0,
}

const PATIENT_KEY = "drtrong:patient"

function loadPatient(): PatientVitals {
  try {
    const raw = localStorage.getItem(PATIENT_KEY)
    if (!raw) return EMPTY_PATIENT
    const parsed = JSON.parse(raw) as Partial<PatientVitals>
    return { ...EMPTY_PATIENT, ...parsed }
  } catch {
    return EMPTY_PATIENT
  }
}

function savePatient(p: PatientVitals): void {
  try {
    localStorage.setItem(PATIENT_KEY, JSON.stringify(p))
  } catch {
    // Hết dung lượng / chế độ riêng tư: bỏ qua, phiên hiện tại vẫn dùng được bình thường.
  }
}

// Có ít nhất một thông số đã nhập — dùng để quyết định mở sẵn hay thu gọn khung nhập, và để hiện
// nút "Bệnh nhân mới".
export function patientHasData(p: PatientVitals): boolean {
  return Boolean(p.age || p.weight || p.height || p.scr || p.akiUnstable || p.rrt !== "none")
}

export function usePatientVitals() {
  const [patient, setPatient] = useState<PatientVitals>(loadPatient)

  useEffect(() => {
    savePatient(patient)
  }, [patient])

  const setField = useCallback(<K extends keyof PatientVitals>(key: K, value: PatientVitals[K]) => {
    setPatient((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: Date.now(),
      ...(key === "rrt" || key === "akiUnstable" ? { renalUpdatedAt: Date.now() } : {}),
    }))
  }, [])

  const reset = useCallback(() => setPatient({ ...EMPTY_PATIENT }), [])

  // Nạp thẳng một bản ghi cũ — dùng cho "Hoàn tác" sau khi bấm "Bệnh nhân mới": khôi phục nguyên
  // trạng thái đã lưu, không chỉ từng trường một.
  const restore = useCallback((snapshot: PatientVitals) => setPatient(snapshot), [])

  return { patient, setField, reset, restore }
}

// ─── Chức năng thận ───────────────────────────────────────────────────────────

// 4 giờ ~ nửa ca trực thông thường. Không có ngưỡng "đúng" tuyệt đối cho việc này — chọn một mốc
// đủ ngắn để bắt được thay đổi trong CÙNG một ca (vd bắt đầu lọc máu giữa ca), đủ dài để không nhắc
// nhở phiền khi bệnh nhân chưa có gì thay đổi.
export const RENAL_STALE_MS = 4 * 60 * 60 * 1000

// true khi tình trạng thận đã từng được xác nhận (renalUpdatedAt > 0) NHƯNG quá lâu chưa xác nhận
// lại. Bệnh nhân vừa tạo, chưa ai chạm vào chức năng thận, không được tính là "cũ" — im lặng còn
// đúng hơn nhắc nhở về một trạng thái chưa ai xác nhận.
export function isRenalStatusStale(p: PatientVitals, now: number = Date.now()): boolean {
  return p.renalUpdatedAt > 0 && now - p.renalUpdatedAt > RENAL_STALE_MS
}

// 1 mg/dL = 88.42 µmol/L
export const SCR_UMOL_PER_MGDL = 88.42

export function scrToMgDl(value: number, unit: "mgdl" | "umol"): number {
  return unit === "umol" ? value / SCR_UMOL_PER_MGDL : value
}

// Cockcroft-Gault. `weightKg` là cân nặng đã chọn đúng loại (ABW hoặc AdjBW nếu béo phì) —
// xem resolveDosingWeight trong lib/bodyWeight.ts.
export function estimateCrCl(ageYears: number, weightKg: number, scrMgDl: number, sex: Sex): number | null {
  if (!(ageYears > 0) || !(weightKg > 0) || !(scrMgDl > 0)) return null
  let val = ((140 - ageYears) * weightKg) / (72 * scrMgDl)
  if (sex === "female") val *= 0.85
  return Math.round(val)
}

// Mức tin cậy của con số CrCl vừa tính. App KHÔNG được trả về một con số trông chắc chắn khi công
// thức không áp dụng được — đó là kiểu sai khó phát hiện nhất vì kết quả nhìn vẫn "bình thường".
export type CrClReliability = "ok" | "aki" | "rrt"

export function crclReliability(p: PatientVitals): CrClReliability {
  if (p.rrt !== "none") return "rrt"
  if (p.akiUnstable) return "aki"
  return "ok"
}

// Phương thức lọc mà liều thuốc phụ thuộc tốc độ dịch thải — chỉ khi đó mới hỏi ô Qeff.
export function needsCrrtFlow(rrt: RrtMode): boolean {
  return rrt === "crrt" || rrt === "sled"
}

export const CRCL_RELIABILITY_TEXT: Record<Exclude<CrClReliability, "ok">, string> = {
  aki: "Creatinin đang thay đổi (tổn thương thận cấp) — Cockcroft-Gault giả định creatinin ổn định, nên con số này KHÔNG dùng để chỉnh liều. Chỉnh theo lâm sàng, nồng độ thuốc đo được và ý kiến dược lâm sàng.",
  rrt: "Bệnh nhân đang được điều trị thay thế thận — bậc liều theo CrCl KHÔNG áp dụng. Phải tra liều theo phác đồ lọc máu của cơ sở/dược lâm sàng (liều và thời điểm dùng phụ thuộc phương thức lọc, liều lọc và thời gian buổi lọc).",
}
