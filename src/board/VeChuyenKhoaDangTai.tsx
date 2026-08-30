// Màn chờ mở bảng — LINE-DRAWING trên CHÍNH icon chuyên khoa có sẵn (SPECIALTY_ICONS trong
// components/SpecialtyIcons.tsx). Không có icon nào được vẽ mới cho màn này: component render
// đúng `specialtyIcon(khoa)` mà thẻ bảng / bộ lọc / TheTrong vẫn dùng, rồi tự phác đường viền của
// nó bằng nét bút, xong thì "ăn mực" thành đúng icon đặc như thường.
//
// File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx (vỏ nạp chậm D13) cũng
// dùng nó cho màn tải chunk lần đầu — index.tsx TUYỆT ĐỐI không được import gì từ EdgelessBoard.tsx
// (module đó kéo theo ~993 kB gzip BlockSuite). Component này chỉ phụ thuộc React + SpecialtyIcons.
// tsx + specialties.ts (hằng số) nên an toàn cho cả hai phía import tĩnh.
//
// ─── Cách vẽ: NHÂN BẢN icon thật, không chép lại hình ──────────────────────────────────────────
// Lớp nét là một `cloneNode(true)` của đúng <svg> mà specialtyIcon() render ra, nên mọi <g>,
// transform, viewBox, thứ tự path đều giữ nguyên tuyệt đối — không có cách nào hình bị lệch so với
// icon thật. Trên bản sao đó:
//   • mỗi <path> được TÁCH theo lệnh `M` thành nhiều <path> con (mỗi mảnh = một nét bút), vì
//     silhouette của bộ icon này gộp cả đường bao ngoài lẫn các lỗ/chi tiết trong cùng một chuỗi
//     `d`. Tách ra thì đường bao ngoài chạy trước, chi tiết trong chạy sau — đọc ra "đang phác".
//   • các mảnh đó chuyển sang chế độ nét (fill:none, stroke:currentColor) và lộ dần bằng
//     stroke-dashoffset. `pathLength="1"` chuẩn hoá độ dài về [0,1] nên KHÔNG cần getTotalLength()
//     (happy-dom trong vitest không cài hàm đó — bản 2026-08-28 từng vỡ đúng chỗ này).
//   • các nét khởi động SO LE nhưng cùng kết thúc ở mốc VE_XONG: hình tụ lại thành một, không phải
//     30 nét nhấp nháy rời rạc.
// Vẽ xong: icon THẬT (bản đặc, đang opacity 0 bên dưới) hiện lên trong lúc lớp nét tan đi — khoảnh
// khắc "ăn mực". Giữ hình một nhịp rồi cả cụm mờ đi và vẽ lại từ đầu.
//
// Bốn vòng phản hồi trước đều hỏng vì lộ dần MỘT path liền mạch (đọc thành "vệt sáng bò dọc dây")
// và không bao giờ kết thúc ở icon thật. Hai điểm đó là thứ bản này sửa.
//
// giảm-chuyển-động / thiếu Web Animations API (happy-dom, trình duyệt cũ): KHÔNG dựng lớp nét,
// chỉ hiện icon chuyên khoa thật, tĩnh, đủ nhận ra bảng nào đang mở. WAAPI không nghe
// @media (prefers-reduced-motion) nên guard bắt buộc nằm ở JS này.
import { useLayoutEffect, useRef } from 'react'

import { specialtyIcon } from '../components/SpecialtyIcons'
import { SPECIALTIES } from '../data/specialties'

const CHU_KY_MS = 2800
const BAT_DAU_TRE = 0.34 // nét cuối cùng bắt đầu ở mốc này của chu kỳ
const VE_XONG = 0.58 // mọi nét cùng khép lại ở đây
const AN_MUC = 0.72 // icon đặc hiện xong
const GIU_XONG = 0.9 // giữ nguyên hình tới đây rồi mờ đi
const easeVe = 'cubic-bezier(0.65, 0.05, 0.36, 1)'

export function VeChuyenKhoaDangTai({ khoa }: { khoa?: string }) {
  const bocRef = useRef<HTMLDivElement>(null)
  // Màu nhận diện của khoa — cùng hằng số spec.color mà thẻ bảng và specialtyIcon() vẫn ăn theo.
  // Khoa lạ / bảng chưa gắn khoa → màu chữ mờ trung tính (icon "trang giấy" mặc định cũng trung tính).
  const mau = SPECIALTIES.find((s) => s.id === khoa)?.color ?? 'var(--c-text-muted, #6b6e96)'

  // useLayoutEffect (không phải useEffect): hoạt ảnh đặt icon thật về opacity 0 ở mốc 0 của chu
  // kỳ. Chạy SAU lượt vẽ thì có đúng một khung hình loé nguyên icon đặc rồi mới tắt đi để nét bắt
  // đầu — đọc thành một cú giật. useLayoutEffect chạy trước lượt vẽ đầu tiên nên không có cú đó.
  useLayoutEffect(() => {
    const boc = bocRef.current
    if (!boc) return
    const iconThat = boc.querySelector<SVGSVGElement>('svg')
    if (!iconThat) return

    const giamChuyenDong =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const thieuWaapi = typeof iconThat.animate !== 'function'
    // Không hoạt ảnh: để nguyên icon thật, đặc, tĩnh (trạng thái nền của CSS).
    if (giamChuyenDong || thieuWaapi) return

    // ── Lớp nét = bản sao đúng icon thật, chuyển sang chế độ nét và tách theo từng mảnh `M` ──
    const lopNet = iconThat.cloneNode(true) as SVGSVGElement
    // Đè hẳn class của bản sao (bản gốc mang class bố cục của nơi gọi) — lớp nét chỉ cần phủ đúng
    // lên icon thật.
    lopNet.setAttribute('class', 'mind-loading-net')

    // Bề dày nét tính theo khung nhìn của CHÍNH icon đó: bộ silhouette dùng viewBox ~672-709 đơn
    // vị, bộ nét-đơn dùng 24 — một con số cứng sẽ hoặc mất hút hoặc dày như mảng đặc.
    const vb = (lopNet.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number)
    const beRong = vb[2] || 24
    // Icon vốn đã là nét (fill="none") thì giữ đúng bề dày gốc của nó; icon đặc thì quy ra ~1/58
    // bề rộng khung — đủ mảnh để đọc là "nét bút", đủ dày để thấy rõ ở 72px.
    const netSan = lopNet.getAttribute('fill') === 'none'
    const beDay = netSan ? Number(lopNet.getAttribute('stroke-width')) || 1.6 : beRong / 58

    const manh: SVGPathElement[] = []
    for (const p of Array.from(lopNet.querySelectorAll('path'))) {
      const d = p.getAttribute('d') ?? ''
      // Mỗi lệnh `M` mở một nét bút mới (bút nhấc lên giữa các mảng của cùng một hình).
      const khuc = d.match(/M[^M]*/g) ?? []
      const cha = p.parentNode
      if (!cha || khuc.length === 0) continue
      for (const k of khuc) {
        const moi = p.cloneNode(false) as SVGPathElement
        moi.setAttribute('d', k.trim())
        moi.setAttribute('pathLength', '1')
        moi.setAttribute('fill', 'none')
        moi.setAttribute('stroke', 'currentColor')
        moi.setAttribute('stroke-width', String(beDay))
        moi.setAttribute('stroke-linecap', 'round')
        moi.setAttribute('stroke-linejoin', 'round')
        moi.style.strokeDasharray = '1'
        moi.style.strokeDashoffset = '1'
        cha.insertBefore(moi, p)
        manh.push(moi)
      }
      cha.removeChild(p)
    }
    if (manh.length === 0) return
    boc.appendChild(lopNet)

    const n = manh.length
    const anims = manh.map((p, i) => {
      const batDau = n === 1 ? 0 : (i / (n - 1)) * BAT_DAU_TRE
      return p.animate(
        [
          { strokeDashoffset: 1, offset: 0, easing: 'linear' },
          { strokeDashoffset: 1, offset: batDau, easing: easeVe },
          { strokeDashoffset: 0, offset: VE_XONG, easing: 'linear' },
          { strokeDashoffset: 0, opacity: 1, offset: AN_MUC - 0.06, easing: 'ease-out' },
          // Nét mờ đi ĐÚNG NHỊP mảng đặc hiện lên. Hai lớp CỐ Ý chồng nhau trong quãng giao thoa
          // ngắn này: nét nằm khít trên đường bao của mảng đặc nên mắt đọc thành "nét dày dần lên
          // thành mảng" — chính là khoảnh khắc ăn mực, không phải hai hình khác nhau đè lên nhau.
          { strokeDashoffset: 0, opacity: 0, offset: AN_MUC },
          { strokeDashoffset: 0, opacity: 0, offset: 1 },
        ],
        { duration: CHU_KY_MS, iterations: Infinity },
      )
    })

    // Icon THẬT: nằm im ở opacity 0 tới lúc nét khép lại, rồi "ăn mực" hiện ra nguyên bản.
    const animThat = iconThat.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: AN_MUC - 0.06, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        { opacity: 1, offset: AN_MUC },
        { opacity: 1, offset: GIU_XONG, easing: 'ease-in' },
        { opacity: 0, offset: 0.99 },
        { opacity: 0, offset: 1 },
      ],
      { duration: CHU_KY_MS, iterations: Infinity },
    )

    return () => {
      for (const a of anims) a.cancel()
      animThat.cancel()
      lopNet.remove()
    }
    // Dựng lại khi ĐỔI khoa (icon khác = hình khác = số mảnh khác).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoa])

  return (
    <div ref={bocRef} aria-hidden="true" className="mind-loading-ve" style={{ color: mau }}>
      {specialtyIcon(khoa, 'mind-loading-that')}
    </div>
  )
}
