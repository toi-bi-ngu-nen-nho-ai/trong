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

      const W = window.innerWidth
      const H = window.innerHeight

      // ─── Cửa sổ hình chữ T cho pha kết ────────────────────────────────────────────────────
      // Tham chiếu: video màn mở app MDCalc do chủ dự án gửi — cửa sổ lộ nội dung có ĐÚNG hình
      // glyph của logo (dấu cộng), mở ra từ ngay kích cỡ của chính glyph rồi nở bung ~0,3s. Ở đây
      // glyph là chữ T.
      //
      // Kỹ thuật: `clip-path: polygon()` với toạ độ px thật — KHÔNG dùng `mask-image: url(#id)`
      // trỏ tới `<mask>` SVG sống như hai lượt trước. Chính đường đó làm màn hình kẹt xám tối trên
      // iPhone thật (video lỗi chủ dự án gửi), trong khi `clip-path: polygon()` là tính năng phổ
      // thông, ổn định lâu năm trên iOS Safari. Ý tưởng cũ đúng, chỉ sai cách hiện thực.
      //
      // Hình chữ T xấp xỉ bằng 8 đỉnh, gốc toạ độ ở tâm chữ, cỡ lấy theo hộp bao thật của #letterT.
      // Góc nhọn (polygon không bo được) — ở tốc độ nở này mắt không kịp phân biệt với nét bo của
      // Baloo 2.
      const halfW = oT.width / 2
      const halfH = oT.height / 2
      const barH = oT.height * 0.26
      const stemW = oT.width * 0.3
      // Thứ tự các đỉnh đi THEO chiều kim đồng hồ trong hệ toạ độ màn hình (y hướng xuống).
      const boCuc: [number, number][] = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, -halfH + barH],
        [stemW / 2, -halfH + barH],
        [stemW / 2, halfH],
        [-stemW / 2, halfH],
        [-stemW / 2, -halfH + barH],
        [-halfW, -halfH + barH],
      ]

      // `clip-path` giữ phần BÊN TRONG đường bao, mà ta cần ngược lại: giữ nguyên tấm phủ ở ngoài,
      // KHOÉT một lỗ hình chữ T ở trong. Cách làm chuẩn là "lỗ khoá": vẽ hình chữ nhật toàn màn
      // theo chiều kim đồng hồ, rồi nối bằng một đường rạch (seam) sang hình chữ T vẽ NGƯỢC chiều
      // kim đồng hồ, xong quay lại theo đúng đường rạch đó. Quy tắc nonzero mặc định cộng hai chiều
      // ngược nhau thành 0 ở vùng chữ T → không tô → thành lỗ. Đường rạch đi rồi về nên triệt tiêu,
      // không để lại vệt. Không cần từ khoá `evenodd` (hỗ trợ kém đồng đều hơn).
      const layDuongKhoet = (heSo: number) => {
        const T = boCuc
          .slice()
          .reverse()
          .map(([x, y]) => `${(tamTX + x * heSo).toFixed(1)}px ${(tamTY + y * heSo).toFixed(1)}px`)
        return `polygon(0px 0px, ${W}px 0px, ${W}px ${H}px, 0px ${H}px, 0px 0px, ${T.join(", ")}, ${T[0]}, 0px 0px)`
      }

      // Hệ số phóng đủ để chữ T phủ kín khung nhìn. Chữ T là hình LÕM nên không thể suy từ một bán
      // kính như hình tròn — phải xét riêng ba ràng buộc, lấy cái ngặt nhất:
      //   • ngang: thân chữ (rộng stemW*heSo) phải trùm qua mép trái/phải xa nhất;
      //   • trên : mép dưới của thanh ngang phải trôi lên khỏi y=0 (nhờ vậy thanh ngang không còn
      //            cắt ngang màn hình, phần trên do chính thanh ngang phủ);
      //   • dưới : chân thân chữ phải chạm quá mép dưới.
      // Tới hệ số đó thì trong khung nhìn chữ T thoái hoá thành một dải dọc phủ kín — đúng như
      // video tham chiếu, đoạn cuối chỉ còn vài góc nền hở rồi biến mất.
      const heSoDich =
        Math.max(
          (2 * Math.max(tamTX, W - tamTX)) / stemW,
          tamTY / Math.max(halfH - barH, 1),
          (H - tamTY) / halfH,
        ) * 1.12

      // ─── Phóng theo HÀM MŨ, không phải tuyến tính ────────────────────────────────────────────
      // `heSoDich` rất lớn (đo thật ở 1280×576: 93 lần — thân chữ rộng 17px phải nong ra 1500px).
      // Cho `heSo` chạy tuyến tính tới đó thì gần như cả quãng thời gian trôi qua ở các cỡ khổng lồ,
      // chữ T chỉ còn nhận ra được ~80ms.
      //
      // Bản trước chữa bằng cách CẮT LÀM HAI NHỊP (nở tới cỡ "hero" bằng `power2.out`, rồi bung bằng
      // `power2.in`). Cách đó hỏng: `power2.out` kết thúc ở vận tốc 0, `power2.in` bắt đầu từ vận tốc
      // 0 — nối lại thành một vùng ĐỨNG YÊN giữa hoạt cảnh. Đo được rõ ràng trên Chrome: mép thanh
      // ngang dịch 30px trong khung này, 7px ở khung kế (chỗ khựng), rồi vọt 372px ở khung sau đó.
      // Chủ dự án mô tả đúng cái đó: "chuyển nhanh quá rồi khựng lại mới tràn ra".
      //
      // Cách đúng: mắt cảm nhận phóng to theo TỈ LỆ chứ không theo hiệu, nên cho số mũ chạy đều thì
      // tốc độ phóng NHÌN THẤY là hằng số — mượt một mạch, không có chỗ nào để khựng, mà vẫn tự
      // động dành nhiều thời gian cho các cỡ nhỏ (đúng lúc còn đọc ra hình chữ T). Một tween duy
      // nhất, `ease: "none"`: mọi easing đều tạo ra chỗ nhanh chỗ chậm, mà ở đây "đều" mới là đúng.
      const heSoBatDau = 0.35
      const tySoPhong = heSoDich / heSoBatDau

      const oKhoet = { p: 0 }
      const capNhatKhoet = () => {
        const duong = layDuongKhoet(heSoBatDau * Math.pow(tySoPhong, oKhoet.p))
        cover.style.clipPath = duong
        // Bản có tiền tố cho Safari cũ. Gán qua setProperty vì `webkitClipPath` không có trong
        // kiểu CSSStyleDeclaration của TS (khác `webkitMaskImage`).
        cover.style.setProperty("-webkit-clip-path", duong)
      }

      // Khung vẽ đầu tiên phải sạch: JSX để cụm logo `visibility: hidden`, và nó chỉ được bật lên
      // TẠI ĐÂY, cùng lượt với các transform mở màn. Nếu bật sớm hơn, người dùng thấy nguyên cái
      // kết (chữ "Bác sĩ Trọng" đủ nét, chữ T cỡ 1x) suốt thời gian chờ font rồi mới giật về pha 1.
      // Dùng `visibility` chứ không `opacity`: gsap đang chỉnh `opacity` của từng chữ, hai bên sẽ
      // giẫm chân nhau.
      gsap.set(logoRef.current, { visibility: "visible" })
      gsap.set(letterT, { x: offsetX, y: offsetY, scale: heSoPhong })
      gsap.set(bacSiRef.current, { opacity: 0, y: -25, scale: 0.95 })
      gsap.set(rongRef.current, { opacity: 0, x: 25, scale: 0.95 })

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
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.2)" },
          "-=0.5",
        )
        .to(
          rongRef.current,
          { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: "power2.out" },
          "-=0.5",
        )
        // Pha 3: giữ nhịp cho người xem kịp đọc "Bác sĩ Trọng".
        .to({}, { duration: 0.3 })
        // Pha 4: "Bác sĩ"/"rọng" mờ đi, chỉ còn chữ T xanh ĐỨNG YÊN tại chỗ nó đậu — KHÔNG phóng to.
        // Rồi một cửa sổ HÌNH CHỮ T mở ra ngay trong lòng chữ T đó và nở MỘT MẠCH ra lộ HomeScreen —
        // chính chữ T biến thành cửa vào app (xem chú thích `layDuongKhoet` và khối "phóng theo hàm
        // mũ" phía trên).
        //
        // MỘT tween duy nhất, `ease: "none"`. Không tách nhịp, không easing: số mũ chạy đều đã cho
        // tốc độ phóng nhìn thấy là hằng số. Thêm bất kỳ easing nào vào đây là lại tạo ra chỗ nhanh
        // chỗ chậm — đúng thứ vừa phải gỡ bỏ.
        //
        // Không có viền/quầng sáng nào chạy theo mép lỗ: chủ dự án yêu cầu bỏ hẳn viền xanh lam, và
        // video tham chiếu (MDCalc) cũng không có.
        .to([bacSiRef.current, rongRef.current], { opacity: 0, duration: 0.2, ease: "power1.in" })
        .to(
          oKhoet,
          {
            p: 1,
            duration: 0.66,
            ease: "none",
            onUpdate: capNhatKhoet,
            // Chốt cứng khung cuối: đoạn chót của phép phóng hàm mũ đi rất nhanh, chỉ cần máy rớt
            // một khung là lượt onUpdate cuối dừng non và còn sót một dải nền chưa bị nuốt (đo thật
            // ở bản trước: khung áp chót mới phủ 88% bề ngang cần thiết). Cắt sạch tấm phủ ở đây để
            // không phụ thuộc vào việc khung cuối có kịp vẽ hay không.
            onComplete: () => {
              cover.style.clipPath = "polygon(0px 0px, 0px 0px, 0px 0px)"
              cover.style.setProperty("-webkit-clip-path", "polygon(0px 0px, 0px 0px, 0px 0px)")
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
    </div>
  )
}
