import { describe, expect, it } from "vitest"

import { formatVialUsage } from "../usageText"

describe("formatVialUsage", () => {
  it("shows the vial count even when exactly 1", () => {
    const text = formatVialUsage({
      name: "Cefoperazol",
      vialAmount: 2,
      vialUnit: "g",
      vialsUsed: 1,
      vialLabel: "lọ",
      diluentName: "NaCl 0,9%",
      route: "TTM",
      finalVolumeMl: 100,
      dropsPerMin: 20,
    })
    expect(text).toContain("01 lọ")
  })

  it("shows the vial count when more than 1", () => {
    const text = formatVialUsage({
      name: "Cefoperazol",
      vialAmount: 2,
      vialUnit: "g",
      vialsUsed: 3,
      vialLabel: "lọ",
      diluentName: "NaCl 0,9%",
      route: "TTM",
      finalVolumeMl: 100,
      dropsPerMin: 20,
    })
    expect(text).toContain("3 lọ")
  })

  it("omits the count when vialsUsed is not provided", () => {
    const text = formatVialUsage({
      name: "Cefoperazol",
      vialAmount: 2,
      vialUnit: "g",
      diluentName: "NaCl 0,9%",
      route: "TTM",
      finalVolumeMl: 100,
      dropsPerMin: 20,
    })
    expect(text).not.toContain("lọ")
  })
})
