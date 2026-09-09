import { useEffect, useRef } from "react"
import { gsap } from "gsap"

// Overlay che toàn app trong lúc chạy — tuyệt đối không được treo vĩnh viễn nếu timeline lỗi vì lý
// do bất ngờ, nên luôn có một timeout dự phòng gọi onFinished dù animation không bao giờ hoàn tất.
const SAFETY_TIMEOUT_MS = 6000

// Baloo 2 khai `font-display: swap` (nguyên văn từ Google Fonts CSS2 API — xem src/index.css). Ở
// lần mở đầu tiên, chưa có cache, chữ logo sẽ vẽ bằng font dự phòng `system-ui` rồi mới nhảy sang
// Baloo 2 giữa chừng — đúng vào pha "chữ T thu về" nên rất dễ thấy. Chờ `document.fonts.ready`
// trước khi khởi động timeline sẽ dập tắt cú nhảy đó.
//
// Nhưng chờ KHÔNG được vô hạn: mạng chậm hoặc file font hỏng thì cú chờ này sẽ chồng thêm một
// khoảng treo NỮA lên trên SAFETY_TIMEOUT_MS. Vì vậy đua nó với một hạn giờ ngắn — hết 500ms là
// chạy tiếp, chấp nhận nguy cơ FOUT (tình huống hiếm) thay vì làm người dùng ngồi nhìn màn hình
// tĩnh (tình huống tệ hơn).
const FONT_READY_TIMEOUT_MS = 500

export function IntroOverlay({ onFinished }: { onFinished: () => void }) {
  const coverRef = useRef<HTMLDivElement>(null)
  const letterTRef = useRef<HTMLSpanElement>(null)
  const bacSiRef = useRef<HTMLSpanElement>(null)
  const trongRef = useRef<HTMLSpanElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const ringsRef = useRef<HTMLDivElement>(null)
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

    // Lối tắt trợ năng phải chạy NGAY, đồng bộ — không nấp sau cổng chờ font ở dưới.
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
      const maxRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40

      gsap.set(letterTRef.current, { scale: 3.6 })
      gsap.set([bacSiRef.current, trongRef.current], { opacity: 0, y: 12 })
      gsap.set(dropRef.current, { opacity: 0, y: -80 })
      gsap.set(ringsRef.current!.children, { opacity: 0, scale: 0.3 })
      gsap.set(rim, { width: 0, height: 0, opacity: 0 })

      tl = gsap.timeline({ onComplete: finish })

      tl.to(letterTRef.current, { scale: 1, duration: 1.2, ease: "power3.inOut" })
        .to(bacSiRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }, "-=0.5")
        .to(trongRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.5")
        .to({}, { duration: 0.3 }) // giữ logo một nhịp trước khi giọt nước rơi
        .to(dropRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "bounce.out" })
        .to(dropRef.current, { opacity: 0, duration: 0.1 })
        .to(
          ringsRef.current!.children,
          { opacity: 0, scale: 1.6, duration: 0.25, stagger: 0.06, ease: "power1.out" },
          "<",
        )
        .to(
          { r: 0 },
          {
            r: maxRadius,
            duration: 0.55,
            ease: "power2.out",
            onUpdate: function (this: { targets: () => unknown[] }) {
              const r = (this.targets()[0] as { r: number }).r
              const inner = Math.max(r - 4, 0)
              const mask = `radial-gradient(circle at 50% 50%, transparent 0, transparent ${inner}px, black ${r}px, black 100%)`
              cover.style.maskImage = mask
              cover.style.webkitMaskImage = mask
              rim.style.width = `${r * 2}px`
              rim.style.height = `${r * 2}px`
              rim.style.opacity = r > 4 ? "1" : "0"
            },
          },
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
        <div className="flex flex-col items-center gap-1" style={{ fontFamily: "var(--font-baloo)" }}>
          <span
            id="letterT"
            ref={letterTRef}
            className="block text-[64px] leading-none font-extrabold"
            style={{ color: "var(--c-intro-blue)" }}
          >
            T
          </span>
          <span className="flex flex-col items-center leading-tight text-[28px] font-extrabold">
            <span id="textBacSi" ref={bacSiRef} style={{ color: "var(--c-intro-ink)" }}>
              Bác sĩ
            </span>
            <span id="textRong" ref={trongRef}>
              <span style={{ color: "var(--c-intro-blue)" }}>T</span>
              <span style={{ color: "var(--c-intro-ink)" }}>rọng</span>
            </span>
          </span>
        </div>
        <div
          ref={dropRef}
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--c-intro-blue)" }}
        />
        <div ref={ringsRef} className="absolute left-1/2 top-1/2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                borderColor: "var(--c-intro-blue)",
                width: `${40 + i * 28}px`,
                height: `${40 + i * 28}px`,
              }}
            />
          ))}
        </div>
      </div>
      <div
        ref={rimRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ boxShadow: "0 0 24px 6px var(--c-intro-blue)", border: "2px solid var(--c-intro-blue)" }}
      />
    </div>
  )
}
