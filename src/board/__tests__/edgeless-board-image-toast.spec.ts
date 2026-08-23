// @vitest-environment happy-dom
//
// Tiếp nối edgeless-board-toolbar-translations.spec.ts (HANDOFF.md mục 23) — TDD tự động hoá kiểm
// tay cho 3/16 khoá còn lại của mục 21: "Failed to download image!", "Download in progress...",
// "Downloading image...". Ba bản dịch tiếng Việt dùng trong ca kiểm ĐỌC TRỰC TIẾP từ
// `src/board/vi.json` trước khi viết (không đoán): "Tải ảnh xuống thất bại!", "Đang tải xuống...",
// "Đang tải ảnh xuống...".
//
// Kỹ thuật KHÁC hẳn hai file trước (không qua UI/selection): `downloadImageBlob` là hàm XUẤT CÔNG
// KHAI từ `@blocksuite/affine-block-image` (image/src/index.ts:10 — cùng ba hàm
// addImages/addSiblingImageBlocks), nhận một `block` có hình dạng tối thiểu
// `{host, blobUrl, resourceController}` (image/src/utils.ts:63-90) rồi gọi
// `toast(host, '<message>')` theo BA nhánh khác nhau. Gọi thẳng hàm này với `host` THẬT (lấy từ
// `moBangVaTaoNoteCoNoiDung`, không phải host giả) và `resourceController` GIẢ tối thiểu (chỉ cần
// đúng hình dạng `.state$.peek()`/`.updateState()`, JS không kiểm kiểu lúc chạy) — không cần dựng
// component ảnh thật, không cần blob thật.
//
// `toast()` (affine/components/src/toast/toast.ts) dùng CONTAINER SINGLETON cấp module (biến
// module-level `ToastContainer`, chỉ tạo MỘT LẦN cho cả file test) — ba ca kiểm dưới đây CÙNG một
// container, toast cũ chưa kịp fade-out (setTimeout 2500ms, test không đợi) vẫn còn trong DOM. Vì
// vậy kiểm bằng "tồn tại một phần tử con có đúng text" (`.some(...)`), không phải "phần tử con CUỐI
// CÙNG", để không phụ thuộc thứ tự/số lượng toast tích luỹ giữa các ca.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { downloadImageBlob } from '@blocksuite/affine-block-image'
import type { EditorHost } from '@blocksuite/std'

import { moBangVaTaoNoteCoNoiDung } from './helpers/note-interaction'

type ResourceControllerGia = {
  state$: { peek(): { downloading: boolean } }
  updateState(partial: { downloading: boolean }): void
}

function taoResourceControllerGia(downloading: boolean): ResourceControllerGia {
  return {
    state$: { peek: () => ({ downloading }) },
    updateState: () => {},
  }
}

/** Toast là `<div>` con của `.toast-container`, `textContent` = message gốc TRUYỀN VÀO toast(). */
function coToastVoiText(text: string): boolean {
  const container = document.querySelector('.toast-container')
  if (!container) return false
  return [...container.children].some((el) => el.textContent === text)
}

// Mỗi `it()` phải có boardId RIÊNG — ba ca kiểm dùng chung 'board-image-toast' từng làm nội dung
// "hello" cộng dồn qua các lượt (test thứ ba thấy "hellohellohello"), vì board persist theo id
// giữa các lượt `beforeEach` trong CÙNG file, khác mọi file kiểm khác trong repo (mỗi file trước
// giờ chỉ có đúng MỘT it(), nên chưa lộ vấn đề này).
let soThuTuBoard = 0

describe('downloadImageBlob — 3 thông báo toast đã dịch tiếng Việt (HANDOFF mục 21/23)', () => {
  let container: HTMLDivElement
  let root: Root
  let host: EditorHost

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    soThuTuBoard += 1
    await moBangVaTaoNoteCoNoiDung(root, container, `board-image-toast-${soThuTuBoard}`, 'hello')
    host = document.querySelector('editor-host') as unknown as EditorHost
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    // KHÔNG `container.remove()` ở đây (khác quy ước mọi file kiểm khác trong repo) — `toast()`
    // (affine/components/src/toast/toast.ts) giữ SINGLETON `ToastContainer` ở cấp MODULE, được
    // `createToastContainer()` gắn vào bên TRONG cây `container` của lượt tạo board ĐẦU TIÊN (qua
    // `viewportElement.parentElement`, không phải `document.body` — `store.root` tồn tại thật nên
    // nhánh fallback không chạy). Gỡ `container` sẽ làm node đó mồ côi khỏi `document` trong khi
    // biến module vẫn trỏ tới nó — lượt kiểm SAU sẽ append đúng chỗ nhưng
    // `document.querySelector('.toast-container')` không còn thấy được (đã đo bằng chứng đỏ thật:
    // lượt 2/3 "expected false to be true" trước khi bỏ dòng `container.remove()` này). Ba `<div>`
    // container tích luỹ trong `document.body` sau khi file này chạy xong là chấp nhận được — dọn
    // theo tiến trình test worker, không rò rỉ sang file khác.
  })

  it('blobUrl rỗng → "Tải ảnh xuống thất bại!"', async () => {
    await act(async () => {
      await downloadImageBlob({
        host,
        blobUrl: '',
        resourceController: taoResourceControllerGia(false),
      } as unknown as Parameters<typeof downloadImageBlob>[0])
    })

    expect(coToastVoiText('Tải ảnh xuống thất bại!')).toBe(true)
  })

  it('đang tải dở (resourceController.state$.downloading=true) → "Đang tải xuống..."', async () => {
    await act(async () => {
      await downloadImageBlob({
        host,
        blobUrl: 'blob:fake-url',
        resourceController: taoResourceControllerGia(true),
      } as unknown as Parameters<typeof downloadImageBlob>[0])
    })

    expect(coToastVoiText('Đang tải xuống...')).toBe(true)
  })

  it('đường thường (có blobUrl, chưa tải) → "Đang tải ảnh xuống..."', async () => {
    await act(async () => {
      await downloadImageBlob({
        host,
        blobUrl: 'blob:fake-url',
        resourceController: taoResourceControllerGia(false),
      } as unknown as Parameters<typeof downloadImageBlob>[0])
    })

    expect(coToastVoiText('Đang tải ảnh xuống...')).toBe(true)
  })
})
