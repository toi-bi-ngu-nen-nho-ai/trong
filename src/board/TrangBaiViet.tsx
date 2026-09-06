// Vỏ React cho CHẾ ĐỘ TRANG. Song sinh mỏng của EdgelessBoard.tsx — cùng cơ chế mount (React giữ
// một thẻ div; BlockStdScope dựng cây Lit rồi Lit render vào đó), cùng `mo-doc.ts`, cùng theme
// watcher, cùng cách đếm thay đổi nội dung để bump `capNhatLuc`.
//
// KHÁC edgeless đúng năm điểm, tất cả đều cố ý:
//   1. `layExtensionsTrang()` thay `layExtensionsEdgeless()`
//   2. KHÔNG có `laKhungHep()`/`theoDoiKhungHep()` — bài viết sửa được ở MỌI bề ngang (quyết định
//      của chủ dự án 2026-09-04). Gõ chữ trên điện thoại là chuyện bình thường, khác hẳn vẽ sơ đồ.
//   3. KHÔNG cần dong-bo-toa-do-viewport / viewport-ios / xep-o-tu-dong — đều là chuyện của canvas.
//   4. `noiDungTimKiem` chỉ lấy từ `trichVanBanTuKhoi(store.root)`; trang không có
//      `surface.elementModels` mang chữ nên `trichVanBanTuCanvas` vô nghĩa ở đây.
//   5. Tự dựng `<doc-title>` (Task 10) — EdgelessBoard.tsx không cần, canvas không có "tiêu đề bài
//      viết" theo nghĩa này. Xem chú thích tại chỗ dựng bên dưới.
//   6. Lúc RỜI trang, trích tiêu đề từ `store.root.props.title` và truyền vào
//      `capNhatSauKhiRoiMuc()` làm `tenMoi` (giai đoạn 5-6) — CHỈ file này truyền tham số đó.
//      EdgelessBoard.tsx tuyệt đối không, vì tên sơ đồ do người dùng tự đặt qua ô đổi tên tại chỗ
//      ở lưới, không phải nội dung canvas.
import { BlockStdScope } from '@blocksuite/affine/std'
import { html, render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'
import { ganMoiBanPhimIOS } from './ban-phim-ios'
import { layExtensionsTrang } from './extensions'
import { taoHoacMoDoc } from './mo-doc'
import { capNhatSauKhiRoiMuc, ghepNoiDungTimKiem, trichVanBanTuKhoi } from './mucMeta'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'

import '../../.vendor-build/theme/style.css'
import './cau-noi-thuong-hieu.css'
// Chỉ chế độ trang cần: `doc-title` (và placeholder "Title" của nó) không tồn tại ở bảng vẽ.
import './dich-placeholder-trang.css'

export function TrangBaiViet({
  docId,
  khoa,
  onReady,
}: {
  docId: string
  khoa?: string
  onReady?: () => void
}) {
  const boc = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)
  // true khi taoHoacMoDoc() phải rơi về workspace chỉ-trong-bộ-nhớ (cùng lý do/phạm vi cờ này ở
  // EdgelessBoard.tsx) — hiện băng cảnh báo thay vì im lặng để bác sĩ mất một bài đang gõ mà không
  // biết. Bài viết là chữ người dùng gõ tay; mất âm thầm còn tệ hơn mất một sơ đồ.
  const [khongLuuDuoc, setKhongLuuDuoc] = useState(false)

  useEffect(() => {
    const el = boc.current
    if (!el) return

    let daThao = false
    let ws: { forceStop: () => void } | null = null
    // Giữ `store` ở biến trong closure để hàm dọn dẹp còn đọc được nội dung TRƯỚC khi tháo cây Lit
    // — cùng cách EdgelessBoard.tsx làm.
    let storeHienTai: Awaited<ReturnType<typeof taoHoacMoDoc>>['store'] | null = null
    let boWatchTheme: (() => void) | undefined
    let boBanPhim: (() => void) | undefined
    let boTheoDoiKhoi: (() => void) | undefined
    let coThayDoiNoiDung = false

    taoHoacMoDoc(docId, 'bai-viet')
      .then(({ workspace, store, khongLuuDuoc: khongLuuDuocKetQua }) => {
        if (daThao) {
          workspace.forceStop()
          return
        }
        ws = workspace
        storeHienTai = store

        // KHÔNG đặt `store.readonly` — xem điểm 2 ở đầu file.
        const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
        // `DocTitleViewExtension` là FRAGMENT (xem extensions.ts): bật extension chỉ đăng ký thẻ
        // Lit `<doc-title>`, KHÔNG có gì tự mount nó — ở AFFiNE thật, app chủ tự đặt thẻ này quanh
        // EditorHost, còn cây vendored/EditorHost thì không (spec §6.3). Nên tự dựng ở đây, NGAY
        // TRƯỚC `std.render()` trong CÙNG một cây Lit (một lời gọi `litRender` duy nhất) — không
        // tách container riêng — để `<doc-title>` nằm bên trong `el` và `.closest('.drt-page-viewport')`
        // của nó (xem doc-title.ts) khớp đúng CHÍNH `el`, cùng phần tử mà EditorHost dùng, không cần
        // thêm lớp bọc riêng. `.doc=${store}` gán bằng thuộc tính JS (không phải attribute HTML) —
        // đúng cách trường `doc` của DocTitle khai (`@property({attribute: false})`, kiểu `Store`,
        // xem fragments/doc-title/src/doc-title.ts trong cây vendored) đòi hỏi.
        litRender(html`<doc-title .doc=${store}></doc-title>${std.render()}`, el)

        // Chỉ đếm sự kiện CỤC BỘ (do người dùng gõ), bỏ qua lượt đồng bộ/hydrate — cùng luật đã
        // dùng cho bảng vẽ, để "mở ra xem rồi thoát" không làm nhãn "cập nhật lần cuối" nhảy.
        const dangKy = store.slots.blockUpdated.subscribe((e: { isLocal?: boolean }) => {
          if (e.isLocal) coThayDoiNoiDung = true
        })
        boTheoDoiKhoi = () => dangKy.unsubscribe()

        el.dataset.theme = resolveTheme()
        boWatchTheme = watchResolvedTheme(() => {
          el.dataset.theme = resolveTheme()
        })
        boBanPhim = ganMoiBanPhimIOS(el)

        setKhongLuuDuoc(khongLuuDuocKetQua)
        setDangMo(false)
        onReady?.()
      })
      .catch((loi) => {
        // Cùng bảo vệ như nhánh `.then()` ngay trên và như song sinh `EdgelessBoard.tsx:380`
        // (`if (huyBo) return`): component có thể đã tháo trong lúc `taoHoacMoDoc()` còn chạy. React
        // 18 không ném khi setState sau unmount, nên đây không phải lỗi — nhưng thiếu nó thì một
        // lượt huỷ đúng lúc mở lỗi vẫn ghi một dòng `console.error` cho màn hình không còn ai xem,
        // và lời hứa "tháo rồi thì không làm gì nữa" của effect này thành nửa vời.
        if (daThao) return
        console.error('Không mở được bài viết:', loi)
        setDangMo(false)
      })

    return () => {
      daThao = true
      // Trích nội dung tìm kiếm TRƯỚC khi tháo cây Lit và dừng workspace — sau đó `store.root`
      // không còn đọc được.
      let noiDungTimKiem: string | undefined
      try {
        const goc = storeHienTai?.root
        if (goc) noiDungTimKiem = ghepNoiDungTimKiem(trichVanBanTuKhoi(goc), '')
      } catch {
        // Trích văn bản là tiện ích phụ (phục vụ tìm kiếm) — lỗi ở đây không được làm hỏng lượt cập
        // nhật metadata hay thao tác rời bài viết của người dùng. Để `noiDungTimKiem` ở nguyên
        // `undefined` (KHÔNG gán '') — capNhatSauKhiRoiMuc/mucMeta.ts ghi
        // `noiDungTimKiemMoi ?? hienCo.noiDungTimKiem ?? ''`, `??` chỉ rơi qua giá trị cũ khi vế
        // trái là null/undefined; gán '' ở đây từng xoá sạch chữ đã lưu vì '' là một giá trị THẬT.
      }
      // Trích TIÊU ĐỀ từ `<doc-title>` (điểm khác biệt 6 ở đầu file) — nguồn thật là
      // `store.root.props.title`, một `Text` (Y.Text) của BlockSuite, CÙNG trường mà
      // `DocTitle`/`RootBlockModel` (cây vendored, root-block-model.ts) đọc/ghi. `store.root` gõ
      // kiểu `BlockModel<object>` (tham số Props mặc định `object`) nên `.props.title` không lên
      // kiểu được — ép qua một kiểu tối thiểu tại chỗ, cùng tinh thần `KhoiCoTheCoChu` ở
      // mucMeta.ts, không import kiểu `RootBlockProps` thật (không cần, cũng tránh kéo thêm import
      // BlockSuite vào nơi vốn không cần).
      let tieuDeMoi: string | undefined
      try {
        const goc = storeHienTai?.root as { props?: { title?: unknown } } | null | undefined
        const tieuDeRaw = goc?.props?.title
        const tieuDeDaTrim = tieuDeRaw != null ? String(tieuDeRaw).trim() : ''
        // Tiêu đề RỖNG (chưa gõ gì, hoặc xoá hết) ⇒ để `tieuDeMoi` là `undefined`, KHÔNG truyền
        // chuỗi rỗng — capNhatSauKhiRoiMuc/mucMeta.ts tự giữ nguyên `ten` cũ khi tham số này rỗng/
        // undefined, nhưng để trắng ngay từ đây là lớp phòng vệ thứ hai, cố ý trùng (xem chú thích
        // tại định nghĩa hàm đó).
        if (tieuDeDaTrim) tieuDeMoi = tieuDeDaTrim
      } catch {
        // Trích tiêu đề cũng là tiện ích phụ (đồng bộ tên hiển thị) — lỗi ở đây không được chặn
        // dọn dẹp hay thao tác rời bài viết của người dùng, cùng lý do với khối trích nội dung tìm
        // kiếm ngay trên. Để `tieuDeMoi` ở nguyên `undefined` ⇒ capNhatSauKhiRoiMuc giữ nguyên tên
        // cũ, không có gì bị ghi đè bởi lỗi ở đây.
      }
      boTheoDoiKhoi?.()
      boWatchTheme?.()
      boBanPhim?.()
      litRender(null, el)
      ws?.forceStop()
      void capNhatSauKhiRoiMuc(docId, coThayDoiNoiDung, noiDungTimKiem, tieuDeMoi)
    }
  }, [docId])

  return (
    <div className="h-full relative" style={{ background: 'var(--c-page)' }}>
      {khongLuuDuoc && (
        // Băng cảnh báo mỏng, ghim trên đầu — KHÔNG che phần còn lại của bài viết bên dưới (chỉ cao
        // một dòng chữ), dùng lại token cảnh báo `--c-warn-*` đã dùng ở App.tsx cho các băng cảnh
        // báo lâm sàng khác trong app, để không tạo thêm ngôn ngữ màu mới.
        <div
          className="absolute top-0 inset-x-0 z-10 px-3 py-1.5 text-[12px] font-semibold text-center pointer-events-none"
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--c-warn-soft)',
            borderBottom: '1px solid var(--c-warn-line)',
            color: 'var(--c-warn-icon)',
          }}
        >
          Bài viết đang ở chế độ không lưu — nội dung sẽ mất khi tải lại trang.
        </div>
      )}
      {/* `drt-page-viewport`: `PageRootBlockComponent._initViewportResizeEffect` (firstUpdated) đọc
          `this.viewport`, mà provider đăng ký bằng `ViewportElementExtension('.drt-page-viewport')`
          (view.ts của cây vendor, đổi tên từ `.affine-page-viewport`) tìm TỔ TIÊN mang đúng lớp này
          bằng `std.host.closest(...)`. Thiếu lớp này thì getter ném thẳng
          `BlockSuiteError: viewport element is not found` ngay trong `firstUpdated()` — xác nhận ở
          spike Task 1 (trang-mount.spec.ts). Đặt lên CHÍNH thẻ `boc` (thẻ Lit render vào) vì
          `closest()` khớp cả chính phần tử, không chỉ tổ tiên — không cần thêm một lớp bọc riêng
          như `drt-edgeless-viewport` của EdgelessBoard.tsx. */}
      <div ref={boc} className="h-full drt-page-viewport" />
      {dangMo && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          role="status"
          aria-live="polite"
          style={{ background: 'var(--c-page)' }}
        >
          <div style={{ width: 72, height: 72 }}>
            <VeChuyenKhoaDangTai khoa={khoa} />
          </div>
          <span className="sr-only">Đang mở bài viết…</span>
        </div>
      )}
    </div>
  )
}
