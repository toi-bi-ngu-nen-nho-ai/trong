// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useRef, useState } from 'react'

import { SPECIALTIES } from '../data'
import { specialtyIcon } from '../components/SpecialtyIcons'
import { IDB_STORES } from '../lib/idb'
import { formatReadTime } from '../lib/recentReads'
import { useIdbCollection } from '../lib/useIdbCollection'
import { bangKhopTimKiem, type BangMeta, taoIdBang } from './boardMeta'

// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
const XAC_NHAN_XOA_MS = 5000

// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
const VUA_TAO_NGUONG_MS = 3000

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi đánh dấu
// xoá mềm (daXoaLuc) chạy, để animation kịp chạy hết trước khi thẻ biến mất khỏi lưới. PHẢI khớp
// đúng thời lượng animation CSS (0.4s, tăng từ 0.2s cũ — debug 2026-08-26, "xoá quá nhanh, có như
// không có") — lệch hai số này là jump-cut hoặc khoảng trắng chết, xem comment tại .card-slide-out.
const XOA_TRE_MS = 400

// Vị trí/góc nghiêng/ảnh xem trước của đúng thẻ vừa bấm, chụp lại NGAY LÚC BẤM (getBoundingClientRect
// thật, không phải suy ra từ index lưới) — BoardGallery.tsx dùng để chạy chuyển cảnh FLIP thật từ
// thẻ sang canvas thay vì một cú phóng chung chung không neo vào đâu (hiến chương Mindmap, mục
// "Continuity of the visual anchor... mandatory" — critique 2026-08-26 P1).
export type BoardOpenOrigin = {
  top: number
  left: number
  width: number
  height: number
  tilt: number
  anhXemTruoc?: string
  // Hue nhận diện của bảng (mauOnDinh(bang.id)) — EdgelessBoard.tsx dùng để tô đúng màu giọt mực
  // loading bằng màu chấm nhận diện của CHÍNH bảng đang mở, thay vì luôn một magenta cố định
  // (overdrive 2026-08-26, Hướng 2 "Cổng chuyển cảnh vật liệu": continuity vật liệu nối dài từ thẻ
  // sang lúc chờ canvas).
  mauNhanDien?: number
}

// Cửa sổ "Hoàn tác" sau khi xoá mềm một bảng — cùng độ dài với XAC_NHAN_XOA_MS (quy ước sẵn có của
// đúng màn này cho "khoảng ân hạn"), đủ lâu để đọc tên bảng vừa xoá và quyết định, không quá lâu
// tới mức dải xác nhận cảm giác bị kẹt trên màn hình.
const HOAN_TAC_XOA_MS = 5000

// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}

// Băm id thành một góc (độ hue) ỔN ĐỊNH trong khoảng [260, 330) — họ tím-hồng quanh --c-accent-2
// (~327°, xem src/index.css), CỐ TÌNH tránh xa đỏ/hổ phách/xanh lá (~0-50°, ~90-150°) vì ba màu đó
// dành riêng cho tín hiệu nguy hiểm/cảnh báo/thành công (Untouchable Signal Rule, DESIGN.md) — chấm
// phân biệt bảng không bao giờ được lẫn với tín hiệu an toàn. Dùng chung `--chip-s`/`--chip-l` (định
// nghĩa cạnh --c-accent-2 trong index.css, tự đổi theo sáng/tối) nên hue là thứ DUY NHẤT hàm này cần
// tính — critique lượt 3 (2026-08-24): bảng mới tạo không phân biệt được trong lưới lẫn panel "Đã
// xoá gần đây" (11/15 bảng thật trên máy dev đọc y hệt "Bảng chưa đặt tên").
export function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
}

// Độ sáng tương đối (WCAG relative luminance, 0-1) của một màu hex "#rrggbb".
function doSangTuongDoi(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const tuyenTinh = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * tuyenTinh(r) + 0.7152 * tuyenTinh(g) + 0.0722 * tuyenTinh(b)
}

// Xấp xỉ độ sáng của --c-on-bright ở dark mode (#0b0c1c) — dùng làm ứng viên "chữ gần đen" thay vì
// đen tuyệt đối, để khớp đúng giá trị token thật app đang dùng ở mọi nơi khác.
const DO_SANG_GAN_DEN = doSangTuongDoi('#0b0c1c')

function tiLeTuongPhan(l1: number, l2: number): number {
  const [sang, toi] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (sang + 0.05) / (toi + 0.05)
}

// Chọn chữ trắng hoặc gần-đen tuỳ theo màu NỀN CỤ THỂ (kh.color) — KHÔNG dùng var(--c-on-bright)
// cứng cho nền này: token đó chỉ được hiệu chỉnh cho --c-primary (đổi độ sáng theo theme), còn
// kh.color là hằng số CỐ ĐỊNH qua cả hai theme (xem comment đầu specialties.ts: "chưa đổi theo chủ
// đề"). Ghép nhầm --c-on-bright vào nền này khiến cả 11/11 màu chuyên khoa xuống dưới AA ở dark mode
// (đo được 3.00-3.97:1, critique 2026-08-26 P1) — bài học từ chính lượt vá contrast trước, áp đúng
// công thức cho MỘT điểm chạm (chip "Tất cả", nền --c-primary) rồi lan sang điểm chạm khác có màu
// nền hoàn toàn khác bản chất. Hàm này tính tương phản thật với CẢ HAI ứng viên rồi chọn bên thắng —
// đúng cho bất kỳ giá trị hex nào, kể cả nếu sau này thêm chuyên khoa với màu sáng hơn hẳn 11 màu
// hiện tại (nơi trắng sẽ không còn thắng nữa).
function chuTrenNen(hexNen: string): string {
  const lNen = doSangTuongDoi(hexNen)
  const dungTrang = tiLeTuongPhan(1, lNen)
  const dungGanDen = tiLeTuongPhan(DO_SANG_GAN_DEN, lNen)
  return dungTrang >= dungGanDen ? '#ffffff' : '#0b0c1c'
}

// khoa: id chuyên khoa để tô màu + chọn icon cho huy hiệu — undefined khi không có ngữ cảnh chuyên
// khoa nào (lưới rỗng toàn bộ, chưa lọc gì). specialtyIcon() đã tự xử lý id lạ/undefined bằng icon
// "trang giấy" mặc định (xem SpecialtyIcons.tsx), TheTrong không cần thêm nhánh dự phòng cho icon —
// chỉ cần tự lo phần MÀU (spec undefined thì không có spec.color để đọc).
function TheTrong({ khoa }: { khoa?: string }) {
  const spec = SPECIALTIES.find((s) => s.id === khoa)
  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* Không còn nền doodle vẽ tay — phản hồi thật (2026-08-26, test tay): "xóa ảnh background
          nét line đi". Huy hiệu chuyên khoa CHÍNH GIỮA khung 4:3 (50%,50%), không nền/viền tròn. */}
      <div
        aria-hidden="true"
        data-testid="huy-hieu-chuyen-khoa"
        data-khoa={khoa ?? ''}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '34%',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: spec ? spec.color : 'var(--c-text-muted, #6b6e96)',
        }}
      >
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
    </div>
  )
}

function TheBang({
  bang,
  index,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
  onBatSuaTag,
  onDoiChuyenKhoa,
  onThemTag,
  onXoaTag,
}: {
  bang: BangMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  onMo: (origin?: BoardOpenOrigin) => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
  onBatSuaTag: () => void
  onDoiChuyenKhoa: (id: string) => void
  onThemTag: (tag: string) => void
  onXoaTag: (tag: string) => void
}) {
  const [tenNhap, setTenNhap] = useState(bang.ten)
  const [tagNhap, setTagNhap] = useState('')
  const nutRef = useRef<HTMLButtonElement>(null)
  // Tên chuyên khoa cho aria-label — huy hiệu chuyên khoa trong TheTrong là aria-hidden (nó lồng
  // vào artwork trang trí), nên người dùng trình đọc màn hình không có cách nào khác biết bảng này
  // thuộc chuyên khoa nào trong khi người dùng sáng mắt thấy ngay qua icon+màu (critique 2026-08-26 P3).
  const tenChuyenKhoa = SPECIALTIES.find((s) => s.id === (bang.chuyenKhoa ?? SPECIALTIES[0].id))?.name

  // Tính "vừa tạo" bằng ĐỒNG HỒ RIÊNG của thẻ, không phải mốc đông cứng lúc DanhSachBang mount —
  // trước đây parent chụp `Date.now()` một lần lúc MOUNT rồi so cho MỌI thẻ; bảng tạo SAU khi
  // gallery đã mở (đúng luồng "+" → mở ô đổi tên tại chỗ) có taoLuc > mốc đó, hiệu số luôn ÂM nên
  // `vuaTao` treo `true` suốt phiên xem thay vì tắt sau 3s — thẻ đóng băng ở khung hình đầu của
  // .card-plop, kéo theo vùng chạm "⋯" bị scale nhỏ lại (critique lượt 3, 2026-08-24). Đồng hồ
  // riêng + hẹn giờ tự tắt ở đây đảm bảo đúng hạn bất kể parent có re-render đúng lúc t+3s hay không.
  const [vuaTao, setVuaTao] = useState(() => Date.now() - bang.taoLuc < VUA_TAO_NGUONG_MS)
  useEffect(() => {
    if (!vuaTao) return
    const conLai = VUA_TAO_NGUONG_MS - (Date.now() - bang.taoLuc)
    if (conLai <= 0) {
      setVuaTao(false)
      return
    }
    const id = setTimeout(() => setVuaTao(false), conLai)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi ĐỔI bảng (khoá
    // theo id), không phải mỗi khi `vuaTao` tự nó đổi (tránh vòng lặp huỷ-rồi-lập-lại hẹn giờ).
  }, [bang.id, bang.taoLuc])

  // `tenNhap` chỉ khởi tạo MỘT LẦN từ `useState(bang.ten)` — không tự đồng bộ lại khi mở sửa tên
  // LẦN THỨ HAI. Không có effect này: gõ nháp → Escape (huỷ, không lưu nhưng cũng không reset ô
  // nhập) → mở sửa tên lại → ô nhập vẫn hiện bản nháp đã huỷ chứ không phải tên thật hiện tại →
  // lỡ tay blur ra ngoài thì `onLuuTen(tenNhap)` ÂM THẦM ghi đè tên bảng bằng bản nháp cũ — mất
  // dữ liệu thật, không chỉ hiển thị sai. Đồng bộ lại mỗi khi `dangSuaTen` chuyển sang true.
  useEffect(() => {
    if (dangSuaTen) setTenNhap(bang.ten)
  }, [dangSuaTen, bang.ten])

  const lopVaoMan = dangXoa ? 'card-slide-out' : vuaTao ? 'card-plop' : 'card-settle'

  return (
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{
        position: 'relative',
        '--tilt': `${nghiengOnDinh(bang.id)}deg`,
        '--i': index,
        pointerEvents: dangXoa ? 'none' : undefined,
      } as React.CSSProperties}
    >
      <button
        ref={nutRef}
        type="button"
        onClick={() => {
          // Chỉ dựng origin khi rect đo được có kích thước thật (>0) — rect rỗng (0×0) xảy ra khi
          // phần tử chưa layout xong hoặc trong môi trường không có engine layout thật (vd ca kiểm
          // happy-dom). Không có kích thước thật thì FLIP không có gì để "First" từ đó — rơi về
          // .board-in (scale-fade) cũ thay vì một chuyển cảnh co về góc (0,0) vô nghĩa.
          const r = nutRef.current?.getBoundingClientRect()
          onMo(
            r && r.width > 0 && r.height > 0
              ? {
                  top: r.top,
                  left: r.left,
                  width: r.width,
                  height: r.height,
                  tilt: nghiengOnDinh(bang.id),
                  anhXemTruoc: bang.anhXemTruoc,
                  mauNhanDien: mauOnDinh(bang.id),
                }
              : undefined,
          )
        }}
        className="the-bang-vat the-bang-nghieng-con-tro mind-focus-ring"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const el = nutRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          el.style.setProperty('--con-tro-x', String((e.clientX - r.left) / r.width))
          el.style.setProperty('--con-tro-y', String((e.clientY - r.top) / r.height))
        }}
        onPointerLeave={() => {
          nutRef.current?.style.removeProperty('--con-tro-x')
          nutRef.current?.style.removeProperty('--con-tro-y')
        }}
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={tenChuyenKhoa ? `Mở bảng ${bang.ten}, chuyên khoa ${tenChuyenKhoa}` : `Mở bảng ${bang.ten}`}
      >
        <div
          // .mind-note-card (index.css): tờ giấy ghim y hệt ảnh tham chiếu người dùng gửi lần 2
          // (2026-08-26) — trắng, mép dưới-trái cong lên (curl), có bóng đổ thật để "nổi" khỏi trang
          // (KHÔNG áp Floating-Layer-Only Rule ở đây — bề mặt Mindmap có luật vật liệu riêng, xem
          // surface brief "chân thực vật lý"). overflow KHÔNG hidden ở div này — góc cong + bóng cần
          // tràn ra ngoài khung 4:3; ảnh/doodle bên trong được bọc riêng một div overflow:hidden.
          className="mind-note-card"
          style={{ position: 'relative', aspectRatio: '4 / 3' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              borderRadius: 2,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
          >
            {bang.anhXemTruoc ? (
              <img src={bang.anhXemTruoc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <TheTrong khoa={bang.chuyenKhoa ?? SPECIALTIES[0].id} />
            )}
          </div>
          {/* Ghim màu ổn định theo id — bản sắc thị giác KHÔNG cần gõ tên (critique lượt 3). Đầu ghim
              tròn bóng + chuôi ngắm xuống giấy, phỏng theo ẢNH THAM CHIẾU lần 2 (2026-08-26) — trước
              đó là hình thoi/kim nghiêng phỏng theo ảnh lần 1. Neo top-center (không phải top-left
              như chấm cũ) và TRÀN NHẸ lên trên mép giấy (top âm) — đúng cảm giác "ghim THẬT xuyên
              qua giấy" của ảnh, không phải một icon trang trí nằm gọn trong khung. Màu vẫn giữ theo
              nhận diện từng bảng (không cố định đỏ như ảnh) — đây là chi tiết CHỨC NĂNG (phân biệt
              nhiều bảng cùng tên mặc định), không phải trang trí thuần, nên không đánh đổi. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              top: -6,
              left: '55%',
              transform: 'translateX(-50%)',
              width: 20,
              height: 20,
              filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))',
            }}
          >
            <path
              d="M13.2 13.6 L19 20"
              stroke={`hsl(${mauOnDinh(bang.id)} var(--chip-s) var(--chip-l))`}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10" cy="9" r="6.2" fill={`hsl(${mauOnDinh(bang.id)} var(--chip-s) var(--chip-l))`} />
            <ellipse cx="7.8" cy="6.4" rx="2.3" ry="1.5" fill="rgba(255,255,255,0.55)" transform="rotate(-28 7.8 6.4)" />
          </svg>
        </div>
        {!dangSuaTen && (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '4px 0 0',
                lineHeight: 1.2,
                // Tên lâm sàng dài (vd danh sách chẩn đoán phân biệt) từng kéo cả HÀNG lưới cao theo
                // ô cao nhất (Grid stretch mặc định), để lại khoảng trắng chết ở thẻ liền kề tên
                // ngắn — chặn ở 2 dòng, cùng cỡ mọi thẻ trong cùng hàng luôn khớp nhau.
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bang.ten}
            </p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #6b6e96)' }}>
              {formatReadTime(bang.capNhatLuc)}
            </p>
          </>
        )}
      </button>

      {dangSuaTen && (
        <input
          type="text"
          data-testid={`input-ten-${bang.id}`}
          value={tenNhap}
          autoFocus
          // aria-label TĨNH, không dựa vào `value` — nếu không, người dùng đọc màn hình xoá trắng ô
          // để gõ lại sẽ mất tên truy cập giữa chừng (critique lượt 3, 2026-08-24).
          aria-label="Đổi tên bảng"
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenNhap)
            if (e.key === 'Escape') onLuuTen(bang.ten)
          }}
          onBlur={() => onLuuTen(tenNhap)}
          className="mind-focus-ring"
          // `input:focus{outline:none}` (index.css, reset toàn app) + Tailwind preflight đưa border
          // về 0 cộng lại xoá sạch MỌI tín hiệu đây là ô nhập — .mind-focus-ring chỉ bù lại lúc
          // :focus-visible (bàn phím), nên cần thêm viền nghỉ để ô này trông "có thể sửa" ngay cả
          // trước khi focus.
          style={{
            width: '100%',
            marginTop: 4,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--c-line, #d9ddf4)',
            borderRadius: 4,
            padding: '2px 4px',
            background: 'var(--c-surface, #fff)',
          }}
        />
      )}

      <button
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        className="mind-focus-ring"
        // Vùng chạm 44×44 (chuẩn tối thiểu cho ngón tay, WCAG 2.2 AA + khuyến nghị thực hành) — giữ
        // cùng gốc top/right:4 như cũ (không đẩy ra ngoài mép thẻ, tránh chồng lên khoảng gap của
        // lưới) nên box lớn hơn ăn VÀO PHÍA TRONG thẻ; dấu "⋯" tự căn giữa lại bằng flex, dịch nhẹ
        // vào trong so với vị trí cũ — chấp nhận được, không phóng to một hình tròn nền/viền vốn
        // không tồn tại (nút này chưa từng có background/border thấy được, chỉ có ba dấu chấm).
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 0,
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⋯
      </button>

      {dangMoMenu && (
        // .mind-menu-bang: trên màn hẹp (mobile), src/index.css ghim panel này xuống ĐÁY màn hình
        // (bottom sheet, luôn trong tầm ngón cái) thay vì neo cứng top:30 relative-tới-thẻ — thẻ ở
        // HÀNG TRÊN CÙNG của lưới dài mở panel gần rìa trên, không phải vùng ngón cái thoải mái nhất
        // khi dùng một tay (critique 2026-08-26, minor observation). .mind-sheet thêm hiệu ứng trượt
        // lên nhẹ, nhất quán với các sheet khác của app.
        <div className="mind-menu-bang mind-sheet" style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 4, zIndex: 1 }}>
          {/* Vùng chạm 44px tối thiểu (display:flex+minHeight, không phải padding trần) + khoảng
              cách/đường phân trước mục xoá — trước đây hai dòng cao ~30.6px, cách nhau 0px, hành
              động phá huỷ đứng ngay sát hành động an toàn (critique lượt 3, 2026-08-24). */}
          <button
            type="button"
            data-testid={`sua-tag-${bang.id}`}
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, textAlign: 'left', padding: '0 10px', border: 0, background: 'none' }}
          >
            Chuyên khoa/tag
          </button>
          <button
            type="button"
            data-testid={`doi-ten-${bang.id}`}
            onClick={onBatSuaTen}
            className="mind-focus-ring"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, textAlign: 'left', padding: '0 10px', border: 0, background: 'none' }}
          >
            Đổi tên
          </button>
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 44,
              textAlign: 'left',
              padding: '0 10px',
              marginTop: 2,
              border: 0,
              borderTop: '1px solid var(--c-line, #d9ddf4)',
              background: 'none',
              color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined,
            }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}

      {dangSuaTag && (
        <div
          data-testid={`sua-chuyen-khoa-tag-${bang.id}`}
          // Cùng .mind-menu-bang/.mind-sheet với menu "⋯" ngay trên — cùng lý do (thẻ hàng trên
          // cùng, tầm ngón cái).
          className="mind-menu-bang mind-sheet"
          style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 8, zIndex: 1, width: 200 }}
        >
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Chuyên khoa
          </label>
          <select
            data-testid={`chon-chuyen-khoa-${bang.id}`}
            // <label> ngay trên là nhãn TRẦN (không htmlFor, control không có id) nên trình đọc màn
            // hình không nối được nhãn với ô nào — ô này đọc ra là "không tên". Cùng mức chăm sóc
            // a11y file này đã áp cho ô tìm ("Tìm kiếm bảng"), nút × ("Xoá tag …"), ô đổi tên
            // ("Đổi tên bảng") — review cuối nhánh, mục 4.
            aria-label="Chuyên khoa"
            value={bang.chuyenKhoa ?? SPECIALTIES[0].id}
            onChange={(e) => onDoiChuyenKhoa(e.target.value)}
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)', marginBottom: 8 }}
          >
            {SPECIALTIES.map((kh) => (
              <option key={kh.id} value={kh.id}>{kh.name}</option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Tag
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {(bang.tags ?? []).map((t) => (
              <span
                key={t}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--c-surface-alt, #f6f7fd)' }}
              >
                {t}
                <button
                  type="button"
                  aria-label={`Xoá tag ${t}`}
                  onClick={() => onXoaTag(t)}
                  className="mind-focus-ring"
                  style={{ border: 0, background: 'none', padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--c-text-muted, #6b6e96)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            data-testid={`nhap-tag-${bang.id}`}
            // Cùng lý do với <select> ngay trên: nhãn "Tag" là <label> trần, không nối được với ô.
            // Placeholder KHÔNG thay được nhãn truy cập (nó biến mất ngay khi bắt đầu gõ).
            aria-label="Thêm tag"
            value={tagNhap}
            onChange={(e) => setTagNhap(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const tagSach = tagNhap.trim()
              if (tagSach) onThemTag(tagSach)
              setTagNhap('')
            }}
            placeholder="Thêm tag, Enter để lưu"
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)' }}
          />
        </div>
      )}
    </div>
  )
}

export function DanhSachBang({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
}: {
  onMoBang: (boardId: string, origin?: BoardOpenOrigin) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
}) {
  // useIdbCollection tự nạp danh sách lúc mount (fetch một lần, xem src/lib/useIdbCollection.ts)
  // và cập nhật `items` CỤC BỘ NGAY khi add/update/remove được gọi — ghi IndexedDB chạy nền
  // (fire-and-forget), không chặn re-render. Đây là mẫu ĐÃ CÓ SẴN, dùng chung với ECG lessons/bài
  // viết — không tự viết state/fetch riêng cho danh sách bảng (xem cảnh báo ở Task 1).
  const { items: danhSach, loading, add, update } = useIdbCollection<BangMeta>(IDB_STORES.boards)
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangSuaTagId, setDangSuaTagId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  // Mang cả OBJECT (không chỉ id) — cần đủ dữ liệu gốc để đánh dấu daXoaLuc rồi đưa thẳng cho dải
  // "Hoàn tác" mà không phải tra lại danhSach sau khi bang đã bị lọc khỏi danh sách hiển thị.
  const [dangChoXoa, setDangChoXoa] = useState<BangMeta | null>(null)
  // Bang vừa xoá mềm xong — điều khiển dải "Hoàn tác". null nghĩa là không có dải nào đang hiện.
  const [vuaXoa, setVuaXoa] = useState<BangMeta | null>(null)
  // Dải "Hoàn tác" (vuaXoa) chỉ sống HOAN_TAC_XOA_MS rồi tắt im lặng — nếu người dùng bị gọi đi
  // giữa ca trực (đúng bối cảnh PRODUCT.md mô tả) và bỏ lỡ, bảng vẫn còn thật trong IndexedDB
  // (daXoaLuc được set) nhưng trước đây KHÔNG có đường nào lấy lại nữa — vi phạm thẳng lời hứa "xoá
  // mềm, phục hồi được". Panel này là lưới an toàn tối thiểu: không phải màn "thùng rác" đầy đủ (dọn
  // vĩnh viễn, sắp xếp theo ngày...), chỉ để mở lại được những gì vuaXoa đã bỏ lỡ.
  const [hienDaXoaGanDay, setHienDaXoaGanDay] = useState(false)
  // null = "Tất cả" (không lọc). Không đưa vào URL/localStorage — lọc chỉ có ý nghĩa trong phiên
  // đang xem lưới, giống các bộ lọc tạm thời khác của app (SearchScreen.activeFilter).
  const [chuyenKhoaLoc, setChuyenKhoaLoc] = useState<string | null>(null)
  // Dải chip chuyên khoa mặc định chỉ hiện 4 chip đầu + nút "Thêm" — 12 chip đồng hạng trên một
  // hàng buộc cuộn-và-quét mới tìm ra một chuyên khoa, vi phạm luật ≤4 lựa chọn tại một điểm quyết
  // định (critique 2026-08-25, mục "Hàng filter chuyên khoa"). Không lưu localStorage: đây là trạng
  // thái mở-ra tạm thời của một phiên xem lưới, cùng quy ước với chuyenKhoaLoc/truyVan ngay trên.
  const [hienHetChip, setHienHetChip] = useState(false)
  // Truy vấn ô tìm nội bộ — cùng quy ước "chỉ sống trong phiên xem lưới" với chuyenKhoaLoc ngay
  // trên (không vào URL/localStorage). Chuỗi rỗng = chưa lọc (bangKhopTimKiem trả true).
  const [truyVan, setTruyVan] = useState('')

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  // Đánh dấu XOÁ MỀM (daXoaLuc) sau khi .card-slide-out chạy xong — KHÔNG gọi idbDelete/remove()
  // nữa (trước đây xoá vĩnh viễn ngay, không hoàn tác được, ngược với lời hứa "xoá mềm" của
  // PRODUCT.md). update() vẫn ghi IndexedDB như cũ, chỉ đổi field nào được ghi.
  useEffect(() => {
    if (!dangChoXoa) return
    const bangBiXoa = dangChoXoa
    const id = setTimeout(() => {
      update({ ...bangBiXoa, daXoaLuc: Date.now() })
      setDangChoXoa(null)
      setVuaXoa(bangBiXoa)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangChoXoa, update])

  // Tự tắt dải "Hoàn tác" sau HOAN_TAC_XOA_MS — bang vẫn ở lại trạng thái xoá mềm sau khi dải tắt,
  // chỉ là không còn cách hoàn tác NHANH qua dải này nữa (chưa có màn "thùng rác" để hoàn tác sau).
  useEffect(() => {
    if (!vuaXoa) return
    const id = setTimeout(() => setVuaXoa(null), HOAN_TAC_XOA_MS)
    return () => clearTimeout(id)
  }, [vuaXoa])

  // Hiệu ứng .board-out chỉ chạy MỘT LẦN khi vừa đóng một bảng (dungTuBang=true) — tự báo xong
  // sau khi animation (0,2s, xem index.css) kết thúc, cộng biên an toàn nhỏ. KHÔNG chạy khi
  // DanhSachBang mount vì lý do khác (vd lần đầu vào tab Mindmap) — dungTuBang khi đó là
  // undefined/false, effect này không làm gì.
  useEffect(() => {
    if (!dungTuBang) return
    const id = setTimeout(() => onHieuUngXong?.(), 220)
    return () => clearTimeout(id)
  }, [dungTuBang, onHieuUngXong])

  // Chưa nạp xong lần đầu — không hiện gì (kể cả thẻ "+"), tránh nháy "rỗng" giả trước khi
  // IndexedDB kịp trả dữ liệu thật (đúng lý do trường `loading` tồn tại trong hook).
  if (loading) return null

  // Lọc bỏ bang đã xoá mềm (daXoaLuc) khỏi lưới hiển thị — chúng vẫn còn thật trong IndexedDB.
  // Chip chuyên khoa lọc THÊM sau đó — bang thiếu chuyenKhoa (bản ghi cũ chưa backfill, xem
  // boardMeta.ts) coi như thuộc chuyên khoa đầu tiên trong SPECIALTIES.
  // Ô tìm lọc THÊM lần nữa (giao của cả hai, không phải hoặc): bangKhopTimKiem gộp tên/chuyên
  // khoa/tag/nội dung trích được và bỏ dấu hai phía (xem boardMeta.ts), truy vấn rỗng luôn khớp.
  const danhSachSapXep = [...danhSach]
    .filter((b) => !b.daXoaLuc)
    .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
    .filter((b) => bangKhopTimKiem(b, truyVan))
    .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  // Xoá gần đây nhất lên đầu — người mở panel này thường đang tìm đúng bảng vừa lỡ tay bấm Hoàn tác.
  const daXoaGanDay = danhSach.filter((b) => b.daXoaLuc).sort((a, b) => (b.daXoaLuc ?? 0) - (a.daXoaLuc ?? 0))
  // Lưới rỗng vì BỘ LỌC hoàn toàn khác lưới rỗng vì chưa có bảng nào: mời "Bắt đầu một sơ đồ tư duy
  // mới" trong tình huống này vừa sai sự thật (bảng vẫn còn nguyên, chỉ đang bị lọc khuất) vừa đẩy
  // người dùng đi tạo một bảng thừa thay vì sửa truy vấn/tắt chip lọc (review cuối nhánh, mục 7).
  const rongDoBoLoc =
    danhSachSapXep.length === 0 &&
    (truyVan.trim().length > 0 || chuyenKhoaLoc !== null) &&
    danhSach.filter((b) => !b.daXoaLuc).length > 0

  // Bỏ xoá mềm cho một bảng (cả hai nút "Hoàn tác": dải toast và panel "Đã xoá gần đây").
  // "Hoàn tác" là đường phục hồi CUỐI CÙNG nên nó phải chịu ĐÚNG lớp lỗi mà taoBangMoi/
  // onDoiChuyenKhoa/onLuuTen/onXoaTag đã vá: bảng được ghi lại thật trong IndexedDB nhưng không
  // khớp chip lọc/ô tìm đang bật nên vẫn vô hình trong lưới — người dùng thấy nút "Hoàn tác" như
  // bấm hụt, không có gì xảy ra (review cuối nhánh, mục 2). Cùng cách vá với các callback kia: đưa
  // bộ lọc khiến bảng vừa thao tác rớt khỏi lưới về trạng thái không lọc.
  const khoiPhucBang = (b: BangMeta) => {
    const bangMoi = { ...b, daXoaLuc: undefined }
    update(bangMoi)
    // So cùng biểu thức với bộ lọc của lưới ở trên (bảng thiếu chuyenKhoa coi như SPECIALTIES[0]).
    if (chuyenKhoaLoc && (bangMoi.chuyenKhoa ?? SPECIALTIES[0].id) !== chuyenKhoaLoc) setChuyenKhoaLoc(null)
    // Ô tìm là bộ lọc THỨ HAI, rớt khỏi nó cũng giấu thẻ y hệt — phải canh riêng. Truy vấn rỗng
    // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
    if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
  }

  const taoBangMoi = () => {
    const luc = Date.now()
    const meta: BangMeta = {
      id: taoIdBang(),
      ten: 'Bảng chưa đặt tên',
      taoLuc: luc,
      capNhatLuc: luc,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    }
    add(meta)
    // Trước đây mở thẳng vào canvas (onMoBang) — ba bảng tạo liên tiếp đều dừng lại ở tên mặc định
    // "Bảng chưa đặt tên" và ảnh xem trước GIỐNG HỆT NHAU byte-cho-byte (canvas trống chụp y hệt),
    // không cách nào phân biệt trong lưới. Giữ người dùng lại ở danh sách, mở luôn ô đổi tên cho thẻ
    // vừa tạo — họ đặt tên trước rồi mới bấm vào để vẽ, đúng lúc còn nhớ đang tạo bảng cho việc gì.
    setDangSuaTenId(meta.id)
    // Bảng mới LUÔN được gán chuyenKhoa: SPECIALTIES[0].id — nếu chip lọc đang chọn một chuyên khoa
    // KHÁC, thẻ vừa tạo sẽ không khớp bộ lọc và biến mất khỏi lưới ngay khi vừa ghi xong (bấm "+"
    // trông như không phản ứng gì, trong khi một bản ghi mồ côi đã lặng lẽ vào IndexedDB — review
    // lượt 1 phát hiện). Đưa bộ lọc về "Tất cả" ngay khi tạo để thẻ mới chắc chắn hiện ra.
    setChuyenKhoaLoc(null)
    // Ô tìm gây ĐÚNG lớp lỗi đó một lần nữa, còn dễ vấp hơn chip lọc: tên bảng mới luôn là "Bảng
    // chưa đặt tên", nên bất kỳ truy vấn nào đang gõ dở (trừ chuỗi khớp đúng tên mặc định) đều loại
    // thẻ vừa tạo khỏi lưới ngay lượt render kế tiếp. Xoá trắng truy vấn cùng lúc với chip lọc.
    setTruyVan('')
  }

  return (
    <>
    <div className={`scroll-ios h-full${dungTuBang ? ' board-out' : ''}`}>
      {daXoaGanDay.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <button
            type="button"
            data-testid="mo-da-xoa-gan-day"
            onClick={() => setHienDaXoaGanDay(!hienDaXoaGanDay)}
            className="mind-focus-ring"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text-muted, #6b6e96)',
              background: 'none',
              border: 0,
              padding: '4px 2px',
              borderRadius: 4,
            }}
            aria-expanded={hienDaXoaGanDay}
          >
            {hienDaXoaGanDay ? '▾' : '▸'} Đã xoá gần đây ({daXoaGanDay.length})
          </button>
          {hienDaXoaGanDay && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, marginBottom: 8 }}>
              {daXoaGanDay.map((b) => (
                <div
                  key={b.id}
                  data-testid={`da-xoa-gan-day-${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--c-surface-alt, #f6f7fd)',
                    borderRadius: 8,
                  }}
                >
                  {/* Cùng chấm màu ổn định theo id với lưới chính — hai bảng "Bảng chưa đặt tên"
                      trong panel này giờ phân biệt được TRƯỚC KHI bấm Hoàn tác nhầm (critique lượt 3). */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `hsl(${mauOnDinh(b.id)} var(--chip-s) var(--chip-l))`,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: 'var(--c-text-muted, #6b6e96)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.ten}
                  </span>
                  <button
                    type="button"
                    data-testid={`hoan-tac-gan-day-${b.id}`}
                    onClick={() => khoiPhucBang(b)}
                    className="mind-focus-ring"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      // --c-accent-2, KHÔNG --c-primary — cùng hành động "phục hồi bảng vừa xoá" với
                      // nút Hoàn tác trong toast (ngay dưới, đã đổi màu ở lượt vá trước); hai nút cho
                      // cùng một hành động phải đọc cùng một ngôn ngữ màu (critique 2026-08-26 P2, lượt 2).
                      color: 'var(--c-accent-2, #b8196f)',
                      background: 'none',
                      border: 0,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Hoàn tác
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Cổng hiện/ẩn dựa trên danhSach GỐC (chỉ trừ bang xoá mềm), KHÔNG phải danhSachSapXep đã
          lọc — nếu gắn vào danh sách đã lọc thì gõ tới ký tự không khớp bảng nào sẽ unmount chính ô
          đang gõ: mất focus giữa chừng, không xoá bớt ký tự để quay lại được. Cùng lý do và cùng
          điều kiện với dải chip chuyên khoa ngay dưới. */}
      {danhSach.filter((b) => !b.daXoaLuc).length > 0 && (
        <div style={{ padding: '12px 16px 8px' }}>
          <input
            type="search"
            data-testid="tim-kiem-bang"
            value={truyVan}
            onChange={(e) => setTruyVan(e.target.value)}
            placeholder="Tìm bảng theo tên, tag, nội dung..."
            aria-label="Tìm kiếm bảng"
            className="mind-focus-ring"
            // minHeight 44: vùng chạm tối thiểu cho ngón tay, cùng chuẩn đã áp cho nút "⋯" và các
            // mục menu trong file này — chiều cao tự nhiên của input này (cỡ chữ 16 bị ép, xem chú
            // thích dưới, + padding 8 + viền 1) chỉ khoảng 37px, chưa đủ. `input:focus{outline:none}` của index.css xoá sạch tín hiệu focus nên
            // cần .mind-focus-ring; KHÔNG kèm .mind-search-pill — class đó dành cho khối BỌC NGOÀI
            // của component SearchField dùng chung (quy tắc `:focus-within` + tắt outline của input
            // CON bên trong), đặt thẳng lên một input trần thì rule thứ hai không khớp gì còn rule
            // thứ nhất chỉ là một vòng focus thứ hai trùng lặp, thắng-thua tuỳ thứ tự dòng trong
            // index.css.
            // KHÔNG đặt fontSize ở đây: index.css có `input,select,textarea{font-size:16px
            // !important}` (chặn iOS Safari tự zoom khi focus vào ô chữ nhỏ) — mọi giá trị đặt ở
            // đây đều bị nuốt, đo trên trình duyệt thật vẫn ra 16px. Ghi 13 vào cho "khớp cỡ chữ
            // các ô khác trong file" chỉ tạo dòng chết trông như đang có tác dụng.
            style={{
              width: '100%',
              minHeight: 44,
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--c-line, #d9ddf4)',
              background: 'var(--c-surface, #fff)',
            }}
          />
        </div>
      )}
      {danhSach.filter((b) => !b.daXoaLuc).length > 0 && (() => {
        // 2 chip đầu luôn hiện; phần còn lại gấp sau nút "Thêm" — cộng "Tất cả" + "Thêm" là ĐÚNG 4
        // lựa chọn rời rạc tại điểm quyết định này (luật ≤4, Cognitive Load Checklist). Trước đây
        // VISIBLE=4 cộng "Tất cả"+"Thêm" ra 6 lựa chọn cùng lúc, đã giảm từ 12 chip ở một lượt trước
        // đó nhưng chưa đạt ngưỡng (critique 2026-08-25 rồi 2026-08-26, cùng một phát hiện tái diễn).
        // Nếu bộ lọc ĐANG chọn nằm trong phần gấp mà dải đang thu gọn, vẫn chèn riêng đúng chip đó
        // vào — ẩn hẳn chip đang bật sẽ khiến người dùng không hiểu vì sao lưới đang lọc theo một
        // chuyên khoa "biến mất" khỏi dải. Nút "Thêm/Ẩn bớt" chỉ đổi `hienHetChip`, không bị khoá
        // kẹt bởi lựa chọn hiện tại — "Ẩn bớt" luôn thu gọn về đúng {2 chip đầu + chip đang chọn
        // nếu có}.
        const VISIBLE = 2
        const chipHien = SPECIALTIES.slice(0, VISIBLE)
        const chipAn = SPECIALTIES.slice(VISIBLE)
        const chonNamOTrongPhanAn = chuyenKhoaLoc !== null && chipAn.some((kh) => kh.id === chuyenKhoaLoc)
        const chipDangHienNgoaiVISIBLE = hienHetChip
          ? chipAn
          : chipAn.filter((kh) => kh.id === chuyenKhoaLoc)
        const soChipConLai = chipAn.length - chipDangHienNgoaiVISIBLE.length
        const veChip = (kh: (typeof SPECIALTIES)[number]) => (
          <button
            key={kh.id}
            type="button"
            data-testid={`chip-chuyen-khoa-${kh.id}`}
            onClick={() => setChuyenKhoaLoc(kh.id)}
            aria-pressed={chuyenKhoaLoc === kh.id}
            className="mind-focus-ring"
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--c-line, #d9ddf4)',
              background: chuyenKhoaLoc === kh.id ? kh.color : 'none',
              // chuTrenNen(kh.color), KHÔNG var(--c-on-bright) — xem comment tại định nghĩa hàm:
              // token đó chỉ đúng cho nền --c-primary, không đúng cho nền kh.color cố định qua theme
              // (critique 2026-08-26 P1, lượt 2).
              color: chuyenKhoaLoc === kh.id ? chuTrenNen(kh.color) : 'var(--c-text-muted, #6b6e96)',
            }}
          >
            {kh.name}
          </button>
        )
        return (
          <div
            // role="group" + nút toggle aria-pressed là mẫu ARIA đúng cho một cụm nút bật/tắt độc lập
            // — KHÔNG dùng role="tablist" (đó là mẫu điều hướng dạng tab, đòi hỏi role="tab" +
            // aria-selected + roving tabindex, không khớp cấu trúc button/aria-pressed ở đây). Ruling
            // review lượt 1.
            role="group"
            aria-label="Lọc theo chuyên khoa"
            style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 8px' }}
          >
            <button
              type="button"
              data-testid="chip-chuyen-khoa-tat-ca"
              onClick={() => setChuyenKhoaLoc(null)}
              aria-pressed={chuyenKhoaLoc === null}
              className="mind-focus-ring"
              style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--c-line, #d9ddf4)',
                background: chuyenKhoaLoc === null ? 'var(--c-primary, #2d3a94)' : 'none',
                // Cùng vá với chip chuyên khoa (veChip ở trên): var(--c-on-bright) thay '#fff' cứng.
                color: chuyenKhoaLoc === null ? 'var(--c-on-bright, #fff)' : 'var(--c-text-muted, #6b6e96)',
              }}
            >
              Tất cả
            </button>
            {chipHien.map(veChip)}
            {chipDangHienNgoaiVISIBLE.map(veChip)}
            {chipAn.length > 0 && (
              <button
                type="button"
                data-testid="chip-chuyen-khoa-them"
                onClick={() => setHienHetChip((v) => !v)}
                className="mind-focus-ring"
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px dashed var(--c-line, #d9ddf4)',
                  background: 'none',
                  color: 'var(--c-text-muted, #6b6e96)',
                }}
              >
                {hienHetChip
                  ? 'Ẩn bớt ▴'
                  : soChipConLai > 0
                    ? `Thêm +${soChipConLai} ▾`
                    : chonNamOTrongPhanAn
                      ? 'Ẩn bớt ▴'
                      : 'Thêm ▾'}
              </button>
            )}
          </div>
        )
      })()}
      {danhSachSapXep.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70%',
            gap: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div className="empty-breathe" style={{ width: 96, height: 72, color: 'var(--c-text-muted, #6b6e96)' }}>
            <TheTrong khoa={chuyenKhoaLoc ?? undefined} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-muted, #6b6e96)', margin: 0 }}>
            {rongDoBoLoc ? 'Không tìm thấy bảng nào khớp' : 'Bắt đầu một sơ đồ tư duy mới'}
          </p>
          {/* Chỉ hiện ở lưới THẬT SỰ trống (chưa từng tạo bảng nào) — trạng thái rỗng do bộ lọc
              (rongDoBoLoc) đã có gợi ý riêng ("Thử từ khoá khác...") ngay dưới, không cần lặp lại.
              Trước đây lời mời chỉ có một dòng, không hề gợi ý được năng lực liên kết-tới-Thư-viện
              hay lý do đây là bề mặt được đầu tư ≥50% công sức thiết kế của cả app (hiến chương
              Mindmap) — người dùng lần đầu không có cách nào biết giá trị này tồn tại trước khi tự
              mò ra (critique 2026-08-26, persona Jordan). */}
          {!rongDoBoLoc && (
            <p style={{ fontSize: 12.5, color: 'var(--c-text-muted, #6b6e96)', margin: 0, maxWidth: 220 }}>
              Ghi chú nối thẳng tới bài viết trong Thư viện, vẽ tay tự do, và sơ đồ phác đồ điều trị.
            </p>
          )}
          {rongDoBoLoc && (
            // Ô tìm và dải chip vẫn hiện ngay phía trên (cả hai gắn vào danhSach GỐC, không phải
            // danh sách đã lọc) nên không cần thêm nút "xoá bộ lọc" riêng — chỉ cần chỉ đúng chỗ.
            <p style={{ fontSize: 12.5, color: 'var(--c-text-muted, #6b6e96)', margin: 0 }}>
              Thử từ khoá khác hoặc bỏ bớt bộ lọc.
            </p>
          )}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            className="mind-focus-ring"
            // Viền/dấu cộng đổi sang --c-accent-2 (magenta riêng của Mindmap, xem DESIGN.md "The One
            // Other Place Rule") — trước đây cùng màu xám trung tính với MỌI thẻ khác trên lưới, nên
            // hành động chính duy nhất của Gallery không có ưu tiên thị giác nào (critique 2026-08-25,
            // mục "Ô + tạo mới không có ưu tiên thị giác"). Nền tint rất nhạt (.05 alpha) giữ tông vẫn
            // là ô rỗng viền đứt, không biến thành một thẻ đặc như thẻ nội dung thật.
            style={{
              width: 96,
              height: 72,
              border: '2px dashed var(--c-accent-2, #b8196f)',
              borderRadius: 8,
              background: 'rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.05)',
              fontSize: 28,
              color: 'var(--c-accent-2, #b8196f)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      ) : (
        // minmax(0, 1fr) thay vì '1fr' trần — '1fr' trần để Grid tự suy min-width từ NỘI DUNG khi
        // thiếu item để lấp đầy hàng (số bảng LẺ: ô "+" rơi cùng hàng với đúng 1 thẻ thật), và cả
        // thẻ lẫn ô "+" đều dùng aspectRatio (không có width tường minh) nên min-width suy ra bị kéo
        // lệch giữa hai cột — đo được 118px/217px thay vì chia đều. minmax(0, 1fr) chặn hẳn hành vi
        // "auto min" đó, luôn chia đều bất kể nội dung.
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, padding: 16 }}>
          {danhSachSapXep.map((bang, index) => (
            <TheBang
              key={bang.id}
              bang={bang}
              index={index}
              dangXoa={dangChoXoa?.id === bang.id}
              dangSuaTen={dangSuaTenId === bang.id}
              dangMoMenu={dangMoMenuId === bang.id}
              dangXacNhanXoa={dangXacNhanXoaId === bang.id}
              dangSuaTag={dangSuaTagId === bang.id}
              onMo={(origin) => onMoBang(bang.id, origin)}
              onBatMenu={() => {
                const dangMo = dangMoMenuId === bang.id
                setDangMoMenuId(dangMo ? null : bang.id)
                // Panel sửa chuyên khoa/tag và menu "⋯" ghim CÙNG toạ độ (top:30 right:4) với cùng
                // zIndex, panel render SAU nên luôn vẽ ĐÈ lên menu. Mục "Chuyên khoa/tag" là đường
                // DUY NHẤT đóng panel (nó là toggle), mà nó nằm trong menu bị che — panel mở ra là
                // kẹt cho tới khi thẻ unmount. Mở menu thì đóng panel trước: "⋯" luôn là đường thoát.
                if (!dangMo) setDangSuaTagId(null)
              }}
              onBatSuaTen={() => {
                setDangMoMenuId(null)
                setDangSuaTenId(bang.id)
              }}
              onBatSuaTag={() => {
                setDangMoMenuId(null)
                setDangSuaTagId(dangSuaTagId === bang.id ? null : bang.id)
              }}
              onDoiChuyenKhoa={(id) => {
                const bangMoi = { ...bang, chuyenKhoa: id, capNhatLuc: Date.now() }
                update(bangMoi)
                // Chip lọc đang chọn MỘT chuyên khoa khác id vừa gán → bảng sẽ rớt khỏi danhSachSapXep
                // ngay khi update() cập nhật state cục bộ (cùng lượt render), kéo theo panel đang mở
                // (dangSuaTag) unmount cùng lúc — người dùng vừa đổi chuyên khoa thì cả thẻ lẫn panel
                // biến mất không một lời giải thích. Đúng lớp lỗi review Task 2 đã bắt ở taoBangMoi
                // (tạo bảng dưới chip lọc khác cũng làm thẻ mới biến mất) — cùng cách vá: đưa bộ lọc
                // về "Tất cả" ngay khi thao tác khiến bảng đang thao tác rớt khỏi bộ lọc hiện tại.
                if (chuyenKhoaLoc && chuyenKhoaLoc !== id) setChuyenKhoaLoc(null)
                // Ô tìm (Task 8) là bộ lọc THỨ HAI, rớt khỏi nó cũng làm thẻ + panel biến mất y hệt,
                // nên phải vá RIÊNG — chặn được chip lọc không có nghĩa là chặn được ô tìm.
                // bangKhopTimKiem gộp cả TÊN HIỂN THỊ của chuyên khoa ("Tim mạch", xem boardMeta.ts)
                // nên đổi khoa thật sự đổi kết quả so khớp. Kiểm bằng chính bản ghi MỚI (bangMoi):
                // `bang` trong closure vẫn là bản cũ, so khớp nó sẽ ra kết luận sai. Truy vấn rỗng
                // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onLuuTen={(tenMoi) => {
                setDangSuaTenId(null)
                const tenSach = tenMoi.trim() || bang.ten
                // Bỏ qua nếu tên KHÔNG đổi (Escape-huỷ, hoặc blur không gõ gì) — trước đây luôn
                // ghi update() dù tên y hệt, bump capNhatLuc thành "Vừa xong" cho một thao tác
                // không làm gì cả, khiến tín hiệu "cập nhật gần đây" càng thêm sai lệch (critique
                // lượt 3, 2026-08-24 — xác nhận trực tiếp bằng Escape trên Browser pane thật).
                if (tenSach === bang.ten) return
                const bangMoi = { ...bang, ten: tenSach, capNhatLuc: Date.now() }
                update(bangMoi)
                // Đổi tên ra NGOÀI truy vấn đang lọc thì thẻ vừa lưu biến mất ngay lượt render kế
                // tiếp — nhẹ hơn hai ca kia (ô đổi tên đã tự đóng ở dòng đầu callback nên không có
                // panel nào bị giật mất) nhưng vẫn là "vừa lưu xong thì mất thẻ". Cùng cách vá với
                // chip lọc ngay trên: xoá trắng bộ lọc khiến bảng đang thao tác rớt khỏi lưới.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onXoa={() => {
                if (dangXacNhanXoaId !== bang.id) {
                  setDangXacNhanXoaId(bang.id)
                  return
                }
                setDangXacNhanXoaId(null)
                setDangMoMenuId(null)
                setDangChoXoa(bang)
              }}
              onThemTag={(tag) => {
                const hienCo = bang.tags ?? []
                if (hienCo.includes(tag)) return
                update({ ...bang, tags: [...hienCo, tag], capNhatLuc: Date.now() })
              }}
              onXoaTag={(tag) => {
                const bangMoi = { ...bang, tags: (bang.tags ?? []).filter((t) => t !== tag), capNhatLuc: Date.now() }
                update(bangMoi)
                // Ca TỆ NHẤT của lớp lỗi này: truy vấn khớp bảng CHỈ nhờ đúng cái tag vừa bị bấm ×.
                // Panel sửa tag đang mở ngay dưới con trỏ, xoá xong là bảng thôi khớp truyVan → thẻ
                // rớt khỏi lưới kéo panel unmount cùng lượt render, người dùng mất chỗ đang thao tác
                // giữa chừng. Cùng cách vá với chip lọc ở onDoiChuyenKhoa phía trên.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
            />
          ))}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            className="mind-focus-ring"
            // Cùng lý do và cùng cặp giá trị với ô "+" ở trạng thái rỗng phía trên: viền/dấu cộng
            // dùng --c-accent-2 để đây vẫn đọc là "lời mời ấm" giữa một lưới thẻ lạnh, thay vì cùng
            // xám trung tính với trạng thái rỗng/đường viền phân cách.
            style={{
              aspectRatio: '4 / 3',
              border: '2px dashed var(--c-accent-2, #b8196f)',
              borderRadius: 8,
              background: 'rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.05)',
              fontSize: 24,
              color: 'var(--c-accent-2, #b8196f)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      )}
    </div>
    {vuaXoa && (
        <div
          role="status"
          aria-live="polite"
          className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40"
          style={{ left: 12, right: 12, bottom: 'calc(var(--nav-body-h) + 18px)', background: 'rgba(15,23,42,.94)' }}
        >
          <span className="flex-1 text-[12.5px] text-white leading-snug">Đã xoá "{vuaXoa.ten}"</span>
          <button
            type="button"
            onClick={() => {
              khoiPhucBang(vuaXoa)
              setVuaXoa(null)
            }}
            className="mind-focus-ring"
            style={{
              // --c-accent-2 (magenta riêng Mindmap), KHÔNG --c-toast-green — token xanh lá đó dành
              // cho ngữ nghĩa lâm sàng "thành công" (Untouchable Signal Rule, DESIGN.md); một hành
              // động UI thường (hoàn tác xoá bảng) mượn nhầm màu đó làm mờ ranh giới "One Other Place
              // Rule" của Mindmap (critique 2026-08-26, minor observation).
              color: 'var(--c-accent-2, #b8196f)',
              fontWeight: 600,
              fontSize: 13,
              background: 'none',
              border: 0,
              whiteSpace: 'nowrap',
              padding: '4px 6px',
            }}
          >
            Hoàn tác
          </button>
        </div>
      )}
    </>
  )
}
