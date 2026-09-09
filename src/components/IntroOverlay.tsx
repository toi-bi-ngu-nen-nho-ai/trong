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

      // Pha kết neo vào ĐÚNG CHỖ CHỮ T ĐẬU (tamTX/tamTY) — chủ dự án chốt rõ: T đứng yên trong
      // "Trọng", không bay đi đâu nữa; phép mở lỗ lấy chữ T làm tâm. Vì tâm không còn là giữa màn
      // hình, bán kính đích phải đo tới góc XA NHẤT của khung nhìn từ điểm đó — `hypot(W, H) / 2`
      // chỉ đúng khi tâm là tâm màn hình, dùng lại sẽ hở một góc.
      const W = window.innerWidth
      const H = window.innerHeight
      const maxRadius =
        Math.max(
          Math.hypot(tamTX, tamTY),
          Math.hypot(W - tamTX, tamTY),
          Math.hypot(tamTX, H - tamTY),
          Math.hypot(W - tamTX, H - tamTY),
        ) + 40

      // Khung vẽ đầu tiên phải sạch: JSX để cụm logo `visibility: hidden`, và nó chỉ được bật lên
      // TẠI ĐÂY, cùng lượt với các transform mở màn. Nếu bật sớm hơn, người dùng thấy nguyên cái
      // kết (chữ "Bác sĩ Trọng" đủ nét, chữ T cỡ 1x) suốt thời gian chờ font rồi mới giật về pha 1.
      // Dùng `visibility` chứ không `opacity`: gsap đang chỉnh `opacity` của từng chữ, hai bên sẽ
      // giẫm chân nhau.
      gsap.set(logoRef.current, { visibility: "visible" })
      gsap.set(letterT, { x: offsetX, y: offsetY, scale: heSoPhong })
      gsap.set(bacSiRef.current, { opacity: 0, y: -25, scale: 0.95 })
      gsap.set(rongRef.current, { opacity: 0, x: 25, scale: 0.95 })
      gsap.set(rim, { width: 0, height: 0, opacity: 0, left: tamTX, top: tamTY })

      tl = gsap.timeline({ onComplete: finish })

      // Pha 1–2: chữ T bay về chỗ, hai vế ghép vào khi nó còn đang hạ cánh (chồng lấn -=0.5).
      // `clearProps: "transform"` sau khi hạ cánh: bỏ hẳn ma trận transform còn sót lại trên iOS
      // Safari, chữ mờ nhoè khi đang phóng — vì đang giãn một lớp bitmap đã dựng sẵn thay vì vẽ lại
      // nét chữ (ảnh chụp thật trên iPhone cho thấy cạnh chữ T nhoè lúc đang phóng). Xoá transform
      // trả chữ T về trạng thái tĩnh, trình duyệt vẽ lại nét chữ sắc nét đúng kích cỡ thật của nó.
      tl.to(letterT, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.05,
        ease: "power3.inOut",
        clearProps: "transform",
      })
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
        .to({}, { duration: 0.3 })
        // Pha 4: "Bác sĩ"/"rọng" mờ đi, chỉ còn chữ T xanh ĐỨNG YÊN tại chỗ nó đậu — KHÔNG phóng to.
        // Lỗ mở HÌNH TRÒN lấy tâm chữ T, lan ra lộ dần HomeScreen.
        //
        // Đã thử hình bờ chữ T (SVG <mask> sống, cập nhật bằng setAttribute) hai lượt trước — Chrome
        // đo sạch, nhưng video quay màn hình THẬT trên iPhone (chủ dự án gửi, sau lời phản hồi "cái
        // quái gì đây") cho thấy màn hình kẹt xám tối kéo dài nhiều giây kèm một mảnh chữ T nhỏ nằm
        // sai vị trí — dấu hiệu `mask-image: url(#id)` tham chiếu phần tử SVG sống không chạy đúng
        // trên Safari thật. Không có iPhone/Safari devtools để debug tiếp, và đây đã là lần thứ hai
        // đổi kỹ thuật mặt nạ trong cùng phiên — quay lại `radial-gradient` CSS thuần (không tham
        // chiếu SVG), kỹ thuật cũ đã chạy ổn, để khôi phục app hoạt động được trước đã. Ý tưởng "mở
        // theo hình chữ T" tạm gác, cần cách khác an toàn hơn cho Safari nếu làm lại.
        .to([bacSiRef.current, rongRef.current], { opacity: 0, duration: 0.2, ease: "power1.in" })
        .to(
          { r: 0 },
          {
            r: maxRadius,
            duration: 0.65,
            ease: "power2.out",
            onUpdate: function (this: { targets: () => unknown[] }) {
              const r = (this.targets()[0] as { r: number }).r
              const inner = Math.max(r - 4, 0)
              const mask = `radial-gradient(circle at ${tamTX}px ${tamTY}px, transparent 0, transparent ${inner}px, black ${r}px, black 100%)`
              cover.style.maskImage = mask
              cover.style.webkitMaskImage = mask
              rim.style.width = `${r * 2}px`
              rim.style.height = `${r * 2}px`
              rim.style.opacity = r > 4 ? "1" : "0"
            },
          },
          "-=0.05",
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
              style={{
                color: "var(--c-intro-blue)",
                transformOrigin: "center",
                // Vá nhoè chữ T trên iOS Safari lúc đang phóng (transform-scale giãn bitmap đã
                // dựng thay vì vẽ lại nét — ảnh chụp thật từ chủ dự án xác nhận). Ép GPU dựng lớp
                // này bằng compositing riêng và tắt xoay-lật hai mặt giúp Safari giữ nét chữ khi
                // scale; `clearProps: "transform"` ở effect bên dưới dọn nốt phần còn sót lại sau
                // khi hạ cánh.
                WebkitFontSmoothing: "antialiased",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
              }}
            >
              T
            </span>
            <span id="textRong" ref={rongRef} className="inline-block" style={{ color: "var(--c-intro-ink)" }}>
              rọng
            </span>
          </span>
        </div>
      </div>
      {/* Tâm vòng sáng do gsap đặt (tâm chữ T, đo lúc chạy — không dùng được `left: 50%` vì cùng
          lượt đó gsap ghi đè `left` bằng px). Trước lúc đó phải tắt hẳn bằng opacity 0 + cỡ 0, nếu
          không viền + quầng sáng sẽ hiện thành một chấm xanh ở góc trên trái suốt cả hoạt cảnh. */}
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
