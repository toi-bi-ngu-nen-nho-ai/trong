// Nửa "logic" của việc bơm mẫu mũi tên vào nút "Mẫu" trên thanh công cụ edgeless. Nửa "dữ liệu"
// (185 tệp .svg trong public/ + mảng kích thước) do scripts/dung-mau-handy.mjs sinh — xem đó.
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

import { MAU_MUI_TEN, type KichThuocMau } from './mau-handy.sinh'

const DANH_MUC = 'Mũi tên'
const GOC_URL = '/static/templates/arrows'

function taoMau({ id, w, h }: KichThuocMau): Template {
  const url = `${GOC_URL}/${id}.svg`
  // Không được bắt đầu bằng "/": ImageBlockTransformer.fromSnapshot bỏ qua writeToBlob khi sourceId
  // trông như đường dẫn tuyệt đối. `replaceIdMiddleware` sẽ thay id các khối lúc chèn nên trùng
  // sourceId giữa nhiều sticker cùng loại không thành vấn đề.
  const sourceId = `handy-arrow-${id}`

  return {
    name: `Mũi tên ${id}`,
    type: 'sticker',
    preview: url,
    assets: { [sourceId]: url },
    content: {
      type: 'page',
      meta: { id: `handy-arrow-${id}`, title: '', createDate: 0, tags: [] },
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
                  xywh: `[0,0,${w},${h}]`,
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

const DS_MAU: readonly Template[] = MAU_MUI_TEN.map(taoMau)

export class HandyTemplateManager implements TemplateManager {
  categories(): string[] {
    return [DANH_MUC]
  }

  list(category: string): Template[] {
    return category === DANH_MUC ? [...DS_MAU] : []
  }

  search(keyword: string, category?: string): Template[] {
    if (category && category !== DANH_MUC) return []
    const k = keyword.trim().toLowerCase()
    if (!k) return [...DS_MAU]
    return DS_MAU.filter((m) => m.name?.toLowerCase().includes(k))
  }
}
