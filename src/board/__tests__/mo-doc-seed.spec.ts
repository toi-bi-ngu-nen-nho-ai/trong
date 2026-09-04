// Canh hình dạng khối gốc mà `taoHoacMoDoc` seed cho TỪNG LOẠI mục.
//
// environment 'node' (mặc định) — file này không mount cây Lit nào, chỉ đọc `store`. docSources giả
// thay cho IndexedDB, cùng kỹ thuật với edgeless-board.spec.ts (đọc file đó để hiểu vì sao).
import { describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'

import { taoHoacMoDoc } from '../mo-doc'

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

/** Một cặp nguồn giả DÙNG CHUNG — tái sử dụng giữa hai lượt gọi để mô phỏng "đóng rồi mở lại app". */
function nguonGia() {
  return {
    docSources: { main: dungDocSourceGia() },
    blobSources: { main: dungBlobSourceGia() },
  }
}

describe('taoHoacMoDoc seed theo loại', () => {
  it("loại 'so-do' seed page + surface, KHÔNG có note", async () => {
    const { store, workspace } = await taoHoacMoDoc('sd-1', 'so-do', nguonGia())
    const con = store.root!.children.map((k) => k.flavour)

    expect(store.root!.flavour).toBe('affine:page')
    expect(con).toContain('affine:surface')
    expect(con).not.toContain('affine:note')

    workspace.forceStop()
  })

  it("loại 'bai-viet' seed page + surface + note + paragraph", async () => {
    const { store, workspace } = await taoHoacMoDoc('bv-1', 'bai-viet', nguonGia())
    const con = store.root!.children

    expect(store.root!.flavour).toBe('affine:page')
    expect(con.map((k) => k.flavour)).toContain('affine:surface')

    const note = con.find((k) => k.flavour === 'affine:note')
    expect(note, 'bài viết phải có note để có chỗ gõ').toBeDefined()
    expect(note!.children.map((k) => k.flavour)).toContain('affine:paragraph')

    workspace.forceStop()
  })

  it('mở lại một doc đã có KHÔNG seed đè lần hai', async () => {
    // Đây là cuộc đua đã đo thật 2026-08-30 (2 root + 2 surface; gfx.surface bám vào surface mồ
    // côi nên thanh công cụ vẽ ra mà không gì render được). Ca này canh rằng phép thêm tham số
    // `loai` không phá mất phần chống seed-đè.
    const nguon = nguonGia()
    const lan1 = await taoHoacMoDoc('bv-2', 'bai-viet', nguon)
    const soCon1 = lan1.store.root!.children.length
    lan1.workspace.forceStop()

    const lan2 = await taoHoacMoDoc('bv-2', 'bai-viet', nguon)
    expect(lan2.store.root!.children.length).toBe(soCon1)
    expect(
      lan2.store.root!.children.filter((k) => k.flavour === 'affine:surface').length,
    ).toBe(1)
    lan2.workspace.forceStop()
  })
})
