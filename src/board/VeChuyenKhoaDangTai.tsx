// Hiệu ứng loading "đang mở bảng" — vẽ icon CHUYÊN KHOA của chính bảng đang mở bằng nét, rồi tô đặc
// dần. File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx (vỏ nạp chậm D13) cũng
// cần dùng nó cho màn chờ tải chunk lần đầu ("Đang tải bảng vẽ…") — index.tsx TUYỆT ĐỐI không được
// import bất cứ gì từ EdgelessBoard.tsx (module đó kéo theo ~993 kB gzip BlockSuite, xem chú thích
// D13 ở index.tsx), nhưng file này chỉ phụ thuộc React + SpecialtyIcons.tsx (nhẹ, không BlockSuite)
// nên an toàn để cả hai phía cùng import tĩnh.
//
// Loading trước đây là MỘT chấm tròn phập phồng vô nghĩa, giống hệt cho mọi bảng (inkBloom rồi
// inkRise, index.css — cả hai đã xoá). Phản hồi thật 2026-08-27, lần 2: "chấm tròn nhìn xàm", thay
// bằng "nét line động đang vẽ icon chuyên khoa của mindmap đó — icon thay đổi theo người dùng,
// không cố định lúc tạo". Điểm khó thật: 12/13 icon chuyên khoa (SpecialtyIcons.tsx) là minh hoạ
// giải phẫu CHI TIẾT — một `<path>` DUY NHẤT nhưng hàng nghìn đơn vị độ dài, không phải icon nét
// đơn giản 24×24 vẽ tay được bằng vài lệnh — nên KHÔNG có dasharray cố định nào đoán trước được,
// phải đo path.getTotalLength() THẬT lúc chạy cho ĐÚNG icon đang hiện (đúng yêu cầu "thay đổi theo
// người dùng"). Compound path phức tạp thế này vẽ TUẦN TỰ theo đúng thứ tự lệnh trong path data
// (không phải theo "đường viền ngoài" con mắt người sẽ chọn) nên nét đang vẽ trông như một bản phác
// thảo đang thành hình chứ không phải một đường viền gọn — bù lại bằng cách CHỒNG lớp icon TÔ ĐẶC
// mờ dần hiện lên phía sau, để dù nét vẽ có rối ở giữa chừng, kết quả cuối mỗi vòng vẫn luôn là
// icon quen thuộc y hệt các thẻ bảng khác trong app.
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

    const hoatAnh: Animation[] = []
    const CHU_KY_MS = 2600
    duongNet.forEach((p) => {
      const daiThat = p.getTotalLength()
      p.style.strokeDasharray = `${daiThat}`
      hoatAnh.push(
        p.animate(
          [
            { strokeDashoffset: daiThat, offset: 0 },
            { strokeDashoffset: 0, offset: 0.62 },
            { strokeDashoffset: 0, opacity: 1, offset: 0.8 },
            { strokeDashoffset: 0, opacity: 0, offset: 0.92 },
            { strokeDashoffset: daiThat, opacity: 0, offset: 0.921 },
            { strokeDashoffset: daiThat, opacity: 1, offset: 1 },
          ],
          { duration: CHU_KY_MS, iterations: Infinity, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        ),
      )
    })
    // Lớp tô đặc "bắt kịp" đúng lúc nét vẽ xong (62% chu kỳ) rồi giữ nguyên tới khi nét mờ dần —
    // cùng một Animation timeline gốc (document timeline, khởi động CÙNG lượt tick JS này) nên
    // không bao giờ lệch pha với nét vẽ dù lặp vô hạn.
    hoatAnh.push(
      layTo.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.4 },
          { opacity: 1, offset: 0.62 },
          { opacity: 1, offset: 0.92 },
          { opacity: 0, offset: 0.921 },
          { opacity: 0, offset: 1 },
        ],
        { duration: CHU_KY_MS, iterations: Infinity, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ),
    )
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
      <div ref={layToRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
      <div ref={layNetRef} className="mind-loading-net" style={{ position: 'absolute', inset: 0 }}>
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
    </div>
  )
}
