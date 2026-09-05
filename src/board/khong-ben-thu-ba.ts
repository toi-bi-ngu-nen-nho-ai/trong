// ─── Xem trước liên kết KHÔNG gọi mạng ─────────────────────────────────────────────────────────
//
// Chủ dự án chốt 2026-09-05: "không muốn có bên thứ ba — chỉ lưu trữ nội bộ". Đây là lớp thứ hai
// của ba lớp; lớp ngoài cùng là CSP `connect-src 'self'` trong index.html (đọc chú thích ở đó để
// biết toàn bộ tám điểm gọi mạng của cây vendored).
//
// VÌ SAO CẦN LỚP NÀY KHI ĐÃ CÓ CSP. CSP chặn được, nhưng chặn ở mức trình duyệt nghĩa là lời gọi
// VẪN được phát ra rồi bị từ chối: mỗi thẻ liên kết đẻ một dòng đỏ trong console và một khoảng chờ
// vô ích. Ghi đè ở đây thì không có lời gọi nào để chặn. CSP giữ vai trò lưới an toàn cho những
// điểm chưa ai biết; lớp này lo đường đi thường gặp nhất.
//
// HAI ĐƯỜNG RA CỦA `LinkPreviewService`, và vì sao ghi đè `query` chứ không đổi `endpoint`:
//   1. `_fetchStandardPreview` (link-preview-service.ts:113) — POST tới `this.endpoint`. Đường này
//      cấu hình được, đổi endpoint là chặn được.
//   2. `_fetchTwitterPreview` (link-preview-service.ts:86) — `fetch('https://api.fxtwitter.com/…')`
//      VIẾT CỨNG. Không tham số nào chạm tới được. Dán một link X/Twitter là URL rời máy, bất kể
//      `endpoint` đặt là gì.
// Chỉ ghi đè trọn `query` mới bịt được cả hai.
//
// THAY VÌ TRẢ RỖNG, SUY TIÊU ĐỀ TỪ CHÍNH URL. Thẻ liên kết trống trơn đọc như hỏng. Tên miền cộng
// đoạn cuối đường dẫn là thông tin CÓ SẴN trong chuỗi người dùng vừa dán — không tốn một byte mạng
// nào mà thẻ vẫn đọc được.
import type { LinkPreviewData } from '@blocksuite/affine-model'
import { EmbedOptionProvider, LinkPreviewServiceIdentifier } from '@blocksuite/affine-shared/services'
import { SlashMenuConfigIdentifier } from '@blocksuite/affine-widget-slash-menu'
import type { ServiceProvider } from '@blocksuite/global/di'
import type { ExtensionType } from '@blocksuite/store'

/**
 * Đọc URL thành một nhan đề cục bộ. Không gọi mạng, không đoán bừa: mọi chữ trả về đều lấy từ chính
 * chuỗi đầu vào.
 *
 * `https://vi.wikipedia.org/wiki/Suy_tim` → tiêu đề "Suy tim", mô tả "vi.wikipedia.org".
 * URL không phân giải được → trả `{}`, để thượng nguồn tự hiện URL thô.
 */
export function docNhanTuUrl(url: string): Partial<LinkPreviewData> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return {}
  }

  // Đoạn cuối đường dẫn thường là phần người đọc nhận ra: `/wiki/Suy_tim` → "Suy tim". Bỏ đuôi tệp
  // và đổi `-`/`_` thành khoảng trắng. Rỗng (trang chủ) thì lấy tên miền làm tiêu đề luôn.
  const doan = u.pathname.split('/').filter(Boolean).pop() ?? ''
  const tho = decodeURIComponent(doan)
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()

  const mien = u.hostname.replace(/^www\./, '')
  return tho ? { title: tho, description: mien } : { title: mien }
}

/**
 * Ghi đè `LinkPreviewProvider` bằng một hiện thực KHÔNG chạm mạng.
 *
 * `di.override` chứ không `addImpl`: `LinkPreviewService.setup()` của thượng nguồn đã đăng ký sẵn
 * một hiện thực, mà `addImpl` lần hai sẽ không thay được nó. Cùng lý do `cheDoTrang`/`cheDoEdgeless`
 * phải đứng CUỐI mảng extension — xem ./che-do-co-dinh.ts.
 *
 * `setEndpoint` giữ lại làm no-op và `endpoint` trả chuỗi rỗng: interface đòi cả hai, và có mã
 * thượng nguồn đọc `endpoint` để quyết định đường đi. Chuỗi rỗng nói đúng sự thật — không có
 * endpoint nào cả.
 */
export const khongXemTruocQuaMang: ExtensionType = {
  setup: (di) => {
    di.override(LinkPreviewServiceIdentifier, (_provider: ServiceProvider) => ({
      endpoint: '',
      setEndpoint: () => {},
      query: (url: string) => Promise.resolve(docNhanTuUrl(url)),
    }))
  },
}

// ─── Không tạo được khối nhúng bên thứ ba ───────────────────────────────────────────────────────
//
// Lớp thứ ba, và là lớp DUY NHẤT người dùng nhìn thấy. Hai lớp kia (CSP ở index.html,
// `khongXemTruocQuaMang` ở trên) chặn lời gọi mạng; lớp này gỡ luôn cái nút mời người ta tạo ra một
// khối không bao giờ hiển thị được.
//
// ĐO ĐƯỢC, không suy đoán (Chrome thật qua CDP, 2026-09-05): dán một liên kết YouTube vào bài viết
// cho ra một khối xám 752×545 px mang icon trang lỗi của Chrome — `iframe` bị `frame-src 'none'` từ
// chối, `img-src` từ chối ảnh đại diện, `connect-src` từ chối oembed. Ở khung 390 px nó chiếm gần
// trọn màn hình, không một chữ giải thích. Chức năng này KHÔNG THỂ chạy trong app ngoại tuyến hoàn
// toàn; để nó trong menu chỉ là một ngõ cụt có hình dạng tính năng.
//
// HAI ĐƯỜNG TẠO, bịt cả hai — chặn một đường là hở đường kia:
//   1. Menu lệnh `/`: mỗi khối embed tự đăng ký `SlashMenuConfigExtension(<flavour>, …)` và gọi
//      THẲNG `toggleEmbedCardCreateModal`, không hỏi `EmbedOptionProvider` câu nào.
//   2. Dán URL, hoặc nút "chuyển thành Embed view" trên thẻ liên kết: đều hỏi
//      `EmbedOptionProvider.getEmbedBlockOptions(url)`. Trả `null` là URL ở lại dạng thẻ liên kết
//      thường — vẫn đọc được offline nhờ `docNhanTuUrl` suy nhan đề từ chính URL.
//
// `di.override` chứ không `addImpl`, và extension này phải đứng CUỐI mảng: `override` chỉ thay được
// hiện thực ĐÃ đăng ký, mà cả hai thứ trên do các extension embed/shared đăng ký trước. Cùng lý do
// `cheDoTrang`/`cheDoEdgeless` phải đứng cuối — xem ./che-do-co-dinh.ts.
//
// CỐ Ý KHÔNG ĐỤNG `affine:embed-linked-doc` và `affine:embed-synced-doc`: chúng nhúng tài liệu NỘI
// BỘ của chính app, không chạm mạng, không phải bên thứ ba. `affine:embed-html` cũng không có ở đây
// vì nó không đăng ký mục menu `/` nào.
const FLAVOUR_NHUNG_BEN_THU_BA = [
  'affine:embed-youtube',
  'affine:embed-figma',
  'affine:embed-loom',
  'affine:embed-github',
  // Khối iframe "tuỳ ý": người dùng dán bất kỳ URL nào và thượng nguồn dựng một iframe quanh nó —
  // đúng thứ `frame-src 'none'` sinh ra để chặn.
  'affine:embed-iframe',
]

/**
 * Gỡ mọi đường tạo khối nhúng bên thứ ba. Dùng cho CẢ HAI chế độ (xem `layExtensionsTrang` và
 * `layExtensionsEdgeless`): khối nhúng sống được ở cả bài viết lẫn sơ đồ, và CSP chặn ở cả hai.
 *
 * Không gỡ khối đã có sẵn trong tài liệu cũ — chỉ chặn đường tạo mới. Một tài liệu lỡ chứa khối
 * nhúng từ trước vẫn mở được bình thường (khối đó vẫn là khối xám, nhưng không có gì mới hỏng thêm).
 */
export const khongNhungBenThuBa: ExtensionType = {
  setup: (di) => {
    for (const flavour of FLAVOUR_NHUNG_BEN_THU_BA) {
      di.override(SlashMenuConfigIdentifier(flavour), () => ({ items: [] }))
    }

    di.override(EmbedOptionProvider, () => ({
      getEmbedBlockOptions: () => null,
      // Interface đòi hàm này. No-op: có mã thượng nguồn gọi nó để đăng ký thêm lúc chạy, và ở đây
      // "đăng ký thêm" phải là việc không có tác dụng gì, chứ không phải một lỗi ném ra.
      registerEmbedBlockOptions: () => {},
    }))
  },
}
