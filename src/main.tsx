import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { applyTheme, loadTheme, watchSystemTheme } from './lib/theme'
import { ErrorBoundary } from './components/ErrorBoundary'

// Áp chủ đề TRƯỚC khi render: làm sau thì người dùng chọn nền tối vẫn thấy một nháy trắng mỗi lần
// mở app — chói mắt đúng vào lúc muốn tránh nhất.
applyTheme(loadTheme())
// Máy đổi sáng/tối trong lúc app đang mở — chỉ cần cập nhật lại thẻ theme-color (thanh trạng thái),
// mọi màu còn lại đã tự đổi theo @media. Không cần gỡ: sống đúng bằng vòng đời trang.
watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Đăng ký sau khi render để không làm chậm lần vẽ đầu tiên. Chỉ chạy ở bản build thật — ở chế độ
// dev, service worker cache lại module của Vite sẽ làm hot reload hoạt động sai.
registerServiceWorker()
