import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { Text } from '@blocksuite/store'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'
import { diTruBangCuNeuCo, diTruNoiDungTimKiemNeuCo } from '../diTruBangCu'
import { taoHoacMoDoc } from '../mo-doc'

function bangMetaGia(overrides: Partial<MucMeta> & { id: string }): MucMeta {
  return {
    // Toàn bộ ca kiểm trong file này di trú "bảng cũ" trước khi có phân loại — giá trị của bảng
    // sơ đồ đời cũ (xem task-1-brief.md) là đủ, `overrides` vẫn ghi đè được nếu một ca cần khác.
    loai: 'so-do',
    danhMuc: 'tiep-can',
    ten: 'Bảng',
    taoLuc: 1,
    capNhatLuc: 1,
    chuyenKhoa: 'noi',
    tags: [],
    noiDungTimKiem: '',
    ...overrides,
  }
}

function dungDocSourceGia(): DocSource & { kho: Map<string, Uint8Array[]> } {
  const kho = new Map<string, Uint8Array[]>()
  return {
    name: 'gia-lap',
    kho,
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

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
})

describe('diTruBangCuNeuCo', () => {
  it('có bảng cũ (docId "board" đã có nội dung) và CHƯA có metadata → tạo metadata "Bảng đầu tiên"', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    // Dựng nội dung "bảng cũ" giống hệt cách EdgelessBoard.tsx đã làm trước chặng BoardGallery.
    const bangCu = await taoHoacMoDoc('board', 'so-do', { docSources, blobSources })
    const noteId = bangCu.store.addBlock('affine:note', {}, bangCu.store.root!.id)
    bangCu.store.addBlock('affine:paragraph', { text: new Text('nội dung bảng cũ') }, noteId)
    await bangCu.workspace.waitForSynced()
    bangCu.workspace.forceStop()

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(ds).toHaveLength(1)
    expect(ds[0].id).toBe('board')
    expect(ds[0].ten).toBe('Bảng đầu tiên')
  })

  it('máy mới, không có bảng cũ nào → không tạo metadata gì cả', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll(IDB_STORES.boards)
    expect(ds).toHaveLength(0)
  })

  it('đã có metadata cho "board" từ trước → không ghi đè, không tạo trùng', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const bangCu = await taoHoacMoDoc('board', 'so-do', { docSources, blobSources })
    bangCu.workspace.forceStop()

    // Người dùng đã tự đổi tên bảng cũ TRƯỚC lượt di trú này chạy (vd đã chạy di trú một lần rồi).
    const { idbPut } = await import('../../lib/idb')
    await idbPut(IDB_STORES.boards, { id: 'board', ten: 'Tên do người dùng đặt', taoLuc: 1, capNhatLuc: 1 })

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(ds).toHaveLength(1)
    expect(ds[0].ten).toBe('Tên do người dùng đặt')
  })

  it('có doc "board" nhưng KHÔNG có nội dung thật (chỉ affine:page, chưa có affine:surface) → không tạo metadata', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    // Dựng THỦ CÔNG qua TestWorkspace trực tiếp — KHÔNG dùng taoHoacMoDoc(), vì hàm đó luôn seed
    // đủ CẢ HAI affine:page + affine:surface (xem mo-doc.ts, nhánh `!store.root`). Ca kiểm
    // này cần đúng trạng thái "đăng ký dở dang": doc 'board' tồn tại và có root, nhưng thiếu hẳn
    // affine:surface — mô phỏng một lượt ghi seed bị cắt ngang giữa chừng (tab đóng đúng lúc) hoặc
    // một doc do một phiên bản code cũ hơn/khác tạo ra mà chưa từng vẽ gì. diTruBangCuNeuCo() PHẢI
    // coi đây là "chưa có nội dung thật", không được tạo metadata "Bảng đầu tiên" cho một bảng
    // trống rỗng.
    const storeManagerRieng = new StoreExtensionManager(getInternalStoreExtensions())
    const workspace = new TestWorkspace({
      id: 'bs-trong-board',
      idGenerator: createAutoIncrementIdGenerator(),
      docSources,
      blobSources,
    })
    workspace.meta.initialize()
    workspace.start()
    await workspace.waitForSynced()
    const doc = workspace.createDoc('board')
    const store = doc.getStore({ extensions: storeManagerRieng.get('store') })
    doc.load()
    store.addBlock('affine:page', {}) // CHỈ page — cố ý KHÔNG addBlock('affine:surface', ...)
    await workspace.waitForSynced()
    workspace.forceStop()

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll(IDB_STORES.boards)
    expect(ds).toHaveLength(0)
  })

  it('IndexedDB hỏng vĩnh viễn (pull/push không bao giờ resolve) + hạn giờ nhỏ → vẫn trả về, không treo, không tạo metadata', async () => {
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

    await diTruBangCuNeuCo({
      docSources: { main: docSourceTreo },
      blobSources: { main: blobSourceTreo },
      hanGioMs: 20,
    })

    const ds = await idbGetAll(IDB_STORES.boards)
    expect(ds).toHaveLength(0)
  }, 10_000)
})

describe('diTruNoiDungTimKiemNeuCo', () => {
  it('bảng thiếu noiDungTimKiem, có nội dung thật trong doc → trích và ghi lại', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const bang = await taoHoacMoDoc('bang-1', 'so-do', { docSources, blobSources })
    const noteId = bang.store.addBlock('affine:note', {}, bang.store.root!.id)
    bang.store.addBlock('affine:paragraph', { text: new Text('nội dung cần tìm') }, noteId)
    await bang.workspace.waitForSynced()
    bang.workspace.forceStop()

    await idbPut(IDB_STORES.boards, bangMetaGia({ id: 'bang-1' }))

    await diTruNoiDungTimKiemNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    expect(ds[0].noiDungTimKiem).toContain('nội dung cần tìm')
  })

  it('bảng đã có noiDungTimKiem không rỗng → không đụng lại, giữ nguyên', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    await idbPut(
      IDB_STORES.boards,
      bangMetaGia({ id: 'bang-2', noiDungTimKiem: 'đã trích từ trước' }),
    )

    // KHÔNG dựng doc thật cho 'bang-2' — nếu hàm lỡ cố mở nó, workspace.getDoc() trả về
    // undefined/rỗng nên vẫn không ghi đè, nhưng test này khẳng định đúng NGỮ NGHĨA "bỏ qua bảng đã
    // có sẵn", không phụ thuộc hành vi mở doc thất bại.
    await diTruNoiDungTimKiemNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    expect(ds[0].noiDungTimKiem).toBe('đã trích từ trước')
  })

  it('không có bảng nào cần di trú → không tạo/sửa gì, không ném lỗi', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    await idbPut(IDB_STORES.boards, bangMetaGia({ id: 'bang-3', noiDungTimKiem: 'sẵn rồi' }))

    await diTruNoiDungTimKiemNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    expect(ds).toHaveLength(1)
    expect(ds[0].noiDungTimKiem).toBe('sẵn rồi')
  })

  it('bảng cần di trú nhưng doc không mở được (đã xoá/không tồn tại) → bỏ qua êm, không ném lỗi', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    await idbPut(IDB_STORES.boards, bangMetaGia({ id: 'bang-mo-coi' }))

    await expect(diTruNoiDungTimKiemNeuCo({ docSources, blobSources })).resolves.toBeUndefined()

    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    expect(ds[0].noiDungTimKiem).toBe('')
  })

  it('IndexedDB hỏng vĩnh viễn + hạn giờ nhỏ → vẫn trả về, không treo, không ghi gì', async () => {
    const docSourceTreo: DocSource = {
      name: 'treo-mai',
      pull: () => new Promise(() => {}),
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

    await idbPut(IDB_STORES.boards, bangMetaGia({ id: 'bang-4' }))

    await diTruNoiDungTimKiemNeuCo({
      docSources: { main: docSourceTreo },
      blobSources: { main: blobSourceTreo },
      hanGioMs: 20,
    })

    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    expect(ds[0].noiDungTimKiem).toBe('')
  }, 10_000)
})
