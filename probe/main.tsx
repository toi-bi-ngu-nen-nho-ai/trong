// BẢN THỬ NHÚNG (nhánh probe-nhung-lit) — không thuộc mã sản phẩm.
//
// Câu hỏi cần trả lời bằng số, không bằng phỏng đoán:
//   1. Nhúng thẳng tầng khung nhìn Lit của AFFiNE vào một trang React có chạy được không?
//   2. Nó làm bundle nặng thêm bao nhiêu? (ngưỡng dự án tự đặt: +150 kB gzip)
//   3. Trên iPad/iPhone nó có mượt không?
//
// Nếu chạy được, đây chính là hình dạng của "chạm vào một board thì mở editor":
// màn danh sách là React của Bs Trọng, còn ruột board là editor thật của AFFiNE.

import '@blocksuite/affine/effects'

import { ViewExtensionManager, StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { getInternalViewExtensions } from '@blocksuite/affine/extensions/view'
import { BlockStdScope } from '@blocksuite/affine/std'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const viewManager = new ViewExtensionManager(getInternalViewExtensions())
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

function createBoardStore() {
  const workspace = new TestWorkspace({
    id: 'probe-workspace',
    idGenerator: createAutoIncrementIdGenerator(),
  })
  workspace.meta.initialize()

  const doc = workspace.createDoc('board')
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  const rootId = store.addBlock('affine:page', {})
  store.addBlock('affine:surface', {}, rootId)

  return store
}

/**
 * Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi
 * Lit tự render vào thẻ đó. React không biết gì về bên trong, và ngược lại — đó chính là
 * điều làm phép nhúng khả thi.
 */
function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    try {
      const store = createBoardStore()
      const std = new BlockStdScope({
        store,
        extensions: viewManager.get('edgeless'),
      })
      litRender(std.render(), el)
    } catch (e) {
      setLoi(e instanceof Error ? `${e.message}\n\n${e.stack ?? ''}` : String(e))
    }

    return () => {
      litRender(null, el)
    }
  }, [])

  if (loi) {
    return (
      <pre style={{ padding: 16, color: '#b00', whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {loi}
      </pre>
    )
  }

  return <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
}

function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid #e5e5e5',
          font: '13px system-ui',
          flex: '0 0 auto',
        }}
      >
        Vỏ React của Bs Trọng · bên dưới là editor edgeless thật của AFFiNE
      </div>
      <div style={{ position: 'relative', flex: '1 1 auto' }}>
        <EdgelessBoard />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
