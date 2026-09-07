// @vitest-environment happy-dom
//
// Task 4b (giai đoạn 7-9, kho bài viết): "Hoàn tác" sau khi nhập file phải lùi được cả NỘI DUNG doc
// CRDT, không chỉ bảng metadata.
//
// Vì sao task này tồn tại: Task 4 cho `handleConfirmImport` THAY HẲN nội dung doc theo id
// (`nhapSnapshotMuc`), nhưng `undoSnapshot` chỉ chụp các bảng metadata — nên nhập nhầm một file cũ
// là mất vĩnh viễn chữ/nét vẽ của đúng những mục trùng id. Doc CRDT không có thùng rác nào khác.
//
// Ba ca dưới đây đi ĐƯỜNG THẬT (mount `<App />`, bấm nút thật, `File` thật) theo đúng khuôn
// `dong-bo-noi-dung-muc.spec.tsx` của Task 4. Kiểm ở tầng module không thay được: thứ hỏng ở đây là
// DÂY NỐI trong DataSyncScreen (chụp có nằm TRƯỚC vòng ghi không, "Hoàn tác" có gọi lại module
// không, mục MỚI có được XOÁ nội dung thay vì khôi phục doc rỗng không).
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Text } from '@blocksuite/store'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { taoHoacMoDoc } from '../board/mo-doc'
import { trichVanBanTuKhoi, type MucMeta } from '../board/mucMeta'
import { TEN_STORE_DOC, xoaNoiDungBang } from '../board/xoaNoiDungBang'
import { xuatSnapshotMuc } from '../board/xuatNhapNoiDung'

// Mount `<App />` + mở/đóng nhiều workspace BlockSuite trên IndexedDB giả — hạn giờ mặc định
// 20000ms của dự án không đủ. Nới CỤC BỘ cho file này, đúng khuôn `sau-man-luoi-muc.spec.tsx` và
// `dong-bo-noi-dung-muc.spec.tsx` đã dùng; KHÔNG đụng `testTimeout` toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000

// Vỏ nạp chậm thật không mount được dưới happy-dom (cùng lý do DataSyncScreen-mucs.spec.tsx đã ghi).
// Màn "Đồng bộ dữ liệu" không hiển thị bảng vẽ nào, nên vỏ giả chỉ cần tồn tại để App() mount được.
vi.mock('../board/index', () => ({
  VoMuc: () => null,
}))

// Id mà lượt CHỤP nội dung cũ phải ném — ca "chụp hỏng không được chặn lượt nhập" bật nó lên.
// `null` (mặc định) = mọi lời gọi đi thẳng vào bản thật, nên hai ca còn lại không bị mock ảnh hưởng.
// Phải mock ở tầng module chứ không `vi.spyOn`: App.tsx nạp module này bằng `import()` ĐỘNG (D13),
// và namespace ESM sau lượt nạp đó không gán đè được.
let idChupHong: string | null = null
vi.mock('../board/xuatNhapNoiDung', async (importOriginal) => {
  const goc = await importOriginal<typeof import('../board/xuatNhapNoiDung')>()
  return {
    ...goc,
    xuatSnapshotMuc: async (...doiSo: Parameters<typeof goc.xuatSnapshotMuc>) => {
      if (doiSo[0] === idChupHong) throw new Error('giả lập: không đọc được nội dung cũ của mục này')
      return goc.xuatSnapshotMuc(...doiSo)
    },
  }
})

const ID_CU = 'hoan-tac-noi-dung-muc-cu'
const ID_CU_2 = 'hoan-tac-noi-dung-muc-cu-2'
const ID_MOI = 'hoan-tac-noi-dung-muc-moi'
const ID_TAM = 'hoan-tac-noi-dung-muc-tam'
const MOI_ID = [ID_CU, ID_CU_2, ID_MOI, ID_TAM]

// HAI ảnh, không phải một: `ImageBlockTransformer.fromSnapshot` BỎ QUA hoàn toàn khi map assets
// RỖNG (`if (!payload.assets.isEmpty() && …)`), nên một ca chỉ có một ảnh vẫn xanh kể cả khi đường
// ảnh hỏng — bẫy xanh giả đã đo thật ở Task 4.
const BYTE_ANH_1 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 1, 1, 1])
const BYTE_ANH_2 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 2, 2, 2, 2])

function mucGia(id: string, ten: string): MucMeta {
  const bayGio = Date.now()
  return {
    id,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten,
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: '',
    tags: [],
    noiDungTimKiem: '',
  }
}

/** Ghi một bài viết có nội dung `doan` (và tuỳ chọn ảnh) vào doc của `id`. */
async function ghiNoiDung(
  id: string,
  doan: string[],
  // `Uint8Array<ArrayBuffer>` chứ không `Uint8Array` trần: bản trần suy ra `ArrayBufferLike` (kể cả
  // SharedArrayBuffer), mà `BlobPart` chỉ nhận `ArrayBuffer`.
  byteAnh: Uint8Array<ArrayBuffer>[] = [],
): Promise<void> {
  const { workspace, store } = await taoHoacMoDoc(id, 'bai-viet')
  try {
    store.updateBlock(store.root!, { title: new Text(`Tiêu đề ${id}`) })
    const note = store.root!.children.find((k) => k.flavour === 'affine:note')!
    for (const d of doan) store.addBlock('affine:paragraph', { text: new Text(d) }, note.id)
    for (const byte of byteAnh) {
      const idAnh = await workspace.blobSync.set(new Blob([byte], { type: 'image/png' }))
      store.addBlock('affine:image', { sourceId: idAnh, width: 200, height: 120 }, note.id)
    }
    await workspace.waitForSynced()
  } finally {
    workspace.forceStop()
  }
}

/** Đọc lại toàn bộ chữ trong doc của `id`. CẢNH BÁO: tạo doc rỗng nếu id chưa có (taoHoacMoDoc). */
async function docNoiDung(id: string): Promise<string> {
  const { workspace, store } = await taoHoacMoDoc(id, 'bai-viet')
  try {
    return trichVanBanTuKhoi(store.root!)
  } finally {
    workspace.forceStop()
  }
}

/**
 * Dựng khối `mucDocs[<idDich>]` cho file nhập: soạn nội dung ở một doc TẠM rồi chụp, sau đó xoá
 * sạch doc tạm. Soạn ở doc tạm (không phải doc đích) để nội dung "trong file" không bao giờ đi qua
 * doc đang được ca kiểm quan sát.
 */
async function noiDungChoFile(doan: string[], byteAnh: Uint8Array<ArrayBuffer>[] = []): Promise<unknown> {
  await ghiNoiDung(ID_TAM, doan, byteAnh)
  const nd = await xuatSnapshotMuc(ID_TAM, 'bai-viet')
  expect(nd, 'phải chụp được nội dung mẫu để dựng file nhập').toBeTruthy()
  await xoaNoiDungBang([ID_TAM])
  return nd
}

/** Id của mọi BẢN GHI DOC còn nằm trong kho nội dung bảng (`drtrong-board` / `collection`). */
async function idBanGhiDoc(): Promise<string[]> {
  const db = await new Promise<IDBDatabase>((giai, tuChoi) => {
    // Mở ĐÚNG phiên bản 1 + tự dựng store y hệt `moDbThat()` của xoaNoiDungBang.ts — mở không nêu
    // phiên bản trên một máy chưa từng có DB này sẽ để lại DB rỗng mà BlockSuite không upgrade được.
    const yc = indexedDB.open('drtrong-board', 1)
    yc.onupgradeneeded = () => {
      const db = yc.result
      if (!db.objectStoreNames.contains(TEN_STORE_DOC)) {
        db.createObjectStore(TEN_STORE_DOC, { keyPath: 'id' })
      }
    }
    yc.onsuccess = () => giai(yc.result)
    yc.onerror = () => tuChoi(yc.error ?? new Error('không mở được drtrong-board'))
  })
  try {
    return await new Promise<string[]>((giai, tuChoi) => {
      const yc = db.transaction(TEN_STORE_DOC, 'readonly').objectStore(TEN_STORE_DOC).getAllKeys()
      yc.onsuccess = () => giai((yc.result ?? []).map(String))
      yc.onerror = () => tuChoi(yc.error ?? new Error('không đọc được danh sách doc'))
    })
  } finally {
    db.close()
  }
}

/** Khoá của mọi blob ảnh còn nằm trong kho (`drtrong-board_blob` / `blob`). */
async function khoaBlobConLai(): Promise<string[]> {
  if (typeof indexedDB.databases !== 'function') return []
  if (!(await indexedDB.databases()).some((d) => d.name === 'drtrong-board_blob')) return []
  const db = await new Promise<IDBDatabase>((giai, tuChoi) => {
    const yc = indexedDB.open('drtrong-board_blob')
    yc.onsuccess = () => giai(yc.result)
    yc.onerror = () => tuChoi(yc.error ?? new Error('không mở được drtrong-board_blob'))
  })
  try {
    if (!db.objectStoreNames.contains('blob')) return []
    return await new Promise<string[]>((giai, tuChoi) => {
      const yc = db.transaction('blob', 'readonly').objectStore('blob').getAllKeys()
      yc.onsuccess = () => giai((yc.result ?? []).map(String))
      yc.onerror = () => tuChoi(yc.error ?? new Error('không đọc được danh sách blob'))
    })
  } finally {
    db.close()
  }
}

afterEach(async () => {
  for (const m of await idbGetAll<{ id: string }>(IDB_STORES.mucs)) {
    await idbDelete(IDB_STORES.mucs, m.id)
  }
  await xoaNoiDungBang(MOI_ID)
  localStorage.clear()
  idChupHong = null
  vi.restoreAllMocks()
})

async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
  await waitFor(() => expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy())
}

/** Đưa `noiDungFile` qua đúng `<input type=file>` rồi bấm "Xác nhận nhập". */
async function nhapFile(noiDungFile: string) {
  const file = new File([noiDungFile], 'sao-luu-hoan-tac.json', { type: 'application/json' })
  const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(inputFile, { target: { files: [file] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
}

async function bamHoanTac() {
  fireEvent.click(await screen.findByRole('button', { name: /Hoàn tác lần nhập vừa rồi/ }))
}

describe('[CỔNG] Hoàn tác nhập file lùi được cả NỘI DUNG doc, không chỉ metadata (Task 4b)', () => {
  it('Hoàn tác trả lại NỘI DUNG cũ của mục bị file nhập ghi đè', async () => {
    // ── Dựng "máy": mục m1 đã có, nội dung CŨ ────────────────────────────────────────────────
    await ghiNoiDung(ID_CU, ['NỘI DUNG CŨ đoạn một', 'NỘI DUNG CŨ đoạn hai'])
    const vanBanCu = await docNoiDung(ID_CU)
    expect(vanBanCu).toContain('NỘI DUNG CŨ đoạn một')
    await idbPut(IDB_STORES.mucs, mucGia(ID_CU, 'Bài cũ trên máy'))

    const noiDungMoi = await noiDungChoFile(['NỘI DUNG MỚI từ file'])

    await moManDongBo()
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: {
          mucs: [mucGia(ID_CU, 'Bài đè từ file')],
          mucDocs: { [ID_CU]: noiDungMoi },
        },
      }),
    )

    // ── Lượt nhập ĐÃ đè nội dung ─────────────────────────────────────────────────────────────
    await waitFor(() => expect(screen.getByText(/ghi xong nội dung 1\/1/)).toBeTruthy(), {
      timeout: 40000,
    })
    expect(await docNoiDung(ID_CU)).toContain('NỘI DUNG MỚI từ file')

    // ── Hoàn tác phải trả NỘI DUNG về, không chỉ danh sách ────────────────────────────────────
    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Nội dung cũ của 1 bài viết\/sơ đồ đã trở lại/)).toBeTruthy(), {
      timeout: 40000,
    })

    const vanBanSau = await docNoiDung(ID_CU)
    expect(vanBanSau, 'nội dung cũ phải trở lại nguyên vẹn').toBe(vanBanCu)
    expect(vanBanSau).not.toContain('NỘI DUNG MỚI từ file')

    // Nửa metadata vẫn phải lùi như cũ — hai nửa của cùng một lượt hoàn tác.
    const meta = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(meta.find((m) => m.id === ID_CU)?.ten).toBe('Bài cũ trên máy')
  }, HAN_GIO_MOUNT_APP_MS)

  it('mục MỚI hoàn toàn: Hoàn tác gỡ luôn bản ghi doc và ảnh vừa ghi, không để lại rác mồ côi', async () => {
    // Không seed metadata cho ID_MOI: file mang một id máy CHƯA TỪNG CÓ.
    const noiDungMoi = await noiDungChoFile(['Bài mới toanh từ file'], [BYTE_ANH_1, BYTE_ANH_2])
    const khoaAnh = (noiDungMoi as { anh: { id: string }[] }).anh.map((a) => a.id)
    expect(khoaAnh, 'file mẫu phải mang HAI ảnh — một ảnh cho xanh giả').toHaveLength(2)

    await moManDongBo()
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: {
          mucs: [mucGia(ID_MOI, 'Mục mới từ file')],
          mucDocs: { [ID_MOI]: noiDungMoi },
        },
      }),
    )

    await waitFor(() => expect(screen.getByText(/ghi xong nội dung 1\/1/)).toBeTruthy(), {
      timeout: 40000,
    })
    expect(await idBanGhiDoc(), 'lượt nhập phải thật sự tạo bản ghi doc cho mục mới').toContain(ID_MOI)
    for (const k of khoaAnh) expect(await khoaBlobConLai()).toContain(k)

    // ── Hoàn tác ─────────────────────────────────────────────────────────────────────────────
    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Đã gỡ nội dung của 1 mục/)).toBeTruthy(), {
      timeout: 40000,
    })

    // (0) Mục không được ở lại trong lưới — `mucsCol.replaceAll(snapshot.mucs)` phải gỡ dòng metadata.
    const meta = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(meta.find((m) => m.id === ID_MOI), 'mục mới không được còn trong lưới').toBeUndefined()
    // (a) Bản ghi doc của mục mới KHÔNG còn. Đây là thứ bảo kê cho ảnh mồ côi nếu để lại.
    expect(await idBanGhiDoc(), 'bản ghi doc của mục mới phải biến mất').not.toContain(ID_MOI)
    // (b) Blob của cả HAI ảnh KHÔNG còn.
    const blobConLai = await khoaBlobConLai()
    for (const k of khoaAnh) expect(blobConLai, `ảnh ${k} phải bị dọn theo`).not.toContain(k)
  }, HAN_GIO_MOUNT_APP_MS)

  it('chụp nội dung cũ hỏng ở MỘT mục: lượt nhập vẫn ghi đủ, Hoàn tác gọi tên đúng mục không lùi được', async () => {
    await ghiNoiDung(ID_CU, ['CŨ của mục một'])
    await ghiNoiDung(ID_CU_2, ['CŨ của mục hai'])
    const vanBanCu2 = await docNoiDung(ID_CU_2)
    await idbPut(IDB_STORES.mucs, mucGia(ID_CU, 'Mục chụp hỏng'))
    await idbPut(IDB_STORES.mucs, mucGia(ID_CU_2, 'Mục chụp được'))

    const noiDungMoi = await noiDungChoFile(['MỚI cho cả hai mục'])
    // Chỉ mục thứ nhất đọc hỏng lúc chụp.
    idChupHong = ID_CU

    await moManDongBo()
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: {
          mucs: [mucGia(ID_CU, 'Mục chụp hỏng (file)'), mucGia(ID_CU_2, 'Mục chụp được (file)')],
          mucDocs: { [ID_CU]: noiDungMoi, [ID_CU_2]: noiDungMoi },
        },
      }),
    )

    // Chụp hỏng KHÔNG được chặn lượt nhập: cả hai mục vẫn phải được ghi nội dung mới.
    await waitFor(() => expect(screen.getByText(/ghi xong nội dung 2\/2/)).toBeTruthy(), {
      timeout: 60000,
    })
    expect(await docNoiDung(ID_CU)).toContain('MỚI cho cả hai mục')
    expect(await docNoiDung(ID_CU_2)).toContain('MỚI cho cả hai mục')

    // ── Hoàn tác: mục chụp được thì về, mục chụp hỏng phải được GỌI TÊN ───────────────────────
    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Chưa trả lại được nội dung cũ của: Mục chụp hỏng/)).toBeTruthy(), {
      timeout: 60000,
    })

    expect(await docNoiDung(ID_CU_2), 'mục chụp được phải trở lại nội dung cũ').toBe(vanBanCu2)
    expect(await docNoiDung(ID_CU), 'mục chụp hỏng vẫn giữ nội dung vừa nhập — câu báo phải nói đúng thế').toContain(
      'MỚI cho cả hai mục',
    )
  }, HAN_GIO_MOUNT_APP_MS)
})
