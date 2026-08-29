// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 6 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): đổi
// chủ đề sang dark KHÔNG hồi quy, với Note có NỘI DUNG THẬT (đoạn văn + khối Database) — phần mà
// task-3-report.md (chặng trước) không kiểm được vì lúc đó Note chưa render được nội dung trong
// phiên đang chạy (đã vá ở f4c634b + hiểu rõ nguyên nhân rAF/tab ẩn, xem progress.md).
//
// ĐIỀU TRA (systematic-debugging Phase 1-3) — KẾT LUẬN: CHẬP CHỜN MỘT LẦN, KHÔNG TÁI HIỆN ĐƯỢC;
// NGUYÊN NHÂN CƠ CHẾ CHƯA XÁC ĐỊNH.
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
// bốn lần ĐÚNG. Review toàn nhánh sau đó tự chạy lại lượt thứ mười — VẪN ĐÚNG.
//
// ĐÍNH CHÍNH (review toàn nhánh bắt được): bản trước của đoạn này kết luận "do tải máy" — SAI Ở CHỖ
// KHẲNG ĐỊNH MỘT CƠ CHẾ CHƯA CHỨNG MINH. Đọc lại toàn bộ đường dữ liệu (`theme.ts:104` →
// `EdgelessBoard.tsx:233-236,317`): applyTheme() → lặp gọi listener → setChuDe() → re-render → gắn
// thuộc tính là một chuỗi HOÀN TOÀN ĐỒNG BỘ, không rAF/setTimeout/I-O — "tải máy" là lời giải thích
// hợp lý cho các đường ĐUA THẬT khác của dự án (rAF, IndexedDB, timeout — ba lớp giới hạn đã ghi ở
// Step 2/4/5), nhưng KHÔNG có cơ chế rõ ràng để tải máy ảnh hưởng một chuỗi gọi hàm đồng bộ bên
// trong act(). Kết luận đúng mức bằng chứng thật sự có: NGUYÊN NHÂN CƠ CHẾ CHƯA XÁC ĐỊNH, chỉ chập
// chờn MỘT LẦN DUY NHẤT và không tái hiện được sau 10 lượt chạy liên tiếp (tính cả lượt của reviewer
// toàn nhánh) — mức rủi ro hiện tại thấp theo bằng chứng thực nghiệm, nhưng đừng gán cho nó một cơ
// chế chưa được chứng minh. `beforeEach` bên dưới có thêm một canary rẻ tiền (đếm `.drt-edgeless-
// viewport` phải bằng 0 trước mỗi ca) để loại trừ ngay giả thuyết "DOM sót lại từ ca kiểm khác" nếu
// chập chờn quay lại, thay vì phải làm lại toàn bộ systematic-debugging từ đầu.
//
// Giữ nguyên khẳng định viewport (qua `vi.waitFor`, không phải khẳng định trần) trong ca kiểm chính
// thức bên dưới thay vì bỏ qua — nếu chập chờn tái xuất hiện, đó LÀ tin tức, đừng nới lỏng ca kiểm
// để im lặng bỏ qua.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTheme, watchResolvedTheme } from '../../lib/theme'
import { moBangVaTaoNoteCoNoiDung, moSlashMenuTuNote } from './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

describe('EdgelessBoard — dark mode với Note có nội dung thật (spec §7 Step 6)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // Canary rẻ tiền cho giả thuyết "DOM sót lại từ ca kiểm khác" — xem ghi chú điều tra ở đầu file.
    expect(document.querySelectorAll('.drt-edgeless-viewport').length).toBe(0)
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
      await choDom(() => {
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
    await choDom(() => {
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
