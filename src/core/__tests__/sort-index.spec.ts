import { describe, expect, it } from 'vitest'

import { sortIndex } from '../utils/sort'

// sortIndex quyết định thứ tự chồng lớp. Bốn nhánh trong thân hàm, theo thứ tự:
//   1. cả hai đều thuộc nhóm  2. chỉ a thuộc nhóm
//   3. chỉ b thuộc nhóm       4. không cái nào thuộc nhóm
// Mỗi nhánh một khối describe bên dưới.

type Entry = { id: string; index: string }

const empty = new Map<string, Entry>()

describe('sortIndex — không phần tử nào thuộc nhóm', () => {
  it('so sánh trực tiếp theo chỉ số phân số', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a1' }, empty)).toBe(-1)
    expect(sortIndex({ id: 'a', index: 'a1' }, { id: 'b', index: 'a0' }, empty)).toBe(1)
  })

  it('trả 0 khi hai chỉ số bằng nhau', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a0' }, empty)).toBe(0)
  })

  it('so sánh theo chuỗi, không theo số — "a0V" đứng sau "a0"', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a0V' }, empty)).toBe(-1)
  })
})

describe('sortIndex — cả hai phần tử đều thuộc nhóm', () => {
  it('khác nhóm thì so theo chỉ số của NHÓM, bỏ qua chỉ số phần tử', () => {
    // a trong nhóm g1 (index 'a0'), b trong nhóm g2 (index 'a5'). Chỉ số phần
    // tử cố tình ngược chiều để chứng minh nhóm mới là thứ quyết định.
    const groups = new Map<string, Entry>([
      ['a', { id: 'g1', index: 'a0' }],
      ['b', { id: 'g2', index: 'a5' }],
    ])
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(-1)
  })

  it('cùng nhóm thì so theo chỉ số phần tử', () => {
    const g: Entry = { id: 'g1', index: 'a0' }
    const groups = new Map<string, Entry>([
      ['a', g],
      ['b', g],
    ])
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a1' }, groups)).toBe(-1)
    expect(sortIndex({ id: 'a', index: 'a1' }, { id: 'b', index: 'a1' }, groups)).toBe(0)
  })
})

describe('sortIndex — chỉ một phần tử thuộc nhóm', () => {
  it('a thuộc nhóm mà b CHÍNH LÀ nhóm đó thì a đứng trên', () => {
    const groups = new Map<string, Entry>([['a', { id: 'g1', index: 'a0' }]])
    expect(sortIndex({ id: 'a', index: 'a9' }, { id: 'g1', index: 'a0' }, groups)).toBe(1)
  })

  it('b thuộc nhóm mà a CHÍNH LÀ nhóm đó thì a đứng dưới', () => {
    const groups = new Map<string, Entry>([['b', { id: 'g1', index: 'a0' }]])
    expect(sortIndex({ id: 'g1', index: 'a0' }, { id: 'b', index: 'a9' }, groups)).toBe(-1)
  })

  it('a thuộc nhóm, b đứng ngoài: so chỉ số nhóm của a với chỉ số của b', () => {
    const groups = new Map<string, Entry>([['a', { id: 'g1', index: 'a5' }]])
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(1)
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a9' }, groups)).toBe(-1)
  })
})

describe('sortIndex — dùng thật trong Array.sort', () => {
  it('xếp một bảng có nhóm ra đúng thứ tự chồng lớp', () => {
    const groups = new Map<string, Entry>([
      ['shape-1', { id: 'g1', index: 'a1' }],
      ['shape-2', { id: 'g1', index: 'a1' }],
    ])
    const elements: Entry[] = [
      { id: 'brush', index: 'a2' },
      { id: 'shape-2', index: 'a1' },
      { id: 'note', index: 'a0' },
      { id: 'shape-1', index: 'a0' },
    ]

    const sorted = [...elements].sort((a, b) => sortIndex(a, b, groups))

    // note (a0) dưới cùng; hai shape thuộc nhóm g1 (a1) giữ thứ tự nội bộ
    // a0 trước a1; brush (a2) trên cùng.
    expect(sorted.map(e => e.id)).toEqual(['note', 'shape-1', 'shape-2', 'brush'])
  })
})
