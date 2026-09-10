// ─── Bảng đo TẠM cho lỗi "dải trắng ở thanh trạng thái" (2026-09-10) ─────────────────────────────
//
// VÌ SAO CÓ FILE NÀY: lỗi chỉ hiện ra khi app ĐÃ CÀI ra màn hình chính trên máy chủ dự án. Dựng lại
// trên trình duyệt ở máy phát triển thì mọi thứ ĐÚNG (đã đo: hệ điều hành sáng + chọn tay tối →
// data-theme=dark, --c-surface=#252525, cả ba thẻ theme-color=#252525). Không quan sát được chỗ
// hỏng thì không được đoán — gắn thiết bị đo vào đúng chỗ đó rồi đọc số.
//
// Có một MÂU THUẪN chưa giải thích được, và bảng này sinh ra để phân định nó: trên Android, app đã
// cài lẽ ra lấy màu thanh trạng thái từ manifest.json `theme_color` = #1E96EB (xanh), nhưng ảnh chụp
// thật lại TRẮNG — mà không một phiên bản `theme_color` nào trong lịch sử từng là trắng (đã tra:
// #1E96EB, #2d3a94, #003152, #00766e, #0f766e, #0050B3). Giá trị trắng DUY NHẤT trong toàn bộ cấu
// hình PWA là `background_color: "#ffffff"`, chưa từng đổi và không có biến thể tối.
//
// Ba tầng cần phân định, mỗi tầng có cách chữa KHÁC HẲN nhau:
//   1. Trang         — data-theme / các biến --c-* / nền computed của html, body, #app-shell
//   2. Thẻ meta      — ba thẻ theme-color: app đã ghi đúng màu vào chưa
//   3. Hệ điều hành  — display-mode, navigator.standalone, safe-area, chênh screen/innerHeight
// Nếu tầng 1 và 2 đều đúng mà dải vẫn trắng ⇒ hệ điều hành KHÔNG đọc thẻ meta, lỗi ở tầng 3
// (manifest / WebAPK), và không có cách nào chữa bằng JS.
//
// GỠ FILE NÀY khi đã chốt được căn nguyên. Nó cố ý KHÔNG có lối vào nhìn thấy được: mở bằng cách
// chạm 5 lần vào logo ở Trang chủ — phải vào được từ BÊN TRONG app đã cài, nơi không gõ URL được.

import { useEffect, useState } from "react"

const SO_LAN_CHAM_DE_MO = 5
// Chuỗi chạm bị ngắt quãng quá lâu thì coi như bấm nhầm, đếm lại từ đầu.
const HAN_CHUOI_CHAM_MS = 1200

/** Đếm số lần chạm liên tiếp vào logo; đủ số lần thì mở bảng đo. */
export function useMoBangChanDoan(): { chamLogo: () => void; dangMo: boolean; dong: () => void } {
  const [dem, setDem] = useState(0)
  const [dangMo, setDangMo] = useState(false)

  useEffect(() => {
    if (dem === 0) return
    const t = setTimeout(() => setDem(0), HAN_CHUOI_CHAM_MS)
    return () => clearTimeout(t)
  }, [dem])

  return {
    chamLogo: () => {
      setDem((n) => {
        if (n + 1 >= SO_LAN_CHAM_DE_MO) {
          setDangMo(true)
          return 0
        }
        return n + 1
      })
    },
    dangMo,
    dong: () => setDangMo(false),
  }
}

function doDisplayMode(): string {
  const cac = ["fullscreen", "standalone", "minimal-ui", "browser"]
  const khop = cac.filter((m) => window.matchMedia(`(display-mode: ${m})`).matches)
  return khop.length ? khop.join(" + ") : "(không khớp cái nào)"
}

// Đo safe-area bằng một phần tử THẬT: đọc `env()` qua getPropertyValue trên :root chỉ trả về chuỗi
// khai báo, không phải số máy tính ra — dựng hộp rồi đo chiều cao mới ra giá trị thật.
function doSafeAreaTop(): string {
  const hop = document.createElement("div")
  hop.style.cssText = "position:fixed;top:0;left:0;height:env(safe-area-inset-top,0px);width:1px;visibility:hidden"
  document.body.appendChild(hop)
  const cao = hop.getBoundingClientRect().height
  hop.remove()
  return `${cao.toFixed(1)}px`
}

function thuThapSoDo(): { nhom: string; dong: [string, string][] }[] {
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const bien = (n: string) => cs.getPropertyValue(n).trim() || "(rỗng)"

  let luuChuDe: string
  try {
    luuChuDe = localStorage.getItem("drtrong:theme") ?? "(chưa lưu → auto)"
  } catch {
    luuChuDe = "(localStorage BỊ CHẶN)"
  }

  const the = [...document.querySelectorAll('meta[name="theme-color"]')]
  const appShell = document.getElementById("app-shell")
  // Thứ DUY NHẤT iOS đọc cho thanh trạng thái app đã cài. Dòng này còn dùng để phân biệt "máy chưa
  // nhận HTML mới" (ra "(KHÔNG CÓ THẺ)") với "iOS nhận rồi mà vẫn không đổi" — hai chuyện khác hẳn.
  const appleBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')

  return [
    {
      nhom: "3 · Hệ điều hành",
      dong: [
        ["display-mode", doDisplayMode()],
        ["navigator.standalone", String((navigator as unknown as { standalone?: boolean }).standalone)],
        ["thẻ Apple (iOS)", appleBar?.getAttribute("content") || "(KHÔNG CÓ THẺ → iOS dùng default = dải trắng)"],
        ["safe-area-inset-top", doSafeAreaTop()],
        ["screen.height", String(window.screen.height)],
        ["innerHeight", String(window.innerHeight)],
        ["chênh (screen − inner)", String(window.screen.height - window.innerHeight)],
        ["visualViewport.height", window.visualViewport ? window.visualViewport.height.toFixed(1) : "(không có)"],
        ["devicePixelRatio", String(window.devicePixelRatio)],
      ],
    },
    {
      nhom: "2 · Thẻ meta theme-color",
      dong: the.length
        ? the.map(
            (m, i) => [`[${i}] ${m.getAttribute("media") || "(không media)"}`, m.getAttribute("content") || "(rỗng)"] as [string, string],
          )
        : [["(không có thẻ nào)", "—"] as [string, string]],
    },
    {
      nhom: "1 · Trang",
      dong: [
        ["data-theme", root.getAttribute("data-theme") || "(không có)"],
        ["localStorage chủ đề", luuChuDe],
        ["máy đang tối?", String(window.matchMedia("(prefers-color-scheme: dark)").matches)],
        ["--c-surface", bien("--c-surface")],
        ["--c-page", bien("--c-page")],
        ["--c-nav-bg-solid", bien("--c-nav-bg-solid")],
        ["nền computed <html>", cs.backgroundColor],
        ["nền computed <body>", getComputedStyle(document.body).backgroundColor],
        ["nền computed #app-shell", appShell ? getComputedStyle(appShell).backgroundColor : "(không thấy)"],
      ],
    },
    {
      nhom: "Máy",
      dong: [["userAgent", navigator.userAgent]],
    },
  ]
}

export function BangChanDoanThanhTrangThai({ onDong }: { onDong: () => void }) {
  const [soDo, setSoDo] = useState(thuThapSoDo)
  const [daChep, setDaChep] = useState<"chua" | "roi" | "hong">("chua")

  const dangVanBan = soDo.map((g) => `### ${g.nhom}\n` + g.dong.map(([k, v]) => `${k}: ${v}`).join("\n")).join("\n\n")

  async function chep() {
    try {
      // Clipboard API chỉ có trong ngữ cảnh bảo mật (https/localhost). Mở qua http trong mạng LAN
      // thì không tồn tại — bắt lỗi để nút không im lặng không làm gì, và ô chữ bên dưới vẫn bôi
      // đen chép tay được.
      await navigator.clipboard.writeText(dangVanBan)
      setDaChep("roi")
    } catch {
      setDaChep("hong")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-auto"
      /* Nền ĐẶC, không bán trong suốt: chữ ở đây là số đo phải đọc chính xác từng ký tự, không
         phải lớp phủ trang trí — để lộ nội dung trang phía sau là tự làm khó mình. */
      style={{ background: "#0b0b0b", color: "#eaeaea", paddingTop: "max(env(safe-area-inset-top,0px), 12px)" }}
    >
      <div className="p-4" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.55 }}>
        {/* flex-wrap: bốn nút trên khổ 375px không đủ chỗ một hàng — thiếu nó thì nút "Đóng"
            (ml-auto) bị đẩy ra ngoài mép phải, tức bảng đo mở ra rồi không đóng lại được. */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <strong style={{ fontSize: 13 }}>Đo thanh trạng thái</strong>
          <button onClick={() => setSoDo(thuThapSoDo())} className="px-3.5 py-2.5 rounded-lg" style={{ background: "#333", color: "#eaeaea" }}>
            Đo lại
          </button>
          <button onClick={chep} className="px-3.5 py-2.5 rounded-lg" style={{ background: "#333", color: "#eaeaea" }}>
            {daChep === "roi" ? "Đã chép ✓" : daChep === "hong" ? "Không chép được" : "Chép"}
          </button>
          <button onClick={onDong} className="ml-auto px-3.5 py-2.5 rounded-lg" style={{ background: "#8a2020", color: "#fff" }}>
            Đóng
          </button>
        </div>

        {soDo.map((g) => (
          <div key={g.nhom} className="mb-3">
            <div style={{ color: "#7fb2ff", marginBottom: 4 }}>{g.nhom}</div>
            {g.dong.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8, wordBreak: "break-all" }}>
                <span style={{ color: "#9c9ca0", flex: "0 0 46%" }}>{k}</span>
                <span style={{ flex: 1 }}>{v}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Ô chữ để bôi đen chép tay khi Clipboard API không dùng được (http trong mạng LAN). */}
        <textarea
          readOnly
          value={dangVanBan}
          onFocus={(e) => e.currentTarget.select()}
          style={{ width: "100%", height: 140, background: "#111", color: "#ccc", border: "1px solid #444", borderRadius: 8, padding: 8, fontSize: 11 }}
        />
      </div>
    </div>
  )
}
