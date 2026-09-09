import { Component, type ErrorInfo, type ReactNode } from "react"

// Lưới an toàn cuối cùng cho CẢ APP — trước đây không có gì bắt lỗi runtime, nên một lỗi bất kỳ
// (dữ liệu hỏng lọt qua chỗ khác, một lần truy cập thuộc tính của undefined...) làm React tháo sạch
// cây component đang vẽ, để lại một trang trắng không lối thoát ngoài việc người dùng tự xoá dữ liệu
// trình duyệt. Bọc App bằng boundary này thì lỗi chỉ làm mất MÀN HÌNH ĐANG XEM, không mất cả ứng
// dụng, và có một nút để thử lại thay vì phải tự đoán cách sửa.
interface State {
  error: Error | null
}

// Đường dẫn để tải lại sau khi gặp lỗi: GIỮ NGUYÊN mọi thứ, TRỪ tham số `screen`.
//
// Vì sao: public/manifest.json có các lối tắt kiểu `"/?screen=mindmap"` cài ra màn hình chính, và
// App đọc tham số đó lúc mount để vào thẳng tab tương ứng. Nếu chính màn hình ĐÓ là thứ ném lỗi,
// nút "Tải lại trang" cũ (`location.reload()`) giữ nguyên tham số và dựng lại đúng màn hình vừa
// chết — vòng lặp kín. Trong một PWA đã cài (standalone) không có thanh địa chỉ để sửa URL, nên
// người dùng mất luôn cả app chứ không chỉ một tab.
// Bỏ `screen` đi thì lần tải lại nào cũng rơi về Trang chủ — một lối thoát luôn tồn tại.
export function duongDanPhucHoi(href: string): string {
  const url = new URL(href)
  url.searchParams.delete('screen')
  return url.toString()
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lỗi không bắt được:", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
        style={{ background: "var(--c-page)", color: "var(--c-text)" }}
      >
        <p className="text-[15px] font-bold">Đã có lỗi xảy ra</p>
        <p className="text-[13px] max-w-[320px]" style={{ color: "var(--c-text-muted)" }}>
          Dữ liệu đã lưu vẫn còn nguyên trên máy. Tải lại trang để tiếp tục — nếu lỗi lặp lại ở đúng
          một bảng/bài, đó là bảng cần được sửa lại.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null })
            // `replace`, không phải `assign`: không để lại URL mang `?screen=` trong lịch sử để
            // nút Back của trình duyệt đưa người dùng quay lại đúng màn hình vừa chết.
            window.location.replace(duongDanPhucHoi(window.location.href))
          }}
          className="h-11 px-5 rounded-2xl font-bold text-[13.5px]"
          style={{ background: "var(--c-primary)", color: "var(--c-on-primary)" }}
        >
          Tải lại trang
        </button>
      </div>
    )
  }
}
