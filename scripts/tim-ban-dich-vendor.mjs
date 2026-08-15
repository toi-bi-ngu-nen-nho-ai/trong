// Chẩn đoán cho luật C của kiem-dist.mjs — CHỈ chạy trên ĐƯỜNG ĐỎ.
//
// Vấn đề nó giải: Cổng 3 của dich-chuoi-vendor.mjs đòi mỗi khoá vi.json phải dịch được ở đâu đó
// trong cây; luật C đòi mỗi bản dịch phải có mặt trong dist/. Giữa hai yêu cầu đó có một lớp chuỗi
// "dịch được nhưng không được phép dịch": bước dịch thay nó thành công ở .vendor-build/, rồi
// rolldown tree-shake nguyên gói chứa nó vì gói đó chưa được nối vào src/board/extensions.ts.
// Với lớp này, thông báo cũ của luật C nêu hai nguyên nhân mà CẢ HAI ĐỀU SAI — nó đẩy người sửa
// đi dựng lại .vendor-build/ (vô ích) rồi đi soi luat-vi-tri-dich.mjs (vô ích), trong khi việc
// cần làm là gỡ khoá đó khỏi vi.json.
//
// Quét theo GIÁ TRỊ TIẾNG VIỆT, không phải chuỗi gốc tiếng Anh: sau khi bước dịch chạy, bản gốc
// tiếng Anh đã biến mất khỏi đúng những chỗ đó, nên quét tiếng Anh sẽ không thấy gì và kết luận
// ngược hoàn toàn.
//
// ĐỘC LẬP với bao-cao-dich.json — tính lại từ cây thật. Đọc báo cáo thì nhanh hơn, nhưng đó là
// lời TỰ KHAI của chính bộ thay chuỗi; cổng độc lập ở Task 4 của chặng P1-B sinh ra chính vì lý
// do ngược lại, đi ngược nó ở đây là tự tháo một tính chất đã trả giá để có.
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'

// Số chỗ in ra tối đa cho mỗi chuỗi, để một lượt đỏ nhiều khoá không đẩy thông báo thật ra khỏi
// màn hình.
const TOI_DA_CHO = 3

// Gói = thư mục tổ tiên gần nhất có package.json.
//
// KHÔNG cắt cứng N đoạn đầu đường dẫn: cây có HAI độ sâu gói (`affine/all` nhưng
// `affine/blocks/attachment`), nên cắt 3 đoạn là sai với 8 gói. Và KHÔNG giữ danh sách tên nhóm
// chép tay: nó sẽ mục ngay lần nâng cấp cây vendored tiếp theo, đúng cảnh báo mở đầu
// src/board/extensions.ts về danh sách 36 mục bị bỏ. Bước 3 của dung-vendor.mjs đã chép sẵn 70
// package.json vào .vendor-build/, nên dấu hiệu này tự cập nhật.
export async function docGocGoi(goc) {
  const ra = new Set()
  const di = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.isDirectory()) await di(path.join(d, e.name))
      else if (e.name === 'package.json') {
        ra.add(path.relative(goc, d).split(path.sep).join('/'))
      }
    }
  }
  await di(goc)
  return ra
}

// Duyệt từ tổ tiên GẦN NHẤT ra ngoài, nên gói lồng trong gói cho ra cái gần nhất.
export function goiCuaDuongDan(rel, gocGoi) {
  const doan = rel.split('/')
  for (let i = doan.length - 1; i > 0; i--) {
    const u = doan.slice(0, i).join('/')
    if (gocGoi.has(u)) return u
  }
  return null
}

// Dùng LẠI dietJs của duyet-cay-js.mjs — đúng bộ duyệt mà dich-chuoi-vendor.mjs dùng để GHI bản
// dịch vào cây này. Hai bên hỏi cùng một câu về cùng một cây thì phải duyệt cùng một cách; để
// chúng lệch nhau là mời một lớp lỗi mà không cổng nào bắt.
export async function timTrongCayVendor(goc, canTim) {
  if (!existsSync(goc)) {
    throw new Error(
      `tim-ban-dich-vendor: không thấy cây ${goc} để đối chiếu. Dựng lại bằng ` +
        '`npm run dung:vendor`.',
    )
  }

  const can = [...canTim].filter((s) => typeof s === 'string' && s !== '')
  const ra = new Map()
  if (can.length === 0) return ra

  const gocGoi = await docGocGoi(goc)
  for await (const f of dietJs(goc)) {
    const noiDung = await readFile(f, 'utf8')
    const rel = path.relative(goc, f).split(path.sep).join('/')
    for (const s of can) {
      if (!noiDung.includes(s)) continue
      if (!ra.has(s)) ra.set(s, [])
      ra.get(s).push({ file: rel, goi: goiCuaDuongDan(rel, gocGoi) })
    }
  }
  return ra
}

// Soạn thông báo cho luật C. THUẦN: không in, không exit, không chạm đĩa — để kiểm được bằng
// đoạn mã nhỏ thay vì phải dựng một dist/ thật.
//
// Ba nhánh, và ranh giới giữa chúng là ranh giới giữa ĐIỀU ĐO ĐƯỢC và ĐIỀU CHỈ LÀ CHỈ DẪN:
//   - thấy trong cây  → "bước dịch đã chạy, gói không vào được bản build" là SUY RA TRỰC TIẾP từ
//                        hai phép đo vừa làm; còn "thường vì chưa bật trong extensions.ts" thì
//                        KHÔNG đo, nên phải viết như một chỉ dẫn chứ không phải một khẳng định.
//   - không thấy      → hai nguyên nhân cũ, với ca này chúng đúng.
//   - chẩn đoán hỏng  → KHÔNG khẳng định gì. Đây là chỗ dễ tự thua nhất: nói "KHÔNG thấy" khi
//                        phép quét chưa chạy được là lặp lại đúng lỗi mà cả chặng này sinh ra để
//                        sửa, chỉ khác chỗ đứng.
export function soanThongBaoThieu(thieu, daDich, loiChanDoan = null) {
  const ds = [...thieu]
  const dong = [
    `D12 ĐỎ — ${ds.length} bản dịch trong src/board/vi.json KHÔNG có mặt trong dist/. Nghĩa là ` +
      'thanh công cụ bảng vẽ đang nói tiếng Anh ở đúng chỗ đã chọn dịch.',
  ]

  if (loiChanDoan) {
    dong.push(`   (chẩn đoán bổ sung không chạy được: ${loiChanDoan})`)
  }

  for (const v of ds) {
    dong.push(`   "${v}"`)
    const noi = daDich?.get(v)

    if (loiChanDoan) {
      dong.push(
        '      chưa chẩn đoán được chuỗi này. Nguyên nhân thường gặp: bước dich-chuoi-vendor ' +
          'không chạy, hoặc thượng nguồn đã chuyển chuỗi ra ngoài danh sách vị trí cho phép, ' +
          'hoặc gói chứa nó chưa được bật trong src/board/extensions.ts.',
      )
      continue
    }

    if (noi?.length) {
      for (const n of noi.slice(0, TOI_DA_CHO)) {
        dong.push(`      đã dịch ở ${n.file}${n.goi ? `  (gói ${n.goi})` : ''}`)
      }
      if (noi.length > TOI_DA_CHO) {
        dong.push(`      ...và ${noi.length - TOI_DA_CHO} chỗ nữa`)
      }
      const goi = [...new Set(noi.map((n) => n.goi).filter(Boolean))]
      dong.push(
        '      → bước dịch ĐÃ chạy và ĐÃ thay đúng chỗ, nên chuỗi mất ở dist/ là do mã chứa nó ' +
          `bị tree-shake: ${goi.length ? `gói ${goi.join(', ')}` : 'gói chứa nó'} không vào được bản build.`,
      )
      dong.push(
        '        Thường vì gói đó chưa được bật trong src/board/extensions.ts — nghĩa là chuỗi ' +
          'này không tới tay người dùng, và dịch nó là công không.',
      )
      dong.push(
        '        Cách sửa: gỡ khoá khỏi src/board/vi.json, HOẶC bật tính năng đó trước rồi mới dịch.',
      )
    } else {
      dong.push(
        '      KHÔNG thấy bản dịch này ở đâu trong .vendor-build/ — hoặc bước dich-chuoi-vendor ' +
          'không chạy (kiểm scripts/dung-vendor.mjs), hoặc thượng nguồn đã chuyển chuỗi sang một ' +
          'vị trí cú pháp ngoài danh sách cho phép (xem scripts/luat-vi-tri-dich.mjs).',
      )
    }
  }

  return dong.join('\n')
}

export { TOI_DA_CHO }
