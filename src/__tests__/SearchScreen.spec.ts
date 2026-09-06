// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { SPECIALTIES } from '../data/specialties'
import { SearchScreen } from '../App'
import { choDenKhi } from './helpers/cho-den-khi'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// happy-dom: gán thẳng `.value` KHÔNG đi qua setter React đã vá (_valueTracker) nên onChange im
// lặng không bắn, ô tìm kiếm đứng yên ở trạng thái rỗng. Phải gọi setter GỐC của
// HTMLInputElement.prototype rồi mới bắn 'input' — cùng mẫu đã dùng ở
// src/board/__tests__/LuoiMuc.spec.ts (goVaoOTim).
async function goVaoOTim(o: HTMLInputElement, chu: string) {
  const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    if (datGiaTriGoc) datGiaTriGoc.call(o, chu)
    else o.value = chu
    o.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('SearchScreen — kết quả loại "muc" (sơ đồ)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    // fake-indexeddb giữ state giữa các ca trong cùng file — dọn sạch để ca sau không thấy mục cũ.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  })

  it('gõ tên một sơ đồ đã lưu → xuất hiện trong kết quả, bấm vào gọi onMoMuc(id, "so-do", danhMuc)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-1',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Suy tim EF giảm',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: ['nội trú'],
      noiDungTimKiem: '',
    })

    const onNavigate = vi.fn()
    const onMoMuc = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
          onMoMuc,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'suy tim')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Suy tim EF giảm')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Suy tim EF giảm'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    // Kết quả "muc" đi qua onMoMuc (App() tự quyết định mở instance Mindmap hay danhMuc), KHÔNG
    // còn đi qua onNavigate("mindmap", id) như thời kind "board" cũ.
    expect(onMoMuc).toHaveBeenCalledWith('bang-1', 'so-do', 'tiep-can')
    expect(onNavigate).not.toHaveBeenCalledWith('mindmap', expect.anything())
  })

  it('mục đã xoá mềm (daXoaLuc) KHÔNG lọt vào kết quả tìm kiếm', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-da-xoa',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      // Tên cố ý KHÔNG trùng bất kỳ bài viết dựng sẵn nào trong ARTICLES — nếu đặt trùng (vd "Viêm
      // phổi cộng đồng", vốn đã là một bài có sẵn) thì kết quả tìm được là BÀI VIẾT đó chứ không
      // phải mục vừa tạo, và ca kiểm sẽ đỏ vì lý do chẳng liên quan gì tới xoá mềm.
      ten: 'Bảng nháp vứt đi',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      daXoaLuc: bayGio,
      chuyenKhoa: 'pulmonology',
      tags: [],
      noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'bảng nháp vứt đi')

    // Đợi hook nạp xong danh sách mục rồi mới khẳng định "không có" — nếu khẳng định ngay lập tức
    // thì ca kiểm này xanh giả (lúc đó `mucs` còn rỗng vì IndexedDB đọc bất đồng bộ).
    await choDenKhi(() => {
      expect(container.textContent).toContain('Không có kết quả')
    })
    expect(container.textContent).not.toContain('Bảng nháp vứt đi')
  })

  // Mệnh đề `r.noiDung?.toLowerCase().includes(q)` của `filtered` là ĐƯỜNG DUY NHẤT để một mục khớp
  // theo CHỮ BÊN TRONG nó (Task 9) — xoá hẳn dòng đó đi thì mọi ca kiểm cũ của file này vẫn xanh, vì
  // chúng đều tìm theo tên/tag. Canh riêng ở đây (review cuối nhánh, mục 5).
  it('gõ một từ CHỈ có trong nội dung sơ đồ (noiDungTimKiem) → mục vẫn hiện trong kết quả', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-noi-dung',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      // Tên/tag/tên khoa CỐ Ý không chứa chữ nào của truy vấn bên dưới — nếu chứa thì ca kiểm này
      // vẫn xanh qua mệnh đề `r.title`, không chứng minh được gì về mệnh đề nội dung.
      ten: 'Ghi chú buồng bệnh',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: [],
      noiDungTimKiem: 'kháng sinh phổ rộng liều cao',
    })

    const onMoMuc = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'phổ rộng')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Ghi chú buồng bệnh')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ghi chú buồng bệnh'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })
    expect(onMoMuc).toHaveBeenCalledWith('bang-noi-dung', 'so-do', 'tiep-can')
  })

  // nhanKetQua() (App.tsx) đã in sẵn huy hiệu "Sơ đồ" phía trên tiêu đề, nên đặt thêm subtitle:
  // "Sơ đồ" khiến đúng một chữ đó xuất hiện HAI LẦN trên cùng một thẻ — nhiễu, và chiếm mất dòng
  // phụ đề vốn có thể trống (review cuối nhánh, mục 8, ban đầu ghi cho huy hiệu "Mindmap").
  it('thẻ kết quả của sơ đồ chỉ hiện chữ "Sơ đồ" MỘT lần (huy hiệu), không lặp ở dòng phụ đề', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-nhan',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Suy tim EF giảm',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: [],
      noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'suy tim ef')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Suy tim EF giảm')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Suy tim EF giảm'),
    ) as HTMLButtonElement
    expect(ketQua.textContent?.match(/Sơ đồ/g)?.length ?? 0).toBe(1)
  })

  it('sơ đồ cũ THIẾU chuyenKhoa/tags (bản ghi trước lượt di trú) không làm sập ô tìm kiếm', async () => {
    const bayGio = Date.now()
    // Cố ý ghi bản ghi KHÔNG có chuyenKhoa/tags/noiDungTimKiem — đúng hình dạng bản ghi mucs cũ ở
    // runtime (kiểu MucMeta khai bắt buộc, nhưng dữ liệu chưa từng mở lại qua đường mới thì không
    // có). `loai`/`danhMuc` VẪN phải có đủ — MucMeta không còn nhánh `??` phòng vệ cho hai trường
    // này (Task 1 Plan 2); thiếu chúng thì openResult() rơi vào nhánh "specialty" một cách ÂM THẦM
    // (r.loai/r.danhMuc falsy), làm ca kiểm xanh giả không canh được onMoMuc.
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-cu',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Sốc nhiễm khuẩn',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    })

    const onMoMuc = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'sốc nhiễm')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Sốc nhiễm khuẩn')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sốc nhiễm khuẩn'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    expect(onMoMuc).toHaveBeenCalledWith('bang-cu', 'so-do', 'tiep-can')
  })
})

// ─── Kho bài viết (giai đoạn 5-6) hợp nhất vào ô tìm kiếm chính (Plan 3 Task 1) ──────
//
// Trước lượt này, SearchScreen đọc thẳng IDB_STORES.boards — mọi mục tạo từ giai đoạn 5 (kho bài
// viết mới, store `mucs`) trở đi hoàn toàn vô hình với ô tìm kiếm chính dù đã hiện đúng ở LuoiMuc.
describe('SearchScreen — kết quả loại "muc" (bài viết)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  })

  it('tìm kiếm thấy một bài viết mucs vừa tạo (không chỉ sơ đồ)', async () => {
    await idbPut(IDB_STORES.mucs, {
      id: 'muc-bv-1',
      loai: 'bai-viet',
      danhMuc: 'ecg',
      ten: 'Đọc ECG rung nhĩ',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: 'tim-mach',
      tags: [],
      noiDungTimKiem: 'rung nhĩ QRS không đều',
    })

    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'rung nhĩ')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Đọc ECG rung nhĩ')
    })
  })

  it('bấm kết quả loại bài viết gọi onMoMuc("bai-viet", …) — KHÔNG mở tab Mindmap', async () => {
    const onNavigate = vi.fn()
    const onMoMuc = vi.fn()
    await idbPut(IDB_STORES.mucs, {
      id: 'muc-bv-2',
      loai: 'bai-viet',
      danhMuc: 'phac-do',
      ten: 'Sốc nhiễm khuẩn',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
          onMoMuc,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'sốc')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Sốc nhiễm khuẩn')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sốc nhiễm khuẩn'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    expect(onMoMuc).toHaveBeenCalledWith('muc-bv-2', 'bai-viet', 'phac-do')
    expect(onNavigate).not.toHaveBeenCalledWith('mindmap', expect.anything())
  })
})

// ─── Nợ vặt HANDOFF mục 6: hai ô tìm kiếm xử lý dấu tiếng Việt khác nhau ──────
//
// Ô tìm của lưới Sơ đồ tư duy (`mucKhopTimKiem`, mucMeta.ts) bỏ dấu từ trước; ô tìm chính này
// thì `toLowerCase()`. Cùng một truy vấn không dấu ra kết quả ở màn kia mà không ra ở màn này —
// người trực gõ nhanh không dấu sẽ kết luận "app không có bài đó". Chuẩn chung là bỏ dấu.
describe('SearchScreen — gõ không dấu vẫn ra kết quả', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  })

  async function dungMan() {
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })
    return container.querySelector('input[type="search"]') as HTMLInputElement
  }

  // Bài viết DỰNG SẴN, không phải mục lưu trong IndexedDB: đường bài viết là đường mà `toLowerCase()`
  // cũ phục vụ, nên nếu chỉ canh bằng mục thì một lượt sửa hồi quy chỉ nửa vời vẫn xanh.
  it('bài viết dựng sẵn: gõ "nhiem khuan huyet" (không dấu) → ra "Nhiễm khuẩn huyết"', async () => {
    const oTim = await dungMan()
    await goVaoOTim(oTim, 'nhiem khuan huyet')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Nhiễm khuẩn huyết')
    })
  })

  it('sơ đồ đã lưu: gõ "dot cap copd" (không dấu) → ra sơ đồ "Đợt cấp COPD nặng"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-khong-dau',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Đợt cấp COPD nặng',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology',
      tags: [],
      noiDungTimKiem: '',
    })
    const oTim = await dungMan()
    await goVaoOTim(oTim, 'dot cap copd')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Đợt cấp COPD nặng')
    })
  })

  // Chiều ngược lại: bỏ dấu KHÔNG được làm hỏng lượt gõ có dấu đầy đủ (cách gõ của máy tính bàn).
  it('gõ đủ dấu vẫn ra đúng bài đó', async () => {
    const oTim = await dungMan()
    await goVaoOTim(oTim, 'nhiễm khuẩn huyết')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Nhiễm khuẩn huyết')
    })
  })

  // Nội dung bên trong sơ đồ (`noiDungTimKiem`) đi qua một mệnh đề RIÊNG trong `filtered` — vá ba
  // mệnh đề kia mà quên mệnh đề này thì hai ca trên vẫn xanh.
  it('nội dung bên trong sơ đồ cũng khớp không dấu', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-noi-dung-khong-dau',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Bảng nháp X',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: [],
      noiDungTimKiem: 'kháng đông đường uống thế hệ mới',
    })
    const oTim = await dungMan()
    await goVaoOTim(oTim, 'khang dong duong uong')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Bảng nháp X')
    })
  })
})

// ─── Nợ vặt HANDOFF mục 6: dải chip chuyên khoa không khớp giữa hai màn ──────────
//
// Dải chip cũ suy từ `ARTICLES` tĩnh, mà ARTICLES chỉ dùng 6 tên khoa. Sơ đồ Mindmap gắn được cả
// 11 khoa của SPECIALTIES — 5 khoa còn lại (Tiêu hoá, Huyết học, Nhiễm, Sinh lý (bệnh), Dược lâm
// sàng) không có chip nào, tức người dùng gắn khoa cho sơ đồ rồi lại không lọc được theo nó.
describe('SearchScreen — dải chip chuyên khoa', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  })

  async function dungMan() {
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onMoMuc: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })
  }

  const tenChip = () =>
    Array.from(container.querySelectorAll('[data-testid^="chip-khoa-"]')).map((b) =>
      (b.textContent ?? '').trim(),
    )

  it('mục gắn khoa mà không bài viết nào dùng (Tiêu hoá) vẫn có chip riêng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-tieu-hoa',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Xuất huyết tiêu hoá trên',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'gastrointestinal',
      tags: [],
      noiDungTimKiem: '',
    })
    await dungMan()
    await choDenKhi(() => {
      expect(tenChip()).toContain('Tiêu hoá')
    })
  })

  it('mục đã xoá mềm KHÔNG sinh ra chip — chip phải theo đúng tập kết quả thật', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-huyet-hoc-da-xoa',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Bảng huyết học nháp',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      daXoaLuc: bayGio,
      chuyenKhoa: 'hematology',
      tags: [],
      noiDungTimKiem: '',
    })
    await dungMan()
    // Đợi hook nạp xong rồi mới khẳng định "không có", nếu không ca này xanh giả.
    await choDenKhi(() => {
      expect(tenChip().length).toBeGreaterThan(1)
    })
    expect(tenChip()).not.toContain('Huyết học')
  })

  // Hai tên chỉ CÙNG một khoa: ARTICLES viết "Hồi sức - Cấp cứu", SPECIALTIES (nguồn của lưới
  // Mindmap và của huy hiệu khoa) gọi là "Cấp cứu". Hai chip cho một khoa là dải chip nói dối.
  it('gộp bí danh: có chip "Cấp cứu", KHÔNG có chip "Hồi sức - Cấp cứu"', async () => {
    await dungMan()
    await choDenKhi(() => {
      expect(tenChip()).toContain('Cấp cứu')
    })
    expect(tenChip()).not.toContain('Hồi sức - Cấp cứu')
  })

  it('chọn chip "Cấp cứu" vẫn lọc ra bài viết mang tên khoa cũ', async () => {
    await dungMan()
    await choDenKhi(() => {
      expect(tenChip()).toContain('Cấp cứu')
    })
    const chip = container.querySelector('[data-testid="chip-khoa-Cấp cứu"]') as HTMLButtonElement
    await act(async () => {
      chip.click()
    })
    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'nhiem khuan huyet')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Nhiễm khuẩn huyết')
    })
  })

  it('thứ tự chip khớp thứ tự SPECIALTIES của màn Sơ đồ tư duy, "Tất cả" đứng đầu', async () => {
    const bayGio = Date.now()
    // Thêm một mục thuộc khoa nằm GIỮA dãy SPECIALTIES: nếu dải chip xếp theo thứ tự gặp được
    // (mục nạp sau bài viết) thì "Tiêu hoá" rơi xuống cuối và ca này đỏ.
    await idbPut(IDB_STORES.mucs, {
      id: 'bang-tieu-hoa-2',
      loai: 'so-do',
      danhMuc: 'tiep-can',
      ten: 'Bảng tiêu hoá',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'gastrointestinal',
      tags: [],
      noiDungTimKiem: '',
    })
    await dungMan()
    await choDenKhi(() => {
      expect(tenChip()).toContain('Tiêu hoá')
    })
    const chip = tenChip()
    expect(chip[0]).toBe('Tất cả')
    const thuTu = SPECIALTIES.map((s) => s.name)
    const chiSo = chip.slice(1).map((t) => thuTu.indexOf(t))
    expect(chiSo, `chip lạ ngoài SPECIALTIES: ${chip.slice(1)}`).not.toContain(-1)
    expect(chiSo).toEqual([...chiSo].sort((a, b) => a - b))
  })
})
