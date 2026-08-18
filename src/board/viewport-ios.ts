import { viewportRuntimeConfig } from '@blocksuite/affine/std/gfx'

export type ThongTinThietBi = {
  userAgent: string
  platform: string
  maxTouchPoints?: number
}

/**
 * true nếu thiết bị là iOS thật (iPhone/iPad/iPod) hoặc iPadOS 13+ đang giả User-Agent máy Mac
 * desktop (chỉ phân biệt được với Mac thật bằng đa điểm chạm — Mac dùng chuột/trackpad không có
 * `maxTouchPoints > 1`).
 */
export function laThietBiIOS(nav: ThongTinThietBi): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
}

/**
 * Ghi đè `viewportRuntimeConfig` MỘT LẦN — PHẢI được gọi ở top-level module của EdgelessBoard.tsx,
 * TRƯỚC bất kỳ `Viewport` nào được dựng. `SKIP_REFRESH_DURING_GESTURE` và bốn hằng số anh em là
 * field initializer, copy giá trị đúng một lần lúc constructor chạy (xem
 * __tests__/viewport-runtime-config.spec.ts) — gọi hàm này trong `useEffect` (chạy SAU khi
 * component mount, tức sau khi Viewport đã dựng) sẽ khiến zoom floor ăn (đọc qua getter) nhưng
 * SKIP_REFRESH_DURING_GESTURE thì KHÔNG.
 *
 * Giá trị dưới đây là điểm khởi đầu thận trọng, CHƯA đo trên thiết bị iPad thật — cần tinh chỉnh
 * khi có dữ liệu thật (xem docs/superpowers/HANDOFF.md mục 8).
 */
export function apDungViewportChoIOS(nav: ThongTinThietBi = navigator): void {
  if (!laThietBiIOS(nav)) return

  Object.assign(viewportRuntimeConfig, {
    SKIP_REFRESH_DURING_GESTURE: true,
    ZOOM_MIN: 0.3,
    CANVAS_DPR_CAP_BY_ZOOM: [
      [0.5, 1],
      [1, 2],
    ] as Array<[number, number]>,
    LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT: 24,
  })
}
