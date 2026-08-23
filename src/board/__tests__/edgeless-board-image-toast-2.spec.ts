// @vitest-environment happy-dom
//
// Tiếp nối edgeless-board-image-toast.spec.ts (HANDOFF.md mục 23 Phần 3) — TDD tự động hoá kiểm tay
// cho 2/7 khoá còn lại của mục 21+22 (xem "Chặng kế tiếp" ở mục 24): "Copied image to clipboard",
// "Failed to read image size, please try another image". Hai bản dịch tiếng Việt dùng trong ca kiểm
// ĐỌC TRỰC TIẾP từ `src/board/vi.json` trước khi viết (không đoán): "Đã sao chép ảnh vào bộ nhớ tạm",
// "Không đọc được kích thước ảnh, hãy thử ảnh khác".
//
// PHÁT HIỆN LỆCH VỚI TIỀN ĐỀ BAN ĐẦU (mục 24 dự đoán "copyImageBlob export công khai từ
// image/src/index.ts — cùng kiểu như downloadImageBlob"): đọc trực tiếp image/src/index.ts xác nhận
// CHỈ `addImages`, `addSiblingImageBlocks`, `downloadImageBlob` được re-export — `copyImageBlob` có
// từ khoá `export` (utils.ts:115) nhưng KHÔNG có mặt trong index.ts, và package.json của gói
// (`exports`) cũng không có subpath nào khác trỏ vào utils.ts (chỉ `.`, `./turbo-painter`, `./store`,
// `./view`). Import `{ copyImageBlob } from '@blocksuite/affine-block-image'` do đó KHÔNG hoạt động
// — không phải lỗi gõ, hàm này thật sự nằm ngoài bề mặt export công khai của gói (cùng lớp ngõ cụt
// "subpath export không tồn tại" đã gặp ở mục 23 Phần 4 cho `NOTE_MENU_ITEMS`). Import tương đối
// thẳng vào `src/vendor/blocksuite/...` cũng KHÔNG dùng được: vite.config.ts ghi rõ "src/vendor/
// blocksuite/ cũng nằm dưới src/ nhưng Vite không bao giờ nạp thẳng từ đó — mọi specifier
// @blocksuite/* được blocksuiteVendor() trỏ sang .vendor-build/" — một import tương đối vào
// src/vendor sẽ tạo bản sao module THỨ HAI (raw .ts, chưa qua babel/vendor-build), tách biệt khỏi
// module thật app đang dùng, đúng lớp lỗi "instanceof trả về false" mà vite.config.ts cảnh báo né.
//
// LỐI RA: không cần import copyImageBlob đứng một mình. `ImageBlockComponent.copy`
// (image-block.ts:55-57, thuộc tính public thật, không phải `#` private) là arrow function gọi
// thẳng `copyImageBlob(this)` — và đây CHÍNH LÀ hàm nút "Copy" thật trong toolbar gọi
// (configs/toolbar.ts:114-120, action `a.copy`, placement `ActionPlacement.More`). Dựng một khối
// ảnh THẬT trên board (kỹ thuật đã kiểm chứng ở edgeless-board-toolbar-translations.spec.ts —
// `store.addBlock('affine:image', {...}, noteId)`), lấy phần tử DOM thật `<drt-image>` (tên đã đổi
// qua D11 — gốc `affine-image`, xác nhận bằng grep .vendor-build/affine/blocks/image/src/effects.js),
// rồi gọi THẲNG `.copy()` trên đó — đúng method production thật, không cần mở dropdown "More" lồng
// nhau của toolbar (utils.ts:255-294) mà cũng không cần import hàm đứng một mình.
//
// happy-dom KHÔNG hề định nghĩa `isSecureContext` (kiểm bằng grep toàn bộ node_modules/happy-dom/
// lib — không một chỗ nào nhắc tới chuỗi này) — `globalThis.isSecureContext` vì vậy luôn `undefined`
// (falsy). `copyImageBlob` có gate `if (!globalThis.isSecureContext) { console.error(...); return; }`
// NGAY TRƯỚC `navigator.clipboard.write` — thiếu patch này, hàm luôn return sớm, KHÔNG BAO GIỜ toast
// (RED thật đã quan sát — xem git history của lượt viết file này — false vs true, KHÔNG treo, vì
// nhánh return sớm không chờ gì cả). Gán `globalThis.isSecureContext = true` (thuộc tính chưa từng
// tồn tại trong happy-dom, gán thẳng an toàn) trước khi gọi `.copy()`.
//
// Các bước còn lại của copyImageBlob đã xác nhận AN TOÀN dưới happy-dom bằng đọc mã nguồn (không
// đoán): `NativeClipboardProvider` không được `src/board/extensions.ts` đăng ký (chỉ dùng qua
// factory `NativeClipboardExtension(...)`, không tự động — app này không gọi) nên `copyAsPNG` luôn
// undefined, nhánh Electron bị bỏ qua tự nhiên. Blob giả dựng sẵn `type: 'image/png'` nên
// `blob.type !== 'image/png'` luôn false — né hẳn `convertToPng` (cần canvas thật, happy-dom chỉ có
// proxy giả ở note-interaction.ts). `navigator.clipboard.write`/`ClipboardItem` CÓ cài đủ trong
// happy-dom (đọc node_modules/happy-dom/lib/clipboard/{Clipboard,ClipboardItem}.js) —
// `Permissions.query` mặc định trả `'granted'` (permissions/Permissions.js:39), không rơi vào nhánh
// throw.
//
// Khoá 2 — "Failed to read image size...": nằm trong hàm KHÔNG export `buildPropsWith` (utils.ts:
// 230), gọi qua hàm export công khai đơn giản nhất `addSiblingImageBlocks` (chỉ cần targetModel,
// không cần dựng gfx/viewport như `addImages`). `readImageSize` (affine-shared/src/utils/image.ts)
// tạo `new Image()` rồi gán `.src = URL.createObjectURL(file)` (blob: URL) — đọc thẳng
// node_modules/happy-dom/lib/nodes/html-image-element/HTMLImageElement.js: với `blob:` URL,
// `enableImageFileLoading` mặc định `false` (browser/DefaultBrowserSettings.js:9) khiến KHÔNG bao
// giờ bắn 'load' lẫn 'error' — Promise treo VĨNH VIỄN. Chỉ `data:` URL được xử lý ĐỒNG BỘ
// (#loadDataUrl) — payload không phải ảnh thật khiến `BufferImageSize` (gói `buffer-image-size`)
// ném lỗi, HTMLImageElement bắt lỗi đó, đặt naturalWidth/Height = 0 nhưng VẪN bắn 'load' (không
// phải 'error') — đúng nhánh 0×0 cần. Ghi đè `URL.createObjectURL` CỤC BỘ trong ca kiểm (khôi phục
// lại ngay sau) để trả `data:` URL thay vì `blob:`, né hẳn nhánh treo.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addSiblingImageBlocks } from '@blocksuite/affine-block-image'

import { moBangVaTaoNoteCoNoiDung } from './helpers/note-interaction'

type BlockModelLike = { id: string; flavour: string }
type StoreLike = {
  root: (BlockModelLike & { children: BlockModelLike[] }) | null
  addBlock(flavour: string, props: Record<string, unknown>, parent: string): string
  blobSync: { set(blob: Blob): Promise<string> }
  getModelsByFlavour(flavour: string): Array<{ id: string }>
}
type StdLike = { store: StoreLike }

/** Cùng helper `edgeless-board-image-toast.spec.ts` (mục 23 Phần 3) đã dùng — chép lại vì không export. */
function coToastVoiText(text: string): boolean {
  const toastContainer = document.querySelector('.toast-container')
  if (!toastContainer) return false
  return [...toastContainer.children].some((el) => el.textContent === text)
}

// Mỗi `it()` một boardId riêng — cùng lý do đã ghi ở edgeless-board-image-toast.spec.ts (board
// persist theo id giữa các lượt beforeEach trong CÙNG file).
let soThuTuBoard = 0

describe('copyImageBlob/buildPropsWith — 2 toast tiếng Việt còn lại của mục 21/24 (khối ảnh)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    soThuTuBoard += 1
    await moBangVaTaoNoteCoNoiDung(root, container, `board-image-toast-2-${soThuTuBoard}`, 'hello')
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    // KHÔNG container.remove() — cùng lý do đã ghi ở edgeless-board-image-toast.spec.ts: toast()
    // giữ ToastContainer singleton cấp module, gỡ container gốc sẽ làm nó mồ côi khỏi document.
  })

  it('.copy() trên khối ảnh thật → toast "Đã sao chép ảnh vào bộ nhớ tạm"', async () => {
    // happy-dom không định nghĩa isSecureContext — patch trước khi gọi .copy() (xem giải thích ở
    // đầu file). RED thật đã xác nhận: console.error thật "Clipboard API is not available in
    // insecure context" rồi "expected false to be true" — nhưng KHÔNG phải vì thiếu patch, mà vì
    // GÁN THẲNG (`globalThis.isSecureContext = true`) không có hiệu lực trong pool happy-dom của
    // Vitest — mã vendored vẫn đọc lại giá trị falsy dù dòng gán chạy không lỗi. Cùng lớp vấn đề đã
    // gặp (và giải quyết bằng Object.defineProperty) ở
    // edgeless-board-present-fullscreen-toolbar.spec.ts cho `document.fullscreenElement`.
    Object.defineProperty(globalThis, 'isSecureContext', { value: true, configurable: true })

    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }
    const { std } = eh
    const noteRef = std.store.root!.children.find((c) => c.flavour === 'affine:note')!

    // Blob giả — KHÔNG cần là ảnh PNG thật: getImageBlob() chỉ đọc model.props.sourceId$ +
    // blobSync.get(sourceId), và chỉ kiểm blob.type bắt đầu bằng 'image/' (utils.ts:44-52).
    const anhGia = new Blob(['khong-phai-anh-that'], { type: 'image/png' })
    const sourceId = await std.store.blobSync.set(anhGia)
    std.store.addBlock('affine:image', { sourceId }, noteRef.id)

    await vi.waitFor(() => {
      expect(document.querySelector('drt-image')).not.toBeNull()
    })

    const imgEl = document.querySelector('drt-image') as unknown as { copy(): void }

    await act(async () => {
      imgEl.copy()
      await vi.waitFor(() => {
        expect(coToastVoiText('Đã sao chép ảnh vào bộ nhớ tạm')).toBe(true)
      })
    })
  })

  it('addSiblingImageBlocks với "ảnh" 0×0 → toast "Không đọc được kích thước ảnh, hãy thử ảnh khác" + throw', async () => {
    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }
    const { std } = eh
    const targetModel = std.store.getModelsByFlavour('affine:paragraph')[0]!

    // Xem giải thích đầy đủ ở đầu file: blob: URL mặc định treo Promise của readImageSize dưới
    // happy-dom (enableImageFileLoading=false) — ghi đè để trả data: URL, xử lý ĐỒNG BỘ, payload
    // không phải ảnh thật → BufferImageSize ném lỗi → naturalWidth/Height=0 → readImageSize trả
    // {width:0, height:0} → đúng nhánh toast cần kiểm. Khôi phục lại ngay sau, không lộ ra ca khác.
    const goc = URL.createObjectURL
    // RED thật đã xác nhận (tắt patch dưới): "Test timed out in 5000ms" — đúng giả thuyết Promise
    // của readImageSize treo vĩnh viễn dưới blob: URL mặc định của happy-dom (xem giải thích đầu
    // file). NHƯNG lượt gán thẳng đầu tiên (`URL.createObjectURL = () => ...`) vẫn timeout — cùng
    // lớp vấn đề "gán thẳng không có hiệu lực" đã gặp ở test khoá 1 (`globalThis.isSecureContext`)
    // — đổi sang Object.defineProperty. Khôi phục CŨNG phải dùng defineProperty (không phải gán
    // thẳng `URL.createObjectURL = goc`), nếu không override có thể không được gỡ thật, rò rỉ sang
    // ca kiểm sau trong CÙNG file.
    Object.defineProperty(URL, 'createObjectURL', {
      value: () => 'data:image/png,khong-phai-anh-that',
      configurable: true,
      writable: true,
    })

    let loi: unknown
    try {
      const fileGia = new File(['khong-phai-anh-that'], 'gia.png', { type: 'image/png' })
      await act(async () => {
        try {
          await addSiblingImageBlocks(
            std as unknown as Parameters<typeof addSiblingImageBlocks>[0],
            [fileGia],
            targetModel as unknown as Parameters<typeof addSiblingImageBlocks>[2],
          )
        } catch (e) {
          loi = e
        }
      })
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { value: goc, configurable: true, writable: true })
    }

    expect((loi as Error | undefined)?.message).toBe('Failed to read image size')
    expect(coToastVoiText('Không đọc được kích thước ảnh, hãy thử ảnh khác')).toBe(true)
  })
})
