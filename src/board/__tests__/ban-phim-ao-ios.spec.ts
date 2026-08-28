// @vitest-environment happy-dom
//
// HANDOFF mục 7 — "chạm để gõ chữ không hiện bàn phím trên iPhone/iPad", hướng B (bọc phía app).
//
// Gốc rễ nằm trong cây vendored và luật D11 cấm sửa: `note-tool.ts` gọi `focusTextModel()` bên
// trong `requestAnimationFrame`, và `focusTextModel()` tự nó không gọi `.focus()` mà chỉ đặt một
// `TextSelection` — `.focus()` thật xảy ra sau đó qua một tầng reactive nữa. Safari iOS chỉ bật
// bàn phím khi `.focus()` lên contenteditable được gọi ĐỒNG BỘ trong handler của cử chỉ; một
// `requestAnimationFrame` chen vào là cắt chuỗi "user gesture".
//
// Hướng B không đụng vendor: bắt `pointerup` ở tầng React và tự gọi `.focus()` ĐỒNG BỘ ngay trong
// nhịp cử chỉ đó. Vì lúc pointerup phần tử soạn thảo THẬT chưa tồn tại (nó chỉ ra đời sau khi công
// cụ tạo xong note), ta focus một phần tử MỒI đã nằm sẵn trong DOM để Safari mở bàn phím, rồi để
// cơ chế reactive của BlockSuite chuyển focus sang phần tử thật vài nhịp sau — Safari giữ bàn phím
// khi focus chuyển giữa hai phần tử soạn thảo được, chỉ không mở nó ngoài cử chỉ.
//
// GIỚI HẠN, ghi rõ để không ai đọc nhầm: happy-dom KHÔNG có bàn phím ảo. Bộ ca này canh đúng thứ
// canh được bằng máy — cái gì được focus, ĐỒNG BỘ hay không, và trong tình huống nào. Nó KHÔNG
// chứng minh Safari iOS thật sự bật bàn phím; khoản đó phải nghiệm thu trên iPhone thật.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ganMoBanPhimAoIOS } from '../ban-phim-ao-ios'

function chamVao(muc: Element, pointerType = 'touch') {
  muc.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true, pointerType }),
  )
}

describe('ganMoBanPhimAoIOS — mở bàn phím ảo iOS trong đúng nhịp cử chỉ', () => {
  let viewport: HTMLDivElement
  let moi: HTMLDivElement
  let nen: HTMLDivElement
  let go: (() => void) | undefined
  let tenCongCu: string | undefined = 'default'

  beforeEach(() => {
    vi.useFakeTimers()
    viewport = document.createElement('div')
    // Phần tử mồi: contenteditable thật (không phải <input>) để bàn phím Safari mở ra đúng loại
    // như khi soạn trong note, tránh một nhịp đổi loại bàn phím lúc bàn giao focus.
    moi = document.createElement('div')
    moi.contentEditable = 'true'
    nen = document.createElement('div')
    viewport.append(nen, moi)
    document.body.appendChild(viewport)
    tenCongCu = 'default'
  })

  afterEach(() => {
    go?.()
    go = undefined
    viewport.remove()
    vi.useRealTimers()
  })

  const gan = (laIOS = true) =>
    (go = ganMoBanPhimAoIOS({
      viewport,
      moi,
      laIOS,
      layTenCongCu: () => tenCongCu,
      hanChoMs: 1000,
    }))

  it('KHÔNG phải iOS: không đụng focus của ai — trên máy tính bàn bàn phím vốn đã sẵn sàng', () => {
    gan(false)
    tenCongCu = 'affine:note'
    chamVao(nen)
    expect(document.activeElement).not.toBe(moi)
  })

  it('chuột (pointerType="mouse") trên iPad có bàn phím rời: không mở bàn phím ảo', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen, 'mouse')
    expect(document.activeElement).not.toBe(moi)
  })

  it('công cụ chọn (default) chạm nền: KHÔNG mở bàn phím — chạm để chọn/kéo không phải để gõ', () => {
    gan()
    chamVao(nen)
    expect(document.activeElement).not.toBe(moi)
  })

  it('công cụ Note chạm nền: mồi được focus NGAY trong handler pointerup, không đợi nhịp sau', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    // Khẳng định NGAY, không await gì: đây chính là điều kiện Safari đòi. Nếu bản cài đặt sau này
    // đẩy `.focus()` vào rAF/setTimeout cho "gọn", ca này đỏ — đúng như phải thế.
    expect(document.activeElement).toBe(moi)
  })

  it('công cụ Chữ tự do (affine:edgeless-text) cũng mở bàn phím', () => {
    gan()
    tenCongCu = 'affine:edgeless-text'
    chamVao(nen)
    expect(document.activeElement).toBe(moi)
  })

  it('chạm vào một vùng soạn thảo ĐÃ có sẵn: focus thẳng vào nó, không mượn mồi', () => {
    gan()
    const oSoan = document.createElement('div')
    oSoan.contentEditable = 'true'
    const chuBenTrong = document.createElement('span')
    oSoan.appendChild(chuBenTrong)
    nen.appendChild(oSoan)

    // Chạm vào phần tử CON bên trong vùng soạn (đúng thứ ngón tay chạm phải trong thực tế), không
    // phải chạm thẳng vào chính thẻ contenteditable.
    chamVao(chuBenTrong)
    expect(document.activeElement).toBe(oSoan)
    expect(document.activeElement).not.toBe(moi)
  })

  it('vùng soạn thảo có sẵn được ưu tiên kể cả khi công cụ Note đang bật', () => {
    gan()
    tenCongCu = 'affine:note'
    const oSoan = document.createElement('div')
    oSoan.contentEditable = 'true'
    nen.appendChild(oSoan)
    chamVao(oSoan)
    expect(document.activeElement).toBe(oSoan)
  })

  it('BlockSuite giành lại focus vài nhịp sau: mồi buông ra, KHÔNG giành lại', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    expect(document.activeElement).toBe(moi)

    // Đúng thứ cây vendored làm sau `requestAnimationFrame`: phần tử soạn thảo thật ra đời rồi tự
    // nhận focus qua tầng reactive.
    const oSoanThat = document.createElement('div')
    oSoanThat.contentEditable = 'true'
    nen.appendChild(oSoanThat)
    oSoanThat.focus()

    vi.advanceTimersByTime(2000)
    expect(document.activeElement).toBe(oSoanThat)
  })

  it('hết hạn chờ mà không gì nhận focus: mồi tự buông để bàn phím đóng lại', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    expect(document.activeElement).toBe(moi)

    vi.advanceTimersByTime(1000)
    expect(document.activeElement).not.toBe(moi)
  })

  it('mồi không giữ lại chữ người dùng lỡ gõ trước lúc bàn giao', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    moi.textContent = 'lỡ'
    vi.advanceTimersByTime(1000)
    expect(moi.textContent).toBe('')
  })

  it('hai lượt chạm liên tiếp: lượt sau đặt lại hạn chờ, không bị lượt trước cắt ngang', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    vi.advanceTimersByTime(900)
    chamVao(nen)
    // 900ms nữa: tổng 1800ms tính từ lượt chạm ĐẦU, nhưng mới 900ms tính từ lượt SAU — mồi phải còn
    // giữ focus. Nếu hạn chờ của lượt đầu không bị huỷ, ca này đỏ.
    vi.advanceTimersByTime(900)
    expect(document.activeElement).toBe(moi)
  })

  it('gỡ gắn: listener biến mất, chạm không còn tác dụng', () => {
    gan()
    tenCongCu = 'affine:note'
    go?.()
    go = undefined
    chamVao(nen)
    expect(document.activeElement).not.toBe(moi)
  })

  it('gỡ gắn khi mồi đang giữ focus: buông ra chứ không để bàn phím treo lại', () => {
    gan()
    tenCongCu = 'affine:note'
    chamVao(nen)
    expect(document.activeElement).toBe(moi)
    go?.()
    go = undefined
    expect(document.activeElement).not.toBe(moi)
  })

  it('không đọc được tên công cụ (bảng chưa dựng xong): im lặng bỏ qua, không ném lỗi', () => {
    go = ganMoBanPhimAoIOS({
      viewport,
      moi,
      laIOS: true,
      layTenCongCu: () => undefined,
      hanChoMs: 1000,
    })
    expect(() => chamVao(nen)).not.toThrow()
    expect(document.activeElement).not.toBe(moi)
  })
})
