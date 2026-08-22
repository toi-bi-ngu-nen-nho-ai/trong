// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 2 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): tạo
// Note thật qua công cụ toolbar (không gọi thẳng store.addBlock), gõ "/", xác nhận SlashMenu build
// đúng — có mục chèn Database, không lỗi console.
//
// Hạ tầng dùng chung (proxy canvas, polyfill getTargetRanges, tạo Note/gõ chữ/mở SlashMenu) đã
// chuyển sang helpers/note-interaction.ts — Step 3 (edgeless-board-database.spec.ts) dùng lại
// nguyên vẹn, xem chú thích đầy đủ về giới hạn Browser pane/compositing ở đó.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type InlineEditorLike,
  moBangVaTaoNoteCoNoiDung,
  moSlashMenuTuNote,
} from './helpers/note-interaction'

describe('EdgelessBoard — gõ "/" trong Note mở SlashMenu (spec §7 Step 2)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    // Tên thẻ THẬT sau bước đổi tên D12 (affine-* → drt-*) là `drt-slash-menu`, không phải
    // `affine-slash-menu` (tên gốc thượng nguồn) — xem chú thích ở khẳng định chính bên dưới.
    document.querySelector('drt-slash-menu')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('gõ "/" sau một note mới tạo qua công cụ toolbar thật → SlashMenu hiện ra kèm mục Database', async () => {
    const { inlineEl, ie } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-slash-menu', 'hello')

    await moSlashMenuTuNote(inlineEl)

    // Xác nhận đúng luồng thật đã chạy (không phải một menu rỗng/giả): nội dung note giờ phải là
    // "hello/" — do CHÍNH production code chèn ký tự "/", không phải ca kiểm này chèn tay.
    expect((ie as unknown as InlineEditorLike & { yText: { toString(): string } }).yText.toString()).toBe(
      'hello/',
    )

    const slashMenu = document.querySelector('drt-slash-menu') as unknown as {
      items: Array<{ name: string }>
    }
    const tenCacMuc = slashMenu.items.map((m) => m.name)

    // Có mục chèn Database — đúng spec §7 Step 2 ("Có mục để chèn Database/Table").
    expect(tenCacMuc).toContain('Table View')
  })
})
