import { describe, expect, it } from "vitest"

import { resolveConfirmTap, shouldRequireExtraConfirm } from "../confirmGate"

// P0 (nợ thiết kế DungThuocScreen, docs/superpowers/HANDOFF.md mục 15): xác nhận "liều gấp N lần
// bình thường" trước đây chỉ chặn NHÌN THẤY kết quả (biến `confirmed`), không chặn hành động ghim
// vào Đang truyền / chép câu Cách dùng — hai hành động đó cần một khoá xác nhận RIÊNG, chỉ bật khi
// severity đủ nặng. Hai hàm này là quyết định thuần đứng sau khoá đó trong InfusionCalculator.
describe("shouldRequireExtraConfirm", () => {
  it("severity extreme thì cần xác nhận thêm", () => {
    expect(shouldRequireExtraConfirm("extreme")).toBe(true)
  })

  it("severity high thì cần xác nhận thêm", () => {
    expect(shouldRequireExtraConfirm("high")).toBe(true)
  })

  it("severity ok thì KHÔNG cần", () => {
    expect(shouldRequireExtraConfirm("ok")).toBe(false)
  })

  it("severity above/below/far-below (chưa tới ngưỡng nguy hiểm) thì KHÔNG cần", () => {
    expect(shouldRequireExtraConfirm("above")).toBe(false)
    expect(shouldRequireExtraConfirm("below")).toBe(false)
    expect(shouldRequireExtraConfirm("far-below")).toBe(false)
  })

  it("severity unknown thì KHÔNG cần (không đủ dữ liệu để nói là nguy hiểm)", () => {
    expect(shouldRequireExtraConfirm("unknown")).toBe(false)
  })
})

describe("resolveConfirmTap", () => {
  it("không cần xác nhận (needsConfirm=false) thì luôn thực thi ngay, bất kể armed", () => {
    expect(resolveConfirmTap(false, false)).toBe("execute")
    expect(resolveConfirmTap(true, false)).toBe("execute")
  })

  it("cần xác nhận nhưng CHƯA armed (chạm lần 1) thì chỉ vũ trang, không thực thi", () => {
    expect(resolveConfirmTap(false, true)).toBe("arm")
  })

  it("cần xác nhận và ĐÃ armed (chạm lần 2) thì thực thi", () => {
    expect(resolveConfirmTap(true, true)).toBe("execute")
  })
})
