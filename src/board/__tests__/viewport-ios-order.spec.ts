// Ghim đúng THỨ TỰ VĂN BẢN của lời gọi `apDungViewportChoIOS()` trong EdgelessBoard.tsx — phải
// đứng TRƯỚC `useEffect()` ĐẦU TIÊN của file (tức còn ở cấp module, chưa rơi vào một effect).
//
// Mốc neo ĐÃ ĐỔI ở Task 10: trước đó ca này so với `const viewManager = new ViewExtensionManager(...)`,
// khai báo ngay bên dưới trong CHÍNH file này. Task 10 dời `viewManager` (cùng hai hàm
// `layExtensions*`) sang `extensions.ts` (xem file đó) nên mốc cũ không còn tồn tại trong văn bản
// EdgelessBoard.tsx để so nữa. `useEffect()` đầu tiên là mốc thay thế đúng tinh thần bản gốc: nó
// vẫn đứng tách biệt xa lời gọi (xem số dòng trong ca kiểm dưới nếu cần), và bắt ĐÚNG kịch bản nguy
// hiểm mà chú thích gốc mô tả — "nhét vào trong một useEffect".
//
// Vì sao đây là ca kiểm ĐÁNG có, chứ không phải kiểm dư thừa: nếu một lượt tái cấu trúc trong
// tương lai nhét lời gọi này vào trong một `useEffect` (chạy sau khi component mount, tức sau khi
// `Viewport` đã dựng) — thì tsc vẫn biên dịch sạch, và TOÀN BỘ bộ test hiện có (kể cả
// viewport-ios.spec.ts, gọi hàm trực tiếp trong môi trường test cô lập) vẫn xanh, vì không ca nào
// trong số đó đọc EdgelessBoard.tsx làm nguồn thật. Nhưng trên iOS thật, hậu quả âm thầm:
// `SKIP_REFRESH_DURING_GESTURE` là field initializer của `Viewport` (xem
// viewport-runtime-config.spec.ts) — copy giá trị đúng MỘT LẦN lúc constructor chạy. Nếu override
// chạy sau khi `Viewport` đã dựng, `SKIP_REFRESH_DURING_GESTURE` lặng lẽ KHÔNG ăn nữa (trong khi
// `ZOOM_MIN` vẫn ăn vì đọc qua getter động) — không exception, không cảnh báo, chỉ là hành vi khác
// trên đúng phần cứng mà không CI/test nào chạy được để bắt.
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
  it('apDungViewportChoIOS() phải đứng TRƯỚC useEffect() đầu tiên trong văn bản nguồn', () => {
    const nguon = readFileSync(FILE, 'utf8')

    const iGoiHam = nguon.indexOf('apDungViewportChoIOS()')
    const iUseEffectDauTien = nguon.indexOf('useEffect(')

    expect(iGoiHam, 'không tìm thấy lời gọi apDungViewportChoIOS() trong EdgelessBoard.tsx').toBeGreaterThan(-1)
    expect(iUseEffectDauTien, 'không tìm thấy useEffect() nào trong EdgelessBoard.tsx').toBeGreaterThan(-1)

    expect(iGoiHam).toBeLessThan(iUseEffectDauTien)
  })
})
