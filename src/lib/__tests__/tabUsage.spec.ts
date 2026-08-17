// @vitest-environment happy-dom
//
// sortByUsage/recordTabUse đọc/ghi `localStorage` thật — environment mặc định của dự án là "node"
// (vite.config.ts), không có localStorage toàn cục, nên ca kiểm của module này cần happy-dom.
import { beforeEach, describe, expect, it, vi } from "vitest"

import { recordTabUse, sortByUsage } from "../tabUsage"

beforeEach(() => {
  localStorage.clear()
})

describe("sortByUsage", () => {
  it("trả mảng rỗng khi đầu vào rỗng", () => {
    expect(sortByUsage([])).toEqual([])
  })

  it("mọi đếm bằng 0 (chưa dùng) thì giữ nguyên thứ tự đầu vào", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(sortByUsage(items)).toEqual(items)
  })

  it("sắp giảm dần theo số lần đã dùng", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    recordTabUse("c")
    recordTabUse("c")
    recordTabUse("b")
    expect(sortByUsage(items).map((x) => x.id)).toEqual(["c", "b", "a"])
  })

  it("đếm bằng nhau ở một cặp thì giữ thứ tự gốc của cặp đó (stable)", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    recordTabUse("c")
    recordTabUse("a")
    // b không được dùng lần nào (đếm 0), a và c cùng đếm 1 — a phải đứng trước c vì a đứng trước
    // c ở mảng gốc.
    expect(sortByUsage(items).map((x) => x.id)).toEqual(["a", "c", "b"])
  })

  it("không sửa mảng đầu vào (trả mảng mới)", () => {
    const items = [{ id: "a" }, { id: "b" }]
    const sorted = sortByUsage(items)
    expect(sorted).not.toBe(items)
    expect(items.map((x) => x.id)).toEqual(["a", "b"])
  })
})

describe("recordTabUse", () => {
  it("gọi hai lần cùng id thì đếm là 2", () => {
    recordTabUse("vasoactive")
    recordTabUse("vasoactive")
    expect(sortByUsage([{ id: "vasoactive" }, { id: "other" }]).map((x) => x.id)).toEqual(["vasoactive", "other"])
  })

  it("localStorage.setItem ném lỗi thì không văng lỗi ra ngoài", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => recordTabUse("a")).not.toThrow()
    spy.mockRestore()
  })

  it("localStorage.getItem ném lỗi thì sortByUsage vẫn trả về thứ tự gốc, không văng lỗi", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    const items = [{ id: "a" }, { id: "b" }]
    expect(sortByUsage(items)).toEqual(items)
    spy.mockRestore()
  })
})
