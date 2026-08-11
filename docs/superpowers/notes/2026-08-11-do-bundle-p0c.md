# Đo bundle cuối P0-C

Đo ngày 2026-08-11, cuối chặng P0-C (Task 1–7), tại `3a77ee1`.
Lệnh: `npm run build`.

## Số đo

| | JS thô | JS gzip |
|---|---|---|
| Mốc nền — trước khi vendor (P0-A Task 1 Step 1) | 996,30 kB | 331,46 kB |
| Sau P0-A (vendor 143 file) | 996,33 kB | 331,48 kB |
| **Sau P0-C (thêm ~3.320 dòng port của chặng này)** | **995,89 kB** | **331,37 kB** |
| Chênh so với mốc nền | **−0,41 kB** | **−0,09 kB** |

## Đọc số này cho đúng

**Con số âm không có nghĩa là port làm bundle nhỏ đi.** Nó có nghĩa là toàn bộ tầng `src/core/gfx/`
**không nằm trong module graph** — app chưa import nó ở đâu cả, nên bundler tree-shake bỏ sạch.
Chênh lệch −0,41 kB là nhiễu giữa hai lần build, không phải tín hiệu.

Đây vẫn là **sàn, không phải trần** — đúng như ghi chú P0-A đã cảnh báo, và cảnh báo đó nay đã
đứng vững qua hai chặng liên tiếp.

## Khi nào số này mới có nghĩa

**P1.0**, khi `EdgelessHost` bằng React import tầng gfx vào entry. Chỉ lúc đó `Viewport` (925 dòng),
`LayerManager` (1014), `GridManager` (513), `GfxSelectionManager` (408) và cả `fractional-indexing`
mới thật sự vào bundle. Trước đó **mọi con số bundle của P0-A/B/C đều là cùng một phép đo lặp lại
của app cũ**, không đo được thứ mình muốn đo.

**Ngưỡng xét lại D11: +150 kB gzip.** Nếu ở P1.0 vượt ngưỡng thì phải cân lại quyết định vendor
BlockSuite 0.27.0 — nhưng nhớ rằng lý do vendor là `viewportRuntimeConfig` giữ WKWebView khỏi sập
trên iPhone, thứ bản npm 0.22.4 **không có**. Đổi lại kích thước lấy một app sập lúc pan/zoom là
đổi sai chiều.

## Nợ đo lường còn treo

`npm run build` vẫn có **0 file** đi qua Babel (đã đo ở P0-C Task 2 và ghi tại `vite.config.ts`) —
cùng một lý do: tầng gfx chưa vào module graph. Nên **chi phí build của bộ lọc `accessor` vẫn chưa
từng được thử sức ép**. Phải đo lại cùng lúc với bundle ở P1.0.
