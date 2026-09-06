// @vitest-environment happy-dom
//
// Task 7 (kho-bai-viet-giai-doan-5-6): sáu màn (Thư viện, Hướng dẫn, Mindmap, ba thẻ Truy cập nhanh
// "Tiếp cận vấn đề"/"ECG"/"Phác đồ", màn chuyên khoa) dùng CHUNG một BoardGallery/LuoiMuc, chỉ khác
// props lọc (BoLocMuc, Task 5). Ba ca dưới đây ghim đúng bộ lọc của ba màn: Thư viện loại trừ
// "huong-dan", Hướng dẫn CHỈ nhận danhMuc đó, và thẻ ECG mở lưới trộn cả hai `loai` cùng danhMuc
// 'ecg'.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'

vi.mock('../board/index', () => ({ VoMuc: () => <div data-testid="vo-muc" /> }))

const muc = (id: string, loai: MucMeta['loai'], danhMuc: MucMeta['danhMuc']): MucMeta => ({
  id,
  loai,
  danhMuc,
  ten: id,
  taoLuc: 1,
  capNhatLuc: 1,
  chuyenKhoa: '',
  tags: [],
  noiDungTimKiem: '',
})

describe('sáu màn dùng chung LuoiMuc', () => {
  it('Thư viện: chỉ bài viết, KHÔNG gồm Hướng dẫn', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-hd', 'bai-viet', 'huong-dan'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg', 'so-do', 'ecg'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))

    await waitFor(() => expect(screen.getByText('bv-ecg')).toBeTruthy())
    expect(screen.queryByText('bv-hd')).toBeNull()
    expect(screen.queryByText('sd-ecg')).toBeNull()
  })

  it('Hướng dẫn: đúng những mục danh mục huong-dan', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-hd2', 'bai-viet', 'huong-dan'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))

    await waitFor(() => expect(screen.getByText('bv-hd2')).toBeTruthy())
  })

  it('thẻ ECG ở Trang chủ mở lưới lọc theo danh mục ecg, trộn cả hai loại', async () => {
    await idbPut(IDB_STORES.mucs, muc('bv-ecg3', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('sd-ecg3', 'so-do', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-pd3', 'bai-viet', 'phac-do'))

    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))

    await waitFor(() => expect(screen.getByText('bv-ecg3')).toBeTruthy())
    expect(screen.getByText('sd-ecg3')).toBeTruthy()
    expect(screen.queryByText('bv-pd3')).toBeNull()
  })

  // ─── Review Task 7 — I1: thanh nav dưới không được hiện ở màn "danhMuc" ─────────────────────────
  // Trước bản vá: "danhMuc" vắng mặt trong NON_TAB_SCREENS (App.tsx) → isDetailScreen tính sai →
  // anThanhNav === false → <nav aria-label="Điều hướng chính"> render dù đang xem lưới mở từ một
  // thẻ Truy cập nhanh. Gỡ dòng thêm "danhMuc" vào NON_TAB_SCREENS thì ca này phải ĐỎ lại.
  it('I1: màn mở từ thẻ Truy cập nhanh (danhMuc) không hiện thanh nav dưới', async () => {
    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'ECG' })).toBeTruthy())
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính' })).toBeNull()
  })

  // ─── Review Task 7 — I2: màn "danhMuc" phải có đường quay lại Trang chủ của riêng nó ────────────
  // I1 tắt thanh nav ở màn này (đúng) nhưng nếu KHÔNG bù affordance nào khác, ba thẻ Truy cập nhanh
  // trở thành ngõ cụt (cụm nút nổi ThemeToggle/SpecialtyPicker cũng không hiện ở màn "danhMuc" — chỉ
  // "home"/"specialty"). Nút quay lại render trong slot `actions` của ScreenHeader (LuoiMuc.tsx, qua
  // onQuayLai) là lối thoát DUY NHẤT còn lại — gỡ onQuayLai (App.tsx) hoặc gỡ nhánh render nó
  // (LuoiMuc.tsx) thì ca này phải ĐỎ lại: hoặc không tìm thấy nút, hoặc bấm xong không thấy lại
  // Trang chủ.
  it('I2: màn "danhMuc" có nút quay lại riêng, bấm nó thì về Trang chủ', async () => {
    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'ECG' })).toBeTruthy())
    // Nút quay lại nằm trong slot `actions` của ScreenHeader — KHÔNG render trong nhánh `loading`
    // (LuoiMuc.tsx: `if (loading) return <ScreenHeader title={tieuDe} />`, không có actions). Phải
    // đợi useIdbCollection đọc xong lần đầu, không lấy heading làm tín hiệu "đã sẵn sàng" vì cả hai
    // nhánh loading/loaded đều render heading giống hệt nhau.
    const nutQuayLai = await screen.findByTestId('quay-lai-danh-muc')
    fireEvent.click(nutQuayLai)

    // Về đúng Trang chủ — kiểm bằng một affordance CHỈ có ở Trang chủ (nút "Tạo bài mới" nổi, xem
    // tao-bai-moi-tu-trang-chu.spec.tsx), không phải chỉ "màn danhMuc đã unmount".
    await waitFor(() => expect(screen.getByRole('button', { name: /Tạo bài mới/ })).toBeTruthy())
  })

  // ─── Review Task 7 — I3: thẻ ECG không được hiện số đếm SAI ─────────────────────────────────────
  // Trước bản vá: caption thẻ ECG đọc `ecgCount` = allEcgLessons.length (ecgCol IndexedDB CŨ +
  // ECG_LESSONS tĩnh — ECG_LESSONS nay rỗng, xem src/data/ecg.ts). Với người dùng mới (không có bài
  // học ECG hệ cũ nào), số này luôn là 0 → in hẳn "(0)" dù lưới `mucs` thật (thứ thẻ này mở ra từ
  // Task 7) có thể có nội dung. Gỡ bản vá (khôi phục `count: ecgCount` + nhánh `(${c.count})` trong
  // cardCaption) thì ca này phải ĐỎ lại.
  it('I3: thẻ ECG ở Trang chủ không hiển thị số đếm giả "(0)"', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    const the = screen.getByRole('button', { name: /ECG/ })
    expect(the.textContent).not.toContain('(0)')
  })

  // ─── Tự soát: "vào rồi RA" ────────────────────────────────────────────────────────────────────
  // Bài học đã ghi của dự án: "mở lên chạy đúng" không đủ — phải bấm VÀO, THOÁT RA, sang màn khác
  // rồi quay lại, xem có rò rỉ trạng thái không. Sáu màn ở Task 7 dùng CHUNG một BoardGallery/LuoiMuc
  // nhưng chỉ mount khi `screen` khớp (không giữ sống như instance Mindmap) — ca này ghim đúng việc
  // đó: mở một mục ở Thư viện, thoát ra, sang Hướng dẫn, không còn thấy mục của Thư viện lẫn dư ảnh
  // của vỏ trang vừa đóng; quay lại Thư viện vẫn đúng lưới cũ.
  it('vào Thư viện, mở một mục, thoát ra, sang Hướng dẫn rồi quay lại — không rò rỉ trạng thái', async () => {
    await idbPut(IDB_STORES.mucs, muc('tv-mo4', 'bai-viet', 'phac-do'))
    await idbPut(IDB_STORES.mucs, muc('hd-rieng4', 'bai-viet', 'huong-dan'))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /^Mở bảng tv-mo4/ }))
    await waitFor(() => expect(screen.getByTestId('vo-muc')).toBeTruthy())

    fireEvent.click(screen.getByTestId('quay-lai'))
    // "quay lại" giấu CẢ HAI nhánh (lưới lẫn vỏ trang) trong một nhịp rất ngắn trước khi lưới mount
    // lại thật (cờ `dangDong`, BoardGallery.tsx) — chờ bằng waitFor, không phải expect đồng bộ ngay
    // sau khi vo-muc biến mất.
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))
    await waitFor(() => expect(screen.getByText('hd-rieng4')).toBeTruthy())
    expect(screen.queryByText('tv-mo4')).toBeNull()
    expect(screen.queryByTestId('vo-muc')).toBeNull()
    expect(screen.queryByTestId('quay-lai')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Thư viện' }))
    await waitFor(() => expect(screen.getByText('tv-mo4')).toBeTruthy())
    expect(screen.queryByText('hd-rieng4')).toBeNull()
  })

  // ─── Tự soát: chuỗi thao tác nối tiếp giữa các thẻ danh mục ──────────────────────────────────
  // Ba thẻ "Tiếp cận vấn đề"/"ECG"/"Phác đồ" dùng CHUNG một nhánh Screen "danhMuc" + state
  // `danhMucDangXem` — rủi ro thật là danh mục CŨ còn dính lại khi bấm thẻ khác, vì hai lượt mở chỉ
  // khác nhau ở MỘT state, không phải một Screen riêng. Ca này bấm ECG rồi quay Trang chủ rồi bấm
  // Phác đồ, xác nhận lưới đổi đúng nội dung, không cộng dồn dữ liệu của thẻ trước.
  //
  // Review Task 7 (I1): trước bản vá này, quay Trang chủ đi qua thanh nav dưới (bấm nút "Trang chủ")
  // vì thanh nav SAI hiện ra ở màn "danhMuc". Sau khi I1 tắt đúng thanh nav ở màn này, lối quay về
  // duy nhất là nút quay lại của I2 (data-testid="quay-lai-danh-muc") — đổi ca kiểm theo đúng lối đó,
  // không phải giữ nguyên rồi để nó đỏ vì lý do KHÔNG liên quan tới thứ ca kiểm này định phủ.
  it('bấm ECG rồi Trang chủ rồi Phác đồ — lưới đổi đúng danh mục, không cộng dồn thẻ trước', async () => {
    await idbPut(IDB_STORES.mucs, muc('ecg-rieng5', 'bai-viet', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('pd-rieng5', 'bai-viet', 'phac-do'))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))
    await waitFor(() => expect(screen.getByText('ecg-rieng5')).toBeTruthy())
    expect(screen.queryByText('pd-rieng5')).toBeNull()

    fireEvent.click(screen.getByTestId('quay-lai-danh-muc'))
    await screen.findByRole('button', { name: /Tạo bài mới/ })

    fireEvent.click(screen.getByRole('button', { name: 'Phác đồ' }))
    await waitFor(() => expect(screen.getByText('pd-rieng5')).toBeTruthy())
    expect(screen.queryByText('ecg-rieng5')).toBeNull()
  })

  // ─── C1 (Critical, đợt vá cuối trước hợp nhất) — Mindmap: lưới CHỈ hiện sơ đồ ───────────────────
  // Ca "CA GHIM Ở MỨC COMPONENT" ở BoardGallery.spec.ts mount <BoardGallery> TRỰC TIẾP và tự truyền
  // lại `loai="so-do"` NGAY TRONG LỆNH GỌI TEST — nó ghim đúng hành vi lọc của LuoiMuc khi NHẬN được
  // prop đó, nhưng không chạm gì tới việc App.tsx có thật sự truyền prop đó cho instance tab Mindmap
  // hay không. Gỡ `loai="so-do"` khỏi dòng dựng instance Mindmap thật trong App.tsx không làm ca đó
  // đỏ (đã tự kiểm bằng thực nghiệm: 30/30 ca liên quan vẫn xanh) — xem chú thích sửa lại tại
  // BoardGallery.spec.ts để không còn tuyên bố sai chỗ đó.
  //
  // Ca này mount <App/> THẬT rồi bấm ĐÚNG nút thanh nav dưới ("Mindmap") mà người dùng bấm hàng
  // ngày — chạm đúng dây nối thật giữa App.tsx và BoardGallery. Gỡ `loai="so-do"` khỏi App.tsx (dòng
  // dựng instance Mindmap) thì ca này phải ĐỎ: LuoiMuc nhận loai: undefined, locTheoProps() bỏ điều
  // kiện lọc, bản ghi 'bai-viet' lọt vào lưới sơ đồ.
  it('C1: tab Mindmap chỉ hiện sơ đồ, bài viết cùng danh mục không lẫn vào', async () => {
    await idbPut(IDB_STORES.mucs, muc('sd-mindmap6', 'so-do', 'ecg'))
    await idbPut(IDB_STORES.mucs, muc('bv-mindmap6', 'bai-viet', 'ecg'))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Mindmap' }))

    await waitFor(() => expect(screen.getByText('sd-mindmap6')).toBeTruthy())
    expect(screen.queryByText('bv-mindmap6')).toBeNull()
  })

  // ─── I1 (Important, đợt vá cuối trước hợp nhất) — nút "+" ở màn danh mục tạo bài-viết ───────────
  // LuoiMuc.tsx (nút "+", ~dòng 1675/1678) chỉ từng đọc `loaiTaoDuoc[0]` — `loaiTaoDuoc[1]` không
  // được đọc ở đâu cả (xác nhận bằng grep). Trước bản vá, ba màn danh mục hỗn hợp (Tiếp cận vấn đề/
  // ECG/Phác đồ) khai `loaiTaoDuoc={['bai-viet', 'so-do']}` — NGỤ Ý nút "+" tạo được cả hai loại,
  // nhưng vì chỉ [0] được đọc, nút đó luôn tạo 'bai-viet' dù cấu hình khai cả 'so-do'. App.tsx nay
  // chỉ còn khai loaiTaoDuoc={['bai-viet']} cho instance này (xem chú thích tại App.tsx, khối JSX
  // "danhMuc") — cấu hình khớp với mã thật, không nói dối khả năng. Sơ đồ trong danh mục này vẫn
  // tạo được, chỉ đổi lối vào: qua tab Mindmap (loaiTaoDuoc=['so-do'] ở đó), rồi tự HIỆN LẠI ở màn
  // danh mục nhờ lọc theo `danhMuc` (không lọc `loai`) — không mất khả năng, không thêm UI chọn loại
  // (ngoài phạm vi cổng hợp nhất).
  //
  // Ca này ghim đúng quan sát được của người dùng: bấm "+" ở màn danh mục (ECG) → bản ghi mới trong
  // IndexedDB phải là loại 'bai-viet'. Gỡ 'bai-viet' khỏi loaiTaoDuoc (đưa 'so-do' lên [0], hoặc
  // đổi App.tsx trở lại ['bai-viet', 'so-do'] với thứ tự khác) sẽ làm ca này đỏ.
  it('I1: nút "+" ở màn danh mục (ECG) tạo mục loại bài-viết', async () => {
    // idb dùng chung KHÔNG reset giữa các ca trong file này (nhiều ca khác cũng seed danhMuc
    // 'ecg') — so sánh TẬP id trước/sau cú bấm thay vì đếm tổng số bản ghi 'ecg', để không lẫn với
    // dữ liệu các ca kiểm khác để lại.
    const idTruoc = new Set((await idbGetAll<MucMeta>(IDB_STORES.mucs)).map((m) => m.id))

    const { default: App } = await import('../App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /ECG/ }))
    await screen.findByTestId('quay-lai-danh-muc')

    fireEvent.click(screen.getByTestId('tao-bang'))

    let mucMoi: MucMeta | undefined
    await waitFor(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.mucs)
      mucMoi = ds.find((m) => !idTruoc.has(m.id))
      expect(mucMoi).toBeTruthy()
    })
    expect(mucMoi?.danhMuc).toBe('ecg')
    expect(mucMoi?.loai).toBe('bai-viet')
  })
})
