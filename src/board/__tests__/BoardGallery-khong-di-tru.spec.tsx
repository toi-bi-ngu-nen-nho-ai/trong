// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { existsSync, readFileSync } from 'node:fs'
// `URL as NodeURL` — cùng lý do đã ghi dài ở ranh-gioi-nap-bang.spec.ts: happy-dom ghi đè `URL`
// global bằng polyfill riêng, `fs` nhận diện URL bằng `instanceof URL` của CHÍNH Node nên phải
// import tường minh bản của node:url.
import { URL as NodeURL } from 'node:url'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BoardGallery } from '../BoardGallery'

// Giai đoạn 8 Task 8: `src/board/diTruBangCu.ts` và HAI cờ di trú của nó đã bị xoá — store
// `IDB_STORES.boards` đóng băng từ giai đoạn 5, không còn đối tượng thật nào cần di trú, nên hai
// lượt `import('./diTruBangCu')` trong BoardGallery.tsx chỉ còn là chi phí ròng: mỗi máy chưa từng
// chạy chúng phải tải một chunk BlockSuite nặng, dựng TestWorkspace và đợi đồng bộ tới 4s ngay lần
// đầu chạm tab Mindmap.
//
// File này ghim hành vi ĐÍCH theo chiều ngược của TDD: viết trước cho trạng thái sau khi xoá, thấy
// nó ĐỎ trên mã hiện tại, rồi xoá mã cho nó xanh.
const KHOA_DI_TRU = 'drtrong:board-di-tru-da-chay'
const KHOA_DI_TRU_NOI_DUNG = 'drtrong:board-di-tru-noi-dung-da-chay'

// Cửa sổ quan sát cho ca kiểm HÀNH VI bên dưới. Đo thật trên máy dev (2026-09-08, chạy riêng file
// này): mã di trú CŨ set `drtrong:board-di-tru-noi-dung-da-chay` ở mốc ~14,2 giây sau khi mount —
// phần lớn là thời gian `import()` động kéo chồng BlockSuite vào vitest, không phải bản thân lượt
// di trú. Cửa sổ 6 giây (thử đầu tiên) cho XANH GIẢ; 20 giây bắt được. Đây là lý do ca kiểm TĨNH
// đứng TRƯỚC: nó tức thời và chính xác, còn ca hành vi trả giá bằng thời gian chờ.
const CUA_SO_QUAN_SAT_MS = 20000
const BUOC_POLL_MS = 50

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('BoardGallery — không còn lượt di trú bảng cũ (giai đoạn 8)', () => {
  // Soi TĨNH mã nguồn, cùng kỹ thuật mà cổng ranh giới nạp chậm D13 dùng
  // (ranh-gioi-nap-bang.spec.ts): tức thời, không phụ thuộc thời gian, và bắt được cả trường hợp
  // mã di trú được đưa lại vào một nhánh mà ca hành vi bên dưới không đi qua.
  it('BoardGallery.tsx không còn tham chiếu diTruBangCu hay hai khoá cờ di trú', () => {
    const nguon = readFileSync(new NodeURL('../BoardGallery.tsx', import.meta.url), 'utf8')
    expect(nguon).not.toContain('diTruBangCu')
    expect(nguon).not.toContain('drtrong:board-di-tru')
  })

  it('module di trú đã bị xoá khỏi cây nguồn', () => {
    expect(existsSync(new NodeURL('../diTruBangCu.ts', import.meta.url))).toBe(false)
  })

  describe('mount thật', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
      localStorage.removeItem(KHOA_DI_TRU)
      localStorage.removeItem(KHOA_DI_TRU_NOI_DUNG)
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
    })

    afterEach(async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    })

    /** Khoá đầu tiên xuất hiện trong cửa sổ quan sát, hoặc null nếu không cờ nào được set. */
    async function coDatCoTrongCuaSo(): Promise<string | null> {
      const hetHan = Date.now() + CUA_SO_QUAN_SAT_MS
      for (;;) {
        if (localStorage.getItem(KHOA_DI_TRU) !== null) return KHOA_DI_TRU
        if (localStorage.getItem(KHOA_DI_TRU_NOI_DUNG) !== null) return KHOA_DI_TRU_NOI_DUNG
        if (Date.now() >= hetHan) return null
        await act(async () => {
          await new Promise((r) => setTimeout(r, BUOC_POLL_MS))
        })
      }
    }

    // KHÔNG khẳng định "cờ null" bằng một phép so sánh ĐỒNG BỘ ngay sau khi mount: hai cờ chỉ được
    // ghi SAU khi `import()` động resolve rồi lượt di trú chạy xong, nên so sánh ngay lập tức sẽ
    // XANH GIẢ kể cả khi mã di trú còn nguyên. Poll trong cửa sổ có hạn và fail nếu cờ XUẤT HIỆN.
    it('mount tab Mindmap (dangHienTab) KHÔNG set cờ di trú cũ nào', async () => {
      await act(async () => {
        root.render(
          createElement(BoardGallery, {
            dangHienTab: true,
            tieuDe: 'Mindmap',
            loai: 'so-do',
            loaiTaoDuoc: ['so-do'],
            onDaDoc: () => {},
          }),
        )
      })

      const khoaDaDat = await coDatCoTrongCuaSo()
      expect(khoaDaDat, `cờ di trú hệ cũ vẫn được set: ${khoaDaDat}`).toBeNull()
    }, 60000)
  })
})
