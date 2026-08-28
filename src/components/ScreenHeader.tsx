import type { ReactNode } from "react"

import { C, T } from "../lib/ui"

// ─── Tiêu đề màn hình dùng chung — MỘT nguồn sự thật ──────────────────────────
//
// Trước đây mỗi màn (Thư viện / Mindmap / Dùng thuốc / Ôn tập) tự viết tiêu đề riêng: cỡ chữ lúc
// 24px lúc 20px lúc 17px, khoảng đệm trên mỗi nơi một số (pt-1 / pt-2 / 14px), có nơi thêm viền +
// nền, có nơi không — cùng là "tiêu đề màn hình" mà mỗi màn cư xử một kiểu. Mindmap là màn cuối cùng
// được kéo về đây (2026-08-28): trước đó nó có header tự chế (17px, letter-spacing, borderBottom,
// nền --c-page, kèm nút "+ Bảng mới" thừa).
//
// `ScreenHeader` chốt lại MỘT cách duy nhất: đệm cố định (px-5 pt-3 pb-3), cỡ chữ cố định (20px
// bold, --c-text), hàng tiêu đề có chiều cao tối thiểu bằng đúng chiều cao nút phụ (min-h-9, kể cả
// khi không có nút phụ) nên chữ không bao giờ nhảy vị trí, KHÔNG viền/nền, và bản thân nó luôn là
// `flex-none` — nơi gọi chỉ cần đặt nó NGOÀI vùng `scroll-ios` (bọc màn trong `h-full flex flex-col`)
// là tiêu đề tự động đứng yên khi cuộn. Mọi màn cấp-tab mới PHẢI dùng component này, không viết
// tiêu đề rời tại chỗ.
export function ScreenHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex-none px-5 pt-3 pb-3">
      {/* min-h-9 (36px) = đúng chiều cao mọi nút phụ (h-9) trong các màn này — có nút hay không thì
          hàng vẫn cao như nhau, nên `items-center` không kéo chữ lệch theo chiều cao nút. */}
      <div className="min-h-9 flex items-center justify-between gap-3">
        {/* flex-1 min-w-0: flex item mặc định min-width:auto theo nội dung, nên `truncate` không
            có tác dụng khi tiêu đề đủ dài đứng cạnh cụm nút "Tìm"/"Nhật ký" — chữ tràn ra ngoài
            hàng thay vì bị cắt gọn. Cùng lỗi min-width đã gặp ở PatientPanel (ô Creatinin). */}
        <h1 className="flex-1 min-w-0 text-[20px] font-bold leading-[1.3] truncate" style={{ color: C.text }}>
          {title}
        </h1>
        {actions && <div className="flex-none flex items-center gap-1.5">{actions}</div>}
      </div>
      {subtitle && (
        <p className={`${T.meta} mt-0.5 truncate`} style={{ color: C.textSoft }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
