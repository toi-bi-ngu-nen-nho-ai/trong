// Nửa "logic" của việc bơm mẫu NHÃN DÁN vào nút "Mẫu" trên thanh công cụ edgeless. Nửa "dữ liệu"
// nằm ở hai tệp sinh, mỗi tệp một script chạy tay:
//   - `mau-handy.sinh.ts`   ← scripts/dung-mau-handy.mjs   (185 mũi tên, public/static/templates/arrows)
//   - `mau-sticker.sinh.ts` ← scripts/dung-mau-sticker.mjs (42 nhãn dán, public/static/templates/stickers)
//
// Panel vendored (`EdgelessTemplatePanel`) gọi `builtInTemplates.categories()/list()/search()`;
// `builtInTemplates.extend(manager)` cộng thêm một `TemplateManager` vào kết quả. Đăng ký nằm ở
// EdgelessBoard.tsx (chỗ duy nhất có `EdgelessTemplatePanel`), giữ tệp này KHÔNG có import runtime
// nào từ cây vendored — nhờ đó bài kiểm mau-handy.spec.ts là unit test thật, không kéo cả panel Lit.
//
// Mỗi mẫu là "sticker": một `DocSnapshot` tối thiểu `affine:page > affine:surface > affine:image`.
// `assets[sourceId]` là URL công khai của tệp .svg; panel `fetch()` nó → blob → ghi vào kho blob
// của bảng khi người dùng thả. `type: 'sticker'` khiến `createStickerMiddleware` canh khối ảnh vào
// giữa khung nhìn thay vì đặt cạnh nội dung sẵn có.
import type { Template, TemplateManager } from '@blocksuite/affine-gfx-template'

import { MAU_MUI_TEN } from './mau-handy.sinh'
import { MAU_STICKER } from './mau-sticker.sinh'

const DANH_MUC_MUI_TEN = 'Mũi tên'
const GOC_URL_MUI_TEN = '/static/templates/arrows'

// Khung thả trên canvas, KHÔNG phải kích thước tự nhiên của SVG. viewBox của bộ mũi tên chỉ 62–87px
// nên dùng thẳng nó thì mẫu thả ra bé xíu — đo trên trình duyệt thật 2026-09-01: ở zoom 100% mũi tên
// ra ~73px, trong khi AFFiNE thả ra ~460px (`build-stickers.mjs` của thượng nguồn hardcode
// `xywh: '[0,0,460,430]'` cho MỌI nhãn dán). Ta không hardcode một khung cứng như vậy vì các bộ nhãn
// dán khác có tỷ lệ khác hẳn mũi tên và sẽ bị méo; thay vào đó phóng theo CẠNH DÀI, giữ tỷ lệ.
// `width`/`height` của khối ảnh vẫn là kích thước gốc — đó là kích thước tự nhiên của ảnh, không
// phải khung trên canvas.
export const CANH_DAI = 420

function khungTha(w: number, h: number): { w: number; h: number } {
  const k = CANH_DAI / Math.max(w, h)
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

type ThamSoMau = {
  /** Định danh trong nhóm — cũng là tên tệp .svg dưới `gocUrl`. */
  readonly id: string
  readonly ten: string
  readonly w: number
  readonly h: number
  readonly gocUrl: string
  /** Tiền tố `sourceId`, phải khác nhau giữa các nhóm để không đụng id. */
  readonly tienTo: string
}

function taoMau({ id, ten, w, h, gocUrl, tienTo }: ThamSoMau): Template {
  const khung = khungTha(w, h)
  const url = `${gocUrl}/${id}.svg`
  // Không được bắt đầu bằng "/": ImageBlockTransformer.fromSnapshot bỏ qua writeToBlob khi sourceId
  // trông như đường dẫn tuyệt đối. `replaceIdMiddleware` sẽ thay id các khối lúc chèn nên trùng
  // sourceId giữa nhiều sticker cùng loại không thành vấn đề.
  const sourceId = `${tienTo}-${id}`

  return {
    name: ten,
    type: 'sticker',
    preview: url,
    assets: { [sourceId]: url },
    content: {
      type: 'page',
      meta: { id: sourceId, title: '', createDate: 0, tags: [] },
      blocks: {
        type: 'block',
        id: 'handy-page',
        flavour: 'affine:page',
        props: {},
        children: [
          {
            type: 'block',
            id: 'handy-surface',
            flavour: 'affine:surface',
            props: { elements: {} },
            children: [
              {
                type: 'block',
                id: 'handy-image',
                flavour: 'affine:image',
                version: 1,
                props: {
                  caption: '',
                  sourceId,
                  width: w,
                  height: h,
                  index: 'a0',
                  xywh: `[0,0,${khung.w},${khung.h}]`,
                  lockedBySelf: false,
                  rotate: 0,
                  size: -1,
                },
                children: [],
              },
            ],
          },
        ],
      },
    },
  }
}

type Nhom = { readonly danhMuc: string; readonly mau: readonly Template[] }

// Thứ tự ở đây là thứ tự tab trong panel. "Mũi tên" đứng đầu — nó là bộ đông nhất và là thứ chủ dự
// án dùng thật; ba bộ nhãn dán trang trí đứng sau.
const NHOM: readonly Nhom[] = [
  {
    danhMuc: DANH_MUC_MUI_TEN,
    mau: MAU_MUI_TEN.map(({ id, w, h }) =>
      taoMau({ id, ten: `Mũi tên ${id}`, w, h, gocUrl: GOC_URL_MUI_TEN, tienTo: 'handy-arrow' }),
    ),
  },
  ...MAU_STICKER.map((n) => ({
    danhMuc: n.danhMuc,
    mau: n.mau.map(({ id, ten, w, h }) =>
      taoMau({
        id,
        ten,
        w,
        h,
        gocUrl: `/static/templates/stickers/${n.thuMuc}`,
        tienTo: `sticker-${n.thuMuc}`,
      }),
    ),
  })),
]

const TAT_CA: readonly Template[] = NHOM.flatMap((n) => n.mau)

export class HandyTemplateManager implements TemplateManager {
  categories(): string[] {
    return NHOM.map((n) => n.danhMuc)
  }

  list(category: string): Template[] {
    return [...(NHOM.find((n) => n.danhMuc === category)?.mau ?? [])]
  }

  search(keyword: string, category?: string): Template[] {
    const trong = category ? NHOM.find((n) => n.danhMuc === category)?.mau : TAT_CA
    if (!trong) return []
    const k = keyword.trim().toLowerCase()
    if (!k) return [...trong]
    return trong.filter((m) => m.name?.toLowerCase().includes(k))
  }
}
