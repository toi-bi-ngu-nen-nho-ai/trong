// Vỏ nạp chậm của bảng vẽ — MỌI chỗ trong app phải đi qua đây, không import thẳng
// `./EdgelessBoard`.
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
import {
  Component,
  createRef,
  lazy,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  type RefAttributes,
} from 'react'

import { batLopCssVendor } from './lop-css-vendor'
import type { EdgelessBoardHandle } from './EdgelessBoard'

// `React.lazy` NHỚ VĨNH VIỄN kết quả lượt gọi factory đầu tiên — kể cả một promise BỊ TỪ CHỐI.
// Nghĩa là bấm "Thử lại" trên cùng một đối tượng lazy sẽ ném lại đúng lỗi cũ mà không hề chạm
// mạng, dù sóng đã có trở lại. Cách duy nhất để thử lại thật là dựng một đối tượng lazy MỚI.
// Kho dưới đây giữ đúng một đối tượng cho mỗi lần thử, để các lượt re-render bình thường của React
// không dựng lại (và không tháo/lắp lại) bảng vẽ đang chạy.
type PropsBang = {
  boardId: string
  onReady?: () => void
  mauNhanDien?: number
}
// RefAttributes<EdgelessBoardHandle>: EdgelessBoard.tsx giờ là forwardRef, lộ ra đúng một hành
// động (`xuatPng`) — BoardGallery.tsx cầm ref NÀY để gọi xuất PNG từ nút "⋯" của CHÍNH NÓ (đứng
// cạnh nút "quay lại", ngoài vùng vẽ), thay vì màn vẽ tự vẽ menu xuất/đổi tên/đổi chuyên khoa như
// lượt trước đã hiểu sai (phản hồi thật 2026-08-27, lần 2: "dồn về BoardGallery... màn làm việc
// mindmap sửa cái đó làm gì").
type BangComponent = ComponentType<PropsBang & RefAttributes<EdgelessBoardHandle>>
const kho = new Map<number, BangComponent>()
function layBang(lan: number): BangComponent {
  const co = kho.get(lan)
  if (co) return co
  // PHẢI đứng trước `import()`: chunk bảng vẽ tiêm ~190 thẻ <style> vào <head> ngay khi nạp, và bộ
  // theo dõi bên trong chỉ bọc được thẻ nào rơi vào SAU khi nó chạy (xem ./lop-css-vendor.ts —
  // không bọc thì CSS không-lớp của BlockSuite đè mọi utility Tailwind của app, hỏng vĩnh viễn cả
  // những màn không liên quan). Hàm tự chặn gọi lại lần hai nên đặt trong layBang() là an toàn.
  batLopCssVendor()
  const moi = lazy(() => import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard })))
  kho.set(lan, moi)
  return moi
}

interface State {
  loi: Error | null
  lan: number
}

export class EdgelessBoard extends Component<PropsBang, State> {
  state: State = { loi: null, lan: 0 }
  // Ref tới INSTANCE thật (EdgelessBoard.tsx, sau lazy+forwardRef) — React tự gắn lại ref này vào
  // đúng instance mới mỗi khi Suspense/lazy resolve xong hoặc "Thử lại" dựng lại cây, không cần
  // logic thủ công nào ở đây.
  private bangRef = createRef<EdgelessBoardHandle>()

  // Public: BoardGallery.tsx gọi qua `ref` tới CHÍNH class này (`<EdgelessBoard ref={...} />`).
  // Không tự try/catch ở đây — EdgelessBoard.tsx (bamXuat) đã tự hiện băng lỗi `loiXuat` ngay trên
  // canvas, đúng nơi người dùng đang nhìn lúc bấm xuất.
  xuatPng = () => {
    this.bangRef.current?.xuatPng()
  }

  static getDerivedStateFromError(loi: Error): Partial<State> {
    return { loi }
  }

  componentDidCatch(loi: Error, info: ErrorInfo) {
    console.error('Không nạp được bảng vẽ:', loi, info.componentStack)
  }

  thuLai = () => {
    // Xoá đối tượng lazy hỏng khỏi kho rồi tăng số lần: lượt render kế tiếp dựng một lazy mới và
    // thật sự gọi `import()` lần nữa.
    kho.delete(this.state.lan)
    this.setState((s) => ({ loi: null, lan: s.lan + 1 }))
  }

  render(): ReactNode {
    if (this.state.loi) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
          style={{ background: 'var(--c-page)', color: 'var(--c-text)' }}
        >
          <p className="text-[15px] font-bold">Cần mạng để tải lần đầu</p>
          <p className="text-[13px] max-w-[320px]" style={{ color: 'var(--c-text-muted)' }}>
            Bảng vẽ được tải riêng và chỉ dùng được ngoại tuyến sau lần mở đầu tiên có mạng. Các
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
    const Bang = layBang(this.state.lan)
    return (
      <Suspense
        fallback={
          // Cùng .mind-loading-ink (giọt mực loang) với màn "Đang mở bảng…" của EdgelessBoard.tsx
          // NGAY SAU đây trong cùng một thao tác mở bảng — trước đây hai màn chờ nối tiếp nhau đọc
          // như hai UI khác nhau (chữ xám tĩnh → giọt mực có thương hiệu), đúng lúc bước vào "phòng
          // thư giãn" của app (critique 2026-08-26 P2, persona Casey: mạng bệnh viện chậm dễ đọc
          // nhầm màn tĩnh là app treo).
          <div
            className="h-full flex flex-col items-center justify-center gap-3 text-[13px]"
            style={{ color: 'var(--c-text-muted, #6b6e96)' }}
          >
            <div className="mind-loading-ink" aria-hidden="true" />
            <span>Đang tải bảng vẽ…</span>
          </div>
        }
      >
        <Bang
          ref={this.bangRef}
          boardId={this.props.boardId}
          onReady={this.props.onReady}
          mauNhanDien={this.props.mauNhanDien}
        />
      </Suspense>
    )
  }
}
