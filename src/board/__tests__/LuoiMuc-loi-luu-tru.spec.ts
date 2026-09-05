// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'
import { LuoiMuc } from '../LuoiMuc'
import { choDenKhi } from '../../__tests__/helpers/cho-den-khi'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const txGoc = IDBDatabase.prototype.transaction

// Ép IndexedDB hỏng ở đúng MỘT chiều. Chặn ngay tại db.transaction() thay vì mock module idb.ts:
// cách này vẫn chạy qua đúng code thật của idbGetAllCoKetQua/idbPut (kể cả nhánh try/catch của
// chúng), nên ca kiểm phản ánh hành vi thật chứ không phải hành vi của một bản giả.
function lamHongIdb(chieu: 'doc' | 'ghi') {
  IDBDatabase.prototype.transaction = function (
    this: IDBDatabase,
    store: string | string[],
    mode?: IDBTransactionMode,
  ) {
    const laGhi = mode === 'readwrite'
    if ((chieu === 'ghi' && laGhi) || (chieu === 'doc' && !laGhi)) {
      throw new DOMException('mô phỏng: kho lưu trữ không mở được', 'InvalidStateError')
    }
    return txGoc.call(this, store, mode)
  } as typeof IDBDatabase.prototype.transaction
}

function chuaLanhIdb() {
  IDBDatabase.prototype.transaction = txGoc
}

function bangMau(id: string, ten: string): MucMeta {
  return {
    id,
    // File này canh hành vi khi IndexedDB hỏng, không canh phân loại — giá trị của bảng sơ đồ
    // đời cũ (xem task-1-brief.md) là đủ.
    loai: 'so-do',
    danhMuc: 'tiep-can',
    ten,
    taoLuc: 1_700_000_000_000,
    capNhatLuc: 1_700_000_000_000,
    chuyenKhoa: 'cardiology',
    tags: [],
    noiDungTimKiem: '',
  }
}

describe('LuoiMuc — hỏng kho lưu trữ', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    chuaLanhIdb()
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
    for (const b of ds) await idbDelete(IDB_STORES.mucs, b.id)
  })

  it('đọc hỏng → báo lỗi kèm nút thử lại, KHÔNG nói dối rằng người dùng chưa có bảng nào', async () => {
    await idbPut(IDB_STORES.mucs, bangMau('bang-kiem-1', 'Phác đồ sốc nhiễm khuẩn'))
    lamHongIdb('doc')

    await act(async () => {
      root.render(createElement(LuoiMuc, { onMoBang: () => {}, tieuDe: 'Sơ đồ tư duy', loaiTaoDuoc: ['so-do'] }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="loi-doc-bang"]')).not.toBeNull()
    })

    // Điều quan trọng nhất của cả file: trước lượt vá này, đọc hỏng cũng trả [] nên màn hình hiện
    // trạng thái rỗng — một lời khẳng định SAI rằng người dùng chưa có bảng nào, đúng vào lúc dữ
    // liệu của họ chỉ đang không đọc được.
    expect(container.textContent).not.toContain('Bắt đầu một sơ đồ tư duy mới')
    expect(container.querySelector('[data-testid="tao-bang"]')).toBeNull()
    expect(container.querySelector('[data-testid="thu-lai-doc-bang"]')).not.toBeNull()
    // Phải trấn an rằng dữ liệu còn nguyên, không chỉ báo lỗi trống không.
    expect(container.textContent).toContain('vẫn nằm trên máy')
  })

  it('đọc hỏng rồi hết hỏng → bấm "Thử lại" là bảng hiện lại, không cần tải lại app', async () => {
    await idbPut(IDB_STORES.mucs, bangMau('bang-kiem-2', 'Chẩn đoán phân biệt đau ngực'))
    lamHongIdb('doc')

    await act(async () => {
      root.render(createElement(LuoiMuc, { onMoBang: () => {}, tieuDe: 'Sơ đồ tư duy', loaiTaoDuoc: ['so-do'] }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="thu-lai-doc-bang"]')).not.toBeNull()
    })

    // Ca thật tương ứng: người dùng đóng tab app bản cũ đang giữ IndexedDB rồi bấm thử lại.
    chuaLanhIdb()
    await act(async () => {
      ;(container.querySelector('[data-testid="thu-lai-doc-bang"]') as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.textContent).toContain('Chẩn đoán phân biệt đau ngực')
    })
    expect(container.querySelector('[data-testid="loi-doc-bang"]')).toBeNull()
  })

  it('ghi hỏng → báo ngay, và "Thử lại" ghi lại THẬT xuống IndexedDB', async () => {
    await act(async () => {
      root.render(createElement(LuoiMuc, { onMoBang: () => {}, tieuDe: 'Sơ đồ tư duy', loaiTaoDuoc: ['so-do'] }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    lamHongIdb('ghi')
    await act(async () => {
      ;(container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="thu-lai-ghi-bang"]')).not.toBeNull()
    })
    // Giao diện cập nhật lạc quan nên thẻ vẫn hiện — đúng chỗ nguy hiểm: không có dải báo này thì
    // người dùng tin đã lưu xong trong khi IndexedDB không nhận gì cả.
    expect(await idbGetAll<{ id: string }>(IDB_STORES.mucs)).toHaveLength(0)

    chuaLanhIdb()
    await act(async () => {
      ;(container.querySelector('[data-testid="thu-lai-ghi-bang"]') as HTMLButtonElement).click()
    })
    // Thử lại phải ghi THẬT, không chỉ tắt dải báo cho đẹp.
    await choDenKhi(async () => {
      expect(await idbGetAll<{ id: string }>(IDB_STORES.mucs)).toHaveLength(1)
    })
  })
})
