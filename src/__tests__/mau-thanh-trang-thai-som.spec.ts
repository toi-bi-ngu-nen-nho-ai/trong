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

/** Ba thẻ theme-color tĩnh, dựng lại đúng như trình duyệt thấy lúc phân tích xong <head>. */
function dungHead(): void {
  document.head.innerHTML = [...HTML.matchAll(/<meta name="theme-color"[^>]*>/g)].map((m) => m[0]).join('\n')
  document.documentElement.removeAttribute('data-theme')
}

function mauCacThe(): string[] {
  return [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content') ?? '')
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
      '#14162c',
      '#14162c',
      '#14162c',
    ])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
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
    expect(mauCacThe()).toEqual(['#14162c', '#14162c', '#14162c'])
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
