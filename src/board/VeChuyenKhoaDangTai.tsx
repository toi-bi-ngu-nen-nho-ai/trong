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
//
// Màu: LUÔN ăn currentColor từ div bọc (EdgelessBoard.tsx/index.tsx đặt var(--c-text-muted), cùng
// màu với dòng chữ "Đang mở bảng…"/"Đang tải bảng vẽ…" ngay cạnh) — KHÔNG còn nhận tham số tô màu
// riêng theo bảng. Bản trước tô ba chấm bằng hue nhận diện của bảng (mauOnDinh(), luôn rơi trong
// họ tím-hồng [260,330) — xem DanhSachBang.tsx) để nối tiếp continuity vật liệu từ thẻ vừa bấm,
// nhưng hue đó CỐ ĐỊNH trong họ hồng/tím bất kể theme sáng/tối, nên người dùng đọc thành "màu hồng
// cứng, không đổi theo dark/light" (phản hồi thật 2026-08-28) — đúng vì --chip-s/--chip-l CHỈ chỉnh
// độ đậm/nhạt của CÙNG một sắc hồng-tím giữa hai theme, không đổi hẳn sang một màu trung tính khác
// theo theme như --c-text-muted vẫn làm. Bỏ hẳn nhánh tô màu riêng thay vì "chỉnh lại hue cho đúng
// theme hơn" — currentColor kế thừa từ div bọc vốn đã là token --c-text-muted, tự đúng màu ở cả hai
// theme, không cần một cơ chế tô màu song song nữa.
export function VeChuyenKhoaDangTai() {
  return (
    <div aria-hidden="true" className="mind-loading-dots">
      <i />
      <i />
      <i />
    </div>
  )
}
