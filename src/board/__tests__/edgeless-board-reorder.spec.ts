// @vitest-environment happy-dom
//
// Kiểm tự động cho spec §7 Step 5 (docs/superpowers/plans/2026-08-21-database-note-day-du.md): Note
// có ít nhất hai khối (đoạn văn + Database), kéo-thả đổi thứ tự, xác nhận DOM đổi thứ tự đúng.
//
// PHẠM VI ĐÃ THU HẸP CÓ CHỦ ĐÍCH: xác nhận đúng NGHIỆP VỤ đổi thứ tự (store.moveBlocks — cùng API
// công khai mà drag-handle gọi lúc thả, xem framework/store/src/model/store/store.ts:1140-1159) và
// đúng KẾT QUẢ DOM sau khi đổi. KHÔNG mô phỏng cử chỉ kéo bằng chuột thật (rê tới mép trái → tay
// cầm hiện ra → kéo): cơ chế đó phụ thuộc `getBoundingClientRect()` để dò khối đang hover VÀ để
// tính vị trí thả — dưới happy-dom (không có layout engine thật), mọi rect đều trả về 0/0/0/0, nên
// phép hit-testing "khối nào đang ở dưới con trỏ" không có ý nghĩa xác định — cùng lớp giới hạn
// "cần layout/hit-testing thật của trình duyệt" đã ghi nhận nhiều lần trong progress.md (khác hẳn
// Step 2-4, nơi vấn đề chỉ nằm ở Selection/Range text mà có đường vòng qua API framework). Phần
// "tay cầm hiện ra khi rê chuột" cần chủ dự án tự kiểm trên thiết bị thật — xem báo cáo cuối.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moBangVaTaoNoteCoNoiDung, moSlashMenuTuNote } from './helpers/note-interaction'

type BlockModelLike = { id: string; flavour: string }

type StoreLike = {
  root: BlockModelLike | null
  getBlock(id: string): { model: BlockModelLike & { children: BlockModelLike[] } } | undefined
  // Chữ ký THẬT của Store.moveBlocks (store.ts:1140-1145) nhận BlockModel, không phải string id —
  // wrapper tự làm `model.id` bên trong rồi mới giao cho lớp CRUD nội bộ.
  moveBlocks(
    blocksToMove: BlockModelLike[],
    newParent: BlockModelLike,
    targetSibling: BlockModelLike | null,
    shouldInsertBeforeSibling?: boolean,
  ): void
}

describe('EdgelessBoard — kéo-thả đổi thứ tự khối trong Note (spec §7 Step 5)', () => {
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

  it('Note có [đoạn văn, Database] → moveBlocks đổi thành [Database, đoạn văn] → model VÀ DOM đều đúng thứ tự mới', async () => {
    const { inlineEl } = await moBangVaTaoNoteCoNoiDung(root, container, 'board-reorder', 'hello')
    const slashMenuEl = await moSlashMenuTuNote(inlineEl)
    const tableViewItem = slashMenuEl.items.find((i) => i.name === 'Table View')!

    await act(async () => {
      slashMenuEl._handleClickItem(tableViewItem)
      // Hạn giờ TƯỜNG MINH 5000ms thay cho mặc định 1000ms của `vi.waitFor`. KHÔNG phải nới lỏng
      // khẳng định — `drt-database` vẫn PHẢI xuất hiện, chỉ là được chờ lâu hơn. Ca này chập chờn
      // ĐO ĐƯỢC (2026-08-29): chạy riêng file thì xanh 1/1, chạy `vitest run` đầy đủ thì đỏ đúng
      // dòng này (51 file spec tranh CPU, lượt dựng khối Database vượt 1000ms). Chọn 5000 để khớp
      // `testTimeout` mặc định của vitest, nên waitFor không bao giờ là thứ hết giờ TRƯỚC cả test.
      await vi.waitFor(
        () => {
          expect(document.querySelector('drt-database')).not.toBeNull()
        },
        { timeout: 5000 },
      )
    })

    const eh = document.querySelector('editor-host') as unknown as { std: { store: StoreLike } }
    const store = eh.std.store
    const noteEl = document.querySelector('drt-edgeless-note') as HTMLElement

    // Trạng thái BAN ĐẦU đúng như spec dự tính: đoạn văn trước, Database sau
    // (insertDatabaseBlockCommand dùng place:'after').
    const pageChildren = (store.root as unknown as { children: BlockModelLike[] }).children
    const noteRef = pageChildren.find((c) => c.flavour === 'affine:note')!
    const noteModel = store.getBlock(noteRef.id)!.model
    expect(noteModel.children.map((c) => c.flavour)).toEqual(['affine:paragraph', 'affine:database'])

    const [paragraphModel, databaseModel] = noteModel.children

    // Đổi thứ tự — CHÍNH API công khai mà drag-handle gọi lúc thả (moveBlocks), không phải một lối
    // tắt riêng cho ca kiểm này.
    await act(async () => {
      store.moveBlocks([databaseModel!], noteModel, paragraphModel!, true)
    })

    await vi.waitFor(() => {
      expect(noteModel.children.map((c) => c.flavour)).toEqual(['affine:database', 'affine:paragraph'])
    })

    // DOM phải phản ánh đúng thứ tự mới — spec: "xác nhận DOM đổi thứ tự đúng sau khi thả".
    await vi.waitFor(() => {
      // Con trực tiếp của <drt-edgeless-note> chỉ có MỘT <div> bọc (đo bằng tay lúc viết ca kiểm
      // này) — các khối thật (paragraph/database) nằm SÂU hơn bên trong, nên phải querySelectorAll
      // đệ quy theo [data-block-id] thay vì chỉ .children, thứ tự DOM vẫn đúng thứ tự tài liệu.
      const conCoDuLieu = Array.from(noteEl.querySelectorAll('[data-block-id]'))
      const thuTuTagDom = conCoDuLieu.map((el) => el.tagName.toLowerCase())
      const viTriDatabase = thuTuTagDom.indexOf('drt-database')
      const viTriParagraph = thuTuTagDom.indexOf('drt-paragraph')
      expect(viTriDatabase).toBeGreaterThanOrEqual(0)
      expect(viTriParagraph).toBeGreaterThanOrEqual(0)
      expect(viTriDatabase).toBeLessThan(viTriParagraph)
    })
  })
})
