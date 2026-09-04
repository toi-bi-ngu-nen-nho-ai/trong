// @vitest-environment happy-dom
//
// Ca kiểm hỏng-hóc-ngoại-tuyến: chunk bảng vẽ KHÔNG tải được.
//
// Đây là tình huống thật, không giả định: public/manifest.json có lối tắt `/?screen=mindmap` cài
// ra màn hình chính; public/sw.js chỉ precache vỏ app còn chunk bảng vẽ 4 MB đi lối
// cache-first-with-revalidate, tức là chỉ có sau MỘT lượt tải mạng thành công. Mở lối tắt đó lần
// đầu khi mất sóng → `import()` bị từ chối ngay trong lúc render.
// Trước khi có src/board/index.tsx, lỗi đó nổi thẳng lên boundary gốc ở src/main.tsx và tháo sạch
// TOÀN BỘ app; nút phục hồi duy nhất là tải lại trang, mà cú tải lại giữ nguyên `?screen=mindmap`
// nên tái hiện đúng lỗi cũ — trong PWA standalone thì không còn thanh địa chỉ để thoát ra.
//
// Ca kiểm dựng lại đúng cảnh đó bằng cách cho module `../EdgelessBoard` ném lỗi lúc nạp, rồi đòi
// hai điều: (1) tab Mindmap hiện pane tiếng Việt thay vì trang trắng, (2) phần còn lại của cây —
// ở đây là thanh nav giả bên cạnh — vẫn còn nguyên trong tài liệu.
import { readFileSync } from 'node:fs'
// `URL as NodeURL`: file này chạy dưới `@vitest-environment happy-dom` (xem đầu file), môi trường
// đó GHI ĐÈ `URL` global bằng bản polyfill riêng của nó. `fs.readFileSync` nhận diện một URL bằng
// `instanceof URL` của CHÍNH Node, nên truyền thẳng URL global (happy-dom) vào sẽ không khớp và
// ném `TypeError: The URL must be of scheme file` dù chuỗi URL hoàn toàn hợp lệ — phải import
// tường minh URL của node:url để né polyfill.
import { URL as NodeURL } from 'node:url'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Đúng thông điệp mà trình duyệt ném ra khi lượt tải một chunk động thất bại.
vi.mock('../EdgelessBoard', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/EdgelessBoard-abc123.js')
})

import { EdgelessBoard } from '../index'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Vỏ nạp chậm của bảng vẽ — chunk tải hỏng', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // React in nguyên vẹn lỗi đã bắt được ra console; ở ca kiểm này lỗi là thứ ta CỐ Ý gây ra nên
    // nuốt nó đi cho output đọc được, không phải để giấu lỗi thật.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('giữ hỏng hóc bên trong tab Mindmap, thanh nav và các màn khác vẫn còn', async () => {
    await act(async () => {
      root.render(
        createElement(
          'div',
          null,
          createElement('nav', { 'data-nav': 'true' }, 'Trang chủ'),
          // `boardId` không ảnh hưởng ca kiểm này (module bị mock ném lỗi ngay khi nạp, chưa tới
          // lượt dùng boardId) — vẫn truyền một giá trị hợp lệ thay vì object props rỗng, vì
          // `createElement` chỉ bỏ qua việc kiểm PropsBang khi KHÔNG truyền props nào cả; một khi
          // đã truyền object thì mọi trường bắt buộc (kể cả boardId) phải có mặt.
          createElement(EdgelessBoard, { boardId: 'boardId-gia', loai: 'so-do' }),
        ),
      )
    })

    // 1) Không phải trang trắng: pane tiếng Việt đứng đúng chỗ bảng vẽ lẽ ra nằm.
    expect(container.textContent).toContain('Cần mạng để tải lần đầu')
    // 2) Có lối đi tiếp — nút thử lại, chứ không phải ngõ cụt.
    expect(container.querySelector('button')?.textContent).toBe('Thử lại')
    // 3) Phần còn lại của app KHÔNG bị tháo. Đây mới là điều ca kiểm này thật sự canh: thiếu
    //    boundary trong ./index.tsx thì cả cây (kể cả thẻ <nav> dưới đây) biến mất.
    expect(container.querySelector('nav[data-nav]')).not.toBeNull()
    expect(container.querySelector('nav[data-nav]')!.textContent).toBe('Trang chủ')
  })
})

describe('index.tsx — ranh giới D13 (không kéo BlockSuite vào chunk vỏ app)', () => {
  // Đọc mã nguồn THẬT của index.tsx (không mock) để soát tĩnh — hai ca dưới đây không render gì,
  // chỉ kiểm câu chữ import.
  const nguon = readFileSync(new NodeURL('../index.tsx', import.meta.url), 'utf8')

  it('index.tsx không import tĩnh TrangBaiViet (ranh giới D13)', () => {
    // Chỉ được nhắc tới trong một `import()` động bên trong lazy(). Một dòng
    // `import … from './TrangBaiViet'` ở đầu file kéo cả khối BlockSuite vào chunk vỏ app.
    expect(nguon).not.toMatch(/^import\s+[^\n]*from\s+['"]\.\/TrangBaiViet['"]/m)
    expect(nguon).toMatch(/import\(['"]\.\/TrangBaiViet['"]\)/)
  })

  it('index.tsx chỉ import KIỂU từ mo-doc (ranh giới D13)', () => {
    // `mo-doc.ts` import @blocksuite/*. Một import GIÁ TRỊ từ đó kéo cả khối BlockSuite vào chunk
    // vỏ app. Chỉ `import type` (bị xoá lúc biên dịch) mới được phép — cùng luật App.tsx đang theo.
    // `matchAll` + cờ `g`, không phải `match` một lần: bản trước thiếu `g` nên chỉ soi dòng import
    // `./mo-doc` ĐẦU TIÊN — thêm một dòng import giá trị thứ hai là lọt cổng mà ca kiểm vẫn xanh.
    // Hiện chỉ có một dòng, nhưng cổng chặn phải đúng bất kể có bao nhiêu.
    const dongMoDoc = [...nguon.matchAll(/^import\s+[^\n]*from\s+['"]\.\/mo-doc['"]/gm)].map(
      (khop) => khop[0],
    )
    expect(dongMoDoc.length).toBeGreaterThan(0)
    for (const dong of dongMoDoc) expect(dong).toMatch(/^import\s+type\s/)
  })
})
