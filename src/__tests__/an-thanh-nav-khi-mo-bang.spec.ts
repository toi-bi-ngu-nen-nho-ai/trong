// @vitest-environment happy-dom
//
// Chủ dự án yêu cầu 2026-09-03: ĐANG DÙNG SƠ ĐỒ THÌ ẨN THANH ĐIỀU HƯỚNG DƯỚI — ở mọi khung màn,
// không riêng khung hẹp. Bảng vẽ chiếm trọn màn nên thanh nav chỉ còn là dải chiếm chỗ.
//
// VÌ SAO PHẢI CANH Ở TẦNG App: `App.tsx` đã có sẵn phép ẩn nav cho `isDetailScreen`
// (`NON_TAB_SCREENS`), nhưng bảng sơ đồ KHÔNG phải một "screen" — nó sống bên trong tab Mindmap,
// do `BoardGallery` tự quản. Nên App hoàn toàn không biết có bảng nào đang mở; tín hiệu phải được
// `BoardGallery` báo ngược lên. Ca kiểm chỉ ở tầng `BoardGallery` không bắt được lỗi "App quên
// dùng tín hiệu" — mà đó mới đúng là thứ người dùng nhìn thấy.
//
// GIEO SẴN BẢNG thay vì bấm "Tạo bảng mới": đường tạo bảng qua giao diện không chạy tới nơi trong
// happy-dom (bấm xong 8 giây vẫn không có thẻ nào — đã đo, danh sách nút chỉ còn "Tạo bảng mới" và
// 5 tab). Đó là hạn chế của môi trường kiểm, không phải thứ ca này muốn canh; gieo thẳng một
// `MucMeta` vào IndexedDB là đúng cùng mẫu hình `edgeless-board-mount.spec.ts` đã dùng.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { BoardGallery } from '../board/BoardGallery'
import { IDB_STORES, idbPut } from '../lib/idb'
import { choDom } from './helpers/cho-den-khi'
// Import vì tác dụng phụ: proxy ngữ cảnh canvas 2D + polyfill happy-dom mà cây Lit cần lúc mount.
import '../board/__tests__/helpers/note-interaction'

const thanhNav = () => document.querySelector('nav[aria-label="Điều hướng chính"]')

/** Nút theo aria-label (khớp đầu chuỗi) — nút "Mở bảng…" mang kèm tên và thời điểm. */
function nut(bd: string): HTMLElement | undefined {
  return [...document.querySelectorAll('button')].find((b) =>
    (b.getAttribute('aria-label') ?? '').startsWith(bd),
  ) as HTMLElement | undefined
}

async function gieoBang(id: string) {
  const bayGio = Date.now()
  await idbPut(IDB_STORES.boards, {
    id,
    ten: 'Bảng test nav',
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: 'cardiology',
    tags: [],
    noiDungTimKiem: '',
  })
}

describe('thanh điều hướng dưới — ẩn khi đang dùng sơ đồ', () => {
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
  })

  it('mở bảng → nav biến mất; quay lại danh sách → nav hiện lại', async () => {
    await gieoBang('bang-an-nav')

    await act(async () => {
      root.render(createElement(App))
    })
    await act(async () => {
      await choDom(() => {
        expect(thanhNav(), 'thanh nav phải có ở màn đầu').not.toBeNull()
      })
    })

    await act(async () => {
      ;[...document.querySelectorAll('button')]
        .find((b) => /Mindmap/.test(b.textContent ?? ''))
        ?.click()
    })
    await act(async () => {
      await choDom(() => {
        expect(nut('Mở bảng'), 'lưới Mindmap phải liệt kê bảng đã gieo').toBeDefined()
      })
    })

    await act(async () => {
      nut('Mở bảng')?.click()
    })
    await act(async () => {
      await choDom(() => {
        expect(thanhNav(), 'đang mở bảng thì KHÔNG được còn thanh nav').toBeNull()
      })
    })

    await act(async () => {
      nut('Quay lại danh sách bảng')?.click()
    })
    await act(async () => {
      await choDom(() => {
        expect(thanhNav(), 'quay lại danh sách thì thanh nav phải hiện lại').not.toBeNull()
      })
    })
  })

  // Cạm bẫy riêng, KHÔNG với tới được qua giao diện App (mở bảng xong thì chính thanh nav đã biến
  // mất, không còn tab nào để bấm): `BoardGallery` không tháo bảng khi rời tab Mindmap — nó chỉ
  // `invisible pointer-events-none` (xem chỗ render `boc-bang`), nên `openBoardId` vẫn còn nguyên.
  // Tín hiệu báo lên App mà quên nhân với `dangHienTab` thì thanh nav biến mất ở MỌI tab, kể cả khi
  // App chuyển tab bằng đường khác (mở một kết quả tìm kiếm chẳng hạn) — người dùng kẹt.
  it('rời tab Mindmap khi bảng còn mở → báo ngay là KHÔNG còn xem bảng', async () => {
    await gieoBang('bang-roi-tab')
    const bao = vi.fn()

    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true, onDangMoBang: bao }))
    })
    await act(async () => {
      await choDom(() => {
        expect(nut('Mở bảng'), 'lưới phải liệt kê bảng đã gieo').toBeDefined()
      })
    })
    await act(async () => {
      nut('Mở bảng')?.click()
    })
    await choDom(() => {
      expect(bao, 'mở bảng phải báo true').toHaveBeenLastCalledWith(true)
    })

    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: false, onDangMoBang: bao }))
    })
    await choDom(() => {
      expect(bao, 'rời tab phải báo false dù bảng vẫn còn mount').toHaveBeenLastCalledWith(false)
    })
  })
})
