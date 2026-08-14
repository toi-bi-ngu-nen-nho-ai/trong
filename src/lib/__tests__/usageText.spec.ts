import { describe, expect, it } from "vitest"

import { formatFixedUsage, formatVialUsage } from "../usageText"

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
    // Khẳng định KÈM dấu cách đứng trước, không chỉ "1 lọ": chỗ hỏng thật của hàm chị em
    // formatFixedUsage là mất đúng dấu cách đó ("…150 ml1 chai"), mà một khẳng định chỉ nhìn
    // "1 lọ" thì vẫn xanh. Đếm số đúng nhưng dính chữ vào nhau vẫn là câu "Cách dùng" sai.
    expect(text).toContain(" 1 lọ")
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

// Nhánh "dùng trọn chai" là trường hợp HAY GẶP NHẤT của mẫu 3c (Levofloxacin), nhưng trước đây
// không ca nào chạm tới nó — nên khi phần " 1 chai" rơi mất dấu cách, cả bộ cổng vẫn xanh và câu
// ship ra là "…150 ml1 chai (TTM)". Ba ca dưới khoá đúng chỗ đó: dấu cách, số nhiều, và việc
// nhánh trọn-chai phải đi tiếp tới phần tốc độ truyền chứ không return sớm.
describe("formatFixedUsage", () => {
  it("keeps a space before the bottle count when using exactly 1 bottle", () => {
    const text = formatFixedUsage({
      name: "Levofloxacin",
      vialAmount: 750,
      vialUnit: "mg",
      vialVolumeMl: 150,
      route: "TTM",
      dropsPerMin: 30,
    })
    expect(text).toBe("Levofloxacin 750 mg/150 ml 1 chai (TTM) 30 giọt/phút")
  })

  it("pools multiple bottles into the count", () => {
    const text = formatFixedUsage({
      name: "Levofloxacin",
      vialAmount: 750,
      vialUnit: "mg",
      vialVolumeMl: 150,
      vialsUsed: 2,
      route: "TTM",
      dropsPerMin: 30,
    })
    expect(text).toBe("Levofloxacin 750 mg/150 ml 2 chai (TTM) 30 giọt/phút")
  })

  it("omits the bottle count when drawing a partial dose from one bottle", () => {
    const text = formatFixedUsage({
      name: "Levofloxacin",
      vialAmount: 750,
      vialUnit: "mg",
      vialVolumeMl: 150,
      doseAmount: 500,
      route: "TTM",
      rateMlPerHour: 100,
    })
    expect(text).toBe("Levofloxacin 750 mg/150 ml lấy 500 mg (TTM) BTĐ 100 ml/h")
  })
})
