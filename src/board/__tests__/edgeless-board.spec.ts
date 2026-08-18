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
import { Text } from '@blocksuite/store'

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

  it('nội dung thêm SAU khi mở lần đầu còn nguyên khi mở lại (spec §6.2 ca 6) — không chỉ seed không nhân đôi', async () => {
    // Hai ca kiểm ở trên chứng minh "mở lại không tạo trùng seed" — một tính chất LIÊN QUAN nhưng
    // YẾU hơn thứ spec §6.2 ca 6 thật sự đòi: nội dung người dùng TỰ THÊM (không phải seed) phải
    // sống sót qua một lượt lưu/mở lại. Ca kiểm này đóng đúng khoảng trống đó bằng cách thêm một
    // note + một đoạn văn bản (mô phỏng người dùng gõ chữ trên bảng) rồi mở lại trên CÙNG cặp
    // docSources/blobSources giả — đúng cách hai ca kiểm phía trên mô phỏng "đóng rồi mở lại app".
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang({ docSources, blobSources })
    // 'affine:note' có `parent: ['@root']` (xem note-model.ts) nên gắn thẳng vào store.root — cùng
    // hình dạng cây mà một bảng vẽ thật có khi người dùng gõ nội dung. 'affine:paragraph' là con
    // hợp lệ của 'affine:note' (xem paragraph-model.ts) và mang một `Text` — kiểu dữ liệu văn bản
    // thật của BlockSuite, không phải một chuỗi JS trần.
    const noiDungMau = 'nội dung kiểm thử sống sót qua lưu rồi mở lại'
    const noteId = lanMot.store.addBlock('affine:note', {}, lanMot.store.root!.id)
    lanMot.store.addBlock('affine:paragraph', { text: new Text(noiDungMau) }, noteId)

    // Đợi lượt ghi này đẩy xong lên cặp source giả trước khi đóng — cùng lý do đã giải thích trong
    // EdgelessBoard.tsx cho lượt ghi seed: forceStop() không điều kiện có thể cắt ngang lượt ghi
    // đang dở, làm mất đúng nội dung ca kiểm này định kiểm tra.
    await lanMot.workspace.waitForSynced()
    lanMot.workspace.forceStop()

    const lanHai = await taoHoacMoBang({ docSources, blobSources })
    const note = lanHai.store.root!.children.find((c) => c.flavour === 'affine:note')
    expect(note).toBeDefined()
    const doanVan = note!.children.find((c) => c.flavour === 'affine:paragraph')
    expect(doanVan).toBeDefined()
    const text = (doanVan as unknown as { props: { text: { toString(): string } } }).props.text
    expect(text.toString()).toBe(noiDungMau)

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
