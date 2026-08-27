// Hiệu ứng loading "đang mở bảng" — MỘT nét line đơn chuyển động như đang vẽ icon CHUYÊN KHOA của
// chính bảng đang mở, lặp vô hạn. File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx
// (vỏ nạp chậm D13) cũng cần dùng nó cho màn chờ tải chunk lần đầu ("Đang tải bảng vẽ…") —
// index.tsx TUYỆT ĐỐI không được import bất cứ gì từ EdgelessBoard.tsx (module đó kéo theo ~993 kB
// gzip BlockSuite, xem chú thích D13 ở index.tsx), nhưng file này chỉ phụ thuộc React +
// SpecialtyIcons.tsx (nhẹ, không BlockSuite) nên an toàn để cả hai phía cùng import tĩnh.
//
// Loading trước đây là MỘT chấm tròn phập phồng vô nghĩa, giống hệt cho mọi bảng (inkBloom rồi
// inkRise, index.css — cả hai đã xoá). Phản hồi thật 2026-08-27, lần 2: "chấm tròn nhìn xàm", thay
// bằng "nét line động đang vẽ icon chuyên khoa". LẦN ĐẦU sửa việc này từng CHỒNG một lớp icon TÔ ĐẶC
// mờ dần lên trên nét vẽ (để che phần path phức tạp vẽ lộn xộn giữa chừng) — phản hồi thật ngay sau
// đó, lần 3: lớp tô đặc phồng lên rồi biến mất mỗi vòng lặp đọc như "bức ảnh hoàn thiện nhấp nháy
// như tắc kè bông", không phải "đang vẽ". Bỏ hẳn kiểu che-bằng-flash đó. Bản này KHÔNG có lớp nào đổi
// opacity qua lại: lớp NỀN (layTo) là icon tô đặc mờ CỐ ĐỊNH (opacity không đổi suốt vòng lặp, chỉ để
// mắt nhận ra hình dạng đích), lớp NÉT (layNet) là MỘT stroke-dasharray tự vẽ dần rồi bật lại về đầu
// — không opacity keyframe nào trên nét vẽ, không có khung hình "đã hoàn thiện" nào bị lộ ra rồi tắt.
// Điểm khó thật vẫn còn nguyên: 12/13 icon chuyên khoa (SpecialtyIcons.tsx) là minh hoạ giải phẫu CHI
// TIẾT — một `<path>` DUY NHẤT nhưng hàng nghìn đơn vị độ dài — nên không có dasharray cố định nào
// đoán trước được, phải đo path.getTotalLength() THẬT lúc chạy cho ĐÚNG icon đang hiện (đúng yêu cầu
// "thay đổi theo người dùng, không cố định lúc tạo").
import { useEffect, useRef } from 'react'

import { specialtyIcon } from '../components/SpecialtyIcons'

export function VeChuyenKhoaDangTai({ khoa, mauNhanDien }: { khoa?: string; mauNhanDien?: number }) {
  const layNetRef = useRef<HTMLDivElement>(null)
  const layToRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layNet = layNetRef.current
    const layTo = layToRef.current
    if (!layNet || !layTo) return
    const duongNet = Array.from(layNet.querySelectorAll('path'))
    if (duongNet.length === 0) return

    const giamChuyenDong =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // happy-dom (môi trường vitest) chưa cài Element.animate() — và một số trình duyệt thật cũ cũng
    // vậy. Rơi về đúng nhánh trạng thái tĩnh "đã vẽ xong" dùng chung với reduced-motion thay vì để
    // p.animate() ném TypeError giữa useEffect, làm crash cả EdgelessBoard (bắt được qua 7/7 ca vỡ
    // của edgeless-board-mount.spec.ts khi thiếu guard này).
    const thieuWaapi = typeof duongNet[0].animate !== 'function'

    if (giamChuyenDong || thieuWaapi) {
      // Đứng yên ở trạng thái ĐÃ VẼ XONG — vẫn là icon đúng chuyên khoa, chỉ không có chuyển động
      // (giảm chuyển động ≠ tắt hẳn phản hồi — feedback xác nhận vẫn phải đọc được, animate.md).
      duongNet.forEach((p) => {
        p.style.strokeDasharray = 'none'
      })
      layTo.style.opacity = '1'
      return
    }

    // layTo giữ đúng opacity 0.16 đặt sẵn trong JSX bên dưới — nền mờ CỐ ĐỊNH, không đổi động ở đây
    // (khác bản trước có layTo.animate phồng-rồi-tắt), nên không cần đụng gì tới nó trong nhánh này.

    const hoatAnh: Animation[] = []
    const CHU_KY_MS = 2400
    duongNet.forEach((p) => {
      const daiThat = p.getTotalLength()
      p.style.strokeDasharray = `${daiThat}`
      hoatAnh.push(
        p.animate(
          [
            // Vẽ dần: easing ease-out riêng cho đoạn 0→58% (nét "chậm lại" khi gần xong, giống tay
            // vẽ thật) — chỉ strokeDashoffset đổi, KHÔNG có key `opacity` nào ở đây.
            { strokeDashoffset: daiThat, offset: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
            // Giữ nguyên hình đã vẽ xong một nhịp để mắt kịp nhận ra icon.
            { strokeDashoffset: 0, offset: 0.58, easing: 'linear' },
            { strokeDashoffset: 0, offset: 0.82, easing: 'cubic-bezier(0.7, 0, 1, 1)' },
            // Bật nhanh về đầu (nét "biến mất" bằng cách rút dasharray, không phải bằng fade) — độ
            // dốc easing ease-in mạnh ở đoạn 82→100% làm cú bật này đọc như một nét vừa rút xong để
            // vẽ lại, chứ không phải một cú giật khung hình.
            { strokeDashoffset: daiThat, offset: 1 },
          ],
          { duration: CHU_KY_MS, iterations: Infinity },
        ),
      )
    })
    return () => hoatAnh.forEach((a) => a.cancel())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần dựng lại hoạt ảnh khi ĐỔI
    // chuyên khoa (icon khác = path khác = độ dài khác), không phải mỗi khi mauNhanDien đổi (màu
    // tính thẳng vào `color` inline mỗi lượt render, không cần hoạt ảnh biết giá trị đó).
  }, [khoa])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 64,
        height: 64,
        color: `hsl(${mauNhanDien ?? 327} var(--chip-s) var(--chip-l))`,
      }}
    >
      <div ref={layToRef} style={{ position: 'absolute', inset: 0, opacity: 0.16 }}>
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
      <div ref={layNetRef} className="mind-loading-net" style={{ position: 'absolute', inset: 0 }}>
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
    </div>
  )
}
