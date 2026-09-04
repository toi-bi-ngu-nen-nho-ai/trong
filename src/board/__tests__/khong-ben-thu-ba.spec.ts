// @vitest-environment happy-dom
//
// "Không bên thứ ba" — chủ dự án chốt 2026-09-05: sổ tay lâm sàng, dữ liệu chỉ ở nội bộ.
//
// Ba lớp, tệp này canh cả ba:
//   1. CSP `connect-src 'self'` trong index.html — lớp DUY NHẤT trình duyệt cưỡng chế, phủ cả
//      những điểm gọi mạng chưa ai biết.
//   2. `khongXemTruocQuaMang` — ghi đè `LinkPreviewProvider` để KHÔNG phát lời gọi nào ra.
//   3. `docNhanTuUrl` — nhan đề suy từ chính URL, thay cho dữ liệu lẽ ra phải đi xin bên ngoài.
//
// VÌ SAO KHÔNG CHỈ DỰA VÀO CSP: CSP chặn ở mức trình duyệt, tức lời gọi VẪN phát ra rồi bị từ chối
// — mỗi thẻ liên kết một dòng đỏ console và một khoảng chờ vô ích. Lớp 2 làm không còn gì để chặn.
import 'fake-indexeddb/auto'

import { LinkPreviewServiceIdentifier } from '@blocksuite/affine-shared/services'
import { BlockStdScope } from '@blocksuite/affine/std'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { layExtensionsEdgeless, layExtensionsTrang } from '../extensions'
import { docNhanTuUrl } from '../khong-ben-thu-ba'
import { taoHoacMoDoc } from '../mo-doc'

describe('CSP — lưới an toàn do trình duyệt cưỡng chế', () => {
  const html = readFileSync('index.html', 'utf8')
  const RE_CSP = /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]*)"/

  it('index.html khai connect-src và img-src, KHÔNG khai script-src', () => {
    const the = RE_CSP.exec(html)
    expect(the, 'phải có đúng một thẻ CSP').not.toBeNull()

    const luat = the![1]
    expect(luat).toContain("connect-src 'self'")
    expect(luat).toContain("img-src 'self' data: blob:")

    // `script-src`/`style-src` CỐ Ý vắng mặt: khai chúng là giết script nội tuyến phân giải chủ đề
    // ngay trong index.html và script của Vite — đổi một rủi ro riêng tư lấy app trắng màn hình.
    // Ca này canh việc ai đó "siết thêm cho chắc" mà không đọc chú thích.
    expect(luat).not.toContain('script-src')
    expect(luat).not.toContain('style-src')
  })

  it('không host bên thứ ba nào được liệt trong CSP', () => {
    expect(RE_CSP.exec(html)![1]).not.toMatch(/https?:\/\//)
  })
})

describe('docNhanTuUrl — nhan đề suy từ chính URL, không gọi mạng', () => {
  it('lấy đoạn cuối đường dẫn làm tiêu đề và tên miền làm mô tả', () => {
    expect(docNhanTuUrl('https://vi.wikipedia.org/wiki/Suy_tim')).toEqual({
      title: 'Suy tim',
      description: 'vi.wikipedia.org',
    })
  })

  it('bỏ đuôi tệp và tiền tố www', () => {
    expect(docNhanTuUrl('https://www.example.org/tai-lieu/phac-do.pdf')).toEqual({
      title: 'phac do',
      description: 'example.org',
    })
  })

  it('trang chủ (không có đoạn đường dẫn) thì tên miền làm tiêu đề', () => {
    expect(docNhanTuUrl('https://example.org/')).toEqual({ title: 'example.org' })
  })

  it('URL hỏng thì trả rỗng, để thượng nguồn tự hiện URL thô', () => {
    expect(docNhanTuUrl('khong-phai-url')).toEqual({})
  })
})

describe('LinkPreviewProvider — đã bị ghi đè ở CẢ HAI chế độ', () => {
  for (const [ten, layBo, loai] of [
    ['bảng vẽ', layExtensionsEdgeless, 'so-do'],
    ['bài viết', layExtensionsTrang, 'bai-viet'],
  ] as const) {
    it(`${ten}: query() trả nhan đề cục bộ và KHÔNG gọi fetch`, async () => {
      const { store, workspace } = await taoHoacMoDoc(`ktb-${loai}`, loai)
      const std = new BlockStdScope({ store, extensions: layBo() })

      // Bẫy `fetch` toàn cục: nếu bản ghi đè trượt, hiện thực thượng nguồn sẽ POST tới endpoint
      // hoặc gọi `api.fxtwitter.com`, và ca này đỏ với đúng URL đã bị gọi. Đây là khẳng định
      // chịu lực của cả tệp — phần còn lại chỉ mô tả hành vi thay thế.
      const goc = globalThis.fetch
      const daGoi: string[] = []
      globalThis.fetch = ((u: unknown) => {
        daGoi.push(String(u))
        return Promise.reject(new Error('ca kiểm cấm gọi mạng'))
      }) as typeof globalThis.fetch

      try {
        const dv = std.get(LinkPreviewServiceIdentifier)
        expect(dv.endpoint, 'endpoint phải rỗng — không có đích nào cả').toBe('')

        const kq = await dv.query('https://vi.wikipedia.org/wiki/Suy_tim')
        expect(kq).toEqual({ title: 'Suy tim', description: 'vi.wikipedia.org' })

        // Link X/Twitter đi nhánh `_fetchTwitterPreview` viết cứng của thượng nguồn — canh riêng.
        const kqX = await dv.query('https://x.com/ai_do/status/123456')
        expect(kqX.title).toBe('123456')

        expect(daGoi, 'không được gọi mạng lần nào').toEqual([])
      } finally {
        globalThis.fetch = goc
        workspace.forceStop()
      }
    })
  }
})
