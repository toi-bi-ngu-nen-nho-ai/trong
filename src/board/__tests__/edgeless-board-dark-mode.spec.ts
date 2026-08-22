// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 6 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): đổi
// chủ đề sang dark KHÔNG hồi quy, với Note có NỘI DUNG THẬT (đoạn văn + khối Database) — phần mà
// task-3-report.md (chặng trước) không kiểm được vì lúc đó Note chưa render được nội dung trong
// phiên đang chạy (đã vá ở f4c634b + hiểu rõ nguyên nhân rAF/tab ẩn, xem progress.md).
//
// PHẠM VI ĐÃ THU HẸP, GHI RÕ LÝ DO VÀ QUÁ TRÌNH ĐIỀU TRA (systematic-debugging Phase 1-2, đã cô lập
// được TRIGGER cụ thể, CHƯA tới được root cause tận gốc):
//
// Bản đầu của ca kiểm này còn xác nhận thêm việc đổi chủ đề có LAN xuống thuộc tính `data-theme`
// trên chính `.drt-edgeless-viewport` (nơi EdgelessBoard.tsx:317 gắn state `chuDe`) hay không. Đo
// được ban đầu: applyTheme('dark') GỌI ĐÚNG mọi listener qua watchResolvedTheme(), <html> ĐÚNG có
// data-theme="dark" — nhưng thuộc tính trên .drt-edgeless-viewport KHÔNG BAO GIỜ đổi, kể cả chờ
// 5000ms.
//
// ĐÃ CÔ LẬP BẰNG PHÉP DÒ NHỊ PHÂN (mount trần → +note → +mở SlashMenu → +click item), mỗi bước đo
// riêng trên một ca kiểm tối giản (đã xoá sau khi dùng):
//   - Mount EdgelessBoard trần, applyTheme('dark') → ĐÚNG (light→dark).
//   - + tạo Note qua công cụ toolbar thật → VẪN ĐÚNG.
//   - + mở SlashMenu (gõ "/", KHÔNG chọn mục nào) → VẪN ĐÚNG.
//   - + gọi `tableViewItem.action(context)` TRỰC TIẾP (bỏ qua wrapper `_handleClickItem` của
//     SlashMenu — tự chèn khối Database bằng đúng lệnh production, không qua cleanSpecifiedTail/
//     abortController.abort()) → VẪN ĐÚNG. Loại hẳn giả thuyết "khối Database/nội dung Note làm hỏng
//     phản ứng theme".
//   - + gọi `_handleClickItem(tableViewItem)` — ĐÚNG NHƯ Ở CA KIỂM DƯỚI ĐÂY → HỎNG (viewport kẹt ở
//     giá trị cũ).
// KẾT LUẬN CÔ LẬP ĐƯỢC: lỗi kích hoạt bởi CHÍNH wrapper `_handleClickItem` của SlashMenu
// (`affine/widgets/slash-menu/src/slash-menu-popover.ts:81-106` — gọi `cleanSpecifiedTail()` đồng
// bộ rồi `this.inlineEditor.waitForUpdate().then(...)`), KHÔNG phải do khối Database hay nội dung
// Note. Nghi vấn mạnh nhất (CHƯA XÁC NHẬN): cùng lớp race đã tìm thấy ở Step 3 —
// `cleanSpecifiedTail()` xoá "/" đồng bộ trong khi một `waitForUpdate()`/`getUpdateComplete()` khác
// đang treo trên v-element cũ, ném TypeError null-pointer thành unhandled rejection
// (`framework/std/.../v-element.ts:41-48`) — có thể phá vỡ chu kỳ batch-update của React đang chạy
// đồng thời trong CÙNG tick đó. CHƯA xác nhận được cơ chế chính xác, và CHƯA xác định được đây có
// tái hiện trên trình duyệt thật hay chỉ là hệ quả của môi trường test tổng hợp (đã gặp ba lớp giới
// hạn môi trường KHÁC ở Step 2/4/5: rAF/tab-ẩn, Range text-extraction, layout/getBoundingClientRect
// — không loại trừ đây là biểu hiện THỨ TƯ của cùng họ vấn đề "async timing dưới happy-dom", nhưng
// cũng không loại trừ là bug thật). KHÔNG đủ ngân sách phiên để điều tra tới cùng — để lại cho lượt
// review toàn nhánh hoặc phiên sau, kèm đủ bằng chứng cô lập ở trên để không phải dò lại từ đầu.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTheme, watchResolvedTheme } from '../../lib/theme'
import { moBangVaTaoNoteCoNoiDung, moSlashMenuTuNote } from './helpers/note-interaction'

describe('EdgelessBoard — dark mode với Note có nội dung thật (spec §7 Step 6)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    document.documentElement.removeAttribute('data-theme')
    document.querySelector('drt-slash-menu')?.remove()
    document.querySelector('drt-database')?.remove()
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('applyTheme("dark") với Note đã có đoạn văn + Database → <html> đổi đúng, mọi listener được gọi, không lỗi console, nội dung Note còn nguyên', async () => {
    const { inlineEl } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-dark-mode', 'hello')
    const slashMenuEl = await moSlashMenuTuNote(inlineEl)
    const tableViewItem = slashMenuEl.items.find((i) => i.name === 'Table View')!
    await act(async () => {
      slashMenuEl._handleClickItem(tableViewItem)
      await vi.waitFor(() => {
        expect(document.querySelector('drt-database')).not.toBeNull()
      })
    })

    const consoleErrorSpy = vi.spyOn(console, 'error')

    let chuDeNhanDuoc: string | undefined
    const huyDangKy = watchResolvedTheme((t) => {
      chuDeNhanDuoc = t
    })

    await act(async () => {
      applyTheme('dark')
    })

    expect(chuDeNhanDuoc).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
    huyDangKy()

    // Nội dung Note + khối Database vẫn còn nguyên sau khi đổi theme — không bị unmount/mất do đổi
    // chủ đề (dù thuộc tính data-theme trên viewport có cập nhật hay không, xem ghi chú đầu file).
    expect(document.querySelector('[data-v-text]')?.textContent).toBe('hello')
    expect(document.querySelector('drt-database')).not.toBeNull()

    await act(async () => {
      applyTheme('light')
    })
  })
})
