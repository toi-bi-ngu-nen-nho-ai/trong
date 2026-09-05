// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { capNhatSauKhiRoiMuc, type MucMeta } from '../mucMeta'
import { BoardGallery } from '../BoardGallery'
import { choDenKhi } from '../../__tests__/helpers/cho-den-khi'

// Ghi thẳng qua idb.ts thay vì đi qua UI/hook — file này canh hành vi ĐIỀU HƯỚNG của BoardGallery
// (mount/unmount/ẩn), không phải hành vi tạo bảng (đã canh riêng ở LuoiMuc.spec.ts).
function taoBangGia(ten: string): MucMeta {
  const bayGio = Date.now()
  const meta: MucMeta = {
    id: `bang-gia-${bayGio}-${Math.random().toString(36).slice(2, 6)}`,
    // File này canh hành vi điều hướng của BoardGallery, không canh phân loại — giá trị của bảng
    // sơ đồ đời cũ (xem task-1-brief.md) là đủ, không cần đa dạng hoá.
    loai: 'so-do',
    danhMuc: 'tiep-can',
    ten,
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: SPECIALTIES[0].id,
    tags: [],
    noiDungTimKiem: '',
  }
  return meta
}

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Giả EdgelessBoard thật (chunk nặng, cần DOM canvas) bằng một component tối giản có thể quan sát
// được prop boardId — đủ để canh ĐÚNG hành vi điều hướng/ẩn-hiện mà file này chịu trách nhiệm,
// không lặp lại phạm vi của edgeless-board-mount.spec.ts. Cleanup effect gọi thẳng
// capNhatSauKhiRoiMuc() thật (cùng module mucMeta.ts mà BoardGallery.tsx dùng, không mock riêng) —
// mô phỏng ĐÚNG thời điểm lượt ghi metadata bắt đầu (lúc unmount, xem EdgelessBoard.tsx thật),
// để các ca kiểm dưới đây canh được đúng cuộc đua giữa lượt ghi đó và lượt đọc-lúc-mount của
// LuoiMuc — không cần dựng canvas/BlockSuite thật.
// `../diTruBangCu` KHÔNG mock ở đây (vẫn đúng như trước) — giờ nó chỉ tự `import()` khi
// `dangHienTab` true VÀ cờ localStorage "đã chạy" chưa được đặt (xem BoardGallery.tsx), nên chunk
// nặng đó chỉ thật sự tải NHIỀU NHẤT một lần cho cả file này, không phải mỗi lượt mount như trước
// lượt sửa D13. Không thêm mock riêng vì các ca kiểm dưới đây vẫn xanh và đủ nhanh mà không cần.
// Chuỗi mà "bảng giả" ghi vào noiDungTimKiem lúc unmount — cố ý KHÔNG xuất hiện trong tên bảng,
// nên tìm thấy nó nghĩa là lượt mount lại của LuoiMuc đã đọc được bản ghi MỚI.
const NOI_DUNG_SAU_KHI_ROI = 'suy tim ef giam'

// Hàm xuất giả mà "EdgelessBoard giả" đẩy lên BoardGallery qua onXuatSanSang — module-scope để ca
// kiểm quan sát lời gọi và điều khiển giá trị trả về.
const xuatGia = vi.fn<(tenBang: string) => Promise<'xong' | 'xong-thieu-the-ghi-chu' | 'trong' | 'dang-ban'>>(
  async () => 'xong',
)

vi.mock('../index', () => ({
  VoMuc: ({
    boardId,
    onXuatSanSang,
  }: {
    boardId: string
    onXuatSanSang?: (xuat: ((tenBang: string) => Promise<string>) | null) => void
  }) => {
    useEffect(() => {
      onXuatSanSang?.(xuatGia)
      return () => {
        onXuatSanSang?.(null)
        void capNhatSauKhiRoiMuc(boardId, true, NOI_DUNG_SAU_KHI_ROI)
      }
    }, [boardId, onXuatSanSang])
    return createElement('div', { 'data-testid': 'bang-gia', 'data-board-id': boardId }, 'BẢNG GIẢ')
  },
}))

describe('BoardGallery', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    xuatGia.mockReset()
    xuatGia.mockResolvedValue('xong')
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('mặc định hiện lưới danh sách, chưa có bảng nào mount', async () => {
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })

  it('bấm một thẻ bảng → mount EdgelessBoard với đúng boardId, lưới ẩn đi', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(meta.id)
    expect(container.querySelector('[data-testid="tao-bang"]')).toBeNull()
  })

  it('bấm một thẻ bảng → boc-bang có class "board-in"', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    const boc = container.querySelector('[data-testid="boc-bang"]')
    expect(boc?.className).toContain('board-in')
  })

  // Ca kiểm ghim ĐÚNG con bug đo được 2026-08-30 (phản hồi thật: "tôi ấn mở thì bị che bởi một
  // màn hình"). Máy ghi DOM trên trình duyệt thật cho thấy .board-flip-cover đứng ở opacity 1 suốt
  // 2,5s — trọn khoảng màn chờ tồn tại — rồi mới mở ra ĐÚNG LÚC màn chờ bị gỡ khỏi DOM. Nghĩa là
  // hoạt ảnh line-drawing nằm DƯỚI lớp phủ nên không bao giờ thấy được ở đường mở-qua-thẻ (đường
  // thường dùng nhất). Lớp phủ CHÍNH LÀ màn chờ ở đường này, nên nó phải là thứ đang vẽ.
  it('bấm một thẻ bảng → lớp phủ FLIP tự vẽ icon khoa (màn chờ), không phải huy hiệu tĩnh', async () => {
    // happy-dom không có engine layout nên getBoundingClientRect() trả 0×0, mà LuoiMuc CHỈ
    // dựng origin khi rect có kích thước thật (>0) — không giả rect thì openOrigin là undefined và
    // lớp phủ FLIP không bao giờ render, ca kiểm sẽ đỏ vì lý do sai. Giả đúng một rect có thật.
    const rectThat = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10, left: 20, width: 260, height: 195, right: 280, bottom: 205, x: 20, y: 10,
      toJSON: () => ({}),
    } as DOMRect)
    try {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    const phu = container.querySelector('.board-flip-cover')
    expect(phu).not.toBeNull()
    // Lớp phủ đang HIỆN (chưa gắn class ẩn) — tức người dùng đang nhìn đúng nó lúc chờ.
    expect(phu!.className).not.toContain('board-flip-cover-hide')
    // Và thứ nó vẽ là màn chờ đang-vẽ, mang đúng chuyên khoa của bảng vừa bấm.
    const dangVe = phu!.querySelector('.mind-loading-ve')
    expect(dangVe).not.toBeNull()
    expect(dangVe!.getAttribute('data-khoa')).toBe(meta.chuyenKhoa)
    } finally {
      rectThat.mockRestore()
    }
  })

  it('dangHienTab=false trong khi có bảng mở → EdgelessBoard VẪN mount (không unmount), chỉ ẩn', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    const noiBangThat = container.querySelector('[data-testid="bang-gia"]')

    // Mô phỏng người dùng chuyển sang tab khác (Home) — App.tsx sẽ đổi prop này, KHÔNG unmount.
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: false }))
    })

    // Vẫn còn trong DOM (đúng kỹ thuật ẩn-không-tháo đã đo cho ResizeObserver) — VÀ vẫn ĐÚNG node
    // DOM cũ (không phải một node mới do unmount+remount tình cờ trùng testid), để loại trừ khả
    // năng cài đặt sai kiểu "render null rồi render lại" mà vẫn qua được ca kiểm này.
    const noiBangSauKhiAn = container.querySelector('[data-testid="bang-gia"]')
    expect(noiBangSauKhiAn).toBe(noiBangThat)
    expect(noiBangSauKhiAn?.getAttribute('data-board-id')).toBe(meta.id)
    const boc = container.querySelector('[data-testid="boc-bang"]')
    expect(boc?.className).toContain('invisible')
  })

  it('bấm nút quay lại → EdgelessBoard unmount thật, lưới hiện lại', async () => {
    await idbPut(IDB_STORES.boards, taoBangGia('Bảng test'))
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })

  it('bấm quay lại → metadata vừa ghi đã thấy NGAY trên lưới (không phải chờ lượt mount sau)', async () => {
    // Ca kiểm này canh CUỘC ĐUA giữa lượt ghi fire-and-forget lúc rời bảng và lượt đọc-lúc-mount
    // của LuoiMuc — `doiGhiAnhXongNeuCo()` trong BoardGallery.tsx tồn tại vì nó.
    // Trước 2026-08-30 nó quan sát cuộc đua qua ảnh xem trước trên thẻ; ảnh đó đã bị gỡ, nên giờ
    // quan sát qua `noiDungTimKiem` — cũng do đúng lượt ghi đó sinh ra, và vẫn thấy được từ ngoài
    // (ô tìm kiếm). Bản chất cuộc đua không đổi, chỉ đổi cái kính soi.
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull())

    // Gõ một chuỗi CHỈ khớp được qua noiDungTimKiem vừa ghi (không nằm trong tên bảng). Nếu lượt
    // mount đọc phải bản ghi CŨ (noiDungTimKiem rỗng — đúng lỗi đua đã sửa), thẻ bị lọc mất.
    // useIdbCollection chỉ đọc MỘT LẦN lúc mount nên chờ lâu hơn KHÔNG cứu được: state cục bộ đã
    // đông cứng ở bản ghi cũ, ca kiểm FAIL đúng nghĩa thay vì tự chập chờn qua.
    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(oTim, NOI_DUNG_SAU_KHI_ROI)
      else oTim.value = NOI_DUNG_SAU_KHI_ROI
      oTim.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
  })

  it('bấm quay lại → LuoiMuc tái xuất hiện có class "board-out", rồi tự mất sau đó', async () => {
    await idbPut(IDB_STORES.boards, taoBangGia('Bảng test'))
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    const luoi = container.querySelector('.scroll-ios')
    expect(luoi?.className).toContain('board-out')

    // Sau ~220ms, cờ tự tắt — class board-out biến mất khỏi lượt render kế tiếp.
    await choDenKhi(() => {
      expect(container.querySelector('.scroll-ios')?.className).not.toContain('board-out')
    })
  })

  it('truyền moBangYeuCau khớp một bảng đã lưu → mở thẳng bảng đó, không cần bấm qua danh sách', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'muc-tieu', ten: 'Bảng mục tiêu', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true, moBangYeuCau: 'muc-tieu' }))
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="boc-bang"]')).not.toBeNull()
    })
    // "Có MỘT bảng nào đó mở ra" chưa đủ — phải đúng bảng được yêu cầu. Cùng cách khẳng định với ca
    // "bấm một thẻ bảng → mount EdgelessBoard với đúng boardId" phía trên (review cuối nhánh, mục 10).
    expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe('muc-tieu')
  })

  // App.tsx truyền một arrow function NỘI TUYẾN cho onMoBangYeuCauXong, nên danh tính callback đổi ở
  // MỌI lượt render của App — effect [moBangYeuCau, onMoBangYeuCauXong] chạy lại theo. Thứ duy nhất
  // chặn nó mở lại một bảng người dùng đã rời đi là cặp: guard `if (!moBangYeuCau) return` CỘNG việc
  // cha thật sự đưa moBangYeuCau về undefined qua callback này. Xoá lời gọi callback thì mọi ca kiểm
  // cũ vẫn xanh — nên phải canh riêng hợp đồng này (review cuối nhánh, mục 6).
  it('mở bảng theo yêu cầu xong → gọi onMoBangYeuCauXong để cha reset state', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'muc-tieu', ten: 'Bảng mục tiêu', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    const onMoBangYeuCauXong = vi.fn()
    await act(async () => {
      root.render(createElement(BoardGallery, {
        dangHienTab: true,
        moBangYeuCau: 'muc-tieu',
        onMoBangYeuCauXong,
      }))
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe('muc-tieu')
    })
    expect(onMoBangYeuCauXong).toHaveBeenCalledTimes(1)
  })

  // ─── Nút "Xuất PNG" ở màn vẽ ───────────────────────────────────────────────────────────────
  async function moBang(ten = 'Bảng xuất'): Promise<void> {
    await idbPut(IDB_STORES.boards, taoBangGia(ten))
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull()
    })
  }
  const nutXuat = () => container.querySelector('[data-testid="xuat-anh"]') as HTMLButtonElement | null
  const nutBack = () => container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement | null

  it('mở bảng → có nút "Xuất PNG", cùng hình chấm tròn với nút quay lại', async () => {
    await moBang()
    const xuat = nutXuat()
    const back = nutBack()
    expect(xuat, 'nút xuất phải có mặt ở màn vẽ').not.toBeNull()
    expect(back).not.toBeNull()
    expect(xuat).not.toBe(back)
    // Cùng hình chấm tròn: 44×44, bo tròn hoàn toàn, cùng lớp z. (Việc neo trái/phải đối xứng
    // dùng calc(var(--safe-*)) mà happy-dom lược bỏ — kiểm mắt trên trình duyệt thật.)
    for (const nut of [xuat!, back!]) {
      expect(nut.style.width).toBe('44px')
      expect(nut.style.height).toBe('44px')
      expect(nut.style.borderRadius).toBe('50%')
      expect(nut.style.zIndex).toBe('20')
      expect(nut.style.position).toBe('absolute')
    }
    // Icon là SVG (không phải chữ Unicode) — cùng ngôn ngữ với chevron của nút back.
    expect(xuat!.querySelector('svg')).not.toBeNull()
    expect(xuat!.getAttribute('aria-label')).toBe('Xuất PNG sơ đồ')
  })

  it('bấm nút xuất → gọi hàm xuất với TÊN BẢNG, hiện dòng "Đang dựng ảnh…"', async () => {
    let giaiXuat: ((kq: 'xong') => void) | undefined
    xuatGia.mockImplementation(() => new Promise((r) => { giaiXuat = r as (kq: 'xong') => void }))
    await moBang('Sốc nhiễm khuẩn')
    await act(async () => {
      nutXuat()!.click()
    })
    expect(xuatGia).toHaveBeenCalledTimes(1)
    expect(xuatGia.mock.calls[0][0]).toBe('Sốc nhiễm khuẩn')
    expect(container.textContent).toContain('Đang dựng ảnh…')
    expect(nutXuat()!.disabled).toBe(true)
    await act(async () => {
      giaiXuat?.('xong')
    })
    expect(nutXuat()!.disabled).toBe(false)
  })

  it('xuất trả "xong-thieu-the-ghi-chu" → hiện dòng cảnh báo thiếu thẻ', async () => {
    xuatGia.mockResolvedValue('xong-thieu-the-ghi-chu')
    await moBang()
    await act(async () => {
      nutXuat()!.click()
    })
    await choDenKhi(() => {
      expect(container.textContent).toContain('Thẻ ghi chú chưa vào được ảnh')
    })
  })

  it('xuất ném lỗi → nút bật lại, hiện dòng "Không xuất được ảnh"', async () => {
    xuatGia.mockRejectedValue(new Error('canvas hỏng'))
    await moBang()
    await act(async () => {
      nutXuat()!.click()
    })
    await choDenKhi(() => {
      expect(container.textContent).toContain('Không xuất được ảnh')
    })
    expect(nutXuat()!.disabled).toBe(false)
  })

  it('quay lại danh sách → nút xuất biến mất cùng màn vẽ', async () => {
    await moBang()
    expect(nutXuat()).not.toBeNull()
    await act(async () => {
      nutBack()!.click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(nutXuat()).toBeNull()
  })
})
