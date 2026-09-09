// @vitest-environment happy-dom
import { act } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
})
