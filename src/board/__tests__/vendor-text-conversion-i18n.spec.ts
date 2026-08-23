// Kiểm đúng thứ dự án sở hữu (D9): bản dịch tiếng Việt của mô tả Heading 4/5/6 trong
// `textConversionConfigs` (dùng cho SlashMenu + format bar khi gõ markdown "#### "/"##### "/"###### ",
// xem affine/rich-text/src/conversion.ts). Tiếp nối HANDOFF.md mục 23 Phần 2/3 — TDD tự động hoá
// kiểm tay cho 3/12 khoá còn lại của mục 21.
//
// Kỹ thuật NHẸ NHẤT trong ba kỹ thuật đã dùng: `textConversionConfigs` xuất CÔNG KHAI từ
// `@blocksuite/affine-rich-text` (package.json: sideEffects false, `index.ts` re-export thẳng từ
// `conversion.ts`) — import và đọc `.description` trực tiếp, KHÔNG cần dựng board/Note/DOM gì cả.
// Environment mặc định 'node' (xem vite.config.ts:301) là đủ — file này không chạm DOM.
import { describe, expect, it } from 'vitest'

import { textConversionConfigs } from '@blocksuite/affine-rich-text'

describe('textConversionConfigs — mô tả Heading 4/5/6 đã dịch tiếng Việt (HANDOFF mục 21/23)', () => {
  it('Heading 4/5/6 có description tiếng Việt đúng bản dịch đang ship', () => {
    const h4 = textConversionConfigs.find((c) => c.flavour === 'affine:paragraph' && c.type === 'h4')
    const h5 = textConversionConfigs.find((c) => c.flavour === 'affine:paragraph' && c.type === 'h5')
    const h6 = textConversionConfigs.find((c) => c.flavour === 'affine:paragraph' && c.type === 'h6')

    expect(h4?.description).toBe('Các tiêu đề cỡ chữ lớn thứ tư.')
    expect(h5?.description).toBe('Các tiêu đề cỡ chữ lớn thứ năm.')
    expect(h6?.description).toBe('Các tiêu đề cỡ chữ lớn thứ sáu.')

    // Đối chứng: bản gốc tiếng Anh không còn ở đúng vị trí đã dịch.
    expect(h4?.description).not.toBe('Headings in the 4th font size.')
  })
})
