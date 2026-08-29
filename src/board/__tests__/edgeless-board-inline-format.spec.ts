// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 4 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): bôi
// đen chữ trong Note, bấm đậm đổi đúng kiểu chữ (đọc lại Y.Text xác nhận), gõ "@" không lỗi console.
//
// "Bôi đen" dùng chonDoanVanTrucTiep (helpers/note-interaction.ts) thay vì dựng Range tự nhiên rồi
// đợi BlockSuite tự chuyển đổi — xem chú thích đầy đủ tại định nghĩa hàm đó về lý do (giới hạn
// text-extraction của happy-dom cho Range không-collapsed, không phải bug sản phẩm).
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toggleBold } from '@blocksuite/affine-inline-preset'

import { chonDoanVanTrucTiep, datConTroCuoiDoanVan, moBangVaTaoNoteCoNoiDung, type StdSelectionLike } from './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

type StdLike = StdSelectionLike & {
  command: { chain(): { pipe(...args: unknown[]): { run(): unknown } } }
}

describe('EdgelessBoard — định dạng inline trong Note (spec §7 Step 4)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    document.querySelector('drt-toolbar-widget')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('bôi đen "hello" trong "hello world" → std.selection có text selection index=0/length=5', async () => {
    await moBangVaTaoNoteCoNoiDung(root, container, 'board-inline-select', 'hello world')
    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }

    await act(async () => {
      chonDoanVanTrucTiep(eh.std, 0, 5)
      await choDom(() => {
        const textSel = eh.std.selection.value.find((s) => s.type === 'text')
        expect(textSel?.from?.index).toBe(0)
        expect(textSel?.from?.length).toBe(5)
      })
    })
  })

  it('bôi đen "hello" rồi toggleBold → Y.Text delta của đúng đoạn đó có attributes.bold=true, phần " world" không đổi', async () => {
    const { ie } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-inline-bold', 'hello world')
    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }

    await act(async () => {
      chonDoanVanTrucTiep(eh.std, 0, 5)
      await choDom(() => {
        const textSel = eh.std.selection.value.find((s) => s.type === 'text')
        expect(textSel?.from?.length).toBe(5)
      })
    })

    await act(async () => {
      eh.std.command.chain().pipe(toggleBold).run()
    })

    const yText = (
      ie as unknown as { yText: { toDelta(): Array<{ insert: string; attributes?: { bold?: boolean } }> } }
    ).yText
    await choDom(() => {
      expect(yText.toDelta()).toEqual([
        { insert: 'hello', attributes: { bold: true } },
        { insert: ' world' },
      ])
    })
  })

  it('gõ "@" sau khi đặt con trỏ cuối đoạn văn → không lỗi console (gợi ý mention rỗng cũng hợp lệ — spec §7 Step 4)', async () => {
    const { inlineEl, ie } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-inline-mention', 'hello')

    const consoleErrorSpy = vi.spyOn(console, 'error')

    await act(async () => {
      datConTroCuoiDoanVan(inlineEl)
      inlineEl.dispatchEvent(
        new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: 'insertText',
          data: '@',
        }),
      )
      await choDom(() => {
        const vText = document.querySelector('[data-v-text]')
        expect(vText?.textContent).toBe('hello@')
      })
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()

    expect((ie as unknown as { yText: { toString(): string } }).yText.toString()).toBe('hello@')
  })
})
