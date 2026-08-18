// Ghim đúng THỨ TỰ VĂN BẢN của lời gọi `apDungViewportChoIOS()` trong EdgelessBoard.tsx — phải
// đứng TRƯỚC `const viewManager = new ViewExtensionManager(...)`.
//
// Vì sao đây là ca kiểm ĐÁNG có, chứ không phải kiểm dư thừa: nếu một lượt tái cấu trúc trong
// tương lai dời lời gọi này xuống SAU `const viewManager`, hoặc nhét nó vào trong một
// `useEffect` (chạy sau khi component mount, tức sau khi `Viewport` đã dựng) — thì tsc vẫn biên
// dịch sạch, và TOÀN BỘ bộ test hiện có (kể cả viewport-ios.spec.ts, gọi hàm trực tiếp trong môi
// trường test cô lập) vẫn xanh, vì không ca nào trong số đó đọc EdgelessBoard.tsx làm nguồn thật.
// Nhưng trên iOS thật, hậu quả âm thầm: `SKIP_REFRESH_DURING_GESTURE` là field initializer của
// `Viewport` (xem viewport-runtime-config.spec.ts) — copy giá trị đúng MỘT LẦN lúc constructor
// chạy. Nếu override chạy sau khi `Viewport` đã dựng, `SKIP_REFRESH_DURING_GESTURE` lặng lẽ
// KHÔNG ăn nữa (trong khi `ZOOM_MIN` vẫn ăn vì đọc qua getter động) — không exception, không cảnh
// báo, chỉ là hành vi khác trên đúng phần cứng mà không CI/test nào chạy được để bắt.
//
// Đọc nguồn dưới dạng text thay vì import — cùng cách tiếp cận với
// src/__tests__/vendor-decorator.spec.ts: cái cần cưỡng chế ở đây là THỨ TỰ CÂU LỆNH trong file
// nguồn, không phải hành vi runtime (hành vi runtime của chính hàm apDungViewportChoIOS() đã có
// viewport-ios.spec.ts và viewport-runtime-config.spec.ts lo).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FILE = join(__dirname, '../EdgelessBoard.tsx')

describe('EdgelessBoard.tsx — thứ tự gọi apDungViewportChoIOS()', () => {
  it('apDungViewportChoIOS() phải đứng TRƯỚC const viewManager trong văn bản nguồn', () => {
    const nguon = readFileSync(FILE, 'utf8')

    const iGoiHam = nguon.indexOf('apDungViewportChoIOS()')
    const iViewManager = nguon.indexOf('const viewManager')

    expect(iGoiHam, 'không tìm thấy lời gọi apDungViewportChoIOS() trong EdgelessBoard.tsx').toBeGreaterThan(-1)
    expect(iViewManager, 'không tìm thấy "const viewManager" trong EdgelessBoard.tsx').toBeGreaterThan(-1)

    expect(iGoiHam).toBeLessThan(iViewManager)
  })
})
