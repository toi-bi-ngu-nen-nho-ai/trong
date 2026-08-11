// Cưỡng chế phát hiện quan trọng nhất của lượt review toàn nhánh cuối P0-C:
// `viewportRuntimeConfig` có HAI nửa vòng đời khác nhau, mà comment ngay phía trên khối
// (`viewport.ts:35-45`, chép nguyên văn thượng nguồn) chỉ mô tả đúng một nửa.
//
// - `ZOOM_MIN`/`ZOOM_MAX` đọc qua GETTER ĐỘNG (`viewport.ts:250-264`) → Viewport dựng TRƯỚC khi
//   override chạy vẫn ăn override, vì mỗi lần đọc là một lần đọc lại `viewportRuntimeConfig`.
// - `SKIP_REFRESH_DURING_GESTURE` (và bốn hằng số anh em: `VIEWPORT_REFRESH_PIXEL_THRESHOLD`,
//   `VIEWPORT_REFRESH_MAX_INTERVAL`, `LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT`,
//   `LOW_ZOOM_GESTURE_ACTIVE_DISTANCE_RATIO`) là FIELD INITIALIZER (`viewport.ts:271-295`) — giá
//   trị được COPY đúng một lần lúc constructor chạy, chốt cứng từ đó.
//
// Đây KHÔNG PHẢI bug của bản port — bản port khớp thượng nguồn từng byte (đã `diff` xác nhận ở
// Task 4). Đây là bất đối xứng CÓ THẬT của thượng nguồn. P1.0 phải biết điều này khi quyết định
// thứ tự khởi động: mount viewport lúc bootstrap rồi chạy cấu hình iOS trong một `useEffect` sẽ
// khiến viewport ăn sàn zoom mobile (ăn qua getter) nhưng KHÔNG ăn `SKIP_REFRESH_DURING_GESTURE`
// (đã copy trước đó) — đúng cái giữ WKWebView khỏi bị kill lúc pan/zoom. Desktop hoàn hảo, iPhone
// chết.
//
// Environment của bộ test là 'node' (xem `vite.config.ts`) — `new Viewport()` không chạm DOM
// (không tạo `ResizeObserver`, không đọc `window`) nên an toàn ở đây. KHÔNG được gọi
// `toModelCoord`/`toViewCoord`/`boundingClientRect`/`setRect` trong file này — những hàm đó đọc
// `DOMRect`, sẽ đâm `ReferenceError: DOMRect is not defined` trong environment 'node'.

import { afterEach, describe, expect, it } from 'vitest';

import { getEffectiveDpr, Viewport, viewportRuntimeConfig } from '../gfx/viewport';

// `viewportRuntimeConfig` là trạng thái TOÀN CỤC (một object cấp module) — một ca đổi nó mà
// không dọn sẽ rò sang ca sau, làm bộ test dối. Chụp lại giá trị gốc để khôi phục.
const ORIGINAL_CONFIG = { ...viewportRuntimeConfig };

afterEach(() => {
  Object.assign(viewportRuntimeConfig, ORIGINAL_CONFIG);
  // `CANVAS_DPR_CAP_BY_ZOOM` là mảng — spread nông ở trên chỉ copy tham chiếu tới CÙNG một mảng,
  // nên phải gán lại một mảng rỗng MỚI (giá trị gốc) để ca sau không kế thừa mutation trên mảng cũ.
  viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [];
});

describe('viewportRuntimeConfig — bất đối xứng vòng đời (Nhóm A)', () => {
  it('ZOOM_MIN đọc qua getter động: đổi SAU khi Viewport đã dựng vẫn ăn override', () => {
    const viewport = new Viewport();
    expect(viewport.ZOOM_MIN).toBe(0.1);

    // Giả lập P1.0: cấu hình sàn zoom iOS chạy SAU khi viewport đã mount (ví dụ trong useEffect).
    viewportRuntimeConfig.ZOOM_MIN = 0.5;

    // Instance đã dựng TRƯỚC override vẫn đọc được giá trị MỚI — vì ZOOM_MIN là getter, không
    // phải field đã copy.
    expect(viewport.ZOOM_MIN).toBe(0.5);
  });

  it('SKIP_REFRESH_DURING_GESTURE là field initializer: đổi SAU khi dựng KHÔNG ăn; dựng MỚI thì ăn', () => {
    const viewportDungTruoc = new Viewport();
    expect(viewportDungTruoc.SKIP_REFRESH_DURING_GESTURE).toBe(false);

    // Cùng kịch bản P1.0 như ca trên: cấu hình iOS chạy SAU khi viewport đã mount.
    viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE = true;

    // Instance đã dựng TRƯỚC override: field đã copy giá trị cũ lúc constructor chạy, KHÔNG đổi
    // theo override — khác hẳn ca ZOOM_MIN ở trên dù cùng là ghi vào viewportRuntimeConfig.
    expect(viewportDungTruoc.SKIP_REFRESH_DURING_GESTURE).toBe(false);

    // Instance dựng SAU override: field initializer chạy lúc này, đọc được giá trị mới.
    const viewportDungSau = new Viewport();
    expect(viewportDungSau.SKIP_REFRESH_DURING_GESTURE).toBe(true);
  });
});

describe('getEffectiveDpr (Nhóm B)', () => {
  it('bảng cap rỗng: trả dpr thô, không clamp', () => {
    viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [];

    // Luôn truyền rawDpr tường minh — không dùng tham số mặc định `window.devicePixelRatio`
    // (environment 'node' không có `window`).
    expect(getEffectiveDpr(1, 3)).toBe(3);
  });

  it('zoom dưới một ngưỡng: clamp dpr theo cap tương ứng', () => {
    viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [[0.5, 1]];

    // zoom 0.3 < ngưỡng 0.5 → cap dpr về min(rawDpr, 1) = 1, thấp hơn rawDpr thô (3).
    expect(getEffectiveDpr(0.3, 3)).toBe(1);
  });

  it('nhiều ngưỡng cùng khớp: lấy ngưỡng khớp ĐẦU TIÊN theo thứ tự mảng, không phải ngưỡng cuối', () => {
    // Cả hai ngưỡng đều khớp zoom = 0.5 (0.5 < 0.9 và 0.5 < 0.95). Nếu cài đặt lấy nhầm ngưỡng
    // khớp CUỐI thay vì ngưỡng khớp ĐẦU, kết quả sẽ là min(10, 5) = 5 thay vì min(10, 2) = 2.
    viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [
      [0.9, 2],
      [0.95, 5],
    ];

    expect(getEffectiveDpr(0.5, 10)).toBe(2);
  });
});
