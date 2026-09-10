import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { donKhoaRacHeCu } from './lib/storage'
import { applyTheme, loadTheme, watchSystemTheme } from './lib/theme'
import { batDauBuChieuCaoMan } from './lib/buChieuCaoMan'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroOverlay } from './components/IntroOverlay'

// Dọn khoá localStorage của bài viết tự nhập hệ cũ — không còn ai đọc từ giai đoạn 8, và đường tự
// dọn cũ (`legacyLocalKey` của useIdbCollection) đã chết cùng lượt đó. Đặt ở đây vì phải chạy đúng
// một lần cho mỗi lần mở app, không gắn với màn hình nào. Đồng bằng giai đoạn 9 ở phía IndexedDB:
// `deleteObjectStore` ba store hệ cũ trong src/lib/idb.ts.
donKhoaRacHeCu()

// Áp chủ đề TRƯỚC khi render: làm sau thì người dùng chọn nền tối vẫn thấy một nháy trắng mỗi lần
// mở app — chói mắt đúng vào lúc muốn tránh nhất.
applyTheme(loadTheme())
// Máy đổi sáng/tối trong lúc app đang mở — chỉ cần cập nhật lại thẻ theme-color (thanh trạng thái),
// mọi màu còn lại đã tự đổi theo @media. Không cần gỡ: sống đúng bằng vòng đời trang.
watchSystemTheme()

// Đo phần khung nhìn còn thiếu so với màn hình vật lý rồi ghi vào --vh-thieu; `body` trong
// index.css cộng đúng chừng đó. Chỉ khác 0 khi app đã cài ra màn hình chính VÀ máy thật sự báo
// thiếu — xem lib/buChieuCaoMan.ts để biết vì sao phép này phải ĐO chứ không được đoán trong CSS.
// Đặt trước render: chạy sau thì lần vẽ đầu vẫn hở một dải rồi mới co lại, mắt bắt được.
batDauBuChieuCaoMan()

// App mount NGAY (ngầm, dưới overlay) để kịp khởi tạo IndexedDB/context trong lúc intro đang chạy —
// hết overlay là App đã sẵn sàng, không có khoảng trắng/loading. Không cờ localStorage: overlay chỉ
// mount đúng một lần cho mỗi lần main.tsx thực thi, tức mỗi lần PWA khởi động thật.
function Root() {
  const [introDone, setIntroDone] = useState(false)
  return (
    <>
      <App />
      {!introDone && <IntroOverlay onFinished={() => setIntroDone(true)} />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Đăng ký sau khi render để không làm chậm lần vẽ đầu tiên. Chỉ chạy ở bản build thật — ở chế độ
// dev, service worker cache lại module của Vite sẽ làm hot reload hoạt động sai.
registerServiceWorker()
