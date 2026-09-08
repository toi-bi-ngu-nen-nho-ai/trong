// Task 4 (giai đoạn 7-9, kho bài viết): vòng tròn XUẤT → xoá sạch → NHẬP cho NỘI DUNG doc CRDT
// (chữ trong bài, phần tử canvas của sơ đồ, ảnh chèn) — phần Task 3 cố ý để lại (Task 3 chỉ mang
// metadata `MucMeta`).
//
// environment 'node' (mặc định) — file này không mount cây Lit nào, chỉ đọc/ghi `store`. docSources/
// blobSources GIẢ thay cho IndexedDB, cùng kỹ thuật với mo-doc-seed.spec.ts (đọc file đó để hiểu
// vì sao). "Xoá sạch" được mô phỏng bằng một CẶP NGUỒN MỚI TINH: không
// một byte nào của lượt trước còn lại, đúng nghĩa máy vừa cài lại app.
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'
import { Text } from '@blocksuite/store'

import { taoHoacMoDoc } from '../mo-doc'
import { trichVanBanTuKhoi } from '../mucMeta'
import { nhapSnapshotMuc, xuatSnapshotMuc } from '../xuatNhapNoiDung'

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

/** Một "máy" — cặp nguồn dùng chung cho mọi lượt mở doc trên cùng thiết bị. */
function mayGia() {
  return {
    docSources: { main: dungDocSourceGia() },
    blobSources: { main: dungBlobSourceGia() },
  }
}

type StoreLike = Awaited<ReturnType<typeof taoHoacMoDoc>>['store']

/** `elements` của khối `affine:surface` — nơi phần tử canvas (chữ tự do, hình, mindmap) sống. */
function layPhanTuCanvas(store: StoreLike): Y.Map<Y.Map<unknown>> {
  const surface = store.root!.children.find((k) => k.flavour === 'affine:surface')!
  return (
    surface.props as unknown as { elements: { getValue(): Y.Map<Y.Map<unknown>> | undefined } }
  ).elements.getValue()!
}

/**
 * Ép gói nội dung đi qua JSON THẬT — đúng thứ `handleExport` ghi vào file và `handleFileChange` đọc
 * lại. Một `Y.Text`/`Blob`/`undefined` lọt vào gói sẽ chết ở đây chứ không âm thầm sống sót nhờ hai
 * đầu vòng tròn cùng ở trong một tiến trình.
 */
function quaFileJson<T>(goi: T): T {
  return JSON.parse(JSON.stringify(goi)) as T
}

describe('xuatSnapshotMuc / nhapSnapshotMuc — vòng tròn nội dung doc', () => {
  it('vòng tròn: mở doc, gõ chữ, xuất snapshot, xoá doc, nhập lại — nội dung giống hệt', async () => {
    // 1. Dựng một bài viết có tiêu đề + hai đoạn văn.
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m1', 'bai-viet', may1)
    a.store.updateBlock(a.store.root!, { title: new Text('Tiếp cận đau ngực cấp') })
    const note = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    a.store.addBlock('affine:paragraph', { text: new Text('Đoạn một: phân tầng nguy cơ') }, note.id)
    a.store.addBlock('affine:paragraph', { text: new Text('Đoạn hai: ECG trong 10 phút') }, note.id)
    const vanBanGoc = trichVanBanTuKhoi(a.store.root!)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    // 2. Xuất.
    const goi = await xuatSnapshotMuc('m1', 'bai-viet', may1)
    expect(goi, 'xuất phải trả về gói nội dung').toBeDefined()
    const goiQuaFile = quaFileJson(goi!)

    // 3. "Xoá sạch": một máy mới tinh, không có doc 'm1' nào.
    const may2 = mayGia()
    const truoc = await taoHoacMoDoc('m1', 'bai-viet', may2)
    expect(trichVanBanTuKhoi(truoc.store.root!), 'máy mới phải trống').toBe('')
    truoc.workspace.forceStop()

    // 4. Nhập lại.
    await nhapSnapshotMuc('m1', 'bai-viet', goiQuaFile, may2)

    const sau = await taoHoacMoDoc('m1', 'bai-viet', may2)
    expect(trichVanBanTuKhoi(sau.store.root!)).toBe(vanBanGoc)
    expect(String((sau.store.root!.props as { title?: unknown }).title)).toBe(
      'Tiếp cận đau ngực cấp',
    )
    // Đúng MỘT khối gốc — hai `affine:page` trong một doc là lỗi đã đo thật ở dự án này (xem chú
    // thích dài trong mo-doc.ts): bảng vẽ không render được gì mà không báo lỗi nào.
    expect([...sau.store.getAllModels()].filter((m) => m.flavour === 'affine:page')).toHaveLength(1)
    expect(
      sau.store.root!.children.filter((k) => k.flavour === 'affine:surface'),
      'đúng một affine:surface',
    ).toHaveLength(1)
    sau.workspace.forceStop()
  })

  it('ảnh chèn trong bài viết cũng đi theo snapshot (blob middleware)', async () => {
    const byteAnh = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m2', 'bai-viet', may1)
    const idBlob = await a.workspace.blobSync.set(new Blob([byteAnh], { type: 'image/png' }))
    const note = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    a.store.addBlock('affine:image', { sourceId: idBlob, width: 320, height: 200 }, note.id)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    const goi = quaFileJson((await xuatSnapshotMuc('m2', 'bai-viet', may1))!)
    expect(goi.anh.map((x) => x.id)).toContain(idBlob)

    const may2 = mayGia()
    await nhapSnapshotMuc('m2', 'bai-viet', goi, may2)

    const sau = await taoHoacMoDoc('m2', 'bai-viet', may2)
    const noteSau = sau.store.root!.children.find((k) => k.flavour === 'affine:note')!
    const anhSau = noteSau.children.find((k) => k.flavour === 'affine:image')
    expect(anhSau, 'khối ảnh phải còn').toBeDefined()
    // `sourceId` là BĂM NỘI DUNG — trùng id nghĩa là đúng byte ảnh cũ, không phải một ảnh khác.
    expect((anhSau!.props as { sourceId?: string }).sourceId).toBe(idBlob)
    const blobSau = await sau.workspace.blobSync.get(idBlob)
    expect(blobSau, 'byte ảnh phải nằm trong kho blob của máy mới').not.toBeNull()
    expect(new Uint8Array(await blobSau!.arrayBuffer())).toEqual(byteAnh)
    expect(blobSau!.type).toBe('image/png')
    sau.workspace.forceStop()
  })

  it('sơ đồ: phần tử chữ trên canvas đi theo snapshot', async () => {
    const may1 = mayGia()
    const a = await taoHoacMoDoc('sd1', 'so-do', may1)
    const phanTu = layPhanTuCanvas(a.store)
    const chu = new Y.Map<unknown>()
    chu.set('type', 'text')
    chu.set('id', 'el-canvas-1')
    chu.set('xywh', '[0,0,180,48]')
    chu.set('index', 'a0')
    chu.set('seed', 42)
    chu.set('text', new Y.Text('Nhánh trái: ST chênh lên'))
    phanTu.set('el-canvas-1', chu)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    const goi = quaFileJson((await xuatSnapshotMuc('sd1', 'so-do', may1))!)

    const may2 = mayGia()
    await nhapSnapshotMuc('sd1', 'so-do', goi, may2)

    const sau = await taoHoacMoDoc('sd1', 'so-do', may2)
    const phanTuSau = layPhanTuCanvas(sau.store)
    expect([...phanTuSau.keys()]).toEqual(['el-canvas-1'])
    expect(String(phanTuSau.get('el-canvas-1')!.get('text'))).toBe('Nhánh trái: ST chênh lên')
    // Sơ đồ KHÔNG được mọc thêm note — `taoHoacMoDoc` seed khác nhau theo loại, và lượt nhập phải
    // trả về đúng hình dạng của snapshot chứ không trộn với phần seed.
    expect(sau.store.root!.children.map((k) => k.flavour)).toEqual(['affine:surface'])
    sau.workspace.forceStop()
  })

  it('gói nội dung hỏng trong file → ném rõ ràng và KHÔNG tạo doc rỗng cho id đó', async () => {
    const may = mayGia()
    // Đúng thứ một file JSON sửa tay/cắt cụt đưa vào: kiểu TypeScript nói đây là `NoiDungMuc`,
    // lúc chạy thì không.
    const goiHong = { anh: [] } as unknown as Parameters<typeof nhapSnapshotMuc>[2]
    await expect(nhapSnapshotMuc('m-hong', 'bai-viet', goiHong, may)).rejects.toThrow(/m-hong/)

    // Chưa mở doc thì kho nguồn phải còn TRỐNG. Nếu lượt nhập lỡ gọi `taoHoacMoDoc` trước khi kiểm,
    // nó đã seed sẵn một doc rỗng ở đây — rác mà chính lượt nhập hỏng này tạo ra.
    expect(await may.docSources.main.pull('m-hong', new Uint8Array())).toBeNull()
  })

  // NGÀY DỮ LIỆU KHÔNG HOÀN HẢO — đúng lý do một bản sao lưu tồn tại. Một ảnh mất khỏi kho blob
  // lúc XUẤT thì gói ra file còn khối `affine:image` (nó nằm trong snapshot) nhưng thiếu byte trong
  // `anh[]`. Lúc NHẬP, `ImageBlockTransformer.fromSnapshot` gọi `assets.writeToBlob(sourceId)` và
  // hàm đó NÉM khi map assets còn ảnh khác mà thiếu đúng ảnh này (`!assets.isEmpty() && sourceId`
  // — nên ca này phải có HAI ảnh, một ảnh thì map rỗng và guard tự bỏ qua). Lỗi đó bị
  // `snapshotToBlock` nuốt (`catch → return undefined`), và mọi khối SAU khối ảnh trong cùng cây
  // con không bao giờ được chèn: bài viết mất chữ, im lặng, trên chính đường KHÔI PHỤC.
  it('ảnh thiếu byte trong gói không được kéo theo phần CHỮ của bài', async () => {
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m4', 'bai-viet', may1)
    const note = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    const idAnh1 = await a.workspace.blobSync.set(
      new Blob([new Uint8Array([137, 80, 78, 71, 1, 1, 1])], { type: 'image/png' }),
    )
    const idAnh2 = await a.workspace.blobSync.set(
      new Blob([new Uint8Array([137, 80, 78, 71, 2, 2, 2, 2])], { type: 'image/png' }),
    )
    a.store.addBlock('affine:paragraph', { text: new Text('Đoạn TRƯỚC ảnh hỏng') }, note.id)
    a.store.addBlock('affine:image', { sourceId: idAnh1, width: 320, height: 200 }, note.id)
    a.store.addBlock('affine:paragraph', { text: new Text('Đoạn SAU ảnh hỏng') }, note.id)
    a.store.addBlock('affine:image', { sourceId: idAnh2, width: 320, height: 200 }, note.id)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    const goi = quaFileJson((await xuatSnapshotMuc('m4', 'bai-viet', may1))!)
    expect(goi.anh.map((x) => x.id).sort()).toEqual([idAnh1, idAnh2].sort())
    // Mô phỏng đúng thứ Critical 2 sinh ra: byte của MỘT ảnh không đọc được nên bị bỏ khỏi gói,
    // khối `affine:image` thì vẫn nằm nguyên trong snapshot.
    goi.anh = goi.anh.filter((x) => x.id !== idAnh1)

    const may2 = mayGia()
    const ketQua = await nhapSnapshotMuc('m4', 'bai-viet', goi, may2)
    // Mất ảnh phải ĐI RA NGOÀI thành dữ liệu, không chỉ là một dòng console: App.tsx gọi tên mục.
    expect(ketQua.anhThieu, 'lượt nhập phải khai đúng ảnh đã bỏ').toEqual([idAnh1])

    const sau = await taoHoacMoDoc('m4', 'bai-viet', may2)
    const vanBan = trichVanBanTuKhoi(sau.store.root!)
    expect(vanBan, 'chữ trước ảnh hỏng').toContain('Đoạn TRƯỚC ảnh hỏng')
    expect(vanBan, 'chữ SAU ảnh hỏng KHÔNG được biến mất theo').toContain('Đoạn SAU ảnh hỏng')
    // Ảnh còn byte thì phải về đủ — mất một ảnh không được kéo theo ảnh lành.
    const noteSau = sau.store.root!.children.find((k) => k.flavour === 'affine:note')!
    expect(
      noteSau.children.filter((k) => k.flavour === 'affine:image').map((k) => (k.props as { sourceId?: string }).sourceId),
      'chỉ còn ảnh có byte',
    ).toEqual([idAnh2])
    expect(await sau.workspace.blobSync.get(idAnh2), 'byte ảnh lành').not.toBeNull()
    sau.workspace.forceStop()
  })

  // Máy này VẪN còn byte ảnh (lượt xuất lỡ nó vì sự cố tạm thời) — khôi phục bản sao lưu không
  // được phép nhân đó mà xoá luôn ảnh đang lành trên máy.
  it('ảnh thiếu trong gói nhưng CÒN trong kho blob trên máy → giữ nguyên khối ảnh', async () => {
    const byteAnh = new Uint8Array([137, 80, 78, 71, 9, 9, 9])
    const may = mayGia()
    const a = await taoHoacMoDoc('m7', 'bai-viet', may)
    const idBlob = await a.workspace.blobSync.set(new Blob([byteAnh], { type: 'image/png' }))
    const note = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    a.store.addBlock('affine:paragraph', { text: new Text('Chữ đi kèm ảnh') }, note.id)
    a.store.addBlock('affine:image', { sourceId: idBlob, width: 320, height: 200 }, note.id)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    const goi = quaFileJson((await xuatSnapshotMuc('m7', 'bai-viet', may))!)
    goi.anh = []

    const ketQua = await nhapSnapshotMuc('m7', 'bai-viet', goi, may)
    expect(ketQua.anhThieu, 'byte còn trên máy thì không tính là thiếu').toEqual([])

    const sau = await taoHoacMoDoc('m7', 'bai-viet', may)
    const noteSau = sau.store.root!.children.find((k) => k.flavour === 'affine:note')!
    expect(noteSau.children.filter((k) => k.flavour === 'affine:image')).toHaveLength(1)
    expect(trichVanBanTuKhoi(sau.store.root!)).toContain('Chữ đi kèm ảnh')
    sau.workspace.forceStop()
  })

  it('ảnh mất khỏi kho blob lúc XUẤT → gói khai `anhThieu`, không im lặng', async () => {
    const may = mayGia()
    const a = await taoHoacMoDoc('m6', 'bai-viet', may)
    const idBlob = await a.workspace.blobSync.set(
      new Blob([new Uint8Array([137, 80, 78, 71, 5, 5])], { type: 'image/png' }),
    )
    const note = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    a.store.addBlock('affine:image', { sourceId: idBlob, width: 320, height: 200 }, note.id)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()

    // Byte biến mất khỏi kho (dọn rác quá tay, đồng bộ dở dang) — khối `affine:image` thì vẫn còn
    // trong doc. Đây là nhánh `!blob` mà `AssetsManager.readFromBlob` chỉ `console.error` rồi bỏ.
    await may.blobSources.main.delete(idBlob)

    const goi = (await xuatSnapshotMuc('m6', 'bai-viet', may))!
    expect(goi.anh, 'không đọc được thì không có byte để mang đi').toHaveLength(0)
    expect(goi.anhThieu, 'phải khai ảnh đã mất, để lượt xuất không tự nhận là trọn vẹn').toEqual([
      idBlob,
    ])
  })

  // Đúng thứ một file xuất từ bản app KHÁC mang lại: một flavour mà schema ở máy này không có.
  // `snapshotToBlock` không ném — nó `console.error` rồi trả `undefined` — nên nếu không kiểm giá
  // trị trả về thì cả cây con biến mất mà lượt nhập vẫn tính là thành công.
  it('khối có flavour lạ trong file → NÉM, không lặng lẽ bỏ cây con', async () => {
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m5', 'bai-viet', may1)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()
    const goi = quaFileJson((await xuatSnapshotMuc('m5', 'bai-viet', may1))!)
    goi.snapshot.blocks.children.push({
      type: 'block',
      id: 'khoi-la-1',
      flavour: 'affine:khong-co-that',
      props: {},
      children: [],
    })

    const may2 = mayGia()
    await expect(nhapSnapshotMuc('m5', 'bai-viet', goi, may2)).rejects.toThrow(
      /affine:khong-co-that/,
    )
  })

  // `snapshotToModelData` cũng nuốt lỗi và trả `undefined`. Im lặng ở đây = bài về máy mất TÊN.
  it('props khối gốc không dựng lại được → NÉM chứ không mất tên bài trong im lặng', async () => {
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m8', 'bai-viet', may1)
    a.store.updateBlock(a.store.root!, { title: new Text('Bài có tên') })
    await a.workspace.waitForSynced()
    a.workspace.forceStop()
    const goi = quaFileJson((await xuatSnapshotMuc('m8', 'bai-viet', may1))!)
    goi.snapshot.blocks.flavour = 'affine:khong-co-that'

    const may2 = mayGia()
    await expect(nhapSnapshotMuc('m8', 'bai-viet', goi, may2)).rejects.toThrow(/khối gốc/)
  })

  it('nhập ĐÈ lên một doc đang có nội dung — thay hẳn, không trộn lẫn', async () => {
    const may1 = mayGia()
    const a = await taoHoacMoDoc('m3', 'bai-viet', may1)
    const noteA = a.store.root!.children.find((k) => k.flavour === 'affine:note')!
    a.store.addBlock('affine:paragraph', { text: new Text('BẢN SAO LƯU') }, noteA.id)
    await a.workspace.waitForSynced()
    a.workspace.forceStop()
    const goi = quaFileJson((await xuatSnapshotMuc('m3', 'bai-viet', may1))!)

    // Máy khác, doc CÙNG id nhưng nội dung khác hẳn.
    const may2 = mayGia()
    const b = await taoHoacMoDoc('m3', 'bai-viet', may2)
    const noteB = b.store.root!.children.find((k) => k.flavour === 'affine:note')!
    b.store.addBlock('affine:paragraph', { text: new Text('NỘI DUNG TRÊN MÁY NÀY') }, noteB.id)
    await b.workspace.waitForSynced()
    b.workspace.forceStop()

    await nhapSnapshotMuc('m3', 'bai-viet', goi, may2)

    const sau = await taoHoacMoDoc('m3', 'bai-viet', may2)
    const vanBan = trichVanBanTuKhoi(sau.store.root!)
    expect(vanBan).toContain('BẢN SAO LƯU')
    expect(vanBan).not.toContain('NỘI DUNG TRÊN MÁY NÀY')
    expect([...sau.store.getAllModels()].filter((m) => m.flavour === 'affine:page')).toHaveLength(1)
    sau.workspace.forceStop()
  })
})
