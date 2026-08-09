import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { applyTheme, loadTheme } from './lib/theme'
import { fixViewportHeight } from './lib/viewportHeight'
import { ErrorBoundary } from './components/ErrorBoundary'

// Áp chủ đề TRƯỚC khi render: làm sau thì người dùng chọn nền tối vẫn thấy một nháy trắng mỗi lần
// mở app — chói mắt đúng vào lúc muốn tránh nhất.
applyTheme(loadTheme())

// Đặt --vvh TRƯỚC khi render, cùng lý do với applyTheme ở trên: để lần vẽ đầu tiên đã dùng đúng
// chiều cao, không phải chờ một effect chạy sau khi cây React đã lên.
fixViewportHeight()

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
