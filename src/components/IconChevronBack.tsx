// Chevron-back dùng chung giữa App.tsx (icons.back, mọi nút quay lại khác của app) và
// BoardGallery.tsx (nút quay lại màn vẽ Mindmap). Trước đây BoardGallery.tsx chép tay đúng path SVG
// này vì icons.back là hàm PRIVATE trong App.tsx (không export) — bản chép tay không có tín hiệu
// biên dịch nào nếu bản gốc đổi, rủi ro trôi im lặng (critique 2026-09-01, P3). Tách ra đây để cả
// hai nơi luôn vẽ đúng MỘT icon.
export function IconChevronBack({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} style={style} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}
