// Kiểm đúng thứ dự án sở hữu (D9): việc dựng/mở bảng và hình dạng dữ liệu ban đầu.
// KHÔNG kiểm mã của AFFiNE — họ có bộ test riêng.
//
// File này CỐ Ý không render component: environment mặc định là 'node' (xem vite.config.ts) nên
// chạm DOM sẽ đâm `DOMRect is not defined`. Phần render — cầu nối React↔Lit — nằm ở
// `edgeless-board-mount.spec.ts`, file đó tự đổi environment sang happy-dom.
//
// docSources/blobSources GIẢ ở dưới đây thay cho IndexedDB thật — không cần DOM, không cần
// happy-dom, mô phỏng đúng "đóng rồi mở lại app" bằng cách TÁI SỬ DỤNG cùng một kho biến JS giữa
// hai lượt gọi taoHoacMoBang() trong cùng một ca kiểm.
import { describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'

import { taoHoacMoBang } from '../EdgelessBoard'

function dungDocSourceGia(): DocSource {
  const kho = new Map<string, Uint8Array[]>()
  return {
    name: 'gia-lap',
    pull(docId) {
      const cacLuot = kho.get(docId)
      if (!cacLuot || cacLuot.length === 0) return null
      return { data: mergeUpdates(cacLuot) }
    },
    push(docId, data) {
      const cacLuot = kho.get(docId) ?? []
      cacLuot.push(data)
      kho.set(docId, cacLuot)
    },
    subscribe() {
      return () => {}
    },
  }
}

function dungBlobSourceGia(): BlobSource {
  const kho = new Map<string, Blob>()
  return {
    name: 'gia-lap',
    readonly: false,
    async get(key) {
      return kho.get(key) ?? null
    },
    async set(key, value) {
      kho.set(key, value)
      return key
    },
    async delete(key) {
      kho.delete(key)
    },
    async list() {
      return [...kho.keys()]
    },
  }
}

describe('taoHoacMoBang — đường cơ bản', () => {
  it('lần đầu trên cặp source rỗng → đúng 1 page, 1 surface, surface rỗng', async () => {
    const { store } = await taoHoacMoBang({
      docSources: { main: dungDocSourceGia() },
      blobSources: { main: dungBlobSourceGia() },
    })
    expect(store.root).not.toBeNull()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    const surface = surfaces[0] as unknown as { elementModels: unknown[] }
    expect(surface.elementModels).toHaveLength(0)
  })

  it('gọi hai lần liên tiếp trên CÙNG cặp source → lần hai không tạo lại doc, không nhân đôi surface', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang({ docSources, blobSources })
    lanMot.workspace.forceStop()

    // store.root CHÍNH LÀ block affine:page (nó là root của store, không phải con của root) — nên
    // không thể có "affine:page trong children của root" để đếm; đó là kiểm tra bất khả thi, không
    // phải bug thật. Nếu taoHoacMoBang gọi createDoc('board') không điều kiện (bỏ nhánh rẽ đã
    // có/chưa có), dòng await ngay dưới đây sẽ NÉM LỖI "doc already exists" — đó chính là ca đỏ
    // ghim đúng lỗi mấu chốt §3 của spec. Sau khi qua được dòng đó, kiểm số affine:surface (con
    // thật của root) vẫn đúng 1 là bằng chứng seed không chạy lần hai.
    const lanHai = await taoHoacMoBang({ docSources, blobSources })
    const surfaces = lanHai.store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    lanHai.workspace.forceStop()
  })

  it('workspace.forceStop() gọi được ngay sau taoHoacMoBang() mà không ném lỗi', async () => {
    const { workspace } = await taoHoacMoBang({
      docSources: { main: dungDocSourceGia() },
      blobSources: { main: dungBlobSourceGia() },
    })
    expect(() => workspace.forceStop()).not.toThrow()
  })
})

describe('taoHoacMoBang — hạn giờ khi IndexedDB không đồng bộ được', () => {
  it('pull/push không bao giờ resolve + hanGioMs nhỏ → vẫn trả về (không treo), rơi về bộ nhớ', async () => {
    const docSourceTreo: DocSource = {
      name: 'treo-mai',
      pull: () => new Promise(() => {}), // không bao giờ resolve — mô phỏng IndexedDB hỏng vĩnh viễn
      push: () => new Promise(() => {}),
      subscribe: () => () => {},
    }
    const blobSourceTreo: BlobSource = {
      name: 'treo-mai',
      readonly: false,
      get: () => new Promise(() => {}),
      set: () => new Promise(() => {}),
      delete: () => new Promise(() => {}),
      list: () => new Promise(() => {}),
    }

    const { store, workspace } = await taoHoacMoBang({
      docSources: { main: docSourceTreo },
      blobSources: { main: blobSourceTreo },
      hanGioMs: 20,
    })

    expect(store.root).not.toBeNull()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    workspace.forceStop()
  }, 10_000)
})
