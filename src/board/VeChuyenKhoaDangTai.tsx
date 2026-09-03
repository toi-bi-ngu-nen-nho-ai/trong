// Màn chờ mở bảng — LINE-DRAWING trên CHÍNH icon có sẵn của bảng (SpecialtyIcons.tsx). Không có
// icon nào được vẽ mới cho màn này: component render đúng `iconBangSoDo(khoa)` mà TheTrong (thẻ ở
// lưới) vẫn dùng — icon chuyên khoa nếu bảng đã gắn khoa, bóng đèn "chưa gắn chuyên khoa" nếu chưa
// — rồi tự phác đường viền của nó bằng nét bút, xong thì "ăn mực" thành đúng icon đặc như thường.
// Gọi CÙNG một hàm với TheTrong là bắt buộc: hai nhánh tĩnh/động phải ra đúng một hình, nếu không
// cú FLIP lúc mở bảng đổi hình giữa chừng.
//
// File RIÊNG (không nằm trong EdgelessBoard.tsx) vì src/board/index.tsx (vỏ nạp chậm D13) cũng
// dùng nó cho màn tải chunk lần đầu — index.tsx TUYỆT ĐỐI không được import gì từ EdgelessBoard.tsx
// (module đó kéo theo ~993 kB gzip BlockSuite). Component này chỉ phụ thuộc React + SpecialtyIcons.
// tsx + specialties.ts (hằng số) nên an toàn cho cả hai phía import tĩnh.
//
// Icon "chưa gắn chuyên khoa" (bóng đèn + bút chì + bánh răng, chủ dự án cấp 2026-09-04) đi qua
// ĐÚNG cỗ máy này, không có đường riêng: nó cũng là một <svg> đặc, cùng khuôn
// `fill="currentColor" stroke="none"` ở root và nhiều lệnh `M` — 17 nét bút, nhiều hơn hẳn icon
// chuyên khoa, nên cung vẽ đọc ra rõ hơn.
//
// ─── Cách vẽ: NHÂN BẢN icon thật, không chép lại hình ──────────────────────────────────────────
// Lớp nét là một `cloneNode(true)` của đúng <svg> mà iconBangSoDo() render ra, nên mọi <g>,
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
// khắc "ăn mực". Giữ hình một nhịp rồi cả cụm mờ đi và vẽ lại từ đầu. Trọn cung:
// tự vẽ → ăn mực → đứng nguyên → tan → (lớp phủ mở ra canvas).
//
// Bốn vòng phản hồi trước đều hỏng vì lộ dần MỘT path liền mạch (đọc thành "vệt sáng bò dọc dây")
// và không bao giờ kết thúc ở icon thật. Hai điểm đó là thứ bản này sửa.
//
// KÍCH THƯỚC do NƠI GỌI cấp (component chỉ lấp đầy khung cha) — nó được dùng ở hai cỡ rất khác
// nhau: một ô 72px giữa màn chờ trần, và ô huy hiệu 34% bề rộng tấm thẻ trong lớp phủ FLIP.
//
// giảm-chuyển-động / thiếu Web Animations API (happy-dom, trình duyệt cũ): KHÔNG dựng lớp nét,
// chỉ hiện icon chuyên khoa thật, tĩnh, đủ nhận ra bảng nào đang mở. WAAPI không nghe
// @media (prefers-reduced-motion) nên guard bắt buộc nằm ở JS này.
import { useLayoutEffect, useRef } from 'react'

import { iconBangSoDo } from '../components/SpecialtyIcons'
import { SPECIALTIES } from '../data/specialties'

// Chu kỳ bắt đầu ĐÚNG Ở MỐC 0 — tức nét đặt bút ngay khung hình đầu. Thứ tự chủ dự án chốt
// (2026-08-30): tự vẽ → ăn mực → đứng nguyên → tan → mở ra canvas.
//
// Một lượt trước từng cho chu kỳ khởi động ở mốc AN_MUC (delay âm) để khung đầu là icon đặc, khớp
// từng pixel với thẻ trong lưới lúc cú FLIP phóng to. Bỏ theo yêu cầu: nó đẩy "đứng nguyên → tan"
// lên trước phần vẽ, đúng thứ tự ngược lại. Cái giá còn lại của việc bỏ là một khoảng rất ngắn đầu
// chu kỳ chưa có nét nào — nhịp mới rút xuống 900ms (vẽ xong ở 468ms, nhanh gấp ~1,74× so với
// 1624ms cũ) nên khoảng đó ngắn hơn cú phóng to 0,38s, người dùng thấy tim ĐANG ĐƯỢC PHÁC trong
// lúc thẻ bay ra chứ không thấy một ô trống.
//
// Vì sao rút ngắn: bảng có thể mở rất nhanh (chunk đã cache, IndexedDB đồng bộ tức thì) — đo được
// 2,5s ở máy thật nhưng có thể ngắn hơn nhiều. Nhịp cũ 2800ms khiến nhiều lượt mở chỉ kịp thấy
// một mẩu nét rồi lớp phủ đã tan. Nhịp mới chạy trọn cung vẽ→ăn mực→giữ icon trong 0,9s.
const CHU_KY_MS = 900
// Mỗi nét chiếm MỘT KHUNG GIỜ RIÊNG trong quãng vẽ, nối đuôi nhau — không phải cùng khởi động so
// le rồi cùng khép lại ở VE_XONG. Bản chồng-lấn trước đó cho ra 4-5 mẩu nét dở dang rải rác khắp
// hình ở đầu chu kỳ (đo 2026-08-30, chụp ở mốc 200ms): đọc thành "mấy vệt rời rạc" — đúng chế độ
// hỏng của 4 vòng phản hồi trước, không ra MỘT cây bút đang đi. Tuần tự thì bút chỉ ở một chỗ tại
// một thời điểm; đó mới là line-drawing.
// GOI_LEN: nét kéo dài thêm sang khung giờ kế bấy nhiêu lần, để hai nét liên tiếp giao nhau một
// chút cho liền mạch thay vì giật cục từng nét.
const GOI_LEN = 1.35
const VE_XONG = 0.52 // mọi nét cùng khép lại ở đây (936ms)
const AN_MUC = 0.64 // icon đặc hiện xong (1152ms)
// (Từng có `GIU_XONG = 0.86` cho quãng "giữ nguyên hình rồi mờ đi". Hoạt ảnh kết thúc ở AN_MUC,
// còn quãng giữ hình do lớp phủ bên ngoài quyết định, nên hằng số đó không còn ai đọc — gỡ vì
// `noUnusedLocals` làm ĐỎ cổng kiểu trên main.)
const easeVe = 'cubic-bezier(0.65, 0.05, 0.36, 1)'

// Băm id thành hue [260,330) — BẢN SAO CỦA mauOnDinh() (DanhSachBang.tsx), KHÔNG import: file này cố
// tình chỉ phụ thuộc React + SpecialtyIcons.tsx + specialties.ts (xem chú thích đầu file) để an toàn
// cho cả index.tsx (màn tải chunk lần đầu, ranh giới nạp chậm D13) lẫn EdgelessBoard.tsx import tĩnh
// — kéo theo DanhSachBang.tsx (2400+ dòng) vào chunk vỏ app chỉ để dùng 4 dòng hash là cái giá không
// đáng. Công thức PHẢI giữ y hệt bản gốc: cùng id phải ra cùng hue ở cả thẻ (TheTrong tĩnh) lẫn lớp
// vẽ động này, nếu không cú FLIP đổi màu giữa chừng lúc mở bảng (critique 2026-09-02 lượt 2, P2).
function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
}

// id: id CỦA BẢNG — optional, chỉ truyền từ TheTrong (DanhSachBang.tsx). Hai lời gọi khác
// (index.tsx, EdgelessBoard.tsx) không có board id sẵn trong ngữ cảnh của chúng (màn tải chunk lần
// đầu / màn chờ nội bộ EdgelessBoard) nên không truyền — tự rơi về màu mờ cũ, không cần sửa gì ở đó.
// mauHue: hue CỐ ĐỊNH đã gán lúc tạo bảng (BangMeta.mauHue) — ưu tiên hơn mauOnDinh(id) khi có,
// cùng lý do/ưu tiên với TheTrong (xem đó): hash thuần không bảo đảm tách biệt khỏi sibling.
export function VeChuyenKhoaDangTai({ khoa, id, mauHue }: { khoa?: string; id?: string; mauHue?: number }) {
  const bocRef = useRef<HTMLDivElement>(null)
  // Màu nhận diện của khoa — cùng hằng số spec.color mà thẻ bảng và iconBangSoDo() vẫn ăn theo.
  // Khoa lạ / bảng chưa gắn khoa → tô theo mauHue ?? mauOnDinh(id) (cùng công thức/ưu tiên TheTrong
  // dùng cho chính thẻ đó) thay vì một màu chữ mờ dùng chung — hai nhánh tĩnh/động phải "cùng màu"
  // (xem chú thích "Hai nhánh vẽ CÙNG..." tại TheTrong), --c-text-muted chỉ còn là fallback khi
  // không có id.
  const mau = SPECIALTIES.find((s) => s.id === khoa)?.color ?? (id ? `hsl(${mauHue ?? mauOnDinh(id)} 50% 36%)` : 'var(--c-text-muted, #6b6e96)')

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

    // Chia thời gian theo ĐỘ DÀI nét, không phải theo SỐ nét — để bút chạy đều một tốc độ.
    // Đo 2026-08-30 trên icon Tim mạch: chia đều 12 nét thì ở mốc 200ms đã có 2 nét xong và hình
    // gần như đủ, vì `d` của bộ icon này là MỘT path khổng lồ mà subpath đầu ôm trọn đường bao còn
    // 10 subpath sau chỉ là chi tiết li ti. Nét dài nhất phóng vèo trong 78ms rồi 860ms còn lại
    // dành cho mấy chấm nhỏ — đọc thành "vẽ xong ngay rồi lấm tấm chấm", không phải một cây bút.
    // getTotalLength() an toàn ở ĐÂY vì nhánh này chỉ chạy SAU guard thiếu-WAAPI (happy-dom không
    // cài hàm đó và cũng không có Element.animate nên đã return từ trước — đúng chỗ bản 2026-08-28
    // từng vỡ do gọi sớm hơn guard).
    const dai = manh.map((p) => {
      try {
        return p.getTotalLength() || 0
      } catch {
        return 0
      }
    })
    const tongDai = dai.reduce((a, b) => a + b, 0) || 1
    let congDon = 0
    const mocBatDau = dai.map((d) => {
      const truoc = congDon
      congDon += d
      return truoc / tongDai
    })

    const anims = manh.map((p, i) => {
      // Khung giờ của nét i tỉ lệ với độ dài của chính nó, nối đuôi nhau trong quãng 0→VE_XONG.
      const batDau = mocBatDau[i] * VE_XONG
      const ketThuc = Math.min(VE_XONG, batDau + (dai[i] / tongDai) * VE_XONG * GOI_LEN)
      return p.animate(
        [
          { strokeDashoffset: 1, offset: 0, easing: 'linear' },
          { strokeDashoffset: 1, offset: batDau, easing: easeVe },
          { strokeDashoffset: 0, offset: ketThuc, easing: 'linear' },
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

    // Icon THẬT: nằm im ở opacity 0 tới lúc nét khép lại, rồi "ăn mực" hiện ra nguyên bản và giữ lại.
    const animThat = iconThat.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: AN_MUC - 0.06, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        { opacity: 1, offset: AN_MUC },
        { opacity: 1, offset: 1 },
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
    <div
      ref={bocRef}
      aria-hidden="true"
      data-khoa={khoa ?? ''}
      className="mind-loading-ve"
      style={{ color: mau }}
    >
      {iconBangSoDo(khoa, 'mind-loading-that')}
    </div>
  )
}
