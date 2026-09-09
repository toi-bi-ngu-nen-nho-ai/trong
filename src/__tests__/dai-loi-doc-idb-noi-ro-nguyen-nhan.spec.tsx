// @vitest-environment happy-dom
//
// I2 (BAN-GIAO-PHIEN-SAU.md, mục 2) — băng cảnh báo cấp app (`data-testid="dai-loi-doc-idb"`, gate
// `mucsCol.loiDoc`, App.tsx) dùng câu CHUNG cố định, VỨT nguyên nhân thật (`mucsCol.loiDoc`) đi.
// `idb.ts:83` đã viết sẵn câu chẩn đoán ĐÚNG cho ca hay gặp nhất — "Một tab/cửa sổ khác đang mở app
// ở phiên bản cũ hơn — đóng tab đó rồi thử lại." — nhưng câu đó không tới được màn hình: người dùng
// bấm "Thử lại" mãi vẫn hỏng vì không ai bảo họ phải đóng tab cũ trước.
import 'fake-indexeddb/auto'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Namespace riêng CHỈ để `vi.spyOn` — App.tsx import tĩnh `idbGetAllCoKetQua` từ đúng module này.
import * as idbLib from '../lib/idb'

const HAN_GIO_MOUNT_APP_MS = 90000

vi.mock('../board/index', () => ({ VoMuc: () => null }))

describe('I2 — dải "Chưa đọc được…" cấp app phải nói RÕ nguyên nhân, không chỉ câu chung', () => {
  it('loiDoc = "đóng tab đó rồi thử lại" (ca hay gặp nhất) ⇒ băng phải nhắc đúng lời khuyên đó', async () => {
    // Mount-time: `mucsCol` (App() cấp trên) gọi `idbGetAllCoKetQua` ngay trong `useEffect` boot —
    // spy phải cài TRƯỚC khi render để bắt đúng lượt đọc đầu tiên đó.
    const spy = vi.spyOn(idbLib, 'idbGetAllCoKetQua').mockResolvedValue({
      ok: false,
      loi: 'Một tab/cửa sổ khác đang mở app ở phiên bản cũ hơn — đóng tab đó rồi thử lại.',
    })
    try {
      const { default: App } = await import('../App')
      render(<App />)
      const dai = await screen.findByTestId('dai-loi-doc-idb', {}, { timeout: HAN_GIO_MOUNT_APP_MS })
      expect(dai.textContent).toMatch(/đóng tab đó rồi thử lại/)
    } finally {
      spy.mockRestore()
    }
  }, HAN_GIO_MOUNT_APP_MS)
})
