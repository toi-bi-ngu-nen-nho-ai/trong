import { useEffect, useRef } from "react"
import { gsap } from "gsap"

// Overlay che toàn app trong lúc chạy — tuyệt đối không được treo vĩnh viễn nếu timeline lỗi vì lý
// do bất ngờ, nên luôn có một timeout dự phòng gọi onFinished dù animation không bao giờ hoàn tất.
const SAFETY_TIMEOUT_MS = 6000

// Baloo 2 khai `font-display: swap` (nguyên văn từ Google Fonts CSS2 API — xem src/index.css). Ở
// lần mở đầu tiên, chưa có cache, chữ logo sẽ vẽ bằng font dự phòng `system-ui` rồi mới nhảy sang
// Baloo 2 giữa chừng. Ngoài cú nhảy thị giác, cổng này còn giữ ĐỘ ĐÚNG của phép đo: offset và hệ
// số phóng bên dưới đều lấy từ `getBoundingClientRect` của chữ T, mà hộp đó phụ thuộc font — đo
// lúc còn `system-ui` là chữ T hạ cánh lệch chỗ.
//
// Nhưng chờ KHÔNG được vô hạn: mạng chậm hoặc file font hỏng thì cú chờ này sẽ chồng thêm một
// khoảng treo NỮA lên trên SAFETY_TIMEOUT_MS. Vì vậy đua nó với một hạn giờ ngắn — hết 500ms là
// chạy tiếp, chấp nhận nguy cơ FOUT (tình huống hiếm) thay vì làm người dùng ngồi nhìn màn hình
// tĩnh (tình huống tệ hơn).
const FONT_READY_TIMEOUT_MS = 500

// Chữ T lúc đứng một mình (pha 1) nên chiếm khoảng chừng này của khung nhìn. Hệ số phóng được
// TÍNH NGƯỢC từ hai mốc đó chứ không cứng hoá: cỡ chữ giờ co theo màn hình (xem `CO_CHU` bên
// dưới), nên một hằng số phóng duy nhất sẽ cho chữ T bé tí trên PC và tràn trên máy nhỏ.
const T_CAO_MUC_TIEU = 0.42
const T_RONG_TOI_DA = 0.55

// Cỡ chữ của cụm logo. Kẹp theo CẢ hai chiều: `vw` cho máy dọc, `vh` cho điện thoại nằm ngang
// (844×390 — cao chỉ 390px, ca dễ vỡ nhất, cụm hai dòng sẽ tràn dọc nếu chỉ bám `vw`).
// Đo thật (Chrome, xem báo cáo Task 5): 1920×1080 → 104px (yêu cầu 90–110px); 844×390 → 66,3px;
// 820×1180 → 98,4px; 390×844 → 46,8px; 320 ngang → 44px (chạm sàn), vẫn còn lề mỗi bên.
const CO_CHU = "clamp(2.75rem, min(12vw, 17vh), 6.5rem)"

export function IntroOverlay({ onFinished }: { onFinished: () => void }) {
  const coverRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const letterTRef = useRef<HTMLSpanElement>(null)
  const bacSiRef = useRef<HTMLSpanElement>(null)
  const rongRef = useRef<HTMLSpanElement>(null)
  const rimRef = useRef<HTMLDivElement>(null)
  // React 19 StrictMode (dev — src/main.tsx bọc cả app) chạy effect theo nhịp setup → cleanup →
  // setup. Chốt này chặn hoạt cảnh khởi động HAI lần cùng lúc; nó được MỞ LẠI trong cleanup (xem
  // cuối effect) để lần setup thứ hai — lần thật sự sống — vẫn dựng được timeline và hạn giờ dự
  // phòng. Riêng nhánh reduced-motion thoát sớm mà KHÔNG đăng ký cleanup, nên chốt ở đó nằm im
  // vĩnh viễn — đúng như cần, vì đó là thứ duy nhất giữ cho onFinished chỉ nổ một lần ở nhánh này
  // (biến `daXong` bên dưới là biến cục bộ của mỗi lượt effect, không bắc cầu qua được).
  const startedRef = useRef(false)
  // onFinished có thể đổi identity giữa các lần render cha; giữ bản mới nhất qua ref thay vì đưa
  // vào dependency array, để effect chỉ chạy đúng một lần lúc mount.
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    // Hai đường cùng gọi finish (timeline xong / timeout dự phòng); cái nào tới trước cũng được,
    // nhưng chỉ MỘT lần — nếu không, khi cha giữ overlay lại (chưa unmount ngay) thì timeout còn
    // sống sẽ gọi onFinished lần thứ hai sau khi hoạt cảnh đã kết thúc êm.
    let daXong = false
    const finish = () => {
      if (daXong) return
      daXong = true
      onFinishedRef.current()
    }

    // Lối tắt trợ năng phải chạy NGAY, đồng bộ — không nấp sau cổng chờ font ở dưới. Nhánh này
    // không bao giờ bật cụm logo thành `visible`, nên nó để lại một khung nền phẳng; đo trên
    // Chrome thật (Task 5) thì cha gỡ overlay ngay trong cùng lượt commit, không ai kịp thấy.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish()
      return
    }

    let daHuy = false
    let tl: ReturnType<typeof gsap.timeline> | null = null
    let hanGioFont = 0

    // Hạn giờ dự phòng đặt NGAY tại đây (không đợi tới lúc dựng timeline): nếu cổng chờ font hỏng
    // theo cách không lường trước, overlay vẫn phải tự gỡ.
    const safety = window.setTimeout(finish, SAFETY_TIMEOUT_MS)

    const fontsReady = document.fonts
      ? Promise.race([
          document.fonts.ready,
          new Promise<void>((giaiQuyet) => {
            hanGioFont = window.setTimeout(giaiQuyet, FONT_READY_TIMEOUT_MS)
          }),
        ])
      : // Môi trường không có FontFaceSet (happy-dom lúc test, engine cũ) — không có gì để chờ.
        Promise.resolve()

    void fontsReady.then(() => {
      if (daHuy) return

      const cover = coverRef.current!
      const rim = rimRef.current!
      const letterT = letterTRef.current!

      // Đo lúc chữ T còn NGUYÊN vị trí ghép chữ (chưa gsap.set transform nào). `visibility: hidden`
      // vẫn chiếm chỗ trong layout nên hộp này đúng thật.
      const oT = letterT.getBoundingClientRect()
      const tamTX = oT.left + oT.width / 2
      const tamTY = oT.top + oT.height / 2

      // Dời chữ T ra tâm khung nhìn rồi cho nó chạy về 0/0/1 — hạ cánh CHÍNH XÁC vào ô của nó
      // trong "Trọng" mà không phải khớp thủ công toạ độ nào.
      const offsetX = window.innerWidth / 2 - tamTX
      const offsetY = window.innerHeight / 2 - tamTY
      const heSoPhong = Math.max(
        1,
        Math.min(
          (window.innerHeight * T_CAO_MUC_TIEU) / oT.height,
          (window.innerWidth * T_RONG_TOI_DA) / oT.width,
        ),
      )

      // Pha kết neo vào GIỮA MÀN HÌNH, không vào chỗ chữ T đậu. Chỗ đậu của chữ T lệch hẳn khỏi tâm
      // (đo trên 1280×632: T ở (528, 381) trong khi tâm là (640, 316) — lệch trái 112px, xuống 65px)
      // vì cả cụm "Bác sĩ / Trọng" mới là thứ được căn giữa, còn chữ T chỉ là ký tự đầu của dòng
      // dưới. Phóng chữ và mở lỗ từ điểm lệch đó làm cả đoạn cuối đổ về góc dưới-trái — chủ dự án
      // bác đúng cái này. Nên pha 4 kéo chữ T trở lại tâm trong lúc phóng to, và lỗ mở từ tâm.
      const W = window.innerWidth
      const H = window.innerHeight
      const tamManX = W / 2
      const tamManY = H / 2
      const maxRadius = Math.hypot(W, H) / 2 + 40

      // Khung vẽ đầu tiên phải sạch: JSX để cụm logo `visibility: hidden`, và nó chỉ được bật lên
      // TẠI ĐÂY, cùng lượt với các transform mở màn. Nếu bật sớm hơn, người dùng thấy nguyên cái
      // kết (chữ "Bác sĩ Trọng" đủ nét, chữ T cỡ 1x) suốt thời gian chờ font rồi mới giật về pha 1.
      // Dùng `visibility` chứ không `opacity`: gsap đang chỉnh `opacity` của từng chữ, hai bên sẽ
      // giẫm chân nhau.
      gsap.set(logoRef.current, { visibility: "visible" })
      gsap.set(letterT, { x: offsetX, y: offsetY, scale: heSoPhong })
      gsap.set(bacSiRef.current, { opacity: 0, y: -25, scale: 0.95 })
      gsap.set(rongRef.current, { opacity: 0, x: 25, scale: 0.95 })
      gsap.set(rim, { width: 0, height: 0, opacity: 0, left: tamManX, top: tamManY })

      tl = gsap.timeline({ onComplete: finish })

      // Pha 1–2: chữ T bay về chỗ, hai vế ghép vào khi nó còn đang hạ cánh (chồng lấn -=0.5).
      tl.to(letterT, { x: 0, y: 0, scale: 1, duration: 1.2, ease: "power3.inOut" })
        .to(
          bacSiRef.current,
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.2)" },
          "-=0.5",
        )
        .to(
          rongRef.current,
          { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: "power2.out" },
          "-=0.5",
        )
        // Pha 3: giữ nhịp cho người xem kịp đọc "Bác sĩ Trọng".
        .to({}, { duration: 0.35 })
        // Pha 4: hai vế mờ đi, chỉ còn chữ T xanh lao thẳng vào mặt người xem rồi mở ra app.
        .to([bacSiRef.current, rongRef.current], { opacity: 0, duration: 0.2, ease: "power1.in" })
        // Kéo chữ T về đúng tâm khung nhìn TRONG LÚC phóng to: cùng một cặp `offsetX/offsetY` đã
        // dùng để dời nó ra tâm ở pha 1, nên đích đến là chính xác tâm màn hình, không phải một
        // hiệu chỉnh áng chừng.
        .to(letterT, { x: offsetX, y: offsetY, scale: 18, duration: 0.5, ease: "power2.in" })
        .to(
          { r: 0 },
          {
            r: maxRadius,
            duration: 0.55,
            ease: "power2.out",
            onUpdate: function (this: { targets: () => unknown[] }) {
              const r = (this.targets()[0] as { r: number }).r
              const inner = Math.max(r - 4, 0)
              const mask = `radial-gradient(circle at ${tamManX}px ${tamManY}px, transparent 0, transparent ${inner}px, black ${r}px, black 100%)`
              cover.style.maskImage = mask
              cover.style.webkitMaskImage = mask
              rim.style.width = `${r * 2}px`
              rim.style.height = `${r * 2}px`
              rim.style.opacity = r > 4 ? "1" : "0"
            },
          },
          // Chồng lấn vào cuối cú phóng: lỗ bắt đầu mở khi chữ T còn đang lớn dần.
          "-=0.18",
        )
    })

    return () => {
      daHuy = true
      tl?.kill()
      window.clearTimeout(hanGioFont)
      window.clearTimeout(safety)
      // Dọn xong sạch sẽ thì chốt không còn giữ gì nữa — mở lại để nhịp giả setup → cleanup →
      // setup của StrictMode kết thúc bằng một lần setup ĐẦY ĐỦ. Ở lần unmount thật, component
      // đã bị gỡ nên không còn effect nào chạy nữa, việc mở chốt là vô hại.
      startedRef.current = false
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto overflow-hidden" role="presentation" aria-hidden="true">
      <div
        ref={coverRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "var(--c-intro-bg, #f6f6f6)" }}
      >
        <div
          id="introLogo"
          ref={logoRef}
          className="flex flex-col items-center leading-tight font-extrabold"
          style={{ fontFamily: "var(--font-baloo)", fontSize: CO_CHU, visibility: "hidden" }}
        >
          <span id="textBacSi" ref={bacSiRef} style={{ color: "var(--c-intro-ink)" }}>
            Bác sĩ
          </span>
          {/* CHỈ MỘT chữ T trong toàn cụm — chính chữ T này bay về từ giữa màn hình. Đừng thêm chữ
              T thứ hai vào #textRong: đó đúng là lỗi chủ dự án bác ở bản trước. */}
          <span className="flex items-baseline">
            <span
              id="letterT"
              ref={letterTRef}
              className="inline-block"
              style={{ color: "var(--c-intro-blue)", transformOrigin: "center" }}
            >
              T
            </span>
            <span id="textRong" ref={rongRef} className="inline-block" style={{ color: "var(--c-intro-ink)" }}>
              rọng
            </span>
          </span>
        </div>
      </div>
      {/* Tâm vòng sáng do gsap đặt (tâm khung nhìn, đo lúc chạy — không dùng được `left: 50%` vì
          cùng lượt đó gsap ghi đè `left` bằng px). Trước lúc đó phải tắt
          hẳn bằng opacity 0 + cỡ 0, nếu không viền + quầng sáng sẽ hiện thành một chấm xanh ở góc
          trên trái suốt cả hoạt cảnh. */}
      <div
        ref={rimRef}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          boxShadow: "0 0 24px 6px var(--c-intro-blue)",
          border: "2px solid var(--c-intro-blue)",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          opacity: 0,
        }}
      />
    </div>
  )
}
