// D12 — thay chuỗi hiển thị tiếng Anh bằng tiếng Việt theo src/board/vi.json.
//
// Tách khỏi scripts/doi-ten-vendor.mjs vì hai việc khác bản chất: đổi tiền tố `affine-` → `drt-`
// là phép thay ĐỒNG NHẤT, sai ở đâu cũng lộ qua kiem:dist; còn dịch chuỗi là phép thay CÓ ĐIỀU
// KIỆN THEO NGỮ CẢNH, sai thì im lặng. Gộp chung một file khiến cả hai khó soi.
//
// Chạy SAU doi-ten-vendor.mjs: bản dịch phải đáp lên cây đã đổi tên, không ngược lại.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(GOC, '.vendor-build')
const banDoDich = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))

// Thoát ký tự đặc biệt của regex trong chuỗi cần dịch.
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let soFile = 0
let soDich = 0

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  let js = goc
  // Chỉ thay khi nằm trọn trong một literal, tránh đụng tên biến.
  for (const [en, vi] of Object.entries(banDoDich)) {
    const truoc = js
    js = js.replace(new RegExp(`(['"\`])${thoat(en)}\\1`, 'g'), (_m, q) => `${q}${vi}${q}`)
    if (js !== truoc) soDich++
  }
  if (js !== goc) {
    writeFileSync(f, js)
    soFile++
  }
}

console.log(`dich-chuoi-vendor: ${soFile} file đã sửa · ${soDich} lượt dịch`)
process.exit(0)
