// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MindMapDoodle } from '../MindMapDoodle'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('MindMapDoodle', () => {
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

  it('vẽ đúng viewBox 513×435 và đủ 8 path (không rớt/nhân đôi path nào so với nguồn)', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, {}))
    })
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 513 435')
    expect(container.querySelectorAll('svg > path')).toHaveLength(8)
  })

  it('stroke dùng currentColor (không hardcode #000) để tự đổi theo theme', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, {}))
    })
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
  })

  it('className truyền vào gắn thẳng lên thẻ svg gốc', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, { className: 'w-full h-full opacity-40' }))
    })
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toBe('w-full h-full opacity-40')
  })
})
