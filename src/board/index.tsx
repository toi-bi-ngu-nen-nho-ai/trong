// Vỏ nạp chậm của MỌI mục BlockSuite — bảng vẽ lẫn bài viết. Mọi chỗ trong app phải đi qua đây,
// không import thẳng `./EdgelessBoard` HAY `./TrangBaiViet`. Cả hai chiều đều do
// `ranh-gioi-nap-bang.spec.ts` canh; chú thích này chỉ là tài liệu phụ.
//
// Nạp chậm (D13): 993,69 kB gzip chỉ tải khi người dùng thật sự mở một bảng — gấp ba lần vỏ app,
// vốn giữ nguyên 332,01 kB gzip. Import tĩnh ở đây là mất trọn lợi ích đó.
// (Hai số trên đo bằng `npm run build` ngày 2026-08-12; con số 1.131 kB ghi ở đây trước kia chưa
// bao giờ dựng lại được.)
//
// ─── Vì sao vỏ này là một error boundary chứ không chỉ một lời gọi `lazy()` ───────────────────
// public/manifest.json có lối tắt `"/?screen=mindmap"` cài được ra màn hình chính, và App đọc
// tham số đó lúc mount. public/sw.js chỉ precache VỎ APP; chunk bảng vẽ 4 MB đi theo lối
// cache-first-with-revalidate nên nó chỉ tồn tại SAU một lượt tải mạng thành công.
// Mở lối tắt đó lần đầu khi không có mạng: lượt `import()` thất bại → promise của `React.lazy` bị
// từ chối NGAY TRONG LÚC RENDER → không có gì bắt giữa nó và error boundary gốc ở src/main.tsx →
// React tháo TOÀN BỘ cây và thay bằng màn hình lỗi. Lối thoát duy nhất được đưa ra là tải lại
// trang, mà cú tải lại giữ nguyên `?screen=mindmap` nên tái hiện đúng lỗi cũ. Trong một PWA đã cài
// (standalone) thì không có thanh địa chỉ để thoát ra. App này có service worker chính là để dùng
// cạnh giường bệnh, chỗ không có sóng.
// Boundary dưới đây giữ hỏng hóc lại BÊN TRONG tab Mindmap: thanh nav và mọi màn hình khác vẫn
// dùng được. Nửa còn lại của cách sửa nằm ở src/components/ErrorBoundary.tsx (nút phục hồi gỡ bỏ
// tham số `screen`).
import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from 'react'

import type { XuatBangFn } from './EdgelessBoard'
import { batLopCssVendor } from './lop-css-vendor'
// CHỈ import KIỂU: mo-doc.ts import @blocksuite/*, một import GIÁ TRỊ từ đó kéo cả khối BlockSuite
// vào chunk vỏ app (phá thẳng D13). `import type` bị xoá lúc biên dịch nên an toàn — cùng cách
// src/App.tsx đang import BangMeta.
import type { LoaiMuc } from './mo-doc'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'

export type { XuatBangFn } from './EdgelessBoard'
export type { KetQuaXuat } from './xuatAnhBang'

// `React.lazy` NHỚ VĨNH VIỄN kết quả lượt gọi factory đầu tiên — kể cả một promise BỊ TỪ CHỐI.
// Nghĩa là bấm "Thử lại" trên cùng một đối tượng lazy sẽ ném lại đúng lỗi cũ mà không hề chạm
// mạng, dù sóng đã có trở lại. Cách duy nhất để thử lại thật là dựng một đối tượng lazy MỚI.
// Kho dưới đây giữ đúng một đối tượng cho mỗi lần thử, để các lượt re-render bình thường của React
// không dựng lại (và không tháo/lắp lại) bảng vẽ đang chạy.
type PropsBang = {
  boardId: string
  /**
   * Loại mục — quyết định vỏ nào được nạp. Cùng MỘT chunk cho cả hai (viewManager là singleton, xem
   * extensions.ts), nên đây chỉ chọn component chứ không đổi khối lượng tải.
   */
  loai: LoaiMuc
  // Chuyên khoa của bảng đang mở — chỉ để màn chờ vẽ đúng icon nét-đơn + màu nhận diện. Đi thẳng
  // qua cả hai màn chờ nối tiếp: Suspense fallback (tải chunk) và "Đang mở bảng…" trong EdgelessBoard.
  khoa?: string
  onReady?: () => void
  // Chuyển thẳng xuống EdgelessBoard thật — nhận hàm xuất PNG khi cây Lit gắn xong, null khi tháo.
  // TrangBaiViet không nhận prop này (bài viết không xuất PNG); adapter của nhánh 'bai-viet' bên
  // dưới đơn giản không chuyển tiếp nó.
  onXuatSanSang?: (xuat: XuatBangFn | null) => void
}
// Props của CHÍNH component được nạp — không có `loai`, vì `loai` chỉ dùng ở tầng vỏ này để CHỌN
// component, không phải một prop mà EdgelessBoard/TrangBaiViet thật sự khai báo.
type PropsVoTrong = Omit<PropsBang, 'loai'>

// Khoá gồm CẢ loại: hai vỏ là hai đối tượng lazy khác nhau, và cơ chế "thử lại bằng cách dựng một
// lazy MỚI" (xem chú thích dài ở đầu file về việc React.lazy nhớ vĩnh viễn promise bị từ chối) phải
// thử lại đúng vỏ đang hỏng.
const kho = new Map<string, ComponentType<PropsVoTrong>>()
function layBang(lan: number, loai: LoaiMuc): ComponentType<PropsVoTrong> {
  const khoaKho = `${loai}:${lan}`
  const co = kho.get(khoaKho)
  if (co) return co
  // PHẢI đứng trước `import()`: chunk bảng vẽ tiêm ~190 thẻ <style> vào <head> ngay khi nạp, và bộ
  // theo dõi bên trong chỉ bọc được thẻ nào rơi vào SAU khi nó chạy (xem ./lop-css-vendor.ts —
  // không bọc thì CSS không-lớp của BlockSuite đè mọi utility Tailwind của app, hỏng vĩnh viễn cả
  // những màn không liên quan). Hàm tự chặn gọi lại lần hai nên đặt trong layBang() là an toàn.
  batLopCssVendor()
  const moi =
    loai === 'bai-viet'
      ? // TrangBaiViet nhận `docId`, không phải `boardId` — adapter đổi tên prop ngay trong factory
        // thay vì ép kiểu (`as`) ở lời gọi: một cú `as` ở đây sẽ im lặng cho `docId` chạy
        // `undefined` bất cứ khi nào vỏ ngoài đổi tên prop mà không sửa tới đây.
        lazy(() =>
          import('./TrangBaiViet').then((m) => ({
            default: ({ boardId, khoa, onReady }: PropsVoTrong) => (
              <m.TrangBaiViet docId={boardId} khoa={khoa} onReady={onReady} />
            ),
          })),
        )
      : lazy(() => import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard })))
  kho.set(khoaKho, moi)
  return moi
}

interface State {
  loi: Error | null
  lan: number
}

export class EdgelessBoard extends Component<PropsBang, State> {
  state: State = { loi: null, lan: 0 }

  static getDerivedStateFromError(loi: Error): Partial<State> {
    return { loi }
  }

  componentDidCatch(loi: Error, info: ErrorInfo) {
    console.error('Không nạp được bảng vẽ:', loi, info.componentStack)
  }

  thuLai = () => {
    // Xoá đối tượng lazy hỏng khỏi kho rồi tăng số lần: lượt render kế tiếp dựng một lazy mới và
    // thật sự gọi `import()` lần nữa. Khoá phải khớp CHÍNH XÁC khoá đã dùng để lưu (loai:lan).
    kho.delete(`${this.props.loai}:${this.state.lan}`)
    this.setState((s) => ({ loi: null, lan: s.lan + 1 }))
  }

  render(): ReactNode {
    if (this.state.loi) {
      const tenMuc = this.props.loai === 'bai-viet' ? 'Bài viết' : 'Bảng vẽ'
      return (
        <div
          className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
          style={{ background: 'var(--c-page)', color: 'var(--c-text)' }}
        >
          <p className="text-[15px] font-bold">Cần mạng để tải lần đầu</p>
          <p className="text-[13px] max-w-[320px]" style={{ color: 'var(--c-text-muted)' }}>
            {tenMuc} được tải riêng và chỉ dùng được ngoại tuyến sau lần mở đầu tiên có mạng. Các
            phần còn lại của app vẫn dùng bình thường.
          </p>
          <button
            type="button"
            onClick={this.thuLai}
            className="h-11 px-5 rounded-2xl font-bold text-[13.5px]"
            style={{ background: 'var(--c-primary)', color: 'var(--c-on-bright)' }}
          >
            Thử lại
          </button>
        </div>
      )
    }

    // Suspense nằm TRONG boundary, không ngoài: chunk chưa tải xong thì hiện dòng chờ, tải hỏng
    // thì `getDerivedStateFromError` ở trên bắt trước khi lỗi kịp nổi lên tới src/main.tsx.
    const Bang = layBang(this.state.lan, this.props.loai)
    return (
      <Suspense
        fallback={
          // Cùng VeChuyenKhoaDangTai (line-drawing icon chuyên khoa) với màn "Đang mở bảng…" của
          // EdgelessBoard.tsx NGAY SAU đây trong cùng một thao tác mở bảng — trước đây hai màn chờ
          // nối tiếp nhau đọc như hai UI khác nhau (chữ xám tĩnh → giọt mực có thương hiệu), đúng lúc
          // bước vào "phòng thư giãn" của app (critique 2026-08-26 P2, persona Casey: mạng bệnh viện
          // chậm dễ đọc nhầm màn tĩnh là app treo). Bản vẽ chạy vòng KHÔNG bao giờ đứng im nên không
          // đọc nhầm là treo; dòng chữ giữ ở .sr-only.
          <div className="h-full flex flex-col items-center justify-center" role="status" aria-live="polite">
            <div style={{ width: 72, height: 72 }}>
              <VeChuyenKhoaDangTai khoa={this.props.khoa} />
            </div>
            {/* Nhãn phải theo `loai`: người dùng trình đọc màn hình nghe đúng thứ họ vừa mở. Cùng
                cặp chữ với thông điệp lỗi ở dòng 115 — đổi một chỗ thì đổi cả hai. */}
            <span className="sr-only">
              {this.props.loai === 'bai-viet' ? 'Đang tải bài viết…' : 'Đang tải bảng vẽ…'}
            </span>
          </div>
        }
      >
        <Bang
          boardId={this.props.boardId}
          khoa={this.props.khoa}
          onReady={this.props.onReady}
          onXuatSanSang={this.props.onXuatSanSang}
        />
      </Suspense>
    )
  }
}
