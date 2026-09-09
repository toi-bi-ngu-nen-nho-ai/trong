# Thiết kế: hoạt cảnh intro ngắn khi mở PWA (chữ T → wordmark → giọt nước → HomeScreen)

Ngày: **2026-09-09**. Trạng thái: đã chốt thiết kế qua brainstorm (3 vòng hỏi-đáp + 1 video mẫu),
làm trực tiếp (không qua subagent-driven-development — một component tự chứa, không đụng kiến trúc
màn hình hiện có).

Nguồn: yêu cầu trực tiếp của người dùng trong phiên này — đoạn GSAP timeline mẫu (`#letterT`,
`#textBacSi`, `#textRong`), 2 ảnh logo tham khảo (chữ "T" xanh phóng to, wordmark "Bác sĩ Trọng"),
và một video game (`template.mp4`, ao sen 8 vịt con) dùng làm tham khảo CHUYỂN ĐỘNG cho hiệu ứng
giọt nước — không dùng màu/nội dung của video đó.

---

## 1. Vấn đề

App hiện chưa có màn chào (intro/splash) nào — `main.tsx` render thẳng `<App/>` sau khi áp theme.
Người dùng muốn một hoạt cảnh ngắn mỗi lần mở PWA từ đầu (cold start): chữ "T" phóng to thu về đúng
vị trí trong wordmark "Bác sĩ Trọng", giữ một nhịp, rồi một giọt nước xanh rơi từ mép trên, chạm nảy,
lan toả thành vòng tròn — và bên trong vòng đang lan đó lộ thẳng HomeScreen (không phủ trắng toàn
màn hình rồi mới fade lộ ra, theo yêu cầu rút gọn thời lượng của người dùng).

Ràng buộc từ `AGENTS.md`/quy ước dự án: app phải chạy được offline (service worker cache), hiện chỉ
tự host một font (`InterVariable.woff2` qua `public/fonts/`, khai trong `src/index.css`) — không có
font/script nào tải qua CDN ngoài.

## 2. Quyết định

| Câu hỏi | Chốt | Vì sao |
|---|---|---|
| Gắn intro vào đâu? | **Overlay chạy song song với `<App/>`** trong `main.tsx` (không đụng `App.tsx`) | `App.tsx` đã hàng nghìn dòng, chục biến thể `Screen` — nhét một hiệu ứng thuần trình diễn vào đó tăng khớp nối không cần thiết. Mount `<App/>` ngầm cùng lúc với overlay để nó kịp khởi tạo IDB/context trong lúc overlay đang chạy — hết overlay là `App` đã sẵn sàng, không có khoảng trắng/loading. |
| Tần suất hiện? | **Mỗi cold start**, không cờ `localStorage` | `main.tsx` chỉ chạy một lần cho mỗi lần PWA khởi động thật (đóng hẳn rồi mở lại) — mount overlay vô điều kiện trong `main.tsx` đã tự nhiên cho đúng hành vi này, không chạy lại khi chuyển màn hình nội bộ. Không cần state lưu trữ nào cả. |
| Nguồn cho "chữ T" + wordmark? | **Dựng lại bằng text thật**, không dùng file ảnh | Khớp cấu trúc `#letterT`/`#textBacSi`/`#textRong` trong đoạn code mẫu người dùng đưa — mỗi chữ là một phần tử DOM animate độc lập; không phải quản lý asset ảnh mới. |
| Font? | **Baloo 2, tự host** giống Inter hiện tại | Baloo 2 là biến thể Latin phổ biến nhất, khớp phong cách bo tròn-đậm trong ảnh mẫu. Tự host giữ app hoạt động offline đúng quy ước hiện có — tải qua CDN sẽ làm intro lỗi font khi mất mạng. |
| Màu logo/giọt nước? | **Token màu riêng, cố định**, không dùng `--c-primary` | `--c-primary` (#2d3a94, tối/indigo, tự đổi dark mode) khác tông với ảnh mẫu người dùng gửi (xanh sáng). Bộ nhận diện của màn chào không nên đổi theo theme — cố định một giá trị (khởi điểm `#2f6fed`, tinh chỉnh bằng mắt khi lên trình duyệt cho khớp ảnh mẫu). |
| Bước "phủ trắng" trước khi lộ HomeScreen? | **Bỏ hẳn** | Người dùng xem video mẫu xong yêu cầu rút ngắn: vòng tròn đang lan chính là cửa sổ hé lộ HomeScreen luôn, không có bước giữ toàn màn trắng rồi fade riêng — giống cơ chế circle-wipe trong video tham khảo. |
| Cho bỏ qua (tap-to-skip)? | **Không làm** | Thời lượng đã rút xuống ~2.4-2.6s ("ngắn" đúng yêu cầu ban đầu) — thêm nút/thao tác bỏ qua là một quyết định UX mới người dùng chưa yêu cầu (YAGNI). Có thể bổ sung sau nếu thấy phiền. |
| Chặn thao tác trong lúc chạy? | **Có** — overlay giữ `pointer-events: auto` suốt vòng đời, kể cả khi vùng tròn đã lộ HomeScreen bằng mắt | Tránh trạng thái nửa-tương-tác kỳ lạ (chạm được vào HomeScreen ở giữa khi rìa ngoài vẫn đang che) — gỡ hẳn overlay khỏi DOM mới cho tương tác. |

## 3. Thiết kế kỹ thuật

### Cấu trúc file

- **Mới** `src/components/IntroOverlay.tsx` — toàn bộ hoạt cảnh, không phụ thuộc state của `App`.
- **Mới** `src/components/__tests__/IntroOverlay.spec.tsx`.
- **Sửa** `src/main.tsx` — bọc `<App/>` bằng một `Root` nhỏ, render kèm `IntroOverlay`.
- **Sửa** `src/index.css` — `@font-face` cho Baloo 2, token `--c-intro-blue` (cố định, không nhánh
  dark mode), `--font-baloo`.
- **Sửa** `package.json`/`package-lock.json` — thêm dependency `gsap` (cài qua npm, không CDN).
- **Mới** `public/fonts/Baloo2-*.woff2` — **cần xin phép tải file trước khi thực hiện** (quy tắc an
  toàn của phiên: tải file luôn cần xác nhận rõ ràng, sẽ hỏi đúng lúc bắt tay triển khai với
  tên file/nguồn/dung lượng cụ thể).

### `main.tsx`

```tsx
function Root() {
  const [introDone, setIntroDone] = useState(false)
  return (
    <>
      <App />
      {!introDone && <IntroOverlay onFinished={() => setIntroDone(true)} />}
    </>
  )
}
```

`ReactDOM.createRoot(...).render(<StrictMode><ErrorBoundary><Root/></ErrorBoundary></StrictMode>)`
thay cho `<App/>` trực tiếp. `applyTheme(loadTheme())` trước `render()` giữ nguyên vị trí — chạy
trước cả overlay, không nhấp nháy sai theme dưới lớp phủ.

### `IntroOverlay.tsx` — timeline (~2.4–2.6s)

1. **Chữ T phóng to → thu về vị trí thật** trong wordmark (`gsap.set` scale 3.6x tại giữa canvas →
   `tl.to` scale 1, x/y 0, `power3.inOut`, 1.2s) — nguyên văn timeline mẫu người dùng đưa.
2. **"Bác sĩ" / "Trọng" fade+slide vào**, chồng lấn `-=0.5` như bản mẫu (~0.6s tổng).
3. **Giữ logo** ~0.3s.
4. **Giọt nước** (chấm tròn nhỏ, `--c-intro-blue`) rơi từ mép trên xuống đúng toạ độ neo của khối
   logo (giữa canvas — cùng điểm chữ T đã thu về ở bước 1, để chuyển động có điểm tựa liền mạch),
   để lại vệt sáng mờ dần theo sau, nảy nhẹ một nhịp khi chạm (~0.4s).
5. **Bùng sáng tại điểm chạm** + 2-3 vòng gợn mờ dần lan nhanh ra ngoài trước vòng chính (~0.25s) —
   mượn nhịp "concentric rings" quan sát được ở giữa video mẫu.
6. **Vòng chính lan ra phủ hết viewport, lộ thẳng HomeScreen bên trong**:
   - Bán kính lan là MỘT giá trị số (`{r: 0}`) do gsap tween tới bán kính đường chéo viewport
     (`power2.out`, ~0.5-0.6s).
   - `onUpdate` cập nhật `mask-image: radial-gradient(circle at <điểm chạm>, transparent 0, transparent <r-4>px, black <r>px, black 100%)`
     trên lớp phủ chứa logo (`.intro-cover`) — bên trong bán kính là lỗ trong suốt (lộ `<App/>` đã
     mount sẵn phía dưới), ngoài bán kính vẫn che kín. Dùng `mask-image`/`transform`/`opacity` —
     không đụng thuộc tính gây layout, đúng khuyến nghị gsap-performance.
   - Một `div` viền tròn riêng (`box-shadow` glow, cùng tông `--c-intro-blue`) đồng bộ kích thước
     với `r` mỗi frame, vẽ mép sáng chạy theo biên vòng lan — echo hiệu ứng viền sáng thấy trong
     video mẫu.
   - Khi `r` chạm bán kính đường chéo, timeline `onComplete` gọi `onFinished()` — cha (`Root`) set
     `introDone = true`, `IntroOverlay` unmount khỏi DOM.

### An toàn / edge case

- **`prefers-reduced-motion: reduce`**: bỏ qua toàn bộ animation, gọi `onFinished()` gần như ngay
  lập tức (không dựng timeline).
- **Timeout dự phòng** (`setTimeout(onFinished, 6000)`, huỷ trong cleanup) — overlay che toàn bộ
  app nên tuyệt đối không được treo vĩnh viễn nếu timeline lỗi vì lý do bất ngờ.
- **React 19 StrictMode** (dev) double-invoke effect: dùng ref cờ (`startedRef`) chặn tạo timeline
  hai lần; `tl.kill()` trong cleanup luôn chạy.
- **z-index**: overlay phải nằm trên MỌI lớp phủ khác hiện có (banner cập nhật service worker,
  dialog...) — kiểm giá trị z-index cao nhất đang dùng trong `src/index.css` lúc triển khai, đặt
  token `--z-intro` cao hơn hẳn.

## 4. Không làm

- Không thêm cờ bật/tắt intro (localStorage, query param, hay setting) — chưa ai yêu cầu, YAGNI.
- Không thêm nút/thao tác bỏ qua (xem bảng quyết định mục 2).
- Không tái dùng `--c-primary`/`--c-accent*` cho màu logo — token riêng, xem mục 2.
- Không đụng `App.tsx` — overlay hoàn toàn độc lập, gỡ được mà không để lại dấu vết trong màn hình
  chính nào.
- Không giữ lại bước phủ trắng toàn màn hình trước khi lộ HomeScreen (đã bỏ theo yêu cầu rút gọn).

## 5. Kiểm chứng

- Ca kiểm cho `IntroOverlay` (`vitest` + `@testing-library/react`, `happy-dom`):
  - Render ra đủ các phần tử `#letterT`/`#textBacSi`/`#textRong` mà timeline nhắm tới (không kiểm
    animation theo pixel/thời gian thật).
  - `prefers-reduced-motion: reduce` (mock `matchMedia`) → `onFinished` được gọi gần như ngay lập
    tức, không tạo timeline.
  - Unmount giữa chừng → không throw, timeline được kill (mock `gsap.timeline().kill`).
  - Timeout dự phòng: giả lập `onComplete` không bao giờ gọi → `onFinished` vẫn được gọi sau
    ngưỡng timeout (dùng vitest fake timers).
- Kiểm tay trên trình duyệt (bắt buộc, vì đây là animation trực quan):
  - Mở app từ đầu: đúng trình tự 6 bước, tổng thời lượng ~2.4-2.6s, không có khoảng trắng/giật giữa
    lúc overlay gỡ và HomeScreen hiện ra.
  - Bật "Reduce motion" hệ điều hành → intro gần như bị bỏ qua, vào thẳng HomeScreen.
  - Thu nhỏ/responsive (điện thoại thật hoặc `resize_window`): điểm chạm giọt nước và bán kính lan
    vẫn đúng giữa canvas, phủ hết viewport ở mọi kích thước.
  - Sau khi intro xong: HomeScreen tương tác được bình thường (chạm không bị chặn bởi overlay còn
    sót lại trong DOM).
