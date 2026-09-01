// @vitest-environment happy-dom
//
// Tích hợp: một mẫu của HandyTemplateManager chèn được vào bảng THẬT qua đúng đường
// `EdgelessTemplatePanel._insertTemplate` dùng — `createTemplateJob('sticker')` → nạp blob vào
// `job.job.assets` → `insertTemplate(content)`. Canh KẾT QUẢ: khối `affine:image` xuất hiện dưới
// surface với blob vào được kho blob của bảng. Bài mau-handy.spec.ts chỉ canh
// `DocSnapshotSchema.parse`; bài này canh phần còn lại của chuỗi.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTemplateJob } from '@blocksuite/affine-gfx-template'

import { HandyTemplateManager } from '../mau-handy'
import { moBangVaTaoNoteCoNoiDung } from './helpers/note-interaction'

type ModelLike = { id: string; flavour: string; props: Record<string, unknown> }
type StoreLike = {
  root: (ModelLike & { children: ModelLike[] }) | null
  getModelsByFlavour(flavour: string): ModelLike[]
  blobSync: { get(key: string): Promise<Blob | null> | Blob | null }
}
type StdLike = { store: StoreLike }

let soBang = 0

describe('HandyTemplateManager — chèn sticker vào bảng thật', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    soBang += 1
    await moBangVaTaoNoteCoNoiDung(root, container, `mau-handy-chen-${soBang}`, 'x')
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
  })

  // Chạy cho CẢ HAI đường dữ liệu: bộ mũi tên (mau-handy.sinh) và một bộ nhãn dán mới
  // (mau-sticker.sinh). Chúng khác nhau ở tiền tố sourceId và thư mục public/, nên một lỗi ánh xạ
  // đường dẫn chỉ lộ ra ở một trong hai.
  it.each([['Mũi tên'], ['Giấy nhớ']])(
    'thả một mẫu %s → khối affine:image dưới surface, blob đã vào kho',
    async (danhMuc) => {
    const eh = document.querySelector('editor-host') as unknown as { std: StdLike }
    const std = eh.std as unknown as Parameters<typeof createTemplateJob>[0]
    const store = eh.std.store

    const truoc = store.getModelsByFlavour('affine:image').length

    const mau = new HandyTemplateManager().list(danhMuc)[0]
    expect(mau, `danh mục ${danhMuc} rỗng`).toBeDefined()
    const sourceId = Object.keys(mau.assets!)[0]
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0h10v10H0z"/></svg>'
    const blob = new Blob([svg], { type: 'image/svg+xml' })

    await act(async () => {
      const job = createTemplateJob(std, 'sticker', { x: 0, y: 0 })
      job.job.assets.set(sourceId, blob)
      await job.insertTemplate(mau.content)
    })

    const anh = store.getModelsByFlavour('affine:image')
    expect(anh.length).toBe(truoc + 1)

    const moi = anh[anh.length - 1]
    // Khối ảnh nằm dưới surface — đúng như addImages() của edgeless (addBlocks(blocks, gfx.surface)).
    const surface = store.root!.children.find((c) => c.flavour === 'affine:surface')!
    expect((moi as unknown as { parent: { id: string } }).parent.id).toBe(surface.id)

    // sourceId bị `replaceIdMiddleware` thay khi chèn — không so bằng chuỗi gốc, chỉ cần có và trỏ tới blob.
    const sid = moi.props.sourceId as string
    expect(sid).toBeTruthy()
    expect(await store.blobSync.get(sid)).toBeInstanceOf(Blob)
    },
  )
})
