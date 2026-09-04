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

import { taoHoacMoBang } from '../mo-doc'

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

describe('taoHoacMoBang — đường cơ bản', () => {
  it('lần đầu trên cặp source rỗng → đúng 1 page, 1 surface, surface rỗng', async () => {
    const { store } = await taoHoacMoBang('board', {
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

    const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
    lanMot.workspace.forceStop()

    // store.root CHÍNH LÀ block affine:page (nó là root của store, không phải con của root) — nên
    // không thể có "affine:page trong children của root" để đếm; đó là kiểm tra bất khả thi, không
    // phải bug thật. Nếu taoHoacMoBang gọi createDoc('board') không điều kiện (bỏ nhánh rẽ đã
    // có/chưa có), dòng await ngay dưới đây sẽ NÉM LỖI "doc already exists" — đó chính là ca đỏ
    // ghim đúng lỗi mấu chốt §3 của spec. Sau khi qua được dòng đó, kiểm số affine:surface (con
    // thật của root) vẫn đúng 1 là bằng chứng seed không chạy lần hai.
    const lanHai = await taoHoacMoBang('board', { docSources, blobSources })
    const surfaces = lanHai.store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    lanHai.workspace.forceStop()
  })

  it('doc đăng ký trong meta nhưng chưa có block (ghi dở dang) → tự hồi phục, không ném lỗi', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
    lanMot.workspace.forceStop()

    // Mô phỏng ghi dở dang: xoá đúng lượt ghi của SUBDOC 'board' (nội dung khối: page + surface)
    // khỏi kho giả lập, NHƯNG giữ nguyên lượt ghi của ROOT doc (guid 'bs-trong-board' — id truyền
    // vào TestWorkspace trong mo-doc.ts, chứa metadata đăng ký doc 'board'). Kết quả giống
    // hệt một tab bị đóng đúng vào khe giữa hai lượt ghi lúc mở app lần đầu: getDoc('board') vẫn
    // thấy doc (meta đã lưu), nhưng store.root sẽ là null (khối chưa từng được lưu) — đúng ca mà
    // guard `!store.root` trong taoHoacMoBang() (mo-doc.ts) phải bắt được, thay vì chỉ dựa
    // vào "doc có tồn tại trong meta hay không".
    docSources.main.kho.delete('board')

    const lanHai = await taoHoacMoBang('board', { docSources, blobSources })
    expect(lanHai.store.root).not.toBeNull()
    const surfacesHoiPhuc = lanHai.store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfacesHoiPhuc).toHaveLength(1)
    lanHai.workspace.forceStop()
  })

  it('HAI lượt mở ĐỒNG THỜI cùng một bảng mới → đúng 1 page, 1 surface (HANDOFF 1.3)', async () => {
    // Đây là cơ chế THẬT của lỗi seed trùng, đo trên máy 2026-08-30 ở dev: React StrictMode mount
    // rồi remount, hai lượt `taoHoacMoBang()` chạy CHỒNG NHAU trên cùng một CSDL. Cả hai đều thấy
    // `getDoc()` trả null (lượt kia chưa kịp đẩy metadata), cả hai đều `createDoc` + seed, rồi CRDT
    // hợp nhất cả hai lượt ghi → doc có 2 `affine:page` và 2 `affine:surface`.
    // Hậu quả: `gfx.surface` bám vào surface MỒ CÔI (không phải con của `store.root`) nên
    // `gfx.surfaceComponent` null vĩnh viễn — bảng vẽ không render được gì, và lượt xuất PNG báo
    // "sơ đồ chưa có nội dung" cho một sơ đồ đầy nội dung.
    //
    // ĐÃ THỬ VÀ KHÔNG ĐỦ: chỉ làm chậm lượt `pull` của subdoc để tái hiện cửa sổ "nội dung chưa
    // tới". Ca đó XANH cả khi guard bị vô hiệu hoá — vì `waitForSynced()` đầu hàm đã nuốt trọn độ
    // trễ đó (peer xếp subdoc vào hàng đợi ngay ở bước 2, trước khi engine báo Synced). Đừng viết
    // lại ca kiểm theo hướng ấy: nó không có răng.
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const [motA, motB] = await Promise.all([
      taoHoacMoBang('board', { docSources, blobSources }),
      taoHoacMoBang('board', { docSources, blobSources }),
    ])

    await Promise.all([motA.workspace.waitForSynced(), motB.workspace.waitForSynced()])
    motA.workspace.forceStop()
    motB.workspace.forceStop()

    // Phải kiểm ở lượt mở THỨ BA, không phải trên chính hai store vừa dựng: mỗi lượt chỉ thấy seed
    // CỦA CHÍNH NÓ (lượt kia chưa được kéo về), nên đếm tại chỗ luôn ra 1 và ca kiểm mất răng. Chỉ
    // sau khi cả hai lượt ghi đã đẩy xong và được hợp nhất lại thì bản trùng mới lộ ra — đúng cách
    // người dùng gặp nó: lần mở kế tiếp.
    const lanBa = await taoHoacMoBang('board', { docSources, blobSources })
    // Đếm qua getBlocksByFlavour, KHÔNG qua `store.root.children`: một root thứ hai bị seed nhầm
    // nằm NGOÀI cây của root thứ nhất nên `children` không bao giờ nhìn thấy nó — đúng lý do lỗi
    // này sống sót qua mọi ca kiểm cũ trong chính file này.
    expect(lanBa.store.getBlocksByFlavour('affine:page')).toHaveLength(1)
    expect(lanBa.store.getBlocksByFlavour('affine:surface')).toHaveLength(1)
    lanBa.workspace.forceStop()
  })

  it('doc ĐÃ đăng ký nhưng nội dung KHÔNG BAO GIỜ tới → vẫn tự hồi phục sau hạn giờ, không treo', async () => {
    // Mặt kia của cùng một guard: đợi là để tránh seed nhầm, KHÔNG phải để chờ vô hạn. Doc đăng ký
    // trong metadata mà khối chưa từng ghi xong (tab đóng giữa hai lượt ghi) vẫn phải mở được.
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
    lanMot.workspace.forceStop()
    docSources.main.kho.delete('board')

    const lanHai = await taoHoacMoBang('board', {
      docSources,
      blobSources,
      // Hạn giờ ngắn để ca kiểm không phải đứng chờ 3 giây mặc định.
      hanGioNoiDungMs: 120,
    })
    expect(lanHai.store.root).not.toBeNull()
    expect(lanHai.store.getBlocksByFlavour('affine:surface')).toHaveLength(1)
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

    const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
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

    const lanHai = await taoHoacMoBang('board', { docSources, blobSources })
    const note = lanHai.store.root!.children.find((c) => c.flavour === 'affine:note')
    expect(note).toBeDefined()
    const doanVan = note!.children.find((c) => c.flavour === 'affine:paragraph')
    expect(doanVan).toBeDefined()
    const text = (doanVan as unknown as { props: { text: { toString(): string } } }).props.text
    expect(text.toString()).toBe(noiDungMau)

    lanHai.workspace.forceStop()
  })

  it('workspace.forceStop() gọi được ngay sau taoHoacMoBang() mà không ném lỗi', async () => {
    const { workspace } = await taoHoacMoBang('board', {
      docSources: { main: dungDocSourceGia() },
      blobSources: { main: dungBlobSourceGia() },
    })
    expect(() => workspace.forceStop()).not.toThrow()
  })

  it('mở lại bảng đã có nội dung (remount) rồi thêm note → note thật sự có trong store (không bị Yjs từ chối âm thầm)', async () => {
    // Ca này ghim đúng lỗi đã điều tra ở .superpowers/sdd/2026-08-21-database-note-day-du/progress.md
    // (mục "Điều tra thêm"): mỗi lần taoHoacMoBang() chạy, nó dựng một TestWorkspace MỚI với
    // createAutoIncrementIdGenerator() MỚI — bộ đếm luôn bắt đầu lại từ 0, không biết gì về các id
    // đã dùng trong nội dung ĐÃ LƯU. Lần mở đầu tiên seed root="0", surface="1" bằng generator của
    // chính lượt đó nên không va chạm. Nhưng lần MỞ LẠI (remount — người dùng rời rồi quay lại bảng,
    // hoặc tải lại trang) không seed lại (đúng, vì store.root đã có), NHƯNG generator mới của lượt
    // này cũng bắt đầu lại từ 0 — nên block TIẾP THEO người dùng thêm (ví dụ một note) bị cấp lại id
    // "0", trùng với root đã tồn tại. Giao dịch Yjs bị từ chối, addBlock() vẫn trả về một id (như
    // thể thành công), nhưng khối chưa từng vào store thật — khớp đúng triệu chứng "thêm Note không
    // hiện ra" mà chủ dự án báo.
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
    await lanMot.workspace.waitForSynced()
    lanMot.workspace.forceStop()

    const lanHai = await taoHoacMoBang('board', { docSources, blobSources })
    const noteId = lanHai.store.addBlock('affine:note', {}, lanHai.store.root!.id)
    const note = lanHai.store.root!.children.find((c) => c.id === noteId)
    expect(note).toBeDefined()
    expect(note?.flavour).toBe('affine:note')
    lanHai.workspace.forceStop()
  })

  it('hai boardId khác nhau trên CÙNG cặp source → hai doc độc lập, không đụng nhau', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const bangA = await taoHoacMoBang('bang-a', { docSources, blobSources })
    const noteId = bangA.store.addBlock('affine:note', {}, bangA.store.root!.id)
    bangA.store.addBlock('affine:paragraph', { text: new Text('nội dung riêng của bảng A') }, noteId)
    await bangA.workspace.waitForSynced()
    bangA.workspace.forceStop()

    const bangB = await taoHoacMoBang('bang-b', { docSources, blobSources })
    // Bảng B không có note nào — nếu taoHoacMoBang bỏ sót boardId và luôn đọc/ghi docId 'board' cố
    // định, ca này sẽ thấy note của bảng A lọt sang bảng B, đỏ ngay ở expect dưới.
    const noteBangB = bangB.store.root!.children.find((c) => c.flavour === 'affine:note')
    expect(noteBangB).toBeUndefined()
    bangB.workspace.forceStop()
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

    const { store, workspace } = await taoHoacMoBang('board', {
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
