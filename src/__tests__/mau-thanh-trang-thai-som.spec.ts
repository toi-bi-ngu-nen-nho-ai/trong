// @vitest-environment happy-dom
//
// Màu thanh trạng thái (theme-color) phải ĐÚNG NGAY TỪ LẦN VẼ ĐẦU, không đợi bundle JS.
//
// LỖI ĐÃ SINH RA CA KIỂM NÀY (chủ dự án báo 2026-09-04, xếp "lỗi RẤT NẶNG"): ba thẻ theme-color
// tĩnh trong index.html chọn màu theo `prefers-color-scheme` — tức theo CÀI ĐẶT MÁY. Nhưng app còn
// cho chọn tay sáng/tối (localStorage "drtrong:theme") và lựa chọn đó chỉ được đọc trong bundle JS
// (applyTheme, src/lib/theme.ts). Ai chọn tay khác cài đặt máy thì suốt quãng từ lúc <head> phân
// tích xong tới lúc bundle chạy được, thanh trạng thái mang màu của MÁY còn trang mang màu ĐÃ CHỌN.
// Trang tải chậm/máy giật là quãng đó dài ra thành mấy giây và hai nửa màn hình lệch hẳn nhau.
//
// Bản vá là một script NỘI TUYẾN trong <head> (index.html). Ca kiểm này CHẠY THẬT script đó chứ
// không so chuỗi: so chuỗi chỉ chứng minh có ai đó dán một đoạn mã vào, không chứng minh nó phân
// giải đúng. Ba nhánh phải phủ vì chúng là ba đường đi khác nhau qua cùng một đoạn mã:
//   • chọn tay NGƯỢC với máy — chính là lỗi trên;
//   • chưa chọn tay ("auto") — phải đi theo máy, không được ghi đè bừa;
//   • localStorage ném (Safari riêng tư) — phải để nguyên ba thẻ tĩnh, không được vỡ cả trang.
//
// Ca kiểm cuối khoá BA BẢN SAO của cùng hai mã màu lại với nhau: script nội tuyến không import
// được gì (nó phải chạy trước mọi thứ), nên --c-surface trong index.css, SURFACE_FALLBACK trong
// lib/theme.ts và hai literal trong index.html là ba nguồn có thể trôi khỏi nhau — đúng loại lỗi
// đã xảy ra thật một lần với mã teal #00766e sót lại qua hai lần đổi bảng màu (xem lib/theme.ts).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const GOC = join(__dirname, '../..')
const HTML = readFileSync(join(GOC, 'index.html'), 'utf8')

/** Đúng khối <script> nội tuyến trong <head> (script duy nhất không có `src`). */
function scriptNoiTuyen(): string {
  const khop = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  expect(khop.length, 'index.html phải có ĐÚNG MỘT script nội tuyến (bản phân giải chủ đề sớm)').toBe(1)
  return khop[0][1]
}

/**
 * Các thẻ meta TĨNH mà script nội tuyến đụng tới, dựng lại đúng như trình duyệt thấy lúc phân tích
 * xong <head>: ba thẻ theme-color (Android/trình duyệt) + thẻ Apple (iOS standalone).
 */
function dungHead(): void {
  const the = [
    ...[...HTML.matchAll(/<meta name="theme-color"[^>]*>/g)].map((m) => m[0]),
    ...[...HTML.matchAll(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>/g)].map((m) => m[0]),
  ]
  document.head.innerHTML = the.join('\n')
  document.documentElement.removeAttribute('data-theme')
}

function mauCacThe(): string[] {
  return [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content') ?? '')
}

/** Giá trị thẻ Apple — thứ DUY NHẤT iOS đọc cho thanh trạng thái của app đã cài. */
function kieuThanhIos(): string | null {
  return document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content') ?? null
}

/** Chạy script nội tuyến với một localStorage/matchMedia giả — đúng chỗ nó chạy thật: trong <head>. */
function chay({ luu, mayToi }: { luu: string | null | (() => never); mayToi: boolean }): void {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      if (typeof luu === 'function') return luu()
      return luu
    },
  })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark') ? mayToi : false, media: q }))
  new Function(scriptNoiTuyen())()
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.head.innerHTML = ''
})

describe('màu thanh trạng thái phân giải sớm (index.html)', () => {
  it('chọn tay TỐI trong lúc máy để SÁNG: cả ba thẻ ra màu tối, <html> mang data-theme=dark', () => {
    dungHead()
    chay({ luu: 'dark', mayToi: false })

    expect(mauCacThe(), 'thẻ nào cũng phải ra màu tối — trình duyệt chỉ đọc MỘT thẻ, không biết trước thẻ nào').toEqual([
      '#252525',
      '#252525',
      '#252525',
    ])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  // ─── iOS: app đã cài ra màn hình chính ─────────────────────────────────────────────────────
  // LỖI ĐÃ SINH RA NHÓM CA KIỂM NÀY (chủ dự án báo 2026-09-10, kèm ảnh chụp iPhone): dải trên cùng
  // TRẮNG trong khi cả app đang ở bản tối — luôn trắng, cả chế độ sáng lẫn tối, chỉ khi mở từ màn
  // hình chính. Nguyên nhân: thẻ `apple-mobile-web-app-status-bar-style` bị gỡ hẳn hồi 2026-08, mà
  // iOS standalone KHÔNG đọc theme-color cho dải này — thiếu thẻ thì nó dùng mặc định `default`
  // (nền trắng chữ đen), và `default` không có biến thể tối.
  //
  // Ba ca dưới đây phải ĐỎ nếu ai đó gỡ lại thẻ hoặc bỏ phép ghi trong script nội tuyến.
  it('iOS: bản TỐI ⇒ "black" (thiếu phép ghi này là dải trên trắng vĩnh viễn)', () => {
    dungHead()
    chay({ luu: 'dark', mayToi: false })
    expect(kieuThanhIos()).toBe('black')
  })

  it('iOS: bản SÁNG ⇒ "default" (nền trắng, khớp --c-surface sáng)', () => {
    dungHead()
    chay({ luu: 'light', mayToi: true })
    expect(kieuThanhIos()).toBe('default')
  })

  // ĐÃ THỬ VÀ BỎ (2026-09-10): 'black-translucent' cho nội dung tràn lên dưới thanh trạng thái —
  // phần TRÊN chạy đẹp thật — nhưng nó bật safe-area-inset ở CẢ HAI ĐẦU, sinh một dải hở dưới thanh
  // nav ở đáy. Hai lượt chữa đều hỏng (cộng --safe-top vào body thì cắt mất nửa dưới thanh nav; bỏ
  // đi thì dải hở quay lại), và máy phát triển KHÔNG tái hiện được để đo.
  // Ca này khoá quyết định đó lại: ai đổi sang 'black-translucent' phải sửa ca kiểm này, tức phải
  // đọc lời giải thích và giải xong bài toán dải hở trước.
  it('iOS: KHÔNG dùng black-translucent ở bất kỳ chủ đề nào (chưa giải được dải hở ở đáy)', () => {
    for (const boi of [
      { luu: 'dark', mayToi: false },
      { luu: 'dark', mayToi: true },
      { luu: 'light', mayToi: false },
      { luu: null, mayToi: true },
    ] as const) {
      dungHead()
      chay(boi)
      expect(kieuThanhIos(), `bối cảnh ${JSON.stringify(boi)}`).not.toBe('black-translucent')
    }
  })

  it('index.html PHẢI còn thẻ Apple — gỡ nó đi là script nội tuyến không có gì để ghi', () => {
    expect(
      HTML,
      'thiếu <meta name="apple-mobile-web-app-status-bar-style"> ⇒ iOS rơi về "default" = dải trắng ở mọi chủ đề',
    ).toMatch(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>/)
  })

  it('chọn tay SÁNG trong lúc máy để TỐI: cả ba thẻ ra màu sáng', () => {
    dungHead()
    chay({ luu: 'light', mayToi: true })

    expect(mauCacThe()).toEqual(['#ffffff', '#ffffff', '#ffffff'])
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('chưa chọn tay: đi theo máy', () => {
    dungHead()
    chay({ luu: null, mayToi: true })
    expect(mauCacThe()).toEqual(['#252525', '#252525', '#252525'])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    dungHead()
    chay({ luu: null, mayToi: false })
    expect(mauCacThe()).toEqual(['#ffffff', '#ffffff', '#ffffff'])
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('localStorage ném (Safari riêng tư): để nguyên ba thẻ tĩnh, không ném ra ngoài', () => {
    dungHead()
    const truoc = mauCacThe()
    expect(() =>
      chay({
        luu: () => {
          throw new Error('SecurityError')
        },
        mayToi: false,
      }),
    ).not.toThrow()
    expect(mauCacThe(), 'ba thẻ tĩnh vẫn đúng cho người chưa chọn tay — đừng phá chúng').toEqual(truoc)
  })

  it('script nằm trong <head> và không bị hoãn', () => {
    // Cắt ở '</head>', KHÔNG ở '<body': chú thích ngay trên script có nhắc chữ "<body>" nên
    // indexOf('<body') dừng SỚM HƠN cả script và ca kiểm đỏ oan.
    const trongHead = HTML.slice(0, HTML.indexOf('</head>'))
    expect(trongHead.includes(scriptNoiTuyen()), 'script phải nằm trong <head>, nếu không nó chạy sau lần vẽ đầu').toBe(
      true,
    )
    const the = HTML.match(/<script(?![^>]*\bsrc=)[^>]*>/)?.[0] ?? ''
    for (const hoan of ['defer', 'async', 'type="module"']) {
      expect(the, `${hoan} hoãn script tới sau khi phân tích xong tài liệu — mất đúng thứ nó cần`).not.toContain(hoan)
    }
  })

  it('ba bản sao của --c-surface không trôi khỏi nhau', () => {
    const css = readFileSync(join(GOC, 'src/index.css'), 'utf8')
    const themeTs = readFileSync(join(GOC, 'src/lib/theme.ts'), 'utf8')

    // Nguồn thật: --c-surface bản sáng (:root) và bản tối (hai khối ghi đè khai cùng một giá trị).
    const mauCss = [...css.matchAll(/--c-surface:\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => m[1].toLowerCase())
    const sang = mauCss[0]
    const toi = [...new Set(mauCss.slice(1))]
    expect(toi, 'mọi khối ghi đè bản tối phải khai CÙNG một --c-surface').toHaveLength(1)

    const fb = themeTs.match(/SURFACE_FALLBACK = \{ light: "(#[0-9a-fA-F]{3,8})", dark: "(#[0-9a-fA-F]{3,8})" \}/)
    expect(fb, 'SURFACE_FALLBACK đổi hình dạng — sửa regex ở đây rồi kiểm lại giá trị').not.toBeNull()
    expect([fb![1].toLowerCase(), fb![2].toLowerCase()]).toEqual([sang, toi[0]])

    const js = scriptNoiTuyen().toLowerCase()
    expect(js, 'literal màu sáng trong script nội tuyến phải bằng --c-surface bản sáng').toContain(`'${sang}'`)
    expect(js, 'literal màu tối trong script nội tuyến phải bằng --c-surface bản tối').toContain(`'${toi[0]}'`)
  })
})
