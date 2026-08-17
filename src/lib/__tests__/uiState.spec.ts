// @vitest-environment happy-dom
//
// P1 (nợ thiết kế DungThuocScreen, xem docs/superpowers/HANDOFF.md mục 15) chuyển dose/rateInput/
// conc/bagVolume sang useStickyState, khoá theo drug.id, để liều đang gõ sống sót qua gián đoạn.
// Bất biến mà lượt sửa đó DỰA VÀO — hai khoá khác nhau không đè lên nhau trong sessionStorage —
// chưa từng có ca kiểm nào trước lượt này, dù uiState.ts đã được dùng khắp màn Dùng thuốc từ trước.
import { beforeEach, describe, expect, it, vi } from "vitest"

import { readStickyState, writeStickyState } from "../uiState"

beforeEach(() => {
  sessionStorage.clear()
})

describe("readStickyState", () => {
  it("trả về fallback khi khoá chưa từng ghi", () => {
    expect(readStickyState("chua-tung-ghi", "mac-dinh")).toBe("mac-dinh")
  })

  it("trả đúng giá trị đã ghi bằng writeStickyState", () => {
    writeStickyState("infusion.calc.dose.noradrenaline", "0.05")
    expect(readStickyState("infusion.calc.dose.noradrenaline", "")).toBe("0.05")
  })

  it("dữ liệu JSON hỏng trong sessionStorage thì trả fallback, không văng lỗi", () => {
    sessionStorage.setItem("drtrong:ui:hong", "{khong-phai-json")
    expect(readStickyState("hong", "an-toan")).toBe("an-toan")
  })

  it("sessionStorage.getItem ném lỗi thì trả fallback, không văng lỗi", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    expect(readStickyState("bat-ky", "an-toan")).toBe("an-toan")
    spy.mockRestore()
  })
})

describe("writeStickyState — cách ly giữa các khoá", () => {
  it("hai khoá khác nhau không đè lên nhau (đúng bất biến InfusionCalculator dựa vào để khoá theo drug.id)", () => {
    writeStickyState("infusion.calc.dose.noradrenaline", "0.05")
    writeStickyState("infusion.calc.dose.vasopressin", "0.02")
    expect(readStickyState("infusion.calc.dose.noradrenaline", "")).toBe("0.05")
    expect(readStickyState("infusion.calc.dose.vasopressin", "")).toBe("0.02")
  })

  it("ghi đè cùng một khoá thì thay giá trị cũ, không cộng dồn", () => {
    writeStickyState("k", "1")
    writeStickyState("k", "2")
    expect(readStickyState("k", "")).toBe("2")
  })

  it("sessionStorage.setItem ném lỗi thì không văng lỗi ra ngoài", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => writeStickyState("k", "v")).not.toThrow()
    spy.mockRestore()
  })
})
