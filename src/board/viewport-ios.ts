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
 *
 * Bật `SKIP_REFRESH_DURING_GESTURE` cũng kích hoạt ba hằng số anh em vốn là dead code với app này
 * (nhánh dùng chúng chưa từng chạy khi cờ này false): `POST_GESTURE_REFRESH_DELAY` (800ms, giữ
 * nguyên mặc định thượng nguồn) và `OVERSCAN_RATIO`/`OVERSCAN_RATIO_BLOCK` (vẫn để `0`, cũng mặc
 * định thượng nguồn) — nên người dùng iOS sẽ thấy canvas trắng tối đa ~800ms sau khi buông cử chỉ
 * pan/zoom trước khi nội dung vẽ lại. Cơ chế của ba hằng số này được ghi chú tại
 * `src/vendor/blocksuite/framework/std/src/gfx/viewport.ts` (thượng nguồn) — chỗ này chỉ ghi lại
 * TRIỆU CHỨNG, không phải cơ chế.
 */
export function apDungViewportChoIOS(
  nav: ThongTinThietBi | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): void {
  if (!nav || !laThietBiIOS(nav)) return

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
