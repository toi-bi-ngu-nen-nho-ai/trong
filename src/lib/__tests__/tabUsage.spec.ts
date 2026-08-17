// @vitest-environment happy-dom
//
// sortByUsage/recordTabUse đọc/ghi `localStorage` thật — environment mặc định của dự án là "node"
// (vite.config.ts), không có localStorage toàn cục, nên ca kiểm của module này cần happy-dom.
import { beforeEach, describe, expect, it, vi } from "vitest"

import { recordTabUse, reconcileOrder, sortByUsage } from "../tabUsage"

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

// P2 (nợ thiết kế DungThuocScreen, critique /impeccable 2026-08-17T17-38): orderedTabs trước đây
// tính lại bằng sortByUsage() mỗi lần DungThuocScreen DỰNG — nhưng màn này bị gỡ khỏi cây mỗi lần
// rời màn hình, nên hàng tab có thể xáo trộn giữa hai lượt ghé thăm trong CÙNG một ca trực, không
// chỉ giữa các ca. reconcileOrder() giữ một thứ tự đã "đóng băng" (lưu id vào sessionStorage) ổn
// định suốt phiên, mà vẫn không bao giờ làm mất một tab nếu MIXING_TABS đổi giữa chừng (bản cập
// nhật ứng dụng).
describe("reconcileOrder", () => {
  it("không có id nào đã lưu thì giữ nguyên thứ tự đầu vào", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(reconcileOrder(items, []).map((x) => x.id)).toEqual(["a", "b", "c"])
  })

  it("sắp theo đúng thứ tự id đã lưu", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(reconcileOrder(items, ["c", "a", "b"]).map((x) => x.id)).toEqual(["c", "a", "b"])
  })

  it("id đã lưu nhưng KHÔNG còn trong items (đã bị xoá khỏi danh mục) thì bỏ qua, không văng lỗi", () => {
    const items = [{ id: "a" }, { id: "b" }]
    expect(reconcileOrder(items, ["z", "b", "a"]).map((x) => x.id)).toEqual(["b", "a"])
  })

  it("id MỚI trong items nhưng chưa có trong bản lưu (thêm nhóm mới) được nối vào CUỐI, không bị mất", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(reconcileOrder(items, ["b"]).map((x) => x.id)).toEqual(["b", "a", "c"])
  })

  it("id trùng lặp trong bản lưu chỉ tính một lần", () => {
    const items = [{ id: "a" }, { id: "b" }]
    expect(reconcileOrder(items, ["a", "a", "b"]).map((x) => x.id)).toEqual(["a", "b"])
  })
})
