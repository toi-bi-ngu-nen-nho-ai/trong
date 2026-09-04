// Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi Lit tự
// render vào thẻ đó. React không biết gì về bên trong, Lit không biết gì về React — đó chính là
// điều làm phép nhúng khả thi, và cũng là lý do file này phải nhỏ.
// Ở đây từng có `import '@blocksuite/affine/effects'`, kèm niềm tin rằng nó là nơi gọi
// `customElements.define(...)` cho toàn bộ thẻ Lit. Ở bản vendored (BlockSuite 0.27) niềm tin đó
// SAI: `affine/all/src/effects.ts` chỉ gồm các `import { type effects ... }` — nhập KIỂU — nên bản
// biên dịch của nó là đúng một dòng `export {};` (kiểm bằng `cat .vendor-build/affine/all/src/effects.js`).
// Import một module rỗng không đăng ký gì; đã kiểm chứng bằng một ca chỉ import nó rồi hỏi
// `customElements.get('drt-edgeless-root')` → undefined.
// Nơi thật sự đăng ký là chuỗi `ViewExtensionProvider.setup() → effect() → effects()` của TỪNG gói
// view extension, tức là qua `viewExtensions` (nay ở ./extensions.ts, dùng qua
// `layExtensionsEdgeless()` bên dưới — xem đó để biết vì sao `viewManager` và hai hàm
// `layExtensions*` dời sang đó từ Task 10). Vì thế bỏ hẳn dòng import đó thay vì giữ một dòng vô tác
// dụng kèm chú thích sai. Đường đăng ký thật được canh bằng `__tests__/dang-ky-custom-element.spec.ts`.
import { type SurfaceBlockModel } from '@blocksuite/affine/blocks/surface'
import { BlockStdScope } from '@blocksuite/affine/std'
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx'
import { PanTool } from '@blocksuite/affine-gfx-pointer'
import { TestWorkspace } from '@blocksuite/affine/store/test'
import { html, render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'
import { ganMoiBanPhimIOS } from './ban-phim-ios'
import { ganDongBoToaDoSauHieuUng, type ViewportCoDoLai } from './dong-bo-toa-do-viewport'
import { apDungViewportChoIOS } from './viewport-ios'
import { laKhungHep, theoDoiKhungHep } from './chi-doc-khung-hep'
import { type Hop as HopO, viTriMoiChoO } from './xep-o-tu-dong'
import type { KetQuaXuat } from './xuatAnhBang'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'
import { capNhatSauKhiRoiMuc, ghepNoiDungTimKiem, trichVanBanTuCanvas, trichVanBanTuKhoi } from './mucMeta'
import { storeManager, taoHoacMoDoc } from './mo-doc'

// ĐỊNH NGHĨA của toàn bộ token thiết kế mà cây Lit bên dưới tiêu thụ. Cây vendored dùng 81 biến
// `--drt-*` (thanh công cụ, khung chọn, khung kéo, mọi widget) nhưng KHÔNG khai một biến nào —
// định nghĩa nằm trong gói npm `@toeverything/theme`, và trước lượt sửa này không có gì trong src/
// import nó. Hậu quả: mọi custom property không phân giải được, bảng vẽ dựng ra không màu, không
// viền, không bóng — mà không có một lỗi nào bị ném, nên không lượt kiểm nào bắt được.
// File dưới đây là bản `style.css` của gói đó ĐÃ QUA bước đổi tên `--affine-` → `--drt-`
// (scripts/doi-ten-vendor.mjs phát hành ra `.vendor-build/theme/`, cùng chỗ và cùng luật với phần
// còn lại của D16), nên tên hai bên khớp nhau và devtools không lộ tiền tố thượng nguồn.
//
// Import ở ĐÂY, trong EdgelessBoard.tsx, chứ không ở src/index.css hay src/main.tsx: file này chỉ
// được nạp qua `React.lazy` (xem ./index.tsx), nên 102 kB stylesheet đi vào CHUNK BẢNG VẼ. Đặt ở
// vỏ app là bắt mọi người dùng tải bảng màu của một màn hình họ có thể không bao giờ mở.
import '../../.vendor-build/theme/style.css'

// Ghi đè token vendor bằng màu thương hiệu của app — PHẢI đứng SAU import theme ở trên (cùng độ
// đặc hiệu thì luật khai sau thắng; xem chú thích trong chính file đó về lý do chọn độ đặc hiệu).
import './cau-noi-thuong-hieu.css'

import { layExtensionsEdgeless } from './extensions'
import { DongNaoTemplateManager } from './mau-dongnao'
import { HandyTemplateManager } from './mau-handy'
import { EdgelessTemplatePanel } from '@blocksuite/affine-gfx-template'

// Phải chạy Ở ĐÂY — top-level module, trước khi bất kỳ Viewport nào được dựng (bên trong
// BlockStdScope, mount trong useEffect bên dưới). Xem viewport-ios.ts để biết vì sao thứ tự này
// bắt buộc (SKIP_REFRESH_DURING_GESTURE là field initializer, chốt cứng lúc constructor chạy).
apDungViewportChoIOS()

// Bơm các bộ mẫu vào nút "Mẫu" của thanh công cụ edgeless. Thượng nguồn để `builtInTemplates`
// rỗng, chờ app chủ gọi `extend()` (xem src/board/mau-handy.ts + scripts/dung-mau-handy.mjs). Chạy ở
// cấp module, một lần khi chunk bảng nạp — `EdgelessTemplatePanel.templates` CHÍNH LÀ `builtInTemplates`.
// THỨ TỰ `extend()` = THỨ TỰ TAB trong panel: bốn tab nhãn dán trước, "Động não" (mẫu bảng) cuối.
EdgelessTemplatePanel.templates.extend(new HandyTemplateManager())
EdgelessTemplatePanel.templates.extend(new DongNaoTemplateManager())

// Xuất PNG/PDF KHÔNG có UI trong màn vẽ này (phản hồi thật 2026-08-27, lần 3: "xoá luôn nút ... của
// đổi tên/chuyên khoa xuất file" ở màn vẽ, "tính năng xuất file chuyển ra board") — nút xuất sống
// trong menu "⋯" của THẺ bảng ở lưới danh sách (LuoiMuc.tsx).
// Từ 2026-08-30 lượt xuất đó KHÔNG còn đóng gói lại ảnh chụp khung nhìn nữa: ./xuatAnhBang.ts mở
// bảng NGẦM rồi dựng ảnh từ tài liệu CRDT qua ExportManager, đóng khung theo `gfx.elementsBound`.
// Nó dùng chung `taoHoacMoDoc()` và `layExtensionsEdgeless()` (nay ở ./extensions.ts, xem đó) — đó
// là toàn bộ quan hệ giữa hai module; component bên dưới không biết gì về việc xuất và không cần biết.

/** Hàm xuất PNG bảng đang mở — trả về mã kết quả để BoardGallery chọn thông báo. */
export type XuatBangFn = (tenBang: string) => Promise<KetQuaXuat>

/**
 * Đưa công cụ đang chọn về BÀN TAY (`PanTool`).
 *
 * Vì sao cần (chủ dự án báo 2026-09-04): `store.readonly` chặn mọi đường GHI, nhưng nó KHÔNG đụng
 * tới `gfx.tool` — công cụ đang chọn lúc khung còn rộng (Bút, Hình, Chữ, Tẩy...) vẫn nguyên đó khi
 * khung hẹp lại. Mà chỉ-đọc cũng ẩn luôn thanh công cụ, nên không còn nút nào để đổi về: bảng kẹt
 * ở một công cụ vẽ không vẽ được gì, cú kéo trên canvas thành kéo-chọn/vẽ hụt thay vì dời khung
 * nhìn — đúng thao tác DUY NHẤT còn ý nghĩa ở chế độ đọc.
 *
 * Bàn tay chứ không phải `DefaultTool` (mũi tên chọn): ở chế độ đọc không có gì để chọn, còn kéo
 * để đi quanh sơ đồ thì luôn cần.
 *
 * `{ panning: false }` là đúng hình dạng option mà thượng nguồn dùng ở mọi nơi khác
 * (edgeless-keyboard.ts:744, default-tool-button.ts:34) — `true` nghĩa là "đang giữ chuột kéo",
 * không phải "bật công cụ".
 *
 * Không ném ra ngoài: đây là một phép chỉnh cho dễ dùng, không được phép làm hỏng lượt mở bảng nếu
 * thượng nguồn đổi hình dạng API.
 */
function veCongCuBanTay(std: BlockStdScope | null): void {
  if (!std) return
  try {
    const tool = std.get(GfxControllerIdentifier).tool
    // `peek()` (không phải `.value`): đây là một phép hỏi tại chỗ, không được tạo đăng ký signal.
    if (tool.currentToolName$.peek() === PanTool.toolName) return
    tool.setTool(PanTool, { panning: false })
  } catch (err) {
    console.warn('EdgelessBoard: không đưa được công cụ về bàn tay:', err)
  }
}

// Nút "Xuất PNG" sống Ở MÀN VẼ (BoardGallery.tsx), đối xứng với nút quay lại — component này chỉ
// góp phần THỰC THI: sau khi cây Lit gắn xong, nó dựng một `XuatBangFn` đóng gói `std` + host rồi
// đẩy lên BoardGallery qua `onXuatSanSang`. Vẫn giữ tinh thần "file phải nhỏ": không biết
// BoardGallery vẽ nút thế nào, chỉ cấp đúng một hàm.
// (Trước 2026-08-31 nút xuất nằm ở menu "⋯" của THẺ trong lưới và mở một bảng ngầm để dựng ảnh —
// bỏ vì trình soạn thảo ngầm không render khối note, xem ./xuatAnhBang.ts và HANDOFF §1.1.)
export function EdgelessBoard({
  boardId,
  khoa,
  onReady,
  onXuatSanSang,
}: {
  boardId: string
  // Chuyên khoa của bảng đang mở — chỉ để màn chờ (VeChuyenKhoaDangTai) vẽ đúng icon nét-đơn và
  // lấy đúng màu nhận diện. undefined khi mở không qua một thẻ trong lưới (kết quả tìm kiếm toàn
  // app) → màn chờ tự rơi về icon "trang giấy" trung tính.
  khoa?: string
  // Báo cho BoardGallery.tsx biết canvas thật đã gắn xong (đúng lúc setDangMo(false) chạy) — dùng
  // để mờ dần lớp phủ ảnh xem trước (FLIP continuity, xem BoardGallery.tsx) thay vì tự đoán một
  // thời lượng cố định không khớp tốc độ mạng/máy thật.
  onReady?: () => void
  // Nhận một hàm xuất PNG khi cây Lit đã gắn (đủ `std` + host để dựng ảnh), `null` khi tháo. Ổn
  // định qua vòng đời một bảng; BoardGallery cầm nó cho nút "Xuất PNG".
  onXuatSanSang?: (xuat: XuatBangFn | null) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  // Ref lớp bọc viewport — dùng cho phép đồng bộ lại toạ độ sau hiệu ứng vào màn (useEffect bên dưới).
  const viewportRef = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)
  // ─── Chế độ CHỈ ĐỌC khi khung hẹp (chủ dự án quyết 2026-09-03) ──────────────────────────────
  // Bảng sơ đồ mở ở khung hẹp thì chỉ để XEM. Công tắc là `store.readonly` chứ không phải ẩn
  // nút: nó là thứ DUY NHẤT chặn cùng lúc mọi đường sửa — thanh công cụ tự trả `nothing`
  // (`widgets/edgeless-toolbar/src/edgeless-toolbar.ts:663`), `updateBlock` từ chối ghi, bấm đúp
  // không mở được trình soạn chữ. Ẩn nút bằng CSS thì vẫn bấm đúp và kéo phần tử được.
  //
  // `readonly` ẩn luôn THANH ZOOM vendored (`zoom-toolbar.ts:148`, `zoom-bar-toggle-button.ts:83`
  // đều mở đầu `render()` bằng `if (this.std.store.readonly) return nothing`) — mất cả nút "Vừa
  // khung hình" lẫn mức zoom, dù thanh đó chỉ điều khiển VIEWPORT (không sửa nội dung nào, xem
  // `stdChiDocRef` bên dưới). Bù lại bằng chính thanh zoom THẬT của AFFiNE, không phải bản tự vẽ —
  // xem `stdChiDocRef` + `zoomHostRef` + effect dựng nó ở dưới.
  const [chiDoc, setChiDoc] = useState(laKhungHep)
  // Giữ store để đổi được `readonly` khi XOAY MÁY, chứ không chỉ đặt một lần lúc mở bảng.
  const storeRef = useRef<{ readonly: boolean } | null>(null)
  // ─── std giả `readonly=false`, CHỈ cấp cho thanh zoom nổi ở khung hẹp ────────────────────────
  // `<edgeless-zoom-toolbar>` (vendored) tự ẩn khi `std.store.readonly` — nhưng ba nút của nó chỉ
  // gọi `gfx.fitToScreen()` / `viewport.smoothZoom()` (xem zoom-toolbar.ts:168,179,188,197), không
  // nút nào đụng `store.updateBlock` hay bất kỳ đường ghi nội dung nào — readonly chặn NHẦM một
  // control không phải "công cụ" theo nghĩa sửa bài, chỉ là điều hướng khung nhìn.
  //
  // Không được vá zoom-toolbar.ts (D11). Thay vào đó dựng thêm MỘT bản `<edgeless-zoom-toolbar>`
  // độc lập (đã đăng ký sẵn qua viewExtensions, xem ./extensions.ts), gán cho nó một Proxy bọc `std` thật
  // — Proxy chỉ chặn ĐÚNG một điểm đọc (`.store.readonly` → luôn trả `false`), mọi thuộc tính khác
  // (kể cả `.get(GfxControllerIdentifier)`) đi thẳng qua `Reflect.get` tới đối tượng thật, nên
  // thanh này điều khiển ĐÚNG viewport thật của bảng, không phải một bản giả.
  //
  // AN TOÀN: (1) `std`/`store` THẬT (dùng cho `std.render()` ở hostRef, gán vào storeRef) không hề
  // bị đụng — cờ readonly thật vẫn `true` suốt, `updateBlock`/soạn chữ vẫn bị chặn y hệt trước giờ;
  // (2) Proxy chỉ được gán cho phần tử dựng thêm ở `zoomHostRef`, không ai khác cầm tham chiếu;
  // (3) đã đọc `std-scope.ts`/`store.ts` để xác nhận `BlockStdScope`/`Store` không dùng private
  // field thật (`#x`) ở các đường đọc liên quan, nên Proxy không vỡ vì brand-check của private field.
  const stdChiDocRef = useRef<BlockStdScope | null>(null)
  // `std` THẬT (khác Proxy giả-readonly ở trên) — giữ lại để đưa công cụ đang chọn về bàn tay mỗi
  // lần vào chế độ chỉ đọc, kể cả khi cú đổi đến từ việc XOAY MÁY chứ không phải lúc mở bảng.
  const stdRef = useRef<BlockStdScope | null>(null)
  // Nơi litRender() dựng thêm `<edgeless-zoom-toolbar>` — tách khỏi hostRef vì đó là cây chính,
  // không được chèn phần tử ngoài ý muốn của BlockSuite vào giữa.
  const zoomHostRef = useRef<HTMLDivElement>(null)
  // Lỗi không mở được bảng — vd IndexedDB ném lỗi thật (không phải chỉ hết giờ, nhánh đó đã tự rơi
  // về bộ nhớ ở taoHoacMoDoc() chứ không reject). Trước lượt sửa này, một promise reject ở đây
  // không có .catch() nào bắt: React ném "Đang mở bảng…" treo mãi, còn lỗi thật thì trôi thành một
  // unhandled rejection không ai thấy. Component này không có cơ chế thử lại riêng (khác error
  // boundary ở src/board/index.tsx, nơi có nút "Thử lại" thật) nên chỉ cần gợi ý tải lại trang.
  const [loi, setLoi] = useState<Error | null>(null)
  // true khi taoHoacMoDoc() phải rơi về workspace chỉ-trong-bộ-nhớ (lượt race đồng bộ đầu tiên hết
  // giờ) — quyết định của chủ dự án sau lượt review toàn nhánh: hiện băng cảnh báo thay vì im lặng.
  const [khongLuuDuoc, setKhongLuuDuoc] = useState(false)

  // ─── Chủ đề sáng/tối của riêng bảng vẽ ───────────────────────────────────────────────────────
  // Bảng màu vendored (.vendor-build/theme/style.css) khoá TOÀN BỘ bản tối vào đúng một bộ chọn
  // `[data-theme=dark]` và không có nhánh `prefers-color-scheme` nào dự phòng. Mà chế độ mặc định
  // của app là "auto", nơi lib/theme.ts CỐ Ý gỡ hẳn thuộc tính data-theme khỏi <html> để các biến
  // --c-* của vỏ app chạy bằng @media. Hai điều đó cộng lại: máy để nền tối, cả app tối, riêng
  // bảng vẽ vẫn trắng loá — đúng thứ chói mắt nhất lúc 2 giờ sáng.
  // Vì thế thẻ bọc dưới đây tự mang một data-theme ĐÃ PHÂN GIẢI ("light"/"dark", không bao giờ
  // "auto"). Đây cũng là cách vỏ React của chính AFFiNE làm (`affine-edgeless-viewport`
  // data-theme=...). Không đụng gì tới <html> nên chủ đề của vỏ app giữ nguyên cách chạy cũ.
  const [chuDe, setChuDe] = useState(() => resolveTheme())
  // Đổi sống theo cả hai hướng: người dùng bấm nút chủ đề, và hệ điều hành lật sáng/tối khi app
  // đang ở "auto". Cả hai đều đi qua applyTheme() nên chỉ cần nghe đúng một chỗ (xem lib/theme.ts).
  useEffect(() => watchResolvedTheme(setChuDe), [])

  // Xoay ngang/dọc là bề ngang nhảy qua ngưỡng — phải đổi trạng thái ngay, không đợi mở lại bảng.
  useEffect(() => theoDoiKhungHep(setChiDoc), [])

  // Áp `readonly` mỗi khi trạng thái đổi. Store có thể chưa sẵn sàng ở lượt chạy đầu (mount là bất
  // đồng bộ) — nhánh trong `.then()` bên dưới đặt lần đầu, effect này lo những lần đổi sau.
  useEffect(() => {
    if (storeRef.current) storeRef.current.readonly = chiDoc
    // Vào chế độ đọc thì công cụ phải về bàn tay — xem veCongCuBanTay(). Rời chế độ đọc thì KHÔNG
    // khôi phục công cụ cũ: thanh công cụ hiện lại đầy đủ, để người dùng tự chọn còn dễ đoán hơn
    // một cú đổi công cụ tự động sau lưng họ.
    if (chiDoc) veCongCuBanTay(stdRef.current)
  }, [chiDoc])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let huyBo = false
    let workspaceHienTai: TestWorkspace | null = null
    // Có sửa NỘI DUNG thật trong phiên mở bảng này hay không — xem chú thích ở capNhatSauKhiRoiMuc
    // (mucMeta.ts). Đăng ký lúc mount xong (sau seed, xem taoHoacMoDoc), nên chỉ đếm thay đổi
    // PHÁT SINH TỪ đây trở đi, không tính lượt hydrate/seed đã xảy ra trước khi effect này chạy.
    let coThayDoiNoiDung = false
    let huyDangKyThayDoi: Array<() => void> = []

    taoHoacMoDoc(boardId, 'so-do')
      .then(({ workspace, store, khongLuuDuoc: khongLuuDuocKetQua }) => {
        if (huyBo) {
          // Component đã unmount trong lúc đang đợi đồng bộ — đóng ngay, không render, không giữ
          // engine chạy nền cho một cây Lit sẽ không bao giờ được gắn.
          workspace.forceStop()
          return
        }
        workspaceHienTai = workspace
        // Đặt TRƯỚC `litRender`: thanh công cụ đọc `store.readonly` ngay ở lượt render đầu, đặt
        // sau là nó kịp hiện ra rồi mới biến mất — một cú nháy thấy được trên máy chậm.
        storeRef.current = store
        store.readonly = laKhungHep()
        const std = new BlockStdScope({ store, extensions: layExtensionsEdgeless() })
        litRender(std.render(), el)
        stdRef.current = std
        // KHÔNG gọi veCongCuBanTay() ở đây. Mốc MỞ BẢNG đã do thượng nguồn lo:
        // `edgeless-root-block.ts:452` mở đầu `firstUpdated()` bằng
        // `if (this.store.readonly) this.gfx.tool.setTool(PanTool, ...)` — và `store.readonly` đã
        // được đặt ngay trên, TRƯỚC `litRender`, nên nhánh đó luôn thấy đúng trạng thái. Đã kiểm
        // bằng cách gỡ hẳn bản vá này: ca "khung hẹp lúc mở bảng" vẫn XANH, chỉ ca "xoay từ khung
        // rộng sang khung hẹp" mới đỏ. Thêm một lời gọi ở đây chỉ là mã chết đội lốt phòng thủ.

        // Proxy giả `store.readonly = false` — CHỈ cho thanh zoom nổi (xem chú thích dài ở khai
        // báo `stdChiDocRef`). `std`/`store` thật ở trên hoàn toàn không bị đụng.
        stdChiDocRef.current = new Proxy(std, {
          get: (target, prop, receiver) => {
            if (prop !== 'store') return Reflect.get(target, prop, receiver)
            const storeThat = target.store
            return new Proxy(storeThat, {
              get: (storeTarget, storeProp, storeReceiver) =>
                storeProp === 'readonly' ? false : Reflect.get(storeTarget, storeProp, storeReceiver),
            })
          },
        })

        // Mồi bàn phím ảo iOS: BlockSuite hoãn mọi `focusTextModel()` qua rAF nên Safari iOS không
        // mở bàn phím khi chạm vào node text. Phép mồi focus một `<input>` thật đồng bộ trong
        // `touchend` để bàn phím bật lên trong cử chỉ, rồi trao lại cho editor. No-op ngoài iOS.
        // Xem ./ban-phim-ios.ts và HANDOFF §1.1.
        //
        // Tham số thứ ba: công cụ "Chữ" tạo chữ bằng MỘT cú chạm (affine/gfx/text/src/tool.ts,
        // `override click()`), khác mọi công cụ còn lại vốn cần chạm-đôi. Không nói cho phép mồi
        // biết thì đúng cú chạm đó mất bàn phím. Đọc `peek()` (không phải `.value`) để không tạo
        // đăng ký signal nào — đây chỉ là một phép hỏi tại chỗ trong handler chạm.
        const dangDungCongCuChu = () => {
          try {
            return std.get(GfxControllerIdentifier).tool.currentToolName$.peek() === 'text'
          } catch {
            // Thượng nguồn đổi hình dạng API thì mất đúng đường công cụ Chữ, không gãy cả bảng vẽ.
            return false
          }
        }
        huyDangKyThayDoi.push(ganMoiBanPhimIOS(el, undefined, dangDungCongCuChu))

        // Cấp hàm xuất PNG cho BoardGallery (nút "Xuất PNG" ở màn vẽ). Import ĐỘNG: xuatAnhBang.ts
        // kéo theo html2canvas — không được vào chunk bảng vẽ cho người chưa bao giờ bấm xuất.
        // `std`/`el` đóng gói trong closure; hàm ổn định suốt vòng đời bảng này.
        onXuatSanSang?.((tenBang) =>
          import('./xuatAnhBang').then((m) => m.xuatPngBang(std, el, tenBang)),
        )

        setKhongLuuDuoc(khongLuuDuocKetQua)
        setDangMo(false)
        onReady?.()

        // Khối (note, ảnh, đính kèm...) đi qua store.slots.blockUpdated; phần tử canvas thuần
        // (connector, brush, shape, mindmap node...) KHÔNG phải khối — sống trong Y.Map riêng của
        // chính surface, chỉ báo qua surface.element{Added,Updated,Removed}. Cần cả hai mới phủ hết
        // những gì PRODUCT.md liệt cho Mindmap (thẻ ghi chú + đường nối + nét vẽ tay + ảnh chèn).
        // `isLocal`/`local`: chỉ đếm sự kiện phát sinh TỪ CHÍNH client này — bỏ qua sự kiện đến từ
        // hydrate/đồng bộ nền, dù ở app một-người-dùng-cục-bộ này trường hợp đó hiếm.
        const dkBlock = store.slots.blockUpdated.subscribe((payload) => {
          if (payload.isLocal) coThayDoiNoiDung = true
        })
        huyDangKyThayDoi.push(() => dkBlock.unsubscribe())

        const surfaceModel = store.root?.children.find(
          (khoi): khoi is SurfaceBlockModel => khoi.flavour === 'affine:surface',
        )

        // ─── Bù lỗi nút "+" của ô ghi chú ────────────────────────────────────────────────────
        // `_computeNextBound` của cây vendored (D11 — không sửa được) đặt ô mới ở đúng
        // `x + w + 100`, không kiểm ô đã có và không biết có khung chứa: bấm "+" trong mẫu SWOT thì
        // ô mới đè lên ô kế bên, hoặc chui hẳn ra ngoài ô ma trận và đè sang ô ma trận bên cạnh.
        // Toàn bộ phần suy lưới và chọn chỗ nằm ở ./xep-o-tu-dong.ts (thuần, có bài kiểm riêng);
        // ở đây chỉ đọc trạng thái, gọi nó, rồi ghi lại `xywh`.
        //
        // HAI KHUNG HÌNH, không phải một: sau khi tạo ô, thượng nguồn xếp một `requestAnimationFrame`
        // để đặt con trỏ soạn thảo. Dời ô ở khung hình đầu là dời TRƯỚC lượt đó, con trỏ sẽ rơi vào
        // chỗ trống. Đợi qua khung hình thứ hai thì ô đã ở chỗ mới và khối vẫn đang được chọn.
        const docHopTu = (xywh: unknown): HopO | null => {
          if (typeof xywh !== 'string') return null
          try {
            const [x, y, w, h] = JSON.parse(xywh) as number[]
            if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
            return { x, y, w, h }
          } catch {
            return null
          }
        }
        // `model.props` của cây vendored khai là `SignaledProps<object>` — không có `xywh` ở mức
        // kiểu. Khai tối thiểu tại chỗ đúng như luật D11 yêu cầu, thay vì import kiểu xuyên ranh giới.
        const layXywh = (m: unknown): unknown => (m as { props?: { xywh?: unknown } } | null)?.props?.xywh
        const dkXepO = store.slots.blockUpdated.subscribe((payload) => {
          if (payload.type !== 'add' || payload.flavour !== 'affine:note' || !payload.isLocal) return
          const idMoi = payload.id
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              try {
                const moi = docHopTu(layXywh(store.getModelById(idMoi)))
                if (!moi) return
                const daCo = store
                  .getBlocksByFlavour('affine:note')
                  .filter((khoi) => khoi.id !== idMoi)
                  .map((khoi) => docHopTu(layXywh(khoi.model)))
                  .filter((hop): hop is HopO => hop !== null)
                const hinh = [...(surfaceModel?.elementModels ?? [])]
                  .filter((el) => el.type === 'shape')
                  .map((el) => docHopTu(el.xywh))
                  .filter((hop): hop is HopO => hop !== null)

                const cho = viTriMoiChoO(moi, daCo, hinh)
                if (!cho) return
                store.updateBlock(idMoi, {
                  xywh: `[${cho.x},${cho.y},${moi.w},${moi.h}]`,
                })
              } catch (err) {
                // Không được để một phép sắp xếp thẩm mỹ làm hỏng thao tác tạo ô của người dùng.
                console.warn('EdgelessBoard: không xếp lại được ô ghi chú mới:', err)
              }
            }),
          )
        })
        huyDangKyThayDoi.push(() => dkXepO.unsubscribe())

        if (surfaceModel) {
          const dkThem = surfaceModel.elementAdded.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          const dkSua = surfaceModel.elementUpdated.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          const dkXoa = surfaceModel.elementRemoved.subscribe(({ local }) => {
            if (local) coThayDoiNoiDung = true
          })
          huyDangKyThayDoi.push(
            () => dkThem.unsubscribe(),
            () => dkSua.unsubscribe(),
            () => dkXoa.unsubscribe(),
          )
        }
      })
      .catch((err: unknown) => {
        if (huyBo) return
        console.error('EdgelessBoard: không mở được bảng:', err)
        setLoi(err instanceof Error ? err : new Error(String(err)))
        setDangMo(false)
      })

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó — cộng thêm giờ là một engine đồng bộ
    // IndexedDB còn chạy nền.
    return () => {
      huyBo = true
      // Thu hồi hàm xuất TRƯỚC khi tháo cây Lit — sau `litRender(null, el)` bên dưới thì `std` trỏ
      // vào một scope đã chết, gọi xuất trên đó chỉ ra lỗi khó hiểu.
      onXuatSanSang?.(null)
      huyDangKyThayDoi.forEach((huy) => huy())
      // Cập nhật metadata của bảng vừa đóng TRƯỚC khi tháo — `workspaceHienTai.forceStop()` ngay
      // dưới đóng DocEngine, sau đó không còn gì để đọc. Best-effort tuyệt đối: lỗi ở đây KHÔNG
      // được chặn dọn dẹp thật (forceStop() vẫn phải chạy).
      //
      // Ở ĐÂY TỪNG CÓ một lượt chụp ảnh xem trước: lấy `el.querySelector('canvas')` (canvas KHUNG
      // NHÌN), ép xuống 480×360, quét kênh alpha để phân biệt bảng trống, lấp nền theo --c-surface
      // rồi ghi `toDataURL('image/jpeg', 0.6)` vào `BangMeta.anhXemTruoc`. Gỡ HẲN 2026-08-30 (phản
      // hồi thật của chủ dự án): ảnh đó là NGUỒN GỐC của cả ba lỗi cùng lúc — thẻ ở lưới tái hiện
      // nét vẽ thay vì giữ icon chuyên khoa, "Xuất PNG" cho ra khung ảnh đổi theo pan/zoom (vì ảnh
      // CHÍNH LÀ khung nhìn), và chất lượng bệt (0,17 MP + JPEG 0.6, sau đó bọc PNG chỉ đóng đinh
      // artefact lại). Thẻ giờ luôn dùng huy hiệu chuyên khoa; xuất PNG dựng lại từ tài liệu CRDT
      // qua ./xuatAnhBang.ts. Không còn ai đọc `anhXemTruoc`, nên tiếp tục ghi nó chỉ là bơm hàng
      // trăm kB rác vào IndexedDB mỗi lần rời bảng — capNhatSauKhiRoiMuc() còn chủ động bóc trường
      // đó ra để dọn dữ liệu đã ghi từ trước.
      //
      // Lượt gọi capNhatSauKhiRoiMuc() thì Ở LẠI, và giờ chạy VÔ ĐIỀU KIỆN (trước đây nó nằm lồng
      // trong `if (canvasGoc && canvasGoc.width > 0 ...)` — điều kiện của việc CHỤP, không phải của
      // việc cập nhật): nó gánh bump capNhatLuc, backfill chuyenKhoa/tags và ghi noiDungTimKiem.
      try {
        // Trích văn bản NGAY TRƯỚC forceStop(). Tự lấy lại store qua
        // `workspaceHienTai.getDoc(boardId).getStore(...)` — con đường CHẮC CHẮN sống nếu
        // taoHoacMoDoc đã resolve, không phụ thuộc bất kỳ state React nào có thể lệch nhịp lúc
        // unmount.
        let noiDungTimKiemMoi: string | undefined
        try {
          const rootHienTai = workspaceHienTai
            ?.getDoc(boardId)
            ?.getStore({ extensions: storeManager.get('store') }).root
          if (rootHienTai) {
            const surfaceHienTai = rootHienTai.children.find(
              (khoi): khoi is SurfaceBlockModel => khoi.flavour === 'affine:surface',
            )
            noiDungTimKiemMoi = ghepNoiDungTimKiem(
              trichVanBanTuKhoi(rootHienTai),
              // Ép kiểu về hình dạng tối thiểu mà trichVanBanTuCanvas cần (`{ text?: unknown }[]`)
              // — elementModels là union các lớp GfxPrimitiveElementModel cụ thể (shape/connector/
              // text/mindmap...), không lớp nào khai `text` ở kiểu CHUNG nên TypeScript từ chối gán
              // thẳng dù đúng ở runtime cho những lớp có field đó (đã xác nhận qua chính
              // element-model/{text,shape,connector}.ts của cây vendored, xem chú thích tại định
              // nghĩa trichVanBanTuCanvas trong mucMeta.ts).
              surfaceHienTai
                ? trichVanBanTuCanvas(surfaceHienTai.elementModels as unknown as Array<{ text?: unknown }>)
                : '',
            )
          }
        } catch {
          // Trích văn bản là tiện ích phụ (phục vụ tìm kiếm) — lỗi ở đây không được làm hỏng lượt
          // cập nhật metadata hay thao tác quay lại danh sách của người dùng.
        }
        void capNhatSauKhiRoiMuc(boardId, coThayDoiNoiDung, noiDungTimKiemMoi)
      } catch {
        // Cập nhật metadata là tiện ích phụ — không được làm hỏng thao tác quay lại của người dùng.
      }
      storeRef.current = null
      stdChiDocRef.current = null
      stdRef.current = null
      litRender(null, el)
      workspaceHienTai?.forceStop()
    }
  }, [boardId])

  // Dựng/tháo thanh zoom THẬT của AFFiNE ở khung hẹp. Chạy lại khi `chiDoc` đổi (xoay máy) và khi
  // `dangMo` chuyển false (lúc đó `stdChiDocRef` mới có giá trị — mount là bất đồng bộ).
  useEffect(() => {
    const host = zoomHostRef.current
    if (!host) return
    const std = stdChiDocRef.current
    if (chiDoc && std) {
      litRender(html`<edgeless-zoom-toolbar .std=${std}></edgeless-zoom-toolbar>`, host)
    } else {
      litRender(null, host)
    }
    return () => {
      litRender(null, host)
    }
  }, [chiDoc, dangMo])


  // ─── Đồng bộ lại toạ độ sau hiệu ứng vào màn ─────────────────────────────────────────────────
  // Cơ chế, bằng chứng đo được và lý do đầy đủ nằm ở ./dong-bo-toa-do-viewport.ts. Tóm tắt: bảng
  // mount BÊN TRONG lớp bọc đang chạy hiệu ứng FLIP, BlockSuite đo `getBoundingClientRect()` đúng
  // một lần lúc gắn (tính cả transform), và `ResizeObserver` của nó không bao giờ bắn vì transform
  // — nên số đo méo bị đóng đinh, mọi lượt chạm lệch nguyên khối.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    return ganDongBoToaDoSauHieuUng({
      viewport: el,
      // API nội bộ vendored, không có kiểu công khai. `ganDongBoToaDoSauHieuUng` bọc lượt gọi này
      // trong try/catch nên thượng nguồn đổi hình dạng thì mất phép đồng bộ, không gãy thao tác.
      layViewport: () =>
        (el.querySelector('drt-edgeless-root') as unknown as { gfx?: { viewport?: ViewportCoDoLai } } | null)
          ?.gfx?.viewport,
    })
  }, [])

  // `ViewportElementExtension('.drt-edgeless-viewport')` (đăng ký trong extensions/view.ts của cây
  // vendor) tìm phần tử viewport bằng `std.host.closest(...)` — đi NGƯỢC LÊN từ editor host, nên
  // chính ứng dụng nhúng phải cấp sẵn tổ tiên mang đúng class này; cây Lit bên trong không tự tạo
  // ra nó. Thiếu tổ tiên này là nguyên nhân lỗi "viewport element is not found".
  // Bọc thêm một div `drt-edgeless-viewport` bên ngoài div gắn Lit — không đụng vào chính hostRef,
  // giữ đúng ranh giới "React chỉ giữ chỗ, Lit tự lo bên trong" của hostRef.
  //
  // `@container/viewport` là utility Tailwind v4 sinh ra ĐỦ CẢ HAI khai báo
  // `container-type: inline-size` và `container-name: viewport`. Luật này trước đây nằm trong
  // src/index.css với chú thích nói Tailwind không có utility cho `container-name` — chú thích đó
  // sai, và cái giá của nó là một luật CHỈ dùng cho bảng vẽ bị nạp kèm CSS của vỏ app, đúng thứ
  // ranh giới mà cả chặng này dựng lên để tránh. Cái TÊN "viewport" là bắt buộc: nhiều nơi trong
  // cây vendor (vd affine/widgets/edgeless-zoom-toolbar) viết thẳng `@container viewport (...)`,
  // truy vấn đó chỉ khớp container mang đúng tên này.
  // Class chữ `drt-edgeless-viewport` PHẢI ở lại — nó là thứ `closest()` bên trên tìm, không phải
  // thứ tạo ra kiểu dáng.
  //
  // "Đang mở bảng…" hiện TRONG lớp bọc này (không phải thay thế nó) — lớp bọc phải render ngay từ
  // đầu để giữ cấu trúc DOM ổn định cho `closest()` ở trên, kể cả trước khi Lit gắn vào. Khớp thị
  // giác với dòng "Đang tải bảng vẽ…" của Suspense fallback ở src/board/index.tsx. Trạng thái lỗi
  // (`loi`) dùng đúng khung chứa và kiểu chữ nhạt màu tương tự, cho cảm giác nhất quán thay vì một
  // màn hình lỗi đột ngột khác kiểu.
  return (
    <div
      ref={viewportRef}
      className="drt-edgeless-viewport @container/viewport block h-full relative overflow-clip"
      data-theme={chuDe}
    >
      {khongLuuDuoc && (
        // Băng cảnh báo mỏng, ghim trên đầu — KHÔNG che phần còn lại của bảng vẽ bên dưới (chỉ cao
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
          Bảng đang ở chế độ không lưu — nội dung sẽ mất khi tải lại trang.
        </div>
      )}
      {chiDoc && (
        // Chế độ chỉ đọc là trạng thái BÌNH THƯỜNG đã hẹn trước, không phải sự cố — nên dùng token
        // trung tính (`--c-surface-alt` + `--c-text-soft`) chứ KHÔNG dùng màu cảnh báo. DESIGN.md:
        // thứ ồn nhất trên màn luôn phải là tín hiệu nguy hiểm thật.
        //
        // DÁN SÁT ĐÁY MÀN, hết bề ngang (chủ dự án yêu cầu 2026-09-03). Làm được là nhờ App đã ẩn
        // thanh điều hướng dưới khi đang dùng sơ đồ — dưới băng này không còn gì nữa. Hai bản trước
        // đều sai chỗ: ghim ở đỉnh thì luồn dưới hai nút tròn nổi (quay lại / xuất), còn thả nổi ở
        // `bottom-4` thì chừa một khe trống vô nghĩa sau khi nav biến mất.
        //
        // `--safe-bottom` PHẢI cộng tay: trên iPhone toàn màn hình, thanh nav vốn là thứ "nuốt" giùm
        // vùng thanh gạt Home (`--nav-pad-bottom`, xem App.tsx). Nav không còn thì băng này phải tự
        // chừa, nếu không chữ nằm đúng dưới thanh gạt.
        //
        // `pointer-events-none`: băng chỉ để đọc, không được nuốt cú kéo khung nhìn.
        //
        // Bọc ngoài một lớp flex-column (không nền/viền riêng) để xếp thanh zoom THẬT của AFFiNE
        // (zoomHostRef, xem effect dựng nó ở trên) ngay TRÊN băng chữ, tự nhiên theo flow — không
        // đoán chiều cao băng chữ bằng số cứng (chữ có thể xuống dòng ở máy rất hẹp). Bản thân
        // băng chữ giữ NGUYÊN nội dung/kiểu dáng như trước, chỉ đổi từ tự định vị `absolute` sang
        // `w-full` vì lớp bọc ngoài đã lo phần đó.
        <div className="absolute bottom-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none">
          <div ref={zoomHostRef} className="pointer-events-auto pb-1" />
          <div
            className="w-full px-3 pt-1.5 text-[12px] font-semibold text-center pointer-events-none"
            role="status"
            aria-live="polite"
            style={{
              background: 'var(--c-surface-alt)',
              borderTop: '1px solid var(--c-line)',
              color: 'var(--c-text-soft)',
              paddingBottom: 'calc(0.375rem + var(--safe-bottom))',
            }}
          >
            Bạn đang xem ở khung hẹp - chỉ ở chế độ đọc
          </div>
        </div>
      )}
      {loi && (
        <div className="h-full flex flex-col items-center justify-center gap-1 text-[13px] text-slate-400 text-center px-6">
          <p>Không mở được bảng.</p>
          <p>Hãy tải lại trang để thử lại.</p>
        </div>
      )}
      {dangMo && !loi && (
        // Chữ xám tĩnh cũ (khoảng chờ ~5-7s không tín hiệu, critique 2026-08-25) → chấm tròn
        // ink-bloom → 4 vòng tự vẽ icon (đọc sai) → ba chấm nhảy → nay LINE-DRAWING: tự phác dần
        // icon nét-đơn của khoa `khoa`, đơn sắc theo màu nhận diện khoa (VeChuyenKhoaDangTai).
        // KHÔNG còn dòng chữ hiện trên màn — bản vẽ đang chạy là tín hiệu "đang chờ"; chữ giữ ở
        // .sr-only cho trình đọc màn hình + ca kiểm edgeless-board-mount (đọc container.textContent).
        <div
          className="h-full flex flex-col items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div style={{ width: 72, height: 72 }}>
            <VeChuyenKhoaDangTai khoa={khoa} />
          </div>
          <span className="sr-only">Đang mở bảng…</span>
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
