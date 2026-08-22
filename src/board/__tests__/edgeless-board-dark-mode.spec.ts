// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 6 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): đổi
// chủ đề sang dark KHÔNG hồi quy, với Note có NỘI DUNG THẬT (đoạn văn + khối Database) — phần mà
// task-3-report.md (chặng trước) không kiểm được vì lúc đó Note chưa render được nội dung trong
// phiên đang chạy (đã vá ở f4c634b + hiểu rõ nguyên nhân rAF/tab ẩn, xem progress.md).
//
// ĐIỀU TRA (systematic-debugging Phase 1-3) — KẾT LUẬN CUỐI: CHẬP CHỜN, KHÔNG PHẢI BUG LOGIC.
//
// Ca kiểm này ĐÃ TỪNG xác nhận thêm việc đổi chủ đề có lan xuống thuộc tính `data-theme` trên chính
// `.drt-edgeless-viewport` (nơi EdgelessBoard.tsx:317 gắn state `chuDe`) hay không. Lượt đo ĐẦU
// TIÊN: applyTheme('dark') gọi đúng mọi listener, <html> đúng data-theme="dark" — nhưng thuộc tính
// trên viewport KHÔNG đổi, kể cả chờ 5000ms.
//
// Dò nhị phân bằng năm ca kiểm tối giản (mount trần → +note → +mở SlashMenu → +action() trực tiếp
// bỏ qua _handleClickItem → +action() qua waitForUpdate().then() thật → +cleanSpecifiedTail đồng bộ
// → +CẢ CHUỖI với abort() → gọi ĐÚNG _handleClickItem() thật, đã dựng rồi xoá sau khi dùng): TỪNG
// bước riêng lẻ, kể cả tái tạo THỦ CÔNG toàn bộ chuỗi _handleClickItem (cleanSpecifiedTail +
// waitForUpdate().then(action) + abort()) VÀ gọi thẳng _handleClickItem() thật, đều cho kết quả
// ĐÚNG — không tái hiện được lỗi lần nào trong cả năm ca kiểm cô lập. Gọi lại chính kịch bản đã hỏng
// ban đầu (ca kiểm dưới đây, với khẳng định viewport thêm vào tạm thời) — chạy 4 lần liên tiếp, cả
// bốn lần ĐÚNG.
//
// Kết luận: lượt đỏ đầu tiên là hiện tượng CHẬP CHỜN (nhiều khả năng do tải máy tại thời điểm đó —
// phiên đã chạy rất nhiều lượt `npx vitest run`/`tsc` liên tiếp ngay trước đó), KHÔNG PHẢI lỗi logic
// cố định trong `EdgelessBoard`/SlashMenu — đúng loại hiện tượng đã có TIỀN LỆ trong dự án này (xem
// HANDOFF.md mục 6, "CA ĐỎ CHẬP CHỜN" của `vendor-doi-ten.spec.ts`, cũng do tải máy biến động). Giữ
// nguyên khẳng định viewport (qua `vi.waitFor`, không phải khẳng định trần) trong ca kiểm chính thức
// bên dưới thay vì bỏ qua — nếu chập chờn tái xuất hiện, đó LÀ tin tức, đừng nới lỏng ca kiểm để im
// lặng bỏ qua.
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
    // Xem ghi chú đầu file: đây là mục từng chập chờn — đo lại sau 4 lượt chạy liên tiếp không tái
    // hiện được nữa, giữ khẳng định thật thay vì bỏ qua.
    await vi.waitFor(() => {
      expect(document.querySelector('.drt-edgeless-viewport')?.getAttribute('data-theme')).toBe('dark')
    })
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
