// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { SPECIALTIES } from '../data/specialties'
import { SearchScreen } from '../App'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Chờ qua NHIỀU lượt act() rời nhau thay vì một act() bọc ngoài vi.waitFor — cùng lý do đã ghi kỹ
// trong src/board/__tests__/DanhSachBang.spec.ts: act() chỉ flush hàng đợi cập nhật SAU KHI callback
// của chính nó resolve, nên poll BÊN TRONG một act() duy nhất sẽ treo vô hạn khi điều kiện chờ phụ
// thuộc chính cú flush đó (ở đây là `loading`/`items` của useIdbCollection sau khi idbGetAll xong).
async function choDenKhi(dieuKien: () => void, timeoutMs = 3000, buocMs = 50) {
  const hetHan = Date.now() + timeoutMs
  for (;;) {
    try {
      dieuKien()
      return
    } catch (loi) {
      if (Date.now() >= hetHan) throw loi
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, buocMs))
    })
  }
}

// happy-dom: gán thẳng `.value` KHÔNG đi qua setter React đã vá (_valueTracker) nên onChange im
// lặng không bắn, ô tìm kiếm đứng yên ở trạng thái rỗng. Phải gọi setter GỐC của
// HTMLInputElement.prototype rồi mới bắn 'input' — cùng mẫu đã dùng ở
// src/board/__tests__/DanhSachBang.spec.ts (goVaoOTim).
async function goVaoOTim(o: HTMLInputElement, chu: string) {
  const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    if (datGiaTriGoc) datGiaTriGoc.call(o, chu)
    else o.value = chu
    o.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('SearchScreen — kết quả loại "board"', () => {
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
    // fake-indexeddb giữ state giữa các ca trong cùng file — dọn sạch để ca sau không thấy bảng cũ.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('gõ tên một bảng đã lưu → xuất hiện trong kết quả, bấm vào gọi onNavigate("mindmap", id)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-1',
      ten: 'Suy tim EF giảm',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: ['nội trú'],
      noiDungTimKiem: '',
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
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

    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-1')
  })

  it('bảng đã xoá mềm (daXoaLuc) KHÔNG lọt vào kết quả tìm kiếm', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-da-xoa',
      // Tên cố ý KHÔNG trùng bất kỳ bài viết dựng sẵn nào trong ARTICLES — nếu đặt trùng (vd "Viêm
      // phổi cộng đồng", vốn đã là một bài có sẵn) thì kết quả tìm được là BÀI VIẾT đó chứ không
      // phải bảng, và ca kiểm sẽ đỏ vì lý do chẳng liên quan gì tới xoá mềm.
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
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'bảng nháp vứt đi')

    // Đợi hook nạp xong danh sách bảng rồi mới khẳng định "không có" — nếu khẳng định ngay lập tức
    // thì ca kiểm này xanh giả (lúc đó `boards` còn rỗng vì IndexedDB đọc bất đồng bộ).
    await choDenKhi(() => {
      expect(container.textContent).toContain('Không có kết quả')
    })
    expect(container.textContent).not.toContain('Bảng nháp vứt đi')
  })

  // Mệnh đề `r.noiDung?.toLowerCase().includes(q)` của `filtered` là ĐƯỜNG DUY NHẤT để một bảng khớp
  // theo CHỮ BÊN TRONG nó (Task 9) — xoá hẳn dòng đó đi thì mọi ca kiểm cũ của file này vẫn xanh, vì
  // chúng đều tìm theo tên/tag. Canh riêng ở đây (review cuối nhánh, mục 5).
  it('gõ một từ CHỈ có trong nội dung bảng (noiDungTimKiem) → bảng vẫn hiện trong kết quả', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-noi-dung',
      // Tên/tag/tên khoa CỐ Ý không chứa chữ nào của truy vấn bên dưới — nếu chứa thì ca kiểm này
      // vẫn xanh qua mệnh đề `r.title`, không chứng minh được gì về mệnh đề nội dung.
      ten: 'Ghi chú buồng bệnh',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: [],
      noiDungTimKiem: 'kháng sinh phổ rộng liều cao',
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
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
    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-noi-dung')
  })

  // RESULT_LABEL.board đã in sẵn huy hiệu "Mindmap" phía trên tiêu đề, nên đặt thêm subtitle:
  // "Mindmap" khiến đúng một chữ đó xuất hiện HAI LẦN trên cùng một thẻ — nhiễu, và chiếm mất dòng
  // phụ đề vốn có thể trống (review cuối nhánh, mục 8).
  it('thẻ kết quả của bảng chỉ hiện chữ "Mindmap" MỘT lần (huy hiệu), không lặp ở dòng phụ đề', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-nhan',
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
    expect(ketQua.textContent?.match(/Mindmap/g)?.length ?? 0).toBe(1)
  })

  it('bảng cũ THIẾU chuyenKhoa/tags (bản ghi trước lượt di trú) không làm sập ô tìm kiếm', async () => {
    const bayGio = Date.now()
    // Cố ý ghi bản ghi KHÔNG có chuyenKhoa/tags/noiDungTimKiem — đúng hình dạng bảng tạo trước
    // Task 1 ở runtime (kiểu BangMeta khai bắt buộc, nhưng dữ liệu cũ trong IndexedDB thì không có).
    await idbPut(IDB_STORES.boards, {
      id: 'bang-cu',
      ten: 'Sốc nhiễm khuẩn',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
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

    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-cu')
  })
})

// ─── Nợ vặt HANDOFF mục 6: hai ô tìm kiếm xử lý dấu tiếng Việt khác nhau ──────
//
// Ô tìm của lưới Sơ đồ tư duy (`bangKhopTimKiem`, boardMeta.ts) bỏ dấu từ trước; ô tìm chính này
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
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  async function dungMan() {
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })
    return container.querySelector('input[type="search"]') as HTMLInputElement
  }

  // Bài viết DỰNG SẴN, không phải bảng: đường bài viết là đường mà `toLowerCase()` cũ phục vụ, nên
  // nếu chỉ canh bằng bảng thì một lượt sửa hồi quy chỉ nửa vời vẫn xanh.
  it('bài viết dựng sẵn: gõ "nhiem khuan huyet" (không dấu) → ra "Nhiễm khuẩn huyết"', async () => {
    const oTim = await dungMan()
    await goVaoOTim(oTim, 'nhiem khuan huyet')
    await choDenKhi(() => {
      expect(container.textContent).toContain('Nhiễm khuẩn huyết')
    })
  })

  it('bảng đã lưu: gõ "dot cap copd" (không dấu) → ra bảng "Đợt cấp COPD nặng"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khong-dau',
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

  // Nội dung bên trong bảng (`noiDungTimKiem`) đi qua một mệnh đề RIÊNG trong `filtered` — vá ba
  // mệnh đề kia mà quên mệnh đề này thì hai ca trên vẫn xanh.
  it('nội dung bên trong bảng cũng khớp không dấu', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-noi-dung-khong-dau',
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
// Dải chip cũ suy từ `ARTICLES` tĩnh, mà ARTICLES chỉ dùng 6 tên khoa. Bảng Mindmap gắn được cả
// 11 khoa của SPECIALTIES — 5 khoa còn lại (Tiêu hoá, Huyết học, Nhiễm, Sinh lý (bệnh), Dược lâm
// sàng) không có chip nào, tức người dùng gắn khoa cho bảng rồi lại không lọc được theo nó.
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
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  async function dungMan() {
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
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

  it('bảng gắn khoa mà không bài viết nào dùng (Tiêu hoá) vẫn có chip riêng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-tieu-hoa',
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

  it('bảng đã xoá mềm KHÔNG sinh ra chip — chip phải theo đúng tập kết quả thật', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-huyet-hoc-da-xoa',
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
    // Thêm một bảng thuộc khoa nằm GIỮA dãy SPECIALTIES: nếu dải chip xếp theo thứ tự gặp được
    // (bảng nạp sau bài viết) thì "Tiêu hoá" rơi xuống cuối và ca này đỏ.
    await idbPut(IDB_STORES.boards, {
      id: 'bang-tieu-hoa-2',
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
