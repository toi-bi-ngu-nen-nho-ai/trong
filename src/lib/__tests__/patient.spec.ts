// P1 (critique /impeccable 2026-08-17T22-03, DungThuocScreen): bối cảnh bệnh nhân (cân nặng/tuổi/
// CrCl — thứ mọi phép tính liều trên màn hình đọc chung) không có tín hiệu "đã cũ" nào, khác hẳn
// isRenalStatusStale vốn đã có sẵn cho riêng tình trạng thận. isPatientStale áp dụng đúng mẫu đó
// (chỉ nhắc khi ĐÃ từng có dữ liệu và lâu chưa chạm tới — bệnh nhân mới, chưa ai nhập gì thì im
// lặng đúng hơn nhắc nhở một trạng thái chưa ai xác nhận) cho toàn bộ bản ghi bệnh nhân.
import { describe, expect, it } from "vitest"

import { EMPTY_PATIENT, isPatientStale, PATIENT_STALE_MS } from "../patient"

describe("isPatientStale", () => {
  it("bệnh nhân trống (updatedAt=0, chưa ai chạm tới) thì KHÔNG coi là cũ", () => {
    expect(isPatientStale(EMPTY_PATIENT)).toBe(false)
  })

  it("vừa cập nhật thì KHÔNG cũ", () => {
    const now = 1_000_000_000_000
    const p = { ...EMPTY_PATIENT, weight: "70", updatedAt: now - 1000 }
    expect(isPatientStale(p, now)).toBe(false)
  })

  it("đúng ngay ngưỡng PATIENT_STALE_MS thì CHƯA cũ (dùng '>', không phải '>=')", () => {
    const now = 1_000_000_000_000
    const p = { ...EMPTY_PATIENT, weight: "70", updatedAt: now - PATIENT_STALE_MS }
    expect(isPatientStale(p, now)).toBe(false)
  })

  it("quá ngưỡng PATIENT_STALE_MS thì cũ", () => {
    const now = 1_000_000_000_000
    const p = { ...EMPTY_PATIENT, weight: "70", updatedAt: now - PATIENT_STALE_MS - 1 }
    expect(isPatientStale(p, now)).toBe(true)
  })
})
