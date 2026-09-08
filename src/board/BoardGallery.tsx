// Điểm vào DUY NHẤT cho tab Mindmap (App.tsx import component này, không còn import EdgelessBoard
// trực tiếp). Quản lý bảng nào đang mở + kỹ thuật ẩn-không-tháo khi chuyển tab khác trong app (kế
// thừa đúng lý do ResizeObserver đã đo ở hack "mount vĩnh viễn" cũ — xem
// docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ giờ CÓ unmount
// thật khi người dùng bấm quay lại danh sách, vì D4 đã đảm bảo không mất nội dung.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { doiGhiAnhXongNeuCo, type LoaiMuc, type MucMeta } from './mucMeta'
import { LuoiMuc, TheTrong, type BoardOpenOrigin, type BoLocMuc } from './LuoiMuc'
import { VoMuc, type KetQuaXuat, type XuatBangFn } from './index'
import { IconChevronBack } from '../components/IconChevronBack'
import { IDB_STORES, idbGetAll } from '../lib/idb'

export function BoardGallery({
  dangHienTab,
  moBangYeuCau,
  onMoBangYeuCauXong,
  onDangMoBang,
  onDaDoc,
  tieuDe,
  loaiTaoDuoc,
  loai,
  danhMuc,
  danhMucLoaiTru,
  chuyenKhoa,
  onQuayLai,
}: {
  dangHienTab: boolean
  moBangYeuCau?: string
  onMoBangYeuCauXong?: () => void
  /**
   * VÒNG SỬA 1 (task-2, giai đoạn 7-9) — lỗi Critical đã sửa: BoardGallery TỪNG tự gọi
   * `recordRead('muc', id)` thẳng vào localStorage ở đây, nhưng `recentReads` là STATE của App()
   * (`useState(loadRecentReads)`, chỉ đọc MỘT LẦN lúc mount) — App() không có cách nào biết
   * localStorage vừa đổi để tự render lại, nên panel "Đã đọc gần đây" ở Trang chủ đứng yên tới khi
   * NGƯỜI DÙNG TẢI LẠI TRANG. Nay BoardGallery không đụng `recentReads`/`localStorage` nữa — chỉ báo
   * lên App() "mục này vừa được mở thành công", App() tự làm đúng khuôn ba kind cũ trong navigate()
   * (`setRecentReads(recordRead('muc', id))`) — ghi và cập nhật state nằm CHUNG một chỗ.
   *
   * VÒNG SỬA 2 (task-3, giai đoạn 7-9): đổi từ optional sang BẮT BUỘC — optional nghĩa là một lượt
   * gọi `<BoardGallery>` thứ sáu (hoặc thứ N) trong App.tsx quên truyền sẽ KHÔNG bị `tsc` bắt, tái
   * diễn âm thầm đúng lỗi Critical ở VÒNG SỬA 1. CẢ NĂM lượt gọi `<BoardGallery>` thật trong App.tsx
   * đều đã truyền — mọi instance (Thư viện/Hướng dẫn/Mindmap/danhMuc/chuyên khoa) đều có thể là nơi
   * một mục `MucMeta` được mở lần đầu. Test dựng BoardGallery trần không cần ghi "Đã đọc gần đây"
   * thì truyền `onDaDoc: () => {}`.
   */
  onDaDoc: (id: string) => void
  /**
   * Báo lên App "đang có bảng mở và đang nhìn thấy nó", để App ẩn thanh điều hướng dưới (chủ dự án
   * yêu cầu 2026-09-03: dùng sơ đồ thì bỏ nav, bảng vẽ chiếm trọn màn).
   *
   * PHẢI nhân với `dangHienTab`: component này KHÔNG tháo bảng khi rời tab Mindmap (chỉ
   * `invisible pointer-events-none`, xem chỗ render bên dưới), nên `openBoardId` vẫn còn nguyên
   * khi người dùng sang tab khác. Báo `true` lúc đó là thanh nav biến mất ở MỌI tab.
   */
  onDangMoBang?: (dangMo: boolean) => void
  /** Tiêu đề màn — chuyển tiếp thẳng xuống LuoiMuc (spec §3.5, không còn viết cứng "Sơ đồ tư duy"). */
  tieuDe: string
  /** `[]` = màn này KHÔNG có nút tạo (Thư viện, màn chuyên khoa). Chuyển tiếp thẳng xuống LuoiMuc. */
  loaiTaoDuoc: LoaiMuc[]
  /**
   * Task 7 review (I2): màn "danhMuc" (mở từ ba thẻ Truy cập nhanh ở Trang chủ) không có tab riêng
   * trong thanh nav dưới VÀ không nằm trong cụm nút nổi (ThemeToggle/SpecialtyPicker — cụm đó chỉ
   * hiện cho "home"/"specialty", cố tình không mở rộng thêm ở đây để tránh nhân bản đúng lỗi chồng
   * z-50 mà I4 đang nói tới). Không có prop này thì màn "danhMuc" không có đường quay lại Trang chủ
   * nào của riêng nó — chỉ optional, các màn khác (Thư viện/Hướng dẫn/Mindmap/chuyên khoa) đều có
   * tab dưới hoặc mục "Trang chủ" trong SpecialtyPicker nên không cần. Chuyển tiếp thẳng xuống
   * LuoiMuc, render vào slot `actions` SẴN CÓ của ScreenHeader (cạnh nút "Chọn") — không sửa
   * ScreenHeader (dùng chung cho mọi màn, thay đổi lan rộng phải là một lượt riêng).
   */
  onQuayLai?: () => void
} & BoLocMuc) {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null)
  // Vị trí/góc nghiêng/ảnh xem trước của đúng thẻ vừa bấm (xem BoardOpenOrigin, LuoiMuc.tsx) —
  // null khi bảng được mở KHÔNG qua một thẻ trong lưới (vd kết quả tìm kiếm toàn app, moBangYeuCau
  // ngay dưới): không có thẻ nào để đo, chuyển cảnh rơi về .board-in cũ (scale-fade chung chung).
  const [openOrigin, setOpenOrigin] = useState<BoardOpenOrigin | null>(null)
  // Tên bảng đang mở — chỉ để đặt tên tệp khi bấm "Xuất PNG". Tách khỏi `openOrigin` (thuần hình
  // học + chuyên khoa, và null khi rect thẻ đo ra 0): tên phải sống kể cả khi không có FLIP.
  const [openTen, setOpenTen] = useState<string | null>(null)
  // Loại của mục đang mở — quyết định `index.tsx` nạp `TrangBaiViet` hay `EdgelessBoard`. Tách khỏi
  // `openOrigin` (thuần hình học, và null khi mở không qua thẻ trong lưới) vì loại PHẢI có ở mọi
  // đường mở, kể cả `moBangYeuCau` từ kết quả tìm kiếm toàn app.
  const [openLoai, setOpenLoai] = useState<LoaiMuc>('so-do')
  // true từ lúc mở một bảng tới khi EdgelessBoard báo canvas thật đã sẵn sàng (onReady) — điều khiển
  // lớp phủ ảnh xem trước (bocRef bên dưới): người dùng thấy đúng tấm ảnh của thẻ vừa bấm PHÓNG TO
  // liền mạch theo chuyển động FLIP, rồi mới mờ dần lộ ra canvas thật bên dưới, thay vì canvas trống
  // xuất hiện đột ngột không liên quan tới thẻ vừa chạm (hiến chương Mindmap, continuity bắt buộc).
  const [dangChoCanvas, setDangChoCanvas] = useState(false)
  // true từ lúc mở tới khi animation FLIP (phóng to thẻ thành khung toàn màn hình) THẬT SỰ chạy
  // xong — độc lập với dangChoCanvas. BUG THẬT đã sửa (2026-08-26, debug lượt người dùng test tay):
  // trước đây lớp phủ chỉ chờ `dangChoCanvas` (tức chờ EdgelessBoard.onReady) — nếu canvas tải
  // NHANH (chunk đã cache, đồng bộ IndexedDB tức thời, rất thường gặp), onReady bắn ra TRƯỚC KHI
  // animation FLIP (0.38s + tối đa 120ms dự phòng) kịp chạy xong, khiến lớp phủ lật/lộ canvas ngay
  // giữa chừng lúc thẻ còn đang phóng to — "ghim" xảy ra trước khi "tờ giấy" full màn hình. Lớp phủ
  // giờ chờ CẢ HAI điều kiện.
  const [dangPhongTo, setDangPhongTo] = useState(false)
  const bocRef = useRef<HTMLDivElement>(null)
  // Ảnh xem trước (hoặc null = không có, dùng nền trơn) của bảng VỪA đóng — không null trong khoảng
  // ngắn animation "gập lại" (.board-collapse, index.css) chạy TRÊN MỘT LỚP PHỦ RIÊNG, tách hẳn khỏi
  // EdgelessBoard thật (overdrive 2026-08-26, Hướng 2 "Cổng chuyển cảnh vật liệu"). CỐ Ý không giữ
  // EdgelessBoard sống lâu hơn để chờ animation — chuỗi tháo/ghi ảnh xem trước/mở lại lưới bên dưới
  // là một cuộc đua ĐÃ ĐO ĐƯỢC THẬT (xem chú thích ở nút "quay lại"), giữ nguyên timing hiện tại là
  // bắt buộc; lớp phủ này chỉ là trang trí CHẠY SONG SONG, không chặn hay trì hoãn bất cứ bước nào
  // của chuỗi đó.
  const [dangGapLai, setDangGapLai] = useState<{ chuyenKhoa?: string; id?: string; mauHue?: number } | null>(null)
  // Mở thẳng một bảng cụ thể khi được yêu cầu từ ngoài (kết quả tìm kiếm toàn app, hoặc luồng "Tạo
  // bài mới" ở Trang chủ — xem App.tsx navigate()/taoBaiVietMoi). Gọi onMoBangYeuCauXong() ngay sau
  // khi tiêu thụ để App.tsx reset state về undefined — nếu không, bấm lại ĐÚNG kết quả tìm kiếm đó
  // lần hai (cùng id, state App.tsx không đổi giá trị) sẽ không kích hoạt lại effect này (dependency
  // không đổi).
  //
  // Đợt vá cuối trước hợp nhất — C2: `dangHienTab` là điều kiện THỨ HAI bắt buộc, không chỉ
  // `moBangYeuCau`. Từ bản vá này, App.tsx nối moBangYeuCau/onMoBangYeuCauXong vào HAI instance
  // BoardGallery dùng CHUNG state đó — instance Mindmap (LUÔN mount, chỉ ẩn/hiện qua `dangHienTab`)
  // và instance màn "danhMuc" (mount CÓ ĐIỀU KIỆN, dangHienTab luôn true khi tồn tại). Khi
  // taoBaiVietMoi đặt moBangYeuCau rồi navigate("danhMuc"), CẢ HAI instance đều thấy prop này đổi
  // trong cùng một lượt render — thiếu guard này, instance Mindmap (dù đang ẩn) cũng sẽ tự mở bài
  // viết vừa tạo vào lưới sơ đồ của nó (gọi onMoBangYeuCauXong hai lần, và để lại `openBoardId` treo
  // trong instance Mindmap — lần sau người dùng mở tab Mindmap thật sẽ thấy nhầm bài viết đó thay vì
  // lưới sơ đồ). Guard theo `dangHienTab` đảm bảo CHỈ instance đang thật sự hiển thị tại thời điểm
  // này mới tiêu thụ — đúng một lần, đúng instance.
  useEffect(() => {
    if (!moBangYeuCau || !dangHienTab) return
    // Mở từ kết quả tìm kiếm toàn app — không có thẻ nào trong lưới để đo rect, nên KHÔNG có origin
    // FLIP (rơi về .board-in scale-fade cũ, xem className của lớp bọc canvas bên dưới).
    setOpenOrigin(null)
    setDangPhongTo(true)
    // Đường này KHÔNG đi qua một thẻ trong lưới (khác onMoBang bên dưới, đã tự mang `loai` của bản
    // ghi từ Task 5) — phải tự tra `loai` trong store trước khi mở, vì đọc loại TRƯỚC khi mở: mở
    // nhầm vỏ rồi sửa sau nghĩa là tháo/lắp lại cả cây Lit (EdgelessBoard hay TrangBaiViet).
    void idbGetAll<MucMeta>(IDB_STORES.mucs).then((ds) => {
      const tim = ds.find((m) => m.id === moBangYeuCau)
      setOpenLoai(tim?.loai ?? 'so-do')
      setOpenBoardId(moBangYeuCau)
      // Chỉ báo "Đã đọc gần đây" khi bản ghi THẬT SỰ tồn tại trong kho — id không tìm thấy (đã bị
      // xoá giữa lúc điều hướng) thì không đáng ghi, chỉ làm rác danh sách với một mục không bao
      // giờ tra được tiêu đề (xem recentReadItems, App.tsx).
      if (tim) onDaDoc(moBangYeuCau)
    })
    onMoBangYeuCauXong?.()
  }, [moBangYeuCau, onMoBangYeuCauXong, dangHienTab, onDaDoc])
  // true trong khoảng ngắn giữa lúc bấm "quay lại" và lúc lưới danh sách THẬT SỰ được phép mount —
  // xem chú thích dài ở nút "quay lại" bên dưới để hiểu vì sao cần một cờ riêng thay vì mount
  // LuoiMuc NGAY khi openBoardId về null.
  const [dangDong, setDangDong] = useState(false)
  // "vừa đóng một bảng" — cho LuoiMuc biết để chạy .board-out đúng MỘT lần khi nó tái xuất
  // hiện. KHÔNG dùng chung với dangDong (dangDong canh cuộc đua ảnh xem trước, không liên quan
  // animation) — hai mối quan tâm tách biệt dù cùng bật/tắt gần nhau trong thời gian.
  const [vuaDongBang, setVuaDongBang] = useState(false)

  // ─── Xuất PNG từ MÀN VẼ ─────────────────────────────────────────────────────────────────────
  // EdgelessBoard đẩy lên một `XuatBangFn` khi cây Lit gắn xong (đủ `std` + host để dựng ảnh) và
  // `null` khi tháo. Giữ trong ref để `chayXuat` luôn gọi bản mới nhất mà không cần vào deps; một
  // cờ state riêng để nút biết khi nào bật.
  const xuatRef = useRef<XuatBangFn | null>(null)
  const [xuatSanSang, setXuatSanSang] = useState(false)
  const [dangXuat, setDangXuat] = useState(false)
  const [thongBaoXuat, setThongBaoXuat] = useState<string | null>(null)
  const nhanXuatSanSang = useCallback((fn: XuatBangFn | null) => {
    xuatRef.current = fn
    setXuatSanSang(Boolean(fn))
  }, [])
  // Dòng kết quả tự tắt sau ~4s — KHÔNG đếm giờ trong lúc đang xuất ("Đang dựng ảnh…" là tín hiệu
  // tiến trình, tắt giữa chừng thì người dùng tưởng thao tác trượt).
  useEffect(() => {
    if (!thongBaoXuat || dangXuat) return
    const id = setTimeout(() => setThongBaoXuat(null), 4000)
    return () => clearTimeout(id)
  }, [thongBaoXuat, dangXuat])
  // Đổi bảng / đóng bảng: dọn mọi trạng thái xuất của bảng cũ.
  useEffect(() => {
    setDangXuat(false)
    setThongBaoXuat(null)
  }, [openBoardId])
  const chayXuat = async () => {
    const xuat = xuatRef.current
    if (!xuat || dangXuat) return
    setDangXuat(true)
    setThongBaoXuat('Đang dựng ảnh…')
    // Nhường một nhịp macrotask cho React sơn xong LỚP CHE trước khi lượt xuất có thể dời khung
    // nhìn. Thiếu nhịp này thì lớp che tới sau cú nhảy — đúng thứ nó sinh ra để giấu.
    await new Promise((r) => setTimeout(r, 0))
    try {
      const kq: KetQuaXuat = await xuat(openTen ?? 'so-do')
      setThongBaoXuat(
        kq === 'trong'
          ? 'Sơ đồ chưa có nội dung để xuất.'
          : kq === 'dang-ban'
            ? 'Đang có một lượt xuất khác chạy dở.'
            : kq === 'xong-thieu-the-ghi-chu'
              ? 'Đã xuất PNG — nét vẽ và hình khối. Thẻ ghi chú chưa vào được ảnh.'
              : null,
      )
    } catch (loi) {
      console.error('Xuất PNG thất bại:', loi)
      setThongBaoXuat('Không xuất được ảnh. Hãy thử lại.')
    } finally {
      setDangXuat(false)
    }
  }

  // Chạy kỹ thuật FLIP: đo rect THẬT của lớp bọc canvas (bocRef) ngay khi nó vừa mount (trước khi
  // trình duyệt sơn khung hình kế tiếp — useLayoutEffect, không phải useEffect), rồi đặt các biến
  // CSS lệch/thu nhỏ đúng bằng khoảng cách từ vị trí thẻ (openOrigin) tới vị trí đích, để animation
  // "First" khớp CHÍNH XÁC hình dạng/vị trí thẻ vừa bấm thay vì một cú phóng chung chung không neo
  // vào đâu (critique 2026-08-26 P1, hiến chương Mindmap: continuity là "mandatory").
  useLayoutEffect(() => {
    if (!openBoardId || !openOrigin || !bocRef.current) return
    const el = bocRef.current
    const dich = el.getBoundingClientRect()
    if (dich.width === 0 || dich.height === 0) return
    const scaleX = openOrigin.width / dich.width
    const scaleY = openOrigin.height / dich.height
    const dx = openOrigin.left + openOrigin.width / 2 - (dich.left + dich.width / 2)
    const dy = openOrigin.top + openOrigin.height / 2 - (dich.top + dich.height / 2)
    el.style.setProperty('--flip-x', `${dx}px`)
    el.style.setProperty('--flip-y', `${dy}px`)
    el.style.setProperty('--flip-sx', String(scaleX))
    el.style.setProperty('--flip-sy', String(scaleY))
    el.style.setProperty('--flip-tilt', `${openOrigin.tilt}deg`)
    el.classList.add('board-flip-start')
    // Buộc reflow để trình duyệt GHI NHẬN trạng thái đầu (transform co về đúng vị trí/kích thước
    // thẻ) trước khi lớp -run bật transition ở khung hình kế tiếp — thiếu bước này, hai lớp có thể
    // vào cùng một batch style recalculation và trình duyệt bỏ qua thẳng luôn trạng thái đầu.
    void el.offsetWidth
    // requestAnimationFrame KHÔNG chạy khi tab đang ở nền/document ẩn (Page Visibility — trình
    // duyệt tạm dừng vòng lặp render lúc đó) — hiếm nhưng có thể thật (người dùng bấm mở bảng đúng
    // lúc app bị đưa xuống nền). setTimeout dự phòng đảm bảo lớp -run vẫn được thêm (classList.add
    // là idempotent, an toàn nếu cả hai cùng chạy) để chuyển cảnh không kẹt mãi ở khung hình đầu.
    let daThem = false
    const them = () => {
      if (daThem) return
      daThem = true
      el.classList.add('board-flip-run')
    }
    const rafId = requestAnimationFrame(them)
    const timerId = setTimeout(them, 120)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timerId)
    }
  }, [openBoardId, openOrigin])

  // Lưới an toàn cho dangPhongTo — phòng khi transitionend/animationend không bắn (phần tử bị ẩn/
  // tháo giữa chừng do chuyển tab, hoặc trình duyệt bỏ qua sự kiện) khiến lớp phủ kẹt mãi không lộ
  // canvas. 600ms > cả hai đường (FLIP 0.38s+120ms dự phòng, hoặc .board-in 0.2s) một biên an toàn
  // rộng rãi.
  useEffect(() => {
    if (!openBoardId || !dangPhongTo) return
    const id = setTimeout(() => setDangPhongTo(false), 600)
    return () => clearTimeout(id)
  }, [openBoardId, dangPhongTo])

  // Dòng "vẫn đang tải" cho màn chờ mở bảng — chỉ bật sau một ngưỡng dài hơn hẳn thời lượng bình
  // thường (~2,5s, xem TheTrong/VeChuyenKhoaDangTai), để không nhấp nháy trên đường tải nhanh thông
  // thường. Không có nhánh này thì mạng yếu/thiết bị cũ/lần mở đầu chưa cache chunk BlockSuite chỉ
  // thấy hoạt ảnh trang trí lặp vô hạn, không cách nào phân biệt "đang tải" với "đã treo" (critique
  // 2026-09-01, P2).
  // Báo trạng thái "đang xem một bảng" lên App. Effect chứ không gọi thẳng trong render: đây là
  // tác dụng phụ ra ngoài component. Dọn về `false` khi tháo, nếu không thanh nav mất vĩnh viễn khi
  // App tháo BoardGallery lúc bảng còn mở.
  const dangXemBang = openBoardId !== null && dangHienTab
  useEffect(() => {
    onDangMoBang?.(dangXemBang)
    return () => onDangMoBang?.(false)
  }, [dangXemBang, onDangMoBang])

  const [choLau, setChoLau] = useState(false)
  useEffect(() => {
    if (!openBoardId || !(dangChoCanvas || dangPhongTo)) {
      setChoLau(false)
      return
    }
    const id = setTimeout(() => setChoLau(true), 4500)
    return () => clearTimeout(id)
  }, [openBoardId, dangChoCanvas, dangPhongTo])

  return (
    <>
      {!openBoardId && !dangDong && dangHienTab && (
        <LuoiMuc
          onMoBang={(id, origin, ten, loaiMoi) => {
            setOpenOrigin(origin ?? null)
            setOpenTen(ten ?? null)
            // `bang.loai` luôn có giá trị thật ở đường mở-qua-thẻ (LuoiMuc.tsx truyền thẳng từ
            // MucMeta, trường bắt buộc) — fallback 'so-do' chỉ phòng hờ kiểu optional của tham số.
            setOpenLoai(loaiMoi ?? 'so-do')
            setDangChoCanvas(true)
            setDangPhongTo(true)
            setOpenBoardId(id)
            // Báo "Đã đọc gần đây" — đường DUY NHẤT người dùng dùng để mở một mục qua bấm thẻ trong
            // lưới, luôn ứng với một bản ghi có thật (LuoiMuc chỉ gọi callback này từ .map() trên
            // `danhSach` đã nạp từ IndexedDB), khác effect moBangYeuCau ở trên phải tự tra lại vì
            // không đi qua một thẻ nào.
            onDaDoc(id)
          }}
          dungTuBang={vuaDongBang}
          onHieuUngXong={() => setVuaDongBang(false)}
          // Từ Task 5: BoardGallery không còn viết cứng tiêu đề/bộ lọc — mọi màn dùng chung vỏ này
          // (Mindmap, Thư viện, chuyên khoa sau này) tự truyền qua props riêng của mình.
          tieuDe={tieuDe}
          loaiTaoDuoc={loaiTaoDuoc}
          loai={loai}
          danhMuc={danhMuc}
          danhMucLoaiTru={danhMucLoaiTru}
          chuyenKhoa={chuyenKhoa}
          onQuayLai={onQuayLai}
        />
      )}
      {/* Lớp phủ "gập lại" — RENDER NGOÀI {openBoardId && ...} nên vẫn sống tiếp sau khi openBoardId
          đã về null (canvas thật đã tháo thật sự, đúng timing cũ). Chỉ trang trí, aria-hidden. */}
      {dangGapLai && (
        <div className="absolute inset-0 board-collapse pointer-events-none" aria-hidden="true">
          {/* Huy hiệu chuyên khoa trên nền giấy — ĐÚNG thứ thẻ trong lưới đang hiện, nên cú gập
              lại hạ cánh khớp với ô mà nó gập về. Trước 2026-08-30 chỗ này vẽ `anhXemTruoc` (ảnh
              chụp khung nhìn); ảnh đó đã bị gỡ khỏi thẻ nên giữ lại ở đây là gập về một hình mà
              lưới không còn hiện. */}
          {/* `mind-giay-day` (index.css) — CÙNG mặt giấy với .mind-note-card của thẻ trong lưới, xem
              chú thích dài tại class đó. Trước 2026-09-03 chỗ này tô `--c-surface-alt`, token bề mặt
              vỏ app LẬT theo chủ đề, nên cú gập đọc hoàn toàn khác nhau ở hai bản. */}
          <div className="absolute inset-0 mind-giay-day">
            <TheTrong khoa={dangGapLai.chuyenKhoa} id={dangGapLai.id} mauHue={dangGapLai.mauHue} />
          </div>
        </div>
      )}
      {openBoardId && (
        <div
          key={openBoardId}
          ref={bocRef}
          data-testid="boc-bang"
          className={`absolute inset-0 ${openOrigin ? '' : 'board-in'}${dangHienTab ? '' : ' invisible pointer-events-none'}`}
          inert={!dangHienTab}
          // Đánh dấu FLIP/scale-fade đã chạy XONG THẬT (không phải suy đoán) — bắt cả hai đường:
          // .board-flip-run dùng CSS transition (transitionend), .board-in dùng CSS animation
          // (animationend). e.target === e.currentTarget lọc bỏ sự kiện nổi bọt từ con (nút PNG/PDF,
          // ảnh phủ... cũng có thể có transition/animation riêng).
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === 'transform') setDangPhongTo(false)
          }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setDangPhongTo(false)
          }}
        >
          <VoMuc
            boardId={openBoardId}
            loai={openLoai}
            khoa={openOrigin?.chuyenKhoa}
            onReady={() => setDangChoCanvas(false)}
            onXuatSanSang={nhanXuatSanSang}
          />
          {/* Lớp phủ mặt thẻ vừa bấm — che canvas trống/màn "Đang mở bảng…" cho tới khi CẢ HAI đều
              xong: EdgelessBoard báo sẵn sàng thật (onReady/dangChoCanvas) VÀ animation phóng to thẻ
              đã chạy hết (dangPhongTo) — thiếu điều kiện thứ hai, canvas tải nhanh sẽ lộ ra giữa
              chừng lúc thẻ còn đang phóng to (bug thật, debug 2026-08-26: "full tờ giấy trước, rồi
              mới tới ghim").
              Từ 2026-08-30 phủ bằng huy hiệu chuyên khoa thay cho `anhXemTruoc`: thẻ trong lưới giờ
              LUÔN là huy hiệu, nên đây mới là hình khớp với thứ vừa được bấm. Đổi lại lớp phủ hiện
              cho MỌI bảng mở qua thẻ, kể cả bảng mới tạo — nhánh "không có gì để phủ" cũ chỉ tồn tại
              vì bảng chưa mở lần nào thì chưa có ảnh chụp, một giới hạn không còn nữa.
              `openOrigin &&` (không phải `openOrigin?.chuyenKhoa &&`): bảng chưa gắn chuyên khoa vẫn
              cần được phủ — TheTrong đã tự lo icon "trang giấy" mặc định cho khoa undefined. */}
          {openOrigin && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 mind-giay-day board-flip-cover${dangChoCanvas || dangPhongTo ? '' : ' board-flip-cover-hide'}`}
            >
              {/* dangVe: lớp phủ này che trọn màn chờ bên dưới (đo được 2,5s ở opacity 1), nên
                  chính nó phải là thứ đang vẽ — xem TheTrong. Lớp phủ "gập lại" lúc ĐÓNG ở trên
                  KHÔNG bật cờ này: cú gập chỉ 260ms. */}
              <TheTrong khoa={openOrigin.chuyenKhoa} id={openOrigin.id} mauHue={openOrigin.mauHue} dangVe />
              {/* Dòng "vẫn đang tải" — chỉ bật sau 4,5s (choLau ở trên), cho mạng yếu/thiết bị cũ/
                  lần mở đầu chưa cache chunk BlockSuite một tín hiệu phân biệt với "đã treo".
                  role="status" để người dùng đọc màn hình cũng nghe được, không chỉ thấy chữ.
                  Màu là MỰC TRÊN GIẤY (`--c-on-note-muted`), không phải `--c-text-muted`: lớp phủ
                  này giờ là mặt giấy (`mind-giay-day`), và `--c-text-muted` lật sang #888eb8 SÁNG ở
                  bản tối — đặt lên giấy sáng còn ~1,9:1, không đọc được. `--c-on-note-muted` khai
                  đúng một lần ở :root nên giữ 5,9:1 (giấy bản sáng) / 5,2:1 (giấy bản tối). */}
              {choLau && (
                <p
                  role="status"
                  style={{
                    position: 'absolute',
                    top: 'calc(50% + 15%)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    margin: 0,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--c-on-note-muted, #5c5f7a)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Đang tải sơ đồ… có thể mất thêm chút thời gian ở lần mở đầu.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            data-testid="quay-lai"
            onClick={async () => {
              // Bật lớp phủ "gập lại" (overlay riêng, xem JSX phía trên) — KHÔNG await gì ở đây, để
              // chuỗi tháo/ghi/mở lại lưới ngay bên dưới chạy ĐÚNG TIMING CŨ (đã được canh bằng ca
              // kiểm thật: ảnh xem trước phải hiện NGAY khi lưới mount lại, không được trễ thêm một
              // khoảng tuỳ ý vì một hiệu ứng trang trí). Overlay tự dọn mình bằng setTimeout riêng,
              // không giao tiếp gì với chuỗi bên dưới (overdrive 2026-08-26, Hướng 2).
              const giamChuyenDong =
                typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
              setDangGapLai({ chuyenKhoa: openOrigin?.chuyenKhoa, id: openOrigin?.id, mauHue: openOrigin?.mauHue })
              setTimeout(() => setDangGapLai(null), giamChuyenDong ? 10 : 260)

              // Tháo EdgelessBoard TRƯỚC (kích hoạt cleanup effect của nó — nơi bắt đầu lượt ghi ảnh
              // xem trước, xem EdgelessBoard.tsx), nhưng CHƯA cho LuoiMuc mount lại ngay: cờ
              // `dangDong` giữ cả hai nhánh vắng mặt (màn hình trống một nhịp rất ngắn) để tránh
              // đúng cuộc đua đã đo được — nếu LuoiMuc mount CÙNG một lượt commit với việc
              // EdgelessBoard unmount, lượt đọc-lúc-mount của nó hầu như luôn xong TRƯỚC lượt ghi
              // (đọc đơn so với đọc-rồi-ghi), nên thẻ hiện bản ghi CŨ mãi tới lần mount SAU.
              setDangDong(true)
              setVuaDongBang(true)
              setOpenBoardId(null)
              setOpenOrigin(null)
              setOpenTen(null)

              // Nhường một nhịp macrotask cho React thật sự CHẠY cleanup effect vừa lên lịch ở trên
              // (passive effect — không chạy đồng bộ ngay sau setState). `setTimeout(0)` chứ không
              // phải một microtask (`Promise.resolve()`): việc React lên lịch passive effect qua
              // Scheduler dùng cơ chế ưu tiên CAO hơn setTimeout thường (MessageChannel ở trình
              // duyệt thật) nên effect đó gần như chắc chắn đã chạy xong trước khi callback
              // setTimeout(0) này của ta được gọi.
              await new Promise((r) => setTimeout(r, 0))
              // Giờ mới đợi lượt ghi (nếu cleanup ở trên đã kích hoạt một lượt) — có hạn giờ riêng
              // (xem mucMeta.ts), không chặn vô thời hạn nếu việc ghi có vấn đề.
              await doiGhiAnhXongNeuCo()
              setDangDong(false)
            }}
            aria-label="Quay lại danh sách bảng"
            className="mind-focus-ring"
            // 44×44 (chuẩn tối thiểu cho ngón tay) — cũ 36×36 dưới mức khuyến nghị, xem critique
            // mục "Vùng chạm dưới chuẩn". Đây là một nút tròn thật (có nền/bóng), khác nút "⋯" của
            // LuoiMuc.tsx (chỉ ba dấu chấm, không nền) — phóng to cả hình tròn thấy được luôn,
            // không cần tách vùng chạm khỏi vùng thị giác.
            // Shadow đổi từ rgba(0,0,0,.2) trần sang --c-shadow/--c-shadow-glow (critique
            // 2026-08-25, mục "Chrome chung chung phá vỡ ảo giác vật liệu").
            //
            // VIỀN: từng là mực magenta nhạt của Mindmap (--c-accent-2, 0.25) để nút thuộc bộ nhận
            // diện Mindmap. GỠ 2026-09-04 theo chủ dự án: trên một nút chrome, magenta đọc thành ĐỎ
            // — tức thành màu cảnh báo, đúng thứ "Untouchable Signal Rule" (DESIGN.md) giữ riêng cho
            // tín hiệu nguy hiểm. Nay là --c-line, đúng hairline trung tính mà mọi bề mặt có viền
            // khác của app (kể cả nút nổi ThemeToggle) dùng, nên tự ra sáng/tối đúng bản.
            // KHÔNG bỏ viền hẳn: hai nút này nổi trên canvas có nền bất định (giấy trắng, canvas
            // tối, nét vẽ màu) — bỏ viền thì chỉ còn đổ bóng để tách, mà bóng tan biến trên nền tối
            // hoặc nền rối. Nhận diện Mindmap vẫn còn nguyên ở --c-shadow-glow.
            style={{
              position: 'absolute',
              // calc(var(--safe-top)+4px), KHÔNG 4px trần — trên iPhone có tai thỏ/Dynamic Island,
              // 4px trần đặt nút NGAY DƯỚI status bar nên phần vòng tròn phía trên bị viền cong của
              // khung máy/status bar đè lên, đọc thành "xén góc" (phản hồi thật 2026-08-27, test tay
              // trên iPhone) — ĐÚNG lớp lỗi mà --safe-top (index.css) đã được lập ra để mọi màn khác
              // tránh. calc(var(--safe-left)+4px) cùng lý do trên trục ngang — vá xong cạnh trên vẫn
              // còn "bị cắt xén bên trái" (phản hồi thật 2026-08-27, lần 3, cũng test trên iPhone):
              // nút nằm sát mép trái tuyệt đối, không chừa gì cho viền bo góc vật lý của màn hình
              // hoặc notch lệch cạnh khi xoay ngang — --safe-left (index.css, mới thêm) resolve về
              // 0px trên máy không cần bù, nên hành vi cũ (left:4) vẫn giữ nguyên ở đa số trường hợp.
              // left nhích thêm 5px (4→9, 2026-08-28, phản hồi thật: "quá sát màn hình") — trên máy
              // không cần bù (--safe-left=0) đây là toàn bộ khoảng cách thật tới mép trái.
              top: 'calc(var(--safe-top, 0px) + 4px)',
              left: 'calc(var(--safe-left, 0px) + 9px)',
              zIndex: 20,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid var(--c-line, #d9ddf4)',
              background: 'var(--c-surface, #fff)',
              boxShadow: '0 1px 4px var(--c-shadow), var(--c-shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* IconChevronBack (src/components/) — cùng icon với icons.back của App.tsx (mọi nút
                quay lại khác của app), dùng chung qua import thay vì chép tay path SVG (critique
                2026-09-01, P3: bản chép tay cũ không có tín hiệu biên dịch nào nếu bản gốc đổi). */}
            <IconChevronBack style={{ width: 20, height: 20 }} />
          </button>

          {/* Nút "Xuất PNG" — CHẤM TRÒN đối xứng nút quay lại qua trục dọc giữa màn: cùng `top`,
              cùng 44×44/bo tròn/viền/nền/bóng, chỉ đổi `left` → `right` (dùng --safe-right cho iPhone
              xoay ngang, cùng lý do --safe-left ở nút back). Icon là glyph "xuất/tải lên" (khay hở
              nắp + mũi tên chỉ lên) vẽ CÙNG NGÔN NGỮ với chevron của nút back: stroke, 24-grid,
              strokeWidth 2, currentColor, đầu nét bo tròn — nên hai nút đọc thành một cặp. Màu tự
              đúng dark/light qua currentColor + token nền/viền dùng chung. */}
          <button
            type="button"
            data-testid="xuat-anh"
            onClick={chayXuat}
            disabled={!xuatSanSang || dangXuat}
            aria-disabled={!xuatSanSang || dangXuat}
            aria-label="Xuất PNG sơ đồ"
            className="mind-focus-ring"
            style={{
              position: 'absolute',
              top: 'calc(var(--safe-top, 0px) + 4px)',
              right: 'calc(var(--safe-right, 0px) + 9px)',
              zIndex: 20,
              width: 44,
              height: 44,
              borderRadius: '50%',
              // Hairline trung tính, KHÔNG phải mực magenta của Mindmap — xem chú thích ở nút quay lại.
              border: '1px solid var(--c-line, #d9ddf4)',
              background: 'var(--c-surface, #fff)',
              boxShadow: '0 1px 4px var(--c-shadow), var(--c-shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !xuatSanSang || dangXuat ? 0.5 : 1,
              cursor: dangXuat ? 'wait' : !xuatSanSang ? 'default' : 'pointer',
              transition: 'opacity .15s ease',
            }}
          >
            {dangXuat ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="animate-spin" style={{ width: 20, height: 20 }} aria-hidden="true">
                <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l4-4 4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11" />
              </svg>
            )}
          </button>

          {/* Nhãn tên bảng đang mở — định hướng nhẹ. Mọi thẻ trong lưới mang icon CHUYÊN KHOA chứ
              không mang danh tính bảng (chủ dự án chốt GIỮ mặt thẻ icon — critique 2026-09-03 P1),
              và khi bảng đã mở thì chrome CHỈ có hai nút tròn quay-lại/xuất, không tên/breadcrumb —
              một cú chạm nhầm thẻ chỉ phát hiện được bằng cách đọc nội dung canvas (critique
              2026-09-03 P3). Pill này nằm giữa hai nút, cùng `top`, mờ hẳn sau ~3s (.board-title-fade
              ở index.css) như tiêu đề video để không tranh chỗ với canvas lâu dài. pointer-events
              none: không bao giờ chặn thao tác canvas bên dưới. aria-hidden: nhắc lại thị giác thuần
              tuý, người dùng trình đọc màn hình định hướng thẳng trên canvas. Chỉ render khi mở qua
              một thẻ (onMoBang truyền `ten` → openTen); mở từ kết quả tìm toàn app không có tên để
              hiện, chấp nhận được. */}
          {openTen && (
            <div
              aria-hidden="true"
              className="board-title-fade"
              style={{
                position: 'absolute',
                top: 'calc(var(--safe-top, 0px) + 11px)',
                left: 'calc(var(--safe-left, 0px) + 61px)',
                maxWidth: 'calc(100% - var(--safe-left, 0px) - var(--safe-right, 0px) - 122px)',
                zIndex: 19,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                borderRadius: 999,
                background: 'var(--c-surface, #fff)',
                border: '1px solid var(--c-line, #d9ddf4)',
                boxShadow: '0 1px 4px var(--c-shadow), var(--c-shadow-glow)',
                pointerEvents: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--c-text, #12142b)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {openTen}
            </div>
          )}
          {/* LỚP CHE suốt lượt xuất. Khi còn thẻ ghi chú chưa render (bị cull vì nằm ngoài khung),
              lượt xuất phải fit khung nhìn rồi trả lại — bảng thu nhỏ hết cỡ rồi nhảy về, đọc
              thành "màn hình cứ nhấp nháy" (phản hồi thật 2026-08-31). Lớp này ĐỤC (không phải mờ)
              nên cú nhảy đó không lọt ra ngoài; nó cũng chặn thao tác trong lúc đang đọc DOM.
              Dưới hai nút tròn (z 20) để nút xuất vẫn thấy được trạng thái đang chạy. */}
          {dangXuat && (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 12, background: 'var(--c-surface, #fff)' }}
            >
              <span
                className="text-[12.5px] font-semibold"
                style={{ color: 'var(--c-text-muted, #6b6e96)' }}
              >
                Đang dựng ảnh…
              </span>
            </div>
          )}

          {/* Dòng kết quả xuất — cùng token/hình dạng dải "Hoàn tác" của LuoiMuc (--c-toast-*,
              bottom 10, left/right 12, rounded-2xl). Không nút hành động, không thanh đếm. */}
          {thongBaoXuat && (
            <div
              role="status"
              aria-live="polite"
              className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl overflow-hidden"
              style={{ left: 12, right: 12, bottom: 10, zIndex: 40, background: 'var(--c-toast-surface, rgba(15,23,42,.94))' }}
            >
              <span className="flex-1 text-[12.5px] leading-snug" style={{ color: 'var(--c-toast-text, #f4f6fb)' }}>
                {thongBaoXuat}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
