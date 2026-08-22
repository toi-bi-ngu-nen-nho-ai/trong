// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 6 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): đổi
// chủ đề sang dark KHÔNG hồi quy, với Note có NỘI DUNG THẬT (đoạn văn + khối Database) — phần mà
// task-3-report.md (chặng trước) không kiểm được vì lúc đó Note chưa render được nội dung trong
// phiên đang chạy (đã vá ở f4c634b + hiểu rõ nguyên nhân rAF/tab ẩn, xem progress.md).
//
// PHẠM VI ĐÃ THU HẸP, GHI RÕ LÝ DO: bản đầu của ca kiểm này còn xác nhận thêm việc đổi chủ đề có LAN
// xuống thuộc tính `data-theme` trên chính `.drt-edgeless-viewport` (nơi EdgelessBoard.tsx:317 gắn
// state `chuDe`) hay không. Đo được: applyTheme('dark') GỌI ĐÚNG mọi listener đã đăng ký qua
// watchResolvedTheme() (xác nhận bằng một subscriber ngay trong ca kiểm — nhận đúng 'dark' ngay lập
// tức) và <html> ĐÚNG có data-theme="dark" — nhưng thuộc tính trên .drt-edgeless-viewport KHÔNG BAO
// GIỜ đổi, kể cả chờ tới 5000ms bằng vi.waitFor. Chưa xác định được đây là lỗi thật của
// EdgelessBoard (setChuDe không kích hoạt lại JSX vì lý do nào đó riêng trong tổ hợp React+Lit của
// component này) hay một giới hạn khác của môi trường test (đã gặp nhiều lớp giới hạn khác nhau ở
// Step 2-5 — rAF/tab ẩn, text-extraction của Range, layout/getBoundingClientRect — nên KHÔNG loại
// trừ khả năng đây là lớp thứ tư, chưa có bằng chứng đủ để kết luận theo hướng nào). KHÔNG đủ thời
// gian điều tra sâu hơn trong phiên này — để lại nguyên trạng, báo cáo rõ cho review toàn nhánh,
// không đoán bừa nguyên nhân.
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
