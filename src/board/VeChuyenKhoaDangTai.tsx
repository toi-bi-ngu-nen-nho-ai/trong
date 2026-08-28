// Màn chờ "đang mở bảng" — BA CHẤM nhảy lên xuống so le, kiểu loader phổ thông ("typing
// indicator"). Toàn bộ hoạt ảnh nằm ở CSS (@keyframes mindDotBounce + animation-delay so le trong
// index.css) nên component này chỉ là markup tĩnh.
//
// TRƯỚC ĐÂY chỗ này là hiệu ứng tự vẽ icon chuyên khoa của bảng đang mở (qua 4 vòng phản hồi:
// chữ xám → chấm tròn phập phồng → tự vẽ nét trên silhouette → nét đơn + hạt đầu bút) — mọi bản
// đều bị đọc sai ("line sáng light lên", không ra "đang vẽ"). Bỏ hẳn theo yêu cầu chủ dự án
// 2026-08-28: chỉ cần "..." nhảy theo trình tự như template thế giới.
//
// File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx (vỏ nạp chậm D13) cũng
// dùng nó cho màn tải chunk lần đầu ("Đang tải bảng vẽ…") — index.tsx TUYỆT ĐỐI không được import
// bất cứ gì từ EdgelessBoard.tsx (module đó kéo theo ~993 kB gzip BlockSuite). Component này giờ
// không phụ thuộc gì ngoài React nên an toàn cho cả hai phía.
//
// giảm-chuyển-động: index.css tắt animation ở @media (prefers-reduced-motion: reduce) — ba chấm
// vẫn hiện (người dùng vẫn cần biết "đang chờ"), chỉ không nhún.

export function VeChuyenKhoaDangTai({ mauNhanDien }: { mauNhanDien?: number }) {
  return (
    <div
      aria-hidden="true"
      className="mind-loading-dots"
      style={
        mauNhanDien != null
          ? { color: `hsl(${mauNhanDien} var(--chip-s) var(--chip-l))` }
          : undefined
      }
    >
      <i />
      <i />
      <i />
    </div>
  )
}
