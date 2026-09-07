// @vitest-environment happy-dom
//
// Task 4 (giai đoạn 7-9, kho bài viết) — CỔNG CHẶN PHÁT HÀNH của giai đoạn 7.
//
// Task 3 đã đưa metadata `MucMeta` vào Xuất/Nhập file; ca kiểm này canh nửa còn lại: NỘI DUNG doc
// CRDT (chữ trong bài, tiêu đề, ảnh chèn, phần tử chữ trên canvas của sơ đồ) cũng phải đi theo, và
// phải đi qua ĐÚNG đường người dùng bấm — mount `<App />` thật, bấm "Xuất file sao lưu", đọc Blob
// thật, rồi nạp lại bằng `<input type=file>` thật.
//
// Vì sao không kiểm ở tầng module cho nhanh: `src/board/__tests__/xuat-nhap-noi-dung.spec.ts` đã
// canh `xuatSnapshotMuc`/`nhapSnapshotMuc` với nguồn giả. Thứ nó KHÔNG canh được là DÂY NỐI —
// App.tsx có thật sự `import()` module đó trong `handleExport`/`handleConfirmImport` không, có
// truyền đúng `loai` không, khoá `mucDocs` có thật sự nằm trong file không. Quên một khâu ở đó thì
// bộ kiểm tầng module vẫn xanh trọn vẹn.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'

import { Text } from '@blocksuite/store'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { taoHoacMoDoc } from '../board/mo-doc'
import { trichVanBanTuKhoi, type MucMeta } from '../board/mucMeta'
import { donRacBlobBang, xoaNoiDungBang } from '../board/xoaNoiDungBang'

// Mount `<App />` + mở/đóng bốn workspace BlockSuite trên IndexedDB giả — hạn giờ mặc định 20000ms
// của dự án không đủ. Nới CỤC BỘ cho file này, đúng khuôn `sau-man-luoi-muc.spec.tsx` và
// `tao-bai-moi-tu-trang-chu.spec.tsx` đã dùng; KHÔNG đụng `testTimeout` toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000

// Vỏ nạp chậm thật không mount được dưới happy-dom (cùng lý do DataSyncScreen-mucs.spec.tsx đã ghi).
// Màn "Đồng bộ dữ liệu" không hiển thị bảng vẽ nào, nên vỏ giả chỉ cần tồn tại để App() mount được.
// KHÔNG mock `../board/xuatNhapNoiDung`: đó chính là thứ ca kiểm này canh.
vi.mock('../board/index', () => ({
  VoMuc: () => null,
}))

const ID_BAI = 'muc-noi-dung-bai-viet'
const ID_SO_DO = 'muc-noi-dung-so-do'
const BYTE_ANH = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 42, 42, 42, 7])

function mucGia(id: string, loai: 'bai-viet' | 'so-do', ten: string): MucMeta {
  const bayGio = Date.now()
  return {
    id,
    loai,
    danhMuc: 'ecg',
    ten,
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: '',
    tags: [],
    noiDungTimKiem: '',
  }
}

type StoreLike = Awaited<ReturnType<typeof taoHoacMoDoc>>['store']

function layPhanTuCanvas(store: StoreLike): Y.Map<Y.Map<unknown>> {
  const surface = store.root!.children.find((k) => k.flavour === 'affine:surface')!
  return (
    surface.props as unknown as { elements: { getValue(): Y.Map<Y.Map<unknown>> | undefined } }
  ).elements.getValue()!
}

afterEach(async () => {
  for (const m of await idbGetAll<{ id: string }>(IDB_STORES.mucs)) {
    await idbDelete(IDB_STORES.mucs, m.id)
  }
  await xoaNoiDungBang([ID_BAI, ID_SO_DO])
  localStorage.clear()
  vi.restoreAllMocks()
})

async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
  await waitFor(() => expect(screen.getByText('Bài viết & Sơ đồ')).toBeTruthy())
  // Câu hướng dẫn thường trực của màn không được hứa điều nay đã SAI kể từ Task 4: nội dung doc
  // CRDT bị THAY HẲN theo id (không phải "dữ liệu hiện có không bị xoá"). Từ Task 4b, "Hoàn tác"
  // lùi được cả nội dung — nhưng CHỈ khi còn đứng ở màn này, và câu chữ phải nói rõ điều kiện đó
  // thay vì hứa một lưới an toàn vĩnh viễn không tồn tại.
  const huongDan = screen.getByText(/Nhập file sẽ gộp theo id/)
  expect(huongDan.textContent).not.toContain('dữ liệu hiện có trên máy không bị xoá')
  expect(huongDan.textContent).toContain('rời màn hình là nội dung cũ mất hẳn')
}

/** Bấm "Xuất file sao lưu" và trả về nội dung file, chặn ở `URL.createObjectURL`. */
async function xuatRaFile(): Promise<string> {
  let blobDaXuat: Blob | null = null
  const gocCreate = URL.createObjectURL
  const gocRevoke = URL.revokeObjectURL
  // Object.defineProperty (không gán thẳng) — gán thẳng có thể không có hiệu lực dưới happy-dom,
  // xem chú thích ở edgeless-board-image-toast-2.spec.ts.
  Object.defineProperty(URL, 'createObjectURL', {
    value: (b: Blob) => {
      blobDaXuat = b
      return 'blob:gia-lap-xuat-noi-dung'
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  try {
    fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
    // Lượt xuất giờ ĐỌC NỘI DUNG từng mục (mở/đóng workspace BlockSuite) trước khi dựng Blob — chờ
    // lâu hơn hẳn so với lượt chỉ gom metadata của Task 3.
    await waitFor(() => expect(blobDaXuat).not.toBeNull(), { timeout: 30000 })
    return await (blobDaXuat as unknown as Blob).text()
  } finally {
    Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
  }
}

describe('[CỔNG] Xuất → xoá sạch → Nhập lại: nội dung bài viết và sơ đồ giống hệt, kể cả ảnh', () => {
  it('xuất file → xoá sạch mucs (metadata + doc + ảnh) → nhập lại → nội dung khớp từng chữ', async () => {
    // ── 1. Dựng dữ liệu thật trên "máy": một bài viết có ảnh + một sơ đồ có chữ trên canvas ────
    const bai = await taoHoacMoDoc(ID_BAI, 'bai-viet')
    bai.store.updateBlock(bai.store.root!, { title: new Text('Tiếp cận khó thở cấp') })
    const note = bai.store.root!.children.find((k) => k.flavour === 'affine:note')!
    bai.store.addBlock('affine:paragraph', { text: new Text('Bước 1: đánh giá đường thở') }, note.id)
    bai.store.addBlock('affine:paragraph', { text: new Text('Bước 2: SpO2 và khí máu') }, note.id)
    const idAnh = await bai.workspace.blobSync.set(new Blob([BYTE_ANH], { type: 'image/png' }))
    bai.store.addBlock('affine:image', { sourceId: idAnh, width: 240, height: 160 }, note.id)
    const vanBanBaiGoc = trichVanBanTuKhoi(bai.store.root!)
    await bai.workspace.waitForSynced()
    bai.workspace.forceStop()

    const soDo = await taoHoacMoDoc(ID_SO_DO, 'so-do')
    const phanTu = layPhanTuCanvas(soDo.store)
    const chu = new Y.Map<unknown>()
    chu.set('type', 'text')
    chu.set('id', 'el-so-do-1')
    chu.set('xywh', '[0,0,200,60]')
    chu.set('index', 'a0')
    chu.set('seed', 7)
    chu.set('text', new Y.Text('Nhánh: tràn khí màng phổi'))
    phanTu.set('el-so-do-1', chu)
    await soDo.workspace.waitForSynced()
    soDo.workspace.forceStop()

    await idbPut(IDB_STORES.mucs, mucGia(ID_BAI, 'bai-viet', 'Khó thở cấp'))
    await idbPut(IDB_STORES.mucs, mucGia(ID_SO_DO, 'so-do', 'Sơ đồ khó thở'))

    // ── 2. Xuất file qua đúng nút bấm ─────────────────────────────────────────────────────────
    await moManDongBo()
    const noiDungFile = await xuatRaFile()
    const daPhanTich = JSON.parse(noiDungFile) as {
      data: { mucs: MucMeta[]; mucDocs: Record<string, { anh: { id: string }[] }> }
    }
    expect(daPhanTich.data.mucs.map((m) => m.id).sort()).toEqual([ID_BAI, ID_SO_DO].sort())
    // Tiêu chí 4 của giai đoạn 7: mở file ra là thấy nội dung doc, không chỉ tên mục.
    expect(Object.keys(daPhanTich.data.mucDocs).sort()).toEqual([ID_BAI, ID_SO_DO].sort())
    expect(daPhanTich.data.mucDocs[ID_BAI].anh.map((a) => a.id)).toContain(idAnh)

    // ── 3. XOÁ SẠCH: metadata + doc CRDT + ảnh ────────────────────────────────────────────────
    for (const m of await idbGetAll<{ id: string }>(IDB_STORES.mucs)) {
      await idbDelete(IDB_STORES.mucs, m.id)
    }
    expect(await xoaNoiDungBang([ID_BAI, ID_SO_DO])).toBe(true)
    // Ảnh đánh khoá theo băm nội dung, không theo id mục — dọn bằng chính bộ gom rác của app, chạy
    // SAU khi doc đã biến mất (xem donRacBlobBang). `not.toBeNull()` là bắt buộc: hàm đó BỎ lượt
    // dọn khi môi trường thiếu `indexedDB.databases()`, và một lượt bỏ im lặng sẽ để ảnh cũ nằm
    // lại làm bước kiểm ảnh bên dưới thành vô nghĩa.
    const ketQuaDon = await donRacBlobBang()
    expect(ketQuaDon, 'phải dọn được ảnh mồ côi, không được bỏ lượt').not.toBeNull()
    expect(ketQuaDon!.daXoa).toBeGreaterThanOrEqual(1)

    // Chứng minh máy đã TRỐNG THẬT trước khi nhập — nếu không, mọi khẳng định sau lượt nhập đều có
    // thể chỉ là dữ liệu cũ chưa bị đụng tới.
    const baiTrong = await taoHoacMoDoc(ID_BAI, 'bai-viet')
    expect(trichVanBanTuKhoi(baiTrong.store.root!)).toBe('')
    expect(await baiTrong.workspace.blobSync.get(idAnh)).toBeNull()
    baiTrong.workspace.forceStop()
    const soDoTrong = await taoHoacMoDoc(ID_SO_DO, 'so-do')
    expect([...layPhanTuCanvas(soDoTrong.store).keys()]).toEqual([])
    soDoTrong.workspace.forceStop()
    // `taoHoacMoDoc` vừa seed lại hai doc rỗng — dọn nốt để lượt nhập bắt đầu từ đúng con số không.
    await xoaNoiDungBang([ID_BAI, ID_SO_DO])

    // ── 4. Nhập lại chính file vừa xuất ───────────────────────────────────────────────────────
    const file = new File([noiDungFile], 'sao-luu-noi-dung.json', { type: 'application/json' })
    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(inputFile, { target: { files: [file] } })
    const nutXacNhan = await screen.findByRole('button', { name: 'Xác nhận nhập' })
    // Câu cảnh báo phải đứng TRƯỚC khi bấm: nội dung doc bị THAY HẲN, và lưới an toàn duy nhất là
    // nút "Hoàn tác" của chính màn này (Task 4b) — rời màn hình là mất. Nói điều đó ở câu báo SAU
    // khi nhập xong thì đã muộn.
    expect(
      screen.getByText(/sẽ bị THAY HẲN/),
      'panel xem trước phải cảnh báo nội dung doc sẽ bị thay hẳn',
    ).toBeTruthy()
    expect(
      screen.getByText(/rời màn hình là nội dung cũ mất hẳn/),
      'panel xem trước phải nói rõ lưới an toàn chỉ sống trong màn này',
    ).toBeTruthy()
    fireEvent.click(nutXacNhan)
    await waitFor(() => expect(screen.getByText(/ghi xong nội dung 2\/2/)).toBeTruthy(), {
      timeout: 40000,
    })

    // ── 5. Đối chiếu ──────────────────────────────────────────────────────────────────────────
    const baiSau = await taoHoacMoDoc(ID_BAI, 'bai-viet')
    expect(trichVanBanTuKhoi(baiSau.store.root!)).toBe(vanBanBaiGoc)
    expect(String((baiSau.store.root!.props as { title?: unknown }).title)).toBe(
      'Tiếp cận khó thở cấp',
    )
    const noteSau = baiSau.store.root!.children.find((k) => k.flavour === 'affine:note')!
    const anhSau = noteSau.children.find((k) => k.flavour === 'affine:image')
    expect(anhSau, 'khối ảnh phải trở lại').toBeDefined()
    expect((anhSau!.props as { sourceId?: string }).sourceId).toBe(idAnh)
    const blobSau = await baiSau.workspace.blobSync.get(idAnh)
    expect(blobSau, 'byte ảnh phải trở lại kho blob').not.toBeNull()
    expect(new Uint8Array(await blobSau!.arrayBuffer())).toEqual(BYTE_ANH)
    expect(
      [...baiSau.store.getAllModels()].filter((m) => m.flavour === 'affine:page'),
      'đúng một khối gốc — hai affine:page là lỗi bảng-trắng đã đo thật, xem mo-doc.ts',
    ).toHaveLength(1)
    baiSau.workspace.forceStop()

    const soDoSau = await taoHoacMoDoc(ID_SO_DO, 'so-do')
    const phanTuSau = layPhanTuCanvas(soDoSau.store)
    expect([...phanTuSau.keys()]).toEqual(['el-so-do-1'])
    expect(String(phanTuSau.get('el-so-do-1')!.get('text'))).toBe('Nhánh: tràn khí màng phổi')
    soDoSau.workspace.forceStop()

    // Metadata cũng phải trở lại — hai nửa của cùng một lượt khôi phục.
    const metaSau = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(metaSau.find((m) => m.id === ID_BAI)?.ten).toBe('Khó thở cấp')
    expect(metaSau.find((m) => m.id === ID_SO_DO)?.loai).toBe('so-do')
  }, HAN_GIO_MOUNT_APP_MS)
})
