import { icons } from "../components/icons"
import { ScreenHeader } from "../components/ScreenHeader"
import { C } from "../lib/ui"

// Trước đây mấy thẻ trong "Truy cập nhanh" (Phác đồ, Công cụ tính, Cập nhật guideline...) đều âm
// thầm mở màn Thư viện — một tính năng CHƯA XÂY, đội lốt một tính năng ĐÃ XONG. Người bấm vào không
// có cách nào phân biệt "à, đây là kho bài viết" với "ơ sao Công cụ tính lại ra danh sách chuyên
// khoa" — trông như bấm lạc. Giờ tính năng nào chưa có màn riêng thì nói thẳng "sắp có", không giả
// vờ đã xong bằng cách trỏ tạm sang một màn không liên quan.
// `onBack` chỉ truyền khi màn này được mở như một MÀN CHI TIẾT (từ thẻ ở Truy cập nhanh — nằm
// trong NON_TAB_SCREENS, ẩn thanh nav dưới, cần đường quay lại). Bỏ trống khi màn này đứng nguyên
// tại một TAB dưới thanh nav (vd FlashCard) — tab thì không "quay lại", chỉ đổi tab khác, nên dùng
// ScreenHeader giống mọi tab khác thay vì vẽ một nút Quay lại vô nghĩa.
export function ComingSoonScreen({ feature, onBack }: { feature: string; onBack?: () => void }) {
  return (
    <div className="h-full flex flex-col screen-transition">
      {onBack ? (
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.line }}>
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary-deep)" }}>
            {icons.back()}
            Quay lại
          </button>
          <span className="text-sm font-semibold text-slate-900">{feature}</span>
          <span className="w-16" />
        </div>
      ) : (
        <ScreenHeader title={feature} />
      )}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: C.primarySoft, color: C.primary }}>
          {icons.comingSoon()}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-[17px]">{feature} — sắp ra mắt</p>
          <p className="text-[13px] text-slate-400 leading-relaxed mt-1.5 max-w-[280px]">
            Mục này đang được xây dựng và sẽ xuất hiện trong bản cập nhật sắp tới. Các tính năng khác của app vẫn dùng bình thường.
          </p>
        </div>
      </div>
    </div>
  )
}
