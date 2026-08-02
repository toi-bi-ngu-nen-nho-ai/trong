import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { applyTheme, loadTheme } from './lib/theme'

// Áp chủ đề TRƯỚC khi render: làm sau thì người dùng chọn nền tối vẫn thấy một nháy trắng mỗi lần
// mở app — chói mắt đúng vào lúc muốn tránh nhất.
applyTheme(loadTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Đăng ký sau khi render để không làm chậm lần vẽ đầu tiên. Chỉ chạy ở bản build thật — ở chế độ
// dev, service worker cache lại module của Vite sẽ làm hot reload hoạt động sai.
registerServiceWorker()
