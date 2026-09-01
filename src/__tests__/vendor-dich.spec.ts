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
  FILE_CHO_PHEP_FILLTEXT,
  FILE_CHO_PHEP_KEY_MUC_MENU,
  FILE_CHO_PHEP_NAME_SENIOR_TOOL,
  thayChuCustomFrameMenu,
  thayChuTrongTagTooltip,
  thayPlaceholderBangMau,
  thayTenNhomSlashMenu,
  thayNutDongMenuMobile,
  thayTienToSlideFrameDenseMenu,
  thayTrenToanCay,
  THUOC_TINH_HIEN_THI,
  THUOC_TINH_HTML_HIEN_THI,
  THUOC_TINH_LIT_HIEN_THI,
  viTriHienThi,
} from '../../scripts/luat-vi-tri-dich.mjs'

const BAN_DO = { Style: 'Phong cách', LinkedPage: 'Trang liên kết', Escape: 'Thoát', None: 'Không' }

const dich = (js: string) => dichMotFile(js, BAN_DO, 'thu.js').js
const dichTagTooltip = (js: string) => thayChuTrongTagTooltip(js, BAN_DO, 'thu.js').js

// Ràng buộc toàn cục DUY NHẤT của chặng D12: đúng 5 tên thuộc tính, đúng 1 tên đối số, đúng 1 tên
// thuộc tính HTML được phép làm vị trí hiển thị. Không ca nào ở trên khẳng định KÍCH THƯỚC hay NỘI
// DUNG của ba danh sách này — chúng chỉ thử từng cái tên riêng lẻ có/không được dịch. Ba ca dưới
// đây tồn tại để một lượt SAU nới rộng danh sách (rất dễ xảy ra khi chặng kế tiếp phải với tới 323
// chuỗi) trở thành một lượt nới CÓ CHỮ KÝ — phải sửa test này mới xanh được — chứ không phải một
// lượt nới im lặng lọt qua mà không ai để ý.
describe('D12 — danh sách vị trí cho phép đúng kích thước và nội dung', () => {
  it('THUOC_TINH_HIEN_THI có đúng 6 tên, đúng thứ tự đo được (+ tip, mục 29)', () => {
    expect([...THUOC_TINH_HIEN_THI]).toEqual([
      'label',
      'tooltip',
      'description',
      'caption',
      'placeholder',
      'tip',
    ])
  })

  it('DOI_SO_HIEN_THI có đúng 1 tên: toast', () => {
    expect([...DOI_SO_HIEN_THI]).toEqual(['toast'])
  })

  it('THUOC_TINH_HTML_HIEN_THI có đúng 1 tên: data-tip', () => {
    expect(THUOC_TINH_HTML_HIEN_THI).toEqual(['data-tip'])
  })

  it('THUOC_TINH_LIT_HIEN_THI có đúng 2 tên: tooltip, label (mục 2026-09-01)', () => {
    expect(THUOC_TINH_LIT_HIEN_THI).toEqual(['tooltip', 'label'])
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

  // Đo 2026-08-25 (mục 33) — điều tra lỗi "More còn tiếng Anh": một số chỗ trong cây vendored viết
  // `.tooltip="${…}"` (CÓ nháy quanh nhịp) thay vì `.tooltip=${…}` — cú pháp Lit hợp lệ cả hai,
  // nhưng bản cũ của khopLit chỉ nhận biến thể KHÔNG nháy, bỏ lỡ 13 chuỗi literal thật.
  it('literal đứng một mình sau binding .tooltip="${…}" (CÓ nháy) trong template', () => {
    const ra = dich('html`<x .tooltip="${\'Style\'}"></x>`')
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

  // ĐÍNH CHÍNH 2026-08-25 (mục 33): ca này TỪNG khẳng định `.tooltip="${…}"` (có nháy) là "sai cú
  // pháp Lit thật, không phải mục đo được" — SAI. Đo lại xác nhận đây là cú pháp Lit HỢP LỆ (nháy
  // quanh nhịp property binding bị lit-html bỏ qua lúc parse) và có THẬT 21 lượt trong cây vendored
  // (13 literal đứng một mình, "More" và 12 chuỗi khác) — khớp `khopLit` đã nới ở luat-vi-tri-dich.mjs.
  // Ca kiểm ĐÚNG cho hình dạng này giờ nằm ở describe('D12 — vị trí ĐƯỢC dịch') phía trên.

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

// Chữ TRẦN nằm trực tiếp giữa <drt-tooltip>…</drt-tooltip>, KHÔNG qua nhịp ${…} nào cả —
// không có node AST nào đại diện cho nó (dichMotFile/thayTrenToanCay chỉ thấy StringLiteral/
// NoSubstitutionTemplateLiteral). Đo 2026-08-21: ĐÚNG MỘT chỗ trong toàn cây vendor khớp hình
// dạng này — widgets/edgeless-toolbar/src/edgeless-toolbar.ts:532 ("More Tools"). Quét văn bản
// thô trực tiếp thay vì AST vì compiled JS vẫn giữ nguyên cú pháp html`` (tsc không biến đổi
// tagged template literal). Neo bằng chính tên thẻ `drt-tooltip` — một web component cụ thể,
// không phải tên chung chung — nên an toàn hơn hẳn so khớp chuỗi con trần.
describe('thayChuTrongTagTooltip — chữ trần giữa cặp thẻ <drt-tooltip>', () => {
  it('chữ đứng một mình giữa thẻ mở/đóng, có khoá trong bản đồ', () => {
    const ra = dichTagTooltip('html`<drt-tooltip tip-position="top">Style</drt-tooltip>`')
    expect(ra).toContain('Phong cách')
  })

  it('giữ nguyên khoảng trắng/thụt lề quanh chữ', () => {
    const ra = dichTagTooltip(
      'html`<drt-tooltip tip-position="top">\n  Style\n</drt-tooltip>`',
    )
    expect(ra).toBe('html`<drt-tooltip tip-position="top">\n  Phong cách\n</drt-tooltip>`')
  })

  it('ghi đúng số dòng của chữ, không phải số dòng của thẻ mở', () => {
    const { cacLuot } = thayChuTrongTagTooltip(
      'const a = 1\nhtml`<drt-tooltip>\n  Style\n</drt-tooltip>`',
      BAN_DO,
      'thu.js',
    )
    expect(cacLuot).toEqual([{ chuoiGoc: 'Style', chuoiDich: 'Phong cách', dong: 3 }])
  })

  it('chữ không có trong bản đồ thì giữ nguyên', () => {
    const ra = dichTagTooltip('html`<drt-tooltip>Chưa từng dịch</drt-tooltip>`')
    expect(ra).toContain('Chưa từng dịch')
  })

  it('nội dung có xen ${…} (không phải chữ trần thuần) không được nhận', () => {
    const ra = dichTagTooltip('html`<drt-tooltip>${x} Style</drt-tooltip>`')
    expect(ra).toContain(`Style`)
    expect(ra).not.toContain('Phong cách')
  })

  it('thẻ có tiền tố tên giống nhưng KHÁC hẳn (vd drt-tooltip-content-with-shortcut) không được nhận', () => {
    const ra = dichTagTooltip(
      'html`<drt-tooltip-content-with-shortcut>Style</drt-tooltip-content-with-shortcut>`',
    )
    expect(ra).toContain('Style')
    expect(ra).not.toContain('Phong cách')
  })

  it('hai lượt thay trong cùng file không lệch vị trí nhau', () => {
    const ra = dichTagTooltip(
      'html`<drt-tooltip>Style</drt-tooltip> và <drt-tooltip>None</drt-tooltip>`',
    )
    expect(ra).toBe('html`<drt-tooltip>Phong cách</drt-tooltip> và <drt-tooltip>Không</drt-tooltip>`')
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() =>
      thayChuTrongTagTooltip(
        'html`<drt-tooltip>Style</drt-tooltip>`',
        { Style: 42 } as unknown as Record<string, string>,
        'thu.js',
      ),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })

  // Chèn thẳng vào phần TEXT của một template literal đang mở, KHÔNG qua JSON.stringify (khác
  // dichMotFile) — nên backtick/`$`/`\` trong bản dịch phải tự thoát, không thì phá cú pháp
  // template literal (kết thúc sớm, mở nhịp `${…}` ngoài ý muốn, hay biến ký tự sau `\` thành
  // escape lạ).
  it('bản dịch chứa backtick/`$`/`\\` được thoát đúng, không phá cú pháp template literal', () => {
    const banDoLa = { Style: 'Giá `100$`\\đô' }
    const { js: ra } = thayChuTrongTagTooltip(
      'html`<drt-tooltip>Style</drt-tooltip>`',
      banDoLa,
      'thu.js',
    )
    expect(ra).toBe('html`<drt-tooltip>Giá \\`100\\$\\`\\\\đô</drt-tooltip>`')
    // Chạy lại qua chính TypeScript để xác nhận kết quả là cú pháp HỢP LỆ, không chỉ "trông đúng".
    const sf = ts.createSourceFile('thu.js', ra, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    expect((sf as any).parseDiagnostics).toEqual([])
  })
})

// Ngoại lệ hẹp-theo-file cho đối số đầu của ctx.fillText(…) — đo 2026-08-25 (mục 33), fix "Frame"
// còn tiếng Anh ở overlay xem trước canvas (auto-complete-panel). KHÔNG thêm 'fillText' vào
// DOI_SO_HIEN_THI chung: hàm này gọi khắp cây vendored, phần lớn không phải chữ hiển thị.
describe('FILE_CHO_PHEP_FILLTEXT — ngoại lệ hẹp-theo-file cho ctx.fillText(…)', () => {
  const TEN_FILE_DUOC_PHEP = 'affine/widgets/edgeless-selected-rect/src/utils.js'

  it('đối số đầu của fillText được dịch trong file đã đo/duyệt', () => {
    expect(FILE_CHO_PHEP_FILLTEXT.has(TEN_FILE_DUOC_PHEP)).toBe(true)
    const ra = dichMotFile("ctx.fillText('Style', x, y)", BAN_DO, TEN_FILE_DUOC_PHEP).js
    expect(ra).toContain('Phong cách')
  })

  it('CÙNG lượt gọi fillText ở file KHÁC (không trong danh sách) thì KHÔNG dịch', () => {
    const ra = dichMotFile("ctx.fillText('Style', x, y)", BAN_DO, 'khong-o-danh-sach.js').js
    expect(ra).not.toContain('Phong cách')
    expect(ra).toContain('Style')
  })

  it('đối số đầu của một hàm KHÁC tên (không phải fillText) trong cùng file không được dịch', () => {
    const ra = dichMotFile("ctx.strokeText('Style', x, y)", BAN_DO, TEN_FILE_DUOC_PHEP).js
    expect(ra).not.toContain('Phong cách')
  })
})

// Nút đóng menu mobile ("Done" → "Xong", context-menu/menu-renderer.ts) — chữ TRẦN con trực tiếp
// của <div>, KHÔNG qua nhịp ${…} nào và KHÔNG nằm trong <drt-tooltip>, nên khác cơ chế cả
// dichMotFile lẫn thayChuTrongTagTooltip — phải neo bằng chính đoạn `@click="${this.onClose}"`.
describe('thayNutDongMenuMobile — chữ trần nút đóng menu mobile', () => {
  const TEN_FILE = 'affine/components/src/context-menu/menu-renderer.js'
  const dungBanDo = { Done: 'Xong' }

  it('dịch đúng khi đủ neo @click="${this.onClose}" và đúng file', () => {
    const ra = thayNutDongMenuMobile(
      '<div\n @click="${this.onClose}"\n style="color:red"\n>\n  Done\n</div>',
      dungBanDo,
      TEN_FILE,
    )
    expect(ra.js).toContain('Xong')
    expect(ra.js).not.toContain('Done')
    expect(ra.cacLuot).toEqual([{ chuoiGoc: 'Done', chuoiDich: 'Xong', dong: 5 }])
  })

  it('sai file (dù đủ neo) thì KHÔNG đụng gì', () => {
    const js = '<div\n @click="${this.onClose}"\n>\n  Done\n</div>'
    const ra = thayNutDongMenuMobile(js, dungBanDo, 'khong-o-danh-sach.js')
    expect(ra.js).toBe(js)
    expect(ra.cacLuot).toEqual([])
  })

  it('đúng file nhưng thiếu neo (this.onClose không phải @click) thì KHÔNG đụng gì', () => {
    const js = '<div\n @click="${this.onOther}"\n>\n  Done\n</div>'
    const ra = thayNutDongMenuMobile(js, dungBanDo, TEN_FILE)
    expect(ra.js).toBe(js)
    expect(ra.cacLuot).toEqual([])
  })

  it('bản đồ không có khoá "Done" thì KHÔNG đụng gì', () => {
    const js = '<div\n @click="${this.onClose}"\n>\n  Done\n</div>'
    const ra = thayNutDongMenuMobile(js, { Style: 'Phong cách' }, TEN_FILE)
    expect(ra.js).toBe(js)
    expect(ra.cacLuot).toEqual([])
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    const js = '<div\n @click="${this.onClose}"\n>\n  Done\n</div>'
    expect(() =>
      thayNutDongMenuMobile(js, { Done: 42 } as unknown as Record<string, string>, TEN_FILE),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
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

      // Chuẩn hoá dấu `/` — PHẢI khớp đúng định dạng `tenFile` mà dich-chuoi-vendor.mjs truyền vào
      // dichMotFile() (path.relative(...).split(path.sep).join('/')). Hai ngoại lệ hẹp-theo-file
      // của luat-vi-tri-dich.mjs (FILE_CHO_PHEP_NAME_DENSE_MENU/FILE_CHO_PHEP_KHOA_TINH_TOAN, mục
      // 29) so khớp CHÍNH XÁC chuỗi có `/` — trên Windows, path.relative() trả về `\`, nên thiếu
      // bước chuẩn hoá này sẽ khiến hai ngoại lệ đó không bao giờ khớp ở ĐÚNG cổng được sinh ra để
      // xác nhận độc lập rằng chúng an toàn — báo "vi phạm" oan cho chính các vị trí đã đo an toàn.
      const relFile = path.relative(BUILD, f).split(path.sep).join('/')

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
            if (viTriHienThi(n, relFile) === null) soPham.push(`${relFile}: "${chu}"`)
            else daThay.add(chu)
          }
        }
        ts.forEachChild(n, di)
      }
      di(sf)

      // Độc lập với thayChuTrongTagTooltip — KHÔNG gọi lại hàm đó, tự viết lại phép quét bằng
      // regex khác để không kế thừa chung một lỗ hổng nếu regex gốc sai. Vẫn đúng nguyên tắc của
      // cổng này: chữ trong <drt-tooltip>…</drt-tooltip> không phải StringLiteral/
      // NoSubstitutionTemplateLiteral nên vòng lặp AST ở trên KHÔNG BAO GIỜ thấy nó — thiếu đoạn
      // này thì mọi bản dịch đi qua đường đó sẽ bị báo "chưa từng thấy" oan, không phải vì nó sai
      // vị trí mà vì cổng KHÔNG BIẾT NHÌN vị trí đó.
      for (const mm of src.matchAll(/<drt-tooltip[^>]*>([^<]*)<\/drt-tooltip>/g)) {
        const chu = mm[1].trim()
        if (banDich.has(chu)) daThay.add(chu)
      }

      // Cùng nguyên tắc "tự viết lại, không gọi hàm thật" cho hình dạng thứ hai của chữ trần —
      // nút đóng menu mobile (mục 33, thayNutDongMenuMobile trong luat-vi-tri-dich.mjs). Regex ở
      // đây KHÔNG khớp theo tên file (khác bản gốc) — cổng độc lập chỉ hỏi "chữ này có nằm đúng
      // hình dạng neo `@click="${this.onClose}"` ở đâu đó trong toàn cây không", đủ để xác nhận
      // bản dịch thật sự sống, không cần tái tạo luật hẹp-theo-file (luật đó đã có cổng riêng của
      // scripts/kiem-quan-he-dich.mjs canh).
      for (const mm of src.matchAll(/@click="\$\{this\.onClose\}"[\s\S]*?>\s*([^<]*?)\s*<\/div>/g)) {
        const chu = mm[1].trim()
        if (banDich.has(chu)) daThay.add(chu)
      }

      // Cùng nguyên tắc cho tiền tố trần đầu template literal (thayTienToSlideFrameDenseMenu, mục
      // 34) — `` name: `Khổ ${config.name}` `` sau khi dịch: "Khổ" nằm trong TemplateHead, không
      // phải StringLiteral/NoSubstitutionTemplateLiteral nên vòng lặp AST ở trên không thấy được.
      for (const mm of src.matchAll(/name: `([^$`]*?)\$\{/g)) {
        const chu = mm[1].trim()
        if (banDich.has(chu)) daThay.add(chu)
      }

      // Cùng nguyên tắc cho TÊN NHÓM của menu lệnh "/" (thayTenNhomSlashMenu, 2026-08-31): sau khi
      // dịch, "Cơ bản" nằm GIỮA một literal lớn hơn (`'0_Cơ bản@0'`, hoặc TemplateHead
      // `` `0_Cơ bản@${i++}` ``) — vòng lặp AST ở trên chỉ so KHỚP TRỌN literal nên không bao giờ
      // thấy nó, và thiếu đoạn này thì 6 tên nhóm bị báo "chưa từng thấy" oan. Đo lúc thêm: đúng 5
      // tên nhóm hụt khỏi phép đếm (Cơ bản / Danh sách / Nội dung & phương tiện / Phần tử bảng vẽ /
      // Ngày / Thao tác — trong đó vài tên còn sống ở vị trí khác nên không phải cả 6 đều hụt).
      // Regex viết LẠI, không gọi hàm thật — giữ đúng tinh thần "cổng độc lập" của ca này.
      for (const mm of src.matchAll(/['"`]\d+_([^@`'"]+)@(?:\d|\$\{)/g)) {
        const chu = mm[1].trim()
        if (banDich.has(chu)) daThay.add(chu)
      }

      // Cùng nguyên tắc cho placeholder TĨNH của ô tìm panel Mẫu (thayPlaceholderBangMau, mục
      // 2026-09-01): `placeholder="…"` là thuộc tính HTML tĩnh, không qua nhịp `${…}`, nên vòng
      // lặp AST ở trên không bao giờ thấy nó — regex viết LẠI ở đây, không gọi hàm thật.
      for (const mm of src.matchAll(/placeholder="([^"]*)"/g)) {
        const chu = mm[1].trim()
        if (banDich.has(chu)) daThay.add(chu)
      }

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

// Ngoại lệ hẹp-theo-file cho `name` của SeniorTool (nút "<"/">" cuộn thanh công cụ) — đo 2026-08-25
// (mục 34), fix "Shape"/"Mind Map"/"Template"/"Pen"/"Note" còn tiếng Anh. An toàn theo ĐỊNH NGHĨA
// KIỂU (doc comment của interface SeniorTool: "Used to show in nav-button's tooltip"), khác hai
// ngoại lệ FILE_CHO_PHEP_NAME_DENSE_MENU (đo tiêu thụ ngược từng file).
describe('FILE_CHO_PHEP_NAME_SENIOR_TOOL — ngoại lệ hẹp-theo-file cho name của SeniorTool', () => {
  const MOT_FILE = 'affine/gfx/shape/src/toolbar/senior-tool.js'

  it('có đúng 5 file đã đo (Pen/Note/Shape/Template/Mind Map)', () => {
    expect([...FILE_CHO_PHEP_NAME_SENIOR_TOOL].sort()).toEqual(
      [
        'affine/gfx/brush/src/toolbar/senior-tool.js',
        'affine/gfx/mindmap/src/toolbar/senior-tool.js',
        'affine/gfx/note/src/toolbar/senior-tool.js',
        'affine/gfx/shape/src/toolbar/senior-tool.js',
        'affine/gfx/template/src/toolbar/senior-tool.js',
      ].sort(),
    )
  })

  it('name: được dịch trong file đã đo/duyệt', () => {
    const ra = dichMotFile(`const a = { name: 'Style' }`, BAN_DO, MOT_FILE).js
    expect(ra).toContain('Phong cách')
  })

  it('CÙNG literal name: ở file KHÁC (không trong danh sách) thì KHÔNG dịch', () => {
    const ra = dichMotFile(`const a = { name: 'Style' }`, BAN_DO, 'khong-o-danh-sach.js').js
    expect(ra).not.toContain('Phong cách')
  })
})

// Ngoại lệ hẹp-theo-file cho `key:` của mảng MenuItem<T> (renderMenu/renderMenuItems/
// renderCurrentMenuItemWith ở affine/widgets/edgeless-toolbar/src/config/utils.ts) — đo 2026-09-01,
// điều tra lỗi "mũi tên còn tiếng Anh" khi chọn connector đã vẽ và mở menu Kiểu đường nối trong
// editor-toolbar nổi. Khác nguyên tắc chung: `key` KHÔNG được thêm vào danh sách hiển thị chung vì
// nó còn là ĐỊNH DANH tra cứu ở nơi khác trong cây vendored ("Align left"/"Align right") — đây là
// ngoại lệ hẹp-theo-file, chỉ khớp khi CẢ tên file lẫn hình dạng cú pháp đều đúng.
describe('FILE_CHO_PHEP_KEY_MUC_MENU — ngoại lệ hẹp-theo-file cho key: của MenuItem<T>', () => {
  it('có đúng 3 file đã đo (connector/mindmap/text toolbar config)', () => {
    expect([...FILE_CHO_PHEP_KEY_MUC_MENU].sort()).toEqual(
      [
        'affine/gfx/connector/src/toolbar/config.js',
        'affine/gfx/mindmap/src/toolbar/config.js',
        'affine/gfx/text/src/toolbar/actions.js',
      ].sort(),
    )
  })

  it('key: được dịch trong file đã đo/duyệt', () => {
    const ra = dichMotFile(`const a = { key: 'Style', value: 1 }`, BAN_DO, 'affine/gfx/connector/src/toolbar/config.js').js
    expect(ra).toContain('"Phong cách"')
  })

  it('CÙNG literal key: ở file KHÁC (không trong danh sách) thì KHÔNG dịch', () => {
    const ra = dichMotFile(`const a = { key: 'Style', value: 1 }`, BAN_DO, 'khong-o-danh-sach.js').js
    expect(ra).not.toContain('Phong cách')
    expect(ra).toContain(`'Style'`)
  })
})

// Tiền tố "Slide " trần đầu template literal (frame-dense-menu.ts) — đo 2026-08-25 (mục 34), fix
// "Custom"/"Slide" còn tiếng Anh khi bấm nút "Khung". Cùng lớp lỗi chữ trần như
// thayNutDongMenuMobile nhưng khác VỊ TRÍ (đầu template, không phải giữa hai literal).
describe('thayTienToSlideFrameDenseMenu — tiền tố trần "Slide " đầu template literal', () => {
  const TEN_FILE = 'affine/blocks/frame/src/edgeless-toolbar/frame-dense-menu.js'
  const dungBanDo = { Slide: 'Khổ' }

  it('dịch đúng khi đủ hình dạng name: `Slide ${…}` và đúng file', () => {
    const ra = thayTienToSlideFrameDenseMenu(
      'menu.action({\n  name: `Slide ${config.name}`,\n})',
      dungBanDo,
      TEN_FILE,
    )
    expect(ra.js).toBe('menu.action({\n  name: `Khổ ${config.name}`,\n})')
    expect(ra.cacLuot).toEqual([{ chuoiGoc: 'Slide', chuoiDich: 'Khổ', dong: 2 }])
  })

  it('sai file thì KHÔNG đụng gì', () => {
    const js = 'name: `Slide ${config.name}`'
    const ra = thayTienToSlideFrameDenseMenu(js, dungBanDo, 'khong-o-danh-sach.js')
    expect(ra.js).toBe(js)
    expect(ra.cacLuot).toEqual([])
  })

  it('bản đồ không có khoá "Slide" thì KHÔNG đụng gì', () => {
    const js = 'name: `Slide ${config.name}`'
    const ra = thayTienToSlideFrameDenseMenu(js, { Style: 'Phong cách' }, TEN_FILE)
    expect(ra.js).toBe(js)
    expect(ra.cacLuot).toEqual([])
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    const js = 'name: `Slide ${config.name}`'
    expect(() =>
      thayTienToSlideFrameDenseMenu(js, { Slide: 42 } as unknown as Record<string, string>, TEN_FILE),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })
})

describe('nhánh biểu thức điều kiện làm GIÁ TRỊ của một thuộc tính hiển thị (mục "Text")', () => {
  // LỖI GỐC (người dùng báo 2026-08-31: "Ghi chú: bấm vào thấy chữ 'Text'"):
  // `affine/gfx/note/src/toolbar/note-menu-config.js` dựng tooltip của từng mục trong menu Ghi chú
  // bằng `tooltip: item.type !== 'text' ? item.tooltip.replace(…) : 'Text'`. Literal `'Text'` nằm ở
  // NHÁNH của một biểu thức điều kiện, còn biểu thức đó là GIÁ TRỊ của thuộc tính `tooltip:` —
  // `tooltip` đã có trong THUOC_TINH_HIEN_THI, nhưng luật cũ chỉ nhận nhánh điều kiện khi biểu thức
  // đứng trong một NHỊP TEMPLATE (`.tooltip=${a ? '' : 'Others'}`), nên hình dạng này lọt hoàn toàn.
  // Đo trên trình duyệt thật trước khi vá: 14/15 nút trong menu Ghi chú hiện tiếng Việt, riêng nút
  // đầu tiên hiện "Text".
  //
  // Nới luật theo NGUYÊN TẮC chứ không theo file: chỗ nào `tooltip:`/`label:`/… đã được duyệt là
  // chữ hiển thị thì một nhánh ternary gán vào đúng chỗ đó cũng là chữ hiển thị. Vẫn giữ giới hạn
  // MỘT CẤP như luật cũ (ternary lồng ternary không được nhận).
  it('nhánh whenFalse của ternary gán vào tooltip: được dịch', () => {
    const { js } = dichMotFile("const a = { tooltip: x !== 'text' ? y : 'Text' }", { Text: 'Chữ' })
    expect(js).toContain('"Chữ"')
  })

  it('nhánh whenTrue của ternary gán vào label: được dịch', () => {
    const { js } = dichMotFile("const a = { label: x ? 'Text' : y }", { Text: 'Chữ' })
    expect(js).toContain('"Chữ"')
  })

  it('nhánh ternary gán vào một thuộc tính KHÔNG hiển thị thì không được đụng', () => {
    const { js } = dichMotFile("const a = { key: x ? 'Text' : y }", { Text: 'Chữ' })
    expect(js).toBe("const a = { key: x ? 'Text' : y }")
  })

  it('ternary LỒNG một cấp nữa gán vào tooltip: vẫn không được nhận (giữ fail-closed)', () => {
    const nguon = "const a = { tooltip: x ? (y ? 'Text' : z) : w }"
    expect(dichMotFile(nguon, { Text: 'Chữ' }).js).toBe(nguon)
  })
})

describe('thayChuCustomFrameMenu — chữ trần "Custom" trong menu Khung', () => {
  // LỖI GỐC (người dùng báo 2026-08-31: "Khung: bấm vào thấy chữ 'Custom' trên PC"):
  // `affine/blocks/frame/src/edgeless-toolbar/frame-menu.js:78` viết
  // `<div class="frame-add-button custom">Custom</div>` — chữ TRẦN giữa hai thẻ trong một template
  // literal, cùng lớp lỗi với "More Tools"/"Done"/"Slide " đã vá trước đó: không có node AST nào
  // đại diện nên `dichMotFile` không bao giờ thấy.
  //
  // Chặng 2026-08-25 đã vá "Slide" ở frame-DENSE-menu (menu tràn khi thanh công cụ hẹp) và ghi
  // nhận "Custom" trong CÙNG file đó không có trong vi.json. Nhưng "Custom" mà người dùng THẤY nằm
  // ở file KHÁC — `frame-menu.js`, menu chính hiện khi bấm nút Khung — và chưa ai đụng tới.
  //
  // Neo bằng chính class `frame-add-button custom` chứ không phải tên thẻ `<div>` chung chung, cùng
  // nguyên tắc với `@click="${this.onClose}"` của thayNutDongMenuMobile. Đo 2026-08-31: ĐÚNG MỘT
  // lượt chữ "Custom" trong toàn file.
  const TEP = 'affine/blocks/frame/src/edgeless-toolbar/frame-menu.js'
  const NGUON = 'const t = html`<div class="frame-add-button custom">Custom</div>`'

  it('thay chữ trần trong file đã đo/duyệt', () => {
    const { js, cacLuot } = thayChuCustomFrameMenu(NGUON, { Custom: 'Tuỳ chỉnh' }, TEP)
    expect(js).toContain('>Tuỳ chỉnh<')
    expect(js).not.toContain('>Custom<')
    expect(cacLuot).toEqual([{ chuoiGoc: 'Custom', chuoiDich: 'Tuỳ chỉnh', dong: 1 }])
  })

  it('CÙNG hình dạng ở file KHÁC thì không đụng', () => {
    expect(thayChuCustomFrameMenu(NGUON, { Custom: 'Tuỳ chỉnh' }, 'affine/blocks/frame/src/khac.js').js).toBe(NGUON)
  })

  it('chữ "Custom" trong file nhưng KHÔNG ở đúng thẻ neo thì không đụng', () => {
    const khac = 'const t = html`<div class="frame-add-button">Custom</div>`'
    expect(thayChuCustomFrameMenu(khac, { Custom: 'Tuỳ chỉnh' }, TEP).js).toBe(khac)
  })

  it('không có khoá trong bản đồ thì giữ nguyên', () => {
    expect(thayChuCustomFrameMenu(NGUON, {}, TEP).js).toBe(NGUON)
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() => thayChuCustomFrameMenu(NGUON, { Custom: 42 } as unknown as Record<string, string>, TEP)).toThrow(/KHÔNG PHẢI CHUỖI/)
  })
})

// Placeholder tĩnh "Search file or anything..." của ô tìm panel Mẫu — nợ kỹ thuật đã ghi trong
// docs/superpowers/HANDOFF.md §1.1, đóng lại 2026-09-01. Khác mọi ca ở trên: `placeholder="…"` là
// thuộc tính HTML TĨNH (không qua nhịp `${…}`), nên đây là hình dạng "chữ trần" thứ tư của D12.
describe('thayPlaceholderBangMau — placeholder tĩnh của ô tìm panel Mẫu', () => {
  const TEP = 'affine/gfx/template/src/toolbar/template-panel.js'
  const NGUON =
    'const t = html`<input class="search-input" type="text" placeholder="Search file or anything..." @input=${x}>`'
  const dungBanDo = { 'Search file or anything...': 'Tìm tệp hoặc bất cứ thứ gì...' }

  it('thay đúng placeholder trong file đã đo/duyệt', () => {
    const { js, cacLuot } = thayPlaceholderBangMau(NGUON, dungBanDo, TEP)
    expect(js).toContain('placeholder="Tìm tệp hoặc bất cứ thứ gì..."')
    expect(js).not.toContain('Search file or anything')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Search file or anything...', chuoiDich: 'Tìm tệp hoặc bất cứ thứ gì...', dong: 1 },
    ])
  })

  it('CÙNG hình dạng ở file KHÁC thì không đụng', () => {
    expect(thayPlaceholderBangMau(NGUON, dungBanDo, 'affine/gfx/template/src/khac.js').js).toBe(NGUON)
  })

  it('placeholder trong file nhưng KHÔNG đứng sau class="search-input" thì không đụng', () => {
    const khac = 'const t = html`<input type="text" placeholder="Search file or anything...">`'
    expect(thayPlaceholderBangMau(khac, dungBanDo, TEP).js).toBe(khac)
  })

  it('không có khoá trong bản đồ thì giữ nguyên', () => {
    expect(thayPlaceholderBangMau(NGUON, {}, TEP).js).toBe(NGUON)
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() =>
      thayPlaceholderBangMau(
        NGUON,
        { 'Search file or anything...': 42 } as unknown as Record<string, string>,
        TEP,
      ),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })
})

// ─── Menu lệnh "/" (2026-08-31) ───────────────────────────────────────────────────────────────
//
// LỖI GỐC (người dùng báo: 'ở Chữ tự do → nhập "/" để ra mẫu: chưa dịch hết'): menu lệnh hiện
// `item.name` và đoạn GIỮA của `item.group` (`'0_Basic@0'` → tiêu đề nhóm "Basic"). Hai tên thuộc
// tính này bị D12 loại VĨNH VIỄN khỏi THUOC_TINH_HIEN_THI từ chặng P1-E, vì chúng bị tiêu thụ làm
// DỮ LIỆU chứ không chỉ hiển thị:
//   - `tooltips[name]`  — blocks/note/src/configs/slash-menu.js:92,132 (tra bảng tooltip theo tên)
//   - `['Code','Link'].includes(i.name)` — cùng file:74 (loại 2 mục khỏi nhóm Style)
//   - `parseGroup(group)` — widgets/slash-menu/src/utils.js (mổ '<số>_<Tên>@<số>' để xếp thứ tự)
// Vì thế chỉ `description` được dịch — đúng những gì đo trên màn: mô tả tiếng Việt, tên mục và
// tiêu đề nhóm tiếng Anh.
//
// PHÉP VÁ không phải "nới `name` ra toàn cây" (đo được 96 chỗ tiêu thụ ngược — mở là hỏng im lặng)
// mà là dịch `name` CÙNG LÚC với mọi vế bị ghép cặp với nó, và chỉ trong danh sách file ĐÓNG khai ở
// luat-vi-tri-dich.mjs. Bốn khối dưới canh đúng bốn mảnh đó.
describe('FILE_CHO_PHEP_NAME_SLASH_MENU — dịch name của mục menu lệnh', () => {
  const TEP = 'affine/rich-text/src/conversion.js'
  const BAN_DO = { 'Code Block': 'Khối mã', Text: 'Chữ' }

  it('name: trong file đã đo/duyệt được dịch', () => {
    const { js } = dichMotFile("const a = [{ name: 'Code Block', flavour: 'affine:code' }]", BAN_DO, TEP)
    expect(js).toContain('"Khối mã"')
    // Không được đụng flavour — đó là định danh lược đồ, không phải chữ hiển thị.
    expect(js).toContain("'affine:code'")
  })

  it('CÙNG hình dạng ở file NGOÀI danh sách thì KHÔNG dịch', () => {
    const nguon = "const a = [{ name: 'Code Block' }]"
    expect(dichMotFile(nguon, BAN_DO, 'affine/blocks/khac/src/config.js').js).toBe(nguon)
  })

  // surface-ref/configs/slash-menu.js NẰM TRONG danh sách (nó khai name: 'Frame'/'Mind Map'), nhưng
  // CÙNG file còn có `text: 'Mind Map'` và `text: 'Text'` — đó là NỘI DUNG của khối được tạo ra,
  // không phải nhãn. Đây chính là lý do phép vá phải theo VỊ TRÍ chứ không phải "thay mọi chỗ trong
  // file": thay mọi chỗ sẽ lặng lẽ đổi nội dung tài liệu người dùng tạo ra.
  it('text: trong CÙNG file đó KHÔNG được đụng — đó là nội dung khối, không phải nhãn', () => {
    const nguon = "const a = { name: 'Mind Map', text: 'Mind Map' }"
    const { js } = dichMotFile(nguon, { 'Mind Map': 'Sơ đồ tư duy' }, 'affine/blocks/surface-ref/src/configs/slash-menu.js')
    expect(js).toContain('name: "Sơ đồ tư duy"')
    expect(js).toContain("text: 'Mind Map'")
  })
})

describe('FILE_CHO_PHEP_KHOA_BANG_TOOLTIP — dịch KHOÁ bảng tooltips để tooltips[name] còn khớp', () => {
  const TEP = 'affine/blocks/note/src/configs/tooltips.js'

  // Bảng này là object DUY NHẤT có khoá trong cả file (mọi thứ khác là `const XTooltip = html\`…\``),
  // nên luật "dịch khoá object trong file này" không thể trượt sang chỗ khác.
  it('khoá CÓ nháy và khoá KHÔNG nháy đều được dịch', () => {
    const { js } = dichMotFile(
      "export const tooltips = { Text: { caption: 'x' }, 'Code Block': { caption: 'y' } }",
      { Text: 'Chữ', 'Code Block': 'Khối mã' },
      TEP,
    )
    expect(js).toContain('"Chữ":')
    expect(js).toContain('"Khối mã":')
  })

  it('file KHÁC thì khoá object không bị đụng', () => {
    const nguon = "const t = { Text: { caption: 'x' } }"
    expect(dichMotFile(nguon, { Text: 'Chữ' }, 'affine/blocks/note/src/configs/khac.js').js).toBe(nguon)
  })
})

describe('FILE_CHO_PHEP_LOC_INCLUDES — dịch vế lọc ["Code","Link"] cho khớp name đã dịch', () => {
  const TEP = 'affine/blocks/note/src/configs/slash-menu.js'

  it('phần tử mảng của .includes(...) được dịch trong file đã duyệt', () => {
    const { js } = dichMotFile("const a = x.filter(i => !['Code', 'Link'].includes(i.name))", { Code: 'Mã', Link: 'Liên kết' }, TEP)
    expect(js).toContain('"Mã"')
    expect(js).toContain('"Liên kết"')
  })

  it('mảng KHÔNG đứng trước .includes() thì không đụng', () => {
    const nguon = "const a = ['Code', 'Link']"
    expect(dichMotFile(nguon, { Code: 'Mã', Link: 'Liên kết' }, TEP).js).toBe(nguon)
  })
})

describe('thayTenNhomSlashMenu — dịch đoạn giữa của khoá nhóm "<số>_<Tên>@<số>"', () => {
  const TEP = 'affine/blocks/note/src/configs/slash-menu.js'
  const BAN_DO = { Basic: 'Cơ bản', List: 'Danh sách', 'Content & Media': 'Nội dung & phương tiện' }

  it('dịch trong TemplateHead — giữ nguyên số thứ tự hai đầu', () => {
    const { js, cacLuot } = thayTenNhomSlashMenu('const g = `0_Basic@${i++}`', BAN_DO, TEP)
    expect(js).toBe('const g = `0_Cơ bản@${i++}`')
    expect(cacLuot).toEqual([{ chuoiGoc: 'Basic', chuoiDich: 'Cơ bản', dong: 1 }])
  })

  it('dịch trong chuỗi thường', () => {
    const { js } = thayTenNhomSlashMenu("const g = '4_Content & Media@1'", BAN_DO, TEP)
    expect(js).toBe("const g = '4_Nội dung & phương tiện@1'")
  })

  it('hai nhóm khác nhau trong cùng file không lệch vị trí nhau', () => {
    const { js } = thayTenNhomSlashMenu("const a = '0_Basic@0'; const b = '1_List@2'", BAN_DO, TEP)
    expect(js).toBe("const a = '0_Cơ bản@0'; const b = '1_Danh sách@2'")
  })

  // Số thứ tự nhóm (vế TRƯỚC dấu _) mới là khoá xếp hạng chính trong itemCompareFn, nên đổi phần
  // TÊN không đảo thứ tự nhóm. Nhưng bắt nhầm một chuỗi KHÔNG phải khoá nhóm thì hỏng im lặng —
  // hình dạng phải khớp CHẶT: số, gạch dưới, tên, @, rồi số hoặc mở nhịp.
  it('chuỗi KHÔNG đúng hình dạng khoá nhóm thì không đụng', () => {
    for (const nguon of ["const a = 'Basic'", "const a = '_Basic@1'", "const a = '0_Basic'", "const a = 'x0_Basic@1'"]) {
      expect(thayTenNhomSlashMenu(nguon, BAN_DO, TEP).js).toBe(nguon)
    }
  })

  it('file NGOÀI danh sách thì không đụng', () => {
    const nguon = "const g = '0_Basic@0'"
    expect(thayTenNhomSlashMenu(nguon, BAN_DO, 'affine/blocks/khac/src/config.js').js).toBe(nguon)
  })

  it('tên nhóm không có trong bản đồ thì giữ nguyên', () => {
    const nguon = "const g = '9_Unknown@0'"
    expect(thayTenNhomSlashMenu(nguon, BAN_DO, TEP).js).toBe(nguon)
  })

  it('giá trị bản đồ không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() =>
      thayTenNhomSlashMenu("const g = '0_Basic@0'", { Basic: 42 } as unknown as Record<string, string>, TEP),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })
})
