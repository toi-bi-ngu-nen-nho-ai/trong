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
import { LinkPreviewServiceIdentifier } from '@blocksuite/affine-shared/services'
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
