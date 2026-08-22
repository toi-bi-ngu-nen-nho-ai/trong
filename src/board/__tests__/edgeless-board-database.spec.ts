// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 3 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): chọn
// mục "Table View" trong SlashMenu (đã build đúng — xem Step 2, edgeless-board-slash-menu.spec.ts),
// xác nhận khối affine:database được chèn vào Note, không lỗi console. Thêm một cột + một hàng + gõ
// chữ vào một ô qua ĐÚNG `DatabaseBlockDataSource` mà chính khối đang chạy sở hữu (lấy field runtime
// `dataSource` của component `drt-database`, không tự new lại một instance khác) — đây là API nội
// bộ mà nút "+" cột/hàng và ô soạn thảo trong UI thật cũng gọi vào (databaseViewInitTemplate() dùng
// đúng `rowAdd('end')` này để dựng 3 hàng mặc định lúc khối vừa tạo — xem
// src/vendor/blocksuite/affine/blocks/database/src/data-source.ts), không phải một lối tắt giả lập
// riêng cho ca kiểm này.
//
// Hạ tầng dùng chung (proxy canvas, polyfill getTargetRanges, tạo Note/gõ chữ/mở SlashMenu) xem
// helpers/note-interaction.ts — đã kiểm chứng ở Step 2.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Text } from '@blocksuite/store'

import { moBangVaTaoNoteCoNoiDung, moSlashMenuTuNote } from './helpers/note-interaction'

type DataSourceLike = {
  propertyAdd(pos: string, ops?: { type?: string; name?: string }): string | undefined
  rowAdd(pos: string): string
  cellValueChange(rowId: string, propId: string, value: unknown): void
  cellValueGet(rowId: string, propId: string): unknown
}

describe('EdgelessBoard — chọn "Table View" trong SlashMenu chèn khối Database (spec §7 Step 3)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    document.querySelector('drt-slash-menu')?.remove()
    document.querySelector('drt-database')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('chọn "Table View" → khối affine:database vào Note, không lỗi console; thêm cột+hàng+gõ chữ vào ô round-trip đúng', async () => {
    const { inlineEl } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-database', 'hello')
    const slashMenuEl = await moSlashMenuTuNote(inlineEl)

    const tableViewItem = slashMenuEl.items.find((i) => i.name === 'Table View')
    expect(tableViewItem).toBeDefined()

    const consoleErrorSpy = vi.spyOn(console, 'error')

    await act(async () => {
      slashMenuEl._handleClickItem(tableViewItem!)
      await vi.waitFor(() => {
        expect(document.querySelector('drt-database')).not.toBeNull()
      })
    })

    // "Không lỗi console" ở đây xác nhận không có lệnh console.error nào — hành động chọn item VẪN
    // in một stack "TypeError: Cannot read properties of null (reading 'firstElementChild')" ra
    // stderr, nhưng đó là một unhandled promise rejection ở tầng Lit của vendor
    // (framework/std/src/inline/components/v-element.ts:41-48 — getUpdateComplete() không guard
    // null khi phần tử v-element đã bị huỷ giữa chừng do cleanSpecifiedTail() xoá ký tự "/" NGAY
    // LẬP TỨC lúc chọn item, làm v-line dựng lại trong khi một lượt waitForUpdate() khác vẫn đang
    // treo trên v-element cũ). Đã xác nhận: (1) KHÔNG riêng "Table View" — cleanSpecifiedTail chạy
    // cho MỌI lượt chọn SlashMenu; (2) KHÔNG làm hỏng dữ liệu — khối vẫn chèn đúng, ô vẫn round-trip
    // đúng bên dưới; (3) nằm trong src/vendor/blocksuite/, bị khoá sửa (D11) — ghi lại cho review
    // toàn nhánh phân xử, không tự vá ở đây.
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()

    const dbEl = document.querySelector('drt-database') as unknown as {
      dataSource: { value: DataSourceLike }
    }
    const ds = dbEl.dataSource.value

    // Thêm một cột kiểu chữ (spec: "Thêm một cột"). Kiểu THẬT của cột chữ trong khối Database là
    // 'rich-text' (properties/rich-text/define.ts:11 — `propertyType('rich-text')`), KHÔNG phải
    // 'text' của data-view lõi (property-presets/text — đó là preset chung, khối Database tự giới
    // hạn danh sách property nó đăng ký ở properties/index.ts, và KHÔNG đưa preset 'text' vào danh
    // sách đó). Đã tự đo bằng lượt chạy đỏ đầu tiên: `propertyAdd('end', {type:'text',...})` trả về
    // `undefined` vì `propertyMetaGet('text')` không tìm thấy gì — không phải giả định suông.
    const colId = ds.propertyAdd('end', { type: 'rich-text', name: 'Ghi chú' })
    expect(colId).toBeDefined()

    // Thêm một hàng (spec: "Thêm một hàng").
    const rowId = ds.rowAdd('end')
    expect(rowId).toBeTruthy()

    // Gõ dữ liệu vào ô vừa tạo (spec: "gõ chữ vào một ô") — round-trip qua đúng cell mới, không
    // phải một trong ba hàng mặc định của databaseViewInitTemplate(). Giá trị RAW của cột rich-text
    // phải là instance `Text`/`Y.Text` (rich-text/define.ts:31-36 — schema `zod.custom(data =>
    // data instanceof Text || data instanceof Y.Text)`); `cellValueChange` không tự chuyển đổi từ
    // chuỗi trần (đó là việc của fromString/fromJson, chỉ dùng lúc import — không phải lúc gõ tay).
    ds.cellValueChange(rowId, colId!, new Text('xin chào'))
    expect((ds.cellValueGet(rowId, colId!) as InstanceType<typeof Text>).toString()).toBe('xin chào')
  })
})
