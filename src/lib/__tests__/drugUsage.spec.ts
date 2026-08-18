// @vitest-environment happy-dom
//
// sortGroupsByUsage/recordAbxGroupUse đọc/ghi `localStorage` thật — environment mặc định của dự án
// là "node" (vite.config.ts), không có localStorage toàn cục, nên ca kiểm của module này cần happy-dom.
import { beforeEach, describe, expect, it, vi } from "vitest"

import { recordAbxGroupUse, sortGroupsByUsage } from "../drugUsage"
import { recordTabUse } from "../tabUsage"

beforeEach(() => {
  localStorage.clear()
})

describe("sortGroupsByUsage", () => {
  it("trả mảng rỗng khi đầu vào rỗng", () => {
    expect(sortGroupsByUsage([])).toEqual([])
  })

  it("mọi đếm bằng 0 (chưa dùng) thì giữ nguyên thứ tự đầu vào", () => {
    const items = [{ name: "Amikacin" }, { name: "Azithromycin" }, { name: "Vancomycin" }]
    expect(sortGroupsByUsage(items)).toEqual(items)
  })

  it("sắp giảm dần theo số lần đã chọn", () => {
    const items = [{ name: "Amikacin" }, { name: "Azithromycin" }, { name: "Vancomycin" }]
    recordAbxGroupUse("Vancomycin")
    recordAbxGroupUse("Vancomycin")
    recordAbxGroupUse("Azithromycin")
    expect(sortGroupsByUsage(items).map((x) => x.name)).toEqual(["Vancomycin", "Azithromycin", "Amikacin"])
  })

  it("đếm bằng nhau ở một cặp thì giữ thứ tự gốc của cặp đó (stable)", () => {
    const items = [{ name: "Amikacin" }, { name: "Azithromycin" }, { name: "Vancomycin" }]
    recordAbxGroupUse("Vancomycin")
    recordAbxGroupUse("Amikacin")
    // Azithromycin chưa dùng lần nào (đếm 0), Amikacin và Vancomycin cùng đếm 1 — Amikacin phải
    // đứng trước Vancomycin vì đứng trước ở mảng gốc.
    expect(sortGroupsByUsage(items).map((x) => x.name)).toEqual(["Amikacin", "Vancomycin", "Azithromycin"])
  })

  it("không sửa mảng đầu vào (trả mảng mới)", () => {
    const items = [{ name: "Amikacin" }, { name: "Azithromycin" }]
    const sorted = sortGroupsByUsage(items)
    expect(sorted).not.toBe(items)
    expect(items.map((x) => x.name)).toEqual(["Amikacin", "Azithromycin"])
  })

  it("dùng khoá localStorage RIÊNG với tabUsage — không lẫn đếm giữa hai bộ", () => {
    recordTabUse("Vancomycin")
    recordTabUse("Vancomycin")
    recordTabUse("Vancomycin")
    const items = [{ name: "Amikacin" }, { name: "Vancomycin" }]
    // recordTabUse ghi vào bộ đếm khác — Vancomycin vẫn đếm 0 ở đây, giữ nguyên thứ tự gốc.
    expect(sortGroupsByUsage(items)).toEqual(items)
  })
})

describe("recordAbxGroupUse", () => {
  it("gọi hai lần cùng tên thì đếm là 2", () => {
    recordAbxGroupUse("Vancomycin")
    recordAbxGroupUse("Vancomycin")
    expect(sortGroupsByUsage([{ name: "Vancomycin" }, { name: "Amikacin" }]).map((x) => x.name)).toEqual([
      "Vancomycin",
      "Amikacin",
    ])
  })

  it("localStorage.setItem ném lỗi thì không văng lỗi ra ngoài", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => recordAbxGroupUse("Amikacin")).not.toThrow()
    spy.mockRestore()
  })

  it("localStorage.getItem ném lỗi thì sortGroupsByUsage vẫn trả về thứ tự gốc, không văng lỗi", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    const items = [{ name: "Amikacin" }, { name: "Vancomycin" }]
    expect(sortGroupsByUsage(items)).toEqual(items)
    spy.mockRestore()
  })
})
