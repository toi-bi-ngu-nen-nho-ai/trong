// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'

// Vỏ nạp chậm thật kéo cả chunk BlockSuite — thay bằng một thẻ ghi lại `loai` nó nhận được.
vi.mock('../index', () => ({
  VoMuc: ({ loai }: { loai: string }) => <div data-testid="vo-muc" data-loai={loai} />,
}))

// Hai ca kiểm dưới đây ghi vào CHUNG store `mucs` (fake-indexeddb sống suốt file, không tự reset
// giữa các `it()`) — dọn sạch sau mỗi ca để ca sau không thấy lẫn thẻ của ca trước. Đặc biệt quan
// trọng cho ca "bấm một thẻ" bên dưới: nó cần lưới chỉ có ĐÚNG MỘT thẻ để bấm không mơ hồ.
afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const b of ds) await idbDelete(IDB_STORES.mucs, b.id)
})

describe('BoardGallery chọn vỏ theo bản ghi', () => {
  it('mở một mục loai="bai-viet" thì truyền "bai-viet" xuống VoMuc', async () => {
    const muc: MucMeta = {
      id: 'muc-bv',
      loai: 'bai-viet',
      danhMuc: 'ecg',
      ten: 'Bài thử',
      taoLuc: 1,
      capNhatLuc: 1,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    await idbPut(IDB_STORES.mucs, muc)

    const { BoardGallery } = await import('../BoardGallery')
    render(
      <BoardGallery
        dangHienTab
        tieuDe="Thử"
        loaiTaoDuoc={[]}
        moBangYeuCau="muc-bv"
        onMoBangYeuCauXong={() => {}}
        onDaDoc={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })
  })

  // Đường mở-QUA-THẺ trong lưới — RULING của controller (ledger 2026-09-05, task-5): sửa CHỈ effect
  // `moBangYeuCau` (ca trên) là KHÔNG ĐỦ, vì effect đó chỉ chạy cho lượt mở từ kết quả tìm kiếm toàn
  // app. Mở qua một thẻ trong lưới đi qua `onMoBang(id, origin, ten, loai)` mà `LuoiMuc.tsx:2701`
  // gọi — một dây nối HOÀN TOÀN KHÁC, không chạm effect trên. Ca này mount LƯỚI THẬT (không phải
  // `locTheoProps` trần — cùng tinh thần "CA GHIM Ở MỨC COMPONENT" của BoardGallery.spec.ts) và bấm
  // thật một thẻ để canh đúng dây đó — thiếu ca này, xoá tham số thứ tư của `onMoBang` (hoặc quên
  // truyền `bang.loai` ở LuoiMuc.tsx) khiến MỌI bài viết mở từ lưới hiện ra bằng vỏ bảng vẽ, mà ca
  // kiểm còn lại (đường `moBangYeuCau`) không hề phát hiện được vì nó không đi qua lưới.
  it('bấm một thẻ loai="bai-viet" trong lưới thì truyền "bai-viet" xuống VoMuc', async () => {
    const bayGio = Date.now()
    const muc: MucMeta = {
      id: 'muc-bv-2',
      loai: 'bai-viet',
      danhMuc: 'ecg',
      ten: 'Bài thử qua thẻ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    await idbPut(IDB_STORES.mucs, muc)

    const { BoardGallery } = await import('../BoardGallery')
    render(<BoardGallery dangHienTab tieuDe="Thử" loaiTaoDuoc={['bai-viet']} onDaDoc={() => {}} />)

    const the = await screen.findByTestId('the-bang')
    fireEvent.click(the.querySelector('button') as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByTestId('vo-muc').getAttribute('data-loai')).toBe('bai-viet')
    })
  })
})
