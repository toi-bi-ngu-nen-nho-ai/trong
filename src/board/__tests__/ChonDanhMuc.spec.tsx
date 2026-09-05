// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChonDanhMuc } from '../ChonDanhMuc'

describe('ChonDanhMuc', () => {
  it('bài viết có ĐỦ BỐN lựa chọn', () => {
    render(<ChonDanhMuc loai="bai-viet" onChon={() => {}} onHuy={() => {}} />)
    for (const ten of ['Tiếp cận vấn đề', 'ECG', 'Phác đồ', 'Hướng dẫn']) {
      expect(screen.getByRole('button', { name: ten })).toBeTruthy()
    }
  })

  it('sơ đồ chỉ có BA — Hướng dẫn không nhận sơ đồ', () => {
    render(<ChonDanhMuc loai="so-do" onChon={() => {}} onHuy={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Hướng dẫn' })).toBeNull()
  })

  it('bấm một danh mục gọi onChon với đúng id', () => {
    const onChon = vi.fn()
    render(<ChonDanhMuc loai="bai-viet" onChon={onChon} onHuy={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG' }))
    expect(onChon).toHaveBeenCalledWith('ecg')
  })

  it('phím Escape gọi onHuy', () => {
    const onHuy = vi.fn()
    render(<ChonDanhMuc loai="bai-viet" onChon={() => {}} onHuy={onHuy} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onHuy).toHaveBeenCalled()
  })
})
