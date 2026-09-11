import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SPECIALTIES } from '../data'
import { formatReadTime } from '../lib/recentReads'
import type { MucMeta } from './mucMeta'
import { nghiengOnDinh } from './mauBang'
import { TheTrong } from './trangThai'
import { TEN_MAC_DINH, VUA_TAO_NGUONG_MS } from './luoiHangSo'
import type { BoardOpenOrigin } from './LuoiMuc'

export function TheBang({
  bang,
  index,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  chonNhieu = false,
  daChonNhieu = false,
  onChuyenChonNhieu,
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
  bang: MucMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  // Chế độ chọn-nhiều trên lưới sống (critique 2026-09-01, P2) — khi bật, checkbox thay hẳn nút
  // "⋯" ở góc thẻ (xem render bên dưới); cha truyền onBatMenu rỗng lúc chonNhieu=true nên không có
  // gì mở ra, và onMo cũng bị cha đổi thành chọn/bỏ chọn thay vì mở bảng — TheBang không tự biết
  // "đang ở chế độ chọn" theo nghĩa hành vi, chỉ theo nghĩa HIỂN THỊ (icon nào vẽ ở góc thẻ).
  chonNhieu?: boolean
  daChonNhieu?: boolean
  onChuyenChonNhieu?: () => void
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
  // Bảng còn mang tên MẶC ĐỊNH thì ô nhập để rỗng (tên mặc định lùi về làm placeholder) — xem chú
  // thích dài ở chính ô nhập bên dưới.
  const tenBanDau = (ten: string) => (ten === TEN_MAC_DINH ? '' : ten)
  const [tenNhap, setTenNhap] = useState(() => tenBanDau(bang.ten))
  // Ô rỗng KHÔNG được lưu thành tên rỗng: bấm "+" rồi đổi ý (chạm ra ngoài, Enter luôn) là luồng có
  // thật, và một thẻ không nhãn thì không cách nào phân biệt trong lưới — đúng lý do tên mặc định
  // tồn tại. Rỗng hoặc chỉ toàn khoảng trắng đều lùi về tên mặc định.
  const tenCanLuu = () => tenNhap.trim() || TEN_MAC_DINH
  const [tagNhap, setTagNhap] = useState('')
  const nutRef = useRef<HTMLButtonElement>(null)
  // Nút "⋯" — giữ ref để TRẢ FOCUS về đây khi đóng menu/panel bằng Escape (bàn phím/trình đọc màn
  // hình mở sheet ra rồi thoát, con trỏ tiêu điểm phải quay lại đúng chỗ vừa bấm, không rơi về
  // <body>). Đóng bằng bấm-ra-ngoài hoặc chọn một mục (Đổi tên/tag/Xoá) KHÔNG trả về đây — focus
  // đi theo hành động (ô đổi tên tự autoFocus, v.v.), đúng như mong đợi.
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tagPanelRef = useRef<HTMLDivElement>(null)
  // Menu "⋯" mở LÊN TRÊN thay vì xuống dưới, khi dưới thẻ không còn chỗ. Xem useLayoutEffect ngay
  // dưới phần khai báo state — mặc định false (mở xuống) để lượt render đầu không nhấp nháy.
  const [menuMoLen, setMenuMoLen] = useState(false)
  // Nháy xác nhận khi HUỶ đổi tên bằng Escape — trước bản vá này, Escape hoàn tác đúng (tên cũ được
  // lưu lại) nhưng không có gì cho người gõ nhanh THẤY việc huỷ đã xảy ra, chỉ có thể tin (critique
  // 2026-09-02 lượt 3, P3). Tự tắt sau một nhịp ngắn — xem .ten-bang-vua-huy (index.css) cho hoạt
  // ảnh, tắt ở Escape handler bên dưới.
  const [vuaHuyDoiTen, setVuaHuyDoiTen] = useState(false)
  useEffect(() => {
    if (!vuaHuyDoiTen) return
    const id = setTimeout(() => setVuaHuyDoiTen(false), 300)
    return () => clearTimeout(id)
  }, [vuaHuyDoiTen])
  // Đặt góc nghiêng theo MỘT điểm (chuột đang hover HOẶC ngón tay đang ấn) — dùng chung cho cả hai
  // nhánh con trỏ/cảm ứng của onPointerDown/onPointerMove bên dưới, cùng một công thức toạ độ đọc
  // bởi Lớp B/C trong index.css (--con-tro-x/--con-tro-y, [0,1] theo bề rộng/cao nút).
  const datNghiengTheoDiem = (clientX: number, clientY: number) => {
    const el = nutRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--con-tro-x', String((clientX - r.left) / r.width))
    el.style.setProperty('--con-tro-y', String((clientY - r.top) / r.height))
  }
  // Gỡ góc nghiêng theo điểm chạm — gọi ở mọi điểm ngón tay/con trỏ RỜI thẻ (pointerup/
  // pointercancel/pointerleave), đúng lúc :hover/:active hết khớp nên tờ giấy phải TỰ SETTLE về góc
  // tĩnh (var(--tilt)) qua chính transition 0.18s đã có, không phải đứng khựng ở góc nghiêng cuối
  // cùng của lần chạm trước.
  const xoaNghiengConTro = () => {
    nutRef.current?.style.removeProperty('--con-tro-x')
    nutRef.current?.style.removeProperty('--con-tro-y')
  }
  // Tên chuyên khoa cho aria-label — huy hiệu chuyên khoa trong TheTrong là aria-hidden (nó lồng
  // vào artwork trang trí), nên người dùng trình đọc màn hình không có cách nào khác biết bảng này
  // thuộc chuyên khoa nào trong khi người dùng sáng mắt thấy ngay qua icon+màu (critique 2026-08-26 P3).
  const tenChuyenKhoa = SPECIALTIES.find((s) => s.id === (bang.chuyenKhoa ?? SPECIALTIES[0].id))?.name
  // Tên LOẠI mục cho aria-label — CÙNG LÝ DO đúng phía trên nhưng cho badge loại (bài viết ↔ sơ
  // đồ) ở TheTrong: badge đó CỐ Ý vẫn nằm trong cây `aria-hidden="true"` (hình trang trí, xem
  // comment tại chỗ render badge trong TheTrong), nên `<title>` bên trong `iconLoaiMuc()` không
  // bao giờ tới trình đọc màn hình — trước bản vá này, người dùng trình đọc màn hình có 0 tín hiệu
  // phân biệt bài viết với sơ đồ trong lưới dù người sáng mắt thấy ngay qua icon (VÒNG SỬA 1, P1).
  const tenLoai = bang.loai === 'bai-viet' ? 'bài viết' : 'sơ đồ'

  // Tính "vừa tạo" bằng ĐỒNG HỒ RIÊNG của thẻ, không phải mốc đông cứng lúc LuoiMuc mount —
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
    if (dangSuaTen) setTenNhap(tenBanDau(bang.ten))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tenBanDau` là hàm thuần dựng lại mỗi
    // lượt render; đưa nó vào deps sẽ chạy effect mỗi render và xoá sạch bản nháp đang gõ dở.
  }, [dangSuaTen, bang.ten])

  // ─── Menu "⋯" luôn NEO VÀO THẺ, chỉ lật hướng khi hết chỗ ────────────────────────────────────
  //
  // Trước 2026-08-30, trên màn ≤640px index.css ghim menu này xuống ĐÁY MÀN HÌNH (bottom sheet), với
  // lý do "luôn trong tầm ngón cái" (critique 2026-08-26). Đo lại trên iPhone 375×812 cho thấy cái
  // giá của nó: bấm "⋯" của thẻ hàng đầu (nút ở y=196) thì menu hiện ở y=585 — CÁCH NÚT 345px, mép
  // dưới chạm đúng mép trên thanh nav (755). Menu mất hẳn liên hệ với thẻ đã mở nó: trên một lưới
  // nhiều thẻ, không có gì cho biết "Xoá" sắp xoá bảng nào. Chủ dự án gọi đây là lỗi RẤT NẶNG
  // (2026-08-30) và đúng: với một menu có mục phá huỷ, mất liên hệ chỉ-định nguy hiểm hơn hẳn việc
  // phải với xa vài centimet.
  // Neo vào thẻ giữ được liên hệ đó ở mọi bề rộng. Vấn đề mà bottom-sheet từng giải — thẻ ở HÀNG
  // CUỐI mở menu tràn xuống dưới màn — được xử lý đúng chỗ hơn: LẬT LÊN TRÊN khi phía dưới không đủ
  // chỗ, đúng cách mọi menu ngữ cảnh gốc của hệ điều hành làm.
  //
  // `useLayoutEffect` chứ không phải `useEffect`: đo rồi lật phải xong TRƯỚC lượt sơn, nếu không
  // người dùng thấy menu nhảy một nhịp từ dưới lên trên.
  useLayoutEffect(() => {
    if (!dangMoMenu) {
      setMenuMoLen(false)
      return
    }
    const el = menuRef.current
    const nut = menuBtnRef.current
    if (!el || !nut) return
    const cao = el.offsetHeight
    const nutR = nut.getBoundingClientRect()
    // Đáy dùng được = mép dưới khung nhìn trừ thanh nav (và safe-area của nó). `--above-nav` là
    // cùng token mà mọi thứ neo trên thanh nav trong app này dùng — không tự chế lại phép tính.
    //
    // Phải ĐO qua một phần tử thật, không `parseFloat` giá trị token: `--above-nav` là một
    // `calc(calc(51px + max(5px, 0px)) + 18px)` (có `env(safe-area-inset-bottom)` bên trong), và
    // `getPropertyValue` trả về nguyên văn chuỗi calc chứ không phải số đã giải — `parseFloat` trên
    // đó ra `NaN` (đo được 2026-08-30). Một div ẩn cao đúng bằng token buộc trình duyệt giải calc,
    // kể cả phần `env()` chỉ máy thật mới có giá trị khác 0.
    const thuoc = document.createElement('div')
    thuoc.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:var(--above-nav)'
    document.body.appendChild(thuoc)
    const aboveNav = thuoc.offsetHeight
    thuoc.remove()
    const dayAnToan = window.innerHeight - (aboveNav > 0 ? aboveNav : 76)
    const duChoDuoi = nutR.bottom + cao <= dayAnToan
    // Chỉ lật khi phía dưới thiếu chỗ VÀ phía trên đủ chỗ — thiếu cả hai thì mở xuống như cũ và để
    // vùng cuộn lo phần còn lại, thay vì đẩy menu lên khuất sau tiêu đề màn.
    const duChoTren = nutR.top - cao >= 0
    setMenuMoLen(!duChoDuoi && duChoTren)
  }, [dangMoMenu])

  // Quản lý tiêu điểm cho sheet "⋯" và panel chuyên khoa/tag — cả hai là <div> thường, không có
  // hành vi focus sẵn của control gốc (critique 2026-08-28 P2, persona Sam: mở sheet ra là focus
  // vẫn kẹt ở đầu lưới đã cuộn, Tab lại xổ trang ra xa sheet). Mở → đưa focus vào phần tử focus
  // được đầu tiên TRONG sheet. Đóng bằng Escape → trả về nút "⋯". Tab bị giam vòng trong sheet.
  // Deps là HAI cờ riêng (không phải `dangMoMenu || dangSuaTag`) để lượt chuyển menu→panel — hai
  // cờ đổi nhưng "có sheet nào mở" vẫn true — vẫn kích hoạt lại đúng ref mới.
  useEffect(() => {
    const el = dangMoMenu ? menuRef.current : dangSuaTag ? tagPanelRef.current : null
    if (!el) return
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled'))
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menuBtnRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [dangMoMenu, dangSuaTag])

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
                  chuyenKhoa: bang.chuyenKhoa,
                  id: bang.id,
                  mauHue: bang.mauHue,
                }
              : undefined,
          )
        }}
        className="the-bang-vat the-bang-nghieng-con-tro mind-focus-ring"
        // Nghiêng theo vị trí con trỏ/ngón tay khi đang ấn — Lớp B/C ở index.css đọc hai biến này.
        // Nhấn-giữ ĐỂ MỞ MENU từng sống ở đúng ba handler này (removed 2026-09-02, distill P3): sau
        // 3 vòng critique độc lập, cử chỉ đó vẫn không ai tìm ra (comment cũ ghi thẳng điều này) —
        // "⋯" đã là lối vào DUY NHẤT và đầy đủ tới cùng menu, nên giữ một cử chỉ song song không ai
        // dùng chỉ còn là chi phí bảo trì (thêm nhánh onPointerDown/Move/Cancel, thêm bề mặt cho bug
        // tinh vi) không ai hưởng lợi — không mất chức năng thật nào khi bỏ.
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          // Nghiêng ngay từ lúc ngón tay chạm xuống — một cú chạm-mở-bảng bình thường không tạo
          // pointermove nào trước khi rời tay, nên thiếu dòng này thì .the-bang-vat:active của phần
          // lớn lượt chạm không bao giờ có góc nghiêng thật, chỉ scale phẳng (adapt cho cảm ứng,
          // critique 2026-09-02 P2 — trước đây Lớp C chỉ chạy qua :hover chuột, vô hình với đối
          // tượng dùng chính của PWA này).
          datNghiengTheoDiem(e.clientX, e.clientY)
        }}
        onPointerUp={xoaNghiengConTro}
        onPointerCancel={xoaNghiengConTro}
        onPointerMove={(e) => datNghiengTheoDiem(e.clientX, e.clientY)}
        onPointerLeave={xoaNghiengConTro}
        // WebkitTouchCallout/userSelect none: nút này là một hành động (mở bảng), không phải văn
        // bản để chọn — không tắt thì iOS bật bong bóng "Sao chép" và bôi đen tên bảng ngay giữa cú
        // chạm/ấn giữ bình thường. Không ảnh hưởng bàn phím/trình đọc màn hình.
        style={{
          display: 'block',
          width: '100%',
          border: 0,
          background: 'none',
          padding: 0,
          textAlign: 'left',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        // Mốc cập nhật tương đối gắn vào aria-label — cùng lý do/mẫu moTaXoa của panel "Đã xoá gần
        // đây" (critique 2026-09-01 P1, xem chú thích tại đó): trước bản vá này, mọi thẻ CHƯA gắn
        // chuyên khoa (mặc định của bảng mới từ 2026-09-02) có aria-label NGUYÊN VĂN giống hệt nhau
        // — "Mở bảng Bảng chưa đặt tên" — nên người dùng trình đọc màn hình không có cách nào phân
        // biệt N bảng như vậy trong lưới, dù bản vá màu-theo-id lượt 2 đã giúp người sáng mắt phân
        // biệt được (critique 2026-09-02 lượt 3, P1 — đúng lỗi đã vá RIÊNG ở panel trash nhưng chưa
        // mang sang lưới chính). Dùng capNhatLuc (đã hiển thị trên màn, xem <p> ngay dưới) chứ không
        // phải taoLuc: đây là mốc người dùng NHÌN THẤY, giữ hai nguồn tin đồng bộ với nhau.
        //
        // `formatReadTime` làm tròn mọi mốc dưới 60 giây thành "Vừa xong" — hai bảng tạo trong cùng
        // một phút (thao tác thật, phổ biến nhất: dựng vài khung liên tiếp đầu ca trực) vẫn đọc ra
        // câu byte-y-hệt nhau, tái lập chính lớp lỗi bản vá này định sửa (đo được trực tiếp, critique
        // 2026-09-03 lượt 4, P1). Tái dùng một giá trị ĐÃ LÀM TRÒN cho hiển thị làm nguồn phân biệt
        // là sai công cụ — thêm `index` (vị trí hiện tại trong lưới đã sắp xếp, luôn khác nhau giữa
        // hai bản ghi bất kỳ, không cần state mới) làm số thứ tự CHỈ cho nhánh chưa gắn khoa VÀ còn
        // mang tên mặc định — đúng nhánh gây nhầm lẫn, không đụng tới bảng đã có tên/khoa riêng.
        aria-label={
          tenChuyenKhoa
            ? `Mở bảng ${bang.ten}, loại ${tenLoai}, chuyên khoa ${tenChuyenKhoa}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
            : bang.ten === TEN_MAC_DINH
              ? `Mở bảng chưa đặt tên thứ ${index + 1}, loại ${tenLoai}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
              : `Mở bảng ${bang.ten}, loại ${tenLoai}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
        }
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
              // Thẻ LUÔN mang icon chuyên khoa — không bao giờ tái hiện nét vẽ bên trong bảng.
              //
              // Trước 2026-08-30, khi bảng đã có nội dung thì ô này thay icon bằng `bang.anhXemTruoc`
              // — một ảnh chụp CANVAS KHUNG NHÌN lúc rời bảng (480×360, JPEG q=0.6). Chủ dự án gọi
              // đó là "lỗi RẤT NẶNG": thẻ mất danh tính chuyên khoa ngay khi bảng bắt đầu có việc,
              // và cái thay vào là một hình bệt phụ thuộc chỗ người dùng vô tình dừng khung nhìn.
              // Nay lưới đọc được bằng MỘT ngôn ngữ thị giác duy nhất (icon + màu chuyên khoa), ổn
              // định qua mọi lần mở/đóng bảng.
              // Bỏ luôn `inset: 6` + viền trong: hai thứ đó tồn tại để tấm ảnh trông như được ghim
              // lên giấy, mà giờ không còn tấm ảnh nào. Icon là hoạ tiết của CHÍNH tờ giấy nên tràn
              // kín, đúng như nhánh TheTrong vẫn làm cho bảng trống từ trước tới nay.
              inset: 0,
              overflow: 'hidden',
              borderRadius: 2,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
          >
            <TheTrong khoa={bang.chuyenKhoa ?? SPECIALTIES[0].id} id={bang.id} mauHue={bang.mauHue} loai={bang.loai} />
          </div>
          {/* Không còn cây ghim vẽ trên thẻ — chủ dự án yêu cầu bỏ hẳn (2026-08-29: "xóa ghim").
              Phân biệt bảng cùng tên mặc định vẫn còn: icon + màu chuyên khoa trong TheTrong, tên,
              vị trí trong lưới, và chấm màu ổn định trong panel "Đã xoá gần đây". */}
        </div>
        {!dangSuaTen && (
          <>
            <p
              className={vuaHuyDoiTen ? 'ten-bang-vua-huy' : undefined}
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
          // Tên mặc định là PLACEHOLDER, ô để rỗng — không phải giá trị thật trong ô.
          //
          // Luồng phổ biến nhất là bấm "+" rồi gõ tên ngay. Bản vá trước dùng `onFocus` → `select()`
          // để ký tự đầu tiên ghi đè tên mặc định thay vì nối vào đuôi nó. Cách đó đủ trên máy có
          // chuột nhưng KHÔNG cứu được iPhone, và lý do đáng ghi lại: Safari không mở bàn phím cho
          // một `focus()` do script gọi (xem HANDOFF 1.1), nên người dùng BUỘC phải chạm vào ô mới
          // gõ được — chính cú chạm đó đặt lại caret và huỷ vùng vừa chọn. Vùng chọn không sống nổi
          // tới lúc phím đầu tiên được gõ, nên tên vẫn ra `"Bảng chưa đặt tênSốc nhiễm khuẩn"`
          // (chủ dự án báo trên máy thật 2026-08-29).
          //
          // Ô rỗng bỏ hẳn chỗ dựa vào vùng chọn: gõ ở bất kỳ vị trí caret nào cũng ra đúng thứ
          // người dùng gõ. `select()` vẫn giữ cho luồng đổi tên một bảng ĐÃ có tên thật.
          placeholder={TEN_MAC_DINH}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenCanLuu())
            if (e.key === 'Escape') {
              setVuaHuyDoiTen(true)
              onLuuTen(bang.ten)
            }
          }}
          onBlur={() => onLuuTen(tenCanLuu())}
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
            // Ô này là ANH EM (không phải con) của nút .the-bang-vat mang rotate(var(--tilt)) —
            // transform không kế thừa qua CSS nên ô nhập trước đây đứng thẳng phẳng lệch với thẻ
            // giấy vẫn đang nghiêng ngay bên dưới, đúng lúc người dùng chú ý nhất (đặt tên bảng vừa
            // tạo) — một vết nứt nhỏ trong ảo giác "mọi thứ là vật thể thật" (critique 2026-09-02
            // lượt 2, P3). --tilt là custom property, CÓ kế thừa qua cây DOM dù transform thì không,
            // nên đọc lại đúng góc của outer wrapper là đủ, không cần đo/truyền lại giá trị nào mới.
            transform: 'rotate(var(--tilt, 0deg))',
          }}
        />
      )}

      {chonNhieu && (
        // Checkbox thay HẲN nút "⋯" (không chỉ che nó) khi đang ở chế độ chọn-nhiều — cùng vị trí
        // góc/44×44 nên mắt không phải học lại toạ độ, nhưng loại bỏ affordance mở menu từng-thẻ
        // trong khi đang thao tác hàng loạt (hai chế độ chọn xung đột nhau nếu cùng hiện).
        // Vùng chạm 44×44 bọc checkbox 20px — to hơn checkbox 17px của panel trash một chút vì thẻ
        // này lớn hơn hẳn dòng danh sách trash, cân đối thị giác hơn.
        <label
          style={{
            position: 'absolute', top: 4, right: 4, width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            data-testid={`chon-nhieu-song-${bang.id}`}
            checked={daChonNhieu}
            onChange={() => onChuyenChonNhieu?.()}
            aria-label={`Chọn bảng ${bang.ten}`}
            // colorScheme:'light' BẮT BUỘC ở đây, không kế thừa app.dark: checkbox này nằm TRÊN tờ
            // giấy .mind-note-card (không đổi theo theme, luôn gần-trắng) nhưng trình duyệt tự vẽ
            // khung checkbox CHƯA TÍCH theo color-scheme của TRANG (dark), ra một ô đặc tối gần như
            // không viền trên nền giấy sáng — đọc thành hoạ tiết trang trí hơn là control (critique
            // 2026-09-02 lượt 2, P3). Ép light cho riêng control này thì khung/viền luôn vẽ theo quy
            // ước sáng, khớp đúng nền giấy nó đứng trên — accentColor (trạng thái ĐÃ tích) không đổi.
            style={{ width: 20, height: 20, accentColor: 'var(--c-primary, #2d3a94)', colorScheme: 'light' }}
          />
        </label>
      )}
      <button
        ref={menuBtnRef}
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        aria-haspopup="menu"
        aria-expanded={dangMoMenu || dangSuaTag}
        hidden={chonNhieu}
        className="mind-focus-ring"
        // Vùng chạm 44×44 (chuẩn tối thiểu cho ngón tay, WCAG 2.2 AA + khuyến nghị thực hành) — giữ
        // cùng gốc top/right:4 như cũ (không đẩy ra ngoài mép thẻ, tránh chồng lên khoảng gap của
        // lưới) nên box lớn hơn ăn VÀO PHÍA TRONG thẻ; icon tự căn giữa lại bằng flex, dịch nhẹ
        // vào trong so với vị trí cũ — chấp nhận được, không phóng to một hình tròn nền/viền vốn
        // không tồn tại (nút này chưa từng có background/border thấy được, chỉ có ba dấu chấm).
        //
        // color BẮT BUỘC đặt ở đây, không để kế thừa: nút nằm TRÊN tờ giấy .mind-note-card (không
        // đổi theo theme) nhưng Tailwind preflight cho <button> `color: inherit`, nên trước lượt vá
        // này nó nhận --c-text — token LẬT sang near-white ở bản tối. Đo thật trên trang:
        // rgb(236,239,252) trên giấy rgb(239,236,227) = 1,03:1, tức nút mở TOÀN BỘ hành động của
        // thẻ (đổi tên, gắn khoa, xoá) VÔ HÌNH ở dark mode — đúng ca dùng ban đêm mà
        // DESIGN.md đặt làm ràng buộc hạng nhất (critique 2026-08-28, P0). --c-on-note giữ 17,3:1
        // bản sáng / 15,5:1 bản tối.
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 0,
          background: 'none',
          color: 'var(--c-on-note, #12142b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Icon VẼ THẬT thay cho ký tự Unicode "⋯" dùng trước đây. Hai lý do: (1) glyph Unicode
            render khác nhau theo font/hệ điều hành và không nhận được cỡ/khoảng cách nhất quán như
            phần còn lại của hệ icon app (đều là SVG currentColor); (2) ba chấm đặc r=1.5 ở 18px
            đọc rõ hơn hẳn glyph text cùng ô — trực tiếp nới cái affordance vốn quá mờ nhạt
            (critique 2026-08-28, P2). currentColor nên tự ăn theo --c-on-note đặt ngay trên. */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <circle cx="3.5" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="14.5" cy="9" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {dangMoMenu && (
        // .mind-menu-bang: trên màn hẹp (mobile), src/index.css ghim panel này xuống ĐÁY màn hình
        // (bottom sheet, luôn trong tầm ngón cái) thay vì neo cứng top:30 relative-tới-thẻ — thẻ ở
        // HÀNG TRÊN CÙNG của lưới dài mở panel gần rìa trên, không phải vùng ngón cái thoải mái nhất
        // khi dùng một tay (critique 2026-08-26, minor observation). .mind-sheet thêm hiệu ứng trượt
        // lên nhẹ, nhất quán với các sheet khác của app.
        <div
          // mind-menu-compact: chỉ 3 dòng chữ ngắn (Chuyên khoa/tag, Đổi tên, Xoá) — KHÔNG cần trải
          // full-bleed như panel "Chuyên khoa/tag" ngay dưới (có select+chip+input, thật sự cần rộng).
          // Cả hai vốn dùng chung .mind-menu-bang nên trên mobile đều bị media query kéo full-bleed
          // như nhau, khiến menu thưa nội dung này đọc thành một menu quá khổ so với "các menu còn
          // lại" của app (phản hồi thật 2026-08-27, taste review). Modifier này cho index.css tách
          // riêng: vẫn ghim đáy màn hình trong tầm ngón cái (lý do gốc của bottom-sheet, giữ nguyên
          // critique 2026-08-26), chỉ bỏ ép trải hết bề ngang.
          ref={menuRef}
          role="menu"
          aria-label={`Tuỳ chọn bảng ${bang.ten}`}
          className="mind-menu-bang mind-menu-compact mind-sheet"
          style={{ position: 'absolute', top: menuMoLen ? 'auto' : 30, bottom: menuMoLen ? 30 : 'auto', right: 4, width: 'max-content', background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 4, zIndex: 1 }}
        >
          {/* Vùng chạm 40px (display:flex+minHeight, không phải padding trần) + khoảng cách/đường
              phân trước mục xoá — trước đây hai dòng cao ~30.6px, cách nhau 0px, hành động phá huỷ
              đứng ngay sát hành động an toàn (critique lượt 3, 2026-08-24), nên tăng lên 44px. 44px
              sau đó tự đọc thành "dòng dãn cách quá xa" cho 3-4 dòng chữ 12px ngắn xếp chồng (phản
              hồi thật 2026-08-28) — hạ về 40px: vẫn vượt xa ngưỡng WCAG 2.5.8 AA (24px, không phải
              44 — 44 là mức khuyến nghị AAA/HIG, không bắt buộc), vẫn đủ rộng hơn hẳn 30.6px từng bị
              coi là lỗi, chỉ bớt khoảng đệm rỗng trên/dưới mỗi dòng chữ. Đường phân + marginTop trước
              "Xoá" giữ nguyên — đó là phần thật sự xử lý ranh giới phá huỷ/an toàn, độc lập với chiều
              cao từng dòng.
              width:'max-content' trên div ngoài + whiteSpace nowrap trên từng nhãn (mới thêm
              2026-08-26, phản hồi thật "cắt cụt ngang") — trước đây div ngoài KHÔNG có width tường
              minh, phải tự suy shrink-to-fit trong khi mọi <button> con lại đặt width:100% CỦA CHÍNH
              div đó — vòng phụ thuộc khiến trình duyệt suy ra độ rộng hẹp hơn nội dung thật, ngắt dòng
              ngay giữa nhãn dài nhất ("Chuyên khoa/tag" vỡ thành "Chuyên" / "khoa/tag" trên hai dòng).
              CHỌN 'max-content' thay vì một số minWidth cố định (thử trước, ĐÃ BỎ): số cố định đè
              lên đúng cơ chế "trải full-width" của bottom sheet mobile ngay dưới (.mind-menu-bang
              media max-width:640px đặt width:auto!important + left/right:12px) — !important CHỈ
              thắng width, không thắng min-width, nên minWidth cố định vẫn ăn vào SAU khi width:auto
              đã giải, ép menu bottom-sheet mobile co lại đúng bằng con số đó thay vì trải hết bề
              ngang (đo thật: 172px thay vì ~351px ở màn 375px — hồi quy tự phát hiện lúc kiểm tay).
              max-content không xung đột: nó là GIÁ TRỊ width thật (không phải min-width) nên bị
              width:auto!important ở mobile ghi đè đúng như ý, còn ở desktop trình duyệt tự suy đúng
              độ rộng cần thiết từ nội dung chữ dài nhất — không cần đoán một con số px. */}
          {/* fontSize 10 + fontWeight 600 — KHỚP đúng nhãn thanh nav dưới (App.tsx: text-[10px],
              fontWeight 500/700 tuỳ trạng thái). Ba nút này trước đây KHÔNG đặt fontSize nào, nên
              thừa kế cỡ chữ mặc định trình duyệt (~16px) — to hơn HẲN mọi chữ khác quanh nó (chip
              12px, nhãn "Chuyên khoa"/tag 11px) — vừa đọc "chữ menu quá bự", vừa kéo bề rộng
              max-content của cả thanh menu to theo (phản hồi thật 2026-08-27, layout review). Chữ
              nhỏ lại không thu hẹp vùng chạm: minHeight:40 vẫn giữ nguyên, chỉ khối TEXT bên trong
              gọn lại — không bị ép/cắt cụt vì max-content vẫn tự co đúng theo độ rộng chữ mới. */}
          <button
            type="button"
            data-testid={`sua-tag-${bang.id}`}
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Chuyên khoa/tag
          </button>
          <button
            type="button"
            data-testid={`doi-ten-${bang.id}`}
            onClick={onBatSuaTen}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Đổi tên
          </button>
          {/* "Xuất PNG" KHÔNG còn ở đây — chuyển ra nút tròn ở màn vẽ (BoardGallery.tsx), đối xứng
              với nút quay lại. Lý do: xuất từ lưới phải mount một bảng ngầm, mà trình soạn thảo
              ngầm không bao giờ render khối note nên thẻ ghi chú không vào được ảnh. Xuất từ bảng
              đang mở dựng ảnh từ chính cây đang render. Xem ./xuatAnhBang.ts và HANDOFF §1.1. */}
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            role="menuitem"
            // aria-live + aria-atomic: chuyển "Xoá" → "Chắc chắn xoá?" chỉ là đổi CHỮ trên CÙNG nút,
            // không có phần tử mới nào mount lên để trình đọc màn hình tình cờ bắt được — không có
            // hai thuộc tính này, việc chuyển sang bước xác nhận phá huỷ hoàn toàn im lặng với AT
            // (critique 2026-09-02 lượt 2, P2). "polite" (không "assertive"): đây là xác nhận NGAY
            // SAU thao tác của chính người dùng trên đúng nút đang focus, không phải một cảnh báo hệ
            // thống cần cắt ngang những gì AT đang đọc dở.
            aria-live="polite"
            aria-atomic="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 40,
              textAlign: 'left',
              padding: '0 10px',
              marginTop: 2,
              border: 0,
              borderTop: '1px solid var(--c-line, #d9ddf4)',
              background: 'none',
              color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined,
              whiteSpace: 'nowrap',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}

      {dangSuaTag && (
        <div
          ref={tagPanelRef}
          role="dialog"
          aria-label={`Chuyên khoa và tag cho bảng ${bang.ten}`}
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
            {/* Bảng mới tạo (taoBangMoi) bắt đầu ở '' — lựa chọn này cho người dùng CHỦ ĐỘNG quay
                lại trạng thái đó (không chỉ tiến từ nó), thay vì buộc phải chọn một chuyên khoa thật
                cho một bảng hành chính/liên chuyên khoa không thuộc chuyên khoa nào. */}
            <option value="">— Chưa gắn chuyên khoa —</option>
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
          {/* Panel này trước đây không có lối thoát tường minh nào — chỉ Escape (không tồn tại trên
              bàn phím ảo di động) hoặc chạm ra ngoài (không tín hiệu thị giác gợi ý), lệch chuẩn
              "luôn có hành động tường minh cho mọi thao tác, kể cả thoát" mà menu "⋯" liền kề đang
              giữ (critique 2026-09-03 lượt 6, P2). `onBatSuaTag` vốn đã là một TOGGLE (mở nếu đang
              đóng, đóng nếu đang mở — xem chỗ gọi ở LuoiMuc) nên gọi lại chính nó lúc panel đang
              mở là đóng panel, không cần thêm prop/state mới. */}
          <button
            type="button"
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            // minHeight 44 — cùng chuẩn vùng chạm tối thiểu mà checkbox chọn-nhiều (44×44) và nút
            // "⋯" (44×44) trong chính file này đang giữ; bản đầu chỉ cao 28px (padding 5px dọc),
            // đo được trên browser thật lúc polish (/impeccable polish 2026-09-03) — dưới chuẩn
            // ngay trên chính bề mặt vừa được ca ngợi vì tuân thủ 44px ở mọi nơi khác.
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44, marginTop: 8, padding: '5px 0', borderRadius: 4, border: 0, background: 'var(--c-primary-soft, #eceefa)', color: 'var(--c-primary, #2d3a94)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}
          >
            Xong
          </button>
        </div>
      )}
    </div>
  )
}
