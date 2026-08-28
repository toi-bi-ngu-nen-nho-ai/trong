// Hiệu ứng loading "đang mở bảng" — MỘT nét line tự phác dần icon CHUYÊN KHOA của bảng đang mở, lặp
// vô hạn. File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx (vỏ nạp chậm D13)
// cũng dùng nó cho màn chờ tải chunk lần đầu ("Đang tải bảng vẽ…") — index.tsx TUYỆT ĐỐI không được
// import bất cứ gì từ EdgelessBoard.tsx (module đó kéo theo ~993 kB gzip BlockSuite), còn file này
// chỉ phụ thuộc React + SpecialtyIcons.tsx (nhẹ, không BlockSuite) nên an toàn cho cả hai phía
// import tĩnh.
//
// Lịch sử 4 vòng phản hồi thật:
//   1) chữ xám tĩnh  →  2) chấm tròn phập phồng ("nhìn xàm")  →  3) tự vẽ nét TRÊN silhouette tô
//   đặc chi tiết, có lúc chồng thêm lớp tô mờ dần ("nhấp nháy như tắc kè bông")  →  4 (bản này):
//   kể cả khi bỏ hết lớp tô, "vẽ dần" cái silhouette vẫn chỉ ra một ĐỐM SÁNG bò dọc đường ngoằn
//   ngoèo, KHÔNG giống "đang vẽ icon". Nguyên nhân gốc: 10/13 icon SPECIALTY_ICONS là ĐƯỜNG BAO
//   của một mảng TÔ ĐẶC — không có thứ tự nét, nửa chừng là khúc viền vô nghĩa.
//
// Bản này đổi KIẾN TRÚC, không phải tham số: dùng specialtyLinePath (SpecialtyIcons.tsx) — icon NÉT
// ĐƠN khung 24, vẽ theo thứ tự tay người — gồm:
//   • .drt-trail : <path> nét đã đặt xuống; strokeDashoffset chạy dai→0 để lộ dần (KHÔNG keyframe
//                  opacity trên nét).
//   • .drt-tip   : MỘT hạt tròn sáng có quầng ("đầu bút") cưỡi dọc CHÍNH path đó bằng CSS Motion
//                  Path (offset-path: path(d) + offset-distance 0%→100% đồng bộ mép nét) — đây là
//                  phần "đường line đang chạy" chủ dự án yêu cầu, thấy rõ ở mọi kích cỡ. Dạng dash
//                  ngắn kiểu bút trước đó gần như vô hình ở 64px.
// Hết một vòng: nét KHÔNG mờ đi mà trượt hẳn khỏi đuôi path (dashoffset 0→-dai) rồi vẽ lại từ đầu —
// không khung hình "đã hoàn thiện" nào loé lên rồi tắt. Mốc loop offset -dai ↔ dai đều là path
// rỗng nên nối vòng liền mạch.
//
// giảm-chuyển-động / thiếu Web Animations API (happy-dom trong vitest, vài trình duyệt cũ): đứng
// yên ở nét đã-vẽ-xong (dashoffset 0, ẩn hạt đầu bút). getTotalLength() CHỈ gọi SAU nhánh guard
// này — happy-dom không cài nó, gọi sớm sẽ ném TypeError giữa useEffect và làm vỡ cả EdgelessBoard
// (edgeless-board-mount.spec.ts bắt đúng ca đó).
import { useEffect, useRef } from 'react'

import { specialtyLinePath } from '../components/SpecialtyIcons'

export function VeChuyenKhoaDangTai({ khoa, mauNhanDien }: { khoa?: string; mauNhanDien?: number }) {
  const bocRef = useRef<HTMLDivElement>(null)
  const d = specialtyLinePath(khoa)

  useEffect(() => {
    const boc = bocRef.current
    if (!boc) return
    const vet = boc.querySelector<SVGPathElement>('.drt-trail')
    const dau = boc.querySelector<SVGCircleElement>('.drt-tip')
    if (!vet || !dau) return

    const giamChuyenDong =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const thieuWaapi = typeof vet.animate !== 'function'

    if (giamChuyenDong || thieuWaapi) {
      // Đứng yên ở nét ĐÃ VẼ XONG — vẫn đúng icon khoa, chỉ không chuyển động. KHÔNG chạm
      // getTotalLength() ở đây (happy-dom chưa cài; xem chú thích đầu file).
      vet.style.strokeDasharray = 'none'
      vet.style.strokeDashoffset = '0'
      dau.style.opacity = '0'
      return
    }

    const dai = vet.getTotalLength()
    vet.style.strokeDasharray = `${dai}`
    // Hạt đầu bút bám CHÍNH path này; offset-distance đo theo % nên đồng bộ trực tiếp với phần
    // trăm nét đã lộ ra, không cần biết `dai`.
    dau.style.offsetPath = `path('${d}')`
    dau.style.offsetRotate = '0deg'

    const CHU_KY_MS = 2600
    const VE_XONG = 0.62 // mốc % chu kỳ: nét vẽ xong
    const GIU_XONG = 0.86 // giữ nguyên hình tới đây rồi mới cho nét trượt đi
    const easeVe = 'cubic-bezier(0.65, 0, 0.35, 1)'

    const aVet = vet.animate(
      [
        { strokeDashoffset: dai, offset: 0, easing: easeVe },
        { strokeDashoffset: 0, offset: VE_XONG, easing: 'linear' },
        { strokeDashoffset: 0, offset: GIU_XONG, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' },
        { strokeDashoffset: -dai, offset: 1 }, // trượt hẳn khỏi đuôi — "chạy hết" chứ không fade
      ],
      { duration: CHU_KY_MS, iterations: Infinity },
    )

    // Hạt đầu bút: đi 0%→100% dọc path CÙNG easing easeVe trên quãng 0→VE_XONG nên luôn nằm đúng
    // mép nét đang lộ ra. Hiện lên chớp nhoáng ở đầu, tắt ngay khi vẽ xong (trước lúc nét trượt đi).
    const tatDau = Math.min(VE_XONG + 0.05, GIU_XONG)
    const aDau = dau.animate(
      [
        { offsetDistance: '0%', opacity: 0, offset: 0 },
        { offsetDistance: '0%', opacity: 1, offset: 0.05, easing: easeVe },
        { offsetDistance: '100%', opacity: 1, offset: VE_XONG },
        { offsetDistance: '100%', opacity: 0, offset: tatDau },
        { offsetDistance: '100%', opacity: 0, offset: 1 },
      ],
      { duration: CHU_KY_MS, iterations: Infinity },
    )

    return () => {
      aVet.cancel()
      aDau.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ dựng lại khi ĐỔI khoa (icon khác
    // = path khác = độ dài khác). mauNhanDien đổi chỉ cần render lại `color` inline, hoạt ảnh không
    // cần biết giá trị đó.
  }, [khoa])

  return (
    <div
      aria-hidden="true"
      ref={bocRef}
      className="mind-loading-net"
      style={{
        width: 64,
        height: 64,
        color: `hsl(${mauNhanDien ?? 327} var(--chip-s) var(--chip-l))`,
      }}
    >
      <svg viewBox="0 0 24 24">
        <path className="drt-trail" d={d} />
        <circle className="drt-tip" r={1.4} />
      </svg>
    </div>
  )
}
