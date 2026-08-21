// D12 — luật vị trí của phép thay chuỗi hiển thị.
//
// Vì sao phải kiểm theo VỊ TRÍ chứ không theo nội dung chuỗi: cơ chế cũ khớp trọn một literal ở
// bất cứ đâu, nên "LinkedPage" vừa là nhãn ở `name:` vừa là GIÁ TRỊ LƯỢC ĐỒ ở `type:` — dịch cả
// hai là hỏng phân giải liên kết, không lỗi, không cổng nào đỏ.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { dietJs } from '../../scripts/duyet-cay-js.mjs'
import {
  DOI_SO_HIEN_THI,
  dichMotFile,
  thayTrenToanCay,
  THUOC_TINH_HIEN_THI,
  THUOC_TINH_HTML_HIEN_THI,
  THUOC_TINH_LIT_HIEN_THI,
  viTriHienThi,
} from '../../scripts/luat-vi-tri-dich.mjs'

const BAN_DO = { Style: 'Phong cách', LinkedPage: 'Trang liên kết', Escape: 'Thoát', None: 'Không' }

const dich = (js: string) => dichMotFile(js, BAN_DO, 'thu.js').js

// Ràng buộc toàn cục DUY NHẤT của chặng D12: đúng 5 tên thuộc tính, đúng 1 tên đối số, đúng 1 tên
// thuộc tính HTML được phép làm vị trí hiển thị. Không ca nào ở trên khẳng định KÍCH THƯỚC hay NỘI
// DUNG của ba danh sách này — chúng chỉ thử từng cái tên riêng lẻ có/không được dịch. Ba ca dưới
// đây tồn tại để một lượt SAU nới rộng danh sách (rất dễ xảy ra khi chặng kế tiếp phải với tới 323
// chuỗi) trở thành một lượt nới CÓ CHỮ KÝ — phải sửa test này mới xanh được — chứ không phải một
// lượt nới im lặng lọt qua mà không ai để ý.
describe('D12 — danh sách vị trí cho phép đúng kích thước và nội dung', () => {
  it('THUOC_TINH_HIEN_THI có đúng 5 tên, đúng thứ tự đo được', () => {
    expect([...THUOC_TINH_HIEN_THI]).toEqual([
      'label',
      'tooltip',
      'description',
      'caption',
      'placeholder',
    ])
  })

  it('DOI_SO_HIEN_THI có đúng 1 tên: toast', () => {
    expect([...DOI_SO_HIEN_THI]).toEqual(['toast'])
  })

  it('THUOC_TINH_HTML_HIEN_THI có đúng 1 tên: data-tip', () => {
    expect(THUOC_TINH_HTML_HIEN_THI).toEqual(['data-tip'])
  })

  it('THUOC_TINH_LIT_HIEN_THI có đúng 1 tên: tooltip', () => {
    expect(THUOC_TINH_LIT_HIEN_THI).toEqual(['tooltip'])
  })
})

describe('D12 — vị trí ĐƯỢC dịch', () => {
  it('giá trị của thuộc tính label', () => {
    expect(dich(`const a = { label: 'Style' }`)).toContain('Phong cách')
  })

  it('giá trị của thuộc tính tooltip', () => {
    expect(dich(`const a = { tooltip: 'Style' }`)).toContain('Phong cách')
  })

  it('đối số của toast', () => {
    expect(dich(`toast(std, 'Style')`)).toContain('Phong cách')
  })

  it('literal đứng một mình sau data-tip= trong template', () => {
    const ra = dich('html`<x data-tip="${\'Style\'}"></x>`')
    expect(ra).toContain('Phong cách')
  })

  // Cú pháp binding THUỘC TÍNH của Lit (`.tooltip=${…}`) khác cú pháp thuộc tính HTML thường
  // (`data-tip="${…}"`) ở một điểm quan trọng: KHÔNG có nháy bao quanh nhịp. Đo 2026-08-21 trên
  // trình duyệt thật: bốn nút toolbar (Fit to screen/Zoom out/Zoom in/Toggle Zoom Tool Bar) hiện
  // tiếng Anh vì cơ chế cũ chỉ nhận dạng có nháy — luật THUOC_TINH_LIT_HIEN_THI này đóng đúng lỗ đó.
  it('literal đứng một mình sau binding .tooltip= (không nháy) trong template', () => {
    const ra = dich('html`<x .tooltip=${\'Style\'}></x>`')
    expect(ra).toContain('Phong cách')
  })

  // Đo được ở affine/gfx/mindmap/src/toolbar/mindmap-tool-button.ts:354 — chuỗi hiển thị là MỘT
  // NHÁNH của biểu thức điều kiện, không đứng trơ trọi một mình trong nhịp.
  it('literal là một nhánh của biểu thức điều kiện ngay sau .tooltip=', () => {
    const ra = dich('html`<x .tooltip=${popper ? \'\' : \'Style\'}></x>`')
    expect(ra).toContain('Phong cách')
  })

  it('literal là nhánh whenTrue của biểu thức điều kiện ngay sau .tooltip=', () => {
    const ra = dich('html`<x .tooltip=${popper ? \'Style\' : \'\'}></x>`')
    expect(ra).toContain('Phong cách')
  })
})

describe('D12 — vị trí KHÔNG được đụng', () => {
  // Mỗi ca dưới đây canh một lớp hỏng khác nhau. Bằng chứng đỏ: thêm tên vị trí tương ứng vào
  // danh sách cho phép trong scripts/luat-vi-tri-dich.mjs thì ca đó PHẢI đỏ.
  it('giá trị lược đồ ở type:', () => {
    expect(dich(`const a = { type: 'LinkedPage' }`)).toContain('LinkedPage')
  })

  it('giá trị của thuộc tính name (đã loại khỏi danh sách — P1-E)', () => {
    // name: chứa bốn mối nối nguy hiểm đo được ở spec P1-E §3.1: tooltips[name],
    // ['Code','Link'].includes(i.name), item.name !== 'Divider'. Dịch tại đây là đứt mối nối.
    expect(dich(`const a = { name: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính group (là khoá sắp xếp có cấu trúc, không phải nhãn)', () => {
    // Giá trị thật dạng '0_Basic@0', bị parseGroup mổ (widgets/slash-menu/src/utils.js).
    expect(dich(`const a = { group: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính title (đi vào file xuất ra Markdown/PDF)', () => {
    expect(dich(`const a = { title: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính text (là enum số Flag.Text, không phải chuỗi)', () => {
    expect(dich(`const a = { text: 'Style' }`)).toContain(`'Style'`)
  })

  it('định danh mục menu ở key:', () => {
    expect(dich(`const a = { key: 'Style' }`)).toContain(`'Style'`)
  })

  it('tra khoá obj[...]', () => {
    expect(dich(`const v = cau_hinh['None']`)).toContain(`'None'`)
  })

  it('so sánh ===', () => {
    expect(dich(`if (e.key === 'Escape') return`)).toContain(`'Escape'`)
  })

  it('nhánh case', () => {
    expect(dich(`switch (k) { case 'Escape': break }`)).toContain(`'Escape'`)
  })

  it('thông báo lỗi nội bộ new Error(...)', () => {
    expect(dich(`throw new Error('Style')`)).toContain(`'Style'`)
  })

  it('định danh tiêm phụ thuộc createIdentifier(...)', () => {
    expect(dich(`const I = createIdentifier('Style')`)).toContain(`'Style'`)
  })

  it('tên sự kiện đo đạc track(...)', () => {
    expect(dich(`track(std, 'Style')`)).toContain(`'Style'`)
  })

  it('literal là VẾ GHÉP trong template, không đứng một mình', () => {
    const ra = dich('html`<x data-tip="${\'Style\' + hau}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('literal sau thuộc tính KHÔNG hiển thị trong template', () => {
    const ra = dich('html`<x class="${\'Style\'}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  // Danh sách thuộc tính HTML có ĐÚNG một tên. Một phép so khớp không neo biên trái sẽ nhận cả
  // họ tên kết thúc bằng `data-tip`, tức luật rộng hơn danh sách — đúng loại lỗ mà fail-closed
  // sinh ra để chặn. Ca này canh biên trái đó.
  it('thuộc tính có tên KẾT THÚC bằng data-tip không được nhận', () => {
    const ra = dich('html`<x my-data-tip="${\'Style\'}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  // Neo biên trái phải là "đầu chuỗi hoặc khoảng trắng", KHÔNG chỉ là "bắt đầu bằng chữ cái".
  // Nếu lớp mở đầu hẹp hơn lớp nối, bộ quét bỏ qua tiền tố rồi khớp ngay tại chữ `d`. Ba dạng
  // `.x=`, `?x=`, `@x=` là cú pháp binding CÓ THẬT của Lit — property, boolean, event.
  it.each(['_data-tip', '-data-tip', '.data-tip', '?data-tip', '@data-tip'])(
    'tiền tố không phải chữ cái cũng không được nhận: %s',
    (ten) => {
      const ra = dich('html`<x ' + ten + '="${\'Style\'}"></x>`')
      expect(ra).toContain(`'Style'`)
    },
  )

  it('literal là VẾ GHÉP sau binding .tooltip=, không đứng một mình', () => {
    const ra = dich('html`<x .tooltip=${\'Style\' + hau}></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('binding .tooltip= có NHÁY bao quanh (sai cú pháp Lit thật, không phải mục đo được)', () => {
    const ra = dich('html`<x .tooltip="${\'Style\'}"></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('binding thuộc tính khác .tooltip= (vd .class=) không được nhận', () => {
    const ra = dich('html`<x .class=${\'Style\'}></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it.each(['?tooltip', '@tooltip', 'tooltip'])(
    'tiền tố khác dấu chấm (hoặc không có tiền tố) trước tooltip= không được nhận: %s',
    (ten) => {
      const ra = dich('html`<x ' + ten + '=${\'Style\'}></x>`')
      expect(ra).toContain(`'Style'`)
    },
  )

  it('nhánh của biểu thức điều kiện sau một thuộc tính KHÔNG hiển thị (.class=) không được nhận', () => {
    const ra = dich('html`<x .class=${popper ? \'\' : \'Style\'}></x>`')
    expect(ra).toContain(`'Style'`)
  })

  it('nhánh của biểu thức điều kiện LỒNG một cấp nữa (ternary trong ternary) không được nhận', () => {
    const ra = dich('html`<x .tooltip=${a ? (b ? \'\' : \'Style\') : \'\'}></x>`')
    expect(ra).toContain(`'Style'`)
  })
})

describe('D12 — nhiều lượt thay trong cùng một file', () => {
  // Phép thay chạy TỪ CUỐI VỀ ĐẦU để các vị trí chưa xử lý không bị lệch. Không có ca nào nhiều
  // hơn một lượt thì bất biến đó KHÔNG được canh: đảo `sort` thành tăng dần vẫn xanh hết, trong
  // khi output thật hỏng — bản dịch dài hơn bản gốc ("Style" 5 ký tự → "Phong cách" 10) nên mọi
  // vị trí phía sau lệch và phép cắt chuỗi ăn vào mã nguồn. Khẳng định bằng `toBe` trên TOÀN BỘ
  // chuỗi, không phải `toContain`.
  it('ba lượt thay trong một dòng không làm lệch vị trí nhau', () => {
    expect(dich(`const a = { label: 'Style', name: 'LinkedPage', tooltip: 'None' }`)).toBe(
      `const a = { label: "Phong cách", name: 'LinkedPage', tooltip: "Không" }`,
    )
  })

  it('lượt thay ở dòng sau vẫn ghi đúng số dòng', () => {
    const { cacLuot } = dichMotFile(
      `const a = { label: 'Style' }\nconst b = { tooltip: 'None' }`,
      BAN_DO,
      'thu.js',
    )
    expect(cacLuot.map((l) => [l.chuoiGoc, l.dong])).toEqual([
      ['Style', 1],
      ['None', 2],
    ])
  })
})

describe('D12 — chỉ chuỗi CÓ TRONG bản đồ mới được đụng', () => {
  // Phép tra `banDo[n.text]` đi qua chuỗi prototype: `banDo['constructor']` khác `undefined` dù
  // `vi.json` không có khoá đó. Bản "dịch" khi ấy là một HÀM, `JSON.stringify` cho `undefined`,
  // nên mã vendored bị chèn token `undefined` TRẦN — JS vẫn hợp lệ nên không cổng nào bắt được.
  // Khẳng định bằng `toBe` trên toàn bộ chuỗi: `toContain` sẽ vẫn xanh với output hỏng.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'])(
    'tên thuộc Object.prototype không phải là khoá dịch: %s',
    (ten) => {
      expect(dich(`const a = { label: '${ten}' }`)).toBe(`const a = { label: '${ten}' }`)
    },
  )
})

describe('D12 — ca xương sống: cùng chuỗi, hai vị trí, cùng file', () => {
  // Tái hiện chính xác thứ suýt làm hỏng dữ liệu. Đây là ca quan trọng nhất của bộ này.
  it('label: được dịch, type: còn nguyên văn', () => {
    const ra = dich(`
      const muc = { label: 'LinkedPage', icon: I() }
      const du_lieu = { reference: { type: 'LinkedPage', pageId: p } }
    `)
    expect(ra).toContain(`label: "Trang liên kết"`)
    expect(ra).toContain(`type: 'LinkedPage'`)
  })
})

describe('D12 — giá trị bản dịch phải là chuỗi', () => {
  // `Object.hasOwn` chỉ trả lời "khoá có thật không". Giá trị không phải chuỗi vẫn đi thẳng qua
  // `JSON.stringify` và chèn token trần vào mã vendored — `label: 42`, `label: ["…"]`, và tệ nhất
  // là `label: undefined`. Bốn dạng đầu đều là JSON HỢP LỆ nên tới được từ chính `vi.json` mà
  // không cần lỗi lập trình nào. Ném lỗi là cổng duy nhất còn lại; không cổng nào phía sau bắt được.
  //
  // Ép kiểu ở đây là có chủ đích: `.d.mts` khai `Record<string, string>`, nhưng đầu vào THẬT lúc
  // chạy đến từ `JSON.parse` nên `tsc` không chắn được gì. Ca kiểm phải mô phỏng đúng đầu vào thật.
  it.each<[string, unknown]>([
    ['số', 42],
    ['null', null],
    ['mảng', ['Phong cách']],
    ['object', { vi: 'Phong cách' }],
    ['boolean', true],
    ['undefined', undefined],
  ])('%s trong bản đồ thì DỪNG, không chèn token trần', (_ten, giaTri) => {
    expect(() =>
      dichMotFile(
        `const a = { label: 'Style' }`,
        { Style: giaTri } as unknown as Record<string, string>,
        'thu.js',
      ),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })
})

describe('D12 — báo cáo lượt thay', () => {
  it('ghi đúng vị trí và số dòng', () => {
    const { cacLuot } = dichMotFile(`const a = { label: 'Style' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Style', chuoiDich: 'Phong cách', viTri: 'thuộc-tính:label', dong: 1 },
    ])
  })

  it('không thay gì thì báo cáo rỗng', () => {
    const { cacLuot } = dichMotFile(`const a = { type: 'LinkedPage' }`, BAN_DO, 'thu.js')
    expect(cacLuot).toEqual([])
  })
})

const BUILD = '.vendor-build'

describe('D12 — cổng độc lập trên đầu ra thật', () => {
  // Cổng này TÍNH LẠI TỪ ĐẦU trên .vendor-build/ và cố tình KHÔNG đọc bao-cao-dich.json: nếu bộ
  // thay có lỗi thì báo cáo cũng sai theo, hai thứ cùng sai một kiểu thì không cổng nào bắt được.
  // Chỉ phép tính lại độc lập mới có giá trị.
  it('mọi chuỗi tiếng Việt trong .vendor-build đều nằm ở vị trí cho phép', async () => {
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    const banDich = new Set(Object.values(banDo))
    const soPham: string[] = []
    // Gom những bản dịch THẬT SỰ bắt gặp ở vị trí cho phép — xem khẳng định "còn sống" ở cuối ca.
    const daThay = new Set<string>()

    for await (const f of dietJs(BUILD)) {
      const src = readFileSync(f, 'utf8')
      let coKhong = false
      for (const v of banDich) {
        if (src.includes(v)) {
          coKhong = true
          break
        }
      }
      if (!coKhong) continue

      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
      const di = (n: ts.Node) => {
        // Nhận CẢ `NoSubstitutionTemplateLiteral`, đúng như bộ thay ở luat-vi-tri-dich.mjs. Chỉ
        // nhìn `StringLiteral` là cổng soi hẹp hơn chính thứ nó đang soi — hôm nay đo được 0 ca,
        // nhưng một cổng hẹp hơn đối tượng của nó là chỗ để lọt về sau.
        const laLiteral =
          ts.isStringLiteral(n) || n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
        if (laLiteral) {
          const chu = (n as ts.StringLiteralLike).text
          if (banDich.has(chu)) {
            if (viTriHienThi(n) === null) soPham.push(`${path.relative(BUILD, f)}: "${chu}"`)
            else daThay.add(chu)
          }
        }
        ts.forEachChild(n, di)
      }
      di(sf)
      if (soPham.length > 5) return expect(soPham).toEqual([])
    }

    expect(soPham).toEqual([])

    // Mặt khẳng định phải tự kiểm nó CÓ GÌ để khẳng định hay không. Thiếu dòng này thì `vi.json`
    // rỗng làm cả hai vế của phép so bên dưới thành `[]` và ca xanh trong khi không parse một file
    // nào — tức cổng độc lập kế thừa đúng điểm mù mà `dich-chuoi-vendor.mjs` tự ghi là "ca duy
    // nhất mà Cổng 3 hoàn toàn mù, không cổng nào khác chặn được". Cổng này sinh ra để KHÔNG kế
    // thừa điểm mù của bộ thay, nên nó phải tự chặn.
    expect(banDich.size).toBeGreaterThan(0)

    // Khẳng định "CÒN SỐNG", không chỉ khẳng định "không vi phạm". Thiếu nó thì ca này xanh cả khi
    // không soi được literal nào — và có đường đi thật: sửa một GIÁ TRỊ tiếng Việt trong vi.json mà
    // quên dựng lại `.vendor-build/` thì tiền lọc loại sạch cả 2.550 file và ca xanh rỗng tuếch.
    // Ca "bất biến" bên dưới cũng không đỡ được, vì `dichMotFile` khớp theo KHOÁ chứ không theo giá
    // trị, nên khoá không đổi thì nó cũng không thấy gì.
    //
    // Đây đúng là phần mà bộ thay đang TỰ KHAI — nó in "5 khoá đều còn sống" rồi thoát 0. Cổng này
    // sinh ra để không tin lời tự khai đó, nên nó phải tự đếm lại.
    expect([...daThay].sort()).toEqual([...banDich].sort())
  }, 120_000)

  it('bộ thay là bất biến — chạy lại trên cây ĐÃ dịch không đổi gì nữa', async () => {
    // Nếu một bản dịch tiếng Việt lại trùng một khoá tiếng Anh khác, lượt chạy thứ hai sẽ dịch
    // tiếp và bản build khác nhau tuỳ số lần chạy. Bước 0 của dung-vendor.mjs xoá sạch nên chuyện
    // này không xảy ra trong pipeline, nhưng ca này khoá lại tính chất đó cho các lượt sửa sau.
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    let soFileDoi = 0
    for await (const f of dietJs(BUILD)) {
      const src = readFileSync(f, 'utf8')
      if (dichMotFile(src, banDo, f).cacLuot.length > 0) soFileDoi++
    }
    expect(soFileDoi).toBe(0)
  }, 120_000)
})

describe('thayTrenToanCay — thay MỌI vị trí, dùng cho khoá tiền tố', () => {
  const TIEN_TO = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }

  it('thay literal ở vị trí đối số .replace() — vị trí KHÔNG nằm trong danh sách hiển thị', () => {
    const ra = thayTrenToanCay(
      `item.tooltip.replace('Drag/Click to insert ', '')`,
      TIEN_TO,
      'thu.js',
    ).js
    expect(ra).toContain('Kéo/Bấm để chèn ')
    expect(ra).not.toContain('Drag/Click to insert')
  })

  it('không đụng khoá không khớp', () => {
    const ra = thayTrenToanCay(`const a = 'Style'`, TIEN_TO, 'thu.js').js
    expect(ra).toBe(`const a = 'Style'`)
  })

  it('giá trị không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() =>
      thayTrenToanCay(
        `const a = 'Drag/Click to insert '`,
        { 'Drag/Click to insert ': 42 } as unknown as Record<string, string>,
        'thu.js',
      ),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })

  it('báo cáo lượt thay đúng chuoiGoc/chuoiDich', () => {
    const { cacLuot } = thayTrenToanCay(`const a = 'Drag/Click to insert '`, TIEN_TO, 'thu.js')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Drag/Click to insert ', chuoiDich: 'Kéo/Bấm để chèn ' },
    ])
  })
})
