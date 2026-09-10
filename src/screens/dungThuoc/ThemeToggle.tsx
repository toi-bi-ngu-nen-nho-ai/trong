import { useState } from "react"
import { THEME_LABELS, loadTheme, saveTheme, type ThemeMode } from "../../lib/theme"
import { tickHaptic } from "../../lib/haptics"
import { icons } from "../../components/icons"
import { C } from "../../lib/ui"

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(loadTheme)
  const next: Record<ThemeMode, ThemeMode> = { auto: "light", light: "dark", dark: "auto" }
  const glyph = mode === "light" ? icons.sun() : mode === "dark" ? icons.moon() : icons.sunMoon()
  const handleClick = () => {
    const m = next[mode]
    setMode(m)
    saveTheme(m)
    tickHaptic()
  }
  const label = `Chủ đề: ${THEME_LABELS[mode]}. Chạm để đổi.`
  const title = `Chủ đề: ${THEME_LABELS[mode]}`
  return (
    <button
      onClick={handleClick}
      className="flex-none w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
      style={{
        // Cùng bộ nền/viền/đổ bóng với nút chọn chuyên khoa bên cạnh — hai nút đọc thành một cụm.
        background: "var(--c-float-bg)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        border: "1px solid var(--c-line)",
        boxShadow: "0 2px 10px var(--c-shadow), var(--c-shadow-glow)",
        color: C.textSoft,
        transition: "background .25s ease, color .25s ease, transform .12s ease",
      }}
      aria-label={label}
      title={title}
    >
      {glyph}
    </button>
  )
}

// ─── Dùng thuốc — màn hình cha chứa Kháng sinh / Co bóp cơ tim / Vận mạch / Giãn mạch / Rối loạn nhịp / Nội môi ──────

// Hàng tab: kháng sinh đứng đầu, phần còn lại đọc thẳng từ danh mục nhóm thuốc truyền
// (data/categories.ts) nên thêm một nhóm mới không phải sửa ở đây.
// Nhãn tab cố ý ngắn (một từ nếu được) để hàng tab không phải cuộn xa; nhãn dài hơn chỉ dùng trong
// câu "Tìm <...>" của ô tìm kiếm.
