// @vitest-environment happy-dom
import React, { act } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { gsap } from 'gsap'

import { IntroOverlay } from '../IntroOverlay'

const killMock = vi.fn()
const timelineMock = vi.fn()

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    timeline: (...args: unknown[]) => {
      timelineMock(...args)
      const tl = {
        to: () => tl,
        kill: killMock,
      }
      return tl
    },
  },
}))

function ganMatchMedia(reduced: boolean) {
  ;(window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

// happy-dom KHÔNG cài `document.fonts` (đã đo: `typeof document.fonts === 'undefined'`), mà
// IntroOverlay chờ `document.fonts.ready` trước khi dựng timeline (cổng chống FOUT). Mỗi ca phải
// tự khai bộ font giả để nói rõ nó đang kiểm nhánh nào: font đã sẵn sàng, hay treo vô hạn.
function ganFonts(ready: Promise<unknown> | undefined) {
  Object.defineProperty(document, 'fonts', {
    value: ready === undefined ? undefined : { ready },
    configurable: true,
  })
}

beforeEach(() => {
  vi.mocked(gsap.set).mockClear()
  killMock.mockClear()
  timelineMock.mockClear()
  ganMatchMedia(false)
  ganFonts(Promise.resolve())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('IntroOverlay', () => {
  it('dựng đủ #letterT / #textBacSi / #textRong cho timeline nhắm tới', () => {
    const { container } = render(<IntroOverlay onFinished={() => {}} />)
    expect(container.querySelector('#letterT')).not.toBeNull()
    expect(container.querySelector('#textBacSi')).not.toBeNull()
    expect(container.querySelector('#textRong')).not.toBeNull()
  })

  // Điểm 1 chủ dự án bác ở bản Task 3: cụm logo dựng HAI chữ T (một chữ T to riêng một dòng, một
  // chữ T nữa nằm cứng trong "Trọng"), nên chữ T to không bao giờ "chui vào" chữ Trọng. Bản mới
  // chỉ được có ĐÚNG MỘT chữ T, và nó phải là #letterT — cái mà timeline dời đi rồi thả về chỗ.
  it('cụm logo chỉ có ĐÚNG MỘT chữ T, và đó là #letterT', () => {
    const { container } = render(<IntroOverlay onFinished={() => {}} />)
    const logo = container.querySelector('#introLogo')!
    expect(logo).not.toBeNull()

    // Toàn bộ chữ trong cụm logo, bỏ khoảng trắng/xuống dòng do JSX chèn.
    expect(logo.textContent!.replace(/\s+/g, '')).toBe('BácsĩTrọng')
    // Đúng một chữ T viết hoa trong cả cụm.
    expect((logo.textContent!.match(/T/g) ?? []).length).toBe(1)
    // Và chữ T đó nằm trong #letterT, không phải trong #textRong.
    expect(container.querySelector('#letterT')!.textContent).toBe('T')
    expect(container.querySelector('#textRong')!.textContent).toBe('rọng')
    // Chỉ một phần tử trong cụm mang màu xanh intro — chữ T thứ hai kiểu cũ cũng mang màu này.
    expect(logo.querySelectorAll('[style*="c-intro-blue"]')).toHaveLength(1)
  })

  // Khung vẽ ĐẦU TIÊN: React sơn xong từ trước khi cổng chờ font giải quyết, nên nếu cụm logo hiện
  // sẵn thì người dùng thấy nguyên cái kết ("Bác sĩ Trọng" đủ nét, chữ T cỡ 1x) tới 500ms rồi mới
  // giật về pha 1. gsap bị mock ở đây nên `gsap.set` là no-op — đúng chỗ để đo trạng thái SƠN THẬT.
  it('khung vẽ đầu tiên: cụm logo ẩn (visibility hidden) trước khi timeline chạy', () => {
    const { container } = render(<IntroOverlay onFinished={() => {}} />)
    const logo = container.querySelector('#introLogo') as HTMLElement
    expect(logo.style.visibility).toBe('hidden')
  })

  // Cụm logo chỉ được bật lên trong CÙNG lượt gsap.set đặt x/y/scale mở màn — không sớm hơn.
  it('gsap.set bật cụm logo thành visible cùng lượt đặt transform mở màn', async () => {
    render(<IntroOverlay onFinished={() => {}} />)
    await act(async () => {})
    const setCalls = vi.mocked(gsap.set).mock.calls
    expect(setCalls.length).toBeGreaterThan(0)
    expect(setCalls.some(([, vars]) => (vars as { visibility?: string }).visibility === 'visible')).toBe(true)
  })

  it('prefers-reduced-motion: reduce → gọi onFinished ngay, không tạo timeline', async () => {
    ganMatchMedia(true)
    const onFinished = vi.fn()
    render(<IntroOverlay onFinished={onFinished} />)
    // NGAY lập tức, không await: lối tắt trợ năng không được nấp sau cổng chờ font.
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(timelineMock).not.toHaveBeenCalled()
    // Và cũng không có timeline nào lẻn vào sau khi promise font giải quyết.
    await act(async () => {})
    expect(timelineMock).not.toHaveBeenCalled()
  })

  it('unmount giữa chừng → kill timeline, không throw', async () => {
    const { unmount } = render(<IntroOverlay onFinished={() => {}} />)
    // Timeline dựng sau khi cuộc đua font-ready giải quyết (microtask), không phải ngay trong effect.
    await act(async () => {})
    expect(timelineMock).toHaveBeenCalledTimes(1)
    expect(() => unmount()).not.toThrow()
    expect(killMock).toHaveBeenCalledTimes(1)
  })

  it('timeline không bao giờ onComplete → timeout dự phòng vẫn gọi onFinished', async () => {
    vi.useFakeTimers()
    const onFinished = vi.fn()
    render(<IntroOverlay onFinished={onFinished} />)
    await act(async () => {})
    expect(timelineMock).toHaveBeenCalledTimes(1)
    expect(onFinished).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('document.fonts.ready treo vĩnh viễn → cuộc đua 500ms vẫn cho timeline khởi động', async () => {
    vi.useFakeTimers()
    ganFonts(new Promise(() => {}))
    render(<IntroOverlay onFinished={() => {}} />)
    await act(async () => {})
    expect(timelineMock).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(timelineMock).toHaveBeenCalledTimes(1)
  })

  it('môi trường không có document.fonts → vẫn dựng timeline, không throw', async () => {
    ganFonts(undefined)
    expect(() => render(<IntroOverlay onFinished={() => {}} />)).not.toThrow()
    await act(async () => {})
    expect(timelineMock).toHaveBeenCalledTimes(1)
  })

  // src/main.tsx bọc cả app trong <React.StrictMode>, nên ở dev effect chạy setup → cleanup →
  // setup. Nếu chốt `startedRef` không được mở lại trong cleanup, lần setup THỨ HAI (lần thật sự
  // sống) sẽ thoát ngay: không timeline, không hạn giờ dự phòng — overlay z-[999] treo vĩnh viễn.
  it('StrictMode (setup → cleanup → setup) → lần mount sống vẫn dựng đúng MỘT timeline', async () => {
    render(
      <React.StrictMode>
        <IntroOverlay onFinished={() => {}} />
      </React.StrictMode>,
    )
    await act(async () => {})
    expect(timelineMock).toHaveBeenCalledTimes(1)
  })

  // Và hạn giờ dự phòng của lần setup sống phải còn được lên nòng — nếu cleanup lần đầu xoá nó mà
  // lần setup sau không đặt lại thì overlay mất luôn đường thoát cuối cùng.
  it('StrictMode → timeout dự phòng của lần mount sống vẫn gọi onFinished', async () => {
    vi.useFakeTimers()
    const onFinished = vi.fn()
    render(
      <React.StrictMode>
        <IntroOverlay onFinished={onFinished} />
      </React.StrictMode>,
    )
    await act(async () => {})
    expect(onFinished).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  // Mặt kia của cùng một chốt: nhánh reduced-motion thoát sớm, KHÔNG đăng ký cleanup, nên chốt
  // không bao giờ được mở lại — nhờ vậy lần setup thứ hai của StrictMode không gọi onFinished
  // thêm lần nữa. (`daXong` không cứu được ca này: mỗi lượt effect có một biến riêng.)
  it('StrictMode + reduced-motion → onFinished vẫn chỉ đúng MỘT lần', () => {
    ganMatchMedia(true)
    const onFinished = vi.fn()
    render(
      <React.StrictMode>
        <IntroOverlay onFinished={onFinished} />
      </React.StrictMode>,
    )
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(timelineMock).not.toHaveBeenCalled()
  })

  // Hai đường cùng dẫn tới finish (timeline onComplete / hạn giờ dự phòng). Cha có thể giữ overlay
  // lại thêm một nhịp sau khi hoạt cảnh xong, nên hạn giờ vẫn sống và sẽ nổ — chốt một-lần phải
  // nuốt cú thứ hai.
  it('timeline onComplete rồi timeout dự phòng nổ → onFinished chỉ đúng MỘT lần', async () => {
    vi.useFakeTimers()
    const onFinished = vi.fn()
    render(<IntroOverlay onFinished={onFinished} />)
    await act(async () => {})
    expect(timelineMock).toHaveBeenCalledTimes(1)

    const cauHinh = timelineMock.mock.calls[0][0] as { onComplete: () => void }
    await act(async () => {
      cauHinh.onComplete()
    })
    expect(onFinished).toHaveBeenCalledTimes(1)

    // Overlay chưa unmount → hạn giờ 6000ms vẫn còn nòng.
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })
})
