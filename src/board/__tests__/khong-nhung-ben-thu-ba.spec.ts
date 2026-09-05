// @vitest-environment happy-dom
//
// Ca kiểm hồi quy: KHÔNG có đường nào tạo được khối nhúng bên thứ ba (YouTube/Figma/Loom/GitHub/
// iframe tuỳ ý). Anh em với `khong-ben-thu-ba.spec.ts` — tệp đó canh CSP, endpoint vendored và
// việc xem trước liên kết không gọi mạng; tệp này canh việc không đẻ ra khối chỉ sống được nhờ mạng.
//
// VÌ SAO (đo 2026-09-05 trên Chrome thật qua CDP). CSP `frame-src 'none'` (index.html) chặn đúng
// như thiết kế, nhưng cái người dùng NHÌN THẤY sau khi dán một liên kết YouTube là một khối xám
// 752×545 px mang icon trang lỗi của Chrome (`iframe src=chrome-error://chromewebdata/`), không một
// chữ giải thích; ở khung 390 px nó chiếm gần trọn màn hình. Console cùng lúc đỏ ba dòng:
// `connect-src` chặn oembed, `img-src` chặn ảnh đại diện, `frame-src` chặn iframe. Tức chức năng
// này KHÔNG THỂ hoạt động trong app này — để nó trong menu là mời người dùng đi vào ngõ cụt.
//
// HAI ĐƯỜNG TẠO, phải bịt cả hai (defense in depth) — đo bằng cách dò ngược từ khối embed:
//   1. Menu lệnh `/`: mỗi khối embed tự đăng ký `SlashMenuConfigExtension(<flavour>, …)` trong
//      `blocks/embed/src/<tên>-block/<tên>-spec.ts`. Đường này KHÔNG đi qua `EmbedOptionProvider` —
//      nó gọi thẳng `toggleEmbedCardCreateModal`, nên chặn một mình vế 2 là hở.
//   2. Dán URL / nút "chuyển thành Embed view" trên thẻ liên kết: mọi chỗ đều hỏi
//      `EmbedOptionProvider.getEmbedBlockOptions(url)` (`shared/src/services/embed-option-service.ts`)
//      xem URL này có khối nhúng chuyên dụng không. Trả `null` là URL ở lại dạng thẻ liên kết
//      thường — thứ vẫn đọc được offline nhờ `khongXemTruocQuaMang` suy nhan đề từ chính URL.
//
// CẢ HAI CHẾ ĐỘ, giống `khongXemTruocQuaMang` chứ không hẹp theo chế độ như `banPhimAoTrang`: khối
// nhúng sống được ở cả bài viết lẫn sơ đồ, và CSP chặn ở cả hai, nên ngõ cụt cũng có ở cả hai.
import 'fake-indexeddb/auto'

import { EmbedOptionProvider } from '@blocksuite/affine-shared/services'
import { SlashMenuConfigIdentifier } from '@blocksuite/affine-widget-slash-menu'
import { BlockStdScope } from '@blocksuite/affine/std'
import { describe, expect, it } from 'vitest'

import { layExtensionsEdgeless, layExtensionsTrang } from '../extensions'
import { taoHoacMoDoc } from '../mo-doc'

// Năm flavour tự đăng ký mục menu `/` trong `blocks/embed/src/*/…-spec.ts`. `affine:embed-html`
// KHÔNG có mặt vì nó không đăng ký `SlashMenuConfigExtension` nào; `affine:embed-linked-doc` và
// `affine:embed-synced-doc` là tài liệu NỘI BỘ — không phải bên thứ ba, cố ý không đụng.
const FLAVOUR_NHUNG = [
  'affine:embed-youtube',
  'affine:embed-figma',
  'affine:embed-loom',
  'affine:embed-github',
  'affine:embed-iframe',
]

// URL thật của từng dịch vụ — phải khớp `urlRegex` của khối tương ứng, nếu không phép kiểm thành
// vô nghĩa (regex không khớp thì thượng nguồn cũng trả null, và ca kiểm xanh giả).
const URL_NHUNG = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.figma.com/file/abc123/Design-System',
  'https://www.loom.com/share/abc123def456',
  'https://github.com/toeverything/blocksuite/pull/1',
]

describe('không tạo được khối nhúng bên thứ ba', () => {
  it('chế độ trang: menu / không còn mục nhúng nào', async () => {
    const { store, workspace } = await taoHoacMoDoc('khong-nhung-1', 'bai-viet')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })

    const configs = std.provider.getAll(SlashMenuConfigIdentifier)
    for (const flavour of FLAVOUR_NHUNG) {
      // `getAll` trả `Map<string, {}>` — định danh DI không mang kiểu qua được, nên ép ở đây.
      const cauHinh = configs.get(flavour) as { items?: unknown } | undefined
      const items = cauHinh?.items ?? []
      expect(Array.isArray(items) ? items : []).toHaveLength(0)
    }

    workspace.forceStop()
  })

  it('chế độ sơ đồ: menu / không còn mục nhúng nào', async () => {
    const { store, workspace } = await taoHoacMoDoc('khong-nhung-2', 'so-do')
    const std = new BlockStdScope({ store, extensions: layExtensionsEdgeless() })

    const configs = std.provider.getAll(SlashMenuConfigIdentifier)
    for (const flavour of FLAVOUR_NHUNG) {
      // `getAll` trả `Map<string, {}>` — định danh DI không mang kiểu qua được, nên ép ở đây.
      const cauHinh = configs.get(flavour) as { items?: unknown } | undefined
      const items = cauHinh?.items ?? []
      expect(Array.isArray(items) ? items : []).toHaveLength(0)
    }

    workspace.forceStop()
  })

  it('chế độ trang: dán URL dịch vụ không đổi thành khối nhúng', async () => {
    const { store, workspace } = await taoHoacMoDoc('khong-nhung-3', 'bai-viet')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })

    const provider = std.get(EmbedOptionProvider)
    for (const url of URL_NHUNG) {
      expect(provider.getEmbedBlockOptions(url)).toBeNull()
    }

    workspace.forceStop()
  })

  it('chế độ sơ đồ: dán URL dịch vụ không đổi thành khối nhúng', async () => {
    const { store, workspace } = await taoHoacMoDoc('khong-nhung-4', 'so-do')
    const std = new BlockStdScope({ store, extensions: layExtensionsEdgeless() })

    const provider = std.get(EmbedOptionProvider)
    for (const url of URL_NHUNG) {
      expect(provider.getEmbedBlockOptions(url)).toBeNull()
    }

    workspace.forceStop()
  })
})
